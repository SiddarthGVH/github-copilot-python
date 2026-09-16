const SIZE = 9;
const LEADERBOARD_KEY = 'sudokuScores';
const state = {
  puzzle: [], locked: [], difficulty: 'medium', hintsUsed: 0,
  timerSeconds: 0, gameOver: false, timerId: null, selectedNumber: null,
};
const elements = {};

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function setMessage(text, kind = '') {
  elements.message.textContent = text;
  elements.message.className = `message ${kind}`.trim();
}

function updateTimer() {
  elements.timer.textContent = formatTime(state.timerSeconds);
}

function stopTimer() {
  if (state.timerId !== null) window.clearInterval(state.timerId);
  state.timerId = null;
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.timerSeconds += 1;
    updateTimer();
  }, 1000);
}

function currentBoard() {
  return Array.from({length: SIZE}, (_, row) => Array.from({length: SIZE}, (_, col) => {
    const input = elements.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    return input.value ? Number(input.value) : 0;
  }));
}

function boardIsFull(board) {
  return board.every((row) => row.every((value) => value !== 0));
}

function renderNumberTracker() {
  const counts = Array(SIZE + 1).fill(0);
  currentBoard().flat().forEach((value) => { if (value) counts[value] += 1; });
  elements.numberTracker.querySelectorAll('button').forEach((button) => {
    const number = Number(button.dataset.number);
    button.querySelector('.number-count').textContent = counts[number];
    button.classList.toggle('complete', counts[number] === SIZE);
    button.classList.toggle('selected', state.selectedNumber === number);
    button.setAttribute('aria-pressed', String(state.selectedNumber === number));
  });
  elements.board.querySelectorAll('.sudoku-cell').forEach((input) => {
    input.classList.toggle('number-highlight', state.selectedNumber !== null && Number(input.value) === state.selectedNumber);
  });
}

function toggleNumberTracker(number) {
  state.selectedNumber = state.selectedNumber === number ? null : number;
  renderNumberTracker();
}

function createBoard() {
  elements.board.replaceChildren();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const input = document.createElement('input');
      input.type = 'text'; input.inputMode = 'numeric'; input.maxLength = 1;
      const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      input.className = `sudoku-cell box-${boxIndex % 2}`;
      if (col % 3 === 2) input.classList.add('box-right');
      if (row % 3 === 2) input.classList.add('box-bottom');
      input.dataset.row = row; input.dataset.col = col;
      input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
      input.setAttribute('role', 'gridcell');
      elements.board.append(input);
    }
  }
}

function renderPuzzle() {
  createBoard();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const input = elements.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const locked = state.locked[row][col];
      input.value = locked ? state.puzzle[row][col] : '';
      input.disabled = locked;
      input.classList.toggle('prefilled', locked);
    }
  }
  renderNumberTracker();
}

function conflictingCells(board) {
  const conflicts = new Set();
  const markDuplicates = (cells) => {
    const seen = new Map();
    cells.forEach(([row, col]) => {
      const value = board[row][col];
      if (!value) return;
      if (seen.has(value)) {
        conflicts.add(`${row},${col}`); conflicts.add(`${seen.get(value)[0]},${seen.get(value)[1]}`);
      } else seen.set(value, [row, col]);
    });
  };
  for (let index = 0; index < SIZE; index += 1) {
    markDuplicates(Array.from({length: SIZE}, (_, offset) => [index, offset]));
    markDuplicates(Array.from({length: SIZE}, (_, offset) => [offset, index]));
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
    markDuplicates(Array.from({length: 9}, (_, index) => [boxRow + Math.floor(index / 3), boxCol + index % 3]));
  }
  return conflicts;
}

function updateConflicts() {
  const conflicts = conflictingCells(currentBoard());
  elements.board.querySelectorAll('.sudoku-cell:not(.prefilled)').forEach((input) => {
    input.classList.toggle('conflict', conflicts.has(`${input.dataset.row},${input.dataset.col}`));
  });
}

async function newGame() {
  state.difficulty = elements.difficulty.value;
  setMessage('Loading puzzle...');
  try {
    const response = await fetch('/new', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({difficulty: state.difficulty})});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Unable to start a new game.');
    state.puzzle = data.puzzle; state.locked = data.locked; state.hintsUsed = 0; state.selectedNumber = null;
    state.timerSeconds = 0; state.gameOver = false;
    elements.hintsUsed.textContent = '0'; updateTimer(); renderPuzzle(); setMessage(''); startTimer();
  } catch (error) { stopTimer(); setMessage(error.message, 'error'); }
}

async function useHint() {
  if (state.gameOver) return;
  if (boardIsFull(currentBoard())) {
    setMessage('There are no empty cells left. Try checking your solution.', '');
    return;
  }
  try {
    const response = await fetch('/hint', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({board: currentBoard()})});
    const data = await response.json();
    if (!response.ok || data.error) {
      if (data.error === 'No empty cells available') {
        setMessage('There are no empty cells left. Try checking your solution.', '');
        return;
      }
      throw new Error(data.error || 'Unable to provide a hint.');
    }
    const input = elements.board.querySelector(`[data-row="${data.row}"][data-col="${data.col}"]`);
    input.value = data.value; input.classList.add('hinted'); input.disabled = true;
    state.hintsUsed += 1; elements.hintsUsed.textContent = state.hintsUsed; updateConflicts(); renderNumberTracker();
    if (boardIsFull(currentBoard())) checkSolution();
  } catch (error) { setMessage(error.message, 'error'); }
}

async function checkSolution() {
  if (state.gameOver) return;
  elements.board.querySelectorAll('.incorrect').forEach((input) => input.classList.remove('incorrect'));
  try {
    const response = await fetch('/check', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({board: currentBoard()})});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Unable to check the puzzle.');
    const incorrect = new Set(data.incorrect.map(([row, col]) => `${row},${col}`));
    elements.board.querySelectorAll('.sudoku-cell:not(.prefilled)').forEach((input) => input.classList.toggle('incorrect', incorrect.has(`${input.dataset.row},${input.dataset.col}`)));
    if (data.solved) {
      state.gameOver = true;
      stopTimer();
      setMessage(`Solved in ${formatTime(state.timerSeconds)}.`, 'success');
      showWinModal();
    } else setMessage(incorrect.size ? 'Some cells are incorrect.' : 'Looks good so far - keep going.', incorrect.size ? 'error' : '');
  } catch (error) { setMessage(error.message, 'error'); }
}

function loadLeaderboard() {
  try {
    const scores = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    return Array.isArray(scores) ? scores.filter((score) => (
      score && typeof score.name === 'string' && Number.isFinite(score.timeSeconds)
      && typeof score.difficulty === 'string' && Number.isFinite(score.hints)
    )) : [];
  } catch (error) {
    return [];
  }
}

function saveScore({name, timeSeconds, difficulty, hints}) {
  const scores = [...loadLeaderboard(), {name: name.trim().slice(0, 24), timeSeconds, difficulty, hints}]
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
    .slice(0, 10);
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores)); } catch (error) { /* Storage may be unavailable. */ }
  renderLeaderboard();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function renderLeaderboard() {
  const scores = loadLeaderboard();
  elements.leaderboard.replaceChildren();
  if (!scores.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5; cell.textContent = 'No scores yet. Solve a puzzle to make the board.';
    row.append(cell); elements.leaderboard.append(row);
    return;
  }
  scores.forEach((score, index) => {
    const row = document.createElement('tr');
    [index + 1, formatTime(score.timeSeconds), score.difficulty, score.hints].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
    const nameCell = document.createElement('td');
    nameCell.innerHTML = escapeHtml(score.name);
    row.insertBefore(nameCell, row.children[1]);
    elements.leaderboard.append(row);
  });
}

function showWinModal() {
  elements.winSummary.textContent = `Time: ${formatTime(state.timerSeconds)} | Difficulty: ${state.difficulty} | Hints: ${state.hintsUsed}`;
  elements.playerName.value = '';
  elements.winModal.showModal();
  elements.playerName.focus();
}

function applyTheme(theme, persist = true) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  elements.themeToggle.textContent = dark ? 'Light mode' : 'Dark mode';
  elements.themeToggle.setAttribute('aria-pressed', String(dark));
  if (persist) {
    try { localStorage.setItem('sudokuTheme', dark ? 'dark' : 'light'); } catch (error) { /* Storage may be unavailable. */ }
  }
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

window.addEventListener('DOMContentLoaded', () => {
  elements.board = document.getElementById('sudoku-board'); elements.message = document.getElementById('message');
  elements.timer = document.getElementById('timer'); elements.hintsUsed = document.getElementById('hints-used'); elements.numberTracker = document.getElementById('number-tracker');
  elements.difficulty = document.getElementById('difficulty'); elements.themeToggle = document.getElementById('theme-toggle'); elements.leaderboard = document.getElementById('leaderboard-body');
  elements.winModal = document.getElementById('win-modal'); elements.winForm = document.getElementById('win-form'); elements.winSummary = document.getElementById('win-summary'); elements.playerName = document.getElementById('player-name');
  elements.board.addEventListener('input', (event) => { if (event.target.matches('.sudoku-cell:not(:disabled)')) { event.target.value = event.target.value.replace(/[^1-9]/g, ''); event.target.classList.remove('incorrect'); updateConflicts(); renderNumberTracker(); if (boardIsFull(currentBoard())) checkSolution(); } });
  elements.numberTracker.addEventListener('click', (event) => { const button = event.target.closest('button[data-number]'); if (button) toggleNumberTracker(Number(button.dataset.number)); });
  document.getElementById('new-game').addEventListener('click', newGame); document.getElementById('hint').addEventListener('click', useHint); document.getElementById('check-solution').addEventListener('click', checkSolution); elements.themeToggle.addEventListener('click', toggleTheme);
  elements.winForm.addEventListener('submit', (event) => { event.preventDefault(); saveScore({name: elements.playerName.value, timeSeconds: state.timerSeconds, difficulty: state.difficulty, hints: state.hintsUsed}); elements.winModal.close(); });
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('sudokuTheme'); } catch (error) { /* Use the system preference. */ }
  const initialTheme = savedTheme === 'dark' || savedTheme === 'light'
    ? savedTheme
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme, false);
  renderLeaderboard(); newGame();
});