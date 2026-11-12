/* Akari Atlas · live two-way translator + app voice (consolidated) */

/* ---------- languages ---------- */
const TALK_LANGS = [['zh-TW', '🇹🇼 Chinese, Traditional · Taiwan (繁體中文)', 'zh-TW'], ['zh-HK', '🇭🇰 Chinese, Cantonese · Hong Kong (廣東話)', 'zh-TW'], ['zh-CN', '🇨🇳 Chinese, Simplified · Mainland China (简体中文)', 'zh-CN'], ['ja-JP', '🇯🇵 Japanese · Japan (日本語)', 'ja'], ['ko-KR', '🇰🇷 Korean · South Korea (한국어)', 'ko'], ['th-TH', '🇹🇭 Thai · Thailand (ไทย)', 'th'], ['vi-VN', '🇻🇳 Vietnamese · Vietnam (Tiếng Việt)', 'vi'], ['id-ID', '🇮🇩 Indonesian · Indonesia (Bahasa Indonesia)', 'id'], ['ms-MY', '🇲🇾 Malay · Malaysia (Bahasa Melayu)', 'ms'], ['fil-PH', '🇵🇭 Filipino · Philippines', 'tl'], ['es-ES', '🇪🇸 Spanish · Spain / Latin America (Español)', 'es'], ['fr-FR', '🇫🇷 French · France (Français)', 'fr'], ['de-DE', '🇩🇪 German · Germany (Deutsch)', 'de'], ['it-IT', '🇮🇹 Italian · Italy (Italiano)', 'it'], ['pt-PT', '🇵🇹 Portuguese · Portugal / Brazil (Português)', 'pt'], ['ru-RU', '🇷🇺 Russian · Russia (Русский)', 'ru'], ['ar-SA', '🇸🇦 Arabic · Middle East (العربية)', 'ar'], ['hi-IN', '🇮🇳 Hindi · India (हिन्दी)', 'hi'], ['tr-TR', '🇹🇷 Turkish · Türkiye (Türkçe)', 'tr'], ['nl-NL', '🇳🇱 Dutch · Netherlands (Nederlands)', 'nl'], ['en-US', '🇺🇸 English', 'en']];
const CC_LANG = { tw: 'zh-TW', cn: 'zh-CN', hk: 'zh-HK', mo: 'zh-HK', jp: 'ja-JP', kr: 'ko-KR', th: 'th-TH', vn: 'vi-VN', id: 'id-ID', my: 'ms-MY', ph: 'fil-PH', es: 'es-ES', mx: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', br: 'pt-PT', ru: 'ru-RU', sa: 'ar-SA', ae: 'ar-SA', in: 'hi-IN', tr: 'tr-TR', nl: 'nl-NL' };
const tl = c => (TALK_LANGS.find(x => x[0] === c) || [c, c, c.split('-')[0]]);
function tkClean(t) { if (!t) return t; const d = document.createElement('textarea'); d.innerHTML = t; t = d.value; d.innerHTML = t; t = d.value;
  return t.replace(/&[#a-z0-9]+;?/gi, ' ').replace(/\s+-\s+.*$/, '').replace(/\s{2,}/g, ' ').trim() }
const TK = { log: JSON.parse(localStorage.getItem('tw_talk') || '[]').map(m => ({ ...m, tr: tkClean(m.tr) })), rec: null, them: localStorage.getItem('tw_talk_lang') || CC_LANG[(window.trip && trip()?.cc) || 'tw'] || 'zh-TW' };

/* ---------- translation (MyMemory → Lingva) ---------- */
async function translate(text, from, to) { if (from === to) return text;
  const k = 'tw_tr_' + from + '|' + to + '|' + text, c = (() => { try { return JSON.parse(localStorage.getItem('tw_trc') || '{}') } catch (e) { return {} } })(); if (c[k]) return c[k];
  const keep = t => { try { c[k] = t; const ks = Object.keys(c); if (ks.length > 400) delete c[ks[0]]; localStorage.setItem('tw_trc', JSON.stringify(c)) } catch (e) { } return t };
  // 1) Google-quality translation through your own Apps Script (LanguageApp)
  try { if (CFG.API) { const g = (x, l) => l === 'zh-TW' || l === 'zh-HK' ? 'zh-TW' : l === 'zh-CN' ? 'zh-CN' : l === 'fil-PH' ? 'tl' : x; const j = await api({ action: 'tr', text, from: g(tl(from)[2], from), to: g(tl(to)[2], to) }); if (j && j.ok && j.text) return keep(tkClean(j.text)) } } catch (e) { }
  try { const j = await (await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${tl(from)[2]}|${tl(to)[2]}`)).json(); const t = j?.responseData?.translatedText; if (t && !/MYMEMORY WARNING|QUERY LENGTH/i.test(t)) return tkClean(t) } catch (e) { }
  try { const j = await (await fetch(`https://lingva.ml/api/v1/${tl(from)[2]}/${tl(to)[2]}/${encodeURIComponent(text)}`)).json(); if (j.translation) return tkClean(j.translation) } catch (e) { }
  return null }

/* ---------- voices ---------- */
const TK_BAD = JSON.parse(localStorage.getItem('tw_badvoice') || '[]');
const FEMALE = /samantha|ava|allison|susan|zoe|nicky|karen|moira|tessa|victoria|serena|kate|fiona|joelle|veena|google us english|google uk english female|jenny|aria|michelle|emma|olivia|female/i;
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|fred|eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|daniel|alex|bruce|tom|aaron|arthur|gordon|rishi|thomas/i;
function bestVoice(lang) { const vs = speechSynthesis.getVoices(), L = lang.toLowerCase(), pre = L.startsWith('zh') ? L.slice(0, 5) : L.slice(0, 2);
  const m = vs.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(pre) && !TK_BAD.includes(v.name)); if (!m.length) return null;
  const sc = v => (/premium|enhanced|natural|neural|siri/i.test(v.name) ? 50 : 0) + (/google/i.test(v.name) ? 30 : 0) + (/mei-?jia|ting-?ting|kyoko|yuna|samantha|ava|allison|o-ren|sinji/i.test(v.name) ? 20 : 0) + (FEMALE.test(v.name) ? 10 : 0) + (v.localService ? 5 : 0) - (/compact|espeak/i.test(v.name) ? 40 : 0) - (NOVELTY.test(v.name) ? 100 : 0);
  return m.sort((a, b) => sc(b) - sc(a))[0] }
pickVoice = function (lang) { if (lang && !lang.startsWith('en')) return bestVoice(lang); const vs = speechSynthesis.getVoices(), chosen = vs.find(v => v.name === D.voiceName); if (chosen) return chosen; return bestVoice('en-US') };
if (D.voiceName && NOVELTY.test(D.voiceName) && !localStorage.getItem('tw_voice_fix1')) { D.voiceName = ''; localStorage.setItem('tw_voice_fix1', '1'); try { save() } catch (e) { } }
try { speechSynthesis.getVoices() } catch (e) { }

/* ---------- built-in cloud voice (Apps Script tts), cached for offline ---------- */
const TTS_CACHE = 'tw-tts';
async function cloudVoice(text, lang) { const tl2 = lang === 'zh-HK' ? 'zh-TW' : lang.startsWith('zh') ? lang : lang.split('-')[0], k = `https://tts.local/${tl2}/${encodeURIComponent(text)}`;
  try { const c = await caches.open(TTS_CACHE), hit = await c.match(k); if (hit) return await hit.blob(); if (!CFG.API) return null;
    const j = await api({ action: 'tts', text, lang: tl2 }), blob = new Blob([Uint8Array.from(atob(j.audio), ch => ch.charCodeAt(0))], { type: 'audio/mpeg' }); try { await c.put(k, new Response(blob)) } catch (e) { } return blob } catch (e) { return null } }

/* ---------- one speaking function: cloud voice → device voice (skips broken voices) · read-along highlight ---------- */
let tkAudio = null, tkHL = null;
function readAlong(el, text, lang) { if (!el) return { mark() { }, done() { } }; const cjk = /^(zh|ja|ko|th)/i.test(lang), units = cjk ? [...text] : text.split(/(\s+)/);
  el.innerHTML = units.map((u, i) => /^\s+$/.test(u) ? u : `<span data-i="${i}" style="transition:background .12s;border-radius:4px">${esc(u)}</span>`).join('');
  const spans = [...el.querySelectorAll('span[data-i]')], offs = []; let acc = 0; units.forEach(x => { offs.push(acc); acc += x.length });
  return { n: spans.length, cjk, mark(k) { spans.forEach((s, i) => { s.style.background = i === k ? '#E7BD6888' : ''; s.style.opacity = i <= k ? '1' : '.55' }) }, at(c) { let k = 0; spans.forEach((s, i) => { if (offs[+s.dataset.i] <= c) k = i }); return k }, done() { spans.forEach(s => { s.style.background = ''; s.style.opacity = '1' }) } } }
function stopVoice() { try { speechSynthesis.cancel() } catch (e) { } try { tkAudio && tkAudio.pause() } catch (e) { } clearInterval(tkHL) }
function deviceSay(text, lang, ra, tries = 0) { const v = bestVoice(lang); if (!('speechSynthesis' in window) || !v) { ra.done(); return toast('No voice for this language on this device; connect to the internet for the built-in voice.') }
  const u = new SpeechSynthesisUtterance(text), cjk = /^(zh|ja|ko|th)/i.test(lang); u.lang = lang; u.voice = v; u.rate = cjk ? .9 : .96; u.pitch = 1.04; let got = false, s = 0;
  u.onboundary = e => { got = true; ra.mark(ra.at(e.charIndex)) };
  u.onstart = () => { s = Date.now(); ra.mark(0); const per = (cjk ? 260 : 330) / u.rate; tkHL = setInterval(() => { if (got) return clearInterval(tkHL); const k = Math.floor((Date.now() - s) / per); if (k >= ra.n) return clearInterval(tkHL); ra.mark(k) }, 60) };
  u.onend = () => { clearInterval(tkHL); ra.done(); if (s && Date.now() - s < 350 && text.length > 2 && tries < 4) { TK_BAD.push(v.name); localStorage.setItem('tw_badvoice', JSON.stringify(TK_BAD)); deviceSay(text, lang, ra, tries + 1) } };
  window._tkU = u; speechSynthesis.speak(u) }
async function sayIn(text, lang, el) { text = tkClean(String(text)).replace(/[;；]/g, '、'); stopVoice(); const ra = readAlong(el, text, lang);
  if (localStorage.getItem('tw_voice_mode') !== 'device') { const blob = await cloudVoice(text, lang); if (blob) { const a = new Audio(URL.createObjectURL(blob)); tkAudio = a; a.playbackRate = .95;
      a.ontimeupdate = () => { if (ra.n && a.duration) ra.mark(Math.min(ra.n - 1, Math.floor(a.currentTime / a.duration * ra.n))) }; a.onended = () => ra.done();
      try { await a.play(); return } catch (e) { } } }
  setTimeout(() => deviceSay(text, lang, ra), speechSynthesis.speaking ? 120 : 0) }
/* app announcements (weather, navigation, reminders): same warm voice */
const _speakDevice = speak;
speak = async function (t, lang) { if ((lang && !lang.startsWith('en')) || localStorage.getItem('tw_voice_mode') === 'device' || D.voiceName) return _speakDevice(t, lang);
  try { chime(/turn|meters/.test(t) ? 'turn' : /arrived|All set/.test(t) ? 'done' : 'note') } catch (e) { }
  const blob = await cloudVoice(String(t).slice(0, 560), 'en-US'); if (!blob) return _speakDevice(t, lang); stopVoice(); const a = new Audio(URL.createObjectURL(blob)); tkAudio = a; a.playbackRate = 1.02; a.play().catch(() => _speakDevice(t, lang)) };

/* ---------- phrases ---------- */
const TK_PHR = {
  '👋 Basics': ['Hello', 'Thank you very much', 'Excuse me', 'Sorry', 'Yes', 'No', 'I don’t understand', 'Can you speak slowly?', 'Can you write it down?'],
  '🍜 Food': ['A table for two, please', 'Do you have an English menu?', 'What do you recommend?', 'Not spicy, please', 'No pork, please', 'Is this vegetarian?', 'Can I have water?', 'The bill, please', 'To take away, please'],
  '🛍️ Shopping': ['How much is this?', 'Can you give a discount?', 'Can I pay by card?', 'Do you have a bigger size?', 'Can I try it on?', 'I’m just looking', 'Can I get a receipt?'],
  '🚆 Getting around': ['Where is the train station?', 'Which platform for this train?', 'How do I get here?', 'Please take me to this address', 'How long does it take?', 'Stop here, please', 'Where is the bus stop?'],
  '🏨 Stay': ['I have a reservation', 'Can I leave my luggage here?', 'What is the Wi-Fi password?', 'What time is check-out?', 'The air conditioner is not working'],
  '🆘 Help': ['Where is the toilet?', 'I need help', 'Please call the police', 'I need a doctor', 'I lost my passport', 'Where is the nearest pharmacy?', 'I am allergic to this'] };
Object.defineProperty(TK_PHR, '⭐ My saved', { enumerable: true, configurable: true, get: () => (D.myPhrases || []).map(p => p.en) });
let tkCat = Object.keys(TK_PHR)[0];
function tkPhrBox() { return `<div id="tkPhr" style="margin:10px 0"><div style="font-weight:700;margin-bottom:6px">📚 Common phrases</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px" id="tkCats">${Object.keys(TK_PHR).map(g => `<button class="pill ${g === tkCat ? 'on' : ''}" onclick="tkCat='${g.replace(/'/g, "\\'")}';tkPhrRender()">${g}</button>`).join('')}</div>
  <select id="tkPick" style="width:100%;margin:8px 0" onchange="if(this.value){tkPhrase(this.value);this.value=''}"></select><div id="tkChips" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>` }
function tkPhrRender(filter) { const sel = $('tkPick'), chips = $('tkChips'); if (!sel) return; document.querySelectorAll('#tkCats .pill').forEach(b => b.classList.toggle('on', b.textContent === tkCat && !filter));
  const list = filter ? Object.values(TK_PHR).flat().filter((p, i, a) => a.indexOf(p) === i && p.toLowerCase().includes(filter.toLowerCase())).slice(0, 12) : TK_PHR[tkCat];
  sel.innerHTML = `<option value="">${filter ? `🔎 ${list.length} matching “${esc(filter)}”` : `▾ Choose a ${tkCat.replace(/^\S+\s/, '').toLowerCase()} phrase…`}</option>` + list.map(p => `<option>${esc(p)}</option>`).join('');
  chips.innerHTML = (filter && !list.length ? `<span class="muted">No saved phrase matches. Tap Translate to translate your own words.</span>` : '') + list.map(p => `<button class="pill" style="white-space:normal;text-align:left" onclick="tkPhrase(${JSON.stringify(p).replace(/"/g, '&quot;')})">${esc(p)}</button>`).join('') }
async function tkPhrase(t) { await tkHandle(t, 'en-US') }

/* ---------- translator screen ---------- */
function openTalk() { const s = $('sheet'); s.classList.add('on');
  s.innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">🗣️ Live translator</h3><button class="pill" onclick="closeTalk()">✕</button></div>
  <label class="muted" style="display:block">🌏 The other person speaks: <b id="tkLangNow">${esc(tl(TK.them)[1])}</b><select id="tkLang" style="width:100%;margin-top:4px" onchange="tkLangChange(this.value)">${TALK_LANGS.filter(x => x[0] !== 'en-US').map(x => `<option value="${x[0]}" ${x[0] === TK.them ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label>
  <div id="tkShow" style="margin:10px 0;padding:18px;border-radius:18px;background:var(--inbg);min-height:110px;text-align:center"></div>
  <div class="grid2" style="gap:8px"><button class="act" style="padding:16px;font-size:16px" onclick="tkListen('en-US')">🎙️ I speak<br><small>English</small></button><button class="act" style="padding:16px;font-size:16px;background:var(--coral,#E98B73)" onclick="tkListen(TK.them)">🎙️ They speak<br><small>${esc(tl(TK.them)[1].split(' (')[0])}</small></button></div>
  <div class="row" style="margin-top:8px;gap:6px"><input id="tkType" placeholder="Or type in English…" style="flex:1" onkeydown="if(event.key==='Enter')tkTyped()" oninput="const v=this.value.trim();tkPhrRender(v.length>=2?v:'')"><button class="pill" onclick="tkTyped()">Translate</button></div>
  <div id="tkSt" class="muted" style="margin:6px 0"></div>${tkPhrBox()}<h3 style="margin:14px 0 6px">Conversation</h3><div id="tkLog"></div>
  <div class="row" style="gap:6px;margin-top:8px"><button class="pill" onclick="tkSavePhrase()">⭐ Save last as phrase</button><button class="pill" onclick="tkClear(this)">🗑️ Clear</button></div>
  <p class="muted" style="font-size:12px">Speech works best in Chrome (Android) and Safari (iPhone). Translations are free machine translation; double-check anything important (medicine, money, addresses).</p></div>`;
  tkRender(); tkPhrRender() }
function closeTalk() { try { TK.rec && TK.rec.stop() } catch (e) { } stopVoice(); closeSheet() }
function tkSave() { localStorage.setItem('tw_talk', JSON.stringify(TK.log.slice(-60))) }
function tkRender() { const last = TK.log[TK.log.length - 1], show = $('tkShow');
  if (show) { show.innerHTML = !last ? '<div class="muted">Tap a mic and talk. The translation appears here in big letters to show the other person, and is read aloud.</div>'
    : `<div class="muted" style="font-size:13px">${last.me ? 'Show them 👇' : 'They said 👇'}</div><div data-big="1" style="font-size:${last.me ? 30 : 24}px;font-weight:700;line-height:1.35;margin:6px 0">${esc(last.tr)}</div><div class="muted">${esc(last.src)}</div><button class="pill" style="margin-top:8px" id="tkAgain">🔊 Play again</button>`;
    const b = $('tkAgain'); if (b) b.onclick = () => sayIn(last.tr, last.me ? last.to : 'en-US', show.querySelector('[data-big]')) }
  const lg = $('tkLog'); if (lg) lg.innerHTML = TK.log.slice().reverse().map(m => `<div style="margin:6px 0;display:flex;${m.me ? 'justify-content:flex-end' : ''}"><div style="max-width:85%;padding:8px 12px;border-radius:14px;background:${m.me ? 'var(--leaf,#28546B);color:#fff' : 'var(--inbg)'}"><b>${esc(m.tr)}</b><div style="font-size:12px;opacity:.8">${esc(m.src)}</div></div></div>`).join('') }
async function tkHandle(text, from) { const me = from === 'en-US', to = me ? TK.them : 'en-US'; $('tkSt').textContent = '🔄 Translating…';
  const tr = (me && (D.offPhr || {})[to + text]) || await translate(text, from, to); if (!tr) { $('tkSt').textContent = 'Translation needs internet. Try again.'; return }
  TK.log.push({ me, src: text, tr, from, to, at: Date.now() }); tkSave(); $('tkSt').textContent = ''; tkRender(); sayIn(tr, to, document.querySelector('#tkShow [data-big]')) }
function tkTyped() { const v = $('tkType').value.trim(); if (!v) return; $('tkType').value = ''; tkPhrRender(''); tkHandle(v, 'en-US') }
const MIC_ERR = { 'not-allowed': '🎙️ Microphone blocked. Allow it: iPhone Settings → Safari → Microphone → Allow (or tap aA → Website Settings). Android: tap 🔒 in the address bar → Permissions → Microphone.', 'service-not-allowed': '🎙️ Speech recognition is off. iPhone: Settings → General → Keyboard → Enable Dictation, and Siri & Dictation must be allowed.', 'audio-capture': '🎙️ No microphone found.', 'no-speech': '🎙️ Didn’t hear anything. Tap the mic and hold the phone closer.', 'network': '🎙️ Voice needs internet.' };
function tkListen(lang) { const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('tkSt').innerHTML = '🎙️ Voice input isn’t available in this browser. Open the app in <b>Safari</b> (iPhone) or <b>Chrome</b> (Android), or type below.'; return }
  try { TK.rec && TK.rec.abort() } catch (e) { } const r = new SR(); TK.rec = r; r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; let fin = '';
  $('tkSt').innerHTML = `🎙️ Listening in <b>${esc(tl(lang)[1])}</b>… speak now`;
  r.onresult = e => { let it = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else it += e.results[i][0].transcript } $('tkSt').textContent = '🎙️ ' + (fin + it) };
  r.onerror = e => { $('tkSt').innerHTML = MIC_ERR[e.error] || '🎙️ Didn’t catch that, tap the mic again.' };
  r.onend = () => { if (fin.trim()) tkHandle(fin.trim(), lang) }; r.start() }
function tkSavePhrase() { const m = [...TK.log].reverse().find(x => x.me); if (!m) return toast('Say something first'); (D.myPhrases = D.myPhrases || []).push({ en: m.src, tr: m.tr, lang: m.to }); save(); toast('Saved to your phrases ⭐') }
function tkClear(b) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '⚠️ Tap again to clear'; setTimeout(() => { b.dataset.sure = ''; b.textContent = '🗑️ Clear' }, 3000); return }
  TK.log = []; tkSave(); stopVoice(); tkRender(); b.dataset.sure = ''; b.textContent = '🗑️ Clear'; toast('Conversation cleared') }

/* floating button on every tab */
(function () { const b = document.createElement('button'); b.id = 'talkFab'; b.title = 'Live translator'; b.textContent = '🗣️'; b.onclick = () => openTalk();
  b.style.cssText = 'position:fixed;right:14px;bottom:92px;z-index:50;width:46px;height:46px;border-radius:50%;border:none;font-size:20px;background:#E98B73;color:#fff;box-shadow:0 6px 18px #28546b55;cursor:pointer'; document.body.appendChild(b) })();

/* switching language re-translates your last line, so Play again speaks the language you just picked */
async function tkLangChange(v) { TK.them = v; localStorage.setItem('tw_talk_lang', v); openTalk(); const last = [...TK.log].reverse().find(m => m.me);
  if (last && last.to !== v) { $('tkSt').textContent = '🔄 Translating into ' + tl(v)[1].split(' (')[0] + '…'; const tr = await translate(last.src, 'en-US', v); $('tkSt').textContent = '';
    if (tr) { TK.log.push({ me: true, src: last.src, tr, from: 'en-US', to: v, at: Date.now() }); tkSave(); tkRender(); sayIn(tr, v, document.querySelector('#tkShow [data-big]')) } } }
