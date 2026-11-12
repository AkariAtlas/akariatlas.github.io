/**
 * Akari Atlas — free backend (Google Apps Script + Google Sheet)
 * - Saves each trip's data in a private Sheet (never deleted unless you delete the row)
 * - Proxies Taiwan TDX live transport data so your TDX secret never sits in the public app
 *
 * SETUP: see README.md. Script Properties needed:
 *   TDX_ID, TDX_SECRET  (free from https://tdx.transportdata.tw  — optional, enables live trains & YouBike)
 */

const SHEET_NAME = 'trips';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(['code', 'keyHash', 'json', 'updated', 'created']); }
  return sh;
}
const hash_ = s => Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s));
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

function doGet() { return out_({ ok: true, app: 'taiwan-trip' }); }

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    if (b.action === 'create') return out_(create_(b));
    if (b.action === 'load') return out_(load_(b));
    if (b.action === 'save') return out_(save_(b));
    if (b.action === 'tdx') return out_(tdx_(b));
    if (b.action === 'tts') return out_(tts_(b));
    if (b.action === 'proxy') return out_(proxy_(b));
    if (b.action === 'tr') return out_(tr_(b));
    if (b.action === 'pair') return out_(pair_(b));
    if (b.action === 'claim') return out_(claim_(b));
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function find_(code) {
  const sh = sheet_(); const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === code) return { sh, row: i + 1, vals: v[i] };
  return null;
}
function auth_(b) { const f = find_(b.code); if (!f || f.vals[1] !== hash_(b.key || '')) throw 'Wrong trip code or key'; return f; }

function create_(b) {
  const code = 'TW' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const key = Utilities.getUuid();
  sheet_().appendRow([code, hash_(key), b.json || '{}', new Date(), new Date()]);
  return { ok: true, code, key };
}
function load_(b) { const f = auth_(b); return { ok: true, json: f.vals[2], updated: +new Date(f.vals[3]) }; }
function save_(b) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { const f = auth_(b); f.sh.getRange(f.row, 3, 1, 2).setValues([[b.json, new Date()]]); return { ok: true }; }
  finally { lock.releaseLock(); }
}

/* ---------- 4-digit join PIN: owner-only to create, 10 min, single use, guess-limited ---------- */
function pair_(b) { auth_(b); const c = CacheService.getScriptCache();
  for (let i = 0; i < 40; i++) { const pin = String(Math.floor(1000 + Math.random() * 9000)); if (c.get('pin_' + pin)) continue;
    c.put('pin_' + pin, JSON.stringify({ code: b.code, key: b.key }), 600); return { ok: true, pin, ttl: 600 } }
  throw 'Busy, try again'; }
function claim_(b) { const c = CacheService.getScriptCache(); const fails = +(c.get('pinfail') || 0);
  if (fails >= 30) throw 'Too many tries. Wait 10 minutes or ask for a new code';
  const pin = String(b.pin || '').replace(/\D/g, ''); const v = /^\d{4}$/.test(pin) && c.get('pin_' + pin);
  if (!v) { c.put('pinfail', String(fails + 1), 600); throw 'Code not found or expired'; }
  c.remove('pin_' + pin); const j = JSON.parse(v); return { ok: true, code: j.code, key: j.key }; }

/* ---------- TDX live transport proxy (only whitelisted read-only paths) ---------- */
function tdxToken_() {
  const c = CacheService.getScriptCache(); const t = c.get('tdx'); if (t) return t;
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('TDX_ID'), sec = p.getProperty('TDX_SECRET');
  if (!id || !sec) throw 'TDX not configured';
  const r = UrlFetchApp.fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
    method: 'post', payload: { grant_type: 'client_credentials', client_id: id, client_secret: sec }
  });
  const j = JSON.parse(r.getContentText()); c.put('tdx', j.access_token, 3000); return j.access_token;
}
function tdx_(b) {
  const path = String(b.path || '');
  if (!/^\/(v2|v3)\/(Rail|Bike|Bus)\//.test(path)) throw 'path not allowed';
  const key = 'p' + hash_(path).slice(0, 40); const c = CacheService.getScriptCache(); const hit = c.get(key);
  if (hit) return { ok: true, data: JSON.parse(hit), cached: true };
  const r = UrlFetchApp.fetch('https://tdx.transportdata.tw/api/basic' + path, {
    headers: { authorization: 'Bearer ' + tdxToken_() }, muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return { ok: false, error: 'TDX ' + r.getResponseCode() };
  const txt = r.getContentText(); if (txt.length < 90000) c.put(key, txt, 30); // 30 s cache keeps it live but within free quota
  return { ok: true, data: JSON.parse(txt) };
}


/* Built-in voice for the translator: returns MP3 (base64) for short text. Cached 6h. */
function tts_(b) {
  var text = String(b.text || '').slice(0, 600), lang = String(b.lang || 'en').replace(/[^A-Za-z-]/g, '').slice(0, 8);
  if (!text) return { ok: false, error: 'no text' };
  var key = 'tts_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, lang + '|' + text));
  var c = CacheService.getScriptCache(), hit = c.get(key); if (hit) return { ok: true, audio: hit, cached: true };
  var parts = text.match(/[\s\S]{1,190}([\s，。！？、,.!?]|$)/g) || [text], chunks = [];
  for (var i = 0; i < parts.length; i++) {
    var r = UrlFetchApp.fetch('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + encodeURIComponent(lang) + '&q=' + encodeURIComponent(parts[i]),
      { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://translate.google.com/' } });
    if (r.getResponseCode() !== 200) return { ok: false, error: 'voice ' + r.getResponseCode() };
    chunks = chunks.concat(r.getContent());
  }
  var b64 = Utilities.base64Encode(chunks);
  try { if (b64.length < 95000) c.put(key, b64, 21600); } catch (e) {}
  return { ok: true, audio: b64 };
}

/* Relay for free map/weather services when they rate-limit the app (allow-listed hosts only, cached 6h) */
function proxy_(b) {
  var url = String(b.url || ''), m = url.match(/^https:\/\/([^\/]+)\//); if (!m) return { ok: false, error: 'bad url' };
  var ok = /^(photon\.komoot\.io|nominatim\.openstreetmap\.org|overpass-api\.de|overpass\.kumi\.systems|maps\.mail\.ru|overpass\.private\.coffee|routing\.openstreetmap\.de|api\.open-meteo\.com|archive-api\.open-meteo\.com|open\.er-api\.com|api\.mymemory\.translated\.net)$/.test(m[1]);
  if (!ok) return { ok: false, error: 'host not allowed' };
  var method = b.method === 'POST' ? 'post' : 'get', body = String(b.body || '').slice(0, 20000);
  var key = 'px_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, method + url + body));
  var c = CacheService.getScriptCache(), hit = c.get(key); if (hit) return { ok: true, text: hit, cached: true };
  var opt = { method: method, muteHttpExceptions: true, headers: { 'User-Agent': 'AkariAtlas/1.0 (travel planner)' } };
  if (method === 'post') { opt.payload = body; opt.contentType = 'application/x-www-form-urlencoded' }
  var r = UrlFetchApp.fetch(url, opt); if (r.getResponseCode() >= 400) return { ok: false, error: 'upstream ' + r.getResponseCode() };
  var text = r.getContentText(), type = String(r.getHeaders()['Content-Type'] || 'application/json');
  try { if (text.length < 95000) c.put(key, text, 21600) } catch (e) {}
  return { ok: true, text: text, type: type };
}


/* Translation with Google quality via LanguageApp (free in Apps Script), cached 6h */
function tr_(b) {
  var text = String(b.text || '').slice(0, 1500), from = String(b.from || 'en').replace(/[^A-Za-z-]/g, ''), to = String(b.to || 'zh-TW').replace(/[^A-Za-z-]/g, '');
  if (!text) return { ok: false, error: 'no text' };
  var key = 'tr_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, from + '|' + to + '|' + text));
  var c = CacheService.getScriptCache(), hit = c.get(key); if (hit) return { ok: true, text: hit, cached: true };
  var out = LanguageApp.translate(text, from, to); try { c.put(key, out, 21600) } catch (e) {}
  return { ok: true, text: out };
}
