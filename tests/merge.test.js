// Guards the shared-trip merge and checks the built bundle parses. Run: node tests/merge.test.js
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/sync2.js', 'utf8');
const body = src.slice(src.indexOf('const SYNC_SKIP'), src.indexOf('function syncBase'));
const { merge3 } = new Function(body + '; return { merge3 };')();
const m = merge3({ a: [1, 2], r: { d1: ['A'], d2: ['B'] }, n: 'x' }, { a: [1, 2, 3], r: { d1: ['A', 'C'], d2: ['B'] }, n: 'x' }, { a: [2, 4], r: { d1: ['A'], d2: ['B', 'D'] }, n: 'y' }, true, 0);
assert.deepStrictEqual(m, { a: [2, 3, 4], r: { d1: ['A', 'C'], d2: ['B', 'D'] }, n: 'y' });
new Function(fs.readFileSync(__dirname + '/../akari.js', 'utf8'));
for (const f of fs.readdirSync(__dirname + '/../src')) if (/localStorage\.setItem\('ak_viewonly', (?!'1')/.test(fs.readFileSync(__dirname + '/../src/' + f, 'utf8'))) throw new Error('ak_viewonly written with non-"1" value in ' + f);
console.log('ok');
