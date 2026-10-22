#pragma once
#include "PluginProcessor.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <memory>

class SidechainEditor final:public juce::AudioProcessorEditor,private juce::Timer{
public:
    explicit SidechainEditor(SidechainProcessor&);
    ~SidechainEditor() override {setLookAndFeel(nullptr);}
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
private:
    class Skin final:public juce::LookAndFeel_V4 {
    public:
        void drawRotarySlider(juce::Graphics&,int,int,int,int,float,float,float,juce::Slider&) override;
    };
    SidechainProcessor&processor;
    Skin skin;
    juce::Slider depth,mix,threshold,shift,recovery,cutoff;
    juce::ComboBox mode,length;
    juce::TextButton lowOnly{"BASS ONLY"},classic{"PUNCH"},soft{"SMOOTH"},
                     groove{"GROOVE"},reverse{"REVERSE"},reset{"RESET CURVE"};
    juce::Label message;
    using SliderLink=juce::AudioProcessorValueTreeState::SliderAttachment;
    using ComboLink=juce::AudioProcessorValueTreeState::ComboBoxAttachment;
    using ButtonLink=juce::AudioProcessorValueTreeState::ButtonAttachment;
    std::unique_ptr<SliderLink> depthLink,mixLink,thresholdLink,shiftLink,recoveryLink,cutoffLink;
    std::unique_ptr<ComboLink> modeLink,lengthLink;
    std::unique_ptr<ButtonLink> lowLink;
    const juce::Rectangle<float> graph{41.f,161.f,803.f,293.f};
    int draggedPoint=-1;
    float displayGain=1.f,displayKick=0.f;
    bool displayConnected=false;
    sidechain::KickScope::Snapshot kickWave;
    double displayTempo=120.0;
    unsigned int lastTriggerCount=0;
    int triggerGlowFrames=0;
    sidechain::Curve readCurve() const;
    void setPreset(const sidechain::Curve&);
    void changePoint(int index,float y);
    int pointNear(juce::Point<float>) const;
    void timerCallback() override;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SidechainEditor)
};
