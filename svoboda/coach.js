/* Локальные инструменты трезвости и питания. Данные не отправляются на сервер. */
window.SvobodaCoach=(()=>{
'use strict';
let api,selectedFood=[],timerInterval=null,currentUrgeId=null;
const $=id=>document.getElementById(id),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const components={protein:'Белковая еда',vegetables:'Овощи',starch:'Крупа / картофель / хлеб',fruit:'Фрукты / ягоды',dairy:'Молочное',other:'Другое'};
const triggers={stress:['Стресс','До вечера убери алкоголь из доступа. Подготовь короткую прогулку или спокойное занятие и человека, которому можно написать.'],company:['Компания','Заранее выбери безалкогольный напиток и способ уйти. Можно сказать: «Сегодня я не пью» — объяснения необязательны.'],hunger:['Голод','Подготовь обычную сытную еду. Голод может сделать трудный вечер ещё сложнее; голодать ради веса сейчас не нужно.'],tired:['Усталость','Сократи вечерние обязательства и подготовь отдых. Сегодня достаточно базовой заботы о себе.'],lonely:['Одиночество','Договорись о коротком звонке или встрече с человеком, которому доверяешь. Не обязательно справляться одному.'],habit:['Привычный ритуал','Измени маршрут или привычное место вечером. Приготовь замену ритуалу: чай, душ, книгу или прогулку.']};
const needs={hunger:['Голоден','Если давно не ел, приготовь обычную еду или перекус. Если хочется пить — выбери безалкогольный напиток.'],stress:['Напряжён','Поставь ноги на пол, спокойно дыши без задержек, назови пять предметов вокруг. Переместись туда, где алкоголя нет рядом.'],lonely:['Нужен человек','Напиши или позвони: «Меня сейчас тянет выпить. Можешь побыть со мной на связи?» Можно обратиться к своему специалисту.'],tired:['Устал','По возможности снизь нагрузку: присядь, выключи лишние уведомления, отложи необязательные дела. Не заменяй отдых интенсивной тренировкой.']};
const reasons={clarity:'Ради ясной головы и возможности самому выбирать следующий шаг.',sleep:'Ради устойчивого сна и восстановления. Изменения могут идти постепенно.',health:'Ради самочувствия, о котором хочется заботиться без наказаний.',family:'Ради присутствия рядом с важными людьми. Поддержку можно попросить.',self:'Ради свободы выбирать. Трудный момент не определяет тебя целиком.'};
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function dayValue(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;const [y,m,d]=s.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));return date.toISOString().slice(0,10)===s?date.getTime()/86400000:NaN;}
const dateOK=s=>Number.isFinite(dayValue(s)),number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
function validState(s){
 if(!object(s)||(s.app!==undefined&&s.app!=='svoboda')||!['weights','activities','foodJournal','foodLog','start','daily'].some(k=>k in s))return false;
 if(s.start!==undefined&&!dateOK(s.start))return false;
 if(s.goalWeight!=null&&!number(s.goalWeight,35,250))return false;if(s.startWeight!=null&&!number(s.startWeight,25,350))return false;
 if(s.weights!==undefined&&(!Array.isArray(s.weights)||s.weights.some(x=>!object(x)||!dateOK(x.d)||!number(x.v,25,350)||(x.waist!=null&&!number(x.waist,35,220)))))return false;
 if(s.activities!==undefined&&(!Array.isArray(s.activities)||s.activities.some(x=>!object(x)||!dateOK(x.date)||typeof x.type!=='string'||!number(x.min,1,480))))return false;
 if(s.foodLog!==undefined&&(!Array.isArray(s.foodLog)||s.foodLog.some(x=>!object(x)||typeof x.text!=='string'||x.text.length>1000||(x.date!==undefined&&!dateOK(x.date)))))return false;
 if(s.foodJournal!==undefined&&(!Array.isArray(s.foodJournal)||s.foodJournal.some(x=>!object(x)||!dateOK(x.date)||typeof x.text!=='string'||x.text.length>1000||(x.components!==undefined&&(!Array.isArray(x.components)||x.components.some(v=>!Object.hasOwn(components,v)))))))return false;
 for(const key of ['daily','mealChecks','moods','menuByDate','shopping'])if(s[key]!==undefined&&!object(s[key]))return false;
 for(const key of ['daily','mealChecks'])if(s[key]&&Object.entries(s[key]).some(([date,entry])=>!dateOK(date)||!object(entry)||Object.values(entry).some(v=>typeof v!=='boolean')))return false;
 if(s.moods&&Object.entries(s.moods).some(([date,m])=>!dateOK(date)||!object(m)||['sleep','energy','anxiety','craving'].some(k=>m[k]!==undefined&&!number(m[k],0,k==='sleep'?24:10))))return false;
 if(s.choices!==undefined&&(!Array.isArray(s.choices)||s.choices.length>3||s.choices.some(x=>!Number.isInteger(x))))return false;
 if(s.menuByDate&&Object.entries(s.menuByDate).some(([date,menu])=>!dateOK(date)||!Array.isArray(menu)||menu.length!==3||menu.some(x=>!Number.isInteger(x)||x<0)))return false;
 if(s.shopping&&Object.entries(s.shopping).some(([date,items])=>!dateOK(date)||!object(items)||Object.values(items).some(v=>typeof v!=='boolean')))return false;
 if(s.sobriety!==undefined){
  const b=s.sobriety;if(!object(b))return false;
  if(b.days!==undefined&&(!object(b.days)||Object.entries(b.days).some(([date,v])=>!dateOK(date)||date>today()||!object(v)||!['sober','drank'].includes(v.status))))return false;
  if(b.triggers!==undefined&&(!object(b.triggers)||Object.entries(b.triggers).some(([date,v])=>!dateOK(date)||!Array.isArray(v)||v.length>2||new Set(v).size!==v.length||v.some(id=>!Object.hasOwn(triggers,id)))))return false;
  if(b.contact!==undefined&&(!object(b.contact)||typeof b.contact.name!=='string'||typeof b.contact.phone!=='string'||b.contact.name.length>80||b.contact.phone.length>30))return false;
  if(b.urges!==undefined&&(!Array.isArray(b.urges)||b.urges.some(x=>!object(x)||!Number.isFinite(Date.parse(x.at))||!['easier','same','support'].includes(x.result)||!number(x.intensity,0,10)||!Object.hasOwn(needs,x.need))))return false;
  if(b.timer!=null&&(!object(b.timer)||!number(b.timer.startedAt,0,Number.MAX_SAFE_INTEGER)||b.timer.endsAt-b.timer.startedAt!==600000||!number(b.timer.intensity,0,10)||!Object.hasOwn(needs,b.timer.need)))return false;
 }
 return true;
}
function normalize(s){
 const result={...s,app:'svoboda',schemaVersion:4,start:dateOK(s.start)?s.start:today(),goalWeight:s.goalWeight??null,startWeight:s.startWeight??null};
 result.weights=Array.isArray(s.weights)?s.weights.map(x=>({...x})).sort((a,b)=>a.d.localeCompare(b.d)):[];
 const journal=Array.isArray(s.foodJournal)?s.foodJournal:Array.isArray(s.foodLog)?s.foodLog.map(x=>({...x,date:x.date||today(),meal:x.meal||'Запись'})):[];result.foodJournal=journal.map(x=>({...x,id:String(x.id||cryptoId()),meal:String(x.meal||'Запись')}));
 result.activities=Array.isArray(s.activities)?s.activities.map(x=>({...x,id:String(x.id||cryptoId())})):[];
 for(const key of ['daily','mealChecks','moods','menuByDate','shopping'])result[key]=object(s[key])?s[key]:{};
 result.choices=Array.isArray(s.choices)?s.choices.slice(0,3):[0,0,0];while(result.choices.length<3)result.choices.push(0);
 result.fastingMode=['none','12','14','16'].includes(s.fastingMode)?s.fastingMode:'none';
 const b=object(s.sobriety)?s.sobriety:{};result.sobriety={...b,days:object(b.days)?b.days:{},triggers:object(b.triggers)?b.triggers:{},reason:Object.hasOwn(reasons,b.reason)?b.reason:'clarity',contact:object(b.contact)?b.contact:{name:'',phone:''},urges:Array.isArray(b.urges)?b.urges:[],timer:b.timer||null};
 return result;
}
function cryptoId(){return Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
function dailyWeights(weights){return Object.values(Object.fromEntries(weights.map(x=>[x.d,x]))).sort((a,b)=>a.d.localeCompare(b.d));}
function weightTrend(weights,date){const end=dayValue(date),all=dailyWeights(weights),recent=all.filter(x=>dayValue(x.d)>end-7&&dayValue(x.d)<=end),previous=all.filter(x=>dayValue(x.d)>end-14&&dayValue(x.d)<=end-7),mean=list=>list.reduce((sum,x)=>sum+x.v,0)/list.length;return {recent,previous,change:recent.length>=2&&previous.length>=2?mean(recent)-mean(previous):null};}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function choiceButton(label,value,selected,callback){const b=node('button','choice',label);b.type='button';b.dataset.value=value;b.setAttribute('aria-pressed',String(selected));b.addEventListener('click',callback);return b;}
const get=()=>api.get(),soberData=()=>get().sobriety;
function sober(){
 const data=soberData(),date=api.today(),entries=Object.entries(data.days).filter(([d])=>d<=date),total=entries.filter(([,v])=>v.status==='sober').length;
 $('soberNumber').textContent=String(total);$('soberLabel').textContent='дней без алкоголя отмечено';$('soberSince').textContent='Путь с '+api.formatDate(get().start)+' · календарных дней: '+Math.max(0,dayValue(date)-dayValue(get().start)+1)+'. Пропущенные отметки не считаются ни трезвостью, ни употреблением.';
 const status=data.days[date]?.status;$('soberTodayState').textContent=status==='sober'?'Сегодня: без алкоголя ✓':status==='drank'?'Сегодня: был алкоголь':'Сегодня ещё не отмечен';
 const selected=$('soberDate').value||date;$('soberDate').max=date;if(!dateOK(selected)||selected>date)$('soberDate').value=date;else $('soberDate').value=selected;
 const current=data.days[$('soberDate').value]?.status;document.querySelectorAll('[data-sober]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sober===current)));$('soberClear').disabled=!current;
 $('returnPlan').classList.toggle('hide',current!=='drank');$('soberFeedback').textContent=current==='sober'?'День отмечен. Это твой реальный результат.':current==='drank'?'Записано честно. Прежние дни без алкоголя остаются в истории.':'Подведи итог дня, когда будешь готов. Отметку можно уточнить.';
 let count=0,cursor=dayValue(date);if(!data.days[date])cursor--;while(data.days[new Date(cursor*86400000).toISOString().slice(0,10)]?.status==='sober'){count++;cursor--;}
 $('soberStreak').textContent=count?'Подряд отмечено: '+count:'Пока без серии';
 const history=$('soberHistory');history.replaceChildren();for(let i=13;i>=0;i--){const d=new Date((dayValue(date)-i)*86400000).toISOString().slice(0,10),status=data.days[d]?.status;const b=node('button','history-day',new Date(d+'T12:00:00').getDate()+(status==='sober'?' ✓':status==='drank'?' ○':' ·'));b.type='button';b.dataset.state=status||'unknown';b.setAttribute('aria-label',api.formatDate(d)+': '+(status==='sober'?'без алкоголя':status==='drank'?'был алкоголь':'нет записи'));if(d===$('soberDate').value)b.setAttribute('aria-current','date');b.onclick=()=>{$('soberDate').value=d;sober();$('soberDate').focus({preventScroll:true});};history.append(b);}
 const week=Array.from({length:7},(_,i)=>data.days[new Date((dayValue(date)-i)*86400000).toISOString().slice(0,10)]?.status);$('soberWeekSummary').textContent='За 7 дней: '+week.filter(x=>x==='sober').length+' без алкоголя · '+week.filter(x=>x==='drank').length+' с алкоголем · '+week.filter(x=>!x).length+' без отметки.';
}
function daily(){
 const date=api.today(),s=get(),food=s.foodJournal.some(x=>x.date===date)||Object.values(s.mealChecks[date]||{}).some(Boolean)||s.daily[date]?.vegetables,move=s.activities.some(x=>x.date===date)||s.daily[date]?.walk;
 const items=[['sobriety','День без алкоголя',s.sobriety.days[date]?.status==='sober','Отметить день'],['food','Позаботиться о нормальной еде',food,'Мой приём пищи'],['sport','Посильное движение',move,'Записать движение']];
 $('dailyChecks').replaceChildren(...items.map(([tab,title,done,label])=>{const b=node('button','daily-step'+(done?' done':''));b.type='button';b.append(node('span','step-mark',done?'✓':'→'),node('span','',title),node('small','',done?'Отмечено':label));b.onclick=()=>api.nav(tab);return b;}));$('dailyScore').textContent=items.filter(x=>x[2]).length+' из 3';
}
function renderTriggers(){
 const b=soberData(),date=api.today(),selected=b.triggers[date]||[];
 $('triggerChoices').replaceChildren(...Object.entries(triggers).map(([id,[label]])=>choiceButton(label,id,selected.includes(id),()=>{const current=b.triggers[date]||[];if(!current.includes(id)&&current.length>=2){api.toast('Выбери не больше двух ситуаций');return;}b.triggers[date]=current.includes(id)?current.filter(x=>x!==id):[...current,id];api.save();renderTriggers();$('triggerChoices').querySelector('[data-value="'+id+'"]')?.focus({preventScroll:true});})));
 $('triggerPlan').textContent=selected.length?selected.map(id=>triggers[id][1]).join(' '):'Выбери ситуацию — здесь появится конкретный план на вечер.';$('soberReason').value=b.reason;$('reasonText').textContent=reasons[b.reason];
}
function currentMenu(){const s=get(),date=api.today();return s.menuByDate[date]||s.choices.map(n=>((n%4)+4)%4);}
function recipeComponents(i,index){if(i===0){return index===1?['protein','starch','fruit','dairy']:index===2?['protein','fruit','starch','dairy']:['protein','vegetables','starch'];}return ['protein','vegetables','starch'];}
function renderMeals(){
 const s=get(),date=api.today(),menu=currentMenu(),checks=s.mealChecks[date]||{};
 $('recipeCards').innerHTML=api.recipes.map((group,i)=>{const r=group[menu[i]%group.length];return `<article class="meal ${checks[i]?'done':''}"><div class="mealhead"><span class="tag">${api.mealNames[i]}</span><span class="pill">${checks[i]?'✓ Поел':'Вариант на сегодня'}</span></div><h3>${api.esc(r.name)}</h3><details><summary>Продукты и приготовление</summary><p class="vspace"><strong>Продукты:</strong> ${api.esc(r.ing.join(', '))}</p><p class="recipe">${api.esc(r.how)}</p><p class="small">Ингредиенты — пример порции, не индивидуальная диета. Количество подбирай по своему голоду и рекомендациям специалиста, если они есть.</p></details><div class="mealbuttons vspace"><button class="btn subtle" type="button" data-swap="${i}">Другое блюдо</button><button class="btn" type="button" data-mealdone="${i}">${checks[i]?'Отменить отметку':'Поел это ✓'}</button></div></article>`;}).join('');$('mealsDone').textContent=[0,1,2].filter(i=>checks[i]).length+' из 3';if(!$('shoppingList').classList.contains('hide'))renderShopping();
}
function mealClick(event){
 const b=event.target.closest('button');if(!b)return;const i=Number(b.dataset.swap??b.dataset.mealdone);if(!Number.isInteger(i)||i<0||i>2)return;const s=get(),date=api.today(),menu=[...currentMenu()];s.mealChecks[date]??={};
 if(b.hasAttribute('data-swap')){if(s.mealChecks[date][i]){api.toast('Этот приём пищи уже отмечен. Сначала отмени отметку, если нужно изменить запись.');return;}menu[i]=(menu[i]+1)%api.recipes[i].length;s.menuByDate[date]=menu;}
 else{const id='menu:'+date+':'+i;s.mealChecks[date][i]=!s.mealChecks[date][i];if(s.mealChecks[date][i]){const r=api.recipes[i][menu[i]%api.recipes[i].length];s.foodJournal=s.foodJournal.filter(x=>x.id!==id);s.foodJournal.push({id,date,meal:api.mealNames[i],text:r.name,components:recipeComponents(i,menu[i]),source:'menu'});s.menuByDate[date]=menu;}else s.foodJournal=s.foodJournal.filter(x=>x.id!==id);}
 api.save();api.render();
}
function renderShopping(){
 const s=get(),date=api.today(),menu=currentMenu(),all=api.recipes.flatMap((group,i)=>group[menu[i]%group.length].ing),list=[...new Set(all)];$('shoppingList').replaceChildren(node('strong','','На выбранное меню'));
 const items=node('div','shopping-items');list.forEach(item=>{const label=node('label','shopping-item'),input=node('input');input.type='checkbox';input.checked=Boolean(s.shopping[date]?.[item]);input.dataset.shopping=item;const count=all.filter(value=>value===item).length;label.append(input,node('span','',item+(count>1?' × '+count:'')));items.append(label);});$('shoppingList').append(items,node('p','small','Список для выбранного меню одного человека. Повторяющиеся позиции показаны с множителем. Покупка не отмечает приём пищи автоматически.'));
}
function shoppingChange(event){const input=event.target;if(!input.matches('[data-shopping]'))return;const s=get(),date=api.today();s.shopping[date]??={};s.shopping[date][input.dataset.shopping]=input.checked;api.save();}
function removeJournal(id){const s=get(),entry=s.foodJournal.find(x=>x.id===id),match=/^menu:(\d{4}-\d{2}-\d{2}):([0-2])$/.exec(id);if(entry?.source==='menu'&&match&&entry.date===match[1]&&s.mealChecks[entry.date])s.mealChecks[entry.date][Number(match[2])]=false;s.foodJournal=s.foodJournal.filter(x=>x.id!==id);const saved=api.save();api.render();if(saved)api.toast('Запись удалена');}
function renderFoodChoices(){
 $('foodComponents').replaceChildren(...Object.entries(components).map(([id,label])=>choiceButton(label,id,selectedFood.includes(id),()=>{selectedFood=selectedFood.includes(id)?selectedFood.filter(x=>x!==id):[...selectedFood,id];renderFoodChoices();$('foodComponents').querySelector('[data-value="'+id+'"]')?.focus({preventScroll:true});})));
}
function addJournal(){
 const text=$('journalText').value.trim();if(!text&&!selectedFood.length){api.toast('Выбери состав тарелки или добавь короткую заметку');return;}
 const date=$('journalDate').value;if(!dateOK(date)||date>api.today()){api.toast('Выбери сегодня или прошедший день');return;}const s=get();s.foodJournal.push({id:api.uid(),date,meal:$('journalMeal').value,text:text||selectedFood.map(id=>components[id]).join(', '),components:[...selectedFood],satiety:$('mealSatiety').value});
 const saved=api.save();selectedFood=[];$('journalText').value='';$('mealSatiety').value='';renderFoodChoices();api.render();if(saved)api.toast('Приём пищи записан');
}
function renderFoodJournal(){
 const date=$('journalDate').value||api.today(),entries=get().foodJournal.filter(x=>x.date===date).slice().reverse(),nutrition=get().foodJournal.filter(x=>x.date===api.today()),satiety={hungry:'Ещё голоден',comfortable:'Комфортно сыт',full:'Слишком сыт'};
 $('foodJournal').innerHTML=entries.map(x=>`<div class="record"><div><strong>${api.esc(x.meal)}</strong><p>${api.esc(x.text)}</p>${satiety[x.satiety]?'<p>'+satiety[x.satiety]+'</p>':''}</div><button type="button" class="xbtn" aria-label="Удалить запись еды" data-delete-food="${api.esc(x.id)}">×</button></div>`).join('')||'<div class="empty">За эту дату пока нет записей. Можно добавить свой приём пищи.</div>';
 const protein=nutrition.filter(x=>x.components?.includes('protein')).length,plants=nutrition.filter(x=>x.components?.some(id=>['vegetables','fruit'].includes(id))).length;
 $('nutritionSummary').innerHTML=[[nutrition.length,'приёмов записано'],[protein,'с белковой едой'],[plants,'с овощами / фруктами']].map(([n,label])=>`<div class="stat"><small>${label}</small><strong>${n}</strong></div>`).join('');
 $('nutritionTip').textContent=!nutrition.length?'Начни с одного обычного приёма пищи. Считать калории не обязательно.':!nutrition.some(x=>Array.isArray(x.components)&&x.components.length)?'У старых записей состав не указан. Это не означает, что в них не было белка или овощей.':!protein?'В следующий приём можно добавить яйца, рыбу, мясо, творог, тофу или бобовые.':!plants?'В следующий приём можно добавить овощи или фрукт, который тебе нравится.':'Основа уже есть. Ориентируйся на комфортную сытость; после лишней еды не нужно пропускать следующий приём.';
}
function renderReview(){
 const s=get(),date=api.today(),end=dayValue(date),last7=d=>dayValue(d)>end-7&&dayValue(d)<=end,days=Object.entries(s.sobriety.days).filter(([d,v])=>last7(d)&&v.status==='sober').length,meals=s.foodJournal.filter(x=>last7(x.date)).length,walk=s.activities.filter(x=>last7(x.date)&&x.type==='Ходьба').reduce((a,x)=>a+x.min,0);
 $('homeReview').innerHTML=`<div class="statrow"><div class="stat"><small>дней без алкоголя отмечено</small><strong>${days}</strong></div><div class="stat"><small>приёмов пищи записано</small><strong>${meals}</strong></div><div class="stat"><small>минут ходьбы</small><strong>${walk}</strong></div></div>`;
 $('homeNextStep').textContent=!s.sobriety.days[date]?'Следующий шаг: ближе к концу дня отметь, как он прошёл. Если тянет выпить, помощь доступна прямо сейчас.':!s.foodJournal.some(x=>x.date===date)?'Следующий шаг: позаботься о следующем обычном приёме пищи и отметь его.':!s.activities.some(x=>x.date===date)?'Если самочувствие позволяет, выбери короткую прогулку. Отдых тоже допустим.':'Базовая забота о себе на сегодня уже есть. Можно остановиться и отдохнуть.';
}
function supportContact(){const c=soberData().contact,phone=c.phone.replace(/[\s()\-]/g,'');const valid=/^\+?\d{3,20}$/.test(phone);$('supportCall').classList.toggle('hide',!valid);$('supportCall').href=valid?'tel:'+phone:'tel:';$('supportCall').textContent=c.name?'Позвонить: '+c.name:'Позвонить человеку поддержки';$('supportPrompt').textContent=valid?'Звонок начнётся только после твоего действия.':'Позвони или напиши человеку, которому доверяешь. Его контакт можно сохранить в разделе «Трезвость».';}
function setNeed(id){$('urgeNeeds').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===id)));$('urgeNeeds').dataset.selected=id;$('urgeAction').textContent=needs[id][1];}
function updateTimer(){const timer=soberData().timer,left=timer?Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000)):600;$('urgeCountdown').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');$('startUrgeTimer').classList.toggle('hide',Boolean(timer&&left>0));$('stopUrgeTimer').classList.toggle('hide',!timer||left===0);if(timer&&left===0)$('urgeResultText').textContent='10 минут прошли. Проверь, как ты сейчас. Если всё ещё тяжело, позови поддержку или выбери следующий небольшой шаг.';}
function openUrge(){currentUrgeId=null;$('urgeResults').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));const timer=soberData().timer;setNeed(timer?.need||'stress');$('urgeIntensity').value=timer?.intensity??5;$('urgeIntensityValue').textContent=$('urgeIntensity').value;supportContact();updateTimer();if(!$('urgeDialog').open)$('urgeDialog').showModal();}
function connect(a){
 api=a;$('journalDate').value=api.today();$('journalDate').max=api.today();$('journalDate').onchange=()=>{if(!dateOK($('journalDate').value)||$('journalDate').value>api.today()){$('journalDate').value=api.today();api.toast('Выбери сегодня или прошедший день');}renderFoodJournal();};$('soberDate').value=api.today();$('soberDate').onchange=()=>{if(!dateOK($('soberDate').value)||$('soberDate').value>api.today()){$('soberDate').value=api.today();api.toast('Выбери сегодня или прошедший день');}sober();};
 $('soberChoices').onclick=e=>{const button=e.target.closest('[data-sober]');if(!button)return;const date=$('soberDate').value;if(!dateOK(date)||date>api.today()){api.toast('Проверь дату');return;}const data=soberData();data.days[date]={...(data.days[date]||{}),status:button.dataset.sober};api.save();api.render();};
 $('soberClear').onclick=()=>{delete soberData().days[$('soberDate').value];api.save();api.render();};
 $('soberReason').onchange=()=>{soberData().reason=$('soberReason').value;api.save();renderTriggers();};
 $('supportName').value=soberData().contact.name;$('supportPhone').value=soberData().contact.phone;
 $('supportForm').onsubmit=e=>{e.preventDefault();const name=$('supportName').value.trim(),phone=$('supportPhone').value.trim();if(phone&&!/^\+?[\d\s()\-]{3,30}$/.test(phone)){api.toast('Проверь номер телефона');return;}soberData().contact={name,phone};if(api.save())api.toast('Контакт сохранён');supportContact();};
 for(const id of ['homeUrge','returnUrge'])$(id).onclick=openUrge;$('goSober').onclick=()=>api.nav('sobriety');$('closeUrge').onclick=()=>$('urgeDialog').close();
 $('urgeNeeds').replaceChildren(...Object.entries(needs).map(([id,[label]])=>choiceButton(label,id,id==='stress',()=>setNeed(id))));setNeed('stress');
 $('urgeIntensity').oninput=()=>$('urgeIntensityValue').textContent=$('urgeIntensity').value;
 $('startUrgeTimer').onclick=()=>{currentUrgeId=null;$('urgeResults').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));const start=Date.now();soberData().timer={startedAt:start,endsAt:start+600000,intensity:Number($('urgeIntensity').value),need:$('urgeNeeds').dataset.selected||'stress'};const saved=api.save();$('urgeResultText').textContent=saved?'Таймер сохранён. Можно закрыть окно; он продолжится по времени.':'Таймер работает в этой вкладке, но не сохранён. Не закрывай страницу, если хочешь сохранить его.';updateTimer();};
 $('stopUrgeTimer').onclick=()=>{soberData().timer=null;api.save();$('urgeResultText').textContent='Таймер остановлен. Можно выбрать другое действие или позвать поддержку.';updateTimer();};
 $('urgeResults').onclick=e=>{const b=e.target.closest('[data-urge-result]');if(!b)return;const data=soberData(),timer=data.timer;const existing=currentUrgeId?data.urges.find(x=>x.id===currentUrgeId):null;if(existing)existing.result=b.dataset.urgeResult;else{currentUrgeId=api.uid();data.urges.push({id:currentUrgeId,at:new Date().toISOString(),intensity:timer?.intensity??Number($('urgeIntensity').value),need:timer?.need||$('urgeNeeds').dataset.selected,result:b.dataset.urgeResult});}$('urgeResults').querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===b)));data.timer=null;const saved=api.save();updateTimer();const text=b.dataset.urgeResult==='easier'?'Хорошо, что проверил своё состояние. Выбери спокойное занятие на ближайшее время.':'Не оставайся с этим один: свяжись с человеком поддержки или специалистом. При опасных симптомах нужна медицинская помощь.';$('urgeResultText').textContent=text+(saved?' Результат сохранён.':' Результат не сохранён — скачай копию данных.');render();};
 timerInterval=setInterval(()=>{if($('urgeDialog').open)updateTimer();},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTimer();});
 renderFoodChoices();
}
function render(){renderTriggers();renderReview();supportContact();const c=soberData().contact;if(!['supportName','supportPhone'].includes(document.activeElement?.id)){$('supportName').value=c.name;$('supportPhone').value=c.phone;}const resultNames={easier:'Стало легче',same:'Всё ещё сильно',support:'Нужна поддержка'};$('urgeHistory').replaceChildren(...soberData().urges.slice(-5).reverse().map(entry=>{const item=node('div','record');item.append(node('p','small',new Date(entry.at).toLocaleString('ru-RU')+' · '+needs[entry.need][0]+' · тяга '+entry.intensity+'/10 · '+resultNames[entry.result]));return item;}));if(!soberData().urges.length)$('urgeHistory').append(node('p','small','Пока нет записей. Результат можно отметить в окне поддержки.'));}
function newDay(){$('journalDate').value=api.today();$('journalDate').max=api.today();$('soberDate').value=api.today();selectedFood=[];renderFoodChoices();}
return {dayValue,validState,normalize,dailyWeights,weightTrend,connect,render,sober,daily,renderMeals,mealClick,renderShopping,shoppingChange,renderFoodJournal,addJournal,removeJournal,newDay};
})();
