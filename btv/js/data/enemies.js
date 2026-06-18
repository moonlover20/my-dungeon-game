const ENEMY_TYPES={
  // === 1막: 고블린 소굴 ===
  goblin_warrior :{name:"러부엉",  r:20.8, hp:28, spd:78, dmg:11, color:"#6fae4e", xp:8,  ai:"chase", lunge:true, label:"러부엉"},
  goblin_archer  :{name:"대파",  r:18.2, hp:18, spd:50, dmg:6,  color:"#7bbf5a", xp:10, ai:"shooter", range:340, cool:1.25, label:"대파"},
  goblin_shaman  :{name:"까치",  r:19.5, hp:24, spd:66, dmg:7,  color:"#8a6fb0", xp:12, ai:"orbit",   range:240, cool:1.05, label:"까치"},
  goblin_bomber  :{name:"블페러", r:19.5, hp:22, spd:100, dmg:6,  color:"#9aa83f", xp:11, ai:"chase", explode:true, label:"블페러"},
  hoonsangtae   :{name:"\uD6C8\uC0C1\uD0DC", r:44.2, hp:48, spd:55, dmg:10, color:"#e25572", xp:38, ai:"cleaver_thrower", range:320, cool:1.55, label:"\uD6C8\uC0C1\uD0DC"},
  jaemin        :{name:"\uC7AC\uBBFC", r:20.8, hp:42, spd:68, dmg:9, color:"#f0a84a", xp:36, ai:"boomerang_thrower", range:300, cool:2.15, label:"\uC7AC\uBBFC"},
  sniper_viewer :{name:"\uC800\uACA9\uB7EC", r:19.5, hp:34, spd:28, dmg:13, touchDmg:10, color:"#d83a3a", xp:42, ai:"sniper_laser", range:520, cool:3.0, label:"\uC800\uACA9\uB7EC"},
  stream_watcher:{name:"\uBC29\uD50C\uB7EC", r:19.5, hp:40, spd:44, dmg:6, color:"#4fc0d8", xp:34, ai:"movement_lock", range:360, cool:4.0, label:"\uBC29\uD50C\uB7EC"},
  rhino_beetle   :{name:"자잘자",   r:27, hp:140, spd:68, dmg:16, touchDmg:16, color:"#3a2418", xp:24, ai:"charge", armor:0.15, label:"자잘자"},
  earthworm      :{name:"지렁이", r:12, hp:10, spd:74, dmg:6, color:"#e87a8a", xp:0, ai:"erratic", label:"지렁이"},
  hyechul        :{name:"혜철이", r:52, hp:300, spd:42, dmg:15, color:"#c0392b", xp:150, ai:"hyechul", label:"혜철이"},
  zergling       :{name:"저글링", r:14, hp:12, spd:120, dmg:7, color:"#c98bff", xp:0, ai:"charge", label:"저글링"},
  mutalisk       :{name:"뮤탈", r:16, hp:16, spd:130, dmg:8, color:"#b97a4a", xp:0, ai:"chase", label:"뮤탈"},
  ultra          :{name:"울트라", r:26, hp:95, spd:52, dmg:20, touchDmg:20, color:"#8a6f4a", xp:0, ai:"chase", armor:0.25, label:"울트라"},
  zerg_egg       :{name:"저그 알", r:18, hp:9, spd:0, dmg:0, color:"#b8772a", xp:0, ai:"egg", label:"알"},
  // === 2막: 망자의 폐허 ===
  skeleton_warrior:{name:"스켈레톤 워리어",r:15,hp:30, spd:64,dmg:11,color:"#e8e3d2",xp:9,  ai:"chase"},
  skeleton_archer :{name:"스켈레톤 아처", r:14,hp:20, spd:48,dmg:0, color:"#d9d2bf",xp:11, ai:"shooter",range:340,cool:1.4},
  skeleton_shaman :{name:"스켈레톤 샤먼", r:15,hp:26, spd:58,dmg:0, color:"#c9b8e0",xp:12, ai:"orbit",  range:240,cool:1.1},
  ghost           :{name:"고스트",        r:14,hp:18, spd:120,dmg:8,color:"#e9eeff",xp:10, ai:"erratic"},
  small_golem     :{name:"작은 골렘",     r:16,hp:50, spd:34,dmg:13,color:"#8a8f9a",xp:12, ai:"chase"},
  ruins_golem     :{name:"루인스 골렘",   r:20,hp:90, spd:30,dmg:16,color:"#6f8a6a",xp:18, ai:"chase"},
  giant_golem     :{name:"거대 골렘",     r:26,hp:160,spd:24,dmg:20,color:"#7a808c",xp:28, ai:"chase"},
  eldritch        :{name:"엘드리치",      r:22,hp:120,spd:48,dmg:0, color:"#6b4f9e",xp:24, ai:"orbit",range:260,cool:0.9},
  // === 3막: 마경 ===
  slime_green :{name:"초록 슬라임",r:15,hp:24,spd:62,dmg:9, color:"#5dff9b",xp:6, ai:"chase"},
  slime_red   :{name:"빨강 슬라임",r:15,hp:22,spd:98,dmg:10,color:"#ff6b6b",xp:8, ai:"chase"},
  slime_yellow:{name:"노랑 슬라임",r:17,hp:34,spd:42,dmg:12,color:"#ffd34d",xp:9, ai:"chase"},
  elf_melee   :{name:"엘프 검사",  r:14,hp:26,spd:82,dmg:11,color:"#bfe3a0",xp:11,ai:"chase"},
  elf_ranged  :{name:"엘프 궁수",  r:14,hp:22,spd:54,dmg:0, color:"#a8d98a",xp:12,ai:"shooter",range:360,cool:1.3},
  // === 2막 (봉식 월드): 광천김 소굴 ===
  gwangcheon_gim:{name:"광천김", r:18, hp:58,  spd:40, dmg:7,  touchDmg:7,  color:"#3f7a34", xp:88,  ai:"shooter", range:330, cool:1.6, label:"광천김"},
  reura         :{name:"러라",   r:15, hp:56,  spd:90, dmg:10, touchDmg:10, color:"#ffd166", xp:84,  ai:"chase", lunge:true, label:"러라"},
  namu          :{name:"나무",   r:22, hp:72,  spd:30, dmg:13, touchDmg:13, color:"#5fa84a", xp:96, ai:"chase",   label:"나무"},
  ketter        :{name:"케터",   r:16, hp:54,  spd:58, dmg:8,  color:"#7ed957", xp:86,  ai:"orbit", range:260, cool:1.35, label:"케터"},
  // --- 2막 어려운 적 ---
  pobear        :{name:"포베어", r:26, hp:125, spd:58, dmg:17, touchDmg:13, color:"#c8884a", xp:330, ai:"charge", armor:0.08, label:"포베어"},
  blackstar     :{name:"흑별",   r:21, hp:110, spd:42, dmg:13, touchDmg:10, color:"#17111f", xp:315, ai:"orbit", range:270, cool:1.25, label:"흑별"},
  killjoy       :{name:"킬조이", r:17, hp:100, spd:104,dmg:14, touchDmg:10, color:"#38e8ff", xp:320, ai:"shooter", range:380, cool:0.95, label:"킬조이"},
  apple         :{name:"사과",   r:20, hp:112, spd:64, dmg:15, color:"#ff4d6d", xp:310, ai:"erratic", range:300, cool:1.4, label:"사과"},
  yanggaeng     :{name:"박제인간", r:58, hp:1450, spd:48, dmg:17, touchDmg:17, color:"#111111", xp:2200, ai:"bagjein", cool:1.7, label:"박제인간"},
  // === 2막 엘리트: 양갱 (3페이즈) ===
  kkotchung     :{name:"양갱", r:32, hp:240, spd:50, dmg:11, touchDmg:11, color:"#f7a8d0", xp:900,  ai:"kkotchung", cool:1.4, label:"미주"},
};
const ACT_POOLS=[
  { normal:["goblin_warrior","goblin_archer","goblin_shaman","goblin_bomber"], elite:["rhino_beetle"] },
  { normal:["gwangcheon_gim","reura","namu","ketter"], elite:["kkotchung"] },
  { normal:["slime_green","slime_red","slime_yellow","elf_melee","elf_ranged"], elite:["giant_golem","eldritch"] },
];
const ACT1_WEAK_ENEMY_IDS=["goblin_warrior","goblin_archer","goblin_shaman","goblin_bomber"];
const ACT1_LATE_ENEMY_IDS=["hoonsangtae","jaemin","sniper_viewer","stream_watcher"];
const ACT1_PRIORITY_CAPS={sniper_viewer:1,stream_watcher:1};
// === 2막 잡몹 분리 ===
const ACT2_BASIC_ENEMY_IDS=["gwangcheon_gim","reura","namu","ketter"];      // 일반몹: 광천김/러라/나무/케터
const ACT2_LATE_ENEMY_IDS=["pobear","blackstar","killjoy","apple"];          // 어려운 적: 포베어/흑별/킬조이/사과
const ACT2_PRIORITY_CAPS={blackstar:1,killjoy:1,apple:1};                    // 방당 1마리 우선 제한 (포베어는 브루저라 미제한)
function normalEnemyPoolFor(a,row){
  const pool=ACT_POOLS[Math.min(a-1,ACT_POOLS.length-1)];
  const base=(pool&&pool.normal?pool.normal:[]).slice();
  if(a===1) return base.concat(ACT1_LATE_ENEMY_IDS);
  if(a===2){
    // 2막 일반방에 등장 가능한 잡몹 전체 (기본 4종 + 어려운 적 4종)
    const seen=new Set(), out=[];
    ACT2_BASIC_ENEMY_IDS.concat(ACT2_LATE_ENEMY_IDS).forEach(id=>{ if(ENEMY_TYPES[id]&&!seen.has(id)){ seen.add(id); out.push(id); } });
    return out;
  }
  return base;
}
function enemyTypeCounts(list){
  const counts={};
  (list||[]).forEach(e=>{ if(e&&e.type) counts[e.type]=(counts[e.type]||0)+1; });
  return counts;
}
function pickNormalEnemyForRoom(a,row,counts){
  const pool=ACT_POOLS[Math.min(a-1,ACT_POOLS.length-1)];
  if(a===1){
    counts=counts||{};
    const strongRate=row>MIDBOSS_ROW?0.70:0.10;
    const weak=ACT1_WEAK_ENEMY_IDS;
    let strong=ACT1_LATE_ENEMY_IDS.filter(id=>!ACT1_PRIORITY_CAPS[id]||(counts[id]||0)<ACT1_PRIORITY_CAPS[id]);
    const wantStrong=Math.random()<strongRate;
    let choices=wantStrong?strong:weak;
    if(!choices.length) choices=wantStrong?weak:strong;
    const id=pick(choices.length?choices:weak);
    counts[id]=(counts[id]||0)+1;
    return id;
  }
  if(a===2){
    counts=counts||{};
    // 중보 전엔 가끔(10%), 중보 후엔 자주(70%) 어려운 적 등장
    const hardRate=row>MIDBOSS_ROW?0.70:0.10;
    const basic=ACT2_BASIC_ENEMY_IDS;
    let hard=ACT2_LATE_ENEMY_IDS.filter(id=>!ACT2_PRIORITY_CAPS[id]||(counts[id]||0)<ACT2_PRIORITY_CAPS[id]);
    const wantHard=Math.random()<hardRate;
    let choices=wantHard?hard:basic;
    if(!choices.length) choices=wantHard?basic:hard;          // 제한으로 후보 소진 시 반대 풀에서
    const id=pick(choices.length?choices:basic);
    counts[id]=(counts[id]||0)+1;
    return id;
  }
  return pick((pool&&pool.normal)||[]);
}
const DB_HIDDEN_ENEMY_IDS=new Set(['slime_green','slime_red','slime_yellow','elf_melee','elf_ranged','giant_golem','eldritch']);
const DB_HIDDEN_BOSS_KEYS=new Set(['steel_lord','bear']);
const DB_EXTRA_ENEMY_IDS=['hyechul','yanggaeng','earthworm','zergling','mutalisk','ultra','zerg_egg'];
const DB_ENEMY_IDS=(function(){
  const ids=[], seen=new Set();
  const add=id=>{ if(id && ENEMY_TYPES[id] && !DB_HIDDEN_ENEMY_IDS.has(id) && !seen.has(id)){ seen.add(id); ids.push(id); } };
  ACT_POOLS.forEach(pool=>{
    (pool.normal||[]).forEach(add);
    (pool.elite||[]).forEach(add);
  });
  ACT1_LATE_ENEMY_IDS.forEach(add);
  ACT2_LATE_ENEMY_IDS.forEach(add);
  DB_EXTRA_ENEMY_IDS.forEach(add);
  return ids;
})();
if (typeof window !== "undefined") {
  window.normalEnemyPoolFor = normalEnemyPoolFor;
  window.enemyTypeCounts = enemyTypeCounts;
  window.pickNormalEnemyForRoom = pickNormalEnemyForRoom;
}
