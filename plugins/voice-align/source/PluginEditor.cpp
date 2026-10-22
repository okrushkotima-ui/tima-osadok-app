#include "PluginEditor.h"
#include <cmath>

namespace {
const juce::Colour gold(0xffdfb77e),green(0xff80bd9e),ink(0xff14181d),muted(0xff9ea6ad);
juce::String display(const juce::File &f){return f.getFileNameWithoutExtension().substring(0,55);}
}

SyncEditor::SyncEditor(SyncProcessor &p):AudioProcessorEditor(&p),processor(p){
    formats.registerBasicFormats();
    setSize(920,630);setResizable(false,false);
    auto style=[this](juce::TextButton &button,bool primary){
        button.setColour(juce::TextButton::buttonColourId,primary?juce::Colour(0xffba9160):juce::Colour(0xff303640));
        button.setColour(juce::TextButton::textColourOffId,primary?ink:juce::Colour(0xfff0eae2));
        button.setMouseCursor(juce::MouseCursor::PointingHandCursor);
        addAndMakeVisible(button);
    };
    style(chooseLead,false);style(addBack,false);style(timing,true);style(pitch,false);style(exportButton,false);
    addAndMakeVisible(status);status.setColour(juce::Label::textColourId,muted);
    status.setFont(juce::Font(14.f));status.setJustificationType(juce::Justification::centredLeft);
    chooseLead.onClick=[this]{selectFiles(true);};
    addBack.onClick=[this]{selectFiles(false);};
    timing.onClick=[this]{alignAll();};
    pitch.onClick=[this]{tuneAll();};
    exportButton.onClick=[this]{
        if(rendered.empty()){info(juce::String::fromUTF8("Сначала нажми ALIGN TIMING"));return;}
        chooser=std::make_unique<juce::FileChooser>(juce::String::fromUTF8("Папка для синхронизированных WAV"),juce::File(),juce::String());
        juce::Component::SafePointer<SyncEditor> safe(this);
        chooser->launchAsync(juce::FileBrowserComponent::openMode|juce::FileBrowserComponent::canSelectDirectories,
            [safe](const juce::FileChooser &fc){if(safe){auto folder=fc.getResult();if(folder.isDirectory())safe->exportWavs(folder);}});
    };
    info(juce::String::fromUTF8("Перетащи лид в верхнюю область, бэки — в нижнюю. WAV файлы должны начинаться от одной точки."));
}

void SyncEditor::resized(){
    chooseLead.setBounds(690,126,192,36);
    addBack.setBounds(690,269,192,36);
    timing.setBounds(30,517,260,50);
    pitch.setBounds(307,517,260,50);
    exportButton.setBounds(584,517,306,50);
    status.setBounds(30,581,850,37);
}
void SyncEditor::paint(juce::Graphics &g){
    g.fillAll(ink);
    g.setGradientFill(juce::ColourGradient(juce::Colour(0xff242a32),0,0,ink,920,620,false));g.fillAll();
    g.setColour(juce::Colour(0xffeee8dc));g.setFont(juce::Font(36.f,juce::Font::bold));
    g.drawText(juce::String::fromUTF8("Синхрон"),30,25,360,49,juce::Justification::centredLeft);
    g.setColour(gold);g.setFont(juce::Font(14.f));
    g.drawText(juce::String::fromUTF8("by тима осадок"),696,38,190,28,juce::Justification::centredRight);
    g.setColour(muted);g.setFont(juce::Font(12.f));
    g.drawText("VOCAL STACK  /  OFFLINE ALIGNMENT  /  BETA 0.1",31,75,800,22,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff303741));g.drawHorizontalLine(101,27,894);
    auto panel=[&](juce::Rectangle<int> area,juce::Colour border){
        g.setColour(juce::Colour(0xff20262d));g.fillRoundedRectangle(area.toFloat(),10);
        g.setColour(border);g.drawRoundedRectangle(area.toFloat(),10,1.5f);
    };
    panel({27,119,866,118},reference?gold:juce::Colour(0xff46505a));
    panel({27,248,866,257},backups.empty()?juce::Colour(0xff46505a):green);
    g.setColour(gold);g.setFont(juce::Font(12.f,juce::Font::bold));
    g.drawText("LEAD   /   REFERENCE",48,132,400,24,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xffebe5da));g.setFont(juce::Font(18.f));
    g.drawText(reference?display(reference->source):juce::String::fromUTF8("Перетащи лид сюда ↓"),48,163,618,47,juce::Justification::centredLeft);
    g.setColour(green);g.setFont(juce::Font(12.f,juce::Font::bold));
    g.drawText("BACKS / DOUBLES",48,261,410,22,juce::Justification::centredLeft);
    g.setColour(muted);g.setFont(juce::Font(12.f));
    if(backups.empty())g.drawText(juce::String::fromUTF8("Перетащи сюда до 8 бэков или даблов (WAV/AIFF)"),49,313,570,28,juce::Justification::centredLeft);
    for(size_t i=0;i<backups.size();++i){
        auto y=298+static_cast<int>(i)*24;
        g.setColour(juce::Colour(0xffc6cfce));g.setFont(juce::Font(12.f));
        g.drawText(juce::String(static_cast<int>(i+1))+"  "+display(backups[i].source),49,y,580,20,juce::Justification::centredLeft);
        if(i<rendered.size()){
            g.setColour(i<rendered.size()?green:muted);
            g.drawText(hasPitch?juce::String::fromUTF8("TIMED + TUNED"):juce::String::fromUTF8("TIMED"),667,y,190,20,juce::Justification::centredRight);
        }
    }
    g.setColour(muted);g.setFont(juce::Font(11.f));
    g.drawText(juce::String::fromUTF8("1 — Тайминг слогов     2 — Ноты отдельно, сохранение терций     3 — Экспорт отдельных дорожек"),30,490,860,21,juce::Justification::centredLeft);
}

bool SyncEditor::isInterestedInFileDrag(const juce::StringArray &files){
    for(const auto &f:files)
        if(juce::File(f).hasFileExtension("wav;aif;aiff"))return true;
    return false;
}
void SyncEditor::filesDropped(const juce::StringArray &files,int,int y){
    loadFiles(files,y<247);
}
void SyncEditor::selectFiles(bool lead){
    chooser=std::make_unique<juce::FileChooser>(lead?juce::String::fromUTF8("Выбери лид"):juce::String::fromUTF8("Выбери бэки"),juce::File(),"*.wav;*.aif;*.aiff");
    juce::Component::SafePointer<SyncEditor> safe(this);
    chooser->launchAsync(juce::FileBrowserComponent::openMode|juce::FileBrowserComponent::canSelectFiles|
                             (lead?0:juce::FileBrowserComponent::canSelectMultipleItems),
        [safe,lead](const juce::FileChooser &fc){
            if(!safe)return;
            juce::StringArray names;for(auto &f:fc.getResults())names.add(f.getFullPathName());
            if(names.size())safe->loadFiles(names,lead);
        });
}
bool SyncEditor::readTrack(const juce::File &file,Track &track,juce::String &error){
    if(!file.existsAsFile()||!file.hasFileExtension("wav;aif;aiff")){error="WAV/AIFF only";return false;}
    auto reader=std::unique_ptr<juce::AudioFormatReader>(formats.createReaderFor(file));
    if(!reader){error="Can't decode "+file.getFileName();return false;}
    if(reader->numChannels<1 || reader->numChannels>2 || reader->lengthInSamples<=0 ||reader->lengthInSamples>reader->sampleRate*120){
        error="1-2 channels and <=120 seconds per file";return false;
    }
    if(reference&&std::abs(reference->audio.rate-reader->sampleRate)>1){
        error="Sample rate differs from the LEAD";return false;
    }
    if(reader->lengthInSamples>std::numeric_limits<int>::max()){error="File too large";return false;}
    juce::AudioBuffer<float> audio(static_cast<int>(reader->numChannels),static_cast<int>(reader->lengthInSamples));
    if(!reader->read(&audio,0,audio.getNumSamples(),0,true,true)){error="Cannot read audio";return false;}
    track.source=file;track.audio.rate=reader->sampleRate;track.audio.channels.resize(static_cast<size_t>(audio.getNumChannels()));
    for(int ch=0;ch<audio.getNumChannels();++ch)
        track.audio.channels[static_cast<size_t>(ch)].assign(audio.getReadPointer(ch),audio.getReadPointer(ch)+audio.getNumSamples());
    return true;
}
void SyncEditor::loadFiles(const juce::StringArray &files,bool lead){
    int loaded=0;juce::String error;
    for(const auto &path:files){
        if(!lead&&backups.size()>=8){error="Maximum eight backing tracks";break;}
        Track track;
        if(!readTrack(juce::File(path),track,error))continue;
        if(lead){
            reference=std::make_unique<Track>(std::move(track));backups.clear();
            lead=false;
        }else{
            if(!reference){error="Load LEAD first";break;}
            backups.push_back(std::move(track));
        }
        ++loaded;
    }
    rendered.clear();hasTiming=hasPitch=false;
    info(loaded?juce::String::fromUTF8("Загружено дорожек: ")+juce::String(loaded)+(error.isNotEmpty()?" · "+error:""):error);
    repaint();
}
void SyncEditor::alignAll(){
    if(!reference||backups.empty()){info(juce::String::fromUTF8("Нужны лид и хотя бы один бэк"));return;}
    rendered.clear();hasPitch=hasTiming=false;
    try {
        for(const auto &track:backups)rendered.push_back(synchro::alignTiming(reference->audio,track.audio));
        hasTiming=true;info(juce::String::fromUTF8("Тайминг обработан для ")+juce::String(static_cast<int>(rendered.size()))+juce::String::fromUTF8(" дорожек. Тюнинг отключён."));
    }catch(const std::exception &e){rendered.clear();info("Timing error: "+juce::String(e.what()));}
    repaint();
}
void SyncEditor::tuneAll(){
    if(!reference||!hasTiming||rendered.empty()){info(juce::String::fromUTF8("Сначала ALIGN TIMING"));return;}
    try {
        for(auto &audio:rendered)audio=synchro::tuneHarmony(reference->audio,audio);
        hasPitch=true;info(juce::String::fromUTF8("Интонация подровнена, гармонические интервалы сохранены в пределах точности определения нот."));
    }catch(const std::exception &e){info("Tuning error: "+juce::String(e.what()));}
    repaint();
}
void SyncEditor::exportWavs(const juce::File &folder){
    if(!folder.isDirectory()||!hasTiming)return;
    juce::WavAudioFormat wav;int done=0;
    for(size_t i=0;i<rendered.size();++i){
        auto &a=rendered[i];
        auto name=backups[i].source.getFileNameWithoutExtension()+"_SYNCHRON_"+(hasPitch?"timed_tuned":"timed")+".wav";
        auto file=folder.getChildFile(name).getNonexistentSibling(false);
        auto stream=std::unique_ptr<juce::FileOutputStream>(file.createOutputStream());
        if(!stream||stream->failedToOpen())continue;
        auto writer=std::unique_ptr<juce::AudioFormatWriter>(wav.createWriterFor(stream.get(),a.rate,static_cast<unsigned int>(a.channels.size()),24,{},0));
        if(!writer)continue;
        stream.release();
        const auto count=static_cast<int>(a.samples());
        juce::AudioBuffer<float> buffer(static_cast<int>(a.channels.size()),count);
        for(int c=0;c<buffer.getNumChannels();++c)buffer.copyFrom(c,0,a.channels[static_cast<size_t>(c)].data(),count);
        if(writer->writeFromAudioSampleBuffer(buffer,0,count))++done;
    }
    info(juce::String::fromUTF8("Экспортировано WAV: ")+juce::String(done)+"/"+juce::String(static_cast<int>(rendered.size())));
}
void SyncEditor::info(juce::String message){status.setText(message,juce::dontSendNotification);}
