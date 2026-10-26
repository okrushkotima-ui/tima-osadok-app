#include "SidechainEngine.h"
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
    std::cout<<"PASS: curves, triggers, tempo, dry bypass, bass-only at 44.1/48/96/192 kHz\n";
    return 0;
}catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<"\n";return 1;}
}
