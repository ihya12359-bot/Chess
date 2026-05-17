/* ============================================================
   SETTINGS.JS — Settings page logic
   ============================================================ */
'use strict';

const Settings = (() => {
  function init() {
    _loadToUI();
    _bindEvents();
  }

  function _loadToUI() {
    // Theme
    const isDark = State.get('theme') === 'dark';
    document.getElementById('toggle-theme').classList.toggle('active', isDark);
    document.getElementById('theme-label').textContent = isDark ? 'Dark Mode' : 'Light Mode';
    document.documentElement.setAttribute('data-theme', State.get('theme'));

    // Board theme
    document.querySelectorAll('.board-theme-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === State.get('boardTheme'));
    });

    // Volume
    const vol = State.get('volume');
    document.getElementById('slider-volume').value = vol;
    document.getElementById('vol-label').textContent = vol + '%';

    // SFX
    document.getElementById('toggle-sfx').classList.toggle('active', State.get('sfx'));

    // Difficulty
    const diff = State.get('difficulty');
    document.getElementById('slider-difficulty').value = diff;
    document.getElementById('diff-label').textContent  = diff;
    document.getElementById('diff-name-label').textContent = StockfishAI.getLevelName(diff);

    // Hints
    document.getElementById('toggle-hints').classList.toggle('active', State.get('showHints'));

    // Anim
    document.getElementById('toggle-anim').classList.toggle('active', State.get('animPieces'));
  }

  function _bindEvents() {
    // Back button
    document.getElementById('btn-back-settings').onclick = () => Router.goTo('dashboard');

    // Theme toggle
    document.getElementById('toggle-theme').onclick = function() {
      const isDark = !this.classList.contains('active');
      // FLIP: if currently dark, switching to light
      const newTheme = this.classList.contains('active') ? 'light' : 'dark';
      this.classList.toggle('active');
      State.set('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      document.getElementById('theme-label').textContent = newTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
    };

    // Board theme
    document.querySelectorAll('.board-theme-opt').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.board-theme-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.set('boardTheme', btn.dataset.theme);
      };
    });

    // Volume
    document.getElementById('slider-volume').oninput = function() {
      State.set('volume', parseInt(this.value));
      document.getElementById('vol-label').textContent = this.value + '%';
    };

    // SFX
    document.getElementById('toggle-sfx').onclick = function() {
      this.classList.toggle('active');
      State.set('sfx', this.classList.contains('active'));
    };

    // Difficulty
    document.getElementById('slider-difficulty').oninput = function() {
      const val = parseInt(this.value);
      State.set('difficulty', val);
      document.getElementById('diff-label').textContent      = val;
      document.getElementById('diff-name-label').textContent = StockfishAI.getLevelName(val);
    };

    // Hints
    document.getElementById('toggle-hints').onclick = function() {
      this.classList.toggle('active');
      State.set('showHints', this.classList.contains('active'));
    };

    // Anim
    document.getElementById('toggle-anim').onclick = function() {
      this.classList.toggle('active');
      State.set('animPieces', this.classList.contains('active'));
    };

    // Reset
    document.getElementById('btn-reset-settings').onclick = () => {
      if (confirm('Reset semua pengaturan ke default?')) {
        State.resetSettings();
        _loadToUI();
      }
    };
  }

  return { init };
})();
