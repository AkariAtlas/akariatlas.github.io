/* Akari Atlas · tiny event hooks: features subscribe instead of wrapping functions */
const HOOKS = {}; function on(n, f) { (HOOKS[n] = HOOKS[n] || []).push(f) }
async function emit(n, ...a) { const lg = (e) => { try { window.akLog && akLog(n + ': ' + (e && e.message || e), 'hook') } catch (x) { } console.error(n, e) }; const ps = []; for (const f of HOOKS[n] || []) { try { const r = f(...a); if (r && r.then) ps.push(r.catch(lg)) } catch (e) { lg(e) } } await Promise.all(ps) }
/* ================= MULTI-TRIP REGISTRY (worldwide, with history) =================
   Every per-trip key in localStorage ("tw_*") is namespaced by the current trip id, so each trip keeps its own
   data, sync code, Drive file and caches. Trip "t1" keeps the original un-prefixed keys (backward compatible). */
(function () {
  const RAW_GET = Storage.prototype.getItem, RAW_SET = Storage.prototype.setItem, RAW_DEL = Storage.prototype.removeItem;
  const GLOBAL = new Set(['tw_reg', 'tw_api', 'tw_dark']);
  const reg = (() => { try { return JSON.parse(RAW_GET.call(localStorage, 'tw_reg') || 'null') } catch (e) { return null } })() || { cur: 't1', list: { t1: {} } };
  window.TRIPREG = reg;
  const k = key => (key.startsWith('tw_') && !GLOBAL.has(key) && reg.cur !== 't1') ? reg.cur + ':' + key : key;
  Storage.prototype.getItem = function (key) { return this === localStorage ? RAW_GET.call(this, k(key)) : RAW_GET.call(this, key) };
  Storage.prototype.setItem = function (key, v) { return this === localStorage ? RAW_SET.call(this, k(key), v) : RAW_SET.call(this, key, v) };
  Storage.prototype.removeItem = function (key) { return this === localStorage ? RAW_DEL.call(this, k(key)) : RAW_DEL.call(this, key) };
  window.regSave = () => RAW_SET.call(localStorage, 'tw_reg', JSON.stringify(reg));
  window.tripState = id => { try { return JSON.parse(RAW_GET.call(localStorage, (id === 't1' ? '' : id + ':') + 'tw_state') || '{}') } catch (e) { return {} } };
  window.switchTrip = id => { reg.cur = id; regSave(); sessionStorage.clear(); location.hash = ''; location.reload() };
  window.newTrip = () => { const id = 't' + Date.now().toString(36); reg.list[id] = {}; reg.cur = id; regSave(); RAW_DEL.call(localStorage, id + ':tw_view'); location.hash = ''; location.reload() };
  window.deleteTrip = id => { if (id === reg.cur) return; Object.keys(localStorage).filter(x => x.startsWith(id + ':')).forEach(x => RAW_DEL.call(localStorage, x)); delete reg.list[id]; regSave() };
  window.APP_NAME = 'Akari Atlas'; window.TAGLINE = 'Your world, one journey at a time.';
})();

/* Country → currency, language for phrases */
const CC_CUR = { tw: 'TWD', ph: 'PHP', jp: 'JPY', kr: 'KRW', cn: 'CNY', hk: 'HKD', mo: 'MOP', sg: 'SGD', my: 'MYR', th: 'THB', vn: 'VND', id: 'IDR', kh: 'KHR', la: 'LAK', mm: 'MMK', in: 'INR', ae: 'AED', sa: 'SAR', qa: 'QAR', tr: 'TRY', us: 'USD', ca: 'CAD', mx: 'MXN', br: 'BRL', au: 'AUD', nz: 'NZD', gb: 'GBP', ch: 'CHF', no: 'NOK', se: 'SEK', dk: 'DKK', is: 'ISK', cz: 'CZK', pl: 'PLN', hu: 'HUF', za: 'ZAR', eg: 'EGP' };
['fr', 'de', 'it', 'es', 'pt', 'nl', 'be', 'at', 'ie', 'fi', 'gr', 'ee', 'lv', 'lt', 'sk', 'si', 'hr', 'cy', 'mt', 'lu'].forEach(c => CC_CUR[c] = 'EUR');
const CUR_SYM = { TWD: 'NT$', PHP: '₱', JPY: '¥', KRW: '₩', CNY: '¥', HKD: 'HK$', SGD: 'S$', MYR: 'RM', THB: '฿', VND: '₫', IDR: 'Rp', USD: 'US$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', INR: '₹', AED: 'AED ', CHF: 'CHF ' };
const sym = c => CUR_SYM[c] || (c + ' ');
