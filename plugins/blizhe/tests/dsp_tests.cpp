#include "VocalEngine.h"
#include <iostream>
#include <random>
#include <stdexcept>
void check(bool b,const char* msg){if(!b)throw std::runtime_error(msg);}
int main(){try{
for(double sr:{44100.,48000.,96000.})for(int channels:{1,2}){
    blizhe::VocalEngine e;e.setAmount(0);e.prepare(sr,channels);
    std::mt19937 rng(42);std::uniform_real_distribution<float> rand(-.8f,.8f);
    for(int i=0;i<20000;++i){float l=rand(rng),r=channels==2?rand(rng):l,ol=l,orr=r;e.process(l,r,0,false);check(l==ol&&r==orr,"zero amount must be exact passthrough");}
    e.setAmount(1);e.prepare(sr,channels);
    for(int i=0;i<20000;++i){float l=0,r=0;e.process(l,r,.8f,true);check(l==0&&r==0,"silent vocal must stay silent with loud sidechain");}
    e.setAmount(1);e.prepare(sr,channels);double sumIn=0,sumOut=0;
    for(int i=0;i<static_cast<int>(sr*4);++i){float input=.18f*std::sin(static_cast<float>(2*blizhe::pi*200*i/sr));float l=input,r=input;e.process(l,r,.4f,true);check(std::isfinite(l)&&std::isfinite(r),"finite output");check(std::abs(l-r)<1.e-6f,"equal stereo channels must remain equal");if(i>sr*2){sumIn+=input*input;sumOut+=l*l;}}
    const double ratio=std::sqrt(sumOut/sumIn);check(ratio>.6&&ratio<1.5,"gain compensation must remain bounded");
    e.prepare(sr,channels);for(int i=0;i<50000;++i){float l=rand(rng)*4,r=rand(rng)*4;e.setAmount(2*(i%1500)/1499.f-1);e.process(l,r,rand(rng),true);check(std::isfinite(l)&&std::abs(l)<10,"stress output must remain bounded");}
}
blizhe::VocalEngine a,b;a.setAmount(.5f);b.setAmount(.5f);a.prepare(96000,1);b.prepare(96000,1);double delta=0;for(int i=0;i<96000;++i){float l=.1f*std::sin(i*.06f),r=l,x=l,y=l;a.process(l,r,0,false);b.process(x,y,.6f,true);delta+=std::abs(l-x);}check(delta>1,"beat sidechain should influence processing");
// Negative amounts must change timbre, preserve silence and remain stable.
for(double sr:{44100.,48000.,96000.})for(int ch:{1,2}){
 blizhe::VocalEngine far;far.setAmount(-1);far.prepare(sr,ch);
 for(int i=0;i<10000;++i){float l=0,r=0;far.process(l,r,.8f,true);check(l==0&&r==0,"negative silence");}
 double low=0,high=0;
 for(int band=0;band<2;++band){far.prepare(sr,ch);double energy=0;for(int i=0;i<sr;++i){float l=.1f*std::sin(2*blizhe::pi*(band?4000:200)*i/sr),r=l;far.process(l,r,0,false);check(std::isfinite(l)&&std::abs(l)<1,"negative output bounded");check(l==r,"negative stereo linked");if(i>sr/2)energy+=l*l;}if(band)high=energy;else low=energy;}
 check(high<low*.8,"distance must reduce presence, not only overall volume");
 far.setAmount(0);for(int i=0;i<sr*2;++i){float l=.1f,r=l;far.process(l,r,0,false);if(i>sr*1.9)check(std::abs(l-.1f)<1e-6,"return to centre");}
}
std::cout<<"PASS: bipolar distance, centre return,  mono/stereo, 44.1/48/96 kHz, zero passthrough, silence, gain matching, automation stress, sidechain\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<"\n";return 1;}}
