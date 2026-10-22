#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <numeric>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>
#include "signalsmith-stretch.h"

namespace synchro {
constexpr double pi=3.14159265358979323846;
using Channel=std::vector<float>;
struct Audio {
    double rate=48000;
    std::vector<Channel> channels;
    int64_t samples() const { return channels.empty()?0:static_cast<int64_t>(channels[0].size()); }
    bool valid() const {return rate>=8000 && !channels.empty() && channels.size()<=2 && samples()>0;}
};
struct Features {std::vector<float> energy,onset; int hop=480;};
inline Features analyse(const Audio &a) {
    Features f;f.hop=std::max(64,static_cast<int>(std::lround(a.rate*.010)));
    if(!a.valid()) return f;
    const int64_t count=(a.samples()+f.hop-1)/f.hop;
    f.energy.resize(static_cast<size_t>(count));f.onset.resize(static_cast<size_t>(count));
    for(int64_t i=0;i<count;++i) {
        double e=0;const auto from=i*f.hop,to=std::min<int64_t>(a.samples(),from+f.hop);
        for(int64_t s=from;s<to;++s) {
            float sample=0;
            for(auto &ch:a.channels) sample+=ch[static_cast<size_t>(s)];
            sample/=static_cast<float>(a.channels.size());e+=sample*sample;
        }
        f.energy[static_cast<size_t>(i)]=static_cast<float>(std::sqrt(e/std::max<int64_t>(1,to-from)));
    }
    auto maximum=*std::max_element(f.energy.begin(),f.energy.end());
    const auto inv=1.f/std::max(maximum,1.e-5f);
    for(auto &x:f.energy)x=std::sqrt(x*inv);
    for(size_t i=1;i<f.energy.size();++i) f.onset[i]=std::max(0.f,f.energy[i]-f.energy[i-1]);
    float peak=0;for(float x:f.onset)peak=std::max(peak,x);
    for(auto &x:f.onset)x/=std::max(peak,1.e-4f);
    return f;
}

// Band-limited dynamic time warping. The reference timeline is kept fixed.
inline std::vector<float> estimateMap(const Features &lead,const Features &back) {
    const int n=static_cast<int>(lead.energy.size()),m=static_cast<int>(back.energy.size());
    if(n<2||m<2) return std::vector<float>(std::max(1,n),0);
    const int band=std::max(90,std::abs(m-n)+45); // at least 900 ms search radius
    struct Row {int lo=0;std::vector<float> cost;std::vector<uint8_t> parent;};
    std::vector<Row> history(static_cast<size_t>(n));
    const float inf=std::numeric_limits<float>::infinity();
    for(int i=0;i<n;++i){
        Row row;const int center=static_cast<int>(static_cast<double>(i)*(m-1)/(n-1));
        row.lo=std::max(0,center-band);const int hi=std::min(m-1,center+band);
        row.cost.assign(static_cast<size_t>(hi-row.lo+1),inf);
        row.parent.assign(row.cost.size(),3);
        for(int j=row.lo;j<=hi;++j){
            const int k=j-row.lo;
            const float energyDifference=std::abs(lead.energy[i]-back.energy[j]);
            const float onsetDifference=std::abs(lead.onset[i]-back.onset[j]);
            const float mismatch=energyDifference*.45f+onsetDifference*.55f;
            float best=inf;uint8_t direction=3;
            if(i==0) {best=.025f*j;direction=3;}
            if(i>0){
                const auto &prev=history[static_cast<size_t>(i-1)];
                if(j>=prev.lo && j<prev.lo+static_cast<int>(prev.cost.size()) && prev.cost[static_cast<size_t>(j-prev.lo)]+.035f<best){
                    best=prev.cost[static_cast<size_t>(j-prev.lo)]+.035f;direction=1;
                }
                if(j-1>=prev.lo && j-1<prev.lo+static_cast<int>(prev.cost.size()) && prev.cost[static_cast<size_t>(j-1-prev.lo)]<best){
                    best=prev.cost[static_cast<size_t>(j-1-prev.lo)];direction=0;
                }
            }
            if(k>0 && row.cost[static_cast<size_t>(k-1)]+.035f<best){
                best=row.cost[static_cast<size_t>(k-1)]+.035f;direction=2;
            }
            row.cost[static_cast<size_t>(k)]=best+mismatch;row.parent[static_cast<size_t>(k)]=direction;
        }
        history[static_cast<size_t>(i)]=std::move(row);
    }
    const auto &last=history.back();
    float minCost=inf;int end=last.lo;
    for(int k=0;k<static_cast<int>(last.cost.size());++k) {
        const float cost=last.cost[k]+.025f*std::abs(m-1-(k+last.lo));
        if(cost<minCost){minCost=cost;end=last.lo+k;}
    }
    std::vector<float> raw(static_cast<size_t>(n),-1);
    int i=n-1,j=end;
    while(i>=0) {
        const auto &r=history[static_cast<size_t>(i)];
        if(j<r.lo || j>=r.lo+static_cast<int>(r.parent.size()))break;
        if(raw[static_cast<size_t>(i)]<0) raw[static_cast<size_t>(i)]=static_cast<float>(j);
        const auto dir=r.parent[static_cast<size_t>(j-r.lo)];
        if(dir==0) {--i;--j;}
        else if(dir==1) {--i;}
        else if(dir==2) {--j;}
        else break;
    }
    for(int k=1;k<n;++k) if(raw[k]<0)raw[k]=raw[k-1];
    if(raw[0]<0)raw[0]=0;
    std::vector<float> mapping(raw.size());
    for(int k=0;k<n;++k){
        double acc=0;int total=0;
        for(int x=std::max(0,k-3);x<=std::min(n-1,k+3);++x){acc+=raw[x];++total;}
        mapping[k]=static_cast<float>(acc/total);
    }
    // Protect against violent syllable warps. Slower/faster limited to 0.6..1.6x.
    for(int k=1;k<n;++k) mapping[k]=std::clamp(mapping[k],mapping[k-1]+.60f,mapping[k-1]+1.60f);
    return mapping;
}

inline double mappedSample(const std::vector<float> &mapping,double sample,int hop) {
    if(mapping.empty())return sample;
    double frame=std::clamp(sample/std::max(1,hop),0.0,static_cast<double>(mapping.size()-1));
    auto index=static_cast<size_t>(frame);
    auto next=std::min(index+1,mapping.size()-1);
    return (mapping[index]+(frame-index)*(mapping[next]-mapping[index]))*hop;
}

inline Audio alignTiming(const Audio &lead,const Audio &back) {
    if(!lead.valid()||!back.valid()||std::abs(lead.rate-back.rate)>1)throw std::runtime_error("Please use the same sample rate");
    if(lead.samples()>lead.rate*120 || back.samples()>back.rate*120)throw std::runtime_error("120 second maximum per WAV in beta");
    auto a=analyse(lead),b=analyse(back);
    const auto mapping=estimateMap(a,b);
    Audio out;out.rate=lead.rate;out.channels.assign(back.channels.size(),Channel(static_cast<size_t>(lead.samples()),0.f));
    signalsmith::stretch::SignalsmithStretch<float> stretch;
    const int ch=static_cast<int>(back.channels.size());
    stretch.presetDefault(ch,lead.rate);
    const int inLatency=stretch.inputLatency(),outLatency=stretch.outputLatency();
    const int64_t start=std::clamp<int64_t>(static_cast<int64_t>(std::llround(mappedSample(mapping,0,a.hop))),0,back.samples());
    auto at=[&](int64_t sample,int channel)->float {
        if(sample<0||sample>=back.samples())return 0.f;
        return back.channels[static_cast<size_t>(channel)][static_cast<size_t>(sample)];
    };
    std::vector<Channel> pre(static_cast<size_t>(ch),Channel(static_cast<size_t>(std::max(1,inLatency))));
    std::vector<float*> prePtrs(static_cast<size_t>(ch));
    for(int c=0;c<ch;++c){
        for(int i=0;i<inLatency;++i)pre[c][static_cast<size_t>(i)]=at(start+i,c);
        prePtrs[c]=pre[c].data();
    }
    if(inLatency>0)stretch.seek(prePtrs.data(),inLatency,1.0);
    int64_t cursor=start+inLatency;
    const int64_t total=out.samples()+outLatency;
    for(int64_t position=0;position<total;position+=512){
        const int chunk=static_cast<int>(std::min<int64_t>(512,total-position));
        const int64_t nextTime=std::max<int64_t>(0,position+chunk-outLatency);
        const int64_t wanted=static_cast<int64_t>(std::llround(mappedSample(mapping,static_cast<double>(nextTime),a.hop)))+inLatency;
        const int incoming=static_cast<int>(std::clamp<int64_t>(wanted-cursor,0,4096));
        std::vector<Channel> input(static_cast<size_t>(ch),Channel(static_cast<size_t>(std::max(1,incoming))));
        std::vector<Channel> output(static_cast<size_t>(ch),Channel(static_cast<size_t>(chunk)));
        std::vector<float*> inputPtrs(static_cast<size_t>(ch)),outputPtrs(static_cast<size_t>(ch));
        for(int c=0;c<ch;++c){
            for(int s=0;s<incoming;++s)input[c][static_cast<size_t>(s)]=at(cursor+s,c);
            inputPtrs[c]=input[c].data();outputPtrs[c]=output[c].data();
        }
        stretch.process(inputPtrs.data(),incoming,outputPtrs.data(),chunk);
        cursor+=incoming;
        for(int s=0;s<chunk;++s){
            const int64_t dest=position+s-outLatency;
            if(dest>=0 && dest<out.samples())for(int c=0;c<ch;++c)
                out.channels[static_cast<size_t>(c)][static_cast<size_t>(dest)]=output[c][static_cast<size_t>(s)];
        }
    }
    return out;
}

// Lightweight voiced-pitch estimator. Confidence rejects silence/unvoiced frames.
// This is a classical autocorrelation estimate, not a trained neural network.
inline double pitchHz(const Audio &a,int64_t sample) {
    if(!a.valid())return 0;
    const int decimation=std::max(1,static_cast<int>(std::round(a.rate/8000)));
    const double rate=a.rate/decimation;
    const int window=std::max(180,static_cast<int>(std::round(rate*.060)));
    const int minLag=std::max(2,static_cast<int>(rate/750)),maxLag=std::min(window/2,static_cast<int>(rate/75));
    std::vector<double> v(static_cast<size_t>(window),0);
    double power=0;
    for(int i=0;i<window;++i){
        int64_t pos=sample+(i-window/2)*decimation;
        if(pos>=0 && pos<a.samples()){
            for(const auto &ch:a.channels)v[static_cast<size_t>(i)]+=ch[static_cast<size_t>(pos)]/static_cast<double>(a.channels.size());
        }
        power+=v[static_cast<size_t>(i)]*v[static_cast<size_t>(i)];
    }
    if(power/window<1.e-6)return 0;
    double bestScore=0;int bestLag=0;
    for(int lag=minLag;lag<=maxLag;++lag){
        double dot=0,p1=0,p2=0;
        for(int i=0;i<window-lag;++i){
            const auto x=v[static_cast<size_t>(i)],y=v[static_cast<size_t>(i+lag)];
            dot+=x*y;p1+=x*x;p2+=y*y;
        }
        const double score=dot/std::sqrt(std::max(1.e-12,p1*p2));
        if(score>bestScore){bestScore=score;bestLag=lag;}
    }
    return bestScore>.70 && bestLag>0?rate/bestLag:0;
}

// Relative correction: do not force a third/fifth/harmony onto the lead pitch.
// Correct *only* deviation from the nearest integer semitone interval.
inline double relativeCorrectionSemitones(double leadHz,double backHz) {
    if(leadHz<=0||backHz<=0)return 0;
    const double distance=12*std::log2(backHz/leadHz);
    const double nearest=std::round(distance);
    return std::clamp(nearest-distance,-.35,.35); // +-35 cents safety cap
}

inline Audio tuneHarmony(const Audio &lead,const Audio &aligned) {
    if(!lead.valid()||!aligned.valid()||std::abs(lead.rate-aligned.rate)>1)
        throw std::runtime_error("Sample rates must match");
    Audio result=aligned;
    const int channels=static_cast<int>(aligned.channels.size());
    signalsmith::stretch::SignalsmithStretch<float> stretch;
    stretch.presetDefault(channels,aligned.rate);
    const int inLatency=stretch.inputLatency(),outLatency=stretch.outputLatency();
    const int64_t total=aligned.samples()+outLatency;
    auto at=[&](int64_t sample,int ch)->float{
        if(sample<0||sample>=aligned.samples())return 0;
        return aligned.channels[static_cast<size_t>(ch)][static_cast<size_t>(sample)];
    };
    std::vector<Channel> pre(static_cast<size_t>(channels),Channel(static_cast<size_t>(std::max(1,inLatency))));
    std::vector<float*> prePtrs(static_cast<size_t>(channels));
    for(int c=0;c<channels;++c){
        for(int i=0;i<inLatency;++i)pre[c][static_cast<size_t>(i)]=at(i,c);
        prePtrs[c]=pre[c].data();
    }
    if(inLatency>0)stretch.seek(prePtrs.data(),inLatency,1.0);
    int64_t cursor=inLatency;
    double previous=0;
    for(int64_t position=0;position<total;position+=512){
        const int count=static_cast<int>(std::min<int64_t>(512,total-position));
        const int64_t timestamp=std::max<int64_t>(0,position-outLatency);
        const double a=pitchHz(lead,timestamp),b=pitchHz(aligned,timestamp);
        const double intended=relativeCorrectionSemitones(a,b);
        previous=.65*previous+.35*intended;
        stretch.setTransposeSemitones(previous);
        std::vector<Channel> input(static_cast<size_t>(channels),Channel(static_cast<size_t>(count)));
        std::vector<Channel> output(static_cast<size_t>(channels),Channel(static_cast<size_t>(count)));
        std::vector<float*> inputPtrs(static_cast<size_t>(channels)),outPtrs(static_cast<size_t>(channels));
        for(int c=0;c<channels;++c){
            for(int s=0;s<count;++s)input[c][static_cast<size_t>(s)]=at(cursor+s,c);
            inputPtrs[c]=input[c].data();outPtrs[c]=output[c].data();
        }
        stretch.process(inputPtrs.data(),count,outPtrs.data(),count);
        cursor+=count;
        for(int s=0;s<count;++s){
            const int64_t dest=position+s-outLatency;
            if(dest>=0&&dest<result.samples()) for(int c=0;c<channels;++c)
                result.channels[static_cast<size_t>(c)][static_cast<size_t>(dest)]=output[c][static_cast<size_t>(s)];
        }
    }
    return result;
}
} // namespace synchro
