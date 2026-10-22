#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>

namespace sidechain {
constexpr int curvePoints=9;
constexpr double pi=3.14159265358979323846;

using Curve=std::array<float,curvePoints>;
constexpr Curve punch{{0.f,0.05f,0.24f,0.60f,0.84f,0.95f,1.f,1.f,1.f}};
constexpr Curve smooth{{0.08f,0.15f,0.32f,0.52f,0.71f,0.83f,0.93f,0.98f,1.f}};
constexpr Curve groove{{0.0f,0.06f,0.23f,0.82f,0.87f,0.92f,0.98f,1.f,1.f}};
constexpr Curve reverse{{1.f,1.f,0.85f,0.55f,0.22f,0.f,0.15f,0.65f,1.f}};

// Hermite interpolation with slope clamp for a musical, continuous volume envelope.
// Output stays within 0..1 for any control-point combination.
inline float shape(const Curve& points,float phase){
    if(!std::isfinite(phase))return 1.f;
    phase=std::clamp(phase,0.f,1.f);
    const float sample=phase*(curvePoints-1);
    const auto index=std::min(static_cast<int>(sample),curvePoints-2);
    const float x=sample-index;
    auto point=[&](int i){return std::clamp(points[static_cast<size_t>(std::clamp(i,0,curvePoints-1))],0.f,1.f);};
    const float y0=point(index),y1=point(index+1);
    const float a=point(index-1),b=point(index+2);
    // Prevent cubic overshoot by using slopes limited by adjacent monotonic segments.
    auto slope=[](float lhs,float mid,float rhs){
        float l=mid-lhs,r=rhs-mid;
        if(l*r<=0)return 0.f;
        return std::copysign(std::min({std::abs((l+r)*.5f),2.f*std::abs(l),2.f*std::abs(r)}),l);
    };
    float m0=slope(a,y0,y1),m1=slope(y0,y1,b);
    float t2=x*x,t3=t2*x;
    return std::clamp((2*t3-3*t2+1)*y0+(t3-2*t2+x)*m0+(-2*t3+3*t2)*y1+(t3-t2)*m1,0.f,1.f);
}

inline double quarterNotes(int lengthIndex){
    constexpr std::array<double,6> lengths{{.25,.5,1.,2.,4.,8.}};
    return lengths[static_cast<size_t>(std::clamp(lengthIndex,0,5))];
}

class Engine {
public:
    enum Mode {Sync=0,Audio=1,Midi=2};
    void reset(double newRate){
        rate=std::max(8000.,newRate);
        gain=1.f;previousKick=0.f;armed=true;
        envelopeSample=0;active=false;freeCounter=0;lastTriggered=false;
        cooldown=0;
    }
    void setCurve(const Curve& curve){points=curve;}
    void setSettings(int newMode,int newLength,float newDepth,float newMix,float newThresholdDb,float newShift,
                     double newBpm){
        mode=std::clamp(newMode,0,2);
        length=std::clamp(newLength,0,5);
        depth=std::clamp(newDepth,0.f,1.f);
        mix=std::clamp(newMix,0.f,1.f);
        threshold=std::pow(10.f,std::clamp(newThresholdDb,-60.f,0.f)/20.f);
        shift=std::clamp(newShift,-.49f,.49f);
        bpm=std::clamp(newBpm,20.,400.);
    }
    // ppq is the host's absolute quarter-note position at THIS audio sample.
    // When unavailable, pass a negative value and use an internal oscillator.
    float next(float kickPeak,bool midiNote,double ppq=-1.0) {
        lastTriggered=false;
        const double period=rate*60./bpm*quarterNotes(length);
        const float phaseIncrement=static_cast<float>(1./std::max(1.,period));
        float phase=0;
        if(mode==Sync){
            const double hostBeat=ppq>=0.0?ppq:freeCounter*60./(rate*bpm);
            auto beats=hostBeat/quarterNotes(length);
            phase=static_cast<float>(beats-std::floor(beats));
        }else{
            bool trigger=false;
            if(mode==Audio){
                const float value=std::clamp(std::abs(kickPeak),0.f,8.f);
                // Fast peak tracking and a short hold-off avoid retriggering by kick tails.
                const float coeff=std::exp(-1.f/static_cast<float>(rate*.0015));
                previousKick=std::max(value,previousKick*coeff);
                if(previousKick<threshold*.42f)armed=true;
                if(armed&&cooldown==0&&previousKick>=threshold){
                    trigger=true;armed=false;cooldown=static_cast<int>(rate*.065);
                }
                if(cooldown>0)--cooldown;
            }else if(midiNote){trigger=true;}
            if(trigger){active=true;envelopeSample=0;lastTriggered=true;}
            if(active) {
                phase=static_cast<float>(envelopeSample/std::max(1.,period));
                ++envelopeSample;
                if(phase>=1.f) {active=false;phase=1.f;}
            }else phase=1.f; // No kick or MIDI? no artificial pumping.
        }
        if(mode==Sync||active){
            phase+=shift;
            phase-=std::floor(phase);
        }
        const float raw=shape(points,phase);
        const float destination=1.f-depth*mix*(1.f-raw);
        // Sub-millisecond smoothing prevents discontinuities even at hard user curves.
        const float coefficient=1.f-std::exp(-1.f/static_cast<float>(rate*.00085));
        gain+=coefficient*(destination-gain);
        ++freeCounter;
        return std::clamp(gain,0.f,1.f);
    }
    float lastGain() const{return gain;}
    bool triggered() const{return lastTriggered;}
private:
    Curve points=punch;
    double rate=48000,bpm=120,freeCounter=0,envelopeSample=0;
    float gain=1,depth=1,mix=1,threshold=.1f,shift=0,previousKick=0;
    int mode=Sync,length=2,cooldown=0;
    bool active=false,armed=true,lastTriggered=false;
};

// Complementary reconstruction when no ducking: source - (1-gain)*low.
// This provides "LOW ONLY" bass ducking without colouring the wet/dry bypass.
class LowBand {
public:
    void reset(){a=0;b=0;}
    void setCutoff(double rate,float hz) {
        const float frequency=std::clamp(hz,40.f,800.f);
        alpha=1.f-std::exp(-2.f*static_cast<float>(pi)*frequency/static_cast<float>(std::max(8000.,rate)));
    }
    float process(float input,float linearGain){
        a+=alpha*(input-a);b+=alpha*(a-b);
        return input-(1.f-linearGain)*b;
    }
private:
    float a=0,b=0,alpha=.03f;
};
} // namespace sidechain
