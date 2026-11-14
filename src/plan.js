/* Akari Atlas · auto itinerary + background booking sync */
// ---------- Auto-suggest itinerary from the trip's dates, base and budget ----------
function planBar() { return `<div class="row" style="margin:6px 0 10px;gap:8px;flex-wrap:wrap"><button class="act" onclick="(Object.values(D.routes||{}).some(r=>r&&r.length)&&typeof openCompare==='function')?openCompare():autoPlan(true)">✨ Suggest itinerary from my budget & dates</button><span class="muted" id="autoSt">${D.autoPlanned ? 'Auto-planned · edit anything.' : ''}</span></div>` }
on('plan:render', function planBarHook() { const r = $('route'); if (r && !document.getElementById('autoSt')) r.insertAdjacentHTML('afterbegin', planBar()) });

// ---------- Keep bookings synced (one-tap Yes, no account picker after the first time) ----------
const GMS = { tok: null, exp: 0 };
function gmBanner() { return; if (!gdAvailable() || localStorage.getItem('tw_gm_auto') === 'no' || document.getElementById('gmBan')) return;
  const on = localStorage.getItem('tw_gm_auto') === 'yes', last = +localStorage.getItem('tw_gm_last') || 0; if (on && Date.now() - last < 7 * 864e5) return; if (!on && (+localStorage.getItem('tw_gm_asked') || 0) > Date.now() - 30 * 864e5) return; localStorage.setItem('tw_gm_asked', Date.now());
  const b = document.createElement('div'); b.id = 'gmBan'; b.className = 'card'; b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:60;max-width:520px;margin:auto;padding:12px 14px';
  b.innerHTML = `<div class="row sp" style="gap:8px;align-items:center"><span>📬 <b>${on ? 'Check for new bookings?' : 'Keep bookings synced from Gmail?'}</b><div class="muted" style="font-size:13px">Upcoming flights & stays only · read-only</div></span><span class="row" style="gap:6px"><button class="act" onclick="gmYes()">Yes</button><button class="pill" onclick="gmNo()">${on ? 'Later' : 'No'}</button></span></div>`; document.body.appendChild(b) }
function gmNo() { const on = localStorage.getItem('tw_gm_auto') === 'yes'; if (!on) localStorage.setItem('tw_gm_auto', 'no'); else localStorage.setItem('tw_gm_last', Date.now()); document.getElementById('gmBan')?.remove() }
async function gmYes() { return openPasteImport(); document.getElementById('gmBan')?.remove(); await loadGIS(); const first = localStorage.getItem('tw_gm_auto') !== 'yes', hint = localStorage.getItem('tw_gm_hint') || '';
  const tok = await new Promise(res => { google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/gmail.readonly', prompt: first ? 'select_account' : '', login_hint: hint || undefined, callback: r => res(r.error ? null : r) }).requestAccessToken() });
  if (!tok) return toast('Gmail not connected'); GMS.tok = tok.access_token; GMS.exp = Date.now() + (tok.expires_in || 3600) * 1000; localStorage.setItem('tw_gm_auto', 'yes'); await gmSync() }
async function gmSync() { if (!GMS.tok || Date.now() > GMS.exp) return;
  const G = async p => (await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + GMS.tok } })).json();
  try { const me = await G('profile'); if (me.emailAddress) localStorage.setItem('tw_gm_hint', me.emailAddress) } catch (e) { }
  const q = encodeURIComponent('(flight OR itinerary OR e-ticket OR "booking confirmed" OR reservation OR "your booking" OR from:trip.com OR from:booking.com OR from:agoda.com OR from:airbnb.com) newer_than:13m -category:promotions');
  const list = await G(`messages?q=${q}&maxResults=60`); const today = new Date(); today.setHours(0, 0, 0, 0); const fl = [], ho = [];
  for (const m of list.messages || []) { const msg = await G(`messages/${m.id}?format=full`); const subj = (msg.payload.headers.find(h => h.name === 'Subject') || {}).value || ''; const t = msgText(msg.payload);
    parseFlights(t).forEach(f => { if (f.date >= today && !fl.some(x => x.no === f.no && +x.date === +f.date)) fl.push(f) }); const h = parseHotel(t, subj); if (h && h.start && (h.end || h.start) >= today) ho.push(h) }
  fl.sort((a, b) => a.date - b.date); localStorage.setItem('tw_gm_last', Date.now());
  const t = trip(); let ch = 0; if (t && t.start && t.end) { const s = new Date(t.start + 'T00:00:00'), e = new Date(t.end + 'T23:59:59'), nr = x => x >= new Date(+s - 2 * 864e5) && x <= new Date(+e + 2 * 864e5);
    const mine = fl.filter(f => nr(f.date)); const fmt = f => `${f.no} · ${f.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${f.time ? ' · ' + f.time : ''}${f.from ? ' · ' + f.from.slice(0, 40) : ''}`;
    if (mine[0] && t.out !== fmt(mine[0])) { t.out = fmt(mine[0]); ch++ } if (mine.length > 1 && t.back !== fmt(mine[mine.length - 1])) { t.back = fmt(mine[mine.length - 1]); ch++ } }
  D.gmFound = { flights: fl.map(f => ({ no: f.no, date: iso(f.date), time: f.time, from: f.from })), stays: ho.map(h => ({ name: h.name, start: h.start && iso(h.start), end: h.end && iso(h.end) })), at: Date.now() };
  save(); try { renderTripCard(); renderToday() } catch (e) { }
  toast(ch ? `Bookings updated (${ch} change${ch > 1 ? 's' : ''})` : `Bookings checked · ${fl.length} upcoming flight${fl.length === 1 ? '' : 's'}`) }
// re-check every 6h while the app is open (silent if the token is still valid), and offer on open
setTimeout(gmBanner, 4000); setInterval(() => { if (GMS.tok && Date.now() < GMS.exp) gmSync(); else gmBanner() }, 6 * 3600e3);

/* ---------- v2: fuller itinerary anchored to the flights (for the IO-ready PDF) ---------- */
// fix wrong country (e.g. a stay name that also exists elsewhere) using the stay address
function fixCountry(t) { if (t && t.base) { const a = (t.base.addrEn || '') + ' ' + (t.base.addr || '') + ' ' + (t.name || '');
  const fix = /Taiwan|Taipei|台灣|臺灣|台北|臺北/i.test(a) ? ['tw', 'TWD'] : /Japan|Tokyo|Osaka|日本/i.test(a) ? ['jp', 'JPY'] : /Korea|Seoul/i.test(a) ? ['kr', 'KRW'] : null;
  if (fix && t.cc !== fix[0]) { t.cc = fix[0]; t.cur = fix[1]; D.rateAt = 0; try { save() } catch (e) { } } } return t }
function flightTime(s) { const m = String(s || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i); if (!m) return null; let h = +m[1]; if (m[3]) h = h % 12 + (/p/i.test(m[3]) ? 12 : 0); return [h, +m[2]] }
const pad2 = n => String(n).padStart(2, '0'), hm = (h, m) => `${pad2(Math.floor(h + m / 60) % 24)}:${pad2(Math.round(m % 60))}`;
async function nearestAirport(t) { try { const ps = await photonQ('international airport', t.base.lat, t.base.lon, 10); return ps.filter(p => /airport|機場/i.test(p.name)).sort((a, b) => dist(t.base.lat, t.base.lon, a.lat, a.lon) - dist(t.base.lat, t.base.lon, b.lat, b.lon))[0] || null } catch (e) { return null } }
const THEMES2 = [
  ['Culture & old streets', ['museum', 'temple', 'old street', 'tea house', 'night market']], ['Nature & views', ['park', 'viewpoint', 'hiking trail', 'cafe', 'night market']],
  ['Shopping & hobbies', ['department store', 'toy store', 'bookstore', 'clothing store', 'restaurant']], ['Food crawl', ['breakfast', 'bakery', 'market', 'dessert', 'night market']],
  ['Art & gardens', ['art museum', 'garden', 'cafe', 'shopping street', 'restaurant']], ['Slow day & souvenirs', ['botanical garden', 'temple', 'souvenir', 'cafe', 'restaurant']]];
const COSTUSD = { museum: 5, temple: 0, 'old street': 8, 'tea house': 8, 'night market': 10, park: 0, viewpoint: 0, 'hiking trail': 0, cafe: 6, 'department store': 15, 'toy store': 20, bookstore: 10, 'clothing store': 25, restaurant: 12, breakfast: 4, bakery: 4, market: 6, dessert: 5, 'art museum': 6, garden: 2, 'shopping street': 10, 'botanical garden': 0, souvenir: 20 };
/* well-known places near the stay (have a Wikidata entry and an English name) — so suggestions are real landmarks, not "Temple" or "Attraction" */
const FAMOUS_Q = { museum: /museum/, 'art museum': /gallery|museum/, temple: /temple/, 'old street': /street|historic/, viewpoint: /viewpoint|peak/, park: /park/, garden: /garden/, 'botanical garden': /garden/, 'night market': /night/, 'hiking trail': /peak/, 'tea house': /tea/, attraction: /attraction|historic/ };
async function famousNear(lat, lon) { const k = 'fam2_' + lat.toFixed(2) + ',' + lon.toFixed(2); try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && c.d.length && Date.now() - c.t < 30 * 864e5) return c.d } catch (e) { }
  /* Wikipedia's map of articles = places notable enough to have one. Sample the stay and 4 points ~6 km around it. */
  const pts = [[0, 0], [.055, 0], [-.055, 0], [0, .06], [0, -.06]], seen = new Set(), d = [];
  const bad = /metro station|railway station|station \(|hospital|school|university|college|ministry|court|commission|federation|archdiocese|bus station|metro mall|building|headquarters|bank|hotel|district|village$|^\d{4} |stabbing|attack|incident|earthquake|fire|bridge|interchange|expressway|road$|avenue|office|council|party|league|company|corporation|tower$|residence$|cemetery|prison|police/i;
  const kind = n => /night market/i.test(n) ? 'marketplace night' : /museum|gallery|art|memorial hall/i.test(n) ? 'museum gallery' : /temple|shrine|church|cathedral|mosque|city god/i.test(n) ? 'place_of_worship temple' : /park|garden|botanical/i.test(n) ? 'park garden' : /mountain|trail|peak|hill/i.test(n) ? 'peak viewpoint' : /street|old|historic|wharf|gate|mansion|house|theat|hall/i.test(n) ? 'street historic attraction' : /101|observ|view/i.test(n) ? 'viewpoint attraction' : 'attraction';
  for (const [dy, dx] of pts) { try { const r = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat + dy}|${lon + dx}&gsradius=10000&gslimit=100&format=json&origin=*`)).json();
    for (const g of (r.query && r.query.geosearch) || []) { if (seen.has(g.title) || bad.test(g.title)) continue; seen.add(g.title); d.push({ name: g.title.replace(/\s*\(.*\)$/, '').replace(/, Taipei$/, ''), lat: g.lat, lon: g.lon, kind: kind(g.title), score: 1 }) } } catch (e) { } }
  try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d })) } catch (e) { } return d }
async function autoPlanCore(force) {
  const t = trip(); if (!t || !t.base || !DAYS.length) return toast('Set your trip dates and stay first');
  if (!force && Object.values(D.routes || {}).some(r => r && r.length >= 3)) return;
  const st = $('autoSt'); if (st) st.textContent = '✨ Building your day-by-day plan from your flights, stay and budget…';
  let usd = 1; try { usd = (await rateOf('USD', DC())) || 1 } catch (e) { }
  const perDay = ((+D.total || 0) * 0.45 / DAYS.length) / R(), cur = sym(DC()).trim(), used = new Set();
  const ap = await nearestAirport(t), arr = flightTime(t.out), dep = flightTime(t.back), arrH = arr ? arr[0] + 2.5 : 9; // Manila→Taipei ~2h20 + immigration
  D.routes = {}; D.stopx = {}; D.notes = D.notes || {};
  const pool = {}, famous = await famousNear(t.base.lat, t.base.lon);
  const generic = n => !n || n.length < 4 || /^(the )?(temple|attraction|park|museum|market|night market|restaurant|cafe|café|garden|viewpoint|shop|store|bakery|bookstore|souvenir|breakfast)(\s+\S+)?$/i.test(n.trim()) || /^(attraction|unnamed)/i.test(n) || /\b(hotel|hostel|inn|entrance|supply|wholesale)\b/i.test(n);
  const get = async q => { if (!pool[q]) { const fm = FAMOUS_Q[q] ? famous.filter(p => FAMOUS_Q[q].test(p.kind)) : []; const ph = await photonQ(q + ' ' + (t.base.city || ''), t.base.lat, t.base.lon, 15); pool[q] = [...fm, ...ph.filter(p => !generic(p.name))] }
    return pool[q].filter(p => !used.has(p.name) && dist(t.base.lat, t.base.lon, p.lat, p.lon) < 18) };
  for (let i = 0; i < DAYS.length; i++) {
    const first = i === 0, last = i === DAYS.length - 1, day = [], ex = []; let spend = 0;
    if (first && ap) { day.push([ap.name + ' (arrival)', ap.lat, ap.lon, '']); ex.push({ time: arr ? hm(arr[0] + 2, arr[1] + 20) : '', note: 'Land, immigration & SIM. ' + (t.out || '') }) }
    if (first) { day.push([t.base.name + ' (drop bags)', t.base.lat, t.base.lon, '']); ex.push({ time: hm(arrH + 1.5, 0), note: 'Check-in or leave luggage at your stay' }) }
    let qs = first ? ['cafe', 'night market'] : last ? ['breakfast', 'souvenir'] : THEMES2[(i - 1) % THEMES2.length][1];
    const times = first ? [hm(Math.max(arrH + 3, 12), 0), '18:30'] : last ? ['09:00', '11:00'] : ['09:30', '11:30', '14:00', '16:30', '19:00'];
    for (let k = 0; k < qs.length; k++) { const c = Math.round((COSTUSD[qs[k]] ?? 8) * usd); if (perDay && spend + c > perDay && c) continue;
      let p = (await get(qs[k]))[0]; if (!p) p = (await get('attraction'))[0]; if (!p) continue; used.add(p.name); spend += c;
      day.push([p.name, p.lat, p.lon, c ? `${cur}${c}` : 'Free']); ex.push({ time: times[k] || '' }) }
    if (last) { day.push([t.base.name + ' (check-out)', t.base.lat, t.base.lon, '']); ex.push({ time: '12:00', note: 'Check out, keep bags until airport' });
      if (ap) { day.push([ap.name + ' (departure)', ap.lat, ap.lon, '']); ex.push({ time: dep ? hm(dep[0] - 3, dep[1]) : '', note: 'Be at the airport ~3 h before. ' + (t.back || '') }) } }
    D.routes[i] = day; day.forEach((_, k) => D.stopx[i + ':' + k] = ex[k] || {});
    const theme = first ? 'Arrival day' : last ? 'Departure day' : THEMES2[(i - 1) % THEMES2.length][0];
    D.notes[i] = `✨ ${theme} · est. ${cur}${Math.round(spend)}${perDay ? ` of ${cur}${Math.round(perDay)}/day` : ''}`;
    if (st) st.textContent = `✨ Planning ${DAYS[i]}…`;
  }
  D.autoPlanned = Date.now(); save(); renderPlan(); try { renderToday() } catch (e) { }
  const s2 = $('autoSt'); if (s2) s2.textContent = '✅ Full trip planned from your flights & budget. Edit anything, then 📄 Download itinerary PDF.'; toast('Itinerary ready ✨') }
// re-plan once for trips that only got a thin plan from the earlier version
setTimeout(() => { try { const t = trip(); const thin = Object.values(D.routes || {}).filter(r => (r || []).length >= 3).length < Math.max(1, DAYS.length - 2); if (t?.base && thin && !D.planV2 && !D.manualStops) { D.planV2 = 1; autoPlan(true) } } catch (e) { } }, 3000);
/* resilient place search: Photon first, then Nominatim (polite 1 req/s) */
let _nomLast = 0;
async function nomQ(q, lat, lon, n = 10, km = 12) { const w = Math.max(0, _nomLast + 1100 - Date.now()); if (w) await new Promise(r => setTimeout(r, w)); _nomLast = Date.now();
  const d = km / 111, vb = [lon - d, lat + d, lon + d, lat - d].join(',');
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=${n}&accept-language=en&bounded=1&viewbox=${vb}`); if (!r.ok) return [];
  return (await r.json()).filter(x => x.name).map(x => ({ name: x.name, lat: +x.lat, lon: +x.lon, sub: x.display_name.split(',').slice(1, 3).join(',').trim() })) }
async function photonQ(q, lat, lon, n = 6) { let r = []; try { const c = new AbortController(); const tm = setTimeout(() => c.abort(), 6000);
  const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lon}&limit=${n}&lang=en`, { signal: c.signal })).json(); clearTimeout(tm);
  r = j.features.filter(f => f.properties.name).map(f => ({ name: f.properties.name, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] })).filter(p => dist(lat, lon, p.lat, p.lon) < 25) } catch (e) { }
  if (!r.length) { try { r = await nomQ(q.trim(), lat, lon, n, /airport/.test(q) ? 50 : 12) } catch (e) { } } return r }
/* fix stays that were geocoded to the wrong country (e.g. a same-named place abroad) */
const CC_BOX = { tw: [21.8, 119.3, 25.4, 122.1], jp: [24, 122.9, 45.6, 146], kr: [33, 124.5, 38.7, 130.9], ph: [4.5, 116.8, 21.2, 126.7], th: [5.6, 97.3, 20.5, 105.7], hk: [22.1, 113.8, 22.6, 114.5], sg: [1.2, 103.6, 1.5, 104.1] };
async function fixBaseGeo() { const t = trip(); if (!t?.base) return false; const b = CC_BOX[t.cc]; if (!b) return false; const { lat, lon } = t.base;
  if (lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) return false;
  let cn = ''; try { cn = new Intl.DisplayNames(['en'], { type: 'region' }).of(t.cc.toUpperCase()) } catch (e) { }
  const strip = a => String(a || '').replace(/\d+\s*樓.*$|\d+F\b.*$|,?\s*(floor|fl\.?)\s*\d+.*$/i, '').trim();
  for (const q of [t.base.addrEn, strip(t.base.addr), t.base.addr, t.base.name + ' ' + cn, t.base.name].filter(Boolean)) { try { await new Promise(w => setTimeout(w, 1100)); const r = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=${t.cc}`)).json();
    if (r[0] && +r[0].lat >= b[0] && +r[0].lat <= b[2] && +r[0].lon >= b[1] && +r[0].lon <= b[3]) { Object.assign(t.base, { lat: +r[0].lat, lon: +r[0].lon, cc: t.cc, country: cn || t.base.country, cur: t.cur || t.base.cur }); D.legs = {}; save(); try { buildDays() } catch (e) { } return true } } catch (e) { } }
  const inBox = (la, lo) => la >= b[0] && la <= b[2] && lo >= b[1] && lo <= b[3];
  for (const q of [strip(t.base.addr), t.base.addrEn, strip(t.base.addr).replace(/\d+號$/, ''), t.base.name + ' ' + cn].filter(Boolean)) { try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`)).json();
    const f = (j.features || []).find(f => (f.properties.countrycode || '').toLowerCase() === t.cc && inBox(f.geometry.coordinates[1], f.geometry.coordinates[0]));
    if (f) { Object.assign(t.base, { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], cc: t.cc, country: cn || t.base.country, cur: t.cur || t.base.cur }); D.legs = {}; save(); try { buildDays() } catch (e) { } return true } } catch (e) { } } return false }
async function autoPlan(force) { const moved = await fixBaseGeo(); if (moved) { D.manualStops = 0; try { weather({ name: trip().base.name, lat: trip().base.lat, lon: trip().base.lon }, true) } catch (e) { } } return autoPlanCore(moved ? true : force) }
setTimeout(async () => { if (await fixBaseGeo()) { toast('Fixed your stay location'); if (!D.manualStops) autoPlan(true) } }, 1500);
