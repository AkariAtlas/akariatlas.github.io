/* sync2: change-by-change merge for shared trips. Each device remembers the last version it synced ("base").
   On every sync it compares base / this device / cloud per section (and per day inside plans, notes, journal…):
   whatever changed on only one side wins, so two people editing different things never overwrite each other.
   If both changed the very same item, the newest save wins for that item only. */
const SYNC_SKIP = new Set(['t', 'dark', 'voice', 'voiceName']);
const sj = x => JSON.stringify(x === undefined ? null : x);
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
function merge3(base, mine, theirs, mineNewer, depth) { const out = {}, keys = new Set([...Object.keys(mine || {}), ...Object.keys(theirs || {})]);
  for (const k of keys) { if (!depth && SYNC_SKIP.has(k)) { out[k] = mine[k] !== undefined ? mine[k] : theirs[k]; continue }
    const b = base ? base[k] : undefined, m = mine ? mine[k] : undefined, t = theirs ? theirs[k] : undefined;
    if (sj(m) === sj(t)) { out[k] = m; continue }
    if (sj(m) === sj(b)) { out[k] = t; continue } if (sj(t) === sj(b)) { out[k] = m; continue }
    if (!depth && Array.isArray(m) && Array.isArray(t)) { const bs = new Set((Array.isArray(b) ? b : []).map(sj)), ms = new Set(m.map(sj)), ts = new Set(t.map(sj));
      out[k] = [...m.filter(x => !(bs.has(sj(x)) && !ts.has(sj(x)))), ...t.filter(x => !ms.has(sj(x)) && !bs.has(sj(x)))]; continue }
    if (depth < 1 && isObj(m) && isObj(t)) { out[k] = merge3(isObj(b) ? b : {}, m, t, mineNewer, depth + 1); continue }
    out[k] = mineNewer ? m : t }
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]; return out }
function syncBase() { try { return JSON.parse(localStorage.getItem('tw_base') || 'null') } catch (e) { return null } }
function setBase(x) { try { localStorage.setItem('tw_base', JSON.stringify(x)) } catch (e) { } }
function mergeWith(r) { const base = syncBase(); let M;
  if (!base) M = (r.t || 0) > (D.t || 0) ? Object.assign({}, DEF, r) : D;
  else { M = Object.assign({}, DEF, merge3(base, D, r, (D.t || 0) >= (r.t || 0), 0)); M.t = Math.max(D.t || 0, r.t || 0) }
  return M }
async function syncNow(fromSave) { if (!TRIP.code || localStorage.getItem('tw_store') === 'gdrive') return;
  const view = localStorage.getItem('ak_viewonly') === '1'; if (localStorage.getItem('tw_joinpending')) return;
  if (SYNC.busy) { SYNC.again = true; return } SYNC.busy = true;
  try { const j = await api({ action: 'load', code: TRIP.code, key: TRIP.key }); const r = JSON.parse(j.json || '{}'); markView(r);
    if (view || r.viewOnly) { if (sj(r) !== sj(syncBase())) { D = Object.assign({}, DEF, r); localStorage.setItem('tw_state', JSON.stringify(D)); setBase(r); renderAll() } setSync('👀 View only'); return }
    /* safety: a device whose trip is missing (fresh install, cleared storage, failed load) must never wipe the shared copy */
    const hasT = x => !!(x && x.trip && (x.trip.start || x.trip.base)), b0 = syncBase();
    if (!hasT(D) && hasT(r)) { D = Object.assign({}, DEF, r); localStorage.setItem('tw_state', JSON.stringify(D)); setBase(r); try { renderAll() } catch (e) { } setSync('☁️ Synced'); return }
    const M = mergeWith(r);
    if (hasT(r) && !hasT(M)) { setSync('⚠️ Sync paused — trip missing here'); return }
    if (hasT(b0) && !hasT(D) && !hasT(r)) { setSync('⚠️ Sync paused'); return }
    const changedHere = sj(M) !== sj(D), changedThere = sj(M) !== sj(r);
    if (changedHere) { D = M; localStorage.setItem('tw_state', JSON.stringify(D)); try { renderAll() } catch (e) { } if (!fromSave) toast('Synced ✓') }
    if (changedThere) { await api({ action: 'save', code: TRIP.code, key: TRIP.key, json: JSON.stringify(D) }); try { pushView() } catch (e) { } setSync('☁️ Saved') } else setSync('☁️ Synced');
    setBase(D) }
  catch (e) { setSync('💾 Offline — will retry'); clearTimeout(SYNC.rt); SYNC.rt = setTimeout(() => syncNow(true), 30000) }
  finally { SYNC.busy = false; if (SYNC.again) { SYNC.again = false; setTimeout(() => syncNow(true), 300) } } }
const SYNC = {};
push = () => syncNow(true);
pull = async function () { if (localStorage.getItem('tw_store') === 'gdrive') { if (GD.token) gdPull().catch(() => { }); else setSync('☁️ Google Drive (tap to sync)'); return } return syncNow(false) };
/* joining sets a fresh base so the first sync never treats the shared trip as "deleted here" */
(function () { const j0 = joinTrip; joinTrip = function () { localStorage.removeItem('tw_base'); return j0.apply(this, arguments) } })();
on('trip:render', () => { }); /* noop hook keeps order stable */
