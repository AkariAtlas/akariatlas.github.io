/* guide: easier for first-time users — a "Getting started" checklist on Today (ticks itself off as you go)
   and a one-line "what you can do here" hint at the top of every tab. Both can be dismissed. */
const GS_STEPS = [
  ['✈️', 'Add your trip dates & stay', () => !!(trip()?.start && trip()?.base?.lat), "openWizard()"],
  ['🗺️', 'Plan your days', () => Object.values(D.routes || {}).filter(r => (r || []).length >= 2).length >= 1, "goTab('plan')"],
  ['💰', 'Set a budget', () => +D.total > 0, "goTab('money')"],
  ['👫', 'Share with your travel buddy', () => !!TRIP.code, "showTripQR('edit')"],
  ['🗣️', 'Try the translator', () => !!localStorage.getItem('ak_tried_talk'), "openTalk()"],
  ['📥', 'Save maps & phrases for offline', () => !!localStorage.getItem('ak_tried_offline'), "offlinePack()"]];
function goTab(v) { document.querySelector(`nav [data-v="${v}"]`)?.click(); scrollTo({ top: 0, behavior: 'smooth' }) }
function gsCard() { if (localStorage.getItem('ak_gs_hide') || localStorage.getItem('ak_viewonly') === '1') return ''; let st; try { st = GS_STEPS.map(s => [s, !!s[2]()]) } catch (e) { return '' }
  const done = st.filter(x => x[1]).length; if (done === st.length) return '';
  return `<div class="card" id="gsCard"><div class="row sp" style="align-items:center"><h2 style="margin:0">👋 Getting started <span class="muted" style="font-size:13px;font-weight:400">${done}/${st.length}</span></h2><button class="pill" style="min-height:30px" onclick="localStorage.setItem('ak_gs_hide','1');document.getElementById('gsCard').remove()">Hide</button></div>
   <div class="gsBar"><i style="width:${Math.round(done / st.length * 100)}%"></i></div>
   ${st.map(([s, ok]) => `<button class="gsRow ${ok ? 'ok' : ''}" onclick="${s[3]}"><span class="gsI">${ok ? '✅' : s[0]}</span><span>${s[1]}</span><span class="gsGo">${ok ? '' : '›'}</span></button>`).join('')}</div>` }
on('today:render', () => { document.getElementById('gsCard')?.remove(); const h = gsCard(); if (!h) return; const v = $('v-today'); const first = v && v.querySelector('.card'); first ? first.insertAdjacentHTML('beforebegin', h) : v && v.insertAdjacentHTML('afterbegin', h) });
(function () { const ot = window.openTalk; if (ot) window.openTalk = function () { localStorage.setItem('ak_tried_talk', '1'); return ot.apply(this, arguments) };
  if (typeof offlinePack === 'function') { const op = offlinePack; offlinePack = function () { localStorage.setItem('ak_tried_offline', '1'); return op.apply(this, arguments) } } })();
/* one-line hint per tab */
const TAB_HINT = { today: '🏡 Your day at a glance: what’s next, live trains & buses, weather and quick tools.', explore: '🔍 Search any place or tap a tile. Tap a result for Go, reviews, live transit and nearby sights.',
  plan: '🗺️ Your stops for each day. ✨ Suggest or 📥 Import a plan, ✏️ edit or ↑↓ move — times adjust by themselves.', money: '💰 Budget, spending and who owes whom. Add an expense in two taps.', docs: '🧳 Bookings, documents, wallet, sharing and settings for this trip.' };
function tabHints() { for (const [v, txt] of Object.entries(TAB_HINT)) { const el = $('v-' + v); if (!el || el.querySelector('.tabHint') || localStorage.getItem('ak_hint_' + v)) continue;
  el.insertAdjacentHTML('afterbegin', `<div class="tabHint"><span>${txt}</span><button aria-label="Got it" onclick="localStorage.setItem('ak_hint_${v}','1');this.parentNode.remove()">Got it</button></div>`) } }
tabHints(); ['today:render', 'plan:render', 'money:render', 'trip:render'].forEach(e => on(e, tabHints));
(function () { const st = document.createElement('style'); st.textContent = `.tabHint{display:flex;align-items:center;gap:10px;justify-content:space-between;background:rgba(145,203,224,.18);border-radius:14px;padding:8px 12px;margin:0 0 12px;font-size:14px;line-height:1.35}
.tabHint button{border:0;background:#28546B;color:#fff;border-radius:12px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;flex:0 0 auto}
.gsBar{height:6px;border-radius:6px;background:rgba(40,84,107,.12);margin:10px 0 6px;overflow:hidden}.gsBar i{display:block;height:100%;background:#9CAF88}
.gsRow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:none;padding:10px 4px;border-bottom:1px dashed rgba(40,84,107,.15);font:inherit;color:inherit;cursor:pointer;min-height:44px}
.gsRow.ok{opacity:.6}.gsRow.ok span:nth-child(2){text-decoration:line-through}.gsI{width:24px;text-align:center}.gsRow span:nth-child(2){flex:1}.gsGo{font-size:20px;color:#E98B73}`; document.head.appendChild(st) })();
