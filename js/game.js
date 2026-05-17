/* ============================================================
   GAME.JS — Game page logic: turns, AI, status, move history
   ============================================================ */
'use strict';

const Game = (() => {
  let _mode             = 'ai';
  let _playerColor      = 'w';
  let _level            = 8;
  let _aiThinking       = false;
  let _gameOver         = false;
  let _pendingPromoFrom = null;
  let _pendingPromoTo   = null;
  let _selectedSquare   = null;

  /* ---- Start ---- */
  function start(config) {
    _mode        = config.mode || 'ai';
    _level       = config.difficulty || 8;
    _playerColor = (config.playerColor === 'black') ? 'b' : 'w';
    _gameOver    = false;
    _aiThinking  = false;
    _selectedSquare   = null;
    _pendingPromoFrom = null;
    _pendingPromoTo   = null;

    ChessEngine.init();
    Board.clearSelection();
    Board.setLastMove(null, null);
    Board.flip(_playerColor === 'b');

    // Labels
    const modeLbl  = document.getElementById('game-mode-label');
    const levelLbl = document.getElementById('game-level-label');
    modeLbl.textContent  = _mode === 'ai' ? 'VS AI' : '2 PEMAIN';
    levelLbl.textContent = _mode === 'ai' ? `Lv ${_level} · ${StockfishAI.getLevelName(_level)}` : '—';

    // Player names
    const nameTop    = document.getElementById('name-top');
    const nameBottom = document.getElementById('name-bottom');
    if (_mode === 'ai') {
      if (_playerColor === 'w') {
        // White = bottom = player, Black = top = AI
        nameBottom.textContent = 'Kamu (Putih)';
        nameTop.textContent    = `AI · ${StockfishAI.getLevelName(_level)}`;
      } else {
        // Black = bottom = player, White = top = AI
        nameBottom.textContent = 'Kamu (Hitam)';
        nameTop.textContent    = `AI · ${StockfishAI.getLevelName(_level)}`;
      }
    } else {
      nameBottom.textContent = 'Pemain Putih';
      nameTop.textContent    = 'Pemain Hitam';
    }

    _render();
    _updateTurnUI();
    _clearStatus();
    _clearMoveList();
    document.getElementById('ai-thinking').style.display = 'none';
    document.getElementById('captured-top').textContent    = '';
    document.getElementById('captured-bottom').textContent = '';

    // AI goes first if player chose black
    if (_mode === 'ai' && _playerColor === 'b') {
      setTimeout(_doAiMove, 600);
    }
  }

  /* ---- Square click handler ---- */
  function onSquareClick(square) {
    if (_gameOver || _aiThinking) return;
    if (_pendingPromoFrom) return;
    if (_mode === 'ai' && ChessEngine.turn() !== _playerColor) return;

    const piece = _getPieceAt(square);

    if (_selectedSquare) {
      // Clicking same square → deselect
      if (_selectedSquare === square) {
        _selectedSquare = null;
        Board.clearSelection();
        _render();
        return;
      }
      // Clicking own piece → reselect
      if (piece && piece.color === ChessEngine.turn()) {
        _selectSquare(square);
        return;
      }
      // Try move
      const moves   = ChessEngine.moves(_selectedSquare);
      const isValid = moves.find(m => m.to === square);
      if (isValid) {
        if (isValid.flags.includes('p')) {
          // Pawn promotion
          _pendingPromoFrom = _selectedSquare;
          _pendingPromoTo   = square;
          _showPromoModal(ChessEngine.turn());
        } else {
          _executeMove(_selectedSquare, square, null);
        }
      } else {
        Sound.play('invalid');
        _selectedSquare = null;
        Board.clearSelection();
        _render();
      }
    } else {
      if (piece && piece.color === ChessEngine.turn()) {
        _selectSquare(square);
      }
    }
  }

  function _selectSquare(square) {
    _selectedSquare = square;
    Sound.play('select');
    const moves = State.get('showHints') ? ChessEngine.moves(square) : [];
    Board.setSelected(square, moves);
    _render();
  }

  function _executeMove(from, to, promotion) {
    // Animate first, then apply move
    Board.animateMove(from, to, () => {
      const result = ChessEngine.move(from, to, promotion || 'q');
      if (!result) return;

      // Sound
      if (result.flags.includes('k') || result.flags.includes('q')) Sound.play('castle');
      else if (result.captured) Sound.play('capture');
      else Sound.play('move');

      Board.setLastMove(from, to);
      _selectedSquare = null;
      Board.clearSelection();
      _render();
      _updateTurnUI();
      _updateMoveList();
      _updateCaptured();

      if (ChessEngine.isCheck() && !ChessEngine.isCheckmate()) Sound.play('check');
      _checkGameOver();

      if (!_gameOver && _mode === 'ai' && ChessEngine.turn() !== _playerColor) {
        setTimeout(_doAiMove, 300);
      }
    });
  }

  /* ---- AI Move ---- */
  async function _doAiMove() {
    if (_gameOver) return;
    _aiThinking = true;
    document.getElementById('ai-thinking').style.display = 'flex';

    try {
      const fen = ChessEngine.fen();
      const uci = await StockfishAI.getBestMove(fen, _level);
      document.getElementById('ai-thinking').style.display = 'none';
      _aiThinking = false;
      if (!uci || _gameOver) return;

      const from  = uci.slice(0, 2);
      const to    = uci.slice(2, 4);

      Board.animateMove(from, to, () => {
        const result = ChessEngine.moveStr(uci);
        if (!result) return;

        if (result.flags.includes('k') || result.flags.includes('q')) Sound.play('castle');
        else if (result.captured) Sound.play('capture');
        else Sound.play('move');

        Board.setLastMove(from, to);
        _render();
        _updateTurnUI();
        _updateMoveList();
        _updateCaptured();

        if (ChessEngine.isCheck() && !ChessEngine.isCheckmate()) Sound.play('check');
        _checkGameOver();
      });
    } catch(e) {
      document.getElementById('ai-thinking').style.display = 'none';
      _aiThinking = false;
      console.warn('AI error:', e);
    }
  }

  /* ---- Render ---- */
  function _render() {
    Board.render(ChessEngine.board());
    if (ChessEngine.isCheck()) {
      const sq = ChessEngine.kingInCheckSquare(ChessEngine.turn());
      if (sq) Board.highlightCheck(sq);
    }
  }

  /* ---- Game Over ---- */
  function _checkGameOver() {
    if (!ChessEngine.isGameOver()) {
      _clearStatus();
      return;
    }
    _gameOver = true;
    Sound.play('gameOver');

    const turn = ChessEngine.turn(); // loser's turn
    let title, sub, icon;

    if (ChessEngine.isCheckmate()) {
      if (_mode === 'ai') {
        const playerLost = (turn === _playerColor);
        if (!playerLost) {
          title = 'Kamu Menang! 🎉';
          sub   = `Luar biasa! AI Level ${_level} berhasil dikalahkan.`;
          icon  = '🏆';
          State.addWin();
          Sound.play('win');
        } else {
          title = 'AI Menang';
          sub   = `Level ${_level} (${StockfishAI.getLevelName(_level)}) terlalu kuat. Coba lagi!`;
          icon  = '🤖';
          State.addLoss();
        }
      } else {
        const winner = turn === 'w' ? 'Hitam' : 'Putih';
        title = `${winner} Menang!`;
        sub   = 'Skakmat! Luar biasa.';
        icon  = '♛';
      }
    } else if (ChessEngine.isStalemate()) {
      title = 'Seri — Stalemate';
      sub   = 'Tidak ada langkah valid tersisa.';
      icon  = '🤝';
      if (_mode === 'ai') State.addDraw();
    } else if (ChessEngine.isRepetition()) {
      title = 'Seri — Repetisi';
      sub   = 'Posisi yang sama diulang tiga kali.';
      icon  = '🔄';
      if (_mode === 'ai') State.addDraw();
    } else if (ChessEngine.isInsufficient()) {
      title = 'Seri — Material';
      sub   = 'Bidak tidak cukup untuk skakmat.';
      icon  = '⚖️';
      if (_mode === 'ai') State.addDraw();
    } else {
      title = 'Seri';
      sub   = 'Permainan berakhir seri.';
      icon  = '🤝';
      if (_mode === 'ai') State.addDraw();
    }

    setTimeout(() => {
      document.getElementById('result-icon').textContent  = icon;
      document.getElementById('result-title').textContent = title;
      document.getElementById('result-sub').textContent   = sub;
      document.getElementById('result-moves').textContent = ChessEngine.history().length;
      document.getElementById('modal-gameover').style.display = 'flex';
    }, 700);

    if (typeof Dashboard !== 'undefined') Dashboard.updateStats();
  }

  /* ---- Promotion modal ---- */
  function _showPromoModal(color) {
    const pieces = color === 'w'
      ? [{t:'q',s:'♕'},{t:'r',s:'♖'},{t:'b',s:'♗'},{t:'n',s:'♘'}]
      : [{t:'q',s:'♛'},{t:'r',s:'♜'},{t:'b',s:'♝'},{t:'n',s:'♞'}];

    const container = document.getElementById('promo-choices');
    container.innerHTML = '';
    pieces.forEach(p => {
      const btn = document.createElement('button');
      btn.className   = 'promo-choice';
      btn.textContent = p.s;
      btn.onclick = () => {
        document.getElementById('modal-promotion').style.display = 'none';
        const from = _pendingPromoFrom;
        const to   = _pendingPromoTo;
        _pendingPromoFrom = null;
        _pendingPromoTo   = null;
        _executeMove(from, to, p.t);
      };
      container.appendChild(btn);
    });
    document.getElementById('modal-promotion').style.display = 'flex';
  }

  /* ---- UI Helpers ---- */
  function _updateTurnUI() {
    const turn = ChessEngine.turn();
    const dot  = document.getElementById('turn-dot');
    const txt  = document.getElementById('turn-text');
    dot.className       = 'turn-dot ' + (turn === 'w' ? 'white' : 'black');
    txt.textContent     = turn === 'w' ? 'Giliran Putih' : 'Giliran Hitam';

    const topBar    = document.getElementById('player-top');
    const bottomBar = document.getElementById('player-bottom');
    if (_mode === 'ai') {
      // Bottom is always player
      const playerTurn = (turn === _playerColor);
      bottomBar.classList.toggle('active-turn',  playerTurn);
      topBar.classList.toggle('active-turn',    !playerTurn);
    } else {
      topBar.classList.toggle('active-turn',    turn === 'b');
      bottomBar.classList.toggle('active-turn', turn === 'w');
    }
  }

  function _updateMoveList() {
    const hist = ChessEngine.history();
    const list = document.getElementById('move-list');
    list.innerHTML = '';
    for (let i = 0; i < hist.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row';

      const num = document.createElement('span');
      num.className   = 'move-num';
      num.textContent = (i / 2 + 1) + '.';

      const w = document.createElement('span');
      w.className   = 'move-cell' + (i >= hist.length - 2 ? ' latest' : '');
      w.textContent = hist[i] || '';

      const b = document.createElement('span');
      b.className   = 'move-cell' + (i + 1 >= hist.length - 1 ? ' latest' : '');
      b.textContent = hist[i + 1] || '';

      row.appendChild(num);
      row.appendChild(w);
      row.appendChild(b);
      list.appendChild(row);
    }
    list.scrollTop = list.scrollHeight;
  }

  function _clearMoveList() { document.getElementById('move-list').innerHTML = ''; }

  function _updateCaptured() {
    const hist = ChessEngine.history(true);
    const whiteCap = [], blackCap = [];
    hist.forEach(m => {
      if (m.captured) {
        if (m.color === 'w') whiteCap.push(m.captured); // white captured black piece
        else blackCap.push(m.captured);
      }
    });
    const BS = {p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'};
    const WS = {p:'♙',n:'♘',b:'♗',r:'♖',q:'♕',k:'♔'};

    // Bottom = player, top = opponent
    // whiteCap = black pieces taken by white player
    // blackCap = white pieces taken by black/AI
    const topEl    = document.getElementById('captured-top');
    const bottomEl = document.getElementById('captured-bottom');

    if (_playerColor === 'w' || _mode === '2player') {
      bottomEl.textContent = whiteCap.map(p => BS[p]).join(''); // player took black pieces
      topEl.textContent    = blackCap.map(p => WS[p]).join(''); // opponent took white pieces
    } else {
      bottomEl.textContent = blackCap.map(p => WS[p]).join('');
      topEl.textContent    = whiteCap.map(p => BS[p]).join('');
    }
  }

  function _showStatus(msg, type) {
    const el = document.getElementById('game-status');
    el.textContent = msg;
    el.className   = 'game-status ' + type;
    el.style.display = '';
  }
  function _clearStatus() {
    document.getElementById('game-status').style.display = 'none';
  }

  function _getPieceAt(square) {
    const b    = ChessEngine.board();
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    const row  = 7 - rank;
    return (b[row] && b[row][file]) ? b[row][file] : null;
  }

  /* ---- Public actions ---- */
  function restart() {
    document.getElementById('modal-gameover').style.display = 'none';
    if (_aiThinking) { StockfishAI.terminate(); _aiThinking = false; }
    start(State.getGameConfig());
  }

  function undo() {
    if (_gameOver || _aiThinking) return;
    if (_mode === 'ai') {
      ChessEngine.undoTwo(); // undo AI + player move
    } else {
      ChessEngine.undo();
    }
    _selectedSquare = null;
    Board.clearSelection();
    _render();
    _updateTurnUI();
    _updateMoveList();
    _updateCaptured();
    _clearStatus();
  }

  return { start, onSquareClick, restart, undo };
})();
