/* РИТМ · адаптивный помощник. Всё локально, без запросов к внешним сервисам и без диагнозов.
   Небольшой contextual bandit: баллы задач меняются по фактическим выполнениям и заменам. */
(()=>{'use strict';
const KEY='ritm-smart-v1',Q=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const defaults=()=>({day:today(),energy:'steady',topic:'all',chosen:'',dismissed:{},stats:{},logged:{},helpOpen:false});
let s=defaults(),chosen=null,focusEnd=0,focusTick=null;
try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object'&&!Array.isArray(raw))s={...s,...raw}}catch{}
if(s.day!==today()){s.day=today();s.energy='steady';s.chosen='';s.dismissed={};s.helpOpen=false}
if(!['quiet','steady','active'].includes(s.energy))s.energy='steady';
if(!['all','творчество','движение','питание','дела','отдых'].includes(s.topic))s.topic='all';
if(!s.stats||typeof s.stats!=='object')s.stats={};
if(!s.logged||typeof s.logged!=='object')s.logged={};
if(!s.dismissed||typeof s.dismissed!=='object')s.dismissed={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function record(key,group,kind){const value=s.stats[key]||{done:0,passed:0,group};value.group=group||value.group||'дела';value[kind]=(Number(value[kind])||0)+1;s.stats[key]=value}
const coreMinutes={'Вода':1,'Зарядка':5,'Чтение книг':10,'Прогулка':5,'Саморазвитие':5,'Сон по режиму':5,'Тренировка':20,'Без переедания':5};
function context(){return window.RitmFusion?.smartContext?.()||{date:today(),today:today(),tasks:[],core:[]}}
function options(ctx){return [
...ctx.tasks.filter(t=>!t.done).map(t=>({key:'m:'+t.id,id:t.id,kind:'mini',name:t.title,emoji:t.emoji||'✳',group:t.group||'дела',min:t.min||1})),
...ctx.core.filter(h=>!h.status).map(h=>({key:'c:'+h.id,id:h.id,kind:'core',name:h.title,emoji:h.icon||'✳',group:h.id==='Вода'||h.id==='Без переедания'?'питание':h.group==='mind'?'дела':'движение',min:coreMinutes[h.id]||5}))
]}
function syncCompletions(ctx){
 if(ctx.date!==today())return;
 let changed=false;
 for(const t of ctx.tasks.filter(x=>x.done)){
  const key=ctx.date+':m:'+t.id;if(s.logged[key])continue;
  record('m:'+t.id,t.group,'done');s.logged[key]=true;changed=true;
 }
 for(const h of ctx.core.filter(x=>x.status==='done')){
  const key=ctx.date+':c:'+h.id;if(s.logged[key])continue;
  record('c:'+h.id,h.group==='mind'?'дела':'движение','done');s.logged[key]=true;changed=true;
 }
 if(changed)save();
}
function hash(text){let x=2166136261;for(const char of text){x=Math.imul(x^char.charCodeAt(0),16777619)}return (x>>>0)/4294967295}
function score(t){
 const st=s.stats[t.key]||{done:0,passed:0};
 const d=Math.max(0,Number(st.done)||0),p=Math.max(0,Number(st.passed)||0);
 // Бета-оценка успешности + бонус за часто сделанные категории.
 const learned=(d+1.5)/(d+p+3);
 const groupDone=Object.values(s.stats).reduce((a,v)=>a+(v.group===t.group?(Number(v.done)||0):0),0);
 let points=learned*5+Math.log1p(groupDone)*.43;
 points-=Math.max(0,t.min-1)*(s.energy==='quiet'?1.22:s.energy==='steady'?.19:.065);
 if(s.energy==='quiet'&&(t.group==='отдых'||t.group==='питание'||t.group==='творчество'))points+=1.15;
 if(s.energy==='active'&&t.group==='движение')points+=.85;
 if(s.energy==='steady'&&t.group==='творчество')points+=.25;
 if(s.energy==='quiet'&&t.name==='Тренировка')points-=15;
 points-=(Number(s.dismissed[t.key])||0)*3.5;
 points+=hash(today()+':'+t.key)*.55;
 return points;
}
function pick(force=false){
 const ctx=context();syncCompletions(ctx);if(s.day!==today()){s.day=today();s.energy='steady';s.chosen='';s.dismissed={};save()}
 const all=options(ctx);if(ctx.date!==today()){chosen=null;return null}
 const available=s.topic==='all'?all:all.filter(t=>t.group===s.topic);
 const eligible=available.length?available:all;
 if(!eligible.length){chosen=null;s.chosen='';save();return null}
 if(!force){const retained=eligible.find(t=>t.key===s.chosen);if(retained){chosen=retained;return retained}}
 chosen=[...eligible].sort((a,b)=>score(b)-score(a))[0];
 s.chosen=chosen.key;save();return chosen;
}
function explain(t){
 if(!t)return 'Ты уже отметил все доступные шаги на сегодня.';
 const st=s.stats[t.key],done=Number(st?.done)||0;
 if(done>=2)return '✦ Советую снова: этот шаг у тебя уже получался.';
 if(s.energy==='quiet')return '✦ Спокойный темп: маленькое действие без гонки.';
 if(s.topic!=='all')return '✦ Подобрал из выбранного направления.';
 if(t.min<=2)return '✦ Короткий старт: меньше усилий на первый шаг.';
 return '✦ Подбираю варианты по твоим действиям, а не по идеальному плану.';
}
function render(){
 if(!Q('home-easy-title'))return;
 const ctx=context();syncCompletions(ctx);const c=pick(false);
 document.querySelectorAll('[data-ritm-energy]').forEach(b=>{const a=b.dataset.ritmEnergy===s.energy;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a))});
 document.querySelectorAll('[data-ritm-topic]').forEach(b=>{const a=b.dataset.ritmTopic===s.topic;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a))});
 const otherDay=ctx.date!==today(),disabled=otherDay||!c;
 Q('home-easy-title').textContent=otherDay?'Просматриваешь другой день':c?c.name:'Можно отдыхать, ты уже справился';
 Q('home-easy-icon').textContent=otherDay?'📅':c?c.emoji:'✨';
 Q('home-easy-meta').textContent=otherDay?'Открой трекер и вернись к сегодня':c?'≈ '+(c.min<1?1:c.min)+' мин · '+(c.kind==='core'?'основная привычка':'мини-шаг'):'Сегодня больше не нужно ничего отмечать';
 Q('ritm-ai-why').textContent=otherDay?'✦ Выбери сегодня в календаре, чтобы получить новый шаг.':explain(c);
 const b=Q('home-easy-done');b.disabled=disabled;b.textContent=c?'✓ Готово, сделал':'На сегодня достаточно';
 Q('ritm-next-step').disabled=disabled;Q('ritm-stuck').disabled=otherDay;
 const bubble=document.querySelector('.ritm-first-bubble');if(bubble)bubble.textContent=c&& !otherDay?'≈ '+Math.max(1,c.min)+' МИН НА СТАРТ':'В СВОЁМ РИТМЕ';
}
function chooseNext(){if(!chosen)return;record(chosen.key,chosen.group,'passed');s.dismissed[chosen.key]=(Number(s.dismissed[chosen.key])||0)+1;s.chosen='';save();pick(true);render()}
function complete(){const t=chosen;if(!t)return;
 if(t.kind==='core'){window.RitmMain?.markHabit?.(t.id,'done')}
 else window.RitmFusion?.smartComplete?.(t.id);
 s.chosen='';save();render();
}
const rescue=[
 {group:'творчество',name:'Просто открой свой музыкальный проект',emoji:'🎹'},
 {group:'движение',name:'Встань и сделай один шаг',emoji:'🚶'},
 {group:'питание',name:'Поставь стакан воды рядом',emoji:'💧'},
 {group:'дела',name:'Убери одну вещь со стола',emoji:'✳'},
 {group:'отдых',name:'Сядь удобно и расслабь плечи',emoji:'☁️'}
];
function stuck(){
 const preferred=s.topic==='all'?(chosen?.group||'отдых'):s.topic;
 const tip=rescue.find(x=>x.group===preferred)||rescue[4];
 const id=window.RitmFusion?.smartInsert?.(tip.name,tip.group,tip.emoji,1);
 if(id){s.chosen='m:'+id;s.energy='quiet';save();render()}
 Q('ritm-start-help').hidden=false;
}
function ask(kind=''){
 const raw=kind||Q('ritm-assistant-input').value.trim().toLocaleLowerCase('ru');
 let goal='start';
 if(/музык|бит|трек|песня|вокал|гитар|сниппет|петь|мелоди/.test(raw)||raw==='music')goal='music';
 else if(/поесть|еда|рецепт|голод|питани|кушать|есть/.test(raw)||raw==='food')goal='food';
 else if(/сил нет|устал|сон|болею|плохо|отдых|тревож|страшно|напряж/.test(raw)||raw==='tired')goal='tired';
 else if(/убор|дела|хаос|порядок|квартира|разгреб/.test(raw))goal='house';
 const answers={
 music:['творчество','Не нужно писать хит прямо сейчас. Открой последний проект и просто послушай 20 секунд. Если захочется — продолжишь.'],
 food:['питание','Сейчас не надо выбирать идеальную диету. Открой «Еда», включи фильтр «До 20 минут» и выбери одно блюдо.'],
 tired:['отдых','Сегодня можно снизить планку. Удобно сядь, сделай паузу на минуту. Если плохо себя чувствуешь, не заставляй себя тренироваться.'],
 house:['дела','Не убирай всю квартиру. Возьми одну вещь и положи на место. После этого уже достаточно.'],
 start:['отдых','Не пытайся сразу выполнить весь день. Выбери один шаг до минуты, и всё. Точка входа важнее большого плана.']
 };
 const [group,msg]=answers[goal];
 if(goal==='music'||goal==='food'||goal==='house')s.topic=group;
 if(goal==='tired'||goal==='start')s.energy='quiet';
 s.chosen='';save();pick(true);window.RitmFusion?.renderCombined();render();
 const answer=Q('ritm-assistant-answer');answer.hidden=false;answer.replaceChildren();
 const text=document.createElement('p');text.textContent=msg;
 const small=document.createElement('small');small.textContent='Подсказка подобрана локально. Без отправки текста на сервер.';
 answer.append(text,small);
}
function dateUpdate(){if(s.day!==today()){s.day=today();s.energy='steady';s.chosen='';s.dismissed={};save()}render()}
function tick(){if(!focusEnd)return;const remaining=Math.max(0,Math.ceil((focusEnd-Date.now())/1000));Q('ritm-focus-time').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(remaining===0){focusEnd=0;clearInterval(focusTick);focusTick=null;Q('ritm-focus-start').textContent='Ещё 2 минуты';Q('ritm-focus-time').textContent='Готово ✓'}}
function focusStart(){if(focusEnd)return;focusEnd=Date.now()+120000;Q('ritm-focus-start').textContent='Идёт фокус…';focusTick=setInterval(tick,1000);tick()}
function focusStop(){focusEnd=0;clearInterval(focusTick);focusTick=null;Q('ritm-focus-time').textContent='02:00';Q('ritm-focus-start').textContent='Начать'}
function init(){
 if(!Q('ritm-assistant'))return;
 document.querySelectorAll('[data-ritm-energy]').forEach(b=>b.onclick=()=>{s.energy=b.dataset.ritmEnergy;s.chosen='';save();pick(true);window.RitmFusion?.renderCombined();render();Q('ritm-start-help').hidden=true});
 document.querySelectorAll('[data-ritm-topic]').forEach(b=>b.onclick=()=>{s.topic=b.dataset.ritmTopic;s.chosen='';save();pick(true);render()});
 Q('home-easy-done').onclick=complete;
 Q('ritm-next-step').onclick=chooseNext;
 Q('ritm-stuck').onclick=stuck;
 document.querySelectorAll('[data-ritm-help]').forEach(b=>b.onclick=()=>ask(b.dataset.ritmHelp));
 Q('ritm-assistant-ask').onclick=()=>ask();
 Q('ritm-assistant-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}};
 Q('ritm-ai-reset').onclick=()=>{s={...defaults(),day:today()};const ctx=context();for(const t of ctx.tasks.filter(x=>x.done))s.logged[today()+':m:'+t.id]=true;for(const h of ctx.core.filter(x=>x.status==='done'))s.logged[today()+':c:'+h.id]=true;save();Q('ritm-assistant-answer').hidden=true;Q('ritm-start-help').hidden=true;render()};
 Q('ritm-focus-start').onclick=focusStart;Q('ritm-focus-stop').onclick=focusStop;
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){dateUpdate();tick()}});
 window.addEventListener('focus',dateUpdate);
 render();
}
window.RitmSmart={render,chooseNext,stuck,getGoal:()=>({quiet:1,steady:2,active:4}[s.energy]||2),debug:()=>({day:s.day,energy:s.energy,topic:s.topic,chosen:s.chosen,learned:Object.keys(s.stats).length})};
init();
})();