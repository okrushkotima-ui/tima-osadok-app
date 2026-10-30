const CACHE='ritm-shell-v18';
const ASSETS=['./','./index.html','./styles.css?v=17','./fusion.css?v=1','./app.js?v=18','./fusion.js?v=1','./manifest.webmanifest','./sounds/success.wav','./sounds/impact.wav','./sounds/soft-no.wav','./sounds/tap.wav','./sounds/warm.wav','./assets/midnight-clouds.svg','./assets/ritm-cloud-lettering.webp','./icons/ritm-192.png','./icons/ritm-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(ASSETS.map(path=>cache.add(path)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ritm-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const response=await fetch(request);
      if(response.ok)await cache.put(request,response.clone());
      return response;
    }catch(error){
      const cached=await cache.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'){
        const page=await cache.match('./index.html');
        if(page)return page;
      }
      throw error;
    }
  })());
});