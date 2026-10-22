#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "VocalEngine.h"

class BlizheProcessor final : public juce::AudioProcessor {
public:
    BlizheProcessor();
    ~BlizheProcessor() override = default;
    void prepareToPlay(double,int) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout&) const override;
    void processBlock(juce::AudioBuffer<float>&,juce::MidiBuffer&) override;
    void processBlockBypassed(juce::AudioBuffer<float>&,juce::MidiBuffer&) override;
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override {return true;}
    const juce::String getName() const override {return JucePlugin_Name;}
    bool acceptsMidi() const override {return false;}
    bool producesMidi() const override {return false;}
    bool isMidiEffect() const override {return false;}
    double getTailLengthSeconds() const override {return .15;}
    int getNumPrograms() override {return 1;}
    int getCurrentProgram() override {return 0;}
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override {return {};}
    void changeProgramName(int,const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock&) override;
    void setStateInformation(const void*,int) override;
    juce::AudioProcessorValueTreeState state;
    std::atomic<float> inputMeter{0},outputMeter{0},reductionMeter{0},sideMeter{0};
private:
    static juce::AudioProcessorValueTreeState::ParameterLayout parameters();
    void process(juce::AudioBuffer<float>&,bool bypassed);
    blizhe::VocalEngine engine;
    std::unique_ptr<juce::dsp::Oversampling<float>> oversampling;
    juce::dsp::DryWetMixer<float> dryWet{64};
    juce::SmoothedValue<float,juce::ValueSmoothingTypes::Linear> inputGainSmooth,outputGainSmooth;
    int latency=0,capacity=512;
    std::atomic<float>* amountParam=nullptr;
    std::atomic<float>* mixParam=nullptr;
    std::atomic<float>* enabledParam=nullptr;
    std::atomic<float>* inputGainParam=nullptr;
    std::atomic<float>* outputGainParam=nullptr;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BlizheProcessor)
};
