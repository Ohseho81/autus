const CACHE_NAME='autus-sovereign-v15.1.0-live';
const CORE_ASSETS=['./','./index.html','./manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(n=>Promise.all(n.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(!e.request.url.startsWith('http'))return;e.respondWith(caches.match(e.request).then(c=>{if(c)return c;return fetch(e.request).then(r=>{if(!r||r.status!==200)return r;const clone=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,clone));return r}).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):undefined)}))});
self.addEventListener('sync',e=>{if(e.tag==='autus-p2p-sync')e.waitUntil(Promise.resolve())});
self.addEventListener('push',e=>{const d=e.data?.json()||{};e.waitUntil(self.registration.showNotification(d.title||'AUTUS',{body:d.body||'New decision available',tag:'autus-notification',data:d}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l.length>0?l[0].focus():clients.openWindow('./')))});
