/* ============================================================
   STATE.JS — Global state, localStorage persistence
   ============================================================ */
'use strict';

const State = (() => {
  const DEFAULTS = {
    settings: {
      theme: 'dark',
      boardTheme: 'classic',
      volume: 70,
      sfx: true,
      difficulty: 8,
      showHints: true,
      animPieces: true,
    },
    stats: { wins: 0, draws: 0, losses: 0 },
  };

  let _settings = { ...DEFAULTS.settings };
  let _stats    = { ...DEFAULTS.stats };
  let _gameConfig = { mode: 'ai', playerColor: 'white', difficulty: 8 };

  function load() {
    try {
      const s = localStorage.getItem('sc_settings');
      const t = localStorage.getItem('sc_stats');
      if (s) _settings = { ...DEFAULTS.settings, ...JSON.parse(s) };
      if (t) _stats    = { ...DEFAULTS.stats,    ...JSON.parse(t) };
    } catch(e) { /* ignore */ }
  }

  function saveSettings() {
    try { localStorage.setItem('sc_settings', JSON.stringify(_settings)); } catch(e) {}
  }
  function saveStats() {
    try { localStorage.setItem('sc_stats', JSON.stringify(_stats)); } catch(e) {}
  }

  function resetSettings() {
    _settings = { ...DEFAULTS.settings };
    saveSettings();
  }

  function get(key)        { return _settings[key]; }
  function set(key, val)   { _settings[key] = val; saveSettings(); }
  function getStats()      { return { ..._stats }; }
  function addWin()        { _stats.wins++;   saveStats(); }
  function addDraw()       { _stats.draws++;  saveStats(); }
  function addLoss()       { _stats.losses++; saveStats(); }
  function getGameConfig() { return { ..._gameConfig }; }
  function setGameConfig(cfg) { _gameConfig = { ..._gameConfig, ...cfg }; }

  load();
  return { get, set, resetSettings, getStats, addWin, addDraw, addLoss, getGameConfig, setGameConfig };
})();
