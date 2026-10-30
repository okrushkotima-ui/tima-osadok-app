/* Единая копия РИТМ / Свобода — локальная, без отправки данных. */
(()=>{'use strict';
const whitelist=/^(?:ritm[-_]|svoboda_tima_v\d+$|weight-tracke[-_]|tima-osadok[-_])/;
const $=id=>document.getElementById(id),status=$('fusion-backup-status');
if(!$('fusion-export')||!$('fusion-import'))return;
function notify(message){if(status)status.textContent=message}
function selectedKeys(){const a=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&whitelist.test(k))a.push(k)}return a}
$('fusion-export').addEventListener('click',()=>{
 try{
  const records={};selectedKeys().forEach(k=>records[k]=localStorage.getItem(k));
  const data={app:'ritm-unified-backup',version:1,exportedAt:new Date().toISOString(),records};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='ritm-full-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
  notify('Единая резервная копия скачана. Сохрани файл надёжно.');
 }catch{notify('Не удалось скачать копию. Проверь настройки Safari.')}
});
$('fusion-import').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>4_000_000)throw Error('Слишком большой файл');
  const backup=JSON.parse(await file.text());
  if(backup?.app!=='ritm-unified-backup'||backup.version!==1||!backup.records||typeof backup.records!=='object'||Array.isArray(backup.records))throw Error('Это не полная резервная копия РИТМа');
  const entries=Object.entries(backup.records);
  if(!entries.length||entries.length>80||entries.some(([key,value])=>!whitelist.test(key)||typeof value!=='string'||value.length>3_000_000))throw Error('Неверное содержимое копии');
  for(const [,value] of entries){JSON.parse(value)}
  if(!confirm('Восстановить полную копию? Текущие записи с теми же именами будут заменены. Рекомендуем сначала скачать текущую копию.'))return;
  const original=entries.map(([key])=>[key,localStorage.getItem(key)]);
  try{for(const [key,value] of entries)localStorage.setItem(key,value)}
  catch(err){for(const [key,value] of original){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}throw err}
  notify('Данные восстановлены. Обновляем приложение.');
  location.reload();
 }catch(err){notify('Не удалось восстановить: '+(err?.message||'проверь файл'))}
 finally{event.target.value=''}
});
})();