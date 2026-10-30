/* Модули Свободы внутри единого РИТМа. Без отдельной шапки и меню. */
(()=>{
 'use strict';
 const kind=new URLSearchParams(location.search).get('embed');
 if(!['food','freedom'].includes(kind)||window.parent===window)return;
 document.documentElement.classList.add('ritm-embedded');
 document.body.classList.add('ritm-embedded','ritm-'+kind);
 const app=document.querySelector('.app'),main=app?.querySelector('main');
 if(kind==='food')document.querySelector('[data-tab="food"]')?.click();
 else document.querySelector('[data-tab="today"]')?.click();
 const allowed=new Set(['today','sobriety','food','sport','progress','settings']);
 function measure(){
  if(!app)return;
  const h=Math.ceil(app.getBoundingClientRect().height)+32;
  window.parent.postMessage({type:'ritm-embed-size',kind,height:Math.max(400,h)},location.origin);
 }
 function open(tab){
  if(!allowed.has(tab))return;
  const button=document.querySelector('[data-tab="'+tab+'"]');
  if(button)button.click();
  requestAnimationFrame(measure);
 }
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data)return;
  if(e.data.type==='ritm-remeasure')requestAnimationFrame(measure);
  if(e.data.type==='ritm-open-tab')open(e.data.tab);
 });
 window.addEventListener('resize',()=>requestAnimationFrame(measure));
 if(typeof ResizeObserver!=='undefined'&&app){const observer=new ResizeObserver(()=>requestAnimationFrame(measure));observer.observe(app)}
 if(main)new MutationObserver(()=>requestAnimationFrame(measure)).observe(main,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
 window.addEventListener('load',()=>{setTimeout(measure,120);window.parent.postMessage({type:'ritm-embed-ready',kind},location.origin)});
 document.querySelectorAll('button,summary,input,select,textarea').forEach(el=>el.addEventListener('click',()=>setTimeout(measure,70)));
 requestAnimationFrame(measure);
})();