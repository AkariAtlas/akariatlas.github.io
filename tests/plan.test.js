// Guards plan editing: anchors stay put, day extras follow their stops, moves keep notes. Run: node tests/plan.test.js
const fs = require('fs'), assert = require('assert');
const read = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');
const grab = (src, name) => { const i = src.search(new RegExp('(async )?function ' + name + '\\(')); assert(i >= 0, 'missing ' + name); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break } return src.slice(i, j + 1) };
const itin = read('itin.js'), cmp = read('compare.js'), dnd = read('dnd.js');
const code = [grab(itin, 'dayX'), grab(itin, 'setDayX'), grab(cmp, 'ensureAnchors'), grab(dnd, 'moveStop')].join('\n');
const mk = () => { const ctx = { D: null, DAYS: ['d0', 'd1', 'd2'], curDay: 0, toast() { }, save() { }, renderPlan() { }, retimeDay: async () => { }, renderDir() { }, renderSched() { },
  trip: () => ({ base: { name: 'PlainStay Hostel', lat: 25.05, lon: 121.51 }, out: 'BR262 · Dec 12 · 3:40 AM', back: 'BR261 · Dec 19 · 6:00 PM' }),
  nearestAirport: async () => ({ name: 'Taoyuan Airport', lat: 25.08, lon: 121.23 }), flightTime: s => { const m = String(s).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); return m ? [(+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0), +m[2]] : null } };
  return ctx };
(async () => {
  const c = mk(); c.D = { routes: { 0: [['ASW Tea House', 25.04, 121.51, ''], ['SynTrend', 25.04, 121.53, '']], 1: [['Zoo', 1, 1, '']], 2: [['Shop', 1, 1, '']] }, stopx: { '0:0': { note: 'Land, immigration & SIM. BR262 · Dec 12 · 3:40 AM', time: '08:30' } } };
  const f = new Function(...Object.keys(c), code + '; return { ensureAnchors, dayX, moveStop: typeof moveStop==="function"?moveStop:null };');
  const api = f(...Object.values(c)); const D = c.D;
  await api.ensureAnchors(1);
  assert.deepStrictEqual(D.routes[0].map(r => r[0]), ['Taoyuan Airport (arrival)', 'PlainStay Hostel (drop bags)', 'ASW Tea House', 'SynTrend']);
  const x = api.dayX(0); assert(/immigration/.test(x[0].note) && x[0].time === '06:00', 'arrival note/time on airport'); assert(!x[2].note, 'stray note removed from tea house');
  assert.strictEqual(D.routes[2].slice(-1)[0][0], 'Taoyuan Airport (departure)'); assert.strictEqual(api.dayX(2).slice(-1)[0].time, '15:00');
  await api.ensureAnchors(1); assert.strictEqual(D.routes[0].length, 4, 'idempotent');
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1) });
