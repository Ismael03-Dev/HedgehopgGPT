const fs     = require("fs-extra");
const path   = require("path");
const { createCanvas } = require("canvas");
const axios  = require("axios");

const FORMAT_URL  = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL    = "https://cash-api-five.vercel.app/api/cash";
const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_KEY = "VCFZLWLWcxk6SIMIZHa0HjGr2rRwrZhN";

const MAX_LIMIT    = 10n ** 261n;
const STATS_FILE   = path.join(__dirname, "tictactoe_stats.json");
const HISTORY_FILE = path.join(__dirname, "tictactoe_history.json");
const STREAK_FILE  = path.join(__dirname, "tictactoe_streaks.json");
const ONLINE_FILE  = path.join(__dirname, "tictactoe_online.json");
const GROUP_SELECTION_FILE = path.join(__dirname, "tictactoe_group_selection.json");
const ASSETS_DIR   = path.join(__dirname, "tictactoe_assets");
const BOT_UID  = global.botID;
const BOT_NAME = "Hedgehog GPT";

const TIERS = [
  { v: 10n**258n, s: "Qiu" }, { v: 10n**255n, s: "Qu" },  { v: 10n**252n, s: "Tu" },
  { v: 10n**249n, s: "Du" },  { v: 10n**246n, s: "Uc" },  { v: 10n**243n, s: "DcQ" },
  { v: 10n**240n, s: "NoQ" }, { v: 10n**237n, s: "OcQ" }, { v: 10n**234n, s: "SpQ" },
  { v: 10n**231n, s: "SxQ" }, { v: 10n**228n, s: "QiQ" }, { v: 10n**225n, s: "QQ" },
  { v: 10n**222n, s: "TQ" },  { v: 10n**219n, s: "DQ" },  { v: 10n**216n, s: "UQ" },
  { v: 10n**213n, s: "DcTr"}, { v: 10n**210n, s: "NoTr"}, { v: 10n**207n, s: "OcTr"},
  { v: 10n**204n, s: "SpTr"}, { v: 10n**201n, s: "SxTr"}, { v: 10n**198n, s: "QiTr"},
  { v: 10n**195n, s: "QTr" }, { v: 10n**192n, s: "TTr" }, { v: 10n**189n, s: "DTr" },
  { v: 10n**186n, s: "UTr" }, { v: 10n**183n, s: "DcT" }, { v: 10n**180n, s: "NoT" },
  { v: 10n**177n, s: "OcT" }, { v: 10n**174n, s: "SpT" }, { v: 10n**171n, s: "SxT" },
  { v: 10n**168n, s: "QiT" }, { v: 10n**165n, s: "QT" },  { v: 10n**162n, s: "TT" },
  { v: 10n**159n, s: "DT" },  { v: 10n**156n, s: "UT" },  { v: 10n**153n, s: "DcV" },
  { v: 10n**150n, s: "NoV" }, { v: 10n**147n, s: "OcV" }, { v: 10n**144n, s: "SpV" },
  { v: 10n**141n, s: "SxV" }, { v: 10n**138n, s: "QiV" }, { v: 10n**135n, s: "QV" },
  { v: 10n**132n, s: "TV" },  { v: 10n**129n, s: "DV" },  { v: 10n**126n, s: "UV" },
  { v: 10n**123n, s: "DcI" }, { v: 10n**120n, s: "NoI" }, { v: 10n**117n, s: "OcI" },
  { v: 10n**114n, s: "SpI" }, { v: 10n**111n, s: "SxI" }, { v: 10n**108n, s: "QiI" },
  { v: 10n**105n, s: "QI" },  { v: 10n**102n, s: "TI" },  { v: 10n**99n,  s: "DI" },
  { v: 10n**96n,  s: "UI" },  { v: 10n**93n,  s: "DcN" }, { v: 10n**90n,  s: "NoN" },
  { v: 10n**87n,  s: "OcN" }, { v: 10n**84n,  s: "SpN" }, { v: 10n**81n,  s: "SxN" },
  { v: 10n**78n,  s: "QiN" }, { v: 10n**75n,  s: "QaN" }, { v: 10n**72n,  s: "TN" },
  { v: 10n**69n,  s: "BN" },  { v: 10n**66n,  s: "MN" },  { v: 10n**63n,  s: "kN" },
  { v: 10n**60n,  s: "NoDc"}, { v: 10n**57n,  s: "OcDc"}, { v: 10n**54n,  s: "SpDc"},
  { v: 10n**51n,  s: "SxDc"}, { v: 10n**48n,  s: "QiDc"}, { v: 10n**45n,  s: "QaDc"},
  { v: 10n**42n,  s: "TDc" }, { v: 10n**39n,  s: "DDc" }, { v: 10n**36n,  s: "UDc" },
  { v: 10n**33n,  s: "Dc" },  { v: 10n**30n,  s: "No" },  { v: 10n**27n,  s: "Oc" },
  { v: 10n**24n,  s: "Sp" },  { v: 10n**21n,  s: "Sx" },  { v: 10n**18n,  s: "Qi" },
  { v: 10n**15n,  s: "Qa" },  { v: 10n**12n,  s: "T" },   { v: 10n**9n,   s: "B" },
  { v: 10n**6n,   s: "M" },   { v: 10n**3n,   s: "k" }
];

const SFX = {
  k:10n**3n, m:10n**6n, b:10n**9n, t:10n**12n, qa:10n**15n, qi:10n**18n,
  sx:10n**21n, sp:10n**24n, oc:10n**27n, no:10n**30n, dc:10n**33n,
  udc:10n**36n, ddc:10n**39n, tdc:10n**42n, qadc:10n**45n, qidc:10n**48n,
  sxdc:10n**51n, spdc:10n**54n, ocdc:10n**57n, nodc:10n**60n,
  kn:10n**63n, mn:10n**66n, bn:10n**69n, tn:10n**72n, qan:10n**75n, qin:10n**78n,
  sxn:10n**81n, spn:10n**84n, ocn:10n**87n, non:10n**90n, dcn:10n**93n,
  ui:10n**96n, di:10n**99n, ti:10n**102n, qi_i:10n**105n, qii:10n**108n,
  sxi:10n**111n, spi:10n**114n, oci:10n**117n, noi:10n**120n, dci:10n**123n,
  uv:10n**126n, dv:10n**129n, tv:10n**132n, qv:10n**135n, qiv:10n**138n,
  sxv:10n**141n, spv:10n**144n, ocv:10n**147n, nov:10n**150n, dcv:10n**153n,
  ut:10n**156n, dt:10n**159n, tt:10n**162n, qt:10n**165n, qit:10n**168n,
  sxt:10n**171n, spt:10n**174n, oct:10n**177n, not:10n**180n, dct:10n**183n,
  utr:10n**186n, dtr:10n**189n, ttr:10n**192n, qtr:10n**195n, qitr:10n**198n,
  sxtr:10n**201n, sptr:10n**204n, octr:10n**207n, notr:10n**210n, dctr:10n**213n,
  uq:10n**216n, dq:10n**219n, tq:10n**222n, qq:10n**225n, qiq:10n**228n,
  sxq:10n**231n, spq:10n**234n, ocq:10n**237n, noq:10n**240n, dcq:10n**243n,
  uc:10n**246n, du:10n**249n, tu:10n**252n, qu:10n**255n, qiu:10n**258n,
  inf: MAX_LIMIT, infinity: MAX_LIMIT
};

let games         = {};
let tournaments   = {};
let playerStats   = loadStats();
let gameHistory   = loadHistory();
let playerStreaks  = loadStreaks();
let onlineGames   = new Map();
let onlineInvites = new Map();
let groupSelections = new Map();
let groupPages = new Map();
const inviteTimeouts    = new Map();
const playerCache       = new Map();
const imageModeByThread = {};
const spectators        = new Map();
const rematchPending    = new Map();
const aiDifficulty      = new Map();

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

function loadStats() {
  try { if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8") || "{}"); } catch {}
  return {};
}
function saveStats() { try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {} }

function loadHistory() {
  try { if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]"); } catch {}
  return [];
}
function saveHistory() {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(gameHistory.slice(0, 100), null, 2)); } catch {}
}

function loadStreaks() {
  try { if (fs.existsSync(STREAK_FILE)) return JSON.parse(fs.readFileSync(STREAK_FILE, "utf8") || "{}"); } catch {}
  return {};
}
function saveStreaks() { try { fs.writeFileSync(STREAK_FILE, JSON.stringify(playerStreaks, null, 2)); } catch {} }

function loadOnlineGames() {
  try {
    if (fs.existsSync(ONLINE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ONLINE_FILE, "utf8"));
      for (const [k, v] of Object.entries(raw)) onlineGames.set(k, v);
    }
  } catch {}
}
function saveOnlineGames() {
  try {
    const obj = {};
    for (const [k, v] of onlineGames) obj[k] = v;
    fs.writeFileSync(ONLINE_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}
loadOnlineGames();

function loadGroupSelections() {
  try {
    if (fs.existsSync(GROUP_SELECTION_FILE)) {
      const raw = JSON.parse(fs.readFileSync(GROUP_SELECTION_FILE, "utf8"));
      for (const [k, v] of Object.entries(raw)) groupSelections.set(k, v);
    }
  } catch {}
}
function saveGroupSelections() {
  try {
    const obj = {};
    for (const [k, v] of groupSelections) obj[k] = v;
    fs.writeFileSync(GROUP_SELECTION_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}
loadGroupSelections();

function ensurePlayerStats(id) {
  if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, draws: 0, played: 0, totalWon: "0", totalLost: "0" };
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

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
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
        const dec = Number(decPart).toString().padStart(2,"0").slice(0,2).replace(/0+$/,"");
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

function checkWinner(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of wins) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return null;
}

function getWinningLine(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const line of wins) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function isBoardFull(board) { return board.every(c => c !== null); }

function displayBoard(board) {
  let d = "";
  for (let i = 0; i < 9; i++) {
    if (board[i] === "X")      d += "❌";
    else if (board[i] === "O") d += "⭕";
    else                        d += "⬜";
    d += (i + 1) % 3 === 0 ? "\n" : " ";
  }
  return d;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getAvailableMoves(board) { return board.map((v,i) => v === null ? i : -1).filter(i => i !== -1); }

async function loadImageFromUrl(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.facebook.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
    const { loadImage } = require("canvas");
    return await loadImage(Buffer.from(res.data));
  } catch { return null; }
}

async function getPlayerInfo(uid, usersData) {
  if (uid === "AI") {
    const avatar = BOT_UID
      ? await loadImageFromUrl(`https://graph.facebook.com/${BOT_UID}/picture?width=512&height=512&type=large`)
      : null;
    return { avatar, name: BOT_NAME, uid: "AI" };
  }
  const nuid = Number(uid);
  if (isNaN(nuid)) return { avatar: null, name: `Player ${uid}`, uid };
  if (playerCache.has(nuid)) return playerCache.get(nuid);
  const [avatar, name] = await Promise.all([
    loadImageFromUrl(`https://graph.facebook.com/${nuid}/picture?width=512&height=512&type=large`),
    usersData.getName(nuid).catch(() => null)
  ]);
  const info = { avatar, name: name || `Player ${nuid}`, uid: nuid };
  playerCache.set(nuid, info);
  setTimeout(() => playerCache.delete(nuid), 300000);
  return info;
}

function lightenColor(hex, amt) {
  const n = parseInt(hex.replace("#",""), 16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xff)+amt)},${Math.min(255,(n&0xff)+amt)})`;
}

function drawAvatar(ctx, info, cx, cy, radius, borderColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  if (info.avatar) {
    ctx.drawImage(info.avatar, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
    grad.addColorStop(0, lightenColor(borderColor, 60));
    grad.addColorStop(1, borderColor);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.font = `bold ${Math.floor(radius * 0.9)}px Arial`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((info.name || "?")[0].toUpperCase(), cx, cy);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawX(ctx, cx, cy, size, color = "#f87171", alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(8, size * 0.22);
  ctx.lineCap     = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur  = 24;
  ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke();
  ctx.restore();
}

function drawO(ctx, cx, cy, size, color = "#34d399", alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(8, size * 0.22);
  ctx.lineCap     = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur  = 24;
  ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawCellSymbol(ctx, symbol, cx, cy, size, alpha = 1) {
  if (symbol === "X") drawX(ctx, cx, cy, size, "#f87171", alpha);
  else if (symbol === "O") drawO(ctx, cx, cy, size, "#34d399", alpha);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function minimax(board, depth, isMax, aiSym, humanSym, alpha = -Infinity, beta = Infinity) {
  const winner = checkWinner(board);
  if (winner === aiSym)    return 10 - depth;
  if (winner === humanSym) return depth - 10;
  if (isBoardFull(board))  return 0;
  if (depth >= 6)          return 0;
  const moves = getAvailableMoves(board);
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      board[m] = aiSym;
      best = Math.max(best, minimax(board, depth + 1, false, aiSym, humanSym, alpha, beta));
      board[m] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      board[m] = humanSym;
      best = Math.min(best, minimax(board, depth + 1, true, aiSym, humanSym, alpha, beta));
      board[m] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function minimaxMove(board, aiSym, humanSym) {
  const moves = getAvailableMoves(board);
  let best = -Infinity, bestMove = moves[0];
  for (const m of moves) {
    board[m] = aiSym;
    const score = minimax(board, 0, false, aiSym, humanSym);
    board[m] = null;
    if (score > best) { best = score; bestMove = m; }
  }
  return bestMove;
}

async function aiMoveMistral(board, aiSymbol, humanSymbol, difficulty = "normal") {
  const available = getAvailableMoves(board);
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];

  if (difficulty === "facile") {
    if (Math.random() < 0.7) return available[Math.floor(Math.random() * available.length)];
    return minimaxMove([...board], aiSymbol, humanSymbol);
  }
  if (difficulty === "normal") {
    if (Math.random() < 0.2) return available[Math.floor(Math.random() * available.length)];
    return minimaxMove([...board], aiSymbol, humanSymbol);
  }
  return minimaxMove([...board], aiSymbol, humanSymbol);
}

function resetGame(gameID, p1, p2, opts = {}) {
  const imageMode = opts.imageMode !== undefined ? opts.imageMode : imageModeByThread[opts.threadID] || false;
  games[gameID] = {
    board: Array(9).fill(null),
    players: [
      { id: p1.id, name: p1.name || `Player ${p1.id}`, symbol: "X" },
      { id: p2.id, name: p2.name || `Player ${p2.id}`, symbol: "O" }
    ],
    currentPlayerIndex: 0,
    inProgress: true,
    isMathChallenge: false,
    threadID: opts.threadID || p1.threadID || null,
    partnerThreadID: opts.partnerThreadID || null,
    isTournamentGame: !!opts.isTournamentGame,
    tournamentID: opts.tournamentID || null,
    matchIndex: opts.matchIndex != null ? opts.matchIndex : null,
    isAI: !!opts.isAI,
    aiDifficulty: opts.aiDifficulty || "normal",
    isOnline: !!opts.isOnline,
    imageMode,
    moves: [],
    bets: opts.bets || null,
    odds: opts.odds || null,
    startTime: Date.now(),
    lastMoveTime: Date.now()
  };
}

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal", bets = null, odds = null, winLine = null) {
  const W = 1400, H = 1060;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(0.5, "#0f0d20"); bg.addColorStop(1, "#070515");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  const modeColor = { tournament: "#fbbf24", online: "#06b6d4", normal: "#818cf8" }[gameType] || "#818cf8";
  const modeLabel = { tournament: "TOURNAMENT", online: "ONLINE", normal: "NORMAL" }[gameType] || "NORMAL";
  ctx.font = "bold 44px Arial"; ctx.fillStyle = modeColor; ctx.textAlign = "center";
  ctx.shadowColor = modeColor; ctx.shadowBlur = 16;
  ctx.fillText(`ULTIMATE TICTACTOE — ${modeLabel}`, W / 2, 68);
  ctx.shadowBlur = 0;

  const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

  const BOARD_SIZE = 540;
  const bx = W / 2 - BOARD_SIZE / 2;
  const by = 130;

  ctx.fillStyle = "rgba(15,12,35,0.85)";
  roundRect(ctx, bx - 18, by - 18, BOARD_SIZE + 36, BOARD_SIZE + 36, 20); ctx.fill();
  ctx.strokeStyle = "rgba(129,140,248,0.5)"; ctx.lineWidth = 2.5; ctx.stroke();

  ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo(bx + (BOARD_SIZE / 3) * i, by); ctx.lineTo(bx + (BOARD_SIZE / 3) * i, by + BOARD_SIZE);
    ctx.moveTo(bx, by + (BOARD_SIZE / 3) * i); ctx.lineTo(bx + BOARD_SIZE, by + (BOARD_SIZE / 3) * i);
  }
  ctx.stroke();

  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const cx  = bx + col * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    const cy  = by + row * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    const isWinCell = winLine?.includes(i);

    if (isWinCell) {
      ctx.fillStyle = "rgba(251,191,36,0.12)";
      roundRect(ctx, bx + col * (BOARD_SIZE / 3) + 4, by + row * (BOARD_SIZE / 3) + 4, BOARD_SIZE / 3 - 8, BOARD_SIZE / 3 - 8, 10);
      ctx.fill();
    }

    if (board[i] !== null) {
      drawCellSymbol(ctx, board[i], cx, cy, 78, isWinCell ? 1 : 0.95);
      if (isWinCell) {
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        roundRect(ctx, bx + col * (BOARD_SIZE / 3) + 4, by + row * (BOARD_SIZE / 3) + 4, BOARD_SIZE / 3 - 8, BOARD_SIZE / 3 - 8, 10);
        ctx.stroke();
      }
    } else {
      ctx.font = "bold 28px Arial"; ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), cx, cy); ctx.textBaseline = "alphabetic";
    }
  }

  if (winLine && winLine.length === 3) {
    const getCellCenter = (idx) => {
      const r = Math.floor(idx / 3), c = idx % 3;
      return { x: bx + c * (BOARD_SIZE / 3) + BOARD_SIZE / 6, y: by + r * (BOARD_SIZE / 3) + BOARD_SIZE / 6 };
    };
    const c1 = getCellCenter(winLine[0]), c3 = getCellCenter(winLine[2]);
    ctx.save();
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 30; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c3.x, c3.y); ctx.stroke();
    ctx.restore();
  }

  const PANEL_W = 320, PANEL_H = 480;
  for (let i = 0; i < 2; i++) {
    const info      = playerInfos[i];
    const pdata     = players[i];
    const isCurrent = currentPlayer?.id === pdata.id;
    const px        = i === 0 ? 55 : W - PANEL_W - 55;
    const py        = 120;
    const symColor  = pdata.symbol === "X" ? "#f87171" : "#34d399";

    const panelG = ctx.createLinearGradient(px, py, px, py + PANEL_H);
    panelG.addColorStop(0, isCurrent ? "rgba(99,102,241,0.22)" : "rgba(20,18,45,0.7)");
    panelG.addColorStop(1, isCurrent ? "rgba(99,102,241,0.08)" : "rgba(10,8,25,0.7)");
    ctx.fillStyle = panelG;
    roundRect(ctx, px, py, PANEL_W, PANEL_H, 24); ctx.fill();
    ctx.strokeStyle = isCurrent ? "#818cf8" : "rgba(255,255,255,0.12)";
    ctx.lineWidth   = isCurrent ? 2.5 : 1.5; ctx.stroke();

    drawAvatar(ctx, info, px + PANEL_W / 2, py + 100, 70, symColor);

    ctx.font = "bold 24px Arial"; ctx.fillStyle = isCurrent ? "#e0e7ff" : "#9ca3af"; ctx.textAlign = "center";
    ctx.fillText(info.name.substring(0, 18), px + PANEL_W / 2, py + 200);

    if (pdata.symbol === "X") drawX(ctx, px + PANEL_W / 2, py + 258, 28);
    else drawO(ctx, px + PANEL_W / 2, py + 258, 28);

    const stats = playerStats[pdata.id];
    if (stats) {
      const wr = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;
      ctx.font = "14px Arial"; ctx.fillStyle = "#6b7280";
      ctx.fillText(`${stats.wins}V/${stats.losses}D | ${wr}%`, px + PANEL_W / 2, py + 300);
      const streak = playerStreaks[pdata.id];
      if (streak?.current >= 2) {
        ctx.font = "bold 14px Arial"; ctx.fillStyle = "#f59e0b";
        ctx.fillText(`Streak ${streak.current}`, px + PANEL_W / 2, py + 322);
      }
    }

    if (bets) {
      const betAmt = bets?.[pdata.id];
      const odd    = odds?.[pdata.id];
      if (betAmt !== undefined) {
        ctx.font = "bold 16px Arial"; ctx.fillStyle = "#fbbf24";
        ctx.fillText(`Mise: ${await formatNumber(toBigInt(betAmt))}$`, px + PANEL_W / 2, py + 348);
        if (odd) {
          ctx.fillStyle = "#86efac";
          ctx.fillText(`Cote: x${odd}`, px + PANEL_W / 2, py + 372);
          ctx.fillStyle = "#c4b5fd";
          ctx.fillText(`Gain: ${await formatNumber(toBigInt(Math.floor(Number(toBigInt(betAmt)) * odd)))}$`, px + PANEL_W / 2, py + 396);
        } else {
          const totalPot = Object.values(bets).reduce((s, b) => s + toBigInt(b), 0n);
          ctx.fillStyle = "#c4b5fd";
          ctx.fillText(`Pot total: ${await formatNumber(totalPot)}$`, px + PANEL_W / 2, py + 372);
        }
      }
    }

    if (isCurrent && !winLine) {
      ctx.font = "bold 20px Arial"; ctx.fillStyle = "#818cf8";
      ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 10;
      ctx.fillText("TON TOUR", px + PANEL_W / 2, py + PANEL_H - 30);
      ctx.shadowBlur = 0;
    }
  }

  if (currentPlayer && !winLine) {
    ctx.font = "bold 32px Arial"; ctx.fillStyle = "#e0e7ff"; ctx.textAlign = "center";
    ctx.fillText(`Tour: ${currentPlayer.name}`, W / 2, by + BOARD_SIZE + 52);
    const avail = board.map((c,idx) => c === null ? idx + 1 : null).filter(Boolean);
    ctx.font = "20px Arial"; ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`Disponibles: ${avail.join(" · ")}`, W / 2, by + BOARD_SIZE + 86);
  }

  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(129,140,248,0.3)"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE v17", W / 2, H - 12);
  return canvas.toBuffer("image/png");
}

async function generateEndGameImage(board, winner, players, usersData, isDraw, gainInfo = null, winLine = null) {
  const W = 1400, H = 1000;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, isDraw ? "#050d18" : "#06100a"); bg.addColorStop(1, "#07050f");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  const borderG = ctx.createLinearGradient(0, 0, W, H);
  borderG.addColorStop(0, isDraw ? "#60a5fa" : "#34d399");
  borderG.addColorStop(1, isDraw ? "#3b82f6" : "#fbbf24");
  ctx.strokeStyle = borderG; ctx.lineWidth = 3;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();

  const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

  const BOARD_SIZE = 460;
  const bx = W / 2 - BOARD_SIZE / 2;
  const by = 100;

  ctx.fillStyle = "rgba(10,8,25,0.85)";
  roundRect(ctx, bx - 16, by - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 18); ctx.fill();
  ctx.strokeStyle = isDraw ? "#60a5fa" : "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();

  ctx.strokeStyle = isDraw ? "#60a5fa" : "#fbbf24"; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo(bx + (BOARD_SIZE / 3) * i, by); ctx.lineTo(bx + (BOARD_SIZE / 3) * i, by + BOARD_SIZE);
    ctx.moveTo(bx, by + (BOARD_SIZE / 3) * i); ctx.lineTo(bx + BOARD_SIZE, by + (BOARD_SIZE / 3) * i);
  }
  ctx.stroke();

  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const cx = bx + col * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    const cy = by + row * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    if (board[i] !== null) drawCellSymbol(ctx, board[i], cx, cy, 66);
  }

  if (winLine && winLine.length === 3 && !isDraw) {
    const getCtr = (idx) => {
      const r = Math.floor(idx / 3), c = idx % 3;
      return { x: bx + c * (BOARD_SIZE / 3) + BOARD_SIZE / 6, y: by + r * (BOARD_SIZE / 3) + BOARD_SIZE / 6 };
    };
    const c1 = getCtr(winLine[0]), c3 = getCtr(winLine[2]);
    ctx.save();
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 30; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c3.x, c3.y); ctx.stroke();
    ctx.restore();
  }

  const PANEL_W = 300, PANEL_H = 180;
  for (let i = 0; i < 2; i++) {
    const info     = playerInfos[i];
    const pdata    = players[i];
    const isWin    = winner?.id === pdata.id;
    const px       = i === 0 ? 80 : W - PANEL_W - 80;
    const py       = by + BOARD_SIZE + 55;
    const symColor = pdata.symbol === "X" ? "#f87171" : "#34d399";

    ctx.fillStyle = isWin ? "rgba(251,191,36,0.18)" : "rgba(20,18,45,0.7)";
    roundRect(ctx, px, py, PANEL_W, PANEL_H, 18); ctx.fill();
    ctx.strokeStyle = isWin ? "#fbbf24" : "rgba(255,255,255,0.12)";
    ctx.lineWidth   = isWin ? 2.5 : 1.5; ctx.stroke();

    drawAvatar(ctx, info, px + 55, py + PANEL_H / 2, 44, symColor);

    ctx.font = "bold 22px Arial"; ctx.fillStyle = isWin ? "#fbbf24" : "#e0e7ff"; ctx.textAlign = "left";
    ctx.fillText(info.name.substring(0, 16), px + 112, py + 48);
    if (pdata.symbol === "X") drawX(ctx, px + 130, py + 90, 16);
    else drawO(ctx, px + 130, py + 90, 16);
    if (isWin) {
      ctx.font = "bold 20px Arial"; ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 10;
      ctx.fillText("GAGNANT", px + 112, py + 138); ctx.shadowBlur = 0;
    }
  }

  const resultY = by + BOARD_SIZE + 30;
  ctx.font = "bold 56px Arial"; ctx.textAlign = "center";
  ctx.fillStyle   = isDraw ? "#60a5fa" : "#fbbf24";
  ctx.shadowColor = isDraw ? "#60a5fa" : "#fbbf24"; ctx.shadowBlur = 24;
  ctx.fillText(isDraw ? "MATCH NUL" : "VICTOIRE", W / 2, resultY);
  if (!isDraw && winner) { ctx.font = "bold 38px Arial"; ctx.fillText(winner.name, W / 2, resultY + 52); }
  ctx.shadowBlur = 0;

  if (gainInfo) {
    const gainY = by + BOARD_SIZE + 265;
    ctx.fillStyle = "rgba(16,185,129,0.12)";
    roundRect(ctx, W / 2 - 340, gainY - 30, 680, 120, 14); ctx.fill();
    ctx.strokeStyle = "rgba(16,185,129,0.4)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = "bold 20px Arial"; ctx.fillStyle = "#6ee7b7"; ctx.textAlign = "center";
    ctx.fillText(gainInfo.line1, W / 2, gainY + 10);
    ctx.font = "bold 26px Arial"; ctx.fillStyle = "#fbbf24";
    ctx.fillText(gainInfo.line2, W / 2, gainY + 50);
    ctx.font = "18px Arial"; ctx.fillStyle = "#c4b5fd";
    ctx.fillText(gainInfo.line3, W / 2, gainY + 82);
  }

  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(129,140,248,0.3)"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE v17", W / 2, H - 14);
  return canvas.toBuffer("image/png");
}

async function generateStatsImage(pid, usersData) {
  const W = 1400, H = 960;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(1, "#0f0d20");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);
  ctx.strokeStyle = "rgba(129,140,248,0.3)"; ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();

  const info   = await getPlayerInfo(pid, usersData);
  const stats  = playerStats[pid] || { wins: 0, losses: 0, draws: 0, played: 0 };
  const streak = playerStreaks[pid] || { current: 0, best: 0 };
  const wr     = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;

  ctx.font = "bold 56px Arial"; ctx.fillStyle = "#818cf8"; ctx.textAlign = "center";
  ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 20;
  ctx.fillText("TICTACTOE STATS", W / 2, 90); ctx.shadowBlur = 0;

  drawAvatar(ctx, info, W / 2, 300, 110, "#818cf8");
  ctx.font = "bold 44px Arial"; ctx.fillStyle = "#e0e7ff"; ctx.textAlign = "center";
  ctx.fillText(info.name, W / 2, 480);

  const items = [
    { label: "Victoires", val: stats.wins,   color: "#34d399" },
    { label: "Defaites",  val: stats.losses, color: "#f87171" },
    { label: "Nuls",      val: stats.draws,  color: "#60a5fa" },
    { label: "Parties",   val: stats.played, color: "#fbbf24" }
  ];
  const colW2 = (W - 120) / 4, sy = 540;
  for (let i = 0; i < items.length; i++) {
    const cx = 60 + i * colW2;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, cx + 4, sy - 18, colW2 - 8, 80, 10); ctx.fill();
    ctx.strokeStyle = items[i].color + "55"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = "16px Arial"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
    ctx.fillText(items[i].label, cx + colW2 / 2, sy + 10);
    ctx.font = "bold 32px Arial"; ctx.fillStyle = items[i].color;
    ctx.fillText(String(items[i].val), cx + colW2 / 2, sy + 52);
  }

  const barY = 670, barW = W - 120;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 60, barY, barW, 18, 9); ctx.fill();
  if (stats.played > 0) {
    const pct  = stats.wins / stats.played;
    const barG = ctx.createLinearGradient(60, 0, 60 + barW * pct, 0);
    barG.addColorStop(0, "#34d399"); barG.addColorStop(1, "#10b981");
    ctx.fillStyle = barG;
    roundRect(ctx, 60, barY, Math.max(barW * pct, 12), 18, 9); ctx.fill();
  }
  ctx.font = "16px Arial"; ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.textAlign = "left";
  ctx.fillText(`WIN RATE: ${wr}%`, 60, barY - 8);

  ctx.fillStyle = "rgba(245,158,11,0.12)";
  roundRect(ctx, 60, 720, barW, 80, 12); ctx.fill();
  ctx.strokeStyle = "rgba(245,158,11,0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = "bold 22px Arial"; ctx.fillStyle = "#f59e0b"; ctx.textAlign = "center";
  ctx.fillText(`Streak actuel: ${streak.current}   Meilleur streak: ${streak.best}`, W / 2, 768);

  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(129,140,248,0.3)"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE v17", W / 2, H - 14);
  return canvas.toBuffer("image/png");
}

function getTournamentStatus(t) {
  return { registration: "INSCRIPTION", in_progress: "EN COURS", completed: "TERMINE" }[t.status] || "INCONNU";
}

async function sendImage(api, threadID, buffer, text = "") {
  if (!buffer) return;
  const fp = path.join(ASSETS_DIR, `ttt_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
  await fs.writeFile(fp, buffer);
  await new Promise((resolve, reject) => {
    api.sendMessage({ body: text, attachment: fs.createReadStream(fp) }, threadID, (err) => {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
      err ? reject(err) : resolve();
    });
  });
}

function findAnyActiveGame(uid) {
  const active = Object.keys(games).find(id =>
    games[id].players.some(p => p.id === uid) && games[id].inProgress
  );
  if (active) return { type: "active", gameID: active, game: games[active] };
  return null;
}

function notifySpectators(gameID, api, usersData) {
  const list = spectators.get(gameID);
  if (!list?.length) return;
  const game = games[gameID];
  if (!game) return;
  for (const { uid, threadID } of list) {
    generateBoardImage(game.board, game.players[game.currentPlayerIndex], game.players, usersData, "normal", game.bets, game.odds)
      .then(img => sendImage(api, threadID, img, `[Spectateur] Tour: ${game.players[game.currentPlayerIndex].name}`))
      .catch(() => {});
  }
}

async function sendToThread(api, threadID, game, body, usersData, asPlayerUID = null) {
  if (game.imageMode) {
    const playerForInfo = asPlayerUID
      ? game.players.find(p => p.id === asPlayerUID) || game.players[game.currentPlayerIndex]
      : game.players[game.currentPlayerIndex];
    const img = await generateBoardImage(
      game.board,
      game.players[game.currentPlayerIndex],
      game.players,
      usersData,
      game.isOnline ? "online" : game.isTournamentGame ? "tournament" : "normal",
      game.bets, game.odds
    );
    if (img) await sendImage(api, threadID, img, body);
  } else {
    await api.sendMessage(`${body}\n${displayBoard(game.board)}\n${UI([`Tour: ${game.players[game.currentPlayerIndex].name}`])}`, threadID);
  }
}

async function applyAIMove(gameID, api, usersData) {
  const game = games[gameID];
  if (!game?.inProgress || !game.isAI) return;
  const aiIdx = game.players.findIndex(p => p.id === "AI");
  if (aiIdx === -1 || game.currentPlayerIndex !== aiIdx) return;
  const aiSym    = game.players[aiIdx].symbol;
  const humanSym = game.players[1 - aiIdx].symbol;
  const diff     = game.aiDifficulty || aiDifficulty.get(game.players[1 - aiIdx].id) || "normal";
  const pos      = await aiMoveMistral(game.board, aiSym, humanSym, diff);
  if (pos === null) return;

  game.board[pos] = aiSym;
  game.moves.push({ player: "AI", position: pos, board: [...game.board], time: Date.now() });

  const winner = checkWinner(game.board);
  const isDraw = isBoardFull(game.board);
  if (winner || isDraw) return handleGameEnd(gameID, api, { threadID: game.threadID, senderID: "AI" }, usersData);

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
  const next = game.players[game.currentPlayerIndex];

  if (game.imageMode) {
    const img = await generateBoardImage(game.board, next, game.players, usersData, "normal", game.bets, game.odds);
    if (img) await sendImage(api, game.threadID, img, `Tour: ${next.name}`);
  } else {
    await api.sendMessage(UI([displayBoard(game.board), "---", `Tour: ${next.name}`]), game.threadID);
  }
  notifySpectators(gameID, api, usersData);
}

async function handleGameEnd(gameID, api, event, usersData) {
  const game = games[gameID];
  if (!game) return;
  const winnerSym = checkWinner(game.board);
  const isDraw    = isBoardFull(game.board) && !winnerSym;
  const winLine   = winnerSym ? getWinningLine(game.board) : null;
  let gainInfo    = null;
  const duration  = Math.floor((Date.now() - game.startTime) / 1000);

  if (winnerSym) {
    const winner = game.players.find(p => p.symbol === winnerSym);
    const loser  = game.players.find(p => p.symbol !== winnerSym);

    ensurePlayerStats(winner.id); ensurePlayerStats(loser.id);
    playerStats[winner.id].wins++;  playerStats[winner.id].played++;
    playerStats[loser.id].losses++; playerStats[loser.id].played++;
    updateStreak(winner.id, true); updateStreak(loser.id, false);
    saveStats();

    if (game.bets) {
      const totalPot = Object.values(game.bets).reduce((s, b) => s + toBigInt(b), 0n);
      await updateUserCash(winner.id, totalPot);
      gainInfo = {
        line1: `${winner.name} gagne !`,
        line2: `+${await formatNumber(totalPot)}$ (pot total)`,
        line3: `${loser.name} perd ${await formatNumber(toBigInt(game.bets[loser.id] || 0n))}$`
      };
    }

    addHistory({ players: game.players.map(p => p.id), winner: winner.id, isDraw: false, isAI: game.isAI, isOnline: game.isOnline || false, bets: game.bets || null, moves: game.moves.length, duration });

    const streak    = playerStreaks[winner.id]?.current || 0;
    const streakMsg = streak >= 3 ? ` | Streak ${streak} !` : "";

    if (game.imageMode) {
      const img = await generateEndGameImage(game.board, winner, game.players, usersData, false, gainInfo, winLine);
      if (img) await sendImage(api, game.threadID, img, `${winner.name} gagne !${streakMsg}`);
    } else {
      let txt = UI([displayBoard(game.board), "---", `${winner.name} gagne !${streakMsg}`]);
      if (gainInfo) txt += `\n${gainInfo.line1}\n${gainInfo.line2}\n${gainInfo.line3}`;
      await api.sendMessage(txt, game.threadID);
    }

    if (game.isOnline && game.partnerThreadID) {
      const partnerWon = winner.id !== game.players[0].id ? game.players[1].id : game.players[0].id;
      try {
        const partnerEndImg = game.imageMode
          ? await generateEndGameImage(game.board, winner, game.players, usersData, false, gainInfo, winLine)
          : null;
        if (partnerEndImg) await sendImage(api, game.partnerThreadID, partnerEndImg, `${winner.name} gagne !${streakMsg}`);
        else await api.sendMessage(UI([`${winner.name} a gagne !`, gainInfo ? gainInfo.line2 : ""]), game.partnerThreadID);
      } catch {}
    }

    game.inProgress = false;
    spectators.delete(gameID);
    rematchPending.delete(gameID);

    if (game.isTournamentGame && tournaments[game.tournamentID]) {
      const T = tournaments[game.tournamentID];
      const round = T.rounds[T.currentRoundIndex];
      const match = round.matches[game.matchIndex];
      if (match) { match.winner = winner.id; match.completed = true; }
      const doneAll = round.matches.every(m => m.completed);
      if (doneAll) {
        if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, game.threadID, bi); }
        await advanceTournamentRound(game.tournamentID, api, usersData);
      } else await initiateNextMatch(game.tournamentID, api, usersData);
    } else {
      await api.sendMessage(`Tape "rematch" pour une revanche ou "restart" pour rejouer.`, game.threadID);
    }

  } else if (isDraw) {
    game.players.forEach(p => { ensurePlayerStats(p.id); playerStats[p.id].draws++; playerStats[p.id].played++; });
    saveStats();

    if (game.bets && !game.isAI) {
      for (const pl of game.players) { const b = toBigInt(game.bets[pl.id] || 0n); if (b > 0n) await updateUserCash(pl.id, b); }
      gainInfo = { line1: "Match nul — mises remboursees", line2: "Chaque joueur recupere sa mise", line3: "" };
    } else if (game.bets && game.isAI) {
      const humanId = game.players.find(p => p.id !== "AI")?.id;
      if (humanId) { const b = toBigInt(game.bets[humanId] || 0n); if (b > 0n) await updateUserCash(humanId, b); gainInfo = { line1: "Match nul vs IA — mise remboursee", line2: "", line3: "" }; }
    }

    addHistory({ players: game.players.map(p => p.id), winner: null, isDraw: true, isAI: game.isAI, isOnline: game.isOnline || false, bets: game.bets || null, moves: game.moves.length, duration });

    if (game.isTournamentGame && tournaments[game.tournamentID]) {
      const T = tournaments[game.tournamentID];
      const round = T.rounds[T.currentRoundIndex];
      const match = round.matches[game.matchIndex];
      match.drawCount = (match.drawCount || 0) + 1;
      if (match.drawCount >= 3) {
        game.inProgress = true; game.isMathChallenge = true;
        await api.sendMessage(UI(["3 MATCHS NULS !", "EPREUVE DE MATHS", "---", "Resoudre: sqrt(7+sqrt(48))^2024 * sqrt(7-sqrt(48))^2024 + 1", "---", "Premiere bonne reponse gagne !"]), game.threadID);
      } else {
        await api.sendMessage(UI([`MATCH NUL (${match.drawCount}/3)`, "Revanche !"]), game.threadID);
        resetGame(gameID, game.players[0], game.players[1], { isTournamentGame: true, tournamentID: game.tournamentID, matchIndex: game.matchIndex, threadID: game.threadID, imageMode: game.imageMode });
        if (game.imageMode) {
          const bi = await generateBoardImage(games[gameID].board, games[gameID].players[0], games[gameID].players, usersData, "tournament");
          await sendImage(api, game.threadID, bi, `Revanche ! ${games[gameID].players[0].name}, a toi !`);
        } else {
          await api.sendMessage(`Revanche ! ${games[gameID].players[0].name}, a toi !`, game.threadID);
        }
      }
    } else {
      if (game.imageMode) {
        const img = await generateEndGameImage(game.board, null, game.players, usersData, true, gainInfo);
        if (img) {
          await sendImage(api, game.threadID, img);
          if (game.isOnline && game.partnerThreadID) {
            try { await sendImage(api, game.partnerThreadID, img, "Match nul !"); } catch {}
          }
        }
      } else {
        let txt = UI([displayBoard(game.board), "---", "Match nul !"]);
        if (gainInfo) txt += `\n${gainInfo.line1}`;
        await api.sendMessage(txt, game.threadID);
        if (game.isOnline && game.partnerThreadID) {
          try { await api.sendMessage(txt, game.partnerThreadID); } catch {}
        }
      }
      game.inProgress = false;
      spectators.delete(gameID);
      await api.sendMessage(`Tape "rematch" ou "restart" pour rejouer.`, game.threadID);
    }
  }
  game.restartPrompted = true;
}

function createTournament(threadID) {
  tournaments[threadID] = { id: threadID, players: [], status: "registration", rounds: [], currentRoundIndex: -1, winner: null, threadID, requiredPlayers: 4, imageMode: imageModeByThread[threadID] || false };
  return tournaments[threadID];
}

async function generateTournamentBracketImage(tournament, usersData) {
  const W = 2000, H = 1600;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(1, "#0f0d20");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  ctx.font = "bold 64px Arial"; ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
  ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 28;
  ctx.fillText("TOURNOI ELITE — TABLEAU", W / 2, 90); ctx.shadowBlur = 0;
  ctx.font = "bold 32px Arial"; ctx.fillStyle = "#e0e7ff";
  ctx.fillText(`Statut: ${getTournamentStatus(tournament)}`, W / 2, 148);

  if (tournament.status === "registration") {
    ctx.font = "bold 52px Arial"; ctx.fillStyle = "#818cf8";
    ctx.fillText("EN ATTENTE DES JOUEURS", W / 2, H / 2 - 100);
    ctx.font = "bold 38px Arial"; ctx.fillStyle = "#9ca3af";
    ctx.fillText(`Inscrits: ${tournament.players.length} / ${tournament.requiredPlayers}`, W / 2, H / 2);
    let yList = H / 2 + 80; ctx.font = "28px Arial"; ctx.fillStyle = "#e0e7ff";
    tournament.players.forEach((p, i) => ctx.fillText(`${i+1}. ${p.name}`, W / 2, yList + i * 44));
    return canvas.toBuffer("image/png");
  }

  const roundCount = tournament.rounds.length;
  const colW       = (W - 200) / roundCount;
  const positions  = {};

  for (let r = 0; r < roundCount; r++) {
    const round = tournament.rounds[r];
    const x     = 100 + r * colW;
    ctx.font = "bold 34px Arial"; ctx.fillStyle = r === tournament.currentRoundIndex ? "#fbbf24" : "#818cf8";
    ctx.textAlign = "center"; ctx.fillText(round.name.toUpperCase(), x + 150, 220);
    positions[r] = [];
    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      let y;
      if (r === 0) { const spacing = (H - 340) / round.matches.length; y = 340 + m * spacing + spacing / 2 - 55; }
      else { const p1 = positions[r-1][m*2], p2 = positions[r-1][m*2+1]; y = (p1 && p2) ? (p1.y + p2.y) / 2 : 340 + m * 200; }
      positions[r].push({ x, y });
      const p1 = tournament.players.find(p => p.id === match.player1);
      const p2 = tournament.players.find(p => p.id === match.player2);
      const bW = 300, bH = 110;
      if (r > 0) {
        const pa1 = positions[r-1][m*2], pa2 = positions[r-1][m*2+1];
        ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 2; ctx.beginPath();
        if (pa1) { ctx.moveTo(pa1.x + bW, pa1.y + bH/2); ctx.lineTo(x, y + bH/2); }
        if (pa2) { ctx.moveTo(pa2.x + bW, pa2.y + bH/2); ctx.lineTo(x, y + bH/2); }
        ctx.stroke();
      }
      ctx.fillStyle = match.completed ? "rgba(16,18,45,0.9)" : "rgba(20,18,50,0.8)";
      roundRect(ctx, x, y, bW, bH, 12); ctx.fill();
      ctx.strokeStyle = match.completed ? (match.winner ? "#34d399" : "#fbbf24") : "#818cf8";
      ctx.lineWidth = 3; ctx.stroke();
      ctx.font = "bold 22px Arial"; ctx.textAlign = "left";
      ctx.fillStyle = match.winner === match.player1 ? "#34d399" : "#e0e7ff";
      ctx.fillText((p1?.name || "???").substring(0, 14), x + 14, y + 38);
      ctx.fillStyle = match.winner === match.player2 ? "#34d399" : "#e0e7ff";
      ctx.fillText((p2?.name || "???").substring(0, 14), x + 14, y + 82);
      if (match.completed && match.winner) {
        ctx.font = "22px Arial"; ctx.fillStyle = "#fbbf24";
        ctx.fillText("GAGNANT", x + 240, match.winner === match.player1 ? y + 38 : y + 82);
      }
    }
  }

  if (tournament.winner) {
    const w = tournament.players.find(p => p.id === tournament.winner);
    ctx.font = "bold 64px Arial"; ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 36;
    ctx.fillText(`CHAMPION: ${w?.name || "Champion"}`, W / 2, H - 80); ctx.shadowBlur = 0;
  }
  return canvas.toBuffer("image/png");
}

function generateTournamentBracketText(T) {
  let t = UI([`TOURNOI TICTACTOE`, "---", `Statut: ${getTournamentStatus(T)}`, `Joueurs: ${T.players.length}/${T.requiredPlayers}`]);
  T.players.forEach((p, i) => { t += `\n│ ${i+1}. ${p.name}`; });
  if (T.status !== "registration" && T.rounds.length > 0) {
    t += `\n├─────────────────────•\n│ Rounds:`;
    T.rounds.forEach(r => { t += `\n│   ${r.name}: ${r.matches.filter(m=>m.completed).length}/${r.matches.length}`; });
    const cr = T.rounds[T.currentRoundIndex];
    if (cr) {
      t += `\n├─────────────────────•\n│ En cours: ${cr.name}`;
      cr.matches.forEach((m, i) => {
        const p1 = T.players.find(p => p.id === m.player1), p2 = T.players.find(p => p.id === m.player2);
        const s  = m.completed ? (m.winner ? `GAGNANT ${T.players.find(p => p.id === m.winner)?.name}` : "NUL") : "EN ATTENTE";
        t += `\n│ Match ${i+1}: ${p1?.name||"??"} vs ${p2?.name||"??"} → ${s}`;
      });
    }
  }
  if (T.status === "completed" && T.winner) t += `\n├─────────────────────•\n│ CHAMPION: ${T.players.find(p => p.id === T.winner)?.name||"?"}`;
  return t + "\n╰─────────────────────•";
}

async function startTournament(tournamentID, api, usersData) {
  const T   = tournaments[tournamentID];
  if (!T) return;
  const num = T.players.length;
  if (![4,8,16].includes(num)) return api.sendMessage(UI([`Il faut 4, 8 ou 16 joueurs. Actuel: ${num}`]), T.threadID);
  T.status = "in_progress"; shuffleArray(T.players);
  let rounds = [];
  if (num === 16) rounds = [{ name:"Huitiemes",matches:[] },{ name:"Quarts",matches:[] },{ name:"Demi-finales",matches:[] },{ name:"Finale",matches:[] }];
  else if (num === 8) rounds = [{ name:"Quarts",matches:[] },{ name:"Demi-finales",matches:[] },{ name:"Finale",matches:[] }];
  else rounds = [{ name:"Demi-finales",matches:[] },{ name:"Finale",matches:[] }];
  T.rounds = rounds; T.currentRoundIndex = 0; T.winner = null;
  const m0 = [];
  for (let i = 0; i < num; i += 2) m0.push({ player1:T.players[i].id, player2:T.players[i+1].id, winner:null, completed:false, gameID:null, drawCount:0 });
  T.rounds[0].matches = m0;
  if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, UI(["Le tournoi commence !"])); }
  else await api.sendMessage(generateTournamentBracketText(T), T.threadID);
  await initiateNextMatch(tournamentID, api, usersData);
}

async function initiateNextMatch(tournamentID, api, usersData) {
  const T = tournaments[tournamentID];
  if (!T) return;
  const round = T.rounds[T.currentRoundIndex];
  const idx   = round.matches.findIndex(m => !m.completed && m.gameID === null);
  if (idx === -1) return;
  const match = round.matches[idx];
  const p1    = T.players.find(p => p.id === match.player1);
  const p2    = T.players.find(p => p.id === match.player2);
  if (!p1 || !p2) { await api.sendMessage("Joueur introuvable.", T.threadID); return; }
  const i1  = await getPlayerInfo(p1.id, usersData);
  const i2  = await getPlayerInfo(p2.id, usersData);
  const gID = `${T.threadID}:tournament:${T.id}:${T.currentRoundIndex}:${idx}`;
  resetGame(gID, { id:p1.id, name:i1.name, threadID:T.threadID }, { id:p2.id, name:i2.name, threadID:T.threadID },
    { isTournamentGame:true, tournamentID, matchIndex:idx, threadID:T.threadID, imageMode:T.imageMode });
  round.matches[idx].gameID = gID;
  if (T.imageMode) {
    const bi = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "tournament");
    await sendImage(api, T.threadID, bi, UI([`${round.name} — Match ${idx+1}`, `${i1.name} vs ${i2.name}`]));
  } else {
    await api.sendMessage(UI([`${round.name} — Match ${idx+1}`, `${i1.name} (X) vs ${i2.name} (O)`, "---", displayBoard(games[gID].board), "---", `${i1.name}, a toi (1-9).`]), T.threadID);
  }
}

async function advanceTournamentRound(tournamentID, api, usersData) {
  const T = tournaments[tournamentID];
  if (!T) return;
  const round   = T.rounds[T.currentRoundIndex];
  const winners = round.matches.map(m => m.winner).filter(Boolean);
  if (winners.length !== round.matches.length) { await api.sendMessage("Des matchs sont encore en cours.", T.threadID); return; }
  if (T.currentRoundIndex === T.rounds.length - 1) {
    T.winner = winners[0]; T.status = "completed";
    const ci = await getPlayerInfo(T.winner, usersData);
    if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, UI(["TOURNOI TERMINE !", "---", `CHAMPION: ${ci.name}`])); }
    else await api.sendMessage(UI(["TOURNOI TERMINE !", "---", `CHAMPION: ${ci.name}`]), T.threadID);
    delete tournaments[tournamentID]; return;
  }
  T.currentRoundIndex++;
  const nr = T.rounds[T.currentRoundIndex];
  nr.matches = [];
  for (let i = 0; i < winners.length; i += 2)
    nr.matches.push({ player1:winners[i], player2:winners[i+1], winner:null, completed:false, gameID:null, drawCount:0 });
  if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, `Round ${nr.name.toUpperCase()} !`); }
  else await api.sendMessage(`Round ${nr.name.toUpperCase()} !`, T.threadID);
  await initiateNextMatch(tournamentID, api, usersData);
}

module.exports = {
  config: {
    name:             "tictactoe",
    aliases:          ["ttt", "morpion"],
    version:          "17.0",
    author:           "Ismael03-Dev",
    category:         "game",
    shortDescription: { en: "TicTacToe Ultimate v17 — Group list, online bets, avatars, streaks" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const p        = global.utils.getPrefix(threadID);
    ensurePlayerStats(senderID);

    const sub  = (args[0] || "").toLowerCase();
    const sub2 = (args[1] || "").toLowerCase();

    if (!sub || sub === "help") return api.sendMessage(UI([
      "ULTIMATE TICTACTOE v17", "---",
      `${p}ttt @joueur <mise> [cote]`,
      `${p}ttt ai <mise> [cote] [diff]`,
      `${p}ttt online <user_id> <group_id> <mise>`,
      `${p}ttt group`,
      "---",
      "AI diff: facile/normal/impossible",
      "Cote: 1-20 | Match nul: rembourse",
      "---",
      `${p}ttt stats`,
      `${p}ttt history`,
      `${p}ttt leaderboard`,
      `${p}ttt spectate <game_id>`,
      `${p}ttt games`,
      `${p}ttt tournament/join/out`,
      `${p}ttt image on/off`,
      `${p}ttt aidiff facile/normal/impossible`,
      "---",
      "En jeu: 1-9 | forfait | restart | rematch"
    ]), threadID);

    if (sub === "image") {
      const on = sub2 === "on";
      imageModeByThread[threadID] = on;
      if (tournaments[threadID]) tournaments[threadID].imageMode = on;
      return api.sendMessage(UI([`Mode image ${on ? "ON" : "OFF"}.`]), threadID);
    }

    if (sub === "aidiff") {
      const diff = sub2;
      if (!["facile","normal","impossible"].includes(diff))
        return api.sendMessage(UI(["Valide: facile / normal / impossible"]), threadID);
      aiDifficulty.set(senderID, diff);
      return api.sendMessage(UI([`Difficulte IA: ${diff}`]), threadID);
    }

    if (sub === "group") {
      try {
        const threads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = threads
          .filter(t => t.isGroup && t.threadID)
          .map(t => ({
            id: t.threadID,
            name: t.name || "Groupe sans nom",
            members: t.participantIDs?.length || 0,
            online: t.onlineUsers?.length || 0
          }));

        if (groups.length === 0) return api.sendMessage(UI(["Aucun groupe trouve."]), threadID);

        const lines = ["📋 GROUPES", "---", `Total: ${groups.length} groupes`, "---"];
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          lines.push(`${i + 1}. ${g.name}`);
          lines.push(`   👥 ${g.members} membres (${g.online} en ligne)`);
          lines.push(`   🆔 ${g.id}`);
          lines.push("---");
        }
        lines.push(`Reponds avec un numero (1-${groups.length}) pour voir les membres`);
        lines.push(`Tape "page 2" pour voir plus de groupes`);

        const msg = await api.sendMessage(UI(lines), threadID);

        groupSelections.set(senderID, {
          groups: groups,
          msgId: msg.messageID,
          threadId: threadID,
          timestamp: Date.now(),
          currentPage: 0,
          totalPages: Math.ceil(groups.length / 10)
        });
        saveGroupSelections();

        setTimeout(() => {
          if (groupSelections.has(senderID)) {
            groupSelections.delete(senderID);
            saveGroupSelections();
          }
        }, 120000);

        return;
      } catch (error) {
        return api.sendMessage(UI(["Erreur lors de la recuperation des groupes."]), threadID);
      }
    }

    if (sub === "games") {
      const active = Object.entries(games).filter(([,g]) => g.inProgress);
      if (!active.length) return api.sendMessage(UI(["Aucune partie active."]), threadID);
      const lines = ["Parties actives", "---"];
      for (const [id, g] of active) {
        const p1 = g.players[0].name, p2 = g.players[1].name;
        const cur  = g.players[g.currentPlayerIndex].name;
        const mode = g.isOnline ? "[Online]" : g.isAI ? "[IA]" : "[PvP]";
        lines.push(`${mode} ${p1} vs ${p2} — Tour: ${cur}`);
        lines.push(`ID: ${id}`); lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "spectate") {
      const gameID = args[1];
      if (!gameID || !games[gameID] || !games[gameID].inProgress)
        return api.sendMessage(UI(["Partie introuvable.", `Utilise ${p}ttt games`]), threadID);
      const game = games[gameID];
      if (!spectators.has(gameID)) spectators.set(gameID, []);
      const list = spectators.get(gameID);
      if (list.find(s => s.uid === senderID)) return api.sendMessage(UI(["Tu regardes deja."]), threadID);
      list.push({ uid: senderID, threadID });
      if (game.imageMode) {
        const img = await generateBoardImage(game.board, game.players[game.currentPlayerIndex], game.players, usersData, "normal", game.bets, game.odds);
        await sendImage(api, threadID, img, `Spectateur: ${game.players[0].name} vs ${game.players[1].name}`);
      } else {
        await api.sendMessage(UI([`Spectateur`, `${game.players[0].name} vs ${game.players[1].name}`, "---", displayBoard(game.board), "---", `Tour: ${game.players[game.currentPlayerIndex].name}`]), threadID);
      }
      return;
    }

    if (sub === "history") {
      const userHistory = gameHistory.filter(h => h.players?.includes(senderID)).slice(0, 8);
      if (!userHistory.length) return api.sendMessage(UI(["Aucun historique."]), threadID);
      const lines = ["HISTORIQUE", "---"];
      for (const h of userHistory) {
        const date   = new Date(h.timestamp).toLocaleDateString("fr-FR");
        const result = h.isDraw ? "Nul" : h.winner === senderID ? "Gagne" : "Perdu";
        const mode   = h.isOnline ? "[Online]" : h.isAI ? "[IA]" : "[PvP]";
        const moves  = h.moves ? ` | ${h.moves} coups` : "";
        const dur    = h.duration ? ` | ${h.duration}s` : "";
        lines.push(`${mode} | ${result}${moves}${dur} | ${date}`);
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "leaderboard") {
      const sorted = Object.entries(playerStats)
        .filter(([id]) => id !== "AI")
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10);
      if (!sorted.length) return api.sendMessage(UI(["Aucun joueur."]), threadID);
      const lines  = ["CLASSEMENT", "---"];
      const medals = ["1.", "2.", "3."];
      for (let i = 0; i < sorted.length; i++) {
        const [id, st] = sorted[i];
        const name   = (await usersData.getName(id)) || `Player ${id}`;
        const wr     = st.played > 0 ? Math.round(st.wins / st.played * 100) : 0;
        const streak = playerStreaks[id]?.best || 0;
        lines.push(`${medals[i] || `${i+1}.`} ${name}`);
        lines.push(`   ${st.wins}V/${st.losses}D/${st.draws}N | ${wr}% | Best streak ${streak}`);
        lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "stats") {
      if (imageModeByThread[threadID]) {
        const img = await generateStatsImage(senderID, usersData);
        if (img) { await sendImage(api, threadID, img); return; }
      }
      const stats  = playerStats[senderID] || { wins:0, losses:0, draws:0, played:0 };
      const name   = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const wr     = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;
      const streak = playerStreaks[senderID] || { current:0, best:0 };
      return api.sendMessage(UI([
        `${name} — Stats`, "---",
        `Victoires: ${stats.wins}`,
        `Defaites: ${stats.losses}`,
        `Nuls: ${stats.draws}`,
        `Parties: ${stats.played}`,
        `Winrate: ${wr}%`,
        `Streak actuel: ${streak.current}`,
        `Meilleur streak: ${streak.best}`
      ]), threadID);
    }

    if (sub === "online" || sub === "cross") {
      const targetId       = args[1];
      const targetThreadId = args[2];
      const betRaw         = args[3] || "0";
      const betAmt         = await parseAmount(betRaw);

      if (!targetId || !targetThreadId) {
        return api.sendMessage(UI([
          "MODE ONLINE", "---",
          `${p}ttt online <user_id> <group_id> <mise>`,
          "Joue avec mise obligatoire !",
          "Le gagnant remporte tout le pot"
        ]), threadID);
      }

      if (betAmt <= 0n) return api.sendMessage(UI(["Mise invalide. Minimum: 1$"]), threadID);
      if (targetId === senderID) return api.sendMessage(UI(["Tu ne peux pas jouer contre toi-meme."]), threadID);
      if (targetThreadId === threadID) return api.sendMessage(UI(["Le mode online est pour groupes differents !", `Utilise ${p}ttt @joueur pour meme groupe.`]), threadID);

      const cash = await getUserCash(senderID);
      if (betAmt > cash) return api.sendMessage(UI(["Fonds insuffisants", "---", `Solde: ${await formatNumber(cash)}$`, `Mise: ${await formatNumber(betAmt)}$`]), threadID);

      if (findAnyActiveGame(targetId)) return api.sendMessage(UI(["Ce joueur est deja en jeu."]), threadID);
      if (findAnyActiveGame(senderID)) return api.sendMessage(UI(["Tu as deja une partie en cours."]), threadID);
      for (const [, inv] of onlineInvites) {
        if (inv.targetId === targetId) return api.sendMessage(UI(["Ce joueur a deja une invitation."]), threadID);
        if (inv.uid === senderID) return api.sendMessage(UI(["Tu as deja une invitation en attente."]), threadID);
      }

      const inviterName = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const targetName  = (await usersData.getName(targetId))  || `Player ${targetId}`;
      const inviteId    = `invite_${senderID}_${Date.now()}`;

      onlineInvites.set(inviteId, { uid:senderID, targetId, targetThreadId, threadId:threadID, inviterName, targetName, bet:betAmt.toString(), timestamp:Date.now() });

      try {
        await api.sendMessage(
          UI([
            `${inviterName} veut jouer au TicTacToe avec ${targetName} !`,
            "---",
            `Cette invitation est destinee a : ${targetName}`,
            `Mise: ${await formatNumber(betAmt)}$ chacun`,
            `Pot total: ${await formatNumber(betAmt * 2n)}$`,
            "---",
            `${targetName}, reponds "oui" pour accepter ou "non" pour refuser.`,
            "(Expire dans 60s)"
          ]),
          targetThreadId
        );
      } catch {
        onlineInvites.delete(inviteId);
        return api.sendMessage(UI(["Impossible d'envoyer l'invitation.", "Verifie l'ID du groupe."]), threadID);
      }

      const to = setTimeout(() => {
        if (onlineInvites.has(inviteId)) {
          onlineInvites.delete(inviteId);
          api.sendMessage(UI(["Invitation expiree (aucune reponse)."]), threadID);
        }
        inviteTimeouts.delete(inviteId);
      }, 60000);
      inviteTimeouts.set(inviteId, to);

      return api.sendMessage(UI([
        "Invitation envoyee !", "---",
        `A: ${targetName}`,
        `Mise: ${await formatNumber(betAmt)}$`,
        "En attente de reponse (60s)..."
      ]), threadID);
    }

    if (["tournoi","join","out"].includes(sub)) {
      if (!tournaments[threadID]) createTournament(threadID);
      const T = tournaments[threadID];

      if (sub === "join") {
        if (T.status !== "registration") return api.sendMessage(UI(["Aucun tournoi ouvert."]), threadID);
        if (T.players.find(p => p.id === senderID)) return api.sendMessage(UI(["Deja inscrit."]), threadID);
        if (T.players.length >= T.requiredPlayers) return api.sendMessage(UI(["Tournoi complet."]), threadID);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        T.players.push({ id:senderID, name });
        return api.sendMessage(UI([`Inscrit ! (${T.players.length}/${T.requiredPlayers})`]), threadID);
      }
      if (sub === "out") {
        if (T.status !== "registration") return api.sendMessage(UI(["Tournoi deja commence."]), threadID);
        const idx = T.players.findIndex(p => p.id === senderID);
        if (idx === -1) return api.sendMessage(UI(["Pas inscrit."]), threadID);
        T.players.splice(idx, 1);
        return api.sendMessage(UI(["Tu as quitte le tournoi."]), threadID);
      }
      if (sub === "tournoi") {
        if (sub2 === "start") {
          const num = T.players.length;
          if (![4,8,16].includes(num)) return api.sendMessage(UI([`Il faut 4, 8 ou 16 joueurs. Actuel: ${num}`]), threadID);
          T.requiredPlayers = num;
          await startTournament(threadID, api, usersData); return;
        }
        if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, threadID, bi, `Tournoi — tape ${p}ttt join`); }
        else await api.sendMessage(generateTournamentBracketText(T), threadID);
        return;
      }
    }

    if (sub === "ia" || sub === "ai") {
      const betRaw   = args[1];
      const oddRaw   = parseFloat(args[2]) || 2;
      const diffArg  = (args[3] || aiDifficulty.get(senderID) || "normal").toLowerCase();
      const validDiff = ["facile","normal","impossible"].includes(diffArg) ? diffArg : "normal";
      const clampOd  = Math.min(20, Math.max(1, oddRaw));
      const betAmt   = await parseAmount(betRaw);
      const userName = (await usersData.getName(senderID)) || `Player ${senderID}`;

      if (betAmt > 0n) {
        const cash = await getUserCash(senderID);
        if (betAmt > cash) return api.sendMessage(UI(["Fonds insuffisants", "---", `Solde: ${await formatNumber(cash)}$`, `Mise: ${await formatNumber(betAmt)}$`]), threadID);
        await updateUserCash(senderID, -betAmt);
      }

      const gID = `${threadID}:ai:${senderID}`;
      resetGame(gID,
        { id:senderID, name:userName },
        { id:"AI", name:BOT_NAME },
        { isAI:true, threadID, imageMode:imageModeByThread[threadID]||false, aiDifficulty:validDiff,
          bets:betAmt>0n?{[senderID]:betAmt.toString()}:null,
          odds:betAmt>0n?{[senderID]:clampOd}:null }
      );

      const betLine = betAmt > 0n
        ? `Mise: ${await formatNumber(betAmt)}$ | Cote: x${clampOd} | Gain: ${await formatNumber(BigInt(Math.floor(Number(betAmt)*clampOd)))}$`
        : "Sans mise";

      if (games[gID].imageMode) {
        const img = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "normal", games[gID].bets, games[gID].odds);
        await sendImage(api, threadID, img, UI([`VS IA (${validDiff})`, `${userName} (X) vs ${BOT_NAME} (O)`, "---", betLine]));
      } else {
        await api.sendMessage(UI([`VS IA (${validDiff})`, `${userName} (X) vs ${BOT_NAME} (O)`, "---", betLine, "---", displayBoard(games[gID].board), "---", `${userName}, a toi (1-9)`]), threadID);
      }
      if (games[gID].players[games[gID].currentPlayerIndex].id === "AI") await applyAIMove(gID, api, usersData);
      return;
    }

    const mentions  = event.mentions || {};
    let targetID    = Object.keys(mentions)[0] || null;
    if (!targetID && args[0]) { const ex = args[0].match(/\d+/); if (ex) targetID = ex[0]; }
    if (!targetID) return api.sendMessage(UI(["Mention invalide.", `${p}ttt @joueur <mise> [cote]`]), threadID);
    if (targetID === senderID) return api.sendMessage(UI(["Tu ne peux pas jouer contre toi-meme."]), threadID);

    const betRaw1  = args[1];
    const oddRaw1  = parseFloat(args[2]) || 2;
    const clampOd1 = Math.min(20, Math.max(1, oddRaw1));
    const betAmt1  = await parseAmount(betRaw1);
    const name1    = (await usersData.getName(senderID)) || `Player ${senderID}`;
    const name2    = (mentions[targetID]||"").replace("@","") || (await usersData.getName(targetID)) || `Player ${targetID}`;
    const bets = {}, odds = {};

    if (betAmt1 > 0n) {
      const cash1 = await getUserCash(senderID);
      if (betAmt1 > cash1) return api.sendMessage(UI(["Fonds insuffisants (J1)", "---", `Solde: ${await formatNumber(cash1)}$`]), threadID);
      await updateUserCash(senderID, -betAmt1);
      bets[senderID] = betAmt1.toString(); odds[senderID] = clampOd1;
      const cash2 = await getUserCash(targetID);
      if (betAmt1 > cash2) { await updateUserCash(senderID, betAmt1); return api.sendMessage(UI(["L'adversaire n'a pas assez.", "---", `Son solde: ${await formatNumber(cash2)}$`]), threadID); }
      await updateUserCash(targetID, -betAmt1);
      bets[targetID] = betAmt1.toString(); odds[targetID] = clampOd1;
    }

    const gID = `${threadID}:pvp:${senderID}:${targetID}`;
    resetGame(gID, { id:senderID, name:name1 }, { id:targetID, name:name2 }, { threadID, imageMode:imageModeByThread[threadID]||false, bets:betAmt1>0n?bets:null, odds:betAmt1>0n?odds:null });

    const betLine = betAmt1 > 0n ? `Mise: ${await formatNumber(betAmt1)}$ chacun | Cote: x${clampOd1}` : "Sans mise";

    if (games[gID].imageMode) {
      const img = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "normal", games[gID].bets, games[gID].odds);
      await sendImage(api, threadID, img, UI([`${name1} (X) vs ${name2} (O)`, "---", betLine, "---", `${name1}, a toi (1-9)`]));
    } else {
      await api.sendMessage(UI([`${name1} (X) vs ${name2} (O)`, "---", betLine, "---", displayBoard(games[gID].board), "---", `${name1}, a toi (1-9)`]), threadID);
    }
  },

  onChat: async function ({ api, event, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const msg      = (event.body || "").trim();
    const msgLower = msg.toLowerCase();

    const pageMatch = msgLower.match(/^page\s*(\d+)$/);
    if (pageMatch && groupSelections.has(senderID)) {
      const selection = groupSelections.get(senderID);
      const page = parseInt(pageMatch[1]) - 1;
      const totalPages = selection.totalPages || 1;
      const groups = selection.groups;

      if (page < 0 || page >= totalPages) {
        await api.sendMessage(UI([`Page invalide. Choisis entre 1 et ${totalPages}.`]), threadID);
        return;
      }

      selection.currentPage = page;
      saveGroupSelections();

      const start = page * 10;
      const end = Math.min(start + 10, groups.length);
      const pageGroups = groups.slice(start, end);

      const lines = [`📋 GROUPES — Page ${page + 1}/${totalPages}`, "---", `Total: ${groups.length} groupes`, "---"];
      for (let i = 0; i < pageGroups.length; i++) {
        const g = pageGroups[i];
        const num = start + i + 1;
        lines.push(`${num}. ${g.name}`);
        lines.push(`   👥 ${g.members} membres (${g.online} en ligne)`);
        lines.push(`   🆔 ${g.id}`);
        lines.push("---");
      }
      lines.push(`Reponds avec un numero (${start + 1}-${end}) pour voir les membres`);
      if (page > 0) lines.push(`Tape "page ${page}" pour la page precedente`);
      if (page + 1 < totalPages) lines.push(`Tape "page ${page + 2}" pour la page suivante`);

      await api.sendMessage(UI(lines), threadID);
      return;
    }

    const numMatch = msg.match(/^(\d+)$/);
    if (numMatch && groupSelections.has(senderID)) {
      const selection = groupSelections.get(senderID);
      const num = parseInt(numMatch[1]) - 1;
      const groups = selection.groups;
      const currentPage = selection.currentPage || 0;
      const start = currentPage * 10;
      const end = Math.min(start + 10, groups.length);

      if (num < start || num >= end) {
        await api.sendMessage(UI([`Numero invalide. Choisis entre ${start + 1} et ${end}.`]), threadID);
        return;
      }

      if (num >= 0 && num < groups.length) {
        const selectedGroup = groups[num];
        try {
          const threadInfo = await api.getThreadInfo(selectedGroup.id);
          if (!threadInfo) {
            await api.sendMessage(UI(["Erreur lors de la recuperation du groupe."]), threadID);
            groupSelections.delete(senderID);
            saveGroupSelections();
            return;
          }

          const participants = threadInfo.participantIDs || [];
          const onlineUsers = threadInfo.onlineUsers || [];
          const memberNames = await Promise.all(
            participants.slice(0, 50).map(async (id) => {
              const name = await usersData.getName(id).catch(() => `User_${String(id).slice(-5)}`);
              const isOnline = onlineUsers.includes(id);
              const status = isOnline ? "🟢" : "⚪";
              return `${status} ${name} | ${id}`;
            })
          );

          const lines = [
            `📋 ${threadInfo.name || "Groupe sans nom"}`,
            "---",
            `👥 ${participants.length} membres`,
            `🟢 ${onlineUsers.length} en ligne`,
            `🆔 ${selectedGroup.id}`,
            "---"
          ];

          if (memberNames.length > 0) {
            lines.push(...memberNames);
            if (participants.length > 50) {
              lines.push(`... et ${participants.length - 50} de plus`);
              lines.push(`Tape "page 2" pour voir la suite`);

              groupSelections.set(senderID, {
                ...selection,
                groupMembers: {
                  id: selectedGroup.id,
                  name: threadInfo.name || "Groupe sans nom",
                  participants: participants,
                  onlineUsers: onlineUsers,
                  currentPage: 1,
                  totalPages: Math.ceil(participants.length / 50)
                }
              });
              saveGroupSelections();
            }
          } else {
            lines.push("Aucun membre trouve");
          }

          await api.sendMessage(UI(lines), threadID);
        } catch (error) {
          await api.sendMessage(UI(["Erreur lors de la recuperation des membres."]), threadID);
        }

        return;
      } else {
        await api.sendMessage(UI([`Numero invalide. Choisis entre ${start + 1} et ${end}.`]), threadID);
        return;
      }
    }

    const memberPageMatch = msgLower.match(/^page\s*(\d+)$/);
    if (memberPageMatch && groupSelections.has(senderID)) {
      const selection = groupSelections.get(senderID);
      if (selection.groupMembers) {
        const page = parseInt(memberPageMatch[1]) - 1;
        const members = selection.groupMembers;
        const totalPages = members.totalPages || 1;

        if (page < 0 || page >= totalPages) {
          await api.sendMessage(UI([`Page invalide. Choisis entre 1 et ${totalPages}.`]), threadID);
          return;
        }

        const start = page * 50;
        const end = Math.min(start + 50, members.participants.length);
        const pageMembers = members.participants.slice(start, end);

        const memberNames = await Promise.all(
          pageMembers.map(async (id) => {
            const name = await usersData.getName(id).catch(() => `User_${String(id).slice(-5)}`);
            const isOnline = members.onlineUsers.includes(id);
            const status = isOnline ? "🟢" : "⚪";
            return `${status} ${name} | ${id}`;
          })
        );

        const lines = [
          `📋 ${members.name} — Page ${page + 1}/${totalPages}`,
          "---",
          `👥 ${members.participants.length} membres`,
          `🟢 ${members.onlineUsers.length} en ligne`,
          "---",
          ...memberNames
        ];

        if (page > 0) lines.push(`Tape "page ${page}" pour la page precedente`);
        if (page + 1 < totalPages) lines.push(`Tape "page ${page + 2}" pour la page suivante`);

        await api.sendMessage(UI(lines), threadID);

        selection.groupMembers.currentPage = page;
        saveGroupSelections();
        return;
      }
    }

    const response = msgLower.match(/^(oui|non)$/);
    if (response) {
      let foundInvite = null, inviteId = null;
      for (const [id, invite] of onlineInvites) {
        if (invite.targetId === senderID && invite.targetThreadId === String(threadID)) {
          foundInvite = invite; inviteId = id; break;
        }
      }

      if (foundInvite) {
        const to = inviteTimeouts.get(inviteId);
        if (to) { clearTimeout(to); inviteTimeouts.delete(inviteId); }

        if (response[0] === "non") {
          onlineInvites.delete(inviteId);
          await api.sendMessage(UI(["Tu as refuse l'invitation."]), threadID);
          try { await api.sendMessage(UI([`${foundInvite.targetName} a refuse ton invitation.`]), foundInvite.threadId); } catch {}
          return;
        }

        onlineInvites.delete(inviteId);

        if (findAnyActiveGame(senderID)) {
          await api.sendMessage(UI(["Tu es deja en jeu."]), threadID);
          try { await api.sendMessage(UI([`${foundInvite.targetName} est deja en jeu.`]), foundInvite.threadId); } catch {}
          return;
        }
        if (findAnyActiveGame(foundInvite.uid)) {
          await api.sendMessage(UI(["L'invitant est deja en jeu."]), threadID); return;
        }

        const betAmt     = toBigInt(foundInvite.bet);
        const cashInviter = await getUserCash(foundInvite.uid);
        const cashTarget  = await getUserCash(senderID);

        if (betAmt > cashInviter) {
          await api.sendMessage(UI(["L'invitant n'a plus assez d'argent.", `Mise: ${await formatNumber(betAmt)}$`, `Son solde: ${await formatNumber(cashInviter)}$`]), threadID);
          return;
        }
        if (betAmt > cashTarget) {
          await api.sendMessage(UI(["Tu n'as pas assez d'argent.", `Mise: ${await formatNumber(betAmt)}$`, `Ton solde: ${await formatNumber(cashTarget)}$`]), threadID);
          try { await api.sendMessage(UI([`${foundInvite.targetName} n'a pas assez d'argent.`]), foundInvite.threadId); } catch {}
          return;
        }

        await updateUserCash(foundInvite.uid, -betAmt);
        await updateUserCash(senderID, -betAmt);

        const bets = { [foundInvite.uid]: betAmt.toString(), [senderID]: betAmt.toString() };

        await api.sendMessage(UI([
          "Invitation acceptee !", "---",
          `Mise: ${await formatNumber(betAmt)}$ chacun`,
          `Pot total: ${await formatNumber(betAmt * 2n)}$`, "---",
          `${foundInvite.inviterName} commence en X, tu joues en O.`,
          "Envoie 1-9 pour jouer."
        ]), threadID);

        try {
          await api.sendMessage(UI([
            "Invitation acceptee !", "---",
            `${foundInvite.targetName} a accepte !`,
            `Pot total: ${await formatNumber(betAmt * 2n)}$`,
            `Tu joues en X contre ${foundInvite.targetName} (O).`,
            `${foundInvite.inviterName}, a toi (1-9).`
          ]), foundInvite.threadId);
        } catch {}

        const gID = `online_${foundInvite.uid}_${senderID}_${Date.now()}`;

        resetGame(gID,
          { id: foundInvite.uid, name: foundInvite.inviterName },
          { id: senderID, name: foundInvite.targetName },
          {
            threadID: foundInvite.threadId,
            partnerThreadID: threadID,
            imageMode: imageModeByThread[foundInvite.threadId] || imageModeByThread[threadID] || false,
            isOnline: true,
            bets,
            odds: null
          }
        );

        onlineGames.set(gID, {
          uid: foundInvite.uid, partnerId: senderID,
          threadId: foundInvite.threadId, partnerThreadId: threadID, gameId: gID
        });
        saveOnlineGames();

        const game = games[gID];

        if (game.imageMode) {
          const img = await generateBoardImage(game.board, game.players[0], game.players, usersData, "online", bets, null);
          if (img) {
            await sendImage(api, foundInvite.threadId, img, `${foundInvite.inviterName}, a toi ! (1-9)`);
            try { await sendImage(api, threadID, img, `${foundInvite.targetName}, attends le tour de ${foundInvite.inviterName}.`); } catch {}
          }
        } else {
          const boardTxt = UI([
            `[ONLINE] ${foundInvite.inviterName} (X) vs ${foundInvite.targetName} (O)`,
            `Pot: ${await formatNumber(betAmt * 2n)}$`,
            "---",
            displayBoard(game.board),
            "---",
            `${foundInvite.inviterName}, a toi (1-9)`
          ]);
          await api.sendMessage(boardTxt, foundInvite.threadId);
          try {
            await api.sendMessage(UI([
              `[ONLINE] ${foundInvite.inviterName} (X) vs ${foundInvite.targetName} (O)`,
              `Pot: ${await formatNumber(betAmt * 2n)}$`,
              "---",
              displayBoard(game.board),
              "---",
              `Attends le tour de ${foundInvite.inviterName}.`
            ]), threadID);
          } catch {}
        }
        return;
      }
    }

    const gameID = Object.keys(games).find(id => {
      const g = games[id];
      if (!g.inProgress) return false;
      const isPlayer = g.players.some(pl => pl.id === senderID);
      if (!isPlayer) return false;
      if (g.isOnline) {
        const playerObj = g.players.find(pl => pl.id === senderID);
        if (!playerObj) return false;
        const expectedThread = playerObj.id === g.players[0].id ? g.threadID : g.partnerThreadID;
        return String(threadID) === String(expectedThread);
      }
      return String(g.threadID) === String(threadID);
    });

    if (!gameID) {
      const finished = Object.keys(games).find(id => {
        const g = games[id];
        if (g.inProgress) return false;
        const isPlayer = g.players.some(pl => pl.id === senderID);
        if (!isPlayer) return false;
        if (g.isOnline) {
          const playerObj = g.players.find(pl => pl.id === senderID);
          const expectedThread = playerObj?.id === g.players[0].id ? g.threadID : g.partnerThreadID;
          return String(threadID) === String(expectedThread);
        }
        return String(g.threadID) === String(threadID);
      });

      if (finished) {
        const fg = games[finished];

        if (msgLower === "rematch") {
          if (fg.isTournamentGame || fg.isOnline) return api.sendMessage(UI(["Impossible dans ce mode."]), threadID);
          const other = fg.players.find(p => p.id !== senderID);
          if (!other) return;
          if (!rematchPending.has(finished)) {
            rematchPending.set(finished, { uid:senderID, name:fg.players.find(p=>p.id===senderID).name });
            return api.sendMessage(UI([`${fg.players.find(p=>p.id===senderID).name} veut une revanche !`, `${other.name}, tape "rematch" pour accepter.`]), threadID);
          }
          const pending = rematchPending.get(finished);
          if (pending.uid === senderID) return api.sendMessage(UI(["Deja demande. En attente."]), threadID);

          rematchPending.delete(finished);
          const swapped = [fg.players[1], fg.players[0]];
          resetGame(finished, { id:swapped[0].id, name:swapped[0].name }, { id:swapped[1].id, name:swapped[1].name }, { isAI:fg.isAI, threadID, imageMode:fg.imageMode, bets:fg.bets, odds:fg.odds, aiDifficulty:fg.aiDifficulty });
          const newG = games[finished];
          if (fg.imageMode) {
            const img = await generateBoardImage(newG.board, newG.players[0], newG.players, usersData, "normal", newG.bets, newG.odds);
            await sendImage(api, threadID, img, `Revanche ! Roles inverses — ${newG.players[0].name} commence !`);
          } else {
            await api.sendMessage(UI([`Revanche ! Roles inverses`, `${newG.players[0].name} (X) vs ${newG.players[1].name} (O)`, "---", displayBoard(newG.board), "---", `${newG.players[0].name}, a toi (1-9)`]), threadID);
          }
          if (fg.isAI && newG.players[newG.currentPlayerIndex].id === "AI") await applyAIMove(finished, api, usersData);
          return;
        }

        if (msgLower === "restart") {
          if (fg.isTournamentGame || fg.isOnline) return api.sendMessage(UI(["Impossible dans ce mode."]), threadID);
          rematchPending.delete(finished);
          resetGame(finished, fg.players[0], fg.players[1], { isAI:fg.isAI, threadID, imageMode:fg.imageMode, bets:fg.bets, odds:fg.odds, aiDifficulty:fg.aiDifficulty });
          const newG = games[finished];
          if (fg.imageMode) {
            const img = await generateBoardImage(newG.board, newG.players[0], newG.players, usersData);
            await sendImage(api, threadID, img, `Redemarrage ! ${newG.players[0].name}, a toi.`);
          } else {
            await api.sendMessage(UI([`Redemarrage !`, `${newG.players[0].name} (X) vs ${newG.players[1].name} (O)`, "---", displayBoard(newG.board), "---", `${newG.players[0].name}, a toi (1-9)`]), threadID);
          }
          if (fg.isAI && newG.players[newG.currentPlayerIndex].id === "AI") await applyAIMove(finished, api, usersData);
          return;
        }
      }
      return;
    }

    const game = games[gameID];

    if (game.isMathChallenge) {
      if (msg === "2") {
        const winner = game.players.find(p => p.id === senderID);
        const loser  = game.players.find(p => p.id !== senderID);
        await api.sendMessage(UI(["CORRECT !", `${winner.name} gagne !`]), threadID);
        game.board = Array(9).fill(winner.symbol); game.inProgress = false; game.isMathChallenge = false;
        ensurePlayerStats(winner.id); ensurePlayerStats(loser.id);
        playerStats[winner.id].wins++; playerStats[loser.id].losses++; saveStats();
        if (game.isTournamentGame && tournaments[game.tournamentID]) {
          const T = tournaments[game.tournamentID], round = T.rounds[T.currentRoundIndex], match = round.matches[game.matchIndex];
          if (match) { match.winner = winner.id; match.completed = true; }
          const doneAll = round.matches.every(m => m.completed);
          if (doneAll) {
            if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, game.threadID, bi); }
            await advanceTournamentRound(game.tournamentID, api, usersData);
          } else await initiateNextMatch(game.tournamentID, api, usersData);
        }
      }
      return;
    }

    if (msgLower === "forfait") {
      const forfeiter = game.players.find(p => p.id === senderID);
      const other     = game.players.find(p => p.id !== senderID);
      if (!forfeiter || !other) return;
      game.inProgress = false;
      ensurePlayerStats(forfeiter.id); ensurePlayerStats(other.id);
      playerStats[forfeiter.id].losses++; playerStats[forfeiter.id].played++;
      playerStats[other.id].wins++;      playerStats[other.id].played++;
      updateStreak(other.id, true); updateStreak(forfeiter.id, false); saveStats();
      let gainInfo = null;

      if (game.bets) {
        const totalPot = Object.values(game.bets).reduce((s, b) => s + toBigInt(b), 0n);
        await updateUserCash(other.id, totalPot);
        gainInfo = { line1:`${forfeiter.name} abandonne`, line2:`${other.name} gagne +${await formatNumber(totalPot)}$`, line3:"" };
      }

      if (game.imageMode) {
        const img = await generateEndGameImage(game.board, other, game.players, usersData, false, gainInfo);
        if (img) {
          await sendImage(api, game.threadID, img);
          if (game.isOnline && game.partnerThreadID) try { await sendImage(api, game.partnerThreadID, img, `${forfeiter.name} a abandonne !`); } catch {}
        }
      } else {
        let txt = UI([`${forfeiter.name} abandonne.`, `${other.name} gagne !`]);
        if (gainInfo) txt += `\n${gainInfo.line1}\n${gainInfo.line2}`;
        await api.sendMessage(txt, game.threadID);
        if (game.isOnline && game.partnerThreadID) try { await api.sendMessage(txt, game.partnerThreadID); } catch {}
      }

      spectators.delete(gameID);
      if (game.isTournamentGame && tournaments[game.tournamentID]) {
        const T = tournaments[game.tournamentID], round = T.rounds[T.currentRoundIndex], match = round.matches[game.matchIndex];
        if (match) { match.winner = other.id; match.completed = true; }
        const done = round.matches.every(m => m.completed);
        if (done) {
          if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, threadID, bi); }
          await advanceTournamentRound(game.tournamentID, api, usersData);
        } else await initiateNextMatch(game.tournamentID, api, usersData);
      } else {
        await api.sendMessage(`Tape "rematch" ou "restart" pour rejouer.`, game.threadID);
      }
      return;
    }

    const current = game.players[game.currentPlayerIndex];
    if (senderID !== current.id) return;

    const pos = parseInt(msg) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) return;
    if (game.board[pos] !== null) {
      await api.sendMessage(UI(["Case deja prise."]), threadID); return;
    }

    game.board[pos] = current.symbol;
    game.moves.push({ player:current.id, position:pos, board:[...game.board], time:Date.now() });
    game.lastMoveTime = Date.now();

    const winner2 = checkWinner(game.board);
    const isDraw2 = isBoardFull(game.board);
    if (winner2 || isDraw2) return handleGameEnd(gameID, api, { threadID, senderID }, usersData);

    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
    const next = game.players[game.currentPlayerIndex];

    if (game.isOnline && game.partnerThreadID) {
      const nextThread = next.id === game.players[0].id ? game.threadID : game.partnerThreadID;
      const prevThread = next.id === game.players[0].id ? game.partnerThreadID : game.threadID;

      if (game.imageMode) {
        const img = await generateBoardImage(game.board, next, game.players, usersData, "online", game.bets, game.odds);
        if (img) {
          try { await sendImage(api, nextThread, img, `${next.name}, c'est ton tour ! (1-9)`); } catch {}
          try { await sendImage(api, prevThread, img, `Tu as joue. Tour de ${next.name}.`); } catch {}
        }
      } else {
        const boardTxt = displayBoard(game.board);
        try { await api.sendMessage(`${boardTxt}\n${UI([`Tour: ${next.name}`, "Envoie 1-9 pour jouer !"])}`   , nextThread); } catch {}
        try { await api.sendMessage(`${boardTxt}\n${UI([`Tour de ${next.name}.`, "Attends son coup."])}`       , prevThread); } catch {}
      }
    } else {
      if (game.imageMode) {
        const img = await generateBoardImage(game.board, next, game.players, usersData, game.isTournamentGame ? "tournament" : "normal", game.bets, game.odds);
        if (img) await sendImage(api, game.threadID, img, `Tour: ${next.name}`);
      } else {
        await api.sendMessage(UI([displayBoard(game.board), "---", `Tour: ${next.name}`]), game.threadID);
      }
    }

    notifySpectators(gameID, api, usersData);
    if (game.isAI && next.id === "AI") await applyAIMove(gameID, api, usersData);
  }
};