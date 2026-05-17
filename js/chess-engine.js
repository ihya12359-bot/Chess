/* ============================================================
   CHESS-ENGINE.JS — Chess.js wrapper
   ============================================================ */
'use strict';

const ChessEngine = (() => {
  let _game = null;

  function init(fen) {
    _game = fen ? new Chess(fen) : new Chess();
    return _game;
  }

  function reset() { if (_game) _game.reset(); return _game; }

  function get() { return _game; }

  function fen() { return _game ? _game.fen() : null; }

  function turn() { return _game ? _game.turn() : null; } // 'w' or 'b'

  function move(from, to, promotion) {
    if (!_game) return null;
    return _game.move({ from, to, promotion: promotion || 'q' });
  }

  function moveStr(uci) {
    // UCI format: e2e4 or e7e8q
    if (!uci || uci.length < 4) return null;
    const from = uci.slice(0, 2);
    const to   = uci.slice(2, 4);
    const promo = uci[4] || 'q';
    return move(from, to, promo);
  }

  function undo() { return _game ? _game.undo() : null; }

  function undoTwo() {
    // Undo AI move + player move
    const m1 = _game ? _game.undo() : null;
    const m2 = _game ? _game.undo() : null;
    return { m1, m2 };
  }

  function moves(square) {
    if (!_game) return [];
    const opts = { verbose: true };
    if (square) opts.square = square;
    return _game.moves(opts);
  }

  function isGameOver()   { return _game ? _game.game_over()  : false; }
  function isCheckmate()  { return _game ? _game.in_checkmate(): false; }
  function isCheck()      { return _game ? _game.in_check()   : false; }
  function isDraw()       { return _game ? _game.in_draw()    : false; }
  function isStalemate()  { return _game ? _game.in_stalemate(): false; }
  function isRepetition() { return _game ? _game.in_threefold_repetition(): false; }
  function isInsufficient(){ return _game ? _game.insufficient_material(): false; }

  function history(verbose) { return _game ? _game.history({ verbose: !!verbose }) : []; }

  function board() { return _game ? _game.board() : []; }

  // Returns square of king in check
  function kingInCheckSquare(color) {
    if (!_game || !_game.in_check()) return null;
    const b = _game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return _squareName(r, c);
        }
      }
    }
    return null;
  }

  function _squareName(row, col) {
    const files = 'abcdefgh';
    return files[col] + (8 - row);
  }

  return { init, reset, get, fen, turn, move, moveStr, undo, undoTwo, moves,
           isGameOver, isCheckmate, isCheck, isDraw, isStalemate, isRepetition,
           isInsufficient, history, board, kingInCheckSquare };
})();
