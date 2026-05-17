/* ============================================================
   DASHBOARD.JS — Dashboard page logic
   ============================================================ */
'use strict';

const Dashboard = (() => {
  function init() {
    updateStats();
    _bindEvents();
    _buildLevelGrid();
    _initColorChoice();
  }

  function updateStats() {
    const s = State.getStats();
    document.getElementById('stat-wins').textContent   = s.wins;
    document.getElementById('stat-draws').textContent  = s.draws;
    document.getElementById('stat-losses').textContent = s.losses;
  }

  function _bindEvents() {
    // Goto settings
    document.getElementById('btn-goto-settings').onclick = () => Router.goTo('settings');

    // VS AI
    document.getElementById('btn-vs-ai').onclick = () => {
      _openDifficultyModal('ai');
    };

    // 2 Player
    document.getElementById('btn-2player').onclick = () => {
      State.setGameConfig({ mode: '2player', playerColor: 'white', difficulty: 1 });
      Router.goTo('game');
      Board.init('chessboard', Game.onSquareClick);
      Game.start(State.getGameConfig());
    };

    // Difficulty modal
    document.getElementById('modal-close').onclick = () => {
      document.getElementById('modal-difficulty').style.display = 'none';
    };
    document.getElementById('modal-difficulty').onclick = (e) => {
      if (e.target === document.getElementById('modal-difficulty'))
        document.getElementById('modal-difficulty').style.display = 'none';
    };

    document.getElementById('btn-start-ai').onclick = _startAiGame;

    // Game controls
    document.getElementById('btn-exit-game').onclick = () => {
      StockfishAI.terminate();
      document.getElementById('modal-gameover').style.display = 'none';
      Router.goTo('dashboard');
      updateStats();
    };
    document.getElementById('btn-restart').onclick = () => Game.restart();
    document.getElementById('btn-undo').onclick    = () => Game.undo();

    // Game over modal
    document.getElementById('btn-play-again').onclick = () => Game.restart();
    document.getElementById('btn-back-home').onclick  = () => {
      document.getElementById('modal-gameover').style.display = 'none';
      Router.goTo('dashboard');
      updateStats();
    };
  }

  let _selectedLevel = 8;
  let _selectedColor = 'white';

  function _openDifficultyModal() {
    // Sync level from settings
    _selectedLevel = State.get('difficulty') || 8;
    _selectedColor = 'white';
    _refreshLevelGrid();
    _refreshColorChoice();
    document.getElementById('modal-difficulty').style.display = 'flex';
  }

  function _buildLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 15; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.dataset.level = i;
      btn.dataset.tier  = StockfishAI.getLevelTier(i);

      const num = document.createElement('span');
      num.className = 'level-num';
      num.textContent = i;

      const name = document.createElement('span');
      name.className = 'level-name';
      name.textContent = StockfishAI.getLevelName(i).toUpperCase();

      btn.appendChild(num);
      btn.appendChild(name);
      btn.onclick = () => {
        _selectedLevel = i;
        _refreshLevelGrid();
      };
      grid.appendChild(btn);
    }
    _refreshLevelGrid();
  }

  function _refreshLevelGrid() {
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === _selectedLevel);
    });
  }

  function _initColorChoice() {
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.onclick = () => {
        _selectedColor = btn.dataset.color;
        _refreshColorChoice();
      };
    });
  }

  function _refreshColorChoice() {
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === _selectedColor);
    });
  }

  function _startAiGame() {
    let color = _selectedColor;
    if (color === 'random') color = Math.random() < 0.5 ? 'white' : 'black';

    State.setGameConfig({ mode: 'ai', playerColor: color, difficulty: _selectedLevel });
    State.set('difficulty', _selectedLevel);

    document.getElementById('modal-difficulty').style.display = 'none';
    Router.goTo('game');
    Board.init('chessboard', Game.onSquareClick);
    Game.start(State.getGameConfig());
  }

  return { init, updateStats };
})();
