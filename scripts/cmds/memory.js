const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const CASH_URL   = "https://cash-api-five.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const MAX_LIMIT  = 10n ** 261n;

const TIERS = [
  { v: 10n**258n, s: "Qiu" }, { v: 10n**255n, s: "Qu" }, { v: 10n**252n, s: "Tu" },
  { v: 10n**249n, s: "Du" }, { v: 10n**246n, s: "Uc" }, { v: 10n**243n, s: "DcQ" },
  { v: 10n**240n, s: "NoQ" }, { v: 10n**237n, s: "OcQ" }, { v: 10n**234n, s: "SpQ" },
  { v: 10n**231n, s: "SxQ" }, { v: 10n**228n, s: "QiQ" }, { v: 10n**225n, s: "QQ" },
  { v: 10n**222n, s: "TQ" }, { v: 10n**219n, s: "DQ" }, { v: 10n**216n, s: "UQ" },
  { v: 10n**213n, s: "DcTr"}, { v: 10n**210n, s: "NoTr"}, { v: 10n**207n, s: "OcTr"},
  { v: 10n**204n, s: "SpTr"}, { v: 10n**201n, s: "SxTr"}, { v: 10n**198n, s: "QiTr"},
  { v: 10n**195n, s: "QTr" }, { v: 10n**192n, s: "TTr" }, { v: 10n**189n, s: "DTr" },
  { v: 10n**186n, s: "UTr" }, { v: 10n**183n, s: "DcT" }, { v: 10n**180n, s: "NoT" },
  { v: 10n**177n, s: "OcT" }, { v: 10n**174n, s: "SpT" }, { v: 10n**171n, s: "SxT" },
  { v: 10n**168n, s: "QiT" }, { v: 10n**165n, s: "QT" }, { v: 10n**162n, s: "TT" },
  { v: 10n**159n, s: "DT" }, { v: 10n**156n, s: "UT" }, { v: 10n**153n, s: "DcV" },
  { v: 10n**150n, s: "NoV" }, { v: 10n**147n, s: "OcV" }, { v: 10n**144n, s: "SpV" },
  { v: 10n**141n, s: "SxV" }, { v: 10n**138n, s: "QiV" }, { v: 10n**135n, s: "QV" },
  { v: 10n**132n, s: "TV" }, { v: 10n**129n, s: "DV" }, { v: 10n**126n, s: "UV" },
  { v: 10n**123n, s: "DcI" }, { v: 10n**120n, s: "NoI" }, { v: 10n**117n, s: "OcI" },
  { v: 10n**114n, s: "SpI" }, { v: 10n**111n, s: "SxI" }, { v: 10n**108n, s: "QiI" },
  { v: 10n**105n, s: "QI" }, { v: 10n**102n, s: "TI" }, { v: 10n**99n, s: "DI" },
  { v: 10n**96n, s: "UI" }, { v: 10n**93n, s: "DcN" }, { v: 10n**90n, s: "NoN" },
  { v: 10n**87n, s: "OcN" }, { v: 10n**84n, s: "SpN" }, { v: 10n**81n, s: "SxN" },
  { v: 10n**78n, s: "QiN" }, { v: 10n**75n, s: "QaN" }, { v: 10n**72n, s: "TN" },
  { v: 10n**69n, s: "BN" }, { v: 10n**66n, s: "MN" }, { v: 10n**63n, s: "kN" },
  { v: 10n**60n, s: "NoDc"}, { v: 10n**57n, s: "OcDc"}, { v: 10n**54n, s: "SpDc"},
  { v: 10n**51n, s: "SxDc"}, { v: 10n**48n, s: "QiDc"}, { v: 10n**45n, s: "QaDc"},
  { v: 10n**42n, s: "TDc" }, { v: 10n**39n, s: "DDc" }, { v: 10n**36n, s: "UDc" },
  { v: 10n**33n, s: "Dc" }, { v: 10n**30n, s: "No" }, { v: 10n**27n, s: "Oc" },
  { v: 10n**24n, s: "Sp" }, { v: 10n**21n, s: "Sx" }, { v: 10n**18n, s: "Qi" },
  { v: 10n**15n, s: "Qa" }, { v: 10n**12n, s: "T" }, { v: 10n**9n, s: "B" },
  { v: 10n**6n, s: "M" }, { v: 10n**3n, s: "k" }
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
  inf: MAX_LIMIT, infinity: MAX_LIMIT, "∞": MAX_LIMIT
};

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v === undefined || v === null) return 0n;
  if (String(v).toLowerCase().includes("infinity") || String(v).includes("∞")) return MAX_LIMIT;
  try {
    const clean = String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0";
    const r = BigInt(clean);
    return r >= MAX_LIMIT ? MAX_LIMIT : r <= -MAX_LIMIT ? -MAX_LIMIT : r;
  } catch { return 0n; }
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
    return result >= MAX_LIMIT || result <= -MAX_LIMIT ? (neg ? -MAX_LIMIT : MAX_LIMIT) : result;
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

function getUserName(uid, api) {
  return new Promise(resolve => {
    api.getUserInfo(uid, (err, data) => {
      const n = data?.[uid]?.name;
      resolve((n && n !== "Facebook User" && n !== "Utilisateur") ? n : `User_${String(uid).slice(-5)}`);
    });
  });
}

async function getUserAvatar(uid, api) {
  try {
    const d = await api.getUserInfo(uid);
    return d[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200`;
  } catch { return `https://graph.facebook.com/${uid}/picture?width=200&height=200`; }
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

const GAME_FILE  = "./memory_games.json";
const MP_FILE    = "./memory_mp_games.json";
const STATS_FILE = "./memory_stats.json";
const ONLINE_FILE = "./memory_online.json";

let activeGames    = new Map();
let mpGames        = new Map();
let onlineGames    = new Map();
let onlineInvites  = new Map();
let playerStats    = {};
const gameTimeouts = new Map();

if (fs.existsSync(GAME_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(GAME_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) { v.bet = BigInt(v.bet); activeGames.set(k, v); }
  } catch {}
}
if (fs.existsSync(MP_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(MP_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) { v.bet = BigInt(v.bet); mpGames.set(k, v); }
  } catch {}
}
if (fs.existsSync(ONLINE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(ONLINE_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) {
      if (v.bet) v.bet = BigInt(v.bet);
      onlineGames.set(k, v);
    }
  } catch {}
}
if (fs.existsSync(STATS_FILE)) {
  try { playerStats = JSON.parse(fs.readFileSync(STATS_FILE, "utf8")); } catch {}
}

function saveGames() {
  try {
    const obj = {};
    for (const [k, v] of activeGames) obj[k] = { ...v, bet: v.bet.toString() };
    fs.writeFileSync(GAME_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveMPGames() {
  try {
    const obj = {};
    for (const [k, v] of mpGames) obj[k] = { ...v, bet: v.bet.toString() };
    fs.writeFileSync(MP_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveOnlineGames() {
  try {
    const obj = {};
    for (const [k, v] of onlineGames) {
      obj[k] = { ...v, bet: v.bet ? v.bet.toString() : "0" };
    }
    fs.writeFileSync(ONLINE_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {}
}

function getPlayerStats(uid) {
  if (!playerStats[uid]) {
    playerStats[uid] = {
      gamesPlayed: 0, gamesWon: 0, gamesLost: 0,
      totalEarned: "0", totalLost: "0",
      bestTime: null, bestAccuracy: 0, bestStreak: 0, totalPairsFound: 0
    };
  }
  return playerStats[uid];
}

function recordGameResult(uid, win, timeTaken, accuracy, pairsFound) {
  const s = getPlayerStats(uid);
  s.gamesPlayed++;
  if (win) s.gamesWon++; else s.gamesLost++;
  s.totalPairsFound += pairsFound;
  if (win && (s.bestTime === null || timeTaken < s.bestTime)) s.bestTime = timeTaken;
  if (accuracy > s.bestAccuracy) s.bestAccuracy = accuracy;
  saveStats();
}

function timeStr(s) {
  const m = Math.floor(s / 60), se = s % 60;
  return `${m}:${String(se).padStart(2, "0")}`;
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

const CARD_THEMES = {
  animaux: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸"],
  fruits:  ["🍎","🍊","🍋","🍇","🍓","🫐","🍑","🍒","🥭","🍍","🥝","🍈","🍉","🥥"],
  casino:  ["🎰","🎲","🃏","🎴","🀄","🎯","🎳","🎮","🕹️","🎱","🎭","🎪","🎟️","🎫"],
  espace:  ["🌍","🌙","⭐","☀️","🪐","🌠","🌌","🚀","🛸","🌟","💫","🌑","🌕","🛰️"]
};

const DIFFICULTIES = {
  facile:    { cols: 4, pairs: 8,  multiplier: 2, bonusSpeed: 300, bonusMult: 3  },
  normal:    { cols: 4, pairs: 8,  multiplier: 3, bonusSpeed: 240, bonusMult: 5  },
  difficile: { cols: 5, pairs: 10, multiplier: 5, bonusSpeed: 180, bonusMult: 8  },
  extreme:   { cols: 6, pairs: 12, multiplier: 8, bonusSpeed: 120, bonusMult: 15 }
};

const MP_CONFIG  = { cols: 5, pairs: 12, multiplier: 4, bonusSpeed: 200, bonusMult: 8 };
const TIME_LIMIT = 600;

const DIFFICULTY_COLORS = { facile: "#22c55e", normal: "#3b82f6", difficile: "#f59e0b", extreme: "#ef4444", multiplayer: "#a855f7", online: "#06b6d4" };

function createBoard(cols, pairs, theme) {
  const symbols  = CARD_THEMES[theme] || CARD_THEMES.animaux;
  const selected = symbols.slice(0, pairs);
  const all      = [...selected, ...selected];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function parseCoord(input, cols, rows) {
  const str = String(input).toUpperCase().trim();
  const m   = str.match(/^([A-Z])(\d+)$/);
  if (!m) return null;
  const col = m[1].charCodeAt(0) - 65;
  const row = parseInt(m[2]) - 1;
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { row, col, index: row * cols + col };
}

const EMOJI_GLOW_COLORS = {
  "🐶":"#f59e0b","🐱":"#f97316","🐭":"#94a3b8","🐹":"#fb923c","🐰":"#f9a8d4","🦊":"#f97316","🐻":"#92400e","🐼":"#e2e8f0","🐨":"#94a3b8","🐯":"#f59e0b","🦁":"#d97706","🐮":"#fbbf24","🐷":"#ec4899","🐸":"#22c55e",
  "🍎":"#ef4444","🍊":"#f97316","🍋":"#fbbf24","🍇":"#7c3aed","🍓":"#f43f5e","🫐":"#3b82f6","🍑":"#fb923c","🍒":"#dc2626","🥭":"#f59e0b","🍍":"#84cc16","🥝":"#65a30d","🍈":"#a3e635","🍉":"#22c55e","🥥":"#92400e",
  "🎰":"#fbbf24","🎲":"#ef4444","🃏":"#e2e8f0","🎯":"#ef4444","🎮":"#818cf8","🎱":"#1e293b","🎳":"#f59e0b","🕹️":"#a78bfa","🎴":"#f97316","🀄":"#fbbf24","🎭":"#ec4899","🎪":"#f59e0b","🎟️":"#818cf8","🎫":"#22c55e",
  "🌍":"#22c55e","🌙":"#fbbf24","⭐":"#fde047","☀️":"#f59e0b","🪐":"#f97316","🌠":"#818cf8","🌌":"#a78bfa","🚀":"#60a5fa","🛸":"#a78bfa","🌟":"#fde047","💫":"#fbbf24","🌑":"#94a3b8","🌕":"#fbbf24","🛰️":"#60a5fa"
};

function getEmojiGlow(e) { return EMOJI_GLOW_COLORS[e] || "#818cf8"; }

async function generateBoardImage({ game, username, avatarUrl, lastFlipped, lastMatch, lastMiss, player2Name }) {
  const cols  = game.cols;
  const rows  = Math.ceil(game.board.length / cols);
  const CELL  = 88, GUTTER = 10, PAD_L = 50, PAD_T = 180;
  const W     = PAD_L + cols * (CELL + GUTTER) + 40;
  const H     = PAD_T + rows * (CELL + GUTTER) + 150;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");
  const diffColor = DIFFICULTY_COLORS[game.difficulty] || "#818cf8";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050e"); bg.addColorStop(0.5, "#0e0c1f"); bg.addColorStop(1, "#05030e");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.016)";
  for (let x = 0; x < W; x += 30) for (let y = 0; y < H; y += 30) ctx.fillRect(x, y, 1.5, 1.5);

  const borderG = ctx.createLinearGradient(0, 0, W, H);
  borderG.addColorStop(0, diffColor); borderG.addColorStop(0.5, diffColor + "66"); borderG.addColorStop(1, diffColor);
  ctx.strokeStyle = borderG; ctx.lineWidth = 3;
  roundRect(ctx, 8, 8, W - 16, H - 16, 20); ctx.stroke();

  const hdrG = ctx.createLinearGradient(0, 0, W, 0);
  hdrG.addColorStop(0, diffColor + "35"); hdrG.addColorStop(0.5, diffColor + "12"); hdrG.addColorStop(1, diffColor + "35");
  ctx.fillStyle = hdrG; ctx.fillRect(8, 8, W - 16, 70);

  ctx.font = "bold 20px Arial"; ctx.fillStyle = diffColor;
  const modeLabel = game.isOnline ? "ONLINE" : game.isMultiplayer ? "MULTI" : "SOLO";
  ctx.fillText(`MEMORY ${modeLabel}`, 24, 46);
  ctx.font = "9px Arial"; ctx.fillStyle = diffColor + "99";
  ctx.fillText(`${(game.difficulty || "ANIMAUX").toUpperCase()} • ${(game.theme || "ANIMAUX").toUpperCase()}`, 26, 64);

  const ax = W - 50, ay = 44;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 28, 0, Math.PI * 2); ctx.clip();
  try { const avatar = await loadImage(avatarUrl); ctx.drawImage(avatar, ax - 28, ay - 28, 56, 56); }
  catch { ctx.fillStyle = "#1a1040"; ctx.fill(); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(ax, ay, 29, 0, Math.PI * 2); ctx.strokeStyle = diffColor; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = "9px Arial"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textAlign = "center";
  ctx.fillText(username.substring(0, 14), ax, ay + 40); ctx.textAlign = "left";

  const statsY    = 90;
  const elapsed   = Math.floor((Date.now() - game.startTime) / 1000);
  const remaining = Math.max(0, TIME_LIMIT - elapsed);
  const accuracy  = game.attempts > 0 ? Math.round((game.matched / game.attempts) * 100) : 100;

  const statItems = [
    { label: "PAIRS",     value: `${game.matched}/${game.totalPairs}`, color: game.matched === game.totalPairs ? "#34d399" : "#e0d4ff" },
    { label: "TRIES",     value: `${game.attempts}`,                   color: "#e0d4ff" },
    { label: "PRECISION", value: `${accuracy}%`,                       color: accuracy >= 80 ? "#34d399" : accuracy >= 50 ? "#f59e0b" : "#ef4444" },
    { label: "TIME",      value: timeStr(remaining),                   color: remaining <= 60 ? "#ef4444" : remaining <= 120 ? "#f59e0b" : diffColor },
    { label: "BET",       value: `${game.betFormatted}$`,              color: "#fbbf24" }
  ];
  if (player2Name) statItems.push({ label: "VS", value: player2Name.substring(0, 10), color: "#a855f7" });

  const sW = (W - 50) / statItems.length;
  for (let i = 0; i < statItems.length; i++) {
    const sx = 25 + i * sW;
    ctx.fillStyle = "rgba(255,255,255,0.05)"; roundRect(ctx, sx + 2, statsY - 14, sW - 4, 48, 7); ctx.fill();
    ctx.font = "7px Arial"; ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText(statItems[i].label, sx + 7, statsY + 2);
    ctx.font = `bold ${statItems[i].value.length > 9 ? "10" : "13"}px Arial`; ctx.fillStyle = statItems[i].color;
    ctx.fillText(statItems[i].value, sx + 7, statsY + 24);
  }

  for (let c = 0; c < cols; c++) {
    const label = String.fromCharCode(65 + c);
    const cx    = PAD_L + c * (CELL + GUTTER) + CELL / 2;
    ctx.font = "bold 12px Arial"; ctx.fillStyle = diffColor + "cc"; ctx.textAlign = "center";
    ctx.fillText(label, cx, PAD_T - 14); ctx.textAlign = "left";
  }
  for (let r = 0; r < rows; r++) {
    const ry = PAD_T + r * (CELL + GUTTER) + CELL / 2 + 5;
    ctx.font = "bold 12px Arial"; ctx.fillStyle = diffColor + "cc"; ctx.textAlign = "right";
    ctx.fillText(String(r + 1), PAD_L - 14, ry); ctx.textAlign = "left";
  }

  for (let idx = 0; idx < game.board.length; idx++) {
    const r = Math.floor(idx / cols), c = idx % cols;
    const cx = PAD_L + c * (CELL + GUTTER), cy = PAD_T + r * (CELL + GUTTER);
    const isMatched  = game.revealed[idx];
    const isFlipped  = lastFlipped?.includes(idx);
    const isMatchNow = lastMatch?.includes(idx);
    const isMissNow  = lastMiss?.includes(idx);
    const emoji      = game.board[idx];
    const emojiGlow  = getEmojiGlow(emoji);

    let strokeColor, strokeW, gradTop, gradBot;
    if (isMatched)      { strokeColor = emojiGlow;  strokeW = 2.5; gradTop = "#0d2e1a"; gradBot = "#061410"; }
    else if (isMatchNow){ strokeColor = "#34d399";  strokeW = 3.5; gradTop = "#0d3020"; gradBot = "#061a10"; }
    else if (isMissNow) { strokeColor = "#ef4444";  strokeW = 3;   gradTop = "#2e0d0d"; gradBot = "#1a0606"; }
    else if (isFlipped) { strokeColor = emojiGlow;  strokeW = 3;   gradTop = "#1a1040"; gradBot = "#0d0820"; }
    else                { strokeColor = diffColor + "44"; strokeW = 1.5; gradTop = "#110f30"; gradBot = "#08061a"; }

    const cellG = ctx.createLinearGradient(cx, cy, cx, cy + CELL);
    cellG.addColorStop(0, gradTop); cellG.addColorStop(1, gradBot);
    ctx.fillStyle = cellG;
    roundRect(ctx, cx, cy, CELL, CELL, 13); ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeW; ctx.stroke();

    if (isMatched || isFlipped || isMatchNow || isMissNow) {
      const glowColor = isMatchNow ? "#34d399" : isMissNow ? "#ef4444" : emojiGlow;
      const radGlow = ctx.createRadialGradient(cx + CELL / 2, cy + CELL / 2, 4, cx + CELL / 2, cy + CELL / 2, CELL * 0.52);
      radGlow.addColorStop(0, glowColor + "40"); radGlow.addColorStop(0.5, glowColor + "18"); radGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radGlow; roundRect(ctx, cx + 2, cy + 2, CELL - 4, CELL - 4, 11); ctx.fill();

      ctx.shadowColor = isMatchNow ? "#34d399" : isMissNow ? "#ef4444" : emojiGlow;
      ctx.shadowBlur  = isMatchNow ? 28 : isMissNow ? 20 : isMatched ? 22 : 18;
      ctx.font = "44px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
      ctx.fillText(emoji, cx + CELL / 2, cy + CELL / 2 + 18);
      ctx.shadowBlur = 0; ctx.textAlign = "left";
    } else {
      const hiddenBg = ctx.createRadialGradient(cx + CELL / 2, cy + CELL / 2, 2, cx + CELL / 2, cy + CELL / 2, CELL * 0.5);
      hiddenBg.addColorStop(0, diffColor + "18"); hiddenBg.addColorStop(1, "transparent");
      ctx.fillStyle = hiddenBg; roundRect(ctx, cx + 4, cy + 4, CELL - 8, CELL - 8, 9); ctx.fill();
      ctx.font = "bold 22px Arial"; ctx.fillStyle = diffColor + "50"; ctx.textAlign = "center";
      ctx.fillText("?", cx + CELL / 2, cy + CELL / 2 + 8); ctx.textAlign = "left";
    }
  }

  const footerY = H - 70;
  ctx.fillStyle = diffColor + "14"; roundRect(ctx, 25, footerY, W - 50, 36, 8); ctx.fill();
  ctx.font = "bold 11px Arial"; ctx.fillStyle = diffColor; ctx.textAlign = "center";
  ctx.fillText("Type: A1 B3  or  A1", W / 2, footerY + 24); ctx.textAlign = "left";

  ctx.font = "8px Arial"; ctx.fillStyle = diffColor + "44"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MEMORY v6.0", W / 2, H - 14); ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

async function sendBoard(message, game, username, avatarUrl, lastFlipped, lastMatch, lastMiss, bodyLines, player2Name) {
  const body = UI(bodyLines);
  try {
    const img = await generateBoardImage({ game, username, avatarUrl, lastFlipped, lastMatch, lastMiss, player2Name });
    const p   = `./memory_board_${game.uid}_${Date.now()}.png`;
    fs.writeFileSync(p, img);
    await message.reply({ body, attachment: fs.createReadStream(p) });
    fs.unlinkSync(p);
  } catch { await message.reply(body); }
}

function clearGameTimeout(uid) {
  const th = gameTimeouts.get(uid);
  if (th) { clearTimeout(th); gameTimeouts.delete(uid); }
}

function removeGame(uid, partnerId) {
  activeGames.delete(uid);
  if (partnerId) activeGames.delete(partnerId);
  mpGames.delete(uid);
  onlineGames.delete(uid);
  if (partnerId) onlineGames.delete(partnerId);
  saveGames(); saveMPGames(); saveOnlineGames();
}

async function endGame(uid, message, api, win) {
  const game = activeGames.get(uid) || mpGames.get(uid) || onlineGames.get(uid);
  if (!game) return;

  clearGameTimeout(uid);
  if (game.partnerId) clearGameTimeout(game.partnerId);
  
  // Get partner's thread if online
  const partnerThread = game.isOnline ? game.partnerThread : null;
  removeGame(uid, game.partnerId);

  const diff       = game.difficulty && DIFFICULTIES[game.difficulty] ? DIFFICULTIES[game.difficulty] : MP_CONFIG;
  const timeTaken  = Math.floor((Date.now() - game.startTime) / 1000);
  const speedBonus = win && timeTaken <= (diff.bonusSpeed || 200);
  const baseMult   = speedBonus ? (diff.bonusMult || 8) : (diff.multiplier || 4);
  const penaltyPct = Math.min((game.hintPenalty || 0) * 0.20, 0.80);
  const finalMult  = Math.max(parseFloat((baseMult * (1 - penaltyPct)).toFixed(2)), 1);
  const accuracy   = game.attempts > 0 ? Math.round((game.matched / game.attempts) * 100) : 0;

  recordGameResult(uid, win, timeTaken, accuracy, game.matched);
  if (game.partnerId) recordGameResult(game.partnerId, win, timeTaken, accuracy, game.matched);

  if (win) {
    const multInt = BigInt(Math.floor(finalMult * 100));
    const earned  = game.bet * multInt / 100n;

    if (game.isMultiplayer || game.isOnline) {
      const half = earned / 2n;
      await updateUserCash(uid, half);
      await updateUserCash(game.partnerId, half);
      const fEarned = await formatNumber(half);
      const fNewU   = await formatNumber(await getUserCash(uid));
      const fNewP   = await formatNumber(await getUserCash(game.partnerId));
      
      const msg = UI([
        "WIN! (50/50 split)", "---",
        `+${fEarned}$ each`,
        `Your balance: ${fNewU}$`,
        `Partner balance: ${fNewP}$`,
        `Multiplier: x${finalMult}${speedBonus ? " (speed bonus)" : ""}`
      ]);
      
      await message.reply(msg);
      if (game.isOnline && partnerThread) {
        const partnerMsg = await message.reply(msg);
        // Send to partner's thread if needed
      }
    } else {
      await updateUserCash(uid, earned);
      const fEarned = await formatNumber(earned);
      const fNew    = await formatNumber(await getUserCash(uid));
      await message.reply(UI([
        "VICTORY!", "---",
        `+${fEarned}$ (x${finalMult})${speedBonus ? " — speed bonus!" : ""}`,
        `Balance: ${fNew}$`,
        `Accuracy: ${accuracy}% | Time: ${timeStr(timeTaken)}`
      ]));
    }
  } else {
    if (game.isMultiplayer || game.isOnline) {
      const fNew = await formatNumber(await getUserCash(uid));
      await message.reply(UI([
        "TIME'S UP (50/50 lost)", "---",
        `-${game.betFormatted}$`,
        `Balance: ${fNew}$`
      ]));
    } else {
      const fNew = await formatNumber(await getUserCash(uid));
      await message.reply(UI([
        "TIME'S UP!", "---",
        `-${game.betFormatted}$`,
        `Balance: ${fNew}$`,
        `Pairs found: ${game.matched}/${game.totalPairs}`
      ]));
    }
  }
}

async function processMove(coord1, coord2, game, uid, message, api) {
  game.attempts++;
  const isMatch = game.board[coord1.index] === game.board[coord2.index];
  const [username, avatarUrl] = await Promise.all([getUserName(uid, api), getUserAvatar(uid, api)]);
  const arg1Str = `${String.fromCharCode(65 + coord1.col)}${coord1.row + 1}`;
  const arg2Str = `${String.fromCharCode(65 + coord2.col)}${coord2.row + 1}`;

  if (isMatch) {
    game.revealed[coord1.index] = true;
    game.revealed[coord2.index] = true;
    game.matched++;

    if ((game.isMultiplayer || game.isOnline) && game.partnerId) {
      const partnerGame = activeGames.get(game.partnerId) || onlineGames.get(game.partnerId);
      if (partnerGame) {
        partnerGame.revealed[coord1.index] = true;
        partnerGame.revealed[coord2.index] = true;
        partnerGame.matched = game.matched;
        partnerGame.attempts = game.attempts;
      }
    }
    saveGames(); saveMPGames(); saveOnlineGames();

    if (game.matched >= game.totalPairs) {
      await sendBoard(message, game, username, avatarUrl, [coord1.index, coord2.index], [coord1.index, coord2.index], [],
        [`MATCH! ${game.board[coord1.index]}`, `${arg1Str} & ${arg2Str}`, "ALL PAIRS FOUND!"], game.player2Name);
      return endGame(uid, message, api, true);
    }

    await sendBoard(message, game, username, avatarUrl, [coord1.index, coord2.index], [coord1.index, coord2.index], [],
      [`MATCH! ${game.board[coord1.index]}`, `${arg1Str} & ${arg2Str}`, `Pairs: ${game.matched}/${game.totalPairs}`], game.player2Name);
  } else {
    await sendBoard(message, game, username, avatarUrl, [coord1.index, coord2.index], [], [coord1.index, coord2.index],
      [`No match`, `${arg1Str} ≠ ${arg2Str}`, `Pairs: ${game.matched}/${game.totalPairs}`], game.player2Name);
  }
}

async function handleCoords(uid, rawArg0, rawArg1, message, api) {
  const game = activeGames.get(uid) || onlineGames.get(uid);
  if (!game) return false;

  const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
  if (elapsed >= TIME_LIMIT) { await endGame(uid, message, api, false); return true; }

  const rows   = Math.ceil(game.board.length / game.cols);
  const coord1 = parseCoord(rawArg0, game.cols, rows);
  const coord2 = rawArg1 ? parseCoord(rawArg1, game.cols, rows) : null;
  if (!coord1) return false;

  if (!coord2) {
    if (game.firstCard !== null && game.firstCard !== coord1.index) {
      const c1 = { index: game.firstCard, row: Math.floor(game.firstCard / game.cols), col: game.firstCard % game.cols };
      if (game.revealed[c1.index] || game.revealed[coord1.index]) {
        game.firstCard = null;
        await message.reply(UI(["Already found!"]));
        return true;
      }
      game.firstCard = null;
      await processMove(c1, coord1, game, uid, message, api);
      return true;
    }
    if (game.revealed[coord1.index]) { await message.reply(UI(["Already found!"])); return true; }
    game.firstCard = coord1.index;
    saveGames(); saveOnlineGames();
    const [username, avatarUrl] = await Promise.all([getUserName(uid, api), getUserAvatar(uid, api)]);
    await sendBoard(message, game, username, avatarUrl, [coord1.index], [], [],
      [`${rawArg0.toUpperCase()} → ${game.board[coord1.index]}`, "Choose 2nd card"], game.player2Name);
    return true;
  }

  if (coord1.index === coord2.index) { await message.reply(UI(["Pick two different cards!"])); return true; }
  if (game.revealed[coord1.index] || game.revealed[coord2.index]) { await message.reply(UI(["Already found!"])); return true; }
  game.firstCard = null;
  await processMove(coord1, coord2, game, uid, message, api);
  return true;
}

module.exports = {
  config: {
    name:             "memory",
    version:          "6.0",
    author:           "Ismael03-Dev",
    countDown:        2,
    role:             0,
    category:         "fun",
    shortDescription: { en: "Memory Game — Solo, Multi & Online" }
  },

  onStart: async function ({ args, message, event, api }) {
    const uid = String(event.senderID);
    const threadId = String(event.threadID);
    const p   = global.utils.getPrefix(event.threadID);
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "help") {
      return message.reply(UI([
        "MEMORY v6.0", "---",
        `${p}memory start <bet> [diff] [theme]`,
        `${p}memory multi @user`,
        `${p}memory online <user_id> <group_id>`,
        `${p}memory stats`,
        `${p}memory leaderboard`,
        `${p}memory abandon`, "---",
        "Diff: facile/normal/difficile/extreme",
        "Themes: animaux/fruits/casino/espace",
        "Multi: 5x5 grid, 12 pairs, x4-x8",
        "Online: Play across different groups!"
      ]));
    }

    // ONLINE COMMAND
    if (sub === "online" || sub === "cross") {
      const targetId = args[1];
      const targetThreadId = args[2];

      if (!targetId || !targetThreadId) {
        return message.reply(UI([
          "ONLINE MODE", "---",
          `${p}memory online <user_id> <group_id>`,
          "Play with someone in a different group!"
        ]));
      }

      if (targetId === uid) {
        return message.reply(UI(["You can't play with yourself!"]));
      }

      // Check if target is in the same thread
      if (targetThreadId === threadId) {
        return message.reply(UI([
          "❌ Online mode is for cross-group play!",
          "If you want to play with someone in the same group,",
          `use: ${p}memory multi @user`
        ]));
      }

      // Check if target has a game
      if (activeGames.has(targetId) || mpGames.has(targetId) || onlineGames.has(targetId)) {
        return message.reply(UI(["That player is already in a game."]));
      }

      if (onlineGames.has(uid)) {
        return message.reply(UI(["You already have an online game in progress."]));
      }

      // Check if there's already an invite
      for (const [key, invite] of onlineInvites) {
        if (invite.targetId === targetId || invite.uid === targetId) {
          return message.reply(UI(["This player already has a pending online invite."]));
        }
      }

      // Create invite
      const inviteId = `invite_${Date.now()}`;
      onlineInvites.set(inviteId, {
        uid,
        targetId,
        targetThreadId,
        threadId,
        timestamp: Date.now(),
        bet: null,
        phase: "awaiting_response"
      });

      const inviterName = await getUserName(uid, api);
      const targetName = await getUserName(targetId, api);

      // Send invite to target's group
      try {
        const inviteMsg = `🎮 ${inviterName} wants to play Memory with you!\n\n` +
          `Reply with "oui" to accept or "non" to decline.\n` +
          `(This invite will expire in 60 seconds)`;

        await api.sendMessage(
          { body: UI([inviteMsg]) },
          targetThreadId
        );
      } catch (err) {
        onlineInvites.delete(inviteId);
        return message.reply(UI([
          "❌ Could not send invite to target's group.",
          "Make sure the group ID is correct and the bot is in that group."
        ]));
      }

      // Set timeout for invite
      setTimeout(() => {
        if (onlineInvites.has(inviteId)) {
          onlineInvites.delete(inviteId);
          // Notify inviter
          message.reply(UI(["⏰ Invite expired (no response)."]));
        }
      }, 60000);

      return message.reply(UI([
        "✅ Invite sent!", "---",
        `To: ${targetName}`,
        `Group: ${targetThreadId}`,
        "Waiting for response... (60s timeout)"
      ]));
    }

    // Handle online invite responses (oui/non)
    if (onlineInvites.size > 0) {
      const response = sub === "oui" ? "accept" : sub === "non" ? "decline" : null;
      if (response) {
        let foundInvite = null;
        let inviteId = null;
        for (const [id, invite] of onlineInvites) {
          if (invite.targetId === uid) {
            foundInvite = invite;
            inviteId = id;
            break;
          }
        }

        if (foundInvite) {
          if (response === "decline") {
            onlineInvites.delete(inviteId);
            await message.reply(UI(["❌ You declined the invitation."]));
            // Notify inviter
            try {
              await api.sendMessage(
                { body: UI([`${await getUserName(uid, api)} declined your invitation.`]) },
                foundInvite.threadId
              );
            } catch {}
            return;
          }

          // ACCEPT
          onlineInvites.delete(inviteId);

          // Check if both have enough cash
          const inviterCash = await getUserCash(foundInvite.uid);
          const targetCash = await getUserCash(uid);

          // Ask for bet amount
          await message.reply(UI([
            "✅ Invitation accepted!", "---",
            "Both players must now place their bet.",
            `Type: ${p}memory onlinebet <amount>`,
            "The bet must be the same for both players."
          ]));

          // Save pending online game
          const gameId = `online_${foundInvite.uid}_${uid}`;
          onlineGames.set(gameId, {
            uid: foundInvite.uid,
            partnerId: uid,
            partnerThread: foundInvite.threadId,
            playerThread: foundInvite.targetThreadId,
            bet: 0n,
            betFormatted: "0",
            phase: "bet_p1",
            startTime: Date.now(),
            inviterName: await getUserName(foundInvite.uid, api),
            targetName: await getUserName(uid, api)
          });
          saveOnlineGames();

          // Notify inviter
          try {
            await api.sendMessage(
              { body: UI([
                "✅ Your invitation was accepted!",
                "---",
                `Both players must now place their bet.`,
                `Type: ${p}memory onlinebet <amount>`
              ]) },
              foundInvite.threadId
            );
          } catch {}

          return;
        }
      }
    }

    // ONLINE BET
    if (sub === "onlinebet" || sub === "obet") {
      const amount = await parseAmount(args[1]);
      if (amount <= 0n) return message.reply(UI(["Invalid amount."]));

      let gameEntry = null;
      let gameId = null;

      for (const [id, g] of onlineGames) {
        if (g.uid === uid || g.partnerId === uid) {
          gameEntry = g;
          gameId = id;
          break;
        }
      }

      if (!gameEntry) {
        return message.reply(UI(["No online game in progress.", `${p}memory online to start one.`]));
      }

      const cash = await getUserCash(uid);
      if (amount > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      const isInviter = gameEntry.uid === uid;

      if (gameEntry.phase === "bet_p1" && isInviter) {
        gameEntry.bet = amount;
        gameEntry.betFormatted = await formatNumber(amount);
        gameEntry.phase = "bet_p2";
        await updateUserCash(uid, -amount);
        saveOnlineGames();

        await message.reply(UI([
          `Your bet: ${gameEntry.betFormatted}$`,
          `Waiting for ${gameEntry.targetName} to bet...`
        ]));

        // Notify partner
        try {
          await api.sendMessage(
            { body: UI([
              `${gameEntry.inviterName} has placed their bet!`,
              `Place your bet: ${p}memory onlinebet <amount>`,
              `Must be exactly ${gameEntry.betFormatted}$`
            ]) },
            gameEntry.playerThread
          );
        } catch {}
        return;
      }

      if (gameEntry.phase === "bet_p2" && !isInviter) {
        if (amount !== gameEntry.bet) {
          // Refund inviter
          await updateUserCash(gameEntry.uid, gameEntry.bet);
          onlineGames.delete(gameId);
          saveOnlineGames();
          await message.reply(UI([
            "❌ Bets don't match!",
            `Yours: ${await formatNumber(amount)}$ — Theirs: ${gameEntry.betFormatted}$`,
            "Game cancelled, opponent refunded."
          ]));
          // Notify inviter
          try {
            await api.sendMessage(
              { body: UI([
                `${await getUserName(uid, api)} bet ${await formatNumber(amount)}$`,
                `Your bet was ${gameEntry.betFormatted}$`,
                "❌ Bets don't match! Game cancelled."
              ]) },
              gameEntry.threadId
            );
          } catch {}
          return;
        }

        await updateUserCash(uid, -amount);

        // Start the game
        const theme = "animaux";
        const board = createBoard(MP_CONFIG.cols, MP_CONFIG.pairs, theme);
        const revealed = new Array(board.length).fill(false);

        const baseGame = {
          difficulty: "online",
          theme,
          board,
          cols: MP_CONFIG.cols,
          totalPairs: MP_CONFIG.pairs,
          revealed,
          attempts: 0,
          matched: 0,
          hintPenalty: 0,
          startTime: Date.now(),
          bet: gameEntry.bet,
          betFormatted: gameEntry.betFormatted,
          firstCard: null,
          isMultiplayer: true,
          isOnline: true
        };

        const gameP1 = {
          ...baseGame,
          uid: gameEntry.uid,
          partnerId: uid,
          player2Name: gameEntry.targetName,
          partnerThread: gameEntry.playerThread,
          threadId: gameEntry.threadId
        };
        const gameP2 = {
          ...baseGame,
          uid,
          partnerId: gameEntry.uid,
          player2Name: gameEntry.inviterName,
          partnerThread: gameEntry.threadId,
          threadId: gameEntry.playerThread
        };

        onlineGames.set(gameId, gameP1);
        onlineGames.set(`online_${uid}_${gameEntry.uid}`, gameP2);
        onlineGames.delete(gameId);
        saveOnlineGames();

        const [uav1, uav2] = await Promise.all([
          getUserAvatar(gameEntry.uid, api),
          getUserAvatar(uid, api)
        ]);

        await sendBoard(message, gameP2, await getUserName(uid, api), uav2, [], [], [],
          ["ONLINE GAME STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${gameEntry.betFormatted}$ each`, `VS: ${gameEntry.inviterName}`]
        );

        // Send to inviter's thread
        try {
          await sendBoard(
            { reply: (msg) => api.sendMessage({ body: msg }, gameEntry.threadId) },
            gameP1,
            await getUserName(gameEntry.uid, api),
            uav1,
            [], [], [],
            ["ONLINE GAME STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${gameEntry.betFormatted}$ each`, `VS: ${gameEntry.targetName}`]
          );
        } catch {}

        const timeoutP1 = setTimeout(() => endGame(gameEntry.uid, message, api, false), TIME_LIMIT * 1000);
        gameTimeouts.set(gameEntry.uid, timeoutP1);
        const timeoutP2 = setTimeout(() => endGame(uid, message, api, false), TIME_LIMIT * 1000);
        gameTimeouts.set(uid, timeoutP2);

        return;
      }

      return message.reply(UI(["Not your turn to bet."]));
    }

    // MULTI COMMAND (same group)
    if (sub === "multi" || sub === "multiplayer" || sub === "duo") {
      const targetId = Object.keys(event.mentions || {})[0] || args[1];
      if (!targetId || targetId === uid)
        return message.reply(UI(["Mention a player.", `${p}memory multi @user`]));

      if (activeGames.has(uid) || mpGames.has(uid))
        return message.reply(UI(["You already have a game in progress."]));

      const alreadyInvited = [...mpGames.values()].some(g => g.uid === uid || g.targetId === uid);
      if (alreadyInvited) return message.reply(UI(["You already have a pending invitation."]));

      const targetBusy = activeGames.has(targetId) || [...mpGames.values()].some(g => g.uid === targetId || g.targetId === targetId);
      if (targetBusy) return message.reply(UI(["That player is already in a game or invitation."]));

      mpGames.set(uid, { uid, targetId, phase: "bet_p1", startTime: Date.now(), bet: 0n, betFormatted: "0" });
      saveMPGames();
      const targetName = await getUserName(targetId, api);
      return message.reply(UI([
        "MULTIPLAYER CHALLENGE", "---",
        `${await getUserName(uid, api)} VS ${targetName}`, "---",
        `Both players type: ${p}memory bet <amount>`,
        "Bets must match exactly."
      ]));
    }

    // Regular bet (for multiplayer)
    if (sub === "bet") {
      const amount = await parseAmount(args[1]);
      if (amount <= 0n) return message.reply(UI(["Invalid amount."]));

      let pendingEntry = null;
      let isInitiator  = false;

      if (mpGames.has(uid)) {
        pendingEntry = mpGames.get(uid);
        isInitiator  = true;
      } else {
        for (const [, g] of mpGames) {
          if (g.targetId === uid) { pendingEntry = g; isInitiator = false; break; }
        }
      }

      if (!pendingEntry)
        return message.reply(UI(["No pending multiplayer invitation.", `${p}memory multi @user to start one.`]));

      const cash = await getUserCash(uid);
      if (amount > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      if (isInitiator) {
        if (pendingEntry.phase !== "bet_p1")
          return message.reply(UI(["You already placed your bet. Waiting for opponent."]));

        pendingEntry.bet          = amount;
        pendingEntry.betFormatted = await formatNumber(amount);
        pendingEntry.phase        = "bet_p2";
        saveMPGames();
        await updateUserCash(uid, -amount);

        const targetName = await getUserName(pendingEntry.targetId, api);
        return message.reply(UI([
          `Your bet: ${pendingEntry.betFormatted}$`,
          `Waiting for ${targetName} to bet the same amount...`
        ]));
      }

      if (pendingEntry.phase !== "bet_p2")
        return message.reply(UI(["The challenger hasn't placed their bet yet. Please wait."]));

      if (amount !== pendingEntry.bet) {
        await updateUserCash(pendingEntry.uid, pendingEntry.bet);
        mpGames.delete(pendingEntry.uid);
        saveMPGames();
        return message.reply(UI([
          "Bets don't match!",
          `Yours: ${await formatNumber(amount)}$ — Theirs: ${pendingEntry.betFormatted}$`,
          "Game cancelled, opponent refunded."
        ]));
      }

      await updateUserCash(uid, -amount);

      const theme = "animaux";
      const board = createBoard(MP_CONFIG.cols, MP_CONFIG.pairs, theme);
      const revealed = new Array(board.length).fill(false);

      const [p1Name, p2Name] = await Promise.all([
        getUserName(pendingEntry.uid, api),
        getUserName(uid, api)
      ]);

      const baseGame = {
        difficulty: "multiplayer", theme, board, cols: MP_CONFIG.cols,
        totalPairs: MP_CONFIG.pairs, revealed, attempts: 0, matched: 0,
        hintPenalty: 0, startTime: Date.now(),
        bet: pendingEntry.bet, betFormatted: pendingEntry.betFormatted,
        firstCard: null, isMultiplayer: true
      };

      const gameP1 = { ...baseGame, uid: pendingEntry.uid, partnerId: uid, player2Name: p2Name };
      const gameP2 = { ...baseGame, uid, partnerId: pendingEntry.uid, player2Name: p1Name };

      activeGames.set(pendingEntry.uid, gameP1);
      activeGames.set(uid, gameP2);
      mpGames.delete(pendingEntry.uid);
      saveGames(); saveMPGames();

      const [uav1] = await Promise.all([getUserAvatar(pendingEntry.uid, api)]);
      await sendBoard(message, gameP1, p1Name, uav1, [], [], [],
        ["MULTIPLAYER STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${pendingEntry.betFormatted}$ each`, `Speed bonus: <${timeStr(MP_CONFIG.bonusSpeed)} → x${MP_CONFIG.bonusMult}`],
        p2Name
      );

      const timeoutP1 = setTimeout(() => endGame(pendingEntry.uid, message, api, false), TIME_LIMIT * 1000);
      gameTimeouts.set(pendingEntry.uid, timeoutP1);
      const timeoutP2 = setTimeout(() => endGame(uid, message, api, false), TIME_LIMIT * 1000);
      gameTimeouts.set(uid, timeoutP2);

      return;
    }

    // Regular solo game
    if (sub === "start" || sub === "jouer" || sub === "play") {
      if (activeGames.has(uid)) return message.reply(UI(["Game already in progress."]));
      if (mpGames.has(uid)) return message.reply(UI(["You have a pending multiplayer invitation. Finish or abandon it first."]));

      const bet        = await parseAmount(args[1]);
      const difficulty = DIFFICULTIES[args[2]?.toLowerCase()] ? args[2].toLowerCase() : "normal";
      const theme      = CARD_THEMES[args[3]?.toLowerCase()] ? args[3].toLowerCase() : "animaux";

      if (bet <= 0n) return message.reply(UI(["Invalid bet amount."]));
      const cash = await getUserCash(uid);
      if (bet > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      await updateUserCash(uid, -bet);
      const diff  = DIFFICULTIES[difficulty];
      const board = createBoard(diff.cols, diff.pairs, theme);

      const game = {
        uid, difficulty, theme, board, cols: diff.cols, totalPairs: diff.pairs,
        revealed: new Array(board.length).fill(false), attempts: 0, matched: 0,
        hintPenalty: 0, startTime: Date.now(), bet, betFormatted: await formatNumber(bet),
        firstCard: null, isMultiplayer: false
      };
      activeGames.set(uid, game);
      saveGames();

      const [uname, uav] = await Promise.all([getUserName(uid, api), getUserAvatar(uid, api)]);
      await sendBoard(message, game, uname, uav, [], [], [],
        ["SOLO GAME", "---", `${difficulty} • ${theme}`, `Pairs: ${diff.pairs}`, `Bet: ${game.betFormatted}$`]
      );

      const timeout = setTimeout(() => endGame(uid, message, api, false), TIME_LIMIT * 1000);
      gameTimeouts.set(uid, timeout);
      return;
    }

    // Stats, Leaderboard, Abandon
    if (sub === "stats") {
      const [username] = await Promise.all([getUserName(uid, api)]);
      const s = getPlayerStats(uid);
      const winRate = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
      return message.reply(UI([
        `${username} — Stats`, "---",
        `Games: ${s.gamesPlayed}`,
        `Wins: ${s.gamesWon} | Losses: ${s.gamesLost}`,
        `Win rate: ${winRate}%`,
        `Best time: ${s.bestTime !== null ? timeStr(s.bestTime) : "—"}`,
        `Best accuracy: ${s.bestAccuracy}%`,
        `Total pairs found: ${s.totalPairsFound}`
      ]));
    }

    if (sub === "leaderboard" || sub === "top") {
      const entries = Object.entries(playerStats)
        .filter(([, s]) => s.gamesPlayed > 0)
        .sort((a, b) => b[1].gamesWon - a[1].gamesWon)
        .slice(0, 10);
      if (!entries.length) return message.reply(UI(["No players yet."]));
      const lines = ["LEADERBOARD", "---"];
      for (let i = 0; i < entries.length; i++) {
        const [id, s] = entries[i];
        const name = await getUserName(id, api).catch(() => id.slice(-5));
        lines.push(`${i + 1}. ${name} — ${s.gamesWon}W / ${s.gamesPlayed}G`);
      }
      return message.reply(UI(lines));
    }

    if (sub === "abandon" || sub === "quit") {
      const game = activeGames.get(uid) || mpGames.get(uid) || onlineGames.get(uid);
      if (!game) return message.reply(UI(["No active game."]));

      clearGameTimeout(uid);
      if (game.partnerId) clearGameTimeout(game.partnerId);

      if (game.bet && game.bet > 0n && !mpGames.has(uid) && !onlineGames.has(uid)) {
        await updateUserCash(uid, -game.bet);
      } else if (mpGames.has(uid) && game.bet > 0n) {
        await updateUserCash(uid, game.bet);
      }

      removeGame(uid, game.partnerId);
      return message.reply(UI(["Game abandoned.", game.betFormatted !== "0" ? `Lost: -${game.betFormatted}$` : ""]));
    }

    // Handle coordinates (A1, B2 etc)
    const handled = await handleCoords(uid, args[0], args[1], message, api);
    if (!handled) return message.reply(UI([`Unknown command. Type ${p}memory help`]));
  },

  onChat: async function ({ message, event, api }) {
    const uid  = String(event.senderID);
    const body = (event.body || "").trim().toUpperCase();
    const twoCards = body.match(/^([A-Z]\d+)\s+([A-Z]\d+)$/);
    const oneCard  = body.match(/^([A-Z]\d+)$/);
    
    // Handle online invite responses
    const response = body.match(/^(OUI|NON)$/);
    if (response && onlineInvites.size > 0) {
      let foundInvite = null;
      let inviteId = null;
      for (const [id, invite] of onlineInvites) {
        if (invite.targetId === uid) {
          foundInvite = invite;
          inviteId = id;
          break;
        }
      }
      
      if (foundInvite) {
        const answer = response[0] === "OUI";
        if (!answer) {
          onlineInvites.delete(inviteId);
          await message.reply(UI(["❌ You declined the invitation."]));
          try {
            await api.sendMessage(
              { body: UI([`${await getUserName(uid, api)} declined your invitation.`]) },
              foundInvite.threadId
            );
          } catch {}
          return;
        }
        
        // ACCEPT (same logic as before but from onChat)
        onlineInvites.delete(inviteId);
        await message.reply(UI([
          "✅ Invitation accepted!",
          "Both players must now place their bet.",
          `Type: ${global.utils.getPrefix(event.threadID)}memory onlinebet <amount>`
        ]));
        
        const gameId = `online_${foundInvite.uid}_${uid}`;
        onlineGames.set(gameId, {
          uid: foundInvite.uid,
          partnerId: uid,
          partnerThread: foundInvite.threadId,
          playerThread: foundInvite.targetThreadId,
          bet: 0n,
          betFormatted: "0",
          phase: "bet_p1",
          startTime: Date.now(),
          inviterName: await getUserName(foundInvite.uid, api),
          targetName: await getUserName(uid, api)
        });
        saveOnlineGames();
        
        try {
          await api.sendMessage(
            { body: UI([
              "✅ Your invitation was accepted!",
              `Both players must now place their bet.`,
              `Type: ${global.utils.getPrefix(event.threadID)}memory onlinebet <amount>`
            ]) },
            foundInvite.threadId
          );
        } catch {}
        return;
      }
    }
    
    if (!twoCards && !oneCard) return;
    if (!activeGames.has(uid) && !onlineGames.has(uid)) return;
    if (twoCards) await handleCoords(uid, twoCards[1], twoCards[2], message, api);
    else if (oneCard) await handleCoords(uid, oneCard[1], null, message, api);
  }
};