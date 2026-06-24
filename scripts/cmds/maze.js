const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL = "https://cash-api-five.vercel.app/api/cash";

const MAX_LIMIT = 10n ** 261n;
const STATS_FILE = path.join(__dirname, "labyrinthe_stats.json");
const HISTORY_FILE = path.join(__dirname, "labyrinthe_history.json");
const STREAK_FILE = path.join(__dirname, "labyrinthe_streaks.json");
const ASSETS_DIR = path.join(__dirname, "labyrinthe_assets");

let games = {};
let rooms = {};
let playerStats = loadStats();
let gameHistory = loadHistory();
let playerStreaks = loadStreaks();

const playerCache = new Map();

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const TIERS = [
  { v: 10n ** 258n, s: "Qiu" }, { v: 10n ** 255n, s: "Qu" }, { v: 10n ** 252n, s: "Tu" },
  { v: 10n ** 249n, s: "Du" }, { v: 10n ** 246n, s: "Uc" }, { v: 10n ** 243n, s: "DcQ" },
  { v: 10n ** 240n, s: "NoQ" }, { v: 10n ** 237n, s: "OcQ" }, { v: 10n ** 234n, s: "SpQ" },
  { v: 10n ** 231n, s: "SxQ" }, { v: 10n ** 228n, s: "QiQ" }, { v: 10n ** 225n, s: "QQ" },
  { v: 10n ** 222n, s: "TQ" }, { v: 10n ** 219n, s: "DQ" }, { v: 10n ** 216n, s: "UQ" },
  { v: 10n ** 213n, s: "DcTr" }, { v: 10n ** 210n, s: "NoTr" }, { v: 10n ** 207n, s: "OcTr" },
  { v: 10n ** 204n, s: "SpTr" }, { v: 10n ** 201n, s: "SxTr" }, { v: 10n ** 198n, s: "QiTr" },
  { v: 10n ** 195n, s: "QTr" }, { v: 10n ** 192n, s: "TTr" }, { v: 10n ** 189n, s: "DTr" },
  { v: 10n ** 186n, s: "UTr" }, { v: 10n ** 183n, s: "DcT" }, { v: 10n ** 180n, s: "NoT" },
  { v: 10n ** 177n, s: "OcT" }, { v: 10n ** 174n, s: "SpT" }, { v: 10n ** 171n, s: "SxT" },
  { v: 10n ** 168n, s: "QiT" }, { v: 10n ** 165n, s: "QT" }, { v: 10n ** 162n, s: "TT" },
  { v: 10n ** 159n, s: "DT" }, { v: 10n ** 156n, s: "UT" }, { v: 10n ** 153n, s: "DcV" },
  { v: 10n ** 150n, s: "NoV" }, { v: 10n ** 147n, s: "OcV" }, { v: 10n ** 144n, s: "SpV" },
  { v: 10n ** 141n, s: "SxV" }, { v: 10n ** 138n, s: "QiV" }, { v: 10n ** 135n, s: "QV" },
  { v: 10n ** 132n, s: "TV" }, { v: 10n ** 129n, s: "DV" }, { v: 10n ** 126n, s: "UV" },
  { v: 10n ** 123n, s: "DcI" }, { v: 10n ** 120n, s: "NoI" }, { v: 10n ** 117n, s: "OcI" },
  { v: 10n ** 114n, s: "SpI" }, { v: 10n ** 111n, s: "SxI" }, { v: 10n ** 108n, s: "QiI" },
  { v: 10n ** 105n, s: "QI" }, { v: 10n ** 102n, s: "TI" }, { v: 10n ** 99n, s: "DI" },
  { v: 10n ** 96n, s: "UI" }, { v: 10n ** 93n, s: "DcN" }, { v: 10n ** 90n, s: "NoN" },
  { v: 10n ** 87n, s: "OcN" }, { v: 10n ** 84n, s: "SpN" }, { v: 10n ** 81n, s: "SxN" },
  { v: 10n ** 78n, s: "QiN" }, { v: 10n ** 75n, s: "QaN" }, { v: 10n ** 72n, s: "TN" },
  { v: 10n ** 69n, s: "BN" }, { v: 10n ** 66n, s: "MN" }, { v: 10n ** 63n, s: "kN" },
  { v: 10n ** 60n, s: "NoDc" }, { v: 10n ** 57n, s: "OcDc" }, { v: 10n ** 54n, s: "SpDc" },
  { v: 10n ** 51n, s: "SxDc" }, { v: 10n ** 48n, s: "QiDc" }, { v: 10n ** 45n, s: "QaDc" },
  { v: 10n ** 42n, s: "TDc" }, { v: 10n ** 39n, s: "DDc" }, { v: 10n ** 36n, s: "UDc" },
  { v: 10n ** 33n, s: "Dc" }, { v: 10n ** 30n, s: "No" }, { v: 10n ** 27n, s: "Oc" },
  { v: 10n ** 24n, s: "Sp" }, { v: 10n ** 21n, s: "Sx" }, { v: 10n ** 18n, s: "Qi" },
  { v: 10n ** 15n, s: "Qa" }, { v: 10n ** 12n, s: "T" }, { v: 10n ** 9n, s: "B" },
  { v: 10n ** 6n, s: "M" }, { v: 10n ** 3n, s: "k" }
];

const SFX = {
  k: 10n ** 3n, m: 10n ** 6n, b: 10n ** 9n, t: 10n ** 12n, qa: 10n ** 15n, qi: 10n ** 18n,
  sx: 10n ** 21n, sp: 10n ** 24n, oc: 10n ** 27n, no: 10n ** 30n, dc: 10n ** 33n,
  udc: 10n ** 36n, ddc: 10n ** 39n, tdc: 10n ** 42n, qadc: 10n ** 45n, qidc: 10n ** 48n,
  sxdc: 10n ** 51n, spdc: 10n ** 54n, ocdc: 10n ** 57n, nodc: 10n ** 60n,
  kn: 10n ** 63n, mn: 10n ** 66n, bn: 10n ** 69n, tn: 10n ** 72n, qan: 10n ** 75n, qin: 10n ** 78n,
  sxn: 10n ** 81n, spn: 10n ** 84n, ocn: 10n ** 87n, non: 10n ** 90n, dcn: 10n ** 93n,
  ui: 10n ** 96n, di: 10n ** 99n, ti: 10n ** 102n, qi_i: 10n ** 105n, qii: 10n ** 108n,
  sxi: 10n ** 111n, spi: 10n ** 114n, oci: 10n ** 117n, noi: 10n ** 120n, dci: 10n ** 123n,
  uv: 10n ** 126n, dv: 10n ** 129n, tv: 10n ** 132n, qv: 10n ** 135n, qiv: 10n ** 138n,
  sxv: 10n ** 141n, spv: 10n ** 144n, ocv: 10n ** 147n, nov: 10n ** 150n, dcv: 10n ** 153n,
  ut: 10n ** 156n, dt: 10n ** 159n, tt: 10n ** 162n, qt: 10n ** 165n, qit: 10n ** 168n,
  sxt: 10n ** 171n, spt: 10n ** 174n, oct: 10n ** 177n, not: 10n ** 180n, dct: 10n ** 183n,
  utr: 10n ** 186n, dtr: 10n ** 189n, ttr: 10n ** 192n, qtr: 10n ** 195n, qitr: 10n ** 198n,
  sxtr: 10n ** 201n, sptr: 10n ** 204n, octr: 10n ** 207n, notr: 10n ** 210n, dctr: 10n ** 213n,
  uq: 10n ** 216n, dq: 10n ** 219n, tq: 10n ** 222n, qq: 10n ** 225n, qiq: 10n ** 228n,
  sxq: 10n ** 231n, spq: 10n ** 234n, ocq: 10n ** 237n, noq: 10n ** 240n, dcq: 10n ** 243n,
  uc: 10n ** 246n, du: 10n ** 249n, tu: 10n ** 252n, qu: 10n ** 255n, qiu: 10n ** 258n,
  inf: MAX_LIMIT, infinity: MAX_LIMIT
};

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8") || "{}");
  } catch {}
  return {};
}

function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {}
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]");
  } catch {}
  return [];
}

function saveHistory() {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(gameHistory.slice(0, 100), null, 2)); } catch {}
}

function loadStreaks() {
  try {
    if (fs.existsSync(STREAK_FILE)) return JSON.parse(fs.readFileSync(STREAK_FILE, "utf8") || "{}");
  } catch {}
  return {};
}

function saveStreaks() {
  try { fs.writeFileSync(STREAK_FILE, JSON.stringify(playerStreaks, null, 2)); } catch {}
}

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v === undefined || v === null) return 0n;
  try { return BigInt(String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0"); } catch { return 0n; }
}

async function formatNumber(num) {
  const big = toBigInt(num);
  if (big === 0n) return "0";
  if (big >= MAX_LIMIT || big <= -MAX_LIMIT) return "∞";
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 3000 });
    if (r.data?.success) return r.data.isInfinity ? "∞" : r.data.formatted;
  } catch {}
  const neg = big < 0n, abs = neg ? -big : big;
  for (const tier of TIERS) {
    if (abs >= tier.v) {
      const intPart = abs / tier.v, rem = abs % tier.v, decPart = (rem * 100n) / tier.v;
      const prefix = neg ? "-" : "";
      if (decPart > 0n) {
        const dec = Number(decPart).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, "");
        return dec ? `${prefix}${intPart}.${dec}${tier.s}` : `${prefix}${intPart}${tier.s}`;
      }
      return `${prefix}${intPart}${tier.s}`;
    }
  }
  return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function parseAmount(input) {
  if (!input) return 0n;
  const str = String(input).toLowerCase().trim();
  if (str === "inf" || str === "infinity" || str === "∞") return MAX_LIMIT;
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`, { timeout: 5000 });
    if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw);
  } catch {}
  const m = str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i);
  if (!m) return 0n;
  const val = parseFloat(m[1]), sfx = (m[2] || "").toLowerCase();
  if (isNaN(val)) return 0n;
  const base = BigInt(Math.floor(Math.abs(val))), neg = val < 0;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx];
  if (mult) {
    const result = neg ? -(base * mult) : base * mult;
    if (result >= MAX_LIMIT || result <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT;
    return result;
  }
  return neg ? -base : base;
}

async function getUserCash(uid) {
  try {
    const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 10000 });
    if (r.data?.success && r.data?.data) {
      const cash = toBigInt(r.data.data.cash);
      return cash >= MAX_LIMIT ? MAX_LIMIT : cash;
    }
  } catch {}
  return 0n;
}

async function updateUserCash(uid, amount) {
  const a = toBigInt(amount);
  try {
    if (a > 0n) await axios.post(`${CASH_URL}/${uid}/add`, { amount: a.toString() });
    else if (a < 0n) await axios.post(`${CASH_URL}/${uid}/subtract`, { amount: (-a).toString() });
    return true;
  } catch { return false; }
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

function ensurePlayerStats(id) {
  if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, played: 0, totalWon: "0", totalLost: "0" };
}

function ensurePlayerStreak(id) {
  if (!playerStreaks[id]) playerStreaks[id] = { current: 0, best: 0, type: null };
}

function updateStreak(id, win) {
  ensurePlayerStreak(id);
  if (win) {
    playerStreaks[id].current++;
    if (playerStreaks[id].current > playerStreaks[id].best) playerStreaks[id].best = playerStreaks[id].current;
    playerStreaks[id].type = "win";
  } else {
    playerStreaks[id].current = 0;
    playerStreaks[id].type = null;
  }
  saveStreaks();
}

function addHistory(entry) {
  gameHistory.unshift({ ...entry, timestamp: Date.now() });
  if (gameHistory.length > 100) gameHistory = gameHistory.slice(0, 100);
  saveHistory();
}

function generateMaze(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { top: true, bottom: true, left: true, right: true, visited: false };
    }
  }
  const stack = [];
  const start = { row: 0, col: 0 };
  grid[0][0].visited = true;
  stack.push(start);
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    if (current.row > 0 && !grid[current.row - 1][current.col].visited)
      neighbors.push({ row: current.row - 1, col: current.col, dir: "top" });
    if (current.row < rows - 1 && !grid[current.row + 1][current.col].visited)
      neighbors.push({ row: current.row + 1, col: current.col, dir: "bottom" });
    if (current.col > 0 && !grid[current.row][current.col - 1].visited)
      neighbors.push({ row: current.row, col: current.col - 1, dir: "left" });
    if (current.col < cols - 1 && !grid[current.row][current.col + 1].visited)
      neighbors.push({ row: current.row, col: current.col + 1, dir: "right" });
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    grid[next.row][next.col].visited = true;
    if (next.dir === "top") { grid[current.row][current.col].top = false;
      grid[next.row][next.col].bottom = false; }
    if (next.dir === "bottom") { grid[current.row][current.col].bottom = false;
      grid[next.row][next.col].top = false; }
    if (next.dir === "left") { grid[current.row][current.col].left = false;
      grid[next.row][next.col].right = false; }
    if (next.dir === "right") { grid[current.row][current.col].right = false;
      grid[next.row][next.col].left = false; }
    stack.push({ row: next.row, col: next.col });
  }
  return grid;
}

function findShortestPath(grid, startRow, startCol, endRow, endCol) {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue = [{ row: startRow, col: startCol, path: [{ row: startRow, col: startCol }] }];
  const visited = new Set();
  visited.add(`${startRow},${startCol}`);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.row === endRow && current.col === endCol) return current.path;
    const cell = grid[current.row][current.col];
    const moves = [];
    if (!cell.top && current.row > 0) moves.push({ row: current.row - 1, col: current.col });
    if (!cell.bottom && current.row < rows - 1) moves.push({ row: current.row + 1, col: current.col });
    if (!cell.left && current.col > 0) moves.push({ row: current.row, col: current.col - 1 });
    if (!cell.right && current.col < cols - 1) moves.push({ row: current.row, col: current.col + 1 });
    for (const move of moves) {
      const key = `${move.row},${move.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ ...move, path: [...current.path, move] });
      }
    }
  }
  return null;
}

async function generateMazeImage({ grid, rows, cols, playerPos, exitPos, path, playerName, bet, time, moves, difficulty, players }) {
  const W = 900, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const cellSize = Math.min(W / cols, H / rows) * 0.85;
  const offsetX = (W - cellSize * cols) / 2;
  const offsetY = (H - cellSize * rows) / 2 - 30;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f");
  bg.addColorStop(0.5, "#0f0d20");
  bg.addColorStop(1, "#070515");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  ctx.strokeStyle = "rgba(129,140,248,0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20);
  ctx.stroke();

  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "#818cf8";
  ctx.textAlign = "center";
  ctx.shadowColor = "#818cf8";
  ctx.shadowBlur = 14;
  ctx.fillText("HEDGEHOG LABYRINTHE", W / 2, 50);
  ctx.shadowBlur = 0;

  const infoY = 70;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 20, infoY, W - 40, 40, 8);
  ctx.fill();

  const infoItems = [
    { label: "Joueur", value: playerName },
    { label: "Mise", value: `${bet}$` },
    { label: "Coups", value: moves },
    { label: "Temps", value: time }
  ];

  if (players && players.length > 0) {
    const roomInfo = players.map(p => p.current ? `⭐${p.name}` : p.name).join(" • ");
    ctx.font = "12px Arial";
    ctx.fillStyle = "#a78bfa";
    ctx.textAlign = "center";
    ctx.fillText(roomInfo, W / 2, infoY + 25);
  }

  ctx.font = "bold 13px Arial";
  const spacing = (W - 40) / infoItems.length;
  for (let i = 0; i < infoItems.length; i++) {
    const x = 20 + i * spacing + spacing / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#818cf8";
    ctx.fillText(`${infoItems[i].label}:`, x, infoY + 15);
    ctx.fillStyle = "#e0e7ff";
    ctx.fillText(infoItems[i].value, x, infoY + 32);
  }

  const mazeStartY = infoY + 55;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = mazeStartY + r * cellSize;
      const cell = grid[r][c];
      ctx.strokeStyle = "rgba(129,140,248,0.6)";
      ctx.lineWidth = 2;
      if (cell.top) { ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.stroke(); }
      if (cell.bottom) { ctx.beginPath();
        ctx.moveTo(x, y + cellSize);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke(); }
      if (cell.left) { ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke(); }
      if (cell.right) { ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke(); }
      if (playerPos.row === r && playerPos.col === c) {
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "bold 22px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧑", x + cellSize / 2, y + cellSize / 2 + 2);
        ctx.textBaseline = "alphabetic";
      }
      if (exitPos.row === r && exitPos.col === c) {
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏆", x + cellSize / 2, y + cellSize / 2 + 2);
        ctx.textBaseline = "alphabetic";
      }
      if (path && path.some(p => p.row === r && p.col === c) && !(playerPos.row === r && playerPos.col === c)) {
        ctx.fillStyle = "rgba(52,211,153,0.15)";
        roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
      }
    }
  }

  const legendY = mazeStartY + rows * cellSize + 35;
  const legendItems = [
    { emoji: "🧑", label: "Toi" },
    { emoji: "🏆", label: "Sortie" },
    { emoji: "🟩", label: "Chemin" }
  ];
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, (W - 300) / 2, legendY, 300, 30, 8);
  ctx.fill();
  ctx.font = "13px Arial";
  for (let i = 0; i < legendItems.length; i++) {
    const x = (W - 200) / 2 + i * 80;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(legendItems[i].emoji, x, legendY + 20);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px Arial";
    ctx.fillText(legendItems[i].label, x + 20, legendY + 20);
    ctx.font = "13px Arial";
  }

  ctx.font = "10px Arial";
  ctx.fillStyle = "rgba(129,140,248,0.2)";
  ctx.textAlign = "center";
  ctx.fillText(`${difficulty || "Normal"} • ${rows}x${cols}`, W / 2, H - 14);

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function getDiceEmoji(value) {
  const emojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return emojis[value - 1] || "🎲";
}

function getDirectionFromEmoji(emoji) {
  const map = {
    "⬆️": "haut",
    "⬇️": "bas",
    "⬅️": "gauche",
    "➡️": "droite"
  };
  return map[emoji] || null;
}

function createRoom(roomId, creatorId, creatorName, bet, difficulty = "normal") {
  const configs = {
    facile: { rows: 5, cols: 5, timeLimit: 90 },
    normal: { rows: 7, cols: 7, timeLimit: 120 },
    difficile: { rows: 9, cols: 9, timeLimit: 150 },
    extreme: { rows: 12, cols: 12, timeLimit: 200 }
  };
  const config = configs[difficulty] || configs.normal;
  const grid = generateMaze(config.rows, config.cols);
  const start = { row: 0, col: 0 };
  const exit = { row: config.rows - 1, col: config.cols - 1 };

  rooms[roomId] = {
    grid,
    rows: config.rows,
    cols: config.cols,
    exitPos: exit,
    difficulty,
    timeLimit: config.timeLimit,
    players: [{ id: creatorId, name: creatorName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true }],
    bet,
    startTime: Date.now(),
    inProgress: true,
    currentPlayerIndex: 0,
    turnPhase: "dice",
    diceValue: null,
    waitingForMoves: false,
    pendingMoves: [],
    maxPlayers: 8,
    minPlayers: 2,
    finished: false
  };
  return rooms[roomId];
}

function addPlayerToRoom(roomId, playerId, playerName) {
  const room = rooms[roomId];
  if (!room) return null;
  if (room.players.length >= room.maxPlayers) return "full";
  if (room.players.find(p => p.id === playerId)) return "already";
  room.players.push({
    id: playerId,
    name: playerName,
    pos: { row: 0, col: 0 },
    path: [{ row: 0, col: 0 }],
    moves: 0,
    current: false
  });
  return room;
}

function getPlayerRoom(playerId) {
  for (const [id, room] of Object.entries(rooms)) {
    if (room.players.some(p => p.id === playerId)) return id;
  }
  return null;
}

function getPlayerInRoom(room, playerId) {
  return room.players.find(p => p.id === playerId);
}

function getCurrentPlayer(room) {
  return room.players[room.currentPlayerIndex];
}

function nextTurn(room) {
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  room.turnPhase = "dice";
  room.diceValue = null;
  room.waitingForMoves = false;
  room.pendingMoves = [];
  const player = getCurrentPlayer(room);
  if (player) player.current = true;
  for (const p of room.players) {
    if (p.id !== player?.id) p.current = false;
  }
  return getCurrentPlayer(room);
}

function processRoomMove(room, playerId, direction) {
  const player = getPlayerInRoom(room, playerId);
  if (!player) return null;
  if (!room.waitingForMoves) return null;
  if (room.pendingMoves.length >= room.diceValue) return null;

  const { grid, rows, cols } = room;
  let newRow = player.pos.row;
  let newCol = player.pos.col;

  switch (direction) {
    case "haut":
      if (!grid[player.pos.row][player.pos.col].top && player.pos.row > 0) newRow--;
      else return null;
      break;
    case "bas":
      if (!grid[player.pos.row][player.pos.col].bottom && player.pos.row < rows - 1) newRow++;
      else return null;
      break;
    case "gauche":
      if (!grid[player.pos.row][player.pos.col].left && player.pos.col > 0) newCol--;
      else return null;
      break;
    case "droite":
      if (!grid[player.pos.row][player.pos.col].right && player.pos.col < cols - 1) newCol++;
      else return null;
      break;
    default:
      return null;
  }

  player.pos.row = newRow;
  player.pos.col = newCol;
  player.moves++;
  player.path.push({ row: newRow, col: newCol });
  room.pendingMoves.push(direction);

  if (newRow === room.exitPos.row && newCol === room.exitPos.col) {
    return { type: "win", player };
  }

  return { type: "move", player };
}

function finishTurn(room) {
  room.waitingForMoves = false;
  room.turnPhase = "dice";

  const current = getCurrentPlayer(room);
  if (current.pos.row === room.exitPos.row && current.pos.col === room.exitPos.col) {
    return { type: "win", player: current };
  }

  const elapsed = (Date.now() - room.startTime) / 1000;
  if (elapsed >= room.timeLimit) {
    return { type: "timeout" };
  }

  nextTurn(room);
  return { type: "next", player: getCurrentPlayer(room) };
}

async function sendMazeImage(api, threadID, roomId, message = "") {
  const room = rooms[roomId];
  if (!room) return;

  const current = getCurrentPlayer(room);
  const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
  const timeLeft = Math.max(0, room.timeLimit - elapsed);

  const img = await generateMazeImage({
    grid: room.grid,
    rows: room.rows,
    cols: room.cols,
    playerPos: current.pos,
    exitPos: room.exitPos,
    path: current.path,
    playerName: current.name,
    bet: await formatNumber(room.bet),
    time: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`,
    moves: current.moves,
    difficulty: room.difficulty,
    players: room.players
  });

  const fp = path.join(ASSETS_DIR, `maze_${roomId}_${Date.now()}.png`);
  await fs.writeFile(fp, img);
  await new Promise((resolve, reject) => {
    api.sendMessage({
      body: message || UI([
        "🧩 LABYRINTHE",
        "---",
        `👤 ${current.name} (${room.currentPlayerIndex + 1}/${room.players.length})`,
        `💰 Mise: ${await formatNumber(room.bet)}$`,
        `🚶 Coups: ${current.moves}`,
        `🎲 Dés: ${room.diceValue || "❓"}`,
        `⏱️ Temps: ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} / ${room.timeLimit}s`,
        "---",
        room.turnPhase === "dice" ? "Choisis une boîte (1-6) pour lancer le dé" :
        room.turnPhase === "move" ? `Tu as ${room.diceValue} déplacements. Envoie ⬆️⬇️⬅️➡️` :
        "En attente..."
      ]),
      attachment: fs.createReadStream(fp)
    }, threadID, (err) => {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
      err ? reject(err) : resolve();
    });
  });
}

module.exports = {
  config: {
    name: "maze",
    aliases: ["labyrinthe", "laby"],
    version: "2.0",
    author: "Ismael03-Dev",
    category: "game",
    shortDescription: { en: "Labyrinth game" },
    countDown: 2,
    role: 0
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const p = global.utils.getPrefix(threadID);
    const sub = (args[0] || "").toLowerCase();

    ensurePlayerStats(senderID);

    if (!sub || sub === "help") {
      return api.sendMessage(UI([
        "🧩 LABYRINTHE",
        "---",
        `${p}maze start <mise> [difficulte]`,
        `${p}maze @joueur <mise> [difficulte]`,
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`,
        `${p}maze stats`,
        `${p}maze history`,
        `${p}maze leaderboard`,
        `${p}maze abandon`,
        "---",
        "Difficultes: facile/normal/difficile/extreme",
        "Room: 2 a 8 joueurs",
        "Deplacements: ⬆️ ⬇️ ⬅️ ➡️"
      ]), threadID);
    }

    if (sub === "stats") {
      const stats = playerStats[senderID] || { wins: 0, losses: 0, played: 0 };
      const streak = playerStreaks[senderID] || { current: 0, best: 0 };
      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const wr = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;
      return api.sendMessage(UI([
        `📊 STATS — ${name}`,
        "---",
        `Victoires: ${stats.wins}`,
        `Defaites: ${stats.losses}`,
        `Parties: ${stats.played}`,
        `Winrate: ${wr}%`,
        `🔥 Streak: ${streak.current}`,
        `🏆 Meilleur streak: ${streak.best}`
      ]), threadID);
    }

    if (sub === "history") {
      const userHistory = gameHistory.filter(h => h.player === senderID).slice(0, 10);
      if (userHistory.length === 0) return api.sendMessage(UI(["Aucun historique."]));
      const lines = ["📜 HISTORIQUE", "---"];
      for (const h of userHistory) {
        const date = new Date(h.timestamp).toLocaleString("fr-FR");
        const result = h.won ? "✅ Victoire" : "❌ Defaite";
        lines.push(`${result} | ${h.moves} coups | ${h.difficulty} | ${date}`);
        lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "leaderboard") {
      const sorted = Object.entries(playerStats).filter(([id]) => id !== "AI").sort((a, b) => b[1].wins - a[1].wins).slice(0, 10);
      if (sorted.length === 0) return api.sendMessage(UI(["Aucun joueur."]));
      const lines = ["🏆 CLASSEMENT", "---"];
      const medals = ["🥇", "🥈", "🥉"];
      for (let i = 0; i < sorted.length; i++) {
        const [id, st] = sorted[i];
        const name = await usersData.getName(id).catch(() => `User ${id}`);
        const wr = st.played > 0 ? Math.round(st.wins / st.played * 100) : 0;
        lines.push(`${medals[i] || `${i + 1}.`} ${name}`);
        lines.push(`   ${st.wins}V/${st.losses}D | ${wr}% | ${st.played} parties`);
        lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "abandon" || sub === "quit") {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) {
        const gameId = Object.keys(games).find(id => games[id].playerID === senderID);
        if (gameId) { delete games[gameId]; return api.sendMessage(UI(["Partie abandonnee."])); }
        return api.sendMessage(UI(["Aucune partie en cours."]));
      }
      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);
      if (player) {
        room.players = room.players.filter(p => p.id !== senderID);
        if (room.players.length < room.minPlayers) {
          delete rooms[roomId];
          return api.sendMessage(UI(["Partie annulee (trop peu de joueurs)."]));
        }
        if (room.currentPlayerIndex >= room.players.length) room.currentPlayerIndex = 0;
        if (room.players.length > 0) {
          for (const p of room.players) p.current = false;
          const next = getCurrentPlayer(room);
          next.current = true;
          room.turnPhase = "dice";
          room.diceValue = null;
          await sendMazeImage(api, threadID, roomId, UI([`${player.name} a abandonne.`, `Tour de ${next.name}.`]));
        }
      }
      return api.sendMessage(UI(["Tu as quitte la partie."]));
    }

    if (sub === "room") {
      const sub2 = (args[1] || "").toLowerCase();

      if (sub2 === "create") {
        const bet = await parseAmount(args[2]);
        const difficulty = (args[3] || "normal").toLowerCase();
        const validDifficulties = ["facile", "normal", "difficile", "extreme"];

        if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]));
        if (!validDifficulties.includes(difficulty)) return api.sendMessage(UI(["❌ Difficulté invalide.", "Choix: facile/normal/difficile/extreme"]));

        const existingRoom = getPlayerRoom(senderID);
        if (existingRoom) return api.sendMessage(UI(["Tu es deja dans une room."]));

        const cash = await getUserCash(senderID);
        if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants", `Solde: ${await formatNumber(cash)}$`]));

        await updateUserCash(senderID, -bet);

        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        const roomId = `room_${threadID}_${Date.now()}`;
        createRoom(roomId, senderID, name, bet, difficulty);

        await sendMazeImage(api, threadID, roomId, UI([
          "🏠 ROOM CREE",
          "---",
          `👤 Hote: ${name}`,
          `💰 Mise: ${await formatNumber(bet)}$`,
          `📊 Niveau: ${difficulty}`,
          `👥 Joueurs: 1/${rooms[roomId].maxPlayers}`,
          "---",
          `${p}maze room join pour rejoindre`,
          `${p}maze room start pour lancer`
        ]));
        return;
      }

      if (sub2 === "join") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].inProgress && !rooms[id].finished && rooms[id].players.length < rooms[id].maxPlayers
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room disponible."]));

        const existingRoom = getPlayerRoom(senderID);
        if (existingRoom) return api.sendMessage(UI(["Tu es deja dans une room."]));

        const room = rooms[roomId];
        const cash = await getUserCash(senderID);
        if (room.bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants", `Solde: ${await formatNumber(cash)}$`, `Mise: ${await formatNumber(room.bet)}$`]));

        await updateUserCash(senderID, -room.bet);

        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        const result = addPlayerToRoom(roomId, senderID, name);

        if (result === "full") return api.sendMessage(UI(["❌ Room pleine."]));
        if (result === "already") return api.sendMessage(UI(["❌ Deja dans la room."]));

        await sendMazeImage(api, threadID, roomId, UI([
          "✅ REJOINT",
          "---",
          `${name} a rejoint la room !`,
          `👥 Joueurs: ${room.players.length}/${room.maxPlayers}`,
          "---",
          `${p}maze room start pour lancer`,
          `${p}maze room info pour voir la room`
        ]));
        return;
      }

      if (sub2 === "start") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].players.some(p => p.id === senderID) && rooms[id].inProgress && !rooms[id].finished
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room trouvee."]));

        const room = rooms[roomId];
        if (room.players.length < room.minPlayers) {
          return api.sendMessage(UI([`Il faut ${room.minPlayers} joueurs minimum. Actuel: ${room.players.length}`]));
        }

        room.inProgress = true;
        room.turnPhase = "dice";
        room.startTime = Date.now();

        for (let i = 0; i < room.players.length; i++) {
          room.players[i].current = i === 0;
          room.players[i].pos = { row: 0, col: 0 };
          room.players[i].path = [{ row: 0, col: 0 }];
          room.players[i].moves = 0;
        }

        await sendMazeImage(api, threadID, roomId, UI([
          "🎮 PARTIE LANCEE !",
          "---",
          `👥 ${room.players.length} joueurs`,
          `🎯 Sortie: trouver la 🏆`,
          `🎲 Chaque tour: lancer un dé et se deplacer`,
          "---",
          `${getCurrentPlayer(room).name}, choisis une boîte (1-6)`
        ]));
        return;
      }

      if (sub2 === "info") {
        const roomId = getPlayerRoom(senderID);
        if (!roomId) return api.sendMessage(UI(["Tu n'es dans aucune room."]));

        const room = rooms[roomId];
        const lines = ["🏠 ROOM INFO", "---"];
        lines.push(`📊 Niveau: ${room.difficulty}`);
        lines.push(`💰 Mise: ${await formatNumber(room.bet)}$`);
        lines.push(`👥 Joueurs: ${room.players.length}/${room.maxPlayers}`);
        lines.push("---");
        for (const p of room.players) {
          const status = p.current ? "⭐" : "";
          lines.push(`${status} ${p.name} (${p.moves} coups)`);
        }
        return api.sendMessage(UI(lines), threadID);
      }

      return api.sendMessage(UI([
        "🏠 ROOM COMMANDES",
        "---",
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`,
        `${p}maze room start`,
        `${p}maze room info`
      ]), threadID);
    }

    const mentions = event.mentions || {};
    const targetId = Object.keys(mentions)[0] || null;

    if (targetId) {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();
      const validDifficulties = ["facile", "normal", "difficile", "extreme"];

      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]));
      if (!validDifficulties.includes(difficulty)) return api.sendMessage(UI(["❌ Difficulté invalide."]));

      const targetName = mentions[targetId] || (await usersData.getName(targetId)) || `Player ${targetId}`;
      const playerName = (await usersData.getName(senderID)) || `Player ${senderID}`;

      const existingRoom = getPlayerRoom(senderID);
      if (existingRoom) return api.sendMessage(UI(["Tu es deja dans une room."]));

      const cash1 = await getUserCash(senderID);
      const cash2 = await getUserCash(targetId);

      if (bet > cash1) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${await formatNumber(cash1)}$`]));
      if (bet > cash2) return api.sendMessage(UI(["💰 L'adversaire n'a pas assez.", `Son solde: ${await formatNumber(cash2)}$`]));

      await updateUserCash(senderID, -bet);
      await updateUserCash(targetId, -bet);

      const roomId = `duel_${threadID}_${Date.now()}`;
      const configs = {
        facile: { rows: 5, cols: 5, timeLimit: 90 },
        normal: { rows: 7, cols: 7, timeLimit: 120 },
        difficile: { rows: 9, cols: 9, timeLimit: 150 },
        extreme: { rows: 12, cols: 12, timeLimit: 200 }
      };
      const config = configs[difficulty] || configs.normal;
      const grid = generateMaze(config.rows, config.cols);

      rooms[roomId] = {
        grid,
        rows: config.rows,
        cols: config.cols,
        exitPos: { row: config.rows - 1, col: config.cols - 1 },
        difficulty,
        timeLimit: config.timeLimit,
        players: [
          { id: senderID, name: playerName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true },
          { id: targetId, name: targetName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: false }
        ],
        bet,
        startTime: Date.now(),
        inProgress: true,
        currentPlayerIndex: 0,
        turnPhase: "dice",
        diceValue: null,
        waitingForMoves: false,
        pendingMoves: [],
        maxPlayers: 2,
        minPlayers: 2,
        finished: false
      };

      await sendMazeImage(api, threadID, roomId, UI([
        "⚔️ DUEL COMMENCE !",
        "---",
        `${playerName} vs ${targetName}`,
        `💰 Mise: ${await formatNumber(bet)}$ chacun`,
        `📊 Niveau: ${difficulty}`,
        "---",
        `${playerName}, choisis une boîte (1-6)`
      ]));
      return;
    }

    if (sub === "start" || sub === "jouer" || sub === "play") {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();
      const validDifficulties = ["facile", "normal", "difficile", "extreme"];

      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]));
      if (!validDifficulties.includes(difficulty)) return api.sendMessage(UI(["❌ Difficulté invalide."]));

      const cash = await getUserCash(senderID);
      if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants", `Solde: ${await formatNumber(cash)}$`]));

      const existingRoom = getPlayerRoom(senderID);
      if (existingRoom) return api.sendMessage(UI(["Tu es deja dans une room."]));

      await updateUserCash(senderID, -bet);

      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const roomId = `solo_${threadID}_${Date.now()}`;
      const configs = {
        facile: { rows: 5, cols: 5, timeLimit: 60 },
        normal: { rows: 7, cols: 7, timeLimit: 90 },
        difficile: { rows: 9, cols: 9, timeLimit: 120 },
        extreme: { rows: 12, cols: 12, timeLimit: 180 }
      };
      const config = configs[difficulty] || configs.normal;
      const grid = generateMaze(config.rows, config.cols);

      rooms[roomId] = {
        grid,
        rows: config.rows,
        cols: config.cols,
        exitPos: { row: config.rows - 1, col: config.cols - 1 },
        difficulty,
        timeLimit: config.timeLimit,
        players: [
          { id: senderID, name: name, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true }
        ],
        bet,
        startTime: Date.now(),
        inProgress: true,
        currentPlayerIndex: 0,
        turnPhase: "dice",
        diceValue: null,
        waitingForMoves: false,
        pendingMoves: [],
        maxPlayers: 1,
        minPlayers: 1,
        finished: false
      };

      await sendMazeImage(api, threadID, roomId, UI([
        "🧩 LABYRINTHE SOLO",
        "---",
        `👤 Joueur: ${name}`,
        `💰 Mise: ${await formatNumber(bet)}$`,
        `📊 Niveau: ${difficulty}`,
        `⏱️ Limite: ${config.timeLimit}s`,
        "---",
        "Trouve la sortie ! 🏆",
        "Choisis une boîte (1-6) pour commencer"
      ]));
      return;
    }

    const diceMatch = sub.match(/^[1-6]$/);
    if (diceMatch) {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) return api.sendMessage(UI(["Aucune partie en cours."]));

      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);

      if (!player || !player.current) return api.sendMessage(UI(["Ce n'est pas ton tour."]));
      if (room.turnPhase !== "dice") return api.sendMessage(UI(["Tu as deja lance le dé. Fais tes déplacements."]));

      const diceValue = parseInt(sub);
      room.diceValue = diceValue;
      room.turnPhase = "move";
      room.waitingForMoves = true;
      room.pendingMoves = [];

      await sendMazeImage(api, threadID, roomId, UI([
        `🎲 Tu as lance ${diceValue} (${getDiceEmoji(diceValue)})`,
        `📦 Boîte choisie: ${sub}`,
        "---",
        `Tu as ${diceValue} déplacements.`,
        "Envoie: ⬆️ ⬇️ ⬅️ ➡️",
        `Exemple: ${'⬆️'.repeat(Math.min(diceValue, 3))}`
      ]));
      return;
    }

    const moveMatch = sub.match(/[⬆️⬇️⬅️➡️]/g);
    if (moveMatch && moveMatch.length > 0) {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) return api.sendMessage(UI(["Aucune partie en cours."]));

      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);

      if (!player || !player.current) return api.sendMessage(UI(["Ce n'est pas ton tour."]));
      if (room.turnPhase !== "move" || !room.waitingForMoves) {
        return api.sendMessage(UI(["Tu dois d'abord lancer le dé (1-6)."]));
      }

      const moves = moveMatch.map(m => getDirectionFromEmoji(m)).filter(Boolean);

      if (moves.length === 0) {
        return api.sendMessage(UI(["Mouvements invalides. Utilise ⬆️ ⬇️ ⬅️ ➡️"]));
      }

      let result = null;
      let winPlayer = null;

      for (const direction of moves) {
        if (room.pendingMoves.length >= room.diceValue) break;
        if (room.finished) break;

        const moveResult = processRoomMove(room, senderID, direction);
        if (!moveResult) {
          continue;
        }

        if (moveResult.type === "win") {
          result = "win";
          winPlayer = moveResult.player;
          break;
        }
        result = "move";
      }

      if (result === "win") {
        room.finished = true;
        room.inProgress = false;

        const totalBet = room.bet * BigInt(room.players.length);
        await updateUserCash(winPlayer.id, totalBet);

        ensurePlayerStats(winPlayer.id);
        playerStats[winPlayer.id].wins++;
        playerStats[winPlayer.id].played++;
        updateStreak(winPlayer.id, true);

        for (const p of room.players) {
          if (p.id !== winPlayer.id) {
            ensurePlayerStats(p.id);
            playerStats[p.id].losses++;
            playerStats[p.id].played++;
            updateStreak(p.id, false);
          }
        }
        saveStats();

        addHistory({
          player: winPlayer.id,
          won: true,
          moves: winPlayer.moves,
          difficulty: room.difficulty,
          players: room.players.length,
          isRoom: room.players.length > 1
        });

        await sendMazeImage(api, threadID, roomId, UI([
          "🎉 VICTOIRE !",
          "---",
          `🏆 ${winPlayer.name} a trouve la sortie !`,
          `🚶 Coups: ${winPlayer.moves}`,
          `💰 Gain: +${await formatNumber(totalBet)}$`,
          "---",
          "🎊 Felicitations !"
        ]));

        delete rooms[roomId];
        return;
      }

      if (room.pendingMoves.length >= room.diceValue) {
        room.waitingForMoves = false;
        room.turnPhase = "dice";

        const currentPlayer = getCurrentPlayer(room);
        if (currentPlayer.pos.row === room.exitPos.row && currentPlayer.pos.col === room.exitPos.col) {
          room.finished = true;
          room.inProgress = false;

          const totalBet = room.bet * BigInt(room.players.length);
          await updateUserCash(currentPlayer.id, totalBet);

          ensurePlayerStats(currentPlayer.id);
          playerStats[currentPlayer.id].wins++;
          playerStats[currentPlayer.id].played++;
          updateStreak(currentPlayer.id, true);

          for (const p of room.players) {
            if (p.id !== currentPlayer.id) {
              ensurePlayerStats(p.id);
              playerStats[p.id].losses++;
              playerStats[p.id].played++;
              updateStreak(p.id, false);
            }
          }
          saveStats();

          await sendMazeImage(api, threadID, roomId, UI([
            "🎉 VICTOIRE !",
            "---",
            `🏆 ${currentPlayer.name} a trouve la sortie !`,
            `🚶 Coups: ${currentPlayer.moves}`,
            `💰 Gain: +${await formatNumber(totalBet)}$`
          ]));

          delete rooms[roomId];
          return;
        }

        const elapsed = (Date.now() - room.startTime) / 1000;
        if (elapsed >= room.timeLimit) {
          room.finished = true;
          room.inProgress = false;

          for (const p of room.players) {
            ensurePlayerStats(p.id);
            playerStats[p.id].losses++;
            playerStats[p.id].played++;
            updateStreak(p.id, false);
          }
          saveStats();

          await sendMazeImage(api, threadID, roomId, UI([
            "⏰ TEMPS ECOULE !",
            "---",
            "Personne n'a trouve la sortie a temps."
          ]));

          delete rooms[roomId];
          return;
        }

        const next = nextTurn(room);
        await sendMazeImage(api, threadID, roomId, UI([
          "🔄 TOUR SUIVANT",
          "---",
          `${next.name}, c'est ton tour !`,
          "Choisis une boîte (1-6)"
        ]));
        return;
      }

      const remaining = room.diceValue - room.pendingMoves.length;
      const usedEmojis = room.pendingMoves.map(d => {
        const map = { "haut": "⬆️", "bas": "⬇️", "gauche": "⬅️", "droite": "➡️" };
        return map[d] || d;
      }).join("");

      await sendMazeImage(api, threadID, roomId, UI([
        `🚶 Deplacements: ${usedEmojis}`,
        `⏳ Restant: ${remaining}`,
        "---",
        `Envoie ${'⬆️⬇️⬅️➡️'.slice(0, remaining * 2)}`
      ]));
      return;
    }

    return api.sendMessage(UI([`Commande inconnue. ${p}maze help`]));
  },

  onChat: async function ({ api, event, usersData }) {
  }
};