/* РИТМ · Треки: оригинальный локальный MP3/WAV играет целиком.
   Аудио сохраняется в IndexedDB этого устройства, не в GitHub/облаке.
   Не выдаём внешние превью за полную композицию.
*/
(function (root) {
  "use strict";
  const TRACKS = [
    {id:"ushi",name:"По уши влип в тебя",duration:"1:44",role:"Главный трек · романтика",url:"https://music.yandex.ru/search?text=%D1%82%D0%B8%D0%BC%D0%B0%20%D0%BE%D1%81%D0%B0%D0%B4%D0%BE%D0%BA%20%D0%9F%D0%BE%20%D1%83%D1%88%D0%B8%20%D0%B2%D0%BB%D0%B8%D0%BF%20%D0%B2%20%D1%82%D0%B5%D0%B1%D1%8F",tag:"хит"},
    {id:"glaza",name:"Её глаза",duration:"1:55",role:"Ночь · взгляд · атмосфера",url:"https://music.yandex.ru/search?text=%D1%82%D0%B8%D0%BC%D0%B0%20%D0%BE%D1%81%D0%B0%D0%B4%D0%BE%D0%BA%20%D0%95%D0%B5%20%D0%B3%D0%BB%D0%B0%D0%B7%D0%B0",tag:"эстетика"},
    {id:"net",name:"Нас больше нет",duration:"1:57",role:"Драма · живая история",url:"https://music.yandex.ru/search?text=%D1%82%D0%B8%D0%BC%D0%B0%20%D0%BE%D1%81%D0%B0%D0%B4%D0%BE%D0%BA%20%D0%9D%D0%B0%D1%81%20%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B5%20%D0%BD%D0%B5%D1%82",tag:"эмоция"},
    {id:"kislorod",name:"Кислород",duration:"2:06",role:"Мелодия · чувство",url:"https://music.yandex.ru/search?text=%D1%82%D0%B8%D0%BC%D0%B0%20%D0%BE%D1%81%D0%B0%D0%B4%D0%BE%D0%BA%20%D0%9A%D0%B8%D1%81%D0%BB%D0%BE%D1%80%D0%BE%D0%B4",tag:"песня"},
    {id:"pravda",name:"Правды нет",duration:"1:52*",role:"Рабочая версия v3 · не публичный релиз",url:"",tag:"демо"},
    {id:"home",name:"Буду ждать тебя дома",duration:"1:14*",role:"Демо из твоего архива",url:"",tag:"демо"}
  ];
  const DB_NAME="ritm-content-full-tracks-v1";
  const STORE="audio";
  let dbPromise=null, objectURL=null, playingId=null;
  let loaded=new Set();
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function openDB(){
    if(!("indexedDB" in root))return Promise.reject(Error("Этот браузер не поддерживает локальное хранение музыки"));
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error("Ошибка музыкальной библиотеки"));
      request.onblocked=()=>reject(Error("Закрой другие вкладки РИТМ и попробуй ещё раз"));
    }).catch(e=>{dbPromise=null;throw e;});
    return dbPromise;
  }
  async function operation(kind,id,value){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,kind==="get"?"readonly":"readwrite");
      const s=tx.objectStore(STORE);
      const req=kind==="get"?s.get(id):kind==="put"?s.put(value,id):s.delete(id);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error("Ошибка записи"));
      tx.onabort=()=>reject(tx.error||Error("Хранилище недоступно"));
    });
  }
  async function refresh(){
    try{
      for(const t of TRACKS){
        const v=await operation("get",t.id);
        if(v?.blob)loaded.add(t.id);else loaded.delete(t.id);
      }
      const el=document.querySelector("#app");
      if(el?.querySelector(".music-library"))for(const t of TRACKS){
        const status=el.querySelector('[data-song-status="'+t.id+'"]');
        if(status)status.textContent=loaded.has(t.id)?"Сохранён на устройстве ✓":"Нужен полный MP3";
      }
    }catch(e){statusMessage(e.message);}
  }
  function statusMessage(s) {
    const n=document.querySelector("#songMessage");
    if(n)n.textContent=s;
  }
  function render(){
    queueMicrotask(refresh);
    return '<section class="panel music-hero"><span class="eyebrow">ПОЛНАЯ МУЗЫКА · НЕ ОТРЫВКИ</span><h1>Твои песни. Прямо в РИТМ.</h1><p>Для выпущенных песен открой поиск в Яндекс Музыке. Для прослушивания внутри РИТМ один раз загрузи свой полный MP3, WAV или M4A — он будет работать даже без интернета. Файл сохранится только на этом телефоне или компьютере. Никаких 15-секундных превью вместо песни.</p><p class="music-note" id="songMessage">Другие устройства не синхронизируются автоматически. Не очищай данные сайта: вместе с ними могут удалиться загруженные треки.</p><div class="music-chip-row"><span>▶ Полное воспроизведение</span><span>♡ Твои треки</span><span>⌁ Съёмка под музыку</span></div></section>'+
      '<section class="music-library">'+TRACKS.map((t,i)=>
        '<article class="music-track card"><div class="music-top"><span class="pill">'+esc(t.tag)+'</span><span class="music-duration">'+esc(t.duration)+'</span></div><div class="music-cover"><span>♫</span><small>'+String(i+1).padStart(2,"0")+'</small></div><h3>'+esc(t.name)+'</h3><p>'+esc(t.role)+'</p><small data-song-status="'+t.id+'">Проверяем файл…</small><div class="music-controls">'+(t.url?'<a class="music-yandex" href="'+esc(t.url)+'" target="_blank" rel="noopener noreferrer">♫ Найти в Яндекс Музыке ↗</a>':'')+'<button type="button" class="music-local-play" data-song-play="'+t.id+'">▶ Мой MP3</button><label class="music-attach"><input type="file" accept=".mp3,.wav,.m4a,.aac,audio/*" data-song-upload="'+t.id+'">Добавить MP3</label></div><div class="music-links">'+(t.url?'<a href="'+esc(t.url)+'" target="_blank" rel="noopener noreferrer">Найти в Яндекс Музыке ↗</a>':'<span>Только личный файл</span>')+'<button type="button" data-song-delete="'+t.id+'">Убрать аудио</button></div></article>'
      ).join("")+'</section><section class="panel"><h2>Как пользоваться</h2><p>Для выпущенных песен нажми «Найти в Яндекс Музыке» — откроется поиск конкретной композиции. Для воспроизведения внутри РИТМ сначала прикрепи полный файл, затем нажми «Мой MP3». Музыка будет играть, даже если перейти на вкладку «Сегодня». Ссылки на Яндекс Музыку открывают результаты поиска, а не транслируют песню внутри РИТМ.</p><p>* Для «Правды нет» и «Буду ждать тебя дома» длительность указана по найденным архивным версиям; это не подтверждение финального мастера. Запись может быть заменена твоим окончательным файлом.</p></section>';
  }
  function dock(){
    let d=document.querySelector("#ritmMusicDock");
    if(!d){
      d=document.createElement("div");d.id="ritmMusicDock";d.className="music-dock";d.hidden=true;
      d.innerHTML='<div class="music-dock-top"><span id="ritmMusicName"></span><button id="ritmMusicClose" aria-label="Закрыть плеер">×</button></div><audio id="ritmAudio" controls preload="metadata"></audio>';
      document.body.appendChild(d);
    }
    return d;
  }
  async function play(id){
    const t=TRACKS.find(t=>t.id===id);if(!t)return;
    let record;
    try{record=await operation("get",id);}catch(e){statusMessage(e.message);return;}
    if(!record?.blob){
      statusMessage("Для «"+t.name+"» сначала добавь свой полный MP3. Или открой ссылку на Яндекс Музыку.");
      const status=document.querySelector('[data-song-status="'+id+'"]');
      if(status)status.textContent="Загрузи MP3 или открой Яндекс Музыку";
      return;
    }
    if(objectURL)URL.revokeObjectURL(objectURL);
    objectURL=URL.createObjectURL(record.blob);
    const d=dock(),audio=d.querySelector("audio");
    d.hidden=false;
    d.querySelector("#ritmMusicName").textContent="ТИМА ОСАДОК · "+t.name;
    audio.src=objectURL;
    playingId=id;
    try{await audio.play();}catch{statusMessage("Нажми ▶ на плеере — браузер не разрешил автозапуск.");}
  }
  async function upload(id,file){
    if(!file)return;
    if(file.size>100*1024*1024){statusMessage("Файл больше 100 МБ. Сохрани MP3 поменьше.");return;}
    const ext=file.name.split(".").pop()?.toLowerCase();
    if(!["mp3","m4a","wav","aac","flac","ogg"].includes(ext)&&!file.type.startsWith("audio/")){
      statusMessage("Выбери MP3 или другой аудиофайл.");return;
    }
    try{
      await operation("put",id,{blob:file,name:file.name,at:new Date().toISOString()});
      loaded.add(id);
      await refresh();
      statusMessage("Полный файл сохранён в РИТМ на этом устройстве.");
      await play(id);
    }catch(e){statusMessage("Не получилось сохранить: "+e.message+". Проверь свободное место и настройки браузера.");}
  }
  async function remove(id){
    if(!confirm("Удалить сохранённую песню с этого устройства? Сам исходный MP3 не пострадает."))return;
    try{await operation("delete",id);loaded.delete(id);if(playingId===id){const d=dock();d.querySelector("audio").pause();d.hidden=true;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;playingId=null;}refresh();}catch(e){statusMessage(e.message);}
  }
  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-song-play],[data-song-delete],#ritmMusicClose");
    if(!el)return;
    if(el.id==="ritmMusicClose"){const d=dock();d.querySelector("audio").pause();d.hidden=true;return;}
    if(el.dataset.songPlay)play(el.dataset.songPlay);
    if(el.dataset.songDelete)remove(el.dataset.songDelete);
  });
  document.addEventListener("change",e=>{
    const input=e.target.closest("[data-song-upload]");
    if(input?.files?.length){upload(input.dataset.songUpload,input.files[0]);input.value="";}
  });
  root.RitmPlayer={render,play,tracks:TRACKS};
})(typeof window!=="undefined"?window:globalThis);