/* compare: "✨ Suggest itinerary" no longer overwrites your plan. It opens your day (left) beside a suggested day (right).
   Edit either side — move, remove, add from the suggestion — then keep yours, take the suggestion, or merge.
   Whatever you apply is re-timed for travel and opening hours. */
const CMP = { all: null, day: 0, L: {}, Rt: {} };
async function cmpSuggestAll() { if (CMP.all) return CMP.all;
  /* plan on a private copy of the trip so the real plan is never touched; hold syncing until done */
  const real = D, f = { save, renderPlan, toast }, rt = window.renderToday, held = typeof SYNC !== 'undefined' && !SYNC.busy; if (held) SYNC.busy = true;
  D = JSON.parse(JSON.stringify(real)); save = () => { }; renderPlan = () => { }; toast = () => { }; window.renderToday = () => { };
  try { await autoPlanCore(true); CMP.all = { routes: D.routes, stopx: D.stopx, notes: D.notes } } catch (e) { CMP.all = { routes: {}, stopx: {}, notes: {} } }
  finally { D = real; save = f.save; renderPlan = f.renderPlan; toast = f.toast; window.renderToday = rt; if (held) { SYNC.busy = false; setTimeout(() => { try { syncNow(true) } catch (e) { } }, 500) } } return CMP.all }
const cmpRow = (x, i, side) => `<div class="cmpRow"><span class="cmpN">${i + 1}</span><span class="cmpT">${esc(x.t || '')}</span><span class="cmpName">${esc(x.r[0])}</span>
  <span class="cmpB">${side === 'R' ? `<button title="Add to my plan" onclick="cmpAdd(${i})">←</button>` : ''}<button title="Up" onclick="cmpMv('${side}',${i},-1)">↑</button><button title="Down" onclick="cmpMv('${side}',${i},1)">↓</button><button title="Remove" onclick="cmpRm('${side}',${i})">✕</button></span></div>`;
function cmpLoad(d) { CMP.day = d; const ex = k => (D.stopx || {})[d + ':' + k] || {}, sx = k => (CMP.all.stopx || {})[d + ':' + k] || {};
  if (!CMP.L[d]) CMP.L[d] = (D.routes[d] || []).map((r, k) => ({ r, x: ex(k), t: ex(k).time || '' }));
  if (!CMP.Rt[d]) CMP.Rt[d] = (CMP.all.routes[d] || []).map((r, k) => ({ r, x: sx(k), t: sx(k).time || '' })) }
function cmpDraw() { const d = CMP.day, L = CMP.L[d], R = CMP.Rt[d], el = $('cmpBody'); if (!el) return;
  el.innerHTML = `<div class="cmpDays">${DAYS.map((x, i) => `<button class="pill ${i === d ? 'on' : ''}" onclick="cmpLoad(${i});cmpDraw()">${esc(x)}</button>`).join('')}</div>
   <div class="cmpGrid"><div class="cmpCol"><h3>📝 Your plan</h3>${L.length ? L.map((x, i) => cmpRow(x, i, 'L')).join('') : '<p class="muted">Nothing planned yet.</p>'}</div>
   <div class="cmpCol sug"><h3>✨ Suggested</h3>${(CMP.all.notes || {})[d] ? `<p class="muted" style="font-size:12px;margin:0 0 6px">${esc(CMP.all.notes[d])}</p>` : ''}${R.length ? R.map((x, i) => cmpRow(x, i, 'R')).join('') : '<p class="muted">No suggestion for this day.</p>'}</div></div>
   <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:12px"><button class="act" onclick="cmpApply('L')">✅ Use my plan</button><button class="pill" onclick="cmpApply('R')">Use suggested</button><button class="pill" onclick="cmpApply('M')">Mine + suggested extras</button></div>
   <p class="muted" style="font-size:12px;margin-top:8px">Whatever you choose is re-arranged and re-timed for travel time and opening hours. Times you set yourself 🔒 stay.</p>
   <details style="margin-top:6px"><summary class="muted" style="cursor:pointer;font-size:13px">Whole trip</summary><button class="pill" style="margin-top:6px" onclick="cmpAllDays()">Use suggestions for every day</button></details>` }
function cmpMv(s, i, dir) { const A = (s === 'L' ? CMP.L : CMP.Rt)[CMP.day], j = i + dir; if (j < 0 || j >= A.length) return; [A[i], A[j]] = [A[j], A[i]]; A.forEach(x => { if (!x.x.lock) x.t = '' }); cmpDraw() }
function cmpRm(s, i) { (s === 'L' ? CMP.L : CMP.Rt)[CMP.day].splice(i, 1); cmpDraw() }
function cmpAdd(i) { const x = CMP.Rt[CMP.day][i], L = CMP.L[CMP.day]; if (!L.some(y => y.r[0] === x.r[0])) L.push({ r: x.r.slice(), x: { note: x.x.note || '' }, t: '' }); cmpDraw() }
async function cmpApply(which) { const d = CMP.day, L = CMP.L[d], R = CMP.Rt[d];
  const list = which === 'L' ? L : which === 'R' ? R : [...L, ...R.filter(x => !L.some(y => y.r[0].toLowerCase() === x.r[0].toLowerCase()))];
  D.routes[d] = list.map(x => x.r.slice()); setDayX(d, list.map(x => ({ ...x.x }))); D.manualStops = 1; if (which !== 'L') { D.notes = D.notes || {}; if ((CMP.all.notes || {})[d]) D.notes = D.notes || {}; D.notes[d] = CMP.all.notes[d] }
  $('cmpBody').insertAdjacentHTML('afterbegin', '<p class="muted">Arranging for travel & opening hours…</p>');
  if (which !== 'L') smartOrder(d); await retimeDay(d); save(); curDay = d; renderPlan(); CMP.L[d] = null; CMP.Rt[d] = null; cmpLoad(d); cmpDraw(); toast(`${DAYS[d]} updated ✓`) }
async function cmpAllDays() { for (const d of Object.keys(CMP.all.routes)) { D.routes[d] = CMP.all.routes[d]; Object.keys(D.stopx || {}).filter(k => k.startsWith(d + ':')).forEach(k => delete D.stopx[k]); (CMP.all.routes[d] || []).forEach((_, k) => { const e = CMP.all.stopx[d + ':' + k]; if (e) D.stopx[d + ':' + k] = e }); D.notes = D.notes || {}; D.notes[d] = CMP.all.notes[d] }
  D.autoPlanned = Date.now(); save(); renderPlan(); closeSheet(); toast('Whole trip planned ✨') }
async function openCompare() { $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn cmpSheet"><div class="row sp"><h3 style="margin:0">✨ Suggest itinerary</h3><button class="pill" onclick="closeSheet()">✕</button></div><div id="cmpBody"><p class="muted">Building a suggestion from your budget, dates, stay and likes…</p></div></div>`;
  CMP.all = null; CMP.L = {}; CMP.Rt = {}; await cmpSuggestAll(); cmpLoad(typeof curDay === 'number' ? curDay : 0); cmpDraw() }
(function () { const st = document.createElement('style'); st.textContent = `.cmpSheet{max-width:980px!important;width:100%;max-height:92vh;overflow:auto}.cmpDays{display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px}.cmpDays .pill{flex:0 0 auto;min-height:32px}
.cmpGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:640px){.cmpGrid{grid-template-columns:1fr}}.cmpCol{background:var(--inbg,rgba(145,203,224,.12));border-radius:14px;padding:10px}.cmpCol.sug{outline:2px dashed rgba(233,139,115,.5)}.cmpCol h3{margin:0 0 8px;font-size:15px}
.cmpRow{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px dashed rgba(40,84,107,.15);font-size:14px}.cmpN{width:18px;color:#9CAF88;font-weight:700}.cmpT{width:44px;font-variant-numeric:tabular-nums;color:#E98B73;font-size:12px}.cmpName{flex:1;min-width:0;overflow-wrap:anywhere}
.cmpB{display:flex;gap:2px}.cmpB button{border:0;background:rgba(40,84,107,.08);border-radius:8px;min-width:28px;height:28px;cursor:pointer;color:inherit}`; document.head.appendChild(st) })();
/* ---------- "What do you like?" — build the suggested side from your interests ---------- */
const CMP_LIKES = {
  cafe: ['☕ Cafés', ['cafe', 'coffee', 'dessert cafe'], 45],
  hobby: ['🤖 Gundam & collectibles', ['Gundam Base', 'Animate', 'anime shop', 'toy store', 'figure shop', 'Taipei Underground Market'], 75],
  clothes: ['👕 Cheap clothing', ['Wufenpu garment', 'clothing market', 'GU', 'Uniqlo', 'clothing store'], 75],
  novelty: ['🧸 Cheap novelty finds', ['Daiso', 'Don Don Donki', 'Miniso', 'night market', 'souvenir'], 60],
  view: ['🌄 Views & scenery', ['viewpoint', 'Elephant Mountain', 'riverside park', 'observation'], 75],
  gondola: ['🚡 Gondola rides', ['Maokong Gondola', 'gondola'], 120],
  free: ['🌳 Free parks & sights', ['park', 'garden', 'memorial hall', 'temple', 'old street'], 60],
  food: ['🍜 Local food', ['night market', 'noodle', 'dumpling', 'beef noodle'], 60] };
const CMP_MATCH = { cafe: /caf|coffee|tea|dessert|bakery/i, hobby: /gundam|animate|anime|toy|figure|hobby|collect|underground market|game|comic|manga|bandai|card/i, clothes: /\bGU\b|uniqlo|h&m|zara|wufenpu|garment|cloth|apparel|fashion|wear|outlet/i,
  novelty: /daiso|donki|don don|miniso|night market|souvenir|3coins|variety|market/i, view: /view|observ|mountain|peak|riverside|101|deck|hill/i, gondola: /gondola/i, free: /park|garden|hall|temple|street|memorial|square|plaza|wharf|museum/i, food: /night market|noodle|dumpling|food|restaurant|eatery|market/i };
const CMP_PICK = { likes: JSON.parse(localStorage.getItem('ak_cmp_likes') || '[]'), pwd: localStorage.getItem('ak_cmp_pwd') === '1' };
const PWD_AVOID = /mountain|hik|trail|peak|stairs|jiufen|old street|cliff|waterfall/i, PWD_DISC = /museum|memorial|gallery|gondola|zoo|aquarium|palace|observatory|101/i;
function cmpLikesBar() { return `<div class="cmpLikes"><div class="muted" style="font-size:13px;margin-bottom:6px">What do you like? Suggestions follow your picks.</div><div class="row" style="flex-wrap:wrap;gap:6px">
  ${Object.entries(CMP_LIKES).map(([k, v]) => `<button class="pill ${CMP_PICK.likes.includes(k) ? 'on' : ''}" onclick="cmpLike('${k}')">${v[0]}</button>`).join('')}
  <button class="pill ${CMP_PICK.pwd ? 'on' : ''}" onclick="CMP_PICK.pwd=!CMP_PICK.pwd;localStorage.setItem('ak_cmp_pwd',CMP_PICK.pwd?'1':'0');cmpRebuild()">♿ PWD-friendly</button></div></div>` }
function cmpLike(k) { const i = CMP_PICK.likes.indexOf(k); i >= 0 ? CMP_PICK.likes.splice(i, 1) : CMP_PICK.likes.push(k); localStorage.setItem('ak_cmp_likes', JSON.stringify(CMP_PICK.likes)); cmpRebuild() }
async function cmpByLikes() { const t = trip(), b = t.base, used = new Set(Object.values(D.routes || {}).flat().map(r => (r[0] || '').toLowerCase())), pool = {};
  let fam = []; try { fam = await famousNear(b.lat, b.lon) } catch (e) { }
  await Promise.all(CMP_PICK.likes.map(async k => { const [, qs] = CMP_LIKES[k]; let arr = [];
    if (k === 'view') arr = fam.filter(p => /viewpoint|peak/.test(p.kind)); if (k === 'free') arr = fam.filter(p => /park|garden|temple|historic|street/.test(p.kind));
    const rs = await Promise.all(qs.map(q => photonQ(q + ' ' + (b.city || ''), b.lat, b.lon, 6).catch(() => []))); rs.forEach(r => arr.push(...r.filter(p => !/hotel|hostel|entrance|wholesale|supply|tunnel|theatre|theater/i.test(p.name) && CMP_MATCH[k].test(p.name + ' ' + (p.kind || '')))));
    const seen = new Set(); pool[k] = arr.filter(p => p.name && dist(b.lat, b.lon, p.lat, p.lon) < 20 && !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase()) && !(CMP_PICK.pwd && PWD_AVOID.test(p.name + ' ' + (p.kind || '')))) }));
  const days = {}, notes = {}, stopx = {}, slots = ['09:30', '11:30', '14:00', '16:30', '19:00'];
  DAYS.forEach((_, d) => { const first = d === 0, last = d === DAYS.length - 1; if (first || last) { days[d] = (CMP.all.routes[d] || []).slice(); (days[d] || []).forEach((_, i) => stopx[d + ':' + i] = (CMP.all.stopx || {})[d + ':' + i] || {}); notes[d] = (CMP.all.notes || {})[d] || ''; return }
    const keys = CMP_PICK.likes.slice(); const out = []; let anchor = null;
    for (let s = 0; s < 5 && keys.length; s++) { const k = keys[(s + d) % keys.length], L = pool[k] || []; L.sort((a, c) => dist((anchor || b).lat, (anchor || b).lon, a.lat, a.lon) - dist((anchor || b).lat, (anchor || b).lon, c.lat, c.lon));
      const p = L.find(p => !used.has(p.name.toLowerCase()) && !(/gondola/i.test(p.name) && used.has('#gondola'))); if (!p) continue; used.add(p.name.toLowerCase()); if (/gondola/i.test(p.name)) used.add('#gondola'); if (!anchor) anchor = p; out.push([p.name, p.lat, p.lon, '']);
      stopx[d + ':' + (out.length - 1)] = { time: slots[out.length - 1], note: CMP_LIKES[k][0] + (CMP_PICK.pwd && PWD_DISC.test(p.name) ? ' · ♿ ask for the disability discount (bring your PWD ID)' : '') } }
    days[d] = out; notes[d] = '✨ ' + CMP_PICK.likes.map(k => CMP_LIKES[k][0]).join(' · ') + (CMP_PICK.pwd ? ' · ♿ step-free picks' : '') });
  return { routes: days, stopx, notes } }
async function cmpRebuild() { const el = $('cmpBody'); if (el) el.insertAdjacentHTML('afterbegin', '<p class="muted" id="cmpBusy">Finding places you’ll like…</p>');
  if (!CMP.base) CMP.base = CMP.all; CMP.all = CMP_PICK.likes.length ? await cmpByLikes() : CMP.base; CMP.Rt = {}; cmpLoad(CMP.day); cmpDraw() }
(function () { const d0 = cmpDraw; cmpDraw = function () { d0(); const g = document.querySelector('#cmpBody .cmpGrid'); if (g && !document.querySelector('.cmpLikes')) g.insertAdjacentHTML('beforebegin', cmpLikesBar());
  if (CMP_PICK.pwd) document.querySelectorAll('#cmpBody .cmpCol.sug .cmpName').forEach(n => { if (PWD_DISC.test(n.textContent) && !n.dataset.p) { n.dataset.p = 1; n.insertAdjacentHTML('beforeend', ' <span title="Disability discount often available">♿</span>') } }) };
  const o0 = openCompare; openCompare = async function () { CMP.base = null; await o0.apply(this, arguments); if (CMP_PICK.likes.length) await cmpRebuild() } })();
(function () { const st = document.createElement('style'); st.textContent = '.cmpLikes{background:rgba(231,189,104,.15);border-radius:14px;padding:10px;margin:0 0 12px}.cmpLikes .pill{min-height:34px}'; document.head.appendChild(st) })();
