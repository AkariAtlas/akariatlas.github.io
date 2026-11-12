/* Akari Atlas · built-in self-test: open the app with ?selftest to run the core flows (read-only) and see pass/fail */
window.runSelfTest = async function () {
  const R = [], ok = (n, v, d) => R.push([n, !!v, d || '']), wait = ms => new Promise(r => setTimeout(r, ms)), click = v => document.querySelector(`[data-v="${v}"]`)?.click();
  const box = document.createElement('div'); box.id = 'akTest'; box.style.cssText = 'position:fixed;inset:12px;z-index:99999;background:#F7F2E8;color:#343B3B;border-radius:18px;padding:16px;overflow:auto;font:14px Quicksand,sans-serif;box-shadow:0 10px 40px #0006';
  box.innerHTML = '<h2 style="font-family:Kaisei Decol,serif;color:#28546B;margin:0 0 8px">🧪 Self-test running…</h2><div id="akTestL"></div>'; document.body.appendChild(box);
  const show = () => { $('akTestL').innerHTML = R.map(([n, p, d]) => `<div>${p ? '✅' : '❌'} ${n}${d ? ` <span style="color:#6b7575">· ${esc(String(d)).slice(0, 120)}</span>` : ''}</div>`).join('') };
  const snap = JSON.stringify([D.routes, D.stopx, D.exps, D.trip]); const errs0 = JSON.parse(localStorage.getItem('ak_errlog') || '[]').length;
  try {
    ok('Core loaded', typeof D === 'object' && typeof emit === 'function' && typeof SEARCH === 'object'); ok('Trip set up', !!trip()?.start, trip()?.name); show();
    for (const [v, min] of [['today', 2], ['explore', 1], ['plan', 1], ['money', 3], ['docs', 2]]) { click(v); await wait(1500); const n = document.querySelectorAll(`#v-${v} .card`).length; ok(`Tab ${v} renders`, n >= min, n + ' cards'); show() }
    click('plan'); try { selDay(curDay) } catch (e) { } await wait(4000); ok('Plan: schedule summary', !!document.querySelector('.skSum')); ok('Plan: ✨ suggest bar', !!document.getElementById('autoSt')); show();
    click('today'); await wait(2500); ok('Today: what’s next', !!document.getElementById('nextUp') || !(D.routes[0] || []).length); show();
    click('explore'); const q = $('q'); q.value = 'Taipei 101'; await autocomplete(q.value); ok('Search: place', /101/i.test($('ac').innerText), $('ac').innerText.split('\n')[0]); $('ac').innerHTML = ''; q.value = ''; show();
    const tr = await translate('Thank you', 'en-US', 'zh-TW'); ok('Translate', !!tr, tr); show();
    const b = await cloudVoice('你好', 'zh-TW'); ok('Built-in voice', !!b && b.size > 500, b && b.size + ' bytes'); show();
    if ((D.routes[1] || []).length) { const S = await buildSched(1); ok('Schedule maths', S.stops.length && S.end > S.stops[0].arr, fmtT(S.stops[0].arr) + '→' + fmtT(S.end)) } show();
    const oc = URL.createObjectURL; let pdf = 0; URL.createObjectURL = function (x) { if (x && /pdf/.test(x.type)) pdf = x.size; return oc.apply(this, arguments) }; const oa = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (/blob:/.test(this.href)) return; return oa.apply(this, arguments) };
    const shr = navigator.share; try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) } catch (e) { }
    try { openPdf(); await wait(200); await makePdf(); closeSheet() } catch (e) { ok('PDF', false, e.message) } URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = oa; try { Object.defineProperty(navigator, 'share', { value: shr, configurable: true }) } catch (e) { }
    ok('PDF generated', pdf > 20000, Math.round(pdf / 1024) + ' KB'); ok('Plan untouched after PDF', JSON.stringify([D.routes, D.stopx, D.exps, D.trip]) === snap); show();
    ok('Network cache working', (window.AKNET?.hit || 0) + (window.AKNET?.net || 0) > 0, JSON.stringify(window.AKNET));
    const e1 = JSON.parse(localStorage.getItem('ak_errlog') || '[]'); ok('No new errors', e1.length === errs0, e1.slice(errs0).map(x => x.m).join(' | '));
    /* regression guards for bugs found in live use */
    { const f = localStorage.getItem('ak_viewonly'); ok('View-only flag is clean', f === null || f === '1', f || 'not set') }
    click('explore'); await wait(800); ok('Explore fits the screen width', document.documentElement.scrollWidth <= innerWidth + 1, document.documentElement.scrollWidth + ' / ' + innerWidth);
    ok('Category tiles show', [...document.querySelectorAll('#nearCats>button')].filter(b => b.offsetParent).length >= 5);
    try { await showTripQR('device'); await wait(400); ok('Share QR opens', !!document.querySelector('#qrSheet svg')); document.getElementById('qrSheet')?.remove() } catch (e) { ok('Share QR opens', false, e.message) }
    { const m = merge3({ a: [1, 2], r: { d1: ['A'], d2: ['B'] } }, { a: [1, 2, 3], r: { d1: ['A', 'C'], d2: ['B'] } }, { a: [2, 4], r: { d1: ['A'], d2: ['B', 'D'] } }, true, 0);
      ok('Sync merges edits from two devices', JSON.stringify(m) === JSON.stringify({ a: [2, 3, 4], r: { d1: ['A', 'C'], d2: ['B', 'D'] } }), JSON.stringify(m)) }
    if (DC() === 'TWD' && trip()?.start) { click('today'); await wait(1500); ok('Live near you card', !!document.getElementById('liveCard')) }
    show();
  } catch (e) { ok('Self-test crashed', false, e.message) }
  const pass = R.filter(r => r[1]).length; box.querySelector('h2').textContent = `🧪 Self-test: ${pass}/${R.length} passed`; show();
  box.insertAdjacentHTML('beforeend', `<button class="act" style="margin-top:10px" onclick="this.parentElement.remove()">Close</button>`); window.AK_TEST = { pass, total: R.length, R }; return window.AK_TEST };
if (/[?&]selftest/.test(location.search)) setTimeout(() => runSelfTest(), 6000);
