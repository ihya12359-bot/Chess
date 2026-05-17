/* ============================================================
   ROUTER.JS — Page navigation
   ============================================================ */
'use strict';

const Router = (() => {
  let _current = 'dashboard';
  const pages = { dashboard: '#page-dashboard', game: '#page-game', settings: '#page-settings' };

  function goTo(name) {
    if (!pages[name]) return;
    const prev = document.querySelector('.page.active');
    if (prev) { prev.classList.remove('active'); prev.classList.add('exit'); setTimeout(() => prev.classList.remove('exit'), 400); }
    const next = document.querySelector(pages[name]);
    if (next) { setTimeout(() => next.classList.add('active'), 50); }
    _current = name;
  }

  function current() { return _current; }
  return { goTo, current };
})();
