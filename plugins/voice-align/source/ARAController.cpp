#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <map>
#include <memory>
#include <cmath>
#include <mutex>
#include <vector>
#include <algorithm>

// Experimental ARA2 bridge: reads Studio One Event FX audio directly from the
// host-provided ARA model. Never reaches into the DAW's private project files.
namespace {
class HostPlayback final:public juce::ARAPlaybackRenderer {
public:
    explicit HostPlayback(ARA::PlugIn::DocumentController *dc)
      : juce::ARAPlaybackRenderer(dc),readThread("Synchron ARA Reader") {
        readThread.startThread();
    }
    ~HostPlayback() override {
        readers.clear();
        readThread.stopThread(4000);
    }
    void prepareToPlay(double rate,int maxBlock,int channels,
                       juce::AudioProcessor::ProcessingPrecision,
                       AlwaysNonRealtime nonRealtime) override {
        sampleRate=rate;numChannels=channels;
        readers.clear();
        const int bufferAhead=std::max(4*maxBlock,static_cast<int>(rate*2));
        for(auto *region:getPlaybackRegions()){
            auto *source=region->getAudioModification()->getAudioSource();
            if(readers.find(source)!=readers.end())continue;
            auto *raw=new juce::ARAAudioSourceReader(source);
            if(nonRealtime==AlwaysNonRealtime::no)
                readers[source]=std::make_unique<juce::BufferingAudioReader>(raw,readThread,bufferAhead);
            else
                readers[source]=std::unique_ptr<juce::AudioFormatReader>(raw);
        }
    }
    void releaseResources() override {readers.clear();}
    bool processBlock(juce::AudioBuffer<float> &buffer,
                      juce::AudioProcessor::Realtime realtime,
                      const juce::AudioPlayHead::PositionInfo &position) noexcept override {
        // ARA replaces the Event FX signal: render the unmodified source until
        // processing is explicitly integrated with the ARA playback renderer.
        buffer.clear();
        if(!position.getIsPlaying())return true;
        const auto start=position.getTimeInSamples().orFallback(static_cast<juce::int64>(0));
        const auto end=start+buffer.getNumSamples();
        for(auto *region:getPlaybackRegions()){
            auto *source=region->getAudioModification()->getAudioSource();
            if(source->getChannelCount()!=numChannels || std::abs(source->getSampleRate()-sampleRate)>.01)continue;
            auto iterator=readers.find(source);
            if(iterator==readers.end() || !iterator->second)continue;
            auto range=region->getSampleRange(sampleRate,juce::ARAPlaybackRegion::IncludeHeadAndTail::no);
            const auto from=std::max(start,range.getStart()),to=std::min(end,range.getEnd());
            if(to<=from)continue;
            const auto amount=static_cast<int>(to-from);
            const auto destination=static_cast<int>(from-start);
            const auto sourceStart=region->getStartInAudioModificationSamples()+(from-range.getStart());
            if(sourceStart<0 || sourceStart+amount>source->getSampleCount())continue;
            juce::AudioBuffer<float> segment(numChannels,amount);
            if(auto *buffered=dynamic_cast<juce::BufferingAudioReader*>(iterator->second.get()))
                buffered->setReadTimeout(realtime==juce::AudioProcessor::Realtime::no?300:0);
            if(!iterator->second->read(&segment,0,amount,sourceStart,true,true))continue;
            for(int ch=0;ch<numChannels;++ch)buffer.addFrom(ch,destination,segment,ch,0,amount);
        }
        return true;
    }
private:
    juce::TimeSliceThread readThread;
    std::map<juce::ARAAudioSource*,std::unique_ptr<juce::AudioFormatReader>> readers;
    double sampleRate=48000;int numChannels=2;
};

// ARA creates a different plug-in instance for each Studio One Event FX.
// Keep the *live ARA document controllers* discoverable from any editor window,
// so one LEAD instance can read regions attached to other Synchron Event FX.
static std::mutex& registryMutex(){static std::mutex lock;return lock;}
static std::vector<juce::ARADocumentControllerSpecialisation*>& controllers(){
    static std::vector<juce::ARADocumentControllerSpecialisation*> items;
    return items;
}

class HostDocumentController final:public juce::ARADocumentControllerSpecialisation {
public:
    HostDocumentController(const ARA::PlugIn::PlugInEntry* entry,
                           const ARA::ARADocumentControllerHostInstance* host)
        : juce::ARADocumentControllerSpecialisation(entry,host) {
        std::lock_guard<std::mutex> guard(registryMutex());
        controllers().push_back(this);
    }
    ~HostDocumentController() override {
        std::lock_guard<std::mutex> guard(registryMutex());
        auto& all=controllers();
        all.erase(std::remove(all.begin(),all.end(),this),all.end());
    }
protected:
    juce::ARAPlaybackRenderer* doCreatePlaybackRenderer() override {
        return new HostPlayback(getDocumentController());
    }
    juce::ARAEditorRenderer* doCreateEditorRenderer() override {
        return new juce::ARAEditorRenderer(getDocumentController());
    }
    bool doRestoreObjectsFromStream(juce::ARAInputStream&,const juce::ARARestoreObjectsFilter*) override {return true;}
    bool doStoreObjectsToStream(juce::ARAOutputStream&,const juce::ARAStoreObjectsFilter*) override {return true;}
};
}
const ARA::ARAFactory* JUCE_CALLTYPE createARAFactory(){
    return juce::ARADocumentControllerSpecialisation::createARAFactory<HostDocumentController>();
}

// Called from Synchron's GUI/message thread only. Returned pointers must only
// be used synchronously: ARA invalidates them when an Event FX is removed.
// No ARA source access in the real-time audio callback.
void synchronCollectActiveARARegions(std::vector<juce::ARAPlaybackRegion*>& regions) {
    std::lock_guard<std::mutex> guard(registryMutex());
    for(auto *controller:controllers()) {
        if(controller==nullptr)continue;
        if(auto *doc=controller->getDocument())
            for(auto *sequence:doc->getRegionSequences())
                for(auto *region:sequence->getPlaybackRegions())
                    if(region && std::find(regions.begin(),regions.end(),region)==regions.end())
                        regions.push_back(region);
    }
}
