#include "AlignmentEngine.h"
#include <iostream>
#include <stdexcept>
#include <cassert>
static void require(bool good,const char *message){if(!good)throw std::runtime_error(message);}
static synchro::Audio voice(double rate,double latency){
    synchro::Audio a;a.rate=rate;a.channels.assign(1,std::vector<float>(static_cast<size_t>(rate*2.2),0));
    for(double start:{.25,.75,1.25,1.75}){
        auto from=static_cast<int>((start+latency)*rate);
        for(int i=0;i<static_cast<int>(.22*rate);++i){
            int j=from+i;if(j<0||j>=a.samples())continue;
            const auto env=std::sin(synchro::pi*i/(.22*rate));
            a.channels[0][static_cast<size_t>(j)]=static_cast<float>(.24*env*std::sin(2*synchro::pi*220*i/rate));
        }
    }
    return a;
}
int main(){
try{
    require(std::abs(synchro::relativeCorrectionSemitones(220,220*std::pow(2,4./12)))<.001,"perfect thirds must be untouched");
    const auto correction=synchro::relativeCorrectionSemitones(220,220*std::pow(2,4.25/12));
    require(correction<-.24&&correction>-.26,"sharp third should correct 25 cents, not collapse interval");
    require(synchro::relativeCorrectionSemitones(0,333)==0,"unvoiced should be unchanged");
    for(double sr:{44100.,48000.}){
        auto lead=voice(sr,0),back=voice(sr,.12);
        const auto map=synchro::estimateMap(synchro::analyse(lead),synchro::analyse(back));
        require(!map.empty()&&map.size()>100,"timing map");
        for(size_t i=1;i<map.size();++i)require(map[i]>=map[i-1],"non-decreasing timing map");
        auto timed=synchro::alignTiming(lead,back);
        require(timed.samples()==lead.samples(),"timing result same length as lead");
        for(auto s:timed.channels[0])require(std::isfinite(s)&&std::abs(s)<2,"finite timing output");
        require(synchro::pitchHz(lead,static_cast<int64_t>(.36*sr))>175,"detect sung note");
    }
    std::cout<<"PASS: harmony intervals, cents guardrail, voiced F0, monotonic alignment, stretch render WAV length and output bounds\n";
    return 0;
}catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<"\n";return 1;}
}
