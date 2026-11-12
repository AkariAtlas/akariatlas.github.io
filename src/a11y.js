/* Akari Atlas · accessibility & polish: labels for icon buttons, focus rings, 48px tap targets, contrast, reduced motion */
(function () {
  const st = document.createElement('style'); st.textContent = `
:focus-visible{outline:3px solid #E7BD68!important;outline-offset:2px;border-radius:10px}
nav button,[data-v]{min-height:52px;min-width:52px}
.pill,.act,.map{min-height:40px}
.muted{opacity:1!important}body:not(.dark) .muted{color:#4f5b5b}body.dark .muted{color:#b9c6cb}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}#wxfx{display:none!important}}
.skip-link{position:absolute;left:-999px;top:8px;z-index:10000;background:#28546B;color:#fff;padding:8px 14px;border-radius:999px}.skip-link:focus{left:8px}`;
  document.head.appendChild(st);
  document.documentElement.lang = document.documentElement.lang || 'en';
  const skip = document.createElement('a'); skip.className = 'skip-link'; skip.href = '#'; skip.textContent = 'Skip to content'; skip.onclick = e => { e.preventDefault(); const v = document.querySelector('.view.on, .view.active, .view'); v?.setAttribute('tabindex', '-1'); v?.focus() }; document.body.prepend(skip);
  const NAMES = { '🔈': 'Sound on or off', '🔇': 'Sound off', '🌙': 'Dark mode', '☀️': 'Light mode', '⚙️': 'Settings', '🗣️': 'Live translator', '✕': 'Close', '↑': 'Move up', '↓': 'Move down', '✏️': 'Edit', '⇅': 'Swap start and destination', '⏱️': 'Change visit length', '🧭': 'Directions', '📌': 'Pin to plan', '🔊': 'Play aloud' };
  function label(root) { (root || document).querySelectorAll('button:not([aria-label]),a.map:not([aria-label])').forEach(b => { const t = (b.textContent || '').trim(); if (NAMES[t]) b.setAttribute('aria-label', NAMES[t]); else if (!/[A-Za-z]/.test(t) && b.title) b.setAttribute('aria-label', b.title) });
    (root || document).querySelectorAll('img:not([alt])').forEach(i => i.setAttribute('alt', '')); (root || document).querySelectorAll('svg:not([aria-hidden]):not([role])').forEach(s => s.setAttribute('aria-hidden', 'true'));
    (root || document).querySelectorAll('input:not([aria-label])[placeholder],textarea:not([aria-label])[placeholder],select:not([aria-label])').forEach(i => { if (!i.labels || !i.labels.length) i.setAttribute('aria-label', i.placeholder || i.previousElementSibling?.textContent || 'Option') }) }
  label(); let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => label(), 250) }).observe(document.body, { childList: true, subtree: true });
  // announce toasts to screen readers
  const tst = document.getElementById('toast'); if (tst) { tst.setAttribute('role', 'status'); tst.setAttribute('aria-live', 'polite') }
  const sh = document.getElementById('sheet'); if (sh) { sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true') }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.getElementById('sheet')?.classList.contains('on')) closeSheet(); window.closeSettings && closeSettings(); window.endTour && document.getElementById('akTour') && endTour() } });
})();
/* all modules are loaded now: redraw once so every feature's hooks render on first view */
setTimeout(() => { try { renderPlan() } catch (e) { } try { renderToday() } catch (e) { } try { renderMoney() } catch (e) { } }, 0);
