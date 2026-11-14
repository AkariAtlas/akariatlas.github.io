/* dnd: drag stops to reorder (mouse, touch and pen — hold the ⠿ handle and drag), and show real opening hours on each stop.
   Hours come from OpenStreetMap when the place has them; otherwise a typical range is shown and marked "typical". */
function dndRows() { return [...document.querySelectorAll('#v-plan [onclick^="editStop("]')].map(b => ({ i: +/editStop\((\d+)\)/.exec(b.getAttribute('onclick'))[1], row: b.closest('.row') })).filter(x => x.row) }
function moveStop(from, to) { const r = D.routes[curDay] || []; if (from === to || from < 0 || to < 0 || from >= r.length || to >= r.length) return; const ex = dayX(curDay), snap = JSON.stringify([r, ex]);
  const [s] = r.splice(from, 1), [e] = ex.splice(from, 1); r.splice(to, 0, s); ex.splice(to, 0, e); if (e) delete e.lock; setDayX(curDay, ex); D.manualStops = 1;
  afterEdit(autoTimeOn() ? `Moved ${s[0]} · times adjusted` : `Moved ${s[0]}`, () => { const [a, b] = JSON.parse(snap); D.routes[curDay] = a; setDayX(curDay, b); save(); renderPlan() }) }
function dndInit() { dndRows().forEach(({ i, row }) => { if (row.querySelector('.dndH')) return; row.style.position = 'relative';
  const h = document.createElement('button'); h.className = 'dndH'; h.title = 'Drag to reorder'; h.setAttribute('aria-label', 'Drag to reorder'); h.textContent = '⠿'; h.dataset.i = i; row.prepend(h);
  h.addEventListener('pointerdown', ev => { ev.preventDefault(); h.setPointerCapture(ev.pointerId); const rows = dndRows(), from = i; let to = i; row.classList.add('dndDrag'); document.body.classList.add('dndOn');
    const move = e => { let best = from, bd = 1e9; rows.forEach(({ i: j, row: rr }) => { const b = rr.getBoundingClientRect(), c = (b.top + b.bottom) / 2, d = Math.abs(e.clientY - c); if (d < bd) { bd = d; best = j } });
      to = best; rows.forEach(({ i: j, row: rr }) => rr.classList.toggle('dndOver', j === to && j !== from)); if (e.clientY < 80) scrollBy(0, -12); if (e.clientY > innerHeight - 80) scrollBy(0, 12) };
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); document.body.classList.remove('dndOn'); rows.forEach(({ row: rr }) => rr.classList.remove('dndOver', 'dndDrag')); if (to !== from) moveStop(from, to) };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up) }) }) }
/* ---------- opening hours ---------- */
const OH = { busy: false };
function ohFmt(s) { return String(s || '').replace(/;\s*/g, ' · ').replace(/Mo/g, 'Mon').replace(/Tu/g, 'Tue').replace(/We/g, 'Wed').replace(/Th/g, 'Thu').replace(/Fr/g, 'Fri').replace(/Sa/g, 'Sat').replace(/Su/g, 'Sun').replace(/PH/g, 'holidays') }
/* today's hours from an OSM opening_hours string, for the day of the trip, e.g. "Mo-Fr 10:00-21:00; Sa,Su 11:00-22:00" */
function ohForDate(s, date) { if (!s) return null; if (/24\/7/.test(s)) return '00:00-24:00'; const dn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()], idx = d => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].indexOf(d);
  let hit = null; for (const part of s.split(';')) { const p = part.trim(), m = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)?\s*(.*)$/.exec(p); if (!m) continue; const days = m[1], times = m[2];
    const on = !days || days.split(',').some(r => { const [a, b] = r.split('-'); return b ? (idx(a) <= idx(b) ? idx(dn) >= idx(a) && idx(dn) <= idx(b) : idx(dn) >= idx(a) || idx(dn) <= idx(b)) : a === dn });
    if (on) hit = /off|closed/i.test(times) ? 'closed' : (times.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/) || [hit])[0] } return hit }
async function ohLoad(day) { const r = D.routes[day] || []; if (!r.length || OH.busy) return; const ex = dayX(day), need = r.map((x, k) => [x, k]).filter(([x, k]) => !ex[k].ohSrc && x[1] != null && !/airport|hostel|hotel|check-?(in|out)|drop bags/i.test(x[0]));
  if (!need.length) return; OH.busy = true;
  const q = `[out:json][timeout:15];(${need.map(([x]) => `nwr["opening_hours"](around:120,${x[1]},${x[2]});`).join('')});out tags center 200;`;
  try { const res = await fetch(OVERPASS[0], { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout ? AbortSignal.timeout(16000) : undefined }); const els = (await res.json()).elements || [];
    const date = new Date(((trip() || {}).start || new Date().toISOString().slice(0, 10)) + 'T12:00:00'); date.setDate(date.getDate() + day);
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
    need.forEach(([x, k]) => { const nx = norm(x[0]); const el = els.map(e => ({ e, la: e.lat ?? e.center?.lat, lo: e.lon ?? e.center?.lon })).filter(o => o.la).map(o => ({ ...o, d: dist(x[1], x[2], o.la, o.lo), m: [o.e.tags.name, o.e.tags['name:en'], o.e.tags['name:zh']].some(n => n && (norm(n).includes(nx) || nx.includes(norm(n)))) }))
        .filter(o => o.m || o.d < 0.04).sort((a, b) => (b.m - a.m) || a.d - b.d)[0];
      if (el) { const raw = el.e.tags.opening_hours, today = ohForDate(raw, date); ex[k] = { ...ex[k], ohSrc: 'map', ohRaw: raw, ...(today && today !== 'closed' ? { hours: today } : {}), ...(today === 'closed' ? { warn: 'closed that day' } : {}) } }
      else { const o = openOf(x[0], ex[k]); ex[k] = { ...ex[k], ohSrc: o ? 'typical' : 'none' } } });
    setDayX(day, ex); save() } catch (e) { } finally { OH.busy = false } if (day === curDay) renderPlan() }
function ohBadges() { dndRows().forEach(({ i, row }) => { const e = (D.stopx || {})[curDay + ':' + i] || {}; if (row.querySelector('.ohB')) return; let txt = '';
  if (e.ohSrc === 'map') txt = e.warn === 'closed that day' ? '⛔ Closed that day' : `🕒 Open ${e.hours || ''}`.trim(); else if (e.hours || openOf(D.routes[curDay][i][0], e)) { const o = openOf(D.routes[curDay][i][0], e); txt = o ? `🕒 Usually ${itHm(o[0])}–${o[1] >= 1440 ? '24:00' : itHm(o[1])} (typical)` : '' }
  if (!txt) return; const b = row.querySelector('b'); b && b.insertAdjacentHTML('afterend', `<div class="ohB" title="${esc(e.ohRaw ? 'Weekly hours: ' + ohFmt(e.ohRaw) : 'Typical hours for this kind of place — check before you go')}">${esc(txt)}${e.ohRaw ? ` <span class="muted">· ${esc(ohFmt(e.ohRaw)).slice(0, 80)}</span>` : ''}</div>`) }) }
on('plan:render', () => { dndInit(); ohBadges(); ohLoad(curDay) });
(function () { const st = document.createElement('style'); st.textContent = `.dndH{border:0;background:none;color:inherit;opacity:.55;font-size:20px;cursor:grab;touch-action:none;padding:4px 6px;margin-right:2px;min-width:30px;min-height:36px}.dndH:active{cursor:grabbing}
.dndOn{user-select:none;-webkit-user-select:none}.dndDrag{opacity:.55}.dndOver{box-shadow:inset 0 3px 0 #E98B73}.ohB{font-size:13px;margin-top:2px;color:#9CAF88}`; document.head.appendChild(st) })();
