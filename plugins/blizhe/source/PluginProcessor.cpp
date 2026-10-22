#include "PluginProcessor.h"
#include "PluginEditor.h"
BlizheProcessor::BlizheProcessor():AudioProcessor(BusesProperties().withInput("Vocal",juce::AudioChannelSet::stereo(),true).withOutput("Output",juce::AudioChannelSet::stereo(),true).withInput("Beat",juce::AudioChannelSet::stereo(),false)),state(*this,nullptr,"BLIZHE",parameters()){
    amountParam=state.getRawParameterValue("amount");mixParam=state.getRawParameterValue("mix");enabledParam=state.getRawParameterValue("enabled");inputGainParam=state.getRawParameterValue("inGain");outputGainParam=state.getRawParameterValue("outGain");
}
juce::AudioProcessorValueTreeState::ParameterLayout BlizheProcessor::parameters(){
    juce::AudioProcessorValueTreeState::ParameterLayout p;
    p.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"amount",1},juce::String::fromUTF8("Ближе"),juce::NormalisableRange<float>(-1,1,.001f),0.0f));
    p.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"mix",1},"Mix",juce::NormalisableRange<float>(0,1,.001f),1.0f));
    p.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{"enabled",1},"Enabled",true));
    p.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"inGain",1},"Input gain",juce::NormalisableRange<float>(-18,18,.1f),0.0f));
    p.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"outGain",1},"Output gain",juce::NormalisableRange<float>(-18,18,.1f),0.0f));
    return p;
}
bool BlizheProcessor::isBusesLayoutSupported(const BusesLayout& b) const {
    auto main=b.getMainInputChannelSet();if(main!=juce::AudioChannelSet::mono()&&main!=juce::AudioChannelSet::stereo())return false;
    if(main!=b.getMainOutputChannelSet())return false;
    if(b.inputBuses.size()>1){auto sc=b.getChannelSet(true,1);if(!sc.isDisabled()&&sc!=juce::AudioChannelSet::mono()&&sc!=juce::AudioChannelSet::stereo())return false;}return true;
}
void BlizheProcessor::prepareToPlay(double sr,int block){
    capacity=std::max(32,block);const auto ch=static_cast<size_t>(getMainBusNumInputChannels());
    oversampling=std::make_unique<juce::dsp::Oversampling<float>>(ch,1,juce::dsp::Oversampling<float>::filterHalfBandPolyphaseIIR,true,true);
    oversampling->initProcessing(static_cast<size_t>(capacity));oversampling->reset();
    latency=juce::roundToInt(oversampling->getLatencyInSamples());setLatencySamples(latency);
    dryWet.prepare({sr,static_cast<juce::uint32>(capacity),static_cast<juce::uint32>(ch)});dryWet.setMixingRule(juce::dsp::DryWetMixingRule::linear);dryWet.setWetLatency(static_cast<float>(latency));dryWet.reset();
    engine.setAmount(amountParam->load());engine.prepare(sr*2,static_cast<int>(ch));
    inputGainSmooth.reset(sr,.02);outputGainSmooth.reset(sr,.02);
    inputGainSmooth.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(inputGainParam->load()));
    outputGainSmooth.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(outputGainParam->load()));
}
void BlizheProcessor::releaseResources(){if(oversampling)oversampling->reset();engine.reset();}
void BlizheProcessor::processBlock(juce::AudioBuffer<float>& b,juce::MidiBuffer&){process(b,false);}
void BlizheProcessor::processBlockBypassed(juce::AudioBuffer<float>& b,juce::MidiBuffer&){process(b,true);}
void BlizheProcessor::process(juce::AudioBuffer<float>& buffer,bool bypassed){
    juce::ScopedNoDenormals noDenormals;if(!oversampling)return;
    auto vocal=getBusBuffer(buffer,true,0);auto output=getBusBuffer(buffer,false,0);
    const int n=buffer.getNumSamples(),channels=vocal.getNumChannels();if(n==0)return;
    const bool scOn=getBusCount(true)>1&&getBus(true,1)->isEnabled();
    juce::AudioBuffer<float> sc;if(scOn)sc=getBusBuffer(buffer,true,1);
    const float a=amountParam->load(),m=mixParam->load();const bool off=bypassed||enabledParam->load()<.5f;
    inputGainSmooth.setTargetValue(off?1.0f:juce::Decibels::decibelsToGain(inputGainParam->load()));
    outputGainSmooth.setTargetValue(off?1.0f:juce::Decibels::decibelsToGain(outputGainParam->load()));
    engine.setAmount(off?0:a);
    dryWet.setWetMixProportion(off||a==0?0:m);
    float inPeak=0,outPeak=0;
    for(int offset=0;offset<n;offset+=capacity){
        const int count=std::min(capacity,n-offset);
        for(int i=0;i<count;++i){
            const float gain=inputGainSmooth.getNextValue();
            for(int ch=0;ch<channels;++ch)
                vocal.getWritePointer(ch,offset)[i]*=gain;
        }
        juce::dsp::AudioBlock<float> whole(vocal);auto block=whole.getSubBlock(static_cast<size_t>(offset),static_cast<size_t>(count));
        for(int ch=0;ch<channels;++ch)inPeak=std::max(inPeak,vocal.getMagnitude(ch,offset,count));
        dryWet.pushDrySamples(block);auto up=oversampling->processSamplesUp(block);
        for(size_t i=0;i<up.getNumSamples();++i){float l=up.getSample(0,i),r=channels==2?up.getSample(1,i):l,side=0;
            if(scOn){const int ix=offset+static_cast<int>(i/2);for(int ch=0;ch<sc.getNumChannels();++ch)side=std::max(side,std::abs(sc.getSample(ch,ix)));}
            engine.process(l,r,side,scOn);up.setSample(0,i,l);if(channels==2)up.setSample(1,i,r);
        }
        oversampling->processSamplesDown(block);dryWet.mixWetSamples(block);
        for(int ch=0;ch<channels;++ch)
            if(output.getWritePointer(ch)!=vocal.getWritePointer(ch))output.copyFrom(ch,offset,vocal,ch,offset,count);
        for(int i=0;i<count;++i){
            const float gain=outputGainSmooth.getNextValue();
            for(int ch=0;ch<channels;++ch)output.getWritePointer(ch,offset)[i]*=gain;
        }
        for(int ch=0;ch<channels;++ch)outPeak=std::max(outPeak,output.getMagnitude(ch,offset,count));
    }
    inputMeter.store(inPeak);outputMeter.store(outPeak);reductionMeter.store(engine.reductionDb());sideMeter.store(engine.sidechainLevel());
}
juce::AudioProcessorEditor* BlizheProcessor::createEditor(){return new BlizheEditor(*this);}
void BlizheProcessor::getStateInformation(juce::MemoryBlock& dest){if(auto xml=state.copyState().createXml())copyXmlToBinary(*xml,dest);}
void BlizheProcessor::setStateInformation(const void* data,int size){if(auto xml=getXmlFromBinary(data,size))if(xml->hasTagName(state.state.getType()))state.replaceState(juce::ValueTree::fromXml(*xml));}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new BlizheProcessor();}
