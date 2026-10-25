(() => {
'use strict';
const $=s=>document.querySelector(s);
function button(text,fn){const b=el('button','studio-quiet',text);b.type='button';b.addEventListener('click',fn);return b;}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
if(giftMode){
 const welcome=$('#gift-welcome');let started=false;try{started=localStorage.getItem('iskra-gift-started-v1')==='1';}catch{}
 if(!started){welcome.hidden=false;welcome.append(el('span','kind','ЭТО ТВОЯ ИСКРА'),el('h2','','Для альбома, который пока только внутри'),el('p','','Три места для музыки: «Искры» помогают начать, «Альбом 30 дней» ведёт по сессиям, «Студия» хранит песни и следующие шаги. Можно идти в своём темпе, без опыта и идеальной записи.'));
 welcome.append(button('Начать свой альбом →',()=>{try{localStorage.setItem('iskra-gift-started-v1','1');}catch{}welcome.hidden=true;IskraAlbum.open('album');$('#album-title').focus({preventScroll:true});}));welcome.append(el('p','studio-note','У тебя своё пространство. Ссылка не содержит чужих треков или ответов. Сохраняй копию альбома для переноса на другой телефон.'));}
}
const take=button('В работу →',()=>{IskraStudio.receive({title:'Из карточки вдохновения',task:$('#prompt').textContent,output:'Короткая запись или текстовый набросок, который можно переслушать.',review:'Есть ли деталь, к которой хочется вернуться?'});IskraAlbum.open('studio');$('#studio-assignment').scrollIntoView({block:'start',behavior:'instant'});$('#assignment-track').focus({preventScroll:true});});take.id='inspire-take';take.classList.add('inspire-take');$('#inspire-view').append(take);
const rescue=el('details','rescue-panel');rescue.append(el('summary','','Если сегодня не пишется'));
const tools=el('div','rescue-tools');
[
 ['Нет идеи','Заметь три звука вокруг. Выбери один ритм и напой поверх него 20 секунд. Сохрани без оценки.'],
 ['Всё кажется плохим','Сделай три заведомо разных варианта одной фразы. Ничего не удаляй. После паузы выбери один живой момент.'],
 ['Не могу закончить','Выбери один незакрытый фрагмент. Поставь самый простой рабочий вариант и сохрани полный черновик. Запиши одну следующую правку.']
].forEach(([title,task])=>tools.append(button(title,()=>{rescue.querySelector('.rescue-task').textContent=task;})));rescue.append(tools,el('p','rescue-task studio-note','Выбери, что мешает. Достаточно одного небольшого результата.'));$('#inspire-view').append(rescue);
$('#gift-share').addEventListener('click',()=>{
 const link=new URL('./',location.href);link.search='gift=1';link.hash='';
 let dialog=$('#gift-dialog');if(dialog)dialog.remove();dialog=el('dialog','gift-dialog');dialog.id='gift-dialog';dialog.setAttribute('aria-labelledby','gift-dialog-title');
 const title=el('h2','','Подари место для музыки');title.id='gift-dialog-title';dialog.append(title,el('p','studio-note','Друг начнёт со своего альбома. По этой ссылке передаётся приложение, без твоих треков, ответов и файлов.'));
 const input=el('input','studio-field');input.readOnly=true;input.value=link.href;input.setAttribute('aria-label','Подарочная ссылка');dialog.append(input);const status=el('p','studio-note');status.setAttribute('role','status');const controls=el('div','studio-tools');
 controls.append(button('Копировать ссылку',async()=>{try{await navigator.clipboard.writeText(link.href);status.textContent='Ссылка скопирована. Можно отправить другу.';}catch{input.focus();input.select();status.textContent='Скопируй выделенную ссылку.';}}));
 if(navigator.share)controls.append(button('Отправить другу',async()=>{try{await navigator.share({title:'Искра — для твоего альбома',text:'Место, где можно начать песню и довести свой альбом до готовой версии.',url:link.href});}catch(error){if(error.name!=='AbortError')status.textContent='Можно скопировать ссылку и отправить вручную.';}}));
 controls.append(button('Закрыть',()=>dialog.close()));dialog.append(controls,status);document.body.append(dialog);dialog.showModal();
});
$('#full-export').addEventListener('click',()=>{
 const album=IskraAlbum.snapshot(),project=IskraStudio.snapshot();
 download({app:'iskra-backup',version:1,exportedAt:new Date().toISOString(),project,album},'iskra-'+(giftMode?'gift-':'')+'backup-'+new Date().toISOString().slice(0,10)+'.json');
 $('#backup-status').textContent='Создан файл с треками, сессиями и ответами. Аудиофайлы сохрани отдельно. Храни копию в надёжном месте.';
});
$('#full-import').addEventListener('click',()=>$('#full-file').click());
$('#full-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;const status=$('#backup-status');
 try{
  if(file.size>3000000)throw Error('Файл слишком большой');const data=JSON.parse(await file.text());
  if(data.app!=='iskra-backup'||data.version!==1||!IskraAlbum.validate(data.album)||!IskraStudio.validate(data.project))throw Error('Нужна полная копия Искры с треками и миссиями');
  if(!confirm('Восстановить треки, сессии и ответы из этой копии? Текущее пространство будет заменено. Другой режим Искры останется без изменений.'))return;
  const entries=[[IskraStudio.key,JSON.stringify(IskraStudio.normalize(data.project))],[IskraAlbum.key,JSON.stringify(data.album)]],before=entries.map(([key])=>[key,localStorage.getItem(key)]);
  try{for(const [key,value] of entries)localStorage.setItem(key,value);}
  catch(error){let rollback=true;for(const [key,value] of before){try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{rollback=false;}}throw Error(rollback?'Не хватило места или доступа к хранилищу. Прежние данные восстановлены.':'Не удалось завершить восстановление. Не закрывай страницу; сохрани копию текущего состояния.');}
  location.reload();
 }catch(error){status.textContent='Копия не восстановлена: '+error.message;}finally{event.target.value='';}
});
})();
