const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CASH_URL = "https://cash-api-five.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const MAX_LIMIT = 10n ** 261n;

const OWNER_ID = "61589133048588";
const MAX_PETS = 20;

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

const PET_TYPES = {
  chiot: { emoji: "🐶", rarity: "COMMUN", baseHp: 150, baseAtk: 10, price: 1000000000000n, maxLevel: 30, evolve: null },
  chat: { emoji: "🐱", rarity: "COMMUN", baseHp: 120, baseAtk: 12, price: 1200000000000n, maxLevel: 30, evolve: null },
  renard: { emoji: "🦊", rarity: "PEU COMMUN", baseHp: 140, baseAtk: 15, price: 2500000000000n, maxLevel: 35, evolve: "loup" },
  loup: { emoji: "🐺", rarity: "RARE", baseHp: 180, baseAtk: 20, price: 8000000000000n, maxLevel: 40, evolve: "loup_garou" },
  loup_garou: { emoji: "🐺", rarity: "EPIQUE", baseHp: 250, baseAtk: 28, price: 30000000000000n, maxLevel: 50, evolve: "loup_ombre" },
  loup_ombre: { emoji: "🌑", rarity: "LEGENDAIRE", baseHp: 350, baseAtk: 40, price: 100000000000000n, maxLevel: 60, evolve: null },
  dragon: { emoji: "🐉", rarity: "MYTHIQUE", baseHp: 500, baseAtk: 55, price: 500000000000000n, maxLevel: 75, evolve: "dragon_divin" },
  dragon_divin: { emoji: "💎", rarity: "DIVIN", baseHp: 800, baseAtk: 80, price: 1000000000000000n, maxLevel: 100, evolve: null },
  phenix: { emoji: "🔥", rarity: "LEGENDAIRE", baseHp: 300, baseAtk: 35, price: 200000000000000n, maxLevel: 55, evolve: null },
  licorne: { emoji: "🦄", rarity: "EPIQUE", baseHp: 200, baseAtk: 22, price: 50000000000000n, maxLevel: 45, evolve: null },
  griffon: { emoji: "🦅", rarity: "RARE", baseHp: 160, baseAtk: 18, price: 10000000000000n, maxLevel: 38, evolve: null },
  slime: { emoji: "🟢", rarity: "COMMUN", baseHp: 80, baseAtk: 5, price: 500000000000n, maxLevel: 20, evolve: "roi_slime" },
  roi_slime: { emoji: "👑", rarity: "RARE", baseHp: 200, baseAtk: 15, price: 15000000000000n, maxLevel: 40, evolve: null }
};

const ITEMS = {
  potion: ["💚 Potion", 1000000000n, "Soigne 50 PV", { hp: 50 }],
  super_potion: ["💚 Super Potion", 5000000000n, "Soigne 150 PV", { hp: 150 }],
  max_potion: ["💚 Max Potion", 20000000000n, "Soigne tout les PV", { hp: "full" }],
  elixir: ["🧪 Élixir", 10000000000n, "Soigne 100 PV + 20 énergie", { hp: 100, energy: 20 }],
  elixir_divin: ["🧪 Élixir Divin", 50000000000n, "Soigne full + 50 énergie", { hp: "full", energy: 50 }],
  steak: ["🥩 Steak", 2000000000n, "Nourrit 50", { hunger: 50 }],
  poisson: ["🐟 Poisson", 1500000000n, "Nourrit 40", { hunger: 40 }],
  pomme: ["🍎 Pomme", 500000000n, "Nourrit 25", { hunger: 25 }],
  pain: ["🍞 Pain", 300000000n, "Nourrit 20", { hunger: 20 }],
  eau: ["💧 Eau", 200000000n, "Hydrate 50", { thirst: 50 }],
  lait: ["🥛 Lait", 400000000n, "Hydrate 40", { thirst: 40 }],
  the: ["🍵 Thé", 300000000n, "Hydrate 30", { thirst: 30 }],
  boisson_energie: ["⚡ Boisson Énergisante", 1500000000n, "+30 énergie", { energy: 30 }],
  revive: ["💀 Revive", 0n, "Réanime un pet (prix variable)", { revive: true }],
  parchemin_phenix: ["📜 Parchemin Phénix", 100000000000n, "Réanime + boost stats", { revive: true, str: 5, spd: 5, int: 5, maxHp: 5 }],
  totem: ["🪘 Totem", 200000000000n, "Réanime full + invincible 1 combat", { revive: true, str: 10, spd: 10, int: 10, maxHp: 10, invincible: 1 }]
};

const SHOP_ITEMS = {
  oeuf_argente: {
    name: "🥚 Œuf Argenté",
    price: 8000000000000n,
    desc: "Donne PEU COMMUN ou RARE",
    emoji: "🥚",
    rarity: ["PEU COMMUN", "RARE"],
    maxBuy: 2,
    cooldown: 5 * 24 * 60 * 60 * 1000
  },
  oeuf_dore: {
    name: "🥚 Œuf Doré",
    price: 20000000000000n,
    desc: "Donne EPIQUE ou LEGENDAIRE",
    emoji: "🥚",
    rarity: ["EPIQUE", "LEGENDAIRE"],
    maxBuy: 2,
    cooldown: 5 * 24 * 60 * 60 * 1000
  }
};

const DATA_DIR = path.join(__dirname, "data");
const PETS_FILE = path.join(DATA_DIR, "pets.json");
const SAFE_FILE = path.join(DATA_DIR, "safe.json");
const INVENTORIES_FILE = path.join(DATA_DIR, "inventories.json");
const SELECTED_PETS_FILE = path.join(DATA_DIR, "selected_pets.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    return {};
  } catch { return {}; }
}

function saveData(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch {}
}

function createNewPet(type, petData) {
  const baseName = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const names = [baseName, `${baseName} Jr`, `Ombre ${baseName}`, `Elite ${baseName}`];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    type: type,
    level: 1,
    exp: 0,
    hp: petData.baseHp,
    maxHp: petData.baseHp,
    str: petData.baseAtk,
    atk: petData.baseAtk,
    def: 5,
    spd: 5,
    int: 5,
    faim: 100,
    soif: 100,
    energie: 100,
    bonheur: 100,
    vivant: true,
    victoires: 0,
    defaites: 0,
    combats: 0,
    reviveCount: 0,
    acheteLe: Date.now(),
    buffs: { str: 0, spd: 0, int: 0, crit: 0, duree: 0, invincible: 0 },
    dort: false,
    reveilA: 0,
    peutCombattre: true,
    peutTravailler: true,
    peutExplorer: true,
    queteData: { derniereQuete: 0, streak: 0, totalComplete: 0 }
  };
}

function getActivePet(pets, userId, selectedPets) {
  if (!pets || pets.length === 0) return null;
  const idx = selectedPets?.[userId] ?? 0;
  return pets[idx] || pets[0];
}

function makeBar(val, max) {
  const filled = Math.floor((val / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function initUserSafe(safe, userId) {
  if (!safe[userId]) safe[userId] = { giftCount: 0, eggCooldowns: {}, names: "" };
  if (!safe[userId].eggCooldowns) safe[userId].eggCooldowns = {};
  if (safe[userId].giftCount === undefined) safe[userId].giftCount = 0;
  return safe;
}

module.exports = {
  config: {
    name: "pet",
    version: "2.0",
    author: "Ismael03-Dev",
    countDown: 2,
    role: 0,
    category: "economy",
    shortDescription: { en: "Système de Pets" }
  },

  onStart: async function ({ args, message, event, api }) {
    const userId = String(event.senderID);
    const threadID = event.threadID;

    let pets = loadData(PETS_FILE);
    let safe = loadData(SAFE_FILE);
    let inventories = loadData(INVENTORIES_FILE);
    let selectedPets = loadData(SELECTED_PETS_FILE);

    if (!pets[userId]) pets[userId] = [];
    if (!inventories[userId]) inventories[userId] = {};
    initUserSafe(safe, userId);

    const send = (msg) => api.sendMessage(msg, threadID);
    const sub = args[0]?.toLowerCase();

    if (global.petSystemLocked && userId !== OWNER_ID) {
      return send(UI(["🔒 SYSTEME PET VERROUILLE", "---", "Allez demander pardon a Kevin bruh 😮‍💨🙄😑"]));
    }

    if (sub === "help") {
      const p = global.utils.getPrefix(threadID);
      return send(UI([
        "🎮 PET AIDE", "---",
        "📦 BASE",
        `${p}pet pets → Voir tes pets`,
        `${p}pet stats <nom> → Stats détaillées`,
        `${p}pet view <nom> → Carte du pet`,
        `${p}pet play <nom> → S'amuser | +Bonheur`,
        `${p}pet feed <nom> → Nourrir`,
        `${p}pet sleep <nom> → Reposer`,
        `${p}pet upgrade <nom> → Level up 1 par 1`,
        `${p}pet upgrade max <nom> → Max upgrade auto`,
        "---",
        "🌍 ACTIVITES",
        `${p}pet explore <num> → Exploration`,
        `${p}pet work <num> → Travailler`,
        `${p}pet quest <nom> → Quête`,
        `${p}pet train <num> → Entraîner`,
        "---",
        "🛒 BOUTIQUE",
        `${p}pet shop → Voir items/nourriture`,
        `${p}pet shop pets → Voir pets vendus`,
        `${p}pet buy oeuf_argente → 8Qa [PEU COMMUN/RARE]`,
        `${p}pet buy oeuf_dore → 20Qa [EPIQUE/LEGENDAIRE]`,
        `${p}pet buy <pet> → Acheter pet`,
        `${p}pet buy <item> <num> → Acheter item`,
        "---",
        "🎁 CADEAU",
        `${p}pet gift @user pet <nom>`,
        `${p}pet gift @user item <nom>`,
        `${p}pet gift @user money <montant>`,
        `${p}pet mygifts → Voir restants`,
        "⚠️ Limite: 6 cadeaux max",
        "---",
        "⚔️ COMBAT",
        `${p}pet battle → Combat PvE`,
        `${p}pet select <nom|num> → Pet actif`,
        "Stats: ⚔️ATK 💪STR 💨SPD 🧠INT 🛡️DEF ❤️PV",
        "---",
        "🎆 EVOLUTION",
        `${p}pet evolve <nom> <pierre>`,
        "Pierres: givre/foudre/feu/ombre/divine"
      ]));
    }

    if (sub === "lock") {
      if (userId !== OWNER_ID) return send(UI(["❌ T'es pas kevin"]));
      global.petSystemLocked = !global.petSystemLocked;
      return send(global.petSystemLocked
        ? UI(["🔒 SYSTEME PET VERROUILLE", "---", "Allez demander pardon a Kevin bruh 😮‍💨🙄😑"])
        : UI(["🔓 SYSTEME PET DEVERROUILLE", "---", "Soyez lui en reconnaissant pour sa générosité 😊"]));
    }

    if (sub === "shop") {
      const type = args[1]?.toLowerCase() || "all";
      const cash = await getUserCash(userId);
      const fCash = await formatNumber(cash);

      if (type === "pets") {
        let msg = [`🐾 BOUTIQUE PETS - ${fCash}$`];
        if (pets[userId]?.length) {
          msg.push("---", "TES PETS:");
          pets[userId].forEach((pet, i) => {
            const petData = PET_TYPES[pet.type];
            const emoji = petData?.emoji || "❓";
            const statut = pet.vivant ? "❤️" : "💀";
            msg.push(`${i + 1}. ${emoji} ${pet.name} Niv.${pet.level} ${statut}`);
            msg.push(`❤️${makeBar(pet.hp, pet.maxHp)} | 🍗${makeBar(pet.faim, 100)}`);
            msg.push(`💪${pet.str} 💨${pet.spd} 🧠${pet.int} | Revives: ${pet.reviveCount || 0}`);
          });
          msg.push("---");
        }
        msg.push("PETS A ADOPTER:");
        const raretes = { COMMUN: "⚪", "PEU COMMUN": "🟢", RARE: "🔵", EPIQUE: "🟣", LEGENDAIRE: "🟡", MYTHIQUE: "🔴", DIVIN: "💎" };
        for (const [rarite, emoji] of Object.entries(raretes)) {
          const petList = Object.entries(PET_TYPES).filter(([, v]) => v.rarity === rarite);
          if (!petList.length) continue;
          msg.push(`${emoji} ${rarite}`);
          petList.forEach(([k, v]) => {
            const nom = k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
            const prix = await formatNumber(v.price);
            msg.push(`${v.emoji} ${nom} ${v.evolve ? `→ ${v.evolve.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}` : ""} 💰 ${prix}$ | Niv${v.maxLevel} | ATK${v.baseAtk}`);
          });
          msg.push("---");
        }
        msg.push("💡 `.pet buy <nom>` pour adopter | `.pet shop items` pour la bouffe");
        return send(UI(msg));
      }

      if (type === "items") {
        let msg = [`🛒 BOUTIQUE ITEMS - ${fCash}$`, "---"];
        for (const [key, [name, price, desc]] of Object.entries(ITEMS)) {
          const fPrice = await formatNumber(price);
          msg.push(`${name} - ${fPrice}$`);
          msg.push(`${desc} | \`.pet buy ${key} <num>\``);
          msg.push("---");
        }
        return send(UI(msg));
      }

      if (type === "eggs" || type === "oeufs") {
        let msg = ["🛒 BOUTIQUE OEUFS", "---"];
        for (const [key, item] of Object.entries(SHOP_ITEMS)) {
          const cooldownData = safe[userId].eggCooldowns[key] || { count: 0, resetTime: 0 };
          const now = Date.now();
          let remaining = item.maxBuy;
          if (now < cooldownData.resetTime) {
            remaining = Math.max(0, item.maxBuy - cooldownData.count);
          } else {
            safe[userId].eggCooldowns[key] = { count: 0, resetTime: 0 };
          }
          const fPrice = await formatNumber(item.price);
          const tempsRestant = cooldownData.resetTime > now ? Math.ceil((cooldownData.resetTime - now) / (1000 * 60 * 60)) + "h" : "";
          msg.push(`${item.emoji} ${item.name} - ${fPrice}$`);
          msg.push(` └ ${item.desc} | Stock: ${remaining}/${item.maxBuy} ${tempsRestant ? `⏳${tempsRestant}` : ""}`);
          msg.push("---");
        }
        msg.push("`.pet buy oeuf_argente` ou `.pet buy oeuf_dore`");
        return send(UI(msg));
      }

      return send(UI([
        "🐾 BOUTIQUE PETS", "---",
        `💰 ${fCash}$`, "---",
        "PETS: `.pet shop pets` pour la liste",
        "ITEMS: `.pet shop items` pour la liste",
        "OEUFS: `.pet shop oeufs` pour les oeufs",
        "---",
        "Pierres: ❄️5Qa Niv27 | ⚡8Qa Niv24 | 🔥12Qa Niv20 | 🌑20Qa Niv17 | 💎50Qa Tous",
        "Résurrection: 📜Variable | 🔥200Qa | 🗿500Qa",
        "Divin: 👑🧪100Qa | 💊👑150Qa | 🌈🥩5Qa | 🥩🌌25Qa | 🌑🍇50Qa"
      ]));
    }

    if (sub === "buy") {
      const arg1 = args[1]?.toLowerCase();

      if (arg1 === "oeuf_argente" || arg1 === "oeuf_dore") {
        const eggKey = arg1 === "oeuf_argente" ? "oeuf_argente" : "oeuf_dore";
        const eggData = SHOP_ITEMS[eggKey];
        if (!eggData) return send(UI(["❌ Oeuf invalide"]));

        const now = Date.now();
        const cooldownData = safe[userId].eggCooldowns[eggKey] || { count: 0, resetTime: 0 };
        if (now >= cooldownData.resetTime) { cooldownData.count = 0; cooldownData.resetTime = 0; }
        if (cooldownData.count >= eggData.maxBuy) {
          const heuresRestantes = Math.ceil((cooldownData.resetTime - now) / (1000 * 60 * 60));
          return send(UI([`❌ Limite atteinte! Tu peux racheter dans ${heuresRestantes}h`]));
        }

        const cash = await getUserCash(userId);
        if (cash < eggData.price) {
          const fPrice = await formatNumber(eggData.price);
          return send(UI([`❌ Il te faut ${fPrice}$`]));
        }
        await updateUserCash(userId, -eggData.price);

        cooldownData.count++;
        if (cooldownData.count === 1) cooldownData.resetTime = now + eggData.cooldown;
        safe[userId].eggCooldowns[eggKey] = cooldownData;

        const validPets = Object.entries(PET_TYPES).filter(([, v]) => eggData.rarity.includes(v.rarity));
        const [petKey, petData] = validPets[Math.floor(Math.random() * validPets.length)];
        const newPet = createNewPet(petKey, petData);
        pets[userId].push(newPet);
        saveData(PETS_FILE, pets);
        saveData(SAFE_FILE, safe);

        const remaining = eggData.maxBuy - cooldownData.count;
        const fPrice = await formatNumber(eggData.price);
        return send(UI([
          `✅ Achat ${eggData.emoji} ${eggData.name} - ${fPrice}$`,
          "---",
          `🎉 L'oeuf éclot... ${petData.emoji} **${newPet.name}** [${petData.rarity}] a rejoint ton equipe!`,
          `📦 Restant: ${remaining}/${eggData.maxBuy} achats`
        ]));
      }

      const itemKey = arg1;
      const petNum = parseInt(args[2]) - 1;
      const item = ITEMS[itemKey];

      if (item) {
        const pet = pets[userId]?.[petNum];
        if (!pet) return send(UI([`❌ Pet introuvable. \`.pet buy ${itemKey} <num>\``]));
        if (!pet.vivant && !itemKey.includes("revive") && itemKey !== "parchemin_phenix" && itemKey !== "totem")
          return send(UI([`❌ ${pet.name} est mort. Ressuscite-le d'abord.`]));

        let prixFinal = typeof item[1] === "bigint" ? item[1] : 0n;
        if (itemKey === "revive") {
          if (pet.level <= 20) prixFinal = 20000000000n;
          else if (pet.level <= 50) prixFinal = 50000000000n;
          else prixFinal = 100000000000n;
        }

        const cash = await getUserCash(userId);
        if (cash < prixFinal) {
          const fPrix = await formatNumber(prixFinal);
          return send(UI([`❌ Il te faut ${fPrix}$`]));
        }
        await updateUserCash(userId, -prixFinal);

        let msg = [`✅ Achat ${item[0]} pour ${pet.name}`];

        if (item[3]) {
          const eff = item[3];
          if (!pet.buffs) pet.buffs = { str: 0, spd: 0, int: 0, crit: 0, duree: 0, invincible: 0 };
          if (eff.atk) pet.atk = (pet.atk || pet.str) + eff.atk;
          if (eff.str) pet.str = (pet.str || pet.atk) + eff.str;
          if (eff.spd) pet.spd = (pet.spd || 5) + eff.spd;
          if (eff.int) pet.int = (pet.int || 5) + eff.int;
          if (eff.maxHp) { pet.maxHp += eff.maxHp; pet.hp += eff.maxHp; }
          if (eff.hp === "full") pet.hp = pet.maxHp;
          else if (eff.hp) pet.hp = Math.min(pet.maxHp, pet.hp + eff.hp);
          if (eff.hunger) pet.faim = Math.min(100, pet.faim + eff.hunger);
          if (eff.thirst) pet.soif = Math.min(100, pet.soif + eff.thirst);
          if (eff.energy) pet.energie = Math.min(100, (pet.energie || 100) + eff.energy);
          if (eff.invincible) pet.buffs.invincible = (pet.buffs.invincible || 0) + eff.invincible;
          if (eff.clearDebuff) pet.buffs = { str: 0, spd: 0, int: 0, crit: 0, duree: 0, invincible: pet.buffs.invincible || 0 };

          msg.push("---");
          msg.push(`❤️ ${makeBar(pet.hp, pet.maxHp)}`);
          msg.push(`🍗 ${makeBar(pet.faim, 100)}`);
          msg.push(`💧 ${makeBar(pet.soif, 100)}`);
          msg.push(`⚡ ${makeBar(pet.energie || 100, 100)}`);
          msg.push(`💪 STR:${pet.str} 💨SPD:${pet.spd} 🧠INT:${pet.int} | PV:${pet.maxHp}`);
        }

        if (["revive", "parchemin_phenix", "totem"].includes(itemKey)) {
          pet.vivant = true;
          pet.hp = Math.floor(pet.maxHp * (itemKey === "totem" ? 1 : itemKey === "parchemin_phenix" ? 0.8 : 0.5));
          pet.faim = itemKey === "totem" ? 100 : 50;
          pet.soif = itemKey === "totem" ? 100 : 50;
          pet.energie = itemKey === "totem" ? 100 : 50;
          pet.reviveCount = (pet.reviveCount || 0) + 1;
          if (itemKey === "parchemin_phenix") { pet.str += 5; pet.spd += 5; pet.int += 5; pet.maxHp += 5; }
          if (itemKey === "totem") { pet.str += 10; pet.spd += 10; pet.int += 10; pet.maxHp += 10; if (pet.buffs) pet.buffs.invincible = 1; }
          msg.push(`✅ ${pet.name} est ressuscité!`);
        }

        saveData(PETS_FILE, pets);
        return send(UI(msg));
      }

      const type = args.slice(1).join('_').toLowerCase();
      const foundType = Object.keys(PET_TYPES).find(k =>
        k === type || k.replace(/_/g, ' ') === args.slice(1).join(' ').toLowerCase()
      );
      if (!foundType) return send(UI(["❌ Pet ou item introuvable", "`.pet shop pets` pour la liste"]));

      const petData = PET_TYPES[foundType];
      const cash = await getUserCash(userId);
      if (cash < petData.price) {
        const fPrice = await formatNumber(petData.price);
        return send(UI([`❌ Il te faut ${fPrice}$`]));
      }
      await updateUserCash(userId, -petData.price);

      const newPet = createNewPet(foundType, petData);
      pets[userId].push(newPet);
      saveData(PETS_FILE, pets);
      const fPrice = await formatNumber(petData.price);
      return send(UI([`✅ Achat ${petData.emoji} ${newPet.name} - ${fPrice}$`]));
    }

    if (sub === "pets" || sub === "list") {
      const userPets = pets[userId] || [];
      if (userPets.length === 0) return send(UI(["❌ Tu n'as aucun pet", "Fais `.pet buy <type>` pour commencer!"]));

      const selectedIndex = selectedPets[userId] ?? 0;
      const raretesEmojis = { COMMUN: "⚪", "PEU COMMUN": "🟢", RARE: "🔵", EPIQUE: "🟣", LEGENDAIRE: "🟡", MYTHIQUE: "🔴", DIVIN: "💎" };

      let msg = [`🐾 TES PETS (${userPets.length}/${MAX_PETS})`, "---"];
      userPets.forEach((pet, i) => {
        const petData = PET_TYPES[pet.type];
        const emoji = petData?.emoji || "❓";
        const rarity = raretesEmojis[petData?.rarity] || "⚪";
        const str = pet.str || pet.atk || 0;
        const spd = pet.spd || 5;
        const int = pet.int || 5;
        const def = pet.def || 0;
        const power = str + spd + int + (pet.maxHp || 100) + def;
        const victoires = pet.victoires || 0;
        const defaites = pet.defaites || 0;
        const winRate = victoires + defaites > 0 ? Math.round((victoires / (victoires + defaites)) * 100) : 0;
        const isSelected = i === selectedIndex ? "⭐ " : "";
        const statut = pet.vivant ? "❤️" : "💀";

        msg.push(`${isSelected}${i + 1}. ${emoji} **${pet.name}** ${statut} ${rarity}`);
        msg.push(` Niv.${pet.level}/${petData?.maxLevel || "?"} | 💥 Puissance: ${power.toLocaleString()} | 🏆 ${victoires}V/${defaites}D (${winRate}%)`);
        msg.push(` ❤️ ${pet.hp}/${pet.maxHp} | 🍗 ${pet.faim}/100 | ⚡ ${pet.energie || 100}/100`);
        if (i < userPets.length - 1) msg.push(" ─────────────────────────────");
      });
      msg.push("---");
      msg.push("⭐ = Pet actif | 💡 `.pet select <nom>` pour changer");
      msg.push("`.pet stats <nom>` | `.pet rename <nom> <nouveau>` | `.pet train <num>`");
      return send(UI(msg));
    }

    if (sub === "select") {
      const identifier = args[1];
      if (!identifier) return send(UI(["❌ Usage: `.pet select <nom>` ou `.pet select <num>`"]));

      const userPets = pets[userId] || [];
      if (userPets.length === 0) return send(UI(["❌ Tu n'as aucun pet."]));

      let petIndex = isNaN(identifier)
        ? userPets.findIndex(p => p.name.toLowerCase() === identifier.toLowerCase())
        : parseInt(identifier) - 1;

      if (petIndex < 0 || petIndex >= userPets.length) {
        const petList = userPets.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
        return send(UI([`❌ Pet "${identifier}" introuvable.`, "---", "**Tes pets:**", petList]));
      }

      const pet = userPets[petIndex];
      if (!pet.vivant) return send(UI([`❌ ${pet.name} est mort. Ressuscite-le d'abord.`]));

      selectedPets[userId] = petIndex;
      saveData(SELECTED_PETS_FILE, selectedPets);

      const emoji = PET_TYPES[pet.type]?.emoji || "❓";
      return send(UI([`✅ ${emoji} **${pet.name}** sélectionné comme pet actif!`, "💡 Toutes les commandes utiliseront ce pet."]));
    }

    if (sub === "stats" || sub === "info") {
      const identifier = args[1];
      if (!identifier) return send(UI(["❌ Usage: `.pet stats <nom>` ou `.pet stats <num>`"]));

      const userPets = pets[userId] || [];
      if (userPets.length === 0) return send(UI(["❌ Tu n'as aucun pet."]));

      let pet = isNaN(identifier)
        ? userPets.find(p => p.name.toLowerCase() === identifier.toLowerCase())
        : userPets[parseInt(identifier) - 1];

      if (!pet) {
        const petList = userPets.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
        return send(UI([`❌ Pet "${identifier}" introuvable.`, "---", "**Tes pets:**", petList]));
      }

      const petData = PET_TYPES[pet.type];
      const emoji = petData?.emoji || "❓";
      const raretesEmojis = { COMMUN: "⚪", "PEU COMMUN": "🟢", RARE: "🔵", EPIQUE: "🟣", LEGENDAIRE: "🟡", MYTHIQUE: "🔴", DIVIN: "💎" };
      const victoires = pet.victoires || 0;
      const defaites = pet.defaites || 0;
      const totalCombats = victoires + defaites;
      const winRate = totalCombats > 0 ? Math.round((victoires / totalCombats) * 100) : 0;
      const str = pet.str || pet.atk || 0;
      const spd = pet.spd || 5;
      const int = pet.int || 5;
      const hp = pet.maxHp || 100;
      const def = pet.def || 0;
      const power = str + spd + int + hp + def;

      let msg = [
        `${emoji} **${pet.name}** ${pet.vivant ? "❤️" : "💀 Mort"} | Niv.${pet.level}/${petData?.maxLevel || "?"}`,
        "---",
        `❤️ ${makeBar(pet.hp, pet.maxHp)}`,
        `✨ ${makeBar(pet.exp || 0, pet.level * 100)}`,
        `🍗 ${makeBar(pet.faim, 100)} | 💧 ${makeBar(pet.soif, 100)}`,
        `⚡ ${makeBar(pet.energie || 100, 100)}`,
        "---",
        `💪 **STR**: ${str} | 💨 **SPD**: ${spd} | 🧠 **INT**: ${int}`,
        `🛡️ **DEF**: ${def} | ❤️ **PV**: ${hp}`,
        `💥 **PUISSANCE**: ${power.toLocaleString()} | ${raretesEmojis[petData?.rarity] || "⚪"} ${petData?.rarity}`,
        `🔥 **Type**: ${pet.type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} | 🔁 Revives: ${pet.reviveCount || 0}`,
        "---",
        `🏆 **Combats**: ${victoires}V / ${defaites}D | 📈 **Winrate**: ${winRate}%`,
        `🧬 **Évolution**: ${petData?.evolve ? (pet.level >= petData.maxLevel ? "✅ Prêt!" : `Niv.${petData.maxLevel} requis`) : "❌ Non évoluable"}`
      ];
      if (petData?.evolve) {
        const evo = PET_TYPES[petData.evolve];
        msg.push(` → ${evo.emoji} ${petData.evolve.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}`);
      }
      return send(UI(msg));
    }

    if (sub === "view") {
      const userPets = pets[userId] || [];
      if (userPets.length === 0) return send(UI(["❌ T'as aucun pet. Tape `.pet pets`"]));

      const petName = args.slice(1).join(' ').toLowerCase();
      let pet = petName
        ? userPets.find(p => p.name.toLowerCase() === petName)
        : userPets[selectedPets[userId] ?? 0] || userPets[0];

      if (!pet) return send(UI([`❌ Pet "${petName}" introuvable`, "Tes pets: `.pet list`"]));

      const maxLevel = PET_TYPES[pet.type]?.maxLevel || 100;
      const power = (pet.atk || 0) + (pet.str || 0) + (pet.def || 0) + (pet.spd || 0) + (pet.int || 0) + (pet.maxHp || 100);
      const expMax = pet.level * 100;
      const raretes = { COMMUN: "⚪", "PEU COMMUN": "🟢", RARE: "🔵", EPIQUE: "🟣", LEGENDAIRE: "🟡", MYTHIQUE: "🔴", DIVIN: "💎" };
      const rarity = raretes[pet.rarity] || "⚪";
      const petData = PET_TYPES[pet.type];
      const petEmoji = petData?.emoji || "❓";
      const moodEmoji = (pet.bonheur || 100) >= 90 ? "😍" : (pet.bonheur || 100) >= 70 ? "😊" : (pet.bonheur || 100) >= 50 ? "😐" : "😟";
      const date = pet.acheteLe ? new Date(pet.acheteLe).toLocaleDateString("fr-FR") : "Inconnu";

      let msg = [
        "🖼️ 𝖯𝖤𝖳 𝖢𝖠𝖱𝖣𝖤 🖼️",
        "╔══════════╗",
        `║ ${petEmoji}🌙 🌙 ║`,
        "║ (★ - ★) ║",
        `║${pet.name.toUpperCase().padStart(7).padEnd(10)}║`,
        "╚══════════╝",
        `⚗️𝐣𝐨𝐛 ⭐ ${(selectedPets[userId] === userPets.indexOf(pet)) ? 'ACTIF' : 'INACTIF'}`,
        `${rarity} ${petData?.rarity || ""} | ${petEmoji}`,
        "─────────────────────",
        `📊 Niveau ${pet.level}/${maxLevel} ${makeBar(pet.exp || 0, expMax)}`,
        `💫 EXP: ${pet.exp || 0}/${expMax}`,
        `⚡ Puissance: ${power}`,
        "─────────────────────",
        `❤️ PV: ${makeBar(pet.hp, pet.maxHp)} ${pet.hp}/${pet.maxHp}`,
        `🍖 Faim: ${makeBar(pet.faim || 100, 100)} ${pet.faim || 100}/100`,
        `💧 Soif: ${makeBar(pet.soif || 100, 100)} ${pet.soif || 100}/100`,
        `😊 Humeur: ${makeBar(pet.bonheur || 100, 100)} ${pet.bonheur || 100}/100`,
        `⚡ Énergie: ${makeBar(pet.energie || 100, 100)} ${pet.energie || 100}/100`,
        "─────────────────────",
        `🏆 Combats: ${pet.combats || 0} | 🥇 Victoires: ${pet.victoires || 0}`,
        `𝖲𝗍𝖺𝗍𝗎𝗌: ${moodEmoji} | 𝖠𝖽𝗈𝗉𝗍𝖾́: ${date}`
      ];
      return send(UI(msg));
    }

    if (sub === "upgrade") {
      const isMax = args[1]?.toLowerCase() === "max";
      const petName = args.slice(isMax ? 2 : 1).join(' ').toLowerCase();
      if (!petName) return send(UI([`❌ Usage: \`.pet upgrade ${isMax ? "max " : ""}<nom>\``]));

      const userPets = pets[userId] || [];
      const pet = userPets.find(p => p.name.toLowerCase() === petName);
      if (!pet) return send(UI([`❌ Pet "${petName}" introuvable. \`.pet list\``]));

      const maxLevel = PET_TYPES[pet.type]?.maxLevel || 100;
      if (pet.level >= maxLevel) return send(UI([`✅ ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} est déjà niveau max ${maxLevel}`]));

      const cash = await getUserCash(userId);

      if (!isMax) {
        const cout = 1000n * BigInt(Math.pow(pet.level, 2));
        if (cash < cout) {
          const fCout = await formatNumber(cout);
          const fCash = await formatNumber(cash);
          return send(UI([`❌ Il te faut ${fCout}$ pour Niv${pet.level}→Niv${pet.level + 1}`, `💰 T'as: ${fCash}$`]));
        }
        await updateUserCash(userId, -cout);

        const oldLevel = pet.level;
        pet.level++;
        pet.exp = 0;
        pet.maxHp += 10;
        pet.hp = pet.maxHp;
        pet.atk = (pet.atk || 0) + 2;
        pet.str = (pet.str || 0) + 1;
        pet.def = (pet.def || 0) + 1;
        if (Math.random() < 0.5) pet.spd = (pet.spd || 0) + 1;
        if (Math.random() < 0.5) pet.int = (pet.int || 0) + 1;

        saveData(PETS_FILE, pets);
        const nextCost = 1000n * BigInt(Math.pow(pet.level, 2));
        const bar = "█".repeat(Math.floor(pet.level / 10)) + "░".repeat(10 - Math.floor(pet.level / 10));
        const fCout = await formatNumber(cout);
        const fCash = await formatNumber(cash - cout);
        const fNext = await formatNumber(nextCost);

        let msg = [
          "⬆️ **MONTEE DE NIVEAU** ⬆️",
          "---",
          `${PET_TYPES[pet.type]?.emoji || ""} **${pet.name}**`,
          `Niv${oldLevel} → Niv${pet.level} [${bar}]`,
          "---",
          `❤️ PV: ${pet.hp}/${pet.maxHp} (+10)`,
          `⚔️ ATK: ${pet.atk} (+2) | 💪 STR: ${pet.str} (+1)`,
          `🛡️ DEF: ${pet.def} (+1) | ⚡ SPD: ${pet.spd} | 🧠 INT: ${pet.int}`,
          "---",
          `💰 Coût: ${fCout}$`,
          `💵 Restant: ${fCash}$`,
          "---",
          pet.level < maxLevel ? `⬆️ → Niv${pet.level + 1}: ${fNext}$` : "🏆 **NIVEAU MAX ATTEINT**"
        ];
        return send(UI(msg));
      }

      const oldLevel = pet.level;
      let totalSpent = 0n;
      let levelsGained = 0;
      let statGain = 0;

      while (pet.level < maxLevel) {
        const cout = 1000n * BigInt(Math.pow(pet.level, 2));
        if (cash < totalSpent + cout) break;
        totalSpent += cout;
        pet.level++;
        levelsGained++;
        pet.maxHp += 10;
        pet.atk = (pet.atk || 0) + 2;
        pet.str = (pet.str || 0) + 1;
        pet.def = (pet.def || 0) + 1;
        statGain += 14;
        if (Math.random() < 0.5) { pet.spd = (pet.spd || 0) + 1; statGain++; }
        if (Math.random() < 0.5) { pet.int = (pet.int || 0) + 1; statGain++; }
      }

      await updateUserCash(userId, -totalSpent);
      pet.hp = pet.maxHp;
      pet.exp = 0;
      saveData(PETS_FILE, pets);

      const power = (pet.atk || 0) + (pet.str || 0) + (pet.def || 0) + (pet.spd || 0) + (pet.int || 0) + pet.maxHp;
      const fTotal = await formatNumber(totalSpent);
      const fCash = await formatNumber(cash - totalSpent);

      let msg = [
        "⬆️ **MONTEE DE NIVEAU MAX** 🚀",
        "---",
        `${PET_TYPES[pet.type]?.emoji || ""} **${pet.name}**`,
        `📊 Niveau: ${oldLevel} → ${pet.level}`,
        `🔢 Niveaux gagnés: ${levelsGained}`,
        `💰 Total dépensé: ${fTotal}$`,
        `💳 Restant: ${fCash}$`,
        `💪 Stats gagnés: +${statGain}`,
        `⚡ Nouvelle Puissance: ${power}`,
        "---"
      ];
      if (pet.level < maxLevel) {
        const nextCost = 1000n * BigInt(Math.pow(pet.level, 2));
        const fNext = await formatNumber(nextCost);
        msg.push(`⚠️ Arrêt: pas assez d'argent.`);
        msg.push(`⬆️ Prochain: Niv${pet.level}→Niv${pet.level + 1} = ${fNext}$`);
      } else {
        msg.push("🏆 **NIVEAU MAX ATTEINT!**");
        if (PET_TYPES[pet.type]?.evolve) {
          msg.push(`🔀 **PRET A EVOLUER!** Use: \`.pet evolve ${pet.name} <pierre>\``);
        }
      }
      return send(UI(msg));
    }

    if (sub === "rename") {
      const currentName = args[1];
      const newName = args.slice(2).join(' ');
      if (!currentName) return send(UI(["❌ Usage: `.pet rename <nom_actuel> <nouveau_nom>`"]));
      if (!newName) return send(UI(["❌ Spécifie le nouveau nom. Ex: `.pet rename dog12 Cerbère`"]));
      if (newName.length > 20) return send(UI(["❌ Nom trop long. Max 20 caractères."]));
      if (!/^[a-zA-Z0-9\s]+$/.test(newName)) return send(UI(["❌ Nom invalide. Lettres, chiffres et espaces uniquement."]));

      const userPets = pets[userId] || [];
      if (userPets.length === 0) return send(UI(["❌ Tu n'as aucun pet."]));

      const petIndex = userPets.findIndex(p => p.name.toLowerCase() === currentName.toLowerCase());
      if (petIndex === -1) {
        const petList = userPets.map(p => `• ${p.name}`).join("\n");
        return send(UI([`❌ Pet "${currentName}" introuvable.`, "---", "**Tes pets:**", petList]));
      }
      if (userPets.some((p, i) => i !== petIndex && p.name.toLowerCase() === newName.toLowerCase()))
        return send(UI([`❌ Tu as déjà un pet nommé "${newName}".`]));

      const oldName = userPets[petIndex].name;
      userPets[petIndex].name = newName.trim();
      saveData(PETS_FILE, pets);
      return send(UI([`✅ ${oldName} renommé en **${newName.trim()}**`]));
    }

    if (sub === "release") {
      const num = parseInt(args[1]) - 1;
      const pet = pets[userId]?.[num];
      if (!pet) return send(UI(["❌ Numéro invalide. Fais `.pet list`"]));

      const name = pet.name;
      pets[userId].splice(num, 1);
      if ((safe[userId].active || 0) >= pets[userId].length) safe[userId].active = 0;
      saveData(PETS_FILE, pets);
      saveData(SAFE_FILE, safe);
      return send(UI([`💔 Tu as relâché ${name}.`]));
    }

    if (sub === "safe") {
      const name = args.slice(1).join(' ');
      if (!name) return send(UI(["❌ `.pet safe <nom>` pour nommer ton coffre."]));
      safe[userId].names = name;
      saveData(SAFE_FILE, safe);
      return send(UI([`✅ Ton coffre s'appelle maintenant ${name}`]));
    }

    if (sub === "heal") {
      const num = parseInt(args[1]) - 1;
      const pet = pets[userId]?.[num];
      if (!pet) return send(UI(["❌ Numéro invalide. Fais `.pet list`"]));
      if (!pet.vivant) return send(UI([`❌ ${pet.name} est mort. Utilise \`.pet buy revive ${num + 1}\``]));

      const itemKey = args[2]?.toLowerCase();
      if (!itemKey) return send(UI([`❌ Spécifie un item: \`.pet heal ${num + 1} <item>\``, "Items soin: potion, super_potion, max_potion, elixir, elixir_divin"]));

      const item = ITEMS[itemKey];
      if (!item) return send(UI(["❌ Item introuvable."]));

      const eff = item[3];
      if (!eff?.hp) return send(UI([`❌ ${item[0]} n'est pas un item de soin.`]));

      const inventaire = inventories[userId] || {};
      if (!inventaire[itemKey] || inventaire[itemKey] <= 0) {
        const fPrice = await formatNumber(item[1]);
        return send(UI([`❌ Tu n'as pas ${item[0]}`, `💡 Achète-en avec \`.pet buy ${itemKey} ${num + 1}\` (${fPrice}$)`]));
      }

      inventaire[itemKey]--;
      if (inventaire[itemKey] === 0) delete inventaire[itemKey];
      inventories[userId] = inventaire;

      let healAmount = 0;
      let msg = [`✅ ${pet.name} soigné avec ${item[0]}`];

      if (eff.hp === "full") {
        healAmount = pet.maxHp - pet.hp;
        pet.hp = pet.maxHp;
      } else {
        healAmount = Math.min(eff.hp, pet.maxHp - pet.hp);
        pet.hp += healAmount;
      }

      if (eff.energy) pet.energie = Math.min(100, (pet.energie || 100) + eff.energy);
      if (eff.hunger) pet.faim = Math.min(100, pet.faim + eff.hunger);
      if (eff.thirst) pet.soif = Math.min(100, pet.soif + eff.thirst);
      if (eff.maxHp) { pet.maxHp += eff.maxHp; pet.hp += eff.maxHp; }
      if (eff.str) pet.str = (pet.str || pet.atk) + eff.str;
      if (eff.spd) pet.spd = (pet.spd || 5) + eff.spd;
      if (eff.int) pet.int = (pet.int || 5) + eff.int;

      msg.push(`💚 +${healAmount} PV`);
      msg.push("---");
      msg.push(`❤️ ${makeBar(pet.hp, pet.maxHp)}`);
      msg.push(`🍗 ${makeBar(pet.faim, 100)} | 💧 ${makeBar(pet.soif, 100)}`);
      msg.push(`⚡ ${makeBar(pet.energie || 100, 100)}`);
      msg.push(`💪 STR: ${pet.str} | 💨 SPD: ${pet.spd} | 🧠 INT: ${pet.int}`);

      saveData(PETS_FILE, pets);
      saveData(INVENTORIES_FILE, inventories);
      return send(UI(msg));
    }

    if (["feed", "water", "drink"].includes(sub)) {
      const identifier = args[1];
      if (!identifier) return send(UI([`❌ Usage: \`.pet ${sub} <nom>\` ou \`.pet ${sub} <num>\``]));

      const userPets = pets[userId] || [];
      let petIndex = isNaN(identifier)
        ? userPets.findIndex(p => p.name.toLowerCase() === identifier.toLowerCase())
        : parseInt(identifier) - 1;

      const pet = userPets[petIndex];
      if (!pet) return send(UI([`❌ Pet "${identifier}" introuvable. Fais \`.pet pets\``]));
      if (!pet.vivant) return send(UI([`❌ ${pet.name} est mort. Ressuscite-le d'abord.`]));

      const inventaire = inventories[userId] || {};
      let itemUsed = null;
      let healAmount = 0;

      if (sub === "feed") {
        const foods = ["steak", "poisson", "pomme", "pain"];
        for (const food of foods) {
          if (inventaire[food] && inventaire[food] > 0) {
            itemUsed = food;
            healAmount = ITEMS[food]?.[3]?.hunger || 50;
            inventaire[food]--;
            break;
          }
        }
        if (!itemUsed) return send(UI(["❌ Pas de nourriture dans ton inventaire.", "Achète avec `.pet buy steak` ou `.pet buy poisson`"]));
        pet.faim = Math.min(100, pet.faim + healAmount);
      } else {
        const drinks = ["eau", "lait", "the"];
        for (const drink of drinks) {
          if (inventaire[drink] && inventaire[drink] > 0) {
            itemUsed = drink;
            healAmount = ITEMS[drink]?.[3]?.thirst || 50;
            inventaire[drink]--;
            break;
          }
        }
        if (!itemUsed) return send(UI(["❌ Pas de boisson dans ton inventaire.", "Achète avec `.pet buy eau` ou `.pet buy lait`"]));
        pet.soif = Math.min(100, pet.soif + healAmount);
      }

      if (inventaire[itemUsed] === 0) delete inventaire[itemUsed];
      inventories[userId] = inventaire;

      saveData(PETS_FILE, pets);
      saveData(INVENTORIES_FILE, inventories);

      const itemData = ITEMS[itemUsed];
      const emoji = itemData ? itemData[0].split(' ')[0] : (sub === "feed" ? "🍗" : "💧");
      return send(UI([`${emoji} ${pet.name} ${sub === "feed" ? "nourri" : "hydraté"} avec ${itemData ? itemData[0] : itemUsed}.`, `🍗 Faim: ${pet.faim}/100 | 💧 Soif: ${pet.soif}/100`]));
    }

    if (sub === "sleep") {
      const petName = args.slice(1).join(' ').toLowerCase();
      if (!petName) return send(UI(["❌ Usage: `.pet sleep <nom>`"]));

      const userPets = pets[userId] || [];
      const pet = userPets.find(p => p.name.toLowerCase() === petName);
      if (!pet) return send(UI([`❌ Pet "${petName}" introuvable`]));

      const now = Date.now();
      const dureeSommeil = 10 * 60 * 1000;

      if (pet.dort && now < pet.reveilA) {
        const remaining = Math.ceil((pet.reveilA - now) / 60000);
        return send(UI([`😴 ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} dort encore ${remaining}min`, `💤 Réveil: ${new Date(pet.reveilA).toLocaleTimeString("fr-FR")}`]));
      }

      if ((pet.energie || 100) >= 100) return send(UI([`⚡ ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} a déjà full énergie`, "💤 Pas besoin de dormir"]));

      pet.dort = true;
      pet.reveilA = now + dureeSommeil;
      pet.peutCombattre = false;
      pet.peutTravailler = false;
      pet.peutExplorer = false;

      saveData(PETS_FILE, pets);

      let msg = [
        "😴 **DODO** 😴",
        "---",
        `${PET_TYPES[pet.type]?.emoji || ""} **${pet.name}** s'endort...`,
        "⏰ Durée: 10 minutes",
        `⚡ Énergie: ${pet.energie || 0}/100 → 100/100 au réveil`,
        "😊 Humeur: +20 au réveil",
        "---",
        "❌ **Indisponible pendant le dodo:**",
        "• Ne peut pas se battre",
        "• Ne peut pas travailler",
        "• Ne peut pas explorer",
        "---",
        `⏰ Réveil à: ${new Date(pet.reveilA).toLocaleTimeString("fr-FR")}`
      ];
      return send(UI(msg));
    }

    if (sub === "play") {
      const petName = args.slice(1).join(' ').toLowerCase();
      if (!petName) return send(UI(["❌ Usage: `.pet play <nom>`"]));

      const userPets = pets[userId] || [];
      const pet = userPets.find(p => p.name.toLowerCase() === petName);
      if (!pet) return send(UI(["❌ Pet introuvable"]));
      if ((pet.energie || 100) < 10) return send(UI([`😴 ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} est trop fatigué pour jouer`]));

      const gainHumeur = Math.floor(Math.random() * 11) + 15;
      pet.bonheur = Math.min(100, (pet.bonheur || 100) + gainHumeur);
      pet.energie = Math.max(0, (pet.energie || 100) - 8);

      saveData(PETS_FILE, pets);

      let msg = [
        "🎾 **MOMENT DE JEU** 🎾",
        "---",
        `${PET_TYPES[pet.type]?.emoji || ""} **${pet.name}** s'amuse avec toi !`,
        `😊 Humeur: +${gainHumeur} → ${pet.bonheur}/100`,
        `⚡ Énergie: -8 → ${pet.energie}/100`
      ];
      if (pet.bonheur >= 80) msg.push("💚 Ton pet est super heureux ! +10% dégâts");
      return send(UI(msg));
    }

    if (sub === "quest") {
      const petName = args.slice(1).join(' ').toLowerCase();
      if (!petName) return send(UI(["❌ Usage: `.pet quest <nom>`"]));

      const userPets = pets[userId] || [];
      const pet = userPets.find(p => p.name.toLowerCase() === petName);
      if (!pet) return send(UI([`❌ Pet "${petName}" introuvable`]));

      if (pet.dort && Date.now() < pet.reveilA) {
        const remaining = Math.ceil((pet.reveilA - Date.now()) / 60000);
        return send(UI([`😴 ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} dort encore ${remaining}min`]));
      }

      const now = Date.now();
      const cooldownQuete = 12 * 60 * 60 * 1000;
      const timeoutQuete = 24 * 60 * 60 * 1000;

      if (!pet.queteData) pet.queteData = { derniereQuete: 0, streak: 0, totalComplete: 0 };
      if (pet.queteData.derniereQuete && now - pet.queteData.derniereQuete > timeoutQuete) pet.queteData.streak = 0;

      if (pet.queteData.derniereQuete && now - pet.queteData.derniereQuete < cooldownQuete) {
        const remaining = Math.ceil((cooldownQuete - (now - pet.queteData.derniereQuete)) / 3600000);
        return send(UI([`⏰ ${PET_TYPES[pet.type]?.emoji || ""} ${pet.name} a déjà fait une quête`, `🕒 Prochaine quête dans ${remaining}h`, `🔥 Streak actuel: ${pet.queteData.streak}/3`]));
      }

      const quetes = [
        { nom: "Forêt Mystique", desc: "Explorer la forêt hantée", emoji: "🌲" },
        { nom: "Grotte aux Cristaux", desc: "Miner des cristaux rares", emoji: "💎" },
        { nom: "Temple Ancien", desc: "Résoudre les énigmes", emoji: "🏛️" }
      ];
      const quete = quetes[Math.floor(Math.random() * quetes.length)];

      pet.queteData.streak++;
      pet.queteData.derniereQuete = now;
      pet.queteData.totalComplete++;

      let money, exp, isJackpot = false;

      if (pet.queteData.streak >= 3 && Math.random() < 0.3) {
        money = 500000000000n;
        exp = 200;
        isJackpot = true;
        pet.queteData.streak = 0;
      } else {
        money = BigInt(Math.floor(Math.random() * 50000000000) + 3000000000);
        exp = Math.floor(Math.random() * 150) + 50;
      }

      pet.exp = (pet.exp || 0) + exp;
      pet.bonheur = Math.min(100, (pet.bonheur || 100) + 10);
      pet.energie = Math.max(0, (pet.energie || 100) - 15);
      await updateUserCash(userId, money);

      let leveledUp = false;
      while (pet.exp >= pet.level * 100 && pet.level < (PET_TYPES[pet.type]?.maxLevel || 100)) {
        pet.exp -= pet.level * 100;
        pet.level++;
        leveledUp = true;
      }

      saveData(PETS_FILE, pets);
      const fMoney = await formatNumber(money);

      let msg = [`${quete.emoji} **QUETE ACCOMPLIE** ${quete.emoji}`, "---"];
      msg.push(`${PET_TYPES[pet.type]?.emoji || ""} **${pet.name}** - ${quete.nom}`);
      msg.push(`📜 ${quete.desc}`);
      msg.push("---");
      if (isJackpot) {
        msg.push("🎆 **JACKPOT STREAK x3** 🎆");
        msg.push(`💰 +${fMoney}$`);
        msg.push(`💫 +${exp} EXP`);
        msg.push("🔥 Streak reset: 0/3");
      } else {
        msg.push(`💰 Récompense: ${fMoney}$`);
        msg.push(`💫 EXP: +${exp}`);
        msg.push(`🔥 Streak: ${pet.queteData.streak}/3`);
        if (pet.queteData.streak === 2) msg.push("⚡ Prochaine quête = Chance JACKPOT!");
      }
      msg.push("---");
      msg.push(`⚡ Énergie: ${pet.energie}/100 (-15)`);
      msg.push(`😊 Humeur: ${pet.bonheur}/100 (+10)`);
      if (leveledUp) msg.push(`⬆️ **MONTEE DE NIVEAU!** Niv${pet.level}`);
      msg.push(`📊 Quêtes totales: ${pet.queteData.totalComplete}`);
      msg.push(`⏰ Prochaine quête dans 12h`);
      return send(UI(msg));
    }

    if (sub === "train") {
      const num = parseInt(args[1]) - 1;
      const pet = pets[userId]?.[num];
      if (!pet) return send(UI(["❌ Numéro invalide. Fais `.pet list`"]));
      if (!pet.vivant) return send(UI([`❌ ${pet.name} est mort.`]));
      if (pet.level >= PET_TYPES[pet.type].maxLevel) return send(UI(["❌ Niveau max atteint."]));

      if (pet.dort && Date.now() >= pet.reveilA) {
        pet.dort = false;
        pet.energie = 100;
        pet.bonheur = Math.min(100, (pet.bonheur || 100) + 20);
        pet.peutCombattre = true;
        pet.peutTravailler = true;
        pet.peutExplorer = true;
      }
      if (pet.dort) return send(UI([`😴 ${pet.name} dort. Attends son réveil.`]));

      const arg2 = args[2]?.toLowerCase();
      let sessions = 1;
      let aItemEntrainement = false;

      if (arg2 === "max") {
        sessions = 5;
      } else if (arg2 === "train") {
        aItemEntrainement = true;
        sessions = parseInt(args[3]) || 1;
      } else if (arg2) {
        sessions = parseInt(arg2) || 1;
      }
      sessions = Math.min(Math.max(sessions, 1), 5);

      const coutEnergie = 30 * sessions;
      const coutFaim = 25 * sessions;
      const coutSoif = 15 * sessions;

      if ((pet.energie || 100) < coutEnergie) return send(UI([`❌ ${pet.name} est trop fatigué. Il faut ${coutEnergie} énergie pour ${sessions} session(s). Actuel: ${pet.energie || 100}/100`]));
      if (pet.faim < coutFaim) return send(UI([`❌ ${pet.name} a trop faim. Il faut ${coutFaim} faim pour ${sessions} session(s). Actuel: ${pet.faim}/100`]));

      let totalCost = 0n;
      const costs = [];
      for (let i = 0; i < sessions; i++) {
        const sessionCost = BigInt(Math.floor(Math.random() * 20001) + 10000);
        costs.push(sessionCost);
        totalCost += sessionCost;
      }

      const cash = await getUserCash(userId);
      if (cash < totalCost) {
        const fTotal = await formatNumber(totalCost);
        const fCash = await formatNumber(cash);
        return send(UI([`❌ Il te faut ${fTotal}$ pour ${sessions} session(s).`, `Coûts: ${costs.map(c => '$' + c.toString()).join(' + ')}`, `Solde: ${fCash}$`]));
      }
      await updateUserCash(userId, -totalCost);

      const multiplicateur = aItemEntrainement ? 2 : 1;
      const nomItem = aItemEntrainement ? "🏋️ Haltères" : "Entraînement normal";
      const petData = PET_TYPES[pet.type];
      const bonusPet = {
        COMMUN: { str: 1, spd: 0, int: 0, hp: 3 },
        "PEU COMMUN": { str: 1, spd: 1, int: 0, hp: 4 },
        RARE: { str: 2, spd: 1, int: 0, hp: 5 },
        EPIQUE: { str: 2, spd: 2, int: 1, hp: 6 },
        LEGENDAIRE: { str: 3, spd: 2, int: 1, hp: 7 },
        MYTHIQUE: { str: 3, spd: 3, int: 2, hp: 8 },
        DIVIN: { str: 4, spd: 3, int: 2, hp: 10 }
      };
      const bonus = bonusPet[petData.rarity] || bonusPet.COMMUN;

      let totalStr = 0, totalSpd = 0, totalInt = 0, totalHp = 0, totalXp = 0, levelUps = 0;

      pet.energie = Math.max(0, (pet.energie || 100) - coutEnergie);
      pet.faim = Math.max(0, pet.faim - coutFaim);
      pet.soif = Math.max(0, pet.soif - coutSoif);

      for (let i = 0; i < sessions; i++) {
        const gainStr = bonus.str * multiplicateur;
        const gainSpd = bonus.spd * multiplicateur;
        const gainInt = bonus.int * multiplicateur;
        const gainHp = bonus.hp * multiplicateur;

        pet.str = (pet.str || pet.atk) + gainStr;
        pet.spd = (pet.spd || 5) + gainSpd;
        pet.int = (pet.int || 5) + gainInt;
        pet.maxHp += gainHp;
        pet.hp += gainHp;

        totalStr += gainStr;
        totalSpd += gainSpd;
        totalInt += gainInt;
        totalHp += gainHp;

        const baseXp = 5 + Math.floor(Math.random() * 11);
        const levelBon = Math.floor(pet.level * 0.5);
        const xpGain = (baseXp + levelBon) * multiplicateur;
        pet.exp = (pet.exp || 0) + xpGain;
        totalXp += xpGain;

        while (pet.exp >= pet.level * 100 && pet.level < petData.maxLevel) {
          pet.exp -= pet.level * 100;
          pet.level++;
          pet.maxHp += 10;
          pet.hp = pet.maxHp;
          pet.str += 2;
          pet.spd += 1;
          pet.int += 1;
          levelUps++;
          totalHp += 10;
          totalStr += 2;
          totalSpd += 1;
          totalInt += 1;
        }
      }

      saveData(PETS_FILE, pets);
      const fTotal = await formatNumber(totalCost);

      let msg = [
        `🏋️ ${pet.name} s'entraîne ${sessions} session(s)`,
        aItemEntrainement ? `📈 **Bonus x2** grâce aux ${nomItem}` : "",
        `💰 Coût: ${fTotal}$ (${costs.map(c => '$' + c.toString()).join(' + ')})`,
        "---",
        `💪 +${totalStr} STR | ⚡ +${totalSpd} SPD | 🧠 +${totalInt} INT`,
        `❤️ +${totalHp} PV Max | ✨ +${totalXp} EXP`,
        levelUps > 0 ? `🆙 **${levelUps} MONTEE DE NIVEAU!** Niv.${pet.level}` : "",
        `🎯 Bonus ${petData.rarity}: STR+${bonus.str} SPD+${bonus.spd} INT+${bonus.int} PV+${bonus.hp}/session`,
        "---",
        `❤️ ${makeBar(pet.hp, pet.maxHp)} | ✨ ${makeBar(pet.exp, pet.level * 100)}`,
        `🍗 ${makeBar(pet.faim, 100)} | 💧 ${makeBar(pet.soif, 100)}`,
        `⚡ ${makeBar(pet.energie, 100)}`,
        `💪 STR: ${pet.str} | 💨 SPD: ${pet.spd} | 🧠 INT: ${pet.int}`
      ];
      return send(UI(msg.filter(l => l !== "")));
    }

    if (sub === "battle") {
      const pet = getActivePet(pets[userId], userId, selectedPets);
      if (!pet) return send(UI(["❌ T'as pas de pet. Fais `.pet buy chiot`"]));
      if (!pet.vivant) return send(UI(["❌ Ton pet est mort... `.pet buy revive`"]));
      if (pet.hp <= 0) return send(UI(["❌ Ton pet est KO. Fais `.pet heal 1 potion`"]));
      if (pet.faim < 20 || pet.soif < 20) return send(UI(["❌ Ton pet a faim/soif. Nourris-le d'abord."]));

      if (pet.dort && Date.now() < pet.reveilA) {
        const remaining = Math.ceil((pet.reveilA - Date.now()) / 60000);
        return send(UI([`😴 ${pet.name} dort encore ${remaining}min`, "❌ Action impossible pendant le sommeil"]));
      }
      if (pet.dort && Date.now() >= pet.reveilA) {
        pet.dort = false;
        pet.energie = 100;
        pet.bonheur = Math.min(100, (pet.bonheur || 100) + 20);
        pet.peutCombattre = true;
        pet.peutTravailler = true;
        pet.peutExplorer = true;
      }

      const ennemis = Object.keys(PET_TYPES);
      const typeEnnemi = ennemis[Math.floor(Math.random() * ennemis.length)];
      const dataEnnemi = PET_TYPES[typeEnnemi];

      const ennemi = {
        nom: typeEnnemi.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        emoji: dataEnnemi.emoji,
        maxHp: dataEnnemi.baseHp,
        hp: dataEnnemi.baseHp,
        str: dataEnnemi.baseAtk,
        spd: 5,
        int: 5
      };

      const joueur = {
        nom: pet.name,
        maxHp: pet.maxHp || 100,
        hp: pet.hp,
        str: pet.str || pet.atk,
        spd: pet.spd || 5,
        int: pet.int || 5
      };

      let dmgBase = Math.round(joueur.maxHp * 0.34);
      let playerWins = 0;
      const xpGain = [];

      let r1dmg = dmgBase, r2dmg = dmgBase, r3dmg = dmgBase;
      let r1crit = false, r2crit = false, r3crit = false;

      if (joueur.str >= ennemi.str * 2) { r1dmg *= 2; r1crit = true; }
      if (joueur.str > ennemi.str) {
        ennemi.hp -= r1dmg; playerWins++;
        pet.strXp = (pet.strXp || 0) + 5; xpGain.push("💪+5 STR");
      } else if (joueur.str < ennemi.str) { joueur.hp -= r1dmg; }

      if (joueur.spd >= ennemi.spd * 2) { r2dmg *= 2; r2crit = true; }
      if (joueur.spd > ennemi.spd) {
        ennemi.hp -= r2dmg; playerWins++;
        pet.spdXp = (pet.spdXp || 0) + 5; xpGain.push("💨+5 SPD");
      } else if (joueur.spd < ennemi.spd) { joueur.hp -= r2dmg; }

      if (joueur.int >= ennemi.int * 2) { r3dmg *= 2; r3crit = true; }
      if (joueur.int > ennemi.int) {
        ennemi.hp -= r3dmg; playerWins++;
        pet.intXp = (pet.intXp || 0) + 5; xpGain.push("🧠+5 INT");
      } else if (joueur.int < ennemi.int) { joueur.hp -= r3dmg; }

      joueur.hp = Math.max(0, joueur.hp);
      ennemi.hp = Math.max(0, ennemi.hp);
      pet.hp = joueur.hp;

      if (pet.hp <= 0) { pet.vivant = false; }

      pet.defaites = pet.defaites || 0;
      pet.victoires = pet.victoires || 0;
      pet.combats = (pet.combats || 0) + 1;

      let log = [
        `⚔️ **COMBAT**: ${joueur.nom} VS ${ennemi.nom} ${ennemi.emoji}`,
        "---",
        "**Round 1 - Force** 💪",
        `${joueur.str} VS ${ennemi.str} → ${joueur.str > ennemi.str ? 'Gagné' : joueur.str < ennemi.str ? 'Perdu' : 'Egalité'} ${r1crit ? 'CRIT! ' : ''}${joueur.str !== ennemi.str ? r1dmg + 'DMG' : ''}`,
        "**Round 2 - Vitesse** 💨",
        `${joueur.spd} VS ${ennemi.spd} → ${joueur.spd > ennemi.spd ? 'Gagné' : joueur.spd < ennemi.spd ? 'Perdu' : 'Egalité'} ${r2crit ? 'CRIT! ' : ''}${joueur.spd !== ennemi.spd ? r2dmg + 'DMG' : ''}`,
        "**Round 3 - Intelligence** 🧠",
        `${joueur.int} VS ${ennemi.int} → ${joueur.int > ennemi.int ? 'Gagné' : joueur.int < ennemi.int ? 'Perdu' : 'Egalité'} ${r3crit ? 'CRIT! ' : ''}${joueur.int !== ennemi.int ? r3dmg + 'DMG' : ''}`,
        "---",
        "**PV Final**",
        `${joueur.nom}: ${makeBar(joueur.hp, joueur.maxHp)} ${pet.hp <= 0 ? '💀 MORT' : ''}`,
        `${ennemi.nom}: ${makeBar(ennemi.hp, ennemi.maxHp)} ${ennemi.hp <= 0 ? '💀 MORT' : ''}`,
        "---"
      ];
      if (xpGain.length) log.push(`**Gains Stat**: ${xpGain.join(' ')}`);

      pet.xp = pet.xp || 0;

      if (playerWins >= 2 || ennemi.hp <= 0) {
        await updateUserCash(userId, 10000000000n);
        pet.xp += 200;
        pet.victoires += 1;
        const fCash = await formatNumber(await getUserCash(userId));
        log.push(`🏆 **VICTOIRE ${playerWins}/3** +10 000 000 000$ +200 XP`);
        log.push(`Solde: ${fCash}$ | XP: ${pet.xp}`);
      } else {
        await updateUserCash(userId, -50000000n);
        pet.xp += 25;
        pet.defaites += 1;
        const fCash = await formatNumber(await getUserCash(userId));
        log.push(`💀 **DEFAITE ${playerWins}/3** -50 000 000$ +25 XP`);
        log.push(`Solde: ${fCash}$ | XP: ${pet.xp}`);
      }

      if (pet.hp <= 0) log.push(`☠️ ${pet.name} est mort au combat... Utilise \`.pet buy revive ${pets[userId].indexOf(pet) + 1}\``);

      saveData(PETS_FILE, pets);
      return send(UI(log));
    }

    if (sub === "explore" || sub === "work") {
      const num = parseInt(args[1]) - 1;
      const pet = pets[userId]?.[num];
      if (!pet) return send(UI([`❌ Utilise: \`.pet ${sub} <num>\``]));
      if (!pet.vivant) return send(UI(["❌ Ton pet est mort... `.pet buy revive`"]));
      if (pet.faim < 20 || pet.soif < 20) return send(UI(["❌ Ton pet a faim/soif. Nourris-le."]));
      if (pet.hp <= 0) return send(UI(["❌ Ton pet est KO."]));

      if (pet.dort && Date.now() < pet.reveilA) {
        const remaining = Math.ceil((pet.reveilA - Date.now()) / 60000);
        return send(UI([`😴 ${pet.name} dort encore ${remaining}min`, "❌ Action impossible pendant le sommeil"]));
      }

      const gain = BigInt(Math.floor(Math.random() * 100000000000) + 569000000000);
      const expGain = Math.floor(Math.random() * 2500) + 1000;

      await updateUserCash(userId, gain);
      pet.exp = (pet.exp || 0) + expGain;
      pet.faim = Math.max(0, pet.faim - 30);
      pet.soif = Math.max(0, pet.soif - 10);
      pet.energie = Math.max(0, (pet.energie || 100) - 20);

      let reply = [
        `✅ ${pet.name} a ${sub === "explore" ? "exploré" : "travaillé"} et trouvé ${await formatNumber(gain)}$ +${expGain} EXP`,
        "---",
        `❤️ ${makeBar(pet.hp, pet.maxHp)}`,
        `🍗 ${makeBar(pet.faim, 100)}`,
        `💧 ${makeBar(pet.soif, 100)}`,
        `⚡ ${makeBar(pet.energie, 100)}`,
        "---"
      ];

      if (Math.random() < 0.1 && sub === "explore") {
        const rarete = "PEU COMMUN";
        const availablePets = Object.keys(PET_TYPES).filter(t => PET_TYPES[t].rarity === rarete);
        if (availablePets.length > 0) {
          const newType = availablePets[Math.floor(Math.random() * availablePets.length)];
          const newPetData = PET_TYPES[newType];
          const newPet = createNewPet(newType, newPetData);
          pets[userId].push(newPet);
          reply.push(`🎁 ${pet.name} a ramené un compagnon! ${newPetData.emoji} ${newPet.name} [${rarete}]`);
        }
      }

      if ((pet.exp || 0) >= pet.level * 100 && pet.level < PET_TYPES[pet.type].maxLevel) {
        pet.exp -= pet.level * 100;
        pet.level++;
        pet.str = (pet.str || pet.atk) + 2;
        pet.atk = pet.str;
        pet.maxHp += 5;
        pet.hp = pet.maxHp;
        reply.push(`🎉 ${pet.name} passe niveau ${pet.level}! +2 STR +5 PV Max`);
      }

      saveData(PETS_FILE, pets);
      return send(UI(reply));
    }

    if (sub === "inventory" || sub === "inv") {
      const inv = inventories[userId] || {};
      const keys = Object.keys(inv).filter(k => inv[k] > 0);

      if (keys.length === 0) {
        return send(UI(["📦 **INVENTAIRE VIDE**", "---", "💡 Achète des items avec `.pet buy <item>`", "Ex: `.pet buy steak 1` | `.pet buy eau 1`"]));
      }

      let msg = ["📦 **TON INVENTAIRE**", "---"];
      keys.forEach(key => {
        const itemData = ITEMS[key];
        const emoji = itemData ? itemData[0].split(' ')[0] : "📦";
        const nom = itemData ? itemData[0] : key;
        msg.push(`${emoji} **${nom}** x${inv[key]}`);
      });
      msg.push("---");
      msg.push(`💡 Total: ${keys.length} types d'items`);
      msg.push("`.pet use <item> <pet>` pour utiliser");
      return send(UI(msg));
    }

    if (sub === "evolve") {
      const identifier = args[1];
      const pierreNom = args.slice(2).join(' ').toLowerCase();

      if (!identifier) return send(UI(["❌ Usage: `.pet evolve <nom> <pierre>`", "Pierres:", "❄️ givre - Niv.27+", "⚡ foudre - Niv.24+", "🔥 feu - Niv.20+", "🌑 ombre - Niv.17+", "💎 divine - Tous niv."]));
      if (!pierreNom) return send(UI(["❌ Spécifie la pierre d'évolution."]));

      const userPets = pets[userId] || [];
      let petIndex = isNaN(identifier)
        ? userPets.findIndex(p => p.name.toLowerCase() === identifier.toLowerCase())
        : parseInt(identifier) - 1;

      const pet = userPets[petIndex];
      if (!pet) return send(UI([`❌ Pet "${identifier}" introuvable.`]));
      if (!pet.vivant) return send(UI([`❌ ${pet.name} est mort. Ressuscite-le d'abord.`]));

      const evoluerVers = PET_TYPES[pet.type].evolve;
      if (!evoluerVers) return send(UI(["❌ Ce pet ne peut pas évoluer."]));
      if (pet.level < PET_TYPES[pet.type].maxLevel) return send(UI([`❌ Niveau ${PET_TYPES[pet.type].maxLevel} requis. Actuel: Niv.${pet.level}`]));

      const pierresEvolution = {
        "givre": { nom: "❄️ Pierre Givre", cout: 5000000000000n, minLv: 27, power: 1000, int: 460, str: 5 },
        "foudre": { nom: "⚡ Pierre Foudre", cout: 8000000000000n, minLv: 24, power: 1000, str: 7 },
        "feu": { nom: "🔥 Pierre Feu", cout: 12000000000000n, minLv: 20, power: 1050, hp: 35, str: 10, spd: 2 },
        "ombre": { nom: "🌑 Pierre Ombre", cout: 20000000000000n, minLv: 17, power: 1746, str: 12, spd: 3 },
        "divine": { nom: "💎 Pierre Divine", cout: 50000000000000n, minLv: 1, power: 3000, str: 20, spd: 10, int: 10 }
      };

      const pierre = pierresEvolution[pierreNom];
      if (!pierre) return send(UI(["❌ Pierre invalide.", "Pierres dispo:", "❄️ givre - Niv.27+ 5Qa", "⚡ foudre - Niv.24+ 8Qa", "🔥 feu - Niv.20+ 12Qa", "🌑 ombre - Niv.17+ 20Qa", "💎 divine - Tous niv. 50Qa"]));
      if (pet.level < pierre.minLv) return send(UI([`❌ ${pierre.nom} requiert Niv.${pierre.minLv}+. Actuel: Niv.${pet.level}`]));

      const cash = await getUserCash(userId);
      if (cash < pierre.cout) {
        const fCout = await formatNumber(pierre.cout);
        const fCash = await formatNumber(cash);
        return send(UI([`❌ ${pierre.nom} coûte ${fCout}$.`, `💰 Solde: ${fCash}$`]));
      }
      await updateUserCash(userId, -pierre.cout);

      const newType = PET_TYPES[evoluerVers];
      const oldEmoji = PET_TYPES[pet.type].emoji;

      const oldAtk = pet.atk || pet.str || 0;
      const oldStr = pet.str || pet.atk || 0;
      const oldSpd = pet.spd || 5;
      const oldInt = pet.int || 5;
      const oldDef = pet.def || 0;
      const oldMaxHp = pet.maxHp;
      const oldPower = oldStr + oldSpd + oldInt + oldMaxHp + oldDef;

      pet.type = evoluerVers;
      pet.level = 1;
      pet.exp = 0;
      pet.maxHp += 50;
      pet.hp = pet.maxHp;
      pet.str = (pet.str || pet.atk || 0) + 15;
      pet.def = (pet.def || 0) + 5;

      const statsCount = 5;
      const baseShare = Math.floor(pierre.power / statsCount);
      const remainder = pierre.power % statsCount;

      pet.str += baseShare + (pierre.str || 0);
      pet.def += baseShare;
      pet.spd = (pet.spd || 5) + baseShare + (pierre.spd || 0);
      pet.int = (pet.int || 5) + baseShare + (pierre.int || 0);
      pet.maxHp += baseShare + (pierre.hp || 0);

      const priority = ["str", "maxHp", "def", "spd", "int"];
      for (let i = 0; i < remainder; i++) pet[priority[i]]++;

      pet.hp = pet.maxHp;
      pet.atk = pet.str;
      pet.name = evoluerVers.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const newPower = pet.str + pet.spd + pet.int + pet.maxHp + pet.def;
      const fCout = await formatNumber(pierre.cout);

      saveData(PETS_FILE, pets);

      let msg = [
        `🎆 **EVOLUTION!** ${newType.emoji}`,
        `💎 **Pierre**: ${pierre.nom} (-${fCout}$)`,
        "---",
        `${oldEmoji} → ${newType.emoji} **${pet.name}**`,
        `💥 **Puissance**: ${oldPower.toLocaleString()} → ${newPower.toLocaleString()} (+${(newPower - oldPower).toLocaleString()})`,
        "---",
        `⚔️ ATK: ${oldAtk} → ${pet.atk} (+${pet.atk - oldAtk})`,
        `💪 STR: ${oldStr} → ${pet.str} (+${pet.str - oldStr})`,
        `🛡️ DEF: ${oldDef} → ${pet.def} (+${pet.def - oldDef})`,
        `💨 SPD: ${oldSpd} → ${pet.spd} (+${pet.spd - oldSpd})`,
        `🧠 INT: ${oldInt} → ${pet.int} (+${pet.int - oldInt})`,
        `❤️ PV: ${oldMaxHp} → ${pet.maxHp} (+${pet.maxHp - oldMaxHp})`,
        "---",
        `🔁 Niveau reset: Niv.1/${newType.maxLevel}`
      ];
      return send(UI(msg));
    }

    if (sub === "gift") {
      const mention = args[1];
      const type = args[2]?.toLowerCase();
      const targetName = args.slice(3).join(' ').toLowerCase();

      if (!mention || !mention.startsWith('@')) {
        return send(UI(["❌ Utilisation:", "`.pet gift @user pet <nom>`", "`.pet gift @user item <nom>`", "`.pet gift @user food <nom>`", "`.pet gift @user money <montant>`"]));
      }

      const targetId = mention.replace(/[<@!>]/g, '');
      if (targetId === userId) return send(UI(["❌ Tu peux pas te faire un cadeau à toi-même"]));

      if (!pets[targetId]) pets[targetId] = [];
      if (!inventories[targetId]) inventories[targetId] = {};
      initUserSafe(safe, targetId);

      if (userId !== OWNER_ID && safe[userId].giftCount >= 6) {
        return send(UI(["❌ Limite atteinte! Tu as déjà utilisé tes 6 cadeaux"]));
      }

      if (type === "pet") {
        const foundType = Object.keys(PET_TYPES).find(k =>
          k === targetName.replace(/ /g, '_') || k.replace(/_/g, ' ') === targetName
        );
        if (!foundType) return send(UI(["❌ Pet introuvable. Liste: `.pet shop pets`"]));

        const petData = PET_TYPES[foundType];
        if (userId !== OWNER_ID) {
          const userPetIndex = pets[userId]?.findIndex(p => p.type === foundType && p.vivant);
          if (userPetIndex === -1) return send(UI([`❌ Tu n'as pas de ${foundType} vivant à offrir`]));
          pets[userId].splice(userPetIndex, 1);
        }

        const newPet = createNewPet(foundType, petData);
        pets[targetId].push(newPet);
        if (userId !== OWNER_ID) safe[userId].giftCount++;

        saveData(PETS_FILE, pets);
        saveData(SAFE_FILE, safe);

        const remaining = userId === OWNER_ID ? "∞" : 6 - safe[userId].giftCount;
        return send(UI([`🎁 Tu as offert ${petData.emoji} **${newPet.name}** [${petData.rarity}] à <@${targetId}>`, `📦 Cadeaux restants: ${remaining}/6`]));
      }

      if (type === "item" || type === "food") {
        const itemKey = targetName.replace(/ /g, '_');
        const item = ITEMS[itemKey];
        if (!item) return send(UI(["❌ Item introuvable"]));

        if (userId !== OWNER_ID) {
          const inv = inventories[userId] || {};
          if (!inv[itemKey] || inv[itemKey] <= 0) return send(UI([`❌ Tu n'as pas ${item[0]} à offrir`]));
          inv[itemKey]--;
          if (inv[itemKey] === 0) delete inv[itemKey];
          inventories[userId] = inv;
        }

        if (!inventories[targetId]) inventories[targetId] = {};
        inventories[targetId][itemKey] = (inventories[targetId][itemKey] || 0) + 1;
        if (userId !== OWNER_ID) safe[userId].giftCount++;

        saveData(INVENTORIES_FILE, inventories);
        saveData(SAFE_FILE, safe);

        const remaining = userId === OWNER_ID ? "∞" : 6 - safe[userId].giftCount;
        return send(UI([`🎁 Tu as offert ${item[0]} à <@${targetId}>`, `📦 Cadeaux restants: ${remaining}/6`]));
      }

      if (type === "money") {
        const amount = BigInt(targetName);
        if (!amount || amount <= 0n) return send(UI(["❌ Montant invalide"]));

        const cash = await getUserCash(userId);
        if (userId !== OWNER_ID && cash < amount) {
          const fAmount = await formatNumber(amount);
          const fCash = await formatNumber(cash);
          return send(UI([`❌ Tu n'as pas ${fAmount}$`]));
        }

        if (userId !== OWNER_ID) await updateUserCash(userId, -amount);
        await updateUserCash(targetId, amount);
        if (userId !== OWNER_ID) safe[userId].giftCount++;

        saveData(SAFE_FILE, safe);
        const fAmount = await formatNumber(amount);
        const remaining = userId === OWNER_ID ? "∞" : 6 - safe[userId].giftCount;
        return send(UI([`🎁 Tu as offert ${fAmount}$ à <@${targetId}>`, `📦 Cadeaux restants: ${remaining}/6`]));
      }

      return send(UI(["❌ Type invalide. Choix: pet, item, food, money"]));
    }

    if (sub === "mygifts") {
      const used = safe[userId].giftCount || 0;
      const remaining = userId === OWNER_ID ? "∞" : 6 - used;

      let msg = ["🎁 TES CADEAUX", "---"];
      if (userId === OWNER_ID) {
        msg.push("👑 **OWNER** : Cadeaux illimités");
        msg.push(`📦 Utilisés: ${used}`);
      } else {
        msg.push(`📦 **Restants: ${remaining}/6**`);
        msg.push(`✅ Utilisés: ${used}/6`);
        if (used >= 6) msg.push("❌ Limite atteinte!");
      }
      msg.push("---");
      msg.push("Utilise: `.pet gift @user pet/item/food/money <nom>`");
      return send(UI(msg));
    }

    return send(UI(["❌ Commande inconnue. Fais `.pet help`"]));
  }
};