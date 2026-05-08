// ==========================================
// 주술 배틀 RPG COMPLETE FINAL 4.0 (STABLE + RULESET + AI LINES + DOMAIN CLASH + LIMITS + ENHANCE + QUICK REPLIES)
// 카카오톡 챗봇
// ==========================================

const express = require("express");
const app = express();
app.use(express.json());
const PORT = 3000;

// ==========================================
// PLAYER STORAGE
// ==========================================
let players = {};

// ==========================================
// DAILY LIMIT (KST)
// ==========================================
const DAILY_BATTLES = 4;
const HOURLY_CURSE_BATTLES = 5;

function kstNow(){
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function kstDateString(){
  return kstNow().toISOString().slice(0,10);
}

function kstHourString(){
  const k = kstNow();
  return k.toISOString().slice(0,13);
}

function resetDailyIfNeeded(p){
  const today = kstDateString();
  if (p.lastBattleDate !== today){
    p.lastBattleDate = today;
    p.dailyBattles = 0;
  }
}

function resetCurseIfNeeded(p){
  const hour = kstHourString();
  if (p.lastCurseHour !== hour){
    p.lastCurseHour = hour;
    p.curseBattles = 0;
  }
}

// ==========================================
// ENHANCE SYSTEM
// ==========================================
const ENHANCE_MAX = 10;
const enhanceRates = {
  1: 0.70, 2: 0.60, 3: 0.52, 4: 0.45, 5: 0.38,
  6: 0.30, 7: 0.22, 8: 0.15, 9: 0.09, 10: 0.05
};

function enhanceCost(nextLevel){ return nextLevel; }
function enhanceRate(nextLevel){ return enhanceRates[nextLevel] ?? 0.05; }

// ==========================================
// ENERGY SYSTEM
// ==========================================
const energyGrades = [
  { name: "특급", chance: 6, bonus: 35 },
  { name: "1급", chance: 12, bonus: 25 },
  { name: "2급", chance: 22, bonus: 15 },
  { name: "3급", chance: 60, bonus: 5 }
];

function getRandomEnergy(){
  let r = Math.random() * 100, sum = 0;
  for (let g of energyGrades){
    sum += g.chance;
    if (r <= sum) return g;
  }
  return energyGrades[3];
}

// ==========================================
// TECHNIQUES
// ==========================================
const techniques = [
  {name:"무하한 술식",grade:"특급",power:100,type:"limitless"},
  {name:"십종영법술",grade:"특급",power:82,type:"mahoraga"},
  {name:"모방 술식",grade:"특급",power:40,type:"copy"},
  {name:"주령조술",grade:"특급",power:30,type:"curse_absorb"},

  {name:"적혈조술",grade:"1급",power:80,type:"normal"},
  {name:"좌살박도",grade:"1급",power:77,type:"jackpot"},
  {name:"투사주법",grade:"1급",power:67,type:"projection"},
  {name:"주복사사",grade:"1급",power:59,type:"receipt"},
  {name:"BOM-BA-YE",grade:"1급",power:62,type:"nullify"},

  {name:"환수호박",grade:"2급",power:20,type:"suicide"},
  {name:"무위전변",grade:"2급",power:25,type:"idle"},
  {name:"성간비행",grade:"2급",power:30,type:"space"},

  {name:"어주자",grade:"3급",power:4,type:"fish"},
  {name:"추령주법",grade:"3급",power:40,type:"energy_counter"},
  {name:"불사",grade:"3급",power:30,type:"immortal"},
  {name:"천여주박",grade:"3급",power:0,type:"heavenly"},
  {name:"초미지규",grade:"3급",power:44,type:"normal"},
  {name:"재계상",grade:"3급",power:50,type:"normal"},
  {name:"십획주법",grade:"3급",power:37,type:"ratio"}
];

function getRandomTechnique(){
  return techniques[Math.floor(Math.random() * techniques.length)];
}

// ==========================================
// DOMAIN SYSTEM
// ==========================================
const prefix=["무한","뒤틀린","침식된","붕괴된","고요한","검은","왜곡된","저주받은"];
const core=["공간","심연","세계","결계","감옥","현실","차원","무대"];
const suffix=["의 지배","의 결계","의 단절","의 붕괴","의 침식","의 파편"];

function pick(a){return a[Math.floor(Math.random()*a.length)];}

function generateDomainName(p){
  let base=pick(prefix)+" "+pick(core)+pick(suffix);
  if(p.enhance>=10) return "🌌 "+base+" [절대영역]";
  if(p.enhance>=6) return "🌌 "+base+" [발현]";
  if(p.enhance>=3) return "⚠️ "+base+" [불완전]";
  return "❌ 미발현";
}

// ==========================================
// AI NARRATION
// ==========================================
const aiAttack=[
"공간이 찢어진다.","주력이 폭주한다.","현실이 뒤틀린다.","침묵이 깨진다.","살의가 형태를 가진다.","공기가 붕괴한다.","차원이 흔들린다.","저주가 폭발한다.","영역이 펼쳐진다."
];

const aiLines = [
  "공간이 뒤틀리며 주력이 폭발한다...",
  "서로의 술식이 충돌하며 현실이 흔들린다.",
  "이건 단순한 싸움이 아니다. 영역의 충돌이다.",
  "숨이 막힐 정도의 주력 압박이 퍼진다.",
  "승부는 이미 정해졌을지도 모른다...",
  "영역이 펼쳐지는 순간, 세계의 법칙이 바뀐다."
];

const aiWin=[
"승자는 모든 것을 삼킨다.","패배자는 소멸한다.","전장은 침묵한다.","결과는 확정된다.","주술이 끝난다."
];

function aiLine(){return aiLines[Math.floor(Math.random()*aiLines.length)];}
function aiResult(){return aiWin[Math.floor(Math.random()*aiWin.length)];}

// ==========================================
// PLAYER CREATE
// ==========================================
function createPlayer(name){
  const tech = getRandomTechnique();
  const energy = getRandomEnergy();
  return {
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
    domainBlocked: tech.type === "heavenly",
    domainName: generateDomainName({enhance:0}),
    dailyBattles: 0,
    lastBattleDate: kstDateString(),
    curseBattles: 0,
    lastCurseHour: kstHourString()
  };
}

function raw(p){return p.basePower + p.energyBonus;}

function gradeFactor(grade){
  if (grade === "3급") return 2.5;
  if (grade === "2급") return 6.25;
  if (grade === "1급") return 15.625;
  if (grade === "특급") return 39.0625;
  return 1;
}

function heavenlyBase(grade){
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
// POWER CALC
// ==========================================
function calculatePower(p, e){
  let power = p.basePower;
  let log = "";
  let domainText = "";

  log += aiLine();

  if (p.techniqueType === "heavenly"){
    power = heavenlyBase(p.energyGrade) * 25;
  } else {
    power += p.energyBonus;
  }

  power += p.absorbedPower;

  if (p.techniqueType === "copy"){
    const enemyTotal = e.basePower + e.energyBonus + e.absorbedPower;
    power += Math.floor(enemyTotal / 2);
    log += " 모방";
  }

  if (p.techniqueType === "curse_absorb"){
    power += e.energyBonus;
  }

  if (p.techniqueType === "receipt"){
    power += e.point * 2;
    log += " 주복사사";
  }

  if (p.techniqueType === "energy_counter"){
    power += e.energyBonus * 2;
    log += " 추령주법";
  }

  if (p.techniqueType === "fish"){
    power *= gradeFactor(p.energyGrade);
    log += " 어주자";
  }

  power *= Math.pow(1.2, p.enhance);

  if (p.techniqueType === "limitless" && p.energyGrade !== "특급" && p.energyGrade !== "1급"){
    power = 10; log += " 무하한 제한!";
  }

  if (p.techniqueType === "jackpot" && Math.random() < 0.05){
    power *= 1.7;
    log += " 잭팟";
  }

  if (p.techniqueType === "ratio" && Math.random() < 0.7){
    power *= 1.3;
    log += " 십획";
  }

  if (p.techniqueType === "projection"){
    const pr = raw(p);
    const er = raw(e);
    if (pr < er){
      power *= 1.2;
      log += " 투사주법";
    } else if (pr > er){
      power *= 2;
      log += " 투사주법";
    }
  }

  if (!(p.techniqueType === "heavenly" || e.techniqueType === "heavenly")){
    if (p.enhance >= 6 && !p.domainBlocked && Math.random() < 0.6){
      power *= 2;
      log += " 영역전개";
      domainText = "🌌 영역 발동: " + p.domainName;

      if (e.enhance >= 6 && Math.random() < 0.5){
        domainText += "\n" + clashDomain(p, e);
      }
    }
  }

  if (Math.random() < 0.01){power *= 2.5; log += " 흑섬";}

  return {power: Math.floor(power), log, domainText};
}

// ==========================================
// STATUS POWER (STATIC BUFFS ONLY)
// ==========================================
function statusPower(p){
  let power = p.basePower;

  if (p.techniqueType === "heavenly"){
    power = heavenlyBase(p.energyGrade) * 25;
  } else {
    power += p.energyBonus;
  }

  power += p.absorbedPower;

  if (p.techniqueType === "fish"){
    power *= gradeFactor(p.energyGrade);
  }

  power *= Math.pow(1.2, p.enhance);

  if (p.techniqueType === "limitless" && p.energyGrade !== "특급" && p.energyGrade !== "1급"){
    power = 10;
  }

  return Math.floor(power);
}

// ==========================================
// CURSE BATTLE
// ==========================================
function randomCursePowerByDigits(sp){
  if (sp >= 100) return Math.floor(Math.random() * 900) + 100;
  return Math.floor(Math.random() * 90) + 10;
}

// ==========================================
// BATTLE SYSTEM
// ==========================================
function top3Names(){
  return Object.values(players)
    .sort((a,b) => b.point - a.point)
    .slice(0,3)
    .map(p => p.nickname);
}

function battle(a, b){
  const A = calculatePower(a, b);
  const B = calculatePower(b, a);

  let mahoragaEvent = false;

  if (a.techniqueType === "mahoraga" && Math.random() < 0.2 && B.power < 150){
    mahoragaEvent = true;
  }
  if (b.techniqueType === "mahoraga" && Math.random() < 0.2 && A.power < 150){
    mahoragaEvent = true;
  }

  if (mahoragaEvent){
    return {winner: null, loser: null, A, B, mahoragaEvent: true};
  }

  let winner = A.power >= B.power ? a : b;
  let loser = winner === a ? b : a;

  winner.point += 5;

  if (winner.techniqueType === "curse_absorb"){
    winner.absorbedPower += Math.floor(raw(loser)/5);
  }

  return {winner, loser, A, B, mahoragaEvent: false};
}

// ==========================================
// HELPERS
// ==========================================
function quickReplies(){
  return [
    {label:"/가입", action:"message", messageText:"/가입 "},
    {label:"/상태", action:"message", messageText:"/상태"},
    {label:"/전투", action:"message", messageText:"/전투 "},
    {label:"/주령전투", action:"message", messageText:"/주령전투"},
    {label:"/랭킹", action:"message", messageText:"/랭킹"},
    {label:"/강화", action:"message", messageText:"/강화"}
  ];
}

function replyText(text){
  return {version:"2.0", template:{outputs:[{simpleText:{text}}], quickReplies: quickReplies()}};
}

function getPlayerByName(name){
  return Object.values(players).find(p => p.nickname === name);
}

function isValidName(name){
  return typeof name === "string" && name.trim().length >= 1;
}

function isDuplicateName(name){
  return Object.values(players).some(p => p.nickname === name);
}

function rankingText(){
  const list = Object.values(players)
    .sort((a,b) => b.point - a.point)
    .slice(0, 10);

  if (list.length === 0) return "랭킹 없음";

  let lines = ["🏆 랭킹 TOP 10"];
  list.forEach((p, i) => {
    lines.push(`${i+1}위 ${p.nickname} · ${p.point}점`);
  });
  return lines.join("\n");
}

function statusText(p){
  const sp = statusPower(p);
  return `[플레이어:${p.nickname}]
{술식:${p.technique}(${p.enhance}강)}
[전투력:${sp}]
[소지 포인트:${p.point}]
[주력량:${p.energyGrade}]
[영역:${p.domainName.replace("❌ ","")}]`;
}

// ==========================================
// CHATBOT ROUTE
// ==========================================
app.post("/chat", (req, res) => {
  const id = req.body?.userRequest?.user?.id;
  const msg = req.body?.userRequest?.utterance;

  if (!id || !msg){
    return res.json(replyText("요청 형식 오류"));
  }

  if (msg.startsWith("/가입")){
    const name = msg.replace("/가입", "").trim();
    if (!isValidName(name)) return res.json(replyText("닉네임을 입력해주세요. 예: /가입 고죠"));
    if (isDuplicateName(name)) return res.json(replyText("이미 사용 중인 닉네임입니다."));
    players[id] = createPlayer(name);
    return res.json(replyText("가입 완료"));
  }

  const p = players[id];
  if (!p) return res.json(replyText("/가입 필요"));

  if (msg === "/상태"){
    return res.json(replyText(statusText(p)));
  }

  if (msg === "/랭킹"){
    return res.json(replyText(rankingText()));
  }

  if (msg === "/강화"){
    if (p.enhance >= ENHANCE_MAX){
      return res.json(replyText("강화 최대치입니다."));
    }
    const next = p.enhance + 1;
    const cost = enhanceCost(next);
    const rate = enhanceRate(next);

    if (p.point < cost){
      return res.json(replyText(`포인트 부족 (필요 ${cost}점)`));
    }

    p.point -= cost;

    if (Math.random() < rate){
      p.enhance = next;
      p.domainName = generateDomainName(p);
      return res.json(replyText(`강화 성공! 현재 강화: ${p.enhance}`));
    }
    return res.json(replyText(`강화 실패... (성공률 ${(rate*100).toFixed(1)}%)`));
  }

  if (msg === "/주령전투"){
    resetCurseIfNeeded(p);
    if (p.curseBattles >= HOURLY_CURSE_BATTLES){
      return res.json(replyText(`이번 시간대 주령전투 횟수를 모두 사용했습니다. (1시간 ${HOURLY_CURSE_BATTLES}회)`));
    }

    p.curseBattles += 1;

    const sp = statusPower(p);
    const cp = randomCursePowerByDigits(sp);

    if (sp >= cp){
      p.point += 1;
      return res.json(replyText(
`👹 주령전투
${p.nickname} vs 주령
${sp} vs ${cp}
주령 처치! 포인트 +1`
      ));
    }
    return res.json(replyText(
`👹 주령전투
${p.nickname} vs 주령
${sp} vs ${cp}
패배... 캐릭터는 유지됩니다.`
    ));
  }

  if (msg.startsWith("/전투")){
    resetDailyIfNeeded(p);
    if (p.dailyBattles >= DAILY_BATTLES){
      return res.json(replyText(`오늘의 전투 횟수를 모두 사용했습니다. (하루 ${DAILY_BATTLES}회)`));
    }

    const t = msg.replace("/전투", "").trim();
    if (!isValidName(t)) return res.json(replyText("대상 닉네임을 입력해주세요. 예: /전투 메구미"));
    const e = getPlayerByName(t);
    if (!e) return res.json(replyText("대상을 찾을 수 없습니다."));
    if (e === p) return res.json(replyText("자기 자신과 전투할 수 없습니다."));

    p.dailyBattles += 1;

    const top3 = top3Names();
    const r = battle(p, e);

    if (r.mahoragaEvent){
      let msgText = `⚔ 전투
${p.nickname} vs ${e.nickname}
${r.A.power} vs ${r.B.power}
도박형 즉사 발동`;

      if (p.techniqueType !== "immortal"){
        delete players[id];
        msgText += `\n당신의 캐릭터가 사망했습니다. /가입으로 다시 생성하세요.`;
        if (top3.includes(p.nickname)) msgText += `\n알림: TOP3 캐릭터 ${p.nickname} 사망`;
      }

      const eid = Object.keys(players).find(k => players[k] === e);
      if (e.techniqueType !== "immortal" && eid){
        delete players[eid];
        msgText += `\n상대 캐릭터 ${e.nickname} 사망`;
        if (top3.includes(e.nickname)) msgText += `\n알림: TOP3 캐릭터 ${e.nickname} 사망`;
      }

      return res.json(replyText(msgText));
    }

    let resultText =
`⚔ 전투
${p.nickname} vs ${e.nickname}
${r.A.power} vs ${r.B.power}
${r.A.log}
${r.A.domainText||""}
${aiResult()}
승자:${r.winner.nickname}`;

    if (r.loser.techniqueType !== "immortal"){
      const loserId = Object.keys(players).find(k => players[k] === r.loser);
      if (loserId){
        if (r.loser === p){
          delete players[id];
          resultText += `\n당신의 캐릭터가 사망했습니다. /가입으로 다시 생성하세요.`;
          if (top3.includes(p.nickname)) resultText += `\n알림: TOP3 캐릭터 ${p.nickname} 사망`;
        } else {
          delete players[loserId];
          resultText += `\n상대 캐릭터 ${r.loser.nickname} 사망`;
          if (top3.includes(r.loser.nickname)) resultText += `\n알림: TOP3 주술사 ${r.loser.nickname} 사망`;
        }
      }
    }

    return res.json(replyText(resultText));
  }

  return res.json(replyText("명령어: /가입 /상태 /전투 닉네임 /주령전투 /랭킹 /강화"));
});

app.listen(PORT, () => console.log("RUN"));
