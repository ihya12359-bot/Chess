/* ============================================================
   BOARD.JS — Render board, pieces, highlights, interactions
   ============================================================ */
'use strict';

const Board = (() => {
  const PIECE_UNICODE = {
    wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
    bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟',
  };
  const FILES = ['a','b','c','d','e','f','g','h'];

  let _el            = null;
  let _flipped       = false;
  let _selected      = null;
  let _validMoves    = [];
  let _lastFrom      = null;
  let _lastTo        = null;
  let _onSquareClick = null;

  function init(containerId, onSquareClick) {
    _el = document.getElementById(containerId);
    _onSquareClick = onSquareClick;
    _buildGrid();
    _buildCoords();
    _resize();
    window.addEventListener('resize', _resize);
  }

  /* Build 8x8 grid with correct square names */
  function _buildGrid() {
    if (!_el) return;
    _el.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = document.createElement('div');
        sq.className = 'sq';

        // Map grid position → algebraic square name
        // row=0 is top of screen
        // Normal (white bottom): file = col, rank = 8 - row
        // Flipped (black bottom): file = 7-col, rank = row+1
        const fileIdx = _flipped ? 7 - col : col;
        const rank    = _flipped ? row + 1  : 8 - row;
        sq.dataset.sq = FILES[fileIdx] + rank;

        // Color: a1 is dark (1+1=2 even → dark if (row+col) odd)
        // a1: row=7,col=0 normal → (7+0)=7 odd → dark ✓
        sq.classList.add((row + col) % 2 === 0 ? 'sq--light' : 'sq--dark');

        sq.addEventListener('click', () => {
          if (_onSquareClick) _onSquareClick(sq.dataset.sq);
        });
        _el.appendChild(sq);
      }
    }
  }

  function _buildCoords() {
    const rankEl = document.getElementById('coords-rank');
    const fileEl = document.getElementById('coords-file');
    if (rankEl) {
      rankEl.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const lbl = document.createElement('div');
        lbl.className = 'coord-label';
        lbl.textContent = _flipped ? i + 1 : 8 - i;
        rankEl.appendChild(lbl);
      }
    }
    if (fileEl) {
      fileEl.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const lbl = document.createElement('div');
        lbl.className = 'coord-label';
        lbl.textContent = FILES[_flipped ? 7 - i : i];
        fileEl.appendChild(lbl);
      }
    }
  }

  function _resize() {
    if (!_el) return;
    const main = _el.closest('.game-main');
    if (!main) return;
    const availH = main.clientHeight - 160;
    const availW = main.clientWidth  - 48;
    const size   = Math.floor(Math.min(availH, availW, 500) / 8) * 8;
    _el.style.width  = size + 'px';
    _el.style.height = size + 'px';
    document.documentElement.style.setProperty('--sq-size', (size / 8) + 'px');
  }

  function render(boardState) {
    if (!_el) return;
    const boardTheme = State.get('boardTheme') || 'classic';
    const wrapper = _el.closest('.board-wrapper');
    if (wrapper) wrapper.setAttribute('data-board', boardTheme);

    _el.querySelectorAll('.sq').forEach(sq => {
      sq.innerHTML = '';
      sq.classList.remove('sq--selected','sq--valid','sq--valid-capture','sq--last','sq--check');

      const sqName = sq.dataset.sq;

      if (sqName === _lastFrom || sqName === _lastTo) sq.classList.add('sq--last');
      if (sqName === _selected) sq.classList.add('sq--selected');

      const vm = _validMoves.find(m => m.to === sqName);
      if (vm) {
        const hasPiece = _getPieceAt(boardState, sqName);
        sq.classList.add(hasPiece ? 'sq--valid-capture' : 'sq--valid');
      }

      const piece = _getPieceAt(boardState, sqName);
      if (piece) {
        const p = document.createElement('span');
        p.className = `piece piece--${piece.color === 'w' ? 'white' : 'black'}`;
        p.textContent = PIECE_UNICODE[piece.color + piece.type] || '?';
        sq.appendChild(p);
      }
    });
  }

  function highlightCheck(square) {
    if (!square || !_el) return;
    const sq = _el.querySelector(`[data-sq="${square}"]`);
    if (sq) sq.classList.add('sq--check');
  }

  function setSelected(square, moves) {
    _selected   = square;
    _validMoves = moves || [];
  }

  function clearSelection() {
    _selected   = null;
    _validMoves = [];
  }

  function setLastMove(from, to) {
    _lastFrom = from;
    _lastTo   = to;
  }

  function flip(flipped) {
    _flipped = flipped;
    _buildGrid();
    _buildCoords();
  }

  function animateMove(fromSq, toSq, callback) {
    if (!State.get('animPieces') || !_el) { callback && callback(); return; }
    const fromEl = _el.querySelector(`[data-sq="${fromSq}"]`);
    const toEl   = _el.querySelector(`[data-sq="${toSq}"]`);
    if (!fromEl || !toEl) { callback && callback(); return; }
    const piece = fromEl.querySelector('.piece');
    if (!piece) { callback && callback(); return; }

    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    const dx = tr.left - fr.left;
    const dy = tr.top  - fr.top;

    piece.style.transition = 'transform 0.18s cubic-bezier(0.22,1,0.36,1)';
    piece.style.transform  = `translate(${dx}px,${dy}px)`;
    piece.style.zIndex     = '10';
    setTimeout(() => {
      piece.style.transition = '';
      piece.style.transform  = '';
      piece.style.zIndex     = '';
      callback && callback();
    }, 200);
  }

  /* Internal: get piece from Chess.js board array */
  function _getPieceAt(boardState, square) {
    if (!boardState) return null;
    const file = square.charCodeAt(0) - 97; // a=0..h=7
    const rank = parseInt(square[1]) - 1;   // 1=0..8=7
    const row  = 7 - rank;                  // chess.js board: row 0 = rank 8
    if (!boardState[row]) return null;
    return boardState[row][file] || null;
  }

  return { init, render, highlightCheck, setSelected, clearSelection, setLastMove, flip, animateMove };
})();
      
