/* Akari Atlas · layout (Trip tab, header settings, next-up, desktop explore) + wallet, split, journal, weather packing, reminders, trip summary */
(function layout() {
  const st = document.createElement('style'); st.textContent = `
#talkFab{width:46px!important;height:46px!important;font-size:20px!important;bottom:92px!important;right:14px!important;opacity:.95}
#setView{position:fixed;inset:0;z-index:80;background:var(--bg,#1f2d38);overflow:auto;display:none;padding:14px}#setView.on{display:block}
#setView .top{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:6px 2px 10px;background:inherit;z-index:2}
#setBtn{border:none;border-radius:50%;width:38px;height:38px;font-size:18px;flex:0 0 auto;cursor:pointer;background:#F7F2E8;box-shadow:0 2px 6px #0003}
.walletGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}.walletGrid figure{margin:0;background:var(--inbg);border-radius:12px;padding:6px;text-align:center;cursor:pointer}.walletGrid img{width:100%;height:80px;object-fit:cover;border-radius:8px}
`; document.head.appendChild(st);
  const nb = document.querySelector('[data-v="docs"]'); if (nb) nb.innerHTML = '<span>🧳</span>Trip';
  // settings screen
  const sv = document.createElement('div'); sv.id = 'setView'; sv.innerHTML = `<div class="top"><h2 style="margin:0">⚙️ Settings</h2><button class="pill" onclick="closeSettings()">✕ Done</button></div><div id="setBody"></div>`; document.body.appendChild(sv);
  const move = () => { const body = $('setBody'); if (!body || body.dataset.done) return; const cards = [...document.querySelectorAll('#v-docs .card')];
    const pick = rx => cards.find(c => rx.test(c.querySelector('h2')?.textContent || ''));
    body.insertAdjacentHTML('beforeend', `<div class="card"><h2>📥 Import bookings</h2><button class="act" style="width:100%;margin:4px 0" onclick="closeSettings();openWizard()">🧳 Trip details</button><button class="pill" style="width:100%;margin:4px 0" onclick="openPasteImport()">📎 Other email: paste or upload</button></div>`);
    [pick(/My trips/), pick(/Sync & settings/), pick(/My bookings/)].forEach(c => c && body.appendChild(c));
    body.insertAdjacentHTML('beforeend', `<div class="card"><h2>📲 App</h2><p><a href="install.html">Install on iPhone, Android or computer</a> · <a href="privacy.html" target="_blank">Privacy & terms</a></p><p class="muted">Akari Atlas · Your world, one journey at a time.</p></div>`); body.dataset.done = 1 };
  window.openSettings = () => { move(); const bg = getComputedStyle(document.body).backgroundColor; sv.style.background = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : (document.body.classList.contains('dark') ? '#1f2d38' : '#F7F2E8'); sv.classList.add('on') }; window.closeSettings = () => sv.classList.remove('on');
  const addBtn = () => { if ($('setBtn')) return; const host = document.querySelector('.topbtns') || $('themeBtn')?.parentElement; if (!host) return setTimeout(addBtn, 800);
    const b = document.createElement('button'); b.id = 'setBtn'; b.title = 'Settings'; b.textContent = '⚙️'; b.onclick = openSettings; host.appendChild(b) }; addBtn();
})();

/* ---------- Today: what's next ---------- */
function tripDayIndex() { const t = trip(); if (!t?.start) return -1; const s = new Date(t.start + 'T00:00:00'); return Math.floor((new Date(new Date().toDateString()) - s) / 864e5) }
async function nextUpCard() { const t = trip(); if (!t || typeof buildSched !== 'function') return ''; let d = tripDayIndex(); const before = d < 0; if (before) d = 0; if (d >= DAYS.length) return '';
  const r = D.routes[d] || []; if (!r.length) return `<div class="card"><h2>⏭️ What's next</h2><p class="muted">No stops planned for ${DAYS[d]} yet. <a href="#" onclick="document.querySelector('[data-v=plan]').click();return false">Plan the day ›</a></p></div>`;
  const S = await buildSched(d), now = new Date().getHours() * 60 + new Date().getMinutes(); const i = before ? 0 : S.stops.findIndex(s => s.dep > now); if (i < 0) return '';
  const s = S.stops[i], x = r[i], leg = s.leg, leave = s.arr - (leg ? leg.mins : 0);
  return `<div class="card" style="border:2px solid #9CAF88"><h2>⏭️ ${before ? 'First stop · ' + DAYS[0] : 'Next up'}</h2><div style="font-size:20px;font-weight:700">${esc(x[0])}</div>
   <p>🕒 ${fmtT(s.arr)}–${fmtT(s.dep)}${!before ? ` · <b>leave by ${fmtT(leave)}</b>${now > leave ? ' <span style="color:#E98B73">(now!)</span>' : ''}` : ''}${leg ? ` · ${leg.mode === 'walk' ? '🚶 ' + leg.walk + ' min walk' : '🚇 ~' + leg.transit + ' min'}` : ''}</p>
   <button class="act" onclick="dirTo(${JSON.stringify(x[0]).replace(/"/g, '&quot;')},${x[1]},${x[2]},'${leg && leg.mode !== 'walk' ? 'r' : 'w'}')">🧭 Directions</button></div>` }
on('today:render', function todayNext() { (async () => { const h = await nextUpCard(); document.getElementById('nextUp')?.remove(); if (!h) return; const tc = $('todayCard'); if (tc) tc.insertAdjacentHTML('beforebegin', `<div id="nextUp">${h}</div>`) })(); (async () => { const s = tripSummaryCard(); document.getElementById('sumCard')?.remove(); if (s) $('todayCard')?.insertAdjacentHTML('beforebegin', `<div id="sumCard">${s}</div>`) })() }); try { window.renderToday() } catch (e) { }

/* ---------- 1. Wallet (stored only on this device) ---------- */
const WDB = () => new Promise((res, rej) => { const r = indexedDB.open('akari-wallet', 1); r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = rej });
async function wAll() { const db = await WDB(); return new Promise(r => { const q = db.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => r(q.result) }) }
async function wPut(o) { const db = await WDB(); return new Promise(r => { const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').put(o); tx.oncomplete = r }) }
async function wDel(id) { const db = await WDB(); return new Promise(r => { const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').delete(id); tx.oncomplete = r }) }
async function wAdd(files) { const kind = $('wKind').value; for (const f of files) await wPut({ id: Date.now() + Math.random(), kind, name: f.name, type: f.type, blob: f, at: Date.now() }); renderWallet(); toast('Saved to wallet 🔒') }
async function renderWallet() { const el = $('walletList'); if (!el) return; const d = await wAll();
  el.innerHTML = d.length ? d.map(x => `<figure onclick="wView(${x.id})">${/^image/.test(x.type) ? `<img src="${URL.createObjectURL(x.blob)}">` : '<div style="font-size:40px;height:80px;line-height:80px">📄</div>'}<figcaption style="font-size:12px">${esc(x.kind)}<br><span class="muted">${esc(x.name.slice(0, 18))}</span></figcaption></figure>`).join('') : '<p class="muted">Add photos or PDFs of passports, e-tickets, insurance, eTravel QR. They stay on this phone only and open offline.</p>' }
async function wView(id) { const x = (await wAll()).find(y => y.id === id); if (!x) return; const u = URL.createObjectURL(x.blob); $('sheet').classList.add('on');
  $('sheet').innerHTML = `<div class="sheetIn" style="max-height:94vh;overflow:auto"><div class="row sp"><h3 style="margin:0">${esc(x.kind)}</h3><button class="pill" onclick="closeSheet()">✕</button></div>${/^image/.test(x.type) ? `<img src="${u}" style="width:100%;border-radius:12px;margin-top:8px">` : `<iframe src="${u}" style="width:100%;height:70vh;border:0;border-radius:12px;margin-top:8px"></iframe>`}<div class="row" style="gap:8px;margin-top:8px"><a class="map alt" href="${u}" download="${esc(x.name)}">⬇️ Save</a><button class="pill" onclick="wDel(${id}).then(()=>{closeSheet();renderWallet()})">🗑️ Remove</button></div></div>` }
function walletCard() { return `<div class="card" id="walletCard"><h2>🔐 Wallet</h2><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><select id="wKind" style="flex:1">${['🛂 Passport', '✈️ E-ticket', '🏨 Hotel booking', '🛡️ Insurance', '📱 eTravel / arrival QR', '💳 Other'].map(k => `<option>${k}</option>`).join('')}</select><label class="act" style="cursor:pointer">＋ Add<input type="file" multiple accept="image/*,application/pdf" capture="environment" style="display:none" onchange="wAdd(this.files)"></label></div><div class="walletGrid" id="walletList"></div></div>` }

/* ---------- 2. Split expenses ---------- */
function splitCard() { const ppl = String(trip()?.people || '').split(/,|&| and /).map(s => s.trim()).filter(Boolean); if (ppl.length < 2) return '';
  const paid = Object.fromEntries(ppl.map(p => [p, 0])); let total = 0; (D.exps || []).forEach(e => { const a = e.a * R(); total += a; const w = ppl.find(p => p.toLowerCase() === String(e.w || '').toLowerCase()) || ppl[0]; paid[w] += a });
  const share = total / ppl.length, bal = ppl.map(p => [p, paid[p] - share]); const owes = []; const cr = bal.filter(b => b[1] > .5).map(b => [...b]), db = bal.filter(b => b[1] < -.5).map(b => [b[0], -b[1]]);
  while (cr.length && db.length) { const m = Math.min(cr[0][1], db[0][1]); owes.push(`${db[0][0]} → ${cr[0][0]}: <b>${peso(m)}</b>`); cr[0][1] -= m; db[0][1] -= m; if (cr[0][1] < .5) cr.shift(); if (db[0][1] < .5) db.shift() }
  return `<div class="card" id="splitCard"><h2>🤝 Split expenses</h2>${ppl.map(p => `<div class="row sp"><span>${esc(p)} paid</span><b>${peso(paid[p])}</b></div>`).join('')}<p class="muted">Total ${peso(total)} · each ${peso(share)}</p><div>${owes.length ? owes.join('<br>') : '✅ All square'}</div><p class="muted" style="font-size:12px">Uses "who paid" on each logged expense, split equally.</p></div>` }
on('money:render', function splitHook() { document.getElementById('splitCard')?.remove(); const h = splitCard(); if (!h) return; const cards = document.querySelectorAll('#v-money > .card'); (cards[1] || cards[0])?.insertAdjacentHTML('afterend', h) });

/* ---------- 3. Trip journal + memories PDF ---------- */
async function jPhoto(day, files) { for (const f of files) await wPut({ id: Date.now() + Math.random(), kind: 'journal:' + day, name: f.name, type: f.type, blob: f, at: Date.now() }); renderJournal(); toast('Added to your journal 📸') }
async function renderJournal() { const el = $('journalList'); if (!el) return; const all = await wAll(); D.journal = D.journal || {};
  el.innerHTML = DAYS.map((d, i) => { const ph = all.filter(x => x.kind === 'journal:' + i); return `<details ${i === Math.max(0, tripDayIndex()) ? 'open' : ''}><summary><b>${d}</b> ${ph.length ? `· 📸 ${ph.length}` : ''}${D.journal[i] ? ' · 📝' : ''}</summary>
    <textarea rows="2" placeholder="What was special today?" oninput="D.journal[${i}]=this.value;save()" style="width:100%;margin:6px 0">${esc(D.journal[i] || '')}</textarea><div class="walletGrid">${ph.map(x => `<figure onclick="wView(${x.id})"><img src="${URL.createObjectURL(x.blob)}"></figure>`).join('')}<label class="pill" style="cursor:pointer;align-self:center;text-align:center">＋ Photo<input type="file" accept="image/*" multiple style="display:none" onchange="jPhoto(${i},this.files)"></label></div></details>` }).join('') }
async function memoriesPdf() { toast('Making your memories PDF…'); await loadJsPDF(); const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'a4' }), W = 595, all = await wAll(), t = trip() || {};
  const img = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 1000 / Math.max(im.width, im.height)); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); r([c.toDataURL('image/jpeg', .8), c.width, c.height]) }; im.src = fr.result }; fr.readAsDataURL(b) });
  doc.setFillColor(40, 84, 107); doc.rect(0, 0, W, 842, 'F'); doc.setTextColor(255); doc.setFontSize(34); doc.text(t.name || 'My trip', W / 2, 360, { align: 'center' }); doc.setFontSize(14); doc.text(`${t.start || ''} – ${t.end || ''}`, W / 2, 392, { align: 'center' }); doc.text('Akari Atlas · A little magic in every journey.', W / 2, 800, { align: 'center' });
  for (let i = 0; i < DAYS.length; i++) { const ph = all.filter(x => x.kind === 'journal:' + i), note = (D.journal || {})[i]; if (!ph.length && !note && !(D.routes[i] || []).length) continue; doc.addPage(); doc.setTextColor(40, 84, 107); doc.setFontSize(20); doc.text(DAYS[i], 40, 56);
    doc.setFontSize(11); doc.setTextColor(52, 59, 59); let y = 80; const places = (D.routes[i] || []).map(x => x[0].replace(/[^\x20-\x7E]/g, '').trim()).filter(Boolean).join(' · '); if (places) { const l = doc.splitTextToSize('Visited: ' + places, W - 80); doc.text(l, 40, y); y += l.length * 14 + 6 }
    if (note) { const l = doc.splitTextToSize(note.replace(/[^\x20-\x7E\n]/g, ''), W - 80); doc.text(l, 40, y); y += l.length * 14 + 10 }
    let x = 40; for (const p of ph.slice(0, 6)) { const [d, w, h] = await img(p.blob), pw = 250, phh = pw * h / w; if (y + phh > 800) { doc.addPage(); y = 50; x = 40 } doc.addImage(d, 'JPEG', x, y, pw, phh); if (x > 40) { x = 40; y += phh + 10 } else x = 300 } }
  doc.save(`${(t.name || 'trip').replace(/\W+/g, '-')}-memories.pdf`) }
function journalCard() { return `<div class="card" id="journalCard"><h2>📔 Trip journal</h2><div id="journalList"></div><button class="act" style="margin-top:8px" onclick="memoriesPdf()">🎞️ Make my memories PDF</button></div>` }

/* ---------- 4. Weather-smart packing ---------- */
async function weatherPacking() { const t = trip(); const el = $('wxPack'); if (!t?.base || !el) return; el.innerHTML = '<p class="muted">Checking the weather for your dates…</p>';
  const s = new Date(t.start), e = new Date(t.end), soon = (s - Date.now()) / 864e5 < 14; let days = [];
  try { if (soon) { const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${t.base.lat}&longitude=${t.base.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&start_date=${t.start}&end_date=${t.end}&timezone=auto`)).json(); days = j.daily.time.map((d, i) => ({ d, hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max[i], uv: j.daily.uv_index_max[i] })) }
    else { const y = s.getFullYear() - 1, a = t.start.replace(/^\d{4}/, y), b = t.end.replace(/^\d{4}/, y); const j = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${t.base.lat}&longitude=${t.base.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${a}&end_date=${b}&timezone=auto`)).json(); days = j.daily.time.map((d, i) => ({ d, hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_sum[i] > 1 ? 70 : 10 })) } } catch (e) { el.innerHTML = '<p class="muted">Weather needs internet.</p>'; return }
  const lo = Math.min(...days.map(x => x.lo)), hi = Math.max(...days.map(x => x.hi)), wet = days.filter(x => x.rain >= 50).length, uv = Math.max(...days.map(x => x.uv || 0));
  const items = [['👕 Breathable tops', hi >= 24], ['🧥 Light jacket / hoodie', lo < 20], ['🧣 Warm layer & scarf', lo < 14], ['☂️ Compact umbrella', wet > 0], ['🧥 Rain jacket', wet >= 3], ['👟 Comfy walking shoes (waterproof if possible)', true], ['🕶️ Sunglasses & SPF', uv >= 6 || hi >= 28], ['🩳 Shorts / light pants', hi >= 26], ['🧦 Extra socks', wet > 0], ['🔌 Power bank & Type-A/B adapter', true]].filter(x => x[1]);
  const ck = JSON.parse(localStorage.getItem('tw_wxpack') || '{}');
  el.innerHTML = `<p>${soon ? 'Forecast' : 'Typical weather (same dates last year)'}: <b>${Math.round(lo)}–${Math.round(hi)}°C</b>${wet ? ` · rain likely on ${wet} day${wet > 1 ? 's' : ''}` : ' · mostly dry'}</p>${items.map(([n], i) => `<label class="chk" style="display:flex;gap:8px;padding:3px 0"><input type="checkbox" ${ck[n] ? 'checked' : ''} onchange="const c=JSON.parse(localStorage.getItem('tw_wxpack')||'{}');c[${JSON.stringify(n).replace(/"/g, '&quot;')}]=this.checked;localStorage.setItem('tw_wxpack',JSON.stringify(c))"> ${n}</label>`).join('')}
   <details><summary class="muted">Day by day</summary>${days.map(x => `<div class="muted" style="font-size:13px">${x.d}: ${Math.round(x.lo)}–${Math.round(x.hi)}°C${x.rain >= 50 ? ' ☂️' : ''}</div>`).join('')}</details>` }

/* ---------- 5. Reminders (while the app is open; plus on-open catch-up) ---------- */
const REM = { timers: [] };
function remEnable() { if (!('Notification' in window)) return toast('Notifications not supported here'); Notification.requestPermission().then(p => { localStorage.setItem('tw_rem', p === 'granted' ? '1' : '0'); toast(p === 'granted' ? 'Reminders on 🔔' : 'Reminders blocked'); scheduleReminders(); renderTripTab() }) }
function remNotify(title, body) { toast(title); if (D.voice) speak(title); try { if (Notification.permission === 'granted') navigator.serviceWorker?.ready.then(r => r.showNotification(title, { body, icon: 'icon-192.png', tag: title })).catch(() => new Notification(title, { body })) } catch (e) { } }
function upcomingReminders() { const t = trip(); if (!t?.start) return []; const out = [], s = new Date(t.start + 'T00:00:00'), ft = typeof flightTime === 'function' ? flightTime(t.out) : null;
  if (ft) { const dep = new Date(s); dep.setHours(ft[0], ft[1]); out.push([+dep - 864e5, '✈️ Online check-in is open', t.out || '']); out.push([+dep - 3 * 864e5, '📱 Fill in eTravel & arrival card today', 'Both travellers']); out.push([+dep - 5 * 3600e3, '🧳 Time to leave for the airport soon', t.out || '']) }
  const d = tripDayIndex(); if (d >= 0 && d < DAYS.length && D.sched?.[d]) D.sched[d].forEach(([a], i) => { const [h, m] = a.split(':').map(Number), when = new Date(); when.setHours(h, m - 20, 0, 0); const x = D.routes[d][i]; x && out.push([+when, `⏰ Leave soon for ${x[0]}`, `Planned arrival ${a}`]) });
  return out.filter(r => r[0] > Date.now()).sort((a, b) => a[0] - b[0]) }
function scheduleReminders() { REM.timers.forEach(clearTimeout); REM.timers = []; if (localStorage.getItem('tw_rem') !== '1') return; upcomingReminders().filter(r => r[0] - Date.now() < 864e5 * 2).forEach(([at, ti, b]) => REM.timers.push(setTimeout(() => remNotify(ti, b), at - Date.now()))) }
setTimeout(scheduleReminders, 3000); setInterval(scheduleReminders, 30 * 60e3);

/* ---------- 6. Post-trip summary ---------- */
function tripSummaryCard(force) { const t = trip(); if (!t?.end) return ''; const ended = new Date(t.end + 'T23:59:59') < new Date(); if (!ended && !force) return '';
  const spent = (D.exps || []).reduce((s, e) => s + e.a * R(), 0), places = Object.values(D.routes || {}).flat().filter(x => !/airport|drop bags|check-?(in|out)/i.test(x[0])).length;
  let km = 0; Object.values(D.legs || {}).forEach(l => { if (l.mode === 'walk') km += l.km }); const days = DAYS.length, pics = '';
  return `<div class="card" style="border:2px solid #E7BD68"><h2>🎉 ${ended ? 'Trip recap' : 'Trip so far'} · ${esc(t.name || '')}</h2><div class="grid2" style="gap:8px">
   <div><div class="muted">Spent</div><b style="font-size:20px">${peso(spent)}</b><div class="muted">of ${peso(+D.total || 0)} budget ${spent <= (+D.total || 0) ? '✅' : '⚠️'}</div></div><div><div class="muted">Places</div><b style="font-size:20px">${places}</b><div class="muted">over ${days} days</div></div>
   <div><div class="muted">Walked (planned legs)</div><b style="font-size:20px">≈ ${km.toFixed(1)} km</b></div><div><div class="muted">Per day</div><b style="font-size:20px">${peso(spent / Math.max(1, days))}</b></div></div>
   <button class="act" style="margin-top:8px" onclick="memoriesPdf()">🎞️ Memories PDF</button></div>` }

/* ---------- Trip tab: add the new cards ---------- */
function renderTripTab() { const v = $('v-docs'); if (!v) return; ['walletCard', 'journalCard', 'wxPackCard', 'remCard', 'sumBtnCard'].forEach(id => document.getElementById(id)?.remove());
  const on = localStorage.getItem('tw_rem') === '1', up = upcomingReminders().slice(0, 4);
  v.insertAdjacentHTML('afterbegin', walletCard() + `<div class="card" id="remCard"><h2>🔔 Reminders</h2>${on ? '<p class="muted">On. You’ll get alerts while Akari Atlas is open (and a catch-up when you open it).</p>' : '<button class="act" onclick="remEnable()">Turn on reminders</button>'}${up.map(r => `<div class="muted" style="font-size:13px">• ${new Date(r[0]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${esc(r[1])}</div>`).join('')}</div>`
    + `<div class="card" id="wxPackCard"><h2>🌦️ Weather-smart packing</h2><div id="wxPack"></div></div>` + journalCard() + `<div class="card" id="sumBtnCard"><h2>📊 Trip summary</h2><div id="sumHere">${tripSummaryCard(true)}</div></div>`);
  renderWallet(); renderJournal(); weatherPacking(); emit('trip:render') }
document.addEventListener('click', e => { if (e.target.closest('[data-v="docs"]')) setTimeout(renderTripTab, 50) });

/* ---------- Join a shared trip by pasting the invite link or "CODE KEY" ---------- */
async function joinFromText(t) { t = String(t || '').trim(); let c, k, u;
  if (/^\d{4}$/.test(t.replace(/\s/g, ''))) { toast('Checking code…'); try { const j = await api({ action: 'claim', pin: t.replace(/\s/g, '') }); joinTrip(j.code, j.key); } catch (e) { toast(String(e)) } return }
  const m = t.match(/join=([^&\s]+)/); if (m) { try { [c, k, u] = JSON.parse(atob(decodeURIComponent(m[1]))) } catch (e) { } }
  if (!c) { const p = t.split(/[\s,·:|-]+/).filter(x => x && !/^(code|key|trip)$/i.test(x)); if (p.length >= 2) { c = p[0].toUpperCase(); k = p[1] } }
  if (!c || !k) return toast('Paste the whole invite link, or the code and key'); joinTrip(c, k, u); toast('Joining trip ' + c + '…'); setTimeout(() => { try { renderAll ? renderAll() : location.reload() } catch (e) { location.reload() } }, 2500) }
function shareCodeText() { return TRIP.code ? `Code: ${TRIP.code}  ·  Key: ${TRIP.key}` : '' }
document.addEventListener('click', e => { if (!e.target.closest('#setBtn')) return; setTimeout(() => { const b = document.getElementById('setBody'); if (!b || document.getElementById('joinCard')) return;
  b.insertAdjacentHTML('afterbegin', `<div class="card" id="joinCard"><h2>👫 Share or join a trip</h2>
   ${TRIP.code ? `<p>Your trip: <b>${esc(shareCodeText())}</b></p><div class="row" style="gap:6px;flex-wrap:wrap"><button class="act" onclick="showTripQR()">📱 Show QR code</button><button class="pill" onclick="shareTrip()">📤 Send invite link</button><button class="pill" onclick="navigator.clipboard.writeText(shareCodeText()).then(()=>toast('Code & key copied'))">📋 Copy code & key</button></div>`
     : `<p class="muted">Turn on shared sync to get a code your partner can join.</p><button class="act" onclick="showTripQR()">📱 Share with a QR code</button>`}
   <p class="muted" style="margin:12px 0 4px">Joining someone’s trip? Paste their invite link, or their code and key:</p>
   <div class="row" style="gap:6px"><input id="joinTxt" placeholder="4-digit code, or invite link" inputmode="text" style="flex:1"><button class="act" onclick="joinFromText(document.getElementById('joinTxt').value)">Join</button></div>
   <p class="muted" style="font-size:12px">Both of you can edit. Google Drive backup stays private to each person.</p></div>`) }, 120) });

/* ---------- one-tap sharing: QR code invite ---------- */
function loadQR() { return new Promise((res, rej) => { if (window.qrcode) return res(); const s = document.createElement('script'); s.src = 'qrcode.js'; s.onload = res; s.onerror = rej; setTimeout(rej, 6000); document.head.appendChild(s) }) }
async function showTripQR(mode) {
  if ((localStorage.getItem('ak_viewonly') === '1')) return toast('This is a view-only copy — ask the trip owner for an invite');
  mode = mode || window._qrMode || 'edit'; window._qrMode = mode;
  if (!TRIP.code) { toast('Setting up sharing…'); try { if (!document.getElementById('apiUrl')) document.body.insertAdjacentHTML('beforeend', '<input id="apiUrl" type="hidden" value="">'); await createTrip() } catch (e) { } if (!TRIP.code) return toast('Could not create a share code — check your connection') }
  if (mode === 'view' && !(await makeViewCode())) return toast('Could not make a view-only link — check your connection');
  const dev = mode === 'device', app = mode === 'app'; const url = app ? location.origin + location.pathname : inviteLink(mode === 'view' ? 'view' : 'edit'), view = mode === 'view'; let img = '';
  try { await loadQR(); const q = qrcode(0, 'M'); q.addData(url); q.make(); img = q.createSvgTag({ cellSize: 6, margin: 3, scalable: true }) } catch (e) { img = '<p class="muted">QR unavailable offline — use the link below.</p>' }
  const box = document.createElement('div'); box.id = 'qrSheet';
  box.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(15,30,40,.6);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  box.innerHTML = `<div class="card" style="max-width:380px;width:100%;text-align:center;margin:auto">
    <h2 style="justify-content:center">👫 Share “${esc(trip()?.name || 'our trip')}”</h2>
    <div class="l2seg" style="margin:0 auto 12px;flex-wrap:wrap;width:auto;justify-content:center"><button class="${mode === 'edit' ? 'on' : ''}" onclick="showTripQR('edit')">🧳 Companion</button><button class="${view ? 'on' : ''}" onclick="showTripQR('view')">👀 Friend</button><button class="${dev || app ? 'on' : ''}" onclick="showTripQR('device')">📲 My other device</button></div>
    <p style="margin:0 0 10px;font-size:14px">${view ? 'Sees your <b>day plan, stops, routes and phrases</b>. No bookings, PINs, money or journal, and they can’t change anything.' : dev ? 'Scan with your <b>own</b> phone, tablet or laptop to open Akari Atlas with this trip already on it. No typing the address.' : app ? 'Opens <b>just the app</b>, with no trip on it. Good for someone who wants to plan their own trip.' : 'For people travelling with you. Sees <b>everything</b>, including bookings, PINs and money, and you both edit the same trip.'}</p>
    ${dev || app ? `<p style="margin:0 0 8px;font-size:13px"><a href="#" onclick="showTripQR('${dev ? 'app' : 'device'}');return false">${dev ? 'Share only the app (no trip)' : '← Back to: this trip on my other device'}</a></p>` : ''}
    <div style="background:#fff;border-radius:16px;padding:12px;margin:0 auto 12px;max-width:260px">${img}</div>
    <p class="muted" style="margin:0 0 8px">Point their phone camera at this to open the trip.</p>
    <div style="margin:0 0 10px;${app ? 'display:none' : ''}"><div class="muted" style="font-size:13px">Or type this code in the app on the other device</div><div id="qrPin" style="font-size:40px;font-weight:700;letter-spacing:10px;margin:2px 0">····</div><div class="muted" id="qrPinT" style="font-size:12px">Works once, for 10 minutes</div></div>
    <p class="muted" style="font-size:12px;margin:0 0 12px">iPhone: after scanning, tap Share → Add to Home Screen from that page so the app keeps the trip.</p>
    <div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap"><button class="act" onclick="${app ? `navigator.share?navigator.share({title:'Akari Atlas',url:location.origin+location.pathname}):navigator.clipboard.writeText(location.origin+location.pathname).then(()=>toast('Link copied'))` : `shareTrip('${view ? 'view' : 'edit'}')`}">📤 Send link</button><button class="pill" onclick="navigator.clipboard.writeText(${app ? 'location.origin+location.pathname' : `inviteLink('${view ? 'view' : 'edit'}')`}).then(()=>toast('Link copied'))">📋 Copy link</button><button class="pill" onclick="document.getElementById('qrSheet').remove()">Close</button></div></div>`;
  box.onclick = e => { if (e.target === box) box.remove() }; if (!app) setTimeout(() => qrPin(view), 0); document.getElementById('qrSheet')?.remove(); document.body.appendChild(box) }

/* view-only: banner + no editing */
(function () { const st = document.createElement('style'); st.textContent = `body.viewOnly [data-v=money]{display:none}body.viewOnly #viewBan{display:block}#viewBan{display:none;position:sticky;top:0;z-index:50;background:#E7BD68;color:#28546B;text-align:center;padding:6px 10px;font-weight:600;font-size:14px}body.viewOnly .stopActs,body.viewOnly [onclick*="removeStop"],body.viewOnly [onclick*="addMiniTo"],body.viewOnly [onclick*="pin("]{display:none!important}`; document.head.appendChild(st);
  const b = document.createElement('div'); b.id = 'viewBan'; b.textContent = '👀 View-only trip — shared with you. Changes stay on this device.'; document.body.prepend(b) })();

async function qrPin(view) { const el = document.getElementById('qrPin'), tl = document.getElementById('qrPinT'); if (!el) return;
  try { const j = await api({ action: 'pair', code: view ? TRIP.vcode : TRIP.code, key: view ? TRIP.vkey : TRIP.key }); el.textContent = j.pin; const end = Date.now() + j.ttl * 1000;
    clearInterval(window._pinT); window._pinT = setInterval(() => { const s = Math.round((end - Date.now()) / 1000); if (!document.getElementById('qrPinT')) return clearInterval(window._pinT);
      if (s <= 0) { clearInterval(window._pinT); el.textContent = '····'; tl.innerHTML = 'Expired · <a href="#" onclick="qrPin(' + view + ');return false">new code</a>' } else tl.textContent = `Works once · expires in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }, 1000) }
  catch (e) { el.textContent = '—'; tl.textContent = /unknown action/.test(String(e)) ? 'Short codes are being switched on — use the QR or link for now' : 'Couldn’t get a code — use the QR or link' } }
