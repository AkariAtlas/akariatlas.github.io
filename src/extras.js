/* Akari Atlas · trip tools: offline pack, camera translate, budget alerts, sharing, departure mode, emergency card */
const EMERG = { tw: ['110', '119', '119', '0800-011-765 (tourist hotline)'], jp: ['110', '119', '119', '050-3816-2787 (JNTO)'], kr: ['112', '119', '119', '1330 (tourist)'], th: ['191', '1669', '199', '1155 (tourist police)'], vn: ['113', '115', '114', ''], sg: ['999', '995', '995', ''], my: ['999', '999', '994', ''], id: ['110', '118', '113', ''], hk: ['999', '999', '999', '2508 1234 (HKTB)'], cn: ['110', '120', '119', ''], ph: ['911', '911', '911', ''], us: ['911', '911', '911', ''] };
const PH_EMB = { tw: 'Manila Economic and Cultural Office (MECO), Taipei · +886 2 2658 8825', jp: 'Philippine Embassy Tokyo · +81 3 5562 1600', kr: 'Philippine Embassy Seoul · +82 2 796 7387', th: 'Philippine Embassy Bangkok · +66 2 259 0139', sg: 'Philippine Embassy Singapore · +65 6737 3977', hk: 'Philippine Consulate HK · +852 2823 8500' };
const xcc = () => { const t = trip() || {}, c = (t.cc || '').toLowerCase(); if (EMERG[c]) return c; const a = ((t.base || {}).addrEn || '') + ' ' + ((t.base || {}).addr || ''); return /Taiwan|台灣|臺灣|台北|臺北/.test(a) ? 'tw' : /Japan|日本/.test(a) ? 'jp' : /Korea/.test(a) ? 'kr' : c || 'tw' };

/* ---------- 6. Emergency card ---------- */
function openEmergency() { const t = trip() || {}, b = t.base || {}, e = EMERG[xcc()] || ['112', '112', '112', ''];
  $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">🆘 Emergency card</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <div style="background:#fff;color:#222;border-radius:16px;padding:16px;margin:10px 0;text-align:center"><div class="muted" style="color:#666">Please take me here · 請帶我到這裡</div>
  <div style="font-size:26px;font-weight:800;line-height:1.35;margin:8px 0">${esc(b.addr || b.addrEn || b.name || 'Set your stay in trip settings')}</div><div style="font-size:15px">${esc(b.name || '')}${b.addrEn && b.addr ? '<br>' + esc(b.addrEn) : ''}</div></div>
  <div class="grid2" style="gap:8px"><a class="act" style="text-align:center;padding:14px" href="tel:${e[0]}">👮 Police ${e[0]}</a><a class="act" style="text-align:center;padding:14px;background:#E98B73" href="tel:${e[1]}">🚑 Ambulance ${e[1]}</a></div>
  <p>🚒 Fire: <a href="tel:${e[2]}">${e[2]}</a>${e[3] ? `<br>ℹ️ ${esc(e[3])}` : ''}${PH_EMB[xcc()] && (t.home || 'PHP') === 'PHP' ? `<br>🇵🇭 ${esc(PH_EMB[xcc()])}` : ''}</p>
  <p class="muted">${esc(t.people || '')}${t.out ? ' · ✈️ ' + esc(t.out) : ''}${t.back ? ' · ↩️ ' + esc(t.back) : ''}</p>
  ${b.lat ? `<a class="map" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}">🗺️ Directions back to my stay</a>` : ''}
  <p class="muted" style="font-size:12px">Saved on your phone, works offline. Show the white box to a taxi driver.</p></div>` }

/* ---------- 1. Offline trip pack ---------- */
async function offlinePack() { const t = trip(); if (!t?.base) return toast('Set your stay first'); const st = $('offSt'); const lat = t.base.lat, lon = t.base.lon;
  const tiles = [], t2 = (z, la, lo) => [Math.floor((lo + 180) / 360 * 2 ** z), Math.floor((1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * 2 ** z)];
  const pts = [[lat, lon], ...Object.values(D.routes || {}).flat().map(x => [x[1], x[2]])];
  for (const [la, lo] of pts) for (const [z, r] of [[12, 2], [14, 2], [15, 2], [16, 1]]) { const [x, y] = t2(z, la, lo); for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) tiles.push(`https://tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`) }
  const uniq = [...new Set(tiles)].slice(0, 900); let n = 0; const c = await caches.open('tw-tiles');
  for (let i = 0; i < uniq.length; i += 6) { await Promise.all(uniq.slice(i, i + 6).map(async u => { try { if (!(await c.match(u))) { const r = await fetch(u); if (r.ok) await c.put(u, r) } } catch (e) { } n++ })); if (st) st.textContent = `⬇️ Saving maps… ${Math.round(n / uniq.length * 100)}%` }
  // phrases + talk log + weather are already kept on the phone; warm the translator for key phrases
  const key = ['Hello', 'Thank you', 'How much is this?', 'Where is the toilet?', 'Please take me to this address', 'I need help', 'No spicy please', 'Can I pay by card?'];
  if (window.translate) { D.offPhr = D.offPhr || {}; const lg = (window.TK && TK.them) || 'zh-TW'; for (const k of key) if (!D.offPhr[lg + k]) { const r = await translate(k, 'en-US', lg); if (r) D.offPhr[lg + k] = r } }
  D.offAt = Date.now(); save(); if (st) st.innerHTML = `✅ Offline pack ready · ${uniq.length} map tiles, itinerary, documents, emergency card and key phrases saved.`; toast('Offline pack saved') }
function offPhrases() { const lg = (window.TK && TK.them) || 'zh-TW'; return Object.entries(D.offPhr || {}).filter(([k]) => k.startsWith(lg)).map(([k, v]) => `<div class="row sp" style="padding:4px 0"><span>${esc(k.slice(lg.length))}</span><b style="font-size:17px">${esc(v)}</b></div>`).join('') }

/* ---------- 2. Camera translate (free OCR, runs on the phone) ---------- */
const OCR_LANG = { 'zh-TW': 'chi_tra', 'zh-CN': 'chi_sim', 'ja-JP': 'jpn', 'ko-KR': 'kor', 'th-TH': 'tha', 'vi-VN': 'vie' };
function openCamTr() { $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">📷 Translate a menu or sign</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <label class="act" style="display:block;text-align:center;padding:16px;margin:10px 0;cursor:pointer">📸 Take or choose a photo<input type="file" accept="image/*" capture="environment" style="display:none" onchange="camTr(this.files[0])"></label>
  <div id="camSt" class="muted"></div><img id="camImg" style="width:100%;border-radius:14px;display:none;margin:8px 0"><div id="camOut"></div>
  <p class="muted" style="font-size:12px">Reads the text on your phone (free), then translates it. First use downloads the reading model (~10 MB).</p></div>` }
async function camTr(f) { if (!f) return; const st = $('camSt'), img = $('camImg'); img.src = URL.createObjectURL(f); img.style.display = 'block';
  st.textContent = '⏳ Loading the reader…'; if (!window.Tesseract) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
  const lg = (window.TK && TK.them) || 'zh-TW', ol = OCR_LANG[lg] || 'eng';
  try { const { data } = await Tesseract.recognize(f, ol + (ol !== 'eng' ? '+eng' : ''), { logger: m => { if (m.status) st.textContent = `🔎 ${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}` } });
    const lines = data.text.split('\n').map(s => s.replace(/\s+/g, lg.startsWith('zh') || lg.startsWith('ja') ? '' : ' ').trim()).filter(s => s.length > 1).slice(0, 30);
    if (!lines.length) { st.textContent = 'No text found. Try a closer, sharper photo.'; return } st.textContent = '🔄 Translating…';
    const out = []; for (const l of lines) out.push([l, await translate(l, lg, 'en-US')]);
    $('camOut').innerHTML = out.map(([a, b]) => `<div style="padding:8px 0;border-bottom:1px dashed var(--line,#ccc)"><b>${esc(b || '—')}</b><div class="muted">${esc(a)}</div></div>`).join(''); st.textContent = `✅ ${out.length} lines translated` }
  catch (e) { st.textContent = 'Couldn’t read the photo (needs internet the first time).' } }

/* ---------- 3. Live budget alerts ---------- */
function dayBudget() { const n = Math.max(1, (window.DAYS || []).length); return (+D.total || 0) * 0.45 / n } // home currency
function spentToday() { const d = new Date().toLocaleDateString(); return (D.exps || []).filter(e => e.d === d).reduce((s, e) => s + e.a * R(), 0) }
on('expense:added', function budgetAlert() { const b = dayBudget(); if (!b) return; const s = spentToday(), k = 'tw_alert_' + new Date().toDateString();
  const lvl = s > b ? 2 : s > b * .8 ? 1 : 0; if (lvl > (+localStorage.getItem(k) || 0)) { localStorage.setItem(k, lvl); const msg = lvl === 2 ? `Heads up: today’s spending is over the daily share, ${peso(s)} of ${peso(b)}.` : `You’ve used 80% of today’s share: ${peso(s)} of ${peso(b)}.`; toast(msg); if (D.voice) speak(msg) } });
function budgetCard() { const b = dayBudget(); if (!b) return ''; const s = spentToday(), p = Math.min(100, s / b * 100);
  return `<div class="card"><h2>💰 Today’s spending</h2><div style="height:10px;border-radius:8px;background:var(--inbg);overflow:hidden"><div style="height:100%;width:${p}%;background:${p >= 100 ? '#E98B73' : p >= 80 ? '#E7BD68' : '#9CAF88'}"></div></div><p class="muted">${peso(s)} of ${peso(b)} daily share · ${peso(Math.max(0, b - s))} left today</p></div>` }

/* ---------- 4. Share trip with your companion ---------- */
async function shareTrip(mode) { if (!TRIP.code) return toast('Turn on sync in Docs → Sync & settings first'); const url = inviteLink(mode), text = mode === 'view' ? `Here's our trip plan for "${trip()?.name || 'trip'}" on Akari Atlas (view only).` : `Join our trip "${trip()?.name || 'trip'}" on Akari Atlas. Changes sync live.`;
  try { if (navigator.share) return await navigator.share({ title: 'Akari Atlas trip', text, url }) } catch (e) { return } try { await navigator.clipboard.writeText(url); toast('Invite link copied') } catch (e) { prompt('Copy this invite link', url) } }

/* ---------- 5. Departure-day mode ---------- */
function departCard() { const t = trip(); if (!t?.start) return ''; const s = new Date(t.start + 'T00:00:00'), now = new Date(), days = Math.round((s - new Date(now.toDateString())) / 864e5);
  if (days > 1 || days < 0) return ''; const tm = (t.out || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i); let leave = '';
  if (tm) { let h = +tm[1] % 12 + (/p/i.test(tm[3] || '') ? 12 : 0); const dep = new Date(s); dep.setHours(h, +tm[2]); const lv = new Date(+dep - 4 * 3600e3); leave = lv.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) }
  const ck = JSON.parse(localStorage.getItem('tw_depck') || '{}'); const items = ['Passports (both)', 'Printed e-tickets & stay booking', 'eTravel QR codes', 'Arrival card (TWAC) done', 'Proof of funds & work', 'Wallet, cards & cash', 'Phone, charger, power bank (carry-on)', 'eSIM installed', 'Offline pack saved'];
  return `<div class="card" style="border:2px solid #E7BD68"><h2>🧳 ${days === 1 ? 'Tomorrow you fly!' : 'Departure day'}</h2>${leave ? `<p><b>Leave home by ${leave}</b> <span class="muted">(about 4 h before take-off)</span></p>` : ''}<p class="muted">✈️ ${esc(t.out || '')}</p>
   ${items.map((x, i) => `<label class="chk" style="display:flex;gap:8px;padding:3px 0"><input type="checkbox" ${ck[i] ? 'checked' : ''} onchange="const c=JSON.parse(localStorage.getItem('tw_depck')||'{}');c[${i}]=this.checked;localStorage.setItem('tw_depck',JSON.stringify(c))"> ${x}</label>`).join('')}
   <p class="muted" style="font-size:13px">Check in online 24 h before with your airline, and choose seats if you haven’t.</p></div>` }

/* ---------- wire into the app ---------- */
function toolsCard() { return `<div class="card" id="toolsCard"><h2>🧰 Trip tools</h2><div style="display:flex;flex-wrap:wrap;gap:8px">
  <button class="act" onclick="offlinePack()">⬇️ Save offline pack</button><button class="pill" onclick="openCamTr()">📷 Camera translate</button><button class="pill" onclick="openTalk()">🗣️ Talk</button><button class="pill" onclick="openEmergency()">🆘 Emergency card</button><button class="pill" onclick="shareTrip()">👫 Share trip</button></div>
  <div id="offSt" class="muted" style="margin-top:8px">${D.offAt ? '✅ Offline pack saved ' + new Date(D.offAt).toLocaleDateString() : 'Save before you fly: maps around your stay & stops, phrases, documents.'}</div>
  ${offPhrases() ? `<details style="margin-top:8px"><summary>Key phrases (offline)</summary>${offPhrases()}</details>` : ''}</div>` }
on('today:render', function todayExtras() { const tc = $('todayCard'); if (!tc) return;
  document.querySelectorAll('.xtraT').forEach(x => x.remove()); const w = document.createElement('div'); w.className = 'xtraT'; w.innerHTML = departCard() + budgetCard() + toolsCard(); tc.after(w) }); try { window.renderToday() } catch (e) { }
