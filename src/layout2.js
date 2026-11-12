/* layout2: calmer layout layer (spacing scale, cute icons, chip row, list/map toggle, place card + tabs, desktop two-pane).
   Pure presentation: every existing feature stays reachable. */
(function () {
const C = { t: '#28546B', s: '#91CBE0', g: '#9CAF88', c: '#E98B73', y: '#E7BD68', i: '#F7F2E8' };
const svg = b => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${b}</svg>`;
const IC = {
  today: svg(`<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="${C.s}" stroke="${C.t}" stroke-width="1.6" stroke-linejoin="round"/><rect x="10" y="15" width="4" height="6" fill="${C.c}"/>`),
  explore: svg(`<circle cx="10.5" cy="10.5" r="6.5" fill="${C.s}" stroke="${C.t}" stroke-width="1.8"/><path d="m15.5 15.5 5 5" stroke="${C.c}" stroke-width="2.6" stroke-linecap="round"/>`),
  plan: svg(`<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="${C.g}" stroke="${C.t}" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="${C.t}" stroke-width="1.2"/><circle cx="12" cy="11" r="2" fill="${C.c}"/>`),
  money: svg(`<circle cx="12" cy="12" r="8.5" fill="${C.y}" stroke="${C.t}" stroke-width="1.6"/><circle cx="12" cy="12" r="5" fill="none" stroke="${C.i}" stroke-width="1.4"/><path d="M12 9v6" stroke="${C.t}" stroke-width="1.6" stroke-linecap="round"/>`),
  docs: svg(`<rect x="4" y="7" width="16" height="13" rx="2.5" fill="${C.c}" stroke="${C.t}" stroke-width="1.6"/><path d="M9 7V5h6v2" fill="none" stroke="${C.t}" stroke-width="1.6"/><path d="M4 12h16" stroke="${C.i}" stroke-width="1.4"/>`),
};
const CHIP = { cafe: '☕', food: '🍜', clothes: '🛍️', hobby: '🎮', nature: '🌿', market: '🏮', gifts: '🎁', bike: '🛵', stations: '🚉', mall: '🏬', stay: '🛏️', toilets: '🚻', atm: '🏧', spa: '💆' };

const st = document.createElement('style'); st.id = 'layout2css';
st.textContent = `
html,body{max-width:100%;overflow-x:hidden}
.wrap,main,.view,.view>.card,.view>*{min-width:0;max-width:100%;box-sizing:border-box}
#placeHead,#placeHead *{overflow-wrap:anywhere}
:root{--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--rad:16px;--bh:40px}
.view{max-width:720px;margin-left:auto;margin-right:auto}
.view>.card,.xtraT>.card{margin:0 0 var(--s4);padding:var(--s4);border-radius:var(--rad);box-shadow:0 1px 3px rgba(40,84,107,.08)}
.card h2{margin:0 0 var(--s3);font-size:1.05rem;display:flex;align-items:center;gap:var(--s2)}
.pill,.act,button.map,a.map{min-height:var(--bh);display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1.1;box-sizing:border-box}
nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
nav button span{display:flex;align-items:center;justify-content:center;height:26px;line-height:0}
nav button:not(.on) svg{opacity:.75;filter:saturate(.7)}
#v-explore>.card:first-child>h2{display:none}
#q{min-height:48px;font-size:1.05rem;border-radius:24px;padding:0 var(--s4)}
#nearCats{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--s2);padding:var(--s2) 0;width:100%;box-sizing:border-box}
#nearCats>button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;padding:8px 4px!important;border-radius:16px!important;white-space:normal;text-align:center;line-height:1.1}
#nearCats .ci{font-size:22px;line-height:1}#nearCats .cl{font-size:12px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#nearCats>button.l2m{order:99}
#nearCats:not(.all)>button.l2x{display:none!important}
@media (min-width:600px) and (max-width:1099px){#nearCats{grid-template-columns:repeat(auto-fill,minmax(84px,110px))}#nearCats:not(.all)>button.l2x,#nearCats>button.l2x{display:flex!important}#nearCats:not(.all)>button.l2m,#nearCats>button.l2m{display:none!important}}
.l2seg{display:flex;gap:4px;background:rgba(145,203,224,.25);border-radius:22px;padding:4px;margin:var(--s2) 0;width:max-content}
.l2seg button{border:0;background:none;padding:6px 16px;border-radius:18px;font:inherit;min-height:32px;cursor:pointer;color:inherit}
.l2seg button.on{background:#fff;color:#28546B;box-shadow:0 1px 2px rgba(0,0,0,.12);font-weight:600}
#near .place{display:flex;align-items:center;gap:var(--s3);padding:var(--s3) 0}
#near .place .ic{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:${C.i};display:flex;align-items:center;justify-content:center;font-size:20px}
.l2act{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2);margin:var(--s3) 0}
.l2act button{flex-direction:column;min-height:56px;border-radius:14px;font-size:.8rem;padding:6px}
.l2act button b{font-size:1.2rem;line-height:1}
.l2act button.go{background:${C.t};color:#fff;border-color:${C.t}}
.l2modes{display:flex;gap:var(--s2);overflow-x:auto;margin:0 0 var(--s3)}
.l2modes button{flex:1 0 auto;min-height:44px;border-radius:12px;font-size:.85rem}
.l2ov>.muted:first-child{display:none}.l2more{display:none}.l2more.open{display:block}
#placeHead .dirBar{display:none}
#placeHead h3{margin:var(--s3) 0 var(--s1)}
.l2tabs{display:flex;gap:var(--s1);border-bottom:1px solid rgba(40,84,107,.15);margin:var(--s3) 0}
.l2tabs button{border:0;background:none;padding:var(--s2) var(--s3);font:inherit;cursor:pointer;color:inherit;border-bottom:3px solid transparent;min-height:40px}
.l2tabs button.on{border-bottom-color:${C.c};font-weight:600}
#v-explore[data-pt="overview"] #sightsCard,#v-explore[data-pt="overview"] #tripPlan,#v-explore[data-pt="overview"] .l2transit{display:none}
#v-explore[data-pt="sights"] .l2transit,#v-explore[data-pt="sights"] .l2ov{display:none}
#v-explore[data-pt="transit"] #sightsCard,#v-explore[data-pt="transit"] #tripPlan,#v-explore[data-pt="transit"] .l2ov{display:none}
.l2today{display:flex;gap:var(--s2);margin:0 0 var(--s4)}
.l2today button{flex:1}
body:not(.l2tools) #toolsCard{display:none}
@media (max-width:1099px){
 body.l2list #map,body.l2list #gmap{display:none!important}
 body:not(.l2list) #near{display:none}
}
@media (min-width:1100px){
 body{padding-left:88px}
 nav{position:fixed!important;left:0;top:0;bottom:0;right:auto!important;width:80px;flex-direction:column!important;justify-content:flex-start!important;padding-top:var(--s5)!important;gap:var(--s2);height:auto!important}
 nav button{width:100%;flex:0 0 auto!important;padding:var(--s2) 0!important}
 .l2seg.lm{display:none}
 .wrap:has(#v-explore.on),main:has(#v-explore.on){max-width:none!important;margin-left:0!important;margin-right:0!important}
 #v-explore.on{max-width:none;margin:0 var(--s5);display:grid;grid-template-columns:440px minmax(0,1fr);column-gap:var(--s5);align-items:start}
 #v-explore.on>*{grid-column:1;min-width:0}
 #v-explore.on>#l2pane{grid-column:2;grid-row:1/span 50;position:sticky;top:var(--s4);height:calc(100vh - 32px);border-radius:var(--rad);overflow:hidden;display:flex;flex-direction:column}
 #l2pane #map{flex:1;height:auto!important;min-height:0!important;margin:0!important;border-radius:0;display:block!important}
 #l2pane #gmap{flex:1;height:auto!important;border:0;min-height:0!important}
 #l2pane #gmap[style*="none"]+*{}
 #near{max-height:none}
}`;
document.head.appendChild(st);

/* nav icons */
function navIcons() { document.querySelectorAll('nav button[data-v]').forEach(b => { const s = b.querySelector('span'), k = b.dataset.v; if (s && IC[k] && !s.dataset.l2) { s.innerHTML = IC[k]; s.dataset.l2 = 1 } }) }

/* chip row: first 4 + More */
function chips() { const n = $('nearCats'); if (!n || n.dataset.l2busy) return; n.dataset.l2busy = 1;
  const keys = Object.keys(NEAR); [...n.children].forEach((b, i) => { if (b.classList.contains('l2m')) return; const k = keys[i]; b.dataset.k = k;
    if (i >= 4 && k !== nearCat) b.classList.add('l2x');
    const lab = (NEAR[k] && NEAR[k][0] || '').replace(/^\S+\s/, '').split(/[ /&]/)[0].replace(/[,.]$/, ''); const lab2 = { stay: 'Stays', food: 'Food', hobby: 'Hobby', clothes: 'Clothes', market: 'Markets', toilets: 'Toilets' }[k] || lab; const ico = CHIP[k] || (NEAR[k] && NEAR[k][0] || '').split(' ')[0]; if (ico && lab && !b.querySelector('.ci')) b.innerHTML = `<span class="ci">${ico}</span><span class="cl">${lab2}</span>`; });
  if (!n.querySelector('.l2m') && keys.length > 4) { const m = document.createElement('button'); m.className = 'pill l2m'; const ml = () => m.innerHTML = n.classList.contains('all') ? '<span class="ci">▴</span><span class="cl">Less</span>' : '<span class="ci">⋯</span><span class="cl">More</span>'; ml();
    m.onclick = () => { n.classList.toggle('all'); ml() }; n.appendChild(m) }
  delete n.dataset.l2busy }

/* List | Map toggle (phones) */
function seg() { const m = $('map'); if (!m || document.querySelector('.l2seg.lm')) return;
  const d = document.createElement('div'); d.className = 'l2seg lm'; d.innerHTML = '<button data-m="list" class="on">List</button><button data-m="map">Map</button>';
  d.onclick = e => { const b = e.target.closest('button'); if (!b) return; d.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    document.body.classList.toggle('l2list', b.dataset.m === 'list'); if (b.dataset.m === 'map') setTimeout(() => { try { map && map.invalidateSize() } catch (e) { } }, 60) };
  const btn = $('gmapBtn'); (btn ? btn.parentNode : m).before(d); document.body.classList.add('l2list') }

/* place card: name + detail, 4 buttons, mode times, tabs */
const mins = (km, kmh, add) => { const m = Math.round(km / kmh * 60 + (add || 0)); return m >= 90 ? (m / 60).toFixed(1).replace('.0', '') + ' h' : m + ' min' };
on('place:show', p => { l2place(p); setTimeout(() => l2place(p), 400); setTimeout(() => l2place(p), 1500) });
function l2place(p) { const h = $('placeHead'); if (!p || !h || h.querySelector('.l2act') || p.name === 'My location') return;
  const o = (typeof me !== 'undefined' && me) || HOSTEL, km = dist(o[0], o[1], p.lat, p.lon) * 1.3, n = JSON.stringify(p.name).replace(/"/g, '&quot;');
  const pinB = [...h.querySelectorAll('button')].find(b => /Pin/.test(b.textContent));
  const ov = document.createElement('div'); ov.className = 'l2ov l2more';
  [...h.children].forEach(c => { if (c.tagName !== 'H3') ov.appendChild(c) });
  const h3 = h.querySelector('h3'); if (h3) { h3.insertAdjacentHTML('afterend', `<div class="muted">${esc(p.sub || '')}${p.sub ? ' · ' : ''}${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'} away</div>`) }
  h.insertAdjacentHTML('beforeend', `<div class="l2act">
    <button class="pill go" onclick="dirTo(${n},${p.lat},${p.lon},'${km > 3 ? 'r' : 'w'}')"><b>➜</b>Go</button>
    <a class="pill" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=" style="flex-direction:column;min-height:56px;border-radius:14px;font-size:.8rem;text-decoration:none"><b>⭐</b>Reviews</a>
    <button class="pill" data-l2pin><b>📌</b>Add to plan</button>
    <button class="pill" data-l2more><b>⋯</b>More</button></div>
   <div class="l2modes"${km > 500 ? " hidden" : ""}>${km < 12 ? `<button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'w')">🚶 ${mins(km, 4.8)}</button><button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'b')">🚲 ${mins(km, 14)}</button>` : ''}
    <button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'r')">🚇 ${mins(km, km > 40 ? 90 : 22, 8)}</button><button class="pill" onclick="dirTo(${n},${p.lat},${p.lon},'d')">🚕 ${mins(km, km > 40 ? 70 : 28, 3)}</button></div>${km < 3 && typeof startNav === 'function' ? `<button class="act" style="width:100%;margin:0 0 12px" onclick="startNav(${n},${p.lat},${p.lon},'foot')">🔊 Start walking navigation</button>` : ''}
   <div class="l2tabs"><button data-t="overview" class="on">Overview</button><button data-t="sights">Nearby sights</button><button data-t="transit">🚦 Live</button></div>`);
  h.appendChild(ov); ov.classList.add('open');
  const pb = h.querySelector('[data-l2pin]'); pb.onclick = () => pinB ? pinB.click() : null;
  h.querySelector('[data-l2more]').onclick = () => { setTab('overview'); ov.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) };
  h.querySelector('.l2tabs').onclick = e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t) };
  const tc = $('transit'); const card = tc && tc.closest('.card'); if (card) card.classList.add('l2transit');
  setTab('overview') }
function setTab(t) { const v = $('v-explore'); if (!v) return; v.dataset.pt = t; document.querySelectorAll('.l2tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  if (t !== 'overview') { const tg = t === 'sights' ? ($('tripPlan') || $('sightsCard')) : document.querySelector('.l2transit'); if (tg && innerWidth < 1100) setTimeout(() => tg.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) } }
window.setPlaceTab = setTab;

/* Today: Tools + Translate buttons; trip tools in a toggle */
on('today:render', function l2today() { const w = document.querySelector('.xtraT'); if (!w || w.querySelector('.l2today')) return;
  w.insertAdjacentHTML('afterbegin', `<div class="l2today"><button class="act" data-l2t>🧰 Tools</button><button class="pill" onclick="openTalk()">🗣️ Translate</button><button class="pill" onclick="showTripQR()">👫 Share</button></div>`);
  w.querySelector('[data-l2t]').onclick = () => { document.body.classList.toggle('l2tools'); const t = $('toolsCard'); if (t && document.body.classList.contains('l2tools')) t.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } });

function pane() { const v = $('v-explore'), m = $('map'), g = $('gmap'); if (!v || !m) return; let pn = $('l2pane');
  if (innerWidth >= 1100) { if (!pn) { pn = document.createElement('div'); pn.id = 'l2pane'; v.appendChild(pn) } if (m.parentNode !== pn) { pn.appendChild(m); g && pn.appendChild(g) } }
  else if (pn && m.parentNode === pn) { const b = $('gmapBtn'); const anchor = b ? b.parentNode : $('nearCats'); anchor.after(m); g && m.after(g) }
  setTimeout(() => { try { map && map.invalidateSize() } catch (e) { } }, 80) }
function apply() { navIcons(); seg(); chips(); pane() }
const nc = $('nearCats'); if (nc) new MutationObserver(() => chips()).observe(nc, { childList: true });
apply(); try { window.renderToday && window.renderToday() } catch (e) { }
addEventListener('resize', pane);
})();
