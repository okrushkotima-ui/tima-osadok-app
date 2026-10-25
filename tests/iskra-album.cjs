// Run against python -m http.server 8000 in the repository root.
// Requires Playwright 1.62.1 and Chromium; no app dependencies are needed.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const base=(process.env.ISKRA_TEST_URL||'http://127.0.0.1:8000/iskra/').replace(/\/?$/,'/');
const storageKey='iskra-album30-v1';
const studio={name:'Мой прежний альбом',tracks:[{id:'keep-me',name:'Не трогай этот трек',bpm:'96',key:'Am',stage:'Демо',status:'В альбом',rating:4,revisit:true,notes:'Сохранить все поля'}]};
const legacy={day:7,done:Array.from({length:30},(_,i)=>i===0||i===6),mode:'album',custom:'keep'};
const errors=[];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let checks=0;
 async function test(name,fn){await fn();checks++;console.log('PASS',name);}
 async function context(seed={}){const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.evaluate(data=>{localStorage.clear();for(const [k,v] of Object.entries(data))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},seed);await p.goto(base+'?mode=album');return {c,p};}
 async function saved(p,key=storageKey){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
 async function day(p,n){await p.locator('#album-jump').selectOption(String(n));assert.equal(await p.locator('#album-day').textContent(),String(n+1).padStart(2,'0'));}
 async function fill(p,result='full'){
  const fields=p.locator('#album-mission fieldset');
  await fields.nth(0).locator('input').first().check();await fields.nth(1).locator('input').first().check();
  await p.locator(`input[name="mission-result"][value="${result}"]`).check();
 }
 try{
 await test('legacy progress, studio tracks and unrelated user data survive migration',async()=>{
  const {c,p}=await context({[storageKey]:legacy,'iskra-studio-v1':studio,'ritm-user-data':'do-not-touch'});
  const s=await saved(p);assert.equal(s.day,7);assert.deepEqual(s.done,legacy.done);assert.equal(s.custom,'keep');assert.equal(s.answers.length,30);
  assert.deepEqual(await saved(p,'iskra-studio-v1'),studio);assert.equal(await p.evaluate(()=>localStorage.getItem('ritm-user-data')),'do-not-touch');
  await day(p,0);await p.locator('#album-mission fieldset').first().locator('input').first().check();assert.equal((await saved(p)).done[0],true,'old completed days remain completed when answering new questions');
  await p.locator('#mode-studio').click();assert.equal(await p.locator('#studio-view').isVisible(),true);assert.match(await p.locator('#studio-tracks').textContent(),/Не трогай/);
  await p.locator('#mode-inspire').click();assert.equal(await p.locator('#inspire-view').isVisible(),true);await p.locator('#next').click();assert.ok((await p.locator('#prompt').textContent()).length>5);
  assert.deepEqual(await saved(p,'iskra-studio-v1'),studio);await c.close();
 });
 await test('all 30 distinct missions complete with choices, persist notes and survive reload',async()=>{
  const {c,p}=await context();const titles=new Set();let choices=0,notes=0;
  for(let i=0;i<30;i++){
   await day(p,i);titles.add(await p.locator('#album-title').textContent());assert.ok((await p.locator('.mission-action').textContent()).length>70);
   assert.equal(await p.locator('#album-mission fieldset').count(),3);choices+=3;
   await fill(p,i%2?'minimum':'full');
   const note=p.locator('.mission-note textarea');if(await note.count()){notes++;await p.locator('.mission-note summary').click();await note.fill('Моя заметка '+i+' <текст>');}
   await p.locator('#album-done').click();assert.equal((await saved(p)).done[i],true);
   if(i===0){await p.reload();assert.equal(await p.locator('.mission-note textarea').inputValue(),'Моя заметка 0 <текст>');assert.equal(await p.locator('input[name="mission-0-0"]').first().isChecked(),true);}
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no mobile overflow on day '+(i+1));
  }
  assert.equal(titles.size,30);assert.equal(notes,12);assert.ok(choices/(choices+notes)>=.8&&choices/(choices+notes)<=.9);assert.equal(await p.locator('#album-progress-text').textContent(),'30 / 30');
  await p.reload();assert.equal((await saved(p)).done.filter(Boolean).length,30);assert.equal(await p.locator('#album-next').isDisabled(),true);
  await p.locator('#album-done').click();assert.equal((await saved(p)).done[29],false);assert.equal((await saved(p)).answers[29].result,'minimum');
  await p.reload();assert.equal(await p.locator('#album-progress-text').textContent(),'29 / 30');await c.close();
 });
 await test('completion requires answers and an actual result; partial work and multi-select limit persist',async()=>{
  const {c,p}=await context();await p.locator('#album-done').click();assert.equal((await saved(p)).done[0],false);assert.match(await p.locator('#album-status').textContent(),/вопрос 1/);
  const fields=p.locator('#album-mission fieldset');await fields.nth(0).locator('input').first().check();
  for(let i=0;i<3;i++)await fields.nth(1).locator('input').nth(i).check().catch(e=>{if(i!==2)throw e;});
  assert.equal(await fields.nth(1).locator('input:checked').count(),2);assert.match(await p.locator('#album-status').textContent(),/не больше 2/);
  await p.locator('input[name="mission-result"][value="later"]').check();await p.locator('#album-done').click();assert.equal((await saved(p)).done[0],false);
  await p.reload();assert.equal(await fields.nth(1).locator('input:checked').count(),2);assert.equal(await p.locator('input[value="later"]').isChecked(),true);
  await p.locator('input[value="minimum"]').check();await p.locator('#album-done').click();assert.equal((await saved(p)).done[0],true);
  await p.locator('input[value="later"]').check();assert.equal((await saved(p)).done[0],false);await c.close();
 });
 await test('gift mode keeps personal answers, progress and tracks isolated',async()=>{
  const {c,p}=await context({[storageKey]:legacy,'iskra-studio-v1':studio});const personal=await saved(p);
  await p.goto(base+'?gift=1&mode=album');assert.equal(await p.locator('#album-progress-text').textContent(),'0 / 30');await fill(p);await p.locator('#album-done').click();
  assert.deepEqual(await saved(p),personal);assert.deepEqual(await saved(p,'iskra-studio-v1'),studio);assert.equal((await saved(p,'iskra-gift-album30-v1')).done[0],true);
  await p.locator('#mode-studio').click();assert.equal(await p.locator('.studio-track').count(),0);await c.close();
 });
 await test('export/import round-trip includes answers, notes, day and marks without touching tracks',async()=>{
  const {c,p}=await context({'iskra-studio-v1':studio});await fill(p);await p.locator('.mission-note summary').click();await p.locator('.mission-note textarea').fill('Резервная копия');await p.locator('#album-done').click();
  const pending=p.waitForEvent('download');await p.locator('#album-export').click();const download=await pending;const bytes=await fs.readFile(await download.path());const backup=JSON.parse(bytes);assert.equal(backup.album.answers[0].note,'Резервная копия');assert.equal(backup.album.done[0],true);
  await p.locator('#album-done').click();assert.equal((await saved(p)).done[0],false);
  p.once('dialog',d=>d.accept());await p.locator('#album-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});await p.waitForFunction(()=>JSON.parse(localStorage.getItem('iskra-album30-v1')).done[0]);
  assert.equal((await saved(p)).answers[0].note,'Резервная копия');assert.deepEqual(await saved(p,'iskra-studio-v1'),studio);
  const before=await saved(p);await p.locator('#album-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"app":"iskra-missions","version":1,"album":{}}')});await p.waitForFunction(()=>document.querySelector('#album-status').textContent.includes('Неверный формат'));
  assert.deepEqual(await saved(p),before);await c.close();
 });
 await test('corrupt legacy data is reported and never overwritten',async()=>{
  const {c,p}=await context({[storageKey]:'{bad json'});await fill(p);assert.equal(await p.evaluate(k=>localStorage.getItem(k),storageKey),'{bad json');assert.match(await p.locator('#album-save-status').textContent(),/Прежние данные не перезаписаны/);await c.close();
 });
 await test('storage write failure is visible and export remains usable',async()=>{
  const {c,p}=await context();await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};});await fill(p);await p.locator('#album-done').click();assert.equal(await p.locator('#album-save-status').getAttribute('data-error'),'true');assert.match(await p.locator('#album-status').textContent(),/не сохранена/);
  const pending=p.waitForEvent('download');await p.locator('#album-export').click();const d=await pending;assert.equal(JSON.parse(await fs.readFile(await d.path(),'utf8')).album.done[0],true);await c.close();
 });
 await test('320px, 390px, 430px and desktop layouts fit; controls remain touch-friendly',async()=>{
  const {c,p}=await context();for(const width of [320,390,430,1280]){await p.setViewportSize({width,height:844});await day(p,29);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await p.locator('#album-jump option').count(),30);for(const label of await p.locator('.mission-option').all()){const box=await label.boundingBox();assert.ok(box.height>=44);}}
  await p.setViewportSize({width:390,height:844});await day(p,0);await p.screenshot({path:'/tmp/iskra-mobile-tested.png',fullPage:true});await c.close();
 });
 await test('native keyboard navigation selects options and completes a day',async()=>{
  const {c,p}=await context();const input=p.locator('#album-mission fieldset').first().locator('input').first();await input.focus();await p.keyboard.press('Space');assert.equal(await input.isChecked(),true);await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#album-mission fieldset').first().locator('input').nth(1).isChecked(),true);await fill(p);await p.locator('#album-done').focus();await p.keyboard.press('Enter');assert.equal((await saved(p)).done[0],true);await c.close();
 });
 assert.deepEqual(errors,[],'no browser runtime errors');console.log(`${checks} scenarios passed; all 30 missions executed.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
