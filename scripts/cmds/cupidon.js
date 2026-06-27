const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getLoveScore(id1, id2) {
  const now = Date.now();
  const daySeed = Math.floor(now / 86400000);
  const hourSeed = Math.floor(now / 3600000);
  const baseSeed = (parseInt(id1) + parseInt(id2) + daySeed + hourSeed) % 2147483647;
  const rng = seededRandom(baseSeed);
  return Math.floor(rng() * 101);
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s === 0) s = 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const QUOTES = {
  SOULMATE: [
    "💞 Deux cœurs battent à l'unisson — une connexion rare et précieuse.",
    "✨ Vous êtes faits l'un pour l'autre, une évidence cosmique.",
    "🌸 L'amour qui vous lie est aussi puissant que l'océan.",
    "🌟 Vous êtes les étoiles qui s'illuminent mutuellement.",
    "💫 Une alchimie parfaite, un amour éternel.",
    "🌹 Votre histoire est écrite dans les cieux.",
    "💖 Un amour pur et sincère, une rareté absolue.",
    "🌙 Vous êtes les âmes sœurs que l'univers a choisies."
  ],
  SPARK: [
    "⚡ Une étincelle électrique — ça promet !",
    "🔥 La flamme est là, elle n'attend qu'à grandir.",
    "💕 Une connexion prometteuse, pleine de potentiel.",
    "🌟 Vous avez tout pour construire quelque chose de beau.",
    "💞 Une alchimie naissante, à cultiver avec soin.",
    "✨ Le courant passe, c'est indéniable.",
    "🌸 Une belle énergie entre vous, à explorer.",
    "💖 Le début de quelque chose de merveilleux."
  ],
  FRIEND: [
    "🌿 Une amitié solide et sincère, un trésor rare.",
    "🤝 Vous êtes faits pour être amis, c'est évident.",
    "💚 Une complicité naturelle et authentique.",
    "🌟 Un lien d'amitié qui durera toute la vie.",
    "🌸 Vous êtes comme deux arbres aux racines entrelacées.",
    "💫 Une amitié qui traverse les tempêtes.",
    "🌙 Vous êtes les piliers l'un de l'autre.",
    "💖 Une confiance mutuelle inébranlable."
  ],
  INCOMPATIBLE: [
    "💔 Parfois, les contraires s'attirent... puis se repoussent.",
    "🌊 Deux océans qui ne se rencontrent pas.",
    "🌟 Vous êtes beaux séparément, mais pas ensemble.",
    "💫 Des chemins différents, des leçons différentes.",
    "🌿 L'amour n'est pas toujours la réponse.",
    "🌸 Certaines fleurs ne poussent pas dans le même jardin.",
    "💚 Vous êtes libres, et c'est votre plus grande force.",
    "🌙 Deux étoiles sur des orbites différentes."
  ],
  NEUTRAL: [
    "🧡 Le temps vous réserve encore des surprises.",
    "🌟 Une connexion à explorer, pas encore définie.",
    "💫 L'avenir vous appartient, tout est possible.",
    "🌸 Des possibles infinis, une page blanche.",
    "🌿 Le chemin est encore en construction.",
    "💚 Vous êtes au début d'une belle aventure.",
    "🌙 Laissons le temps faire son œuvre.",
    "💖 Rien n'est écrit, tout reste à écrire."
  ]
};

function getRandomQuote(cat, rng) {
  const arr = QUOTES[cat] || QUOTES.NEUTRAL;
  return arr[Math.floor(rng() * arr.length)];
}

function parseFacebookUrl(text) {
  if (!text) return null;
  const profileId = text.match(/(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=|people\/[^/]+\/)(\d{5,})/i);
  if (profileId) return { type: "id", value: profileId[1] };
  const usernameMatch = text.match(/(?:facebook\.com|fb\.com)\/([A-Za-z0-9._-]{3,50})\/?(?:\?.*)?$/i);
  if (usernameMatch) {
    const u = usernameMatch[1];
    if (!["home","pages","groups","events","marketplace","watch","gaming","messages","notifications","settings","help","sharer","login","video","photo","share","dialog","permalink"].includes(u.toLowerCase()))
      return { type: "username", value: u };
  }
  return null;
}

async function resolveUsernameToUid(username) {
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
  try {
    const res = await axios.get(`https://graph.facebook.com/${username}?fields=id,name&access_token=${token}`, { timeout: 8000 });
    if (res.data?.id) return { uid: res.data.id, name: res.data.name || null };
  } catch {}
  try {
    const res = await axios.get(`https://m.facebook.com/${username}`, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" }
    });
    const idMatch = res.data.match(/"userID":"(\d+)"/);
    const nameMatch = res.data.match(/<title>([^<]+)<\/title>/);
    if (idMatch) return { uid: idMatch[1], name: nameMatch?.[1]?.trim() || null };
  } catch {}
  return null;
}

async function extractUsers(body, mentions, messageReply, senderID, api, threadID) {
  const users = [];
  const mentionIDs = Object.keys(mentions || {});
  for (const id of mentionIDs) users.push({ uid: id, name: mentions[id] || null });
  if (users.length >= 2) return users;

  const rawIds = (body || "").match(/(?<![/=?&\d])\d{8,}(?!\d)/g) || [];
  for (const id of rawIds) {
    if (!users.find(u => u.uid === id)) users.push({ uid: id, name: null });
  }
  if (users.length >= 2) return users;

  const words = (body || "").split(/\s+/);
  for (const word of words) {
    const parsed = parseFacebookUrl(word);
    if (!parsed) continue;
    if (parsed.type === "id") {
      if (!users.find(u => u.uid === parsed.value)) users.push({ uid: parsed.value, name: null });
    } else {
      const resolved = await resolveUsernameToUid(parsed.value);
      if (resolved && !users.find(u => u.uid === resolved.uid)) {
        users.push({ uid: resolved.uid, name: resolved.name });
      }
    }
    if (users.length >= 2) break;
  }
  if (users.length >= 2) return users;

  if (messageReply?.senderID && !users.find(u => u.uid === messageReply.senderID)) {
    users.push({ uid: messageReply.senderID, name: null });
  }
  if (users.length >= 2) return users;

  if (users.length === 1) {
    if (users[0].uid !== senderID) users.unshift({ uid: senderID, name: null });
    else {
      try {
        const ti = await api.getThreadInfo(threadID);
        const others = ti.participantIDs.filter(id => id !== senderID && id !== users[0].uid);
        if (others.length) users.push({ uid: others[Math.floor(Math.random() * others.length)], name: null });
      } catch {}
    }
    return users;
  }

  users.push({ uid: senderID, name: null });
  try {
    const ti = await api.getThreadInfo(threadID);
    const others = ti.participantIDs.filter(id => id !== senderID);
    if (others.length) users.push({ uid: others[Math.floor(Math.random() * others.length)], name: null });
    else users.push({ uid: senderID, name: null });
  } catch {
    users.push({ uid: senderID, name: null });
  }
  return users;
}

async function resolveName(uid, threadInfo, api) {
  const ti = threadInfo?.userInfo?.find(u => u.id == uid);
  if (ti?.name) return ti.name;
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
  try {
    const res = await axios.get(`https://graph.facebook.com/${uid}?fields=name&access_token=${token}`, { timeout: 6000 });
    if (res.data?.name) return res.data.name;
  } catch {}
  try {
    const info = await api.getUserInfo(uid);
    if (info?.[uid]?.name) return info[uid].name;
  } catch {}
  return `Utilisateur ${uid}`;
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let cur = words[0] || "";
  for (let i = 1; i < words.length; i++) {
    if (ctx.measureText(cur + " " + words[i]).width < maxWidth) cur += " " + words[i];
    else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur);
  return lines;
}

function drawHeart(ctx, cx, cy, size, color, glow = true) {
  ctx.save();
  if (glow) { ctx.shadowBlur = 50; ctx.shadowColor = color; }
  ctx.fillStyle = color;
  ctx.beginPath();
  const h = size * 0.3;
  ctx.moveTo(cx, cy + h);
  ctx.bezierCurveTo(cx, cy, cx - size/2, cy, cx - size/2, cy + h);
  ctx.bezierCurveTo(cx - size/2, cy + size/2, cx, cy + size/1.25, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size/1.25, cx + size/2, cy + size/2, cx + size/2, cy + h);
  ctx.bezierCurveTo(cx + size/2, cy, cx, cy, cx, cy + h);
  ctx.fill();
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, pct, colA, colB) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h/2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fill();
  if (pct > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w * pct / 100, h, h/2);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, colA);
    g.addColorStop(1, colB);
    ctx.shadowBlur = 20;
    ctx.shadowColor = colA;
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (let i = 1; i < 10; i++) {
    const tx = x + (w * i / 10);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawECG(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= w; i += 2) {
    let dy = 0, pos = i % 90;
    if (pos > 12 && pos < 17) dy = -h * 0.18;
    else if (pos >= 22 && pos <= 24) dy = h * 0.12;
    else if (pos > 24 && pos < 30) dy = -h;
    else if (pos >= 30 && pos <= 33) dy = h * 0.25;
    else if (pos > 48 && pos < 58) dy = -h * 0.1;
    ctx.lineTo(x + i, y + dy);
  }
  ctx.stroke();
  ctx.restore();
}

async function loadAvatar(uid) {
  try {
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    return await loadImage(`https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${token}`);
  } catch { return null; }
}

function drawAvatarCircle(ctx, img, name, cx, cy, r, borderColor, glowColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor + "66";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 30;
  ctx.shadowColor = glowColor;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = borderColor;
    ctx.font = `bold ${r * 0.7}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText((name[0] || "?").toUpperCase(), cx, cy + r * 0.25);
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx, x, y, text, bgColor, textColor = "#fff") {
  ctx.save();
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  const tw = ctx.measureText(text).width + 20;
  ctx.beginPath();
  ctx.roundRect(x - tw/2, y - 14, tw, 22, 11);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}

function drawMood(ctx, x, y, size, mood, color) {
  ctx.save();
  ctx.font = `${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillText(mood, x, y);
  ctx.restore();
}

async function drawThemeCosmos(ctx, W, H, name1, name2, av1, av2, pct, status, quote, rng, dateStr) {
  const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.9);
  bg.addColorStop(0, "#0d0020");
  bg.addColorStop(0.5, "#12003a");
  bg.addColorStop(1, "#000010");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const nebula = (cx, cy, r, col, a = 0.15) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.55, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  nebula(240, 260, 340, "#8b00ff");
  nebula(W - 200, 200, 280, "#ff0099");
  nebula(W / 2, H - 80, 250, "#0044ff");
  nebula(380, H - 60, 200, "#ff6600");

  ctx.save();
  for (let i = 0; i < 240; i++) {
    const sx = rng() * W, sy = rng() * H;
    const sr = rng() * 1.8 + 0.2;
    const br = rng();
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${br * 0.9 + 0.1})`;
    if (br > 0.88) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#fff";
    }
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(200,150,255,0.12)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  const pts = [
    [280, 340],
    [390, 275],
    [490, 310],
    [600, 255],
    [710, 300],
    [820, 340]
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.stroke();
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,150,255,0.5)";
    ctx.fill();
  });
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "rgba(200,150,255,0.7)";
  ctx.letterSpacing = "4px";
  ctx.fillText("✦ SCANNEUR D'AMOUR COSMIQUE ✦", W / 2, 55);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 265, 355, 128, "#c084fc", "#8b5cf6");
  drawAvatarCircle(ctx, av2, name2, W - 265, 355, 128, "#f0abfc", "#e879f9");

  for (let i = 3; i >= 1; i--) {
    ctx.save();
    ctx.globalAlpha = 0.07 * i;
    drawHeart(ctx, W / 2, 275, 105 + i * 28, "#ff2d95", false);
    ctx.restore();
  }
  drawHeart(ctx, W / 2, 275, 90, "#ff2d95", true);

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 115px Arial";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 45;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(`${pct}%`, W / 2, 528);
  ctx.restore();

  drawProgressBar(ctx, 155, 558, W - 310, 18, pct, "#c084fc", "#f0abfc");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "#f0abfc";
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(status, W / 2, 626);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 26px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(name1.toUpperCase(), 265, 528);
  ctx.fillText(name2.toUpperCase(), W - 265, 528);
  ctx.restore();

  ctx.save();
  ctx.font = "italic 21px Georgia";
  ctx.fillStyle = "rgba(220,180,255,0.78)";
  ctx.textAlign = "center";
  const ql = wrapText(ctx, `" ${quote} "`, 680);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 698 + i * 30));
  ctx.restore();

  ctx.save();
  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.textAlign = "center";
  ctx.fillText(`Analyse du ${dateStr}`, W / 2, H - 25);
  ctx.restore();

  drawECG(ctx, 120, H - 58, W - 240, 34, "#c084fc");
}

async function drawThemeNeon(ctx, W, H, name1, name2, av1, av2, pct, status, quote, rng, dateStr) {
  ctx.fillStyle = "#040010";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(255,0,200,0.16)";
  ctx.lineWidth = 1;
  const hor = H * 0.62;
  for (let i = -22; i <= 22; i++) {
    const x = W / 2 + i * 55;
    ctx.beginPath();
    ctx.moveTo(x, hor);
    ctx.lineTo(W / 2 + i * 600, H + 200);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const y = hor + Math.pow(i / 9, 2) * (H - hor + 60);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.font = "12px monospace";
  for (let c = 0; c < 28; c++) {
    const rx = rng() * W;
    const len = Math.floor(rng() * 7) + 3;
    for (let r = 0; r < len; r++) {
      const ry = rng() * H * 0.55;
      ctx.fillStyle = `rgba(0,255,180,${(len - r) / len * 0.28})`;
      ctx.fillText(String.fromCharCode(0x30A0 + Math.floor(rng() * 96)), rx, ry + r * 16);
    }
  }
  ctx.restore();

  ctx.save();
  const hg = ctx.createLinearGradient(0, hor - 1, 0, hor + 1);
  hg.addColorStop(0, "#ff2d95");
  hg.addColorStop(1, "#0088ff");
  ctx.fillStyle = hg;
  ctx.shadowBlur = 40;
  ctx.shadowColor = "#ff2d95";
  ctx.fillRect(0, hor - 1.5, W, 3);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#0ff";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#0ff";
  ctx.fillText("// LOVE.EXE — SCAN EN COURS //", W / 2, 55);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 255, 345, 122, "#ff2d95", "#ff2d95");
  drawAvatarCircle(ctx, av2, name2, W - 255, 345, 122, "#00d4ff", "#00d4ff");

  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff2d95";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 18, 285);
  ctx.lineTo(W / 2 + 2, 335);
  ctx.lineTo(W / 2 - 10, 335);
  ctx.lineTo(W / 2 + 18, 390);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 115px monospace";
  ctx.fillStyle = "rgba(255,45,149,0.28)";
  ctx.fillText(`${pct}%`, W / 2 - 3, 510);
  ctx.fillStyle = "rgba(0,212,255,0.28)";
  ctx.fillText(`${pct}%`, W / 2 + 3, 510);
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#ff2d95";
  ctx.fillText(`${pct}%`, W / 2, 510);
  ctx.restore();

  drawProgressBar(ctx, 148, 542, W - 296, 16, pct, "#ff2d95", "#00d4ff");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 35px monospace";
  ctx.fillStyle = "#ff2d95";
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#ff2d95";
  ctx.fillText(status, W / 2, 608);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#ff2d95";
  ctx.fillText(name1.toUpperCase(), 255, 510);
  ctx.fillStyle = "#00d4ff";
  ctx.fillText(name2.toUpperCase(), W - 255, 510);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 19px monospace";
  ctx.fillStyle = "rgba(0,255,200,0.65)";
  const ql = wrapText(ctx, `> ${quote}`, 680);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 680 + i * 27));
  ctx.restore();

  ctx.save();
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.textAlign = "center";
  ctx.fillText(`Scan du ${dateStr}`, W / 2, H - 25);
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 30, "#ff2d95");

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (let i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 2);
  ctx.restore();
}

async function drawThemeNature(ctx, W, H, name1, name2, av1, av2, pct, status, quote, rng, dateStr) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#010d10");
  bg.addColorStop(0.4, "#02261a");
  bg.addColorStop(1, "#04170d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const aurora = (cy, col, a = 0.14) => {
    const g = ctx.createLinearGradient(0, cy - 80, 0, cy + 80);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, col);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - 80, W, 160);
    ctx.restore();
  };
  aurora(140, "#00ff88", 0.18);
  aurora(210, "#00ccff", 0.13);
  aurora(95, "#88ff00", 0.10);
  aurora(310, "#ff9900", 0.08);

  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = rng() * W, sy = rng() * H * 0.44;
    ctx.beginPath();
    ctx.arc(sx, sy, rng() * 1.2 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.7 + 0.2})`;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#010d10";
  const trees = (sx, tw, th) => {
    for (let t = sx; t < sx + tw; t += 26) {
      const h = th + Math.sin(t * 0.14) * 22;
      ctx.beginPath();
      ctx.moveTo(t, H);
      ctx.lineTo(t - 13, H - h * 0.4);
      ctx.lineTo(t, H - h);
      ctx.lineTo(t + 13, H - h * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  };
  trees(0, 210, 128);
  trees(W - 210, 210, 108);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "rgba(0,255,136,0.72)";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#00ff88";
  ctx.fillText("✦ ANALYSEUR DE LIENS ✦", W / 2, 55);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 265, 345, 126, "#4ade80", "#22c55e");
  drawAvatarCircle(ctx, av2, name2, W - 265, 345, 126, "#34d399", "#10b981");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "90px Arial";
  ctx.fillStyle = "rgba(74,222,128,0.88)";
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#4ade80";
  ctx.fillText("∞", W / 2, 385);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 108px Arial";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 35;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(`${pct}%`, W / 2, 524);
  ctx.restore();

  drawProgressBar(ctx, 158, 552, W - 316, 16, pct, "#22c55e", "#a3e635");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 35px Arial";
  ctx.fillStyle = "#4ade80";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(status, W / 2, 616);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 26px Arial";
  ctx.fillStyle = "#a3e635";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(name1.toUpperCase(), 265, 520);
  ctx.fillText(name2.toUpperCase(), W - 265, 520);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 21px Georgia";
  ctx.fillStyle = "rgba(134,239,172,0.75)";
  const ql = wrapText(ctx, `" ${quote} "`, 680);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 690 + i * 30));
  ctx.restore();

  ctx.save();
  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.textAlign = "center";
  ctx.fillText(`Analyse du ${dateStr}`, W / 2, H - 25);
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 30, "#4ade80");
}

async function drawThemeAquarelle(ctx, W, H, name1, name2, av1, av2, pct, status, quote, rng, dateStr) {
  ctx.fillStyle = "#fdf6ec";
  ctx.fillRect(0, 0, W, H);

  const blob = (cx, cy, rx, ry, col, a = 0.13) => {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  blob(190, 240, 205, 138, "#f9a8d4", 0.16);
  blob(340, 175, 162, 108, "#fdba74", 0.13);
  blob(W - 210, 295, 192, 128, "#c4b5fd", 0.16);
  blob(W - 295, 148, 148, 98, "#86efac", 0.13);
  blob(490, 390, 225, 158, "#fde68a", 0.10);
  blob(590, 490, 180, 118, "#f9a8d4", 0.09);

  ctx.save();
  ctx.fillStyle = "rgba(150,100,80,0.04)";
  for (let x = 0; x < W; x += 20)
    for (let y = 0; y < H; y += 20) ctx.fillRect(x, y, 1, 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold italic 26px Georgia";
  ctx.fillStyle = "#c2410c";
  ctx.fillText("~ Amour & Connexion ~", W / 2, 58);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 265, 345, 124, "#fb923c", "#fed7aa");
  drawAvatarCircle(ctx, av2, name2, W - 265, 345, 124, "#c084fc", "#e9d5ff");

  ctx.save();
  ctx.globalAlpha = 0.55;
  drawHeart(ctx, W / 2, 278, 88, "#fb7185", false);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 108px Georgia";
  ctx.fillStyle = "#7c3aed";
  ctx.fillText(`${pct}%`, W / 2, 528);
  ctx.restore();

  drawProgressBar(ctx, 178, 552, W - 356, 14, pct, "#fb923c", "#c084fc");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 33px Georgia";
  ctx.fillStyle = "#b45309";
  ctx.fillText(status, W / 2, 616);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic bold 26px Georgia";
  ctx.fillStyle = "#7c3aed";
  ctx.fillText(name1, 265, 520);
  ctx.fillText(name2, W - 265, 520);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 22px Georgia";
  ctx.fillStyle = "rgba(120,60,20,0.72)";
  const ql = wrapText(ctx, `" ${quote} "`, 660);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 690 + i * 32));
  ctx.restore();

  ctx.save();
  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(120,60,20,0.15)";
  ctx.textAlign = "center";
  ctx.fillText(`Scan du ${dateStr}`, W / 2, H - 25);
  ctx.restore();

  drawECG(ctx, 120, H - 55, W - 240, 28, "#fb923c");
}

async function drawThemeGlitch(ctx, W, H, name1, name2, av1, av2, pct, status, quote, rng, dateStr) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#00050f");
  bg.addColorStop(0.5, "#001525");
  bg.addColorStop(1, "#000510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(100,200,255,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    let cx = rng() * W,
      cy = rng() * H * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 5; j++) {
      cx += (rng() - 0.5) * 115;
      cy += rng() * 75 + 18;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  for (let g = 0; g < 10; g++) {
    const gy = rng() * H,
      gh = rng() * 5 + 1;
    ctx.fillStyle = `rgba(0,200,255,${rng() * 0.07})`;
    ctx.fillRect(0, gy, W, gh);
    ctx.fillStyle = `rgba(255,0,80,${rng() * 0.05})`;
    ctx.fillRect(rng() * 25, gy, W, gh);
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 110; i++) {
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, rng() * 1.5 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,230,255,${rng() * 0.55 + 0.1})`;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 19px monospace";
  ctx.fillStyle = "rgba(0,200,255,0.45)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W / 2 + 2, 56);
  ctx.fillStyle = "rgba(255,0,80,0.38)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W / 2 - 2, 55);
  ctx.fillStyle = "rgba(200,230,255,0.88)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W / 2, 55);
  ctx.restore();

  ctx.save();
  ctx.filter = "saturate(0.28) brightness(0.78)";
  drawAvatarCircle(ctx, av1, name1, 265, 345, 124, "#94a3b8", "#64748b");
  drawAvatarCircle(ctx, av2, name2, W - 265, 345, 124, "#94a3b8", "#64748b");
  ctx.filter = "none";
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "100px Arial";
  ctx.fillStyle = "rgba(100,200,255,0.72)";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00c8ff";
  ctx.fillText("💔", W / 2, 383);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 115px monospace";
  ctx.fillStyle = "rgba(0,200,255,0.22)";
  ctx.fillText(`${pct}%`, W / 2 + 4, 520);
  ctx.fillStyle = "rgba(255,50,50,0.18)";
  ctx.fillText(`${pct}%`, W / 2 - 4, 518);
  ctx.fillStyle = "rgba(200,230,255,0.9)";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00c8ff";
  ctx.fillText(`${pct}%`, W / 2, 519);
  ctx.restore();

  drawProgressBar(ctx, 158, 548, W - 316, 16, pct, "#0ea5e9", "#38bdf8");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 35px monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#0ea5e9";
  ctx.fillText(status, W / 2, 616);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 23px monospace";
  ctx.fillStyle = "rgba(148,163,184,0.85)";
  ctx.fillText(name1.toUpperCase(), 265, 518);
  ctx.fillText(name2.toUpperCase(), W - 265, 518);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 20px monospace";
  ctx.fillStyle = "rgba(100,180,210,0.65)";
  const ql = wrapText(ctx, `" ${quote} "`, 700);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 690 + i * 28));
  ctx.restore();

  ctx.save();
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.textAlign = "center";
  ctx.fillText(`Scan du ${dateStr}`, W / 2, H - 25);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 2);
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 25, "#38bdf8");
}

async function generateScroll(type, name1, name2, pct, dateStr) {
  const W = 1000,
    H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const themes = {
    SOULMATE: { bg1: "#0a0018", bg2: "#1a0030", accent: "#d4af37", sub: "#c084fc", title: "CERTIFICAT D'AMOUR ETERNEL", intro: "Célèbre une connexion cosmique entre", seal: "💍" },
    SPARK: { bg1: "#1a0a00", bg2: "#2a1500", accent: "#f59e0b", sub: "#fb923c", title: "CERTIFICAT D'ETINCELLE", intro: "Reconnaît une connexion prometteuse entre", seal: "⚡" },
    FRIEND: { bg1: "#001a0a", bg2: "#002810", accent: "#4ade80", sub: "#34d399", title: "CERTIFICAT D'AMITIE", intro: "Certifie un lien indéfectible entre", seal: "🌿" },
    NEUTRAL: { bg1: "#1a1500", bg2: "#2a2000", accent: "#fbbf24", sub: "#f59e0b", title: "CERTIFICAT DE POSSIBILITE", intro: "Reconnaît un potentiel entre", seal: "🧡" },
    INCOMPATIBLE: { bg1: "#080018", bg2: "#0a0025", accent: "#60a5fa", sub: "#94a3b8", title: "DECRET DE SEPARATION", intro: "Confirme des différences entre", seal: "❄️" }
  };

  const t = themes[type] || themes.NEUTRAL;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.bg1);
  bg.addColorStop(1, t.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.setLineDash([]);

  const corner = (x, y, sx, sy) => {
    ctx.save();
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 45);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 45, y);
    ctx.moveTo(x + sx * 20, y);
    ctx.lineTo(x + sx * 20, y + sy * 20);
    ctx.moveTo(x, y + sy * 20);
    ctx.lineTo(x + sx * 20, y + sy * 20);
    ctx.stroke();
    ctx.restore();
  };
  corner(40, 40, 1, 1);
  corner(W - 40, 40, -1, 1);
  corner(40, H - 40, 1, -1);
  corner(W - 40, H - 40, -1, -1);

  ctx.save();
  ctx.strokeStyle = `${t.accent}55`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 162);
  ctx.lineTo(W - 100, 162);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(100, H - 120);
  ctx.lineTo(W - 100, H - 120);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = "italic 22px Georgia";
  ctx.fillStyle = `${t.accent}aa`;
  ctx.fillText("— Declaration Officielle —", W / 2, 105);

  ctx.font = "bold 56px Georgia";
  ctx.fillStyle = t.accent;
  ctx.shadowBlur = 20;
  ctx.shadowColor = t.accent;
  ctx.fillText(t.title, W / 2, 196);
  ctx.shadowBlur = 0;

  ctx.font = "21px Georgia";
  ctx.fillStyle = "rgba(200,200,220,0.75)";
  ctx.fillText(t.intro, W / 2, 256);

  ctx.font = "bold 46px Arial";
  ctx.fillStyle = "#fff";
  const nl = wrapText(ctx, `${name1} & ${name2}`, 820);
  nl.forEach((l, i) => ctx.fillText(l, W / 2, 318 + i * 56));

  ctx.font = "italic 23px Georgia";
  ctx.fillStyle = t.sub;
  ctx.fillText(`Score de Compatibilite: ${pct}%`, W / 2, 445);

  const quote = getRandomQuote(type, Math.random);
  ctx.font = "italic 19px Georgia";
  ctx.fillStyle = "rgba(180,180,200,0.7)";
  const ql = wrapText(ctx, `" ${quote} "`, 680);
  ql.forEach((l, i) => ctx.fillText(l, W / 2, 508 + i * 32));

  ctx.font = "15px monospace";
  ctx.fillStyle = "rgba(150,150,170,0.58)";
  ctx.textAlign = "left";
  ctx.fillText(`Delivre le: ${dateStr}`, 80, H - 60);

  ctx.textAlign = "center";
  ctx.beginPath();
  ctx.arc(W - 100, H - 82, 44, 0, Math.PI * 2);
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "36px Arial";
  ctx.fillText(t.seal, W - 100, H - 66);

  drawBadge(ctx, 140, H - 60, "✓ CERTIFIE", t.accent, "#fff");

  return canvas.toBuffer();
}

const LOADING_MESSAGES = [
  "💘 Analyse des cœurs en fusion...",
  "🔮 Lecture des ondes cosmiques...",
  "💞 Mesure de la compatibilité émotionnelle...",
  "✨ Calcul de l'alchimie entre les âmes...",
  "🌌 Connexion des fréquences vibratoires...",
  "💫 Révélation de la vérité universelle..."
];

module.exports = {
  config: {
    name: "cupidon",
    version: "10.0",
    author: "Ismael03-Dev",
    role: 0,
    category: "fun",
    shortDescription: { en: "Love Scanner — mention, FB link, username, or reply" },
    guide: {
      fr: "{p}cupidon @user1 @user2\n{p}cupidon lien_facebook\n{p}cupidon (reply)",
      en: "{p}cupidon @user1 @user2\n{p}cupidon facebook_link\n{p}cupidon (reply)"
    }
  },

  onStart: async function({ message, event, api }) {
    const { threadID, senderID, body, mentions, messageReply } = event;
    let loadingMsg = null;

    try {
      const resolved = await extractUsers(body, mentions, messageReply, senderID, api, threadID);
      const user1 = resolved[0]?.uid || senderID;
      const user2 = resolved[1]?.uid || senderID;

      if (user1 === user2) {
        return message.reply(UI([
          "💔 Erreur",
          "---",
          "Tu ne peux pas scanner l'amour avec toi-même !",
          "Mentionne quelqu'un, colle un lien Facebook, ou réponds à un message."
        ]));
      }

      const loadingMsgIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      await new Promise((res, rej) => {
        api.sendMessage(
          UI([
            `⏳ ${LOADING_MESSAGES[loadingMsgIndex]}`,
            "---",
            `[${"░".repeat(20)}] 0%`
          ]),
          threadID, (err, info) => { if (err) return rej(err);
            loadingMsg = info;
            res(); }
        );
      });

      const progSteps = [25, 50, 75, 100];
      const msgList = [...LOADING_MESSAGES];
      for (let i = 0; i < progSteps.length; i++) {
        await sleep(1200 + Math.random() * 600);
        const p = progSteps[i],
          f = Math.floor(p / 5),
          e = 20 - f;
        const nextMsg = msgList[(i + 1) % msgList.length];
        await api.editMessage(
          UI([
            `⏳ ${nextMsg}`,
            "---",
            `[${"█".repeat(f)}${"░".repeat(e)}] ${p}%`
          ]),
          loadingMsg.messageID
        ).catch(() => {});
      }
      await sleep(600);
      await api.editMessage(UI(["✅ Analyse terminée !"]), loadingMsg.messageID).catch(() => {});
      await sleep(1000);
      await api.unsendMessage(loadingMsg.messageID, threadID).catch(() => {});

      let threadInfo;
      try { threadInfo = await api.getThreadInfo(threadID); } catch {}
      const [name1, name2] = await Promise.all([
        resolved[0]?.name || resolveName(user1, threadInfo, api),
        resolved[1]?.name || resolveName(user2, threadInfo, api)
      ]);

      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
      const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      const lovePercent = Math.floor(Math.random() * 101);

      let themeKey, status, scrollType;
      if (lovePercent >= 85) { themeKey = "COSMOS";
        status = "🌟 AMES SOEURS";
        scrollType = "SOULMATE"; } else if (lovePercent >= 60) { themeKey = "NEON";
        status = "⚡ ETINCELLE";
        scrollType = "SPARK"; } else if (lovePercent >= 30) { themeKey = "NATURE";
        status = "🌿 VRAIS AMIS";
        scrollType = "FRIEND"; } else if (lovePercent >= 16) { themeKey = "AQUARELLE";
        status = "🧡 POSSIBILITE";
        scrollType = "NEUTRAL"; } else { themeKey = "GLITCH";
        status = "❄️ INCOMPATIBLE";
        scrollType = "INCOMPATIBLE"; }

      const seed = Date.now();
      const rng = seededRandom(seed);
      const quote = getRandomQuote(scrollType, rng);
      const [av1, av2] = await Promise.all([loadAvatar(user1), loadAvatar(user2)]);

      const W = 1200,
        H = 830;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      const drawFns = { COSMOS: drawThemeCosmos, NEON: drawThemeNeon, NATURE: drawThemeNature, AQUARELLE: drawThemeAquarelle, GLITCH: drawThemeGlitch };
      await drawFns[themeKey](ctx, W, H, name1, name2, av1, av2, lovePercent, status, quote, rng, `${dateStr} à ${timeStr}`);

      const imgPath = path.join(__dirname, `cupidon_${Date.now()}.png`);
      fs.writeFileSync(imgPath, canvas.toBuffer());

      const scoreBar = "❤️".repeat(Math.floor(lovePercent / 10)) + "🖤".repeat(10 - Math.floor(lovePercent / 10));

      const moodEmojis = {
        "🌟 AMES SOEURS": "💞",
        "⚡ ETINCELLE": "🔥",
        "🌿 VRAIS AMIS": "💚",
        "🧡 POSSIBILITE": "🧡",
        "❄️ INCOMPATIBLE": "💔"
      };
      const mood = moodEmojis[status] || "💞";

      await message.reply({
        body: UI([
          `💘 SCAN D'AMOUR — ${name1} × ${name2}`,
          "---",
          `📊 Score : ${lovePercent}%`,
          scoreBar,
          `📍 Statut : ${status}`,
          `💬 "${quote}"`,
          "---",
          `📅 ${dateStr} à ${timeStr}`,
          mood
        ]),
        attachment: fs.createReadStream(imgPath)
      });
      fs.unlinkSync(imgPath);

      if (scrollType) {
        const scrollBuf = await generateScroll(scrollType, name1, name2, lovePercent, `${dateStr} à ${timeStr}`);
        const scrollPath = path.join(__dirname, `scroll_${Date.now()}.png`);
        fs.writeFileSync(scrollPath, scrollBuf);

        const notes = {
          SOULMATE: `💞 Célébration d'un amour cosmique — ${name1} & ${name2} sont des âmes sœurs.`,
          SPARK: `⚡ Une étincelle prometteuse — ${name1} & ${name2} ont un potentiel magnifique.`,
          FRIEND: `🌿 Une amitié sincère et durable — ${name1} & ${name2} sont de vrais amis.`,
          NEUTRAL: `🧡 Un potentiel à explorer — ${name1} & ${name2} ont un chemin à écrire.`,
          INCOMPATIBLE: `❄️ Des chemins différents — ${name1} & ${name2} suivent leur propre voie.`
        };

        await message.reply({
          body: UI([
            "📜 CERTIFICAT",
            "---",
            notes[scrollType]
          ]),
          attachment: fs.createReadStream(scrollPath)
        });
        fs.unlinkSync(scrollPath);
      }

    } catch (e) {
      console.error("[cupidon v10]", e);
      const errMsg = UI([
        "❌ Scan échoué",
        "---",
        "Réessaie ou vérifie le lien."
      ]);
      if (loadingMsg?.messageID) {
        await api.editMessage(errMsg, loadingMsg.messageID).catch(() => {});
      } else {
        message.reply(errMsg).catch(() => {});
      }
    }
  }
};