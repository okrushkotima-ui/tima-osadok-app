#include "PluginEditor.h"
#include <cmath>

namespace {
const juce::Colour gold(0xffdfb77e),green(0xff80bd9e),ink(0xff14181d),muted(0xff9ea6ad);
juce::String display(const juce::File &f){return f.getFileNameWithoutExtension().substring(0,55);}
}

SyncEditor::SyncEditor(SyncProcessor &p):AudioProcessorEditor(&p),processor(p){
    formats.registerBasicFormats();
    setSize(1030,730);
    // Studio One may embed the ARA editor in a narrow lower dock or detach it.
    // Host still owns the dock size, but our UI reflows proportionally when resized.
    setResizable(true,true);
    setResizeLimits(740,520,1720,1180);
    auto style=[this](juce::TextButton &button,bool primary){
        button.setColour(juce::TextButton::buttonColourId,primary?juce::Colour(0xffba9160):juce::Colour(0xff303640));
        button.setColour(juce::TextButton::textColourOffId,primary?ink:juce::Colour(0xfff0eae2));
        button.setMouseCursor(juce::MouseCursor::PointingHandCursor);
        addAndMakeVisible(button);
    };
    style(chooseLead,false);style(addBack,false);style(hostLead,false);style(hostBack,false);style(timing,true);style(pitch,false);style(exportButton,false);
    exportButton.setButtonText("DRAG TO STUDIO ONE  /  CLICK TO SAVE");
    exportButton.addMouseListener(this,false);
    exportButton.setTooltip(juce::String::fromUTF8("Зажми и потяни обработанные WAV на таймлайн Studio One. Обычный клик — экспорт."));
    addAndMakeVisible(status);status.setColour(juce::Label::textColourId,muted);
    status.setFont(juce::Font(14.f));status.setJustificationType(juce::Justification::centredLeft);
    chooseLead.onClick=[this]{selectFiles(true);};
    addBack.onClick=[this]{selectFiles(false);};
    hostLead.onClick=[this]{importHostEvents(true);};
    hostBack.onClick=[this]{importHostEvents(false);};
    timing.onClick=[this]{alignAll();};
    pitch.onClick=[this]{tuneAll();};
    exportButton.onClick=[this]{
        if(rendered.empty()){info(juce::String::fromUTF8("Сначала нажми ALIGN TIMING"));return;}
        chooser=std::make_unique<juce::FileChooser>(juce::String::fromUTF8("Папка для синхронизированных WAV"),juce::File(),juce::String());
        juce::Component::SafePointer<SyncEditor> safe(this);
        chooser->launchAsync(juce::FileBrowserComponent::openMode|juce::FileBrowserComponent::canSelectDirectories,
            [safe](const juce::FileChooser &fc){if(safe){auto folder=fc.getResult();if(folder.isDirectory())safe->exportWavs(folder);}});
    };
    info(juce::String::fromUTF8("LEAD → BACKS → ALIGN TIMING. Файлы WAV/AIFF с общей точкой старта."));
}


void SyncEditor::resized(){
    const auto sx=getWidth()/1030.f,sy=getHeight()/730.f;
    auto fit=[sx,sy](juce::Component& target,int x,int y,int w,int h){
        target.setBounds(juce::roundToInt(x*sx),juce::roundToInt(y*sy),
                         juce::roundToInt(w*sx),juce::roundToInt(h*sy));
    };
    fit(chooseLead,547,153,82,32);
    fit(hostLead,633,153,98,32);
    fit(addBack,547,312,82,32);
    fit(hostBack,633,312,98,32);
    fit(timing,36,612,288,52);
    fit(pitch,336,612,288,52);
    fit(exportButton,636,612,358,52);
    fit(status,42,673,938,37);
}
void SyncEditor::paintAudioWave(juce::Graphics &g,const synchro::Audio *audio,juce::Rectangle<float> box,juce::Colour colour) const {
    auto center=box.getCentreY();
    g.setColour(colour.withAlpha(.14f));
    g.drawHorizontalLine(static_cast<int>(center),box.getX(),box.getRight());
    if(audio==nullptr||!audio->valid()||audio->channels.empty())return;
    auto &samples=audio->channels[0];
    auto length=static_cast<int64_t>(samples.size());
    int bins=std::max(1,static_cast<int>(box.getWidth()/3.0f));
    for(int x=0;x<bins;++x) {
        const auto first=length*x/bins,last=std::min<int64_t>(length, length*(x+1)/bins);
        const auto stride=std::max<int64_t>(1,(last-first)/48);
        float peak=0;
        for(auto i=first;i<last;i+=stride)peak=std::max(peak,std::abs(samples[static_cast<size_t>(i)]));
        const auto height=std::max(.8f,std::min(1.f,peak*2.4f)*box.getHeight()*.47f);
        auto width=std::max(1.0f,box.getWidth()/bins-1.0f);
        g.setColour(colour.withAlpha(.34f+.56f*std::min(1.f,peak*3.f)));
        g.fillRoundedRectangle(box.getX()+x*box.getWidth()/bins,center-height,width,height*2.f,.8f);
    }
}
void SyncEditor::paint(juce::Graphics &g) {
    g.addTransform(juce::AffineTransform::scale(getWidth()/1030.f,getHeight()/730.f));
    const juce::Colour surface(0xff1e242a),surfaceDeep(0xff171c21),
                       border(0xff3b454e),paper(0xfff4ecdf);
    g.setGradientFill(juce::ColourGradient(juce::Colour(0xff292c31),0,0,juce::Colour(0xff12171c),1030,730,false));
    g.fillAll();
    // Lighting: warm bloom at the top and cool fill at the right.
    g.setGradientFill(juce::ColourGradient(gold.withAlpha(.085f),380,28,ink.withAlpha(0.f),440,390,true));
    g.fillEllipse(108,0,620,400);
    g.setGradientFill(juce::ColourGradient(green.withAlpha(.055f),1000,300,ink.withAlpha(0.f),650,350,true));
    g.fillEllipse(610,70,460,540);
    g.setColour(paper);g.setFont(juce::Font(38.f,juce::Font::bold));
    g.drawText(juce::String::fromUTF8("Синхрон"),36,27,340,48,juce::Justification::centredLeft);
    g.setColour(gold);g.setFont(juce::Font(14.f));
    g.drawText(juce::String::fromUTF8("by тима осадок"),769,36,220,28,juce::Justification::centredRight);
    g.setColour(muted);g.setFont(juce::Font(10.6f));
    g.drawText("VOCAL STACK  /  TIMING + OPTIONAL TUNING",39,81,550,18,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff39424a));g.drawHorizontalLine(113,35,993);
    // Two premium waveform panels.
    auto card=[&](juce::Rectangle<float> rect,juce::Colour stroke){
        g.setColour(juce::Colours::black.withAlpha(.28f));g.fillRoundedRectangle(rect.translated(0,7),16);
        g.setGradientFill(juce::ColourGradient(surface,rect.getTopLeft(),surfaceDeep,rect.getBottomRight(),false));
        g.fillRoundedRectangle(rect,16);
        g.setColour(stroke);g.drawRoundedRectangle(rect,16,1.35f);
    };
    const auto leadPanel=juce::Rectangle<float>(35,137,707,143);
    const auto backPanel=juce::Rectangle<float>(35,293,707,282);
    card(leadPanel,dragActive&&dragIntoLead?gold:(reference?gold.withAlpha(.64f):border));
    card(backPanel,dragActive&&!dragIntoLead?green:(backups.empty()?border:green.withAlpha(.65f)));
    g.setColour(gold);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("01    LEAD  /  REFERENCE",55,149,440,26,juce::Justification::centredLeft);
    g.setColour(paper);g.setFont(juce::Font(17.f,juce::Font::bold));
    g.drawFittedText(reference?(reference->label.isNotEmpty()?reference->label:display(reference->source)):juce::String::fromUTF8("Перетащи лид сюда"),56,184,470,29,juce::Justification::centredLeft,1);
    g.setColour(muted);g.setFont(juce::Font(11.f));
    g.drawText(reference?juce::String::fromUTF8("Эталон синхронизации"):juce::String::fromUTF8("WAV / AIFF   •   дорожка-ориентир"),56,212,455,16,juce::Justification::centredLeft);
    paintAudioWave(g,reference?&reference->audio:nullptr,{55,233,657,30},gold);
    g.setColour(green);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("02    BACKS / DOUBLES",55,302,425,24,juce::Justification::centredLeft);
    g.setColour(muted);g.setFont(juce::Font(10.5f));
    g.drawText(juce::String(static_cast<int>(backups.size()))+" / 8  LOADED",55,328,460,19,juce::Justification::centredLeft);
    if(backups.empty()){
        g.setColour(juce::Colour(0xffbfcac7));g.setFont(juce::Font(17.f));
        g.drawText(juce::String::fromUTF8("Перетащи бэки и даблы сюда"),55,399,490,35,juce::Justification::centredLeft);
        g.setColour(muted);g.setFont(juce::Font(12.f));
        g.drawText(juce::String::fromUTF8("Каждый дубль обрабатывается отдельно"),55,433,490,24,juce::Justification::centredLeft);
    } else {
        const auto rowStart=358.f;
        const auto height=25.8f;
        for(size_t i=0;i<backups.size();++i){
            const float y=rowStart+static_cast<float>(i)*height;
            g.setColour(i%2?juce::Colour(0xff202830):juce::Colour(0xff263038));
            g.fillRoundedRectangle(52,y,673,23,5);
            g.setColour(green.withAlpha(.9f));g.fillRoundedRectangle(56,y+5,3,13,1.5f);
            g.setColour(paper.withAlpha(.9f));g.setFont(juce::Font(11.2f));
            g.drawFittedText(juce::String(static_cast<int>(i+1)).paddedLeft('0',2)+"   "+(backups[i].label.isNotEmpty()?backups[i].label:display(backups[i].source)),
                             67,static_cast<int>(y)+2,250,19,juce::Justification::centredLeft,1);
            paintAudioWave(g,&backups[i].audio,{323,y+4,255,15},green);
            g.setColour(i<rendered.size()?green:muted);
            g.setFont(juce::Font(10.0f,juce::Font::bold));
            g.drawText(i<rendered.size()?(hasPitch?"TUNED":"ALIGNED"):"READY",
                      584,static_cast<int>(y)+2,125,18,juce::Justification::centredRight);
        }
    }
    // Side column: progress and actual Studio One workflow.
    const auto side=juce::Rectangle<float>(756,137,238,438);
    card(side,border);
    g.setColour(gold);g.setFont(juce::Font(11.f,juce::Font::bold));
    g.drawText("WORKFLOW",779,158,180,22,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff464f55));g.drawHorizontalLine(189,778,976);
    auto stage=[&](int y,int number,const juce::String& name,const juce::String &info,bool done) {
        g.setColour(done?green:juce::Colour(0xff65717b));
        g.fillEllipse(777.f,static_cast<float>(y),21.f,21.f);
        g.setColour(ink);g.setFont(juce::Font(11.3f,juce::Font::bold));
        g.drawText(juce::String(number),777,y,21,21,juce::Justification::centred);
        g.setColour(paper);g.setFont(juce::Font(12.3f,juce::Font::bold));
        g.drawText(name,809,y-2,161,24,juce::Justification::centredLeft);
        g.setColour(muted);g.setFont(juce::Font(10.f));
        g.drawFittedText(info,809,y+20,157,29,juce::Justification::topLeft,2);
    };
    stage(209,1,"LEAD",juce::String::fromUTF8("Выбери ориентир"),reference!=nullptr);
    stage(282,2,"BACKS",juce::String::fromUTF8("Добавь дубли"),!backups.empty());
    stage(355,3,"ALIGN TIMING",juce::String::fromUTF8("Сведи тайминг"),hasTiming);
    stage(428,4,"TUNE NOTES",juce::String::fromUTF8("По желанию"),hasPitch);
    g.setColour(gold.withAlpha(.20f));g.fillRoundedRectangle(775.f,505.f,197.f,49.f,7.f);
    g.setColour(juce::Colour(0xffdcc7a6));g.setFont(juce::Font(10.2f));
    g.drawFittedText(juce::String::fromUTF8("Бэки: назначь Синхрон Event FX на каждый дубль, затем FROM STUDIO ONE."),
                     785,510,180,38,juce::Justification::centredLeft,3);
    g.setColour(muted);g.setFont(juce::Font(10.8f));
    g.drawText(juce::String::fromUTF8("ТАЙМИНГ  /  СЛОГИ"),38,582,290,23,juce::Justification::centredLeft);
    g.drawText(juce::String::fromUTF8("НОТЫ  /  ГАРМОНИИ"),340,582,290,23,juce::Justification::centredLeft);
    g.drawText(juce::String::fromUTF8("ОТДЕЛЬНЫЕ WAV"),640,582,320,23,juce::Justification::centredLeft);
    g.setColour(juce::Colour(0xff424a51));g.drawHorizontalLine(671,36,994);
}

void SyncEditor::fileDragEnter(const juce::StringArray &,int,int y){
    dragActive=true;dragIntoLead=y<juce::roundToInt(getHeight()*286.f/730.f);repaint();
}
void SyncEditor::fileDragExit(const juce::StringArray &){
    dragActive=false;repaint();
}
bool SyncEditor::isInterestedInFileDrag(const juce::StringArray &files){
    for(const auto &f:files)
        if(juce::File(f).hasFileExtension("wav;aif;aiff"))return true;
    return false;
}
void SyncEditor::filesDropped(const juce::StringArray &files,int,int y){
    dragActive=false;loadFiles(files,y<juce::roundToInt(getHeight()*287.f/730.f));
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
    std::sort(regions.begin(),regions.end(),[](auto *a,auto *b){
        return a->getStartInPlaybackTime()<b->getStartInPlaybackTime();
    });
    if(regions.empty()){
        info(juce::String::fromUTF8("Studio One ещё не передал события через ARA. Назначь плагин как Event FX."));
        return;
    }
    juce::String error;
    int added=0;
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
        // ARA reports the same source via playback role and document graph.
        // Only import any given event once, even across repeated button presses.
        const auto token=reinterpret_cast<uintptr_t>(region);
        if(!importLead && std::any_of(backups.begin(),backups.end(),
            [token](const Track &track){return track.hostRegionToken==token;}))continue;
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
    rendered.clear();hasTiming=hasPitch=false;
    info(importLead?
         (reference?juce::String::fromUTF8("Лид импортирован из Studio One через ARA2"):
                    juce::String::fromUTF8("ARA не предоставил доступный лид")):
         (added>0?juce::String::fromUTF8("Добавлено бэков через ARA2: ")+juce::String(added):
         juce::String::fromUTF8("Других событий не видно. Назначь Синхрон Event FX на каждый бэк и нажми FROM STUDIO ONE.")));
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
juce::StringArray SyncEditor::writeResultFiles(const juce::File &folder){
    juce::StringArray files;
    if(!folder.isDirectory()||!hasTiming||rendered.size()!=backups.size())return files;
    juce::WavAudioFormat wav;
    for(size_t i=0;i<rendered.size();++i){
        auto &a=rendered[i];
        if(!a.valid()||a.samples()>std::numeric_limits<int>::max())continue;
        auto stem=backups[i].source.getFileNameWithoutExtension();
        if(stem.isEmpty())stem="BACK_"+juce::String(static_cast<int>(i+1)).paddedLeft('0',2);
        stem=juce::File::createLegalFileName(stem);
        auto name=stem+"_SYNCHRON_"+(hasPitch?"timed_tuned":"timed")+".wav";
        auto file=folder.getChildFile(name).getNonexistentSibling(false);
        auto stream=std::unique_ptr<juce::FileOutputStream>(file.createOutputStream());
        if(!stream||stream->failedToOpen())continue;
        auto writer=std::unique_ptr<juce::AudioFormatWriter>(
            wav.createWriterFor(stream.get(),a.rate,static_cast<unsigned int>(a.channels.size()),24,{},0));
        if(!writer)continue;
        stream.release();
        const auto count=static_cast<int>(a.samples());
        juce::AudioBuffer<float> buffer(static_cast<int>(a.channels.size()),count);
        for(int ch=0;ch<buffer.getNumChannels();++ch)
            buffer.copyFrom(ch,0,a.channels[static_cast<size_t>(ch)].data(),count);
        if(writer->writeFromAudioSampleBuffer(buffer,0,count))files.add(file.getFullPathName());
    }
    return files;
}
void SyncEditor::exportWavs(const juce::File &folder){
    const auto files=writeResultFiles(folder);
    info(juce::String::fromUTF8("Экспортировано отдельных WAV: ")+juce::String(files.size()));
}
void SyncEditor::beginResultsDrag(){
    if(!hasTiming || rendered.empty()){
        info(juce::String::fromUTF8("Сначала нажми ALIGN TIMING"));
        return;
    }
    const auto temp=juce::File::getSpecialLocation(juce::File::tempDirectory)
        .getChildFile("tima-osadok-synchron")
        .getChildFile("drag-"+juce::Uuid().toString());
    if(!temp.createDirectory().wasOk()){
        info(juce::String::fromUTF8("Не могу создать временные файлы для переноса"));
        return;
    }
    const auto files=writeResultFiles(temp);
    if(files.isEmpty()){
        info(juce::String::fromUTF8("Не удалось подготовить WAV для перетаскивания"));
        return;
    }
    // Real Windows OLE file drop: Studio One gets standard filesystem WAV paths.
    // Host alone decides whether the arrangement accepts these dropped audio files.
    if(juce::DragAndDropContainer::performExternalDragDropOfFiles(files,false,&exportButton)){
        info(juce::String::fromUTF8("Перетащи WAV на нужную дорожку Studio One. Место на таймлайне выбираешь сам."));
    }else{
        info(juce::String::fromUTF8("Studio One отклонил внешний drag. Используй обычный экспорт."));
    }
}
void SyncEditor::mouseDrag(const juce::MouseEvent &event){
    if(event.eventComponent==&exportButton && !dragOutStarted &&
       event.getDistanceFromDragStart()>=9){
        dragOutStarted=true;
        beginResultsDrag();
    }
}
void SyncEditor::mouseUp(const juce::MouseEvent &event){
    if(event.eventComponent==&exportButton)dragOutStarted=false;
}
void SyncEditor::info(juce::String message){status.setText(message,juce::dontSendNotification);}
