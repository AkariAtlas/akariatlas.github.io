try { const _v = localStorage.getItem('ak_viewonly'); if (_v && _v !== '1') localStorage.removeItem('ak_viewonly') } catch (e) { }
/* Akari Atlas — live trip app logic. All data sources are free & keyless except optional TDX (via your Apps Script). */
const DEFAULT_API = 'https://script.google.com/macros/s/AKfycbxbRvxs_OAuUPmrREKHLrbgIEuC1bgZKNQxOZYlj8Cvl3knZLCbgaPeBQ_dFaOhAoHH/exec';
const CFG = { API: localStorage.getItem('tw_api') || DEFAULT_API }; // Apps Script web-app URL (set once in Settings)
const $ = id => document.getElementById(id);
const peso = n => '₱' + Math.round(n).toLocaleString();
let HOSTEL = [25.0497, 121.5138]; let BASE_NAME = 'your stay';
const dist = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)) };
const GM = (la, lo) => `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=transit`;
function legAdvice(km) { const w = km * 1.3, m = Math.round(w / 4.8 * 60); if (w < 1.3) return `🚶 Walk ~${m} min`; if (w < 5) return `🚲 YouBike ~${Math.round(w / 14 * 60)} min · walk ${m} min`; if (w < 25) return `🚇 MRT/bus/taxi ~${w.toFixed(0)} km`; return `🚆 Train/THSR ~${w.toFixed(0)} km` }
function toast(t) { if (!t) return; const x = $('toast'); x.textContent = t; x.classList.add('on'); setTimeout(() => x.classList.remove('on'), 1800) }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ================= STATE + SYNC ================= */
const DEF = { t: 0, dark: null, total: 150000, rate: 1.9, rateAt: 0, bud: null, exps: [], saves: [], docs: {}, routes: {}, stopx: {}, legs: {}, sched: {}, journal: {}, offPhr: {}, myPhrases: [], companions: null, gifts: null, notes: {}, pack: null, pc: [], book: {}, voice: true };
let D; try { D = Object.assign({}, DEF, JSON.parse(localStorage.getItem('tw_state') || '{}')) } catch (e) { D = Object.assign({}, DEF) }
const TRIP = { code: localStorage.getItem('tw_code') || '', key: localStorage.getItem('tw_key') || '' };
let saveTimer = null;
async function api(body) { if (!CFG.API) throw 'no backend'; const r = await fetch(CFG.API, { method: 'POST', body: JSON.stringify(body) }); const j = await r.json(); if (!j.ok) throw j.error; return j }
function save() { D.t = Date.now(); localStorage.setItem('tw_state', JSON.stringify(D)); clearTimeout(saveTimer); if (localStorage.getItem('tw_store') === 'gdrive') { saveTimer = setTimeout(() => gdPush().catch(() => setSync('💾 Tap to reconnect Google')), 1200) } else if (TRIP.code) { saveTimer = setTimeout(push, 1200) } }
async function push() { if (localStorage.getItem('tw_joinpending') || (localStorage.getItem('ak_viewonly') === '1')) return; pushView(); try { await api({ action: 'save', code: TRIP.code, key: TRIP.key, json: JSON.stringify(D) }); setSync('☁️ Saved') } catch (e) { setSync('💾 Offline — will retry') ; setTimeout(push, 30000) } }
async function pull() { if (localStorage.getItem('tw_store') === 'gdrive') { if (GD.token) gdPull().catch(() => { }); else setSync('☁️ Google Drive (tap to sync)'); return } if (!TRIP.code) return; try { const j = await api({ action: 'load', code: TRIP.code, key: TRIP.key }); const r = JSON.parse(j.json || '{}'); markView(r); if ((r.t || 0) > D.t) { D = Object.assign({}, DEF, r); localStorage.setItem('tw_state', JSON.stringify(D)); renderAll(); toast('Synced ✓') } else if (D.t > (r.t || 0)) push(); setSync((localStorage.getItem('ak_viewonly') === '1') ? '👀 View only' : '☁️ Synced') } catch (e) { setSync('💾 This phone') } }
function setSync(t) { $('sync').textContent = t }
async function createTrip() { const url = $('apiUrl').value.trim(); if (url) { CFG.API = url; localStorage.setItem('tw_api', url) } try { const j = await api({ action: 'create', json: JSON.stringify(D) }); TRIP.code = j.code; TRIP.key = j.key; localStorage.setItem('tw_code', j.code); localStorage.setItem('tw_key', j.key); renderSettings(); setSync('☁️ Synced'); toast('Trip created ✓') } catch (e) { toast('Could not reach backend: ' + e) } }
function joinTrip(code, key, url) { if (url) { CFG.API = url; localStorage.setItem('tw_api', url) } localStorage.setItem('tw_store', 'code'); TRIP.code = code; TRIP.key = key; localStorage.setItem('tw_code', code); localStorage.setItem('tw_key', key); localStorage.setItem('ak_welcomed', '1'); localStorage.setItem('tw_joinpending', '1'); D.t = 0;
  try { document.getElementById('akOn')?.remove(); closeSheet() } catch (e) { } joinLoad(0); try { renderSettings() } catch (e) { } }
async function joinLoad(n) { let ov = document.getElementById('joinOv'); if (!ov) { ov = document.createElement('div'); ov.id = 'joinOv'; ov.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(15,30,40,.75);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;text-align:center;padding:24px'; ov.innerHTML = '<div>👫<br>Loading the shared trip…</div>'; (document.body || document.documentElement).appendChild(ov) }
  try { const j = await api({ action: 'load', code: TRIP.code, key: TRIP.key }); const r = JSON.parse(j.json || '{}'); markView(r); D = Object.assign({}, DEF, r); localStorage.setItem('tw_state', JSON.stringify(D)); localStorage.removeItem('tw_joinpending'); ov.remove(); try { document.getElementById('akOn')?.remove(); closeSheet(); renderAll() } catch (e) { } setSync('☁️ Synced'); toast('Joined “' + ((typeof trip === 'function' && trip()?.name) || 'shared trip') + '” ✓') }
  catch (e) { if (n < 4) return setTimeout(() => joinLoad(n + 1), 1500 * (n + 1)); ov.innerHTML = '<div>Couldn’t load the shared trip.<br><span style="font-size:14px">Check the code and key, or your connection.</span><br><br><button class="act" onclick="joinLoad(0)">Try again</button> <button class="pill" onclick="this.closest(\'#joinOv\').remove()">Close</button></div>' } }
function inviteLink(mode) { const v = mode === 'view' && TRIP.vcode; return location.origin + location.pathname + '#join=' + encodeURIComponent(btoa(JSON.stringify(v ? [TRIP.vcode, TRIP.vkey, CFG.API, 'v'] : [TRIP.code, TRIP.key, CFG.API]))) }
/* view-only sharing: a separate cloud copy with only the plan (no bookings, PINs, money or journal) */
TRIP.vcode = localStorage.getItem('tw_vcode') || ''; TRIP.vkey = localStorage.getItem('tw_vkey') || '';
const VIEW_KEYS = ['trip', 'routes', 'stopx', 'legs', 'sched', 'manualStops', 'planV', 'autoPlanned', 'offPhr', 'myPhrases', 'companions', 'voice'];
function viewCopy() { const o = { t: D.t, viewOnly: true }; VIEW_KEYS.forEach(k => { if (D[k] != null) o[k] = JSON.parse(JSON.stringify(D[k])) });
  if (o.trip) { (function strip(x) { if (!x || typeof x !== 'object') return; for (const k of Object.keys(x)) { if (/pnr|pin|conf|ticket|booking|ref|passport|bank|phone|email/i.test(k)) delete x[k]; else strip(x[k]) } })(o.trip) } return o }
async function makeViewCode() { if (TRIP.vcode) return true; try { const j = await api({ action: 'create', json: JSON.stringify(viewCopy()) }); TRIP.vcode = j.code; TRIP.vkey = j.key; localStorage.setItem('tw_vcode', j.code); localStorage.setItem('tw_vkey', j.key); return true } catch (e) { return false } }
async function pushView() { if (!TRIP.vcode) return; try { await api({ action: 'save', code: TRIP.vcode, key: TRIP.vkey, json: JSON.stringify(viewCopy()) }) } catch (e) { } }
function markView(r) { if (r && r.viewOnly) { localStorage.setItem('ak_viewonly', '1'); document.body.classList.add('viewOnly') } else if (r && r.trip) { localStorage.removeItem('ak_viewonly'); document.body.classList.remove('viewOnly') } }
if ((localStorage.getItem('ak_viewonly') === '1')) document.addEventListener('DOMContentLoaded', () => document.body.classList.add('viewOnly'));
try { if ((localStorage.getItem('ak_viewonly') === '1')) document.body && document.body.classList.add('viewOnly') } catch (e) { }
(function handleJoin() { const m = location.hash.match(/join=([^&]+)/); if (m) { try { const [c, k, u] = JSON.parse(atob(decodeURIComponent(m[1]))); joinTrip(c, k, u); history.replaceState(null, '', location.pathname); toast('Joined trip ' + c) } catch (e) { } } })();

/* ================= LIVE: EXCHANGE RATE ================= */
async function liveRate(force) { const pair = DC() + HC(); if (!force && D.ratePair === pair && Date.now() - D.rateAt < 6 * 3600e3) return; if (DC() === HC()) { D.rate = 1; D.ratePair = pair; return } try { const j = await (await fetch('https://open.er-api.com/v6/latest/' + DC())).json(); if (j.rates && j.rates[HC()]) { D.rate = +j.rates[HC()].toFixed(6); D.ratePair = pair; D.rateAt = Date.now(); save(); renderMoney(); fxS() } } catch (e) { } }
const DC = () => (D.trip && D.trip.cur) || 'TWD', HC = () => (D.trip && D.trip.home) || 'PHP';
const R = () => +D.rate || 1.9;
function fx(t) { if (DC() === HC()) return String(t); const s = sym(DC()).replace(/[$.]/g, '\\$&').trim(); return String(t).replace(new RegExp(s + '\\s?([\\d,]+)(?:[–-]([\\d,]+))?', 'g'), (m, a, b) => { const c = x => Math.round(+x.replace(/,/g, '') * R()).toLocaleString(); return m + ' (' + sym(HC()).trim() + c(a) + (b ? '–' + c(b) : '') + ')' }) }
function fxS() { document.querySelectorAll('[data-nt]').forEach(e => e.textContent = fx(e.dataset.nt)); $('rateBadge').textContent = DC() === HC() ? '' : `${sym(DC()).trim()}1 = ${sym(HC()).trim()}${R() < 0.01 ? R().toFixed(5) : R().toFixed(3)}${D.rateAt ? ' · live ' + new Date(D.rateAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}` }

/* ================= LIVE: WEATHER (Open-Meteo, free, no key) ================= */
const WMO = c => c == 0 ? ['Clear', 'sun'] : c <= 2 ? ['Partly cloudy', 'partly'] : c == 3 ? ['Cloudy', 'cloud'] : c <= 48 ? ['Foggy', 'fog'] : c <= 57 ? ['Drizzle', 'rain'] : c <= 67 ? ['Rain', 'rain'] : c <= 77 ? ['Snow', 'snow'] : c <= 82 ? ['Rain showers', 'rain'] : ['Thunderstorm', 'storm'];
let wxPlace = { name: 'Taipei', lat: HOSTEL[0], lon: HOSTEL[1] }, wxTimer = null, lastSpoken = '';
async function weather(place, announce) {
  wxPlace = place || wxPlace;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${wxPlace.lat}&longitude=${wxPlace.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation,wind_speed_10m&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=Asia%2FTaipei`;
    let j; try { j = await (await fetch(u)).json(); localStorage.setItem('tw_wx_'+wxPlace.name, JSON.stringify({j,at:Date.now()})) } catch (e) { const c0 = JSON.parse(localStorage.getItem('tw_wx_'+wxPlace.name)||'null'); if (!c0) throw e; j = c0.j; toast('Offline — showing weather from '+new Date(c0.at).toLocaleString()) } const c = j.current; const [label, kind] = WMO(c.weather_code);
    const hr = new Date().getHours(); const rainNext = Math.max(...(j.hourly.precipitation_probability || []).slice(hr, hr + 6));
    setScene(kind, c.is_day);
    $('wx').innerHTML = `<b>${Math.round(c.temperature_2m)}°C</b> ${label} · ${esc(wxPlace.name)}<br><span style="font-size:11px">feels ${Math.round(c.apparent_temperature)}° · rain next 6h ${rainNext}% · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    $('wxDays').innerHTML = j.daily.time.map((d, i) => `<div class="stat"><span class="muted">${i ? new Date(d).toLocaleDateString([], { weekday: 'short' }) : 'Today'}</span><b>${Math.round(j.daily.temperature_2m_min[i])}–${Math.round(j.daily.temperature_2m_max[i])}°</b><span class="muted">☔ ${j.daily.precipitation_probability_max[i]}%</span></div>`).join('');
    const tC = Math.round(c.temperature_2m); const say = `Hey! Right now in ${wxPlace.name}, it's ${tC} degrees and ${label.toLowerCase()}. ${tC <= 16 ? 'It\'s chilly, so grab a jacket.' : tC >= 28 ? 'It\'s warm out, so stay hydrated.' : ''} ${rainNext >= 50 ? 'Rain looks likely soon, so bring an umbrella.' : rainNext >= 25 ? 'There\'s a small chance of rain, so maybe pack a light umbrella.' : 'No rain expected for a while. Enjoy!'}`;
    if (announce && D.voice && say !== lastSpoken) { lastSpoken = say; speak(say) }
  } catch (e) { $('wx').textContent = 'Weather unavailable offline' }
  clearTimeout(wxTimer); wxTimer = setTimeout(() => weather(), 15 * 60e3);
}
function setScene(kind, day) {
  const fx = $('wxfx'); fx.className = 'wxfx ' + kind; fx.innerHTML = '';
  const n = kind == 'rain' ? 40 : kind == 'storm' ? 55 : kind == 'snow' ? 30 : 0;
  for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.style.left = Math.random() * 100 + '%'; d.style.animationDelay = (-Math.random() * 2) + 's'; d.style.animationDuration = (kind == 'snow' ? 4 + Math.random() * 3 : .6 + Math.random() * .5) + 's'; fx.appendChild(d) }
  document.body.classList.toggle('night', !day); $('sunmoon').setAttribute('fill', day ? '#fff3c4' : '#e8e4c8');
  $('sunmoon').style.opacity = (kind == 'sun' || kind == 'partly' || !day) ? 1 : .25;
  document.querySelectorAll('.cloud').forEach(c => c.style.opacity = kind == 'sun' ? .35 : 1);
}
const VOICE_PREF = [/Samantha/i, /Ava.*(Premium|Enhanced)/i, /Allison/i, /Zoe/i, /Aria.*Natural|Jenny.*Natural|Microsoft (Aria|Jenny) Online/i, /Google US English/i, /Ava/i, /Susan|Victoria|Karen/i];
let voices = []; function loadVoices() { try { voices = speechSynthesis.getVoices() } catch (e) { } } loadVoices(); try { speechSynthesis.onvoiceschanged = () => { loadVoices(); renderVoicePick && renderVoicePick() } } catch (e) { }
function pickVoice(lang) { if (lang && !lang.startsWith('en')) return voices.find(v => v.lang.replace('_', '-').startsWith(lang)) || voices.find(v => v.lang.startsWith(lang.split('-')[0])); const chosen = voices.find(v => v.name === D.voiceName); if (chosen) return chosen; const us = voices.filter(v => /en[-_]US/i.test(v.lang)); for (const re of VOICE_PREF) { const v = us.find(v => re.test(v.name)); if (v) return v } return us[0] }
/* Audio unlock: browsers (esp. iPhone Safari) only allow sound after the first tap */
let audioCtx = null, audioReady = false;
function unlockAudio() { if (audioReady) return; audioReady = true; try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u) } catch (e) { } }
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { once: false, passive: true }));
function chime(kind) { try { if (!audioCtx) return; const t = audioCtx.currentTime, notes = kind === 'turn' ? [880, 1175] : kind === 'done' ? [659, 880, 1319] : [784, 1047];
  notes.forEach((f, i) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + i * .12); g.gain.linearRampToValueAtTime(.18, t + i * .12 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .12 + .35); o.connect(g).connect(audioCtx.destination); o.start(t + i * .12); o.stop(t + i * .12 + .4) }) } catch (e) { } }
function speak(t, lang) { if (!lang) chime(/turn|meters/.test(t) ? 'turn' : /arrived|All set/.test(t) ? 'done' : 'note'); try { speechSynthesis.cancel(); const parts = String(t).match(/[^.!?]+[.!?]*/g) || [t]; parts.forEach(p => { const u = new SpeechSynthesisUtterance(p.trim()); u.lang = lang || 'en-US'; const v = pickVoice(lang); if (v) u.voice = v; u.rate = lang && !lang.startsWith('en') ? .85 : 1; u.pitch = 1.05; setTimeout(() => speechSynthesis.speak(u), lang ? 0 : 350) }) } catch (e) { } }
function renderVoicePick() { const el = document.getElementById('voicePick'); if (!el) return; const us = voices.filter(v => /^en/i.test(v.lang)); const cur = pickVoice(); el.innerHTML = us.map(v => `<option ${cur && v.name === cur.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('') || '<option>Default voice</option>' }

/* ================= LIVE: SEARCH (Photon / OpenStreetMap, free) ================= */
let acTimer = null, acCtl = null;
function onType() { clearTimeout(acTimer); const q = $('q').value.trim(); if (q.length < 2) { $('ac').innerHTML = ''; return } acTimer = setTimeout(() => autocomplete(q), 250) }
const SEARCH = []; // ordered handlers: return true when they handled the query
async function autocomplete(q) { for (const h of SEARCH) { try { if (await h(q)) return } catch (e) { console.error('search', e) } } return acPlaces(q) }
async function acPlaces(q) {
  try { acCtl && acCtl.abort(); acCtl = new AbortController();
    const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lang=en&lat=${(curPlace||{lat:HOSTEL[0]}).lat}&lon=${(curPlace||{lon:HOSTEL[1]}).lon}`, { signal: acCtl.signal })).json();
    const seenAc = new Set(); j.features = j.features.filter(f => { const p = f.properties, k = (p.name + '|' + (p.city || p.county || '') + '|' + (p.type || '')).toLowerCase(); if (seenAc.has(k)) return false; seenAc.add(k); return true }); $('ac').innerHTML = j.features.map(f => { const p = f.properties, [lo, la] = f.geometry.coordinates; const sub = [p.street, p.city || p.county, p.country].filter(Boolean).filter(x => x !== p.name).join(', '); return `<button class="acItem" onclick='pickPlace(${JSON.stringify({ name: p.name, lat: la, lon: lo, sub }).replace(/'/g, "&#39;")})'>📍 <b>${esc(p.name)}</b> <span class="muted">${esc(sub || p.type || '')}</span></button>` }).join('') || '<div class="muted" style="padding:8px">No matches</div>';
  } catch (e) { if (e.name === 'AbortError') return; $('ac').innerHTML = '<div class="muted" style="padding:8px">Search needs internet</div>' }
  await acFallback(q) }
let curPlace = null, nearCat = 'cafe', nearData = [];
function pickPlace(p) { $('ac').innerHTML = ''; $('q').value = p.name; curPlace = p; weather(p, true); showPlace(); }
async function showPlace() {
  const p = curPlace; const km = dist(HOSTEL[0], HOSTEL[1], p.lat, p.lon);
  $('placeHead').innerHTML = `<h3 style="margin-top:10px">${esc(p.name)} <span class="tag">${km.toFixed(0)} km from ${esc(BASE_NAME)}</span></h3><div class="muted">${esc(p.sub || '')}</div>
   <div class="muted">From the hostel: ${legAdvice(km)}</div>
   <a class="map" target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=Taipei+Main+Station&destination=${p.lat},${p.lon}&travelmode=transit">🗺️ Live route & schedule</a><a class="map alt" target="_blank" href="https://en.thsrc.com.tw/">🚄 THSR</a><a class="map alt" target="_blank" href="https://www.railway.gov.tw/tra-tip-web/tip?lang=EN_US">🚆 TRA</a> <button class="pill" onclick='pin(${JSON.stringify([p.name, p.lat, p.lon, ""]).replace(/'/g, "&#39;")})'>📌 Pin</button>`;
  map && map.setView([p.lat, p.lon], km > 30 ? 13 : 15);
  loadNearby(); liveTransit(p); emit('place:show', p);
}
/* ================= LIVE: NEARBY (Overpass / OpenStreetMap, free) ================= */
const NEAR = {
  cafe: ['☕ Cafés', 'nwr["amenity"="cafe"]'],
  food: ['🍜 Cheap eats', 'nwr["amenity"~"restaurant|fast_food|food_court"]'],
  hobby: ['🎮 Gundam/TCG/toys', 'nwr["shop"~"toys|games|anime|collector|model|hobby|comic"]'],
  gifts: ['🎄 Gifts & novelty', 'nwr["shop"~"gift|variety_store|stationery|souvenir"]'],
  clothes: ['👕 Tees & clothes', 'nwr["shop"="clothes"]'],
  nature: ['🌿 Nature & views', 'nwr["leisure"~"park|garden|nature_reserve"]["name"];nwr["tourism"~"viewpoint|attraction"]'],
  market: ['🏮 Night markets', 'nwr["amenity"="marketplace"]'],
  bike: ['🛵 Bike & e-bike rental', 'nwr["amenity"~"bicycle_rental"];nwr["shop"="bicycle"]'],
  stations: ['🚉 Stations & bus terminals', 'nwr["railway"="station"];nwr["amenity"="bus_station"]'],
};
let nearCtl = null;
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const PHOTON_Q = { cafe: [['cafe', 'amenity:cafe'], ['coffee', 'amenity:cafe'], ['tea', 'amenity:cafe']], food: [['restaurant', 'amenity:restaurant'], ['noodle', 'amenity:restaurant'], ['food', 'amenity:fast_food']], hobby: [['toys', 'shop:toys'], ['games', 'shop:games'], ['anime', 'shop'], ['hobby', 'shop'], ['card', 'shop']], gifts: [['gift', 'shop:gift'], ['souvenir', 'shop'], ['stationery', 'shop:stationery'], ['daiso', 'shop']], clothes: [['clothes', 'shop:clothes'], ['uniqlo', 'shop']], nature: [['park', 'leisure:park'], ['viewpoint', 'tourism:viewpoint'], ['temple', 'amenity:place_of_worship'], ['trail', 'highway']], market: [['night market', ''], ['market', 'amenity:marketplace']], bike: [['youbike', ''], ['bicycle', 'amenity:bicycle_rental'], ['rental', 'shop']], stations: [['station', 'railway:station'], ['bus station', 'amenity:bus_station'], ['MRT', 'railway']] };
async function photonNear(p, radius) { const d = radius / 111000 * 1.4, bb = [p.lon - d, p.lat - d, p.lon + d, p.lat + d].join(','); const seen = new Set(), out = [];
  await Promise.all((PHOTON_Q[nearCat] || []).map(async ([q, tag]) => { try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=${bb}${tag ? '&osm_tag=' + tag : ''}&limit=20&lang=en`)).json(); j.features.forEach(f => { const k = f.properties.osm_id; if (seen.has(k)) return; seen.add(k); const [lo, la] = f.geometry.coordinates; out.push({ lat: la, lon: lo, tags: { name: f.properties.name } }) }) } catch (e) { } }));
  return out }
async function loadNearby() {
  const p = curPlace; if (!p) return; emit('nearby:start', nearCat); $('nearCats').innerHTML = Object.entries(NEAR).map(([k, v]) => `<button class="pill ${k == nearCat ? 'on' : ''}" onclick="nearCat='${k}';loadNearby()">${v[0]}</button>`).join('');
  $('near').innerHTML = '<p class="muted">Finding live places nearby…</p>';
  const radius = nearCat == 'nature' || nearCat == 'stations' ? 3000 : 1500;
  const q = `[out:json][timeout:20];(${NEAR[nearCat][1].split(';').map(x => x + `(around:${radius},${p.lat},${p.lon});`).join('')});out center 40;`;
  try { nearCtl && nearCtl.abort(); nearCtl = new AbortController();
    let els = null;
    for (const u of OVERPASS) { try { const r = await fetch(u, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: AbortSignal.any ? AbortSignal.any([nearCtl.signal, AbortSignal.timeout(9000)]) : nearCtl.signal }); if (!r.ok) continue; els = (await r.json()).elements; break } catch (e) { if (nearCtl.signal.aborted) throw e } }
    const ck = 'tw_near_' + nearCat + '_' + p.lat.toFixed(3) + '_' + p.lon.toFixed(3);
    if (!els) { try { els = await photonNear(p, radius); if (!els.length && !navigator.onLine) throw 0 } catch (e) { els = null } }
    if (!els || !els.length) { try { const n = await nomNear(p, radius); if (n.length) els = n } catch (e) { } }
    if (els && els.length) { try { localStorage.setItem(ck, JSON.stringify(els.slice(0, 40))) } catch (e) { } }
    else { const c0 = JSON.parse(localStorage.getItem(ck) || 'null'); if (c0) { els = c0; toast('Offline — showing saved places') } else els = els || [] }
    nearData = els.map(e => { const t = e.tags || {}, la = e.lat || e.center?.lat, lo = e.lon || e.center?.lon; return { n: t['name:en'] || t.name || t['name:zh'] || '', t, la, lo, d: dist(p.lat, p.lon, la, lo) } }).filter(x => x.n && x.la).sort((a, b) => a.d - b.d).slice(0, 25);
    $('near').innerHTML = nearData.length ? nearData.map((x, i) => `<div class="place"><div class="ic">${NEAR[nearCat][0].split(' ')[0]}</div><div style="flex:1"><b>${esc(x.n)}</b>${x.t['name:en'] && x.t.name !== x.t['name:en'] ? ` <span class="muted">${esc(x.t.name)}</span>` : ''}<div class="muted">${(x.d * 1000).toFixed(0)} m · ${legAdvice(x.d)}${x.t.opening_hours ? ' · 🕒 ' + esc(x.t.opening_hours) : ''}</div>${placeMeta(x)}<div class="cost">${priceHint(nearCat)}</div><button class="map" style="border:none;cursor:pointer;background:#3b82f6" onclick="startNav(nearData[${i}].n,nearData[${i}].la,nearData[${i}].lo,'foot')">🚶 Walk me there</button><button class="map" style="border:none;cursor:pointer" onclick="dirSheet(${i})">🧭 Directions</button><button class="map alt" style="border:none;cursor:pointer" onclick="placeSheet(${i})">⭐ Reviews & hours</button><button class="pill" onclick="pinNear(${i})">📌 Pin</button></div></div>`).join('') : googleList();
    drawMarkers(nearData); fxS(); refreshGmap(); emit('nearby:loaded', nearCat);
  } catch (e) { if (e.name !== 'AbortError') $('near').innerHTML = '<p class="muted">Live places need internet (or the free server is busy — try again in a moment).</p>' }
}
const PRICE={cafe:'Typical NT$100–250 /drink',food:'Typical NT$80–250 /person',hobby:'TCG packs ~NT$100–200 · Gunpla HG ~NT$300–800',gifts:'Typical NT$30–300 /item',clothes:'Tees ~NT$250–600',nature:'Usually free',market:'Snacks NT$50–150',bike:'YouBike ~NT$10 /30 min · e-bike ~NT$300–600 /day'};
function priceHint(c){return DC()==='TWD'&&PRICE[c]?`<span data-nt="💸 ${PRICE[c]}"></span>`:''}
function pinHours(x) { if (x?.t?.opening_hours) window._pinHours = x.t.opening_hours }
function pinNear(i) { const x = nearData[i]; pinHours(x); pin([x.n, x.la, x.lo, DC()==='TWD'?(PRICE[nearCat]||''):'']) }

/* ================= LIVE: TRANSIT via TDX (needs your backend + free TDX key) ================= */
async function liveTransit(p) {
  const el = $('transit'); if (DC() !== 'TWD') { el.innerHTML = '<p class="muted">Live trains & YouBike are available for Taiwan trips. Elsewhere, tap 🧭 Directions for live Google transit.</p>'; return } if (!CFG.API) { el.innerHTML = '<p class="muted">Live trains & YouBike turn on after you connect the free backend (Settings).</p>'; return }
  el.innerHTML = '<p class="muted">Loading live transit…</p>';
  const parts = [];
  try {
    const st = (await api({ action: 'tdx', path: `/v3/Rail/TRA/Station?$spatialFilter=nearby(${p.lat},${p.lon},3000)&$format=JSON` })).data;
    const s = (st.Stations || st || [])[0];
    if (s) { const lb = (await api({ action: 'tdx', path: `/v3/Rail/TRA/StationLiveBoard/Station/${s.StationID}?$format=JSON` })).data; const rows = (lb.StationLiveBoards || lb || []).slice(0, 6);
      parts.push(`<h3>🚆 ${esc(s.StationName.En)} station — live board</h3>` + (rows.length ? rows.map(r => `<div class="row sp" style="border-bottom:1px dashed var(--line);padding:4px 0"><span>${esc(r.TrainTypeName?.En || '')} ${esc(r.TrainNo)} → ${esc(r.EndingStationName?.En || '')}</span><span>${esc(r.ScheduleDepartureTime || r.ScheduledDepartureTime || '')} ${r.DelayTime ? `<b style="color:var(--rose)">+${r.DelayTime} min</b>` : '<span class="muted">on time</span>'}</span></div>`).join('') : '<p class="muted">No trains in the next while.</p>')) }
  } catch (e) { parts.push('<p class="muted">Train board unavailable: ' + esc(e) + '</p>') }
  try {
    const av = (await api({ action: 'tdx', path: `/v2/Bike/Availability/NearBy?$spatialFilter=nearby(${p.lat},${p.lon},500)&$format=JSON` })).data;
    const sts = (await api({ action: 'tdx', path: `/v2/Bike/Station/NearBy?$spatialFilter=nearby(${p.lat},${p.lon},500)&$format=JSON` })).data;
    const nm = Object.fromEntries(sts.map(s => [s.StationUID, s.StationName.En || s.StationName.Zh_tw]));
    parts.push('<h3>🚲 YouBike nearby — live</h3>' + (av.length ? av.slice(0, 6).map(a => `<div class="row sp" style="padding:3px 0"><span>${esc(nm[a.StationUID] || a.StationID)}</span><span>🚲 ${a.AvailableRentBikes} · 🅿️ ${a.AvailableReturnBikes}</span></div>`).join('') : '<p class="muted">No YouBike stations within 500 m.</p>'));
  } catch (e) { }
  el.innerHTML = parts.join('') + '<p class="muted">Live data: Taiwan MOTC TDX. Buses: tap "Live route & schedule" for Google Maps real-time.</p>';
}

/* ================= MAP (Leaflet + OSM) ================= */
let map = null, layer = null, routeLayer = null;
function initMap() { if (map || !window.L) return; map = L.map('map', { zoomControl: false }).setView(HOSTEL, 14); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map); layer = L.layerGroup().addTo(map); routeLayer = L.layerGroup().addTo(map); L.marker(HOSTEL, { title: BASE_NAME }).addTo(map).bindPopup('🏨 ' + esc(BASE_NAME));
  map.on('click', e => { curPlace = { name: 'Pinned spot', lat: e.latlng.lat, lon: e.latlng.lng, sub: 'Tapped on map' }; weather(curPlace, true); showPlace() }) }
function drawMarkers(list) { if (!map) return; layer.clearLayers(); list.forEach(x => L.circleMarker([x.la, x.lo], { radius: 7, color: '#fff', weight: 2, fillColor: '#5c9a6b', fillOpacity: 1 }).addTo(layer).bindPopup(`<b>${esc(x.n)}</b><br><a target="_blank" href="${GM(x.la, x.lo)}">Directions</a>`)) }
let gpsWatch = null, me = null;
function locate() { if (!navigator.geolocation) return toast('No GPS'); navigator.geolocation.getCurrentPosition(p => { me = [p.coords.latitude, p.coords.longitude]; curPlace = { name: 'Where you are', lat: me[0], lon: me[1], sub: 'Live GPS' }; weather(curPlace, true); showPlace(); if (map) L.circleMarker(me, { radius: 9, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(layer) }, () => toast('Allow location in Settings › Safari'), { enableHighAccuracy: true }) }

/* ================= IN-APP PLACE SHEET (Google Maps embed, English) ================= */
const gEmbed = (q, la, lo, z) => (window.ADDRQ || {})[q] ? `https://maps.google.com/maps?q=${encodeURIComponent(ADDRQ[q])}&z=${z || 17}&hl=en&gl=tw&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(q)}${la ? '&ll=' + la + ',' + lo : ''}&z=${z || 17}&hl=en&gl=tw&output=embed`;
function fmtHours(h) { if (!h) return ''; return esc(h).replace(/Mo/g, 'Mon').replace(/Tu/g, 'Tue').replace(/We/g, 'Wed').replace(/Th/g, 'Thu').replace(/Fr/g, 'Fri').replace(/Sa/g, 'Sat').replace(/Su/g, 'Sun').replace(/PH/g, 'Holidays').replace(/;\s*/g, '<br>') }
function placeSheet(i) { const x = nearData[i]; openSheet(x.n, x.la, x.lo, x.t, PRICE[nearCat], x.d) }
function openSheet(n, la, lo, t, price, d) { t = t || {};
  const info = [
    t.opening_hours ? `<div><b>🕒 Hours</b><br>${fmtHours(t.opening_hours)}</div>` : '<div class="muted">🕒 Hours: see the Google card in the map above</div>',
    t['addr:full'] || t['addr:street'] ? `<div>📍 ${esc(t['addr:full'] || [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' '))}</div>` : '',
    t.phone || t['contact:phone'] ? `<div>📞 ${esc(t.phone || t['contact:phone'])}</div>` : '',
    t.cuisine ? `<div>🍽️ ${esc(t.cuisine.replace(/;/g, ', '))}</div>` : '',
    t.website || t['contact:website'] ? `<div>🌐 <a target="_blank" href="${esc(t.website || t['contact:website'])}">Website</a></div>` : '',
    price ? `<div class="cost" data-nt="💸 ${esc(price)}"></div>` : '',
    d != null ? `<div class="muted">${(d * 1000).toFixed(0)} m away · ${legAdvice(d)}</div>` : ''].join('');
  $('sheet').innerHTML = `<div class="sheetIn"><div class="row sp"><h3 style="margin:0">${esc(n)}</h3><button class="pill" onclick="closeSheet()">✕</button></div>
   <iframe src="${gEmbed(n, la, lo)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:300px;border:0;border-radius:14px;margin:8px 0"></iframe>
   <p class="muted" style="margin:0 0 6px">Tap the place name in the card above to see its rating, reviews and photos without leaving the app.</p>
   ${info}
   <div style="margin-top:8px"><button class="map" style="border:none;cursor:pointer" onclick="dirTo(${JSON.stringify(n).replace(/"/g, '&quot;')},${la},${lo})">🧭 Directions</button><button class="pill" onclick='pin(${JSON.stringify([n, la, lo, price || ""]).replace(/'/g, "&#39;")});closeSheet()'>📌 Pin to day</button><button class="pill" onclick="weather({name:${JSON.stringify(n).replace(/"/g, '&quot;')},lat:${la},lon:${lo}},true)">🌦️ Weather here</button></div></div>`;
  $('sheet').classList.add('on'); fxS(); history.pushState({ sheet: 1 }, '') }
function closeSheet() { $('sheet').classList.remove('on'); $('sheet').innerHTML = '' }
window.addEventListener('popstate', () => { if ($('sheet').classList.contains('on')) closeSheet() });
/* English Google map view for Explore */
let gView = false;
function toggleGmap() { gView = !gView; $('gmapBtn').textContent = gView ? '🗺️ Simple map' : '🗺️ Google map (English)'; $('map').style.display = gView ? 'none' : ''; const f = $('gmap'); f.style.display = gView ? '' : 'none'; if (gView) refreshGmap() }
function refreshGmap() { if (!gView) return; const p = curPlace || { name: BASE_NAME, lat: HOSTEL[0], lon: HOSTEL[1] }; const q = { cafe: 'cafes', food: 'restaurants', hobby: 'hobby shops', gifts: 'gift shops', clothes: 'clothing stores', nature: 'parks', market: 'night markets', bike: 'bike rental', stations: 'train stations', stay: 'cheap hotels and hostels' }[nearCat] || ''; $('gmap').src = gEmbed(q ? q + ' near ' + p.name : p.name, p.lat, p.lon, 15) }

/* In-app directions (Google embed, English, transit by default) */
function dirSheet(i) { const x = nearData[i]; dirTo(x.n, x.la, x.lo) }
function dirTo(n, la, lo, mode) { mode = mode || 'r'; const o = me || (curPlace ? [curPlace.lat, curPlace.lon] : HOSTEL);
  const src = `https://maps.google.com/maps?saddr=${o[0]},${o[1]}&daddr=${la},${lo}&dirflg=${mode}&hl=en&gl=tw&output=embed`;
  $('sheet').innerHTML = `<div class="sheetIn"><div class="row sp"><h3 style="margin:0">🧭 To ${esc(n)}</h3><button class="pill" onclick="closeSheet()">✕</button></div>
   <div class="seg" style="margin:8px 0">${[['r', '🚇 Transit'], ['w', '🚶 Walk'], ['b', '🚲 Bike'], ['d', '🚕 Taxi']].map(([m, l]) => `<button class="pill ${m == mode ? 'on' : ''}" onclick="dirTo(${JSON.stringify(n).replace(/"/g, '&quot;')},${la},${lo},'${m}')">${l}</button>`).join('')}</div>
   <iframe src="${src}" style="width:100%;height:420px;border:0;border-radius:14px" loading="lazy"></iframe>
   <p class="muted">Live Google route (English). For turn-by-turn voice while walking, use <a target="_blank" href="${GM(la, lo)}">Google Maps app</a>.</p>
   <button class="act" style="background:#3b82f6" onclick="startNav(${JSON.stringify(n).replace(/"/g, '&quot;')},${la},${lo},'foot')">▶️ Start walking with voice</button> <button class="act" onclick="startNav(${JSON.stringify(n).replace(/"/g, '&quot;')},${la},${lo},'bike')">🚲 Start biking</button> <button class="pill" onclick='pin(${JSON.stringify([n, la, lo, ""]).replace(/'/g, "&#39;")});closeSheet()'>📌 Pin to day</button></div>`;
  $('sheet').classList.add('on'); history.pushState({ sheet: 1 }, '') }
/* When free data has nothing, show Google's live results for the category */
function googleList() { const p = curPlace; const q = { cafe: 'cafes', food: 'cheap restaurants', hobby: 'gundam tcg hobby shop', gifts: 'gift shop', clothes: 'clothing store', nature: 'park', market: 'night market', bike: 'bike rental', stations: 'train station', stay: 'budget hotel hostel' }[nearCat] || 'places';
  return `<p class="muted">Showing live Google results for <b>${esc(q)}</b> near ${esc(p.name)}. Tap a pin for rating, hours and photos.</p><iframe src="${gEmbed(q + ' near ' + p.name, p.lat, p.lon, 15)}" style="width:100%;height:380px;border:0;border-radius:14px" loading="lazy"></iframe>` }
/* Remember where you were so coming back reopens the same view */
function rememberView() { try { sessionStorage.setItem('tw_view', JSON.stringify({ tab: document.querySelector('nav button.on')?.dataset.v, place: curPlace, cat: nearCat, y: scrollY })); localStorage.setItem('tw_view', sessionStorage.getItem('tw_view')) } catch (e) { } }
document.addEventListener('visibilitychange', () => { if (document.hidden) rememberView() }); window.addEventListener('pagehide', rememberView);
/* "cafe near me" / "ramen nearby" → live results around your GPS position */
const NEARME = /\b(near\s*me|nearby|around\s*me|close\s*to\s*me|near\s*here|here)\b/i;
let myPos = null;
function getMyPos() { return new Promise(res => { if (myPos && Date.now() - myPos.at < 120e3) return res(myPos); if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res(myPos = { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() }), () => res(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }) }) }
SEARCH.push(async function acNearMe(q) {
  if (!NEARME.test(q)) return false;
  const what = q.replace(NEARME, '').replace(/\s+/g, ' ').trim() || 'cafe';
  $('ac').innerHTML = '<div class="muted" style="padding:8px">📍 Finding your location…</div>';
  const me = await getMyPos(); if (!me) { $('ac').innerHTML = '<div class="muted" style="padding:8px">Allow location to search near you (or type a place name).</div>'; return true }
  try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(what)}&limit=25&lang=en&lat=${me.lat}&lon=${me.lon}`)).json();
    const seen = new Set(); const r = j.features.filter(f => f.properties.name).map(f => { const p = f.properties, la = f.geometry.coordinates[1], lo = f.geometry.coordinates[0]; return { name: p.name, lat: la, lon: lo, sub: [p.street, p.city || p.county].filter(Boolean).join(', '), km: dist(me.lat, me.lon, la, lo) } })
      .filter(x => x.km < 15 && !seen.has(x.name + x.sub) && seen.add(x.name + x.sub)).sort((a, b) => a.km - b.km).slice(0, 10);
    window._nmr = r;
    $('ac').innerHTML = `<div class="ac" onclick="nearMeAll('${esc(what)}')" style="padding:8px;cursor:pointer"><b>📍 Show all “${esc(what)}” near me on the map</b></div>` + (r.length ? r.map((x, i) => `<div class="ac" style="padding:8px;cursor:pointer" onclick="pickPlace(window._nmr[${i}])"><b>${esc(x.name)}</b> <span class="tag">${x.km < 1 ? Math.round(x.km * 1000) + ' m' : x.km.toFixed(1) + ' km'}</span><div class="muted">${esc(x.sub)}</div></div>`).join('') : '<div class="muted" style="padding:8px">No exact matches close by. Tap “Show all” for the live map list.</div>');
    if (typeof map !== 'undefined' && map && r.length) { try { (window._nmLayer ||= L.layerGroup().addTo(map)).clearLayers(); r.forEach((x, i) => L.marker([x.lat, x.lon]).addTo(window._nmLayer).bindPopup(esc(x.name)).on('click', () => pickPlace(window._nmr[i]))); map.fitBounds(L.latLngBounds([[me.lat, me.lon], ...r.map(x => [x.lat, x.lon])]).pad(.2)) } catch (e) { } }
  } catch (e) { $('ac').innerHTML = '<div class="muted" style="padding:8px">Search needs internet</div>' } return true
});
function nearMeAll(what) { const k = Object.keys(NEAR).find(k => NEAR[k][0].toLowerCase().includes(what.toLowerCase().replace(/s$/, ''))); if (k) nearCat = k; $('ac').innerHTML = ''; curPlace = { name: 'My location', lat: myPos.lat, lon: myPos.lon, sub: 'Live GPS' }; weather(curPlace, true); showPlace() }
/* Explore: directions bar on every searched place (walk/bike voice nav in-app, transit/taxi live map) */
on('place:show', function dirBar(p) { if (!p || p.name === 'My location') return;
  const n = JSON.stringify(p.name).replace(/"/g, '&quot;'), h = $('placeHead'); if (!h || h.querySelector('.dirBar')) return;
  h.insertAdjacentHTML('beforeend', `<div class="dirBar" style="margin:10px 0"><div class="muted" style="margin-bottom:6px">🧭 Directions from where you are</div><div style="display:flex;flex-wrap:wrap;gap:8px">
   <button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'w')">🚶 Walk</button><button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'b')">🚲 Bike</button><button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'r')">🚆 Train & bus</button><button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'d')">🚗 Drive / taxi</button>
   ${typeof startNav === 'function' ? `<button class="act" onclick="startNav(${n},${p.lat},${p.lon},'foot')">🔊 Start walking navigation</button>` : ''}</div></div>`) });

/* richer list rows: category/cuisine, open now, travel times by mode, taxi estimate */
function placeMeta(x) { const t = x.t || {}, km = x.d * 1.3;
  const kind = [t.cuisine && t.cuisine.split(';').map(c => c.replace(/_/g, ' ')).join(', '), t.amenity || t.shop || t.tourism || t.leisure].filter(Boolean)[0];
  const extra = [t['diet:vegetarian'] === 'yes' ? '🥬 veg' : '', t.outdoor_seating === 'yes' ? '☀️ outdoor seats' : '', t.internet_access === 'wlan' || t.internet_access === 'yes' ? '📶 Wi-Fi' : '', t['payment:cards'] === 'yes' || t['payment:credit_cards'] === 'yes' ? '💳 cards' : '', t.takeaway === 'yes' ? '🥡 takeaway' : ''].filter(Boolean).join(' · ');
  const mins = (k, sp, add = 0) => Math.max(1, Math.round(k / sp * 60 + add));
  const fare = DC() === 'TWD' ? `NT$${Math.round(85 + Math.max(0, km - 1.25) * 25)}` : '';
  return `<div class="muted" style="font-size:13px">${kind ? '🏷️ ' + esc(kind.replace(/_/g, ' ')) : ''}${extra ? ' · ' + extra : ''}${t.website ? ` · <a href="${esc(t.website)}" target="_blank">site</a>` : ''}</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;font-size:13px"><span class="tag">🚶 ${mins(km, 4.8)} min</span><span class="tag">🚲 ${mins(km, 13, 2)} min</span><span class="tag">🚆 ~${mins(km, 22, 8)} min</span><span class="tag">🚕 ${mins(km, 24, 3)} min${fare ? ' · ≈' + fare : ''}</span></div>` + (window.placeMetaExtra ? placeMetaExtra(x) : '') }

/* 3rd free source: Nominatim (OSM) with opening hours & cuisine tags */
const NOM_Q = { cafe: ['cafe'], food: ['restaurant', 'fast food'], hobby: ['toy shop', 'games shop'], gifts: ['gift shop'], clothes: ['clothes shop'], nature: ['park'], market: ['marketplace'], bike: ['bicycle rental'], stations: ['station'] };
async function nomNear(p, radius) { const d = radius / 111000, vb = [p.lon - d, p.lat + d, p.lon + d, p.lat - d].join(','); const out = [];
  for (const q of (NOM_Q[nearCat] || [NEAR[nearCat][0].replace(/^\S+\s/, '')])) { const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=30&extratags=1&namedetails=1&accept-language=en&bounded=1&viewbox=${vb}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined }); if (!r.ok) continue;
    (await r.json()).forEach(x => out.push({ lat: +x.lat, lon: +x.lon, tags: { ...(x.extratags || {}), name: (x.namedetails || {}).name || x.name, 'name:en': (x.namedetails || {})['name:en'], amenity: x.type } })) }
  return out }
/* search box: if Photon is down, fall back to Nominatim */
async function acFallback(q) { const ac = $('ac'); if (!ac) return;
  if (ac.innerText.trim() && !/needs internet/i.test(ac.innerText)) return;
  try { const c = curPlace || { lat: HOSTEL[0], lon: HOSTEL[1] }; const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=7&accept-language=en&viewbox=${c.lon - 1},${c.lat + 1},${c.lon + 1},${c.lat - 1}`); const j = await r.json();
    window._nmr = j.map(x => ({ name: x.name || x.display_name.split(',')[0], lat: +x.lat, lon: +x.lon, sub: x.display_name.split(',').slice(1, 4).join(',') }));
    ac.innerHTML = window._nmr.map((x, i) => `<div class="ac" style="padding:8px;cursor:pointer" onclick="pickPlace(window._nmr[${i}])"><b>${esc(x.name)}</b><div class="muted">${esc(x.sub)}</div></div>`).join('') || '<div class="muted" style="padding:8px">No matches</div>' } catch (e) { } };
/* address-style searches ("Hikari Coffee in No. 6, Alley 2, Lane 171, Hanzhong St, Wanhua District, Taipei") */
const ADDR_RX = /\b(No\.?\s*\d|Alley|Lane|Ln\.?|Sec(tion)?\.?\s*\d|St\.?|Street|Rd\.?|Road|Ave|District|City)\b|[巷弄號路街段區]/i;
window.ADDRQ = JSON.parse(localStorage.getItem('tw_addrq') || '{}');
async function addrSearch(q) { const full = q.trim(); let name = full, addr = full;
  const m = full.match(/^(.*?)\s+(?:in|at|@|,)\s+(.*\d.*)$/i); if (m && !/^\s*No\.?\s*\d/i.test(m[1])) { name = m[1].trim(); addr = m[2].trim() } else if (/^\s*No\.?\s*\d/i.test(full)) name = '';
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean), c = curPlace || { lat: HOSTEL[0], lon: HOSTEL[1] };
  const norm = x => x.replace(/\b(\d{3,6})\b/g, '').replace(/\bCity\b/gi, '').replace(/\bSt\.?\b/gi, 'Street').replace(/\bRd\.?\b/gi, 'Road').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim().replace(/,$/, '');
  const core = parts.filter(p => !/^(No\.?\s*\d|\d+\s*F|Alley|Lane|Ln\.?|\d)/i.test(p));
  const tries = [name && name + ', ' + core.slice(-3).join(', '), norm(core.join(', ')), norm(core.slice(0, 3).join(', ')), norm(core.slice(0, 1).concat(core.slice(-2)).join(', ')), norm(core.slice(-2).join(', '))].map(x => x && norm(x)).filter((v, i, a) => v && a.indexOf(v) === i);
  for (const [k, t] of tries.entries()) { if (k) await new Promise(r => setTimeout(r, 1100)); try { const j = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(t)}&format=jsonv2&limit=1&accept-language=en&viewbox=${c.lon - 1.5},${c.lat + 1.5},${c.lon + 1.5},${c.lat - 1.5}`)).json();
    if (j[0]) { const nm = name || parts.slice(0, 3).join(', '); ADDRQ[nm] = (name ? name + ', ' : '') + addr; localStorage.setItem('tw_addrq', JSON.stringify(ADDRQ));
      return { name: nm, lat: +j[0].lat, lon: +j[0].lon, sub: addr + (t !== addr ? ' · map pin is near the street; Google card shows the exact spot' : '') } } } catch (e) { } }
  return null }
SEARCH.push(async function acAddress(q) { if (/near me|nearby|around me/i.test(q) || !ADDR_RX.test(q) || !/\d/.test(q)) return false;
  $('ac').innerHTML = '<div class="muted" style="padding:8px">📍 Finding that address…</div>'; const p = await addrSearch(q);
  if (!p) return false; window._nmr = [p];
  $('ac').innerHTML = `<div class="ac" style="padding:8px;cursor:pointer" onclick="pickPlace(window._nmr[0])"><b>📍 ${esc(p.name)}</b><div class="muted">${esc(p.sub)}</div></div>`;
  if (/Enter/.test(window.event?.key || '')) pickPlace(p); return true });
// Google card & directions use the exact typed address when we have it
