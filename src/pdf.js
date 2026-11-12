/* ================= AKARI ATLAS · BRANDED INTERACTIVE ITINERARY PDF ================= */
const AK = { ivory: [247, 242, 232], sky: [145, 203, 224], ocean: [40, 84, 107], sage: [156, 175, 136], coral: [233, 139, 115], gold: [231, 189, 104], ink: [52, 59, 59], red: [217, 87, 63], mut: [110, 115, 112] };
function loadJsPDF() { return new Promise((res, rej) => { if (window.jspdf) return res(); const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = () => rej('Could not load the PDF tool. Connect to the internet once and try again.'); document.head.appendChild(s) }) }
function openPdf() {
  const t = trip() || {};
  $('sheet').innerHTML = `<div class="sheetIn"><div class="row sp"><h3 style="margin:0">📄 Itinerary PDF</h3><button class="pill" onclick="closeSheet()">✕</button></div>
  <p class="muted">A branded Akari Atlas PDF with clickable maps and a contents page. Edit stops in Plan first (✏️), then download.</p>
  <label class="chk"><input type="checkbox" id="pdfIO" onchange="pdfPreset()"> <span><b>Immigration mode</b><br><span class="muted">Only what an officer asks for: travellers, flights, stay, return date, daily plan and contacts. Hides money and private notes.</span></span></label>
  <label class="chk"><input type="checkbox" id="pdfRefs" checked> Include booking references</label>
  <label class="chk"><input type="checkbox" id="pdfNotes" checked> Include my notes</label>
  <label class="chk"><input type="checkbox" id="pdfMoney" checked> Include budget summary</label>
  <label class="muted">Full names as on passports (optional)<input id="pdfNames" value="${esc(D.pdfNames || '')}" placeholder="e.g. Juan Dela Cruz, Maria Dela Cruz"></label>
  <button class="act" style="width:100%;margin-top:10px" onclick="makePdf()">⬇️ Download PDF</button><p class="muted" id="pdfMsg"></p></div>`;
  $('sheet').classList.add('on');
}
function pdfPreset() { const io = $('pdfIO').checked; $('pdfNotes').checked = !io; $('pdfMoney').checked = !io; $('pdfRefs').checked = true }
async function makePdf() { const bakR = JSON.stringify(D.routes || {}), bakX = JSON.stringify(D.stopx || {});
  try { await emit('pdf:prepare'); return await makePdfCore() } finally { D.routes = JSON.parse(bakR); D.stopx = JSON.parse(bakX); save() } }
async function makePdfCore() {
  const msg = $('pdfMsg'); msg.textContent = 'Preparing your itinerary…'; D.pdfNames = $('pdfNames').value; save();
  try { await loadJsPDF() } catch (e) { msg.textContent = e; return }
  const opt = { io: $('pdfIO').checked, refs: $('pdfRefs').checked, notes: $('pdfNotes').checked, money: $('pdfMoney').checked };
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const W = 595, H = 842, M = 44;
  const t = trip() || {}; const plain = s => String(s || '').replace(/[^\x20-\x7E -ɏ–—·’‘“”•…₱€£¥₩]/g, '').replace(/\s+/g, ' ').trim();
  const names = plain(D.pdfNames) || plain(t.people) || '';
  const fmtD = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const gmap = (la, lo, n) => `https://www.google.com/maps/search/?api=1&query=${la},${lo}`;
  const satchel = (x, y, s) => { doc.setFillColor(...AK.ivory); doc.triangle(x - 15 * s, y - 2 * s, x - 34 * s, y - 8 * s, x - 14 * s, y + 4 * s, 'F'); doc.triangle(x + 15 * s, y - 2 * s, x + 34 * s, y - 8 * s, x + 14 * s, y + 4 * s, 'F');
    doc.setDrawColor(122, 46, 34); doc.setLineWidth(2 * s); doc.lines([[8 * s, -9 * s], [8 * s, 9 * s]], x - 8 * s, y - 12 * s, [1, 1], 'S', false); doc.setFillColor(...AK.red); doc.roundedRect(x - 14 * s, y - 10 * s, 28 * s, 22 * s, 6 * s, 6 * s, 'F'); doc.setFillColor(...AK.coral); doc.roundedRect(x - 14 * s, y - 10 * s, 28 * s, 9 * s, 5 * s, 5 * s, 'F'); doc.setFillColor(...AK.gold); doc.roundedRect(x - 3 * s, y - 3 * s, 6 * s, 6 * s, 1.5 * s, 1.5 * s, 'F') };
  const header = (title) => { doc.setFillColor(...AK.ivory); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...AK.sky); doc.rect(0, 0, W, 70, 'F'); doc.setFillColor(...AK.sage); doc.ellipse(W * .3, 78, W * .45, 22, 'F'); doc.setFillColor(...AK.ocean); doc.ellipse(W * .8, 84, W * .45, 20, 'F'); doc.setFillColor(...AK.gold); doc.circle(W - 60, 30, 14, 'F'); satchel(M + 18, 32, .9);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Akari Atlas', M + 46, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Your world, one journey at a time.', M + 46, 44); doc.setTextColor(...AK.ocean); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(plain(title), M, 132); doc.setDrawColor(...AK.coral); doc.setLineWidth(2); doc.line(M, 140, M + 60, 140) };
  let y = 0; const need = n => { if (y + n > H - 70) { doc.addPage(); header('Daily plan (cont.)'); y = 164 } };
  const row = (k, v, link) => { need(20); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...AK.mut); doc.text(k, M, y); doc.setTextColor(...AK.ink); const lines = doc.splitTextToSize(plain(v) || '—', W - M * 2 - 120 - (link ? 70 : 0)); doc.text(lines, M + 120, y); if (link) { doc.setTextColor(...AK.ocean); doc.textWithLink('Open map ›', W - M - 56, y, { url: link }) } y += 14 * lines.length + 6 };
  const sect = s => { need(34); y += 6; doc.setFillColor(...AK.sage); doc.roundedRect(M, y - 12, 4, 16, 2, 2, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AK.ocean); doc.text(s, M + 12, y); y += 18 };
  // ---- Page 1: cover & travel summary
  header(t.name || 'Travel itinerary'); y = 164;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...AK.ink); doc.text(`${t.start ? fmtD(t.start) : ''}${t.end ? '  to  ' + fmtD(t.end) : ''}${DAYS.length ? '  ·  ' + DAYS.length + ' days' : ''}`, M, y); y += 26;
  sect('Travel summary');
  if (names) row('Travellers', names);
  if (t.out) row('Outbound flight', t.out); if (t.back) row('Return flight', t.back);
  if (t.base) row('Accommodation', [t.base.name, t.base.addrEn || ''].filter(Boolean).join(', '), gmap(t.base.lat, t.base.lon));
  if (t.start && t.end) row('Length of stay', `${DAYS.length} days (${fmtD(t.start)} – ${fmtD(t.end)})`);
  row('Purpose of travel', D.pdfPurpose || 'Tourism / holiday');
  if (opt.refs) { const b = D.book || {}; if (b.pnr) row('Airline reference', b.pnr); if (b.tripNo) row('Booking no.', b.tripNo); if (b.hotel) row('Hotel confirmation', b.hotel) }
  sect('Emergency & contacts');
  if (t.cc === 'tw') { row('Taiwan emergency', 'Police 110 · Ambulance / fire 119'); row('Tourist hotline', '0800-011-765 (24h, English)') }
  row('Trip app', 'Akari Atlas, live itinerary on the traveller\'s phone');
  // contents
  sect('Day-by-day contents'); const tocY = []; DAYS.forEach((d, i) => { need(16); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...AK.ocean); const n = (D.routes[i] || []).length; doc.text(`Day ${i + 1} · ${d}`, M + 12, y); doc.setTextColor(...AK.mut); doc.text(`${n} stop${n === 1 ? '' : 's'}`, W - M - 50, y); tocY.push([doc.getNumberOfPages(), y]); y += 16 });
  // ---- Day pages
  const dayPage = [];
  DAYS.forEach((d, i) => {
    const r = D.routes[i] || [];
    if (i === 0 || y > H - 70 - (r.length ? 140 : 60)) { doc.addPage(); header('Daily plan'); y = 164 } else y += 14;
    dayPage.push([doc.getNumberOfPages(), y]);
    doc.setFillColor(...AK.sky); doc.roundedRect(M, y - 14, W - M * 2, 22, 8, 8, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AK.ocean); doc.text(`Day ${i + 1} · ${d}`, M + 10, y + 1); y += 26;
    if (!r.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...AK.mut); doc.text('Free day, no stops planned yet.', M + 10, y); y += 10; return }
    r.forEach((x, k) => { const ex = (D.stopx || {})[i + ':' + k] || {}; need(48);
      doc.setDrawColor(...AK.sage); doc.setLineDashPattern([3, 3], 0); if (k < r.length - 1) doc.line(M + 6, y + 4, M + 6, y + 42); doc.setLineDashPattern([], 0);
      doc.setFillColor(...(k === 0 ? AK.coral : k === r.length - 1 ? AK.ocean : AK.gold)); doc.circle(M + 6, y - 3, 5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AK.ink); const nm = plain(x[0]) || 'Stop'; doc.text(`${ex.time ? ex.time + '  ' : ''}${nm}`, M + 20, y);
      doc.setTextColor(...AK.ocean); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.textWithLink('Map ›', W - M - 30, y, { url: gmap(x[1], x[2]) }); y += 13;
      const sub = [opt.money && x[3] ? plain(x[3]) : '', opt.refs && ex.ref ? 'Ref: ' + plain(ex.ref) : ''].filter(Boolean).join('  ·  '); if (sub) { doc.setTextColor(...AK.mut); doc.text(sub, M + 20, y); y += 12 }
      if (opt.notes && ex.note) { doc.setTextColor(...AK.ink); const l = doc.splitTextToSize(plain(ex.note), W - M * 2 - 30); doc.text(l, M + 20, y); y += 12 * l.length }
      if (k < r.length - 1) { const km = dist(x[1], x[2], r[k + 1][1], r[k + 1][2]); doc.setTextColor(...AK.mut); doc.setFontSize(8.5); doc.text(legAdvice(km).replace(/[^\x20-\x7E~]/g, '').trim(), M + 20, y); y += 10 }
      y += 12 });
    if (opt.notes && D.notes[i]) { sect('Notes'); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...AK.ink); const l = doc.splitTextToSize(plain(D.notes[i]), W - M * 2); need(12 * l.length); doc.text(l, M, y); y += 12 * l.length }
  });
  // ---- Budget
  if (opt.money) { doc.addPage(); header('Budget summary'); y = 164; const rr = R(); let tot = 0; bud().forEach(b => { if (!b.a) return; tot += b.a; row(plain(b.n), `${HC()} ${Math.round(b.a).toLocaleString()}`) }); row('Total planned', `${HC()} ${Math.round(tot).toLocaleString()} of ${HC()} ${Math.round(D.total).toLocaleString()}`); const sp = D.exps.reduce((s, e) => s + e.a * rr, 0); row('Spent so far', `${HC()} ${Math.round(sp).toLocaleString()} (${D.exps.length} entries)`) }
  // TOC links + footers
  tocY.forEach(([pg, yy], i) => { doc.setPage(pg); doc.link(M, yy - 10, W - M * 2, 14, { pageNumber: dayPage[i][0], top: Math.max(0, dayPage[i][1] - 30) }) });
  const N = doc.getNumberOfPages(); for (let p = 1; p <= N; p++) { doc.setPage(p); doc.setDrawColor(...AK.line || AK.sage); doc.setLineWidth(.5); doc.line(M, H - 44, W - M, H - 44); satchel(M + 8, H - 26, .4); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...AK.mut); doc.text('Akari Atlas · A little magic in every journey.', M + 24, H - 24); doc.setFont('helvetica', 'normal'); doc.text(`${opt.io ? 'Immigration copy · ' : ''}Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Page ${p} of ${N}`, W - M, H - 24, { align: 'right' }) }
  const fname = `Akari-Atlas-${plain(t.name || 'Itinerary').replace(/\s+/g, '-')}${opt.io ? '-Immigration' : ''}.pdf`;
  const blob = doc.output('blob'); const file = new File([blob], fname, { type: 'application/pdf' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: fname }); msg.textContent = 'Shared ✓'; return } } catch (e) { }
  doc.save(fname); msg.textContent = `Downloaded ${fname} ✓`; if (D.voice) speak('Your itinerary PDF is ready. Have a smooth trip!');
}
