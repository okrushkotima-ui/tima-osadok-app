/* Режим внутри РИТМа: тот же код и записи Свободы, без второй шапки. */
(()=>{
 const params=new URLSearchParams(location.search),kind=params.get('embed');
 if(!['food','freedom'].includes(kind)||window.parent===window)return;
 document.documentElement.classList.add('ritm-embedded');
 document.body.classList.add('ritm-embedded','ritm-'+kind);
 const nav=document.querySelector('nav.nav'),app=document.querySelector('.app'),main=app?.querySelector('main');
 if(kind==='food'){document.querySelector('[data-tab="food"]')?.click();}
 else if(nav&&app&&main){app.insertBefore(nav,main);}
 function measure(){if(!app)return;const h=Math.ceil(app.getBoundingClientRect().height)+22;window.parent.postMessage({type:'ritm-embed-size',kind,height:Math.max(400,h)},location.origin)}
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='ritm-remeasure')requestAnimationFrame(measure)});
 window.addEventListener('resize',()=>requestAnimationFrame(measure));
 if(typeof ResizeObserver!=='undefined'){const obs=new ResizeObserver(()=>requestAnimationFrame(measure));obs.observe(app);document.querySelectorAll('.screen').forEach(s=>obs.observe(s))}
 new MutationObserver(()=>requestAnimationFrame(measure)).observe(main,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
 window.addEventListener('load',()=>setTimeout(measure,100));
 document.querySelectorAll('button,summary,input,select,textarea').forEach(el=>el.addEventListener('click',()=>setTimeout(measure,60)));
 requestAnimationFrame(()=>setTimeout(measure,120));
})();