/* Akari Atlas · resilient network layer for free map/weather services:
   on-device cache (fresh → instant, offline → last copy) + your own backend as a fallback relay when a service rate-limits or is down */
(function () {
  const RULES = [[/photon\.komoot\.io/, 864e5], [/nominatim\.openstreetmap\.org/, 7 * 864e5], [/overpass/, 864e5], [/routing\.openstreetmap\.de/, 14 * 864e5],
    [/api\.open-meteo\.com\/v1\/forecast/, 15 * 60e3], [/archive-api\.open-meteo\.com|api\.open-meteo\.com\/v1\/elevation/, 30 * 864e5], [/open\.er-api\.com/, 3600e3], [/api\.mymemory\.translated\.net|lingva/, 30 * 864e5]];
  const CN = 'ak-net', _fetch = window.fetch.bind(window), stats = window.AKNET = { hit: 0, net: 0, relay: 0, stale: 0 };
  const ttlFor = u => (RULES.find(([r]) => r.test(u)) || [])[1];
  async function keyOf(url, init) { if (!init || !init.body) return url; const b = typeof init.body === 'string' ? init.body : ''; const h = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(b)); return url + '#' + [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('') }
  async function relay(url, init) { if (typeof api !== 'function' || !window.CFG?.API) throw 0; const j = await api({ action: 'proxy', url, method: (init && init.method) || 'GET', body: init && typeof init.body === 'string' ? init.body : '' });
    stats.relay++; return new Response(j.text, { status: 200, headers: { 'Content-Type': j.type || 'application/json' } }) }
  window.fetch = async function (input, init) { const url = typeof input === 'string' ? input : input.url, ttl = ttlFor(url); if (!ttl || (init && init.method && !/GET|POST/i.test(init.method))) return _fetch(input, init);
    let c, k; try { c = await caches.open(CN); k = await keyOf(url, init) } catch (e) { return _fetch(input, init) }
    const hit = await c.match(k); const age = hit ? Date.now() - +(hit.headers.get('x-ak-at') || 0) : Infinity; if (hit && age < ttl) { stats.hit++; return hit }
    const store = async r => { try { const body = await r.clone().text(); if (r.ok && body.length < 900000) await c.put(k, new Response(body, { headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/json', 'x-ak-at': String(Date.now()) } })) } catch (e) { } return r };
    try { const r = await _fetch(input, init); if (r.ok) { stats.net++; return store(r) } if (r.status === 429 || r.status >= 500) throw r.status; return r }
    catch (e) { if (init?.signal?.aborted) throw e; try { return await store(await relay(url, init)) } catch (x) { } if (hit) { stats.stale++; return hit } throw e } };
  // housekeeping: keep the cache small (drop entries older than 30 days, once a day)
  setTimeout(async () => { try { if (Date.now() - (+localStorage.getItem('ak_net_gc') || 0) < 864e5) return; localStorage.setItem('ak_net_gc', Date.now()); const c = await caches.open(CN);
    for (const r of await c.keys()) { const m = await c.match(r); if (Date.now() - +(m.headers.get('x-ak-at') || 0) > 30 * 864e5) await c.delete(r) } } catch (e) { } }, 8000);
})();
