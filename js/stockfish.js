/* ============================================================
   STOCKFISH.JS — AI engine wrapper (15 levels via inline worker)
   ============================================================ */
'use strict';

const StockfishAI = (() => {
  // Level config: [skillLevel, depth, moveTime(ms), contempt, randomness%]
  const LEVEL_CONFIG = {
    1:  { skill: 0,  depth: 1,  time: 50,   contempt: 0,  random: 0.9 },  // Pemula total
    2:  { skill: 0,  depth: 1,  time: 100,  contempt: 0,  random: 0.75 }, // Pemula
    3:  { skill: 1,  depth: 2,  time: 150,  contempt: 0,  random: 0.6 },  // Pemula+
    4:  { skill: 2,  depth: 3,  time: 200,  contempt: 0,  random: 0.45 }, // Mudah
    5:  { skill: 3,  depth: 4,  time: 300,  contempt: 0,  random: 0.3 },  // Mudah+
    6:  { skill: 5,  depth: 5,  time: 400,  contempt: 0,  random: 0.2 },  // Mudah++
    7:  { skill: 7,  depth: 6,  time: 500,  contempt: 10, random: 0.12 }, // Normal
    8:  { skill: 9,  depth: 8,  time: 700,  contempt: 15, random: 0.08 }, // Normal+
    9:  { skill: 11, depth: 10, time: 900,  contempt: 20, random: 0.04 }, // Normal++
    10: { skill: 13, depth: 12, time: 1200, contempt: 30, random: 0.02 }, // Sulit
    11: { skill: 15, depth: 14, time: 1500, contempt: 40, random: 0.01 }, // Sulit+
    12: { skill: 17, depth: 16, time: 2000, contempt: 50, random: 0 },    // Sulit++
    13: { skill: 18, depth: 18, time: 2500, contempt: 60, random: 0 },    // Expert
    14: { skill: 19, depth: 20, time: 3000, contempt: 80, random: 0 },    // Master
    15: { skill: 20, depth: 99, time: 5000, contempt: 100,random: 0 },    // Grandmaster (MAX)
  };

  // Stockfish as blob worker from CDN
  const STOCKFISH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';

  let worker = null;
  let _resolve = null;
  let _ready = false;
  let _readyCallbacks = [];

  function init() {
    return new Promise((res) => {
      if (_ready) { res(); return; }
      _readyCallbacks.push(res);
      if (worker) return; // already loading

      // Load Stockfish via fetch → blob URL (avoids CORS on worker)
      fetch(STOCKFISH_CDN)
        .then(r => r.text())
        .then(code => {
          const blob = new Blob([code], { type: 'application/javascript' });
          const url  = URL.createObjectURL(blob);
          worker = new Worker(url);
          worker.onmessage = _onMessage;
          worker.onerror   = (e) => console.warn('Stockfish worker error:', e);
          worker.postMessage('uci');
        })
        .catch(err => {
          console.warn('Stockfish load failed, using fallback AI:', err);
          worker = null;
          _ready = true;
          _readyCallbacks.forEach(cb => cb());
          _readyCallbacks = [];
        });
    });
  }

  function _onMessage(e) {
    const msg = e.data;
    if (msg === 'uciok') {
      worker.postMessage('isready');
    } else if (msg === 'readyok') {
      _ready = true;
      _readyCallbacks.forEach(cb => cb());
      _readyCallbacks = [];
    } else if (msg.startsWith('bestmove')) {
      const parts = msg.split(' ');
      if (_resolve) { _resolve(parts[1] || null); _resolve = null; }
    }
  }

  function getBestMove(fen, level) {
    return new Promise(async (resolve) => {
      await init();
      const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[8];

      // Apply randomness for lower levels: occasionally pick a random legal move
      if (cfg.random > 0 && Math.random() < cfg.random) {
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        if (moves.length > 0) {
          const m = moves[Math.floor(Math.random() * moves.length)];
          setTimeout(() => resolve(m.from + m.to + (m.promotion || '')), cfg.time * 0.3 + Math.random() * 200);
          return;
        }
      }

      if (!worker) {
        // Fallback: simple random legal move
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        if (moves.length > 0) {
          const m = moves[Math.floor(Math.random() * moves.length)];
          setTimeout(() => resolve(m.from + m.to + (m.promotion || '')), 300 + Math.random() * 300);
        } else { resolve(null); }
        return;
      }

      _resolve = resolve;

      // Configure Stockfish for this level
      worker.postMessage('ucinewgame');
      worker.postMessage(`setoption name Skill Level value ${cfg.skill}`);
      worker.postMessage(`setoption name Contempt value ${cfg.contempt}`);
      if (cfg.skill < 20) {
        // Add random error for lower levels
        const errProb = Math.max(0, Math.round((20 - cfg.skill) * 12));
        const maxErr  = Math.max(0, Math.round((20 - cfg.skill) * 50));
        worker.postMessage(`setoption name Skill Level Maximum Error value ${maxErr}`);
        worker.postMessage(`setoption name Skill Level Probability value ${errProb}`);
      }
      worker.postMessage(`position fen ${fen}`);

      if (cfg.depth >= 99) {
        // Level 15: go infinite until movetime
        worker.postMessage(`go movetime ${cfg.time}`);
      } else {
        worker.postMessage(`go depth ${cfg.depth} movetime ${cfg.time}`);
      }
    });
  }

  function terminate() {
    if (worker) { worker.terminate(); worker = null; _ready = false; }
  }

  function getLevelName(level) {
    const names = {
      1:'Baru Belajar', 2:'Pemula', 3:'Pemula+',
      4:'Mudah', 5:'Mudah+', 6:'Amatir',
      7:'Normal', 8:'Normal+', 9:'Menengah',
      10:'Sulit', 11:'Sulit+', 12:'Canggih',
      13:'Expert', 14:'Master', 15:'Grandmaster'
    };
    return names[level] || 'Normal';
  }

  function getLevelTier(level) {
    if (level <= 3)  return 'beginner';
    if (level <= 6)  return 'easy';
    if (level <= 9)  return 'normal';
    if (level <= 12) return 'hard';
    return 'master';
  }

  return { init, getBestMove, terminate, getLevelName, getLevelTier };
})();
