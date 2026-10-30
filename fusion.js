/* РИТМ · быстрые дела и объединённые разделы. Данные остаются на устройстве. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const STORAGE='ritm-quick-tasks-v1';
const dateKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const POOL=[
 ['10 отжиманий','💪','движение'],['5 приседаний','⚡','движение'],['2 минуты разминки','🧘','движение'],
 ['5 минут прогулки','🌿','движение'],['Потянись 1 минуту','☀️','движение'],
 ['Добавь чеснок в блюдо','🧄','питание'],['Съешь фрукт','🍏','питание'],
 ['Добавь овощи к еде','🥒','питание'],['Выпей стакан воды','💧','питание'],
 ['Приготовь домашний приём пищи','🍳','питание'],['Положи ягоды в завтрак','🫐','питание'],
 ['Напиши 2 строчки песни','🎙️','творчество'],['Сыграй на гитаре 5 минут','🎸','творчество'],
 ['Сделай набросок бита','🎹','творчество'],['Послушай свой микс 3 минуты','🎧','творчество'],
 ['Отправь 1 сообщение артисту','✉️','дела'],['Убери стол за 3 минуты','🧹','дела'],
 ['Почитай 5 минут','📖','дела'],['Побудь минуту без телефона','🌙','дела'],
 ['Запиши одну идею','✍️','дела']
];
const GROUPS=['движение','питание','творчество','дела'];
let all={};
try{const v=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))all=v}catch{}
let shownDate=dateKey();
function initial(date){
 let n=Number(date.replaceAll('-',''))||1;
 const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 const out=[];
 for(const g of GROUPS){const group=POOL.map((p,i)=>({p,i})).filter(x=>x.p[2]===g);for(let j=group.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[group[j],group[k]]=[group[k],group[j]]}out.push(...group.slice(0,2).map(x=>'task-'+x.i))}
 // Первые два задания пользователя доступны каждый день, остальные мягко меняются.
 if(!out.includes('task-0'))out[0]='task-0';
 if(!out.includes('task-5'))out[2]='task-5';
 return {items:out,done:[]};
}
function day(){if(!all[shownDate]||!Array.isArray(all[shownDate].items)){all[shownDate]=initial(shownDate);persist()}return all[shownDate]}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(all));return true}catch{return false}}
function task(id){if(id.startsWith('task-')){const index=Number(id.slice(5)),t=POOL[index];return t?{id,title:t[0],icon:t[1],category:t[2]}:null}return day().custom?.[id]||null}
function render(){
 const d=day(),pending=d.items.filter(id=>!d.done.includes(id)).map(task).filter(Boolean);
 const done=d.done.map(task).filter(Boolean);
 $('micro-count').textContent=done.length+' из '+d.items.length;
 $('micro-left').textContent=pending.length?'Листай вбок →':'Все задания на сегодня выполнены ✨';
 const track=$('micro-track');track.replaceChildren();
 if(!pending.length){const empty=document.createElement('div');empty.className='micro-empty';empty.textContent='Сегодня всё готово. Отдых тоже часть ритма.';track.append(empty)}
 pending.forEach(t=>{
   const card=document.createElement('article');card.className='micro-card';
   const top=document.createElement('div');top.className='micro-card-top';
   const icon=document.createElement('span');icon.className='micro-icon';icon.textContent=t.icon;
   const tag=document.createElement('span');tag.className='micro-tag';tag.textContent=t.category;
   top.append(icon,tag);
   const title=document.createElement('strong');title.className='micro-title';title.textContent=t.title;
   const finish=document.createElement('button');finish.type='button';finish.className='micro-finish';finish.textContent='✓ Сделано';finish.setAttribute('aria-label','Выполнить: '+t.title);
   finish.onclick=()=>{if(!d.done.includes(t.id)){d.done.push(t.id);persist();render();try{navigator.vibrate?.(25)}catch{}}};
   card.append(top,title,finish);track.append(card)
 });
 const history=$('micro-done');history.replaceChildren();
 if(!done.length){const empty=document.createElement('p');empty.className='micro-muted';empty.textContent='Пока нет выполненных задач.';history.append(empty)}
 done.forEach(t=>{const row=document.createElement('div');row.className='micro-done-row';const name=document.createElement('span');name.textContent='✓ '+t.title;const undo=document.createElement('button');undo.type='button';undo.textContent='Вернуть';undo.onclick=()=>{d.done=d.done.filter(id=>id!==t.id);persist();render()};row.append(name,undo);history.append(row)});
 $('micro-done-title').textContent='Выполнено · '+done.length;
}
$('micro-add').addEventListener('submit',e=>{
 e.preventDefault();const input=$('micro-new');const value=input.value.trim().slice(0,70);if(!value)return;
 const d=day(),id='own-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
 d.custom??={};d.custom[id]={id,title:value,icon:'✳',category:'своё'};d.items.push(id);persist();input.value='';render();$('micro-track').scrollTo({left:100000,behavior:'smooth'});
});
let previousView='habits';
function showEmbedded(view){
 const active=view==='food'||view==='freedom',changed=previousView!==view;
 document.querySelectorAll('.fusion-frame').forEach(f=>{if(!active||f.closest('[data-view-panel]').dataset.viewPanel!==view)return;
  if(!f.getAttribute('src')||changed)f.src=f.dataset.src;
  else try{f.contentWindow.postMessage({type:'ritm-remeasure'},location.origin)}catch{}
 });
 previousView=view;
}
window.RitmFusion={showEmbedded};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='ritm-embed-size')return;
 const f=[...document.querySelectorAll('.fusion-frame')].find(el=>el.contentWindow===e.source);if(!f)return;
 const h=Math.max(400,Math.min(8500,Number(e.data.height)||800));if(Math.abs((parseFloat(f.style.height)||0)-h)>3)f.style.height=h+'px';
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&shownDate!==dateKey()){shownDate=dateKey();render()}});
window.addEventListener('focus',()=>{if(shownDate!==dateKey()){shownDate=dateKey();render()}});
window.addEventListener('storage',e=>{if(e.key!==STORAGE)return;try{all=JSON.parse(e.newValue||'{}')||{};render()}catch{}});
render();
})();