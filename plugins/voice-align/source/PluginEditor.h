#pragma once
#include "PluginProcessor.h"
#include "AlignmentEngine.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
class SyncEditor final : public juce::AudioProcessorEditor,public juce::FileDragAndDropTarget {
public:
    explicit SyncEditor(SyncProcessor&);
    ~SyncEditor() override=default;
    void paint(juce::Graphics&) override;
    void resized() override;
    bool isInterestedInFileDrag(const juce::StringArray&) override;
    void filesDropped(const juce::StringArray&,int,int) override;
private:
    struct Track{juce::File source;synchro::Audio audio;};
    SyncProcessor &processor;
    juce::TextButton chooseLead{"CHOOSE LEAD WAV"},addBack{"ADD BACK WAV"},
                     timing{"1  ALIGN TIMING"},pitch{"2  TUNE NOTES"},exportButton{"EXPORT WAV"};
    juce::Label status;
    juce::AudioFormatManager formats;
    std::unique_ptr<juce::FileChooser> chooser;
    std::unique_ptr<Track> reference;
    std::vector<Track> backups;
    std::vector<synchro::Audio> rendered;
    bool hasTiming=false,hasPitch=false;
    void selectFiles(bool lead);
    void loadFiles(const juce::StringArray&,bool lead);
    bool readTrack(const juce::File&,Track&,juce::String&);
    void alignAll();
    void tuneAll();
    void exportWavs(const juce::File& folder);
    void info(juce::String message);
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SyncEditor)
};
