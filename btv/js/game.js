"use strict";
/* =========================================================
   JS MAINTENANCE MAP
   This file intentionally stays single-file for fast vibe coding.
   When adding features, put code near the matching section below.

   1. Utilities and DOM helpers
   2. Embedded assets and canvas setup
   3. Audio and music
   4. Chat simulation
   5. Data tables: enemies, bosses, relics, events, potions
   6. Input and runtime state
   7. Combat, map, rewards, shops, events
   8. Rendering and main loop
   9. Overlay/UI wiring, story, title, settings
   10. Boot sequence
   ========================================================= */

/* =========================================================
   던전 & 채팅 — 스트리머 로그라이크
   순수 캔버스 + 바닐라 JS. 외부 의존성 없음.
   ========================================================= */

// ---------- 짧은 유틸 ----------

// ===== JS: Utilities and DOM helpers =====
const TAU=Math.PI*2;
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const lerp=(a,b,t)=>a+(b-a)*t;
// 엘리먼트 캐싱: 같은 id를 반복 조회하지 않도록 1회 조회 후 캐시
const _elc={};
const $=id=>_elc[id]||(_elc[id]=document.getElementById(id));

const BONGSIK_AVATAR="btv/assets/asset-001-77d22694fc.png";
const BROADCAST_SCREEN="btv/assets/asset-002-28d8882b0a.jpg";

// ===== JS: Embedded assets and canvas setup =====
const cvs=$('game');
const ctx=cvs.getContext('2d');
const PLAYER_SPRITE=new Image();let playerSpriteReady=false;PLAYER_SPRITE.onload=()=>{playerSpriteReady=true;};
const KIJO_SPRITE=new Image();let kijoReady=false;KIJO_SPRITE.onload=()=>{kijoReady=true;};KIJO_SPRITE.src="btv/assets/asset-003-76f2d7f659.png";
const FOOD_CHICKEN=new Image();FOOD_CHICKEN.src="btv/assets/asset-004-6431d6ce18.png";
const FOOD_PIZZA=new Image();FOOD_PIZZA.src="btv/assets/asset-005-4b27df3b0a.png";
const FOODS=[FOOD_CHICKEN,FOOD_PIZZA];
const BEETLE_SPRITE=new Image();let beetleReady=false;BEETLE_SPRITE.onload=()=>{beetleReady=true;};BEETLE_SPRITE.src="btv/assets/asset-006-1d9ea4f875.png";
const LEEK_SPRITE=new Image();let leekReady=false;LEEK_SPRITE.onload=()=>{leekReady=true;};LEEK_SPRITE.src="btv/assets/asset-007-a86ea21fd9.png";
const WORM_SPRITE=new Image();let wormReady=false;WORM_SPRITE.onload=()=>{wormReady=true;};WORM_SPRITE.src="btv/assets/asset-008-2980406185.png";
const MAGPIE_SPRITE=new Image();let magpieReady=false;MAGPIE_SPRITE.onload=()=>{magpieReady=true;};MAGPIE_SPRITE.src="btv/assets/asset-009-e610c24586.png";
const OWL_SPRITE=new Image();let owlReady=false;OWL_SPRITE.onload=()=>{owlReady=true;};OWL_SPRITE.src="btv/assets/asset-010-2d24e08db4.png";
const SHIELD_SPRITE=new Image();let shieldReady=false;SHIELD_SPRITE.onload=()=>{shieldReady=true;};SHIELD_SPRITE.src="btv/assets/asset-011-69c7bd18c1.png";
const TRASH_SPRITE=new Image();let trashReady=false;TRASH_SPRITE.onload=()=>{trashReady=true;};TRASH_SPRITE.src="btv/assets/asset-012-115e7cc76b.png";
const TRASHBIT_SPRITE=new Image();let trashbitReady=false;TRASHBIT_SPRITE.onload=()=>{trashbitReady=true;};TRASHBIT_SPRITE.src="btv/assets/asset-013-c0095fd832.png";
const VAYNEQ_ICON=new Image();let vqReady=false;VAYNEQ_ICON.onload=()=>{vqReady=true;};VAYNEQ_ICON.src="btv/assets/asset-014-b11cdba9dc.png";
const LAIR_SPRITE=new Image();let lairReady=false;LAIR_SPRITE.onload=()=>{lairReady=true;};LAIR_SPRITE.src="btv/assets/asset-015-a4f7b5bb1f.png";
const HIVE_SPRITE=new Image();let hiveReady=false;HIVE_SPRITE.onload=()=>{hiveReady=true;};HIVE_SPRITE.src="btv/assets/asset-016-111578856b.png";
const ZERGLING_SPRITE=new Image();let zerglingReady=false;ZERGLING_SPRITE.onload=()=>{zerglingReady=true;};ZERGLING_SPRITE.src="btv/assets/asset-017-afb6d2c48a.png";
const ZERG_EGG_SPRITE=new Image();let zergEggReady=false;ZERG_EGG_SPRITE.onload=()=>{zergEggReady=true;};ZERG_EGG_SPRITE.src="btv/assets/asset-018-61bfb3b440.png";
const MUTALISK_SPRITE=new Image();let mutaliskReady=false;MUTALISK_SPRITE.onload=()=>{mutaliskReady=true;};MUTALISK_SPRITE.src="btv/assets/asset-019-a56bc82e63.png";
const ULTRA_SPRITE=new Image();let ultraReady=false;ULTRA_SPRITE.onload=()=>{ultraReady=true;};ULTRA_SPRITE.src="btv/assets/asset-020-afe3b7d4b2.png";PLAYER_SPRITE.src="btv/assets/asset-021-de784e3d5a.png";
let W=cvs.width, H=cvs.height;
let BASE_W=W, BASE_H=H; const BOSS_ARENA_SCALE=1.3;
let arenaResponsive=true; // 일반 필드에서만 화면에 맞춰 리사이즈(보스 아레나 제외)
function setArena(w,h){
  if(cvs.width===w && cvs.height===h) return;
  cvs.width=w; cvs.height=h; W=w; H=h;
  if(typeof buildBackdrop==='function') buildBackdrop(act); // 새 크기에 맞춰 배경 재생성
}
// 가용 영역(스테이지 영역에서 능력치 패널 폭만 제외) 계산
function computeFieldSize(){
  const wrap=document.getElementById('stageWrap');
  if(!wrap||!wrap.clientWidth) return {w:BASE_W,h:BASE_H};
  let availW=wrap.clientWidth, availH=wrap.clientHeight;
  const sp=document.getElementById('sidePanel');
  const inPlay = (typeof state!=='undefined' && state==='play' && typeof player==='object' && player && player.maxhp!=null);
  const panelShown = ((sp && sp.classList.contains('show')) || inPlay) && window.innerWidth>880;
  if(panelShown) availW-=232; // 패널 + 여백
  availW=Math.max(640, Math.min(2000, Math.round(availW)));
  availH=Math.max(400, Math.min(1200, Math.round(availH)));
  return {w:availW,h:availH};
}
// 일반 필드: 버퍼=표시영역(1:1, 레터박스 없음)으로 꽉 채움
function fitField(){
  if(!arenaResponsive) return;
  const s=computeFieldSize();
  BASE_W=s.w; BASE_H=s.h;
  setArena(s.w,s.h);
  cvs.style.width=s.w+'px'; cvs.style.height=s.h+'px';
  if(typeof player==='object' && player){ player.x=clamp(player.x,16,W-16); player.y=clamp(player.y,16,H-16); }
}
let _fitT=null;
window.addEventListener('resize',()=>{ clearTimeout(_fitT); _fitT=setTimeout(()=>{ if(arenaResponsive) fitField(); },150); });

// ---------- 사운드 (간단 WebAudio) ----------

// ===== JS: Audio and music =====
let audioCtx=null, muted=false;
function beep(freq,dur,type,vol){
  if(muted) return;
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type||'square'; o.frequency.value=freq;
    g.gain.value=(vol||0.06)*sfxVol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+(dur||0.08));
    o.stop(audioCtx.currentTime+(dur||0.08));
  }catch(e){}
}
const sfx={
  shoot:()=>beep(680,0.05,'square',0.03),
  hit:()=>beep(220,0.07,'sawtooth',0.05),
  hurt:()=>beep(140,0.16,'sawtooth',0.08),
  pick:()=>beep(900,0.1,'triangle',0.06),
  boss:()=>{beep(110,0.4,'sawtooth',0.09);setTimeout(()=>beep(90,0.5,'sawtooth',0.09),120);},
  coin:()=>beep(1200,0.06,'square',0.04),
  vote:()=>beep(520,0.12,'triangle',0.05),
  dodge:()=>beep(440,0.08,'sine',0.04),
  // UI 버튼 딸깍 사운드 (픽셀 레트로 느낌)
  click:()=>{ beep(1100,0.03,'square',0.045); setTimeout(()=>beep(820,0.025,'square',0.025),18); },
  clickSoft:()=>beep(780,0.04,'square',0.03),   // 보조 버튼·취소용 (살짝 낮고 부드럽게)
  clickBack:()=>{ beep(600,0.035,'square',0.03); setTimeout(()=>beep(420,0.025,'square',0.02),20); }, // 뒤로가기 느낌
};

// ── UI 버튼 자동 클릭음 ──────────────────────────────────────────────
// 모든 .btn, .choice, .vote-opt, .perkcard, .diffbtn, .title-item, .iconbtn, .pslot, .set-btn 에
// pointerdown 이벤트로 딸깍 사운드를 심는다 (동적 생성 요소 포함)
(function wireClickSfx(){
  function playClickFor(el){
    if(muted) return;
    try{ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
    if(el.classList.contains('ghost') || el.classList.contains('set-btn') && el.classList.contains('ghost')) sfx.clickSoft();
    else if(el.id==='diffBack' || el.classList.contains('backToTitle') || el.id==='setClose' || el.id==='setReset' || el.id==='helpClose' || el.id==='invClose') sfx.clickBack();
    else sfx.click();
  }
  // 위임 방식: document 레벨에서 버튼류 클릭 감지
  document.addEventListener('pointerdown', function(e){
    const el=e.target.closest('button,input[type=button],input[type=submit],.choice,.vote-opt,.perkcard,.diffbtn,.title-item,.iconbtn,.pslot:not(.empty),.mapnode.reach,.set-btn,.set-toggle,.choice-btn,.btn');
    if(el && !el.disabled) playClickFor(el);
  }, true);
})();

// ---------- 배경음악 (절차적 WebAudio 루프) ----------
let bgmTimer=null, bgmStep=0;
const BGM_BASS=[55.0,55.0,65.4,49.0];
const BGM_ARP =[220.0,261.6,329.6,392.0];
function bgmNote(freq,dur,type,vol){
  if(muted||!audioCtx) return;
  try{
    const o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=audioCtx.currentTime;
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(Math.max(0.0001,vol*bgmVol),t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+dur+0.02);
  }catch(e){}
}
function bgmTick(){
  if(muted||!audioCtx) return;
  const s=bgmStep, beat=s%8;
  if(beat===0||beat===4) bgmNote(BGM_BASS[(s>>3)%BGM_BASS.length],0.42,'triangle',0.05);
  if(beat%2===0){ const hi=(s>>3)%2?1.5:1; bgmNote(BGM_ARP[(beat>>1)%BGM_ARP.length]*hi,0.16,'sine',0.022); }
  bgmStep++;
}
function startBGM(){
  if(typeof MUSIC!=='undefined' && MUSIC.enabled) return; // mp3 음악 사용 시 절차적 BGM 비활성화
  try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
  if(!bgmTimer) bgmTimer=setInterval(bgmTick,165);
}
function stopBGM(){ if(bgmTimer){ clearInterval(bgmTimer); bgmTimer=null; } }

// ---------- 인트로 드론 (낮고 불쾌한 전자음 노이즈) ----------
let introDrone=null, introAudioArmed=false;
function startIntroDrone(){
  if(typeof MUSIC!=='undefined' && MUSIC.enabled) return; // mp3 인트로 음악 사용 시 드론 비활성화
  try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
  if(introDrone||muted||!audioCtx) return;
  try{
    const t=audioCtx.currentTime;
    const o1=audioCtx.createOscillator(), o2=audioCtx.createOscillator();
    const g=audioCtx.createGain(), lfo=audioCtx.createOscillator(), lfoG=audioCtx.createGain();
    o1.type='sawtooth'; o1.frequency.value=51.9;
    o2.type='sawtooth'; o2.frequency.value=53.6;   // 미세한 맥놀이로 불쾌함
    lfo.type='sine'; lfo.frequency.value=0.16; lfoG.gain.value=16;
    lfo.connect(lfoG); lfoG.connect(o1.frequency);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.05*bgmVol, t+1.4);
    o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    o1.start(); o2.start(); lfo.start();
    introDrone={o1,o2,lfo,g};
  }catch(e){}
}
function stopIntroDrone(){
  if(!introDrone) return;
  const d=introDrone; introDrone=null;
  try{
    const t=audioCtx.currentTime;
    d.g.gain.cancelScheduledValues(t);
    d.g.gain.setValueAtTime(Math.max(0.0001,d.g.gain.value||0.04),t);
    d.g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    setTimeout(()=>{ try{ d.o1.stop(); d.o2.stop(); d.lfo.stop(); }catch(e){} }, 280);
  }catch(e){ try{ d.o1.stop(); d.o2.stop(); d.lfo.stop(); }catch(_){}}
}
// 첫 사용자 입력에서 (오디오 정책상) 드론을 깐다 — 아직 시작 화면일 때만
function armIntroAudio(){
  if(introAudioArmed) return; introAudioArmed=true;
  unlockMusic();                       // mp3 음악 잠금 해제
  if(state==='title'||state==='start') startIntroDrone();
}
window.addEventListener('pointerdown', armIntroAudio);
window.addEventListener('keydown', armIntroAudio);

// 페이지 로드 직후 배경음 자동 시작 시도 (브라우저 정책으로 실패해도 괜찮음)
window.addEventListener('load', function(){
  setTimeout(function(){
    try{
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended') audioCtx.resume().then(function(){ armIntroAudio(); }).catch(function(){});
      else armIntroAudio();
    }catch(e){}
  }, 200);
});

// ---------- mp3 배경음악 매니저 ----------
// index.html 과 같은 폴더에 아래 5개의 mp3 파일이 있어야 합니다. (main=시작·난이도 화면)
const MUSIC = {
  enabled:true,
  unlocked:false,
  vol:0.375,                           // 음악 기본 볼륨(배경음 슬라이더와 곱해짐) — 기존 0.75에서 50% 줄임
  tracks:{},
  files:{
    main:    'main.mp3',
    intro:   'intro.mp3',
    act1:    'act1.mp3',
    midboss: 'midboss.mp3',
    boss:    'boss.mp3'
  }
};
(function initMusic(){
  if(!MUSIC.enabled) return;
  for(const k in MUSIC.files){
    try{
      const a=new Audio();
      a.src=encodeURI(MUSIC.files[k]);
      a.loop=true; a.preload='auto'; a.volume=0;
      a.addEventListener('error',()=>{}); // 파일 없으면 조용히 무시
      MUSIC.tracks[k]=a;
    }catch(e){}
  }
})();
// 현재 상황에 맞는 음악 키
function desiredMusicKey(){
  if(state==='title'||state==='start') return 'main'; // 시작화면·난이도 선택 화면 → main.mp3
  if(!runActive) return 'intro';   // 스토리·엔드 등 기타 비전투 화면
  if(roomIsBoss) return 'boss';
  if(roomIsMidboss) return 'midboss';
  return 'act1';                   // 실제 act1 진입 후 — 전투·맵·상점·이벤트·레벨업 등
}
// 첫 사용자 제스처에서 모든 트랙 재생 권한 확보
function unlockMusic(){
  if(!MUSIC.enabled || MUSIC.unlocked) return;
  MUSIC.unlocked=true;
  const want=desiredMusicKey();
  for(const k in MUSIC.tracks){
    const a=MUSIC.tracks[k];
    try{ a.volume=0; const p=a.play(); if(p&&p.then) p.then(()=>{ if(k!==want){ try{a.pause();}catch(e){} } }).catch(()=>{}); }catch(e){}
  }
}
// 매 프레임 호출 — 목표 트랙으로 부드럽게 크로스페이드
function updateMusic(dt){
  if(!MUSIC.enabled || !MUSIC.unlocked) return;
  const want = muted ? null : desiredMusicKey();
  const baseVol = MUSIC.vol * (typeof bgmVol==='number'?bgmVol:1);
  const rate = 2.2*dt;
  for(const k in MUSIC.tracks){
    const a=MUSIC.tracks[k]; if(!a) continue;
    const goal=(k===want)?baseVol:0;
    if(a.volume<goal) a.volume=Math.min(goal,a.volume+rate);
    else if(a.volume>goal) a.volume=Math.max(0,Math.min(1,a.volume-rate));
    if(k===want){
      if(a.paused){ try{ const p=a.play(); if(p&&p.catch)p.catch(()=>{}); }catch(e){} }
    }else if(a.volume<=0.002 && !a.paused){
      try{ a.pause(); }catch(e){}
    }
  }
}


// ---------- 채팅 시스템 ----------

// ===== JS: Chat simulation =====
const chatLog=$('chatLog');
const viewersEl=$('viewers');
const CHATTERS=["김프로","롤좋아","두근두근","abcd123","치킨먹go","quokka","렉그자체","감자도리",
  "야간자율","순두부","익명의기사","ggwp_kr","말차라떼","스나이퍼","눕죽","폭8","코박죽","파오후",
  "갓겜인정","머쓱타드","오함마","빵빵이","옥냥이","핑크퐁","해탈","쿠로미","두부한모","렙업충",
  "ㅋㅋ루삥뽕","스압주의","갱킹중","버스기사","무지성","발컨탈출","존버","사딸라","마기꾼","좌표"];
const EMOTES=["KEKW","LULW","PauseChamp","POGGERS","Sadge","monkaS","EZ","Clap","PepeLaugh","catJAM","COPIUM","GIGACHAD"];
let viewerCount=irand(820,1240);
function vTick(){ viewerCount=clamp(viewerCount+irand(-9,12),300,99999); if(viewersEl) viewersEl.textContent="시청자 "+viewerCount.toLocaleString()+"명"; }
setInterval(vTick,2500); vTick();

function chat(name,text,cls){
  if(!chatLog) return; // 채팅 패널 없음
  const d=document.createElement('div');
  d.className='msg'+(cls?' '+cls:'');
  let body=text.replace(/\b(KEKW|LULW|PauseChamp|POGGERS|Sadge|monkaS|EZ|Clap|PepeLaugh|catJAM|COPIUM|GIGACHAD|PogU)\b/g,'<span class="emote">$1</span>');
  if(cls==='sys'||cls==='evt'){ d.innerHTML='<span class="nm">▸ </span>'+body; }
  else{
    const hue=irand(0,360);
    d.innerHTML='<span class="nm" style="color:hsl('+hue+',70%,72%)">'+name+'</span>: '+body;
  }
  chatLog.appendChild(d);
  while(chatLog.children.length>60) chatLog.removeChild(chatLog.firstChild);
  chatLog.scrollTop=chatLog.scrollHeight;
}
function chatSys(text){ chat('',text,'sys'); }
function chatEvt(text){ chat('',text,'evt'); }
function chatRandom(text){ chat(pick(CHATTERS),text); }

// 분위기용 잡담
const AMBIENT=[
  "이게 로그라이크지","발컨 ㅋㅋ","왜저럼 KEKW","집중해라","뒤에 뒤에!","골드 아껴","풀충해 제발",
  "이번엔 깬다 GIGACHAD","또 맞네 Sadge","유물 잘뽑았다","컨트롤 미쳤다 POGGERS","아 아까비",
  "한놈만 패","무빙 ㄷㄷ","스트리머 손이 운다","치킨 시켰다","LULW","구르기 좀 써","상점 가자",
  "이 빌드 사기임","렉걸렸냐","보스 패턴 외워","도네 룰렛 가즈아","아끼다 똥된다","ㅋㅋ루삥뽕",
  "개잘하네 EZ","이게 되네?","멘탈 잡아","님 좀 치는데?","나라면 죽었다 monkaS"];
let ambientTimer=0;

// ---------- 게임 데이터 ----------

// ===== JS: Data tables - enemies, difficulty, bosses, relics =====
const ENEMY_TYPES={
  // === 1막: 고블린 소굴 ===
  goblin_warrior :{name:"러부엉",  r:16, hp:28, spd:78, dmg:11, color:"#6fae4e", xp:8,  ai:"chase", lunge:true, label:"러부엉"},
  goblin_archer  :{name:"대파",  r:14, hp:18, spd:50, dmg:6,  color:"#7bbf5a", xp:10, ai:"shooter", range:340, cool:1.25, label:"대파"},
  goblin_shaman  :{name:"까치",  r:15, hp:24, spd:66, dmg:7,  color:"#8a6fb0", xp:12, ai:"orbit",   range:240, cool:1.05, label:"까치"},
  goblin_bomber  :{name:"블페러", r:15, hp:22, spd:100, dmg:6,  color:"#9aa83f", xp:11, ai:"chase", explode:true, label:"블페러"},
  rhino_beetle   :{name:"자잘자",   r:24, hp:75, spd:60, dmg:12, color:"#3a2418", xp:14, ai:"charge", label:"자잘자"},
  earthworm      :{name:"지렁이", r:12, hp:10, spd:74, dmg:6, color:"#e87a8a", xp:4, ai:"erratic", label:"지렁이"},
  hyechul        :{name:"혜철이", r:52, hp:170, spd:42, dmg:15, color:"#c0392b", xp:150, ai:"hyechul", label:"혜철이"},
  zergling       :{name:"저글링", r:14, hp:12, spd:120, dmg:7, color:"#c98bff", xp:3, ai:"charge", label:"저글링"},
  mutalisk       :{name:"뮤탈", r:16, hp:16, spd:130, dmg:8, color:"#b97a4a", xp:5, ai:"chase", label:"뮤탈"},
  ultra          :{name:"울트라", r:26, hp:95, spd:52, dmg:20, color:"#8a6f4a", xp:12, ai:"chase", armor:0.25, label:"울트라"},
  zerg_egg       :{name:"저그 알", r:18, hp:24, spd:0, dmg:0, color:"#b8772a", xp:0, ai:"egg", label:"알"},
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
  gwangcheon_gim:{name:"광천김", r:18, hp:45,  spd:40, dmg:7,  color:"#3f7a34", xp:11, ai:"shooter", range:330, cool:1.6, label:"광천김"},
  reura         :{name:"러라",   r:15, hp:36,  spd:90, dmg:10, color:"#ffd166", xp:9,  ai:"chase", lunge:true, label:"러라"},
  namu          :{name:"나무",   r:22, hp:95,  spd:30, dmg:13, color:"#5fa84a", xp:14, ai:"chase",   label:"나무"},
  pobear        :{name:"포베어", r:24, hp:82,  spd:54, dmg:13, color:"#c8884a", xp:13, ai:"charge",  label:"포베어"},
  yanggaeng     :{name:"박제인간", r:54, hp:900, spd:44, dmg:14, color:"#111111", xp:150, ai:"bagjein", cool:2, label:"박제인간"},
  // === 2막 엘리트: 양갱 (3페이즈) ===
  kkotchung     :{name:"양갱", r:32, hp:240, spd:50, dmg:11, color:"#f7a8d0", xp:90,  ai:"kkotchung", cool:1.4, label:"미주"},
};
const ACT_POOLS=[
  { normal:["goblin_warrior","goblin_archer","goblin_shaman","goblin_bomber"], elite:["rhino_beetle"] },
  { normal:["gwangcheon_gim","reura","namu","pobear"], elite:["kkotchung"] },
  { normal:["slime_green","slime_red","slime_yellow","elf_melee","elf_ranged"], elite:["giant_golem","eldritch"] },
];
let minionPool=null;
let tutorial=null;
let tutorialMode=false, tutorialDoneFlag=false;
let floatBubbles=[]; // 적이 사라진 자리에 잠시 떠 있는 말풍선
let lastKiller=null; // 마지막으로 플레이어를 죽인 대상 이름
let pendingLevels=0;
// ---------- 난이도 ----------
const DIFFS={
  easy:  {key:'easy',  label:'쉬움',   hp:1.3, dmg:1.25,cnt:1.1, spd:1.00, eliteCount:2, col:'#5dff9b', desc:'적 체력 x1.3 · 공격 x1.25 · 수 x1.1 · 속도 x1.0 · 정예 2 · 재도전 무제한', maxRetries:Infinity},
  normal:{key:'normal',label:'보통',   hp:2.2, dmg:2.1, cnt:1.45,spd:1.13, eliteCount:3, col:'#ffd34d', desc:'적 체력 x2.2 · 공격 x2.1 · 수 x1.45 · 속도 x1.13 · 정예 3 · 재도전 3회', maxRetries:3},
  hard:  {key:'hard',  label:'어려움', hp:2.9, dmg:2.7, cnt:1.7, spd:1.22, eliteCount:5, col:'#ff4d6d', desc:'적 체력 x2.9 · 공격 x2.7 · 수 x1.7 · 속도 x1.22 · 정예 5 · 재도전 1회', maxRetries:1},
};
let diffSet=DIFFS.easy;
let dodgeLatch=false;   // 회피 키 엣지 감지: 스페이스를 떼야 다음 회피 발동

const BOSSES=[
  {key:"kijo",sprite:"kijo",name:"키죠",title:"1막 보스 · 가면의 마귀",r:70,hp:2200,color:"#c0392b",spd:46,
   quip:"이 가면 뒤가 보이느냐?",pattern:"summon"},
  {key:"steel_lord",sprite:"steel_lord",name:"강철 군주",title:"2막 보스 · 흑철의 망령",r:58,hp:900,color:"#5a5a6e",spd:52,
   quip:"무릎 꿇어라, 필멸자여.",pattern:"spiral"},
  {key:"bear",sprite:"bear",name:"거대 곰",title:"3막 보스 · 숲의 지배자",r:64,hp:1250,color:"#9c6b43",spd:58,
   quip:"크아아아앙!!",pattern:"split"},
  {key:"seungwoo",sprite:"seungwoo",name:"승우",title:"2막 보스 · 시스템 침식",r:64,hp:2450,color:"#9146ff",spd:56,
   quip:"…봉식님. 이 게임, 제가 좀 만져도 되겠습니까.",pattern:"glitch"},
];

// 유물 풀 (병맛 + 효과)
const RELICS=[
  // ===== 축복: 화력 =====
  {id:"coupon",name:"사장님이 미쳤어요 쿠폰",icon:"🏷️",desc:"공격력 +35%.",cls:"boon",apply:p=>{p.dmgMul*=1.35;}},
  {id:"sniper",name:"저격수의 집중",icon:"🎯",desc:"공격력 +30%, 발사 속도 -12%.",cls:"boon",apply:p=>{p.dmgMul*=1.3;p.fireMul*=1.12;}},
  {id:"heavy_cal",name:"대구경 탄두",icon:"🧱",desc:"공격력 +25%, 탄 크기 +25%, 탄속 -10%.",cls:"boon",apply:p=>{p.dmgMul*=1.25;p.bulletSize*=1.25;p.bulletSpeedMul*=0.9;}},
  {id:"bignuke",name:"분노의 대왕탄",icon:"💥",desc:"탄 크기·공격력 +20%, 발사 속도 -10%.",cls:"boon",apply:p=>{p.bulletSize*=1.2;p.dmgMul*=1.2;p.fireMul*=1.1;}},
  {id:"comeback",name:"막판 뒤집기",icon:"🩹",desc:"체력 30% 이하일 때 공격력 +60%.",cls:"boon",apply:p=>{p.lowHpMul+=0.6;}},
  {id:"giant_slayer",name:"거인 사냥꾼",icon:"🗡️",desc:"보스에게 주는 피해 +40%.",cls:"boon",apply:p=>{p.bossDmgMul*=1.4;}},
  // ===== 축복: 치명타 =====
  {id:"crit_glasses",name:"정밀 조준경",icon:"🔍",desc:"치명타 확률 +20%.",cls:"boon",apply:p=>{p.critChance+=0.2;}},
  {id:"crit_hammer",name:"한 방 망치",icon:"🔨",desc:"치명타 피해 +100% (2배→3배).",cls:"boon",apply:p=>{p.critMult+=1;}},
  {id:"clover",name:"네잎클로버",icon:"🍀",desc:"치명타 +12%, 골드 +25%.",cls:"boon",apply:p=>{p.critChance+=0.12;p.goldMul*=1.25;}},
  // ===== 축복: 연사/투사체 =====
  {id:"redbull",name:"수상한 에너지드링크",icon:"🥤",desc:"발사 속도 +30%.",cls:"boon",apply:p=>{p.fireMul*=0.7;}},
  {id:"adrenaline",name:"아드레날린 주사",icon:"💉",desc:"발사 속도 +18%, 이동 속도 +10%.",cls:"boon",apply:p=>{p.fireMul*=0.82;p.spd*=1.1;}},
  {id:"speed_bullet",name:"가속 탄두",icon:"⚡",desc:"투사체 속도 +50%.",cls:"boon",apply:p=>{p.bulletSpeedMul*=1.5;}},
  {id:"fork",name:"세 갈래 포크",icon:"🍴",desc:"투사체 +1발.",cls:"boon",apply:p=>{p.shots+=1;}},
  {id:"harpoon",name:"사두 작살",icon:"🔱",desc:"투사체 +2발.",cls:"boon",apply:p=>{p.shots+=2;}},
  {id:"back_gun",name:"백발백중 등총",icon:"🔙",desc:"뒤로도 한 발 발사.",cls:"boon",apply:p=>{p.backShot=true;}},
  {id:"homing_eye",name:"유도의 눈",icon:"👁️",desc:"투사체가 적을 따라간다.",cls:"boon",apply:p=>{p.homing=12;}},
  {id:"ricochet",name:"탱탱볼 코어",icon:"🔴",desc:"투사체가 벽에서 1회 튕긴다.",cls:"boon",apply:p=>{p.bounce+=1;}},
  {id:"super_bouncy",name:"슈퍼 탱탱볼",icon:"🟣",desc:"투사체 벽 튕김 +2.",cls:"boon",apply:p=>{p.bounce+=2;}},
  {id:"skewer",name:"꼬치 막대기",icon:"🍢",desc:"투사체가 적 1명을 관통.",cls:"boon",apply:p=>{p.pierce+=1;}},
  {id:"long_skewer",name:"긴 꼬치",icon:"🍡",desc:"투사체 관통 +2.",cls:"boon",apply:p=>{p.pierce+=2;}},
  // ===== 축복: 군중제어/폭발 =====
  {id:"stun_bell",name:"기절의 종",icon:"🔔",desc:"명중 시 25% 확률로 적 기절.",cls:"boon",apply:p=>{p.stunChance+=0.25;}},
  {id:"chain_bomb",name:"연쇄 폭탄",icon:"💣",desc:"적 처치 시 주변에 폭발 피해.",cls:"boon",apply:p=>{p.explodeKill+=24;}},
  // ===== 축복: 생존 =====
  {id:"bread",name:"곰팡이 핀 식빵",icon:"🍞",desc:"최대 체력 +25.",cls:"boon",apply:p=>{p.maxhp+=25;p.hp+=25;}},
  {id:"big_heart",name:"거대한 심장",icon:"❤️‍🔥",desc:"최대 체력 +50.",cls:"boon",apply:p=>{p.maxhp+=50;p.hp+=50;}},
  {id:"nature_bless",name:"자연의 가호",icon:"🌿",desc:"초당 체력 +1.5 재생.",cls:"boon",apply:p=>{p.regen+=1.5;}},
  {id:"iron_skin",name:"강철 피부",icon:"🪨",desc:"받는 피해 -20%.",cls:"boon",apply:p=>{p.armor+=0.2;}},
  {id:"vampire",name:"모기향(역효과)",icon:"🦟",desc:"처치 시 8% 확률로 체력 5 회복.",cls:"boon",apply:p=>{p.lifesteal+=0.08;}},
  {id:"vampire_fang",name:"흡혈귀 송곳니",icon:"🧛",desc:"처치 시 18% 확률로 체력 5 회복.",cls:"boon",apply:p=>{p.lifesteal+=0.18;}},
  {id:"front_shield",name:"선제 방패",icon:"🛡️",desc:"방 입장 시 2초간 무적.",cls:"boon",apply:p=>{p.roomShield=Math.max(p.roomShield,2);}},
  // ===== 축복: 기동/유틸 =====
  {id:"sneaker",name:"한 짝뿐인 운동화",icon:"👟",desc:"이동 속도 +18%.",cls:"boon",apply:p=>{p.spd*=1.18;}},
  {id:"roll_master",name:"베인Q 숙련",icon:"🌀",desc:"베인Q 쿨 -35%.",cls:"boon",apply:p=>{p.dodgeCdMul*=0.65;}},
  {id:"magnet",name:"강력 자석",icon:"🧲",desc:"골드/회복 흡수 범위 대폭 증가.",cls:"boon",apply:p=>{p.magnet*=2.2;}},
  {id:"giant_magnet",name:"초강력 자석",icon:"🌟",desc:"흡수 범위 증가 + 골드 +20%.",cls:"boon",apply:p=>{p.magnet*=2;p.goldMul*=1.2;}},
  {id:"gold_pig",name:"황금 돼지 저금통",icon:"🐷",desc:"골드 획득 +60%.",cls:"boon",apply:p=>{p.goldMul*=1.6;}},
  {id:"xp_book",name:"경험의 서",icon:"📖",desc:"경험치 획득 +40%.",cls:"boon",apply:p=>{p.xpMul*=1.4;}},
  {id:"potion_belt",name:"비상용 물약 벨트",icon:"🧪",desc:"즉시 랜덤 포션 1개 획득.",cls:"boon",apply:p=>{addPotion(pick(POTIONS));}},
  // ===== 저주: 양날의 검 =====
  {id:"glass",name:"유리 대포",icon:"🔮",desc:"공격력 +80%. 최대 체력 -40%.",cls:"curse",apply:p=>{p.dmgMul*=1.8;p.maxhp=Math.round(p.maxhp*0.6);p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"berserk",name:"광전사의 분노",icon:"🩸",desc:"공격력 +60%. 받는 피해 +20%.",cls:"curse",apply:p=>{p.dmgMul*=1.6;p.armor-=0.2;}},
  {id:"heavy_ammo",name:"무거운 탄약",icon:"🏋️",desc:"공격력 +50%. 이동 속도 -20%.",cls:"curse",apply:p=>{p.dmgMul*=1.5;p.spd*=0.8;}},
  {id:"hair_trigger",name:"예민한 방아쇠",icon:"🔫",desc:"발사 속도 +60%. 탄 크기 -25%.",cls:"curse",apply:p=>{p.fireMul*=0.625;p.bulletSize*=0.75;}},
  {id:"recoil",name:"강한 반동",icon:"🌪️",desc:"발사 속도 +40%. 가끔 오발.",cls:"curse",apply:p=>{p.fireMul*=0.7;p.misfire=true;}},
  {id:"cheat",name:"치트키(가짜)",icon:"⌨️",desc:"발사 속도 +50%. 가끔 오발.",cls:"curse",apply:p=>{p.fireMul*=0.5;p.misfire=true;}},
  {id:"one_shot",name:"모 아니면 도",icon:"💀",desc:"공격력 +130%. 최대 체력 50 고정.",cls:"curse",apply:p=>{p.dmgMul*=2.3;p.maxhp=50;p.hp=Math.min(p.hp,50);}},
  {id:"thin_glass",name:"더 얇은 유리",icon:"🪟",desc:"치명타 +30%. 받는 피해 +25%.",cls:"curse",apply:p=>{p.critChance+=0.3;p.armor-=0.25;}},
  {id:"time_bomb",name:"시한폭탄 심장",icon:"⏱️",desc:"공격력 +45%. 초당 체력 -1.",cls:"curse",apply:p=>{p.dmgMul*=1.45;p.regen-=1;}},
  {id:"greed",name:"탐욕의 손",icon:"🤑",desc:"골드 +120%. 최대 체력 -25%.",cls:"curse",apply:p=>{p.goldMul*=2.2;p.maxhp=Math.round(p.maxhp*0.75);p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"slippery",name:"미끄러운 신발",icon:"🧊",desc:"이동 속도 +40%. 베인Q 쿨 +50%.",cls:"curse",apply:p=>{p.spd*=1.4;p.dodgeCdMul*=1.5;}},
  {id:"glass_legs",name:"유리 다리",icon:"🦵",desc:"이동 속도 +30%. 최대 체력 -20%.",cls:"curse",apply:p=>{p.spd*=1.3;p.maxhp=Math.round(p.maxhp*0.8);p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"turtle",name:"거북이 등딱지",icon:"🐢",desc:"받는 피해 -30%. 이동 속도 -15%.",cls:"curse",apply:p=>{p.armor+=0.3;p.spd*=0.85;}},
  {id:"all_in",name:"올인",icon:"🎰",desc:"공격력 +70%. 받는 피해 +30%.",cls:"curse",apply:p=>{p.dmgMul*=1.7;p.armor-=0.3;}},
  {id:"gamble",name:"도박꾼의 주사위",icon:"🎲",desc:"매 발사 공격력 0.6~1.8배 도박.",cls:"curse",apply:p=>{p.gamble=true;}},
  {id:"cursed_mask",name:"저주받은 가면",icon:"👺",desc:"공격·연사·이동 소폭↑. 초당 체력 -0.6.",cls:"curse",apply:p=>{p.dmgMul*=1.2;p.fireMul*=0.9;p.spd*=1.1;p.regen-=0.6;}},
];
// ---------- 유물 등급 ----------
const TIERS={
  rare:   {name:'희귀',   col:'#8be8ff', weight:60, costMul:1.0, glow:0},
  epic:   {name:'영웅',   col:'#c98bff', weight:26, costMul:1.4, glow:0},
  legend: {name:'전설',   col:'#ffd34d', weight:11, costMul:2.0, glow:1},
  unique: {name:'유니크', col:'#ffae42', weight:3,  costMul:3.0, glow:2},
};
const _UNIQUE=['homing_eye','one_shot','guardian_angel','glass'];
const _LEGEND=['harpoon','fork','redbull','long_skewer'];
const _EPIC=['coupon','sniper','heavy_cal','bignuke','comeback','giant_slayer','crit_glasses','crit_hammer','clover','speed_bullet','skewer','super_bouncy','stun_bell','chain_bomb','big_heart','iron_skin','nature_bless','vampire_fang','berserk','heavy_ammo','hair_trigger'];
const TIER_OF={};
RELICS.forEach(r=>{ TIER_OF[r.id]=_UNIQUE.includes(r.id)?'unique':_LEGEND.includes(r.id)?'legend':_EPIC.includes(r.id)?'epic':'rare'; });
function relicTier(r){ return TIERS[TIER_OF[r.id]||'rare']; }
function relicWeight(r){ return relicTier(r).weight; }
function weightedTake(arr){
  let total=0; for(const r of arr) total+=relicWeight(r);
  let roll=Math.random()*total;
  for(let i=0;i<arr.length;i++){ roll-=relicWeight(arr[i]); if(roll<=0) return arr.splice(i,1)[0]; }
  return arr.splice(arr.length-1,1)[0];
}
const RELIC_PIXDATA=[{n:"사장님이 미쳤어요 쿠폰",p:{"y":"#e0b341","d":"#2c2c2a"},g:["................","................","......yyyyyyyy..",".....yyyyyyyyy..","....yyyyyyyyyy..","...yydyyyyyyyy..","..yyddyyyyyyyy..",".yyddyyyyyyyyy..","..yyddyyyyyyyy..","...yydyyyyyyyy..","....yyyyyyyyyy..",".....yyyyyyyyy..","......yyyyyyyy..","................","................","................"]},
{n:"저격수의 집중",p:{"r":"#e24b4a","w":"#eef2f8","X":"#2c2c2a"},g:["................",".....rrrrr......","...rrrrrrrrr....","..rrrwwwwwrrr...","..rrwwwwwwwrr...",".rrwwwrrrwwwrr..",".rrwwrrXrrwwrr..",".rrwwwrrrwwwrr..","..rrwwwwwwwrr...","..rrrwwwwwrrr...","...rrrrrrrrr....",".....rrrrr......","................","................","................","................"]},
{n:"대구경 탄두",p:{"r":"#b85c3c","h":"#d88a6a","d":"#7a3b22"},g:["................","................","................","..hhhhhhhhhhhh..","..rrrrrrrrrrrh..","..rrrddrrrrrrh..","..rrrrrrrrrrrh..","..rrrrrrrddrrh..","..rrrrrrrrrrrh..","..rrddrrrrrrrh..","..rrrrrrrrrrrh..","..dddddddddddd..","................","................","................","................"]},
{n:"분노의 대왕탄",p:{"y":"#ffd24a","o":"#ef9f27","w":"#fff2b0"},g:["................",".......yy.......","....y..oo..y....",".....y.oo.y.....","......yooy......","..yyyyoooyyyy...","...yoowwooy.....","...yowwwwoy.....","...yoowwooy.....","..yyyyoooyyyy...","......yooy......",".....y.oo.y.....","....y..oo..y....",".......yy.......","................","................"]},
{n:"막판 뒤집기",p:{"b":"#e0997b","h":"#f5c4b3","d":"#993c1d"},g:["................","................","................","...bbbbbbbbb....","..bbhhhhhhhbb...","..bhdhdhdhdhb...","..bhhhhhhhhhb...","..bhdhdhdhdhb...","..bbhhhhhhhbb...","...bbbbbbbbb....","................","................","................","................","................","................"]},
{n:"거인 사냥꾼",p:{"h":"#eef2f8","s":"#a9b2bf","G":"#e0b341","o":"#9a6a1d","B":"#7c4f2c"},g:["..............h.",".............hsh","............hsh.","...........hsh..","..........hsh...",".........hsh....","........hsh.....",".......hsh......","......GGGGG.....",".....GoooG......",".......B........","......BBB.......",".......B........","......GGG.......","................","................"]},
{n:"정밀 조준경",p:{"g":"#378add","w":"#cce4ff","h":"#5f5e5a"},g:["................","...gggg.........","..g....g........",".g..ww..g.......",".g.w....g.......","g.......g.......","g.......g.......","g.......g.......",".g.....g........","..g...gg........","...gggg.hh......",".......h.hh.....","........h.hh....",".........h.hh...","..........h.h...","................"]},
{n:"한 방 망치",p:{"s":"#a9b2bf","h":"#eef2f8","d":"#5f5e5a","B":"#7c4f2c"},g:["................","...ssssssss.....","..ssssssssss....","..shsssssssd....","..ssssssssssd...","..ssssssssssd...","....ddsBBsdd....","......BBBB......","......BBBB......",".......BB.......",".......BB.......",".......BB.......",".......BB.......",".......BB.......","................","................"]},
{n:"네잎클로버",p:{"g":"#639922","h":"#aee05a","c":"#3b6d11","s":"#6b4a2b"},g:["................","...gg....gg.....","..gggg..gggg....",".ggggg..ggggg...",".gggggh.ggggg...","..gggg..gggg....","....g.cc.g......","..gggg..gggg....",".ggggg..ggggg...",".ggggg..ggggg...","..gggg..gggg....","...gg.ss.gg.....",".....ss.........","......s.........","................","................"]},
{n:"수상한 에너지드링크",p:{"c":"#d3d1c7","l":"#f7a8ab","L":"#e24b4a","s":"#85b7eb"},g:["................","..........ss....",".........ss.....","........ss......",".......ss.......","..ccccccccc.....","..clllllllc.....","..cLLLLLLLc.....","..cLLLLLLLc.....","..cLLLLLLLc.....","...cLLLLLc......","...cLLLLLc......","....ccccc.......","................","................","................"]},
{n:"아드레날린 주사",p:{"p":"#888780","b":"#b4b2a9","L":"#ffd24a","n":"#c8ccd4"},g:["................","................","..p.............","..p.bbbbbbbb....","..p.bLLLLLLb....","..pppLLLLLLb.nnn","..p.bLLLLLLb....","..p.bbbbbbbb....","..p.............","................","................","................","................","................","................","................"]},
{n:"가속 탄두",p:{"Y":"#ffd24a","o":"#d9971f","w":"#fff2b0"},g:["................","........YY......",".......YYo......","......YYo.......",".....YYo........","....YYYYo.......","...YYYYYo.......","...wYYYo........",".....YYo........","....YYo.........","...YYo..........","..YYo...........",".YYo............",".Yo.............","................","................"]},
{n:"세 갈래 포크",p:{"s":"#c8ccd4","d":"#888780"},g:["................","...s..s..s......","...s..s..s......","...s..s..s......","...sssssss......","....sssss.......",".....sss........",".....sss........",".....sss........",".....sss........",".....sss........",".....sss........",".....sss........",".....sss........","................","................"]},
{n:"사두 작살",p:{"s":"#a9b2bf","G":"#e0b341","d":"#5f5e5a"},g:["................",".s...s...s...s..",".s...s...s...s..",".ss..s...s..ss..","..s..s...s..s...","..sssssssssss...","......GGG.......",".......s........",".......s........",".......s........",".......s........",".......s........","......ddd.......","................","................","................"]},
{n:"백발백중 등총",p:{"h":"#85b7eb","s":"#cce4ff"},g:["................","................","....h.....h.....","...hh.....hh....","..hhhsssssshhh..","...hh.....hh....","....h.....h.....","................","................","................","................","................","................","................","................","................"]},
{n:"유도의 눈",p:{"w":"#eef2f8","b":"#85b7eb","B":"#378add","p":"#042c53"},g:["................","................","....wwwwww......","..wwwwwwwwww....",".wwwwbbbbwww....",".wwwbBBBBbww....","wwwbBBppBBbww...",".wwwbBBBBbww....",".wwwwbbbbww.....","..wwwwwwww......","....wwww........","................","................","................","................","................"]},
{n:"탱탱볼 코어",p:{"R":"#e24b4a","h":"#f7a8ab","d":"#a32d2d","a":"#85b7eb"},g:["................","................","......ddd.......",".....dRRRd......",".....dRhRd......",".....dRRRd......","......ddd.......",".......a.......",".....a...a.....","....a.....a....","................","................","................","................","................","................"]},
{n:"슈퍼 탱탱볼",p:{"P":"#7f77dd","h":"#cecbf6","d":"#3c3489","a":"#85b7eb"},g:["................","................","......ddd.......",".....dPPPd......",".....dPhPd......",".....dPPPd......","......ddd.......","....a.....a.....","...a.......a....","..a.........a...",".a...........a..","................","................","................","................","................"]},
{n:"꼬치 막대기",p:{"O":"#e8c39a","h":"#fff2d8","p":"#ed93b1","s":"#7c4f2c"},g:["................",".......s........",".......s........","....OOOOOO......","...OOOOOOOO.....","...OOhOOpOO.....","...OOOOpOOO.....","...OOOOOOOO.....","....OOOOOO......",".......s........",".......s........",".......s........",".......s........","................","................","................"]},
{n:"긴 꼬치",p:{"p":"#f4c0d1","g":"#c0dd97","w":"#eef2f8","s":"#7c4f2c"},g:["................",".......s........",".....ppppp......",".....ppppp......",".....ppppp......",".......s........",".....ggggg......",".....ggggg......",".....ggggg......",".......s........",".....wwwww......",".....wwwww......",".....wwwww......",".......s........","................","................"]},
{n:"기절의 종",p:{"a":"#854f0b","y":"#ef9f27","w":"#fac775"},g:["................",".......y........","......yyy.......",".....ywwwy......","....ywwwwwy.....","...ywwwwwwwy....","...ywwwwwwwy....","..ywwwwwwwwwy...","..ywwwwwwwwwy...",".ayyyyyyyyyyya..","................",".......aa.......","......ayya......",".......aa.......","................","................"]},
{n:"연쇄 폭탄",p:{"K":"#2c2c2a","h":"#5f5e5a","y":"#ffd24a","o":"#ef9f27","w":"#fff2b0"},g:["................","...........w....","..........yw....",".........yo.....","........y.......",".......w........","....KKKKKK......","...KKKKKKKK.....","..KKKKKKKKKK....","..KKhKKKKKKK....","..KKKKKKKKKK....","..KKKKKKKKKK....","...KKKKKKKK.....","....KKKKKK......","................","................"]},
{n:"곰팡이 핀 식빵",p:{"c":"#b07c4a","h":"#f0d9a8","m":"#639922"},g:["................","................","....ccccccc.....","...ccccccccc....","..cchhhhhhcc....","..chhmhhhhhc....",".cchhhhhhhhcc...",".chhhhhhmhhc....",".chhhhhhhhhhc...",".chhmhhhhhhc....",".cchhhhhhhhcc...","..cccccccccc....","................","................","................","................"]},
{n:"거대한 심장",p:{"H":"#e24b4a","o":"#ef9f27","w":"#fff2b0"},g:["................",".....o..o......","....ooo.ooo.....","...HH.ooo.HH....","..HHHHoooHHHH...","..HHHHHHHHHHHH..","..HHHHHHHHHHHH..","...HHHHHHHHHH...","....HHHHHHHH....",".....HHHHHH.....","......HHHH......",".......HH.......","................","................","................","................"]},
{n:"자연의 가호",p:{"g":"#3b6d11","l":"#7cbf2e","h":"#aee05a","s":"#6b4a2b"},g:["................",".......l........","......lhl.......",".....lhhhl......","....lhhglhl.....","...lhglllghl....","...lhlllllhl....","....lhgllhl.....",".....glhlg......","......sss.......",".......s........",".......s........",".......s........","......sss.......","................","................"]},
{n:"강철 피부",p:{"s":"#888780","h":"#b4b2a9","d":"#5f5e5a"},g:["................","................",".....sssss......","...ssssssss.....","..ssshsssss.s...",".ssshhhssssss...",".ssssssssssss...",".ssssssssssss...",".sssssssssssd...",".ssssssssssdd...","..dddddddddd....","................","................","................","................","................"]},
{n:"모기향 (역효과)",p:{"K":"#2c2c2a","w":"#b5d4f4"},g:["................","...w......w.....","..ww......ww....","..ww.KKK..ww....","...wKKKKKw......","....KKKKK.......","....KKKKK.......","...K.KKK.K......","..K..KKK..K.....",".K...KKK...K....",".....K.........","....K..........","...K...........","................","................","................"]},
{n:"흡혈귀 송곳니",p:{"K":"#2c2c2a","r":"#e24b4a"},g:["................","................","K....KKKK....K..","KK..KKKKKK..KK..","KKKKKKKKKKKKKK..",".KKKKKKKKKKKK...","..KKKrKKrKKK....","...KKKKKKKK.....","....KKKKKK......",".....KKKK.......","......KK........","................","................","................","................","................"]},
{n:"수호천사",p:{"Y":"#e0b341","w":"#eef2f8","o":"#9a6a1d"},g:["................","....YYYYYY......","...Yo....oY.....","...Y......Y.....","...Yo....oY.....","....YYYYYY......","................","...w......w.....","..ww.wwww.ww....",".ww.wwwwww.ww...","..w.wwwwww.w....","....wwwwww......",".....wwww.......","................","................","................"]},
{n:"선제 방패",p:{"d":"#274a6e","f":"#4f86c6","h":"#9cc4ee"},g:["................","...dddddddd.....","..dffffffffd....","..dfhffffffd....","..dffffffffd....","..dffffffffd....","..dffffffffd....","...dffffffd.....","...dffffffd.....","....dffffd......","....dffffd......",".....dffd.......","......dd........","................","................","................"]},
{n:"한 짝뿐인 운동화",p:{"B":"#d85a30","w":"#eef2f8","d":"#993c1d"},g:["................","......w.........","....wwww........","..wwww..BB......",".ww....BBBB.....","......BBBBBB....","......BBBBBB....","......BBBBBB....",".....BBBBBBB....","....BBBBBBBBB...","...BBBBBBBBBBB..","..wwwwwwwwwwww..","..wddddddddddw.","................","................","................"]},
{n:"베인Q 숙련",p:{"p":"#5dcaa5","h":"#9fe1cb"},g:["................",".....ppppp......","...pp.....pp....","..p.........p...",".p...........p..",".p....p..p...pp.",".p...........ppp",".p...........p..","..p.........p...","...pp.....pp....",".....ppppp......","................","................","................","................","................"]},
{n:"강력 자석",p:{"R":"#e24b4a","s":"#c8ccd4","h":"#eef2f8","d":"#a32d2d"},g:["................","...RRRRRRRRRR...","..RRRRRRRRRRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..RRRd....dRRR..","..sss......sss..","..sss......sss..","..hhs......shh..","................","................","................"]},
{n:"초강력 자석",p:{"Y":"#ffd24a","w":"#fff2b0"},g:["................",".......Y........",".......Y........","......YYY.......","......YYY.......","..YYYYYwYYYYY...","...YYYYwYYYY....","....YYYwYYY.....","....YYYYYYY.....","...YYYY.YYYY....","..YYY....YYY....","..YY......YY....","................","................","................","................"]},
{n:"황금 돼지 저금통",p:{"P":"#f4c0d1","S":"#ed93b1","n":"#993556","d":"#72243e"},g:["................","................","...d......d.....","..PP......PP....",".PPPPPPPPPPPP...",".PPPPddddPPPP...",".PPPPPPPPPPPPP..","PPnPPPPPPPPPnP..","PPPPPPPPPPPPPP..","PPPPPPSSPPPPPP..","PPPPPPnnPPPPPP..",".PPPPPPPPPPPP...","..P.PP..PP.P...","..P.PP..PP.P...","................","................"]},
{n:"경험의 서",p:{"b":"#378add","w":"#eef2f8","l":"#888780"},g:["................","................","...bb....bb.....","..bwwb..bwwb....",".bwwwwbbwwwwb...",".bwllwbbwllwb...",".bwwwwbbwwwwb...",".bwllwbbwllwb...",".bwwwwbbwwwwb...",".bwllwbbwllwb...",".bwwwwbbwwwwb...",".bbbbbbbbbbbb...","................","................","................","................"]},
{n:"비상용 물약 벨트",p:{"c":"#7c4f2c","n":"#b5d4f4","g":"#b5d4f4","L":"#97c459"},g:["................","......cccc......","......cccc......",".......nn.......",".......nn.......","......gLLg......",".....gLLLLg.....","....gLLLLLLg....","...gLLLLLLLLg...","...gLLLLLLLLg...","...gLLLLLLLLg...","...gLLLLLLLLg...","....gLLLLLLg....",".....gLLLLg.....","......gggg......","................"]},
{n:"유리 대포",p:{"P":"#7f77dd","w":"#eef2f8","p":"#534ab7","s":"#9a6a1d"},g:["................",".....ppppp......","...ppPPPPPpp....","..pPPwwPPPPPp...","..pPwwPPPPPPp...",".pPPPPPPPPPPPp..",".pPPPPPPPPPPPp..",".pPPPPPPPPPPPp..","..pPPPPPPPPPp...","...ppPPPPPpp....",".....ppppp......","....sssssss.....","...sssssssss....","................","................","................"]},
{n:"광전사의 분노",p:{"R":"#b51d2d","r":"#e24b4a","w":"#f7a8ab","d":"#791f1f"},g:["................",".......d........",".......d........","......drd.......","......drd.......",".....drRrd......",".....drRrd......","....drRRRrd.....","...drRRRRRrd....","...drRwRRRrd....","...drRwRRRrd....","...drRRRRRrd....","....drRRRrd.....",".....dddrd......",".......dd.......","................"]},
{n:"무거운 탄약",p:{"K":"#2c2c2a","s":"#888780"},g:["................","................","................",".KK........KK...","KKKK......KKKK..","KKKK......KKKK..","KKKKssssssKKKK..","KKKKssssssKKKK..","KKKK......KKKK..","KKKK......KKKK..",".KK........KK...","................","................","................","................","................"]},
{n:"예민한 방아쇠",p:{"K":"#444441","h":"#888780"},g:["................","................","..KKKKKKKKKK....","..KhKKKKKKKK....","..KKKKKKKKKKK...","..KKK..KKKKK....","..KKK.K........","..KKKKK........","...KKKK........","...KKKK........","...KKKK........","................","................","................","................","................"]},
{n:"강한 반동",p:{"w":"#85b7eb","h":"#b5d4f4","d":"#185fa5"},g:["................","..hhhhhhhhhh....","...wwwwwwww.....","...dwwwwwd......","....wwwww.......","....dwwwd.......",".....wwww.......","......www.......",".....ddw........","......ww........",".......w........",".......d........","................","................","................","................"]},
{n:"치트키 (가짜)",p:{"d":"#2c2c2a","w":"#b4b2a9"},g:["................","................","................","..dddddddddddd..","..dwdwdwdwdwdd..","..dddddddddddd..","..dwdwdwdwdwdd..","..dddddddddddd..","..dwwwwwwwwwdd..","..dddddddddddd..","................","................","................","................","................","................"]},
{n:"모 아니면 도",p:{"w":"#eef2f8","K":"#2c2c2a"},g:["................","....wwwwww......","...wwwwwwww.....","..wwwwwwwwww....","..wwKKwwKKww....","..wwKKwwKKww....","..wwwwwwwwww....","...wwwKKwww.....","...wwwwwwww.....","....wKwKwKw.....","....wwwwwww.....","................","................","................","................","................"]},
{n:"더 얇은 유리",p:{"b":"#7c4f2c","G":"#b5d4f4","w":"#eef2f8"},g:["................","................","..bbbbbbbbbbbb..","..bGGGGbGGGGGb..","..bGwGGbGGGGGb..","..bGGGGbGGGGGb..","..bbbbbbbbbbbb..","..bGGGGbGGGGGb..","..bGGGGbGGGGGb..","..bGGGGbGGGGGb..","..bbbbbbbbbbbb..","................","................","................","................","................"]},
{n:"시한폭탄 심장",p:{"d":"#444441","w":"#eef2f8","r":"#e24b4a"},g:["................",".......dd.......",".....dddddd.....","....dwwwwwwd....","...dwwwwwwwwd...","...dwwwrwwwwd...","...dwwwrwwwwd...","...dwwwrrrwwd...","...dwwwwwwwwd...","....dwwwwwwd....",".....dddddd.....","................","................","................","................","................"]},
{n:"탐욕의 손",p:{"G":"#e0b341","d":"#9a6a1d","Y":"#fff0b8"},g:["................","................","..GGGGGGGGGG....","..GddddddddG....","..Gd..YY..dG....","..Gd.Y..Y.dG....","..Gd..YY..dG....","..Gd....Y.dG....","..Gd.Y..Y.dG....","..Gd..YY..dG....","..GddddddddG....","..GGGGGGGGGG....","................","................","................","................"]},
{n:"미끄러운 신발",p:{"c":"#85b7eb","h":"#cce4ff","w":"#ffffff"},g:["................","................","...cccccccc.....","..chhhhhhhhc....","..chwhhhhhhc....","..chhhhhhhhc....","..chhhhhhhhc....","..chhhhhhhhc....","..chhhhhhhhc....","..chhhhhhhhc....","...cccccccc.....","................","................","................","................","................"]},
{n:"유리 다리",p:{"s":"#b5d4f4","w":"#eef2f8"},g:["................","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssss......","......ssssss....","......ssssssss..","......ssss......","................","................"]},
{n:"거북이 등딱지",p:{"S":"#639922","d":"#3b6d11","l":"#27500a","g":"#97c459"},g:["................","................","........gg......","...l..SSSSSS..l.","..ll.SSdSdSSS.l.",".....SdSdSdS....",".....SSdSdSS....","..ll.SSSSSS..ll.","...l........l...","................","................","................","................","................","................","................"]},
{n:"올인",p:{"d":"#444441","w":"#eef2f8","r":"#e24b4a","L":"#888780","o":"#e24b4a","G":"#e0b341"},g:["................","...dddddddd.....","..dddddddddd.o..","..dwwwwwwwwd.L..","..dwrwrwrwwd.L..","..dwwwwwwwwd.L..","..dddddddddd....","..d.dddddd.d....","..d.dGdGd..d....","..dddddddddd....","...d......d.....","................","................","................","................","................"]},
{n:"도박꾼의 주사위",p:{"w":"#eef2f8","d":"#e24b4a"},g:["................","................","...wwwwwwww.....","..wwwwwwwwww....","..wdwwwwwwdw....","..wwwwwwwwww....","..wwwwddwwww....","..wwwwddwwww....","..wdwwwwwwdw....","..wwwwwwwwww....","...wwwwwwww.....","................","................","................","................","................"]},
{n:"저주받은 가면",p:{"r":"#e24b4a","W":"#ffffff","K":"#2c2c2a","w":"#eef2f8"},g:["................","..rrrrrrrrrr....",".rrrrrrrrrrrr...",".rWWrrrrrrWWr...",".rWKrrrrrrKWr...",".rrrrrKKrrrrr...",".rrrrrrrrrrrr...","..rrrrKKrrrr....","...rrrKKrrr.....","....rrrrrr......","....wwwwww......","....wKwKww......",".....wwww.......","................","................","................"]}];
// 16×16 픽셀 그리드 → data URL 렌더 (업로드된 픽셀아트 세트)
const RELIC_PIX={};
(function buildRelicPix(){
  const norm=s=>(s||'').replace(/\s+/g,'');
  try{
    for(const d of RELIC_PIXDATA){
      const cv=document.createElement('canvas'); cv.width=16; cv.height=16;
      const cx=cv.getContext('2d');
      d.g.forEach((row,y)=>{ for(let x=0;x<16;x++){ const ch=row[x]; if(ch&&ch!=='.'&&d.p[ch]){ cx.fillStyle=d.p[ch]; cx.fillRect(x,y,1,1); } } });
      RELIC_PIX[norm(d.n)]=cv.toDataURL('image/png');
    }
  }catch(e){ console.warn('렐릭 픽셀아트 생성 실패 — 일부 아이콘이 표시되지 않을 수 있음:', e); }
})();
function relicPixSrc(name){ return RELIC_PIX[(name||'').replace(/\s+/g,'')]||null; }
function relicIconHTML(r,cls){
  const src=relicPixSrc(r&&r.name);
  if(src) return '<img class="'+(cls||'relic-pix')+'" src="'+src+'" alt="">';
  return (r&&r.icon)||'•';
}

function relicCardHTML(r){
  const t=relicTier(r);
  const curse=r.cls==='curse'?' <span style="color:#ff6b6b;font-size:10px">⚠저주</span>':'';
  return '<div class="ttl"><span class="icon">'+relicIconHTML(r,'relic-pix')+'</span>'+r.name+
    ' <span class="grade" style="color:'+t.col+'">['+t.name+']</span>'+curse+'</div>'+
    '<div class="desc">'+r.desc+'</div>';
}

// ---------- 입력 ----------

// ===== JS: Input handling and runtime state =====
const keys={};
let mouseX=W/2, mouseY=H/2, mouseDown=false;
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='escape'){
    togglePause(); e.preventDefault(); return;
  }
  keys[k]=true;
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k)) e.preventDefault();
  // K키는 paused 여부와 관계없이 항상 처리 (트리 닫기)
  if((k==='k') && (state==='play'||state==='map')){
    if(treeOpen) closeTree(); else openTree();
    return;
  }
  if(paused) return;                 // 일시정지 중엔 게임 입력 무시
  if(state==='play'){ if(k==='1')usePotion(0); else if(k==='2')usePotion(1); else if(k==='3')usePotion(2); }
});
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
function canvasPos(e){
  const r=cvs.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height)};
}
cvs.addEventListener('mousemove',e=>{const p=canvasPos(e);mouseX=p.x;mouseY=p.y;});
let autoFire=false;
cvs.addEventListener('mousedown',e=>{ mouseDown=true; if(typeof GS!=='undefined'&&GS.fireToggle){ autoFire=!autoFire; } });
window.addEventListener('mouseup',()=>{mouseDown=false;});
cvs.addEventListener('contextmenu',e=>e.preventDefault());

// ---------- 게임 상태 ----------
let state='title'; // title, start, play, door, relic, shop, vote, end, help
let prevState='play';
const player={};
let enemies=[], pBullets=[], eBullets=[], pickups=[], particles=[];
let totalKills=0, kills=0, gold=0, level=1, xp=0, xpNext=20;
let roomCleared=false, roomIsBoss=false, boss=null, bossBanner=0, roomHadElite=false;
let eliteViewerSpawns=0;   // 자잘자(엘리트 시청자) 런 전체 출몰 횟수 — 최대 1회로 제한
let roomIsMidboss=false, runActive=false;   // 음악 컨텍스트용 플래그
let eliteIntro=null, slowmoT=0;
let sfxVol=1, bgmVol=1;
let bossEvolve=null;
let shopIntroShown=false;
let hazards=[];
let kijoMasks=[], kijoGazes=[], kijoParades=[];
let tierIntroShown=false;
let screenShake=0, hitFlash=0;
// ── 이벤트 → 다음 전투/보상에 적용되는 모디파이어 ──
let nextCombatMods=null;      // {hpMul,spdMul,cntMul,fireHandicap,rewardMul,ally,challenge,banner}
let combatRewardMul=1;        // 이번 전투 보상 배수
let combatChallenge=null;     // 'nohit' 등 도전 조건
let combatTookHit=false;      // 이번 전투 피격 여부
let combatTempAlly=false;     // 이번 전투 한정 아군 여부
let nextGoldPenalty=0;        // 다음 전투 보상 골드 감소(0~1)
let act=1, mapData=null, currentRow=0;
const MAX_ACT=2;
const ACT_BOSS=[0,3,2]; // 1막 키죠 / 2막 승우(글리치) / 3막 거대 곰
let timeScale=1;
function resetPlayer(){
  Object.assign(player,{
    x:W/2,y:H/2,r:14,hp:70,maxhp:70,spd:175,
    dmg:7,dmgMul:1,fireMul:1,fireAdd:0,fireTimer:0,shots:1,
    bulletSize:1,bounce:0,pierce:0,lifesteal:0,armor:0,magnet:60,
    misfire:false,gamble:false,
    dodgeCd:0,dodging:0,iframes:0,relics:[],facing:0,
    potions:[], buffs:{rage:0,haste:0,shield:0},
    critChance:0,critMult:2,regen:0,regenAcc:0,goldMul:1,xpMul:1,bulletSpeedMul:1,
    stunChance:0,explodeKill:0,reviveOnce:false,usedRevive:false,bossDmgMul:1,
    lowHpMul:0,dodgeCdMul:1,roomShield:0,homing:0,backShot:false,
    burn:0,chill:0,poison:0,bulletExplode:0,
    doubleTap:0,chargeShot:false,lastShot:0,
    thorns:0,healOnKill:0,donateChance:0,crowdRage:0,
    shieldRegen:0,shieldRegenT:0,hitShield:0,
    lastStand:false,usedLastStand:false,
    dodgeBlast:0,dodgeHaste:false,dodgeIframeBonus:0,
    dodgeCharges:1,dodgeMaxCharges:1,minion:null,
    // === 신규 퍼 스탯 ===
    goldPower:0, statusDmgMul:0, critHeal:0, chainLightning:0,
    execThreshold:0, execDoom:false, execBlast:0, statusSpread:false,
  });
}

// ---------- HUD ----------
// HP만 갱신하는 경량 함수 (재생 등 매초 호출 시 전체 HUD 리빌드 회피)
function updateHpHud(){
  $('hpText').textContent=Math.ceil(player.hp)+" / "+player.maxhp;
  $('hpFill').style.width=clamp(player.hp/player.maxhp*100,0,100)+"%";
}
function updateHUD(){
  if((state==='title'||state==='start') && player.maxhp==null){ refreshSidePanel(); return; }
  { const rt=$('retryText'); if(rt){ const max=diffSet.maxRetries; const left=max===Infinity?'∞':Math.max(0,max-retries); rt.textContent=left; rt.style.color=(max!==Infinity&&left<=1)?'#ff4d6d':'var(--neon)'; } }
  updateHpHud();
  $('goldText').textContent=gold;
  $('floorText').textContent=act+"막 · "+(currentRow+1)+"층";
  $('lvlText').textContent=level;
  $('killText').textContent="처치 "+totalKills;
  $('xpFill').style.width=clamp(xp/xpNext*100,0,100)+"%";
  renderPotions();
  refreshSidePanel();
  // 트리 버튼 갱신
  const treeBadge=$('treeBtnPts');
  const treeBtn=$('treeBtnHud');
  if(treeBadge && treeBtn){
    if(treePoints>0){
      treeBadge.style.display='inline-block';
      treeBadge.textContent=treePoints;
      treeBtn.classList.add('tree-btn-glow');
    } else {
      treeBadge.style.display='none';
      treeBtn.classList.remove('tree-btn-glow');
    }
  }
}
function renderPotions(){
  const cont=$('potionSlots');
  if(!cont) return;
  cont.innerHTML='';
  for(let i=0;i<3;i++){
    const p=player.potions&&player.potions[i];
    const el=document.createElement('div');
    el.className='pslot'+(p?'':' empty');
    if(p){ el.innerHTML=(POTION_PIX[p.id]?('<img class="picon" src="'+POTION_PIX[p.id]+'">'):p.icon)+'<span class="key">'+(i+1)+'</span>'; el.title=p.name+' — '+p.desc; el.onclick=()=>usePotion(i); }
    else { el.textContent='·'; }
    cont.appendChild(el);
  }
}

// ---------- 배너 ----------
const bannerEl=$('banner');
function banner(big,small,ms){
  bannerEl.querySelector('.big').textContent=big;
  bannerEl.querySelector('.small').textContent=small||'';
  bannerEl.classList.add('show');
  clearTimeout(bannerEl._t);
  bannerEl._t=setTimeout(()=>bannerEl.classList.remove('show'),ms||1600);
}

// ---------- 전투 구역 시작 ----------
let lastRoomKind=null, cutsceneT=0, roomEntryHp=0, retries=0;
// ── 방 입장 시점의 진행 상태 스냅샷 (재도전 시 무한 레벨업 방지) ──
let roomEntrySnap=null;
function snapshotProgress(){
  roomEntrySnap={
    xp, level, xpNext, pendingLevels, gold, totalKills,
    treePoints, treeUnlocked: new Set(treeUnlocked),
    player:Object.assign({}, player, {
      relics:player.relics.slice(),
      potions:player.potions.slice(),
      buffs:Object.assign({},player.buffs),
      minion:null
    })
  };
}
function restoreProgress(){
  const s=roomEntrySnap; if(!s) return;
  xp=s.xp; level=s.level; xpNext=s.xpNext; pendingLevels=s.pendingLevels; gold=s.gold; totalKills=s.totalKills;
  if(s.treePoints!=null){ treePoints=s.treePoints; treeUnlocked=new Set(s.treeUnlocked); }
  Object.assign(player, s.player, {
    relics:s.player.relics.slice(),
    potions:s.player.potions.slice(),
    buffs:Object.assign({},s.player.buffs),
    minion:null
  });
}

// ===== JS: Combat flow =====
function startCombat(kind, fresh){
  if(fresh===undefined) fresh=true;
  lastRoomKind=kind;
  // 보스/중간보스전은 회피 공간을 넓혀준다
  const bigArena=(kind==='boss'||kind==='midboss');
  arenaResponsive=!bigArena;
  if(bigArena){
    const s=computeFieldSize();
    setArena(Math.round(s.w*BOSS_ARENA_SCALE), Math.round(s.h*BOSS_ARENA_SCALE));
    cvs.style.width=''; cvs.style.height=''; // 보스 아레나는 비율 유지하며 맞춤 축소
  } else {
    fitField();
  }
  if(fresh){ roomEntryHp=player.hp; snapshotProgress(); }
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; hazards=[]; floatBubbles=[]; kijoMasks=[]; kijoGazes=[]; kijoParades=[];
  player.x=W/2; player.y=H-90;
  roomCleared=false; roomIsBoss=(kind==='boss'); roomIsMidboss=(kind==='midboss'); kills=0; boss=null; roomHadElite=false; eliteIntro=null; timeScale=1; slowmoT=0;
  // GL/gView 리셋 (승우 외 보스전 잔여 효과 제거)
  if(typeof GL!=='undefined'){ for(const k in GL) GL[k]=0; }
  if(typeof gView!=='undefined'){ gView.rot=0;gView.rotT=0;gView.fx=1;gView.fy=1;gView.fxT=1;gView.fyT=1; }
  const row=currentRow;
  const diff=1+(act-1)*0.6+row*0.08;
  minionPool=ACT_POOLS[Math.min(act-1,ACT_POOLS.length-1)].normal;

  if(kind==='boss'){
    const b=BOSSES[ACT_BOSS[Math.min(act-1,ACT_BOSS.length-1)]];
    boss=spawnBoss(b);
    bossBanner=2.4; sfx.boss();
    banner(act+"막 보스 · "+b.name, b.title, 2400);
    showEntrance("👑 "+act+"막 보스 등장", b.name, b.quip||b.title||"");
  }else{
    const P=ACT_POOLS[Math.min(act-1,ACT_POOLS.length-1)];
    let base=rand(3,5)+act*1.0+row*0.35;
    if(act===1) base*=1.15;               // 1막 일반방 밀도 소폭 상향
    if(row<MIDBOSS_ROW) base*=0.6;        // 중간보스 전(1~7층): 적게
    else if(row>MIDBOSS_ROW) base*=1.5;   // 중간보스 후(9~14층): 많이
    let count=clamp(Math.round(base*diffSet.cnt), row<MIDBOSS_ROW?2:4, 16);
    if(kind==='midboss'){
      if(act>=2){
        spawnEnemy('yanggaeng', W/2, 150, diff);
        const eb=enemies[enemies.length-1];
        eb.elite=true; eb.midboss=true; eb.label='박제인간'; eb.atkT=1.8; eb.atkN=0; eb.spinAng=0;
        banner("중간보스 · 박제인간","정지된 음악, 멈춰진 시간",1800);
        if(typeof sfx!=='undefined') sfx.boss();
        showEntrance("⚠️ 중간보스 등장","박제인간","B면 — 되감을 수 없는 홈");
      } else {
        spawnEnemy('hyechul', W/2, 140, diff);
        const eb=enemies[enemies.length-1];
        eb.elite=true; eb.midboss=true; eb.label='혜철이'; eb.phase=1;
        eb.summonT=2.2; eb.atkT=2.0; eb.atkN=0; eb.climaxT=0;
        banner("중간보스 · 혜철이","3페이즈를 버텨라!",1800);
        if(typeof sfx!=='undefined') sfx.boss();
        showEntrance("⚠️ 중간보스 등장","혜철이","해처리 — 저글링 군단");
      }
    }else if(kind==='elite'){
      // 자잘자 정예전 — 전용 엘리트 노드에서만 등장 (잡몹 소수 + 자잘자)
      const minions=clamp(Math.round(count*0.6),1,6);
      for(let i=0;i<minions;i++) spawnEnemy(pick(P.normal), rand(60,W-60), rand(60,H-180), diff);
      if(act===2){
        // 2막 엘리트: 양갱
        spawnEnemy('kkotchung', W/2, 140, diff);
        const ze=enemies[enemies.length-1]; roomHadElite=true;
        ze.elite=true; ze.eliteViewer=true; ze.label='양갱';
        ze.hp*=1.75; ze.maxhp*=1.75; ze.dmg=Math.round(ze.dmg*1.4); ze.r+=5; ze.xp=90; ze.coolT=1.0;
        ze.x=W/2; ze.y=190; ze.intro=true; ze.introScale=0; ze.stunT=4; ze.tauntedHalf=false;
        ze.atkT=1.8; ze.atkN=0; ze.enr=false; ze.enrShown=false;
        ze.phase=1; ze.phaseHp=[0.66,0.33]; ze.climaxT=0; ze.eyeOrbs=[];
        eliteIntro={t:0, ze:ze, warn:null, landed:false, banner:0, tensionDone:false};
        beep(523,0.3,'sine',0.05); beep(392,0.5,'sine',0.035); // 달콤한 척 하는 음
      } else {
        spawnEnemy('rhino_beetle', W/2, 120, diff);
        const ze=enemies[enemies.length-1]; roomHadElite=true;
        ze.elite=true; ze.eliteViewer=true; ze.label='자잘자';
        ze.hp*=1.75; ze.maxhp*=1.75; ze.dmg=Math.round(ze.dmg*1.4); ze.r+=4; ze.xp=80; ze.coolT=1.0;
        ze.x=W/2; ze.y=190; ze.intro=true; ze.introScale=0; ze.stunT=4; ze.tauntedHalf=false;
        eliteIntro={t:0, ze:ze, warn:null, landed:false, banner:0, tensionDone:false};
        beep(330,0.5,'triangle',0.05); beep(440,0.55,'sine',0.035); // "징—"
      }
    }else{
      for(let i=0;i<count;i++) spawnEnemy(pick(P.normal), rand(60,W-60), rand(60,H-180), diff);
    }
  }
  // ── 이벤트 모디파이어 소비/적용 ──
  combatRewardMul=1; combatChallenge=null; combatTookHit=false; player._fireHandicap=1; combatTempAlly=false;
  if(nextCombatMods){
    const M=nextCombatMods; nextCombatMods=null;
    if(M.cntMul && enemies.length){ const extra=Math.round(enemies.length*(M.cntMul-1)); for(let i=0;i<extra;i++){ const P2=ACT_POOLS[Math.min(act-1,ACT_POOLS.length-1)]; spawnEnemy(pick(P2.normal), rand(60,W-60), rand(60,H-180), diff); } }
    if(M.hpMul||M.spdMul){ enemies.forEach(o=>{ if(!o.midboss){ if(M.hpMul){o.hp*=M.hpMul;o.maxhp*=M.hpMul;} if(M.spdMul){o.spd*=M.spdMul; if(o._spd0!=null)o._spd0*=M.spdMul;} } }); }
    if(M.fireHandicap) player._fireHandicap=M.fireHandicap;
    if(M.rewardMul) combatRewardMul=M.rewardMul;
    if(M.challenge) combatChallenge=M.challenge;
    if(M.ally && !player.minion){ player.minion={ang:0,fireT:0,x:player.x,y:player.y}; combatTempAlly=true; }
    if(M.banner) banner(M.banner.big, M.banner.small||'', 1600);
  }
  if(player.roomShield>0) player.buffs.shield=Math.max(player.buffs.shield,player.roomShield);
  updateHUD();
  // 방 입장 즉시 능력치 패널을 우측에 띄운다 (state 갱신 순서와 무관하게 강제 표시)
  { const sp=$('sidePanel'), sw=$('stageWrap');
    if(sp){ renderSidePanel(); sp.classList.add('show'); if(sw) sw.classList.add('with-side'); } }
}

function spawnEnemy(type,x,y,diff){
  const d=ENEMY_TYPES[type];
  enemies.push({
    type,sprite:type,name:d.name,x,y,r:d.r,
    hp:d.hp*diff*diffSet.hp,maxhp:d.hp*diff*diffSet.hp,spd:d.spd*diffSet.spd,dmg:d.dmg*Math.min(diff,2.2),
    color:d.color,xp:d.xp,ai:d.ai,range:d.range||0,cool:d.cool||0,coolT:rand(0,1.2),
    explode:d.explode,armor:d.armor||0,label:d.label,canLunge:d.lunge,vx:0,vy:0,wob:rand(0,TAU),hitT:0,
  });
}
function spawnBoss(b){
  const scale=(1+(act-1)*0.35)*diffSet.hp;
  return {
    boss:true,key:b.key,sprite:b.sprite,name:b.name,x:W/2,y:140,r:b.r,
    hp:b.hp*scale,maxhp:b.hp*scale,
    color:b.color,spd:b.spd,pattern:b.pattern,
    phaseT:0,attackT:1.5,angle:0,hitT:0,enraged:false,
  };
}

// ---------- 발사 ----------
function playerShoot(){
  let _am=(typeof glAim==='function'&&boss&&boss.pattern==='glitch')?glAim():{x:mouseX,y:mouseY};
  let ang=Math.atan2(_am.y-player.y, _am.x-player.x);
  player.facing=ang;
  if(typeof GL!=='undefined'&&GL.mirror>0) ang+=Math.PI; // 거울 모드: 반대로 발사
  if(player.misfire && Math.random()<0.12) ang+=rand(-0.5,0.5); // 오발
  let base=player.dmg*player.dmgMul*(player.buffs.rage>0?2:1);
  if(player.gamble) base*=rand(0.6,1.8);
  if(player.lowHpMul>0 && player.hp<player.maxhp*0.3) base*=(1+player.lowHpMul);
  if(player.crowdRage>0) base*=(1+player.crowdRage*Math.min(enemies.length,10));
  if(player.goldPower>0) base*=(1+Math.min(player.goldPower*Math.floor(gold/100),0.30)); // 현질의 힘
  if(player.chargeShot && performance.now()-(player.lastShot||0)>1100) base*=3;
  player.lastShot=performance.now();
  const speed=560*player.bulletSpeedMul;
  const n=player.shots, spread=n>1?0.16:0;
  const dirs=[];
  for(let i=0;i<n;i++) dirs.push(ang+(i-(n-1)/2)*spread);
  if(player.backShot) dirs.push(ang+Math.PI);
  const fire=()=>{ dirs.forEach(a=>{
    let dmg=base, crit=false;
    if(player.critChance>0 && Math.random()<player.critChance){ dmg*=player.critMult; crit=true; }
    pBullets.push({
      x:player.x+Math.cos(a)*16, y:player.y+Math.sin(a)*16,
      vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
      r:(crit?7.5:6)*player.bulletSize, dmg, life:1.1,
      bounce:player.bounce, pierce:player.pierce, hitSet:new Set(), crit, homing:player.homing,
    });
  }); };
  fire();
  if(player.doubleTap>0 && Math.random()<player.doubleTap) fire();
  sfx.shoot();
}

function enemyShootAt(e,tx,ty,speed,size,bdmg){
  const a=Math.atan2(ty-e.y,tx-e.x);
  eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:size||7,dmg:bdmg!=null?bdmg:(e.dmg||9),life:4,srcName:e.name||e.label});
}

// ---------- 파티클 ----------
function burst(x,y,color,n,spd){
  for(let i=0;i<(n||8);i++){
    const a=rand(0,TAU), s=rand(40,(spd||180));
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.6),max:.6,color,r:rand(2,4)});
  }
  // 파티클 상한선: 폭발이 겹칠 때 프레임 드롭 방지
  if(particles.length>200) particles.splice(0, particles.length-200);
}
function floatGold(x,y,amt){
  pickups.push({x,y,type:'gold',amt,r:8,vx:rand(-40,40),vy:rand(-90,-40),life:14,bob:rand(0,TAU)});
}
function floatHeart(x,y,amt){
  pickups.push({x,y,type:'heart',amt,r:9,vx:rand(-30,30),vy:rand(-80,-30),life:14,bob:rand(0,TAU)});
}

// ---------- 데미지 ----------
function hurtPlayer(dmg, src){
  if(player.iframes>0||player.dodging>0||player.buffs.shield>0) return;
  if(player.hitShield>0){ player.hitShield--; player.iframes=0.6; burst(player.x,player.y,'#8be8ff',16,200); return; }
  if(src) lastKiller=src;
  dmg=dmg*(1-player.armor)*diffSet.dmg;
  player.hp-=dmg; player.iframes=0.5; hitFlash=0.25; screenShake=Math.max(screenShake,8); combatTookHit=true;
  if(player.thorns>0){ enemies.slice().forEach(o=>{ if(dist2(o.x,o.y,player.x,player.y)<12100){ o.hp-=player.thorns; o.hitT=0.1; if(o.hp<=0){ if(o.type==='hyechul'&&(o.phase||1)<3) hyechulNextPhase(o); else killEnemy(o);} } }); }
  sfx.hurt();
  if(Math.random()<0.5) chatRandom(pick(["아야 Sadge","왜맞음 KEKW","집중!","체력 ㄷㄷ","구르기!!","발컨 ㅋㅋㅋ"]));
  if(player.hp<=0){
    if(player.reviveOnce && !player.usedRevive){ player.usedRevive=true; player.hp=Math.round(player.maxhp*0.35); player.iframes=1.3; banner('부활!','수호천사가 너를 구했다',1700); burst(player.x,player.y,'#5dff9b',26,260); }
    else if(player.lastStand && !player.usedLastStand){ player.usedLastStand=true; player.hp=1; player.iframes=1.3; banner('막판 정신력!','체력 1로 버텼다',1500); burst(player.x,player.y,'#ffd34d',20,220); }
    else { player.hp=0; gameOver(false, src||lastKiller); }
  }
  updateHUD();
}
function isBossLike(e){ return e.midboss||e.eliteViewer||e.type==='hyechul'; }
function damageEnemy(e,dmg,crit,fromBullet){
  if(player.statusDmgMul>0 && ((e.burnT>0)||(e.chillT>0)||(e.psT>0)||(e.stunT>0))) dmg*=(1+player.statusDmgMul); // 점화
  e.hp-=dmg*(1-(e.armor||0)); e.hitT=0.1; burst(e.x,e.y,crit?'#ffd34d':e.color,crit?8:4,crit?180:120); sfx.hit();
  if(typeof GS!=='undefined'&&GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(e.x,e.y-(e.r||10),Math.round(dmg*(1-(e.armor||0))),crit);
  if(crit && player.critHeal>0){ player.hp=Math.min(player.maxhp,player.hp+player.critHeal); floatHeart(e.x,e.y,player.critHeal); } // 치명 흡혈
  if(e.eliteViewer && !e.tauntedHalf && e.hp<=e.maxhp*0.5){ e.tauntedHalf=true; e.taunt={t:4.6,text:'…봉식님? 저 때리시나요?'}; if(typeof sfx!=='undefined'&&sfx.vote) sfx.vote(); }
  if(player.stunChance>0 && Math.random()<player.stunChance) e.stunT=Math.max(e.stunT||0,0.6);
  // 나무: 피격 시 주변 몹 방어력 버프 (3초간 최대 3회 중첩)
  if(e.type==='namu' && e.hp>0){
    const now=performance.now(); if(!(e._namuBuffT>0)||now-(e._namuBuffLast||0)>1000){
      e._namuBuffLast=now; e._namuBuffT=3.0;
      enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<62500){ o.armor=Math.min((o.armor||0)+0.12,0.5); o._armorBuff=3.0; burst(o.x,o.y,'#5fa84a',6,120); } });
      burst(e.x,e.y,'#5fa84a',12,160); if(typeof beep==='function')beep(90,0.1,'sine',0.05);
    }
  }
  if(fromBullet){
    if(player.burn>0){ e.burnT=3; e.burnDmg=player.burn; }
    if(player.chill>0){ e.chillT=2.5; }
    if(player.poison>0){ e.psStacks=Math.min((e.psStacks||0)+1,6); e.psT=4; e.psDmg=player.poison; }
    if(player.bulletExplode>0){ enemies.slice().forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<8100){ o.hp-=player.bulletExplode; o.hitT=0.1; if(o.hp<=0){ if(o.type==='hyechul'&&(o.phase||1)<3) hyechulNextPhase(o); else killEnemy(o);} } }); burst(e.x,e.y,'#ff9b4d',8,150); }
    if(player.chainLightning>0){ let cnt=0; enemies.slice().forEach(o=>{ if(o!==e && cnt<player.chainLightning && dist2(o.x,o.y,e.x,e.y)<14400){ o.hp-=dmg*0.5*(1-(o.armor||0)); o.hitT=0.1; burst(o.x,o.y,'#7ad7ff',6,160); cnt++; if(o.hp<=0){ if(o.type==='hyechul'&&(o.phase||1)<3) hyechulNextPhase(o); else killEnemy(o);} } }); } // 감전 연쇄
  }
  // 처형: 남은 체력이 임계값 이하면 즉사 (보스류 제외). 이미 hp<=0이면 아래서 처리
  if(e.hp>0 && player.execThreshold>0 && !isBossLike(e) && e.hp<=e.maxhp*player.execThreshold){
    e.hp=0;
    if(player.execBlast>0){ burst(e.x,e.y,'#ff5a5a',16,260); enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<6400){ o.hp-=player.execBlast; o.hitT=0.1; } }); }
  }
  // 사망 판정: 한 번만 호출되도록 통합
  if(e.hp<=0){
    if(e.type==='hyechul'&&(e.phase||1)<3) hyechulNextPhase(e);
    else if(e.type==='kkotchung'&&(e.phase||1)<3) kkotNextPhase(e);
    else killEnemy(e);
  }
}
function hyechulNextPhase(e){
  e.phase=(e.phase||1)+1;
  e.hp=e.maxhp; e.hitT=0.2; e.stunT=0;
  e.summonT=1.4; e.atkT=2.0; e.atkN=0; e.climaxT=0;
  const ph=e.phase, col=ph===2?'#c46bff':'#ff6a3a';
  screenShake=Math.max(screenShake||0,18);
  burst(e.x,e.y,col,34,440); burst(e.x,e.y,'#ffffff',12,280);
  if(typeof sfx!=='undefined' && sfx.boss) sfx.boss();
  beep(ph===2?180:90,0.5,'sawtooth',0.07); beep(ph===2?95:60,0.6,'sine',0.06);
  const line=ph===2?'봉식님 케틀 라인에 Q쓰라고요':'이제부터 진심입니다 봉식님… 하이브 가동!';
  const name=ph===2?'진화 — 레어':'최종 진화 — 하이브';
  bossEvolve={ phase:ph, t:0, line, name, col, e };
  cutsceneT=2.6;
}
function kkotNextPhase(e){
  e.phase=(e.phase||1)+1;
  e.hp=e.maxhp*(e.phase===2?0.66:0.33); e.hitT=0.2; e.stunT=0;
  e.atkT=2.2; e.atkN=0; e.climaxT=0; e.eyeOrbs=[];
  const ph=e.phase;
  const col=ph===2?'#c03060':'#8a0030';
  screenShake=Math.max(screenShake||0,14);
  burst(e.x,e.y,col,28,400); burst(e.x,e.y,'#ffb0d0',10,240);
  if(typeof sfx!=='undefined'&&sfx.boss) sfx.boss();
  beep(ph===2?160:80,0.5,'sawtooth',0.07);
  const line=ph===2?'……아직도 달달해?':'진짜 양갱이야. 달콤하게 죽어.';
  const name=ph===2?'각성':'완전 개화 — 연양갱 폭주';
  bossEvolve={phase:ph,t:0,line,name,col,e};
  cutsceneT=2.4;
  // 페이즈2: 반지름 소폭 증가
  if(ph===2) e.r=Math.min(e.r+3,44);
  if(ph===3) e.r=Math.min(e.r+4,50); e.spd*=1.25;
}
// 보스가 소환하는 적 — 무한 소환되므로 경험치를 주지 않음(무한 레벨업 방지)
const SUMMON_TYPES=new Set(['earthworm','zergling','mutalisk','ultra','zerg_egg']);
function killEnemy(e){
  const idx=enemies.indexOf(e); if(idx<0) return;
  enemies.splice(idx,1);
  if(e.type==='hyechul'){ enemies=enemies.filter(o=>!['zergling','mutalisk','ultra','zerg_egg'].includes(o.type)); }
  if(e.dummy){ burst(e.x,e.y,e.color,10,180); return; }
  burst(e.x,e.y,e.color,14,220);
  if(player.statusSpread){ // 확산
    const hadBurn=e.burnT>0, hadChill=e.chillT>0, hadPois=e.psT>0;
    if(hadBurn||hadChill||hadPois){
      enemies.forEach(o=>{ if(dist2(o.x,o.y,e.x,e.y)<14400){
        if(hadBurn){ o.burnT=3; o.burnDmg=e.burnDmg||player.burn||4; }
        if(hadChill){ o.chillT=2.5; }
        if(hadPois){ o.psStacks=Math.min((o.psStacks||0)+1,6); o.psT=4; o.psDmg=e.psDmg||player.poison||3; }
      }});
      burst(e.x,e.y,'#9b6bff',12,180);
    }
  }
  if(e.eliteViewer){ banner('자잘자 처치!','',1100); spawnDeathBubble(e.x, e.y-e.r-12, pick(['로블록스 하러 가야겠다…','봉식님… 너무하시네요 Sadge','다음 생엔 더 셀게요…','채금 풀리면 또 봬요','이게 맞나요…? 운영자 호출']), 3.4); }
  kills++; totalKills++;
  gainXP(SUMMON_TYPES.has(e.type)?0:e.xp);
  if(player.lifesteal>0 && Math.random()<player.lifesteal){ player.hp=Math.min(player.maxhp,player.hp+5); floatHeart(e.x,e.y,5); }
  if(player.healOnKill>0){ player.hp=Math.min(player.maxhp,player.hp+player.healOnKill); floatHeart(e.x,e.y,player.healOnKill); }
  const isSummon=SUMMON_TYPES.has(e.type);
  if(!isSummon && player.donateChance>0 && Math.random()<player.donateChance){ const dg=irand(20,50); gold+=dg; banner('💸 도네 알림!','+'+dg+' G',900); burst(e.x,e.y,'#ffd34d',18,240); }
  // 골드: 처치 즉시 획득 (소환몹은 무한 스폰이라 미지급)
  if(!isSummon){ let coin=irand(2,6); if(e.elite) coin+=irand(8,16); coin=Math.round(coin*player.goldMul);
  gold+=coin; sfx.coin(); burst(e.x,e.y,'#ffd34d',5,120); }
  if(player.explodeKill>0){ burst(e.x,e.y,'#ff9b4d',12,200); enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<4900){ o.hp-=player.explodeKill; o.hitT=0.1; } }); }
  if(e.explode){
    if(e.type==='goblin_bomber'){
      for(let i=0;i<11;i++){ const a2=i/11*TAU+rand(-0.08,0.08); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*180,vy:Math.sin(a2)*180,r:9,dmg:8,life:2.7,foodImg:(trashbitReady?TRASHBIT_SPRITE:null),spin:rand(0,TAU),spinV:rand(-7,7),spore:true}); }
      burst(e.x,e.y,'#ff7a3a',16,230); screenShake=Math.max(screenShake,5);
    } else { for(let i=0;i<6;i++) enemyBulletSpore(e.x,e.y,i/6*TAU); }
  }
  // (엘리트 골드는 위에서 합산)
  updateHUD();
}
function enemyBulletSpore(x,y,a){
  eBullets.push({x,y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,r:6,dmg:7,life:2.2,spore:true});
}

function gainXP(n){
  xp+=n*player.xpMul;
  while(xp>=xpNext){
    xp-=xpNext; level++; xpNext=Math.round(xpNext*1.35+8);
    player.maxhp+=5;                               // 최대체력 소폭 증가
    player.dmgMul*=1.03;                            // 공격력 소폭 증가 (세지는 기분)
    player.hp=Math.min(player.maxhp,player.hp+11);  // 회복 + 늘어난 최대체력만큼
    pendingLevels++; sfx.pick();
    treePoints++;   // 트리 포인트 +1
    if(player._levelHeal) player.hp = Math.min(player.maxhp, player.hp + player._levelHeal);
  }
  updateHUD();
  if(pendingLevels>0 && state==='play') showLevelUp();
}

// ---------- 보스 패턴 ----------
function pickFood(){ return FOODS.length?FOODS[irand(0,FOODS.length-1)]:null; }
function throwFood(b,ang,speed,dmg,home){
  const sp=(b&&b.enraged)?speed*0.78:speed;   // 격노 시 음식탄 속도 완화
  eBullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:13,dmg,life:3.4,foodImg:pickFood(),spin:rand(0,TAU),spinV:rand(-7,7),home:home||0});
}
function kijoMaskBrand(b){
  const spots=[
    {x:player.x,y:player.y},
    {x:W-player.x+rand(-44,44),y:player.y+rand(-70,70)},
    {x:player.x+rand(-115,115),y:player.y+rand(-95,95)},
  ];
  if(b.enraged){
    spots.push({x:rand(80,W-80),y:rand(130,H-90)});
    spots.push({x:b.x+rand(-145,145),y:b.y+rand(90,210)});
  }
  for(const p of spots){
    if(typeof spawnFirePillar==='function') spawnFirePillar(p.x,p.y,'키죠');
    else hazards.push({x:clamp(p.x,34,W-34),y:clamp(p.y,90,H-50),t:0,warnT:0.85,liveT:0.45,r:38,hit:false,dmg:13,srcName:'키죠'});
  }
  banner("가면 낙인!","발밑을 조심해",700);
}
function angleDiff(a,b){
  let d=a-b;
  while(d>Math.PI)d-=TAU;
  while(d<-Math.PI)d+=TAU;
  return d;
}
function kijoRing(x,y,k,spd,dmg,offset){
  for(let i=0;i<k;i++){
    const a=(offset||0)+i/k*TAU;
    eBullets.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:8,dmg:dmg||9,life:3.7,srcName:'키죠'});
  }
}
function kijoFan(x,y,ang,k,spread,spd,dmg,food){
  for(let i=0;i<k;i++){
    const a=ang+(i-(k-1)/2)*spread;
    if(food) throwFood({x,y,enraged:boss&&boss.enraged},a,spd,dmg||9);
    else eBullets.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:8,dmg:dmg||9,life:3.6,srcName:'키죠'});
  }
}
function kijoMaskFlip(b){
  kijoMasks=[];
  const real=irand(0,3), cx=W/2, cy=H*0.48;
  for(let i=0;i<4;i++){
    const a=-Math.PI*0.78+i*(Math.PI*1.56/3);
    kijoMasks.push({type:'flip',x:cx+Math.cos(a)*230,y:cy+Math.sin(a)*120,real:i===real,t:0,warn:1.25,done:false,seed:rand(0,TAU)});
  }
  banner('가면 뒤집기','진짜 얼굴을 찾아라',900);
}
function kijoGazePattern(b){
  const ang=Math.atan2(player.y-b.y,player.x-b.x);
  kijoGazes.push({x:b.x,y:b.y,ang,w:b.enraged?0.82:0.68,r:820,t:0,warn:b.enraged?0.85:1.05,done:false});
  banner('가면 시선','시선 밖으로!',850);
}
function kijoParadePattern(b){
  kijoParades=[];
  const n=b.enraged?4:3;
  for(let i=0;i<n;i++){
    const left=i%2===0, y=H*(0.28+i*0.13);
    kijoParades.push({x:left?-55:W+55,y,vx:(left?1:-1)*(b.enraged?245:205),r:26,t:0,life:3.2,fireT:0.25+i*0.14,seed:rand(0,TAU),hit:false});
  }
  banner('탈춤 행진','가면들이 지나간다',850);
}
function kijoMoodMasks(b){
  kijoMasks=[];
  const y=H*0.38;
  kijoMasks.push({type:'mood',mood:'laugh',x:W*0.28,y,t:0,warn:1.05,done:false,seed:rand(0,TAU)});
  kijoMasks.push({type:'mood',mood:'cry',x:W*0.72,y,t:0,warn:1.05,done:false,seed:rand(0,TAU)});
  if(b.enraged) kijoMasks.push({type:'mood',mood:Math.random()<0.5?'laugh':'cry',x:W*0.5,y:H*0.26,t:0,warn:0.95,done:false,seed:rand(0,TAU)});
  banner('웃는 가면 · 우는 가면','조준탄과 낙하탄',950);
}
function kijoReflectStance(b){
  b.reflectT=b.enraged?3.2:2.45;
  b.reflectAng=Math.atan2(player.y-b.y,player.x-b.x);
  banner('가면 반사','정면 공격이 튕긴다',950);
  const side=b.reflectAng+Math.PI/2;
  kijoFan(b.x,b.y,side,5,0.16,205,8,false);
  kijoFan(b.x,b.y,side+Math.PI,5,0.16,205,8,false);
}
function kijoReflectsBullet(b,pb){
  if(!b||b.key!=='kijo'||b.reflectT<=0) return false;
  const hitAng=Math.atan2(pb.y-b.y,pb.x-b.x);
  return Math.abs(angleDiff(hitAng,b.reflectAng))<0.9;
}
function updateKijoFx(dt){
  for(const g of kijoGazes){
    g.t+=dt;
    if(!g.done&&g.t>=g.warn){
      g.done=true;
      const pa=Math.atan2(player.y-g.y,player.x-g.x), d=Math.hypot(player.x-g.x,player.y-g.y);
      if(d<g.r&&Math.abs(angleDiff(pa,g.ang))<g.w*0.5) hurtPlayer(boss&&boss.enraged?22:17,'키죠의 시선');
      kijoFan(g.x,g.y,g.ang,boss&&boss.enraged?13:9,0.11,245,9,false);
    }
  }
  kijoGazes=kijoGazes.filter(g=>g.t<g.warn+0.45);

  for(const m of kijoMasks){
    m.t+=dt;
    if(!m.done&&m.t>=m.warn){
      m.done=true;
      if(m.type==='flip'){
        if(m.real){
          kijoRing(m.x,m.y,boss&&boss.enraged?24:18,175,9,m.seed);
          if(typeof spawnFirePillar==='function') spawnFirePillar(m.x,m.y,'키죠');
        } else {
          const pa=Math.atan2(player.y-m.y,player.x-m.x);
          kijoFan(m.x,m.y,pa,3,0.22,215,8,false);
        }
      } else if(m.type==='mood'){
        if(m.mood==='laugh'){
          const pa=Math.atan2(player.y-m.y,player.x-m.x);
          kijoFan(m.x,m.y,pa,boss&&boss.enraged?9:6,0.17,245,9,false);
        } else {
          const n=boss&&boss.enraged?9:6;
          for(let i=0;i<n;i++) eBullets.push({x:clamp(m.x+rand(-120,120),40,W-40),y:-12,vx:rand(-18,18),vy:rand(185,235),r:8,dmg:9,life:4.2,srcName:'키죠'});
        }
      }
    }
  }
  kijoMasks=kijoMasks.filter(m=>m.t<m.warn+0.75);

  for(const p of kijoParades){
    p.t+=dt; p.x+=p.vx*dt; p.fireT-=dt;
    if(p.fireT<=0){
      p.fireT=boss&&boss.enraged?0.36:0.48;
      const pa=Math.atan2(player.y-p.y,player.x-p.x);
      eBullets.push({x:p.x,y:p.y,vx:Math.cos(pa)*210,vy:Math.sin(pa)*210,r:7,dmg:8,life:3.4,srcName:'키죠'});
      eBullets.push({x:p.x,y:p.y,vx:0,vy:195,r:7,dmg:8,life:3.4,srcName:'키죠'});
    }
    if(!p.hit&&dist2(p.x,p.y,player.x,player.y)<(p.r+player.r)**2){ p.hit=true; hurtPlayer(14,'탈춤 가면'); }
  }
  kijoParades=kijoParades.filter(p=>p.t<p.life&&p.x>-90&&p.x<W+90);
}
function updateBoss(dt){
  const b=boss;
  if(b.pattern==='glitch'){ updateSeungwoo(b,dt); return; }
  b.phaseT+=dt; b.attackT-=dt; b.angle+=dt*1.2; if(b.hitT>0)b.hitT-=dt;
  if(b.reflectT>0) b.reflectT-=dt;
  if(!b.enraged && b.hp<b.maxhp*0.4){ b.enraged=true; b.spd*=1.4; banner("격노!","보스가 분노한다",1300); chatSys("🔥 보스 격노 — 채팅 카오스 monkaS"); }
  // 플레이어 추적(느슨)
  const a=Math.atan2(player.y-b.y,player.x-b.x);
  const sp=b.spd*(b.enraged?1.3:1);
  b.x+=Math.cos(a)*sp*dt; b.y+=Math.sin(a)*sp*dt*0.7;
  b.x=clamp(b.x,b.r,W-b.r); b.y=clamp(b.y,b.r,H*0.6);
  // 접촉
  if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2) hurtPlayer(b.enraged?38:28, boss?boss.name:'시청자');
  if(b.attackT<=0){
    const rate=b.enraged?1.1:1.6;
    b.attackT=rate;
    if(b.pattern==='split'||b.pattern==='chaos'){
      for(let i=0;i<8;i++) enemyShootAt(b, b.x+Math.cos(i/8*TAU)*100, b.y+Math.sin(i/8*TAU)*100, 200,8);
    }
    if(b.pattern==='summon'){
      b.atkN=(b.atkN||0)+1;
      const phase=b.atkN%8;
      if(phase===0){
        // ① 가면 뒤집기: 진짜/가짜 가면을 구분하는 속임수 탄막
        kijoMaskFlip(b);
      } else if(phase===1){
        // ② 가면 시선: 부채꼴 시야 밖으로 빠져야 하는 경고 패턴
        kijoGazePattern(b);
      } else if(phase===2){
        // ③ 2갈래 회전 나선
        const k=b.enraged?14:11, base=b.angle*2.6;
        for(let i=0;i<k;i++){ throwFood(b, base+i/k*TAU, 185, 9); throwFood(b, -base+i/k*TAU+0.3, 175, 9); }
      } else if(phase===3){
        // ④ 탈춤 행진: 가면들이 측면에서 지나가며 탄을 뿌림
        kijoParadePattern(b);
      } else if(phase===4){
        // ⑤ 웃는 가면 / 우는 가면: 조준탄과 낙하탄의 역할 분리
        kijoMoodMasks(b);
      } else if(phase===5){
        // ⑥ 가면 반사: 정면 공격을 잠깐 튕겨냄
        kijoReflectStance(b);
      } else if(phase===6){
        // ⑦ 가면 낙인: 플레이어 주변 공간을 잠깐 봉쇄
        kijoMaskBrand(b);
      } else {
        // ⑤ 음식 폭격 (낙하·증가)
        const n=b.enraged?8:6;
        const fall=b.enraged?0.8:1;   // 격노 시 낙하 음식 속도 완화
        for(let i=0;i<n;i++){ const fx=rand(50,W-50); eBullets.push({x:fx,y:-12,vx:rand(-25,25),vy:rand(165,205)*fall,r:13,dmg:9,life:4.2,foodImg:pickFood(),spin:rand(0,TAU),spinV:rand(-7,7)}); }
        banner("음식 폭격!","",600);
      }
      // 격노 보너스: 유도하는 음식탄 (피하기 까다로움)
      if(b.enraged && Math.random()<0.32){
        const pa=Math.atan2(player.y-b.y,player.x-b.x);
        for(let i=0;i<5;i++) throwFood(b, pa+i/5*TAU, 175, 9, 1.25);
      }
    }
    if(b.pattern==='spiral'){
      for(let i=0;i<5;i++){ const a2=b.angle+i/5*TAU; eBullets.push({x:b.x,y:b.y,vx:Math.cos(a2)*220,vy:Math.sin(a2)*220,r:7,dmg:10,life:3}); }
    }
    if(b.pattern==='chaos'){
      // 렉 보스: 가끔 텔레포트(끊김 연출)
      if(Math.random()<0.4){ b.x=rand(80,W-80); b.y=rand(80,260); burst(b.x,b.y,b.color,20,260); chatRandom("렉걸렸다 ㅋㅋ"); }
      enemyShootAt(b,player.x,player.y,260,9);
    }
    sfx.shoot();
  }
  if(b.hp<=0) killBoss();
}
function killBoss(){
  burst(boss.x,boss.y,boss.color,40,320); screenShake=18;
  banner("보스 처치!","승리!",2000); sfx.coin();
  gold+=irand(90,150); sfx.coin(); burst(boss.x,boss.y,'#ffd34d',20,260);
  gainXP(200+(act-1)*120);   // 최종보스 경험치(막별 스케일: 1막 200 · 2막 320 · 3막 440)
  if(act>=MAX_ACT){ enemies.length=0; eBullets.length=0; }   // 최종보스 처치 시 남은 잡몹·탄막 정리
  updateHUD();
  if(typeof clearSeungwooFx==='function') clearSeungwooFx();
  boss=null; roomIsBoss=false;
  // 이후 흐름은 onCombatCleared() → finishNode() 에서 처리
}

// ===================== 승우 (글리치 최종보스) =====================
const GL={mirror:0,keyRev:0,frameDrop:0,rotActive:0,shield:0,blackout:0};
const gView={rot:0,rotT:0,fx:1,fy:1,fxT:1,fyT:1};
let gZones=[], gWalls=[], gClones=[], gGrav=null, gTrack=null, gSlow=[];
let gFakeReset=false, gResetT=0;

function clearSeungwooFx(){
  for(const k in GL)GL[k]=0;
  gZones=[];gWalls=[];gClones=[];gGrav=null;gTrack=null;gSlow=[];
  gFakeReset=false;gResetT=0;
  gView.rot=0;gView.rotT=0;gView.fx=1;gView.fy=1;gView.fxT=1;gView.fyT=1;
  timeScale=1;
}
function glAim(){ // 화면→월드 (회전/반전 역변환된 마우스 좌표)
  const cx=W/2,cy=H/2; let x=(mouseX-cx)/gView.fx, y=(mouseY-cy)/gView.fy;
  const c=Math.cos(-gView.rot), s=Math.sin(-gView.rot);
  return {x:x*c-y*s+cx, y:x*s+y*c+cy};
}
function glDamage(dmg){ // 장판/격벽 환경 피해 (회피·실드 시 무시)
  if(player.iframes>0||player.dodging>0||player.buffs.shield>0) return;
  dmg=dmg*(1-player.armor)*diffSet.dmg;
  player.hp-=dmg; hitFlash=Math.max(hitFlash,0.14); combatTookHit=true; lastKiller='승우';
  if(player.hp<=0){
    if(player.reviveOnce&&!player.usedRevive){player.usedRevive=true;player.hp=Math.round(player.maxhp*0.35);player.iframes=1.3;}
    else if(player.lastStand&&!player.usedLastStand){player.usedLastStand=true;player.hp=1;player.iframes=1.3;}
    else { player.hp=0; gameOver(false,'승우'); }
  }
  updateHpHud();
}
function gShot(x,y,ang,spd,r,dmg,home){ eBullets.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:r||7,dmg:dmg||9,life:5,home:home||0,srcName:'승우'}); }
function gRing(b,k,spd,dmg){ for(let i=0;i<k;i++) gShot(b.x,b.y,b.angle+i/k*TAU,spd,7,dmg||9); }
function gAimed(b,k){ const pa=Math.atan2(player.y-b.y,player.x-b.x); for(let i=0;i<k;i++) gShot(b.x,b.y,pa+(i-(k-1)/2)*0.18,235,7,9); }
function gHoming(b){ const pa=Math.atan2(player.y-b.y,player.x-b.x); for(let i=0;i<5;i++) gShot(b.x,b.y,pa+(i-2)*0.5,175,8,9,1.6); }

// --- 패턴 ---
function gp_straight(b){ const pa=Math.atan2(player.y-b.y,player.x-b.x),k=b.enraged?9:7; for(let i=0;i<k;i++) gShot(b.x,b.y,pa+(i-(k-1)/2)*0.16,240,7,9); banner('직선 탄막','',600); }
function gp_blacksafe(b){ const w=190,h=150,x=clamp(player.x+rand(-120,120),20,W-w-20),y=clamp(player.y+rand(-90,90),60,H-h-20); gZones=[{x,y,w,h,real:true,t:0,warn:1.4,kill:3.2,fake:false,black:true}]; banner('검은 구역 밖 즉사','SAFE 안으로',900); }
function gp_slow(b){ gSlow=[]; for(let i=0;i<3;i++) gSlow.push({x:rand(80,W-80),y:rand(140,H-90),r:rand(60,90),t:6}); banner('늪','이동 둔화',600); }
function gp_track(b){ gTrack={x:player.x,y:player.y,r:54,t:7,grow:14}; banner('추적 장판','계속 움직여라',800); }
function gp_mirror(b){ GL.mirror=6; banner('🪞 거울 모드','등 지고 쏴라',1000); gRing(b,10,200,8); }
function gp_keyrev(b){ GL.keyRev=5.5; banner('⮃ 방향키 반전','',900); gHoming(b); }
function gp_framedrop(b){ GL.frameDrop=5; banner('▒ 프레임 드랍','',900); gRing(b,13,180,8); }
function gp_gravity(b){ gGrav={x:W/2,y:H*0.46,r:240,t:6}; banner('🕳 중력장','빨려간다',800); gRing(b,16,150,9); }
function gp_walls(b){ gWalls=[{x:-40,y:0,w:130+rand(0,40),h:H,t:5},{x:W-90-rand(0,40),y:0,w:130,h:H,t:5}]; banner('▦ 격벽','가운데로',800); gAimed(b,7); }
function gp_homing(b){ gHoming(b); banner('유도탄','',600); }
function gp_shield(b){ GL.shield=5; banner('🛡 공격 반사','뒤로 돌아라',900); }
function gp_fakesafe(b){ gZones=[]; const n=4,ri=irand(0,n-1); for(let i=0;i<n;i++){const w=160,h=120; gZones.push({x:rand(20,W-w-20),y:rand(120,H-h-20),w,h,real:i===ri,t:0,warn:1.6,kill:2.6,fake:true});} banner('가짜 안전구역','진짜를 골라라',1000); }
function gp_clones(b){ gClones=[]; for(let i=0;i<4;i++) gClones.push({x:clamp(b.x+rand(-170,170),60,W-60),y:clamp(b.y+rand(-40,70),60,260),fireT:rand(.3,.9),t:5}); banner('잔상 분신','본체만 때린다',900); }
function gp_rotate(b){ const m=irand(0,2); if(m===0)gView.rotT=Math.PI/2*(Math.random()<.5?1:-1); else if(m===1)gView.rotT=Math.PI; else gView.fxT=-1; GL.rotActive=6; banner('↻ 화면 붕괴','',800); gAimed(b,6); }

const GP1=[gp_straight,gp_blacksafe,gp_straight,gp_slow,gp_straight,gp_track];
const GP2=[gp_mirror,gp_homing,gp_keyrev,gp_framedrop,gp_gravity,gp_walls,gp_shield,gp_fakesafe,gp_clones,gp_rotate];

function startFakeReset(b){ gFakeReset=true; gResetT=0; GL.blackout=0.6; screenShake=14; banner('◄◄ REWIND','SYSTEM RESTORED…?',1200); }

function updateSeungwoo(b,dt){
  if(b.gphase===undefined){ b.gphase=1; b.patI=0; b.attackT=1.6; b.moveT=0; b.tx=b.x; b.ty=b.y; b.usedReset=false; clearSeungwooFx(); }
  b.phaseT+=dt; b.angle+=dt*1.3; if(b.hitT>0)b.hitT-=dt;

  // 글리치 타이머
  for(const k of ['mirror','keyRev','frameDrop','rotActive','shield']) if(GL[k]>0)GL[k]-=dt;
  if(GL.blackout>0)GL.blackout-=dt;
  // 화면 변형 보간/복구
  if(GL.rotActive<=0){gView.rotT=0;gView.fxT=1;gView.fyT=1;}
  gView.rot+=(gView.rotT-gView.rot)*Math.min(1,dt*6);
  gView.fx+=(gView.fxT-gView.fx)*Math.min(1,dt*6);
  gView.fy+=(gView.fyT-gView.fy)*Math.min(1,dt*6);

  // 강제 리셋 페이크
  if(gFakeReset){
    gResetT+=dt;
    if(gResetT>=2.0&&gResetT<2.06){ for(let i=0;i<22;i++) gShot(rand(0,W),-10,Math.PI/2,520,8,30); }
    if(gResetT>2.8){ gFakeReset=false; b.attackT=0.6; banner('속았지?','',700); }
    if(b.hp<=0) killBoss();
    return;
  }

  // 격노
  if(!b.enraged && b.hp<b.maxhp*0.22){ b.enraged=true; b.spd*=1.25; banner('🔥 격노','',1000); if(typeof chatSys==='function')chatSys('🔥 승우 격노 — monkaS'); }

  // 이동(느슨 추적 + 텔포)
  b.moveT-=dt;
  if(b.moveT<=0){ b.tx=rand(120,W-120); b.ty=rand(90,240); b.moveT=rand(1.4,2.6);
    if(b.gphase===2&&Math.random()<0.35){ b.x=b.tx;b.y=b.ty; burst(b.x,b.y,'#9146ff',20,260); if(typeof chatRandom==='function')chatRandom('렉걸렸다 ㅋㅋ'); } }
  b.x+=(b.tx-b.x)*Math.min(1,dt*1.4); b.y+=(b.ty-b.y)*Math.min(1,dt*1.4);
  b.x=clamp(b.x,b.r,W-b.r); b.y=clamp(b.y,b.r,H*0.55);
  if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2) hurtPlayer(b.enraged?38:28,'승우');

  // 페이즈 전환
  if(b.gphase===1 && b.hp<=b.maxhp*0.5){ b.gphase=2; b.color='#ff4dd2'; b.attackT=2.2; b.patI=0; eBullets.length=0; gZones=[];gSlow=[];gTrack=null; screenShake=20; hitFlash=0.5; GL.blackout=1.1; banner('SYSTEM CORRUPTED','PHASE 2 — 붕괴',1500); if(typeof chatSys==='function')chatSys('▓▒░ 화면이 깨진다'); return; }
  // 강제 리셋 트리거(2페 12% 1회)
  if(b.gphase===2 && !b.usedReset && b.hp<=b.maxhp*0.12){ b.usedReset=true; startFakeReset(b); return; }

  // 패턴 발사
  b.attackT-=dt;
  if(b.attackT<=0){ const list=b.gphase===1?GP1:GP2; list[b.patI%list.length](b); b.patI++; b.attackT=b.gphase===1?(b.enraged?2.1:2.6):(b.enraged?2.4:3.0); }

  // 분신 사격
  for(const c of gClones){ c.t-=dt; c.fireT-=dt; if(c.fireT<=0){ c.fireT=rand(.7,1.1); const pa=Math.atan2(player.y-c.y,player.x-c.x); gShot(c.x,c.y,pa,210,6,8); } }
  gClones=gClones.filter(c=>c.t>0);

  // --- 환경 효과 (플레이어 피해/끌림) ---
  if(gZones.length){ let allKill=true,real=null; for(const z of gZones){ z.t+=dt; if(z.real)real=z; if(z.t<z.warn)allKill=false; } if(allKill&&real){ const inR=player.x>real.x&&player.x<real.x+real.w&&player.y>real.y&&player.y<real.y+real.h; if(!inR) glDamage(52*dt); } if(gZones[0].t>gZones[0].warn+gZones[0].kill) gZones=[]; }
  if(gTrack){ gTrack.t-=dt; const a=Math.atan2(player.y-gTrack.y,player.x-gTrack.x); const d=Math.hypot(player.x-gTrack.x,player.y-gTrack.y); if(d>4){gTrack.x+=Math.cos(a)*70*dt;gTrack.y+=Math.sin(a)*70*dt;} gTrack.r+=gTrack.grow*dt; if(dist2(gTrack.x,gTrack.y,player.x,player.y)<gTrack.r*gTrack.r) glDamage(34*dt); if(gTrack.t<=0)gTrack=null; }
  if(gWalls.length){ for(const w of gWalls)w.t-=dt; gWalls=gWalls.filter(w=>w.t>0); for(const w of gWalls){ if(player.x>w.x&&player.x<w.x+w.w&&player.y>w.y&&player.y<w.y+w.h) glDamage(64*dt); } }
  if(gGrav){ gGrav.t-=dt; const a=Math.atan2(gGrav.y-player.y,gGrav.x-player.x); const d=Math.hypot(gGrav.x-player.x,gGrav.y-player.y); if(d>4&&player.dodging<=0){ player.x+=Math.cos(a)*120*dt; player.y+=Math.sin(a)*120*dt; player.x=clamp(player.x,player.r,W-player.r); player.y=clamp(player.y,player.r,H-player.r); } if(gGrav.t<=0)gGrav=null; }
  if(gSlow.length){ for(const f of gSlow)f.t-=dt; gSlow=gSlow.filter(f=>f.t>0); }

  if(b.hp<=0) killBoss();
}

// --- 승우 월드 렌더 (좌표 변환 안에서 호출) ---
function drawSeungwooWorld(){
  if(gGrav){ const g=ctx.createRadialGradient(gGrav.x,gGrav.y,4,gGrav.x,gGrav.y,gGrav.r); g.addColorStop(0,'rgba(0,0,0,0.8)'); g.addColorStop(0.5,'rgba(145,70,255,0.22)'); g.addColorStop(1,'rgba(145,70,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(gGrav.x,gGrav.y,gGrav.r,0,TAU); ctx.fill(); ctx.strokeStyle='#9146ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(gGrav.x,gGrav.y,18+Math.sin(performance.now()/120)*4,0,TAU); ctx.stroke(); }
  for(const f of gSlow){ ctx.fillStyle='rgba(56,232,255,0.10)'; ctx.strokeStyle='rgba(56,232,255,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill(); ctx.stroke(); }
  if(gTrack){ ctx.fillStyle='rgba(255,77,109,0.16)'; ctx.strokeStyle='rgba(255,77,109,0.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(gTrack.x,gTrack.y,gTrack.r,0,TAU); ctx.fill(); ctx.stroke(); }
  for(const w of gWalls){ ctx.fillStyle='rgba(255,77,109,0.22)'; ctx.fillRect(w.x,w.y,w.w,w.h); ctx.strokeStyle='#ff4d6d'; ctx.lineWidth=3; ctx.strokeRect(w.x,w.y,w.w,w.h); ctx.fillStyle='#ff4d6d'; ctx.font='bold 12px Courier New'; for(let yy=24;yy<H;yy+=46)ctx.fillText('▓즉사',w.x+8,yy); }
  for(const z of gZones){ const warned=z.t>=z.warn;
    if(z.black){ ctx.fillStyle=warned?'rgba(0,0,0,0.55)':'rgba(0,0,0,0.3)'; ctx.fillRect(0,0,W,H); ctx.save(); ctx.beginPath(); ctx.rect(z.x,z.y,z.w,z.h); ctx.clip(); ctx.fillStyle='#0c0916'; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeStyle='#5dff9b'; ctx.lineWidth=3; ctx.strokeRect(z.x,z.y,z.w,z.h); ctx.restore(); ctx.fillStyle='#5dff9b'; ctx.font='bold 12px Courier New'; ctx.fillText('SAFE',z.x+8,z.y+18); }
    else { const flick=z.real?(0.55+0.45*Math.sin(performance.now()/90)):1; ctx.globalAlpha=z.real?flick:1; ctx.fillStyle='rgba(93,255,155,0.10)'; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeStyle='#5dff9b'; ctx.lineWidth=z.real?3:2; ctx.setLineDash(z.real?[]:[6,5]); ctx.strokeRect(z.x,z.y,z.w,z.h); ctx.setLineDash([]); ctx.globalAlpha=1; ctx.fillStyle='#5dff9b'; ctx.font='bold 12px Courier New'; ctx.fillText('SAFE?',z.x+8,z.y+18); if(warned&&!z.real){ ctx.fillStyle='rgba(255,77,109,0.2)'; ctx.fillRect(z.x,z.y,z.w,z.h); } }
  }
  for(const c of gClones){ ctx.save(); ctx.translate(c.x,c.y); ctx.globalAlpha=0.45; if(SPRITES.seungwoo)SPRITES.seungwoo(30,{gphase:2}); ctx.restore(); ctx.globalAlpha=1; }
}

// --- 승우 화면 오버레이 (좌표 변환 밖) ---
function drawSeungwooOverlay(){
  if(boss&&boss.gphase===2){
    ctx.globalAlpha=0.05; ctx.fillStyle='#000'; for(let y=0;y<H;y+=3)ctx.fillRect(0,y,W,1); ctx.globalAlpha=1;
    if(Math.random()<0.10){ const by=rand(0,H-30); ctx.globalAlpha=0.4; ctx.fillStyle='#ff4dd2'; ctx.fillRect(rand(-6,6),by,W,rand(6,22)); ctx.fillStyle='#38e8ff'; ctx.fillRect(rand(-6,6),by+4,W,rand(4,16)); ctx.globalAlpha=1; }
  }
  if(GL.mirror>0){ ctx.fillStyle='rgba(255,77,210,0.06)'; ctx.fillRect(0,0,W,H); }
  if(GL.blackout>0){ ctx.fillStyle='rgba(5,3,10,'+Math.min(1,GL.blackout)+')'; ctx.fillRect(0,0,W,H); }
  if(gFakeReset&&gResetT<2.1){ ctx.fillStyle='rgba(5,3,10,0.7)'; ctx.fillRect(0,0,W,H); ctx.textAlign='center'; ctx.fillStyle='#38e8ff'; ctx.font='bold 44px Courier New'; ctx.fillText('◄◄ REWIND',W/2+rand(-3,3),H/2); ctx.font='14px Courier New'; ctx.fillStyle='#9b8fc4'; ctx.fillText('SYSTEM RESTORED…?',W/2,H/2+34); ctx.textAlign='left'; }
}

// ---------- 업데이트 ----------
function update(dt){
  if(state!=='play') return;
  if(cutsceneT>0){ cutsceneT-=dt; if(bossEvolve){ bossEvolve.t+=dt; if(cutsceneT<=0) bossEvolve=null; } return; }
  if(eliteIntro){ updateEliteIntro(dt); return; }
  if(slowmoT>0){ slowmoT-=dt; if(slowmoT<=0){ slowmoT=0; timeScale=1; } }
  if(typeof GL!=='undefined'&&GL.frameDrop>0){ timeScale=(Math.random()<0.25)?0.22:rand(0.7,1.4); }
  else if(slowmoT<=0){ timeScale=1; }
  dt*=timeScale;
  ambientTimer-=dt;
  if(ambientTimer<=0){ ambientTimer=rand(1.6,3.4); if(Math.random()<0.85) chatRandom(pick(AMBIENT)); }

  // 타이머
  if(player.iframes>0) player.iframes-=dt;
  if(player.dodgeCharges<player.dodgeMaxCharges){ if(player.dodgeCd>0) player.dodgeCd-=dt; if(player.dodgeCd<=0){ player.dodgeCharges++; if(player.dodgeCharges<player.dodgeMaxCharges) player.dodgeCd=10*player.dodgeCdMul; } }
  if(player.shieldRegen>0){ player.shieldRegenT=(player.shieldRegenT||0)+dt; if(player.shieldRegenT>=player.shieldRegen){ player.shieldRegenT=0; player.hitShield=Math.min((player.hitShield||0)+1,1); } }
  if(player.minion){ const mn=player.minion; mn.ang=(mn.ang||0)+dt*2.2; mn.x=player.x+Math.cos(mn.ang)*48; mn.y=player.y+Math.sin(mn.ang)*48; mn.fireT=(mn.fireT||0)-dt; if(mn.fireT<=0){ let tx=null,ty=null,bd=1e9; for(const e of enemies){ const d2=dist2(mn.x,mn.y,e.x,e.y); if(d2<bd){bd=d2;tx=e.x;ty=e.y;} } if(boss){ const d2=dist2(mn.x,mn.y,boss.x,boss.y); if(d2<bd){bd=d2;tx=boss.x;ty=boss.y;} } if(tx!==null && bd<200000){ const ma=Math.atan2(ty-mn.y,tx-mn.x); pBullets.push({x:mn.x,y:mn.y,vx:Math.cos(ma)*520,vy:Math.sin(ma)*520,r:5,dmg:Math.max(2,player.dmg*player.dmgMul*0.55),life:1.0,bounce:0,pierce:0,hitSet:new Set(),crit:false,homing:0}); mn.fireT=0.6; } else mn.fireT=0.3; } }
  if(player.regen!==0){ player.regenAcc+=dt; if(player.regenAcc>=1){ player.regenAcc-=1; player.hp=clamp(player.hp+player.regen,1,player.maxhp); updateHpHud(); } }
  if(player.buffs.rage>0) player.buffs.rage-=dt;
  if(player.buffs.haste>0) player.buffs.haste-=dt;
  if(player.buffs.shield>0) player.buffs.shield-=dt;
  if(hitFlash>0) hitFlash-=dt;
  if(screenShake>0) screenShake=Math.max(0,screenShake-dt*40);
  if(bossBanner>0) bossBanner-=dt;

  // 구르기
  if(player.dodging>0){ player.dodging-=dt; }
  if(!keys[' ']) dodgeLatch=false;   // 스페이스 떼면 재장전
  if(keys[' ']&&!dodgeLatch&&player.dodgeCharges>0&&player.dodging<=0){
    dodgeLatch=true;
    player.dodging=0.22+(player.dodgeIframeBonus||0); if(player.dodgeCd<=0) player.dodgeCd=10*player.dodgeCdMul; player.dodgeCharges--; sfx.dodge(); if(tutorial)tutorial.dodged=true;
    if(player.dodgeHaste) player.buffs.haste=Math.max(player.buffs.haste,2.5);
    if(player.dodgeBlast>0){ enemies.slice().forEach(o=>{ if(dist2(o.x,o.y,player.x,player.y)<38025){ o.hp-=player.dodgeBlast; o.hitT=0.1; const ka=Math.atan2(o.y-player.y,o.x-player.x); o.x+=Math.cos(ka)*69; o.y+=Math.sin(ka)*69; if(o.hp<=0){ if(o.type==='hyechul'&&(o.phase||1)<3) hyechulNextPhase(o); else killEnemy(o);} } }); burst(player.x,player.y,'#38e8ff',22,280); screenShake=Math.max(screenShake,8); }
    let mvx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
    let mvy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
    if(typeof GL!=='undefined'&&GL.keyRev>0){ mvx=-mvx; mvy=-mvy; }
    if(mvx===0&&mvy===0){ mvx=Math.cos(player.facing); mvy=Math.sin(player.facing); }
    const m=Math.hypot(mvx,mvy)||1; player.dvx=mvx/m; player.dvy=mvy/m;
    burst(player.x,player.y,'#38e8ff',8,120);
  }

  // 이동
  let mvx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
  let mvy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
  if(typeof GL!=='undefined'&&GL.keyRev>0){ mvx=-mvx; mvy=-mvy; }
  const m=Math.hypot(mvx,mvy);
  let sp=player.spd*(player._creepSlow?0.5:1)*(player._slowField?0.5:1); if(typeof gSlow!=='undefined'&&gSlow.length&&gSlow.some(f=>dist2(f.x,f.y,player.x,player.y)<f.r*f.r)) sp*=0.45;
  if(player.dodging>0){ player.x+=player.dvx*520*dt; player.y+=player.dvy*520*dt; }
  else if(m>0){ player.x+=(mvx/m)*sp*dt; player.y+=(mvy/m)*sp*dt; if(tutorial)tutorial.moved=true; }
  player.x=clamp(player.x,player.r,W-player.r);
  player.y=clamp(player.y,player.r,H-player.r);

  // 발사
  if(player.fireTimer>0) player.fireTimer-=dt;
  if((mouseDown || (typeof autoFire!=='undefined'&&autoFire)) && player.fireTimer<=0 && !roomCleared){
    playerShoot(); if(tutorial)tutorial.shot=true;
    player.fireTimer=0.35*player.fireMul/(1+player.fireAdd)*(player.buffs.haste>0?0.5:1)*(player._fireHandicap||1);
  }

  // 플레이어 탄
  for(let i=pBullets.length-1;i>=0;i--){
    const b=pBullets[i];
    if(b.homing){
      let tx=null,ty=null,bd=1e9;
      for(const e of enemies){ const d=dist2(b.x,b.y,e.x,e.y); if(d<bd){bd=d;tx=e.x;ty=e.y;} }
      if(boss){ const d=dist2(b.x,b.y,boss.x,boss.y); if(d<bd){bd=d;tx=boss.x;ty=boss.y;} }
      if(tx!==null){ const cur=Math.atan2(b.vy,b.vx); let da=Math.atan2(ty-b.y,tx-b.x)-cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; const sp=Math.hypot(b.vx,b.vy), na=cur+clamp(da,-b.homing*dt,b.homing*dt); b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; }
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    // 벽 반사
    if(b.bounce>0){
      if(b.x<b.r||b.x>W-b.r){ b.vx*=-1; b.bounce--; b.x=clamp(b.x,b.r,W-b.r); }
      if(b.y<b.r||b.y>H-b.r){ b.vy*=-1; b.bounce--; b.y=clamp(b.y,b.r,H-b.r); }
    }
    let dead=b.life<=0||b.x<-20||b.x>W+20||b.y<-20||b.y>H+20;
    // 적 충돌
    if(!dead){
      for(const e of enemies){
        if(b.hitSet.has(e)) continue;
        if(dist2(b.x,b.y,e.x,e.y)<(b.r+e.r)**2){
          damageEnemy(e,b.dmg,b.crit,true);
          if(b.pierce>0){ b.pierce--; b.hitSet.add(e); }
          else { dead=true; }
          break;
        }
      }
    }
    if(!dead && boss){
      if(dist2(b.x,b.y,boss.x,boss.y)<(b.r+boss.r)**2){
        if(kijoReflectsBullet(boss,b)){
          const ra=Math.atan2(player.y-boss.y,player.x-boss.x)+rand(-0.16,0.16);
          eBullets.push({x:b.x,y:b.y,vx:Math.cos(ra)*260,vy:Math.sin(ra)*260,r:8,dmg:9,life:3.2,srcName:'키죠의 반사'});
          burst(b.x,b.y,'#ffd34d',12,220); screenShake=Math.max(screenShake,5); dead=true;
        } else {
          boss.hp-=b.dmg*player.bossDmgMul; boss.hitT=0.08; burst(b.x,b.y,'#fff',5,140); sfx.hit();
          if(b.pierce>0){ b.pierce--; } else dead=true;
          if(boss.hp<=0) killBoss();
        }
      }
    }
    if(dead) pBullets.splice(i,1);
  }

  // 적 탄
  for(let i=eBullets.length-1;i>=0;i--){
    const b=eBullets[i];
    if(b.home){ const cur=Math.atan2(b.vy,b.vx); let da=Math.atan2(player.y-b.y,player.x-b.x)-cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; const spd=Math.hypot(b.vx,b.vy), na=cur+clamp(da,-b.home*dt,b.home*dt); b.vx=Math.cos(na)*spd; b.vy=Math.sin(na)*spd; }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; if(b.spinV) b.spin=(b.spin||0)+b.spinV*dt;
    if(b.life<=0||b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){ eBullets.splice(i,1); continue; }
    if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2){
      hurtPlayer(b.dmg, b.srcName||(boss?boss.name:'시청자')); eBullets.splice(i,1);
    }
  }

  // 떠다니는 사망 말풍선 (적이 사라진 자리에 잠시 남음)
  for(let i=floatBubbles.length-1;i>=0;i--){ const fb=floatBubbles[i]; fb.t+=dt; fb.y+=fb.vy*dt; fb.vy*=0.90; if(fb.t>=fb.max) floatBubbles.splice(i,1); }

  // 적 AI
  for(const e of enemies){
    if(e.hitT>0) e.hitT-=dt;
    if(e.taunt&&e.taunt.t>0) e.taunt.t-=dt;
    e.coolT-=dt; e.wob+=dt*3;
    if(e._spd0==null) e._spd0=e.spd;
    const _chl=(e.chillT=(e.chillT||0))>0; if(_chl) e.chillT-=dt; e.spd=_chl? e._spd0*0.5 : e._spd0;
    if((e.burnT=(e.burnT||0))>0){ e.burnT-=dt; e.hp-=(e.burnDmg||0)*dt; e.hitT=Math.max(e.hitT,0.04); if(e.hp<=0){ if(e.type==='hyechul'&&(e.phase||1)<3) hyechulNextPhase(e); else if(e.type==='kkotchung'&&(e.phase||1)<3) kkotNextPhase(e); else killEnemy(e); continue; } }
    if((e.psT=(e.psT||0))>0){ e.psT-=dt; e.hp-=(e.psStacks||0)*(e.psDmg||0)*dt; e.hitT=Math.max(e.hitT,0.04); if(e.hp<=0){ if(e.type==='hyechul'&&(e.phase||1)<3) hyechulNextPhase(e); else if(e.type==='kkotchung'&&(e.phase||1)<3) kkotNextPhase(e); else killEnemy(e); continue; } } else { e.psStacks=0; }
    const a=Math.atan2(player.y-e.y,player.x-e.x);
    const d=Math.hypot(player.x-e.x,player.y-e.y);
    if((e.stunT=(e.stunT||0))>0){ e.stunT-=dt; }
    else if(e.ai==='chase'){
      if((e.lungeA=e.lungeA||0)>0){ const lm=(e.type==='goblin_warrior')?5.2:4.0; e.lungeA-=dt; e.x+=e.lvx*e.spd*lm*dt; e.y+=e.lvy*e.spd*lm*dt;
        // 러라 잔상 폭발: 돌진 중 잔상 위치를 기록하고, 돌진 종료 시 2초 후 폭발
        if(e.type==='reura'){ if(!(e.afterimageT>0)) e.afterimageT=0; e.afterimageT-=dt; if(e.afterimageT<=0){ e.afterimageT=0.07; const ax=e.x, ay=e.y; (e.afterimages=e.afterimages||[]).push({x:ax,y:ay,t:2.0}); burst(ax,ay,'#ffd166',4,80); } }
      }
      else { e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      if(e.canLunge && e.lungeA<=0){ const lw=(e.type==='goblin_warrior'); e.lungeT=(e.lungeT==null?rand(lw?1.0:1.6, lw?1.9:3.0):e.lungeT)-dt; if(e.lungeT<=0 && d<(lw?470:380) && d>40){ e.lungeA=lw?0.34:0.30; e.lvx=Math.cos(a); e.lvy=Math.sin(a); e.lungeT=rand(lw?1.7:2.6, lw?2.7:3.8); burst(e.x,e.y,e.color,lw?12:8,lw?210:170); if(typeof beep==='function')beep(lw?210:180,0.06,'square',0.04); } }
      // 러부엉: 근접(거리 70 이하) 시 날개 퍼덕임 — 플레이어 넉백
      if(e.type==='goblin_warrior'){
        e._wingT=(e._wingT==null?rand(1.8,2.8):e._wingT)-dt;
        if(e._wingT<=0 && d<70){
          const ka=Math.atan2(player.y-e.y,player.x-e.x);
          player.x+=Math.cos(ka)*130; player.y+=Math.sin(ka)*130;
          player.x=clamp(player.x,18,W-18); player.y=clamp(player.y,18,H-18);
          hurtPlayer(e.dmg*0.6,'러부엉'); burst(e.x,e.y,'#6fae4e',14,200);
          if(typeof beep==='function')beep(250,0.1,'square',0.05); banner('🪶 날개 퍼덕임!','','500');
          e._wingT=rand(2.2,3.4);
        }
      }
      if(e.type==='goblin_bomber'){ if(d<175){ e._fuseT=(e._fuseT||0)+dt; const brake=d<55?1.45:0.45; e.x-=Math.cos(a)*e.spd*brake*dt; e.y-=Math.sin(a)*e.spd*brake*dt; if(!e._fuse){ e._fuse=true; burst(e.x,e.y,'#ff4d4d',6,150); if(typeof beep==='function')beep(90,0.05,'square',0.05); } } else { e._fuse=false; e._fuseT=0; } }
      // 나무 피격 방어력 버프 타이머 감소
      if(e._armorBuff>0){ e._armorBuff-=dt; if(e._armorBuff<=0){ e._armorBuff=0; e.armor=Math.max((e.armor||0)-0.12,0); } }
      if(e._namuBuffT>0) e._namuBuffT-=dt;
      if(e.type==='namu'){ e.poundT=(e.poundT==null?rand(2.6,4.2):e.poundT)-dt; if(e.poundT<=0){ const k=12; for(let i=0;i<k;i++){ const a2=i/k*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*150,vy:Math.sin(a2)*150,r:9,dmg:9,life:2.6,spore:true,srcName:'나무'}); } burst(e.x,e.y,e.color,16,200); if(typeof beep==='function')beep(70,0.18,'sawtooth',0.06); e.poundT=rand(3.4,4.8); } }
      // 러라 잔상 폭발 처리
      if(e.type==='reura' && e.afterimages && e.afterimages.length){
        for(let i=e.afterimages.length-1;i>=0;i--){
          e.afterimages[i].t-=dt;
          if(e.afterimages[i].t<=0){
            const ax=e.afterimages[i].x, ay=e.afterimages[i].y;
            const k=10; for(let j=0;j<k;j++){ const a2=j/k*TAU; eBullets.push({x:ax,y:ay,vx:Math.cos(a2)*180,vy:Math.sin(a2)*180,r:7,dmg:8,life:2.2,srcName:'러라'}); }
            burst(ax,ay,'#ffd166',16,220); screenShake=Math.max(screenShake||0,4); if(typeof beep==='function')beep(160,0.14,'sawtooth',0.06);
            e.afterimages.splice(i,1);
          }
        }
      }
    }else if(e.ai==='erratic'){
      const wob=Math.sin(e.wob*2)*0.6;
      e.x+=Math.cos(a+wob)*e.spd*dt; e.y+=Math.sin(a+wob)*e.spd*dt;
    }else if(e.ai==='shooter'){
      // 거리 유지하며 사격
      if(d<e.range*0.6){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>e.range){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      if(e.coolT<=0){
        e.shotN=(e.shotN||0)+1;
        if(e.type==='gwangcheon_gim' && e.shotN%3===0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa)*255,vy:Math.sin(pa)*255,r:7,dmg:9,life:4,srcName:e.name}); }, i*110);
          // 김 가루 살포: 5발 연사 후마다 주변에 감속장 생성
          if(e.shotN%5===0){
            setTimeout(()=>{ if(enemies.includes(e)){ spawnSlowField(e.x,e.y,80,4); burst(e.x,e.y,'#3f7a34',14,160); banner('🌿 김 가루 살포','범위 내 이동 둔화',700); if(typeof beep==='function')beep(180,0.12,'sawtooth',0.05); } }, 340);
          }
        } else if(e.type==='goblin_archer' && e.shotN%3===0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa)*260,vy:Math.sin(pa)*260,r:7,dmg:9,life:4,srcName:e.name}); }, i*85);
        } else enemyShootAt(e,player.x,player.y,240,7,9);
        e.coolT=e.cool;
      }
    }else if(e.ai==='orbit'){
      // 일정 거리 공전 + 사격
      const target=e.range;
      const radial=(d-target);
      e.x+=Math.cos(a)*Math.sign(radial)*e.spd*dt;
      e.y+=Math.sin(a)*Math.sign(radial)*e.spd*dt;
      e.x+=Math.cos(a+Math.PI/2)*e.spd*0.6*dt;
      e.y+=Math.sin(a+Math.PI/2)*e.spd*0.6*dt;
      if(e.coolT<=0){
        e.shotN=(e.shotN||0)+1;
        if(e.shotN%3===0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x); const kw=(e.type==='goblin_shaman'); const lo=kw?-2:-1, hi=kw?2:1;
          for(let i=lo;i<=hi;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.24)*210,vy:Math.sin(pa+i*0.24)*210,r:8,dmg:9,life:3.6,srcName:e.name});
        } else enemyShootAt(e,player.x,player.y,200,8,9);
        e.coolT=e.cool;
      }
      // 까치: HP 50% 이하 시 급강하 돌격
      if(e.type==='goblin_shaman' && e.hp<=e.maxhp*0.5 && !e._diveMode){
        e._diveMode=true; banner('🐦 까치 급강하!','체력이 절반 이하!',800);
      }
      if(e.type==='goblin_shaman' && e._diveMode){
        e._diveT=(e._diveT==null?rand(2.0,3.2):e._diveT)-dt;
        if(e._diveT<=0){
          // 급강하: 빠르게 플레이어를 향해 직진 후 복귀
          if(!e._diving){ e._diving=true; e._diveAx=Math.cos(a); e._diveAy=Math.sin(a); e._diveLife=0.28; burst(e.x,e.y,'#8a6fb0',10,180); if(typeof beep==='function')beep(300,0.12,'square',0.05); banner('🐦 급강하!','','500'); }
        }
        if(e._diving){
          e._diveLife-=dt;
          e.x+=e._diveAx*e.spd*6.0*dt; e.y+=e._diveAy*e.spd*6.0*dt;
          if(dist2(e.x,e.y,player.x,player.y)<2500){ hurtPlayer(e.dmg,'까치'); burst(e.x,e.y,'#8a6fb0',12,200); e._diving=false; e._diveT=rand(2.0,3.2); }
          if(e._diveLife<=0){ e._diving=false; e._diveT=rand(2.0,3.2); }
        }
      }
    }
    else if(e.ai==='egg'){
      e.hatchT-=dt;
      if(e.hatchT<0.55) e.wob+=dt*20;
      if(e.hatchT<=0){
        spawnEnemy(e.hatchType,e.x,e.y,1);
        burst(e.x,e.y,'#d24a2a',22,280); burst(e.x,e.y,'#ffd24a',10,180);
        if(typeof beep==='function') beep(140,0.2,'sawtooth',0.07);
        screenShake=Math.max(screenShake||0,5);
        const ix=enemies.indexOf(e); if(ix>=0) enemies.splice(ix,1);
        continue;
      }
    }
    else if(e.ai==='hyechul'){
      const ph=e.phase||1; e.wob+=dt*2;
      const tx=clamp(player.x,80,W-80), ty=clamp(player.y-210,110,260);
      e.x+=Math.sign(tx-e.x)*Math.min(Math.abs(tx-e.x),e.spd*dt);
      e.y+=Math.sign(ty-e.y)*Math.min(Math.abs(ty-e.y),e.spd*0.55*dt);
      e.faceAng=a;
      // ── 하이브 과부하 충전 중: 소환·공격 정지, 충전 후 화면 링 버스트 ──
      if(e.climaxT>0){
        e.climaxT-=dt; e.wob+=dt*18;
        if(Math.random()<0.6) burst(e.x+rand(-e.r,e.r),e.y+rand(-e.r,e.r),'#ff5a2a',2,220);
        if(e.climaxT<=0){
          for(let ring=0;ring<3;ring++){ const k=22+ring*5, sp=150+ring*55; for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*0.22; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:8,dmg:11,life:4.2,spore:true}); } }
          spawnCreep(e.x,e.y); screenShake=Math.max(screenShake||0,16);
          banner('💥 과부하 폭발!','',800); beep(60,0.5,'sawtooth',0.09);
          e.atkT=2.4;
        }
      } else {
        e.atkT=(e.atkT==null?1.6:e.atkT)-dt;
        if(e.atkT<=0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          const slot=(e.atkN=(e.atkN||0))%6; e.atkN++;
          const base=ph===1?1.8:ph===2?1.5:1.3;  // 페이즈 올라갈수록 빠르게
          if(ph===1){
            if(slot===0){
              // 알 3개 맵 무작위 3곳 투척
              hyechulSpawnEgg(e,'zergling',3,6);
              e.atkT=base+0.5;
            } else if(slot===1){
              // 포자탄 5발 부채꼴 연사 (기존 3발→5발)
              for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.18)*235,vy:Math.sin(pa+i*0.18)*235,r:8,dmg:9,life:3,spore:true});
              banner('💚 포자탄','피해라!',600);
              e.atkT=base;
            } else if(slot===2){
              // 산성침 7발 광역 부채꼴 (기존 5발→7발)
              for(let i=-3;i<=3;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.15)*215,vy:Math.sin(pa+i*0.15)*215,r:8,dmg:9,life:3.4,spore:true});
              banner('🟢 산성침 7연발','','600');
              e.atkT=base;
            } else if(slot===3){
              // 버로우 가시 맵 무작위 10곳 이상 (기존 3곳→10곳)
              spawnFirePillar(player.x,player.y);
              const pillarsN=10+irand(0,3);
              for(let i=0;i<pillarsN;i++) spawnFirePillar(rand(50,W-50),rand(120,H-80));
              banner('🦴 버로우 가시!','맵 전체 발밑 위험!',900);
              e.atkT=base+0.5;
            } else if(slot===4){
              // 산성비 상단에서 대량 낙하 (1막)
              const rainN=18+irand(0,6);
              for(let i=0;i<rainN;i++){ const fx=rand(20,W-20); eBullets.push({x:fx,y:-12,vx:rand(-15,15),vy:rand(175,215),r:8,dmg:8,life:4.5,spore:true}); }
              banner('🌧️ 산성비 폭우','위에서 쏟아진다!',750);
              e.atkT=base+0.2;
            } else {
              spawnSlowField(player.x,player.y,96,7);
              spawnSlowField(rand(120,W-120),rand(180,H-120),80,7);
              banner('🕸️ 점막 늪','이동이 느려진다',800);
              e.atkT=base;
            }
          } else if(ph===2){
            if(slot===0){
              // 알 3개 맵 무작위 3곳 투척
              hyechulSpawnEgg(e,'mutalisk',3,9);
              e.atkT=base+0.4;
            } else if(slot===1){
              // 포자탄 전방위 링 (10발)
              for(let i=0;i<10;i++){ const a2=i/10*TAU+e.atkN*0.5; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*225,vy:Math.sin(a2)*225,r:8,dmg:9,life:3.2,spore:true}); }
              banner('💚 포자탄 링','전방위 사격!',650);
              e.atkT=base;
            } else if(slot===2){
              // 산성침 5발 추적탄
              for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.22)*250,vy:Math.sin(pa+i*0.22)*250,r:7,dmg:10,life:3.4,spore:true,home:1.8});
              banner('🟢 추적 산성침','피해라!',650);
              e.atkT=base;
            } else if(slot===3){
              // 버로우 가시 맵 무작위 12곳 이상
              const pillarsN=12+irand(0,4);
              spawnFirePillar(player.x,player.y);
              for(let i=0;i<pillarsN;i++) spawnFirePillar(rand(40,W-40),rand(110,H-70));
              banner('🦴 버로우 가시 폭격!','맵 전체 위험!',900);
              e.atkT=base+0.4;
            } else if(slot===4){
              // 산성비 상단 대량 낙하 (2막 - 더 많이)
              const rainN=26+irand(0,8);
              for(let i=0;i<rainN;i++){ const fx=rand(15,W-15); eBullets.push({x:fx,y:-12,vx:rand(-20,20),vy:rand(180,225),r:8,dmg:9,life:4.5,spore:true}); }
              // 좌우 측면에서도 약간
              for(let i=0;i<4;i++){ eBullets.push({x:-10,y:rand(100,H-100),vx:rand(140,180),vy:rand(-20,20),r:7,dmg:8,life:4,spore:true}); eBullets.push({x:W+10,y:rand(100,H-100),vx:-rand(140,180),vy:rand(-20,20),r:7,dmg:8,life:4,spore:true}); }
              banner('🌧️ 폭풍 산성비','사방에서 쏟아진다!',800);
              e.atkT=base+0.3;
            } else {
              spawnSlowField(player.x,player.y,98,7);
              spawnSlowField(rand(120,W-120),rand(180,H-120),84,7);
              banner('🕸️ 점막 늪','이동이 느려진다',800);
              e.atkT=base;
            }
          } else {
            if(slot===0){
              // 울트라 알 3개 맵 무작위 3곳
              hyechulSpawnEgg(e,'ultra',3,12);
              e.atkT=base+0.6;
            } else if(slot===1){
              // 버로우 가시 + 점막 - 최종페이즈 맵 15곳 이상
              const pillarsN=15+irand(0,5);
              spawnFirePillar(player.x,player.y);
              for(let i=0;i<pillarsN;i++) spawnFirePillar(rand(40,W-40),rand(100,H-70));
              spawnCreep(e.x,e.y+30);
              spawnCreep(clamp(player.x,80,W-80),clamp(player.y,150,H-90));
              banner('🔥🦴 버로우+점막 지옥','바닥이 전부 위험!',1000);
              e.atkT=base+0.3;
            } else if(slot===2){
              // 산성침 9발 + 포자탄 링 동시
              for(let i=-4;i<=4;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.16)*260,vy:Math.sin(pa+i*0.16)*260,r:9,dmg:11,life:3,spore:true});
              for(let i=0;i<14;i++){ const a2=i/14*TAU+e.atkN*0.4; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*190,vy:Math.sin(a2)*190,r:8,dmg:9,life:3,spore:true}); }
              banner('💥 산성침+포자탄 폭격','최강 공격!',700);
              e.atkT=base;
            } else if(slot===3){
              // 산성비 엄청난 대량 낙하 (3막 최강)
              const rainN=38+irand(0,10);
              for(let i=0;i<rainN;i++){ const fx=rand(10,W-10); eBullets.push({x:fx,y:-12,vx:rand(-25,25),vy:rand(185,240),r:9,dmg:10,life:4.8,spore:true}); }
              for(let i=0;i<8;i++){ eBullets.push({x:-10,y:rand(80,H-80),vx:rand(150,200),vy:rand(-25,25),r:7,dmg:9,life:4,spore:true}); eBullets.push({x:W+10,y:rand(80,H-80),vx:-rand(150,200),vy:rand(-25,25),r:7,dmg:9,life:4,spore:true}); }
              banner('☠️ 산성비 지옥','하늘과 사방이 무너진다!',900);
              e.atkT=base+0.2;
            } else if(slot===4){
              spawnSlowField(player.x,player.y,104,7);
              spawnSlowField(rand(120,W-120),rand(180,H-120),90,7);
              banner('🕸️ 점막 늪','이동이 느려진다',800);
              e.atkT=base;
            } else {
              e.climaxT=1.2;
              banner('⚡ 하이브 과부하','충전 중 — 흩어져라!',1100);
              beep(50,0.6,'sawtooth',0.08);
              screenShake=Math.max(screenShake||0,8);
            }
          }
          beep(120,0.1,'sawtooth',0.05);
        }
      }
    }
    else if(e.ai==='charge'){
      if(!e.cs) e.cs='approach';
      if(e.cs==='approach'){
        e.faceAng=a;
        e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt;
        if(e.coolT<=0 && d<470){
          if(e.type==='rhino_beetle'){
            const worms=enemies.filter(x=>x.type==='earthworm').length, roll=Math.random();
            if(worms<8 && roll<0.28){ e.cs='cast'; e.csT=0.6; }
            else if(roll<0.5){ e.cs='spit'; e.csT=0.35; e.aimX=Math.cos(a); e.aimY=Math.sin(a); }
            else if(roll<0.72){ e.cs='burst'; e.csT=0.55; }
            else { e.cs='wind'; e.csT=0.65; }
          } else { e.cs='wind'; e.csT=0.45; }
        }
      } else if(e.cs==='cast'){
        e.csT-=dt; e.wob+=dt*22; e.faceAng=a;
        if(e.csT<=0){
          const n=3+(Math.random()<0.5?1:0);
          for(let i=0;i<n;i++){ const wa=rand(0,TAU), dd=e.r+22; spawnEnemy('earthworm', clamp(e.x+Math.cos(wa)*dd,30,W-30), clamp(e.y+Math.sin(wa)*dd,30,H-30), 1); }
          burst(e.x,e.y,'#e87a8a',14,160); banner('지렁이 소환!','',700); beep(160,0.2,'sawtooth',0.06);
          e.cs='rest'; e.csT=0.5; e.coolT=1.8;
        }
      } else if(e.cs==='spit'){
        e.csT-=dt; e.faceAng=a;
        if(e.csT<=0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.22)*260,vy:Math.sin(pa+i*0.22)*260,r:7,dmg:8,life:3,spore:true});
          beep(300,0.05,'square',0.05);
          e.cs='rest'; e.csT=0.4; e.coolT=1.2;
        }
      } else if(e.cs==='burst'){
        e.csT-=dt; e.wob+=dt*24;
        if(e.csT<=0){
          const k=14; for(let i=0;i<k;i++){ const a2=i/k*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*230,vy:Math.sin(a2)*230,r:7,dmg:8,life:3.2,spore:true}); }
          burst(e.x,e.y,'#caa14a',16,210); beep(120,0.3,'sawtooth',0.07);
          e.cs='rest'; e.csT=0.4; e.coolT=1.6;
        }
      } else if(e.cs==='wind'){
        e.csT-=dt; e.wob+=dt*26; e.faceAng=a; e.aimX=Math.cos(a); e.aimY=Math.sin(a);
        if(e.csT<=0){ e.cs='dash'; e.csT=0.5; beep(200,0.12,'sawtooth',0.06); }
      } else if(e.cs==='dash'){
        e.csT-=dt; e.faceAng=Math.atan2(e.aimY,e.aimX);
        e.x+=e.aimX*e.spd*5.5*dt; e.y+=e.aimY*e.spd*5.5*dt;
        if(e.x<=e.r||e.x>=W-e.r||e.y<=e.r||e.y>=H-e.r){
          // 포베어: 벽 충돌 시 튕기며 재돌진
          if(e.type==='pobear' && !(e._bounced)){
            if(e.x<=e.r||e.x>=W-e.r) e.aimX*=-1;
            if(e.y<=e.r||e.y>=H-e.r) e.aimY*=-1;
            e.x=clamp(e.x,e.r,W-e.r); e.y=clamp(e.y,e.r,H-e.r);
            e._bounced=true; e.csT=0.45;
            burst(e.x,e.y,'#c8884a',16,240); screenShake=Math.max(screenShake,8); if(typeof beep==='function')beep(110,0.18,'sawtooth',0.07);
            banner('💥 반동 재돌진!','',550);
          } else { e._bounced=false; e.csT=0; e.stunT=0.9; burst(e.x,e.y,'#caa14a',14,200); screenShake=Math.max(screenShake,6); }
        }
        if(e.csT<=0 && !e._bounced){ e._bounced=false; e.cs='rest'; e.csT=0.6; e.coolT=1.7; }
        if(e.csT<=0 && e._bounced){ e._bounced=false; e.cs='rest'; e.csT=0.6; e.coolT=1.7; }
      } else { e.csT-=dt; if(e.csT<=0) e.cs='approach'; }
    }
    else if(e.ai==='kkotchung'){
      // === 양갱: 3페이즈 엘리트 ===
      const ph=e.phase||1;
      e.wob+=dt*2.2;

      // 페이즈 전환 체크 (HP 기준)
      if(ph===1 && e.hp<=e.maxhp*0.66){ kkotNextPhase(e); return; }
      if(ph===2 && e.hp<=e.maxhp*0.33){ kkotNextPhase(e); return; }

      // 이동: 페이즈별 거리 유지
      const kkWant=ph===1?230:ph===2?180:130;
      if(d<kkWant-30){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>kkWant+40){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      e.x+=Math.cos(a+Math.PI/2)*e.spd*(ph===3?0.85:ph===2?0.65:0.45)*dt;
      e.y+=Math.sin(a+Math.PI/2)*e.spd*(ph===3?0.85:ph===2?0.65:0.45)*dt;

      // climaxT: 충전 중 공격 정지 → 터짐
      if(e.climaxT>0){
        e.climaxT-=dt; e.wob+=dt*16;
        if(Math.random()<0.5) burst(e.x+rand(-e.r,e.r),e.y+rand(-e.r,e.r),'#ff2060',2,200);
        if(e.climaxT<=0){
          // 전방위 꽃잎 폭발 3중 링
          for(let ring=0;ring<3;ring++){
            const k=16+ring*6, sp=160+ring*50;
            for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*0.28; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:9,dmg:11,life:4.2,srcName:'양갱',kkot:true}); }
          }
          spawnSlowField(e.x,e.y,110,5);
          screenShake=Math.max(screenShake||0,14);
          banner('🍯 꽃잎 폭발','','800');
          beep(60,0.5,'sawtooth',0.09);
          e.atkT=2.2;
        }
      } else {
        e.atkT=(e.atkT==null?1.8:e.atkT)-dt;
        if(e.atkT<=0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          const slot=(e.atkN=(e.atkN||0))%6; e.atkN++;
          const base=ph===1?1.9:ph===2?1.5:1.2;

          if(ph===1){
            if(slot===0){
              // 꽃잎 소용돌이 8발 (회전 오프셋)
              const k=8; for(let i=0;i<k;i++){ const a2=i/k*TAU+e.atkN*0.35; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*215,vy:Math.sin(a2)*215,r:8,dmg:9,life:3.2,srcName:'양갱',kkot:true}); }
              banner('🍯 꽃잎 사격','',500); beep(880,0.05,'sine',0.04);
              e.atkT=base;
            } else if(slot===1){
              // 조준 3연사
              for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)){ const a2=Math.atan2(player.y-e.y,player.x-e.x); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*265,vy:Math.sin(a2)*265,r:8,dmg:10,life:3.0,srcName:'양갱',kkot:true}); } },i*130);
              e.atkT=base;
            } else if(slot===2){
              // 바닥 가시 (플레이어 위치 + 랜덤 8곳)
              spawnFirePillar(player.x,player.y);
              for(let i=0;i<8;i++) spawnFirePillar(rand(50,W-50),rand(120,H-80));
              banner('🌿 덩굴 가시','바닥이 위험!',850);
              e.atkT=base+0.4;
            } else if(slot===3){
              // 3발 부채꼴
              for(let i=-1;i<=1;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.28)*240,vy:Math.sin(pa+i*0.28)*240,r:9,dmg:10,life:3.5,srcName:'양갱',kkot:true});
              e.atkT=base;
            } else if(slot===4){
              // 덩굴 슬로우장
              spawnSlowField(player.x,player.y,94,6);
              spawnSlowField(rand(100,W-100),rand(160,H-120),78,6);
              banner('🌿 덩굴 늪','이동 둔화',750);
              e.atkT=base;
            } else {
              // 위에서 꽃잎 낙하
              const rainN=14+irand(0,4);
              for(let i=0;i<rainN;i++){ const fx=rand(20,W-20); eBullets.push({x:fx,y:-12,vx:rand(-15,15),vy:rand(170,210),r:8,dmg:8,life:4.5,srcName:'양갱',kkot:true}); }
              banner('🍯 꽃잎 비','위에서 쏟아진다!',700);
              e.atkT=base+0.2;
            }
          } else if(ph===2){
            if(slot===0){
              // 소용돌이 12발 (격노 링)
              const k=12; for(let i=0;i<k;i++){ const a2=i/k*TAU+e.atkN*0.4; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*220,vy:Math.sin(a2)*220,r:8,dmg:9,life:3.6,srcName:'양갱',kkot:true}); }
              banner('🍯 꽃잎 링','전방위 사격!',600);
              e.atkT=base;
            } else if(slot===1){
              // 눈알 추적탄 4발
              const k=4; for(let i=0;i<k;i++){ const a2=pa+(i-(k-1)/2)*0.22; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*240,vy:Math.sin(a2)*240,r:9,dmg:11,life:3.4,srcName:'양갱',kkot:true,home:1.6}); }
              banner('👁 눈알 추적탄','피해라!',650);
              e.atkT=base;
            } else if(slot===2){
              // 바닥 가시 12곳 + 슬로우장
              spawnFirePillar(player.x,player.y);
              for(let i=0;i<12;i++) spawnFirePillar(rand(40,W-40),rand(110,H-70));
              spawnSlowField(rand(80,W-80),rand(140,H-100),88,5);
              banner('🌿 가시+덩굴 콤보','맵 전체 위험!',950);
              e.atkT=base+0.4;
            } else if(slot===3){
              // 더블 링 (혜철이 포자링 스타일)
              const k=12;
              for(let i=0;i<k;i++){ const a2=i/k*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*195,vy:Math.sin(a2)*195,r:8,dmg:9,life:3.8,srcName:'양갱',kkot:true}); }
              for(let i=0;i<k;i++){ const a2=i/k*TAU+Math.PI/k; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*235,vy:Math.sin(a2)*235,r:7,dmg:8,life:3.4,srcName:'양갱',kkot:true}); }
              e.atkT=base;
            } else if(slot===4){
              // 꽃잎 비 (측면도 추가)
              const rainN=22+irand(0,6);
              for(let i=0;i<rainN;i++){ const fx=rand(15,W-15); eBullets.push({x:fx,y:-12,vx:rand(-18,18),vy:rand(178,218),r:8,dmg:9,life:4.5,srcName:'양갱',kkot:true}); }
              for(let i=0;i<4;i++){ eBullets.push({x:-10,y:rand(100,H-100),vx:rand(135,175),vy:rand(-18,18),r:7,dmg:8,life:4,srcName:'양갱',kkot:true}); eBullets.push({x:W+10,y:rand(100,H-100),vx:-rand(135,175),vy:rand(-18,18),r:7,dmg:8,life:4,srcName:'양갱',kkot:true}); }
              banner('🍯 꽃잎 폭풍','사방에서 쏟아진다!',800);
              e.atkT=base+0.3;
            } else {
              // 충전 폭발
              e.climaxT=1.1;
              banner('🍯 충전 중','흩어져라!',1000);
              beep(55,0.5,'sawtooth',0.08); screenShake=Math.max(screenShake||0,6);
            }
          } else {
            // 페이즈3: 최흉
            if(slot===0){
              // 눈알 추적 5발 + 소용돌이
              const k=5; for(let i=0;i<k;i++){ const a2=pa+(i-(k-1)/2)*0.2; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*255,vy:Math.sin(a2)*255,r:9,dmg:12,life:3.2,srcName:'양갱',kkot:true,home:2.0}); }
              const k2=10; for(let i=0;i<k2;i++){ const a2=i/k2*TAU+e.atkN*0.5; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*195,vy:Math.sin(a2)*195,r:7,dmg:8,life:3.8,srcName:'양갱',kkot:true}); }
              banner('👁 눈알+링 동시','최강 공격!',700);
              e.atkT=base;
            } else if(slot===1){
              // 바닥 가시 15곳 + 슬로우 2곳
              spawnFirePillar(player.x,player.y);
              for(let i=0;i<15;i++) spawnFirePillar(rand(35,W-35),rand(100,H-65));
              spawnSlowField(e.x,e.y+40,100,6); spawnSlowField(clamp(player.x,80,W-80),clamp(player.y,140,H-80),86,6);
              banner('🌿 가시 지옥','바닥이 전부 위험!',1000);
              e.atkT=base+0.3;
            } else if(slot===2){
              // 트리플 링
              const k=14;
              for(let ring=0;ring<3;ring++){ for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*(Math.PI/k); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*(185+ring*38),vy:Math.sin(a2)*(185+ring*38),r:8,dmg:10,life:4.0,srcName:'양갱',kkot:true}); } }
              banner('🍯 트리플 링','전방위 최강!',750);
              e.atkT=base;
            } else if(slot===3){
              // 꽃잎 비 최강 + 사방
              const rainN=32+irand(0,8);
              for(let i=0;i<rainN;i++){ const fx=rand(10,W-10); eBullets.push({x:fx,y:-12,vx:rand(-22,22),vy:rand(182,235),r:9,dmg:10,life:4.8,srcName:'양갱',kkot:true}); }
              for(let i=0;i<7;i++){ eBullets.push({x:-10,y:rand(70,H-70),vx:rand(148,195),vy:rand(-22,22),r:7,dmg:9,life:4,srcName:'양갱',kkot:true}); eBullets.push({x:W+10,y:rand(70,H-70),vx:-rand(148,195),vy:rand(-22,22),r:7,dmg:9,life:4,srcName:'양갱',kkot:true}); }
              banner('🍯 심연의 꽃비','하늘과 사방이 무너진다!',900);
              e.atkT=base+0.2;
            } else if(slot===4){
              // 슬로우 3곳
              spawnSlowField(player.x,player.y,108,7); spawnSlowField(rand(110,W-110),rand(160,H-110),92,7); spawnSlowField(e.x,e.y,80,5);
              banner('🌿 덩굴 감옥','이동이 막힌다!',800);
              e.atkT=base;
            } else {
              // 충전 대폭발
              e.climaxT=1.2;
              banner('🍯 심연 개화','충전 중 — 흩어져라!',1100);
              beep(50,0.6,'sawtooth',0.09); screenShake=Math.max(screenShake||0,9);
            }
          }
          beep(120,0.08,'sawtooth',0.04);
        }
      }
    }
    else if(e.ai==='bagjein'){
      // === 박제인간: 레코드판 중간보스 ===
      e.spinAng=(e.spinAng||0)+dt*(e.enr?4.5:2.4);

      // GL 카운트다운 직접 관리 (승우 아닌 박제인간 전용)
      if(!roomIsBoss && roomIsMidboss){
        if(typeof GL!=='undefined'){
          for(const k of ['keyRev','rotActive']) if(GL[k]>0) GL[k]-=dt;
        }
        if(typeof gView!=='undefined'){
          if((typeof GL==='undefined'||GL.rotActive<=0)){ gView.rotT=0; gView.fxT=1; gView.fyT=1; }
          gView.rot+=(gView.rotT-gView.rot)*Math.min(1,dt*5);
          gView.fx+=(gView.fxT-gView.fx)*Math.min(1,dt*5);
          gView.fy+=(gView.fyT-gView.fy)*Math.min(1,dt*5);
        }
      }

      // 격노: HP 40% 이하
      if(!e.enr && e.hp<e.maxhp*0.4){
        e.enr=true; e.spd*=1.4;
        banner('💿 박제인간 격노','B면이 시작된다!',950);
        if(typeof sfx!=='undefined'&&sfx.boss) sfx.boss();
        screenShake=Math.max(screenShake||0,12);
        if(typeof GL!=='undefined') GL.keyRev=4.0;
        banner('⮃ 조작이 반전됐다!','B면 — 되감을 수 없다',1200);
      }

      // 이동
      const want=e.enr?160:240;
      if(d<want-30){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>want+40){ e.x+=Math.cos(a)*e.spd*0.9*dt; e.y+=Math.sin(a)*e.spd*0.9*dt; }
      e.x+=Math.cos(a+Math.PI/2)*e.spd*(e.enr?0.78:0.50)*dt;
      e.y+=Math.sin(a+Math.PI/2)*e.spd*(e.enr?0.78:0.50)*dt;

      // ── 특수 타이머 ──

      // [특수1] 레코드 긁힘 — 슬로우+전방위 폭발 (격노 후 7초마다)
      if(e.enr){
        e.scratchT=(e.scratchT==null?7:e.scratchT)-dt;
        if(e.scratchT<=0){
          e.scratchT=7;
          // 탄 먼저 발사
          const k=32; for(let i=0;i<k;i++){
            const a2=i/k*TAU+e.spinAng;
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*285,vy:Math.sin(a2)*285,r:7,dmg:11,life:4.8,srcName:'박제인간'});
          }
          banner('💿 레코드 긁힘!','…',700);
          beep(40,0.5,'sawtooth',0.08); screenShake=Math.max(screenShake||0,10);
          // 0.45초 뒤 슬로우 — 탄이 날아오는 도중에 걸림
          setTimeout(()=>{
            slowmoT=2.8; timeScale=0.18;
            banner('💿 긁힘','시간이 멈춘다…',1200);
            beep(30,0.8,'sawtooth',0.12); screenShake=Math.max(screenShake||0,14);
          }, 450);
        }
      }

      // [특수2] B면 플레이 — 격노 전 11초마다
      if(!e.enr){
        e.bfaceT=(e.bfaceT==null?11:e.bfaceT)-dt;
        if(e.bfaceT<=0){
          e.bfaceT=11;
          timeScale=3.5;
          banner('💿 B면 플레이','속도가 달라진다!',600);
          beep(440,0.08,'square',0.04);
          setTimeout(()=>{ timeScale=0.25; banner('💿 …','',400); beep(100,0.06,'sine',0.04); }, 380);
          setTimeout(()=>{ timeScale=1; }, 1350);
          const pa2=Math.atan2(player.y-e.y,player.x-e.x);
          for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa2+i*0.2)*265,vy:Math.sin(pa2+i*0.2)*265,r:8,dmg:10,life:3.5,srcName:'박제인간'});
        }
      }

      // [특수3] 화면 회전 — 격노 후 9초마다
      if(e.enr){
        e.rotHackT=(e.rotHackT==null?9:e.rotHackT)-dt;
        if(e.rotHackT<=0){
          e.rotHackT=9;
          if(typeof gView!=='undefined'){
            gView.rotT=Math.PI/2*(Math.random()<0.5?1:-1);
          }
          if(typeof GL!=='undefined') GL.rotActive=5.5;
          banner('↻ 판이 돌아간다','화면이 기울었다!',900);
          beep(80,0.15,'sawtooth',0.06);
          const k=14; for(let i=0;i<k;i++){
            const a2=i/k*TAU+e.spinAng;
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*220,vy:Math.sin(a2)*220,r:8,dmg:9,life:3.8,srcName:'박제인간'});
          }
        }
      }

      // ── 일반 패턴 순환 (7종) ──
      e.atkT=(e.atkT==null?1.7:e.atkT)-dt;
      if(e.atkT<=0){
        e.atkN=(e.atkN||0)+1;
        const pa=Math.atan2(player.y-e.y,player.x-e.x);
        const en=e.enr, ph=e.atkN%7;

        if(ph===0){
          // 소용돌이 링
          const k=en?16:10;
          for(let i=0;i<k;i++){
            const a2=i/k*TAU+e.spinAng+(e.atkN*0.42);
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*240,vy:Math.sin(a2)*240,r:8,dmg:10,life:3.5,srcName:'박제인간'});
          }
          banner('💿 소용돌이','',500);
          beep(200,0.06,'sine',0.04);
          e.atkT=en?1.1:1.7;

        } else if(ph===1){
          // 바늘 쐐기탄
          const k=en?8:5;
          for(let i=0;i<k;i++){
            const a2=pa+(i-(k-1)/2)*0.17;
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*260,vy:Math.sin(a2)*260,r:9,dmg:11,life:3.2,srcName:'박제인간'});
          }
          banner('🎵 바늘 쐐기탄','',550);
          e.atkT=en?1.0:1.7;

        } else if(ph===2){
          // 동심원 링 파동 — 격노 시 4겹
          const rings=en?4:2;
          for(let ring=0;ring<rings;ring++){
            const k=10+ring*4, sp=170+ring*52;
            setTimeout(()=>{
              if(!enemies.includes(e)) return;
              for(let i=0;i<k;i++){
                const a2=i/k*TAU+e.spinAng+ring*0.3;
                eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:8,dmg:9,life:3.8,srcName:'박제인간'});
              }
            }, ring*260);
          }
          banner('💿 링 파동','동심원 확장!',700);
          beep(90,0.12,'triangle',0.05);
          e.atkT=en?1.5:2.1;

        } else if(ph===3){
          // 바늘 낙하
          const cols=en?9:5;
          for(let i=0;i<cols;i++){
            const fx=W*(i+0.5)/cols+rand(-18,18);
            eBullets.push({x:fx,y:-12,vx:rand(-12,12),vy:rand(205,250),r:8,dmg:10,life:4.2,srcName:'박제인간'});
          }
          eBullets.push({x:player.x+rand(-25,25),y:-12,vx:rand(-8,8),vy:245,r:10,dmg:13,life:4,srcName:'박제인간'});
          if(en){
            // 격노 시 측면에서도
            for(let i=0;i<3;i++){ eBullets.push({x:-10,y:rand(80,H-80),vx:rand(170,210),vy:rand(-15,15),r:7,dmg:9,life:4,srcName:'박제인간'}); eBullets.push({x:W+10,y:rand(80,H-80),vx:-rand(170,210),vy:rand(-15,15),r:7,dmg:9,life:4,srcName:'박제인간'}); }
          }
          banner('🎵 바늘 낙하','위에서 쏟아진다!',700);
          e.atkT=en?1.1:1.8;

        } else if(ph===4){
          // RPM 가속
          const steps=en?12:7;
          for(let i=0;i<steps;i++){
            setTimeout(()=>{
              if(!enemies.includes(e)) return;
              const spd=155+i*30;
              const a2=e.spinAng+i*(TAU/steps)*0.7;
              eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*spd,vy:Math.sin(a2)*spd,r:7+Math.floor(i/3),dmg:9,life:3.6,srcName:'박제인간'});
            }, i*100);
          }
          banner('💿 RPM 가속','점점 빨라진다!',750);
          beep(150,0.08,'sawtooth',0.04);
          e.atkT=en?1.3:1.9;

        } else if(ph===5){
          // 방향키 반전 + 조준탄
          if(typeof GL!=='undefined') GL.keyRev=en?5.5:3.5;
          const k=en?6:3;
          for(let i=0;i<k;i++){
            const a2=pa+(i-(k-1)/2)*0.20;
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*250,vy:Math.sin(a2)*250,r:8,dmg:10,life:3.4,srcName:'박제인간'});
          }
          banner('⮃ 방향키 반전!','조작이 뒤집혔다',950);
          beep(300,0.1,'square',0.05);
          e.atkT=en?1.2:1.8;

        } else {
          // 고속 스파이럴 (격노 전 3발 / 격노 후 14발)
          if(!en){
            for(let i=-1;i<=1;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.30)*245,vy:Math.sin(pa+i*0.30)*245,r:8,dmg:10,life:3.4,srcName:'박제인간'});
          } else {
            for(let i=0;i<14;i++){
              setTimeout(()=>{
                if(!enemies.includes(e)) return;
                const a2=e.spinAng+i*(TAU/14);
                eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*255,vy:Math.sin(a2)*255,r:7,dmg:9,life:3.6,srcName:'박제인간'});
              }, i*50);
            }
            banner('💿 고속 회전','','600');
          }
          beep(130,0.1,'sawtooth',0.05);
          e.atkT=en?1.2:1.9;
        }
      }
    }
    else if(e.ai==='yanggaeng'){  // 구 yanggaeng — 혹시 남은 참조 방어용
      const want=240;
      if(d<want-30){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>want+30){ e.x+=Math.cos(a)*e.spd*0.9*dt; e.y+=Math.sin(a)*e.spd*0.9*dt; }
      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*0.5*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.5*dt; }
      e.faceAng=a;
      if(!e.enr && e.hp<e.maxhp*0.4){ e.enr=true; e.spd*=1.3; banner('격노','',900); if(typeof sfx!=='undefined'&&sfx.boss)sfx.boss(); }
      e.atkT=(e.atkT==null?1.6:e.atkT)-dt;
      if(e.atkT<=0){
        e.atkN=(e.atkN||0)+1; const pa=a, en=e.enr, ph=e.atkN%3;
        if(ph===0){ const k=en?9:7; for(let i=0;i<k;i++){ const a2=pa+(i-(k-1)/2)*0.16; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*250,vy:Math.sin(a2)*250,r:8,dmg:10,life:3.4,srcName:'박제인간'}); } }
        else if(ph===1){ const k=en?16:12; for(let i=0;i<k;i++){ const a2=i/k*TAU+e.atkN*0.4; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*200,vy:Math.sin(a2)*200,r:8,dmg:9,life:3.6,srcName:'박제인간'}); } }
        else { const base=pa-0.6; for(let i=0;i<(en?10:7);i++){ const a2=base+i*0.13; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*230,vy:Math.sin(a2)*230,r:7,dmg:9,life:3.4,srcName:'박제인간'}); } }
        e.atkT=en?1.5:2.0; if(typeof beep==='function')beep(110,0.12,'sawtooth',0.05);
      }
    }
    e.x=clamp(e.x,e.r,W-e.r); e.y=clamp(e.y,e.r,H-e.r);
    // 접촉 데미지
    if(e.dmg>0 && dist2(e.x,e.y,player.x,player.y)<(e.r+player.r)**2){
      const canContactHit=player.iframes<=0&&player.dodging<=0&&player.buffs.shield<=0;
      hurtPlayer(e.dmg, e.name||e.label||'시청자');
      if(e.type==='goblin_bomber'&&canContactHit){ const ka=Math.atan2(e.y-player.y,e.x-player.x); e.x=clamp(e.x+Math.cos(ka)*86,e.r,W-e.r); e.y=clamp(e.y+Math.sin(ka)*86,e.r,H-e.r); e.stunT=Math.max(e.stunT||0,0.28); e._fuse=false; e._fuseT=0; }
    }
  }

  // 보스
  if(boss) updateBoss(dt);
  updateKijoFx(dt);

  // 픽업
  for(let i=pickups.length-1;i>=0;i--){
    const pk=pickups[i]; pk.life-=dt; pk.bob+=dt*6;
    // 자석
    const d=Math.hypot(player.x-pk.x,player.y-pk.y);
    if(d<player.magnet){
      const a=Math.atan2(player.y-pk.y,player.x-pk.x);
      pk.x+=Math.cos(a)*260*dt; pk.y+=Math.sin(a)*260*dt;
    }else{ pk.x+=pk.vx*dt; pk.y+=pk.vy*dt; pk.vy+=200*dt; pk.vx*=0.96; if(pk.y>H-20){pk.y=H-20;pk.vy*=-0.4;} }
    if(d<player.r+pk.r){
      if(pk.type==='gold'){ gold+=pk.amt; sfx.coin(); }
      else if(pk.type==='heart'){ player.hp=Math.min(player.maxhp,player.hp+pk.amt); sfx.pick(); }
      pickups.splice(i,1); updateHUD(); continue;
    }
    if(pk.life<=0) pickups.splice(i,1);
  }

  updateHazards(dt);
  // 파티클
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.92; p.vy*=0.92; p.life-=dt;
    if(p.life<=0) particles.splice(i,1);
  }

  // 튜토리얼 완료 판정 + 잠시 뒤 닫기
  if(tutorial&&tutorial.active){
    if(tutorial.moved&&tutorial.shot&&tutorial.dodged&&!tutorial.doneAt) tutorial.doneAt=performance.now()||1;
    if(tutorial.doneAt&&performance.now()-tutorial.doneAt>2600) tutorial.active=false;
  }
  if(tutorialMode && tutorial && tutorial.moved && tutorial.shot && tutorial.dodged && !tutorialDoneFlag){ tutorialDoneFlag=true; finishTutorial(); }
  // 클리어 판정 (레벨업 등 오버레이 중엔 보류)
  if(state==='play' && !tutorialMode && !roomCleared && enemies.length===0 && !boss && bossBanner<=0){
    roomCleared=true; roomIsMidboss=false;
    onCombatCleared();
  }
}

// ========================================================
//  슬더스식 맵 / 노드 진행
// ========================================================

// ===== JS: Map, events, shops, rewards, and level-up UI =====
const MAP_COLS=6, MAP_ROWS=14;           // 15층 구조: 콘텐츠 1~14층(행 0~13), 보스 15층(행 14)
const MIDBOSS_ROW=7, CAMP1_ROW=6, CAMP2_ROW=13; // 중간보스 8층, 모닷불 7층/14층
const MAP_W=660, MAP_H=600, MAP_PADX=46, MAP_PADY=30;
const NODE_ICON={fight:'⚔️',midboss:'🪲',shop:'🛒',event:'❓',boss:'👑',campfire:'🔥',elite:'💀'};
const NODE_PIX={fight:'btv/assets/asset-022-6d0846faec.png',midboss:'btv/assets/asset-023-5c3a9b49e6.png',shop:'btv/assets/asset-024-6dde2d197f.png',event:'btv/assets/asset-025-d287a4d2cc.png',boss:'btv/assets/asset-026-81ae3723cc.png'};
const POTION_PIX={heal:'btv/assets/asset-027-5b89f0a09f.png',rage:'btv/assets/asset-028-248f94d092.png',haste:'btv/assets/asset-029-a42512f36f.png',shield:'btv/assets/asset-030-261b152745.png'};
const NODE_COL ={fight:'#9b8fc4',midboss:'#ffae42',shop:'#5dff9b',event:'#8be8ff',boss:'#ff4d6d',campfire:'#ff8c3a',elite:'#ff4d4d'};
let pendingNode=null;

function nodeXY(row,col){
  const x=MAP_PADX + col*((MAP_W-2*MAP_PADX)/(MAP_COLS-1));
  const totalRows=MAP_ROWS+1;
  const y=MAP_H-MAP_PADY - row*((MAP_H-2*MAP_PADY)/(totalRows-1));
  return {x,y};
}
function genMap(){
  const nm={}; const edges=new Set();
  const key=(r,c)=>r+'_'+c;
  function ensure(r,c){
    const k=key(r,c);
    if(!nm[k]){ const p=nodeXY(r,c); nm[k]={id:k,row:r,col:c,x:p.x,y:p.y,type:null,next:[],done:false}; }
    return nm[k];
  }
  for(let p=0;p<5;p++){          // 5개의 경로를 무작위로 위로
    let c=irand(0,MAP_COLS-1);
    ensure(0,c);
    for(let r=0;r<MAP_ROWS-1;r++){
      let nc=clamp(c+irand(-1,1),0,MAP_COLS-1);
      ensure(r,c); ensure(r+1,nc);
      edges.add(key(r,c)+'>'+key(r+1,nc));
      c=nc;
    }
  }
  // 보스 노드 (상단 중앙)
  const bp=nodeXY(MAP_ROWS,(MAP_COLS-1)/2);
  nm['boss']={id:'boss',row:MAP_ROWS,col:(MAP_COLS-1)/2,x:bp.x,y:bp.y,type:'boss',next:[],done:false};
  Object.values(nm).forEach(n=>{ if(n.row===MAP_ROWS-1) edges.add(n.id+'>boss'); });
  edges.forEach(e=>{ const [f,t]=e.split('>'); if(nm[f]) nm[f].next.push(t); });
  // 타입 배정
  const nodes=Object.values(nm);
  nodes.forEach(n=>{
    if(n.type==='boss') return;
    if(n.row===0){ n.type='fight'; return; }
    if(n.row===MIDBOSS_ROW){ n.type='midboss'; return; }   // 8층 중간보스 관문
    // 모닷불 관문(중간보스 전·보스 전): 무작위성 부여 — 줄마다 모닷불이 아닐 수도 있음
    if(n.row===CAMP1_ROW||n.row===CAMP2_ROW){ n.type=Math.random()<0.5?'campfire':rollNodeType(n.row); return; }
    n.type=rollNodeType(n.row);
  });
  ensureType(nodes,'shop',1);
  ensureTypeInRow(nodes,'campfire',CAMP1_ROW);   // 휴식 보장: 각 관문 줄에 모닷불 최소 1개
  ensureTypeInRow(nodes,'campfire',CAMP2_ROW);
  placeEliteNodes(nodes);   // 자잘자 엘리트 노드 1~2개 (낮은 층 제외)
  const startIds=nodes.filter(n=>n.row===0).map(n=>n.id);
  mapData={nm,nodes,edges:[...edges],startIds,currentId:null,reach:new Set(startIds)};
  buildBackdrop(act);
}
function rollNodeType(row){
  const bag=[];
  for(let i=0;i<34;i++) bag.push('fight');   // 전투 비중 ↓
  for(let i=0;i<32;i++) bag.push('event');    // 미지(❓) 비중 ↑
  if(row>=1) for(let i=0;i<7;i++) bag.push('shop');
  if(row>=2) for(let i=0;i<6;i++) bag.push('campfire');
  return pick(bag);
}
function ensureType(nodes,type,minRow){
  if(nodes.some(n=>n.type===type)) return;
  const cand=nodes.filter(n=>n.type==='fight'&&n.row>=minRow);
  if(cand.length) pick(cand).type=type;
}
function ensureTypeInRow(nodes,type,row){
  const inRow=nodes.filter(n=>n.row===row && n.type!=='boss' && n.type!=='midboss');
  if(!inRow.length || inRow.some(n=>n.type===type)) return;
  pick(inRow).type=type;
}
// 자잘자(엘리트) 노드 배치 — 낮은 층 제외, 런당 1~2개만, 같은 줄 중복 없이 분산
function placeEliteNodes(nodes){
  const want=irand(1,2);
  const cand=nodes.filter(n=>n.type==='fight' && n.row>=4 && n.row<MAP_ROWS-1 &&
    n.row!==MIDBOSS_ROW && n.row!==CAMP1_ROW && n.row!==CAMP2_ROW);
  const usedRows=new Set(); let placed=0;
  while(placed<want && cand.length){
    const n=cand.splice(irand(0,cand.length-1),1)[0];
    if(usedRows.has(n.row)) continue;   // 같은 줄 중복 방지
    n.type='elite'; usedRows.add(n.row); placed++;
  }
}

function showMap(){
  if(mapData.currentId===null) mapData.reach=new Set(mapData.startIds);
  else{
    const cur=mapData.nm[mapData.currentId];
    mapData.reach=new Set((cur?cur.next:[]).filter(id=>!mapData.nm[id].done));
  }
  renderMap();
  $('mapTag').textContent=act+'막 · 경로 선택';
  $('mapTitle').textContent='길을 골라라';
  show('map');
  updateHUD();
}
function mapNum(v){ return Math.round(v*10)/10; }
function mapEdgePath(a,b){
  const dx=b.x-a.x, dy=b.y-a.y;
  const bend=clamp(dx*0.34,-28,28);
  const drift=((a.row+a.col+b.col)%2===0?1:-1)*5;
  const c1x=mapNum(a.x+bend+drift), c1y=mapNum(a.y+dy*0.36);
  const c2x=mapNum(b.x-bend-drift), c2y=mapNum(a.y+dy*0.68);
  return 'M'+mapNum(a.x)+' '+mapNum(a.y)+' C'+c1x+' '+c1y+' '+c2x+' '+c2y+' '+mapNum(b.x)+' '+mapNum(b.y);
}
function renderMap(){
  const cont=$('mapSvg');
  const reach=mapData.reach;
  const cur=mapData.currentId?mapData.nm[mapData.currentId]:null;
  let s='<svg viewBox="0 0 '+MAP_W+' '+MAP_H+'" xmlns="http://www.w3.org/2000/svg">'+
    '<defs>'+
      '<radialGradient id="mapAura" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#241a3d"/><stop offset="55%" stop-color="#171025"/><stop offset="100%" stop-color="#0d0916"/></radialGradient>'+
      '<pattern id="mapGrid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="rgba(155,143,196,.13)" stroke-width="1"/></pattern>'+
      '<filter id="mapRoadGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs>'+
    '<rect class="map-bg" x="0" y="0" width="'+MAP_W+'" height="'+MAP_H+'" fill="url(#mapAura)"/>'+
    '<rect class="map-grid" x="0" y="0" width="'+MAP_W+'" height="'+MAP_H+'" fill="url(#mapGrid)"/>'+
    '<g class="map-roads">';
  mapData.edges.forEach(e=>{
    const [f,t]=e.split('>'); const a=mapData.nm[f], b=mapData.nm[t]; if(!a||!b) return;
    const active=cur && cur.id===f && reach.has(t);
    const traveled=a.done && b.done;
    const open=active || (cur===null && reach.has(f));
    const d=mapEdgePath(a,b);
    const cls=active?' active':(traveled?' traveled':(open?' open':''));
    s+='<path class="map-road under'+cls+'" d="'+d+'"/>'+
       '<path class="map-road main'+cls+'" d="'+d+'"/>'+
       ((active||traveled)?'<path class="map-road pulse'+cls+'" d="'+d+'"/>':'');
  });
  s+='</g>';
  mapData.nodes.forEach(n=>{
    const isReach=reach.has(n.id), isCur=cur&&cur.id===n.id;
    const col=NODE_COL[n.type]||'#9b8fc4';
    const op=n.done?0.35:(isReach||isCur?1:0.5);
    let ring='';
    if(isReach) ring='<circle cx="'+n.x+'" cy="'+n.y+'" r="17" fill="none" stroke="#38e8ff" stroke-width="2"><animate attributeName="r" values="16;20;16" dur="1.4s" repeatCount="indefinite"/></circle>';
    if(isCur) ring='<circle cx="'+n.x+'" cy="'+n.y+'" r="17" fill="none" stroke="#fff" stroke-width="2"/>';
    s+='<g class="mapnode'+(isReach?' reach':'')+'" data-id="'+n.id+'" opacity="'+op+'">'+ring+
       '<circle cx="'+n.x+'" cy="'+n.y+'" r="13" fill="#1a1330" stroke="'+col+'" stroke-width="2.5"/>'+
       (NODE_PIX[n.type]?('<image href="'+NODE_PIX[n.type]+'" x="'+(n.x-9)+'" y="'+(n.y-9)+'" width="18" height="18" style="image-rendering:pixelated"/>'):('<text x="'+n.x+'" y="'+(n.y+4)+'" font-size="12" text-anchor="middle">'+(NODE_ICON[n.type]||'?')+'</text>'))+'</g>';
  });
  s+='</svg>';
  cont.innerHTML=s;
  requestAnimationFrame(()=>{
    const svg=cont.querySelector('svg'); if(!svg) return;
    const dispH=svg.getBoundingClientRect().height||MAP_H;
    let fNode=cur; if(!fNode){ const rid=[...reach][0]; fNode=rid?mapData.nm[rid]:null; }
    const fy=fNode?fNode.y:MAP_H;
    cont.scrollTop=clamp((fy/MAP_H)*dispH - cont.clientHeight*0.5, 0, dispH);
  });
  cont.querySelectorAll('.mapnode.reach').forEach(g=>{
    g.style.cursor='pointer';
    g.onclick=()=>selectNode(mapData.nm[g.getAttribute('data-id')]);
  });
}

function selectNode(node){
  if(!node||!mapData.reach.has(node.id)) return;
  pendingNode=node; currentRow=node.row; hideAll();
  if(node.type==='shop'){ openShop(()=>finishNode()); return; }
  if(node.type==='event'){ startEvent(); return; }
  if(node.type==='campfire'){ openCampfire(()=>finishNode()); return; }
  startCombat(node.type==='boss'?'boss':node.type); // fight | midboss | boss
  state='play'; syncChrome();
}

// update()의 클리어 판정에서 호출
function onCombatCleared(){
  const t=pendingNode?pendingNode.type:'fight';
  // 임시 아군 제거
  if(combatTempAlly){ player.minion=null; combatTempAlly=false; }
  // 다음전투 골드 페널티(이벤트) 소비
  if(nextGoldPenalty>0){ const loss=Math.round(gold*nextGoldPenalty); gold=Math.max(0,gold-loss); nextGoldPenalty=0; if(loss>0) setTimeout(()=>banner('분위기 하락','골드 -'+loss,1200),200); updateHUD(); }
  banner('CLEAR', t==='boss'?'보스 격파!':(t==='midboss'?'중간보스 격파!':(t==='elite'?'자잘자 격파!':'정리 완료')), 1000);
  setTimeout(()=>{
    // 도전과제(노히트) 판정 우선
    if(combatChallenge==='nohit'){
      const ok=!combatTookHit; combatChallenge=null;
      if(ok) offerRelics(3,'🏆 도전 성공!','무피격 클리어 — 유물 획득', finishNode);
      else { banner('도전 실패','피격당했다 — 보상 없음',1500); finishNode(); }
      return;
    }
    if(t==='midboss') offerRelics(3,'중간보스 보상',(act>=2?'박제인간을 쓰러뜨린 보상이다':'혜철이를 쓰러뜨린 보상이다'), finishNode);
    else if(t==='boss') finishNode();
    else if(combatRewardMul>1){ const bonus=Math.round(irand(30,55)*combatRewardMul); gold+=bonus; combatRewardMul=1; offerRelics(3,'🎁 합방 보상','보상이 2배로! 골드 +'+bonus, finishNode); }
    else if(roomHadElite){ const bonus=irand(35,60); gold+=bonus; offerRelics(3,'⚔️ 자잘자 보상','자잘자를 잡았다! 골드 +'+bonus, finishNode); }
    else offerSmallReward();
  }, 700);
}
function finishNode(){
  const wasBoss = pendingNode && pendingNode.type==='boss';
  if(pendingNode){ pendingNode.done=true; mapData.currentId=pendingNode.id; }
  pendingNode=null;
  if(wasBoss){
    if(act>=MAX_ACT){ victory(); return; }
    act++; currentRow=0; genMap();
    showMap();
    banner(act+'막 진입','새 지도가 펼쳐진다',1600);
  }else{
    showMap();
  }
}

// ========================================================
//  미지(이벤트)
// ========================================================
const EVENTS=[
  {tag:'❓ 회복의 샘',title:'맑은 샘물',body:'은은하게 빛나는 샘이 보인다. 한 모금 마실까?',
   choices:[
     {t:'마신다 — 체력 35 회복',f:()=>{player.hp=Math.min(player.maxhp,player.hp+35);banner('회복','체력 +35',1200);finishNode();}},
     {t:'그냥 지나간다',f:()=>finishNode()},
   ]},
  {tag:'❓ 떠돌이 상인',title:'수상한 보따리상',body:'"포션 하나 거저 주지. 대신 자릿세로 골드 좀 받겠네."',
   choices:[
     {t:'받는다 — 랜덤 포션, 골드 -15',f:()=>{gold=Math.max(0,gold-15);addPotion(pick(POTIONS));banner('포션 획득','',1200);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'❓ 피의 제단',title:'어두운 제단',body:'제단이 힘을 약속한다. 대가는 너의 피.',
   choices:[
     {t:'바친다 — 체력 -15, 유물 획득',f:()=>{player.hp=Math.max(1,player.hp-15);updateHUD();offerRelics(3,'제단의 보상','어두운 힘을 받아라',finishNode);}},
     {t:'물러난다',f:()=>finishNode()},
   ]},
  {tag:'❓ 매복!',title:'함정이다',body:'어둠 속에서 적들이 우르르 튀어나온다!',
   choices:[
     {t:'맞서 싸운다',f:()=>{hideAll();startCombat('fight');state='play'; syncChrome();}},
   ]},
  {tag:'❓ 운명의 동전',title:'도박꾼의 동전',body:'동전을 던진다. 앞이면 대박, 뒤면 쪽박.',
   choices:[
     {t:'던진다',f:()=>{ if(Math.random()<0.5){gold+=60;try{sfx.coin&&sfx.coin();}catch(e){}banner('🪙 앞면!','대박 — 골드 +60',1700);} else {player.hp=Math.max(1,player.hp-20);try{sfx.hurt&&sfx.hurt();}catch(e){}banner('🪙 뒷면...','쪽박 — 체력 -20',1700);} updateHUD(); finishNode(); }},
     {t:'주머니에 넣는다',f:()=>finishNode()},
   ]},
  // ===== 신규 이벤트 =====
  {tag:'⚠️ 방송 사고',title:'송출 오류 발생',body:'장비에 문제가 생겼다. 무리하게 밀어붙이면 한쪽이 강해지고 다른 쪽이 약해진다.',
   choices:[
     {t:'화력에 올인 — 공격력 +10%, 받는 피해 +5%',f:()=>{player.dmg+=1;player.armor-=0.05;banner('공격력 +1 / 방어 -5%','영구',1400);updateHUD();finishNode();}},
     {t:'안전제일 — 받는 피해 -8%, 공격력 -5%',f:()=>{player.armor+=0.08;player.dmg=Math.max(1,player.dmg-0.5);banner('방어↑ / 공격력 -0.5','영구',1400);updateHUD();finishNode();}},
     {t:'기동 강화 — 이동 +12%, 최대체력 -8%',f:()=>{player.spd+=20;player.maxhp=Math.round(player.maxhp*0.92);player.hp=Math.min(player.hp,player.maxhp);banner('이동↑ / 체력↓','영구',1400);updateHUD();finishNode();}},
   ]},
  {tag:'🚨 도네 협박',title:'정체불명의 후원',body:'"골드 안 보내면 스왓 부른다." 무시하면 그만이지만, 응하면 가끔 답례가 온다.',
   choices:[
     {t:'무시한다 (안전)',f:()=>{banner('무시했다','아무 일 없었다',1200);finishNode();}},
     {t:'응한다 — 골드 -40, 15% 확률로 유물',f:()=>{gold=Math.max(0,gold-40);updateHUD();if(Math.random()<0.15){offerRelics(3,'협박범의 답례','뜻밖의 보답이 왔다',finishNode);}else{banner('골드 -40','…답례는 없었다',1300);finishNode();}}},
   ]},
  {tag:'😠 악성 안티 등장',title:'시비 거는 안티',body:'채팅을 도배하는 악성 안티. 밴을 때려 본보기를 보일까, 그냥 무시할까?',
   choices:[
     {t:'밴 때린다 — 즉시 전투(클리어 시 골드 보너스)',f:()=>{nextCombatMods={rewardMul:1.6,banner:{big:'밴 해머!',small:'안티를 처단하라'}};hideAll();startCombat('fight');state='play'; syncChrome();}},
     {t:'무시한다 — 다음 전투 보상 골드 -25%',f:()=>{nextGoldPenalty=0.25;banner('채팅 분위기 하락','다음 골드 -25%',1400);finishNode();}},
   ]},
  {tag:'📢 협찬 제안',title:'광고 읽어주기',body:'"이 영양제 한 번만 읽어주세요!" 골드는 두둑하지만 시청자가 빠져나가 다음 전투가 거세진다.',
   choices:[
     {t:'읽는다 — 골드 +80 / 다음 전투 적 강화',f:()=>{gold+=80;updateHUD();nextCombatMods={cntMul:1.4,spdMul:1.12,banner:{big:'시청자 이탈',small:'적이 더 몰려온다'}};banner('협찬 골드 +80','',1300);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'🤝 합방 제안',title:'콜라보 방송',body:'옆 채널과 합방하면 다음 노드 보상이 2배! 대신 그 구간 적도 강해진다.',
   choices:[
     {t:'합방한다 — 다음 보상 2배 / 적 강화',f:()=>{nextCombatMods={rewardMul:2,hpMul:1.3,spdMul:1.08,banner:{big:'합방 시작!',small:'보상 2배 · 적 강화'}};banner('콜라보 성사','다음 전투 보상 2배',1400);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'💤 휴방',title:'잠깐 쉬어가기',body:'방송을 끄고 한숨 돌린다. 체력은 가득 차지만 이 구간 보상은 없고, 오래 쉰 만큼 다음 적이 약간 강해진다.',
   choices:[
     {t:'쉰다 — 체력 풀회복(보상 없음)',f:()=>{player.hp=player.maxhp;updateHUD();nextCombatMods={hpMul:1.15,spdMul:1.05,banner:{big:'오래 쉬었다',small:'적이 조금 강해졌다'}};banner('휴방','체력 가득',1400);finishNode();}},
     {t:'방송 계속',f:()=>finishNode()},
   ]},
  {tag:'🎯 후원 목표',title:'도네 바 베팅',body:'후원 목표를 건다. 달성하면 건 골드의 큰 배수, 실패하면 베팅액이 증발한다.',
   choices:[
     {t:'30G 베팅 (55% → 순이익 +60G)',f:()=>{ if(gold<30){banner('골드 부족','',1000);finishNode();return;} gold-=30; if(Math.random()<0.55){gold+=90;banner('목표 달성!','순이익 +60G',1400);}else{banner('목표 실패','베팅 30G 증발',1400);} updateHUD(); finishNode(); }},
     {t:'80G 베팅 (40% → 유물 또는 +200G)',f:()=>{ if(gold<80){banner('골드 부족','',1000);finishNode();return;} gold-=80; if(Math.random()<0.40){ if(Math.random()<0.5){offerRelics(3,'후원 목표 달성!','대박 보상',finishNode);}else{gold+=280;banner('대박!','순이익 +200G',1500);updateHUD();finishNode();} } else {banner('목표 실패','베팅 80G 증발',1400);updateHUD();finishNode();} }},
     {t:'베팅 안 함',f:()=>finishNode()},
   ]},
  {tag:'💎 큰손 등장',title:'VIP 도네러',body:'"리액션 크게 보여줘!" 골드를 듬뿍 주지만, 다음 전투 내내 발사속도가 느려지는 핸디캡이 붙는다.',
   choices:[
     {t:'받는다 — 골드 +120 / 다음 전투 발사속도 -20%',f:()=>{gold+=120;updateHUD();nextCombatMods={fireHandicap:1.25,banner:{big:'리액션 타임',small:'발사속도 -20%'}};banner('VIP 골드 +120','',1300);finishNode();}},
     {t:'정중히 거절',f:()=>finishNode()},
   ]},
  {tag:'⚖️ 가이드라인 경고',title:'운영진 경고',body:'"방송 정지 전에 벌금 내세요." 벌금을 내면 무사히 넘어가지만, 안 내면 다음 전투에서 제약을 받는다.',
   choices:[
     {t:'벌금 낸다 — 골드 -50',f:()=>{gold=Math.max(0,gold-50);updateHUD();banner('벌금 -50','무사 통과',1300);finishNode();}},
     {t:'버틴다 — 다음 전투 적 강화 + 골드 -10%',f:()=>{nextCombatMods={hpMul:1.25,spdMul:1.1,banner:{big:'경고 무시',small:'적이 강해졌다'}};nextGoldPenalty=0.1;banner('경고 무시','다음 전투 강화',1400);finishNode();}},
   ]},
  {tag:'📣 시참 모집',title:'시청자 참여',body:'시청자를 아군으로 부른다. 다음 전투 동안 함께 총을 쏴주는 든든한 지원군!',
   choices:[
     {t:'부른다 — 다음 전투 아군 1명',f:()=>{ if(player.minion){banner('이미 분신 보유','효과 중복 없음',1200);finishNode();return;} nextCombatMods={ally:true,banner:{big:'시참 합류!',small:'아군이 함께 싸운다'}};banner('시청자 합류','다음 전투 지원',1400);finishNode();}},
     {t:'사양한다',f:()=>finishNode()},
   ]},
  {tag:'🏅 도전과제',title:'노히트 챌린지',body:'"다음 전투 노히트 클리어 시 유물 지급!" 한 대도 맞지 않고 정리하면 보상, 맞으면 꽝.',
   choices:[
     {t:'도전한다 — 다음 전투 무피격 시 유물',f:()=>{nextCombatMods={challenge:'nohit',banner:{big:'노히트 챌린지',small:'한 대도 맞지 마라!'}};banner('도전 수락','무피격 클리어 도전',1500);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'🎤 저격 (디스전)',title:'스트리머 디스전',body:'다른 스트리머가 저격 방송을 켰다. 받아치면 강화된 정예와 맞짱! 이기면 시청자를 뺏어온다.',
   choices:[
     {t:'받아친다 — 강화 정예전(승리 시 유물)',f:()=>{nextCombatMods={hpMul:1.6,spdMul:1.1,rewardMul:1.5,banner:{big:'디스전 시작!',small:'정예를 박살내라'}};hideAll();startCombat('fight');state='play'; syncChrome();}},
     {t:'회피한다 — 골드 -25(체면 손상)',f:()=>{gold=Math.max(0,gold-25);updateHUD();banner('회피','체면이 깎였다 -25G',1300);finishNode();}},
   ]},
  {tag:'🎟️ 구독 알림',title:'시청자 선물',body:'"봉식님 구독 감사! 재도전권 하나 드릴게요~" 죽어도 다시 한 번 — 재도전 충전권을 받는다.',
   filter:()=>diffSet.maxRetries!==Infinity,
   choices:[
     {t:'감사합니다! — 재도전 횟수 +1',f:()=>{ diffSet=Object.assign({},diffSet,{maxRetries:diffSet.maxRetries+1}); banner('🎟️ 재도전 +1','구독자 감사합니다!',1500); updateHUD(); finishNode(); }},
     {t:'괜찮아요 — 그냥 지나친다',f:()=>finishNode()},
   ]},
];
function startEvent(){
  const pool=EVENTS.filter(ev=>!ev.filter||ev.filter());
  const ev=pick(pool);
  $('eventTag').textContent=ev.tag;
  $('eventTitle').textContent=ev.title;
  $('eventBody').textContent=ev.body;
  const cont=$('eventChoices');
  cont.innerHTML='';
  ev.choices.forEach(c=>{
    const el=document.createElement('button');
    el.className='choice';
    el.innerHTML='<div class="ttl">'+c.t+'</div>';
    el.onclick=()=>{ hideAll(); c.f(); };
    cont.appendChild(el);
  });
  show('event');
}

// ========================================================
//  모닷불 (휴식 / 단련)
// ========================================================
const TRAIN_OPTS=[
  {label:'최대 체력 +16', f:()=>{ player.maxhp+=16; player.hp=Math.min(player.maxhp,player.hp+16); }},
  {label:'공격력 +1.2',   f:()=>{ player.dmg+=1.2; }},
  {label:'발사 속도 +10%', f:()=>{ player.fireAdd+=0.10; }},
  {label:'이동 속도 +14',  f:()=>{ player.spd+=14; }},
  {label:'방어 +6%',       f:()=>{ player.armor=Math.min(0.85, player.armor+0.06); }},
];
function openCampfire(cb){
  const rest=$('cfRest'), train=$('cfTrain');
  const finish=(msg, ms)=>{ rest.onclick=null; train.onclick=null; hideAll(); banner('🔥 모닥불', msg, ms||1500); updateHUD(); cb&&cb(); };
  rest.onclick=()=>{ player.hp=player.maxhp; try{sfx.coin&&sfx.coin();}catch(e){} finish('휴식 — 체력 완전 회복'); };
  train.onclick=()=>{
    const t=pick(TRAIN_OPTS);
    t.f();
    try{sfx.vote&&sfx.vote();}catch(e){}
    chatSys('🔥 모닥불 단련: '+t.label);
    finish('단련 완료 — '+t.label, 2400);
  };
  show('campfire');
}

// ========================================================
//  포션
// ========================================================
const POTIONS=[
  {id:'heal', name:'치유 물약', icon:'❤️', desc:'체력 40 회복',         use:p=>{p.hp=Math.min(p.maxhp,p.hp+40);}},
  {id:'rage', name:'분노 물약', icon:'🟥', desc:'8초간 공격력 2배',     use:p=>{p.buffs.rage=8;}},
  {id:'haste',name:'신속 물약', icon:'🟨', desc:'8초간 발사속도 2배',   use:p=>{p.buffs.haste=8;}},
  {id:'shield',name:'무적 물약',icon:'🟦', desc:'5초간 무적',           use:p=>{p.buffs.shield=5;}},
];
function addPotion(pot){
  if(player.potions.length>=3){ banner('포션 가득','3개까지만 소지',1000); return false; }
  player.potions.push(pot); renderPotions(); return true;
}
function usePotion(i){
  const p=player.potions[i];
  if(!p) return;
  p.use(player); sfx.pick();
  banner(p.icon+' '+p.name,'사용',1000);
  player.potions.splice(i,1); renderPotions(); updateHUD();
}

// ---------- 레벨업 특성 ----------
const PERK_TIERS={
  common:{name:'일반', col:'#ffffff', weight:50},
  rare:  {name:'희귀', col:'#5aa9ff', weight:30},
  epic:  {name:'영웅', col:'#c46bff', weight:14},
  legend:{name:'전설', col:'#ffd34d', weight:6},
  mythic:{name:'신화', col:'#ff4d4d', weight:2},
};
const PERK_ICONS={"공격 특화":"btv/assets/asset-031-ae9039d98c.png","속사 특화":"btv/assets/asset-032-bfe2caed63.png","민첩 특화":"btv/assets/asset-033-e918978065.png","활력":"btv/assets/asset-034-56af33bbb6.png","방어 특화":"btv/assets/asset-035-f6e8be3ed5.png","광부":"btv/assets/asset-036-43798a2b09.png","대구경":"btv/assets/asset-037-a9d64b9689.png","재생":"btv/assets/asset-038-4746fa1204.png","경험치 부스트":"btv/assets/asset-039-88b1c0dbbe.png","도네 알림":"btv/assets/asset-040-cd1043c117.png","정밀 조준":"btv/assets/asset-041-05dcac0760.png","흡혈":"btv/assets/asset-042-f5a4bea336.png","충격파":"btv/assets/asset-043-9d9658dacd.png","관통":"btv/assets/asset-044-01948011af.png","반사":"btv/assets/asset-045-7621967172.png","연사":"btv/assets/asset-046-e68f91aaca.png","강철 체력":"btv/assets/asset-047-e0c650b661.png","거인 사냥":"btv/assets/asset-048-b6639c1f84.png","고속탄":"btv/assets/asset-049-92535813ed.png","화염탄":"btv/assets/asset-050-045d77fc4d.png","빙결탄":"btv/assets/asset-051-64010bc748.png","독침":"btv/assets/asset-052-d0c547eb8c.png","가시 갑옷":"btv/assets/asset-053-0db346b7c5.png","흡성":"btv/assets/asset-054-8b0a2a1723.png","추진력":"btv/assets/asset-055-3728ea6cff.png","잔상":"btv/assets/asset-056-698506bda6.png","맹공":"btv/assets/asset-057-c012209117.png","유도의 눈":"btv/assets/asset-058-05b6a83b89.png","연쇄 폭발":"btv/assets/asset-059-907ab157cf.png","흡혈귀":"btv/assets/asset-060-89ca5a31a0.png","그림자 보법":"btv/assets/asset-061-6ec81227e2.png","쌍방향 사격":"btv/assets/asset-062-90c3808337.png","더블탭":"btv/assets/asset-063-3a82467274.png","막판 정신력":"btv/assets/asset-064-2a1779ad5a.png","저체력 폭주":"btv/assets/asset-065-8ff4412553.png","처단":"btv/assets/asset-066-ed78891301.png","분노":"btv/assets/asset-067-871c1d2406.png","불사":"btv/assets/asset-068-5ce5921aad.png","치명 일격":"btv/assets/asset-069-5861e7f2e5.png","폭주":"btv/assets/asset-070-b47b63302a.png","작렬탄":"btv/assets/asset-071-239f04c3d8.png","이중 도약":"btv/assets/asset-072-f42df54136.png","재충전 보호막":"btv/assets/asset-073-b3d22fea42.png","다중 사격":"btv/assets/asset-074-86dfa25e6d.png","차지샷":"btv/assets/asset-075-abd2932133.png","유리 대포":"btv/assets/asset-076-a90164b8c5.png","구독자 소환":"btv/assets/asset-077-0df9827940.png"};
const LEVEL_PERKS=[
  // ===== 일반 Common =====
  {g:'common',icon:'⚔️',name:'공격 특화',desc:'공격력 +1',apply:p=>{p.dmg+=1;}},
  {g:'common',icon:'⚡',name:'속사 특화',desc:'발사 속도 +8%',apply:p=>{p.fireAdd+=0.08;}},
  {g:'common',icon:'🥾',name:'민첩 특화',desc:'이동 속도 +10',apply:p=>{p.spd+=10;}},
  {g:'common',icon:'❤️',name:'활력',desc:'최대 체력 +15, 10 회복',apply:p=>{p.maxhp+=15;p.hp=Math.min(p.maxhp,p.hp+10);}},
  {g:'common',icon:'🛡️',name:'방어 특화',desc:'받는 피해 -5%',apply:p=>{p.armor+=0.05;}},
  {g:'common',icon:'🧲',name:'광부',desc:'골드 획득 +15%',apply:p=>{p.goldMul*=1.15;}},
  {g:'common',icon:'💥',name:'대구경',desc:'투사체 크기 +10%',apply:p=>{p.bulletSize+=0.10;}},
  {g:'common',icon:'🌿',name:'재생',desc:'초당 체력 +0.5',apply:p=>{p.regen+=0.5;}},
  {g:'common',icon:'📈',name:'경험치 부스트',desc:'경험치 +15%',apply:p=>{p.xpMul+=0.15;}},
  {g:'common',icon:'💸',name:'도네 알림',desc:'처치 시 8% 확률로 골드 폭탄',apply:p=>{p.donateChance+=0.08;}},
  // ===== 희귀 Rare =====
  {g:'rare',icon:'🎯',name:'정밀 조준',desc:'치명타 확률 +10%',apply:p=>{p.critChance+=0.10;}},
  {g:'rare',icon:'🩸',name:'흡혈',desc:'흡혈 확률 +7%',apply:p=>{p.lifesteal+=0.07;}},
  {g:'rare',icon:'🔔',name:'충격파',desc:'기절 확률 +12%',apply:p=>{p.stunChance+=0.12;}},
  {g:'rare',icon:'🍢',name:'관통',desc:'관통 +1',apply:p=>{p.pierce+=1;}},
  {g:'rare',icon:'🔴',name:'반사',desc:'벽 팅김 +1',apply:p=>{p.bounce+=1;}},
  {g:'rare',icon:'⚡',name:'연사',desc:'발사 속도 +16%',apply:p=>{p.fireAdd+=0.16;}},
  {g:'rare',icon:'❤️‍🔥',name:'강철 체력',desc:'최대 체력 +35, 20 회복',apply:p=>{p.maxhp+=35;p.hp=Math.min(p.maxhp,p.hp+20);}},
  {g:'rare',icon:'🗡️',name:'거인 사냥',desc:'보스 피해 +25%',apply:p=>{p.bossDmgMul+=0.25;}},
  {g:'rare',icon:'🔋',name:'고속탄',desc:'투사체 속도 +30%',apply:p=>{p.bulletSpeedMul+=0.30;}},
  {g:'rare',icon:'🔥',name:'화염탄',desc:'명중 시 화상(초당 피해)',apply:p=>{p.burn+=4;}},
  {g:'rare',icon:'❄️',name:'빙결탄',desc:'명중 시 적 이동속도 둔화',skip:p=>p.chill>0,apply:p=>{p.chill+=1;}},
  {g:'rare',icon:'🟢',name:'독침',desc:'명중 시 중첩되는 독 피해',apply:p=>{p.poison+=3;}},
  {g:'rare',icon:'🌵',name:'가시 갑옷',desc:'접촉한 적에게 반사 피해',apply:p=>{p.thorns+=10;}},
  {g:'rare',icon:'💚',name:'흡성',desc:'처치 시 체력 4 회복',apply:p=>{p.healOnKill+=4;}},
  {g:'rare',icon:'💨',name:'추진력',desc:'베인Q 후 잠깐 발사속도↑',skip:p=>p.dodgeHaste,apply:p=>{p.dodgeHaste=true;}},
  {g:'rare',icon:'👻',name:'잔상',desc:'베인Q 무적 시간 증가',apply:p=>{p.dodgeIframeBonus+=0.1;}},
  {g:'rare',icon:'🧨',name:'점화',desc:'상태이상 걸린 적에게 주는 피해 +20%',apply:p=>{p.statusDmgMul+=0.20;}},
  {g:'rare',icon:'💸',name:'현질의 힘',desc:'보유 골드 100당 공격력 +2% (최대 +30%)',apply:p=>{p.goldPower+=0.02;}},
  // ===== 영웅 Epic =====
  {g:'epic',icon:'⚔️',name:'맹공',desc:'공격력 +2',apply:p=>{p.dmg+=2;}},
  {g:'epic',icon:'💣',name:'연쇄 폭발',desc:'처치 시 주변 폭발',apply:p=>{p.explodeKill+=24;}},
  {g:'epic',icon:'🧛',name:'흡혈귀',desc:'흡혈 확률 +15%',apply:p=>{p.lifesteal+=0.15;}},
  {g:'epic',icon:'🌀',name:'그림자 보법',desc:'베인Q 쿨 -40%',apply:p=>{p.dodgeCdMul*=0.6;}},
  {g:'epic',icon:'🔙',name:'쌍방향 사격',desc:'뒤로도 한 발 발사 + 공격력 +1',skip:p=>p.backShot,apply:p=>{p.backShot=true;p.dmg+=1;}},
  {g:'epic',icon:'🔫',name:'더블탭',desc:'25% 확률로 한 번에 2발',apply:p=>{p.doubleTap+=0.25;}},
  {g:'epic',icon:'🩹',name:'막판 정신력',desc:'1회 체력1로 버티기',skip:p=>p.lastStand,apply:p=>{p.lastStand=true;}},
  {g:'epic',icon:'🆘',name:'저체력 폭주',desc:'체력 30%↓일 때 공격력 대폭↑',apply:p=>{p.lowHpMul+=0.5;}},
  {g:'epic',icon:'🌪️',name:'처단',desc:'베인Q 시 주변 폭발+강한 넉백(범위·밀치기 1.5배)',apply:p=>{p.dodgeBlast+=18;}},
  {g:'epic',icon:'😤',name:'분노',desc:'적 1마리당 공격력+3%(최대10마리)',apply:p=>{p.crowdRage+=0.03;}},
  {g:'epic',icon:'💉',name:'치명 흡혈',desc:'치명타 적중 시 체력 +5 회복',apply:p=>{p.critHeal+=5;}},
  {g:'epic',icon:'⚡',name:'감전 연쇄',desc:'명중 시 근처 적에게 연쇄 번개(피해 50%)',apply:p=>{p.chainLightning+=1;}},
  {g:'epic',icon:'✂️',name:'클립 박제',desc:'체력 15% 이하 잡몹 즉시 처치 (보스 제외)',apply:p=>{p.execThreshold=Math.max(p.execThreshold,0.15);}},
  // ===== 전설 Legend =====
  {g:'legend',icon:'✨',name:'치명 일격',desc:'치명타 +20%, 치명타 피해 +50%',apply:p=>{p.critChance+=0.20;p.critMult+=0.5;}},
  {g:'legend',icon:'💀',name:'폭주',desc:'공격력 +4',apply:p=>{p.dmg+=4;}},
  {g:'legend',icon:'💢',name:'작렬탄',desc:'명중 시 폭발(범위 피해)',apply:p=>{p.bulletExplode+=12;}},
  {g:'legend',icon:'🌀',name:'이중 도약',desc:'베인Q 2회 충전',skip:p=>p.dodgeMaxCharges>=2,apply:p=>{p.dodgeMaxCharges=2;p.dodgeCharges=2;}},
  {g:'legend',icon:'🔵',name:'재충전 보호막',desc:'10초마다 1회 피격 무효',skip:p=>p.shieldRegen>0,apply:p=>{p.shieldRegen=10;}},
  {g:'legend',icon:'⚰️',name:'사형 선고',desc:'처형 임계값 25%로↑ + 처형 시 주변 폭발',skip:p=>p.execDoom,apply:p=>{p.execDoom=true;p.execThreshold=Math.max(p.execThreshold,0.25);p.execBlast+=16;}},
  {g:'legend',icon:'🌬️',name:'확산',desc:'상태이상 적 처치 시 주변에 같은 효과 전파',skip:p=>p.statusSpread,apply:p=>{p.statusSpread=true;}},
  // ===== 신화 Myth =====
  {g:'mythic',icon:'🔱',name:'다중 사격',desc:'투사체 +1발',apply:p=>{p.shots+=1;}},
  {g:'mythic',icon:'👁️',name:'유도의 눈',desc:'투사체가 적을 강하게 추적',skip:p=>p.homing>0,apply:p=>{p.homing=12;}},
  {g:'mythic',icon:'🔆',name:'차지샷',desc:'잠깐 안 쏘면 다음 탄 3배',skip:p=>p.chargeShot,apply:p=>{p.chargeShot=true;}},
  {g:'mythic',icon:'🍷',name:'유리 대포',desc:'공격력 +5, 받는 피해 +30%',skip:p=>p.glassCannon,apply:p=>{p.glassCannon=true;p.dmg+=5;p.armor-=0.3;}},
  {g:'mythic',icon:'🤝',name:'구독자 소환',desc:'따라다니며 자동 공격하는 구독자',skip:p=>!!p.minion,apply:p=>{p.minion={ang:0,fireT:0,x:p.x,y:p.y};}},
];
const PERK_COUNTS={}; LEVEL_PERKS.forEach(p=>{PERK_COUNTS[p.g]=(PERK_COUNTS[p.g]||0)+1;});
// 난이도별 고등급 출현 배율 (방송용 쉬움=그대로, 보통=적게, 어려움=더 적게)
const PERK_DIFF_MUL={
  easy:   {epic:1.0,  legend:1.0,  mythic:1.0 },
  normal: {epic:0.85, legend:0.55, mythic:0.45},
  hard:   {epic:0.70, legend:0.30, mythic:0.20},
};
function perkWeight(pk){
  let w=PERK_TIERS[pk.g].weight/(PERK_COUNTS[pk.g]||1);
  const m=(PERK_DIFF_MUL[diffSet.key]||{})[pk.g];
  if(m!=null) w*=m;
  if(pk.g==='legend' && level<=5) w*=0.5;
  return w;
}
function rollPerks(n){
  const pool=LEVEL_PERKS.filter(pk=>!(pk.skip&&pk.skip(player)) && !(pk.g==='mythic' && level<=3));
  const picks=[];
  for(let i=0;i<n && pool.length;i++){
    let tot=0; pool.forEach(pk=>tot+=perkWeight(pk));
    let r=Math.random()*tot, idx=0;
    for(let j=0;j<pool.length;j++){ r-=perkWeight(pool[j]); if(r<=0){idx=j;break;} }
    picks.push(pool.splice(idx,1)[0]);
  }
  return picks;
}
// ---------- 전설+ 등장 연출 ----------
function perkEntranceFx(picks){
  const order={common:0,rare:1,epic:2,legend:3,mythic:4};
  let top=0; picks.forEach(p=>{ const v=order[p.g]||0; if(v>top) top=v; });
  if(top<3) return;                 // 전설(3) 미만이면 연출 없음
  const isMyth=top===4;
  const col=isMyth?'#ff4d4d':'#ffd34d';
  let fl=document.getElementById('perkFlash');
  if(!fl){ fl=document.createElement('div'); fl.id='perkFlash'; fl.innerHTML='<div class="pfx-label"></div>'; document.body.appendChild(fl); }
  fl.style.setProperty('--pfx',col);
  fl.querySelector('.pfx-label').textContent=isMyth?'🟥 신화 강림!':'🟨 전설 등장!';
  fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  clearTimeout(fl._t); fl._t=setTimeout(()=>fl.classList.remove('go'),1700);
  const box=document.querySelector('#ovLevel .panel-box');
  if(box){ box.classList.remove('perkShake'); void box.offsetWidth; box.classList.add('perkShake'); }
  try{
    if(typeof sfx!=='undefined'&&sfx.boss) sfx.boss();
    beep(isMyth?660:520,0.45,'sawtooth',0.05);
    setTimeout(()=>beep(isMyth?990:784,0.55,'sine',0.05),100);
    if(isMyth) setTimeout(()=>beep(1320,0.6,'triangle',0.045),210);
  }catch(e){}
}
function showLevelUp(){
  if(!tierIntroShown){ tierIntroShown=true; show('tierIntro'); return; }
  const picks=rollPerks(3);
  $('levelTitle').textContent='Lv.'+level+' — 특성 1택'+(pendingLevels>1?' ('+pendingLevels+'개 남음)':'');
  const cont=$('levelChoices'); cont.className='perkrow'; cont.innerHTML='';
  let selPerk=null, selEl=null;
  const confirmBtn=$('levelConfirm');
  confirmBtn.disabled=true; confirmBtn.classList.remove('ready'); confirmBtn.textContent='특성을 선택하세요';
  picks.forEach(pk=>{
    const t=PERK_TIERS[pk.g];
    const el=document.createElement('button');
    el.className='perkcard perk-'+pk.g; el.style.borderColor=t.col;
    el.innerHTML='<div class="pk-ic">'+(PERK_ICONS[pk.name]?'<img class="pk-img" src="'+PERK_ICONS[pk.name]+'" alt="">':pk.icon)+'</div><div class="pk-nm">'+pk.name+'</div>'+
      '<div class="pk-gr" style="color:'+t.col+'">['+t.name+']</div>'+
      '<div class="pk-ds">'+pk.desc+'</div>';
    el.onclick=()=>{ if(selEl)selEl.classList.remove('sel'); selEl=el; selPerk=pk; el.classList.add('sel'); confirmBtn.disabled=false; confirmBtn.classList.add('ready'); confirmBtn.textContent='수락 ✓  '+pk.name; sfx.vote&&sfx.vote(); renderSidePanel(pk); };
    cont.appendChild(el);
  });
  confirmBtn.onclick=()=>{ if(selPerk) pickLevelPerk(selPerk); };
  show('level');
  perkEntranceFx(picks);   // 전설+ 등장 연출
}
function pickLevelPerk(pk){
  pk.apply(player); sfx.pick(); banner(pk.icon+' '+pk.name,'특성 획득',1100);
  pendingLevels--; updateHUD();
  if(pendingLevels>0) showLevelUp(); else { hideAll(); state='play'; syncChrome(); }
}
// ---------- 일반 전투 보상 ----------
const SMALL_REWARDS=[
  {icon:'💰',name:'골드 한 줌',desc:'골드를 줍는다',apply:()=>{const g=irand(15,30)+act*6;gold+=g;banner('골드 +'+g,'',1000);}},
  {icon:'❤️',name:'응급 처치',desc:'체력 30 회복',apply:()=>{player.hp=Math.min(player.maxhp,player.hp+30);banner('체력 +30','',1000);}},
  {icon:'🧪',name:'물약 보급',desc:'랜덤 포션 1개',apply:()=>{ if(player.potions.length<3) addPotion(pick(POTIONS)); else { gold+=20; banner('포션 가득 → 골드 +20','',1000);} }},
  {icon:'⚔️',name:'무기 손질',desc:'공격력 +0.3',apply:()=>{player.dmg+=0.3;banner('공격력 +0.3','',1000);}},
  {icon:'⚡',name:'방아쇠 정비',desc:'발사 속도 +2%',apply:()=>{player.fireAdd+=0.02;banner('발사 속도 +2%','',1000);}},
  {icon:'🥾',name:'가벼운 발놀림',desc:'이동 속도 +8',apply:()=>{player.spd+=8;banner('이동 속도 +8','',1000);}},
  {icon:'🛡️',name:'방어구 정비',desc:'받는 피해 -3%',apply:()=>{player.armor=Math.min(0.85,player.armor+0.03);banner('받는 피해 -3%','',1000);}},
  {icon:'🎯',name:'조준경',desc:'치명타 확률 +2%',apply:()=>{player.critChance=Math.min(1,player.critChance+0.02);banner('치명타 +2%','',1000);}},
  {icon:'💥',name:'탄 개조',desc:'투사체 크기 +3%',apply:()=>{player.bulletSize*=1.03;banner('투사체 크기 +3%','',1000);}},
  {icon:'🌿',name:'활력 물약',desc:'최대 체력 +12, 12 회복',apply:()=>{player.maxhp+=12;player.hp=Math.min(player.maxhp,player.hp+12);banner('최대 체력 +12','',1000);}},
  {icon:'🔋',name:'추진제',desc:'투사체 속도 +5%',apply:()=>{player.bulletSpeedMul+=0.05;banner('투사체 속도 +5%','',1000);}},
  {icon:'🧲',name:'자력 코일',desc:'골드 획득 +10%',apply:()=>{player.goldMul+=0.1;banner('골드 획득 +10%','',1000);}},
  {icon:'🩸',name:'흡혈 코팅',desc:'흡혈 확률 +2%',apply:()=>{player.lifesteal+=0.02;banner('흡혈 +2%','',1000);}},
  {icon:'📈',name:'수련서',desc:'경험치 획득 +15%',apply:()=>{player.xpMul+=0.15;banner('경험치 +15%','',1000);}},
];
function offerSmallReward(){
  const tmp=SMALL_REWARDS.slice(), picks=[];
  for(let i=0;i<3 && tmp.length;i++) picks.push(tmp.splice(irand(0,tmp.length-1),1)[0]);
  const cont=$('rewardChoices'); cont.innerHTML='';
  picks.forEach(rw=>{ const el=document.createElement('button'); el.className='choice';
    el.innerHTML='<div class="ttl"><span class="icon">'+rw.icon+'</span>'+rw.name+'</div><div class="desc">'+rw.desc+'</div>';
    el.onclick=()=>pickReward(rw); cont.appendChild(el); });
  show('reward');
}
function pickReward(rw){ rw.apply(player); sfx.pick(); updateHUD(); hideAll(); finishNode(); }

// ---------- 유물 ----------
let relicAfter=null;
function offerRelics(n,tag,sub,after){
  relicAfter=after||null;
  const owned=new Set(player.relics.map(r=>r.id));
  const avail=RELICS.filter(r=>!owned.has(r.id));
  const pool=avail.length>=n?avail:RELICS;
  const picks=[];
  const tmp=pool.slice();
  for(let i=0;i<n && tmp.length;i++){ picks.push(weightedTake(tmp)); }
  const cont=$('relicChoices');
  cont.innerHTML='';
  $('relicTag').textContent=tag||"유물 획득";
  $('relicSub').textContent=sub||"하나만 챙겨라. 채팅이 지켜본다.";
  picks.forEach(r=>{
    const el=document.createElement('button');
    el.className='choice relic-'+(TIER_OF[r.id]||'rare');
    el.style.borderColor=relicTier(r).col;
    el.innerHTML=relicCardHTML(r);
    el.onclick=()=>takeRelic(r);
    cont.appendChild(el);
  });
  show('relic');
  chatSys("🎁 유물 선택: "+picks.map(r=>r.name).join(" / "));
  setTimeout(()=>chatRandom(pick(["유리대포 가 KEKW","무난하게 가자","도박이다 GIGACHAD","그거 함정임 monkaS","사기유물 ㄱㄱ"])),350);
}
function takeRelic(r){
  player.relics.push(r); r.apply(player);
  sfx.pick(); banner(r.icon+" "+r.name,"["+relicTier(r).name+"] 획득!",1500);
  hideAll();
  const a=relicAfter; relicAfter=null;
  if(a){ a(); } else { state='play'; syncChrome(); }
  updateHUD();
}

// ---------- 상점 ----------
function openShop(after){
  shopAfter=after||null;
  if(!shopIntroShown){ shopIntroShown=true; banner('💡 포션 사용법','구매한 포션은 1·2·3 키로 사용!',2800); }
  const items=[];
  items.push({kind:'heal',name:"치유 서비스",icon:"🧪",desc:"체력 45 회복",cost:Math.round(28+act*10),
    buy:()=>{player.hp=Math.min(player.maxhp,player.hp+45);}});
  // 재도전 충전권 — 횟수 제한 난이도(보통·어려움)에서만 등장
  if(diffSet.maxRetries !== Infinity){
    const retryCost = diffSet.key==='hard' ? 90 : 55;
    items.push({kind:'retry',name:"재도전 충전권",icon:"🎟️",
      desc:"이번 런에서 재도전 횟수 +1회. (현재 남은 횟수: "+(Math.max(0,diffSet.maxRetries-retries))+"회)",
      cost:retryCost,
      buy:()=>{ diffSet=Object.assign({},diffSet,{maxRetries:diffSet.maxRetries+1}); banner('🎟️ 재도전 +1','한 번 더 기회!',1400); updateHUD(); }
    });
  }
  // 포션 2종
  const ptn=POTIONS.slice().sort(()=>Math.random()-0.5).slice(0,2);
  ptn.forEach(pt=>items.push({kind:'potion',name:pt.name,icon:pt.icon,desc:pt.desc+" · 포션",cost:Math.round(32+act*8),potion:pt,
    buy:()=>{addPotion(pt);}}));
  // 유물 2종
  const owned=new Set(player.relics.map(r=>r.id));
  const availR=RELICS.filter(r=>!owned.has(r.id));
  const relicPicks=[]; for(let i=0;i<2 && availR.length;i++) relicPicks.push(weightedTake(availR));
  relicPicks.forEach(r=>items.push({kind:'relic',name:r.name,icon:r.icon,desc:r.desc,cost:Math.round((75+act*24+Math.random()*30)*relicTier(r).costMul),relic:r,
    buy:()=>{player.relics.push(r);r.apply(player);}}));
  renderShop(items);
  show('shop');
}
let shopAfter=null;
function renderShop(items){
  $('shopGold').textContent="(보유 "+gold+"G)";
  const cont=$('shopChoices');
  cont.innerHTML='';
  items.forEach(it=>{
    const el=document.createElement('button');
    const afford=gold>=it.cost;
    const rt=it.relic?relicTier(it.relic):null;
    el.className='choice '+(it.relic?'relic-'+(TIER_OF[it.relic.id]||'rare'):'');
    if(rt) el.style.borderColor=rt.col;
    el.style.opacity=afford?'1':'0.5';
    el.innerHTML='<div class="ttl"><span class="icon">'+(it.relic?relicIconHTML(it.relic,'relic-pix'):it.icon)+'</span>'+it.name+
      (rt?' <span class="grade" style="color:'+rt.col+'">['+rt.name+']</span>':'')+
      ' <span style="color:var(--gold);float:right">'+it.cost+'G</span></div>'+
      '<div class="desc">'+it.desc+'</div>';
    el.onclick=()=>{
      if(it.kind==='potion' && player.potions.length>=3){ banner("포션 가득","3개까지만",900); return; }
      if(gold<it.cost){ banner("골드 부족","",900); return; }
      gold-=it.cost; it.buy(); sfx.coin();
      banner(it.icon+" 구매!","",1000);
      it.bought=true; updateHUD(); renderShop(items.filter(x=>!x.bought));
    };
    cont.appendChild(el);
  });
}
$('shopLeave').onclick=()=>{
  hideAll();
  const a=shopAfter; shopAfter=null;
  if(a) a(); else { state='play'; syncChrome(); }
};

// ---------- 렌더 ----------
let bgPattern=null;
const ACT_THEME=[
  {floor:'#17120c', grid:'rgba(150,120,70,0.07)', edge:'rgba(0,0,0,0.55)',  bossTint:'rgba(120,200,90,0.05)', name:'고블린 소굴'},
  {floor:'#241c0d', grid:'rgba(220,180,90,0.06)', edge:'rgba(30,15,0,0.5)',  bossTint:'rgba(255,200,100,0.06)', name:'사막'},
  {floor:'#0f1a12', grid:'rgba(90,200,120,0.07)', edge:'rgba(0,10,0,0.55)',  bossTint:'rgba(120,255,150,0.05)', name:'숲'},
];
let bgDecor=[];
function buildBackdrop(a){
  bgDecor=[];
  if(a===1){
    for(let i=0;i<7;i++) bgDecor.push({kind:'rock', x:rand(40,W-40), y:rand(120,H-40), s:rand(14,34)});
    for(let i=0;i<4;i++) bgDecor.push({kind:'torch', x:rand(80,W-80), y:rand(40,90)});
    for(let i=0;i<6;i++) bgDecor.push({kind:'stalag', x:rand(20,W-20), s:rand(22,46)});
    for(let i=0;i<4;i++) bgDecor.push({kind:'stalag', x:rand(20,W-20), s:rand(22,46), up:true});
  } else if(a===2){
    for(let i=0;i<3;i++) bgDecor.push({kind:'dune', y:rand(140,H-70), h:rand(40,80)});
    for(let i=0;i<3;i++) bgDecor.push({kind:'cactus', x:rand(60,W-60), y:rand(190,H-50), s:rand(20,34)});
    for(let i=0;i<14;i++) bgDecor.push({kind:'pebble', x:rand(20,W-20), y:rand(90,H-20), s:rand(2,5)});
  } else {
    for(let i=0;i<5;i++) bgDecor.push({kind:'tree', x:(i<3?rand(20,140):rand(W-140,W-20)), y:rand(70,H-130), s:rand(40,70)});
    for(let i=0;i<7;i++) bgDecor.push({kind:'bush', x:rand(40,W-40), y:rand(130,H-30), s:rand(18,34)});
    for(let i=0;i<22;i++) bgDecor.push({kind:'leaf', x:rand(10,W-10), y:rand(50,H-10), s:rand(3,6), c:pick(['#3a6b3f','#4f8a4a','#2f5a34'])});
  }
}
function drawDecor(d){
  ctx.save();
  if(d.kind==='rock'){
    ctx.fillStyle='#2a2218'; ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s,d.s*0.7,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(120,150,90,0.08)'; ctx.beginPath(); ctx.ellipse(d.x-d.s*0.2,d.y-d.s*0.25,d.s*0.35,d.s*0.22,0,0,TAU); ctx.fill();
  } else if(d.kind==='torch'){
    const fl=0.7+Math.sin(Date.now()*0.012+d.x)*0.3;
    ctx.fillStyle='#3a2a18'; ctx.fillRect(d.x-2,d.y,4,16);
    const g=ctx.createRadialGradient(d.x,d.y,2,d.x,d.y,28*fl);
    g.addColorStop(0,'rgba(255,180,80,'+(0.5*fl)+')'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(d.x,d.y,28*fl,0,TAU); ctx.fill();
    ctx.fillStyle='#ffcf6a'; ctx.beginPath(); ctx.arc(d.x,d.y-2,3.5*fl,0,TAU); ctx.fill();
  } else if(d.kind==='stalag'){
    ctx.fillStyle='#241c12'; ctx.beginPath();
    if(d.up){ ctx.moveTo(d.x-d.s*0.4,H); ctx.lineTo(d.x+d.s*0.4,H); ctx.lineTo(d.x,H-d.s); }
    else { ctx.moveTo(d.x-d.s*0.4,0); ctx.lineTo(d.x+d.s*0.4,0); ctx.lineTo(d.x,d.s); }
    ctx.closePath(); ctx.fill();
  } else if(d.kind==='dune'){
    ctx.fillStyle='rgba(220,185,110,0.08)'; ctx.beginPath(); ctx.moveTo(0,d.y);
    for(let x=0;x<=W;x+=60) ctx.quadraticCurveTo(x+30,d.y-d.h,x+60,d.y);
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  } else if(d.kind==='cactus'){
    _rr(d.x-d.s*0.18,d.y-d.s,d.s*0.36,d.s,d.s*0.18,'#3f6b3a',false);
    _rr(d.x-d.s*0.6,d.y-d.s*0.6,d.s*0.42,d.s*0.2,d.s*0.1,'#3f6b3a',false);
    _rr(d.x+d.s*0.2,d.y-d.s*0.8,d.s*0.42,d.s*0.2,d.s*0.1,'#3f6b3a',false);
  } else if(d.kind==='pebble'){
    ctx.fillStyle='rgba(200,170,100,0.15)'; ctx.beginPath(); ctx.arc(d.x,d.y,d.s,0,TAU); ctx.fill();
  } else if(d.kind==='tree'){
    ctx.fillStyle='#2a1f14'; ctx.fillRect(d.x-d.s*0.12,d.y,d.s*0.24,d.s*1.1);
    ctx.fillStyle='rgba(40,80,45,0.55)'; ctx.beginPath(); ctx.arc(d.x,d.y-d.s*0.2,d.s*0.7,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(55,100,60,0.45)'; ctx.beginPath(); ctx.arc(d.x-d.s*0.3,d.y,d.s*0.5,0,TAU); ctx.arc(d.x+d.s*0.35,d.y-d.s*0.1,d.s*0.45,0,TAU); ctx.fill();
  } else if(d.kind==='bush'){
    ctx.fillStyle='rgba(45,85,50,0.5)'; ctx.beginPath();
    ctx.arc(d.x,d.y,d.s*0.6,0,TAU); ctx.arc(d.x-d.s*0.5,d.y+4,d.s*0.45,0,TAU); ctx.arc(d.x+d.s*0.5,d.y+4,d.s*0.45,0,TAU); ctx.fill();
  } else if(d.kind==='leaf'){
    ctx.fillStyle=d.c||'#3a6b3f'; ctx.beginPath(); ctx.arc(d.x,d.y,d.s,0,TAU); ctx.fill();
  }
  ctx.restore();
}
// ===== 방 종류별 픽셀 배경 (1막) =====
/* ============================================================
   방 종류별 픽셀 도트 배경 4종
   forest = 데이터 숲 (1막 일반방 / 대파·까치)
   server = 손상된 서버룸 (정예 방)
   hatch  = 저그 해처리 (중간보스)
   food   = 음식 최종보스 (치킨·피자)

   - 기존 전역 ctx, W, H 를 사용합니다.
   - 테마별 정적 레이어는 캐시되므로 방 전환이 가볍습니다.

   [설치]
   1) 이 블록을 <script> 안에 붙여넣기.
   2) drawBackground() 맨 윗줄에 추가:
        function drawBackground(){
          drawRoomBg(roomTheme());     // ← 추가
          return;                      // (기존 그리드/장식을 끄려면 return)
          ...기존 코드...
        }
   3) 방 종류 판별은 roomTheme()을 프로젝트에 맞게 수정.
      예시는 함수 안 주석 참고 (roomIsBoss / roomHadElite / currentRow 등).
   4) (선택) 방 입장 시 배치를 새로 뽑으려면 buildRoomBg(테마, true) 호출.
   ============================================================ */

const RB_P = 4;
let rbSeed = 7;
const rbCache = {};            // theme -> {static, parts, glows, seed}
let rbActive = null;           // 현재 테마 상태

function rbHash(x,y){ let n=((x+rbSeed*131)*374761393+(y+rbSeed*97)*668265263)^0x5bd1e995; n=(n^(n>>13))*1274126177; n=(n^(n>>16))>>>0; return n/4294967295; }
let _rbR=1; function rbRnd(){ _rbR=(_rbR*1103515245+12345)&0x7fffffff; return _rbR/0x7fffffff; }
function rbSpr(o,r,ox,oy,p,pal){ for(let y=0;y<r.length;y++)for(let x=0;x<r[y].length;x++){const c=pal[r[y][x]]; if(c){o.fillStyle=c;o.fillRect(ox+x*p,oy+y*p,p,p);}} }
function rbMkCanvas(){ const o=document.createElement('canvas'); o.width=W; o.height=H; return o; }
function rbRad(g,x,y,r,col,a){ const gr=g.createRadialGradient(x,y,1,x,y,r); gr.addColorStop(0,'rgba('+col+','+a+')'); gr.addColorStop(1,'rgba('+col+',0)'); return gr; }

const RB_SCAL={'.':null,'t':'#7CFFB0','g':'#27C268','w':'#EAF6EE','W':'#BBE8CC'};
const RB_SCALR=['.t.t.','.t.t.','tg.gt','.ggg.','.www.','.www.','.WWW.'];
const RB_MAG={'.':null,'k':'#161B24','w':'#EEF2F8','t':'#2B3A5C','b':'#0C2030'};
const RB_MAGR=['..kk...','.kkkw..','kkkwwwt','.kk.btt','.k..k..'];
const RB_CHK={'.':null,'o':'#7A4E1E','m':'#E29A40','M':'#F6C672','d':'#C87A2C','b':'#F1E9D2'};
const RB_CHKR=['..ooo....','.oMMMo...','oMMMMMo..','oMMMMMo..','oMMMMdo..','.ommmo...','..obo....','..obbo...','...obb...'];
const RB_PIZ={'.':null,'o':'#7A4E1E','c':'#E8B85A','s':'#F4CC4E','p':'#D8442E'};
const RB_PIZR=['ooooooooo','occcccco.','ossspsso.','osssssso.','.osspso..','..ossso..','...oso...','....o....'];
const RB_SOD={'.':null,'o':'#4A1422','r':'#E63E5C','h':'#F46A84','w':'#F2F2F8'};
const RB_SODR=['owwwo','orrro','orhro','orrro','orhro','owwwo'];
const RB_HRT={'.':null,'p':'#FF3F8E','h':'#FF8FC0'};
const RB_HRTR=['.p.p.','phhhp','phhhp','.php.','..p..'];

function rbPine(o,cx,by,h){
  o.fillStyle='#0a201a'; o.fillRect(cx-RB_P,by-RB_P,2*RB_P,2*RB_P);
  const layers=4,lh=h/layers;
  for(let L=0;L<layers;L++){ const topY=by-h+L*lh*0.7,w=(h*0.52)*(1-L/(layers+1)),rows=Math.round(lh/RB_P);
    for(let r=0;r<rows;r++){ const t=r/rows,hw=Math.max(RB_P,Math.round((w*(1-t)*0.5+w*0.14)/RB_P)*RB_P),y=topY+r*RB_P;
      o.fillStyle='#0c2e1f'; o.fillRect(cx-hw,y,hw*2,RB_P);
      o.fillStyle=(rbHash(cx,y)>0.85)?'#3affa0':'#1f7a4e'; o.fillRect(cx+hw-RB_P,y,RB_P,RB_P);
      if(rbHash(y,cx)>0.93){o.fillStyle='#0a3322';o.fillRect(cx-hw,y,RB_P,RB_P);} } }
}

function buildRoomBg(theme, force){
  const _cd=rbCache[theme];
  if(_cd && !force && _cd.static.width===W && _cd.static.height===H) return _cd; // 아레나 크기 바뀌면 재생성
  rbSeed = force ? ((Math.random()*9999)|0) : (theme.charCodeAt(0)*97+13);
  const o=rbMkCanvas(), c=o.getContext('2d'), glows=[], parts=[]; const P=RB_P;

  if(theme==='forest'){
    for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ const n=rbHash(x,y); let col=n<0.5?'#06140f':(n<0.85?'#08190f':'#0a1f14'); if(y>H*0.62&&n>0.97)col='#0f3a26'; c.fillStyle=col; c.fillRect(x,y,P,P); }
    c.strokeStyle='rgba(60,255,170,0.05)'; for(let x=0;x<=W;x+=36){c.beginPath();c.moveTo(x,H*0.6);c.lineTo(x,H);c.stroke();}
    for(let y=Math.round(H*0.6);y<=H;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    [90,250,430,610,790].forEach((x,i)=>rbPine(c,x,Math.round(H*0.66),120+rbHash(i,2)*70));
    for(let i=0;i<6;i++){ const x=Math.round((60+rbHash(i,3)*(W-120))/P)*P,y=Math.round((H*0.66+rbHash(i,4)*120)/P)*P; rbSpr(c,RB_SCALR,x,y,P,RB_SCAL); glows.push({x:x+2*P,y:y+P,r:16,col:'120,255,160',base:0.16,amp:0.12,s:i}); }
    for(let i=0;i<3;i++){ const x=Math.round((120+rbHash(i,5)*(W-240))/P)*P,y=Math.round((H*0.5+rbHash(i,6)*60)/P)*P; rbSpr(c,RB_MAGR,x,y,P,RB_MAG); glows.push({x:x+P,y:y+P,r:6,col:'70,224,255',base:0.5,amp:0.5,s:i+9,tiny:1}); }
    // (제거됨) 떠다니는 초록/청록 픽셀 입자 — 시야 방해되어 비활성화
  }
  else if(theme==='server'){
    for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ const n=rbHash(x,y); c.fillStyle=n<0.5?'#0a0816':(n<0.86?'#0d0a1c':'#120c26'); c.fillRect(x,y,P,P); }
    [60,210,360,510,660,790].forEach((x,i)=>{ const rw=64,top=70+((i%2)*8),bot=H-50;
      c.fillStyle='#1a1430'; c.fillRect(x,top,rw,bot-top); c.fillStyle='#070512'; c.fillRect(x,top,rw,P); c.fillRect(x,bot-P,rw,P);
      for(let yy=top+12;yy<bot-10;yy+=14)for(let k=0;k<3;k++){ const on=rbHash(x+k,yy)>0.4,col=['#34f7ff','#ff3ad1','#ffd24a'][(Math.abs(((x+yy)/7)|0)+k)%3];
        c.fillStyle=on?col:'#241a3a'; c.fillRect(x+10+k*16,yy,P*2,P*2); if(on)glows.push({x:x+11+k*16,y:yy+P,r:5,col:col==='#34f7ff'?'52,247,255':(col==='#ff3ad1'?'255,58,209':'255,210,74'),base:0.18,amp:0.5,s:(x+yy+k)%17,tiny:1}); } });
    for(let i=0;i<8;i++) glows.push({x:rbRnd()*W,y:60+rbRnd()*(H-120),r:30,col:'255,60,80',base:0,amp:0.22,s:i*2,warn:1});
  }
  else if(theme==='hatch'){
    for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ const n=rbHash(x,y); let col=n<0.5?'#120a1e':(n<0.86?'#170c26':'#1d1030'); if(y>H*0.7&&n>0.9)col='#2a1140'; c.fillStyle=col; c.fillRect(x,y,P,P); }
    const blob=(cx,cy,rad,dark,light)=>{ for(let y=-rad;y<=rad;y+=P)for(let x=-rad;x<=rad;x+=P){ const d=Math.hypot(x,y)/rad,e=d+(rbHash(cx+x,cy+y)-0.5)*0.5; if(e<1){ c.fillStyle=e<0.5?light:dark; c.fillRect(cx+x,cy+y,P,P); if(rbHash(cx+x,cy+y)>0.94){c.fillStyle='#0c0418';c.fillRect(cx+x,cy+y,P,P);} } } };
    c.fillStyle='#23103a'; c.beginPath(); c.moveTo(W/2-180,H); c.bezierCurveTo(W/2-160,H*0.4,W/2+160,H*0.4,W/2+180,H); c.fill();
    blob(W/2,Math.round(H*0.5),140,'#3a165c','#5a2488');
    [[180,180],[720,200],[150,420],[760,430],[450,470]].forEach((b,i)=>{ blob(b[0],b[1],50+((rbHash(i,9)*40)|0),'#34134f','#54227e'); glows.push({x:b[0],y:b[1],r:46,col:'150,80,230',base:0.1,amp:0.16,s:i*3}); });
    glows.push({x:W/2,y:Math.round(H*0.5),r:120,col:'150,70,230',base:0.08,amp:0.12,s:1});
  }
  else { // food
    for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ const n=rbHash(x,y); c.fillStyle=n<0.5?'#1a0816':(n<0.86?'#220a1e':'#2c0c28'); c.fillRect(x,y,P,P); }
    c.strokeStyle='rgba(255,60,160,0.06)'; for(let y=0;y<=H;y+=8){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    glows.push({x:300,y:230,r:70,col:'255,160,60',base:0.12,amp:0.1,s:1,food:'chk'});
    glows.push({x:620,y:250,r:70,col:'255,90,160',base:0.12,amp:0.1,s:2,food:'piz'});
    glows.push({x:160,y:400,r:30,col:'255,80,120',base:0.1,amp:0.2,s:3,food:'sod'});
    glows.push({x:760,y:410,r:30,col:'255,80,120',base:0.1,amp:0.2,s:4,food:'sod'});
    c.fillStyle='#0b0410'; c.fillRect(24,24,150,30); c.strokeStyle='rgba(255,60,160,0.4)'; c.strokeRect(24,24,150,30);
    c.fillStyle='#ff2e6a'; c.fillRect(36,35,10,10); c.fillStyle='#ffb0cf'; for(let b=0;b<6;b++)c.fillRect(58+b*16,36,10,8);
    c.fillStyle='#0b0410'; c.fillRect(W-180,24,156,40); c.strokeStyle='rgba(255,60,160,0.4)'; c.strokeRect(W-180,24,156,40);
    for(let r=0;r<2;r++){ c.fillStyle=r?'#5a2440':'#7a3056'; c.fillRect(W-168,32+r*14,120-(r*30),8); }
  }
  const eg=c.createRadialGradient(W/2,H/2,H*0.34,W/2,H/2,H*0.95); eg.addColorStop(0,'rgba(0,0,0,0)'); eg.addColorStop(1,'rgba(0,0,0,0.55)');
  c.fillStyle=eg; c.fillRect(0,0,W,H);
  return rbCache[theme]={static:o,parts,glows};
}

function rbDrawFood(state,t){
  const bob=s=>Math.round(Math.sin(t*0.0015+s)*3)*RB_P;
  for(const gl of state.glows){ if(!gl.food)continue; const y=gl.y+bob(gl.s);
    if(gl.food==='chk') rbSpr(ctx,RB_CHKR,gl.x-(RB_CHKR[0].length*RB_P*1.6)/2,y-(RB_CHKR.length*RB_P*1.6)/2,RB_P*1.6,RB_CHK);
    if(gl.food==='piz') rbSpr(ctx,RB_PIZR,gl.x-(RB_PIZR[0].length*RB_P*1.6)/2,y-(RB_PIZR.length*RB_P*1.6)/2,RB_P*1.6,RB_PIZ);
    if(gl.food==='sod') rbSpr(ctx,RB_SODR,gl.x-(RB_SODR[0].length*RB_P)/2,y-(RB_SODR.length*RB_P)/2,RB_P,RB_SOD); }
}

function drawRoomBg(theme){
  const st=buildRoomBg(theme); const P=RB_P;
  ctx.imageSmoothingEnabled=false; ctx.drawImage(st.static,0,0);
  const t=(typeof performance!=='undefined')?performance.now():Date.now();
  for(const p of st.parts){
    if(p.stream){ p.y+=p.vy*0.016; if(p.y>H)p.y-=H+p.len*P; for(let k=0;k<p.len;k++){ ctx.globalAlpha=Math.max(0,1-k/p.len); ctx.fillStyle=p.col; ctx.fillRect(p.x,p.y-k*P,P,P);} ctx.globalAlpha=1; continue; }
    p.y+=p.vy*0.016; p.x+=(p.vx||0)*0.016; if(p.y<-4)p.y=H+4; if(p.x<-4)p.x=W; if(p.x>W+4)p.x=0;
    if(p.heart){ rbSpr(ctx,RB_HRTR,p.x,p.y,2,RB_HRT); } else { ctx.globalAlpha=p.a||0.6; ctx.fillStyle=p.col; ctx.fillRect(p.x,p.y,p.r,p.r); ctx.globalAlpha=1; }
  }
  for(const gl of st.glows){ let a=gl.base+Math.max(0,Math.sin(t*0.003+gl.s))*gl.amp; if(gl.warn)a=gl.base+Math.pow(Math.max(0,Math.sin(t*0.004+gl.s)),6)*gl.amp;
    if(gl.tiny){ const fl=0.5+Math.sin(t*0.01+gl.s*3)*0.5; ctx.fillStyle='rgba('+gl.col+','+(0.7*fl)+')'; ctx.fillRect(gl.x,gl.y,P,P); }
    ctx.fillStyle=rbRad(ctx,gl.x,gl.y,gl.r,gl.col,a); ctx.fillRect(gl.x-gl.r,gl.y-gl.r,gl.r*2,gl.r*2); }
  if(theme==='food') rbDrawFood(st,t);
  if(Math.sin(t*0.0009)>0.985){ const y=((Math.abs(Math.sin(t*0.05))*H)|0); const h=P*2+((Math.abs(Math.cos(t*0.07))*10)|0)*P; const sh=(Math.sin(t*0.2)*14|0)*P;
    try{ const cut=ctx.getImageData(0,y,W,h); ctx.putImageData(cut,sh,y); }catch(e){}
    ctx.fillStyle=theme==='food'?'rgba(255,46,140,0.18)':theme==='server'?'rgba(52,247,255,0.16)':theme==='hatch'?'rgba(57,255,154,0.16)':'rgba(70,224,255,0.14)'; ctx.fillRect(0,y,W,P); }
}

/* 방 종류 → 테마 (요청: 일반방→forest · 자잘자 정예방→server · 중간보스→hatch · 최종보스→food) */
function roomTheme(){
  if(roomIsBoss) return 'food';        // 최종보스방 (키죠 · 음식)
  if(roomIsMidboss) return 'hatch';    // 중간보스방 (혜철이 · 해처리)
  if(roomHadElite) return 'server';    // 자잘자 정예방 (손상된 서버룸)
  return 'forest';                     // 일반방 (데이터 숲)
}
// ===== /방 종류별 픽셀 배경 =====

function drawBackground(){
  if(act===1){ drawRoomBg(roomTheme()); return; }   // 1막: 방 종류별 픽셀 배경
  const th=ACT_THEME[Math.min(act-1,2)];
  ctx.fillStyle=th.floor; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=th.grid; ctx.lineWidth=1;
  for(let x=0;x<=W;x+=45){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
  for(let y=0;y<=H;y+=45){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
  for(const d of bgDecor) drawDecor(d);
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.32,W/2,H/2,H*0.9);
  vg.addColorStop(0,'transparent'); vg.addColorStop(1,th.edge);
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  if(roomIsBoss){ ctx.fillStyle=th.bossTint; ctx.fillRect(0,0,W,H); }
}
function circle(x,y,r,fill,stroke){
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}
}
// ---------- 몬스터 스프라이트 (오리지널, 카툰풍) ----------
function _so(r){ ctx.lineJoin='round'; ctx.lineCap='round'; ctx.lineWidth=Math.max(2,r*0.14); ctx.strokeStyle='#2a2238'; }
function _fc(x,y,rr,fill,st){ ctx.beginPath(); ctx.arc(x,y,rr,0,TAU); if(fill){ctx.fillStyle=fill;ctx.fill();} if(st!==false)ctx.stroke(); }
function _rr(x,y,w,h,rad,fill,st){ ctx.beginPath(); ctx.moveTo(x+rad,y); ctx.arcTo(x+w,y,x+w,y+h,rad); ctx.arcTo(x+w,y+h,x,y+h,rad); ctx.arcTo(x,y+h,x,y,rad); ctx.arcTo(x,y,x+w,y,rad); ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill();} if(st!==false)ctx.stroke(); }
function _eyes(r,sp,ey,er){
  ctx.fillStyle='#1a1422'; _fc(-r*sp,ey,er,'#1a1422',false); _fc(r*sp,ey,er,'#1a1422',false);
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-r*sp+er*0.3,ey-er*0.3,er*0.36,0,TAU); ctx.arc(r*sp+er*0.3,ey-er*0.3,er*0.36,0,TAU); ctx.fill();
}
function _angryBrow(r,y){ ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(2,r*0.1);
  ctx.beginPath(); ctx.moveTo(-r*0.55,y-r*0.12); ctx.lineTo(-r*0.2,y); ctx.moveTo(r*0.55,y-r*0.12); ctx.lineTo(r*0.2,y); ctx.stroke(); }
function _weapon(r,kind,col){
  ctx.save(); ctx.translate(r*0.96,r*0.1); _so(r); ctx.lineWidth=Math.max(2,r*0.12);
  if(kind==='sword'){ ctx.fillStyle='#cfd6e6'; _rr(-r*0.06,-r*0.95,r*0.16,r*0.95,r*0.05,'#cfd6e6',true); ctx.fillStyle='#7a5a3a'; _rr(-r*0.18,-r*0.05,r*0.36,r*0.16,r*0.04,'#7a5a3a',true); }
  else if(kind==='dagger'){ ctx.fillStyle='#cfd6e6'; _rr(-r*0.05,-r*0.5,r*0.13,r*0.5,r*0.04,'#cfd6e6',true); ctx.fillStyle='#7a5a3a'; _rr(-r*0.12,-r*0.02,r*0.26,r*0.12,r*0.03,'#7a5a3a',true); }
  else if(kind==='bow'){ ctx.strokeStyle='#7a5a3a'; ctx.lineWidth=Math.max(2,r*0.11); ctx.beginPath(); ctx.arc(0,0,r*0.55,-1.15,1.15); ctx.stroke(); ctx.strokeStyle='#d9d2bf'; ctx.lineWidth=Math.max(1.5,r*0.05); ctx.beginPath(); ctx.moveTo(r*0.22,-r*0.5); ctx.lineTo(r*0.22,r*0.5); ctx.stroke(); }
  else if(kind==='staff'){ ctx.strokeStyle='#7a5a3a'; ctx.lineWidth=Math.max(2,r*0.1); ctx.beginPath(); ctx.moveTo(0,r*0.65); ctx.lineTo(0,-r*0.7); ctx.stroke(); ctx.fillStyle=col||'#8be8ff'; ctx.save(); ctx.shadowColor=col||'#8be8ff'; ctx.shadowBlur=8; _fc(0,-r*0.82,r*0.22,col||'#8be8ff',true); ctx.restore(); }
  ctx.restore();
}
function _humanoid(r,o){
  _so(r);
  if(o.ears){ ctx.fillStyle=o.skin; var ty=o.ears<0?-r*0.7:-r*0.35;
    ctx.beginPath(); ctx.moveTo(-r*0.6,-r*0.05); ctx.lineTo(-r*1.0,ty); ctx.lineTo(-r*0.45,-r*0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.6,-r*0.05); ctx.lineTo(r*1.0,ty); ctx.lineTo(r*0.45,-r*0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  _fc(0,0,r*0.9,o.skin,true);
  if(o.hood){ ctx.fillStyle=o.hood; ctx.beginPath(); ctx.arc(0,0,r*0.92,Math.PI,TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(o.helm){ ctx.fillStyle=o.helm; _rr(-r*0.92,-r*0.98,r*1.84,r*0.62,r*0.18,o.helm,true);
    ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(1.5,r*0.08); ctx.beginPath(); ctx.moveTo(0,-r*0.98); ctx.lineTo(0,-r*0.55); ctx.stroke(); }
  if(o.crown){ ctx.fillStyle='#ffd34d'; var cy=-r*0.72;
    ctx.beginPath(); ctx.moveTo(-r*0.62,cy); ctx.lineTo(-r*0.46,cy-r*0.42); ctx.lineTo(-r*0.2,cy-r*0.08); ctx.lineTo(0,cy-r*0.52); ctx.lineTo(r*0.2,cy-r*0.08); ctx.lineTo(r*0.46,cy-r*0.42); ctx.lineTo(r*0.62,cy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  _eyes(r,0.32,-r*0.02,r*0.16); _angryBrow(r,-r*0.28);
  // 송곳니
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-r*0.16,r*0.34); ctx.lineTo(-r*0.04,r*0.54); ctx.lineTo(r*0.04,r*0.34); ctx.closePath(); ctx.fill();
  if(o.weapon) _weapon(r,o.weapon,o.weaponCol);
}
function _skull(r,o){
  _so(r);
  if(o.hood){ ctx.fillStyle=o.hood; _fc(0,-r*0.1,r*1.02,o.hood,true); }
  _fc(0,0,r*0.9,'#ece7d6',true);
  _rr(-r*0.42,r*0.42,r*0.84,r*0.42,r*0.12,'#ece7d6',true);
  ctx.fillStyle='#1a1422'; _fc(-r*0.34,-r*0.05,r*0.2,'#1a1422',false); _fc(r*0.34,-r*0.05,r*0.2,'#1a1422',false);
  ctx.fillStyle=o.glow||'#9be8ff'; ctx.save(); ctx.shadowColor=o.glow||'#9be8ff'; ctx.shadowBlur=6;
  _fc(-r*0.34,-r*0.02,r*0.08,o.glow||'#9be8ff',false); _fc(r*0.34,-r*0.02,r*0.08,o.glow||'#9be8ff',false); ctx.restore();
  ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(1.5,r*0.07);
  ctx.beginPath(); for(var i=-2;i<=2;i++){ ctx.moveTo(i*r*0.18,r*0.44); ctx.lineTo(i*r*0.18,r*0.82); } ctx.moveTo(-r*0.42,r*0.6); ctx.lineTo(r*0.42,r*0.6); ctx.stroke();
  if(o.weapon) _weapon(r,o.weapon,o.weaponCol);
}
function _golem(r,o){
  _so(r); var c=o.color||'#8a8f9a';
  _rr(-r*0.85,-r*0.82,r*1.7,r*1.64,r*0.3,c,true);
  ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(1.5,r*0.06);
  ctx.beginPath(); ctx.moveTo(-r*0.2,-r*0.82); ctx.lineTo(-r*0.02,-r*0.2); ctx.lineTo(-r*0.32,r*0.15); ctx.moveTo(r*0.4,-r*0.4); ctx.lineTo(r*0.55,r*0.1); ctx.stroke();
  if(o.moss){ ctx.fillStyle=o.moss; _fc(-r*0.5,-r*0.7,r*0.22,o.moss,false); _fc(r*0.42,-r*0.62,r*0.16,o.moss,false); }
  ctx.fillStyle=o.glow||'#ffd34d'; ctx.save(); ctx.shadowColor=o.glow||'#ffd34d'; ctx.shadowBlur=8;
  _fc(-r*0.32,-r*0.12,r*0.15,o.glow||'#ffd34d',false); _fc(r*0.32,-r*0.12,r*0.15,o.glow||'#ffd34d',false); ctx.restore();
  ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(2,r*0.09); ctx.beginPath(); ctx.moveTo(-r*0.3,r*0.5); ctx.lineTo(r*0.3,r*0.5); ctx.stroke();
}
function _slime(r,c){
  _so(r);
  ctx.beginPath();
  ctx.moveTo(-r*0.92,r*0.65);
  ctx.quadraticCurveTo(-r*1.0,-r*0.6,0,-r*0.85);
  ctx.quadraticCurveTo(r*1.0,-r*0.6,r*0.92,r*0.65);
  ctx.quadraticCurveTo(r*0.62,r*0.92,r*0.3,r*0.68);
  ctx.quadraticCurveTo(0,r*0.95,-r*0.3,r*0.68);
  ctx.quadraticCurveTo(-r*0.62,r*0.92,-r*0.92,r*0.65);
  ctx.closePath(); ctx.fillStyle=c; ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.55)'; _fc(-r*0.34,-r*0.32,r*0.18,'rgba(255,255,255,0.55)',false);
  _eyes(r,0.3,0,r*0.14);
  ctx.strokeStyle='#2a2238'; ctx.lineWidth=Math.max(1.5,r*0.08); ctx.beginPath(); ctx.arc(0,r*0.18,r*0.2,0.15,Math.PI-0.15); ctx.stroke();
}
function _ghost(r){
  _so(r);
  ctx.beginPath(); ctx.arc(0,-r*0.1,r*0.82,Math.PI,0); ctx.lineTo(r*0.82,r*0.5);
  ctx.quadraticCurveTo(r*0.52,r*0.85,r*0.3,r*0.55);
  ctx.quadraticCurveTo(0,r*0.88,-r*0.3,r*0.55);
  ctx.quadraticCurveTo(-r*0.52,r*0.85,-r*0.82,r*0.5);
  ctx.closePath(); ctx.fillStyle='rgba(233,238,255,0.92)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle='#3a3550'; _fc(-r*0.3,-r*0.15,r*0.16,'#3a3550',false); _fc(r*0.3,-r*0.15,r*0.16,'#3a3550',false);
  ctx.beginPath(); ctx.arc(0,r*0.12,r*0.16,0,Math.PI); ctx.fillStyle='#3a3550'; ctx.fill();
}
function _eldritch(r){
  _so(r); var c='#6b4f9e';
  ctx.strokeStyle=c; ctx.lineWidth=r*0.24; ctx.lineCap='round';
  for(var i=0;i<5;i++){ var t=(i/4-0.5)*1.6; ctx.beginPath(); ctx.moveTo(t*r*0.5,r*0.3); ctx.quadraticCurveTo(t*r*1.0,r*0.7,t*r*1.1,r*0.95); ctx.stroke(); }
  _fc(0,-r*0.05,r*0.8,c,true);
  ctx.fillStyle='#fff'; _fc(0,-r*0.05,r*0.42,'#fff',true);
  ctx.fillStyle='#ff4d6d'; _fc(0,-r*0.05,r*0.2,'#ff4d6d',false);
  ctx.fillStyle='#1a1422'; _fc(0,-r*0.05,r*0.09,'#1a1422',false);
}
function _steel(r){
  _so(r); var c='#5a5a6e';
  ctx.fillStyle='#444458';
  ctx.beginPath(); ctx.moveTo(-r*0.5,-r*0.6); ctx.quadraticCurveTo(-r*1.1,-r*0.95,-r*0.95,-r*1.3); ctx.quadraticCurveTo(-r*0.68,-r*0.98,-r*0.38,-r*0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r*0.5,-r*0.6); ctx.quadraticCurveTo(r*1.1,-r*0.95,r*0.95,-r*1.3); ctx.quadraticCurveTo(r*0.68,-r*0.98,r*0.38,-r*0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
  _fc(0,0,r*0.9,c,true);
  ctx.fillStyle='#1a1422'; _rr(-r*0.62,-r*0.22,r*1.24,r*0.46,r*0.1,'#1a1422',true);
  ctx.fillStyle='#ff4d6d'; ctx.save(); ctx.shadowColor='#ff4d6d'; ctx.shadowBlur=10;
  _rr(-r*0.46,-r*0.1,r*0.3,r*0.14,r*0.05,'#ff4d6d',false); _rr(r*0.16,-r*0.1,r*0.3,r*0.14,r*0.05,'#ff4d6d',false); ctx.restore();
  ctx.strokeStyle='#2a2238'; ctx.lineWidth=r*0.1; ctx.beginPath(); ctx.moveTo(0,-r*0.88); ctx.lineTo(0,-r*0.28); ctx.stroke();
}
function _bear(r){
  _so(r); var c='#9c6b43', d='#7a5232';
  _fc(-r*0.6,-r*0.68,r*0.34,c,true); _fc(r*0.6,-r*0.68,r*0.34,c,true);
  _fc(-r*0.6,-r*0.68,r*0.17,d,false); _fc(r*0.6,-r*0.68,r*0.17,d,false);
  _fc(0,0,r*0.92,c,true);
  _fc(0,r*0.32,r*0.46,'#e8d3b0',true);
  ctx.fillStyle='#1a1422'; _fc(0,r*0.18,r*0.14,'#1a1422',false);
  _eyes(r,0.34,-r*0.12,r*0.13); _angryBrow(r,-r*0.36);
}
// === 2막 이미지 스프라이트 ===
const GIM_SPRITE=new Image();let gimReady=false;GIM_SPRITE.onload=()=>gimReady=true;GIM_SPRITE.src="btv/assets/asset-078-c494a12c85.png";
const REURA_SPRITE=new Image();let reuraReady=false;REURA_SPRITE.onload=()=>reuraReady=true;REURA_SPRITE.src="btv/assets/asset-079-f7cd856d60.png";
const NAMU_SPRITE=new Image();let namuReady=false;NAMU_SPRITE.onload=()=>namuReady=true;NAMU_SPRITE.src="btv/assets/asset-080-2558b0ff45.png";
const POBEAR_SPRITE=new Image();let pobearReady=false;POBEAR_SPRITE.onload=()=>pobearReady=true;POBEAR_SPRITE.src="btv/assets/asset-081-8291136be0.png";
const YANG_SPRITE=new Image();let yangReady=false;YANG_SPRITE.onload=()=>yangReady=true;YANG_SPRITE.src="btv/assets/asset-082-cf72d5a9b1.png";
const SW_SPRITE=new Image();let swReady=false;SW_SPRITE.onload=()=>swReady=true;SW_SPRITE.src="btv/assets/asset-083-30a6f3480f.png";
const SPRITES={
  _default:(r)=>{ _so(r); _fc(0,0,r*0.9,'#9b8fc4',true); _eyes(r,0.3,0,r*0.16); },
  seungwoo:(r,b)=>{
    if(swReady){ctx.save();ctx.beginPath();ctx.arc(0,-r*0.05,r*0.98,0,TAU);ctx.clip();const ih=SW_SPRITE.naturalHeight||1;const sh=r*2.25;const sw=sh*(SW_SPRITE.naturalWidth/ih);ctx.drawImage(SW_SPRITE,-sw/2,-sh*0.52,sw,sh);ctx.restore();ctx.lineWidth=Math.max(2,r*0.06);ctx.strokeStyle=(b&&b.gphase===2)?'#ff4dd2':'#9146ff';ctx.beginPath();ctx.arc(0,-r*0.05,r*0.98,0,TAU);ctx.stroke();if(b&&b.gphase===2){ctx.globalAlpha=0.14;ctx.fillStyle='#ff4dd2';ctx.beginPath();ctx.arc(-2,-r*0.05,r*0.98,0,TAU);ctx.fill();ctx.globalAlpha=1;}return;}
    const glitch=(b&&b.gphase===2), off=glitch?2:0;
    if(glitch){ ctx.globalAlpha=0.55; ctx.fillStyle='#ff4dd2'; ctx.beginPath(); ctx.arc(-off,0,r*0.8,0,TAU); ctx.fill(); ctx.fillStyle='#38e8ff'; ctx.beginPath(); ctx.arc(off,0,r*0.8,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
    // 양복 어깨
    ctx.fillStyle='#3a2a1c'; ctx.beginPath(); ctx.ellipse(0,r*0.7,r*1.05,r*0.55,0,0,TAU); ctx.fill();
    // 넥타이
    ctx.fillStyle='#b3361f'; ctx.fillRect(-r*0.08,r*0.38,r*0.16,r*0.62);
    // 얼굴
    ctx.fillStyle='#caa07a'; ctx.beginPath(); ctx.arc(0,0,r*0.8,0,TAU); ctx.fill();
    // 머리(가르마)
    ctx.fillStyle='#15100a'; ctx.beginPath(); ctx.arc(0,-r*0.32,r*0.86,Math.PI,TAU); ctx.fill(); ctx.fillRect(-r*0.86,-r*0.42,r*1.72,r*0.4);
    // 눈썹·눈(아래 응시)
    ctx.fillStyle='#0a0a0a';
    ctx.fillRect(-r*0.42,r*0.02,r*0.28,r*0.07); ctx.fillRect(r*0.14,r*0.02,r*0.28,r*0.07);
  },
  goblin_warrior:(r)=>{ if(owlReady){ const S=r*2.7; ctx.drawImage(OWL_SPRITE,-S/2,-S/2,S,S); } else { _humanoid(r,{skin:'#6fae4e',ears:1,helm:'#9aa0ad',weapon:'sword'}); } },
  goblin_bomber:(r)=>{ if(trashReady){ const S=r*2.6; ctx.drawImage(TRASH_SPRITE,-S/2,-S/2,S,S); } else { _humanoid(r,{skin:'#9aa83f',ears:1}); _fc(r*0.92,r*0.5,r*0.44,'#2a2730',true); } },
  goblin_shield:(r)=>{ if(shieldReady){ const S=r*2.75; ctx.drawImage(SHIELD_SPRITE,-S/2,-S/2,S,S); } else { _humanoid(r,{skin:'#6f8a4e',ears:1,helm:'#9aa0ad'}); } },
  goblin_archer:(r)=>{ if(leekReady){ const S=r*2.8; ctx.drawImage(LEEK_SPRITE,-S/2,-S/2,S,S); } else { _humanoid(r,{skin:'#7bbf5a',ears:1,weapon:'bow'}); } },
  goblin_shaman:(r)=>{ if(magpieReady){ const S=r*2.7; ctx.drawImage(MAGPIE_SPRITE,-S/2,-S/2,S,S); } else { _humanoid(r,{skin:'#7bbf5a',ears:1,hood:'#8a6fb0',weapon:'staff',weaponCol:'#c98bff'}); } },
  goblin_assassin:(r)=>_humanoid(r,{skin:'#4f6b46',ears:1,hood:'#2f3b2c',weapon:'dagger'}),
  goblin_king:(r)=>_humanoid(r,{skin:'#5a9e3f',ears:1,crown:1,weapon:'sword'}),
  kijo:(r,b)=>{
    if(kijoReady){ const S=r*2.95; ctx.drawImage(KIJO_SPRITE,-S/2,-S/2,S,S); return; }
    const blk='#1c1620', blk2='#0c0810', red='#c0392b', redD='#7a1f1f', wht='#ece6e0';
    const eye=(b&&b.enraged)?'#ff3b3b':'#ff8a3b';
    // 빨간 뿔 (좌우)
    ctx.fillStyle=red; ctx.strokeStyle=redD; ctx.lineWidth=2;
    for(const s of [-1,1]){
      ctx.beginPath();
      ctx.moveTo(s*r*0.42,-r*0.5);
      ctx.quadraticCurveTo(s*r*0.98,-r*1.1, s*r*0.6,-r*1.4);
      ctx.quadraticCurveTo(s*r*0.72,-r*0.85, s*r*0.6,-r*0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // 마스크 베이스 (검정)
    ctx.fillStyle=blk; ctx.strokeStyle=blk2; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(-r*0.86,-r*0.12);
    ctx.quadraticCurveTo(-r*0.92,-r*0.96, 0,-r*0.98);
    ctx.quadraticCurveTo(r*0.92,-r*0.96, r*0.86,-r*0.12);
    ctx.quadraticCurveTo(r*0.8,r*0.5, r*0.34,r*0.78);
    ctx.quadraticCurveTo(0,r*0.96, -r*0.34,r*0.78);
    ctx.quadraticCurveTo(-r*0.8,r*0.5, -r*0.86,-r*0.12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 이마 흰 줄무늬
    ctx.strokeStyle=wht; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(-r*0.32,-r*0.62); ctx.lineTo(-r*0.02,-r*0.66);
    ctx.moveTo(r*0.06,-r*0.62); ctx.lineTo(r*0.34,-r*0.6);
    ctx.stroke();
    // 눈 주변 빨강
    ctx.fillStyle=red;
    for(const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(s*r*0.4,-r*0.04,r*0.34,r*0.2,s*0.3,0,TAU); ctx.fill(); }
    // 눈 소켓 + 빛나는 눈
    for(const s of [-1,1]){
      ctx.fillStyle=blk2; ctx.beginPath(); ctx.ellipse(s*r*0.4,-r*0.04,r*0.24,r*0.15,0,0,TAU); ctx.fill();
      ctx.save(); ctx.shadowColor=eye; ctx.shadowBlur=10; ctx.fillStyle=eye;
      ctx.beginPath(); ctx.ellipse(s*r*0.42,-r*0.03,r*0.1,r*0.07,0,0,TAU); ctx.fill(); ctx.restore();
    }
    // 뺨 흰 줄(빗금)
    ctx.strokeStyle=wht; ctx.lineWidth=2.5;
    for(const s of [-1,1]){ ctx.beginPath(); for(let k=0;k<3;k++){ ctx.moveTo(s*(r*0.5+k*4),r*0.06+k*4); ctx.lineTo(s*(r*0.66+k*4),r*0.14+k*4);} ctx.stroke(); }
    // 코 세로 빨강
    ctx.fillStyle=redD; ctx.fillRect(-r*0.05,-r*0.2,r*0.1,r*0.5);
    // 빨간 턱 플레이트(메보)
    ctx.fillStyle=red; ctx.strokeStyle=redD; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(-r*0.5,r*0.5); ctx.lineTo(r*0.5,r*0.5);
    ctx.lineTo(r*0.34,r*1.06); ctx.lineTo(-r*0.34,r*1.06);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 검은 입
    ctx.fillStyle=blk2; ctx.fillRect(-r*0.3,r*0.72,r*0.6,r*0.18);
    // 이빨
    ctx.fillStyle=wht;
    for(let k=-3;k<=3;k++){ ctx.fillRect(k*r*0.12-2, r*0.55, 4, 7); }
  },
  // === 2막 (봉식 월드) 스프라이트 ===
  gwangcheon_gim:(r)=>{ if(gimReady){const ih=GIM_SPRITE.naturalHeight||1;const sh=r*2.6;const sw=sh*(GIM_SPRITE.naturalWidth/ih);ctx.drawImage(GIM_SPRITE,-sw/2,-sh/2,sw,sh);return;} // 광천김 (조미김 봉지)
    ctx.lineJoin='round';
    ctx.fillStyle='#2f6e2a'; ctx.fillRect(-r*0.95,-r*0.7,r*1.9,r*1.4);
    ctx.lineWidth=Math.max(2,r*0.12); ctx.strokeStyle='#16331a'; ctx.strokeRect(-r*0.95,-r*0.7,r*1.9,r*1.4);
    ctx.fillStyle='#11270f'; ctx.fillRect(-r*0.55,-r*0.42,r*1.1,r*0.84); // 김 시트
    ctx.fillStyle='#7fb86a'; ctx.fillRect(-r*0.82,-r*0.58,r*0.62,r*0.24); // 라벨
    ctx.fillStyle='#ffd34d'; ctx.fillRect(r*0.28,-r*0.58,r*0.46,r*0.2);   // premium
  },
  reura:(r)=>{ if(reuraReady){const ih=REURA_SPRITE.naturalHeight||1;const sh=r*2.9;const sw=sh*(REURA_SPRITE.naturalWidth/ih);ctx.drawImage(REURA_SPRITE,-sw/2,-sh/2,sw,sh);return;} // 러라 (사자귀 치비)
    circle(0,r*0.5,r*0.7,'#d8c39a','#7a6a40');                  // 몸(사파리)
    circle(-r*0.55,-r*0.7,r*0.26,'#e2b84a','#7a5a20'); circle(r*0.55,-r*0.7,r*0.26,'#e2b84a','#7a5a20'); // 사자 귀
    circle(0,-r*0.25,r*0.72,'#f3e0b6','#7a6a40');               // 머리
    ctx.fillStyle='#ffd966'; ctx.beginPath(); ctx.arc(0,-r*0.4,r*0.5,Math.PI,TAU); ctx.fill(); // 앞머리
    circle(-r*0.24,-r*0.2,r*0.1,'#2a6e5a',false); circle(r*0.24,-r*0.2,r*0.1,'#2a6e5a',false);   // 눈
    circle(-r*0.21,-r*0.23,r*0.04,'#fff',false); circle(r*0.27,-r*0.23,r*0.04,'#fff',false);
  },
  namu:(r)=>{ if(namuReady){const ih=NAMU_SPRITE.naturalHeight||1;const sh=r*3.0;const sw=sh*(NAMU_SPRITE.naturalWidth/ih);ctx.drawImage(NAMU_SPRITE,-sw/2,-sh/2,sw,sh);return;} // 나무
    ctx.fillStyle='#5a3a26'; ctx.fillRect(-r*0.16,-r*0.1,r*0.32,r*1.05); // 줄기
    ctx.strokeStyle='#3a2418'; ctx.lineWidth=Math.max(2,r*0.1);
    ctx.beginPath(); ctx.moveTo(0,r*0.25); ctx.lineTo(-r*0.42,-r*0.05); ctx.moveTo(0,r*0.35); ctx.lineTo(r*0.42,r*0.05); ctx.stroke(); // 가지
    circle(0,-r*0.55,r*0.7,'#7cc35a','#3f7a34'); circle(-r*0.5,-r*0.3,r*0.45,'#7cc35a','#3f7a34'); circle(r*0.5,-r*0.3,r*0.45,'#7cc35a','#3f7a34'); circle(0,-r*0.2,r*0.5,'#8fd06a',false); // 수관
  },
  pobear:(r)=>{ if(pobearReady){const ih=POBEAR_SPRITE.naturalHeight||1;const sh=r*2.6;const sw=sh*(POBEAR_SPRITE.naturalWidth/ih);ctx.drawImage(POBEAR_SPRITE,-sw/2,-sh/2,sw,sh);return;} // 포베어 (곰)
    circle(r*0.15,r*0.28,r*0.78,'#c8884a','#7a4a22');           // 몸
    circle(-r*0.75,-r*0.6,r*0.2,'#c8884a','#7a4a22'); circle(-r*0.12,-r*0.55,r*0.18,'#c8884a','#7a4a22'); // 귀
    circle(-r*0.45,-r*0.25,r*0.55,'#c8884a','#7a4a22');         // 머리
    circle(-r*0.62,-r*0.05,r*0.24,'#e8c79a',false);            // 주둥이
    ctx.fillStyle='#2a1a10'; circle(-r*0.74,-r*0.08,r*0.07,'#2a1a10',false); circle(-r*0.5,-r*0.34,r*0.06,'#2a1a10',false); circle(-r*0.26,-r*0.32,r*0.06,'#2a1a10',false); // 코·눈
  },
  yanggaeng:(r,e)=>{
    // 박제인간 — 레코드판 (회전 애니)
    const en=e&&e.enr;
    const spinAng=(e&&e.spinAng)||0;
    const t=performance.now()/1000;
    ctx.save();
    ctx.rotate(spinAng);

    // 외곽 원반 (검정)
    ctx.beginPath(); ctx.arc(0,0,r,0,TAU);
    ctx.fillStyle='#0a0a0a'; ctx.fill();
    ctx.strokeStyle=en?'#ff2020':'#1a1a1a'; ctx.lineWidth=Math.max(2,r*0.06); ctx.stroke();

    // 동심원 홈 (레코드 홈 패턴)
    const grooveCount=7;
    for(let i=1;i<=grooveCount;i++){
      const gr=r*(0.28+i*0.09);
      if(gr>=r*0.9) break;
      ctx.beginPath(); ctx.arc(0,0,gr,0,TAU);
      ctx.strokeStyle=en?`rgba(120,0,0,${0.3+i*0.04})`:`rgba(40,40,40,${0.5+i*0.04})`;
      ctx.lineWidth=Math.max(1,r*0.025);
      ctx.stroke();
    }

    // 중앙 레이블 원 (노란색)
    const labelR=r*0.28;
    ctx.beginPath(); ctx.arc(0,0,labelR,0,TAU);
    ctx.fillStyle=en?'#cc2200':'#e8c820'; ctx.fill();
    ctx.strokeStyle=en?'#880000':'#a08800'; ctx.lineWidth=Math.max(1.5,r*0.05); ctx.stroke();

    // 레이블 위 텍스트
    ctx.fillStyle=en?'#ff8080':'#2a1a00';
    ctx.font=`bold ${Math.max(6,Math.round(r*0.14))}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('B', 0, -r*0.08);
    ctx.fillText('면', 0, r*0.1);
    ctx.textBaseline='alphabetic';

    // 중앙 구멍
    ctx.beginPath(); ctx.arc(0,0,r*0.055,0,TAU);
    ctx.fillStyle='#000'; ctx.fill();

    // 격노 시 균열 효과 (빨간 선 4개)
    if(en){
      ctx.strokeStyle='rgba(255,30,30,0.7)'; ctx.lineWidth=Math.max(1.5,r*0.04);
      for(let i=0;i<4;i++){
        const ca=i/4*TAU+t*0.3;
        const cr1=r*0.1, cr2=r*(0.7+Math.sin(t*3+i)*0.15);
        ctx.beginPath(); ctx.moveTo(Math.cos(ca)*cr1,Math.sin(ca)*cr1);
        ctx.lineTo(Math.cos(ca)*cr2,Math.sin(ca)*cr2); ctx.stroke();
      }
      // 격노 글로우
      ctx.save(); ctx.globalAlpha=0.15+0.1*Math.abs(Math.sin(t*4));
      ctx.beginPath(); ctx.arc(0,0,r*1.1,0,TAU); ctx.fillStyle='#ff0000'; ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  },
  kkotchung:(r,e)=>{
    const ph=(e&&e.phase)||1;
    const t=performance.now()/1000;
    const P=Math.round; // 픽셀 단위 반올림 헬퍼

    if(ph===1){
      // ── 페이즈1: 귀여운 꽃 (픽셀아트 느낌) ──
      const pw=Math.max(2,P(r*0.11)); // 픽셀 단위
      // 줄기
      ctx.fillStyle='#3a7a20';
      ctx.fillRect(P(-pw),P(r*0.55),P(pw*2),P(r*0.65));
      // 잎
      ctx.fillStyle='#5fc83a';
      ctx.fillRect(P(-r*0.55),P(r*0.72),P(r*0.44),P(pw*3));
      ctx.fillRect(P(r*0.18),P(r*0.82),P(r*0.44),P(pw*3));
      // 꽃잎 8장 (픽셀 사각형으로)
      const pCol='#f7a8d0', pEdge='#e06090';
      for(let i=0;i<8;i++){
        const pa=i/8*TAU;
        const pr2=r*0.46;
        const px=P(Math.cos(pa)*pr2), py=P(Math.sin(pa)*pr2);
        const pw2=P(r*0.26), ph2=P(r*0.18);
        ctx.save(); ctx.translate(px,py); ctx.rotate(pa);
        ctx.fillStyle=pCol; ctx.fillRect(P(-pw2/2),P(-ph2/2),pw2,ph2);
        ctx.strokeStyle=pEdge; ctx.lineWidth=pw; ctx.strokeRect(P(-pw2/2),P(-ph2/2),pw2,ph2);
        ctx.restore();
      }
      // 얼굴 (픽셀 원 → 타일드 사각형 느낌)
      const fr=P(r*0.68);
      ctx.fillStyle='#fff8c0'; ctx.strokeStyle='#e8c860'; ctx.lineWidth=Math.max(2,pw);
      ctx.beginPath(); ctx.arc(0,0,fr,0,TAU); ctx.fill(); ctx.stroke();
      // 픽셀 눈 (좌)
      ctx.fillStyle='#1a0f08';
      ctx.fillRect(P(-r*0.3),P(-r*0.18),P(r*0.18),P(r*0.18));
      ctx.fillRect(P(r*0.12),P(-r*0.18),P(r*0.18),P(r*0.18));
      ctx.fillStyle='#fff';
      ctx.fillRect(P(-r*0.24),P(-r*0.22),P(r*0.07),P(r*0.07));
      ctx.fillRect(P(r*0.18),P(-r*0.22),P(r*0.07),P(r*0.07));
      // 픽셀 미소
      ctx.fillStyle='#7a4a10';
      for(let i=-2;i<=2;i++) ctx.fillRect(P(i*r*0.1-pw),P(r*(i===0?0.22:i*i===4?0.14:0.18)),P(pw*2),P(pw*2));
      // 볼 홍조 (픽셀 점묘)
      ctx.fillStyle='rgba(255,140,170,0.4)';
      ctx.fillRect(P(-r*0.5),P(r*0.04),P(r*0.22),P(pw*3));
      ctx.fillRect(P(r*0.28),P(r*0.04),P(r*0.22),P(pw*3));
    } else if(ph===2){
      // ── 페이즈2: 눈이 밖으로 삐져나옴 + 꽃잎 검붉음 ──
      const pw=Math.max(2,P(r*0.1));
      const wobX=Math.sin(t*4)*r*0.04, wobY=Math.cos(t*3.2)*r*0.03;
      // 줄기 (비틀림)
      ctx.fillStyle='#2a5a10';
      ctx.save(); ctx.translate(wobX*0.3,0);
      ctx.fillRect(P(-pw),P(r*0.5),P(pw*2),P(r*0.7)); ctx.restore();
      // 꽃잎 (검붉게, 비대칭 크기)
      for(let i=0;i<8;i++){
        const pa=i/8*TAU+t*0.18;
        const pr2=r*(0.44+Math.sin(t*2.5+i*0.7)*0.08);
        const px=P(Math.cos(pa)*pr2), py=P(Math.sin(pa)*pr2);
        const pw2=P(r*(0.28+Math.sin(t+i)*0.06)), ph2=P(r*0.16);
        ctx.save(); ctx.translate(px,py); ctx.rotate(pa);
        ctx.fillStyle=i%2===0?'#b02050':'#8a0030';
        ctx.fillRect(P(-pw2/2),P(-ph2/2),pw2,ph2);
        ctx.strokeStyle='#600020'; ctx.lineWidth=pw;
        ctx.strokeRect(P(-pw2/2),P(-ph2/2),pw2,ph2); ctx.restore();
      }
      // 얼굴 (세로로 약간 늘어남)
      const stretch=0.12+0.07*Math.abs(Math.sin(t*3));
      const fr=P(r*0.7);
      ctx.fillStyle='#e8a080'; ctx.strokeStyle='#8a3020'; ctx.lineWidth=Math.max(2,pw);
      ctx.beginPath(); ctx.ellipse(wobX,wobY,fr*(1-stretch*0.3),fr*(1+stretch*0.5),0,0,TAU); ctx.fill(); ctx.stroke();
      // 눈알이 얼굴 밖으로 빠져나옴 (줄기 달린 눈)
      const eyeProtrude=r*(0.36+0.08*Math.abs(Math.sin(t*2.8)));
      for(let side of[-1,1]){
        const ex=side*r*0.34+wobX, ey=P(-r*0.18+wobY);
        // 눈줄기
        ctx.strokeStyle='#c07050'; ctx.lineWidth=Math.max(2,pw);
        ctx.beginPath(); ctx.moveTo(side*r*0.18+wobX,ey); ctx.lineTo(ex,ey-eyeProtrude); ctx.stroke();
        // 눈알
        const er=P(r*0.18);
        ctx.fillStyle='#f0e8e0'; ctx.strokeStyle='#8a3020'; ctx.lineWidth=pw;
        ctx.beginPath(); ctx.arc(ex,ey-eyeProtrude,er,0,TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#1a0a04';
        ctx.beginPath(); ctx.arc(ex+side*r*0.03,ey-eyeProtrude,P(r*0.1),0,TAU); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(ex+side*r*0.06,ey-eyeProtrude-P(r*0.05),P(r*0.04),0,TAU); ctx.fill();
      }
      // 이빨 (길쭉하게 드러남)
      const mouthY=P(r*0.28+wobY);
      ctx.fillStyle='#1a0508';
      ctx.beginPath(); ctx.ellipse(wobX,mouthY,P(r*0.32),P(r*0.18+0.1*Math.abs(Math.sin(t*2.5))),0,0,TAU); ctx.fill();
      ctx.fillStyle='#f5f0e0'; ctx.strokeStyle='#b0a070'; ctx.lineWidth=1;
      for(let i=-2;i<=2;i++){
        const tx2=P(i*r*0.12+wobX), ty2=P(mouthY-r*0.16);
        const th2=P(r*(0.16+Math.abs(Math.sin(t*1.8+i*0.5))*0.08));
        ctx.fillRect(tx2-P(r*0.04),ty2-th2,P(r*0.08),th2);
        ctx.strokeRect(tx2-P(r*0.04),ty2-th2,P(r*0.08),th2);
      }
    } else {
      // ── 페이즈3: 완전 개화 — 심연, 이미지 완전 변형 ──
      const pw=Math.max(2,P(r*0.09));
      const wobX=Math.sin(t*5)*r*0.06, wobY=Math.cos(t*4)*r*0.04;
      // 선인장 팔 (양쪽, 픽셀 가시 달림)
      for(let side of[-1,1]){
        ctx.fillStyle='#2a6a18';
        ctx.fillRect(P(side*(r*0.62)),P(-r*0.2),P(r*0.32),P(r*0.72));
        ctx.fillRect(P(side*(r*0.82)),P(r*0.05),P(r*0.28),P(r*0.38));
        // 가시
        ctx.fillStyle='#e05038';
        for(let gi=0;gi<5;gi++){
          const gx=P(side*(r*0.62+(gi%2)*r*0.28)), gy=P(-r*0.12+gi*r*0.17);
          ctx.fillRect(gx,gy,P(side*r*0.14),P(pw*1.5));
        }
      }
      // 뒤틀린 꽃잎 (12장, 길쭉하고 들쭉날쭉)
      for(let i=0;i<12;i++){
        const pa=i/12*TAU+t*0.28;
        const pr2=r*(0.52+Math.sin(t*3+i)*0.14);
        const px=P(Math.cos(pa)*pr2+wobX*0.5), py=P(Math.sin(pa)*pr2+wobY*0.5);
        const pw2=P(r*(0.24+Math.abs(Math.sin(t*1.5+i))*0.14));
        const ph2=P(r*0.14);
        ctx.save(); ctx.translate(px,py); ctx.rotate(pa);
        ctx.fillStyle=i%3===0?'#6a0028':i%3===1?'#8a0030':'#c02060';
        ctx.fillRect(P(-pw2/2),P(-ph2/2),pw2,ph2);
        ctx.strokeStyle='#400010'; ctx.lineWidth=pw;
        ctx.strokeRect(P(-pw2/2),P(-ph2/2),pw2,ph2); ctx.restore();
      }
      // 얼굴 (크고 뒤틀림)
      const fStretch=0.28+0.14*Math.abs(Math.sin(t*3.8));
      const fr=P(r*0.76);
      ctx.fillStyle='#c06040'; ctx.strokeStyle='#600010'; ctx.lineWidth=Math.max(2,pw);
      ctx.beginPath(); ctx.ellipse(wobX,wobY*0.5,fr*(1-fStretch*0.2),fr*(1+fStretch*0.55),0,0,TAU); ctx.fill(); ctx.stroke();
      // 눈알 4개 (얼굴 밖으로 길게 늘어남)
      const eyeData=[
        {ox:-0.32, oy:-0.08, proR:0.42+0.12*Math.abs(Math.sin(t*2.2))},
        {ox: 0.32, oy:-0.08, proR:0.44+0.10*Math.abs(Math.sin(t*2.5))},
        {ox:-0.14, oy:-0.28, proR:0.28+0.08*Math.abs(Math.sin(t*3.1))},
        {ox: 0.14, oy:-0.28, proR:0.26+0.09*Math.abs(Math.sin(t*2.8))},
      ];
      for(const ed of eyeData){
        const ex=P(ed.ox*r+wobX), ey=P(ed.oy*r+wobY);
        const proLen=P(ed.proR*r);
        // 눈줄기 (구불구불)
        ctx.strokeStyle='#b06040'; ctx.lineWidth=Math.max(3,pw);
        ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex+P(wobX*0.3),ey-proLen); ctx.stroke();
        // 눈알
        const er2=P(r*0.16);
        ctx.fillStyle='#f0ece0'; ctx.strokeStyle='#600010'; ctx.lineWidth=pw;
        ctx.beginPath(); ctx.arc(ex+P(wobX*0.3),ey-proLen,er2,0,TAU); ctx.fill(); ctx.stroke();
        const pupilOff=er2*0.25;
        ctx.fillStyle='#08020a';
        ctx.beginPath(); ctx.arc(ex+P(wobX*0.3)+pupilOff,ey-proLen,P(r*0.085),0,TAU); ctx.fill();
        ctx.fillStyle='#ff1040'; ctx.globalAlpha=0.5+0.4*Math.abs(Math.sin(t*4+ed.ox));
        ctx.beginPath(); ctx.arc(ex+P(wobX*0.3)+pupilOff,ey-proLen,P(r*0.045),0,TAU); ctx.fill(); ctx.globalAlpha=1;
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(ex+P(wobX*0.3)+pupilOff+P(r*0.035),ey-proLen-P(r*0.04),P(r*0.03),0,TAU); ctx.fill();
      }
      // 이빨 (길고 삐죽, 아래위 모두)
      const mY=P(r*0.36+wobY);
      const mOpen=P(r*(0.22+0.12*Math.abs(Math.sin(t*2.8))));
      ctx.fillStyle='#0a0210';
      ctx.beginPath(); ctx.ellipse(wobX,mY,P(r*0.38),mOpen,0,0,TAU); ctx.fill();
      ctx.strokeStyle='#280010'; ctx.lineWidth=pw;
      ctx.beginPath(); ctx.ellipse(wobX,mY,P(r*0.38),mOpen,0,0,TAU); ctx.stroke();
      // 위 이빨
      ctx.fillStyle='#f0ead0'; ctx.strokeStyle='#a09060'; ctx.lineWidth=1;
      for(let i=-3;i<=3;i++){
        const tx2=P(i*r*0.1+wobX); const ty2=P(mY-mOpen+P(r*0.03));
        const th2=P(r*(0.14+Math.abs(Math.sin(t*1.6+i*0.6))*0.1));
        ctx.beginPath(); ctx.moveTo(tx2-P(r*0.04),ty2); ctx.lineTo(tx2,ty2-th2); ctx.lineTo(tx2+P(r*0.04),ty2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // 아래 이빨 (짧음)
      for(let i=-2;i<=2;i++){
        const tx2=P(i*r*0.1+wobX); const ty2=P(mY+mOpen-P(r*0.03));
        const th2=P(r*0.08);
        ctx.beginPath(); ctx.moveTo(tx2-P(r*0.035),ty2); ctx.lineTo(tx2,ty2+th2); ctx.lineTo(tx2+P(r*0.035),ty2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // 심연 글로우 오라
      ctx.save(); ctx.globalAlpha=0.14+0.1*Math.abs(Math.sin(t*5));
      ctx.fillStyle='#8a0030';
      ctx.beginPath(); ctx.arc(wobX,wobY,r*1.25,0,TAU); ctx.fill(); ctx.restore();
    }
  },
  skeleton_warrior:(r)=>_skull(r,{weapon:'sword'}),
  skeleton_archer:(r)=>_skull(r,{weapon:'bow'}),
  skeleton_shaman:(r)=>_skull(r,{hood:'#7a6aa0',weapon:'staff',weaponCol:'#c98bff',glow:'#c98bff'}),
  ghost:(r)=>_ghost(r),
  small_golem:(r)=>_golem(r,{color:'#8a8f9a',glow:'#ffd34d'}),
  ruins_golem:(r)=>_golem(r,{color:'#6f8a6a',glow:'#9bff9b',moss:'#4f7a4a'}),
  giant_golem:(r)=>_golem(r,{color:'#7a808c',glow:'#ff9b4d'}),
  eldritch:(r)=>_eldritch(r),
  slime_green:(r)=>_slime(r,'#5dff9b'),
  slime_red:(r)=>_slime(r,'#ff6b6b'),
  slime_yellow:(r)=>_slime(r,'#ffd34d'),
  elf_melee:(r)=>_humanoid(r,{skin:'#f0d8c0',ears:-1,helm:'#7bbf5a',weapon:'sword'}),
  elf_ranged:(r)=>_humanoid(r,{skin:'#f0d8c0',ears:-1,hood:'#5a9e3f',weapon:'bow'}),
  steel_lord:(r)=>_steel(r),
  bear:(r)=>_bear(r),
  rhino_beetle:(r,e)=>{
    const ang=(e&&e.faceAng!=null)?e.faceAng+Math.PI/2:0;
    if(beetleReady){ const S=r*2.85; ctx.save(); ctx.rotate(ang); ctx.drawImage(BEETLE_SPRITE,-S/2,-S/2,S,S); ctx.restore(); }
    else { circle(0,0,r*0.9,'#3a2418','#1a0f08'); }
  },
  earthworm:(r)=>{ if(wormReady){ const S=r*2.7; ctx.drawImage(WORM_SPRITE,-S/2,-S/2,S,S); } else { circle(0,0,r*0.85,'#e87a8a','#9a3a4a'); } },
  hyechul:(r,e)=>{ const ph=(e&&e.phase)||1; const img=ph>=3?HIVE_SPRITE:(ph===2?LAIR_SPRITE:SHIELD_SPRITE); const rdy=ph>=3?hiveReady:(ph===2?lairReady:shieldReady); if(rdy){ const S=r*2.7; ctx.drawImage(img,-S/2,-S/2,S,S); } else { circle(0,0,r*0.9,'#c0392b','#5a0010'); } },
  zergling:(r)=>{ if(zerglingReady){ const S=r*2.7; ctx.drawImage(ZERGLING_SPRITE,-S/2,-S/2,S,S); } else { circle(0,0,r*0.85,'#c98bff','#5a2a7a'); } },
  mutalisk:(r)=>{ if(mutaliskReady){ const S=r*2.85; ctx.drawImage(MUTALISK_SPRITE,-S/2,-S/2,S,S); } else { circle(0,0,r*0.85,'#b97a4a','#5a2a18'); } },
  ultra:(r)=>{ if(ultraReady){ const S=r*2.7; ctx.drawImage(ULTRA_SPRITE,-S/2,-S/2,S,S); } else { circle(0,0,r*0.9,'#8a6f4a','#3a2a18'); } },
  zerg_egg:(r,e)=>{
    if(zergEggReady){ const S=r*2.6; ctx.drawImage(ZERG_EGG_SPRITE,-S/2,-S/2,S,S); } else { circle(0,0,r*0.85,'#b8772a','#5a3a18'); }
    if(e){
      const prog=clamp(1-(e.hatchT/(e.hatchMax||2.5)),0,1);
      ctx.save();
      ctx.strokeStyle='rgba(255,150,40,0.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,r+5,-Math.PI/2,-Math.PI/2+prog*TAU); ctx.stroke();
      if(e.hp<e.maxhp){ ctx.strokeStyle='rgba(255,70,70,0.9)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,r+10,-Math.PI/2,-Math.PI/2+(Math.max(0,e.hp)/e.maxhp)*TAU); ctx.stroke(); }
      if(e.hatchT<0.55){ ctx.globalAlpha=0.45*Math.abs(Math.sin(performance.now()/38)); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill(); }
      ctx.restore();
    }
  },
};

function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.translate(0,Math.sin(e.wob)*2);
  const _isc=(e.introScale==null?1:e.introScale);
  if(_isc<=0.01){ ctx.restore(); return; }
  if(_isc!==1) ctx.scale(_isc,_isc);
  // ── 가시성 보정: 적 실루엣을 따라 외곽 글로우 (배경 대비 강화) ──
  ctx.save();
  ctx.shadowColor = e.eliteViewer ? 'rgba(255,80,80,0.95)' : 'rgba(120,205,255,0.85)';
  ctx.shadowBlur  = 9;   // 더 또렷하게: 12~14, 은은하게: 6
  (SPRITES[e.sprite||e.type]||SPRITES._default)(e.r,e);
  ctx.restore();
  if(e.eliteViewer){ ctx.save(); ctx.strokeStyle='rgba(255,60,60,'+(0.45+0.4*Math.abs(Math.sin(e.wob*2.5)))+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,e.r+8,0,TAU); ctx.stroke(); ctx.restore(); }
  if(e.ai==='charge' && (e.cs==='wind'||e.cs==='spit')){
    const len=e.cs==='wind'?135:78;
    ctx.save(); ctx.strokeStyle='rgba(255,70,70,'+(0.35+0.45*Math.abs(Math.sin(e.wob)))+')'; ctx.lineWidth=3; ctx.setLineDash([7,6]);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((e.aimX||0)*len,(e.aimY||0)*len); ctx.stroke(); ctx.restore();
  } else if(e.ai==='charge' && (e.cs==='cast'||e.cs==='burst')){
    const col=e.cs==='burst'?'202,161,74':'232,122,138';
    ctx.save(); ctx.strokeStyle='rgba('+col+','+(0.4+0.4*Math.abs(Math.sin(e.wob)))+')'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,e.r+12+4*Math.sin(e.wob*2),0,TAU); ctx.stroke(); ctx.restore();
  }
  if(e.hitT>0){ ctx.globalAlpha=0.6; circle(0,0,e.r+1,'#fff'); ctx.globalAlpha=1; }
  if(e.elite){ ctx.lineWidth=2.5; ctx.strokeStyle='#ffd34d'; circle(0,0,e.r+6,null,'#ffd34d'); }
  ctx.restore();
  if(e.hp<e.maxhp && !e.midboss && !e.eliteViewer){
    const w=e.r*2;
    ctx.fillStyle='#0008'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w,4);
    ctx.fillStyle=e.color; ctx.fillRect(e.x-w/2,e.y-e.r-12,w*clamp(e.hp/e.maxhp,0,1),4);
  }
  if(e.label){
    ctx.save();
    ctx.font=(e.eliteViewer?'bold 13px ':'bold 11px ')+'sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.strokeText(e.label, e.x, e.y+e.r+13);
    ctx.fillStyle=e.eliteViewer?'#ff4d4d':'#eaf2d0'; ctx.fillText(e.label, e.x, e.y+e.r+13);
    ctx.restore();
  }
  if(e.taunt && e.taunt.t>0){
    ctx.save(); ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    const tw=ctx.measureText(e.taunt.text).width+18, bx=e.x-tw/2, by=e.y-e.r-44;
    ctx.fillStyle='rgba(20,12,28,0.93)'; ctx.fillRect(bx,by,tw,23);
    ctx.strokeStyle='#ff6a6a'; ctx.lineWidth=1.5; ctx.strokeRect(bx,by,tw,23);
    ctx.fillStyle='#ffd6d6'; ctx.fillText(e.taunt.text, e.x, by+16);
    ctx.restore();
  }
}
function drawBoss(b){
  ctx.save(); ctx.translate(b.x,b.y);
  const pulse=1+Math.sin(b.phaseT*4)*0.03;
  ctx.scale(pulse,pulse);
  // 오라
  const g=ctx.createRadialGradient(0,0,b.r*0.5,0,0,b.r*1.8);
  g.addColorStop(0,b.color+'55'); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; circle(0,0,b.r*1.8,g);
  (SPRITES[b.sprite]||SPRITES._default)(b.r,b);
  if(b.hitT>0){ ctx.globalAlpha=0.55; circle(0,0,b.r+2,'#fff'); ctx.globalAlpha=1; }
  if(b.enraged){ ctx.lineWidth=3; ctx.strokeStyle='#ff4d6d'; circle(0,0,b.r+7,null,'#ff4d6d'); }
  ctx.restore();
  // 보스 체력바 (상단)
  const bw=W*0.7, bx=(W-bw)/2;
  ctx.fillStyle='#0009'; ctx.fillRect(bx-2,14,bw+4,16);
  ctx.fillStyle='#2a1530'; ctx.fillRect(bx,16,bw,12);
  ctx.fillStyle=b.color; ctx.fillRect(bx,16,bw*clamp(b.hp/b.maxhp,0,1),12);
  ctx.fillStyle='#fff'; ctx.font='bold 13px Courier New'; ctx.textAlign='center';
  ctx.fillText(b.name+(b.enraged?' 〔격노〕':''), W/2, 27);
  ctx.textAlign='left';
}
function drawPlayer(){
  const p=player;
  if(p.minion){ circle(p.minion.x,p.minion.y,7,'#8be8ff','#1d8fa0'); circle(p.minion.x,p.minion.y,3,'#eafaff','#8be8ff'); }
  ctx.save(); ctx.translate(p.x,p.y);
  let alpha=1;
  if(p.dodging>0) alpha=0.5;
  if(p.iframes>0 && Math.floor(p.iframes*20)%2===0) alpha=0.4;
  // 무적 오라
  if(p.buffs && p.buffs.shield>0){ ctx.globalAlpha=0.45; circle(0,0,p.r+9,null,'#bff8ff'); ctx.globalAlpha=1; }
  // 조준 무기 (스프라이트 뒤에서 삐져나옴)
  ctx.save(); ctx.rotate(p.facing);
  ctx.fillStyle='#e9e4f5'; ctx.fillRect(p.r+1,-3,15,6);
  ctx.fillStyle='#9146ff'; ctx.fillRect(p.r+14,-4,5,8);
  ctx.restore();
  // 캐릭터 스프라이트 (정면 고정)
  ctx.globalAlpha=alpha;
  const S=p.r*2.9;
  if(playerSpriteReady) ctx.drawImage(PLAYER_SPRITE,-S/2,-S/2-2,S,S);
  else circle(0,0,p.r,'#38e8ff','#0a3a44');
  ctx.globalAlpha=1;
  ctx.restore();
}
function drawTutorial(){
  if(!tutorial||!tutorial.active||act!==1||state!=='play') return;
  const lines=[['이동','W A S D 키',tutorial.moved],['조준·발사','마우스 + 클릭',tutorial.shot],['베인 Q (회피)','SPACE 바',tutorial.dodged]];
  const x=20,y=52, w=410, h=66+lines.length*36;
  ctx.save();
  ctx.fillStyle='rgba(14,9,22,0.9)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#c98bff'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
  ctx.textAlign='left';
  ctx.font='bold 20px sans-serif'; ctx.fillStyle='#ffd34d';
  ctx.fillText('🎮 튜토리얼 — 조작을 익혀보자!', x+16, y+34);
  lines.forEach((ln,i)=>{
    const yy=y+72+i*36;
    ctx.font='bold 18px sans-serif';
    ctx.fillStyle=ln[2]?'#5dff9b':'#ffffff';
    ctx.fillText((ln[2]?'✓  ':'▸  ')+ln[0], x+18, yy);
    ctx.font='bold 17px sans-serif'; ctx.fillStyle=ln[2]?'#5dff9b':'#8be8ff';
    ctx.fillText('「'+ln[1]+'」', x+232, yy);
  });
  if(tutorial.moved&&tutorial.shot&&tutorial.dodged){
    ctx.fillStyle='#ffd34d'; ctx.font='bold 18px sans-serif';
    ctx.fillText('튜토리얼 완료! 🎉', x+18, y+h-14);
  }
  ctx.restore();
}
function updateEliteIntro(dt){
  const E=eliteIntro, ze=E.ze; E.t+=dt; ze.wob+=dt*3;
  if(screenShake>0) screenShake=Math.max(0,screenShake-dt*40);
  if(E.t<0.5){
    enemies.forEach(o=>{ if(o===ze) return; o.stunT=4; const dir=o.x<W/2?-1:1; o.x=clamp(o.x+dir*160*dt,28,W-28); });
  } else if(E.t<1.5){
    E.warn=clamp((E.t-0.5)/0.9,0,1);
    if(!E.landed && E.t>=1.05){
      E.landed=true; ze.introScale=1.4;
      screenShake=Math.max(screenShake,16);
      burst(ze.x,ze.y+ze.r,'#caa46a',30,380); burst(ze.x,ze.y,'#ff5b3b',16,320);
      beep(85,0.2,'square',0.1); beep(300,0.45,'triangle',0.05);
      if(typeof sfx!=='undefined' && sfx.boss) sfx.boss();
    }
    if(E.landed) ze.introScale += (1-ze.introScale)*Math.min(1,dt*9);
  } else if(E.t<3.0){
    E.warn=null; ze.introScale=1;
    E.banner=clamp((E.t-1.5)/0.3,0,1);
    if(!E.tensionDone && E.t>=1.62){ E.tensionDone=true; beep(150,0.7,'sawtooth',0.05); beep(75,0.7,'sine',0.06); }
  } else {
    ze.intro=false; ze.introScale=1; ze.stunT=0;
    enemies.forEach(o=>{ o.stunT=0; o.coolT=rand(0.4,1.2); });
    eliteIntro=null; timeScale=0.4; slowmoT=0.3;
    banner('교전 시작','자잘자',900);
  }
}
function drawEliteIntro(){
  const E=eliteIntro; if(!E) return; const ze=E.ze;
  if(E.t<1.8){ const sa=clamp(E.t/0.25,0,1)*clamp((1.8-E.t)/0.4,0,1); ctx.save(); ctx.globalAlpha=sa; ctx.textAlign='center'; ctx.font='bold 13px "Courier New",monospace'; ctx.fillStyle='#ff5b5b'; ctx.fillText('[SYSTEM] 일반적인 시청자 데이터 외에, 비정상적으로 강력한 정예 개체가 감지되었습니다.', W/2, 38); ctx.restore(); }
  const vig=clamp((E.t-0.35)/0.5,0,1)*0.55;
  if(vig>0){ const g=ctx.createRadialGradient(W/2,H/2,H*0.22,W/2,H/2,H*0.72); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(12,0,4,'+vig+')'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  if(E.warn!=null){ const r=18+E.warn*80; ctx.save(); ctx.lineWidth=4; ctx.strokeStyle='rgba(255,60,60,'+(0.85*(1-E.warn))+')'; ctx.beginPath(); ctx.arc(ze.x,ze.y+ze.r+4,r,0,TAU); ctx.stroke(); ctx.fillStyle='rgba(255,40,40,'+(0.16*(1-E.warn))+')'; ctx.beginPath(); ctx.arc(ze.x,ze.y+ze.r+4,r,0,TAU); ctx.fill(); ctx.restore(); }
  if(E.banner>0){
    const isKkot=(E.ze&&E.ze.type==='kkotchung');
    const col=isKkot?'#ff7ab0':'#c46bff', bw=470,bh=74,bx=(W-bw)/2, by=62-(1-E.banner)*72;
    ctx.save(); ctx.globalAlpha=Math.min(1,E.banner*1.25);
    ctx.fillStyle='rgba(14,9,22,0.93)'; ctx.fillRect(bx,by,bw,bh);
    ctx.shadowColor=col; ctx.shadowBlur=16; ctx.lineWidth=3; ctx.strokeStyle=col; ctx.strokeRect(bx,by,bw,bh); ctx.shadowBlur=0;
    ctx.textAlign='center';
    ctx.fillStyle=col; ctx.font='bold 14px sans-serif'; ctx.fillText(isKkot?'🍯 양갱':'⚠ 자잘자', W/2, by+25);
    ctx.fillStyle='#fff'; ctx.font='bold 19px sans-serif'; ctx.fillText(isKkot?'"꽃이라고 얕봤지? 이제 진짜야."':'"나는야 너무 멋진 장수풍뎅이"', W/2, by+52);
    ctx.restore();
  }
}
function spawnFirePillar(x,y,srcName){ hazards.push({x:clamp(x,34,W-34),y:clamp(y,90,H-50),t:0,warnT:0.85,liveT:0.45,r:38,hit:false,dmg:13,srcName:srcName||null}); }
function spawnCreep(x,y){ hazards.push({kind:'creep',x:clamp(x,30,W-30),y:clamp(y,90,H-50),r:58,t:0,life:6}); }
function spawnSlowField(x,y,r,life){ hazards.push({kind:'slowfield',x:clamp(x,40,W-40),y:clamp(y,110,H-60),r:r||90,t:0,life:life||7,warnT:0.7,seed:rand(0,TAU)}); }
// 저그 알: 일정 시간 뒤 부화. 부화 전에 깨면 유닛 안 나옴(경험치·골드 미지급)
function spawnEgg(x,y,hatchType,hatchTime){
  const d=ENEMY_TYPES.zerg_egg, hm=Math.max(0.6,hatchTime);
  enemies.push({
    type:'zerg_egg',sprite:'zerg_egg',name:'저그 알',
    x:clamp(x,30,W-30),y:clamp(y,120,H-120),r:d.r,
    hp:d.hp*diffSet.hp,maxhp:d.hp*diffSet.hp,spd:0,_spd0:0,dmg:0,
    color:d.color,xp:0,ai:'egg',hatchType,hatchT:hm,hatchMax:hm,
    wob:rand(0,TAU),hitT:0,coolT:0,
  });
  burst(x,y,'#8a3f6f',10,140);
}
function hyechulSpawnEgg(e,hatchType,count,hatchTime){
  const cap=hatchType==='ultra'?3:9;
  const pending=enemies.filter(x=>x.type==='zerg_egg'&&x.hatchType===hatchType).length;
  const live=enemies.filter(x=>x.type===hatchType).length;
  const n=Math.max(0,Math.min(count,cap-live-pending));
  // 맵 무작위 3곳에 3개씩 분산 배치
  const spots=[];
  const cols=3; // 3구역으로 분할
  for(let s=0;s<cols;s++){
    const sx=Math.round(W*(s+0.18+Math.random()*0.3));
    const sy=Math.round(rand(180,H-180));
    spots.push({x:clamp(sx,50,W-50),y:clamp(sy,130,H-130)});
  }
  let spawned=0;
  for(let s=0;s<spots.length && spawned<n;s++){
    spawnEgg(spots[s].x,spots[s].y,hatchType,hatchTime+rand(-0.2,0.2));
    spawned++;
  }
  if(spawned>0){ banner('🥚 알 투척 — 맵 3곳!','부화 전에 깨부숴라!',850); beep(150,0.18,'sawtooth',0.06); }
}
function updateHazards(dt){
  player._creepSlow=false; player._slowField=false;
  for(let i=hazards.length-1;i>=0;i--){ const h=hazards[i]; h.t+=dt;
    if(h.kind==='slowfield'){
      if(h.t>=h.warnT && dist2(player.x,player.y,h.x,h.y)<h.r*h.r) player._slowField=true;
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='creep'){
      if(dist2(player.x,player.y,h.x,h.y)<h.r*h.r) player._creepSlow=true;
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.t>=h.warnT && h.t<h.warnT+h.liveT){
      if(!h.hit && dist2(player.x,player.y,h.x,h.y)<h.r*h.r){ h.hit=true; hurtPlayer(h.dmg, h.srcName||(boss?boss.name:'바닥 장판')); }
      if(Math.random()<0.55) burst(h.x+rand(-h.r*0.5,h.r*0.5),h.y-rand(0,16),pick(['#ffd24a','#ff8c2a','#ff5b2a']),2,220);
    }
    if(h.t>=h.warnT+h.liveT) hazards.splice(i,1);
  }
}
function spawnDeathBubble(x,y,text,dur){
  floatBubbles.push({x:x, y:y, vy:-16, t:0, max:dur||3.0, text:text});
}
function drawFloatBubbles(){
  for(const fb of floatBubbles){
    const fade = fb.t > fb.max-0.6 ? Math.max(0,(fb.max-fb.t)/0.6) : 1;
    ctx.save(); ctx.globalAlpha=fade; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
    const tw=ctx.measureText(fb.text).width+22, bx=fb.x-tw/2, by=fb.y-14;
    ctx.fillStyle='rgba(20,12,28,0.95)'; ctx.fillRect(bx,by,tw,26);
    ctx.strokeStyle='#ff6a6a'; ctx.lineWidth=1.6; ctx.strokeRect(bx,by,tw,26);
    ctx.beginPath(); ctx.moveTo(fb.x-6,by+26); ctx.lineTo(fb.x+6,by+26); ctx.lineTo(fb.x,by+33); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#ffd6d6'; ctx.fillText(fb.text, fb.x, by+17);
    ctx.restore();
  }
}
function drawHazards(){
  for(const h of hazards){
    if(h.kind==='slowfield'){
      if(h.t<h.warnT){
        const k=h.t/h.warnT; ctx.save(); ctx.globalAlpha=0.4+0.3*Math.abs(Math.sin(h.t*16));
        ctx.strokeStyle='#a05bd0'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,TAU); ctx.stroke();
        ctx.fillStyle='rgba(120,50,160,'+(0.06+0.12*k)+')'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*k,0,TAU); ctx.fill(); ctx.restore();
      } else {
        const a=Math.min(clamp((h.t-h.warnT)/0.5,0,1),clamp((h.life-h.t)/1.0,0,1)), sd=h.seed||0;
        ctx.save();
        ctx.globalAlpha=0.52*a; ctx.fillStyle='#3a1f4a'; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.82,0,0,TAU); ctx.fill();
        ctx.globalAlpha=0.5*a;  ctx.fillStyle='#5a2f6f'; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r*0.68,h.r*0.56,0,0,TAU); ctx.fill();
        ctx.globalAlpha=0.4*a;  ctx.strokeStyle='#7a4a92'; ctx.lineWidth=1.4;
        for(let k=0;k<11;k++){ const ka=k/11*TAU+sd; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(h.x+Math.cos(ka)*h.r*0.96,h.y+Math.sin(ka)*h.r*0.8); ctx.stroke(); }
        for(let ring=1;ring<=2;ring++){ ctx.globalAlpha=0.26*a; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r*ring/2.5,h.r*0.82*ring/2.5,0,0,TAU); ctx.stroke(); }
        ctx.globalAlpha=0.55*a; ctx.fillStyle='#7a3f5f';
        for(let k=0;k<5;k++){ const ka=k/5*TAU+sd*1.7; ctx.beginPath(); ctx.arc(h.x+Math.cos(ka)*h.r*0.5,h.y+Math.sin(ka)*h.r*0.4,h.r*0.13,0,TAU); ctx.fill(); }
        ctx.globalAlpha=0.5*a; ctx.strokeStyle='#9a5fc0'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.82,0,0,TAU); ctx.stroke();
        ctx.restore();
      }
      continue;
    }
    if(h.kind==='creep'){
      const a=clamp(h.t<0.4?h.t/0.4:(h.life-h.t)/0.8,0,1);
      ctx.save(); ctx.globalAlpha=0.42*a; ctx.fillStyle='#6a2f8f';
      ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.62,0,0,TAU); ctx.fill();
      ctx.globalAlpha=0.5*a; ctx.strokeStyle='#c46bff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.62,0,0,TAU); ctx.stroke();
      ctx.globalAlpha=0.3*a; ctx.fillStyle='#9a4fc0';
      for(let k=0;k<4;k++){ const ka=k/4*TAU+h.t; ctx.beginPath(); ctx.arc(h.x+Math.cos(ka)*h.r*0.5,h.y+Math.sin(ka)*h.r*0.32,h.r*0.22,0,TAU); ctx.fill(); }
      ctx.restore(); continue;
    }
    if(h.t<h.warnT){
      const k=h.t/h.warnT; ctx.save(); ctx.globalAlpha=0.45+0.35*Math.abs(Math.sin(h.t*22));
      ctx.strokeStyle='#ff7a2a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,TAU); ctx.stroke();
      ctx.fillStyle='rgba(255,90,20,'+(0.10+0.16*k)+')'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*k,0,TAU); ctx.fill(); ctx.restore();
    } else {
      const lk=clamp((h.t-h.warnT)/h.liveT,0,1), a=0.92*(1-lk*0.55); ctx.save();
      const g=ctx.createLinearGradient(h.x,h.y-94,h.x,h.y+12);
      g.addColorStop(0,'rgba(255,230,120,0)'); g.addColorStop(0.55,'rgba(255,150,40,'+a+')'); g.addColorStop(1,'rgba(255,70,30,'+a+')');
      ctx.fillStyle=g; ctx.fillRect(h.x-h.r*0.62,h.y-94,h.r*1.24,106);
      ctx.fillStyle='rgba(255,120,40,'+(a*0.7)+')'; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.42,0,0,TAU); ctx.fill(); ctx.restore();
    }
  }
}
function drawBossEvolve(){
  const E=bossEvolve; if(!E) return; const t=E.t;
  const flash=clamp(1-t/0.4,0,1)*0.5*(typeof GS!=='undefined'?GS.flashScale:1);
  if(flash>0){ ctx.save(); ctx.globalAlpha=flash; ctx.fillStyle=E.col; ctx.fillRect(0,0,W,H); ctx.restore(); }
  const vig=clamp(t/0.3,0,1)*0.5*clamp((2.6-t)/0.6,0,1);
  if(vig>0){ const g=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(8,0,10,'+vig+')'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  const ex=E.e?E.e.x:W/2, ey=E.e?E.e.y:160;
  for(let k=0;k<(E.phase===3?2:1);k++){
    const rt=clamp((t-k*0.18)/0.7,0,1); if(rt<=0||rt>=1) continue;
    ctx.save(); ctx.globalAlpha=(1-rt)*0.8; ctx.strokeStyle=E.col; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(ex,ey,20+rt*190,0,TAU); ctx.stroke(); ctx.restore();
  }
  const ba=clamp((t-0.25)/0.25,0,1)*clamp((2.6-t)/0.5,0,1);
  if(ba>0){
    const bw=430,bh=48,bx=(W-bw)/2,by=42;
    ctx.save(); ctx.globalAlpha=ba;
    ctx.fillStyle='rgba(12,8,18,0.92)'; ctx.fillRect(bx,by,bw,bh);
    ctx.shadowColor=E.col; ctx.shadowBlur=18; ctx.lineWidth=3; ctx.strokeStyle=E.col; ctx.strokeRect(bx,by,bw,bh); ctx.shadowBlur=0;
    ctx.textAlign='center'; ctx.fillStyle=E.col; ctx.font='bold 13px sans-serif'; ctx.fillText('🧬 혜철이', W/2, by+18);
    ctx.fillStyle='#fff'; ctx.font='bold 21px sans-serif'; ctx.fillText(E.name, W/2, by+40);
    ctx.restore();
  }
  const sa=clamp((t-0.6)/0.25,0,1)*clamp((2.6-t)/0.5,0,1);
  if(sa>0){
    ctx.save(); ctx.globalAlpha=sa; ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
    const tw=ctx.measureText(E.line).width+30, sx=clamp(ex,tw/2+12,W-tw/2-12), sy=Math.max(118,ey-(E.e?E.e.r:30)-50);
    ctx.fillStyle='rgba(22,14,30,0.96)'; ctx.fillRect(sx-tw/2,sy-21,tw,32);
    ctx.strokeStyle=E.col; ctx.lineWidth=2; ctx.strokeRect(sx-tw/2,sy-21,tw,32);
    ctx.fillStyle='rgba(22,14,30,0.96)'; ctx.beginPath(); ctx.moveTo(sx-7,sy+11); ctx.lineTo(sx+7,sy+11); ctx.lineTo(sx,sy+20); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillText(E.line, sx, sy);
    ctx.restore();
  }
}
function drawEliteBar(e){
  const bw=420, bh=14, bx=(W-bw)/2, by=20;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(bx-4,by-4,bw+8,bh+8);
  ctx.fillStyle='#2a1414'; ctx.fillRect(bx,by,bw,bh);
  const f=clamp(e.hp/e.maxhp,0,1);
  const grad=ctx.createLinearGradient(bx,0,bx+bw,0); grad.addColorStop(0,'#ff3b3b'); grad.addColorStop(1,'#ff8a4d');
  ctx.fillStyle=grad; ctx.fillRect(bx,by,bw*f,bh);
  ctx.strokeStyle='#ff5a5a'; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
  ctx.fillText(e.type==='kkotchung'?('🍯 양갱'+(e.phase?' ['+e.phase+'/3]':'')):'⚔️ 자잘자', W/2, by-8); ctx.textAlign='left';
  ctx.restore();
}
function drawMidbossBar(e){
  const bw=440, bh=15, bx=(W-bw)/2, by=20;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(bx-4,by-4,bw+8,bh+8);
  ctx.fillStyle='#2a1620'; ctx.fillRect(bx,by,bw,bh);
  const f=clamp(e.hp/e.maxhp,0,1);
  const grad=ctx.createLinearGradient(bx,0,bx+bw,0); grad.addColorStop(0,'#ff5b3b'); grad.addColorStop(1,'#ffae42');
  ctx.fillStyle=grad; ctx.fillRect(bx,by,bw*f,bh);
  ctx.strokeStyle='#ffae42'; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  ctx.fillText('⚠️ 중간보스 · '+(e.label||'')+(e.phase?(' [페이즈 '+e.phase+'/3]'):''), W/2, by-8);
  ctx.textAlign='left'; ctx.restore();
}

function drawKijoMaskShape(x,y,r,kind,alpha,seed){
  ctx.save();
  ctx.globalAlpha=alpha==null?1:alpha;
  ctx.translate(x,y);
  ctx.rotate(Math.sin((seed||0)+performance.now()/340)*0.08);
  const fill=kind==='real'?'#fff2c8':kind==='cry'?'#d7f0ff':kind==='laugh'?'#ffe0f0':'#ead8ff';
  ctx.fillStyle=fill; ctx.strokeStyle=kind==='real'?'#ffd34d':'#7a264a'; ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.ellipse(0,0,r*0.78,r,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1d1024';
  ctx.beginPath(); ctx.ellipse(-r*0.28,-r*0.15,r*0.13,r*0.2,0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r*0.28,-r*0.15,r*0.13,r*0.2,0,0,TAU); ctx.fill();
  ctx.strokeStyle='#1d1024'; ctx.lineWidth=2;
  ctx.beginPath();
  if(kind==='cry'){
    ctx.arc(0,r*0.18,r*0.28,Math.PI*1.08,Math.PI*1.92);
    ctx.stroke(); ctx.fillStyle='#66d8ff'; ctx.beginPath(); ctx.ellipse(-r*0.36,r*0.3,r*0.08,r*0.18,0,0,TAU); ctx.fill();
  } else {
    ctx.arc(0,r*0.02,r*0.34,0.12,Math.PI-0.12);
    ctx.stroke();
  }
  ctx.restore();
}
function drawKijoFx(){
  for(const g of kijoGazes){
    const k=clamp(g.t/g.warn,0,1), a=0.08+0.22*Math.sin(k*Math.PI);
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#ff4d6d';
    ctx.beginPath(); ctx.moveTo(g.x,g.y);
    ctx.arc(g.x,g.y,g.r,g.ang-g.w/2,g.ang+g.w/2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha=0.75; ctx.strokeStyle='#ffd34d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(g.x,g.y); ctx.lineTo(g.x+Math.cos(g.ang-g.w/2)*g.r,g.y+Math.sin(g.ang-g.w/2)*g.r);
    ctx.moveTo(g.x,g.y); ctx.lineTo(g.x+Math.cos(g.ang+g.w/2)*g.r,g.y+Math.sin(g.ang+g.w/2)*g.r); ctx.stroke();
    ctx.restore();
  }
  for(const m of kijoMasks){
    const k=clamp(m.t/m.warn,0,1), pulse=1+Math.sin(m.t*18)*0.06;
    const kind=m.type==='mood'?m.mood:(m.done&&m.real?'real':'fake');
    drawKijoMaskShape(m.x,m.y,28*pulse,kind,clamp(0.25+k,0,1),m.seed);
    if(!m.done){
      ctx.save(); ctx.globalAlpha=0.45; ctx.strokeStyle=m.real?'#ffd34d':'#ff6a9a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(m.x,m.y,36+8*k,0,TAU); ctx.stroke(); ctx.restore();
    }
  }
  for(const p of kijoParades){
    drawKijoMaskShape(p.x,p.y,p.r,'laugh',0.88,p.seed);
    ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#ffd34d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(p.x-p.vx*0.16,p.y); ctx.lineTo(p.x-p.vx*0.36,p.y); ctx.stroke(); ctx.restore();
  }
  if(boss&&boss.key==='kijo'&&boss.reflectT>0){
    const a=clamp(boss.reflectT/3.2,0,1), ang=boss.reflectAng||0, r=boss.r+22;
    ctx.save(); ctx.globalAlpha=0.22+0.18*Math.sin(performance.now()/80);
    ctx.strokeStyle='#ffd34d'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(boss.x,boss.y,r,ang-0.9,ang+0.9); ctx.stroke();
    ctx.globalAlpha=0.12*a; ctx.fillStyle='#ffd34d';
    ctx.beginPath(); ctx.moveTo(boss.x,boss.y); ctx.arc(boss.x,boss.y,r+46,ang-0.9,ang+0.9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// ===== JS: Rendering =====
function draw(){
  ctx.save();
  { const _sk=screenShake*(typeof GS!=='undefined'?GS.shake:1); if(_sk>0.5){ ctx.translate(rand(-_sk,_sk),rand(-_sk,_sk)); } }
  if(boss&&boss.pattern==='glitch'&&state==='play'){ const cx=W/2,cy=H/2; ctx.translate(cx,cy); ctx.scale(gView.fx,gView.fy); ctx.rotate(gView.rot); ctx.translate(-cx,-cy); }
  drawBackground();

  // 픽업
  for(const pk of pickups){
    const yo=Math.sin(pk.bob)*2;
    if(pk.type==='gold'){ circle(pk.x,pk.y+yo,pk.r,'#ffd34d','#a8740a'); ctx.fillStyle='#7a5400';ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillText('G',pk.x,pk.y+yo+3);ctx.textAlign='left'; }
    else{ circle(pk.x,pk.y+yo,pk.r,'#ff5d8a','#7a1030'); ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';ctx.textAlign='center';ctx.fillText('♥',pk.x,pk.y+yo+3);ctx.textAlign='left'; }
  }
  drawHazards();
  drawKijoFx();
  // 적
  for(const e of enemies) drawEnemy(e);
  drawFloatBubbles();
  if(boss&&boss.pattern==='glitch') drawSeungwooWorld();
  if(boss) drawBoss(boss);
  const _mb=enemies.find(e=>e.midboss); if(_mb) drawMidbossBar(_mb);
  const _el=enemies.find(e=>e.eliteViewer); if(_el && !eliteIntro) drawEliteBar(_el);
  // 탄
  for(const b of eBullets){
    if(b.foodImg && b.foodImg.complete){ const S=b.r*2.7; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.spin||0); ctx.drawImage(b.foodImg,-S/2,-S/2,S,S); ctx.restore(); }
    else if(b.kkot){
      // 미주 탄환: 작은 꽃잎 모양
      ctx.save(); ctx.translate(b.x,b.y);
      const kkAngle=Math.atan2(b.vy,b.vx);
      ctx.rotate(kkAngle);
      ctx.fillStyle='#ff5090'; ctx.strokeStyle='#8a0030'; ctx.lineWidth=1.5;
      for(let pi=0;pi<5;pi++){
        const pa=pi/5*TAU;
        ctx.beginPath(); ctx.ellipse(Math.cos(pa)*b.r*0.55,Math.sin(pa)*b.r*0.55,b.r*0.48,b.r*0.28,pa,0,TAU); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle='#ffe0f0'; ctx.beginPath(); ctx.arc(0,0,b.r*0.28,0,TAU); ctx.fill();
      ctx.restore();
    }
    else circle(b.x,b.y,b.r,b.spore?'#ff7a8a':'#ff4d6d','#5a0010');
  }
  for(const b of pBullets){
    ctx.save();ctx.shadowColor=b.crit?'#ffd34d':'#38e8ff';ctx.shadowBlur=8;
    circle(b.x,b.y,b.r,b.crit?'#ffe28a':'#bff8ff',b.crit?'#a8740a':'#1d8fa0'); ctx.restore();
  }
  // 플레이어
  if(state!=='start'&&state!=='end') drawPlayer();
  // 파티클
  for(const p of particles){
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    circle(p.x,p.y,p.r,p.color); ctx.globalAlpha=1;
  }
  if(typeof drawDmgNums==='function') drawDmgNums();
  ctx.restore();

  // 피격 플래시
  if(hitFlash>0){ ctx.fillStyle='rgba(255,77,109,'+(hitFlash*0.6*(typeof GS!=='undefined'?GS.flashScale:1))+')'; ctx.fillRect(0,0,W,H); }
  if(boss&&boss.pattern==='glitch'&&state==='play') drawSeungwooOverlay();
  if(eliteIntro) drawEliteIntro();
  if(bossEvolve) drawBossEvolve();
  // 베인Q 쿨다운 인디케이터 (아이콘 + 방사형 쿨)
  if(state==='play'){
    const sz=46, ix=14, iy=H-sz-14, cx=ix+sz/2, cy=iy+sz/2;
    const cdMax=Math.max(0.01,10*player.dodgeCdMul), ready=player.dodgeCd<=0;
    const rem=ready?0:clamp(player.dodgeCd/cdMax,0,1);
    ctx.save();
    ctx.beginPath(); ctx.rect(ix,iy,sz,sz); ctx.clip();
    ctx.fillStyle='#0a0712'; ctx.fillRect(ix,iy,sz,sz);
    if(vqReady) ctx.drawImage(VAYNEQ_ICON,ix,iy,sz,sz);
    else { ctx.fillStyle='#16384a'; ctx.fillRect(ix,iy,sz,sz); }
    if(rem>0){ ctx.fillStyle='rgba(6,4,12,0.7)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,sz,-Math.PI/2,-Math.PI/2+rem*TAU); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth=2.5; ctx.strokeStyle=ready?'#38e8ff':'#3a3550'; ctx.strokeRect(ix,iy,sz,sz);
    if(ready){ ctx.save(); ctx.shadowColor='#38e8ff'; ctx.shadowBlur=8; ctx.strokeStyle='#38e8ff'; ctx.strokeRect(ix,iy,sz,sz); ctx.restore(); }
    else { ctx.fillStyle='#fff'; ctx.font='bold 15px Courier New'; ctx.textAlign='center'; ctx.fillText(player.dodgeCd.toFixed(1), cx, cy+5); ctx.textAlign='left'; }
    ctx.fillStyle=ready?'#38e8ff':'#9b8fc4'; ctx.font='bold 10px Courier New'; ctx.textAlign='left';
    ctx.fillText('베인Q [SPACE]', ix, iy-6);
  }
  drawTutorial();
  if(typeof drawFpsOverlay==='function') drawFpsOverlay();
}

// ---------- 메인 루프 ----------
let last=performance.now();
// ---------- 일시정지 (ESC) ----------
let paused=false;
function togglePause(){
  if(paused){ resumeGame(); return; }
  if(state!=='play') return;          // 전투 화면에서만 일시정지 가능
  paused=true;
  const ov=$('ovPause'); if(ov) ov.classList.remove('hidden');
  mouseDown=false; autoFire=false;     // 멈출 때 발사 입력 해제
}
function resumeGame(){
  if(!paused) return;
  paused=false;
  const ov=$('ovPause'); if(ov) ov.classList.add('hidden');
  last=performance.now();             // 재개 시 dt 폭증 방지
}
(function wirePause(){
  const rb=$('resumeBtn'); if(rb) rb.onclick=resumeGame;
  // pauseSoundBtn은 wireSettings()에서 openSettings로 연결됨
})();


// ===== JS: Main loop =====
function loop(now){
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  if(typeof updFps==='function') updFps(dt);
  if(!paused){ update(dt); if(typeof updateDmgNums==='function') updateDmgNums(dt); }
  draw();
  if(!paused){ updateMusic(dt); }
  { const sb=$('skipCutBtn'); if(sb) sb.style.display=(state==='play'&&cutsceneT>0)?'inline-block':'none'; }
  requestAnimationFrame(loop);
}
// 보스 입장/진화 연출 즉시 종료
function skipCutscene(){
  if(cutsceneT<=0) return;
  cutsceneT=0;
  if(typeof bossEvolve!=='undefined' && bossEvolve) bossEvolve=null;
  const oe=$('ovEntrance'); if(oe){ oe.classList.add('hidden'); oe.classList.remove('ent-anim'); }
  const sb=$('skipCutBtn'); if(sb) sb.style.display='none';
  last=performance.now();
}

// ---------- 오버레이 제어 ----------

// ===== JS: Overlay state machine and UI wiring =====
const overlays={title:'ovTitle',start:'ovStart',map:'ovMap',relic:'ovRelic',shop:'ovShop',event:'ovEvent',inv:'ovInv',level:'ovLevel',reward:'ovReward',end:'ovEnd',help:'ovHelp',story:'ovStory',entrance:'ovEntrance',tierIntro:'ovTierIntro',taunt:'ovTaunt',campfire:'ovCampfire'};
function hideAll(){ Object.values(overlays).forEach(id=>$(id).classList.add('hidden')); }
function syncChrome(){ document.body.classList.toggle('title-mode', state==='title'||state==='start'); }
function show(st){
  hideAll();
  if(overlays[st]) $(overlays[st]).classList.remove('hidden');
  if(st!=='help') state=st;
  syncChrome();
  refreshSidePanel();
}
function refreshSidePanel(){
  const sp=$('sidePanel'); if(!sp) return;
  const sw=$('stageWrap');
  // 게임이 시작된 이후로는 항상 표시 (타이틀 화면 'start' 및 player 미초기화 시에만 숨김)
  if(state!=='title' && state!=='start' && player && player.maxhp!=null){ renderSidePanel(); sp.classList.add('show'); if(sw) sw.classList.add('with-side'); }
  else { sp.classList.remove('show'); if(sw) sw.classList.remove('with-side'); }
}

const STORY_LINES=[
 "스트리머 '김봉식'. 오늘도 여느 때처럼 게임 방송을 켰다. 평범한 하루가 될 줄 알았는데…",
 "…어? 이상하다.",
 "채팅창의 코드가 기괴하게 변하고 있어.",
 "분명 응원 채팅이었는데, 어느샌가 의미를 알 수 없는 바이너리 값으로 도배되고 있다.",
 "잠깐, 저건… 내 모니터 밖으로 튀어나오는 건가?",
 "시청자들의 프로필 사진이 실체를 갖추고 화면을 뚫고 들어온다.",
 "내가 관리하던 '밴(Ban) 리스트'에 있던 녀석들까지… 전부 다!",
 "이미 방송 플랫폼의 통제권을 잃었다. 송출 서버는 먹통이야.",
 "저들이 나를 '방송 종료'시키기 전에, 내가 먼저 이 무대를 정리하는 수밖에.",
 "막아라. 끝까지 살아남아라.",
];
const BOSS_TAUNTS={
  easy:  "후훗… 하필 가장 무른 길을 골랐군. 살아남을 자신이 없으니 몸을 사리는 건가?\n좋아, 천천히 보여주지. 네가 '방송 종료'당하는 그 순간까지 — 이 무대는 내가 연출한다.",
  normal:"적당히 즐기다 갈 생각인 모양인데… 안됐지만 이번 방송은 네 뜻대로 흘러가지 않아.\n채팅도, 시청자도, 송출 서버도 — 전부 내 손안에 있거든. 비명 지를 준비나 해 둬.",
  hard:  "감히 가장 험한 길로 기어들어왔다고? 오만하군, 정말.\n그 알량한 자신감이 산산조각 나는 꼴, 한 프레임도 빠짐없이 송출해주마.\n자, 쇼타임이다 — 끝까지 버텨봐.",
};
// 화면 찢어짐(글리치) 연출
function triggerGlitch(after){
  const app=$('app'), fx=$('glitchFx');
  try{ for(let i=0;i<4;i++) setTimeout(()=>beep(rand(80,200),0.05,'sawtooth',0.05),i*70); }catch(e){}
  if(fx){ fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on'); }
  if(app){ app.classList.remove('glitching'); void app.offsetWidth; app.classList.add('glitching'); }
  screenShake=Math.max(screenShake,18);
  setTimeout(()=>{ if(fx)fx.classList.remove('on'); if(app)app.classList.remove('glitching'); after&&after(); }, 740);
}
// 보스의 비웃음 → 글리치 → 인트로
function bossTaunt(diff, cb){
  hideAll(); state='story'; syncChrome();
  const ov=$('ovTaunt'); if(!ov){ cb&&cb(); return; }
  ov.classList.remove('hidden');
  const el=$('tauntText'); el.textContent='';
  const full=BOSS_TAUNTS[diff.key]||BOSS_TAUNTS.normal;
  let ci=0, done=false;
  function finish(){
    if(done) return; done=true;
    clearInterval(tm); ov.onclick=null;
    setTimeout(()=>triggerGlitch(()=>{ ov.classList.add('hidden'); cb&&cb(); }), 700);
  }
  // 클릭하면 대사를 즉시 채우고 넘어간다
  ov.onclick=()=>{ if(ci<full.length){ el.textContent=full; ci=full.length; } else finish(); };
  const tm=setInterval(()=>{
    if(ci<full.length){ el.textContent+=full.charAt(ci++); try{ if(ci%2===0)beep(110,0.02,'sawtooth',0.035); }catch(e){} }
    else finish();
  }, 72);
}
// ===== 인트로 시네마틱 연출 =====
const storyFx={ timers:[], binaryInt:null, popupInt:null, streakInt:null };
function clearStoryFx(){
  storyFx.timers.forEach(id=>{ clearTimeout(id); clearInterval(id); }); storyFx.timers=[];
  if(storyFx.binaryInt){ clearInterval(storyFx.binaryInt); storyFx.binaryInt=null; }
  if(storyFx.popupInt){ clearInterval(storyFx.popupInt); storyFx.popupInt=null; }
  if(storyFx.streakInt){ clearInterval(storyFx.streakInt); storyFx.streakInt=null; }
}
function introFxReset(){
  clearStoryFx();
  const app=$('app'); if(app) app.classList.remove('app-edge');
  const fx=$('introFx'), bin=$('introBinary'),
        pop=$('introPopups'), blk=$('introBlackout'),
        eb=$('endBroadcastBtn');
  if(bin){ bin.classList.remove('show'); bin.innerHTML=''; }
  if(pop){ pop.innerHTML=''; }
  if(blk){ blk.classList.remove('show'); }
  if(eb){ eb.classList.remove('armed'); eb.classList.remove('forced'); eb.classList.remove('trying'); }
  const ebs=$('ebStatus'); if(ebs){ ebs.classList.remove('show'); ebs.textContent=''; }
  const iskip=$('introSkipBtn'); if(iskip){ iskip.style.display='none'; iskip.onclick=null; }
  if(fx){ fx.classList.remove('on'); }
  const bc=$('ovStoryBcast'), pl=$('ovStoryPlate');
  if(bc){ bc.classList.remove('show','glitch','crash'); }
  if(pl){ pl.classList.remove('show'); }
}
function randDigits(rows){ let s=''; for(let i=0;i<rows;i++){ s+=(Math.random()<0.5?'0':'1')+(Math.random()<0.5?'0':'1')+'\n'; } return s; }
function startBinaryRain(){
  const fx=$('introFx'), bin=$('introBinary');
  if(!fx||!bin) return;
  fx.classList.add('on'); bin.innerHTML='';
  const cols=Math.max(10,Math.floor(window.innerWidth/26)); const made=[];
  for(let i=0;i<cols;i++){
    const c=document.createElement('div');
    c.className='bcol'+(Math.random()<0.4?' mag':'');
    c.style.left=(i/cols*100 + Math.random()*1.5)+'%';
    c.style.animationDuration=(1.1+Math.random()*1.6).toFixed(2)+'s';
    c.style.animationDelay=(-Math.random()*2).toFixed(2)+'s';
    c.style.fontSize=(13+Math.floor(Math.random()*5))+'px';
    c.textContent=randDigits(40);
    bin.appendChild(c); made.push(c);
  }
  storyFx.binaryInt=setInterval(()=>{ for(const c of made){ if(Math.random()<0.5) c.textContent=randDigits(40); } },110);
  requestAnimationFrame(()=>bin.classList.add('show'));
}
const BAN_FACES=['👤','😈','👹','🤖','💀','👁️','🤡','👻'];
const BAN_TAGS=['BANNED','차단됨','#403','BLOCKED','강퇴','#ERR'];
function spawnProfileStreak(){
  const pop=$('introPopups'); if(!pop) return;
  const d=document.createElement('div'); d.className='pstreak';
  d.style.top=(28+Math.random()*44)+'%';
  d.style.animationDuration=(0.8+Math.random()*0.5).toFixed(2)+'s';
  d.textContent=BAN_FACES[Math.floor(Math.random()*BAN_FACES.length)];
  const tag=document.createElement('span'); tag.className='pban';
  tag.textContent=pick(CHATTERS)+' · '+BAN_TAGS[Math.floor(Math.random()*BAN_TAGS.length)];
  d.appendChild(tag); pop.appendChild(d);
  try{ if(typeof sfx!=='undefined'&&sfx.hurt) sfx.hurt(); }catch(e){}
  screenShake=Math.max(screenShake,10);
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },1100));
}
function spawnErrorPopup(){
  const pop=$('introPopups'); if(!pop) return;
  const d=document.createElement('div'); d.className='errpop';
  d.style.left=(8+Math.random()*78)+'%'; d.style.top=(12+Math.random()*72)+'%';
  const codes=['0xC0FFEE','0xDEAD','0xBADC0DE','SIGNAL LOST','0xFA11','NULLREF'];
  d.innerHTML='⚠ <b>ERROR</b> '+codes[Math.floor(Math.random()*codes.length)];
  pop.appendChild(d);
  try{ beep(rand(120,260),0.04,'square',0.04); }catch(e){}
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },1600));
}
function startErrorPopups(){ const fx=$('introFx'); if(fx)fx.classList.add('on'); if(storyFx.popupInt) return; storyFx.popupInt=setInterval(spawnErrorPopup,360); spawnErrorPopup(); }
function startProfileStreaks(){ const fx=$('introFx'); if(fx)fx.classList.add('on'); if(storyFx.streakInt) return; storyFx.streakInt=setInterval(spawnProfileStreak,300); spawnProfileStreak(); }
function storyPhase(li){
  const app=$('app');
  const bc=$('ovStoryBcast');
  if(li===1){ if(app) app.classList.add('app-edge'); }            // 도입: 가장자리 엇나감
  else if(li===2){ if(bc) bc.classList.add('glitch'); }   // 전개: 방송 화면 깨짐 (바이너리 코드 비는 제거)
  else if(li===4){ startErrorPopups(); }                          // 절정: 에러 팝업 폭주
  else if(li===5){ startProfileStreaks(); if(bc){ bc.classList.remove('glitch'); bc.classList.add('crash'); } } // 절정: 프로필 돌파 + 방송 화면 붕괴
  else if(li===6){ for(let k=0;k<3;k++) storyFx.timers.push(setTimeout(spawnProfileStreak,k*120)); } // …전부 다!
}
function runEndBroadcast(cb){
  // 진행 중인 연출 스포너만 정지 (피날레 타이머는 유지)
  if(storyFx.popupInt){ clearInterval(storyFx.popupInt); storyFx.popupInt=null; }
  if(storyFx.streakInt){ clearInterval(storyFx.streakInt); storyFx.streakInt=null; }
  if(storyFx.binaryInt){ clearInterval(storyFx.binaryInt); storyFx.binaryInt=null; }
  const fx=$('introFx'), blk=$('introBlackout'),
        eb=$('endBroadcastBtn'), st=$('ebStatus');
  if(fx) fx.classList.add('on');
  if(blk) blk.classList.add('show');                              // 마무리: 블랙아웃
  const T=storyFx.timers;
  // 인트로 스킵 버튼 연결
  let skipped=false;
  const skipBtn=$('introSkipBtn');
  function doSkip(){
    if(skipped) return; skipped=true;
    if(skipBtn){ skipBtn.style.display='none'; skipBtn.onclick=null; }
    storyFx.timers.forEach(id=>{ clearTimeout(id); clearInterval(id); }); storyFx.timers=[];
    triggerGlitch(()=>{ introFxReset(); cb&&cb(); });
  }
  if(skipBtn){ skipBtn.style.display=''; skipBtn.onclick=doSkip; }
  // 종료가 '안 되는' 답답함 — 버튼은 떠 있는데 계속 실패한다
  const deny=(msg,t)=>{ T.push(setTimeout(()=>{
    if(eb){ eb.classList.remove('trying'); void eb.offsetWidth; eb.classList.add('trying'); }
    if(st){ st.classList.add('show'); st.textContent=msg; }
    try{ beep(92,0.16,'square',0.09); setTimeout(()=>beep(70,0.12,'square',0.08),90); }catch(e){}
    screenShake=Math.max(screenShake,9);
  }, t)); };
  T.push(setTimeout(()=>{ if(eb) eb.classList.add('armed'); if(st){ st.classList.add('show'); st.textContent='▣ 방송 종료 요청 전송 중…'; } try{ if(sfx.boss)sfx.boss(); }catch(e){} }, 320));
  deny('● 응답 없음 — 재시도 (1/3)', 1100);
  deny('● 종료 실패 — 송출 서버 먹통 (2/3)', 1950);
  deny('● ERROR 0x4F4E · 제어권 상실 (3/3)', 2800);
  deny('● …누군가 종료를 거부하고 있다', 3550);
  // 마침내 강제 종료
  T.push(setTimeout(()=>{
    if(st){ st.textContent='⚠ 강제 종료'; }
    if(eb){ eb.classList.remove('trying'); void eb.offsetWidth; eb.classList.add('forced'); }
    try{ beep(70,0.5,'sawtooth',0.12); }catch(e){}
  }, 4350));
  T.push(setTimeout(()=>{ triggerGlitch(()=>{ introFxReset(); cb&&cb(); }); }, 4850)); // 게임 진입
}

// ===== JS: Story, intro, and title scenes =====
function showStory(cb){
  hideAll(); state='story'; syncChrome();
  introFxReset();
  $('ovStory').classList.remove('hidden');
  // 방송 화면 + 김봉식 LIVE 명패 (도입: 깨끗한 송출)
  const bcast=$('ovStoryBcast'), plate=$('ovStoryPlate'),
        vEl=$('ovStoryViewers');
  if(vEl) vEl.textContent='시청자 '+((typeof viewerCount!=='undefined'?viewerCount:1204).toLocaleString())+'명';
  if(bcast){ bcast.classList.remove('glitch','crash'); requestAnimationFrame(()=>bcast.classList.add('show')); }
  if(plate) plate.classList.add('show');
  const el=$('storyText'); el.textContent='';
  const btn=$('storySkip'); if(btn){ btn.style.display=''; btn.textContent='건너뛰기 ▶▶'; }
  const lines=STORY_LINES; let li=0,ci=0,typed=false,proceeded=false,phased=-1,autoT=null;
  function firePhasesUpTo(n){ for(let k=phased+1;k<=n;k++) storyPhase(k); if(n>phased) phased=n; }
  function complete(){ if(typed) return; clearInterval(tm); el.textContent=lines.join('\n'); typed=true; firePhasesUpTo(lines.length-1); if(btn){ btn.textContent='다음 ▶'; } autoT=setTimeout(()=>{ if(!proceeded) finish(); },2800); }
  function finish(){ if(proceeded)return; proceeded=true; clearInterval(tm); if(autoT)clearTimeout(autoT); if(btn) btn.style.display='none'; $('ovStory').classList.add('hidden'); runEndBroadcast(cb); }
  if(btn) btn.onclick=()=>{ if(!typed) complete(); else finish(); };
  const tm=setInterval(function(){
    if(li>=lines.length){ complete(); return; }
    if(ci===0){ firePhasesUpTo(li); if(li>0) el.textContent+='\n'; }
    el.textContent+=lines[li].charAt(ci); ci++;
    try{ if(ci%2===0) beep(660,0.012,'square',0.012); }catch(e){}
    if(ci>=lines[li].length){ li++; ci=0; }
  }, 64);
}
function showEntrance(role,name,quip){
  cutsceneT=2.0;
  const el=$('ovEntrance'); if(!el) return;
  const rEl=el.querySelector('.ent-role'), nEl=el.querySelector('.ent-name'), qEl=el.querySelector('.ent-quip');
  if(rEl) rEl.textContent=role;
  if(nEl) nEl.textContent=name+'님이 입장하셨습니다';
  if(qEl) qEl.textContent=quip||'';
  el.classList.remove('hidden'); el.classList.remove('ent-anim'); void el.offsetWidth; el.classList.add('ent-anim');
  try{ sfx.vote&&sfx.vote(); }catch(e){}
  setTimeout(function(){ el.classList.add('hidden'); el.classList.remove('ent-anim'); }, 2000);
}

// ---------- 인벤토리 ----------
function spStats(p){
  return [
    ['❤️ 최대체력', Math.round(p.maxhp), p.maxhp],
    ['⚔️ 공격력', (p.dmg*p.dmgMul).toFixed(1), p.dmg*p.dmgMul],
    ['🎯 치명타', Math.round(p.critChance*100)+'%', p.critChance],
    ['🔥 초당발사', ((1+p.fireAdd)/(0.35*p.fireMul)).toFixed(1)+'발', (1+p.fireAdd)/(0.35*p.fireMul)],
    ['➹ 투사체', p.shots+'발', p.shots],
    ['👟 이동', Math.round(p.spd), p.spd],
    ['🛡️ 피해감소', Math.round(p.armor*100)+'%', p.armor],
  ];
}
function spEffects(p){
  const E=[]; const add=(c,ic,lb,pn,dd)=>{ if(c) E.push({ic,t:lb,pn,d:dd}); };
  add(p.shots>1,'🔱','다중사격 '+p.shots+'발','다중 사격','한 번에 여러 발을 동시에 발사');
  add(p.pierce>0,'🍢','관통 '+p.pierce,'관통','탄이 적을 뚫고 지나간다');
  add(p.bounce>0,'🔴','반사 '+p.bounce,'반사','탄이 벽·적에 튕긴다');
  add(p.homing>0,'👁️','유도탄','유도의 눈','탄이 가까운 적을 추적');
  add(p.backShot,'🔙','쌍방향 사격','쌍방향 사격','앞뒤로 동시에 발사');
  add(p.burn>0,'🔥','화염탄','화염탄','명중 시 지속 화상 피해');
  add(p.chill>0,'❄️','빙결탄','빙결탄','명중한 적을 둔화시킨다');
  add(p.poison>0,'🟢','독침','독침','명중 시 지속 독 피해');
  add(p.bulletExplode>0,'💢','작렬탄','작렬탄','명중 지점에서 폭발');
  add(p.explodeKill>0,'💣','연쇄폭발','연쇄 폭발','적 처치 시 주변 폭발');
  add(p.doubleTap>0,'🔫','더블탭 '+Math.round(p.doubleTap*100)+'%','더블탭','확률로 즉시 한 발 추가');
  add(p.chargeShot,'🔆','차지샷','차지샷','모았다가 강한 탄 발사');
  add(p.stunChance>0,'🔔','기절 '+Math.round(p.stunChance*100)+'%','충격파','확률로 적을 기절');
  add(p.lifesteal>0,'🩸','흡혈 '+Math.round(p.lifesteal*100)+'%','흡혈','적 처치 시 체력 회복');
  add(p.crowdRage>0,'😤','분노','분노','주변 적이 많을수록 공격력↑');
  add(p.lowHpMul>0,'🆘','저체력 폭주','저체력 폭주','체력이 낮을수록 공격력↑');
  add(p.bossDmgMul>1,'🗡️','거인사냥 +'+Math.round((p.bossDmgMul-1)*100)+'%','거인 사냥','보스·정예에게 추가 피해');
  add(p.glassCannon,'🍷','유리대포','유리 대포','공격력 대폭↑, 받는 피해↑');
  add(p.thorns>0,'🌵','가시 '+p.thorns,'가시 갑옷','접촉한 적에게 반사 피해');
  add(p.healOnKill>0,'💚','흡성 '+p.healOnKill,'흡성','적 처치 시 체력 회복');
  add(p.regen>0,'🌿','재생 '+p.regen,'재생','매 초 체력 회복');
  add(p.shieldRegen>0,'🔵','재충전 보호막','재충전 보호막','일정 시간마다 보호막 충전');
  add(p.lastStand,'🩹','막판 정신력','막판 정신력','치명타를 1회 체력 1로 버틴다');
  add(p.dodgeMaxCharges>1,'🌀','이중도약','이중 도약','회피를 2회까지 충전');
  add(p.dodgeBlast>0,'🌪️','처단','처단','회피 시 충격파 발생');
  add(p.dodgeHaste,'💨','추진력','추진력','회피 직후 이동 가속');
  add(p.dodgeIframeBonus>0,'👻','잔상','잔상','회피 무적 시간 증가');
  add(p.dodgeCdMul<1,'🌑','그림자보법','그림자 보법','회피 쿨다운 감소');
  add(p.minion,'🤝','구독자','구독자 소환','자동 공격 분신을 소환');
  add(p.donateChance>0,'💸','도네 '+Math.round(p.donateChance*100)+'%','도네 알림','적 처치 시 확률로 골드');
  add(p.goldMul>1,'🧲','골드 +'+Math.round((p.goldMul-1)*100)+'%','광부','골드 획득량 증가');
  add(p.xpMul>1,'📈','경험치 +'+Math.round((p.xpMul-1)*100)+'%','경험치 부스트','경험치 획득량 증가');
  return E;
}
function renderSidePanel(previewPk){
  const p=player;
  const cur=spStats(p);
  let aft=null, aftE=null; const curE=spEffects(p);
  if(previewPk){
    try{
      const cl=Object.assign({},p);
      cl.buffs=Object.assign({},p.buffs||{}); cl.potions=(p.potions||[]).slice(); cl.relics=(p.relics||[]).slice();
      previewPk.apply(cl);
      aft=spStats(cl); aftE=spEffects(cl);
    }catch(e){ aft=null; aftE=null; }
  }
  let h='<div class="sp-title">📊 내 능력치'+(aft?' <span style="color:#5dff9b;font-size:11px">▸미리보기</span>':'')+'</div>';
  cur.forEach((r,i)=>{
    let val='<b>'+r[1]+'</b>';
    if(aft){
      const dv=aft[i][2]-r[2];
      if(Math.abs(dv)>1e-9) val='<b style="color:#777">'+r[1]+'</b> <b style="color:#5dff9b">→ '+aft[i][1]+'</b>';
    }
    h+='<div class="sp-row"><span>'+r[0]+'</span>'+val+'</div>';
  });
  const shownE=(aftE&&aftE.length)?aftE:curE;
  if(shownE.length){
    const curKeys=curE.map(x=>x.t);
    h+='<div class="sp-title" style="margin-top:9px">✨ 특수 효과</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
    shownE.forEach(fx=>{ const isNew=aftE&&!curKeys.includes(fx.t); const ic=PERK_ICONS[fx.pn]?('<img src="'+PERK_ICONS[fx.pn]+'" style="width:14px;height:14px;image-rendering:pixelated;vertical-align:-2px;margin-right:3px;">'):(fx.ic+' '); h+='<span title="'+(fx.d||'').replace(/"/g,'')+'" style="cursor:help;font-size:10.5px;border-radius:6px;padding:2px 6px;line-height:1.7;'+(isNew?'background:rgba(93,255,155,0.18);border:1px solid #5dff9b;color:#5dff9b;font-weight:bold;':'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);')+'">'+ic+fx.t+'</span>'; });
    h+='</div>';
  }
  if(p.relics&&p.relics.length){
    h+='<div class="sp-title" style="margin-top:9px">🏺 유물 '+p.relics.length+'</div>';
    h+='<div class="sp-relics">'+p.relics.map(r=>'<span title="'+((r.name||'').replace(/"/g,'')+' — '+(r.desc||'').replace(/"/g,''))+'">'+relicIconHTML(r,'relic-pix-sm')+'</span>').join('')+'</div>';
  }
  const el=$('sidePanel'); if(el) el.innerHTML=h;
}
function renderInventory(){
  const p=player;
  const fr=((1+p.fireAdd)/(0.35*p.fireMul)).toFixed(1);
  const pc=v=>Math.round(v*100)+'%';
  const stats=[
    ['공격력', (p.dmg*p.dmgMul).toFixed(1)],
    ['치명타 확률', pc(p.critChance)],
    ['초당 발사', fr+'발'],
    ['투사체', p.shots+'발'],
    ['이동 속도', Math.round(p.spd)],
    ['피해 감소', pc(p.armor)],
  ];
  // 투자한 항목만 추가 표시
  if(p.critChance>0||p.critMult!==2) stats.push(['치명타 피해', 'x'+p.critMult.toFixed(1)]);
  if(p.pierce>0) stats.push(['관통', p.pierce]);
  if(p.bounce>0) stats.push(['튕김', p.bounce]);
  if(p.regen!==0) stats.push(['체력 재생', (p.regen>0?'+':'')+p.regen+'/초']);
  if(p.lifesteal>0) stats.push(['흡혈', pc(p.lifesteal)]);
  if(p.stunChance>0) stats.push(['기절 확률', pc(p.stunChance)]);
  if(p.explodeKill>0) stats.push(['처치 폭발', p.explodeKill]);
  if(p.bossDmgMul!==1) stats.push(['보스 피해', '+'+Math.round((p.bossDmgMul-1)*100)+'%']);
  if(p.lowHpMul>0) stats.push(['저체력 강화', '+'+Math.round(p.lowHpMul*100)+'%']);
  if(p.bulletSize!==1) stats.push(['탄 크기', pc(p.bulletSize)]);
  if(p.bulletSpeedMul!==1) stats.push(['탄 속도', '+'+Math.round((p.bulletSpeedMul-1)*100)+'%']);
  if(p.goldMul!==1) stats.push(['골드 보너스', '+'+Math.round((p.goldMul-1)*100)+'%']);
  if(p.xpMul!==1) stats.push(['경험치', '+'+Math.round((p.xpMul-1)*100)+'%']);
  if(p.dodgeCdMul!==1) stats.push(['베인Q 쿨', pc(p.dodgeCdMul)]);
  if(p.magnet>60) stats.push(['자석 범위', Math.round(p.magnet)]);
  if(p.homing>0) stats.push(['유도탄', 'ON']);
  if(p.backShot) stats.push(['후방 사격', 'ON']);
  if(p.reviveOnce) stats.push(['부활', p.usedRevive?'사용됨':'준비됨']);
  const sc=$('invStats'); sc.innerHTML='';
  stats.forEach(s=>{ const d=document.createElement('div'); d.className='statchip'; d.innerHTML='<span class="sk">'+s[0]+'</span><span class="sv">'+s[1]+'</span>'; sc.appendChild(d); });
  $('invRelicCount').textContent='('+p.relics.length+'개)';
  const rc=$('invRelics'); rc.innerHTML='';
  if(p.relics.length===0){ rc.innerHTML='<div style="color:var(--muted);font-size:12px">아직 없음 — 엘리트·보스·상점·제단에서 유물을 얻는다</div>'; }
  p.relics.forEach(r=>{ const t=relicTier(r); const d=document.createElement('div'); d.className='relicrow relic-'+(TIER_OF[r.id]||'rare'); d.style.borderColor=t.col; d.innerHTML='<span class="ri">'+relicIconHTML(r,'relic-pix-lg')+'</span><span><b>'+r.name+'</b> <span class="grade" style="color:'+t.col+'">['+t.name+']</span>'+(r.cls==='curse'?' <span style="color:#ff6b6b;font-size:10px">⚠저주</span>':'')+'<br><span class="rd">'+r.desc+'</span></span>'; rc.appendChild(d); });
}
function openInventory(){ if(state!=='play'&&state!=='map')return; prevState=state; renderInventory(); show('inv'); }
function closeInventory(){ hideAll(); if(prevState==='map'){ show('map'); } else { state=(prevState&&prevState!=='inv')?prevState:'play'; } }

// ---------- 게임 종료 ----------
function retryRoom(){
  hideAll(); retries++;
  runActive=true;
  restoreProgress();                 // 경험치·레벨·스탯을 방 입장 시점으로 되돌림 (무한 레벨업 방지)
  player.hp=Math.max(1, roomEntryHp||player.maxhp);
  player.buffs={rage:0,haste:0,shield:0};
  player.minion=null;
  pendingLevels=0;                   // 재도전 시 미처리 레벨업 초기화 (사망 직전 레벨업 중복 방지)
  state='play'; syncChrome();
  startCombat(lastRoomKind||'fight', false);   // fresh=false → 스냅샷 새로 찍지 않음
  player.iframes=1.2;
}
const DEATH_LINES={
  '승우':{title:'승우가 게임을 닫았다', q:['승우: "버그가 아니라 실력입니다."','채팅: 화면 돌 때 죽음 KEKW','승우: "한 번 더 하시죠, 봉식님."']},
  '양갱':{title:'양갱에게 짓눌렸다', q:['채팅: 양갱한테 짐 ㅋㅋ Sadge','양갱: 말랑말랑~','채팅: 흑임자 맛 ㄷㄷ']},
  '자잘자':{title:'자잘자에게 긁혔다', q:['자잘자: 봉식님 그것밖에 안 되시네요 KEKW','채팅: 자잘자한테 짐ㅋㅋ Sadge','자잘자: 로블록스나 하러 가세요']},
  '혜철이':{title:'혜철이에게 잡아먹혔다', q:['혜철이: 크아아앙!','채팅: 보스도 아닌데… monkaS','혜철이: 한 입 거리였네']},
  '키죠':{title:'키죠의 가면에 짓밟혔다', q:['키죠: 가소롭군.','채팅: 1막 보스한테 ㅠㅠ','키죠: 이 정도였나?']},
  '강철 군주':{title:'강철 군주에게 분쇄당했다', q:['강철 군주: 약하다.','채팅: 2막에서 막혔다 Sadge','강철 군주: 녹슨 실력이군']},
  '거대 곰':{title:'거대 곰에게 짓이겨졌다', q:['거대 곰: 크어어!','채팅: 곰을 어떻게 이겨요…','채팅: 숲의 지배자 클라스 ㄷㄷ']},
  '울트라':{title:'울트라에게 깔렸다', q:['채팅: 울트라 컨트롤 ㄷㄷ','울트라: 쿠어어','채팅: 저글링부터 잡지 그랬어']},
  '바닥 장판':{title:'바닥 장판에 녹았다', q:['채팅: 바닥 보고 다녀요 KEKW','채팅: 장판 회피 연습… Sadge','채팅: 그건 좀…']},
};
function gameOver(win, killer){
  state='end'; syncChrome();
  // 승리 시에만 인트로로 전환 — 사망 시엔 죽은 막의 음악을 그대로 유지
  if(win){ runActive=false; roomIsBoss=false; roomIsMidboss=false; }
  show('end');
  const canRetry = !win && (diffSet.maxRetries === Infinity || retries < diffSet.maxRetries);
  $('retryBtn').style.display = canRetry ? '' : 'none';
  const titleBtn=$('titleBtn'); if(titleBtn) titleBtn.style.display = win ? 'none' : '';
  // 재도전 버튼 텍스트에 남은 횟수 표시
  if(canRetry && diffSet.maxRetries !== Infinity){
    const left = diffSet.maxRetries - retries;
    $('retryBtn').textContent = '↺ 재도전하기 (남은 ' + left + '회)';
  } else {
    $('retryBtn').textContent = '↺ 재도전하기';
  }
  $('endTag').textContent=win?'🏆 클리어':'📺 방송 사고';
  let title, quip;
  const k = killer || lastKiller || '시청자';
  if(win){ title='CLEAR!'; quip=pick(["채팅 단체기립 POGGERS","갓겜 인정 GIGACHAD","클립 박제각 Clap","이게 되네?! KEKW"]); }
  else {
    const entry = DEATH_LINES[k];
    if(entry){ title=entry.title; quip=pick(entry.q); }
    else { title='"'+k+'"에게 당했다'; quip=pick(["채팅 폭소 KEKW","아 아까비 Sadge","한 판 더! LULW","발컨 박제 monkaS","멘탈 챙기세요"]); }
  }
  $('endTitle').textContent=title;
  $('endTitle').style.color=win?'#5dff9b':'#ff4d6d';
  $('endStats').innerHTML=
    "도달: <b>"+act+"막</b> · 처치: <b>"+totalKills+"</b> · 레벨: <b>"+level+"</b><br>"+
    "골드: <b style='color:#ffd34d'>"+gold+"</b> · 유물: <b>"+player.relics.length+"개</b> · 난이도: <b style='color:"+diffSet.col+"'>"+diffSet.label+"</b>";
  $('endQuip').textContent='채팅: "'+quip+'"';
  chatSys(win?"🎉🎉 클리어!! 채팅 축제":"☠ 사망 ("+k+") — 채팅: "+pick(["GG","한판더","아깝다 Sadge","리트 ㄱㄱ"]));
}
function victory(){ gameOver(true); }

// ---------- 시작/재시작 ----------
function newGame(){
  startBGM();
  runActive=true;
  act=1; currentRow=0; kills=0; totalKills=0; gold=0; level=1; xp=0; xpNext=20; pendingLevels=0; retries=0; treePoints=0; treeUnlocked=new Set(['hub']);
  resetPlayer();
  enemies=[];pBullets=[];eBullets=[];pickups=[];particles=[];boss=null;floatBubbles=[];lastKiller=null;
  pendingNode=null; roomCleared=true; tierIntroShown=false; shopIntroShown=false; eliteViewerSpawns=0;
  tutorial={active:true,moved:false,shot:false,dodged:false,tabbed:false,doneAt:0};
  genMap();
  startTutorial();
}
function startTutorial(){
  tutorialMode=true; tutorialDoneFlag=false; state='play'; syncChrome(); hideAll();
  arenaResponsive=true; fitField();
  { const _sb=$('skipTutBtn'); if(_sb) _sb.style.display='inline-block'; }
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; boss=null;
  roomCleared=false; roomIsBoss=false; kills=0; bossBanner=0;
  player.x=W/2; player.y=H-90;
  tutorial={active:true,moved:false,shot:false,dodged:false,tabbed:false,doneAt:0};
  currentRow=0;
  for(let i=0;i<3;i++){ spawnEnemy('goblin_warrior', 250+i*180, 165, 0.5); const d=enemies[enemies.length-1]; d.hp=14; d.maxhp=14; d.spd*=0.35; d.dmg=0; d.label='연습 허수아비'; d.dummy=true; }
  banner("튜토리얼 · 1단계","WASD 이동 · 클릭 발사 · SPACE 베인Q",2400);
  updateHUD();
}
function finishTutorial(){
  tutorialMode=false; roomCleared=true;
  { const _sb=$('skipTutBtn'); if(_sb) _sb.style.display='none'; }
  if(tutorial) tutorial.active=false;
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[];
  banner("튜토리얼 완료!","이제 진짜 방송 시작",1600);
  setTimeout(function(){ showMap(); banner("1막 시작","지도에서 길을 골라라",1700); }, 1000);
}
// 다시시작 전용: 연출/튜토리얼 스킵 → 곧장 1막 지도
function newGameSkip(){
  startBGM();
  runActive=true;
  act=1; currentRow=0; kills=0; totalKills=0; gold=0; level=1; xp=0; xpNext=20; pendingLevels=0; retries=0; treePoints=0; treeUnlocked=new Set(['hub']);
  resetPlayer();
  enemies=[];pBullets=[];eBullets=[];pickups=[];particles=[];boss=null;floatBubbles=[];lastKiller=null;
  pendingNode=null; roomCleared=true; tierIntroShown=false; shopIntroShown=false; eliteViewerSpawns=0;
  tutorial={active:false,moved:true,shot:true,dodged:true,tabbed:true,doneAt:0};
  tutorialMode=false; tutorialDoneFlag=true;
  genMap();
  hideAll();
  { const _sb=$('skipTutBtn'); if(_sb) _sb.style.display='none'; }
  showMap();
  banner("1막 시작","지도에서 길을 골라라",1700);
}

// ---------- 버튼 ----------
function buildDiffButtons(){
  const cont=$('diffBtns'); if(!cont) return;
  cont.innerHTML='';
  Object.values(DIFFS).forEach(d=>{
    const b=document.createElement('button');
    b.className='diffbtn'; b.style.borderColor=d.col;
    b.innerHTML='<div class="diff-name" style="color:'+d.col+'">'+d.label+'</div><div class="diff-desc">'+d.desc+'</div>';
    b.onclick=()=>{ try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){} diffSet=d; stopIntroDrone(); startBGM(); bossTaunt(d, ()=>showStory(()=>newGame())); };
    cont.appendChild(b);
  });
}
buildDiffButtons();
// 스트리머 김봉식 아트 연결
(function initStreamerArt(){
  const set=(id,src)=>{ const el=$(id); if(el&&src) el.src=src; };
  set('startAvatar',BONGSIK_AVATAR); set('ovStoryAvatar',BONGSIK_AVATAR); set('ovStoryBcast',BROADCAST_SCREEN);
})();
function returnToTitleScreen(){
  introFxReset();
  paused=false; mouseDown=false; autoFire=false; runActive=false;
  roomIsBoss=false; roomIsMidboss=false; cutsceneT=0; bossEvolve=null;
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; boss=null; floatBubbles=[];
  const po=$('ovPause'); if(po) po.classList.add('hidden');
  hideAll();
  show('title');
  if(window.startTitleScene) window.startTitleScene();
  startBGM();
}
$('retryBtn').onclick=()=>{
  if(diffSet.maxRetries !== Infinity && retries >= diffSet.maxRetries){ banner('재도전 불가','횟수를 모두 소진했습니다',1400); return; }
  retryRoom();
};
$('restartBtn').onclick=()=>{
  introFxReset(); stopBGM(); hideAll();
  try{ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume(); }catch(e){}
  startBGM();
  // 연출·튜토리얼 스킵 — 보스 대사만 띄우고 곧장 시작
  bossTaunt(diffSet, ()=> newGameSkip());
};
{ const tb=$('titleBtn'); if(tb) tb.onclick=returnToTitleScreen; }
$('muteBtn').onclick=function(){ if(typeof openSettings==='function') openSettings(); };
// 구 soundPanel 컨트롤 - 패널이 DOM에 존재할 때만 배선 (설정창과 독립적으로 동작)
{ const sc=$('soundClose'); if(sc) sc.onclick=()=>{ const sp=$('soundPanel'); if(sp) sp.style.display='none'; }; }
{ const mc=$('muteChk'); if(mc) mc.onchange=function(){ muted=this.checked; }; }
{ const sr=$('sfxRange'); if(sr) sr.oninput=function(){ sfxVol=this.value/100; if(sfxVol>0&&muted){ muted=false; const mc=$('muteChk'); if(mc) mc.checked=false; } }; }
{ const br=$('bgmRange'); if(br) br.oninput=function(){ bgmVol=this.value/100; }; }
$('skipTutBtn').onclick=()=>{ if(tutorialMode) finishTutorial(); };
{ const _scb=$('skipCutBtn'); if(_scb) _scb.onclick=skipCutscene; }
$('tierIntroBtn').onclick=()=>{ showLevelUp(); };
$('helpBtn').onclick=()=>{ prevState=state; show('help'); };
$('invClose').onclick=closeInventory;
$('helpClose').onclick=()=>{ $('ovHelp').classList.add('hidden'); if(prevState&&prevState!=='help'){ if(overlays[prevState]&&prevState!=='play')show(prevState); else {hideAll();state=prevState;} } };

// ===== 타이틀(메인 메뉴) 픽셀 도트 배경 =====
(function titleScene(){
  const cv=$('titleCanvas'); if(!cv) return;
  const c=cv.getContext('2d');
  let W=0, H=112, GROUND=103, sceneKey='';
  const stars=[], clouds=[];
  function seedTitleScene(){
    const r=cv.getBoundingClientRect();
    const aspect=r.height?Math.max(.58,Math.min(2.05,r.width/r.height)):1.6;
    const nextH=112, nextW=Math.max(72,Math.round(nextH*aspect));
    const key=nextW+'x'+nextH;
    if(key===sceneKey) return;
    sceneKey=key; W=nextW; H=nextH; GROUND=H-9; cv.width=W; cv.height=H;
    stars.length=0;
    for(let i=0;i<72;i++) stars.push({x:(Math.random()*W)|0,y:(Math.random()*(GROUND-18))|0,ph:Math.random()*6.28,sp:.5+Math.random()*1.8,b:Math.random()<.14});
    clouds.length=0;
    clouds.push(
      {x:W*.12,y:24,s:0.92,v:2.0,sh:cloudShape(),col:'#344465'},
      {x:W*.72,y:41,s:0.76,v:1.35,sh:cloudShape(),col:'#2d3b59'},
      {x:W*.34,y:25,s:0.9,v:2.8,sh:cloudShape(),col:'#405276'}
    );
  }
  function cloudShape(){ return [{dx:0,dy:0,r:6},{dx:7,dy:1,r:8},{dx:16,dy:0,r:7},{dx:9,dy:-4,r:6},{dx:23,dy:2,r:5}]; }
  function blob(x,y,r,col){ c.fillStyle=col; c.beginPath(); c.arc(x,y,r,0,6.283); c.fill(); }
  function drawCloud(cl){
    for(const b of cl.sh) blob(cl.x+b.dx*cl.s, cl.y+b.dy*cl.s, b.r*cl.s, cl.col);
    for(const b of cl.sh) blob(cl.x+b.dx*cl.s, cl.y+b.dy*cl.s-1.5*cl.s, Math.max(1,(b.r-2)*cl.s), '#54678e');
  }
  function ruins(){
    c.fillStyle='#0d1322'; c.fillRect(0,GROUND,W,H-GROUND);
    c.fillStyle='#141c2f';
    for(const[px,th,tw] of [[.07,18,8],[.16,28,9],[.80,22,10],[.91,15,7],[.36,12,8]]) c.fillRect((W*px)|0,GROUND-th,tw,th);
    // 부서진 모니터
    c.fillStyle='#10172a'; c.fillRect(40,GROUND-14,18,14);
    const mx=(W*.25)|0;
    c.fillStyle='#10172a'; c.fillRect(mx,GROUND-14,18,14);
    c.fillStyle='#1b2740'; c.fillRect(mx+2,GROUND-12,14,9);
    c.fillStyle='#0c1120'; c.fillRect(mx+8,GROUND-12,1,9);
    // 서버 랙
    c.fillStyle='#141c2f'; c.fillRect(134,GROUND-18,12,18);
    const sx=(W*.71)|0;
    c.fillStyle='#141c2f'; c.fillRect(sx,GROUND-18,12,18);
    c.fillStyle='#263654'; for(let i=0;i<4;i++) c.fillRect(sx+2,GROUND-16+i*4,8,2);
  }
  function mascot(t){
    const bob=Math.sin(t*1.6)*1.2, cx=(W*.62)|0, cy=GROUND-12+bob;
    const g=c.createRadialGradient(cx,cy-4,2,cx,cy-4,26);
    g.addColorStop(0,'rgba(120,220,255,0.32)'); g.addColorStop(1,'rgba(120,220,255,0)');
    c.fillStyle=g; c.fillRect(cx-28,cy-32,56,46);
    c.strokeStyle='#ffe17a'; c.lineWidth=1.4;
    c.beginPath(); c.ellipse(cx,cy-13,7,2.4,0,0,6.283); c.stroke();
    blob(cx,cy,9,'#cdeffb'); c.fillRect(cx-9,cy,18,5);
    c.fillStyle='#a9def0'; c.beginPath(); c.arc(cx+2,cy,8,Math.PI*0.05,Math.PI*0.95); c.fill();
    blob(cx-3,cy-4,2,'#eafbff');
    c.fillStyle='#22304a'; c.fillRect(cx-4,cy-2,1.6,2.6); c.fillRect(cx+2.4,cy-2,1.6,2.6);
    c.fillStyle='rgba(255,120,170,0.5)'; c.fillRect(cx-6,cy+1,2,1.2); c.fillRect(cx+4,cy+1,2,1.2);
  }
  let raf=null,t0=performance.now();
  function draw(t){
    seedTitleScene();
    const sky=c.createLinearGradient(0,0,0,GROUND);
    sky.addColorStop(0,'#10162c'); sky.addColorStop(0.5,'#172244'); sky.addColorStop(1,'#22305a');
    c.fillStyle=sky; c.fillRect(0,0,W,GROUND);
    for(const s of stars){ const a=0.3+0.55*(0.5+0.5*Math.sin(t*s.sp+s.ph));
      c.fillStyle='rgba(220,235,255,'+a.toFixed(2)+')'; c.fillRect(s.x,s.y,s.b?2:1,s.b?2:1); }
    for(const cl of clouds){ cl.x+=cl.v*0.06; if(cl.x-40*cl.s>W) cl.x=-40*cl.s; drawCloud(cl); }
    ruins(); mascot(t);
  }
  function frame(now){ if($('ovTitle').classList.contains('hidden')){ raf=null; return; } draw((now-t0)/1000); raf=requestAnimationFrame(frame); }
  window.startTitleScene=function(){ if(!raf){ t0=performance.now(); raf=requestAnimationFrame(frame); } };
  startTitleScene();
})();

// ===== 타이틀 메뉴 버튼 =====
function openDifficultyTab(){
  hideAll();
  $('ovTitle').classList.remove('hidden');
  $('ovStart').classList.remove('hidden');
  state='start';
  syncChrome();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function closeDifficultyTab(){
  $('ovStart').classList.add('hidden');
  state='title';
  syncChrome();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
$('tmNew').onclick=openDifficultyTab;
// tmSettings는 wireSettings()에서 openSettings로 연결됨 (아래에서 재정의)
$('tmExit').onclick=()=>{ try{ window.close(); }catch(e){} };
$('diffBack').onclick=closeDifficultyTab;

// 초기 채팅 잡담 미리 깔기
chatSys("스트리머가 곧 들어옵니다...");
["오늘 깬다에 한표","왔다왔다","ㅋㅋ드디어","화력지원 갑니다 catJAM","발컨 기대중 KEKW","풀충 잊지마"]
  .forEach((m,i)=>setTimeout(()=>chatRandom(m),300+i*500));

buildBackdrop(1);
fitField();
syncChrome();
updateHUD();
initTreeEvents();
requestAnimationFrame(loop);

/* ============================================================
   환경 설정 시스템 (픽셀 설정창)
   ============================================================ */

// ===== JS: Settings persistence and accessibility options =====
const SET_DEFAULTS={ mute:false, sfx:100, bgm:100, shake:100, flashReduce:false, dmgNum:true, fps:false, fireToggle:true, autoPause:true };
const GS={ shake:1, flashScale:1, dmgNum:true, fps:false, fireToggle:false, autoPause:true };

function loadSettingsRaw(){
  try{ const r=localStorage.getItem('btv_settings'); if(r){ return Object.assign({},SET_DEFAULTS,JSON.parse(r)); } }catch(e){}
  return Object.assign({},SET_DEFAULTS);
}
function saveSettings(s){ try{ localStorage.setItem('btv_settings',JSON.stringify(s)); }catch(e){} }

let _SET=loadSettingsRaw();

function applySettings(){
  muted=_SET.mute;
  sfxVol=_SET.sfx/100;
  bgmVol=_SET.bgm/100;
  GS.shake=_SET.shake/100;
  GS.flashScale=_SET.flashReduce?0.28:1;
  GS.dmgNum=!!_SET.dmgNum;
  GS.fps=!!_SET.fps;
  GS.fireToggle=!!_SET.fireToggle;
  GS.autoPause=!!_SET.autoPause;
  if(!GS.fireToggle) autoFire=false;
  const oldMute=$('muteChk'); if(oldMute) oldMute.checked=muted;
}

function reflectControls(){
  const set=(id,prop,val)=>{ const el=$(id); if(el) el[prop]=val; };
  set('setMute','checked',_SET.mute);
  set('setSfx','value',_SET.sfx);   const sv=$('setSfxVal'); if(sv) sv.textContent=_SET.sfx;
  set('setBgm','value',_SET.bgm);   const bv=$('setBgmVal'); if(bv) bv.textContent=_SET.bgm;
  set('setShake','value',_SET.shake); const kv=$('setShakeVal'); if(kv) kv.textContent=_SET.shake;
  set('setFlash','checked',_SET.flashReduce);
  set('setDmg','checked',_SET.dmgNum);
  set('setFps','checked',_SET.fps);
  set('setFireToggle','checked',_SET.fireToggle);
  set('setAutoPause','checked',_SET.autoPause);
}

function commit(){ applySettings(); saveSettings(_SET); }

/* ----- 픽셀 밤하늘 헤더 ----- */
function drawSettingsSky(){
  const cv=$('setSkyCv'); if(!cv) return; const c=cv.getContext('2d'); const W=cv.width,H=cv.height;
  const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#2a1f4a'); g.addColorStop(1,'#181128');
  c.fillStyle=g; c.fillRect(0,0,W,H);
  // 별
  const stars=[[8,3],[19,7],[27,2],[36,9],[44,4],[55,8],[63,3],[72,6],[83,2],[91,9],[99,4],[105,8],[14,11],[49,11],[78,10],[59,2],[33,5],[88,6]];
  for(let i=0;i<stars.length;i++){ const s=stars[i]; const b=(i%4===0); c.fillStyle=b?'#ffffff':'#bcd6ff'; c.fillRect(s[0],s[1],1,1); if(b){ c.fillStyle='rgba(160,210,255,.5)'; c.fillRect(s[0]-1,s[1],1,1); c.fillRect(s[0]+1,s[1],1,1); c.fillRect(s[0],s[1]-1,1,1); c.fillRect(s[0],s[1]+1,1,1); } }
  // 달 + 후광
  const mx=95,my=4; c.fillStyle='rgba(255,240,180,.16)'; c.fillRect(mx-2,my-1,7,7);
  c.fillStyle='#f3e6a8'; c.fillRect(mx,my,3,3); c.fillRect(mx+1,my-1,1,1); c.fillRect(mx+1,my+3,1,1); c.fillRect(mx-1,my+1,1,1); c.fillRect(mx+3,my+1,1,1);
  // 픽셀 구름
  function cloud(x,y,col){ c.fillStyle=col; c.fillRect(x,y+2,12,2); c.fillRect(x+1,y+1,9,1); c.fillRect(x+3,y,5,1); c.fillRect(x+1,y+4,11,1); }
  cloud(6,7,'#3a4a72'); cloud(40,9,'#33425f');
  // 도시 실루엣
  c.fillStyle='#0e0a1a'; const sky=[[0,3],[5,2],[9,4],[16,3],[22,5],[30,2],[38,4],[48,3],[54,5],[62,2],[70,4],[80,3],[88,5],[96,2],[104,4]];
  for(const b of sky) c.fillRect(b[0],H-b[1],4,b[1]);
}

/* ----- FPS ----- */
let _fps=60;
function updFps(dt){ if(dt>0){ const inst=1/dt; _fps=_fps*0.9+inst*0.1; } }
function drawFpsOverlay(){
  if(!GS.fps) return;
  ctx.save(); ctx.font='bold 12px Courier New'; ctx.textAlign='right';
  const v=Math.round(_fps); ctx.fillStyle=v>=50?'#5dff9b':(v>=30?'#ffd34d':'#ff4d6d');
  ctx.shadowColor='#000'; ctx.shadowBlur=4; ctx.fillText('FPS '+v, W-10, 18);
  ctx.restore(); ctx.textAlign='left';
}

/* ----- 데미지 숫자 ----- */
let dmgNums=[];
function spawnDmgNum(x,y,amt,crit){
  if(amt<=0) return;
  if(dmgNums.length>60) dmgNums.shift();
  dmgNums.push({x:x+rand(-5,5),y:y,amt:amt,crit:crit,t:0,max:crit?0.75:0.6,vy:crit?-46:-38});
}
function updateDmgNums(dt){
  for(let i=dmgNums.length-1;i>=0;i--){ const d=dmgNums[i]; d.t+=dt; d.y+=d.vy*dt; d.vy*=0.90; if(d.t>=d.max) dmgNums.splice(i,1); }
}
function drawDmgNums(){
  if(!dmgNums.length) return;
  ctx.save(); ctx.textAlign='center'; ctx.lineWidth=3; ctx.strokeStyle='rgba(8,4,16,.85)';
  for(const d of dmgNums){
    const a=clamp(1-d.t/d.max,0,1);
    ctx.globalAlpha=a;
    ctx.font=(d.crit?'bold 18px':'bold 13px')+' Courier New';
    ctx.fillStyle=d.crit?'#ffd34d':'#ffffff';
    const txt=(d.crit?'⚡':'')+d.amt;
    ctx.strokeText(txt,d.x,d.y); ctx.fillText(txt,d.x,d.y);
  }
  ctx.globalAlpha=1; ctx.restore(); ctx.textAlign='left';
}

/* ----- 열기/닫기 ----- */
let _setPrevPaused=false;
function openSettings(){
  reflectControls(); drawSettingsSky();
  mouseDown=false; autoFire=false;
  _setPrevPaused=paused;
  if(state==='play' && !paused){ paused=true; }   // 설정 보는 동안 전투 정지(일시정지 오버레이는 안 띄움)
  const ov=$('ovSettings'); if(ov) ov.classList.remove('hidden');
}
function closeSettings(){
  const ov=$('ovSettings'); if(ov) ov.classList.add('hidden');
  if(state==='play' && !_setPrevPaused && paused){ paused=false; last=performance.now(); }
}

/* ----- 컨트롤 배선 ----- */
(function wireSettings(){
  const on=(id,ev,fn)=>{ const el=$(id); if(el) el.addEventListener(ev,fn); };
  on('setMute','change',function(){ _SET.mute=this.checked; commit(); });
  on('setSfx','input',function(){ _SET.sfx=+this.value; const v=$('setSfxVal'); if(v)v.textContent=this.value; if(_SET.sfx>0&&_SET.mute){ _SET.mute=false; const m=$('setMute'); if(m)m.checked=false; } commit(); });
  on('setBgm','input',function(){ _SET.bgm=+this.value; const v=$('setBgmVal'); if(v)v.textContent=this.value; commit(); });
  on('setShake','input',function(){ _SET.shake=+this.value; const v=$('setShakeVal'); if(v)v.textContent=this.value; commit(); });
  on('setFlash','change',function(){ _SET.flashReduce=this.checked; commit(); });
  on('setDmg','change',function(){ _SET.dmgNum=this.checked; commit(); });
  on('setFps','change',function(){ _SET.fps=this.checked; commit(); });
  on('setFireToggle','change',function(){ _SET.fireToggle=this.checked; if(!this.checked) autoFire=false; commit(); });
  on('setAutoPause','change',function(){ _SET.autoPause=this.checked; commit(); });
  on('setClose','click',closeSettings);
  on('setDone','click',closeSettings);
  on('setReset','click',()=>{ _SET=Object.assign({},SET_DEFAULTS); reflectControls(); commit(); });
  const ov=$('ovSettings'); if(ov) ov.addEventListener('click',e=>{ if(e.target===ov) closeSettings(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const o=$('ovSettings'); if(o&&!o.classList.contains('hidden')){ e.stopPropagation(); closeSettings(); } } }, true);

  // SETTINGS / 소리 버튼들을 새 설정창으로 연결
  const tm=$('tmSettings'); if(tm) tm.onclick=openSettings;
  const mb=$('muteBtn'); if(mb) mb.onclick=openSettings;
  const ps=$('pauseSoundBtn'); if(ps) ps.onclick=openSettings;
})();

/* ----- 탭 이탈 자동 일시정지 ----- */
function autoPauseCheck(){
  if(GS.autoPause && state==='play' && !paused && document.hidden){ if(typeof togglePause==='function') togglePause(); }
}
document.addEventListener('visibilitychange',autoPauseCheck);
window.addEventListener('blur',()=>{ if(GS.autoPause && state==='play' && !paused){ if(typeof togglePause==='function') togglePause(); } });

// 시작 시 저장된 설정 적용
applySettings(); reflectControls();

// ============================================================
// 📡 방송국 패시브 트리
// ============================================================
let treePoints = 0;   // 레벨업마다 +1 적립
let treeOpen   = false;

// ---------- 트리 노드 데이터 ----------
// branch: 'shot'|'status'|'gold'|'survive'|'speed'
// req: 선행 노드 id 배열 (비어있으면 시작노드)
// cost: 포인트 비용 (기본 1)
// once: true면 중복 찍기 불가 (기본 true)
// apply(p): 플레이어에 즉시 적용
const TREE_NODES = [
  // ── 중앙 허브 (무료, 항상 해금) ──
  { id:'hub', name:'방송 시작', icon:'📡', branch:'hub', req:[], cost:0,
    desc:'모든 갈래의 시작점', apply:()=>{} },

  // ══════════════════════════════════
  // 🔱 화력 라인 — "다중 사격"
  // ══════════════════════════════════
  { id:'s_speed1', name:'탄속 강화 I', icon:'⚡', branch:'shot', req:['hub'], cost:1,
    desc:'투사체 속도 +15%', apply:p=>{ p.bulletSpeedMul*=1.15; } },
  { id:'s_size1',  name:'대구경 I',    icon:'🔵', branch:'shot', req:['hub'], cost:1,
    desc:'투사체 크기 +12%', apply:p=>{ p.bulletSize*=1.12; } },
  { id:'s_speed2', name:'탄속 강화 II',icon:'⚡', branch:'shot', req:['s_speed1'], cost:1,
    desc:'투사체 속도 추가 +15%', apply:p=>{ p.bulletSpeedMul*=1.15; } },
  { id:'s_size2',  name:'대구경 II',   icon:'🔵', branch:'shot', req:['s_size1'], cost:1,
    desc:'투사체 크기 추가 +12%', apply:p=>{ p.bulletSize*=1.12; } },
  { id:'s_spread', name:'집탄 조정',   icon:'🎯', branch:'shot', req:['s_speed1','s_size1'], cost:1,
    desc:'다발 사격 시 탄 퍼짐 -30%', apply:p=>{ p._spreadMul=(p._spreadMul||1)*0.7; } },
  { id:'s_shots1', name:'다중 사격 I', icon:'🔱', branch:'shot', req:['s_spread'], cost:2,
    desc:'투사체 +1발', apply:p=>{ p.shots+=1; } },
  { id:'s_back',   name:'후방 사격',   icon:'🔙', branch:'shot', req:['s_shots1'], cost:1,
    desc:'뒤로도 한 발 발사', once:true, skip:p=>p.backShot,
    apply:p=>{ p.backShot=true; } },
  { id:'s_shots2', name:'다중 사격 II',icon:'🔱', branch:'shot', req:['s_shots1','s_size2'], cost:3,
    desc:'투사체 추가 +1발', apply:p=>{ p.shots+=1; } },

  // ══════════════════════════════════
  // 🔥 상태이상 라인 — "도배 방송"
  // ══════════════════════════════════
  { id:'t_burn1',   name:'화상 코팅 I',  icon:'🔥', branch:'status', req:['hub'], cost:1,
    desc:'명중 시 화상 +3 (지속 피해)', apply:p=>{ p.burn+=3; } },
  { id:'t_poison1', name:'독침 I',        icon:'🟢', branch:'status', req:['hub'], cost:1,
    desc:'명중 시 독 +2 (중첩)', apply:p=>{ p.poison+=2; } },
  { id:'t_burn2',   name:'화상 코팅 II', icon:'🔥', branch:'status', req:['t_burn1'], cost:1,
    desc:'화상 추가 +3', apply:p=>{ p.burn+=3; } },
  { id:'t_poison2', name:'독침 II',       icon:'🟢', branch:'status', req:['t_poison1'], cost:1,
    desc:'독 추가 +2', apply:p=>{ p.poison+=2; } },
  { id:'t_chill',   name:'빙결탄',        icon:'❄️', branch:'status', req:['t_poison1'], cost:1,
    desc:'명중 시 적 이동속도 둔화', once:true, skip:p=>p.chill>0,
    apply:p=>{ p.chill+=1; } },
  { id:'t_dmg',     name:'상태이상 강화', icon:'🧨', branch:'status', req:['t_burn2','t_poison2'], cost:2,
    desc:'상태이상 걸린 적에게 피해 +20%', apply:p=>{ p.statusDmgMul+=0.20; } },
  { id:'t_stun',    name:'기절 코팅',     icon:'🔔', branch:'status', req:['t_chill','t_dmg'], cost:2,
    desc:'명중 시 기절 확률 +15%', apply:p=>{ p.stunChance+=0.15; } },
  { id:'t_spread',  name:'도배왕',        icon:'🌋', branch:'status', req:['t_stun'], cost:3,
    desc:'상태이상 적 처치 시 주변 전파 + 피해 추가 +20%', once:true, skip:p=>p.statusSpread,
    apply:p=>{ p.statusSpread=true; p.statusDmgMul+=0.20; } },

  // ══════════════════════════════════
  // 💰 골드 라인 — "슈퍼챗 부자"
  // ══════════════════════════════════
  { id:'g_gold1', name:'골드 수집 I',  icon:'💰', branch:'gold', req:['hub'], cost:1,
    desc:'골드 획득 +12%', apply:p=>{ p.goldMul*=1.12; } },
  { id:'g_xp1',   name:'경험치 가속 I',icon:'📈', branch:'gold', req:['hub'], cost:1,
    desc:'경험치 획득 +12%', apply:p=>{ p.xpMul*=1.12; } },
  { id:'g_gold2', name:'골드 수집 II', icon:'💰', branch:'gold', req:['g_gold1'], cost:1,
    desc:'골드 획득 추가 +12%', apply:p=>{ p.goldMul*=1.12; } },
  { id:'g_xp2',   name:'경험치 가속 II',icon:'📈',branch:'gold', req:['g_xp1'], cost:1,
    desc:'경험치 획득 추가 +12%', apply:p=>{ p.xpMul*=1.12; } },
  { id:'g_donate',name:'도네 알림 강화',icon:'💸', branch:'gold', req:['g_gold1'], cost:1,
    desc:'처치 시 골드 폭탄 확률 +8%', apply:p=>{ p.donateChance+=0.08; } },
  { id:'g_power', name:'현질의 힘',    icon:'💳', branch:'gold', req:['g_gold2','g_xp2'], cost:2,
    desc:'보유 골드 100당 공격력 +2% (최대+30%)', apply:p=>{ p.goldPower+=0.02; } },
  { id:'g_magnet',name:'초강력 자석',  icon:'🧲', branch:'gold', req:['g_donate','g_power'], cost:2,
    desc:'흡수 범위 2배 + 골드 +20%', apply:p=>{ p.magnet*=2; p.goldMul*=1.2; } },
  { id:'g_jackpot',name:'대박 도네',   icon:'🎰', branch:'gold', req:['g_magnet'], cost:3,
    desc:'골드 폭탄 확률 2배 + 레벨업 시 체력 +8 회복', once:true,
    apply:p=>{ p.donateChance*=2; p._levelHeal=(p._levelHeal||0)+8; } },

  // ══════════════════════════════════
  // 🛡️ 생존 라인 — "불사 스트리머"
  // ══════════════════════════════════
  { id:'v_hp1',   name:'체력 강화 I',  icon:'❤️', branch:'survive', req:['hub'], cost:1,
    desc:'최대 체력 +20', apply:p=>{ p.maxhp+=20; p.hp+=20; } },
  { id:'v_armor1',name:'방어 강화 I',  icon:'🛡️', branch:'survive', req:['hub'], cost:1,
    desc:'받는 피해 -5%', apply:p=>{ p.armor+=0.05; } },
  { id:'v_hp2',   name:'체력 강화 II', icon:'❤️', branch:'survive', req:['v_hp1'], cost:1,
    desc:'최대 체력 추가 +20', apply:p=>{ p.maxhp+=20; p.hp+=20; } },
  { id:'v_armor2',name:'방어 강화 II', icon:'🛡️', branch:'survive', req:['v_armor1'], cost:1,
    desc:'받는 피해 추가 -5%', apply:p=>{ p.armor+=0.05; } },
  { id:'v_regen', name:'재생 I',       icon:'🌿', branch:'survive', req:['v_hp1'], cost:1,
    desc:'초당 체력 +0.8 재생', apply:p=>{ p.regen+=0.8; } },
  { id:'v_steal', name:'흡혈 코팅',    icon:'🩸', branch:'survive', req:['v_regen','v_armor2'], cost:2,
    desc:'흡혈 확률 +8%', apply:p=>{ p.lifesteal+=0.08; } },
  { id:'v_thorns',name:'가시 갑옷',    icon:'🌵', branch:'survive', req:['v_armor2'], cost:2,
    desc:'접촉 적에게 반사 피해 +12', apply:p=>{ p.thorns+=12; } },
  { id:'v_undead',name:'불사 스트리머',icon:'💀', branch:'survive', req:['v_steal','v_thorns'], cost:3,
    desc:'1회 체력1로 버티기', once:true, skip:p=>p.lastStand,
    apply:p=>{ p.lastStand=true; } },

  // ══════════════════════════════════
  // ⚡ 기동 라인 — "신나는 방송"
  // ══════════════════════════════════
  { id:'m_spd1',  name:'민첩 강화 I',  icon:'🥾', branch:'speed', req:['hub'], cost:1,
    desc:'이동 속도 +15', apply:p=>{ p.spd+=15; } },
  { id:'m_fire1', name:'연사 강화 I',  icon:'🔫', branch:'speed', req:['hub'], cost:1,
    desc:'발사 속도 +10%', apply:p=>{ p.fireAdd+=0.10; } },
  { id:'m_spd2',  name:'민첩 강화 II', icon:'🥾', branch:'speed', req:['m_spd1'], cost:1,
    desc:'이동 속도 추가 +15', apply:p=>{ p.spd+=15; } },
  { id:'m_fire2', name:'연사 강화 II', icon:'🔫', branch:'speed', req:['m_fire1'], cost:1,
    desc:'발사 속도 추가 +10%', apply:p=>{ p.fireAdd+=0.10; } },
  { id:'m_dodge', name:'회피 숙련',    icon:'🌀', branch:'speed', req:['m_spd1'], cost:1,
    desc:'베인Q 쿨다운 -20%', apply:p=>{ p.dodgeCdMul*=0.80; } },
  { id:'m_dtap',  name:'더블탭',       icon:'🎯', branch:'speed', req:['m_fire2','m_dodge'], cost:2,
    desc:'25% 확률로 즉시 1발 추가', apply:p=>{ p.doubleTap+=0.25; } },
  { id:'m_charge2',name:'회피 2충전',  icon:'🔵', branch:'speed', req:['m_dodge'], cost:2,
    desc:'베인Q 2회 충전', once:true, skip:p=>p.dodgeMaxCharges>=2,
    apply:p=>{ p.dodgeMaxCharges=2; p.dodgeCharges=2; } },
  { id:'m_blitz', name:'질풍 방송',    icon:'⚡', branch:'speed', req:['m_dtap','m_charge2'], cost:3,
    desc:'회피 후 2초간 발사속도 +30% + 회피 폭발', once:true,
    apply:p=>{ p.dodgeHaste=true; p.dodgeBlast+=14; } },
];

// 찍힌 노드 id Set
let treeUnlocked = new Set(['hub']);

// ---------- 트리 조건 체크 ----------
function treeCanUnlock(node){
  if(treeUnlocked.has(node.id)) return false;
  if(node.skip && node.skip(player)) return false;
  if(node.req.length > 0 && !node.req.every(r => treeUnlocked.has(r))) return false;
  if(treePoints < (node.cost||1)) return false;
  return true;
}
function treeUnlockNode(node){
  if(!treeCanUnlock(node)) return false;
  treeUnlocked.add(node.id);
  treePoints -= (node.cost||1);
  node.apply(player);
  updateHUD();
  return true;
}

// ---------- 트리 레이아웃 (캔버스 좌표) ----------
// 각 노드의 화면 위치를 미리 계산
function getTreeLayout(W, H){
  // 허브를 화면 중앙보다 살짝 위에
  const cx = W/2, cy = H * 0.48;

  const BRANCH_ANGLES = {
    speed:    -Math.PI/2,
    shot:     -Math.PI/2 - Math.PI*0.38,
    survive:  -Math.PI/2 + Math.PI*0.38,
    status:   -Math.PI/2 - Math.PI*0.76,
    gold:     -Math.PI/2 + Math.PI*0.76,
  };

  // 화면 크기에 비례한 절대 픽셀 간격
  const BASE = Math.min(W, H) * 0.09;   // 허브~1단계
  const GAP  = Math.min(W, H) * 0.085;  // 단계 간격

  // depth → 거리(px)
  function dist(d){ return BASE + GAP*(d-1); }

  // [깊이, 좌우오프셋(라디안)]
  const NODE_POS = {
    m_spd1:   [1,-0.22], m_fire1:  [1, 0.22],
    m_spd2:   [2,-0.22], m_fire2:  [2, 0.22],
    m_dodge:  [3, 0],
    m_dtap:   [4,-0.22], m_charge2:[4, 0.22],
    m_blitz:  [5, 0],

    s_speed1: [1,-0.20], s_size1:  [1, 0.20],
    s_speed2: [2,-0.20], s_size2:  [2, 0.20],
    s_spread: [3, 0],
    s_shots1: [4,-0.20], s_back:   [4, 0.20],
    s_shots2: [5, 0],

    v_hp1:    [1,-0.20], v_armor1: [1, 0.20],
    v_hp2:    [2,-0.20], v_armor2: [2, 0.20],
    v_regen:  [3,-0.20],
    v_steal:  [4,-0.20], v_thorns: [4, 0.20],
    v_undead: [5, 0],

    t_burn1:  [1,-0.20], t_poison1:[1, 0.20],
    t_burn2:  [2,-0.20], t_poison2:[2, 0.20],
    t_chill:  [3, 0.20], t_dmg:    [3,-0.20],
    t_stun:   [4, 0],
    t_spread: [5, 0],

    g_gold1:  [1,-0.20], g_xp1:    [1, 0.20],
    g_gold2:  [2,-0.20], g_xp2:    [2, 0.20],
    g_donate: [3, 0.20], g_power:  [3,-0.20],
    g_magnet: [4, 0],
    g_jackpot:[5, 0],
  };

  const NODE_BRANCH = {};
  TREE_NODES.forEach(n=>{ if(n.branch!=='hub') NODE_BRANCH[n.id]=n.branch; });

  const pos = { hub:{x:cx, y:cy} };

  for(const [id, [depth, off]] of Object.entries(NODE_POS)){
    const branch = NODE_BRANCH[id];
    if(!branch) continue;
    const angle = BRANCH_ANGLES[branch] + off;
    const d     = dist(depth);
    pos[id] = {
      x: cx + Math.cos(angle) * d,
      y: cy + Math.sin(angle) * d,
    };
  }
  return pos;
}

// ---------- 트리 오버레이 렌더링 ----------
const BRANCH_COL = {
  hub:     '#38e8ff',
  shot:    '#ff9f43',
  status:  '#5dff9b',
  gold:    '#ffd34d',
  survive: '#ff6b9d',
  speed:   '#c98bff',
};
const BRANCH_LABEL = {
  shot:'🔱 다중 사격', status:'🔥 도배 방송',
  gold:'💰 슈퍼챗', survive:'🛡️ 불사', speed:'⚡ 질풍',
};

let _treeLayout = null;
let _treeHover  = null;   // 현재 마우스 호버 노드 id
let _treeCanvas = null;
let _treeCtx    = null;

function openTree(){
  if(state!=='play' && state!=='map') return;
  treeOpen = true;
  $('ovTree').classList.remove('hidden');
  if(state==='play' && !paused){ paused=true; mouseDown=false; autoFire=false; }
  // display 전환이 브라우저에 반영된 뒤 렌더 (한 프레임 대기)
  requestAnimationFrame(()=>requestAnimationFrame(renderTree));
}
function closeTree(){
  treeOpen = false;
  $('ovTree').classList.add('hidden');
  if(state==='play' && paused){ paused=false; last=performance.now(); }
}

function renderTree(){
  const cvs = $('treeCanvas');
  if(!cvs) return;
  // 렌더 직전 실제 레이아웃 크기로 세팅
  const _rect = cvs.getBoundingClientRect();
  const W = cvs.width  = Math.round(_rect.width)  || window.innerWidth  || 1280;
  const H = cvs.height = Math.round(_rect.height) || window.innerHeight || 720;
  const c = cvs.getContext('2d');
  _treeCanvas = cvs; _treeCtx = c;

  // 배경
  c.fillStyle = '#05030a';
  c.fillRect(0,0,W,H);

  // 픽셀 격자 느낌 (8px 도트)
  c.strokeStyle = 'rgba(56,232,255,0.03)';
  c.lineWidth = 1;
  for(let x=0;x<W;x+=8){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
  for(let y=0;y<H;y+=8){ c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }

  _treeLayout = getTreeLayout(W, H);
  const pos = _treeLayout;

  // ── 엣지(선) 그리기 ──
  for(const node of TREE_NODES){
    if(!pos[node.id]) continue;
    for(const reqId of node.req){
      if(!pos[reqId]) continue;
      const unlocked = treeUnlocked.has(node.id) && treeUnlocked.has(reqId);
      const available = treeUnlocked.has(reqId) && !treeUnlocked.has(node.id);
      c.save();
      c.strokeStyle = unlocked ? BRANCH_COL[node.branch]
                    : available ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.08)';
      c.lineWidth = unlocked ? 2 : 1;
      if(!unlocked) c.setLineDash([4,4]);
      c.shadowColor = unlocked ? BRANCH_COL[node.branch] : 'none';
      c.shadowBlur  = unlocked ? 8 : 0;
      c.beginPath();
      c.moveTo(pos[reqId].x, pos[reqId].y);
      c.lineTo(pos[node.id].x, pos[node.id].y);
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }
  }

  // ── 노드 그리기 ──
  const R = Math.min(W,H)*0.036;  // 노드 반지름
  for(const node of TREE_NODES){
    const p = pos[node.id]; if(!p) continue;
    const unlocked  = treeUnlocked.has(node.id);
    const canUnlock = treeCanUnlock(node);
    const hover     = _treeHover === node.id;
    const col       = BRANCH_COL[node.branch] || '#fff';

    c.save();

    // 글로우
    if(unlocked || hover){
      c.shadowColor = col;
      c.shadowBlur  = hover ? 24 : 16;
    }

    // 노드 배경 (픽셀 느낌: 정사각형 + 둥근 모서리 없이)
    const nr = R * (hover ? 1.15 : 1);
    if(unlocked){
      c.fillStyle = col;
    } else if(canUnlock){
      c.fillStyle = '#1a1030';
      c.strokeStyle = col;
      c.lineWidth = 2;
    } else {
      c.fillStyle = '#0d0820';
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.lineWidth = 1;
    }

    // 픽셀아트 스타일 8각형 (정팔각형 근사)
    c.beginPath();
    const sides = 8;
    for(let i=0;i<sides;i++){
      const a = (i/sides)*Math.PI*2 - Math.PI/8;
      i===0 ? c.moveTo(p.x+Math.cos(a)*nr, p.y+Math.sin(a)*nr)
             : c.lineTo(p.x+Math.cos(a)*nr, p.y+Math.sin(a)*nr);
    }
    c.closePath();
    c.fill();
    if(!unlocked) c.stroke();
    c.restore();

    // 비용 뱃지 (미해금 노드에만)
    if(!unlocked && (node.cost||1) > 1){
      c.save();
      c.font = `bold ${Math.round(R*0.55)}px "Courier New"`;
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillStyle = canUnlock ? '#ffd34d' : '#555';
      c.fillText((node.cost||1)+'P', p.x+nr*0.9, p.y-nr*0.9);
      c.restore();
    }

    // 아이콘 (이모지)
    c.save();
    c.font = `${Math.round(R*0.9)}px sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = unlocked ? 1 : canUnlock ? 0.8 : 0.3;
    c.fillText(node.icon, p.x, p.y + R*0.05);
    c.restore();

    // 노드 이름
    if(hover || unlocked){
      c.save();
      c.font = `bold ${Math.round(R*0.55)}px "Courier New"`;
      c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = unlocked ? col : '#ccc';
      c.shadowColor = col; c.shadowBlur = 6;
      c.fillText(node.name, p.x, p.y + nr + 2);
      c.restore();
    }
  }

  // ── 우상단 포인트 표시 ──
  c.save();
  c.font = 'bold 15px "Courier New"';
  c.textAlign = 'right'; c.textBaseline = 'top';
  c.fillStyle = '#38e8ff';
  c.shadowColor = '#38e8ff'; c.shadowBlur = 10;
  c.fillText(`SKILL POINTS : ${treePoints}`, W-16, 16);
  c.restore();

  // ── 브랜치 레이블 ──
  const branchFirst = {};
  for(const node of TREE_NODES){
    if(node.branch==='hub' || branchFirst[node.branch]) continue;
    if(node.req.includes('hub') && pos[node.id]){
      branchFirst[node.branch] = pos[node.id];
    }
  }
  for(const [branch, bpos] of Object.entries(branchFirst)){
    if(!bpos) continue;
    const col = BRANCH_COL[branch];
    const lbl = BRANCH_LABEL[branch];
    const cx2 = pos.hub.x, cy2 = pos.hub.y;
    const mid = { x:(bpos.x+cx2)/2, y:(bpos.y+cy2)/2-18 };
    c.save();
    c.font = 'bold 11px "Courier New"';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col; c.globalAlpha = 0.7;
    c.shadowColor = col; c.shadowBlur = 6;
    c.fillText(lbl, mid.x, mid.y);
    c.restore();
  }

  // 툴팁은 HTML div로 처리 (renderTreeTooltip 별도 호출)
}

// ---------- 트리 마우스 이벤트 ----------
function treeNodeAt(mx, my, W, H){
  if(!_treeLayout) return null;
  const R = Math.min(W,H)*0.036 * 1.2;
  for(const node of TREE_NODES){
    const p = _treeLayout[node.id];
    if(!p) continue;
    if(Math.hypot(mx-p.x, my-p.y) < R) return node;
  }
  return null;
}
function updateTreeTooltip(node, cx, cy){
  const tt = $('treeTooltip');
  if(!tt) return;
  if(!node){ tt.style.display='none'; return; }

  const col = BRANCH_COL[node.branch] || '#38e8ff';
  const unlocked  = treeUnlocked.has(node.id);
  const canUnlock = treeCanUnlock(node);

  $('ttName').textContent  = node.icon + ' ' + node.name;
  $('ttName').style.color  = col;
  $('ttDesc').textContent  = node.desc;
  tt.style.borderColor     = col;
  tt.style.boxShadow       = '0 0 18px ' + col + '55';

  const stEl = $('ttState');
  if(unlocked){
    stEl.textContent = '✓ 획득 완료';
    stEl.style.color = '#5dff9b';
  } else if(canUnlock){
    stEl.textContent = '[' + (node.cost||1) + 'P] 클릭하여 획득';
    stEl.style.color = '#ffd34d';
  } else {
    const missing = (node.req||[]).filter(r=>!treeUnlocked.has(r));
    stEl.textContent = missing.length ? '선행 노드 필요' : '포인트 부족 (' + (node.cost||1) + 'P)';
    stEl.style.color = '#666';
  }

  // 화면 경계 벗어나지 않게 위치 조정
  const W = window.innerWidth, H = window.innerHeight;
  const ttW = 260, ttH = 110;
  let tx = cx + 16, ty = cy + 16;
  if(tx + ttW > W - 8) tx = cx - ttW - 8;
  if(ty + ttH > H - 8) ty = cy - ttH - 8;
  tt.style.left    = tx + 'px';
  tt.style.top     = ty + 'px';
  tt.style.display = 'block';
}

function initTreeEvents(){
  const cvs = $('treeCanvas');
  if(!cvs) return;
  cvs.addEventListener('mousemove', e=>{
    if(!treeOpen) return;
    const r  = cvs.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (cvs.width  / r.width);
    const my = (e.clientY - r.top)  * (cvs.height / r.height);
    const node = treeNodeAt(mx, my, cvs.width, cvs.height);
    const newHover = node ? node.id : null;
    if(newHover !== _treeHover){ _treeHover = newHover; renderTree(); }
    updateTreeTooltip(node, e.clientX, e.clientY);
  });
  cvs.addEventListener('mouseleave', ()=>{ updateTreeTooltip(null,0,0); });
  cvs.addEventListener('click', e=>{
    if(!treeOpen) return;
    const r  = cvs.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (cvs.width  / r.width);
    const my = (e.clientY - r.top)  * (cvs.height / r.height);
    const node = treeNodeAt(mx, my, cvs.width, cvs.height);
    if(node && treeUnlockNode(node)){
      banner(node.icon+' '+node.name, '트리 노드 획득!', 1100);
      renderTree();
    }
  });
}

// ---------- POE-style passive tree overlay v2 ----------
const TREE_BRANCH_COL = {
  hub: '#e8d8a4',
  shot: '#d79b4b',
  status: '#74b879',
  gold: '#d7b657',
  survive: '#b56a86',
  speed: '#8fb7d9',
};
const TREE_BRANCH_LABEL = {
  shot: 'PROJECTILES',
  status: 'STATUS',
  gold: 'FORTUNE',
  survive: 'SURVIVAL',
  speed: 'MOTION',
  hub: 'ORIGIN',
};
const TREE_BRANCH_ANGLE = {
  speed: -Math.PI / 2,
  shot: -Math.PI / 2 - Math.PI * 0.43,
  survive: -Math.PI / 2 + Math.PI * 0.43,
  status: -Math.PI / 2 - Math.PI * 0.84,
  gold: -Math.PI / 2 + Math.PI * 0.84,
};
const TREE_NODE_POS2 = {
  m_spd1:[1,-0.25], m_fire1:[1,0.25], m_spd2:[2,-0.22], m_fire2:[2,0.22],
  m_dodge:[3,0], m_dtap:[4,-0.25], m_charge2:[4,0.25], m_blitz:[5,0],
  s_speed1:[1,-0.22], s_size1:[1,0.22], s_speed2:[2,-0.22], s_size2:[2,0.22],
  s_spread:[3,0], s_shots1:[4,-0.24], s_back:[4,0.24], s_shots2:[5,0],
  v_hp1:[1,-0.22], v_armor1:[1,0.22], v_hp2:[2,-0.22], v_armor2:[2,0.22],
  v_regen:[3,-0.22], v_steal:[4,-0.24], v_thorns:[4,0.24], v_undead:[5,0],
  t_burn1:[1,-0.22], t_poison1:[1,0.22], t_burn2:[2,-0.22], t_poison2:[2,0.22],
  t_chill:[3,0.22], t_dmg:[3,-0.22], t_stun:[4,0], t_spread:[5,0],
  g_gold1:[1,-0.22], g_xp1:[1,0.22], g_gold2:[2,-0.22], g_xp2:[2,0.22],
  g_donate:[3,0.22], g_power:[3,-0.22], g_magnet:[4,0], g_jackpot:[5,0],
};

let treeAtlasSelected = 'hub';
let treeAtlasPan = {x:0, y:0};
let treeAtlasZoom = 1.08;
let treeAtlasDrag = null;
let treeAtlasMoved = false;
let treeEventsReady = false;

function treeNodeById(id){ return TREE_NODES.find(n=>n.id===id) || TREE_NODES[0]; }
function treeCanReach(node){ return !treeUnlocked.has(node.id) && (node.req||[]).every(r=>treeUnlocked.has(r)); }
function treeStatusText(node){
  if(treeUnlocked.has(node.id)) return 'Acquired';
  if(treeCanUnlock(node)) return 'Ready to allocate';
  if(!treeCanReach(node)) return 'Requires linked passive';
  return 'Need ' + (node.cost||1) + ' skill point' + ((node.cost||1)>1?'s':'');
}
function treeToScreen2(x,y,W,H){
  return {x:W*0.45 + treeAtlasPan.x + x*treeAtlasZoom, y:H*0.55 + treeAtlasPan.y + y*treeAtlasZoom};
}
function screenToTree2(x,y,W,H){
  return {x:(x - W*0.45 - treeAtlasPan.x)/treeAtlasZoom, y:(y - H*0.55 - treeAtlasPan.y)/treeAtlasZoom};
}
function getTreeLayout(W,H){
  const branchOf = {};
  TREE_NODES.forEach(n=>{ if(n.branch!=='hub') branchOf[n.id]=n.branch; });
  const pos = {hub:{x:0,y:0}};
  for(const id in TREE_NODE_POS2){
    const branch = branchOf[id]; if(!branch) continue;
    const depth = TREE_NODE_POS2[id][0], off = TREE_NODE_POS2[id][1];
    const angle = TREE_BRANCH_ANGLE[branch] + off;
    const d = 132 + (depth-1)*120;
    pos[id] = {x:Math.cos(angle)*d, y:Math.sin(angle)*d};
  }
  return pos;
}
const TREE_PIXEL_PATTERNS = {
  hub:{p:['...111...','..12221..','.1222221.','.12.2.21.','.1222221.','..12221..','...111...','....1....','...111...'],c:{1:'#38e8ff',2:'#f4fcff'}},
  bolt:{p:['....1....','...11....','..121....','..12211..','.122222.','....21...','...21....','..21.....','..1......'],c:{1:'#fff4a3',2:'#ffb83d'}},
  orb:{p:['..11111..','.1222221.','122222221','1222.2221','122222221','.1222221.','..11111..','...111...','....1....'],c:{1:'#8be8ff',2:'#315fff'}},
  target:{p:['..11111..','.12...21.','12.111.21','1.12.21.1','1.1.2.1.1','1.12.21.1','12.111.21','.12...21.','..11111..'],c:{1:'#ffec99',2:'#ff4d6d'}},
  split:{p:['....1....','...121...','..12221..','....1....','..1.1.1..','.11.1.11.','1...1...1','....1....','....1....'],c:{1:'#d7b657',2:'#fff0b8'}},
  back:{p:['..1...1..','.11..12..','111.1222.','.11..12..','..1...1..','.........','222222222','.........','..11111..'],c:{1:'#d79b4b',2:'#8fb7d9'}},
  fire:{p:['....1....','...121...','..1221...','..12221..','.122221.','.122222.','..3333...','..3333...','.........'],c:{1:'#ffd36b',2:'#ff7a2f',3:'#b52a2a'}},
  poison:{p:['.........','..22222..','.211112.','21111112','21111112','.211112.','..22222..','....2....','...222...'],c:{1:'#5dff9b',2:'#1e8d59'}},
  frost:{p:['....1....','1...1...1','.1..1..1.','..1.1.1..','111121111','..1.1.1..','.1..1..1.','1...1...1','....1....'],c:{1:'#bff8ff',2:'#4aa8ff'}},
  bomb:{p:['....1....','...112...','..111....','..2222...','.233332..','.233332..','.233332..','..2222...','.........'],c:{1:'#ffd36b',2:'#4b4a54',3:'#11131a'}},
  bell:{p:['...111...','..12221..','..12221..','.122221.','.122221.','122222221','..11111..','...222...','....2....'],c:{1:'#fff0a8',2:'#d79b4b'}},
  wave:{p:['...22....','..2222...','.221122..','22111122','21122112','21222212','.211112.','..2222...','.........'],c:{1:'#ff6b4a',2:'#74b879'}},
  coin:{p:['..11111..','.1222221.','122121221','122222221','122212221','122222221','.1222221.','..11111..','.........'],c:{1:'#fff0a8',2:'#d7b657'}},
  chart:{p:['.........','..1....2.','..11...2.','..111..2.','..1211.2.','..122112.','222222222','.........','.........'],c:{1:'#89e0a1',2:'#d7b657'}},
  donate:{p:['...111...','..12221..','.1222221.','...121...','..1222...','.122221.','122222221','..11111..','.........'],c:{1:'#ffd34d',2:'#ff8a4a'}},
  card:{p:['.1111111.','122222221','122111221','122222221','122111221','122222221','122222221','.1111111.','.........'],c:{1:'#f3d98b',2:'#5f8cff'}},
  magnet:{p:['.11...11.','122...221','122...221','122...221','122...221','122222221','.1222221.','..11111..','.........'],c:{1:'#d7b657',2:'#ff6b9d'}},
  slot:{p:['111111111','122121221','122222221','111111111','122222221','121212121','122222221','111111111','.........'],c:{1:'#d7b657',2:'#11131a'}},
  heart:{p:['.11...11.','1221.1221','122222221','122222221','.1222221.','..12221..','...121...','....1....','.........'],c:{1:'#ff9bb8',2:'#ff4d6d'}},
  shield:{p:['..11111..','.1222221.','122222221','122222221','.1222221.','..12221..','...121...','....1....','.........'],c:{1:'#bff8ff',2:'#4f84d9'}},
  leaf:{p:['....11...','...1221..','..122221.','.1222221.','.122221..','..1221...','...11....','..1......','.1.......'],c:{1:'#c7ff98',2:'#5dff9b'}},
  blood:{p:['....1....','...121...','..12221..','.122221.','.122221.','..1222...','...22....','.........','.........'],c:{1:'#ff9bb0',2:'#b51f3b'}},
  thorn:{p:['....1....','...121...','1..121..1','.1.121.1.','..11211..','...121...','...121...','..1...1..','.1.....1.'],c:{1:'#d6ff9b',2:'#74b879'}},
  skull:{p:['..11111..','.1222221.','122121221','122222221','122111221','.1222221.','..1212...','..1111...','.........'],c:{1:'#eee8d6',2:'#11131a'}},
  boot:{p:['...111...','...122...','...122...','...122...','..1222...','.1222221.','122222221','111111111','.........'],c:{1:'#f3d98b',2:'#8fb7d9'}},
  gun:{p:['111111...','1222221..','11112221.','...122221','...1111..','..11.....','.11......','.........','.........'],c:{1:'#d8d2bf',2:'#5c6575'}},
  swirl:{p:['..1111...','.122221..','12...221.','1..11221.','1.122211.','12221..1.','.122221..','..1111...','.........'],c:{1:'#c98bff',2:'#8fb7d9'}},
};
function treePixelKey(node){
  const id=node.id;
  if(id==='hub') return 'hub';
  if(id.includes('speed')||id==='m_blitz') return 'bolt';
  if(id.includes('size')||id==='m_charge2') return 'orb';
  if(id.includes('spread')||id==='m_dtap') return 'target';
  if(id.includes('shots')) return 'split';
  if(id==='s_back') return 'back';
  if(id.includes('burn')) return 'fire';
  if(id.includes('poison')) return 'poison';
  if(id.includes('chill')) return 'frost';
  if(id==='t_dmg') return 'bomb';
  if(id==='t_stun') return 'bell';
  if(id==='t_spread') return 'wave';
  if(id.includes('gold')) return 'coin';
  if(id.includes('xp')) return 'chart';
  if(id==='g_donate') return 'donate';
  if(id==='g_power') return 'card';
  if(id==='g_magnet') return 'magnet';
  if(id==='g_jackpot') return 'slot';
  if(id.includes('hp')) return 'heart';
  if(id.includes('armor')) return 'shield';
  if(id==='v_regen') return 'leaf';
  if(id==='v_steal') return 'blood';
  if(id==='v_thorns') return 'thorn';
  if(id==='v_undead') return 'skull';
  if(id.includes('spd')) return 'boot';
  if(id.includes('fire')) return 'gun';
  if(id==='m_dodge') return 'swirl';
  return node.branch==='survive'?'shield':'orb';
}
function drawTreePixelIcon(c,node,x,y,major,alpha){
  const icon=TREE_PIXEL_PATTERNS[treePixelKey(node)]||TREE_PIXEL_PATTERNS.orb;
  const cell=major?3:2.45;
  const ox=Math.round(x-(icon.p[0].length*cell)/2);
  const oy=Math.round(y-(icon.p.length*cell)/2);
  c.save();
  c.globalAlpha=alpha;
  c.imageSmoothingEnabled=false;
  for(let row=0;row<icon.p.length;row++){
    for(let col=0;col<icon.p[row].length;col++){
      const key=icon.p[row][col];
      if(key==='.') continue;
      c.fillStyle=icon.c[key]||'#fff';
      c.fillRect(Math.round(ox+col*cell),Math.round(oy+row*cell),Math.ceil(cell),Math.ceil(cell));
    }
  }
  c.restore();
}
function ensureTreeChrome(){
  const ov=$('ovTree'); if(!ov || ov.dataset.treeChrome==='2') return;
  ov.dataset.treeChrome='2';
  const head=ov.querySelector(':scope > div');
  if(head){
    head.className='tree-topbar';
    const spans=head.querySelectorAll('span');
    if(spans[0]) spans[0].textContent='PASSIVES';
    if(spans[1]) spans[1].textContent='[ K ] CLOSE';
  }
  const panel=document.createElement('div');
  panel.id='treeInfoPanel';
  panel.className='tree-info-panel';
  panel.innerHTML='<div class="tree-panel-kicker">PASSIVE</div><div id="treePanelName" class="tree-panel-name"></div><div id="treePanelBranch" class="tree-panel-branch"></div><div id="treePanelDesc" class="tree-panel-desc"></div><div id="treePanelState" class="tree-panel-state"></div><button id="treeUnlockBtn" class="tree-unlock-btn">ALLOCATE</button><div class="tree-help">Drag to move · Wheel to zoom · K / ESC to close</div>';
  ov.appendChild(panel);
  const close=document.createElement('button');
  close.id='treeCloseBtn';
  close.className='tree-close-btn';
  close.textContent='x';
  close.onclick=closeTree;
  ov.appendChild(close);
  const points=document.createElement('div');
  points.id='treePointBadge';
  points.className='tree-point-badge';
  ov.appendChild(points);
}
function updateTreePointBadge(){
  const el=$('treePointBadge');
  if(!el) return;
  el.innerHTML='<b>SKILL POINTS</b><span>'+treePoints+'</span>';
}
function updateTreePanel(){
  const node=treeNodeById(treeAtlasSelected);
  const col=TREE_BRANCH_COL[node.branch]||TREE_BRANCH_COL.hub;
  const set=(id,val)=>{ const el=$(id); if(el) el.textContent=val; };
  updateTreePointBadge();
  set('treePanelName',node.name);
  set('treePanelBranch',TREE_BRANCH_LABEL[node.branch]||'ORIGIN');
  set('treePanelDesc',node.desc||'');
  set('treePanelState',treeStatusText(node));
  const stateEl=$('treePanelState'); if(stateEl) stateEl.style.color=treeCanUnlock(node)?'#f3d98b':treeUnlocked.has(node.id)?'#89e0a1':'#9a8d76';
  const branchEl=$('treePanelBranch'); if(branchEl) branchEl.style.color=col;
  const btn=$('treeUnlockBtn');
  if(btn){
    btn.disabled=!treeCanUnlock(node);
    btn.textContent=treeUnlocked.has(node.id)?'ALLOCATED':('ALLOCATE ' + (node.cost||1) + 'P');
    btn.onclick=function(){
      if(treeUnlockNode(node)){
        try{sfx.pick&&sfx.pick();}catch(e){}
        banner(node.name,'Passive allocated',1000);
        updateTreePanel();
        renderTree();
      }
    };
  }
}
function openTree(){
  if(state!=='play' && state!=='map') return;
  ensureTreeChrome();
  initTreeEvents();
  treeOpen = true;
  $('ovTree').classList.remove('hidden');
  updateTreePanel();
  if(state==='play' && !paused){ paused=true; mouseDown=false; autoFire=false; }
  requestAnimationFrame(()=>requestAnimationFrame(renderTree));
}
function closeTree(){
  treeOpen = false;
  const ov=$('ovTree'); if(ov) ov.classList.add('hidden');
  const tt=$('treeTooltip'); if(tt) tt.style.display='none';
  if(state==='play' && paused){ paused=false; last=performance.now(); }
}
function drawTreeBackground(c,W,H){
  const g=c.createRadialGradient(W*0.45,H*0.55,40,W*0.45,H*0.55,Math.max(W,H)*0.76);
  g.addColorStop(0,'#151319');
  g.addColorStop(0.58,'#070a10');
  g.addColorStop(1,'#030407');
  c.fillStyle=g; c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(189,167,105,0.055)';
  c.lineWidth=1;
  for(let x=((treeAtlasPan.x%32)+32)%32;x<W;x+=32){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
  for(let y=((treeAtlasPan.y%32)+32)%32;y<H;y+=32){ c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }
  c.fillStyle='#fff0b8';
  for(let i=0;i<90;i++){
    const x=(i*157+treeAtlasPan.x*0.13)%W, y=(i*91+treeAtlasPan.y*0.09)%H;
    c.globalAlpha=0.045+(i%7)*0.012;
    c.fillRect((x+W)%W,(y+H)%H,1,1);
  }
  c.globalAlpha=1;
}
function drawTreeNode2(c,node,p,W,H){
  const sp=treeToScreen2(p.x,p.y,W,H);
  const unlocked=treeUnlocked.has(node.id), can=treeCanUnlock(node), reach=treeCanReach(node);
  const hover=_treeHover===node.id, selected=treeAtlasSelected===node.id;
  const col=TREE_BRANCH_COL[node.branch]||TREE_BRANCH_COL.hub;
  const major=node.id==='hub' || (node.cost||1)>=3;
  const r=(major?22:16)*(hover||selected?1.14:1);
  c.save();
  c.globalAlpha=unlocked?1:(can?0.96:(reach?0.48:0.22));
  c.shadowColor=unlocked||can||selected?col:'transparent';
  c.shadowBlur=selected?28:(unlocked?18:(can?12:0));
  c.beginPath();
  c.arc(sp.x,sp.y,r+5,0,TAU);
  c.fillStyle=selected?'rgba(244,217,139,0.22)':(unlocked?col+'33':'rgba(6,8,12,0.72)');
  c.fill();
  c.shadowBlur=0;
  c.beginPath();
  c.arc(sp.x,sp.y,r,0,TAU);
  c.fillStyle=unlocked?'#17120b':'#090b11';
  c.fill();
  c.lineWidth=major?3:2;
  c.strokeStyle=unlocked?col:(can?'#f3d98b':(reach?'#5a554b':'#2c2b30'));
  c.stroke();
  if(can && !unlocked){
    c.beginPath();
    c.arc(sp.x,sp.y,r+7,0,TAU);
    c.strokeStyle='rgba(243,217,139,0.55)';
    c.lineWidth=1;
    c.stroke();
  }
  c.fillStyle='rgba(0,0,0,0.22)';
  c.fillRect(Math.round(sp.x-r*0.58),Math.round(sp.y-r*0.58),Math.round(r*1.16),Math.round(r*1.16));
  drawTreePixelIcon(c,node,sp.x,sp.y+1,major,unlocked?1:(can?0.92:0.38));
  if((node.cost||1)>1 && !unlocked){
    c.font='bold 11px Courier New';
    c.fillStyle=can?'#f3d98b':'#6f6658';
    c.fillText((node.cost||1)+'P',sp.x+r*0.88,sp.y-r*0.88);
  }
  c.restore();
}
function renderTree(){
  const cvs=$('treeCanvas'); if(!cvs) return;
  const rect=cvs.getBoundingClientRect();
  const W=cvs.width=Math.round(rect.width)||window.innerWidth||1280;
  const H=cvs.height=Math.round(rect.height)||window.innerHeight||720;
  const c=cvs.getContext('2d');
  drawTreeBackground(c,W,H);
  _treeLayout=getTreeLayout(W,H);
  for(const node of TREE_NODES){
    const p=_treeLayout[node.id]; if(!p) continue;
    for(const reqId of node.req||[]){
      const q=_treeLayout[reqId]; if(!q) continue;
      const a=treeToScreen2(q.x,q.y,W,H), b=treeToScreen2(p.x,p.y,W,H);
      const unlocked=treeUnlocked.has(node.id)&&treeUnlocked.has(reqId);
      const available=treeUnlocked.has(reqId)&&!treeUnlocked.has(node.id);
      c.save();
      c.strokeStyle=unlocked?(TREE_BRANCH_COL[node.branch]||'#d8c28a'):(available?'rgba(243,217,139,0.48)':'rgba(120,116,105,0.22)');
      c.lineWidth=unlocked?3:1.5;
      if(!unlocked) c.setLineDash([5,7]);
      c.shadowColor=unlocked?(TREE_BRANCH_COL[node.branch]||'#d8c28a'):'transparent';
      c.shadowBlur=unlocked?10:0;
      c.beginPath();
      c.moveTo(a.x,a.y);
      c.lineTo(b.x,b.y);
      c.stroke();
      c.restore();
    }
  }
  for(const node of TREE_NODES){ const p=_treeLayout[node.id]; if(p) drawTreeNode2(c,node,p,W,H); }
  c.save();
  c.fillStyle='rgba(6,8,12,0.78)';
  c.strokeStyle='rgba(243,217,139,0.38)';
  c.lineWidth=1;
  c.fillRect(16,14,176,54);
  c.strokeRect(16.5,14.5,176,54);
  c.font='bold 16px Courier New';
  c.textAlign='left';
  c.textBaseline='top';
  c.fillStyle='#f3d98b';
  c.shadowColor='#c8a958';
  c.shadowBlur=10;
  c.fillText('SKILL POINTS  '+treePoints,28,22);
  c.font='12px Courier New';
  c.shadowBlur=0;
  c.fillStyle='rgba(232,216,164,0.72)';
  c.fillText('Zoom '+Math.round(treeAtlasZoom*100)+'%',28,46);
  c.restore();
  updateTreePanel();
}
function treeNodeAt(sx,sy,W,H){
  if(!_treeLayout) return null;
  let best=null, bestD=9999;
  for(const node of TREE_NODES){
    const p=_treeLayout[node.id]; if(!p) continue;
    const sp=treeToScreen2(p.x,p.y,W,H);
    const r=(node.id==='hub'||(node.cost||1)>=3?27:22);
    const d=Math.hypot(sx-sp.x,sy-sp.y);
    if(d<r && d<bestD){ best=node; bestD=d; }
  }
  return best;
}
function updateTreeTooltip(node,cx,cy){
  const tt=$('treeTooltip'); if(!tt) return;
  if(!node){ tt.style.display='none'; return; }
  const col=TREE_BRANCH_COL[node.branch]||TREE_BRANCH_COL.hub;
  $('ttName').textContent=node.name;
  $('ttName').style.color=col;
  $('ttDesc').textContent=node.desc||'';
  $('ttState').textContent=treeStatusText(node);
  $('ttState').style.color=treeCanUnlock(node)?'#f3d98b':treeUnlocked.has(node.id)?'#89e0a1':'#9a8d76';
  tt.style.borderColor=col;
  tt.style.boxShadow='0 0 22px '+col+'55';
  const W=window.innerWidth,H=window.innerHeight,tw=280,th=118;
  let tx=cx+18,ty=cy+18;
  if(tx+tw>W-8) tx=cx-tw-12;
  if(ty+th>H-8) ty=cy-th-12;
  tt.style.left=tx+'px';
  tt.style.top=ty+'px';
  tt.style.display='block';
}
function initTreeEvents(){
  const cvs=$('treeCanvas'); if(!cvs) return;
  if(treeEventsReady) return;
  treeEventsReady = true;
  cvs.addEventListener('mousemove',e=>{
    if(!treeOpen) return;
    const r=cvs.getBoundingClientRect();
    const sx=(e.clientX-r.left)*(cvs.width/r.width), sy=(e.clientY-r.top)*(cvs.height/r.height);
    if(treeAtlasDrag){
      const dx=e.clientX-treeAtlasDrag.x, dy=e.clientY-treeAtlasDrag.y;
      if(Math.abs(dx)+Math.abs(dy)>2) treeAtlasMoved=true;
      treeAtlasPan.x=treeAtlasDrag.px+dx;
      treeAtlasPan.y=treeAtlasDrag.py+dy;
      renderTree();
      return;
    }
    const node=treeNodeAt(sx,sy,cvs.width,cvs.height);
    const id=node?node.id:null;
    if(id!==_treeHover){ _treeHover=id; renderTree(); }
    updateTreeTooltip(node,e.clientX,e.clientY);
  });
  cvs.addEventListener('mouseleave',()=>{
    _treeHover=null;
    treeAtlasDrag=null;
    updateTreeTooltip(null,0,0);
    if(treeOpen) renderTree();
  });
  cvs.addEventListener('mousedown',e=>{
    if(!treeOpen) return;
    treeAtlasDrag={x:e.clientX,y:e.clientY,px:treeAtlasPan.x,py:treeAtlasPan.y};
    treeAtlasMoved=false;
  });
  window.addEventListener('mouseup',()=>{ treeAtlasDrag=null; });
  cvs.addEventListener('click',e=>{
    if(!treeOpen || treeAtlasMoved) return;
    const r=cvs.getBoundingClientRect();
    const sx=(e.clientX-r.left)*(cvs.width/r.width), sy=(e.clientY-r.top)*(cvs.height/r.height);
    const node=treeNodeAt(sx,sy,cvs.width,cvs.height);
    if(!node) return;
    treeAtlasSelected=node.id;
    if(treeCanUnlock(node)){
      treeUnlockNode(node);
      try{sfx.pick&&sfx.pick();}catch(err){}
      banner(node.name,'Passive allocated',1000);
    }
    updateTreePanel();
    renderTree();
  });
  cvs.addEventListener('wheel',e=>{
    if(!treeOpen) return;
    e.preventDefault();
    const r=cvs.getBoundingClientRect();
    const sx=(e.clientX-r.left)*(cvs.width/r.width), sy=(e.clientY-r.top)*(cvs.height/r.height);
    const before=screenToTree2(sx,sy,cvs.width,cvs.height);
    const old=treeAtlasZoom;
    treeAtlasZoom=clamp(treeAtlasZoom*(e.deltaY<0?1.1:0.9),0.65,1.9);
    const after=screenToTree2(sx,sy,cvs.width,cvs.height);
    treeAtlasPan.x+=(after.x-before.x)*treeAtlasZoom;
    treeAtlasPan.y+=(after.y-before.y)*treeAtlasZoom;
    if(old!==treeAtlasZoom) renderTree();
  },{passive:false});
}
