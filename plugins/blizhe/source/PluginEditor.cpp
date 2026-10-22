#include "PluginEditor.h"
#include <cmath>
namespace {juce::String u(const char* s){return juce::String::fromUTF8(s);}const juce::Colour cream{0xffe2b98c},muted{0xff8d969e};}
void BlizheLook::drawRotarySlider(juce::Graphics& g,int x,int y,int w,int h,float pos,float start,float end,juce::Slider& slider){
    const bool big=slider.getName()=="amount";const float cx=x+w*.5f,cy=y+h*.5f,r=std::min(w,h)*.5f-8;
    if(big){juce::Path track;track.addCentredArc(cx,cy,r-3,r-3,0,start,end,true);g.setColour(juce::Colour(0xff44494e));g.strokePath(track,juce::PathStrokeType(2));juce::Path arc;arc.addCentredArc(cx,cy,r-3,r-3,0,std::min((start+end)*.5f,start+pos*(end-start)),std::max((start+end)*.5f,start+pos*(end-start)),true);g.setColour(cream);g.strokePath(arc,juce::PathStrokeType(2.5f,juce::PathStrokeType::curved,juce::PathStrokeType::rounded));}
    const float knobR=big?r-24:r-3;const auto bounds=juce::Rectangle<float>(cx-knobR,cy-knobR,knobR*2,knobR*2);
    g.setColour(juce::Colours::black.withAlpha(.4f));g.fillEllipse(bounds.translated(0,7).expanded(3));
    g.setGradientFill(juce::ColourGradient(juce::Colour(0xff3d4145),cx-knobR,cy-knobR,juce::Colour(0xff15181c),cx+knobR,cy+knobR,false));g.fillEllipse(bounds);
    g.setColour(juce::Colour(0xff53575a));g.drawEllipse(bounds,1);g.setColour(juce::Colours::white.withAlpha(.035f));g.drawEllipse(bounds.reduced(8),1);
    const float angle=start+pos*(end-start);juce::Path notch;notch.addRoundedRectangle(-1.5f,-knobR+8,3,big?16.0f:9.0f,1.5f);g.setColour(cream);g.fillPath(notch,juce::AffineTransform::rotation(angle).translated(cx,cy));
    if(big){g.setColour(juce::Colour(0xffeee9df));g.setFont(juce::Font(46.0f));g.drawText(juce::String(juce::roundToInt(slider.getValue()*100)),juce::Rectangle<float>(cx-65,cy-31,130,54),juce::Justification::centred);g.setColour(muted);g.setFont(juce::Font(12.0f));g.drawText(u(slider.getValue()<-.005?"дальше / %":slider.getValue()>.005?"ближе / %":"исходный / %"),juce::Rectangle<float>(cx-60,cy+29,120,20),juce::Justification::centred);}
}
BlizheEditor::BlizheEditor(BlizheProcessor& p):AudioProcessorEditor(&p),processor(p){
    setLookAndFeel(&look);setSize(760,480);setResizable(false,false);
    for(auto* s:{&amount,&mix}){s->setSliderStyle(juce::Slider::RotaryVerticalDrag);s->setTextBoxStyle(juce::Slider::NoTextBox,false,0,0);s->setRotaryParameters(juce::MathConstants<float>::pi*1.25f,juce::MathConstants<float>::pi*2.75f,true);s->setMouseDragSensitivity(220);s->setScrollWheelEnabled(false);s->setPopupDisplayEnabled(true,true,this);s->setTextValueSuffix(" %");s->textFromValueFunction=[](double v){return juce::String(juce::roundToInt(v*100));};addAndMakeVisible(*s);}
    amount.setName("amount");amount.setTitle(u("Ближе"));amount.setDescription(u("Влево — дальше, вправо — ближе. Ноль — исходный голос."));amount.setDoubleClickReturnValue(true,0);
    mix.setName("mix");mix.setTitle("Mix");mix.setDoubleClickReturnValue(true,1);
    amountAttachment=std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,"amount",amount);mixAttachment=std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,"mix",mix);
    power.setClickingTogglesState(true);power.setColour(juce::TextButton::buttonColourId,juce::Colour(0xff25292e));power.setColour(juce::TextButton::buttonOnColourId,juce::Colour(0xff504435));power.setColour(juce::TextButton::textColourOnId,cream);power.setTooltip(u("Включить / обойти обработку"));addAndMakeVisible(power);powerAttachment=std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(p.state,"enabled",power);
    startTimerHz(24);
}
BlizheEditor::~BlizheEditor(){stopTimer();setLookAndFeel(nullptr);}
void BlizheEditor::resized(){amount.setBounds(245,106,270,270);mix.setBounds(584,369,68,68);power.setBounds(691,27,36,34);}
void BlizheEditor::timerCallback(){inLevel=std::max(processor.inputMeter.load(),inLevel*.88f);outLevel=std::max(processor.outputMeter.load(),outLevel*.88f);reduction=processor.reductionMeter.load();side=processor.sideMeter.load();repaint();}
void BlizheEditor::meter(juce::Graphics& g,float x,float y,float level,const juce::String& label){
    g.setFont(juce::Font(10.0f));g.setColour(muted);g.drawText(label,static_cast<int>(x)-17,static_cast<int>(y)-28,54,18,juce::Justification::centred);
    const float db=juce::Decibels::gainToDecibels(level,-70.0f),height=juce::jlimit(0.0f,1.0f,(db+60)/60)*132;
    for(int i=0;i<2;++i){g.setColour(juce::Colour(0xff111518));g.fillRoundedRectangle(x+i*12,y,7,132,3);g.setColour(level>=1?juce::Colour(0xffdc7a70):juce::Colour(0xffa6bda3));g.fillRoundedRectangle(x+i*12,y+132-height,7,height,3);}
    g.setColour(muted);g.drawText(level<.0001f?u("−∞"):juce::String(db,1),static_cast<int>(x)-20,static_cast<int>(y)+147,60,18,juce::Justification::centred);
}
void BlizheEditor::paint(juce::Graphics& g){
    g.fillAll(juce::Colour(0xff1b1e22));g.setGradientFill(juce::ColourGradient(juce::Colour(0xff292c30),0,0,juce::Colour(0xff191c20),760,480,false));g.fillAll();
    g.setColour(juce::Colour(0xffeeece8));g.setFont(juce::Font(34.0f,juce::Font::bold));g.drawText(u("ближе"),30,20,190,42,juce::Justification::centredLeft);
    g.setFont(juce::Font(10.0f));g.setColour(muted);g.drawText("vocal presence",32,60,180,16,juce::Justification::centredLeft);
    g.setFont(juce::Font(15.0f));g.setColour(juce::Colour(0xffc4c6c8));g.drawText(u("by тима осадок"),467,35,195,24,juce::Justification::centredRight);
    g.setColour(juce::Colours::white.withAlpha(.05f));g.drawHorizontalLine(91,25,735);
    meter(g,111,167,inLevel,"in");meter(g,628,167,outLevel,"out");
    g.setFont(juce::Font(10.0f));g.setColour(muted);g.drawText(u("дальше"),242,364,115,20,juce::Justification::centredLeft);g.drawText(u("ближе"),402,364,118,20,juce::Justification::centredRight);
    g.setColour(side>.003f?juce::Colour(0xffa6bda3):juce::Colour(0xff5f6871));g.fillEllipse(33,402,5,5);g.setFont(juce::Font(12.0f));g.setColour(muted);g.drawText("beat sidechain",45,391,165,22,juce::Justification::centredLeft);
    g.setFont(juce::Font(10.0f));g.drawText(side>.003f?u("бит подключён · адаптация"):u("работает и без бита"),45,413,210,17,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xffd6c2aa));g.setFont(juce::Font(12.0f));g.drawText("mix",662,381,70,25,juce::Justification::centredLeft);g.setFont(juce::Font(11.0f));g.drawText(juce::String(juce::roundToInt(mix.getValue()*100))+" %",662,406,75,18,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff14171a));g.fillRect(0,450,760,30);g.setColour(muted);g.setFont(juce::Font(10.0f));g.drawText("vst3 / 2x",25,452,150,25,juce::Justification::centredLeft);g.drawText("gr  "+juce::String(reduction,1)+" dB",300,452,160,25,juce::Justification::centred);g.drawText("v0.1.0",635,452,100,25,juce::Justification::centredRight);
}
