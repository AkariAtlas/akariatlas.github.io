/* Batch: offline check, daily backups, today mode, undo, sync status, EasyCard, rain plan B, receipt photos, memories */
const MX = { esc: s => (typeof esc === 'function' ? esc(s) : String(s || '')) };
function mxSheet(h) { const s = $('sheet'); s.innerHTML = `<div class="sheetIn" style="max-height:94vh;overflow:auto"><div class="row sp"><span></span><button class="pill" aria-label="Close" onclick="closeSheet()">✕</button></div>${h}</div>`; s.classList.add('on') }
const tripDayIdx = () => { const t = trip(); if (!t?.start) return -1; return Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t.start + 'T00:00:00')) / 864e5) };
const onTrip = () => { const i = tripDayIdx(); return i >= 0 && i < DAYS.length };

/* 1. Offline: banner + readiness check */
function mxNet() { let b = $('mxOff'); if (!b) { document.body.insertAdjacentHTML('afterbegin', '<div id="mxOff" style="display:none;position:sticky;top:0;z-index:30;background:#5b4a1d;color:#fff;text-align:center;padding:6px;font-size:13px">📴 Offline · your plan, tickets and saved map areas still work</div>'); b = $('mxOff') } b.style.display = navigator.onLine ? 'none' : '' }
addEventListener('online', () => { mxNet(); try { syncNow?.() } catch (e) { } }); addEventListener('offline', mxNet); setTimeout(mxNet, 500);
async function offlineCheck() { const out = []; const ok = (n, v) => out.push(`${v ? '✅' : '⚠️'} ${n}`);
  ok('App installed for offline (service worker)', !!navigator.serviceWorker?.controller);
  try { ok('App files cached', !!(await caches.match('./akari.js', { ignoreSearch: true }))) } catch (e) { ok('App files cached', 0) }
  try { ok('Map library cached', !!(await caches.match('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'))) } catch (e) { ok('Map library cached', 0) }
  try { const k = await caches.open('tw-tiles').then(c => c.keys()); ok(`Map tiles saved (${k.length})${k.length < 50 ? ' — open Plan maps for each day once on Wi-Fi' : ''}`, k.length >= 50) } catch (e) { }
  ok('Trip saved on this device', !!localStorage.getItem('tw_state'));
  const tk = (D.wallet?.tickets || []), have = tk.filter(t => localStorage.getItem('tw_tkimg_' + t.id)).length; ok(`Tickets with files on this phone: ${have}/${tk.length}`, have === tk.length);
  ok(`Backups on this device: ${mxBackups().length}`, mxBackups().length > 0);
  mxSheet(`<h2>📴 Offline readiness</h2>${out.map(x => `<div style="padding:4px 0">${x}</div>`).join('')}<p class="muted">Tip: before flying, open each day in Plan on Wi-Fi so its map is saved.</p>`) }

/* 2. Daily backups (last 7 on device) + download / restore */
function mxBackups() { try { return JSON.parse(localStorage.getItem('ak_bk') || '[]') } catch (e) { return [] } }
function mxBackup(force) { if (localStorage.getItem('ak_viewonly') === '1') return; const s = localStorage.getItem('tw_state'); if (!s || !/"routes"/.test(s)) return;
  const L = mxBackups(), day = new Date().toISOString().slice(0, 10); if (!force && L[0]?.day === day) return;
  const n = (() => { try { const j = JSON.parse(s); return Object.values(j.routes || {}).reduce((a, r) => a + (r || []).length, 0) } catch (e) { return 0 } })(); if (!n && L.length) return;
  L.unshift({ day, at: Date.now(), stops: n, s }); while (L.length > 7) L.pop();
  try { localStorage.setItem('ak_bk', JSON.stringify(L)) } catch (e) { L.pop(); try { localStorage.setItem('ak_bk', JSON.stringify(L)) } catch (e2) { } } }
setTimeout(() => mxBackup(), 8000);
function openBackups() { const L = mxBackups(); mxSheet(`<h2>🛟 Backups</h2><p class="muted">A copy of your trip is saved on this device once a day (last 7 days).</p>
  ${L.map((b, i) => `<div class="row" style="gap:6px;align-items:center;padding:4px 0"><span style="flex:1">${new Date(b.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${b.stops} stops</span><button class="pill" onclick="mxRestore(${i})">Restore</button></div>`).join('') || '<p>No backups yet.</p>'}
  <div class="row" style="gap:6px;margin-top:10px"><button class="act" onclick="mxBackup(1);openBackups();toast('Backed up ✓')">Back up now</button><button class="pill" onclick="mxDownload()">⬇️ Download file</button><label class="pill" style="cursor:pointer">⬆️ Load file<input type="file" accept=".json" hidden onchange="mxLoadFile(this.files[0])"></label></div>`) }
function mxRestore(i) { const b = mxBackups()[i]; if (!b || !confirm(`Restore your trip to ${new Date(b.at).toLocaleString()}? Current changes will be replaced (a backup of now is kept).`)) return; mxBackup(1); mxApply(b.s) }
function mxApply(s) { try { const j = JSON.parse(s); D = Object.assign({}, DEF, j); localStorage.setItem('tw_state', JSON.stringify(D)); localStorage.removeItem('tw_base'); save(); closeSheet(); renderAll(); toast('Trip restored ✓') } catch (e) { toast('That backup could not be read') } }
function mxDownload() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([localStorage.getItem('tw_state') || '{}'], { type: 'application/json' })); a.download = `akari-${(trip()?.name || 'trip').replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`; a.click() }
function mxLoadFile(f) { if (!f) return; const r = new FileReader(); r.onload = () => { if (confirm('Replace your current trip with this file? (a backup of now is kept)')) { mxBackup(1); mxApply(r.result) } }; r.readAsText(f) }

/* 5. Undo for big changes */
let MX_UNDO = null;
function mxSnap(label) { MX_UNDO = { s: JSON.stringify({ routes: D.routes, stopx: D.stopx, notes: D.notes }), label } }
function mxOffer() { if (!MX_UNDO) return; let b = $('mxUndo'); if (!b) { document.body.insertAdjacentHTML('beforeend', '<div id="mxUndo" style="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:40;background:#28546B;color:#fff;border-radius:14px;padding:10px 14px;display:flex;gap:12px;align-items:center;box-shadow:0 6px 18px #0004"></div>'); b = $('mxUndo') }
  b.innerHTML = `<span>${MX.esc(MX_UNDO.label)} done</span><button class="pill" onclick="mxUndo()">↩️ Undo</button>`; b.style.display = 'flex'; clearTimeout(b._t); b._t = setTimeout(() => { b.style.display = 'none'; MX_UNDO = null }, 30000) }
function mxUndo() { if (!MX_UNDO) return; const j = JSON.parse(MX_UNDO.s); D.routes = j.routes; D.stopx = j.stopx; D.notes = j.notes; MX_UNDO = null; save(); try { renderPlan() } catch (e) { } $('mxUndo').style.display = 'none'; toast('Undone ↩️') }
function mxWrap(name, label) { const f = window[name]; if (typeof f !== 'function' || f._mx) return; const w = async function (...a) { mxSnap(label); const r = await f.apply(this, a); mxOffer(); return r }; w._mx = 1; window[name] = w }
setTimeout(() => { [['cmpApply', 'Suggested plan'], ['cmpAllDays', 'Suggested plan'], ['itApply', 'Import'], ['smartOrder', 'Re-arrange'], ['autoPlan', 'Auto-plan']].forEach(([n, l]) => mxWrap(n, l)) }, 1500);

/* 4. Today mode during the trip */
function mxTodayMode() { const on = onTrip(); document.body.classList.toggle('tripmode', on); if (!on) return; const n = $('walNext'), t = $('todayCard'); if (n && t && n.previousElementSibling !== null && t.parentNode) t.parentNode.insertBefore(n, t); if (n) n.style.fontSize = '1.08em' }
document.head.insertAdjacentHTML('beforeend', '<style>body.tripmode #helpCard,body.tripmode .gsCard,body.tripmode #guideCard{display:none!important}body.tripmode #walNext{border:2px solid var(--leaf)}</style>');
on('today:render', () => setTimeout(mxTodayMode, 400)); setTimeout(() => { if (onTrip()) { try { goTab('today') } catch (e) { } } }, 1200);

/* 6. Clearer sync status */
setTimeout(() => { const f = window.setSync; if (typeof f !== 'function' || f._mx) return; window.setSync = function (t) { f(t); const el = $('sync'); if (!el) return; const who = (D.companions || []).map(c => c.name || c).filter(Boolean)[0]; const ok = /synced|✓|up to date/i.test(t);
  if (ok) { localStorage.setItem('ak_synced_at', Date.now()); el.textContent = `✓ Up to date${who ? ' with ' + who : ''} · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` } else if (/tap|offline|fail|error/i.test(t)) { const at = +localStorage.getItem('ak_synced_at'); el.textContent = `⚠️ Not synced${at ? ' since ' + new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''} · tap` } }; window.setSync._mx = 1 }, 300);

/* 7. EasyCard balance */
function mxEC() { return (D.easy = D.easy || { bal: null, log: [] }) }
const EC_FARE = [['🚇 MRT', 25], ['🚌 Bus', 15], ['🚲 YouBike 30 min', 10], ['🏪 7-Eleven', 0]];
function renderEasy() { const v = $('v-money'); if (!v) return; let c = $('ecCard'); if (!c) { const w = $('walCard'); (w || v.firstChild).insertAdjacentHTML('afterend', '<div class="card" id="ecCard"></div>'); c = $('ecCard') } const E = mxEC(), low = E.bal != null && E.bal < 100;
  c.innerHTML = `<h2>💳 EasyCard</h2><div class="row" style="align-items:center;gap:8px"><b style="font-size:1.6em">${E.bal == null ? '—' : 'NT$' + Math.round(E.bal)}</b>${low ? '<span class="pill" style="background:var(--warn)">Top up soon</span>' : ''}<span style="flex:1"></span><button class="pill" onclick="ecSet()">Set balance</button></div>
   <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${EC_FARE.map(([n, f], i) => `<button class="pill" onclick="ecUse(${i})">${n}${f ? ' −' + f : ' (amount)'}</button>`).join('')}<button class="pill" onclick="ecTop()">＋ Top up</button></div>
   <p class="muted" style="margin:6px 0 0">Tap a ride as you go. Top up at any MRT machine or 7-Eleven (cash only). Check the real balance on the station machine.</p>` }
function ecSet() { const v = prompt('EasyCard balance (NT$)', mxEC().bal ?? ''); if (v === null || isNaN(+v)) return; mxEC().bal = +v; save(); renderEasy() }
function ecUse(i) { const E = mxEC(); let [n, f] = EC_FARE[i]; if (!f) { const v = prompt('Amount paid with EasyCard (NT$)'); if (!v || isNaN(+v)) return; f = +v } if (E.bal == null) E.bal = 0; E.bal -= f; E.log.unshift({ n, f, at: Date.now() }); E.log.length = Math.min(E.log.length, 60); save(); renderEasy(); if (E.bal < 100) toast('💳 EasyCard below NT$100, top up soon'); }
function ecTop() { const v = prompt('Top-up amount (NT$)', '500'); if (!v || isNaN(+v)) return; const E = mxEC(); E.bal = (E.bal || 0) + +v; save(); renderEasy(); toast('Topped up ✓') }
on('today:render', () => setTimeout(renderEasy, 350)); setTimeout(renderEasy, 600);

/* 8. Rain plan B */
const OUTDOOR = /park|mountain|trail|hike|elephant|garden|beach|lake|river|wharf|old street|night market|viewpoint|gondola|maokong|jiufen|shifen|yehliu|zoo|square|夜市/i;
async function mxRain(d) { const t = trip(); if (!t?.base) return null; const day = new Date(t.start + 'T00:00:00'); day.setDate(day.getDate() + d); const ds = day.toISOString().slice(0, 10), now = new Date(), diff = (day - now) / 864e5; if (diff > 15 || diff < -1) return null;
  const k = 'ak_rain_' + ds; let p = sessionStorage.getItem(k); if (p == null) { try { const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${t.base.lat}&longitude=${t.base.lon}&daily=precipitation_probability_max&timezone=auto&start_date=${ds}&end_date=${ds}`)).json(); p = j.daily.precipitation_probability_max[0] } catch (e) { p = -1 } sessionStorage.setItem(k, p) } return +p }
async function mxRainCard() { const el = $('route'); if (!el) return; el.querySelector('.mxRain')?.remove(); const d = curDay, p = await mxRain(d); if (p == null || p < 50) return; const r = D.routes[d] || [], out = r.map((s, i) => [s, i]).filter(([s]) => OUTDOOR.test(s[0])); if (!out.length) return;
  el.insertAdjacentHTML('afterbegin', `<div class="warn mxRain">☔ ${p}% chance of rain on ${DAYS[d]}. Outdoor stops: ${out.map(([s]) => '<b>' + MX.esc(s[0]) + '</b>').join(', ')}.<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${out.slice(0, 3).map(([s, i]) => `<button class="pill" onclick="mxIndoor(${i})">Indoor swap for ${MX.esc(s[0].split(' ').slice(0, 2).join(' '))}</button>`).join('')}</div></div>`) }
async function mxIndoor(i) { const s = D.routes[curDay][i]; mxSheet('<h2>☔ Indoor ideas nearby</h2><p class="muted">Finding museums, malls and cafes…</p>'); let ps = [];
  for (const q of ['museum', 'shopping mall', 'cafe']) { try { ps = ps.concat((await photonQ(q, s[1], s[2], 6)).map(p => ({ ...p, q }))) } catch (e) { } }
  ps = ps.filter(p => dist(s[1], s[2], p.lat, p.lon) < 4).slice(0, 8); MX.ps = ps;
  $('sheet').querySelector('.sheetIn').innerHTML = `<div class="row sp"><h2 style="margin:0">☔ Instead of ${MX.esc(s[0])}</h2><button class="pill" onclick="closeSheet()">✕</button></div>${ps.map((p, k) => `<div class="row" style="gap:6px;align-items:center;padding:5px 0"><span style="flex:1">${p.q === 'museum' ? '🏛️' : p.q === 'cafe' ? '☕' : '🛍️'} ${MX.esc(p.name)} <span class="muted">${dist(s[1], s[2], p.lat, p.lon).toFixed(1)} km</span></span><button class="pill" onclick="mxSwap(${i},${k})">Swap</button></div>`).join('') || '<p>No indoor places found nearby.</p>'}` }
function mxSwap(i, k) { const p = MX.ps[k]; mxSnap('Rain swap'); D.routes[curDay][i] = [p.name, p.lat, p.lon, '']; const ex = dayX(curDay); ex[i] = {}; setDayX(curDay, ex); save(); closeSheet(); retimeDay(curDay).then(() => { save(); renderPlan(); mxOffer() }) }
on('plan:render', () => setTimeout(mxRainCard, 600)); setTimeout(() => { const f = window.renderPlan; if (typeof f === 'function' && !f._mxr) { window.renderPlan = function (...a) { const r = f.apply(this, a); setTimeout(mxRainCard, 700); return r }; window.renderPlan._mxr = 1 } }, 1200);

/* 9. Receipt photo → amount (OCR), photo kept on this phone */
function mxReceiptBtn() { const a = $('eAmt'); if (!a || $('mxRcpt')) return; a.insertAdjacentHTML('afterend', '<label id="mxRcpt" class="pill" style="cursor:pointer" title="Scan receipt">📷<input type="file" accept="image/*" capture="environment" hidden onchange="mxReceipt(this.files[0])"></label>') }
async function mxReceipt(f) { if (!f) return; toast('📷 Reading receipt…'); try {
  if (!window.Tesseract) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
  const txt = (await Tesseract.recognize(f, 'eng+chi_tra')).data.text, lines = txt.split('\n');
  const tl = lines.find(l => /total|合計|總計|小計|應收|amount/i.test(l)), nums = s => (s.match(/\d[\d,]*(?:\.\d{1,2})?/g) || []).map(x => +x.replace(/,/g, '')).filter(x => x > 0 && x < 200000);
  const amt = (tl && nums(tl).pop()) || Math.max(0, ...nums(txt).filter(x => x < 50000)); if (amt) $('eAmt').value = amt;
  const shop = lines.map(l => l.trim()).find(l => l.length > 2 && !/\d{3,}/.test(l)); if (shop && !$('eShop').value) $('eShop').value = shop.slice(0, 30);
  MX.rcpt = await (typeof walShrink === 'function' ? walShrink(f) : null); toast(amt ? `Found NT$${amt}. Check it, then Add` : 'Couldn’t find the total. Type it in') } catch (e) { toast('Receipt reader unavailable offline') } }
setTimeout(() => { const f = window.addExp; if (typeof f !== 'function' || f._mx) return; window.addExp = function () { const n = D.exps.length; f(); if (D.exps.length > n && MX.rcpt) { const id = 'r' + Date.now().toString(36); D.exps[0].rc = id; try { localStorage.setItem('tw_rc_' + id, MX.rcpt) } catch (e) { } MX.rcpt = null; save() } }; window.addExp._mx = 1; mxReceiptBtn() }, 900);
on('today:render', () => setTimeout(mxReceiptBtn, 500));

/* 10. Memories recap */
function openMemories() { const t = trip() || {}, ex = D.exps || [], tot = ex.reduce((a, e) => a + (+e.a || 0), 0), st = Object.values(D.routes || {}).reduce((a, r) => a + (r || []).length, 0);
  const days = DAYS.map((d, i) => { const r = (D.routes[i] || []).filter(s => !/airport|drop bags|check-?(in|out)/i.test(s[0])); const j = (D.journal || {})[i] || (Array.isArray(D.journal) ? D.journal[i] : ''); return r.length || j ? `<div style="break-inside:avoid;margin:10px 0;padding:10px 12px;border-radius:14px;background:var(--card)"><b>${d}</b><div>${r.map(s => '📍 ' + MX.esc(s[0])).join('<br>')}</div>${j ? `<p style="font-style:italic;margin:6px 0 0">“${MX.esc(typeof j === 'string' ? j : j.text || '')}”</p>` : ''}</div>` : '' }).join('');
  mxSheet(`<div id="memo"><h2>📔 ${MX.esc(t.name || 'Our trip')}</h2><p class="muted">${t.start || ''} – ${t.end || ''} · ${MX.esc((typeof people === 'function' ? people() : []).join(' & '))}</p>
   <div class="row" style="gap:8px;flex-wrap:wrap"><div class="stat"><span class="muted">Places</span><b>${st}</b></div><div class="stat"><span class="muted">Days</span><b>${DAYS.length}</b></div><div class="stat"><span class="muted">Spent</span><b>${sym(DC()).trim()}${Math.round(tot).toLocaleString()}</b></div></div>${days}</div>
   <div class="row" style="gap:6px;margin-top:10px"><button class="act" onclick="mxShareMemo()">📤 Share</button><button class="pill" onclick="mxPrintMemo()">🖨️ Save as PDF</button></div>`) }
function mxMemoText() { return $('memo')?.innerText || '' }
function mxShareMemo() { const txt = mxMemoText(); if (navigator.share) navigator.share({ title: trip()?.name || 'Our trip', text: txt }).catch(() => { }); else { navigator.clipboard?.writeText(txt); toast('Copied ✓') } }
function mxPrintMemo() { const w = open('', '_blank'); if (!w) return toast('Allow pop-ups to save the PDF'); w.document.write(`<html><head><title>${MX.esc(trip()?.name || 'Trip')}</title><style>body{font-family:system-ui;padding:24px;color:#343B3B}.stat{display:inline-block;margin-right:18px}</style></head><body>${$('memo').innerHTML}<script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close() }

/* Entry points: Wallet "More tools" row */
function mxTools() { const w = $('walCard'); if (!w || w.querySelector('.mxTools')) return; w.insertAdjacentHTML('beforeend', `<div class="row mxTools" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="pill" onclick="offlineCheck()">📴 Offline check</button><button class="pill" onclick="openBackups()">🛟 Backups</button><button class="pill" onclick="openMemories()">📔 Memories</button></div>`) }
on('today:render', () => setTimeout(mxTools, 450)); setTimeout(mxTools, 900);
setTimeout(() => { const f = window.renderWallet; if (typeof f === 'function' && !f._mx) { window.renderWallet = function () { f(); mxTools() }; window.renderWallet._mx = 1 } }, 800);
