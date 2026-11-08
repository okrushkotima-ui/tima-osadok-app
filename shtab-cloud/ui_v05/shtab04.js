'use strict';
// Interface only. Backend remains the verified v0.4 coordinator.
let TOKEN = '', PID = '', activeProject = null, authorized = false;
const $ = id => document.getElementById(id);
const gateNames = {
  G1: 'Реальные вызовы Джона и Рика',
  G2: 'Приватное подключение внутри ChatGPT',
  G3: 'Редактор Семён и проверенный MP4',
  G4: 'Полноценная проверка звука и изображения',
  G5: 'Полный цикл правок и финальная приёмка'
};
function setText(id, value) { const el = $(id); if (el) el.textContent = String(value ?? ''); }
function errorMessage(error) {setText('errors', String(error?.message || error || 'Неизвестная ошибка'));}
function clearError() {setText('errors', '');}
function statusLabel(s) {return ({WAITING_FOR_SOURCES:'Ожидает исходники', BLOCKED_NO_API:'Нужен API',WAITING_FOR_EDITOR:'Нужен Семён',STOPPED:'Остановлен',READY_FOR_TIMA_BRIEF:'Ожидает Тимы'})[s]||s||'Неизвестно';}
function busy(id, state, label) { const el=$(id); if (!el) return; el.disabled=state; if (label) el.textContent=label; }
async function api(path, options={}) {
  if (!TOKEN) throw new Error('Сначала подключись к Штабу');
  const headers = {...(options.headers || {}), Authorization: 'Bearer '+TOKEN};
  const res = await fetch('/api'+path,{...options,headers,cache:'no-store'});
  let data;
  try { data = await res.json(); } catch { throw new Error('Сервер вернул некорректный ответ ('+res.status+')'); }
  if (!res.ok) {let d=data?.detail; if(Array.isArray(d)) d=d.map(x=>x.msg).join('; '); throw new Error(d || ('Ошибка сервера '+res.status));}
  return data;
}
function make(tag,className,text) {const el=document.createElement(tag); if(className)el.className=className;if(text!==undefined)el.textContent=String(text);return el;}
function showGateRows(gates) {
 const container=$('gates');container.replaceChildren();
 for (const [code,name] of Object.entries(gateNames)) {
  const gate=gates?.[code]||{};
  const row=make('div','gate-row'); const number=make('span','gate-number',code); const detail=make('div','gate-content');
  detail.append(make('span','gate-label',name),make('span','gate-desc',gate.detail||'Нет подтверждения'));
  row.append(number,detail,make('span','gate-mark'+(gate.passed?' passed':''),gate.passed?'✓ ПРОЙДЕНО':'○ ОЖИДАНИЕ'));container.append(row);
 }
}
function addMessage(parent, actor, provider, body){const item=make('article','msg');item.append(make('strong','',String(actor||'')+' · '+String(provider||'неизвестный источник')),make('p','',body||''));parent.append(item);}
function renderEvents(p) {
 const parent=$('messages');parent.replaceChildren();let count=0;
 for(const m of p.messages||[]){addMessage(parent,m.actor,m.provider,m.text);count++;}
 for(const ev of (p.events||[]).filter(e=>['SOURCES_SEALED','AI_RUN_VERIFIED','TEST_RUN_NOT_VERIFIED','AGENT_API_UNAVAILABLE','STOP_ALL_FUTURE_CALLS'].includes(e.event))){parent.append(make('div','event-row','#'+ev.sequence+'  '+ev.actor+' / '+ev.event+(ev.detail?.api_response_id?' / '+ev.detail.api_response_id:'')));count++;}
 if(!count) parent.append(make('p','empty-journal','Пока нет ответов и записей передачи задач.'));
}
async function refresh() {
 if(!PID || !authorized) return;
 try {
  const p=await api('/projects/'+encodeURIComponent(PID));activeProject=p;
  setText('state',p.title);setText('projectStatus',statusLabel(p.state));$('projectStatus').className='pill '+(p.state==='WAITING_FOR_SOURCES'?'pill-wait':'pill-muted');
  showGateRows(p.fullcycle?.gates);
  const names=(p.assets||[]).filter(a=>a.kind==='source').map(a=>(a.original_name||'Файл')+' · SHA '+String(a.sha256||'').slice(0,12));
  setText('assets',names.join('\n')||'Нет загруженных материалов');
  const sealed=!!p.slice02?.sources_sealed;$('files').disabled=sealed;$('upload').disabled=sealed;$('seal').disabled=sealed||!!p.stopped;
  $('stop').disabled=!!p.stopped;
  $('details').classList.remove('hidden');$('evidence').classList.remove('hidden');
  const runs=(p.runs||[]).map(r=>r.actor+': '+(r.review_scope||'')+' · ID: '+(r.response_id||'нет')+' · API подтверждено: '+(r.verified?'да':'нет'));
  setText('evidence',runs.join('\n')||'Аудиовизуальная приёмка возможна только при наличии реального видео и звука. SRT сам по себе не доказывает качество.');
  renderEvents(p);clearError();
 } catch(e) {errorMessage(e);}
}
async function listing() {
 const projects=await api('/projects'); const list=$('list');list.replaceChildren();setText('projectCount',projects.length);
 if(!projects.length)list.append(make('p','muted tiny','Пока проектов нет. Создай первый слева.'));
 for(const p of projects){const b=make('button','project'+(p.id===PID?' is-active':''));b.type='button';b.append(make('span','project-title',p.title),make('span','project-meta',statusLabel(p.state).toUpperCase()));b.addEventListener('click',()=>{PID=p.id;listing().catch(errorMessage);refresh().catch(errorMessage);});list.append(b);}
}
$('login').addEventListener('click',async()=>{
 TOKEN=$('token').value.trim();clearError();if(!TOKEN){errorMessage('Вставь ключ доступа Render');return;}
 busy('login',true,'Проверяю доступ…');
 try {
  const health=await api('/health');authorized=true;
  $('authBadge').textContent='Подключено';$('authBadge').className='pill pill-good';
  setText('connection',health.model_api_configured?'Доступ есть. API модели настроен.':'Доступ есть. API моделей пока не подключён.');
  await listing();
  if(PID)await refresh();
  // We deliberately do not store the server secret in localStorage or cookies.
 }catch(e){authorized=false;TOKEN='';$('authBadge').textContent='Ошибка входа';$('authBadge').className='pill pill-wait';errorMessage(e);setText('connection','Ключ не принят или сервер недоступен');}
 finally{busy('login',false,'Подключиться');}
});
$('toggleKey').addEventListener('click',()=>{$('token').type=$('token').type==='password'?'text':'password';});
$('create').addEventListener('click',async()=>{
 clearError();if(!authorized){errorMessage('Сначала подключись к Штабу');return;}
 busy('create',true,'Создаю проект…');
 try{const p=await api('/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('title').value,goal:$('goal').value})});PID=p.id;await listing();await refresh();}
 catch(e){errorMessage(e);}finally{busy('create',false,'＋ Создать проект');}
});
$('files').addEventListener('change',()=>{const arr=[...$('files').files];setText('fileHint',arr.length?arr.map(x=>x.name).join(', '):'Файлы не выбраны');});
$('upload').addEventListener('click',async()=>{
 if(!PID){errorMessage('Сначала выбери проект');return;}
 const files=[...$('files').files];if(!files.length){errorMessage('Выбери MP4/SRT или ZIP');return;}
 clearError();busy('upload',true,'Загрузка…');
 try{for(const file of files){const fd=new FormData();fd.append('file',file);await api('/projects/'+encodeURIComponent(PID)+'/sources',{method:'POST',body:fd});}setText('fileHint','Загружено файлов: '+files.length);await refresh();}
 catch(e){errorMessage(e);}finally{busy('upload',false,'Загрузить выбранные файлы');}
});
$('seal').addEventListener('click',async()=>{
 if(!PID) return errorMessage('Выбери проект');
 if(!window.confirm('Завершить загрузку и передать задачу Джону? Без настроенного API модель не запустится.'))return;
 clearError();busy('seal',true,'Завершаю загрузку…');
 try{await api('/projects/'+encodeURIComponent(PID)+'/seal',{method:'POST'});await refresh();await listing();}
 catch(e){errorMessage(e);}finally{busy('seal',false,'Завершить загрузку → Джон');}
});
$('stop').addEventListener('click',async()=>{
 if(!PID) return errorMessage('Выбери проект');if(!window.confirm('Остановить проект и запретить дальнейшие автоматические вызовы?'))return;
 clearError();busy('stop',true,'Останавливаю…');
 try{await api('/projects/'+encodeURIComponent(PID)+'/stop',{method:'POST'});await refresh();await listing();}catch(e){errorMessage(e);}finally{busy('stop',false,'СТОП · Остановить проект');}
});
$('refresh').addEventListener('click',()=>refresh());
// No background polling: keep the free server quiet unless the user requests refresh.