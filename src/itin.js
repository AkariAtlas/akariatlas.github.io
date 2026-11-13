/* itin: import an itinerary from a photo, PDF, CSV, Word file or plain text.
   Reads it → finds days, times and places → shows what changes against the current plan →
   offers a refined version: route ordered to cut travel, realistic times (opening-hour sense, meals,
   night markets after dark), pace you choose, and a few extra picks matched to what you like. */
const IT_LIKES = { food: ['🍜 Food', 'amenity~"restaurant|cafe"'], shop: ['🛍️ Shopping', 'shop~"mall|department_store|clothes"'], nature: ['🌿 Nature', 'leisure="park"'],
  culture: ['🏛️ Culture', 'tourism~"museum|gallery"'], night: ['🏮 Night markets', 'amenity="marketplace"'], hobby: ['🎮 Anime & hobby', 'shop~"anime|games|toys|collector"'], view: ['🌄 Views', 'tourism="viewpoint"'] };
const IT = { likes: JSON.parse(localStorage.getItem('ak_likes') || '["food","culture"]'), pace: localStorage.getItem('ak_pace') || 'normal', items: null, plan: null };
async function docxText(f) { if (!window.JSZip) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
  const z = await JSZip.loadAsync(await f.arrayBuffer()), x = await z.file('word/document.xml').async('string');
  return x.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') }
async function itinImageText(f, onp) {
  if (!window.Tesseract) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
  const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = URL.createObjectURL(f) });
  const sc = Math.min(3, Math.max(1, 2200 / img.width)), c = document.createElement('canvas'); c.width = img.width * sc; c.height = img.height * sc; const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) { let g = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; g = g < 150 ? Math.max(0, g * 0.6) : Math.min(255, g * 1.15); p[i] = p[i + 1] = p[i + 2] = g } x.putImageData(d, 0, 0);
  const { data } = await Tesseract.recognize(c, 'eng', { logger: m => onp && m.progress && onp(Math.round(m.progress * 100)) });
  /* keep only lines the reader is confident about and that look like words — drops noise from photos and stickers */
  const good = (data.lines || []).filter(l => { const t = l.text.trim(), letters = (t.match(/[A-Za-z]/g) || []).length, words = (t.match(/[A-Za-z]{3,}/g) || []).length; return l.confidence >= 55 && t.length >= 4 && letters / t.length >= 0.55 && words >= 1 })
    .map(l => l.text.trim().replace(/^[^A-Za-z0-9(]+/, '').replace(/\s+[^A-Za-z0-9)]{1,3}$/, ''));
  /* join wrapped lines: a line starting lowercase or "(" continues the previous one */
  const out = []; for (const t of good) { if (out.length && /^[a-z(]/.test(t)) out[out.length - 1] += ' ' + t; else out.push(t) } return out.join('\n') }
async function itinFileText(f, onp) { const n = (f.name || '').toLowerCase(); if (/^image\//.test(f.type)) return itinImageText(f, onp);
  if (n.endsWith('.docx')) return docxText(f);
  if (n.endsWith('.doc')) { const b = new Uint8Array(await f.arrayBuffer()); let s = '', run = ''; for (const c of b) { if (c >= 32 && c < 127 || c === 10 || c === 13) run += String.fromCharCode(c); else { if (run.length > 3) s += run + '\n'; run = '' } } return s }
  return fileText(f) }
/* ---------- parse text → [{day, time, name}] ---------- */
const IT_WD = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i, IT_MON = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
function dayIndexFromHeader(l) { let m = l.match(/\bday\s*(\d{1,2})\b/i) || l.match(/^d(\d{1,2})\b/i); if (m) return +m[1] - 1;
  const t = (typeof trip === 'function' && trip()) || {}; if (!t.start) return null; const s = new Date(t.start + 'T00:00:00');
  m = l.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/) || null; let d = null;
  if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (!d && (m = l.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i))) d = new Date(s.getFullYear(), IT_MON.indexOf(m[1].toLowerCase().slice(0, 3)), +m[2]);
  if (!d && (m = l.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i))) d = new Date(s.getFullYear(), IT_MON.indexOf(m[2].toLowerCase().slice(0, 3)), +m[1]);
  if (!d && (m = l.match(/^(\d{1,2})[\/.](\d{1,2})\b/))) { let a = +m[1], b2 = +m[2]; const dm = new Date(s.getFullYear(), b2 - 1, a), md = new Date(s.getFullYear(), a - 1, b2); d = a > 12 ? dm : b2 > 12 ? md : (Math.abs(md - s) <= Math.abs(dm - s) ? md : dm) }
  if (!d) return null; const i = Math.round((d - s) / 864e5); return i >= 0 && i < 40 ? i : null }
function parseTime(l) { let m = l.match(/\b(\d{1,2})[:.h](\d{2})\s*(am|pm)?\b/i), h, mi = 0, ap = '';
  if (m) { h = +m[1]; mi = +m[2]; ap = (m[3] || '').toLowerCase() } else if ((m = l.match(/\b(\d{1,2})\s*(am|pm)\b/i))) { h = +m[1]; ap = m[2].toLowerCase() } else return null;
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; if (h > 23 || mi > 59) return null; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') }
function cleanName(l) { return l.replace(/\b(\d{1,2})[:.h](\d{2})\s*(am|pm)?\b|\b\d{1,2}\s*(am|pm)\b/ig, '').replace(/^\s*[-*•·▪◦\d.)\]]+\s*/, '').replace(/^\s*[-–—:|,]\s*|\s*[-–—:|,]\s*$/g, '')
  .replace(/^(visit|go to|explore|see|eat at|(early |late )?(lunch|dinner|breakfast|brunch|snacks?|coffee|dessert) (at|in)|shopping (at|in)|then|after that)\s+/i, '').replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim() }
function parseItin(text) { IT.firstSlotAt = null; const out = []; let day = null, auto = 0; const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const csv = lines.length > 1 && lines[0].split(',').length >= 2 && /day|date|place|time|activity|location/i.test(lines[0]);
  if (csv) { const H = lines[0].split(',').map(h => h.trim().toLowerCase()), ci = k => H.findIndex(h => k.test(h));
    const cd = ci(/day|date/), ct = ci(/time|start/), cp = ci(/place|location|activity|what|name|spot/), cn = ci(/note|detail/);
    for (const row of lines.slice(1)) { const c = row.split(',').map(x => x.trim().replace(/^"|"$/g, '')); const nm = cleanName(c[cp >= 0 ? cp : c.length - 1] || ''); if (!nm) continue;
      const di = cd >= 0 ? (dayIndexFromHeader(c[cd]) ?? (/^\d+$/.test(c[cd]) ? +c[cd] - 1 : null)) : null; out.push({ day: di, time: ct >= 0 ? parseTime(c[ct]) || c[ct] || '' : '', name: nm, note: cn >= 0 ? c[cn] || '' : '' }) } return out }
  let slot = '';
  for (const l0 of lines) { const l = l0.replace(/\s*\((?![^)]*\d{1,2}(:\d{2})?\s*(am|pm))[^)]*\)/gi, '').trim(); if (!l) continue;
    if (/\b(\d+\s*day\s+)?itinerary\b|\bgetaway\b|have a (great|nice|good)|bon voyage|enjoy your/i.test(l) && !/^day\s*\d/i.test(l)) continue;
    const per = l.match(/^(early morning|morning(\s*\+\s*noon)?|noon|midday|afternoon|late afternoon(\s*to\s*evening)?|evening|night|late night)\b/i);
    if (per) { if (IT.firstSlotAt == null) IT.firstSlotAt = out.filter(x => !x.time).length === out.length ? out.length : 0; slot = parseTime(l) || { 'early morning': '07:00', morning: '09:00', noon: '12:00', midday: '12:00', afternoon: '13:00', 'late afternoon': '15:00', evening: '18:00', night: '19:00', 'late night': '21:00' }[per[1].toLowerCase().split(/\s*\+|\s+to/)[0]] || ''; continue }
    if (/^(travel|transfer|take|ride|go back|return|head)\b.*\b(to|via|by)\b/i.test(l)) continue;
    const di = dayIndexFromHeader(l); const startsDate = /^(day\s*\d{1,2}|d\d{1,2}\b|\d{4}-\d{1,2}-\d{1,2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d{1,2}[\/.]\d{1,2}\b|(mon|tue|wed|thu|fri|sat|sun)[a-z]*)/i.test(l); const isHeader = di != null && (startsDate || l.length < 40);
    if (isHeader) { day = di; const rest = cleanName(l.replace(/^\s*((mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s*)?(day\s*\d{1,2}|d\d{1,2}|\d{4}-\d{1,2}-\d{1,2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}[\/.]\d{1,2})\b[:\-–—.,\s]*/i, '')); if (rest && rest.length > 2 && !/^(arrival|departure|itinerary|free day|rest day)$/i.test(rest)) rest.split(/\s+(?:→|->|>|then)\s+|\s*[;,]\s*/).map(cleanName).filter(p => p.length >= 3).forEach(p => out.push({ day, time: parseTime(l) || '', name: p })); continue }
    if (/^(itinerary|trip|budget|total|notes?|hotel|flight|tips?)\s*[:\-]?$/i.test(l) || l.length > 120) continue;
    const nm = cleanName(l); if (!nm || nm.length < 3 || /^\d+$/.test(nm) || /^(check[ -]?(in|out)|hotel|hostel|airport|flight|rest|sleep|free time)\b/i.test(nm)) continue;
    nm.split(/\s+(?:→|->|>|then)\s+|\s*;\s*/).forEach(part => { const p = cleanName(part); if (p.length >= 3) { out.push({ day, time: parseTime(l) || slot || '', name: p }); slot = '' } }) }
  if (out.length && out.every(x => x.day == null)) { IT.noDays = true; if (out.length <= 10) out.forEach(x => x.day = IT.oneDay ?? (typeof curDay === 'number' ? curDay : 0)); else { const per = IT.pace === 'relaxed' ? 3 : IT.pace === 'packed' ? 5 : 4; out.forEach((x, i) => x.day = Math.min(DAYS.length - 1, Math.floor(i / per) + (DAYS.length > 2 ? 1 : 0))) } } else IT.noDays = false
  if (IT.firstSlotAt != null) out.splice(0, IT.firstSlotAt);
  let last = 0; out.forEach(x => { if (x.day == null) x.day = last; last = x.day; x.day = Math.max(0, Math.min(Math.max(DAYS.length - 1, 0), x.day)) }); return out.slice(0, 80) }
/* ---------- geocode ---------- */
async function itinGeo(name) { const t = (typeof trip === 'function' && trip()) || {}, cc = (t.cc || (t.base && t.base.cc) || '').toLowerCase();
  let b = (typeof HOSTEL !== 'undefined' && HOSTEL) || null; if (t.base && t.base.cc && cc && t.base.cc !== cc) b = IT.bias || null; /* stay pinned in the wrong country → don't bias to it */
  const country = cc ? (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc.toUpperCase()) } catch (e) { return '' } })() : '';
  const k = 'geo_' + cc + '_' + name.toLowerCase(); try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c) return c } catch (e) { }
  let r = null; try { const q = name + (country && !name.toLowerCase().includes(country.toLowerCase()) ? ', ' + country : '');
    const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}${b ? `&lat=${b[0]}&lon=${b[1]}` : ''}&limit=5&lang=en`)).json();
    let fs = (j.features || []).filter(f => !cc || (f.properties.countrycode || '').toLowerCase() === cc).map(f => ({ name: f.properties.name || name, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], kind: (f.properties.osm_value || '') + ' ' + (f.properties.osm_key || '') }));
    if (b) fs.sort((x, y) => dist(b[0], b[1], x.lat, x.lon) - dist(b[0], b[1], y.lat, y.lon)); r = fs[0] || null } catch (e) { }
  if (!r && b) try { const n = await nomQ(name, b[0], b[1], 1, 200); if (n[0]) r = { ...n[0], kind: '' } } catch (e) { }
  if (r) try { localStorage.setItem(k, JSON.stringify(r)) } catch (e) { } return r }
/* ---------- refine ---------- */
function itKind(x) { const s = (x.name + ' ' + (x.kind || '')).toLowerCase();
  return /night ?market|夜市/.test(s) ? 'night' : /restaurant|food|eat|cafe|coffee|lunch|dinner|breakfast|noodle|dumpling|ramen|bbq|hot ?pot|tea/.test(s) ? 'food' : /museum|gallery|temple|shrine|memorial|palace|hall/.test(s) ? 'culture'
    : /mall|market|shop|street|district|ximending|department/.test(s) ? 'shop' : /park|mountain|trail|hike|lake|beach|garden|falls/.test(s) ? 'nature' : /101|tower|view|observ/.test(s) ? 'view' : 'sight' }
const IDUR = { night: 100, food: 60, culture: 90, shop: 80, nature: 120, view: 75, sight: 75 };
const itHm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), itMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null };
function itTravel(a, b) { const km = dist(a.lat, a.lon, b.lat, b.lon) * 1.3; return Math.round(km < 1.5 ? km / 4.5 * 60 : km < 40 ? km / 22 * 60 + 10 : km / 70 * 60 + 20) }
function refineDay(stops, start) { if (!stops.length) return [];
  const fixed = stops.filter(s => s.time), free = stops.filter(s => !s.time), nights = free.filter(s => s.k === 'night'), rest = free.filter(s => s.k !== 'night');
  const ord = []; let cur = start; const pool = rest.slice();
  while (pool.length) { pool.sort((a, b) => dist(cur.lat, cur.lon, a.lat, a.lon) - dist(cur.lat, cur.lon, b.lat, b.lon)); const n = pool.shift(); ord.push(n); cur = n }
  const seq = [...ord, ...nights]; let t = IT.pace === 'relaxed' ? 600 : IT.pace === 'packed' ? 510 : 570, prev = start, ate = { lunch: false, dinner: false };
  const plan = []; const all = [...fixed.map(s => ({ ...s, fm: itMin(s.time) }))].sort((a, b) => a.fm - b.fm);
  for (const s of seq) { t += itTravel(prev, s); if (s.k === 'night' && t < 1080) t = 1080; if (s.k === 'food' && !ate.lunch && t < 690) t = 690;
    while (all.length && all[0].fm != null && all[0].fm <= t + IDUR[s.k]) { const f = all.shift(); plan.push({ ...f, time: f.time, why: 'your time' }); t = Math.max(t, f.fm + IDUR[f.k] + itTravel(f, s)); prev = f }
    plan.push({ ...s, time: itHm(Math.round(t / 15) * 15), why: s.k === 'night' ? 'night markets open after ~5 pm' : s.k === 'food' ? 'meal time' : '' }); if (s.k === 'food') ate[t < 900 ? 'lunch' : 'dinner'] = true; t += IDUR[s.k]; prev = s }
  all.forEach(f => plan.push({ ...f, why: 'your time' })); plan.sort((a, b) => itMin(a.time) - itMin(b.time)); return plan }
async function suggestFor(day, stops) { const max = IT.pace === 'relaxed' ? 3 : IT.pace === 'packed' ? 6 : 4; if (stops.length >= max || !IT.likes.length || !stops.length) return [];
  const c = { lat: stops.reduce((s, x) => s + x.lat, 0) / stops.length, lon: stops.reduce((s, x) => s + x.lon, 0) / stops.length };
  const q = `[out:json][timeout:12];(${IT.likes.map(k => IT_LIKES[k] && `nwr[${IT_LIKES[k][1]}]["name"]["name:en"](around:1200,${c.lat},${c.lon});`).filter(Boolean).join('')});out center 40;`;
  try { const r = await fetch(OVERPASS[0], { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined }); const els = (await r.json()).elements || [];
    const have = new Set(stops.map(s => s.name.toLowerCase())); const picks = [];
    for (const e of els.sort((a, b) => (b.tags.wikidata ? 1 : 0) - (a.tags.wikidata ? 1 : 0))) { const n = e.tags['name:en'] || e.tags.name; if (!n || have.has(n.toLowerCase())) continue; have.add(n.toLowerCase());
      picks.push({ name: n, lat: e.lat || e.center?.lat, lon: e.lon || e.center?.lon, kind: Object.values(e.tags).join(' '), sug: true }); if (picks.length >= max - stops.length) break }
    return picks } catch (e) { return [] } }
/* ---------- UI ---------- */
function openItinImport() { $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">📥 Import an itinerary</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <p class="muted">Upload a photo, screenshot, PDF, Word (.docx/.doc), CSV or text file — or paste it below. The app reads the days, times and places, shows what changes, and can tidy it into a smarter plan.</p>
  <input type="file" id="itF" accept="image/*,.pdf,.csv,.txt,.md,.doc,.docx,.eml,.html" style="margin:6px 0">
  <textarea id="itT" rows="6" style="width:100%;box-sizing:border-box" placeholder="Day 1: Taipei 101, Din Tai Fung 12:00, Raohe Night Market&#10;Day 2: Jiufen, Shifen lanterns…"></textarea>
  <div style="margin:10px 0 4px"><b>What do you love?</b></div><div class="row" style="flex-wrap:wrap;gap:6px">${Object.entries(IT_LIKES).map(([k, v]) => `<button class="pill ${IT.likes.includes(k) ? 'on' : ''}" onclick="itLike('${k}',this)">${v[0]}</button>`).join('')}</div>
  <div style="margin:10px 0 4px"><b>Pace</b></div><div class="l2seg">${['relaxed', 'normal', 'packed'].map(p => `<button class="${IT.pace === p ? 'on' : ''}" onclick="IT.pace='${p}';localStorage.setItem('ak_pace','${p}');this.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
  <button class="act" style="width:100%;margin-top:12px" onclick="itRun()">🔍 Read my itinerary</button><div id="itOut" style="margin-top:12px"></div></div>` }
function itLike(k, b) { const i = IT.likes.indexOf(k); i >= 0 ? IT.likes.splice(i, 1) : IT.likes.push(k); b.classList.toggle('on', i < 0); localStorage.setItem('ak_likes', JSON.stringify(IT.likes)) }
async function itRun() { const o = $('itOut'), f = $('itF').files[0]; let text = $('itT').value;
  o.innerHTML = '<p class="muted">Reading…</p>'; try { if (f) text = (await itinFileText(f, p => o.innerHTML = `<p class="muted">Reading the picture… ${p}%</p>`)) + '\n' + text } catch (e) { o.innerHTML = '<p class="muted">Couldn’t read that file — try a PDF, a clearer photo, or paste the text.</p>'; return }
  text = text.trim(); if (!text) { o.innerHTML = '<p class="muted">Nothing readable found. Try a sharper photo or paste the text.</p>'; return }
  IT.oneDay = null; parseItin(text);
  o.innerHTML = `<div class="card" style="padding:12px;margin:0"><b>Here’s what I read — fix anything before planning</b><p class="muted" style="margin:4px 0 8px;font-size:13px">One place per line. Use “Day 1”, “Day 2”… or dates to split days. Lines like “Travel to … via …” are skipped.</p>
   <textarea id="itRev" rows="${Math.min(14, text.split('\n').length + 1)}" style="width:100%;box-sizing:border-box">${esc(text)}</textarea>
   ${IT.noDays ? `<label class="muted" style="display:block;margin:8px 0">No days found — put these on <select id="itDay">${DAYS.map((d, i) => `<option value="${i}" ${i === (typeof curDay === 'number' ? curDay : 0) ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>` : ''}
   <button class="act" style="width:100%;margin-top:8px" onclick="itPlan()">✨ Plan it</button></div>` }
async function itPlan() { const o = $('itOut'), text = $('itRev').value; IT.oneDay = $('itDay') ? +$('itDay').value : null;
  const items = parseItin(text); if (!items.length) { o.insertAdjacentHTML('beforeend', '<p class="muted">I couldn’t find places in that. One place per line works best.</p>'); return }
  const found = []; IT.bias = null; for (let i = 0; i < items.length; i++) { o.innerHTML = `<p class="muted">Finding places on the map… ${i + 1}/${items.length}</p>`; let g = await itinGeo(items[i].name);
    if (!g && / and |&/.test(items[i].name)) { for (const part of items[i].name.split(/\s+(?:and|&)\s+/)) { const g2 = await itinGeo(part); if (g2) { if (!IT.bias) IT.bias = [g2.lat, g2.lon]; found.push({ ...items[i], name: part, lat: g2.lat, lon: g2.lon, kind: g2.kind }) } } continue }
    if (g && !IT.bias) IT.bias = [g.lat, g.lon]; if (g) found.push({ ...items[i], lat: g.lat, lon: g.lon, kind: g.kind, name: items[i].name, k: '' }); else found.push({ ...items[i], miss: true }) }
  found.forEach(x => x.k = itKind(x)); IT.items = found;
  const t0 = trip() || {}, okBase = !(t0.base && t0.cc && t0.base.cc && t0.base.cc !== t0.cc), base = okBase ? { lat: HOSTEL[0], lon: HOSTEL[1] } : null, byDay = {}; found.filter(x => !x.miss).forEach(x => (byDay[x.day] = byDay[x.day] || []).push(x));
  const ref = {}; for (const d of Object.keys(byDay)) { o.innerHTML = `<p class="muted">Planning ${DAYS[d] || 'day'}…</p>`; const sug = await suggestFor(+d, byDay[d]); sug.forEach(s => s.k = itKind(s)); ref[d] = refineDay([...byDay[d], ...sug], base || byDay[d][0]) }
  IT.plan = ref; itShow() }
function itShow() { const o = $('itOut'), miss = IT.items.filter(x => x.miss);
  const days = Object.keys(IT.plan).sort((a, b) => a - b); let added = 0, removed = 0, kept = 0;
  const html = days.map(d => { const cur = (D.routes[d] || []).map(r => r[0].toLowerCase()), nw = IT.plan[d], nwN = nw.map(x => x.name.toLowerCase());
    const rows = nw.map(x => { const inCur = cur.some(c => c.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(c)); inCur ? kept++ : added++;
      return `<div class="lvRow"><span>${x.sug ? '✨' : inCur ? '•' : '<b style="color:#9CAF88">＋</b>'} ${esc(x.name)}${x.sug ? ' <span class="muted" style="font-size:12px">suggested for you</span>' : ''}${x.why ? ` <span class="muted" style="font-size:12px">· ${esc(x.why)}</span>` : ''}</span><b>${esc(x.time || '')}</b></div>` }).join('');
    const gone = (D.routes[d] || []).filter(r => !nwN.some(n => n.includes(r[0].toLowerCase()) || r[0].toLowerCase().includes(n))); removed += gone.length;
    return `<div class="lvSec"><h3>${esc(DAYS[d] || 'Day ' + (+d + 1))}</h3>${rows}${gone.length ? `<div class="muted" style="font-size:13px;margin-top:4px">Not in your file (kept unless you replace): ${gone.map(g => esc(g[0])).join(', ')}</div>` : ''}</div>` }).join('');
  o.innerHTML = `<div class="card" style="padding:12px;margin:0"><b>What changes</b><p class="muted" style="margin:4px 0 8px">＋ ${added} new · • ${kept} already planned · ${removed} in your plan but not in the file${miss.length ? ` · couldn’t find on the map: ${miss.slice(0, 6).map(m => esc(m.name)).join(', ')}${miss.length > 6 ? ` +${miss.length - 6} more` : ''}` : ''}</p>${html}
   <p class="muted" style="font-size:12px">Order is arranged to cut travel; times allow for getting there, meals around 11:30 and 6:30, and night markets after dark. Times you wrote stay as you wrote them.</p>
   <div class="row" style="gap:6px;flex-wrap:wrap"><button class="act" onclick="itApply('merge')">✨ Add to my plan</button><button class="pill" onclick="itApply('replace')">Replace those days</button><button class="pill" onclick="IT.plan&&Object.values(IT.plan).forEach(d=>d.splice(0,d.length,...d.filter(x=>!x.sug)));itShow()">Remove ✨ suggestions</button></div></div>` }
function itApply(mode) { D.stopx = D.stopx || {}; D.manualStops = 1;
  for (const d of Object.keys(IT.plan)) { const nw = IT.plan[d]; let day = mode === 'replace' ? [] : (D.routes[d] || []).slice(), ex = mode === 'replace' ? [] : day.map((_, k) => D.stopx[d + ':' + k] || {});
    for (const x of nw) { const i = day.findIndex(r => r[0].toLowerCase().includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(r[0].toLowerCase()));
      if (i >= 0) ex[i] = { ...ex[i], time: x.time || ex[i].time }; else { day.push([x.name, x.lat, x.lon, '']); ex.push({ time: x.time || '', note: x.sug ? '✨ Suggested for you' : '' }) } }
    const z = day.map((r, k) => [r, ex[k] || {}]).sort((a, b) => (itMin(a[1].time) ?? 9999) - (itMin(b[1].time) ?? 9999));
    Object.keys(D.stopx).filter(k => k.startsWith(d + ':')).forEach(k => delete D.stopx[k]); D.routes[d] = z.map(p => p[0]); z.forEach((p, k) => D.stopx[d + ':' + k] = p[1]) }
  save(); closeSheet(); try { curDay = +Object.keys(IT.plan)[0] || 0; renderPlan() } catch (e) { } toast('Itinerary added ✓') }
on('plan:render', () => { const bar = $('daySeg'); if (!bar || document.getElementById('itBtn')) return;
  bar.insertAdjacentHTML('beforebegin', `<button id="itBtn" class="pill" style="margin:0 0 8px" onclick="openItinImport()">📥 Import itinerary (photo, PDF, Word, CSV, text)</button>`) });
/* ---------- edit / move / delete with auto-adjusted times ----------
   Notes, tickets and times now travel with their stop (they used to stay on the old row number).
   Times you type yourself are locked 🔒; the others re-flow from the day's first stop using travel time and visit length. */
function dayX(d) { return (D.routes[d] || []).map((_, k) => (D.stopx || {})[d + ':' + k] || {}) }
function setDayX(d, ex) { D.stopx = D.stopx || {}; Object.keys(D.stopx).filter(k => k.startsWith(d + ':')).forEach(k => delete D.stopx[k]); ex.forEach((e, k) => { if (e && Object.keys(e).length) D.stopx[d + ':' + k] = e }) }
function autoTimeOn() { return localStorage.getItem('ak_autotime') !== '0' }
function retimeDay(d) { const r = D.routes[d] || [], ex = dayX(d); if (!r.length) return;
  let t = (ex[0].lock && itMin(ex[0].time) != null) ? itMin(ex[0].time) : (IT.pace === 'relaxed' ? 600 : IT.pace === 'packed' ? 510 : 570), prev = null;
  r.forEach((x, k) => { const s = { name: x[0], lat: x[1], lon: x[2] }, kd = itKind(s); if (prev && x[1] != null && prev.lat != null) t += itTravel(prev, s);
    if (ex[k].lock && itMin(ex[k].time) != null) t = itMin(ex[k].time); else if (/check-?out|departure|airport/i.test(x[0]) && ex[k].time) t = Math.max(t, itMin(ex[k].time) || t);
    else { if (kd === 'night' && t < 1020) t = 1020; ex[k] = { ...ex[k], time: itHm(Math.round(t / 15) * 15) } }
    t += /check|airport|departure|arrival/i.test(x[0]) ? 30 : IDUR[kd]; prev = s });
  setDayX(d, ex) }
function afterEdit(msg, undo) { if (autoTimeOn()) retimeDay(curDay); save(); renderPlan(); if (undo) { window._undo = undo; const x = $('toast'); x.innerHTML = `${esc(msg)} · <button class="pill" style="min-height:28px;padding:2px 10px" onclick="_undo&&_undo();_undo=null;this.closest('#toast').classList.remove('on')">Undo</button>`; x.classList.add('on'); clearTimeout(window._ut); window._ut = setTimeout(() => x.classList.remove('on'), 5000) } else if (msg) toast(msg) }
mv = function (i, dir) { const r = D.routes[curDay], j = i + dir; if (j < 0 || j >= r.length) return; const ex = dayX(curDay), snap = JSON.stringify([r, ex]);
  [r[i], r[j]] = [r[j], r[i]]; [ex[i], ex[j]] = [ex[j], ex[i]]; if (ex[i]) delete ex[i].lock; if (ex[j]) delete ex[j].lock; setDayX(curDay, ex); D.manualStops = 1;
  afterEdit(autoTimeOn() ? 'Moved · times adjusted' : 'Moved', () => { const [a, b] = JSON.parse(snap); D.routes[curDay] = a; setDayX(curDay, b); save(); renderPlan() }) };
rm = function (i) { const r = D.routes[curDay], ex = dayX(curDay), snap = JSON.stringify([r, ex]), nm = r[i] && r[i][0];
  r.splice(i, 1); ex.splice(i, 1); setDayX(curDay, ex); D.manualStops = 1;
  afterEdit(`Removed ${nm || 'stop'}${autoTimeOn() ? ' · times adjusted' : ''}`, () => { const [a, b] = JSON.parse(snap); D.routes[curDay] = a; setDayX(curDay, b); save(); renderPlan() }) };
saveStop = function (i) { D.manualStops = 1; const x = D.routes[curDay][i], k = curDay + ':' + i, old = (D.stopx || {})[k] || {}; x[0] = $('esN').value || x[0]; x[3] = $('esC').value; D.stopx = D.stopx || {};
  const tm = $('esT').value, lock = tm ? (tm !== old.time ? true : !!old.lock) : false;
  D.stopx[k] = { time: tm, ref: $('esR').value, note: $('esNo').value, ...(lock ? { lock: true } : {}) }; closeSheet(); afterEdit(lock && tm !== old.time ? 'Saved · 🔒 time kept, rest of day adjusted' : 'Saved ✓') };
(function () { if (typeof addStopManual === 'function') { const a0 = addStopManual; addStopManual = async function () { const r = await a0.apply(this, arguments); if (autoTimeOn()) { retimeDay(curDay); save(); renderPlan() } return r } } })();
on('plan:render', () => { const seg = $('daySeg'); if (!seg) return;
  document.querySelectorAll('#v-plan .tag').forEach(t => { const m = /🕒\s*(\d{1,2}:\d{2})/.exec(t.textContent); if (!m) return; const row = t.closest('.row'), btn = row && row.querySelector('[onclick^="editStop("]'); if (!btn) return; const i = +/editStop\((\d+)\)/.exec(btn.getAttribute('onclick'))[1]; if ((D.stopx || {})[curDay + ':' + i]?.lock && !t.dataset.l) { t.dataset.l = 1; t.textContent = '🔒 ' + m[1] } });
  if (document.getElementById('atBar')) return; seg.insertAdjacentHTML('afterend', `<div id="atBar" class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0"><label style="display:inline-flex;gap:6px;align-items:center;font-size:14px"><input type="checkbox" style="width:18px;height:18px" ${autoTimeOn() ? 'checked' : ''} onchange="localStorage.setItem('ak_autotime',this.checked?'1':'0');if(this.checked){retimeDay(curDay);save();renderPlan()}"> ⏱ Auto-adjust times</label><button class="pill" style="min-height:32px" onclick="retimeDay(curDay);save();renderPlan();toast('Times re-planned ✓')">Re-plan this day's times</button><span class="muted" style="font-size:12px">🔒 = a time you set</span></div>`) });
