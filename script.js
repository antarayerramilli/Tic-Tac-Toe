/**
 * CYBER TIC-TAC-TOE
 * VOSC Activity-1 Project
 * 
 * Clean, readable vanilla JavaScript implementation.
 * Features 2-Player (Friend) and 1-Player (vs Computer) modes,
 * smart AI blocking/winning logic, system activity logging,
 * and persistent round scoring.
 */

// ==========================================
// 1. GAME CONSTANTS & STATE
// ==========================================

// Winning line combinations on a 3x3 board
const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1 (A1, A2, A3)
  [3, 4, 5], // Row 2 (B1, B2, B3)
  [6, 7, 8], // Row 3 (C1, C2, C3)
  [0, 3, 6], // Column 1 (A1, B1, C1)
  [1, 4, 7], // Column 2 (A2, B2, C2)
  [2, 5, 8], // Column 3 (A3, B3, C3)
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6]  // Diagonal top-right to bottom-left
];

// Coordinate names for 3x3 grid
const GRID_COORDINATES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];

// Game state variables
let boardState = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "NODE"; // "NODE" (X) or "FIREWALL" (O)
let gameActive = false;
let gameMode = "friend"; // "friend" or "computer"
let playerSide = "NODE"; // Side chosen by human player ("NODE" or "FIREWALL")
let computerSide = "FIREWALL"; // Opposite of playerSide
let isComputerThinking = false;

// Score tracker
const scores = {
  NODE: 0,
  FIREWALL: 0,
  DRAWS: 0
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================

// Screens
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");

// Start screen controls
const modeFriendBtn = document.getElementById("mode-friend");
const modeComputerBtn = document.getElementById("mode-computer");
const sideNodeBtn = document.getElementById("side-node");
const sideFirewallBtn = document.getElementById("side-firewall");
const startBtn = document.getElementById("start-btn");

// Gameplay elements
const boardElement = document.getElementById("board");
const cellElements = document.querySelectorAll(".cell");
const currentPlayerText = document.getElementById("current-player-text");
const statusMessage = document.getElementById("status-message");

// Scores
const scoreNodeElement = document.getElementById("score-node");
const scoreFirewallElement = document.getElementById("score-firewall");
const scoreDrawsElement = document.getElementById("score-draws");

// Action buttons
const newRoundBtn = document.getElementById("new-round-btn");
const resetScoreBtn = document.getElementById("reset-score-btn");
const changeModeBtn = document.getElementById("change-mode-btn");

// Confirmation modal
const confirmModal = document.getElementById("confirm-modal");
const confirmYesBtn = document.getElementById("confirm-yes-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

// System log
const logList = document.getElementById("log-list");


// ==========================================
// 3. INITIALIZATION & SETUP
// ==========================================

/**
 * Attach all event listeners to buttons and board cells
 */
function init() {
  // Mode selection buttons
  modeFriendBtn.addEventListener("click", () => selectMode("friend"));
  modeComputerBtn.addEventListener("click", () => selectMode("computer"));

  // Side selection buttons
  sideNodeBtn.addEventListener("click", () => selectSide("NODE"));
  sideFirewallBtn.addEventListener("click", () => selectSide("FIREWALL"));

  // Start game button
  startBtn.addEventListener("click", startGame);

  // Board cells
  cellElements.forEach(cell => {
    cell.addEventListener("click", handleCellClick);
  });

  // Gameplay buttons
  newRoundBtn.addEventListener("click", resetBoard);
  resetScoreBtn.addEventListener("click", () => showConfirmModal(true));
  changeModeBtn.addEventListener("click", returnToSetup);

  // Modal buttons
  confirmYesBtn.addEventListener("click", () => {
    resetScore();
    showConfirmModal(false);
  });
  confirmCancelBtn.addEventListener("click", () => {
    showConfirmModal(false);
  });
}

/**
 * Handle game mode selection on setup screen
 */
function selectMode(mode) {
  gameMode = mode;
  if (mode === "friend") {
    modeFriendBtn.classList.add("active");
    modeComputerBtn.classList.remove("active");
  } else {
    modeComputerBtn.classList.add("active");
    modeFriendBtn.classList.remove("active");
  }
}

/**
 * Handle player side choice on setup screen
 */
function selectSide(side) {
  playerSide = side;
  computerSide = (side === "NODE") ? "FIREWALL" : "NODE";

  if (side === "NODE") {
    sideNodeBtn.classList.add("active");
    sideFirewallBtn.classList.remove("active");
  } else {
    sideFirewallBtn.classList.add("active");
    sideNodeBtn.classList.remove("active");
  }
}

/**
 * Switch from Setup Screen to Gameplay Screen
 */
function startGame() {
  startScreen.classList.remove("active");
  gameScreen.classList.add("active");

  computerSide = (playerSide === "NODE") ? "FIREWALL" : "NODE";

  // Reset log
  logList.innerHTML = "";
  updateSystemLog("Mode: " + (gameMode === "friend" ? "2-Player (Friend)" : "Vs Computer"));
  updateSystemLog("Player assigned to " + playerSide);

  resetBoard();
}

/**
 * Return from Game to Setup Screen
 */
function returnToSetup() {
  gameActive = false;
  gameScreen.classList.remove("active");
  startScreen.classList.add("active");
}


// ==========================================
// 4. GAMEPLAY LOGIC
// ==========================================

/**
 * Resets the 3x3 board for a new round
 */
function resetBoard() {
  boardState = ["", "", "", "", "", "", "", "", ""];
  gameActive = true;
  isComputerThinking = false;
  
  // NODE (X) always moves first in classic Tic-Tac-Toe
  currentPlayer = "NODE";

  // Clear cell DOM
  cellElements.forEach(cell => {
    cell.textContent = "";
    cell.className = "cell";
    cell.removeAttribute("disabled");
  });

  updateTurnDisplay();
  statusMessage.textContent = "New round started. Signal ready.";
  updateSystemLog("New round initiated.");

  // If in computer mode and computer is NODE, trigger computer's opening move
  if (gameMode === "computer" && currentPlayer === computerSide) {
    triggerComputerTurn();
  }
}

/**
 * Handles user clicking a cell
 */
function handleCellClick(event) {
  const cell = event.currentTarget;
  const index = parseInt(cell.getAttribute("data-index"), 10);

  // Guard: if game is over or computer is thinking
  if (!gameActive || isComputerThinking) {
    return;
  }

  // Guard: if playing vs computer and it's not the human's turn
  if (gameMode === "computer" && currentPlayer === computerSide) {
    return;
  }

  // Guard: if cell is already occupied
  if (boardState[index] !== "") {
    statusMessage.textContent = "That cell is already locked.";
    return;
  }

  // Execute the player's move
  makeMove(index, currentPlayer);

  // Check end conditions
  if (checkWinner(currentPlayer)) {
    showResult("WIN", currentPlayer);
    return;
  }

  if (checkDraw()) {
    showResult("DRAW");
    return;
  }

  // Switch turn
  switchTurn();

  // If vs Computer, trigger computer move
  if (gameMode === "computer" && gameActive && currentPlayer === computerSide) {
    triggerComputerTurn();
  }
}

/**
 * Places mark on state and updates DOM
 */
function makeMove(index, player) {
  const symbol = (player === "NODE") ? "X" : "O";
  boardState[index] = symbol;

  const cell = cellElements[index];
  cell.textContent = symbol;
  cell.classList.add(player === "NODE" ? "node-mark" : "firewall-mark");

  const coord = GRID_COORDINATES[index];
  updateSystemLog(player + " selected " + coord);
  statusMessage.textContent = "Signal placed on " + coord + ".";
}

/**
 * Switches current player
 */
function switchTurn() {
  currentPlayer = (currentPlayer === "NODE") ? "FIREWALL" : "NODE";
  updateTurnDisplay();

  const nextName = (currentPlayer === "NODE") ? "Node" : "Firewall";
  statusMessage.textContent = nextName + "'s move.";
}

/**
 * Updates the turn indicator at the top of the board
 */
function updateTurnDisplay() {
  if (currentPlayer === "NODE") {
    const isBot = (gameMode === "computer" && computerSide === "NODE");
    currentPlayerText.className = "node-highlight";
    currentPlayerText.textContent = isBot ? "🤖 NODE (X)" : "⚡ NODE (X)";
  } else {
    const isBot = (gameMode === "computer" && computerSide === "FIREWALL");
    currentPlayerText.className = "firewall-highlight";
    currentPlayerText.textContent = isBot ? "🤖 FIREWALL (O)" : "🛡️ FIREWALL (O)";
  }
}


// ==========================================
// 5. WIN & DRAW EVALUATION
// ==========================================

/**
 * Checks if the specified player has achieved 3 in a row
 */
function checkWinner(player) {
  const symbol = (player === "NODE") ? "X" : "O";

  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    if (boardState[a] === symbol && boardState[b] === symbol && boardState[c] === symbol) {
      highlightWinningCells([a, b, c], player);
      return true;
    }
  }
  return false;
}

/**
 * Checks if all cells are filled with no winner
 */
function checkDraw() {
  return boardState.every(cell => cell !== "");
}

/**
 * Highlights winning trio cells with visual pulse
 */
function highlightWinningCells(indices, player) {
  const winClass = (player === "NODE") ? "winner-node" : "winner-firewall";
  indices.forEach(idx => {
    cellElements[idx].classList.add(winClass);
  });
}

/**
 * Handles end of round display, score increment, and status
 */
function showResult(type, winner = null) {
  gameActive = false;

  if (type === "WIN") {
    scores[winner]++;
    updateScore();

    if (winner === "NODE") {
      statusMessage.textContent = "Grid compromised.";
      currentPlayerText.className = "node-highlight";
      currentPlayerText.textContent = "⚡ NODE BREACHED THE GRID";
      updateSystemLog("⚡ NODE breached the grid!");
    } else {
      statusMessage.textContent = "Grid compromised.";
      currentPlayerText.className = "firewall-highlight";
      currentPlayerText.textContent = "🛡️ FIREWALL LOCKED IT DOWN";
      updateSystemLog("🛡️ FIREWALL locked it down!");
    }
  } else {
    // DRAW
    scores.DRAWS++;
    updateScore();

    statusMessage.textContent = "System deadlock.";
    currentPlayerText.className = "draw-highlight";
    currentPlayerText.textContent = "SYSTEM DEADLOCK (DRAW)";
    updateSystemLog("Deadlock: No winner this round.");
  }
}


// ==========================================
// 6. COMPUTER OPPONENT (AI)
// ==========================================

/**
 * Delays computer move slightly for realistic feel
 */
function triggerComputerTurn() {
  isComputerThinking = true;
  statusMessage.textContent = "Computer analyzing grid...";

  setTimeout(() => {
    if (!gameActive) {
      isComputerThinking = false;
      return;
    }

    const moveIndex = computerMove();
    if (moveIndex !== -1) {
      makeMove(moveIndex, computerSide);

      if (checkWinner(computerSide)) {
        showResult("WIN", computerSide);
      } else if (checkDraw()) {
        showResult("DRAW");
      } else {
        switchTurn();
      }
    }

    isComputerThinking = false;
  }, 450);
}

/**
 * Decides best computer move:
 * 1. Take a winning move if available.
 * 2. Block the player's winning move if necessary.
 * 3. Pick center or an available random cell.
 */
function computerMove() {
  const botSymbol = (computerSide === "NODE") ? "X" : "O";
  const humanSymbol = (playerSide === "NODE") ? "X" : "O";

  // 1. Check for immediate winning move
  const winMove = findWinningMove(botSymbol);
  if (winMove !== -1) {
    return winMove;
  }

  // 2. Check for immediate blocking move
  const blockMove = findWinningMove(humanSymbol);
  if (blockMove !== -1) {
    return blockMove;
  }

  // 3. Take center cell (B2) if available
  if (boardState[4] === "") {
    return 4;
  }

  // 4. Otherwise, pick any available cell at random
  const emptyCells = [];
  for (let i = 0; i < boardState.length; i++) {
    if (boardState[i] === "") {
      emptyCells.push(i);
    }
  }

  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
  }

  return -1;
}

/**
 * Helper to check if a symbol can complete any winning combination
 */
function findWinningMove(symbol) {
  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    const line = [boardState[a], boardState[b], boardState[c]];

    // Check if 2 cells contain the symbol and 1 cell is empty
    const symbolCount = line.filter(val => val === symbol).length;
    const emptyCount = line.filter(val => val === "").length;

    if (symbolCount === 2 && emptyCount === 1) {
      if (boardState[a] === "") return a;
      if (boardState[b] === "") return b;
      if (boardState[c] === "") return c;
    }
  }
  return -1;
}


// ==========================================
// 7. SCORE & SYSTEM LOG HELPERS
// ==========================================

/**
 * Updates scoreboard UI numbers
 */
function updateScore() {
  scoreNodeElement.textContent = scores.NODE;
  scoreFirewallElement.textContent = scores.FIREWALL;
  scoreDrawsElement.textContent = scores.DRAWS;
}

/**
 * Resets all scores back to 0
 */
function resetScore() {
  scores.NODE = 0;
  scores.FIREWALL = 0;
  scores.DRAWS = 0;
  updateScore();
  updateSystemLog("All scores wiped.");
  statusMessage.textContent = "Scores reset to zero.";
}

/**
 * Appends a line to the system terminal log (maintaining 4-5 items max)
 */
function updateSystemLog(message) {
  const item = document.createElement("li");
  item.textContent = "> " + message;
  logList.appendChild(item);

  // Keep maximum 5 log entries
  while (logList.children.length > 5) {
    logList.removeChild(logList.firstChild);
  }
}

/**
 * Toggles confirmation modal for score reset
 */
function showConfirmModal(show) {
  if (show) {
    confirmModal.classList.add("active");
  } else {
    confirmModal.classList.remove("active");
  }
}

// Run initialization when script is loaded
init();
