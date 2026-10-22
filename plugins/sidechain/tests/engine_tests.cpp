#include "SidechainEngine.h"
#include "KickScope.h"
#include <cmath>
#include <iostream>
#include <stdexcept>
static void require(bool pass,const char* why){if(!pass)throw std::runtime_error(why);}
int main(){
try{
    for(auto curve:{sidechain::punch,sidechain::smooth,sidechain::groove,sidechain::reverse}){
        for(int i=0;i<=1000;++i){
            float g=sidechain::shape(curve,i/1000.f);
            require(std::isfinite(g)&&g>=0&&g<=1,"bad curve");
        }
        require(std::abs(sidechain::shape(curve,0)-curve.front())<.0001,"wrong start");
        require(std::abs(sidechain::shape(curve,1)-curve.back())<.0001,"wrong end");
    }
    for(double sr:{44100.,48000.,96000.,192000.}){
        sidechain::Engine e;
        e.reset(sr);e.setCurve(sidechain::punch);
        e.setSettings(0,2,1,1,-22,0,120);
        float low=1,high=0;
        for(int i=0;i<static_cast<int>(sr*.5);++i){
            float g=e.next(0,false,i/sr*2.);
            low=std::min(low,g);high=std::max(high,g);
            require(std::isfinite(g)&&g>=0&&g<=1,"invalid sync");
        }
        require(low<.12f&&high>.95f,"sync doesn't duck and recover");
        e.reset(sr);e.setSettings(1,2,1,1,-22,0,120);
        for(int i=0;i<static_cast<int>(sr*.05);++i)
            require(e.next(0,false)>.99f,"false duck without kick");
        float minKick=1.f;
        for(int i=0;i<static_cast<int>(sr*.45);++i)
            minKick=std::min(minKick,e.next(i==0?.8f:0.f,false));
        require(minKick<.1f,"kick trigger missing");
        require(e.lastGain()>.85f,"kick never recovers");
        // Reproduction of reported bug: PHASE SHIFT must not wrap the
        // kick-triggered envelope so the bass stays loud until the kick ends.
        // Every AUDIO KICK onset should duck within 2 ms, irrespective of
        // a previously saved phase-shift setting or the musical LENGTH.
        e.reset(sr);e.setSettings(1,5,1,1,-40,.49f,120,80.f);
        bool onset=false;
        float firstMs=1.f;
        for(int i=0;i<static_cast<int>(sr*.002);++i){
            const float g=e.next(i==0?.7f:0.f,false);
            if(i==0)onset=e.triggered();
            firstMs=std::min(firstMs,g);
        }
        require(onset,"audio trigger must fire on first kick sample");
        require(firstMs<.2f,"AUDIO KICK is delayed by PHASE SHIFT or has sluggish attack");
        for(int i=0;i<static_cast<int>(sr*.100);++i)e.next(0,false);
        require(e.lastGain()>.95f,"80ms kick recovery failed");
        // Large negative shift must not wrap to the end of the envelope.
        e.reset(sr);e.setSettings(1,5,1,1,-40,-.49f,120,80.f);
        float early=1.f;
        for(int i=0;i<static_cast<int>(sr*.002);++i)
            early=std::min(early,e.next(i==0?.7f:0.f,false));
        require(early<.2f,"negative phase shift suppressed kick trigger");
        // Recovery must be independent from beat length and tempo in
        // AUDIO KICK: an 80ms transient should not wait a full 1/4 note.
        e.reset(sr);e.setSettings(1,2,1,1,-40,0,60,80.f);
        for(int i=0;i<static_cast<int>(sr*.11);++i)e.next(i==0?.7f:0.f,false);
        require(e.lastGain()>.95f,"kick recovery still waiting for beat length");
        e.reset(sr);e.setSettings(1,2,1,1,-40,0,120,300.f);
        for(int i=0;i<static_cast<int>(sr*.100);++i)e.next(i==0?.7f:0.f,false);
        require(e.lastGain()<.90f,"kick recovery knob does not control duration");
        // SYNC retains phase shift; shift has a different effect in that mode.
        sidechain::Engine gridNormal,gridShift;
        gridNormal.reset(sr);gridShift.reset(sr);
        gridNormal.setSettings(0,2,1,1,-40,0,120,80.f);
        gridShift.setSettings(0,2,1,1,-40,.25f,120,80.f);
        float g1=1.f,g2=1.f;
        for(int i=0;i<static_cast<int>(sr*.1);++i){
            g1=gridNormal.next(0,false,i/sr*2.);
            g2=gridShift.next(0,false,i/sr*2.);
        }
        require(std::abs(g1-g2)>.1f,"SYNC phase shift must still shift rhythmic pumping");
        e.reset(sr);e.setSettings(2,2,1,1,-22,0,120);
        float minMidi=1.f;
        for(int i=0;i<static_cast<int>(sr*.4);++i)
            minMidi=std::min(minMidi,e.next(0,i==20));
        require(minMidi<.1f,"midi trigger missing");
        e.reset(sr);e.setSettings(0,2,0,1,-22,0,120);
        for(int i=0;i<3000;++i)
            require(std::abs(e.next(.8f,false,i/sr*2.)-1.f)<1.e-5f,"zero depth not dry");
        sidechain::LowBand lowBand;lowBand.reset();lowBand.setCutoff(sr,180);
        for(int i=0;i<10000;++i){
            float x=.7f*std::sin(i*.23f);
            require(std::abs(lowBand.process(x,1.f)-x)<1.e-5f,"low-band unity null fail");
        }
    }
    // The scope follows the actual kick transient, and never shows old
    // captures as part of a newly triggered cycle.
    sidechain::KickScope scope;
    scope.reset();
    scope.next(0.f,.9f,.2f,true,true);
    for(int i=1;i<=300;++i)
        scope.next(i/400.f,.9f*std::exp(-i/35.f),.2f+.002f*i,false,true);
    auto view=scope.read();
    require(view.valid,"kick scope missing waveform");
    require(view.kick[0]>.7f,"kick attack peak missing");
    require(view.kick[150]<view.kick[0],"kick tail is not decaying");
    require(view.appliedGain[0]<.3f,"applied gain trace missing");
    const auto oldEpoch=view.generation;
    scope.next(0.f,.7f,.15f,true,true);
    view=scope.read();
    require(view.generation!=oldEpoch,"kick trigger did not reset capture epoch");
    require(view.seen[0] && !view.seen[250],"stale kick waveform leaked across triggers");
    scope.next(.1f,0.f,.5f,false,false);
    view=scope.read();
    require(view.phase>=.99f,"inactive kick scope should park the playhead");
    scope.reset();
    for(int i=0;i<sidechain::KickScope::bins;++i)
        scope.next(static_cast<float>(i)/sidechain::KickScope::bins,.5f,1.f,false,true);
    auto firstCycle=scope.read();
    scope.next(0.f,.8f,.25f,false,true);
    auto nextCycle=scope.read();
    require(nextCycle.generation!=firstCycle.generation,"tempo sync wrap not detected");
    require(!nextCycle.seen[190],"previous cycle leaked");
    std::cout<<"PASS: curves, triggers, tempo, dry bypass, bass-only, onset, phase shift, recovery, live kick scope at 44.1/48/96/192 kHz\n";
    return 0;
}catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<"\n";return 1;}
}
