/* Akari Atlas · import bookings from ANY email: paste / upload (PDF, image, .eml, .txt) / share sheet / Outlook sign-in */
const OUTLOOK_CLIENT_ID = ''; // set after registering the free Microsoft app (Azure "App registrations")

async function applyBookings(flights, hotels, srcLabel) {
  const today = new Date(); today.setHours(0, 0, 0, 0); const nF = flights.length, nH = hotels.length;
  flights = flights.filter(f => f.date >= today).sort((a, b) => a.date - b.date); hotels = hotels.filter(x => (x.end || x.start) >= today);
  if (flights[0] && hotels.length > 1) hotels.sort((a, b) => Math.abs(a.start - flights[0].date) - Math.abs(b.start - flights[0].date)); else hotels.sort((a, b) => a.start - b.start);
  const skipped = (nF - flights.length) + (nH - hotels.length), h = hotels[0], fOut = flights[0], fBack = flights.length > 1 ? flights[flights.length - 1] : null;
  const start = h?.start || fOut?.date, end = h?.end || fBack?.date, set = (id, v) => { const e = $(id); if (e && v) e.value = v };
  set('wStart', start && iso(start)); set('wEnd', end && iso(end));
  const fmt = f => `${f.no} · ${f.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${f.time ? ' · ' + f.time : ''}${f.from ? ' · ' + f.from.slice(0, 40) : ''}`;
  if (fOut) set('wOut', fmt(fOut)); if (fBack) set('wBack', fmt(fBack));
  if (h) { set('wBaseQ', h.name); set('wAddr', h.zh); try { const q = h.name || h.addr; const r = await photonQ(q, 25, 121, 3); const n = r[0] || (await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(h.addr || q)}&format=jsonv2&limit=1&addressdetails=1`)).json()).map(x => ({ name: x.name, lat: +x.lat, lon: +x.lon, cc: x.address?.country_code }))[0];
    if (n) { const cc = (n.cc || '').toLowerCase(); wizBase = { name: h.name || n.name, lat: n.lat, lon: n.lon, cc, cur: CC_CUR[cc] || 'USD', country: '' } } } catch (e) { } }
  const st = $('gmStatus'); const msg = `✅ ${srcLabel}: found ${flights.length} upcoming flight${flights.length === 1 ? '' : 's'} and ${hotels.length} stay${hotels.length === 1 ? '' : 's'}.${skipped ? ` Skipped ${skipped} past.` : ''} Check the fields, then tap Save.${!h && !fOut ? ' Nothing matched, please fill in manually.' : ''}`;
  if (st) st.innerHTML = msg; toast(msg.slice(2, 80)); return { flights, hotels } }
function parseBookingText(t) { const flights = [], hotels = []; t = String(t || '').replace(/\r/g, '');
  // split multi-email pastes; parse each chunk
  (t.split(/\n(?=From:|Subject:|-----Original Message)/i)).forEach(c => { const subj = (c.match(/Subject:\s*(.+)/i) || [])[1] || c.slice(0, 120);
    parseFlights(c).forEach(f => { if (!flights.some(x => x.no === f.no && +x.date === +f.date)) flights.push(f) }); const h = parseHotel(c, subj); if (h && h.start) hotels.push(h) });
  return { flights, hotels } }
async function fileText(f) { const n = (f.name || '').toLowerCase();
  if (/pdf$/.test(f.type) || n.endsWith('.pdf')) { if (!window.pdfjsLib) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; const doc = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; let out = '';
    for (let p = 1; p <= Math.min(doc.numPages, 12); p++) { const c = await (await doc.getPage(p)).getTextContent(); let lastY = null; c.items.forEach(it => { const y = it.transform[5]; out += (lastY != null && Math.abs(y - lastY) > 4 ? '\n' : ' ') + it.str; lastY = y }); out += '\n' } return out }
  if (/^image\//.test(f.type)) { if (!window.Tesseract) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
    return (await Tesseract.recognize(f, 'eng')).data.text }
  let t = await f.text(); if (n.endsWith('.eml') || /^(Received|From|MIME-Version):/m.test(t)) { t = t.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); if (/<html|<body/i.test(t)) { const d = new DOMParser().parseFromString(t.slice(t.search(/<html|<body/i)), 'text/html'); t = (t.match(/Subject:.*$/m) || [''])[0] + '\n' + d.body.innerText } }
  else if (/<html|<body/i.test(t)) t = new DOMParser().parseFromString(t, 'text/html').body.innerText; return t }
function openPasteImport(prefill) { $('sheet').classList.add('on'); $('sheet').innerHTML = `<div class="sheetIn" style="max-height:92vh;overflow:auto"><div class="row sp"><h3 style="margin:0">📎 Add bookings from any email</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <p class="muted">Works with Gmail, Outlook, Yahoo, iCloud, Proton, airline apps… Read on this device only.</p>
  <textarea id="impTxt" rows="8" placeholder="Paste the whole flight or hotel confirmation email here (you can paste several)…" style="width:100%">${esc(prefill || '')}</textarea>
  <label class="pill" style="display:inline-block;margin:8px 0;cursor:pointer">📄 Upload e-ticket / itinerary (PDF, photo, .eml)<input type="file" multiple accept=".pdf,.eml,.txt,.html,image/*" style="display:none" onchange="impFiles(this.files)"></label>
  <div id="impSt" class="muted"></div><button class="act" style="width:100%;margin-top:8px" onclick="impRun()">✨ Read bookings</button>
  ${OUTLOOK_CLIENT_ID ? `<button class="act" style="width:100%;margin-top:8px;background:#0078d4" onclick="closeSheet();outlookImport()">📨 Find bookings in Outlook / Hotmail</button>` : ''}</div>` }
async function impFiles(fs) { const st = $('impSt'); let all = ''; for (const f of fs) { st.textContent = `📖 Reading ${f.name}…`; try { all += '\n\n' + await fileText(f) } catch (e) { st.textContent = `Couldn’t read ${f.name}` } } $('impTxt').value = ($('impTxt').value + all).trim(); st.textContent = `✅ Loaded ${fs.length} file${fs.length > 1 ? 's' : ''}. Tap Read bookings.` }
async function impRun() { const t = $('impTxt').value; if (!t.trim()) return toast('Paste an email or upload a file first'); const { flights, hotels } = parseBookingText(t);
  closeSheet(); if (!$('wStart') && typeof openWizard === 'function') openWizard(); await new Promise(r => setTimeout(r, 300)); applyBookings(flights, hotels, 'From your email') }

/* share an email/text from any mail app into Akari Atlas (manifest share_target → ?share=1&text=…) */
(function () { const u = new URL(location.href); if (!u.searchParams.has('share')) return; const t = [u.searchParams.get('title'), u.searchParams.get('text'), u.searchParams.get('url')].filter(Boolean).join('\n'); history.replaceState(null, '', location.pathname); setTimeout(() => openPasteImport(t), 1200) })();

/* Outlook / Hotmail / Microsoft 365 via Microsoft Graph (Mail.Read, read-only, token kept in memory only) */
async function outlookImport() { if (!OUTLOOK_CLIENT_ID) return openPasteImport(); const st = $('gmStatus'); if (st) st.textContent = '🔐 Choose your Microsoft account…';
  if (!window.msal) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js'; s.onload = r; s.onerror = j; document.head.appendChild(s) });
  const app = new msal.PublicClientApplication({ auth: { clientId: OUTLOOK_CLIENT_ID, authority: 'https://login.microsoftonline.com/common', redirectUri: location.origin + location.pathname }, cache: { cacheLocation: 'sessionStorage' } }); await app.initialize();
  let tok; try { tok = (await app.loginPopup({ scopes: ['Mail.Read'], prompt: 'select_account' })).accessToken } catch (e) { if (st) st.textContent = 'Cancelled. You can paste the email instead.'; return }
  if (st) st.textContent = '📬 Reading your booking emails…';
  const q = encodeURIComponent('"flight" OR "itinerary" OR "e-ticket" OR "booking" OR "reservation"');
  const r = await (await fetch(`https://graph.microsoft.com/v1.0/me/messages?$search=${q}&$top=50&$select=subject,body,receivedDateTime`, { headers: { Authorization: 'Bearer ' + tok, ConsistencyLevel: 'eventual' } })).json();
  const flights = [], hotels = []; (r.value || []).forEach(m => { const html = m.body?.content || ''; const t = m.body?.contentType === 'html' ? new DOMParser().parseFromString(html, 'text/html').body.innerText : html;
    parseFlights(t).forEach(f => { if (!flights.some(x => x.no === f.no && +x.date === +f.date)) flights.push(f) }); const h = parseHotel(t, m.subject || ''); if (h && h.start) hotels.push(h) });
  tok = null; try { await app.clearCache() } catch (e) { } return applyBookings(flights, hotels, 'Outlook') }

/* add the buttons under "Find my bookings in Gmail" whenever the trip wizard is shown */
new MutationObserver(() => { const g = $('gmStatus'); if (!g || document.getElementById('impBtns')) return;
  g.insertAdjacentHTML('beforebegin', `<div id="impBtns">${OUTLOOK_CLIENT_ID ? `<button class="act" style="width:100%;background:#fff;color:#0078d4;border:1px solid #c8d6e5;margin:6px 0" onclick="outlookImport()">📨 Find my bookings in Outlook / Hotmail</button>` : ''}<button class="act" style="width:100%;background:#fff;color:#28546B;border:1px dashed #9CAF88;margin:6px 0" onclick="openPasteImport()">📎 Other email (Yahoo, iCloud…): paste or upload</button></div>`) }).observe(document.body, { childList: true, subtree: true });
