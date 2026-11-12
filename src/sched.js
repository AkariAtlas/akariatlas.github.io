/* Akari Atlas · live day schedule: real travel legs, visit lengths, opening hours, day totals, on-time status */
const DUR = [[/airport.*arrival/i, 60], [/airport.*depart/i, 0], [/drop bags|check-?in|check-?out/i, 30], [/museum|memorial|palace|gallery|art/i, 105], [/night market/i, 120], [/temple|shrine|church/i, 45],
  [/101|tower|observatory|viewpoint|view/i, 60], [/hik|trail|mountain|park|garden/i, 90], [/mall|department|takashimaya|eslite|store|shop|market|street/i, 75], [/cafe|café|coffee|tea|dessert|bakery/i, 45],
  [/restaurant|kitchen|noodle|ramen|food|breakfast|dumpling|hot ?pot/i, 60], [/hot spring|onsen|spa/i, 120], [/zoo|aquarium|water park|theme/i, 150]];
const visitMin = n => { for (const [r, m] of DUR) if (r.test(n)) return m; return 60 };
const toMin = s => { const m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null };
const fmtT = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
D.legs = D.legs || {};
async function legInfo(a, b) { if (!D.legs) D.legs = {}; const k = [a[1], a[2], b[1], b[2]].map(x => (+x).toFixed(4)).join(','); if (D.legs[k]) return D.legs[k];
  const km0 = dist(a[1], a[2], b[1], b[2]); let walk = km0 * 1.3 / 4.8 * 60, drive = km0 * 1.35 / 22 * 60, km = km0 * 1.3;
  try { const f = await (await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a[2]},${a[1]};${b[2]},${b[1]}?overview=false`, { signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined })).json(); if (f.routes?.[0]) { walk = f.routes[0].duration / 60; km = f.routes[0].distance / 1000 } } catch (e) { }
  if (km0 > 1.5) try { const c = await (await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${a[2]},${a[1]};${b[2]},${b[1]}?overview=false`, { signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined })).json(); if (c.routes?.[0]) drive = c.routes[0].duration / 60 * 1.35 } catch (e) { }
  const transit = km0 < 1 ? walk : Math.max(drive * 1.6, 15) + 8; // MRT/bus incl. walk & wait
  const mode = walk <= 20 ? 'walk' : 'transit', mins = Math.round(mode === 'walk' ? walk : transit);
  const fare = DC() === 'TWD' ? { taxi: Math.round(85 + Math.max(0, km - 1.25) * 25), transit: Math.round(20 + km * 1.5) } : null;
  return D.legs[k] = { km: +km.toFixed(1), walk: Math.round(walk), drive: Math.round(drive), transit: Math.round(transit), mode, mins, fare } }
function hoursOk(h, t) { if (!h) return null; if (/24\/7/.test(h)) return true; const rs = [...String(h).matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)]; if (!rs.length) return null;
  return rs.some(r => { const a = +r[1] * 60 + +r[2], b = +r[3] * 60 + +r[4]; return b > a ? t >= a && t <= b : t >= a || t <= b }) }
const costNum = s => { const m = String(s || '').replace(/,/g, '').match(/(\d+(\.\d+)?)/); return m ? +m[1] : 0 };
async function buildSched(day) { const r = D.routes[day] || [], out = []; let clock = null, transport = 0;
  for (let i = 0; i < r.length; i++) { const ex = (D.stopx || {})[day + ':' + i] || {}; let leg = null;
    if (i) { leg = await legInfo(r[i - 1], r[i]); clock += leg.mins; if (leg.fare && leg.mode !== 'walk') transport += leg.fare.transit }
    const set = toMin(ex.time); if (clock == null) clock = set ?? 9 * 60; let wait = 0; if (set != null && set > clock) { wait = set - clock; clock = set }
    const late = set != null && clock > set + 10 ? clock - set : 0, arr = clock, stay = ex.dur ? +ex.dur : visitMin(r[i][0]); clock += stay;
    out.push({ arr, dep: clock, stay, leg, wait, late, open: hoursOk(ex.hours, arr) }) }
  return { stops: out, end: clock, transport, cost: r.reduce((s, x) => s + costNum(x[3]), 0) } }
async function renderSched() { try { return await renderSched0() } catch (e) { console.warn('sched', e) } }
async function renderSched0() { const day = curDay, el = $('route'); if (!el || !(D.routes[day] || []).length) return; const S = await buildSched(day); if (day !== curDay) return;
  D.sched = D.sched || {}; D.sched[day] = S.stops.map(s => [fmtT(s.arr), fmtT(s.dep)]); try { save() } catch (e) { }
  const rows = el.querySelectorAll('.row.sp'); const legs = el.querySelectorAll('div.muted[style*="padding-left:16px"]'); const cur = sym(DC()).trim();
  S.stops.forEach((s, i) => { const row = rows[i]; if (!row) return; row.querySelector('.skd')?.remove();
    row.firstElementChild.insertAdjacentHTML('beforeend', `<div class="skd muted" style="font-size:13px">🕒 ${fmtT(s.arr)}–${fmtT(s.dep)} · ${s.stay >= 60 ? (s.stay / 60).toFixed(s.stay % 60 ? 1 : 0) + ' h' : s.stay + ' min'} here${s.wait > 15 ? ` · ⏸️ ${s.wait} min free before` : ''}${s.late ? ` · <b style="color:#E98B73">⚠️ ${s.late} min behind plan</b>` : ''}${s.open === false ? ` · <b style="color:#E98B73">⛔ may be closed then</b>` : s.open ? ' · ✅ open' : ''} <button class="pill" style="padding:2px 8px;font-size:12px" onclick="setDur(${day},${i})">⏱️</button></div>`);
    if (i && legs[i - 1] && s.leg) { const l = s.leg; legs[i - 1].innerHTML = `↓ ${l.mode === 'walk' ? `🚶 ${l.walk} min walk` : `🚇 ~${l.transit} min MRT/bus · 🚕 ${l.drive} min${l.fare ? ` ≈${cur}${l.fare.taxi}` : ''} · 🚶 ${l.walk} min`} · ${l.km} km · <a target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=${D.routes[day][i - 1][1]},${D.routes[day][i - 1][2]}&destination=${D.routes[day][i][1]},${D.routes[day][i][2]}&travelmode=transit">live</a>` } });
  const bud = (+D.total || 0) * .45 / Math.max(1, DAYS.length) / R(), tot = S.cost + S.transport;
  const today = DAYS[day] && new Date().toDateString() === (() => { const t = trip(); const d = new Date(t.start + 'T00:00:00'); d.setDate(d.getDate() + day); return d.toDateString() })();
  const nowM = new Date().getHours() * 60 + new Date().getMinutes(); let live = '';
  if (today) { const nx = S.stops.findIndex(s => s.dep > nowM); live = nx < 0 ? '✅ Day done' : nowM > S.stops[nx].arr + 15 ? `<b style="color:#E98B73">⏰ Running ~${nowM - S.stops[nx].arr} min late for ${esc(D.routes[day][nx][0])}</b>` : `🟢 On schedule · next: ${esc(D.routes[day][nx][0])} at ${fmtT(S.stops[nx].arr)}` }
  el.querySelector('.skSum')?.remove();
  el.insertAdjacentHTML('afterbegin', `<div class="skSum" style="background:var(--inbg);border-radius:14px;padding:10px 12px;margin-bottom:10px">
   <div><b>🗓️ ${fmtT(S.stops[0].arr)} → ${fmtT(S.end)}</b> · ${S.stops.length} stops${S.end > 22 * 60 ? ' · <b style="color:#E98B73">⚠️ runs past 22:00, consider moving a stop</b>' : ''}</div>
   <div class="muted" style="font-size:13px">💸 Est. ${cur}${Math.round(tot)} (stops ${cur}${Math.round(S.cost)} + transport ${cur}${S.transport})${bud ? ` of ${cur}${Math.round(bud)}/day${tot > bud ? ' · <b style="color:#E98B73">over</b>' : ' · ✅ within budget'}` : ''}${today && typeof spentToday === 'function' ? ` · spent today ${peso(spentToday())}` : ''}</div>${live ? `<div style="margin-top:4px">${live}</div>` : ''}</div>`) }
function setDur(day, i) { const ex = (D.stopx[day + ':' + i] = D.stopx[day + ':' + i] || {}); const cur = ex.dur || visitMin(D.routes[day][i][0]);
  const opts = [30, 45, 60, 90, 120, 180]; const nxt = opts[(opts.indexOf(+cur) + 1) % opts.length] || 60; ex.dur = nxt; save(); renderPlan(); toast(`⏱️ ${nxt} min at ${D.routes[day][i][0]}`) }
on('plan:render', () => renderSched());
setInterval(() => { if (document.querySelector('#v-plan.on, #v-plan.active') || $('route')?.offsetParent) renderSched() }, 60000);
// PDF uses the live schedule times for stops without a fixed time
on('pdf:prepare', async function pdfTimes() {
  for (let d = 0; d < DAYS.length; d++) { if (!(D.routes[d] || []).length) continue; const S = await buildSched(d); S.stops.forEach((s, i) => { const k = d + ':' + i, ex = (D.stopx[k] = D.stopx[k] || {}); ex.time = `${fmtT(s.arr)}–${fmtT(s.dep)}` }) } });

/* ---------- Directions: choose where you start (GPS / your stay / any typed place), swap, and see estimates for every mode ---------- */
window.DIRF = null; let DIRT = null, DIRM = 'w', DIRSW = false;
function dirFromDefault() { const t = trip() || {}; if (typeof me !== 'undefined' && me) return { name: 'My location', lat: me[0], lon: me[1] }; if (t.base) return { name: t.base.name, lat: t.base.lat, lon: t.base.lon }; return { name: 'Start', lat: HOSTEL[0], lon: HOSTEL[1] } }
dirTo = function (n, la, lo, mode) { DIRT = { name: n, lat: la, lon: lo }; DIRM = mode || DIRM || 'w'; if (!DIRF) DIRF = dirFromDefault(); renderDir() };
async function renderDir() { const A = DIRSW ? DIRT : DIRF, B = DIRSW ? DIRF : DIRT, aq = (window.ADDRQ || {})[A.name], bq = (window.ADDRQ || {})[B.name];
  const sa = aq ? encodeURIComponent(aq) : `${A.lat},${A.lon}`, da = bq ? encodeURIComponent(bq) : `${B.lat},${B.lon}`, t = trip() || {};
  $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:94vh;overflow:auto"><div class="row sp"><h3 style="margin:0">🧭 Directions</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:8px 0">
   <div><div class="muted" style="font-size:12px">From</div><div class="row" style="gap:6px;flex-wrap:wrap"><b>${esc(A.name)}</b></div>
    <div class="muted" style="font-size:12px;margin-top:6px">To</div><b>${esc(B.name)}</b></div>
   <button class="pill" title="Swap" onclick="DIRSW=!DIRSW;renderDir()" style="font-size:20px">⇅</button></div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px"><span class="muted" style="font-size:13px;align-self:center">Start from:</span>
   <button class="pill" onclick="dirUseGPS()">📍 Where I am</button>${t.base ? `<button class="pill" onclick="DIRF={name:${JSON.stringify(t.base.name).replace(/"/g, '&quot;')},lat:${t.base.lat},lon:${t.base.lon}};DIRSW=false;renderDir()">🏨 ${esc(t.base.name)}</button>` : ''}</div>
  <div class="row" style="gap:6px"><input id="dirQ" autocomplete="off" placeholder="Or type where you are (place or address)…" style="flex:1" onkeydown="if(event.key==='Enter')dirSetFrom()" oninput="dirSuggest(this.value)"><button class="pill" onclick="dirSetFrom()">Set</button></div><div id="dirAc"></div><div id="dirQs" class="muted" style="font-size:13px;margin:4px 0"></div>
  <div id="dirEst" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0"><div class="muted">Estimating…</div></div>
  <div class="seg" style="margin:8px 0">${[['w', '🚶 Walk'], ['b', '🚲 Bike'], ['r', '🚇 Transit'], ['d', '🚕 Taxi']].map(([m, l]) => `<button class="pill ${m == DIRM ? 'on' : ''}" onclick="DIRM='${m}';renderDir()">${l}</button>`).join('')}</div>
  <iframe src="https://maps.google.com/maps?saddr=${sa}&daddr=${da}&dirflg=${DIRM}&hl=en&gl=${(t.cc || 'us')}&output=embed" style="width:100%;height:420px;border:0;border-radius:14px" loading="lazy"></iframe>
  <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">${typeof startNav === 'function' && (DIRM === 'w' || DIRM === 'b') ? `<button class="act" onclick="startNav(${JSON.stringify(B.name).replace(/"/g, '&quot;')},${B.lat},${B.lon},'${DIRM === 'b' ? 'bike' : 'foot'}')">🔊 Start voice navigation</button>` : ''}<a class="map alt" target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=${sa}&destination=${da}&travelmode=${{ w: 'walking', b: 'bicycling', r: 'transit', d: 'driving' }[DIRM]}">Open in Google Maps</a></div></div>`;
  try { const L = await legInfo([A.name, A.lat, A.lon], [B.name, B.lat, B.lon]), bike = Math.round(L.walk / 3.2), cur = sym(DC()).trim();
    const box = (i, l, m, s) => `<div style="background:var(--inbg);border-radius:12px;padding:8px;text-align:center;cursor:pointer;${DIRM === m ? 'outline:2px solid var(--leaf,#9CAF88)' : ''}" onclick="DIRM='${m === 'b2' ? 'r' : m}';renderDir()"><div>${i}</div><b>${l}</b><div class="muted" style="font-size:12px">${s || ''}</div></div>`;
    const far = L.km > 30, tw = (trip() || {}).cc === 'tw', crow = dist(A.lat, A.lon, B.lat, B.lon), raw = L.drive / 1.35;
    const rail = Math.round(far ? Math.max(25 + crow / 230 * 60 + 25, raw * 1.05) + 20 : L.transit), bus = Math.round(raw * 1.3), car = Math.round(raw * 1.05);
    const railFare = tw ? `THSR/TRA ≈${cur}${Math.round(crow * (crow > 90 ? 4.3 : 1.6) / 10) * 10}` : '', busFare = tw ? `≈${cur}${Math.round(crow * 1.6 / 10) * 10}` : '', carFare = L.fare ? `taxi ≈${cur}${Math.round(85 + Math.max(0, L.km - 1.25) * 25)} · rental car cheaper` : '';
    if (far && (DIRM === 'w' || DIRM === 'b')) DIRM = 'r';
    $('dirEst').innerHTML = far ? box('🚄', '~' + fmtDur(rail), 'r', railFare + (crow > 90 ? ' (+ local bus)' : '')) + box('🚌', '~' + fmtDur(bus), 'b2', busFare + ' intercity bus') + box('🚗', fmtDur(car), 'd', carFare) + `<div class="muted" style="font-size:12px;align-self:center">${Math.round(L.km)} km · too far to walk or bike${crow > 60 ? ' · consider staying overnight' : ''}</div>`
      : box('🚶', fmtDur(L.walk), 'w', L.km + ' km') + box('🚲', fmtDur(bike), 'b', DC() === 'TWD' ? 'YouBike ~NT$' + (10 * Math.ceil(bike / 30)) : '') + box('🚇', '~' + fmtDur(L.transit), 'r', L.fare ? '≈' + cur + L.fare.transit : '') + box('🚕', fmtDur(L.drive), 'd', L.fare ? '≈' + cur + L.fare.taxi : '');
    const arr = new Date(Date.now() + (far ? { r: rail, b2: bus, d: car }[DIRM] || rail : { w: L.walk, b: bike, r: L.transit, d: L.drive }[DIRM]) * 6e4); $('dirEst').insertAdjacentHTML('afterend', `<div class="muted" style="font-size:13px">Leave now → arrive about <b>${arr.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>${DIRSW ? '' : ` · way back is about the same`}</div>`) } catch (e) { $('dirEst').innerHTML = '<div class="muted">Estimates need internet</div>' } }
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
function dirUseGPS() { $('dirQs').textContent = '📍 Getting your location…'; navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => { DIRF = { name: 'My location', lat: p.coords.latitude, lon: p.coords.longitude }; DIRSW = false; renderDir() }, () => $('dirQs').textContent = 'Allow location, or type where you are.', { enableHighAccuracy: true, timeout: 8000 }) : $('dirQs').textContent = 'Location not available here' }
async function dirSetFrom() { const q = $('dirQ').value.trim(); if (!q) return; $('dirQs').textContent = '🔎 Finding ' + q + '…'; const c = DIRT || DIRF;
  let p = null; if (typeof addrSearch === 'function' && /\d/.test(q) && ADDR_RX.test(q)) p = await addrSearch(q);
  if (!p) p = (await geoAny(q, c))[0]
  if (!p) { $('dirQs').textContent = 'Couldn’t find that. Try the full name or address.'; return } DIRF = { name: p.name, lat: p.lat, lon: p.lon }; DIRSW = false; renderDir() }

/* ---------- Ride back to the stay after the last stop (+ stay-nearby suggestions if it's too late/far) ---------- */
const LAST_TRAIN = { tw: 24 * 60, jp: 24 * 60 + 15, kr: 24 * 60 + 30, hk: 24 * 60 + 60, sg: 23 * 60 + 30 };
async function returnLeg(day) { const t = trip(), r = D.routes[day] || []; if (!t?.base || !r.length) return null; const last = r[r.length - 1];
  if (/airport|check-?out|departure/i.test(last[0]) || dist(last[1], last[2], t.base.lat, t.base.lon) < .15) return null;
  const S = await buildSched(day), leg = await legInfo(last, [t.base.name, t.base.lat, t.base.lon]); const startM = S.end, lastTrain = LAST_TRAIN[t.cc] || 23 * 60 + 30;
  const useTaxi = leg.mode !== 'walk' && startM + leg.transit > lastTrain; const mins = leg.mode === 'walk' ? leg.walk : useTaxi ? leg.drive : leg.transit, home = startM + mins;
  return { from: last, leg, startM, home, useTaxi, mins, late: home > 24 * 60 || mins > 90 } }
async function renderReturn() { try { return await renderReturn0() } catch (e) { console.warn('return', e) } }
async function renderReturn0() { const day = curDay, el = $('route'); if (!el) return; el.querySelector('.retLeg')?.remove(); const R0 = await returnLeg(day); if (!R0 || day !== curDay) return; const t = trip(), l = R0.leg, cur = sym(DC()).trim();
  const how = l.mode === 'walk' ? `🚶 Walk ${l.walk} min (${l.km} km)` : R0.useTaxi ? `🚕 Taxi ${l.drive} min ≈${l.fare ? cur + l.fare.taxi : ''} (trains have stopped)` : `🚇 MRT/bus ~${l.transit} min${l.fare ? ' ≈' + cur + l.fare.transit : ''} · or 🚕 ${l.drive} min${l.fare ? ' ≈' + cur + l.fare.taxi : ''}`;
  const html = `<div class="retLeg" style="margin-top:10px;padding:10px 12px;border-radius:14px;background:var(--inbg);${R0.late ? 'border:2px solid #E98B73' : ''}">
   <div><b>🏨 Back to ${esc(t.base.name)}</b> · leave ${fmtT(R0.startM)} → arrive <b>${fmtT(R0.home)}</b></div><div class="muted" style="font-size:13px">${how}</div>
   <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="pill" onclick="DIRF={name:${JSON.stringify(R0.from[0]).replace(/"/g, '&quot;')},lat:${R0.from[1]},lon:${R0.from[2]}};DIRSW=false;dirTo(${JSON.stringify(t.base.name).replace(/"/g, '&quot;')},${t.base.lat},${t.base.lon},'${R0.useTaxi ? 'd' : l.mode === 'walk' ? 'w' : 'r'}')">🧭 Route home</button>${R0.late ? `<button class="act" onclick="stayNear(${day})">🛏️ Too late? Cheapest stays nearby</button>` : ''}</div>
   ${R0.late ? `<div style="color:#E98B73;font-size:13px;margin-top:4px">⚠️ You’d get back ${R0.home > 24 * 60 ? 'after midnight' : 'after a long ride'}. Move a stop earlier, or book a night near ${esc(R0.from[0])}.</div>` : ''}</div>`;
  const notes = el.querySelector('textarea'); notes ? notes.insertAdjacentHTML('beforebegin', html) : el.insertAdjacentHTML('beforeend', html) }
async function stayNear(day) { const t = trip(), r = D.routes[day], last = r[r.length - 1]; const d = new Date(t.start + 'T00:00:00'); d.setDate(d.getDate() + day); const ci = iso(d), d2 = new Date(d); d2.setDate(d2.getDate() + 1); const co = iso(d2);
  const ppl = Math.max(1, String(t.people || '').split(/,|&| and /).filter(s => s.trim()).length || 2);
  $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">🛏️ Stays near ${esc(last[0])}</h3><button class="pill" onclick="closeSheet()">✕</button></div>
   <p class="muted">${DAYS[day]} → next morning · ${ppl} guest${ppl > 1 ? 's' : ''}. Prices and availability are live on each site, sorted cheapest first.</p>
   <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
    <a class="map" target="_blank" href="https://www.booking.com/searchresults.html?latitude=${last[1]}&longitude=${last[2]}&radius=2&checkin=${ci}&checkout=${co}&group_adults=${ppl}&no_rooms=1&order=price&lang=en-us">Booking.com · cheapest</a>
    <a class="map alt" target="_blank" href="https://www.agoda.com/search?latitude=${last[1]}&longitude=${last[2]}&checkIn=${ci}&checkOut=${co}&adults=${ppl}&rooms=1&sort=priceLowToHigh">Agoda · cheapest</a>
    <a class="map alt" target="_blank" href="https://www.google.com/travel/hotels?q=${encodeURIComponent('hotels near ' + last[0])}&dates=${ci},${co}&adults=${ppl}">Google Hotels</a>
    <a class="map alt" target="_blank" href="https://www.trip.com/hotels/list?lat=${last[1]}&lon=${last[2]}&checkin=${ci}&checkout=${co}&adult=${ppl}&orderBy=3">Trip.com</a></div>
   <div id="stayList" class="muted">Finding hotels & hostels within walking distance…</div></div>`;
  let ps = []; for (const q of ['hostel', 'hotel', 'guest house']) { try { ps = ps.concat((await photonQ(q, last[1], last[2], 10)).map(p => ({ ...p, k: q }))) } catch (e) { } }
  const seen = new Set(); ps = ps.filter(p => !seen.has(p.name) && seen.add(p.name)).map(p => ({ ...p, km: dist(last[1], last[2], p.lat, p.lon) })).filter(p => p.km < 2.5).sort((a, b) => (a.k === 'hostel' ? -1 : 0) - (b.k === 'hostel' ? -1 : 0) || a.km - b.km).slice(0, 10);
  $('stayList').innerHTML = ps.length ? ps.map(p => `<div class="place"><div class="ic">${p.k === 'hostel' ? '🛏️' : p.k === 'hotel' ? '🏨' : '🏠'}</div><div style="flex:1"><b>${esc(p.name)}</b><div class="muted">${p.km < 1 ? Math.round(p.km * 1000) + ' m' : p.km.toFixed(1) + ' km'} from ${esc(last[0])} · ${p.k}${p.k === 'hostel' ? ' · usually cheapest' : ''}</div>
     <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap"><a class="pill" target="_blank" href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(p.name + ' Taipei')}&checkin=${ci}&checkout=${co}&group_adults=${ppl}&order=price">Check price & book</a><a class="pill" target="_blank" href="https://www.google.com/travel/hotels?q=${encodeURIComponent(p.name)}&dates=${ci},${co}">Compare</a><button class="pill" onclick="openSheet(${JSON.stringify(p.name).replace(/"/g, '&quot;')},${p.lat},${p.lon})">⭐ Reviews</button></div></div></div>`).join('') : 'No listed stays close by. Use the booking links above.' }
on('plan:render', () => renderReturn());
// include the ride home in the PDF
(HOOKS['pdf:prepare'] = HOOKS['pdf:prepare'] || []).unshift(async function pdfRideHome() { const t = trip();
  for (let d = 0; d < DAYS.length; d++) { const R0 = await returnLeg(d); if (!R0) continue; const l = R0.leg, how = l.mode === 'walk' ? `walk ${l.walk} min` : R0.useTaxi ? `taxi ${l.drive} min` : `MRT/bus ~${l.transit} min (taxi ${l.drive} min)`;
      D.routes[d].push([`Back to ${t.base.name} (${how})`, t.base.lat, t.base.lon, '']); D.stopx[d + ':' + (D.routes[d].length - 1)] = { time: fmtT(R0.home), fixed: 1 } } });

/* place lookup with no distance limit (for "from" points in another city) + live suggestions */
async function geoAny(q, c) { const out = [];
  try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en${c ? `&lat=${c.lat}&lon=${c.lon}` : ''}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined })).json();
    j.features.forEach(f => { const p = f.properties; if (p.name) out.push({ name: p.name, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], sub: [p.city || p.county, p.state, p.country].filter(Boolean).join(', ') }) }) } catch (e) { }
  if (!out.length) try { const cc = (trip() || {}).cc; const j = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&accept-language=en${cc ? '&countrycodes=' + cc : ''}`)).json();
    j.forEach(x => out.push({ name: x.name || x.display_name.split(',')[0], lat: +x.lat, lon: +x.lon, sub: x.display_name.split(',').slice(1, 4).join(',') })) } catch (e) { }
  return out }
let dirT = null;
function dirSuggest(v) { clearTimeout(dirT); const box = $('dirAc'); if (!box) return; if (v.trim().length < 2) { box.innerHTML = ''; return }
  dirT = setTimeout(async () => { const r = await geoAny(v.trim(), DIRT || DIRF); if ($('dirQ')?.value.trim() !== v.trim()) return; window._dirR = r;
    box.innerHTML = r.map((x, i) => `<div class="ac" style="padding:8px;cursor:pointer;border-radius:10px" onclick="DIRF={name:window._dirR[${i}].name,lat:window._dirR[${i}].lat,lon:window._dirR[${i}].lon};DIRSW=false;renderDir()"><b>${esc(x.name)}</b><div class="muted" style="font-size:12px">${esc(x.sub || '')}</div></div>`).join('') || '<div class="muted" style="padding:6px">No matches yet…</div>' }, 300) }
