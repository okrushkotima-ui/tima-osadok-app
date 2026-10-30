
(()=>{'use strict';
const $=id=>document.getElementById(id);const KEY='svoboda_tima_v3';const OLDKEY='svoboda_tima_v1';
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const dayValue=SvobodaCoach.dayValue;
function monday(){const d=new Date();let day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const fmt=x=>Number(x).toLocaleString('ru-RU',{maximumFractionDigits:1});const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=d=>new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
const uid=()=>Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
let storageBlocked=false;
function read(k){try{const raw=localStorage.getItem(k);if(raw===null)return null;const data=JSON.parse(raw);if(!SvobodaCoach.validState(data))throw Error('format');return data;}catch{storageBlocked=true;return null;}}
let source=read(KEY),fromOld=!source&&!storageBlocked?read(OLDKEY):null,state=source||fromOld||{};
if(!source&&fromOld&&!Array.isArray(fromOld.foodJournal)&&Array.isArray(fromOld.foodLog))state={...fromOld,foodJournal:fromOld.foodLog.map(x=>({...x,id:uid(),date:x.date||today(),meal:'Запись',text:String(x.text||'').slice(0,1000)}))};
function clean(){state=SvobodaCoach.normalize(state);}clean();
function save(){
 const status=$('storageStatus');
 if(storageBlocked){status.textContent='Не удалось прочитать прежние данные. Они не перезаписаны. Восстанови корректную резервную копию.';status.dataset.error='true';return false;}
 try{localStorage.setItem(KEY,JSON.stringify(state));status.textContent='Данные на этом устройстве · автосохранение';status.dataset.error='false';return true;}
 catch{status.textContent='Изменения не сохранены. Скачай копию в настройках, затем проверь место и доступ к хранилищу.';status.dataset.error='true';return false;}
}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function nav(tab){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===tab));document.querySelectorAll('.nav button').forEach(x=>{x.classList.toggle('active',x.dataset.tab===tab);x.setAttribute('aria-current',x.dataset.tab===tab?'page':'false')});window.scrollTo({top:0,behavior:'instant'});render()}
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.tab)));$('settingsOpen').addEventListener('click',()=>nav('settings'));$('goProgress').onclick=()=>nav('progress');$('goSport').onclick=()=>nav('sport');
function weightStart(){return state.startWeight??state.weights.find(x=>x.d<=today())?.v??null;}
function lastWeight(){return state.weights.filter(x=>x.d<=today()).at(-1)?.v??null;}
function changeText(v){return (v>0?'+':'')+fmt(v)+' кг'}
function smartWeight(){
 const curr=lastWeight(),start=weightStart(),goal=state.goalWeight;
 $('currentWeight').textContent=curr==null?'—':fmt(curr);$('goalPill').textContent=goal==null?'Цель по желанию':'цель: '+fmt(goal)+' кг';$('goalStats').textContent=goal==null?'Не задана':fmt(goal)+' кг';
 $('weightChange').textContent=curr==null?'Добавь первое измерение':start==null?'Первый замер':start===curr?'Стартовая точка':changeText(curr-start)+' с начала';
 const total=start!=null&&goal!=null?start-goal:0,done=start!=null&&curr!=null?start-curr:0,percent=curr==null||total<=0?0:Math.max(0,Math.min(100,done/total*100));
 $('goalFill').style.width=percent+'%';const meter=$('goalFill').parentElement;meter.hidden=goal==null||start==null||total<=0;meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.setAttribute('aria-valuenow',String(Math.round(percent)));
 $('weightGoalDetail').textContent=curr==null?'Первый замер покажет отправную точку.':goal==null?'Можно отслеживать динамику без числовой цели.':((total>0&&curr<=goal)||Math.abs(curr-goal)<0.05)?'Цель достигнута. Дальше — устойчивое самочувствие и поддержание результата.':total>0?'Пройдено '+Math.round(percent)+'% пути к твоей цели.':'Число на весах не должно становиться оценкой всего дня.';
 $('totalLost').textContent=curr==null||start==null?'—':changeText(curr-start);
 const trend=SvobodaCoach.weightTrend(state.weights,today());$('weekTrend').textContent=trend.change==null?'Пока мало данных':changeText(trend.change);$('trendCoverage').textContent='Последние 7 дней: '+trend.recent.length+' замеров · предыдущие 7: '+trend.previous.length+'. Измеряй в похожих условиях, если тебе комфортно.';
 renderChart('homeChart');renderChart('weightChart');
}
function plural(num,forms){const n=Math.abs(num)%100,n1=n%10;if(n>10&&n<20)return forms[2];return n1===1?forms[0]:n1>1&&n1<5?forms[1]:forms[2]}
function sober(){SvobodaCoach.sober();}
function daily(){SvobodaCoach.daily();}
function recordWeight(weight,waist){if(!Number.isFinite(weight)||weight<25||weight>350){toast('Проверь вес');return}const d=today(),prior=state.weights.find(x=>x.d===d),v={d,v:weight,waist:waist??prior?.waist??null};if(!state.weights.length&&state.startWeight==null)state.startWeight=weight;state.weights=state.weights.filter(x=>x.d!==d);state.weights.push(v);state.weights.sort((a,b)=>a.d.localeCompare(b.d));const saved=save();render();if(saved)toast('Замер сохранён')}
$('quickWeightForm').onsubmit=e=>{e.preventDefault();recordWeight(Number($('quickWeight').value),null);$('quickWeight').value=''};
$('measureForm').onsubmit=e=>{e.preventDefault();const raw=$('measureWaist').value;const w=raw?Number(raw):null;if(w!==null&&(w<35||w>220)){toast('Проверь обхват талии');return}recordWeight(Number($('measureWeight').value),w);$('measureWeight').value='';$('measureWaist').value=''};
function renderChart(target){const el=$(target),v=SvobodaCoach.dailyWeights(state.weights).filter(x=>x.d<=today()).slice(-30);if(!v.length){el.innerHTML='<div class="graphempty">Добавь измерение веса — здесь появится график</div>';return}if(v.length===1){el.innerHTML=`<div class="graphempty">Первый замер — ${fmt(v[0].v)} кг.<br>Второй замер покажет динамику.</div>`;return}const w=640,h=220,pL=42,pT=20,pB=30,pR=15,min=Math.min(...v.map(x=>x.v))-.8,max=Math.max(...v.map(x=>x.v))+.8,span=Math.max(.1,max-min),x=i=>pL+(dayValue(v[i].d)-dayValue(v[0].d))*(w-pL-pR)/Math.max(1,dayValue(v[v.length-1].d)-dayValue(v[0].d)),y=num=>pT+(max-num)/span*(h-pT-pB),pts=v.map((a,i)=>`${x(i).toFixed(1)},${y(a.v).toFixed(1)}`).join(' ');const grid=[0,.5,1].map(n=>{const val=max-(max-min)*n;const yy=y(val);return `<line x1="${pL}" y1="${yy}" x2="${w-pR}" y2="${yy}" stroke="#455773" stroke-dasharray="4 7" opacity=".6"/><text x="0" y="${yy+4}" font-size="13" fill="#b0c0d6">${fmt(val)}</text>`}).join('');el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="График веса: от ${fmt(v[0].v)} до ${fmt(v[v.length-1].v)} кг">${grid}<polyline points="${pts}" stroke="#a5e6c8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${v.map((a,i)=>`<circle cx="${x(i)}" cy="${y(a.v)}" r="${i===v.length-1?6:3.5}" fill="#b4f4d4"/>`).join('')}<text x="${pL}" y="${h-4}" font-size="13" fill="#95aac4">${formatDate(v[0].d)}</text><text x="${w-pR}" text-anchor="end" y="${h-4}" font-size="13" fill="#95aac4">${formatDate(v[v.length-1].d)}</text></svg>`}
function weightHistory(){$('weightHistory').innerHTML=state.weights.slice().reverse().slice(0,20).map(x=>`<div class="record"><div><strong>${fmt(x.v)} кг · ${formatDate(x.d)}</strong><p>${x.waist?`Талия: ${fmt(x.waist)} см`:'Без замера талии'}</p></div><button class="xbtn" data-delete-weight="${esc(x.d)}" aria-label="Удалить замер" type="button">×</button></div>`).join('')||'<div class="empty">Измерений пока нет</div>'}
$('weightHistory').onclick=e=>{const b=e.target.closest('[data-delete-weight]');if(!b)return;if(!confirm('Удалить этот замер?'))return;state.weights=state.weights.filter(x=>x.d!==b.dataset.deleteWeight);save();render()};
const recipes=[[
{name:'Омлет с овощами и тостом',ing:['3 яйца','1 помидор','1 огурец','2 ломтика цельнозернового хлеба'],how:'Сделай омлет на небольшом количестве масла. Добавь нарезанные овощи и тост.'},
{name:'Овсянка с йогуртом и бананом',ing:['овсяные хлопья 60 г','греческий йогурт 150 г','1 банан','орехи 15 г'],how:'Свари овсянку, добавь йогурт, банан и немного орехов.'},
{name:'Творог с ягодами',ing:['творог 200 г','ягоды 100 г','1–2 ломтика цельнозернового хлеба'],how:'Смешай творог с ягодами, рядом подай тост. Для вкуса можно добавить корицу.'},
{name:'Яйца и гречка с помидорами',ing:['2 яйца','гречка 60 г (сухая)','2 помидора','зелень'],how:'Приготовь гречку и яйца. Добавь овощи и зелень.'}],
[{name:'Курица, рис и овощной салат',ing:['куриная грудка 180 г','рис 70 г (сухой)','1 огурец','1 помидор','масло 1 ч. л.'],how:'Отвари рис, запеки или обжарь курицу, сделай свежий салат.'},
{name:'Индейка с гречкой',ing:['индейка 180 г','гречка 70 г (сухая)','1 огурец','1 морковь'],how:'Отвари гречку, индейку приготовь на сковороде. Подай с овощами.'},
{name:'Куриный суп с картофелем',ing:['курица 180 г','картофель 200 г','1 морковь','½ луковицы','зелень'],how:'Свари лёгкий куриный суп с картофелем, морковью и луком. Добавь зелень.'},
{name:'Говядина с булгуром',ing:['нежирная говядина 180 г','булгур 70 г (сухой)','овощи 200 г'],how:'Потуши говядину до мягкости, отвари булгур и добавь овощи.'}],
[{name:'Рыба с картофелем в духовке',ing:['рыба 180 г','картофель 250 г','овощи 200 г','йогурт 100 г'],how:'Запеки рыбу и картофель до готовности. Подай с овощами и йогуртом.'},
{name:'Курица и гречка с овощами',ing:['куриная грудка 170 г','гречка 60 г (сухая)','1 болгарский перец','1 огурец'],how:'Приготовь курицу и гречку. Добавь свежие овощи.'},
{name:'Тёплый салат с индейкой',ing:['индейка 170 г','салатные листья','1 помидор','1 яйцо','1 ломтик хлеба'],how:'Обжарь индейку, смешай с овощами и яйцом. Добавь тост.'},
{name:'Творог и овощной сэндвич',ing:['творог 200 г','2 ломтика цельнозернового хлеба','1 огурец','1 помидор','зелень'],how:'Сделай сэндвич с творогом и свежими овощами. Можно дополнить любимым фруктом.'}]];
recipes[0].push({name:'Тост с хумусом и овощами',ing:['хумус 100 г','2 ломтика цельнозернового хлеба','1 помидор','1 огурец'],how:'Намажь хумус на тосты, добавь овощи. Хумус можно заменить размятой фасолью.'});
recipes[1].push({name:'Чечевица с рисом и овощами',ing:['чечевица 70 г (сухая)','рис 50 г (сухой)','овощи 250 г','масло 1 ч. л.'],how:'Отвари чечевицу и рис по инструкции на упаковке. Добавь тушёные или свежие овощи.'});
recipes[2].push({name:'Фасоль с картофелем и салатом',ing:['готовая фасоль 200 г','картофель 200 г','овощи 200 г','масло 1 ч. л.'],how:'Запеки или отвари картофель. Промой готовую фасоль, подогрей и подай с овощами.'});
window.RitmRecipes?.addTo(recipes);
const mealNames=['Завтрак','Обед','Ужин'];
function renderMeals(){SvobodaCoach.renderMeals();}
function renderShopping(){SvobodaCoach.renderShopping();}
function renderFoodJournal(){SvobodaCoach.renderFoodJournal();}
$('recipeCards').onclick=e=>SvobodaCoach.mealClick(e);
$('shoppingBtn').onclick=()=>{$('shoppingList').classList.toggle('hide');renderShopping();};
$('shoppingList').onchange=e=>SvobodaCoach.shoppingChange(e);
$('foodJournalForm').onsubmit=e=>{e.preventDefault();SvobodaCoach.addJournal();};
$('foodJournal').onclick=e=>{const b=e.target.closest('[data-delete-food]');if(!b)return;SvobodaCoach.removeJournal(b.dataset.deleteFood);};
$('fastingMode').onchange=()=>{state.fastingMode=$('fastingMode').value;if(save())toast('Режим сохранён');};

function thisWeekActs(){const first=dayValue(monday()),last=first+6;return state.activities.filter(x=>dayValue(x.date)>=first&&dayValue(x.date)<=last)}
function sportSummary(){const acts=thisWeekActs(),walk=acts.filter(x=>x.type==='Ходьба').reduce((sum,x)=>sum+x.min,0),strength=acts.filter(x=>x.type.startsWith('Силовая')).length;$('walkMinutes').textContent=walk;$('strengthCount').textContent=strength;$('homeWalk').textContent=walk+' мин';$('homeStrength').textContent=strength+' / 2';$('walkFill').style.width=Math.min(100,walk/150*100)+'%';$('homeWalkFill').style.width=Math.min(100,walk/150*100)+'%';$('strengthFill').style.width=Math.min(100,strength/2*100)+'%';const first=dayValue(monday());$('weekRows').innerHTML=Array.from({length:7},(_,i)=>{const d=new Date((first+i)*86400000),date=d.toISOString().slice(0,10),list=acts.filter(x=>x.date===date),mins=list.reduce((a,x)=>a+x.min,0);return `<div class="weekitem"><em>${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</em><div class="weektrack"><i style="width:${Math.min(100,mins/60*100)}%"></i></div><span class="numb">${mins} мин</span></div>`}).join('')}
$('sportForm').onsubmit=e=>{e.preventDefault();const min=Number($('sportMins').value);if(!Number.isFinite(min)||min<1||min>480)return;state.activities.push({id:uid(),date:today(),type:$('sportType').value,min});const saved=save();render();if(saved)toast('Тренировка записана')};
document.querySelectorAll('[data-plan]').forEach(x=>x.onclick=()=>{$('sportType').value=x.dataset.plan;$('sportMins').value=x.dataset.duration;$('sportType').scrollIntoView({behavior:'smooth',block:'center'});toast('План выбран — запиши после тренировки')});
function sportHistory(){$('sportHistory').innerHTML=state.activities.slice().reverse().slice(0,15).map(x=>`<div class="record"><div><strong>${esc(x.type)}</strong><p>${x.min} минут · ${formatDate(x.date)}</p></div><button type="button" class="xbtn" data-delete-sport="${esc(x.id)}" aria-label="Удалить тренировку">×</button></div>`).join('')||'<div class="empty">Первая тренировка ещё впереди</div>'}
$('sportHistory').onclick=e=>{const b=e.target.closest('[data-delete-sport]');if(!b)return;state.activities=state.activities.filter(x=>x.id!==b.dataset.deleteSport);save();render()};
$('moodForm').onsubmit=e=>{e.preventDefault();state.moods[today()]={sleep:Number($('moodSleep').value),energy:Number($('moodEnergy').value),anxiety:Number($('moodAnxiety').value),craving:Number($('moodCraving').value)};if(save()){$('moodSaved').textContent='Сохранено за сегодня';toast('Самочувствие записано')}};
function renderSettings(){$('settingGoal').value=state.goalWeight??'';$('settingStartWeight').value=state.startWeight??'';$('settingStartDate').value=state.start;$('fastingMode').value=state.fastingMode;if(state.moods[today()]){const m=state.moods[today()];for(const [key,id] of [['sleep','moodSleep'],['energy','moodEnergy'],['anxiety','moodAnxiety'],['craving','moodCraving']])$(id).value=m[key]??$(id).value;$('moodSaved').textContent='Самочувствие сегодня уже записано'}else $('moodSaved').textContent=''}
$('settingsForm').onsubmit=e=>{e.preventDefault();const rawGoal=$('settingGoal').value.trim(),goal=rawGoal?Number(rawGoal):null,startW=$('settingStartWeight').value.trim(),start=$('settingStartDate').value;if((goal!==null&&(!Number.isFinite(goal)||goal<35||goal>250))||!Number.isFinite(dayValue(start))||start>today()){toast('Проверь цель и дату начала пути');return;}if(startW&&(!Number.isFinite(Number(startW))||Number(startW)<25||Number(startW)>350)){toast('Проверь стартовый вес');return;}state.goalWeight=goal;state.startWeight=startW?Number(startW):null;state.start=start;const saved=save();render();if(saved)toast('Настройки сохранены');};
$('restartSober').onclick=()=>{if(!confirm('Начать новый этап сегодня? Вся история трезвости, веса и питания сохранится.'))return;state.start=today();const saved=save();render();if(saved)toast('Новый этап начат. История сохранена');};

$('exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='svoboda-backup-'+today()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)};
$('importButton').onclick=()=>$('importInput').click();
$('importInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;$('importStatus').textContent='Проверяем файл…';try{if(file.size>10000000)throw Error('Файл слишком большой');const data=JSON.parse(await file.text());if(!SvobodaCoach.validState(data))throw Error('Нужна резервная копия Свободы с корректными записями');if(!confirm('Заменить текущие данные резервной копией? История в файле станет текущей.')){$('importStatus').textContent='Восстановление отменено. Данные не изменены.';return;}const previous=state,wasBlocked=storageBlocked;state=SvobodaCoach.normalize(data);storageBlocked=false;if(!save()){state=previous;storageBlocked=wasBlocked;render();$('importStatus').textContent='Восстановление не сохранено. Прежние данные оставлены.';return;}SvobodaCoach.newDay();render();$('importStatus').textContent='Данные восстановлены';toast('Данные восстановлены');}catch(error){$('importStatus').textContent='Копия не восстановлена: '+error.message;}finally{e.target.value='';}};

function render(){sober();smartWeight();daily();renderMeals();renderFoodJournal();sportSummary();sportHistory();weightHistory();renderSettings();SvobodaCoach.render()}
SvobodaCoach.connect({get:()=>state,save,render,nav,today,dayValue,esc,fmt,formatDate,uid,toast,recipes,mealNames});
window.RitmRecipes?.init(recipes);
render();save();
let lastDate=today();function refreshDay(){if(today()!==lastDate){lastDate=today();SvobodaCoach.newDay();render();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});setInterval(refreshDay,60000);
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});

})();
