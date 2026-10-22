#pragma once
#include "PluginProcessor.h"
#include "AlignmentEngine.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
class SyncEditor final : public juce::AudioProcessorEditor,public juce::FileDragAndDropTarget,private juce::Timer {
public:
    explicit SyncEditor(SyncProcessor&);
    ~SyncEditor() override=default;
    void paint(juce::Graphics&) override;
    void resized() override;
    bool isInterestedInFileDrag(const juce::StringArray&) override;
    void filesDropped(const juce::StringArray&,int,int) override;
    void fileDragEnter(const juce::StringArray&,int,int) override;
    void fileDragExit(const juce::StringArray&) override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
private:
    struct Track{juce::File source;synchro::Audio audio;juce::String label;double timelineStart=0;uintptr_t hostRegionToken=0;};
    SyncProcessor &processor;
    juce::TextButton chooseLead{"WAV / FILE"},addBack{"WAV / FILE"},
                     hostLead{"FROM STUDIO ONE"},hostBack{"FROM STUDIO ONE"},
                     timing{"1  ALIGN TIMING"},pitch{"2  TUNE NOTES"},exportButton{"EXPORT WAV"};
    juce::Label status;
    juce::AudioFormatManager formats;
    std::unique_ptr<juce::FileChooser> chooser;
    std::unique_ptr<Track> reference;
    std::vector<Track> backups;
    std::vector<synchro::Audio> rendered;
    bool hasTiming=false,hasPitch=false,dragActive=false;
    bool dragIntoLead=false;
    int selectedResult=-1,pressedResult=-1;
    bool externalDragStarted=false;
    juce::Point<int> pressPoint;
    std::vector<juce::File> dragFiles;
    juce::File dragDirectory;
    bool writeResultWav(size_t index,const juce::File& target);
    void prepareDragWavs();
    juce::Rectangle<int> resultRowRect(size_t index) const;
    int resultAt(juce::Point<int> point) const;
    void paintAudioWave(juce::Graphics&,const synchro::Audio*,juce::Rectangle<float>,juce::Colour) const;
    void selectFiles(bool lead);
    void importHostEvents(bool lead);
    void loadFiles(const juce::StringArray&,bool lead);
    bool readTrack(const juce::File&,Track&,juce::String&);
    void alignAll();
    void tuneAll();
    void exportWavs(const juce::File& folder);
    void timerCallback() override;
    void info(juce::String message);
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SyncEditor)
};
