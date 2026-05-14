// ==========================================================================
// 주술 배틀 RPG COMPLETE FINAL 5.9 (ULTIMATE NARRATION & MAX ENHANCE)
// 개발자: Mindlogic (SAIT 3 Pro)
// ==========================================================================

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================
// STATIC IMAGE & BASE URL
// ==========================================
app.use("/images", express.static(path.join(__dirname, "public/images")));
const BASE_URL = "https://curse-bot-40zs.onrender.com";

const DEATH_IMAGE = "/images/death.png";
const FIGHT_IMAGES = [
  "/images/fight scene1.jpg",
  "/images/fight scene 2.jpg",
  "/images/fight scene 3.jpg"
];

function randomFightImage() {
  return FIGHT_IMAGES[Math.floor(Math.random() * FIGHT_IMAGES.length)];
}

// ==========================================
// MONGODB & PLAYER SCHEMA
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) console.log("MONGO_URI가 설정되지 않았습니다.");

mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log("MongoDB 연결 성공"))
  .catch(err => console.log(err));

const playerSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  nickname: String,
  point: Number,
  technique: String,
  techniqueGrade: String,
  techniqueType: String,
  basePower: Number,
  energyGrade: String,
  energyBonus: Number,
  enhance: Number,
  absorbedPower: Number,
  bloodStack: Number,
  domainBlocked: Boolean,
  domainName: String,
  battleCount: Number,
  battleWindow: String,
  curseBattles: Number,
  lastCurseHour: String,
  curtainActiveUntil: Number,
  inventory: [String],
  equippedTool: String
}, { collection: "players" });

const Player = mongoose.model("Player", playerSchema);

let players = {};

async function loadPlayers() {
  const data = await Player.find().lean();
  data.forEach(p => { players[p.userId] = p; });
  console.log("플레이어 로드 완료");
}

async function savePlayer(p) {
  await Player.updateOne({ userId: p.userId }, p, { upsert: true });
}

async function deletePlayer(userId) {
  await Player.deleteOne({ userId });
  delete players[userId];
}

loadPlayers();

// ==========================================
// TIME & LIMITS
// ==========================================
const BATTLE_LIMIT = 4;
const HOURLY_CURSE_BATTLES = 5;
const MAX_NAME_LEN = 10;

function kstNow() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function kstHourString() {
  const k = kstNow();
  return k.toISOString().slice(0, 13);
}

function kstMinute() {
  return kstNow().getUTCMinutes();
}

function kst6hWindow() {
  const k = kstNow();
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const d = String(k.getUTCDate()).padStart(2, "0");
  const h = Math.floor(k.getUTCHours() / 6) * 6;
  const hh = String(h).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}`;
}

// ==========================================
// SHOP & CURSED TOOLS DATA
// ==========================================
const energyGrades = [
  { name: "특급", chance: 6, bonus: 35 },
  { name: "1급", chance: 12, bonus: 25 },
  { name: "2급", chance: 22, bonus: 15 },
  { name: "3급", chance: 60, bonus: 5 }
];

const SHOP_ITEMS = [
  { id: "sukuna_finger", name: "스쿠나의 손가락", price: 5, type: "consumable" },
  { id: "curtain", name: "장막", price: 10, type: "instant_buff" },
  { id: "ranseido", name: "「난생도」", price: 55, type: "tool" },
  { id: "heavenly_spear", name: "「천역모」", price: 90, type: "tool" },
  { id: "black_rope", name: "「흑승」", price: 80, type: "tool" },
  { id: "shinmu_kai", name: "「신무해」", price: 75, type: "tool" },
  { id: "dragon_bone", name: "「용골」", price: 85, type: "tool" }
];

const CURSED_TOOLS_DATA = {
  "「난생도」": { power: 25, effect: "폭주" },
  "「천역모」": { power: 25, effect: "반전" },
  "「흑승」": { power: 20, effect: "봉인" },
  "「신무해」": { power: 20, effect: "적응" },
  "「용골」": { power: 30, effect: "흡수" }
};

let currentShopItems = [];
let lastShopUpdateHour = "";

function updateShopIfNeeded() {
  const currentHour = kstHourString();
  if (lastShopUpdateHour !== currentHour) {
    const shuffled = [...SHOP_ITEMS].sort(() => 0.5 - Math.random());
    currentShopItems = shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
    lastShopUpdateHour = currentHour;
  }
}

// ==========================================
// ENHANCE & SPECIAL SYSTEMS (UPDATED: 16-STAGE & INCREASED CHANCE)
// ==========================================
const ENHANCE_MAX = 16;
const enhanceRates = {
  1: 0.85, 2: 0.75, 3: 0.65, 4: 0.55, 5: 0.45,
  6: 0.35, 7: 0.30, 8: 0.25, 9: 0.20, 10: 0.15,
  11: 0.12, 12: 0.10, 13: 0.08, 14: 0.06, 15: 0.04, 16: 0.02
};

function enhanceCost(nextLevel) { return nextLevel; }
function enhanceRate(nextLevel) { return enhanceRates[nextLevel] ?? 0.02; }

// ==========================================
// TECHNIQUES & IMAGE MAP
// ==========================================
const techniques = [
  { name: "무하한 술식", grade: "특급", power: 100, type: "limitless" },
  { name: "십종영법술", grade: "특급", power: 82, type: "mahoraga" },
  { name: "모방 술식", grade: "특급", power: 52, type: "copy" },
  { name: "주령조술", grade: "특급", power: 30, type: "curse_absorb" },
  { name: "적혈조술", grade: "1급", power: 80, type: "normal" },
  { name: "좌살박도", grade: "1급", power: 77, type: "jackpot" },
  { name: "투사주법", grade: "1급", power: 67, type: "projection" },
  { name: "주복사사", grade: "1급", power: 59, type: "receipt" },
  { name: "BOM-BA-YE", grade: "1급", power: 62, type: "nullify" },
  { name: "환수호박", grade: "2급", power: 79, type: "suicide" },
  { name: "무위전변", grade: "2급", power: 74, type: "idle" },
  { name: "성간비행", grade: "2급", power: 69, type: "space" },
  { name: "어주자", grade: "3급", power: 4, type: "fish" },
  { name: "추령주법", grade: "3급", power: 71, type: "energy_counter" },
  { name: "불사", grade: "3급", power: 72, type: "immortal" },
  { name: "천여주박", grade: "3급", power: 0, type: "heavenly" },
  { name: "초미지규", grade: "3급", power: 64, type: "normal" },
  { name: "재계상", grade: "3급", power: 60, type: "normal" },
  { name: "십획주법", grade: "3급", power: 67, type: "ratio" }
];

const techImages = {
  "무하한 술식": ["/images/무하한.jpg", "/images/무하한 1차.jpg", "/images/무하한 2차.jpg", "/images/무하한 최종.jpg"],
  "십종영법술": ["/images/십종영법술.jpg", "/images/십종영법술 1차.jpg", "/images/십종영법술 2차.jpg", "/images/십종영법술 최종.jpg"],
  "모방 술식": ["/images/모방.jpg", "/images/모방 1차.jpg", "/images/모방 2차.jpg", "/images/모방 최종.jpg"],
  "주령조술": ["/images/주령조술.jpg", "/images/주령조술 1차.jpg", "/images/주령조술 2차.jpg", "/images/주령조술 최종.jpg"],
  "적혈조술": ["/images/적혈조술.jpg", "/images/적혈조술 1차.jpg", "/images/적혈조술 2차.jpg", "/images/적혈조술 최종.jpg"],
  "좌살박도": ["/images/좌살박도.jpg", "/images/좌살박도 1차.jpg", "/images/좌살박도 2차.jpg", "/images/좌살박도 3차.jpg"],
  "투사주법": ["/images/투사주법.jpg", "/images/투사주법 1차.jpg", "/images/투사주법 2차.jpg", "/images/투사주법 최종.jpg"],
  "주복사사": ["/images/주복사사.jpg", "/images/주복사사 1차.jpg", "/images/주복사사 2차.jpg", "/images/주복사사 최종.jpg"],
  "BOM-BA-YE": ["/images/봄바야.jpg", "/images/봄바야 1차.jpg", "/images/봄바야 2차.jpg", "/images/봄바야 최종.jpg"],
  "환수호박": ["/images/환수호박.jpg", "/images/환수호박 1차.jpg", "/images/환수호박 2차.jpg", "/images/환수호박 최종.jpg"],
  "무위전변": ["/images/무위전변.jpg", "/images/무위전변 1차.jpg", "/images/무위전변 2차.jpg", "/images/무위전변 최종.jpg"],
  "성간비행": ["/images/성간비행.jpg", "/images/성간비행 1차.jpg", "/images/성간비행 2차.jpg", "/images/성간비행 최종.jpg"],
  "어주자": ["/images/어주자.jpg", "/images/어주자 1차.jpg", "/images/어주자 2차.jpg", "/images/어주자 최종.jpg"],
  "추령주법": ["/images/추령주법.jpg", "/images/추령주법 1차.jpg", "/images/추령주법 2차.jpg", "/images/추령주법 최종.jpg"],
  "불사": ["/images/불사.jpg", "/images/불사 1차.jpg", "/images/불사 2차.jpg", "/images/불사 최종.jpg"],
  "천여주박": ["/images/천여주박.jpg", "/images/천여주박 1차.jpg", "/images/천여주박 2차.jpg", "/images/천여주박 최종.jpg"],
  "초미지규": ["/images/초미지규.jpg", "/images/초미지규 1차.jpg", "/images/초미지규 2차.jpg", "/images/초미지규 최종.jpg"],
  "재계상": ["/images/재계상.jpg", "/images/재계상 1차.jpg", "/images/재계상 2차.jpg", "/images/재계상 최종.jpg"],
  "십획주법": ["/images/십획주법.jpg", "/images/십획주법 1차.jpg", "/images/십획주법 2차.jpg", "/images/십획주법 최종.jpg"]
};

function enhanceTier(enhance) {
  if (enhance >= 14) return 3;
  if (enhance >= 8) return 2;
  if (enhance >= 4) return 1;
  return 0;
}

function techniqueImageUrl(p) {
  const arr = techImages[p.technique] || [];
  const idx = enhanceTier(p.enhance);
  const path = arr[idx] || "";
  return path ? BASE_URL + path : "";
}

// ==========================================
// DOMAIN SYSTEM
// ==========================================
const prefix = ["무한", "뒤틀린", "침식된", "붕괴된", "고요한", "검은", "왜곡된", "저주받은"];
const core = ["공간", "심연", "세계", "결계", "감옥", "현실", "차원", "무대"];
const suffix = ["의 지배", "의 결계", "의 단절", "의 붕괴", "의 침식", "의 파편"];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

function generateDomainName(p) {
  let base = pick(prefix) + " " + pick(core) + pick(suffix);
  if (p.enhance >= 14) return "🌌 " + base + " [절대영역]";
  if (p.enhance >= 8) return "🌌 " + base + " [발현]";
  if (p.enhance >= 4) return "⚠️ " + base + " [불완전]";
  return "❌ 미발현";
}

// ==========================================
// [UPDATED] JUJUTSU KAISEN STYLE NARRATION
// ==========================================
const aiNarrations = {
  intro: [
    "⚡ 주력이 대기를 찢으며 소용돌이친다. 두 술사의 살기가 맞부딪히며 공간이 비명을 지른다.",
    "🔥 공기가 타오르는 듯한 압박감. 단 한 번의 움직임이 생사를 가를 전조다.",
    "🌑 침묵이 흐른다. 그러나 그 정적은 폭풍 전야의 거대한 에너지다.",
    "🌪️ 주력의 흐름이 뒤틀린다. 두 존재의 충돌이 눈앞의 현실을 왜곡시키기 시작한다.",
    "🌊 거대한 파도처럼 밀려오는 주력의 파동. 전장의 중력이 변하기 시작한다."
  ],
  clash: [
    "💥 격돌! 주력이 충돌하며 발생하는 충격파가 지면을 송두리째 뒤흔든다!",
    "✨ 눈을 멀게 하는 빛! 술식과 술식이 맞물리며 초현실적인 풍경이 펼쳐진다!",
    "💢 콰아앙! 단순한 타격이 아니다. 공간 자체가 짓눌리는 소리가 들려온다!",
    "🌀 소용돌이치는 에너지! 서로의 술식을 상쇄하려는 처절한 몸부림이 이어진다!"
  ],
  domain: [
    "🌌 영역전개(領域展開)... 세계의 법칙이 재정의된다!",
    "🌌 공간이 붕괴되며, 오직 한 명만을 위한 절대적인 세계가 강림한다!",
    "🌌 찰나의 순간, 현실의 경계가 무너지고 새로운 차원이 펼쳐진다!"
  ],
  blackflash: [
    "⚫⚡⚫ [흑섬]!! 0.000001초의 틈을 찢고, 검은 번개가 현실을 관통한다!",
    "⚫⚡⚡⚫ 콰르릉! 주력의 극의에 도달한 찰나의 타격이 전장을 뒤덮는다!",
    "⚫⚡⚫ 흑섬 발생! 검은 번개와 함께 주력의 폭발이 대기를 진동시킨다!"
  ],
  victory: [
    "👑 승자는 모든 것을 삼켰다. 패배자의 흔적조차 남지 않은 정적만이 흐른다.",
    "🩸 전장은 침묵에 잠겼다. 오직 승자의 압도적인 존재감만이 공기를 지배한다.",
    "✨ 결과는 확정되었다. 무너진 현실 속에서 승리의 선언이 울려 퍼진다."
  ]
};

function getIntro() { return aiNarrations.intro[Math.floor(Math.random() * aiNarrations.intro.length)]; }
function getClash() { return aiNarrations.clash[Math.floor(Math.random() * aiNarrations.clash.length)]; }
function getDomain() { return aiNarrations.domain[Math.floor(Math.random() * aiNarrations.domain.length)]; }
function getBlackFlash() { return aiNarrations.blackflash ? aiNarrations.blackflash[Math.floor(Math.random() * aiNarrations.blackflash.length)] : ""; }
function getVictory() { return aiNarrations.victory[Math.floor(Math.random() * aiNarrations.victory.length)]; }

function domainEffectText(p) {
  return `🌌🌌🌌 영역전개 발동 🌌🌌🌌\n━━━━━━━━━━━━━━━━━━━━\n${p.nickname}의 영역이 세계를 덮는다.\n${p.domainName}\n공간이 뒤틀리고, 법칙이 뒤바뀐다.\n━━━━━━━━━━━━━━━━━━━━`;
}

function blackFlashText() {
  return `⚫⚡⚫ 흑섬 발동 ⚫⚡⚫\n주력이 왜곡되며 0.000001초의 틈을 찢는다.\n충격이 현실을 관통한다.`;
}

// ==========================================
// PLAYER CREATE & CORE MATH
// ==========================================
function getRandomTechnique() {
  return techniques[Math.floor(Math.random() * techniques.length)];
}

function getRandomEnergy() {
  let r = Math.random() * 100, sum = 0;
  for (let g of energyGrades) {
    sum += g.chance;
    if (r <= sum) return { name: g.name, bonus: g.bonus };
  }
  return { name: "3급", bonus: 5 };
}

function createPlayer(name, userId) {
  const tech = getRandomTechnique();
  const energy = getRandomEnergy();
  return {
    userId,
    nickname: name,
    point: 0,
    technique: tech.name,
    techniqueGrade: tech.grade,
    techniqueType: tech.type,
    basePower: tech.power,
    energyGrade: energy.name,
    energyBonus: energy.bonus,
    enhance: 0,
    absorbedPower: 0,
    bloodStack: 0,
    domainBlocked: tech.type === "heavenly",
    domainName: generateDomainName({ enhance: 0 }),
    battleCount: 0,
    battleWindow: kst6hWindow(),
    curseBattles: 0,
    lastCurseHour: kstHourString(),
    curtainActiveUntil: kstNow().getTime() + (12 * 60 * 60 * 1000),
    inventory: [],
    equippedTool: null
  };
}

function raw(p) { return p.basePower + p.energyBonus; }

function fishFactor(grade) {
  if (grade === "특급") return 2.2 ** 4;
  if (grade === "1급") return 2.2 ** 3;
  if (grade === "2급") return 2.2 ** 2;
  return 2.2;
}

function heavenlyBase(grade) {
  if (grade === "특급") return 4;
  if (grade === "1급") return 3;
  if (grade === "2급") return 2;
  return 1;
}

// ==========================================
// DOMAIN CLASH
// ==========================================
function clashDomain(a, b) {
  const A = a.enhance + a.energyBonus;
  const B = b.enhance + b.energyBonus;

  if (A > B) {
    b.domainBlocked = true;
    return `🌌 영역 충돌!\n${a.domainName} 승리\n${b.nickname} 영역 붕괴`;
  } else if (B > A) {
    a.domainBlocked = true;
    return `🌌 영역 충돌!\n${b.domainName} 승리\n${a.nickname} 영역 붕괴`;
  }

  a.domainBlocked = true;
  b.domainBlocked = true;
  return `🌌 영역 충돌!\n서로 상쇄되어 공간 붕괴`;
}

// ==========================================
// POWER CALCULATION
// ==========================================
function calculatePower(p, e, opts = {}) {
  let power = p.basePower;
  let log = "";
  let domainText = "";
  let blackText = "";
  const ignoreSpecial = !!opts.ignoreSpecial;
  const blockDomain = !!opts.blockDomain;

  log += getIntro();
  if (opts.extraLog) log += " " + opts.extraLog;

  if (p.equippedTool && CURSED_TOOLS_DATA[p.equippedTool]) {
    power += CURSED_TOOLS_DATA[p.equippedTool].power;
  }

  if (!ignoreSpecial) {
    if (p.techniqueType === "fish") {
      power = p.basePower * fishFactor(p.energyGrade);
      log += " 어주자";
    }

    if (p.techniqueType === "heavenly") {
      power = heavenlyBase(p.energyGrade) * 25;
    } else {
      power += p.energyBonus;
    }

    power += p.absorbedPower;

    if (p.techniqueType === "copy") {
      const enemyTotal = e.basePower + e.energyBonus + e.absorbedPower;
      power += Math.floor(enemyTotal * 0.36); 
      log += " 모방";
    }

    if (p.techniqueType === "curse_absorb") {
      power += e.energyBonus;
    }

    if (p.techniqueType === "receipt") {
      power += e.point * 2;
      log += " 주복사사";
    }

    if (p.technique === "재계상") {
      const receipt = Math.floor(Math.random() * 100) + 1;
      power += receipt;
      log += ` 재계상(영수증 ${receipt})`;
    }

    if (p.technique === "적혈조술") {
      power += p.bloodStack * 1;
      log += ` 혈식+${p.bloodStack}`;
    }

    if (p.techniqueType === "energy_counter") {
      power += e.energyBonus * 4;
      log += " 추령주법";
    }

    power *= Math.pow(1.2, p.enhance);

    if (p.techniqueType === "mahoraga" && p.enhance >= 11) {
      power += Math.floor(power / 3);
      log += " 마허라 동기화";
    }

    if (p.techniqueType === "limitless" && p.energyGrade !== "특급" && p.energyGrade !== "1급") {
      power = 10; log += " 무하한 제한!";
    }

    if (p.techniqueType === "jackpot" && Math.random() < 0.0777) {
      power *= 1.7;
      log += " 잭팟";
    }

    if (p.techniqueType === "ratio" && Math.random() < 0.7) {
      power *= 1.5;
      log += " 십획";
    }

    if (p.techniqueType === "projection") {
      const pr = raw(p);
      const er = raw(e);
      if (pr < er) {
        power *= 1.2;
        log += " 투사주법";
      } else if (pr > er) {
        power *= 2;
        log += " 투사주법";
      }
    }

    // [수정됨] 천여주박(heavenly) 대응 로직 강화
    if (!(p.techniqueType === "heavenly" || e.techniqueType === "heavenly")) {
      if (p.enhance >= 6 && !p.domainBlocked) {
        let domainChance = 0.6; 
        if (p.enhance >= 7) domainChance = 0.65;
        if (p.enhance >= 8) domainChance = 0.70;
        if (p.enhance >= 9) domainChance = 0.75;
        if (p.enhance >= 10) domainChance = 0.80;
        if (p.enhance >= 11) domainChance = 0.85;

        if (Math.random() < domainChance) {
          if (!blockDomain) {
            const domainMult = p.techniqueType === "receipt" ? 2.2 : 2.0;
            power *= domainMult;
            log += " 영역전개";
            domainText = domainEffectText(p);
            if (e.enhance >= 6 && Math.random() < 0.5) {
              domainText += "\\n" + clashDomain(p, e);
            }
          } else {
            log += " 영역전개(무효)";
            domainText = `🌌 영역전개 무효\\n${p.nickname}의 영역이 저지된다.`;
          }
        }
      }
    }

    if (Math.random() < 0.01) {
      power *= 2.5;
      log += " 흑섬";
      blackText = blackFlashText();
    }
  } else {
    power += p.energyBonus;
    power += p.absorbedPower;
    power *= Math.pow(1.2, p.enhance);
  }

  if (p.equippedTool && CURSED_TOOLS_DATA[p.equippedTool]) {
    const tool = CURSED_TOOLS_DATA[p.equippedTool];
    if (tool.effect === "폭주") {
      const enemyPower = e.basePower + e.energyBonus + e.absorbedPower;
      if (power < enemyPower) {
        power += 20;
        log += " [난생도 폭주!]";
      }
    } else if (tool.effect === "적응") {
      if (e.basePower > p.basePower) {
        power += 15;
        log += " [신무해 적응!]";
      }
    } else if (tool.effect === "흡수") {
      power += Math.floor(e.basePower * 0.1); 
      log += " [용골 흡수!]";
    }
  }

  return { power: Math.floor(power), log, domainText, blackText };
}

function calculatePowerWithToolEffects(p, e, opts = {}) {
  let result = calculatePower(p, e, opts);
  if (p.equippedTool === "「천역모」") {
    result.power -= 30;
    result.log += " [천역모 억제]";
  }
  if (p.equippedTool === "「흑승」") {
    result.power -= 40;
    result.log += " [흑승 봉인]";
  }
  return result;
}

function statusPower(p) {
  let power = p.basePower;
  if (p.techniqueType === "fish") {
    power = p.basePower * fishFactor(p.energyGrade);
  }
  if (p.techniqueType === "heavenly") {
    power = heavenlyBase(p.energyGrade) * 30;
  } else {
    power += p.energyBonus;
  }
  power += p.absorbedPower;
  if (p.technique === "적혈조술") {
    power += p.bloodStack * 1;
  }
  power *= Math.pow(1.2, p.enhance);
  if (p.techniqueType === "limitless" && p.energyGrade !== "특급" && p.energyGrade !== "1급") {
    power = 10;
  }
  if (p.equippedTool && CURSED_TOOLS_DATA[p.equippedTool]) {
    power += CURSED_TOOLS_DATA[p.equippedTool].power;
  }
  return Math.floor(power);
}

// ==========================================
// CURSE RAID SYSTEM
// ==========================================
const SPECIAL_CURSES = ["오리모토 리카", "죠고", "쿠로우루시", "마히토", "다곤", "하나미"];
const SPECIAL_BASE = 500;
const SPECIAL_PER = 320;
const SPECIAL_MAX = 4000;

let raid = {
  hour: null,
  boss: null,
  participants: {},
  claimed: {}
};

function raidHour() { return kstHourString(); }

function resetRaidIfNeeded() {
  const h = raidHour();
  if (raid.hour !== h) {
    raid.hour = h;
    raid.boss = SPECIAL_CURSES[Math.floor(Math.random() * SPECIAL_CURSES.length)];
    raid.participants = {};
    raid.claimed = {};
  }
}

function raidPower() {
  const cnt = Object.keys(raid.participants).length;
  return Math.min(SPECIAL_MAX, SPECIAL_BASE + cnt * SPECIAL_PER);
}

function rewardByPower(pw) {
  return Math.min(20, Math.max(1, Math.floor(pw / 200)));
}

function strongestParticipant() {
  let maxP = null;
  let maxV = -1;
  Object.values(raid.participants).forEach(p => {
    if (p.power > maxV) {
      maxV = p.power;
      maxP = p;
    }
  });
  return { maxP, maxV };
}

// ==========================================
// BATTLE SYSTEM
// ==========================================
function top3Names() {
  return Object.values(players)
    .sort((a, b) => b.point - a.point)
    .slice(0, 3)
    .map(p => p.nickname);
}

function battle(a, b) {
  const aAnti = (a.technique === "초미지규" && Math.random() < 0.7);
  const bAnti = (b.technique === "초미지규" && Math.random() < 0.7);

  const A = calculatePowerWithToolEffects(a, b, {
    ignoreSpecial: bAnti,
    blockDomain: (b.technique === "환수호박"),
    extraLog: aAnti ? "초미지규 발동" : ""
  });

  const B = calculatePowerWithToolEffects(b, a, {
    ignoreSpecial: aAnti,
    blockDomain: (a.technique === "환수호박"),
    extraLog: bAnti ? "초미지규 발동" : ""
  });

  let Ap = A.power;
  let Bp = B.power;

  if (a.technique === "성간비행") {
    const rate = (Ap < Bp) ? 0.35 : 0.20;
    Bp = Math.floor(Bp * (1 - rate));
    A.log += ` 성간비행(-${Math.floor(rate * 100)}%)`;
  }
  if (b.technique === "성간비행") {
    const rate = (Bp < Ap) ? 0.35 : 0.20;
    Ap = Math.floor(Ap * (1 - rate));
    B.log += ` 성간비행(-${Math.floor(rate * 100)}%)`;
  }

  if (a.technique === "무위전변") {
    const rate = (Math.floor(Math.random() * 21) + 15) / 100;
    const cut = Math.floor(Bp * rate);
    Bp -= cut;
    Ap += Math.floor(cut * 0.3);
    A.log += ` 무위전변(-${Math.floor(rate * 100)}%)`;
  }
  if (b.technique === "무위전변") {
    const rate = (Math.floor(Math.random() * 21) + 15) / 100;
    const cut = Math.floor(Ap * rate);
    Ap -= cut;
    Bp += Math.floor(cut * 0.3);
    B.log += ` 무위전변(-${Math.floor(rate * 100)}%)`;
  }

  if (a.technique === "BOM-BA-YE" && Ap < Bp) {
    const diff = Bp - Ap;
    if (diff >= 200) Ap = Math.floor(Ap * 2);
    else if (diff >= 100) Ap = Math.floor(Ap * 1.6);
    else if (diff >= 50) Ap = Math.floor(Ap * 1.3);
    A.log += " BOM-BA-YE";
  }
  if (b.technique === "BOM-BA-YE" && Bp < Ap) {
    const diff = Ap - Bp;
    if (diff >= 200) Bp = Math.floor(Bp * 2);
    else if (diff >= 100) Bp = Math.floor(Bp * 1.6);
    else if (diff >= 50) Bp = Math.floor(Bp * 1.3);
    B.log += " BOM-BA-YE";
  }

  const Af = { ...A, power: Math.floor(Ap) };
  const Bf = { ...B, power: Math.floor(Bp) };

  let mahoragaEvent = false;
  if (a.techniqueType === "mahoraga" && Math.random() < 0.2 && Bf.power < 300) mahoragaEvent = true;
  if (b.techniqueType === "mahoraga" && Math.random() < 0.2 && Af.power < 300) mahoragaEvent = true;

  if (mahoragaEvent) {
    return { winner: null, loser: null, A: Af, B: Bf, mahoragaEvent: true };
  }

  let winner = Af.power >= Bf.power ? a : b;
  let loser = winner === a ? b : a;

  winner.point += 5;

  if (winner.techniqueType === "curse_absorb") {
    winner.absorbedPower += Math.floor(raw(loser) / 5);
  }

  if (winner.technique === "적혈조술") {
    winner.bloodStack += 1;
  }

  return { winner, loser, A: Af, B: Bf, mahoragaEvent: false };
}

// ==========================================
// HELPERS
// ==========================================
function quickReplies() {
  return [
    { label: "/가입", action: "message", messageText: "/가입 " },
    { label: "/상태", action: "message", messageText: "/상태" },
    { label: "/전투", action: "message", messageText: "/전투 " },
    { label: "/주령전투", action: "message", messageText: "/주령전투" },
    { label: "/특급주령", action: "message", messageText: "/특급주령" },
    { label: "/랭킹", action: "message", messageText: "/랭킹" },
    { label: "/강화", action: "message", messageText: "/강화" },
    { label: "/상점", action: "message", messageText: "/상점" },
    { label: "/인벤토리", action: "message", messageText: "/인벤토리" }
  ];
}

function replyText(text) {
  return { version: "2.0", template: { outputs: [{ simpleText: { text } }], quickReplies: quickReplies() } };
}

function replyCard(title, desc, imageUrl) {
  return {
    version: "2.0",
    template: {
      outputs: [{
        basicCard: {
          title,
          description: desc,
          thumbnail: { imageUrl }
        }
      }],
      quickReplies: quickReplies()
    }
  };
}

function getPlayerByName(name) {
  return Object.values(players).find(p => p.nickname === name);
}

function isValidName(name) {
  return typeof name === "string" && name.trim().length >= 1;
}

function isDuplicateName(name) {
  return Object.values(players).some(p => p.nickname === name);
}

function rankingText() {
  const list = Object.values(players)
    .sort((a, b) => b.point - a.point);

  if (list.length === 0) return "랭킹 없음";

  let lines = ["🏆 전체 주술사 랭킹"];
  list.forEach((p, i) => {
    lines.push(`${i + 1}위 ${p.nickname} · ${p.point}점`);
  });
  return lines.join("\n");
}

function statusText(p) {
  const sp = statusPower(p);
  const curtainStatus = p.curtainActiveUntil > kstNow().getTime() ? "🛡️ 활성화" : "❌ 비활성";
  const toolStatus = p.equippedTool ? `\n[장착 주구: ${p.equippedTool}]` : "";
  return `[플레이어:${p.nickname}]\n{술식:${p.technique}(${p.enhance}강)}\n[전투력:${sp}]\n[소지 포인트:${p.point}]\n[주력량:${p.energyGrade}]\n[영역:${p.domainName.replace("❌ ", "")}]\n[장막:${curtainStatus}]${toolStatus}`;
}

// ==========================================
// CHATBOT ROUTE
// ==========================================
app.get("/", (req, res) => { res.send("ONLINE"); });

app.post("/chat", async (req, res) => {
  const id = req.body?.userRequest?.user?.id;
  const msg = req.body?.userRequest?.utterance;

  if (!id || !msg) return res.json(replyText("요청 형식 오류"));

  updateShopIfNeeded();
  const p = players[id];

  // 1. 가입
  if (msg.startsWith("/가입")) {
    const name = msg.replace("/가입", "").trim();
    if (!isValidName(name)) return res.json(replyText("닉네임을 입력해주세요. 예: /가입 고죠"));
    if (name.length > MAX_NAME_LEN) return res.json(replyText("닉네임은 최대 10자까지 가능합니다."));
    if (isDuplicateName(name)) return res.json(replyText("이미 사용 중인 닉네임입니다."));
    const newPlayer = createPlayer(name, id);
    players[id] = newPlayer;
    await savePlayer(newPlayer);
    const img = techniqueImageUrl(newPlayer);
    return res.json(replyCard(newPlayer.technique, statusText(newPlayer), img));
  }

  if (!p) return res.json(replyText("/가입 필요"));

  // 2. 기본 명령어
  if (msg === "/상태") {
    const img = techniqueImageUrl(p);
    return res.json(replyCard(p.technique, statusText(p), img));
  }

  if (msg === "/랭킹") {
    return res.json(replyText(rankingText()));
  }

  if (msg === "/강화") {
    if (p.enhance >= ENHANCE_MAX) {
      const img = techniqueImageUrl(p);
      return res.json(replyCard(p.technique, "강화 최대치입니다.\n" + statusText(p), img));
    }
    const next = p.enhance + 1;
    const cost = enhanceCost(next);
    const rate = enhanceRate(next);

    if (p.point < cost) {
      const img = techniqueImageUrl(p);
      return res.json(replyCard(p.technique, `포인트 부족 (필요 ${cost}점)\n` + statusText(p), img));
    }

    p.point -= cost;
    if (Math.random() < rate) {
      p.enhance = next;
      p.domainName = generateDomainName(p);
      await savePlayer(p);
      players[p.userId] = p; 
      const img = techniqueImageUrl(p);
      return res.json(replyCard(p.technique, `강화 성공! 현재 강화: ${p.enhance}\n` + statusText(p), img));
    }
    await savePlayer(p);
    players[p.userId] = p; 
    const img = techniqueImageUrl(p);
    return res.json(replyCard(p.technique, `강화 실패... (성공률 ${(rate * 100).toFixed(1)}%)\n` + statusText(p), img));
  }

  // 3. 상점 시스템
  if (msg === "/상점") {
    let shopMsg = "🛒 [정시 갱신 상점]\n━━━━━━━━━━━━\n";
    currentShopItems.forEach((item, idx) => {
      shopMsg += `${idx + 1}. ${item.name} (${item.price}P)\n`;
    });
    shopMsg += "━━━━━━━━━━━━\n구매: /구매 [번호]";
    return res.json(replyText(shopMsg));
  }

  if (msg.startsWith("/구매")) {
    const idx = parseInt(msg.replace("/구매", "").trim()) - 1;
    const item = currentShopItems[idx];

    if (!item) return res.json(replyText("잘못된 번호입니다."));
    if (p.point < item.price) return res.json(replyText("포인트가 부족합니다."));

    p.point -= item.price;

    if (item.id === "sukuna_finger") {
      const currentIdx = energyGrades.findIndex(g => g.name === p.energyGrade);
      if (currentIdx > 0 && Math.random() < 0.5) {
        const nextGrade = energyGrades[currentIdx - 1];
        p.energyGrade = nextGrade.name;
        p.energyBonus = nextGrade.bonus;
        await savePlayer(p);
        players[p.userId] = p;
        return res.json(replyText(`✨ 스쿠나의 손가락 사용 성공!\n주력 등급이 [${p.energyGrade}]로 상승했습니다!`));
      } else {
        await savePlayer(p);
        players[p.userId] = p;
        return res.json(replyText(`💀 스쿠나의 손가락을 사용했으나 실패했습니다... (등급 상승 실패)`));
      }
    } else if (item.id === "curtain") {
      p.curtainActiveUntil = kstNow().getTime() + (12 * 60 * 60 * 1000);
      await savePlayer(p);
      players[p.userId] = p;
      return res.json(replyText(`🛡️ 장막을 즉시 펼쳤습니다!\n(12시간 동안 다른 플레이어의 전투 요청을 방어합니다.)`));
    } else if (item.type === "tool") {
      const toolName = item.name;
      
      if (p.inventory.length >= 3) {
        return res.json(replyText("인벤토리가 가득 찼습니다. (최대 3개)"));
      }

      p.inventory.push(toolName);
      await savePlayer(p);
      players[p.userId] = p; 

      return res.json(replyText(`🗡️ 주구 [${toolName}]을(를) 구매했습니다! 인벤토리를 확인하세요.`));
    }

    await savePlayer(p);
    players[p.userId] = p;
    return res.json(replyText(`${item.name}을(를) 구매했습니다.`));
  }

  // 4. 인벤토리 & 장착
  if (msg === "/인벤토리") {
    let invMsg = `🎒 [인벤토리]\n━━━━━━━━━━━━\n`;
    invMsg += `보관 중인 주구: ${p.inventory.length}/3\n`;
    if (p.inventory.length === 0) {
      invMsg += "비어 있음\n";
    } else {
      p.inventory.forEach((tool, idx) => {
        invMsg += `${idx + 1}. ${tool} ${p.equippedTool === tool ? "✅(장착중)" : ""}\n`;
      });
      invMsg += "━━━━━━━━━━━━\n장착: /장착 [번호]";
    }
    return res.json(replyText(invMsg));
  }

  if (msg.startsWith("/장착")) {
    const idx = parseInt(msg.replace("/장착", "").trim()) - 1;
    if (p.inventory[idx]) {
      p.equippedTool = p.inventory[idx];
      await savePlayer(p);
      players[p.userId] = p; 
      return res.json(replyText(`⚔️ ${p.equippedTool}을(를) 장착했습니다!`));
    }
    return res.json(replyText("해당 번호의 주구가 없습니다."));
  }

  // 5. 주령 전투
  if (msg === "/주령전투") {
    resetCurseIfNeeded(p);
    if (p.curseBattles >= HOURLY_CURSE_BATTLES) {
      return res.json(replyText(`이번 시간대 주령전투 횟수를 모두 사용했습니다. (1시간 ${HOURLY_CURSE_BATTLES}회)`));
    }

    p.curseBattles += 1;
    const sp = statusPower(p);
    const cp = randomCursePowerByDigits();

    if (sp >= cp) {
      p.point += 1;
      await savePlayer(p);
      players[p.userId] = p;
      return res.json(replyText(`👹 주령전투\n${p.nickname} vs 주령\n${sp} vs ${cp}\n주령 처치! 포인트 +1`));
    }
    await savePlayer(p);
    players[p.userId] = p;
    return res.json(replyText(`👹 주령전투\n${p.nickname} vs 주령\n${sp} vs ${cp}\n패배... 캐릭터는 유지됩니다.`));
  }

  function resetCurseIfNeeded(p) {
    const hour = kstHourString();
    if (p.lastCurseHour !== hour) {
      p.lastCurseHour = hour;
      p.curseBattles = 0;
    }
  }

  function randomCursePowerByDigits() {
    return Math.floor(Math.random() * 90) + 10;
  }

  // 6. 특급 주령 (FIXED VERSION)
  if (msg === "/특급주령") {
    resetRaidIfNeeded();
    const minute = kstMinute();
    const hour = raidHour();

    if (minute < 30) {
      if (!raid.participants[id]) {
        const sp = statusPower(p);
        raid.participants[id] = { userId: id, nickname: p.nickname, power: sp };
        return res.json(replyText(`특급 주령 대기열 참가 완료\n보스: ${raid.boss}\n현재 참가자 수: ${Object.keys(raid.participants).length}`));
      }
      return res.json(replyText(`이미 특급 주령 대기열에 참가했습니다.\n보스: ${raid.boss}`));
    }

    if (!raid.participants[id]) {
      return res.json(replyText("현재 회차에 참가하지 않았습니다. (0~29분 사이에 참가해야 합니다.)"));
    }

    if (raid.claimed[id]) {
      return res.json(replyText("이미 보상을 수령했습니다."));
    }

    if (raid.hour !== hour) {
      return res.json(replyText("보상 기간이 종료되었습니다."));
    }

    const bossPower = raidPower();
    const { maxP, maxV } = strongestParticipant();
    
    const totalParticipantPower = Object.values(raid.participants).reduce((sum, part) => sum + part.power, 0);
    const win = totalParticipantPower >= bossPower;

    let msgText = `👹 특급 주령 전투 결과\n보스: ${raid.boss}\n보스 전투력: ${bossPower}\n참가자: ${Object.keys(raid.participants).map(x => raid.participants[x].nickname).join(", ")}\n최강 술사: ${maxP ? maxP.nickname : "없음"} (${maxV})\n총 합산 전투력: ${totalParticipantPower}\n결과: ${win ? "승리" : "패배"}`;

    if (win) {
      const reward = rewardByPower(bossPower);
      p.point += reward;
      raid.claimed[id] = true;
      await savePlayer(p);
      players[p.userId] = p; 
      msgText += `\n보상: +${reward} 포인트`;
    }

    return res.json(replyText(msgText));
  }

  function resetRaidIfNeeded() {
    const h = raidHour();
    if (raid.hour !== h) {
      raid.hour = h;
      raid.boss = SPECIAL_CURSES[Math.floor(Math.random() * SPECIAL_CURSES.length)];
      raid.participants = {};
      raid.claimed = {};
    }
  }

  // 7. 전투 (장막 로직 통합)
  if (msg.startsWith("/전투")) {
    resetBattleIfNeeded(p);
    if (p.battleCount >= BATTLE_LIMIT) {
      return res.json(replyText(`전투 횟수를 모두 사용했습니다. (6시간 ${BATTLE_LIMIT}회)`));
    }

    const t = msg.replace("/전투", "").trim();
    if (!isValidName(t)) return res.json(replyText("대상 닉네임을 입력해주세요. 예: /전투 메구미"));
    const e = getPlayerByName(t);
    if (!e) return res.json(replyText("대상을 찾을 수 없습니다."));
    if (e.userId === p.userId) return res.json(replyText("자기 자신과 전투할 수 없습니다."));

    if (e.curtainActiveUntil > kstNow().getTime()) {
      return res.json(replyText(`🛡️ ${e.nickname}님은 현재 장막을 펼치고 있어 전투를 할 수 없습니다!`));
    }

    if (p.curtainActiveUntil > kstNow().getTime()) {
      p.curtainActiveUntil = 0;
      await savePlayer(p);
      players[p.userId] = p;
    }

    p.battleCount += 1;

    const top3 = top3Names();
    const r = battle(p, e);
    let deathTriggered = false;

    if (r.mahoragaEvent) {
      let msgText = `⚔ 전투\n${p.nickname} vs ${e.nickname}\n${r.A.power} vs ${r.B.power}\n팔악검 이계신장 마허라 소환`;

      if (p.techniqueType !== "immortal") {
        await deletePlayer(p.userId);
        msgText += `\n당신의 캐릭터가 사망했습니다. /가입으로 다시 생성하세요.`;
        if (top3.includes(p.nickname)) { msgText += `\n알림: TOP3 주술사 ${p.nickname} 사망`; deathTriggered = true; }
      } else {
        await savePlayer(p);
        players[p.userId] = p;
      }

      if (e.techniqueType !== "immortal") {
        await deletePlayer(e.userId);
        msgText += `\n상대 캐릭터 ${e.nickname} 사망`;
        if (top3.includes(e.nickname)) { msgText += `\n알림: TOP3 주술사 ${e.nickname} 사망`; deathTriggered = true; }
      } else {
        await savePlayer(e);
        players[e.userId] = e;
      }

      const img = deathTriggered ? (BASE_URL + DEATH_IMAGE) : (BASE_URL + randomFightImage());
      return res.json(replyCard("전투 결과", msgText, img));
    }

    // [수정됨] 전투 결과 메시지를 훨씬 상세하고 명확하게 출력하도록 구성
    let resultText = `⚔ 전투 개시\n${p.nickname} vs ${e.nickname}\n━━━━━━━━━━━━━━━━━━━━\n`;
    resultText += `${r.A.log}\n${r.A.domainText || ""}\n${r.A.blackText || ""}\n━━━━━━━━━━━━━━━━━━━━\n`;
    resultText += `📊 [최종 전투력 수치]\n`;
    resultText += `🔹 ${p.nickname}: ${r.A.power}\n`;
    resultText += `🔹 ${e.nickname}: ${r.B.power}\n`;
    resultText += `━━━━━━━━━━━━━━━━━━━━\n`;
    resultText += `${aiResult()}\n`;
    resultText += `🏆 [최종 승자]: ${r.winner.nickname}\n`;
    resultText += `━━━━━━━━━━━━━━━━━━━━`;

    if (r.loser.techniqueType !== "immortal") {
      await deletePlayer(r.loser.userId);
      if (r.loser.userId === p.userId) {
        resultText += `\n💀 [사망 보고]: ${p.nickname}님이 전투 중 사망했습니다. /가입으로 재생하세요.`;
        if (top3.includes(p.nickname)) { resultText += `\n⚠️ [긴급]: TOP3 주술사 ${p.nickname} 사망!`; deathTriggered = true; }
      } else {
        resultText += `\n💀 [사망 보고]: 상대 캐릭터 ${r.loser.nickname}님이 사망했습니다.`;
        if (top3.includes(r.loser.nickname)) { resultText += `\n⚠️ [긴급]: TOP3 주술사 ${r.loser.nickname} 사망!`; deathTriggered = true; }
      }
    } else {
      await savePlayer(p);
      players[p.userId] = p;
      await savePlayer(e);
      players[e.userId] = e;
    }

    const img = deathTriggered ? (BASE_URL + DEATH_IMAGE) : (BASE_URL + randomFightImage());
    return res.json(replyCard("전투 결과", resultText, img));
  }

  function resetBattleIfNeeded(p) {
    const w = kst6hWindow();
    if (p.battleWindow !== w) {
      p.battleWindow = w;
      p.battleCount = 0;
    }
  }

  return res.json(replyText("명령어: /가입 /상태 /전투 닉네임 /주령전투 /특급주령 /랭킹 /강화 /상점 /인벤토리"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`RUN : ${PORT}`));
