const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const API_URL    = "https://hedgehog-bank.vercel.app/api/bank";
const CASH_URL   = "https://cash-api-five.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";

const BOT_ADMINS = ["61578433048588", "61580558711299"];
const AUTO_VIP   = ["61578433048588", "61580558711299"];

const VIP_FILE            = path.join(__dirname, "bank_vips.json");
const PENDING_FILE        = path.join(__dirname, "bank_pending.json");
const IMAGE_SETTINGS_FILE = path.join(__dirname, "bank_image_settings.json");

let vipList = [];
try { if (fs.existsSync(VIP_FILE)) vipList = JSON.parse(fs.readFileSync(VIP_FILE, "utf8")); } catch {}
function saveVIPs() { try { fs.writeFileSync(VIP_FILE, JSON.stringify(vipList, null, 2)); } catch {} }

let imageSettings = {};
try { if (fs.existsSync(IMAGE_SETTINGS_FILE)) imageSettings = JSON.parse(fs.readFileSync(IMAGE_SETTINGS_FILE, "utf8")); } catch {}
function saveImageSettings() { try { fs.writeFileSync(IMAGE_SETTINGS_FILE, JSON.stringify(imageSettings, null, 2)); } catch {} }

let pendingTransactions = new Map();
try { if (fs.existsSync(PENDING_FILE)) pendingTransactions = new Map(Object.entries(JSON.parse(fs.readFileSync(PENDING_FILE, "utf8")))); } catch {}
const pendingTimeouts   = new Map();
const pendingMessageIDs = new Map();
function savePending() { try { fs.writeFileSync(PENDING_FILE, JSON.stringify(Object.fromEntries(pendingTransactions), null, 2)); } catch {} }

const MAX_LIMIT = 10n ** 261n;

const TIERS = [
    { v: 10n**258n, s: "Qiu" }, { v: 10n**255n, s: "Qu"  }, { v: 10n**252n, s: "Tu"  },
    { v: 10n**249n, s: "Du"  }, { v: 10n**246n, s: "Uc"  }, { v: 10n**243n, s: "DcQ" },
    { v: 10n**240n, s: "NoQ" }, { v: 10n**237n, s: "OcQ" }, { v: 10n**234n, s: "SpQ" },
    { v: 10n**231n, s: "SxQ" }, { v: 10n**228n, s: "QiQ" }, { v: 10n**225n, s: "QQ"  },
    { v: 10n**222n, s: "TQ"  }, { v: 10n**219n, s: "DQ"  }, { v: 10n**216n, s: "UQ"  },
    { v: 10n**213n, s: "DcTr"}, { v: 10n**210n, s: "NoTr"}, { v: 10n**207n, s: "OcTr"},
    { v: 10n**204n, s: "SpTr"}, { v: 10n**201n, s: "SxTr"}, { v: 10n**198n, s: "QiTr"},
    { v: 10n**195n, s: "QTr" }, { v: 10n**192n, s: "TTr" }, { v: 10n**189n, s: "DTr" },
    { v: 10n**186n, s: "UTr" }, { v: 10n**183n, s: "DcT" }, { v: 10n**180n, s: "NoT" },
    { v: 10n**177n, s: "OcT" }, { v: 10n**174n, s: "SpT" }, { v: 10n**171n, s: "SxT" },
    { v: 10n**168n, s: "QiT" }, { v: 10n**165n, s: "QT"  }, { v: 10n**162n, s: "TT"  },
    { v: 10n**159n, s: "DT"  }, { v: 10n**156n, s: "UT"  }, { v: 10n**153n, s: "DcV" },
    { v: 10n**150n, s: "NoV" }, { v: 10n**147n, s: "OcV" }, { v: 10n**144n, s: "SpV" },
    { v: 10n**141n, s: "SxV" }, { v: 10n**138n, s: "QiV" }, { v: 10n**135n, s: "QV"  },
    { v: 10n**132n, s: "TV"  }, { v: 10n**129n, s: "DV"  }, { v: 10n**126n, s: "UV"  },
    { v: 10n**123n, s: "DcI" }, { v: 10n**120n, s: "NoI" }, { v: 10n**117n, s: "OcI" },
    { v: 10n**114n, s: "SpI" }, { v: 10n**111n, s: "SxI" }, { v: 10n**108n, s: "QiI" },
    { v: 10n**105n, s: "QI"  }, { v: 10n**102n, s: "TI"  }, { v: 10n**99n,  s: "DI"  },
    { v: 10n**96n,  s: "UI"  }, { v: 10n**93n,  s: "DcN" }, { v: 10n**90n,  s: "NoN" },
    { v: 10n**87n,  s: "OcN" }, { v: 10n**84n,  s: "SpN" }, { v: 10n**81n,  s: "SxN" },
    { v: 10n**78n,  s: "QiN" }, { v: 10n**75n,  s: "QaN" }, { v: 10n**72n,  s: "TN"  },
    { v: 10n**69n,  s: "BN"  }, { v: 10n**66n,  s: "MN"  }, { v: 10n**63n,  s: "kN"  },
    { v: 10n**60n,  s: "NoDc"}, { v: 10n**57n,  s: "OcDc"}, { v: 10n**54n,  s: "SpDc"},
    { v: 10n**51n,  s: "SxDc"}, { v: 10n**48n,  s: "QiDc"}, { v: 10n**45n,  s: "QaDc"},
    { v: 10n**42n,  s: "TDc" }, { v: 10n**39n,  s: "DDc" }, { v: 10n**36n,  s: "UDc" },
    { v: 10n**33n,  s: "Dc"  }, { v: 10n**30n,  s: "No"  }, { v: 10n**27n,  s: "Oc"  },
    { v: 10n**24n,  s: "Sp"  }, { v: 10n**21n,  s: "Sx"  }, { v: 10n**18n,  s: "Qi"  },
    { v: 10n**15n,  s: "Qa"  }, { v: 10n**12n,  s: "T"   }, { v: 10n**9n,   s: "B"   },
    { v: 10n**6n,   s: "M"   }, { v: 10n**3n,   s: "k"   },
];

const SFX = {
    k:10n**3n, m:10n**6n, b:10n**9n, t:10n**12n, qa:10n**15n, qi:10n**18n,
    sx:10n**21n, sp:10n**24n, oc:10n**27n, no:10n**30n, dc:10n**33n,
    udc:10n**36n, ddc:10n**39n, tdc:10n**42n, qadc:10n**45n, qidc:10n**48n,
    sxdc:10n**51n, spdc:10n**54n, ocdc:10n**57n, nodc:10n**60n,
    kn:10n**63n, mn:10n**66n, bn:10n**69n, tn:10n**72n,
    qan:10n**75n, qin:10n**78n, sxn:10n**81n, spn:10n**84n,
    ocn:10n**87n, non:10n**90n, dcn:10n**93n,
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
};

function toBigInt(value) {
    if (typeof value === "bigint") return value;
    if (value === undefined || value === null) return 0n;
    const str = String(value).trim();
    if (str === "∞" || str.toLowerCase() === "infinity") return MAX_LIMIT;
    try {
        const clean = str.split(".")[0].replace(/[^0-9\-]/g, "") || "0";
        const result = BigInt(clean);
        if (result >= MAX_LIMIT)  return MAX_LIMIT;
        if (result <= -MAX_LIMIT) return -MAX_LIMIT;
        return result;
    } catch { return 0n; }
}

function looksLikeAmount(str) {
    if (!str) return false;
    return /^-?\d+(\.\d+)?([a-zA-Z_]+)?$/.test(String(str).trim()) && !/^@/.test(str);
}

const fmtCache = new Map();
async function formatNumber(num) {
    const big = toBigInt(num);
    if (big === 0n) return "0";
    if (big >= MAX_LIMIT || big <= -MAX_LIMIT) return "∞";
    const key = big.toString();
    if (fmtCache.has(key)) return fmtCache.get(key);
    try {
        const r = await axios.get(`${FORMAT_URL}?n=${key}`, { timeout: 3000 });
        if (r.data?.success && r.data?.formatted) {
            if (fmtCache.size > 500) fmtCache.delete(fmtCache.keys().next().value);
            fmtCache.set(key, r.data.formatted);
            return r.data.formatted;
        }
    } catch {}
    const neg = big < 0n;
    const abs = neg ? -big : big;
    for (const tier of TIERS) {
        if (abs >= tier.v) {
            const i   = abs / tier.v;
            const rem = abs % tier.v;
            const dec = Number((rem * 100n) / tier.v).toString().padStart(2, "0").replace(/0+$/, "");
            const pfx = neg ? "-" : "";
            return dec ? `${pfx}${i}.${dec}${tier.s}` : `${pfx}${i}${tier.s}`;
        }
    }
    return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function parseAmount(input) {
    if (!input) return 0n;
    const str = String(input).toLowerCase().trim();
    if (str === "∞" || str === "inf" || str === "infinity") return MAX_LIMIT;
    try {
        const r = await axios.get(`${FORMAT_URL}?input=${encodeURIComponent(str)}`, { timeout: 3000 });
        if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw);
    } catch {}
    const m = str.match(/^(-?\d+(?:\.\d+)?)([a-z_]+)?$/i);
    if (!m) return 0n;
    const val = parseFloat(m[1]);
    const sfx = (m[2] || "").toLowerCase();
    if (isNaN(val)) return 0n;
    const base = BigInt(Math.floor(Math.abs(val)));
    const neg  = val < 0;
    if (!sfx) return neg ? -base : base;
    const mult = SFX[sfx];
    if (mult) {
        const result = base * mult;
        if (result >= MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT;
        return neg ? -result : result;
    }
    return neg ? -base : base;
}

async function getCash(uid) {
    try {
        const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 5000 });
        if (r.data?.success) return toBigInt(r.data.data.cash);
    } catch {}
    return 0n;
}

async function addCash(uid, amount) {
    const a = toBigInt(amount);
    try {
        if (a > 0n)      await axios.post(`${CASH_URL}/${uid}/add`,      { amount: a.toString() }, { timeout: 5000 });
        else if (a < 0n) await axios.post(`${CASH_URL}/${uid}/subtract`, { amount: (-a).toString() }, { timeout: 5000 });
    } catch (e) { console.error("Cash API:", e.message); }
}

async function apiCall(endpoint, method = "GET", body = null) {
    try {
        const config = {
            method,
            url:     `${API_URL}${endpoint}`,
            headers: { "Content-Type": "application/json" },
            timeout: 8000,
        };
        if (body) config.data = body;
        const r = await axios(config);
        return r.data;
    } catch (e) {
        if (e.response?.data) return e.response.data;
        return { success: false, error: e.message };
    }
}

function clearPending(uid) {
    if (pendingTimeouts.has(uid)) { clearTimeout(pendingTimeouts.get(uid)); pendingTimeouts.delete(uid); }
    pendingTransactions.delete(uid);
    pendingMessageIDs.delete(uid);
    savePending();
}

function setPending(uid, data, onExpire, ms = 30000) {
    clearPending(uid);
    pendingTransactions.set(uid, data);
    savePending();
    const timeout = setTimeout(() => {
        if (pendingTransactions.has(uid)) {
            clearPending(uid);
            if (onExpire) onExpire();
        }
    }, ms);
    pendingTimeouts.set(uid, timeout);
}

function makeCvvOptions(realCvv) {
    const fakes = [];
    while (fakes.length < 3) {
        const f = Math.floor(Math.random() * 900 + 100);
        if (f !== realCvv && !fakes.includes(f)) fakes.push(f);
    }
    const opts = [...fakes, realCvv].sort(() => Math.random() - 0.5);
    return { opts, correctIndex: opts.indexOf(realCvv) + 1 };
}

function buildCvvLines(opts, intro) {
    return [
        intro, "---",
        "🔐 Quel est ton CVV ?",
        "Réponds à CE message avec 1, 2, 3 ou 4",
        `1️⃣  ${opts[0]}`,
        `2️⃣  ${opts[1]}`,
        `3️⃣  ${opts[2]}`,
        `4️⃣  ${opts[3]}`,
        "---",
        "⏰ Tu as 30 secondes",
    ];
}

function wrapText(text, maxW = 42) {
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (test.length <= maxW) cur = test;
        else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
}

function UI(lines) {
    let out = "╭─────────────•┈┈\n";
    for (const line of lines) {
        if (line === "---") { out += "├─────────────•┈┈\n"; continue; }
        for (const w of wrapText(String(line), 42)) out += `│ ${w}\n`;
    }
    return out + "╰─────────────•┈┈";
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

async function drawCard(ctx, W, H, theme = "dark") {
    const themes = {
        dark:   ["#0d0d1a","#1a1035","#0a0a2e"],
        gold:   ["#1a1200","#2a1f00","#1a1000"],
        green:  ["#001a0d","#00260f","#001508"],
        purple: ["#0d001a","#1a0035","#0a002e"],
    };
    const cols = themes[theme] || themes.dark;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, cols[0]); bg.addColorStop(0.5, cols[1]); bg.addColorStop(1, cols[2]);
    ctx.fillStyle = bg; roundRect(ctx, 0, 0, W, H, 22); ctx.fill();
    for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(W*.75, H*.3, 60+i*35, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 52, W, 38);
    const shine = ctx.createLinearGradient(0, 0, 0, 90);
    shine.addColorStop(0, "rgba(255,255,255,0.07)"); shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine; ctx.fillRect(0, 0, W, 90);
}

async function generateBankCard(opts = {}) {
    const { title="CARD", balance="0", username="USER", cardData=null, cvv=null, avatarUrl=null, theme="dark", subtitle="", note="" } = opts;
    const W=640, H=385;
    const canvas = createCanvas(W, H); const ctx = canvas.getContext("2d");
    await drawCard(ctx, W, H, theme);
    ctx.fillStyle="#d4af37"; ctx.font="bold 17px 'Courier New'"; ctx.fillText("HEDGEHOG",28,35);
    ctx.fillStyle="rgba(212,175,55,0.6)"; ctx.font="9px 'Courier New'"; ctx.fillText("PREMIUM BANKING",28,48);
    ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.ellipse(W-55,28,28,18,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W-35,28,28,18,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#d4af37"; ctx.font="bold 11px 'Courier New'"; ctx.fillText("HBK",W-62,33);
    if (avatarUrl) { try { const av=await loadImage(avatarUrl); const ax=W-78,ay=95,ar=30; ctx.save(); ctx.beginPath(); ctx.arc(ax,ay,ar,0,Math.PI*2); ctx.clip(); ctx.drawImage(av,ax-ar,ay-ar,ar*2,ar*2); ctx.restore(); ctx.beginPath(); ctx.arc(ax,ay,ar+2,0,Math.PI*2); ctx.strokeStyle="#d4af37"; ctx.lineWidth=2; ctx.stroke(); } catch {} }
    ctx.fillStyle="#c8a415"; ctx.beginPath(); ctx.roundRect(28,98,52,38,5); ctx.fill();
    ctx.strokeStyle="#a88010"; ctx.lineWidth=.8;
    [[28,107,80,107],[28,117,80,117],[28,127,80,127],[44,98,44,136],[58,98,58,136]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
    ctx.fillStyle="#e8c020"; ctx.fillRect(44,107,14,20);
    ctx.fillStyle="#e8e8e8"; ctx.font="bold 22px 'Courier New'"; ctx.fillText(cardData?.cardNumber||"4532 **** **** 5772",28,180);
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="8px 'Courier New'"; ctx.fillText("VALID",28,202); ctx.fillText("THRU",28,212);
    ctx.fillStyle="#fff"; ctx.font="bold 13px 'Courier New'"; ctx.fillText(cardData?.cardExpiry||"12/28",28,225);
    ctx.fillStyle="#ffffff"; ctx.font="bold 15px 'Courier New'"; ctx.fillText(username.toUpperCase().substring(0,24),28,265);
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="8px 'Courier New'"; ctx.fillText("CARDHOLDER",28,277);
    ctx.fillStyle="rgba(212,175,55,0.12)"; ctx.beginPath(); ctx.roundRect(W-220,H-100,205,82,8); ctx.fill();
    ctx.strokeStyle="rgba(212,175,55,0.3)"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="8px 'Courier New'"; ctx.fillText("SOLDE",W-210,H-80);
    ctx.fillStyle="#d4af37"; ctx.font=`bold ${balance.length>10?"16":"22"}px 'Courier New'`; ctx.fillText(`${balance}$`,W-210,H-57);
    if (subtitle) { ctx.fillStyle="#88ff88"; ctx.font="11px 'Courier New'"; ctx.fillText(subtitle.substring(0,28),W-210,H-38); }
    if (note)     { ctx.fillStyle="#aaaaaa"; ctx.font="10px 'Courier New'"; ctx.fillText(note.substring(0,28),W-210,H-22); }
    if (cvv)      { ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.font="8px 'Courier New'"; ctx.fillText("CVV",W-210,115); ctx.fillStyle="#d4af37"; ctx.font="bold 14px 'Courier New'"; ctx.fillText(String(cvv),W-210,130); }
    ctx.fillStyle="rgba(212,175,55,0.5)"; ctx.font="10px 'Courier New'"; ctx.fillText(title.toUpperCase(),W-210,H-8);
    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fillRect(0,H-20,W,20);
    ctx.fillStyle="rgba(212,175,55,0.4)"; ctx.font="8px 'Courier New'";
    const d=new Date(); ctx.fillText(`HEDGEHOG BANK • PREMIUM • ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,W/2-145,H-6);
    return canvas.toBuffer("image/png");
}

async function generateCasinoCard(opts = {}) {
    const { username="USER", win=false, choice="", result="", amount="0", winAmount="0", balance="0", mode="gamble" } = opts;
    const W=640, H=360; const canvas=createCanvas(W,H); const ctx=canvas.getContext("2d");
    const bg=ctx.createLinearGradient(0,0,W,H); bg.addColorStop(0,"#0d0005"); bg.addColorStop(0.5,"#200010"); bg.addColorStop(1,"#0a0003");
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(0,0,W,H,16); ctx.fill();
    ctx.fillStyle="rgba(0,80,30,0.15)"; ctx.beginPath(); ctx.ellipse(W/2,H/2,W*.45,H*.35,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=win?"#00ff88":"#ff4444"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.roundRect(6,6,W-12,H-12,14); ctx.stroke();
    ctx.fillStyle="#d4af37"; ctx.font="bold 20px 'Courier New'"; ctx.fillText(mode==="lottery"?"HEDGEHOG LOTTERY":"HEDGEHOG CASINO",28,42);
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="9px 'Courier New'"; ctx.fillText(mode==="gamble"?"PILE OU FACE":"LUCKY DRAW",28,56);
    ctx.fillStyle="#fff"; ctx.font="bold 13px 'Courier New'"; ctx.fillText(username.toUpperCase().substring(0,20),28,90);
    if (mode==="gamble") {
        const cx=W/2,cy=H/2-10; ctx.fillStyle=result==="pile"?"#d4af37":"#c0c0c0"; ctx.beginPath(); ctx.arc(cx,cy,45,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=result==="pile"?"#a08010":"#909090"; ctx.lineWidth=3; ctx.stroke();
        ctx.fillStyle="#1a1a1a"; ctx.font="bold 16px 'Courier New'"; ctx.textAlign="center"; ctx.fillText(result==="pile"?"PILE":"FACE",cx,cy+6); ctx.textAlign="left";
        ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="11px 'Courier New'"; ctx.fillText(`Choix : ${choice.toUpperCase()}`,28,155); ctx.fillText(`Résultat : ${result.toUpperCase()}`,28,172);
    }
    ctx.fillStyle=win?"#00ff88":"#ff4444"; ctx.font="bold 22px 'Courier New'"; ctx.fillText(win?"✓ GAGNÉ !":"✗ PERDU !",28,215);
    ctx.fillStyle=win?"#88ffaa":"#ff8888"; ctx.font="15px 'Courier New'"; ctx.fillText(win?`+${winAmount}$`:`-${amount}$`,28,240);
    ctx.fillStyle="#d4af37"; ctx.font="bold 20px 'Courier New'"; ctx.fillText(`${balance}$`,W-230,H-40);
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font="9px 'Courier New'"; ctx.fillText("NOUVEAU SOLDE",W-230,H-25);
    const d2=new Date(); ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font="8px 'Courier New'"; ctx.fillText(`${d2.getDate()}/${d2.getMonth()+1}/${d2.getFullYear()}`,W-100,H-10);
    return canvas.toBuffer("image/png");
}

async function sendCard(message, bodyLines, cardOpts, imageMode) {
    const body = UI(bodyLines);
    if (!imageMode) return message.reply(body);
    try {
        const img     = await generateBankCard(cardOpts);
        const imgPath = path.join(__dirname, `bank_tmp_${Date.now()}.png`);
        fs.writeFileSync(imgPath, img);
        await message.reply({ body, attachment: fs.createReadStream(imgPath) });
        setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 5000);
    } catch { await message.reply(body); }
}

async function sendCasino(message, bodyLines, casinoOpts, imageMode) {
    const body = UI(bodyLines);
    if (!imageMode) return message.reply(body);
    try {
        const img     = await generateCasinoCard(casinoOpts);
        const imgPath = path.join(__dirname, `casino_tmp_${Date.now()}.png`);
        fs.writeFileSync(imgPath, img);
        await message.reply({ body, attachment: fs.createReadStream(imgPath) });
        setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 5000);
    } catch { await message.reply(body); }
}

async function processCvvReply(choice, uid, bankData, message, api, imageMode) {
    const pending = pendingTransactions.get(uid);
    if (!pending) return false;
    if (!["1","2","3","4"].includes(String(choice))) return false;

    const idx = parseInt(choice);
    clearPending(uid);

    async function getAvatar(id) { try { const d = await api.getUserInfo(id); return d[id]?.thumbSrc || `https://graph.facebook.com/${id}/picture?width=200&height=200`; } catch { return `https://graph.facebook.com/${id}/picture?width=200&height=200`; } }
    async function getName(id)   { try { const d = await api.getUserInfo(id); return d[id]?.name || id; } catch { return id; } }
    async function getUsername()  { try { const d = await api.getUserInfo(uid); return d[uid]?.name || "Utilisateur"; } catch { return "Utilisateur"; } }

    if (idx !== pending.correctIndex) {
        await message.reply(UI([
            pending.type === "rob" ? "🦹 VOL ÉCHOUÉ !" : "❌ Transaction annulée !",
            "---",
            "❌ Mauvais CVV !",
            `📍 Le bon CVV était le choix ${pending.correctIndex} (${pending.opts[pending.correctIndex - 1]})`,
        ]));
        return true;
    }

    const username = await getUsername();

    if (pending.type === "deposit") {
        const amount = toBigInt(pending.amount);
        const cash   = await getCash(uid);
        if (amount > cash) { await message.reply(UI(["❌ Solde cash insuffisant."])); return true; }
        const result = await apiCall(`/${uid}/deposit`, "POST", { amount: amount.toString(), cvv: bankData.card?.cardCvv });
        if (!result.success) { await message.reply(UI([`❌ ${result.error}`])); return true; }
        await addCash(uid, -amount);
        const bd = (await apiCall(`/${uid}`)).data || bankData;
        return sendCard(message, ["✅ Dépôt effectué !","---",`+${await formatNumber(amount)}$`,`💰 ${await formatNumber(bd.bank)}$`],
            { title:"DEPOSIT", balance:await formatNumber(bd.bank), username, cardData:bd.card, avatarUrl:await getAvatar(uid), subtitle:`+${await formatNumber(amount)}$` }, imageMode);
    }

    if (pending.type === "withdraw") {
        const amount = toBigInt(pending.amount);
        if (amount > toBigInt(bankData.bank)) { await message.reply(UI(["❌ Solde insuffisant."])); return true; }
        const result = await apiCall(`/${uid}/withdraw`, "POST", { amount: amount.toString(), cvv: bankData.card?.cardCvv });
        if (!result.success) { await message.reply(UI([`❌ ${result.error}`])); return true; }
        await addCash(uid, amount);
        const bd = (await apiCall(`/${uid}`)).data || bankData;
        return sendCard(message, ["💸 Retrait effectué !","---",`-${await formatNumber(amount)}$`,`💰 ${await formatNumber(bd.bank)}$`],
            { title:"WITHDRAW", balance:await formatNumber(bd.bank), username, cardData:bd.card, avatarUrl:await getAvatar(uid), subtitle:`-${await formatNumber(amount)}$` }, imageMode);
    }

    if (pending.type === "transfer" || pending.type === "gift") {
        const amount = toBigInt(pending.amount);
        if (amount > toBigInt(bankData.bank)) { await message.reply(UI(["❌ Solde insuffisant."])); return true; }
        const result = await apiCall(`/${uid}/transfer`, "POST", { targetId: pending.targetId, amount: amount.toString(), cvv: bankData.card?.cardCvv });
        if (!result.success) { await message.reply(UI([`❌ ${result.error}`])); return true; }
        const bd = (await apiCall(`/${uid}`)).data || bankData;
        return sendCard(message, [
            pending.type==="gift"?"🎁 Cadeau envoyé !":"💸 Transfert réussi !","---",
            `Vers: ${pending.targetName}`, `-${await formatNumber(amount)}$`, `💰 ${await formatNumber(bd.bank)}$`,
        ], { title:pending.type==="gift"?"GIFT":"TRANSFER", balance:await formatNumber(bd.bank), username, cardData:bd.card, avatarUrl:await getAvatar(uid), subtitle:`-${await formatNumber(amount)}$` }, imageMode);
    }

    if (pending.type === "rob") {
        const amount    = toBigInt(pending.amount);
        const targetId  = pending.targetId;
        const targetRes = await apiCall(`/${targetId}`);
        const targetBal = toBigInt(targetRes.data?.bank || "0");
        if (amount > targetBal) { await message.reply(UI(["❌ La cible a dépensé son argent entre temps."])); return true; }
        const result = await apiCall(`/${uid}/rob`, "POST", { targetId, amount: amount.toString() });
        if (!result.success) { await message.reply(UI([`❌ ${result.error}`])); return true; }
        const bd = (await apiCall(`/${uid}`)).data || bankData;
        return sendCard(message, [
            "🦹 VOL RÉUSSI !","---",
            `Cible: ${await getName(targetId)}`, `+${await formatNumber(amount)}$`, `💰 ${await formatNumber(bd.bank)}$`,
        ], { title:"ROB", balance:await formatNumber(bd.bank), username, cardData:bd.card, avatarUrl:await getAvatar(uid), subtitle:`+${await formatNumber(amount)}$`, theme:"purple" }, imageMode);
    }

    return true;
}

module.exports = {
    config: {
        name:        "bank",
        description: "Hedgehog Bank — Système bancaire complet",
        category:    "economy",
        countDown:   2,
        role:        0,
        author:      "Ismael Soma",
    },

    onStart: async function ({ args, message, event, api }) {
        const { getPrefix } = global.utils;
        const p    = getPrefix(event.threadID);
        const user = String(event.senderID);

        for (const id of AUTO_VIP) { if (!vipList.includes(id)) { vipList.push(id); saveVIPs(); } }
        const isVip = vipList.includes(user);

        let userInfo = {};
        try { userInfo = await api.getUserInfo(user); } catch {}
        const username  = userInfo[user]?.name || "Utilisateur";
        const imageMode = imageSettings[user] !== false;

        async function getAvatar(uid) { try { const d = await api.getUserInfo(uid); return d[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200`; } catch { return `https://graph.facebook.com/${uid}/picture?width=200&height=200`; } }
        async function getName(uid)   { try { const d = await api.getUserInfo(uid); return d[uid]?.name || uid; } catch { return uid; } }

        let bankRes  = await apiCall(`/${user}`);
        let bankData = bankRes.success ? bankRes.data : { bank:"0", card:null, dailyStreak:0, lastDaily:0, totalInvested:"0", parrainCount:0, savings:{ amount:"0", releaseDate:0 }, loans:[] };

        const cmd     = (args[0] || "").toLowerCase().trim();
        const pending = pendingTransactions.get(user);

        if (pending && /^[1-4]$/.test(cmd)) {
            const handled = await processCvvReply(cmd, user, bankData, message, api, imageMode);
            if (handled) return;
        }

        switch (cmd) {

            case "deposit": {
                const amount = await parseAmount(args[1]);
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide.", `📝 ${p}bank deposit <montant>`]));
                if (!bankData.card?.cardCreated) return message.reply(UI(["❌ Créez d'abord une carte.", `📝 ${p}bank card`]));
                const cash = await getCash(user);
                if (amount > cash) return message.reply(UI(["❌ Solde cash insuffisant.", `💰 Poche : ${await formatNumber(cash)}$`, `🎯 Montant : ${await formatNumber(amount)}$`]));
                const { opts, correctIndex } = makeCvvOptions(bankData.card.cardCvv);
                setPending(user, { type:"deposit", amount:amount.toString(), correctIndex, opts }, () => message.reply(UI(["⏰ Transaction expirée."])));
                await new Promise(resolve => {
                    api.sendMessage({ body: UI(buildCvvLines(opts, `💳 Dépôt de ${""}`)) }, event.threadID, (err, info) => {
                        if (info?.messageID) pendingMessageIDs.set(user, info.messageID);
                        resolve();
                    });
                });
                const fAmt = await formatNumber(amount);
                setPending(user, { type:"deposit", amount:amount.toString(), correctIndex, opts }, () => message.reply(UI(["⏰ Transaction expirée."])));
                await new Promise(resolve => {
                    api.sendMessage({ body: UI(buildCvvLines(opts, `💳 Dépôt de ${fAmt}$`)) }, event.threadID, (err, info) => {
                        if (info?.messageID) pendingMessageIDs.set(user, info.messageID);
                        resolve();
                    });
                });
                return;
            }

            case "withdraw": {
                const amount = await parseAmount(args[1]);
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide.", `📝 ${p}bank withdraw <montant>`]));
                if (!bankData.card?.cardCreated) return message.reply(UI(["❌ Créez d'abord une carte."]));
                if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant.", `💰 Banque : ${await formatNumber(bankData.bank)}$`]));
                const fAmt = await formatNumber(amount);
                const { opts, correctIndex } = makeCvvOptions(bankData.card.cardCvv);
                setPending(user, { type:"withdraw", amount:amount.toString(), correctIndex, opts }, () => message.reply(UI(["⏰ Transaction expirée."])));
                await new Promise(resolve => {
                    api.sendMessage({ body: UI(buildCvvLines(opts, `💸 Retrait de ${fAmt}$`)) }, event.threadID, (err, info) => {
                        if (info?.messageID) pendingMessageIDs.set(user, info.messageID);
                        resolve();
                    });
                });
                return;
            }

            case "balance": case "show": case "bal": {
                const cash = await getCash(user);
                const bal  = toBigInt(bankData.bank);
                return sendCard(message, [
                    "💰 VOS SOLDES","---",
                    `🏦 Banque : ${await formatNumber(bal)}$`,
                    `💵 Poche  : ${await formatNumber(cash)}$`,
                    `💎 Total  : ${await formatNumber(bal + cash)}$`,
                    isVip ? "⭐ Statut : VIP" : "👤 Statut : Standard",
                ], { title:"BALANCE", balance:await formatNumber(bal), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`Poche: ${await formatNumber(cash)}$` }, imageMode);
            }

            case "card": {
                const result = await apiCall(`/${user}/card`, "POST");
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData.card = result.data;
                const avatarUrl = await getAvatar(user);
                const img = await generateBankCard({ title:"MY CARD", balance:await formatNumber(toBigInt(bankData.bank)), username, cardData:result.data, cvv:result.data.cardCvv, avatarUrl, theme:"gold" });
                const imgPath = path.join(__dirname, `bank_card_${user}_${Date.now()}.png`);
                fs.writeFileSync(imgPath, img);
                await new Promise(resolve => {
                    api.sendMessage({
                        body: UI(["💳 CARTE BANCAIRE","---",`N° ${result.data.cardNumber}`,`Exp ${result.data.cardExpiry}`,`CVV ${result.data.cardCvv}`,"---","⚠️ Message supprimé dans 10s","📌 Mémorisez votre CVV !"]),
                        attachment: fs.createReadStream(imgPath),
                    }, event.threadID, (err, info) => {
                        setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 3000);
                        if (info?.messageID) {
                            setTimeout(async () => { try { await api.unsendMessage(info.messageID); } catch {} }, 10000);
                        }
                        resolve();
                    });
                });
                return;
            }

            case "transfer": case "send": case "gift": {
                const mentionKeys = Object.keys(event.mentions);
                const targetId    = mentionKeys[0] || args[1];
                const amountStr   = mentionKeys.length > 0 ? args[1] : args[2];
                const amount      = await parseAmount(amountStr);
                if (!targetId || targetId === user) return message.reply(UI(["❌ Cible invalide.", `📝 ${p}bank ${cmd} @mention <montant>`]));
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide."]));
                if (!bankData.card?.cardCreated) return message.reply(UI(["❌ Créez d'abord une carte."]));
                if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
                const targetName  = await getName(targetId);
                const fAmt        = await formatNumber(amount);
                const { opts, correctIndex } = makeCvvOptions(bankData.card.cardCvv);
                const intro = `${cmd==="gift"?"🎁":"💸"} ${cmd==="gift"?"Cadeau":"Transfert"} de ${fAmt}$ → ${targetName}`;
                setPending(user, { type:cmd, amount:amount.toString(), targetId, targetName, correctIndex, opts }, () => message.reply(UI(["⏰ Transaction expirée."])));
                await new Promise(resolve => {
                    api.sendMessage({ body: UI(buildCvvLines(opts, intro)) }, event.threadID, (err, info) => {
                        if (info?.messageID) pendingMessageIDs.set(user, info.messageID);
                        resolve();
                    });
                });
                return;
            }

            case "interest": {
                if (toBigInt(bankData.bank) <= 0n) return message.reply(UI(["❌ Pas d'argent en banque."]));
                const result = await apiCall(`/${user}/interest`, "POST");
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                return sendCard(message, ["📈 Intérêts crédités !","---",`+${await formatNumber(result.interestEarned)}$`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { title:"INTEREST", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`+${await formatNumber(result.interestEarned)}$`, theme:"green" }, imageMode);
            }

            case "gamble": case "bet": {
                if (args[1]?.toLowerCase() !== "play") return message.reply(UI(["🎰 GAMBLE","---",`📝 ${p}bank gamble play <montant> <pile/face>`]));
                const amount = await parseAmount(args[2]);
                const choice = args[3]?.toLowerCase();
                if (amount <= 0n || !["pile","face"].includes(choice||"")) return message.reply(UI(["❌ Invalide.",`📝 ${p}bank gamble play <mnt> pile|face`]));
                if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
                const result = await apiCall(`/${user}/gamble`, "POST", { amount:amount.toString(), choice });
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                return sendCasino(message, [result.win?"🎉 VICTOIRE !":"💀 PERDU !","---",`Choix: ${choice}  •  Résultat: ${result.result}`,result.win?`+${await formatNumber(result.winAmount)}$`:`-${await formatNumber(amount)}$`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { username, win:result.win, choice, result:result.result, amount:await formatNumber(amount), winAmount:await formatNumber(result.winAmount||"0"), balance:await formatNumber(bankData.bank), mode:"gamble" }, imageMode);
            }

            case "lottery": {
                if (args[1]?.toLowerCase() !== "play") return message.reply(UI(["🎲 LOTERIE","---",`📝 ${p}bank lottery play <montant>`,"Gains: x2 (1/3) x10 (2/3) x100 (3/3)"]));
                const ticket = await parseAmount(args[2]);
                if (ticket <= 0n) return message.reply(UI(["❌ Montant invalide."]));
                const cash = await getCash(user);
                if (ticket > cash) return message.reply(UI(["❌ Solde cash insuffisant.",`💰 Poche : ${await formatNumber(cash)}$`]));
                const result = await apiCall(`/${user}/lottery`, "POST", { ticketPrice:ticket.toString() });
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                const net = result.win ? toBigInt(result.winAmount) - ticket : -ticket;
                await addCash(user, net);
                return sendCasino(message, [result.win?"🎉 VICTOIRE LOTERIE !":"💀 PERDU !","---",`Vos numéros : ${result.userNumbers?.join("-")}`,`Tirés : ${result.drawnNumbers?.join("-")}`,`Correspondances : ${result.matchCount}/3`,result.win?`+${await formatNumber(result.winAmount)}$ (x${result.multiplier})`:`-${await formatNumber(ticket)}$`,`💰 Poche : ${await formatNumber(await getCash(user))}$`],
                    { username, win:result.win, amount:await formatNumber(ticket), winAmount:await formatNumber(result.winAmount||"0"), balance:await formatNumber(await getCash(user)), mode:"lottery" }, imageMode);
            }

            case "daily": {
                const result = await apiCall(`/${user}/daily`, "POST");
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                return sendCard(message, ["🎁 DAILY BONUS !","---",`+${await formatNumber(result.reward)}$`,`🔥 Streak : ${result.streak} jour(s)`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { title:"DAILY", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`+${await formatNumber(result.reward)}$`, theme:"purple" }, imageMode);
            }

            case "invest": {
                const amount = await parseAmount(args[1]);
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide."]));
                if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
                const result = await apiCall(`/${user}/invest`, "POST", { amount:amount.toString() });
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                const profit = toBigInt(result.profit);
                return sendCard(message, ["📊 INVESTISSEMENT","---",profit>=0n?`📈 +${await formatNumber(profit)}$`:`📉 ${await formatNumber(profit)}$`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { title:"INVEST", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`${profit>=0n?"+":""}${await formatNumber(profit)}$`, theme:profit>=0n?"green":"dark" }, imageMode);
            }

            case "loan": {
                const amount = await parseAmount(args[1]);
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide."]));
                const result = await apiCall(`/${user}/loan`, "POST", { amount:amount.toString() });
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                return sendCard(message, ["💰 EMPRUNT","---",`+${await formatNumber(result.loanAmount)}$`,`📈 Intérêts : ${await formatNumber(result.interest)}$`,`💳 Total : ${await formatNumber(result.totalToPay)}$`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { title:"LOAN", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`+${await formatNumber(result.loanAmount)}$`, theme:"gold" }, imageMode);
            }

            case "save": {
                if (args[1]?.toLowerCase() === "claim") {
                    const result = await apiCall(`/${user}/save/claim`, "POST");
                    if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                    bankData = (await apiCall(`/${user}`)).data || bankData;
                    return sendCard(message, ["✅ ÉPARGNE RÉCUPÉRÉE !","---",`Capital : ${await formatNumber(result.principal)}$`,`Bonus 5% : +${await formatNumber(result.bonus)}$`,`Total : +${await formatNumber(result.claimed)}$`,`💰 ${await formatNumber(bankData.bank)}$`],
                        { title:"SAVINGS", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`+${await formatNumber(result.claimed)}$`, theme:"green" }, imageMode);
                }
                const amount = await parseAmount(args[1]);
                if (amount <= 0n) return message.reply(UI(["❌ Montant invalide."]));
                if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
                const result = await apiCall(`/${user}/save`, "POST", { amount:amount.toString() });
                if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
                bankData = (await apiCall(`/${user}`)).data || bankData;
                return sendCard(message, ["🏦 ÉPARGNE","---",`+${await formatNumber(result.savedAmount)}$`,`📅 Disponible le : ${new Date(result.releaseDate).toLocaleDateString("fr-FR")}`,`🎁 Bonus +5% à maturité`,`💰 ${await formatNumber(bankData.bank)}$`],
                    { title:"SAVINGS", balance:await formatNumber(bankData.bank), username, cardData:bankData.card, avatarUrl:await getAvatar(user), subtitle:`+${await formatNumber(result.savedAmount)}$`, theme:"green" }, imageMode);
            }

            case "savings": case "epargne": {
                const savings = bankData.savings || { amount:"0", releaseDate:0 };
                const amount  = toBigInt(savings.amount);
                const ready   = Date.now() >= (savings.releaseDate || 0);
                return message.reply(UI(["🏦 MON ÉPARGNE","---",`💰 Montant : ${await formatNumber(amount)}$`,`📅 Disponible : ${ready?"✅ Maintenant !":new Date(savings.releaseDate).toLocaleDateString("fr-FR")}`,`🎁 Bonus +5% à maturité`,ready&&amount>0n?`📝 ${p}bank save claim`:""].filter(Boolean)));
            }

            case "rob": {
                if (!isVip) return message.reply(UI(["❌ Seuls les VIP peuvent utiliser rob !",`📝 ${p}bank shop buy 1`]));
                if (!bankData.card?.cardCreated) return message.reply(UI(["❌ Créez d'abord une carte.",`📝 ${p}bank card`]));

                const mentionKeys = Object.keys(event.mentions);
                const targetId    = mentionKeys[0] || args[1];

                let amountStr = null;
                if (mentionKeys.length > 0) {
                    const remaining = args.slice(1).filter(a => !a.includes("@") && !mentionKeys.some(id => a.includes(id)));
                    amountStr = remaining.find(a => looksLikeAmount(a)) || null;
                } else {
                    amountStr = args[2] || null;
                }

                if (!targetId || targetId === user) return message.reply(UI(["❌ Cible invalide.",`📝 ${p}bank rob @mention <montant>`]));

                const targetRes = await apiCall(`/${targetId}`);
                if (!targetRes.success) return message.reply(UI(["❌ Cible introuvable."]));
                const targetBal = toBigInt(targetRes.data?.bank || "0");
                if (targetBal <= 0n) return message.reply(UI(["❌ La cible n'a rien en banque."]));

                const parsedAmount = amountStr ? await parseAmount(amountStr) : 0n;
                let amount = parsedAmount > 0n ? parsedAmount : toBigInt(Math.floor(Number(targetBal) * (Math.random() * 0.15 + 0.05))) || 1n;
                if (amount > targetBal) amount = targetBal;

                const fAmt = await formatNumber(amount);
                const { opts, correctIndex } = makeCvvOptions(bankData.card.cardCvv);
                setPending(user, { type:"rob", amount:amount.toString(), targetId, correctIndex, opts }, () => message.reply(UI(["⏰ Temps écoulé, vol annulé."])));
                await new Promise(resolve => {
                    api.sendMessage({
                        body: UI([
                            "🦹 VOL EN COURS !","---",
                            `Cible : ${targetRes.data?.userId || targetId}`,
                            `💰 Montant visé : ${fAmt}$`,
                            ...buildCvvLines(opts, "🔐 Prouve ton identité"),
                        ]),
                    }, event.threadID, (err, info) => {
                        if (info?.messageID) pendingMessageIDs.set(user, info.messageID);
                        resolve();
                    });
                });
                return;
            }

            case "top": case "richest": {
                const result = await apiCall("/top");
                if (!result.success || !result.data?.length) return message.reply(UI(["👑 Classement vide."]));
                const medals = ["🥇","🥈","🥉"];
                const lines  = ["👑 TOP BANQUE","---"];
                for (let i=0;i<Math.min(result.data.length,15);i++) { const u=result.data[i]; lines.push(`${medals[i]||`${i+1}.`} ${await getName(u.userId)}`); lines.push(`   ${await formatNumber(u.bank)}$`); }
                return message.reply(UI(lines));
            }

            case "leaderboard": {
                const result = await apiCall("/leaderboard");
                if (!result.success || !result.data?.length) return message.reply(UI(["🏆 Aucun investisseur."]));
                const lines = ["🏆 TOP INVESTISSEURS","---"];
                for (let i=0;i<Math.min(result.data.length,10);i++) { const u=result.data[i]; lines.push(`${i+1}. ${await getName(u.userId)} — ${await formatNumber(u.totalInvested)}$`); }
                return message.reply(UI(lines));
            }

            case "history": {
                const limit  = Math.min(parseInt(args[1])||10, 20);
                const result = await apiCall(`/${user}/transactions?limit=${limit}`);
                if (!result.success || !result.data?.length) return message.reply(UI(["📜 Aucune transaction."]));
                const icons = { deposit:"⬆️",withdraw:"⬇️",interest:"📈",transfer_sent:"💸",transfer_received:"💰",gamble_win:"🎉",gamble_lose:"💀",lottery_win:"🎉",lottery_lose:"💀",rob_sent:"🦹",rob_received:"😱",daily_bonus:"🎁",investment_win:"📈",investment_lose:"📉",loan_taken:"💰",savings_deposit:"🏦",savings_claim:"✅",shop_purchase:"🛒",parrain_bonus:"🎁",parrain_referral:"👥" };
                const lines = [`📜 HISTORIQUE (${result.data.length})`, "---"];
                for (const tx of result.data) { const a=toBigInt(tx.amount); lines.push(`${icons[tx.type]||"💱"} ${tx.type}`); lines.push(`   ${a>=0n?"+":""}${await formatNumber(a)}$ • ${new Date(tx.date).toLocaleString("fr-FR")}`); }
                return message.reply(UI(lines));
            }

            case "stats": {
                const result = await apiCall(`/${user}/transactions?limit=100`);
                let spent=0n,earned=0n,wins=0,loses=0;
                if (result.success&&result.data) for (const tx of result.data) { const a=toBigInt(tx.amount); if(a<0n)spent+=-a;else earned+=a; if(tx.type==="gamble_win")wins++; if(tx.type==="gamble_lose")loses++; }
                return message.reply(UI(["📊 STATISTIQUES","---",`💰 Total gagné   : ${await formatNumber(earned)}$`,`💸 Total dépensé : ${await formatNumber(spent)}$`,`🎰 Gambling : ${wins}V / ${loses}D`,`🎁 Parrainages : ${bankData.parrainCount||0}`]));
            }

            case "parrainage": case "parrain": {
                const sub = args[1]?.toLowerCase();
                if (!sub||sub==="help") return message.reply(UI(["🎁 PARRAINAGE","---",`${p}bank parrainage creer`,`${p}bank parrainage utiliser <code>`,`${p}bank parrainage stats`,"Parrain +5000$ / Parrainé +10000$"]));
                if (sub==="creer"||sub==="create") { const r=await apiCall(`/${user}/parrain/create`,"POST"); return message.reply(UI(r.success?["🎁 CODE CRÉÉ !","---",`🔑 ${r.code}`,"Partagez ce code à vos amis !"]:[ `❌ ${r.error}`])); }
                if (sub==="utiliser"||sub==="use") { const code=args[2]; if(!code)return message.reply(UI(["❌ Code manquant."])); const r=await apiCall(`/${user}/parrain/use`,"POST",{code}); if(!r.success)return message.reply(UI([`❌ ${r.error}`])); bankData=(await apiCall(`/${user}`)).data||bankData; return message.reply(UI(["🎉 Parrainage réussi !","---",`+${await formatNumber(r.bonusUser)}$`,`💰 ${await formatNumber(bankData.bank)}$`])); }
                if (sub==="stats") { const r=await apiCall(`/${user}/parrain/stats`); if(!r.success)return message.reply(UI([`❌ ${r.error}`])); return message.reply(UI(["🎁 STATS PARRAINAGE","---",`🔑 Code : ${r.data.code}`,`👥 Filleuls : ${r.data.count}`,`💰 Gains : ${await formatNumber(r.data.gains)}$`])); }
                break;
            }

            case "vip": {
                const sub = args[1]?.toLowerCase();
                if (sub==="list") { const lines=[`👑 VIP (${vipList.length})`,"---"]; for (const id of vipList) lines.push(`⭐ ${await getName(id)}`); return message.reply(UI(lines)); }
                if (sub==="-a"&&BOT_ADMINS.includes(user)) { const uid=args[2]; if(!uid)return message.reply(UI(["❌ UID manquant."])); if(vipList.includes(uid))return message.reply(UI(["⚠️ Déjà VIP."])); vipList.push(uid);saveVIPs();return message.reply(UI([`✅ ${await getName(uid)} ajouté aux VIP.`])); }
                if (sub==="-r"&&BOT_ADMINS.includes(user)) { const uid=args[2]; const idx=vipList.indexOf(uid); if(idx===-1)return message.reply(UI(["❌ Pas VIP."])); vipList.splice(idx,1);saveVIPs();return message.reply(UI([`✅ ${uid} retiré des VIP.`])); }
                return message.reply(UI([isVip?"⭐ Vous êtes VIP !":"👤 Pas encore VIP","---","Avantages VIP :","🦹 Accès à bank rob",`📝 ${p}bank shop buy 1`]));
            }

            case "shop": {
                const ITEMS=[{id:1,name:"VIP",price:"50M",desc:"Accès à bank rob"},{id:2,name:"Double XP",price:"1M",desc:"Double gains 24h"},{id:3,name:"Couleur Carte",price:"100k",desc:"Personnalise ta carte"}];
                if (!args[1]) { const lines=["🛒 BOUTIQUE","---"]; for (const it of ITEMS) { lines.push(`${it.id}. ${it.name} — ${it.price}$`); lines.push(`   ${it.desc}`); } lines.push("---",`${p}bank shop buy <id>`); return message.reply(UI(lines)); }
                if (args[1]==="buy") { const r=await apiCall(`/${user}/shop/buy`,"POST",{itemId:parseInt(args[2])}); if(!r.success)return message.reply(UI([`❌ ${r.error}`])); bankData=(await apiCall(`/${user}`)).data||bankData; if(r.item==="VIP"&&!vipList.includes(user)){vipList.push(user);saveVIPs();} return message.reply(UI([`✅ Achat : ${r.item}`,`💰 ${await formatNumber(bankData.bank)}$`])); }
                break;
            }

            case "image": {
                const mode = args[1]?.toLowerCase();
                if (mode==="on"||mode==="off") { imageSettings[user]=mode==="on"; saveImageSettings(); return message.reply(UI([`🖼️ Mode image : ${mode==="on"?"Activé ✅":"Désactivé ❌"}`])); }
                return message.reply(UI([`🖼️ ${p}bank image on/off`]));
            }

            default: {
                if (/^[1-4]$/.test(cmd)) return message.reply(UI(["❌ Aucune transaction en attente.","Le délai de 30s est peut-être écoulé."]));
                return message.reply(UI([
                    "🦔 HEDGEHOG BANK","━━━━━━━━━━━━━━━",
                    "💳 CARTE",`⤷ ${p}bank card`,
                    "---","💰 ARGENT",
                    `⤷ ${p}bank deposit/withdraw <mnt>`,
                    `⤷ ${p}bank balance`,
                    `⤷ ${p}bank transfer @m <mnt>`,
                    `⤷ ${p}bank gift @m <mnt>`,
                    "---","📈 GAINS",
                    `⤷ ${p}bank interest`,
                    `⤷ ${p}bank daily`,
                    `⤷ ${p}bank gamble play <mnt> pile|face`,
                    `⤷ ${p}bank lottery play <mnt>`,
                    `⤷ ${p}bank invest <mnt>`,
                    "---","🏦 SERVICES",
                    `⤷ ${p}bank loan <mnt>`,
                    `⤷ ${p}bank save <mnt>`,
                    `⤷ ${p}bank save claim`,
                    `⤷ ${p}bank savings`,
                    "---","🎮 SOCIAL",
                    `⤷ ${p}bank rob @m <mnt> (VIP)`,
                    `⤷ ${p}bank parrainage`,
                    "---","📊 INFOS",
                    `⤷ ${p}bank history`,
                    `⤷ ${p}bank top`,
                    `⤷ ${p}bank stats`,
                    `⤷ ${p}bank leaderboard`,
                    `⤷ ${p}bank vip`,
                    `⤷ ${p}bank shop`,
                    `⤷ ${p}bank image on/off`,
                ]));
            }
        }
    },

    onChat: async function ({ message, event, api }) {
        const user = String(event.senderID);
        const body = (event.body || "").trim();

        if (!/^[1-4]$/.test(body)) return;

        const pending = pendingTransactions.get(user);
        if (!pending) return;

        if (!event.messageReply?.messageID) return;

        const pendingMsgId = pendingMessageIDs.get(user);
        if (pendingMsgId && event.messageReply.messageID !== pendingMsgId) return;

        let bankRes  = await apiCall(`/${user}`);
        let bankData = bankRes.success ? bankRes.data : { bank:"0", card:null };
        const imageMode = imageSettings[user] !== false;

        await processCvvReply(body, user, bankData, message, api, imageMode);
    },
};