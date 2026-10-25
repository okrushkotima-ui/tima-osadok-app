const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const base=process.env.ISKRA_TEST_URL||'http://127.0.0.1:8000/iskra/';
const original={name:'Прежний альбом',extra:'keep-project',tracks:[{id:'old-track',name:'Первая песня',bpm:'92',key:'Dm',stage:'Демо',status:'В альбом',rating:4,revisit:true,notes:'Не потерять мои заметки',custom:'keep-track'}]};
const errors=[];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
 async function test(name,fn){await fn();count++;console.log('PASS',name);}
 async function fresh(seed={},query='?mode=studio'){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.evaluate(data=>{localStorage.clear();for(const [key,value] of Object.entries(data))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));},seed);await p.goto(base+query);return {c,p};
 }
 async function stored(p,key='iskra-studio-v1'){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
 async function expand(p){await p.locator('.studio-song').first().click();}
 try{
 await test('stage-specific sessions preserve all legacy track fields and unknown metadata',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original});await expand(p);
  assert.match(await p.locator('.work-instruction').textContent(),/всю форму/);
  await p.getByLabel('Результат сессии',{exact:true}).selectOption('Сохранена новая запись');await p.getByRole('button',{name:'Записать результат ✓',exact:true}).click();
  const project=await stored(p),track=project.tracks[0];for(const [key,value] of Object.entries(original.tracks[0]))assert.deepEqual(track[key],value);assert.equal(project.extra,'keep-project');assert.equal(track.work.sessions.length,1);
  await p.reload();await expand(p);await p.locator('.work-history summary').click();assert.match(await p.locator('.work-history').textContent(),/Сохранена новая запись/);
  for(const stage of ['Идея','Демо','Запись','Сведение','Мастер','Готово']){await p.getByLabel('Стадия',{exact:true}).selectOption(stage);assert.equal(await p.getByLabel('Следующее действие',{exact:true}).locator('option').count(),3);assert.ok((await p.locator('.work-instruction').textContent()).length>50);}
  await c.close();
 });
 await test('demo, A/B and listening checks survive changing the next action and reloading',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original});await expand(p);await p.locator('.work-extras summary').click();
  await p.getByLabel('Ссылка на демо · необязательно',{exact:true}).fill('https://example.com/my-demo.wav');await p.locator('input[name="ab-old-track"][value="B"]').check();await p.getByLabel('Верю эмоции без объяснений',{exact:true}).check();
  await p.getByLabel('Следующее действие',{exact:true}).selectOption('hook');let w=(await stored(p)).tracks[0].work;assert.equal(w.demo,'https://example.com/my-demo.wav');assert.equal(w.decision,'B');assert.deepEqual(w.checks,['emotion']);
  await p.reload();await expand(p);await p.locator('.work-extras summary').click();assert.equal(await p.getByLabel('Ссылка на демо · необязательно',{exact:true}).inputValue(),w.demo);assert.equal(await p.locator('input[name="ab-old-track"][value="B"]').isChecked(),true);
  await p.getByLabel('Ссылка на демо · необязательно',{exact:true}).fill('javascript:alert(1)');assert.equal(await p.locator('.demo-link').isVisible(),false);await c.close();
 });
 await test('mission transfers selected choices to an existing track without overwriting notes',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original},'?mode=album');await p.locator('input[name="mission-0-0"]').nth(1).check();await p.locator('input[name="mission-0-1"]').nth(2).check();
  await p.getByRole('button',{name:'В студию с этим заданием →',exact:true}).click();assert.equal(await p.locator('#studio-view').isVisible(),true);assert.match(await p.locator('#studio-assignment').textContent(),/Учусь быть собой.*Надежда/);
  await p.locator('#assignment-track').selectOption('old-track');await p.getByRole('button',{name:'Прикрепить задание',exact:true}).click();
  const s=await stored(p);assert.equal(s.tracks.length,1);assert.equal(s.tracks[0].notes,original.tracks[0].notes);assert.equal(s.tracks[0].work.task.day,0);assert.match(s.tracks[0].work.task.task,/Учусь быть собой/);
  await p.reload();await expand(p);assert.match(await p.locator('.work-source').textContent(),/дня 1/);await p.getByRole('button',{name:'Работать по стадии трека',exact:true}).click();assert.equal((await stored(p)).tracks[0].work.task,undefined);await c.close();
 });
 await test('a spark becomes an explicit new track with a useful saved task',async()=>{
  const {c,p}=await fresh({},'?mode=inspire');const spark=await p.locator('#prompt').textContent();await p.locator('#inspire-take').click();assert.equal(await p.locator('#studio-tracks .studio-track').count(),0);
  await p.getByRole('button',{name:'Прикрепить задание',exact:true}).click();const s=await stored(p);assert.equal(s.tracks.length,1);assert.equal(s.tracks[0].work.task.task,spark);assert.match(await p.locator('.work-source').textContent(),/Из «Искр»/);await c.close();
 });
 await test('full backup restores tracks, work history, mission answers and gift isolation',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original,'iskra-gift-studio-v1':{name:'Подарочный',tracks:[]}});await expand(p);await p.getByLabel('Результат сессии',{exact:true}).selectOption('Закрыта одна правка');await p.getByRole('button',{name:'Записать результат ✓',exact:true}).click();
  await p.locator('#mode-album').click();await p.locator('input[name="mission-0-0"]').first().check();await p.locator('input[name="mission-0-1"]').first().check();await p.locator('input[value="full"]').check();await p.locator('#album-done').click();await p.locator('.backup-panel summary').click();
  const pending=p.waitForEvent('download');await p.locator('#full-export').click();const download=await pending,bytes=await fs.readFile(await download.path()),backup=JSON.parse(bytes);assert.equal(backup.project.tracks[0].work.sessions.length,1);assert.equal(backup.album.done[0],true);
  await p.evaluate(()=>{localStorage.setItem('iskra-studio-v1',JSON.stringify({name:'Изменён',tracks:[]}));});
  p.once('dialog',d=>d.accept());const navigation=p.waitForNavigation();await p.locator('#full-file').setInputFiles({name:'iskra.json',mimeType:'application/json',buffer:bytes});await navigation;
  assert.deepEqual(await stored(p),backup.project);assert.equal((await stored(p,'iskra-album30-v1')).done[0],true);assert.equal((await stored(p,'iskra-gift-studio-v1')).name,'Подарочный');await c.close();
 });
 await test('invalid and cancelled full imports preserve data; failed second write rolls back both keys',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original});await p.locator('.backup-panel summary').click();const before=await p.evaluate(()=>({studio:localStorage.getItem('iskra-studio-v1'),album:localStorage.getItem('iskra-album30-v1')}));
  await p.locator('#full-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"app":"wrong"}')});await p.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('Нужна полная копия'));
  const payload={app:'iskra-backup',version:1,project:{name:'Новое',tracks:[]},album:JSON.parse(before.album)};const file={name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))};
  p.once('dialog',d=>d.dismiss());await p.locator('#full-file').setInputFiles(file);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>localStorage.getItem('iskra-studio-v1')),before.studio);
  await p.evaluate(()=>{const real=Storage.prototype.setItem;let failed=false;Storage.prototype.setItem=function(key,value){if(key==='iskra-album30-v1'&&!failed){failed=true;throw new DOMException('Full','QuotaExceededError')}return real.call(this,key,value)};});
  p.once('dialog',d=>d.accept());await p.locator('#full-file').setInputFiles(file);await p.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('Прежние данные восстановлены'));
  assert.equal(await p.evaluate(()=>localStorage.getItem('iskra-studio-v1')),before.studio);assert.equal(await p.evaluate(()=>localStorage.getItem('iskra-album30-v1')),before.album);await c.close();
 });
 await test('gift welcome starts only the gift space; share URL carries no personal data',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original},'?gift=1');assert.equal(await p.locator('#gift-welcome').isVisible(),true);await p.getByRole('button',{name:'Начать свой альбом →',exact:true}).click();assert.equal(await p.locator('#album-view').isVisible(),true);
  await p.reload();assert.equal(await p.locator('#gift-welcome').isVisible(),false);assert.deepEqual(await stored(p),original);
  await p.locator('#gift-share').click();const link=await p.getByLabel('Подарочная ссылка',{exact:true}).inputValue(),url=new URL(link);assert.equal(url.search,'?gift=1');assert.equal(url.hash,'');assert.equal(url.pathname,'/iskra/');assert.ok(!link.includes('Прежний'));await p.keyboard.press('Escape');assert.equal(await p.locator('#gift-dialog').isVisible(),false);await c.close();
 });
 await test('failed saves retry without duplicating tracks or session results',async()=>{
  const {c,p}=await fresh({},'?mode=inspire');await p.locator('#inspire-take').click();
  await p.evaluate(()=>{window.realSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')};});
  await p.getByRole('button',{name:'Прикрепить задание',exact:true}).click();await p.getByRole('button',{name:'Прикрепить задание',exact:true}).click();
  assert.equal(await p.evaluate(()=>IskraStudio.snapshot().tracks.length),1);
  await p.evaluate(()=>{Storage.prototype.setItem=window.realSetItem});await p.getByRole('button',{name:'Прикрепить задание',exact:true}).click();assert.equal((await stored(p)).tracks.length,1);
  await p.getByLabel('Результат сессии',{exact:true}).selectOption('Выбран лучший вариант');
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')};});
  await p.getByRole('button',{name:'Записать результат ✓',exact:true}).click();await p.getByRole('button',{name:'Записать результат ✓',exact:true}).click();assert.equal(await p.evaluate(()=>IskraStudio.snapshot().tracks[0].work.sessions.length),1);
  await p.evaluate(()=>{Storage.prototype.setItem=window.realSetItem});await p.getByRole('button',{name:'Записать результат ✓',exact:true}).click();assert.equal((await stored(p)).tracks[0].work.sessions.length,1);await c.close();
 });
 await test('legacy project import stays compatible with ratings and ordering',async()=>{
  const {c,p}=await fresh();p.once('dialog',d=>d.accept());await p.locator('#studio-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'iskra',version:1,project:original}))});await p.waitForFunction(()=>JSON.parse(localStorage.getItem('iskra-studio-v1'))?.tracks?.length===1);
  assert.deepEqual(await stored(p),original);await expand(p);assert.equal(await p.getByLabel('Статус',{exact:true}).inputValue(),'В альбом');assert.equal(await p.getByLabel('BPM',{exact:true}).inputValue(),'92');await c.close();
 });
 await test('all three tabs fit small phones with expanded studio tools and large rating targets',async()=>{
  const {c,p}=await fresh({'iskra-studio-v1':original});await expand(p);await p.locator('.work-extras summary').click();
  for(const width of [320,390,430,1280]){await p.setViewportSize({width,height:844});for(const mode of ['studio','album','inspire']){await p.locator('#mode-'+mode).click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,mode+' at '+width);}}
  await p.locator('#mode-studio').click();for(const heart of await p.locator('.studio-heart').all()){const b=await heart.boundingBox();assert.ok(b.width>=44&&b.height>=44);}
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/iskra-studio-gift-ready.png',fullPage:true});await c.close();
 });
 assert.deepEqual(errors,[]);console.log(count+' studio/gift scenarios passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
