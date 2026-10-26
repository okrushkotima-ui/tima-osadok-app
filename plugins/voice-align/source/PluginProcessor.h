#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
class SyncProcessor final:public juce::AudioProcessor {
public:
    SyncProcessor():juce::AudioProcessor(BusesProperties().withInput("Input",juce::AudioChannelSet::stereo(),true).withOutput("Output",juce::AudioChannelSet::stereo(),true)){}
    void prepareToPlay(double,int) override {}
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout &layout) const override {
        const auto main=layout.getMainInputChannelSet();
        return (main==juce::AudioChannelSet::mono()||main==juce::AudioChannelSet::stereo()) && main==layout.getMainOutputChannelSet();
    }
    void processBlock(juce::AudioBuffer<float>&,juce::MidiBuffer&) override {}
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override {return true;}
    const juce::String getName() const override {return JucePlugin_Name;}
    bool acceptsMidi() const override {return false;}
    bool producesMidi() const override {return false;}
    bool isMidiEffect() const override {return false;}
    double getTailLengthSeconds() const override {return 0;}
    int getNumPrograms() override {return 1;}
    int getCurrentProgram() override {return 0;}
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override {return {};}
    void changeProgramName(int,const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*,int) override {}
};
