/* Akari Atlas · first-run welcome, "Show me around" tour, and tidier Trip tab (advanced tools under More) */
(function () {
  const st = document.createElement('style'); st.textContent = `
#akOn{position:fixed;inset:0;z-index:9000;background:linear-gradient(#1f3f52,#28546B 55%,#4f8fae);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:Quicksand,sans-serif}
#akOn .sl{max-width:420px;animation:akOnIn .45s ease}@keyframes akOnIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
#akOn h2{font-family:'Kaisei Decol',serif;color:#fff!important;font-size:28px;margin:14px 0 8px}#akOn p{color:#F7F2E8;line-height:1.55;margin:0 0 6px}
#akOn .ic{font-size:64px;line-height:1}#akOn .dots{display:flex;gap:8px;margin:22px 0}#akOn .dots i{width:8px;height:8px;border-radius:50%;background:#ffffff55}#akOn .dots i.on{background:#E7BD68;width:22px;border-radius:6px}
#akOn button{border:none;border-radius:999px;padding:12px 22px;font:700 15px Quicksand;cursor:pointer;margin:4px}#akOn .go{background:#E7BD68;color:#28546B}#akOn .sk{background:transparent;color:#F7F2E8;text-decoration:underline}
#akTour{position:fixed;inset:0;z-index:8999;pointer-events:none}#akTour .hole{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px #0f2a3acc;transition:all .3s;pointer-events:none}
#akTour .tip{position:fixed;left:16px;right:16px;max-width:420px;margin:auto;background:#F7F2E8;color:#343B3B;border-radius:16px;padding:14px 16px;box-shadow:0 10px 30px #0006;pointer-events:auto;font-family:Quicksand,sans-serif}
#akTour .tip h3{font-family:'Kaisei Decol',serif;color:#28546B;margin:0 0 6px}#akTour .tip .b{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
#akTour button{border:none;border-radius:999px;padding:8px 16px;font:700 14px Quicksand;cursor:pointer}#akTour .n{background:#28546B;color:#fff}#akTour .s{background:transparent;color:#28546B}
.moreBox>summary{list-style:none;cursor:pointer;padding:12px 16px;border-radius:16px;background:var(--inbg);font-weight:700;margin:10px 0}.moreBox>summary::-webkit-details-marker{display:none}`; document.head.appendChild(st);

  const SAT = `<svg viewBox="-40 -28 80 48" width="120"><path d="M-14 -6 q-16 -12 -24 0 q9 3 16 7z" fill="#F7F2E8"/><path d="M14 -6 q16 -12 24 0 q-9 3 -16 7z" fill="#F7F2E8"/><path d="M-8 -12 q8 -9 16 0" stroke="#7a2e22" stroke-width="2.6" fill="none"/><rect x="-15" y="-10" width="30" height="24" rx="6" fill="#D9573F"/><path d="M-15 -2 h30" stroke="#b8432f" stroke-width="2"/><rect x="-4" y="-4" width="8" height="6" rx="1.5" fill="#E7BD68"/></svg>`;
  const SLIDES = [
    [SAT, 'Welcome to Akari Atlas', 'Your world, one journey at a time. Plan, explore, budget and travel with a little magic, free, on any phone.'],
    ['<div class="ic">✈️📧</div>', 'Start with your bookings', 'Paste, upload or share any booking email or e-ticket. Akari builds your trip from it.'],
    ['<div class="ic">🗺️✨</div>', 'A day-by-day plan that adapts', 'Suggested itinerary from your flights and budget, live travel times, the ride back to your stay, and a PDF to show immigration.'],
    ['<div class="ic">🗣️🧭💸</div>', 'Everything on the road', 'Live translator, near-me search, walking directions, spending alerts, what to wear, and an offline pack for no-signal moments.']];
  let i = 0;
  window.showWelcome = function () { document.getElementById('akOn')?.remove(); i = 0; const el = document.createElement('div'); el.id = 'akOn'; document.body.appendChild(el); draw() };
  function draw() { const el = document.getElementById('akOn'); if (!el) return; const [art, h, p] = SLIDES[i], last = i === SLIDES.length - 1;
    el.innerHTML = `<div class="sl">${art}<h2>${h}</h2><p>${p}</p></div><div class="dots">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
     ${last ? `<button class="go" onclick="welcomeDone('trip')">➕ Add my trip</button><button class="go" style="background:#F7F2E8" onclick="welcomeDone('tour')">👀 Show me around</button><br><button class="sk" onclick="welcomeDone('join')">👫 I was invited to a trip</button><br><button class="sk" onclick="welcomeDone()">I’ll explore myself</button>`
      : `<button class="go" onclick="welcomeNext()">Next</button><br><button class="sk" onclick="welcomeDone()">Skip</button>`}` }
  window.welcomeNext = () => { i++; draw() };
  window.welcomeDone = how => { localStorage.setItem('ak_welcomed', '1'); document.getElementById('akOn')?.remove(); if (how === 'trip') { try { openWizard() } catch (e) { } } if (how === 'tour') setTimeout(startTour, 300); if (how === 'join') { try { openWizard(); setTimeout(() => document.getElementById('wizJoin')?.focus(), 200) } catch (e) { } } };

  /* guided tour over the real UI */
  const TOUR = [['[data-v="today"]', '🏠 Today', 'What’s next, your leave-by time, today’s spending, weather and quick trip tools.'],
    ['[data-v="explore"]', '🔍 Explore', 'Search anything: “cafe near me”, a full address, or “where to buy 24k gold around Ximending”. Get directions, top sights, spas, restrooms and ATMs.'],
    ['[data-v="plan"]', '🗺️ Plan', 'Your day-by-day schedule with real travel times and the ride home. Tap ✨ to auto-plan and 📄 for the immigration PDF.'],
    ['[data-v="money"]', '💰 Money', 'Budget, expenses, live currency converter and who-owes-whom.'],
    ['[data-v="docs"]', '🧳 Trip', 'What to wear, your document wallet, checklist and packing. More tools are tucked under “More”.'],
    ['#talkFab', '🗣️ Translator', 'Tap to talk with anyone: speak, show the big translation, and hear their reply in English.'],
    ['#setBtn', '⚙️ Settings', 'Import bookings, switch trips, sync with your partner, and replay this tour any time.']];
  let t = 0;
  window.startTour = function () { closeSettings?.(); t = 0; document.getElementById('akTour')?.remove(); const d = document.createElement('div'); d.id = 'akTour'; d.innerHTML = '<div class="hole"></div><div class="tip"></div>'; document.body.appendChild(d); step() };
  function step() { const d = document.getElementById('akTour'); if (!d) return; const [sel, h, p] = TOUR[t], el = document.querySelector(sel);
    if (!el) { t++; return t < TOUR.length ? step() : endTour() } const r = el.getBoundingClientRect(), hole = d.querySelector('.hole'), tip = d.querySelector('.tip'), pad = 6;
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const below = r.top < innerHeight / 2; tip.style.top = below ? (r.bottom + 14) + 'px' : ''; tip.style.bottom = below ? '' : (innerHeight - r.top + 14) + 'px';
    tip.innerHTML = `<h3>${h}</h3><div>${p}</div><div class="b"><button class="s" onclick="endTour()">Skip tour</button><span class="muted" style="font-size:12px">${t + 1} / ${TOUR.length}</span><button class="n" onclick="tourNext()">${t === TOUR.length - 1 ? 'Done 🎉' : 'Next'}</button></div>` }
  window.tourNext = () => { t++; t < TOUR.length ? step() : endTour() };
  window.endTour = () => { document.getElementById('akTour')?.remove(); localStorage.setItem('ak_toured', '1') };
  addEventListener('resize', () => document.getElementById('akTour') && step());

  /* Settings: replay buttons */
  document.addEventListener('click', e => { if (!e.target.closest('#setBtn')) return; setTimeout(() => { const b = document.getElementById('setBody'); if (!b || document.getElementById('helpCard')) return;
    b.insertAdjacentHTML('afterbegin', `<div class="card" id="helpCard"><h2>👋 Getting started</h2><button class="act" onclick="closeSettings();startTour()">👀 Show me around</button> <button class="pill" onclick="closeSettings();showWelcome()">Replay welcome</button> <a class="pill" href="tester.html">🧪 Tester checklist</a></div>`) }, 90) });

  /* Trip tab: keep the essentials up top, tuck the rest under More */
  const ESSENTIAL = /What to wear|Wallet|Checklist|Official links|Sync & settings|My bookings|My trips/;
  on('trip:render', function tidyTrip() { const v = document.getElementById('v-docs'); if (!v) return; let box = document.getElementById('moreTrip');
    if (!box) { box = document.createElement('details'); box.id = 'moreTrip'; box.className = 'moreBox'; box.innerHTML = '<summary>➕ More tools · reminders, packing, journal, summary, phrases</summary>'; v.appendChild(box) }
    [...v.querySelectorAll(':scope > .card')].forEach(c => { const h = c.querySelector('h2')?.textContent || ''; if (!ESSENTIAL.test(h)) box.appendChild(c) }); v.appendChild(box) });

  /* first run: after the splash, if this person hasn't been welcomed yet */
  if (!localStorage.getItem('ak_welcomed')) { const hasTrip = (() => { try { return !!trip()?.start } catch (e) { return false } })(); if (hasTrip) localStorage.setItem('ak_welcomed', '1'); else setTimeout(showWelcome, matchMedia('(display-mode: standalone)').matches ? 1700 : 3200) }
})();
