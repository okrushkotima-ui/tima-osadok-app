#include "PluginEditor.h"
#include <algorithm>
#include <cmath>
namespace {
const juce::Colour bg(0xff161a1d),panel(0xff23282d),softPanel(0xff2b3238),
  cream(0xfff5eddf),muted(0xffa3abb0),yellow(0xfff3bb62),
  teal(0xff72d6cc),line(0xff3a454e);
}
void SidechainEditor::Skin::drawRotarySlider(juce::Graphics&g,int x,int y,int width,int height,
  float pos,float start,float end,juce::Slider&){
    auto centre=juce::Point<float>(x+width*.5f,y+height*.5f);
    const float radius=std::min(width,height)*.395f;
    const float angle=start+(end-start)*pos;
    g.setColour(juce::Colours::black.withAlpha(.35f));
    g.fillEllipse(centre.x-radius+2,centre.y-radius+6,radius*2,radius*2);
    g.setColour(juce::Colour(0xff353e47));
    g.fillEllipse(centre.x-radius,centre.y-radius,radius*2,radius*2);
    g.setColour(juce::Colour(0xff1b2228));
    g.fillEllipse(centre.x-radius+9,centre.y-radius+9,(radius-9)*2,(radius-9)*2);
    juce::Path track,active;
    track.addCentredArc(centre.x,centre.y,radius+4,radius+4,0,start,end,true);
    active.addCentredArc(centre.x,centre.y,radius+4,radius+4,0,start,angle,true);
    g.setColour(juce::Colour(0xff57626c));g.strokePath(track,juce::PathStrokeType(5.f));
    g.setColour(yellow.withAlpha(.20f));g.strokePath(active,juce::PathStrokeType(12.f));
    g.setColour(yellow);g.strokePath(active,juce::PathStrokeType(5.f));
    const auto target=juce::Point<float>(centre.x+std::sin(angle)*(radius-18),
                                         centre.y-std::cos(angle)*(radius-18));
    g.setColour(cream);g.drawLine(centre.x,centre.y,target.x,target.y,3.f);
    g.setColour(yellow);g.fillEllipse(centre.x-4,centre.y-4,8,8);
}
SidechainEditor::SidechainEditor(SidechainProcessor& p):AudioProcessorEditor(&p),processor(p){
    setSize(1080,650);setResizable(false,false);
    setLookAndFeel(&skin);
    auto rotary=[this](juce::Slider&s,juce::String tooltip){
        s.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
        s.setTextBoxStyle(juce::Slider::NoTextBox,false,0,0);
        s.setRotaryParameters(juce::degreesToRadians(225.f),juce::degreesToRadians(495.f),true);
        s.setTooltip(tooltip);addAndMakeVisible(s);
    };
    rotary(depth,"Amount of ducking");
    rotary(mix,"Dry / wet mix");
    rotary(threshold,"Audio kick trigger threshold");
    rotary(shift,"Timing offset ±49% of duck cycle");
    rotary(cutoff,"Bass-only low band crossover frequency");

    auto box=[this](juce::ComboBox& c,juce::String tip){
        c.setColour(juce::ComboBox::backgroundColourId,softPanel);
        c.setColour(juce::ComboBox::textColourId,cream);
        c.setColour(juce::ComboBox::outlineColourId,line);
        c.setColour(juce::ComboBox::arrowColourId,yellow);
        c.setTooltip(tip);addAndMakeVisible(c);
    };
    mode.addItem("SYNC",1);mode.addItem("AUDIO KICK",2);mode.addItem("MIDI",3);
    length.addItem("1/16",1);length.addItem("1/8",2);length.addItem("1/4",3);
    length.addItem("1/2",4);length.addItem("1 BAR",5);length.addItem("2 BARS",6);
    box(mode,"SYNC: tempo grid, AUDIO KICK: external Studio One sidechain, MIDI: note-on");
    box(length,"Duration of ducking envelope");
    depthLink=std::make_unique<SliderLink>(processor.parameters,"depth",depth);
    mixLink=std::make_unique<SliderLink>(processor.parameters,"mix",mix);
    thresholdLink=std::make_unique<SliderLink>(processor.parameters,"threshold",threshold);
    shiftLink=std::make_unique<SliderLink>(processor.parameters,"shift",shift);
    cutoffLink=std::make_unique<SliderLink>(processor.parameters,"cutoff",cutoff);
    modeLink=std::make_unique<ComboLink>(processor.parameters,"mode",mode);
    lengthLink=std::make_unique<ComboLink>(processor.parameters,"length",length);
    auto button=[this](juce::TextButton&b,bool highlight){
        addAndMakeVisible(b);
        b.setColour(juce::TextButton::buttonColourId,highlight?juce::Colour(0xffbf8842):softPanel);
        b.setColour(juce::TextButton::textColourOffId,highlight?bg:cream);
        b.setColour(juce::TextButton::buttonOnColourId,juce::Colour(0xffb49a65));
        b.setMouseCursor(juce::MouseCursor::PointingHandCursor);
    };
    lowOnly.setClickingTogglesState(true);
    button(lowOnly,false);button(classic,true);button(soft,false);button(groove,false);
    button(reverse,false);button(reset,false);
    lowLink=std::make_unique<ButtonLink>(processor.parameters,"lowOnly",lowOnly);
    classic.onClick=[this]{setPreset(sidechain::punch);};
    soft.onClick=[this]{setPreset(sidechain::smooth);};
    groove.onClick=[this]{setPreset(sidechain::groove);};
    reverse.onClick=[this]{setPreset(sidechain::reverse);};
    reset.onClick=[this]{setPreset(sidechain::punch);};
    message.setFont(juce::Font(12.f));
    message.setColour(juce::Label::textColourId,muted);
    message.setText("SYNC works immediately. For AUDIO, enable Studio One's sidechain and send the kick.",juce::dontSendNotification);
    addAndMakeVisible(message);
    startTimerHz(24);
}
void SidechainEditor::resized(){
    mode.setBounds(526,97,155,35);
    length.setBounds(697,97,147,35);
    depth.setBounds(874,183,156,151);
    mix.setBounds(898,376,111,106);
    threshold.setBounds(38,522,93,91);
    shift.setBounds(261,522,93,91);
    cutoff.setBounds(493,522,93,91);
    lowOnly.setBounds(607,555,130,31);
    classic.setBounds(41,472,117,31);soft.setBounds(168,472,117,31);
    groove.setBounds(295,472,117,31);reverse.setBounds(422,472,117,31);
    reset.setBounds(711,472,132,31);
    message.setBounds(42,615,985,25);
}
void SidechainEditor::timerCallback(){
    displayGain=processor.displayGain.load(std::memory_order_relaxed);
    displayKick=processor.displayKick.load(std::memory_order_relaxed);
    displayConnected=processor.sidechainConnected.load(std::memory_order_relaxed);
    repaint();
}
sidechain::Curve SidechainEditor::readCurve()const{
    sidechain::Curve points{};
    for(size_t i=0;i<points.size();++i)
        points[i]=processor.parameters.getRawParameterValue(SidechainProcessor::pointIds[i])->load();
    return points;
}
void SidechainEditor::setPreset(const sidechain::Curve& preset){
    for(size_t i=0;i<preset.size();++i)if(auto *p=processor.parameters.getParameter(SidechainProcessor::pointIds[i])){
        p->beginChangeGesture();
        p->setValueNotifyingHost(std::clamp(preset[i],0.f,1.f));
        p->endChangeGesture();
    }
    repaint();
}
void SidechainEditor::changePoint(int index,float value){
    if(index<0||index>=sidechain::curvePoints)return;
    if(auto *p=processor.parameters.getParameter(SidechainProcessor::pointIds[static_cast<size_t>(index)]))
        p->setValueNotifyingHost(std::clamp(value,0.f,1.f));
    repaint();
}
int SidechainEditor::pointNear(juce::Point<float> point)const{
    if(!graph.expanded(14.f).contains(point))return -1;
    int closest=-1;float best=22.f;
    for(int i=0;i<sidechain::curvePoints;++i){
        const float x=graph.getX()+i*graph.getWidth()/(sidechain::curvePoints-1);
        const auto distance=std::abs(x-point.x);
        if(distance<best){best=distance;closest=i;}
    }
    return closest;
}
void SidechainEditor::mouseDown(const juce::MouseEvent &e){
    draggedPoint=pointNear(e.position);
    if(draggedPoint>=0){
        if(auto *p=processor.parameters.getParameter(SidechainProcessor::pointIds[static_cast<size_t>(draggedPoint)]))
            p->beginChangeGesture();
        changePoint(draggedPoint,(graph.getBottom()-e.position.y)/graph.getHeight());
    }
}
void SidechainEditor::mouseDrag(const juce::MouseEvent &e){
    if(draggedPoint>=0)changePoint(draggedPoint,(graph.getBottom()-e.position.y)/graph.getHeight());
}
void SidechainEditor::mouseUp(const juce::MouseEvent&){
    if(draggedPoint>=0)
        if(auto *p=processor.parameters.getParameter(SidechainProcessor::pointIds[static_cast<size_t>(draggedPoint)]))
            p->endChangeGesture();
    draggedPoint=-1;
}
void SidechainEditor::paint(juce::Graphics&g){
    g.setGradientFill(juce::ColourGradient(juce::Colour(0xff242a2f),0,0,bg,1080,650,false));
    g.fillAll();
    g.setColour(yellow.withAlpha(.09f));g.fillEllipse(-110,-190,590,480);
    g.setColour(cream);g.setFont(juce::Font(42.f,juce::Font::bold));
    g.drawText("SIDECHAIN",41,31,440,52,juce::Justification::centredLeft);
    g.setColour(yellow);g.setFont(juce::Font(13.f));
    g.drawText(juce::String::fromUTF8("by тима осадок"),876,41,163,25,juce::Justification::centredRight);
    g.setColour(muted);g.setFont(juce::Font(12.f));
    g.drawText("RHYTHM-SHAPED DUCKING   /   WINDOWS VST3   /   v0.1.0",43,84,440,24,juce::Justification::centredLeft);
    g.setColour(line);g.drawHorizontalLine(141,40,1039);
    g.setColour(muted);g.setFont(juce::Font(10.f,juce::Font::bold));
    g.drawText("TRIGGER",526,76,155,17,juce::Justification::centredLeft);
    g.drawText("LENGTH",697,76,147,17,juce::Justification::centredLeft);

    g.setColour(juce::Colours::black.withAlpha(.26f));g.fillRoundedRectangle(graph.expanded(12.f).translated(0,4),14);
    g.setColour(panel);g.fillRoundedRectangle(graph.expanded(12.f),14);
    const auto current=readCurve();
    for(int row=0;row<=4;++row){
        const float y=graph.getY()+row*graph.getHeight()/4;
        g.setColour(line.withAlpha(row==4?.9f:.5f));g.drawHorizontalLine(static_cast<int>(y),graph.getX(),graph.getRight());
    }
    for(int column=0;column<=8;++column){
        const float x=graph.getX()+column*graph.getWidth()/8;
        g.setColour(line.withAlpha(.37f));g.drawVerticalLine(static_cast<int>(x),graph.getY(),graph.getBottom());
    }
    // The graph visualises the actual DSP curve, not a decorative approximation.
    juce::Path curve,under;
    for(int i=0;i<=500;++i){
        const float t=i/500.f;
        const float x=graph.getX()+t*graph.getWidth();
        const float y=graph.getBottom()-sidechain::shape(current,t)*graph.getHeight();
        if(i==0){curve.startNewSubPath(x,y);under.startNewSubPath(x,y);}
        else{curve.lineTo(x,y);under.lineTo(x,y);}
    }
    under.lineTo(graph.getRight(),graph.getBottom());
    under.lineTo(graph.getX(),graph.getBottom());under.closeSubPath();
    g.setGradientFill(juce::ColourGradient(yellow.withAlpha(.27f),graph.getX(),graph.getY(),
                                           yellow.withAlpha(.015f),graph.getX(),graph.getBottom(),false));
    g.fillPath(under);
    g.setColour(yellow.withAlpha(.17f));g.strokePath(curve,juce::PathStrokeType(10.f));
    g.setColour(yellow);g.strokePath(curve,juce::PathStrokeType(3.3f));
    for(int i=0;i<sidechain::curvePoints;++i){
        const float x=graph.getX()+i*graph.getWidth()/8;
        const float y=graph.getBottom()-current[static_cast<size_t>(i)]*graph.getHeight();
        g.setColour(cream);g.fillEllipse(x-5,y-5,10,10);
        g.setColour(yellow);g.drawEllipse(x-5,y-5,10,10,2.f);
    }
    g.setColour(muted);g.setFont(juce::Font(10.f));
    g.drawText("DUCK",51,165,110,18,juce::Justification::centredLeft);
    g.drawText("RECOVERY →",691,434,140,18,juce::Justification::centredRight);
    g.drawText("100%",48,146,70,17,juce::Justification::centredLeft);

    g.setColour(panel);g.fillRoundedRectangle(865.f,165.f,172.f,332.f,13.f);
    g.setColour(muted);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("DUCK DEPTH",878,177,147,18,juce::Justification::centred);
    g.setColour(cream);g.setFont(juce::Font(29.f,juce::Font::bold));
    g.drawText(juce::String(std::lround(depth.getValue()*100.))+"%",874,333,155,34,juce::Justification::centred);
    g.setColour(muted);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("MIX",877,364,148,18,juce::Justification::centred);
    g.setColour(cream);g.setFont(juce::Font(15.f,juce::Font::bold));
    g.drawText(juce::String(std::lround(mix.getValue()*100.))+"%",903,483,100,17,juce::Justification::centred);

    g.setColour(muted);g.setFont(juce::Font(10.5f,juce::Font::bold));
    g.drawText("KICK THRESHOLD",40,510,170,20,juce::Justification::centredLeft);
    g.drawText("PHASE SHIFT",262,510,166,20,juce::Justification::centredLeft);
    g.drawText("BASS CUTOFF",496,510,166,20,juce::Justification::centredLeft);
    g.setColour(cream);g.setFont(juce::Font(12.f));
    g.drawText(juce::String(threshold.getValue(),1)+" dB",119,552,102,20,juce::Justification::centredLeft);
    g.drawText(juce::String(shift.getValue()*100.,0)+"%",345,552,100,20,juce::Justification::centredLeft);
    g.drawText(juce::String(cutoff.getValue(),0)+" Hz",576,552,100,20,juce::Justification::centredLeft);
    g.setColour(line);g.drawHorizontalLine(604,41,1040);

    const float x=862,barY=526;
    g.setColour(muted);g.setFont(juce::Font(10.5f,juce::Font::bold));
    g.drawText("GAIN",x,507,86,18,juce::Justification::centredLeft);
    g.drawText("KICK",x+106,507,70,18,juce::Justification::centredLeft);
    g.setColour(line);g.fillRoundedRectangle(x,barY,88,13,5);
    g.fillRoundedRectangle(x+106,barY,68,13,5);
    g.setColour(yellow);g.fillRoundedRectangle(x,barY,88*std::clamp(displayGain,0.f,1.f),13,5);
    g.setColour(teal);g.fillRoundedRectangle(x+106,barY,68*std::clamp(displayKick*2.5f,0.f,1.f),13,5);
    const auto activeMode=mode.getSelectedId();
    const auto status=activeMode==2?
       (displayConnected?"AUDIO KICK: sidechain bus active. Send kick from Studio One.":
                         "AUDIO KICK: enable sidechain in Studio One and route kick → Sidechain."):
       (activeMode==3?"MIDI: send note-on events to trigger ducking.":"SYNC: follows Studio One tempo. No routing required.");
    g.setColour(activeMode==2&&!displayConnected?yellow:teal);
    g.fillEllipse(864,572,8,8);
    g.setColour(muted);g.setFont(juce::Font(10.f));
    g.drawFittedText(status,880,560,168,44,juce::Justification::centredLeft,3);
}
