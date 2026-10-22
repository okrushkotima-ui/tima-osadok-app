#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>

// DSP is independent of the UI/framework so its invariants can be tested directly.
namespace blizhe {
constexpr double pi = 3.14159265358979323846;
inline float dbGain(float db) noexcept { return std::pow(10.0f, db * 0.05f); }
struct Biquad {
    double b0=1,b1=0,b2=0,a1=0,a2=0,z1=0,z2=0;
    void reset() noexcept { z1=z2=0; }
    void peak(double sr,double hz,double q,double db) noexcept {
        hz=std::min(hz,sr*.4);const double A=std::pow(10.0,db/40),w=2*pi*hz/sr,alpha=std::sin(w)/(2*q),a0=1+alpha/A;
        b0=(1+alpha*A)/a0;b1=-2*std::cos(w)/a0;b2=(1-alpha*A)/a0;a1=b1;a2=(1-alpha/A)/a0;
    }
    float process(float in) noexcept { const double y=b0*in+z1;z1=b1*in-a1*y+z2;z2=b2*in-a2*y;return static_cast<float>(y); }
};
class VocalEngine {
public:
    void prepare(double sr,int channels) noexcept {
        sampleRate=std::max(8000.0,sr);numChannels=std::clamp(channels,1,2);
        smooth=1-std::exp(-1/(.025*sampleRate));attack=std::exp(-1/(.012*sampleRate));release=std::exp(-1/(.130*sampleRate));
        sideAttack=std::exp(-1/(.080*sampleRate));sideRelease=std::exp(-1/(.400*sampleRate));
        rmsRate=1-std::exp(-1/(.5*sampleRate));gainRate=1-std::exp(-1/(1.0*sampleRate));
        body.peak(sampleRate,280,.7,-1.5);presence.peak(sampleRate,2800,.7,2.4);air.peak(sampleRate,7200,.55,.7);
        farPresence.peak(sampleRate,3000,.65,-5);farAir.peak(sampleRate,9000,.5,-4);
        reset();
    }
    void reset() noexcept { envelope=sideEnvelope=0;inPower=outPower=0;autoGain=1;amount=target;lastReduction=0;sideLevel=0;body.reset();presence.reset();air.reset();farPresence.reset();farAir.reset(); }
    void setAmount(float value) noexcept { target=std::clamp(value,-1.0f,1.0f); }
    void process(float& left,float& right,float side,bool sideConnected) noexcept {
        left=std::isfinite(left)?left:0;right=std::isfinite(right)?right:0;
        amount+=static_cast<float>(smooth)*(target-amount);
        const float mid=numChannels==2?(left+right)*.5f:left;
        const float originalSide=numChannels==2?(left-right)*.5f:0;
        // Sidechain analyzes the beat; it does not duck the lead or modify the beat.
        const float sideAbs=sideConnected&&std::isfinite(side)?std::abs(side):0;
        const double sc=sideAbs>sideEnvelope?sideAttack:sideRelease;
        sideEnvelope=static_cast<float>(sc*sideEnvelope+(1-sc)*sideAbs);sideLevel=sideEnvelope;
        const float beatPush=std::clamp((sideEnvelope-.025f)*2.0f,0.0f,.22f);
        const float intensity=std::min(1.0f,std::abs(amount)*(1+beatPush));
        // Stereo-linked compression, with detection from both channels.
        const float detector=std::max(std::abs(left),numChannels==2?std::abs(right):0.0f);
        const double c=detector>envelope?attack:release;
        envelope=static_cast<float>(c*envelope+(1-c)*detector);
        const float level=20*std::log10(std::max(envelope,1.e-8f));
        const float threshold=-15-9*intensity,ratio=1+1.5f*intensity,knee=8;
        const float over=level-threshold;float reduction=0;
        if(over>knee*.5f)reduction=(1-1/ratio)*over;
        else if(over>-knee*.5f){const float x=over+knee*.5f;reduction=(1-1/ratio)*x*x/(2*knee);}
        reduction=std::min(9.0f,reduction);lastReduction=reduction;
        const float gain=dbGain(-reduction+1.7f*intensity);
        const float compressed=mid*gain;
        // Fixed stable filters run continuously. Only the processed difference is mixed.
        float focused=air.process(presence.process(body.process(compressed)));
        focused=compressed+intensity*(focused-compressed);
        const float drive=1+1.6f*intensity;
        const float coloured=std::tanh(focused*drive)/drive;
        const float wetMid=focused+(.22f*intensity)*(coloured-focused);
        // Mid focus in stereo, preserving side polarity and not narrowing to mono.
        const float distant=farAir.process(farPresence.process(compressed));
        const float resultMid=amount<0?compressed+intensity*(distant-compressed):wetMid;
        const float sideGain=amount<0?gain:gain*(1-.10f*intensity);
        float wetL=resultMid+originalSide*sideGain;
        float wetR=numChannels==2?resultMid-originalSide*sideGain:wetL;
        const float powerIn=numChannels==2?(left*left+right*right)*.5f:left*left;
        const float powerOut=numChannels==2?(wetL*wetL+wetR*wetR)*.5f:wetL*wetL;
        inPower+=static_cast<float>(rmsRate)*(powerIn-inPower);outPower+=static_cast<float>(rmsRate)*(powerOut-outPower);
        // Slow RMS compensation: no gain boost during silence or near-silence.
        float desired=1;
        if(inPower>1.e-7f&&outPower>1.e-9f)desired=std::clamp(std::sqrt(inPower/outPower),.71f,1.41f);
        autoGain+=static_cast<float>(gainRate)*(desired-autoGain);
        wetL*=autoGain;wetR*=autoGain;
        // True zero amount; smoothed transitions avoid clicks.
        const float activation=std::min(1.0f,std::abs(amount)*1000);
        left+=activation*(wetL-left);right+=activation*(wetR-right);
    }
    float reductionDb() const noexcept {return lastReduction;}
    float sidechainLevel() const noexcept {return sideLevel;}
private:
    double sampleRate=48000,smooth=0,attack=0,release=0,sideAttack=0,sideRelease=0,rmsRate=0,gainRate=0;
    int numChannels=2;float target=0,amount=0,envelope=0,sideEnvelope=0,sideLevel=0,lastReduction=0,inPower=0,outPower=0,autoGain=1;
    Biquad body,presence,air,farPresence,farAir;
};
}
