const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LOVE_QUOTES = {
  SOULMATE: [
    "Two hearts, one soul. Forever intertwined.",
    "In your eyes, I found my home.",
    "Every love story is beautiful, but ours is my favorite.",
    "You are the missing piece I never knew I needed.",
    "Together is a wonderful place to be.",
    "I fell in love with you because of who you are.",
    "You make my heart smile in ways I never knew possible.",
    "My heart beats only for you, now and always."
  ],
  SPARK: [
    "A spark just ignited between these two souls.",
    "Love doesn't need to be perfect, it just needs to be true.",
    "When two hearts are meant for each other, no distance is too far.",
    "The best feeling is when you look at them and they're already looking.",
    "Some souls just understand each other upon meeting.",
    "There's a magnetic pull that words cannot explain."
  ],
  FRIEND: [
    "Friendship is the purest form of love.",
    "A true friend is the greatest of all blessings.",
    "Friends are the family we choose for ourselves.",
    "Side by side or miles apart, real friends are always close at heart.",
    "Good friends are like stars - you don't always see them, but they're always there.",
    "Friendship isn't about who you've known longest, but who came and never left."
  ],
  INCOMPATIBLE: [
    "Some connections are lessons, not lifetimes.",
    "Not every bond is meant to last forever.",
    "Sometimes letting go is an act of love too.",
    "Two beautiful souls, just not meant to walk the same path.",
    "The universe has different plans for these two hearts.",
    "It's better to have loved and lost than never to have loved at all."
  ],
  NEUTRAL: [
    "Every relationship starts with a simple hello.",
    "Time will tell what the heart already knows.",
    "Some stories are still being written.",
    "The best relationships begin unexpectedly.",
    "Patience is the key to understanding any heart.",
    "Not all who wander are lost, some are just finding their way."
  ]
};

function getRandomQuote(category) {
  const quotes = LOVE_QUOTES[category] || LOVE_QUOTES.NEUTRAL;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function drawHeart(ctx, x, y, size, color, opacity = 1, glow = false) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  if (glow) { ctx.shadowBlur = 35; ctx.shadowColor = color; }
  ctx.beginPath();
  const h = size * 0.3;
  ctx.moveTo(x, y + h);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + h);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size / 1.25, x, y + size);
  ctx.bezierCurveTo(x, y + size / 1.25, x + size / 2, y + size / 2, x + size / 2, y + h);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + h);
  ctx.fill();
  ctx.restore();
}

function drawECG(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < w; i += 2) {
    let dy = 0;
    let pos = i % 80;
    if (pos > 10 && pos < 15) dy = -h * 0.15;
    else if (pos >= 20 && pos <= 22) dy = h * 0.1;
    else if (pos > 22 && pos < 27) dy = -h * 1.0;
    else if (pos >= 27 && pos <= 30) dy = h * 0.2;
    else if (pos > 45 && pos < 55) dy = -h * 0.1;
    ctx.lineTo(x + i, y + dy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTargetHud(ctx, x, y, radius, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  const size = 40;
  const offset = radius + 10;
  const drawCorner = (tx, ty, rot) => {
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, 0); ctx.lineTo(size, 0);
    ctx.stroke(); ctx.restore();
  };
  drawCorner(x - offset, y - offset, 0);
  drawCorner(x + offset, y - offset, Math.PI / 2);
  drawCorner(x + offset, y + offset, Math.PI);
  drawCorner(x - offset, y + offset, -Math.PI / 2);
  ctx.restore();
}

function drawDigitalBar(ctx, x, y, w, h, percent, color) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 5, w + 10, h + 10, 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();
  ctx.clip();
  const barWidth = (percent / 100) * w;
  if (barWidth > 0) {
    const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "#ffffff");
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, h);
  }
  ctx.restore();
}

function applyCrtEffect(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  for (let i = 0; i < h; i += 4) {
    ctx.fillRect(0, i, w, 1.5);
  }
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 1.1);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

async function generateScroll(type, name1, name2, lovePercent) {
  const canvas = createCanvas(1000, 700);
  const ctx = canvas.getContext("2d");

  let mainColor, secondaryColor, bgColorStart, bgColorEnd, title, introText, sealIcon, quote;

  if (type === "MARRIAGE") {
    mainColor = "#C5A059"; secondaryColor = "#8e6d13"; bgColorStart = "#fffdf5"; bgColorEnd = "#f2e9d0";
    title = "MARRIAGE CERTIFICATE"; introText = "Hereby unites in eternal love"; sealIcon = "💍";
    quote = getRandomQuote("SOULMATE");
  } else if (type === "FRIENDSHIP") {
    mainColor = "#00ccff"; secondaryColor = "#006699"; bgColorStart = "#f0faff"; bgColorEnd = "#d0eef2";
    title = "FRIENDSHIP CERTIFICATE"; introText = "Declares an unbreakable bond between"; sealIcon = "🤝";
    quote = getRandomQuote("FRIEND");
  } else {
    mainColor = "#b22222"; secondaryColor = "#4a0000"; bgColorStart = "#2a0a0a"; bgColorEnd = "#1a0505";
    title = "DIVORCE DECREE"; introText = "Declares critical incompatibility between"; sealIcon = "💔";
    quote = getRandomQuote("INCOMPATIBLE");
  }

  const bgGradient = ctx.createRadialGradient(500, 350, 100, 500, 350, 600);
  bgGradient.addColorStop(0, bgColorStart);
  bgGradient.addColorStop(1, bgColorEnd);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 15;
  ctx.strokeRect(30, 30, 940, 640);
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, 900, 600);

  ctx.textAlign = "center";
  ctx.fillStyle = type === "DIVORCE" ? "#ff4444" : "#2c3e50";
  ctx.font = "italic 30px serif";
  ctx.fillText(type === "DIVORCE" ? "Official System Separation" : "Official Union", 500, 120);

  ctx.font = "bold 65px serif";
  ctx.fillStyle = secondaryColor;
  ctx.fillText(title, 500, 210);

  ctx.font = "25px serif";
  ctx.fillStyle = type === "DIVORCE" ? "#ccc" : "#555";
  ctx.fillText(introText, 500, 280);

  ctx.font = "bold 50px Arial";
  ctx.fillStyle = type === "DIVORCE" ? "#fff" : "#000";
  const names = `${name1} & ${name2}`;
  const nameLines = wrapText(ctx, names, 800);
  nameLines.forEach((line, i) => ctx.fillText(line, 500, 350 + (i * 55)));

  ctx.font = "italic 28px serif";
  ctx.fillStyle = type === "DIVORCE" ? "#ff6666" : "#666";
  ctx.fillText(`Compatibility Rate: ${lovePercent}%`, 500, 460);

  ctx.font = "italic 22px serif";
  ctx.fillStyle = type === "DIVORCE" ? "#aaa" : "#444";
  const quoteLines = wrapText(ctx, `"${quote}"`, 700);
  quoteLines.forEach((line, i) => ctx.fillText(line, 500, 520 + (i * 35)));

  ctx.font = "18px Arial";
  ctx.fillText("Issued on " + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 200, 640);

  const sealX = 850, sealY = 580;
  ctx.beginPath(); ctx.arc(sealX, sealY, 50, 0, Math.PI * 2);
  ctx.fillStyle = mainColor; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 40px Arial";
  ctx.fillText(sealIcon, sealX, sealY + 15);

  return canvas.toBuffer();
}

module.exports = {
  config: {
    name: "cupidon",
    version: "6.0",
    author: "Itachi Soma",
    role: 0,
    category: "fun",
    shortDescription: { en: "Love & Friendship Analyzer with Certificates" }
  },

  onStart: async function({ message, event, api }) {
    const { threadID, senderID, body, mentions, messageReply } = event;
    const extractID = (text) => text.match(/\d{8,}/g);
    let user1 = senderID, user2;
    const inputIDs = extractID(body);
    const mentionIDs = Object.keys(mentions || {});

    if (inputIDs && inputIDs.length >= 2) { user1 = inputIDs[0]; user2 = inputIDs[1]; }
    else if (mentionIDs.length >= 2) { user1 = mentionIDs[0]; user2 = mentionIDs[1]; }
    else if (inputIDs && inputIDs.length === 1) { user2 = inputIDs[0]; }
    else if (mentionIDs.length === 1) { user2 = mentionIDs[0]; }
    else if (messageReply) { user2 = messageReply.senderID; }
    else {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const members = threadInfo.participantIDs.filter(id => id !== senderID);
        user2 = members[Math.floor(Math.random() * members.length)];
      } catch {
        user2 = senderID;
      }
    }

    let loadingMsg = null;

    try {
      await new Promise((resolve, reject) => {
        api.sendMessage(
          `╭─────────────────────•\n│ 🔍 Analyzing hearts...\n├─────────────────────•\n│ [░░░░░░░░░░░░░░░░░░░░] 0%\n╰─────────────────────•`,
          event.threadID,
          (err, info) => {
            if (err) return reject(err);
            loadingMsg = info;
            resolve(info);
          }
        );
      });

      if (!loadingMsg || !loadingMsg.messageID) throw new Error("Failed to send loading message");

      const progressSteps = [13, 39, 67, 100];
      for (let i = 0; i < progressSteps.length; i++) {
        await sleep(1500);
        const filled = Math.floor(progressSteps[i] / 5);
        const empty = 20 - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        await api.editMessage(
          `╭─────────────────────•\n│ 🔍 Analyzing hearts...\n├─────────────────────•\n│ [${bar}] ${progressSteps[i]}%\n╰─────────────────────•`,
          loadingMsg.messageID
        );
      }

      await sleep(1000);
      await api.editMessage(
        `╭─────────────────────•\n│ ✅ Analysis complete !\n╰─────────────────────•`,
        loadingMsg.messageID
      );

      await sleep(1500);
      await api.editMessage("", loadingMsg.messageID);
      await sleep(500);

      const threadInfo = await api.getThreadInfo(threadID);
      const name1 = threadInfo.userInfo?.find(u => u.id == user1)?.name || (await api.getUserInfo(user1))[user1]?.name || "Subject A";
      const name2 = threadInfo.userInfo?.find(u => u.id == user2)?.name || (await api.getUserInfo(user2))[user2]?.name || "Subject B";

      const lovePercent = Math.floor(Math.random() * 101);
      let themeColor, status, scrollType, quoteCategory;

      if (lovePercent >= 85) { themeColor = "#ff2d95"; status = "SOULMATES 💞"; scrollType = "MARRIAGE"; quoteCategory = "SOULMATE"; }
      else if (lovePercent >= 60) { themeColor = "#ff6b9d"; status = "LOVE SPARK 💖"; scrollType = "FRIENDSHIP"; quoteCategory = "SPARK"; }
      else if (lovePercent >= 30) { themeColor = "#4fc3f7"; status = "TRUE FRIENDS 🤝"; scrollType = "FRIENDSHIP"; quoteCategory = "FRIEND"; }
      else if (lovePercent <= 15) { themeColor = "#ef5350"; status = "INCOMPATIBLE 💔"; scrollType = "DIVORCE"; quoteCategory = "INCOMPATIBLE"; }
      else { themeColor = "#ffb74d"; status = "NEUTRAL 🧡"; scrollType = null; quoteCategory = "NEUTRAL"; }

      const loveQuote = getRandomQuote(quoteCategory);

      const canvas = createCanvas(1200, 900);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, 1200, 900);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 1200; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 900); ctx.stroke(); }
      for (let i = 0; i < 900; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1200, i); ctx.stroke(); }

      const drawAvatar = async (userID, name, x, y) => {
        ctx.save(); ctx.shadowBlur = 50; ctx.shadowColor = themeColor;
        ctx.beginPath(); ctx.arc(x, y, 150, 0, Math.PI * 2); ctx.clip();
        try {
          const img = await loadImage(`https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
          ctx.drawImage(img, x - 150, y - 150, 300, 300);
        } catch (e) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(x - 150, y - 150, 300, 300);
          ctx.fillStyle = themeColor;
          ctx.font = "bold 100px monospace";
          ctx.textAlign = "center";
          ctx.fillText(name.charAt(0).toUpperCase(), x, y + 30);
        }
        ctx.restore();
        ctx.beginPath(); ctx.arc(x, y, 150, 0, Math.PI * 2);
        ctx.strokeStyle = themeColor; ctx.lineWidth = 5; ctx.stroke();
        drawTargetHud(ctx, x, y, 150, themeColor);
        ctx.fillStyle = themeColor; ctx.font = "bold 30px monospace"; ctx.textAlign = "center";
        ctx.fillText(name.toUpperCase(), x, y + 210);
      };

      await drawAvatar(user1, name1, 280, 320);
      await drawAvatar(user2, name2, 920, 320);
      drawHeart(ctx, 600, 280, 140, themeColor, 1, true);
      drawECG(ctx, 400, 750, 400, 60, themeColor);
      ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "bold 130px monospace";
      ctx.fillText(`${lovePercent}%`, 600, 520);
      drawDigitalBar(ctx, 250, 560, 700, 40, lovePercent, themeColor);
      ctx.font = "bold 55px monospace"; ctx.fillStyle = themeColor; ctx.fillText(status, 600, 700);

      ctx.font = "italic 24px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      const quoteDisplay = wrapText(ctx, `"${loveQuote}"`, 800);
      quoteDisplay.forEach((line, i) => ctx.fillText(line, 600, 800 + (i * 35)));

      applyCrtEffect(ctx, 1200, 900);

      const cupidonPath = path.join(__dirname, `cupid_${Date.now()}.png`);
      fs.writeFileSync(cupidonPath, canvas.toBuffer());
      await message.reply({
        body: `💘 LOVE SCAN RESULT 💘\n━━━━━━━━━━━━━━━\n👤 ${name1} x ${name2}\n📈 Score: ${lovePercent}%\n📍 Status: ${status}\n💬 "${loveQuote}"`,
        attachment: fs.createReadStream(cupidonPath)
      });
      fs.unlinkSync(cupidonPath);

      if (scrollType) {
        const scrollBuffer = await generateScroll(scrollType, name1, name2, lovePercent);
        const scrollPath = path.join(__dirname, `scroll_${Date.now()}.png`);
        fs.writeFileSync(scrollPath, scrollBuffer);
        const notes = {
          MARRIAGE: `💍 Eternal Union Sealed !\n${name1} & ${name2} are now bound by love.`,
          FRIENDSHIP: `🤝 Friendship Certified !\n${name1} & ${name2} share an unbreakable bond.`,
          DIVORCE: `💔 Separation Decreed !\n${name1} & ${name2} walk different paths now.`
        };
        await message.reply({ body: notes[scrollType], attachment: fs.createReadStream(scrollPath) });
        fs.unlinkSync(scrollPath);
      }
    } catch (e) {
      console.error("[cupidon]", e);
      if (loadingMsg?.messageID) {
        await api.editMessage(
          `╭─────────────────────•\n│ ❌ Analysis failed\n╰─────────────────────•`,
          loadingMsg.messageID
        ).catch(() => {});
      } else {
        message.reply("❌ An error occurred during the love scan.");
      }
    }
  }
};