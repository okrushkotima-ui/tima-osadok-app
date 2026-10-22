#pragma once
#include "PluginProcessor.h"
#include <juce_gui_basics/juce_gui_basics.h>
class BlizheLook final : public juce::LookAndFeel_V4 {
public:
    void drawRotarySlider(juce::Graphics&,int,int,int,int,float,float,float,juce::Slider&) override;
};
class BlizheEditor final : public juce::AudioProcessorEditor,private juce::Timer {
public:
    explicit BlizheEditor(BlizheProcessor&);
    ~BlizheEditor() override;
    void paint(juce::Graphics&) override;
    void resized() override;
private:
    void timerCallback() override;
    void meter(juce::Graphics&,float,float,float,const juce::String&);
    BlizheProcessor& processor;
    BlizheLook look;
    juce::Slider amount,mix,inputGain,outputGain;
    juce::TextButton power{juce::String::fromUTF8("⏻")};
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> amountAttachment,mixAttachment,inputGainAttachment,outputGainAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> powerAttachment;
    float inLevel=0,outLevel=0,reduction=0,side=0;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BlizheEditor)
};
