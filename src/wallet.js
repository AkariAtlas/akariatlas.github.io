/* Wallet: tickets (offline), saved places, cancel deadlines, leave-now reminder, book-a-tour links, 4-tab nav */
const WAL = () => (D.wallet = D.wallet || { tickets: [], saved: [] });
const wImgKey = id => 'tw_tkimg_' + id;
function wEsc(s) { return typeof esc === 'function' ? esc(s) : String(s || '') }

/* ---- nav: Today · Plan · Explore · Wallet (Docs moves to Wallet > More) ---- */
function walNav() { const nav = document.querySelector('nav'); if (!nav || nav.dataset.w) return; nav.dataset.w = 1;
  const b = k => nav.querySelector(`[data-v="${k}"]`), m = b('money'), d = b('docs'), p = b('plan'), e = b('explore');
  if (p && e) nav.insertBefore(p, e);
  if (m) { m.lastChild.nodeType === 3 ? (m.lastChild.textContent = 'Wallet') : m.append('Wallet'); const s = m.querySelector('span'); if (s) { s.innerHTML = '🎟️'; s.dataset.l2 = 1 } }
  if (d) d.style.display = 'none' }
on('today:render', walNav); setTimeout(walNav, 50);

/* ---- Wallet card at top of the Money view ---- */
function renderWallet() { const v = $('v-money'); if (!v) return; let c = $('walCard'); if (!c) { v.insertAdjacentHTML('afterbegin', '<div class="card" id="walCard"></div>'); c = $('walCard') }
  const W = WAL(), now = Date.now();
  const tk = W.tickets.map((t, i) => { const left = t.cancel ? (new Date(t.cancel) - now) / 36e5 : null;
    return `<div class="row" style="align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)"><button class="pill" style="flex:1;justify-content:flex-start;text-align:left" onclick="walOpen(${i})">🎟️ ${wEsc(t.name)}${t.day != null && DAYS[t.day] ? ` <span class="muted">· ${DAYS[t.day]}</span>` : ''}</button>${left != null ? `<span class="pill" style="font-size:12px;${left < 24 && left > 0 ? 'background:var(--warn)' : ''}">${left <= 0 ? 'Cancel window closed' : 'Free cancel: ' + new Date(t.cancel).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>` : ''}<button class="pill" aria-label="Delete ticket" onclick="walDel(${i})">🗑️</button></div>` }).join('');
  const sv = W.saved.map((p, i) => `<div class="row" style="align-items:center;gap:6px;padding:4px 0"><button class="pill" style="flex:1;justify-content:flex-start" onclick="walGo(${i})">♡ ${wEsc(p.name)}</button><button class="pill" onclick="walToDay(${i})">＋ Day ${curDay + 1}</button><button class="pill" aria-label="Remove" onclick="WAL().saved.splice(${i},1);save();renderWallet()">✕</button></div>`).join('');
  c.innerHTML = `<h2>🎟️ Wallet</h2>
   <h3 style="margin:6px 0">Tickets & bookings</h3>${tk || '<p class="muted">Snap or upload a ticket QR, voucher or PDF. It opens even with no signal.</p>'}
   <button class="act" style="width:100%;margin-top:8px" onclick="walAdd()">＋ Add ticket</button>
   <h3 style="margin:14px 0 6px">♡ Saved places</h3>${sv || '<p class="muted">Tap ♡ Save on any place in Explore to keep it here, then add it to a day.</p>'}
   <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap"><button class="pill" onclick="goTab('docs')">📋 Docs, packing & settings</button></div>` }
on('today:render', renderWallet); setTimeout(renderWallet, 300);

/* ---- add / view tickets ---- */
function walAdd(pre) { const opts = (D.routes ? Object.keys(DAYS) : []).map(i => `<option value="${i}">${DAYS[i]}</option>`).join('');
  openSheet(`<h2>＋ Add ticket</h2><label class="muted">Name<input id="wkN" value="${wEsc(pre || '')}" placeholder="Taipei 101 observatory"></label>
   <label class="muted">Day<select id="wkD"><option value="">—</option>${opts}</select></label>
   <label class="muted">Free cancellation until (optional)<input id="wkC" type="datetime-local"></label>
   <label class="muted">Booking link (optional)<input id="wkU" placeholder="https://"></label>
   <label class="muted">Photo / screenshot / PDF of the ticket<input id="wkF" type="file" accept="image/*,application/pdf"></label>
   <button class="act" style="width:100%;margin-top:10px" onclick="walSave()">Save ticket</button>`) }
async function walSave() { const n = $('wkN').value.trim() || 'Ticket', f = $('wkF').files[0], id = Date.now().toString(36);
  if (f) { try { const data = f.type === 'application/pdf' ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f) }) : await walShrink(f); localStorage.setItem(wImgKey(id), data) } catch (e) { toast('Ticket file too big for offline storage') } }
  WAL().tickets.push({ id, name: n, day: $('wkD').value === '' ? null : +$('wkD').value, cancel: $('wkC').value || null, url: $('wkU').value.trim() || null });
  save(); closeSheet(); renderWallet(); walTodayCard(); toast('Ticket saved 🎟️') }
function walShrink(f) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const s = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)) }; im.onerror = rej; im.src = URL.createObjectURL(f) }) }
function walOpen(i) { const t = WAL().tickets[i]; if (!t) return; const img = localStorage.getItem(wImgKey(t.id));
  openSheet(`<h2>🎟️ ${wEsc(t.name)}</h2>${img ? (img.startsWith('data:application/pdf') ? `<a class="act" href="${img}" download="${wEsc(t.name)}.pdf">Open PDF</a>` : `<img src="${img}" alt="Ticket" style="width:100%;border-radius:12px;background:#fff">`) : '<p class="muted">No file saved on this device. Tickets files stay on the phone that added them.</p>'}
   ${t.url ? `<a class="pill" target="_blank" rel="noopener" href="${wEsc(t.url)}" style="margin-top:8px">🔗 Booking page</a>` : ''}<p class="muted">Tip: turn screen brightness up when scanning.</p>`) }
function walDel(i) { const t = WAL().tickets[i]; if (!t || !confirmDel(t.name)) return; localStorage.removeItem(wImgKey(t.id)); WAL().tickets.splice(i, 1); save(); renderWallet() }
function confirmDel(n) { return window.confirm ? confirm('Delete ' + n + '?') : true }

/* ---- saved places ---- */
function walSaveP(p) { const W = WAL(); if (W.saved.some(x => x.name === p.name)) { toast('Already saved ♡'); return }
  W.saved.push({ name: p.name, lat: p.lat, lon: p.lon, sub: p.sub || '' }); save(); renderWallet(); toast('Saved to Wallet ♡') }
function walGo(i) { const p = WAL().saved[i]; if (!p) return; goTab('explore'); curPlace = p; $('q').value = p.name; try { showPlace() } catch (e) { } }
function walToDay(i) { const p = WAL().saved[i]; if (!p) return; (D.routes[curDay] = D.routes[curDay] || []).push([p.name, p.lat, p.lon, '']); save(); toast(`Added to ${DAYS[curDay] || 'day ' + (curDay + 1)}`); try { renderPlan() } catch (e) { } }

/* ---- place card: ♡ Save + Book a tour ---- */
on('place:show', p => setTimeout(() => walPlace(p), 450));
function walPlace(p) { const a = document.querySelector('#placeHead .l2act'); if (!p || !a || a.querySelector('[data-wsave]')) return;
  const q = encodeURIComponent(p.name), n = JSON.stringify(p).replace(/"/g, '&quot;');
  a.insertAdjacentHTML('beforeend', `<button class="pill" data-wsave onclick="walSaveP(${n})"><b>♡</b>Save</button><button class="pill" onclick="walTour('${q}')"><b>🎫</b>Book a tour</button>`) }
function walTour(q) { openSheet(`<h2>🎫 Tours & tickets</h2><p class="muted">Compare prices. Many offer free cancellation and reserve-now-pay-later.</p>
  ${[['GetYourGuide', 'https://www.getyourguide.com/s/?q='], ['Klook', 'https://www.klook.com/search/result/?query='], ['KKday', 'https://www.kkday.com/en/product/productlist?keyword=']].map(([n, u]) => `<a class="act" style="display:block;margin:6px 0;text-align:center" target="_blank" rel="noopener" href="${u}${q}">${n}</a>`).join('')}
  <button class="pill" style="width:100%;margin-top:6px" onclick="walAdd(decodeURIComponent('${q}'))">Booked it? ＋ Add ticket to Wallet</button>`) }

/* ---- Today: next stop + leave-by reminder + deadlines ---- */
let WAL_T = null;
async function walTodayCard() { const t = trip(), w = $('todayCard'); if (!t || !w) return; let c = $('walNext'); if (!c) { w.insertAdjacentHTML('afterend', '<div class="card" id="walNext" style="display:none"></div>'); c = $('walNext') }
  const di = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t.start + 'T00:00:00')) / 864e5), W = WAL(), now = Date.now(), parts = [];
  W.tickets.filter(k => k.cancel && new Date(k.cancel) - now > 0 && new Date(k.cancel) - now < 48 * 36e5).forEach(k => parts.push(`<div class="warn">⏳ Free cancellation for <b>${wEsc(k.name)}</b> ends ${new Date(k.cancel).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div>`));
  if (di >= 0 && di < DAYS.length && (D.routes[di] || []).length && typeof buildSched === 'function') { try {
    const s = await buildSched(di), r = D.routes[di], mNow = new Date().getHours() * 60 + new Date().getMinutes(), i = s.stops.findIndex(x => x.arr > mNow);
    if (i >= 0) { const st = s.stops[i], legM = st.leg ? st.leg.mins : 0, leave = st.arr - legM, inM = leave - mNow, hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, tk = W.tickets.findIndex(k => k.day === di && r[i][0].toLowerCase().includes(k.name.toLowerCase().split(' ')[0]));
      parts.unshift(`<div><b>Next: ${wEsc(r[i][0])}</b> · arrive ${hm(st.arr)}</div><div class="muted">${st.leg ? `${st.leg.mode === 'walk' ? '🚶' : '🚇'} ${legM} min · ` : ''}${inM > 0 ? `leave in ${inM} min (${hm(leave)})` : 'leave now'}</div>
       <div class="row" style="gap:6px;margin-top:6px"><button class="pill go" onclick="dirTo(${JSON.stringify(r[i][0]).replace(/"/g, '&quot;')},${r[i][1]},${r[i][2]},'r')">➜ Go</button>${tk >= 0 ? `<button class="pill" onclick="walOpen(${tk})">🎟️ Ticket</button>` : ''}</div>`);
      clearTimeout(WAL_T); const ms = (inM - 20) * 6e4; if (inM > 20 && ms < 6 * 36e5 && typeof remNotify === 'function') WAL_T = setTimeout(() => remNotify(`Leave in 20 min for ${r[i][0]}`, `Arrive ${hm(st.arr)}`), ms) } } catch (e) { } }
  c.innerHTML = parts.join(''); c.style.display = parts.length ? '' : 'none' }
on('today:render', () => setTimeout(walTodayCard, 200)); setInterval(() => { if (document.querySelector('#v-today.on')) walTodayCard() }, 6e4);
