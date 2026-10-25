const CACHE='svoboda-v4';
const ASSETS=['./','./index.html','./styles.css?v=4','./coach.js?v=4','./app.js?v=4','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('svoboda-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request);if(response.ok)event.waitUntil(cache.put(request,response.clone()));return response;}
  catch(error){const saved=await cache.match(request);if(saved)return saved;if(request.mode==='navigate'){const page=await cache.match('./index.html');if(page)return page;}throw error;}
 })());
});
