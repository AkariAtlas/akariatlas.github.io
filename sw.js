const C='ak-2611141127',DATA='tw-data-v1';const SHELL=['./','./index.html','./manifest.json','./icon.svg','./icon-192.png','./splash.js','./errlog.js','./akari.js','./qrcode.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==DATA&&x!=='tw-tiles').map(x=>caches.delete(x)))));self.clients.claim()});
const net=(req,cache)=>fetch(req).then(r=>{if(r.ok){const cl=r.clone();caches.open(cache).then(c=>c.put(req,cl))}return r}).catch(()=>caches.match(req).then(r=>r||Promise.reject('offline')));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
 if(u.origin===location.origin){e.respondWith(net(e.request,C).catch(()=>caches.match('./index.html')));return}
 // Map tiles you've already viewed: cache-first, kept for offline
 if(/tile\.openstreetmap\.org/.test(u.host)){e.respondWith(caches.open('tw-tiles').then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{c.put(e.request,n.clone());return n}))));return}
 // Libraries & fonts: cache-first
 if(/unpkg\.com|fonts\.(googleapis|gstatic)/.test(u.host)){e.respondWith(caches.match(e.request).then(r=>r||net(e.request,C)));return}
 // Live data (weather, search, exchange rate): network-first, last result kept for offline
 if(/open-meteo|photon\.komoot|er-api/.test(u.host)){e.respondWith(net(e.request,DATA));return}
});
