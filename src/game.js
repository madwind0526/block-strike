const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const TOP_GAP = 70;
const BLOCK_COLS = 7;
const DEFAULT_BLOCK_ROWS = 5;
const MOBILE_BLOCK_ROWS = 4;
const FACE_COUNT = 2;
const GRID_MARGIN_X = 26;
const BLOCK_GAP = 4;
const GRID_W = W - GRID_MARGIN_X * 2;
const BLOCK_W = (GRID_W - (BLOCK_COLS - 1) * BLOCK_GAP) / BLOCK_COLS;
const BLOCK_H = BLOCK_W;
const GRID_X = GRID_MARGIN_X;
const GRID_Y = TOP_GAP;
const MAX_LIVES = 5;
const EXPLOSION_RADIUS = BLOCK_W * 2;
const BASE_PADDLE_W = 115;
const WIDE_DURATION = 20000;
const ROLL_INTERVAL = 20;
const PADDLE_BOUNCE_INFLUENCE = 1.4;
const INITIAL_STAGE = 1;
const INITIAL_SCORE = 0;
const LEADERBOARD_KEY = "rollingBlockStrikeLeaderboard";
const LEADERBOARD_LIMIT = 10;
const DOUBLE_TAP_MS = 340;
const DOUBLE_TAP_DISTANCE = 32;
const SWIPE_MIN_DISTANCE = 70;
const SWIPE_MAX_VERTICAL_DRIFT = 45;
const FACE_SWITCH_DURATION = 0.26;
const SOUND_POOL_SIZE = 6;
const LEGACY_LEADERBOARD_SAMPLE_DISABLED_KEY = "rollingBlockStrikeSampleDisabled";
const SPECIAL_BLOCK_TOTAL = 5;
const BREAKABLE_SPECIAL_TYPES = ["rocket", "slow", "x3", "wide", "bomb"];
const SPECIAL_TYPE_SET = new Set([...BREAKABLE_SPECIAL_TYPES, "shield"]);
const INFI_BLOCK_START_STAGE = 10;
const MAX_INFI_BLOCKS = 7;

function isMobileLayout() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 640;
}

function blockRowCount() {
  return isMobileLayout() ? MOBILE_BLOCK_ROWS : DEFAULT_BLOCK_ROWS;
}

function enterPrompt(action) {
  return isMobileLayout() ? `Double Tap to ${action}` : `Press Enter to ${action}`;
}

const hud = {
  logo: document.querySelector(".logo-title"),
  stage: document.getElementById("stage-value"),
  rank: document.getElementById("rank-value"),
  score: document.getElementById("score-value"),
  lives: document.getElementById("lives-value"),
  rocket: document.getElementById("rocket-value"),
  slow: document.getElementById("slow-value"),
  x3: document.getElementById("x3-value"),
  wide: document.getElementById("wide-value"),
  bomb: document.getElementById("bomb-value"),
  shield: document.getElementById("shield-value"),
};

const overlay = {
  root: document.getElementById("screen-overlay"),
  logo: document.querySelector(".overlay-logo"),
  title: document.getElementById("overlay-title"),
  gameover: document.getElementById("overlay-gameover"),
  nextStage: document.getElementById("overlay-nextstage"),
  topRanks: document.getElementById("overlay-topranks"),
  score: document.getElementById("overlay-score"),
  prompt: document.getElementById("overlay-prompt"),
  nameEntry: document.getElementById("name-entry"),
  nameInput: document.getElementById("player-name"),
  rankList: document.getElementById("rank-list"),
};

const debugUi = {
  root: document.getElementById("debug-overlay"),
  panel: document.getElementById("debug-panel"),
  command: document.getElementById("debug-command"),
  stageField: document.getElementById("debug-stage-field"),
  stage: document.getElementById("debug-stage"),
  cancel: document.getElementById("debug-cancel"),
};

const cheatStatus = {
  root: document.getElementById("cheat-status"),
  godMode: document.querySelector('[data-cheat="godMode"]'),
  fullLives: document.querySelector('[data-cheat="fullLives"]'),
  immortal: document.querySelector('[data-cheat="immortal"]'),
  jumpTo: document.querySelector('[data-cheat="jumpTo"]'),
};

const keys = new Set();
let pointerX = null;
let lastTime = performance.now();
let lastTap = { time: 0, x: 0, y: 0, scope: "" };
let swipeStart = null;
const imageTrims = new WeakMap();

const state = {
  mode: "intro",
  stageNumber: INITIAL_STAGE,
  score: INITIAL_SCORE,
  lives: 3,
  immortal: false,
  godMode: false,
  fullLivesCheat: false,
  jumpToCheat: false,
  jumpToStage: INITIAL_STAGE,
  paused: false,
  waitingLaunch: true,
  stageMessage: "Press Space",
  messageTimer: 0,
  wideUntil: 0,
  paddleHits: 0,
  speedSteps: 0,
  rockets: [],
  paddle: {
    x: W / 2 - BASE_PADDLE_W / 2,
    y: H - 106,
    w: BASE_PADDLE_W,
    h: 40,
    speed: 420,
    vx: 0,
  },
  balls: [],
  particles: [],
  scorePopups: [],
  explosions: [],
  stage: null,
  faceTransition: null,
  pendingRankScore: 0,
  pendingRankStage: INITIAL_STAGE,
  pendingNextStage: INITIAL_STAGE,
  cheatUsed: false,
  debugPreviousPaused: false,
};

const iconSources = {
  x3: "assets/images/power-x3.png",
  slow: "assets/images/power-slow.png",
  bomb: "assets/images/power-bomb.png",
  wide: "assets/images/power-wide.png",
  rocket: "assets/images/power-rocket.png",
  shield: "assets/images/block-shield.png",
  red: "assets/images/block-red.png",
  orange: "assets/images/block-orange.png",
  green: "assets/images/block-green.png",
  yellow: "assets/images/block-yellow.png",
  blue: "assets/images/block-blue.png",
  purple: "assets/images/block-purple.png",
};

const icons = Object.fromEntries(
  Object.entries(iconSources).map(([key, src]) => {
    const image = new Image();
    image.addEventListener("load", () => cacheImageTrim(image));
    image.src = src;
    return [key, image];
  })
);

const paddleImg = new Image();
paddleImg.src = "assets/images/paddle.png";

const soundSources = {
  paddle: "assets/sounds/PaddleHit.mp3",
  bomb: "assets/sounds/Bomb.mp3",
  block: "assets/sounds/BlockHit.mp3",
  infi: "assets/sounds/InfiBlockHit.mp3",
  rocket: "assets/sounds/Rocket.mp3",
  slow: "assets/sounds/SlowHit.mp3",
  wide: "assets/sounds/WiderHit.mp3",
  gameStart: "assets/sounds/GameStart.mp3",
  gameOver: "assets/sounds/GameOver.mp3",
  rank: "assets/sounds/Rank.mp3",
  stageStart: "assets/sounds/StageStart.mp3",
  rollingBlocks: "assets/sounds/Rolling1.mp3",
  rollingFace: "assets/sounds/Rolling2.mp3",
};

function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.75;
  return audio;
}

const sounds = Object.fromEntries(
  Object.entries(soundSources).map(([key, src]) => [key, createAudio(src)])
);
const soundPools = Object.fromEntries(
  Object.entries(soundSources).map(([key, src]) => [
    key,
    Array.from({ length: SOUND_POOL_SIZE }, () => createAudio(src)),
  ])
);
const soundPoolCursors = Object.fromEntries(
  Object.keys(soundSources).map(key => [key, 0])
);
let audioUnlocked = false;
let loopSound = null;
let loopSoundName = null;
let loopSoundToken = 0;

const palettes = {
  red: ["#ff8d82", "#ef342e"],
  orange: ["#ffc15b", "#ff7f22"],
  green: ["#80e8a4", "#22a75f"],
  yellow: ["#ffe36a", "#eeb41e"],
  blue: ["#55d8ff", "#0b82d3"],
  purple: ["#bc78ff", "#722fd0"],
  solid: ["#565d66", "#101721"],
  x3: ["#77e99b", "#149454"],
  slow: ["#65d9ff", "#0a78ce"],
  bomb: ["#ff9488", "#d92d2d"],
  rocket: ["#8ceeff", "#179ee9"],
  wide: ["#eef7ff", "#2f9de8"],
  shield: ["#565d66", "#101721"],
};
const normalLevels = [
  { value: 20, color: "yellow", shade: 0 },
  { value: 30, color: "orange", shade: 0 },
  { value: 40, color: "green", shade: 0 },
  { value: 50, color: "blue", shade: 0 },
  { value: 60, color: "red", shade: 0 },
  { value: 70, color: "purple", shade: 0 },
  { value: 80, color: "purple", shade: 0.14 },
  { value: 90, color: "purple", shade: 0.28 },
];
const normalNumbers = normalLevels.map(level => level.value);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (loopSound) loopSound.muted = false;
  Object.values(sounds).forEach(audio => {
    audio.load();
  });
  Object.values(soundPools).flat().forEach(audio => {
    audio.load();
  });
  resumeModeSound();
}

function playSound(name) {
  const key = sounds[name] ? name : "block";
  const pool = soundPools[key];
  if (!audioUnlocked || !pool?.length) return;

  const availableIndex = pool.findIndex(audio => audio.paused || audio.ended);
  const index = availableIndex >= 0 ? availableIndex : soundPoolCursors[key];
  soundPoolCursors[key] = (index + 1) % pool.length;

  const audio = pool[index];
  audio.pause();
  audio.currentTime = 0;
  audio.volume = sounds[key].volume;
  audio.play().catch(() => {});
}

function stopLoopSound() {
  loopSoundToken++;
  if (!loopSound) return;
  loopSound.pause();
  loopSound.currentTime = 0;
  loopSound = null;
  loopSoundName = null;
}

function playLoopSound(name) {
  if (loopSoundName === name && loopSound && !loopSound.paused) return;
  stopLoopSound();
  const source = sounds[name];
  if (!source) return;
  const token = ++loopSoundToken;
  loopSound = source.cloneNode();
  loopSound.loop = true;
  loopSound.muted = !audioUnlocked;
  loopSound.volume = Math.min(source.volume, 0.58);
  loopSoundName = name;
  const pendingLoop = loopSound;
  pendingLoop.play().then(() => {
    if (token !== loopSoundToken || loopSound !== pendingLoop) {
      pendingLoop.pause();
      pendingLoop.currentTime = 0;
      return;
    }
    if (pendingLoop.muted) {
      setTimeout(() => {
        if (token === loopSoundToken && loopSound === pendingLoop) pendingLoop.muted = false;
      }, 120);
    }
  }).catch(() => {
    if (token === loopSoundToken && loopSound === pendingLoop) {
      loopSound = null;
      loopSoundName = null;
    }
  });
}

function resumeModeSound() {
  if (state.mode === "intro") {
    playLoopSound("gameStart");
  } else if (state.mode === "ranking") {
    playLoopSound("rank");
  }
}

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function makeBall(x = state.paddle.x + state.paddle.w / 2, y = state.paddle.y - 17, angle = -Math.PI / 2) {
  const speed = 280 + Math.min(state.stageNumber * 2, 80);
  return {
    x,
    y,
    r: 15,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    baseSpeed: speed,
    stuck: true,
  };
}

function createBlock(row, col, stageNumber, faceIndex, pattern, label) {
  const isShield = pattern === "shield";
  const special = SPECIAL_TYPE_SET.has(pattern) ? pattern : null;
  const x = GRID_X + col * (BLOCK_W + BLOCK_GAP);
  const y = GRID_Y + row * (BLOCK_H + BLOCK_GAP);
  const hp = blockHp(label);
  const scoreValue = special ? specialScore(stageNumber, faceIndex, row, col) : blockScore(label);

  if (isShield) {
    return {
      x,
      y,
      w: BLOCK_W,
      h: BLOCK_H,
      type: "solid",
      hp: Infinity,
      maxHp: Infinity,
      row,
      col,
      pattern,
      label: "X",
      scoreValue: 0,
      special: "shield",
      alive: true,
    };
  }

  return {
    x,
    y,
    w: BLOCK_W,
    h: BLOCK_H,
    type: special ? "special" : "normal",
    hp,
    maxHp: hp,
    row,
    col,
    pattern,
    label: special ? specialLabel(special) : label,
    shade: special ? 0 : normalShadeForNumber(label),
    scoreValue,
    special,
    alive: true,
  };
}

function blockHp(label) {
  const value = Number.parseInt(label, 10);
  if (Number.isNaN(value)) return 1;
  const levelIndex = normalNumbers.indexOf(value);
  if (levelIndex !== -1) return levelIndex + 1;
  return Math.max(1, Math.round(value / 10) - 1);
}

function blockScore(label) {
  const value = Number.parseInt(label, 10);
  return Number.isNaN(value) ? 0 : Math.max(0, value);
}

function specialScore(stageNumber, faceIndex, row, col) {
  return 1 + Math.floor(rand(stageNumber * 853 + faceIndex * 149 + row * 43 + col * 67) * 100);
}

function infiHitScore(stageNumber, row, col) {
  return 1 + Math.floor(rand(stageNumber * 487 + row * 59 + col * 83 + performance.now() * 0.017) * 10);
}

function specialLabel(special) {
  if (special === "rocket") return "ROCKET";
  if (special === "slow") return "SLOW";
  if (special === "wide") return "WIDE";
  if (special === "shield") return "X";
  return special.toUpperCase();
}

function buildFace(stageNumber, faceIndex) {
  const blocks = [];
  const rows = blockRowCount();
  const specialMap = buildSpecialMap(stageNumber, faceIndex, rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      const key = `${row}:${col}`;
      const special = specialMap.get(key);
      const label = special ? specialLabel(special) : String(randomNormalNumber(stageNumber, faceIndex, row, col));
      const pattern = special || normalColorForNumber(label);
      blocks.push(createBlock(row, col, stageNumber, faceIndex, pattern, label));
    }
  }
  return { blocks, rows, rollElapsed: 0, rollTicks: 0 };
}

function buildSpecialMap(stageNumber, faceIndex, rows) {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      cells.push({ row, col, score: rand(stageNumber * 911 + faceIndex * 101 + row * 37 + col * 17) });
    }
  }
  cells.sort((a, b) => a.score - b.score);

  const map = new Map();
  let cellIndex = 0;
  const shields = Math.min(infiBlockCount(stageNumber), cells.length);
  for (let index = 0; index < shields; index++) {
    const cell = cells[cellIndex++];
    map.set(`${cell.row}:${cell.col}`, "shield");
  }

  const total = Math.min(SPECIAL_BLOCK_TOTAL, cells.length);
  for (let index = 0; index < total; index++) {
    const cell = cells[cellIndex++];
    if (!cell) break;
    const typeSeed = stageNumber * 733 + faceIndex * 97 + index * 19;
    const specialIndex = Math.floor(rand(typeSeed) * BREAKABLE_SPECIAL_TYPES.length);
    map.set(`${cell.row}:${cell.col}`, BREAKABLE_SPECIAL_TYPES[specialIndex]);
  }
  return map;
}

function randomNormalNumber(stageNumber, faceIndex, row, col) {
  const value = rand(stageNumber * 197 + faceIndex * 53 + row * 23 + col * 31);
  const minLevel = minNormalBlockLevel(stageNumber);
  const maxLevel = maxNormalBlockLevel(stageNumber);
  const level = minLevel + Math.floor(value * (maxLevel - minLevel + 1));
  return normalNumbers[level - 1];
}

function normalLevelForNumber(label) {
  const value = Number.parseInt(label, 10);
  return normalLevels.find(level => level.value === value) || normalLevels[0];
}

function normalColorForNumber(label) {
  return normalLevelForNumber(label).color;
}

function normalShadeForNumber(label) {
  return normalLevelForNumber(label).shade;
}

function maxNormalBlockLevel(stageNumber) {
  return clamp(2 + Math.floor((stageNumber - 1) / 5), 2, normalNumbers.length);
}

function minNormalBlockLevel(stageNumber) {
  if (stageNumber < 35) return 1;
  return clamp(1 + Math.floor((stageNumber - 30) / 5), 1, 5);
}

function infiBlockCount(stageNumber) {
  if (stageNumber < INFI_BLOCK_START_STAGE) return 0;
  return Math.min(MAX_INFI_BLOCKS, Math.floor((stageNumber - INFI_BLOCK_START_STAGE) / 5) + 1);
}

function buildStage(number) {
  return {
    number,
    activeFaceIndex: 0,
    faces: Array.from({ length: FACE_COUNT }, (_, faceIndex) => buildFace(number, faceIndex)),
  };
}

function activeFace() {
  return state.stage.faces[state.stage.activeFaceIndex];
}

function switchFace(direction) {
  if (state.mode !== "playing" || !state.stage?.faces?.length) return;
  if (state.paused) return;
  if (debugUi.root && !debugUi.root.classList.contains("hidden")) return;
  const faces = state.stage.faces;
  const fromIndex = state.stage.activeFaceIndex;
  const nextIndex = (state.stage.activeFaceIndex + direction + faces.length) % faces.length;
  if (nextIndex === state.stage.activeFaceIndex) return;

  state.stage.activeFaceIndex = nextIndex;
  state.faceTransition = {
    fromFace: faces[fromIndex],
    toFace: faces[nextIndex],
    direction: direction >= 0 ? 1 : -1,
    age: 0,
    duration: FACE_SWITCH_DURATION,
  };
  playSound("rollingFace");
  resolveBallsAfterRolling();
  setMessage(`Face ${nextIndex + 1}`, 0.8);
}

function updateRollingBlocks(dt) {
  if (state.waitingLaunch) return;
  const face = activeFace();
  face.rollElapsed += dt;

  const targetTicks = Math.floor(face.rollElapsed / ROLL_INTERVAL);
  while (face.rollTicks < targetTicks) {
    face.rollTicks++;
    rollActiveRows(face, face.rollTicks);
  }
}

function rollActiveRows(face, tick) {
  playSound("rollingBlocks");
  const activeRows = Math.min(face.rows, tick);
  for (let offset = 0; offset < activeRows; offset++) {
    const row = face.rows - 1 - offset;
    const direction = offset % 2 === 0 ? 1 : -1;
    rollRow(face, row, direction);
  }
  resolveBallsAfterRolling();
  setMessage("Rolling", 0.7);
}

function rollRow(face, row, direction) {
  const rowBlocks = face.blocks
    .filter(block => block.row === row)
    .sort((a, b) => a.col - b.col);

  rowBlocks.forEach(block => {
    block.col = (block.col + direction + BLOCK_COLS) % BLOCK_COLS;
    block.x = GRID_X + block.col * (BLOCK_W + BLOCK_GAP);
  });
}

function resolveBallsAfterRolling() {
  state.balls.forEach(ball => {
    if (ball.stuck) return;
    let guard = 0;
    const face = activeFace();
    while (guard < face.rows) {
      const hit = face.blocks.find(block => block.alive && circleRectHit(ball, block));
      if (!hit) break;
      ball.y = hit.y + hit.h + ball.r + 1;
      guard++;
    }
    ball.y = Math.min(ball.y, state.paddle.y - ball.r - 2);
  });
}

function resetBallAndPaddle() {
  state.paddle.w = BASE_PADDLE_W;
  state.paddle.x = W / 2 - state.paddle.w / 2;
  state.paddle.vx = 0;
  state.paddleHits = 0;
  state.speedSteps = 0;
  state.balls = [makeBall()];
  state.waitingLaunch = true;
}

function startStage(number) {
  state.stageNumber = number;
  state.stage = buildStage(number);
  state.faceTransition = null;
  state.wideUntil = 0;
  state.rockets = [];
  resetBallAndPaddle();
  setMessage(`Stage ${number}`, 1.2);
  if (state.mode === "playing") playSound("stageStart");
}

function startGame() {
  state.mode = "playing";
  state.score = INITIAL_SCORE;
  state.lives = 3;
  state.immortal = false;
  state.godMode = false;
  state.fullLivesCheat = false;
  state.jumpToCheat = false;
  state.jumpToStage = INITIAL_STAGE;
  state.cheatUsed = false;
  state.paused = false;
  state.pendingRankScore = 0;
  startStage(INITIAL_STAGE);
  state.messageTimer = 0;
  hideOverlay();
}

function setMessage(text, seconds = 1.5) {
  state.stageMessage = text;
  state.messageTimer = seconds;
}

function launchBalls() {
  if (!state.waitingLaunch) return;
  state.waitingLaunch = false;
  state.balls.forEach((ball, i) => {
    ball.stuck = false;
    const angle = -Math.PI / 2 + (i - 0.5) * 0.18;
    const speed = ballTravelSpeed(ball);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  });
}

function speedMultiplier() {
  return clamp(1 + state.speedSteps * 0.1, 0.5, 3);
}

function ballTravelSpeed(ball) {
  return ball.baseSpeed * speedMultiplier();
}

function setBallSpeed(ball, speed) {
  const angle = Math.atan2(ball.vy, ball.vx);
  if (!Number.isFinite(angle)) return;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
}

function applyCurrentSpeedToBalls() {
  state.balls.forEach(ball => {
    if (!ball.stuck) setBallSpeed(ball, ballTravelSpeed(ball));
  });
}

function registerPaddleHit() {
  state.paddleHits++;
  if (state.paddleHits % 10 !== 0) return;
  state.speedSteps++;
  applyCurrentSpeedToBalls();
  const percent = Math.round((speedMultiplier() - 1) * 100);
  setMessage(percent === 0 ? "Speed Normal" : `Speed ${percent >= 0 ? "+" : ""}${percent}%`, 0.9);
}

function applySlowBlock() {
  state.speedSteps = state.speedSteps > 0 ? 0 : -1;
  state.paddleHits = 0;
  applyCurrentSpeedToBalls();
}

function updatePaddle(dt) {
  const previousCenter = state.paddle.x + state.paddle.w / 2;
  const center = state.paddle.x + state.paddle.w / 2;
  const targetWidth = performance.now() < state.wideUntil ? Math.round(BASE_PADDLE_W * 1.3) : BASE_PADDLE_W;
  if (state.paddle.w !== targetWidth) {
    state.paddle.w += (targetWidth - state.paddle.w) * Math.min(1, dt * 10);
    if (Math.abs(state.paddle.w - targetWidth) < 0.5) state.paddle.w = targetWidth;
    state.paddle.x = center - state.paddle.w / 2;
  }

  let dx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  state.paddle.x += dx * state.paddle.speed * dt;
  if (pointerX !== null) state.paddle.x += (pointerX - state.paddle.w / 2 - state.paddle.x) * Math.min(1, dt * 14);
  state.paddle.x = clamp(state.paddle.x, 24, W - state.paddle.w - 24);
  const currentCenter = state.paddle.x + state.paddle.w / 2;
  state.paddle.vx = dt > 0 ? (currentCenter - previousCenter) / dt : 0;

  if (state.waitingLaunch) {
    state.balls.forEach(ball => {
      ball.x = state.paddle.x + state.paddle.w / 2;
      ball.y = state.paddle.y - ball.r - 2;
    });
  }
}

function circleRectHit(ball, rect) {
  const nearestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

function resolveBlockBounce(ball, block, prevX, prevY) {
  const epsilon = 0.5;

  if (prevY + ball.r <= block.y && ball.vy > 0) {
    ball.y = block.y - ball.r - epsilon;
    ball.vy = -Math.abs(ball.vy);
    return;
  }
  if (prevY - ball.r >= block.y + block.h && ball.vy < 0) {
    ball.y = block.y + block.h + ball.r + epsilon;
    ball.vy = Math.abs(ball.vy);
    return;
  }
  if (prevX + ball.r <= block.x && ball.vx > 0) {
    ball.x = block.x - ball.r - epsilon;
    ball.vx = -Math.abs(ball.vx);
    return;
  }
  if (prevX - ball.r >= block.x + block.w && ball.vx < 0) {
    ball.x = block.x + block.w + ball.r + epsilon;
    ball.vx = Math.abs(ball.vx);
    return;
  }

  const blockCenterX = block.x + block.w / 2;
  const blockCenterY = block.y + block.h / 2;
  const dx = ball.x - blockCenterX;
  const dy = ball.y - blockCenterY;
  const overlapX = block.w / 2 + ball.r - Math.abs(dx);
  const overlapY = block.h / 2 + ball.r - Math.abs(dy);

  if (overlapX < overlapY) {
    ball.x += dx < 0 ? -overlapX - epsilon : overlapX + epsilon;
    ball.vx = dx < 0 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
  } else {
    ball.y += dy < 0 ? -overlapY - epsilon : overlapY + epsilon;
    ball.vy = dy < 0 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
  }
}

function damageBlock(block, amount = 1, source = "ball") {
  if (!block.alive) return false;
  if (block.type === "solid") {
    playSound("infi");
    const points = infiHitScore(state.stageNumber, block.row, block.col);
    addScore(points, block.x + block.w / 2, block.y + block.h / 2);
    burst(block.x + block.w / 2, block.y + block.h / 2, "#aeb6c6", 6);
    return false;
  }

  const damage = state.godMode && source !== "bomb" ? block.hp : amount;
  block.hp -= damage;
  if (block.hp > 0) playSound("block");
  burst(block.x + block.w / 2, block.y + block.h / 2, blockColor(block)[0], 8);
  if (block.hp <= 0) {
    block.alive = false;
    playBlockBreakSound(block);
    addScore(block.scoreValue, block.x + block.w / 2, block.y + block.h / 2);
    activateSpecial(block, source);
    burst(block.x + block.w / 2, block.y + block.h / 2, "#ffffff", 12);
    return true;
  }
  return false;
}

function playBlockBreakSound(block) {
  if (block.special === "rocket") {
    playSound("rocket");
  } else if (block.special === "slow") {
    playSound("slow");
  } else if (block.special === "wide") {
    playSound("wide");
  } else if (block.special !== "bomb") {
    playSound("block");
  }
}

function addScore(points, x, y) {
  const amount = Math.max(0, Math.floor(points));
  if (amount <= 0) return;
  state.score += amount;
  state.scorePopups.push({
    text: `+${amount}`,
    x,
    y,
    vy: -32,
    life: 0.85,
    maxLife: 0.85,
  });
}

function activateSpecial(block) {
  if (!block.special) return;
  if (block.special === "x3") {
    splitBalls();
    setMessage("x3 Multiball", 1.4);
  } else if (block.special === "slow") {
    applySlowBlock();
    setMessage("Slow Motion", 1.4);
  } else if (block.special === "bomb") {
    explodeAtBlock(block);
    setMessage("Bomb Blast", 1.4);
  } else if (block.special === "wide") {
    state.wideUntil = performance.now() + WIDE_DURATION;
    setMessage("Wide Bar", 1.4);
  } else if (block.special === "rocket") {
    fireRocket();
    setMessage("Rocket Strike", 1.4);
  }
}

function splitBalls() {
  const source = state.balls[0];
  if (!source || state.balls.length >= 9) return;
  const speed = Math.hypot(source.vx, source.vy);
  const baseAngle = Math.atan2(source.vy, source.vx);
  [-0.42, 0.42].forEach(offset => {
    state.balls.push({
      x: source.x,
      y: source.y,
      r: source.r,
      vx: Math.cos(baseAngle + offset) * speed,
      vy: Math.sin(baseAngle + offset) * speed,
      baseSpeed: source.baseSpeed,
      stuck: false,
    });
  });
}

function explodeAtBlock(originBlock) {
  const x = originBlock.x + originBlock.w / 2;
  const y = originBlock.y + originBlock.h / 2;
  const radius = BLOCK_W * 1.45;
  playSound("bomb");
  state.explosions.push({ x, y, radius, life: 0.48, age: 0 });
  activeFace().blocks.forEach(block => {
    if (!block.alive) return;
    const distance = Math.abs(block.row - originBlock.row) + Math.abs(block.col - originBlock.col);
    if (distance === 1) damageBlock(block, 1, "bomb");
  });
  burst(x, y, "#ff6f7f", 42);
}

function fireRocket() {
  const x = state.paddle.x + state.paddle.w / 2;
  state.rockets.push({ x, y: state.paddle.y, life: 0.45, age: 0 });

  const targets = activeFace().blocks
    .filter(block => block.alive && x >= block.x - 2 && x <= block.x + block.w + 2)
    .sort((a, b) => b.y - a.y);

  for (const block of targets) {
    if (block.type === "solid") {
      damageBlock(block, 1, "rocket");
      break;
    }
    damageBlock(block, block.hp, "rocket");
  }
}

function updateBalls(dt) {
  const remaining = [];

  for (const ball of state.balls) {
    if (ball.stuck) {
      remaining.push(ball);
      continue;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 18) {
      ball.x = 18 + ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.r > W - 18) {
      ball.x = W - 18 - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < 18) {
      ball.y = 18 + ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    if (circleRectHit(ball, state.paddle) && ball.vy > 0) {
      playSound("paddle");
      const incomingSpeed = Math.hypot(ball.vx, ball.vy) || ball.baseSpeed;
      const incomingVxRatio = ball.vx / incomingSpeed;
      registerPaddleHit();
      const speed = ballTravelSpeed(ball);
      const paddleInfluence = clamp(state.paddle.vx / state.paddle.speed, -1, 1) * speed * PADDLE_BOUNCE_INFLUENCE;
      const nextVx = clamp(incomingVxRatio * speed + paddleInfluence, -speed * 0.92, speed * 0.92);
      ball.vx = nextVx;
      ball.vy = -Math.sqrt(Math.max(0, speed * speed - nextVx * nextVx));
      ball.y = state.paddle.y - ball.r - 1;
      burst(ball.x, ball.y + 8, "#78e3ff", 5);
    }

    const blocks = activeFace().blocks;
    for (const block of blocks) {
      if (!block.alive || !circleRectHit(ball, block)) continue;
      const prevX = ball.x - ball.vx * dt;
      const prevY = ball.y - ball.vy * dt;
      resolveBlockBounce(ball, block, prevX, prevY);
      damageBlock(block, 1);
      break;
    }

    if (ball.y - ball.r <= H + 30) remaining.push(ball);
  }

  state.balls = remaining.filter(ball => ball.y - ball.r <= H + 24);
  if (state.balls.length === 0) loseLife();
}

function loseLife() {
  if (state.immortal) {
    resetBallAndPaddle();
    setMessage("Immortal", 1.2);
    return;
  }
  state.lives--;
  if (state.lives <= 0) {
    finishGame();
  } else {
    resetBallAndPaddle();
    setMessage("Ball Lost", 1.2);
  }
}

function finishGame() {
  state.mode = "gameover";
  state.paused = true;
  state.waitingLaunch = false;
  state.pendingRankScore = state.score;
  state.pendingRankStage = state.stageNumber;
  showGameOver();
}

function isStageClear() {
  return state.stage.faces.every(face =>
    face.blocks.every(block => !block.alive || block.type === "solid")
  );
}

function nextStage() {
  const next = state.stageNumber + 1;
  state.mode = "stageClear";
  state.paused = true;
  state.pendingNextStage = next;
  showNextStageScreen(next);
}

function continueNextStage() {
  const next = state.pendingNextStage || state.stageNumber + 1;
  if (next % 5 === 1 && next > 1) state.lives = Math.min(MAX_LIVES, state.lives + 1);
  state.mode = "playing";
  state.paused = false;
  startStage(next);
  state.messageTimer = 0;
  hideOverlay();
}

function updateParticles(dt) {
  state.particles = state.particles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    return p.life > 0;
  });

  state.scorePopups = state.scorePopups.filter(popup => {
    popup.life -= dt;
    popup.y += popup.vy * dt;
    return popup.life > 0;
  });

  state.rockets.forEach(rocket => {
    rocket.age += dt;
    rocket.life -= dt;
  });
  state.rockets = state.rockets.filter(rocket => rocket.life > 0);

  state.explosions.forEach(explosion => {
    explosion.age += dt;
    explosion.life -= dt;
  });
  state.explosions = state.explosions.filter(explosion => explosion.life > 0);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 50 + Math.random() * 170;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 1.5 + Math.random() * 3,
      color,
      life: 0.25 + Math.random() * 0.35,
    });
  }
}

function blockColor(block) {
  if (block.type === "solid") return palettes.solid;
  if (block.special) return palettes[block.special];
  return palettes[block.pattern] || palettes.blue;
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#102947");
  g.addColorStop(0.45, "#071a2e");
  g.addColorStop(1, "#07111f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.2, 10, W / 2, H * 0.26, 390);
  glow.addColorStop(0, "rgba(65, 160, 255, 0.18)");
  glow.addColorStop(0.58, "rgba(30, 98, 180, 0.07)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(128,190,255,0.055)";
  ctx.lineWidth = 1;
  for (let x = 24; x < W; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 24; y < H; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(74,139,211,0.7)";
  ctx.lineWidth = 4;
  roundRect(8, 8, W - 16, H - 16, 18);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(16, 16, W - 32, H - 32, 13);
  ctx.stroke();
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cacheImageTrim(image) {
  const offscreen = document.createElement("canvas");
  offscreen.width = image.naturalWidth;
  offscreen.height = image.naturalHeight;
  const offscreenCtx = offscreen.getContext("2d", { willReadFrequently: true });
  offscreenCtx.drawImage(image, 0, 0);
  const data = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  let minX = offscreen.width;
  let minY = offscreen.height;
  let maxX = -1;
  let maxY = -1;
  let visualMinX = offscreen.width;
  let visualMinY = offscreen.height;
  let visualMaxX = -1;
  let visualMaxY = -1;

  for (let y = 0; y < offscreen.height; y++) {
    for (let x = 0; x < offscreen.width; x++) {
      const alpha = data[(y * offscreen.width + x) * 4 + 3];
      if (alpha <= 18) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (alpha > 96) {
        visualMinX = Math.min(visualMinX, x);
        visualMinY = Math.min(visualMinY, y);
        visualMaxX = Math.max(visualMaxX, x);
        visualMaxY = Math.max(visualMaxY, y);
      }
    }
  }

  if (maxX < minX) {
    imageTrims.set(image, { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight, cx: 0.5, cy: 0.5 });
    return;
  }

  const trim = { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
  const visualCx = visualMaxX >= visualMinX ? (visualMinX + visualMaxX + 1) / 2 : trim.sx + trim.sw / 2;
  const visualCy = visualMaxY >= visualMinY ? (visualMinY + visualMaxY + 1) / 2 : trim.sy + trim.sh / 2;
  imageTrims.set(image, {
    ...trim,
    cx: (visualCx - trim.sx) / trim.sw,
    cy: (visualCy - trim.sy) / trim.sh,
  });
}

function drawTrimmedImage(image, x, y, w, h) {
  const trim = imageTrims.get(image) || { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight, cx: 0.5, cy: 0.5 };
  const dx = x + w / 2 - trim.cx * w;
  const dy = y + h / 2 - trim.cy * h;
  ctx.drawImage(image, trim.sx, trim.sy, trim.sw, trim.sh, dx, dy, w, h);
}

function drawBlockFallback(block) {
  const [top, bottom] = blockColor(block);
  ctx.shadowColor = "rgba(0,0,0,0.68)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  roundRect(block.x, block.y, block.w, block.h, 4);
  const g = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.h);
  g.addColorStop(0, "rgba(255,255,255,0.92)");
  g.addColorStop(0.12, top);
  g.addColorStop(0.7, bottom);
  g.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = g;
  ctx.fill();
}

function drawBlock(block) {
  if (!block.alive) return;
  ctx.save();
  const image = icons[block.pattern];

  if (image?.complete && image.naturalWidth > 0) {
    drawTrimmedImage(image, block.x, block.y, block.w, block.h);
  } else {
    drawBlockFallback(block);
  }

  if (block.type === "normal" && block.shade > 0) {
    ctx.save();
    roundRect(block.x, block.y, block.w, block.h, 4);
    ctx.fillStyle = `rgba(0,0,0,${block.shade})`;
    ctx.fill();
    ctx.restore();
  }

  if (block.type !== "solid" && !block.special && block.label) {
    drawBlockLabel(block);
  }

  ctx.restore();
}

function drawBlockLabel(block) {
  const label = block.type === "normal" ? String(Math.max(1, block.hp)) : block.label;

  ctx.font = "900 18px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 3;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(90,36,22,0.32)";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(label, block.x + block.w / 2, block.y + block.h / 2 + 2);
  ctx.fillText(label, block.x + block.w / 2, block.y + block.h / 2 + 2);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "900 17px Inter, Arial, sans-serif";
  ctx.fillText(label, block.x + block.w / 2 - 1, block.y + block.h / 2);
}

function drawSolidX(block) {
  ctx.save();
  ctx.strokeStyle = "rgba(5,8,13,0.8)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(block.x + 8, block.y + 4);
  ctx.lineTo(block.x + block.w - 8, block.y + block.h - 4);
  ctx.moveTo(block.x + block.w - 8, block.y + 4);
  ctx.lineTo(block.x + 8, block.y + block.h - 4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawPaddle() {
  const p = state.paddle;
  ctx.save();
  ctx.shadowColor = "rgba(31,166,255,0.75)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;

  if (paddleImg.complete && paddleImg.naturalWidth > 0) {
    const iw = paddleImg.naturalWidth;
    const ih = paddleImg.naturalHeight;
    const capFrac = 0.16;
    const capSrcW = Math.round(iw * capFrac);
    const capDstW = Math.round(capSrcW * (p.h / ih));
    const midSrcW = iw - 2 * capSrcW;
    const midDstW = p.w - 2 * capDstW;
    ctx.drawImage(paddleImg, 0, 0, capSrcW, ih, p.x, p.y, capDstW, p.h);
    ctx.drawImage(paddleImg, capSrcW, 0, midSrcW, ih, p.x + capDstW, p.y, midDstW, p.h);
    ctx.drawImage(paddleImg, iw - capSrcW, 0, capSrcW, ih, p.x + p.w - capDstW, p.y, capDstW, p.h);
  } else {
    roundRect(p.x, p.y, p.w, p.h, p.h / 2);
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, "#2d9dff");
    g.addColorStop(0.22, "#075dc6");
    g.addColorStop(0.5, "#efe1ce");
    g.addColorStop(0.76, "#efe1ce");
    g.addColorStop(1, "#004caf");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function drawBall(ball) {
  ctx.save();
  ctx.shadowColor = "#52e7ff";
  ctx.shadowBlur = 22;
  const g = ctx.createRadialGradient(ball.x - 5, ball.y - 5, 2, ball.x, ball.y, ball.r + 6);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#c9f7ff");
  g.addColorStop(1, "#5adfff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 3, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScorePopups() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 20px DS-Digital, DS-DIGIB, Inter, Arial, sans-serif";
  for (const popup of state.scorePopups) {
    const progress = 1 - popup.life / popup.maxLife;
    ctx.globalAlpha = clamp(popup.life / popup.maxLife, 0, 1);
    ctx.shadowColor = "#4df3ff";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,18,34,0.78)";
    ctx.fillStyle = "#eaffff";
    ctx.strokeText(popup.text, popup.x, popup.y - progress * 8);
    ctx.fillText(popup.text, popup.x, popup.y - progress * 8);
  }
  ctx.restore();
}

function drawExplosions() {
  for (const explosion of state.explosions) {
    const progress = 1 - explosion.life / 0.48;
    const radius = explosion.radius * progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.radius);
    glow.addColorStop(0, "rgba(255,255,255,0.85)");
    glow.addColorStop(0.16, "rgba(255,222,91,0.65)");
    glow.addColorStop(0.42, "rgba(255,96,67,0.32)");
    glow.addColorStop(1, "rgba(255,96,67,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.max(0, alpha * 0.9);
    ctx.strokeStyle = "#ffe36a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + progress * 0.35;
      const inner = radius * 0.58;
      const outer = radius * 0.92;
      ctx.beginPath();
      ctx.moveTo(explosion.x + Math.cos(angle) * inner, explosion.y + Math.sin(angle) * inner);
      ctx.lineTo(explosion.x + Math.cos(angle) * outer, explosion.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRockets() {
  ctx.save();
  for (const rocket of state.rockets) {
    const progress = 1 - rocket.life / 0.45;
    const y = rocket.y - progress * (rocket.y - 24);
    ctx.globalAlpha = clamp(rocket.life * 4, 0, 1);
    ctx.strokeStyle = "rgba(83,218,255,0.75)";
    ctx.lineWidth = 10;
    ctx.shadowColor = "#52e7ff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(rocket.x, rocket.y);
    ctx.lineTo(rocket.x, y + 36);
    ctx.stroke();
    if (icons.rocket?.complete) ctx.drawImage(icons.rocket, rocket.x - 18, y - 18, 36, 36);
  }
  ctx.restore();
}

function drawMessage() {
  if (state.messageTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(state.messageTimer, 0, 1);
  ctx.fillStyle = "rgba(15, 19, 30, 0.78)";
  roundRect(W / 2 - 125, H / 2 - 36, 250, 72, 18);
  ctx.fill();
  ctx.fillStyle = "#eef4ff";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.stageMessage, W / 2, H / 2);
  ctx.restore();
}

function updateAppHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const saved = raw === null ? [] : JSON.parse(raw);
    return (Array.isArray(saved) ? saved : [])
      .filter(entry => typeof entry?.name === "string" && toScoreBigInt(entry?.score) !== null)
      .map(entry => ({ name: entry.name, score: entry.score, stage: Number.isFinite(entry.stage) ? entry.stage : null }))
      .sort((a, b) => compareScores(b.score, a.score))
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_LIMIT)));
  localStorage.setItem(LEGACY_LEADERBOARD_SAMPLE_DISABLED_KEY, "1");
}

function resetPlayerData() {
  state.score = 0;
  state.pendingRankScore = 0;
  localStorage.setItem(LEADERBOARD_KEY, "[]");
  localStorage.setItem(LEGACY_LEADERBOARD_SAMPLE_DISABLED_KEY, "1");
}

function rankForScore(score) {
  const board = loadLeaderboard();
  const betterScores = board.filter(entry => compareScores(entry.score, score) > 0).length;
  const rank = betterScores + 1;
  return rank > LEADERBOARD_LIMIT && board.length >= LEADERBOARD_LIMIT ? "Over 10" : rank;
}

function qualifiesForLeaderboard(score) {
  const board = loadLeaderboard();
  return board.length < LEADERBOARD_LIMIT || compareScores(score, board[board.length - 1].score) > 0;
}

function sanitizePlayerName(value) {
  return value.replace(/[^a-z,\s]/gi, "").replace(/\s+/g, " ").slice(0, 10).toUpperCase();
}

function addLeaderboardEntry(name, score, stage) {
  const board = loadLeaderboard();
  board.push({ name: name || "PLAYER", score, stage });
  board.sort((a, b) => compareScores(b.score, a.score));
  const updated = board.slice(0, LEADERBOARD_LIMIT);
  saveLeaderboard(updated);
  return updated;
}

function renderLeaderboard(entries = loadLeaderboard()) {
  const rows = entries.length
    ? entries.map((entry, index) => (
      `<div class="rank-row"><span>${index + 1}</span><span>${entry.name}</span><span class="rank-score">${formatRankScore(entry.score)}</span><span>${formatRankStage(entry.stage)}</span></div>`
    )).join("")
    : '<div class="rank-row"><span>-</span><span>NO RANK</span><span class="rank-score">0</span><span>-</span></div>';

  overlay.rankList.innerHTML = `
    <div class="rank-rule"></div>
    <div class="rank-row rank-header"><span>RANK</span><span>NAME</span><span>SCORE</span><span>STAGE</span></div>
    ${rows}
  `;
}

function hideOverlay() {
  stopLoopSound();
  overlay.root.className = "screen-overlay hidden";
  overlay.nameEntry.classList.remove("visible");
  overlay.rankList.classList.remove("visible");
  overlay.nextStage.style.display = "";
  overlay.topRanks.style.display = "";
}

function showIntro() {
  state.mode = "intro";
  playLoopSound("gameStart");
  overlay.root.className = "screen-overlay intro-screen";
  overlay.logo.style.display = "block";
  overlay.gameover.style.display = "";
  overlay.nextStage.style.display = "";
  overlay.topRanks.style.display = "";
  overlay.title.textContent = "";
  overlay.score.textContent = "";
  overlay.prompt.textContent = enterPrompt("Start");
  overlay.nameEntry.classList.remove("visible");
  overlay.rankList.classList.remove("visible");
}

function showGameOver() {
  stopLoopSound();
  playSound("gameOver");
  overlay.root.className = "screen-overlay gameover-screen";
  overlay.logo.style.display = "none";
  overlay.gameover.style.display = "block";
  overlay.nextStage.style.display = "";
  overlay.title.textContent = "";
  overlay.score.textContent = `Score ${formatScore(state.pendingRankScore)}`;
  overlay.nameEntry.classList.remove("visible");
  overlay.rankList.classList.remove("visible");

  if (!state.cheatUsed && qualifiesForLeaderboard(state.pendingRankScore)) {
    state.mode = "nameEntry";
    overlay.prompt.textContent = "Enter Name";
    overlay.nameEntry.classList.add("visible");
    overlay.nameInput.value = "";
    overlay.nameInput.focus();
  } else if (!state.cheatUsed) {
    showRankingScreen();
  } else {
    state.mode = "gameover";
    overlay.prompt.textContent = enterPrompt("Start Again");
  }
}

function submitPlayerName() {
  if (state.mode !== "nameEntry") return;
  const name = sanitizePlayerName(overlay.nameInput.value);
  const updated = addLeaderboardEntry(name, state.pendingRankScore, state.pendingRankStage);
  showRankingScreen(updated);
}

function showRankingScreen(entries = loadLeaderboard()) {
  state.mode = "ranking";
  state.paused = true;
  playLoopSound("rank");
  overlay.root.className = "screen-overlay ranking-screen";
  overlay.logo.style.display = "none";
  overlay.gameover.style.display = "none";
  overlay.nextStage.style.display = "none";
  overlay.topRanks.style.display = "block";
  overlay.title.textContent = "";
  overlay.score.textContent = "";
  overlay.nameEntry.classList.remove("visible");
  renderLeaderboard(entries);
  overlay.rankList.classList.add("visible");
  overlay.prompt.textContent = enterPrompt("Start Again");
}

function showNextStageScreen(stageNumber) {
  stopLoopSound();
  overlay.root.className = "screen-overlay stageclear-screen";
  overlay.logo.style.display = "none";
  overlay.gameover.style.display = "none";
  overlay.nextStage.style.display = "block";
  overlay.topRanks.style.display = "";
  overlay.title.textContent = "";
  overlay.score.textContent = `Stage ${stageNumber}`;
  overlay.nameEntry.classList.remove("visible");
  overlay.rankList.classList.remove("visible");
  overlay.prompt.textContent = enterPrompt("Continue");
}

function formatScore(value) {
  const score = toScoreBigInt(value);
  if (score === null) return "0";

  const sign = score < 0n ? "-" : "";
  const abs = score < 0n ? -score : score;
  const units = [
    { value: 1_000_000_000_000n, suffix: "G" },
    { value: 1_000_000_000n, suffix: "M" },
    { value: 1_000_000n, suffix: "K" },
  ];
  const unit = units.find(item => abs >= item.value);
  if (!unit) return `${sign}${abs.toLocaleString()}`;

  return `${sign}${(abs / (unit.value / 1_000n)).toLocaleString()}${unit.suffix}`;
}

function toScoreBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function compareScores(a, b) {
  const scoreA = toScoreBigInt(a);
  const scoreB = toScoreBigInt(b);
  if (scoreA === scoreB) return 0;
  if (scoreA === null) return -1;
  if (scoreB === null) return 1;
  return scoreA > scoreB ? 1 : scoreA < scoreB ? -1 : 0;
}

function formatRankScore(value) {
  const score = toScoreBigInt(value);
  if (score === null) return "0";

  const sign = score < 0n ? "-" : "";
  let display = score < 0n ? -score : score;
  const units = ["", "K", "M", "G", "T"];
  let unitIndex = 0;

  while (display > 999_999_999n && unitIndex < units.length - 1) {
    display /= 1_000n;
    unitIndex++;
  }

  return `${sign}${display.toLocaleString()}${units[unitIndex]}`;
}

function formatRankStage(stage) {
  if (!Number.isFinite(stage)) return "-";
  return stage > 99999 ? "∞" : String(stage);
}

function updateFaceTransition(dt) {
  if (!state.faceTransition) return;
  state.faceTransition.age += dt;
  if (state.faceTransition.age >= state.faceTransition.duration) {
    state.faceTransition = null;
  }
}

function render() {
  drawBackground();
  drawActiveFaceBlocks();
  drawExplosions();
  drawRockets();
  drawPaddle();
  state.balls.forEach(drawBall);
  drawParticles();
  drawScorePopups();
  drawMessage();
}

function drawActiveFaceBlocks() {
  const transition = state.faceTransition;
  if (!transition) {
    activeFace().blocks.forEach(drawBlock);
    return;
  }

  const progress = clamp(transition.age / transition.duration, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const fromOffset = -transition.direction * eased * W;
  const toOffset = transition.direction * (1 - eased) * W;
  drawFaceBlocks(transition.fromFace, fromOffset);
  drawFaceBlocks(transition.toFace, toOffset);
}

function drawFaceBlocks(face, offsetX = 0) {
  ctx.save();
  ctx.translate(offsetX, 0);
  face.blocks.forEach(drawBlock);
  ctx.restore();
}

function updateHud() {
  hud.stage.textContent = state.stageNumber;
  hud.rank.textContent = rankForScore(state.score);
  hud.score.textContent = formatScore(state.score);
  hud.lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    i < state.lives
      ? '<img src="assets/images/heart-filled.png" alt="life" />'
      : '<img src="assets/images/heart-empty.png" alt="" />'
  ).join("");
  const counts = countRemainingSpecials();
  hud.rocket.textContent = counts.rocket;
  hud.slow.textContent = counts.slow;
  hud.x3.textContent = counts.x3;
  hud.wide.textContent = counts.wide;
  hud.bomb.textContent = counts.bomb;
  hud.shield.textContent = counts.shield;
  updatePowerItemState(hud.rocket, counts.rocket);
  updatePowerItemState(hud.slow, counts.slow);
  updatePowerItemState(hud.x3, counts.x3);
  updatePowerItemState(hud.wide, counts.wide);
  updatePowerItemState(hud.bomb, counts.bomb);
  updatePowerItemState(hud.shield, counts.shield);
  updateCheatStatus();
}

function updatePowerItemState(valueElement, count) {
  const item = valueElement.closest(".item.power");
  if (!item) return;
  item.classList.toggle("empty", count <= 0);
}

function updateCheatStatus() {
  cheatStatus.root.classList.toggle("hidden", !state.cheatUsed);
  cheatStatus.root.setAttribute("aria-hidden", String(!state.cheatUsed));
  cheatStatus.godMode.classList.toggle("active", state.godMode);
  cheatStatus.fullLives.classList.toggle("active", state.fullLivesCheat);
  cheatStatus.immortal.classList.toggle("active", state.immortal);
  cheatStatus.jumpTo.classList.toggle("active", state.jumpToCheat);
}

function countRemainingSpecials() {
  const counts = { rocket: 0, slow: 0, x3: 0, wide: 0, bomb: 0, shield: 0 };
  if (!state.stage) return counts;
  activeFace().blocks.forEach(block => {
    if (block.alive && block.special && counts[block.special] !== undefined) {
      counts[block.special]++;
    }
  });
  return counts;
}

function togglePause() {
  if (state.mode !== "playing") return;
  state.paused = !state.paused;
  setMessage(state.paused ? "Paused" : "Resume", 0.8);
}

function handleSpaceAction() {
  if (state.mode !== "playing") return;
  if (state.waitingLaunch) {
    launchBalls();
    return;
  }
  togglePause();
}

function isTouchPointer(event) {
  return event.pointerType === "touch" || event.pointerType === "pen";
}

function updatePointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointerX = (event.clientX - rect.left) * (W / rect.width);
}

function consumeDoubleTap(event, scope) {
  const now = performance.now();
  const dx = event.clientX - lastTap.x;
  const dy = event.clientY - lastTap.y;
  const isDouble =
    lastTap.scope === scope &&
    now - lastTap.time <= DOUBLE_TAP_MS &&
    Math.hypot(dx, dy) <= DOUBLE_TAP_DISTANCE;

  lastTap = { time: isDouble ? 0 : now, x: event.clientX, y: event.clientY, scope };
  return isDouble;
}

function confirmScreenAction() {
  if (state.mode === "intro" || state.mode === "ranking" || state.mode === "gameover") {
    startGame();
  } else if (state.mode === "nameEntry") {
    submitPlayerName();
  } else if (state.mode === "stageClear") {
    continueNextStage();
  }
}

function isCheatKey(event) {
  return event.key === "?" || (event.code === "Slash" && event.shiftKey);
}

function openCommandMode() {
  if (state.mode !== "playing") return;
  state.debugPreviousPaused = state.paused;
  state.paused = true;
  setMessage("Command Mode", 1);
  debugUi.stage.value = String(state.stageNumber);
  updateDebugStageField();
  debugUi.root.classList.remove("hidden");
  debugUi.root.setAttribute("aria-hidden", "false");
  debugUi.command.focus();
}

function closeCommandMode({ restorePause = true } = {}) {
  debugUi.root.classList.add("hidden");
  debugUi.root.setAttribute("aria-hidden", "true");
  if (restorePause && state.mode === "playing") {
    state.paused = state.debugPreviousPaused;
  }
}

function updateDebugStageField() {
  const isJump = debugUi.command.value === "jumpTo";
  debugUi.stageField.classList.toggle("hidden", !isJump);
}

function applyDebugCommand() {
  const selected = debugUi.command.value;
  const command = selected === "jumpTo" ? `jumpTo ${debugUi.stage.value}` : selected;
  closeCommandMode({ restorePause: false });
  runDebugCommand(command.trim());
}

function runDebugCommand(command) {
  const [name, ...args] = command.split(/\s+/).filter(Boolean);
  if (!name) return;
  const normalized = name.toLowerCase();
  state.cheatUsed = true;

  if (normalized === "immortal") {
    state.immortal = true;
    setMessage("Immortal On", 1.4);
  } else if (normalized === "godmode") {
    state.godMode = true;
    setMessage("God Mode On", 1.4);
  } else if (normalized === "fulllives") {
    state.lives = MAX_LIVES;
    state.fullLivesCheat = true;
    setMessage("Full Lives", 1.4);
  } else if (normalized === "jumpto") {
    const stage = Number.parseInt(args[0], 10);
    if (!Number.isFinite(stage) || stage < 1) {
      setMessage("Invalid Stage", 1.4);
      return;
    }
    state.mode = "playing";
    state.paused = false;
    state.jumpToCheat = true;
    state.jumpToStage = stage;
    hideOverlay();
    startStage(stage);
    setMessage(`Jump To ${stage}`, 1.4);
  } else if (normalized === "resetdata") {
    resetPlayerData();
    setMessage("Data Reset", 1.4);
  } else if (normalized === "showrank") {
    showRankingScreen();
  } else if (normalized === "goodgame") {
    state.pendingRankScore = state.score;
    state.pendingRankStage = state.stageNumber;
    showGameOver();
  } else {
    setMessage("Unknown Command", 1.4);
  }
}

function update(dt) {
  if (state.mode !== "playing" || state.paused) return;
  updatePaddle(dt);
  updateRollingBlocks(dt);
  updateBalls(dt);
  updateParticles(dt);
  updateFaceTransition(dt);
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (isStageClear()) nextStage();
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  updateHud();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  unlockAudio();
  if (!debugUi.root.classList.contains("hidden")) {
    if (event.code === "Escape") {
      event.preventDefault();
      closeCommandMode();
    }
    return;
  }
  if (isCheatKey(event) && state.mode === "playing") {
    event.preventDefault();
    openCommandMode();
    return;
  }
  keys.add(event.code);
  if (event.code === "Enter") {
    event.preventDefault();
    confirmScreenAction();
  }
  if (event.code === "Space" && state.mode === "playing") {
    event.preventDefault();
    if (!event.repeat) handleSpaceAction();
  }
  if (event.code === "ArrowUp" && state.mode === "playing") {
    event.preventDefault();
    if (!event.repeat) switchFace(1);
  }
  if (event.code === "ArrowDown" && state.mode === "playing") {
    event.preventDefault();
    if (!event.repeat) switchFace(-1);
  }
  if (event.code === "KeyP" && state.mode === "playing") {
    togglePause();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("resize", updateAppHeight);
window.visualViewport?.addEventListener("resize", updateAppHeight);
window.visualViewport?.addEventListener("scroll", updateAppHeight);

document.getElementById("btn-pause").addEventListener("click", togglePause);

hud.logo.addEventListener("click", (event) => {
  if (state.mode !== "playing" || !debugUi.root.classList.contains("hidden")) return;
  event.preventDefault();
  unlockAudio();
  openCommandMode();
});

overlay.nameInput.addEventListener("input", () => {
  overlay.nameInput.value = sanitizePlayerName(overlay.nameInput.value);
});

debugUi.command.addEventListener("change", updateDebugStageField);
debugUi.cancel.addEventListener("click", () => closeCommandMode());
debugUi.panel.addEventListener("submit", (event) => {
  event.preventDefault();
  applyDebugCommand();
});
debugUi.root.addEventListener("pointerdown", (event) => {
  if (event.target === debugUi.root) closeCommandMode();
});

overlay.root.addEventListener("pointerdown", (event) => {
  unlockAudio();
  if (event.target === overlay.nameInput) return;
  if (state.mode === "intro" || state.mode === "ranking" || state.mode === "gameover" || state.mode === "stageClear" || state.mode === "nameEntry") {
    event.preventDefault();
    if (isTouchPointer(event) && !consumeDoubleTap(event, "overlay")) return;
    confirmScreenAction();
  }
});

canvas.addEventListener("pointermove", (event) => {
  updatePointerFromEvent(event);
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  unlockAudio();
  updatePointerFromEvent(event);
  if (isTouchPointer(event)) {
    swipeStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  }
  canvas.setPointerCapture?.(event.pointerId);
  if (state.mode === "playing") {
    if (isTouchPointer(event)) {
      if (consumeDoubleTap(event, "game")) handleSpaceAction();
    } else {
      launchBalls();
    }
  }
});
canvas.addEventListener("pointerup", (event) => {
  if (isTouchPointer(event) && swipeStart && state.mode === "playing") {
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    const distance = Math.abs(dx);
    const isSwipe = distance >= SWIPE_MIN_DISTANCE && Math.abs(dy) <= SWIPE_MAX_VERTICAL_DRIFT;
    if (isSwipe) switchFace(dx < 0 ? 1 : -1);
  }
  swipeStart = null;
  canvas.releasePointerCapture?.(event.pointerId);
});
canvas.addEventListener("pointercancel", () => {
  pointerX = null;
  swipeStart = null;
});
canvas.addEventListener("pointerleave", (event) => {
  if (!canvas.hasPointerCapture?.(event.pointerId)) pointerX = null;
});

updateAppHeight();
startStage(INITIAL_STAGE);
state.score = INITIAL_SCORE;
state.messageTimer = 0;
const initialScreen = new URLSearchParams(window.location.search).get("screen");
if (initialScreen === "ranking") {
  showRankingScreen();
} else if (initialScreen === "gameover") {
  state.pendingRankScore = INITIAL_SCORE;
  state.pendingRankStage = INITIAL_STAGE;
  overlay.root.className = "screen-overlay gameover-screen";
  overlay.logo.style.display = "none";
  overlay.gameover.style.display = "block";
  overlay.topRanks.style.display = "";
  overlay.title.textContent = "";
  overlay.score.textContent = `Score ${formatScore(state.pendingRankScore)}`;
  overlay.nameEntry.classList.remove("visible");
  overlay.rankList.classList.remove("visible");
  overlay.prompt.textContent = enterPrompt("Start Again");
  state.mode = "gameover";
  state.paused = true;
} else if (initialScreen === "nextstage") {
  state.pendingNextStage = state.stageNumber + 1;
  state.mode = "stageClear";
  state.paused = true;
  showNextStageScreen(state.pendingNextStage);
} else {
  showIntro();
}
requestAnimationFrame(loop);
