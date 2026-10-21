(()=>{'use strict';
const KEY='weight-tracke-v4',LEGACY='weight-tracke-demo-3',HABITS=[{id:'Тренировка',icon:'🏋️',sub:'Любое движение считается'},{id:'Зарядка',icon:'⚡',sub:'Хотя бы пять минут'},{id:'Вода',icon:'💧',sub:'Следить за питьём'},{id:'Прогулка',icon:'🌳',sub:'Свежий воздух и шаги'},{id:'Сон по режиму',icon:'🌙',sub:'Дать себе восстановиться'},{id:'Без переедания',icon:'🥗',sub:'Бережное питание'}];
const wins=['Ёбаный насос, какой же ты красавчик!','ВОТ ЭТО ТЫ ДАЛ, БРАТ!','Легенда, ещё одна победа!','Тимоха, это чистый разъёб!','Уровень босса разблокирован!','Ну всё, мощь пошла!','Кто сегодня машина? Ты машина!','Шаг за шагом — и ты уже сильнее!','Это называется держать слово себе!','Фейерверк заслужен, чемпион!','Да ты просто чемпион дисциплины!','Опа! Ещё один кирпичик в новую форму!'];
const encouragement=['Не каждый день обязан быть идеальным.','Завтра — новый лист, без долгов перед вчера.','Сделать паузу — не значит сдаться.','Даже большая дорога начинается с короткого шага.','Отдых — часть маршрута, брат.','Не получилось сегодня — попробуем завтра.','Стабильность важнее безупречности.','Сонный тигр тоже тигр.','Одна неудача не определяет всю историю.','Сохраняй курс, даже если сегодня тихо.','Прогресс — это возвращаться, а не не ошибаться.','Ты не обязан побеждать каждую минуту.'];
const $=id=>document.getElementById(id);const empty=()=>({weights:{},checks:{},calories:{},sleep:{},goal:70});
function validNum(n,min,max){return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max}
function sanitize(input){const d=empty();if(!input||typeof input!=='object')return d;if(validNum(Number(input.goal),25,350))d.goal=Number(input.goal);for(const [date,v] of Object.entries(input.weights||{}))if(/^\d{4}-\d\d-\d\d$/.test(date)&&validNum(Number(v),25,350))d.weights[date]=Number(v);for(const [date,v] of Object.entries(input.calories||{}))if(/^\d{4}-\d\d-\d\d$/.test(date)&&validNum(Number(v),0,10000))d.calories[date]=Number(v);for(const [date,habits] of Object.entries(input.checks||{})){if(!/^\d{4}-\d\d-\d\d$/.test(date)||!habits||typeof habits!=='object')continue;const item={};for(const h of HABITS){if(habits[h.id]===true||habits[h.id]==='done')item[h.id]='done';else if(habits[h.id]==='skip')item[h.id]='skip'}if(Object.keys(item).length)d.checks[date]=item}for(const [date,entry] of Object.entries(input.sleep||{})){if(!/^\d{4}-\d\d-\d\d$/.test(date)||!entry||typeof entry!=='object')continue;const bed=typeof entry.bed==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.bed)?entry.bed:'';const wake=typeof entry.wake==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.wake)?entry.wake:'';if(bed||wake)d.sleep[date]={bed,wake}}return d}
let data;try{const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY);data=sanitize(raw?JSON.parse(raw):null)}catch{data=empty()}
const dateKey=(dt)=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const parseKey=key=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12)};const shift=(key,days)=>{const d=parseKey(key);d.setDate(d.getDate()+days);return dateKey(d)};
const TODAY=()=>dateKey(new Date());let selected=TODAY(),toastTimeout=0,lastWin=-1,lastSkip=-1;
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{notice('Не удалось сохранить','Проверь настройки хранилища браузера.','⚠️');return false}}
function pickText(arr,last){let i=Math.floor(Math.random()*arr.length);if(arr.length>1&&i===last)i=(i+1)%arr.length;return [arr[i],i]}
function dateHuman(key){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',weekday:'long'}).format(parseKey(key))}
function statusFor(key,h){return data.checks[key]?.[h]||null}
function notice(title,desc='',icon='✨'){const el=$('celebration');$('toast-icon').textContent=icon;$('toast-title').textContent=title;$('toast-desc').textContent=desc;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2700)}
function fireworks(){if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=$('fx-layer');el.replaceChildren();const colors=['#a9ffbe','#b6a4ff','#ffd987','#ed8bb6','#8dc9ff'];for(let i=0;i<74;i++){const p=document.createElement('i');p.className='confetti';p.style.left=(40+Math.random()*20)+'%';p.style.top=(28+Math.random()*12)+'%';const a=Math.random()*Math.PI*2,d=60+Math.random()*Math.min(420,window.innerWidth*.4);p.style.setProperty('--x',Math.cos(a)*d+'px');p.style.setProperty('--y',Math.sin(a)*d+'px');p.style.setProperty('--r',(Math.random()*1100-550)+'deg');p.style.background=colors[i%colors.length];p.style.animationDelay=Math.random()*.14+'s';el.append(p)}setTimeout(()=>el.replaceChildren(),1550)}

/* RITM sonic palette — sourced CC0 Kenney WAV samples, no oscillators. */
let soundEnabled=true;
try{soundEnabled=localStorage.getItem('ritm-sound')!=='off'}catch{}
const soundToggle=$('sound-toggle');
const SAMPLES={
  success:'./sounds/success.wav',
  impact:'./sounds/impact.wav',
  skip:'./sounds/soft-no.wav',
  warm:'./sounds/warm.wav',
  tap:'./sounds/tap.wav'
};
const soundCache={};
if(typeof Audio==='function'){
  for(const [name,url] of Object.entries(SAMPLES)){
    const a=new Audio(url);
    a.preload='auto';
    soundCache[name]=a;
  }
}
function playSample(name,volume=.3,rate=1,delay=0){
  if(!soundEnabled)return;
  const start=()=>{
    if(!soundEnabled)return;
    try{
      const origin=soundCache[name];
      if(!origin)return;
      const sample=origin.cloneNode(true);
      sample.volume=volume;
      sample.playbackRate=rate;
      sample.play().catch(()=>{});
    }catch{}
  };
  if(delay>0)setTimeout(start,delay);else start();
}
function updateSoundButton(){
  if(!soundToggle)return;
  soundToggle.setAttribute('aria-pressed',String(soundEnabled));
  soundToggle.setAttribute('aria-label',soundEnabled?'Выключить звуки':'Включить звуки');
  soundToggle.title=soundEnabled?'Звуки включены':'Звуки выключены';
  soundToggle.textContent=soundEnabled?'♫':'♪';
}
updateSoundButton();
if(soundToggle)soundToggle.onclick=()=>{
  soundEnabled=!soundEnabled;
  try{localStorage.setItem('ritm-sound',soundEnabled?'on':'off')}catch{}
  updateSoundButton();
  if(soundEnabled)playSample('tap',.24,.84);
};
function playWin(){
  // Short tactile low hit followed by a restrained confirmation.
  playSample('impact',.27,.79);
  playSample('success',.3,.86,42);
}
function playSkip(){
  // Gentle, darker two-layer cue with no punitive buzz or game melody.
  playSample('warm',.16,.69);
  playSample('skip',.27,.67,85);
}

function setHabit(h,state){data.checks[selected]??={};if(state===null)delete data.checks[selected][h];else data.checks[selected][h]=state;if(Object.keys(data.checks[selected]).length===0)delete data.checks[selected];save();render();if(state==='done'){playWin();fireworks();const [msg,i]=pickText(wins,lastWin);lastWin=i;notice(msg,h+' — выполнено. Едем дальше!','🎉')}else if(state==='skip'){playSkip();const [msg,i]=pickText(encouragement,lastSkip);lastSkip=i;notice('Пауза тоже часть ритма.',msg,'🌙')}}
function renderDays(){const dates=[];for(let i=-3;i<=3;i++)dates.push(shift(selected,i));$('days').replaceChildren(...dates.map(day=>{const d=parseKey(day),dayOfWeek=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()];const b=document.createElement('button');b.type='button';b.className='day'+(day===selected?' selected':'')+(Object.values(data.checks[day]||{}).includes('done')?' has-done':'');b.innerHTML=`<span>${dayOfWeek}</span><strong>${d.getDate()}</strong>`;b.title=dateHuman(day);b.setAttribute('aria-label',dateHuman(day));b.setAttribute('aria-pressed',day===selected?'true':'false');b.onclick=()=>{selected=day;render()};return b}));$('next-day').disabled=selected>=TODAY();$('next-day').style.opacity=selected>=TODAY()?'.35':'1';$('active-day-label').textContent=selected===TODAY()?'Сегодня':dateHuman(selected)}
function renderHabits(){const list=$('habit-list');list.replaceChildren();let count=0;HABITS.forEach(h=>{const state=statusFor(selected,h.id);if(state==='done')count++;const card=document.createElement('article');card.className='habit';card.dataset.state=state||'neutral';const top=document.createElement('div');top.className='habit-top';const icon=document.createElement('div');icon.className='habit-icon';icon.textContent=h.icon;const label=document.createElement('div');const name=document.createElement('div');name.className='habit-name';name.textContent=h.id;const note=document.createElement('div');note.className='habit-note';note.textContent=state==='done'?'✦ Выполнено!':state==='skip'?'☾ Сегодня пропущено':h.sub;label.append(name,note);top.append(icon,label);const actions=document.createElement('div');actions.className='habit-buttons';const done=document.createElement('button');done.type='button';done.className=state==='done'?'done-active':'';done.textContent='✓ Сделано';done.setAttribute('aria-pressed',state==='done'?'true':'false');done.setAttribute('aria-label',`Сделано: ${h.id}`);done.onclick=()=>setHabit(h.id,'done');const skip=document.createElement('button');skip.type='button';skip.className=state==='skip'?'skip-active':'';skip.textContent='☾ Сегодня нет';skip.setAttribute('aria-pressed',state==='skip'?'true':'false');skip.setAttribute('aria-label',`Сегодня нет: ${h.id}`);skip.onclick=()=>setHabit(h.id,'skip');actions.append(done,skip);if(state){const reset=document.createElement('button');reset.type='button';reset.className='reset';reset.textContent='↶';reset.title=`Сбросить: ${h.id}`;reset.setAttribute('aria-label',`Сбросить: ${h.id}`);reset.onclick=()=>setHabit(h.id,null);actions.append(reset)}card.append(top,actions);list.append(card)});$('done-counter').innerHTML=count+'<small>/6</small>';$('daily-caption').textContent=count===6?'Все шесть. Легенда!':count?'Отличное начало':'Всё впереди'}
function renderSleep(){const entry=data.sleep[selected]||{};$('sleep-bed').value=entry.bed||'';$('sleep-wake').value=entry.wake||'';const out=$('sleep-result');if(!entry.bed&&!entry.wake){out.textContent='За этот день пока нет записи о сне';return}if(entry.bed&&entry.wake){const toMins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};const total=(toMins(entry.wake)-toMins(entry.bed)+1440)%1440;const h=Math.floor(total/60),m=total%60;out.textContent=total?'🌙 '+h+' ч '+(m?m+' мин':'')+' между отметками сна':'Уточни время — отметки совпадают'}else out.textContent='✓ Записано: '+(entry.bed?'уснул в '+entry.bed:'проснулся в '+entry.wake)}
function renderOverview(){const all=Object.entries(data.weights).sort((a,b)=>a[0].localeCompare(b[0]));const last=all.at(-1);$('current-weight').textContent=last?last[1].toLocaleString('ru-RU')+' кг':'—';$('weight-caption').textContent=last?'От '+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(parseKey(last[0])):'Первая запись впереди';$('goal-value').innerHTML=data.goal.toLocaleString('ru-RU')+' <small>кг</small>';$('goal-input').value=data.goal;$('weight-input').value=data.weights[selected]??'';$('cal-input').value=data.calories[selected]??'';$('cal-hint').textContent=data.calories[selected]!==undefined?'Сохранено: '+data.calories[selected]+' ккал':'Можно пропускать без последствий.';$('human-date').textContent=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(parseKey(TODAY()))}
function chart(){const all=Object.entries(data.weights).sort((a,b)=>a[0].localeCompare(b[0])).slice(-24);const svg=$('weight-chart');svg.replaceChildren();const ns='http://www.w3.org/2000/svg';function el(name,attrs,text){const n=document.createElementNS(ns,name);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));if(text!==undefined)n.textContent=text;svg.append(n);return n}for(let i=0;i<4;i++)el('line',{x1:35,x2:622,y1:22+i*48,y2:22+i*48,stroke:'#2d4055','stroke-dasharray':'4 7'});if(!all.length){el('text',{x:320,y:106,'text-anchor':'middle',fill:'#91a6c1','font-size':16},'Запиши первый вес — появится график');$('chart-caption').textContent='Пока нет измерений';return}const values=all.map(x=>x[1]),lo=Math.min(...values)-.6,hi=Math.max(...values)+.6,range=Math.max(hi-lo,1);const points=all.map(([date,v],i)=>[35+(all.length===1?0.5:i/(all.length-1))*587,171-(v-lo)/range*137]);if(points.length>1)el('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#a7f8c2','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'});points.forEach(([x,y])=>el('circle',{cx:x,cy:y,r:4.5,fill:'#b9ffe1',stroke:'#244c4a','stroke-width':2}));el('text',{x:35,y:201,fill:'#98acc5','font-size':13},new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(parseKey(all[0][0])));el('text',{x:622,y:201,fill:'#98acc5','font-size':13,'text-anchor':'end'},new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(parseKey(all.at(-1)[0])));const delta=Math.round((values.at(-1)-values[0])*10)/10;$('chart-caption').textContent=all.length===1?'Одна запись':all.length+' записей · '+(delta>0?'+':'')+delta+' кг за период'}
function renderWeek(){const now=TODAY();const dow=(parseKey(now).getDay()+6)%7,mon=shift(now,-dow);const weeks=[];let active=0;for(let i=0;i<7;i++){const day=shift(mon,i),isFuture=day>now,hit=Object.values(data.checks[day]||{}).includes('done');if(hit)active++;const box=document.createElement('div');box.className='week-cell';const label=document.createElement('span');label.textContent=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i];const b=document.createElement('b');b.className=(hit?'hit ':'')+(day===now?'today':'');b.textContent=isFuture?'·':hit?'✓':'—';box.append(label,b);weeks.push(box)}$('week-grid').replaceChildren(...weeks);$('week-summary').textContent=active+' из 7 дней с победами ✦';$('week-insight').textContent=active===0?'Начни с одного маленького действия — этого достаточно, чтобы сдвинуться с места.':active===7?'Каждый день этой недели с маленькой победой. Вот это серия!':`На этой неделе уже ${active} ${active===1?'день':active<5?'дня':'дней'} с победами. Не идеальность, а возвращение к привычкам.`}

let analyticsPeriod='day';
function analyticsDays(){
  const today=TODAY();
  let start=selected, end=selected;
  if(analyticsPeriod==='week'){const dow=(parseKey(selected).getDay()+6)%7;start=shift(selected,-dow);end=shift(start,6)}
  if(analyticsPeriod==='month'){const d=parseKey(selected);start=dateKey(new Date(d.getFullYear(),d.getMonth(),1,12));end=dateKey(new Date(d.getFullYear(),d.getMonth()+1,0,12))}
  if(analyticsPeriod==='all'){const keys=Object.keys(data.checks).filter(k=>k<=today&&/^\d{4}-\d\d-\d\d$/.test(k)).sort();return keys.length?keys:[today]}
  if(end>today)end=today;
  const out=[];for(let day=start;day<=end&&out.length<400;day=shift(day,1))out.push(day);
  return out;
}

let analyticsChart='ring';
function drawAnalyticsPlot(){
  const panel=$('analytics-plot-panel'),ring=$('analytics-ring-panel'),isRing=analyticsChart==='ring';
  ring.hidden=!isRing;panel.hidden=isRing;
  document.querySelectorAll('.analytics-chart-btn').forEach(b=>{const active=b.dataset.chart===analyticsChart;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  if(isRing)return;
  const days=analyticsDays(),svg=$('analytics-plot'),ns='http://www.w3.org/2000/svg';
  svg.replaceChildren();
  function node(tag,attrs={},txt){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(txt!==undefined)el.textContent=txt;svg.append(el);return el}
  const x0=56,x1=652,y0=24,y1=236;
  let dataPoints=[],unit='день';
  const ratioFor=day=>Object.values(data.checks[day]||{}).filter(x=>x==='done').length/6*100;
  if(analyticsPeriod==='day'){
    dataPoints=HABITS.map((h,i)=>({label:h.id==='Сон по режиму'?'Сон':h.id==='Без переедания'?'Питание':h.id,short:['Трен.','Зар.','Вода','Шаги','Сон','Питан.'][i],score:statusFor(selected,h.id)==='done'?100:0}));
    unit='привычка';$('plot-caption').textContent='X — привычки выбранного дня · Y — выполнено, %';
  }else if(analyticsPeriod==='all'){
    const months=new Map();
    for(const day of days){
      const k=day.slice(0,7);const item=months.get(k)||{sum:0,count:0};
      item.sum+=ratioFor(day);item.count++;months.set(k,item);
    }
    dataPoints=Array.from(months,([month,item])=>({label:month,score:item.sum/item.count,short:month.slice(5)+'.'+month.slice(2,4)}));
    if(dataPoints.length>24)dataPoints=dataPoints.slice(-24);
    unit='месяц';$('plot-caption').textContent='X — месяцы (последние 24) · Y — среднее выполнение, %';
  }else{
    dataPoints=days.map(day=>({label:dateHuman(day),short:day.slice(8,10)+'.'+day.slice(5,7),score:ratioFor(day)}));
    $('plot-caption').textContent='X — даты · Y — доля выполненных привычек, %';
  }
  for(let p=0;p<=100;p+=25){
    const y=y1-(p/100)*(y1-y0);
    node('line',{x1:x0,y1:y,x2:x1,y2:y,stroke:'#34434d','stroke-dasharray':p===0?'0':'3 6','stroke-width':p===0?1.6:1});
    node('text',{x:x0-12,y:y+4,fill:'#94a4b2','font-size':12,'text-anchor':'end'},p+'%');
  }
  const count=dataPoints.length;
  const step=(x1-x0)/Math.max(count,1);
  const xs=dataPoints.map((p,i)=>x0+step*(i+.5));
  const ys=dataPoints.map(p=>y1-p.score/100*(y1-y0));
  const labEvery=Math.max(1,Math.ceil(count/7));
  if(analyticsChart==='bars'){
    const width=Math.max(5,Math.min(42,step*.64));
    dataPoints.forEach((p,i)=>{
      const h=Math.max(p.score>0?3:0,y1-ys[i]);
      const bar=node('rect',{x:xs[i]-width/2,y:y1-h,width,height:h,rx:Math.min(6,width/4),fill:'#9edebf'});
      const t=document.createElementNS(ns,'title');t.textContent=p.label+': '+Math.round(p.score)+'%';bar.append(t);
    });
  }else{
    if(count>1){
      const points=xs.map((x,i)=>x+','+ys[i]).join(' ');
      node('polyline',{points,fill:'none',stroke:'#a5e2c4','stroke-width':3.4,'stroke-linejoin':'round','stroke-linecap':'round'});
    }
    dataPoints.forEach((p,i)=>{
      const cir=node('circle',{cx:xs[i],cy:ys[i],r:count>20?3:4.5,fill:'#e3fff0',stroke:'#457a68','stroke-width':1.4});
      const t=document.createElementNS(ns,'title');t.textContent=p.label+': '+Math.round(p.score)+'%';cir.append(t)
    });
  }
  dataPoints.forEach((p,i)=>{
    if(i%labEvery!==0&&i!==count-1)return;
    node('text',{x:xs[i],y:259,fill:'#aebac5','font-size':count>18?10:11,'text-anchor':'middle'},p.short)
  });
  node('text',{x:(x0+x1)/2,y:287,fill:'#8495a2','font-size':11,'text-anchor':'middle'},'Время / '+unit);
}
document.querySelectorAll('.analytics-chart-btn').forEach(button=>button.addEventListener('click',()=>{
  analyticsChart=button.dataset.chart;drawAnalyticsPlot();
}));

function renderAnalytics(){
  const days=analyticsDays(),numDays=days.length||1;
  const tally={};HABITS.forEach(h=>tally[h.id]={done:0,skip:0});
  let done=0,skipped=0,active=0;
  for(const day of days){let any=false;for(const h of HABITS){const st=statusFor(day,h.id);if(st==='done'){done++;any=true;tally[h.id].done++}else if(st==='skip'){skipped++;tally[h.id].skip++}}if(any)active++}
  const total=6*numDays,pct=Math.round(done/total*100);
  const labels={day:'За день',week:'За неделю',month:'За месяц',all:'За всё время'};
  $('analytics-orb').style.setProperty('--percent',pct);
  $('analytics-percent').textContent=pct+'%';
  $('analytics-range').textContent=labels[analyticsPeriod];
  $('analytics-main').innerHTML=done+' <small>из '+total+'</small>';
  $('analytics-caption').textContent=pct===100?'Все цели выполнены. Вот это ритм!':done?'Каждый выполненный шаг идёт в зачёт':'Первый шаг ещё впереди';
  $('analytics-done').textContent=done;
  $('analytics-skipped').textContent=skipped;
  $('analytics-active').textContent=active;
  $('analytics-period-label').textContent=analyticsPeriod==='day'?dateHuman(selected):analyticsPeriod==='all'?'Все отмеченные дни':dateHuman(days[0])+' — '+dateHuman(days.at(-1));
  $('analytics-footnote').textContent=analyticsPeriod==='all'?'За всё время считаются дни, когда ты отмечал привычки.':('В периоде '+numDays+' '+(numDays===1?'день':numDays<5?'дня':'дней')+'. Максимум — 6 привычек в день.');
  const frag=document.createDocumentFragment();
  for(const h of HABITS){
    const item=document.createElement('div');item.className='analytics-habit';
    const heading=document.createElement('div');heading.className='analytics-habit-head';
    const title=document.createElement('span');title.textContent=h.icon+' '+h.id;
    const value=document.createElement('strong');value.textContent=tally[h.id].done+' / '+numDays;
    heading.append(title,value);
    const track=document.createElement('div');track.className='analytics-mini-track';
    const fill=document.createElement('div');fill.className='analytics-mini-fill';fill.style.width=(tally[h.id].done/numDays*100)+'%';
    track.append(fill);item.append(heading,track);frag.append(item);
  }
  $('analytics-habits').replaceChildren(frag);
  document.querySelectorAll('.analytics-tab').forEach(btn=>{const active=btn.dataset.period===analyticsPeriod;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});
  drawAnalyticsPlot();
}
document.querySelectorAll('.analytics-tab').forEach(btn=>btn.addEventListener('click',()=>{analyticsPeriod=btn.dataset.period;renderAnalytics()}));

function render(){renderOverview();renderDays();renderHabits();renderSleep();renderWeek();chart();renderAnalytics()}
$('prev-day').onclick=()=>{selected=shift(selected,-1);render()};$('next-day').onclick=()=>{if(selected<TODAY()){selected=shift(selected,1);render()}};
$('weight-form').onsubmit=e=>{e.preventDefault();const n=Number($('weight-input').value);if(!validNum(n,25,350))return notice('Проверь вес','Можно указать значение от 25 до 350 кг.','⚠️');data.weights[selected]=n;save();render();notice('Вес записан','Важно видеть тенденцию, а не одну цифру.','⚖️')};
$('cal-form').onsubmit=e=>{e.preventDefault();const n=Number($('cal-input').value);if($('cal-input').value.trim()===''||!validNum(n,0,10000))return notice('Проверь калории','Можно указать значение от 0 до 10 000.','⚠️');data.calories[selected]=n;save();render();notice('Записано','Без погони за идеальными цифрами.','🍽️')};
$('goal-form').onsubmit=e=>{e.preventDefault();const n=Number($('goal-input').value);if(!validNum(n,25,350))return notice('Проверь цель','Допустимое значение от 25 до 350 кг.','⚠️');data.goal=n;save();render();notice('Цель сохранена','Менять цель — нормально.','🎯')};
const VALID_VIEWS=['habits','weight','week','settings'];
function setView(name){
  if(!VALID_VIEWS.includes(name))name='habits';
  document.querySelectorAll('[data-view-panel]').forEach(panel=>{panel.hidden=panel.dataset.viewPanel!==name});
  document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===name;button.classList.toggle('selected',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('settings-toggle').onclick=()=>setView('settings');
$('sleep-form').onsubmit=e=>{
  e.preventDefault();
  const bed=$('sleep-bed').value,wake=$('sleep-wake').value;
  if(!bed&&!wake){notice('Укажи время','Заполни хотя бы одно поле — сон или пробуждение.','🌙');return}
  data.sleep[selected]={bed,wake};save();renderSleep();
  notice('Сон записан','Каждая ночь — ещё одна часть твоего ритма.','🌙');
};
$('export-btn').onclick=()=>{const blob=new Blob([JSON.stringify({app:'tima-osadok-tracker',version:4,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ritm-backup-'+TODAY()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notice('Резервная копия скачана','Сохрани файл в надёжном месте.','💾')};
$('import-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('Слишком большой файл');const raw=JSON.parse(await file.text());if(!['moya-forma','tima-osadok-tracker'].includes(raw.app)||raw.version!==4||!raw.data||typeof raw.data!=='object')throw Error('Неверный формат');if(!confirm('Заменить текущие записи данными из копии?'))return;data=sanitize(raw.data);save();selected=TODAY();render();notice('Данные восстановлены','Записи из резервной копии загружены.','✅')}catch{notice('Не удалось загрузить','Выбери резервную копию из этого приложения.','⚠️')}finally{e.target.value=''}};
let lastDate=TODAY();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&lastDate!==TODAY()){if(selected===lastDate)selected=TODAY();lastDate=TODAY();render()}});
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
})();
