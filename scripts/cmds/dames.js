const fs    = require("fs-extra");
const path  = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const FORMAT_URL  = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL    = "https://cash-api-five.vercel.app/api/cash";
const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_KEY = "VCFZLWLWcxk6SIMIZHa0HjGr2rRwrZhN";

const MAX_LIMIT    = 10n ** 261n;
const STATS_FILE   = path.join(__dirname, "checkers_stats.json");
const HISTORY_FILE = path.join(__dirname, "checkers_history.json");
const STREAK_FILE  = path.join(__dirname, "checkers_streaks.json");
const ASSETS_DIR   = path.join(__dirname, "checkers_assets");

// ── TURN TIMER CONFIG ─────────────────────────────────────────────────────────
const TURN_TIME_LIMIT   = 90;   // seconds per turn
const TURN_WARN_AT      = 30;   // warn when this many seconds remain
const INACTIVITY_LIMIT  = 5 * 60 * 1000; // 5 min global inactivity auto-end

// ── In-memory state ───────────────────────────────────────────────────────────
let games        = {};
let playerStats  = loadStats();
let gameHistory  = loadHistory();
let playerStreaks = loadStreaks();
const playerCache       = new Map();
const imageModeByThread = {};
const pendingChallenges = {};
const spectators        = {};
const rematchPending    = {};
const turnTimers        = {};   // gameID → { timeout, warnTimeout, startedAt }
const inactivityTimers  = {};   // gameID → timeout

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════════
// NOTATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const COL_LETTERS = ["A","B","C","D","E","F","G","H"];

function notationToKey(notation) {
  if (!notation) return null;
  const n = notation.toUpperCase().trim();
  const colLetter = n[0];
  const rank      = parseInt(n[1]);
  if (!COL_LETTERS.includes(colLetter) || isNaN(rank) || rank < 1 || rank > 8) return null;
  const col = COL_LETTERS.indexOf(colLetter);
  const row = 8 - rank;
  return `${row},${col}`;
}

function keyToNotation(key) {
  if (!key) return "??";
  const [r, c] = key.split(",").map(Number);
  return `${COL_LETTERS[c]}${8 - r}`;
}

/**
 * Parse a move string — accepts: "A1 B2", "a1b2", "A1-B2", "A1>B2", "A1→B2"
 */
function parseMove(text) {
  if (!text) return null;
  const clean = text.toUpperCase().replace(/[^A-H1-8]/g, " ").trim();
  const m = clean.match(/([A-H][1-8])\s+([A-H][1-8])/);
  if (m) return { from: notationToKey(m[1]), to: notationToKey(m[2]) };
  const m2 = clean.match(/([A-H][1-8])([A-H][1-8])/);
  if (m2) return { from: notationToKey(m2[1]), to: notationToKey(m2[2]) };
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER TIERS
// ═══════════════════════════════════════════════════════════════════════════════
const TIERS = [
  {v:10n**258n,s:"Qiu"},{v:10n**255n,s:"Qu"},{v:10n**252n,s:"Tu"},
  {v:10n**249n,s:"Du"},{v:10n**246n,s:"Uc"},{v:10n**243n,s:"DcQ"},
  {v:10n**240n,s:"NoQ"},{v:10n**237n,s:"OcQ"},{v:10n**234n,s:"SpQ"},
  {v:10n**231n,s:"SxQ"},{v:10n**228n,s:"QiQ"},{v:10n**225n,s:"QQ"},
  {v:10n**222n,s:"TQ"},{v:10n**219n,s:"DQ"},{v:10n**216n,s:"UQ"},
  {v:10n**213n,s:"DcTr"},{v:10n**210n,s:"NoTr"},{v:10n**207n,s:"OcTr"},
  {v:10n**204n,s:"SpTr"},{v:10n**201n,s:"SxTr"},{v:10n**198n,s:"QiTr"},
  {v:10n**195n,s:"QTr"},{v:10n**192n,s:"TTr"},{v:10n**189n,s:"DTr"},
  {v:10n**186n,s:"UTr"},{v:10n**183n,s:"DcT"},{v:10n**180n,s:"NoT"},
  {v:10n**177n,s:"OcT"},{v:10n**174n,s:"SpT"},{v:10n**171n,s:"SxT"},
  {v:10n**168n,s:"QiT"},{v:10n**165n,s:"QT"},{v:10n**162n,s:"TT"},
  {v:10n**159n,s:"DT"},{v:10n**156n,s:"UT"},{v:10n**153n,s:"DcV"},
  {v:10n**150n,s:"NoV"},{v:10n**147n,s:"OcV"},{v:10n**144n,s:"SpV"},
  {v:10n**141n,s:"SxV"},{v:10n**138n,s:"QiV"},{v:10n**135n,s:"QV"},
  {v:10n**132n,s:"TV"},{v:10n**129n,s:"DV"},{v:10n**126n,s:"UV"},
  {v:10n**123n,s:"DcI"},{v:10n**120n,s:"NoI"},{v:10n**117n,s:"OcI"},
  {v:10n**114n,s:"SpI"},{v:10n**111n,s:"SxI"},{v:10n**108n,s:"QiI"},
  {v:10n**105n,s:"QI"},{v:10n**102n,s:"TI"},{v:10n**99n,s:"DI"},
  {v:10n**96n,s:"UI"},{v:10n**93n,s:"DcN"},{v:10n**90n,s:"NoN"},
  {v:10n**87n,s:"OcN"},{v:10n**84n,s:"SpN"},{v:10n**81n,s:"SxN"},
  {v:10n**78n,s:"QiN"},{v:10n**75n,s:"QaN"},{v:10n**72n,s:"TN"},
  {v:10n**69n,s:"BN"},{v:10n**66n,s:"MN"},{v:10n**63n,s:"kN"},
  {v:10n**60n,s:"NoDc"},{v:10n**57n,s:"OcDc"},{v:10n**54n,s:"SpDc"},
  {v:10n**51n,s:"SxDc"},{v:10n**48n,s:"QiDc"},{v:10n**45n,s:"QaDc"},
  {v:10n**42n,s:"TDc"},{v:10n**39n,s:"DDc"},{v:10n**36n,s:"UDc"},
  {v:10n**33n,s:"Dc"},{v:10n**30n,s:"No"},{v:10n**27n,s:"Oc"},
  {v:10n**24n,s:"Sp"},{v:10n**21n,s:"Sx"},{v:10n**18n,s:"Qi"},
  {v:10n**15n,s:"Qa"},{v:10n**12n,s:"T"},{v:10n**9n,s:"B"},
  {v:10n**6n,s:"M"},{v:10n**3n,s:"k"}
];
const SFX={
  k:10n**3n,m:10n**6n,b:10n**9n,t:10n**12n,qa:10n**15n,qi:10n**18n,
  sx:10n**21n,sp:10n**24n,oc:10n**27n,no:10n**30n,dc:10n**33n,
  udc:10n**36n,ddc:10n**39n,tdc:10n**42n,qadc:10n**45n,qidc:10n**48n,
  sxdc:10n**51n,spdc:10n**54n,ocdc:10n**57n,nodc:10n**60n,
  kn:10n**63n,mn:10n**66n,bn:10n**69n,tn:10n**72n,qan:10n**75n,qin:10n**78n,
  sxn:10n**81n,spn:10n**84n,ocn:10n**87n,non:10n**90n,dcn:10n**93n,
  ui:10n**96n,di:10n**99n,ti:10n**102n,qi_i:10n**105n,qii:10n**108n,
  sxi:10n**111n,spi:10n**114n,oci:10n**117n,noi:10n**120n,dci:10n**123n,
  uv:10n**126n,dv:10n**129n,tv:10n**132n,qv:10n**135n,qiv:10n**138n,
  sxv:10n**141n,spv:10n**144n,ocv:10n**147n,nov:10n**150n,dcv:10n**153n,
  ut:10n**156n,dt:10n**159n,tt:10n**162n,qt:10n**165n,qit:10n**168n,
  sxt:10n**171n,spt:10n**174n,oct:10n**177n,not:10n**180n,dct:10n**183n,
  utr:10n**186n,dtr:10n**189n,ttr:10n**192n,qtr:10n**195n,qitr:10n**198n,
  sxtr:10n**201n,sptr:10n**204n,octr:10n**207n,notr:10n**210n,dctr:10n**213n,
  uq:10n**216n,dq:10n**219n,tq:10n**222n,qq:10n**225n,qiq:10n**228n,
  sxq:10n**231n,spq:10n**234n,ocq:10n**237n,noq:10n**240n,dcq:10n**243n,
  uc:10n**246n,du:10n**249n,tu:10n**252n,qu:10n**255n,qiu:10n**258n,
  inf:MAX_LIMIT,infinity:MAX_LIMIT
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════
function loadStats(){try{if(fs.existsSync(STATS_FILE))return JSON.parse(fs.readFileSync(STATS_FILE,"utf8")||"{}");}catch{}return{};}
function saveStats(){try{fs.writeFileSync(STATS_FILE,JSON.stringify(playerStats,null,2));}catch{}}
function loadHistory(){try{if(fs.existsSync(HISTORY_FILE))return JSON.parse(fs.readFileSync(HISTORY_FILE,"utf8")||"[]");}catch{}return[];}
function saveHistory(){try{fs.writeFileSync(HISTORY_FILE,JSON.stringify(gameHistory.slice(0,200),null,2));}catch{}}
function loadStreaks(){try{if(fs.existsSync(STREAK_FILE))return JSON.parse(fs.readFileSync(STREAK_FILE,"utf8")||"{}");}catch{}return{};}
function saveStreaks(){try{fs.writeFileSync(STREAK_FILE,JSON.stringify(playerStreaks,null,2));}catch{}}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function toBigInt(v){if(typeof v==="bigint")return v;if(v==null)return 0n;try{return BigInt(String(v).split(".")[0].replace(/[^0-9\-]/g,"")||"0");}catch{return 0n;}}

async function formatNumber(num){
  const big=toBigInt(num);
  if(big===0n)return"0";
  if(big>=MAX_LIMIT||big<=-MAX_LIMIT)return"∞";
  try{const r=await axios.get(`${FORMAT_URL}?n=${big.toString()}`,{timeout:3000});if(r.data?.success)return r.data.isInfinity?"∞":r.data.formatted;}catch{}
  const neg=big<0n,abs=neg?-big:big;
  for(const t of TIERS){if(abs>=t.v){const ip=abs/t.v,rem=abs%t.v,dp=(rem*100n)/t.v,pfx=neg?"-":"";if(dp>0n){const dec=Number(dp).toString().padStart(2,"0").slice(0,2).replace(/0+$/,"");return dec?`${pfx}${ip}.${dec}${t.s}`:`${pfx}${ip}${t.s}`;}return`${pfx}${ip}${t.s}`;}}
  return(neg?"-":"")+abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g," ");
}

async function parseAmount(input){
  if(!input)return 0n;
  const str=String(input).toLowerCase().trim();
  if(str==="inf"||str==="infinity"||str==="∞")return MAX_LIMIT;
  try{const r=await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`,{timeout:5000});if(r.data?.success&&r.data?.raw)return toBigInt(r.data.raw);}catch{}
  const m=str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i);if(!m)return 0n;
  const val=parseFloat(m[1]),sfx=(m[2]||"").toLowerCase();if(isNaN(val))return 0n;
  const base=BigInt(Math.floor(Math.abs(val))),neg=val<0;
  if(!sfx)return neg?-base:base;
  const mult=SFX[sfx];if(mult){const res=neg?-(base*mult):base*mult;if(res>=MAX_LIMIT||res<=-MAX_LIMIT)return neg?-MAX_LIMIT:MAX_LIMIT;return res;}
  return neg?-base:base;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASH API
// ═══════════════════════════════════════════════════════════════════════════════
async function getUserCash(uid){try{const r=await axios.get(`${CASH_URL}/${uid}`,{timeout:10000});if(r.data?.success&&r.data?.data){const c=toBigInt(r.data.data.cash);return c>=MAX_LIMIT?MAX_LIMIT:c;}}catch{}return 0n;}
async function updateUserCash(uid,amount){const a=toBigInt(amount);try{if(a>0n)await axios.post(`${CASH_URL}/${uid}/add`,{amount:a.toString()});else if(a<0n)await axios.post(`${CASH_URL}/${uid}/subtract`,{amount:(-a).toString()});return true;}catch{return false;}}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function UI(lines){let o="╭─────────────────────•\n";for(const l of lines){if(l==="---"){o+="├─────────────────────•\n";continue;}o+=`│ ${l}\n`;}return o+"╰─────────────────────•";}

// ═══════════════════════════════════════════════════════════════════════════════
// TURN TIMER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
function clearTurnTimer(gameID) {
  if (turnTimers[gameID]) {
    clearTimeout(turnTimers[gameID].timeout);
    clearTimeout(turnTimers[gameID].warnTimeout);
    delete turnTimers[gameID];
  }
}

function clearInactivityTimer(gameID) {
  if (inactivityTimers[gameID]) {
    clearTimeout(inactivityTimers[gameID]);
    delete inactivityTimers[gameID];
  }
}

function startTurnTimer(gameID, api) {
  clearTurnTimer(gameID);
  const game = games[gameID];
  if (!game || !game.inProgress || game.isAI) return;

  const startedAt = Date.now();
  turnTimers[gameID] = { startedAt };

  // Warning at TURN_WARN_AT seconds remaining
  turnTimers[gameID].warnTimeout = setTimeout(async () => {
    const g = games[gameID];
    if (!g || !g.inProgress) return;
    const curP = g.currentPlayer === 1 ? g.players[0] : g.players[1];
    await api.sendMessage(UI([
      `⚠️ ${curP.name}, il te reste ${TURN_WARN_AT}s pour jouer !`,
      "Sinon tu perds par temps."
    ]), g.threadID);
  }, (TURN_TIME_LIMIT - TURN_WARN_AT) * 1000);

  // Timeout = loss by time
  turnTimers[gameID].timeout = setTimeout(async () => {
    const g = games[gameID];
    if (!g || !g.inProgress || g._ending) return;
    const loserIdx = g.currentPlayer - 1;
    const winnerIdx = loserIdx === 0 ? 1 : 0;
    const winner = winnerIdx + 1;
    await api.sendMessage(UI([
      `⏰ Temps écoulé !`,
      `${g.players[loserIdx].name} perd par temps.`
    ]), g.threadID);
    await handleGameEnd(gameID, api, g.threadID, winner, "temps écoulé");
  }, TURN_TIME_LIMIT * 1000);

  // Inactivity watcher (resets on any move)
  clearInactivityTimer(gameID);
  inactivityTimers[gameID] = setTimeout(async () => {
    const g = games[gameID];
    if (!g || !g.inProgress || g._ending) return;
    await handleGameEnd(gameID, api, g.threadID, 3, "inactivité prolongée");
  }, INACTIVITY_LIMIT);
}

function getRemainingTime(gameID) {
  if (!turnTimers[gameID]) return null;
  const elapsed = Math.floor((Date.now() - turnTimers[gameID].startedAt) / 1000);
  return Math.max(0, TURN_TIME_LIMIT - elapsed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & STREAKS
// ═══════════════════════════════════════════════════════════════════════════════
function ensurePlayerStats(id){if(!playerStats[id])playerStats[id]={wins:0,losses:0,draws:0,played:0,totalWon:"0",totalLost:"0"};}
function ensurePlayerStreak(id){if(!playerStreaks[id])playerStreaks[id]={current:0,best:0,type:null};}
function updateStreak(id,win){ensurePlayerStreak(id);if(win){playerStreaks[id].current++;if(playerStreaks[id].current>playerStreaks[id].best)playerStreaks[id].best=playerStreaks[id].current;playerStreaks[id].type="win";}else{playerStreaks[id].current=0;playerStreaks[id].type=null;}saveStreaks();}
function addHistory(e){gameHistory.unshift({...e,timestamp:Date.now()});if(gameHistory.length>200)gameHistory=gameHistory.slice(0,200);saveHistory();}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR LOADER
// ═══════════════════════════════════════════════════════════════════════════════
async function loadImageFromUrl(url){try{const res=await axios.get(url,{responseType:"arraybuffer",timeout:8000,headers:{"User-Agent":"Mozilla/5.0","Accept":"image/*"}});const{loadImage}=require("canvas");return await loadImage(Buffer.from(res.data));}catch{return null;}}

async function getPlayerInfo(uid,usersData){
  if(uid==="AI"){const av=global.botID?await loadImageFromUrl(`https://graph.facebook.com/${global.botID}/picture?width=512&height=512&type=large`):null;return{avatar:av,name:"Hedgehog AI",uid:"AI"};}
  const nuid=Number(uid);if(isNaN(nuid))return{avatar:null,name:`Player ${uid}`,uid};
  if(playerCache.has(nuid))return playerCache.get(nuid);
  const[avatar,name]=await Promise.all([loadImageFromUrl(`https://graph.facebook.com/${nuid}/picture?width=512&height=512&type=large`),usersData?.getName?.(nuid).catch(()=>null)]);
  const info={avatar,name:name||`Player ${nuid}`,uid:nuid};
  playerCache.set(nuid,info);setTimeout(()=>playerCache.delete(nuid),300000);
  return info;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

function drawChecker(ctx,cx,cy,radius,player,isKing=false){
  const col1=player===1?"#dc2626":"#1e293b";
  const col2=player===1?"#fca5a5":"#64748b";
  const grad=ctx.createRadialGradient(cx-radius*0.3,cy-radius*0.3,0,cx,cy,radius);
  grad.addColorStop(0,col2);grad.addColorStop(1,col1);
  ctx.shadowColor=col1;ctx.shadowBlur=12;
  ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle="rgba(0,0,0,0.4)";ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,0.15)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,radius*0.6,0,Math.PI*2);ctx.stroke();
  if(isKing){
    const ks=radius*0.45,ky=cy-radius*0.12;
    ctx.fillStyle="#fbbf24";
    ctx.beginPath();
    ctx.moveTo(cx-ks,ky+ks*0.55);ctx.lineTo(cx-ks,ky-ks*0.25);
    ctx.lineTo(cx-ks*0.28,ky+ks*0.1);ctx.lineTo(cx,ky-ks*0.75);
    ctx.lineTo(cx+ks*0.28,ky+ks*0.1);ctx.lineTo(cx+ks,ky-ks*0.25);
    ctx.lineTo(cx+ks,ky+ks*0.55);ctx.closePath();ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.25)";ctx.lineWidth=0.8;ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD IMAGE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
async function generateBoardImage(game, usersData, remaining=null) {
  const W=840,H=980;
  const canvas=createCanvas(W,H);const ctx=canvas.getContext("2d");

  // Background
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#07050f");bg.addColorStop(0.5,"#0f0d20");bg.addColorStop(1,"#070515");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,0.016)";
  for(let x=0;x<W;x+=34)for(let y=0;y<H;y+=34)ctx.fillRect(x,y,1.5,1.5);
  ctx.strokeStyle="rgba(129,140,248,0.3)";ctx.lineWidth=2;
  roundRect(ctx,8,8,W-16,H-16,18);ctx.stroke();

  // Title
  ctx.font="bold 24px Arial";ctx.fillStyle="#818cf8";ctx.textAlign="center";
  ctx.shadowColor="#818cf8";ctx.shadowBlur=10;ctx.fillText("HEDGEHOG DAMES",W/2,42);ctx.shadowBlur=0;

  // Timer bar (PvP only)
  if (remaining !== null && !game.isAI) {
    const pct = remaining / TURN_TIME_LIMIT;
    const barW = W - 32;
    const col = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(ctx, 16, 50, barW, 10, 5); ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, 16, 50, barW * pct, 10, 5); ctx.fill();
    ctx.font = "10px Arial"; ctx.fillStyle = col; ctx.textAlign = "center";
    ctx.fillText(`⏱ ${remaining}s restants`, W/2, 74);
  }

  // Board
  const BS=620,CS=BS/8,OX=(W-BS)/2,OY=84;

  ctx.shadowColor="rgba(0,0,0,0.5)";ctx.shadowBlur=20;
  ctx.fillStyle="#111";roundRect(ctx,OX-2,OY-2,BS+4,BS+4,4);ctx.fill();ctx.shadowBlur=0;

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const x=OX+c*CS,y=OY+r*CS,dark=(r+c)%2===1;
      ctx.fillStyle=dark?"#2d1b4e":"#c4b5fd";ctx.fillRect(x,y,CS,CS);
    }
  }

  if(game.lastMove){for(const k of game.lastMove){const[r,c]=k.split(",").map(Number);ctx.fillStyle="rgba(251,191,36,0.28)";ctx.fillRect(OX+c*CS,OY+r*CS,CS,CS);}}

  if(game.selected){
    const[sr,sc]=game.selected.split(",").map(Number);
    ctx.fillStyle="rgba(52,211,153,0.35)";ctx.fillRect(OX+sc*CS,OY+sr*CS,CS,CS);
    for(const mv of(game.validMoves||[])){
      const dest=typeof mv==="string"?mv:mv.to;
      const[mr,mc]=dest.split(",").map(Number);
      ctx.fillStyle="rgba(52,211,153,0.25)";ctx.beginPath();
      ctx.arc(OX+mc*CS+CS/2,OY+mr*CS+CS/2,CS*0.18,0,Math.PI*2);ctx.fill();
    }
  }

  // Highlight mandatory captures
  const caps = getAllCaptures(game.board, game.currentPlayer);
  if (caps.length > 0 && !game.selected) {
    for (const cap of caps) {
      const [r,c] = cap.from.split(",").map(Number);
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3;
      ctx.strokeRect(OX+c*CS+2, OY+r*CS+2, CS-4, CS-4);
    }
  }

  ctx.font="bold 14px Arial";ctx.fillStyle="#a78bfa";ctx.textAlign="center";
  for(let c=0;c<8;c++){
    ctx.fillText(COL_LETTERS[c],OX+c*CS+CS/2,OY-8);
    ctx.fillText(COL_LETTERS[c],OX+c*CS+CS/2,OY+BS+20);
  }
  ctx.font="bold 13px Arial";ctx.fillStyle="#a78bfa";ctx.textAlign="right";
  for(let r=0;r<8;r++){
    ctx.fillText(String(8-r),OX-8,OY+r*CS+CS/2+5);
    ctx.textAlign="left";ctx.fillText(String(8-r),OX+BS+8,OY+r*CS+CS/2+5);ctx.textAlign="right";
  }

  for(const[key,piece]of Object.entries(game.board)){
    if(!piece)continue;
    const[r,c]=key.split(",").map(Number);
    drawChecker(ctx,OX+c*CS+CS/2,OY+r*CS+CS/2,CS*0.38,piece.player,piece.isKing||false);
  }

  const p1=game.players[0],p2=game.players[1];
  const[p1Info,p2Info]=await Promise.all([getPlayerInfo(p1.id,usersData),getPlayerInfo(p2.id,usersData)]);
  const p1c=Object.values(game.board).filter(p=>p&&p.player===1).length;
  const p2c=Object.values(game.board).filter(p=>p&&p.player===2).length;
  const elapsed=Math.floor((Date.now()-game.startTime)/1000);
  const tStr=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  const isP1Turn=game.currentPlayer===1;

  const barY=OY+BS+32,barH=88;
  ctx.fillStyle="rgba(255,255,255,0.05)";roundRect(ctx,14,barY,W-28,barH,10);ctx.fill();

  if(p1Info.avatar){ctx.save();ctx.beginPath();ctx.arc(42,barY+barH/2,28,0,Math.PI*2);ctx.clip();ctx.drawImage(p1Info.avatar,14,barY+barH/2-28,56,56);ctx.restore();}
  else{ctx.fillStyle="#dc2626";ctx.beginPath();ctx.arc(42,barY+barH/2,28,0,Math.PI*2);ctx.fill();}
  if(isP1Turn){ctx.strokeStyle="#fbbf24";ctx.lineWidth=3;ctx.beginPath();ctx.arc(42,barY+barH/2,31,0,Math.PI*2);ctx.stroke();}
  ctx.textAlign="left";
  ctx.font="bold 14px Arial";ctx.fillStyle=isP1Turn?"#f87171":"#9ca3af";
  ctx.fillText(p1Info.name.slice(0,16),80,barY+28);
  ctx.font="12px Arial";ctx.fillStyle="#6b7280";
  ctx.fillText(`${p1c} pièce${p1c!==1?"s":""} • Rouge`,80,barY+48);
  const p1k=Object.values(game.board).filter(p=>p&&p.player===1&&p.isKing).length;
  if(p1k>0){ctx.fillStyle="#fbbf24";ctx.fillText(`Dames: ${p1k}`,80,barY+66);}

  if(p2Info.avatar){ctx.save();ctx.beginPath();ctx.arc(W-42,barY+barH/2,28,0,Math.PI*2);ctx.clip();ctx.drawImage(p2Info.avatar,W-70,barY+barH/2-28,56,56);ctx.restore();}
  else{ctx.fillStyle="#334155";ctx.beginPath();ctx.arc(W-42,barY+barH/2,28,0,Math.PI*2);ctx.fill();}
  if(!isP1Turn){ctx.strokeStyle="#fbbf24";ctx.lineWidth=3;ctx.beginPath();ctx.arc(W-42,barY+barH/2,31,0,Math.PI*2);ctx.stroke();}
  ctx.textAlign="right";
  ctx.font="bold 14px Arial";ctx.fillStyle=!isP1Turn?"#94a3b8":"#6b7280";
  ctx.fillText(p2Info.name.slice(0,16),W-80,barY+28);
  ctx.font="12px Arial";ctx.fillStyle="#6b7280";
  ctx.fillText(`${p2c} pièce${p2c!==1?"s":""} • Noir`,W-80,barY+48);
  const p2k=Object.values(game.board).filter(p=>p&&p.player===2&&p.isKing).length;
  if(p2k>0){ctx.fillStyle="#fbbf24";ctx.fillText(`Dames: ${p2k}`,W-80,barY+66);}

  ctx.textAlign="center";
  ctx.font="bold 13px Arial";ctx.fillStyle=isP1Turn?"#f87171":"#94a3b8";
  ctx.fillText(`Tour: ${isP1Turn?p1Info.name:p2Info.name}`,W/2,barY+22);
  ctx.font="11px Arial";ctx.fillStyle="#818cf8";
  if(game.bets)ctx.fillText(`Mise: ${await formatNumber(toBigInt(game.bets))}$ chacun`,W/2,barY+40);
  ctx.fillStyle="#6b7280";ctx.font="10px Arial";
  ctx.fillText(`⏱ ${tStr}  •  ${game.moves.length} coup${game.moves.length!==1?"s":""}  •  ${game.isAI?"vs IA":"PvP"}`,W/2,barY+58);

  if(game.lastMove){
    const[lf,lt]=game.lastMove;
    ctx.fillStyle="#4ade80";ctx.font="11px Arial";
    ctx.fillText(`Dernier: ${keyToNotation(lf)} → ${keyToNotation(lt)}`,W/2,barY+76);
  }

  if(game.moves.length>0){
    const histY=barY+barH+14;
    ctx.fillStyle="rgba(255,255,255,0.04)";roundRect(ctx,14,histY,W-28,28,6);ctx.fill();
    ctx.font="11px Arial";ctx.fillStyle="#6b7280";ctx.textAlign="left";
    ctx.fillText("Historique: ",20,histY+18);
    const last5=game.moves.slice(-5);
    const hist5=last5.map(m=>`${keyToNotation(m.from)}→${keyToNotation(m.to)}`).join("  ");
    ctx.fillStyle="#818cf8";ctx.fillText(hist5,110,histY+18);
  }

  ctx.font="9px Arial";ctx.fillStyle="rgba(255,255,255,0.08)";ctx.textAlign="center";
  ctx.fillText("HEDGEHOG DAMES v4.1  •  Jouez directement: A1 B2",W/2,H-10);

  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
function createBoard(){
  const board={};
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const key=`${r},${c}`;
    if((r+c)%2===1){
      if(r<3)board[key]={player:2,isKing:false};
      else if(r>4)board[key]={player:1,isKing:false};
      else board[key]=null;
    }else board[key]=null;
  }
  return board;
}

function getAllCaptures(board,player){
  const caps=[];
  for(const[pos,piece]of Object.entries(board)){
    if(!piece||piece.player!==player)continue;
    const[row,col]=pos.split(",").map(Number);
    const dirs=piece.isKing?[-1,1]:[player===1?-1:1];
    for(const dr of dirs)for(const dc of[-1,1]){
      const nr=row+dr,nc=col+dc;
      if(nr<0||nr>7||nc<0||nc>7)continue;
      const nk=`${nr},${nc}`;
      if(board[nk]&&board[nk].player!==player){
        const cr=row+dr*2,cc=col+dc*2;
        if(cr<0||cr>7||cc<0||cc>7)continue;
        const ck=`${cr},${cc}`;
        if(board[ck]===null||board[ck]===undefined)caps.push({from:pos,to:ck,capture:nk});
      }
    }
  }
  return caps;
}

function getValidMoves(board,pos,player){
  const allCaps=getAllCaptures(board,player);
  if(allCaps.length>0)return allCaps.filter(c=>c.from===pos).map(c=>({to:c.to,capture:c.capture}));
  const[row,col]=pos.split(",").map(Number);
  const piece=board[pos];
  if(!piece||piece.player!==player)return[];
  const dirs=piece.isKing?[-1,1]:[player===1?-1:1];
  const moves=[];
  for(const dr of dirs)for(const dc of[-1,1]){
    const nr=row+dr,nc=col+dc;
    if(nr<0||nr>7||nc<0||nc>7)continue;
    const nk=`${nr},${nc}`;
    if(board[nk]===null||board[nk]===undefined)moves.push(nk);
  }
  return moves;
}

function hasAnyMove(board,player){
  if(getAllCaptures(board,player).length>0)return true;
  for(const[pos,piece]of Object.entries(board)){
    if(!piece||piece.player!==player)continue;
    const[row,col]=pos.split(",").map(Number);
    const dirs=piece.isKing?[-1,1]:[player===1?-1:1];
    for(const dr of dirs)for(const dc of[-1,1]){
      const nr=row+dr,nc=col+dc;
      if(nr<0||nr>7||nc<0||nc>7)continue;
      if(board[`${nr},${nc}`]===null||board[`${nr},${nc}`]===undefined)return true;
    }
  }
  return false;
}

function checkWinner(board,nextPlayer){
  const p1=Object.values(board).filter(p=>p&&p.player===1).length;
  const p2=Object.values(board).filter(p=>p&&p.player===2).length;
  if(p1===0)return 2;if(p2===0)return 1;
  if(!hasAnyMove(board,nextPlayer))return nextPlayer===1?2:1;
  return 0;
}

// ── All moves for a player (used for hint) ────────────────────────────────────
function getAllMovesForPlayer(board, player) {
  const all = [];
  const caps = getAllCaptures(board, player);
  if (caps.length > 0) {
    for (const c of caps) all.push({ from: c.from, to: c.to });
    return all;
  }
  for (const [pos, piece] of Object.entries(board)) {
    if (!piece || piece.player !== player) continue;
    const moves = getValidMoves(board, pos, player);
    for (const mv of moves) {
      const to = typeof mv === "string" ? mv : mv.to;
      all.push({ from: pos, to });
    }
  }
  return all;
}

// ── Minimax AI ────────────────────────────────────────────────────────────────
function boardScore(board,player){
  let s=0;
  for(const[k,p] of Object.entries(board)){
    if(!p)continue;
    const[r,c]=k.split(",").map(Number);
    const posBonus=(p.player===1?(7-r):r)*0.05+(c>=2&&c<=5?0.1:0);
    const v=p.isKing?3.5:1+posBonus;
    s+=p.player===player?v:-v;
  }
  return s;
}

function cloneBoard(board){const b={};for(const[k,v]of Object.entries(board))b[k]=v?{...v}:null;return b;}
function applyMove(board,from,to,cap=null){const b=cloneBoard(board);b[to]={...b[from]};delete b[from];if(cap)delete b[cap];const pl=b[to].player;if((pl===1&&to.split(",")[0]==="0")||(pl===2&&to.split(",")[0]==="7"))b[to].isKing=true;return b;}

function minimax(board,depth,isMax,player,alpha,beta){
  const opp=player===1?2:1,cur=isMax?player:opp,res=checkWinner(board,cur);
  if(res!==0||depth===0)return boardScore(board,player);
  const pieces=Object.keys(board).filter(k=>board[k]&&board[k].player===cur);
  let best=isMax?-Infinity:Infinity;
  for(const pos of pieces){
    const moves=getValidMoves(board,pos,cur);
    for(const mv of moves){
      const to=typeof mv==="string"?mv:mv.to,cap=typeof mv==="object"?mv.capture:null;
      const val=minimax(applyMove(board,pos,to,cap),depth-1,!isMax,player,alpha,beta);
      if(isMax){best=Math.max(best,val);alpha=Math.max(alpha,val);}
      else{best=Math.min(best,val);beta=Math.min(beta,val);}
      if(beta<=alpha)break;
    }
  }
  return best;
}

function getAIMove(board,player){
  const pieces=Object.keys(board).filter(k=>board[k]&&board[k].player===player);
  let best=null,bestScore=-Infinity;
  for(const pos of pieces){
    const moves=getValidMoves(board,pos,player);
    for(const mv of moves){
      const to=typeof mv==="string"?mv:mv.to,cap=typeof mv==="object"?mv.capture:null;
      const score=minimax(applyMove(board,pos,to,cap),4,false,player,-Infinity,Infinity);
      if(score>bestScore){bestScore=score;best={from:pos,to,capture:cap};}
    }
  }
  return best;
}

async function aiMoveWithMistral(board,player){
  const rows=[];
  for(let r=0;r<8;r++){
    let row=[];
    for(let c=0;c<8;c++){const p=board[`${r},${c}`];if(!p)row.push(".");else if(p.player===1)row.push(p.isKing?"XK":"X");else row.push(p.isKing?"OK":"O");}
    rows.push(`${8-r}|${row.join(" ")}`);
  }
  const prompt=`You play Checkers as "O" (player 2). Opponent is "X" (player 1).
Board (A-H columns, 1-8 rows from bottom):
  A B C D E F G H
${rows.join("\n")}
Rules: O moves DOWN (toward row 1), X moves UP (toward row 8). OK/XK = kings (any direction).
Mandatory capture if available.
Reply ONLY: "A1 B2" notation (source then destination). If no moves: "none".`;
  try{
    const res=await axios.post(MISTRAL_API,{model:"mistral-large-latest",messages:[{role:"user",content:prompt}],max_tokens:15,temperature:0.15},
      {headers:{"Content-Type":"application/json","Authorization":`Bearer ${MISTRAL_KEY}`},timeout:10000});
    const reply=res.data.choices[0].message.content.trim();
    if(/none/i.test(reply))return null;
    const mv=parseMove(reply);
    if(mv&&mv.from&&mv.to&&board[mv.from]&&board[mv.from].player===player){
      const valid=getValidMoves(board,mv.from,player);
      const found=valid.find(v=>(typeof v==="string"&&v===mv.to)||(typeof v==="object"&&v.to===mv.to));
      if(found)return{from:mv.from,to:mv.to,capture:typeof found==="object"?found.capture:null};
    }
  }catch{}
  return getAIMove(board,player);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME STATE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
function resetGame(gameID,p1,p2,opts={}){
  games[gameID]={
    board:createBoard(),
    players:[{id:p1.id,name:p1.name||`Player ${p1.id}`},{id:p2.id,name:p2.name||`Player ${p2.id}`}],
    currentPlayer:1,inProgress:true,
    threadID:opts.threadID||null,
    isAI:!!opts.isAI,
    imageMode:opts.imageMode!==undefined?opts.imageMode:(imageModeByThread[opts.threadID]||false),
    moves:[],bets:opts.bets||null,
    selected:null,validMoves:[],lastMove:null,
    startTime:Date.now(),
    drawOfferBy:null,
    movesSinceCapture:0,
    _ending:false,
    hintUsed:0,   // hint counter per game
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD SENDER
// ═══════════════════════════════════════════════════════════════════════════════
async function sendBoard(api,threadID,gameID,message=""){
  const game=games[gameID];if(!game)return;
  const p1=game.players[0],p2=game.players[1];
  const curName=game.currentPlayer===1?p1.name:p2.name;
  const p1c=Object.values(game.board).filter(p=>p&&p.player===1).length;
  const p2c=Object.values(game.board).filter(p=>p&&p.player===2).length;
  const elapsed=Math.floor((Date.now()-game.startTime)/1000);
  const tStr=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  const betStr=game.bets?`${await formatNumber(toBigInt(game.bets))}$`:"0$";
  const caps=getAllCaptures(game.board,game.currentPlayer);
  const remaining=getRemainingTime(gameID);
  const timerStr=remaining!==null?`⏱ ${remaining}s`:"";

  if(!game.imageMode){
    let board="";
    board+="│   A  B  C  D  E  F  G  H\n";
    for(let r=0;r<8;r++){
      let row=`│ ${8-r} `;
      for(let c=0;c<8;c++){
        const p=game.board[`${r},${c}`];
        if(!p)row+=(r+c)%2===1?"·  ":"   ";
        else if(p.player===1)row+=p.isKing?"R* ":"R  ";
        else row+=p.isKing?"N* ":"N  ";
      }
      board+=row+"\n";
    }
    const capHint=caps.length>0?`⚠️ Prise obligatoire! ${caps.map(c=>`${keyToNotation(c.from)}→${keyToNotation(c.to)}`).join(", ")}`:"";
    const lastMvStr=game.lastMove?`Dernier: ${keyToNotation(game.lastMove[0])}→${keyToNotation(game.lastMove[1])}`:"";

    return api.sendMessage(UI([
      message||"🟥 DAMES",
      "---",
      `R=Rouge (${p1.name})  N=Noir (${p2.name})  *=Dame`,
      `Pièces: R=${p1c}  N=${p2c}  Partie: ${tStr}  💰 ${betStr}`,
      ...(timerStr?[`Tour: ${timerStr} restants`]:[]),
      "---",
      board,
      "---",
      `Tour: ${curName}`,
      ...(capHint?[capHint]:[]),
      ...(lastMvStr?[lastMvStr]:[]),
      "Jouer: A1 B2  (ex: E3 D4)",
      "Aide: hint | nul | abandon | board",
    ]),threadID);
  }

  try{
    const img=await generateBoardImage(game,{getName:async(uid)=>(await getPlayerInfo(uid,{})).name},remaining);
    const fp=path.join(ASSETS_DIR,`chk_${gameID}_${Date.now()}.png`);
    await fs.writeFile(fp,img);
    const capHint=caps.length>0?`⚠️ Prise! ${caps.slice(0,3).map(c=>`${keyToNotation(c.from)}→${keyToNotation(c.to)}`).join(", ")}`:"";
    const timerLine=remaining!==null?`⏱ ${remaining}s restants`:"";
    await api.sendMessage({
      body:UI([
        message||"🟥 DAMES",
        "---",
        `Tour: ${curName}  •  R=${p1c}  N=${p2c}`,
        ...(timerLine?[timerLine]:[]),
        ...(capHint?[capHint]:[]),
        "Jouez directement: A1 B2",
        "hint | nul | abandon | board",
      ]),
      attachment:fs.createReadStream(fp)
    },threadID);
    setTimeout(()=>{try{if(fs.existsSync(fp))fs.unlinkSync(fp);}catch{}},10000);
  }catch(e){
    console.error("[dames] img error",e.message);
    await api.sendMessage(UI(["❌ Erreur image."]),threadID);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HINT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
async function sendHint(gameID, senderID, api, threadID) {
  const game = games[gameID];
  if (!game || !game.inProgress) return;
  const curId = game.currentPlayer === 1 ? game.players[0].id : game.players[1].id;
  if (curId !== senderID) {
    await api.sendMessage(UI(["❌ Ce n'est pas ton tour."]), threadID);
    return;
  }
  const moves = getAllMovesForPlayer(game.board, game.currentPlayer);
  if (!moves.length) {
    await api.sendMessage(UI(["Aucun coup possible."]), threadID);
    return;
  }
  // Get best move from minimax
  const best = getAIMove(game.board, game.currentPlayer);
  game.hintUsed = (game.hintUsed || 0) + 1;
  const lines = [`💡 Suggestion (hint #${game.hintUsed}):`];
  if (best) {
    lines.push(`Meilleur coup: ${keyToNotation(best.from)} → ${keyToNotation(best.to)}`);
    if (best.capture) lines.push(`(prise sur ${keyToNotation(best.capture)})`);
  }
  const caps = getAllCaptures(game.board, game.currentPlayer);
  if (caps.length > 0) {
    lines.push("---");
    lines.push(`⚠️ ${caps.length} prise(s) obligatoire(s):`);
    caps.slice(0, 4).forEach(c => lines.push(`  ${keyToNotation(c.from)} → ${keyToNotation(c.to)}`));
  } else {
    lines.push("---");
    lines.push(`${moves.length} coup(s) disponible(s):`);
    moves.slice(0, 5).forEach(m => lines.push(`  ${keyToNotation(m.from)} → ${keyToNotation(m.to)}`));
  }
  await api.sendMessage(UI(lines), threadID);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME END HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
async function handleGameEnd(gameID,api,threadID,winner,reason=""){
  const game=games[gameID];if(!game||game._ending)return;game._ending=true;
  clearTurnTimer(gameID);
  clearInactivityTimer(gameID);
  const p1=game.players[0],p2=game.players[1];
  const dur=Math.floor((Date.now()-game.startTime)/1000);
  const durStr=`${Math.floor(dur/60)}:${String(dur%60).padStart(2,"0")}`;

  if(winner===3){
    [p1.id,p2.id].forEach(id=>{ensurePlayerStats(id);playerStats[id].draws=(playerStats[id].draws||0)+1;playerStats[id].played++;});
    saveStats();
    if(game.bets){const bet=toBigInt(game.bets);await Promise.all([updateUserCash(p1.id,bet),updateUserCash(p2.id,bet)]);}
    addHistory({player:p1.id,opponent:p2.id,won:false,draw:true,moves:game.moves.length,duration:dur,isAI:game.isAI});
    await api.sendMessage(UI([`🤝 Match nul${reason?" — "+reason:""}!`,`Coups: ${game.moves.length}  Durée: ${durStr}`]),threadID);
    delete games[gameID];return;
  }

  const wPlayer=winner===1?p1:p2,lPlayer=winner===1?p2:p1;
  ensurePlayerStats(wPlayer.id);ensurePlayerStats(lPlayer.id);
  playerStats[wPlayer.id].wins++;playerStats[wPlayer.id].played++;
  playerStats[lPlayer.id].losses++;playerStats[lPlayer.id].played++;
  updateStreak(wPlayer.id,true);updateStreak(lPlayer.id,false);saveStats();
  const gainStr=game.bets?await formatNumber(toBigInt(game.bets)*2n):"0";
  if(game.bets)await updateUserCash(wPlayer.id,toBigInt(game.bets)*2n);
  addHistory({player:wPlayer.id,opponent:lPlayer.id,won:true,moves:game.moves.length,duration:dur,isAI:game.isAI});

  rematchPending[gameID]={bet:game.bets,threadID,p1id:p1.id,p2id:p2.id,p1accept:false,p2accept:false,bets:game.bets};
  setTimeout(()=>delete rematchPending[gameID],60000);

  await sendBoard(api,threadID,gameID,`🎉 ${wPlayer.name} gagne !${reason?" ("+reason+")":""}`);
  const lines=[`🏆 Vainqueur: ${wPlayer.name}`,`Coups: ${game.moves.length}  Durée: ${durStr}`];
  if(game.bets)lines.push(`💰 Gain: +${gainStr}$`);
  if(game.hintUsed>0)lines.push(`💡 Hints utilisés: ${game.hintUsed}`);
  const sk=playerStreaks[wPlayer.id];
  if(sk&&sk.current>1)lines.push(`🔥 Streak: ${sk.current} victoires !`);
  lines.push("---","Revanche? Tapez: revanche");
  await api.sendMessage(UI(lines),threadID);
  delete games[gameID];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════
async function processGameMove(gameID,from,to,api,threadID){
  const game=games[gameID];if(!game||!game.inProgress||game._ending)return false;
  const player=game.currentPlayer;
  const piece=game.board[from];
  if(!piece){await api.sendMessage(UI([`❌ Aucune pièce en ${keyToNotation(from)}.`]),threadID);return false;}
  if(piece.player!==player){await api.sendMessage(UI([`❌ Cette pièce n'est pas à toi.`]),threadID);return false;}

  const validMoves=getValidMoves(game.board,from,player);
  let moveObj=null;
  for(const v of validMoves){
    if(typeof v==="string"&&v===to){moveObj={to,capture:null};break;}
    if(typeof v==="object"&&v.to===to){moveObj=v;break;}
  }

  if(!moveObj){
    const allCaps=getAllCaptures(game.board,player);
    if(allCaps.length>0){
      if(!allCaps.some(c=>c.from===from)){
        const alts=allCaps.map(c=>`${keyToNotation(c.from)}→${keyToNotation(c.to)}`).join(", ");
        await api.sendMessage(UI(["❌ Prise obligatoire avec une autre pièce!",`Captures dispo: ${alts}`]),threadID);
      }else{
        const alts=allCaps.filter(c=>c.from===from).map(c=>`${keyToNotation(c.from)}→${keyToNotation(c.to)}`).join(", ");
        await api.sendMessage(UI(["❌ Tu dois capturer!",`Captures dispo: ${alts}`]),threadID);
      }
    }else{
      const moves=validMoves.map(v=>keyToNotation(typeof v==="string"?v:v.to)).join(", ");
      await api.sendMessage(UI([`❌ Mouvement invalide depuis ${keyToNotation(from)}.`,moves?`Coups dispo: ${moves}`:"Aucun coup possible."]),threadID);
    }
    return false;
  }

  // Apply move
  game.board[to]={...game.board[from]};delete game.board[from];
  if(moveObj.capture){delete game.board[moveObj.capture];game.movesSinceCapture=0;}
  else game.movesSinceCapture=(game.movesSinceCapture||0)+1;
  const wasKing = game.board[to].isKing;
  if((player===1&&to.split(",")[0]==="0")||(player===2&&to.split(",")[0]==="7"))game.board[to].isKing=true;
  const becameKing = !wasKing && game.board[to].isKing;

  game.moves.push({from,to,player,notation:`${keyToNotation(from)}-${keyToNotation(to)}`});
  game.lastMove=[from,to];game.selected=null;game.validMoves=[];game.drawOfferBy=null;

  // Reset inactivity timer on move
  clearInactivityTimer(gameID);
  inactivityTimers[gameID] = setTimeout(async () => {
    const g = games[gameID];
    if (!g || !g.inProgress || g._ending) return;
    await handleGameEnd(gameID, api, g.threadID, 3, "inactivité prolongée");
  }, INACTIVITY_LIMIT);

  // Multi-capture?
  const postCaps=moveObj.capture?getValidMoves(game.board,to,player).filter(v=>typeof v==="object"):[];
  if(moveObj.capture&&postCaps.length>0&&!becameKing){
    game.selected=to;game.validMoves=postCaps;
    const capHints=postCaps.map(c=>`${keyToNotation(c.to)}`).join(", ");
    await sendBoard(api,threadID,gameID,`🎯 ${keyToNotation(to)} peut encore capturer → ${capHints}`);
    return true;
  }

  const opponent=player===1?2:1;
  if(game.movesSinceCapture>=40){await handleGameEnd(gameID,api,threadID,3,"40 coups sans capture");return true;}
  const result=checkWinner(game.board,opponent);
  if(result!==0){await handleGameEnd(gameID,api,threadID,result);return true;}

  game.currentPlayer=opponent;

  // Announce king promotion
  if(becameKing){
    await api.sendMessage(UI([`👑 Dame ! ${keyToNotation(to)} est promu(e) Dame !`]),threadID);
  }

  // Start turn timer for PvP
  startTurnTimer(gameID, api);

  await sendBoard(api,threadID,gameID);

  // AI turn
  if(game.isAI&&game.currentPlayer===2){
    await new Promise(r=>setTimeout(r,1200));
    if(!games[gameID]||games[gameID]._ending)return true;
    const aiMove=await aiMoveWithMistral(game.board,2);
    if(!aiMove){await handleGameEnd(gameID,api,threadID,1,"IA sans coups");return true;}
    await processGameMove(gameID,aiMove.from,aiMove.to,api,threadID);
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ CORE: MOVE DETECTOR — works WITHOUT any command prefix
// Detects "A1 B2", "a1b2", "A1-B2" etc. in ANY message from a player in a game
// ═══════════════════════════════════════════════════════════════════════════════
async function handleMoveInput(api,threadID,senderID,text){
  const mv=parseMove(text);
  if(!mv||!mv.from||!mv.to)return false;

  const gameID=Object.keys(games).find(id=>
    games[id].players.some(pl=>pl.id===senderID)&&
    games[id].inProgress&&
    games[id].threadID===threadID
  );
  if(!gameID)return false;
  const game=games[gameID];
  const curId=game.currentPlayer===1?game.players[0].id:game.players[1].id;
  if(curId!==senderID)return false;

  if(game.selected&&mv.from!==game.selected){
    await api.sendMessage(UI([`⚠️ Tu dois continuer avec ${keyToNotation(game.selected)}.`]),threadID);
    return true;
  }

  await processGameMove(gameID,mv.from,mv.to,api,threadID);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config:{
    name:"dames",aliases:["checkers","damier"],version:"4.1",
    author:"Ismael03-Dev",category:"game",
    shortDescription:{en:"Checkers / Dames — jouez directement: A1 B2 (sans préfixe)"},
    countDown:2,role:0,
  },

  onStart: async function({api,event,args,usersData}){
    const threadID=event.threadID,senderID=event.senderID;
    const p=global.utils.getPrefix(threadID);
    const sub=(args[0]||"").toLowerCase();
    ensurePlayerStats(senderID);

    // ── Help ──────────────────────────────────────────────────────────────────
    if(!sub||sub==="help"){
      return api.sendMessage(UI([
        "🟥 DAMES v4.1",
        "---",
        `${p}dames @joueur <mise>  — Défi PvP`,
        `${p}dames ai <mise>       — VS IA (Mistral+minimax)`,
        `${p}dames stats           — Statistiques`,
        `${p}dames history         — Historique`,
        `${p}dames leaderboard     — Classement`,
        `${p}dames abandon         — Abandonner`,
        `${p}dames nul             — Proposer le nul`,
        `${p}dames image on/off    — Mode image`,
        `${p}dames board           — Réafficher le plateau`,
        "---",
        "⭐ Jouer SANS préfixe (taper juste):",
        "  A1 B2   ou   E3D4   ou   E3-D4",
        "  hint           → suggestion de coup",
        "  board          → voir le plateau",
        "  nul            → proposer le nul",
        "  abandon / quit → abandonner",
        "  revanche       → revanche",
        "---",
        "Notation: colonne(A-H) + rangée(1-8)",
        "Prise obligatoire! Dame auto en bout.",
        "Nul auto: 40 coups sans prise.",
        `Timer PvP: ${TURN_TIME_LIMIT}s par tour.`
      ]),threadID);
    }

    // ── Image mode ────────────────────────────────────────────────────────────
    if(sub==="image"){
      const on=(args[1]||"").toLowerCase()==="on";
      imageModeByThread[threadID]=on;
      return api.sendMessage(UI([`Mode image: ${on?"✅ ON":"❌ OFF"}`]),threadID);
    }

    // ── Show board ────────────────────────────────────────────────────────────
    if(sub==="board"||sub==="plateau"){
      const gid=Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress);
      if(!gid)return api.sendMessage(UI(["Aucune partie en cours."]),threadID);
      await sendBoard(api,threadID,gid,"📋 Plateau actuel");return;
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    if(sub==="stats"){
      const st=playerStats[senderID]||{wins:0,losses:0,draws:0,played:0};
      const sk=playerStreaks[senderID]||{current:0,best:0};
      const name=(await usersData.getName(senderID))||`Player ${senderID}`;
      const wr=st.played>0?Math.round(st.wins/st.played*100):0;
      return api.sendMessage(UI([
        `📊 STATS — ${name}`,
        "---",
        `✅ Victoires:  ${st.wins}`,
        `❌ Défaites:   ${st.losses}`,
        `🤝 Nuls:       ${st.draws||0}`,
        `🎮 Parties:    ${st.played}`,
        `📈 Winrate:    ${wr}%`,
        `🔥 Streak:     ${sk.current}`,
        `🏆 Meilleur:   ${sk.best}`
      ]),threadID);
    }

    // ── History ───────────────────────────────────────────────────────────────
    if(sub==="history"){
      const hist=gameHistory.filter(h=>h.player===senderID||h.opponent===senderID).slice(0,10);
      if(!hist.length)return api.sendMessage(UI(["📜 Aucun historique."]),threadID);
      const lines=["📜 HISTORIQUE","---"];
      for(const h of hist){
        const d=new Date(h.timestamp).toLocaleString("fr-FR");
        const res=h.draw?"🤝 Nul":h.won?"✅ Victoire":"❌ Défaite";
        const opp=h.isAI?"IA":(h.opponent?await usersData.getName(h.opponent).catch(()=>"?"):"?");
        const dur=h.duration?`${Math.floor(h.duration/60)}:${String(h.duration%60).padStart(2,"0")}`:"?";
        lines.push(`${res} vs ${opp} | ${h.moves} coups | ${dur} | ${d}`);
        lines.push("---");
      }
      return api.sendMessage(UI(lines),threadID);
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────
    if(sub==="leaderboard"){
      const sorted=Object.entries(playerStats).filter(([id])=>id!=="AI").sort((a,b)=>b[1].wins-a[1].wins).slice(0,10);
      if(!sorted.length)return api.sendMessage(UI(["Aucun joueur."]),threadID);
      const medals=["🥇","🥈","🥉"];
      const lines=["🏆 CLASSEMENT","---"];
      for(let i=0;i<sorted.length;i++){
        const[id,st]=sorted[i];
        const name=await usersData.getName(id).catch(()=>`User ${id}`);
        const wr=st.played>0?Math.round(st.wins/st.played*100):0;
        lines.push(`${medals[i]||`${i+1}.`} ${name}`);
        lines.push(`   ${st.wins}V / ${st.losses}D / ${st.draws||0}N | ${wr}% | ${st.played} parties`);
        if(i<sorted.length-1)lines.push("---");
      }
      return api.sendMessage(UI(lines),threadID);
    }

    // ── Abandon ───────────────────────────────────────────────────────────────
    if(sub==="abandon"||sub==="quit"){
      const gid=Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress);
      if(!gid)return api.sendMessage(UI(["Aucune partie en cours."]),threadID);
      const game=games[gid];
      const opp=game.players.find(pl=>pl.id!==senderID);
      const winner=opp?.id===game.players[0].id?1:2;
      await handleGameEnd(gid,api,threadID,winner,"abandon");
      return;
    }

    // ── Draw offer ────────────────────────────────────────────────────────────
    if(sub==="nul"||sub==="draw"){
      const gid=Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress);
      if(!gid)return api.sendMessage(UI(["Aucune partie en cours."]),threadID);
      const game=games[gid];
      if(game.drawOfferBy&&game.drawOfferBy!==senderID){
        await handleGameEnd(gid,api,threadID,3,"accord mutuel");return;
      }
      game.drawOfferBy=senderID;
      const me=game.players.find(pl=>pl.id===senderID);
      const opp=game.players.find(pl=>pl.id!==senderID);
      await api.sendMessage(UI([`🤝 ${me.name} propose le nul.`,`${opp.name}: tape "nul" pour accepter.`]),threadID);
      return;
    }

    // ── Hint (via prefix) ─────────────────────────────────────────────────────
    if(sub==="hint"||sub==="aide"){
      const gid=Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress);
      if(!gid)return api.sendMessage(UI(["Aucune partie en cours."]),threadID);
      await sendHint(gid,senderID,api,threadID);
      return;
    }

    // ── VS AI ─────────────────────────────────────────────────────────────────
    if(sub==="ai"||sub==="ia"){
      const bet=await parseAmount(args[1]);
      if(bet<0n)return api.sendMessage(UI(["❌ Mise invalide."]),threadID);
      if(Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress))
        return api.sendMessage(UI(["Tu as déjà une partie en cours."]),threadID);
      const cash=await getUserCash(senderID);
      if(bet>cash)return api.sendMessage(UI(["💰 Fonds insuffisants.",`Solde: ${await formatNumber(cash)}$`]),threadID);
      if(bet>0n)await updateUserCash(senderID,-bet);
      const name=(await usersData.getName(senderID))||`Player ${senderID}`;
      const gid=`ai_${threadID}_${senderID}_${Date.now()}`;
      resetGame(gid,{id:senderID,name},{id:"AI",name:"Hedgehog AI"},{threadID,isAI:true,bets:bet>0n?bet.toString():null,imageMode:imageModeByThread[threadID]||false});
      await sendBoard(api,threadID,gid,`🤖 ${name} vs IA | Mise: ${await formatNumber(bet)}$`);
      return;
    }

    // ── PvP @mention ──────────────────────────────────────────────────────────
    const mentions=event.mentions||{};
    const targetId=Object.keys(mentions)[0]||null;
    if(targetId){
      const bet=await parseAmount(args[1]);
      if(bet<0n)return api.sendMessage(UI(["❌ Mise invalide."]),threadID);
      if(targetId===senderID)return api.sendMessage(UI(["Tu ne peux pas jouer contre toi-même."]),threadID);
      if(Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===senderID)&&games[id].inProgress))
        return api.sendMessage(UI(["Tu as déjà une partie en cours."]),threadID);
      if(Object.keys(games).find(id=>games[id].players.some(pl=>pl.id===targetId)&&games[id].inProgress))
        return api.sendMessage(UI(["L'adversaire est déjà en jeu."]),threadID);
      const[cash1,cash2]=await Promise.all([getUserCash(senderID),getUserCash(targetId)]);
      if(bet>cash1)return api.sendMessage(UI(["💰 Fonds insuffisants.",`Ton solde: ${await formatNumber(cash1)}$`]),threadID);
      if(bet>cash2)return api.sendMessage(UI(["💰 L'adversaire n'a pas assez.",`Son solde: ${await formatNumber(cash2)}$`]),threadID);
      if(bet>0n)await updateUserCash(senderID,-bet);
      const name1=(await usersData.getName(senderID))||`Player ${senderID}`;
      const name2=mentions[targetId]||(await usersData.getName(targetId))||`Player ${targetId}`;
      const betStr=await formatNumber(bet);
      const cid=`ch_${senderID}_${Date.now()}`;
      const timer=setTimeout(async()=>{
        if(pendingChallenges[cid]){if(bet>0n)await updateUserCash(senderID,bet);delete pendingChallenges[cid];
        await api.sendMessage(UI(["⏰ Défi expiré (60s). Mise remboursée."]),threadID);}
      },60000);
      pendingChallenges[cid]={challengerID:senderID,targetID:targetId,bet,threadID,timer};
      await api.sendMessage(UI([
        `⚔️ ${name1} défie ${name2} !`,
        `💰 Mise: ${betStr}$ chacun`,
        "---",
        `${name2}: tape "oui" pour accepter`,
        `ou "non" pour refuser.`,
        "Délai: 60 secondes."
      ]),threadID);
      return;
    }

    // Fallback
    return api.sendMessage(UI([`Commande inconnue. Tape ${p}dames help`]),threadID);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // onChat — intercepte TOUT message du fil pour coups, commandes courtes, etc.
  // ⭐ Les coups (A1 B2) fonctionnent SANS aucun préfixe
  // ═══════════════════════════════════════════════════════════════════════════
  onChat: async function({api,event,usersData}){
    const threadID=event.threadID,senderID=event.senderID;
    const body=(event.body||"").trim();
    const bodyL=body.toLowerCase();

    // ── Challenge accept / refuse ─────────────────────────────────────────────
    if(bodyL==="oui"||bodyL==="yes"||bodyL==="accept"){
      const cid=Object.keys(pendingChallenges).find(k=>pendingChallenges[k].targetID===senderID&&pendingChallenges[k].threadID===threadID);
      if(cid){
        const ch=pendingChallenges[cid];clearTimeout(ch.timer);delete pendingChallenges[cid];
        const cash2=await getUserCash(ch.targetID);
        if(ch.bet>cash2){if(ch.bet>0n)await updateUserCash(ch.challengerID,ch.bet);await api.sendMessage(UI(["💰 Fonds insuffisants. Défi annulé."]),threadID);return;}
        if(ch.bet>0n)await updateUserCash(ch.targetID,-ch.bet);
        const[name1,name2]=await Promise.all([usersData.getName(ch.challengerID).catch(()=>`Player ${ch.challengerID}`),usersData.getName(ch.targetID).catch(()=>`Player ${ch.targetID}`)]);
        const gid=`pvp_${ch.threadID}_${ch.challengerID}_${ch.targetID}_${Date.now()}`;
        resetGame(gid,{id:ch.challengerID,name:name1},{id:ch.targetID,name:name2},{threadID:ch.threadID,bets:ch.bet>0n?ch.bet.toString():null,imageMode:imageModeByThread[ch.threadID]||false});
        await sendBoard(api,ch.threadID,gid,`⚔️ ${name1} vs ${name2} | Mise: ${await formatNumber(ch.bet)}$`);
        // Start turn timer for the first player
        startTurnTimer(gid, api);
        return;
      }
    }

    if(bodyL==="non"||bodyL==="no"||bodyL==="refus"){
      const cid=Object.keys(pendingChallenges).find(k=>pendingChallenges[k].targetID===senderID&&pendingChallenges[k].threadID===threadID);
      if(cid){const ch=pendingChallenges[cid];clearTimeout(ch.timer);if(ch.bet>0n)await updateUserCash(ch.challengerID,ch.bet);delete pendingChallenges[cid];await api.sendMessage(UI(["❌ Défi refusé. Mise remboursée."]),threadID);return;}
    }

    // ── Rematch ───────────────────────────────────────────────────────────────
    if(bodyL==="revanche"||bodyL==="rematch"){
      const rm=Object.entries(rematchPending).find(([,v])=>v.threadID===threadID&&(v.p1id===senderID||v.p2id===senderID));
      if(rm){
        const[rmid,rmv]=rm;
        if(rmv.p1id===senderID)rmv.p1accept=true;
        if(rmv.p2id===senderID)rmv.p2accept=true;
        if(rmv.p1accept&&rmv.p2accept){
          delete rematchPending[rmid];
          const bet=toBigInt(rmv.bets||"0");
          const[cash1,cash2]=await Promise.all([getUserCash(rmv.p1id),getUserCash(rmv.p2id)]);
          if(bet>0n&&(bet>cash1||bet>cash2)){await api.sendMessage(UI(["💰 Fonds insuffisants pour la revanche."]),threadID);return;}
          if(bet>0n)await Promise.all([updateUserCash(rmv.p1id,-bet),updateUserCash(rmv.p2id,-bet)]);
          const[n1,n2]=await Promise.all([usersData.getName(rmv.p1id).catch(()=>`Player ${rmv.p1id}`),usersData.getName(rmv.p2id).catch(()=>`Player ${rmv.p2id}`)]);
          const gid=`rematch_${threadID}_${Date.now()}`;
          resetGame(gid,{id:rmv.p1id,name:n1},{id:rmv.p2id,name:n2},{threadID,bets:rmv.bets,imageMode:imageModeByThread[threadID]||false});
          await sendBoard(api,threadID,gid,`🔄 REVANCHE — ${n1} vs ${n2} !`);
          startTurnTimer(gid, api);
        }else{
          const who=rmv.p1id===senderID?rmv.p2id:rmv.p1id;
          const whoName=await usersData.getName(who).catch(()=>`Player ${who}`);
          await api.sendMessage(UI([`🔄 Revanche demandée.`,`En attente de ${whoName}...`]),threadID);
        }
        return;
      }
    }

    // ── In-game short commands (no prefix needed) ─────────────────────────────
    const gid=Object.keys(games).find(id=>
      games[id].players.some(pl=>pl.id===senderID)&&
      games[id].inProgress&&
      games[id].threadID===threadID
    );

    if(gid){
      // Board display
      if(bodyL==="board"||bodyL==="plateau"){
        await sendBoard(api,threadID,gid,"📋 Plateau actuel");return;
      }

      // Hint
      if(bodyL==="hint"||bodyL==="aide"||bodyL==="?"){
        await sendHint(gid,senderID,api,threadID);return;
      }

      // Draw offer
      if(bodyL==="nul"||bodyL==="draw"){
        const game=games[gid];
        if(game.drawOfferBy&&game.drawOfferBy!==senderID){await handleGameEnd(gid,api,threadID,3,"accord mutuel");return;}
        game.drawOfferBy=senderID;
        const me=game.players.find(pl=>pl.id===senderID);
        const opp=game.players.find(pl=>pl.id!==senderID);
        await api.sendMessage(UI([`🤝 ${me.name} propose le nul.`,`${opp.name}: tape "nul" pour accepter.`]),threadID);
        return;
      }

      // Abandon
      if(bodyL==="abandon"||bodyL==="quit"||bodyL==="gg"){
        const game=games[gid];
        const opp=game.players.find(pl=>pl.id!==senderID);
        const winner=opp?.id===game.players[0].id?1:2;
        await handleGameEnd(gid,api,threadID,winner,"abandon");
        return;
      }

      // Timer query
      if(bodyL==="time"||bodyL==="timer"||bodyL==="temps"){
        const rem=getRemainingTime(gid);
        if(rem!==null){
          const curP=games[gid].currentPlayer===1?games[gid].players[0]:games[gid].players[1];
          await api.sendMessage(UI([`⏱ ${curP.name} a ${rem}s restants.`]),threadID);
        }else{
          await api.sendMessage(UI(["⏱ Pas de timer actif (partie vs IA)."]),threadID);
        }
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ⭐ MOVE DETECTION — no prefix required, works in all messages
    // ─────────────────────────────────────────────────────────────────────────
    await handleMoveInput(api,threadID,senderID,body);
  }
};
