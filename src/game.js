const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const TOP_GAP = 70;
const BLOCK_COLS = 7;
const BLOCK_ROWS = 5;
const BLOCK_W = 56;
const BLOCK_H = 56;
const BLOCK_GAP = 8;
const GRID_W = BLOCK_COLS * BLOCK_W + (BLOCK_COLS - 1) * BLOCK_GAP;
const GRID_X = (W - GRID_W) / 2;
const GRID_Y = TOP_GAP;
const MAX_LIVES = 5;
const EXPLOSION_RADIUS = (BLOCK_W + BLOCK_GAP) * 2;
const BASE_PADDLE_W = 115;
const WIDE_DURATION = 20000;
const SPECIAL_COUNTS = {
  rocket: 3,
  slow: 4,
  x3: 3,
  wide: 3,
  bomb: 3,
  shield: 2,
};

const hud = {
  stage: document.getElementById("stage-value"),
  score: document.getElementById("score-value"),
  lives: document.getElementById("lives-value"),
  rocket: document.getElementById("rocket-value"),
  slow: document.getElementById("slow-value"),
  x3: document.getElementById("x3-value"),
  wide: document.getElementById("wide-value"),
  bomb: document.getElementById("bomb-value"),
  shield: document.getElementById("shield-value"),
};

const keys = new Set();
let pointerX = null;
let lastTime = performance.now();

const state = {
  stageNumber: 28,
  score: 16450,
  lives: 3,
  paused: false,
  waitingLaunch: true,
  stageMessage: "Press Space",
  messageTimer: 0,
  slowUntil: 0,
  wideUntil: 0,
  bombCharges: 0,
  rockets: [],
  paddle: {
    x: W / 2 - BASE_PADDLE_W / 2,
    y: H - 106,
    w: BASE_PADDLE_W,
    h: 40,
    speed: 420,
  },
  balls: [],
  particles: [],
  explosions: [],
  stage: null,
};

const iconSources = {
  x3: "assets/images/power-x3.svg",
  slow: "assets/images/power-slow.svg",
  bomb: "assets/images/power-bomb.svg",
  wide: "assets/images/power-wide.svg",
  rocket: "assets/images/power-rocket.svg",
  shield: "assets/images/block-shield.svg",
  red: "assets/images/block-red.svg",
  orange: "assets/images/block-orange.svg",
  green: "assets/images/block-green.svg",
  yellow: "assets/images/block-yellow.svg",
  blue: "assets/images/block-blue.svg",
  purple: "assets/images/block-purple.svg",
};

const icons = Object.fromEntries(
  Object.entries(iconSources).map(([key, src]) => {
    const image = new Image();
    image.src = src;
    return [key, image];
  })
);

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
const normalColors = ["red", "orange", "green", "yellow", "blue", "purple"];
const normalNumbers = [20, 30, 40, 50, 60, 70, 80];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function makeBall(x = state.paddle.x + state.paddle.w / 2, y = state.paddle.y - 12, angle = -Math.PI / 2) {
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
  const special = Object.prototype.hasOwnProperty.call(SPECIAL_COUNTS, pattern) ? pattern : null;
  const x = GRID_X + col * (BLOCK_W + BLOCK_GAP);
  const y = GRID_Y + row * (BLOCK_H + BLOCK_GAP);
  const hp = blockHp(label);

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
    special,
    alive: true,
  };
}

function blockHp(label) {
  const value = Number.parseInt(label, 10);
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.round(value / 20));
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
  const specialMap = buildSpecialMap(stageNumber, faceIndex);
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      const key = `${row}:${col}`;
      const special = specialMap.get(key);
      const pattern = special || randomNormalColor(stageNumber, faceIndex, row, col);
      const label = special ? specialLabel(special) : String(randomNormalNumber(stageNumber, faceIndex, row, col));
      blocks.push(createBlock(row, col, stageNumber, faceIndex, pattern, label));
    }
  }
  return { blocks };
}

function buildSpecialMap(stageNumber, faceIndex) {
  const cells = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      cells.push({ row, col, score: rand(stageNumber * 911 + faceIndex * 101 + row * 37 + col * 17) });
    }
  }
  cells.sort((a, b) => a.score - b.score);

  const map = new Map();
  let index = 0;
  Object.entries(SPECIAL_COUNTS).forEach(([special, count]) => {
    for (let i = 0; i < count; i++) {
      const cell = cells[index++];
      map.set(`${cell.row}:${cell.col}`, special);
    }
  });
  return map;
}

function randomNormalColor(stageNumber, faceIndex, row, col) {
  const value = rand(stageNumber * 131 + faceIndex * 41 + row * 13 + col * 29);
  return normalColors[Math.floor(value * normalColors.length)];
}

function randomNormalNumber(stageNumber, faceIndex, row, col) {
  const value = rand(stageNumber * 197 + faceIndex * 53 + row * 23 + col * 31);
  return normalNumbers[Math.floor(value * normalNumbers.length)];
}

function buildStage(number) {
  return {
    number,
    activeFaceIndex: 0,
    faces: [0, 1, 2, 3].map(faceIndex => buildFace(number, faceIndex)),
  };
}

function activeFace() {
  return state.stage.faces[state.stage.activeFaceIndex];
}

function resetBallAndPaddle() {
  state.paddle.w = BASE_PADDLE_W;
  state.paddle.x = W / 2 - state.paddle.w / 2;
  state.balls = [makeBall()];
  state.waitingLaunch = true;
}

function startStage(number) {
  state.stageNumber = number;
  state.stage = buildStage(number);
  state.bombCharges = 0;
  state.slowUntil = 0;
  state.wideUntil = 0;
  state.rockets = [];
  resetBallAndPaddle();
  setMessage(`Stage ${number}`, 1.2);
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
    const speed = ball.baseSpeed;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  });
}

function updatePaddle(dt) {
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

  if (state.waitingLaunch) {
    state.balls.forEach(ball => {
      ball.x = state.paddle.x + state.paddle.w / 2;
      ball.y = state.paddle.y - 116;
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

function damageBlock(block, amount = 1, source = "ball") {
  if (!block.alive) return false;
  if (block.type === "solid") {
    burst(block.x + block.w / 2, block.y + block.h / 2, "#aeb6c6", 6);
    return false;
  }

  block.hp -= amount;
  burst(block.x + block.w / 2, block.y + block.h / 2, blockColor(block)[0], 8);
  if (block.hp <= 0) {
    block.alive = false;
    state.score += 100 + state.stageNumber * 7;
    activateSpecial(block, source);
    burst(block.x + block.w / 2, block.y + block.h / 2, "#ffffff", 12);
    return true;
  }
  return false;
}

function activateSpecial(block) {
  if (!block.special) return;
  if (block.special === "x3") {
    splitBalls();
    setMessage("x3 Multiball", 1.4);
  } else if (block.special === "slow") {
    state.slowUntil = performance.now() + 8000;
    setMessage("Slow Motion", 1.4);
  } else if (block.special === "bomb") {
    state.bombCharges = Math.min(state.bombCharges + 3, 6);
    setMessage("Bomb Ball Ready", 1.4);
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

function explodeAt(x, y) {
  const radius = EXPLOSION_RADIUS;
  state.explosions.push({ x, y, radius, life: 0.48, age: 0 });
  activeFace().blocks.forEach(block => {
    if (!block.alive || block.type === "solid") return;
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const dist = Math.hypot(cx - x, cy - y);
    if (dist <= radius) damageBlock(block, 1, "bomb");
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
      burst(block.x + block.w / 2, block.y + block.h / 2, "#aeb6c6", 12);
      break;
    }
    damageBlock(block, block.hp, "rocket");
  }
}

function updateBalls(dt) {
  const slow = performance.now() < state.slowUntil ? 0.64 : 1;
  const remaining = [];

  for (const ball of state.balls) {
    if (ball.stuck) {
      remaining.push(ball);
      continue;
    }

    ball.x += ball.vx * dt * slow;
    ball.y += ball.vy * dt * slow;

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
      const hit = (ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
      const speed = Math.hypot(ball.vx, ball.vy);
      const angle = -Math.PI / 2 + hit * 0.82;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = state.paddle.y - ball.r - 1;
      burst(ball.x, ball.y + 8, "#78e3ff", 5);
    }

    const blocks = activeFace().blocks;
    for (const block of blocks) {
      if (!block.alive || !circleRectHit(ball, block)) continue;
      const prevX = ball.x - ball.vx * dt * slow;
      const prevY = ball.y - ball.vy * dt * slow;
      if (prevY <= block.y || prevY >= block.y + block.h) ball.vy *= -1;
      else ball.vx *= -1;
      if (state.bombCharges > 0 && block.type !== "solid") {
        state.bombCharges--;
        damageBlock(block, 1);
        explodeAt(block.x + block.w / 2, block.y + block.h / 2);
      } else {
        damageBlock(block, 1);
      }
      break;
    }

    if (ball.y - ball.r <= H + 30) remaining.push(ball);
  }

  state.balls = remaining.filter(ball => ball.y - ball.r <= H + 24);
  if (state.balls.length === 0) loseLife();
}

function loseLife() {
  state.lives--;
  if (state.lives <= 0) {
    state.score = 0;
    state.lives = 3;
    startStage(1);
    setMessage("Game Over", 1.8);
  } else {
    resetBallAndPaddle();
    setMessage("Ball Lost", 1.2);
  }
}

function isStageClear() {
  return state.stage.faces[0].blocks.every(block => !block.alive || block.type === "solid");
}

function nextStage() {
  const next = state.stageNumber + 1;
  if (next % 5 === 1 && next > 1) state.lives = Math.min(MAX_LIVES, state.lives + 1);
  startStage(next);
}

function updateParticles(dt) {
  state.particles = state.particles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    return p.life > 0;
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

function drawBlock(block) {
  if (!block.alive) return;
  const [top, bottom] = blockColor(block);
  ctx.save();
  const image = icons[block.pattern];
  if (image?.complete) {
    ctx.drawImage(image, block.x, block.y, block.w, block.h);
  } else {
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

  if (block.type !== "solid" && !block.special && block.label) {
    drawBlockLabel(block);
  }

  ctx.restore();
}

function drawBlockLabel(block) {
  ctx.font = "900 18px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 3;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(90,36,22,0.32)";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(block.label, block.x + block.w / 2, block.y + block.h / 2 + 2);
  ctx.fillText(block.label, block.x + block.w / 2, block.y + block.h / 2 + 2);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "900 17px Inter, Arial, sans-serif";
  ctx.fillText(block.label, block.x + block.w / 2 - 1, block.y + block.h / 2);
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
  ctx.shadowColor = "rgba(31,166,255,0.8)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  roundRect(p.x, p.y, p.w, p.h, p.h / 2);
  const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  g.addColorStop(0, "#2d9dff");
  g.addColorStop(0.22, "#075dc6");
  g.addColorStop(0.5, "#efe1ce");
  g.addColorStop(0.76, "#efe1ce");
  g.addColorStop(1, "#004caf");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.shadowColor = "transparent";
  const centerX = p.x + p.w / 2 - 26;
  roundRect(centerX, p.y + 19, 52, 10, 5);
  const light = ctx.createLinearGradient(centerX, p.y + 19, centerX, p.y + 29);
  light.addColorStop(0, "#ffffff");
  light.addColorStop(0.35, "#68eeff");
  light.addColorStop(1, "#00afff");
  ctx.fillStyle = light;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 2;
  roundRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, p.h / 2);
  ctx.stroke();
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

function render() {
  drawBackground();
  activeFace().blocks.forEach(drawBlock);
  drawExplosions();
  drawRockets();
  drawPaddle();
  state.balls.forEach(drawBall);
  drawParticles();
  drawMessage();
}

function updateHud() {
  hud.stage.textContent = state.stageNumber;
  hud.score.textContent = state.score.toLocaleString();
  hud.lives.innerHTML = Array.from({ length: state.lives }, () => '<img src="assets/images/heart.svg" alt="life" />').join("");
  const counts = countRemainingSpecials();
  hud.rocket.textContent = counts.rocket;
  hud.slow.textContent = counts.slow;
  hud.x3.textContent = counts.x3;
  hud.wide.textContent = counts.wide;
  hud.bomb.textContent = counts.bomb;
  hud.shield.textContent = counts.shield;
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
  state.paused = !state.paused;
  setMessage(state.paused ? "Paused" : "Resume", 0.8);
}

function update(dt) {
  if (state.paused) return;
  updatePaddle(dt);
  updateBalls(dt);
  updateParticles(dt);
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
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    launchBalls();
  }
  if (event.code === "KeyP") {
    togglePause();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

document.getElementById("btn-pause").addEventListener("click", togglePause);

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = (event.clientX - rect.left) * (W / rect.width);
});

canvas.addEventListener("pointerdown", () => launchBalls());
canvas.addEventListener("pointerleave", () => { pointerX = null; });

startStage(28);
state.score = 16450;
state.messageTimer = 0;
requestAnimationFrame(loop);
