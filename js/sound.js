/* ============================================================
   SOUND.JS — Web Audio API sound effects
   ============================================================ */
'use strict';

const Sound = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function play(type) {
    if (!State.get('sfx')) return;
    const vol = State.get('volume') / 100;
    try {
      const ac = getCtx();
      const g  = ac.createGain();
      g.gain.setValueAtTime(vol * 0.35, ac.currentTime);
      g.connect(ac.destination);

      switch(type) {
        case 'move':    _tone(ac, g, [440, 550], [0.06, 0.08], 'triangle'); break;
        case 'capture': _tone(ac, g, [300, 200], [0.08, 0.12], 'sawtooth'); break;
        case 'check':   _tone(ac, g, [880, 660, 440], [0.05, 0.05, 0.1], 'square'); break;
        case 'castle':  _tone(ac, g, [350, 500, 650], [0.06, 0.06, 0.06], 'triangle'); break;
        case 'gameOver':_tone(ac, g, [440, 330, 220, 165], [0.1, 0.12, 0.14, 0.3], 'sine'); break;
        case 'win':     _tone(ac, g, [523, 659, 784, 1047], [0.08, 0.08, 0.08, 0.2], 'sine'); break;
        case 'select':  _tone(ac, g, [600], [0.04], 'sine'); break;
        case 'invalid': _noise(ac, g, 0.05); break;
      }
    } catch(e) {}
  }

  function _tone(ac, g, freqs, durs, type) {
    let t = ac.currentTime;
    freqs.forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + durs[i]);
      t += durs[i];
    });
  }

  function _noise(ac, g, dur) {
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    src.start();
    src.stop(ac.currentTime + dur);
  }

  return { play };
})();
