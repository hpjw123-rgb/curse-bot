// ==========================================================================
// 주술 배틀 RPG ULTIMATE FINAL INTEGRATED (v8.3 - Curse Manipulation Patch)
// ==========================================================================

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================
// CONSTANTS & LIMITS
// ==========================================
const BATTLE_LIMIT = 4;
const HOURLY_CURSE_BATTLES = 5;
const MAX_NAME_LEN = 10;
const MAX_POINTS_PER_6H = 20; 
const ENHANCE_MAX = 16;       

// ==========================================
// STATIC IMAGE & BASE URL
// ==========================================
app.use("/images", express.static(path.join(__dirname, "public/images")));
const BASE_URL = "https://curse-bot-4igy.onrender.com";

const DEATH_IMAGE = "/images/death.png";
const MAH_IMAGE = "/images/Mahoraga.jpg";
const FIGHT_IMAGES = [
  "/images/fight scene1.jpg",
  "/images/fight scene2.jpg",
  "/images/fight scene3.jpg"
];

function randomFightImage() {
  const path = FIGHT_IMAGES[Math.floor(Math.random() * FIGHT_IMAGES.length)];
  return encodeURI(path);
}

// ==========================================
// MONGODB & PLAYER SCHEMA
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) console.log("MONGO_URI가 설정되지 않았습니다.");

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
  absorbedPower: Number, // 주령조술로 흡수한 누적 전투력
  bloodStack: Number,
  domainBlocked: Boolean,
  domainName: String,
  battleCount: Number,
  battleWindow: String,
  curseBattles: Number,
  lastCurseHour: String,
  curtainActiveUntil: Number,
  inventory: [String],
  equippedTool: String,
  earnedPointsHistory: { type: Array, default: [] }
}, { collection: "players" });

const Player = mongoose.model("Player", playerSchema);

let players = {};

async function loadPlayers() {
  try {
    const data = await Player.find().lean();
    data.forEach(p => { players[p.userId] = p; });
    console.log("플레이어 데이터 로드 완료");
  } catch (err) {
    console.error("데이터 로드 오류:", err);
  }
}

async function savePlayer(p) {
  await Player.updateOne({ userId: p.userId }, p, { upsert: true });
}

async function deletePlayer(userId) {
  await Player.deleteOne({ userId });
  delete players[userId];
}

mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(async () => {
    console.log("MongoDB 연결 성공");
    await loadPlayers();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SERVER RUNNING ON PORT : ${PORT}`);
    });
  })
  .catch(err => console.log("MongoDB 연결 실패:", err));

// ==========================================
// AI NARRATION SYSTEM
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
    "💥 격돌! 주력이 충돌하며 발생하는 충격파가 지면을 송두리째 흔든다!",
    "✨ 눈을 멀게 하는 빛! 술식과 술식이 맞물리며 초현실적인 풍경이 펼쳐진다!",
    "💢 콰아앙! 단순한 타격이 아니다. 공간 자체가 짓눌리는 소리가 들려온다!",
    "🌀 소용돌이치는 에너지! 서로를 상쇄하려는 처절한 몸부림이 이어진다!"
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

function getNarration(type) {
  const arr = aiNarrations[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==========================================
// UTILITY & HELPER FUNCTIONS
// ==========================================
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

function getRecentEarnedPoints(p) {
  const history = p.earnedPointsHistory || [];
  const sixHoursAgo = kstNow().getTime() - (6 * 60 * 60 * 1000);
  return history
    .filter(h => h.timestamp > sixHoursAgo && h.unrestricted !== true)
    .reduce((sum, h) => sum + h.amount, 0);
}

function tryAddBattlePoints(p, amount) {
  const currentEarned = getRecentEarnedPoints(p);
  if (currentEarned + amount > MAX_POINTS_PER_6H) {
    return { success: false, remaining: Math.max(0, MAX_POINTS_PER_6H - currentEarned) };
  }
  p.point += amount;
  if (!p.earnedPointsHistory) p.earnedPointsHistory = [];
  p.earnedPointsHistory.push({ amount: amount, timestamp: kstNow().getTime() });
  return { success: true };
}

function addUnrestrictedPoints(p, amount) {
  p.point += amount;
  if (!p.earnedPointsHistory) p.earnedPointsHistory = [];
  p.earnedPointsHistory.push({ amount: amount, timestamp: kstNow().getTime(), unrestricted: true });
  return { success: true };
}

function top3Names() {
  return Object.values(players)
    .sort((a, b) => b.point - a.point)
    .slice(0, 3)
    .map(p => p.nickname);
}

// ==========================================
// DATA SETS
// ==========================================
const energyGrades = [
  { name: "특급", chance: 6, bonus: 35, powerIdx: 4 },
  { name: "1급", chance: 12, bonus: 25, powerIdx: 3 },
  { name: "2급", chance: 22, bonus: 15, powerIdx: 2 },
  { name: "3급", chance: 60, bonus: 5, powerIdx: 1 }
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
  "좌살박도": ["/images/좌살박도.jpg", "/images/좌살박도 1차.jpg", "/images/좌살박도 3차.jpg"],
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

const enhanceRates = {
  1: 0.85, 2: 0.75, 3: 0.65, 4: 0.55, 5: 0.45,
  6: 0.35, 7: 0.30, 8: 0.25, 9: 0.20, 10: 0.15,
  11: 0.12, 12: 0.10, 13: 0.08, 14: 0.06, 15: 0.04, 16: 0.02
};

// ==========================================
// CORE SYSTEMS
// ==========================================

function enhanceTier(enhance) {
  if (enhance >= 11) return 3;
  if (enhance >= 8) return 2;
  if (enhance >= 4) return 1;
  return 0;
}

function techniqueImageUrl(p) {
  const arr = techImages[p.technique] || [];
  const idx = enhanceTier(p.enhance);
  const path = arr[idx] || "";
  if (!path) return "";
  return BASE_URL + encodeURI(path);
}

function generateDomainName(p) {
  const prefix = ["무한", "뒤틀린", "침식된", "붕괴된", "고요한", "검은", "왜곡된", "저주받은"];
  const core = ["공간", "심연", "세계", "결계", "감옥", "현실", "차원", "무대"];
  const suffix = ["의 지배", "의 결계", "의 단절", "의 붕괴", "의 침식", "의 파편"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  
  let base = pick(prefix) + " " + pick(core) + pick(suffix);
  if (p.enhance >= 14) return "🌌 " + base + " [절대영역]";
  if (p.enhance >= 8) return "🌌 " + base + " [발현]";
  if (p.enhance >= 4) return "⚠️ " + base + " [불완전]";
  return "❌ 미발현";
}

function domainEffectText(p) {
  return `🌌🌌🌌 영역전개 발동 🌌🌌🌌\n━━━━━━━━━━━━━━━━━━━━\n${p.nickname}의 영역이 세계를 덮는다.\n${p.domainName}\n공간이 뒤틀리고, 법칙이 뒤바뀐다.\n━━━━━━━━━━━━━━━━━━━━`;
}

function blackFlashText() {
  return `⚫⚡⚫ 흑섬 발동 ⚫⚡⚫\n주력이 왜곡되며 0.000001초의 틈을 찢는다.\n충격이 현실을 관통한다.`;
}

function fishFactor(gradeName) {
  const grade = energyGrades.find(g => g.name === gradeName);
  const exponent = grade ? grade.powerIdx : 1;
  return Math.pow(2.4, exponent);
}

function heavenlyBase(grade) {
  if (grade === "특급") return 4;
  if (grade === "1급") return 3;
  if (grade === "2급") return 2;
  return 1;
}

function calculatePower(p, e, opts = {}) {
  let power = 0;
  let log = "";
  let domainText = "";
  let blackText = "";
  const ignoreSpecial = !!opts.ignoreSpecial;
  const blockDomain = !!opts.blockDomain;

  log += getNarration('intro');
  if (opts.extraLog) log += " " + opts.extraLog;

  if (p.techniqueType === "fish") {
    power = p.basePower * fishFactor(p.energyGrade);
    log += " 어주자(지수성장)";
  } else if (p.techniqueType === "heavenly") {
    power = heavenlyBase(p.energyGrade) * 30;
  } else {
    power = p.basePower + p.energyBonus;
  }

  // [핵심] 주령조술 흡수량은 강화 배율이 적용되지 않도록 합산 위치 고정
  power += p.absorbedPower;

  if (p.technique === "무하한 술식" && p.energyGrade !== "특급" && p.energyGrade !== "1급") {
    power = 10;
    log += " 무하한 제한!";
  }

  if (!ignoreSpecial) {
    if (p.techniqueType === "copy") {
      const enemyTotal = e.basePower + e.energyBonus + e.absorbedPower;
      power += Math.floor(enemyTotal * 0.36); 
      log += " 모방";
    }
    if (p.techniqueType === "curse_absorb") { power += e.energyBonus; log += " 주령조술"; }
    if (p.techniqueType === "receipt") { power += e.point * 10; log += " 주복사사"; }
    
    if (p.technique === "재계상") {
      const receipt = Math.floor(Math.random() * 100) + 1;
      power += receipt;
      log += ` 재계상(영수증 ${receipt})`;
    }
    if (p.technique === "적혈조술") { power += p.bloodStack * 1; log += ` 혈식+${p.bloodStack}`; }
    if (p.techniqueType === "energy_counter") { power += e.energyBonus * 2; log += " 추령주법"; }

    // [강화 배율 적용] absorbedPower가 포함된 전체 power에 배율을 곱함
    power *= Math.pow(1.2, p.enhance);

    if (p.techniqueType === "mahoraga" && p.enhance >= 11) {
      power += Math.floor(power / 3);
      log += " 마허라 동기화";
    }
    if (p.techniqueType === "jackpot" && Math.random() < 0.0777) { power *= 1.7; log += " 잭팟"; }
    if (p.techniqueType === "ratio" && Math.random() < 0.7) { power *= 1.3; log += " 십획"; }
    if (p.techniqueType === "projection") {
      const pr = p.basePower + p.energyBonus; const er = e.basePower + e.energyBonus;
      if (pr < er) { power *= 1.2; log += " 투사주법"; } 
      else if (pr > er) { power *= 2; log += " 투사주법"; }
    }

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
              const A_val = p.enhance + p.energyBonus;
              const B_val = e.enhance + e.energyBonus;
              if (A_val > B_val) domainText += `\n🌌 영역 충돌!\n${p.domainName} 승리\n${e.nickname} 영역 붕괴`;
              else if (B_val > A_val) domainText += `\n🌌 영역 충돌!\n${e.domainName} 승리\n${p.nickname} 영역 붕괴`;
              else domainText += `\n🌌 영역 충돌!\n서로 상쇄되어 공간 붕괴`;
            }
          } else {
            log += " 영역전개(무효)";
            domainText = `🌌 영역전개 무효\n${p.nickname}의 영역이 저지된다.`;
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
    power *= Math.pow(1.2, p.enhance);
  }

  if (p.equippedTool && CURSED_TOOLS_DATA[p.equippedTool]) {
    const tool = CURSED_TOOLS_DATA[p.equippedTool];
    if (tool.effect === "폭주") {
      const enemyPower = e.basePower + e.energyBonus + e.absorbedPower;
      if (power < enemyPower) { power += 20; log += " [난생도 폭주!]"; }
    } else if (tool.effect === "적응") {
      if (e.basePower > p.basePower) { power += 15; log += " [신무해 적응!]"; }
    } else if (tool.effect === "흡수") {
      power += Math.floor(e.basePower * 0.1); 
      log += " [용골 흡수!]";
    }
    power += tool.power;
  }

  return { power: Math.floor(power), log, domainText, blackText };
}

function calculatePowerWithToolEffects(p, e, opts = {}) {
  let result = calculatePower(p, e, opts);
  if (p.equippedTool === "「천역모」") { result.power -= 30; result.log += " [천역모 억제]"; }
  if (p.equippedTool === "「흑승」") { result.power -= 40; result.log += " [흑승 봉인]"; }
  return result;
}

function statusPower(p) {
  const res = calculatePower(p, p, { ignoreSpecial: true });
  return Math.floor(res.power);
}

// ==========================================
// BATTLE SYSTEM
// ==========================================
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
    Bp -= cut; Ap += Math.floor(cut * 0.3);
    A.log += ` 무위전변(-${Math.floor(rate * 100)}%)`;
  }
  if (b.technique === "무위전변") {
    const rate = (Math.floor(Math.random() * 21) + 15) / 100;
    const cut = Math.floor(Ap * rate);
    Ap -= cut; Bp += Math.floor(cut * 0.3);
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
    let target = (a.techniqueType === "mahoraga") ? b : a;
    let targetPower = (a.techniqueType === "mahoraga") ? Bf.power : Af.power;
    let isTargetDead = targetPower < 600;

    return { 
      winner: null, 
      loser: isTargetDead ? target : null, 
      A: Af, 
      B: Bf, 
      mahoragaEvent: true,
      targetDead: isTargetDead 
    };
  }

  let winner = Af.power >= Bf.power ? a : b;
  let loser = winner === a ? b : a;

  if (winner.techniqueType === "curse_absorb") {
    const absorbAmount = Math.floor((loser.basePower + loser.energyBonus) / 5);
    winner.absorbedPower = (winner.absorbedPower || 0) + absorbAmount;
    winner.isAbsorbing = true; 
  }
  
  if (winner.technique === "적혈조술") {
    winner.bloodStack += 1;
  }

  return { winner, loser, A: Af, B: Bf, mahoragaEvent: false };
}

// ==========================================
// RAID SYSTEM
// ==========================================
const SPECIAL_CURSES = ["오리모토 리카", "죠고", "쿠로우루시", "마히토", "다곤", "하나미"];
const SPECIAL_BASE = 500;
const SPECIAL_PER = 220;
const SPECIAL_MAX = 4000;

let raid = { hour: null, boss: null, participants: {}, claimed: {} };

function resetRaidIfNeeded() {
  const h = kstHourString(); 
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

function rewardByPower(pw) { return Math.min(20, Math.max(1, Math.floor(pw / 200))); }

function strongestParticipant() {
  let maxP = null; let maxV = -1;
  Object.values(raid.participants).forEach(p => {
    if (p.power > maxV) { maxV = p.power; maxP = p; }
  });
  return { maxP, maxV };
}

// ==========================================
// CHATBOT ROUTE
// ==========================================
function quickReplies() {
  return [
    { label: "/가입", action: "message", messageText: "/가입 " },
    { label: "/상태", action: "message", messageText: "/상태" },
    { label: "/전투", action: "message", messageText: "/전투 " },
    { label: "/장막해제", action: "message", messageText: "/장막해제" },
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
      outputs: [{ basicCard: { title, description: desc, thumbnail: { imageUrl } } }],
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
  const list = Object.values(players).sort((a, b) => b.point - a.point);
  if (list.length === 0) return "랭킹 없음";
  let lines = ["🏆 전체 주술사 랭킹"];
  list.forEach((pl, i) => { lines.push(`${i + 1}위 ${pl.nickname} · ${pl.point}점`); });
  return lines.join("\n");
}

function statusText(p) {
  const sp = statusPower(p);
  const curtainStatus = p.curtainActiveUntil > kstNow().getTime() ? "🛡️ 활성화" : "❌ 비활성";
  const toolStatus = p.equippedTool ? `\n[장착 주구: ${p.equippedTool}]` : "";
  const recentEarned = getRecentEarnedPoints(p);
  const pointInfo = recentEarned >= MAX_POINTS_PER_6H 
    ? `\n[포인트 획득: 🛑 제한됨 (${Math.max(0, MAX_POINTS_PER_6H - recentEarned)}P 남음)]`
    : `\n[포인트 획득: ✅ 가능 (${MAX_POINTS_PER_6H - recentEarned}P 남음)]`;
  
  // [수정] 주령 소지량 표시 (강화 배율이 적용되지 않은 순수 흡수량)
  const curseDisplay = p.absorbedPower > 0 ? `\n[주령 소지: +${p.absorbedPower}]` : "";

  return `[플레이어:${p.nickname}]\n{술식:${p.technique}(${p.enhance}강)}\n[전투력:${sp}]${toolStatus}${curseDisplay}\n[소지 포인트:${p.point}]${pointInfo}\n[주력량:${p.energyGrade}]\n[영역:${p.domainName.replace("❌ ", "")}]\n[장막:${curtainStatus}]`;
}

function getDynamicShopItems() {
  const now = kstNow();
  const hourSeed = now.getUTCHours(); 
  const availableItems = [...SHOP_ITEMS];
  for (let i = availableItems.length - 1; i > 0; i--) {
    const j = (hourSeed + i) % (i + 1); 
    [availableItems[i], availableItems[j]] = [availableItems[j], availableItems[i]];
  }
  return availableItems.slice(0, 3);
}

app.get("/", (req, res) => { res.send("ONLINE"); });

app.post("/chat", async (req, res) => {
  const id = req.body?.userRequest?.user?.id;
  const msg = req.body?.userRequest?.utterance;
  if (!id || !msg) return res.json(replyText("요청 형식 오류"));

  const p = players[id];

  // 1. 가입
  if (msg.startsWith("/가입")) {
    const name = msg.replace("/가입", "").trim();
    if (!isValidName(name)) return res.json(replyText("닉네임을 입력해주세요."));
    if (name.length > MAX_NAME_LEN) return res.json(replyText("닉네임은 최대 10자까지 가능합니다."));
    if (isDuplicateName(name)) return res.json(replyText("이미 사용 중인 닉네임입니다."));
    
    const tech = techniques[Math.floor(Math.random() * techniques.length)];
    const energy = energyGrades[Math.floor(Math.random() * energyGrades.length)];
    const newPlayer = {
      userId: id, nickname: name, point: 0, technique: tech.name, techniqueGrade: tech.grade,
      techniqueType: tech.type, basePower: tech.power, energyGrade: energy.name, energyBonus: energy.bonus,
      enhance: 0, absorbedPower: 0, bloodStack: 0, domainBlocked: tech.type === "heavenly",
      domainName: generateDomainName({ enhance: 0 }), battleCount: 0, battleWindow: kst6hWindow(),
      curseBattles: 0, lastCurseHour: kstHourString(), curtainActiveUntil: kstNow().getTime() + (12 * 60 * 60 * 1000),
      inventory: [], equippedTool: null, earnedPointsHistory: []
    };
    players[id] = newPlayer;
    await savePlayer(newPlayer);
    return res.json(replyCard(newPlayer.technique, statusText(newPlayer), techniqueImageUrl(newPlayer)));
  }

  if (!p) return res.json(replyText("/가입 필요"));

  // 2. 기본
  if (msg === "/상태") return res.json(replyCard(p.technique, statusText(p), techniqueImageUrl(p)));
  if (msg === "/랭킹") return res.json(replyText(rankingText()));

  // 3. 강화
  if (msg === "/강화") {
    if (p.enhance >= ENHANCE_MAX) return res.json(replyCard(p.technique, "강화 최대치입니다.\n" + statusText(p), techniqueImageUrl(p)));
    const next = p.enhance + 1;
    const cost = next;
    const rate = enhanceRates[next] ?? 0.02;
    if (p.point < cost) return res.json(replyCard(p.technique, `포인트 부족 (필요 ${cost}점)\n` + statusText(p), techniqueImageUrl(p)));
    
    p.point -= cost;
    if (Math.random() < rate) {
      p.enhance = next; p.domainName = generateDomainName(p);
      await savePlayer(p); players[id] = p; 
      return res.json(replyCard(p.technique, `강화 성공! 현재 강화: ${p.enhance}\n` + statusText(p), techniqueImageUrl(p)));
    }
    await savePlayer(p); players[id] = p; 
    return res.json(replyCard(p.technique, `강화 실패... (성공률 ${(rate * 100).toFixed(1)}%)\n` + statusText(p), techniqueImageUrl(p)));
  }

  // 4. 상점/구매
  if (msg === "/상점") {
    const currentShop = getDynamicShopItems();
    let shopMsg = `🛒 [${kstHourString().slice(0, 13)}시 한정 상점]\n━━━━━━━━━━━━\n`;
    currentShop.forEach((item, idx) => { 
      shopMsg += `${idx + 1}. ${item.name} (${item.price}P)\n`; 
    });
    shopMsg += "━━━━━━━━━━━━\n구매: /구매 [번호]";
    return res.json(replyText(shopMsg));
  }

  if (msg.startsWith("/구매")) {
    const idx = parseInt(msg.replace("/구매", "").trim()) - 1;
    const currentShop = getDynamicShopItems();
    const item = currentShop[idx];
    if (!item) return res.json(replyText("잘못된 번호입니다."));
    if (p.point < item.price) return res.json(replyText("포인트가 부족합니다."));
    
    p.point -= item.price;
    if (item.id === "sukuna_finger") {
      const currentIdx = energyGrades.findIndex(g => g.name === p.energyGrade);
      if (currentIdx > 0 && Math.random() < 0.5) {
        const nextGrade = energyGrades[currentIdx - 1];
        p.energyGrade = nextGrade.name; p.energyBonus = nextGrade.bonus;
        await savePlayer(p); players[id] = p;
        return res.json(replyText(`✨ 스쿠나의 손가락 사용 성공!\n주력 등급이 [${p.energyGrade}]로 상승했습니다!`));
      } else {
        await savePlayer(p); players[id] = p;
        return res.json(replyText(`💀 스쿠나의 손가락을 사용했으나 실패했습니다...`));
      }
    } else if (item.id === "curtain") {
      p.curtainActiveUntil = kstNow().getTime() + (12 * 60 * 60 * 1000);
      await savePlayer(p); players[id] = p;
      return res.json(replyText(`🛡️ 장막을 즉시 펼쳤습니다!`));
    } else if (item.type === "tool") {
      if (p.inventory.length >= 3) return res.json(replyText("인벤토리가 가득 찼습니다."));
      p.inventory.push(item.name);
      await savePlayer(p); players[id] = p; 
      return res.json(replyText(`🗡️ 주구 [${item.name}]을(를) 구매했습니다!`));
    }
    await savePlayer(p); players[id] = p;
    return res.json(replyText(`${item.name}을(를) 구매했습니다.`));
  }

  // 5. 인벤토리/장착/장막해제
  if (msg === "/인벤토리") {
    let invMsg = `🎒 [인벤토리]\n━━━━━━━━━━━━\n보관 중인 주구: ${p.inventory.length}/3\n`;
    if (p.inventory.length === 0) invMsg += "비어 있음\n";
    else {
      p.inventory.forEach((tool, idx) => { invMsg += `${idx + 1}. ${tool} ${p.equippedTool === tool ? "✅(장착중)" : ""}\n`; });
      invMsg += "━━━━━━━━━━━━\n장착: /장착 [번호]";
    }
    return res.json(replyText(invMsg));
  }
  if (msg.startsWith("/장착")) {
    const idx = parseInt(msg.replace("/장착", "").trim()) - 1;
    if (p.inventory[idx]) {
      p.equippedTool = p.inventory[idx];
      await savePlayer(p); players[id] = p; 
      return res.json(replyText(`⚔️ ${p.equippedTool}을(를) 장착했습니다!`));
    }
    return res.json(replyText("해당 번호의 주구가 없습니다."));
  }
  if (msg === "/장막해제") {
    if (p.curtainActiveUntil <= kstNow().getTime()) return res.json(replyText("🛡️ 현재 펼쳐진 장막이 없습니다."));
    p.curtainActiveUntil = 0; await savePlayer(p); players[id] = p;
    return res.json(replyText(`✨ 장막을 거두었습니다. 이제 전투가 가능합니다.`));
  }

  // 6. 주령전투 (수정됨)
  if (msg === "/주령전투") {
    const hour = kstHourString();
    if (p.lastCurseHour !== hour) { 
      p.lastCurseHour = hour; 
      p.curseBattles = 0; 
      await savePlayer(p);
      players[id] = p;
    }
    if (p.curseBattles >= HOURLY_CURSE_BATTLES) return res.json(replyText(`🚫 이번 시간대(${hour.slice(11, 13)}시) 주령전투 횟수를 모두 사용했습니다.`));
    
    p.curseBattles += 1;
    const sp = statusPower(p);
    const cp = Math.floor(Math.random() * 90) + 10;
    let resultMsg = "";

    if (sp >= cp) {
      addUnrestrictedPoints(p, 1);
      
      // [추가] 주령조술 흡수 로직: 50% 확률로 주령 전투력의 1/5 흡수
      if (p.techniqueType === "curse_absorb" && Math.random() < 0.5) {
        const absorbAmount = Math.floor(cp / 5);
        p.absorbedPower = (p.absorbedPower || 0) + absorbAmount;
        resultMsg += `\n🌀 [주령조술] 주령의 정수를 흡수했습니다! (+${absorbAmount})`;
      }

      await savePlayer(p); players[id] = p;
      resultMsg = `👹 주령전투 승리!\n${p.nickname} vs 주령\n${sp} vs ${cp}\n주령 처치! 포인트 +1 획득! (제한 없음)${resultMsg}`;
    } else {
      await savePlayer(p); players[id] = p;
      resultMsg = `👹 주령전투 패배...\n${p.nickname} vs 주령\n${sp} vs ${cp}`;
    }
    return res.json(replyText(resultMsg));
  }

  // 7. 특급 주령 (수정됨)
  if (msg === "/특급주령") {
    resetRaidIfNeeded();
    const minute = kstMinute();
    if (minute < 30) {
      if (!raid.participants[id]) {
        raid.participants[id] = { userId: id, nickname: p.nickname, power: statusPower(p) };
        return res.json(replyText(`특급 주령 대기열 참가 완료\n보스: ${raid.boss}\n현재 참가자 수: ${Object.keys(raid.participants).length}`));
      }
      return res.json(replyText(`이미 특급 주령 대기열에 참가했습니다.`));
    }
    if (!raid.participants[id]) return res.json(replyText("현재 회차에 참가하지 않았습니다. (0~29분 사이에 참가해야 합니다.)"));
    if (raid.claimed[id]) return res.json(replyText("이미 보상을 수령했습니다."));
    if (raid.hour !== raidHour()) return res.json(replyText("보상 기간이 종료되었습니다."));

    const bossPower = raidPower();
    const { maxP, maxV } = strongestParticipant();
    const totalParticipantPower = Object.values(raid.participants).reduce((sum, part) => sum + part.power, 0);
    const win = totalParticipantPower >= bossPower;
    const participantList = Object.values(raid.participants).map(part => part.nickname).join(", ");

    let msgText = `👹 특급 주령 전투 결과\n보스: ${raid.boss}\n보스 전투력: ${bossPower}\n참가자: ${participantList}\n최강 술사: ${maxP ? maxP.nickname : "없음"} (${maxV})\n결과: ${win ? "승리" : "패배"}`;

    if (win) {
      const reward = rewardByPower(bossPower);
      addUnrestrictedPoints(p, reward);
      raid.claimed[id] = true;

      // [추가] 특급 주령 흡수 로직: 최강 술사가 보스 전투력의 1/20 흡수
      if (maxP && maxP.userId === id && p.techniqueType === "curse_absorb") {
        const absorbAmount = Math.floor(bossPower / 20);
        p.absorbedPower = (p.absorbedPower || 0) + absorbAmount;
        msgText += `\n━━━━━━━━━━━━━━━━━━━━\n🌀 [주령조술] 보스의 정수를 흡수했습니다! (+${absorbAmount})`;
      }

      await savePlayer(p); players[id] = p; 
      msgText += `\n━━━━━━━━━━━━━━━━━━━━\n🎊 승리 축하합니다!\n참가자: ${participantList}\n보상: +${reward} 포인트 (제한 없음)`;
    } else {
      await savePlayer(p); players[id] = p;
    }
    return res.json(replyText(msgText));
  }

  // 8. 전투
  if (msg.startsWith("/전투")) {
    const w = kst6hWindow();
    if (p.battleWindow !== w) { p.battleWindow = w; p.battleCount = 0; }
    if (p.battleCount >= BATTLE_LIMIT) return res.json(replyText(`전투 횟수를 모두 사용했습니다.`));

    const targetName = msg.replace("/전투", "").trim();
    const e = getPlayerByName(targetName);
    if (!e) return res.json(replyText("대상을 찾을 수 없습니다."));
    if (e.userId === id) return res.json(replyText("자기 자신과는 전투할 수 없습니다."));
    if (e.curtainActiveUntil > kstNow().getTime()) return res.json(replyText(`🛡️ ${e.nickname}님은 장막 중입니다!`));

    if (p.curtainActiveUntil > kstNow().getTime()) { p.curtainActiveUntil = 0; await savePlayer(p); }
    p.battleCount += 1;

    const top3 = top3Names();
    const r = battle(p, e);
    let deathTriggered = false;
    let pointGainMsg = "";

    let enemyDomainAlert = "";
    if (e.enhance >= 6 && e.domainName !== "❌ 미발현") {
      enemyDomainAlert = `\n⚠️ 상대 ${e.nickname}의 영역전개가 발동되었습니다!\n${e.domainName}\n`;
    }

    // [수정] 마허라 이벤트 처리 로직
    if (r.mahoragaEvent) {
      let msgText = `⚔ 전투\n${p.nickname} vs ${e.nickname}\n━━━━━━━━━━━━━━━━━━━━\n마허라 소환!\n`;
      
      if (r.targetDead) {
          const deadUser = r.loser;
          msgText += `💀 ${deadUser.nickname}님이 마허라에 의해 소멸되었습니다.\n`;
          if (top3.includes(deadUser.nickname)) deathTriggered = true;
          await deletePlayer(deadUser.userId);
          await savePlayer(p); players[id] = p;
      } else {
          msgText += `✨ 마허라의 위압감이 전장을 짓누르지만, ${r.loser ? r.loser.nickname : (p.nickname === e.nickname ? e.nickname : p.nickname)}님은 버텨냈습니다!\n`;
          await savePlayer(p); players[id] = p;
          await savePlayer(e); players[e.userId] = e;
      }
      
      const img = deathTriggered ? (BASE_URL + encodeURI(DEATH_IMAGE)) : (BASE_URL + encodeURI(MAH_IMAGE));
      return res.json(replyCard("마허라 강림", msgText, img));
    }

    if (r.winner) {
      const res = tryAddBattlePoints(r.winner, 5);
      if (res.success) pointGainMsg = `\n💰 승리 보상: +5 포인트 획득!`;
      else {
        pointGainMsg = `\n⚠️ 포인트 획득 실패: 6시간 내 한도 도달.`;
      }
      
      if (r.winner.isAbsorbing) {
          pointGainMsg += `\n🌀 [주령조술] 상대의 에너지를 흡수하여 파워가 영구히 상승했습니다!`;
      }
    }

    let resultText = `⚔ 전투 개시\n${p.nickname} vs ${e.nickname}\n━━━━━━━━━━━━━━━━━━━━\n${r.A.log}\n${r.A.domainText || ""}\n${r.A.blackText || ""}\n━━━━━━━━━━━━━━━━━━━━\n📊 [최종 전투력]\n🔹 ${p.nickname}: ${r.A.power}\n🔹 ${e.nickname}: ${r.B.power}\n━━━━━━━━━━━━━━━━━━━━\n${getNarration('victory')}\n🏆 [최종 승자]: ${r.winner.nickname}\n━━━━━━━━━━━━━━━━━━━━${pointGainMsg}`;
    
    if (enemyDomainAlert) {
        resultText = enemyDomainAlert + "\n" + resultText;
    }

    if (r.loser.techniqueType !== "immortal") {
      await deletePlayer(r.loser.userId);
      if (r.loser.userId === id) { resultText += `\n💀 ${p.nickname}님이 사망했습니다.`; if (top3.includes(p.nickname)) deathTriggered = true; }
      else { resultText += `\n💀 ${r.loser.nickname}님이 사망했습니다.`; if (top3.includes(r.loser.nickname)) deathTriggered = true; }
    } else {
      await savePlayer(p); players[id] = p;
      await savePlayer(e); players[e.userId] = e;
    }

    const img = deathTriggered ? (BASE_URL + encodeURI(DEATH_IMAGE)) : (BASE_URL + randomFightImage());
    return res.json(replyCard("전투 결과", resultText, img));
  }

  return res.json(replyText("명령어: /가입 /상태 /전투 닉네임 /주령전투 /특급주령 /랭킹 /강화 /상점 /인벤토리"));
});

// 헬퍼 함수 (Raid 시간 체크용)
function raidHour() {
  return raid.hour;
}
