/* ================= LIVE TURN-BY-TURN WALK / BIKE NAVIGATION (free: OpenStreetMap routing) ================= */
const NAV = { on: false, watch: null, route: null, steps: [], idx: 0, dest: null, mode: 'foot', lock: null, line: null, dot: null, lastSpoken: -1, lastReroute: 0, pos: null };
const ROUTER = { foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/', bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike/' };
function navPhrase(s, dist) {
  const m = s.maneuver, mod = (m.modifier || '').replace('slight ', 'slightly ').replace('sharp ', 'sharply ');
  const inD = dist != null ? (dist > 30 ? `In ${Math.round(dist / 10) * 10} meters, ` : '') : '';
  switch (m.type) {
    case 'depart': return `Let's go! Head ${mod || 'straight'}${s.name ? '' : ''}.`;
    case 'arrive': return `You've arrived at ${NAV.dest.name}. Enjoy!`;
    case 'turn': case 'end of road': case 'fork': return `${inD}turn ${mod}.`;
    case 'new name': case 'continue': return `${inD}keep going ${mod || 'straight'}.`;
    case 'roundabout': case 'rotary': return `${inD}take the roundabout.`;
    default: return `${inD}${mod ? 'go ' + mod : 'continue'}.`;
  }
}
const icon4 = s => ({ left: '⬅️', right: '➡️', 'slight left': '↖️', 'slight right': '↗️', 'sharp left': '↩️', 'sharp right': '↪️', straight: '⬆️', uturn: '🔄' }[s.maneuver.modifier] || (s.maneuver.type === 'arrive' ? '🏁' : '⬆️'));
async function startNav(n, la, lo, mode) {
  if (!navigator.geolocation) return toast('This device has no GPS');
  NAV.dest = { name: n, lat: la, lon: lo }; NAV.mode = mode || 'foot'; NAV.on = true; NAV.idx = 0; NAV.lastSpoken = -1;
  closeSheet && closeSheet(); document.querySelector('[data-v=explore]').click(); initMap();
  $('navBar').classList.add('on'); $('navBar').innerHTML = '<div class="navIn"><b>📡 Finding you…</b><br><span class="muted">Allow location if asked.</span></div>';
  try { if ('wakeLock' in navigator) NAV.lock = await navigator.wakeLock.request('screen') } catch (e) { }
  NAV.watch = navigator.geolocation.watchPosition(onPos, e => { $('navBar').innerHTML = `<div class="navIn"><b>⚠️ Can't get your location</b><br><span class="muted">On iPhone: Settings → Privacy → Location Services → Safari Websites → While Using. Then try again.</span><br><button class="pill" onclick="stopNav()">Close</button></div>` }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}
async function route(from) {
  const u = `${ROUTER[NAV.mode]}${from[1]},${from[0]};${NAV.dest.lon},${NAV.dest.lat}?steps=true&overview=full&geometries=geojson`;
  const j = await (await fetch(u)).json(); if (j.code !== 'Ok') throw j.code;
  NAV.route = j.routes[0]; NAV.steps = NAV.route.legs[0].steps; NAV.idx = 0; NAV.lastSpoken = -1;
  const pts = NAV.route.geometry.coordinates.map(c => [c[1], c[0]]);
  if (NAV.line) NAV.line.remove(); NAV.line = L.polyline(pts, { color: '#3b82f6', weight: 6, opacity: .85 }).addTo(map);
  map.fitBounds(NAV.line.getBounds(), { padding: [30, 30] });
}
function distToLine(p) { const pts = NAV.route.geometry.coordinates; let best = 1e9; for (let i = 0; i < pts.length; i += 1) { const d = dist(p[0], p[1], pts[i][1], pts[i][0]); if (d < best) best = d } return best * 1000 }
async function onPos(g) {
  const p = [g.coords.latitude, g.coords.longitude]; NAV.pos = p; me = p;
  if (!NAV.dot) NAV.dot = L.circleMarker(p, { radius: 9, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(map); else NAV.dot.setLatLng(p);
  try {
    if (!NAV.route) { await route(p); speak(navPhrase(NAV.steps[0]) + ` It's about ${Math.round(NAV.route.distance)} meters, around ${Math.max(1, Math.round(NAV.route.duration / 60))} minutes.`) }
    else if (distToLine(p) > 45 && Date.now() - NAV.lastReroute > 15000) { NAV.lastReroute = Date.now(); speak("Looks like we went a different way. Finding a new route."); await route(p) }
  } catch (e) { $('navBar').innerHTML = `<div class="navIn"><b>Route unavailable</b><br><span class="muted">Needs internet. Try Google Maps.</span><br><a class="map" target="_blank" href="${GM(NAV.dest.lat, NAV.dest.lon)}">Google Maps</a> <button class="pill" onclick="stopNav()">Close</button></div>`; return }
  // advance to the next maneuver we haven't passed
  let next = NAV.steps[Math.min(NAV.idx + 1, NAV.steps.length - 1)]; let dNext = dist(p[0], p[1], next.maneuver.location[1], next.maneuver.location[0]) * 1000;
  while (dNext < 15 && NAV.idx < NAV.steps.length - 1) { NAV.idx++; next = NAV.steps[Math.min(NAV.idx + 1, NAV.steps.length - 1)]; dNext = dist(p[0], p[1], next.maneuver.location[1], next.maneuver.location[0]) * 1000 }
  const left = dist(p[0], p[1], NAV.dest.lat, NAV.dest.lon) * 1000;
  if (left < 20 || (next.maneuver.type === 'arrive' && dNext < 20)) { speak(`You've arrived at ${NAV.dest.name}. Enjoy!`); $('navBar').innerHTML = `<div class="navIn"><b>🏁 You've arrived at ${esc(NAV.dest.name)}!</b><br><button class="act" onclick="stopNav()">Done</button></div>`; endWatch(); return }
  const nextIdx = NAV.idx + 1;
  if (NAV.lastSpoken !== nextIdx && dNext < 60) { NAV.lastSpoken = nextIdx; speak(navPhrase(next, dNext)); try { navigator.vibrate && navigator.vibrate(200) } catch (e) { } }
  const etaMin = Math.max(1, Math.round(left * 1.3 / (NAV.mode === 'bike' ? 230 : 80)));
  $('navBar').innerHTML = `<div class="navIn"><div class="row sp"><span style="font-size:30px">${icon4(next)}</span><div style="flex:1;margin-left:8px"><b style="font-size:18px">${Math.round(dNext)} m</b> · ${esc(navPhrase(next).replace(/^In \d+ meters, /, ''))}<div class="muted">${esc(next.name || '')}</div></div></div>
   <div class="row sp" style="margin-top:6px"><span class="muted">To ${esc(NAV.dest.name)} · ${Math.round(left)} m · ~${etaMin} min ${NAV.mode === 'bike' ? '🚲' : '🚶'}</span><span><button class="pill" onclick="speak(navPhrase(NAV.steps[NAV.idx+1]||NAV.steps[NAV.idx], ${Math.round(dNext)}))">🔊</button> <button class="pill" onclick="map.setView(NAV.pos,18)">📍</button> <button class="pill" style="background:var(--rose);color:#fff" onclick="stopNav()">End</button></span></div></div>`;
  if (map && !map._navFollowOff) map.setView(p, Math.max(map.getZoom(), 17), { animate: true });
}
function endWatch() { if (NAV.watch != null) navigator.geolocation.clearWatch(NAV.watch); NAV.watch = null; try { NAV.lock && NAV.lock.release() } catch (e) { } NAV.lock = null }
function stopNav() { endWatch(); NAV.on = false; NAV.route = null; if (NAV.line) { NAV.line.remove(); NAV.line = null } $('navBar').classList.remove('on'); $('navBar').innerHTML = ''; speechSynthesis.cancel() }
document.addEventListener('visibilitychange', async () => { if (!document.hidden && NAV.on && !NAV.lock) { try { NAV.lock = await navigator.wakeLock.request('screen') } catch (e) { } } });

/* ================= OPTIONAL: SAVE TO YOUR OWN GOOGLE DRIVE (one tap) ================= */
const GOOGLE_CLIENT_ID = '255196446983-964kvg8471qkh72sm1pqp44amlca6r03.apps.googleusercontent.com'; // set after creating a free OAuth client (see backend/README.md)
const GD = { token: null, fileId: localStorage.getItem('tw_gd_file') || null, client: null };
function gdAvailable() { return !!GOOGLE_CLIENT_ID }
function loadGIS() { return new Promise((res, rej) => { if (window.google?.accounts?.oauth2) return res(); const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }) }
async function gdConnect(silent) {
  if (!gdAvailable()) return toast('Google connect is being set up — use Create trip for now');
  await loadGIS();
  return new Promise(res => {
    GD.client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.appdata', prompt: silent ? '' : 'consent',
      callback: async r => { if (r.error) { toast('Google sign-in cancelled'); return res(false) } GD.token = r.access_token; localStorage.setItem('tw_store', 'gdrive'); await gdPull(); setSync('☁️ Google Drive'); renderSettings(); toast('Connected to your Google Drive ✓'); res(true) } });
    GD.client.requestAccessToken();
  });
}
async function gdApi(path, opt = {}) { const r = await fetch('https://www.googleapis.com' + path, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + GD.token } }); if (r.status === 401) { GD.token = null; throw 'expired' } return r }
async function gdFind() { if (GD.fileId) return GD.fileId; const r = await (await gdApi("/drive/v3/files?spaces=appDataFolder&q=name%3D'taiwan-trip.json'&fields=files(id)")).json(); GD.fileId = r.files?.[0]?.id || null; if (GD.fileId) localStorage.setItem('tw_gd_file', GD.fileId); return GD.fileId }
async function gdPull() { const id = await gdFind(); if (!id) return gdPush(); const r = await (await gdApi(`/drive/v3/files/${id}?alt=media`)).json(); if ((r.t || 0) > D.t) { D = Object.assign({}, DEF, r); localStorage.setItem('tw_state', JSON.stringify(D)); renderAll() } else if (D.t > (r.t || 0)) gdPush() }
async function gdPush() { if (!GD.token) return; const id = await gdFind(); const meta = id ? {} : { name: 'taiwan-trip.json', parents: ['appDataFolder'] };
  const fd = new FormData(); fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' })); fd.append('file', new Blob([JSON.stringify(D)], { type: 'application/json' }));
  const r = await (await gdApi(`/upload/drive/v3/files${id ? '/' + id : ''}?uploadType=multipart&fields=id`, { method: id ? 'PATCH' : 'POST', body: fd })).json(); if (r.id) { GD.fileId = r.id; localStorage.setItem('tw_gd_file', r.id) } setSync('☁️ Google Drive') }

/* ================= IMPORT BOOKINGS FROM GMAIL (read-only, runs on your device) ================= */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function pDate(s) { if (!s) return null; let m = s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/); if (m) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/); if (m && MONTHS[m[1].toLowerCase()] != null) return new Date(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  m = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); return null }
const iso = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
function b64u(s) { try { return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))) } catch (e) { return '' } }
function msgText(p) { let out = ''; (function walk(x) { if (!x) return; if (x.mimeType === 'text/plain' && x.body?.data) out += b64u(x.body.data) + '\n'; else if (x.mimeType === 'text/html' && x.body?.data && !out) out += b64u(x.body.data).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&') + '\n'; (x.parts || []).forEach(walk) })(p); return out.replace(/\n{2,}/g, '\n') }
function parseFlights(t) { t = t.replace(/[\u202a\u202c]/g, ''); const out = [];
  // Trip.com style: 'Departure: Manila - Taipei | December 12, 2026' ... '3:40 AM' ... 'EVA Air BR262'
  { const rt = /(Departure|Return|Outbound|Inbound)[:：]\s*([^|\n]{3,60}?)\s*\|?\s*([A-Za-z]+ \d{1,2},? \d{4})([\s\S]{0,700}?)\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/g; let k; while ((k = rt.exec(t))) { const tm = (k[4].match(/(\d{1,2}:\d{2}\s*[AP]M)/) || [])[1] || ''; out.push({ no: k[5] + k[6], time: tm, date: pDate(k[3]), from: k[2].replace(/\|/g, '').trim() }) } }
  // Links with flightNo=BR262 ... takeoffDatetime=2026-12-12 03:40
  { const rl = /flightNo=([A-Z0-9]{2})(\d{2,4})[^\s"]*?takeoffDatetime=(\d{4}-\d{2}-\d{2})[ T+%20]*(\d{2}:\d{2})?/g; let k; while ((k = rl.exec(t))) if (!out.some(f => f.no === k[1] + k[2])) out.push({ no: k[1] + k[2], time: k[4] || '', date: pDate(k[3]), from: '' }) }
  if (out.length) return out.filter(f => f.date); const re = /([A-Z][A-Za-z ]{2,30}?)\s*[·|-]?\s*\b([A-Z0-9]{2})\s?(\d{2,4})\b[\s\S]{0,200}?Departure[:：]?\s*([0-9:]{4,5}\s*[AP]M)?,?\s*([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2} [A-Za-z]+ \d{4})[,\s]*([^\n]{0,60})/g; let m;
  while ((m = re.exec(t))) out.push({ no: m[2] + m[3], time: (m[4] || '').trim(), date: pDate(m[5]), from: m[6].replace(/[|│]+/g, '').trim() });
  if (!out.length) { const r2 = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b[\s\S]{0,120}?(\d{1,2}:\d{2}\s*(?:[AP]M)?)[\s\S]{0,60}?((?:\d{1,2} [A-Za-z]{3,9},? \d{4})|(?:[A-Za-z]{3,9} \d{1,2},? \d{4}))/g; while ((m = r2.exec(t))) out.push({ no: m[1] + m[2], time: m[3], date: pDate(m[4]), from: '' }) }
  return out.filter(f => f.date) }
function parseHotel(t, subject) { const ci = t.match(/Check-?in[^\n]{0,15}?\b([A-Za-z]*,?\s*\d{1,2} [A-Za-z]+ \d{4}|[A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i), co = t.match(/Check-?out[^\n]{0,15}?\b([A-Za-z]*,?\s*\d{1,2} [A-Za-z]+ \d{4}|[A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i);
  if (!ci) return null; let name = (subject.match(/(?:booking|reservation|stay) (?:at|for) (.+?)(?:\s*[-|(]|$)/i) || [])[1] || '';
  const addr = (t.match(/\n([^\n]{8,120}(?:Taiwan|台灣|臺灣|District|區)[^\n]{0,40})/) || [])[1] || ''; const zh = (t.match(/([一-鿿][一-鿿0-9段巷弄號樓之\-]{6,40}[號樓])/) || [])[1] || '';
  return { name: name.trim(), addr: addr.replace(/ - Show directions/i, '').trim(), zh, start: pDate(ci[1]), end: pDate(co && co[1]) } }
let gmTok = null;
async function gmailImport() { if (localStorage.getItem('ak_gmail') !== '1') return openPasteImport();
  if (!gdAvailable()) return toast('Google sign-in not set up');
  const st = $('gmStatus'); st.innerHTML = '🔐 Choose the Google account that has your booking emails…'; await loadGIS();
  gmTok = await new Promise(res => { google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/gmail.readonly', prompt: 'select_account', callback: r => res(r.error ? null : r.access_token) }).requestAccessToken() });
  if (!gmTok) { st.textContent = 'Cancelled. You can fill in the fields manually.'; return }
  st.innerHTML = '📬 Reading your booking emails…';
  const G = async p => (await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + gmTok } })).json();
  const q = encodeURIComponent('(flight OR itinerary OR e-ticket OR "booking confirmed" OR "flight booking" OR reservation OR check-in OR "your booking" OR from:trip.com OR from:booking.com OR from:agoda.com OR from:airbnb.com OR from:klook.com) newer_than:13m -category:promotions');
  const list = await G(`messages?q=${q}&maxResults=60`); if (!list.messages) { st.textContent = 'No booking emails found in this account. Fill in manually or try another account.'; return }
  const flights = [], hotels = [];
  for (const m of list.messages) { const msg = await G(`messages/${m.id}?format=full`); const subj = (msg.payload.headers.find(h => h.name === 'Subject') || {}).value || ''; const t = msgText(msg.payload);
    parseFlights(t).forEach(f => { if (!flights.some(x => x.no === f.no && +x.date === +f.date)) flights.push(f) }); const h = parseHotel(t, subj); if (h && h.start) hotels.push(h) }
  // Only upcoming trips are imported; past bookings stay out (your saved past trips are untouched)
  const today = new Date(); today.setHours(0, 0, 0, 0); const nF = flights.length, nH = hotels.length;
  const fut = flights.filter(f => f.date >= today), futH = hotels.filter(x => (x.end || x.start) >= today);
  const skipped = (nF - fut.length) + (nH - futH.length); flights.length = 0; flights.push(...fut); hotels.length = 0; hotels.push(...futH);
  flights.sort((a, b) => a.date - b.date); hotels.sort((a, b) => a.start - b.start);
  // Match the stay to the flights (closest check-in to the first flight)
  if (flights[0] && hotels.length > 1) hotels.sort((a, b) => Math.abs(a.start - flights[0].date) - Math.abs(b.start - flights[0].date));
  const h = hotels[0], fOut = flights[0], fBack = flights.length > 1 ? flights[flights.length - 1] : null;
  const start = h?.start || fOut?.date, end = h?.end || fBack?.date;
  if (start) $('wStart').value = iso(start); if (end) $('wEnd').value = iso(end);
  const fmt = f => `${f.no} · ${f.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${f.time ? ' · ' + f.time : ''}${f.from ? ' · ' + f.from.slice(0, 40) : ''}`;
  if (fOut) $('wOut').value = fmt(fOut); if (fBack) $('wBack').value = fmt(fBack);
  if (h) { if (h.name) $('wBaseQ').value = h.name; if (h.zh) $('wAddr').value = h.zh; try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(h.name || h.addr)}&limit=1&lang=en`)).json(); const f = j.features[0]; if (f) { const [lo, la] = f.geometry.coordinates; const cc = (f.properties.countrycode || '').toLowerCase(); wizBase = { name: h.name || f.properties.name, lat: la, lon: lo, cc, cur: CC_CUR[cc] || 'USD', country: f.properties.country || '' } } } catch (e) { } }
  st.innerHTML = `✅ Found ${flights.length} flight${flights.length === 1 ? '' : 's'} and ${hotels.length} stay${hotels.length === 1 ? '' : 's'}. Please check the fields below, fix anything, then tap Save.${skipped ? ` Skipped ${skipped} past booking${skipped === 1 ? '' : 's'}; past trips you saved stay in My trips.` : ''}${!h && !fOut ? ' Nothing matched, so please fill in manually.' : ''}`;
  if (D.voice) speak(flights.length || hotels.length ? `Found your bookings! I filled in what I could. Please double check before saving.` : `I couldn't find bookings in that account. You can type them in instead.`);
  try { google.accounts.oauth2.revoke(gmTok) } catch (e) { } gmTok = null; // read once, then drop access
}
