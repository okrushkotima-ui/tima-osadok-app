function cleanWork(w){
 const task=w?.task;
 return {next:typeof w?.next==='string'?w.next.slice(0,40):'',checks:Array.isArray(w?.checks)?[...new Set(w.checks.filter(v=>['emotion','hook','whole'].includes(v)))]:[],demo:typeof w?.demo==='string'?w.demo.slice(0,1000):'',decision:['','A','B','retry'].includes(w?.decision)?w.decision:'',sessions:Array.isArray(w?.sessions)?w.sessions.slice(-30).filter(x=>x&&typeof x.title==='string'&&typeof x.result==='string'&&typeof x.at==='string').map(x=>({title:x.title.slice(0,200),result:x.result.slice(0,100),at:x.at.slice(0,40)})):[],...(task&&typeof task.title==='string'&&typeof task.task==='string'?{task:{title:task.title.slice(0,150),task:task.task.slice(0,2500),output:String(task.output||'').slice(0,500),review:String(task.review||'').slice(0,500),...(Number.isInteger(task.day)&&task.day>=0&&task.day<30?{day:task.day}:{})}}:{})};
}
const studioKey=giftMode?'iskra-gift-studio-v1':'iskra-studio-v1';
const stageNames=['Идея','Демо','Запись','Сведение','Мастер','Готово'];
const statuses=['Под вопросом','В альбом','Доработать','В архив'];
const newTrack=()=>({id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),name:'',bpm:'',key:'',stage:'Идея',status:'Под вопросом',rating:0,revisit:false,notes:''});
const cleanTrack=t=>({...t,id:String(t.id||newTrack().id).slice(0,100),name:String(t.name||'').slice(0,100),bpm:String(t.bpm||'').slice(0,4),key:String(t.key||'').slice(0,25),stage:stageNames.includes(t.stage)?t.stage:'Идея',status:statuses.includes(t.status)?t.status:'Под вопросом',rating:Number.isInteger(t.rating)&&t.rating>=0&&t.rating<=5?t.rating:0,revisit:t.revisit===true,notes:String(t.notes||'').slice(0,1500),...(t.work?{work:cleanWork(t.work)}:{})});
let studio={name:'',tracks:[]},studioSort='manual',expandedTrack=null,studioBlocked=false;
try{const stored=JSON.parse(localStorage.getItem(studioKey)||'null');if(stored&&typeof stored.name==='string'&&Array.isArray(stored.tracks))studio={...stored,name:stored.name.slice(0,90),tracks:stored.tracks.slice(0,100).filter(x=>x&&typeof x==='object').map(cleanTrack)};else if(stored!==null)studioBlocked=true;}catch{studioBlocked=true;}
const studioRoot=document.querySelector('#studio-tracks');
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
function saveStudio(){
 const status=document.querySelector('#studio-save-status');
 if(studioBlocked){if(status)status.textContent='Прежнее сохранение не удалось прочитать. Оно не перезаписано. Восстанови копию, чтобы продолжить.';return false;}
 try{localStorage.setItem(studioKey,JSON.stringify(studio));if(status)status.textContent='Треки и результаты сессий сохранены на этом устройстве.';return true;}
 catch{if(status)status.textContent='Не удалось сохранить изменения. Сделай экспорт, затем проверь место и доступ к хранилищу.';return false;}
}
function field(label,value,callback,max=100){const wrap=el('div');wrap.append(el('div','studio-meta',label));const inp=el('input','studio-field');inp.value=value;inp.maxLength=max;inp.setAttribute('aria-label',label);inp.addEventListener('input',()=>callback(inp.value));wrap.append(inp);return wrap;}
function choice(label,options,value,callback){const wrap=el('div');wrap.append(el('div','studio-meta',label));const sel=el('select','studio-select');options.forEach(option=>{const o=el('option','',option);o.value=option;sel.append(o)});sel.value=value;sel.setAttribute('aria-label',label);sel.addEventListener('change',()=>callback(sel.value));wrap.append(sel);return wrap;}
function renderStudio(){
 renderCompass();
 document.querySelector('#project-name').value=studio.name;
 const selected=studio.tracks.filter(t=>t.status==='В альбом').length,ready=studio.tracks.filter(t=>t.stage==='Готово').length;
 document.querySelector('#studio-stats').replaceChildren(...[[studio.tracks.length,'всего треков'],[selected,'в альбоме'],[ready,'готово']].map(([n,label])=>{const a=el('div','studio-stat');a.append(el('b','',n),el('span','',label));return a}));
 studioRoot.replaceChildren();
 if(!studio.tracks.length)studioRoot.append(el('div','studio-empty','Добавь идею или отправь сюда искру и задание из альбома. У каждого трека появится следующий шаг.'));
 const visible=[...studio.tracks];
 if(studioSort==='rating')visible.sort((a,b)=>b.rating-a.rating);
 if(studioSort==='stage')visible.sort((a,b)=>stageNames.indexOf(b.stage)-stageNames.indexOf(a.stage));
 visible.forEach(t=>{
  const i=studio.tracks.indexOf(t),card=el('article','studio-track'),header=el('div','studio-summary');
  const number=el('span','studio-number',String(i+1).padStart(2,'0'));header.append(number);
  const song=el('div','studio-song');song.append(el('strong','',t.name||'Новый трек'),el('span',t.status==='В альбом'?'studio-stage':'',t.stage+' · '+t.status+(t.revisit?' · переслушать':'')));header.append(song);
  const hearts=el('div','studio-hearts');
  for(let n=1;n<=5;n++){const b=el('button','studio-heart'+(n<=t.rating?' on':''),n<=t.rating?'♥':'♡');b.type='button';b.setAttribute('aria-label','Оценить '+n+' из 5');b.setAttribute('aria-pressed',String(n===t.rating));b.addEventListener('click',e=>{e.stopPropagation();t.rating=t.rating===n?0:n;saveStudio();renderStudio()});hearts.append(b);}
  header.append(hearts);
  const arrow=el('span','studio-chevron',expandedTrack===t.id?'⌃':'⌄');header.append(arrow);header.tabIndex=0;header.setAttribute('role','button');header.setAttribute('aria-expanded',String(expandedTrack===t.id));header.addEventListener('click',e=>{if(e.target.closest('button'))return;expandedTrack=expandedTrack===t.id?null:t.id;renderStudio()});header.addEventListener('keydown',e=>{if(e.target===header&&(e.key==='Enter'||e.key===' ')){e.preventDefault();expandedTrack=expandedTrack===t.id?null:t.id;renderStudio()}});card.append(header);
  if(expandedTrack===t.id){
   const details=el('div','studio-details'),a=field('Название трека',t.name,v=>{t.name=v;song.querySelector('strong').textContent=v||'Новый трек';saveStudio()},100);details.append(a);
   const g=el('div','studio-detail-grid');
   g.append(choice('Статус',statuses,t.status,v=>{t.status=v;saveStudio();renderStudio()}));
   g.append(choice('Стадия',stageNames,t.stage,v=>{t.stage=v;saveStudio();renderStudio()}));
   g.append(field('BPM',t.bpm,v=>{t.bpm=v;saveStudio()},4));
   g.append(field('Тональность',t.key,v=>{t.key=v;saveStudio()},25));details.append(g);details.append(renderWork(t));
   const check=el('label','studio-revisit');const cb=el('input');cb.type='checkbox';cb.checked=t.revisit;cb.addEventListener('change',()=>{t.revisit=cb.checked;saveStudio();renderStudio()});check.append(cb,document.createTextNode('Переслушать свежими ушами'));details.append(check);
   details.append(el('div','studio-meta','Комментарии / идеи / что исправить'));const notes=el('textarea','studio-textarea');notes.maxLength=1500;notes.placeholder='Что цепляет? Что изменить? Почему оставить в альбоме?';notes.value=t.notes;notes.setAttribute('aria-label','Комментарии к треку');notes.addEventListener('input',()=>{t.notes=notes.value;saveStudio()});details.append(notes);
   const controls=el('div','studio-controls');
   [['↑',()=>{if(i>0){[studio.tracks[i-1],studio.tracks[i]]=[studio.tracks[i],studio.tracks[i-1]];studioSort='manual';document.querySelector('#studio-sort').value='manual';saveStudio();renderStudio()}}],['↓',()=>{if(i<studio.tracks.length-1){[studio.tracks[i+1],studio.tracks[i]]=[studio.tracks[i],studio.tracks[i+1]];studioSort='manual';document.querySelector('#studio-sort').value='manual';saveStudio();renderStudio()}}],['Удалить',()=>{if(confirm('Удалить этот трек?')){studio.tracks.splice(i,1);expandedTrack=null;saveStudio();renderStudio()}}]].forEach(([label,fn])=>{const b=el('button','studio-quiet',label);b.type='button';b.addEventListener('click',fn);if(label==='↑'){b.setAttribute('aria-label','Поднять трек');b.disabled=i===0;}if(label==='↓'){b.setAttribute('aria-label','Опустить трек');b.disabled=i===studio.tracks.length-1;}controls.append(b)});details.append(controls);card.append(details);
  }
  studioRoot.append(card);
 });
}
document.querySelector('#project-name').addEventListener('input',e=>{studio.name=e.target.value;saveStudio()});
document.querySelector('#studio-add').addEventListener('click',()=>{if(studio.tracks.length>=100)return alert('Максимум 100 треков');const t=newTrack();studio.tracks.push(t);expandedTrack=t.id;studioSort='manual';document.querySelector('#studio-sort').value='manual';saveStudio();renderStudio();studioRoot.lastElementChild?.querySelector('.studio-details input')?.focus()});
document.querySelector('#studio-sort').addEventListener('change',e=>{studioSort=e.target.value;renderStudio()});
document.querySelector('#studio-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'iskra',version:1,exportedAt:new Date().toISOString(),project:studio},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='iskra-album-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)});
document.querySelector('#studio-import').addEventListener('click',()=>document.querySelector('#studio-file').click());
document.querySelector('#studio-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1000000)throw Error('Файл слишком большой');const data=JSON.parse(await f.text());if(data.app!=='iskra'||data.version!==1||!data.project||typeof data.project.name!=='string'||!Array.isArray(data.project.tracks)||data.project.tracks.length>100||data.project.tracks.some(t=>!t||typeof t!=='object'||typeof t.name!=='string'))throw Error('Неверный формат файла');if(!confirm('Заменить текущий проект данными файла?'))return;studio={...data.project,name:data.project.name.slice(0,90),tracks:data.project.tracks.map(cleanTrack)};expandedTrack=null;studioBlocked=false;saveStudio();renderStudio()}catch(err){alert('Не удалось импортировать: '+err.message)}finally{e.target.value=''}});
document.querySelector('#studio-summary').addEventListener('click',async()=>{const report=[studio.name||'Без названия','Треков: '+studio.tracks.length,...studio.tracks.map((t,i)=>(i+1)+'. '+(t.name||'Без названия')+' · '+('♥'.repeat(t.rating)||'без оценки')+' · '+t.status+' · '+t.stage+(t.revisit?' · переслушать':'')+(t.notes?' | '+t.notes:''))].join('\n');try{await navigator.clipboard.writeText(report);alert('Отчёт скопирован')}catch{window.prompt('Скопируй отчёт:',report)}});
const workActions={
 'Идея':[
 ['seed','Поймать три мотива','Минуту слушай комнату. Затем запиши три мотива по 20 секунд без оценки. После паузы выбери тот, который хочется повторить.','Три записи и один выбранный мотив.'],
 ['scene','Найти сцену песни','Заметь предмет рядом. Представь, кто оставил его здесь. Наговори четыре конкретные строки, затем пропой их под простой пульс.','Запись четырёх строк с конкретным действием.'],
 ['contrast','Попробовать непривычную подачу','Запиши короткий фрагмент привычно. Затем измени только подачу: спой тише, ближе или разговорнее. Сравни на одной громкости.','Два дубля и решение между ними.']
 ],
 'Демо':[
 ['whole','Записать песню целиком','Оставь голос и один инструмент. Пройди всю форму без остановки, включая конец. Сохрани запись с датой, не заменяя прошлую.','Полное демо от первого до последнего звука.'],
 ['hook','Проверить крючок','Запиши два варианта припева, меняя только ритм или главную фразу. Сделай паузу и попробуй напеть оба без подсказки.','Два припева и выбранный запоминающийся ход.'],
 ['space','Убрать лишнее','Сохрани версию A. В версии B отключи один слой или сократи вступление. Уровняй громкость и сравни A → B → A.','Две версии с одной слышимой разницей.']
 ],
 'Запись':[
 ['lead','Поймать живой лид','Комфортно разогрей голос. Сделай два полных дубля, обращаясь к одному человеку. После отдыха отметь фразы, которым веришь.','Два сохранённых дубля и выбранные фразы.'],
 ['comp','Собрать лучшие фразы','Сначала выбери дубли по эмоции. Затем собери лид, проверь склейки отдельно и в музыке. Сохрани исходные записи.','Цельный лид с проверенными склейками.'],
 ['back','Оставить один нужный бэк','Запиши ответ или гармонию в одном месте. Сравни с версией без него. Оставь, если главная фраза стала сильнее.','Один осмысленный вокальный акцент.']
 ],
 'Сведение':[
 ['balance','Собрать тихий баланс','На невысокой громкости выставь голос, ритм и низ. Пока не добавляй эффекты. Проверь, понятны ли слова и не пропадает ли пульс.','Экспорт с ясным голосом и ритмической опорой.'],
 ['devices','Проверить вне студии','Сделай экспорт. Послушай на телефоне и в наушниках, не открывая редактор. Выбери одну главную проблему и исправь только её.','Два прослушивания и одна проверенная правка.'],
 ['ab','Сравнить одну правку','Сохрани A и B с одной разницей. Уровняй громкость. Попроси друга переключить версии, не называя их, или сравни после паузы.','Решение между версиями на слух.']
 ],
 'Мастер':[
 ['edges','Проверить финальные файлы','Открой экспорт вне DAW. Проверь начало, конец, щелчки, названия и соседние треки на одинаковой комфортной громкости.','Проверенный финальный файл с понятным именем.'],
 ['sequence','Проверить место в альбоме','Прослушай конец предыдущего трека, этот трек и начало следующего. Оцени паузы и перепад энергии. Сохрани выбранный порядок.','Проверенное место песни в треклисте.'],
 ['copy','Сделать резервную копию','Сохрани финальный файл и исходный проект в разные папки. Сделай копию на другом носителе или в своём облаке и проверь открытие.','Две доступные копии, а не только обещание сохранить их.']
 ],
 'Готово':[
 ['listen','Послушать как слушатель','После перерыва включи песню без экрана редактора. Не исправляй на ходу. Если проблема не мешает впечатлению, сохрани готовую версию.','Решение: оставить готовой или одна конкретная правка.'],
 ['release','Подготовить следующий шаг','Проверь аудио, название, авторов и обложку. Выбери дату закрытого прослушивания или подготовки релиза. Сохрани список недостающего.','Папка релиза и конечный список оставшихся действий.'],
 ['archive','Сберечь исходники','Сложи исходники и финальный экспорт в подписанную папку. Проверь резервную копию и сохрани копию проекта Искры.','Восстанавливаемый проект и финальная версия.']
 ]
};
function workButton(text,fn,cls='studio-quiet'){const button=el('button',cls,text);button.type='button';button.addEventListener('click',fn);return button;}
function renderCompass(){
 const node=document.querySelector('#studio-compass');if(!node)return;
 const direction=window.IskraAlbum?.compass();node.hidden=!direction;
 if(direction){node.replaceChildren(el('span','kind','НАПРАВЛЕНИЕ АЛЬБОМА'),el('p','',direction),el('p','studio-note','Ориентир из первого дня. Проверяй решения на слух; направление можно пересмотреть.'));}
}
function safeDemo(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
function renderWork(t){
 const work=t.work||cleanWork({}),panel=el('section','track-work');
 panel.setAttribute('aria-label','Работа над треком');panel.append(el('h3','','Одна полезная сессия'));
 const actions=workActions[t.stage],selected=actions.find(x=>x[0]===work.next)||actions[0];
 const selector=el('select','studio-select');selector.setAttribute('aria-label','Следующее действие');
 actions.forEach(([id,title])=>{const option=el('option','',title);option.value=id;selector.append(option)});selector.value=selected[0];
 selector.addEventListener('change',()=>{t.work={...(t.work||work),next:selector.value};saveStudio();renderStudio()});panel.append(selector);
 const task=work.task;
 if(task){panel.append(el('p','work-source',(Number.isInteger(task.day)?'Из дня '+(task.day+1)+': ':'Из «Искр»: ')+task.title),el('p','work-instruction',task.task));}
 else panel.append(el('p','work-instruction',selected[2]));
 const output=el('p','work-output');output.append(el('strong','','На выходе: '),document.createTextNode(task?task.output:selected[3]));panel.append(output);
 if(task?.review)panel.append(el('p','studio-note','Проверка: '+task.review));
 if(task){panel.append(workButton('Работать по стадии трека',()=>{t.work={...(t.work||work),next:selected[0]};delete t.work.task;saveStudio();renderStudio()}));}
 const finish=el('div','work-finish'),result=el('select','studio-select');result.setAttribute('aria-label','Результат сессии');
 [['','Какой результат сохранил?'],['Сохранена новая запись','Сохранена новая запись'],['Выбран лучший вариант','Выбран лучший вариант'],['Закрыта одна правка','Закрыта одна правка'],['Нужен ещё подход','Нужен ещё подход']].forEach(([value,label])=>{const option=el('option','',label);option.value=value;result.append(option)});
 const feedback=el('p','studio-note');feedback.setAttribute('role','status');let pendingSession=null;
 finish.append(result,workButton('Записать результат ✓',()=>{
  if(!result.value){feedback.textContent='Выбери результат. Если действие пока не сделано — можно вернуться позже.';return;}
  const previous=t.work||work;if(!pendingSession){pendingSession={title:task?task.title:selected[1],result:result.value,at:new Date().toISOString()};t.work={...previous,sessions:[...previous.sessions,pendingSession].slice(-30)};}else{pendingSession.result=result.value;}
  if(saveStudio())renderStudio();else feedback.textContent='Результат пока не сохранён. Сделай экспорт перед закрытием страницы.';
 }));panel.append(finish,feedback);
 const extras=el('details','work-extras');extras.append(el('summary','','Демо, сравнение и проверка песни'));
 extras.append(el('p','studio-note','Сохрани ссылку на аудио в своём хранилище. Сам файл Искра не загружает и не копирует.'));
 const demo=field('Ссылка на демо · необязательно',work.demo,value=>{t.work={...(t.work||work),demo:value};saveStudio();link.hidden=!safeDemo(value);link.href=safeDemo(value)||'#';},1000);demo.querySelector('input').type='url';demo.querySelector('input').placeholder='https://…';extras.append(demo);
 const link=el('a','demo-link','Открыть демо →');link.target='_blank';link.rel='noopener noreferrer';link.hidden=!safeDemo(work.demo);link.href=safeDemo(work.demo)||'#';extras.append(link);
 const ab=el('fieldset','work-ab');ab.append(el('legend','','A / B · сравни одну разницу'));
 ab.append(el('p','studio-note','Сохрани обе версии отдельно, выровняй громкость, послушай после паузы. Побеждает нужное ощущение, а не более громкий вариант.'));
 const options=el('div','work-ab-options');
 [['A','Оставляю A'],['B','Оставляю B'],['retry','Переслушаю позже']].forEach(([value,label])=>{const wrap=el('label','mission-option'),input=el('input');input.type='radio';input.name='ab-'+t.id;input.checked=work.decision===value;input.value=value;input.addEventListener('change',()=>{t.work={...(t.work||work),decision:value};saveStudio()});wrap.append(input,el('span','',label));options.append(wrap)});ab.append(options);extras.append(ab);
 const checks=el('fieldset','work-checks');checks.append(el('legend','','Что уже слышно в песне?'));
 [['emotion','Верю эмоции без объяснений'],['hook','Помню главный ход после паузы'],['whole','Могу дослушать целиком без пробелов']].forEach(([value,label])=>{
  const wrap=el('label','mission-option'),input=el('input');input.type='checkbox';input.checked=work.checks.includes(value);input.addEventListener('change',()=>{const current=t.work||work,values=new Set(current.checks);input.checked?values.add(value):values.delete(value);t.work={...current,checks:[...values]};saveStudio()});wrap.append(input,el('span','',label));checks.append(wrap);
 });extras.append(checks);panel.append(extras);
 if(work.sessions.length){const history=el('details','work-history');history.append(el('summary','','Сделано: '+work.sessions.length+' сессий'));const list=el('ul');work.sessions.slice().reverse().forEach(s=>{const date=new Date(s.at);list.append(el('li','',(Number.isNaN(date.getTime())?'':date.toLocaleDateString('ru-RU')+' · ')+s.title+' — '+s.result))});history.append(list);panel.append(history);}
 return panel;
}
function receiveTask(task){
 const node=document.querySelector('#studio-assignment');node.hidden=false;node.replaceChildren(el('span','kind','В РАБОТУ'),el('h3','',task.title),el('p','studio-note',task.task));
 const label=el('label','studio-label','К какому треку прикрепить задание?');label.htmlFor='assignment-track';const select=el('select','studio-select');select.id='assignment-track';
 const first=el('option','','Новый трек');first.value='new';select.append(first);
 studio.tracks.forEach((t,i)=>{const option=el('option','',(i+1)+'. '+(t.name||'Без названия'));option.value=t.id;select.append(option)});node.append(label,select);
 let createdTrack=null;const controls=el('div','studio-tools');controls.append(workButton('Прикрепить задание',()=>{
  let track=select.value==='new'?createdTrack:studio.tracks.find(t=>t.id===select.value);
  if(!track){if(studio.tracks.length>=100){status.textContent='В проекте уже 100 треков. Выбери существующий.';return;}track=newTrack();track.name=Number.isInteger(task.day)?'Идея · день '+(task.day+1):'Новая искра';studio.tracks.push(track);createdTrack=track;}
  track.work={...(track.work||cleanWork({})),task};expandedTrack=track.id;
  if(saveStudio()){node.hidden=true;renderStudio();document.querySelector('.track-work')?.scrollIntoView({block:'start',behavior:'instant'});}else status.textContent='Задание пока не сохранено. Экспортируй данные перед закрытием страницы.';
 }),workButton('Пока не прикреплять',()=>{node.hidden=true;}));node.append(controls);const status=el('p','studio-note');status.setAttribute('role','status');node.append(status);
}
const studioStatus=el('p','studio-note');studioStatus.id='studio-save-status';studioStatus.setAttribute('role','status');document.querySelector('#studio-view').append(studioStatus);
if(studioBlocked)studioStatus.textContent='Прежнее сохранение не удалось прочитать. Оно не перезаписано. Восстанови резервную копию.';
window.IskraStudio={snapshot:()=>JSON.parse(JSON.stringify(studio)),key:studioKey,blocked:()=>studioBlocked,receive:receiveTask,validate:p=>p&&typeof p.name==='string'&&p.name.length<=90&&Array.isArray(p.tracks)&&p.tracks.length<=100&&p.tracks.every(t=>t&&typeof t==='object'&&typeof t.name==='string'&&t.name.length<=100),normalize:p=>({...p,name:p.name.slice(0,90),tracks:p.tracks.map(cleanTrack)})};
window.addEventListener('iskra:album-change',renderCompass);
renderStudio();
