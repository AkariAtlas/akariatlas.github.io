/* compare: "✨ Suggest itinerary" no longer overwrites your plan. It opens your day (left) beside a suggested day (right).
   Edit either side — move, remove, add from the suggestion — then keep yours, take the suggestion, or merge.
   Whatever you apply is re-timed for travel and opening hours. */
const CMP = { all: null, day: 0, L: {}, Rt: {} };
async function cmpSuggestAll() { if (CMP.all) return CMP.all;
  const keep = { routes: D.routes, stopx: D.stopx, notes: D.notes, autoPlanned: D.autoPlanned, manualStops: D.manualStops }, f = { save, renderPlan, toast }, rt = window.renderToday;
  D.routes = JSON.parse(JSON.stringify(D.routes || {})); D.stopx = JSON.parse(JSON.stringify(D.stopx || {})); D.notes = JSON.parse(JSON.stringify(D.notes || {}));
  save = () => { }; renderPlan = () => { }; toast = () => { }; window.renderToday = () => { };
  try { await autoPlanCore(true); CMP.all = { routes: D.routes, stopx: D.stopx, notes: D.notes } } catch (e) { CMP.all = { routes: {}, stopx: {}, notes: {} } }
  finally { save = f.save; renderPlan = f.renderPlan; toast = f.toast; window.renderToday = rt; Object.assign(D, keep) } return CMP.all }
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
