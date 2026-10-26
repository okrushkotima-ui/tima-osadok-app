#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <cmath>

SidechainProcessor::SidechainProcessor()
    : AudioProcessor(BusesProperties()
        .withInput("Input",juce::AudioChannelSet::stereo(),true)
        .withOutput("Output",juce::AudioChannelSet::stereo(),true)
        .withInput("Kick Trigger",juce::AudioChannelSet::stereo(),false)),
      parameters(*this,nullptr,juce::Identifier("SIDECHAIN_STATE"),makeLayout()){}

juce::AudioProcessorValueTreeState::ParameterLayout SidechainProcessor::makeLayout(){
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    auto fl=[&](const char* id,juce::String name,float min,float max,float defaultValue,float interval=.001f) {
        layout.add(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID{id,1},name,
            juce::NormalisableRange<float>(min,max,interval),defaultValue));
    };
    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID{"mode",1},"TRIGGER",
        juce::StringArray{"SYNC","AUDIO KICK","MIDI NOTE"},0));
    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID{"length",1},"LENGTH",
        juce::StringArray{"1/16","1/8","1/4","1/2","1 BAR","2 BARS"},2));
    fl("depth","DEPTH",0.f,1.f,1.f);
    fl("mix","MIX",0.f,1.f,1.f);
    fl("threshold","KICK SENSITIVITY (dB)",-60.f,-3.f,-22.f,.1f);
    fl("shift","PHASE SHIFT",-.49f,.49f,0.f);
    layout.add(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID{"lowOnly",1},"BASS ONLY",false));
    fl("cutoff","LOW BAND CUTOFF",40.f,800.f,180.f,1.f);
    for(int i=0;i<sidechain::curvePoints;++i){
        const auto id=juce::String("p")+juce::String(i);
        layout.add(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID{id,1},"CURVE "+juce::String(i),
            juce::NormalisableRange<float>(0.f,1.f,.001f),
            sidechain::punch[static_cast<size_t>(i)]));
    }
    return layout;
}

bool SidechainProcessor::isBusesLayoutSupported(const BusesLayout& layout) const {
    if(layout.inputBuses.size()!=2||layout.outputBuses.size()!=1)return false;
    const auto main=layout.getMainInputChannelSet();
    if(main!=juce::AudioChannelSet::mono()&&main!=juce::AudioChannelSet::stereo())return false;
    if(layout.getMainOutputChannelSet()!=main)return false;
    const auto trigger=layout.inputBuses[1];
    return trigger.isDisabled()||trigger==juce::AudioChannelSet::mono()||trigger==juce::AudioChannelSet::stereo();
}

void SidechainProcessor::prepareToPlay(double rate,int){
    sampleRate=std::max(8000.0,rate);
    engine.reset(sampleRate);
    for(auto& f:filters){f.reset();f.setCutoff(sampleRate,180.f);}
}

void SidechainProcessor::processBlock(juce::AudioBuffer<float>&buffer,juce::MidiBuffer&midi){
    juce::ScopedNoDenormals guard;
    auto main=getBusBuffer(buffer,true,0);
    if(main.getNumChannels()<=0||main.getNumSamples()==0)return;

    const auto* bus=getBus(true,1);
    const bool kickEnabled=bus!=nullptr&&bus->isEnabled();
    sidechainConnected.store(kickEnabled,std::memory_order_relaxed);
    // This is a non-owning view of the optional auxiliary bus, with no
    // copying or allocation on the real-time audio callback.
    auto kick=getBusBuffer(buffer,true,1);
    const int channels=main.getNumChannels(),count=main.getNumSamples();
    auto get=[this](const char* key){return parameters.getRawParameterValue(key)->load(std::memory_order_relaxed);};
    sidechain::Curve curve{};
    for(size_t i=0;i<curve.size();++i)
        curve[i]=get(pointIds[i]);
    engine.setCurve(curve);

    double bpm=120,ppq=-1;
    if(auto *playHead=getPlayHead()){
        if(auto pos=playHead->getPosition()){
            bpm=pos->getBpm().orFallback(120.0);
            ppq=pos->getPpqPosition().orFallback(-1.0);
        }
    }
    if(!std::isfinite(bpm)||bpm<20||bpm>400)bpm=120;
    engine.setSettings(static_cast<int>(get("mode")),static_cast<int>(get("length")),
                       get("depth"),get("mix"),get("threshold"),get("shift"),bpm);
    const bool bassOnly=get("lowOnly")>.5f;
    const float cutoff=get("cutoff");
    for(auto &filter:filters)filter.setCutoff(sampleRate,cutoff);
    const double beatStep=bpm/(60.*sampleRate);
    juce::MidiBuffer::Iterator noteIterator(midi);
    juce::MidiMessage message;int notePosition=0;
    bool hasMessage=noteIterator.getNextEvent(message,notePosition);
    float lastKick=0;
    for(int sample=0;sample<count;++sample){
        bool note=false;
        while(hasMessage&&notePosition<=sample){
            if(notePosition==sample&&message.isNoteOn())note=true;
            hasMessage=noteIterator.getNextEvent(message,notePosition);
        }
        float peak=0.f;
        if(kickEnabled){
            for(int ch=0;ch<kick.getNumChannels();++ch)
                peak=std::max(peak,std::abs(kick.getSample(ch,sample)));
        }
        lastKick=std::max(lastKick*.988f,peak);
        const double quarter=ppq>=0?ppq+sample*beatStep:-1.;
        const float g=engine.next(peak,note,quarter);
        for(int ch=0;ch<channels;++ch){
            const float input=main.getSample(ch,sample);
            float result;
            if(bassOnly){
                result=filters[static_cast<size_t>(std::min(ch,1))].process(input,g);
            }else {
                // Run filters at unity in parallel to avoid a cold-start
                // transient when switching BASS ONLY on during playback.
                filters[static_cast<size_t>(std::min(ch,1))].process(input,1.f);
                result=input*g;
            }
            main.setSample(ch,sample,result);
        }
    }
    displayGain.store(engine.lastGain(),std::memory_order_relaxed);
    displayKick.store(lastKick,std::memory_order_relaxed);
}

void SidechainProcessor::getStateInformation(juce::MemoryBlock&dest){
    if(auto xml=parameters.copyState().createXml())
        copyXmlToBinary(*xml,dest);
}
void SidechainProcessor::setStateInformation(const void*data,int size){
    if(auto xml=getXmlFromBinary(data,size);xml&&xml->hasTagName(parameters.state.getType()))
        parameters.replaceState(juce::ValueTree::fromXml(*xml));
}
juce::AudioProcessorEditor* SidechainProcessor::createEditor(){return new SidechainEditor(*this);}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new SidechainProcessor();}
