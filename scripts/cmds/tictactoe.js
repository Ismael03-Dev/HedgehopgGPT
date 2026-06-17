const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const FORMAT_URL  = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL    = "https://cash-api-five.vercel.app/api/cash";
const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_KEY = "VCFZLWLWcxk6SIMIZHa0HjGr2rRwrZhN";

const MAX_LIMIT  = 10n ** 261n;
const STATS_FILE = path.join(__dirname, "tictactoe_stats.json");
const ASSETS_DIR = path.join(__dirname, "tictactoe_assets");
const BOT_UID    = global.botID;
const BOT_NAME   = "Hedgehog GPT";

let games       = {};
let tournaments = {};
let playerStats = loadStats();

const playerCache       = new Map();
const imageModeByThread = {};

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE))
      return JSON.parse(fs.readFileSync(STATS_FILE, "utf8") || "{}");
  } catch { return {}; }
  return {};
}

function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {}
}

function ensurePlayerStats(id) {
  if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, draws: 0, played: 0 };
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
    const r = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 5000 });
    if (r.data?.success) {
      if (r.data.isInfinity) return "∞";
      return r.data.formatted;
    }
  } catch {}
  const suffixes = ["","k","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc","UDc","DDc","TDc","QaDc","QiDc","SxDc","SpDc","OcDc","NoDc","kN","MN","BN","TN","QaN","QiN","SxN","SpN","OcN","NoN","DcN"];
  let scaled = big, suffixIndex = 0;
  const thousand = 1000n;
  while (scaled >= thousand && suffixIndex < suffixes.length - 1) { scaled = scaled / thousand; suffixIndex++; }
  if (suffixIndex === suffixes.length - 1 && scaled >= thousand) return "∞";
  const divisor  = thousand ** BigInt(suffixIndex);
  const remainder = (big % divisor) * 100n / divisor;
  if (suffixIndex > 0 && remainder > 0n) {
    const decStr = remainder.toString().padStart(2, "0").slice(0, 2).replace(/0+$/, "");
    return decStr ? `${scaled}.${decStr}${suffixes[suffixIndex]}` : `${scaled}${suffixes[suffixIndex]}`;
  }
  if (suffixIndex === 0) return big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${scaled}${suffixes[suffixIndex]}`;
}

const SFX = { k:1_000n, m:1_000_000n, b:1_000_000_000n, t:1_000_000_000_000n, qa:10n**15n, qi:10n**18n, sx:10n**21n, sp:10n**24n, oc:10n**27n, no:10n**30n, dc:10n**33n };

async function parseAmount(input) {
  if (!input) return 0n;
  const str = String(input).toLowerCase().trim();
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`, { timeout: 5000 });
    if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw);
  } catch {}
  const m = str.match(/^(-?\d+(?:\.\d+)?)([a-zA-Z]+)?$/i);
  if (!m) return 0n;
  const val = parseFloat(m[1]);
  const sfx = (m[2] || "").toLowerCase();
  const base = BigInt(Math.floor(Math.abs(val)));
  const neg  = val < 0;
  if (isNaN(val)) return 0n;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx];
  if (mult) { const result = base * mult; if (result >= MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT; return neg ? -result : result; }
  return neg ? -base : base;
}

async function getUserCash(uid) {
  try {
    const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 10000 });
    if (r.data?.success && r.data?.data) { const cash = toBigInt(r.data.data.cash); return cash >= MAX_LIMIT ? MAX_LIMIT : cash; }
  } catch {}
  return 0n;
}

async function updateUserCash(uid, amount) {
  const a = toBigInt(amount);
  try {
    if (a > 0n) { await axios.post(`${CASH_URL}/${uid}/add`, { amount: a.toString() }); return true; }
    else if (a < 0n) { await axios.post(`${CASH_URL}/${uid}/subtract`, { amount: (-a).toString() }); return true; }
    return true;
  } catch (e) { console.error("Cash update:", e.message); return false; }
}

function checkWinner(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of wins) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return null;
}

function isBoardFull(board) { return board.every(c => c !== null); }

function displayBoard(board) {
  let d = "";
  for (let i = 0; i < 9; i++) {
    d += board[i] === "X" ? "❌" : board[i] === "O" ? "⭕" : "⬜";
    d += (i + 1) % 3 === 0 ? "\n" : " ";
  }
  return d;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}

function getAvailableMoves(board) { return board.map((v,i) => v===null?i:-1).filter(i=>i!==-1); }

// ─── AVATAR LOADER ────────────────────────────────────────────────────────────

async function loadImageFromUrl(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });
    const { loadImage } = require("canvas");
    return await loadImage(Buffer.from(res.data));
  } catch {
    return null;
  }
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

// ─── DRAW HELPERS ─────────────────────────────────────────────────────────────

function lightenColor(hex, amt) {
  const n = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function drawAvatar(ctx, info, cx, cy, radius, borderColor) {
  if (info.avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(info.avatar, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
    grad.addColorStop(0, lightenColor(borderColor, 60));
    grad.addColorStop(1, borderColor);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.font = `bold ${Math.floor(radius * 0.9)}px Arial`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((info.name || "?")[0].toUpperCase(), cx, cy);
    ctx.textBaseline = "alphabetic";
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = 4;
  ctx.stroke();
}

function drawX(ctx, cx, cy, size, color = "#f87171") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(8, size * 0.22);
  ctx.lineCap     = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur  = 24;
  ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke();
  ctx.restore();
}

function drawO(ctx, cx, cy, size, color = "#34d399") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(8, size * 0.22);
  ctx.lineCap     = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur  = 24;
  ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawCellSymbol(ctx, symbol, cx, cy, size) {
  if (symbol === "X") drawX(ctx, cx, cy, size);
  else if (symbol === "O") drawO(ctx, cx, cy, size);
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

// ─── AI ───────────────────────────────────────────────────────────────────────

async function aiMoveMistral(board, aiSymbol, humanSymbol) {
  const available = getAvailableMoves(board);
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];

  const boardDisplay = [];
  for (let i = 0; i < 9; i++) boardDisplay.push(board[i] === null ? (i + 1) : board[i]);

  const prompt = `You are playing TicTacToe. You are "${aiSymbol}". Opponent is "${humanSymbol}".
Current board (1-9):
${boardDisplay[0]} | ${boardDisplay[1]} | ${boardDisplay[2]}
${boardDisplay[3]} | ${boardDisplay[4]} | ${boardDisplay[5]}
${boardDisplay[6]} | ${boardDisplay[7]} | ${boardDisplay[8]}
Available moves: ${available.map(i => i + 1).join(", ")}
Play to WIN. Block opponent. Return ONLY one number (1-9).`;

  try {
    const res = await axios.post(MISTRAL_API,
      { model: "mistral-large-latest", messages: [{ role: "user", content: prompt }], max_tokens: 10, temperature: 0.1 },
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MISTRAL_KEY}` }, timeout: 10000 }
    );
    const reply = res.data.choices[0].message.content.trim();
    const move  = parseInt(reply.match(/\d/)?.[0]) - 1;
    if (available.includes(move)) return move;
    const altMatch = reply.match(/\d/g);
    if (altMatch) for (const d of altMatch) { const alt = parseInt(d) - 1; if (available.includes(alt)) return alt; }
    return fallbackAI(board, aiSymbol, humanSymbol);
  } catch (err) {
    console.error("[Mistral AI]", err.message);
    return fallbackAI(board, aiSymbol, humanSymbol);
  }
}

function fallbackAI(board, ai, human) {
  for (const m of getAvailableMoves(board)) { const c=[...board]; c[m]=ai; if (checkWinner(c)===ai) return m; }
  for (const m of getAvailableMoves(board)) { const c=[...board]; c[m]=human; if (checkWinner(c)===human) return m; }
  if (board[4]===null) return 4;
  const corners = [0,2,6,8].filter(i=>board[i]===null);
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
  const moves = getAvailableMoves(board);
  return moves.length ? moves[Math.floor(Math.random()*moves.length)] : null;
}

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────

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
    isTournamentGame: !!opts.isTournamentGame,
    tournamentID: opts.tournamentID || null,
    matchIndex: opts.matchIndex != null ? opts.matchIndex : null,
    isAI: !!opts.isAI,
    imageMode,
    moves: [],
    bets: opts.bets || null,
    odds: opts.odds || null
  };
}

// ─── CANVAS IMAGES ────────────────────────────────────────────────────────────

async function generateBoardImage(board, currentPlayer, players, usersData, gameType = "normal", bets = null, odds = null) {
  const W = 1400, H = 1060;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(0.5, "#0f0d20"); bg.addColorStop(1, "#070515");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  // Title
  ctx.font      = "bold 44px Arial";
  ctx.fillStyle = gameType === "tournament" ? "#fbbf24" : "#818cf8";
  ctx.textAlign = "center";
  ctx.shadowColor = gameType === "tournament" ? "#fbbf24" : "#818cf8";
  ctx.shadowBlur  = 16;
  ctx.fillText(gameType === "tournament" ? "ELITE TOURNAMENT" : "ULTIMATE TICTACTOE", W / 2, 68);
  ctx.shadowBlur = 0;

  // Load player infos
  const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

  // Board
  const BOARD_SIZE = 540;
  const bx = W / 2 - BOARD_SIZE / 2;
  const by = 130;

  ctx.fillStyle = "rgba(15,12,35,0.85)";
  roundRect(ctx, bx - 18, by - 18, BOARD_SIZE + 36, BOARD_SIZE + 36, 20); ctx.fill();
  ctx.strokeStyle = "rgba(129,140,248,0.5)"; ctx.lineWidth = 2.5; ctx.stroke();

  // Grid lines
  ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo(bx + (BOARD_SIZE / 3) * i, by); ctx.lineTo(bx + (BOARD_SIZE / 3) * i, by + BOARD_SIZE);
    ctx.moveTo(bx, by + (BOARD_SIZE / 3) * i); ctx.lineTo(bx + BOARD_SIZE, by + (BOARD_SIZE / 3) * i);
  }
  ctx.stroke();

  // Cell content
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const cx  = bx + col * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    const cy  = by + row * (BOARD_SIZE / 3) + BOARD_SIZE / 6;

    if (board[i] !== null) {
      drawCellSymbol(ctx, board[i], cx, cy, 78);
    } else {
      ctx.font      = "bold 28px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), cx, cy);
      ctx.textBaseline = "alphabetic";
    }
  }

  // Player panels
  const PANEL_W = 320, PANEL_H = 480;
  for (let i = 0; i < 2; i++) {
    const info      = playerInfos[i];
    const pdata     = players[i];
    const isCurrent = currentPlayer?.id === pdata.id;
    const px        = i === 0 ? 55 : W - PANEL_W - 55;
    const py        = 120;
    const symColor  = pdata.symbol === "X" ? "#f87171" : "#34d399";

    // Panel background
    const panelG = ctx.createLinearGradient(px, py, px, py + PANEL_H);
    panelG.addColorStop(0, isCurrent ? "rgba(99,102,241,0.22)" : "rgba(20,18,45,0.7)");
    panelG.addColorStop(1, isCurrent ? "rgba(99,102,241,0.08)" : "rgba(10,8,25,0.7)");
    ctx.fillStyle = panelG;
    roundRect(ctx, px, py, PANEL_W, PANEL_H, 24); ctx.fill();
    ctx.strokeStyle = isCurrent ? "#818cf8" : "rgba(255,255,255,0.12)";
    ctx.lineWidth   = isCurrent ? 2.5 : 1.5;
    ctx.stroke();

    // Avatar
    drawAvatar(ctx, info, px + PANEL_W / 2, py + 100, 70, symColor);

    // Name
    ctx.font      = "bold 24px Arial";
    ctx.fillStyle = isCurrent ? "#e0e7ff" : "#9ca3af";
    ctx.textAlign = "center";
    ctx.fillText(info.name.substring(0, 18), px + PANEL_W / 2, py + 200);

    // Symbol (X or O drawn)
    if (pdata.symbol === "X") drawX(ctx, px + PANEL_W / 2, py + 258, 28);
    else drawO(ctx, px + PANEL_W / 2, py + 258, 28);

    // Bets
    if (bets && odds) {
      const betAmt = bets?.[pdata.id];
      const odd    = odds?.[pdata.id];
      if (betAmt !== undefined) {
        ctx.font      = "bold 16px Arial";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`Bet: ${await formatNumber(toBigInt(betAmt))}$`, px + PANEL_W / 2, py + 310);
        if (odd) {
          ctx.fillStyle = "#86efac";
          ctx.fillText(`Odds: x${odd}`, px + PANEL_W / 2, py + 334);
          const potential = Math.floor(Number(toBigInt(betAmt)) * odd);
          ctx.fillStyle = "#c4b5fd";
          ctx.fillText(`Win: ${await formatNumber(toBigInt(potential))}$`, px + PANEL_W / 2, py + 358);
        }
      }
    }

    // Turn indicator
    if (isCurrent) {
      ctx.font        = "bold 20px Arial";
      ctx.fillStyle   = "#818cf8";
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur  = 10;
      ctx.fillText("YOUR TURN", px + PANEL_W / 2, py + PANEL_H - 30);
      ctx.shadowBlur = 0;
    }
  }

  // Turn info
  if (currentPlayer) {
    ctx.font      = "bold 32px Arial";
    ctx.fillStyle = "#e0e7ff";
    ctx.textAlign = "center";
    ctx.fillText(`Turn: ${currentPlayer.name}`, W / 2, by + BOARD_SIZE + 52);
    const avail = board.map((c, idx) => c === null ? idx + 1 : null).filter(Boolean);
    ctx.font      = "20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`Available: ${avail.join(" · ")}`, W / 2, by + BOARD_SIZE + 86);
  }

  // Footer
  ctx.font      = "12px Arial";
  ctx.fillStyle = "rgba(129,140,248,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE", W / 2, H - 12);

  return canvas.toBuffer("image/png");
}

async function generateEndGameImage(board, winner, players, usersData, isDraw, gainInfo = null) {
  const W = 1400, H = 1000;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, isDraw ? "#050d18" : winner ? "#06100a" : "#100506");
  bg.addColorStop(1, "#07050f");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  // Border
  const borderG = ctx.createLinearGradient(0, 0, W, H);
  borderG.addColorStop(0, isDraw ? "#60a5fa" : winner ? "#34d399" : "#f87171");
  borderG.addColorStop(1, isDraw ? "#3b82f6" : winner ? "#10b981" : "#ef4444");
  ctx.strokeStyle = borderG; ctx.lineWidth = 3;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();

  const playerInfos = await Promise.all(players.map(p => getPlayerInfo(p.id, usersData)));

  // Board
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

  // Cells
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const cx  = bx + col * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    const cy  = by + row * (BOARD_SIZE / 3) + BOARD_SIZE / 6;
    if (board[i] !== null) drawCellSymbol(ctx, board[i], cx, cy, 66);
  }

  // Player panels
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

    ctx.font      = "bold 22px Arial";
    ctx.fillStyle = isWin ? "#fbbf24" : "#e0e7ff";
    ctx.textAlign = "left";
    ctx.fillText(info.name.substring(0, 16), px + 112, py + 48);

    if (pdata.symbol === "X") drawX(ctx, px + 130, py + 90, 16);
    else drawO(ctx, px + 130, py + 90, 16);

    if (isWin) {
      ctx.font        = "bold 20px Arial";
      ctx.fillStyle   = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur  = 10;
      ctx.fillText("WINNER", px + 112, py + 138);
      ctx.shadowBlur = 0;
    }
  }

  // Result title
  const resultY = by + BOARD_SIZE + 30;
  ctx.font        = "bold 56px Arial";
  ctx.textAlign   = "center";
  ctx.fillStyle   = isDraw ? "#60a5fa" : "#fbbf24";
  ctx.shadowColor = isDraw ? "#60a5fa" : "#fbbf24";
  ctx.shadowBlur  = 24;
  ctx.fillText(isDraw ? "DRAW" : "VICTORY", W / 2, resultY);
  if (!isDraw && winner) {
    ctx.font = "bold 38px Arial";
    ctx.fillText(winner.name, W / 2, resultY + 52);
  }
  ctx.shadowBlur = 0;

  // Gain info
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
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE", W / 2, H - 14);

  return canvas.toBuffer("image/png");
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
  ctx.fillText("ELITE TOURNAMENT — BRACKET", W / 2, 90);
  ctx.shadowBlur = 0;

  ctx.font = "bold 32px Arial"; ctx.fillStyle = "#e0e7ff";
  ctx.fillText(`Status: ${getTournamentStatus(tournament)}`, W / 2, 148);

  if (tournament.status === "registration") {
    ctx.font = "bold 52px Arial"; ctx.fillStyle = "#818cf8";
    ctx.fillText("WAITING FOR PLAYERS", W / 2, H / 2 - 100);
    ctx.font = "bold 38px Arial"; ctx.fillStyle = "#9ca3af";
    ctx.fillText(`Registered: ${tournament.players.length} / ${tournament.requiredPlayers}`, W / 2, H / 2);
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
        ctx.fillText("WIN", x + 240, match.winner === match.player1 ? y + 38 : y + 82);
      }
    }
  }

  if (tournament.winner) {
    const w = tournament.players.find(p => p.id === tournament.winner);
    ctx.font = "bold 64px Arial"; ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 36;
    ctx.fillText(`CHAMPION: ${w?.name || "Champion"}`, W / 2, H - 80);
    ctx.shadowBlur = 0;
  }

  return canvas.toBuffer("image/png");
}

async function generateStatsImage(pid, usersData) {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(1, "#0f0d20");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  ctx.strokeStyle = "rgba(129,140,248,0.3)"; ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();

  const info  = await getPlayerInfo(pid, usersData);
  const stats = playerStats[pid] || { wins: 0, losses: 0, draws: 0, played: 0 };
  const wr    = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;

  ctx.font = "bold 56px Arial"; ctx.fillStyle = "#818cf8"; ctx.textAlign = "center";
  ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 20;
  ctx.fillText("TICTACTOE STATS", W / 2, 90);
  ctx.shadowBlur = 0;

  drawAvatar(ctx, info, W / 2, 310, 110, "#818cf8");

  ctx.font = "bold 44px Arial"; ctx.fillStyle = "#e0e7ff"; ctx.textAlign = "center";
  ctx.fillText(info.name, W / 2, 490);

  const items = [
    { label: "Wins",   val: stats.wins,   color: "#34d399" },
    { label: "Losses", val: stats.losses, color: "#f87171" },
    { label: "Draws",  val: stats.draws,  color: "#60a5fa" },
    { label: "Played", val: stats.played, color: "#fbbf24" }
  ];

  const colW2 = (W - 120) / 4;
  const sy    = 540;
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
  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(129,140,248,0.3)"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MORPION — ULTIMATE", W / 2, H - 14);

  return canvas.toBuffer("image/png");
}

function getTournamentStatus(t) {
  return { registration: "REGISTRATION", in_progress: "IN PROGRESS", completed: "COMPLETED" }[t.status] || "UNKNOWN";
}

// ─── SEND HELPERS ─────────────────────────────────────────────────────────────

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

async function applyAIMove(gameID, api, usersData) {
  const game = games[gameID];
  if (!game?.inProgress || !game.isAI) return;
  const aiIdx = game.players.findIndex(p => p.id === "AI");
  if (aiIdx === -1 || game.currentPlayerIndex !== aiIdx) return;

  const aiSym    = game.players[aiIdx].symbol;
  const humanSym = game.players[1 - aiIdx].symbol;
  const pos      = await aiMoveMistral(game.board, aiSym, humanSym);
  if (pos === null) return;

  game.board[pos] = aiSym;
  game.moves.push({ player: "AI", position: pos, board: [...game.board] });

  const winner = checkWinner(game.board);
  const isDraw = isBoardFull(game.board);
  if (winner || isDraw) return handleGameEnd(gameID, api, { threadID: game.threadID, senderID: "AI" }, usersData);

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
  const next = game.players[game.currentPlayerIndex];

  if (game.imageMode) {
    const img = await generateBoardImage(game.board, next, game.players, usersData, "normal", game.bets, game.odds);
    if (img) await sendImage(api, game.threadID, img, `Turn: ${next.name}`);
  } else {
    await api.sendMessage(UI([displayBoard(game.board), "---", `Turn: ${next.name}`]), game.threadID);
  }
}

async function handleGameEnd(gameID, api, event, usersData) {
  const game = games[gameID];
  if (!game) return;

  const winnerSym = checkWinner(game.board);
  const isDraw    = isBoardFull(game.board) && !winnerSym;
  let gainInfo    = null;

  if (winnerSym) {
    const winner = game.players.find(p => p.symbol === winnerSym);
    const loser  = game.players.find(p => p.symbol !== winnerSym);

    ensurePlayerStats(winner.id); ensurePlayerStats(loser.id);
    playerStats[winner.id].wins++; playerStats[winner.id].played++;
    playerStats[loser.id].losses++; playerStats[loser.id].played++;
    saveStats();

    if (game.bets) {
      if (game.isAI) {
        const humanId  = winner.id !== "AI" ? winner.id : loser.id;
        const humanWon = winner.id !== "AI";
        const betAmt   = toBigInt(game.bets[humanId] || 0n);
        const odd      = game.odds?.[humanId] || 2;
        if (humanWon) {
          const gain = BigInt(Math.floor(Number(betAmt) * odd));
          await updateUserCash(humanId, gain);
          gainInfo = { line1: "Victory against AI!", line2: `+${await formatNumber(gain)}$ (odds x${odd})`, line3: `Bet: ${await formatNumber(betAmt)}$ Net: +${await formatNumber(gain - betAmt)}$` };
        } else {
          gainInfo = { line1: "Defeat against AI", line2: `-${await formatNumber(betAmt)}$`, line3: "Better luck next time!" };
        }
      } else {
        const wBet  = toBigInt(game.bets[winner.id] || 0n);
        const lBet  = toBigInt(game.bets[loser.id] || 0n);
        const wOdd  = game.odds?.[winner.id] || 2;
        const gain  = BigInt(Math.floor(Number(wBet) * wOdd));
        const total = gain + lBet;
        await updateUserCash(winner.id, total);
        gainInfo = { line1: `${winner.name} wins!`, line2: `+${await formatNumber(total)}$`, line3: `${loser.name} loses ${await formatNumber(lBet)}$` };
      }
    }

    if (game.imageMode) {
      const img = await generateEndGameImage(game.board, winner, game.players, usersData, false, gainInfo);
      if (img) await sendImage(api, game.threadID, img);
    } else {
      let txt = UI([displayBoard(game.board), "---", `${winner.name} wins!`]);
      if (gainInfo) txt += `\n${gainInfo.line1}\n${gainInfo.line2}\n${gainInfo.line3}`;
      await api.sendMessage(txt, game.threadID);
    }

    game.inProgress = false;

    if (game.isTournamentGame && tournaments[game.tournamentID]) {
      const T     = tournaments[game.tournamentID];
      const round = T.rounds[T.currentRoundIndex];
      const match = round.matches[game.matchIndex];
      if (match) { match.winner = winner.id; match.completed = true; }
      const doneAll = round.matches.every(m => m.completed);
      if (doneAll) {
        if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, game.threadID, bi); }
        await advanceTournamentRound(game.tournamentID, api, usersData);
      } else await initiateNextMatch(game.tournamentID, api, usersData);
    } else if (!game.imageMode) {
      await api.sendMessage(`Type "restart" to play again.`, game.threadID);
    }

  } else if (isDraw) {
    game.players.forEach(p => { ensurePlayerStats(p.id); playerStats[p.id].draws++; playerStats[p.id].played++; });
    saveStats();

    if (game.bets && !game.isAI) {
      for (const p of game.players) { const b = toBigInt(game.bets[p.id] || 0n); if (b > 0n) await updateUserCash(p.id, b); }
      gainInfo = { line1: "Draw — bets refunded", line2: "Each player gets their bet back", line3: "" };
    } else if (game.bets && game.isAI) {
      const humanId = game.players.find(p => p.id !== "AI")?.id;
      if (humanId) { const b = toBigInt(game.bets[humanId] || 0n); if (b > 0n) await updateUserCash(humanId, b); gainInfo = { line1: "Draw against AI", line2: "Bet refunded", line3: "" }; }
    }

    if (game.isTournamentGame && tournaments[game.tournamentID]) {
      const T     = tournaments[game.tournamentID];
      const round = T.rounds[T.currentRoundIndex];
      const match = round.matches[game.matchIndex];
      match.drawCount = (match.drawCount || 0) + 1;

      if (match.drawCount >= 3) {
        game.inProgress     = true;
        game.isMathChallenge = true;
        await api.sendMessage(UI(["3 DRAWS!", "MATH TIEBREAKER", "---", "Solve: sqrt(7+sqrt(48))^2024 * sqrt(7-sqrt(48))^2024 + 1", "---", "First correct answer wins!"]), game.threadID);
      } else {
        await api.sendMessage(UI([`DRAW (${match.drawCount}/3)`, "Rematch!"]), game.threadID);
        resetGame(gameID, game.players[0], game.players[1], { isTournamentGame: true, tournamentID: game.tournamentID, matchIndex: game.matchIndex, threadID: game.threadID, imageMode: game.imageMode });
        if (game.imageMode) {
          const bi = await generateBoardImage(games[gameID].board, games[gameID].players[0], games[gameID].players, usersData, "tournament");
          await sendImage(api, game.threadID, bi, `Rematch — ${games[gameID].players[0].name}, your turn!`);
        } else {
          await api.sendMessage(`Rematch! ${games[gameID].players[0].name}, your turn!`, game.threadID);
        }
      }
    } else {
      if (game.imageMode) {
        const img = await generateEndGameImage(game.board, null, game.players, usersData, true, gainInfo);
        if (img) await sendImage(api, game.threadID, img);
      } else {
        let txt = UI([displayBoard(game.board), "---", "Draw!"]);
        if (gainInfo) txt += `\n${gainInfo.line1}`;
        await api.sendMessage(txt, game.threadID);
      }
      game.inProgress = false;
      if (!game.imageMode) await api.sendMessage(`Type "restart" to play again.`, game.threadID);
    }
  }

  game.restartPrompted = true;
}

// ─── TOURNAMENT ───────────────────────────────────────────────────────────────

function createTournament(threadID) {
  tournaments[threadID] = { id: threadID, players: [], status: "registration", rounds: [], currentRoundIndex: -1, winner: null, threadID, requiredPlayers: 4, imageMode: imageModeByThread[threadID] || false };
  return tournaments[threadID];
}

function generateTournamentBracketText(T) {
  let t = UI([`TICTACTOE TOURNAMENT`, "---", `Status: ${getTournamentStatus(T)}`, `Players: ${T.players.length}/${T.requiredPlayers}`]);
  T.players.forEach((p, i) => { t += `\n│ ${i+1}. ${p.name}`; });
  if (T.status !== "registration" && T.rounds.length > 0) {
    t += `\n├─────────────────────•\n│ Rounds:`;
    T.rounds.forEach(r => { t += `\n│   ${r.name}: ${r.matches.filter(m=>m.completed).length}/${r.matches.length}`; });
    const cr = T.rounds[T.currentRoundIndex];
    if (cr) {
      t += `\n├─────────────────────•\n│ Current: ${cr.name}`;
      cr.matches.forEach((m, i) => { const p1=T.players.find(p=>p.id===m.player1), p2=T.players.find(p=>p.id===m.player2); const s=m.completed?(m.winner?`WIN ${T.players.find(p=>p.id===m.winner)?.name}`:"DRAW"):"PENDING"; t+=`\n│ Match ${i+1}: ${p1?.name||"??"} vs ${p2?.name||"??"} → ${s}`; });
    }
  }
  if (T.status === "completed" && T.winner) t += `\n├─────────────────────•\n│ CHAMPION: ${T.players.find(p=>p.id===T.winner)?.name||"?"}`;
  return t + "\n╰─────────────────────•";
}

async function startTournament(tournamentID, api, usersData) {
  const T   = tournaments[tournamentID];
  if (!T) return;
  const num = T.players.length;
  if (![4, 8, 16].includes(num)) return api.sendMessage(UI([`Need 4, 8 or 16 players. Current: ${num}`]), T.threadID);

  T.status = "in_progress"; shuffleArray(T.players);
  let rounds = [];
  if (num === 16) rounds = [{ name: "Round of 16", matches: [] }, { name: "Quarter-finals", matches: [] }, { name: "Semi-finals", matches: [] }, { name: "Final", matches: [] }];
  else if (num === 8) rounds = [{ name: "Quarter-finals", matches: [] }, { name: "Semi-finals", matches: [] }, { name: "Final", matches: [] }];
  else rounds = [{ name: "Semi-finals", matches: [] }, { name: "Final", matches: [] }];

  T.rounds = rounds; T.currentRoundIndex = 0; T.winner = null;
  const m0 = [];
  for (let i = 0; i < num; i += 2) m0.push({ player1: T.players[i].id, player2: T.players[i+1].id, winner: null, completed: false, gameID: null, drawCount: 0 });
  T.rounds[0].matches = m0;

  if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, UI(["Tournament starts!"])); }
  else await api.sendMessage(generateTournamentBracketText(T), T.threadID);

  await initiateNextMatch(tournamentID, api, usersData);
}

async function initiateNextMatch(tournamentID, api, usersData) {
  const T     = tournaments[tournamentID];
  if (!T) return;
  const round = T.rounds[T.currentRoundIndex];
  const idx   = round.matches.findIndex(m => !m.completed && m.gameID === null);
  if (idx === -1) return;

  const match = round.matches[idx];
  const p1    = T.players.find(p => p.id === match.player1);
  const p2    = T.players.find(p => p.id === match.player2);
  if (!p1 || !p2) { await api.sendMessage("Player not found.", T.threadID); return; }

  const i1  = await getPlayerInfo(p1.id, usersData);
  const i2  = await getPlayerInfo(p2.id, usersData);
  const gID = `${T.threadID}:tournament:${T.id}:${T.currentRoundIndex}:${idx}`;

  resetGame(gID, { id: p1.id, name: i1.name, threadID: T.threadID }, { id: p2.id, name: i2.name, threadID: T.threadID }, { isTournamentGame: true, tournamentID, matchIndex: idx, threadID: T.threadID, imageMode: T.imageMode });
  round.matches[idx].gameID = gID;

  if (T.imageMode) {
    const bi = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "tournament");
    await sendImage(api, T.threadID, bi, UI([`${round.name} — Match ${idx+1}`, `${i1.name} vs ${i2.name}`]));
  } else {
    await api.sendMessage(UI([`${round.name} — Match ${idx+1}`, `${i1.name} (X) vs ${i2.name} (O)`, "---", displayBoard(games[gID].board), "---", `${i1.name}, your turn (1-9).`]), T.threadID);
  }
}

async function advanceTournamentRound(tournamentID, api, usersData) {
  const T       = tournaments[tournamentID];
  if (!T) return;
  const round   = T.rounds[T.currentRoundIndex];
  const winners = round.matches.map(m => m.winner).filter(Boolean);
  if (winners.length !== round.matches.length) { await api.sendMessage("Some matches unfinished.", T.threadID); return; }

  if (T.currentRoundIndex === T.rounds.length - 1) {
    T.winner = winners[0]; T.status = "completed";
    const ci = await getPlayerInfo(T.winner, usersData);
    if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, UI(["TOURNAMENT COMPLETE!", "---", `CHAMPION: ${ci.name}`])); }
    else await api.sendMessage(UI(["TOURNAMENT COMPLETE!", "---", `CHAMPION: ${ci.name}`]), T.threadID);
    delete tournaments[tournamentID];
    return;
  }

  T.currentRoundIndex++;
  const nr = T.rounds[T.currentRoundIndex];
  nr.matches = [];
  for (let i = 0; i < winners.length; i += 2) nr.matches.push({ player1: winners[i], player2: winners[i+1], winner: null, completed: false, gameID: null, drawCount: 0 });

  if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, T.threadID, bi, `Round ${nr.name.toUpperCase()}!`); }
  else await api.sendMessage(`Round ${nr.name.toUpperCase()}!`, T.threadID);
  await initiateNextMatch(tournamentID, api, usersData);
}

// ─── MODULE EXPORT ────────────────────────────────────────────────────────────

module.exports = {
  config: {
    name: "tictactoe",
    aliases: ["ttt", "morpion"],
    version: "14.0",
    author: "Ismael03-Dev",
    category: "game",
    shortDescription: { en: "TicTacToe Ultimate — Mistral AI + Canvas" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const p        = global.utils.getPrefix(threadID);
    ensurePlayerStats(senderID);

    const sub  = (args[0] || "").toLowerCase();
    const sub2 = (args[1] || "").toLowerCase();

    if (!sub || sub === "help") return api.sendMessage(UI([
      "ULTIMATE TICTACTOE v14", "---",
      `${p}ttt @player <bet> [odds]`,
      `${p}ttt ai <bet> [odds]`, "---",
      "Odds: 1-20 (ex: 2.5)",
      "Winner: bet x odds + opp bet",
      "Draw: bets refunded", "---",
      `${p}ttt stats`,
      `${p}ttt tournament / join / out`,
      `${p}ttt image on/off`, "---",
      "In game: 1-9 | forfait | restart"
    ]), threadID);

    if (sub === "image") {
      const on = sub2 === "on";
      imageModeByThread[threadID] = on;
      if (tournaments[threadID]) tournaments[threadID].imageMode = on;
      return api.sendMessage(UI([`Image mode ${on ? "ON" : "OFF"}.`]), threadID);
    }

    if (sub === "stats") {
      if (imageModeByThread[threadID]) {
        const img = await generateStatsImage(senderID, usersData);
        if (img) { await sendImage(api, threadID, img); return; }
      }
      const stats = playerStats[senderID] || { wins: 0, losses: 0, draws: 0, played: 0 };
      const name  = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const wr    = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;
      return api.sendMessage(UI([`${name}'s Stats`, "---", `Wins: ${stats.wins}`, `Losses: ${stats.losses}`, `Draws: ${stats.draws}`, `Played: ${stats.played}`, `Win Rate: ${wr}%`]), threadID);
    }

    if (["tournoi", "join", "out"].includes(sub)) {
      if (!tournaments[threadID]) createTournament(threadID);
      const T = tournaments[threadID];

      if (sub === "join") {
        if (T.status !== "registration") return api.sendMessage(UI(["No tournament open."]), threadID);
        if (T.players.find(p => p.id === senderID)) return api.sendMessage(UI(["Already registered."]), threadID);
        if (T.players.length >= T.requiredPlayers) return api.sendMessage(UI(["Tournament full."]), threadID);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        T.players.push({ id: senderID, name });
        return api.sendMessage(UI([`Registered! (${T.players.length}/${T.requiredPlayers})`]), threadID);
      }

      if (sub === "out") {
        if (T.status !== "registration") return api.sendMessage(UI(["Tournament already started."]), threadID);
        const idx = T.players.findIndex(p => p.id === senderID);
        if (idx === -1) return api.sendMessage(UI(["Not registered."]), threadID);
        T.players.splice(idx, 1);
        return api.sendMessage(UI(["You left the tournament."]), threadID);
      }

      if (sub === "tournoi") {
        if (sub2 === "start") {
          const num = T.players.length;
          if (![4, 8, 16].includes(num)) return api.sendMessage(UI([`Need 4, 8 or 16 players. Current: ${num}`]), threadID);
          T.requiredPlayers = num;
          await startTournament(threadID, api, usersData);
          return;
        }
        if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, threadID, bi, `Tournament — type ${p}ttt join`); }
        else await api.sendMessage(generateTournamentBracketText(T), threadID);
        return;
      }
    }

    if (sub === "ia" || sub === "ai") {
      const betRaw  = args[1];
      const oddRaw  = parseFloat(args[2]) || 2;
      const clampOd = Math.min(20, Math.max(1, oddRaw));
      const betAmt  = await parseAmount(betRaw);
      const userName = (await usersData.getName(senderID)) || `Player ${senderID}`;

      if (betAmt > 0n) {
        const cash = await getUserCash(senderID);
        if (betAmt > cash) return api.sendMessage(UI(["Insufficient funds", "---", `Balance: ${await formatNumber(cash)}$`, `Bet: ${await formatNumber(betAmt)}$`]), threadID);
        await updateUserCash(senderID, -betAmt);
      }

      const gID = `${threadID}:ai:${senderID}`;
      resetGame(gID,
        { id: senderID, name: userName },
        { id: "AI", name: BOT_NAME },
        { isAI: true, threadID, imageMode: imageModeByThread[threadID] || false, bets: betAmt > 0n ? { [senderID]: betAmt.toString() } : null, odds: betAmt > 0n ? { [senderID]: clampOd } : null }
      );

      const betLine = betAmt > 0n ? `Bet: ${await formatNumber(betAmt)}$ | Odds: x${clampOd} | Potential: ${await formatNumber(BigInt(Math.floor(Number(betAmt) * clampOd)))}$` : "No bet";

      if (games[gID].imageMode) {
        const img = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "normal", games[gID].bets, games[gID].odds);
        await sendImage(api, threadID, img, UI([`VS AI (Mistral)`, `${userName} (X) vs ${BOT_NAME} (O)`, "---", betLine]));
      } else {
        await api.sendMessage(UI([`VS AI (Mistral)`, `${userName} (X) vs ${BOT_NAME} (O)`, "---", betLine, "---", displayBoard(games[gID].board), "---", `${userName}, your turn (1-9)`]), threadID);
      }

      if (games[gID].players[games[gID].currentPlayerIndex].id === "AI")
        await applyAIMove(gID, api, usersData);
      return;
    }

    const mentions  = event.mentions || {};
    let targetID    = Object.keys(mentions)[0] || null;
    if (!targetID && args[0]) { const ex = args[0].match(/\d+/); if (ex) targetID = ex[0]; }
    if (!targetID) return api.sendMessage(UI(["Invalid mention.", `${p}ttt @player <bet> [odds]`]), threadID);
    if (targetID === senderID) return api.sendMessage(UI(["You can't play against yourself."]), threadID);

    const betRaw1  = args[1];
    const oddRaw1  = parseFloat(args[2]) || 2;
    const clampOd1 = Math.min(20, Math.max(1, oddRaw1));
    const betAmt1  = await parseAmount(betRaw1);
    const name1    = (await usersData.getName(senderID)) || `Player ${senderID}`;
    const name2    = (mentions[targetID] || "").replace("@", "") || (await usersData.getName(targetID)) || `Player ${targetID}`;
    const bets     = {}, odds = {};

    if (betAmt1 > 0n) {
      const cash1 = await getUserCash(senderID);
      if (betAmt1 > cash1) return api.sendMessage(UI(["Insufficient funds (P1)", "---", `Balance: ${await formatNumber(cash1)}$`]), threadID);
      await updateUserCash(senderID, -betAmt1); bets[senderID] = betAmt1.toString(); odds[senderID] = clampOd1;
      const cash2 = await getUserCash(targetID);
      if (betAmt1 > cash2) { await updateUserCash(senderID, betAmt1); return api.sendMessage(UI(["Opponent lacks funds.", "---", `Their balance: ${await formatNumber(cash2)}$`, `Bet: ${await formatNumber(betAmt1)}$`]), threadID); }
      await updateUserCash(targetID, -betAmt1); bets[targetID] = betAmt1.toString(); odds[targetID] = clampOd1;
    }

    const gID = `${threadID}:pvp:${senderID}:${targetID}`;
    resetGame(gID, { id: senderID, name: name1 }, { id: targetID, name: name2 }, { threadID, imageMode: imageModeByThread[threadID] || false, bets: betAmt1 > 0n ? bets : null, odds: betAmt1 > 0n ? odds : null });

    const betLine = betAmt1 > 0n ? `Bet: ${await formatNumber(betAmt1)}$ each | Odds: x${clampOd1}` : "No bet";

    if (games[gID].imageMode) {
      const img = await generateBoardImage(games[gID].board, games[gID].players[0], games[gID].players, usersData, "normal", games[gID].bets, games[gID].odds);
      await sendImage(api, threadID, img, UI([`${name1} (X) vs ${name2} (O)`, "---", betLine, "---", `${name1}, your turn (1-9)`]));
    } else {
      await api.sendMessage(UI([`${name1} (X) vs ${name2} (O)`, "---", betLine, "---", displayBoard(games[gID].board), "---", `${name1}, your turn (1-9)`]), threadID);
    }
  },

  onChat: async function ({ api, event, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const msg      = (event.body || "").trim();
    const msgLower = msg.toLowerCase();

    const gameID = Object.keys(games).find(id =>
      games[id].threadID === threadID &&
      games[id].players.some(p => p.id === senderID) &&
      games[id].inProgress
    );

    if (!gameID) {
      const finished = Object.keys(games).find(id =>
        games[id].threadID === threadID &&
        games[id].players.some(p => p.id === senderID) &&
        !games[id].inProgress
      );
      if (finished && msgLower === "restart") {
        const fg = games[finished];
        if (fg.isTournamentGame) return api.sendMessage(UI(["Can't restart tournament match."]), threadID);
        resetGame(finished, fg.players[0], fg.players[1], { isAI: fg.isAI, threadID, imageMode: fg.imageMode });
        if (fg.imageMode) {
          const img = await generateBoardImage(games[finished].board, games[finished].players[0], games[finished].players, usersData);
          await sendImage(api, threadID, img, `Rematch! ${games[finished].players[0].name}, your turn.`);
        } else {
          await api.sendMessage(UI([`Rematch!`, `${games[finished].players[0].name} (X) vs ${games[finished].players[1].name} (O)`, "---", displayBoard(games[finished].board), "---", `${games[finished].players[0].name}, your turn (1-9)`]), threadID);
        }
        if (fg.isAI && games[finished].players[games[finished].currentPlayerIndex].id === "AI")
          await applyAIMove(finished, api, usersData);
      }
      return;
    }

    const game = games[gameID];

    if (game.isMathChallenge) {
      if (msg === "2") {
        const winner = game.players.find(p => p.id === senderID);
        const loser  = game.players.find(p => p.id !== senderID);
        await api.sendMessage(UI(["CORRECT!", `${winner.name} wins the tiebreaker!`]), threadID);
        game.board           = Array(9).fill(winner.symbol);
        game.inProgress      = false;
        game.isMathChallenge = false;
        ensurePlayerStats(winner.id); ensurePlayerStats(loser.id);
        playerStats[winner.id].wins++; playerStats[loser.id].losses++;
        saveStats();
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
      playerStats[other.id].wins++; playerStats[other.id].played++;
      saveStats();

      let gainInfo = null;
      if (game.bets && !game.isAI) {
        const wBet  = toBigInt(game.bets[other.id] || 0n);
        const lBet  = toBigInt(game.bets[forfeiter.id] || 0n);
        const wOdd  = game.odds?.[other.id] || 2;
        const total = BigInt(Math.floor(Number(wBet) * wOdd)) + lBet;
        await updateUserCash(other.id, total);
        gainInfo = { line1: `${forfeiter.name} forfeited`, line2: `${other.name} wins +${await formatNumber(total)}$`, line3: "" };
      }

      if (game.imageMode) {
        const img = await generateEndGameImage(game.board, other, game.players, usersData, false, gainInfo);
        if (img) await sendImage(api, threadID, img);
      } else {
        let txt = UI([`${forfeiter.name} forfeited.`, `${other.name} wins!`]);
        if (gainInfo) txt += `\n${gainInfo.line1}\n${gainInfo.line2}`;
        await api.sendMessage(txt, threadID);
      }

      if (game.isTournamentGame && tournaments[game.tournamentID]) {
        const T = tournaments[game.tournamentID], round = T.rounds[T.currentRoundIndex], match = round.matches[game.matchIndex];
        if (match) { match.winner = other.id; match.completed = true; }
        const done = round.matches.every(m => m.completed);
        if (done) {
          if (T.imageMode) { const bi = await generateTournamentBracketImage(T, usersData); await sendImage(api, threadID, bi); }
          await advanceTournamentRound(game.tournamentID, api, usersData);
        } else await initiateNextMatch(game.tournamentID, api, usersData);
      } else if (!game.imageMode) {
        await api.sendMessage(`Type "restart" to play again.`, threadID);
      }
      return;
    }

    const current = game.players[game.currentPlayerIndex];
    if (senderID !== current.id) return;

    const pos = parseInt(msg) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) return;
    if (game.board[pos] !== null) { await api.sendMessage(UI(["Invalid or taken square."]), threadID); return; }

    game.board[pos] = current.symbol;
    game.moves.push({ player: current.id, position: pos, board: [...game.board] });

    const winner2 = checkWinner(game.board);
    const isDraw2 = isBoardFull(game.board);
    if (winner2 || isDraw2) return handleGameEnd(gameID, api, { threadID, senderID }, usersData);

    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
    const next = game.players[game.currentPlayerIndex];

    if (game.imageMode) {
      const img = await generateBoardImage(game.board, next, game.players, usersData, game.isTournamentGame ? "tournament" : "normal", game.bets, game.odds);
      if (img) await sendImage(api, threadID, img, `Turn: ${next.name}`);
    } else {
      await api.sendMessage(UI([displayBoard(game.board), "---", `Turn: ${next.name}`]), threadID);
    }

    if (game.isAI && next.id === "AI") await applyAIMove(gameID, api, usersData);
  }
};