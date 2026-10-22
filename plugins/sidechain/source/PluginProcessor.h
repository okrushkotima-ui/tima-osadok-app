#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <atomic>
#include "SidechainEngine.h"

class SidechainProcessor final : public juce::AudioProcessor {
public:
    SidechainProcessor();
    void prepareToPlay(double,int) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout&) const override;
    void processBlock(juce::AudioBuffer<float>&,juce::MidiBuffer&) override;
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override {return true;}
    const juce::String getName() const override {return JucePlugin_Name;}
    bool acceptsMidi() const override {return true;}
    bool producesMidi() const override {return false;}
    bool isMidiEffect() const override {return false;}
    double getTailLengthSeconds() const override {return 0.0;}
    int getNumPrograms() override {return 1;}
    int getCurrentProgram() override {return 0;}
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override {return {};}
    void changeProgramName(int,const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock&) override;
    void setStateInformation(const void*,int) override;
    juce::AudioProcessorValueTreeState parameters;
    std::atomic<float> displayGain{1.f},displayKick{0.f};
    std::atomic<bool> sidechainConnected{false};
    static juce::AudioProcessorValueTreeState::ParameterLayout makeLayout();
    static constexpr std::array<const char*,9> pointIds{{"p0","p1","p2","p3","p4","p5","p6","p7","p8"}};
private:
    sidechain::Engine engine;
    std::array<sidechain::LowBand,2> filters;
    double sampleRate=48000.0;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SidechainProcessor)
};
