/* stays: "Cheap stays" category — affordable, well-reviewed places sized to your group, with
   per-night cost incl. tax & fees converted to your home currency, check-in/out, and room/amenity filters.
   Live prices come from the booking sites (no free price API exists); links open pre-filled & sorted by price. */
(function () { const e = Object.entries(NEAR).filter(([k]) => k !== 'stay'); e.splice(2, 0, ['stay', ['🛏️ Cheap stays', 'nwr["tourism"~"hostel|guest_house|motel|hotel|apartment"]']]); Object.keys(NEAR).forEach(k => delete NEAR[k]); e.forEach(([k, v]) => NEAR[k] = v) })();
try { PRICE.stay = 'Hostel dorm ~NT$500–900 · budget double ~NT$1,500–2,800 /night' } catch (e) { }
const ST = JSON.parse(localStorage.getItem('ak_stayf') || '{"room":"auto","shower":true,"bidet":false,"tax":true,"svc":true}');
function stSave() { localStorage.setItem('ak_stayf', JSON.stringify(ST)) }
function stGuests() { try { return Math.max(1, people().length) } catch (e) { return 2 } }
function stRoomAuto() { const g = stGuests(); return g === 1 ? 'dorm' : g === 2 ? 'double' : g <= 4 ? 'family' : 'multi' }
const ROOMS = { dorm: '🛏️ Dorm bed', double: '💑 Private double', twin: '🛏️🛏️ Twin', family: '👨‍👩‍👧 Family / quad', multi: '🏠 Apartment / 2 rooms' };
function stRoom() { return ST.room === 'auto' ? stRoomAuto() : ST.room }
function stRooms() { const g = stGuests(), r = stRoom(); return r === 'dorm' ? 1 : r === 'family' ? Math.ceil(g / 4) : r === 'multi' ? Math.max(1, Math.ceil(g / 4)) : Math.ceil(g / 2) }
function stDates() { const t = (typeof trip === 'function' && trip()) || {}; let a = t.start, b = t.end;
  const today = new Date().toISOString().slice(0, 10); if (!a || a < today) { const d = new Date(Date.now() + 864e5); a = d.toISOString().slice(0, 10) } if (!b || b <= a) { const d = new Date(a + 'T00:00:00'); d.setDate(d.getDate() + 1); b = d.toISOString().slice(0, 10) } return [a, b] }
function stNights() { const [a, b] = stDates(); return Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5)) }
/* Taiwan: listed rates usually include 5% VAT; many hotels add 10% service. Other countries: user toggles. */
function stTotal(nightly) { let v = +nightly || 0; if (ST.tax && DC() !== 'TWD') v *= 1.12; if (ST.svc) v *= 1.10; return v }
function stLinks(name, lat, lon) { const [a, b] = stDates(), g = stGuests(), r = stRooms(), city = encodeURIComponent((name ? name + ', ' : '') + (trip()?.city || trip()?.name || ''));
  const room = stRoom(), dorm = room === 'dorm';
  const bk = `https://www.booking.com/searchresults.html?ss=${city}&latitude=${lat}&longitude=${lon}&checkin=${a}&checkout=${b}&group_adults=${g}&no_rooms=${r}&order=price&nflt=${encodeURIComponent('review_score=80' + (dorm ? ';ht_id=203' : ''))}`;
  const ag = `https://www.agoda.com/search?checkIn=${a}&los=${stNights()}&adults=${g}&rooms=${r}&sort=priceLowToHigh&latitude=${lat}&longitude=${lon}&hotelReviewScore=8`;
  const tc = `https://www.trip.com/hotels/list?checkin=${a.replace(/-/g, '/')}&checkout=${b.replace(/-/g, '/')}&adult=${g}&crn=${r}&lat=${lat}&lon=${lon}&sort=1`;
  const gg = `https://www.google.com/travel/search?q=${encodeURIComponent((name || 'hotels') + ' ' + a + ' to ' + b + ' ' + g + ' adults')}`;
  return { bk, ag, tc, gg } }
function stCheck(t) { const ci = t.check_in || t['check-in'] || t.checkin, co = t.check_out || t['check-out'] || t.checkout;
  return `🕒 Check-in ${esc(ci || '~3:00 PM')} · out ${esc(co || '~11:00 AM')}${ci || co ? '' : ' <span class="muted">(typical, confirm)</span>'}` }
function stAmen(t) { const a = []; if (t.stars) a.push('⭐'.repeat(Math.min(5, +t.stars || 0))); if (t.internet_access && t.internet_access !== 'no') a.push('📶 Wi-Fi');
  if (t.tourism === 'hostel') a.push('🛏️ dorms'); if (t.rooms) a.push(esc(t.rooms) + ' rooms'); if (t['toilets:bidet'] === 'yes' || t.bidet === 'yes') a.push('🚿 bidet');
  if (t.shower === 'hot' || t['shower:hot_water'] === 'yes') a.push('♨️ hot shower'); return a.join(' · ') }
function stFilterBar() { const g = stGuests(), room = stRoom();
  return `<div class="card" id="stayBar" style="margin:8px 0;padding:12px">
   <div class="row sp" style="align-items:center;flex-wrap:wrap;gap:6px"><b>🛏️ For ${g} ${g === 1 ? 'person' : 'people'} · ${stNights()} night${stNights() > 1 ? 's' : ''} · ${stRooms()} room${stRooms() > 1 ? 's' : ''}</b><span class="muted" style="font-size:12px">${stDates().join(' → ')}</span></div>
   <div class="seg" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">${Object.entries(ROOMS).map(([k, v]) => `<button class="pill ${room === k ? 'on' : ''}" onclick="ST.room='${k}';stSave();stRerender()">${v}</button>`).join('')}</div>
   <div class="row" style="gap:12px;flex-wrap:wrap;font-size:14px">
    <label><input type="checkbox" ${ST.shower ? 'checked' : ''} onchange="ST.shower=this.checked;stSave();stRerender()"> ♨️ Hot shower</label>
    <label><input type="checkbox" ${ST.bidet ? 'checked' : ''} onchange="ST.bidet=this.checked;stSave();stRerender()"> 🚿 Bidet</label>
    <label><input type="checkbox" ${ST.svc ? 'checked' : ''} onchange="ST.svc=this.checked;stSave();stRerender()"> +10% service fee</label>
    ${DC() !== 'TWD' ? `<label><input type="checkbox" ${ST.tax ? 'checked' : ''} onchange="ST.tax=this.checked;stSave();stRerender()"> +12% tax</label>` : ''}</div>
   <div class="row" style="gap:6px;margin-top:10px;align-items:center;flex-wrap:wrap"><span>💱 Nightly price seen</span><input id="stPrice" type="number" inputmode="decimal" placeholder="${DC()}" style="width:110px" oninput="stCalc()"><span id="stCalc" class="muted"></span></div>
   <p class="muted" style="font-size:12px;margin:8px 0 0">Price buttons open Booking, Agoda and Trip.com with your dates and group, cheapest first, reviews 8+ — they show live totals with tax. ${DC() === 'TWD' ? 'Taiwan rates already include 5% VAT; some hotels add 10% service.' : ''} ${ST.shower || ST.bidet ? `Tick ${[ST.shower && 'hot shower', ST.bidet && 'bidet'].filter(Boolean).join(' & ')} in the site’s filters or check the room photos — few listings publish it.` : ''}</p></div>` }
function stCalc() { const v = +($('stPrice')?.value || 0), el = $('stCalc'); if (!el) return; if (!v) return el.textContent = '';
  const n = stTotal(v), g = stGuests(), rooms = stRoom() === 'dorm' ? g : stRooms(), all = n * rooms * stNights();
  el.innerHTML = `= <b>${HC()} ${Math.round(n * R()).toLocaleString()}</b>/night incl. fees · ${HC()} ${Math.round(all * R() / g).toLocaleString()} per person for ${stNights()} night${stNights() > 1 ? 's' : ''} · total ${HC()} ${Math.round(all * R()).toLocaleString()}` }
function stRerender() { const b = $('stayBar'); if (b) b.outerHTML = stFilterBar(); stDecorate() }
function stDecorate() { if (nearCat !== 'stay') return; const rows = document.querySelectorAll('#near .place');
  rows.forEach((row, i) => { const x = nearData[i]; if (!x || row.querySelector('.stayX')) return; const L = stLinks(x.n, x.la, x.lo);
    row.querySelector('div[style*="flex:1"]')?.insertAdjacentHTML('beforeend', `<div class="stayX" style="margin-top:6px"><div class="muted" style="font-size:13px">${stCheck(x.t)}${stAmen(x.t) ? ' · ' + stAmen(x.t) : ''}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><a class="pill" target="_blank" rel="noopener" href="${L.bk}">💲 Booking</a><a class="pill" target="_blank" rel="noopener" href="${L.ag}">💲 Agoda</a><a class="pill" target="_blank" rel="noopener" href="${L.tc}">💲 Trip.com</a><a class="pill" target="_blank" rel="noopener" href="${L.gg}">⭐ Google prices</a></div></div>`) }) }
on('nearby:loaded', c => { document.getElementById('stayBar')?.remove(); if (c !== 'stay') return; const nr = $('near'); if (!nr) return;
  const p = curPlace || { name: BASE_NAME, lat: HOSTEL[0], lon: HOSTEL[1] }, L = stLinks('', p.lat, p.lon);
  nr.insertAdjacentHTML('beforebegin', stFilterBar()); nr.insertAdjacentHTML('afterbegin', `<div class="row" style="gap:6px;flex-wrap:wrap;margin:0 0 8px"><span class="muted">Cheapest well-reviewed around ${esc(p.name)}:</span><a class="act" target="_blank" rel="noopener" href="${L.bk}">Booking</a><a class="pill" target="_blank" rel="noopener" href="${L.ag}">Agoda</a><a class="pill" target="_blank" rel="noopener" href="${L.tc}">Trip.com</a></div>`);
  stDecorate() });
(function () { const st = document.createElement('style'); st.textContent = '#stayBar label{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}#stayBar input[type=checkbox]{width:18px;height:18px;margin:0;flex:0 0 auto}'; document.head.appendChild(st) })();
