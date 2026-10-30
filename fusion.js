/* РИТМ · единый трекер. Совместим со старыми записями localStorage. */
(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='ritm-quick-tasks-v1';
const groups=[['движение','Движение','⚡'],['питание','Питание','🥗'],['творчество','Музыка','🎹'],['дела','Дела','✳'],['отдых','Отдых','🌙']];
/* Индексы первых 20 задач сохраняются, чтобы не испортить историю. */
const pool=[
 ['10 отжиманий','💪','движение',2],['5 приседаний','⚡','движение',1],['2 минуты разминки','🧘','движение',2],
 ['5 минут прогулки','🌿','движение',5],['Потянись 1 минуту','☀️','движение',1],
 ['Добавь чеснок в блюдо','🧄','питание',1],['Съешь фрукт','🍏','питание',1],
 ['Добавь овощи к еде','🥒','питание',1],['Выпей стакан воды','💧','питание',1],
 ['Приготовь домашний приём пищи','🍳','питание',15],['Положи ягоды в завтрак','🫐','питание',1],
 ['Напиши 2 строчки песни','🎙️','творчество',3],['Сыграй на гитаре 5 минут','🎸','творчество',5],
 ['Сделай набросок бита','🎹','творчество',5],['Послушай свой микс 3 минуты','🎧','творчество',3],
 ['Отправь 1 сообщение артисту','✉️','дела',2],['Убери стол за 3 минуты','🧹','дела',3],
 ['Почитай 5 минут','📖','дела',5],['Побудь минуту без телефона','🌙','дела',1],
 ['Запиши одну идею','✍️','дела',2],
 ['Пройдись 3 минуты','🚶','движение',3],['Сделай мягкую растяжку','🪷','движение',3],
 ['Потанцуй под любимый трек','🎶','движение',3],['Разомни плечи и шею','🧍','движение',2],
 ['Добавь белок в еду','🥚','питание',2],['Продумай завтрашний завтрак','🍞','питание',2],
 ['Приготовь овощной перекус','🥕','питание',3],['Налей себе чай','🍵','питание',2],
 ['Придумай цепляющую строчку','🔥','творчество',4],['Запиши 10 секунд мелодии','🎤','творчество',3],
 ['Найди новый звук для бита','🎛️','творчество',3],['Набросай идею сниппета','📱','творчество',4],
 ['Разбери 5 файлов','🖥️','дела',3],['Проветри комнату','🪟','дела',2],
 ['Ответь на важное сообщение','📩','дела',2],['Подготовь одежду на завтра','👕','дела',2],
 ['Сделай 5 спокойных вдохов','🌬️','отдых',1],['Отдохни 3 минуты без экрана','🌙','отдых',3],
 ['Послушай любимую песню','🎼','отдых',4],['Назови один успех за день','💚','отдых',1],
 ['Посиди в тишине 2 минуты','🌌','отдых',2],['Расслабь плечи и челюсть','☁️','отдых',1]
];
const dateKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const previousDate=key=>{const [y,m,d]=key.split('-').map(Number),day=new Date(y,m-1,d,12);day.setDate(day.getDate()-1);return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-')};
let all={},shownDate=dateKey(),filter='all',lastUndo=null,timer;
try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))all=raw}catch{}
function toast(msg,undo=false){const e=$('micro-toast');if(!e)return;clearTimeout(timer);$('micro-toast-label').textContent=msg;$('micro-toast-undo').hidden=!undo;e.hidden=false;timer=setTimeout(()=>{e.hidden=true;lastUndo=null},7000)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(all));return true}catch{toast('Не удалось сохранить. Проверь хранилище Safari.');return false}}
function newDay(date){
 let n=Number(date.replaceAll('-',''))||1;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 const items=[];
 groups.forEach(([g])=>{
  const arr=pool.map((p,i)=>({p,i})).filter(x=>x.p[2]===g);
  for(let j=arr.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[arr[j],arr[k]]=[arr[k],arr[j]]}
  items.push(...arr.slice(0,2).map(x=>'task-'+x.i));
 });
 if(!items.includes('task-0'))items[0]='task-0';
 if(!items.includes('task-5'))items[2]='task-5';
 return {items,done:[],custom:{},swapped:[]};
}
function day(){
 if(!all[shownDate]||!Array.isArray(all[shownDate].items)){all[shownDate]=newDay(shownDate);save()}
 const d=all[shownDate];if(!Array.isArray(d.done))d.done=[];
 if(!d.custom||typeof d.custom!=='object')d.custom={};
 if(!Array.isArray(d.swapped))d.swapped=[];
 return d;
}
function getTask(id,d=day()){
 if(typeof id!=='string')return null;
 if(/^task-\d+$/.test(id)){const p=pool[Number(id.slice(5))];return p?{id,title:p[0],emoji:p[1],group:p[2],min:p[3]}:null}
 const t=d.custom[id];return t&&typeof t.title==='string'?{id,title:t.title,emoji:'✳',group:'своё',min:0}:null;
}
function streak(){
 let n=0,key=shownDate;
 if(!all[key]?.done?.length)key=previousDate(key);
 for(let i=0;i<365;i++){if(!all[key]?.done?.length)break;n++;key=previousDate(key)}return n;
}
function finish(t){const d=day();if(d.done.includes(t.id))return;d.done.push(t.id);save();lastUndo={id:t.id,date:shownDate};render(true);toast('Готово! Маленькая победа засчитана.',true);try{navigator.vibrate?.(20)}catch{}}
function restore(id,date=shownDate){const d=all[date];if(!d||!Array.isArray(d.done))return;d.done=d.done.filter(x=>x!==id);save();render(true);toast('Вернул задачу в список.')}
function swap(t){
 if(!t.id.startsWith('task-'))return;
 const d=day(),index=d.items.indexOf(t.id);if(index<0)return;
 const opts=pool.map((p,i)=>({p,id:'task-'+i})).filter(x=>x.p[2]===t.group&&!d.items.includes(x.id)&&!d.swapped.includes(x.id));
 if(!opts.length){toast('В этой категории больше вариантов пока нет.');return}
 const chosen=opts[(d.swapped.length*3+index+Number(shownDate.slice(-2)))%opts.length];
 d.items[index]=chosen.id;d.swapped.push(t.id);save();render(true);toast('Заменил задание. Без штрафов.');
}
function render(keepScroll=false){
 const d=day(),tasks=d.items.map(id=>getTask(id,d)).filter(Boolean),done=tasks.filter(t=>d.done.includes(t.id)),pending=tasks.filter(t=>!d.done.includes(t.id));
 const percentage=tasks.length?Math.round(done.length/tasks.length*100):0;
 $('micro-count').textContent=done.length+' / '+tasks.length;
 $('micro-left').textContent=pending.length?pending.length+' шагов впереди · в своём темпе':'Все задания выполнены. Отдых тоже часть ритма.';
 $('micro-progress-fill').style.width=percentage+'%';
 $('micro-progress-rail').setAttribute('aria-valuenow',String(percentage));
 $('micro-progress-rail').setAttribute('aria-valuetext',done.length+' из '+tasks.length+' выполнено');
 $('micro-streak').textContent=streak()+' дн. с победами';
 const filters=$('micro-filters');filters.replaceChildren();
 [{id:'all',title:'Все',emoji:''},...groups.map(([id,title,emoji])=>({id,title,emoji})),{id:'своё',title:'Мои',emoji:'✳'}].forEach(g=>{
  const b=document.createElement('button');b.type='button';b.className='micro-chip'+(filter===g.id?' active':'');
  b.setAttribute('aria-pressed',String(filter===g.id));const count=pending.filter(t=>g.id==='all'||t.group===g.id).length;
  b.textContent=(g.emoji?g.emoji+' ':'')+g.title+(count?' · '+count:'');b.onclick=()=>{filter=g.id;render()};filters.append(b);
 });
 const track=$('micro-track'),pos=keepScroll?track.scrollLeft:0;track.replaceChildren();
 const show=pending.filter(t=>filter==='all'||t.group===filter);
 if(!show.length){
  const e=document.createElement('div');e.className='micro-empty';
  e.textContent=pending.length?'В этой категории всё готово.':'Ты выполнил все запланированные шаги на сегодня.';
  if(pending.length){const b=document.createElement('button');b.className='micro-back';b.type='button';b.textContent='Показать всё';b.onclick=()=>{filter='all';render()};e.append(b)}
  track.append(e);
 }
 show.forEach(t=>{
  const card=document.createElement('article');card.className='micro-card';card.setAttribute('role','listitem');card.dataset.category=t.group;
  const top=document.createElement('div');top.className='micro-card-top';
  const icon=document.createElement('span');icon.className='micro-icon';icon.textContent=t.emoji;
  const label=document.createElement('span');label.className='micro-tag';label.textContent=groups.find(g=>g[0]===t.group)?.[1]||'Своё';top.append(icon,label);
  const center=document.createElement('div');center.className='micro-card-copy';
  const name=document.createElement('strong');name.className='micro-title';name.textContent=t.title;
  const time=document.createElement('small');time.className='micro-time';time.textContent=t.min?'≈ '+t.min+' мин':'Твоё собственное задание';center.append(name,time);
  const actions=document.createElement('div');actions.className='micro-actions';
  const ok=document.createElement('button');ok.type='button';ok.className='micro-finish';ok.textContent='✓ Сделано';ok.setAttribute('aria-label','Выполнить: '+t.title);ok.onclick=()=>finish(t);actions.append(ok);
  if(t.id.startsWith('task-')){const change=document.createElement('button');change.type='button';change.className='micro-swap';change.textContent='↻';change.title='Другое задание';change.setAttribute('aria-label','Заменить: '+t.title);change.onclick=()=>swap(t);actions.append(change)}
  card.append(top,center,actions);track.append(card);
 });
 if(keepScroll)track.scrollLeft=pos;
 const history=$('micro-done');history.replaceChildren();
 if(!done.length){const p=document.createElement('p');p.className='micro-muted';p.textContent='Выполненное появится здесь.';history.append(p)}
 done.slice().reverse().forEach(t=>{
  const line=document.createElement('div');line.className='micro-done-row';const name=document.createElement('span');name.textContent='✓ '+t.title;
  const undo=document.createElement('button');undo.type='button';undo.textContent='Вернуть';undo.onclick=()=>restore(t.id);line.append(name,undo);history.append(line);
 });
 $('micro-done-title').textContent='Выполнено сегодня · '+done.length;
 renderSnapshot();
}
function renderSnapshot(){
 try{
  const raw=localStorage.getItem('svoboda_tima_v3')||localStorage.getItem('svoboda_tima_v1'),s=raw?JSON.parse(raw):{};
  const today=dateKey(),meals=s.mealChecks?.[today]||{};
  const count=[0,1,2].filter(i=>meals[i]===true).length;
  $('fusion-food-done').textContent=count+' / 3';
  const act=(s.activities||[]).filter(x=>x.date===today&&Number.isFinite(x.min)).reduce((a,x)=>a+x.min,0);
  $('fusion-activity').textContent=act+' мин';
  const old=s.weights?.filter(x=>x.d<=today)?.at(-1)?.v;
  $('fusion-last-weight').textContent=Number.isFinite(old)?old.toLocaleString('ru-RU')+' кг':'—';
 }catch{}
}
$('micro-add').addEventListener('submit',e=>{e.preventDefault();const input=$('micro-new'),title=input.value.trim().slice(0,70);if(!title)return;
 const d=day(),id='own-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
 d.custom[id]={id,title};d.items.push(id);save();input.value='';filter='all';render();toast('Добавил твою задачу.');
});
$('micro-toast-undo').onclick=()=>{const prev=lastUndo;lastUndo=null;if(prev)restore(prev.id,prev.date)};
document.querySelectorAll('[data-fusion-go]').forEach(b=>b.onclick=()=>{
 document.querySelector('[data-view="'+b.dataset.fusionGo+'"]')?.click();
 if(b.dataset.fusionTarget)document.querySelector('[data-freedom-tab="'+b.dataset.fusionTarget+'"]')?.click();
});
document.querySelectorAll('[data-freedom-tab]').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('[data-freedom-tab]').forEach(x=>x.classList.toggle('active',x===b));
 const frame=$('fusion-balance-frame');if(frame){frame.dataset.target=b.dataset.freedomTab;
  try{frame.contentWindow?.postMessage({type:'ritm-open-tab',tab:b.dataset.freedomTab},location.origin)}catch{}
 }
});
function showEmbedded(view){
 if(view!=='food'&&view!=='freedom')return;
 const frame=document.querySelector('[data-view-panel="'+view+'"] .fusion-frame');if(!frame)return;
 if(!frame.getAttribute('src'))frame.src=frame.dataset.src;
 else try{frame.contentWindow?.postMessage({type:'ritm-remeasure'},location.origin)}catch{}
 renderSnapshot();
}
window.RitmFusion={showEmbedded,renderSnapshot,reload:()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');all=v&&typeof v==='object'?v:{};shownDate=dateKey();filter='all';render()}catch{}}};
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||!e.data)return;
 const f=[...document.querySelectorAll('.fusion-frame')].find(x=>x.contentWindow===e.source);if(!f)return;
 if(e.data.type==='ritm-embed-ready'){
  const tab=f.dataset.target||(e.data.kind==='food'?'food':'today');
  try{f.contentWindow.postMessage({type:'ritm-open-tab',tab},location.origin)}catch{}
  return;
 }
 if(e.data.type!=='ritm-embed-size')return;
 const height=Math.max(400,Math.min(16000,Number(e.data.height)||800));
 if(Math.abs((parseFloat(f.style.height)||0)-height)>4)f.style.height=height+'px';
 renderSnapshot();
});
function refresh(){if(shownDate!==dateKey()){shownDate=dateKey();filter='all';render()}else renderSnapshot()}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('focus',refresh);
window.addEventListener('storage',e=>{if(e.key===KEY){try{all=JSON.parse(e.newValue||'{}')||{};render()}catch{}}else if(e.key?.startsWith('svoboda_'))renderSnapshot()});
render();
})();