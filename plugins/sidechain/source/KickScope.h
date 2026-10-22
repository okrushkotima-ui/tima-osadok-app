#pragma once
#include <algorithm>
#include <array>
#include <atomic>
#include <cmath>
#include <cstdint>

// Single producer: audio callback. Single consumer: JUCE GUI timer.
// Fixed-size bins, no locks, allocation, or file access on the audio thread.
// Each bin carries an epoch tag, so beginning a new kick never requires clearing
// the entire scope array on the real-time thread.
namespace sidechain {
class KickScope {
public:
    static constexpr int bins=384;
    struct Snapshot {
        std::array<float,bins> kick{};
        std::array<float,bins> appliedGain{};
        std::array<bool,bins> seen{};
        float phase=0.f;
        unsigned int generation=0;
        bool valid=false;
    };
    void reset() {
        writerEpoch=1;lastBin=-1;prevPhase=0.f;peak=0.f;lastGain=1.f;
        playhead.store(0.f,std::memory_order_relaxed);
        epoch.store(writerEpoch,std::memory_order_release);
    }
    void next(float cyclePhase,float inputKick,float actualGain,bool newTrigger,bool isActive) {
        if(!isActive){
            flushBin();
            lastBin=-1;
            playhead.store(1.f,std::memory_order_relaxed);
            return;
        }
        cyclePhase=std::clamp(cyclePhase,0.f,1.f);
        if(newTrigger || (lastBin>=0 && prevPhase>.55f && cyclePhase<.15f)){
            flushBin();
            ++writerEpoch;
            if(writerEpoch==0)writerEpoch=1;
            lastBin=-1;
            peak=0.f;
            epoch.store(writerEpoch,std::memory_order_release);
        }
        prevPhase=cyclePhase;
        const int bin=std::clamp(static_cast<int>(cyclePhase*bins),0,bins-1);
        if(lastBin!=bin){
            flushBin();
            lastBin=bin;
            peak=0.f;
        }
        peak=std::max(peak,std::clamp(std::abs(inputKick),0.f,8.f));
        lastGain=std::clamp(actualGain,0.f,1.f);
        // Share the current bin too: the waveform reacts immediately to a kick
        // even before the next bin has elapsed.
        storeBin(bin);
        playhead.store(cyclePhase,std::memory_order_relaxed);
    }
    Snapshot read() const {
        Snapshot s;
        s.generation=epoch.load(std::memory_order_acquire);
        s.phase=playhead.load(std::memory_order_relaxed);
        for(int i=0;i<bins;++i){
            const auto packed=signal[static_cast<size_t>(i)].load(std::memory_order_acquire);
            if(static_cast<unsigned int>(packed>>32)!=s.generation)continue;
            s.seen[static_cast<size_t>(i)]=true;
            s.kick[static_cast<size_t>(i)]=static_cast<float>(packed&0xffffu)/65535.f*8.f;
            s.appliedGain[static_cast<size_t>(i)]=static_cast<float>((packed>>16)&0xffffu)/65535.f;
            s.valid=true;
        }
        return s;
    }
private:
    void storeBin(int bin) {
        if(bin<0)return;
        const auto k=static_cast<std::uint64_t>(std::lround(std::min(8.f,peak)/8.f*65535.f));
        const auto g=static_cast<std::uint64_t>(std::lround(lastGain*65535.f));
        signal[static_cast<size_t>(bin)].store((static_cast<std::uint64_t>(writerEpoch)<<32)|(g<<16)|k,
                                               std::memory_order_release);
    }
    void flushBin(){if(lastBin>=0)storeBin(lastBin);}
    std::array<std::atomic<std::uint64_t>,bins> signal{};
    std::atomic<unsigned int> epoch{1};
    std::atomic<float> playhead{0.f};
    unsigned int writerEpoch=1;
    int lastBin=-1;
    float prevPhase=0.f,peak=0.f,lastGain=1.f;
};
} // namespace sidechain
