#include "PluginEditor.h"
#include <cmath>
// Cross-instance ARA registry: this editor can read clips attached to other Event FX.
void synchronCollectActiveARARegions(std::vector<juce::ARAPlaybackRegion*>& regions);

namespace {
const juce::Colour gold(0xffdfb77e),green(0xff80bd9e),ink(0xff14181d),muted(0xff9ea6ad);
juce::String display(const juce::File &f){return f.getFileNameWithoutExtension().substring(0,55);}
}

SyncEditor::SyncEditor(SyncProcessor &p):AudioProcessorEditor(&p),processor(p){
    formats.registerBasicFormats();
    setSize(1030,730);setResizable(false,false);
    auto style=[this](juce::TextButton &button,bool primary){
        button.setColour(juce::TextButton::buttonColourId,primary?juce::Colour(0xffba9160):juce::Colour(0xff303640));
        button.setColour(juce::TextButton::textColourOffId,primary?ink:juce::Colour(0xfff0eae2));
        button.setMouseCursor(juce::MouseCursor::PointingHandCursor);
        addAndMakeVisible(button);
    };
    style(chooseLead,false);style(addBack,false);style(hostLead,false);style(hostBack,false);style(timing,true);style(pitch,false);style(exportButton,false);
    addAndMakeVisible(status);status.setColour(juce::Label::textColourId,muted);
    status.setFont(juce::Font(14.f));status.setJustificationType(juce::Justification::centredLeft);
    chooseLead.onClick=[this]{selectFiles(true);};
    addBack.onClick=[this]{selectFiles(false);};
    hostLead.onClick=[this]{importHostEvents(true);};
    hostBack.onClick=[this]{importHostEvents(false);};
    hostBack.setButtonText("GET ALL BACKS");
    timing.onClick=[this]{alignAll();};
    pitch.onClick=[this]{tuneAll();};
    exportButton.onClick=[this]{
        if(rendered.empty()){info(juce::String::fromUTF8("Сначала нажми ALIGN TIMING"));return;}
        chooser=std::make_unique<juce::FileChooser>(juce::String::fromUTF8("Папка для синхронизированных WAV"),juce::File(),juce::String());
        juce::Component::SafePointer<SyncEditor> safe(this);
        chooser->launchAsync(juce::FileBrowserComponent::openMode|juce::FileBrowserComponent::canSelectDirectories,
            [safe](const juce::FileChooser &fc){if(safe){auto folder=fc.getResult();if(folder.isDirectory())safe->exportWavs(folder);}});
    };
    dragDirectory=juce::File::getSpecialLocation(juce::File::userDocumentsDirectory)
        .getChildFile("Synchron").getChildFile("Drag Outputs");
    info(juce::String::fromUTF8("LEAD → BACKS → ALIGN TIMING → перетащи готовый RESULT на дорожку Studio One."));
}



void SyncEditor::resized(){
    chooseLead.setBounds(759,154,98,32);
    hostLead.setBounds(864,154,114,32);
    addBack.setBounds(286,297,97,31);
    hostBack.setBounds(390,297,109,31);
    timing.setBounds(35,615,293,49);
    pitch.setBounds(342,615,293,49);
    exportButton.setBounds(650,615,345,49);
    status.setBounds(38,672,948,41);
}
void SyncEditor::paintAudioWave(juce::Graphics &g,const synchro::Audio *audio,juce::Rectangle<float> box,juce::Colour colour) const {
    auto center=box.getCentreY();
    g.setColour(colour.withAlpha(.14f));
    g.drawHorizontalLine(static_cast<int>(center),box.getX(),box.getRight());
    if(audio==nullptr||!audio->valid()||audio->channels.empty())return;
    const auto &samples=audio->channels[0];
    const int64_t length=static_cast<int64_t>(samples.size());
    const int bins=std::max(1,static_cast<int>(box.getWidth()/2.9f));
    for(int x=0;x<bins;++x) {
        const auto first=length*x/bins,last=std::min<int64_t>(length,length*(x+1)/bins);
        const auto stride=std::max<int64_t>(1,(last-first)/48);
        float peak=0;
        for(auto i=first;i<last;i+=stride)peak=std::max(peak,std::abs(samples[static_cast<size_t>(i)]));
        const auto height=std::max(.6f,std::min(1.f,peak*2.4f)*box.getHeight()*.46f);
        const auto width=std::max(1.f,box.getWidth()/bins-1.0f);
        g.setColour(colour.withAlpha(.32f+.61f*std::min(1.f,peak*3.f)));
        g.fillRoundedRectangle(box.getX()+x*box.getWidth()/bins,center-height,width,height*2.f,.7f);
    }
}
juce::Rectangle<int> SyncEditor::resultRowRect(size_t index) const {
    return juce::Rectangle<int>(543,348+static_cast<int>(index)*29,435,26);
}
int SyncEditor::resultAt(juce::Point<int> point) const {
    for(size_t i=0;i<rendered.size();++i)
        if(resultRowRect(i).contains(point))return static_cast<int>(i);
    return -1;
}
void SyncEditor::paint(juce::Graphics &g){
    const juce::Colour surface(0xff1e242a),surfaceDeep(0xff171c21),
                       border(0xff3b454e),paper(0xfff4ecdf),resultBlue(0xff87bed7);
    g.setGradientFill(juce::ColourGradient(juce::Colour(0xff292c31),0,0,juce::Colour(0xff12171c),1030,730,false));
    g.fillAll();
    g.setGradientFill(juce::ColourGradient(gold.withAlpha(.085f),380,28,ink.withAlpha(0.f),440,390,true));
    g.fillEllipse(108,0,620,400);
    g.setGradientFill(juce::ColourGradient(resultBlue.withAlpha(.07f),880,360,ink.withAlpha(0.f),570,600,true));
    g.fillEllipse(480,190,580,450);
    g.setColour(paper);g.setFont(juce::Font(38.f,juce::Font::bold));
    g.drawText(juce::String::fromUTF8("Синхрон"),36,27,340,48,juce::Justification::centredLeft);
    g.setColour(gold);g.setFont(juce::Font(14.f));
    g.drawText(juce::String::fromUTF8("by тима осадок"),769,36,220,28,juce::Justification::centredRight);
    g.setColour(muted);g.setFont(juce::Font(10.6f));
    g.drawText("VOCAL STACK  /  ALL BACKS IN ONE SESSION  /  F5: BROWSER  /  CTRL+F2: FLOAT EDITOR",39,81,900,18,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff39424a));g.drawHorizontalLine(113,35,993);
    auto card=[&](juce::Rectangle<float> rect,juce::Colour stroke){
        g.setColour(juce::Colours::black.withAlpha(.28f));g.fillRoundedRectangle(rect.translated(0,6),14);
        g.setGradientFill(juce::ColourGradient(surface,rect.getTopLeft(),surfaceDeep,rect.getBottomRight(),false));
        g.fillRoundedRectangle(rect,14);
        g.setColour(stroke);g.drawRoundedRectangle(rect,14,1.3f);
    };
    card({35,136,960,130},dragActive&&dragIntoLead?gold:(reference?gold.withAlpha(.7f):border));
    card({35,281,474,306},dragActive&&!dragIntoLead?green:(backups.empty()?border:green.withAlpha(.7f)));
    card({523,281,472,306},rendered.empty()?border:resultBlue.withAlpha(.75f));
    g.setColour(gold);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("01  /  LEAD REFERENCE",56,146,460,24,juce::Justification::centredLeft);
    g.setColour(paper);g.setFont(juce::Font(17.f,juce::Font::bold));
    g.drawFittedText(reference?(reference->label.isNotEmpty()?reference->label:display(reference->source)):
                      juce::String::fromUTF8("Перетащи лид сюда  ↘"),
                      56,175,565,25,juce::Justification::centredLeft,1);
    g.setColour(muted);g.setFont(juce::Font(11.f));
    g.drawText(reference?juce::String::fromUTF8("Ориентир  /  оригинал не изменяется"):
                           juce::String::fromUTF8("WAV, AIFF или FROM STUDIO ONE через ARA2"),
               56,201,630,18,juce::Justification::centredLeft);
    paintAudioWave(g,reference?&reference->audio:nullptr,{56,226,916,25},gold);

    g.setColour(green);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("02  /  BACKS & DOUBLES",53,293,225,24,juce::Justification::centredLeft);
    g.setColour(muted);g.setFont(juce::Font(10.f));
    g.drawText(juce::String(static_cast<int>(backups.size()))+" / 8  TRACKS",55,324,400,20,juce::Justification::centredLeft);
    if(backups.empty()){
        g.setColour(juce::Colour(0xffbccbc6));g.setFont(juce::Font(15.f));
        g.drawText(juce::String::fromUTF8("Перетащи сюда бэки"),55,398,430,34,juce::Justification::centred);
        g.setColour(muted);g.setFont(juce::Font(11.f));
        g.drawText(juce::String::fromUTF8("Каждый дубль обработается отдельно"),58,435,410,24,juce::Justification::centred);
    }
    for(size_t i=0;i<backups.size();++i){
        const float y=348.f+static_cast<float>(i)*29.f;
        g.setColour(i%2?juce::Colour(0xff202930):juce::Colour(0xff293038));
        g.fillRoundedRectangle(52,y,441,26,5.f);
        g.setColour(green.withAlpha(.9f));g.fillRoundedRectangle(56,y+7,3,13,1.5f);
        g.setColour(paper);g.setFont(juce::Font(11.f));
        const auto name=backups[i].label.isNotEmpty()?backups[i].label:display(backups[i].source);
        g.drawFittedText(juce::String(static_cast<int>(i+1)).paddedLeft('0',2)+" "+name,66,static_cast<int>(y)+3,185,20,juce::Justification::centredLeft,1);
        paintAudioWave(g,&backups[i].audio,{257,y+4,226,17},green);
    }

    g.setColour(resultBlue);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("03  /  RESULT",542,293,180,23,juce::Justification::centredLeft);
    g.setFont(juce::Font(10.5f));g.setColour(muted);
    g.drawText(rendered.empty()?juce::String::fromUTF8("Нажми ALIGN TIMING, чтобы получить готовые дорожки"):
                                juce::String::fromUTF8("ЗАЖМИ ГОТОВУЮ ВОЛНУ → ПЕРЕТАЩИ В STUDIO ONE"),
               542,319,434,24,juce::Justification::centredLeft);
    if(rendered.empty()){
        g.setColour(resultBlue.withAlpha(.35f));g.setFont(juce::Font(22.f));
        g.drawText(juce::String::fromUTF8("ГОТОВО"),543,417,433,34,juce::Justification::centred);
        g.setColour(muted);g.setFont(juce::Font(11.f));
        g.drawText(juce::String::fromUTF8("Здесь появится звуковая волна выровненного бэка"),
                   545,453,428,28,juce::Justification::centred);
    }else{
        for(size_t i=0;i<rendered.size();++i){
            auto rect=resultRowRect(i).toFloat();
            g.setColour(static_cast<int>(i)==selectedResult?juce::Colour(0xff354954):
                        (i%2?juce::Colour(0xff232e38):juce::Colour(0xff273039)));
            g.fillRoundedRectangle(rect,5.f);
            g.setColour(resultBlue);g.fillRoundedRectangle(rect.getX()+5,rect.getY()+7,3,13,1.5f);
            g.setColour(paper);g.setFont(juce::Font(10.8f));
            g.drawText(juce::String(static_cast<int>(i+1)).paddedLeft('0',2),rect.getX()+12,rect.getY()+2,28,22,juce::Justification::centredLeft);
            paintAudioWave(g,&rendered[i],{rect.getX()+46,rect.getY()+4,rect.getWidth()-124,18},resultBlue);
            g.setColour(green);g.setFont(juce::Font(9.8f,juce::Font::bold));
            g.drawText(hasPitch?"TUNED":"TIMED",rect.getRight()-81,rect.getY()+3,68,20,juce::Justification::centredRight);
        }
    }
    g.setColour(muted);g.setFont(juce::Font(10.8f));
    g.drawText(juce::String::fromUTF8("СЛОГИ  /  ТАЙМИНГ"),39,587,290,22,juce::Justification::centredLeft);
    g.drawText(juce::String::fromUTF8("НОТЫ  /  ГАРМОНИИ"),344,587,300,22,juce::Justification::centredLeft);
    g.drawText(juce::String::fromUTF8("ЭКСПОРТ ВСЕХ WAV"),652,587,335,22,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff424a51));g.drawHorizontalLine(670,36,993);
}
void SyncEditor::fileDragEnter(const juce::StringArray &,int x,int y){
    dragActive=true;dragIntoLead=y<268;repaint();
}
void SyncEditor::fileDragExit(const juce::StringArray &){dragActive=false;repaint();}
bool SyncEditor::isInterestedInFileDrag(const juce::StringArray &files){
    for(const auto &f:files)
        if(juce::File(f).hasFileExtension("wav;aif;aiff"))return true;
    return false;
}
void SyncEditor::filesDropped(const juce::StringArray &files,int,int y){
    dragActive=false;loadFiles(files,y<268);
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
    track.source=file;track.label=file.getFileNameWithoutExtension();track.audio.rate=reader->sampleRate;track.audio.channels.resize(static_cast<size_t>(audio.getNumChannels()));
    for(int ch=0;ch<audio.getNumChannels();++ch)
        track.audio.channels[static_cast<size_t>(ch)].assign(audio.getReadPointer(ch),audio.getReadPointer(ch)+audio.getNumSamples());
    return true;
}

void SyncEditor::importHostEvents(bool importLead){
    auto *renderer=processor.hostEditorRenderer();
    if(renderer==nullptr){
        info(juce::String::fromUTF8("ARA2 не активирован: добавь «Синхрон» как Event FX к вокальному событию Studio One."));
        return;
    }
    std::vector<juce::ARAPlaybackRegion*> regions;
    auto addRegion=[&](juce::ARAPlaybackRegion *region){
        if(region && std::find(regions.begin(),regions.end(),region)==regions.end())
            regions.push_back(region);
    };
    for(auto *region:renderer->getPlaybackRegions())addRegion(region);
    // ARA sessions may expose a document containing every clip linked through
    // Event FX, not just the one whose editor is open.
    if(!regions.empty()) {
        auto *source=regions.front()->getAudioModification()->getAudioSource();
        if(auto *document=source->getDocument())
            for(auto *sequence:document->getRegionSequences())
                for(auto *region:sequence->getPlaybackRegions())addRegion(region);
    }
    for(auto *seq:renderer->getRegionSequences())
        for(auto *region:seq->getPlaybackRegions())addRegion(region);
    // Each back can have its own Event FX instance. Collect ALL live docs.
    std::vector<juce::ARAPlaybackRegion*> external;
    if(!importLead) {
        synchronCollectActiveARARegions(external);
        for(auto *region:external)addRegion(region);
    }
    std::sort(regions.begin(),regions.end(),[](auto *a,auto *b){
        return a->getStartInPlaybackTime()<b->getStartInPlaybackTime();
    });
    if(regions.empty()){
        info(juce::String::fromUTF8("Studio One ещё не передал события через ARA. Назначь плагин как Event FX."));
        return;
    }
    juce::String error;
    int added=0;
    if(!importLead) backups.clear(); // repeated sync replaces, never duplicates
    for(auto *region:regions){
        if(!importLead && backups.size()>=8)break;
        auto *source=region->getAudioModification()->getAudioSource();
        const auto rate=source->getSampleRate();
        const auto channels=source->getChannelCount();
        if(rate<8000||channels<1||channels>2)continue;
        const auto start=std::max<juce::int64>(0,region->getStartInAudioModificationSamples());
        const auto until=std::min<juce::int64>(source->getSampleCount(),region->getEndInAudioModificationSamples());
        const auto length=until-start;
        if(length<=0||length>rate*120)continue;
        if(!importLead && reference &&
           (reference->hostRegionToken==reinterpret_cast<uintptr_t>(region)||
            std::abs(reference->audio.rate-rate)>1))continue;
        if(importLead && reference && added>0)break;
        juce::ARAAudioSourceReader reader(source);
        if(!reader.isValid())continue;
        juce::AudioBuffer<float> samples(static_cast<int>(channels),static_cast<int>(length));
        if(!reader.read(&samples,0,static_cast<int>(length),start,true,true))continue;
        Track t;
        t.timelineStart=region->getStartInPlaybackTime();
        t.hostRegionToken=reinterpret_cast<uintptr_t>(region);
        t.label="STUDIO ONE  /  EVENT "+juce::String(added+1);
        t.audio.rate=rate;
        t.audio.channels.resize(static_cast<size_t>(channels));
        const auto beginTime=(!importLead && reference)?reference->timelineStart:t.timelineStart;
        // Relative timeline placement is preserved where the backing event
        // begins after the reference event; negative offsets need a host edit.
        const auto padding=std::clamp<juce::int64>(
            static_cast<juce::int64>(std::llround((t.timelineStart-beginTime)*rate)),
            0,static_cast<juce::int64>(rate*10));
        for(int ch=0;ch<channels;++ch){
            auto &dst=t.audio.channels[static_cast<size_t>(ch)];
            dst.assign(static_cast<size_t>(padding),0.f);
            const float *src=samples.getReadPointer(static_cast<int>(ch));
            dst.insert(dst.end(),src,src+length);
        }
        if(importLead){
            reference=std::make_unique<Track>(std::move(t));
            backups.clear();
            break;
        }else{
            backups.push_back(std::move(t));
        }
        ++added;
    }
    rendered.clear();dragFiles.clear();selectedResult=-1;hasTiming=hasPitch=false;
    info(importLead?
         (reference?juce::String::fromUTF8("Лид из ARA загружен. Назначь Synchron Event FX бэкам и забери их здесь."):
                    juce::String::fromUTF8("ARA не предоставил доступный лид")):
         (added>0?juce::String::fromUTF8("ОБЩАЯ СЕССИЯ: бэков найдено ")+juce::String(added):
                  juce::String::fromUTF8("Других событий Synchron не найдено. Назначь Event FX бэкам.")));
    repaint();
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
    rendered.clear();dragFiles.clear();selectedResult=-1;hasTiming=hasPitch=false;
    info(loaded?juce::String::fromUTF8("Загружено дорожек: ")+juce::String(loaded)+(error.isNotEmpty()?" · "+error:""):error);
    repaint();
}

bool SyncEditor::writeResultWav(size_t index,const juce::File &target){
    if(index>=rendered.size())return false;
    const auto &a=rendered[index];
    if(!a.valid() || a.samples()>std::numeric_limits<int>::max())return false;
    auto stream=std::unique_ptr<juce::FileOutputStream>(target.createOutputStream());
    if(!stream||stream->failedToOpen())return false;
    juce::WavAudioFormat wav;
    std::unique_ptr<juce::AudioFormatWriter> writer(
        wav.createWriterFor(stream.get(),a.rate,static_cast<unsigned int>(a.channels.size()),24,{},0));
    if(!writer)return false;
    stream.release(); // ownership transferred to writer
    const int count=static_cast<int>(a.samples());
    juce::AudioBuffer<float> buffer(static_cast<int>(a.channels.size()),count);
    for(int ch=0;ch<buffer.getNumChannels();++ch)
        buffer.copyFrom(ch,0,a.channels[static_cast<size_t>(ch)].data(),count);
    return writer->writeFromAudioSampleBuffer(buffer,0,count);
}

void SyncEditor::prepareDragWavs(){
    dragFiles.clear();
    selectedResult=rendered.empty()?-1:0;
    pressedResult=-1;externalDragStarted=false;
    if(rendered.empty())return;
    dragDirectory=juce::File::getSpecialLocation(juce::File::tempDirectory)
        .getChildFile("Synchron").getChildFile(juce::Uuid().toString());
    if(!dragDirectory.createDirectory().wasOk()){
        info(juce::String::fromUTF8("Не могу создать WAV для переноса. Используй EXPORT WAV."));
        return;
    }
    for(size_t i=0;i<rendered.size();++i){
        const auto &label=backups[i].label;
        const auto safe=juce::File::createLegalFileName(label.isNotEmpty()?label:juce::String("BACK"));
        const auto filename=juce::String(static_cast<int>(i+1)).paddedLeft('0',2)+"_"+safe+
            (hasPitch?"_TUNED.wav":"_ALIGNED.wav");
        const auto target=dragDirectory.getChildFile(filename);
        dragFiles.push_back(writeResultWav(i,target)?target:juce::File());
    }
}

void SyncEditor::mouseDown(const juce::MouseEvent &event){
    pressedResult=resultAt(event.getPosition());
    selectedResult=pressedResult;
    externalDragStarted=false;
    if(pressedResult>=0){
        setMouseCursor(juce::MouseCursor::DraggingHandCursor);
        repaint();
    }
}
void SyncEditor::mouseDrag(const juce::MouseEvent &event){
    if(pressedResult<0||externalDragStarted||event.getDistanceFromDragStart()<7)return;
    const auto index=static_cast<size_t>(pressedResult);
    if(index>=dragFiles.size()||!dragFiles[index].existsAsFile()){
        info(juce::String::fromUTF8("Нет готового WAV. Нажми ALIGN TIMING."));
        return;
    }
    externalDragStarted=true;
    // JUCE invokes native Windows OLE CF_HDROP. Studio One may accept the WAV
    // into the arranger if its drag target accepts external audio files.
    juce::StringArray paths; paths.add(dragFiles[index].getFullPathName());
    juce::Component::SafePointer<SyncEditor> safe(this);
    const bool started=juce::DragAndDropContainer::performExternalDragDropOfFiles(
        paths,false,this,[safe]{ if(safe) {safe->externalDragStarted=false;safe->pressedResult=-1;} });
    if(started)
        info(juce::String::fromUTF8("Перетащи WAV на новую дорожку Studio One к началу лида (без предварительного экспорта)."));
    else{
        externalDragStarted=false;
        info(juce::String::fromUTF8("Studio One не принял системный перенос — используй EXPORT WAV."));
    }
}
void SyncEditor::mouseUp(const juce::MouseEvent &){
    pressedResult=-1;
    setMouseCursor(juce::MouseCursor::NormalCursor);
}

void SyncEditor::alignAll(){
    if(!reference||backups.empty()){info(juce::String::fromUTF8("Нужны лид и хотя бы один бэк"));return;}
    rendered.clear();dragFiles.clear();hasPitch=hasTiming=false;
    try {
        for(const auto &track:backups)rendered.push_back(synchro::alignTiming(reference->audio,track.audio));
        hasTiming=true;prepareDragWavs();info(juce::String::fromUTF8("Тайминг обработан для ")+juce::String(static_cast<int>(rendered.size()))+juce::String::fromUTF8(" дорожек. Тюнинг отключён."));
    }catch(const std::exception &e){rendered.clear();info("Timing error: "+juce::String(e.what()));}
    repaint();
}
void SyncEditor::tuneAll(){
    if(!reference||!hasTiming||rendered.empty()){info(juce::String::fromUTF8("Сначала ALIGN TIMING"));return;}
    try {
        for(auto &audio:rendered)audio=synchro::tuneHarmony(reference->audio,audio);
        hasPitch=true;prepareDragWavs();info(juce::String::fromUTF8("Интонация подровнена. Перетащи нужный RESULT в Studio One."));
    }catch(const std::exception &e){info("Tuning error: "+juce::String(e.what()));}
    repaint();
}
void SyncEditor::exportWavs(const juce::File &folder){
    if(!folder.isDirectory()||!hasTiming)return;
    juce::WavAudioFormat wav;int done=0;
    for(size_t i=0;i<rendered.size();++i){
        auto &a=rendered[i];
        auto label=backups[i].label.isNotEmpty()?backups[i].label:backups[i].source.getFileNameWithoutExtension();
        auto name=juce::File::createLegalFileName(label)+"_SYNCHRON_"+(hasPitch?"timed_tuned":"timed")+".wav";
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
