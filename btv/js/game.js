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
const MIN_PLAYER_BULLET_SPEED=250;
const MAX_PLAYER_BULLET_SPEED=850;
const MIN_PLAYER_SHOOT_COOLDOWN=0.09;
const BASE_PLAYER_MOVE_SPEED=175;
const DASH_FX_SCALE=1.75;
const SKILL_HUD_SCALE=1.35;
const SKILL_HUD_MARGIN_X=42;
const SKILL_HUD_MARGIN_Y=42;
const DODGE_READY_FX_DURATION=0.62;
const BOSS_STUN_IMMUNITY_T=10;
const ENEMY_SPAWN_SAFE_RADIUS=220;
const CRIT_BASE_CHANCE=0.05;
const CRIT_BASE_MULT=1.5;
const CRIT_CHANCE_CAP=0.60;
const CRIT_MULT_CAP=3.5;
const DODGE_HASTE_FIRE_ADD=0.50;
const THORNS_DAMAGE_RADIUS=200;
function statBonusFromMul(v){
  const n=Number(v);
  return Number.isFinite(n)?n-1:0;
}
function statMulFromBonus(bonus,min){
  return Math.max(min==null?0.1:min,1+(Number(bonus)||0));
}
function playerBulletSpeed(p){
  return clamp(560*statMulFromBonus(statBonusFromMul(p&&p.bulletSpeedMul),0.1),MIN_PLAYER_BULLET_SPEED,MAX_PLAYER_BULLET_SPEED);
}
function playerMoveSpeed(p){
  p=p||player;
  const base=(Number(p&&p.spd)||BASE_PLAYER_MOVE_SPEED)+curseContractSpeedFlat(p);
  const bonus=(Number(p&&p.moveSpeedAdd)||0)+(Number(p&&p.trainingSpeedBonus)||0);
  return Math.max(1,base*statMulFromBonus(bonus,0.1));
}
function playerDodgeCooldownMul(p){
  return statMulFromBonus(statBonusFromMul(p&&p.dodgeCdMul),0.1);
}
function playerShootCooldown(p){
  p=p||player;
  let totalFireAdd=(Number(p.fireAdd)||0)+(Number(p.potionFireAdd)||0);
  if(p.buffs&&p.buffs.haste>0) totalFireAdd+=DODGE_HASTE_FIRE_ADD;
  if(p&&p.perfectDodgeFireT>0) totalFireAdd+=0.20;
  const fireHandicap=Number(p._fireHandicap)||1;
  if(fireHandicap!==1) totalFireAdd+=(1/fireHandicap)-1;
  const fireRateMul=Math.max(0.1,1+totalFireAdd);
  const raw=0.35/fireRateMul;
  return Math.max(raw,MIN_PLAYER_SHOOT_COOLDOWN);
}
function playerFireRate(p){ return 1/playerShootCooldown(p); }
// 엘리먼트 캐싱: 같은 id를 반복 조회하지 않도록 1회 조회 후 캐시
const _elc={};
const $=id=>_elc[id]||(_elc[id]=document.getElementById(id));

const BONGSIK_AVATAR="btv/assets/asset-001-77d22694fc.png";
const BROADCAST_SCREEN="btv/assets/intro-broadcast-bg.png";

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
const ULTRA_SPRITE=new Image();let ultraReady=false;ULTRA_SPRITE.onload=()=>{ultraReady=true;};ULTRA_SPRITE.src="btv/assets/asset-020-afe3b7d4b2.png";
const HOONSANGTAE_SPRITE=new Image();let hoonsangtaeReady=false;HOONSANGTAE_SPRITE.onload=()=>{hoonsangtaeReady=true;};HOONSANGTAE_SPRITE.src="btv/assets/hoonsangtae.png?v=matte2";
const JAEMIN_SPRITE=new Image();let jaeminReady=false;JAEMIN_SPRITE.onload=()=>{jaeminReady=true;};JAEMIN_SPRITE.src="btv/assets/jaemin.png?v=matte2";
const CLEAVER_SPRITE=new Image();let cleaverReady=false;CLEAVER_SPRITE.onload=()=>{cleaverReady=true;};CLEAVER_SPRITE.src="btv/assets/cleaver.png";
const BOOMERANG_SPRITE=new Image();let boomerangReady=false;BOOMERANG_SPRITE.onload=()=>{boomerangReady=true;};BOOMERANG_SPRITE.src="btv/assets/boomerang.png";
const KILLJOY_SPRITE=new Image();let killjoyReady=false;KILLJOY_SPRITE.onload=()=>{killjoyReady=true;};KILLJOY_SPRITE.src="btv/assets/killjoy.png?v=1";
const APPLE_SPRITE=new Image();let appleReady=false;APPLE_SPRITE.onload=()=>{appleReady=true;};APPLE_SPRITE.src="btv/assets/apple.png?v=1";
const BLACKSTAR_SPRITE=new Image();let blackstarReady=false;BLACKSTAR_SPRITE.onload=()=>{blackstarReady=true;};BLACKSTAR_SPRITE.src="btv/assets/blackstar.png?v=1";
const STREAM_WATCHER_SPRITE=new Image();let streamWatcherReady=false;STREAM_WATCHER_SPRITE.onload=()=>{streamWatcherReady=true;};STREAM_WATCHER_SPRITE.src="btv/assets/stream_watcher.png?v=1";
const SNIPER_VIEWER_SPRITE=new Image();let sniperViewerReady=false;SNIPER_VIEWER_SPRITE.onload=()=>{sniperViewerReady=true;};SNIPER_VIEWER_SPRITE.src="btv/assets/sniper_viewer.png?v=1";
const KETTER_SPRITE=new Image();let ketterReady=false;KETTER_SPRITE.onload=()=>{ketterReady=true;};KETTER_SPRITE.src="btv/assets/ketter.png?v=1";
const ACT3_MAGNET_SPRITE=new Image();let act3MagnetReady=false;ACT3_MAGNET_SPRITE.onload=()=>{act3MagnetReady=true;};ACT3_MAGNET_SPRITE.src="btv/assets/act3_magnet.png?v=1";
const ACT3_MIRROR_SPRITE=new Image();let act3MirrorReady=false;ACT3_MIRROR_SPRITE.onload=()=>{act3MirrorReady=true;};ACT3_MIRROR_SPRITE.src="btv/assets/act3_mirror.png?v=1";
const ACT3_TRUCK_SPRITE=new Image();let act3TruckReady=false;ACT3_TRUCK_SPRITE.onload=()=>{act3TruckReady=true;};ACT3_TRUCK_SPRITE.src="btv/assets/act3_truck.png?v=1";
const ACT3_BUFFERING_SPRITE=new Image();let act3BufferingReady=false;ACT3_BUFFERING_SPRITE.onload=()=>{act3BufferingReady=true;};ACT3_BUFFERING_SPRITE.src="btv/assets/act3_buffering.png?v=1";
const ACT3_ALPPANO_SPRITE=new Image();let act3AlppanoReady=false;ACT3_ALPPANO_SPRITE.onload=()=>{act3AlppanoReady=true;};ACT3_ALPPANO_SPRITE.src="btv/assets/act3_alppano.png?v=1";
const ACT3_CLONE_SPRITE=new Image();let act3CloneReady=false;ACT3_CLONE_SPRITE.onload=()=>{act3CloneReady=true;};ACT3_CLONE_SPRITE.src="btv/assets/act3_clone.png?v=1";
const ACT3_DOMIN_SPRITE=new Image();let act3DominReady=false;ACT3_DOMIN_SPRITE.onload=()=>{act3DominReady=true;};ACT3_DOMIN_SPRITE.src="btv/assets/act3_domin.png?v=1";
const ACT3_KULLJE_SPRITE=new Image();let act3KulljeReady=false;ACT3_KULLJE_SPRITE.onload=()=>{act3KulljeReady=true;};ACT3_KULLJE_SPRITE.src="btv/assets/act3_kullje.png?v=1";
const ONSTER_P1_SPRITE=new Image();let onsterP1Ready=false;ONSTER_P1_SPRITE.onload=()=>{onsterP1Ready=true;};ONSTER_P1_SPRITE.src="btv/assets/onster_p1.png?v=2";
const ONSTER_P2_SPRITE=new Image();let onsterP2Ready=false;ONSTER_P2_SPRITE.onload=()=>{onsterP2Ready=true;};ONSTER_P2_SPRITE.src="btv/assets/onster_p2.png?v=2";
ONSTER_P1_SPRITE.onerror=()=>{onsterP1Ready=false;};
ONSTER_P2_SPRITE.onerror=()=>{onsterP2Ready=false;};
const SET_HYEONJIN_SPRITE=new Image();let setHyeonjinReady=false;SET_HYEONJIN_SPRITE.onload=()=>{setHyeonjinReady=true;};SET_HYEONJIN_SPRITE.src="btv/assets/set_hyeonjin.png?v=1";
const SET_BEONGEOM_SPRITE=new Image();let setBeongeomReady=false;SET_BEONGEOM_SPRITE.onload=()=>{setBeongeomReady=true;};SET_BEONGEOM_SPRITE.src="btv/assets/set_beongeom.png?v=1";
const SET_KEKERORO_SPRITE=new Image();let setKekeroroReady=false;SET_KEKERORO_SPRITE.onload=()=>{setKekeroroReady=true;};SET_KEKERORO_SPRITE.src="btv/assets/set_kekeroro.png?v=1";
PLAYER_SPRITE.src="btv/assets/asset-021-de784e3d5a.png";
const INTERNAL_GAME_W=1600, INTERNAL_GAME_H=900;
let W=INTERNAL_GAME_W, H=INTERNAL_GAME_H;
let BASE_W=W, BASE_H=H;
const STAT_PANEL_COLLAPSED_KEY='btv_stat_panel_collapsed';
let statPanelCollapsed=false;
try{ statPanelCollapsed=localStorage.getItem(STAT_PANEL_COLLAPSED_KEY)==='true'; }catch(e){}
let arenaResponsive=true; // 일반 필드에서만 화면에 맞춰 리사이즈(보스 아레나 제외)
function setArena(w,h){
  if(cvs.width===w && cvs.height===h) return;
  cvs.width=w; cvs.height=h; W=w; H=h;
  if(typeof buildBackdrop==='function') buildBackdrop(act); // 새 크기에 맞춰 배경 재생성
}
// 가용 영역(스테이지 영역에서 능력치 패널 폭만 제외) 계산
cvs.width=INTERNAL_GAME_W; cvs.height=INTERNAL_GAME_H;
function computeFieldSize(){
  const wrap=document.getElementById('stageWrap');
  if(!wrap||!wrap.clientWidth) return {w:BASE_W,h:BASE_H};
  let availW=wrap.clientWidth, availH=wrap.clientHeight;
  const sp=document.getElementById('sidePanel');
  const inPlay = (typeof state!=='undefined' && state==='play' && typeof player==='object' && player && player.maxhp!=null);
  const panelShown = !statPanelCollapsed && ((sp && sp.classList.contains('show')) || inPlay) && window.innerWidth>880;
  if(panelShown) availW-=232; // 패널 + 여백
  availW=Math.max(320, Math.round(availW));
  availH=Math.max(180, Math.round(availH));
  const scale=Math.max(0.1,Math.min(availW/INTERNAL_GAME_W,availH/INTERNAL_GAME_H));
  return {w:Math.round(INTERNAL_GAME_W*scale),h:Math.round(INTERNAL_GAME_H*scale)};
}
// 일반 필드: 버퍼=표시영역(1:1, 레터박스 없음)으로 꽉 채움
function fitField(){
  if(!arenaResponsive) return;
  const s=computeFieldSize();
  BASE_W=s.w; BASE_H=s.h;
  setArena(INTERNAL_GAME_W,INTERNAL_GAME_H);
  cvs.style.width=s.w+'px'; cvs.style.height=s.h+'px';
  if(typeof player==='object' && player){ player.x=clamp(player.x,16,W-16); player.y=clamp(player.y,16,H-16); }
}
let _fitT=null;
window.addEventListener('resize',()=>{ clearTimeout(_fitT); _fitT=setTimeout(()=>{ if(arenaResponsive) fitField(); },150); });

// ---------- 사운드 (간단 WebAudio) ----------

// ===== JS: Audio and music =====
let audioCtx=null, muted=false;
let introSilentUntil=0, introBgmMul=1;
function introAudioMultiplier(){
  const silent=(typeof performance!=='undefined' && performance.now && performance.now()<introSilentUntil);
  return silent?0:clamp(introBgmMul||1,0,1);
}
function beep(freq,dur,type,vol){
  if(muted) return;
  try{
    const mul=introAudioMultiplier();
    if(mul<=0.001) return;
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type||'square'; o.frequency.value=freq;
    g.gain.value=(vol||0.06)*sfxVol*mul;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+(dur||0.08));
    o.stop(audioCtx.currentTime+(dur||0.08));
  }catch(e){}
}
const PATTERN_SFX_CD = {};
function playPatternSfx(key, fn, cd = 0.18){
  if(muted) return;
  const now = performance.now();
  if(PATTERN_SFX_CD[key] && now - PATTERN_SFX_CD[key] < cd * 1000) return;
  PATTERN_SFX_CD[key] = now;
  try { fn(); } catch(e) {}
}
const ENEMY_PATTERN_SFX_GAIN = 2.2;
function patternVol(v){ return Math.min(0.16, v * ENEMY_PATTERN_SFX_GAIN); }
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
  clickBack:()=>{ beep(600,0.035,'square',0.03); setTimeout(()=>beep(420,0.025,'square',0.02),20); }, // 뒤로가기 느낌,
  enemyWarn:()=>playPatternSfx('enemyWarn',()=>{ beep(760,0.045,'square',patternVol(0.035)); setTimeout(()=>beep(980,0.035,'square',patternVol(0.025)),45); },0.18),
  enemyCast:()=>playPatternSfx('enemyCast',()=>{ beep(300,0.08,'triangle',patternVol(0.038)); setTimeout(()=>beep(420,0.05,'sine',patternVol(0.026)),70); },0.18),
  enemyDash:()=>playPatternSfx('enemyDash',()=>{ beep(120,0.12,'sawtooth',patternVol(0.052)); setTimeout(()=>beep(210,0.055,'square',patternVol(0.035)),55); },0.22),
  enemyLaser:()=>playPatternSfx('enemyLaser',()=>{ beep(1120,0.055,'square',patternVol(0.045)); setTimeout(()=>beep(620,0.05,'sawtooth',patternVol(0.028)),35); },0.20),
  enemySummon:()=>playPatternSfx('enemySummon',()=>{ beep(180,0.12,'triangle',patternVol(0.034)); setTimeout(()=>beep(260,0.09,'sine',patternVol(0.026)),90); },0.25),
  enemyExplode:()=>playPatternSfx('enemyExplode',()=>{ beep(90,0.14,'sawtooth',patternVol(0.06)); setTimeout(()=>beep(55,0.08,'sawtooth',patternVol(0.035)),55); },0.14),
  enemyGlitch:()=>playPatternSfx('enemyGlitch',()=>{ beep(920,0.035,'square',patternVol(0.038)); setTimeout(()=>beep(210,0.045,'sawtooth',patternVol(0.035)),42); setTimeout(()=>beep(1280,0.028,'square',patternVol(0.026)),85); },0.50),
  enemyChain:()=>playPatternSfx('enemyChain',()=>{ beep(150,0.08,'sawtooth',patternVol(0.044)); setTimeout(()=>beep(95,0.07,'square',patternVol(0.032)),65); },0.22),
  enemySequence:(step)=>playPatternSfx('enemySequence'+(step||0),()=>{ const f=[520,700,900,1080][Math.max(0,Math.min(3,(step||1)-1))]||700; beep(f,0.055,'triangle',patternVol(0.038)); },0.08),
  enemyCore:()=>playPatternSfx('enemyCore',()=>{ beep(460,0.12,'triangle',patternVol(0.06)); setTimeout(()=>beep(920,0.09,'square',patternVol(0.045)),90); },0.35)
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
    const mul=introAudioMultiplier();
    if(mul<=0.001) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=audioCtx.currentTime;
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(Math.max(0.0001,vol*bgmVol*mul),t+0.02);
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
  failed:{},                           // 로드 실패한 트랙 키 마킹(폴백용)
  files:{
    main:         'btv/assets/music/main.mp3',
    intro:        'btv/assets/music/intro.mp3',
    act1:         'btv/assets/music/act1.mp3',
    // ── Act1 전투 타입별 전용 BGM ──
    act1_battle_normal: 'btv/assets/music/act1_battle_normal.mp3',
    act1_battle_elite:  'btv/assets/music/act1_battle_elite.mp3',
    act1_midboss:       'btv/assets/music/act1_midboss.mp3',
    act1_finalboss:     'btv/assets/music/act1_finalboss.mp3',
    act2:         'btv/assets/music/act2-maple-bg.mp3',
    bgm_act3:     'btv/assets/music/act2-maple-bg.mp3',
    midboss:      'btv/assets/music/midboss.mp3',
    act2Midboss:  'btv/assets/music/act2-midboss-malkuth.mp3',
    boss:         'btv/assets/music/boss.mp3',
    finalBoss:    'btv/assets/music/act2-final-boss.mp3',
    bgm_onster_sealed:   'btv/assets/music/act2-midboss-malkuth.mp3',
    bgm_onster_awakened: 'btv/assets/music/midboss.mp3',
    bgm_set_hyeonjin:    'btv/assets/music/act2-final-boss.mp3',
    bgm_set_beongeom:    'btv/assets/music/boss.mp3',
    bgm_set_kekeroro:    'btv/assets/music/act2-final-boss.mp3',
    bgm_final_clear:     'btv/assets/music/ending.mp3'
  },
  tightLoops:{
    midboss:{start:0.02,endPad:0.28},
    act2Midboss:{start:0.02,endPad:0.28}
  }
};
// 막 + 전투 타입 → BGM 키 (Act2/3도 동일 방식으로 항목만 추가하면 확장됨)
const BATTLE_BGM = {
  1: { normal:'act1_battle_normal', elite:'act1_battle_elite', midboss:'act1_midboss', boss:'act1_finalboss' }
  // 2:{...}, 3:{...} 형태로 추후 추가 가능. 정의가 없으면 아래 기존 폴백 로직을 그대로 사용.
};
// 전용 파일이 없거나 로드 실패 시 대체할 트랙(전용곡을 넣으면 files 경로만 채우면 됨)
const BGM_FALLBACK = { act1_battle_normal:'act1', act1_battle_elite:'act1', act1_midboss:'midboss', act1_finalboss:'boss' };
function resolveBgmKey(key){ let k=key, g=0; while(k && MUSIC.failed[k] && BGM_FALLBACK[k] && g++<4) k=BGM_FALLBACK[k]; return k; }
(function initMusic(){
  if(!MUSIC.enabled) return;
  for(const k in MUSIC.files){
    try{
      const a=new Audio();
      a.src=encodeURI(MUSIC.files[k]);
      a.loop=true; a.preload='auto'; a.volume=0;
      a.addEventListener('error',()=>{ MUSIC.failed[k]=true; console.warn('[BGM] load failed:',k,MUSIC.files[k]); }); // 파일 없으면 폴백 마킹 후 진행
      MUSIC.tracks[k]=a;
    }catch(e){}
  }
})();
// 현재 상황에 맞는 음악 키
function desiredMusicKey(){
  if(state==='title'||state==='start') return 'main'; // 시작화면·난이도 선택 화면 → main.mp3
  if((typeof act3FinalClearActive==='function'&&act3FinalClearActive())||(act>=MAX_ACT&&state==='end')) return 'bgm_final_clear';
  if(!runActive) return 'intro';   // 스토리·엔드 등 기타 비전투 화면
  // 특수 보스 전용 트랙(막 무관, 매핑보다 우선)
  if(roomIsBoss && boss && boss.key==='set3') return (boss.setPhase||1)===1?'bgm_set_hyeonjin':((boss.setPhase||1)===2?'bgm_set_beongeom':'bgm_set_kekeroro');
  if(roomIsMidboss){
    const mb=(enemies||[]).find(e=>e&&e.midboss);
    if(mb&&mb.type==='onster') return (mb.phase||1)>=2?'bgm_onster_awakened':'bgm_onster_sealed';
  }
  // 막 + 전투 타입 매핑 (Act1 일반/엘리트/중간보스/최종보스 세분화)
  const role = roomIsBoss?'boss':roomIsMidboss?'midboss':roomHadElite?'elite':'normal';
  const map = BATTLE_BGM[act];
  if(map && map[role]) return map[role];
  // 폴백(매핑이 없는 막 — 기존 동작 유지: Act2/3)
  if(roomIsBoss) return act>=MAX_ACT ? 'finalBoss' : 'boss';
  if(roomIsMidboss) return act>=2 ? 'act2Midboss' : 'midboss';
  return act>=3 ? 'bgm_act3' : (act>=2 ? 'act2' : 'act1');
}
// 첫 사용자 제스처에서 모든 트랙 재생 권한 확보
function unlockMusic(){
  if(!MUSIC.enabled || MUSIC.unlocked) return;
  MUSIC.unlocked=true;
  const want=resolveBgmKey(desiredMusicKey());
  for(const k in MUSIC.tracks){
    const a=MUSIC.tracks[k];
    try{ a.volume=0; const p=a.play(); if(p&&p.then) p.then(()=>{ if(k!==want){ try{a.pause();}catch(e){} } }).catch(()=>{}); }catch(e){}
  }
}
// 매 프레임 호출 — 목표 트랙으로 부드럽게 크로스페이드
function safeMediaVolume(v){
  v=Number(v);
  return Number.isFinite(v)?clamp(v,0,1):0;
}
let __bgmLastWant=null;   // 전환 감지용(매 프레임 로그 방지)
function updateMusic(dt){
  if(!MUSIC.enabled || !MUSIC.unlocked) return;
  const rawWant = muted ? null : desiredMusicKey();
  const want = rawWant ? resolveBgmKey(rawWant) : null;       // 파일 없으면 대체 트랙으로
  if(want!==__bgmLastWant){ __bgmLastWant=want; if(want) console.log('[BGM]',want); } // 전환 시 1회만 로그
  const baseVol = safeMediaVolume(MUSIC.vol * (typeof bgmVol==='number'?bgmVol:1) * introAudioMultiplier());
  const rate = Math.max(0,1.4*dt);   // 페이드 속도 — baseVol까지 ≈0.3초(0.3~0.8초 권장 범위)
  for(const k in MUSIC.tracks){
    const a=MUSIC.tracks[k]; if(!a) continue;
    const goal=(k===want)?baseVol:0;
    if(a.volume<goal) a.volume=safeMediaVolume(Math.min(goal,a.volume+rate));
    else if(a.volume>goal) a.volume=safeMediaVolume(Math.max(0,a.volume-rate));
    if(k===want){
      const lp=MUSIC.tightLoops&&MUSIC.tightLoops[k];
      if(lp && isFinite(a.duration) && a.duration>1 && a.currentTime>=a.duration-(lp.endPad||0)){
        try{ a.currentTime=lp.start||0; }catch(e){}
      }
      if(a.paused){ try{ const p=a.play(); if(p&&p.catch)p.catch(()=>{}); }catch(e){} }
    }else if(a.volume<=0.002 && !a.paused){
      try{ a.pause(); }catch(e){}
    }
  }
}
// 디버그: 콘솔에서 현재 BGM 상태 확인 (window.__bgmDebug())
if(typeof window!=='undefined') window.__bgmDebug=function(){
  const playing=Object.keys(MUSIC.tracks).filter(k=>{const a=MUSIC.tracks[k];return a&&!a.paused&&(a.volume||0)>0.01;}).map(k=>k+'('+(MUSIC.tracks[k].volume||0).toFixed(2)+')');
  const info={want:__bgmLastWant, playing, failed:Object.keys(MUSIC.failed)};
  console.log('[BGM] want='+info.want+' | playing='+(playing.join(', ')||'none')+' | failed='+(info.failed.join(', ')||'none'));
  return info;
};


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

// ===== JS: Data tables - difficulty, relics =====
let minionPool=null;
let tutorial=null;
let tutorialMode=false, tutorialDoneFlag=false;
let floatBubbles=[]; // 적이 사라진 자리에 잠시 떠 있는 말풍선
let lastKiller=null; // 마지막으로 플레이어를 죽인 대상 이름
let pendingLevels=0;

const DB_DISCOVERY_KEY = "btv_database_discovered";
const DB_DISCOVERY_TYPES = ['enemies','bosses','relics','potions','perks'];
function emptyDbDiscovered(){
  return {enemies:[],bosses:[],relics:[],potions:[],perks:[]};
}
function normalizeDbDiscovered(data){
  const base=emptyDbDiscovered();
  DB_DISCOVERY_TYPES.forEach(type=>{
    const arr=Array.isArray(data&&data[type])?data[type]:[];
    const seen=new Set();
    base[type]=arr.map(id=>String(id||'')).filter(id=>{
      if(!id || seen.has(id)) return false;
      if(type==='enemies' && DB_HIDDEN_ENEMY_IDS.has(id)) return false;
      if(type==='bosses' && DB_HIDDEN_BOSS_KEYS.has(id)) return false;
      seen.add(id);
      return true;
    });
  });
  return base;
}
function loadDbDiscovered(){
  try{
    return normalizeDbDiscovered(JSON.parse(localStorage.getItem(DB_DISCOVERY_KEY)||'{}'));
  }catch(e){
    console.warn('database discovery load failed',e);
    return emptyDbDiscovered();
  }
}
let dbDiscovered=loadDbDiscovered();
function saveDbDiscovered(){
  try{
    dbDiscovered=normalizeDbDiscovered(dbDiscovered);
    localStorage.setItem(DB_DISCOVERY_KEY, JSON.stringify(dbDiscovered));
  }catch(e){
    console.warn('database discovery save failed',e);
  }
}
function markDiscovered(type,id){
  if(DB_DISCOVERY_TYPES.indexOf(type)<0 || !id) return false;
  const key=String(id);
  if(type==='enemies' && DB_HIDDEN_ENEMY_IDS.has(key)) return false;
  if(type==='bosses' && DB_HIDDEN_BOSS_KEYS.has(key)) return false;
  if(!Array.isArray(dbDiscovered[type])) dbDiscovered[type]=[];
  if(dbDiscovered[type].indexOf(key)>=0) return false;
  dbDiscovered[type].push(key);
  saveDbDiscovered();
  return true;
}
function isDiscovered(type,id){
  if(DB_DISCOVERY_TYPES.indexOf(type)<0 || !id) return false;
  const arr=Array.isArray(dbDiscovered[type])?dbDiscovered[type]:[];
  return arr.indexOf(String(id))>=0;
}
// ---------- 난이도 ----------
const DIFFS={
  easy:  {key:'easy',  label:'쉬움',   hp:1.3, dmg:1.25,cnt:1.1, spd:1.00, eliteCount:2, col:'#5dff9b', desc:'적 체력 x1.3 · 공격 x1.25 · 수 x1.1 · 속도 x1.0 · 정예 2 · 재도전 무제한', maxRetries:Infinity},
  normal:{key:'normal',label:'보통',   hp:2.2, dmg:2.1, cnt:1.45,spd:1.13, eliteCount:3, col:'#ffd34d', desc:'적 체력 x2.2 · 공격 x2.1 · 수 x1.45 · 속도 x1.13 · 정예 3 · 재도전 3회', maxRetries:3},
  hard:  {key:'hard',  label:'어려움', hp:2.9, dmg:2.7, cnt:1.7, spd:1.22, eliteCount:5, col:'#ff4d6d', desc:'적 체력 x2.9 · 공격 x2.7 · 수 x1.7 · 속도 x1.22 · 정예 5 · 재도전 1회', maxRetries:1},
};
let diffSet=DIFFS.easy;
function grantRetryCharge(amount = 1, sourceLabel = '재도전권'){
  if(diffSet.maxRetries === Infinity) return false;
  diffSet=Object.assign({},diffSet,{maxRetries:diffSet.maxRetries+amount});
  updateHUD();
  return true;
}
let dodgeLatch=false;   // 회피 키 엣지 감지: 스페이스를 떼야 다음 회피 발동
function enforceFixedMaxHp(p){
  if(!p || !p.fixedMaxHp) return;
  const fixed=Math.max(1,Math.round(Number(p.fixedMaxHp)||1));
  p.fixedMaxHp=fixed;
  p.maxhp=fixed;
  p.hp=Math.min(Math.max(1,Math.round(Number(p.hp)||fixed)),fixed);
}
function setFixedMaxHp(p,value){
  if(!p) return;
  p.fixedMaxHp=Math.max(1,Math.round(Number(value)||1));
  enforceFixedMaxHp(p);
}
function applyRelicToPlayer(r,p){
  if(!r || !p || typeof r.apply!=='function') return;
  const hadFixed=!!p.fixedMaxHp;
  const beforeMax=Number(p.maxhp)||0;
  const beforeHp=Number(p.hp)||0;
  r.apply(p);
  if(hadFixed && Number(p.maxhp)!==beforeMax) p.hp=Math.min(beforeHp,p.fixedMaxHp||beforeHp);
  enforceFixedMaxHp(p);
}

// 유물 풀 (병맛 + 효과)
const RELICS=[
  // ===== 축복: 화력 =====
  {id:"coupon",name:"사장님이 미쳤어요 쿠폰",icon:"🏷️",desc:"공격력 +6.",cls:"boon",apply:p=>{p.dmg+=6;}},
  {id:"sniper",name:"저격수의 집중",icon:"🎯",desc:"공격력 +7, 발사 속도 -12%.",cls:"boon",apply:p=>{p.dmg+=7;p.fireAdd-=0.12;}},
  {id:"heavy_cal",name:"대구경 탄두",icon:"🧱",desc:"공격력 +6, 탄 크기 +25%, 탄속 -10%.",cls:"boon",apply:p=>{p.dmg+=6;p.bulletSize+=0.25;p.bulletSpeedMul-=0.10;}},
  {id:"bignuke",name:"분노의 대왕탄",icon:"💥",desc:"탄 크기 +20%, 공격력 +7, 발사 속도 -10%.",cls:"boon",apply:p=>{p.bulletSize+=0.20;p.dmg+=7;p.fireAdd-=0.10;}},
  {id:"giant_slayer",name:"거인 사냥꾼",icon:"🗡️",desc:"보스 피해 +30%.",cls:"boon",apply:p=>{p.bossDmgMul+=0.30;}},
  // ===== 축복: 치명타 =====
  {id:"crit_glasses",name:"정밀 조준경",icon:"🔍",desc:"치명타 확률 +30%.",cls:"boon",apply:p=>{p.critChance+=0.30;}},
  {id:"crit_hammer",name:"한 방 망치",icon:"🔨",desc:"치명타 피해 +100% (1.5배→2.5배).",cls:"boon",apply:p=>{p.critMult+=1;}},
  {id:"clover",name:"네잎클로버",icon:"🍀",desc:"치명타 +15%, 골드 +30%.",cls:"boon",apply:p=>{p.critChance+=0.15;p.goldMul+=0.30;}},
  // ===== 축복: 연사/투사체 =====
  {id:"redbull",name:"수상한 에너지드링크",icon:"🥤",desc:"발사속도 +40%.",cls:"boon",apply:p=>{p.fireAdd+=0.40;}},
  {id:"adrenaline",name:"아드레날린 주사",icon:"💉",desc:"발사 속도 +20%, 이동 속도 +15%.",cls:"boon",apply:p=>{p.fireAdd+=0.20;p.moveSpeedAdd+=0.15;}},
  {id:"speed_bullet",name:"가속 탄두",icon:"⚡",desc:"투사체 속도 +50%, 공격력 +3.",cls:"boon",apply:p=>{p.bulletSpeedMul+=0.50;p.dmg+=3;}},
  {id:"fork",name:"세 갈래 포크",icon:"🍴",desc:"투사체 +1발, 공격력 +3.",cls:"boon",apply:p=>{p.shots+=1;p.dmg+=3;}},
  {id:"harpoon",name:"사두 작살",icon:"🔱",desc:"투사체 +2발, 공격력 +1.5.",cls:"boon",apply:p=>{p.shots+=2;p.dmg+=1.5;}},
  {id:"back_gun",name:"백발백중 등총",icon:"🔙",desc:"뒤로도 한 발 발사, 공격력 +2.5.",cls:"boon",apply:p=>{p.backShot=true;p.dmg+=2.5;}},
  {id:"homing_eye",name:"유도의 눈",icon:"👁️",desc:"투사체가 적을 따라간다. (호밍 3)",cls:"boon",apply:p=>{p.homing=Math.max(Number(p.homing)||0,3);}},
  {id:"super_bouncy",name:"슈퍼 탱탱볼",icon:"🟣",desc:"투사체 벽 튕김 +2.",cls:"boon",apply:p=>{p.bounce+=2;}},
  {id:"skewer",name:"꼬치 막대기",icon:"🍢",desc:"투사체가 적 1명을 관통.",cls:"boon",apply:p=>{p.pierce+=1;}},
  {id:"long_skewer",name:"긴 꼬치",icon:"🍡",desc:"관통 +3, 공격력 +4.",cls:"boon",apply:p=>{p.pierce+=3;p.dmg+=4;}},
  // ===== 축복: 군중제어/폭발 =====
  {id:"stun_bell",name:"기절의 종",icon:"🔔",desc:"명중 시 15% 확률로 적 기절.",cls:"boon",apply:p=>{p.stunChance+=0.15;}},
  // ===== 축복: 생존 =====
  {id:"bread",name:"곰팡이 핀 식빵",icon:"🍞",desc:"최대 체력 +25.",cls:"boon",apply:p=>{p.maxhp+=25;p.hp+=25;}},
  {id:"big_heart",name:"거대한 심장",icon:"❤️‍🔥",desc:"최대 체력 +40.",cls:"boon",apply:p=>{p.maxhp+=40;p.hp+=40;}},
  {id:"nature_bless",name:"자연의 가호",icon:"🌿",desc:"초당 체력 +1.0 재생.",cls:"boon",apply:p=>{p.regen+=1.0;}},
  {id:"iron_skin",name:"강철 피부",icon:"🪨",desc:"받는 피해 -15%.",cls:"boon",apply:p=>{p.armor+=0.15;}},
  {id:"vampire",name:"모기향(역효과)",icon:"🦟",desc:"처치 시 8% 확률로 체력 5 회복.",cls:"boon",apply:p=>{p.lifesteal+=0.08;}},
  {id:"vampire_fang",name:"흡혈귀 송곳니",icon:"🧛",desc:"처치 시 18% 확률로 체력 5 회복.",cls:"boon",apply:p=>{p.lifesteal+=0.18;}},
  // ===== 축복: 기동/유틸 =====
  {id:"sneaker",name:"한 짝뿐인 운동화",icon:"👟",desc:"이동 속도 +18%.",cls:"boon",apply:p=>{p.moveSpeedAdd+=0.18;}},
  {id:"roll_master",name:"베인Q 숙련",icon:"🌀",desc:"회피 쿨타임 -25%.",cls:"boon",apply:p=>{p.dodgeCdMul-=0.25;}},
  {id:"gold_pig",name:"황금 돼지 저금통",icon:"🐷",desc:"골드 획득량 +30%.",cls:"boon",apply:p=>{p.goldMul+=0.30;}},
  {id:"xp_book",name:"경험의 서",icon:"📖",desc:"경험치 획득량 +20%.",cls:"boon",apply:p=>{p.xpMul+=0.20;}},
  {id:"potion_belt",name:"비상용 물약 벨트",icon:"🧪",desc:"즉시 랜덤 포션 1개 획득.",cls:"boon",apply:p=>{addPotion(rollPotion());}},
  {id:"kijo_mask",name:"키죠의 가면",icon:"🎭",desc:"보스 피해 +45%.",cls:"boon",apply:p=>{p.bossDmgMul+=0.45;}},
  {id:"viewer_slayer_mic",name:"시청자 학살자의 마이크",icon:"🎤",desc:"처치 시 6% 확률 폭발(피해 50, 내부쿨 0.15초).",cls:"boon",apply:p=>{p.killBurstChance+=0.06;p.killBurstDmg+=50;}},
  {id:"abstinence_chalice",name:"금욕의 성배",icon:"🏆",desc:"포션 0개 보유 시 공격력 +10.",cls:"boon",apply:p=>{p.noPotionAtkFlat=10;}},
  {id:"hyechul_egg",name:"혜철이의 알",icon:"🥚",desc:"방 입장 시 체력 20 회복.",cls:"boon",apply:p=>{p.roomEntryHeal+=20;}},
  {id:"yanggaeng_black_thread",name:"박제인의 검은 실",icon:"🧵",desc:"상태이상 피해 +30%.",cls:"boon",apply:p=>{p.statusDotDmgMul+=0.30;}},
  {id:"seungwoo_broken_monitor",name:"승우의 깨진 모니터",icon:"📺",desc:"공격력 +9, 치명타 확률 +20%.",cls:"boon",apply:p=>{p.dmg+=9;p.critChance+=0.20;}},
  {id:"moving_afterimage",name:"무빙의 잔상",icon:"💨",desc:"이동속도 +25%, 회피 쿨타임 -20%.",cls:"boon",apply:p=>{p.moveSpeedAdd+=0.25;p.dodgeCdMul-=0.20;}},
  {id:"clutch_heart",name:"딸피의 심장",icon:"🫀",desc:"체력 30% 이하일 때 공격력 +8.",cls:"boon",apply:p=>{p.lowHpAtkFlat=(Number(p.lowHpAtkFlat)||0)+8;}},
  {id:"clip_dodge_instinct",name:"클립각 회피본능",icon:"🎬",desc:"회피 쿨타임 -25%. Q 직후 무적 시간이 조금 증가.",cls:"boon",apply:p=>{p.dodgeCdMul-=0.25;p.dodgeIframeBonus+=0.12;}},
  {id:"collector_showcase",name:"수집가의 진열장",icon:"🗃️",desc:"공격력 +9, 골드 획득량 +40%.",cls:"boon",apply:p=>{p.dmg+=9;p.goldMul+=0.40;}},
  {id:"mythic_vault",name:"신화 보관함",icon:"🧰",desc:"치명타 확률 +30%, 치명타 피해 +40%.",cls:"boon",apply:p=>{p.critChance+=0.30;p.critMult+=0.40;}},
  {id:"curse_crown",name:"저주의 왕관",icon:"👑",desc:"공격력 +15. 받는 피해 +30%.",cls:"curse",apply:p=>{p.dmg+=15;p.damageTakenMul+=0.30;}},
  {id:"direction_compass",name:"방향성 나침반",icon:"🧭",desc:"경험치 획득량 +30%, 이동속도 +10%.",cls:"boon",apply:p=>{p.xpMul+=0.30;p.moveSpeedAdd+=0.10;}},
  {id:"whale_card",name:"큰손 카드",icon:"💳",desc:"상점 가격 -20%, 골드 획득량 +20%.",cls:"boon",apply:p=>{p.shopCostMul-=0.20;p.goldMul+=0.20;}},
  {id:"no_spend_wallet",name:"무소비의 지갑",icon:"👛",desc:"골드 획득량 +35%.",cls:"boon",apply:p=>{p.goldMul+=0.35;}},
  {id:"hardcore_transmitter",name:"하드코어 송출기",icon:"📡",desc:"보스 피해 +45%, 공격력 +7.",cls:"boon",apply:p=>{p.bossDmgMul+=0.45;p.dmg+=7;}},
  {id:"nohit_wings",name:"무피격의 날개",icon:"🪽",desc:"이동속도 +40%, 회피 쿨타임 -20%.",cls:"boon",apply:p=>{p.moveSpeedAdd+=0.40;p.dodgeCdMul-=0.20;}},
  {id:"bizarre_mask",name:"기괴한 가면",icon:"🎭",desc:"공격력 +12, 관통 +1.",cls:"boon",apply:p=>{p.dmg+=12;p.pierce+=1;}},
  {id:"void_heart",name:"공허의 심장",icon:"🌑",desc:"공격력 +12, 치명타 확률 +20%.",cls:"boon",apply:p=>{p.dmg+=12;p.critChance+=0.20;}},
  {id:"guardian_shield",name:"수호자의 방패",icon:"🛡️",desc:"받는 피해 -25%.",cls:"boon",apply:p=>{p.armor+=0.25;}},
  {id:"greed_ring",name:"탐욕의 반지",icon:"💎",desc:"골드 획득량 +50%. 상점 가격 +20%.",cls:"boon",apply:p=>{p.goldMul+=0.5;p.shopCostMul+=0.20;}},
  {id:"time_warp",name:"시간 왜곡기",icon:"🔄",desc:"레벨업 시 체력 완전 회복.",cls:"boon",apply:p=>{p.levelFullHeal=true;}},
  {id:"old_boots",name:"낡은 군화",icon:"🥾",desc:"이동속도 +15%.",cls:"boon",apply:p=>{p.moveSpeedAdd+=0.15;}},
  {id:"strange_mushroom",name:"이상한 버섯",icon:"🍄",desc:"받는 피해 -10%.",cls:"boon",apply:p=>{p.armor+=0.1;}},
  {id:"hunters_eye",name:"사냥꾼의 눈",icon:"🎯",desc:"치명타 확률 +15%.",cls:"boon",apply:p=>{p.critChance+=0.15;}},
  {id:"med_kit",name:"응급 키트",icon:"📦",desc:"방 입장 시 체력 10 회복.",cls:"boon",apply:p=>{p.roomEntryHeal+=10;}},
  // ===== 저주: 양날의 검 =====
  {id:"glass",name:"유리 대포",icon:"🔮",desc:"공격력 +18. 최대 체력 -40%.",cls:"curse",apply:p=>{p.dmg+=18;p.maxhp=Math.round(p.maxhp*0.6);p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"berserk",name:"광전사의 분노",icon:"🩸",desc:"공격력 +9. 받는 피해 +20%.",cls:"curse",apply:p=>{p.dmg+=9;p.damageTakenMul+=0.20;}},
  {id:"heavy_ammo",name:"무거운 탄약",icon:"🏋️",desc:"공격력 +8.5. 이동 속도 -20%.",cls:"curse",apply:p=>{p.dmg+=8.5;p.moveSpeedAdd-=0.20;}},
  {id:"hair_trigger",name:"예민한 방아쇠",icon:"🔫",desc:"발사 속도 +45%. 탄 크기 -25%.",cls:"curse",apply:p=>{p.fireAdd+=0.45;p.bulletSize-=0.25;}},
  {id:"recoil",name:"강한 반동",icon:"🌪️",desc:"발사 속도 +40%. 가끔 오발.",cls:"curse",apply:p=>{p.fireAdd+=0.40;p.misfire=true;}},
  {id:"one_shot",name:"모 아니면 도",icon:"💀",desc:"공격력 +19. 최대 체력 100 고정.",cls:"curse",apply:p=>{p.dmg+=19;setFixedMaxHp(p,100);}},
  {id:"thin_glass",name:"더 얇은 유리",icon:"🪟",desc:"치명타 +30%. 받는 피해 +25%.",cls:"curse",apply:p=>{p.critChance+=0.3;p.damageTakenMul+=0.25;}},
  {id:"time_bomb",name:"시한폭탄 심장",icon:"⏱️",desc:"공격력 +9. 초당 체력 -1.",cls:"curse",apply:p=>{p.dmg+=9;p.regen-=1;}},
  {id:"greed",name:"탐욕의 손",icon:"🤑",desc:"골드 획득량 +50%.",cls:"boon",apply:p=>{p.goldMul+=0.50;}},
  {id:"slippery",name:"미끄러운 신발",icon:"🧊",desc:"이동속도 +30%. 베인Q 쿨 +50%.",cls:"curse",apply:p=>{p.moveSpeedAdd+=0.30;p.dodgeCdMul+=0.50;}},
  {id:"glass_legs",name:"유리 다리",icon:"🦵",desc:"이동 속도 +30%. 최대 체력 -20%.",cls:"curse",apply:p=>{p.moveSpeedAdd+=0.30;p.maxhp=Math.round(p.maxhp*0.8);p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"turtle",name:"거북이 등딱지",icon:"🐢",desc:"받는 피해 -15%. 이동 속도 -10%.",cls:"curse",apply:p=>{p.armor+=0.15;p.moveSpeedAdd-=0.10;}},
  {id:"all_in",name:"올인",icon:"🎰",desc:"공격력 +10. 받는 피해 +20%.",cls:"curse",apply:p=>{p.dmg+=10;p.damageTakenMul+=0.20;}},
  {id:"gamble",name:"도박꾼의 주사위",icon:"🎲",desc:"매 발사 공격력 0.6~1.8배 도박.",cls:"curse",apply:p=>{p.gamble=true;}},
  {id:"cursed_mask",name:"저주받은 가면",icon:"👺",desc:"공격력 +6.5, 발사속도 +10%, 이동속도 +10%, 초당 체력 -0.6.",cls:"curse",apply:p=>{p.dmg+=6.5;p.fireAdd+=0.10;p.moveSpeedAdd+=0.10;p.regen-=0.6;}},
  {id:"demon_contract",name:"악마의 계약",icon:"👹",desc:"공격력 +13. 받는 피해 +30%.",cls:"curse",apply:p=>{p.dmg+=13;p.damageTakenMul+=0.30;}},
  {id:"death_oath",name:"죽음의 서약",icon:"💀",desc:"투사체 +2발. 최대 체력 -25%.",cls:"curse",apply:p=>{p.shots+=2;p.maxhp=Math.max(1,Math.round(p.maxhp*0.75));p.hp=Math.min(p.hp,p.maxhp);}},
  {id:"blood_thirst",name:"피의 갈증",icon:"🩸",desc:"적 처치 시 체력 5 회복. 최대 체력 -25%.",cls:"curse",apply:p=>{p.healOnKill+=5;p.maxhp=Math.max(1,Math.round(p.maxhp*0.75));p.hp=Math.min(p.hp,p.maxhp);}},
];
// ---------- 유물 등급 ----------
const TIERS={
  common: {name:'커먼',   col:'#d7e0ea', weight:70, costMul:0.8, glow:0},
  rare:   {name:'레어',   col:'#8be8ff', weight:45, costMul:1.0, glow:0},
  epic:   {name:'에픽',   col:'#c98bff', weight:22, costMul:1.4, glow:0},
  legend: {name:'전설',   col:'#ffd34d', weight:8,  costMul:2.0, glow:1},
  mythic: {name:'신화',   col:'#ffae42', weight:3,  costMul:3.0, glow:2},
};
const _COMMON=['bread','back_gun','potion_belt','vampire','gold_pig','xp_book','old_boots','strange_mushroom','med_kit'];
const _RARE=['adrenaline','roll_master','sneaker','glass_legs','turtle','slippery','speed_bullet','hunters_eye','blood_thirst','super_bouncy','greed','nature_bless','skewer','big_heart'];
const _EPIC=['coupon','sniper','heavy_cal','bignuke','crit_glasses','clover','iron_skin','vampire_fang','berserk','heavy_ammo','hair_trigger','recoil','thin_glass','time_bomb','gamble','cursed_mask','giant_slayer','hyechul_egg','moving_afterimage','clutch_heart','direction_compass','whale_card','no_spend_wallet','viewer_slayer_mic','all_in'];
const _LEGEND=['fork','redbull','long_skewer','stun_bell','kijo_mask','abstinence_chalice','yanggaeng_black_thread','seungwoo_broken_monitor','clip_dodge_instinct','collector_showcase','nohit_wings','guardian_shield','greed_ring','time_warp','demon_contract','death_oath'];
const _MYTHIC=['harpoon','homing_eye','one_shot','glass','mythic_vault','curse_crown','bizarre_mask','void_heart','crit_hammer','hardcore_transmitter'];
const TIER_OF={};
RELICS.forEach(r=>{ TIER_OF[r.id]=_MYTHIC.includes(r.id)?'mythic':_LEGEND.includes(r.id)?'legend':_EPIC.includes(r.id)?'epic':_RARE.includes(r.id)?'rare':_COMMON.includes(r.id)?'common':'rare'; });
const REMOVED_RELIC_IDS=new Set([
  'magnet','ricochet','front_shield','giant_magnet','comeback','blood_chalice',
  'chain_bomb','cheat','chat_window_grinder','explosive_rounds','lightning_bottle'
]);
function relicById(id){ return (RELICS||[]).find(r=>r&&r.id===id&&!REMOVED_RELIC_IDS.has(id))||null; }
function sanitizeStoredRelicIds(ids){ return Array.isArray(ids)?ids.filter(id=>id && !!relicById(id)):[]; }
function relicTier(r){ return TIERS[TIER_OF[r.id]||'rare']; }
function relicWeight(r){ return relicTier(r).weight; }
function weightedTake(arr,weightFn){
  const getWeight=weightFn||relicWeight;
  let total=0; for(const r of arr) total+=Math.max(0,getWeight(r));
  if(total<=0) return arr.splice(irand(0,arr.length-1),1)[0];
  let roll=Math.random()*total;
  for(let i=0;i<arr.length;i++){ roll-=Math.max(0,getWeight(arr[i])); if(roll<=0) return arr.splice(i,1)[0]; }
  return arr.splice(arr.length-1,1)[0];
}
const BOSS_RELIC_WEIGHTS={common:0,rare:24,epic:30,legend:22,mythic:12};
function relicOfferWeight(r,opts){
  const tier=TIER_OF[r.id]||'rare';
  return opts&&opts.weights&&opts.weights[tier]!=null?opts.weights[tier]:relicWeight(r);
}
// 16×16 픽셀 그리드 → data URL 렌더 (업로드된 픽셀아트 세트)
function pixNormName(s){ return (s||'').replace(/\s+/g,''); }
function miniPixelIconData(name,c,c2,mark){
  const rows=[
    '................',
    '.....kkkkkk.....',
    '...kkbbbbbbkk...',
    '..kbbbbbbbbbbk..',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '..kbbbbbbbbbbk..',
    '...kkbbbbbbkk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................'
  ].map(r=>r.split(''));
  const set=(x,y,ch)=>{ if(x>=0&&x<16&&y>=0&&y<16) rows[y][x]=ch; };
  const rect=(x,y,w,h,ch)=>{ for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) set(xx,yy,ch); };
  const line=(x1,y1,x2,y2,ch)=>{
    let dx=Math.abs(x2-x1), sx=x1<x2?1:-1, dy=-Math.abs(y2-y1), sy=y1<y2?1:-1, err=dx+dy;
    while(true){ set(x1,y1,ch); if(x1===x2&&y1===y2) break; const e2=2*err; if(e2>=dy){ err+=dy; x1+=sx; } if(e2<=dx){ err+=dx; y1+=sy; } }
  };
  const plus=(x,y,ch)=>{ rect(x-1,y,3,1,ch); rect(x,y-1,1,3,ch); };
  switch(mark){
    case 'flame': line(7,3,5,8,'y'); line(8,3,10,8,'r'); rect(5,8,6,3,'r'); rect(7,6,2,5,'y'); break;
    case 'bolt': line(9,3,6,7,'y'); line(6,7,9,7,'y'); line(9,7,6,12,'y'); break;
    case 'heart': rect(4,5,3,2,'r'); rect(9,5,3,2,'r'); rect(4,7,8,2,'r'); rect(5,9,6,1,'r'); rect(6,10,4,1,'r'); rect(7,11,2,1,'r'); break;
    case 'cup': rect(4,4,8,5,'y'); rect(5,9,6,1,'y'); rect(7,10,2,2,'y'); rect(5,12,6,1,'y'); rect(6,5,4,2,'w'); break;
    case 'mask': rect(4,5,3,2,'w'); rect(9,5,3,2,'w'); set(5,6,'k'); set(10,6,'k'); rect(6,9,4,1,'r'); break;
    case 'mic': rect(6,3,4,6,'w'); rect(7,9,2,3,'y'); rect(5,12,6,1,'y'); rect(6,5,4,1,'k'); break;
    case 'scroll': rect(4,4,8,8,'w'); line(6,6,10,6,'d'); line(6,8,11,8,'d'); line(6,10,9,10,'d'); set(5,5,'r'); break;
    case 'egg': rect(6,3,4,1,'w'); rect(5,4,6,2,'w'); rect(4,6,8,4,'w'); rect(5,10,6,2,'w'); set(8,5,'y'); set(7,8,'y'); break;
    case 'thread': line(3,10,12,4,'h'); line(4,4,12,11,'h'); set(6,7,'y'); set(10,7,'y'); break;
    case 'monitor': rect(3,4,10,7,'d'); rect(4,5,8,5,'h'); line(8,5,6,10,'r'); rect(6,12,4,1,'d'); break;
    case 'wind': line(3,5,11,5,'h'); line(5,8,13,8,'h'); line(2,11,9,11,'h'); set(12,4,'w'); set(10,7,'w'); break;
    case 'film': rect(3,4,10,8,'d'); rect(5,5,6,6,'h'); for(let y=5;y<11;y+=2){ set(4,y,'k'); set(11,y,'k'); } break;
    case 'case': rect(4,5,8,6,'y'); rect(6,3,4,2,'y'); line(4,7,11,7,'d'); break;
    case 'vault': rect(4,4,8,8,'d'); rect(6,6,4,4,'h'); plus(8,8,'y'); break;
    case 'crown': rect(4,8,8,3,'y'); set(4,7,'y'); set(7,5,'y'); set(11,7,'y'); set(5,6,'y'); set(10,6,'y'); break;
    case 'compass': line(8,3,12,8,'y'); line(12,8,8,12,'y'); line(8,12,4,8,'y'); line(4,8,8,3,'y'); line(8,5,7,10,'w'); break;
    case 'card': rect(4,4,8,8,'w'); line(5,6,10,6,'y'); set(6,9,'r'); set(9,9,'r'); break;
    case 'wallet': rect(3,6,10,5,'d'); rect(5,4,7,3,'y'); set(11,8,'y'); break;
    case 'tower': rect(7,4,2,8,'d'); line(4,3,8,6,'h'); line(12,3,8,6,'h'); plus(8,3,'y'); break;
    case 'wing': line(7,8,3,4,'w'); line(7,8,3,10,'w'); line(9,8,13,4,'w'); line(9,8,13,10,'w'); line(5,6,3,8,'h'); line(11,6,13,8,'h'); break;
    case 'bottle': rect(6,3,4,2,'d'); rect(5,5,6,7,'h'); line(9,6,7,9,'y'); line(7,9,10,9,'y'); break;
    case 'shield': rect(5,4,6,5,'h'); rect(6,9,4,2,'h'); set(7,11,'h'); set(8,11,'h'); line(8,4,8,11,'w'); break;
    case 'ring': rect(5,5,6,2,'y'); rect(4,7,2,4,'y'); rect(10,7,2,4,'y'); rect(6,11,4,1,'y'); rect(7,7,2,3,'k'); break;
    case 'bullet': rect(5,6,7,4,'y'); rect(4,7,1,2,'w'); set(12,7,'r'); set(12,8,'r'); break;
    case 'clock': rect(5,4,6,1,'y'); rect(4,5,8,6,'y'); rect(5,11,6,1,'y'); line(8,7,8,5,'w'); line(8,7,10,9,'w'); break;
    case 'boot': rect(5,4,4,7,'d'); rect(5,10,7,2,'d'); rect(9,8,2,2,'h'); break;
    case 'mushroom': rect(4,5,8,3,'r'); rect(5,4,6,1,'r'); rect(7,8,3,4,'w'); set(5,6,'w'); set(10,6,'w'); break;
    case 'eye': line(3,8,6,5,'w'); line(6,5,10,5,'w'); line(10,5,13,8,'w'); line(3,8,6,11,'w'); line(6,11,10,11,'w'); line(10,11,13,8,'w'); rect(7,7,2,2,'h'); set(8,8,'k'); break;
    case 'kit': rect(4,5,8,6,'w'); rect(6,3,4,2,'w'); plus(8,8,'r'); break;
    case 'keyboard': rect(3,5,10,6,'d'); for(let y=6;y<10;y+=2) for(let x=4;x<12;x+=2) set(x,y,'w'); break;
    case 'contract': rect(5,3,7,9,'w'); line(7,6,11,6,'d'); line(7,8,10,8,'d'); line(7,10,11,10,'d'); set(5,4,'r'); break;
    case 'skull': rect(5,4,6,5,'w'); rect(6,9,4,3,'w'); set(6,6,'k'); set(9,6,'k'); set(8,8,'k'); break;
    case 'fang': line(5,4,7,12,'w'); line(10,4,8,12,'w'); set(7,12,'r'); set(8,12,'r'); break;
    case 'void': rect(6,5,4,4,'p'); line(8,3,8,11,'h'); line(4,8,12,8,'h'); set(8,8,'k'); break;
    case 'coin': rect(5,4,6,8,'y'); line(8,5,8,10,'w'); set(7,6,'w'); set(9,9,'w'); break;
    case 'knife': line(4,11,12,3,'w'); line(5,12,13,4,'d'); rect(3,11,3,2,'y'); break;
    case 'shotgun': rect(4,7,8,2,'d'); rect(10,6,3,1,'y'); rect(5,9,3,2,'y'); break;
    case 'barrage': for(let y=4;y<=10;y+=3){ line(4,y,12,y,'y'); set(13,y,'w'); } break;
    case 'corrode': rect(5,5,2,2,'g'); rect(9,4,3,3,'g'); rect(7,9,4,2,'g'); line(4,11,12,11,'h'); break;
    case 'reload': line(5,5,10,5,'h'); line(10,5,12,8,'h'); line(12,8,9,11,'h'); line(9,11,5,10,'h'); set(11,6,'y'); set(12,6,'y'); break;
    case 'dodge': line(4,5,11,5,'h'); line(3,8,10,8,'w'); line(5,11,12,11,'h'); break;
    case 'regen': plus(8,8,'g'); line(6,5,9,3,'h'); line(10,5,12,4,'h'); break;
    case 'invest': line(4,11,7,8,'y'); line(7,8,9,9,'y'); line(9,9,12,5,'y'); set(12,5,'w'); break;
    case 'glass': line(4,4,11,11,'w'); line(11,4,5,10,'h'); line(8,3,8,12,'r'); break;
    default: plus(8,8,'y'); line(5,5,11,11,'h'); break;
  }
  return {n:name,p:{k:'#090816',b:c,h:c2,w:'#f7fdff',y:'#ffd44f',r:'#ff5f7e',d:'#4b3b63',g:'#76d36a',p:'#7a54ff'},g:rows.map(r=>r.join(''))};
}
const MINI_PIX_SRC_CACHE={};
function miniPixelIconSrc(c,c2,mark){
  const key=c+'|'+c2+'|'+mark;
  if(MINI_PIX_SRC_CACHE[key]) return MINI_PIX_SRC_CACHE[key];
  const d=miniPixelIconData('',c,c2,mark), cv=document.createElement('canvas'); cv.width=16; cv.height=16;
  const cx=cv.getContext('2d');
  d.g.forEach((row,y)=>{ for(let x=0;x<16;x++){ const ch=row[x]; if(ch&&ch!=='.'&&d.p[ch]){ cx.fillStyle=d.p[ch]; cx.fillRect(x,y,1,1); } } });
  return MINI_PIX_SRC_CACHE[key]=cv.toDataURL('image/png');
}
EXTRA_RELIC_PIX.forEach(([n,c,c2,m])=>{ if(!RELIC_PIXDATA.some(d=>pixNormName(d.n)===pixNormName(n))) RELIC_PIXDATA.push(miniPixelIconData(n,c,c2,m)); });
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

const RELIC_RARITY_CLASS={common:'common',rare:'rare',epic:'epic',legend:'legendary',mythic:'mythic',curse:'curse'};
let relicTooltipEl=null;
let relicTooltipTarget=null;
let relicTooltipTimer=0;
let relicTooltipHideTimer=0;
let relicTooltipPoint={x:0,y:0};
const TooltipManager={
  active:null,
  setActive(kind){
    if(this.active&&this.active!==kind){
      if(this.active==='relic'&&typeof hideRelicTooltip==='function') hideRelicTooltip(true);
      if(this.active==='special'&&typeof hideSpecialEffectTooltip==='function') hideSpecialEffectTooltip(true);
      if(this.active==='training'&&typeof hideTrainingTooltip==='function') hideTrainingTooltip(true);
      if(this.active==='stat'&&typeof hideStatTooltip==='function') hideStatTooltip(true);
    }
    this.active=kind||null;
  },
  clear(kind){
    if(!kind||this.active===kind) this.active=null;
  },
  hideAll(){
    if(typeof hideRelicTooltip==='function') hideRelicTooltip(true);
    if(typeof hideSpecialEffectTooltip==='function') hideSpecialEffectTooltip(true);
    if(typeof hideTrainingTooltip==='function') hideTrainingTooltip(true);
    if(typeof hideStatTooltip==='function') hideStatTooltip(true);
    this.active=null;
  }
};

function getRelicById(relicId){
  return relicById(relicId);
}
function relicRarityKey(r){
  return TIER_OF[r&&r.id]||'rare';
}
function relicRarityClass(r){
  return 'rarity-'+(RELIC_RARITY_CLASS[relicRarityKey(r)]||'rare');
}
function fmtRelicPct(n){
  const v=Math.round((Number(n)||0)*100);
  return (v>0?'+':'')+v+'%';
}
function relicShortLine(r){
  const desc=String(r&&r.desc||'').trim();
  if(!desc) return '유물 효과 적용';
  return desc.replace(/\s+/g,' ').trim();
}
function relicDetailText(r){
  const hay=((r&&r.name)||'')+' '+((r&&r.desc)||'');
  const bits=[];
  if(/골드|금화|탐욕/.test(hay)) bits.push('골드 획득 보너스와 합산되어 전투 보상에 반영됩니다.');
  if(/공격|피해|대미지|딜|보스/.test(hay)) bits.push('공격 관련 보너스는 현재 화력 계산에 합산되어 적용됩니다.');
  if(/치명타|크리/.test(hay)) bits.push('치명타 확률 또는 치명타 피해 계수에 반영되는 전투 강화 유물입니다.');
  if(/이동|속도|신발|군화|잔상/.test(hay)) bits.push('이동 관련 보너스는 현재 이동 속도 계산에 즉시 반영됩니다.');
  if(/발사|연사|투사체|탄/.test(hay)) bits.push('발사와 투사체 관련 수치를 바꿔 전투 리듬을 달라지게 합니다.');
  if(/받는 피해|방어|피해 감소|피부|방패|등딱지/.test(hay)) bits.push('방어 수치에 반영되며 음수일 경우 받는 피해가 증가합니다.');
  if(/체력|회복|재생|흡혈/.test(hay)) bits.push('생존 관련 수치를 바꿔 전투 지속력에 영향을 줍니다.');
  if(!bits.length) bits.push('획득 즉시 캐릭터 능력치나 전투 규칙에 반영됩니다.');
  return bits.slice(0,2).join(' ');
}
function relicDynamicInfo(r){
  const p=(typeof player==='object'&&player)?player:null;
  if(!p||!r) return [];
  const hay=((r.id||'')+' '+(r.name||'')+' '+(r.desc||'')).toLowerCase();
  const info=[];
  const add=(label,value)=>info.push({label,value});
  if(/골드|금화|gold|greed|clover|pig|wallet|card|ring|magnet|showcase/.test(hay)){
    add('현재 총 골드 보너스',fmtRelicPct((Number(p.goldMul)||1)-1));
  }
  if(/공격|피해|대미지|딜|boss|보스|dmg|damage|coupon|glass|berserk|all_in|contract|monitor|showcase|transmitter/.test(hay)){
    add('현재 최종 공격력',totalAttackPower(p).toFixed(1));
  }
  if(/치명타|크리|crit|clover|glasses|hammer|thin_glass|vault|eye|monitor|void/.test(hay)){
    add('현재 총 치명타 확률',Math.round(clamp(Number(p.critChance)||0,0,CRIT_CHANCE_CAP)*100)+'%');
    if(/피해|hammer|vault|critmult|치명타 피해/.test(hay)){
      add('현재 치명타 피해', 'x'+clamp(Number(p.critMult)||CRIT_BASE_MULT,1,CRIT_MULT_CAP).toFixed(1));
    }
  }
  if(/이동|속도|신발|군화|잔상|move|speed|sneaker|boots|slippery|legs|adrenaline|compass|wings|ammo/.test(hay)){
    const base=Number(p.spd)||BASE_PLAYER_MOVE_SPEED;
    add('현재 총 이동속도 보너스',fmtRelicPct((playerMoveSpeed(p)/base)-1));
  }
  if(/발사|연사|fire|redbull|adrenaline|trigger|recoil|cheat|sniper|nuke/.test(hay)){
    add('현재 발사속도 보너스',fmtRelicPct((Number(p.fireAdd)||0)+(Number(p.potionFireAdd)||0)));
  }
  if(/경험치|xp|book|compass/.test(hay)){
    add('현재 총 경험치 보너스',fmtRelicPct((Number(p.xpMul)||1)-1));
  }
  if(/보스|boss|giant|kijo|transmitter/.test(hay)){
    add('현재 보스 피해 보너스',fmtRelicPct((Number(p.bossDmgMul)||1)-1));
  }
  if(/방어|받는 피해|피해 감소|armor|shield|skin|turtle|mushroom|mask|crown|berserk|all_in|contract|glass/.test(hay)){
    const armor=effectiveArmor(p);
    add(armor>=0?'현재 피해 감소':'현재 받는 피해 증가',armorDisplayValue(armor));
  }
  return info.slice(0,4);
}
function getRelicTooltipData(relicOrId,opts){
  const r=typeof relicOrId==='string'?getRelicById(relicOrId):relicOrId;
  if(!r||(r.id&&REMOVED_RELIC_IDS.has(r.id))) return null;
  const tier=relicTier(r)||TIERS.rare;
  const isCurse=r.cls==='curse';
  return {
    title:r.name||'이름 없는 유물',
    rarity:isCurse?'curse':relicRarityKey(r),
    tierRarity:relicRarityKey(r),
    rarityName:isCurse?(tier.name||'등급')+' 저주 유물':(tier.name||'유물')+' 유물',
    icon:relicIconHTML(r,'relic-pix-lg'),
    shortLine:relicShortLine(r),
    description:relicDetailText(r),
    dynamicInfo:opts&&opts.static?[]:relicDynamicInfo(r)
  };
}
function ensureRelicTooltip(){
  if(relicTooltipEl&&document.body.contains(relicTooltipEl)) return relicTooltipEl;
  relicTooltipEl=document.getElementById('relicTooltip');
  if(relicTooltipEl) return relicTooltipEl;
  relicTooltipEl=document.createElement('div');
  relicTooltipEl.id='relicTooltip';
  relicTooltipEl.className='relic-tooltip hidden';
  relicTooltipEl.setAttribute('role','tooltip');
  document.body.appendChild(relicTooltipEl);
  return relicTooltipEl;
}
function renderRelicTooltip(data){
  const dyn=(data.dynamicInfo||[]).map(row=>
    '<div class="relic-tooltip-dyn-row"><span>'+spEsc(row.label||'현재 수치')+'</span><b>'+spEsc(row.value==null?'':row.value)+'</b></div>'
  ).join('');
  return '<div class="relic-tooltip-head">'+
      '<div class="relic-tooltip-icon">'+data.icon+'</div>'+
      '<div class="relic-tooltip-title"><b>'+spEsc(data.title)+'</b><span>'+spEsc(data.rarityName)+'</span></div>'+
    '</div>'+
    '<div class="relic-tooltip-line"></div>'+
    '<div class="relic-tooltip-short">'+spEsc(data.shortLine)+'</div>'+
    '<div class="relic-tooltip-desc">'+spEsc(data.description)+'</div>'+
    (dyn?'<div class="relic-tooltip-dyn">'+dyn+'</div>':'');
}
function positionRelicTooltip(evt){
  const tip=ensureRelicTooltip();
  if(evt&&evt.clientX!=null) relicTooltipPoint={x:evt.clientX,y:evt.clientY};
  const margin=14;
  const gap=14;
  const rect=tip.getBoundingClientRect();
  let x=relicTooltipPoint.x+gap;
  let y=relicTooltipPoint.y+gap;
  if(x+rect.width+margin>window.innerWidth) x=relicTooltipPoint.x-rect.width-gap;
  if(y+rect.height+margin>window.innerHeight) y=relicTooltipPoint.y-rect.height-gap;
  x=clamp(x,margin,Math.max(margin,window.innerWidth-rect.width-margin));
  y=clamp(y,margin,Math.max(margin,window.innerHeight-rect.height-margin));
  tip.style.left=Math.round(x)+'px';
  tip.style.top=Math.round(y)+'px';
}
function showRelicTooltip(targetEl,tooltipData,evt){
  clearTimeout(relicTooltipHideTimer);
  if(!tooltipData){ hideRelicTooltip(true); return; }
  TooltipManager.setActive('relic');
  relicTooltipTarget=targetEl;
  const tip=ensureRelicTooltip();
  const r=getRelicById(targetEl&&targetEl.dataset&&targetEl.dataset.relicId);
  const cls='rarity-'+(RELIC_RARITY_CLASS[(tooltipData&&tooltipData.rarity)||relicRarityKey(r)]||'rare');
  const curseTierCls=tooltipData&&tooltipData.rarity==='curse'?' curse-tier-'+(RELIC_RARITY_CLASS[tooltipData.tierRarity]||'rare'):'';
  tip.className='relic-tooltip '+cls+curseTierCls;
  tip.innerHTML=renderRelicTooltip(tooltipData);
  tip.classList.remove('hidden','show');
  positionRelicTooltip(evt);
  requestAnimationFrame(()=>tip.classList.add('show'));
}
function hideRelicTooltip(instant){
  clearTimeout(relicTooltipTimer);
  relicTooltipTarget=null;
  if(!relicTooltipEl) return;
  relicTooltipEl.classList.remove('show');
  TooltipManager.clear('relic');
  if(instant){
    clearTimeout(relicTooltipHideTimer);
    relicTooltipEl.classList.add('hidden');
    return;
  }
  relicTooltipHideTimer=setTimeout(()=>{
    if(relicTooltipEl&&!relicTooltipEl.classList.contains('show')) relicTooltipEl.classList.add('hidden');
  },110);
}
function initRelicTooltipEvents(){
  if(document.body&&document.body.dataset.relicTooltipEvents==='1') return;
  if(!document.body) return;
  document.body.dataset.relicTooltipEvents='1';
  document.addEventListener('mouseover',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-relic-id]');
    if(!target) return;
    if(relicTooltipTarget===target) return;
    clearTimeout(relicTooltipTimer);
    relicTooltipPoint={x:evt.clientX,y:evt.clientY};
    relicTooltipTimer=setTimeout(()=>showRelicTooltip(target,getRelicTooltipData(target.dataset.relicId,{static:target.dataset.relicStatic==='1'}),evt),110);
  });
  document.addEventListener('mousemove',evt=>{
    if(relicTooltipTarget&&!document.body.contains(relicTooltipTarget)) hideRelicTooltip();
    else if(relicTooltipTarget) positionRelicTooltip(evt);
  });
  document.addEventListener('mouseout',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-relic-id]');
    if(!target) return;
    if(evt.relatedTarget&&target.contains(evt.relatedTarget)) return;
    hideRelicTooltip();
  });
  document.addEventListener('focusin',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-relic-id]');
    if(target) showRelicTooltip(target,getRelicTooltipData(target.dataset.relicId,{static:target.dataset.relicStatic==='1'}),{clientX:target.getBoundingClientRect().right,clientY:target.getBoundingClientRect().top});
  });
  document.addEventListener('focusout',evt=>{
    if(evt.target&&evt.target.closest&&evt.target.closest('[data-relic-id]')) hideRelicTooltip();
  });
  window.addEventListener('blur',hideRelicTooltip);
  window.addEventListener('resize',()=>TooltipManager.hideAll());
}

// ---------- 입력 ----------

// ===== JS: Input handling and runtime state =====
const keys={};
let mouseX=W/2, mouseY=H/2, mouseDown=false;
function clearInputState(){
  Object.keys(keys).forEach(k=>{ delete keys[k]; });
  mouseDown=false;
  autoFire=false;
}
function isOpen(id){
  const el=$(id);
  return !!(el && !el.classList.contains('hidden'));
}
function isPauseOwnerOpen(){
  return isOpen('ovPause') || isOpen('ovSettings') || treeOpen || isOpen('ovTree');
}
function recoverInvisiblePause(){
  if(state==='play' && paused && !isPauseOwnerOpen()){
    resumeGame();
    return true;
  }
  return false;
}
function handleEscape(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
  if(typeof mysteryBoxCutsceneActive!=='undefined' && mysteryBoxCutsceneActive && mysteryBoxCutsceneActive.handleInput){
    mysteryBoxCutsceneActive.handleInput(e);
    return true;
  }
  if(isOpen('rankBuildModal')){
    closeRankBuildModal();
    return true;
  }
  if(isOpen('ovDatabase')){
    closeDatabaseTab();
    return true;
  }
  if(isOpen('ovSettings')){
    closeSettings();
    return true;
  }
  if(treeOpen || isOpen('ovTree')){
    closeTree();
    return true;
  }
  if(isOpen('ovPause')){
    resumeGame();
    return true;
  }
  if(state==='play'||state==='map'){
    if(recoverInvisiblePause()) return true;
    togglePause();
    return true;
  }
  return false;
}
function isTypingTarget(el){
  if(!el) return false;
  const tag=(el.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||el.isContentEditable;
}
function isTypingInputActive(){
  return isTypingTarget(document.activeElement);
}
window.addEventListener('keydown',e=>{
  if(act3FinalClearActive&&act3FinalClearActive() && (e.key==='Escape'||e.key===' '||e.key==='Enter')){ e.preventDefault(); skipAct3FinalClear(); return; }
  const k=e.key.toLowerCase();
  if(isTypingTarget(e.target)||isTypingInputActive()){
    return;
  }
  if(typeof mysteryBoxCutsceneActive!=='undefined' && mysteryBoxCutsceneActive && (k==='escape'||k===' '||k==='enter')){
    if(mysteryBoxCutsceneActive.handleInput) mysteryBoxCutsceneActive.handleInput(e);
    else { e.preventDefault(); e.stopPropagation(); }
    return;
  }
  if(k==='escape'){
    handleEscape(e);
    return;
  }
  if(k==='c' && !e.repeat && !isTypingInputActive() && typeof toggleStatPanel==='function' && statPanelEligible()){
    toggleStatPanel();
    e.preventDefault();
    return;
  }
  keys[k]=true;
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k)) e.preventDefault();
  // K키는 paused 여부와 관계없이 항상 처리 (트리 닫기)
  if((k==='k') && (state==='play'||state==='map')){
    if(isOpen('ovSettings') || isOpen('ovDatabase') || isOpen('ovPause')) return;
    if(treeOpen || isOpen('ovTree')) closeTree(); else openTree();
    e.preventDefault();
    return;
  }
  if(paused) return;                 // 일시정지 중엔 게임 입력 무시
  if(state==='play'){ if(k==='1')usePotion(0); else if(k==='2')usePotion(1); else if(k==='3')usePotion(2); }
}, true);
window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(isTypingTarget(e.target)||isTypingInputActive()){
    keys[k]=false;
    return;
  }
  keys[k]=false;
});
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
const LEADERBOARD_FIREBASE_CONFIG=null;
function getLeaderboardFirebaseConfig(){
  const cfg=window.LEADERBOARD_FIREBASE_CONFIG||LEADERBOARD_FIREBASE_CONFIG;
  return cfg&&cfg.apiKey?cfg:null;
}
const SCORE_MAX=9999999;
const LEADERBOARD_MIN_SCORE=3000;
const NAME_MAX_LEN=12;
const FLOORS_PER_ACT=15;
const RETRY_SCORE_PENALTY=1500;
const HIT_SCORE_PENALTY=200;
const LEADERBOARD_COLLECTIONS={easy:'scores_easy',normal:'scores_normal',hard:'scores_hard'};
const LEADERBOARD_SUMMARY_COLLECTION='leaderboard';
const RUN_BUILDS_COLLECTION='runBuilds';
const RUN_BUILD_VERSION='run-build-v1';
const RUN_BUILD_TITLE_MARKER='\n__BTV_RUN_BUILD__:';
const PLAYER_CHARACTER_NAME='봉식';
let leaderboardApiPromise=null;
let progressApiPromise=null;
let progressLoadPromise=null;
let progressSaveTimer=null;
let progressRemoteDisabled=false;
let scoreSubmitSeq=0;
let rankingDifficulty='easy';
const FALLBACK_CURRENT_SEASON=3;
function getCurrentSeason(){
  const s=Math.floor(Number(window.CURRENT_SEASON));
  return (s>=1)?s:FALLBACK_CURRENT_SEASON;
}
function recordSeason(d){
  const s=Math.floor(Number(d&&d.seasonId));
  return (s>=1)?s:1;
}
let rankingSeason=getCurrentSeason();
const rankingBuildCache=new Map();
let leaderboardSplitReadDenied=false;
let leaderboardSplitWriteDenied=false;
const USER_PROGRESS_COLLECTION='user_progress';
const USER_PROGRESS_LOCAL_KEY='btvUserProgressBackup';
let userProgress={
  uid:null,
  achievements:{},
  titles:{},
  unlockedRelics:{},
  selectedTitle:'',
  stats:{totalKills:0,totalElites:0,totalBosses:0,bestScore:0,playCount:0,bestWave:0,maxRunGold:0,shopSpendTotal:0,runShopSpent:0},
  loaded:false,
  dirty:false
};
let runPotionUsed=false;
let achievementToastShowing=false;
const achievementToastQueue=[];
const achievementToastActiveIds=new Set();

function ensureLeaderboardApi(){
  if(!leaderboardApiPromise){
    const firebaseConfig=getLeaderboardFirebaseConfig();
    if(!firebaseConfig) return Promise.reject(new Error('Firebase config missing'));
    leaderboardApiPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js')
    ]).then(([appMod,firestoreMod])=>{
      const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(firebaseConfig);
      return {db:firestoreMod.getFirestore(app), fs:firestoreMod};
    }).catch(err=>{
      leaderboardApiPromise=null;
      throw err;
    });
  }
  return leaderboardApiPromise;
}
function defaultProgress(){
  return {uid:null,achievements:{},titles:{},unlockedRelics:{},selectedTitle:'',stats:normalizeProgressStats(),loaded:false,dirty:false};
}
function normalizeProgressStats(stats){
  stats=stats||{};
  return {
    totalKills:Number(stats.totalKills)||0,
    totalElites:Number(stats.totalElites)||0,
    totalBosses:Number(stats.totalBosses)||0,
    bestScore:Number(stats.bestScore)||0,
    playCount:Number(stats.playCount)||0,
    bestWave:Number(stats.bestWave)||0,
    maxRunGold:Number(stats.maxRunGold)||0,
    shopSpendTotal:Number(stats.shopSpendTotal)||0,
    runShopSpent:Number(stats.runShopSpent)||0
  };
}
function titleById(id){ return TITLE_LIST.find(t=>t.id===id)||null; }
function titleByName(name){ return TITLE_LIST.find(t=>t.name===name)||null; }
function normalizeTitleId(value){
  value=String(value||'').trim();
  if(!value) return '';
  if(titleById(value)) return value;
  const title=titleByName(value);
  return title?title.id:'';
}
function normalizeTitleMap(titles){
  const out={};
  Object.keys(titles||{}).forEach(key=>{
    if(!titles[key]) return;
    const id=normalizeTitleId(key);
    if(id) out[id]=true;
  });
  return out;
}
function grantAchievementRewardToProgress(progress,id){
  if(!progress) return false;
  let changed=false;
  if(TITLE_REWARDS[id]){
    progress.titles=progress.titles||{};
    const titleId=TITLE_REWARDS[id].id;
    if(!progress.titles[titleId]){
      progress.titles[titleId]=true;
      changed=true;
    }
  }
  if(RELIC_REWARDS[id]){
    progress.unlockedRelics=progress.unlockedRelics||{};
    const relicId=RELIC_REWARDS[id];
    if(!progress.unlockedRelics[relicId]){
      progress.unlockedRelics[relicId]=true;
      changed=true;
    }
  }
  return changed;
}
function syncAchievementRewardsForProgress(progress){
  if(!progress) return false;
  let changed=false;
  Object.keys(progress.achievements||{}).forEach(id=>{
    if(achievementById(id)) changed=grantAchievementRewardToProgress(progress,id)||changed;
  });
  if(progress.selectedTitle&&!(progress.titles&&progress.titles[progress.selectedTitle])){
    progress.selectedTitle='';
    changed=true;
  }
  return changed;
}
function normalizeProgress(data){
  const base=defaultProgress();
  data=data||{};
  base.uid=data.uid||null;
  base.achievements=Object.assign({},data.achievements||{});
  base.titles=normalizeTitleMap(data.titles||{});
  base.unlockedRelics=Object.assign({},data.unlockedRelics||{});
  base.selectedTitle=normalizeTitleId(data.selectedTitle);
  if(base.selectedTitle&&!base.titles[base.selectedTitle]) base.selectedTitle='';
  base.stats=normalizeProgressStats(data.stats);
  base.loaded=!!data.loaded;
  base.dirty=!!data.dirty;
  syncAchievementRewardsForProgress(base);
  return base;
}
function mergeProgress(remote,local){
  remote=normalizeProgress(remote);
  local=normalizeProgress(local);
  remote.achievements=Object.assign({},remote.achievements,local.achievements);
  remote.titles=Object.assign({},remote.titles,local.titles);
  remote.unlockedRelics=Object.assign({},remote.unlockedRelics,local.unlockedRelics);
  remote.selectedTitle=local.dirty?local.selectedTitle:(local.selectedTitle||remote.selectedTitle||'');
  if(remote.selectedTitle&&!remote.titles[remote.selectedTitle]) remote.selectedTitle='';
  remote.stats=normalizeProgressStats(remote.stats);
  local.stats=normalizeProgressStats(local.stats);
  remote.stats.totalKills=Math.max(remote.stats.totalKills,local.stats.totalKills);
  remote.stats.totalElites=Math.max(remote.stats.totalElites,local.stats.totalElites);
  remote.stats.totalBosses=Math.max(remote.stats.totalBosses,local.stats.totalBosses);
  remote.stats.bestScore=Math.max(remote.stats.bestScore,local.stats.bestScore);
  remote.stats.playCount=Math.max(remote.stats.playCount,local.stats.playCount);
  remote.stats.bestWave=Math.max(remote.stats.bestWave,local.stats.bestWave);
  remote.stats.maxRunGold=Math.max(remote.stats.maxRunGold,local.stats.maxRunGold);
  remote.stats.shopSpendTotal=Math.max(remote.stats.shopSpendTotal,local.stats.shopSpendTotal);
  remote.stats.runShopSpent=Math.max(remote.stats.runShopSpent,local.stats.runShopSpent);
  remote.loaded=true;
  remote.dirty=!!local.dirty;
  return remote;
}
function loadLocalProgress(){
  try{ return normalizeProgress(JSON.parse(localStorage.getItem(USER_PROGRESS_LOCAL_KEY)||'{}')); }
  catch(e){ return defaultProgress(); }
}
function storeLocalProgress(){
  try{
    localStorage.setItem(USER_PROGRESS_LOCAL_KEY, JSON.stringify({
      uid:userProgress.uid||null,
      achievements:userProgress.achievements||{},
      titles:userProgress.titles||{},
      unlockedRelics:userProgress.unlockedRelics||{},
      selectedTitle:userProgress.selectedTitle||'',
      stats:normalizeProgressStats(userProgress.stats),
      dirty:!!userProgress.dirty,
      updatedAt:Date.now()
    }));
  }catch(e){}
}
function ensureProgressApi(){
  if(progressRemoteDisabled) return Promise.reject(new Error('Progress remote disabled'));
  if(!progressApiPromise){
    const firebaseConfig=getLeaderboardFirebaseConfig();
    if(!firebaseConfig) return Promise.reject(new Error('Firebase config missing'));
    progressApiPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js')
    ]).then(async([appMod,firestoreMod,authMod])=>{
      const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(firebaseConfig);
      const auth=authMod.getAuth(app);
      if(!auth.currentUser) await authMod.signInAnonymously(auth);
      return {db:firestoreMod.getFirestore(app), fs:firestoreMod, auth, uid:auth.currentUser.uid};
    }).catch(err=>{
      progressRemoteDisabled=true;
      progressApiPromise=null;
      throw err;
    });
  }
  return progressApiPromise;
}
async function loadUserProgress(){
  if(progressLoadPromise) return progressLoadPromise;
  userProgress=loadLocalProgress();
  userProgress.loaded=true;
  progressLoadPromise=(async()=>{
    try{
      const api=await ensureProgressApi();
      const ref=api.fs.doc(api.db,USER_PROGRESS_COLLECTION,api.uid);
      const snap=await api.fs.getDoc(ref);
      if(snap.exists()) userProgress=mergeProgress(Object.assign({uid:api.uid},snap.data(),{loaded:true}),userProgress);
      else { userProgress.uid=api.uid; userProgress.loaded=true; await saveUserProgress(true); }
      storeLocalProgress();
      if(userProgress.dirty) await saveUserProgress(true);
      renderAchievements();
      return userProgress;
    }catch(e){
      progressRemoteDisabled=true;
      console.warn('progress load failed once, using localStorage only',e);
      userProgress.loaded=true;
      renderAchievements();
      return userProgress;
    }
  })();
  renderAchievements();
  return progressLoadPromise;
}
async function saveUserProgress(force){
  userProgress.dirty=true;
  storeLocalProgress();
  if(progressRemoteDisabled){
    clearTimeout(progressSaveTimer);
    return;
  }
  if(!force){
    clearTimeout(progressSaveTimer);
    progressSaveTimer=setTimeout(()=>saveUserProgress(true),700);
    return;
  }
  clearTimeout(progressSaveTimer);
  try{
    const api=await ensureProgressApi();
    userProgress.uid=api.uid;
    await api.fs.setDoc(api.fs.doc(api.db,USER_PROGRESS_COLLECTION,api.uid),{
      achievements:userProgress.achievements||{},
      titles:userProgress.titles||{},
      unlockedRelics:userProgress.unlockedRelics||{},
      selectedTitle:userProgress.selectedTitle||'',
      stats:normalizeProgressStats(userProgress.stats),
      updatedAt:api.fs.serverTimestamp()
    },{merge:true});
    userProgress.dirty=false;
    storeLocalProgress();
  }catch(e){
    progressRemoteDisabled=true;
    console.warn('progress save failed once, localStorage only from now on',e);
  }
}
function achievementById(id){ return ACHIEVEMENTS.find(a=>a.id===id); }
function isAchievementUnlocked(id){ return !!(userProgress.achievements&&userProgress.achievements[id]); }
function isRelicUnlockedByAchievement(id){
  return ACHIEVEMENT_RELIC_IDS.indexOf(id)<0 || !!(userProgress.unlockedRelics&&userProgress.unlockedRelics[id]);
}
function escapeRegExpText(text){ return String(text||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function maskAchievementSpoilers(text,achievement){
  text=String(text||'');
  if(!achievement||!achievement.spoiler) return text;
  (achievement.spoilerTerms||[]).forEach(term=>{
    if(term) text=text.replace(new RegExp(escapeRegExpText(term),'g'),'???');
  });
  return text;
}
function formatAchievementName(id,revealed){
  const a=achievementById(id);
  if(!a) return '';
  if(!revealed && a.spoiler) return a.hiddenName||maskAchievementSpoilers(a.name,a);
  return a.name;
}
function formatAchievementDesc(id,revealed){
  const a=achievementById(id);
  if(!a) return '';
  if(!revealed && a.spoiler) return a.hiddenDesc||maskAchievementSpoilers(a.desc,a);
  return a.desc;
}
function achievementIdForRelic(relicId){
  return Object.keys(RELIC_REWARDS).find(id=>RELIC_REWARDS[id]===relicId)||'';
}
function formatAchievementRelicName(relicId,revealed){
  const r=RELICS.find(x=>x.id===relicId);
  const achievement=achievementById(achievementIdForRelic(relicId));
  if(!revealed && achievement&&achievement.spoiler) return achievement.hiddenRelicName||maskAchievementSpoilers(r&&r.name,achievement);
  return r?r.name:'';
}
function formatAchievementReward(id,revealed){
  const a=achievementById(id);
  if(!a) return '';
  const rewards=[];
  if(START_BONUS_REWARDS[id]) rewards.push(START_BONUS_REWARDS[id]);
  if(RELIC_REWARDS[id]) rewards.push('유물 해금: '+formatAchievementRelicName(RELIC_REWARDS[id],revealed));
  if(TITLE_REWARDS[id]) rewards.push('칭호: '+TITLE_REWARDS[id].name);
  if(!rewards.length && a.reward && a.reward!=='업적') rewards.push(a.reward);
  let text=rewards.join(' · ');
  if(!revealed && a.spoiler) text=maskAchievementSpoilers(text,a);
  return text;
}
function achievementCategory(id){
  return ACHIEVEMENT_CATEGORIES[id]||'progress';
}
function achievementSpoilerHint(id){
  const cat=achievementCategory(id);
  if(cat==='bosses') return '힌트: 특정 보스 또는 중간보스를 쓰러뜨리면 열린다.';
  if(cat==='combat') return '힌트: 전투를 특별한 조건으로 끝내면 열린다.';
  if(cat==='clear') return '힌트: 클리어 조건을 바꿔 도전하면 열린다.';
  if(cat==='build') return '힌트: 한 런의 빌드 조건을 만족하면 열린다.';
  return '힌트: 진행 중 특정 조건을 만족하면 열린다.';
}
function achievementRewardKinds(id){
  const kinds=[];
  const start=START_BONUS_REWARDS[id]||'';
  if(start.indexOf('시작 골드')>=0) kinds.push({key:'gold',label:'시작 골드'});
  if(start.indexOf('시작 포션')>=0) kinds.push({key:'potion',label:'시작 포션'});
  if(start.indexOf('시작 최대 체력')>=0) kinds.push({key:'hp',label:'시작 체력'});
  if(start.indexOf('트리포인트')>=0) kinds.push({key:'tree',label:'트리포인트'});
  if(RELIC_REWARDS[id]) kinds.push({key:'relic',label:'유물 해금'});
  if(TITLE_REWARDS[id]) kinds.push({key:'title',label:'칭호'});
  return kinds;
}
function rewardBadgeHTML(id){
  const kinds=achievementRewardKinds(id);
  if(!kinds.length) return '';
  return '<div class="ach-reward-badges">'+kinds.map(k=>'<em class="ach-reward-badge '+k.key+'">'+k.label+'</em>').join('')+'</div>';
}
function computeStartBonusSummary(){
  const bonus={gold:0,potions:0,maxhp:0,treePoints:0};
  if(isAchievementUnlocked('first_play')) bonus.gold+=10;
  if(isAchievementUnlocked('first_kill')) bonus.gold+=10;
  if(isAchievementUnlocked('kill_100')) bonus.gold+=30;
  if(isAchievementUnlocked('kill_500')) bonus.gold+=30;
  if(isAchievementUnlocked('gold_1000')) bonus.gold+=30;
  if(isAchievementUnlocked('greedy_exists')) bonus.gold+=10;
  if(isAchievementUnlocked('lonely_intruder')) bonus.gold+=10;
  if(isAchievementUnlocked('clear_act1')) bonus.potions+=1;
  if(isAchievementUnlocked('one_hp_survive')) bonus.maxhp+=5;
  if(isAchievementUnlocked('clear_game')) bonus.treePoints+=1;
  return bonus;
}
function renderStartBonusSummary(){
  const el=$('achBonusSummary');
  if(!el) return;
  const b=computeStartBonusSummary();
  const chips=[];
  if(b.gold) chips.push(['gold','시작 골드 +'+b.gold]);
  if(b.potions) chips.push(['potion','시작 포션 +'+b.potions]);
  if(b.maxhp) chips.push(['hp','시작 최대 체력 +'+b.maxhp]);
  if(b.treePoints) chips.push(['tree','시작 트리포인트 +'+b.treePoints]);
  el.innerHTML='<div class="ach-bonus-title">현재 적용 중인 시작 보너스</div>'+
    (chips.length?'<div class="ach-bonus-chips">'+chips.map(c=>'<span class="'+c[0]+'">'+c[1]+'</span>').join('')+'</div>':'<div class="ach-bonus-empty">아직 적용 중인 시작 보너스 없음</div>');
}
function playAchievementToastSfx(){
  try{
    if(typeof sfx!=='undefined'&&sfx.pick) sfx.pick();
    else if(typeof sfx!=='undefined'&&sfx.coin) sfx.coin();
  }catch(e){}
}
function runAchievementToastQueue(){
  if(achievementToastShowing) return;
  const id=achievementToastQueue.shift();
  if(!id) return;
  const toast=$('achievementToast');
  if(!toast){ achievementToastActiveIds.delete(id); runAchievementToastQueue(); return; }
  achievementToastShowing=true;
  const reward=formatAchievementReward(id,true);
  const rewardEl=toast.querySelector('.ach-toast-reward');
  toast.querySelector('.ach-toast-name').textContent=formatAchievementName(id,true);
  if(rewardEl){
    rewardEl.textContent=reward?'보상: '+reward:'';
    rewardEl.classList.toggle('show',!!reward);
  }
  toast.classList.remove('hiding');
  toast.classList.add('show');
  playAchievementToastSfx();
  clearTimeout(toast._hideT);
  clearTimeout(toast._doneT);
  toast._hideT=setTimeout(()=>{ toast.classList.add('hiding'); toast.classList.remove('show'); },2000);
  toast._doneT=setTimeout(()=>{
    achievementToastActiveIds.delete(id);
    achievementToastShowing=false;
    runAchievementToastQueue();
  },2220);
}
function showAchievementToast(id){
  if(!achievementById(id)||achievementToastActiveIds.has(id)||achievementToastQueue.indexOf(id)>=0) return;
  achievementToastActiveIds.add(id);
  achievementToastQueue.push(id);
  runAchievementToastQueue();
}
function getSelectedTitle(){
  const id=normalizeTitleId(userProgress&&userProgress.selectedTitle);
  if(!id || !(userProgress.titles&&userProgress.titles[id])) return null;
  return titleById(id);
}
function getSelectedTitleName(){
  const title=getSelectedTitle();
  return title?title.name:'';
}
function setTitleStat(id,value){
  const el=$(id);
  if(el) el.textContent=value;
}
function refreshTitleInfoStats(){
  const stats=normalizeProgressStats(userProgress&&userProgress.stats);
  setTitleStat('titleBestScore',fmtScore(stats.bestScore));
  setTitleStat('titlePlayCount',fmtScore(stats.playCount)+'회');
  setTitleStat('titleBestWave',fmtScore(stats.bestWave));
}
function renderTitleDisplay(target,options){
  options=options||{};
  const name=getSelectedTitleName();
  if(!target) return '🏆 '+(name||'칭호 없음');
  const el=typeof target==='string'?$(target):target;
  if(!el) return;
  el.classList.toggle('empty',!name);
  if(options.compact){
    el.textContent='🏆 '+(name||'칭호 없음');
    return;
  }
  el.innerHTML='<div class="title-display-label">🏆 현재 칭호</div><div class="title-display-name"></div>';
  const nameEl=el.querySelector('.title-display-name');
  if(nameEl) nameEl.textContent=name||'칭호 없음';
}
function refreshTitleDisplay(){
  renderTitleDisplay('achCurrentTitle');
  renderTitleDisplay('titleCurrentTitle',{compact:true});
  refreshTitleInfoStats();
}
function applyAchievementReward(id){
  grantAchievementRewardToProgress(userProgress,id);
}
function unlockAchievement(id){
  if(!userProgress.achievements) userProgress=normalizeProgress(userProgress);
  if(userProgress.achievements[id]) return false;
  userProgress.achievements[id]={at:Date.now()};
  applyAchievementReward(id);
  showAchievementToast(id);
  renderAchievements();
  saveUserProgress();
  return true;
}
function checkKillAchievements(){
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  const total=userProgress.stats.totalKills;
  if(total>=100) unlockAchievement('kill_100');
  if(total>=500) unlockAchievement('kill_500');
  if(total>=1000) unlockAchievement('kill_1000');
  if(total>=3000) unlockAchievement('kill_3000');
}
function checkGoldAchievements(){
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  if(gold>userProgress.stats.maxRunGold) userProgress.stats.maxRunGold=gold;
  if(gold>=1000) unlockAchievement('gold_1000');
}
function recordShopSpend(amount){
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  const spent=Math.max(0,Math.round(Number(amount)||0));
  userProgress.stats.shopSpendTotal+=spent;
  userProgress.stats.runShopSpent+=spent;
  if(userProgress.stats.shopSpendTotal>=1000) unlockAchievement('shop_spend_1000');
  else saveUserProgress();
}
function checkLevelAchievements(){
  if(level>=20) unlockAchievement('level_20');
}
function checkRunRelicAchievements(){
  const relics=player&&Array.isArray(player.relics)?player.relics:[];
  if(relics.length>=10) unlockAchievement('relic_10');
  const mythicCount=relics.filter(r=>(TIER_OF[r.id]||'rare')==='mythic').length;
  if(mythicCount>=3) unlockAchievement('mythic_3');
}
function checkLowHpRoomAchievements(){
  if(!player||!player.maxhp) return;
  if(player.hp<=1) unlockAchievement('one_hp_survive');
  if(player.hp/player.maxhp<=0.1) unlockAchievement('clutch_room');
}
function selectTitle(title){
  const titleId=normalizeTitleId(title);
  if(titleId && !(userProgress.titles&&userProgress.titles[titleId])) return;
  userProgress.selectedTitle=titleId||'';
  refreshTitleDisplay();
  renderAchievements();
  saveUserProgress();
}
function applyStartBonuses(){
  const bonus=computeStartBonusSummary();
  addGold(bonus.gold,'other');
  for(let i=0;i<bonus.potions;i++) addPotion(rollPotion());
  if(bonus.maxhp){ player.maxhp+=bonus.maxhp; player.hp+=bonus.maxhp; }
  treePoints+=bonus.treePoints;
  updateHUD();
}
function recordPlayStarted(){
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  userProgress.stats.playCount+=1;
  refreshTitleInfoStats();
  saveUserProgress();
}
function recordRunResult(scoreData){
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  const score=Math.round(Number(scoreData&&scoreData.score)||0);
  const floor=Math.max(1,Number(scoreData&&scoreData.reachedFloor)||1);
  const wave=(Math.max(1,Number(act)||1)-1)*(MAP_ROWS+1)+floor;
  userProgress.stats.bestScore=Math.max(userProgress.stats.bestScore,score);
  userProgress.stats.bestWave=Math.max(userProgress.stats.bestWave,wave);
  refreshTitleInfoStats();
  saveUserProgress();
}
const RUN_GOLD_DEFAULT={
  earnedTotal:0,earnedFromKills:0,earnedFromRoomRewards:0,earnedFromEvents:0,earnedFromOther:0,
  spentTotal:0,spentRelics:0,spentPotions:0,spentTraining:0,spentMysteryBox:0,spentSpecial:0,spentOther:0,
  shopPurchases:{relics:0,potions:0,training:0,mysteryBoxes:0,hpTraining:0,atkTraining:0,speedTraining:0,focusTraining:0,defenseTraining:0,special:0}
};
function freshRunGoldStats(){ return JSON.parse(JSON.stringify(RUN_GOLD_DEFAULT)); }
function normalizeRunGoldStats(raw){
  const base=freshRunGoldStats(), src=(raw&&typeof raw==='object')?raw:{}, sp=(src.shopPurchases&&typeof src.shopPurchases==='object')?src.shopPurchases:{};
  Object.keys(base).forEach(k=>{ if(k!=='shopPurchases') base[k]=Math.max(0,Math.round(Number(src[k])||0)); });
  Object.keys(base.shopPurchases).forEach(k=>{ base.shopPurchases[k]=Math.max(0,Math.floor(Number(sp[k])||0)); });
  return base;
}
function normalizeRunStats(raw){ return {gold:normalizeRunGoldStats(raw&&raw.gold)}; }
function ensureRunStats(){ runStats=normalizeRunStats(runStats); return runStats; }
function resetRunStats(){ runStats=normalizeRunStats(null); }
function runGoldEarnField(source){ return source==='kill'?'earnedFromKills':(source==='roomReward'?'earnedFromRoomRewards':(source==='event'?'earnedFromEvents':'earnedFromOther')); }
function runGoldSpendField(source){
  return source==='relic'?'spentRelics':(source==='potion'?'spentPotions':(source==='training'?'spentTraining':(source==='mysteryBox'?'spentMysteryBox':(source==='special'?'spentSpecial':'spentOther'))));
}
function recordRunGoldEarned(amount,source){
  amount=Math.max(0,Math.round(Number(amount)||0)); if(!amount) return 0;
  const gs=ensureRunStats().gold; gs.earnedTotal+=amount; gs[runGoldEarnField(source)]+=amount; return amount;
}
function recordRunGoldSpent(amount,source){
  amount=Math.max(0,Math.round(Number(amount)||0)); if(!amount) return 0;
  const gs=ensureRunStats().gold; gs.spentTotal+=amount; gs[runGoldSpendField(source)]+=amount; return amount;
}
function addGold(amount,source){
  amount=Math.max(0,Math.round(Number(amount)||0)); if(!amount) return 0;
  gold+=amount; recordRunGoldEarned(amount,source||'other'); return amount;
}
function spendGold(amount,source){
  amount=Math.max(0,Math.round(Number(amount)||0)); if(!amount) return 0;
  const paid=Math.min(Math.max(0,Math.round(Number(gold)||0)),amount);
  gold=Math.max(0,gold-paid); recordRunGoldSpent(paid,source||'other'); return paid;
}
function getRunGoldStatsSnapshot(){ return normalizeRunGoldStats(ensureRunStats().gold); }
function getRunStatsSnapshot(){ return {gold:getRunGoldStatsSnapshot()}; }
function shopSpendSource(it){
  if(!it) return 'other';
  if(it.kind==='relic') return 'relic';
  if(it.kind==='potion') return 'potion';
  if(it.kind==='training') return 'training';
  if(it.kind==='special') return String(it.baseName||it.name||'').indexOf('상자')>=0?'mysteryBox':'special';
  return 'other';
}
function recordShopPurchaseStats(it){
  const gs=ensureRunStats().gold, source=shopSpendSource(it);
  if(source==='relic') gs.shopPurchases.relics++;
  else if(source==='potion') gs.shopPurchases.potions++;
  else if(source==='training'){
    gs.shopPurchases.training++;
    const id=it&&it.trainingId;
    const key=id==='hp'?'hpTraining':id==='atk'?'atkTraining':id==='speed'?'speedTraining':id==='focus'?'focusTraining':id==='defense'?'defenseTraining':'';
    if(key) gs.shopPurchases[key]++;
  }else if(source==='mysteryBox') gs.shopPurchases.mysteryBoxes++;
  else if(source==='special') gs.shopPurchases.special++;
}
function monsterKillBaseGold(enemy){
  const actNum=Math.max(1,Number(act)||1);
  const type=enemy&&enemy.type;
  const hardEnemy=(actNum===1&&ACT1_LATE_ENEMY_IDS.indexOf(type)>=0)||
    (actNum===2&&ACT2_LATE_ENEMY_IDS.indexOf(type)>=0)||
    (actNum>=3&&typeof ACT3_LATE_ENEMY_IDS!=="undefined"&&ACT3_LATE_ENEMY_IDS.indexOf(type)>=0);
  const base=actNum>=2?(hardEnemy?irand(9,13):irand(7,11)):(hardEnemy?irand(5,9):irand(3,7));
  return Math.max(1,Math.round(base*(actTuning(actNum).killGoldMul||1)));
}
const TRAINING_MAX_PURCHASES=5;
const TRAINING_DEFAULTS={hp:0,atk:0,speed:0,focus:0,defense:0};
const TRAINING_HP_BONUS=20;
const TRAINING_ATK_BONUS=1.2;
const TRAINING_SPEED_BONUS=0.05;
const TRAINING_FOCUS_BONUS=0.04;
const TRAINING_DEFENSE_BONUS=0.04;
const TRAINING_DEFS=[
  {id:'hp',name:'체력 훈련',icon:'HP',desc:'최대 체력 +20, 즉시 체력 +20 회복. 이번 런 동안 영구 적용.',baseCost:155,bonusText:c=>'+'+(c*TRAINING_HP_BONUS)},
  {id:'atk',name:'공격 훈련',icon:'ATK',desc:'공격력 +1.2. 이번 런 동안 영구 적용.',baseCost:220,bonusText:c=>'+'+(c*TRAINING_ATK_BONUS).toFixed(1)},
  {id:'speed',name:'민첩 훈련',icon:'SPD',desc:'이동속도 +5%. 이번 런 동안 영구 적용.',baseCost:180,bonusText:c=>'+'+Math.round(c*TRAINING_SPEED_BONUS*100)+'%'},
  {id:'focus',name:'집중 훈련',icon:'CRIT',desc:'치명타 확률 +4%. 이번 런 동안 영구 적용.',baseCost:220,bonusText:c=>'+'+Math.round(c*TRAINING_FOCUS_BONUS*100)+'%'},
  {id:'defense',name:'방어 훈련',icon:'DEF',desc:'받는 피해 -4%. 이번 런 동안 영구 적용.',baseCost:200,bonusText:c=>'+'+Math.round(c*TRAINING_DEFENSE_BONUS*100)+'%'}
];
const TRAINING_PRICE_MUL=0.55;
function shopText(v){
  return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function ensureTrainingState(p){
  p=p||player;
  if(!p.training || typeof p.training!=='object') p.training={};
  Object.keys(TRAINING_DEFAULTS).forEach(k=>{
    const n=Math.max(0,Math.floor(Number(p.training[k])||0));
    p.training[k]=Math.min(TRAINING_MAX_PURCHASES,n);
  });
  return p.training;
}
function trainingDefById(id){ return TRAINING_DEFS.find(t=>t.id===id)||null; }
function trainingCount(id,p){ return ensureTrainingState(p||player)[id]||0; }
function trainingIsMaxed(id,p){ return trainingCount(id,p)>=TRAINING_MAX_PURCHASES; }
function trainingPrice(def,p){
  const count=trainingCount(def.id,p||player);
  return Math.max(1,Math.round(shopPrice(def.baseCost)*(1+count*0.35)*TRAINING_PRICE_MUL));
}
function trainingPct(n){ return (n>=0?'+':'')+Math.round((Number(n)||0)*100)+'%'; }
function trainingFlat(n){ const v=Math.round((Number(n)||0)*10)/10; return (v>=0?'+':'')+(Number.isInteger(v)?String(v):v.toFixed(1)); }
function trainingPriceIncreaseText(count){
  const pct=Math.round((Number(count)||0)*35);
  return pct>0?'기본 가격 +'+pct+'% 적용':'기본 가격';
}
function trainingPreviewRows(def,p){
  p=p||player;
  const id=def&&def.id;
  const rows=[];
  if(id==='hp'){
    rows.push(['최대 체력', Math.round(Number(p.maxhp)||0)+' → '+Math.round((Number(p.maxhp)||0)+TRAINING_HP_BONUS)]);
    rows.push(['즉시 회복', '+'+TRAINING_HP_BONUS]);
  }else if(id==='atk'){
    const cur=Number(p.dmg)||0;
    rows.push(['공격 훈련 보너스', trainingFlat(trainingCount('atk',p)*TRAINING_ATK_BONUS)+' → '+trainingFlat((trainingCount('atk',p)+1)*TRAINING_ATK_BONUS)]);
    rows.push(['공격력', cur.toFixed(1)+' → '+(cur+TRAINING_ATK_BONUS).toFixed(1)]);
  }else if(id==='speed'){
    const cur=Number(p.trainingSpeedBonus)||0;
    rows.push(['이동속도 보너스', trainingPct(cur)+' → '+trainingPct(cur+TRAINING_SPEED_BONUS)]);
    rows.push(['이동속도', '+'+Math.round(TRAINING_SPEED_BONUS*100)+'%']);
  }else if(id==='focus'){
    const cur=clamp(Number(p.critChance)||0,0,CRIT_CHANCE_CAP);
    const next=clamp(cur+TRAINING_FOCUS_BONUS,0,CRIT_CHANCE_CAP);
    rows.push(['치명타 확률', trainingPct(cur)+' → '+trainingPct(next)]);
    rows.push(['집중 훈련 보너스', trainingPct(Number(p.trainingFocusBonus)||0)+' → '+trainingPct((Number(p.trainingFocusBonus)||0)+TRAINING_FOCUS_BONUS)]);
  }else if(id==='defense'){
    const cur=Number(p.trainingDefenseBonus)||0;
    rows.push(['받는 피해 감소', trainingPct(cur)+' -> '+trainingPct(cur+TRAINING_DEFENSE_BONUS)]);
    rows.push(['피해 감소', '+'+Math.round(TRAINING_DEFENSE_BONUS*100)+'%']);
  }
  return rows;
}
function trainingNextState(id,p){
  p=p||player;
  const cur={
    maxhp:Number(p.maxhp)||0,
    hp:Number(p.hp)||0,
    dmg:Number(p.dmg)||0,
    atkBonus:Number(p.trainingAtkBonus)||0,
    speedBonus:Number(p.trainingSpeedBonus)||0,
    focusBonus:Number(p.trainingFocusBonus)||0,
    critChance:clamp(Number(p.critChance)||0,0,CRIT_CHANCE_CAP),
    defenseBonus:Number(p.trainingDefenseBonus)||0,
    armor:effectiveArmor(p)
  };
  const next=Object.assign({},cur);
  if(id==='hp'){
    next.maxhp=cur.maxhp+TRAINING_HP_BONUS;
    next.hp=Math.min(next.maxhp,cur.hp+TRAINING_HP_BONUS);
  }else if(id==='atk'){
    next.dmg=cur.dmg+TRAINING_ATK_BONUS;
    next.atkBonus=cur.atkBonus;
  }else if(id==='speed'){
    next.speedBonus=cur.speedBonus+TRAINING_SPEED_BONUS;
  }else if(id==='focus'){
    next.focusBonus=cur.focusBonus+TRAINING_FOCUS_BONUS;
    next.critChance=clamp(cur.critChance+TRAINING_FOCUS_BONUS,0,CRIT_CHANCE_CAP);
  }else if(id==='defense'){
    next.defenseBonus=cur.defenseBonus+TRAINING_DEFENSE_BONUS;
    next.armor=clamp((Number(p.armor)||0)+TRAINING_DEFENSE_BONUS+(Number(p.potionArmor)||0),-1,0.85);
  }
  return {current:cur,next};
}
function getTrainingTooltipData(trainingKey){
  const id=String(trainingKey||'').replace(/^training-/,'');
  const def=trainingDefById(id);
  if(!def){
    return {title:'훈련',totalText:'-',description:'훈련 정보를 찾을 수 없습니다.',breakdown:[{label:'훈련 정보',value:'적용 안 됨',sourceType:'훈련'}],formulaText:'적용 방식: 현재 훈련 정보 기준',kind:'training'};
  }
  const count=trainingCount(id,player);
  const maxed=trainingIsMaxed(id,player);
  const cost=maxed?0:trainingPrice(def,player);
  const nextCost=maxed?0:Math.max(1,Math.round(shopPrice(def.baseCost)*(1+(count+1)*0.35)*TRAINING_PRICE_MUL));
  const goldNow=Number(gold)||0;
  const state=trainingNextState(id,player);
  const rows=[
    {label:'구매 횟수',value:count+' / '+TRAINING_MAX_PURCHASES,sourceType:'훈련'},
    {label:'현재 가격',value:maxed?'MAX':cost+'G',sourceType:goldNow>=cost||maxed?'상점':'골드 부족'}
  ];
  let valueText=def.desc||'이번 런 동안 영구 유지됩니다.';
  if(id==='hp'){
    valueText='최대 체력 +20, 즉시 체력 +20 회복';
    rows.unshift(
      {label:'최대 체력',value:Math.round(state.current.maxhp)+' -> '+Math.round(state.next.maxhp),sourceType:'구매 후'},
      {label:'현재 체력',value:Math.round(state.current.hp)+' -> '+Math.round(state.next.hp),sourceType:'구매 후'}
    );
  }else if(id==='atk'){
    valueText='공격력 +1.2';
    rows.unshift(
      {label:'현재 공격력',value:state.current.dmg.toFixed(1),sourceType:'전투값'},
      {label:'구매 후 공격력',value:state.next.dmg.toFixed(1),sourceType:'예상'}
    );
  }else if(id==='speed'){
    valueText='이동속도 +5%';
    rows.unshift(
      {label:'현재 보너스',value:trainingPct(state.current.speedBonus),sourceType:'훈련'},
      {label:'구매 후',value:trainingPct(state.next.speedBonus),sourceType:'예상'}
    );
  }else if(id==='focus'){
    valueText='치명타 확률 +4%';
    rows.unshift(
      {label:'현재 치명타',value:trainingPct(state.current.critChance),sourceType:'전투값'},
      {label:'구매 후 치명타',value:trainingPct(state.next.critChance),sourceType:'예상'}
    );
  }else if(id==='defense'){
    valueText='받는 피해 -4%';
    rows.unshift(
      {label:'현재 피해 감소',value:armorDisplayValue(state.current.armor),sourceType:'전투값'},
      {label:'구매 후 피해 감소',value:armorDisplayValue(state.next.armor),sourceType:'예상'}
    );
  }
  rows.push({label:'다음 구매 가격',value:maxed?'MAX':nextCost+'G',sourceType:'가격 증가'});
  if(maxed) rows.push({label:'상태',value:'최대 단련 완료',sourceType:'완료'});
  else if(goldNow<cost) rows.push({label:'상태',value:'골드 부족',sourceType:'주의'});
  else rows.push({label:'상태',value:'구매 가능',sourceType:'상점'});
  return {
    title:def.name,
    totalText:maxed?'MAX':(goldNow<cost?'골드 부족':cost+'G'),
    description:valueText+' · 이번 런 동안 영구 유지됩니다.',
    breakdown:rows,
    formulaText:maxed?'최대 단련 완료':'반복 구매 시 가격이 증가합니다. 현재 가격 보정: '+trainingPriceIncreaseText(count),
    kind:'training'
  };
}
function trainingShopDetailsHTML(def,count,maxed,cost){
  const rows=trainingPreviewRows(def,player).map(row=>
    '<div class="shop-detail-row"><span>'+shopText(row[0])+'</span><b>'+shopText(row[1])+'</b></div>'
  ).join('');
  return '<div class="shop-training-info">'+
    '<div class="shop-training-desc">'+shopText(def.desc)+'</div>'+
    (maxed?'<div class="shop-training-max">최대 훈련 완료</div>':rows)+
    '<div class="shop-detail-row"><span>구매 횟수</span><b>'+count+' / '+TRAINING_MAX_PURCHASES+'</b></div>'+
    '<div class="shop-detail-row"><span>현재 가격</span><b>'+(maxed?'MAX':cost+'G')+'</b></div>'+
    '<div class="shop-price-note">'+shopText(trainingPriceIncreaseText(count))+'</div>'+
  '</div>';
}
function applyShopTraining(id){
  const def=trainingDefById(id);
  if(currentShopItems&&isShopTrainingBought(currentShopItems,id)) return false;
  if(!def || trainingIsMaxed(id,player)) return false;
  const tr=ensureTrainingState(player);
  if(id==='hp'){
    player.maxhp+=TRAINING_HP_BONUS;
    healPlayer(TRAINING_HP_BONUS,player.x,player.y);
    player.hp=Math.min(player.hp,player.maxhp);
  }else if(id==='atk'){
    player.dmg=(Number(player.dmg)||0)+TRAINING_ATK_BONUS;
  }else if(id==='speed'){
    player.trainingSpeedBonus=(Number(player.trainingSpeedBonus)||0)+TRAINING_SPEED_BONUS;
  }else if(id==='focus'){
    player.trainingFocusBonus=(Number(player.trainingFocusBonus)||0)+TRAINING_FOCUS_BONUS;
    player.critChance=Math.min(CRIT_CHANCE_CAP,(Number(player.critChance)||0)+TRAINING_FOCUS_BONUS);
  }else if(id==='defense'){
    player.trainingDefenseBonus=(Number(player.trainingDefenseBonus)||0)+TRAINING_DEFENSE_BONUS;
    player.armor=Math.min(0.85,(Number(player.armor)||0)+TRAINING_DEFENSE_BONUS);
  }
  tr[id]=Math.min(TRAINING_MAX_PURCHASES,(tr[id]||0)+1);
  return true;
}
function trainingBuildRows(training){
  const tr=Object.assign({},TRAINING_DEFAULTS,training||{});
  return TRAINING_DEFS.map(def=>({def,count:Math.max(0,Math.floor(Number(tr[def.id])||0))})).filter(x=>x.count>0);
}
function crowdRageNearbyCount(p){
  p=p||player;
  if(typeof enemies==='undefined'||!Array.isArray(enemies)) return 0;
  return enemies.filter(e=>e&&!e.dead&&dist2(e.x,e.y,p.x,p.y)<=220*220).length;
}
function crowdRageAttackFlat(p){
  p=p||player;
  const perEnemy=Number(p&&p.crowdRageAtkFlat)||0;
  if(perEnemy<=0) return 0;
  return Math.min(10,crowdRageNearbyCount(p))*perEnemy;
}
function curseRelicCount(p){
  return ((p&&p.relics)||[]).filter(r=>r&&r.cls==='curse').length;
}
function curseRelicStacks(p){
  return Math.min(curseRelicCount(p),5);
}
function curseDamageTakenBonus(p){
  return ((p&&p.relics)||[]).reduce((sum,r)=>{
    if(!r||r.cls!=='curse') return sum;
    return sum+Math.max(0,sourceDeltaFromApply(r,'damageTakenMul'));
  },0);
}
function curseDamageTakenMul(p){
  p=p||player;
  let bonus=statBonusFromMul(p&&p.damageTakenMul);
  if(p&&p.curseAffinity) bonus-=curseDamageTakenBonus(p)*0.20;
  return statMulFromBonus(bonus,0.1);
}
function corruptedContractActive(p){
  return !!(p&&p.corruptedContract&&curseRelicCount(p)>=2);
}
function curseContractCritBonus(p){
  return corruptedContractActive(p)?0.15:0;
}
function curseContractSpeedFlat(p){
  return corruptedContractActive(p)?10:0;
}
function curseAttackBonus(p){
  p=p||player;
  const stacks=curseRelicStacks(p);
  let bonus=0;
  if(p.ominousAdaptation) bonus+=stacks*0.04;
  if(p.doomWorship) bonus+=stacks*0.08;
  return bonus;
}
function conditionalAttackFlat(p){
  p=p||player;
  let flat=0;
  if(p.noPotionAtkFlat&&(!p.potions||p.potions.length===0)){
    flat+=Number(p.noPotionAtkFlat)||0;
  }
  if(p.lowHpAtkFlat&&p.hp<=p.maxhp*0.30){
    flat+=Number(p.lowHpAtkFlat)||0;
  }
  if(p.crowdRageAtkFlat){
    flat+=crowdRageAttackFlat(p);
  }
  if(p.goldPowerAtkFlat){
    const stacks=Math.min(12,Math.floor((Number(gold)||0)/100));
    flat+=stacks*(Number(p.goldPowerAtkFlat)||0);
  }
  if((p.investmentReturn||p.investmentReturnAtkFlat)&&gold>=150){
    flat+=Number(p.investmentReturnAtkFlat)||3;
  }
  if(p.ominousAdaptationAtkFlat||p.ominousAdaptation){
    flat+=curseRelicStacks(p)*(Number(p.ominousAdaptationAtkFlat)||(p.ominousAdaptation?2:0));
  }
  if(p.doomWorshipAtkFlat||p.doomWorship){
    flat+=curseRelicStacks(p)*(Number(p.doomWorshipAtkFlat)||(p.doomWorship?3.2:0));
  }
  return flat;
}
function totalAttackBase(p){
  p=p||player;
  return Math.max(1,
    (Number(p.dmg)||0)+
    (Number(p.potionAtkFlat)||0)+
    conditionalAttackFlat(p)
  );
}
function totalAttackPower(p){
  p=p||player;
  return Math.max(1,totalAttackBase(p));
}
function syncDoomWorshipHp(p){
  p=p||player;
  if(!p) return;
  const oldMul=Number(p._doomWorshipHpMul)||1;
  if(!p.doomWorship){
    if(oldMul!==1&&p._doomWorshipHpBase!=null){
      p.maxhp=Math.max(1,Math.round(Number(p._doomWorshipHpBase)||p.maxhp||1));
      p.hp=Math.min(p.hp,p.maxhp);
    }
    p._doomWorshipHpMul=1;
    return;
  }
  if(p._doomWorshipHpBase==null) p._doomWorshipHpBase=Number(p.maxhp)||1;
  const newMul=Math.max(0.1,1-curseRelicStacks(p)*0.05);
  if(Math.abs(newMul-oldMul)<1e-9) return;
  const base=Math.max(1,Number(p._doomWorshipHpBase)||Number(p.maxhp)||1);
  p.maxhp=Math.max(1,Math.round(base*newMul));
  p.hp=Math.min(p.hp,p.maxhp);
  p._doomWorshipHpMul=newMul;
}
function currentAttackMul(p){
  p=p||player;
  let bonus=statBonusFromMul(p.dmgMul)+(Number(p.dmgAdd)||0);
  bonus+=Number(p.trainingAtkBonus)||0;
  bonus+=statBonusFromMul(p.potionAtkMul);
  if(p.noPotionDmgMul&&(!p.potions||p.potions.length===0)) bonus+=statBonusFromMul(p.noPotionDmgMul);
  if(p.investmentReturn&&gold>=150) bonus+=0.10;
  bonus+=curseAttackBonus(p);
  return statMulFromBonus(bonus,0.1);
}
const BASE_NATURAL_REGEN=0.5;
const STALL_REAL_ENEMY_LIMIT=2;
const STALL_WARN_T=8;
const STALL_REGEN_T=12;
const STALL_RAGE_T=18;
const STALL_REINFORCE_T=25;
const STALL_REGEN_MUL=0.05;
function effectiveRegen(p){
  p=p||player;
  let regen=BASE_NATURAL_REGEN+(Number(p.regen)||0)+(p.redPulseBuff>0?(p.redPulseRegen||0):0);
  regen*=statMulFromBonus(statBonusFromMul(p.regenMul),0);
  if(p.regenOverload&&p.hp<=p.maxhp*0.5&&regen>0) regen*=1.5;
  if(p===player&&regen>0&&isStallRegenSuppressed()) regen*=STALL_REGEN_MUL;
  return regen;
}
function fmtSignedNumber(n){
  const v=Math.round(n*10)/10;
  return (v>0?'+':'')+(Number.isInteger(v)?String(v):v.toFixed(1));
}
function effectiveArmor(p){
  p=p||player;
  return clamp((p.armor||0)+(p.potionArmor||0),-1,0.85);
}
function armorDisplayLabel(v){
  return v<0?'받는 피해':'피해 감소';
}
function armorDisplayValue(v){
  return (v<0?'+':'')+Math.round(Math.abs(v)*100)+'%';
}
function incomingDamageMul(p){
  p=p||player;
  return Math.max(0,(1-effectiveArmor(p))*curseDamageTakenMul(p));
}
function calculatePlayerIncomingDamage(baseDamage,opts){
  const p=(opts&&opts.player)||player;
  const base=Math.max(0,Number(baseDamage)||0);
  const difficulty=Number(diffSet&&diffSet.dmg)||1;
  const armor=effectiveArmor(p);
  const armorMul=Math.max(0,1-armor);
  const takenMul=curseDamageTakenMul(p);
  const final=Math.max(0,base*difficulty*armorMul*takenMul);
  return {base,difficulty,armor,armorMul,takenMul,final};
}
function incomingDamageDisplayLabel(mul){
  return mul>1?'받는 피해':'피해 감소';
}
function incomingDamageDisplayValue(mul){
  const diff=Math.abs((Number(mul)||1)-1);
  return (mul>1?'+':'')+Math.round(diff*100)+'%';
}

let specialEffectTooltipEl=null;
let specialEffectTooltipTarget=null;
let specialEffectTooltipTimer=0;
let specialEffectTooltipHideTimer=0;
let specialEffectTooltipPoint={x:0,y:0};

function specialPctText(n){
  const v=Math.round((Number(n)||0)*100);
  return (v>0?'+':'')+v+'%';
}
function specialSignedText(n,suffix){
  const v=Math.round((Number(n)||0)*10)/10;
  return (v>0?'+':'')+(Number.isInteger(v)?String(v):v.toFixed(1))+(suffix||'');
}
function specialSourceType(type){
  return type||'패시브/기타';
}
function sourceDeltaFromApply(source,field){
  if(!source||!source.apply||!field) return 0;
  const src=String(source.apply);
  const re=new RegExp('p\\.'+field+'\\s*([+\\-])=\\s*(-?\\d+(?:\\.\\d+)?)','g');
  let m,total=0;
  while((m=re.exec(src))){
    const n=Number(m[2])||0;
    total+=m[1]==='-'?-n:n;
  }
  return total;
}
function addSpecialPart(parts,label,value,sourceType){
  const n=Number(value)||0;
  if(Math.abs(n)<1e-9) return;
  parts.push({label:label||'특수 효과',value:n,sourceType:specialSourceType(sourceType)});
}
function collectAppliedSourceParts(field,p){
  p=p||player;
  const parts=[];
  (p.relics||[]).forEach(r=>addSpecialPart(parts,r&&r.name,sourceDeltaFromApply(r,field),'유물'));
  const perkIds=new Set(Array.isArray(p.perkIds)?p.perkIds.filter(Boolean):[]);
  if(typeof LEVEL_PERKS!=='undefined'){
    LEVEL_PERKS.forEach(pk=>{
      if(!pk.removed && perkIds.has(perkId(pk))) addSpecialPart(parts,pk.name,sourceDeltaFromApply(pk,field),'레벨업 특성');
    });
  }
  if(typeof TREE_NODES!=='undefined'&&typeof treeUnlocked!=='undefined'){
    TREE_NODES.forEach(node=>{
      if(node&&node.id!=='hub'&&treeUnlocked.has(node.id)) addSpecialPart(parts,node.name,sourceDeltaFromApply(node,field),'패시브 노드');
    });
  }
  return parts;
}
function addTrainingPart(parts,id,label,value){
  const count=trainingCount(id,player);
  if(count>0) addSpecialPart(parts,label,value,'훈련');
}
function addPotionBuffParts(parts,field){
  (player.potionBuffs||[]).forEach(b=>{
    if((b.t||0)<=0) return;
    if(field==='atkFlat') addSpecialPart(parts,b.name||b.label||'포션 효과',b.atkFlat||0,'포션');
    else if(field==='atkMul') addSpecialPart(parts,b.name||b.label||'포션 효과',b.atkMul||0,'포션');
    else if(field==='fireAdd') addSpecialPart(parts,b.name||b.label||'포션 효과',b.fireAdd||0,'포션');
    else if(field==='armor') addSpecialPart(parts,b.name||b.label||'포션 효과',b.armor||0,'포션');
  });
}
function sumSpecialParts(parts){
  return (parts||[]).reduce((sum,row)=>sum+(Number(row.value)||0),0);
}
function addRemainderPart(parts,total,label){
  const diff=(Number(total)||0)-sumSpecialParts(parts);
  if(Math.abs(diff)>=0.005) addSpecialPart(parts,label||'특수 효과',diff,'패시브/기타');
}
function specialPartsToText(parts,formatFn){
  return (parts||[]).map(row=>({
    label:row.label||'특수 효과',
    value:formatFn?formatFn(row.value):String(row.value),
    sourceType:specialSourceType(row.sourceType)
  }));
}
function getGoldBonusBreakdown(){
  const total=(Number(player.goldMul)||1)-1;
  const parts=collectAppliedSourceParts('goldMul',player);
  addRemainderPart(parts,total,'기타 골드 보너스');
  return {total,parts};
}
function getRegenBreakdown(){
  const base=BASE_NATURAL_REGEN;
  const parts=[{label:'기본 재생',value:base,sourceType:'기본 효과'}];
  collectAppliedSourceParts('regen',player).forEach(row=>parts.push(row));
  if(player.redPulseBuff>0) addSpecialPart(parts,'붉은 맥박 발동',player.redPulseRegen||0,'임시 효과');
  const beforeMul=sumSpecialParts(parts);
  const regenMul=statMulFromBonus(statBonusFromMul(player.regenMul),0);
  if(Math.abs(regenMul-1)>0.005) addSpecialPart(parts,'재생 배율 보정',beforeMul*(regenMul-1),'패시브 노드');
  const afterMul=beforeMul*regenMul;
  if(player.regenOverload&&player.hp<=player.maxhp*0.5&&afterMul>0) addSpecialPart(parts,'재생 과부하',afterMul*0.5,'패시브 노드');
  if(player===player&&typeof isStallRegenSuppressed==='function'&&effectiveRegen(player)>0&&isStallRegenSuppressed()){
    addSpecialPart(parts,'장기 전투 억제',effectiveRegen(player)-sumSpecialParts(parts),'시스템');
  }
  const total=effectiveRegen(player);
  addRemainderPart(parts,total,'기타 재생 효과');
  return {total,parts};
}
function getAttackBonusBreakdown(){
  const total=totalAttackPower(player);
  const parts=[];
  addSpecialPart(parts,'기본 공격력',Number(player.dmg)||0,'기본');
  if(player.potionAtkFlat) addSpecialPart(parts,'포션 공격력',Number(player.potionAtkFlat)||0,'포션');
  if(player.noPotionAtkFlat&&(!player.potions||player.potions.length===0)) addSpecialPart(parts,'금욕의 성배',Number(player.noPotionAtkFlat)||0,'유물');
  if(player.lowHpAtkFlat&&player.hp<=player.maxhp*0.30) addSpecialPart(parts,'저체력 조건',Number(player.lowHpAtkFlat)||0,'조건부');
  if(player.crowdRageAtkFlat){
    addSpecialPart(parts,'분노',crowdRageAttackFlat(player),'조건부');
  }
  if(player.goldPowerAtkFlat){
    addSpecialPart(parts,'현질의 힘',Math.min(12,Math.floor((Number(gold)||0)/100))*(Number(player.goldPowerAtkFlat)||0),'패시브 노드');
  }
  if((player.investmentReturn||player.investmentReturnAtkFlat)&&gold>=150) addSpecialPart(parts,'투자 수익',Number(player.investmentReturnAtkFlat)||4,'패시브 노드');
  if(player.ominousAdaptationAtkFlat||player.ominousAdaptation) addSpecialPart(parts,'불길한 적응',curseRelicStacks(player)*(Number(player.ominousAdaptationAtkFlat)||(player.ominousAdaptation?2:0)),'레벨업 특성');
  if(player.doomWorshipAtkFlat||player.doomWorship) addSpecialPart(parts,'파멸 숭배',curseRelicStacks(player)*(Number(player.doomWorshipAtkFlat)||(player.doomWorship?3.2:0)),'레벨업 특성');
  addRemainderPart(parts,total,'기타 공격력');
  return {total,parts};
}
function getCritChanceBreakdown(){
  const total=clamp((Number(player.critChance)||0)+curseContractCritBonus(player),0,CRIT_CHANCE_CAP);
  const parts=[{label:'기본 치명타',value:CRIT_BASE_CHANCE,sourceType:'기본 효과'}];
  collectAppliedSourceParts('critChance',player).forEach(row=>parts.push(row));
  addTrainingPart(parts,'focus','집중 훈련',Number(player.trainingFocusBonus)||0);
  if(curseContractCritBonus(player)>0) addSpecialPart(parts,'타락한 계약',curseContractCritBonus(player),'레벨업 특성');
  addRemainderPart(parts,total,'기타 치명타 보너스');
  return {total,parts};
}
function getCritDamageBreakdown(){
  const total=clamp(Number(player.critMult)||CRIT_BASE_MULT,1,CRIT_MULT_CAP);
  const parts=[{label:'기본 치명타 피해',value:CRIT_BASE_MULT,sourceType:'기본 효과'}];
  collectAppliedSourceParts('critMult',player).forEach(row=>parts.push(row));
  addRemainderPart(parts,total,'기타 치명타 피해');
  return {total,parts};
}
function getMoveSpeedBreakdown(){
  const base=Number(player.spd)||BASE_PLAYER_MOVE_SPEED;
  const total=(playerMoveSpeed(player)/base)-1;
  const parts=[];
  collectAppliedSourceParts('moveSpeedAdd',player).forEach(row=>parts.push(row));
  addTrainingPart(parts,'speed','민첩 훈련',Number(player.trainingSpeedBonus)||0);
  addRemainderPart(parts,total,'기타 이동 보너스');
  return {total,parts,base,final:playerMoveSpeed(player)};
}
function getFireRateBreakdown(){
  const fireHandicap=Number(player._fireHandicap)||1;
  const total=(Number(player.fireAdd)||0)+(Number(player.potionFireAdd)||0)
    +(player.buffs&&player.buffs.haste>0?DODGE_HASTE_FIRE_ADD:0)
    +(player.perfectDodgeFireT>0?0.20:0)
    +(fireHandicap!==1?((1/fireHandicap)-1):0);
  const parts=collectAppliedSourceParts('fireAdd',player);
  addPotionBuffParts(parts,'fireAdd');
  if(player.buffs&&player.buffs.haste>0) addSpecialPart(parts,'추진력 발동',DODGE_HASTE_FIRE_ADD,'임시 효과');
  if(player.perfectDodgeFireT>0) addSpecialPart(parts,'완벽 회피 발동',0.20,'패시브 노드');
  addRemainderPart(parts,total,'기타 발사속도 보너스');
  return {total,parts};
}
function getArmorBreakdown(){
  const total=effectiveArmor(player);
  const parts=collectAppliedSourceParts('armor',player);
  addTrainingPart(parts,'defense','방어 훈련',Number(player.trainingDefenseBonus)||0);
  addPotionBuffParts(parts,'armor');
  addRemainderPart(parts,total,'기타 방어 효과');
  return {total,parts};
}
function getXpBonusBreakdown(){
  const total=(Number(player.xpMul)||1)-1;
  const parts=collectAppliedSourceParts('xpMul',player);
  addRemainderPart(parts,total,'기타 경험치 보너스');
  return {total,parts};
}
function getSpecialScalarBreakdown(field,totalBase){
  const total=Number(player[field])-(totalBase==null?0:totalBase);
  const parts=collectAppliedSourceParts(field,player);
  addRemainderPart(parts,total,'특수 효과');
  return {total,parts};
}
function getSpecialEffectTooltipData(effectKey){
  const key=String(effectKey||'');
  let b=null, title='특수 효과', totalText='', description='현재 적용 중인 특수 효과입니다.', formulaText='적용 방식: 현재 값 기준', kind='special';
  const pct=specialPctText;
  const flat=v=>String(Math.round((Number(v)||0)*10)/10).replace(/\.0$/,'');
  const perSec=v=>specialSignedText(v,'/초');
  const onText=v=>v||'적용 중';
  const simpleSpecial=(cfg)=>{
    const value=onText(typeof cfg.value==='function'?cfg.value():cfg.value);
    return {
      title:cfg.title||'특수 효과',
      totalText:value,
      description:cfg.description||'현재 적용 중인 특수 효과입니다.',
      breakdown:[{label:cfg.label||cfg.title||'특수 효과',value,sourceType:cfg.sourceType||'패시브/기타'}],
      formulaText:cfg.formulaText||'적용 방식: 효과별로 자동 적용됩니다',
      kind:cfg.kind||'special'
    };
  };
  const simpleSpecialMap={
    'crit-heal':{title:'치명타 회복',value:()=>'+'+Math.round(Number(player.critHeal)||0),description:'치명타 적중 시 체력을 회복합니다.',formulaText:'적용 방식: 치명타 적중 시 체력 '+Math.round(Number(player.critHeal)||0)+' 회복',kind:'regen'},
    'crit-explode':{title:'치명타 폭발',value:'적용 중',description:'치명타 발생 시 작은 폭발을 일으킵니다.',formulaText:'적용 방식: 치명타 발생 위치에 추가 폭발 적용',kind:'crit'},
    'multi-shot':{title:'다중사격',value:()=>Math.max(1,Number(player.shots)||1)+'발',description:'한 번에 여러 발을 동시에 발사합니다.',formulaText:'적용 방식: 기본 발사에 추가 투사체를 합산',kind:'shots'},
    'pierce':{title:'관통',value:()=>Math.round(Number(player.pierce)||0)+'회',description:'탄이 적을 뚫고 지나갑니다.',formulaText:'적용 방식: 명중 후 남은 관통 횟수만큼 투사체 유지',kind:'shots'},
    'bounce':{title:'반사',value:()=>Math.round(Number(player.bounce)||0)+'회',description:'탄이 벽이나 적에 튕깁니다.',formulaText:'적용 방식: 충돌 시 남은 반사 횟수만큼 방향 전환',kind:'shots'},
    'homing':{title:'유도탄',value:'적용 중',description:'탄이 가까운 적을 추적합니다.',formulaText:'적용 방식: 비행 중 가까운 적 방향으로 자동 보정',kind:'shots'},
    'back-shot':{title:'쌍방향 사격',value:'적용 중',description:'앞뒤로 동시에 발사합니다.',formulaText:'적용 방식: 발사 시 반대 방향 투사체를 함께 생성',kind:'shots'},
    'burn':{title:'화염탄',value:()=> '+'+Math.round(Number(player.burn)||0),description:'명중 시 3초간 화상을 부여합니다.',formulaText:'적용 방식: 찍을 때마다 화상 피해 +4, 현재 초당 화상 피해 '+Math.round(Number(player.burn)||0)},
    'freeze':{title:'빙결탄',value:'적용 중',description:'명중한 적을 둔화시킵니다.',formulaText:'적용 방식: 명중 시 빙결/둔화 상태를 부여'},
    'poison':{title:'독침',value:()=> '스택당 '+Math.round(Number(player.poison)||0)+'/초',description:'명중 시 4초간 독을 부여합니다. 독은 최대 6스택까지 중첩됩니다.',formulaText:'독 피해: 스택당 초당 '+Math.round(Number(player.poison)||0)+' / 최대 독 스택: 6 / 최대 중첩 시 초당 피해: '+Math.round(Number(player.poison)||0)+' × 6 = '+Math.round((Number(player.poison)||0)*6)+' / 표시 방식: 독 피해는 계속 들어가지만, 화면 숫자는 약 0.35초마다 한 번씩 묶여서 표시됩니다.'},
    'status-damage':{title:'상태 대상 피해',value:()=>pct(Number(player.statusDmgMul)||0),description:'상태이상에 걸린 적에게 주는 직접 피해가 증가합니다.',formulaText:'적용 방식: 대상에게 상태이상이 있을 때 직접 피해 보너스 적용',kind:'attack'},
    'status-dot-damage':{title:'상태이상 피해',value:()=>pct(Number(player.statusDotDmgMul)||0),description:'화상/독 초당 피해가 증가합니다.',formulaText:'적용 방식: 화상 및 독의 초당 피해에 배율 적용',kind:'attack'},
    'execute-instinct':{title:'처형 본능',value:()=>pct(Number(player.executeInstinctDmgMul)||0),description:'체력이 낮은 적에게 주는 피해가 증가합니다.',formulaText:'적용 방식: 체력 25% 이하 적에게 피해 보너스 적용. 보스에게는 절반',kind:'attack'},
    'shop-discount':{title:'상점 눈썰미',value:()=>pct((Number(player.shopCostMul)||1)-1),description:'상점 가격을 낮춥니다.',formulaText:'적용 방식: 상점 가격 계산 시 가격 배율 감소',kind:'gold'},
    'room-entry-heal':{title:'전술 재정비',value:()=> '+'+Math.round(Number(player.roomEntryHeal)||0),description:'새 방에 들어갈 때 체력을 회복합니다.',formulaText:'적용 방식: 방 입장 시 고정 회복량 적용',kind:'regen'},
    'status-spread':{title:'상태 확산',value:'적용 중',description:'상태이상 적 처치 시 주변으로 효과를 전파합니다.',formulaText:'적용 방식: 처치 시 주변 적에게 상태이상 전파'},
    'chain-lightning':{title:'연쇄 번개',value:()=>Math.round(Number(player.chainLightning)||0)+'회',description:'명중 시 근처 적에게 연쇄 번개를 전달합니다.',formulaText:'적용 방식: 명중 후 가까운 적에게 번개를 순차 적용',kind:'attack'},
    'bullet-explode':{title:'명중 폭발',value:'적용 중',description:'명중 지점에서 폭발 피해를 일으킵니다.',formulaText:'적용 방식: 투사체 명중 위치에 범위 피해 적용',kind:'attack'},
    'explode-kill':{title:'처치 폭발',value:()=>Math.round(Number(player.explodeKill)||0),description:'적 처치 시 주변에 폭발을 일으킵니다.',formulaText:'적용 방식: 처치한 적 위치에 범위 폭발 적용',kind:'attack'},
    'dodge-charges':{title:'이중 도약',value:()=>Math.max(1,Math.round(Number(player.dodgeMaxCharges)||1))+'회',description:'회피를 여러 번 충전해 사용할 수 있습니다.',formulaText:'적용 방식: 회피 최대 충전 횟수 증가',kind:'speed'},
    'dodge-blast':{title:'처단',value:()=>Math.round(Number(player.dodgeBlast)||0),description:'회피 시 피해 '+Math.round(Number(player.dodgeBlast)||0)+' 충격파를 발생시킵니다.',formulaText:'적용 방식: 회피 사용 위치에 충격파 피해 '+Math.round(Number(player.dodgeBlast)||0)+' 적용',kind:'attack'},
    'dodge-haste':{title:'추진력',value:'+50%',description:'회피 후 2.5초 동안 발사속도가 증가합니다.',formulaText:'적용 방식: 회피 후 2.5초 동안 발사속도 +50%',kind:'speed'},
    'dodge-iframe':{title:'잔상',value:'적용 중',description:'회피 무적 시간이 증가합니다.',formulaText:'적용 방식: 회피 중 무적 판정 시간을 추가 적용',kind:'speed'},
    'dodge-cd':{title:'그림자 보법',value:()=>pct((Number(player.dodgeCdMul)||1)-1),description:'회피 쿨다운이 감소합니다.',formulaText:'적용 방식: 회피 재사용 대기시간 배율 보정',kind:'speed'},
    'lifesteal':{title:'확률 회복',value:()=>pct(Number(player.lifesteal)||0),description:'적 처치 시 확률로 체력을 회복합니다.',formulaText:'적용 방식: 처치 시 정해진 비율만큼 회복',kind:'regen'},
    'heal-on-kill':{title:'처치 회복',value:()=> '+'+Math.round(Number(player.healOnKill)||0),description:'적 처치 시 체력을 회복합니다.',formulaText:'적용 방식: 처치 시 고정 회복량을 즉시 적용',kind:'regen'},
    'shield-regen':{title:'재충전 보호막',value:'적용 중',description:'일정 시간마다 보호막을 충전합니다.',formulaText:'적용 방식: 정해진 주기마다 보호막 자동 충전',kind:'armor'},
    'last-stand':{title:'막판 정신력',value:'적용 중',description:'치명적인 피해를 한 번 버팁니다.',formulaText:'적용 방식: 발동 조건 충족 시 체력 1로 생존',kind:'hp'},
    'donate':{title:'도네 알림',value:()=>pct(Number(player.donateChance)||0),description:'적 처치 시 확률로 골드를 얻습니다.',formulaText:'적용 방식: 처치 시 확률 판정 후 골드 지급',kind:'gold'},
    'crowd-rage':{title:'분노',value:()=>flat(Number(player.crowdRageAtkFlat)||0)+'/마리',description:'주변 적이 많을수록 공격력이 증가합니다.',formulaText:'적용 방식: 주변 적 1마리당 공격력 +'+flat(Number(player.crowdRageAtkFlat)||0)+', 최대 10마리',kind:'attack'},
    'low-hp':{title:'저체력 폭주',value:()=>flat(Number(player.lowHpAtkFlat)||0),description:'체력이 낮을 때 공격력이 증가합니다.',formulaText:'적용 방식: 체력 30% 이하일 때 공격력 +'+flat(Number(player.lowHpAtkFlat)||0),kind:'attack'},
    'execute':{title:'처형',value:()=>pct(Number(player.execThreshold)||0),description:'체력이 낮은 잡몹을 즉시 처치합니다.',formulaText:'적용 방식: 대상 체력이 기준 이하이면 처형 적용',kind:'attack'},
    'thorn':{title:'가시 갑옷',value:()=>Math.round(Number(player.thorns)||0),description:'피격 시 주변 200px 적에게 현재 가시 피해만큼 피해를 줍니다.',formulaText:'적용 방식: 피격 시 주변 200px 적에게 현재 가시 피해 '+Math.round(Number(player.thorns)||0)+' 적용',kind:'attack'},
    'minion':{title:'구독자 소환',value:'적용 중',description:'자동으로 공격하는 분신을 소환합니다.',formulaText:'적용 방식: 소환수는 플레이어 공격력 일부와 치명타 일부를 상속해 자동 공격'}
  };
  if(simpleSpecialMap[key]) return simpleSpecial(simpleSpecialMap[key]);
  if(key==='regen'){
    b=getRegenBreakdown(); title='체력 재생 '+perSec(b.total); totalText=perSec(b.total); description='현재 적용 중인 자연 재생 효과입니다.'; formulaText='적용 방식: 초당 회복'; kind='regen';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,perSec),formulaText,kind};
  }
  if(key==='goldGain'||key==='광부'){
    b=getGoldBonusBreakdown(); title='골드 획득 '+pct(b.total); totalText=pct(b.total); description='현재 적용 중인 골드 획득 보너스입니다.'; formulaText='적용 방식: 합연산 · 최종 처치 골드 배율 x'+(1+b.total).toFixed(2); kind='gold';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key==='atkBonus'||key==='attackBonus'){
    b=getAttackBonusBreakdown(); title='공격력 '+flat(b.total); totalText=flat(b.total); description='현재 최종 공격력입니다.'; formulaText='적용 방식: 기본 공격력 + 포션 + 조건부 flat 공격력'; kind='attack';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,flat),formulaText,kind};
  }
  if(key==='critChance'||key==='crit-chance'){
    b=getCritChanceBreakdown(); title='치명타 확률 '+pct(b.total); totalText=pct(b.total); description='직접 피해에 적용되는 현재 치명타 확률입니다.'; formulaText='적용 방식: 합연산 · 상한 '+pct(CRIT_CHANCE_CAP); kind='crit';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key==='critDamage'||key==='crit-mult'){
    b=getCritDamageBreakdown(); title='치명타 피해 '+Math.round(b.total*100)+'%'; totalText='x'+b.total.toFixed(1); description='직접 피해 치명타에 적용되는 피해 배율입니다.'; formulaText='적용 방식: 배율 합산 · 상한 x'+CRIT_MULT_CAP.toFixed(1); kind='crit';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,v=>'x'+(Number(v)||0).toFixed(1)),formulaText,kind};
  }
  if(key==='moveSpeed'||key==='move-speed'){
    b=getMoveSpeedBreakdown(); title='이동속도 보너스 '+pct(b.total); totalText=Math.round(b.final); description='현재 이동 속도 계산에 반영되는 보너스입니다.'; formulaText='적용 방식: 기본 이동속도 '+Math.round(b.base)+' × 보너스 = '+Math.round(b.final); kind='speed';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key==='fireRate'||key==='fire-rate'){
    b=getFireRateBreakdown(); title='발사속도 보너스 '+pct(b.total); totalText=pct(b.total); description='현재 초당 발사 계산에 반영되는 보너스입니다.'; formulaText='적용 방식: 합연산 · 현재 초당 '+playerFireRate(player).toFixed(1)+'발'; kind='attack';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key==='damageReduction'||key==='armor'||key==='armor-risk'){
    b=getArmorBreakdown();
    const finalMul=incomingDamageMul(player);
    const takenMul=curseDamageTakenMul(player);
    const rows=specialPartsToText(b.parts,pct);
    if(Math.abs(takenMul-1)>0.005) rows.push({label:'받는 피해 배율',value:pct(takenMul-1),sourceType:'리스크'});
    title=incomingDamageDisplayLabel(finalMul)+' '+incomingDamageDisplayValue(finalMul); totalText=incomingDamageDisplayValue(finalMul); description='현재 최종 받는 피해 보정입니다.'; formulaText='적용 방식: (1 - 방어 수치) x 받는 피해 배율'; kind='armor';
    return {title,totalText,description,breakdown:rows,formulaText,kind};
  }
  if(key==='xpGain'||key==='xp-boost'){
    b=getXpBonusBreakdown(); title='경험치 획득 '+pct(b.total); totalText=pct(b.total); description='현재 적용 중인 경험치 획득 보너스입니다.'; formulaText='적용 방식: 합연산 · 최종 경험치 배율 x'+(1+b.total).toFixed(2); kind='gold';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key==='bossDmg'){
    b=getSpecialScalarBreakdown('bossDmgMul',1); title='보스 피해 '+pct(b.total); totalText=pct(b.total); description='보스와 정예에게 적용되는 추가 피해입니다.'; formulaText='적용 방식: 합연산'; kind='attack';
    return {title,totalText,description,breakdown:specialPartsToText(b.parts,pct),formulaText,kind};
  }
  if(key.indexOf('potion-buff:')===0){
    const bId=key.slice('potion-buff:'.length);
    const buff=(player.potionBuffs||[]).find(x=>(x.id||[x.atkFlat,x.atkMul,x.fireAdd,x.armor,x.regen].join(':'))===bId);
    const label=buff&&(buff.label||buff.name)||'포션 효과';
    const val=buff&&buff.regen?perSec(buff.regen):(buff&&buff.atkFlat?flat(buff.atkFlat):(buff&&buff.atkMul?pct(buff.atkMul):(buff&&buff.fireAdd?pct(buff.fireAdd):(buff&&buff.armor?pct(buff.armor):''))));
    return {title:label,totalText:val||'ON',description:(buff&&buff.desc)||'포션으로 적용 중인 임시 효과입니다.',breakdown:[{label:(buff&&buff.name)||'포션',value:val||'ON',sourceType:'포션'}],formulaText:'적용 방식: 지속시간 '+Math.max(0,Math.ceil(buff&&buff.t||0))+'초 남음',kind:'special'};
  }
  return {title:'특수 효과',totalText:'적용 중',description:'현재 적용 중인 특수 효과입니다.',breakdown:[{label:'특수 효과',value:'적용 중',sourceType:'패시브/기타'}],formulaText:'적용 방식: 효과별로 자동 적용됩니다',kind:'special'};
}
function statKeyFromLabel(label){
  return ((String(label||'').match(/^(\S+)/)||[])[1]||'special').trim();
}
function statNameFromLabel(label){
  return String(label||'').replace(/^\S+\s*/,'').trim()||'능력치';
}
function statRowByKey(statKey,p){
  const key=String(statKey||'');
  return (spStats(p||player)||[]).find(row=>statKeyFromLabel(row&&row[0])===key)||null;
}
function getMaxHpBreakdown(){
  const total=Number(player.maxhp)||0;
  const parts=[{label:'기본 최대 체력',value:70,sourceType:'기본'}];
  const hpTraining=trainingCount('hp',player)*15;
  if(hpTraining>0) parts.push({label:'체력 훈련',value:hpTraining,sourceType:'훈련'});
  collectAppliedSourceParts('maxhp',player).forEach(row=>parts.push(row));
  addRemainderPart(parts,total,'기타 최대 체력');
  return {total,parts};
}
function getProjectileBreakdown(){
  const total=(player.shots||1)+(player.shadowBarrageT>0?(player.shadowBarrageExtraShots||1):0);
  const parts=[{label:'기본 투사체',value:1,sourceType:'기본'}];
  if((player.shots||1)>1) parts.push({label:'영구 투사체 증가',value:(player.shots||1)-1,sourceType:'유물/특성'});
  if(player.shadowBarrageT>0) parts.push({label:'그림자 난무',value:player.shadowBarrageExtraShots||1,sourceType:'일시 효과'});
  addRemainderPart(parts,total,'기타 투사체');
  return {total,parts};
}
function getStatBreakdown(statKey){
  const key=String(statKey||'');
  if(key==='hp') return getMaxHpBreakdown();
  if(key==='attack') return getAttackBonusBreakdown();
  if(key==='crit') return getCritChanceBreakdown();
  if(key==='crit-dmg') return getCritDamageBreakdown();
  if(key==='fire-rate') return getFireRateBreakdown();
  if(key==='shots') return getProjectileBreakdown();
  if(key==='speed') return getMoveSpeedBreakdown();
  if(key==='armor') return getArmorBreakdown();
  if(key==='regen') return getRegenBreakdown();
  if(key==='gold') return getGoldBonusBreakdown();
  return {total:0,parts:[]};
}
function getStatTooltipData(statKey){
  const key=String(statKey||'');
  const row=statRowByKey(key,player);
  const titleName=row?statNameFromLabel(row[0]):'능력치';
  const totalText=row?String(row[1]):'-';
  const pct=specialPctText;
  const flat=v=>String(Math.round((Number(v)||0)*10)/10).replace(/\.0$/,'');
  const perSec=v=>specialSignedText(v,'/초');
  let description='현재 최종 능력치입니다.';
  let formulaText='적용 방식: 실제 전투 계산값을 기준으로 표시';
  let breakdown=[];
  let kind=spIconClass(key,'','',key);
  if(key==='hp'){
    const b=getMaxHpBreakdown();
    description='현재 최대 체력입니다.';
    breakdown=specialPartsToText(b.parts,flat);
    formulaText='적용 방식: 기본 체력에 훈련, 유물, 특성 보너스를 합산';
  }else if(key==='attack'){
    const b=getAttackBonusBreakdown();
    breakdown=specialPartsToText(b.parts,flat);
    description='현재 최종 공격력입니다.';
    formulaText='적용 방식: 기본 공격력 + 포션 공격력 + 조건부 공격력 = '+totalText;
  }else if(key==='crit'){
    const b=getCritChanceBreakdown();
    breakdown=specialPartsToText(b.parts,pct);
    description='현재 치명타 확률입니다.';
    formulaText='적용 방식: 합연산 · 상한 '+pct(CRIT_CHANCE_CAP);
  }else if(key==='crit-dmg'){
    const b=getCritDamageBreakdown();
    breakdown=specialPartsToText(b.parts,v=>'x'+(Number(v)||0).toFixed(1));
    description='치명타가 발생했을 때 적용되는 피해 배율입니다.';
    formulaText='적용 방식: 배율 합산 · 상한 x'+CRIT_MULT_CAP.toFixed(1);
  }else if(key==='fire-rate'){
    const b=getFireRateBreakdown();
    breakdown=[{label:'기본 발사 쿨다운',value:playerShootCooldown(Object.assign({},player,{fireAdd:0,potionFireAdd:0,_fireHandicap:1})).toFixed(2)+'초',sourceType:'기본'}]
      .concat(specialPartsToText(b.parts,pct));
    description='현재 초당 발사 수입니다.';
    formulaText='적용 방식: 발사 쿨다운 보정 후 1 / 쿨다운 = '+totalText;
  }else if(key==='shots'){
    const b=getProjectileBreakdown();
    breakdown=specialPartsToText(b.parts,v=>(Number(v)||0)+'발');
    description='한 번에 발사되는 현재 투사체 수입니다.';
    formulaText='적용 방식: 기본 투사체와 추가 투사체를 합산';
  }else if(key==='speed'){
    const b=getMoveSpeedBreakdown();
    breakdown=[{label:'기본 이동속도',value:Math.round(b.base),sourceType:'기본'}].concat(specialPartsToText(b.parts,pct));
    description='현재 최종 이동속도입니다.';
    formulaText='적용 방식: 기본 이동속도 '+Math.round(b.base)+' x 이동 보너스 = '+Math.round(b.final);
  }else if(key==='armor'){
    const b=getArmorBreakdown();
    breakdown=specialPartsToText(b.parts,pct);
    const takenMul=curseDamageTakenMul(player);
    if(Math.abs(takenMul-1)>0.005) breakdown.push({label:'받는 피해 배율',value:pct(takenMul-1),sourceType:'리스크'});
    const finalMul=incomingDamageMul(player);
    description='현재 최종 받는 피해 보정입니다.';
    formulaText='적용 방식: (1 - 방어 수치) x 받는 피해 배율 = '+incomingDamageDisplayLabel(finalMul)+' '+incomingDamageDisplayValue(finalMul);
  }else if(key==='regen'){
    const b=getRegenBreakdown();
    breakdown=specialPartsToText(b.parts,perSec);
    description='현재 초당 체력 재생량입니다.';
    formulaText='적용 방식: 기본 재생과 추가 재생을 합산 후 배율 보정';
  }else{
    breakdown=[{label:'현재 값',value:totalText,sourceType:'기타'}];
  }
  if(!breakdown.length) breakdown=[{label:'현재 값',value:totalText,sourceType:'기타'}];
  return {
    title:titleName+' '+totalText,
    totalText,
    description,
    breakdown,
    formulaText,
    kind:kind||'special'
  };
}
function ensureSpecialEffectTooltip(){
  if(specialEffectTooltipEl&&document.body.contains(specialEffectTooltipEl)) return specialEffectTooltipEl;
  specialEffectTooltipEl=document.getElementById('specialEffectTooltip');
  if(specialEffectTooltipEl) return specialEffectTooltipEl;
  specialEffectTooltipEl=document.createElement('div');
  specialEffectTooltipEl.id='specialEffectTooltip';
  specialEffectTooltipEl.className='special-tooltip hidden';
  specialEffectTooltipEl.setAttribute('role','tooltip');
  document.body.appendChild(specialEffectTooltipEl);
  return specialEffectTooltipEl;
}
function renderSpecialEffectTooltip(data){
  const rows=(data.breakdown||[]).map(row=>
    '<div class="special-tooltip-row"><span>'+spEsc(row.label||'특수 효과')+'</span><b>'+spEsc(row.value==null?'':row.value)+'</b><em>'+spEsc(row.sourceType||'패시브/기타')+'</em></div>'
  ).join('');
  return '<div class="special-tooltip-head"><div><b>'+spEsc(data.title)+'</b><span>'+spEsc(data.description)+'</span></div><strong>'+spEsc(data.totalText||'')+'</strong></div>'+
    '<div class="special-tooltip-line"></div>'+
    '<div class="special-tooltip-section-title">구성</div>'+
    '<div class="special-tooltip-breakdown">'+(rows||'<div class="special-tooltip-row"><span>특수 효과</span><b>적용 중</b><em>패시브/기타</em></div>')+'</div>'+
    '<div class="special-tooltip-final"><span>최종 적용</span><b>'+spEsc(data.totalText||'ON')+'</b></div>'+
    '<div class="special-tooltip-formula">'+spEsc(data.formulaText||'적용 방식: 효과별 규칙 적용')+'</div>';
}
function positionSpecialEffectTooltip(evt){
  const tip=ensureSpecialEffectTooltip();
  if(evt&&evt.clientX!=null) specialEffectTooltipPoint={x:evt.clientX,y:evt.clientY};
  const margin=14,gap=14,rect=tip.getBoundingClientRect();
  let x=specialEffectTooltipPoint.x+gap,y=specialEffectTooltipPoint.y+gap;
  if(x+rect.width+margin>window.innerWidth) x=specialEffectTooltipPoint.x-rect.width-gap;
  if(y+rect.height+margin>window.innerHeight) y=specialEffectTooltipPoint.y-rect.height-gap;
  x=clamp(x,margin,Math.max(margin,window.innerWidth-rect.width-margin));
  y=clamp(y,margin,Math.max(margin,window.innerHeight-rect.height-margin));
  tip.style.left=Math.round(x)+'px';
  tip.style.top=Math.round(y)+'px';
}
function showSpecialEffectTooltip(targetEl,tooltipData,evt){
  clearTimeout(specialEffectTooltipHideTimer);
  TooltipManager.setActive('special');
  specialEffectTooltipTarget=targetEl;
  const tip=ensureSpecialEffectTooltip();
  tip.className='special-tooltip effect-'+(tooltipData.kind||'special');
  tip.innerHTML=renderSpecialEffectTooltip(tooltipData);
  tip.classList.remove('hidden','show');
  positionSpecialEffectTooltip(evt);
  requestAnimationFrame(()=>tip.classList.add('show'));
}
function hideSpecialEffectTooltip(instant){
  clearTimeout(specialEffectTooltipTimer);
  specialEffectTooltipTarget=null;
  if(!specialEffectTooltipEl) return;
  specialEffectTooltipEl.classList.remove('show');
  TooltipManager.clear('special');
  if(instant){
    clearTimeout(specialEffectTooltipHideTimer);
    specialEffectTooltipEl.classList.add('hidden');
    return;
  }
  specialEffectTooltipHideTimer=setTimeout(()=>{
    if(specialEffectTooltipEl&&!specialEffectTooltipEl.classList.contains('show')) specialEffectTooltipEl.classList.add('hidden');
  },110);
}
function initSpecialEffectTooltipEvents(){
  if(document.body&&document.body.dataset.specialTooltipEvents==='1') return;
  if(!document.body) return;
  document.body.dataset.specialTooltipEvents='1';
  document.addEventListener('mouseover',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-effect-key]');
    if(!target) return;
    if(specialEffectTooltipTarget===target) return;
    clearTimeout(specialEffectTooltipTimer);
    specialEffectTooltipPoint={x:evt.clientX,y:evt.clientY};
    specialEffectTooltipTimer=setTimeout(()=>showSpecialEffectTooltip(target,getSpecialEffectTooltipData(target.dataset.effectKey),evt),110);
  });
  document.addEventListener('mousemove',evt=>{
    if(specialEffectTooltipTarget&&!document.body.contains(specialEffectTooltipTarget)) hideSpecialEffectTooltip();
    else if(specialEffectTooltipTarget) positionSpecialEffectTooltip(evt);
  });
  document.addEventListener('mouseout',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-effect-key]');
    if(!target) return;
    if(evt.relatedTarget&&target.contains(evt.relatedTarget)) return;
    hideSpecialEffectTooltip();
  });
  document.addEventListener('focusin',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-effect-key]');
    if(target) showSpecialEffectTooltip(target,getSpecialEffectTooltipData(target.dataset.effectKey),{clientX:target.getBoundingClientRect().right,clientY:target.getBoundingClientRect().top});
  });
  document.addEventListener('focusout',evt=>{
    if(evt.target&&evt.target.closest&&evt.target.closest('[data-effect-key]')) hideSpecialEffectTooltip();
  });
  window.addEventListener('blur',hideSpecialEffectTooltip);
}
let trainingTooltipTarget=null;
let trainingTooltipTimer=0;
let statTooltipTarget=null;
let statTooltipTimer=0;
function showTrainingTooltip(targetEl,tooltipData,evt){
  clearTimeout(specialEffectTooltipHideTimer);
  TooltipManager.setActive('training');
  trainingTooltipTarget=targetEl;
  const tip=ensureSpecialEffectTooltip();
  tip.className='special-tooltip effect-training';
  tip.innerHTML=renderSpecialEffectTooltip(tooltipData);
  tip.classList.remove('hidden','show');
  positionSpecialEffectTooltip(evt);
  requestAnimationFrame(()=>tip.classList.add('show'));
}
function hideTrainingTooltip(instant){
  clearTimeout(trainingTooltipTimer);
  trainingTooltipTarget=null;
  if(!specialEffectTooltipEl) return;
  if(TooltipManager.active!=='training') return;
  specialEffectTooltipEl.classList.remove('show');
  TooltipManager.clear('training');
  if(instant){
    clearTimeout(specialEffectTooltipHideTimer);
    specialEffectTooltipEl.classList.add('hidden');
    return;
  }
  specialEffectTooltipHideTimer=setTimeout(()=>{
    if(specialEffectTooltipEl&&!specialEffectTooltipEl.classList.contains('show')) specialEffectTooltipEl.classList.add('hidden');
  },110);
}
function showStatTooltip(targetEl,tooltipData,evt){
  clearTimeout(specialEffectTooltipHideTimer);
  TooltipManager.setActive('stat');
  statTooltipTarget=targetEl;
  const tip=ensureSpecialEffectTooltip();
  tip.className='special-tooltip effect-'+(tooltipData.kind||'stat');
  tip.innerHTML=renderSpecialEffectTooltip(tooltipData);
  tip.classList.remove('hidden','show');
  positionSpecialEffectTooltip(evt);
  requestAnimationFrame(()=>tip.classList.add('show'));
}
function hideStatTooltip(instant){
  clearTimeout(statTooltipTimer);
  statTooltipTarget=null;
  if(!specialEffectTooltipEl) return;
  if(TooltipManager.active!=='stat') return;
  specialEffectTooltipEl.classList.remove('show');
  TooltipManager.clear('stat');
  if(instant){
    clearTimeout(specialEffectTooltipHideTimer);
    specialEffectTooltipEl.classList.add('hidden');
    return;
  }
  specialEffectTooltipHideTimer=setTimeout(()=>{
    if(specialEffectTooltipEl&&!specialEffectTooltipEl.classList.contains('show')) specialEffectTooltipEl.classList.add('hidden');
  },110);
}
function initTrainingTooltipEvents(){
  if(document.body&&document.body.dataset.trainingTooltipEvents==='1') return;
  if(!document.body) return;
  document.body.dataset.trainingTooltipEvents='1';
  document.addEventListener('mouseover',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-training-key]');
    if(!target) return;
    if(trainingTooltipTarget===target) return;
    clearTimeout(trainingTooltipTimer);
    specialEffectTooltipPoint={x:evt.clientX,y:evt.clientY};
    trainingTooltipTimer=setTimeout(()=>showTrainingTooltip(target,getTrainingTooltipData(target.dataset.trainingKey),evt),110);
  });
  document.addEventListener('mousemove',evt=>{
    if(trainingTooltipTarget&&!document.body.contains(trainingTooltipTarget)) hideTrainingTooltip();
    else if(trainingTooltipTarget) positionSpecialEffectTooltip(evt);
  });
  document.addEventListener('mouseout',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-training-key]');
    if(!target) return;
    if(evt.relatedTarget&&target.contains(evt.relatedTarget)) return;
    hideTrainingTooltip();
  });
  document.addEventListener('focusin',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-training-key]');
    if(target) showTrainingTooltip(target,getTrainingTooltipData(target.dataset.trainingKey),{clientX:target.getBoundingClientRect().right,clientY:target.getBoundingClientRect().top});
  });
  document.addEventListener('focusout',evt=>{
    if(evt.target&&evt.target.closest&&evt.target.closest('[data-training-key]')) hideTrainingTooltip();
  });
  window.addEventListener('blur',hideTrainingTooltip);
}
function initStatTooltipEvents(){
  if(document.body&&document.body.dataset.statTooltipEvents==='1') return;
  if(!document.body) return;
  document.body.dataset.statTooltipEvents='1';
  document.addEventListener('mouseover',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-stat-key]');
    if(!target) return;
    if(statTooltipTarget===target) return;
    clearTimeout(statTooltipTimer);
    specialEffectTooltipPoint={x:evt.clientX,y:evt.clientY};
    statTooltipTimer=setTimeout(()=>showStatTooltip(target,getStatTooltipData(target.dataset.statKey),evt),110);
  });
  document.addEventListener('mousemove',evt=>{
    if(statTooltipTarget&&!document.body.contains(statTooltipTarget)) hideStatTooltip();
    else if(statTooltipTarget) positionSpecialEffectTooltip(evt);
  });
  document.addEventListener('mouseout',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-stat-key]');
    if(!target) return;
    if(evt.relatedTarget&&target.contains(evt.relatedTarget)) return;
    hideStatTooltip();
  });
  document.addEventListener('focusin',evt=>{
    const target=evt.target&&evt.target.closest&&evt.target.closest('[data-stat-key]');
    if(target) showStatTooltip(target,getStatTooltipData(target.dataset.statKey),{clientX:target.getBoundingClientRect().right,clientY:target.getBoundingClientRect().top});
  });
  document.addEventListener('focusout',evt=>{
    if(evt.target&&evt.target.closest&&evt.target.closest('[data-stat-key]')) hideStatTooltip();
  });
  window.addEventListener('blur',hideStatTooltip);
}
function effectiveCritChance(target,bullet){
  let chance=(player&&player.critChance!=null)?player.critChance:CRIT_BASE_CHANCE;
  chance+=curseContractCritBonus(player);
  if(target&&player&&player.statusCritChance>0&&targetHasStatus(target)) chance+=player.statusCritChance;
  if(target&&player&&player.chillCritChance>0&&target.chillT>0) chance+=player.chillCritChance;
  if(bullet&&bullet.extraProjectile&&player&&player.extraProjectileCritChance>0) chance+=player.extraProjectileCritChance;
  return clamp(chance,0,CRIT_CHANCE_CAP);
}
function effectiveCritMult(){
  return clamp((player&&player.critMult!=null)?player.critMult:CRIT_BASE_MULT,1,CRIT_MULT_CAP);
}
function triggerCritEffects(target){
  if(!player) return;
  if(player.redPulseRegen>0&&performance.now()>=(player.redPulseCd||0)){
    player.redPulseCd=performance.now()+6000;
    player.redPulseBuff=3;
    if(target) burst(target.x,target.y,'#ff4d6d',10,170);
  }
}
function healPlayerRaw(amount,x,y){
  const n=Math.max(0,amount);
  if(n<=0) return 0;
  enforceFixedMaxHp(player);
  const before=player.hp;
  player.hp=Math.min(player.maxhp,player.hp+n);
  const used=player.hp-before;
  const over=n-used;
  if(over>0&&player.overhealShieldRate>0){
    const cap=player.maxhp*(player.overhealShieldCap||0.2);
    player.overhealShield=clamp((player.overhealShield||0)+over*player.overhealShieldRate,0,cap);
  }
  if(x!=null&&y!=null&&used>0) floatHeart(x,y,Math.round(used));
  return used;
}
function healPlayer(amount,x,y){
  const amp=(player&&player._usingPotion&&player.potionAmp)?1+Number(player.potionAmp||0):1;
  const n=Math.max(0,Math.round(amount*amp*statMulFromBonus(statBonusFromMul(player&&player.recoveryMul),0)));
  if(n<=0) return 0;
  return healPlayerRaw(n,x,y);
}
function healPlayerNoDrop(amount,x,y){
  const used=healPlayer(amount,null,null);
  if(used>0){
    const hx=x==null?player.x:x;
    const hy=y==null?player.y-player.r-12:y;
    if(typeof GS!=='undefined'&&GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(hx,hy,Math.round(used),false,'heal');
    else burst(hx,hy,'#5dff9b',6,120);
  }
  return used;
}
function relicAttackPower(mult){
  return Math.max(1,totalAttackPower(player)*(mult||1));
}
function isKkotMain(e){
  return !!(e&&e.type==='kkotchung'&&!e.clone);
}
function handleEnemyDefeat(e){
  if(!e||!enemies.includes(e)) return false;
  if(e.type==='hyechul'&&(e.phase||1)<3){ hyechulNextPhase(e); return true; }
  if(isKkotMain(e)&&(e.phase||1)<3){ kkotNextPhase(e); return true; }
  killEnemy(e);
  return true;
}
function applyEnemyDirectDamage(o,dmg,color,opts){
  if(!o) return;
  o.hp-=dmg*(1-(o.armor||0)); o.hitT=0.1; if(!(opts&&opts.silent)) burst(o.x,o.y,color||'#7ad7ff',7,170);
  if(opts&&opts.chainKill) o._chainKillSource=true;
  if(o.hp<=0) handleEnemyDefeat(o);
}
function intentDamage(e,dmg){
  return dmg*((e&&e.atkBuffT>0)?1.2:1)*((e&&e.intentDmgMul)||1);
}
function enemyTouchBaseDamage(e){
  return e?(e.touchDmg ?? e.bodyDmg ?? e.contactDmg ?? e.dmg ?? 0):0;
}
// 몸박 밸런스 메모(어려움 후반, 생성 피해 스케일 2.2 * hard 피해 2.7 = 5.94, 방어/받피 전)
// 저격러 77.2 -> 59.4 / 자잘자 일반 95.0 -> 95.0 / 자잘자 엘리트 142.6 -> 133.1
// 울트라 118.8 -> 118.8 / 광천김 41.6 -> 41.6 / 러라 59.4 -> 59.4
// 나무 77.2 -> 77.2 / 포베어 101.0 -> 77.2 / 박제인간 101.0 -> 101.0
function enemyTouchDamage(e){
  const d=intentDamage(e,enemyTouchBaseDamage(e));
  if(e) e.intentDmgMul=1;
  return d;
}
function setIntent(o,icon,label,time,fire){
  if(!o||o.intent) return false;
  o.intent={icon,label,t:time,max:time,fire};
  return true;
}
function tickIntent(o,dt){
  if(!o||!o.intent) return false;
  o.intent.t-=dt;
  if(o.intent.t<=0){
    const f=o.intent.fire;
    o.intent=null;
    if(f) f();
    return true;
  }
  return true;
}
function aimBulletFrom(o,speed,dmg,r,src){
  const a=Math.atan2(player.y-o.y,player.x-o.x);
  eBullets.push({x:o.x,y:o.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:r||8,dmg:intentDamage(o,dmg||9),life:4,srcName:src||o.name||o.label});
}
function intentShockwave(x,y,r,dmg,src){
  burst(x,y,'#ffb347',18,260);
  if(dist2(x,y,player.x,player.y)<r*r) hurtPlayer(dmg,src||'충격파');
  const k=16;
  for(let i=0;i<k;i++){
    const a=i/k*TAU;
    eBullets.push({x,y,vx:Math.cos(a)*185,vy:Math.sin(a)*185,r:7,dmg:Math.max(5,Math.round(dmg*0.35)),life:2.2,srcName:src||'충격파'});
  }
}
function countEnemyHazards(kind,srcName){
  return hazards.filter(h=>h&&(!kind||h.kind===kind)&&(!srcName||h.srcName===srcName)).length;
}
function warnAoE(x,y,r,warnT,liveT,dmg,srcName,col){
  hazards.push({x:clamp(x,34,W-34),y:clamp(y,90,H-50),t:0,warnT:warnT||0.75,liveT:liveT||0.45,r:r||80,hit:false,dmg:dmg||10,srcName:srcName||null,col:col||null});
}
function spawnGravityWell(x,y,r,life,pull,dmg,srcName){
  if(sfx.enemyCast) sfx.enemyCast();
  hazards.push({kind:'gravitywell',x:clamp(x,50,W-50),y:clamp(y,105,H-60),r:r||135,t:0,life:life||2.8,warnT:0.75,pull:pull||185,dmg:dmg||0,tickCd:0,srcName:srcName||'gravity',seed:rand(0,TAU)});
}
function spawnWarnedSlowField(x,y,r,life,warnT,srcName){
  hazards.push({kind:'slowfield',x:clamp(x,40,W-40),y:clamp(y,110,H-60),r:r||90,t:0,life:life||3,warnT:warnT||0.75,seed:rand(0,TAU),srcName:srcName||null});
}
function intentLaser(x,y,ang,width,range,dmg,src,color){
  for(let i=0;i<9;i++){
    eBullets.push({x:x+Math.cos(ang)*i*42,y:y+Math.sin(ang)*i*42,vx:Math.cos(ang)*260,vy:Math.sin(ang)*260,r:6,dmg:Math.max(6,Math.round(dmg*0.45)),life:1.2,srcName:src||'레이저'});
  }
  burst(x+Math.cos(ang)*range*0.45,y+Math.sin(ang)*range*0.45,color||'#ff4d6d',12,220);
  const px=player.x-x, py=player.y-y;
  const along=px*Math.cos(ang)+py*Math.sin(ang);
  const side=Math.abs(-px*Math.sin(ang)+py*Math.cos(ang));
  if(along>0&&along<range&&side<width) hurtPlayer(dmg,src||'레이저');
}
function spawnSlimeSplit(e){
  if(!e||e.splitChild) return;
  for(let i=0;i<2;i++){
    spawnEnemy('slime_green',clamp(e.x+rand(-24,24),30,W-30),clamp(e.y+rand(-24,24),40,H-40),0.65);
    const s=enemies[enemies.length-1];
    s.splitChild=true; s.summoned=true; s.noKillScore=true; s.r=Math.max(9,e.r*0.62); s.hp=Math.max(6,e.maxhp*0.35); s.maxhp=s.hp; s.xp=1;
  }
}
function act3SummonsOf(owner,type){ return enemies.filter(o=>o&&o._summonOwner===owner&&(!type||o.type===type)); }
function spawnAct3SandSoldier(owner){
  if(!owner||act3SummonsOf(owner,'act3_sand_soldier').length>=5) return null;
  const ang=rand(0,TAU), rr=(owner.r||20)+rand(28,64);
  spawnEnemy('act3_sand_soldier',clamp(owner.x+Math.cos(ang)*rr,28,W-28),clamp(owner.y+Math.sin(ang)*rr,70,H-42),1);
  const s=enemies[enemies.length-1];
  s._summonOwner=owner; s.summoned=true; s.noReward=true; s.noKillScore=true; s.xp=0; s.label='모래병사';
  s.hp=Math.max(18,(owner.maxhp||120)*0.18); s.maxhp=s.hp; s.dmg=Math.max(7,(owner.dmg||8)*1.15); s.touchDmg=s.dmg;
  burst(s.x,s.y,'#e0b85a',10,140);
  return s;
}
function spawnAct3GlitchClone(owner){
  if(!owner) return null;
  if(act3SummonsOf(owner,'act3_clone').length>=2) return null;
  spawnEnemy('act3_clone',clamp(owner.x+rand(-74,74),38,W-38),clamp(owner.y+rand(-48,88),82,H-54),0.55);
  const c=enemies[enemies.length-1];
  c._summonOwner=owner; c.clone=true; c.summoned=true; c.noReward=true; c.noKillScore=true; c.splitChild=true; c.ai='shooter'; c.label='글리치 분신'; c.xp=0;
  c.hp=Math.min(65,Math.max(30,(owner.maxhp||160)*0.22)); c.maxhp=c.hp; c.dmg=Math.max(5,(owner.dmg||12)*0.5); c.touchDmg=Math.max(4,(owner.touchDmg||10)*0.5);
  c.cool=Math.max(1.2,(owner.cool||1.4)*1.25); c.range=280; c._glitchClone=true;
  burst(c.x,c.y,'#b86bff',12,160);
  return c;
}
function spawnAct3BeamSweep(e){
  if(sfx.enemyCore) sfx.enemyCore();
  const dir=Math.atan2(player.y-e.y,player.x-e.x), spin=(Math.random()<0.5?-1:1)*0.72; e.hitT=Math.max(e.hitT||0,0.25);
  hazards.push({kind:'beamSweep',x:e.x,y:e.y,ang:dir-spin*0.9,rot:spin,range:e.range||620,width:20,warnT:0.90,liveT:2.05,t:0,dmg:Math.max(8,Math.round((e.dmg||16)*0.72)),srcName:e.name||e.label||'중계차',seed:rand(0,TAU)});
  burst(e.x,e.y,'#58d8ff',12,150);
}
function onsterAwaken(e){
  if(sfx.enemyChain) sfx.enemyChain(); setTimeout(()=>{ if(sfx.enemyGlitch) sfx.enemyGlitch(); },90);
  if(typeof clearA3Systems==='function') clearA3Systems();
  e.awakened=true; e.phase=2; e.sprite='onster_p2'; e.color='#ff4dd2'; e.intentInvuln=1.5; e.stunT=1.5; e.spd*=1.28; e.cool=Math.max(0.75,(e.cool||1.35)*0.72);
  eBullets.length=0; hazards=[]; screenShake=Math.max(screenShake||0,22); hitFlash=Math.max(hitFlash||0,0.55);
  banner('온스터 각성','사슬이 끊어졌다',1600);
  for(let i=0;i<24;i++){ const a=i/24*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,r:8,dmg:9,life:3.2,srcName:'온스터 사슬 파편'}); }
  if(typeof beep==='function'){ beep(90,0.45,'sawtooth',0.07); beep(240,0.36,'triangle',0.05); }
}
function onsterSummons(e){ return enemies.filter(o=>o&&o._summonOwner===e); }
function spawnOnsterMinion(e){
  if(onsterSummons(e).length>=5) return;
  const s=spawnAct3SandSoldier(e);
  if(!s) return;
  const _hp=clamp(Math.round((e.maxhp||600)*0.04),65,210); s.hp=_hp; s.maxhp=_hp;
  s.label='사슬 잔재'; s.color='#8d72ff'; s._summonOwner=e; s.noReward=true; s.noKillScore=true; s.summoned=true; s.xp=0;
}
function onsterChainBeam(e){
  if(sfx.enemyChain) sfx.enemyChain();
  const ang=Math.atan2(player.y-e.y,player.x-e.x);
  kijoLaserWarns.push({x:e.x,y:e.y,ang,width:e.awakened?23:17,range:720,t:0,warn:e.awakened?0.70:0.75,color:e.awakened?'#ff4dd2':'#8d72ff',fired:false,sniper:true,dmg:e.awakened?22:16,srcName:'온스터 사슬빔'});
}
function set3PhaseName(b){ return (b.setPhase||1)===1?'현진':((b.setPhase||1)===2?'번검':'케케로로'); }
function set3NextPhase(b){
  if(typeof clearA3Systems==='function') clearA3Systems();
  const ph=(b.setPhase||1)+1;
  b.setPhase=ph; b.maxhp=(b.phaseHp&&b.phaseHp[ph-1])||b.maxhp; b.hp=b.maxhp;
  b.hitT=0.2; b.stunT=1.0; b.burnT=0; b.psT=0; b.psStacks=0; b.enraged=false; b.patI=0; b.attackT=1.8; b.a3LastControl=null; b.a3SkipControl=false; b.intent=null;
  b.sprite='set3'; b.color=ph===2?'#38e8ff':'#ff4dd2'; b.spd=(b.baseSpd||62)*(ph===2?1.06:1.14); b.r=ph===2?68:72; b.x=W/2; b.y=135;
  eBullets.length=0; hazards=[]; screenShake=Math.max(screenShake||0,24); hitFlash=Math.max(hitFlash||0,0.55);
  const name=set3PhaseName(b);
  banner('세트3형제 · '+name, ph===2?'거리는 충분히 좁혀졌다':'이제부터가 진짜 방송이다',1700);
  bossEvolve={phase:ph,t:0,line:ph===2?'번검이 화면을 가른다':'케케로로가 신호를 장악한다',name,col:b.color,e:b};
  cutsceneT=1.6;
  if(typeof beep==='function'){ beep(ph===2?180:90,0.45,'sawtooth',0.07); beep(ph===2?520:760,0.25,'triangle',0.04); }
  if(sfx.enemyGlitch) sfx.enemyGlitch();
}
function set3SlashBeam(b,fan){
  if(sfx.enemyLaser) sfx.enemyLaser();
  const base=Math.atan2(player.y-b.y,player.x-b.x);
  const n=fan||1;
  for(let i=0;i<n;i++){
    const ang=base+(i-(n-1)/2)*0.34;
    kijoLaserWarns.push({x:b.x,y:b.y,ang,width:20,range:820,t:0,warn:0.70,color:b.color||'#38e8ff',fired:false,sniper:true,dmg:18,srcName:'세트3 검기'});
  }
}
function set3SafeZoneUltimate(b){
  if(sfx.enemyCore) sfx.enemyCore();
  const w=190,h=150,x=clamp(player.x+rand(-130,130),24,W-w-24),y=clamp(player.y+rand(-100,80),90,H-h-24);
  gZones=[{x,y,w,h,real:true,t:0,warn:2.4,kill:2.2,black:true}];
  GL.blackout=Math.max(GL.blackout||0,0.55);
  banner('케케로로 전체기','SAFE 안으로!',1200);
}
function updateSet3(b,dt){
  if(b.setPhase==null){ b.setPhase=1; b.patI=0; b.attackT=1.4; b.tx=b.x; b.ty=b.y; b.safeUlt=false; clearSeungwooFx(); }
  b.phaseT+=dt; b.angle+=dt*(1.2+0.16*(b.setPhase||1)); if(b.hitT>0)b.hitT-=dt;
  for(const k of ['mirror','keyRev','frameDrop','rotActive','shield']) if(GL[k]>0)GL[k]-=dt;
  if(GL.blackout>0) GL.blackout-=dt;
  if(GL.rotActive<=0){gView.rotT=0;gView.fxT=1;gView.fyT=1;}
  gView.rot+=(gView.rotT-gView.rot)*Math.min(1,dt*6); gView.fx+=(gView.fxT-gView.fx)*Math.min(1,dt*6); gView.fy+=(gView.fyT-gView.fy)*Math.min(1,dt*6);
  if(gZones.length){ let allKill=true,real=null; for(const z of gZones){ z.t+=dt; if(z.real)real=z; if(z.t<z.warn)allKill=false; } if(allKill&&real){ const inR=player.x>real.x&&player.x<real.x+real.w&&player.y>real.y&&player.y<real.h+real.y; if(!inR) glDamage(44*dt); } if(gZones[0].t>gZones[0].warn+gZones[0].kill) gZones=[]; }
  const a=Math.atan2(player.y-b.y,player.x-b.x), d=Math.hypot(player.x-b.x,player.y-b.y), ph=b.setPhase||1;
  const want=ph===1?165:ph===2?250:300;
  if(d>want+35){ b.x+=Math.cos(a)*b.spd*dt; b.y+=Math.sin(a)*b.spd*0.55*dt; }
  else if(d<want-35){ b.x-=Math.cos(a)*b.spd*0.7*dt; b.y-=Math.sin(a)*b.spd*0.4*dt; }
  b.x+=Math.cos(a+Math.PI/2)*b.spd*(ph===1?0.25:ph===2?0.38:0.46)*dt;
  b.y+=Math.sin(a+Math.PI/2)*b.spd*(ph===1?0.18:ph===2?0.28:0.34)*dt;
  b.x=clamp(b.x,b.r,W-b.r); b.y=clamp(b.y,b.r,H*0.58);
  if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2) hurtPlayer(ph===3?34:28,set3PhaseName(b));
  if(ph===3&&!b.safeUlt&&b.hp<=b.maxhp*0.2){ b.safeUlt=true; set3SafeZoneUltimate(b); b.attackT=2.5; }
  // ── 3막 최종보스 신규 패턴 ──
  b.a3T=(b.a3T==null?5:b.a3T)-dt;
  if(b.a3T<=0){
    if(a3strike||a3seq||a3veil){ b.a3T=0.8; }
    else {
      b.a3N=(b.a3N||0)+1;
      if(ph===1){            // 현진: 물리 / 그랩
        const s=b.a3N%6;
        if(s===0) a3ConeSlam(b,5,18,'#ff4dd2');
        else if(s===1) a3CrossAoE(b,Math.max(W,H),60,1.0,18);
        else if(s===2) a3SpinBar(b,230,15,3.6);
        else if(s===3) a3PushRing(b,12);
        else if(s===4) a3VineSlam(b,'현진 그랩');
        else a3PullSlam(b,'현진 끌어치기',30);
        b.a3T=5.5;
      }else if(ph===2){      // 번검: 검기 / 분신
        const s=b.a3N%5;
        if(s===0) a3SweepBreath(b,Math.random()<0.5?-1:1,18);
        else if(s===1) a3SpinBar(b,260,16,4.0);
        else if(s===2) a3Brand(b,1.6,96,24,'번검 낙인');
        else if(s===3) a3Decoys(b);
        else a3StrikeShadows(b,3,'검영 은신');
        b.a3T=5.5;
      }else{                 // 케케로로: 신호 / 방송 장악
        const s=b.a3N%6;
        if(s===0) a3SafeZone(W/2+rand(-120,120),H*0.42+rand(-60,60),165,110,2.4,2.2,60,'신호 차단');
        else if(s===1){ if(sfx.enemyCore) sfx.enemyCore(); a3Objective(W/2,H*0.34,{hp:300,fuse:7.0,fail:'aoe',failDmg:44,label:'신호 코어',color:'#ff4dd2',r:30,owner:b}); banner('📡 신호 코어','부수지 못하면 전체 피해',1000); }
        else if(s===2) a3SweepBreath(b,Math.random()<0.5?-1:1,18);
        else if(s===3) a3Veil(5,'송출 차단');
        else if(s===4) a3Sequence(b,3,{randomTiles:true,showGap:1.0,goGap:1.45,showEndDelay:0.75,dmg:28});
        else a3StrikeStones(b,3,'신호탑 과부하');
        b.a3T=5.8;
      }
    }
  }
  b.attackT-=dt;
  if(b.attackT<=0){
    b.patI=(b.patI||0)+1;
    if(ph===1){
      const s2=b.patI%3;
      if(s2===0){ if(sfx.enemyDash) sfx.enemyDash(); intentShockwave(player.x,player.y,105,20,'현진 충격파'); }
      else if(s2===1){ const pa=Math.atan2(player.y-b.y,player.x-b.x); b.x=clamp(b.x+Math.cos(pa)*120,b.r,W-b.r); b.y=clamp(b.y+Math.sin(pa)*80,b.r,H*0.58); if(dist2(b.x,b.y,player.x,player.y)<120*120) hurtPlayer(22,'현진 대시'); }
      else { const pa=Math.atan2(player.y-b.y,player.x-b.x); b.x=clamp(b.x+Math.cos(pa)*140,b.r,W-b.r); b.y=clamp(b.y+Math.sin(pa)*95,b.r,H*0.58); burst(b.x,b.y,'#ff4dd2',18,240); screenShake=Math.max(screenShake||0,8); intentShockwave(b.x,b.y,120,18,'현진 들이받기'); }
      b.attackT=1.25;
    }else if(ph===2){
      if(b.patI%4===0){ b.x=clamp(player.x+rand(-150,150),b.r,W-b.r); b.y=clamp(player.y+rand(-90,90),90,H*0.45); burst(b.x,b.y,'#38e8ff',16,220); set3SlashBeam(b,1); }
      else set3SlashBeam(b,b.patI%2?3:2);
      b.attackT=1.45;
    }else{
      if(b.patI%5===0){ b.x=rand(110,W-110); b.y=rand(90,230); burst(b.x,b.y,'#ff4dd2',20,260); }
      else if(b.patI%3===0){ const k=18; for(let i=0;i<k;i++){ const aa=b.angle+i/k*TAU; eBullets.push({x:b.x,y:b.y,vx:Math.cos(aa)*205,vy:Math.sin(aa)*205,r:8,dmg:11,life:3.6,srcName:'케케로로 에너지구'}); } }
      else { const pa=Math.atan2(player.y-b.y,player.x-b.x); for(let i=-2;i<=2;i++) eBullets.push({x:b.x,y:b.y,vx:Math.cos(pa+i*0.22)*255,vy:Math.sin(pa+i*0.22)*255,r:8,dmg:12,life:3.4,srcName:'케케로로'}); }
      b.attackT=1.15;
    }
    sfx.shoot();
  }
  if(b.hp<=0) handleBossDefeat(b);
}

// ===== ACT3 보스 패턴 라이브러리 (온스터 · 세트3형제) =====
// 부패/독 장판 — 안에 있는 동안 지속 피해
function a3Poison(x,y,r,dmg,life,col){
  hazards.push({kind:'poison',x:clamp(x,28,W-28),y:clamp(y,86,H-46),r:r||46,t:0,life:life||7,dmg:dmg||9,tickCd:0,col:col||'#7be04a',seed:rand(0,TAU)});
}
// 플레이어 자리를 따라 부패 장판을 순차로 깖 (로아식 장판 유도)
function a3PoisonTrail(b,steps,gap,dmg,col){
  steps=steps||5; gap=gap||0.5;
  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      if(!b || (b!==boss && !enemies.includes(b))) return;
      a3Poison(player.x+rand(-14,14),player.y+rand(-14,14),46,dmg||10,8,col);
      beep(120,0.05,'sawtooth',0.03);
    }, i*gap*1000);
  }
  banner('🩸 부패 사슬자국','구석으로 빼라',900);
}
// 낙인 — 표식 자리에서 벗어나지 않으면 폭발
function a3Brand(b,warnT,r,dmg,label){
  hazards.push({x:clamp(player.x,34,W-34),y:clamp(player.y,90,H-50),t:0,warnT:warnT||1.6,liveT:0.5,r:r||92,hit:false,dmg:dmg||22,srcName:label||'낙인'});
  banner('🎯 '+(label||'낙인'),'표식 자리에서 벗어나라',900);
  beep(180,0.1,'square',0.04);
}
// 사슬 속박원 — 플레이어 주변 여러 원, 갇히면 이동 잠금
function a3BindRing(b,n,srcName){
  n=n||4;
  for(let i=0;i<n;i++){
    const a=i/n*TAU+rand(-0.2,0.2), rr=rand(70,140);
    spawnMoveLockField(player.x+Math.cos(a)*rr, player.y+Math.sin(a)*rr, srcName||(b&&b.label)||'사슬');
  }
  banner('⛓ 사슬 속박','원 밖으로 빠져나가라',900);
  beep(90,0.18,'sawtooth',0.05);
}
// 부채꼴 강타 — 정면 부채꼴 경고 후 검기 (kijoLaserWarns 재사용)
function a3ConeSlam(b,fan,dmg,col){
  fan=fan||5;
  const base=Math.atan2(player.y-b.y,player.x-b.x);
  for(let i=0;i<fan;i++){
    const ang=base+(i-(fan-1)/2)*0.18;
    kijoLaserWarns.push({x:b.x,y:b.y,ang,width:16,range:860,t:0,warn:0.62,color:col||b.color||'#ff4dd2',fired:false,sniper:true,dmg:dmg||18,srcName:(b.label||'강타')});
  }
  banner('⚔ 부채꼴 강타','정면을 비워라',800);
  beep(70,0.2,'sawtooth',0.05);
}
// 십자 장판 — 보스 중심 가로+세로 띠
function a3CrossAoE(b,len,wid,warnT,dmg){
  len=len||Math.max(W,H); wid=wid||58; warnT=warnT||1.0; dmg=dmg||16;
  const rot=rand(0,Math.PI/2);
  hazards.push({kind:'band',x:b.x,y:b.y,ang:rot,len,wid,t:0,warnT,liveT:0.6,dmg,hit:false,srcName:(b.label||'십자'),col:b.color});
  hazards.push({kind:'band',x:b.x,y:b.y,ang:rot+Math.PI/2,len,wid,t:0,warnT,liveT:0.6,dmg,hit:false,srcName:(b.label||'십자'),col:b.color});
  banner('✚ 십자 장판','대각선으로 피하라',850);
}
// 회전 막대 — 보스 중심으로 도는 긴 막대형 히트박스
function a3SpinBar(b,len,dmg,life){
  hazards.push({kind:'spinbar',owner:b,x:b.x,y:b.y,len:len||220,wid:22,ang:rand(0,TAU),rot:(Math.random()<0.5?1:-1)*2.0,t:0,warnT:0.7,liveT:life||4.0,dmg:dmg||14,hitCd:0,srcName:(b.label||'회전 검'),col:b.color});
  banner('🌀 회전 검','막대를 피해 돌아라',900);
}
// 좌→우 회전 광역 브레스 (beamSweep 재사용)
function a3SweepBreath(b,dir,dmg){
  const startAng=dir<0?0.15:Math.PI-0.15;
  hazards.push({kind:'beamSweep',x:b.x,y:b.y,ang:startAng,rot:(dir<0?1:-1)*0.55,range:760,width:26,warnT:0.85,liveT:2.6,t:0,dmg:dmg||16,srcName:(b.label||'브레스'),seed:rand(0,TAU),hitCd:0});
  banner('🌊 광역 참격','쓸려나가는 방향을 보라',900);
  beep(60,0.4,'sawtooth',0.06);
}
// 전멸기 — 화면 즉사, 안전원 안에 있어야 생존 (rEnd<r 이면 점점 좁아짐)
function a3SafeZone(x,y,r,rEnd,warnT,killT,dmg,label){
  hazards.push({kind:'safezone',x:clamp(x,90,W-90),y:clamp(y,110,H-90),r:r||150,rEnd:(rEnd==null?(r||150):rEnd),curR:r||150,t:0,warnT:warnT||2.4,killT:killT||2.2,dmg:dmg||60,srcName:label||'전멸기'});
  banner('☠ '+(label||'전멸기'),'원 안으로!',1100);
  beep(140,0.3,'square',0.05);
}
// 파괴 목표물 — 제한시간 내 못 부수면 효과 발동 (꽃봉오리/심장/코어/속박닻)
function a3Objective(x,y,opts){
  opts=opts||{};
  const hp=Math.max(40,Math.round((opts.hp||220)*(typeof diffSet!=='undefined'?diffSet.hp:1)));
  enemies.push({
    type:'boss_orb',sprite:null,name:opts.label||'목표물',label:opts.label||'목표물',
    x:clamp(x,40,W-40),y:clamp(y,110,H-90),r:opts.r||26,
    hp,maxhp:hp,spd:0,_spd0:0,dmg:0,touchDmg:0,bodyDmg:0,color:opts.color||'#ff4dd2',xp:0,
    ai:'bossorb',fuseT:opts.fuse||6,fuseMax:opts.fuse||6,fail:opts.fail||'aoe',
    failDmg:opts.failDmg||40,shootCd:opts.shootCd||0,_st:opts.shootCd||0,owner:opts.owner||null,
    hitT:0,coolT:0,summoned:true,noKillScore:true,noReward:true,wob:rand(0,TAU),
  });
}
// 꽃봉오리/보호석 여러 개
function a3SpawnBuds(b,n,fail,label,color){
  n=n||3;
  for(let i=0;i<n;i++){
    const a=i/n*TAU+rand(-0.3,0.3), rr=rand(150,250);
    a3Objective(W/2+Math.cos(a)*rr, H*0.42+Math.sin(a)*rr*0.6, {hp:170,fuse:6.5,fail:fail||'aoe',failDmg:34,label:label||'꽃봉오리',color:color||'#ff7ad2',r:24,owner:b});
  }
  banner('🌸 '+(label||'꽃봉오리')+' '+n+'개','터지기 전에 부숴라',1000);
  beep(300,0.12,'sine',0.04);
}
// 파괴 목표물 렌더 (drawEnemy에서 호출)
function drawBossOrb(e){
  const r=e.r, fuse=clamp((e.fuseT||0)/(e.fuseMax||1),0,1), col=e.color||'#ff4dd2';
  ctx.save();
  ctx.globalAlpha=0.92; pxBlob(0,0,r,r,Math.max(4,r*0.4),col,_shade(col,-0.4));
  ctx.globalAlpha=0.7; ctx.fillStyle=_shade(col,0.6); const hl=Math.max(4,r*0.4); ctx.fillRect(Math.round(-r*0.35),Math.round(-r*0.35),Math.ceil(hl),Math.ceil(hl));
  ctx.globalAlpha=0.95; ctx.strokeStyle='#ffd34d'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+fuse*TAU); ctx.stroke();
  if(fuse<0.35){ ctx.globalAlpha=0.4+0.4*Math.abs(Math.sin(performance.now()/70)); ctx.strokeStyle='#ff3b3b'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,r+13,0,TAU); ctx.stroke(); }
  ctx.globalAlpha=1; ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(-r,-r-16,r*2,5);
  ctx.fillStyle='#5dff9b'; ctx.fillRect(-r,-r-16,r*2*clamp(e.hp/e.maxhp,0,1),5);
  ctx.globalAlpha=0.95; ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
  ctx.fillText(e.label||'목표물',0,r+24); ctx.textAlign='left';
  ctx.restore();
}

// ===== 상태형 패턴 서브시스템 (장막 · 순서기억 · 전멸기 안전지대 · 분신) =====
let a3veil=null, a3seq=null, a3strike=null;
function clearA3Systems(){ a3veil=null; a3seq=null; a3strike=null; }

// 마녀의 장막 — 화면 암전, 플레이어 주변만 보임
function a3Veil(dur,label){
  a3veil={t:0,dur:dur||5,reveal:155,label:label||'장막'};
  banner('🌑 '+(label||'장막'),'시야가 좁아졌다',1000); beep(70,0.3,'sine',0.05);
}
// 순서 기억 — 타일이 순서대로 빛난 뒤, 같은 순서로만 안전
function makeRandomSequenceTiles(count){
  const cols=['#5dff9b','#38e8ff','#ff4dd2','#ffd34d'], tiles=[];
  for(let i=0;i<count;i++){
    let best=null, bestScore=-1;
    for(let tries=0;tries<40;tries++){
      const x=rand(130,W-130), y=rand(180,H-140);
      let minD=Infinity;
      for(const t of tiles) minD=Math.min(minD,Math.hypot(x-t.x,y-t.y));
      const playerD=Math.hypot(x-player.x,y-player.y);
      const score=Math.min(minD,260)+Math.min(playerD,240);
      if(minD>205&&playerD>115){ best={x,y}; break; }
      if(score>bestScore){ bestScore=score; best={x,y}; }
    }
    if(!best) break;
    tiles.push({x:best.x,y:best.y,r:74,col:cols[i%cols.length]});
  }
  if(tiles.length===count) return tiles;
  return null;
}
function a3Sequence(b,count,opts){
  opts=opts||{};
  count=Math.max(2,Math.min(count||3,4));
  const cols=['#5dff9b','#38e8ff','#ff4dd2','#ffd34d'];
  let tiles=opts.randomTiles?makeRandomSequenceTiles(count):null;
  if(!tiles){
    tiles=[];
    for(let i=0;i<count;i++){ const a=i/count*TAU; tiles.push({x:clamp(W/2+Math.cos(a)*210,90,W-90),y:clamp(H*0.45+Math.sin(a)*120,120,H-100),r:74,col:cols[i%cols.length]}); }
  }
  const order=tiles.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){ const j=irand(0,i), t=order[i]; order[i]=order[j]; order[j]=t; }
  a3seq={tiles,order,phase:'show',t:0,lit:0,idx:0,showGap:opts.showGap??0.85,goGap:opts.goGap??1.3,showEndDelay:opts.showEndDelay??0.6,dmg:opts.dmg??24};
  banner('순서 기억','빛나는 순서를 외워라',1300); beep(440,0.1,'sine',0.04);
}
// 전멸기 — 화면 즉사, 미리 깔린 그림자(안전지대) 안에 숨어야 생존
function a3StrikeShadows(b,n,label){
  n=n||3; const safes=[];
  for(let i=0;i<n;i++){ const a=i/n*TAU+rand(-0.3,0.3); safes.push({x:clamp(W/2+Math.cos(a)*230,90,W-90),y:clamp(H*0.45+Math.sin(a)*150,120,H-90),r:90}); }
  a3strike={t:0,warnT:2.6,killT:2.0,dmg:60,safes,stones:null,label:label||'전멸기'};
  banner('🌒 '+(label||'전멸기'),'그림자 안으로 숨어라',1300); beep(80,0.3,'sawtooth',0.06);
}
// 전멸기 차단 — 보호석을 부수면 그 자리에 안전지대 생성
function a3StrikeStones(b,n,label){
  n=n||3; const stones=[]; const shp=Math.max(60,Math.round(150*(typeof diffSet!=='undefined'?diffSet.hp:1)));
  for(let i=0;i<n;i++){ const a=i/n*TAU+rand(-0.2,0.2); stones.push({x:clamp(W/2+Math.cos(a)*220,90,W-90),y:clamp(H*0.45+Math.sin(a)*150,120,H-90),r:30,hp:shp,maxhp:shp,broken:false,hitCd:0}); }
  a3strike={t:0,warnT:3.6,killT:2.2,dmg:60,safes:[],stones,label:label||'심판'};
  banner('⚖ '+(label||'심판')+' 시전','보호석을 부숴 안전지대를 만들어라',1500); beep(60,0.4,'sawtooth',0.06);
}
// 분신 — 진짜(보스)만 선명, 가짜 3은 흐릿. 가짜를 치면 반격탄
function a3Decoys(b){
  const slots=[]; for(let i=0;i<4;i++){ const a=i/4*TAU+rand(0,0.6); slots.push({x:clamp(W/2+Math.cos(a)*230,90,W-90),y:clamp(H*0.4+Math.sin(a)*140,110,H*0.55)}); }
  const realIdx=irand(0,3); b.x=slots[realIdx].x; b.y=slots[realIdx].y; b.tx=b.x; b.ty=b.y;
  for(let i=0;i<4;i++){ if(i===realIdx) continue;
    enemies.push({type:'decoy',sprite:b.sprite,name:'분신',label:'분신',x:slots[i].x,y:slots[i].y,r:b.r||60,hp:999999,maxhp:999999,_lastHp:999999,spd:0,_spd0:0,dmg:0,touchDmg:0,bodyDmg:0,color:b.color,xp:0,ai:'decoy',life:6,wob:rand(0,TAU),_glitchClone:true,summoned:true,noKillScore:true,noReward:true,hitT:0,coolT:0});
  }
  banner('👥 분신 · 진짜만 선명하다','가짜를 치면 반격탄',1400); beep(120,0.2,'sawtooth',0.05);
}
// 밀어내기 + 링 탄막
function a3PushRing(b,dmg){
  const a=Math.atan2(player.y-b.y,player.x-b.x);
  player.x=clamp(player.x+Math.cos(a)*150,player.r,W-player.r);
  player.y=clamp(player.y+Math.sin(a)*150,player.r,H-player.r);
  burst(player.x,player.y,'#58d8ff',14,180);
  const k=18; for(let i=0;i<k;i++){ const a2=i/k*TAU; eBullets.push({x:b.x,y:b.y,vx:Math.cos(a2)*215,vy:Math.sin(a2)*215,r:8,dmg:dmg||11,life:3.4,srcName:(b.label||'충격')}); }
  banner('💨 밀어내기','튕겨나가며 탄막',850); beep(140,0.12,'sine',0.04);
}
// 속박(덩굴/사슬) → 이속감소 → 1.5초 뒤 내려찍기
function a3VineSlam(b,label){
  player.slowDebuffT=Math.max(player.slowDebuffT||0,2.2);
  burst(player.x,player.y,'#5fa84a',14,160);
  banner('🌿 '+(label||'덩굴')+' 속박','내려찍기 온다 — 미리 움직여라',1100); beep(110,0.15,'sawtooth',0.05);
  const tx=player.x, ty=player.y;
  setTimeout(()=>{ if(!b||(b!==boss&&!enemies.includes(b))) return; hazards.push({x:clamp(tx,34,W-34),y:clamp(ty,90,H-50),t:0,warnT:0.55,liveT:0.45,r:112,hit:false,dmg:28,srcName:(label||'내려찍기')}); }, 1500);
}
// 끌어당김(그랩/사슬) → 보스 자리로 당긴 뒤 그 자리에 큰 내려찍기. 회피 중이면 끊긴다.
function a3PullSlam(b,label,dmg){
  if((player.dodging||0)<=0){
    const a=Math.atan2(b.y-player.y,b.x-player.x);
    player.x=clamp(player.x+Math.cos(a)*170,player.r,W-player.r);
    player.y=clamp(player.y+Math.sin(a)*170,player.r,H-player.r);
    burst(player.x,player.y,b.color||'#ff4dd2',16,210);
  }
  banner('🪝 '+(label||'끌어당김'),'끌려간다 — 회피로 끊어라',1100);
  beep(90,0.2,'sawtooth',0.06); screenShake=Math.max(screenShake||0,7);
  setTimeout(()=>{
    if(!b||(b!==boss&&!enemies.includes(b))) return;
    hazards.push({x:clamp(b.x,34,W-34),y:clamp(b.y,90,H-50),t:0,warnT:0.6,liveT:0.5,r:150,hit:false,dmg:dmg||30,srcName:(label||'내려찍기')});
    screenShake=Math.max(screenShake||0,11); beep(60,0.3,'sawtooth',0.07);
  },900);
}

function updateA3Systems(dt){
  if(state!=='play'){ a3veil=null; a3seq=null; a3strike=null; return; }
  if(a3veil){ a3veil.t+=dt; if(a3veil.t>=a3veil.dur) a3veil=null; }
  if(a3seq){
    a3seq.t+=dt;
    if(a3seq.phase==='show'){
      a3seq.lit=Math.min(Math.floor(a3seq.t/a3seq.showGap), a3seq.order.length);
      if((a3seq._lastLit||0)<a3seq.lit){ for(let si=(a3seq._lastLit||0)+1; si<=a3seq.lit; si++) if(sfx.enemySequence) sfx.enemySequence(si); a3seq._lastLit=a3seq.lit; }
      if(a3seq.t>=a3seq.order.length*a3seq.showGap+(a3seq.showEndDelay||0.6)){ a3seq.phase='go'; a3seq.t=0; a3seq.idx=0; if(sfx.enemyWarn) sfx.enemyWarn(); banner('▶ 이동!','안전한 순서대로',900); }
    } else {
      const beat=Math.floor(a3seq.t/a3seq.goGap);
      if(beat>=a3seq.order.length){ a3seq=null; }
      else {
        a3seq.idx=beat;
        const safeTile=a3seq.tiles[a3seq.order[beat]], localT=a3seq.t-beat*a3seq.goGap;
        if(safeTile && localT>a3seq.goGap*0.68 && localT<a3seq.goGap*0.68+0.12){
          if(dist2(player.x,player.y,safeTile.x,safeTile.y)>safeTile.r*safeTile.r) hurtPlayer(a3seq.dmg,'순서 기억');
        }
      }
    }
  }
  if(a3strike){
    a3strike.t+=dt;
    if(a3strike.stones){
      for(const st of a3strike.stones){ if(st.broken) continue;
        st.hitCd=(st.hitCd||0)-dt;
        if(st.hitCd<=0){ for(const pb of pBullets){ if(pb&&Number.isFinite(pb.x)&&dist2(pb.x,pb.y,st.x,st.y)<(st.r+(pb.r||4))**2){ st.hp-=Math.max(8,pb.dmg||12); st.hitCd=0.04; break; } } }
        if(st.hp<=0){ st.broken=true; a3strike.safes.push({x:st.x,y:st.y,r:st.r+80}); burst(st.x,st.y,'#9bffd0',22,240); banner('🛡 보호막 생성','이 안에 있어라',900); beep(420,0.15,'sine',0.05); }
      }
    }
    if(a3strike.t>=a3strike.warnT && a3strike.t<a3strike.warnT+a3strike.killT){
      let safe=false; for(const s of a3strike.safes){ if(dist2(player.x,player.y,s.x,s.y)<s.r*s.r){ safe=true; break; } }
      if(!safe) glDamage(a3strike.dmg*dt);
    }
    if(a3strike.t>=a3strike.warnT+a3strike.killT) a3strike=null;
  }
}
// 월드 좌표(변환 안)에서 렌더 — 타일/보호석/안전지대
function drawA3World(){
  if(a3seq){
    for(let i=0;i<a3seq.tiles.length;i++){ const tl=a3seq.tiles[i];
      let glow=0.12, col=tl.col, ring=tl.col;
      if(a3seq.phase==='show'){
        const pos=a3seq.order.indexOf(i);
        if(pos>=0 && pos<a3seq.lit) glow=0.4+0.25*Math.abs(Math.sin(performance.now()/120));
      } else {
        const activeTileIdx=a3seq.order[Math.min(a3seq.idx,a3seq.order.length-1)];
        if(i===activeTileIdx){ glow=0.45; col='#5dff9b'; ring='#9bffd0'; } else { glow=0.18; col='#ff3b6b'; ring='#ff7a9a'; }
      }
      ctx.save();
      ctx.globalAlpha=glow; pxBlob(tl.x,tl.y,tl.r,tl.r*0.62,Math.max(5,tl.r*0.26),col,_shade(col,-0.4));
      ctx.globalAlpha=0.8; ctx.strokeStyle=ring; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(tl.x,tl.y,tl.r,tl.r*0.62,0,0,TAU); ctx.stroke();
      const pos=a3seq.order.indexOf(i); const activeTileIdx=a3seq.order[Math.min(a3seq.idx,a3seq.order.length-1)]; const label=a3seq.phase==='show'?(pos>=0&&pos<a3seq.lit?String(pos+1):'?'):(i===activeTileIdx?String(a3seq.idx+1):String(pos+1)); ctx.globalAlpha=0.95; ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center'; ctx.fillText(label, tl.x, tl.y+8); ctx.textAlign='left';
      ctx.restore();
    }
  }
  if(a3strike){
    if(a3strike.stones){ for(const st of a3strike.stones){ if(st.broken) continue;
      ctx.save(); ctx.globalAlpha=0.95; pxBlob(st.x,st.y,st.r,st.r,Math.max(4,st.r*0.42),'#8d72ff',_shade('#8d72ff',-0.45));
      ctx.globalAlpha=0.6; ctx.fillStyle='#cbb8ff'; const shl=Math.max(3,st.r*0.3); ctx.fillRect(Math.round(st.x-st.r*0.3-shl/2),Math.round(st.y-st.r*0.3-shl/2),Math.ceil(shl),Math.ceil(shl));
      ctx.globalAlpha=1; ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(st.x-st.r,st.y-st.r-10,st.r*2,4); ctx.fillStyle='#5dff9b'; ctx.fillRect(st.x-st.r,st.y-st.r-10,st.r*2*clamp(st.hp/Math.max(1,st.maxhp),0,1),4);
      ctx.restore();
    } }
    for(const s of a3strike.safes){ ctx.save(); ctx.globalAlpha=0.22; pxBlob(s.x,s.y,s.r,s.r,Math.max(6,s.r*0.18),'#5dff9b',_shade('#5dff9b',-0.35)); ctx.globalAlpha=0.85; ctx.strokeStyle='#9bffd0'; ctx.lineWidth=3; ctx.setLineDash([10,6]); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
  }
}
// 화면 좌표(변환 밖)에서 렌더 — 장막/전멸기 틴트
function drawA3Screen(){
  if(a3veil){
    const k=clamp(a3veil.t/0.5,0,1)*clamp((a3veil.dur-a3veil.t)/0.6,0,1), rev=a3veil.reveal;
    ctx.save();
    const g=ctx.createRadialGradient(player.x,player.y,rev*0.5,player.x,player.y,rev);
    g.addColorStop(0,'rgba(4,2,10,0)'); g.addColorStop(1,'rgba(4,2,10,'+(0.93*k)+')');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=0.85*k; ctx.strokeStyle='#7a4a92'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(player.x,player.y,rev,0,TAU); ctx.stroke();
    ctx.restore();
  }
  if(a3strike && a3strike.t>=a3strike.warnT*0.5){
    const warnK=a3strike.t<a3strike.warnT?clamp((a3strike.t-a3strike.warnT*0.5)/(a3strike.warnT*0.5),0,1):1;
    const active=a3strike.t>=a3strike.warnT && a3strike.t<a3strike.warnT+a3strike.killT;
    ctx.save(); ctx.globalAlpha=(active?0.32:0.15)*warnK; ctx.fillStyle='#ff0a30'; ctx.fillRect(0,0,W,H); ctx.restore();
  }
}

// ===== 두 번째 패턴 (기존 인텐트와 별도 쿨다운으로 변주) =====
function updateBonusPatterns(e,dt){
  if(!e||e.dummy||e.intent) return;
  if(e.boss||e.midboss||e.summoned||e.clone) return;
  if(e.submerged||(e.stealthT||0)>0||(e.intentInvuln||0)>0||(e.stunT||0)>0) return;
  const cd=(name,base)=>{ if(VICIOUS.on) base*=VICIOUS.cool; e[name]=(e[name]==null?rand(base*0.7,base*1.2):e[name])-dt; return e[name]<=0; };
  const t=e.type;
  // ── 1막 ──
  if(t==='goblin_archer' && cd('_volleyCd',7)){           // 대파: 다발 사격
    setIntent(e,'🎯','다발 사격',0.8,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); for(let i=-1;i<=1;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(a+i*0.2)*300,vy:Math.sin(a+i*0.2)*300,r:7,dmg:intentDamage(e,9),life:4,srcName:e.name,style:'orb',col:e.color}); if(typeof beep==='function')beep(330,0.06,'square',0.03); e._volleyCd=7.4; });
  }
  else if(t==='goblin_shaman' && cd('_curseCd',8)){        // 까치: 저주 장판
    const tx=player.x, ty=player.y;
    setIntent(e,'🔮','저주',1.0,()=>{ if(typeof spawnFirePillar==='function') spawnFirePillar(tx,ty,'까치 저주'); else hazards.push({x:clamp(tx,34,W-34),y:clamp(ty,90,H-50),t:0,warnT:0.7,liveT:0.5,r:46,hit:false,dmg:intentDamage(e,11),srcName:'까치 저주'}); e._curseCd=8.4; });
  }
  // ── 2막 ──
  else if(t==='gwangcheon_gim' && cd('_powderCd',8.5)){    // 광천김: 김 가루 살포
    setIntent(e,'🌿','김 가루',0.8,()=>{ if(typeof spawnSlowField==='function') spawnSlowField(e.x,e.y,90,4); const k=6; for(let i=0;i<k;i++){ const a=i/k*TAU+(e.wob||0); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,r:7,dmg:intentDamage(e,14),life:3.4,srcName:e.name,style:'spore',col:e.color}); } burst(e.x,e.y,'#3f7a34',12,150); e._powderCd=8.8; });
  }
  else if(t==='reura' && cd('_spinCd',7)){                 // 러라: 회전 베기
    setIntent(e,'🌀','회전 베기',0.7,()=>{ const k=8; for(let i=0;i<k;i++){ const a=i/k*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*235,vy:Math.sin(a)*235,r:7,dmg:intentDamage(e,16),life:3,srcName:e.name,style:'shard',col:e.color}); } burst(e.x,e.y,'#ffd166',12,170); if(typeof beep==='function')beep(180,0.1,'sawtooth',0.04); e._spinCd=7.3; });
  }
  // ── 3막 ──
  else if(t==='act3_magnet' && cd('_magBurstCd',7.5)){     // 자석러: 자기 폭발 (밀어내며 링)
    setIntent(e,'💥','자기 폭발',1.1,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); player.x=clamp(player.x+Math.cos(a)*90,player.r,W-player.r); player.y=clamp(player.y+Math.sin(a)*90,player.r,H-player.r); const k=12; for(let i=0;i<k;i++){ const aa=i/k*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*220,vy:Math.sin(aa)*220,r:7,dmg:intentDamage(e,20),life:3.2,srcName:e.name,style:'shard',col:e.color}); } burst(e.x,e.y,'#ff4d5a',16,200); screenShake=Math.max(screenShake||0,6); e._magBurstCd=7.8; });
  }
  else if(t==='act3_domin' && cd('_knifeCd',7)){           // 도민: 단검 3연 투척
    setIntent(e,'🔪','단검 투척',0.7,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)){ for(let j=-1;j<=1;j++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(a+j*0.16)*320,vy:Math.sin(a+j*0.16)*320,r:6,dmg:intentDamage(e,20),life:3.4,srcName:e.name,style:'bolt',col:e.color}); } }, i*130); if(typeof beep==='function')beep(420,0.05,'square',0.03); e._knifeCd=7.4; });
  }
  else if(t==='act3_buffering' && cd('_lagBurstCd',8)){    // 버퍼링: 렉 폭발 (둔화장 + 글리치 링)
    setIntent(e,'▒','렉 폭발',0.9,()=>{ if(typeof spawnSlowField==='function') spawnSlowField(player.x,player.y,80,4); const k=10; for(let i=0;i<k;i++){ const aa=i/k*TAU+(e.wob||0); eBullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*170,vy:Math.sin(aa)*170,r:8,dmg:intentDamage(e,18),life:3.8,srcName:e.name,style:'glitch'}); } burst(e.x,e.y,'#38e8ff',12,160); e._lagBurstCd=8.4; });
  }
}

function updateIntentPatterns(e,dt){
  if(!e||e.dummy) return;
  if(e.atkBuffT>0) e.atkBuffT-=dt;
  if(e.defenseT>0) e.defenseT-=dt;
  if(e.intentInvuln>0) e.intentInvuln-=dt;
  if(e.slamT>0) e.slamT-=dt;
  if(tickIntent(e,dt)) return;
  const cd=(name,base)=>{ if(VICIOUS.on) base*=VICIOUS.cool; e[name]=(e[name]==null?rand(base*0.55,base*1.1):e[name])-dt; return e[name]<=0; };
  if(e.type==='goblin_warrior'&&cd('_slamCd',8)){
    setIntent(e,'⚔','강타',1,()=>{ e.slamT=2.2; e.intentDmgMul=2; e._slamCd=8; burst(e.x,e.y,'#ff6b6b',10,180); });
  }else if(e.type==='goblin_archer'&&cd('_lockCd',5.8)){
    setIntent(e,'👁','LOCK ON',1,()=>{ aimBulletFrom(e,390,12,7,'대파 조준탄'); e._lockCd=6.2; });
  }else if(e.type==='goblin_shaman'&&cd('_buffCd',7)){
    setIntent(e,'🔮','버프',0.8,()=>{ enemies.forEach(o=>{ if(o!==e&&dist2(o.x,o.y,e.x,e.y)<170*170){ o.atkBuffT=5; burst(o.x,o.y,'#c98bff',5,100); } }); e._buffCd=7.5; });
  }else if(e.type==='goblin_bomber'&&e.hp<=e.maxhp*0.2&&!e._bombArmed){
    e._bombArmed=true;
    setIntent(e,'💣','자폭',2,()=>{ if(!enemies.includes(e)) return; intentShockwave(e.x,e.y,95,18,'블페러 자폭'); e.hp=0; killEnemy(e); });
  }else if(e.type==='earthworm'&&cd('_burrowCd',10)){
    setIntent(e,'💀','잠복',0.8,()=>{ e.intentInvuln=2; e.stunT=2; setTimeout(()=>{ if(enemies.includes(e)){ e.x=clamp(player.x+rand(-80,80),30,W-30); e.y=clamp(player.y+rand(-80,80),60,H-40); burst(e.x,e.y,'#e87a8a',12,170); } },1800); e._burrowCd=10; });
  }else if(e.type==='rhino_beetle'&&cd('_intentChargeCd',7.5)){
    setIntent(e,'⚔','돌진',1,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); e.cs='dash'; e.csT=0.72; e.aimX=Math.cos(a); e.aimY=Math.sin(a); e._intentChargeCd=8; });
  }else if(e.type==='kkotchung'){
    if(e.clone) e._cloneMade=true;
    if(e.hp<=e.maxhp*0.5&&!e._cloneMade){ e._cloneMade=true; setIntent(e,'💀','분신',1.2,()=>{ for(let i=0;i<2;i++){ spawnEnemy('kkotchung',clamp(e.x+rand(-70,70),40,W-40),clamp(e.y+rand(-40,80),80,H-60),0.45); const c=enemies[enemies.length-1]; c.label='분신'; c.clone=true; c.summoned=true; c.noKillScore=true; c.hp=70; c.maxhp=70; c.xp=0; } }); }
    else if(cd('_kkBuffCd',8.5)) setIntent(e,'🔮','광역 버프',1.2,()=>{ enemies.forEach(o=>{ if(o!==e&&dist2(o.x,o.y,e.x,e.y)<210*210){ o.atkBuffT=5; o.coolT*=0.7; } }); e._kkBuffCd=9; });
    else if(cd('_kkLockCd',6.5)) setIntent(e,'👁','고정',1,()=>{ for(let j=0;j<3;j++) setTimeout(()=>{ if(enemies.includes(e)) aimBulletFrom(e,310,16,8,'양갱 고정탄'); },j*120); e._kkLockCd=7; });
  }else if(e.type==='gwangcheon_gim'&&cd('_pierceCd',6)){
    setIntent(e,'👁','조준',1,()=>{ aimBulletFrom(e,430,16,8,'광천김 관통탄'); e._pierceCd=6.5; });
  }else if(e.type==='reura'&&cd('_dashIntentCd',5.6)){
    setIntent(e,'?','??',0.45,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); e._diving=true; e._diveAx=Math.cos(a); e._diveAy=Math.sin(a); e._diveLife=0.39; e._dashIntentCd=5.9; });
  }else if(e.type==='namu'&&cd('_guardCd',7)){
    setIntent(e,'🛡','방어 태세',0.8,()=>{ e.defenseT=3; e._guardCd=7.5; burst(e.x,e.y,'#5fa84a',12,150); });
  }else if(e.type==='pobear'&&cd('_jumpCd',7)){
    setIntent(e,'⚔','점프 강타',1,()=>{ const tx=clamp(player.x+rand(-35,35),e.r,W-e.r), ty=clamp(player.y+rand(-35,35),e.r,H-e.r); e._jumpTx=tx; e._jumpTy=ty; e._jumpMax=Math.max(0.28,Math.min(0.72,Math.hypot(tx-e.x,ty-e.y)/520)); e.cs='jump'; e.csT=e._jumpMax; e._jumpCd=7.5; if(typeof beep==='function')beep(150,0.14,'sawtooth',0.06); });
  }else if(e.type==='ketter' && cd('_silkCd',8.5)){
    // 케터 — 실뿜기 / 둔화: 무빙을 살짝 꼬는 일반몹 패턴
    setIntent(e,'🕸','실뿜기',0.8,()=>{
      const tx=player.x, ty=player.y;
      if(countEnemyHazards('slowfield','ketter')<1) spawnWarnedSlowField(tx,ty,68,2.8,0.75,'ketter');
      const a=Math.atan2(player.y-e.y,player.x-e.x);
      for(let i=-1;i<=1;i++){
        const aa=a+i*0.18;
        eBullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*250,vy:Math.sin(aa)*250,r:7,dmg:intentDamage(e,14),life:3.6,srcName:'케터 실탄',stun:true,stunDur:0.85});
      }
      if(typeof beep==='function')beep(200,0.1,'triangle',0.04);
      e._silkCd=8.5;
    });
  }else if(e.type==='blackstar' && cd('_gravityCd',7)){
    // 흑별 — 중력장 / 검은별 탄막: 공간 압박형 어려운 적
    setIntent(e,'🌀','중력장',1.0,()=>{
      if(countEnemyHazards('gravitywell','blackstar')<1) spawnGravityWell(player.x,player.y,rand(130,150),rand(2.4,3.0),220,0,'blackstar');
      const k=10;
      for(let i=0;i<k;i++){
        const a=i/k*TAU+(e.wob||0);
        eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*205,vy:Math.sin(a)*205,r:7,dmg:intentDamage(e,16),life:3.4,srcName:'흑별 파편'});
      }
      burst(e.x,e.y,'#7b2cff',16,190);
      if(typeof beep==='function')beep(120,0.16,'sawtooth',0.05);
      e._gravityCd=7.4;
    });
  }else if(e.type==='killjoy' && cd('_zapCd',4.8)){
    // 킬조이 — 전기 레이저: 경고 후 발사하는 고기동 원거리 적
    setIntent(e,'⚡','전기 레이저',0.75,()=>{
      const a=Math.atan2(player.y-e.y,player.x-e.x);
      kijoLaserWarns.push({
        x:e.x,y:e.y,ang:a,width:17,range:580,t:0,warn:0.70,
        color:'#38e8ff',fired:false,sniper:true,
        dmg:intentDamage(e,18),srcName:'킬조이 전격'
      });
      burst(e.x,e.y,'#38e8ff',10,180);
      if(typeof beep==='function')beep(520,0.08,'square',0.04);
      e._zapCd=4.8;
    });
  }else if(e.type==='apple' && cd('_fallCd',4.5)){
    // 사과 — 낙과 폭탄: 시전 시작 위치에 충격파를 떨어뜨리는 장판형 적
    const tx=player.x, ty=player.y;
    setIntent(e,'🍎','낙과',0.95,()=>{
      warnAoE(tx,ty,rand(80,90),0.82,0.42,Math.max(10,Math.round((e.dmg||20)*0.75)),e.name||e.label,e.color); const extra=e.hp<=e.maxhp*0.5?3:2; for(let q=0;q<extra;q++) warnAoE(clamp(tx+rand(-110,110),60,W-60),clamp(ty+rand(-90,90),100,H-70),rand(75,88),0.85,0.42,Math.max(9,Math.round((e.dmg||20)*0.65)),e.name||e.label,e.color);
      burst(tx,ty,'#ff4d6d',18,220);
      screenShake=Math.max(screenShake||0,5);
      if(typeof beep==='function')beep(90,0.18,'sawtooth',0.06);
      e._fallCd=4.5;
    });
  }else if(e.type==='slime_red'&&cd('_redDashCd',5.5)){
    setIntent(e,'⚔','돌진',0.8,()=>{ const a=Math.atan2(player.y-e.y,player.x-e.x); e.lungeA=0.34; e.lvx=Math.cos(a); e.lvy=Math.sin(a); e._redDashCd=6; });
  }else if(e.type==='slime_yellow'&&cd('_yellowGuardCd',6)){
    setIntent(e,'🛡','방어',0.8,()=>{ e.defenseT=2.6; e._yellowGuardCd=6.5; });
  }else if(e.type==='elf_melee'&&cd('_tripleCd',6)){
    setIntent(e,'⚔','3연속 베기',0.8,()=>{ for(let j=0;j<3;j++) setTimeout(()=>{ if(enemies.includes(e)&&dist2(e.x,e.y,player.x,player.y)<95*95) hurtPlayer(intentDamage(e,9),'엘프 검사'); burst(e.x,e.y,'#bfe3a0',8,150); },j*180); e._tripleCd=6.5; });
  }else if(e.type==='elf_ranged'&&cd('_aimCd',5.5)){
    setIntent(e,'👁','조준 사격',0.8,()=>{ aimBulletFrom(e,410,12,7,'엘프 궁수 조준'); e._aimCd=6; });
  }else if(e.type==='giant_golem'&&cd('_golemQuakeCd',7)){
    setIntent(e,'\u2694','\uAC15\uC9C4',1.2,()=>{ intentShockwave(e.x,e.y,135,18,'\uAC70\uB300 \uACE8\uB818 \uAC15\uC9C4'); e._golemQuakeCd=7.5; });
  }else if(e.type==='eldritch'&&cd('_eldritchHexCd',6.5)){
    setIntent(e,'\uD83D\uDD2E','\uC65C\uACE1',1.2,()=>{ for(let i=0;i<10;i++){ const a=i/10*TAU+(e.wob||0); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:7,dmg:9,life:3,srcName:'\uC5D8\uB4DC\uB9AC\uCE58 \uC65C\uACE1'}); } e._eldritchHexCd=7; });
  }
}
function drawIntentBubble(x,y,r,o){
  if(!o||!o.intent) return;
  const it=o.intent, w=Math.max(34,14+(it.label||'').length*8), h=25, bx=x-w/2, by=y-r-48;
  ctx.save();
  ctx.globalAlpha=0.96;
  ctx.fillStyle='rgba(10,8,20,0.94)'; ctx.fillRect(bx,by,w,h);
  ctx.strokeStyle='#ffd34d'; ctx.lineWidth=2; ctx.strokeRect(bx,by,w,h);
  ctx.fillStyle='#fff'; ctx.font='bold 12px Courier New'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText((it.icon||'!')+' '+(it.label||''),x,by+12);
  ctx.fillStyle='#8be8ff'; ctx.fillRect(bx+2,by+h-4,(w-4)*clamp(it.t/it.max,0,1),2);
  ctx.restore();
}

function potionAttackPower(mult){
  return Math.max(1,totalAttackPower(player)*(mult||1));
}
function potionTargets(){
  const arr=enemies.slice();
  if(boss) arr.push(boss);
  return arr.filter(t=>t&&t.hp>0);
}
function damagePotionTarget(t,dmg,color){
  if(!t) return;
  if(t.boss) damageBoss(t,dmg,false,false);
  else applyEnemyDirectDamage(t,dmg,color||'#7ad7ff');
}
function useLightningPotion(){
  const dmg=potionAttackPower(0.85);
  for(let i=0;i<10;i++){
    setTimeout(()=>{
      const targets=potionTargets();
      if(!targets.length) return;
      const t=pick(targets);
      burst(t.x,t.y,'#7ad7ff',10,190);
      damagePotionTarget(t,dmg,'#7ad7ff');
      if(typeof beep==='function') beep(620,0.05,'sine',0.04);
    }, i*55);
  }
}
function useBombPotion(){
  const dmg=potionAttackPower(2.25);
  const r2=170*170;
  burst(player.x,player.y,'#ff9b4d',34,360);
  screenShake=Math.max(screenShake||0,12);
  enemies.slice().forEach(e=>{ if(dist2(player.x,player.y,e.x,e.y)<r2) applyEnemyDirectDamage(e,dmg,'#ff9b4d'); });
  if(boss&&dist2(player.x,player.y,boss.x,boss.y)<r2) damageBoss(boss,dmg,false,false);
}

function recalcPotionBuffs(p){
  p=p||player;
  let atkFlat=0, atkMul=0, fireAdd=0, armor=0;
  (p.potionBuffs||[]).forEach(b=>{
    atkFlat+=b.atkFlat||0;
    atkMul+=b.atkMul||0;
    fireAdd+=b.fireAdd||0;
    armor+=b.armor||0;
  });
  p.potionAtkFlat=atkFlat;
  p.potionAtkMul=1+atkMul;
  p.potionFireAdd=fireAdd;
  p.potionArmor=armor;
}
function addPotionBuff(p,buff){
  p=p||player;
  if(!p.potionBuffs) p.potionBuffs=[];
  const next=Object.assign({},buff);
  if(p._usingPotion&&p.potionAmp){
    const mul=1+Number(p.potionAmp||0);
    ['atkFlat','atkMul','fireAdd','armor','regen'].forEach(k=>{ if(next[k]) next[k]*=mul; });
  }
  if(next.refreshOnly&&next.id) p.potionBuffs=p.potionBuffs.filter(b=>b.id!==next.id);
  delete next.refreshOnly;
  p.potionBuffs.push(next);
  recalcPotionBuffs(p);
}
function tickPotionBuffs(dt){
  if(!player||!player.potionBuffs||!player.potionBuffs.length) return;
  let changed=false;
  player.potionBuffs.forEach(b=>{
    const step=Math.min(dt,Math.max(0,b.t||0));
    if(b.regen){
      let regenStep=b.regen*step;
      if(player.regenOverload&&player.hp<=player.maxhp*0.5&&regenStep>0) regenStep*=1.5;
      regenStep*=statMulFromBonus(statBonusFromMul(player&&player.recoveryMul),0);
      healPlayerRaw(regenStep);
      updateHpHud();
    }
    b.t-=dt;
    if(b.t<=0) changed=true;
  });
  if(changed){
    player.potionBuffs=player.potionBuffs.filter(b=>b.t>0);
    recalcPotionBuffs(player);
  }
}
function visibleLeaderboardName(name,title){
  name=cleanLeaderboardName(name);
  title=String(title||'').trim();
  const titleDef=titleById(title)||titleByName(title);
  if(titleDef) title=titleDef.name;
  return title?'['+title+'] '+name:name;
}
function renderAchievements(){
  const ov=$('ovAchievements'); if(!ov) return;
  const done=ACHIEVEMENTS.filter(a=>isAchievementUnlocked(a.id)).length;
  const rate=Math.round(done/ACHIEVEMENTS.length*100);
  const rateEl=$('achRate'); if(rateEl) rateEl.textContent=done+' / '+ACHIEVEMENTS.length+' ('+rate+'%)';
  refreshTitleDisplay();
  renderStartBonusSummary();
  document.querySelectorAll('.ach-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===(ov.dataset.tab||'achievements')));
  const body=$('achBody'); if(!body) return;
  const tab=ov.dataset.tab||'achievements';
  body.innerHTML='';
  if(tab==='achievements'){
    ACHIEVEMENT_CATEGORY_ORDER.forEach(cat=>{
      const list=ACHIEVEMENTS.filter(a=>achievementCategory(a.id)===cat);
      if(!list.length) return;
      const head=document.createElement('div');
      const catDone=list.filter(a=>isAchievementUnlocked(a.id)).length;
      head.className='ach-section-title';
      head.innerHTML='<b>'+ACHIEVEMENT_CATEGORY_LABELS[cat]+'</b><span>'+catDone+' / '+list.length+'</span>';
      body.appendChild(head);
      list.forEach(a=>{
        const unlocked=isAchievementUnlocked(a.id);
        const row=document.createElement('div');
        row.className='ach-row ach-card '+(unlocked?'unlocked':'locked')+(a.spoiler&&!unlocked?' spoiler':'');
        const reward=formatAchievementReward(a.id,unlocked);
        const desc=formatAchievementDesc(a.id,unlocked);
        const hint=a.spoiler&&!unlocked?('<i>'+achievementSpoilerHint(a.id)+'</i>'):'';
        row.innerHTML='<div class="ach-medal">'+(unlocked?'🏆':'🔒')+'</div><div class="ach-card-main">'+
          '<div class="ach-card-top"><b>'+formatAchievementName(a.id,unlocked)+'</b><strong>'+(unlocked?'완료':'미완료')+'</strong></div>'+
          rewardBadgeHTML(a.id)+
          '<span>'+desc+'</span>'+hint+
          '<small>'+(reward?'보상: '+reward:'')+'</small></div>';
        body.appendChild(row);
      });
    });
  }else if(tab==='titles'){
    const titles=TITLE_LIST;
    titles.forEach(t=>{
      const owned=!!(userProgress.titles&&userProgress.titles[t.id]);
      const selected=userProgress.selectedTitle===t.id;
      const row=document.createElement('button');
      row.className='ach-row title-pick'+(owned?' unlocked':'')+(selected?' selected':'');
      row.disabled=!owned;
      row.innerHTML='<div class="ach-medal">'+(selected?'✓':owned?'🎖️':'🔒')+'</div><div><b>'+t.name+'</b><span>'+(owned?(selected?'장착 중':'클릭해서 장착'):'아직 해금되지 않음')+'</span></div>';
      row.onclick=()=>selectTitle(selected?'':t.id);
      body.appendChild(row);
    });
    const clear=document.createElement('button');
    clear.className='btn ghost ach-clear-title';
    clear.textContent='칭호 해제';
    clear.onclick=()=>selectTitle('');
    body.appendChild(clear);
  }else{
    const head=document.createElement('div');
    head.className='ach-section-title relics';
    head.innerHTML='<b>업적 보상 해금 유물</b><span>'+ACHIEVEMENT_RELIC_IDS.filter(id=>isRelicUnlockedByAchievement(id)).length+' / '+ACHIEVEMENT_RELIC_IDS.length+'</span>';
    body.appendChild(head);
    ACHIEVEMENT_RELIC_IDS.forEach(id=>{
      const r=RELICS.find(x=>x.id===id);
      if(!r) return;
      const owned=isRelicUnlockedByAchievement(id);
      const achId=achievementIdForRelic(id);
      const achUnlocked=achId?isAchievementUnlocked(achId):owned;
      const row=document.createElement('div');
      row.className='ach-row ach-card ach-relic-row relic-'+(TIER_OF[id]||'rare')+(owned?' unlocked':' locked');
      if(owned){ row.dataset.relicId=id; row.dataset.relicStatic='1'; }
      row.innerHTML='<div class="ach-medal">'+(owned?relicIconHTML(r,'relic-pix-lg'):'🔒')+'</div><div class="ach-card-main">'+
        '<div class="ach-card-top"><b>'+formatAchievementRelicName(id,owned)+'</b><strong>'+(owned?'해금 완료':'잠금')+'</strong></div>'+
        '<span>'+(owned?r.desc:'업적 보상으로 해금되는 유물입니다.')+'</span>'+
        '<small>'+(owned?'해금 완료 · 데이터베이스와 유물 풀에 등장 가능':'해금 업적: '+formatAchievementName(achId,achUnlocked)+' · '+achievementSpoilerHint(achId))+'</small></div>';
      body.appendChild(row);
    });
  }
}
function cleanLeaderboardName(name){
  const v=String(name||'').trim().replace(/\s+/g,' ').slice(0,NAME_MAX_LEN);
  return v || 'PLAYER';
}
function getLeaderboardName(){
  try{
    return cleanLeaderboardName(localStorage.getItem('btvLeaderboardName')||'');
  }catch(e){}
  return cleanLeaderboardName('');
}
function scoreNumber(v,fallback){
  const n=Number(v);
  return Number.isFinite(n)?n:(fallback||0);
}
function scoreInt(v,fallback,min){
  const n=Math.round(scoreNumber(v,fallback));
  return Math.max(min==null?0:min,n);
}
function scoreCleared(data){
  if(data&&data.cleared!=null) return !!data.cleared;
  if(data&&data.win!=null) return !!data.win;
  return false;
}
function calcScoreBreakdown(data){
  data=data||{};
  const floor=scoreInt(data.floor!=null?data.floor:data.reachedFloor,1,1);
  const scoreAct=scoreInt(data.act,1,1);
  const globalFloor=(scoreAct-1)*FLOORS_PER_ACT+floor;
  const scoreKills=scoreInt(data.kills!=null?data.kills:data.totalKills,0,0);
  const scoreLevel=scoreInt(data.level,1,1);
  const elapsedSec=Math.max(0,scoreNumber(data.elapsedSec!=null?data.elapsedSec:data.clearTime,0));
  const hits=scoreInt(data.hits!=null?data.hits:data.runHits,0,0);
  const scoreRetries=scoreInt(data.retries,0,0);
  const cleared=scoreCleared(data);
  const progressScore=globalFloor*1200;
  const killScore=scoreKills*120;
  const levelScore=(scoreLevel-1)*1500;
  const actClearBonus=(cleared&&scoreAct>=3)?12000:0;
  const clearBonus=cleared?30000+actClearBonus:0;
  const timeBonus=cleared?Math.max(0,Math.round((2000-elapsedSec)*10)):0;
  const hitPenalty=hits*HIT_SCORE_PENALTY;
  const retryPenalty=scoreRetries*RETRY_SCORE_PENALTY;
  const grossScore=progressScore+killScore+levelScore+clearBonus+timeBonus;
  const penaltyScore=hitPenalty+retryPenalty;
  const rawScore=Math.round(grossScore-penaltyScore);
  const score=clamp(Math.max(0,rawScore),0,SCORE_MAX);
  return {score,totalScore:score,reachedFloor:floor,act:scoreAct,globalFloor,progressScore,killScore,levelScore,earnedScore:progressScore+killScore+levelScore,clearBonus,timeBonus,hitPenalty,retryPenalty,penaltyScore,appliedPenalty:penaltyScore,rawScore,elapsedSec,kills:scoreKills,level:scoreLevel,hits,retries:scoreRetries,cleared};
}
function scoreBreakdownFromSummary(data){
  if(!data) return null;
  const build=data.build||{};
  const hasCore=(data.act!=null||data.floor!=null||data.reachedFloor!=null||data.stage!=null||build.act!=null||build.stage!=null);
  if(!hasCore) return null;
  return calcScoreBreakdown({
    act:data.act!=null?data.act:build.act,
    floor:data.floor!=null?data.floor:(data.reachedFloor!=null?data.reachedFloor:(data.stage!=null?data.stage:build.stage)),
    kills:data.kills!=null?data.kills:data.totalKills,
    level:data.level,
    elapsedSec:data.elapsedSec!=null?data.elapsedSec:data.clearTime,
    hits:data.hits!=null?data.hits:data.runHits,
    retries:data.retries,
    cleared:data.cleared,
    win:data.win
  });
}
function calcRunScore(win){
  const reachedFloor=Math.max(1,currentRow+1);
  const elapsedSec=runStartedAt>0?Math.max(0,(performance.now()-runStartedAt)/1000):0;
  return calcScoreBreakdown({act,floor:reachedFloor,kills:totalKills,level,elapsedSec,hits:runHits,retries,cleared:!!win});
}
const calculateScoreBreakdown=calcScoreBreakdown;
function fmtScore(n){ return Number(n||0).toLocaleString('ko-KR'); }
function fmtTime(sec){
  sec=Math.max(0,Math.round(Number(sec)||0));
  const m=Math.floor(sec/60), s=sec%60;
  return m+':'+String(s).padStart(2,'0');
}
function leaderboardCollectionFor(key){
  return LEADERBOARD_COLLECTIONS[key]||LEADERBOARD_COLLECTIONS.easy;
}
function isFirestorePermissionError(e){
  return !!(e && (e.code==='permission-denied' || /Missing or insufficient permissions/i.test(String(e.message||e))));
}
function setRankingDifficulty(key){
  rankingDifficulty=LEADERBOARD_COLLECTIONS[key]?key:'easy';
  document.querySelectorAll('.rank-tab').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.diff===rankingDifficulty);
  });
}
function setRankingSeason(s){
  s=Math.floor(Number(s));
  rankingSeason=(s>=1)?s:getCurrentSeason();
  const sel=$('rankingSeasonSel'); if(sel) sel.value=String(rankingSeason);
}
function populateSeasonSelector(){
  const sel=$('rankingSeasonSel'); if(!sel) return;
  const cur=getCurrentSeason();
  let html='';
  for(let s=cur;s>=1;s--){
    const label=(s===cur)?('시즌 '+s+' (진행중)'):('시즌 '+s);
    html+='<option value="'+s+'"'+(s===rankingSeason?' selected':'')+'>'+label+'</option>';
  }
  sel.innerHTML=html;
  sel.value=String(rankingSeason);
}
function rankingReachedText(data){
  return getRankSummaryText(data);
}
function getRankSummaryText(run){
  run=run||{};
  const runAct=Math.max(1,Math.round(Number(run.act)||1));
  const floor=Math.max(1,Math.round(Number(run.floor!=null?run.floor:run.reachedFloor)||1));
  const level=Math.max(1,Math.round(Number(run.level)||1));
  const elapsed=run.clearTime!=null?run.clearTime:run.elapsedSec;
  const timeText=fmtTime(elapsed);
  const cleared=!!(run.cleared||run.win);
  if(cleared) return (runAct>=3?'3막 클리어':'클리어')+' · Lv.'+level+' · '+timeText;
  return '진행 '+runAct+'막 '+floor+'층 · Lv.'+level+' · '+timeText;
}
function rankDetailButtonText(run){
  return (run&&(run.cleared||run.win))?'빌드 보기':'상세 보기';
}
function createRunId(api){
  return api.fs.doc(api.fs.collection(api.db,LEADERBOARD_SUMMARY_COLLECTION)).id;
}
function createClientRunId(){
  try{
    if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  }catch(e){}
  return 'run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
}
function getLeaderboardSubmitEndpoint(){
  const endpoint=String(window.LEADERBOARD_SUBMIT_ENDPOINT||'').trim();
  return /^https:\/\//i.test(endpoint)?endpoint:'';
}
async function submitRunScoreToTrustedEndpoint(summary,build){
  const endpoint=getLeaderboardSubmitEndpoint();
  if(!endpoint) throw new Error('Trusted leaderboard endpoint missing');
  const res=await fetch(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({summary,build})
  });
  if(!res.ok) throw new Error('Leaderboard endpoint rejected: '+res.status);
  return true;
}
function createRunBuildSnapshot(scoreData){
  const p=player||{};
  const pc=v=>Math.round(Number(v||0)*1000)/1000;
  return {
    relics:sanitizeStoredRelicIds((p.relics||[]).map(r=>r&&r.id)),
    potions:(p.potions||[]).map(pt=>pt&&pt.id).filter(Boolean),
    perks:sanitizeStoredLevelPerkIds(p.perkIds),
    passiveNodes:Array.from(treeUnlocked||[]).filter(Boolean),
    training:Object.assign({},TRAINING_DEFAULTS,ensureTrainingState(p)),
    stats:{
      maxHp:Math.round(Number(p.maxhp)||0),
      damage:pc(totalAttackPower(p)),
      attackSpeed:pc(playerFireRate(p)),
      critChance:pc(clamp(Number(p.critChance)||0,0,CRIT_CHANCE_CAP)),
      critDamage:pc(clamp(Number(p.critMult)||CRIT_BASE_MULT,1,CRIT_MULT_CAP)),
      moveSpeed:Math.round(playerMoveSpeed(p)),
      projectileCount:Number(p.shots)||1,
      armor:pc(effectiveArmor(p)),
      regen:pc(effectiveRegen(p)),
      bulletSpeed:Math.round(playerBulletSpeed(p))
    },
    gold:Math.round(Number(gold)||0),
    goldStats:getRunGoldStatsSnapshot(),
    act:Math.max(1,Number(act)||1),
    stage:scoreData&&scoreData.reachedFloor?Number(scoreData.reachedFloor):Math.max(1,currentRow+1),
    clearedAct:(scoreData&&scoreData.cleared)?Math.max(1,Number(act)||1):0,
    version:RUN_BUILD_VERSION
  };
}
function rankBuildText(v){
  return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function encodeRunBuildPayload(build){
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(build))));
  }catch(e){
    return '';
  }
}
function decodeRunBuildPayload(payload){
  try{
    return JSON.parse(decodeURIComponent(escape(atob(String(payload||'')))));
  }catch(e){
    return null;
  }
}
function titleWithEmbeddedBuild(title,build){
  const payload=encodeRunBuildPayload(build);
  return String(title||'')+(payload?(RUN_BUILD_TITLE_MARKER+payload):'');
}
function splitEmbeddedBuildTitle(title){
  title=String(title||'');
  const idx=title.indexOf(RUN_BUILD_TITLE_MARKER);
  if(idx<0) return {title,build:null};
  return {title:title.slice(0,idx),build:decodeRunBuildPayload(title.slice(idx+RUN_BUILD_TITLE_MARKER.length))};
}
function normalizeRankingRecord(data){
  const d=Object.assign({},data||{});
  const split=splitEmbeddedBuildTitle(d.title);
  d.title=split.title;
  if(!d.build && split.build) d.build=split.build;
  const breakdown=d.scoreBreakdown||scoreBreakdownFromSummary(d);
  if(breakdown){
    d.scoreBreakdown=breakdown;
    d.score=breakdown.score;
    if(d.floor==null) d.floor=breakdown.reachedFloor;
    if(d.act==null) d.act=breakdown.act;
    if(d.elapsedSec==null) d.elapsedSec=breakdown.elapsedSec;
    if(d.kills==null) d.kills=breakdown.kills;
    if(d.level==null) d.level=breakdown.level;
    if(d.hits==null) d.hits=breakdown.hits;
    if(d.retries==null) d.retries=breakdown.retries;
  }
  d.seasonId=recordSeason(d);
  return d;
}
function sortRankingRecords(records){
  return (records||[]).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
}
function nameById(list,id){
  const item=(list||[]).find(x=>x&&x.id===id);
  return item?item.name:String(id||'');
}
function perkByStoredId(id){
  return (LEVEL_PERKS||[]).find(pk=>!pk.removed && (perkId(pk)===id || pk.name===id));
}
function sanitizeStoredLevelPerkIds(ids,keepTreeOnly=false){
  return Array.isArray(ids)?ids.filter(id=>{
    if(!id) return false;
    if(keepTreeOnly && isTreeOnlyPerkId(id) && passiveNodeById(id)) return true;
    return !!perkByStoredId(id);
  }):[];
}
function passiveNodeById(id){
  return (TREE_NODES||[]).find(n=>n&&n.id===id);
}
function rankBuildPill(kind,id){
  let icon='', name=String(id||''), tip='';
  if(kind==='relic'){
    const r=relicById(id);
    if(r){
      icon=relicIconHTML(r,'relic-pix-sm');
      name=r.name;
      tip=(r.name||'')+' - '+(r.desc||'');
    }
  }else if(kind==='potion'){
    const pid=potionCanonicalId(id);
    const p=(POTIONS||[]).find(x=>x&&x.id===pid);
    if(p){
      icon=potionIconHTML(p,'potion-pix-sm');
      name=p.name;
      tip=(p.name||'')+' - '+(p.desc||'');
    }
  }else if(kind==='perk'){
    const pk=perkByStoredId(id);
    if(pk){
      icon=PERK_ICONS[pk.name]?'<img src="'+rankBuildText(PERK_ICONS[pk.name])+'" alt="">':rankBuildText(pk.icon||'');
      name=pk.name;
      tip=typeof perkTooltipText==='function'?perkTooltipText(pk):((pk.name||'')+' - '+(pk.desc||''));
    }
  }else if(kind==='passive'){
    const node=passiveNodeById(id);
    if(node){
      icon=rankBuildText(node.icon||'');
      name=node.name;
      tip=(node.name||'')+' - '+(node.desc||node.description||node.text||'');
    }
  }
  const safeTip=rankBuildText(tip||name).replace(/\n/g,'&#10;');
  const relicAttr=kind==='relic'?' data-relic-id="'+rankBuildText(id)+'" data-relic-static="1"':'';
  const titleAttr=kind==='relic'?'':' title="'+safeTip+'"';
  return '<span class="rank-build-pill"'+relicAttr+titleAttr+' aria-label="'+safeTip+'">'+icon+'<span>'+rankBuildText(name)+'</span></span>';
}
function renderRankBuildList(kind,ids){
  ids=Array.isArray(ids)?ids.filter(Boolean):[];
  if(kind==='relic') ids=sanitizeStoredRelicIds(ids);
  if(kind==='perk') ids=ids.filter(id=>!!perkByStoredId(id));
  if(!ids.length) return '<div class="rank-build-empty">없음</div>';
  return '<div class="rank-build-list">'+ids.map(id=>rankBuildPill(kind,id)).join('')+'</div>';
}
function renderRankBuildTraining(training){
  const rows=trainingBuildRows(training);
  if(!rows.length) return '<div class="rank-build-empty">없음</div>';
  return '<div class="rank-build-list">'+rows.map(({def,count})=>{
    const tip=def.name+' '+def.bonusText(count)+' - '+def.desc;
    return '<span class="rank-build-pill" title="'+rankBuildText(tip)+'" aria-label="'+rankBuildText(tip)+'">'+
      '<span>'+rankBuildText(def.icon)+'</span><span>'+rankBuildText(def.name+' '+def.bonusText(count))+'</span></span>';
  }).join('')+'</div>';
}
function goldStatValue(stats,key){
  return Math.max(0,Math.round(Number(stats&&stats[key])||0));
}
function shopPurchaseValue(stats,key){
  const sp=stats&&stats.shopPurchases;
  return Math.max(0,Math.floor(Number(sp&&sp[key])||0));
}
function renderRankBuildGoldStats(build){
  const stats=(build&&build.goldStats)||(build&&build.runStats&&build.runStats.gold)||null;
  if(!stats) return '<div class="rank-build-section"><h3>골드 통계</h3><div class="rank-build-empty">기록 없음</div></div>';
  const rows=[
    ['획득 골드',goldStatValue(stats,'earnedTotal')+'G'],
    ['사용 골드',goldStatValue(stats,'spentTotal')+'G'],
    ['남은 골드',Math.max(0,Math.round(Number(build&&build.gold)||0))+'G'],
    ['유물 구매',shopPurchaseValue(stats,'relics')+'회'],
    ['포션 구매',shopPurchaseValue(stats,'potions')+'회'],
    ['훈련 구매',shopPurchaseValue(stats,'training')+'회'],
    ['수상한 상자',shopPurchaseValue(stats,'mysteryBoxes')+'회'],
    ['체력/공격/민첩/집중/방어',[
      shopPurchaseValue(stats,'hpTraining'),
      shopPurchaseValue(stats,'atkTraining'),
      shopPurchaseValue(stats,'speedTraining'),
      shopPurchaseValue(stats,'focusTraining'),
      shopPurchaseValue(stats,'defenseTraining')
    ].join(' / ')+'회']
  ].map(item=>'<div class="rank-build-stat"><span>'+rankBuildText(item[0])+'</span><b>'+rankBuildText(item[1])+'</b></div>').join('');
  return '<div class="rank-build-section"><h3>골드 통계</h3><div class="rank-build-stats">'+rows+'</div></div>';
}
function formatRankBuildStat(key,val){
  const n=Number(val);
  if(!Number.isFinite(n)) return rankBuildText(val);
  if(key==='armor') return armorDisplayValue(n);
  if(key==='critChance') return Math.round(n*100)+'%';
  if(key==='critDamage') return 'x'+n.toFixed(1);
  if(key==='attackSpeed') return n.toFixed(1)+'/초';
  if(key==='damage'||key==='regen') return n.toFixed(1);
  return String(Math.round(n));
}
function renderScoreBreakdownSection(summary){
  const b=(summary&&summary.scoreBreakdown)||scoreBreakdownFromSummary(summary);
  if(!b){
    return '<div class="rank-build-section"><h3>점수 분해</h3><div class="rank-build-empty">정보 부족</div></div>';
  }
  const total=Number(b.score!=null?b.score:(summary&&summary.score))||0;
  const rows=[
    ['진행 점수',b.progressScore],
    ['처치 점수',b.killScore],
    ['레벨 점수',b.levelScore],
    ['클리어 보너스',b.clearBonus],
    ['시간 보너스',b.timeBonus],
    ['피격 패널티',-Math.abs(Number(b.hitPenalty)||0)],
    ['재도전 패널티',-Math.abs(Number(b.retryPenalty)||0)],
    ['총점',total]
  ].map(item=>{
    const n=Number(item[1])||0;
    const text=(n<0?'-':'')+fmtScore(Math.abs(Math.round(n)));
    return '<div class="rank-build-stat"><span>'+rankBuildText(item[0])+'</span><b>'+rankBuildText(text)+'</b></div>';
  }).join('');
  return '<div class="rank-build-section"><h3>점수 분해</h3><div class="rank-build-stats">'+rows+'</div></div>';
}
function renderScoreBreakdownSectionV2(summary){
  const b=(summary&&summary.scoreBreakdown)||scoreBreakdownFromSummary(summary);
  if(!b){
    return '<div class="rank-build-section"><h3>점수 분해</h3><div class="rank-build-empty">정보 부족</div></div>';
  }
  const total=Number(b.score!=null?b.score:(summary&&summary.score))||0;
  const rows=[
    ['진행 점수',b.progressScore,'add'],
    ['처치 점수',b.killScore,'add'],
    ['레벨 점수',b.levelScore,'add'],
    ['클리어 보너스',b.clearBonus,'add'],
    ['시간 보너스',b.timeBonus,'add'],
    ['피격 패널티',-Math.abs(Number(b.hitPenalty)||0),'penalty'],
    ['재도전 패널티',-Math.abs(Number(b.retryPenalty)||0),'penalty'],
    ['총점',total,'total']
  ].map(item=>{
    const n=Number(item[1])||0;
    const text=item[2]==='total'
      ? fmtScore(Math.round(n))
      : ((n>=0?'+':'-')+fmtScore(Math.abs(Math.round(n))));
    return '<div class="rank-build-stat score-'+item[2]+'"><span>'+rankBuildText(item[0])+'</span><b>'+rankBuildText(text)+'</b></div>';
  }).join('');
  return '<div class="rank-build-section"><h3>점수 분해</h3><div class="rank-build-stats">'+rows+'</div></div>';
}
function renderRunBuildDetail(summary,build){
  const title=$('rankBuildTitle');
  const body=$('rankBuildBody');
  if(!body) return;
  const nick=cleanLeaderboardName(summary&&((summary.nickname||summary.name)||''));
  if(title) title.textContent=nick+'님의 런 상세';
  const scoreSection=renderScoreBreakdownSectionV2(summary);
  if(title) title.textContent=nick+'님의 런 상세';
  if(!build || build.version!==RUN_BUILD_VERSION){
    body.innerHTML=scoreSection+'<div class="rank-build-empty">상세 빌드 정보 없음</div>';
    return;
  }
  if(!build || build.version!==RUN_BUILD_VERSION){
    body.innerHTML='<div class="rank-build-empty">상세 빌드 정보 없음</div>';
    return;
  }
  const detailAct=Math.max(1,Math.round(Number(summary&&summary.act)||1));
  const detailFloor=Math.max(1,Math.round(Number(summary&&(summary.floor!=null?summary.floor:summary.reachedFloor))||1));
  const summaryItems=[
    ['난이도',summary.difficulty||summary.difficultyKey||'-'],
    ['캐릭터',summary.character||PLAYER_CHARACTER_NAME],
    ['진행',detailAct+'막 '+detailFloor+'층'],
    ['레벨','Lv.'+(Math.max(1,Math.round(Number(summary.level)||1)))],
    ['시간',fmtTime(summary.clearTime!=null?summary.clearTime:summary.elapsedSec)]
  ];
  const statLabels={
    maxHp:'최대 체력', damage:'공격력', attackSpeed:'초당 발사',
    critChance:'치명타 확률', critDamage:'치명타 피해', moveSpeed:'이동 속도',
    projectileCount:'투사체', armor:'피해 감소', regen:'체력 재생', bulletSpeed:'탄속'
  };
  const stats=Object.keys(statLabels).filter(k=>build.stats&&build.stats[k]!=null).map(k=>{
    const label=(k==='armor')?armorDisplayLabel(Number(build.stats[k])||0):statLabels[k];
    return '<div class="rank-build-stat"><span>'+rankBuildText(label)+'</span><b>'+formatRankBuildStat(k,build.stats[k])+'</b></div>';
  }).join('')+
    '<div class="rank-build-stat"><span>골드</span><b>'+fmtScore(Number(build.gold)||0)+'</b></div>'+
    '<div class="rank-build-stat"><span>진행</span><b>'+rankBuildText((build.act||'-')+'막 '+(build.stage||'-')+'층')+'</b></div>';
  body.innerHTML=
    '<div class="rank-build-summary">'+summaryItems.map(item=>
      '<div class="rank-build-chip"><span>'+rankBuildText(item[0])+'</span><b>'+rankBuildText(item[1])+'</b></div>'
    ).join('')+'</div>'+
    scoreSection+
    '<div class="rank-build-section"><h3>주요 스펙</h3><div class="rank-build-stats">'+stats+'</div></div>'+
    renderRankBuildGoldStats(build)+
    '<div class="rank-build-section"><h3>유물</h3>'+renderRankBuildList('relic',build.relics)+'</div>'+
    '<div class="rank-build-section"><h3>포션</h3>'+renderRankBuildList('potion',build.potions)+'</div>'+
    '<div class="rank-build-section"><h3>훈련</h3>'+renderRankBuildTraining(build.training)+'</div>'+
    '<div class="rank-build-section"><h3>레벨업 특성</h3>'+renderRankBuildList('perk',build.perks)+'</div>'+
    '<div class="rank-build-section"><h3>패시브 노드</h3>'+renderRankBuildList('passive',build.passiveNodes)+'</div>';
}
function closeRankBuildModal(){
  const modal=$('rankBuildModal');
  if(modal) modal.classList.add('hidden');
}
async function openRankBuildDetail(summary){
  const modal=$('rankBuildModal');
  const body=$('rankBuildBody');
  if(!modal || !body) return;
  const runId=summary&&(summary.runId||summary.id);
  modal.classList.remove('hidden');
  body.innerHTML='<div class="rank-build-empty">상세 빌드 정보를 불러오는 중...</div>';
  if(summary&&summary.build){
    renderRunBuildDetail(summary,summary.build);
    return;
  }
  if(!runId){
    renderRunBuildDetail(summary,null);
    return;
  }
  if(leaderboardSplitReadDenied){
    renderRunBuildDetail(summary,null);
    return;
  }
  if(rankingBuildCache.has(runId)){
    const cached=rankingBuildCache.get(runId);
    renderRunBuildDetail(summary,cached&&typeof cached.then==='function'?await cached:cached);
    return;
  }
  try{
    const loadPromise=(async()=>{
      const api=await ensureLeaderboardApi();
      const snap=await api.fs.getDoc(api.fs.doc(api.db,RUN_BUILDS_COLLECTION,runId));
      return snap.exists()?snap.data():null;
    })();
    rankingBuildCache.set(runId,loadPromise);
    const build=await loadPromise;
    rankingBuildCache.set(runId,build);
    renderRunBuildDetail(summary,build);
  }catch(e){
    if(isFirestorePermissionError(e)) leaderboardSplitReadDenied=true;
    else console.warn('run build load failed',e);
    rankingBuildCache.set(runId,null);
    renderRunBuildDetail(summary,null);
  }
}
async function loadRankingSummaries(api){
  const season=rankingSeason;
  if(!leaderboardSplitReadDenied){
    try{
      const q=api.fs.query(api.fs.collection(api.db,LEADERBOARD_SUMMARY_COLLECTION),api.fs.orderBy('score','desc'),api.fs.limit(200));
      const snap=await api.fs.getDocs(q);
      const records=snap.docs.map(doc=>normalizeRankingRecord(Object.assign({id:doc.id,runId:doc.id},doc.data())))
        .filter(d=>(d.difficultyKey||'easy')===rankingDifficulty && recordSeason(d)===season)
        .slice(0,10);
      if(records.length) return sortRankingRecords(records).slice(0,10);
    }catch(e){
      if(isFirestorePermissionError(e)) leaderboardSplitReadDenied=true;
      else console.warn('leaderboard summary query failed',e);
    }
  }
  const q=api.fs.query(api.fs.collection(api.db,leaderboardCollectionFor(rankingDifficulty)),api.fs.orderBy('score','desc'),api.fs.limit(200));
  const snap=await api.fs.getDocs(q);
  return sortRankingRecords(snap.docs.map(doc=>normalizeRankingRecord(Object.assign({id:doc.id},doc.data()))).filter(d=>recordSeason(d)===season)).slice(0,10);
}
async function saveLegacyRunScore(){
  const summary=arguments[0]||{};
  const build=arguments[1]||null;
  const api=await ensureLeaderboardApi();
  const runId=summary.runId||createRunId(api);
  const createdAt=api.fs.serverTimestamp();
  const buildData=build?Object.assign({runId,createdAt},build):null;
  const embeddedTitle=titleWithEmbeddedBuild(summary.title||'',build);
  const summaryData=Object.assign({},summary,{runId,createdAt,title:embeddedTitle});
  const legacyData={
    act:Math.max(1,Math.round(Number(summary.act)||1)),
    createdAt,
    difficulty:String(summary.difficulty||''),
    difficultyKey:String(summary.difficultyKey||'easy'),
    elapsedSec:Math.max(0,Math.round(Number(summary.elapsedSec)||0)),
    floor:Math.max(1,Math.round(Number(summary.floor)||1)),
    hits:Math.max(0,Math.round(Number(summary.hits)||0)),
    killer:String(summary.killer||''),
    kills:Math.max(0,Math.round(Number(summary.kills)||0)),
    level:Math.max(1,Math.round(Number(summary.level)||1)),
    name:cleanLeaderboardName(summary.name||summary.nickname),
    retries:Math.max(0,Math.round(Number(summary.retries)||0)),
    score:clamp(Math.round(Number(summary.score)||0),0,SCORE_MAX),
    title:embeddedTitle,
    seasonId:Math.max(1,Math.floor(Number(summary.seasonId)||getCurrentSeason())),
    win:!!summary.win
  };
  await api.fs.addDoc(api.fs.collection(api.db,leaderboardCollectionFor(legacyData.difficultyKey)),legacyData);
  if(!leaderboardSplitWriteDenied){
    try{
      const batch=api.fs.writeBatch(api.db);
      batch.set(api.fs.doc(api.db,LEADERBOARD_SUMMARY_COLLECTION,runId),summaryData);
      if(buildData) batch.set(api.fs.doc(api.db,RUN_BUILDS_COLLECTION,runId),buildData);
      await batch.commit();
    }catch(e){
      if(isFirestorePermissionError(e)) leaderboardSplitWriteDenied=true;
      console.warn('leaderboard detail write skipped; legacy score saved',e);
    }
  }
  return true;
}
async function saveRunScore(win,killer,scoreData,name){
  const token=++scoreSubmitSeq;
  const saveEl=$('endScoreSave');
  if(saveEl) saveEl.textContent='ranking save...';
  try{
    scoreData=scoreData||calcRunScore(win);
    const scoreToSave=clamp(Math.round(Number(scoreData&&scoreData.score)||0),0,SCORE_MAX);
    if(scoreData) scoreData.score=scoreToSave;
    if(scoreToSave<LEADERBOARD_MIN_SCORE){
      if(saveEl) saveEl.textContent=fmtScore(LEADERBOARD_MIN_SCORE)+'점 이상부터 랭킹 등록 가능';
      return false;
    }
    const saveName=cleanLeaderboardName(name||getLeaderboardName());
    if(token!==scoreSubmitSeq) return false;
    const difficultyKey=diffSet&&diffSet.key?diffSet.key:'easy';
    const runId=createClientRunId();
    const clearTime=Math.round(scoreData.elapsedSec);
    const summary={
      runId,
      nickname:saveName,
      name:saveName,
      score:scoreToSave,
      kills:totalKills,
      level,
      act,
      floor:scoreData.reachedFloor,
      hits:runHits,
      retries,
      clearTime,
      elapsedSec:clearTime,
      win:!!win,
      cleared:!!win,
      clearedAct:win?Math.max(1,Number(act)||1):0,
      killer:killer||lastKiller||'',
      title:getSelectedTitleName(),
      difficultyKey,
      difficulty:diffSet&&diffSet.label?diffSet.label:'',
      character:PLAYER_CHARACTER_NAME,
      goldStats:getRunGoldStatsSnapshot(),
      version:RUN_BUILD_VERSION,
      seasonId:getCurrentSeason(),
      createdAt:new Date().toISOString()
    };
    const build=pendingRunBuildSnapshot||createRunBuildSnapshot(scoreData);
    if(getLeaderboardSubmitEndpoint()) await submitRunScoreToTrustedEndpoint(summary,build);
    else await saveLegacyRunScore(summary,build);
    rankingBuildCache.set(runId,build);
    if(saveEl) saveEl.textContent='ranking saved';
    return true;
  }catch(e){
    console.warn('ranking save failed',e);
    if(saveEl) saveEl.textContent='ranking save failed';
    return false;
  }
}
async function renderRankingList(){
  const list=$('rankingList'); if(!list) return;
  list.innerHTML='<div class="rank-empty">기록을 불러오는 중...</div>';
  setRankingDifficulty(rankingDifficulty);
  try{
    const api=await ensureLeaderboardApi();
    const records=await loadRankingSummaries(api);
    if(!records.length){ list.innerHTML='<div class="rank-empty">아직 기록이 없습니다.</div>'; return; }
    list.innerHTML='';
    let rank=1;
    records.forEach(d=>{
      const row=document.createElement('div');
      row.className='rank-row has-build';
      row.tabIndex=0;
      row.setAttribute('role','button');
      row.setAttribute('aria-label',cleanLeaderboardName(d.nickname||d.name)+'님의 '+rankDetailButtonText(d));
      row.innerHTML=
        '<div class="rank-no">#'+rank+'</div>'+
        '<div><div class="rank-name"></div><div class="rank-meta"></div></div>'+
        '<div class="rank-score">'+fmtScore(Number(d.score)||0)+'</div>'+
        '<div class="rank-detail-hint">'+rankBuildText(rankDetailButtonText(d))+'</div>';
      row.querySelector('.rank-name').textContent=visibleLeaderboardName(d.nickname||d.name,d.title);
      row.querySelector('.rank-meta').textContent=rankingReachedText(d);
      row.onclick=()=>openRankBuildDetail(d);
      row.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openRankBuildDetail(d); } };
      list.appendChild(row);
      rank++;
    });
  }catch(e){
    console.warn('ranking load failed',e);
    list.innerHTML='<div class="rank-empty">랭킹을 불러오지 못했습니다.</div>';
  }
}
const player={};
let enemies=[], pBullets=[], eBullets=[], pickups=[], particles=[];
const PERF_LIMITS={
  damageTexts:100,
  particles:220,
  pickups:80,
  floatBubbles:16,
  hazards:120,
  kijoLaserWarns:80,
  pBullets:900,
  eBullets:1200
};
let perfDebugT=0;
let roomBgGlitchLast=0;
let hudValueCache={};
let hpHudCache={text:null,pct:null};
let potionHudSig=null;
let sidePanelSig=null;
function trimArrayHead(arr,max){
  if(Array.isArray(arr)&&max>0&&arr.length>max) arr.splice(0,arr.length-max);
}
function cleanupCombatArrays(){
  trimArrayHead(particles,PERF_LIMITS.particles);
  if(typeof dmgNums!=='undefined') trimArrayHead(dmgNums,PERF_LIMITS.damageTexts);
  trimArrayHead(pickups,PERF_LIMITS.pickups);
  trimArrayHead(floatBubbles,PERF_LIMITS.floatBubbles);
  trimArrayHead(hazards,PERF_LIMITS.hazards);
  trimArrayHead(kijoLaserWarns,PERF_LIMITS.kijoLaserWarns);
  if(typeof kijoMasks!=='undefined') trimArrayHead(kijoMasks,24);
  if(typeof kijoGazes!=='undefined') trimArrayHead(kijoGazes,12);
  if(typeof kijoParades!=='undefined') trimArrayHead(kijoParades,16);
  if(typeof gZones!=='undefined') trimArrayHead(gZones,10);
  if(typeof gWalls!=='undefined') trimArrayHead(gWalls,12);
  if(typeof gClones!=='undefined') trimArrayHead(gClones,14);
  if(typeof gSlow!=='undefined') trimArrayHead(gSlow,14);
  if(typeof seungwooLaserWarns!=='undefined') trimArrayHead(seungwooLaserWarns,80);
  trimArrayHead(pBullets,PERF_LIMITS.pBullets);
  trimArrayHead(eBullets,PERF_LIMITS.eBullets);
}
function updatePerfDebug(dt){
  if(!window.DEBUG_PERF) return;
  perfDebugT+=dt;
  if(perfDebugT<1) return;
  perfDebugT=0;
  const fps=(typeof _fps==='number')?Math.round(_fps):null;
  console.debug('[perf]',{
    fps,
    enemies:enemies.length,
    boss:!!boss,
    pBullets:pBullets.length,
    eBullets:eBullets.length,
    particles:particles.length,
    damageTexts:(typeof dmgNums!=='undefined'&&dmgNums)?dmgNums.length:0,
    pickups:pickups.length,
    hazards:hazards.length,
    floatBubbles:floatBubbles.length
  });
}
let totalKills=0, kills=0, gold=0, level=1, xp=0, xpNext=20;
let playerAttackSeq=0;
let runStartedAt=0, runHits=0, runShopPurchases=0, runShopSpent=0;
let runStats=normalizeRunStats(null);
let debugLastGoldDrop=null;
let pendingScoreData=null, pendingScoreWin=false, pendingScoreKiller='', pendingScoreSaved=false;
let pendingRunBuildSnapshot=null;
let roomCleared=false, roomIsBoss=false, boss=null, bossBanner=0, roomHadElite=false, roomEliteKind=null;
let eliteViewerSpawns=0;   // 자잘자(엘리트 시청자) 런 전체 출몰 횟수 — 최대 1회로 제한
let roomIsMidboss=false, runActive=false;   // 음악 컨텍스트용 플래그
let eliteIntro=null, slowmoT=0;
let sfxVol=1, bgmVol=1;
let bossEvolve=null;
let shopIntroShown=false;
let hazards=[];
let kijoMasks=[], kijoGazes=[], kijoParades=[], kijoLaserWarns=[];
let stallTimer=0, stallWarned=false, stallRegenWarned=false, stallRaged=false, stallReinforced=false;
let tierIntroShown=false;
let treeIntroShown=false;
let screenShake=0, hitFlash=0;
// ── 이벤트 → 다음 전투/보상에 적용되는 모디파이어 ──
let nextCombatMods=null;      // {hpMul,spdMul,atkMul,cntMul,fireHandicap,rewardMul,xpMul,ally,challenge,specialReward,banner}
let combatRewardMul=1;        // 이번 전투 보상 골드 배수
let combatXpMul=1;            // 이번 전투 처치 경험치 배수
let nextShopDiscount=0;       // 다음 상점 1회성 할인 (0~1, 예: 0.1 = 10% 할인)
let combatChallenge=null;     // 'nohit' 등 도전 조건
let combatSpecialReward=null; // 전투 승리 후 일반 보상 대신 실행할 콜백
let combatTookHit=false;      // 이번 전투 피격 여부
let combatTempAlly=false;     // 이번 전투 한정 아군 여부
let nextGoldPenalty=0;        // 다음 전투 보상 골드 감소(0~1)
let act=1, mapData=null, currentRow=0;
const MAX_ACT=3;
const ACT_BOSS=[0,3,4]; // 1막 키죠 / 2막 승우(글리치) / 3막 세트3형제
const ACT_TUNING=[
  null,
  {enemyHpMul:1,eliteHpMul:1,bossHpMul:1,bossXp:350,bossGold:[105,170],killGoldMul:1,shopPriceMul:1,name:"1막"},
  {enemyHpMul:1,eliteHpMul:1,bossHpMul:1,bossXp:3100,bossGold:[105,170],killGoldMul:1,shopPriceMul:1,name:"2막"},
  // 3막 최종보스 전투 시간 완화: 일반몹/정예 체감은 유지하고 보스 HP만 낮춘다.
  {enemyHpMul:1.18,eliteHpMul:1.18,bossHpMul:1.25,bossXp:4400,bossGold:[150,230],killGoldMul:1.25,shopPriceMul:1.06,name:"3막 · 심연 속"}
];
function actTuning(a){ return ACT_TUNING[Math.max(1,Math.min(MAX_ACT,Number(a)||1))]||ACT_TUNING[1]; }
let timeScale=1;
function queueNextCombatMod(mod){
  if(!mod) return nextCombatMods;
  const base=nextCombatMods?Object.assign({},nextCombatMods):{};
  ['hpMul','spdMul','atkMul','cntMul','fireHandicap'].forEach(k=>{
    if(mod[k]!=null) base[k]=(Number(base[k])||1)*(Number(mod[k])||1);
  });
  ['rewardMul','xpMul'].forEach(k=>{
    if(mod[k]!=null) base[k]=Math.max(Number(base[k])||1,Number(mod[k])||1);
  });
  ['ally','challenge','specialReward','banner'].forEach(k=>{
    if(mod[k]!=null) base[k]=mod[k];
  });
  nextCombatMods=base;
  return nextCombatMods;
}
function resetCombatModState(){
  nextCombatMods=null; combatRewardMul=1; combatXpMul=1; combatChallenge=null; combatSpecialReward=null; combatTookHit=false; combatTempAlly=false; nextGoldPenalty=0;
}
function resetPlayer(){
  Object.assign(player,{
    x:W/2,y:H/2,r:14,hp:70,maxhp:70,spd:175,
    dmg:7,dmgMul:1,dmgAdd:0,fireAdd:0,fireTimer:0,shots:1,
    bulletSize:1,bounce:0,pierce:0,lifesteal:0,armor:0,magnet:60,
    misfire:false,gamble:false,
    dodgeCd:0,dodging:0,iframes:0,relics:[],perkIds:[],facing:0,
    potions:[], buffs:{rage:0,haste:0,shield:0},
    potionBuffs:[], potionAtkFlat:0, potionAtkMul:1, potionFireAdd:0, potionArmor:0, deathWard:0,
    critChance:CRIT_BASE_CHANCE,critMult:CRIT_BASE_MULT,regen:0,regenMul:1,regenAcc:0,goldMul:1,xpMul:1,bulletSpeedMul:1,moveSpeedAdd:0,
    stunChance:0,explodeKill:0,reviveOnce:false,usedRevive:false,bossDmgMul:1,
    lowHpMul:0,lowHpAtkFlat:0,dodgeCdMul:1,roomShield:0,homing:0,backShot:false,
    burn:0,chill:0,poison:0,bulletExplode:0,
    doubleTap:0,
    thorns:0,healOnKill:0,donateChance:0,crowdRage:0,crowdRageAtkFlat:0,
    killBurstChance:0,killBurstDmg:0,killBurstCd:0,noPotionDmgMul:1,noPotionAtkFlat:0,
    shieldRegen:0,shieldRegenT:0,hitShield:0,
    lastStand:false,usedLastStand:false,
    dodgeBlast:0,dodgeHaste:false,dodgeIframeBonus:0,
    dodgeCharges:1,dodgeMaxCharges:1,dashFxTrailT:0,dodgeReadyFxT:0,minion:null,
    // === 신규 퍼 스탯 ===
    goldPower:0, goldPowerAtkFlat:0, statusDmgMul:0, statusDotDmgMul:0, critHeal:0, chainLightning:0,
    chainKillLightning:0, critExplodeMul:0, recoveryMul:1, roomClearHeal:0, roomEntryHeal:0, shopCostMul:1, timeStop:0,
    execThreshold:0, execDoom:false, execBlast:0, executeInstinctDmgMul:0, statusSpread:false,
    nonCritDmgMul:1, closeProjectileDmgMul:0, barrageFocus:false, extraProjectileCritChance:0,
    statusCritChance:0, chillCritChance:0, corrosiveSpread:false, dodgeReload:false, dodgeReloadT:0,
    poisonDotDmgMul:0,
    perfectDodge:false, perfectDodgeArmed:false, perfectDodgeCheckT:0, perfectDodgeFireT:0,
    shadowBarrage:false, shadowBarrageExtraShots:1, shadowBarrageT:0, shadowBarrageCd:0, regenOverload:false,
    overhealShieldRate:0, overhealShieldCap:0.2, overhealShield:0, investmentReturn:false, investmentReturnAtkFlat:0,
    curseAffinity:false, corruptedContract:false, ominousAdaptation:false, ominousAdaptationAtkFlat:0, doomWorship:false, doomWorshipAtkFlat:0, _doomWorshipHpBase:null, _doomWorshipHpMul:1,
    potionAmp:0, infiniteRefill:false, alchemySurge:false,
    damageTakenMul:1, redPulseRegen:0, redPulseCd:0, redPulseBuff:0, gamblersBlade:false, greedContract:false, moveLockT:0, moveLockImmuneT:0,
    fixedMaxHp:0, levelFullHeal:false,
    training:Object.assign({},TRAINING_DEFAULTS), trainingAtkBonus:0, trainingSpeedBonus:0, trainingFocusBonus:0, trainingDefenseBonus:0,
    _critDefaultsV2:true,
  });
}

// ---------- HUD ----------
// HP만 갱신하는 경량 함수 (재생 등 매초 호출 시 전체 HUD 리빌드 회피)
function updateHpHud(){
  const hpText=$('hpText'), hpFill=$('hpFill');
  const text=Math.ceil(player.hp)+" / "+player.maxhp;
  const pct=clamp(player.hp/player.maxhp*100,0,100).toFixed(1)+"%";
  if(hpText&&hpHudCache.text!==text){ hpText.textContent=text; hpHudCache.text=text; }
  if(hpFill&&hpHudCache.pct!==pct){ hpFill.style.width=pct; hpHudCache.pct=pct; }
}
function hudSetText(id,value){
  value=String(value);
  if(hudValueCache[id]===value) return;
  const el=$(id); if(!el) return;
  el.textContent=value;
  hudValueCache[id]=value;
}
function hudSetWidth(id,value){
  if(hudValueCache[id+':width']===value) return;
  const el=$(id); if(!el) return;
  el.style.width=value;
  hudValueCache[id+':width']=value;
}
function updateHUD(){
  if((state==='title'||state==='start') && player.maxhp==null){ refreshSidePanel(); return; }
  enforceFixedMaxHp(player);
  checkGoldAchievements();
  { const rt=$('retryText'); if(rt){ const max=diffSet.maxRetries; const left=max===Infinity?'∞':Math.max(0,max-retries); const color=(max!==Infinity&&left<=1)?'#ff4d6d':'var(--neon)'; if(rt.textContent!==String(left)) rt.textContent=left; if(rt.style.color!==color) rt.style.color=color; } }
  updateHpHud();
  hudSetText('goldText',gold);
  hudSetText('floorText',act+"막 · "+(currentRow+1)+"층");
  hudSetText('lvlText',level);
  hudSetWidth('xpFill',clamp(xp/xpNext*100,0,100).toFixed(1)+"%");
  renderPotions();
  refreshSidePanel();
  // 트리 버튼 갱신
  const treeBadge=$('treeBtnPts');
  const treeBtn=$('treeBtnHud');
  if(treeBadge && treeBtn){
    if(treePoints>0){
      treeBadge.style.display='inline-block';
      treeBadge.textContent=treePoints;
      treeBtn.classList.add('has-points','tree-btn-glow');
      treeBadge.classList.add('has-points');
    } else {
      treeBadge.style.display='none';
      treeBtn.classList.remove('has-points','tree-btn-glow');
      treeBadge.classList.remove('has-points');
    }
  }
}
function renderPotions(){
  const cont=$('potionSlots');
  if(!cont) return;
  const sig=(player.potions||[]).map(p=>p?(p.id||p.name||'potion'):'').join('|');
  if(potionHudSig===sig) return;
  potionHudSig=sig;
  cont.innerHTML='';
  for(let i=0;i<3;i++){
    const p=player.potions&&player.potions[i];
    const el=document.createElement('div');
    el.className='pslot'+(p?'':' empty');
    if(p){ el.innerHTML=potionIconHTML(p,'potion-pix-hud')+'<span class="key">'+(i+1)+'</span>'; el.title=p.name+' - '+p.desc; el.onclick=()=>usePotion(i); }
    else { el.textContent='·'; }
    cont.appendChild(el);
  }
}

// ---------- 배너 ----------
const bannerEl=$('banner');
function banner(big,small,ms){
  if(big==='CLEAR' && roomHadElite) small=eliteClearText(currentEliteKind());
  if(roomHadElite && ms===1400 && String(small||'').indexOf('+')>=0){
    const m=String(small||'').match(/\+(\d+)/);
    big=eliteRewardTitle(currentEliteKind());
    small='골드 +'+(m?m[1]:'');
  }
  bannerEl.querySelector('.big').textContent=big;
  bannerEl.querySelector('.small').textContent=small||'';
  bannerEl.classList.add('show');
  clearTimeout(bannerEl._t);
  bannerEl._t=setTimeout(()=>bannerEl.classList.remove('show'),ms||1600);
}

// ---------- 전투 구역 시작 ----------
const BOSS_INTRO_LINES={
  yanggaeng:{name:'박제인간',line:'저희... 친해요?',tone:'slow',ms:2300},
  hyechul:{name:'혜철이',line:'에그는... 곧 깨어나.',tone:'dark',ms:2100},
  kijo:{name:'키죠',line:'보지 마.',sub:'키죠의 마안이 열렸다.',tone:'purple',glitch:true,ms:2100},
  rhino_beetle:{name:'자잘자',line:'oof.',sub:'자잘자가 돌진 준비를 합니다.',ms:1800},
  kkotchung:{name:'양갱',line:'@#$#@@...',tone:'dark',glitch:true,ms:1900},
  onster:{name:'온스터',line:'아직 깨우지 마라.',sub:'사슬이 바닥을 긁는다.',tone:'dark',ms:2100},
  set3:{name:'세트3형제',line:'형이 나오기 전에 끝내자.',sub:'방송 신호가 세 갈래로 찢어진다.',tone:'dark',ms:2300},
  seungwoo:{name:'승우',line:'(하아...)',sub:'승우가 천천히 눈을 뜹니다.',tone:'dark',ms:2200}
};
let bossIntroSeen={};
let bossIntroToken=0;
function bossIntroEntityActive(entity){
  if(!entity) return true;
  if(entity.boss) return boss===entity;
  return Array.isArray(enemies)&&enemies.includes(entity)&&!entity.dead;
}
function bossIntroDataFor(id,entity){
  const data=Object.assign({},BOSS_INTRO_LINES[id]||{});
  if(entity){
    data.name=entity.name||entity.label||data.name||id||'알 수 없는 보스';
    data.sub=entity.title||data.sub||'';
    data.line=entity.quip||data.line||entity.title||'';
  }else{
    data.name=data.name||id||'알 수 없는 보스';
  }
  return data;
}
function showBossIntroLine(id,delay,entity){
  const data=bossIntroDataFor(id,entity);
  if(!data||bossIntroSeen[id]) return;
  bossIntroSeen[id]=true;
  const token=bossIntroToken;
  setTimeout(()=>{
    if(token!==bossIntroToken||state!=='play'||roomCleared||!bossIntroEntityActive(entity)) return;
    const box=$('bossIntroQuote'); if(!box) return;
    const name=box.querySelector('.boss-intro-name'), line=box.querySelector('.boss-intro-line'), sub=box.querySelector('.boss-intro-sub');
    if(name) name.textContent=data.name||id;
    if(line) line.textContent=data.line||'';
    if(sub) sub.textContent=data.sub||'';
    box.className='';
    if(data.tone) box.classList.add(data.tone);
    if(data.glitch) box.classList.add('glitch');
    box.classList.add('show');
    clearTimeout(box._t);
    box._t=setTimeout(()=>box.classList.remove('show'),data.ms||2000);
    if(data.glitch||data.tone==='purple'){
      const fx=$('glitchFx'), app=$('app');
      if(fx){ fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on'); }
      if(app){ app.classList.remove('glitching'); void app.offsetWidth; app.classList.add('glitching'); setTimeout(()=>app.classList.remove('glitching'),720); }
    }else if(data.tone==='dark'||data.tone==='slow'){
      hitFlash=Math.max(hitFlash||0,0.22);
      screenShake=Math.max(screenShake||0,4);
    }
  },delay||0);
}
let lastRoomKind=null, cutsceneT=0, roomEntryHp=0, roomStartedAt=0, retries=0;
// ── 방 입장 시점의 진행 상태 스냅샷 (재도전 시 무한 레벨업 방지) ──
let roomEntrySnap=null;
function snapshotProgress(){
  roomEntrySnap={
    xp, level, xpNext, pendingLevels, gold, totalKills,
    runStats:getRunStatsSnapshot(),
    runShopPurchases, runShopSpent,
    treePoints, treeUnlocked: new Set(treeUnlocked), treeIntroShown,
    player:Object.assign({}, player, {
      relics:player.relics.slice(),
      perkIds:sanitizeStoredLevelPerkIds(player.perkIds),
      potions:player.potions.slice(),
      buffs:Object.assign({},player.buffs),
      potionBuffs:(player.potionBuffs||[]).map(b=>Object.assign({},b)),
      minion:null
    })
  };
}
function restoreProgress(){
  const s=roomEntrySnap; if(!s) return;
  xp=s.xp; level=s.level; xpNext=s.xpNext; pendingLevels=s.pendingLevels; gold=s.gold; totalKills=s.totalKills;
  runStats=normalizeRunStats(s.runStats);
  runShopPurchases=Number(s.runShopPurchases)||0;
  runShopSpent=Number(s.runShopSpent)||0;
  if(s.treePoints!=null){ treePoints=s.treePoints; treeUnlocked=new Set(s.treeUnlocked); }
  treeIntroShown=!!s.treeIntroShown;
  Object.assign(player, s.player, {
    relics:s.player.relics.slice(),
    perkIds:sanitizeStoredLevelPerkIds(s.player.perkIds),
    potions:s.player.potions.slice(),
    buffs:Object.assign({},s.player.buffs),
    potionBuffs:(s.player.potionBuffs||[]).map(b=>Object.assign({},b)),
    minion:null
  });
  migrateTreeOnlyPerksToTree();
  recalcPotionBuffs(player);
  if((player.relics||[]).some(r=>r&&r.id==='one_shot') && !player.fixedMaxHp) setFixedMaxHp(player,100);
  enforceFixedMaxHp(player);
}

// ---------- 로컬 이어하기 체크포인트 ----------
const RUN_SAVE_KEY='btvRunCheckpoint';
const RUN_SAVE_VERSION=1;
function clonePlain(obj){ return JSON.parse(JSON.stringify(obj)); }
function serializeMapData(md){
  if(!md) return null;
  return {
    nm:clonePlain(md.nm||{}),
    nodes:clonePlain(md.nodes||[]),
    edges:(md.edges||[]).slice(),
    startIds:(md.startIds||[]).slice(),
    currentId:md.currentId||null,
    reach:[...(md.reach||new Set())]
  };
}
function restoreMapData(data){
  if(!data||!data.nm||!data.nodes) return null;
  const nm=data.nm;
  return {
    nm,
    nodes:Object.values(nm),
    edges:(data.edges||[]).slice(),
    startIds:(data.startIds||[]).slice(),
    currentId:data.currentId||null,
    reach:new Set(data.reach||data.startIds||[])
  };
}
function serializePlayerForSave(){
  const p=clonePlain(player);
  p.relicIds=sanitizeStoredRelicIds((player.relics||[]).map(r=>r&&r.id));
  p.potionIds=(player.potions||[]).map(pt=>pt.id).filter(Boolean);
  p.hasMinion=!!player.minion;
  delete p.relics; delete p.potions; delete p.minion;
  return p;
}
function restorePlayerFromSave(data){
  resetPlayer();
  const p=Object.assign({},data||{});
  const relicIds=sanitizeStoredRelicIds(p.relicIds||[]);
  const potionIds=p.potionIds||[];
  const hasMinion=!!p.hasMinion;
  delete p.relicIds; delete p.potionIds; delete p.hasMinion;
  if(!p._critDefaultsV2){
    if(p.critChance===0) delete p.critChance;
    if(p.critMult===2) delete p.critMult;
    p._critDefaultsV2=true;
  }
  Object.assign(player,p);
  ensureTrainingState(player);
  player.trainingAtkBonus=Number(player.trainingAtkBonus)||0;
  player.trainingSpeedBonus=Number(player.trainingSpeedBonus)||0;
  player.trainingFocusBonus=Number(player.trainingFocusBonus)||0;
  player.trainingDefenseBonus=Number(player.trainingDefenseBonus)||0;
  player.potionAtkFlat=Number(player.potionAtkFlat)||0;
  player.lowHpAtkFlat=Number(player.lowHpAtkFlat)||0;
  player.crowdRageAtkFlat=Number(player.crowdRageAtkFlat)||0;
  player.noPotionAtkFlat=Number(player.noPotionAtkFlat)||0;
  player.goldPowerAtkFlat=Number(player.goldPowerAtkFlat)||0;
  player.investmentReturnAtkFlat=Number(player.investmentReturnAtkFlat)||0;
  player.ominousAdaptationAtkFlat=Number(player.ominousAdaptationAtkFlat)||0;
  player.doomWorshipAtkFlat=Number(player.doomWorshipAtkFlat)||0;
  player.perkIds=sanitizeStoredLevelPerkIds(player.perkIds,true);
  migrateTreeOnlyPerksToTree();
  player.perkIds=sanitizeStoredLevelPerkIds(player.perkIds);
  if(player.perkIds.indexOf('약효 증폭')>=0) player._perkPotionAmp=true;
  player.potionAmp=Number(player.potionAmp)||0;
  player.relics=relicIds.map(id=>relicById(id)).filter(Boolean);
  syncDoomWorshipHp(player);
  if(player.relics.some(r=>r&&r.id==='one_shot') && !player.fixedMaxHp) setFixedMaxHp(player,100);
  player.potions=potionIds.map(id=>POTIONS.find(pt=>pt.id===potionCanonicalId(id))).filter(Boolean);
  player.buffs=Object.assign({rage:0,haste:0,shield:0},player.buffs||{});
  player.potionBuffs=(player.potionBuffs||[]).map(b=>Object.assign({},b));
  player.minion=hasMinion?{ang:0,fireT:0,x:player.x,y:player.y}:null;
  recalcPotionBuffs(player);
  enforceFixedMaxHp(player);
}
function hasRunCheckpoint(){
  try{
    const data=JSON.parse(localStorage.getItem(RUN_SAVE_KEY)||'null');
    if(!data || data.version!==RUN_SAVE_VERSION || !data.mapData || data.dead || data.gameOver){
      if(data && (data.dead || data.gameOver)) localStorage.removeItem(RUN_SAVE_KEY);
      return false;
    }
    return true;
  }catch(e){ return false; }
}
function refreshLoadButton(){
  const b=$('tmLoad'); if(!b) return;
  const ok=hasRunCheckpoint();
  b.disabled=!ok;
  b.style.opacity=ok?'1':'0.38';
  b.style.cursor=ok?'pointer':'not-allowed';
}
function clearRunCheckpoint(){
  try{ localStorage.removeItem(RUN_SAVE_KEY); }catch(e){}
  refreshLoadButton();
}
function saveRunCheckpoint(){
  if(!runActive || tutorialMode || !mapData || state!=='map') return;
  try{
    const elapsed=Math.max(0,(performance.now()-runStartedAt)||0);
    const data={
      version:RUN_SAVE_VERSION,
      savedAt:Date.now(),
      diffKey:diffSet&&diffSet.key?diffSet.key:'easy',
      act,currentRow,kills,totalKills,gold,level,xp,xpNext,pendingLevels,retries,runHits,runShopPurchases,runShopSpent,elapsed,
      runStats:getRunStatsSnapshot(),
      runPotionUsed,eliteViewerSpawns,tierIntroShown,treeIntroShown,shopIntroShown,
      treePoints,treeUnlocked:[...treeUnlocked],
      nextCombatMods:nextCombatMods?clonePlain(nextCombatMods):null,
      combatRewardMul,combatXpMul,nextShopDiscount,nextGoldPenalty,
      mapData:serializeMapData(mapData),
      player:serializePlayerForSave()
    };
    localStorage.setItem(RUN_SAVE_KEY,JSON.stringify(data));
    refreshLoadButton();
  }catch(e){ console.warn('run checkpoint save failed',e); }
}
function loadRunCheckpoint(){
  let data=null;
  try{ data=JSON.parse(localStorage.getItem(RUN_SAVE_KEY)||'null'); }catch(e){}
  if(!data || data.version!==RUN_SAVE_VERSION || !data.mapData || data.dead || data.gameOver){
    if(data && (data.dead || data.gameOver)) clearRunCheckpoint();
    banner('불러오기 실패','이어할 수 있는 런이 없다',1200); refreshLoadButton(); return false;
  }
  try{
    diffSet=DIFFS[data.diffKey]||DIFFS.easy;
    act=clamp(Math.round(Number(data.act)||1),1,MAX_ACT); currentRow=data.currentRow||0; kills=0; totalKills=data.totalKills||0;
    gold=data.gold||0; level=data.level||1; xp=data.xp||0; xpNext=data.xpNext||20; pendingLevels=data.pendingLevels||0;
    retries=data.retries||0; runHits=data.runHits||0; runShopPurchases=data.runShopPurchases||0; runShopSpent=data.runShopSpent||0; runStats=normalizeRunStats(data.runStats); runStartedAt=performance.now()-(data.elapsed||0);
    runPotionUsed=!!data.runPotionUsed; eliteViewerSpawns=data.eliteViewerSpawns||0;
    tierIntroShown=!!data.tierIntroShown; treeIntroShown=!!data.treeIntroShown; shopIntroShown=!!data.shopIntroShown;
    treePoints=data.treePoints||0; treeUnlocked=new Set(data.treeUnlocked&&data.treeUnlocked.length?data.treeUnlocked:['hub']);
    nextCombatMods=data.nextCombatMods||null; combatRewardMul=data.combatRewardMul||1; combatXpMul=data.combatXpMul||1; nextShopDiscount=data.nextShopDiscount||0; nextGoldPenalty=data.nextGoldPenalty||0;
    restorePlayerFromSave(data.player);
    mapData=restoreMapData(data.mapData);
    if(!mapData) throw new Error('map restore failed');
    buildBackdrop(act);
    enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; hazards=[]; floatBubbles=[]; kijoMasks=[]; kijoGazes=[]; kijoParades=[]; kijoLaserWarns=[];
    boss=null; pendingNode=null; roomCleared=true; roomIsBoss=false; roomIsMidboss=false; roomHadElite=false; roomEliteKind=null; bossBanner=0; bossEvolve=null; cutsceneT=0;
    tutorialMode=false; tutorialDoneFlag=true; paused=false; mouseDown=false; autoFire=false; runActive=true; state='map';
    hideAll(); startBGM(); showMap(); banner('이어하기','저장된 진행을 불러왔다',1400);
    return true;
  }catch(e){
    console.warn('run checkpoint load failed',e);
    banner('불러오기 실패','저장 데이터가 손상됐다',1400);
    return false;
  }
}

// ===== JS: Combat flow =====
function startCombat(kind, fresh){
  if(fresh===undefined) fresh=true;
  lastRoomKind=kind;
  // 보스/중간보스전은 회피 공간을 넓혀준다
  const bigArena=(kind==='boss'||kind==='midboss');
  arenaResponsive=true;
  if(false){
    const s=computeFieldSize();
    setArena(Math.round(s.w*BOSS_ARENA_SCALE), Math.round(s.h*BOSS_ARENA_SCALE));
    cvs.style.width=''; cvs.style.height=''; // 보스 아레나는 비율 유지하며 맞춤 축소
  } else {
    fitField();
  }
  if(fresh){ roomEntryHp=player.hp; snapshotProgress(); if(player.roomEntryHeal>0) healPlayer(player.roomEntryHeal,player.x,player.y); }
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; hazards=[]; floatBubbles=[]; kijoMasks=[]; kijoGazes=[]; kijoParades=[]; kijoLaserWarns=[];
  player.x=W/2; player.y=H-90;
  roomCleared=false; roomIsBoss=(kind==='boss'); roomIsMidboss=(kind==='midboss'); kills=0; boss=null; roomHadElite=false; roomEliteKind=null; eliteIntro=null; timeScale=1; slowmoT=0;
  bossIntroToken++;
  bossIntroSeen={};
  { const biq=$('bossIntroQuote'); if(biq){ biq.className=''; clearTimeout(biq._t); } }
  roomStartedAt=performance.now();
  resetStallWatch();
  // GL/gView 리셋 (승우 외 보스전 잔여 효과 제거)
  if(typeof GL!=='undefined'){ for(const k in GL) GL[k]=0; }
  if(typeof gView!=='undefined'){ gView.rot=0;gView.rotT=0;gView.fx=1;gView.fy=1;gView.fxT=1;gView.fyT=1; }
  const row=currentRow;
  const diff=1+(act-1)*0.6+row*0.08;
  minionPool=normalEnemyPoolFor(act,row);
  const roomSpawnCounts={};

  if(kind==='boss'){
    const b=BOSSES[ACT_BOSS[Math.min(act-1,ACT_BOSS.length-1)]];
    boss=spawnBoss(b);
    showBossIntroLine(boss.key,520,boss);
    bossBanner=2.4; sfx.boss();
    banner(act+"막 보스 · "+boss.name, boss.title, 2400);
    showEntrance("👑 "+act+"막 보스 등장", boss.name, boss.quip||boss.title||"");
  }else{
    const P=ACT_POOLS[Math.min(act-1,ACT_POOLS.length-1)];
    const normalPool=normalEnemyPoolFor(act,row);
    let base=rand(3,5)+act*1.0+row*0.35;
    if(act===1) base*=1.15;               // 1막 일반방 밀도 소폭 상향
    if(row<MIDBOSS_ROW) base*=0.6;        // 중보 전: 약한 몹 중심, 낮은 밀도
    else if(row>MIDBOSS_ROW) base*=(act===1||act===2)?0.7:1.4; // 1·2막 후반은 강한 일반몹 비중으로 압박, 물량은 완화
    const countMax=act>=3?9:(((act===1||act===2)&&row>MIDBOSS_ROW)?11:16);
    let count=clamp(Math.round(base*diffSet.cnt), row<MIDBOSS_ROW?2:4, countMax);
    if(kind==='midboss'){
      if(act>=3){
        spawnEnemy('onster', W/2, 145, diff);
        const eb=enemies[enemies.length-1];
        eb.elite=true; eb.midboss=true; eb.label='온스터'; eb.phase=1; eb.atkT=1.4; eb.atkN=0; eb.summonT=4.2; eb.awakened=false;
        eb.title='3막 중간보스 · 온스터'; eb.quip='아직 깨우지 마라.';
        eb.x=W/2; eb.y=170; eb.intro=true; eb.introScale=1; eb.stunT=4; eb.tauntedHalf=false;
        showBossIntroLine('onster',520,eb);
        banner("중간보스 · 온스터","사슬이 바닥을 긁는다",1800);
        if(typeof sfx!=='undefined') sfx.boss();
        showEntrance("⚠️ 3막 중간보스 등장","온스터","아직 깨우지 마라.");
      } else if(act>=2){
        spawnEnemy('yanggaeng', W/2, 150, diff);
        const eb=enemies[enemies.length-1];
        eb.elite=true; eb.midboss=true; eb.label='박제인간'; eb.atkT=1.8; eb.atkN=0; eb.spinAng=0;
        eb.title='2막 중간보스 · 박제인간'; eb.quip='B면 — 되감을 수 없는 홈';
        showBossIntroLine('yanggaeng',520,eb);
        banner("중간보스 · 박제인간","정지된 음악, 멈춰진 시간",1800);
        if(typeof sfx!=='undefined') sfx.boss();
        showEntrance("⚠️ 중간보스 등장","박제인간","B면 — 되감을 수 없는 홈");
      } else {
        spawnEnemy('hyechul', W/2, 140, diff);
        const eb=enemies[enemies.length-1];
        eb.elite=true; eb.midboss=true; eb.label='혜철이'; eb.phase=1;
        eb.summonT=4.0; eb.atkT=1.4; eb.atkN=0; eb.climaxT=0;
        eb.title='1막 중간보스 · 혜철이'; eb.quip='해처리 — 저글링 군단';
        showBossIntroLine('hyechul',520,eb);
        banner("\uC911\uAC04\uBCF4\uC2A4 \u00B7 \uD61C\uCCA0\uC774","\uB465\uC9C0\uAC00 \uC6C0\uC9C1\uC778\uB2E4",1800);
        if(typeof sfx!=='undefined') sfx.boss();
        showEntrance("⚠️ 중간보스 등장","혜철이","해처리 — 저글링 군단");
      }
    }else if(kind==='elite'){
      // 자잘자 정예전 — 전용 엘리트 노드에서만 등장 (잡몹 소수 + 자잘자)
      const minions=clamp(Math.round(count*(act>=3?0.38:0.6)),act>=3?2:1,act>=3?4:6);
      for(let i=0;i<minions;i++) spawnRandomEnemy(pickNormalEnemyForRoom(act,row,roomSpawnCounts), diff, 60, H-180);
      if(act>=3){
        // TODO(act3-content): 3막 전용 정예 연출/패턴을 추가하면 이 placeholder 분기를 교체한다.
        const eliteId=pick((ACT_POOLS[2]&&ACT_POOLS[2].elite)||["giant_golem"]);
        spawnEnemy(eliteId, W/2, 160, diff);
        showBossIntroLine(eliteId,680);
        const ze=enemies[enemies.length-1]; roomHadElite=true; roomEliteKind=eliteId;
        ze.elite=true; ze.eliteViewer=true; ze.eliteKind=eliteId; ze.label=ze.name||"3막 정예";
        ze.hp*=1.70; ze.maxhp*=1.70; ze.dmg=Math.round((ze.dmg||10)*1.35); if(ze.touchDmg!=null) ze.touchDmg=Math.round(ze.touchDmg*1.2); ze.r+=5; ze.xp=Math.max(900,ze.xp||0); ze.coolT=1.0;
        ze.x=W/2; ze.y=190; ze.intro=true; ze.introScale=0; ze.stunT=4; ze.tauntedHalf=false;
        eliteIntro={t:0, ze:ze, warn:null, landed:false, banner:0, tensionDone:false};
        beep(420,0.3,"sine",0.05); beep(280,0.5,"sine",0.035);
      } else if(act===2){
        // 2막 엘리트: 양갱
        spawnEnemy('kkotchung', W/2, 140, diff);
        showBossIntroLine('kkotchung',680);
        const ze=enemies[enemies.length-1]; roomHadElite=true; roomEliteKind='yanggaeng';
        ze.elite=true; ze.eliteViewer=true; ze.eliteKind='yanggaeng'; ze.label='양갱';
        ze.hp*=1.75; ze.maxhp*=1.75; ze.dmg=Math.round(ze.dmg*1.4); ze.r+=5; ze.xp=900; ze.coolT=1.0;
        ze.x=W/2; ze.y=190; ze.intro=true; ze.introScale=0; ze.stunT=4; ze.tauntedHalf=false;
        ze.atkT=1.8; ze.atkN=0; ze.enr=false; ze.enrShown=false;
        ze.phase=1; ze.phaseHp=[0.68,0.36]; ze.climaxT=0; ze.eyeOrbs=[];
        eliteIntro={t:0, ze:ze, warn:null, landed:false, banner:0, tensionDone:false};
        beep(523,0.3,'sine',0.05); beep(392,0.5,'sine',0.035); // 달콤한 척 하는 음
      } else {
        spawnEnemy('rhino_beetle', W/2, 120, diff);
        showBossIntroLine('rhino_beetle',680);
        const ze=enemies[enemies.length-1]; roomHadElite=true; roomEliteKind='jajalja';
        ze.elite=true; ze.eliteViewer=true; ze.eliteKind='jajalja'; ze.label='자잘자';
        ze.hp*=2.25; ze.maxhp*=2.25; ze.dmg=Math.round(ze.dmg*1.35); ze.touchDmg=Math.round(enemyTouchBaseDamage(ze)*1.25); ze.r+=5; ze.xp=120; ze.coolT=1.0;
        ze.x=W/2; ze.y=190; ze.intro=true; ze.introScale=0; ze.stunT=4; ze.tauntedHalf=false;
        eliteIntro={t:0, ze:ze, warn:null, landed:false, banner:0, tensionDone:false};
        beep(330,0.5,'triangle',0.05); beep(440,0.55,'sine',0.035); // "징—"
      }
    }else{
      for(let i=0;i<count;i++) spawnRandomEnemy(pickNormalEnemyForRoom(act,row,roomSpawnCounts), diff, 60, H-180);
    }
  }
  // ── 이벤트 모디파이어 소비/적용 ──
  const actTune=actTuning(act);
  if(actTune && enemies.length){
    const hpMul=Number(actTune.enemyHpMul)||1, eliteHpMul=Number(actTune.eliteHpMul)||1;
    enemies.forEach(o=>{
      const mul=(o.elite||o.eliteViewer||o.midboss)?eliteHpMul:hpMul;
      if(mul!==1){ o.hp*=mul; o.maxhp*=mul; }
    });
  }
  combatRewardMul=1; combatXpMul=1; combatChallenge=null; combatSpecialReward=null; combatTookHit=false; player._fireHandicap=1; combatTempAlly=false;
  if(nextCombatMods){
    const M=nextCombatMods; nextCombatMods=null;
    if(M.cntMul && enemies.length){ const extra=Math.round(enemies.length*(M.cntMul-1)); for(let i=0;i<extra;i++){ spawnRandomEnemy(pickNormalEnemyForRoom(act,row,roomSpawnCounts), diff, 60, H-180); } }
    if(M.hpMul||M.spdMul||M.atkMul){ enemies.forEach(o=>{ if(!o.midboss){ if(M.hpMul){o.hp*=M.hpMul;o.maxhp*=M.hpMul;} if(M.spdMul){o.spd*=M.spdMul; if(o._spd0!=null)o._spd0*=M.spdMul;} if(M.atkMul){o.dmg=Math.round((o.dmg||0)*M.atkMul); if(o.touchDmg!=null)o.touchDmg=Math.round(o.touchDmg*M.atkMul); if(o.bodyDmg!=null)o.bodyDmg=Math.round(o.bodyDmg*M.atkMul); if(o.contactDmg!=null)o.contactDmg=Math.round(o.contactDmg*M.atkMul);} } }); }
    if(M.fireHandicap) player._fireHandicap=M.fireHandicap;
    if(M.rewardMul) combatRewardMul=Math.max(1,Number(M.rewardMul)||1);
    if(M.xpMul) combatXpMul=Math.max(1,Number(M.xpMul)||1);
    if(M.challenge) combatChallenge=M.challenge;
    if(M.specialReward) combatSpecialReward=M.specialReward;
    if(M.ally && !player.minion){ player.minion={ang:0,fireT:0,x:player.x,y:player.y}; combatTempAlly=true; }
    if(M.banner) banner(M.banner.big, M.banner.small||'', 1600);
  }
  if(player.roomShield>0) player.buffs.shield=Math.max(player.buffs.shield,player.roomShield);
  updateHUD();
  refreshSidePanel();
}

function safeRandomSpawnPoint(xMin,xMax,yMin,yMax,minDist){
  const lx=Math.min(xMin,xMax), hx=Math.max(xMin,xMax);
  const ly=Math.min(yMin,yMax), hy=Math.max(yMin,yMax);
  const safe=Math.max(0,minDist||ENEMY_SPAWN_SAFE_RADIUS);
  const px=player&&Number.isFinite(player.x)?player.x:W/2;
  const py=player&&Number.isFinite(player.y)?player.y:H/2;
  let best={x:rand(lx,hx),y:rand(ly,hy)}, bestD=dist2(best.x,best.y,px,py);
  for(let i=0;i<28;i++){
    const p={x:rand(lx,hx),y:rand(ly,hy)};
    const d=dist2(p.x,p.y,px,py);
    if(d>=safe*safe) return p;
    if(d>bestD){ best=p; bestD=d; }
  }
  return best;
}
function spawnRandomEnemy(type,diff,yMin,yMax,minDist){
  const p=safeRandomSpawnPoint(60,W-60,yMin==null?60:yMin,yMax==null?H-180:yMax,minDist);
  spawnEnemy(type,p.x,p.y,diff);
}
// ===== 악랄 모드(전역 난이도 가중치) — vicious() 콘솔로 조절 =====
const VICIOUS={
  on:true,
  move:1.12,      // 잡몹 이동속도
  bossMove:1.06,  // 보스 이동속도
  bspd:1.15,      // 적 탄속(전역)
  spdVar:0.10,    // 탄속 랜덤 ±
  cool:0.85,      // 쿨다운/연사 배율(<1 = 더 빠름)
  jitter:0.06,    // enemyShootAt 각도 랜덤(rad)
  doubleShot:0.14,// enemyShootAt 추가 1발 확률
};
function spawnEnemy(type,x,y,diff){
  const d=ENEMY_TYPES[type];
  const isSummonedType=(typeof SUMMON_TYPES!=='undefined'&&SUMMON_TYPES.has(type));
  const dmgScale=Math.min(diff,2.2);
  const touchBase=d.touchDmg ?? d.bodyDmg ?? d.contactDmg;
  markDiscovered('enemies', type);
  const vMove=VICIOUS.on?VICIOUS.move:1, vCool=VICIOUS.on?VICIOUS.cool:1;
  enemies.push({
    type,sprite:type,name:d.name,x,y,r:d.r,
    hp:d.hp*diff*diffSet.hp,maxhp:d.hp*diff*diffSet.hp,spd:d.spd*diffSet.spd*vMove,dmg:d.dmg*dmgScale,
    touchDmg:touchBase==null?undefined:touchBase*dmgScale,
    color:d.color,xp:d.xp,ai:d.ai,range:d.range||0,cool:(d.cool||0)*vCool,coolT:rand(0,1.2),
    explode:d.explode,armor:d.armor||0,label:d.label,canLunge:d.lunge,vx:0,vy:0,wob:rand(0,TAU),hitT:0,
    summoned:!!(d.summoned||isSummonedType),noKillScore:!!(d.noKillScore||isSummonedType),
  });
}
function spawnBoss(b){
  markDiscovered('bosses', b&&b.key);
  const scale=(1+(act-1)*0.35)*diffSet.hp*(actTuning(act).bossHpMul||1);
  const phaseHp=b.phaseHp?b.phaseHp.map(v=>v*scale):null;
  const hp=phaseHp?phaseHp[0]:b.hp*scale;
  return {
    boss:true,key:b.key,sprite:b.sprite,name:b.name,x:W/2,y:140,r:b.r,
    title:b.title||'',quip:b.quip||'',
    hp,maxhp:hp,phaseHp,baseSpd:b.spd*(VICIOUS.on?VICIOUS.bossMove:1),
    color:b.color,spd:b.spd*(VICIOUS.on?VICIOUS.bossMove:1),pattern:b.pattern,
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
  const attackNow=totalAttackPower(player);
  const crowdRageFlat=crowdRageAttackFlat(player);
  let base=attackNow*(player.buffs.rage>0?2:1);
  if(window.DEBUG_COMBAT&&crowdRageFlat>0){
    console.debug('[combat] rage', {
      nearby:crowdRageNearbyCount(player),
      perEnemy:Number(player.crowdRageAtkFlat)||0,
      flat:crowdRageFlat,
      attack:attackNow,
      shotBase:base
    });
  }
  if(player.gamble) base*=rand(0.6,1.8);
  const speed=playerBulletSpeed(player);
  let baseShot=base;
  if(player.dodgeReloadT>0){ baseShot*=1.4; player.dodgeReloadT=0; }
  const n=player.shots+(player.shadowBarrageT>0?(player.shadowBarrageExtraShots||1):0), spread=n>1?0.16*Math.max(0,Number(player._spreadMul)||1):0;
  const primaryDirIndex=Math.floor((n-1)/2);
  const dirs=[];
  for(let i=0;i<n;i++) dirs.push(ang+(i-(n-1)/2)*spread);
  if(player.backShot) dirs.push(ang+Math.PI);
  const fire=()=>{
    const attackId='player:'+Date.now()+':'+(++playerAttackSeq);
    dirs.forEach((a,idx)=>{
    let dmg=baseShot, crit=false;
    pBullets.push({
      x:player.x+Math.cos(a)*16, y:player.y+Math.sin(a)*16,
      sx:player.x, sy:player.y,
      vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
      r:(crit?7.5:6)*player.bulletSize, dmg, life:1.1,
      bounce:player.bounce, pierce:player.pierce, hitSet:new Set(), crit, homing:player.homing,
      attackId, playerShot:true, extraProjectile:idx!==primaryDirIndex,
    });
  }); };
  fire();
  if(player.doubleTap>0 && Math.random()<player.doubleTap) fire();
  sfx.shoot();
}

function enemyBulletStyle(e){
  const s=((e&&e.type)||'')+'|'+((e&&(e.name||e.label))||'');
  if(/sniper|저격/.test(s)) return 'bolt';
  if(/gwangcheon|광천|namu|나무/.test(s)) return 'spore';
  if(/kkot|양갱/.test(s)) return 'jelly';
  if(/ketter|케터/.test(s)) return 'needle';
  if(/killjoy|킬조이/.test(s)) return 'glitch';
  if(/goblin|고블|대파/.test(s)) return 'orb';
  return 'shard';
}
function enemyShootAt(e,tx,ty,speed,size,bdmg){
  let a=Math.atan2(ty-e.y,tx-e.x);
  if(VICIOUS.on) a+=rand(-VICIOUS.jitter,VICIOUS.jitter);
  const dmg=bdmg!=null?bdmg:(e.dmg||9), r=size||7, st=enemyBulletStyle(e);
  eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,dmg,life:4,srcName:e.name||e.label,style:st,col:e.color});
  if(VICIOUS.on && Math.random()<VICIOUS.doubleShot){ const a2=a+rand(-0.28,0.28); eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*speed,vy:Math.sin(a2)*speed,r,dmg,life:4,srcName:e.name||e.label,style:st,col:e.color}); }
}

function playerMoveIntent(){
  let mx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
  let my=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
  if(typeof GL!=='undefined'&&GL.keyRev>0){ mx=-mx; my=-my; }
  const m=Math.hypot(mx,my);
  if(m<=0.001) return {x:0,y:0};
  return {x:mx/m,y:my/m};
}
function aimPlayerLeadAngle(from,leadSec){
  const mv=playerMoveIntent();
  const sp=(typeof playerMoveSpeed==='function'?playerMoveSpeed(player):(player&&player.spd)||0);
  const lead=clamp(Number(leadSec)||0,0,0.28);
  const tx=clamp(player.x+mv.x*sp*lead,player.r,W-player.r);
  const ty=clamp(player.y+mv.y*sp*lead,player.r,H-player.r);
  return Math.atan2(ty-from.y,tx-from.x);
}
function fireCleaver(e,ang,opts){
  if(sfx.enemyCast) sfx.enemyCast();
  opts=opts||{};
  const enr=e.hp<=e.maxhp*0.5;
  const a=aimPlayerLeadAngle(e,enr?0.24:0.18)+(opts.spread||0);
  const sp=enr?360:320;   // 식칼 속도 상향 → 반응 시간 단축
  eBullets.push({x:e.x+Math.cos(a)*e.r*0.8,y:e.y+Math.sin(a)*e.r*0.8,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:13,dmg:e.dmg,life:3.5,srcName:e.name||e.label,cleaver:true,spin:a,spinV:enr?8:5});
}
function fireBoomerang(e,ang,opts){
  if(sfx.enemyWarn) sfx.enemyWarn();
  opts=opts||{};
  const enr=!!opts.enraged;
  const sp=enr?320:288;
  // 사거리(부메랑 길이) 대폭 증가: 평상시에도 화면을 가로지르게 길게 뺀다
  const maxDist=enr?900:760;
  const outT=maxDist/sp+0.12;   // 회수 시작 전 나가는 시간 상한 (사거리 도달까지 보장)
  const life=outT*2.2+1.2;      // 왕복 + 여유
  const spread=opts.spread||0;  // 부채꼴 발사 시 중심각 오프셋
  const a=aimPlayerLeadAngle(e,enr?0.24:0.20)+spread;
  eBullets.push({x:e.x+Math.cos(a)*e.r*0.9,y:e.y+Math.sin(a)*e.r*0.9,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:13,dmg:e.dmg,life:life,srcName:e.name||e.label,boomerang:true,spin:a,spinV:enr?10:8,sx:e.x,sy:e.y,maxDist:maxDist,speed:sp,owner:e,age:0,trailT:0,outT:outT,curveReturn:enr?0.9:0});
}
function fireSniperLaser(beam){
  if(!beam||beam.fired) return;
  beam.fired=true;
  beam.blastT=0.2;
  const sx=beam.x, sy=beam.y, ang=beam.ang, range=beam.range||520, width=beam.width||13;
  const px=player.x-sx, py=player.y-sy;
  const along=px*Math.cos(ang)+py*Math.sin(ang);
  const side=Math.abs(-px*Math.sin(ang)+py*Math.cos(ang));
  if(along>0&&along<range&&side<width) hurtPlayer(beam.dmg||13,beam.srcName||"\uC800\uACA9\uB7EC");
  for(let i=0;i<7;i++) burst(sx+Math.cos(ang)*range*(i+1)/8,sy+Math.sin(ang)*range*(i+1)/8,beam.color||'#ff2a2a',2,160);
  burst(sx,sy,beam.color||'#ff2a2a',8,140);
  screenShake=Math.max(screenShake||0,5);
  if(sfx.enemyLaser) sfx.enemyLaser();
}
function spawnMoveLockField(x,y,srcName){
  hazards.push({kind:'movelock',x:clamp(x,44,W-44),y:clamp(y,95,H-55),r:52,t:0,warnT:0.85,liveT:0.34,lockT:0.8,done:false,srcName:srcName||"\uBC29\uD50C\uB7EC",seed:rand(0,TAU)});
}
// ---------- 파티클 ----------
function burst(x,y,color,n,spd){
  for(let i=0;i<(n||8);i++){
    const a=rand(0,TAU), s=rand(40,(spd||180));
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.6),max:.6,color,r:rand(2,4)});
  }
  // 상한 트림은 프레임당 1회(cleanupCombatArrays)에서 처리 — 타격당 splice 비용 제거
}
const dashFx=[];
function spawnDashFx(kind,x,y,dx,dy){
  const max=kind==='trail'?0.2:(kind==='end'?0.24:0.28);
  dashFx.push({kind,x,y,dx:dx||0,dy:dy||-1,t:0,max,seed:rand(0,TAU)});
  if(dashFx.length>42) dashFx.splice(0,dashFx.length-42);
}
function updateDashFx(dt){
  for(let i=dashFx.length-1;i>=0;i--){
    const fx=dashFx[i];
    fx.t+=dt;
    if(fx.t>=fx.max) dashFx.splice(i,1);
  }
}
function drawDashFx(){
  if(!dashFx.length) return;
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  for(const fx of dashFx){
    const k=clamp(fx.t/fx.max,0,1);
    const fade=1-k;
    const sc=DASH_FX_SCALE;
    const a=Math.atan2(fx.dy,fx.dx);
    ctx.save();
    ctx.translate(fx.x,fx.y);
    ctx.rotate(a);
    if(fx.kind==='trail'){
      ctx.globalAlpha=0.44*fade;
      ctx.shadowColor='#8be8ff';
      ctx.shadowBlur=18;
      ctx.fillStyle='#38e8ff';
      ctx.beginPath();
      ctx.ellipse(-18*sc*fade,0,30*sc*fade,8*sc*fade,0,0,TAU);
      ctx.fill();
      ctx.globalAlpha=0.8*fade;
      ctx.strokeStyle='#eafaff';
      ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.moveTo(-42*sc*fade,0);
      ctx.lineTo(-8*sc*fade,0);
      ctx.stroke();
    } else {
      const endMul=fx.kind==='end'?0.72:1;
      const r=(18+32*k)*sc*endMul;
      ctx.globalAlpha=0.28*fade;
      ctx.fillStyle=fx.kind==='end'?'#eafaff':'#38e8ff';
      ctx.shadowColor='#8be8ff';
      ctx.shadowBlur=24;
      ctx.beginPath();
      ctx.arc(0,0,r*0.72,0,TAU);
      ctx.fill();
      ctx.globalAlpha=0.95*fade;
      ctx.strokeStyle='#eafaff';
      ctx.lineWidth=(5-2*k)*endMul;
      ctx.beginPath();
      ctx.arc(0,0,r,0,TAU);
      ctx.stroke();
      ctx.globalAlpha=0.65*fade;
      ctx.strokeStyle='#38e8ff';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(0,0,r*1.32,0,TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
function floatGold(x,y,amt){
  pickups.push({x,y,type:'gold',amt,r:8,vx:rand(-40,40),vy:rand(-90,-40),life:14,bob:rand(0,TAU)});
  trimArrayHead(pickups,PERF_LIMITS.pickups);
}
function floatHeart(x,y,amt){
  particles.push({x,y,vx:rand(-10,10),vy:rand(-44,-30),life:0.8,max:0.8,color:'#5dff9b',r:4,heart:true,amt});
  trimArrayHead(particles,PERF_LIMITS.particles);
}

// ---------- 데미지 ----------
function failGladiatorCombat(src){
  combatChallenge=null;
  combatSpecialReward=null;
  roomCleared=true;
  enemies.length=0; pBullets.length=0; eBullets.length=0; pickups.length=0;
  boss=null; roomIsBoss=false; roomIsMidboss=false;
  player.hp=Math.max(1,Math.round(player.maxhp*0.25));
  player.iframes=1.5;
  banner('검투장 패배','체력만 남기고 탈출했다',1800);
  updateHUD();
  setTimeout(()=>{ hideAll(); finishNode(); syncChrome(); },650);
}
function hurtPlayer(dmg, src){
  if(act3FinalClearActive&&act3FinalClearActive()) return;
  if(player.iframes>0||player.dodging>0||player.buffs.shield>0) return;
  if(player.hitShield>0){ player.hitShield--; player.iframes=0.6; burst(player.x,player.y,'#8be8ff',16,200); return; }
  if(player.perfectDodgeArmed){ player.perfectDodgeArmed=false; player.perfectDodgeCheckT=0; }
  if(src) lastKiller=src; if((roomIsBoss||roomIsMidboss)&&act>=2){ dmg*=(act>=3?1.6:1.3); }  // 보스방 막별 데미지 가중(2막 x1.3 / 3막 x1.6)
  const dmgCalc=calculatePlayerIncomingDamage(dmg,{source:src});
  if(window.DEBUG_COMBAT){
    console.debug('[combat] incomingDamage', {
      source:src||'unknown',
      base:dmgCalc.base,
      difficulty:dmgCalc.difficulty,
      armor:dmgCalc.armor,
      armorMul:dmgCalc.armorMul,
      takenMul:dmgCalc.takenMul,
      final:dmgCalc.final
    });
  }
  dmg=dmgCalc.final;
  if(player.overhealShield>0){
    const block=Math.min(player.overhealShield,dmg);
    player.overhealShield-=block;
    dmg-=block;
    burst(player.x,player.y,'#8be8ff',10,160);
    if(dmg<=0){ player.iframes=0.25; updateHUD(); return; }
  }
  if(player.deathWard>0 && player.hp-dmg<=0){
    player.deathWard--;
    player.hp=1;
    unlockAchievement('one_hp_survive');
    player.iframes=1.3;
    hitFlash=0.25;
    screenShake=Math.max(screenShake,10);
    banner('불사 발동','체력 1로 생존',1400);
    burst(player.x,player.y,'#ffd34d',24,240);
    updateHUD();
    return;
  }
  player.hp-=dmg; player.iframes=0.5; hitFlash=0.25; screenShake=Math.max(screenShake,8); combatTookHit=true; runHits++;
  if(player.hp<=1) unlockAchievement('one_hp_survive');
  if(player.thorns>0){ enemies.slice().forEach(o=>{ if(dist2(o.x,o.y,player.x,player.y)<THORNS_DAMAGE_RADIUS*THORNS_DAMAGE_RADIUS){ o.hp-=player.thorns; o.hitT=0.1; if(o.hp<=0) handleEnemyDefeat(o); } }); }
  sfx.hurt();
  if(Math.random()<0.5) chatRandom(pick(["아야 Sadge","왜맞음 KEKW","집중!","체력 ㄷㄷ","구르기!!","발컨 ㅋㅋㅋ"]));
  if(player.hp<=0){
    if(combatChallenge==='gladiator'){ failGladiatorCombat(src||lastKiller); }
    else if(player.reviveOnce && !player.usedRevive){ player.usedRevive=true; player.hp=Math.round(player.maxhp*0.35); player.iframes=1.3; banner('부활!','수호천사가 너를 구했다',1700); burst(player.x,player.y,'#5dff9b',26,260); }
    else if(player.lastStand && !player.usedLastStand){ player.usedLastStand=true; player.hp=1; unlockAchievement('one_hp_survive'); player.iframes=1.3; banner('막판 정신력!','체력 1로 버텼다',1500); burst(player.x,player.y,'#ffd34d',20,220); }
    else { player.hp=0; gameOver(false, src||lastKiller); }
  }
  updateHUD();
}
function isBossLike(e){ return e.midboss||e.eliteViewer||e.type==='hyechul'; }
function hasBossStunImmunity(e){ return !!e&&(e===boss||e.boss||e.isBoss||e.midboss||e.type==='hyechul'); }
function applyShockStun(target){
  if(player.stunChance<=0 || !target) return;
  const bossGrade=hasBossStunImmunity(target);
  if(bossGrade&&(target.stunImmuneT||0)>0) return;
  let chance=player.stunChance, stunTime=0.6;
  if(target===boss || target.isBoss){
    chance*=0.25;
    stunTime*=0.2;
  }else if(target.elite || isBossLike(target)){
    chance*=0.5;
    stunTime*=0.6;
  }
  if(Math.random()<chance){
    target.stunT=Math.max(target.stunT||0,stunTime);
    if(bossGrade) target.stunImmuneT=BOSS_STUN_IMMUNITY_T;
  }
}
function targetHasStatus(e){
  return (e.burnT>0)||(e.chillT>0)||(e.psT>0)||(e.stunT>0);
}
function statusDotDamageMul(){
  return Math.max(0,1+(Number(player&&player.statusDotDmgMul)||0));
}
function poisonDotDamageMul(){
  return Math.max(0,1+(Number(player&&player.poisonDotDmgMul)||0));
}
function statusMoveMul(e){
  return (e&&e.chillT>0)?0.5:1;
}
function applyBulletStatuses(e){
  if(player.burn>0){ e.burnT=3; e.burnDmg=player.burn; }
  if(player.chill>0){ e.chillT=2.5; }
  if(player.poison>0){ e.psStacks=Math.min((e.psStacks||0)+1,6); e.psT=4; e.psDmg=player.poison; }
}
function updateBossStatuses(b,dt){
  if(!b) return false;
  if((b.stunImmuneT=(b.stunImmuneT||0))>0) b.stunImmuneT=Math.max(0,b.stunImmuneT-dt);
  if((b.chillT=(b.chillT||0))>0) b.chillT-=dt;
  if((b.burnT=(b.burnT||0))>0){
    b.burnT-=dt;
    const burnDps=(b.burnDmg||0)*statusDotDamageMul();
    b.hp-=burnDps*dt;
    b.hitT=Math.max(b.hitT||0,0.04);
    b._burnPopT=(b._burnPopT||0)-dt;
    if(b._burnPopT<=0){
      b._burnPopT=0.35;
      if(GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(b.x,b.y-b.r-4,Math.max(1,Math.round(burnDps*0.35)),false,'burn');
    }
    if(b.hp<=0) return handleBossDefeat(b);
  } else {
    b._burnPopT=0;
  }
  if((b.psT=(b.psT||0))>0){
    b.psT-=dt;
    const poisonDps=(b.psStacks||0)*(b.psDmg||0)*statusDotDamageMul()*poisonDotDamageMul();
    b.hp-=poisonDps*dt;
    b.hitT=Math.max(b.hitT||0,0.04);
    b._psPopT=(b._psPopT||0)-dt;
    if(b._psPopT<=0){
      b._psPopT=0.35;
      if(GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(b.x,b.y-b.r-4,Math.max(1,Math.round(poisonDps*0.35)),false,'poison');
    }
    if(b.hp<=0) return handleBossDefeat(b);
  } else {
    b.psStacks=0;
    b._psPopT=0;
  }
  if((b.stunT=(b.stunT||0))>0) b.stunT-=dt;
  return false;
}
function handleBossDefeat(b){
  if(b&&b.key==='set3'&&((b.setPhase||1)<3)){
    set3NextPhase(b);
    return true;
  }
  if(b&&b.key==='seungwoo'&&((b.gphase||1)<3)){
    seungwooNextPhase(b);
    return true;
  }
  if(b&&b.key==='set3'&&act>=MAX_ACT){
    killBoss();
    startAct3FinalClear(b);
    return true;
  }
  killBoss();
  return true;
}
function projectileHitScale(target,bullet){
  if(!target||!bullet||!bullet.attackId) return 1;
  const now=performance.now();
  const key=bullet.attackId;
  const hits=target._projectileGroupHits||(target._projectileGroupHits={});
  Object.keys(hits).forEach(k=>{ if(now-(hits[k].t||0)>1200) delete hits[k]; });
  const rec=hits[key]||(hits[key]={count:0,t:now});
  if(now-rec.t>1200){ rec.count=0; }
  rec.t=now;
  rec.count++;
  const scales=player.barrageFocus?[1,0.45,0.30,0.15]:[1,0.35,0.20,0.10];
  return scales[Math.min(rec.count-1,scales.length-1)];
}
function projectileCloseMul(target,bullet,bossTarget){
  if(!target||!bullet||!player.closeProjectileDmgMul) return 1;
  const sx=bullet.sx==null?player.x:bullet.sx;
  const sy=bullet.sy==null?player.y:bullet.sy;
  const close=dist2(sx,sy,target.x,target.y)<=240*240;
  if(!close) return 1;
  const bonus=player.closeProjectileDmgMul*(bossTarget?0.5:1);
  return 1+bonus;
}
function executeInstinctMul(target,bossTarget){
  const bonus=Number(player&&player.executeInstinctDmgMul)||0;
  if(!bonus||!target||!(target.maxhp>0)) return 1;
  if((target.hp||0)/target.maxhp>0.25) return 1;
  return 1+bonus*(bossTarget?0.5:1);
}
function rollPlayerBulletDamage(target,bullet){
  let dmg=bullet.dmg||0;
  const crit=Math.random()<effectiveCritChance(target,bullet);
  if(crit){
    dmg*=effectiveCritMult();
    triggerCritEffects(target);
  }else{
    dmg*=player.nonCritDmgMul||1;
  }
  bullet.crit=crit;
  return {dmg,crit};
}
function damageBoss(b,dmg,crit,fromBullet,bullet){
  if(act3FinalClearActive()) return;
  if(fromBullet) dmg*=projectileHitScale(b,bullet);
  if(fromBullet) dmg*=projectileCloseMul(b,bullet,true);
  if(player.statusDmgMul>0 && targetHasStatus(b)) dmg*=(1+player.statusDmgMul);
  dmg*=executeInstinctMul(b,true);
  const bossBonus=statBonusFromMul(player.bossDmgMul)*(bullet&&bullet.minionShot?0.5:1);
  const dealt=dmg*statMulFromBonus(bossBonus,0.1)*(1-(b.armor||0));
  b.hp-=dealt; b.hitT=0.08; burst(b.x,b.y,crit?'#ffd34d':'#fff',crit?8:5,crit?180:140); sfx.hit();
  applyShockStun(b);
  if(fromBullet) applyBulletStatuses(b);
  if(b.hp<=0) handleBossDefeat(b);
}
function damageEnemy(e,dmg,crit,fromBullet,bullet){
  if(e.intentInvuln>0){ burst(e.x,e.y,'#bff8ff',3,90); return; }
  if(e.ai==='submerge_charge'&&e.submerged) dmg*=0.25;
  if(e.ai==='stealth_assassin'&&(e.stealthT||0)>0) dmg*=0.5;
  if(fromBullet) dmg*=projectileHitScale(e,bullet);
  if(fromBullet) dmg*=projectileCloseMul(e,bullet,false);
  if(e.defenseT>0) dmg*=0.2;
  if(player.statusDmgMul>0 && targetHasStatus(e)) dmg*=(1+player.statusDmgMul); // 점화
  dmg*=executeInstinctMul(e,false);
  e.hp-=dmg*(1-(e.armor||0)); e.hitT=0.1; burst(e.x,e.y,crit?'#ffd34d':e.color,crit?8:4,crit?180:120); sfx.hit();
  if(typeof GS!=='undefined'&&GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(e.x,e.y-(e.r||10),Math.round(dmg*(1-(e.armor||0))),crit);
  if(crit && player.critHeal>0){ healPlayerNoDrop(player.critHeal,player.x,player.y-player.r-18); } // 치명 흡혈
  if(e.eliteViewer && eliteKindOf(e)==='yanggaeng' && !e.tauntedHalf && e.hp<=e.maxhp*0.5){ e.tauntedHalf=true; e.taunt={t:4.6,text:'…달콤한 척은 여기까지야.'}; if(typeof sfx!=='undefined'&&sfx.vote) sfx.vote(); }
  else if(e.eliteViewer && !e.tauntedHalf && e.hp<=e.maxhp*0.5){ e.tauntedHalf=true; e.taunt={t:4.6,text:'…봉식님? 저 때리시나요?'}; if(typeof sfx!=='undefined'&&sfx.vote) sfx.vote(); }
  applyShockStun(e);
  // 나무: 피격 시 주변 몹 방어력 버프 (3초간 최대 3회 중첩)
  if(e.type==='namu' && e.hp>0){
    const now=performance.now(); if(!(e._namuBuffT>0)||now-(e._namuBuffLast||0)>1000){
      e._namuBuffLast=now; e._namuBuffT=3.0;
      enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<62500){ o.armor=Math.min((o.armor||0)+0.12,0.5); o._armorBuff=3.0; burst(o.x,o.y,'#5fa84a',6,120); } });
      burst(e.x,e.y,'#5fa84a',12,160); if(typeof beep==='function')beep(90,0.1,'sine',0.05);
    }
  }
  if(fromBullet){
    applyBulletStatuses(e);
    if(player.bulletExplode>0){ for(let k=enemies.length-1;k>=0;k--){ const o=enemies[k]; if(!o||o===e) continue; if(dist2(o.x,o.y,e.x,e.y)<8100) applyEnemyDirectDamage(o,player.bulletExplode,'#ff9b4d',{silent:true}); } burst(e.x,e.y,'#ff9b4d',8,150); }
    if(player.chainLightning>0){ let cnt=0; for(let k=enemies.length-1;k>=0&&cnt<player.chainLightning;k--){ const o=enemies[k]; if(!o||o===e) continue; if(dist2(o.x,o.y,e.x,e.y)<14400){ applyEnemyDirectDamage(o,dmg*0.5,'#7ad7ff',{silent:true}); cnt++; } } if(cnt>0) burst(e.x,e.y,'#7ad7ff',6,160); }
    if(crit && player.critExplodeMul>0){ const boom=relicAttackPower(player.critExplodeMul); for(let k=enemies.length-1;k>=0;k--){ const o=enemies[k]; if(!o||o===e) continue; if(dist2(o.x,o.y,e.x,e.y)<6400) applyEnemyDirectDamage(o,boom,'#ffb347',{silent:true}); } burst(e.x,e.y,'#ffb347',12,210); }
  }
  // 처형: 남은 체력이 임계값 이하면 즉사 (보스류 제외). 이미 hp<=0이면 아래서 처리
  if(e.hp>0 && player.execThreshold>0 && !isBossLike(e) && e.hp<=e.maxhp*player.execThreshold){
    e.hp=0;
    if(player.execBlast>0){ burst(e.x,e.y,'#ff5a5a',16,260); enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<6400){ o.hp-=player.execBlast; o.hitT=0.1; } }); }
  }
  // 사망 판정: 한 번만 호출되도록 통합
  if(e.hp<=0) handleEnemyDefeat(e);
}

function hyechulSummonPlan(ph){
  return ph>=3?{type:'ultra',count:4,hatch:8.0,next:12}:ph>=2?{type:'mutalisk',count:4,hatch:8.8,next:13}:{type:'zergling',count:3,hatch:10,next:15};
}
function pickHyechulPattern(e,ph){
  const pool=ph>=3?['eggDrop','fan','rain','slowField','eggBomb','mixed']:ph>=2?['eggDrop','fan','rain','slowField','eggBomb']:['eggDrop','fan','rain','slowField'];
  let choices=pool.filter(x=>x!==e._lastPattern);
  if(!choices.length) choices=pool;
  const pat=pick(choices);
  e._lastPattern=pat;
  return pat;
}
function hyechulFan(e,ph){
  const pa=Math.atan2(player.y-e.y,player.x-e.x);
  const n=ph>=3?7:(ph>=2?5:5), spread=ph>=3?0.17:(ph>=2?0.22:0.18), sp=ph>=3?260:(ph>=2?250:235), dmg=ph>=3?17:(ph>=2?15:13);
  for(let i=-(n-1)/2;i<=(n-1)/2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*spread)*sp,vy:Math.sin(pa+i*spread)*sp,r:ph>=3?9:8,dmg,life:ph>=2?3.4:3,spore:true,home:ph>=3?1.2:0});
  banner('산성 부채꼴','피해라!',650);
}
function hyechulRain(e,ph){
  const rainN=ph>=3?28+irand(0,8):(ph>=2?22+irand(0,6):16+irand(0,5));
  for(let i=0;i<rainN;i++){ const fx=rand(15,W-15); eBullets.push({x:fx,y:-12,vx:rand(ph>=3?-24:-18,ph>=3?24:18),vy:rand(175,ph>=3?238:220),r:ph>=3?9:8,dmg:ph>=3?15:(ph>=2?13:11),life:4.5,spore:true}); }
  banner('산성비','위에서 떨어진다!',800);
}
function hyechulSlowFieldPattern(e,ph){
  spawnSlowField(player.x,player.y,ph>=3?104:(ph>=2?98:96),7);
  spawnSlowField(rand(120,W-120),rand(180,H-120),ph>=3?90:(ph>=2?84:80),7);
  hyechulCreepBloom(e,ph>=2?3:2);
  banner('점막 확산','이동이 느려진다',800);
}
function hyechulEggDropPattern(e,ph){
  const plan=hyechulSummonPlan(ph);
  hyechulSpawnEgg(e,plan.type,plan.count,plan.hatch);
}
function hyechulMixedPattern(e,ph){
  hyechulEggDropPattern(e,ph);
  if(Math.random()<0.5) hyechulFan(e,ph);
  else hyechulSlowFieldPattern(e,ph);
}
function hyechulRing(e,ph){
  const k=ph>=3?20:(ph>=2?16:14), sp=ph>=3?230:(ph>=2?215:200), dmg=ph>=3?17:(ph>=2?15:13);
  const off=(e.ringN=(e.ringN||0)+1)*0.4;   // 회전하는 전방위 탄막
  for(let i=0;i<k;i++){ const a2=i/k*TAU+off; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:8,dmg,life:4,spore:true}); }
  banner('산성 폭발','전방위 탄막!',600);
}
function hyechulAcidSwamp(e,ph){
  // [2페+] 산성 늪: 바닥 여러 곳에 산성 분출 (경고 후 폭발)
  const n=ph>=3?4:3;
  for(let i=0;i<n;i++){
    const sx=(i===0)?clamp(player.x,60,W-60):rand(70,W-70);
    const sy=(i===0)?clamp(player.y,150,H-80):rand(180,H-90);
    warnAoE(sx,sy,rand(78,92),0.7,0.5,ph>=3?16:14,e.name||e.label,'#7ed957');
  }
  banner('🟢 산성 늪','바닥이 끓는다!',750); if(typeof beep==='function')beep(90,0.18,'sawtooth',0.05);
}
function hyechulHomingSpore(e,ph){
  // [2페+] 유도 포자: 플레이어를 쫓는 유도탄 다발
  const pa=Math.atan2(player.y-e.y,player.x-e.x);
  const n=ph>=3?6:5;
  for(let i=-(n-1)/2;i<=(n-1)/2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.3)*180,vy:Math.sin(pa+i*0.3)*180,r:8,dmg:ph>=3?14:13,life:4.2,spore:true,home:ph>=3?1.6:1.2});
  banner('🌀 유도 포자','쫓아온다!',700); if(typeof beep==='function')beep(200,0.1,'triangle',0.05);
}
function hyechulAcidStorm(e,ph){
  // [3페] 산성 폭풍: 안전 통로 1칸 남기고 산성비 일제 낙하 (느림 → 빈 틈으로 회피)
  const cols=ph>=3?9:7, gap=irand(0,cols-1);
  for(let c=0;c<cols;c++){
    if(c===gap) continue;   // 빈 틈(안전 통로)
    const cx=(c+0.5)/cols*W;
    const per=ph>=3?3:2;
    for(let j=0;j<per;j++) eBullets.push({x:cx+rand(-13,13),y:-12-j*48,vx:rand(-7,7),vy:rand(150,185),r:8,dmg:ph>=3?14:12,life:5,spore:true});
  }
  banner('🌪 산성 폭풍','빈 틈으로 피하라!',900); if(typeof beep==='function')beep(110,0.25,'sawtooth',0.06); screenShake=Math.max(screenShake||0,5);
}
function pickHyechulFocusPattern(e,ph){
  const pool=ph>=3?['fan','rain','ring','acidSwamp','acidSwamp','homingSpore','homingSpore','acidStorm','acidStorm']
            :ph>=2?['fan','rain','ring','acidSwamp','acidSwamp','homingSpore','homingSpore']
            :['fan','rain','ring'];
  let choices=pool.filter(x=>x!==e._lastFocus);
  if(!choices.length) choices=pool;
  const pat=pick(choices); e._lastFocus=pat; return pat;
}
function runHyechulPatternFocus(e,ph,pat){
  if(pat==='rain') hyechulRain(e,ph);
  else if(pat==='ring') hyechulRing(e,ph);
  else if(pat==='acidSwamp') hyechulAcidSwamp(e,ph);
  else if(pat==='homingSpore') hyechulHomingSpore(e,ph);
  else if(pat==='acidStorm') hyechulAcidStorm(e,ph);
  else hyechulFan(e,ph);
  beep(120,0.1,'sawtooth',0.05);
}
function runHyechulPattern(e,ph){
  const pat=pickHyechulPattern(e,ph);
  if(pat==='eggDrop') hyechulEggDropPattern(e,ph);
  else if(pat==='fan') hyechulFan(e,ph);
  else if(pat==='rain') hyechulRain(e,ph);
  else if(pat==='slowField') hyechulSlowFieldPattern(e,ph);
  else if(pat==='eggBomb') hyechulEggBomb(e);
  else hyechulMixedPattern(e,ph);
  beep(120,0.1,'sawtooth',0.05);
}

function hyechulNextPhase(e){
  e.phase=(e.phase||1)+1;
  e.hp=e.maxhp; e.hitT=0.2; e.stunT=0;
  e.summonT=3.5; e.atkT=1.4; e.atkN=0; e.climaxT=0;
  const ph=e.phase, col=ph===2?'#c46bff':'#ff6a3a';
  screenShake=Math.max(screenShake||0,18);
  burst(e.x,e.y,col,34,440); burst(e.x,e.y,'#ffffff',12,280);
  if(typeof sfx!=='undefined' && sfx.boss) sfx.boss();
  beep(ph===2?180:90,0.5,'sawtooth',0.07); beep(ph===2?95:60,0.6,'sine',0.06);
  const line=ph===2?'\uAEBC\uC9C8\uC774 \uAC08\uB77C\uC9C4\uB2E4...':'\uBC14\uB2E5 \uC544\uB798\uC5D0\uC11C \uB465\uC9C0\uAC00 \uC5F4\uB9B0\uB2E4';
  const name=ph===2?'\uB808\uC5B4 \uBCC0\uC774':'\uD558\uC774\uBE0C \uAC1C\uBC29';
  bossEvolve={ phase:ph, t:0, line, name, col, e };
  cutsceneT=2.9;
  for(let i=0;i<28;i++){ setTimeout(()=>{ if(enemies.includes(e)) burst(e.x+rand(-e.r*1.4,e.r*1.4),e.y+rand(-e.r*1.1,e.r*1.1),pick(['#ffffff',col,'#ffae42']),3,320); }, i*28); }
}
function kkotNextPhase(e){
  e.phase=(e.phase||1)+1;
  e.hp=e.maxhp; e.hitT=0.2; e.stunT=0;
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
  if(ph===3) e.r=Math.min(e.r+4,50);
  e.spd*=1.12;
}
// 보스가 소환하는 적 — 무한 소환되므로 경험치를 주지 않음(무한 레벨업 방지)
const SUMMON_TYPES=new Set(['earthworm','zergling','mutalisk','ultra','zerg_egg','act3_sand_soldier']);
function resetStallWatch(){
  stallTimer=0; stallWarned=false; stallRegenWarned=false; stallRaged=false; stallReinforced=false;
}
function stallTargetEnemies(){
  if(!enemies||!enemies.length) return [];
  return enemies.filter(e=>e&&!e.dummy&&!e._stallReinforcement&&!e.noKillScore&&!e.summoned&&!e.clone&&!e.splitChild&&!SUMMON_TYPES.has(e.type));
}
function shouldTrackStall(){
  if(state!=='play'||roomCleared||roomIsBoss||roomIsMidboss||roomHadElite||boss||bossBanner>0) return false;
  const n=stallTargetEnemies().length;
  return n>0&&n<=STALL_REAL_ENEMY_LIMIT;
}
function isStallRegenSuppressed(){
  return shouldTrackStall()&&stallTimer>=STALL_REGEN_T;
}
function markStallKill(){
  resetStallWatch();
}
function applyStallRage(){
  enemies.forEach(e=>{
    if(!e||e.dummy||e.midboss||e.eliteViewer||e.noKillScore||e.summoned||e.clone||e.splitChild||SUMMON_TYPES.has(e.type)||e._stallRaged) return;
    e._stallRaged=true;
    e.spd*=2;
    if(e._spd0!=null) e._spd0*=2;
    if(e.cool) e.cool=Math.max(0.25,e.cool*0.3);
    e.dmg=Math.max(1,Math.round((e.dmg||1)*2));
    if(e.touchDmg!=null) e.touchDmg=Math.max(1,Math.round(e.touchDmg*2));
    if(e.bodyDmg!=null) e.bodyDmg=Math.max(1,Math.round(e.bodyDmg*2));
    if(e.contactDmg!=null) e.contactDmg=Math.max(1,Math.round(e.contactDmg*2));
  });
}
function spawnStallReinforcements(){
  if(roomIsBoss||roomIsMidboss||boss) return;
  const P=ACT_POOLS[Math.min(act-1,ACT_POOLS.length-1)];
    const roomSpawnCounts=enemyTypeCounts(enemies);
  const normalPool=normalEnemyPoolFor(act,currentRow);
  const diff=1+(act-1)*0.6+currentRow*0.08;
  const n=act>=2?3:2;
  for(let i=0;i<n;i++){
    spawnRandomEnemy(pickNormalEnemyForRoom(act,currentRow,roomSpawnCounts), diff, 80, H-180);
    const e=enemies[enemies.length-1];
    e._stallReinforcement=true;
    e.label='난입 시청자';
    e.xp=0;
    e._stallRaged=false;
  }
  applyStallRage();
  banner('시청자 난입','존버하면 더 몰려온다',1500);
}
function updateStallWatch(dt){
  if(!shouldTrackStall()){ resetStallWatch(); return; }
  stallTimer+=dt;
  if(!stallWarned&&stallTimer>=STALL_WARN_T){ stallWarned=true; banner('시청자 이탈','빨리 마무리해!',1300); }
  if(!stallRegenWarned&&stallTimer>=STALL_REGEN_T){ stallRegenWarned=true; banner('시청자 이탈','재생 효율 -95%',1300); }
  if(!stallRaged&&stallTimer>=STALL_RAGE_T){ stallRaged=true; applyStallRage(); banner('남은 적 광폭화','재생 존버 견제',1400); }
  if(!stallReinforced&&stallTimer>=STALL_REINFORCE_T){ stallReinforced=true; spawnStallReinforcements(); }
}
function eliteKindOf(e){
  if(e&&(e.eliteKind==='yanggaeng'||e.type==='kkotchung')) return 'yanggaeng';
  if(e&&(e.eliteKind==='jajalja'||e.type==='rhino_beetle')) return 'jajalja';
  return roomEliteKind||'jajalja';
}
function currentEliteKind(){
  return roomEliteKind||eliteKindOf(eliteIntro&&eliteIntro.ze);
}
function eliteDisplayName(kind){
  if(kind==='yanggaeng') return '??';
  if(kind==='act3_truck') return '???';
  return '???';
}
function eliteClearText(kind){
  if(kind==='yanggaeng') return '?? ??!';
  if(kind==='act3_truck') return '??? ??!';
  return '??? ??!';
}
function eliteRewardTitle(kind){
  if(kind==='yanggaeng') return '?? ?? ??';
  if(kind==='act3_truck') return '?? ??? ??';
  return '?? ??? ??';
}
function eliteDefeatBubble(kind){
  return kind==='yanggaeng'
    ? pick(['말랑한 척했는데…','달콤하게 봐주려 했는데…','꽃이라고 얕봤지…','다음엔 더 끈적하게 올게요','흑임자 맛은 아직이야…'])
    : pick(['로블록스 하러 가야겠다…','봉식님… 너무하시네요 Sadge','다음 생엔 더 셀게요…','채금 풀리면 또 봬요','이게 맞나요…? 운영자 호출']);
}
function killEnemy(e){
  const idx=enemies.indexOf(e); if(idx<0) return;
  const isSummon=SUMMON_TYPES.has(e.type)||e._stallReinforcement||e.noReward||e.noKillScore||e.summoned||e.clone||e.splitChild;
  const countsForKillScore=!isSummon;
  enemies.splice(idx,1);
  if(e.type==='hyechul'){ enemies=enemies.filter(o=>!SUMMON_TYPES.has(o.type)); }
  if(e.dummy){ burst(e.x,e.y,e.color,10,180); return; }
  if(e._stallRaged) unlockAchievement('berserk_kill');
  if(e._stallReinforcement) unlockAchievement('lonely_intruder');
  if(e.type==='slime_green') spawnSlimeSplit(e);
  markDiscovered('enemies', e.type);
  burst(e.x,e.y,e.color,14,220);
  if(!isSummon && (player.statusSpread||player.corrosiveSpread) && !(player.corrosiveSpread&&e._corrosiveSpreaded)){ // 확산 / 부식 확산
    const hadBurn=e.burnT>0, hadChill=e.chillT>0, hadPois=e.psT>0;
    if(hadBurn||hadChill||hadPois){
      const corrosive=!!player.corrosiveSpread;
      const range=corrosive?170:120;
      const dotMul=corrosive?1.2:1;
      enemies.forEach(o=>{ if(dist2(o.x,o.y,e.x,e.y)<range*range){
        if(hadBurn){ o.burnT=corrosive?4:3; o.burnDmg=Math.max(o.burnDmg||0,(e.burnDmg||player.burn||4)*dotMul); }
        if(hadChill){ o.chillT=corrosive?3.2:2.5; }
        if(hadPois){ o.psStacks=Math.min((o.psStacks||0)+(corrosive?2:1),6); o.psT=corrosive?4.5:4; o.psDmg=Math.max(o.psDmg||0,(e.psDmg||player.poison||3)*dotMul); }
        if(corrosive) o._corrosiveSpreaded=true;
      }});
      burst(e.x,e.y,corrosive?'#5dff9b':'#9b6bff',corrosive?16:12,corrosive?230:180);
    }
  }
  if(e.eliteViewer && eliteKindOf(e)==='yanggaeng'){
    banner('양갱 처치!','',1100);
    spawnDeathBubble(e.x, e.y-e.r-12, eliteDefeatBubble('yanggaeng'), 3.4);
    e.eliteViewer=false;
  }
  if(e.eliteViewer){ banner('자잘자 처치!','',1100); spawnDeathBubble(e.x, e.y-e.r-12, pick(['로블록스 하러 가야겠다…','봉식님… 너무하시네요 Sadge','다음 생엔 더 셀게요…','채금 풀리면 또 봬요','이게 맞나요…? 운영자 호출']), 3.4); }
  if(!isSummon){
    if(countsForKillScore){
      markStallKill();
      kills++; totalKills++;
      userProgress.stats.totalKills=(Number(userProgress.stats.totalKills)||0)+1;
      unlockAchievement('first_kill');
      checkKillAchievements();
      saveUserProgress();
    }
    gainXP(e.xp);
    if(player.lifesteal>0 && Math.random()<player.lifesteal){ healPlayerNoDrop(5,player.x,player.y-player.r-18); }
    if(player.healOnKill>0){ healPlayer(player.healOnKill,e.x,e.y); }
    if(player.donateChance>0 && Math.random()<player.donateChance){ const dg=irand(24,58); addGold(dg,'other'); banner('💸 도네 알림!','+'+dg+' G',900); burst(e.x,e.y,'#ffd34d',18,240); }
  }
  // 골드: 처치 즉시 획득 (소환몹은 무한 스폰이라 미지급)
  if(countsForKillScore){
    const baseGold=monsterKillBaseGold(e);
    const eliteBonus=e.elite?irand(10,18):0;
    const goldMul=statMulFromBonus(statBonusFromMul(player.goldMul),0);
    const coin=Math.round((baseGold+eliteBonus)*goldMul);
    debugLastGoldDrop={act:Math.max(1,Number(act)||1),enemy:e.type||'',base:baseGold,eliteBonus,goldMul,final:coin,elite:!!e.elite};
    window.debugLastGoldDrop=debugLastGoldDrop;
    addGold(coin,'kill'); sfx.coin(); burst(e.x,e.y,'#ffd34d',5,120);
  }
  if(!isSummon && player.explodeKill>0){ burst(e.x,e.y,'#ff9b4d',12,200); enemies.slice().forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<4900){ applyEnemyDirectDamage(o,player.explodeKill,'#ff9b4d',{silent:true}); } }); }
  if(!isSummon && player.chainKillLightning>0 && enemies.length && !e._chainKillSource){
    let near=null, best=Infinity;
    enemies.forEach(o=>{ const d=dist2(e.x,e.y,o.x,o.y); if(d<best){ best=d; near=o; } });
    if(near){ burst(e.x,e.y,'#7ad7ff',8,180); applyEnemyDirectDamage(near,relicAttackPower(player.chainKillLightning),'#7ad7ff',{chainKill:true}); }
  }
  if(!isSummon && player.killBurstChance>0 && Math.random()<player.killBurstChance && performance.now()>(player.killBurstCd||0)){
    player.killBurstCd=performance.now()+150;
    burst(e.x,e.y,'#ff5d9b',16,240);
    enemies.forEach(o=>{ if(o!==e && dist2(o.x,o.y,e.x,e.y)<6400){ o.hp-=player.killBurstDmg||18; o.hitT=0.1; } });
  }
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
  xp+=n*statMulFromBonus(statBonusFromMul(player.xpMul),0)*(Number(combatXpMul)||1);
  while(xp>=xpNext){
    xp-=xpNext; level++; xpNext=Math.round(xpNext*1.35+8);
    player.maxhp+=5;                               // 최대체력 소폭 증가
    enforceFixedMaxHp(player);
    player.dmg+=0.5;                                // 공격력 소폭 증가 (고정값)
    healPlayer(11);  // 회복 + 늘어난 최대체력만큼
    pendingLevels++; sfx.pick();
    treePoints++;   // 트리 포인트 +1
    if(player.levelFullHeal) healPlayerRaw(player.maxhp);
    else if(player._levelHeal) healPlayer(player._levelHeal);
  }
  checkLevelAchievements();
  updateHUD();
  if(pendingLevels>0 && state==='play') showLevelUp();
}

// ---------- 보스 패턴 ----------
function pickFood(){ return FOODS.length?FOODS[irand(0,FOODS.length-1)]:null; }
function throwFood(b,ang,speed,dmg,home){
  const sp=(b&&b.enraged)?speed*0.78:speed;   // 격노 시 음식탄 속도 완화
  eBullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:13,dmg,life:3.4,foodImg:pickFood(),spin:rand(0,TAU),spinV:rand(-7,7),home:home||0});
}
function nextFromBag(b,key,n){
  let bag=b[key];
  if(!bag||!bag.length){ bag=[]; for(let i=0;i<n;i++) bag.push(i); for(let i=bag.length-1;i>0;i--){ const j=irand(0,i), t=bag[i]; bag[i]=bag[j]; bag[j]=t; } b[key]=bag; }
  return bag.pop();
}
function kijoFrenzy(b){
  // [격노 전용] 광란의 가면: 3중 회전 링 + 머리 위 가면 낙하
  const cx=b.x, cy=b.y;
  for(let ring=0;ring<3;ring++){
    const k=12+ring*3, sp=160+ring*42, off=(b.angle||0)*1.4+ring*0.5;
    for(let i=0;i<k;i++){ const a=off+i/k*TAU; eBullets.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:8,dmg:16,life:4,srcName:'키죠'}); }
  }
  for(let i=0;i<5;i++){ const fx=clamp(player.x+rand(-170,170),40,W-40); eBullets.push({x:fx,y:-12,vx:rand(-20,20),vy:rand(200,250),r:9,dmg:16,life:4.2,foodImg:(typeof pickFood==='function'?pickFood():null),spin:rand(0,TAU),spinV:rand(-7,7)}); }
  banner('👹 광란의 가면','사방이 가면이다!',900); screenShake=Math.max(screenShake||0,8); if(typeof beep==='function')beep(80,0.3,'sawtooth',0.07);
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
    eBullets.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:8,dmg:dmg||15,life:3.7,srcName:'키죠'});
  }
}
function kijoFan(x,y,ang,k,spread,spd,dmg,food){
  for(let i=0;i<k;i++){
    const a=ang+(i-(k-1)/2)*spread;
    if(food) throwFood({x,y,enraged:boss&&boss.enraged},a,spd,dmg||15);
    else eBullets.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:8,dmg:dmg||15,life:3.6,srcName:'키죠'});
  }
}
function kijoMaskFlip(b){
  kijoMasks=[];
  const real=irand(0,3), cx=W/2+rand(-70,70), cy=H*0.46+rand(-30,30), base=rand(0,TAU);
  for(let i=0;i<4;i++){
    const a=base+i*(TAU/4);
    kijoMasks.push({type:'flip',x:clamp(cx+Math.cos(a)*230,70,W-70),y:clamp(cy+Math.sin(a)*120,90,H*0.7),real:i===real,t:0,warn:1.25,done:false,seed:rand(0,TAU)});
  }
  banner('가면 뒤집기','진짜 얼굴을 찾아라',900);
}
function kijoGazePattern(b){
  const ang=Math.atan2(player.y-b.y,player.x-b.x);
  kijoGazes.push({x:b.x,y:b.y,ang,w:b.enraged?0.82:0.68,r:820,t:0,warn:b.enraged?0.85:1.05,done:false});
  banner('가면 시선','시선 밖으로!',850);
}
function beginKijoEvilEye(b){
  const warn=1.8;
  const beam={x:b.x,y:b.y,ang:Math.atan2(player.y-b.y,player.x-b.x),width:34,range:900,t:0,warn,color:'#ff4d6d',fired:false};
  const ok=setIntent(b,'👁','마안',warn,()=>{
    beam.fired=true;
    beam.t=Math.max(beam.t,beam.warn);
    intentLaser(beam.x,beam.y,beam.ang,beam.width,beam.range,24,'키죠 마안',beam.color);
    b._evilEyeCd=8.5;
  });
  if(ok) kijoLaserWarns.push(beam);
  return ok;
}
function kijoParadePattern(b){
  kijoParades=[];
  const n=b.enraged?4:3, sideFlip=Math.random()<0.5, yBase=rand(0.2,0.34);
  for(let i=0;i<n;i++){
    const left=(i%2===0)!==sideFlip, y=clamp(H*(yBase+i*0.13)+rand(-25,25),60,H-80);
    kijoParades.push({x:left?-55:W+55,y,vx:(left?1:-1)*(b.enraged?245:205)*rand(0.92,1.12),r:26,t:0,life:3.2,fireT:0.25+i*0.14+rand(0,0.12),seed:rand(0,TAU),hit:false});
  }
  banner('탈춤 행진','가면들이 지나간다',850);
}
function kijoMoodMasks(b){
  kijoMasks=[];
  const y=H*0.38+rand(-50,50), flip=Math.random()<0.5;
  const lx=clamp((flip?0.28:0.72)*W+rand(-50,50),70,W-70), rx=clamp((flip?0.72:0.28)*W+rand(-50,50),70,W-70);
  kijoMasks.push({type:'mood',mood:'laugh',x:lx,y,t:0,warn:1.05,done:false,seed:rand(0,TAU)});
  kijoMasks.push({type:'mood',mood:'cry',x:rx,y:y+rand(-30,30),t:0,warn:1.05,done:false,seed:rand(0,TAU)});
  if(b.enraged) kijoMasks.push({type:'mood',mood:Math.random()<0.5?'laugh':'cry',x:clamp(W*0.5+rand(-90,90),70,W-70),y:H*0.26+rand(-30,30),t:0,warn:0.95,done:false,seed:rand(0,TAU)});
  banner('웃는 가면 · 우는 가면','조준탄과 낙하탄',950);
}
function kijoReflectStance(b){
  b.reflectT=b.enraged?3.2:2.45;
  b.reflectAng=Math.atan2(player.y-b.y,player.x-b.x);
  banner('가면 난무','가면탄을 피하라',950);
  const side=b.reflectAng+Math.PI/2;
  kijoFan(b.x,b.y,side,5,0.16,205,14,false);
  kijoFan(b.x,b.y,side+Math.PI,5,0.16,205,14,false);
}
function kijoDamageWindow(b,t){
  b.restT=0;
  b.restWaitT=0;
  b.restWaitDur=0;
}
function kijoQueueDamageWindow(b,t,delay){
  b.restWaitT=0;
  b.restWaitDur=0;
}
function updateKijoFx(dt){
  for(const w of kijoLaserWarns){ w.t+=dt; if(w.trackRate&&!w.fired&&w.warn&&w.t<w.warn*0.55){ const pa=Math.atan2(player.y-w.y,player.x-w.x); let da=pa-w.ang; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; w.ang+=clamp(da,-w.trackRate*dt,w.trackRate*dt); } if(w.sniper&&!w.fired&&w.t>=w.warn) fireSniperLaser(w); }
  kijoLaserWarns=kijoLaserWarns.filter(w=>w.t<w.warn+0.32);

  for(const g of kijoGazes){
    g.t+=dt;
    if(!g.done&&g.t>=g.warn){
      g.done=true;
      const pa=Math.atan2(player.y-g.y,player.x-g.x), d=Math.hypot(player.x-g.x,player.y-g.y);
      if(d<g.r&&Math.abs(angleDiff(pa,g.ang))<g.w*0.5) hurtPlayer(boss&&boss.enraged?22:17,'키죠의 시선');
      kijoFan(g.x,g.y,g.ang,boss&&boss.enraged?13:9,0.11,245,15,false);
    }
  }
  kijoGazes=kijoGazes.filter(g=>g.t<g.warn+0.45);

  for(const m of kijoMasks){
    m.t+=dt;
    if(!m.done&&m.t>=m.warn){
      m.done=true;
      if(m.type==='flip'){
        if(m.real){
          kijoRing(m.x,m.y,boss&&boss.enraged?24:18,175,15,m.seed);
          if(typeof spawnFirePillar==='function') spawnFirePillar(m.x,m.y,'키죠');
        } else {
          const pa=Math.atan2(player.y-m.y,player.x-m.x);
          kijoFan(m.x,m.y,pa,3,0.22,215,14,false);
        }
      } else if(m.type==='mood'){
        if(m.mood==='laugh'){
          const pa=Math.atan2(player.y-m.y,player.x-m.x);
          kijoFan(m.x,m.y,pa,boss&&boss.enraged?9:6,0.17,245,15,false);
        } else {
          const n=boss&&boss.enraged?9:6;
          for(let i=0;i<n;i++) eBullets.push({x:clamp(m.x+rand(-120,120),40,W-40),y:-12,vx:rand(-18,18),vy:rand(185,235),r:8,dmg:15,life:4.2,srcName:'키죠'});
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
      eBullets.push({x:p.x,y:p.y,vx:Math.cos(pa)*210,vy:Math.sin(pa)*210,r:7,dmg:14,life:3.4,srcName:'키죠'});
      eBullets.push({x:p.x,y:p.y,vx:0,vy:195,r:7,dmg:14,life:3.4,srcName:'키죠'});
    }
    if(!p.hit&&dist2(p.x,p.y,player.x,player.y)<(p.r+player.r)**2){ p.hit=true; hurtPlayer(14,'탈춤 가면'); }
  }
  kijoParades=kijoParades.filter(p=>p.t<p.life&&p.x>-90&&p.x<W+90);
}
function updateBossIntentPatterns(b,dt){
  if(!b) return;
  tickIntent(b,dt);
  if(b.key==='kijo'){ b.restT=0; b.restWaitT=0; b.restWaitDur=0; }
  const cd=(name,base)=>{ b[name]=(b[name]==null?rand(base*0.65,base*1.2):b[name])-dt; return b[name]<=0&&!b.intent; };
  if(b.key==='kijo'){
    if(b.hp<=b.maxhp*0.3&&!b._madness){ b._madness=true; setIntent(b,'💀','광기',1.5,()=>{ b.intentSpeedMul=1.4; banner('💀 광기','키죠의 패턴이 빨라진다',1100); }); }
    else if(cd('_evilEyeCd',8)) beginKijoEvilEye(b);
    else if(cd('_maskBombCd',11)) setIntent(b,'🎭','가면 폭발',1.5,()=>{ for(let i=0;i<4;i++){ const x=clamp(player.x+rand(-150,150),50,W-50), y=clamp(player.y+rand(-120,120),90,H-60); setTimeout(()=>intentShockwave(x,y,90,16,'가면 폭발'),5000); burst(x,y,'#c0392b',8,120); } b._maskBombCd=12; });
  }else if(b.key==='seungwoo'){
    if(b.hp<=b.maxhp*0.25&&!b._overload){ b._overload=true; setIntent(b,'💀','오버로드',1.5,()=>{ b.intentSpeedMul=1.3; banner('💀 오버로드','패턴 속도 증가',1000); }); }
    else if(cd('_sysErrCd',9)) setIntent(b,'📺','시스템 오류',1.5,()=>{ const x=rand(70,W-70), y=rand(100,H-70); setTimeout(()=>intentShockwave(x,y,105,22,'시스템 오류'),2000); GL.frameDrop=Math.max(GL.frameDrop||0,2); b._sysErrCd=9.5; });
    else if(cd('_deleteCd',9.2)) beginSeungwooDeleteCommand(b);
  }else if(b.key==='bear'){
    if(b.hp<=b.maxhp*0.4&&!b._bearRage){ b._bearRage=true; setIntent(b,'💀','분노',1.7,()=>{ b.intentDmgMul=1.3; b.spd*=1.2; banner('💀 분노','공격력과 이동속도 증가',1100); }); }
    else if(cd('_earthCd',7)) setIntent(b,'⚔','대지 강타',2,()=>{ intentShockwave(b.x,b.y,170,28,'대지 강타'); b._earthCd=7.5; });
    else if(cd('_roarCd',10)) setIntent(b,'🗿','포효',1.5,()=>{ player.slowDebuffT=4; banner('🗿 포효','이동속도 감소',900); b._roarCd=10.5; });
  }
}

function updateBoss(dt){
  const b=boss;
  updateBossIntentPatterns(b,dt);
  if(updateBossStatuses(b,dt)) return;
  const stunned=(b.stunT||0)>0;
  if(b.pattern==='glitch'){
    if(stunned){ b.phaseT+=dt; if(b.hitT>0)b.hitT-=dt; return; }
    updateSeungwoo(b,dt); return;
  }
  if(b.pattern==='set3'){
    if(stunned){ b.phaseT+=dt; if(b.hitT>0)b.hitT-=dt; return; }
    updateSet3(b,dt); return;
  }
  b.phaseT+=dt; b.attackT-=dt; b.angle+=dt*1.2; if(b.hitT>0)b.hitT-=dt;
  if(b.reflectT>0) b.reflectT-=dt;
  if(!b.enraged && b.hp<b.maxhp*0.4){ b.enraged=true; b.spd*=1.4; banner("격노!","보스가 분노한다",1300); chatSys("🔥 보스 격노 — 채팅 카오스 monkaS");
    if(b.key==='kijo'){ b._kijoBag=null; b._kijoRep=0; banner("👹 가면의 마귀 각성","광란의 가면 해금!",1400); screenShake=Math.max(screenShake||0,16); kijoFrenzy(b); }
  }
  if(stunned) return;
  if(b.key==='kijo'){ b.restT=0; b.restWaitT=0; b.restWaitDur=0; }
  if(b.key==='kijo'&&b.intent&&b.intent.label==='마안') return;
  // 플레이어 추적(느슨) — 순서 기억 중엔 추적 정지, 타일 링 위로 물러나 그 자리에서 사격
  const a=Math.atan2(player.y-b.y,player.x-b.x);
  const sp=b.spd*(b.enraged?1.3:1)*statusMoveMul(b);
  if(b.key==='kijo'&&a3seq){
    b.x+=(W/2-b.x)*Math.min(1,dt*2.4);
    b.y+=(H*0.13-b.y)*Math.min(1,dt*2.4);
  } else {
    b.x+=Math.cos(a)*sp*dt; b.y+=Math.sin(a)*sp*dt*0.7;
  }
  b.x=clamp(b.x,b.r,W-b.r); b.y=clamp(b.y,b.r,H*0.6);
  if(b.key==='kijo'){
    b.a3T=(b.a3T==null?9:b.a3T)-dt;
    if(b.a3T<=0){ if(a3seq||a3veil){ b.a3T=1.0; } else { b.a3N=(b.a3N||0)+1; if(b.a3N%2===0) a3Sequence(b,3,{randomTiles:true,showGap:b.enraged?1.0:1.15,goGap:b.enraged?1.55:1.75,showEndDelay:0.9,dmg:24}); else a3Veil(4.5,'가면의 장막'); b.a3T=b.enraged?9:12; } }
  }
  // 접촉 — 순서 기억 중엔 몸박 무효 (정지 사격만)
  if(!(b.key==='kijo'&&a3seq) && dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2) hurtPlayer(intentDamage(b,b.enraged?38:28), boss?boss.name:'\uC2DC\uCCAD\uC790');
  if(b.attackT<=0){
    const rate=(b.enraged?1.3:1.6)/(b.intentSpeedMul||1);
    b.attackT=rate;
    if(b.pattern==='split'||b.pattern==='chaos'){
      for(let i=0;i<8;i++) enemyShootAt(b, b.x+Math.cos(i/8*TAU)*100, b.y+Math.sin(i/8*TAU)*100, 200,8);
    }
    if(b.pattern==='summon'){
      let phase;
      if((b._kijoRep||0)>0){ b._kijoRep--; phase=b._kijoPhase; b.attackT=rate*0.55; }   // 단순 탄막 집중 반복 중
      else {
        b.atkN=(b.atkN||0)+1;
        phase=nextFromBag(b,'_kijoBag',b.enraged?9:8);   // 셔플백 (격노 시 9번째=광란의 가면 포함)
        b._kijoPhase=phase;
        if(phase===2||phase===7){ b._kijoRep=2+(Math.random()<0.5?1:0); b.attackT=rate*0.55; }   // 회전나선/음식폭격 → 3~4회 집중
      }
      if(phase===0){
        // ① 가면 뒤집기: 진짜/가짜 가면을 구분하는 속임수 탄막
        kijoMaskFlip(b);
      } else if(phase===1){
        // ② 가면 시선: 부채꼴 시야 밖으로 빠져야 하는 경고 패턴
        kijoGazePattern(b);
      } else if(phase===2){
        // ③ 2갈래 회전 나선
        const k=b.enraged?14:11, base=b.angle*2.6;
        for(let i=0;i<k;i++){ throwFood(b, base+i/k*TAU, 185, 15); throwFood(b, -base+i/k*TAU+0.3, 175, 15); }
      } else if(phase===3){
        // ④ 탈춤 행진: 가면들이 측면에서 지나가며 탄을 뿌림
        kijoParadePattern(b);
        kijoQueueDamageWindow(b,b.enraged?1.1:1.45,3.15);
      } else if(phase===4){
        // ⑤ 웃는 가면 / 우는 가면: 조준탄과 낙하탄의 역할 분리
        kijoMoodMasks(b);
      } else if(phase===5){
        // ⑥ 가면 난무: 회피형 탄막만 남기고 피해 제한은 적용하지 않음
        kijoReflectStance(b);
      } else if(phase===6){
        // ⑦ 가면 낙인: 플레이어 주변 공간을 잠깐 봉쇄
        kijoMaskBrand(b);
      } else if(phase===7){
        // ⑦ 음식 폭격 (낙하·증가)
        const n=b.enraged?8:6;
        const fall=b.enraged?0.8:1;   // 격노 시 낙하 음식 속도 완화
        for(let i=0;i<n;i++){ const fx=rand(50,W-50); eBullets.push({x:fx,y:-12,vx:rand(-25,25),vy:rand(165,205)*fall,r:13,dmg:15,life:4.2,foodImg:pickFood(),spin:rand(0,TAU),spinV:rand(-7,7)}); }
        banner("음식 폭격!","",600);
        if((b._kijoRep||0)<=0) kijoQueueDamageWindow(b,b.enraged?1.55:2.15,b.enraged?1.25:1.55);   // 반복 마지막에만 휴식
      } else {
        // ⑧ [격노 전용] 광란의 가면
        kijoFrenzy(b);
      }
      // 격노 보너스: 유도하는 음식탄 (피하기 까다로움)
      if(b.enraged && Math.random()<0.32){
        const pa=Math.atan2(player.y-b.y,player.x-b.x);
        for(let i=0;i<5;i++) throwFood(b, pa+i/5*TAU, 175, 15, 1.25);
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
  if(b.hp<=0) handleBossDefeat(b);
}
function killBoss(){
  const deadBoss=boss;
  burst(boss.x,boss.y,boss.color,40,320); screenShake=18;
  banner("보스 처치!","승리!",2000); sfx.coin();
  const bossGold=actTuning(act).bossGold||[105,170];
  addGold(irand(bossGold[0],bossGold[1]),'roomReward'); sfx.coin(); burst(boss.x,boss.y,'#ffd34d',20,260);
  const bossXp=actTuning(act).bossXp||440;
  gainXP(bossXp);
  if(deadBoss&&deadBoss.key) markDiscovered('bosses', deadBoss.key);
  userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
  userProgress.stats.totalBosses+=1;
  if(deadBoss&&deadBoss.key==='kijo') unlockAchievement('defeat_kijo');
  if(deadBoss&&deadBoss.key==='seungwoo') unlockAchievement('defeat_seungwoo');
  if(deadBoss&&deadBoss.key==='set3') banner('재밌었다','다음 시즌에 보자',1600);
  saveUserProgress();
  if(act>=MAX_ACT){ enemies.length=0; eBullets.length=0; }   // 최종보스 처치 시 남은 잡몹·탄막 정리
  updateHUD();
  if(typeof clearSeungwooFx==='function') clearSeungwooFx();
  boss=null; roomIsBoss=false;
  // 이후 흐름은 onCombatCleared() → finishNode() 에서 처리
}


let act3FinalClear=null;
function act3FinalClearActive(){ return !!(act3FinalClear&&act3FinalClear.active); }
function startAct3FinalClear(deadBoss){
  if(act3FinalClearActive()) return true;
  const bx=deadBoss&&Number.isFinite(deadBoss.x)?deadBoss.x:W/2;
  const by=deadBoss&&Number.isFinite(deadBoss.y)?deadBoss.y:H*0.32;
  act3FinalClear={active:true,t:0,x:bx,y:by,skipped:false,done:false,timer:null};
  roomCleared=true; roomIsBoss=false; boss=null; enemies.length=0; pBullets.length=0; eBullets.length=0; hazards=[];
  if(typeof clearSeungwooFx==='function') clearSeungwooFx();
  screenShake=Math.max(screenShake||0,28); hitFlash=Math.max(hitFlash||0,0.8);
  for(let i=0;i<52;i++) burst(bx+rand(-70,70),by+rand(-50,50),pick(['#38e8ff','#ff4dd2','#ffd34d','#ffffff']),8,260);
  banner('세트3형제 격파','재밌었다. 다음 시즌에 보자.',2200);
  act3FinalClear.timer=setTimeout(()=>{ if(act3FinalClearActive()){ const c=act3FinalClear; act3FinalClear=null; try{ victory(); }catch(e){ console.warn('act3 final clear fallback failed',e); } } },6200);
  return true;
}
function skipAct3FinalClear(){
  if(!act3FinalClearActive()) return false;
  act3FinalClear.t=5.2; act3FinalClear.skipped=true;
  return true;
}
function updateAct3FinalClear(dt){
  if(!act3FinalClearActive()) return false;
  const c=act3FinalClear; c.t+=dt;
  if(c.t<3.8&&Math.random()<0.55){
    particles.push({x:c.x+rand(-180,180),y:c.y+rand(-110,130),vx:rand(-40,40),vy:rand(-160,40),life:rand(.35,.9),max:.9,color:pick(['#38e8ff','#ff4dd2','#ffd34d']),r:rand(2,5)});
    trimArrayHead(particles,PERF_LIMITS.particles);
  }
  if(c.t>1.15&&!c.after1){ c.after1=true; banner('현진 · 번검 · 케케로로','세 화면이 동시에 꺼진다',1700); screenShake=Math.max(screenShake||0,18); }
  if(c.t>2.75&&!c.after2){ c.after2=true; banner('화이트아웃','방송 신호가 사라진다',1500); hitFlash=Math.max(hitFlash||0,0.7); }
  if(c.t>=5.0&&!c.done){
    c.done=true; if(c.timer) clearTimeout(c.timer); act3FinalClear=null; victory();
  }
  return true;
}
function drawAct3FinalClear(){
  if(!act3FinalClearActive()) return;
  const c=act3FinalClear, t=c.t;
  ctx.save();
  const fade=clamp(t/4.2,0,1);
  ctx.fillStyle='rgba(5,3,10,'+(0.22+fade*0.58)+')'; ctx.fillRect(0,0,W,H);
  ctx.translate(rand(-screenShake*0.1,screenShake*0.1),rand(-screenShake*0.1,screenShake*0.1));
  const shards=18;
  for(let i=0;i<shards;i++){
    const a=i/shards*TAU+t*0.65, rr=38+t*70+i*2;
    const x=c.x+Math.cos(a)*rr, y=c.y+Math.sin(a)*rr*0.58;
    ctx.globalAlpha=clamp(1-t/4.6,0,0.88);
    ctx.fillStyle=i%3===0?'#38e8ff':(i%3===1?'#ff4dd2':'#ffd34d');
    ctx.fillRect(x,y,18+Math.sin(t+i)*8,4+((i+t*10)|0)%8);
  }
  ctx.globalAlpha=1;
  if(t>2.0){
    ctx.fillStyle='rgba(255,255,255,'+clamp((t-2)/2.2,0,0.94)+')'; ctx.fillRect(0,0,W,H);
  }
  ctx.textAlign='center';
  ctx.font='bold 30px Courier New';
  ctx.fillStyle=t>2.7?'#0a0814':'#ffffff';
  ctx.strokeStyle=t>2.7?'#ffffff':'#08040f'; ctx.lineWidth=5;
  const msg=t>2.7?'재밌었다. 다음 시즌에 보자.':'세트3형제 송출 종료';
  ctx.strokeText(msg,W/2,H*0.43); ctx.fillText(msg,W/2,H*0.43);
  ctx.font='14px Courier New';
  ctx.fillStyle=t>2.7?'#24142e':'#b9f8ff';
  ctx.fillText('SPACE / ESC: skip',W/2,H*0.43+34);
  ctx.restore();
}
// ===================== 승우 (글리치 최종보스) =====================
const GL={mirror:0,keyRev:0,frameDrop:0,rotActive:0,shield:0,blackout:0};
const gView={rot:0,rotT:0,fx:1,fy:1,fxT:1,fyT:1};
let gZones=[], gWalls=[], gClones=[], gGrav=null, gTrack=null, gSlow=[], seungwooLaserWarns=[];
let gFakeReset=false, gResetT=0;

function clearSeungwooFx(){
  if(typeof clearA3Systems==='function') clearA3Systems();
  for(const k in GL)GL[k]=0;
  gZones=[];gWalls=[];gClones=[];gGrav=null;gTrack=null;gSlow=[];seungwooLaserWarns=[];
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
  if(player.hitShield>0){ player.hitShield--; player.iframes=0.6; burst(player.x,player.y,'#8be8ff',16,200); return; }
  const dmgCalc=calculatePlayerIncomingDamage(dmg,{source:'승우'});
  if(window.DEBUG_COMBAT){
    console.debug('[combat] incomingDamage', {
      source:'승우',
      base:dmgCalc.base,
      difficulty:dmgCalc.difficulty,
      armor:dmgCalc.armor,
      armorMul:dmgCalc.armorMul,
      takenMul:dmgCalc.takenMul,
      final:dmgCalc.final
    });
  }
  dmg=dmgCalc.final;
  if(player.deathWard>0 && player.hp-dmg<=0){
    player.deathWard--;
    player.hp=1;
    player.iframes=1.3;
    hitFlash=Math.max(hitFlash,0.25);
    screenShake=Math.max(screenShake,10);
    banner('불사 발동','체력 1로 생존',1400);
    burst(player.x,player.y,'#ffd34d',24,240);
    updateHUD();
    return;
  }
  player.hp-=dmg; hitFlash=Math.max(hitFlash,0.14); combatTookHit=true; runHits++; lastKiller='승우';
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
function gp_blacksafe(b){ const w=190,h=150,x=clamp(player.x+rand(-120,120),20,W-w-20),y=clamp(player.y+rand(-90,90),60,H-h-20); gZones=[{x,y,w,h,real:true,t:0,warn:2.8,kill:3.2,fake:false,black:true}]; banner('검은 구역 밖 즉사','SAFE 안으로',900); }
function gp_slow(b){ gSlow=[]; for(let i=0;i<3;i++) gSlow.push({x:rand(80,W-80),y:rand(140,H-90),r:rand(60,90),t:6}); banner('늪','이동 둔화',600); }
function gp_track(b){ gTrack={x:player.x,y:player.y,r:54,t:7,grow:14}; banner('추적 장판','계속 움직여라',800); }
function gp_mirror(b){ if(sfx.enemyGlitch) sfx.enemyGlitch(); GL.mirror=6; banner('🪞 거울 모드','등 지고 쏴라',1000); gRing(b,10,200,8); }
function gp_keyrev(b){ banner('글리치 유도탄','',700); gHoming(b); }
function gp_framedrop(b){ if(sfx.enemyGlitch) sfx.enemyGlitch(); GL.frameDrop=5; banner('▒ 프레임 드랍','',900); gRing(b,13,180,8); }
function gp_gravity(b){ gGrav={x:W/2,y:H*0.46,r:240,t:6}; banner('🕳 중력장','빨려간다',800); gRing(b,16,150,9); }
function gp_walls(b){ gWalls=[{x:-40,y:0,w:130+rand(0,40),h:H,t:5},{x:W-90-rand(0,40),y:0,w:130,h:H,t:5}]; banner('▦ 격벽','가운데로',800); gAimed(b,7); }
function gp_homing(b){ gHoming(b); banner('유도탄','',600); }
function gp_shield(b){ GL.shield=5; banner('🛡 공격 반사','뒤로 돌아라',900); }
function gp_fakesafe(b){ gZones=[]; const n=4,ri=irand(0,n-1); for(let i=0;i<n;i++){const w=160,h=120; gZones.push({x:rand(20,W-w-20),y:rand(120,H-h-20),w,h,real:i===ri,t:0,warn:3.2,kill:2.6,fake:true});} banner('가짜 안전구역','진짜를 골라라',1000); }
function gp_clones(b){ gClones=[]; for(let i=0;i<4;i++) gClones.push({x:clamp(b.x+rand(-170,170),60,W-60),y:clamp(b.y+rand(-40,70),60,260),fireT:rand(.3,.9),t:5}); banner('잔상 분신','본체만 때린다',900); }
function gp_rotate(b){ if(sfx.enemyGlitch) sfx.enemyGlitch(); const m=irand(0,2); if(m===0)gView.rotT=Math.PI/2*(Math.random()<.5?1:-1); else if(m===1)gView.rotT=Math.PI; else gView.fxT=-1; GL.rotActive=6; banner('↻ 화면 붕괴','',800); gAimed(b,6); }
function gp_crashRain(b){ GL.frameDrop=Math.max(GL.frameDrop||0,3.8); const n=b.enraged?34:26; for(let i=0;i<n;i++) gShot(rand(20,W-20),-14,Math.PI/2+rand(-0.08,0.08),rand(230,315),rand(6,9),9); banner('▒ 데이터 폭우','위에서 쏟아진다',850); }
function gp_tongueRush(b){ const pa=Math.atan2(player.y-b.y,player.x-b.x); for(let i=-2;i<=2;i++) gShot(b.x,b.y,pa+i*0.12,300,12,12,0.4); gRing(b,b.enraged?18:14,155,8); banner('혀 내밀기','정면을 비워라',850); }
function gp_totalCollapse(b){ if(sfx.enemyGlitch) sfx.enemyGlitch(); GL.blackout=Math.max(GL.blackout||0,0.45); gView.rotT+=rand(-0.45,0.45); gView.fxT=Math.random()<0.5?-1:1; GL.rotActive=4.2; gHoming(b); gRing(b,b.enraged?18:14,170,9); banner('TOTAL COLLAPSE','방송이 찢어진다',950); }
function beginSeungwooDeleteCommand(b){
  const warn=1.5;
  const beam={x:b.x,y:b.y,ang:Math.atan2(player.y-b.y,player.x-b.x),width:30,range:900,t:0,warn,color:'#9146ff',fired:false};
  const ok=setIntent(b,'👁','삭제 명령',warn,()=>{
    if(sfx.enemyLaser) sfx.enemyLaser();
    beam.fired=true;
    beam.t=Math.max(beam.t,beam.warn);
    intentLaser(beam.x,beam.y,beam.ang,beam.width,beam.range,26,'삭제 명령',beam.color);
    b._deleteCd=9.3;
  });
  if(ok){ if(sfx.enemyGlitch) sfx.enemyGlitch(); seungwooLaserWarns.push(beam); }
  return ok;
}

const GP1=[gp_straight,gp_blacksafe,gp_straight,gp_slow,gp_straight,gp_track];
const GP2=[gp_mirror,gp_homing,gp_framedrop,gp_gravity,gp_walls,gp_fakesafe,gp_clones,gp_rotate];
const GP3=[gp_crashRain,gp_tongueRush,gp_gravity,gp_totalCollapse,gp_fakesafe,gp_clones,gp_rotate,gp_shield];

function seungwooPatternTag(fn){
  if(fn===gp_mirror||fn===gp_rotate||fn===gp_framedrop||fn===gp_gravity) return 'control';
  if(fn===gp_blacksafe||fn===gp_fakesafe||fn===gp_walls) return 'zone';
  if(fn===gp_clones||fn===gp_shield) return 'summon';
  return 'damage';
}
function pickSeungwooPattern(b,list){
  let pool=list.slice();
  if(b._lastGp) pool=pool.filter(fn=>fn!==b._lastGp);
  if(b._lastGpTag==='control') pool=pool.filter(fn=>seungwooPatternTag(fn)!=='control');
  if(b._lastGp===gp_fakesafe) pool=pool.filter(fn=>fn!==gp_totalCollapse);
  if((GL.mirror>0||GL.rotActive>0)) pool=pool.filter(fn=>fn!==gp_totalCollapse);
  if(!pool.length) pool=list.slice();
  const fn=pick(pool);
  b._lastGp=fn; b._lastGpTag=seungwooPatternTag(fn);
  return fn;
}
function startFakeReset(b){ gFakeReset=true; gResetT=0; GL.blackout=0.6; screenShake=14; banner('◄◄ REWIND','SYSTEM RESTORED…?',1200); }
function seungwooNextPhase(b){
  const ph=(b.gphase||1)+1;
  b.gphase=ph;
  clearSeungwooFx();
  eBullets.length=0; hazards=[]; particles=[]; kijoLaserWarns=[];
  b.maxhp=(b.phaseHp&&b.phaseHp[ph-1])||b.maxhp;
  b.hp=b.maxhp;
  b.hitT=0.2; b.stunT=0; b.burnT=0; b.psT=0; b.psStacks=0;
  b.enraged=false; b.usedReset=false; b.patI=0; b._lastGp=null; b._lastGpTag=null; b.attackT=2.6; b.moveT=0;
  b.baseSpd=b.baseSpd||56;
  b.spd=b.baseSpd*(ph===2?1.08:1.18);
  b.r=ph===2?68:74;
  b.color=ph===2?'#ff4dd2':'#ff7a1f';
  b.x=W/2; b.y=140; b.tx=b.x; b.ty=b.y;
  screenShake=Math.max(screenShake||0,ph===2?20:26);
  hitFlash=Math.max(hitFlash||0,ph===2?0.45:0.65);
  GL.blackout=ph===2?1.0:1.25;
  if(typeof sfx!=='undefined'&&sfx.boss) sfx.boss();
  beep(ph===2?180:80,0.5,'sawtooth',0.07);
  beep(ph===2?360:160,0.55,'triangle',0.05);
  const col=ph===2?'#ff4dd2':'#ff7a1f';
  const line=ph===2?'프로필 사진이 깨지며 웃음이 번진다.':'송출 화면이 찢어지고 본색이 튀어나온다.';
  const name=ph===2?'SIGNAL HIJACK':'FINAL BROADCAST';
  bossEvolve={phase:ph,t:0,line,name,col,e:b};
  cutsceneT=ph===2?2.7:3.1;
  if(sfx.enemyGlitch) sfx.enemyGlitch();
  for(let i=0;i<34;i++) setTimeout(()=>{ if(boss===b) burst(b.x+rand(-b.r*1.6,b.r*1.6),b.y+rand(-b.r*1.2,b.r*1.2),pick(['#ffffff',col,'#38e8ff']),3,340); },i*26);
}

function updateSeungwoo(b,dt){
  if(b.gphase===undefined){ b.gphase=1; b.patI=0; b.attackT=1.6; b.moveT=0; b.tx=b.x; b.ty=b.y; b.usedReset=false; clearSeungwooFx(); }
  b.phaseT+=dt; b.angle+=dt*1.3; if(b.hitT>0)b.hitT-=dt;
  for(const w of seungwooLaserWarns) w.t+=dt;
  seungwooLaserWarns=seungwooLaserWarns.filter(w=>w.t<w.warn+0.32);

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
    if(b.hp<=0) handleBossDefeat(b);
    return;
  }

  // 격노
  if(!b.enraged && b.hp<b.maxhp*(b.gphase===3?0.28:0.22)){ b.enraged=true; b.spd*=1.18; banner('🔥 격노','',1000); if(typeof chatSys==='function')chatSys('🔥 승우 격노 — monkaS'); }

  // 이동(느슨 추적 + 텔포)
  b.moveT-=dt;
  if(b.moveT<=0){ b.tx=rand(120,W-120); b.ty=rand(90,240); b.moveT=rand(1.4,2.6);
    if(b.gphase>=2&&Math.random()<(b.gphase===3?0.48:0.35)){ b.x=b.tx;b.y=b.ty; burst(b.x,b.y,b.gphase===3?'#ff7a1f':'#9146ff',20,260); if(typeof chatRandom==='function')chatRandom('렉걸렸다 ㅋㅋ'); } }
  b.x+=(b.tx-b.x)*Math.min(1,dt*1.4*statusMoveMul(b)); b.y+=(b.ty-b.y)*Math.min(1,dt*1.4*statusMoveMul(b));
  b.x=clamp(b.x,b.r,W-b.r); b.y=clamp(b.y,b.r,H*0.55);
  if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2) hurtPlayer(b.enraged?38:28,'승우');

  // 강제 리셋 트리거(2페 12% 1회)
  if(b.gphase===2 && !b.usedReset && b.hp<=b.maxhp*0.18){ b.usedReset=true; startFakeReset(b); return; }

  // 패턴 발사
  b.attackT-=dt*(b.intentSpeedMul||1);
  if(b.attackT<=0){
    const list=b.gphase===1?GP1:(b.gphase===2?GP2:GP3);
    pickSeungwooPattern(b,list)(b);
    b.patI++;
    b.attackT=b.gphase===1?(b.enraged?2.1:2.6):(b.gphase===2?(b.enraged?2.25:2.8):(b.enraged?2.05:2.45));
  }

  // 분신 사격
  for(const c of gClones){ c.t-=dt; c.fireT-=dt; if(c.fireT<=0){ c.fireT=rand(.7,1.1); const pa=Math.atan2(player.y-c.y,player.x-c.x); gShot(c.x,c.y,pa,210,6,8); } }
  gClones=gClones.filter(c=>c.t>0);

  // --- 환경 효과 (플레이어 피해/끌림) ---
  if(gZones.length){ let allKill=true,real=null; for(const z of gZones){ z.t+=dt; if(z.real)real=z; if(z.t<z.warn)allKill=false; } if(allKill&&real){ const inR=player.x>real.x&&player.x<real.x+real.w&&player.y>real.y&&player.y<real.y+real.h; if(!inR) glDamage(52*dt); } if(gZones[0].t>gZones[0].warn+gZones[0].kill) gZones=[]; }
  if(gTrack){ gTrack.t-=dt; const a=Math.atan2(player.y-gTrack.y,player.x-gTrack.x); const d=Math.hypot(player.x-gTrack.x,player.y-gTrack.y); if(d>4){gTrack.x+=Math.cos(a)*70*dt;gTrack.y+=Math.sin(a)*70*dt;} gTrack.r+=gTrack.grow*dt; if(dist2(gTrack.x,gTrack.y,player.x,player.y)<gTrack.r*gTrack.r) glDamage(34*dt); if(gTrack.t<=0)gTrack=null; }
  if(gWalls.length){ for(const w of gWalls)w.t-=dt; gWalls=gWalls.filter(w=>w.t>0); for(const w of gWalls){ if(player.x>w.x&&player.x<w.x+w.w&&player.y>w.y&&player.y<w.y+w.h) glDamage(64*dt); } }
  if(gGrav){ gGrav.t-=dt; const a=Math.atan2(gGrav.y-player.y,gGrav.x-player.x); const d=Math.hypot(gGrav.x-player.x,gGrav.y-player.y); if(d>4&&player.dodging<=0){ player.x+=Math.cos(a)*120*dt; player.y+=Math.sin(a)*120*dt; player.x=clamp(player.x,player.r,W-player.r); player.y=clamp(player.y,player.r,H-player.r); } if(gGrav.t<=0)gGrav=null; }
  if(gSlow.length){ for(const f of gSlow)f.t-=dt; gSlow=gSlow.filter(f=>f.t>0); }

  // 신규 다채 패턴 (글리치 시퀀스 / 송출 암전)
  b.a3T=(b.a3T==null?10:b.a3T)-dt;
  if(b.a3T<=0){ if(a3seq||a3veil){ b.a3T=1.0; } else { b.a3N=(b.a3N||0)+1; if(b.a3N%2===0) a3Sequence(b,3); else a3Veil(4.5,'송출 암전'); b.a3T=b.enraged?10:13; } }

  if(b.hp<=0) handleBossDefeat(b);
}

// --- 승우 월드 렌더 (좌표 변환 안에서 호출) ---
function drawSeungwooWorld(){
  for(const w of seungwooLaserWarns){
    const k=clamp(w.t/w.warn,0,1);
    const fade=w.t<=w.warn?1:clamp(1-(w.t-w.warn)/0.32,0,1);
    const sx=w.x, sy=w.y, ex=w.x+Math.cos(w.ang)*w.range, ey=w.y+Math.sin(w.ang)*w.range;
    const nx=-Math.sin(w.ang), ny=Math.cos(w.ang), half=w.width;
    const pulse=0.55+0.45*Math.sin(performance.now()/55);
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.fillStyle='rgba(145,70,255,'+(0.08+0.18*k)+')';
    ctx.beginPath();
    ctx.moveTo(sx+nx*half,sy+ny*half); ctx.lineTo(ex+nx*half,ey+ny*half); ctx.lineTo(ex-nx*half,ey-ny*half); ctx.lineTo(sx-nx*half,sy-ny*half);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(56,232,255,'+(0.55+0.35*pulse)+')';
    ctx.lineWidth=2+3*k; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    if(w.t>=w.warn){ ctx.strokeStyle='#ffffff'; ctx.lineWidth=8; ctx.globalAlpha=0.45*fade; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke(); }
    ctx.restore();
  }
  if(gGrav){ const g=ctx.createRadialGradient(gGrav.x,gGrav.y,4,gGrav.x,gGrav.y,gGrav.r); g.addColorStop(0,'rgba(0,0,0,0.8)'); g.addColorStop(0.5,'rgba(145,70,255,0.22)'); g.addColorStop(1,'rgba(145,70,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(gGrav.x,gGrav.y,gGrav.r,0,TAU); ctx.fill(); ctx.strokeStyle='#9146ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(gGrav.x,gGrav.y,18+Math.sin(performance.now()/120)*4,0,TAU); ctx.stroke(); }
  for(const f of gSlow){ ctx.fillStyle='rgba(56,232,255,0.10)'; ctx.strokeStyle='rgba(56,232,255,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill(); ctx.stroke(); }
  if(gTrack){ ctx.fillStyle='rgba(255,77,109,0.16)'; ctx.strokeStyle='rgba(255,77,109,0.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(gTrack.x,gTrack.y,gTrack.r,0,TAU); ctx.fill(); ctx.stroke(); }
  for(const w of gWalls){ ctx.fillStyle='rgba(255,77,109,0.22)'; ctx.fillRect(w.x,w.y,w.w,w.h); ctx.strokeStyle='#ff4d6d'; ctx.lineWidth=3; ctx.strokeRect(w.x,w.y,w.w,w.h); ctx.fillStyle='#ff4d6d'; ctx.font='bold 12px Courier New'; for(let yy=24;yy<H;yy+=46)ctx.fillText('▓즉사',w.x+8,yy); }
  for(const z of gZones){ const warned=z.t>=z.warn;
    if(z.black){ ctx.fillStyle=warned?'rgba(0,0,0,0.55)':'rgba(0,0,0,0.3)'; ctx.fillRect(0,0,W,H); ctx.save(); ctx.beginPath(); ctx.rect(z.x,z.y,z.w,z.h); ctx.clip(); ctx.fillStyle='#0c0916'; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeStyle='#5dff9b'; ctx.lineWidth=3; ctx.strokeRect(z.x,z.y,z.w,z.h); ctx.restore(); ctx.fillStyle='#5dff9b'; ctx.font='bold 12px Courier New'; ctx.fillText('SAFE',z.x+8,z.y+18); }
    else { const flick=z.real?(0.55+0.45*Math.sin(performance.now()/90)):1; ctx.globalAlpha=z.real?flick:1; ctx.fillStyle='rgba(93,255,155,0.10)'; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeStyle='#5dff9b'; ctx.lineWidth=z.real?3:2; ctx.setLineDash(z.real?[]:[6,5]); ctx.strokeRect(z.x,z.y,z.w,z.h); ctx.setLineDash([]); ctx.globalAlpha=1; ctx.fillStyle='#5dff9b'; ctx.font='bold 12px Courier New'; ctx.fillText('SAFE?',z.x+8,z.y+18); if(warned&&!z.real){ ctx.fillStyle='rgba(255,77,109,0.2)'; ctx.fillRect(z.x,z.y,z.w,z.h); } }
  }
  for(const c of gClones){ ctx.save(); ctx.translate(c.x,c.y); ctx.globalAlpha=0.45; if(SPRITES.seungwoo)SPRITES.seungwoo(30,{gphase:(boss&&boss.gphase)||2}); ctx.restore(); ctx.globalAlpha=1; }
}

// --- 승우 화면 오버레이 (좌표 변환 밖) ---
function drawSeungwooOverlay(){
  if(boss&&boss.gphase>=2){
    const ph=boss.gphase||2;
    ctx.globalAlpha=ph>=3?0.08:0.05; ctx.fillStyle='#000'; for(let y=0;y<H;y+=3)ctx.fillRect(0,y,W,1); ctx.globalAlpha=1;
    if(Math.random()<(ph>=3?0.18:0.10)){ const by=rand(0,H-30); ctx.globalAlpha=ph>=3?0.52:0.4; ctx.fillStyle=ph>=3?'#ff7a1f':'#ff4dd2'; ctx.fillRect(rand(-8,8),by,W,rand(6,24)); ctx.fillStyle='#38e8ff'; ctx.fillRect(rand(-8,8),by+4,W,rand(4,16)); ctx.globalAlpha=1; }
  }
  if(GL.mirror>0){ ctx.fillStyle='rgba(255,77,210,0.06)'; ctx.fillRect(0,0,W,H); }
  if(GL.blackout>0){ ctx.fillStyle='rgba(5,3,10,'+Math.min(1,GL.blackout)+')'; ctx.fillRect(0,0,W,H); }
  if(gFakeReset&&gResetT<2.1){ ctx.fillStyle='rgba(5,3,10,0.7)'; ctx.fillRect(0,0,W,H); ctx.textAlign='center'; ctx.fillStyle='#38e8ff'; ctx.font='bold 44px Courier New'; ctx.fillText('◄◄ REWIND',W/2+rand(-3,3),H/2); ctx.font='14px Courier New'; ctx.fillStyle='#9b8fc4'; ctx.fillText('SYSTEM RESTORED…?',W/2,H/2+34); ctx.textAlign='left'; }
}

// ---------- 업데이트 ----------
function update(dt){
  if(state!=='play') return;
  if(updateAct3FinalClear(dt)) return;
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
  if(player.redPulseBuff>0) player.redPulseBuff=Math.max(0,player.redPulseBuff-dt);
  if(player.dodgeReloadT>0) player.dodgeReloadT=Math.max(0,player.dodgeReloadT-dt);
  if(player.shadowBarrageT>0) player.shadowBarrageT=Math.max(0,player.shadowBarrageT-dt);
  if(player.shadowBarrageCd>0) player.shadowBarrageCd=Math.max(0,player.shadowBarrageCd-dt);
  if(player.perfectDodgeFireT>0) player.perfectDodgeFireT=Math.max(0,player.perfectDodgeFireT-dt);
  if(player.perfectDodgeArmed){
    player.perfectDodgeCheckT=Math.max(0,player.perfectDodgeCheckT-dt);
    if(player.perfectDodgeCheckT<=0){
      player.perfectDodgeArmed=false;
      player.perfectDodgeFireT=Math.max(player.perfectDodgeFireT||0,3);
      burst(player.x,player.y,'#5dff9b',12,170);
    }
  }
  if(player.dodgeCharges<player.dodgeMaxCharges){
    if(player.dodgeCd>0) player.dodgeCd-=dt;
    if(player.dodgeCd<=0){
      player.dodgeCharges++;
      player.dodgeReadyFxT=DODGE_READY_FX_DURATION;
      if(typeof beep==='function'){ beep(880,0.06,'sine',0.045); beep(1320,0.08,'triangle',0.035); }
      if(player.dodgeCharges<player.dodgeMaxCharges) player.dodgeCd=10*playerDodgeCooldownMul(player);
      updateHUD();
    }
  }
  if(player.shieldRegen>0){ player.shieldRegenT=(player.shieldRegenT||0)+dt; if(player.shieldRegenT>=player.shieldRegen){ player.shieldRegenT=0; player.hitShield=Math.min((player.hitShield||0)+1,1); } }
  if(player.minion){
    const mn=player.minion;
    mn.ang=(mn.ang||0)+dt*2.2;
    mn.x=player.x+Math.cos(mn.ang)*48;
    mn.y=player.y+Math.sin(mn.ang)*48;
    mn.fireT=(mn.fireT||0)-dt;
    if(mn.fireT<=0){
      let tx=null,ty=null,bd=1e9;
      for(const e of enemies){ if(!e||e.dead||e.hp<=0) continue; const d2=dist2(mn.x,mn.y,e.x,e.y); if(d2<bd){bd=d2;tx=e.x;ty=e.y;} }
      if(boss){ const d2=dist2(mn.x,mn.y,boss.x,boss.y); if(d2<bd){bd=d2;tx=boss.x;ty=boss.y;} }
      if(tx!==null && bd<200000){
        const ma=Math.atan2(ty-mn.y,tx-mn.x);
        const inheritedCrit=clamp(((Number(player.critChance)||0)+curseContractCritBonus(player))*0.5,0,CRIT_CHANCE_CAP);
        const crit=Math.random()<inheritedCrit;
        let dmg=Math.max(2,totalAttackPower(player)*0.75);
        if(crit) dmg*=effectiveCritMult();
        pBullets.push({x:mn.x,y:mn.y,vx:Math.cos(ma)*520,vy:Math.sin(ma)*520,r:5,dmg,life:1.0,bounce:0,pierce:0,hitSet:new Set(),crit,homing:0,minionShot:true});
        mn.fireT=0.45;
      } else mn.fireT=0.3;
    }
  }
  updateStallWatch(dt);
  const regen=effectiveRegen(player);
  if(regen!==0){
    player.regenAcc+=dt;
    while(player.regenAcc>=1){
      player.regenAcc-=1;
      const regenStep=regen*statMulFromBonus(statBonusFromMul(player&&player.recoveryMul),0);
      player.hp=clamp(player.hp+regenStep,1,player.maxhp);
      updateHpHud();
    }
  }
  if(player.buffs.rage>0) player.buffs.rage-=dt;
  if(player.buffs.haste>0) player.buffs.haste-=dt;
  if(player.buffs.shield>0) player.buffs.shield-=dt;
  tickPotionBuffs(dt);
  if(player.timeStop>0) player.timeStop=Math.max(0,player.timeStop-dt);
  if(player.moveLockT>0) player.moveLockT=Math.max(0,player.moveLockT-dt); if(player.stunT>0) player.stunT=Math.max(0,player.stunT-dt);
  if(player.moveLockImmuneT>0) player.moveLockImmuneT=Math.max(0,player.moveLockImmuneT-dt);
  if(player.slowDebuffT>0) player.slowDebuffT=Math.max(0,player.slowDebuffT-dt);
  if(player.dodgeReadyFxT>0) player.dodgeReadyFxT=Math.max(0,player.dodgeReadyFxT-dt);
  if(hitFlash>0) hitFlash-=dt;
  if(screenShake>0) screenShake=Math.max(0,screenShake-dt*40);
  if(bossBanner>0) bossBanner-=dt;
  updateDashFx(dt);

  // 구르기
  const wasDashActive=player.dodging>0;
  if(player.dodging>0){ player.dodging=Math.max(0,player.dodging-dt); }
  if(!keys[' ']) dodgeLatch=false;   // 스페이스 떼면 재장전
  if(keys[' ']&&!dodgeLatch&&player.dodgeCharges>0&&player.dodging<=0&&!(player.moveLockT>0)){
    dodgeLatch=true;
    player.dodging=0.22+(player.dodgeIframeBonus||0); if(player.dodgeCd<=0) player.dodgeCd=10*playerDodgeCooldownMul(player); player.dodgeCharges--; updateHUD(); sfx.dodge(); if(tutorial)tutorial.dodged=true;
    if(player.dodgeReload) player.dodgeReloadT=2;
    if(player.perfectDodge){ player.perfectDodgeArmed=true; player.perfectDodgeCheckT=1; }
    if(player.shadowBarrage&&player.shadowBarrageCd<=0){ player.shadowBarrageT=1; player.shadowBarrageCd=6; }
    if(player.dodgeHaste) player.buffs.haste=Math.max(player.buffs.haste,2.5);
    if(player.dodgeBlast>0){ enemies.slice().forEach(o=>{ if(dist2(o.x,o.y,player.x,player.y)<38025){ o.hp-=player.dodgeBlast; o.hitT=0.1; const ka=Math.atan2(o.y-player.y,o.x-player.x); o.x+=Math.cos(ka)*69; o.y+=Math.sin(ka)*69; if(o.hp<=0) handleEnemyDefeat(o); } }); burst(player.x,player.y,'#38e8ff',22,280); screenShake=Math.max(screenShake,8); }
    let mvx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
    let mvy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
    if(typeof GL!=='undefined'&&GL.keyRev>0){ mvx=-mvx; mvy=-mvy; }
    if(mvx===0&&mvy===0){ mvx=Math.cos(player.facing); mvy=Math.sin(player.facing); }
    const m=Math.hypot(mvx,mvy)||1; player.dvx=mvx/m; player.dvy=mvy/m;
    player.dashFxTrailT=0;
    spawnDashFx('start',player.x,player.y,player.dvx,player.dvy);
    burst(player.x,player.y,'#38e8ff',8,120);
  }

  // 이동
  let mvx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
  let mvy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
  if(typeof GL!=='undefined'&&GL.keyRev>0){ mvx=-mvx; mvy=-mvy; }
  const mRaw=Math.hypot(mvx,mvy);
  const moveLocked=(player.moveLockT||0)>0;
  const m=moveLocked?0:mRaw;
  let sp=playerMoveSpeed(player)*(player._creepSlow?0.5:1)*(player._slowField?0.5:1)*(player.slowDebuffT>0?0.7:1); if(typeof gSlow!=='undefined'&&gSlow.length&&gSlow.some(f=>dist2(f.x,f.y,player.x,player.y)<f.r*f.r)) sp*=0.45;
  if(player.dodging>0&&!moveLocked){
    player.x+=player.dvx*520*dt; player.y+=player.dvy*520*dt;
    player.dashFxTrailT=(player.dashFxTrailT||0)-dt;
    if(player.dashFxTrailT<=0){
      spawnDashFx('trail',player.x-player.dvx*18,player.y-player.dvy*18,player.dvx,player.dvy);
      player.dashFxTrailT=0.035;
    }
  }
  else if(m>0){ player.x+=(mvx/m)*sp*dt; player.y+=(mvy/m)*sp*dt; if(tutorial)tutorial.moved=true; }
  player.x=clamp(player.x,player.r,W-player.r);
  player.y=clamp(player.y,player.r,H-player.r);
  if(wasDashActive&&player.dodging<=0){
    spawnDashFx('end',player.x,player.y,player.dvx,player.dvy);
    player.dashFxTrailT=0;
  }

  // 발사
  if(player.fireTimer>0) player.fireTimer-=dt;
  if((mouseDown || (typeof autoFire!=='undefined'&&autoFire)) && player.fireTimer<=0 && !roomCleared && !(player.stunT>0)){
    playerShoot(); if(tutorial)tutorial.shot=true;
    player.fireTimer=playerShootCooldown(player);
  }

  // 플레이어 탄
  for(let i=pBullets.length-1;i>=0;i--){
    const b=pBullets[i];
    if(!b||!Number.isFinite(b.x)||!Number.isFinite(b.y)){ pBullets.splice(i,1); continue; }
    if(!b.hitSet) b.hitSet=new Set();
    if(!Number.isFinite(b.vx)) b.vx=0; if(!Number.isFinite(b.vy)) b.vy=0;
    if(!Number.isFinite(b.life)) b.life=0;
    if(!Number.isFinite(b.r)) b.r=4;
    if(b.homing){
      let tx=null,ty=null,bd=1e9;
      for(const e of enemies){ if(!e||e.dead||e.hp<=0) continue; const d=dist2(b.x,b.y,e.x,e.y); if(d<bd){bd=d;tx=e.x;ty=e.y;} }
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
        if(!e||e.dead||e.hp<=0) continue;
        if(b.hitSet.has(e)) continue;
        if(dist2(b.x,b.y,e.x,e.y)<(b.r+e.r)**2){
          if(b.playerShot&&e.ai==='reflector'&&(e.reflectT||0)>0){
            const ra=Math.atan2(player.y-e.y,player.x-e.x)+rand(-0.16,0.16);
            const rd=Math.max(4,Math.round((b.dmg||10)*0.34));
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(ra)*300,vy:Math.sin(ra)*300,r:Math.max(5,Math.min(8,b.r||6)),dmg:rd,life:2.4,srcName:e.name||e.label||'거울러',reflected:true});
            burst(e.x,e.y,'#8be8ff',8,170);
            dead=true;
            break;
          }
          const hit=b.playerShot?rollPlayerBulletDamage(e,b):{dmg:b.dmg,crit:!!b.crit};
          damageEnemy(e,hit.dmg,hit.crit,true,b);
          if(b.pierce>0){ b.pierce--; b.hitSet.add(e); }
          else { dead=true; }
          break;
        }
      }
    }
    if(!dead && boss){
      if(!b.hitSet.has(boss) && dist2(b.x,b.y,boss.x,boss.y)<(b.r+boss.r)**2){
        const hit=b.playerShot?rollPlayerBulletDamage(boss,b):{dmg:b.dmg,crit:!!b.crit};
        damageBoss(boss,hit.dmg,hit.crit,true,b);
        if(b.pierce>0){ b.pierce--; b.hitSet.add(boss); } else dead=true;
      }
    }
    if(dead) pBullets.splice(i,1);
  }

  const enemyFrozen=player.timeStop>0;
  // 적 탄
  if(!enemyFrozen) for(let i=eBullets.length-1;i>=0;i--){
    const b=eBullets[i];
    if(VICIOUS.on && !b._vsc){ b._vsc=1; const m=VICIOUS.bspd*rand(1-VICIOUS.spdVar,1+VICIOUS.spdVar); b.vx*=m; b.vy*=m; }
    if(b.home){ const cur=Math.atan2(b.vy,b.vx); let da=Math.atan2(player.y-b.y,player.x-b.x)-cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; const spd=Math.hypot(b.vx,b.vy), na=cur+clamp(da,-b.home*dt,b.home*dt); b.vx=Math.cos(na)*spd; b.vy=Math.sin(na)*spd; }
    if(b.boomerang){
      b.age=(b.age||0)+dt;
      b.trailT=(b.trailT||0)-dt;
      if(!b.returning && (b.age>(b.outT||0.9) || dist2(b.x,b.y,b.sx,b.sy)>(b.maxDist||250)*(b.maxDist||250))){ b.returning=true; if(!b._returnSfxPlayed){ b._returnSfxPlayed=true; if(sfx.enemyWarn) sfx.enemyWarn(); } }
      if(b.returning){
        const target=(b.owner&&enemies.includes(b.owner))?b.owner:{x:b.sx,y:b.sy};
        let ba=Math.atan2(target.y-b.y,target.x-b.x);
        if(b.curveReturn){ const pa=Math.atan2(player.y-b.y,player.x-b.x); let da=pa-ba; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; ba+=clamp(da,-b.curveReturn*dt,b.curveReturn*dt); }
        const sp=(b.speed||220)*1.08;
        b.vx=Math.cos(ba)*sp; b.vy=Math.sin(ba)*sp;
        if(b.age>0.35 && dist2(b.x,b.y,target.x,target.y)<196){ eBullets.splice(i,1); continue; }
      }
      if(b.trailT<=0){ b.trailT=0.08; particles.push({x:b.x,y:b.y,vx:0,vy:0,life:0.22,max:0.22,color:b.returning?'#58d8ff':'#ffd34d',r:3}); trimArrayHead(particles,PERF_LIMITS.particles); }
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; if(b.spinV) b.spin=(b.spin||0)+b.spinV*dt;
    if(b.life<=0||b.x<-30||b.x>W+30||b.y<-30||b.y>H+30){ eBullets.splice(i,1); continue; }
    if(dist2(b.x,b.y,player.x,player.y)<(b.r+player.r)**2){
      if(b.boomerang){
        const key=b.returning?'hitBack':'hitOut';
        if(!b[key]){
          b[key]=true;
          hurtPlayer(b.dmg, b.srcName||(boss?boss.name:'\uC2DC\uCCAD\uC790'));
          if(b.hitOut&&b.hitBack){ eBullets.splice(i,1); continue; }
        }
      } else {
        hurtPlayer(b.dmg, b.srcName||(boss?boss.name:'\uC2DC\uCCAD\uC790')); if(b.stun){ player.stunT=Math.max(player.stunT||0,b.stunDur||0.7); player.moveLockT=Math.max(player.moveLockT||0,b.stunDur||0.7); burst(player.x,player.y,'#ffe14d',12,150); if(typeof beep==='function')beep(120,0.12,'square',0.05); } eBullets.splice(i,1);
      }
    }
  }
  // 떠다니는 사망 말풍선 (적이 사라진 자리에 잠시 남음)
  for(let i=floatBubbles.length-1;i>=0;i--){ const fb=floatBubbles[i]; fb.t+=dt; fb.y+=fb.vy*dt; fb.vy*=0.90; if(fb.t>=fb.max) floatBubbles.splice(i,1); }

  // 적 AI
  if(!enemyFrozen) for(const e of enemies){
    if(e.hitT>0) e.hitT-=dt;
    if(e.taunt&&e.taunt.t>0) e.taunt.t-=dt;
    e.coolT-=dt; e.wob+=dt*3;
    updateIntentPatterns(e,dt);
    updateBonusPatterns(e,dt);
    if(e._spd0==null) e._spd0=e.spd;
    const _chl=(e.chillT=(e.chillT||0))>0; if(_chl) e.chillT-=dt; e.spd=_chl? e._spd0*0.5 : e._spd0;
    if((e.burnT=(e.burnT||0))>0){ e.burnT-=dt; const burnDps=(e.burnDmg||0)*statusDotDamageMul(); const bdmg=burnDps*dt; e.hp-=bdmg; e.hitT=Math.max(e.hitT,0.04); e._burnPopT=(e._burnPopT||0)-dt; if(e._burnPopT<=0){ e._burnPopT=0.35; if(GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(e.x,e.y-e.r-4,Math.max(1,Math.round(burnDps*0.35)),false,'burn'); } if(e.hp<=0){ handleEnemyDefeat(e); continue; } }
    else { e._burnPopT=0; }
    if((e.psT=(e.psT||0))>0){ e.psT-=dt; const poisonDps=(e.psStacks||0)*(e.psDmg||0)*statusDotDamageMul()*poisonDotDamageMul(); const pdmg=poisonDps*dt; e.hp-=pdmg; e.hitT=Math.max(e.hitT,0.04); e._psPopT=(e._psPopT||0)-dt; if(e._psPopT<=0){ e._psPopT=0.35; if(GS.dmgNum&&typeof spawnDmgNum==='function') spawnDmgNum(e.x,e.y-e.r-4,Math.max(1,Math.round(poisonDps*0.35)),false,'poison'); } if(e.hp<=0){ handleEnemyDefeat(e); continue; } } else { e.psStacks=0; e._psPopT=0; }
    const a=Math.atan2(player.y-e.y,player.x-e.x);
    const d=Math.hypot(player.x-e.x,player.y-e.y);
    if((e.stunImmuneT=(e.stunImmuneT||0))>0) e.stunImmuneT=Math.max(0,e.stunImmuneT-dt);
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
      if(e.type==='namu'){ e.poundT=(e.poundT==null?rand(3.2,4.8):e.poundT)-dt; if(e.poundT<=0){ const tx=e.x, ty=e.y; warnAoE(tx,ty,rand(90,105),0.65,0.45,Math.max(10,Math.round((e.dmg||17)*0.85)),e.name||e.label,e.color); burst(tx,ty,e.color,10,170); if(typeof beep==='function')beep(70,0.16,'sawtooth',0.05); e.poundT=rand(4.0,5.2); } }
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
          const gimCrowd=enemies.filter(o=>o&&o.type==='gwangcheon_gim').length;
          const pa=(gimCrowd<2||e.shotN%6===0)?aimPlayerLeadAngle(e,0.18):Math.atan2(player.y-e.y,player.x-e.x);
          for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa)*280,vy:Math.sin(pa)*280,r:7,dmg:e.dmg,life:4,srcName:e.name,style:enemyBulletStyle(e),col:e.color}); }, i*110);
          // 김 가루 살포: 5발 연사 후마다 주변에 감속장 생성
          if(e.shotN%5===0){
            setTimeout(()=>{ if(enemies.includes(e)){ spawnSlowField(player.x,player.y,94,4.5); burst(player.x,player.y,'#3f7a34',14,160); banner('🌿 김 가루 살포','범위 내 이동 둔화',700); if(typeof beep==='function')beep(180,0.12,'sawtooth',0.05); } }, 340);
          }
        } else if(e.type==='goblin_archer' && e.shotN%3===0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x);
          // 3연사 + 미세 산개로 정조준 회피를 살짝 압박
          for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)){ const sa=pa+(i-1)*0.045; eBullets.push({x:e.x,y:e.y,vx:Math.cos(sa)*260,vy:Math.sin(sa)*260,r:7,dmg:e.dmg,life:4,srcName:e.name,style:enemyBulletStyle(e),col:e.color}); } }, i*85);
          // 가끔 좌우 견제탄으로 옆길을 살짝 막는다
          if(e.shotN%6===0){ setTimeout(()=>{ if(enemies.includes(e)){ for(const off of [-0.5,0.5]) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+off)*230,vy:Math.sin(pa+off)*230,r:7,dmg:Math.max(5,Math.round(e.dmg*0.85)),life:3.6,srcName:e.name,style:enemyBulletStyle(e),col:e.color}); if(typeof beep==='function')beep(300,0.05,'square',0.03); } }, 300); }
        } else enemyShootAt(e,player.x,player.y,240,7,e.dmg);
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
        if(e.type==='ketter' && e.shotN%4===0){
          if(countEnemyHazards('slowfield','ketter')<1) spawnWarnedSlowField(player.x,player.y,rand(65,75),rand(2.5,3.0),0.75,'ketter');
          enemyShootAt(e,player.x,player.y,210,8,e.dmg);
        } else if(e.type==='blackstar' && e.shotN%4===0){
          if(countEnemyHazards('gravitywell','blackstar')<1){ spawnGravityWell(player.x,player.y,rand(130,150),rand(2.4,3.0),210,0,'blackstar'); const k=7; for(let i=0;i<k;i++){ const aa=i/k*TAU+(e.wob||0); eBullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*190,vy:Math.sin(aa)*190,r:7,dmg:Math.max(7,Math.round((e.dmg||14)*0.75)),life:3.1,srcName:e.name||e.label,style:enemyBulletStyle(e),col:e.color}); } }
        } else if(e.shotN%3===0){
          const pa=Math.atan2(player.y-e.y,player.x-e.x); const kw=(e.type==='goblin_shaman'); const lo=kw?-2:-1, hi=kw?2:1;
          for(let i=lo;i<=hi;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.24)*210,vy:Math.sin(pa+i*0.24)*210,r:8,dmg:e.dmg,life:3.6,srcName:e.name,style:enemyBulletStyle(e),col:e.color});
        } else enemyShootAt(e,player.x,player.y,200,8,e.dmg);
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
    }else if(e.ai==='cleaver_thrower'){
      const enr=e.hp<=e.maxhp*0.5;
      const target=e.range||320;
      if(d<target*0.62){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>target){ const ms=enr?1.18:1; e.x+=Math.cos(a)*e.spd*ms*dt; e.y+=Math.sin(a)*e.spd*ms*dt; }
      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*0.35*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.35*dt; }
      if(e.coolT<=0){
        e.cleaveN=(e.cleaveN||0)+1;
        if(enr){
          // 격노: 항상 3way, 매 3번째는 5way 살포로 피할 공간을 크게 좁힘
          if(e.cleaveN%3===0){ for(let i=-2;i<=2;i++) fireCleaver(e,a,{spread:i*0.16}); }
          else { for(let i=-1;i<=1;i++) fireCleaver(e,a,{spread:i*0.18}); }
          e.coolT=(e.cool||1.55)*0.72;
        } else {
          // 평상시: 매 3번째 투척은 3way 부채꼴
          if(e.cleaveN%3===0){ for(let i=-1;i<=1;i++) fireCleaver(e,a,{spread:i*0.18}); }
          else fireCleaver(e,a);
          e.coolT=e.cool||1.55;
        }
      }
    }else if(e.ai==='boomerang_thrower'){
      const enr=e.hp<=e.maxhp*0.5;
      if(enr && !e._enraged){ e._enraged=true; banner('🪃 재민 격노!','부메랑 3연 투척!',800); burst(e.x,e.y,'#f0a84a',16,220); if(typeof beep==='function')beep(160,0.14,'sawtooth',0.06); }
      const target=e.range||300;
      const ms=enr?1.15:1;
      if(d<target*0.56){ e.x-=Math.cos(a)*e.spd*ms*dt; e.y-=Math.sin(a)*e.spd*ms*dt; }
      else if(d>target){ e.x+=Math.cos(a)*e.spd*ms*dt; e.y+=Math.sin(a)*e.spd*ms*dt; }
      else { e.x+=Math.cos(a-Math.PI/2)*e.spd*0.45*dt; e.y+=Math.sin(a-Math.PI/2)*e.spd*0.45*dt; }
      if(e.coolT<=0){
        if(enr){ for(let i=-1;i<=1;i++) fireBoomerang(e,a,{enraged:true,spread:i*0.26}); e.coolT=(e.cool||1.95)*0.62; }
        else { fireBoomerang(e,a); e.coolT=e.cool||1.95; }
      }
    }else if(e.ai==='sniper_laser'){
      if((e.postShotT=e.postShotT||0)>0){ e.postShotT-=dt; }
      else {
        if(e.aimBeam && e.aimBeam.fired){ e.aimBeam=null; e.aimBeam2=null; e.postShotT=0.42; }
        if(e.aimBeam && !e.aimBeam.fired && e.aimBeam.t>=e.aimBeam.warn){ fireSniperLaser(e.aimBeam); if(e.aimBeam2) fireSniperLaser(e.aimBeam2); e.aimBeam=null; e.aimBeam2=null; e.postShotT=0.42; }
        if(!e.aimBeam){
          const target=e.range||520;
          if(d>target*0.88){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
          else if(d<target*0.42){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
        }
        if(e.coolT<=0 && !e.aimBeam && d<(e.range||520)+80){
          const enr=e.hp<=e.maxhp*0.5;
          e.snipeN=(e.snipeN||0)+1;
          const twin=enr || (e.snipeN%3===0);     // 격노/주기적으로 트윈 빔
          const warnT=enr?0.50:0.62;               // 레이저 보고 피할 텀 확보
          // 추적은 조준 초반에만, 발사 직전엔 선이 고정됨 → 고정된 선을 보고 회피
          e.aimBeam={x:e.x,y:e.y,ang:a,width:13,range:e.range||520,t:0,warn:warnT,color:'#ff2638',fired:false,sniper:true,dmg:e.dmg,srcName:e.name||e.label,trackRate:enr?1.1:0.8};
          kijoLaserWarns.push(e.aimBeam);
          if(twin){
            // 보조 빔은 고정 각도 → 메인 피하면서 사잇각도 함께 봐야 함
            e.aimBeam2={x:e.x,y:e.y,ang:a+(Math.random()<0.5?0.17:-0.17),width:12,range:e.range||520,t:0,warn:warnT,color:'#ff2638',fired:false,sniper:true,dmg:Math.max(8,Math.round(e.dmg*0.85)),srcName:e.name||e.label,trackRate:0};
            kijoLaserWarns.push(e.aimBeam2);
          }
          if(sfx.enemyWarn) sfx.enemyWarn();
          e.coolT=(e.cool||3.0)*(enr?0.72:1);
        }
      }
    }else if(e.ai==='movement_lock'){
      const target=e.range||360;
      if(d>target*0.75){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      else if(d<target*0.35){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*0.28*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.28*dt; }
      if(e.coolT<=0){ const nm=e.name||e.label; spawnMoveLockField(player.x,player.y,nm); spawnMoveLockField(clamp(player.x+rand(-95,95),44,W-44),clamp(player.y+rand(-80,80),95,H-55),nm); spawnMoveLockField(clamp(player.x+rand(-95,95),44,W-44),clamp(player.y+rand(-80,80),95,H-55),nm); e.coolT=e.cool||2.6; if(typeof beep==='function')beep(180,0.07,'sawtooth',0.035);
        // 봉쇄 직후 견제탄: 갇힌 동안 빠져나갈 압박을 준다
        for(let i=0;i<3;i++) setTimeout(()=>{ if(enemies.includes(e)){ const pa=Math.atan2(player.y-e.y,player.x-e.x); eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa)*205,vy:Math.sin(pa)*205,r:7,dmg:e.dmg,life:3.2,srcName:nm,style:enemyBulletStyle(e),col:e.color}); } }, 500+i*180);
      }
    }else if(e.ai==='summoner'){
      const target=e.range||340;
      if(d<target*0.72){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>target*1.08){ e.x+=Math.cos(a)*e.spd*0.55*dt; e.y+=Math.sin(a)*e.spd*0.55*dt; }
      e.x+=Math.cos(a+Math.PI/2)*e.spd*0.22*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.22*dt;
      const live=act3SummonsOf(e,'act3_sand_soldier').length;
      if(e.coolT<=0&&live<5){ const n=Math.min(5-live,2+(Math.random()<0.55?1:0)); for(let j=0;j<n;j++) spawnAct3SandSoldier(e); e.coolT=e.cool||5.6; if(typeof beep==='function')beep(180,0.12,'triangle',0.04); }
      if(e.coolT<=0&&live>=5) e.coolT=1.2;
    }else if(e.ai==='stealth_assassin'){
      if((e.stealthT||0)>0){ e.stealthT-=dt; e.wob+=dt*8; if(e.stealthT<=0){ const side=(Math.random()<0.5?-1:1), back=(player.facing||a)+Math.PI; e.x=clamp(player.x+Math.cos(back)*rand(115,155)+Math.cos(back+Math.PI/2)*side*rand(30,70),e.r,W-e.r); e.y=clamp(player.y+Math.sin(back)*rand(115,155)+Math.sin(back+Math.PI/2)*side*rand(30,70),e.r,H-e.r); const da=Math.atan2(player.y-e.y,player.x-e.x); e.aimX=Math.cos(da); e.aimY=Math.sin(da); e.teleWarnT=0.45; burst(e.x,e.y,'#ff4dd2',10,160); } }
      else if((e.teleWarnT||0)>0){ e.teleWarnT-=dt; e.wob+=dt*12; if(e.teleWarnT<=0){ e.assDashT=0.38; e._dashHit=false; if(typeof beep==='function')beep(520,0.08,'square',0.04); } }
      else if((e.assDashT||0)>0){ e.assDashT-=dt; e.x+=e.aimX*e.spd*7.2*dt; e.y+=e.aimY*e.spd*7.2*dt; if(!e._dashHit&&dist2(e.x,e.y,player.x,player.y)<(e.r+player.r+12)**2){ e._dashHit=true; hurtPlayer(Math.max(10,e.dmg||20),e.name||e.label); burst(player.x,player.y,'#ff4dd2',12,190); } if(e.assDashT<=0){ e.coolT=e.cool||6.2; } }
      else { if(d>95){ e.x+=Math.cos(a)*e.spd*0.82*dt; e.y+=Math.sin(a)*e.spd*0.82*dt; } else { e.x-=Math.cos(a)*e.spd*0.5*dt; e.y-=Math.sin(a)*e.spd*0.5*dt; } if(e.coolT<=0&&d<520){ e.stealthT=0.62; e.coolT=999; burst(e.x,e.y,'#4b1b66',10,130); } }
    }else if(e.ai==='submerge_charge'){
      if(e.submerged==null){ e.submerged=true; e.coolT=rand(0.8,1.8); }
      if((e.emergeWarnT||0)>0){ e.emergeWarnT-=dt; if(e.emergeWarnT<=0){ e.submerged=false; e.chargeT=0.52; if(typeof beep==='function')beep(220,0.1,'sawtooth',0.05); } }
      else if((e.chargeT||0)>0){ e.chargeT-=dt; e.x+=e.aimX*e.spd*6.0*dt; e.y+=e.aimY*e.spd*6.0*dt; if(!e._biteHit&&dist2(e.x,e.y,player.x,player.y)<(e.r+player.r+8)**2){ e._biteHit=true; hurtPlayer(Math.max(9,e.dmg||16),e.name||e.label); } if(e.chargeT<=0||e.x<=e.r||e.x>=W-e.r||e.y<=e.r||e.y>=H-e.r){ e.submerged=true; e._biteHit=false; e.coolT=e.cool||3.8; } }
      else if(e.submerged){ e.x+=Math.cos(a+Math.sin(e.wob)*0.7)*e.spd*0.32*dt; e.y+=Math.sin(a+Math.sin(e.wob)*0.7)*e.spd*0.32*dt; if(e.coolT<=0&&d<460){ e.aimX=Math.cos(a); e.aimY=Math.sin(a); e.emergeWarnT=0.47; e.coolT=999; } }
      else { e.submerged=true; }
    }else if(e.ai==='reflector'){
      if((e.reflectT||0)>0) e.reflectT=Math.max(0,e.reflectT-dt);
      const target=e.range||360;
      if(d<target*0.58){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>target){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*0.24*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.24*dt; }
      if(e.coolT<=0){ e.reflectT=1.9; e.coolT=e.cool||4.2; const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let j=-1;j<=1;j++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+j*0.22)*215,vy:Math.sin(pa+j*0.22)*215,r:7,dmg:Math.max(6,Math.round((e.dmg||10)*0.8)),life:3.2,srcName:e.name||e.label}); burst(e.x,e.y,'#8be8ff',14,130); if(typeof beep==='function')beep(740,0.08,'sine',0.035); }
    }else if(e.ai==='splitter'){
      const target=e.range||320;
      if(d<target*0.62){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*dt; }
      else if(d>target){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      else { e.x+=Math.cos(a-Math.PI/2)*e.spd*0.35*dt; e.y+=Math.sin(a-Math.PI/2)*e.spd*0.35*dt; }
      if(!e.clone&&!e.splitChild&&e.hp<=e.maxhp*0.5&&!e._splitMade){ e._splitMade=true; setIntent(e,'◆','분열',0.75,()=>{ for(let j=0;j<2;j++) spawnAct3GlitchClone(e); }); }
      if(e.coolT<=0){ const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let j=-2;j<=2;j++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+j*0.14)*242,vy:Math.sin(pa+j*0.14)*242,r:7,dmg:Math.max(6,Math.round((e.dmg||12)*0.8)),life:3.2,srcName:e.name||e.label}); e.coolT=e.cool||1.25; }
    }else if(e.ai==='magnet'){
      const target=e.range||230;
      if(d>target*0.95){ e.x+=Math.cos(a)*e.spd*dt; e.y+=Math.sin(a)*e.spd*dt; }
      else if(d<target*0.55){ e.x-=Math.cos(a)*e.spd*0.55*dt; e.y-=Math.sin(a)*e.spd*0.55*dt; }
      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*0.3*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*0.3*dt; }
      if(d<target&&player.dodging<=0){ const pull=70*(1-d/target); player.x=clamp(player.x-Math.cos(a)*pull*dt,player.r,W-player.r); player.y=clamp(player.y-Math.sin(a)*pull*dt,player.r,H-player.r); }
      if(e.coolT<=0){ if((e.shotN=(e.shotN||0)+1)%3===0){ const k=5; for(let j=0;j<k;j++){ const aa=a+(j-(k-1)/2)*0.24; eBullets.push({x:e.x,y:e.y,vx:Math.cos(aa)*215,vy:Math.sin(aa)*215,r:7,dmg:Math.max(6,Math.round((e.dmg||8)*0.8)),life:3.2,srcName:e.name||e.label}); } } else { const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let j=-1;j<=1;j++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+j*0.2)*205,vy:Math.sin(pa+j*0.2)*205,r:7,dmg:Math.max(6,Math.round((e.dmg||8)*0.8)),life:3.2,srcName:e.name||e.label}); } e.coolT=e.cool||2.4; }
      // TODO(act3-content): 탄환 휨 효과는 안정화 후 별도 projectile modifier로 추가한다.
    }else if(e.ai==='beam_sweep'){
      const target=e.range||620;
      if(d>target*0.72){ e.x+=Math.cos(a)*e.spd*0.65*dt; e.y+=Math.sin(a)*e.spd*0.65*dt; }
      else if(d<target*0.34){ e.x-=Math.cos(a)*e.spd*0.55*dt; e.y-=Math.sin(a)*e.spd*0.55*dt; }
      if(e.coolT<=0){ spawnAct3BeamSweep(e); e.coolT=e.cool||6.5; if(typeof beep==='function')beep(300,0.16,'triangle',0.05); }
    }else if(e.ai==='blink_lagfield'){
      e.x+=Math.cos(a+Math.sin(e.wob*2)*0.9)*e.spd*dt; e.y+=Math.sin(a+Math.cos(e.wob*1.7)*0.9)*e.spd*dt;
      if(e.coolT<=0){ const ox=e.x, oy=e.y; e.x=clamp(e.x+rand(-140,140),e.r,W-e.r); e.y=clamp(e.y+rand(-110,110),80,H-55); burst(ox,oy,'#38e8ff',8,120); burst(e.x,e.y,'#ff4dd2',8,120); spawnWarnedSlowField(player.x,player.y,86,4.2,0.75,e.name||e.label); { const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let j=-1;j<=1;j++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+j*0.2)*240,vy:Math.sin(pa+j*0.2)*240,r:7,dmg:Math.max(6,Math.round((e.dmg||10)*0.8)),life:3,srcName:e.name||e.label}); } e.coolT=e.cool||2.2; }
    }else if(e.ai==='onster'){

      if(!e.awakened && e.hp<=e.maxhp*0.5) onsterAwaken(e);

      const ph=e.awakened?2:1, target=ph===2?280:340;

      if(d<target*0.7){ e.x-=Math.cos(a)*e.spd*dt; e.y-=Math.sin(a)*e.spd*0.55*dt; }

      else if(d>target){ e.x+=Math.cos(a)*e.spd*0.55*dt; e.y+=Math.sin(a)*e.spd*0.35*dt; }

      else { e.x+=Math.cos(a+Math.PI/2)*e.spd*(ph===2?0.38:0.2)*dt; e.y+=Math.sin(a+Math.PI/2)*e.spd*(ph===2?0.26:0.14)*dt; }

      e.summonT=(e.summonT==null?4.2:e.summonT)-dt;

      if(e.summonT<=0){ for(let i=0;i<(ph===2?2:1);i++) spawnOnsterMinion(e); e.summonT=ph===2?5.8:6.5; }

      // ── 3막 중간보스 신규 패턴 ──
      e.a3T=(e.a3T==null?6:e.a3T)-dt;
      if(e.a3T<=0){
        if(a3strike||a3seq||a3veil){ e.a3T=0.8; }
        else {
          e.a3N=(e.a3N||0)+1;
          if(ph===1){
            const sel=e.a3N%5;
            if(sel===0) a3BindRing(e,4,'사슬');
            else if(sel===1) a3PoisonTrail(e,5,0.5,10,'#9d7bff');
            else if(sel===2) a3Brand(e,2.0,90,24,'사슬 낙인');
            else if(sel===3) a3VineSlam(e,'사슬 옭아맴');
            else a3PullSlam(e,'사슬 끌어당김',26);
            e.a3T=6.8;
          }else{
            const sel=e.a3N%6;
            if(sel===0) a3BindRing(e,5,'사슬');
            else if(sel===1) a3CrossAoE(e,Math.max(W,H),60,1.0,18);
            else if(sel===2){ a3Objective(clamp(player.x+rand(-120,120),60,W-60),clamp(player.y+rand(-90,90),120,H-90),{hp:230,fuse:6.0,fail:'slow',label:'사슬 닻',color:'#8d72ff',owner:e}); banner('⚓ 사슬 닻','부수지 못하면 발이 묶인다',900); }
            else if(sel===3) a3PoisonTrail(e,5,0.45,11,'#9d7bff');
            else if(sel===4) a3PushRing(e,12);
            else a3StrikeShadows(e,3,'사슬 그늘');
            e.a3T=6.4;
          }
        }
      }

      e.atkT=(e.atkT==null?1.3:e.atkT)-dt;

      if(e.atkT<=0){

        e.atkN=(e.atkN||0)+1;

        if(ph===1){

          const slot=e.atkN%4;
          if(slot===0) intentShockwave(clamp(player.x+rand(-50,50),80,W-80),clamp(player.y+rand(-40,40),100,H-80),95,18,'\uC628\uC2A4\uD130 \uC9C0\uBA74\uAC15\uD0C0');

          else if(slot===2){ const base=Math.atan2(player.y-e.y,player.x-e.x); for(const off of [-0.44,0.44]){ kijoLaserWarns.push({x:e.x,y:e.y,ang:base+off,width:18,range:760,t:0,warn:0.7,color:'#8d72ff',fired:false,sniper:true,dmg:16,srcName:'온스터 사슬채찍'}); } banner('⛓ 사슬 채찍','정면 양옆을 비워라',800); }

          else onsterChainBeam(e);

          e.atkT=1.65;

        }else{

          if(e.atkN%4===0){ const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.22)*255,vy:Math.sin(pa+i*0.22)*255,r:8,dmg:11,life:3.5,home:0.55,srcName:'\uC628\uC2A4\uD130 \uC720\uB3C4 \uD30C\uD3B8'}); }

          else if(e.atkN%3===0){ const pa=Math.atan2(player.y-e.y,player.x-e.x); e.x=clamp(e.x+Math.cos(pa)*160,e.r,W-e.r); e.y=clamp(e.y+Math.sin(pa)*95,e.r,H*0.58); intentShockwave(e.x,e.y,120,21,'\uC628\uC2A4\uD130 \uB3CC\uC9C4 \uAC15\uD0C0'); }

          else onsterChainBeam(e);

          e.atkT=1.25;

        }

      }

    }

    else if(e.ai==='egg'){
      e.hatchT-=dt;
      if(e.hatchT<0.55) e.wob+=dt*20;
      if(e.hatchT<=1.0&&!e._hatchWarnSfx){ e._hatchWarnSfx=true; if(sfx.enemyWarn) sfx.enemyWarn(); }
      if(e.hatchT<=0){
        spawnEnemy(e.hatchType,e.x,e.y,1);
        burst(e.x,e.y,'#d24a2a',22,280); burst(e.x,e.y,'#ffd24a',10,180);
        if(sfx.enemyExplode) sfx.enemyExplode();
        screenShake=Math.max(screenShake||0,5);
        const ix=enemies.indexOf(e); if(ix>=0) enemies.splice(ix,1);
        continue;
      }
    }
    else if(e.ai==='bossorb'){
      e.wob+=dt*3;
      e.fuseT-=dt;
      if(e.shootCd>0){
        e._st=(e._st||0)-dt;
        if(e._st<=0){ e._st=e.shootCd; const pa=Math.atan2(player.y-e.y,player.x-e.x); for(let i=-1;i<=1;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.2)*235,vy:Math.sin(pa+i*0.2)*235,r:7,dmg:9,life:3.4,srcName:e.label}); }
      }
      if(e.fuseT<=0){
        if(e.fail==='aoe'){
          hurtPlayer(e.failDmg||40,e.label||'전체 피해'); screenShake=Math.max(screenShake||0,16); hitFlash=Math.max(hitFlash||0,0.5);
          for(let i=0;i<24;i++){ const a2=i/24*TAU; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*230,vy:Math.sin(a2)*230,r:8,dmg:Math.max(8,Math.round((e.failDmg||40)*0.28)),life:3.2,srcName:e.label}); }
          banner('💥 '+(e.label||'목표물')+' 폭발!','막지 못했다',900);
        } else if(e.fail==='slow'){
          player.slowDebuffT=Math.max(player.slowDebuffT||0,5);
          banner('🪢 '+(e.label||'속박')+'!','이동속도가 크게 떨어졌다',900);
          burst(player.x,player.y,'#c46bff',16,180);
        }
        burst(e.x,e.y,e.color||'#ff4dd2',20,240); beep(70,0.3,'sawtooth',0.06);
        const ix=enemies.indexOf(e); if(ix>=0) enemies.splice(ix,1);
        continue;
      }
    }
    else if(e.ai==='decoy'){
      e.wob+=dt*3; e.life-=dt;
      if(e.hp < (e._lastHp||e.hp)){
        e._lastHp=e.hp=999999;
        const pa=Math.atan2(player.y-e.y,player.x-e.x);
        for(let i=-3;i<=3;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.16)*240,vy:Math.sin(pa+i*0.16)*240,r:8,dmg:12,life:3.2,srcName:'분신 반격'});
        burst(e.x,e.y,'#ff4d6d',16,200); beep(90,0.12,'square',0.05); banner('✖ 가짜!','반격탄',700);
      }
      if(e.life<=0){ burst(e.x,e.y,e.color||'#ff4dd2',12,180); const ix=enemies.indexOf(e); if(ix>=0) enemies.splice(ix,1); continue; }
    }
    else if(e.ai==='hyechul'){
      const ph=e.phase||1; e.wob+=dt*2;
      // ── [3페] 강림 슬램 시퀀스: 상단을 벗어나 직접 덮친다 ──
      if(e.slamState){
        e.faceAng=a;
        if(e.slamState==='warn'){
          e.slamT-=dt; e.wob+=dt*16;
          if(Math.random()<0.55) burst(e.x+rand(-e.r,e.r),e.y+rand(-e.r,e.r),'#ff5a2a',2,210);
          if(e.slamT<=0){ e.slamTx=clamp(player.x,60,W-60); e.slamTy=clamp(player.y,150,H-90); e.slamState='dive'; warnAoE(e.slamTx,e.slamTy,175,0.55,0.4,2,'혜철이 강림','#ff5a2a'); burst(e.slamTx,e.slamTy,'#ff5a2a',16,220); }
        } else if(e.slamState==='dive'){
          const dx=e.slamTx-e.x, dy=e.slamTy-e.y, dd=Math.hypot(dx,dy);
          if(dd>6){ const step=Math.min(dd,e.spd*9*dt); e.x+=dx/dd*step; e.y+=dy/dd*step; e.faceAng=Math.atan2(dy,dx); burst(e.x,e.y,'#ff5a2a',3,100); }
          if(dd<=10){ intentShockwave(e.x,e.y,170,ph>=3?20:16,'혜철이 강림'); screenShake=Math.max(screenShake||0,15); burst(e.x,e.y,'#ff5a2a',26,340); if(typeof beep==='function')beep(58,0.4,'sawtooth',0.09); e.slamState='recover'; e.slamT=0.7; }
        } else {
          e.slamT-=dt;
          const rtx=clamp(player.x,80,W-80), rty=clamp(player.y-210,110,260);
          e.x+=Math.sign(rtx-e.x)*Math.min(Math.abs(rtx-e.x),e.spd*2.4*dt);
          e.y+=Math.sign(rty-e.y)*Math.min(Math.abs(rty-e.y),e.spd*1.8*dt);
          if(e.slamT<=0){ e.slamState=null; e.atkT=1.0; }
        }
      } else {
      const tx=clamp(player.x,80,W-80), ty=clamp(player.y-210,110,260);
      e.x+=Math.sign(tx-e.x)*Math.min(Math.abs(tx-e.x),e.spd*dt);
      e.y+=Math.sign(ty-e.y)*Math.min(Math.abs(ty-e.y),e.spd*0.55*dt);
      e.faceAng=a;
      // ── 하이브 과부하 충전 중: 소환·공격 정지, 충전 후 화면 링 버스트 ──
      if(e.climaxT>0){
        e.climaxT-=dt; e.wob+=dt*18;
        if(Math.random()<0.6) burst(e.x+rand(-e.r,e.r),e.y+rand(-e.r,e.r),'#ff5a2a',2,220);
        if(e.climaxT<=0){
          for(let ring=0;ring<3;ring++){ const k=18+ring*4, sp=150+ring*55; for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*0.22+(e.atkN||0)*0.7; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:8,dmg:(ph>=3?15:13),life:4.2,spore:true}); } }
          spawnCreep(e.x,e.y); screenShake=Math.max(screenShake||0,16);
          banner('💥 과부하 폭발!','',800); beep(60,0.5,'sawtooth',0.09);
          e.atkT=2.4;
        }
      } else {
        // 소환은 비중을 낮춰 가끔만 — 발사 패턴에 집중
        e.summonT=(e.summonT==null?6.0:e.summonT)-dt;
        if(e.summonT<=0){
          const plan=hyechulSummonPlan(ph);
          hyechulSpawnEgg(e,plan.type,plan.count,plan.hatch);
          e.summonT=plan.next*1.6;
        }
        // 한 발사 패턴을 3~4회 연속 퍼붓고 → 휴식 → 다음 패턴
        e.atkT=(e.atkT==null?1.4:e.atkT)-dt;
        if(e.atkT<=0){
          // 새 패턴 세트 시작 시점: ph3 강림 슬램 → ph2~3 충전 폭발 → 일반 패턴
          if((e.atkRep||0)<=0 && ph>=3 && (e._slamCd=(e._slamCd||0)-1)<=0 && Math.random()<0.34){
            e.slamState='warn'; e.slamT=0.9; e._slamCd=3;
            banner('💢 강림 예고','발밑을 피하라!',900); if(typeof beep==='function')beep(70,0.3,'sawtooth',0.07); screenShake=Math.max(screenShake||0,6);
            e.atkT=0.5;
          } else if((e.atkRep||0)<=0 && ph>=2 && (e._climaxCd=(e._climaxCd||0)-1)<=0 && Math.random()<0.36){
            e.climaxT=ph>=3?1.3:1.1; e._climaxCd=2;
            banner('🔥 과부하 충전','흩어져라!',1000); if(typeof beep==='function')beep(55,0.5,'sawtooth',0.08); screenShake=Math.max(screenShake||0,7);
            e.atkT=1.0;
          } else {
            if((e.atkRep||0)<=0){ e._focusPat=pickHyechulFocusPattern(e,ph); e.atkRep=({rain:4,acidSwamp:4,homingSpore:1,acidStorm:1}[e._focusPat])||(3+(Math.random()<0.5?1:0)); }
            runHyechulPatternFocus(e,ph,e._focusPat);
            e.atkRep--;
            if(e.atkRep>0) e.atkT=ph===1?0.80:(ph===2?0.68:0.58);   // 세트 내 반복 간격(짧음)
            else e.atkT=ph===1?2.4:(ph===2?2.1:1.85);               // 세트 종료 후 휴식(긺)
          }
        }
      }
      }
    }
    else if(e.ai==='charge'){
      if(!e.cs) e.cs='approach';
      if(e.cs==='approach'){
        e.faceAng=a;
        const apspd=e.spd*((e.type==='rhino_beetle'&&d>470)?1.7:1);   // 자잘자: 470 밖이면 추격 가속 (카이팅 억제)
        e.x+=Math.cos(a)*apspd*dt; e.y+=Math.sin(a)*apspd*dt;
        if(e.coolT<=0 && d<470){
          if(e.type==='rhino_beetle'){
            const worms=enemies.filter(x=>x.type==='earthworm').length, roll=Math.random();
            if(worms<6 && roll<0.24){ e.cs='cast'; e.csT=0.6; }
            else if(roll<0.5){ e.cs='spit'; e.csT=0.35; e.spitRep=3+(Math.random()<0.5?1:0); e.aimX=Math.cos(a); e.aimY=Math.sin(a); }
            else if(roll<0.72){ e.cs='burst'; e.csT=0.55; e.burstRep=3+(Math.random()<0.5?1:0); }
            else { e.cs='wind'; e.csT=0.52; if(sfx.enemyWarn) sfx.enemyWarn(); }
          } else { e.cs='wind'; e.csT=e.type==='pobear'?0.55:0.45; if(sfx.enemyWarn) sfx.enemyWarn(); }
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
          const pa=Math.atan2(player.y-e.y,player.x-e.x);   // 매 발사마다 플레이어 추적
          for(let i=-2;i<=2;i++) eBullets.push({x:e.x,y:e.y,vx:Math.cos(pa+i*0.22)*260,vy:Math.sin(pa+i*0.22)*260,r:7,dmg:18,life:3,spore:true});
          beep(300,0.05,'square',0.05);
          e.spitRep=(e.spitRep||1)-1;
          if(e.spitRep>0){ e.csT=0.32; }                    // 연사 간격
          else { e.cs='rest'; e.csT=0.4; e.coolT=1.2; }
        }
      } else if(e.cs==='burst'){
        e.csT-=dt; e.wob+=dt*24;
        if(e.csT<=0){
          const k=14, off=e.wob;                            // wob로 매 발사 회전 → 촘촘한 방사
          for(let i=0;i<k;i++){ const a2=i/k*TAU+off; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*230,vy:Math.sin(a2)*230,r:7,dmg:18,life:3.2,spore:true}); }
          burst(e.x,e.y,'#caa14a',16,210); beep(120,0.3,'sawtooth',0.07);
          e.burstRep=(e.burstRep||1)-1;
          if(e.burstRep>0){ e.csT=0.46; }                   // 연사 간격(사이로 빠질 틈 확보)
          else { e.cs='rest'; e.csT=0.4; e.coolT=1.6; }
        }
      } else if(e.cs==='wind'){
        e.csT-=dt; e.wob+=dt*26; e.faceAng=a; e.aimX=Math.cos(a); e.aimY=Math.sin(a);
        if(e.csT<=0){ e.cs='dash'; e.csT=(e.type==='rhino_beetle'||e.type==='pobear')?0.62:0.5; if(sfx.enemyDash) sfx.enemyDash(); }
      } else if(e.cs==='jump'){
        const tx=clamp(e._jumpTx==null?e.x:e._jumpTx,e.r,W-e.r);
        const ty=clamp(e._jumpTy==null?e.y:e._jumpTy,e.r,H-e.r);
        const dx=tx-e.x, dy=ty-e.y, dist=Math.hypot(dx,dy);
        e.csT-=dt; e.wob+=dt*20;
        if(dist>1){
          e.faceAng=Math.atan2(dy,dx);
          const step=Math.min(dist,e.spd*10.2*dt);
          e.x+=dx/dist*step; e.y+=dy/dist*step;
        }
        if(dist<=4||e.csT<=0){
          e.x=clamp(e.x,e.r,W-e.r); e.y=clamp(e.y,e.r,H-e.r);
          warnAoE(e.x,e.y,rand(120,135),0.8,0.45,Math.max(12,Math.round((e.dmg||22)*0.8)),e.name||e.label,e.color);
          screenShake=Math.max(screenShake,7);
          e.cs='rest'; e.csT=0.6; e.coolT=1.7;
          e._jumpTx=null; e._jumpTy=null; e._jumpMax=null;
        }
      } else if(e.cs==='reaim'){
        e.csT-=dt; e.wob+=dt*28; e.faceAng=a;
        if(e.csT<=0){ const ra=Math.atan2(player.y-e.y,player.x-e.x); e.aimX=Math.cos(ra); e.aimY=Math.sin(ra); e.cs='dash'; e.csT=0.50; playPatternSfx('enemyDash2',()=>{ beep(180,0.08,'sawtooth',0.05); setTimeout(()=>beep(330,0.045,'square',0.03),45); },0.22); }
      } else if(e.cs==='dash'){
        e.csT-=dt; e.faceAng=Math.atan2(e.aimY,e.aimX);
        const dashMul=e.type==='rhino_beetle'?6.1:(e.type==='pobear'?5.9:5.5); e.x+=e.aimX*e.spd*dashMul*dt; e.y+=e.aimY*e.spd*dashMul*dt;
        if(e.x<=e.r||e.x>=W-e.r||e.y<=e.r||e.y>=H-e.r){
          if(e.type==='rhino_beetle'){ e.stunT=Math.max(e.stunT||0,2); burst(e.x,e.y,'#ffd34d',16,220); }
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
        if(e.csT<=0 && !e._bounced){ e._bounced=false; if(e.type==='rhino_beetle'&&e.hp<=e.maxhp*0.55&&!e._doubleDashUsed&&Math.random()<0.65){ e._doubleDashUsed=true; e.cs='reaim'; e.csT=rand(0.22,0.32); e.coolT=0; burst(e.x,e.y,'#ffd34d',10,160); } else { e.cs='rest'; e.csT=0.6; e.coolT=1.7; } }
        if(e.csT<=0 && e._bounced){ e._bounced=false; e.cs='rest'; e.csT=0.6; e.coolT=1.7; }
      } else { e.csT-=dt; if(e.csT<=0) e.cs='approach'; }
    }
    else if(e.ai==='kkotchung'){
      // === 양갱: 3페이즈 엘리트 ===
      const ph=e.phase||1;
      e.wob+=dt*2.2;

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
            for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*0.28+(e.atkN||0)*0.7; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,r:9,dmg:11,life:4.2,srcName:'양갱',kkot:true}); }
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
              for(let i=0;i<k;i++){ const a2=i/k*TAU+(e.atkN||0)*0.7; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*195,vy:Math.sin(a2)*195,r:8,dmg:9,life:3.8,srcName:'양갱',kkot:true}); }
              for(let i=0;i<k;i++){ const a2=i/k*TAU+Math.PI/k+(e.atkN||0)*0.7; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*235,vy:Math.sin(a2)*235,r:7,dmg:8,life:3.4,srcName:'양갱',kkot:true}); }
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
              if(sfx.enemyCore) sfx.enemyCore();
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
              for(let ring=0;ring<3;ring++){ for(let i=0;i<k;i++){ const a2=i/k*TAU+ring*(Math.PI/k)+(e.atkN||0)*0.7; eBullets.push({x:e.x,y:e.y,vx:Math.cos(a2)*(185+ring*38),vy:Math.sin(a2)*(185+ring*38),r:8,dmg:10,life:4.0,srcName:'양갱',kkot:true}); } }
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
              if(sfx.enemyCore) sfx.enemyCore();
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
      e.spinAng=(e.spinAng||0)+dt*(e.enr?4.5:2.4); if(e._lastCtrlT>0)e._lastCtrlT-=dt;

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
        if(typeof GL!=='undefined') GL.keyRev=Math.min(Math.max(GL.keyRev||0,3.0),3.0); if(sfx.enemyGlitch) sfx.enemyGlitch();
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
          if(sfx.enemyGlitch) sfx.enemyGlitch(); screenShake=Math.max(screenShake||0,10);
          // 0.45초 뒤 슬로우 — 탄이 날아오는 도중에 걸림
          setTimeout(()=>{
            slowmoT=2.8; timeScale=0.34;
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
          timeScale=2.7; if(sfx.enemyGlitch) sfx.enemyGlitch();
          banner('💿 B면 플레이','속도가 달라진다!',600);
          beep(440,0.08,'square',0.04);
          setTimeout(()=>{ timeScale=0.38; if(sfx.enemyWarn) sfx.enemyWarn(); banner('💿 …','',400); beep(100,0.06,'sine',0.04); }, 380);
          setTimeout(()=>{ timeScale=1; if(sfx.enemyCast) sfx.enemyCast(); }, 1350);
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
          if(typeof GL!=='undefined' && !(e._lastCtrlT>0)){ GL.keyRev=en?4.5:3.0; e._lastCtrlT=6.0; if(sfx.enemyGlitch) sfx.enemyGlitch(); }
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
    if(!(e.ai==='submerge_charge'&&e.submerged) && enemyTouchBaseDamage(e)>0 && dist2(e.x,e.y,player.x,player.y)<(e.r+player.r)**2){
      const canContactHit=player.iframes<=0&&player.dodging<=0&&player.buffs.shield<=0;
      hurtPlayer(enemyTouchDamage(e), e.name||e.label||'시청자');
      if(e.type==='goblin_bomber'&&canContactHit){ const ka=Math.atan2(e.y-player.y,e.x-player.x); e.x=clamp(e.x+Math.cos(ka)*86,e.r,W-e.r); e.y=clamp(e.y+Math.sin(ka)*86,e.r,H-e.r); e.stunT=Math.max(e.stunT||0,0.28); e._fuse=false; e._fuseT=0; }
    }
  }

  // 보스
  if(boss&&!enemyFrozen) updateBoss(dt);
  updateKijoFx(dt);

  // 픽업
  for(let i=pickups.length-1;i>=0;i--){
    const pk=pickups[i]; pk.life-=dt; pk.bob+=dt*6;
    // 자석
    const d=Math.hypot(player.x-pk.x,player.y-pk.y);
    if(d<player.magnet){
      const a=Math.atan2(player.y-pk.y,player.x-pk.x);
      pk.x+=Math.cos(a)*260*dt; pk.y+=Math.sin(a)*260*dt;
      if(pk.type==='heart') pk.baseY=pk.y;
    }else if(pk.type==='heart'){
      pk.y=pk.baseY;
    }else{ pk.x+=pk.vx*dt; pk.y+=pk.vy*dt; pk.vy+=200*dt; pk.vx*=0.96; if(pk.y>H-20){pk.y=H-20;pk.vy*=-0.4;} }
    if(d<player.r+pk.r){
      if(pk.type==='gold'){ addGold(pk.amt,'roomReward'); sfx.coin(); }
      else if(pk.type==='heart'){ healPlayer(pk.amt); sfx.pick(); }
      pickups.splice(i,1); updateHUD(); continue;
    }
    if(pk.life<=0) pickups.splice(i,1);
  }

  updateHazards(dt);
  updateA3Systems(dt);
  // 파티클
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.92; p.vy*=0.92; p.life-=dt;
    if(p.life<=0) particles.splice(i,1);
  }
  cleanupCombatArrays();
  updatePerfDebug(dt);

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
NODE_PIX.campfire=miniPixelIconSrc('#3b2119','#ffb24a','flame');
NODE_PIX.elite=miniPixelIconSrc('#361f32','#f1f2f7','skull');
const POTION_PIX={
  heal:{c:'#ff5f86',c2:'#fff3bf',m:'plus'},
  combat:{c:'#ff4d4d',c2:'#ffd86b',m:'sword'},
  swift:{c:'#ffd86b',c2:'#fff3bf',m:'bolt'},
  dodge_refill:{c:'#38e8ff',c2:'#dffaff',m:'swirl'},
  greater_heal:{c:'#5dff9b',c2:'#dffaff',m:'plus'},
  fury:{c:'#ff7a2f',c2:'#ffd86b',m:'flame'},
  focus:{c:'#5aa9ff',c2:'#dffaff',m:'target'},
  ironclad:{c:'#9fb4d0',c2:'#dffaff',m:'shield'},
  lightning_potion:{c:'#ffe45c',c2:'#ffffff',m:'bolt'},
  bomb_potion:{c:'#ff7b55',c2:'#2a2038',m:'bomb'},
  berserk_potion:{c:'#ff355d',c2:'#ffd86b',m:'claw'},
  hyperfocus:{c:'#c98bff',c2:'#ffffff',m:'target'},
  regen_potion:{c:'#47d66f',c2:'#dffaff',m:'leaf'},
  barrier:{c:'#78f2ff',c2:'#ffffff',m:'shield'},
  ghost:{c:'#cfd8ff',c2:'#ffffff',m:'ghost'},
  holy:{c:'#fff3bf',c2:'#ffd86b',m:'cross'},
  time_stop:{c:'#7d8cff',c2:'#dffaff',m:'hourglass'},
  immortal:{c:'#f5f8ff',c2:'#8be8ff',m:'wing'},
  chalice:{c:'#ffd86b',c2:'#fff3bf',m:'cup'},
  awakening:{c:'#ff7ad9',c2:'#8be8ff',m:'star'}
};
const POTION_PIX_ALIAS={
  rage:'fury',haste:'swift',shield:'ironclad',dodge:'dodge_refill',
  lightning:'lightning_potion',bomb:'bomb_potion',berserk:'berserk_potion',
  overfocus:'hyperfocus',regen:'regen_potion',timestop:'time_stop'
};
const POTION_PIX_CACHE={};
function potionCanonicalId(id){
  id=String(id||'');
  return POTION_PIX_ALIAS[id]||id;
}
function potionPixMark(m,c){
  const r=(x,y,w,h,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+(col||c)+'"/>';
  if(m==='plus') return r(7,5,2,7)+r(5,7,6,2);
  if(m==='cross') return r(7,4,2,8)+r(5,6,6,2)+r(6,9,4,2);
  if(m==='sword') return r(8,4,1,7)+r(7,5,3,1)+r(6,10,5,1)+r(7,11,1,2)+r(9,11,1,2);
  if(m==='bolt') return r(8,4,3,1)+r(7,5,3,1)+r(6,6,3,1)+r(7,7,3,1)+r(8,8,2,1)+r(7,9,2,1)+r(6,10,2,1);
  if(m==='swirl') return r(5,6,5,1)+r(4,7,1,3)+r(9,7,1,1)+r(6,9,4,1)+r(6,8,1,1)+r(8,10,1,1);
  if(m==='flame') return r(8,4,1,1)+r(7,5,2,2)+r(6,7,4,1)+r(5,8,6,3)+r(6,11,4,1);
  if(m==='target') return r(6,5,4,1)+r(5,6,1,4)+r(10,6,1,4)+r(6,10,4,1)+r(7,7,2,2);
  if(m==='shield') return r(5,5,6,2)+r(5,7,6,2)+r(6,9,4,2)+r(7,11,2,1);
  if(m==='bomb') return r(6,7,5,4)+r(7,6,3,1)+r(10,5,2,1)+r(11,4,1,1);
  if(m==='claw') return r(5,5,1,6)+r(8,4,1,7)+r(11,5,1,6);
  if(m==='leaf') return r(6,8,1,4)+r(7,6,4,2)+r(8,8,3,1)+r(5,9,2,1);
  if(m==='ghost') return r(5,5,6,5)+r(5,10,1,2)+r(7,10,1,1)+r(9,10,1,2)+r(6,7,1,1)+r(10,7,1,1);
  if(m==='hourglass') return r(5,5,6,1)+r(6,6,4,1)+r(7,7,2,2)+r(6,9,4,1)+r(5,10,6,1);
  if(m==='wing') return r(4,6,2,1)+r(5,7,2,1)+r(6,8,2,1)+r(9,8,2,1)+r(10,7,2,1)+r(11,6,2,1);
  if(m==='cup') return r(5,5,6,1)+r(5,6,6,3)+r(6,9,4,1)+r(7,10,2,2)+r(6,12,4,1);
  if(m==='star') return r(8,4,1,2)+r(6,6,5,1)+r(7,7,3,1)+r(5,8,7,1)+r(7,9,3,1)+r(6,10,1,1)+r(10,10,1,1);
  return r(7,6,2,4);
}
function potionPixSrc(id){
  const key=potionCanonicalId(id);
  const spec=POTION_PIX[key];
  if(!spec) return '';
  if(POTION_PIX_CACHE[key]) return POTION_PIX_CACHE[key];
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'+
    '<rect width="16" height="16" fill="none"/>'+
    '<rect x="6" y="1" width="4" height="2" fill="#dffaff"/><rect x="5" y="3" width="6" height="1" fill="#39275f"/>'+
    '<rect x="4" y="4" width="8" height="10" fill="#070914"/><rect x="5" y="5" width="6" height="8" fill="'+spec.c+'"/>'+
    '<rect x="5" y="5" width="2" height="2" fill="'+spec.c2+'"/><rect x="10" y="6" width="1" height="6" fill="#000000" opacity=".22"/>'+
    potionPixMark(spec.m,'#ffffff')+
    '<rect x="4" y="4" width="8" height="1" fill="#dffaff"/><rect x="4" y="13" width="8" height="1" fill="#39275f"/>'+
  '</svg>';
  return POTION_PIX_CACHE[key]='data:image/svg+xml,'+encodeURIComponent(svg);
}
function potionIconHTML(potionOrId,sizeClass){
  const rawId=typeof potionOrId==='string'?potionOrId:(potionOrId&&potionOrId.id);
  const id=potionCanonicalId(rawId);
  const pot=(typeof potionOrId==='object'&&potionOrId)||((typeof POTIONS!=='undefined'&&POTIONS.find)?POTIONS.find(p=>p&&p.id===id):null);
  const src=potionPixSrc(id);
  const cls='potion-pix '+(sizeClass||'');
  if(src) return '<img class="'+rankBuildText(cls)+'" src="'+rankBuildText(src)+'" alt="">';
  return '<span class="'+rankBuildText(cls+' potion-pix-fallback')+'">'+rankBuildText((pot&&pot.icon)||'🧪')+'</span>';
}
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
  ensureType(nodes,'shop',1,edges);
  ensureTypeInRow(nodes,'campfire',CAMP1_ROW,edges);   // 휴식 보장: 각 관문 줄에 모닷불 최소 1개
  ensureTypeInRow(nodes,'campfire',CAMP2_ROW,edges);
  placeEliteNodes(nodes);   // 자잘자 엘리트 노드 1~2개 (낮은 층 제외)
  smoothMapNodeSequences(nodes,edges);
  ensureType(nodes,'shop',1,edges);
  ensureTypeInRow(nodes,'campfire',CAMP1_ROW,edges);
  ensureTypeInRow(nodes,'campfire',CAMP2_ROW,edges);
  const startIds=nodes.filter(n=>n.row===0).map(n=>n.id);
  mapData={nm,nodes,edges:[...edges],startIds,currentId:null,reach:new Set(startIds)};
  buildBackdrop(act);
}
function rollNodeType(row){
  const bag=[];
  for(let i=0;i<42;i++) bag.push('fight');
  for(let i=0;i<24;i++) bag.push('event');
  if(row>=1) for(let i=0;i<15;i++) bag.push('shop');
  return pick(bag);
}
function isProtectedMapNode(n){
  return !n || n.row===0 || n.type==='boss' || n.type==='midboss' || n.type==='elite';
}
function wouldCreateMapSequence(nodes,edges,node,type){
  if(!edges) return false;
  const byId={};
  nodes.forEach(n=>{ byId[n.id]=n; });
  function nodeType(id){ return id===node.id?type:(byId[id]&&byId[id].type); }
  const edgeList=[...edges];
  for(let i=0;i<edgeList.length;i++){
    const [from,to]=edgeList[i].split('>');
    if(type==='shop'||type==='campfire'){
      if(nodeType(from)===type&&nodeType(to)===type) return true;
    }
    if(type==='event'){
      for(let j=0;j<edgeList.length;j++){
        const [mid,end]=edgeList[j].split('>');
        if(mid===to && nodeType(from)==='event' && nodeType(to)==='event' && nodeType(end)==='event') return true;
      }
    }
  }
  return false;
}
function ensureType(nodes,type,minRow,edges){
  if(nodes.some(n=>n.type===type)) return;
  const cand=nodes.filter(n=>n.type==='fight'&&n.row>=minRow&&!isProtectedMapNode(n));
  const safe=edges?cand.filter(n=>!wouldCreateMapSequence(nodes,edges,n,type)):cand;
  const pool=safe.length?safe:cand;
  if(pool.length) pick(pool).type=type;
}
function ensureTypeInRow(nodes,type,row,edges){
  const inRow=nodes.filter(n=>n.row===row && !isProtectedMapNode(n));
  if(!inRow.length || inRow.some(n=>n.type===type)) return;
  const safe=edges?inRow.filter(n=>!wouldCreateMapSequence(nodes,edges,n,type)):inRow;
  pick(safe.length?safe:inRow).type=type;
}
// 자잘자(엘리트) 노드 배치 — 낮은 층 제외, 난이도별 개수만큼 같은 줄 중복 없이 분산
function placeEliteNodes(nodes){
  const want=Math.max(1, Number(diffSet.eliteCount)||irand(1,2));
  const cand=nodes.filter(n=>n.type==='fight' && n.row>=4 && n.row<MAP_ROWS-1 &&
    n.row!==MIDBOSS_ROW && n.row!==CAMP1_ROW && n.row!==CAMP2_ROW);
  const usedRows=new Set(); let placed=0;
  while(placed<want && cand.length){
    const n=cand.splice(irand(0,cand.length-1),1)[0];
    if(usedRows.has(n.row)) continue;   // 같은 줄 중복 방지
    n.type='elite'; usedRows.add(n.row); placed++;
  }
}
function smoothMapNodeSequences(nodes,edges){
  const byId={};
  nodes.forEach(n=>{ byId[n.id]=n; });
  const prevMap={};
  nodes.forEach(n=>{ prevMap[n.id]=[]; });
  edges.forEach(e=>{
    const [from,to]=e.split('>');
    if(byId[from]&&byId[to]) prevMap[to].push(from);
  });
  const fixedRows=new Set([0,MIDBOSS_ROW,CAMP1_ROW,CAMP2_ROW]);
  function canChange(n){
    if(!n) return false;
    if(n.type==='boss'||n.type==='midboss'||n.type==='elite') return false;
    if(fixedRows.has(n.row)) return false;
    return true;
  }
  const sorted=nodes.slice().sort((a,b)=>a.row-b.row);
  const streak={};
  sorted.forEach(n=>{
    const type=n.type;
    const prevs=prevMap[n.id]||[];
    let maxPrevSame=0;
    prevs.forEach(pid=>{
      const p=byId[pid];
      if(p&&p.type===type&&streak[pid]!=null) maxPrevSame=Math.max(maxPrevSame,streak[pid]);
    });
    let s=maxPrevSame+1;
    if(type==='event'&&s>=3&&canChange(n)){
      n.type='fight';
      s=1;
    }
    if((type==='shop'||type==='campfire')&&s>=2&&canChange(n)){
      n.type='fight';
      s=1;
    }
    streak[n.id]=s;
  });
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
  saveRunCheckpoint();
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
let mapPanState=null;
function mapFocusNodes(){
  if(!mapData) return [];
  const reach=[...mapData.reach].map(id=>mapData.nm[id]).filter(Boolean);
  if(reach.length) return reach;
  const cur=mapData.currentId?mapData.nm[mapData.currentId]:null;
  return cur?[cur]:[];
}
function focusMapNodes(nodes,smooth,tries){
  const cont=$('mapSvg');
  const svg=cont&&cont.querySelector('svg');
  if(!cont||!svg||!nodes||!nodes.length) return;
  const rect=svg.getBoundingClientRect();
  if(!rect.width||!rect.height||!cont.clientWidth||!cont.clientHeight){
    if((tries||0)<8) requestAnimationFrame(()=>focusMapNodes(nodes,smooth,(tries||0)+1));
    return;
  }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  nodes.forEach(n=>{
    minX=Math.min(minX,n.x); maxX=Math.max(maxX,n.x);
    minY=Math.min(minY,n.y); maxY=Math.max(maxY,n.y);
  });
  const cx=(minX+maxX)*0.5;
  const cy=(minY+maxY)*0.5;
  const sx=rect.width/MAP_W;
  const sy=rect.height/MAP_H;
  const maxLeft=Math.max(0,cont.scrollWidth-cont.clientWidth);
  const maxTop=Math.max(0,cont.scrollHeight-cont.clientHeight);
  const left=clamp(cx*sx-cont.clientWidth*0.5,0,maxLeft);
  const top=clamp(cy*sy-cont.clientHeight*0.52,0,maxTop);
  if(smooth&&cont.scrollTo) cont.scrollTo({left,top,behavior:'smooth'});
  else { cont.scrollLeft=left; cont.scrollTop=top; }
}
function focusReachableMapNodes(smooth){
  focusMapNodes(mapFocusNodes(),smooth);
}
function scheduleMapFocus(smooth){
  requestAnimationFrame(()=>requestAnimationFrame(()=>focusReachableMapNodes(smooth)));
}
function setupMapPan(){
  const cont=$('mapSvg');
  if(!cont||cont._mapPanReady) return;
  cont._mapPanReady=true;
  cont.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0) return;
    const node=e.target.closest&&e.target.closest('.mapnode.reach');
    mapPanState={
      id:e.pointerId,startX:e.clientX,startY:e.clientY,
      left:cont.scrollLeft,top:cont.scrollTop,moved:false,
      nodeId:node?node.getAttribute('data-id'):null
    };
    cont.setPointerCapture&&cont.setPointerCapture(e.pointerId);
  });
  cont.addEventListener('pointermove',e=>{
    if(!mapPanState||mapPanState.id!==e.pointerId) return;
    const dx=e.clientX-mapPanState.startX;
    const dy=e.clientY-mapPanState.startY;
    if(!mapPanState.moved&&Math.hypot(dx,dy)>5){
      mapPanState.moved=true;
      cont.classList.add('is-dragging');
    }
    if(mapPanState.moved){
      cont.scrollLeft=mapPanState.left-dx;
      cont.scrollTop=mapPanState.top-dy;
      e.preventDefault();
    }
  });
  function endPan(e){
    if(!mapPanState||mapPanState.id!==e.pointerId) return;
    const st=mapPanState;
    mapPanState=null;
    cont.classList.remove('is-dragging');
    cont.releasePointerCapture&&cont.releasePointerCapture(e.pointerId);
    if(!st.moved&&st.nodeId) selectNode(mapData.nm[st.nodeId]);
  }
  cont.addEventListener('pointerup',endPan);
  cont.addEventListener('pointercancel',e=>{
    if(!mapPanState||mapPanState.id!==e.pointerId) return;
    mapPanState=null;
    cont.classList.remove('is-dragging');
  });
  cont.addEventListener('wheel',e=>{
    e.preventDefault();
    const primary=Math.abs(e.deltaY)>=Math.abs(e.deltaX);
    cont.scrollTop+=e.deltaY;
    cont.scrollLeft+=(e.shiftKey&&primary)?e.deltaY:e.deltaX;
  },{passive:false});
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
       (NODE_PIX[n.type]?('<image class="map-node-pix" href="'+NODE_PIX[n.type]+'" x="'+(n.x-10)+'" y="'+(n.y-10)+'" width="20" height="20" style="image-rendering:pixelated"/>'):('<text x="'+n.x+'" y="'+(n.y+4)+'" font-size="12" text-anchor="middle">'+(NODE_ICON[n.type]||'?')+'</text>'))+'</g>';
  });
  s+='</svg>';
  cont.innerHTML=s;
  setupMapPan();
  const centerBtn=$('mapCenterBtn');
  if(centerBtn) centerBtn.onclick=()=>focusReachableMapNodes(true);
  scheduleMapFocus(false);
  cont.querySelectorAll('.mapnode.reach').forEach(g=>{
    g.style.cursor='pointer';
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
  if(nextGoldPenalty>0){ const loss=spendGold(Math.round(gold*nextGoldPenalty),'other'); nextGoldPenalty=0; if(loss>0) setTimeout(()=>banner('분위기 하락','골드 -'+loss,1200),200); updateHUD(); }
  if(player.roomClearHeal>0) healPlayer(player.roomClearHeal,player.x,player.y);
  combatXpMul=1;
  if(player.infiniteRefill&&Math.random()<0.20){
    const pot=rollPotion();
    if(addPotion(pot)) setTimeout(()=>banner('무한 리필',pot.name+' 획득',1100),180);
  }
  banner('CLEAR', t==='boss'?'보스 격파!':(t==='midboss'?'중간보스 격파!':(t==='elite'?'자잘자 격파!':'정리 완료')), 1000);
  if(t==='fight'&&!combatTookHit) unlockAchievement('no_hit_room');
  if(t==='fight'&&roomStartedAt&&performance.now()-roomStartedAt<=10000) unlockAchievement('quick_room_clear');
  if(t==='boss'&&!combatTookHit) unlockAchievement('no_hit_boss');
  checkLowHpRoomAchievements();
  if(t==='midboss'){
    userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
    userProgress.stats.totalBosses+=1;
    if(act>=2) unlockAchievement('defeat_yanggaeng');
    else unlockAchievement('defeat_hyechul');
    saveUserProgress();
  }
  if(t==='elite'){
    userProgress.stats=normalizeProgressStats(userProgress&&userProgress.stats);
    userProgress.stats.totalElites+=1;
    saveUserProgress();
  }
  setTimeout(()=>{
    // 도전과제(노히트) 판정 우선
    if(combatChallenge==='nohit'){
      const ok=!combatTookHit; combatChallenge=null;
      if(ok) offerRelics(3,'🏆 도전 성공!','무피격 클리어 — 유물 획득', finishNode);
      else { banner('도전 실패','피격당했다 — 보상 없음',1500); finishNode(); }
      return;
    }
    if(combatSpecialReward){
      const reward=combatSpecialReward; combatSpecialReward=null;
      reward();
      return;
    }
    if(t==='midboss'){ const bonus=irand(70,105); addGold(bonus,'roomReward'); let potTxt=''; if(act>=3){ const pot=rollPotion(); if(addPotion(pot)) potTxt=' · '+pot.name; } updateHUD(); offerRelics(3,'중간보스 보상',(act>=3?'온스터를 쓰러뜨린 보상이다':(act>=2?'박제인간을 쓰러뜨린 보상이다':'혜철이를 쓰러뜨린 보상이다'))+' · 골드 +'+bonus+potTxt, finishNode); }
    else if(t==='boss'&&act>=MAX_ACT){ finishNode(); }
    else if(t==='boss') offerRelics(3,'👑 보스 보상','막 보스를 쓰러뜨린 보상이다 · 좋은 유물 확률 증가', finishNode, {weights:BOSS_RELIC_WEIGHTS});
    else if(combatRewardMul>=2){ const bonus=Math.round(irand(36,65)*combatRewardMul); addGold(bonus,'roomReward'); combatRewardMul=1; offerRelics(3,'🎁 합방 보상','보상이 2배로! 골드 +'+bonus, finishNode); }
    else if(roomHadElite){ const bonus=irand(80,125); addGold(bonus,'roomReward'); updateHUD(); banner('⚔️ 자잘자 보상','골드 +'+bonus,1400); finishNode(); }
    else if(combatRewardMul>1){ const bonus=Math.round(irand(24,44)*(combatRewardMul-1)); addGold(bonus,'roomReward'); combatRewardMul=1; updateHUD(); offerSmallReward(); }
    else offerSmallReward();
  }, 700);
}
function finishNode(){
  const wasBoss = pendingNode && pendingNode.type==='boss';
  if(pendingNode){ pendingNode.done=true; mapData.currentId=pendingNode.id; }
  pendingNode=null;
  if(wasBoss){
    if(act===1) unlockAchievement('clear_act1');
    if(act===2) unlockAchievement('clear_act2');
    if(act>=MAX_ACT){ victory(); return; }
    act++; currentRow=0; genMap();
    showMap();
    banner((actTuning(act).name||act+'막')+' 진입','새 지도가 열렸다',1600);
  }else{
    showMap();
  }
}

// ========================================================
//  미지(이벤트)
// ========================================================
const LEGACY_EVENTS=[
  {tag:'❓ 회복의 샘',title:'맑은 샘물',body:'은은하게 빛나는 샘이 보인다. 한 모금 마실까?',
   choices:[
     {t:'마신다 — 체력 35 회복',f:()=>{healPlayer(35,player.x,player.y);banner('회복','체력 +35',1200);finishNode();}},
     {t:'그냥 지나간다',f:()=>finishNode()},
   ]},
  {tag:'❓ 떠돌이 상인',title:'수상한 보따리상',body:'"포션 하나 거저 주지. 대신 자릿세로 골드 좀 받겠네."',
   choices:[
     {t:'받는다 — 랜덤 포션, 골드 -15',f:()=>{spendGold(15,'event');addPotion(rollPotion());banner('포션 획득','',1200);finishNode();}},
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
     {t:'던진다',f:()=>{ if(Math.random()<0.5){addGold(60,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('🪙 앞면!','대박 — 골드 +60',1700);} else {player.hp=Math.max(1,player.hp-20);try{sfx.hurt&&sfx.hurt();}catch(e){}banner('🪙 뒷면...','쪽박 — 체력 -20',1700);} updateHUD(); finishNode(); }},
     {t:'주머니에 넣는다',f:()=>finishNode()},
   ]},
  // ===== 신규 이벤트 =====
  {tag:'⚠️ 방송 사고',title:'송출 오류 발생',body:'장비에 문제가 생겼다. 무리하게 밀어붙이면 한쪽이 강해지고 다른 쪽이 약해진다.',
   choices:[
     {t:'화력에 올인 — 공격력 +1, 받는 피해 +5%',f:()=>{player.dmg+=1;player.armor-=0.05;banner('공격력 +1 / 방어 -5%','영구',1400);updateHUD();finishNode();}},
     {t:'안전제일 — 받는 피해 -8%, 공격력 -0.5',f:()=>{player.armor+=0.08;player.dmg=Math.max(1,player.dmg-0.5);banner('방어↑ / 공격력 -0.5','영구',1400);updateHUD();finishNode();}},
     {t:'기동 강화 — 이동 +12%, 최대체력 -8%',f:()=>{player.spd+=20;player.maxhp=Math.round(player.maxhp*0.92);player.hp=Math.min(player.hp,player.maxhp);banner('이동↑ / 체력↓','영구',1400);updateHUD();finishNode();}},
   ]},
  {tag:'🚨 도네 협박',title:'정체불명의 후원',body:'"골드 안 보내면 스왓 부른다." 무시하면 그만이지만, 응하면 가끔 답례가 온다.',
   choices:[
     {t:'무시한다 (안전)',f:()=>{banner('무시했다','아무 일 없었다',1200);finishNode();}},
     {t:'응한다 — 골드 -40, 15% 확률로 유물',f:()=>{spendGold(40,'event');updateHUD();if(Math.random()<0.15){offerRelics(3,'협박범의 답례','뜻밖의 보답이 왔다',finishNode);}else{banner('골드 -40','…답례는 없었다',1300);finishNode();}}},
   ]},
  {tag:'😠 악성 안티 등장',title:'시비 거는 안티',body:'채팅을 도배하는 악성 안티. 밴을 때려 본보기를 보일까, 그냥 무시할까?',
   choices:[
     {t:'밴 때린다 — 즉시 전투(클리어 시 골드 보너스)',f:()=>{queueNextCombatMod({rewardMul:1.6,banner:{big:'밴 해머!',small:'안티를 처단하라'}});hideAll();startCombat('fight');state='play'; syncChrome();}},
     {t:'무시한다 — 다음 전투 보상 골드 -25%',f:()=>{nextGoldPenalty=0.25;banner('채팅 분위기 하락','다음 골드 -25%',1400);finishNode();}},
   ]},
  {tag:'📢 협찬 제안',title:'광고 읽어주기',body:'"이 영양제 한 번만 읽어주세요!" 골드는 두둑하지만 시청자가 빠져나가 다음 전투가 거세진다.',
   choices:[
     {t:'읽는다 — 골드 +80 / 다음 전투 적 강화',f:()=>{addGold(80,'event');updateHUD();queueNextCombatMod({cntMul:1.4,spdMul:1.12,banner:{big:'시청자 이탈',small:'적이 더 몰려온다'}});banner('협찬 골드 +80','',1300);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'🤝 합방 제안',title:'콜라보 방송',body:'옆 채널과 합방하면 다음 노드 보상이 2배! 대신 그 구간 적도 강해진다.',
   choices:[
     {t:'합방한다 — 다음 보상 2배 / 적 강화',f:()=>{queueNextCombatMod({rewardMul:2,hpMul:1.3,spdMul:1.08,banner:{big:'합방 시작!',small:'보상 2배 · 적 강화'}});banner('콜라보 성사','다음 전투 보상 2배',1400);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'💤 휴방',title:'잠깐 쉬어가기',body:'방송을 끄고 한숨 돌린다. 체력은 가득 차지만 이 구간 보상은 없고, 오래 쉰 만큼 다음 적이 약간 강해진다.',
   choices:[
     {t:'쉰다 — 체력 풀회복(보상 없음)',f:()=>{player.hp=player.maxhp;updateHUD();queueNextCombatMod({hpMul:1.15,spdMul:1.05,banner:{big:'오래 쉬었다',small:'적이 조금 강해졌다'}});banner('휴방','체력 가득',1400);finishNode();}},
     {t:'방송 계속',f:()=>finishNode()},
   ]},
  {tag:'🎯 후원 목표',title:'도네 바 베팅',body:'후원 목표를 건다. 달성하면 건 골드의 큰 배수, 실패하면 베팅액이 증발한다.',
   choices:[
     {t:'30G 베팅 (55% → 순이익 +60G)',f:()=>{ if(gold<30){banner('골드 부족','',1000);finishNode();return;} spendGold(30,'event'); if(Math.random()<0.55){addGold(90,'event');banner('목표 달성!','순이익 +60G',1400);}else{banner('목표 실패','베팅 30G 증발',1400);} updateHUD(); finishNode(); }},
     {t:'80G 베팅 (40% → 유물 또는 +200G)',f:()=>{ if(gold<80){banner('골드 부족','',1000);finishNode();return;} spendGold(80,'event'); if(Math.random()<0.40){ if(Math.random()<0.5){offerRelics(3,'후원 목표 달성!','대박 보상',finishNode);}else{addGold(280,'event');banner('대박!','순이익 +200G',1500);updateHUD();finishNode();} } else {banner('목표 실패','베팅 80G 증발',1400);updateHUD();finishNode();} }},
     {t:'베팅 안 함',f:()=>finishNode()},
   ]},
  {tag:'💎 큰손 등장',title:'VIP 도네러',body:'"리액션 크게 보여줘!" 골드를 듬뿍 주지만, 다음 전투 내내 발사속도가 느려지는 핸디캡이 붙는다.',
   choices:[
     {t:'받는다 — 골드 +120 / 다음 전투 발사속도 -20%',f:()=>{addGold(120,'event');updateHUD();queueNextCombatMod({fireHandicap:1.25,banner:{big:'리액션 타임',small:'발사속도 -20%'}});banner('VIP 골드 +120','',1300);finishNode();}},
     {t:'정중히 거절',f:()=>finishNode()},
   ]},
  {tag:'⚖️ 가이드라인 경고',title:'운영진 경고',body:'"방송 정지 전에 벌금 내세요." 벌금을 내면 무사히 넘어가지만, 안 내면 다음 전투에서 제약을 받는다.',
   choices:[
     {t:'벌금 낸다 — 골드 -50',f:()=>{spendGold(50,'event');updateHUD();banner('벌금 -50','무사 통과',1300);finishNode();}},
     {t:'버틴다 — 다음 전투 적 강화 + 골드 -10%',f:()=>{queueNextCombatMod({hpMul:1.25,spdMul:1.1,banner:{big:'경고 무시',small:'적이 강해졌다'}});nextGoldPenalty=0.1;banner('경고 무시','다음 전투 강화',1400);finishNode();}},
   ]},
  {tag:'📣 시참 모집',title:'시청자 참여',body:'시청자를 아군으로 부른다. 다음 전투 동안 함께 총을 쏴주는 든든한 지원군!',
   choices:[
     {t:'부른다 — 다음 전투 아군 1명',f:()=>{ if(player.minion){banner('이미 분신 보유','효과 중복 없음',1200);finishNode();return;} queueNextCombatMod({ally:true,banner:{big:'시참 합류!',small:'아군이 함께 싸운다'}});banner('시청자 합류','다음 전투 지원',1400);finishNode();}},
     {t:'사양한다',f:()=>finishNode()},
   ]},
  {tag:'🏅 도전과제',title:'노히트 챌린지',body:'"다음 전투 노히트 클리어 시 유물 지급!" 한 대도 맞지 않고 정리하면 보상, 맞으면 꽝.',
   choices:[
     {t:'도전한다 — 다음 전투 무피격 시 유물',f:()=>{queueNextCombatMod({challenge:'nohit',banner:{big:'노히트 챌린지',small:'한 대도 맞지 마라!'}});banner('도전 수락','무피격 클리어 도전',1500);finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'🎤 저격 (디스전)',title:'스트리머 디스전',body:'다른 스트리머가 저격 방송을 켰다. 받아치면 강화된 정예와 맞짱! 이기면 시청자를 뺏어온다.',
   choices:[
     {t:'받아친다 — 강화 정예전(승리 시 유물)',f:()=>{queueNextCombatMod({hpMul:1.6,spdMul:1.1,rewardMul:1.5,banner:{big:'디스전 시작!',small:'정예를 박살내라'}});hideAll();startCombat('fight');state='play'; syncChrome();}},
     {t:'회피한다 — 골드 -25(체면 손상)',f:()=>{spendGold(25,'event');updateHUD();banner('회피','체면이 깎였다 -25G',1300);finishNode();}},
   ]},
  // legacy only: 실제 출현용 구독 알림은 EVENTS 배열에 등록되어 있다.
  {tag:'🎟️ 구독 알림',title:'시청자 선물',body:'"봉식님 구독 감사! 재도전권 하나 드릴게요~" 죽어도 다시 한 번 — 재도전 충전권을 받는다.',
   filter:()=>diffSet.maxRetries!==Infinity,
   choices:[
     {t:'감사합니다! — 재도전 횟수 +1',f:()=>{ if(grantRetryCharge(1,'구독 알림')) banner('🎟️ 재도전 +1','구독자 감사합니다!',1500); finishNode(); }},
     {t:'괜찮아요 — 그냥 지나친다',f:()=>finishNode()},
   ]},
];

function eventHpCostPct(pct){
  const loss=Math.max(1,Math.round(player.maxhp*pct));
  player.hp=Math.max(1,player.hp-loss);
  updateHUD();
  return loss;
}
function eventMaxHpDelta(amount){
  player.maxhp=Math.max(1,Math.round(player.maxhp+amount));
  player.hp=Math.min(player.hp,player.maxhp);
  updateHUD();
}
function eventMaxHpMul(mult){
  const old=player.maxhp;
  player.maxhp=Math.max(1,Math.round(player.maxhp*mult));
  player.hp=Math.min(player.hp,player.maxhp);
  updateHUD();
  return old-player.maxhp;
}
function eventRelicPool(opts){
  opts=opts||{};
  const owned=new Set(player.relics.map(r=>r.id));
  return RELICS.filter(r=>{
    if(owned.has(r.id)||!isRelicUnlockedByAchievement(r.id)) return false;
    const tier=TIER_OF[r.id]||'rare';
    if(opts.tiers&&opts.tiers.indexOf(tier)<0) return false;
    if(opts.curseOnly&&r.cls!=='curse') return false;
    if(opts.noCurse&&r.cls==='curse') return false;
    return true;
  });
}
function eventRollRelic(opts){
  opts=opts||{};
  let pool=eventRelicPool(opts);
  if(!pool.length&&opts.tiers) pool=eventRelicPool(Object.assign({},opts,{tiers:null}));
  if(!pool.length&&opts.curseOnly) pool=eventRelicPool({});
  if(!pool.length) return null;
  return weightedTake(pool.slice());
}
function eventTakeRelic(r,after){
  if(!r){
    banner('빈 보상','가져갈 유물이 없다',1200);
    updateHUD();
    (after||finishNode)();
    return;
  }
  player.relics.push(r);
  markDiscovered('relics', r.id);
  applyRelicToPlayer(r,player);
  syncDoomWorshipHp(player);
  checkRunRelicAchievements();
  try{sfx.pick&&sfx.pick();}catch(e){}
  banner(r.icon+' '+r.name,'['+relicTier(r).name+'] 획득!',1500);
  updateHUD();
  (after||finishNode)();
}
function eventGiveRelic(opts,after){
  eventTakeRelic(eventRollRelic(opts),after);
}
function eventOfferRelics(n,opts,tag,sub,after){
  relicAfter=after||null;
  let pool=eventRelicPool(opts||{});
  if(!pool.length&&opts&&opts.tiers) pool=eventRelicPool(Object.assign({},opts,{tiers:null}));
  const picks=[];
  const tmp=pool.slice();
  for(let i=0;i<n&&tmp.length;i++) picks.push(weightedTake(tmp));
  if(!picks.length){
    const a=relicAfter; relicAfter=null;
    banner('빈 보상','가져갈 유물이 없다',1200);
    if(a) a();
    return;
  }
  const cont=$('relicChoices');
  cont.innerHTML='';
  $('relicTag').textContent=tag||'유물 획득';
  $('relicSub').textContent=sub||'하나를 선택해 가져간다.';
  picks.forEach(r=>{
    const el=document.createElement('button');
    el.className='choice relic-'+(TIER_OF[r.id]||'rare');
    el.dataset.relicId=r.id;
    el.style.borderColor=relicTier(r).col;
    el.innerHTML=relicCardHTML(r);
    el.onclick=()=>{ if(el.disabled) return; Array.from(cont.children).forEach(ch=>{ ch.disabled=true; }); takeRelic(r); };
    cont.appendChild(el);
  });
  show('relic');
  chatSys('🎁 이벤트 유물 선택: '+picks.map(r=>r.name).join(' / '));
}
function eventRollPotionByRarity(rarity){
  const pool=POTIONS.filter(p=>p.rarity===rarity);
  return pick(pool.length?pool:POTIONS);
}
function eventAddPotionOrGold(pot,goldFallback){
  if(!addPotion(pot)){
    addGold(goldFallback||40,'event');
    banner('포션 가득','대신 골드 +'+(goldFallback||40),1000);
  }
  updateHUD();
}
function eventRemoveRandomRelicForGold(){
  if(!player.relics.length){
    banner('유물 없음','팔 수 있는 유물이 없다',1200);
    finishNode();
    return;
  }
  const i=irand(0,player.relics.length-1);
  const r=player.relics.splice(i,1)[0];
  addGold(300,'event');
  try{sfx.coin&&sfx.coin();}catch(e){}
  banner('수집가 거래',r.name+' 판매 · 골드 +300',1600);
  updateHUD();
  finishNode();
}
function eventCleanRelicPool(opts){
  opts=opts||{};
  const owned=new Set(player.relics.map(r=>r.id));
  return RELICS.filter(r=>{
    if(!r||owned.has(r.id)||REMOVED_RELIC_IDS.has(r.id)||!isRelicUnlockedByAchievement(r.id)) return false;
    const tier=TIER_OF[r.id]||'rare';
    if(opts.tiers&&opts.tiers.indexOf(tier)<0) return false;
    if(opts.curseOnly&&r.cls!=='curse') return false;
    if(opts.noCurse&&r.cls==='curse') return false;
    return true;
  });
}
function eventRollCleanRelic(opts){
  const pool=eventCleanRelicPool(opts);
  return pool.length?weightedTake(pool.slice()):null;
}
function eventGiveCleanRelic(opts,after){
  eventTakeRelic(eventRollCleanRelic(opts),after);
}
function eventHpCostCurrentPct(pct){
  const loss=Math.max(1,Math.round(player.hp*pct));
  player.hp=Math.max(1,player.hp-loss);
  updateHUD();
  return loss;
}
function eventRollBlackMarketRelic(){
  const tiers=Math.random()<0.75?['epic']:(Math.random()<0.88?['legend']:['mythic']);
  let r=eventRollCleanRelic({tiers:tiers});
  if(!r) r=eventRollCleanRelic({tiers:['epic','legend','mythic']});
  return r;
}
function eventGiveCurseThen(after){
  const r=eventRollCleanRelic({curseOnly:true});
  if(!r){
    banner('저주 없음','가져갈 저주 유물이 없다',1200);
    updateHUD();
    finishNode();
    return;
  }
  eventTakeRelic(r,after);
}
const EVENT_TRANSFORMABLE_PERK_NAMES=new Set([
  '공격 특화','속사 특화','민첩 특화','활력','방어 특화','광부','대구경','재생','경험치 부스트','도네 알림',
  '정밀 조준','충격파','관통','반사','연사','강철 체력','급소 연마','상점 눈썰미','전술 재정비','거인 사냥',
  '고속탄','화염탄','독침','가시 갑옷','잔상','점화','부식 표식','맹공','그림자 보법','근접 난사',
  '맹독 가열','저체력 폭주','처단','분노','치명 흡혈','치명 일격','폭주','처형 본능','다중 사격','방송 폭주'
]);
function eventIsTransformableLevelPerk(pk){
  return !!(pk&&isLevelPerkCandidate(pk)&&EVENT_TRANSFORMABLE_PERK_NAMES.has(pk.name));
}
function eventUndoLevelPerkEffect(pk){
  if(!eventIsTransformableLevelPerk(pk)) return false;
  switch(pk.name){
    case '공격 특화': player.dmg-=2; break;
    case '속사 특화': player.fireAdd-=0.08; break;
    case '민첩 특화': player.spd-=12; break;
    case '활력': player.maxhp=Math.max(1,player.maxhp-15); player.hp=Math.min(player.hp,player.maxhp); break;
    case '방어 특화': player.armor-=0.03; break;
    case '광부': player.goldMul-=0.10; break;
    case '대구경': player.bulletSize-=0.10; break;
    case '재생': player.regen-=0.5; break;
    case '경험치 부스트': player.xpMul-=0.10; break;
    case '도네 알림': player.donateChance-=0.05; break;
    case '정밀 조준': player.critChance-=0.05; break;
    case '충격파': player.stunChance-=0.05; break;
    case '관통': player.pierce-=1; break;
    case '반사': player.bounce-=1; break;
    case '연사': player.fireAdd-=0.16; break;
    case '강철 체력': player.maxhp=Math.max(1,player.maxhp-35); player.hp=Math.min(player.hp,player.maxhp); break;
    case '급소 연마': player.critMult-=0.20; break;
    case '상점 눈썰미': player.shopCostMul+=0.10; break;
    case '전술 재정비': player.roomEntryHeal-=8; break;
    case '거인 사냥': player.bossDmgMul-=0.15; break;
    case '고속탄': player.bulletSpeedMul-=0.20; break;
    case '화염탄': player.burn-=4; break;
    case '독침': player.poison-=3; break;
    case '가시 갑옷': player.thorns-=7; break;
    case '잔상': player.dodgeIframeBonus-=0.1; break;
    case '점화': player.statusDotDmgMul-=0.10; break;
    case '부식 표식': player.statusDmgMul-=0.08; break;
    case '맹공': player.dmg-=4; break;
    case '그림자 보법': player.dodgeCdMul+=0.15; break;
    case '근접 난사': player.closeProjectileDmgMul-=0.20; break;
    case '맹독 가열': player.statusDotDmgMul-=0.20; player.dmg+=0.5; break;
    case '저체력 폭주': player.lowHpAtkFlat=Math.max(0,(Number(player.lowHpAtkFlat)||0)-8); break;
    case '처단': player.dodgeBlast-=30; break;
    case '분노': player.crowdRageAtkFlat=Math.max(0,(Number(player.crowdRageAtkFlat)||0)-0.8); break;
    case '치명 흡혈': player.critHeal-=3; break;
    case '치명 일격': player.critChance-=0.20; player.critMult-=0.5; break;
    case '폭주': player.dmg-=6; break;
    case '처형 본능': player.executeInstinctDmgMul-=0.25; break;
    case '다중 사격': player.shots-=1; break;
    case '방송 폭주': player.dmg-=8; player.fireAdd-=0.20; player.damageTakenMul-=0.15; break;
    default: return false;
  }
  player.hp=Math.min(Math.max(1,player.hp),Math.max(1,player.maxhp));
  syncDoomWorshipHp(player);
  return true;
}
function eventOwnedPerkKeysExcept(oldId){
  const keys=new Set();
  sanitizeStoredLevelPerkIds(player.perkIds).forEach(id=>{
    if(id===oldId) return;
    const pk=perkByStoredId(id);
    if(!pk) return;
    keys.add(perkId(pk));
    keys.add(pk.name);
  });
  return keys;
}
function eventPerkReplacementPool(oldPk){
  const oldId=perkId(oldPk);
  const owned=eventOwnedPerkKeysExcept(oldId);
  return LEVEL_PERKS.filter(pk=>{
    const id=perkId(pk);
    return eventIsTransformableLevelPerk(pk)&&pk.g===oldPk.g&&id!==oldId&&!owned.has(id)&&!owned.has(pk.name)&&canRollPerk(pk,owned,level||1);
  });
}
function eventTransformableOwnedPerks(){
  return sanitizeStoredLevelPerkIds(player.perkIds)
    .map(id=>perkByStoredId(id))
    .filter(pk=>eventIsTransformableLevelPerk(pk)&&eventPerkReplacementPool(pk).length>0);
}
function eventCanTransformPerk(){
  return eventTransformableOwnedPerks().length>0;
}
function eventTransformRandomPerk(){
  const owned=eventTransformableOwnedPerks();
  if(!owned.length){
    banner('거울 침묵','변환 가능한 특성이 없다',1300);
    updateHUD();
    finishNode();
    return;
  }
  const oldPk=pick(owned);
  const oldId=perkId(oldPk);
  const pool=eventPerkReplacementPool(oldPk);
  const nextPk=pool.length?pick(pool):null;
  if(!nextPk||!eventUndoLevelPerkEffect(oldPk)){
    banner('거울 실패','변환 가능한 특성이 없다',1300);
    updateHUD();
    finishNode();
    return;
  }
  const nextId=perkId(nextPk);
  player.perkIds=sanitizeStoredLevelPerkIds(player.perkIds).map(id=>{
    const pk=perkByStoredId(id);
    return pk&&perkId(pk)===oldId?nextId:id;
  });
  nextPk.apply(player);
  markDiscovered('perks',nextId);
  syncDoomWorshipHp(player);
  try{sfx.pick&&sfx.pick();}catch(e){}
  banner('거울 변환',oldPk.name+' → '+nextPk.name,1800);
  updateHUD();
  finishNode();
}
// ================================================================
//  EVENT_THEMES — 이벤트별 비주얼 테마 데이터
//  tag 문자열의 이모지+텍스트로 매핑.
//  scene: 픽셀 씬 ID (evDrawScene 참조)
//  accent: 강조색 (hex)
//  bg: 배경 radial-gradient
//  tags: [{t:'태그명', c:'색', bg:'배경'}]
// ================================================================
const EVENT_THEMES = {
  // ── EVENTS 배열 이벤트들 ──────────────────────────────────────
  '🩸 수상한 제단':   {scene:'altar',   accent:'#cc2222', bg:'radial-gradient(ellipse at 50% 85%,#2a0808 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '🎭 가면 상인':     {scene:'merchant', accent:'#c8a820', bg:'radial-gradient(ellipse at 30% 60%,#181408 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '💀 저주받은 보물상자':{scene:'chest', accent:'#8040cc', bg:'radial-gradient(ellipse at 50% 75%,#100820 0%,#0a0814 60%)', tags:[{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '🕯 영혼 거래':     {scene:'soul',    accent:'#20a0cc', bg:'radial-gradient(ellipse at 50% 35%,#081820 0%,#0a0814 60%)', tags:[{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'},{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '🎲 혼돈의 룰렛':   {scene:'roulette',accent:'#cc40aa', bg:'radial-gradient(ellipse at 50% 50%,#1a0a1e 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'혼돈',c:'#ff44cc',bg:'rgba(60,0,40,.55)'}]},
  '⚔ 검투장':        {scene:'gladiator',accent:'#cc6622', bg:'radial-gradient(ellipse at 50% 92%,#1a0808 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '🧪 수상한 물약':   {scene:'potion',  accent:'#40cc60', bg:'radial-gradient(ellipse at 60% 40%,#081a0a 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'}]},
  '📚 금지된 서적':   {scene:'book',    accent:'#4060cc', bg:'radial-gradient(ellipse at 40% 50%,#080a20 0%,#0a0814 60%)', tags:[{t:'지식',c:'#6688ff',bg:'rgba(0,15,60,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '👑 왕의 보관함':   {scene:'royal',   accent:'#c8a820', bg:'radial-gradient(ellipse at 50% 25%,#181400 0%,#0a0814 60%)', tags:[{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'},{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '🧲 떠돌이 수집가': {scene:'collector',accent:'#88aa40', bg:'radial-gradient(ellipse at 35% 55%,#101408 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '🔥 불타는 제물':   {scene:'fireAltar',accent:'#ff5500', bg:'radial-gradient(ellipse at 50% 80%,#200a00 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '⚰ 봉인된 관':     {scene:'coffin',  accent:'#44aa66', bg:'radial-gradient(ellipse at 50% 60%,#081408 0%,#0a0814 60%)', tags:[{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '💎 탐욕의 신전':   {scene:'temple',  accent:'#e8c020', bg:'radial-gradient(ellipse at 50% 30%,#1a1600 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  // ── LEGACY_EVENTS / 추가 이벤트들 ────────────────────────────
  '❓ 회복의 샘':     {scene:'well',    accent:'#30bbff', bg:'radial-gradient(ellipse at 50% 60%,#081020 0%,#0a0814 60%)', tags:[{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'}]},
  '❓ 떠돌이 상인':   {scene:'collector',accent:'#88aa40', bg:'radial-gradient(ellipse at 35% 55%,#101408 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '❓ 피의 제단':     {scene:'altar',   accent:'#cc2222', bg:'radial-gradient(ellipse at 50% 85%,#2a0808 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '❓ 매복!':         {scene:'gladiator',accent:'#cc6622', bg:'radial-gradient(ellipse at 50% 92%,#1a0808 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'}]},
  '❓ 운명의 동전':   {scene:'dice',    accent:'#20c880', bg:'radial-gradient(ellipse at 50% 75%,#081410 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '⚠️ 방송 사고':    {scene:'book',    accent:'#ff8800', bg:'radial-gradient(ellipse at 50% 50%,#180e00 0%,#0a0814 60%)', tags:[{t:'혼돈',c:'#ff44cc',bg:'rgba(60,0,40,.55)'}]},
  '🪞 거울의 방':     {scene:'mirror',  accent:'#80c0e0', bg:'radial-gradient(ellipse at 50% 50%,#07081a 0%,#0a0814 60%)', tags:[{t:'혼돈',c:'#ff44cc',bg:'rgba(60,0,40,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '🌪 폭풍의 제단':   {scene:'storm',   accent:'#4088dd', bg:'radial-gradient(ellipse at 50% 15%,#08101e 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '🎰 노름판':        {scene:'dice',    accent:'#20c880', bg:'radial-gradient(ellipse at 50% 80%,#08120e 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'혼돈',c:'#ff44cc',bg:'rgba(60,0,40,.55)'}]},
  '🎯 노히트 도전':   {scene:'gladiator',accent:'#40ccff',bg:'radial-gradient(ellipse at 50% 70%,#081420 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '🎤 저격 (디스전)': {scene:'gladiator',accent:'#cc3366',bg:'radial-gradient(ellipse at 50% 80%,#1a0810 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'}]},
  '🎟️ 구독 알림':    {scene:'ticket',  accent:'#40bbff', bg:'radial-gradient(ellipse at 50% 55%,#101030 0%,#0a0814 62%)', tags:[{t:'재도전',c:'#40bbff',bg:'rgba(0,60,100,.55)'},{t:'구독',c:'#9146ff',bg:'rgba(70,20,140,.55)'}]},
  // ── 스트리머 테마 전용 이벤트들 ──────────────────────────────
  '🚨 도네 협박':     {scene:'well',    accent:'#ff4444', bg:'radial-gradient(ellipse at 50% 50%,#200404 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '😠 악성 안티 등장':{scene:'gladiator',accent:'#cc3333',bg:'radial-gradient(ellipse at 50% 80%,#1a0606 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '📢 협찬 제안':     {scene:'collector',accent:'#88cc40', bg:'radial-gradient(ellipse at 50% 40%,#0e1808 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '🤝 합방 제안':     {scene:'gladiator',accent:'#40cc88', bg:'radial-gradient(ellipse at 50% 60%,#081a10 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'}]},
  '💤 휴방':          {scene:'well',    accent:'#6688cc', bg:'radial-gradient(ellipse at 50% 60%,#080e18 0%,#0a0814 60%)', tags:[{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'}]},
  '🎯 후원 목표':     {scene:'roulette',accent:'#ffcc20', bg:'radial-gradient(ellipse at 50% 50%,#181200 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '💎 큰손 등장':     {scene:'royal',   accent:'#e8c020', bg:'radial-gradient(ellipse at 50% 30%,#181400 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '⚖️ 가이드라인 경고':{scene:'book',   accent:'#cc6622', bg:'radial-gradient(ellipse at 50% 50%,#140a00 0%,#0a0814 60%)', tags:[{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'},{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'}]},
  '📣 시참 모집':     {scene:'gladiator',accent:'#40ccff',bg:'radial-gradient(ellipse at 50% 70%,#081420 0%,#0a0814 60%)', tags:[{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'},{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'}]},
  '🏅 도전과제':      {scene:'gladiator',accent:'#ffd700',bg:'radial-gradient(ellipse at 50% 70%,#141000 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  // ── 검투장 보상 (offerGladiatorReward) ───────────────────────
  '⚔ 검투장 보상':    {scene:'gladiator',accent:'#cc6622', bg:'radial-gradient(ellipse at 50% 92%,#1a0808 0%,#0a0814 60%)', tags:[{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'},{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  '🩸 제단의 응답':   {scene:'altar',   accent:'#cc2222', bg:'radial-gradient(ellipse at 50% 85%,#2a0808 0%,#0a0814 60%)', tags:[{t:'유물',c:'#cc88cc',bg:'rgba(60,0,70,.55)'}]},
  // ── 신규 8종 테마 ─────────────────────────────────────────────
  '🏋 부서진 훈련장': {scene:'gladiator',accent:'#888840', bg:'radial-gradient(ellipse at 50% 80%,#141208 0%,#0a0814 60%)', tags:[{t:'경험치',c:'#aadd40',bg:'rgba(30,50,0,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '🍲 수상한 요리사': {scene:'potion',  accent:'#cc8830', bg:'radial-gradient(ellipse at 50% 55%,#181008 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'}]},
  '🗺 낡은 지도':     {scene:'book',    accent:'#aa8830', bg:'radial-gradient(ellipse at 40% 50%,#140e04 0%,#0a0814 60%)', tags:[{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '🩸 피 묻은 우물':  {scene:'well',    accent:'#cc3333', bg:'radial-gradient(ellipse at 50% 65%,#1a0808 0%,#0a0814 60%)', tags:[{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}]},
  '🧭 길 잃은 모험가':{scene:'collector',accent:'#5599cc', bg:'radial-gradient(ellipse at 40% 50%,#080e18 0%,#0a0814 60%)', tags:[{t:'경험치',c:'#aadd40',bg:'rgba(30,50,0,.55)'},{t:'거래',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '🌫 검은 안개':     {scene:'mirror',  accent:'#668899', bg:'radial-gradient(ellipse at 50% 50%,#06080e 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'혼돈',c:'#ff44cc',bg:'rgba(60,0,40,.55)'}]},
  '📦 고장난 보급 상자':{scene:'chest', accent:'#886644', bg:'radial-gradient(ellipse at 50% 65%,#120e08 0%,#0a0814 60%)', tags:[{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '⏳ 시간의 균열':   {scene:'storm',   accent:'#6688cc', bg:'radial-gradient(ellipse at 50% 30%,#080c18 0%,#0a0814 60%)', tags:[{t:'경험치',c:'#aadd40',bg:'rgba(30,50,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  '🪞 뒤틀린 거울':   {scene:'mirror',      accent:'#80e0e0', bg:'radial-gradient(ellipse at 50% 50%,#140820 0%,#0a0814 60%)', tags:[{t:'변환',c:'#ff44cc',bg:'rgba(60,0,40,.55)'},{t:'특성',c:'#aadd40',bg:'rgba(30,50,0,.55)'}]},
  '🗿 잊힌 조각상':   {scene:'statue',      accent:'#c8a860', bg:'radial-gradient(ellipse at 50% 78%,#18140c 0%,#0a0814 60%)', tags:[{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'},{t:'제물',c:'#ffcc30',bg:'rgba(60,45,0,.55)'}]},
  '📚 침묵의 도서관': {scene:'library',     accent:'#d7b657', bg:'radial-gradient(ellipse at 50% 45%,#081020 0%,#0a0814 60%)', tags:[{t:'특성',c:'#aadd40',bg:'rgba(30,50,0,.55)'},{t:'경험치',c:'#6688ff',bg:'rgba(0,15,60,.55)'}]},
  '🕶 검은 시장':     {scene:'black_market',accent:'#d7b657', bg:'radial-gradient(ellipse at 50% 55%,#16081e 0%,#0a0814 60%)', tags:[{t:'상점',c:'#ffcc30',bg:'rgba(60,45,0,.55)'},{t:'도박',c:'#ffaa00',bg:'rgba(55,35,0,.55)'}]},
  // Act 3 mystery events. Event art currently uses canvas fallback scenes;
  // future PNGs can live under assets/events/act3/evt_act3_*.png.
  '3막 · 깨진 채팅창':{scene:'act3_broken_chat',accent:'#38e8ff',bg:'radial-gradient(ellipse at 50% 50%,#081226 0%,#0a0814 62%)',tags:[{t:'채팅',c:'#38e8ff',bg:'rgba(0,55,85,.55)'},{t:'글리치',c:'#ff4dd2',bg:'rgba(70,0,55,.55)'}],asset:'evt_act3_broken_chat'},
  '3막 · 검은 후원 알림':{scene:'act3_black_donation',accent:'#ffd34d',bg:'radial-gradient(ellipse at 50% 55%,#161000 0%,#05040a 64%)',tags:[{t:'골드',c:'#ffd34d',bg:'rgba(70,50,0,.55)'},{t:'리스크',c:'#ff4d6d',bg:'rgba(80,0,20,.55)'}],asset:'evt_act3_black_donation'},
  '3막 · 관리자 권한 요청':{scene:'act3_admin_auth',accent:'#5dff9b',bg:'radial-gradient(ellipse at 50% 45%,#061a18 0%,#050812 64%)',tags:[{t:'권한',c:'#5dff9b',bg:'rgba(0,70,35,.55)'},{t:'저주',c:'#aa55ff',bg:'rgba(40,0,80,.55)'}],asset:'evt_act3_admin_auth'},
  '3막 · 버퍼링된 휴식처':{scene:'act3_buffer_rest',accent:'#38e8ff',bg:'radial-gradient(ellipse at 50% 60%,#081428 0%,#070812 64%)',tags:[{t:'회복',c:'#40ee80',bg:'rgba(0,50,20,.55)'},{t:'지연',c:'#38e8ff',bg:'rgba(0,50,80,.55)'}],asset:'evt_act3_buffer_rest'},
  '3막 · 금지된 필터':{scene:'act3_forbidden_filter',accent:'#ff4d6d',bg:'radial-gradient(ellipse at 50% 50%,#1c0610 0%,#07050b 64%)',tags:[{t:'정화',c:'#5dff9b',bg:'rgba(0,60,30,.55)'},{t:'대가',c:'#ff4d6d',bg:'rgba(80,0,20,.55)'}],asset:'evt_act3_forbidden_filter'},
  '3막 · 깨진 다시보기':{scene:'act3_replay_error',accent:'#9146ff',bg:'radial-gradient(ellipse at 50% 50%,#120820 0%,#050712 64%)',tags:[{t:'랜덤',c:'#ffaa00',bg:'rgba(55,35,0,.55)'},{t:'글리치',c:'#ff4dd2',bg:'rgba(70,0,55,.55)'}],asset:'evt_act3_replay_error'},
  '3막 · 심연의 구독자':{scene:'act3_abyss_subscriber',accent:'#38e8ff',bg:'radial-gradient(ellipse at 50% 55%,#020818 0%,#020208 66%)',tags:[{t:'고급 보상',c:'#cc88cc',bg:'rgba(60,0,70,.55)'},{t:'위험',c:'#ff5050',bg:'rgba(80,0,0,.55)'}],asset:'evt_act3_abyss_subscriber'},
  '3막 · 방송 종료 버튼':{scene:'act3_end_stream',accent:'#ff4d6d',bg:'radial-gradient(ellipse at 50% 52%,#1a0408 0%,#050208 66%)',tags:[{t:'후반',c:'#ff4d6d',bg:'rgba(80,0,20,.55)'},{t:'전투',c:'#ff8840',bg:'rgba(60,20,0,.55)'}],asset:'evt_act3_end_stream'},

};

// ── 씬 씬 씬: 픽셀아트 캔버스 렌더러 ──────────────────────────
let _evAnimId = null;  // 현재 실행 중인 requestAnimationFrame ID

function evStopScene(){
  if(_evAnimId){ cancelAnimationFrame(_evAnimId); _evAnimId=null; }
}

function evDrawScene(sceneId, canvas){
  evStopScene();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // 씬별 픽셀 드로어 맵
  const scenes = {

    // TODO(act3-event-art): replace these canvas fallback scenes with
    // assets/events/act3/evt_act3_*.png when final pixel event art is ready.
    act3_broken_chat:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#050712'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#0b1220'; ctx.fillRect(W*.10,H*.12,W*.80,H*.72);
      ctx.fillStyle='#16213a'; ctx.fillRect(W*.14,H*.17,W*.72,H*.62);
      ctx.fillStyle='#38e8ff'; ctx.fillRect(W*.14,H*.17,W*.72,4);
      for(let i=0;i<7;i++){ const y=H*.25+i*H*.065; ctx.fillStyle=i%2?'#19112a':'#0f2740'; ctx.fillRect(W*.19,y,W*.54+Math.sin(t+i)*8,8); }
      ctx.fillStyle='#ff4dd2'; ctx.fillRect(W*.64,H*.23,22,4); ctx.fillRect(W*.62,H*.25,4,22); ctx.fillRect(W*.68,H*.31,26,4);
      ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W*.22,H*.18); ctx.lineTo(W*.72,H*.66); ctx.moveTo(W*.78,H*.24); ctx.lineTo(W*.30,H*.72); ctx.stroke();
      if(Math.sin(t*10)>0){ ctx.fillStyle='rgba(255,77,210,.22)'; ctx.fillRect(0,0,W,H); }
    },
    act3_black_donation:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#020204'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#06060c'; ctx.fillRect(W*.12,H*.18,W*.76,H*.56);
      ctx.fillStyle='rgba(255,211,77,.12)'; ctx.fillRect(W*.18,H*.26,W*.64,H*.36);
      ctx.fillStyle='#ffd34d'; ctx.fillRect(W*.24,H*.32,W*.52,8); ctx.fillRect(W*.24,H*.46,W*.34,7);
      ctx.fillStyle='#ff4d6d'; ctx.fillRect(W*.64,H*.45,14,14);
      for(let i=0;i<10;i++){ const x=W*.16+((i*23+t*16)%Math.floor(W*.68)); ctx.fillStyle=i%2?'#38e8ff':'#9146ff'; ctx.fillRect(x,H*.70-(i%4)*7,3,9); }
      ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,Math.floor((t*38)%H),W,2);
    },
    act3_admin_auth:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#03090b'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#071b1e'; ctx.fillRect(W*.08,H*.12,W*.84,H*.72);
      ctx.fillStyle='#38e8ff'; ctx.fillRect(W*.14,H*.20,W*.72,3);
      ctx.fillStyle='#5dff9b'; for(let i=0;i<8;i++) ctx.fillRect(W*.18,H*.29+i*10,W*.36+((i*17)%38),3);
      const pulse=.55+Math.sin(t*4)*.25; ctx.fillStyle=`rgba(255,77,109,${pulse})`;
      ctx.fillRect(W*.44,H*.42,W*.12,H*.18); ctx.fillRect(W*.40,H*.39,W*.20,H*.08);
      ctx.fillStyle='#050712'; ctx.fillRect(W*.47,H*.49,W*.06,H*.06);
      ctx.fillStyle='rgba(145,70,255,.18)'; ctx.fillRect(W*.08,H*.12,W*.84,H*.72);
    },
    act3_buffer_rest:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#050815'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#0e1826'; ctx.fillRect(W*.16,H*.54,W*.68,H*.22);
      ctx.fillStyle='#1b2940'; ctx.fillRect(W*.22,H*.46,W*.46,H*.13);
      ctx.fillStyle='#38e8ff'; ctx.fillRect(W*.21,H*.42,W*.16,H*.08);
      const cx=W*.62,cy=H*.32,r=20; for(let i=0;i<10;i++){ const a=t*2+i*Math.PI*2/10; ctx.fillStyle=i%2?'#38e8ff':'#ff4dd2'; ctx.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r,4,4); }
      ctx.fillStyle='rgba(255,255,255,.08)'; for(let i=0;i<4;i++) ctx.fillRect(W*.12+i*W*.20,H*.18+Math.sin(t+i)*3,24,3);
    },
    act3_forbidden_filter:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#09040a'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#1c0710'; ctx.fillRect(W*.16,H*.16,W*.68,H*.64);
      ctx.fillStyle='#ff4d6d'; ctx.fillRect(W*.22,H*.23,W*.56,6); ctx.fillRect(W*.22,H*.64,W*.56,6);
      ctx.fillStyle='#ffd34d'; ctx.fillRect(W*.45,H*.34,W*.10,H*.22); ctx.fillRect(W*.47,H*.60,W*.06,H*.06);
      ctx.strokeStyle='rgba(255,77,109,.75)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(W*.50,H*.48,42+Math.sin(t*3)*2,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(255,77,109,.12)'; ctx.fillRect(0,0,W,H);
    },
    act3_replay_error:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#040610'; ctx.fillRect(0,0,W,H);
      for(let i=0;i<4;i++){ const x=W*(.10+i*.21); ctx.fillStyle=i%2?'#101a30':'#1a1030'; ctx.fillRect(x,H*.20,W*.17,H*.46); ctx.fillStyle=i%2?'#38e8ff':'#ff4dd2'; ctx.fillRect(x+5,H*.25+Math.sin(t+i)*6,W*.11,5); ctx.fillRect(x+10,H*.42,W*.08,4); }
      ctx.fillStyle='#ffd34d'; ctx.beginPath(); ctx.moveTo(W*.45,H*.74); ctx.lineTo(W*.45,H*.60); ctx.lineTo(W*.59,H*.67); ctx.closePath(); ctx.fill();
      if(Math.sin(t*8)>0){ ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(0,H*.34,W,5); ctx.fillRect(0,H*.52,W,3); }
    },
    act3_abyss_subscriber:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#02040a'; ctx.fillRect(0,0,W,H);
      const glow=.22+Math.sin(t*2)*.08; ctx.fillStyle=`rgba(56,232,255,${glow})`; ctx.fillRect(W*.18,H*.16,W*.64,H*.58);
      ctx.fillStyle='#081020'; ctx.fillRect(W*.28,H*.20,W*.44,H*.46);
      ctx.fillStyle='#05050b'; ctx.fillRect(W*.39,H*.28,W*.22,H*.30);
      ctx.fillStyle='#ff4dd2'; ctx.fillRect(W*.42,H*.36,7,5); ctx.fillRect(W*.53,H*.36,7,5);
      ctx.fillStyle='#9146ff'; ctx.fillRect(W*.26,H*.72,W*.48,12);
      ctx.fillStyle='#38e8ff'; for(let i=0;i<7;i++) ctx.fillRect(W*.20+i*W*.10,H*.12+Math.sin(t+i)*4,4,4);
    },
    act3_end_stream:(t)=>{
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#070208'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#170610'; ctx.fillRect(W*.10,H*.12,W*.80,H*.66);
      const p=.78+Math.sin(t*4)*.12; ctx.fillStyle=`rgba(255,77,109,${p})`; ctx.fillRect(W*.28,H*.36,W*.44,H*.20);
      ctx.fillStyle='#060208'; ctx.fillRect(W*.33,H*.41,W*.34,H*.10);
      ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(W*.40,H*.44,W*.20,H*.03);
      ctx.fillStyle='rgba(255,77,109,.18)'; ctx.fillRect(W*.18,H*.22,W*.64,H*.44);
      for(let i=0;i<5;i++){ ctx.fillStyle=i%2?'#ffd34d':'#38e8ff'; ctx.fillRect(W*.18+i*W*.14,H*.70+Math.sin(t*2+i)*3,18,3); }
    },
    altar: (t)=>{
      ctx.clearRect(0,0,W,H);
      // 어두운 바닥
      ctx.fillStyle='#1a0a0a'; ctx.fillRect(0,H*.68,W,H*.32);
      // 제단 몸통
      ctx.fillStyle='#2a1010'; ctx.fillRect(W*.18,H*.36,W*.64,H*.36);
      ctx.fillStyle='#3a1515'; ctx.fillRect(W*.22,H*.30,W*.56,H*.08);
      // 피 흔적
      ctx.fillStyle='rgba(160,0,0,0.7)';
      ctx.fillRect(W*.30,H*.43,W*.40,3);
      ctx.fillRect(W*.38,H*.50,W*.24,2);
      // 촛불 좌
      const f1=Math.sin(t*3.0)*.15;
      ctx.fillStyle='#2a2010'; ctx.fillRect(W*.12,H*.50,6,H*.20);
      ctx.fillStyle=`rgba(255,${140+Math.floor(f1*40)},10,.9)`;
      ctx.fillRect(W*.12,H*.40,6,H*.12*(1+f1));
      ctx.fillStyle='rgba(255,240,80,.55)'; ctx.fillRect(W*.13,H*.42,4,H*.07);
      // 촛불 우
      const f2=Math.sin(t*2.7+1)*.15;
      ctx.fillStyle='#2a2010'; ctx.fillRect(W*.80,H*.50,6,H*.20);
      ctx.fillStyle=`rgba(255,${140+Math.floor(f2*40)},10,.9)`;
      ctx.fillRect(W*.80,H*.40,6,H*.12*(1+f2));
      ctx.fillStyle='rgba(255,240,80,.55)'; ctx.fillRect(W*.81,H*.42,4,H*.07);
      // 룬
      for(let i=0;i<3;i++){
        ctx.fillStyle=`rgba(200,40,40,${.35+Math.sin(t*1.4+i)*.25})`;
        ctx.fillRect(W*.28+i*W*.18,H*.54,8,2);
      }
    },
    merchant: (t)=>{
      ctx.clearRect(0,0,W,H);
      // 랜턴
      const lf=Math.sin(t*3.2)*.18;
      ctx.fillStyle='#332800'; ctx.fillRect(W*.6,H*.08,10,H*.12);
      ctx.fillStyle='#554400'; ctx.fillRect(W*.56,H*.20,18,20);
      ctx.fillStyle=`rgba(255,${180+lf*25},50,.85)`;
      ctx.fillRect(W*.58,H*.22,14,14);
      ctx.fillStyle='rgba(255,200,80,.45)'; ctx.fillRect(W*.60,H*.23,10,10);
      // 가면 얼굴
      ctx.fillStyle='#c8a060'; ctx.fillRect(W*.22,H*.18,32,28);
      const side=Math.sin(t*.7);
      ctx.fillStyle='#1a0a00';
      if(side>0){
        ctx.fillRect(W*.26,H*.25,7,3); ctx.fillRect(W*.34,H*.28,7,3);
      } else {
        ctx.fillRect(W*.26,H*.28,7,3); ctx.fillRect(W*.34,H*.25,7,3);
      }
      ctx.fillRect(W*.27,H*.21,5,5); ctx.fillRect(W*.37,H*.21,5,5);
      // 몸 (망토)
      ctx.fillStyle='#261808'; ctx.fillRect(W*.14,H*.46,48,H*.42);
      ctx.fillStyle='#181000'; ctx.fillRect(W*.18,H*.46,40,H*.40);
    },
    chest: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#060810'; ctx.fillRect(0,0,W,H);
      const bob=Math.sin(t*1.8)*1.5;
      ctx.fillStyle='#3a2010'; ctx.fillRect(W*.14,H*.40,W*.72,H*.40);
      ctx.fillStyle='#4a2818'; ctx.fillRect(W*.17,H*.43,W*.66,H*.34);
      ctx.fillStyle='#4a2818'; ctx.fillRect(W*.14,H*.31+bob,W*.72,H*.12);
      ctx.fillStyle='#5a3020'; ctx.fillRect(W*.17,H*.33+bob,W*.66,H*.08);
      ctx.fillStyle='#886030';
      ctx.fillRect(W*.14,H*.42,W*.72,4);
      ctx.fillRect(W*.46,H*.38,8,H*.44);
      ctx.fillStyle='#aa8040'; ctx.fillRect(W*.43,H*.44,W*.14,H*.10);
      ctx.fillStyle='#886030'; ctx.fillRect(W*.46,H*.41,W*.08,H*.04);
      // 보라 오라
      const a=.12+Math.sin(t*2.1)*.08;
      ctx.fillStyle=`rgba(120,40,200,${a})`; ctx.fillRect(W*.04,H*.24,W*.92,H*.62);
      for(let i=0;i<4;i++){
        const px=W*.14+W*.72*((Math.sin(t*1.4+i*1.6)+1)/2);
        const py=H*.30-Math.abs(Math.sin(t*2+i))*H*.20;
        ctx.fillStyle=`rgba(180,70,255,${Math.sin(t*2+i*.8)*.45+.45})`;
        ctx.fillRect(px,py,3,3);
      }
    },
    ticket: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0a0814'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#070b18'; ctx.fillRect(W*.06,H*.10,W*.88,H*.76);
      ctx.fillStyle='#10162a'; ctx.fillRect(W*.10,H*.16,W*.80,H*.64);
      ctx.fillStyle='rgba(145,70,255,.18)'; ctx.fillRect(W*.10,H*.16,W*.80,H*.10);
      for(let i=0;i<5;i++){
        ctx.fillStyle=`rgba(64,187,255,${.18+Math.sin(t*2+i)*.10})`;
        ctx.fillRect(W*.14+i*W*.16,H*.18,3,H*.58);
      }

      const bob=Math.sin(t*2.1)*2;
      const tx=W*.24, ty=H*.36+bob, tw=W*.52, th=H*.25;
      ctx.fillStyle=`rgba(64,187,255,${.12+Math.sin(t*3)*.06})`; ctx.fillRect(tx-8,ty-8,tw+16,th+16);
      ctx.fillStyle='#40bbff'; ctx.fillRect(tx,ty,tw,th);
      ctx.fillStyle='#8adfff'; ctx.fillRect(tx+5,ty+5,tw-10,th-10);
      ctx.fillStyle='#0a0814'; ctx.fillRect(tx+12,ty+10,tw-24,th-20);
      ctx.fillStyle='#40bbff';
      ctx.fillRect(tx,ty+th*.38,6,10); ctx.fillRect(tx+tw-6,ty+th*.38,6,10);
      ctx.fillStyle='#ffd34d';
      ctx.font='bold 12px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('RETRY',tx+tw*.50,ty+th*.45);
      ctx.fillStyle='#9146ff'; ctx.fillRect(tx+tw*.18,ty+th*.68,tw*.64,3);

      const bubbles=[
        {x:W*.08,y:H*.26,w:38,h:15,t:'POG',c:'#40bbff'},
        {x:W*.56,y:H*.20,w:58,h:15,t:'한 판 더',c:'#ffd34d'},
        {x:W*.50,y:H*.68,w:62,h:15,t:'구독 감사',c:'#9146ff'}
      ];
      bubbles.forEach((b,i)=>{
        const oy=Math.sin(t*1.6+i)*1.5;
        ctx.fillStyle='rgba(6,10,24,.92)'; ctx.fillRect(b.x,b.y+oy,b.w,b.h);
        ctx.fillStyle=b.c; ctx.fillRect(b.x,b.y+oy,b.w,2);
        ctx.fillRect(b.x,b.y+oy,b.w,1);
        ctx.fillStyle='rgba(255,255,255,.88)';
        ctx.font=i===1?'bold 8px monospace':'bold 9px monospace';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.t,b.x+b.w*.5,b.y+oy+b.h*.56);
      });
      for(let i=0;i<8;i++){
        const px=W*.12+((i*29+t*20)%Math.floor(W*.76));
        const py=H*.12+((i*17+t*10)%Math.floor(H*.66));
        ctx.fillStyle=i%2?'rgba(145,70,255,.75)':'rgba(64,187,255,.78)';
        ctx.fillRect(px,py,4,2); ctx.fillRect(px+1,py+2,2,3);
      }
    },
    soul: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#040810'; ctx.fillRect(0,0,W,H);
      const fy=Math.sin(t*1.8)*6;
      ctx.fillStyle=`rgba(50,170,210,${.82+Math.sin(t*2)*.12})`;
      ctx.fillRect(W*.32,H*.18+fy,W*.36,H*.36);
      ctx.fillStyle=`rgba(70,195,235,${.6+Math.sin(t*2)*.15})`;
      ctx.fillRect(W*.36,H*.21+fy,W*.28,H*.29);
      ctx.fillStyle='rgba(200,240,255,.95)';
      ctx.fillRect(W*.39,H*.28+fy,8,6); ctx.fillRect(W*.52,H*.28+fy,8,6);
      ctx.fillStyle='rgba(15,70,110,1)';
      ctx.fillRect(W*.41,H*.29+fy,4,4); ctx.fillRect(W*.54,H*.29+fy,4,4);
      for(let i=0;i<4;i++){
        const ty=H*.52+i*5+fy; const tw=W*.36-i*W*.07;
        ctx.fillStyle=`rgba(40,140,180,${.7-i*.15})`;
        ctx.fillRect(W*.32+i*W*.035,ty,tw,4);
      }
      for(let i=0;i<5;i++){
        const bfx=W*.18+W*.64*(i/4);
        const bfy=H*.76+Math.sin(t*1.8+i)*H*.07;
        ctx.fillStyle=`rgba(40,120,200,${Math.sin(t*2.5+i*.6)*.45+.4})`;
        ctx.fillRect(bfx,bfy,4,4+Math.floor(Math.sin(t*3+i)*.5+.5)*5);
      }
    },
    roulette: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#080510'; ctx.fillRect(0,0,W,H);
      const cx=W*.5,cy=H*.44,r=H*.28;
      const cols=['#cc2222','#1a1a1a','#cc4422','#1a1a1a','#cc6622','#1a1a1a','#aa2244','#1a1a1a'];
      const seg=(Math.PI*2)/cols.length;
      for(let i=0;i<cols.length;i++){
        const midA=t+i*seg+seg*.5;
        for(let s=3;s<r;s+=4){
          const px=cx+Math.cos(midA)*s;
          const py=cy+Math.sin(midA)*s;
          ctx.fillStyle=cols[i];
          ctx.fillRect(Math.round(px)-3,Math.round(py)-3,6,6);
        }
      }
      ctx.strokeStyle='#cc8820'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#886030'; ctx.fillRect(cx-5,cy-5,10,10);
      ctx.fillStyle='#ffffff';
      const nx=cx, ny=cy-r*.9;
      ctx.fillRect(nx-2,ny-2,4,16);
      for(let i=0;i<6;i++){
        const sa=t*1.5+i*(Math.PI*2/6);
        const sx=cx+Math.cos(sa)*(r+7);
        const sy=cy+Math.sin(sa)*(r+7);
        ctx.fillStyle=`rgba(255,200,50,${Math.sin(t*4+i)*.5+.5})`;
        ctx.fillRect(sx-2,sy-2,4,4);
      }
    },
    gladiator: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#18100a'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#261808'; ctx.fillRect(W*.04,H*.14,W*.92,H*.72);
      ctx.fillStyle='#0a0814'; ctx.fillRect(W*.24,H*.27,W*.52,H*.60);
      for(let i=0;i<=W*.52;i+=4){
        const arcH=Math.sqrt(Math.max(0,(W*.26)*(W*.26)-(i-W*.26)*(i-W*.26)))*.75;
        ctx.fillStyle='#0a0814';
        ctx.fillRect(W*.24+i,H*.27-arcH*.5,4,arcH*.5);
      }
      const f1=Math.sin(t*4)*.18;
      ctx.fillStyle='#2a1800'; ctx.fillRect(W*.07,H*.28,8,H*.26);
      ctx.fillStyle=`rgba(255,${120+f1*40},20,.9)`;
      ctx.fillRect(W*.05,H*.18,12,H*.12*(1+f1));
      ctx.fillStyle='rgba(255,200,80,.55)'; ctx.fillRect(W*.06,H*.20,8,H*.08);
      const f2=Math.sin(t*3.4+.9)*.18;
      ctx.fillStyle='#2a1800'; ctx.fillRect(W*.85,H*.28,8,H*.26);
      ctx.fillStyle=`rgba(255,${120+f2*40},20,.9)`;
      ctx.fillRect(W*.83,H*.18,12,H*.12*(1+f2));
      ctx.fillStyle='rgba(255,200,80,.55)'; ctx.fillRect(W*.84,H*.20,8,H*.08);
      ctx.fillStyle='#161008'; ctx.fillRect(0,H*.84,W,H*.16);
      ctx.fillStyle='rgba(120,0,0,.65)';
      ctx.fillRect(W*.28,H*.86,20,3); ctx.fillRect(W*.50,H*.88,14,3);
    },
    potion: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#040a04'; ctx.fillRect(0,0,W,H);
      const hue=(t*28)%360;
      const pr=Math.sin(hue*Math.PI/180)*127+128;
      const pg=Math.sin((hue+120)*Math.PI/180)*127+128;
      const pb=Math.sin((hue+240)*Math.PI/180)*127+128;
      ctx.fillStyle='#182010'; ctx.fillRect(W*.28,H*.28,W*.44,H*.52);
      ctx.fillStyle='#122010'; ctx.fillRect(W*.22,H*.54,W*.56,H*.30);
      const wh=H*.42+Math.sin(t*1.8)*H*.03;
      ctx.fillStyle=`rgba(${Math.floor(pr)},${Math.floor(pg)},${Math.floor(pb)},.8)`;
      ctx.fillRect(W*.24,wh,W*.52,H*.60-wh+H*.30);
      for(let i=0;i<4;i++){
        const bx=W*.30+W*.40*(i/3);
        const by=wh+H*.12-(t*18+i*14)%(H*.22);
        ctx.fillStyle=`rgba(255,255,255,${Math.sin(t*3+i)*.35+.45})`;
        ctx.fillRect(bx,by,4,4);
      }
      ctx.fillStyle='#182010'; ctx.fillRect(W*.36,H*.13,W*.28,H*.17);
      ctx.fillStyle='#283018'; ctx.fillRect(W*.33,H*.28,W*.34,8);
      ctx.fillStyle='#6a4020'; ctx.fillRect(W*.38,H*.08,W*.24,H*.07);
    },
    book: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#040510'; ctx.fillRect(0,0,W,H);
      const wv=Math.sin(t*1.4)*2;
      ctx.fillStyle='#2a200a'; ctx.fillRect(W*.08,H*.18,W*.44,H*.52);
      ctx.fillStyle='#d4c090'; ctx.fillRect(W*.10,H*.20,W*.40,H*.48);
      ctx.fillStyle='#2a200a'; ctx.fillRect(W*.48,H*.18+wv,W*.44,H*.52);
      ctx.fillStyle='#c8b080'; ctx.fillRect(W*.50,H*.20+wv,W*.40,H*.48);
      ctx.fillStyle='#1a1008'; ctx.fillRect(W*.46,H*.16,W*.08,H*.56);
      ctx.fillStyle='rgba(60,40,0,.55)';
      for(let i=0;i<7;i++) ctx.fillRect(W*.14,H*.28+i*H*.055,W*.32,2);
      const runeCols=['rgba(80,80,255,.8)','rgba(120,40,255,.8)','rgba(40,120,255,.8)'];
      for(let i=0;i<5;i++){
        const ra=Math.sin(t*1.1+i)*.55+.4;
        ctx.fillStyle=runeCols[i%3].replace('.8',ra.toFixed(2));
        ctx.fillRect(W*.54,H*.28+i*H*.06,W*.28,3);
        ctx.fillRect(W*.54+W*.08,H*.30+i*H*.06,W*.14,2);
      }
    },
    royal: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#080800'; ctx.fillRect(0,0,W,H);
      const gs=Math.sin(t*1.4)*.12+.88;
      const gc=`rgba(${Math.floor(200*gs)},${Math.floor(158*gs)},0,1)`;
      ctx.fillStyle=gc;
      ctx.fillRect(W*.18,H*.20,W*.64,H*.28);
      ctx.fillRect(W*.18,H*.10,12,H*.12);
      ctx.fillRect(W*.43,H*.04,14,H*.18);
      ctx.fillRect(W*.70,H*.10,12,H*.12);
      ctx.fillStyle=`rgba(220,80,80,${.8+Math.sin(t*3)*.18})`;
      ctx.fillRect(W*.46,H*.10,8,8);
      ctx.fillStyle=`rgba(80,150,220,${.8+Math.sin(t*2.4+1)*.18})`;
      ctx.fillRect(W*.23,H*.22,6,6); ctx.fillRect(W*.71,H*.22,6,6);
      ctx.fillStyle='#4a2e0e'; ctx.fillRect(W*.14,H*.50,W*.72,H*.36);
      ctx.fillStyle='#6a4215'; ctx.fillRect(W*.17,H*.53,W*.66,H*.30);
      ctx.fillStyle=gc;
      ctx.fillRect(W*.42,H*.55,W*.16,H*.12);
      ctx.fillRect(W*.45,H*.51,W*.10,H*.06);
    },
    collector: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#080e06'; ctx.fillRect(0,0,W,H);
      // 수레
      ctx.fillStyle='#3a2808'; ctx.fillRect(W*.1,H*.28,W*.7,H*.36);
      ctx.fillStyle='#2a1e06'; ctx.fillRect(W*.06,H*.40,W*.78,H*.24);
      // 바퀴
      ctx.strokeStyle='#665020'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(W*.22,H*.68,H*.12,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W*.72,H*.68,H*.12,0,Math.PI*2); ctx.stroke();
      // 잡동사니 (랜덤 아이콘들)
      const items=['#c0a030','#8060c0','#60a060','#c06030'];
      for(let i=0;i<4;i++){
        ctx.fillStyle=items[i];
        ctx.fillRect(W*.16+i*W*.18,H*.30+Math.sin(t+i)*.5,10,10);
      }
    },
    statue: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#07070b'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#121015'; ctx.fillRect(0,H*.64,W,H*.36);
      ctx.fillStyle='rgba(80,60,120,.16)'; ctx.fillRect(W*.16,H*.10,W*.68,H*.68);
      // 뒤쪽 사원 기둥
      ctx.fillStyle='#17161d';
      ctx.fillRect(W*.10,H*.18,12,H*.58); ctx.fillRect(W*.78,H*.18,12,H*.58);
      ctx.fillStyle='#24222a';
      ctx.fillRect(W*.08,H*.16,18,6); ctx.fillRect(W*.76,H*.16,18,6);
      ctx.fillRect(W*.08,H*.74,18,7); ctx.fillRect(W*.76,H*.74,18,7);
      // 석상 몸체와 얼굴
      const glow=.72+Math.sin(t*2.2)*.18;
      ctx.fillStyle='#34343c'; ctx.fillRect(W*.34,H*.34,W*.32,H*.34);
      ctx.fillStyle='#46464e'; ctx.fillRect(W*.30,H*.18,W*.40,H*.25);
      ctx.fillStyle='#565760'; ctx.fillRect(W*.34,H*.14,W*.32,H*.08);
      ctx.fillStyle='#292a30'; ctx.fillRect(W*.37,H*.24,W*.08,H*.07); ctx.fillRect(W*.55,H*.24,W*.08,H*.07);
      ctx.fillStyle=`rgba(255,210,70,${glow})`;
      ctx.fillRect(W*.39,H*.26,8,3); ctx.fillRect(W*.56,H*.26,8,3);
      ctx.fillStyle='#23242a'; ctx.fillRect(W*.44,H*.35,W*.12,3);
      // 제단
      ctx.fillStyle='#2a2217'; ctx.fillRect(W*.22,H*.68,W*.56,H*.13);
      ctx.fillStyle='#4b3b22'; ctx.fillRect(W*.18,H*.63,W*.64,H*.07);
      ctx.fillStyle=`rgba(170,80,255,${.18+Math.sin(t*1.7)*.08})`;
      ctx.fillRect(W*.28,H*.66,W*.44,H*.09);
      // 촛불과 저주 입자
      for(let i=0;i<2;i++){
        const x=i?W*.75:W*.20, f=Math.sin(t*3+i)*.18;
        ctx.fillStyle='#2a2010'; ctx.fillRect(x,H*.54,6,H*.18);
        ctx.fillStyle=`rgba(255,${150+Math.floor(f*40)},25,.9)`;
        ctx.fillRect(x,H*.47,6,H*.10*(1+f));
      }
      for(let i=0;i<6;i++){
        const px=W*.22+W*.56*((i*29+t*9)%100)/100;
        const py=H*.16+H*.50*((i*17+t*7)%100)/100;
        ctx.fillStyle=`rgba(180,90,255,${.18+Math.sin(t*2+i)*.18})`;
        ctx.fillRect(px,py,3,3);
      }
    },
    library: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#040712'; ctx.fillRect(0,0,W,H);
      // 책장
      ctx.fillStyle='#120c12'; ctx.fillRect(W*.06,H*.12,W*.88,H*.54);
      ctx.fillStyle='#2a1b16'; ctx.fillRect(W*.08,H*.16,W*.84,4);
      ctx.fillRect(W*.08,H*.34,W*.84,4); ctx.fillRect(W*.08,H*.52,W*.84,4);
      const cols=['#3b2848','#523220','#283d50','#57451f','#1e3a32'];
      for(let row=0;row<3;row++){
        for(let i=0;i<11;i++){
          const x=W*.10+i*W*.073, y=H*(.18+row*.18), h=H*.12+((i+row)%3)*3;
          ctx.fillStyle=cols[(i+row)%cols.length];
          ctx.fillRect(x,y,6,h);
        }
      }
      // 열린 책
      const bob=Math.sin(t*1.4)*1.5;
      ctx.fillStyle='rgba(215,182,87,.16)'; ctx.fillRect(W*.25,H*.62+bob,W*.50,H*.20);
      ctx.fillStyle='#d8c690'; ctx.fillRect(W*.24,H*.63+bob,W*.23,H*.17);
      ctx.fillStyle='#cdb87e'; ctx.fillRect(W*.53,H*.63+bob,W*.23,H*.17);
      ctx.fillStyle='#57451f'; ctx.fillRect(W*.48,H*.61+bob,W*.04,H*.20);
      ctx.fillStyle='rgba(80,55,25,.55)';
      for(let i=0;i<4;i++){
        ctx.fillRect(W*.29,H*(.67+i*.03)+bob,W*.14,2);
        ctx.fillRect(W*.57,H*(.67+i*.03)+bob,W*.14,2);
      }
      // 촛불
      const f=Math.sin(t*3.1)*.18;
      ctx.fillStyle='#2a2010'; ctx.fillRect(W*.80,H*.52,7,H*.18);
      ctx.fillStyle=`rgba(255,${170+Math.floor(f*35)},45,.92)`;
      ctx.fillRect(W*.80,H*.44,7,H*.11*(1+f));
      ctx.fillStyle='rgba(255,210,80,.28)'; ctx.fillRect(W*.70,H*.38,W*.24,H*.32);
      // 먼지와 페이지 빛
      for(let i=0;i<12;i++){
        const px=W*.12+W*.74*((i*37+t*5)%100)/100;
        const py=H*.16+H*.58*((i*23+t*4)%100)/100;
        ctx.fillStyle=`rgba(215,182,87,${.12+Math.sin(t*1.8+i)*.10})`;
        ctx.fillRect(px,py,2,2);
      }
    },
    black_market: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#07040d'; ctx.fillRect(0,0,W,H);
      // 천막
      ctx.fillStyle='#24102e'; ctx.fillRect(W*.08,H*.14,W*.84,H*.12);
      ctx.fillStyle='#3a1746'; ctx.fillRect(W*.12,H*.10,W*.76,H*.08);
      for(let i=0;i<5;i++){
        ctx.fillStyle=i%2?'#1a0b24':'#422052';
        ctx.fillRect(W*.12+i*W*.15,H*.18,W*.15,H*.11);
      }
      ctx.fillStyle='#12091a'; ctx.fillRect(W*.10,H*.28,W*.80,H*.50);
      // 상인 후드
      const eye=.72+Math.sin(t*2.4)*.22;
      ctx.fillStyle='#09070d'; ctx.fillRect(W*.36,H*.24,W*.28,H*.30);
      ctx.fillStyle='#1d1424'; ctx.fillRect(W*.32,H*.32,W*.36,H*.29);
      ctx.fillStyle=`rgba(255,214,84,${eye})`;
      ctx.fillRect(W*.42,H*.39,8,3); ctx.fillRect(W*.54,H*.39,8,3);
      ctx.fillStyle='#050408'; ctx.fillRect(W*.41,H*.46,W*.20,3);
      // 가판대
      ctx.fillStyle='#2e1d10'; ctx.fillRect(W*.16,H*.60,W*.68,H*.20);
      ctx.fillStyle='#4b2d16'; ctx.fillRect(W*.12,H*.56,W*.76,H*.07);
      ctx.fillStyle='#1a1009'; ctx.fillRect(W*.20,H*.79,W*.10,H*.10); ctx.fillRect(W*.70,H*.79,W*.10,H*.10);
      // 금화와 수상한 물건
      for(let i=0;i<5;i++){
        const x=W*.22+i*W*.10, y=H*.52+Math.sin(t*1.5+i)*1.2;
        ctx.fillStyle='#d7b657'; ctx.fillRect(x,y,7,4);
        ctx.fillStyle='#fff0a8'; ctx.fillRect(x+1,y,3,1);
      }
      ctx.fillStyle='#8b5cff'; ctx.fillRect(W*.66,H*.50,12,10);
      ctx.fillStyle='rgba(139,92,255,.38)'; ctx.fillRect(W*.63,H*.47,18,16);
      for(let i=0;i<7;i++){
        const px=W*.15+W*.70*((i*31+t*8)%100)/100;
        const py=H*.22+H*.48*((i*19+t*3)%100)/100;
        ctx.fillStyle=`rgba(215,182,87,${.18+Math.sin(t*2+i)*.16})`;
        ctx.fillRect(px,py,2,2);
      }
    },
    fireAltar: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#100400'; ctx.fillRect(0,0,W,H);
      // 항아리
      ctx.fillStyle='#402010'; ctx.fillRect(W*.28,H*.38,W*.44,H*.46);
      ctx.fillStyle='#301808'; ctx.fillRect(W*.22,H*.55,W*.56,H*.30);
      ctx.fillStyle='#201005'; ctx.fillRect(W*.36,H*.28,W*.28,H*.12);
      // 화염
      const ff=Math.sin(t*3.5)*.2;
      ctx.fillStyle=`rgba(255,${80+ff*40},0,.9)`;
      ctx.fillRect(W*.30,H*.15,W*.40,H*.16*(1+ff));
      ctx.fillStyle=`rgba(255,${150+ff*30},20,.7)`;
      ctx.fillRect(W*.35,H*.18,W*.30,H*.12*(1+ff));
      ctx.fillStyle='rgba(255,220,80,.5)';
      ctx.fillRect(W*.40,H*.21,W*.20,H*.08);
      // 불꽃 파티클
      for(let i=0;i<5;i++){
        const px=W*.28+W*.44*(i/4);
        const py=H*.15-Math.abs(Math.sin(t*2+i*1.2))*H*.14;
        ctx.fillStyle=`rgba(255,${120+i*20},0,${Math.sin(t*2+i)*.4+.5})`;
        ctx.fillRect(px,py,4,4);
      }
    },
    coffin: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#050a05'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#1a200a'; ctx.fillRect(W*.2,H*.12,W*.6,H*.76);
      ctx.fillStyle='#141a06'; ctx.fillRect(W*.22,H*.14,W*.56,H*.72);
      // 금속 장식
      ctx.fillStyle='#40aa60';
      ctx.fillRect(W*.2,H*.42,W*.6,4);
      ctx.fillRect(W*.44,H*.12,8,H*.76);
      // 독기 오라
      const gv=.1+Math.sin(t*1.8)*.07;
      ctx.fillStyle=`rgba(40,160,60,${gv})`; ctx.fillRect(0,0,W,H);
      // 파티클
      for(let i=0;i<4;i++){
        const gx=W*.22+W*.56*(i/3);
        const gy=H*.14+Math.abs(Math.sin(t*1.2+i*0.8))*H*.72;
        ctx.fillStyle=`rgba(60,200,80,${Math.sin(t*2+i)*.35+.3})`;
        ctx.fillRect(gx,gy,3,3);
      }
    },
    temple: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0a0a00'; ctx.fillRect(0,0,W,H);
      const gs=Math.sin(t*1.5)*.12+.88;
      // 기둥들
      ctx.fillStyle='#2a2200';
      ctx.fillRect(W*.1,H*.2,W*.12,H*.65);
      ctx.fillRect(W*.78,H*.2,W*.12,H*.65);
      // 지붕
      ctx.fillStyle='#3a3000';
      ctx.fillRect(W*.05,H*.12,W*.9,H*.1);
      // 황금상
      ctx.fillStyle=`rgba(${Math.floor(200*gs)},${Math.floor(160*gs)},0,1)`;
      ctx.fillRect(W*.4,H*.28,W*.2,H*.36);
      ctx.fillRect(W*.36,H*.22,W*.28,H*.1);
      // 금화 빛
      ctx.fillStyle=`rgba(200,160,0,${.05+Math.sin(t*2.2)*.04})`; ctx.fillRect(0,0,W,H);
      // 금화
      for(let i=0;i<5;i++){
        const cx2=W*.15+i*W*.17;
        const cy2=H*.72+Math.sin(t*1.5+i)*.8;
        ctx.fillStyle=`rgba(${Math.floor(200*gs)},${Math.floor(158*gs)},0,${.7+Math.sin(t*3+i)*.2})`;
        ctx.fillRect(cx2,cy2,8,8);
      }
    },
    well: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#050a10'; ctx.fillRect(0,0,W,H);
      // 우물 벽
      ctx.fillStyle='#2a2218'; ctx.fillRect(W*.2,H*.4,W*.6,H*.46);
      ctx.fillStyle='#1a1810'; ctx.fillRect(W*.24,H*.43,W*.52,H*.42);
      // 물 반사
      ctx.fillStyle=`rgba(40,120,200,${.3+Math.sin(t*1.5)*.12})`;
      ctx.fillRect(W*.26,H*.70,W*.48,H*.14);
      // 달빛 반사
      ctx.fillStyle=`rgba(200,220,255,${.4+Math.sin(t*2)*.2})`;
      ctx.fillRect(W*.40,H*.72,W*.20,H*.08);
      // 우물 지붕
      ctx.fillStyle='#3a2e18'; ctx.fillRect(W*.14,H*.35,W*.72,H*.06);
      ctx.fillStyle='#2a2010'; ctx.fillRect(W*.22,H*.2,6,H*.17); ctx.fillRect(W*.72,H*.2,6,H*.17);
      // 물방울
      for(let i=0;i<4;i++){
        const dy=((t*30+i*20)%H*.3)+H*.45;
        ctx.fillStyle=`rgba(100,160,255,${.8-dy/H*.5})`;
        ctx.fillRect(W*.46+i*4,dy,3,3);
      }
    },
    mirror: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#04050f'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#28283a'; ctx.fillRect(W*.18,H*.08,W*.64,H*.78);
      ctx.fillStyle='#050818'; ctx.fillRect(W*.22,H*.12,W*.56,H*.70);
      const sx=W*.22+(Math.sin(t*.75)+1)*W*.28;
      ctx.fillStyle='rgba(100,160,255,.12)'; ctx.fillRect(sx-8,H*.12,16,H*.70);
      ctx.fillStyle='rgba(150,200,255,.38)'; ctx.fillRect(sx-2,H*.12,4,H*.70);
      ctx.fillStyle=`rgba(70,110,200,${.28+Math.sin(t*1.1)*.14})`;
      ctx.fillRect(W*.38,H*.24,W*.24,H*.38);
      ctx.fillRect(W*.42,H*.16,W*.16,H*.1);
      for(let i=0;i<6;i++){
        const lx=W*.24+W*.52*(i/5);
        const ly=H*.14+H*.68*(Math.sin(t*1.4+i)*.5+.5);
        ctx.fillStyle=`rgba(170,210,255,${Math.sin(t*2+i)*.3+.28})`;
        ctx.fillRect(lx,ly,3,3);
      }
    },
    storm: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#040810'; ctx.fillRect(0,0,W,H);
      const cy2=H*.1+Math.sin(t*.5)*H*.02;
      ctx.fillStyle='#18202e';
      for(let i=0;i<5;i++){
        ctx.fillRect(W*.06+i*W*.2,cy2+(i%2)*H*.06,W*.26,H*.12);
      }
      ctx.fillStyle='#0d1420'; ctx.fillRect(0,cy2+H*.07,W,H*.08);
      const lt=t%3.2;
      if(lt<.18||(lt>1.6&&lt<1.78)){
        ctx.fillStyle='rgba(170,195,255,.9)';
        const lx2=W*.36+Math.sin(t)*W*.18;
        ctx.fillRect(lx2,cy2+H*.16,4,H*.32);
        ctx.fillRect(lx2+4,cy2+H*.27,4,H*.16);
        ctx.fillRect(lx2+8,cy2+H*.34,4,H*.12);
        ctx.fillStyle='rgba(90,130,255,.25)'; ctx.fillRect(0,0,W,H);
      }
      ctx.fillStyle='#181826'; ctx.fillRect(W*.14,H*.55,W*.72,H*.32);
      ctx.fillStyle='#20223a'; ctx.fillRect(W*.18,H*.52,W*.64,H*.06);
      ctx.fillStyle=`rgba(70,110,255,${.28+Math.sin(t*2.8)*.38})`;
      for(let i=0;i<3;i++) ctx.fillRect(W*.24+i*W*.22,H*.60,W*.12,3);
    },
    dice: (t)=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#04080a'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#0c1610'; ctx.fillRect(0,H*.60,W,H*.40);
      ctx.fillStyle='#0a1008'; ctx.fillRect(0,H*.58,W,H*.05);
      // 주사위1
      const d1y=H*.24+Math.sin(t*1.2)*H*.04;
      ctx.fillStyle='#e0d8c8'; ctx.fillRect(W*.12,d1y,36,36);
      ctx.fillStyle='#201808';
      ctx.fillRect(W*.12+5,d1y+5,6,6); ctx.fillRect(W*.12+24,d1y+5,6,6);
      ctx.fillRect(W*.12+14,d1y+14,6,6);
      ctx.fillRect(W*.12+5,d1y+24,6,6); ctx.fillRect(W*.12+24,d1y+24,6,6);
      // 주사위2
      const d2y=H*.18+Math.sin(t*1.6+1)*H*.05;
      ctx.fillStyle='#182008'; ctx.fillRect(W*.55,d2y,32,32);
      ctx.fillStyle='#50ee38';
      ctx.fillRect(W*.55+4,d2y+4,6,6); ctx.fillRect(W*.55+21,d2y+4,6,6);
      ctx.fillRect(W*.55+4,d2y+21,6,6); ctx.fillRect(W*.55+21,d2y+21,6,6);
      // 카드들
      ctx.fillStyle='#e8d8c0'; ctx.fillRect(W*.08,H*.43,22,32);
      ctx.fillStyle='#cc2020'; ctx.fillRect(W*.10,H*.45,4,4);
      ctx.fillStyle='#e8d8c0'; ctx.fillRect(W*.68,H*.38,22,32);
      ctx.fillStyle='#181818'; ctx.fillRect(W*.70,H*.40,4,4);
    },
  };

  let _t=0;
  const fn=scenes[sceneId]||scenes['dice'];
  function tick(){
    fn(_t);
    _t+=0.04;
    _evAnimId=requestAnimationFrame(tick);
  }
  tick();
}

// ================================================================
//  showEventPanel — EventPanel v2
//  기존 인터페이스 (tag, title, body, choices) 완전 유지
//  theme은 EVENT_THEMES에서 tag로 자동 조회, 없으면 기본값
// ================================================================
function showEventPanel(tag,title,body,choices){
  // ── 테마 조회 ──────────────────────────────────────────────
  const theme = EVENT_THEMES[tag] || {
    scene:'dice',accent:'#6040c0',
    bg:'radial-gradient(ellipse at 50% 60%,#100820 0%,#0a0814 60%)',
    tags:[]
  };

  // ── CSS 커스텀 프로퍼티 주입 ───────────────────────────────
  const panel = $('ovEvent').querySelector('.ev-panel');
  if(panel) panel.style.setProperty('--ev-accent', theme.accent);

  // ── 테마 배경 ──────────────────────────────────────────────
  const bg=$('evThemeBg');
  if(bg) bg.style.background=theme.bg;

  // ── 헤더 아이볼로 ──────────────────────────────────────────
  const eyebrow=$('eventTag');
  if(eyebrow) eyebrow.textContent=tag;

  // ── 태그 뱃지 ──────────────────────────────────────────────
  const tagArea=$('evTagArea');
  if(tagArea){
    tagArea.innerHTML='';
    (theme.tags||[]).forEach(tb=>{
      const el=document.createElement('span');
      el.className='ev-tag-badge';
      el.textContent=tb.t;
      el.style.cssText=`color:${tb.c};background:${tb.bg};border-color:${tb.c}44;`;
      tagArea.appendChild(el);
    });
  }

  // ── 씬 캔버스 ──────────────────────────────────────────────
  const canvas=$('evSceneCanvas');
  if(canvas) evDrawScene(theme.scene||'dice', canvas);

  const sceneLabel=$('evSceneLabel');
  if(sceneLabel) sceneLabel.textContent=(theme.scene||'').toUpperCase();

  // ── 제목 / 본문 ───────────────────────────────────────────
  $('eventTitle').textContent=title;
  $('eventBody').textContent=body;

  // ── 구분선 accent 색 ───────────────────────────────────────
  const divider=$('evDivider');
  if(divider) divider.style.setProperty('--ev-accent',theme.accent);

  // ── 선택지 ────────────────────────────────────────────────
  const cont=$('eventChoices');
  cont.innerHTML='';
  choices.forEach(c=>{
    const el=document.createElement('button');
    const disabled=c.disabled&&c.disabled();
    el.className='choice';
    el.disabled=!!disabled;
    if(disabled) el.style.opacity='0.45';
    el.style.setProperty('--ev-accent',theme.accent);
    el.innerHTML='<div class="ttl">'+c.t+'</div>'+(c.desc?'<div class="desc">'+c.desc+'</div>':'');
    el.onclick=()=>{ if(el.disabled) return; Array.from(cont.children).forEach(ch=>{ ch.disabled=true; }); evStopScene(); hideAll(); c.f(); };
    cont.appendChild(el);
  });

  show('event');
}
function offerGladiatorReward(){
  showEventPanel('⚔ 검투장 보상','승리의 권리','관중이 세 가지 전리품을 내민다. 하나만 가져갈 수 있다.',[
    {t:'유물 선택',f:()=>eventOfferRelics(3,{},'⚔ 검투장 보상','피로 얻은 유물이다.',finishNode)},
    {t:'골드 획득 — +220G',f:()=>{addGold(220,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('검투장 상금','골드 +220',1500);updateHUD();finishNode();}},
    {t:'포션 획득 — 랜덤 전설 포션',f:()=>{eventAddPotionOrGold(eventRollPotionByRarity('legend'),60);finishNode();}},
  ]);
}

const EVENTS=[
  {tag:'🩸 수상한 제단',title:'핏빛 제단',body:'핏빛 제단이 당신을 부른다. 피를 많이 바칠수록 보상도 선명해진다.',
   choices:[
     {t:'체력 20% 잃기 → 랜덤 유물 획득',f:()=>{const loss=eventHpCostPct(0.20);banner('피의 대가','체력 -'+loss,1000);eventGiveRelic({},finishNode);}},
     {t:'체력 40% 잃기 → 유물 2개 중 선택',f:()=>{const loss=eventHpCostPct(0.40);banner('깊은 헌납','체력 -'+loss,1000);eventOfferRelics(2,{},'🩸 제단의 응답','둘 중 하나를 고른다.',finishNode);}},
     {t:'거절',f:()=>finishNode()},
   ]},
  {tag:'🎭 가면 상인',title:'이상한 가면을 쓴 상인',body:'상인은 웃는 얼굴과 우는 얼굴을 번갈아 보여준다. 진짜 물건은 비싸고, 공짜 물건은 수상하다.',
   choices:[
     {t:'골드 250 지불 → 영웅 유물 획득',disabled:()=>gold<250,f:()=>{spendGold(250,'event');updateHUD();eventGiveRelic({tiers:['epic']},finishNode);}},
     {t:'최대 체력 20 감소 → 35% 전설, 실패 시 저주 유물',f:()=>{eventMaxHpDelta(-20);if(Math.random()<0.35) eventGiveRelic({tiers:['legend']},finishNode); else eventGiveRelic({curseOnly:true},finishNode);}},
     {t:'거절',f:()=>finishNode()},
   ]},
  {tag:'💀 저주받은 보물상자',title:'잠긴 상자',body:'상자 안쪽에서 금속 긁히는 소리가 난다. 열면 유물, 부수면 안전한 돈이다.',
   choices:[
     {t:'열기 → 유물 획득, 30% 확률 저주 유물',f:()=>{const cursed=Math.random()<0.30;eventGiveRelic(cursed?{curseOnly:true}:{noCurse:true},finishNode);}},
     {t:'파괴 → 골드 획득',f:()=>{const g=irand(110,180);addGold(g,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('상자 파괴','골드 +'+g,1400);updateHUD();finishNode();}},
   ]},
  {tag:'🎟️ 구독 알림',title:'시청자 선물',body:'“봉식님 구독 감사합니다!”\n채팅창에 파란 티켓 이모지가 쏟아진다.\n죽어도 다시 한 번 도전할 수 있는 기회가 생겼다.',
   filter:()=>diffSet.maxRetries!==Infinity,
   choices:[
     {t:'감사합니다! — 재도전 횟수 +1',f:()=>{if(grantRetryCharge(1,'구독 알림')) banner('🎟️ 재도전 +1','구독자 감사합니다!',1500);finishNode();}},
     {t:'괜찮아요 — 그냥 지나친다',f:()=>finishNode()},
   ]},
  {tag:'🕯 영혼 거래',title:'수상한 영혼',body:'투명한 손이 심장과 칼날을 저울에 올린다. 계약은 런이 끝날 때까지 남는다.',
   choices:[
     {t:'최대 체력 15% 감소 → 공격력 +3',f:()=>{eventMaxHpMul(0.85);player.dmg+=3;banner('영혼 거래','공격력 +3',1500);updateHUD();finishNode();}},
     {t:'최대 체력 15% 증가 → 공격력 -2',f:()=>{eventMaxHpDelta(Math.round(player.maxhp*0.15));player.dmg=Math.max(1,player.dmg-2);banner('영혼 거래','최대 체력 +15%, 공격력 -2',1500);updateHUD();finishNode();}},
     {t:'거절',f:()=>finishNode()},
   ]},
  {tag:'🎲 혼돈의 룰렛',title:'돌아가는 바퀴',body:'바늘이 어디에 멈출지는 아무도 모른다. 좋은 칸과 나쁜 칸의 간격이 너무 가깝다.',
   choices:[
     {t:'돌린다',f:()=>{const result=pick(['gold','heal','relic','curse','half']);if(result==='gold'){addGold(200,'event');banner('룰렛 대박','골드 +200',1500);updateHUD();finishNode();}else if(result==='heal'){healPlayer(Math.max(50,player.maxhp*0.55),player.x,player.y);banner('룰렛 회복','체력 회복',1500);finishNode();}else if(result==='relic'){eventGiveRelic({},finishNode);}else if(result==='curse'){eventGiveRelic({curseOnly:true},finishNode);}else{player.hp=Math.max(1,Math.floor(player.hp*0.5));banner('룰렛 역풍','현재 체력 절반',1500);updateHUD();finishNode();}}},
     {t:'무시',f:()=>finishNode()},
   ]},
  {tag:'⚔ 검투장',title:'피 묻은 모래',body:'관중이 함성을 지른다. 추가 전투에서 승리하면 원하는 전리품을 고를 수 있다.',
   choices:[
     {t:'입장 → 추가 전투, 승리 시 유물/골드/포션 선택',f:()=>{queueNextCombatMod({hpMul:1.25,spdMul:1.08,challenge:'gladiator',specialReward:offerGladiatorReward,banner:{big:'검투장 입장',small:'승리하면 전리품을 고른다'}});hideAll();startCombat('fight');state='play';syncChrome();}},
     {t:'떠난다',f:()=>finishNode()},
   ]},
  {tag:'🧪 수상한 물약',title:'라벨 없는 병',body:'색이 계속 바뀌는 물약이다. 마시면 즉시 효과가 오지만, 무슨 효과인지는 모른다.',
   choices:[
     {t:'마신다',f:()=>{const result=pick(['heal','atk','armor','curse']);if(result==='heal'){healPlayer(Math.max(45,player.maxhp*0.45),player.x,player.y);banner('물약 효과','체력 회복',1400);finishNode();}else if(result==='atk'){player.dmg+=2.5;banner('물약 효과','공격력 +2.5',1400);updateHUD();finishNode();}else if(result==='armor'){player.armor=Math.min(0.85,player.armor+0.10);banner('물약 효과','받는 피해 -10%',1400);updateHUD();finishNode();}else{eventGiveRelic({curseOnly:true},finishNode);}}},
     {t:'버린다',f:()=>finishNode()},
   ]},
  {tag:'📚 금지된 서적',title:'봉인된 책',body:'책장을 넘기면 글자가 피부 위로 파고든다. 지식은 피를 요구한다.',
   choices:[
     {t:'읽기 → 체력 10% 소모 후 영구 강화',f:()=>{eventHpCostPct(0.10);const result=pick(['atk','crit','fire']);if(result==='atk'){player.dmg+=2;banner('금서의 지식','공격력 +2',1500);}else if(result==='crit'){player.critChance=Math.min(1,player.critChance+0.08);banner('금서의 지식','치명타 +8%',1500);}else{player.fireAdd+=0.12;banner('금서의 지식','발사속도 +12%',1500);}updateHUD();finishNode();}},
     {t:'무시',f:()=>finishNode()},
   ]},
  {tag:'👑 왕의 보관함',title:'금빛 보관함',body:'묵직한 자물쇠가 왕관 모양으로 빛난다. 정식 열쇠는 비싸고, 힘으로 열면 피를 본다.',
   choices:[
     {t:'열쇠 사용 — 300G → 신화 유물',disabled:()=>gold<300,f:()=>{spendGold(300,'event');updateHUD();eventGiveRelic({tiers:['mythic']},finishNode);}},
     {t:'강제로 연다 → 체력 50% 손실, 전설 유물',f:()=>{eventHpCostPct(0.50);eventGiveRelic({tiers:['legend']},finishNode);}},
     {t:'포기',f:()=>finishNode()},
   ]},
  {tag:'🧲 떠돌이 수집가',title:'낡은 배낭의 수집가',body:'수집가는 당신의 유물을 탐내고, 동시에 자기 물건도 팔고 싶어 한다.',
   choices:[
     {t:'유물 1개 제거 → 골드 300',disabled:()=>player.relics.length===0,f:()=>eventRemoveRandomRelicForGold()},
     {t:'골드 200 지불 → 랜덤 유물',disabled:()=>gold<200,f:()=>{spendGold(200,'event');updateHUD();eventGiveRelic({},finishNode);}},
     {t:'거절',f:()=>finishNode()},
   ]},
  {tag:'🔥 불타는 제물',title:'타오르는 항아리',body:'불꽃은 평범한 물약을 삼키고 더 강한 물약으로 되돌려 준다고 속삭인다.',
   choices:[
     {t:'현재 소지 포션 1개 파괴 → 랜덤 전설 포션',disabled:()=>!player.potions.length,f:()=>{const i=irand(0,player.potions.length-1);const old=player.potions.splice(i,1)[0];renderPotions();eventAddPotionOrGold(eventRollPotionByRarity('legend'),60);banner('제물 완료',(old?old.name:'포션')+'을 불태웠다',1600);finishNode();}},
     {t:'거절',f:()=>finishNode()},
   ]},
  {tag:'⚰ 봉인된 관',title:'차가운 석관',body:'관 뚜껑 아래에서 세 종류의 기운이 뒤섞인다. 신화, 전설, 저주.',
   choices:[
     {t:'연다 → 신화 10% / 전설 40% / 저주 50%',f:()=>{const r=Math.random();if(r<0.10) eventGiveRelic({tiers:['mythic']},finishNode); else if(r<0.50) eventGiveRelic({tiers:['legend']},finishNode); else eventGiveRelic({curseOnly:true},finishNode);}},
     {t:'무시',f:()=>finishNode()},
   ]},
  {tag:'💎 탐욕의 신전',title:'황금빛 신전',body:'신전은 생명과 돈을 같은 무게로 잰다. 어느 쪽을 바칠지 정해야 한다.',
   choices:[
     {t:'체력 50% 지불 → 골드 300',f:()=>{eventHpCostPct(0.50);addGold(300,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('탐욕의 축복','골드 +300',1600);updateHUD();finishNode();}},
     {t:'골드 전부 포기 → 체력 완전 회복',disabled:()=>gold<=0,f:()=>{const spent=spendGold(gold,'event');player.hp=player.maxhp;banner('탐욕 정화','골드 -'+spent+' / 체력 완전 회복',1600);updateHUD();finishNode();}},
     {t:'떠난다',f:()=>finishNode()},
   ]},
  // ====================================================
  //  신규 미지 이벤트 8종 — 비유물 보상 (골드/XP/체력/포션/전투변수)
  //  추가 후 총 EVENTS: 21종 / 유물 가능: 9종 (약 43%)
  // ====================================================
  {tag:'🏋 부서진 훈련장',title:'낡은 훈련장',body:'먼지가 쌓인 더미와 기계들이 여전히 돌아가고 있다. 무너질 것 같지만, 쓸 수는 있다.',
   choices:[
     {t:'혹독한 훈련 — 체력 12% 감소, 경험치 +60',f:()=>{eventHpCostPct(0.12);gainXP(60);banner('혹독한 훈련','경험치 +60',1400);finishNode();}},
     {t:'방어 훈련 — 현재 체력 -15, 최대 체력 +15',f:()=>{player.hp=Math.max(1,player.hp-15);player.maxhp+=TRAINING_HP_BONUS;player.hp=Math.min(player.hp,player.maxhp);banner('방어 훈련','최대 체력 +15',1400);updateHUD();finishNode();}},
     {t:'그냥 지나간다',f:()=>finishNode()},
   ]},
  {tag:'🍲 수상한 요리사',title:'이상한 냄새의 요리',body:'웃는 얼굴의 요리사가 김이 모락모락 나는 냄비를 내민다. 뭘 넣었는지는 묻지 않는 게 나을 것 같다.',
   choices:[
     {t:'먹는다 — 50% 체력 25% 회복 / 30% 최대체력 +3 / 20% 체력 15% 감소',f:()=>{
       const r=Math.random();
       if(r<0.50){healPlayer(Math.max(20,Math.round(player.maxhp*0.25)),player.x,player.y);banner('묘한 맛','뭔가 회복됐다',1400);}
       else if(r<0.80){player.maxhp+=3;player.hp=Math.min(player.hp,player.maxhp);banner('묘한 맛','몸이 단단해진 것 같다 +3',1400);updateHUD();}
       else{const loss=Math.max(1,Math.round(player.maxhp*0.15));player.hp=Math.max(1,player.hp-loss);banner('묘한 맛','속이 이상하다… -'+loss,1400);updateHUD();}
       finishNode();}},
     {t:'포장해 간다 — 골드 40 지불, 랜덤 포션 1개',disabled:()=>gold<40,f:()=>{spendGold(40,'event');updateHUD();const pot=rollPotion();if(!addPotion(pot)){addGold(30,'event');updateHUD();banner('포장 완료','가방이 꽉 찼다 — 골드 일부 환불',1200);}else{banner('포장 완료',pot.name+' 획득',1300);}finishNode();}},
     {t:'거절한다',f:()=>finishNode()},
   ]},
  {tag:'🗺 낡은 지도',title:'뜯긴 모퉁이의 지도',body:'피로 그린 것처럼 붉게 바랜 지도. 앞 길이 희미하게 보인다.',
   choices:[
     {t:'지도를 해독한다 — 골드 30 지불, 다음 전투 보상 골드 +25%',disabled:()=>gold<30,f:()=>{spendGold(30,'event');updateHUD();queueNextCombatMod({rewardMul:1.25});banner('지도 해독','다음 전투 골드 보상 +25%',1400);finishNode();}},
     {t:'지도를 판다 — 골드 +70',f:()=>{addGold(70,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('지도 판매','골드 +70',1300);updateHUD();finishNode();}},
     {t:'찢긴 길을 따른다 — 다음 전투 골드 보상 +50% / 적 체력 +20%',f:()=>{queueNextCombatMod({hpMul:1.20,rewardMul:1.5,banner:{big:'험한 길',small:'적이 질겨졌다 / 골드 보상 +50%'}});banner('험한 길','골드 보상 +50% · 적 체력 +20%',1500);finishNode();}},
   ]},
  {tag:'🩸 피 묻은 우물',title:'찜찜한 우물',body:'우물 바닥에서 뭔가 붉은 것이 비쳐 올라온다. 마실 수도 씻을 수도 있다. 그게 뭔지는 몰라도.',
   choices:[
     {t:'물을 마신다 — 체력 35% 회복, 다음 전투 적 공격력 +15%',f:()=>{
       healPlayer(Math.max(20,Math.round(player.maxhp*0.35)),player.x,player.y);
       queueNextCombatMod({atkMul:1.15,banner:{big:'찜찜한 회복',small:'뭔가 안 좋은 것 마신 것 같다…'}});
       banner('꿀꺽','체력 회복 / 다음 전투 적 강화',1400);finishNode();}},
     {t:'몸을 씻는다 — 체력 10% 감소, 저주 1개 제거(없으면 체력 15% 회복)',f:()=>{
       const cursedRelics=player.relics.filter(r=>r.cls==='curse');
       if(cursedRelics.length){
         const i=player.relics.indexOf(cursedRelics[0]);
         player.relics.splice(i,1);
         syncDoomWorshipHp(player);
         const loss=Math.max(1,Math.round(player.maxhp*0.10));
         player.hp=Math.max(1,player.hp-loss);
         banner('정화 완료',cursedRelics[0].name+' 저주 해제',1600);
       } else {
         healPlayer(Math.max(10,Math.round(player.maxhp*0.15)),player.x,player.y);
         banner('개운하다','해제할 저주 없음 — 대신 체력 회복',1400);
       }
       updateHUD();finishNode();}},
     {t:'동전을 던진다 — 골드 25 지불, 50% 최대체력 +2 / 50% 꽝',disabled:()=>gold<25,f:()=>{
       spendGold(25,'event');updateHUD();
       if(Math.random()<0.50){player.maxhp+=2;player.hp=Math.min(player.hp,player.maxhp);banner('동전 앞면','최대 체력 +2',1300);updateHUD();}
       else{banner('동전 뒷면','아무 일도 없었다',1300);}
       finishNode();}},
   ]},
  {tag:'🧭 길 잃은 모험가',title:'지쳐 쓰러진 모험가',body:'길가에 쓰러진 모험가. 아직 살아있다. 도울지 빼앗을지, 무시할지.',
   choices:[
     {t:'도와준다 — 골드 50 지불, 경험치 +50, 다음 상점 10% 할인',disabled:()=>gold<50,f:()=>{
       spendGold(50,'event');updateHUD();gainXP(50);nextShopDiscount=0.10;
       banner('모험가 구조','경험치 +50 / 다음 상점 10% 할인',1600);finishNode();}},
     {t:'물자를 빼앗는다 — 골드 +80, 현재 체력 10% 감소',f:()=>{
       addGold(80,'event');try{sfx.coin&&sfx.coin();}catch(e){}
       const loss=Math.max(1,Math.round(player.maxhp*0.10));
       player.hp=Math.max(1,player.hp-loss);
       banner('노획','골드 +80 / 체력 -'+loss,1400);updateHUD();finishNode();}},
     {t:'무시한다',f:()=>finishNode()},
   ]},
  {tag:'🌫 검은 안개',title:'알 수 없는 안개',body:'한치 앞도 보이지 않는 안개. 들어가면 뭐가 있을지 아무도 모른다.',
   choices:[
     {t:'안으로 들어간다 — 40% 경험치 +80 / 40% 골드 +100 / 20% 체력 25% 감소',f:()=>{
       const r=Math.random();
       if(r<0.40){gainXP(80);banner('안개 속 발견','경험치 +80',1400);}
       else if(r<0.80){addGold(100,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('안개 속 발견','골드 +100',1400);updateHUD();}
       else{const loss=Math.max(1,Math.round(player.maxhp*0.25));player.hp=Math.max(1,player.hp-loss);banner('안개의 함정','체력 -'+loss,1400);updateHUD();}
       finishNode();}},
     {t:'횃불을 밝힌다 — 골드 30 지불, 경험치 +35 확정',disabled:()=>gold<30,f:()=>{
       spendGold(30,'event');updateHUD();gainXP(35);banner('안전하게','경험치 +35',1400);finishNode();}},
     {t:'돌아간다',f:()=>finishNode()},
   ]},
  {tag:'📦 고장난 보급 상자',title:'잠긴 보급 상자',body:'군용 표식이 찍힌 낡은 상자. 자물쇠가 망가져 억지로 열어야 할 것 같다.',
   choices:[
     {t:'부순다 — 체력 8% 감소, 50% 포션 / 50% 골드 +50',f:()=>{
       const loss=Math.max(1,Math.round(player.maxhp*0.08));
       player.hp=Math.max(1,player.hp-loss);
       if(Math.random()<0.50){const pot=rollPotion();if(!addPotion(pot)){addGold(40,'event');updateHUD();banner('상자 파괴','포션 슬롯 가득 — 골드 +40 대체',1300);}else{banner('상자 파괴',pot.name+' 획득',1300);}}
       else{addGold(50,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('상자 파괴','골드 +50',1300);updateHUD();}
       updateHUD();finishNode();}},
     {t:'조심히 연다 — 50% 포션 / 50% 꽝',f:()=>{
       if(Math.random()<0.50){const pot=rollPotion();if(!addPotion(pot)){addGold(30,'event');updateHUD();banner('빈손','포션 슬롯 가득 — 골드 +30',1300);}else{banner('개봉 성공',pot.name+' 획득',1300);}}
       else{banner('빈 상자','아무것도 없었다',1300);}
       finishNode();}},
    {t:'그냥 판다 — 골드 +90',f:()=>{addGold(90,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('상자 통째로 판매','골드 +90',1300);updateHUD();finishNode();}},
   ]},
  {tag:'⏳ 시간의 균열',title:'뒤틀린 시공간',body:'공기가 일렁인다. 시간이 이곳에서 잘못 흐르고 있다.',
   choices:[
     {t:'상처를 되감는다 — 골드 40 지불, 체력 20% 회복',disabled:()=>gold<40,f:()=>{
       spendGold(40,'event');updateHUD();healPlayer(Math.max(20,Math.round(player.maxhp*0.20)),player.x,player.y);
       banner('시간 역행','체력 20% 회복',1400);finishNode();}},
     {t:'성장을 앞당긴다 — 체력 12% 감소, 경험치 +60',f:()=>{
       eventHpCostPct(0.12);gainXP(60);banner('시간 가속','경험치 +60',1400);finishNode();}},
     {t:'운명을 흔든다 — 다음 전투 골드/경험치 +30% / 적 체력 +15%',f:()=>{
       queueNextCombatMod({hpMul:1.15,rewardMul:1.30,xpMul:1.30,banner:{big:'균열의 도박',small:'골드/경험치 +30% / 적 체력 +15%'}});
       banner('시간 도박','골드/경험치 +30% · 적 체력 +15%',1500);finishNode();}},
   ]},
  {id:'twisted_mirror',tag:'🪞 뒤틀린 거울',title:'뒤틀린 거울',body:'깨진 거울 속의 내가 다른 선택을 하고 있다.',
   choices:[
     {t:'거울을 들여다본다 — 체력 12%를 잃고 특성 1개 변환',disabled:()=>!eventCanTransformPerk(),f:()=>{eventHpCostCurrentPct(0.12);eventTransformRandomPerk();}},
     {t:'초점을 맞춘다 — 골드 120을 내고 특성 1개 변환',disabled:()=>gold<120||!eventCanTransformPerk(),f:()=>{spendGold(120,'event');updateHUD();eventTransformRandomPerk();}},
     {t:'거울을 깨고 떠난다',f:()=>finishNode()},
   ]},
  {id:'forgotten_statue',tag:'🗿 잊힌 조각상',title:'잊힌 조각상',body:'낡은 조각상이 희미하게 웃고 있다. 무언가를 바치면 축복을 줄 것 같다.',
   choices:[
     {t:'피를 바친다 — 최대 체력 +18, 저주 유물 획득',f:()=>{player.maxhp+=18;player.hp=Math.min(player.hp,player.maxhp);updateHUD();eventGiveCurseThen(finishNode);}},
     {t:'금화를 바친다 — 골드 160 → 랜덤 유물',disabled:()=>gold<160,f:()=>{spendGold(160,'event');updateHUD();eventGiveCleanRelic({},finishNode);}},
     {t:'고개를 숙이고 지나간다 — 체력 15 회복',f:()=>{healPlayer(TRAINING_HP_BONUS,player.x,player.y);banner('조각상의 온기','체력 +15',1300);finishNode();}},
   ]},
  {id:'silent_library',tag:'📚 침묵의 도서관',title:'침묵의 도서관',body:'먼지 쌓인 책들이 아무 소리 없이 펼쳐져 있다.',
   choices:[
     {t:'금지된 책을 읽는다 — 체력 20%를 잃고 경험치 +90',f:()=>{eventHpCostCurrentPct(0.20);gainXP(90);banner('금지된 지식','경험치 +90',1500);finishNode();}},
     {t:'찢어진 책을 고른다 — 저주 유물 획득, 특성 선택 1회',f:()=>{eventGiveCurseThen(()=>{pendingLevels++;updateHUD();showLevelUp();});}},
     {t:'책을 판다 — 골드 +80',f:()=>{addGold(80,'event');try{sfx.coin&&sfx.coin();}catch(e){}banner('책 판매','골드 +80',1300);updateHUD();finishNode();}},
   ]},
  {id:'black_market',tag:'🕶 검은 시장',title:'검은 시장',body:'그림자 속 상인이 속삭인다. “정가보다 싸게, 대신 안전은 보장 못 합니다.”',
   choices:[
     {t:'밀거래한다 — 골드 220 → 에픽 이상 유물',disabled:()=>gold<220,f:()=>{spendGold(220,'event');updateHUD();eventTakeRelic(eventRollBlackMarketRelic(),finishNode);}},
     {t:'할인권을 산다 — 골드 80 → 다음 상점 가격 -35%',disabled:()=>gold<80,f:()=>{spendGold(80,'event');nextShopDiscount=Math.max(nextShopDiscount,0.35);banner('검은 할인권','다음 상점 가격 -35%',1500);updateHUD();finishNode();}},
     {t:'훔친다 — 45% 확률 유물 획득, 실패 시 체력 30% 손실',f:()=>{if(Math.random()<0.45) eventGiveCleanRelic({},finishNode); else {const loss=eventHpCostCurrentPct(0.30);banner('도둑질 실패','체력 -'+loss,1500);finishNode();}}},
     {t:'아무것도 사지 않는다',f:()=>finishNode()},
   ]},
];

function act3EventBand(band){
  const row=Number(currentRow)||0;
  const mid=(typeof MIDBOSS_ROW!=='undefined'?MIDBOSS_ROW:7);
  const camp2=(typeof CAMP2_ROW!=='undefined'?CAMP2_ROW:13);
  if(band==='early') return row<=mid+1;
  if(band==='mid') return row>=Math.max(1,mid-1)&&row<=camp2+1;
  if(band==='late') return row>=Math.max(1,camp2-2);
  return true;
}
function act3RemoveRandomCurse(){
  const idxs=[];
  for(let i=0;i<player.relics.length;i++) if(player.relics[i]&&player.relics[i].cls==='curse') idxs.push(i);
  if(!idxs.length) return null;
  const i=pick(idxs), r=player.relics.splice(i,1)[0];
  updateHUD();
  return r;
}
function act3AddPotionReward(rarity,goldFallback){
  const pot=rarity?eventRollPotionByRarity(rarity):rollPotion();
  eventAddPotionOrGold(pot,goldFallback||45);
  return pot;
}
function act3BeginEventCombat(mod,kind){
  queueNextCombatMod(mod||{});
  hideAll();
  startCombat(kind||'fight');
  state='play';
  syncChrome();
}

const ACT3_EVENTS=[
  {id:'act3_broken_chat',tag:'3막 · 깨진 채팅창',title:'깨진 채팅창',body:'화면 한쪽에 깨진 채팅창이 떠 있다. 문장은 알아볼 수 없지만, 누군가 계속 말을 걸고 있다.',
   filter:()=>act===3&&act3EventBand('early'),
   choices:[
     {t:'채팅창을 복구한다 — 유물 선택, 다음 전투 적 체력 +12%',desc:'읽을수록 더 많은 것이 드러난다.',f:()=>{queueNextCombatMod({hpMul:1.12,banner:{big:'복구된 채팅창',small:'다음 전투의 적이 조금 단단해진다'}});eventOfferRelics(3,{noCurse:true},'채팅창 복구','깨진 로그 속에서 유물을 하나 고른다.',finishNode);}},
     {t:'조용히 닫는다 — 체력 22% 회복',desc:'아무것도 읽지 않는 선택.',f:()=>{healPlayer(Math.max(24,Math.round(player.maxhp*0.22)),player.x,player.y);banner('채팅창 닫힘','체력 회복',1200);finishNode();}},
     {t:'로그를 뒤진다 — 골드 +140, 최대 체력 -8',desc:'삭제된 기록에는 가격이 붙어 있다.',f:()=>{addGold(140,'event');eventMaxHpDelta(-8);try{sfx.coin&&sfx.coin();}catch(e){}banner('로그 추출','골드 +140 / 최대 체력 -8',1500);finishNode();}},
   ]},
  {id:'act3_black_donation',tag:'3막 · 검은 후원 알림',title:'검은 후원 알림',body:'갑자기 화면에 검은 후원 알림이 뜬다. 금액은 크지만 송출 상태가 이상하다.',
   filter:()=>act===3&&act3EventBand('mid'),
   choices:[
     {t:'후원을 받는다 — 골드 +230, 다음 전투 적 공격 +18%',desc:'돈은 들어온다. 대신 화면이 흔들린다.',f:()=>{addGold(230,'event');updateHUD();queueNextCombatMod({atkMul:1.18,banner:{big:'검은 후원',small:'다음 전투 적 공격력 +18%'}});banner('후원 수락','골드 +230',1400);finishNode();}},
     {t:'익명 처리 후 받는다 — 골드 +120, 포션 1개, 발사속도 -10%',desc:'덜 위험하지만 흔적은 남는다.',f:()=>{addGold(120,'event');act3AddPotionReward(null,45);queueNextCombatMod({fireHandicap:1.10,banner:{big:'익명 후원',small:'다음 전투 발사속도 -10%'}});banner('익명 처리','골드 +120 / 포션 지급',1500);finishNode();}},
     {t:'거절한다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_admin_auth',tag:'3막 · 관리자 권한 요청',title:'관리자 권한 요청',body:'시스템이 관리자 권한을 부여하겠냐고 묻는다. 승인하면 강한 힘을 얻지만, 규칙이 뒤틀릴 수 있다.',
   filter:()=>act===3&&act3EventBand('mid'),
   choices:[
     {t:'권한을 승인한다 — 고급 유물, 45% 확률 저주',desc:'관리자 권한은 공짜가 아니다.',f:()=>{if(Math.random()<0.45){eventGiveRelic({curseOnly:true},()=>eventOfferRelics(3,{tiers:['epic','legend']},'관리자 권한','권한 상승 보상이다.',finishNode));}else eventOfferRelics(3,{tiers:['epic','legend']},'관리자 권한','권한 상승 보상이다.',finishNode);}},
     {t:'제한 승인한다 — 골드 +90, 포션 1개',desc:'힘은 적지만 손실도 적다.',f:()=>{addGold(90,'event');act3AddPotionReward(null,40);updateHUD();banner('제한 승인','골드 +90 / 포션 지급',1400);finishNode();}},
     {t:'거부한다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_buffer_rest',tag:'3막 · 버퍼링된 휴식처',title:'버퍼링된 휴식처',body:'안전해 보이는 휴식처지만 화면이 끊기고 시간이 느리게 흐른다.',
   filter:()=>act===3&&act3EventBand('early'),
   choices:[
     {t:'잠시 눕는다 — 체력 45% 회복, 다음 전투 적 속도 +10%',f:()=>{healPlayer(Math.max(45,Math.round(player.maxhp*0.45)),player.x,player.y);queueNextCombatMod({spdMul:1.10,banner:{big:'버퍼링 후유증',small:'다음 전투 적 속도 +10%'}});banner('짧은 휴식','체력 회복',1400);finishNode();}},
     {t:'깊게 동기화한다 — 풀회복 + 포션, 다음 전투 발사속도 -18%',f:()=>{player.hp=player.maxhp;act3AddPotionReward('rare',45);queueNextCombatMod({fireHandicap:1.18,banner:{big:'깊은 버퍼링',small:'다음 전투 발사속도 -18%'}});updateHUD();banner('동기화 완료','체력 완전 회복 / 포션 지급',1500);finishNode();}},
     {t:'그냥 떠난다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_forbidden_filter',tag:'3막 · 금지된 필터',title:'금지된 필터',body:'금지된 필터가 작동 중이다. 무언가를 치르면 부정적인 흔적을 지울 수 있을 것 같다.',
   filter:()=>act===3&&act3EventBand('early'),
   choices:[
     {t:'필터를 강화한다 — 골드 80 지불, 저주 1개 제거',disabled:()=>gold<80,f:()=>{spendGold(80,'event');const r=act3RemoveRandomCurse();if(r) banner('필터 강화',r.name+' 제거',1500);else{player.buffs.shield=Math.max(player.buffs.shield||0,3);banner('필터 강화','저주가 없어 3초 보호막 획득',1400);}updateHUD();finishNode();}},
     {t:'시스템을 강제 초기화한다 — 저주 제거 또는 버프, 최대 체력 -10',f:()=>{const r=act3RemoveRandomCurse();eventMaxHpDelta(-10);if(r) banner('강제 초기화',r.name+' 제거 / 최대 체력 -10',1600);else{player.dmg+=1.5;banner('강제 초기화','공격력 +1.5 / 최대 체력 -10',1600);}finishNode();}},
     {t:'무시한다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_replay_error',tag:'3막 · 깨진 다시보기',title:'깨진 다시보기',body:'이전 장면들이 깨진 화면으로 재생된다. 놓친 보상, 버린 선택, 지나친 흔적이 아직 남아 있다.',
   filter:()=>act===3&&act3EventBand('mid'),
   choices:[
     {t:'재생한다 — 랜덤 보상, 30% 확률 체력 손실',f:()=>{const r=pick(['gold','potion','relic']);if(r==='gold'){addGold(160,'event');updateHUD();banner('다시보기 보상','골드 +160',1400);finishNode();}else if(r==='potion'){act3AddPotionReward(null,45);if(Math.random()<0.30)eventHpCostPct(0.10);finishNode();}else{if(Math.random()<0.30)eventHpCostPct(0.10);eventGiveRelic({noCurse:true},finishNode);}}},
     {t:'깊게 탐색한다 — 고급 유물 선택, 다음 전투 강화',f:()=>{queueNextCombatMod({hpMul:1.18,atkMul:1.12,banner:{big:'리플레이 잔상',small:'다음 전투 적 체력/공격 강화'}});eventOfferRelics(3,{tiers:['epic','legend']},'깨진 다시보기','남은 프레임에서 하나를 고른다.',finishNode);}},
     {t:'재생을 중지한다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_abyss_subscriber',tag:'3막 · 심연의 구독자',title:'심연의 구독자',body:'보이지 않는 시청자가 구독 버튼을 누른다. 이름은 보이지 않지만, 강한 힘을 줄 수 있다.',
   filter:()=>act===3&&act3EventBand('late'),
   choices:[
     {t:'구독을 받는다 — 전설/신화 유물, 다음 전투 크게 강화',f:()=>{queueNextCombatMod({hpMul:1.28,spdMul:1.12,atkMul:1.12,banner:{big:'심연의 구독자',small:'다음 전투가 거칠어진다'}});eventGiveRelic({tiers:['legend','mythic']},finishNode);}},
     {t:'안전하게 받는다 — 골드 +120, 희귀 이상 유물, 체력 -10%',f:()=>{addGold(120,'event');eventHpCostPct(0.10);eventGiveRelic({tiers:['rare','epic']},finishNode);}},
     {t:'차단한다 — 효과 없음',f:()=>finishNode()},
   ]},
  {id:'act3_end_stream',tag:'3막 · 방송 종료 버튼',title:'방송 종료 버튼',body:'눈앞에 방송 종료 버튼이 떠 있다. 누르면 많은 것을 얻지만, 직후 무언가가 바로 시작된다.',
   filter:()=>act===3&&act3EventBand('late'),
   choices:[
     {t:'버튼을 누른다 — 보상 후 즉시 강한 전투',f:()=>{addGold(120,'event');act3AddPotionReward('rare',45);queueNextCombatMod({hpMul:1.55,spdMul:1.15,atkMul:1.12,rewardMul:1.6,banner:{big:'방송은 끝나지 않았다',small:'강한 전투가 시작된다'}});act3BeginEventCombat({},'fight');}},
     {t:'반만 누른다 — 골드 +90, 다음 전투 강화',f:()=>{addGold(90,'event');updateHUD();queueNextCombatMod({hpMul:1.20,atkMul:1.10,banner:{big:'종료 버튼 잔상',small:'다음 전투 적 체력/공격 강화'}});banner('반쯤 눌림','골드 +90',1300);finishNode();}},
     {t:'건드리지 않는다 — 효과 없음',f:()=>finishNode()},
   ]},
];

function startEvent(){
  const basePool=EVENTS.filter(ev=>!ev.filter||ev.filter());
  const act3Pool=(act===3&&typeof ACT3_EVENTS!=='undefined')?ACT3_EVENTS.filter(ev=>!ev.filter||ev.filter()):[];
  let pool=basePool;
  if(act3Pool.length){
    // Act 3 gets its own mystery flavor most of the time, while legacy events
    // still appear often enough to keep the run varied.
    pool=Math.random()<0.72?act3Pool:basePool.concat(act3Pool);
  }
  const ev=pick(pool.length?pool:basePool);
  showEventPanel(ev.tag,ev.title,ev.body,ev.choices);
}

// ========================================================
//  모닷불 (휴식 / 단련)
// ========================================================
const TRAIN_OPTS=[
  {label:'최대 체력 +16', f:()=>{ player.maxhp+=16; healPlayer(16,player.x,player.y); }},
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
const POTION_RARITIES={
  common:{name:'일반', col:'#ffffff', weight:60},
  rare:{name:'희귀', col:'#5aa9ff', weight:30},
  epic:{name:'영웅', col:'#c46bff', weight:8},
  legend:{name:'전설', col:'#ffd34d', weight:2},
};
const POTION_GRADE_ALIAS={
  '일반':'common','커먼':'common','common':'common',
  '희귀':'rare','레어':'rare','rare':'rare',
  '영웅':'epic','에픽':'epic','epic':'epic',
  '전설':'legend','legend':'legend','legendary':'legend'
};
const POTION_GRADE_COST_MUL={
  common:1.00,
  rare:1.35,
  epic:1.90,
  legend:2.70
};
function getPotionGrade(potion){
  const raw=(potion&&(potion.rarity||potion.grade||potion.tier))||'common';
  const key=String(raw||'common').trim().toLowerCase();
  return POTION_GRADE_ALIAS[key]||POTION_GRADE_ALIAS[String(raw||'').trim()]||'common';
}
function potionGradeInfo(potion){
  const grade=getPotionGrade(potion);
  return POTION_RARITIES[grade]||POTION_RARITIES.common;
}
function getPotionShopBasePrice(potion,shopAct){
  const grade=getPotionGrade(potion);
  const gradeMul=POTION_GRADE_COST_MUL[grade]||1;
  const actNum=Number.isFinite(Number(shopAct))?Number(shopAct):1;
  const base=40+actNum*5+Math.random()*14;
  return Math.max(1,Math.round(base*gradeMul));
}
// Potion healing balance (normal 기준): small=early sustain, medium=mid-run stabilize,
// regen=delayed total healing, chalice=legendary emergency full heal.
const POTION_HEALING={
  heal:{pct:0.35,min:40,max:90,desc:'최대 체력의 35% 회복 (40~90)'},
  greater_heal:{pct:0.70,min:80,max:160,desc:'최대 체력의 70% 회복 (80~160)'},
  regen_potion:{perSec:12,duration:10,total:120,desc:'10초 동안 초당 체력 12 회복'},
  chalice:{full:true,desc:'체력 완전 회복'}
};
function potionHealAmount(id,p){
  p=p||player;
  const spec=POTION_HEALING[id];
  if(!spec) return 0;
  if(spec.full) return p.maxhp;
  return clamp(p.maxhp*spec.pct,spec.min,spec.max);
}
const POTIONS=[
  {id:'heal', rarity:'common', name:'치유 물약', icon:'❤️', desc:POTION_HEALING.heal.desc, use:p=>{healPlayer(potionHealAmount('heal',p),player.x,player.y);}},
  {id:'combat', rarity:'common', name:'전투 물약', icon:'🟥', desc:'8초간 공격력 +4', use:p=>{addPotionBuff(p,{id:'combat',name:'전투 물약',label:'공격력 +4',icon:'🟥',desc:'8초간 공격력 증가',t:8,atkFlat:4});}},
  {id:'swift', rarity:'common', name:'신속 물약', icon:'🟨', desc:'8초간 발사속도 +20%', use:p=>{addPotionBuff(p,{id:'swift',name:'신속 물약',label:'발사속도 +20%',icon:'🟨',desc:'8초간 발사속도 증가',t:8,fireAdd:0.20});}},
  {id:'dodge_refill', rarity:'common', name:'회피 물약', icon:'🌀', desc:'베인Q 즉시 1충전', use:p=>{p.dodgeCharges=Math.min(p.dodgeMaxCharges||1,(p.dodgeCharges||0)+1); if(p.dodgeCharges>=p.dodgeMaxCharges) p.dodgeCd=0;}},
  {id:'greater_heal', rarity:'rare', name:'상급 치유 물약', icon:'💚', desc:POTION_HEALING.greater_heal.desc, use:p=>{healPlayer(potionHealAmount('greater_heal',p),player.x,player.y);}},
  {id:'fury', rarity:'rare', name:'분노 물약', icon:'🔥', desc:'8초간 공격력 +5', use:p=>{addPotionBuff(p,{id:'fury',name:'분노 물약',label:'공격력 +5',icon:'🔥',desc:'8초간 공격력 증가',t:8,atkFlat:5});}},
  {id:'focus', rarity:'rare', name:'집중 물약', icon:'🎯', desc:'8초간 발사속도 +30%', use:p=>{addPotionBuff(p,{id:'focus',name:'집중 물약',label:'발사속도 +30%',icon:'🎯',desc:'8초간 발사속도 증가',t:8,fireAdd:0.30});}},
  {id:'ironclad', rarity:'rare', name:'철갑 물약', icon:'🛡️', desc:'8초간 받는 피해 25% 감소', use:p=>{addPotionBuff(p,{id:'ironclad',name:'철갑 물약',label:'피해감소 +25%',icon:'🛡️',desc:'8초간 받는 피해 감소',t:8,armor:0.25});}},
  {id:'lightning_potion', rarity:'rare', name:'번개 물약', icon:'⚡', desc:'랜덤 적 10회 타격', use:p=>{useLightningPotion();}},
  {id:'bomb_potion', rarity:'rare', name:'폭탄 물약', icon:'💣', desc:'사용 즉시 공격력 기반 범위 폭발', use:p=>{useBombPotion();}},
  {id:'berserk_potion', rarity:'epic', name:'광폭 물약', icon:'💢', desc:'6초간 공격력 +8', use:p=>{addPotionBuff(p,{id:'berserk_potion',name:'광폭 물약',label:'공격력 +8',icon:'💢',desc:'6초간 공격력 증가',t:6,atkFlat:8});}},
  {id:'hyperfocus', rarity:'epic', name:'초집중 물약', icon:'⚡', desc:'6초간 발사속도 +50%', use:p=>{addPotionBuff(p,{id:'hyperfocus',name:'초집중 물약',label:'발사속도 +50%',icon:'⚡',desc:'6초간 발사속도 증가',t:6,fireAdd:0.50});}},
  {id:'regen_potion', rarity:'epic', name:'재생 물약', icon:'🌿', desc:POTION_HEALING.regen_potion.desc, use:p=>{addPotionBuff(p,{id:'regen_potion',name:'재생 물약',label:'재생 +12/초',icon:'🌿',desc:'10초 동안 체력 재생',t:10,regen:12});}},
  {id:'barrier', rarity:'epic', name:'보호막 물약', icon:'🔵', desc:'피해 무효 보호막 1회 생성', use:p=>{p.hitShield=Math.max(p.hitShield||0,1);}},
  {id:'ghost', rarity:'epic', name:'유령 물약', icon:'👻', desc:'2초 무적', use:p=>{p.buffs.shield=Math.max(p.buffs.shield||0,2);}},
  {id:'holy', rarity:'legend', name:'신성 물약', icon:'✨', desc:'3초 무적', use:p=>{p.buffs.shield=Math.max(p.buffs.shield||0,3);}},
  {id:'time_stop', rarity:'legend', name:'시간 정지 물약', icon:'⏱️', desc:'3초간 모든 적 정지', use:p=>{p.timeStop=Math.max(p.timeStop||0,3); banner('⏱️ 시간 정지','모든 적이 멈췄다',900);}},
  {id:'immortal', rarity:'legend', name:'불사 물약', icon:'🪽', desc:'죽을 피해 1회 무시, 체력 1로 생존', use:p=>{p.deathWard=Math.max(p.deathWard||0,1);}},
  {id:'chalice', rarity:'legend', name:'생명의 성배', icon:'🏆', desc:POTION_HEALING.chalice.desc, use:p=>{healPlayer(potionHealAmount('chalice',p),player.x,player.y);}},
  {id:'awakening', rarity:'legend', name:'각성 물약', icon:'🌟', desc:'8초간 공격력 +4, 발사속도 +25%', use:p=>{addPotionBuff(p,{id:'awakening',name:'각성 물약',label:'공격력 +4 / 발사속도 +25%',icon:'🌟',desc:'8초간 공격력과 발사속도 증가',t:8,atkFlat:4,fireAdd:0.25});}},
];
function rollPotionRarity(){
  const entries=Object.entries(POTION_RARITIES);
  const total=entries.reduce((sum,kv)=>sum+kv[1].weight,0);
  let r=Math.random()*total;
  for(const [key,data] of entries){ r-=data.weight; if(r<=0) return key; }
  return 'common';
}
function rollPotion(){
  const rarity=rollPotionRarity();
  const pool=POTIONS.filter(p=>p.rarity===rarity);
  return pick(pool.length?pool:POTIONS);
}
function rollShopPotions(n){
  const out=[];
  let guard=0;
  while(out.length<n && guard++<40){
    const p=rollPotion();
    if(!out.some(x=>x.id===p.id)) out.push(p);
  }
  while(out.length<n) out.push(pick(POTIONS));
  return out;
}
function addPotion(pot){
  if(player.potions.length>=3){ banner('포션 가득','3개까지만 소지',1000); return false; }
  player.potions.push(pot);
  markDiscovered('potions', pot.id);
  renderPotions(); return true;
}
function usePotion(i){
  const p=player.potions[i];
  if(!p) return;
  runPotionUsed=true;
  player._usingPotion=true;
  try{ p.use(player); }
  finally{ delete player._usingPotion; }
  if(player.alchemySurge){
    addPotionBuff(player,{id:'alchemy_surge',name:'연금 폭주',label:'공격력 +5',icon:'🧪',desc:'포션 사용 후 공격력 증가',t:6,atkFlat:5,refreshOnly:true});
  }
  sfx.pick();
  banner(p.name,'사용',1000);
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
const PERK_ICONS={"공격 특화":"btv/assets/asset-031-ae9039d98c.png","속사 특화":"btv/assets/asset-032-bfe2caed63.png","민첩 특화":"btv/assets/asset-033-e918978065.png","활력":"btv/assets/asset-034-56af33bbb6.png","방어 특화":"btv/assets/asset-035-f6e8be3ed5.png","광부":"btv/assets/asset-036-43798a2b09.png","대구경":"btv/assets/asset-037-a9d64b9689.png","재생":"btv/assets/asset-038-4746fa1204.png","경험치 부스트":"btv/assets/asset-039-88b1c0dbbe.png","도네 알림":"btv/assets/asset-040-cd1043c117.png","정밀 조준":"btv/assets/asset-041-05dcac0760.png","흡혈":"btv/assets/asset-042-f5a4bea336.png","충격파":"btv/assets/asset-043-9d9658dacd.png","관통":"btv/assets/asset-044-01948011af.png","반사":"btv/assets/asset-045-7621967172.png","연사":"btv/assets/asset-046-e68f91aaca.png","강철 체력":"btv/assets/asset-047-e0c650b661.png","거인 사냥":"btv/assets/asset-048-b6639c1f84.png","고속탄":"btv/assets/asset-049-92535813ed.png","화염탄":"btv/assets/asset-050-045d77fc4d.png","빙결탄":"btv/assets/asset-051-64010bc748.png","독침":"btv/assets/asset-052-d0c547eb8c.png","가시 갑옷":"btv/assets/asset-053-0db346b7c5.png","추진력":"btv/assets/asset-055-3728ea6cff.png","잔상":"btv/assets/asset-056-698506bda6.png","맹공":"btv/assets/asset-057-c012209117.png","유도의 눈":"btv/assets/asset-058-05b6a83b89.png","연쇄 폭발":"btv/assets/asset-059-907ab157cf.png","흡혈귀":"btv/assets/asset-060-89ca5a31a0.png","그림자 보법":"btv/assets/asset-061-6ec81227e2.png","쌍방향 사격":"btv/assets/asset-062-90c3808337.png","더블탭":"btv/assets/asset-063-3a82467274.png","막판 정신력":"btv/assets/asset-064-2a1779ad5a.png","저체력 폭주":"btv/assets/asset-065-8ff4412553.png","처단":"btv/assets/asset-066-ed78891301.png","분노":"btv/assets/asset-067-871c1d2406.png","불사":"btv/assets/asset-068-5ce5921aad.png","치명 일격":"btv/assets/asset-069-5861e7f2e5.png","폭주":"btv/assets/asset-070-b47b63302a.png","작렬탄":"btv/assets/asset-071-239f04c3d8.png","이중 도약":"btv/assets/asset-072-f42df54136.png","재충전 보호막":"btv/assets/asset-073-b3d22fea42.png","다중 사격":"btv/assets/asset-074-86dfa25e6d.png","유리 대포":"btv/assets/asset-076-a90164b8c5.png","구독자 소환":"btv/assets/asset-077-0df9827940.png"};
const EXTRA_PERK_ICON_SPECS=[
  ['점화','#3a2430','#ffb45f','flame'],['현질의 힘','#33293c','#ffd85b','coin'],['치명 흡혈','#3b1e32','#ff6b88','fang'],['감전 연쇄','#263249','#78e6ff','bolt'],
  ['클립 박제','#292b43','#9ceeff','film'],['사형 선고','#30243a','#f0f2fa','skull'],['확산','#29323c','#84dc70','corrode'],['얇은 유리 대포','#34243f','#f2f5ff','glass'],
  ['예리한 감각','#1f3040','#9eeaff','eye'],['급소 타격','#31283c','#f8f9ff','knife'],['붉은 맥박','#3c1e32','#ff6383','heart'],['도박사의 칼날','#33253b','#ffd56c','card'],
  ['산탄 숙련','#2f2b38','#d7c09a','shotgun'],['탄막 집중','#292945','#ffd65a','barrage'],['원소 과부하','#32244a','#b89cff','flame'],['부식 확산','#27343b','#85d96f','corrode'],
  ['구르기 장전','#203042','#8eefff','reload'],['완벽 회피','#203348','#b9f7ff','dodge'],['그림자 탄막','#221d36','#9f88ff','barrage'],['재생 과부하','#22372e','#8de276','regen'],
  ['흡혈 보호막','#2d263f','#ff7f94','shield'],['투자 수익','#332d3b','#ffe071','invest'],['탐욕의 계약','#35283d','#ffd85a','contract'],
  ['급소 연마','#30263f','#ffd56f','knife'],['상점 눈썰미','#302d38','#ffe071','coin'],['전술 재정비','#25343d','#7ee7b0','kit'],['근접 난사','#2c2a3d','#f3c16c','shotgun'],
  ['처형 본능','#30243a','#f0f2fa','skull'],['방송 폭주','#3b2432','#ff6f87','tower'],['부식 표식','#27343b','#85d96f','corrode'],['맹독 가열','#32243a','#ffb45f','flame']
  ,['불길한 적응','#30243a','#ff7f94','skull'],['저주 친화','#2f263f','#b89cff','shield'],['타락한 계약','#35283d','#ffd85a','contract'],['파멸 숭배','#2b2138','#ff4d6d','void']
  ,['약효 증폭','#22372e','#8de276','bottle'],['연금 폭주','#32243a','#ffb45f','flame'],['무한 리필','#25343d','#7ee7b0','bottle']
];
EXTRA_PERK_ICON_SPECS.forEach(([n,c,c2,m])=>{ if(!PERK_ICONS[n]) PERK_ICONS[n]=miniPixelIconSrc(c,c2,m); });
const LEVEL_PERKS=[
  // ===== 일반 Common =====
  {g:'common',icon:'⚔️',name:'공격 특화',desc:'공격력 +2',apply:p=>{p.dmg+=2;}},
  {g:'common',icon:'⚡',name:'속사 특화',desc:'발사 속도 +8%',apply:p=>{p.fireAdd+=0.08;}},
  {g:'common',icon:'🥾',name:'민첩 특화',desc:'이동 속도 +12',apply:p=>{p.spd+=12;}},
  {g:'common',icon:'❤️',name:'활력',desc:'최대 체력 +15, 10 회복',apply:p=>{p.maxhp+=15;healPlayer(10,player.x,player.y);}},
  {g:'common',icon:'🛡️',name:'방어 특화',desc:'받는 피해 -3%',apply:p=>{p.armor+=0.03;}},
  {g:'common',icon:'🧲',name:'광부',desc:'골드 획득량 +10%',apply:p=>{p.goldMul+=0.10;}},
  {g:'common',icon:'💥',name:'대구경',desc:'투사체 크기 +10%',apply:p=>{p.bulletSize+=0.10;}},
  {g:'common',icon:'🌿',name:'재생',desc:'초당 체력 +0.5',apply:p=>{p.regen+=0.5;}},
  {g:'rare',icon:'📈',name:'경험치 부스트',desc:'경험치 획득량 +10%',apply:p=>{p.xpMul+=0.10;}},
  {g:'common',icon:'💸',name:'도네 알림',desc:'처치 시 골드 폭탄 5%',apply:p=>{p.donateChance+=0.05;}},
  // ===== 희귀 Rare =====
  {g:'common',icon:'🎯',name:'정밀 조준',desc:'치명타 확률 +5%',apply:p=>{p.critChance+=0.05;}},
  {g:'rare',icon:'🩸',name:'흡혈',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'rare',icon:'🔔',name:'충격파',desc:'기절 확률 +5%',apply:p=>{p.stunChance+=0.05;}},
  {g:'rare',icon:'🍢',name:'관통',desc:'관통 +1',apply:p=>{p.pierce+=1;}},
  {g:'common',icon:'🔴',name:'반사',desc:'벽 팅김 +1',apply:p=>{p.bounce+=1;}},
  {g:'rare',icon:'⚡',name:'연사',desc:'발사 속도 +16%',apply:p=>{p.fireAdd+=0.16;}},
  {g:'rare',icon:'❤️‍🔥',name:'강철 체력',desc:'최대 체력 +35, 20 회복',apply:p=>{p.maxhp+=35;healPlayer(20,player.x,player.y);}},
  {g:'rare',icon:'⌖',name:'급소 연마',desc:'치명타 피해 +20%',apply:p=>{p.critMult+=0.20;}},
  {g:'rare',icon:'🏷️',name:'상점 눈썰미',desc:'상점 가격 -10%',apply:p=>{p.shopCostMul-=0.10;}},
  {g:'rare',icon:'✚',name:'전술 재정비',desc:'방 입장 시 체력 8 회복',apply:p=>{p.roomEntryHeal+=8;}},
  {g:'epic',icon:'🗡️',name:'거인 사냥',desc:'보스 피해 +15%',apply:p=>{p.bossDmgMul+=0.15;}},
  {g:'common',icon:'🔋',name:'고속탄',desc:'투사체 속도 +20%',apply:p=>{p.bulletSpeedMul+=0.20;}},
  {g:'rare',icon:'🔥',name:'화염탄',desc:'명중 시 3초간 화상. 찍을 때마다 화상 피해 +4.',apply:p=>{p.burn+=4;}},
  {g:'epic',icon:'❄️',name:'빙결탄',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'rare',icon:'🟢',name:'독침',desc:'명중 시 독을 부여합니다. 스택당 초당 독 피해 +3. 독은 최대 6스택까지 중첩됩니다.',apply:p=>{p.poison+=3;}},
  {g:'rare',icon:'🌵',name:'가시 갑옷',desc:'피격 시 주변 적에게 주는 가시 피해 +7.',apply:p=>{p.thorns+=7;}},
  {g:'epic',icon:'💨',name:'추진력',desc:'회피 후 2.5초 동안 발사속도 +50%.',skip:p=>p.dodgeHaste,apply:p=>{p.dodgeHaste=true;}},
  {g:'rare',icon:'👻',name:'잔상',desc:'회피 무적 시간 +0.1초. 중복 가능.',apply:p=>{p.dodgeIframeBonus+=0.1;}},
  {g:'rare',icon:'🧨',name:'점화',desc:'상태이상 피해 +10%',apply:p=>{p.statusDotDmgMul+=0.10;}},
  {g:'rare',icon:'☣',name:'부식 표식',desc:'상태이상 적 피해 +8%',apply:p=>{p.statusDmgMul+=0.08;}},
  {g:'rare',icon:'💸',name:'현질의 힘',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  // ===== 영웅 Epic =====
  {g:'epic',icon:'⚔️',name:'맹공',desc:'공격력 +4',apply:p=>{p.dmg+=4;}},
  {g:'epic',icon:'💣',name:'연쇄 폭발',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'epic',icon:'🧛',name:'흡혈귀',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'epic',icon:'🌀',name:'그림자 보법',desc:'회피 쿨타임 -15%',apply:p=>{p.dodgeCdMul-=0.15;}},
  {g:'rare',icon:'🔙',name:'쌍방향 사격',desc:'뒤로도 1발, 공격력 +2',skip:p=>p.backShot,apply:p=>{p.backShot=true;p.dmg+=2;}},
  {g:'epic',icon:'🔫',name:'더블탭',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'epic',icon:'✹',name:'근접 난사',desc:'근접 투사체 +20% (보스 절반)',apply:p=>{p.closeProjectileDmgMul+=0.20;}},
  {g:'epic',icon:'☣',name:'맹독 가열',desc:'독·화상 초당 피해 +20%, 공격력 -0.5',apply:p=>{p.statusDotDmgMul+=0.20;p.dmg-=0.5;}},
  {g:'legend',icon:'🩹',name:'막판 정신력',desc:'1회 체력1로 버티기',skip:p=>p.lastStand,apply:p=>{p.lastStand=true;}},
  {g:'epic',icon:'🆘',name:'저체력 폭주',desc:'체력 30% 이하일 때 공격력 +8',skip:p=>p.lowHpAtkFlat>0,apply:p=>{p.lowHpAtkFlat=(Number(p.lowHpAtkFlat)||0)+8;}},
  {g:'epic',icon:'🌪️',name:'처단',desc:'베인Q 시 주변에 피해 30 충격파 발생',skip:p=>p.dodgeBlast>0,apply:p=>{p.dodgeBlast+=30;}},
  {g:'epic',icon:'😤',name:'분노',desc:'주변 적 1마리당 공격력 +0.8, 최대 10마리. 찍을 때마다 +0.8씩 누적.',apply:p=>{p.crowdRageAtkFlat=(Number(p.crowdRageAtkFlat)||0)+0.8;}},
  {g:'epic',icon:'💉',name:'치명 흡혈',desc:'치명타 적중 시 체력 3 회복',apply:p=>{p.critHeal+=3;}},
  {g:'epic',icon:'⚡',name:'감전 연쇄',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'epic',icon:'✂️',name:'클립 박제',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  // ===== 전설 Legend =====
  {g:'legend',icon:'✨',name:'치명 일격',desc:'치명타 +20%, 치명타 피해 +50%',apply:p=>{p.critChance+=0.20;p.critMult+=0.5;}},
  {g:'legend',icon:'💀',name:'폭주',desc:'공격력 +6',apply:p=>{p.dmg+=6;}},
  {g:'legend',icon:'💢',name:'작렬탄',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'legend',icon:'🌀',name:'이중 도약',desc:'베인Q 2회 충전',skip:p=>p.dodgeMaxCharges>=2,apply:p=>{p.dodgeMaxCharges=2;p.dodgeCharges=2;}},
  {g:'legend',icon:'🔵',name:'재충전 보호막',desc:'10초마다 1회 피격 무효',skip:p=>p.shieldRegen>0,apply:p=>{p.shieldRegen=10;}},
  {g:'legend',icon:'⚰️',name:'사형 선고',desc:'삭제된 레벨업 특성',removed:true,skip:()=>true,apply:p=>{}},
  {g:'legend',icon:'🌬️',name:'확산',desc:'상태이상 적 처치 시 주변에 같은 효과 전파',skip:p=>p.statusSpread,apply:p=>{p.statusSpread=true;}},
  {g:'legend',icon:'☠',name:'처형 본능',desc:'체력 25% 이하 적 피해 +25% (보스 절반)',apply:p=>{p.executeInstinctDmgMul+=0.25;}},
  // ===== 신화 Myth =====
  {g:'legend',icon:'🔱',name:'다중 사격',desc:'투사체 +1발',apply:p=>{p.shots+=1;}},
  {g:'mythic',icon:'🍷',name:'얇은 유리 대포',desc:'공격력 +10, 최대 체력 -30%',skip:p=>p.glassCannon,apply:p=>{p.glassCannon=true;p.dmg+=10;p.maxhp=Math.max(1,Math.round(p.maxhp*0.7));p.hp=Math.min(p.hp,p.maxhp);}},
  {g:'mythic',icon:'📡',name:'방송 폭주',desc:'공격력 +8 / 발사 속도 +20% / 받는 피해 +15%',apply:p=>{p.dmg+=8;p.fireAdd+=0.20;p.damageTakenMul+=0.15;}},
  {g:'mythic',icon:'🤝',name:'구독자 소환',desc:'따라다니며 자동 공격하는 구독자. 플레이어 공격력 일부와 치명타 일부를 상속.',skip:p=>!!p.minion,apply:p=>{p.minion={ang:0,fireT:0,x:p.x,y:p.y};}},
  {g:'rare',icon:'☠',name:'불길한 적응',desc:'저주 유물 1개당 공격력 +2 (최대 5스택)',skip:p=>p.ominousAdaptation,apply:p=>{p.ominousAdaptation=true;p.ominousAdaptationAtkFlat=2;}},
  {g:'epic',icon:'🛡️',name:'저주 친화',desc:'저주 유물의 받는 피해 증가 효과 20% 완화',skip:p=>p.curseAffinity,apply:p=>{p.curseAffinity=true;}},
  {g:'legend',icon:'📜',name:'타락한 계약',desc:'저주 유물 2개 이상이면 치명타 +15%, 이동속도 +10',skip:p=>p.corruptedContract,apply:p=>{p.corruptedContract=true;}},
  {g:'mythic',icon:'🕯️',name:'파멸 숭배',desc:'저주 유물 1개당 공격력 +3.2, 최대체력 -5% (최대 5스택)',skip:p=>p.doomWorship,apply:p=>{p.doomWorship=true;p.doomWorshipAtkFlat=3.2;}},
  {g:'rare',icon:'🧪',name:'약효 증폭',desc:'포션 회복량과 버프 효과 +15%',skip:p=>p._perkPotionAmp,apply:p=>{p._perkPotionAmp=true;p.potionAmp=(Number(p.potionAmp)||0)+0.15;}},
  {g:'legend',icon:'🔥',name:'연금 폭주',desc:'포션 사용 후 6초간 공격력 +5',skip:p=>p.alchemySurge,apply:p=>{p.alchemySurge=true;}},
  {g:'mythic',icon:'♾️',name:'무한 리필',desc:'방 클리어 시 20% 확률로 랜덤 포션 획득',skip:p=>p.infiniteRefill,apply:p=>{p.infiniteRefill=true;}},
];
const TREE_ONLY_PERK_IDS=new Set([
  'sharp_senses','weakpoint_strike','red_pulse','gamblers_blade',
  'shotgun_mastery','barrage_focus',
  'elemental_overload','corrosive_spread',
  'dodge_reload','perfect_dodge','shadow_barrage',
  'regen_overload','vamp_shield',
  'investment_return','greed_contract'
]);
LEVEL_PERKS.forEach(pk=>{ if(TREE_ONLY_PERK_IDS.has(perkId(pk))) pk.skip=()=>true; });
const PERK_META_BY_NAME={
  '공격 특화':{minLevel:1,maxLevel:15,tags:['combat','starter','damage'],build:'damage'},
  '속사 특화':{minLevel:1,maxLevel:15,tags:['combat','starter','rate'],build:'rate'},
  '민첩 특화':{minLevel:1,maxLevel:15,tags:['combat','starter','mobility'],build:'mobility'},
  '활력':{minLevel:1,maxLevel:15,tags:['combat','starter','defense','sustain'],build:'defense'},
  '방어 특화':{minLevel:1,maxLevel:15,tags:['combat','starter','defense'],build:'defense'},
  '광부':{minLevel:4,maxLevel:15,tags:['growth','economy','utility'],build:'economy'},
  '대구경':{minLevel:1,maxLevel:15,tags:['combat','starter','projectile'],build:'projectile'},
  '재생':{minLevel:1,maxLevel:15,tags:['combat','starter','sustain'],build:'sustain'},
  '경험치 부스트':{g:'rare',minLevel:6,maxLevel:15,tags:['growth','utility'],build:'growth'},
  '도네 알림':{minLevel:5,maxLevel:15,tags:['growth','economy','utility'],build:'economy'},
  '정밀 조준':{minLevel:6,maxLevel:15,tags:['combat','crit'],build:'crit'},
  '급소 연마':{minLevel:6,maxLevel:15,tags:['combat','crit'],build:'crit'},
  '상점 눈썰미':{minLevel:6,maxLevel:15,tags:['growth','economy','shop'],build:'economy'},
  '전술 재정비':{minLevel:6,maxLevel:15,tags:['combat','sustain'],build:'sustain'},
  '흡혈':{minLevel:6,maxLevel:15,tags:['combat','sustain'],build:'sustain'},
  '충격파':{minLevel:6,maxLevel:15,tags:['combat','control'],build:'control'},
  '관통':{minLevel:6,maxLevel:15,tags:['combat','projectile'],build:'projectile'},
  '반사':{minLevel:1,maxLevel:15,tags:['combat','starter','projectile'],build:'projectile'},
  '연사':{minLevel:6,maxLevel:15,tags:['combat','rate'],build:'rate'},
  '강철 체력':{minLevel:6,maxLevel:15,tags:['combat','defense','sustain'],build:'defense'},
  '거인 사냥':{minLevel:6,maxLevel:15,tags:['combat','boss'],build:'boss'},
  '고속탄':{minLevel:1,maxLevel:15,tags:['combat','starter','projectile'],build:'projectile'},
  '화염탄':{minLevel:4,maxLevel:15,tags:['combat','status'],build:'status'},
  '빙결탄':{minLevel:5,maxLevel:15,tags:['combat','status','control'],build:'status'},
  '독침':{minLevel:4,maxLevel:15,tags:['combat','status'],build:'status'},
  '가시 갑옷':{minLevel:6,maxLevel:15,tags:['combat','defense'],build:'defense'},
  '추진력':{minLevel:8,maxLevel:14,tags:['combat','mobility','rate'],build:'mobility',isMiniKeystone:true},
  '잔상':{minLevel:8,maxLevel:14,tags:['combat','mobility','defense'],build:'mobility',isMiniKeystone:true},
  '점화':{minLevel:8,maxLevel:14,tags:['combat','status'],build:'status',isMiniKeystone:true},
  '부식 표식':{minLevel:8,maxLevel:14,tags:['combat','status','damage'],build:'status'},
  '현질의 힘':{minLevel:8,maxLevel:15,tags:['growth','economy','utility'],build:'economy',isMiniKeystone:true},
  '맹공':{minLevel:16,maxLevel:25,tags:['combat','damage','keystone'],build:'damage',isKeystone:true},
  '연쇄 폭발':{minLevel:16,maxLevel:25,tags:['combat','aoe','keystone'],build:'aoe',isKeystone:true},
  '흡혈귀':{minLevel:16,maxLevel:25,tags:['combat','sustain','keystone'],build:'sustain',isKeystone:true},
  '그림자 보법':{minLevel:16,maxLevel:25,tags:['combat','mobility','keystone'],build:'mobility',isKeystone:true},
  '쌍방향 사격':{minLevel:6,maxLevel:15,tags:['combat','projectile'],build:'projectile'},
  '더블탭':{minLevel:16,maxLevel:25,tags:['combat','rate','projectile','keystone'],build:'rate',isKeystone:true},
  '근접 난사':{minLevel:8,maxLevel:14,tags:['combat','projectile','damage'],build:'projectile',isMiniKeystone:true},
  '맹독 가열':{minLevel:8,maxLevel:14,tags:['combat','status','risk'],build:'status',isMiniKeystone:true},
  '막판 정신력':{minLevel:16,maxLevel:25,tags:['combat','defense','keystone'],build:'defense',isKeystone:true},
  '저체력 폭주':{minLevel:16,maxLevel:25,tags:['combat','damage','keystone'],build:'damage',isKeystone:true},
  '처단':{minLevel:16,maxLevel:25,tags:['combat','mobility','aoe','keystone'],build:'mobility',isKeystone:true},
  '분노':{minLevel:16,maxLevel:25,tags:['combat','damage','keystone'],build:'damage',isKeystone:true},
  '치명 흡혈':{minLevel:16,maxLevel:25,tags:['combat','crit','sustain','keystone'],build:'crit',isKeystone:true},
  '감전 연쇄':{minLevel:16,maxLevel:25,tags:['combat','aoe','keystone'],build:'aoe',isKeystone:true},
  '클립 박제':{minLevel:16,maxLevel:25,tags:['combat','execute','keystone'],build:'execute',isKeystone:true},
  '치명 일격':{minLevel:16,maxLevel:25,tags:['combat','crit','keystone'],build:'crit',isKeystone:true},
  '폭주':{minLevel:16,maxLevel:25,tags:['combat','damage','keystone'],build:'damage',isKeystone:true},
  '작렬탄':{minLevel:16,maxLevel:25,tags:['combat','aoe','projectile','keystone'],build:'projectile',isKeystone:true},
  '이중 도약':{minLevel:16,maxLevel:25,tags:['combat','mobility','keystone'],build:'mobility',isKeystone:true},
  '재충전 보호막':{minLevel:16,maxLevel:25,tags:['combat','defense','keystone'],build:'defense',isKeystone:true},
  '사형 선고':{minLevel:16,maxLevel:25,tags:['combat','execute','keystone'],build:'execute',isKeystone:true},
  '확산':{minLevel:16,maxLevel:25,tags:['combat','status','keystone'],build:'status',isKeystone:true},
  '처형 본능':{minLevel:16,maxLevel:25,tags:['combat','execute','keystone'],build:'execute',isKeystone:true},
  '다중 사격':{minLevel:16,maxLevel:25,tags:['combat','projectile','keystone'],build:'projectile',isKeystone:true},
  '유리 대포':{minLevel:16,maxLevel:25,tags:['combat','damage','keystone'],build:'damage',isKeystone:true},
  '방송 폭주':{minLevel:16,maxLevel:25,tags:['combat','damage','rate','risk','keystone'],build:'damage',isKeystone:true},
  '구독자 소환':{minLevel:16,maxLevel:25,tags:['combat','summon','keystone'],build:'summon',isKeystone:true},
  '불길한 적응':{minLevel:6,maxLevel:15,tags:['combat','curse','damage'],build:'curse'},
  '저주 친화':{minLevel:8,maxLevel:14,tags:['combat','curse','defense'],build:'curse',isMiniKeystone:true},
  '타락한 계약':{minLevel:16,maxLevel:25,tags:['combat','curse','crit','mobility','keystone'],build:'curse',isKeystone:true},
  '파멸 숭배':{minLevel:16,maxLevel:25,tags:['combat','curse','damage','risk','keystone'],build:'curse',isKeystone:true},
  '약효 증폭':{minLevel:6,maxLevel:15,tags:['potion','sustain','utility'],build:'potion'},
  '연금 폭주':{minLevel:16,maxLevel:25,tags:['potion','combat','damage','keystone'],build:'potion',isKeystone:true},
  '무한 리필':{minLevel:16,maxLevel:25,tags:['potion','growth','keystone'],build:'potion',isKeystone:true},
};
function normalizePerkMeta(pk){
  const meta=Object.assign({
    tags:[],build:'',
    requires:[],exclusiveWith:[],isMiniKeystone:false,isKeystone:false
  },pk,PERK_META_BY_NAME[pk.name]||{});
  meta.tags=Array.isArray(meta.tags)?meta.tags.slice():(meta.tags?[meta.tags]:[]);
  meta.requires=Array.isArray(meta.requires)?meta.requires.slice():(meta.requires?[meta.requires]:[]);
  meta.exclusiveWith=Array.isArray(meta.exclusiveWith)?meta.exclusiveWith.slice():(meta.exclusiveWith?[meta.exclusiveWith]:[]);
  Object.assign(pk,meta);
}
LEVEL_PERKS.forEach((p,i)=>{ if(!p.id) p.id='perk_'+i; normalizePerkMeta(p); });
function perkId(pk){ return pk&&(pk.id||('perk_'+LEVEL_PERKS.indexOf(pk))); }
function isTreeOnlyPerkId(id){
  return typeof TREE_ONLY_PERK_IDS!=='undefined' && TREE_ONLY_PERK_IDS.has(id);
}
function isLevelPerkCandidate(pk){
  if(!pk || pk.removed) return false;
  if(isTreeOnlyPerkId(perkId(pk))) return false;
  return true;
}
function perkBuildMetaText(pk){
  if(!pk) return '';
  const role=pk.isKeystone?'최종 키스톤':(pk.isMiniKeystone?'미니 키스톤':'특성');
  const build=pk.build?('빌드 '+pk.build):'공용';
  const tags=(pk.tags&&pk.tags.length)?('태그 '+pk.tags.join('/')):'';
  return [role,build,tags].filter(Boolean).join(' · ');
}
function perkTooltipText(pk){
  const lines=[pk.name, pk.desc, perkBuildMetaText(pk)];
  if(pk.name==='독침') lines.push('표시 방식: 독 피해는 계속 들어가지만, 화면 숫자는 약 0.35초마다 한 번씩 묶여서 표시됩니다.');
  if(perkHasTag(pk,'crit')) lines.push('치명타 직접 피해 적용 · 확률 상한 60% · 피해 상한 350%');
  if(pk.id==='red_pulse') lines.push('발동: 치명타 적중 · 지속 3초 · 내부쿨 6초');
  if(pk.id==='shotgun_mastery') lines.push('조건: 가까운 거리 · 보스 대상 보너스 절반');
  if(pk.id==='barrage_focus') lines.push('보정: 기본 100/35/20/10 → 100/45/30/15');
  if(pk.id==='elemental_overload') lines.push('조건: 대상이 상태이상일 때');
  if(pk.id==='corrosive_spread') lines.push('처치 시 독/화상 전이 강화 · 공격력 -1.5');
  if(pk.id==='dodge_reload') lines.push('발동: 베인Q 사용 후 다음 탄 · 지속 2초');
  if(pk.id==='perfect_dodge') lines.push('발동: Q 이후 1초 무피격 · 지속 3초');
  if(pk.id==='shadow_barrage') lines.push('발동: Q 후 1초 · 투사체 +2 · 베인Q 쿨다운 +25%');
  if(pk.id==='regen_overload') lines.push('조건: 체력 50% 이하');
  if(pk.id==='vamp_shield') lines.push('초과 회복 보호막 상한: 최대 체력 20% · 자연 재생 -30%');
  if(pk.id==='investment_return') lines.push('조건: 골드 150 이상 보유');
  if(pk.id==='greed_contract') lines.push('리스크: 받는 피해 +10%');
  return lines.filter(Boolean).join('\n');
}
const PERK_COUNTS={};
LEVEL_PERKS.forEach(p=>{
  if(p.removed) return;
  if(typeof TREE_ONLY_PERK_IDS!=='undefined' && TREE_ONLY_PERK_IDS.has(perkId(p))) return;
  PERK_COUNTS[p.g]=(PERK_COUNTS[p.g]||0)+1;
});
function ownedPerkIds(){
  return new Set(sanitizeStoredLevelPerkIds(player.perkIds));
}
function ownedPerkKeys(){
  const ids=ownedPerkIds(), keys=new Set(ids);
  LEVEL_PERKS.forEach(pk=>{ if(!pk.removed && ids.has(perkId(pk))) keys.add(pk.name); });
  return keys;
}
function perkHasTag(pk,tag){ return Array.isArray(pk.tags)&&pk.tags.indexOf(tag)>=0; }
function perkRefMatches(pk,ref){ return ref===perkId(pk)||ref===pk.name; }
function perkRequirementMet(req,owned){
  if(typeof req==='function') return !!req(player);
  if(typeof req!=='string') return true;
  return owned.has(req)||!!player[req];
}
function perkExclusiveBlocked(pk,owned){
  const refs=pk.exclusiveWith||[];
  if(refs.some(ref=>owned.has(ref))) return true;
  return LEVEL_PERKS.some(other=>{
    if(!owned.has(perkId(other))&&!owned.has(other.name)) return false;
    return (other.exclusiveWith||[]).some(ref=>perkRefMatches(pk,ref));
  });
}
function acquiredBuildCounts(){
  const ids=ownedPerkIds(), counts={};
  LEVEL_PERKS.forEach(pk=>{
    if(pk.removed||!ids.has(perkId(pk))||!pk.build) return;
    counts[pk.build]=(counts[pk.build]||0)+1;
  });
  return counts;
}
function canRollPerk(pk,owned,lvl){
  if(!pk) return false;
  if(!isLevelPerkCandidate(pk)) return false;
  if(pk.skip&&pk.skip(player)) return false;
  if((pk.requires||[]).some(req=>!perkRequirementMet(req,owned))) return false;
  if(perkExclusiveBlocked(pk,owned)) return false;
  return true;
}
function perkWeight(pk,buildCounts,lvl){
  const tier=PERK_TIERS[pk.g]||PERK_TIERS.common;
  let w=tier.weight/(PERK_COUNTS[pk.g]||1);
  if(pk.build&&buildCounts&&buildCounts[pk.build]){
    const count=buildCounts[pk.build]||0;
    let bonus=Math.min(count*0.15,0.45);
    if(pk.isMiniKeystone&&count>=1) bonus=Math.max(bonus,0.55);
    if(pk.isKeystone&&count>=2) bonus=Math.max(bonus,0.70);
    w*=1+Math.min(bonus,0.75);
  }
  return w;
}
function rollPerks(n){
  const lvl=level||1;
  const owned=ownedPerkKeys();
  const buildCounts=acquiredBuildCounts();
  const pool=LEVEL_PERKS.filter(pk=>canRollPerk(pk,owned,lvl));
  const picks=[];
  for(let i=0;i<n && pool.length;i++){
    let tot=0; pool.forEach(pk=>tot+=perkWeight(pk,buildCounts,lvl));
    if(tot<=0) break;
    let r=Math.random()*tot, idx=0;
    for(let j=0;j<pool.length;j++){ r-=perkWeight(pool[j],buildCounts,lvl); if(r<=0){idx=j;break;} }
    const picked=pool.splice(idx,1)[0];
    picks.push(picked);
    for(let j=pool.length-1;j>=0;j--){
      const refs=picked.exclusiveWith||[];
      const otherRefs=pool[j].exclusiveWith||[];
      if(refs.some(ref=>perkRefMatches(pool[j],ref))||otherRefs.some(ref=>perkRefMatches(picked,ref))) pool.splice(j,1);
    }
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
function shouldShowTreeIntro(){
  return !treeIntroShown && treePoints > 0 && state !== 'title' && state !== 'start';
}
function showTreeIntro(){
  if(!shouldShowTreeIntro()) return false;
  treeIntroShown=true;
  show('treeIntro');
  return true;
}
function showLevelUp(){
  if(!tierIntroShown){ tierIntroShown=true; show('tierIntro'); return; }
  const picks=rollPerks(3);
  if(sanitizeStoredLevelPerkIds(player.perkIds).length===0){
    const highTierCount=picks.filter(pk=>pk.g==='legend'||pk.g==='mythic').length;
    const allEpicPlus=picks.length===3&&picks.every(pk=>pk.g==='epic'||pk.g==='legend'||pk.g==='mythic');
    if(picks.some(pk=>pk.g==='legend')) unlockAchievement('legend_exists');
    if(picks.some(pk=>pk.g==='mythic')) unlockAchievement('mythic_exists');
    if(highTierCount>=2) unlockAchievement('greedy_exists');
    if(allEpicPlus) unlockAchievement('chosen_broadcast');
  }
  picks.forEach(pk=>markDiscovered('perks', perkId(pk)));
  $('levelTitle').textContent='Lv.'+level+' — 특성 1택'+(pendingLevels>1?' ('+pendingLevels+'개 남음)':'');
  const cont=$('levelChoices'); cont.className='perkrow'; cont.innerHTML='';
  let selPerk=null, selEl=null;
  const confirmBtn=$('levelConfirm');
  confirmBtn.disabled=true; confirmBtn.classList.remove('ready'); confirmBtn.textContent='특성을 선택하세요';
  picks.forEach(pk=>{
    const t=PERK_TIERS[pk.g];
    const el=document.createElement('button');
    el.className='perkcard perk-'+pk.g; el.style.borderColor=t.col;
    el.title=perkTooltipText(pk);
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
  if(!pk || pk.removed) return;
  if(!Array.isArray(player.perkIds)) player.perkIds=[];
  const id=perkId(pk);
  if(id&&player.perkIds.indexOf(id)<0) player.perkIds.push(id);
  pk.apply(player); syncDoomWorshipHp(player); sfx.pick(); banner(pk.icon+' '+pk.name,'특성 획득',1100);
  pendingLevels--; updateHUD();
  if(pendingLevels>0) showLevelUp();
  else if(showTreeIntro()) return;
  else { hideAll(); state='play'; syncChrome(); }
}
// ---------- 일반 전투 보상 ----------
const SMALL_REWARDS=[
  {icon:'💰',name:'골드 한 줌',desc:'골드를 줍는다',apply:()=>{const g=irand(22,38)+act*7;addGold(g,'roomReward');banner('골드 +'+g,'',1000);}},
  {icon:'❤️',name:'응급 처치',desc:'체력 30 회복',apply:()=>{healPlayer(30,player.x,player.y);banner('체력 +30','',1000);}},
  {icon:'🧪',name:'물약 보급',desc:'랜덤 포션 1개',apply:()=>{ if(player.potions.length<3) addPotion(rollPotion()); else { addGold(20,'roomReward'); banner('포션 가득 → 골드 +20','',1000);} }},
  {icon:'⚔️',name:'무기 손질',desc:'공격력 +1',apply:()=>{player.dmg+=1;banner('공격력 +1','',1000);}},
  {icon:'⚡',name:'방아쇠 정비',desc:'발사 속도 +4%',apply:()=>{player.fireAdd+=0.04;banner('발사 속도 +4%','',1000);}},
  {icon:'🥾',name:'가벼운 발놀림',desc:'이동 속도 +8',apply:()=>{player.spd+=8;banner('이동 속도 +8','',1000);}},
  {icon:'🛡️',name:'방어구 정비',desc:'받는 피해 -2%',apply:()=>{player.armor=Math.min(0.85,player.armor+0.02);banner('받는 피해 -2%','',1000);}},
  {icon:'🎯',name:'조준경',desc:'치명타 확률 +2%',apply:()=>{player.critChance=Math.min(1,player.critChance+0.02);banner('치명타 +2%','',1000);}},
  {icon:'💥',name:'탄 개조',desc:'투사체 크기 +5%',apply:()=>{player.bulletSize+=0.05;banner('투사체 크기 +5%','',1000);}},
  {icon:'🌿',name:'활력 물약',desc:'최대 체력 +12, 12 회복',apply:()=>{player.maxhp+=12;healPlayer(12,player.x,player.y);banner('최대 체력 +12','',1000);}},
  {icon:'🔋',name:'추진제',desc:'투사체 속도 +5%',apply:()=>{player.bulletSpeedMul+=0.05;banner('투사체 속도 +5%','',1000);}},
  {icon:'🧲',name:'자력 코일',desc:'골드 획득 +10%',apply:()=>{player.goldMul+=0.10;banner('골드 획득 +10%','',1000);}},
  {icon:'🩸',name:'흡혈 코팅',desc:'흡혈 확률 +2%',apply:()=>{player.lifesteal+=0.02;banner('흡혈 +2%','',1000);}},
  {icon:'📈',name:'수련서',desc:'경험치 획득 +10%',apply:()=>{player.xpMul+=0.10;banner('경험치 +10%','',1000);}},
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
function offerRelics(n,tag,sub,after,opts){
  relicAfter=after||null;
  const owned=new Set(player.relics.map(r=>r.id));
  const avail=RELICS.filter(r=>!owned.has(r.id)&&isRelicUnlockedByAchievement(r.id));
  const pool=avail;
  const picks=[];
  const tmp=pool.slice();
  for(let i=0;i<n && tmp.length;i++){ picks.push(weightedTake(tmp,r=>relicOfferWeight(r,opts))); }
  if(!picks.length){ if(relicAfter){ const a=relicAfter; relicAfter=null; a(); } return; }
  const cont=$('relicChoices');
  cont.innerHTML='';
  $('relicTag').textContent=tag||"유물 획득";
  $('relicSub').textContent=sub||"하나만 챙겨라. 채팅이 지켜본다.";
  picks.forEach(r=>{
    const el=document.createElement('button');
    el.className='choice relic-'+(TIER_OF[r.id]||'rare');
    el.dataset.relicId=r.id;
    el.style.borderColor=relicTier(r).col;
    el.innerHTML=relicCardHTML(r);
    el.onclick=()=>{ if(el.disabled) return; Array.from(cont.children).forEach(ch=>{ ch.disabled=true; }); takeRelic(r); };
    cont.appendChild(el);
  });
  show('relic');
  chatSys("🎁 유물 선택: "+picks.map(r=>r.name).join(" / "));
  setTimeout(()=>chatRandom(pick(["유리대포 가 KEKW","무난하게 가자","도박이다 GIGACHAD","그거 함정임 monkaS","사기유물 ㄱㄱ"])),350);
}
function takeRelic(r){
  if(!r){
    hideAll();
    const a=relicAfter; relicAfter=null;
    if(a){ a(); } else { state='play'; syncChrome(); }
    updateHUD();
    return;
  }
  player.relics.push(r);
  markDiscovered('relics', r.id);
  applyRelicToPlayer(r,player);
  syncDoomWorshipHp(player);
  checkRunRelicAchievements();
  sfx.pick(); banner(r.icon+" "+r.name,"["+relicTier(r).name+"] 획득!",1500);
  hideAll();
  const a=relicAfter; relicAfter=null;
  if(a){ a(); } else { state='play'; syncChrome(); }
  updateHUD();
}

// ---------- 상점 ----------
const SHOP_QUOTES=[
  '오늘 방송각은 네 골드가 만든다.',
  '전설 뜨면 클립 딴다. 신화면 풀영상이다.',
  '채팅은 싸다고 했고, 나는 아니라고 했다.',
  '수상한 상자는 늘 수상해서 좋은 법이지.',
  '초반 대박 런? 여기서 시작할 수도 있다.'
];
let currentShopItems=[];
let shopPurchaseLock=false;
const SHOP_PRICE_MUL=1.00;
const ACT2_SHOP_PRICE_MUL=1.00;
const SHOP_STOCK_COST_MUL=[1,1.3,1.6];
function shopPrice(base){
  const disc=nextShopDiscount>0?Math.max(0,1-nextShopDiscount):1;
  const costMul=player?statMulFromBonus(statBonusFromMul(player.shopCostMul),0.1):1;
  const actMul=(act>=2?ACT2_SHOP_PRICE_MUL:1)*(actTuning(act).shopPriceMul||1);
  const safeBase=Number.isFinite(Number(base))?Number(base):1;
  return Math.max(1,Math.round(safeBase*costMul*disc*SHOP_PRICE_MUL*actMul));
}
function shopRelicPrice(r){
  return shopPrice((88+act*20+Math.random()*20)*relicTier(r).costMul*2.2);
}
function rollShopChestRelic(){
  const owned=new Set(player.relics.map(r=>r.id));
  const chestWeights={common:10,rare:30,epic:35,legend:18,mythic:7};
  const candidates=RELICS.filter(r=>!owned.has(r.id)&&isRelicUnlockedByAchievement(r.id)&&chestWeights[TIER_OF[r.id]||'rare']>0);
  if(!candidates.length) return null;
  const roll=Math.random()*100;
  const target=roll<10?'common':roll<40?'rare':roll<75?'epic':roll<93?'legend':'mythic';
  let pool=candidates.filter(r=>(TIER_OF[r.id]||'rare')===target);
  if(!pool.length) return weightedTake(candidates.slice(),r=>chestWeights[TIER_OF[r.id]||'rare']||1);
  return pick(pool);
}
let mysteryBoxCutsceneActive=null;
function mysteryBoxRarityKey(r){
  const tier=TIER_OF[r&&r.id]||'rare';
  return tier==='legend'?'legendary':tier;
}
function ensureMysteryBoxOverlay(){
  let ov=document.getElementById('mysteryBoxOverlay');
  if(ov) return ov;
  ov=document.createElement('div');
  ov.id='mysteryBoxOverlay';
  ov.className='mystery-box-overlay hidden';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-labelledby','mysteryBoxTitle');
  ov.innerHTML=
    '<div class="mystery-box-modal">'+
      '<div class="mystery-box-kicker">SHOP RELIC</div>'+
      '<h2 id="mysteryBoxTitle">수상한 상자</h2>'+
      '<div class="mystery-box-stage">'+
        '<div class="mystery-box-glow" aria-hidden="true"></div>'+
        '<div class="mystery-box-sprite" id="mysteryBoxSprite"></div>'+
        '<div class="mystery-box-flash" aria-hidden="true"></div>'+
      '</div>'+
      '<div class="mystery-box-status" id="mysteryBoxStatus">수상한 기운이 감돈다...</div>'+
      '<div class="mystery-box-result hidden" id="mysteryBoxResult"></div>'+
      '<div class="mystery-box-actions">'+
        '<button class="btn ghost" id="mysteryBoxSkip" type="button">스킵</button>'+
        '<button class="btn" id="mysteryBoxConfirm" type="button" disabled>확인</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(ov);
  return ov;
}
function renderMysteryBoxResultHTML(r,isNew){
  const t=relicTier(r);
  return '<div class="mystery-box-result-card rarity-'+mysteryBoxRarityKey(r)+'" data-relic-id="'+spEsc(r.id||'')+'" style="--mystery-rarity:'+spEsc(t.col)+'">'+
    '<div class="mystery-box-badges">'+
      (isNew?'<span class="mystery-new">NEW</span><span class="mystery-new note">도감 등록!</span>':'')+
    '</div>'+
    '<div class="mystery-relic-icon">'+relicIconHTML(r,'relic-pix-lg')+'</div>'+
    '<div class="mystery-rarity" style="color:'+spEsc(t.col)+'">['+spEsc(t.name)+'] 획득!</div>'+
    '<div class="mystery-relic-name">'+spEsc(r.name)+'</div>'+
    '<div class="mystery-relic-desc">'+spEsc(r.desc)+'</div>'+
  '</div>';
}
function showMysteryBoxReveal(relic,opts){
  opts=opts||{};
  const ov=ensureMysteryBoxOverlay();
  const modal=ov.querySelector('.mystery-box-modal');
  const sprite=ov.querySelector('#mysteryBoxSprite');
  const status=ov.querySelector('#mysteryBoxStatus');
  const result=ov.querySelector('#mysteryBoxResult');
  const confirm=ov.querySelector('#mysteryBoxConfirm');
  const skip=ov.querySelector('#mysteryBoxSkip');
  const boxSrc=SHOP_SPECIAL_PIX['수상한 상자'];
  let phase='opening', done=false, revealTimer=null, openTimer=null, resolveFn=null;
  if(sprite) sprite.innerHTML=boxSrc?'<img class="shop-special-pix mystery-box-pix" src="'+boxSrc+'" alt="">':'🎁';
  if(status) status.textContent='수상한 기운이 감돈다...';
  if(result){ result.classList.add('hidden'); result.innerHTML=''; }
  if(confirm) confirm.disabled=true;
  if(skip) skip.disabled=false;
  ov.className='mystery-box-overlay is-opening';
  if(modal){ modal.classList.remove('is-result'); void modal.offsetWidth; modal.classList.add('is-opening'); }
  function cleanup(){
    clearTimeout(openTimer);
    clearTimeout(revealTimer);
    document.removeEventListener('keydown',onKey,true);
    mysteryBoxCutsceneActive=null;
  }
  function revealNow(){
    if(done || phase==='result') return;
    phase='result';
    clearTimeout(openTimer);
    clearTimeout(revealTimer);
    if(status) status.textContent='상자가 열렸다';
    if(result){
      result.innerHTML=renderMysteryBoxResultHTML(relic,!!opts.isNew);
      result.classList.remove('hidden');
    }
    if(confirm){ confirm.disabled=false; setTimeout(()=>confirm.focus(),0); }
    if(skip) skip.disabled=true;
    ov.className='mystery-box-overlay is-result rarity-'+mysteryBoxRarityKey(relic);
    if(modal){ modal.classList.remove('is-opening'); modal.classList.add('is-result'); }
    try{ sfx.pick&&sfx.pick(); }catch(e){}
  }
  function finish(){
    if(done || phase!=='result') return;
    done=true;
    cleanup();
    ov.className='mystery-box-overlay hidden';
    if(resolveFn) resolveFn(true);
  }
  function onKey(e){
    const key=(e.key||'').toLowerCase();
    if(key!=='escape' && key!==' ' && key!=='enter') return;
    handleInput(e);
  }
  function handleInput(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    if(phase==='opening') revealNow();
    else finish();
    return true;
  }
  function onOverlayClick(e){
    if(!mysteryBoxCutsceneActive) return;
    if(phase==='opening') handleInput(e);
    else if(e.target===confirm || e.target===ov || (e.target.closest&&e.target.closest('#mysteryBoxResult'))) handleInput(e);
  }
  ov.onclick=onOverlayClick;
  if(skip) skip.onclick=e=>{ e.preventDefault(); e.stopPropagation(); revealNow(); };
  if(confirm) confirm.onclick=e=>{ e.preventDefault(); e.stopPropagation(); finish(); };
  document.addEventListener('keydown',onKey,true);
  mysteryBoxCutsceneActive={reveal:revealNow,finish,handleInput,isResult:()=>phase==='result'};
  openTimer=setTimeout(()=>{ if(status&&phase==='opening') status.textContent='상자가 요동친다...'; },450);
  revealTimer=setTimeout(revealNow,1450);
  return new Promise(resolve=>{ resolveFn=resolve; });
}
async function buyMysteryBoxRelic(){
  const r=rollShopChestRelic();
  if(!r){ banner('상자 비어 있음','획득 가능한 유물이 없다',1200); return false; }
  const isNew=!isDiscovered('relics',r.id);
  await showMysteryBoxReveal(r,{isNew});
  grantShopRelic(r);
  addShopMysteryLog(r);
  banner(r.icon+' '+r.name,'상자에서 유물 획득!',1500);
  return true;
}
function grantShopRelic(r){
  if(!r) return false;
  player.relics.push(r);
  markDiscovered('relics', r.id);
  applyRelicToPlayer(r,player);
  syncDoomWorshipHp(player);
  checkRunRelicAchievements();
  return true;
}
function addStockedShopSpecial(items,spec){
  const stock=act>=2?3:1;
  const stepMul=SHOP_STOCK_COST_MUL[0]||1;
  items.push({
    kind:'special',
    baseName:spec.name,
    name:spec.name,
    icon:spec.icon,
    desc:stock>1?spec.desc+' ('+stock+'회 구매 가능)':spec.desc,
    baseDesc:spec.desc,
    baseCost:spec.baseCost,
    cost:shopPrice(spec.baseCost*stepMul),
    grade:spec.grade,
    skipBuyBanner:spec.skipBuyBanner,
    buy:spec.buy,
    stock,
    boughtCount:0
  });
}
function refreshStockedShopSpecial(it){
  if(!it || it.kind!=='special' || !it.stock) return it;
  const left=Math.max(0,(Number(it.stock)||0)-(Number(it.boughtCount)||0));
  const stepMul=SHOP_STOCK_COST_MUL[it.boughtCount]||SHOP_STOCK_COST_MUL[SHOP_STOCK_COST_MUL.length-1]||1;
  const stock=Number(it.stock)||0;
  it.name=it.baseName||it.name;
  it.desc=(it.baseDesc||it.desc||'')+(stock>1?(left>1?' ('+left+'회 구매 가능)':(left===1?' (마지막 구매)':'')):'');
  it.cost=left>0?shopPrice((Number(it.baseCost)||1)*stepMul):0;
  it.bought=left<=0;
  it.soldLabel='재고 없음';
  return it;
}
function shuffledTrainingDefs(defs){
  const pool=defs.slice(), out=[];
  while(pool.length) out.push(pool.splice(irand(0,pool.length-1),1)[0]);
  return out;
}
function rollShopTrainings(){
  const desired=act>=2?4:3;
  const hp=trainingDefById('hp');
  const result=hp?[hp]:[];
  const others=TRAINING_DEFS.filter(def=>def.id!=='hp');
  const open=shuffledTrainingDefs(others.filter(def=>!trainingIsMaxed(def.id,player)));
  const done=shuffledTrainingDefs(others.filter(def=>trainingIsMaxed(def.id,player)));
  open.concat(done).forEach(def=>{ if(result.length<desired) result.push(def); });
  return result;
}
function shopTrainingBoughtMap(items){
  if(!items) return {};
  if(!items.trainingBoughtById||typeof items.trainingBoughtById!=='object'||Array.isArray(items.trainingBoughtById)){
    items.trainingBoughtById={};
  }
  return items.trainingBoughtById;
}
function isShopTrainingBought(items,id){
  return !!(id&&shopTrainingBoughtMap(items)[id]);
}
function markShopTrainingBought(items,id){
  if(id) shopTrainingBoughtMap(items)[id]=true;
}
function trainingShopItem(def){
  const count=trainingCount(def.id,player);
  const maxed=count>=TRAINING_MAX_PURCHASES;
  const cost=maxed?0:trainingPrice(def,player);
  return {
    kind:'training',
    trainingId:def.id,
    baseName:def.name,
    name:def.name,
    icon:def.icon,
    desc:maxed?'최대 훈련 완료 ('+count+'/'+TRAINING_MAX_PURCHASES+')':def.desc+' ('+count+'/'+TRAINING_MAX_PURCHASES+')',
    descHtml:trainingShopDetailsHTML(def,count,maxed,cost),
    cost,
    grade:{name:maxed?'완료':'훈련 '+count+'/'+TRAINING_MAX_PURCHASES,col:maxed?'#8a95aa':'#89e0a1'},
    maxed,
    soldLabel:'최대 훈련 완료',
    buy:()=>applyShopTraining(def.id)
  };
}
function refreshTrainingShopItem(it){
  if(!it || it.kind!=='training') return it;
  const def=trainingDefById(it.trainingId);
  if(!def) return it;
  const count=trainingCount(def.id,player);
  const maxed=count>=TRAINING_MAX_PURCHASES;
  const cost=maxed?0:trainingPrice(def,player);
  it.baseName=def.name;
  it.name=def.name;
  it.icon=def.icon;
  it.desc=maxed?'최대 훈련 완료 ('+count+'/'+TRAINING_MAX_PURCHASES+')':def.desc+' ('+count+'/'+TRAINING_MAX_PURCHASES+')';
  it.descHtml=trainingShopDetailsHTML(def,count,maxed,cost);
  it.cost=cost;
  it.grade={name:maxed?'완료':'훈련 '+count+'/'+TRAINING_MAX_PURCHASES,col:maxed?'#8a95aa':'#89e0a1'};
  it.maxed=maxed;
  it.soldLabel='최대 훈련 완료';
  return it;
}
function addShopMysteryLog(r){
  if(!currentShopItems) return;
  const t=relicTier(r);
  if(!Array.isArray(currentShopItems.mysteryLog)) currentShopItems.mysteryLog=[];
  currentShopItems.mysteryLog.unshift({id:r.id,name:r.name,tier:t.name,col:t.col});
  currentShopItems.mysteryLog=currentShopItems.mysteryLog.slice(0,3);
}
function renderShopMysteryLog(items){
  const logs=items&&Array.isArray(items.mysteryLog)?items.mysteryLog:[];
  if(!logs.length) return '';
  return '<div class="shop-log"><div class="shop-log-title">최근 획득 기록</div>'+
    logs.map((log,idx)=>'<div class="shop-log-row"><span class="shop-log-no">'+(idx+1)+'.</span> <b style="color:'+shopText(log.col)+'">['+shopText(log.tier)+']</b> <span>'+shopText(log.name)+'</span></div>').join('')+
  '</div>';
}
function shopPurchaseBannerSmall(it){
  if(!it) return '';
  if(it.kind==='training'){
    const def=trainingDefById(it.trainingId);
    if(!def) return '훈련 효과가 즉시 적용되었습니다';
    return '누적 '+def.bonusText(trainingCount(def.id,player))+' · '+def.desc;
  }
  if(it.kind==='potion'&&it.potion) return it.potion.desc||'포션 슬롯에 추가되었습니다';
  if(it.kind==='relic'&&it.relic) return it.relic.desc||'유물이 적용되었습니다';
  return it.desc||'';
}
function openShop(after){
  shopAfter=after||null;
  // 1회성 상점 할인 소비 (shopPrice가 이미 적용하고 있으므로, 진입 시 알림 후 초기화)
  if(nextShopDiscount>0){ banner('상점 할인',`전품목 ${Math.round(nextShopDiscount*100)}% 할인 적용!`,1800); }
  if(!shopIntroShown){ shopIntroShown=true; banner('💡 포션 사용법','구매한 포션은 1·2·3 키로 사용!',2800); }
  const items=[];
  const owned=new Set(player.relics.map(r=>r.id));
  const availR=RELICS.filter(r=>!owned.has(r.id)&&isRelicUnlockedByAchievement(r.id));
  const relicPicks=[]; for(let i=0;i<3 && availR.length;i++) relicPicks.push(weightedTake(availR));
  relicPicks.forEach(r=>items.push({kind:'relic',name:r.name,icon:r.icon,desc:r.desc,cost:shopRelicPrice(r),relic:r,
    buy:()=>grantShopRelic(r)}));
  const ptn=rollShopPotions(3);
  ptn.forEach(pt=>items.push({kind:'potion',name:pt.name,icon:pt.icon,desc:pt.desc,cost:shopPrice(getPotionShopBasePrice(pt,act)),potion:pt,
    buy:()=>addPotion(pt)}));
  rollShopTrainings().forEach(def=>items.push(trainingShopItem(def)));
  addStockedShopSpecial(items,{name:'경험치 북',icon:'📚',desc:'현재 레벨 필요 경험치의 35% 획득',baseCost:125,
    buy:()=>{gainXP(xpNext*0.35);}});
  if(diffSet.maxRetries!==Infinity){
    addStockedShopSpecial(items,{name:'재도전권',icon:'🎟️',desc:'재도전 가능 횟수 +1',baseCost:155,grade:{name:'편의',col:'#40bbff'},skipBuyBanner:true,
      buy:()=>{const ok=grantRetryCharge(1,'상점 재도전권'); if(ok) banner('🎟️ 재도전 +1','다시 한 번 기회가 생겼다',1500); return ok;}});
  }
  addStockedShopSpecial(items,{name:'수상한 상자',icon:'🎁',desc:'일반~신화 유물 중 하나를 획득합니다. 전설/신화 확률이 높은 고위험 상자입니다.',baseCost:320,grade:{name:'고급 상자',col:'#c98bff'},skipBuyBanner:true,
    buy:()=>buyMysteryBoxRelic()});
  items.trainingBoughtById={};
  items.mysteryLog=[];
  currentShopItems=items;
  if(nextShopDiscount>0) nextShopDiscount=0;
  const ov=$('ovShop'); if(ov){ ov.classList.remove('shop-enter'); void ov.offsetWidth; ov.classList.add('shop-enter'); }
  renderShop(items);
  show('shop');
}
let shopAfter=null;
function renderShop(items){
  $('shopGold').textContent=gold+'G';
  const quote=$('shopQuote'); if(quote) quote.textContent=pick(SHOP_QUOTES);
  const cont=$('shopChoices');
  cont.innerHTML='';
  const sections=[
    {key:'relic',label:'유물',items:items.filter(it=>it.kind==='relic')},
    {key:'potion',label:'포션',items:items.filter(it=>it.kind==='potion')},
    {key:'training',label:'훈련',items:items.filter(it=>it.kind==='training')},
    {key:'special',label:'특별 상품',items:items.filter(it=>it.kind==='special')}
  ];
  sections.forEach(sec=>{
    const wrap=document.createElement('div');
    wrap.className='shop-section shop-section-'+sec.key;
    wrap.innerHTML='<div class="shop-section-title">'+sec.label+'</div><div class="shop-grid"></div>';
    const grid=wrap.querySelector('.shop-grid');
    sec.items.forEach((it,idx)=>grid.appendChild(shopCard(it,items,idx)));
    cont.appendChild(wrap);
  });
  cont.insertAdjacentHTML('beforeend',renderShopMysteryLog(items));
}
const SHOP_SPECIAL_PIX={
  '체력 훈련':miniPixelIconSrc('#3a2136','#ff6e8c','heart'),
  '공격 훈련':miniPixelIconSrc('#35263a','#ffcf6a','knife'),
  '민첩 훈련':miniPixelIconSrc('#233244','#9ee7ff','boot'),
  '집중 훈련':miniPixelIconSrc('#2b2d45','#ffd96b','eye'),
  '방어 훈련':miniPixelIconSrc('#263246','#8ed6ff','shield'),
  '경험치 북':miniPixelIconSrc('#29334a','#9ee7ff','scroll'),
  '재도전권':miniPixelIconSrc('#2d2942','#ffd96b','card'),
  '수상한 상자':miniPixelIconSrc('#302244','#c98bff','case')
};
function shopSpecialIconHTML(it){
  const src=it&&(it.kind==='special'||it.kind==='training')?SHOP_SPECIAL_PIX[it.baseName||it.name]:null;
  if(src) return '<img class="shop-special-pix'+(it.kind==='training'?' shop-training-pix':'')+'" src="'+src+'" alt="">';
  return it&&it.icon?it.icon:'?';
}
function shopCard(it,items,idx){
  if(it&&it.kind==='training') refreshTrainingShopItem(it);
  if(it&&it.kind==='special') refreshStockedShopSpecial(it);
  const el=document.createElement('button');
  const rt=it.relic?relicTier(it.relic):null;
  const potionGrade=it.potion?getPotionGrade(it.potion):null;
  const pt=it.potion?potionGradeInfo(it.potion):null;
  const grade=rt||pt||it.grade||null;
  const relicOwned=it.relic&&player.relics.some(r=>r.id===it.relic.id);
  const potionFull=it.kind==='potion' && player.potions.length>=3;
  const afford=gold>=it.cost;
  const trainingBought=it.kind==='training'&&isShopTrainingBought(items,it.trainingId);
  const trainingLocked=false;
  const sold=it.kind==='training'?(it.maxed||trainingBought):(it.bought||relicOwned);
  const disabled=sold||!afford||potionFull;
  const pending=!!it.pending;
  const shopLocked=!!shopPurchaseLock||!!mysteryBoxCutsceneActive;
  const blocked=disabled||trainingLocked||pending||shopLocked;
  el.className='shop-card '+it.kind+(sold?' sold':'')+(trainingLocked?' training-locked':'')+(pending?' pending':'')+(blocked&&!sold?' disabled':'')+(it.relic?' relic-'+(TIER_OF[it.relic.id]||'rare'):'')+(potionGrade?' potion-'+potionGrade:'');
  if(it.relic) el.dataset.relicId=it.relic.id;
  if(it.kind==='training'&&it.trainingId) el.dataset.trainingKey=it.trainingId;
  el.disabled=it.kind==='training'?false:blocked;
  el.setAttribute('aria-disabled',blocked?'true':'false');
  el.style.setProperty('--shop-border',grade?grade.col:'#7e6cb0');
  el.style.animationDelay=(idx*55)+'ms';
  const icon=it.relic?relicIconHTML(it.relic,'relic-pix-lg'):(it.potion?potionIconHTML(it.potion,'potion-pix-lg'):shopSpecialIconHTML(it));
  el.innerHTML=
    '<span class="shop-price">'+(it.maxed?'MAX':it.cost+'G')+'</span>'+
    (sold||trainingLocked||pending?'<span class="shop-sold">'+(pending?'개봉 중':(trainingBought?'훈련 완료':(trainingLocked?'이번 상점 훈련 완료':(it.soldLabel||'품절'))))+'</span>':'')+
    '<div class="shop-icon">'+icon+'</div>'+
    '<div class="shop-name">'+it.name+'</div>'+
    (grade?'<div class="shop-grade" style="color:'+grade.col+'">['+grade.name+']</div>':'<div class="shop-grade">&nbsp;</div>')+
    '<div class="shop-desc">'+(it.descHtml||it.desc)+'</div>';
  el.onclick=async ()=>{
    if(shopPurchaseLock||mysteryBoxCutsceneActive) return;
    if(!it||!items||!items.includes(it)) return;
    if(it.kind==='training') refreshTrainingShopItem(it);
    const relicOwnedNow=it.relic&&player.relics.some(r=>r.id===it.relic.id);
    const potionFullNow=it.kind==='potion' && player.potions.length>=3;
    const trainingBoughtNow=it.kind==='training'&&isShopTrainingBought(items,it.trainingId);
    const trainingLockedNow=false;
    const soldNow=it.kind==='training'?(it.maxed||trainingBoughtNow):(it.bought||relicOwnedNow);
    const purchaseCost=Math.max(0,Math.round(Number(it.cost)||0));
    if(soldNow) return;
    if(it.pending) return;
    if(trainingLockedNow){ banner('훈련 완료','이미 구매한 훈련입니다',900); return; }
    if(potionFullNow){ banner('포션 가득','3개까지만',900); return; }
    if(gold<purchaseCost){ banner('골드 부족','',900); return; }
    shopPurchaseLock=true;
    gold-=purchaseCost;
    it.pending=true;
    renderShop(items);
    let ok=false;
    try{
      ok=await Promise.resolve(it.buy());
    }catch(e){
      console.warn('shop purchase failed',e);
      ok=false;
    }
    it.pending=false;
    if(ok===false){ gold+=purchaseCost; shopPurchaseLock=false; updateHUD(); renderShop(items); return; }
    runShopPurchases++;
    runShopSpent+=purchaseCost;
    recordRunGoldSpent(purchaseCost,shopSpendSource(it));
    recordShopPurchaseStats(it);
    recordShopSpend(purchaseCost);
    if(it.kind==='training') markShopTrainingBought(items,it.trainingId);
    else if(it.kind==='special'&&it.stock){
      it.boughtCount=(Number(it.boughtCount)||0)+1;
      refreshStockedShopSpecial(it);
    }else it.bought=true;
    sfx.coin();
    if(!it.skipBuyBanner) banner((it.potion||it.kind==='special'||it.kind==='training'?it.name:it.icon)+' 구매!',shopPurchaseBannerSmall(it),it.kind==='training'?2200:1400);
    shopPurchaseLock=false;
    updateHUD();
    renderShop(items);
  };
  return el;
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
  {floor:'#070912', grid:'rgba(120,90,220,0.08)', edge:'rgba(0,0,15,0.72)',  bossTint:'rgba(155,80,255,0.10)', name:'심연'},
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
    for(let i=0;i<7;i++) bgDecor.push({kind:'stalag', x:rand(20,W-20), s:rand(36,84), up:i%2===0});
    for(let i=0;i<5;i++) bgDecor.push({kind:'torch', x:rand(80,W-80), y:rand(50,H-120)});
    for(let i=0;i<28;i++) bgDecor.push({kind:'pebble', x:rand(20,W-20), y:rand(70,H-20), s:rand(2,6)});
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

/* ===== 1막(forest) 픽셀 배경 디테일 헬퍼 =====
   모두 buildRoomBg 안에서 1회만 오프스크린(c)에 렌더되고 캐싱되므로
   런타임(drawRoomBg) 성능에는 영향이 없습니다. 낮은 명도/저채도 유지로
   전투 가독성(적·탄막·아이템·장판)을 절대 해치지 않는 것이 원칙입니다. */

// 동굴 벽 / 절벽 실루엣 한 겹. baseY 위쪽을 울퉁불퉁한 윤곽으로 덮어 상단 빈 공간을 채움.
function rbA1Cliff(c, baseY, amp, col, step, edge){
  const P=RB_P; const cols=Math.ceil(W/step)+1; let prev=baseY;
  for(let i=0;i<cols;i++){
    const x=i*step;
    const n=(rbHash(i*7+5,13)+rbHash(i*3+1,29)+rbHash(i*11+9,41))/3 - 0.5;
    let h=baseY + n*amp*2;
    h=prev*0.55 + h*0.45; prev=h;                       // 봉우리를 부드럽게 보간
    const yy=Math.max(P, Math.round(h/P)*P);
    c.fillStyle=col; c.fillRect(x, 0, step+1, yy);
    c.fillStyle=edge; c.fillRect(x, yy-P, step+1, P);   // 능선 하이라이트(형태 인지용, 여전히 저명도)
    if(rbHash(i*13,3)>0.86){ c.fillStyle=col; c.fillRect(x, yy-P, step, P); } // 능선 일부 끊김 → 단조로움 완화
  }
}
// 좌우 측벽 — 양쪽 가장자리를 어두운 바위로(폭 변화). 가독성 위해 얇게.
function rbA1SideWall(c, col, edge){
  const P=RB_P; col=col||'#05110c'; edge=edge||'#0a1c13';
  for(let y=0;y<H;y+=P){
    const lw=Math.round((8+rbHash(1,y)*16)/P)*P, rw=Math.round((8+rbHash(2,y)*16)/P)*P;
    c.fillStyle=col; c.fillRect(0,y,lw,P); c.fillRect(W-rw,y,rw,P);
    if(rbHash(3,y)>0.8){ c.fillStyle=edge; c.fillRect(lw-P,y,P,P); c.fillRect(W-rw,y,P,P); }
  }
}
// 천장 종유석 (위 넓고 아래 뾰족). dark/mid/hi 로 막별 색 지정.
function rbA1Stalac(c, cx, len, dark, mid, hi){
  const P=RB_P; cx=Math.round(cx/P)*P; const rows=Math.max(2,Math.round(len/P));
  dark=dark||'#04100a'; mid=mid||'#06140d'; hi=hi||'#0a2418';
  for(let r=0;r<rows;r++){
    const t=r/rows, hw=Math.max(P, Math.round((len*0.18*(1-t))/P)*P), y=r*P;
    c.fillStyle = t<0.4?mid:dark; c.fillRect(cx-hw, y, hw*2, P);
    if(rbHash(cx,y)>0.86){ c.fillStyle=hi; c.fillRect(cx+hw-P,y,P,P); }
  }
}
// 철제 프레임 / 기둥 (세로 빔 + 가로 빔, 일부 끊긴 격자 + 리벳). fp={d,r,l}.
function rbA1Frame(c, x, y, w, h, fp){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P;
  const D=(fp&&fp.d)||'#0a1016', R=(fp&&fp.r)||'#0d1820', L=(fp&&fp.l)||'#11212a';
  c.fillStyle=D; c.fillRect(x, y, P*2, h); c.fillRect(x+w-P*2, y, P*2, h);
  c.fillStyle=R; c.fillRect(x+P, y, P, h);
  const gap=Math.max(P*3, Math.round(h/4));
  for(let yy=y; yy<y+h; yy+=gap){ if(rbHash(x,yy)>0.22){ c.fillStyle=D; c.fillRect(x, yy, w, P); c.fillStyle=R; c.fillRect(x, yy, w, P>>1||P); } }
  c.fillStyle=L; for(let yy=y+P*2; yy<y+h; yy+=P*6){ c.fillRect(x+P, yy, P, P); c.fillRect(x+w-P*2, yy, P, P); }
}
// 깨진 CRT 모니터 잔해 (variant 0~2 형태 변형). scr=죽은 화면 잔광색.
function rbA1CRT(c, x, y, s, variant, scr){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P; scr=scr||'#0a1f18';
  const w=Math.round(s*8)*P, h=Math.round(s*6)*P;
  c.fillStyle='#0b1014'; c.fillRect(x, y, w, h);
  c.fillStyle='#11181e'; c.fillRect(x, y, w, P);
  c.fillStyle='#070a0d'; c.fillRect(x, y+h-P, w, P);
  const sx=x+P*2, sy=y+P*2, sw=w-P*4, sh=h-P*4;
  c.fillStyle=scr; c.fillRect(sx, sy, sw, sh);                       // 죽은 화면
  c.fillStyle='rgba(180,180,180,0.06)'; for(let yy=sy; yy<sy+sh; yy+=P*2) c.fillRect(sx, yy, sw, P);
  if(variant===0){ c.fillStyle='#04100c'; c.fillRect(sx, sy+(((sh*0.4)/P|0)*P), sw, P); c.fillRect(sx+(((sw*0.5)/P|0)*P), sy, P, sh); }
  else if(variant===1){ c.fillStyle='rgba(255,255,255,0.05)'; for(let k=0;k<5;k++){ const gx=sx+Math.round(rbHash(x+k,y)*sw/P)*P; c.fillRect(gx, sy, P, sh); } }
  else { c.fillStyle='rgba(255,255,255,0.04)'; c.fillRect(sx, sy, sw, ((sh*0.5)/P|0)*P); }
  c.fillStyle='#080c0f'; c.fillRect(x+(((w*0.4)/P|0)*P), y+h, ((w*0.2)/P|0)*P, P*2);
}
// 늘어진 전선/케이블 (포물선 처짐)
function rbA1Cable(c, x1, y1, x2, y2, sag, col){
  const P=RB_P; const span=x2-x1; if(span===0) return;
  for(let x=x1; x<=x2; x+=P){ const t=(x-x1)/span; const y=y1+(y2-y1)*t + Math.sin(t*Math.PI)*sag;
    c.fillStyle=col; c.fillRect(Math.round(x/P)*P, Math.round(y/P)*P, P, P); }
}
// 파이프 (가로/세로 굵은 관 + 음영 + 이음새)
function rbA1Pipe(c, x, y, len, vert, col){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P; const th=P*3;
  if(vert){ c.fillStyle=col; c.fillRect(x, y, th, len); c.fillStyle='rgba(255,255,255,0.04)'; c.fillRect(x, y, P, len);
    c.fillStyle='#05090c'; for(let yy=y; yy<y+len; yy+=P*10) c.fillRect(x-P, yy, th+P*2, P*2); }
  else { c.fillStyle=col; c.fillRect(x, y, len, th); c.fillStyle='rgba(255,255,255,0.04)'; c.fillRect(x, y, len, P);
    c.fillStyle='#05090c'; for(let xx=x; xx<x+len; xx+=P*10) c.fillRect(xx, y-P, P*2, th+P*2); }
}
// 작은 식생 (잡초/마른풀/수정 등, 색·잎수 변화). cols=색 배열.
function rbA1Grass(c, x, y, h, cols){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P;
  cols=cols||['#0c2e1f','#0a3322','#0e3826']; const col=cols[(Math.abs(x+y)/P|0)%cols.length];
  const blades=2+(rbHash(x,y)*2|0);
  for(let b=0;b<blades;b++){ const bx=x+(b-(blades>>1))*P, bh=h*(0.6+rbHash(bx,y)*0.5);
    for(let yy=0; yy<bh; yy+=P){ c.fillStyle=col; c.fillRect(bx+(yy>bh*0.5?(b&1?P:-P):0), y-yy, P, P); } }
}
// 바닥 균열 (지그재그)
function rbA1Crack(c, x, y, len, dir, col){
  const P=RB_P; let cx=x, cy=y; col=col||'#04100b';
  for(let i=0;i<len/P;i++){ c.fillStyle=col; c.fillRect(Math.round(cx/P)*P, Math.round(cy/P)*P, P, P);
    cx+=dir*P; if(rbHash(cx,cy)>0.6) cy+=(rbHash(cy,cx)>0.5?P:-P); }
}
// 파편/잔해 더미 (작은 픽셀 무리)
function rbA1Debris(c, x, y, dark, light){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P; dark=dark||'#0a1812'; light=light||'#0d2218';
  const pts=[[0,0],[P,0],[0,P],[P*2,P],[-P,P],[P,P]];
  c.fillStyle=dark; for(const d of pts){ if(rbHash(x+d[0],y+d[1])>0.3) c.fillRect(x+d[0], y+d[1], P, P); }
  c.fillStyle=light; c.fillRect(x, y, P, P);
}
// 네온 오염 얼룩 (정적·아주 흐림 → 빛나지 않아 가독성 안전)
function rbA1Stain(c, x, y, r, col){
  const g=c.createRadialGradient(x,y,1,x,y,r);
  g.addColorStop(0,'rgba('+col+',0.07)'); g.addColorStop(1,'rgba('+col+',0)');
  c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2);
}
// ===== /1막(forest) 배경 디테일 헬퍼 =====

/* ===== 막 공통 "방송 폐허 던전" 빌더 + 2·3막 시그니처 =====
   1막 forest용 rbA1* 헬퍼를 색 인자로 재사용. 모두 오프스크린 1회 렌더(캐싱). */

// 막별 팔레트 (저명도·저채도 — 전투 가독성 우선)
const PAL_A2={ // 2막: 모래에 묻힌 방송 폐허 (어두운 황토 + 녹청 오염)
  t0:'#16100a',t1:'#1d160c',t2:'#241c0f',tAcc:'#3a2a12',
  cB:'#100b06',cBe:'#241a0c',cF:'#160f08',cFe:'#33260f', wall:'#130d07',walle:'#2a1f10',
  sd:'#0e0a05',sm:'#160f08',sh:'#2a2014', stainA:'200,150,50',stainB:'70,150,140',
  pipe:'#161208',frame:{d:'#15110a',r:'#1d1810',l:'#2a2416'},crt:'#1a1c10',cable:'#0c0905',
  grass:['#2a2210','#332a14','#241d0e'],crack:'#100b05',dd:'#1a140a',dl:'#2a2012' };
const PAL_A3={ // 3막: 디지털 심연 (어두운 남보라 + 네온 보라·청록 오염)
  t0:'#08071a',t1:'#0b0820',t2:'#0e0a28',tAcc:'#1a1040',
  cB:'#060514',cBe:'#1a1240',cF:'#0a0820',cFe:'#241a4a', wall:'#09071c',walle:'#1c1444',
  sd:'#050410',sm:'#0a0820',sh:'#241a44', stainA:'150,80,255',stainB:'70,200,255',
  pipe:'#0e0b1a',frame:{d:'#100d1c',r:'#181426',l:'#241c3a'},crt:'#101428',cable:'#080614',
  grass:['#2a1648','#1f1038','#341c54'],crack:'#080614',dd:'#160f28',dl:'#241a3c' };

// 공통 던전 정적 배경 (절벽 2겹·측벽·종유석·구조물·바닥 디테일)
function rbDungeon(c, glows, p){
  const P=RB_P;
  for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ const n=rbHash(x,y); let col=n<0.5?p.t0:(n<0.85?p.t1:p.t2); if(y>H*0.62&&n>0.97)col=p.tAcc; c.fillStyle=col; c.fillRect(x,y,P,P); }
  rbA1Cliff(c, H*0.26, H*0.14, p.cB, P*3, p.cBe);
  rbA1Cliff(c, H*0.37, H*0.10, p.cF, P*3, p.cFe);
  rbA1SideWall(c, p.wall, p.walle);
  [60,210,360,520,690,840].forEach((bx,i)=>{ if(rbHash(bx,7)>0.3) rbA1Stalac(c, bx+(rbHash(bx,8)-0.5)*70, 26+rbHash(bx,9)*54, p.sd, p.sm, p.sh); });
  rbA1Stain(c, W*0.22, H*0.34, 90, p.stainA);
  rbA1Stain(c, W*0.76, H*0.30, 78, p.stainB);
  rbA1Pipe(c, 0, Math.round(H*0.07), Math.round(W*0.40), false, p.pipe);
  rbA1Pipe(c, Math.round(W*0.60), Math.round(H*0.045), Math.round(W*0.40), false, p.pipe);
  rbA1Frame(c, 28, Math.round(H*0.10), P*10, Math.round(H*0.34), p.frame);
  rbA1Frame(c, W-28-P*10, Math.round(H*0.13), P*10, Math.round(H*0.30), p.frame);
  rbA1CRT(c, 64, Math.round(H*0.17), 2.0, 1, p.crt);
  rbA1CRT(c, W-188, Math.round(H*0.20), 1.7, 0, p.crt);
  rbA1CRT(c, Math.round(W*0.5-44), Math.round(H*0.055), 1.3, 2, p.crt);
  rbA1Cable(c, 86, Math.round(H*0.18), 320, Math.round(H*0.23), 42, p.cable);
  rbA1Cable(c, W-96, Math.round(H*0.22), W-330, Math.round(H*0.27), 46, p.cable);
  for(let i=0;i<11;i++){ rbA1Grass(c, 40+rbHash(i,21)*(W-80), H*0.70+rbHash(i,22)*(H*0.26), 10+rbHash(i,23)*12, p.grass); }
  for(let i=0;i<5;i++){ rbA1Crack(c, 80+rbHash(i,24)*(W-160), H*0.74+rbHash(i,25)*(H*0.20), 24+rbHash(i,26)*40, rbHash(i,27)>0.5?1:-1, p.crack); }
  for(let i=0;i<8;i++){ rbA1Debris(c, 30+rbHash(i,28)*(W-60), H*0.72+rbHash(i,29)*(H*0.24), p.dd, p.dl); }
}

// [2막] 모래 언덕 실루엣 (하단, 부드러운 픽셀 곡선)
function rbDune(c, baseY, h, col){
  const P=RB_P;
  for(let x=0;x<W;x+=P){ const yy=baseY - Math.round((Math.sin(x*0.012)+Math.sin(x*0.031+2))*h*0.5/P)*P;
    c.fillStyle=col; c.fillRect(x, yy, P, H-yy); }
}
// [2막] 부서진 송신탑/안테나 (상단, 삼각 격자 + 부러진 끝)
function rbAntenna(c, x, baseY, h, col){
  const P=RB_P; x=Math.round(x/P)*P; const n=Math.round(h/P);
  for(let i=0;i<n;i++){ const t=i/n, wpx=Math.round((1-t)*7)*P, y=baseY-i*P;
    c.fillStyle=col; c.fillRect(x-P, y, P*2, P); if(i%3===0) c.fillRect(x-wpx, y, wpx*2, P); }
  c.fillStyle=col; for(let k=0;k<4;k++) c.fillRect(x+k*P, baseY-h-k*P, P, P); // 부러진 끝
}
// [정예] 손상 서버랙 타워 (막 색 + 점멸 LED)
function rbRackTower(c, glows, x, top, bot, base, leds){
  const P=RB_P; x=Math.round(x/P)*P; const rw=P*16;
  c.fillStyle=base; c.fillRect(x, top, rw, bot-top);
  c.fillStyle='#05060a'; c.fillRect(x, top, rw, P); c.fillRect(x, bot-P, rw, P);
  for(let yy=top+P*3; yy<bot-P*2; yy+=P*4)for(let k=0;k<3;k++){ const on=rbHash(x+k,yy)>0.45, col=leds[(Math.abs(((x+yy)/7)|0)+k)%leds.length];
    c.fillStyle=on?col:'#1a1622'; c.fillRect(x+P*2+k*P*4, yy, P*2, P*2);
    if(on) glows.push({x:x+P*3+k*P*4,y:yy+P,r:5,col:'200,200,200',base:0.12,amp:0.4,s:(x+yy+k)%17,tiny:1}); }
}
// [3막] 떠다니는 데이터 파편 (정적 + 미세 부유 parts)
function rbDataShard(c, parts, col){
  const P=RB_P;
  for(let i=0;i<14;i++){ const x=Math.round(rbHash(i,51)*W/P)*P, y=Math.round((H*0.1+rbHash(i,52)*H*0.5)/P)*P, s=(1+(rbHash(i,53)*2|0))*P;
    c.fillStyle=col; c.fillRect(x,y,s,P); c.fillRect(x,y,P,s); }
  for(let i=0;i<6;i++) parts.push({x:rbRnd()*W, y:rbRnd()*H*0.6, r:P, vx:(rbRnd()-0.5)*6, vy:(rbRnd()-0.5)*4, a:0.22, col:'rgba(150,110,230,0.5)'});
}
// [3막 중보스] 늘어진 사슬 (온스터)
function rbChainHang(c, x, top, len, col){
  const P=RB_P; x=Math.round(x/P)*P;
  for(let i=0;i<len/P;i++){ const y=top+i*P; c.fillStyle=col; if(i%2===0) c.fillRect(x-P, y, P*3, P); else c.fillRect(x, y, P, P); }
}
// [3막 최종] 코어 제단 (세트3형제, 3색 글로우)
function rbCoreAltar(c, glows){
  const P=RB_P; const cx=Math.round(W/2/P)*P, cy=Math.round(H*0.30/P)*P;
  [-160,0,160].forEach((dx,i)=>{ const x=cx+dx, col=['#2a1430','#1a1030','#241038'][i];
    c.fillStyle=col; c.fillRect(x-P*2, cy, P*4, Math.round(H*0.5));
    c.fillStyle='#3a1c4a'; c.fillRect(x-P*2, cy, P*4, P); });
  ['255,70,90','120,200,90','150,80,255'].forEach((col,i)=>glows.push({x:cx+(i-1)*40,y:cy-20,r:34,col:col,base:0.10,amp:0.16,s:i*2}));
}
// [2막 중보스] 박제 진열장 줄 (박제인간)
function rbCaseRow(c, glows){
  const P=RB_P;
  [160,360,560,760].forEach((x,i)=>{ const top=Math.round(H*0.14), h=Math.round(H*0.30), w=P*22;
    c.fillStyle='#120e08'; c.fillRect(x, top, w, h);
    c.fillStyle='#1c1810'; c.fillRect(x+P, top+P, w-P*2, h-P*2);
    c.fillStyle='rgba(255,255,255,0.04)'; c.fillRect(x+P, top+P, w-P*2, P);
    c.fillStyle='#0c0a06'; c.fillRect(Math.round(x+w*0.3), Math.round(top+h*0.3), Math.round(w*0.4), Math.round(h*0.6));
    c.fillStyle='#5a1420'; c.fillRect(x+P*2, top+h-P*3, P*8, P*2);
    glows.push({x:x+w/2,y:top+h*0.4,r:18,col:'200,60,60',base:0.06,amp:0.1,s:i}); });
}
// [2막 최종] 글리치 변위 띠 (승우)
function rbGlitchBand(c){
  const P=RB_P;
  for(let k=0;k<6;k++){ const y=Math.round((H*0.1+rbHash(k,71)*H*0.7)/P)*P, h=P*(1+(rbHash(k,72)*4|0)), sh=(rbHash(k,73)-0.5)*40|0;
    c.fillStyle=k%2?'rgba(255,120,40,0.10)':'rgba(120,200,255,0.08)'; c.fillRect(sh, y, W, h); }
}

// 2막 방 빌더
function rbA2Build(c, glows, parts, role){
  rbDungeon(c, glows, PAL_A2);
  rbDune(c, Math.round(H*0.84), 26, '#0d0a05');
  rbDune(c, Math.round(H*0.92), 20, '#120d07');
  rbAntenna(c, 120, Math.round(H*0.32), Math.round(H*0.22), '#161109');
  rbAntenna(c, W-150, Math.round(H*0.29), Math.round(H*0.18), '#161109');
  rbA1Stain(c, W*0.5, H*0.2, 70, '210,160,60');
  if(role==='elite'){
    rbRackTower(c, glows, 70, Math.round(H*0.16), Math.round(H*0.62), '#1a1610', ['#ffc24a','#ff5a3a','#7fe0ff']);
    rbRackTower(c, glows, W-70-64, Math.round(H*0.18), Math.round(H*0.60), '#1a1610', ['#ffc24a','#ff5a3a','#7fe0ff']);
    for(let i=0;i<5;i++) glows.push({x:rbRnd()*W,y:60+rbRnd()*(H-120),r:28,col:'255,80,60',base:0,amp:0.2,s:i*2,warn:1});
  } else if(role==='mid'){ rbCaseRow(c, glows); }
  else if(role==='boss'){ rbGlitchBand(c); glows.push({x:W/2,y:H*0.4,r:160,col:'255,120,40',base:0.05,amp:0.07,s:1}); }
}
// 3막 방 빌더
function rbA3Build(c, glows, parts, role){
  rbDungeon(c, glows, PAL_A3);
  rbDataShard(c, parts, '#241a44');
  rbA1Stain(c, W*0.5, H*0.22, 80, '150,80,255');
  if(role==='elite'){
    rbRackTower(c, glows, 70, Math.round(H*0.16), Math.round(H*0.62), '#15101e', ['#b86aff','#6ad0ff','#ff5aa0']);
    rbRackTower(c, glows, W-70-64, Math.round(H*0.18), Math.round(H*0.60), '#15101e', ['#b86aff','#6ad0ff','#ff5aa0']);
    for(let i=0;i<5;i++) glows.push({x:rbRnd()*W,y:60+rbRnd()*(H-120),r:28,col:'170,80,255',base:0,amp:0.22,s:i*2,warn:1});
  } else if(role==='mid'){
    [120,300,600,780].forEach((x,i)=>rbChainHang(c, x, 0, Math.round(H*(0.3+rbHash(x,1)*0.2)), '#1a1430'));
    glows.push({x:W/2,y:H*0.45,r:120,col:'120,70,220',base:0.06,amp:0.12,s:1});
  } else if(role==='boss'){ rbCoreAltar(c, glows); }
}
// ===== /막 공통 던전 빌더 =====

/* ===== 1막 수묵 산수화 배경 (달밤 겹산) — 저채도 회청 먹빛, 가독성 우선 ===== */
function rbInkMountain(c, baseY, amp, col, seed){
  const P=RB_P, step=P*2; let prev=baseY;
  for(let x=-step;x<=W;x+=step){ const i=(x/step)|0;
    const n=(rbHash(i+seed,seed*3)+rbHash(i*3+seed,seed*7))*0.5-0.5;
    let h=baseY + n*amp + Math.sin((x+seed*40)*0.006)*amp*0.4;
    h=prev*0.55+h*0.45; prev=h; const yy=Math.max(P,Math.round(h/P)*P);
    c.fillStyle=col; c.fillRect(x,yy,step+1,H-yy);                       // 능선 아래 채움 → 뒤<앞 농담으로 겹산
    if(rbHash(i*5,seed)>0.9){ c.fillStyle='rgba(160,178,184,0.05)'; c.fillRect(x,yy,step,P); }
  }
}
function rbInkFog(c, y, h, a, col){
  const P=RB_P; col=col||'196,208,212';
  const g=c.createLinearGradient(0,y,0,y+h);
  g.addColorStop(0,'rgba('+col+',0)'); g.addColorStop(0.5,'rgba('+col+','+a+')'); g.addColorStop(1,'rgba('+col+',0)');
  c.fillStyle=g; c.fillRect(0,y,W,h);
  for(let yy=y;yy<y+h;yy+=P)for(let x=0;x<W;x+=P){ if(rbHash(x,yy)>0.86){ c.fillStyle='rgba('+col+','+(a*0.5)+')'; c.fillRect(x,yy,P,P);} }
}
function rbInkMoon(c, x, y, r, col){
  const P=RB_P; col=col||'200,210,205'; x=Math.round(x/P)*P; y=Math.round(y/P)*P;
  const g=c.createRadialGradient(x,y,r*0.3,x,y,r*2.4);
  g.addColorStop(0,'rgba('+col+',0.14)'); g.addColorStop(1,'rgba('+col+',0)');
  c.fillStyle=g; c.fillRect(x-r*2.4,y-r*2.4,r*4.8,r*4.8);
  for(let yy=-r;yy<=r;yy+=P)for(let xx=-r;xx<=r;xx+=P){ if(xx*xx+yy*yy<=r*r){ c.fillStyle='rgba('+col+',0.45)'; c.fillRect(x+xx,y+yy,P,P);} }
}
function rbInkPine(c, x, groundY, h, col){            // 굽은 노송(우산형 솔잎층)
  const P=RB_P; x=Math.round(x/P)*P; col=col||'#080c0e'; const segs=Math.round(h/P); let tx=x;
  for(let i=0;i<segs;i++){ const t=i/segs; tx=x+Math.sin(t*2.4+x*0.5)*h*0.14*t; const ty=groundY-i*P;
    c.fillStyle=col; c.fillRect(Math.round(tx/P)*P, ty, P*(t<0.6?2:1), P); }
  const topY=groundY-h;
  for(let L=0;L<3;L++){ const ly=topY+L*P*5+P, lw=(h*0.42)*(1-L*0.22), lx=tx+(L%2?1:-1)*h*0.06;
    for(let yy=0;yy<P*4;yy+=P){ const ww=lw*(1-yy/(P*6)); c.fillStyle=col; c.fillRect(Math.round((lx-ww/2)/P)*P, ly+yy, Math.max(P,Math.round(ww/P)*P), P); } }
}
function rbInkBamboo(c, x, groundY, h, col){
  const P=RB_P; x=Math.round(x/P)*P; col=col||'#0c1214';
  for(let yy=0;yy<h;yy+=P){ const sway=Math.round(Math.sin(yy*0.02+x)*P/P)*P; c.fillStyle=col; c.fillRect(x+sway, groundY-yy, P*2, P);
    if(yy%(P*9)===0){ c.fillStyle='#060a0c'; c.fillRect(x+sway-P, groundY-yy, P*4, P); } }
  c.fillStyle=col; for(let k=0;k<4;k++){ const ly=groundY-h+k*P*4; c.fillRect(x+P*2, ly, P*3, P); c.fillRect(x-P*2, ly+P*2, P*3, P); }
}
function rbInkRock(c, x, baseY, w, h, col){
  const P=RB_P; col=col||'#0e151a';
  for(let yy=0;yy<h;yy+=P){ const t=yy/h, ww=w*(0.55+0.45*Math.sin(t*3+x));
    c.fillStyle=col; c.fillRect(Math.round((x-ww/2)/P)*P, baseY-h+yy, Math.max(P,Math.round(ww/P)*P), P); }
  c.fillStyle='rgba(150,165,170,0.05)'; c.fillRect(Math.round((x-w*0.3)/P)*P, baseY-h*0.8, Math.round(w*0.2/P)*P, Math.round(h*0.5/P)*P);
}
function rbInkWater(c, y){
  const P=RB_P;
  for(let yy=y;yy<H;yy+=P*3)for(let x=0;x<W;x+=P){ if(rbHash(x,yy)>0.72){ c.fillStyle='rgba(150,168,172,0.05)'; c.fillRect(x,yy,P*(1+(rbHash(x,yy)*3|0)),P);} }
}
function rbInkBlot(c, x, y, r, a){
  const g=c.createRadialGradient(x,y,1,x,y,r);
  g.addColorStop(0,'rgba(8,12,14,'+a+')'); g.addColorStop(1,'rgba(8,12,14,0)');
  c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2);
}
function rbInkGrass(c,x,y,h){ const P=RB_P; x=Math.round(x/P)*P;y=Math.round(y/P)*P; const cols=['#16201d','#1a2622','#121b18']; const col=cols[(Math.abs(x+y)/P|0)%3]; const bl=2+(rbHash(x,y)*2|0); for(let b=0;b<bl;b++){const bx=x+(b-(bl>>1))*P,bh=h*(0.6+rbHash(bx,y)*0.5);for(let yy=0;yy<bh;yy+=P){c.fillStyle=col;c.fillRect(bx+(yy>bh*0.5?(b&1?P:-P):0),y-yy,P,P);}} }
function rbInkDebris(c,x,y){ const P=RB_P; x=Math.round(x/P)*P;y=Math.round(y/P)*P; const pts=[[0,0],[P,0],[0,P],[P*2,P],[-P,P]]; c.fillStyle='#0e1418'; for(const d of pts){if(rbHash(x+d[0],y+d[1])>0.35)c.fillRect(x+d[0],y+d[1],P,P);} c.fillStyle='#1a2420'; c.fillRect(x,y,P,P); }
function rbInkCrow(c, x, y, s){ const P=RB_P; const col='#06090b'; x=Math.round(x/P)*P;y=Math.round(y/P)*P; c.fillStyle=col; c.fillRect(x,y,P,P); c.fillRect(x-s,y-Math.round(s*0.5/P)*P,s,P); c.fillRect(x+P,y-Math.round(s*0.5/P)*P,s,P); }
function rbInkTorii(c, x, groundY, w, h, col){ const P=RB_P; x=Math.round(x/P)*P; col=col||'#3a1410';   // 도리이/홍살문
  c.fillStyle=col; c.fillRect(x-w/2, groundY-h, P*2, h); c.fillRect(x+w/2-P*2, groundY-h, P*2, h);
  c.fillRect(x-w/2-P*2, groundY-h, w+P*4, P*2); c.fillRect(x-w/2-P*3, groundY-h-P, w+P*6, P);
  c.fillRect(x-w/2, groundY-h+P*5, w, P*2);
  c.fillStyle='rgba(180,80,70,0.05)'; c.fillRect(x-w/2-P*2, groundY-h-P*2, w+P*4, P); }
function rbInkLantern(c, x, groundY, col, glowCol){ const P=RB_P; x=Math.round(x/P)*P; col=col||'#10161a'; glowCol=glowCol||'220,150,80';  // 석등/등롱
  c.fillStyle=col; c.fillRect(x-P, groundY-P*3, P*2, P*3); c.fillRect(x-P*3, groundY-P*8, P*6, P*5); c.fillRect(x-P*4, groundY-P*9, P*8, P);
  c.fillStyle='rgba('+glowCol+',0.5)'; c.fillRect(x-P, groundY-P*7, P*2, P*3); }
function rbInkStele(c, x, groundY, h, col){ const P=RB_P; x=Math.round(x/P)*P; col=col||'#10161a';   // 비석
  c.fillStyle=col; c.fillRect(x-P*2, groundY-h, P*4, h); c.fillStyle='#0a0e12'; c.fillRect(x-P*3, groundY-P, P*6, P);
  c.fillStyle='rgba(150,165,170,0.04)'; for(let i=0;i<3;i++) c.fillRect(x-P, groundY-h+P*3+i*P*4, P*2, P); }
function rbInkBoulder(c, cx, baseY, r, col){ const P=RB_P; col=col||'#0c1216'; cx=Math.round(cx/P)*P;   // 거대 바위 + 동굴 입구
  for(let yy=-r;yy<=0;yy+=P){ const ww=Math.sqrt(Math.max(0,r*r-yy*yy))*(0.9+rbHash(cx,yy)*0.2);
    c.fillStyle=col; c.fillRect(Math.round((cx-ww)/P)*P, baseY+yy, Math.round(ww*2/P)*P, P); }
  c.fillStyle='#05080a'; for(let yy=-r*0.6;yy<=0;yy+=P){ const ww=Math.sqrt(Math.max(0,(r*0.6)*(r*0.6)-yy*yy))*0.9;
    c.fillRect(Math.round((cx-ww)/P)*P, baseY+yy, Math.round(ww*2/P)*P, P); } }
// 공통 수묵 베이스 (하늘·달·겹산·안개·먹번짐·바닥). o로 막/방별 색 조정.
function rbInkBase(c, glows, o){
  const P=RB_P; o=o||{};
  const sky=c.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,o.skyTop||'#1a2228'); sky.addColorStop(0.55,o.skyMid||'#10171c'); sky.addColorStop(1,o.skyBot||'#0a0f13');
  c.fillStyle=sky; c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P){ if(rbHash(x,y)>0.94){ c.fillStyle='rgba(180,195,200,0.012)'; c.fillRect(x,y,P,P);} }
  if(o.moon!==false){ rbInkMoon(c, o.moonX||W*0.72, o.moonY||H*0.20, o.moonR||26, o.moonCol);
    glows.push({x:o.moonX||W*0.72, y:o.moonY||H*0.20, r:(o.moonR||26)*1.7, col:o.moonCol||'200,210,205', base:0.05, amp:0.05, s:1.3}); } // 달 은은한 펄스
  const mc=o.mtn||['#1b242a','#141d22','#0e161b','#0a0f13'], fa=o.fogA||0.10, fh=o.fog||50, fc=o.fogCol;
  rbInkMountain(c, H*0.30, H*0.10, mc[0], 11); rbInkFog(c, H*0.29, fh, fa, fc);
  rbInkMountain(c, H*0.44, H*0.12, mc[1], 23); rbInkFog(c, H*0.45, fh, fa*0.9, fc);
  rbInkMountain(c, H*0.60, H*0.13, mc[2], 37); rbInkFog(c, H*0.61, fh*0.9, fa*0.7, fc);
  rbInkMountain(c, H*0.76, H*0.10, mc[3], 51);
  rbInkBlot(c, W*0.20, H*0.50, 120, 0.16); rbInkBlot(c, W*0.85, H*0.62, 100, 0.14);
  for(let i=0;i<10;i++) rbInkGrass(c, 40+rbHash(i,21)*(W-80), H*0.80+rbHash(i,22)*(H*0.16), 8+rbHash(i,23)*10);
  for(let i=0;i<10;i++) rbInkDebris(c, 30+rbHash(i,28)*(W-60), H*0.82+rbHash(i,29)*(H*0.14));
}
// 날아가는 까마귀 (날갯짓)
function rbCrowFx(c, x, y, t, seed){
  const P=RB_P; x=Math.round(x/P)*P; y=Math.round(y/P)*P; c.fillStyle='rgba(10,12,14,0.85)';
  c.fillRect(x,y,P,P);
  if(Math.sin(t*0.01+seed*2)>0){ c.fillRect(x-P*2,y-P,P*2,P); c.fillRect(x+P,y-P,P*2,P); }
  else { c.fillRect(x-P*2,y,P*2,P); c.fillRect(x+P,y,P*2,P); }
}
// 1막 수묵 동적 효과 (매 프레임 가벼운 오버레이만 — 정적 배경은 캐시 유지)
function rbInkFx(c, theme, t){
  const P=RB_P;
  // [공통] 흐르는 안개 — 옅은 가로 띠 2장이 천천히 좌우로 흐름
  for(let i=0;i<2;i++){ const y=(i?H*0.52:H*0.30), off=Math.sin(t*0.00018+i*2.1)*46;
    const g=c.createLinearGradient(0,y,0,y+64);
    g.addColorStop(0,'rgba(190,205,210,0)'); g.addColorStop(0.5,'rgba(190,205,210,0.035)'); g.addColorStop(1,'rgba(190,205,210,0)');
    c.fillStyle=g; c.fillRect(off-50,y,W+100,64); }
  // [공통] 별 반짝임 — 상단 하늘
  for(let i=0;i<12;i++){ const tw=Math.sin(t*0.0028+i*1.7); if(tw>0.86){ const x=(i*89+40)%W, y=36+((i*53)%Math.round(H*0.24)); c.fillStyle='rgba(210,220,218,'+(0.28*tw).toFixed(3)+')'; c.fillRect(x|0,y|0,P,P); } }

  if(theme==='forest'){
    // 수면 잔물결
    for(let i=0;i<18;i++){ const tw=Math.sin(t*0.003+i*0.9); if(tw>0.5){ const x=(i*49+13)%W, y=Math.round(H*0.86)+(i%3)*16, sx=(x+Math.round(Math.sin(t*0.002+i)*2))|0;
      c.fillStyle='rgba(165,185,190,'+(0.08*tw).toFixed(3)+')'; c.fillRect(sx,y,P*(2+(i%2)),P); } }
    // 반딧불 (부유 + 맥동)
    for(let i=0;i<6;i++){ const x=(W*0.15+i*120+Math.sin(t*0.0006+i)*60)%W, y=H*0.5+Math.sin(t*0.0009+i*2)*48+i*22, a=0.18+0.22*Math.sin(t*0.005+i*1.3);
      if(a>0.08){ c.fillStyle='rgba(150,230,180,'+a.toFixed(3)+')'; c.fillRect(x|0,y|0,P,P); c.fillStyle='rgba(150,230,180,'+(a*0.4).toFixed(3)+')'; c.fillRect((x|0)-P,y|0,P*3,P); } }
    // 떨어지는 잎 (하강 + 좌우 흔들)
    for(let i=0;i<5;i++){ const y=(H*0.1+t*0.01*(1+i*0.3)+i*130)%H, x=(i*180+60+Math.sin(t*0.001+i)*30)%W;
      c.fillStyle='rgba(90,130,90,0.38)'; c.fillRect(x|0,y|0,P*2,P); c.fillRect((x|0)+P,(y|0)+P,P,P); }
  }
  else if(theme==='server'){
    // 날아가는 까마귀
    for(let i=0;i<3;i++){ const x=(t*0.012*(1+i*0.4)+i*300)%(W+80)-40, y=H*0.2+i*42+Math.sin(t*0.002+i)*16; rbCrowFx(c, x, y, t, i); }
    // 혈월 붉은 일렁
    { const y=H*0.40, off=Math.sin(t*0.0003)*40; const g=c.createLinearGradient(0,y,0,y+50);
      g.addColorStop(0,'rgba(200,90,80,0)'); g.addColorStop(0.5,'rgba(200,90,80,0.045)'); g.addColorStop(1,'rgba(200,90,80,0)'); c.fillStyle=g; c.fillRect(off-50,y,W+100,50); }
    // 떨어지는 재
    for(let i=0;i<6;i++){ const y=(H*0.1+t*0.008+i*110)%H, x=(i*150+40+Math.sin(t*0.0012+i)*24)%W; c.fillStyle='rgba(130,95,85,0.3)'; c.fillRect(x|0,y|0,P,P); }
  }
  else if(theme==='hatch'){
    // 도깨비불 (보라, 부유 + 맥동)
    for(let i=0;i<5;i++){ const x=(W*0.3+i*100+Math.sin(t*0.0005+i*1.5)*70)%W, y=H*0.4+Math.sin(t*0.0008+i*2)*58+i*18, a=0.16+0.28*Math.sin(t*0.004+i);
      if(a>0.08){ c.fillStyle='rgba(150,90,210,'+a.toFixed(3)+')'; c.fillRect(x|0,y|0,P,P); c.fillStyle='rgba(150,90,210,'+(a*0.35).toFixed(3)+')'; c.fillRect((x|0)-P,(y|0)-P,P*3,P*3); } }
    // 동굴 물방울 (제자리 하강 반복)
    for(let i=0;i<3;i++){ const period=2200+i*600, ph=(t+i*700)%period, y=H*0.1+(ph/period)*(H*0.5), x=W*0.4+i*90;
      if(ph<period*0.9){ c.fillStyle='rgba(150,160,180,0.22)'; c.fillRect(x|0,y|0,P,P*2); } }
  }
  else if(theme==='food'){
    // 떨어지는 불티/잿가루
    for(let i=0;i<8;i++){ const y=(H*0.15+t*0.01+i*90)%H, x=(i*120+30+Math.sin(t*0.0015+i)*20)%W, a=0.28+0.2*Math.sin(t*0.006+i);
      c.fillStyle='rgba(230,140,70,'+a.toFixed(3)+')'; c.fillRect(x|0,y|0,P,P); }
    // 등롱 빠른 깜빡
    [W*0.28,W*0.72].forEach((lx,k)=>{ const fl=0.5+0.5*Math.sin(t*0.02+k*3)+0.2*Math.sin(t*0.05+k);
      if(fl>0.85){ c.fillStyle='rgba(255,170,90,'+(0.3*(fl-0.85)).toFixed(3)+')'; c.fillRect((lx|0)-P*2, Math.round(H*0.86)-P*9, P*4, P*5); } });
    // 도리이 붉은 기운 일렁
    { const y=H*0.35, off=Math.sin(t*0.0004)*50; const g=c.createLinearGradient(0,y,0,y+60);
      g.addColorStop(0,'rgba(200,80,70,0)'); g.addColorStop(0.5,'rgba(200,80,70,0.035)'); g.addColorStop(1,'rgba(200,80,70,0)'); c.fillStyle=g; c.fillRect(off-50,y,W+100,60); }
  }
}
// ===== /1막 수묵 산수화 =====

function buildRoomBg(theme, force){
  const _cd=rbCache[theme];
  if(_cd && !force && _cd.static.width===W && _cd.static.height===H) return _cd; // 아레나 크기 바뀌면 재생성
  rbSeed = force ? ((Math.random()*9999)|0) : (theme.split('').reduce((a,ch)=>a+ch.charCodeAt(0),0)*97+13);
  const o=rbMkCanvas(), c=o.getContext('2d'), glows=[], parts=[]; const P=RB_P;

  if(theme==='forest'){
    // 1막 일반방 — 달밤 겹산 수묵 산수
    rbInkBase(c, glows, {});
    rbInkPine(c, 72, Math.round(H*0.82), Math.round(H*0.42), '#080c0e');
    rbInkPine(c, W-92, Math.round(H*0.86), Math.round(H*0.34), '#0a0e10');
    rbInkBamboo(c, 156, Math.round(H*0.90), Math.round(H*0.50), '#0c1214');
    rbInkBamboo(c, W-176, Math.round(H*0.92), Math.round(H*0.44), '#0c1214');
    rbInkRock(c, 232, Math.round(H*0.93), 70, 50, '#0e151a');
    rbInkRock(c, W-262, Math.round(H*0.95), 92, 60, '#0c1318');
    rbInkWater(c, Math.round(H*0.84));
  }
  else if(theme==='server'){
    // 1막 정예방 — 혈월과 까마귀, 깎아지른 절벽(긴장)
    rbInkBase(c, glows, { moonCol:'190,110,90', skyTop:'#221c20', mtn:['#241c20','#1a1418','#120e12','#0b0809'], fogA:0.08 });
    rbInkRock(c, 56, Math.round(H*0.72), 120, Math.round(H*0.5), '#0c0a0e');
    rbInkRock(c, W-56, Math.round(H*0.74), 130, Math.round(H*0.48), '#0c0a0e');
    rbInkPine(c, Math.round(W*0.5), Math.round(H*0.9), Math.round(H*0.4), '#070a0c');
    for(let i=0;i<7;i++) rbInkCrow(c, W*0.28+rbHash(i,61)*W*0.44, H*0.16+rbHash(i,62)*H*0.22, 4+(rbHash(i,63)*4|0)*P);
    rbInkFog(c, H*0.5, 60, 0.05, '200,90,80');
    for(let i=0;i<5;i++) glows.push({x:rbRnd()*W,y:H*0.3+rbRnd()*(H*0.4),r:26,col:'200,70,60',base:0,amp:0.16,s:i*2,warn:1});
  }
  else if(theme==='hatch'){
    // 1막 중간보스방 — 짙은 안개와 거대 바위·동굴, 비석(무게감)
    rbInkBase(c, glows, { moonCol:'150,130,180', skyTop:'#1c1a26', mtn:['#1d1a26','#16131e','#100d16','#0a080e'], fog:64, fogA:0.13, fogCol:'180,170,200' });
    rbInkBoulder(c, Math.round(W*0.5), Math.round(H*0.62), 150, '#0c0a14');
    rbInkStele(c, 140, Math.round(H*0.9), Math.round(H*0.22), '#100e18');
    rbInkStele(c, W-160, Math.round(H*0.92), Math.round(H*0.18), '#100e18');
    rbInkStele(c, Math.round(W*0.5+150), Math.round(H*0.88), Math.round(H*0.16), '#0e0c16');
    rbInkFog(c, H*0.55, 80, 0.10, '170,160,195');
    glows.push({x:W*0.5,y:H*0.5,r:120,col:'130,90,180',base:0.06,amp:0.1,s:1});
  }
  else if(theme.indexOf('a2_')===0){ rbA2Build(c, glows, parts, theme.slice(3)); }   // 2막: 사막 방송 폐허
  else if(theme.indexOf('a3_')===0){ rbA3Build(c, glows, parts, theme.slice(3)); }   // 3막: 디지털 심연
  else { // food — 1막 최종보스방(키죠): 혈월·도리이·등롱·신단(극적)
    rbInkBase(c, glows, { moon:false, skyTop:'#241a1e', mtn:['#241a1e','#1c1216','#150d10','#0c0809'], fogA:0.07 });
    rbInkMoon(c, Math.round(W*0.5), Math.round(H*0.26), 56, '200,80,70');
    rbInkTorii(c, Math.round(W*0.5), Math.round(H*0.80), 180, Math.round(H*0.5), '#3a1410');
    rbInkLantern(c, Math.round(W*0.28), Math.round(H*0.86), '#120c0e', '230,120,70');
    rbInkLantern(c, Math.round(W*0.72), Math.round(H*0.86), '#120c0e', '230,120,70');
    for(let r=0;r<4;r++){ c.fillStyle=r%2?'#160e10':'#1a1014'; c.fillRect(Math.round(W*0.5)-(120-r*20), Math.round(H*0.82)+r*P*2, (120-r*20)*2, P*2); }
    rbInkPine(c, 80, Math.round(H*0.92), Math.round(H*0.36), '#0a0608');
    rbInkPine(c, W-100, Math.round(H*0.94), Math.round(H*0.32), '#0a0608');
    glows.push({x:W*0.28,y:H*0.86-28,r:18,col:'230,140,80',base:0.1,amp:0.12,s:1});
    glows.push({x:W*0.72,y:H*0.86-28,r:18,col:'230,140,80',base:0.1,amp:0.12,s:2});
    glows.push({x:W*0.5,y:H*0.26,r:80,col:'200,80,70',base:0.05,amp:0.08,s:3});
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
  const _inkTheme=(theme==='forest'||theme==='server'||theme==='hatch'||theme==='food'); // 1막 수묵: 디지털 글리치 제외
  if(_inkTheme) rbInkFx(ctx, theme, t);   // 달 펄스·안개 흐름·물 찰랑·별 반짝
  if(!_inkTheme && Math.sin(t*0.0009)>0.985 && t-roomBgGlitchLast>180){ roomBgGlitchLast=t; const y=((Math.abs(Math.sin(t*0.05))*H)|0); const h=P*2+((Math.abs(Math.cos(t*0.07))*10)|0)*P; const sh=(Math.sin(t*0.2)*14|0)*P;
    try{ ctx.drawImage(cvs, 0,y,W,h, sh,y,W,h); }catch(e){}
    ctx.fillStyle=theme==='food'?'rgba(255,46,140,0.18)':theme==='server'?'rgba(52,247,255,0.16)':theme==='hatch'?'rgba(57,255,154,0.16)':theme.indexOf('a2_')===0?'rgba(255,180,60,0.14)':theme.indexOf('a3_')===0?'rgba(150,90,255,0.16)':'rgba(70,224,255,0.14)'; ctx.fillRect(0,y,W,P); }
}

/* 방 종류 → 테마 (요청: 일반방→forest · 자잘자 정예방→server · 중간보스→hatch · 최종보스→food) */
function roomTheme(){
  const role = roomIsBoss?'boss':roomIsMidboss?'mid':roomHadElite?'elite':'norm';
  if(act>=3) return 'a3_'+role;     // 3막: 디지털 심연
  if(act>=2) return 'a2_'+role;     // 2막: 사막 방송 폐허
  if(roomIsBoss) return 'food';        // 1막 최종보스방 (키죠 · 음식)
  if(roomIsMidboss) return 'hatch';    // 1막 중간보스방 (혜철이 · 해처리)
  if(roomHadElite) return 'server';    // 1막 정예방 (손상된 서버룸)
  return 'forest';                     // 1막 일반방 (데이터 숲)
}
// ===== /방 종류별 픽셀 배경 =====

function drawBackground(){
  drawRoomBg(roomTheme()); return;   // 전 막(1~3) 방 종류별 픽셀 배경
  // ↓ 이하 기존 2·3막 그리드 배경 — 더 이상 사용하지 않음(참고용 보존)
  if(act===1){ drawRoomBg(roomTheme()); return; }   // 1막: 방 종류별 픽셀 배경
  const th=ACT_THEME[Math.min(act-1,ACT_THEME.length-1)];
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
const SW2_SPRITE=new Image();let sw2Ready=false;SW2_SPRITE.onload=()=>sw2Ready=true;SW2_SPRITE.src="btv/assets/seungwoo-phase2.png";
const SW3_SPRITE=new Image();let sw3Ready=false;SW3_SPRITE.onload=()=>sw3Ready=true;SW3_SPRITE.src="btv/assets/seungwoo-phase3.png";
function drawOnsterSprite(r,e,forcePhase){
  const phase=forcePhase||(e&&e.phase>=2?2:1);
  const ready=phase>=2?onsterP2Ready:onsterP1Ready;
  const img=phase>=2?ONSTER_P2_SPRITE:ONSTER_P1_SPRITE;
  const aura=phase>=2?'#ff4dd2':'#8d72ff';
  const body=phase>=2?'#35164d':'#221a46';
  ctx.save();
  ctx.globalAlpha=0.72;
  ctx.shadowColor=aura;ctx.shadowBlur=18;
  circle(0,0,r*1.08,'rgba(20,10,42,0.78)',aura);
  ctx.globalAlpha=0.34;
  circle(0,0,r*1.32,'rgba(141,114,255,0.22)',aura);
  ctx.globalAlpha=1;
  ctx.globalAlpha=0.82;
  circle(0,0,r*0.78,body,aura);
  ctx.globalAlpha=1;
  const canDraw=ready&&img&&img.complete&&(img.naturalWidth||0)>0;
  if(canDraw){
    const S=r*(phase>=2?2.65:2.85);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,-S/2,-S/2,S,S);
    ctx.globalAlpha=0.95;
    ctx.lineWidth=2.5;
    ctx.strokeStyle=phase>=2?'#ffd34d':'#cfc3ff';
    ctx.beginPath();ctx.ellipse(0,r*0.42,r*0.56,r*0.16,0,0,TAU);ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle=aura;ctx.fillRect(-r*0.24,-r*0.42,r*0.48,r*0.16);
  ctx.fillStyle='#ffffff';ctx.fillRect(-r*0.18,-r*0.04,r*0.10,r*0.10);ctx.fillRect(r*0.08,-r*0.04,r*0.10,r*0.10);
  ctx.restore();
}
const SPRITES={
  _default:(r)=>{ _so(r); _fc(0,0,r*0.9,'#9b8fc4',true); _eyes(r,0.3,0,r*0.16); },
  onster_p1:(r,e)=>drawOnsterSprite(r,e,1),
  onster_p2:(r,e)=>drawOnsterSprite(r,e,2),
  onster:(r,e)=>drawOnsterSprite(r,e),
  set3:(r,b)=>{ const ph=(b&&b.setPhase)||1; const img=ph===1?SET_HYEONJIN_SPRITE:(ph===2?SET_BEONGEOM_SPRITE:SET_KEKERORO_SPRITE); const ready=ph===1?setHyeonjinReady:(ph===2?setBeongeomReady:setKekeroroReady); if(ready){ const S=r*2.45; ctx.drawImage(img,-S/2,-S/2,S,S); return; } circle(0,0,r*0.9,ph===1?'#cc3040':ph===2?'#38e8ff':'#b84dff',ph===1?'#ff9b9b':ph===2?'#eafaff':'#ff4dd2'); },
  seungwoo:(r,b)=>{
    const ph=(b&&b.gphase)||1;
    const img=ph>=3?SW3_SPRITE:(ph===2?SW2_SPRITE:SW_SPRITE);
    const ready=ph>=3?sw3Ready:(ph===2?sw2Ready:swReady);
    if(ready){ctx.save();ctx.beginPath();ctx.arc(0,-r*0.05,r*0.98,0,TAU);ctx.clip();const ih=img.naturalHeight||1;const sh=r*(ph>=3?2.45:2.3);const sw=sh*(img.naturalWidth/ih);ctx.drawImage(img,-sw/2,-sh*0.52,sw,sh);ctx.restore();ctx.lineWidth=Math.max(2,r*0.06);ctx.strokeStyle=ph>=3?'#ff7a1f':(ph===2?'#ff4dd2':'#9146ff');ctx.beginPath();ctx.arc(0,-r*0.05,r*0.98,0,TAU);ctx.stroke();if(ph>=2){ctx.globalAlpha=ph>=3?0.18:0.14;ctx.fillStyle=ph>=3?'#ff7a1f':'#ff4dd2';ctx.beginPath();ctx.arc(-2,-r*0.05,r*1.0,0,TAU);ctx.fill();ctx.globalAlpha=1;}return;}
    const glitch=ph>=2, off=glitch?2:0;
    if(glitch){ ctx.globalAlpha=0.55; ctx.fillStyle=ph>=3?'#ff7a1f':'#ff4dd2'; ctx.beginPath(); ctx.arc(-off,0,r*0.8,0,TAU); ctx.fill(); ctx.fillStyle='#38e8ff'; ctx.beginPath(); ctx.arc(off,0,r*0.8,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
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
  hoonsangtae:(r)=>{ if(hoonsangtaeReady){ ctx.save(); ctx.beginPath(); ctx.arc(0,-r*0.03,r*1.05,0,TAU); ctx.clip(); const ih=HOONSANGTAE_SPRITE.naturalHeight||1, sh=r*2.55, sw=sh*(HOONSANGTAE_SPRITE.naturalWidth/ih); ctx.drawImage(HOONSANGTAE_SPRITE,-sw/2,-sh*0.53,sw,sh); ctx.restore(); ctx.lineWidth=2; ctx.strokeStyle='#ff6f8f'; ctx.beginPath(); ctx.arc(0,-r*0.03,r*1.05,0,TAU); ctx.stroke(); return; } _humanoid(r,{skin:'#4f70bf',hood:'#e25572',weapon:'dagger',weaponCol:'#dfe6ef'}); },
  jaemin:(r)=>{ if(jaeminReady){ ctx.save(); ctx.beginPath(); ctx.arc(0,-r*0.04,r*1.05,0,TAU); ctx.clip(); const ih=JAEMIN_SPRITE.naturalHeight||1, sh=r*2.65, sw=sh*(JAEMIN_SPRITE.naturalWidth/ih); ctx.drawImage(JAEMIN_SPRITE,-sw/2,-sh*0.54,sw,sh); ctx.restore(); ctx.lineWidth=2; ctx.strokeStyle='#f0a84a'; ctx.beginPath(); ctx.arc(0,-r*0.04,r*1.05,0,TAU); ctx.stroke(); return; } _humanoid(r,{skin:'#f0a84a',ears:1,hood:'#2a8b72',weapon:'dagger',weaponCol:'#c57a20'}); },
  sniper_viewer:(r)=>{ if(sniperViewerReady){ ctx.drawImage(SNIPER_VIEWER_SPRITE,-r,-r,r*2,r*2); return; } _so(r); ctx.fillStyle='#2b2f38'; ctx.fillRect(-r*0.46,-r*0.58,r*0.92,r*1.22); ctx.strokeRect(-r*0.46,-r*0.58,r*0.92,r*1.22); ctx.fillStyle='#151820'; ctx.fillRect(-r*0.7,-r*0.9,r*1.4,r*0.42); ctx.strokeRect(-r*0.7,-r*0.9,r*1.4,r*0.42); ctx.fillStyle='#ff2638'; ctx.fillRect(-r*0.18,-r*0.77,r*0.36,r*0.12); ctx.fillStyle='#101014'; ctx.fillRect(-r*0.34,-r*0.36,r*0.68,r*0.34); ctx.fillStyle='#ff2638'; ctx.fillRect(-r*0.07,-r*0.31,r*0.14,r*0.24); ctx.strokeStyle='#dfe6ef'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(r*0.12,r*0.02); ctx.lineTo(r*1.15,-r*0.22); ctx.stroke(); ctx.strokeStyle='#ff2638'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(r*0.82,-r*0.14,r*0.18,0,TAU); ctx.stroke(); },
  stream_watcher:(r)=>{ if(streamWatcherReady){ ctx.drawImage(STREAM_WATCHER_SPRITE,-r,-r,r*2,r*2); return; } _so(r); ctx.fillStyle='#102632'; ctx.fillRect(-r*0.82,-r*0.52,r*1.64,r*1.08); ctx.strokeRect(-r*0.82,-r*0.52,r*1.64,r*1.08); ctx.fillStyle='#58d8ff'; ctx.fillRect(-r*0.62,-r*0.35,r*1.24,r*0.58); ctx.fillStyle='#061118'; ctx.fillRect(-r*0.44,-r*0.22,r*0.88,r*0.28); ctx.fillStyle='#eafcff'; ctx.fillRect(-r*0.29,-r*0.11,r*0.2,r*0.1); ctx.fillRect(r*0.09,-r*0.11,r*0.2,r*0.1); ctx.fillStyle='#ff6a9a'; ctx.fillRect(r*0.45,-r*0.47,r*0.18,r*0.18); ctx.strokeStyle='#58d8ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,r*0.98,0,TAU); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-r*1.05,-r*0.7); ctx.lineTo(-r*0.78,-r*0.52); ctx.moveTo(r*1.05,-r*0.7); ctx.lineTo(r*0.78,-r*0.52); ctx.stroke(); },  goblin_assassin:(r)=>_humanoid(r,{skin:'#4f6b46',ears:1,hood:'#2f3b2c',weapon:'dagger'}),
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
  ketter:(r)=>{ // 케터
    if(ketterReady){ ctx.drawImage(KETTER_SPRITE,-r,-r,r*2,r*2); return; }
    const seg=[{x:-r*0.62,rr:0.42},{x:-r*0.18,rr:0.5},{x:r*0.26,rr:0.46},{x:r*0.66,rr:0.4}];
    seg.forEach(s=>circle(s.x,r*0.1,r*s.rr,'#7ed957','#3f7a34'));
    circle(r*0.66,r*0.04,r*0.4,'#9be86a','#3f7a34');
    ctx.fillStyle='#143d12'; circle(r*0.78,-r*0.06,r*0.08,'#143d12',false); circle(r*0.56,-r*0.06,r*0.08,'#143d12',false);
    ctx.strokeStyle='#3f7a34'; ctx.lineWidth=Math.max(1.5,r*0.07);
    ctx.beginPath(); ctx.moveTo(r*0.78,-r*0.3); ctx.lineTo(r*0.92,-r*0.62); ctx.moveTo(r*0.56,-r*0.3); ctx.lineTo(r*0.42,-r*0.62); ctx.stroke();
    circle(r*0.92,-r*0.66,r*0.06,'#cfff9b','#3f7a34'); circle(r*0.42,-r*0.66,r*0.06,'#cfff9b','#3f7a34');
  },
  act3_domin:(r,e)=>{ if(act3DominReady){ const S=r*2.5; ctx.drawImage(ACT3_DOMIN_SPRITE,-S/2,-S/2,S,S); return; } ctx.save(); ctx.scale(1.25,0.72); circle(0,0,r*0.86,'#7ad7ff','#2a7aa0'); ctx.restore(); ctx.fillStyle='#dff8ff'; ctx.beginPath(); ctx.moveTo(r*0.9,0); ctx.lineTo(r*1.28,-r*0.34); ctx.lineTo(r*1.18,r*0.32); ctx.closePath(); ctx.fill(); },
  act3_kullje:(r,e)=>{ if(act3KulljeReady){ const S=r*2.45; ctx.drawImage(ACT3_KULLJE_SPRITE,-S/2,-S/2,S,S); return; } ctx.fillStyle='#171021'; ctx.fillRect(-r*0.62,-r*0.62,r*1.24,r*1.24); ctx.strokeStyle='#ff4dd2'; ctx.strokeRect(-r*0.62,-r*0.62,r*1.24,r*1.24); },
  act3_magnet:(r,e)=>{ if(act3MagnetReady){ const S=r*2.35; ctx.drawImage(ACT3_MAGNET_SPRITE,-S/2,-S/2,S,S); return; } ctx.strokeStyle='#ff4d5a'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,r*0.7,Math.PI*0.2,Math.PI*0.8); ctx.stroke(); ctx.fillStyle='#d8e8ff'; ctx.fillRect(-r*0.55,r*0.1,r*0.28,r*0.48); ctx.fillRect(r*0.27,r*0.1,r*0.28,r*0.48); },
  act3_mirror:(r,e)=>{ if(act3MirrorReady){ const S=r*2.35; ctx.drawImage(ACT3_MIRROR_SPRITE,-S/2,-S/2,S,S); return; } ctx.fillStyle='#bff8ff'; ctx.fillRect(-r*0.52,-r*0.72,r*1.04,r*1.24); ctx.strokeStyle='#58d8ff'; ctx.strokeRect(-r*0.52,-r*0.72,r*1.04,r*1.24); ctx.fillStyle='#33304a'; ctx.fillRect(-r*0.2,r*0.58,r*0.4,r*0.28); },
  act3_truck:(r,e)=>{ if(act3TruckReady){ const S=r*2.55; ctx.drawImage(ACT3_TRUCK_SPRITE,-S/2,-S/2,S,S); return; } ctx.fillStyle='#1a1730'; ctx.fillRect(-r*0.9,-r*0.18,r*1.8,r*0.68); ctx.fillStyle='#58d8ff'; ctx.beginPath(); ctx.arc(0,-r*0.58,r*0.34,Math.PI,TAU); ctx.fill(); ctx.fillStyle='#ff4d5a'; circle(r*0.62,-r*0.7,r*0.12,'#ff4d5a',false); },
  act3_alppano:(r,e)=>{ if(act3AlppanoReady){ const S=r*2.45; ctx.drawImage(ACT3_ALPPANO_SPRITE,-S/2,-S/2,S,S); return; } ctx.fillStyle='#d6a02a'; ctx.fillRect(-r*0.32,-r*0.8,r*0.64,r*1.5); ctx.strokeStyle='#ffd34d'; ctx.strokeRect(-r*0.32,-r*0.8,r*0.64,r*1.5); ctx.strokeStyle='#5aa7ff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(r*0.52,-r*0.9); ctx.lineTo(r*0.52,r*0.7); ctx.stroke(); },
  act3_buffering:(r,e)=>{ if(act3BufferingReady){ const S=r*2.35; ctx.drawImage(ACT3_BUFFERING_SPRITE,-S/2,-S/2,S,S); return; } ctx.strokeStyle='#38e8ff'; ctx.lineWidth=3; for(let i=0;i<8;i++){ const a=i/8*TAU; ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.68,Math.sin(a)*r*0.68,r*0.08,0,TAU); ctx.stroke(); } circle(0,0,r*0.42,'#171021','#ff4dd2'); },
  act3_clone:(r,e)=>{ if(act3CloneReady){ const S=r*2.45; ctx.drawImage(ACT3_CLONE_SPRITE,-S/2,-S/2,S,S); return; } ctx.fillStyle='#b86bff'; ctx.fillRect(-r*0.48,-r*0.8,r*0.96,r*1.5); ctx.fillStyle='#38e8ff'; ctx.fillRect(-r*0.22,-r*0.35,r*0.12,r*0.12); ctx.fillRect(r*0.1,-r*0.35,r*0.12,r*0.12); },
  act3_sand_soldier:(r,e)=>{ ctx.fillStyle='#e0b85a'; ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*0.7,r*0.8); ctx.lineTo(-r*0.7,r*0.8); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#8a642a'; ctx.stroke(); },
  blackstar:(r)=>{ // 흑별
    if(blackstarReady){ ctx.drawImage(BLACKSTAR_SPRITE,-r,-r,r*2,r*2); return; }
    ctx.save();
    const glow=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.4);
    glow.addColorStop(0,'rgba(123,44,255,0.55)'); glow.addColorStop(1,'rgba(123,44,255,0)');
    ctx.fillStyle=glow; circle(0,0,r*1.35,glow,false);
    ctx.restore();
    ctx.beginPath();
    for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5; const rad=(i%2===0)?r*1.0:r*0.42; const px=Math.cos(a)*rad, py=Math.sin(a)*rad; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath();
    ctx.fillStyle='#17111f'; ctx.fill(); ctx.lineWidth=Math.max(2,r*0.1); ctx.strokeStyle='#7b2cff'; ctx.stroke();
    ctx.fillStyle='#b98bff'; circle(-r*0.16,-r*0.06,r*0.09,'#b98bff',false); circle(r*0.16,-r*0.06,r*0.09,'#b98bff',false);
  },
  killjoy:(r)=>{ // 킬조이
    if(killjoyReady){ ctx.drawImage(KILLJOY_SPRITE,-r,-r,r*2,r*2); return; }
    circle(0,0,r*0.85,'#0e2b33','#38e8ff');
    ctx.fillStyle='#061318'; _rr?_rr(-r*0.5,-r*0.34,r*1.0,r*0.5,r*0.12,'#061318'):ctx.fillRect(-r*0.5,-r*0.34,r*1.0,r*0.5);
    ctx.fillStyle='#38e8ff'; ctx.fillRect(-r*0.4,-r*0.2,r*0.8,r*0.16);
    ctx.fillStyle='#9af6ff'; ctx.beginPath();
    ctx.moveTo(r*0.04,-r*0.62); ctx.lineTo(-r*0.22,r*0.02); ctx.lineTo(-r*0.02,r*0.02); ctx.lineTo(-r*0.16,r*0.6); ctx.lineTo(r*0.26,-r*0.12); ctx.lineTo(r*0.04,-r*0.12); ctx.closePath();
    ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle='#eafdff'; ctx.stroke();
  },
  apple:(r)=>{ // 사과
    if(appleReady){ ctx.drawImage(APPLE_SPRITE,-r,-r,r*2,r*2); return; }
    circle(-r*0.28,r*0.08,r*0.6,'#ff4d6d','#a01230');
    circle(r*0.28,r*0.08,r*0.6,'#ff4d6d','#a01230');
    circle(0,r*0.12,r*0.66,'#ff5d7a','#a01230');
    ctx.fillStyle='#5a3a26'; ctx.fillRect(-r*0.06,-r*0.78,r*0.12,r*0.4);
    ctx.fillStyle='#4caf50'; ctx.save(); ctx.translate(r*0.22,-r*0.6); ctx.rotate(0.5);
    ctx.beginPath(); ctx.ellipse(0,0,r*0.34,r*0.16,0,0,TAU); ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle='#2f7d33'; ctx.stroke(); ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.5)'; circle(-r*0.3,-r*0.18,r*0.14,'rgba(255,255,255,0.5)',false);
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

// ── 상태이상 뱃지 아이콘 (HP바 위쪽) ──────────────────────────
function drawStatusBadges(e){
  const active=[];
  if((e.burnT ||0)>0) active.push({key:'fire',  dur:e.burnT, max:3  });
  if((e.chillT||0)>0) active.push({key:'frost', dur:e.chillT,max:2.5});
  if((e.psT   ||0)>0) active.push({key:'poison',dur:e.psT,   max:4  });
  if((e.stunT ||0)>0) active.push({key:'bell',  dur:e.stunT, max:0.6});
  if(!active.length) return;

  const CELL=1.6;
  const ICON_W=9*CELL;
  const GAP=3;
  const total=active.length*(ICON_W+GAP)-GAP;
  const startX=e.x-total/2;
  const baseY=e.y-e.r-20;

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  for(let i=0;i<active.length;i++){
    const {key,dur,max}=active[i];
    const pat=TREE_PIXEL_PATTERNS[key];
    if(!pat) continue;
    const alpha=0.55+0.45*(dur/max);
    const ix=Math.round(startX+i*(ICON_W+GAP));
    const iy=Math.round(baseY-ICON_W/2);
    ctx.globalAlpha=alpha*0.72;
    ctx.fillStyle='#0a0612';
    ctx.fillRect(ix-1,iy-1,ICON_W+2,ICON_W+2);
    ctx.globalAlpha=alpha;
    for(let row=0;row<pat.p.length;row++){
      for(let col=0;col<pat.p[row].length;col++){
        const k=pat.p[row][col];
        if(k==='.') continue;
        ctx.fillStyle=pat.c[k]||'#fff';
        ctx.fillRect(Math.round(ix+col*CELL),Math.round(iy+row*CELL),Math.ceil(CELL),Math.ceil(CELL));
      }
    }
  }
  ctx.restore();
}
function drawStatusGroundAuraLocal(e,r,t){
  const active=[];
  if((e.burnT||0)>0) active.push({col:'#ff7a2a',dur:e.burnT,max:3,spin:0});
  if((e.chillT||0)>0) active.push({col:'#5af0ff',dur:e.chillT,max:2.5,spin:1.8});
  if((e.psT||0)>0) active.push({col:'#3dff8a',dur:e.psT,max:4,spin:3.3});
  if((e.stunT||0)>0) active.push({col:'#ffe060',dur:e.stunT,max:0.6,spin:4.7});
  if(!active.length) return;
  const wob=Number(t)||0;
  ctx.save();
  ctx.lineCap='round';
  active.forEach((fx,i)=>{
    const life=clamp(fx.dur/(fx.max||1),0,1);
    const yy=r*0.62+i*2.1;
    const rx=r*(0.78+i*0.10);
    const ry=Math.max(4,r*(0.20+i*0.03));
    const pulse=0.5+0.5*Math.sin(wob*3.5+fx.spin);
    ctx.globalAlpha=0.30+0.26*life;
    ctx.strokeStyle=fx.col;
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.ellipse(0,yy,rx,ry,0,0,TAU);
    ctx.stroke();
    ctx.globalAlpha=0.55+0.25*pulse;
    for(let k=0;k<3;k++){
      const a=wob*1.6+fx.spin+k*TAU/3;
      ctx.fillStyle=fx.col;
      ctx.fillRect(Math.cos(a)*rx-1,yy+Math.sin(a)*ry-1,2,2);
    }
  });
  ctx.restore();
}
// ─────────────────────────────────────────────────────────────
function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.translate(0,Math.sin(e.wob)*2);
  const _isc=(e.introScale==null?1:e.introScale);
  if(_isc<=0.01){ ctx.restore(); return; }
  if(_isc!==1) ctx.scale(_isc,_isc);
  if(e.ai==='bossorb'){ drawBossOrb(e); ctx.restore(); return; }
  const act3Alpha=(e.ai==='stealth_assassin'&&(e.stealthT||0)>0)?0.38:((e.ai==='submerge_charge'&&e.submerged)?0.32:(e._glitchClone?0.58:1));
  if(act3Alpha<1) ctx.globalAlpha*=act3Alpha;
  drawStatusGroundAuraLocal(e,e.r,e.wob);
  // ── 가시성 보정: 적 실루엣을 따라 외곽 글로우 (배경 대비 강화) ──
  ctx.save();
  ctx.shadowColor = e.eliteViewer ? 'rgba(255,80,80,0.95)' : 'rgba(120,205,255,0.85)';
  ctx.shadowBlur  = 9;   // 더 또렷하게: 12~14, 은은하게: 6
  (SPRITES[e.sprite||e.type]||SPRITES._default)(e.r,e);
  ctx.restore();
  if(e.type==='hoonsangtae'&&e.hp<=e.maxhp*0.5){ ctx.save(); ctx.strokeStyle='rgba(255,77,109,'+(0.45+0.35*Math.abs(Math.sin(e.wob*4)))+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,e.r+5,0,TAU); ctx.stroke(); ctx.restore(); }
  if(e.type==='sniper_viewer'&&e.aimBeam&&!e.aimBeam.fired){ ctx.save(); ctx.strokeStyle='rgba(255,38,56,0.82)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,e.r+4+2*Math.sin(e.wob*4),0,TAU); ctx.stroke(); ctx.restore(); }
  if(e.ai==='reflector'&&(e.reflectT||0)>0){ ctx.save(); ctx.strokeStyle='rgba(139,232,255,0.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,e.r+9+3*Math.sin(e.wob*5),0,TAU); ctx.stroke(); ctx.restore(); }
  if(e.ai==='magnet'){ ctx.save(); ctx.globalAlpha=0.22+0.08*Math.sin(e.wob*3); ctx.strokeStyle='#ff4d5a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,e.range||230,0,TAU); ctx.stroke(); ctx.restore(); }
  if((e.emergeWarnT||0)>0||(e.teleWarnT||0)>0){ ctx.save(); ctx.strokeStyle=e.ai==='submerge_charge'?'#7ad7ff':'#ff4dd2'; ctx.lineWidth=3; ctx.setLineDash([9,6]); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((e.aimX||0)*210,(e.aimY||0)*210); ctx.stroke(); ctx.restore(); }
  if(e.eliteViewer){ ctx.save(); ctx.strokeStyle='rgba(255,60,60,'+(0.45+0.4*Math.abs(Math.sin(e.wob*2.5)))+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,e.r+8,0,TAU); ctx.stroke(); ctx.restore(); }
  if(e.ai==='charge' && (e.cs==='wind'||e.cs==='spit')){
    const len=e.cs==='wind'?135:78;
    ctx.save(); ctx.strokeStyle='rgba(255,70,70,'+(0.35+0.45*Math.abs(Math.sin(e.wob)))+')'; ctx.lineWidth=3; ctx.setLineDash([7,6]);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((e.aimX||0)*len,(e.aimY||0)*len); ctx.stroke(); ctx.restore();
  } else if(e.ai==='charge' && (e.cs==='cast'||e.cs==='burst')){
    const col=e.cs==='burst'?'202,161,74':'232,122,138';
    ctx.save(); ctx.strokeStyle='rgba('+col+','+(0.4+0.4*Math.abs(Math.sin(e.wob)))+')'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,e.r+12+4*Math.sin(e.wob*2),0,TAU); ctx.stroke(); ctx.restore();
  } else if(e.ai==='charge' && e.cs==='jump'){
    const tx=(e._jumpTx==null?e.x:e._jumpTx)-e.x, ty=(e._jumpTy==null?e.y:e._jumpTy)-e.y;
    const pulse=0.55+0.25*Math.abs(Math.sin(e.wob*2.2));
    ctx.save();
    ctx.strokeStyle='rgba(255,179,71,'+pulse+')'; ctx.lineWidth=3; ctx.setLineDash([9,6]);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(tx,ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,179,71,0.12)'; ctx.strokeStyle='rgba(255,179,71,0.85)';
    ctx.beginPath(); ctx.arc(tx,ty,120,0,TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if(e.type==='hyechul'&&e.slamState==='warn'){
    // 강림 충전: 수축하는 경고 링으로 "곧 덮친다"를 알림
    const pr=clamp(1-(e.slamT||0)/0.9,0,1);
    ctx.save();
    ctx.strokeStyle='rgba(255,90,42,'+(0.55+0.4*Math.abs(Math.sin(e.wob*6)))+')'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,0,e.r+12+34*(1-pr),0,TAU); ctx.stroke();
    ctx.shadowColor='#ff5a2a'; ctx.shadowBlur=18; ctx.strokeStyle='rgba(255,150,60,0.85)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,e.r+8,0,TAU); ctx.stroke();
    ctx.restore();
  } else if(e.type==='hyechul'&&e.slamState==='dive'){
    // 강하 중: 강한 글로우로 내려오는 본체를 강조
    ctx.save(); ctx.shadowColor='#ff5a2a'; ctx.shadowBlur=26; ctx.strokeStyle='rgba(255,90,42,0.95)'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(0,0,e.r+9,0,TAU); ctx.stroke(); ctx.restore();
  }
  if(e.hitT>0){ ctx.globalAlpha=0.6; circle(0,0,e.r+1,'#fff'); ctx.globalAlpha=1; }
  if(e.elite){ ctx.lineWidth=2.5; ctx.strokeStyle='#ffd34d'; circle(0,0,e.r+6,null,'#ffd34d'); }
  ctx.restore();
  drawIntentBubble(e.x,e.y,e.r,e);
  if(e.hp<e.maxhp && !e.midboss && !e.eliteViewer){
    const w=e.r*2;
    ctx.fillStyle='#0008'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w,4);
    ctx.fillStyle=e.color; ctx.fillRect(e.x-w/2,e.y-e.r-12,w*clamp(e.hp/e.maxhp,0,1),4);
  }
  drawStatusBadges(e);
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
  const sw=b.phaseT||0;
  const g=ctx.createRadialGradient(0,0,b.r*0.5,0,0,b.r*1.8);
  g.addColorStop(0,b.color+'55'); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; circle(0,0,b.r*1.8,g);
  drawStatusGroundAuraLocal(b,b.r,sw);
  (SPRITES[b.sprite]||SPRITES._default)(b.r,b);
  if(b.hitT>0){ ctx.globalAlpha=0.55; circle(0,0,b.r+2,'#fff'); ctx.globalAlpha=1; }
  if(b.enraged){ ctx.lineWidth=3; ctx.strokeStyle='#ff4d6d'; circle(0,0,b.r+7,null,'#ff4d6d'); }
  ctx.restore();
  drawIntentBubble(b.x,b.y,b.r,b);
  drawStatusBadges(b);
  // 보스 체력바 (상단)
  const bw=W*0.7, bx=(W-bw)/2;
  ctx.fillStyle='#0009'; ctx.fillRect(bx-2,14,bw+4,16);
  ctx.fillStyle='#2a1530'; ctx.fillRect(bx,16,bw,12);
  ctx.fillStyle=b.color; ctx.fillRect(bx,16,bw*clamp(b.hp/b.maxhp,0,1),12);
  ctx.fillStyle='#fff'; ctx.font='bold 13px Courier New'; ctx.textAlign='center';
  ctx.fillText(b.name+(b.key==='set3'?' · '+set3PhaseName(b):(b.enraged?' 〔격노〕':'')), W/2, 27);
  ctx.textAlign='left';
}
function drawPlayer(){
  const p=player;
  // ★ player 미초기화(타이틀/메뉴 등)면 그리지 않음 — NaN 좌표/반지름 크래시 방지
  if(!Number.isFinite(p.r)||!Number.isFinite(p.x)||!Number.isFinite(p.y)) return;

  if(p.minion){ circle(p.minion.x,p.minion.y,7,'#8be8ff','#1d8fa0'); circle(p.minion.x,p.minion.y,3,'#eafaff','#8be8ff'); }

  // 이동 감지(걷기 바운스용)
  const moved=(Math.abs(p.x-(p._lastDX!=null?p._lastDX:p.x))+Math.abs(p.y-(p._lastDY!=null?p._lastDY:p.y)))>0.25;
  p._lastDX=p.x; p._lastDY=p.y;
  // 조준 방향 좌우 플립(히스테리시스로 수직 조준 시 깜빡임 방지)
  if(Math.cos(p.facing)<-0.15) p._faceLeft=true;
  else if(Math.cos(p.facing)>0.15) p._faceLeft=false;
  const faceLeft=!!p._faceLeft;

  ctx.save(); ctx.translate(p.x,p.y);

  // ── 바닥 그림자(고정 — 몸만 바운스, 그림자는 안 흔들림) ──
  {
    ctx.save();
    ctx.globalAlpha=0.32;
    ctx.fillStyle='#000';
    ctx.beginPath();
    ctx.ellipse(0, p.r*1.15, p.r*1.05, p.r*0.40, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ── 주인공 상시 오라 ──
  {
    const fs=(typeof GS!=='undefined'&&GS.flashScale!=null)?GS.flashScale:1;
    const t=performance.now()/1000;
    const pulse=0.5+0.5*Math.sin(t*2.0)*fs;
    const R=p.r*3.0;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const gr=ctx.createRadialGradient(0,0,p.r*0.35,0,0,R);
    gr.addColorStop(0,   'rgba(56,232,255,0.30)');
    gr.addColorStop(0.5, 'rgba(145,70,255,0.16)');
    gr.addColorStop(1,   'rgba(145,70,255,0)');
    ctx.globalAlpha=0.55+0.35*pulse;
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill();
    ctx.restore();
  }

  let alpha=1;
  if(p.dodging>0) alpha=0.5;
  if(p.iframes>0 && Math.floor(p.iframes*20)%2===0) alpha=0.4;

  // 보호막 오라
  if((p.buffs && p.buffs.shield>0)||(p.hitShield||0)>0||(p.overhealShield||0)>0){ ctx.globalAlpha=0.45; circle(0,0,p.r+9,null,'#bff8ff'); ctx.globalAlpha=1; }

  // 회피 링
  if(p.dodging>0){
    const dp=0.55+0.45*Math.sin(performance.now()/45);
    ctx.save();
    ctx.globalAlpha=0.78; ctx.shadowColor='#bff8ff'; ctx.shadowBlur=24;
    ctx.strokeStyle='#eafaff'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,0,p.r+12+dp*4,0,TAU); ctx.stroke();
    ctx.globalAlpha=0.62; ctx.strokeStyle='#38e8ff'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,p.r+21+dp*7,0,TAU); ctx.stroke();
    ctx.restore();
  }

  // 조준 무기(스프라이트 뒤에서 삐져나옴)
  ctx.save(); ctx.rotate(p.facing);
  ctx.fillStyle='#e9e4f5'; ctx.fillRect(p.r+1,-3,15,6);
  ctx.fillStyle='#9146ff'; ctx.fillRect(p.r+14,-4,5,8);
  ctx.restore();

  // ── 걷기/대기 바운스 ──
  const bobAmp = moved ? 2.4 : 1.0;
  const bobSpd = moved ? 9.5 : 3.0;
  const bob = Math.sin(performance.now()/1000*bobSpd)*bobAmp;

  // ── 캐릭터 스프라이트(바운스 + 좌우 플립) ──
  ctx.globalAlpha=alpha;
  const S=p.r*3.3;   // ← 캐릭터 크기. 더 키우려면 3.5~3.6
  ctx.save();
  ctx.translate(0, bob);
  if(faceLeft) ctx.scale(-1,1);
  if(playerSpriteReady) ctx.drawImage(PLAYER_SPRITE,-S/2,-S/2-2,S,S);
  else circle(0,0,p.r,'#38e8ff','#0a3a44');
  ctx.restore();

  // ── 피격 시 빨간 플래시(맞은 직후 iframes 동안) ──
  if(p.iframes>0){
    ctx.save();
    ctx.translate(0, bob);
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=Math.min(0.55, p.iframes*1.1);
    ctx.fillStyle='#ff2b4d';
    ctx.beginPath(); ctx.arc(0,0,p.r*1.5,0,TAU); ctx.fill();
    ctx.restore();
  }

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
    banner('교전 시작',eliteDisplayName(currentEliteKind()),900);
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
  if(sfx.enemySummon) sfx.enemySummon();
  markDiscovered('enemies', 'zerg_egg');
  const d=ENEMY_TYPES.zerg_egg, hm=Math.max(1,hatchTime||20);
  enemies.push({
    type:'zerg_egg',sprite:'zerg_egg',name:'저그 알',
    x:clamp(x,30,W-30),y:clamp(y,120,H-120),r:d.r,
    hp:d.hp*diffSet.hp,maxhp:d.hp*diffSet.hp,spd:0,_spd0:0,dmg:0,
    color:d.color,xp:0,ai:'egg',hatchType,hatchT:hm,hatchMax:hm,
    wob:rand(0,TAU),hitT:0,coolT:0,summoned:true,noKillScore:true,
  });
  burst(x,y,'#8a3f6f',10,140);
}
function hyechulSpawnEgg(e,hatchType,count,hatchTime){
  const cap=hatchType==='ultra'?3:(hatchType==='mutalisk'?7:9);
  const pending=enemies.filter(x=>x.type==='zerg_egg'&&x.hatchType===hatchType).length;
  const live=enemies.filter(x=>x.type===hatchType).length;
  const n=Math.max(0,Math.min(count,cap-live-pending));
  let spawned=0;
  for(let i=0;i<n;i++){
    let x,y;
    if(i%2===0){
      const edge=irand(0,3);
      x=edge<2?(edge===0?rand(55,170):rand(W-170,W-55)):rand(90,W-90);
      y=edge>=2?(edge===2?rand(135,245):rand(H-210,H-95)):rand(145,H-110);
    }else{
      const ang=i/n*TAU+rand(-0.35,0.35), rr=rand(135,250);
      x=player.x+Math.cos(ang)*rr;
      y=player.y+Math.sin(ang)*rr;
    }
    x=clamp(x,50,W-50); y=clamp(y,130,H-90);
    if(dist2(x,y,player.x,player.y)<95*95){ x=clamp(x+(x<player.x?-100:100),50,W-50); y=clamp(y+(y<player.y?-70:70),130,H-90); }
    spawnEgg(x,y,hatchType,hatchTime);
    spawned++;
  }
  if(spawned>0){ banner('알 투척','알을 먼저 깨부숴라',900); beep(150,0.18,'sawtooth',0.06); }
}
function hyechulCreepBloom(e,count){
  for(let i=0;i<(count||2);i++){
    const a=rand(0,TAU), rr=rand(70,190);
    spawnCreep(clamp(player.x+Math.cos(a)*rr,60,W-60),clamp(player.y+Math.sin(a)*rr,120,H-80));
  }
  const k=10;
  for(let i=0;i<k;i++){
    const a=i/k*TAU+rand(-0.08,0.08);
    eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:7,dmg:8,life:3.4,spore:true,srcName:'\uC810\uB9C9 \uD655\uC0B0'});
  }
}
function hyechulSummonRush(e){
  let n=0;
  enemies.forEach(o=>{
    if(['zergling','mutalisk','ultra'].includes(o.type)){
      o.atkBuffT=5; const bs=o._spd0||o.spd||0; o.spd=Math.min((o.spd||bs)*1.12,bs*1.35); burst(o.x,o.y,'#c98bff',5,140); n++;
    }
  });
  if(n>0) banner('\uD83E\uDDEC \uAD70\uCCB4 \uAC01\uC131','\uC18C\uD658\uC218\uAC00 \uB354 \uBE60\uB974\uAC8C \uB2EC\uB824\uB4E0\uB2E4',850);
}
function hyechulEggBomb(e){
  const eggs=enemies.filter(o=>o.type==='zerg_egg'&&!o._eggBomb).slice(0,3);
  eggs.forEach((egg,idx)=>{
    egg._eggBomb=true;
    setIntent(egg,'\uD83D\uDCA3','\uBD80\uD328 \uD3ED\uBC1C',1.4+idx*0.18,()=>{
      if(!enemies.includes(egg)) return;
      intentShockwave(egg.x,egg.y,92,15,'\uBD80\uD328 \uD3ED\uBC1C');
      egg.hp=0; killEnemy(egg);
    });
  });
  if(eggs.length) banner('\uD83D\uDCA3 \uBD80\uD328 \uD3ED\uBC1C','\uC54C\uC774 \uD130\uC9C0\uAE30 \uC804\uC5D0 \uAE68\uBD80\uC154\uB77C',850);
}
function updateHazards(dt){
  player._creepSlow=false; player._slowField=false;
  for(let i=hazards.length-1;i>=0;i--){ const h=hazards[i]; h.t+=dt;
    if(h.kind==='beamSweep'){
      if(h.hitCd>0) h.hitCd-=dt;
      const active=h.t>=h.warnT, done=h.t>=h.warnT+h.liveT;
      if(active&&!h._beamSfx){ h._beamSfx=true; if(sfx.enemyLaser) sfx.enemyLaser(); }
      if(active&&!done){
        const ang=h.ang+(h.t-h.warnT)*(h.rot||0), px=player.x-h.x, py=player.y-h.y;
        const along=px*Math.cos(ang)+py*Math.sin(ang), side=Math.abs(-px*Math.sin(ang)+py*Math.cos(ang));
        if(along>0&&along<(h.range||620)&&side<(h.width||18)&&!(h.hitCd>0)){ hurtPlayer(h.dmg||10,h.srcName||'중계차'); h.hitCd=0.35; }
      }
      if(done) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='slowfield'){
      if(h.t>=h.warnT && dist2(player.x,player.y,h.x,h.y)<h.r*h.r) player._slowField=true;
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='gravitywell'){
      if(h.t>=h.warnT){
        const dx=h.x-player.x, dy=h.y-player.y, dd=Math.hypot(dx,dy)||1;
        if(dd<h.r && player.dodging<=0){
          const pull=(h.pull||180)*(1-dd/h.r);
          player.x=clamp(player.x+dx/dd*pull*dt,player.r,W-player.r);
          player.y=clamp(player.y+dy/dd*pull*dt,player.r,H-player.r);
          if(h.dmg>0){ h.tickCd=(h.tickCd||0)-dt; if(h.tickCd<=0){ h.tickCd=0.55; hurtPlayer(h.dmg,h.srcName||'???'); } }
        }
      }
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='creep'){
      if(dist2(player.x,player.y,h.x,h.y)<h.r*h.r) player._creepSlow=true;
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='movelock'){
      if(!h.done&&h.t>=h.warnT){
        h.done=true;
        if((player.moveLockImmuneT||0)<=0 && dist2(player.x,player.y,h.x,h.y)<h.r*h.r){
          player.moveLockT=Math.max(player.moveLockT||0,h.lockT||0.75);
          player.moveLockImmuneT=1.5;
          player.dodging=0;
          burst(player.x,player.y,'#58d8ff',12,150);
        }
      }
      if(h.t>=h.warnT+h.liveT) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='poison'){
      if(h.tickCd>0) h.tickCd-=dt;
      if(dist2(player.x,player.y,h.x,h.y)<h.r*h.r && !(h.tickCd>0)){ hurtPlayer(h.dmg,h.srcName||'독'); h.tickCd=0.55; }
      if(h.t>=h.life) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='safezone'){
      const cur=h.r+(h.rEnd-h.r)*clamp((h.t-h.warnT)/Math.max(0.01,h.killT),0,1);
      h.curR=Math.max(38,cur);
      if(h.t>=h.warnT && h.t<h.warnT+h.killT){
        if(dist2(player.x,player.y,h.x,h.y)>h.curR*h.curR) glDamage(h.dmg*dt);
      }
      if(h.t>=h.warnT+h.killT) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='band'){
      if(h.t>=h.warnT && h.t<h.warnT+h.liveT && !h.hit){
        const px=player.x-h.x, py=player.y-h.y;
        const along=px*Math.cos(h.ang)+py*Math.sin(h.ang), side=Math.abs(-px*Math.sin(h.ang)+py*Math.cos(h.ang));
        if(Math.abs(along)<h.len/2 && side<h.wid/2){ h.hit=true; hurtPlayer(h.dmg,h.srcName||'십자'); }
      }
      if(h.t>=h.warnT+h.liveT) hazards.splice(i,1);
      continue;
    }
    if(h.kind==='spinbar'){
      if(h.hitCd>0) h.hitCd-=dt;
      if(h.owner){ h.x=h.owner.x; h.y=h.owner.y; }
      h.ang+=h.rot*dt;
      if(h.t>=h.warnT && !(h.hitCd>0)){
        const px=player.x-h.x, py=player.y-h.y;
        const along=Math.abs(px*Math.cos(h.ang)+py*Math.sin(h.ang)), side=Math.abs(-px*Math.sin(h.ang)+py*Math.cos(h.ang));
        if(along<h.len/2 && side<h.wid/2){ hurtPlayer(h.dmg,h.srcName||'회전 검'); h.hitCd=0.4; }
      }
      if(h.t>=h.warnT+h.liveT) hazards.splice(i,1);
      continue;
    }
    if(h.t>=h.warnT && h.t<h.warnT+h.liveT){
      if(!h._sfxActive){ h._sfxActive=true; if(sfx.enemyExplode) sfx.enemyExplode(); }
      if(!h.hit && dist2(player.x,player.y,h.x,h.y)<h.r*h.r){ h.hit=true; hurtPlayer(h.dmg, h.srcName||(boss?boss.name:'바닥 장판')); }
      if(Math.random()<0.55) burst(h.x+rand(-h.r*0.5,h.r*0.5),h.y-rand(0,16),pick(['#ffd24a','#ff8c2a','#ff5b2a']),2,220);
    }
    if(h.t>=h.warnT+h.liveT) hazards.splice(i,1);
  }
}
function spawnDeathBubble(x,y,text,dur){
  floatBubbles.push({x:x, y:y, vy:-16, t:0, max:dur||3.0, text:text});
  trimArrayHead(floatBubbles,PERF_LIMITS.floatBubbles);
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
    if(h.kind==='beamSweep'){
      const warn=h.t<h.warnT, k=warn?clamp(h.t/h.warnT,0,1):1;
      const activeT=Math.max(0,h.t-h.warnT), ang=h.ang+activeT*(h.rot||0), range=h.range||620, width=h.width||18;
      const nx=-Math.sin(ang), ny=Math.cos(ang), ex=h.x+Math.cos(ang)*range, ey=h.y+Math.sin(ang)*range;
      const fade=warn?1:clamp(1-activeT/(h.liveT||2.2),0,1);
      ctx.save();
      ctx.globalAlpha=(warn?0.35+0.35*Math.sin(h.t*18)**2:0.62)*fade;
      ctx.fillStyle=warn?'rgba(88,216,255,0.13)':'rgba(88,216,255,0.24)';
      ctx.beginPath(); ctx.moveTo(h.x+nx*width,h.y+ny*width); ctx.lineTo(ex+nx*width,ey+ny*width); ctx.lineTo(ex-nx*width,ey-ny*width); ctx.lineTo(h.x-nx*width,h.y-ny*width); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=warn?'#58d8ff':'#eafaff'; ctx.lineWidth=warn?2+3*k:7; ctx.setLineDash(warn?[10,7]:[]);
      ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(ex,ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha=0.5*fade; ctx.strokeStyle='#38e8ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(h.x,h.y,24+8*Math.sin((h.seed||0)+h.t*4),0,TAU); ctx.stroke();
      ctx.restore();
      continue;
    }
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
    if(h.kind==='movelock'){
      const warn=h.t<h.warnT, k=warn?clamp(h.t/h.warnT,0,1):1, fade=warn?1:clamp(1-(h.t-h.warnT)/(h.liveT||0.3),0,1);
      ctx.save();
      ctx.globalAlpha=(warn?0.5+0.3*Math.abs(Math.sin(h.t*18)):0.58)*fade;
      ctx.strokeStyle=warn?'#58d8ff':'#f2fbff'; ctx.lineWidth=3; ctx.setLineDash(warn?[8,5]:[]);
      ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*0.72,0,0,TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='rgba(88,216,255,'+(warn?0.07+0.13*k:0.2*fade)+')';
      ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r*(warn?k:1),h.r*0.72*(warn?k:1),0,0,TAU); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,'+(0.28+0.25*k)+')'; ctx.lineWidth=1.6;
      for(let n=0;n<4;n++){ const a=n/4*TAU+(h.seed||0)+h.t*2; ctx.beginPath(); ctx.moveTo(h.x+Math.cos(a)*h.r*0.18,h.y+Math.sin(a)*h.r*0.13); ctx.lineTo(h.x+Math.cos(a)*h.r*0.82,h.y+Math.sin(a)*h.r*0.58); ctx.stroke(); }
      ctx.strokeStyle='rgba(88,216,255,'+(0.35+0.35*k)+')'; ctx.lineWidth=2; ctx.strokeRect(h.x-h.r*0.68,h.y-h.r*0.42,h.r*1.36,h.r*0.84);
      ctx.strokeStyle='rgba(255,255,255,'+(0.25+0.25*k)+')'; ctx.lineWidth=1.4;
      for(let n=0;n<3;n++){ const yy=h.y-h.r*0.22+n*h.r*0.22; ctx.beginPath(); ctx.moveTo(h.x-h.r*0.48,yy); ctx.lineTo(h.x+h.r*0.48,yy); ctx.stroke(); }
      ctx.restore(); continue;
    }
    if(h.kind==='poison'){
      const a=clamp(h.t<0.4?h.t/0.4:(h.life-h.t)/1.0,0,1), col=h.col||'#7be04a';
      ctx.save(); ctx.globalAlpha=0.42*a;
      pxBlob(h.x,h.y,h.r,h.r*0.6,Math.max(4,h.r*0.34),col,_shade(col,-0.4));
      ctx.globalAlpha=0.3*a; ctx.fillStyle=_shade(col,0.4);
      for(let k=0;k<3;k++){ const ka=k/3*TAU+(h.seed||0)+h.t*1.2, bx=h.x+Math.cos(ka)*h.r*0.45, by=h.y+Math.sin(ka)*h.r*0.28, g=Math.max(3,h.r*0.2); ctx.fillRect(Math.round(bx-g/2),Math.round(by-g/2),Math.ceil(g),Math.ceil(g)); }
      ctx.restore(); continue;
    }
    if(h.kind==='safezone'){
      const warn=h.t<h.warnT, cur=h.curR||h.r;
      const da=warn?(0.12+0.26*clamp(h.t/h.warnT,0,1)):0.5;
      ctx.save();
      const g=ctx.createRadialGradient(h.x,h.y,Math.max(1,cur),h.x,h.y,cur+90);
      g.addColorStop(0,'rgba(255,20,68,0)'); g.addColorStop(1,'rgba(255,20,68,'+da+')');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=0.95; ctx.strokeStyle=warn?'#ffffff':'#9bffd0'; ctx.lineWidth=3; ctx.setLineDash([10,6]);
      ctx.beginPath(); ctx.arc(h.x,h.y,cur,0,TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore(); continue;
    }
    if(h.kind==='band'){
      const warn=h.t<h.warnT, k=warn?clamp(h.t/h.warnT,0,1):1, col=h.col||'#ff4dd2';
      ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.ang);
      const fade=warn?(0.28+0.3*Math.abs(Math.sin(h.t*16))):clamp(1-(h.t-h.warnT)/h.liveT,0,1)*0.6;
      ctx.globalAlpha=fade; ctx.fillStyle=col;
      ctx.fillRect(-h.len/2,-h.wid/2*(warn?k:1),h.len,h.wid*(warn?k:1));
      ctx.globalAlpha=Math.min(0.9,fade+0.3); ctx.strokeStyle='#fff'; ctx.lineWidth=2;
      ctx.strokeRect(-h.len/2,-h.wid/2,h.len,h.wid);
      ctx.restore(); continue;
    }
    if(h.kind==='spinbar'){
      const warn=h.t<h.warnT, col=h.col||'#38e8ff';
      ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.ang);
      ctx.globalAlpha=warn?(0.35+0.35*Math.abs(Math.sin(h.t*16))):0.85;
      pxBar(h.len,h.wid,col,_shade(col,-0.45));
      ctx.globalAlpha=warn?0.5:0.95; ctx.fillStyle='#fff';
      const g=Math.max(3,h.wid*0.5); for(let x=-h.len/2;x<=h.len/2;x+=g){ ctx.fillRect(Math.round(x-g/2),-2,Math.ceil(g),4); }
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
  if(isKkotMain(e)){
    const phase=clamp(e.phase||1,1,3);
    const gap=4, rowH=10, totalH=rowH*3+gap*2;
    ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fillRect(bx-4,by-4,bw+8,totalH+8);
    for(let i=1;i<=3;i++){
      const y=by+(i-1)*(rowH+gap);
      const fill=i<phase?0:(i===phase?clamp(e.hp/e.maxhp,0,1):1);
      ctx.fillStyle='#2a1414'; ctx.fillRect(bx,y,bw,rowH);
      const grad=ctx.createLinearGradient(bx,0,bx+bw,0); grad.addColorStop(0,i===3?'#8a0030':'#ff3b70'); grad.addColorStop(1,i===3?'#ff2060':'#ffb0d0');
      ctx.fillStyle=grad; ctx.fillRect(bx,y,bw*fill,rowH);
      ctx.strokeStyle=i===phase?'#ffb0d0':'#7a264a'; ctx.lineWidth=1.5; ctx.strokeRect(bx,y,bw,rowH);
    }
    ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText('🍯 양갱 ['+phase+'/3]', W/2, by-8);
    ctx.textAlign='left'; ctx.restore();
    return;
  }
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
  ctx.fillText('\u26A0\uFE0F \uC911\uAC04\uBCF4\uC2A4 \u00B7 '+(e.label||'')+(e.type==='onster'&&e.phase>=2?' [각성]':''), W/2, by-8);
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
  for(const w of kijoLaserWarns){
    const k=clamp(w.t/w.warn,0,1);
    const fade=w.t<=w.warn?1:clamp(1-(w.t-w.warn)/0.32,0,1);
    const sx=w.x, sy=w.y, ex=w.x+Math.cos(w.ang)*w.range, ey=w.y+Math.sin(w.ang)*w.range;
    const nx=-Math.sin(w.ang), ny=Math.cos(w.ang), half=w.width;
    const pulse=0.55+0.45*Math.sin(performance.now()/55);
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.fillStyle='rgba(255,77,109,'+(0.08+0.16*k)+')';
    ctx.beginPath();
    ctx.moveTo(sx+nx*half,sy+ny*half);
    ctx.lineTo(ex+nx*half,ey+ny*half);
    ctx.lineTo(ex-nx*half,ey-ny*half);
    ctx.lineTo(sx-nx*half,sy-ny*half);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap='round';
    ctx.shadowColor=w.color;
    ctx.shadowBlur=16+10*pulse;
    ctx.strokeStyle=w.fired?'#ffd34d':w.color;
    ctx.lineWidth=5+3*pulse;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,211,77,'+(0.45+0.35*k)+')';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(sx+nx*half,sy+ny*half); ctx.lineTo(ex+nx*half,ey+ny*half);
    ctx.moveTo(sx-nx*half,sy-ny*half); ctx.lineTo(ex-nx*half,ey-ny*half);
    ctx.stroke();
    ctx.fillStyle='rgba(255,211,77,'+(0.18+0.35*k)+')';
    ctx.beginPath(); ctx.arc(sx,sy,10+8*k,0,TAU); ctx.fill();
    ctx.restore();
  }
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
// ===== 픽셀아트 적 탄막 =====
function _shade(hex,f){
  const m=/^#?([0-9a-fA-F]{6})$/.exec(hex||''); if(!m) return hex||'#38e8ff';
  const n=parseInt(m[1],16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const mix=f<0?0:255, t=Math.min(1,Math.abs(f));
  r=Math.round(r+(mix-r)*t); g=Math.round(g+(mix-g)*t); b=Math.round(b+(mix-b)*t);
  return 'rgb('+r+','+g+','+b+')';
}
const BULLET_PATTERNS={
  shard:  ["..2..",".212.","21312",".212.","..2.."],
  orb:    [".121.","12321","13331","12321",".121."],
  spore:  ["1.2.1",".121.","21312",".121.","1.2.1"],
  chain:  ["221122","2.11.2","2.11.2","221122"],          // 가로 방향
  mask:   ["2.1.2","13331","11111","21112",".111."],
  energy: ["..3..",".131.","31213",".131.","..3.."],
  needle: ["....3","221111","....3"],                       // 가로 방향
  glitch: ["2.22","2113","3112","22.2"],
  bolt:   ["...11","311111","...11"],                       // 가로 방향
  jelly:  [".111.","13331","11111",".111."],
};
const DIR_KINDS={chain:1,needle:1,bolt:1};
const KIND_COL={ spore:'#7be04a', chain:'#8d72ff', mask:'#ff5a4a', energy:'#ff4dd2', needle:'#cfe0ff', glitch:'#38e8ff', bolt:'#ffd34d', jelly:'#ff7ad2', orb:'#9b6bff', shard:'#38e8ff' };
function pxDraw(rows,pu,pal){
  const h=rows.length; let w=0; for(const r of rows) if(r.length>w) w=r.length;
  const ox=-w*pu/2, oy=-h*pu/2, s=Math.ceil(pu);
  for(let yy=0;yy<h;yy++){ const row=rows[yy]; for(let xx=0;xx<row.length;xx++){ const c=row[xx]; if(c==='.'||c===' '||c==='0') continue; const col=pal[c]; if(!col) continue; ctx.fillStyle=col; ctx.fillRect(Math.round(ox+xx*pu),Math.round(oy+yy*pu),s,s); } }
}
function pxBlob(cx,cy,rx,ry,grid,fillCol,edgeCol){
  grid=Math.max(3,grid||6); const s=Math.ceil(grid);
  for(let gy=-ry;gy<=ry;gy+=grid){ for(let gx=-rx;gx<=rx;gx+=grid){
    const nx=gx/rx, ny=gy/ry, d=nx*nx+ny*ny; if(d>1.02) continue;
    ctx.fillStyle=(edgeCol&&d>0.6)?edgeCol:fillCol;
    ctx.fillRect(Math.round(cx+gx-grid/2),Math.round(cy+gy-grid/2),s,s);
  } }
}
function pxBar(len,wid,col,edge){ // 원점 기준 가로 막대를 픽셀 블록으로
  const grid=Math.max(3,wid*0.5), s=Math.ceil(grid);
  for(let x=-len/2;x<=len/2;x+=grid){ const edgeX=Math.abs(x)>len*0.42; ctx.fillStyle=edgeX?(edge||col):col; ctx.fillRect(Math.round(x-grid/2),Math.round(-wid/2),s,Math.ceil(wid)); }
}
function bulletKind(b){
  if(b._kind) return b._kind;
  let k=b.style;
  if(!k){
    if(b.spore) k='spore';
    else { const n=b.srcName||'';
      if(/키죠|가면/.test(n)) k='mask';
      else if(/온스터|사슬/.test(n)) k='chain';
      else if(/케케로로|세트3|현진|번검|신호|분신/.test(n)) k='energy';
      else if(/박제인간/.test(n)) k='needle';
      else if(/양갱/.test(n)) k='jelly';
      else if(/승우/.test(n)) k='glitch';
      else if(/저격|관통|조준/.test(n)) k='bolt';
      else if(/포자|산성|혜철|저글링|뮤탈|울트라/.test(n)) k='spore';
      else k='shard';
    }
  }
  if(!BULLET_PATTERNS[k]) k='shard';
  b._kind=k; return k;
}
function drawEBullet(b){
  const kind=bulletKind(b);
  const base=(kind==='shard'&&b.col)?b.col:(KIND_COL[kind]||'#38e8ff');
  const pal={'1':base,'2':_shade(base,-0.5),'3':_shade(base,0.6)};
  if(kind==='glitch'){ pal['1']='#38e8ff'; pal['2']=_shade('#38e8ff',-0.5); pal['3']='#ff4dd2'; }
  const rows=BULLET_PATTERNS[kind]; const w=rows[0].length;
  const pu=Math.max(2,(b.r*2.3)/Math.max(w,rows.length));
  ctx.save(); ctx.translate(b.x,b.y);
  if(DIR_KINDS[kind]) ctx.rotate(Math.atan2(b.vy,b.vx));
  else if(b.spin) ctx.rotate(b.spin);
  pxDraw(rows,pu,pal);
  ctx.restore();
}
function drawCleaverPx(b){
  const ang=Math.atan2(b.vy,b.vx);
  ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.spin||ang);
  const pal={'1':'#cfd6e0','2':'#39414e','3':'#ffffff','4':'#7a4a2a'};
  pxDraw([".22222222","211111113","211111112",".22222112",".......44"], Math.max(2,b.r*0.5), pal);
  ctx.restore();
}
function drawBoomerangPx(b){
  const ang=Math.atan2(b.vy,b.vx);
  const base=b.returning?'#58d8ff':'#ffd34d';
  const pal={'1':base,'2':_shade(base,-0.5),'3':'#ffffff'};
  ctx.save(); ctx.translate(b.x,b.y); ctx.rotate((b.spin||0)+ang);
  pxDraw(["11....","2113..","21133.",".33112","..3112","....11"], Math.max(2,b.r*0.5), pal);
  ctx.restore();
}

function draw(){
  ctx.save();
  { const _sk=screenShake*(typeof GS!=='undefined'?GS.shake:1); if(_sk>0.5){ ctx.translate(rand(-_sk,_sk),rand(-_sk,_sk)); } }
  if(boss&&(boss.pattern==='glitch'||boss.pattern==='set3')&&state==='play'){ const cx=W/2,cy=H/2; ctx.translate(cx,cy); ctx.scale(gView.fx,gView.fy); ctx.rotate(gView.rot); ctx.translate(-cx,-cy); }
  drawBackground();

  // 픽업
  for(const pk of pickups){
    const yo=Math.sin(pk.bob)*2;
    if(pk.type==='gold'){ circle(pk.x,pk.y+yo,pk.r,'#ffd34d','#a8740a'); ctx.fillStyle='#7a5400';ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillText('G',pk.x,pk.y+yo+3);ctx.textAlign='left'; }
    else{ const drawY=(pk.baseY!=null?pk.baseY:pk.y)+Math.sin(performance.now()*0.004+(pk.phase||0))*2; circle(pk.x,drawY,pk.r,'#ff5d8a','#7a1030'); ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';ctx.textAlign='center';ctx.fillText('♥',pk.x,drawY+3);ctx.textAlign='left'; }
  }
  drawHazards();
  drawA3World();
  drawKijoFx();
  // 적
  for(const e of enemies) drawEnemy(e);
  drawFloatBubbles();
  if(boss&&(boss.pattern==='glitch'||boss.pattern==='set3')) drawSeungwooWorld();
  if(boss) drawBoss(boss);
  const _mb=enemies.find(e=>e.midboss); if(_mb) drawMidbossBar(_mb);
  const _el=enemies.find(e=>e.eliteViewer); if(_el && !eliteIntro) drawEliteBar(_el);
  // 탄
  for(const b of eBullets){
    if(b.foodImg && b.foodImg.complete){ const S=b.r*2.7; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.spin||0); ctx.drawImage(b.foodImg,-S/2,-S/2,S,S); ctx.restore(); }
    else if(b.cleaver) drawCleaverPx(b);
    else if(b.boomerang) drawBoomerangPx(b);
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
    else drawEBullet(b);
  }
  for(const b of pBullets){
    if(!b||!Number.isFinite(b.x)||!Number.isFinite(b.y)) continue;
    ctx.save();ctx.shadowColor=b.crit?'#ffd34d':'#38e8ff';ctx.shadowBlur=8;
    circle(b.x,b.y,b.r||4,b.crit?'#ffe28a':'#bff8ff',b.crit?'#a8740a':'#1d8fa0'); ctx.restore();
  }
  drawDashFx();
  // 플레이어
  if(state!=='start'&&state!=='end') drawPlayer();
  // 파티클
  for(const p of particles){
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    if(p.heart){ rbSpr(ctx,RB_HRTR,p.x-9,p.y-9,2,RB_HRT); }
    else circle(p.x,p.y,p.r,p.color);
    ctx.globalAlpha=1;
  }
  if(typeof drawDmgNums==='function') drawDmgNums();
  ctx.restore();

  // 피격 플래시
  if(hitFlash>0){ ctx.fillStyle='rgba(255,77,109,'+(hitFlash*0.6*(typeof GS!=='undefined'?GS.flashScale:1))+')'; ctx.fillRect(0,0,W,H); }
  if(boss&&(boss.pattern==='glitch'||boss.pattern==='set3')&&state==='play') drawSeungwooOverlay();
  drawA3Screen();
  if(eliteIntro) drawEliteIntro();
  if(bossEvolve) drawBossEvolve();
  // 베인Q 쿨다운 인디케이터 (아이콘 + 방사형 쿨)
  if(state==='play'){
    const sz=Math.round(46*SKILL_HUD_SCALE);
    const ix=clamp(SKILL_HUD_MARGIN_X,12,Math.max(12,W-sz-12));
    const iy=clamp(H-sz-SKILL_HUD_MARGIN_Y,12,Math.max(12,H-sz-12));
    const cx=ix+sz/2, cy=iy+sz/2;
    const maxCharges=Math.max(1,player.dodgeMaxCharges||1);
    const charges=clamp(player.dodgeCharges||0,0,maxCharges);
    const cdMax=Math.max(0.01,10*playerDodgeCooldownMul(player)), ready=charges>0;
    const rem=charges>=maxCharges?0:clamp(player.dodgeCd/cdMax,0,1);
    const readyFx=clamp((player.dodgeReadyFxT||0)/DODGE_READY_FX_DURATION,0,1);
    ctx.save();
    ctx.fillStyle='rgba(5,12,20,0.72)';
    ctx.fillRect(ix-8,iy-24,sz+16,sz+32);
    ctx.strokeStyle=ready?'rgba(56,232,255,0.55)':'rgba(105,93,140,0.42)';
    ctx.lineWidth=2;
    ctx.strokeRect(ix-8,iy-24,sz+16,sz+32);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(ix,iy,sz,sz); ctx.clip();
    ctx.fillStyle='#0a0712'; ctx.fillRect(ix,iy,sz,sz);
    if(vqReady) ctx.drawImage(VAYNEQ_ICON,ix,iy,sz,sz);
    else { ctx.fillStyle='#16384a'; ctx.fillRect(ix,iy,sz,sz); }
    if(rem>0){
      ctx.fillStyle='rgba(6,4,12,0.78)';
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,sz,-Math.PI/2,-Math.PI/2+rem*TAU); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if(readyFx>0){
      const k=1-readyFx;
      ctx.save();
      ctx.globalAlpha=0.22*readyFx;
      ctx.fillStyle='#ffd34d';
      ctx.shadowColor='#ffd34d';
      ctx.shadowBlur=26;
      ctx.beginPath();
      ctx.arc(cx,cy,sz*(0.58+0.22*k),0,TAU);
      ctx.fill();
      ctx.globalAlpha=readyFx;
      ctx.strokeStyle='#fff1a8';
      ctx.lineWidth=5+3*readyFx;
      ctx.beginPath();
      ctx.arc(cx,cy,sz*(0.54+0.42*k),0,TAU);
      ctx.stroke();
      ctx.strokeStyle='#ffd34d';
      ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.arc(cx,cy,sz*(0.7+0.56*k),0,TAU);
      ctx.stroke();
      for(let i=0;i<8;i++){
        const a=i*TAU/8+k*0.7;
        const r1=sz*(0.66+0.22*k);
        const r2=sz*(0.88+0.4*k);
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
        ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.lineWidth=ready?4:3; ctx.strokeStyle=ready?'#38e8ff':'#4d4566'; ctx.strokeRect(ix,iy,sz,sz);
    if(ready){
      ctx.save();
      ctx.shadowColor='#38e8ff'; ctx.shadowBlur=18; ctx.strokeStyle='#eafaff'; ctx.lineWidth=2.5;
      ctx.strokeRect(ix+3,iy+3,sz-6,sz-6);
      ctx.restore();
    }
    else {
      ctx.fillStyle='#fff'; ctx.strokeStyle='#02050a'; ctx.lineWidth=5; ctx.font='bold 20px Courier New'; ctx.textAlign='center';
      const txt=player.dodgeCd.toFixed(1);
      ctx.strokeText(txt, cx, cy+7);
      ctx.fillText(txt, cx, cy+7);
      ctx.textAlign='left';
    }
    ctx.fillStyle='rgba(5,16,25,0.88)'; ctx.fillRect(ix+5,iy+sz-20,sz-10,16);
    ctx.fillStyle=ready?'#eafaff':'#c9c0e8'; ctx.font='bold 12px Courier New'; ctx.textAlign='center';
    ctx.strokeStyle='#02050a'; ctx.lineWidth=3;
    ctx.strokeText('Q '+charges+'/'+maxCharges, cx, iy+sz-7);
    ctx.fillText('Q '+charges+'/'+maxCharges, cx, iy+sz-7);
    ctx.textAlign='left';
    ctx.fillStyle=ready?'#8be8ff':'#b9acd8'; ctx.font='bold 12px sans-serif';
    ctx.strokeStyle='#02050a'; ctx.lineWidth=3;
    ctx.strokeText('베인Q  SPACE', ix, iy-8);
    ctx.fillText('베인Q  SPACE', ix, iy-8);
  }
  drawTutorial();
  try{ drawAct3FinalClear(); }catch(e){ console.warn('act3 final clear draw failed',e); if(act3FinalClearActive()){ const c=act3FinalClear; if(c.timer) clearTimeout(c.timer); act3FinalClear=null; victory(); } }
  if(typeof drawFpsOverlay==='function') drawFpsOverlay();
}

// ---------- 메인 루프 ----------
let last=performance.now();
// ---------- 일시정지 (ESC) ----------
let paused=false;
function togglePause(){
  if(paused){ resumeGame(); return; }
  if(state!=='play'&&state!=='map') return; // 전투/맵 화면에서 일시정지 가능
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
  recoverInvisiblePause();
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
const overlays={title:'ovTitle',start:'ovStart',map:'ovMap',relic:'ovRelic',shop:'ovShop',event:'ovEvent',inv:'ovInv',level:'ovLevel',reward:'ovReward',end:'ovEnd',ranking:'ovRanking',achievements:'ovAchievements',database:'ovDatabase',help:'ovHelp',story:'ovStory',entrance:'ovEntrance',tierIntro:'ovTierIntro',treeIntro:'ovTreeIntro',taunt:'ovTaunt',campfire:'ovCampfire'};
function hideAll(){ if(typeof TooltipManager!=='undefined') TooltipManager.hideAll(); Object.values(overlays).forEach(id=>{ const el=$(id); if(el) el.classList.add('hidden'); }); if(typeof evStopScene==='function') evStopScene(); const _ec=$('ovEnding'); if(_ec) _ec.classList.add('hidden'); if(typeof EndingCredits!=='undefined' && EndingCredits.stop) EndingCredits.stop(); }
function syncChrome(){ document.body.classList.toggle('title-mode', state==='title'||state==='start'); }
function show(st){
  hideAll();
  if(overlays[st]){ const el=$(overlays[st]); if(el) el.classList.remove('hidden'); }
  if(st!=='help') state=st;
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel(true);
}
function sidePanelSignature(){
  if(!statPanelEligible()) return 'hidden:'+state;
  const p=player, buffs=p.buffs||{};
  const potionBuffSig=(p.potionBuffs||[]).map(b=>(b.id||b.name||'buff')+':'+Math.ceil(b.t||0)).join(',');
  const train=ensureTrainingState(p);
  const trainingSig=TRAINING_DEFS.map(def=>def.id+':'+(train[def.id]||0)).join(',');
  return [
    state,statPanelCollapsed,act,currentRow,gold,level,treePoints,
    Math.round(Number(p.maxhp)||0),
    totalAttackPower(p).toFixed(1),
    (Number(p.critChance)||0).toFixed(3),
    (Number(p.critMult)||0).toFixed(2),
    playerFireRate(p).toFixed(2),
    p.shots||1,p.pierce||0,p.bounce||0,p.homing||0,!!p.backShot,
    incomingDamageMul(p).toFixed(3),
    effectiveRegen(p).toFixed(2),
    (p.relics||[]).map(r=>r&&r.id).join(','),
    (p.perkIds||[]).join(','),
    (p.potions||[]).map(x=>x&&(x.id||x.name)).join(','),
    Math.ceil(buffs.rage||0),Math.ceil(buffs.haste||0),Math.ceil(buffs.shield||0),
    potionBuffSig,trainingSig,
    p.redPulseBuff>0?Math.ceil(p.redPulseBuff):0,
    p.shadowBarrageT>0?Math.ceil(p.shadowBarrageT):0,
    p.shadowBarrageCd>0?Math.ceil(p.shadowBarrageCd):0,
    p.perfectDodgeFireT>0?Math.ceil(p.perfectDodgeFireT):0,
    p.dodgeReloadT>0?Math.ceil(p.dodgeReloadT):0
  ].join('|');
}
function refreshSidePanel(force){
  const sp=$('sidePanel'); if(!sp) return;
  const sw=$('stageWrap');
  const eligible=statPanelEligible();
  const sig=sidePanelSignature();
  if(!force && sig===sidePanelSig) return;
  sidePanelSig=sig;
  if(eligible){
    renderSidePanel();
    sp.classList.toggle('show',!statPanelCollapsed);
    sp.classList.toggle('is-collapsed',statPanelCollapsed);
    if(sw) sw.classList.toggle('with-side',!statPanelCollapsed);
  }else{
    sp.classList.remove('show','is-collapsed');
    if(sw) sw.classList.remove('with-side');
  }
  syncStatPanelTab(eligible);
}
function statPanelEligible(){
  if(!(player && player.maxhp!=null)) return false;
  if(state==='title'||state==='start'||state==='end') return false;
  if(isOpen('ovSettings')||isOpen('ovRanking')||isOpen('ovAchievements')||isOpen('ovDatabase')||isOpen('ovHelp')) return false;
  return true;
}
function saveStatPanelCollapsed(){
  try{ localStorage.setItem(STAT_PANEL_COLLAPSED_KEY,statPanelCollapsed?'true':'false'); }catch(e){}
}
function setStatPanelCollapsed(v){
  statPanelCollapsed=!!v;
  saveStatPanelCollapsed();
  refreshSidePanel(true);
  if(typeof fitField==='function') fitField();
}
function toggleStatPanel(){
  if(!statPanelEligible()) return;
  setStatPanelCollapsed(!statPanelCollapsed);
}
function getStatPanelTab(){
  let tab=$('statPanelTab');
  if(!tab){
    tab=document.createElement('button');
    tab.id='statPanelTab';
    tab.type='button';
    tab.textContent='STAT ▶';
    tab.setAttribute('aria-label','능력치 패널 열기');
    tab.onclick=()=>setStatPanelCollapsed(false);
    document.body.appendChild(tab);
  }
  return tab;
}
function syncStatPanelTab(eligible){
  const tab=getStatPanelTab();
  tab.classList.toggle('show',!!eligible && statPanelCollapsed);
}

const INTRO_SEEN_KEY='btv_introSeen_v3';
const INTRO_BEATS=[
  {caption:'방송이 시작됐다.', phase:0, duration:30000, title:'김봉식 LIVE', sub:'마이크 체크 · 채팅 연결 중', chatTitle:'채팅창', hud:['LIVE','송출 안정','딜레이 2.1초']},
  {caption:'아무 일도 일어나지 않는다.', phase:1, duration:30000, title:'평범한 방송', sub:'시청자들은 잡담을 이어간다', chatTitle:'채팅창', hud:['LIVE','채팅 정상','시청자 유지']},
  {caption:'아주 가끔, 화면이 한 픽셀씩 어긋난다.', phase:2, duration:15000, title:'송출 안정화 중', sub:'일부 소스에서 미세한 지연이 감지됩니다', chatTitle:'채팅창', hud:['SYNC','딜레이 변동','소스 확인']},
  {caption:'누군가 종료하지 말라고 말하기 시작했다.', phase:3, duration:15000, title:'종료 요청 대기', sub:'방송 종료 버튼이 활성화됩니다', chatTitle:'채팅창', hud:['외부 송출','내부 세션','퇴장 대기']},
];
const INTRO_REPLAY_BEATS=[
  {caption:'이미 본 방송 사고다.', phase:2, duration:5000, title:'송출 안정화 중', sub:'미세한 지연이 다시 감지됩니다', chatTitle:'채팅창', hud:['SYNC','소스 확인']},
  {caption:'종료하지 말라는 채팅이 올라온다.', phase:3, duration:5000, title:'종료 요청 대기', sub:'방송 종료 버튼이 활성화됩니다', chatTitle:'채팅창', hud:['외부 송출','내부 세션']},
];
function hasSeenIntro(){ try{ return localStorage.getItem(INTRO_SEEN_KEY)==='1'||localStorage.getItem('introSeen')==='1'; }catch(e){ return false; } }
function markIntroSeen(){ try{ localStorage.setItem(INTRO_SEEN_KEY,'1'); localStorage.setItem('introSeen','1'); }catch(e){} }
function introReducedMotion(){
  try{ if(typeof _SET!=='undefined' && _SET.flashReduce) return true; }catch(e){}
  try{ return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; }
}
const BOSS_TAUNTS={
  easy:  "외부 송출은 종료할 수 있습니다. 내부 시청자는 별도 처리하십시오.",
  normal:"외부 송출은 종료할 수 있습니다. 내부 시청자는 별도 처리하십시오.",
  hard:  "외부 송출은 종료할 수 있습니다. 내부 시청자는 별도 처리하십시오.",
};
// 화면 찢어짐(글리치) 연출
function triggerGlitch(after){
  const app=$('app'), fx=$('glitchFx');
  const reduced=introReducedMotion(), dur=reduced?500:740, pulses=reduced?2:4;
  try{ for(let i=0;i<pulses;i++) setTimeout(()=>beep(rand(80,200),0.04,'sawtooth',reduced?0.025:0.05),i*80); }catch(e){}
  if(fx){ fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on'); }
  if(app){ app.classList.remove('glitching'); void app.offsetWidth; app.classList.add('glitching'); }
  screenShake=Math.max(screenShake,reduced?6:18);
  setTimeout(()=>{ if(fx)fx.classList.remove('on'); if(app)app.classList.remove('glitching'); after&&after(); }, dur);
}
// 짧은 시스템 경고 → 글리치 → 인트로
function bossTaunt(diff, cb){
  armIntroPlayback();
  hideAll(); state='story'; syncChrome();
  const ov=$('ovTaunt'); if(!ov){ cb&&cb(); return; }
  ov.classList.remove('hidden');
  const el=$('tauntText'); el.textContent='';
  const full=BOSS_TAUNTS[diff&&diff.key]||BOSS_TAUNTS.normal;
  let ci=0, done=false;
  function finish(){
    if(done) return; done=true;
    clearInterval(tm); ov.onclick=null;
    setTimeout(()=>triggerGlitch(()=>{ ov.classList.add('hidden'); cb&&cb(); }), 260);
  }
  ov.onclick=()=>{ if(ci<full.length){ el.textContent=full; ci=full.length; } else finish(); };
  const tm=setInterval(()=>{
    if(ci<full.length){ el.textContent+=full.charAt(ci++); try{ if(ci%3===0)beep(180,0.018,'square',0.025); }catch(e){} }
    else finish();
  }, 34);
}
// ===== 인트로 시네마틱 연출 =====
const storyFx={ timers:[], replicaInt:null, popupInt:null, streakInt:null, chatInt:null, hintInt:null, introChatPhase:'normal', panicCount:0 };
function clearStoryFx(){
  storyFx.timers.forEach(id=>{ clearTimeout(id); clearInterval(id); }); storyFx.timers=[];
  if(storyFx.replicaInt){ clearInterval(storyFx.replicaInt); storyFx.replicaInt=null; }
  if(storyFx.popupInt){ clearInterval(storyFx.popupInt); storyFx.popupInt=null; }
  if(storyFx.streakInt){ clearInterval(storyFx.streakInt); storyFx.streakInt=null; }
  if(storyFx.hintInt){ clearInterval(storyFx.hintInt); storyFx.hintInt=null; }
  stopIntroChat(true);
}
function setIntroPlaying(on){
  try{ document.body.classList.toggle('intro-playing',!!on); }catch(e){}
}
function armIntroPlayback(){
  setIntroPlaying(true);
  const hud=$('hud');
  if(hud){
    hud.style.opacity='0';
    hud.style.visibility='hidden';
    hud.style.pointerEvents='none';
    hud.style.transform='translateY(-12px)';
  }
}
function cleanupIntroPlayback(){
  setIntroPlaying(false);
  introSilentUntil=0; introBgmMul=1;
  const hud=$('hud');
  if(hud){
    hud.style.opacity='';
    hud.style.visibility='';
    hud.style.pointerEvents='';
    hud.style.transform='';
  }
}
function introFxReset(options){
  const keepPlaying=!!(options&&options.keepPlaying);
  clearStoryFx();
  if(keepPlaying) armIntroPlayback();
  else cleanupIntroPlayback();
  const app=$('app'); if(app) app.classList.remove('app-edge');
  const fx=$('introFx'), rep=$('introReplicas'),
        pop=$('introPopups'), blk=$('introBlackout'),
        eb=$('endBroadcastBtn');
  const bcChat=$('introBroadcastChat'); if(bcChat) bcChat.classList.remove('unstable','collapse-flood');
  if(fx) fx.classList.remove('system-collapse');
  if(rep){ rep.classList.remove('show'); rep.innerHTML=''; }
  if(pop){ pop.innerHTML=''; }
  if(blk){
    blk.classList.remove('show','fake-ended','questioning','awaiting-end');
    const wr=blk.querySelector('.eb-wrap'); if(wr) wr.removeAttribute('data-ended');
  }
  if(eb){ eb.classList.remove('armed'); eb.classList.remove('forced'); eb.classList.remove('trying'); }
  if(eb){ eb.onclick=null; eb.textContent='방송 종료'; }
  const ebs=$('ebStatus'); if(ebs){ ebs.classList.remove('show'); ebs.textContent=''; }
  const iskip=$('introSkipBtn'); if(iskip){ iskip.style.display='none'; iskip.onclick=null; }
  if(fx){ fx.classList.remove('on'); }
  const bc=$('ovStoryBcast'), pl=$('ovStoryPlate');
  if(bc){ bc.classList.remove('show','glitch','crash'); }
  if(pl){ pl.classList.remove('show'); }
  const deck=$('introDeck'); if(deck&&deck.parentNode) deck.parentNode.removeChild(deck);
  const st=$('storyText'); if(st){ st.classList.remove('show','urgent'); st.textContent=''; }
}
function introEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
const INTRO_CHAT_NAMES=['노잭','양파양갱','러라','zlwy','L0ry','장수풍뎅이2','강쪼이','까1치','나까무라김춘식','전미닝','우디엘런','박제인간','광천김','혜철이','흑별','이끼낀바나나','훈상태','러부엉','소실아','메구몬','고로고로무','아기새자야','미주1013','Catthe'];
const INTRO_CHAT_COLORS=['#91ffb6','#ff7ad9','#8be8ff','#ffd86b','#bfa2ff','#ff9f6e','#a5ffef','#f0f3ff','#9fd66b','#ff8fa7'];
const INTRO_CHAT_BADGES=['1st','♥','25','구독','팬','★'];
const NORMAL_CHAT=[
  '봉하','ㅎㅇㅎㅇ','안녕하세요','방 켰네','소리 괜찮음','화면 잘 나옴','오늘 뭐함?','늦었다',
  '밥 먹음?','ㅋㅋㅋㅋ','오 시작','렉 없네','지금 옴','채팅 느리다','잘 보임','볼륨 조금만',
  '오랜만','오늘 텐션 좋네','광고 끝?','와 사람 많다','편하게 봄','ㅇㅇ','ㄹㅇㅋㅋ','아 배고파',
  '커피 사옴','잠깐 나갔다 옴','오늘 춥다','다들 하이','마이크 좋네','채팅 빠르다','어제 봤음',
  'ㅋㅋ','오디오 굿','밥 먹고 옴','눈팅함','반갑습니다','오늘도 왔다'
];
const GAME_CHAT=[
  '게임 켜짐?','오늘 몇 판 함?','난이도 뭐임','캐릭 귀엽다','첫판임?','맵 좋네','컨디션 괜찮네','이거 오랜만'
];
const ODD_CHAT=[
  '나만 그렇게 보임?','화면 이상해','방금 끊김?','화면 왼쪽 뭐임','소리 살짝 이상함','채팅 밀린다',
  '저거 원래 뜸?','왜 검게 번짐','잠깐 멈췄다','누가 채팅 지움?','화면 내려간다','소스 흔들림?'
];
const LATE_CHAT=[
  '종료하지 마','지금 끄면 안돼','끝내지 마','나가','나가','종료 누르지 마','아직 남아있어','채팅창 안 꺼짐',
  '방장 보지 마','창 닫아','늦었어','나가'
];
const PANIC_CHAT=[
  '방송종료됨'
];
const SYSTEM_HINTS=['나만 그렇게 보임?','화면 이상해','채팅창 밀린다','소스가 흔들림','방금 검게 됐지?','소리 이상해'];
const BATTLE_LOGS=['소스 연결 지연','프레임 동기화 실패','채팅 로그 재정렬','내부 세션 유지','송출 키 응답 없음'];
const PLATFORM_NOTICES=['채팅 동기화 중','소스 안정화 실패','내부 세션이 남아 있습니다','송출 종료 확인 대기','시청자 수 불일치'];
const VIEWER_FACE_TAGS=['LV','DP','KC','ON','IN','TV'];
const VIEWER_CARD_TAGS=['입장 완료','조준 중','주문 중','동기화','대기열 실패','세션 유지'];
const END_REPLICA_TEXT=['방송종료됨???????','방송종료됨??????','아직 채팅 중','내부 세션 유지','나가'];
function introChatPool(mode){
  if(mode==='panic') return PANIC_CHAT;
  if(mode==='late') return LATE_CHAT;
  if(mode==='weird'||mode==='log') return ODD_CHAT;
  return NORMAL_CHAT;
}
function introChatName(){
  return INTRO_CHAT_NAMES[Math.floor(Math.random()*INTRO_CHAT_NAMES.length)];
}
function pushIntroChat(mode,text){
  const list=$('introChatList'); if(!list) return;
  mode=mode||storyFx.introChatPhase||'normal';
  const line=document.createElement('div');
  line.className='intro-chat-line '+(mode==='panic'?'panic':(mode==='normal'?'':'weird'));
  const badges=1+(Math.random()<0.28?1:0);
  for(let i=0;i<badges;i++){
    const b=document.createElement('span');
    b.className='intro-chat-badge '+(i===1?'bit':(Math.random()<0.35?'sub':''));
    b.textContent=INTRO_CHAT_BADGES[Math.floor(Math.random()*INTRO_CHAT_BADGES.length)];
    line.appendChild(b);
  }
  const name=document.createElement('span');
  name.className='intro-chat-name';
  name.style.color=INTRO_CHAT_COLORS[Math.floor(Math.random()*INTRO_CHAT_COLORS.length)];
  name.textContent=introChatName()+':';
  const msg=document.createElement('span');
  msg.className='intro-chat-msg';
  const pool=introChatPool(mode);
  if(mode==='panic'){
    const p=Math.min(1,(storyFx.panicCount||0)/44);
    const gb=Math.round(242*(1-p));
    line.style.color='rgb(255,'+gb+','+gb+')';
    line.style.fontSize='clamp(11px,'+(0.82+p*0.24).toFixed(2)+'vw,16px)';
    line.style.left=(Math.random()*86).toFixed(2)+'%';
    line.style.top=(Math.random()*92).toFixed(2)+'%';
    storyFx.panicCount=(storyFx.panicCount||0)+1;
  }
  if(text) msg.textContent=text;
  else if(mode==='normal' && Math.random()<0.2) msg.textContent=GAME_CHAT[Math.floor(Math.random()*GAME_CHAT.length)];
  else msg.textContent=pool[Math.floor(Math.random()*pool.length)];
  line.appendChild(name);
  line.appendChild(msg);
  list.appendChild(line);
  while(list.children.length>26) list.removeChild(list.firstElementChild);
}
function stopIntroChat(clearList){
  if(storyFx.chatInt){ clearInterval(storyFx.chatInt); storyFx.chatInt=null; }
  if(clearList){ const list=$('introChatList'); if(list) list.innerHTML=''; }
}
function setIntroChatPhase(mode){
  storyFx.introChatPhase=mode||'normal';
  stopIntroChat(false);
}
function stopIntroSystemHints(){
  if(storyFx.hintInt){ clearInterval(storyFx.hintInt); storyFx.hintInt=null; }
  const chat=$('introBroadcastChat'); if(chat) chat.classList.remove('unstable');
}
function silenceIntroAudio(ms){
  introSilentUntil=Math.max(introSilentUntil,(performance&&performance.now?performance.now():Date.now())+(ms||500));
  try{
    if(typeof MUSIC!=='undefined' && MUSIC.tracks){
      for(const k in MUSIC.tracks){ if(MUSIC.tracks[k]) MUSIC.tracks[k].volume=0; }
    }
  }catch(e){}
}
function playIntroNoise(){
  if(muted) return;
  try{
    const mul=introAudioMultiplier();
    if(mul<=0.001) return;
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const dur=introReducedMotion()?0.08:0.16;
    const buffer=audioCtx.createBuffer(1,Math.max(1,Math.floor(audioCtx.sampleRate*dur)),audioCtx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
    const src=audioCtx.createBufferSource(), filt=audioCtx.createBiquadFilter(), gain=audioCtx.createGain();
    filt.type='bandpass'; filt.frequency.value=2600+Math.random()*900; filt.Q.value=7;
    gain.gain.value=(introReducedMotion()?0.012:0.026)*sfxVol*mul;
    src.buffer=buffer; src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination); src.start();
  }catch(e){}
}
function startIntroSystemHints(){
  const chat=$('introBroadcastChat'); if(chat) chat.classList.add('unstable');
  introBgmMul=introReducedMotion()?0.65:0.42;
  if(storyFx.hintInt) clearInterval(storyFx.hintInt);
  function hint(){
    pushIntroChat('weird',SYSTEM_HINTS[Math.floor(Math.random()*SYSTEM_HINTS.length)]);
    try{ playIntroNoise(); }catch(e){}
  }
  storyFx.timers.push(setTimeout(hint,1200));
  storyFx.hintInt=setInterval(hint,15000);
}
function startIntroChat(mode){
  const fx=$('introFx'); if(fx)fx.classList.add('on');
  setIntroChatPhase(mode||'normal');
  const list=$('introChatList');
  if(list && list.children.length===0){
    const seedCount=mode==='normal'?3:(mode==='panic'?0:5);
    for(let i=0;i<seedCount;i++) pushIntroChat(mode);
  }
  const wait=mode==='panic'?64:(mode==='late'?(introReducedMotion()?760:430):(mode==='weird'||mode==='log'?(introReducedMotion()?860:610):(introReducedMotion()?1250:980)));
  storyFx.chatInt=setInterval(()=>pushIntroChat(mode),wait);
  pushIntroChat(mode);
}
function panicIntroChatFlood(){
  setIntroChatPhase('panic');
  storyFx.panicCount=0;
  const list=$('introChatList'); if(list) list.innerHTML='';
  const count=introReducedMotion()?24:52;
  for(let i=0;i<count;i++){
    storyFx.timers.push(setTimeout(()=>pushIntroChat('panic'),i*(introReducedMotion()?72:34)));
  }
  storyFx.chatInt=setInterval(()=>pushIntroChat('panic'),introReducedMotion()?96:44);
  storyFx.timers.push(setTimeout(()=>{ if(storyFx.chatInt){ clearInterval(storyFx.chatInt); storyFx.chatInt=null; } },introReducedMotion()?2400:2050));
}
function spawnReplicaText(mode){
  const rep=$('introReplicas'); if(!rep) return;
  const d=document.createElement('div');
  d.className='replicaText'+(Math.random()<0.42?' hot':'');
  d.style.left=(4+Math.random()*84)+'%';
  d.style.top=(8+Math.random()*78)+'%';
  d.style.animationDuration=(introReducedMotion()?(1.8+Math.random()*0.6):(1.05+Math.random()*0.75)).toFixed(2)+'s';
  d.style.animationDelay=(Math.random()*0.12).toFixed(2)+'s';
  const pool=mode==='ended'?END_REPLICA_TEXT:['시청자 등록 완료','입장 대기 중...','내부 세션 유지','화면 안쪽 연결','퇴장 대기열 실패'];
  d.textContent=pool[Math.floor(Math.random()*pool.length)];
  rep.appendChild(d);
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },2200));
}
function startReplicaFlood(mode){
  const fx=$('introFx'), rep=$('introReplicas'); if(!fx||!rep) return;
  fx.classList.add('on'); rep.classList.add('show');
  if(storyFx.replicaInt){ clearInterval(storyFx.replicaInt); storyFx.replicaInt=null; }
  const wait=mode==='ended'?(introReducedMotion()?320:145):(introReducedMotion()?540:320);
  storyFx.replicaInt=setInterval(()=>spawnReplicaText(mode),wait);
  const burst=mode==='ended'?(introReducedMotion()?8:18):(introReducedMotion()?3:6);
  for(let i=0;i<burst;i++) storyFx.timers.push(setTimeout(()=>spawnReplicaText(mode),i*55));
}
function spawnChatPopup(mode){
  const pop=$('introPopups'); if(!pop) return;
  const d=document.createElement('div');
  d.className='chatpop '+(mode==='normal'?'':(mode==='log'?'log':'command'));
  d.style.left=(8+Math.random()*72)+'%'; d.style.top=(12+Math.random()*68)+'%';
  const pool=mode==='normal'?NORMAL_CHAT:(mode==='log'?BATTLE_LOGS:ODD_CHAT);
  d.textContent=pool[Math.floor(Math.random()*pool.length)];
  pop.appendChild(d);
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },mode==='normal'?1300:1050));
}
function spawnProfileStreak(){
  const pop=$('introPopups'); if(!pop) return;
  const d=document.createElement('div'); d.className='pstreak';
  d.style.top=(28+Math.random()*44)+'%';
  d.style.animationDuration=(introReducedMotion()?(1.0+Math.random()*0.35):(0.8+Math.random()*0.5)).toFixed(2)+'s';
  d.setAttribute('data-face',VIEWER_FACE_TAGS[Math.floor(Math.random()*VIEWER_FACE_TAGS.length)]);
  const tag=document.createElement('span'); tag.className='pban';
  tag.textContent=pick(CHATTERS)+' · '+VIEWER_CARD_TAGS[Math.floor(Math.random()*VIEWER_CARD_TAGS.length)];
  d.appendChild(tag); pop.appendChild(d);
  try{ if(typeof sfx!=='undefined'&&sfx.hurt) sfx.hurt(); }catch(e){}
  screenShake=Math.max(screenShake,introReducedMotion()?4:10);
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },1100));
}
function spawnErrorPopup(){
  const pop=$('introPopups'); if(!pop) return;
  const d=document.createElement('div'); d.className='errpop';
  d.style.left=(8+Math.random()*78)+'%'; d.style.top=(12+Math.random()*72)+'%';
  d.innerHTML='<b>방송 알림</b> '+introEsc(PLATFORM_NOTICES[Math.floor(Math.random()*PLATFORM_NOTICES.length)]);
  pop.appendChild(d);
  try{ beep(rand(120,260),0.04,'square',introReducedMotion()?0.02:0.04); }catch(e){}
  storyFx.timers.push(setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },1600));
}
function startErrorPopups(){ const fx=$('introFx'); if(fx)fx.classList.add('on'); if(storyFx.popupInt) return; storyFx.popupInt=setInterval(spawnErrorPopup,introReducedMotion()?620:360); spawnErrorPopup(); }
function startProfileStreaks(){ const fx=$('introFx'); if(fx)fx.classList.add('on'); if(storyFx.streakInt) return; storyFx.streakInt=setInterval(spawnProfileStreak,introReducedMotion()?520:300); spawnProfileStreak(); }
function storyPhase(beat){
  const phase=typeof beat==='object'?beat.phase:beat;
  const app=$('app');
  const bc=$('ovStoryBcast');
  if(phase===0||phase===1){
    stopIntroSystemHints();
    introBgmMul=1;
    if(app) app.classList.remove('app-edge');
    if(bc){ bc.classList.remove('glitch','crash'); bc.classList.add('show'); }
    startIntroChat('normal');
  } else if(phase===2){
    if(app) app.classList.remove('app-edge');
    if(bc) bc.classList.remove('glitch','crash');
    startIntroChat('normal');
    startIntroSystemHints();
    screenShake=Math.max(screenShake,introReducedMotion()?0:1.2);
  } else if(phase===3){
    if(app) app.classList.add('app-edge');
    if(bc) bc.classList.add('glitch');
    startIntroChat('late');
    startIntroSystemHints();
    ['종료하지 마','나가','지금 누르면 안돼','나가'].forEach((txt,i)=>{
      storyFx.timers.push(setTimeout(()=>pushIntroChat('late',txt),i*3200));
    });
    screenShake=Math.max(screenShake,introReducedMotion()?1:3);
  } else if(phase===4){
    startProfileStreaks();
    if(bc){ bc.classList.remove('glitch'); bc.classList.add('crash'); }
    startErrorPopups();
    startReplicaFlood('intrusion');
    startIntroChat('late');
    screenShake=Math.max(screenShake,introReducedMotion()?3:8);
  } else if(phase===5){
    startProfileStreaks();
    startErrorPopups();
    startReplicaFlood('intrusion');
    startIntroChat('late');
    if(app) app.classList.add('app-edge');
  }
}
function ensureIntroDeck(){
  const st=$('storyText'); if(!st||!st.parentNode) return null;
  let deck=$('introDeck');
  if(!deck){
    deck=document.createElement('div');
    deck.id='introDeck';
    deck.className='intro-deck';
    st.parentNode.insertBefore(deck,st);
  }
  return deck;
}
function renderIntroDeck(beat, viewers, compact){
  const deck=ensureIntroDeck(); if(!deck) return;
  const chatPool=beat.phase>=3?BATTLE_LOGS:(beat.phase>=2?NORMAL_CHAT.concat(ODD_CHAT):NORMAL_CHAT);
  const lines=[];
  for(let i=0;i<5;i++){
    const txt=chatPool[(i+beat.phase)%chatPool.length];
    const cls=beat.phase>=3?'log':(beat.phase>=2&&i%2?'weird':'');
    lines.push('<div class="intro-chat-line '+cls+'"><span>'+introEsc(pick(CHATTERS)||'viewer')+'</span> '+introEsc(txt)+'</div>');
  }
  const hud=(beat.hud||[]).map((h,i)=>'<span class="intro-hud-chip '+(beat.phase>=3&&i%2===0?'danger':'')+'">'+introEsc(h)+'</span>').join('');
  deck.className='intro-deck'+(compact?' compact':'');
  deck.innerHTML=
    '<div class="intro-monitor '+(beat.phase>=3?'mutate':'')+'">'+
      '<div class="intro-topbar"><span class="intro-live-pill">'+(beat.phase===0?'READY':'LIVE')+'</span><span class="intro-viewers">'+introEsc(viewers)+'</span></div>'+
      '<div><div class="intro-screen-title">'+introEsc(beat.title)+'</div><div class="intro-screen-sub">'+introEsc(beat.sub)+'</div></div>'+
      '<div class="intro-hudrow">'+hud+'</div>'+
    '</div>'+
    '<div class="intro-chat-panel">'+
      '<div class="intro-chat-head"><span>'+introEsc(beat.chatTitle||'채팅창')+'</span><b>'+introEsc(beat.phase>=3?'등록 중':'연결됨')+'</b></div>'+
      '<div class="intro-chat-list">'+lines.join('')+'</div>'+
    '</div>';
}
function runFakeBroadcastEnd(cb){
  armIntroPlayback();
  clearStoryFx();
  const fx=$('introFx'), blk=$('introBlackout'), rep=$('introReplicas'), eb=$('endBroadcastBtn'), st=$('ebStatus'), bcChat=$('introBroadcastChat');
  const wr=blk?blk.querySelector('.eb-wrap'):null;
  const T=storyFx.timers;
  if(fx) fx.classList.add('on','system-collapse');
  const skipBtn=$('introSkipBtn'); if(skipBtn){ skipBtn.style.display='none'; skipBtn.onclick=null; }
  if(bcChat){ bcChat.classList.remove('unstable'); bcChat.classList.add('collapse-flood'); }
  if(rep){ rep.innerHTML=''; rep.classList.remove('show'); }
  if(eb){ eb.onclick=null; eb.classList.remove('trying','armed'); eb.classList.add('forced'); }
  if(st){ st.classList.remove('show'); st.textContent=''; }
  if(wr) wr.setAttribute('data-ended','');
  if(blk){ blk.classList.remove('awaiting-end','fake-ended','questioning'); blk.classList.add('show'); }
  introBgmMul=0;
  silenceIntroAudio(520);
  T.push(setTimeout(()=>{
    if(wr) wr.setAttribute('data-ended','방송종료됨');
    if(blk){ blk.classList.add('show','fake-ended'); blk.classList.remove('questioning'); }
    try{ playIntroNoise(); }catch(e){}
  },520));
  T.push(setTimeout(()=>panicIntroChatFlood(),540));
  ['방송종료됨?','방송종료됨??','방송종료됨?????'].forEach((txt,i)=>{
    T.push(setTimeout(()=>{ if(wr) wr.setAttribute('data-ended',txt); if(blk) blk.classList.add('questioning'); try{ playIntroNoise(); }catch(e){} },1300+i*430));
  });
  [
    '송출은 종료됐다.',
    '채팅 로그가 닫히지 않았습니다.',
    '내부 세션이 남아 있습니다.',
    '외부 송출 종료 완료',
    '내부 접속자 퇴장 실패',
    '격리 모드 시작'
  ].forEach((txt,i)=>{
    T.push(setTimeout(()=>{ if(wr) wr.setAttribute('data-ended',txt); try{ playIntroNoise(); }catch(e){} },3000+i*420));
  });
  T.push(setTimeout(()=>{
    screenShake=Math.max(screenShake,introReducedMotion()?5:16);
    triggerGlitch(()=>{ introFxReset(); try{ startBGM(); }catch(e){} cb&&cb(); });
  },5850));
}
function runEndBroadcast(cb){
  armIntroPlayback();
  storyFx.timers.forEach(id=>{ clearTimeout(id); clearInterval(id); }); storyFx.timers=[];
  if(storyFx.replicaInt){ clearInterval(storyFx.replicaInt); storyFx.replicaInt=null; }
  if(storyFx.popupInt){ clearInterval(storyFx.popupInt); storyFx.popupInt=null; }
  if(storyFx.streakInt){ clearInterval(storyFx.streakInt); storyFx.streakInt=null; }
  const fx=$('introFx'), blk=$('introBlackout'), pop=$('introPopups'), rep=$('introReplicas'),
        eb=$('endBroadcastBtn'), st=$('ebStatus');
  if(fx) fx.classList.add('on');
  if(pop) pop.innerHTML='';
  if(rep){ rep.innerHTML=''; rep.classList.remove('show'); }
  startIntroChat('late');
  if(blk) blk.classList.add('awaiting-end');
  let finished=false, ending=false;
  const skipBtn=$('introSkipBtn');
  function doSkip(){
    if(finished) return; finished=true;
    if(skipBtn){ skipBtn.style.display='none'; skipBtn.onclick=null; }
    storyFx.timers.forEach(id=>{ clearTimeout(id); clearInterval(id); }); storyFx.timers=[];
    markIntroSeen();
    triggerGlitch(()=>{ introFxReset(); try{ startBGM(); }catch(e){} cb&&cb(); });
  }
  if(skipBtn){ skipBtn.style.display='inline-block'; skipBtn.onclick=doSkip; }
  if(eb){ eb.textContent='방송 종료'; eb.classList.add('armed'); }
  if(st){ st.classList.add('show'); st.textContent='외부 송출 종료 요청 대기'; }
  function clickEndButton(){
    if(finished||ending) return;
    if(eb){ eb.classList.remove('trying'); void eb.offsetWidth; eb.classList.add('trying'); }
    ending=true;
    if(eb) eb.onclick=null;
    runFakeBroadcastEnd(()=>{ finished=true; if(skipBtn){ skipBtn.style.display='none'; skipBtn.onclick=null; } markIntroSeen(); cb&&cb(); });
  }
  if(eb) eb.onclick=clickEndButton;
}

// ===== JS: Story, intro, and title scenes =====
function showStory(cb){
  hideAll(); state='story'; syncChrome();
  armIntroPlayback();
  introFxReset({keepPlaying:true});
  const ov=$('ovStory'); if(!ov){ introFxReset(); cb&&cb(); return; }
  ov.classList.remove('hidden');
  const bcast=$('ovStoryBcast'), plate=$('ovStoryPlate'),
        vEl=$('ovStoryViewers');
  const baseViewers=(typeof viewerCount!=='undefined'?viewerCount:1204);
  function viewerLabel(i,phase){
    const surge=phase>=4?irand(3800,9200):(phase>=3?irand(900,1900):(phase>=2?irand(160,440):irand(18,95)));
    return '시청자 '+(baseViewers+i*surge+surge).toLocaleString()+'명';
  }
  function setViewers(i,phase){
    const label=viewerLabel(i,phase);
    if(vEl) vEl.textContent=label;
    return label;
  }
  if(bcast){ bcast.classList.remove('glitch','crash'); requestAnimationFrame(()=>bcast.classList.add('show')); }
  if(plate) plate.classList.add('show');
  const el=$('storyText'); if(el){ el.textContent=''; el.classList.remove('show','urgent'); }
  const seen=hasSeenIntro();
  const beats=seen?INTRO_REPLAY_BEATS:INTRO_BEATS;
  const btn=$('storySkip');
  const globalSkip=$('introSkipBtn');
  if(globalSkip){ globalSkip.style.display='inline-block'; globalSkip.textContent=seen?'바로 시작 ▶▶':'건너뛰기 ▶▶'; }
  if(btn){ btn.style.display=''; btn.textContent=seen?'바로 시작 ▶▶':'건너뛰기 ▶▶'; }
  let idx=0, proceeded=false, beatT=null;
  function finish(skipAll){
    if(proceeded) return; proceeded=true;
    if(beatT) clearTimeout(beatT);
    if(btn){ btn.style.display='none'; btn.onclick=null; }
    if(globalSkip){ globalSkip.style.display='none'; globalSkip.onclick=null; }
    markIntroSeen();
    ov.classList.add('hidden');
    if(skipAll){
      clearStoryFx();
      triggerGlitch(()=>{ introFxReset(); cb&&cb(); });
      return;
    }
    runEndBroadcast(cb);
  }
  function showBeat(){
    if(proceeded) return;
    if(idx>=beats.length){ finish(false); return; }
    const beat=beats[idx++];
    storyPhase(beat);
    const vLabel=setViewers(idx,beat.phase);
    renderIntroDeck(beat,vLabel,seen);
    if(el){
      el.classList.remove('show','urgent');
      void el.offsetWidth;
      el.textContent=beat.caption;
      if(beat.phase>=3) el.classList.add('urgent');
      el.classList.add('show');
    }
    try{ beep(beat.phase>=3?220:520,0.035,beat.phase>=3?'sawtooth':'square',introReducedMotion()?0.012:0.025); }catch(e){}
    beatT=setTimeout(showBeat,Math.max(520,beat.duration));
  }
  if(btn) btn.onclick=()=>finish(true);
  if(globalSkip) globalSkip.onclick=()=>finish(true);
  showBeat();
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
  const regen=effectiveRegen(p);
  const shots=(p.shots||1)+(p.shadowBarrageT>0?(p.shadowBarrageExtraShots||1):0);
  const atk=totalAttackPower(p);
  const incomingMul=incomingDamageMul(p);
  return [
    ['hp 최대체력', Math.round(p.maxhp), p.maxhp],
    ['attack 공격력', atk.toFixed(1), atk],
    ['crit 치명타', Math.round(clamp((Number(p.critChance)||0)+curseContractCritBonus(p),0,CRIT_CHANCE_CAP)*100)+'%', clamp((Number(p.critChance)||0)+curseContractCritBonus(p),0,CRIT_CHANCE_CAP)],
    ['crit-dmg 치명피해', Math.round(clamp(p.critMult,1,CRIT_MULT_CAP)*100)+'%', clamp(p.critMult,1,CRIT_MULT_CAP)],
    ['fire-rate 초당발사', playerFireRate(p).toFixed(1)+'발', playerFireRate(p)],
    ['shots 투사체', shots+'발', shots],
    ['speed 이동', Math.round(playerMoveSpeed(p)), playerMoveSpeed(p)],
    ['armor '+incomingDamageDisplayLabel(incomingMul), incomingDamageDisplayValue(incomingMul), 1-incomingMul],
    ['regen 재생', fmtSignedNumber(regen)+'/초', regen],
  ];
}
function spTrainingEffects(p){
  const pc=v=>Math.round(v*100)+'%';
  return trainingBuildRows(ensureTrainingState(p||player)).map(({def,count})=>{
    let kind='special', detail=def.desc;
    if(def.id==='hp') kind='hp';
    else if(def.id==='atk') kind='attack';
    else if(def.id==='speed') kind='speed';
    else if(def.id==='focus'){ kind='crit'; detail+=' 최종 상한 '+pc(CRIT_CHANCE_CAP); }
    else if(def.id==='defense') kind='armor';
    return {ic:kind,t:def.name+' '+def.bonusText(count),pn:'훈련',d:detail,k:'training-'+def.id};
  });
}
function spEffects(p){
  const E=[]; const seen=new Set();
  const add=(c,ic,lb,pn,dd,key)=>{
    if(!c) return;
    key=key||pn||lb;
    if(seen.has(key)) return;
    seen.add(key);
    E.push({ic,t:lb,pn,d:dd,k:key});
  };
  const pc=v=>Math.round(v*100)+'%';
  const flat=v=>String(Math.round((Number(v)||0)*10)/10).replace(/\.0$/,'');
  const timeLabel=t=>' ('+Math.max(0,Math.ceil(t||0))+'초)';
  const hasRelic=id=>(p.relics||[]).some(r=>r&&r.id===id);
  const buffs=p.buffs||{};
  const regen=effectiveRegen(p);
  const critChance=clamp((Number(p.critChance)||0)+curseContractCritBonus(p),0,CRIT_CHANCE_CAP);
  const critMult=clamp(p.critMult,1,CRIT_MULT_CAP);
  const moveBase=(Number(p.spd)||BASE_PLAYER_MOVE_SPEED)+curseContractSpeedFlat(p);
  const moveBonus=(playerMoveSpeed(p)/moveBase)-1;
  const fireHandicap=Number(p._fireHandicap)||1;
  const fireBonus=(Number(p.fireAdd)||0)+(Number(p.potionFireAdd)||0)+(buffs.haste>0?DODGE_HASTE_FIRE_ADD:0)+(p.perfectDodgeFireT>0?0.20:0)+(fireHandicap!==1?((1/fireHandicap)-1):0);
  const armorNow=effectiveArmor(p);
  add(p.nonCritDmgMul<1,'🎲','비치명타 피해 '+pc(p.nonCritDmgMul),'도박사의 칼날','치명타 확률/피해 증가 대신 비치명타 피해 감소','noncrit-penalty');
  add(p.redPulseRegen>0,'🩸','붉은 맥박'+(p.redPulseBuff>0?timeLabel(p.redPulseBuff):''),'붉은 맥박','치명타 적중 시 재생 +'+p.redPulseRegen+'/초, 3초 지속, 내부쿨 6초','red-pulse');
  add(p.redPulseBuff>0,'🌿','맥박 재생 +'+p.redPulseRegen+'/초'+timeLabel(p.redPulseBuff),'붉은 맥박','현재 발동 중인 치명타 재생 버프','red-pulse-active');
  add(p.critHeal>0,'💉','치명타 회복 +'+p.critHeal,'치명 흡혈','치명타 적중 시 체력 '+p.critHeal+' 회복','crit-heal');
  add(p.critExplodeMul>0,'🧨','치명타 폭발','작렬탄','치명타 발생 시 작은 폭발','crit-explode');

  add(p.closeProjectileDmgMul>0,'🔱','근거리 투사체 +'+pc(p.closeProjectileDmgMul),'근거리 투사체','가까운 거리 투사체 피해 증가. 보스 대상은 절반','shotgun-mastery');
  add(p.barrageFocus,'🎯','탄막 집중','탄막 집중','같은 발사 묶음 추가 투사체 보정 100/45/30/15, 추가 투사체 치명타 +'+pc(p.extraProjectileCritChance||0),'barrage-focus');
  add(p.pierce>0,'🍢','관통 '+p.pierce,'관통','탄이 적을 뚫고 지나간다','pierce');
  add(p.bounce>0,'🔴','반사 '+p.bounce,'반사','탄이 벽·적에 튕긴다','bounce');
  add(p.homing>0,'👁️','유도탄','유도의 눈','탄이 가까운 적을 추적','homing');
  add(p.backShot,'🔙','쌍방향 사격','쌍방향 사격','앞뒤로 동시에 발사','back-shot');

  add(p.burn>0,'🔥','화염탄 +'+Math.round(p.burn),'화염탄','명중 시 3초간 화상. 찍을 때마다 화상 피해 +4','burn');
  add(p.chill>0,'❄️','빙결탄','빙결탄','명중한 적을 둔화시킨다','freeze');
  add(p.poison>0,'🟢','독침 '+Math.round(p.poison)+'/초','독침','독 피해: 스택당 초당 '+Math.round(p.poison)+'. 최대 독 스택: 6. 최대 중첩 시 초당 피해: '+Math.round(p.poison)+' × 6 = '+Math.round(p.poison*6)+'. 표시 방식: 독 피해는 계속 들어가지만, 화면 숫자는 약 0.35초마다 한 번씩 묶여서 표시됩니다.','poison');
  add(p.statusDotDmgMul>0,'🔥','상태이상 피해 +'+pc(p.statusDotDmgMul),'상태이상 강화','독·화상 초당 피해 증가','status-dot-damage');
  add(p.statusDmgMul>0,'🔥','상태 대상 피해 +'+pc(p.statusDmgMul),'상태 대상 피해','상태이상 적에게 주는 직접 피해 증가','status-damage');
  add(p.statusCritChance>0,'🔥','원소 과부하 +'+pc(p.statusCritChance),'원소 과부하','상태이상 걸린 적에게 치명타 확률 증가. 치명타 상한 적용','elemental-overload');
  add(p.chillCritChance>0,'❄️','냉기 각인 +'+pc(p.chillCritChance),'냉기 각인','둔화된 적에게 치명타 확률 증가. 치명타 상한 적용','frost-mark');
  add(p.poisonDotDmgMul>0,'🟢','맹독 숙성 +'+pc(p.poisonDotDmgMul),'맹독 숙성','독의 초당 피해가 증가합니다. 화상 피해에는 적용되지 않음','venom-mature');
  add(p.corrosiveSpread,'🟢','부식 확산','부식 확산','상태이상 적 처치 시 독/화상 전이 강화. 공격력 -1.5','corrosive-spread');
  add(p.statusSpread,'🌬️','상태 확산','확산','상태이상 적 처치 시 주변 전파','status-spread');
  add(p.chainLightning>0,'⚡','연쇄 번개 '+p.chainLightning,'연쇄 번개','명중 시 근처 적에게 연쇄 번개','chain-lightning');
  add(p.chainKillLightning>0,'⚡','처치 체인 번개','처치 체인 번개','처치 시 가장 가까운 적에게 1회 체인 번개. 처치 연쇄 폭딜은 직접 피해로 제한','kill-chain-lightning');
  add(p.bulletExplode>0,'💢','명중 폭발','명중 폭발','명중 지점에서 폭발','bullet-explode');
  add(p.explodeKill>0,'💣','처치 폭발','처치 폭발','적 처치 시 주변 폭발','explode-kill');

  add(p.dodgeReload,'🌀','구르기 장전'+(p.dodgeReloadT>0?timeLabel(p.dodgeReloadT):''),'구르기 장전','베인Q 후 2초 안의 다음 탄 피해 +40%','dodge-reload');
  add(p.perfectDodge,'💨','완벽 회피'+(p.perfectDodgeFireT>0?timeLabel(p.perfectDodgeFireT):''),'완벽 회피','Q 이후 1초간 피격되지 않으면 3초 동안 발사속도 +20%','perfect-dodge');
  add(p.perfectDodgeArmed,'💨','회피 판정'+timeLabel(p.perfectDodgeCheckT),'완벽 회피','피격되지 않으면 발사속도 버프 발동','perfect-dodge-armed');
  add(p.shadowBarrage,'🌑','그림자 탄막'+(p.shadowBarrageT>0?timeLabel(p.shadowBarrageT):''),'그림자 탄막','Q 후 1초 동안 투사체 +'+(p.shadowBarrageExtraShots||1)+', 내부쿨 6초','shadow-barrage');
  add(p.shadowBarrageCd>0&&p.shadowBarrageT<=0,'🌑','탄막 쿨'+timeLabel(p.shadowBarrageCd),'그림자 탄막','내부쿨 대기 중','shadow-barrage-cd');
  add(p.dodgeMaxCharges>1,'🌀','이중도약','이중 도약','회피를 2회까지 충전','dodge-charges');
  add(p.dodgeBlast>0,'💥','처단','처단','회피 시 피해 '+p.dodgeBlast+' 충격파 발생','dodge-blast');
  add(p.dodgeHaste,'💨','추진력 +50%','추진력','회피 후 2.5초 동안 발사속도 +50%','dodge-haste');
  add(p.dodgeIframeBonus>0,'👻','잔상 +'+p.dodgeIframeBonus.toFixed(1)+'초','잔상','회피 무적 시간 +0.1초. 중복 가능','dodge-iframe');
  add(p.dodgeCdMul<1,'🌀','그림자보법','그림자 보법','회피 쿨다운 감소','dodge-cd');

  add(p.regenOverload,'🌿','재생 과부하','재생 과부하','체력 50% 이하일 때 양수 재생 효과 +50%','regen-overload');
  add(p.lifesteal>0,'🩸','확률 회복 '+pc(p.lifesteal),'확률 회복','적 처치 시 확률로 체력 회복','lifesteal');
  add(p.healOnKill>0,'💚','처치 회복 '+p.healOnKill,'처치 회복','적 처치 시 체력 회복','heal-on-kill');
  add(p.shieldRegen>0,'🔵','재충전 보호막','재충전 보호막','일정 시간마다 보호막 충전','shield-regen');
  add(p.hitShield>0,'🔵','피격 보호막 '+p.hitShield,'보호막 물약','피해를 무효화하는 보호막','hit-shield');
  add(p.overhealShieldRate>0,'🛡️','흡혈 보호막 '+Math.round(p.overhealShield||0)+'/'+Math.round(p.maxhp*(p.overhealShieldCap||0.2)),'흡혈 보호막','초과 회복량을 보호막으로 전환. 자연 재생 효과 -30%. 상한 최대 체력 20%','vamp-shield');
  add(p.deathWard>0,'🪽','불사 '+p.deathWard,'불사 물약','죽을 피해를 무시','death-ward');
  add(p.lastStand,'🩹','막판 정신력','막판 정신력','치명타를 1회 체력 1로 버팀','last-stand');

  add(p.investmentReturn,'💰','투자 수익 '+(gold>=150?'ON':'골드 150 필요'),'투자 수익','골드 150 이상 보유 시 공격력 +'+flat(Number(p.investmentReturnAtkFlat)||4),'investment-return');
  add(p.ominousAdaptation,'☠','불길한 적응 +'+flat(curseRelicStacks(p)*(Number(p.ominousAdaptationAtkFlat)||2)),'불길한 적응','저주 유물 1개당 공격력 +2, 최대 5스택','ominous-adaptation');
  add(p.curseAffinity,'🛡️','저주 친화','저주 친화','저주 유물의 받는 피해 증가 효과 20% 완화','curse-affinity');
  add(p.corruptedContract,'📜','타락한 계약 '+(corruptedContractActive(p)?'ON':'저주 2 필요'),'타락한 계약','저주 유물 2개 이상이면 치명타 +15%, 이동속도 +10','corrupted-contract');
  add(p.doomWorship,'🕯️','파멸 숭배 +'+flat(curseRelicStacks(p)*(Number(p.doomWorshipAtkFlat)||3.2)),'파멸 숭배','저주 유물 1개당 공격력 +3.2, 최대체력 -5%, 최대 5스택','doom-worship');
  add(p.potionAmp>0,'🧪','약효 증폭 +'+pc(p.potionAmp),'약효 증폭','포션 회복량과 버프 효과 증가. 지속시간 제외','potion-amp');
  add(p.alchemySurge,'🔥','연금 폭주','연금 폭주','포션 사용 후 6초간 공격력 +5','alchemy-surge');
  add(p.infiniteRefill,'♾️','무한 리필','무한 리필','방 클리어 시 20% 확률로 랜덤 포션 획득','infinite-refill');
  add(p.goldPowerAtkFlat>0,'💸','골드 공격 보너스','골드 공격 보너스','보유 골드 100당 공격력 +'+flat(Number(p.goldPowerAtkFlat)||0)+'. 최대 +9.6','gold-power');
  add(p.goldMul>1,'🧲','골드 +'+pc(p.goldMul-1),'광부','골드 획득량 증가','goldGain');
  add(p.shopCostMul<1,'🛒','상점가 '+pc(p.shopCostMul-1),'상점 눈썰미','상점 가격 감소','shop-discount');
  add(p.roomEntryHeal>0,'💚','방 입장 회복 +'+p.roomEntryHeal,'전술 재정비','새 방에 들어갈 때 체력 회복','room-entry-heal');
  add(p.noPotionAtkFlat>0,'🏆','금욕의 성배 '+((!p.potions||p.potions.length===0)?'ON':'포션 보유 중'),'금욕의 성배','포션 0개 보유 시 공격력 +'+flat(Number(p.noPotionAtkFlat)||0),'no-potion');
  add(p.xpMul>1,'📈','경험치 +'+pc(p.xpMul-1),'경험치 부스트','경험치 획득량 증가','xpGain');
  add(p.donateChance>0,'💸','도네 '+pc(p.donateChance),'도네 알림','적 처치 시 확률로 골드','donate');
  add(p.greedContract,'💎','탐욕의 계약','탐욕의 계약','골드 획득 +40%, 받는 피해 +10%','greed-contract');
  add(p.shopCostMul>1,'💎','상점가 +'+pc(p.shopCostMul-1),'탐욕의 반지','상점 가격 증가 리스크','shop-risk');
  add(p.recoveryMul<1,'🌑','회복 효과 '+pc(p.recoveryMul),'공허의 심장','회복 효과 감소 리스크','recovery-risk');
  add(p.crowdRageAtkFlat>0,'😡','분노 '+flat(p.crowdRageAtkFlat)+'/마리','분노','주변 적 1마리당 공격력 +0.8, 최대 10마리. 찍을 때마다 +0.8씩 누적','crowd-rage');
  add(p.lowHpAtkFlat>0,'🆘','저체력 폭주','저체력 폭주','체력 30% 이하일 때 공격력 +'+flat(p.lowHpAtkFlat),'low-hp');
  add(p.bossDmgMul>1,'🗡️','거인사냥 +'+pc(p.bossDmgMul-1),'거인 사냥','보스·정예에게 추가 피해','bossDmg');
  add(p.executeInstinctDmgMul>0,'✂️','처형 본능 +'+pc(p.executeInstinctDmgMul),'처형 본능','체력 25% 이하 적에게 피해 증가. 보스 대상은 절반','execute-instinct');
  add(p.execThreshold>0,'✂️','처형 '+pc(p.execThreshold),'처형','체력이 낮은 잡몹 즉시 처치','execute');
  add(p.thorns>0,'🌵','가시 '+p.thorns,'가시 갑옷','피격 시 주변 200px 적에게 현재 가시 피해 '+p.thorns+' 적용','thorn');
  add(p.minion,'🤝','구독자','구독자 소환','소환수는 플레이어 공격력 일부와 치명타 일부를 상속합니다. 보스 피해 보너스는 절반만 상속','minion');

  (p.potionBuffs||[]).forEach(b=>{
    if((b.t||0)<=0) return;
    const key='potion-buff:'+(b.id||[b.atkFlat,b.atkMul,b.fireAdd,b.armor,b.regen].join(':'));
    let label=b.label||'포션 효과';
    if(b.regen) label='재생 '+fmtSignedNumber(b.regen)+'/초';
    add(true,b.icon||'🧪',label+timeLabel(b.t),b.name||'포션 효과',b.desc||'포션으로 생긴 임시 효과',key);
  });
  add(buffs.rage>0,'🔥','분노'+timeLabel(buffs.rage),'분노 물약','일시적 공격력 증가','buff-rage');
  add(buffs.haste>0,'💨','가속'+timeLabel(buffs.haste),'가속','일시적 발사속도 증가','buff-haste');
  add(buffs.shield>0,'✨','무적'+timeLabel(buffs.shield),'보호막','일시적 무적','buff-shield');
  add(p.timeStop>0,'⏱️','시간 정지'+timeLabel(p.timeStop),'시간 정지 물약','모든 적 일시 정지','time-stop');
  return E;
}
function spEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function spIconClass(token,label,pn,key){
  token=String(token||''); label=String(label||''); pn=String(pn||''); key=String(key||'');
  const hay=(token+' '+label+' '+pn+' '+key).toLowerCase();
  if(/^(hp|heart)$/.test(token)||/체력|회복|흡혈|불사|막판|피격/.test(hay)) return 'hp';
  if(/^(attack|atk)$/.test(token)||/공격|피해|대포|칼날|거인|처형|가시|분노|폭주/.test(hay)) return 'attack';
  if(/^(crit)$/.test(token)||/치명|탄막 집중/.test(hay)) return 'crit';
  if(/^(crit-dmg)$/.test(token)||/폭발|작렬|연쇄폭발|치명피해|처단/.test(hay)) return 'crit-dmg';
  if(/^(fire-rate)$/.test(token)||/초당발사|발사속도|가속|완벽 회피|추진력/.test(hay)) return 'fire-rate';
  if(/^(shots)$/.test(token)||/투사체|다중|산탄|관통|반사|유도|쌍방향|탄환|탄막/.test(hay)) return 'shots';
  if(/^(speed)$/.test(token)||/이동|회피|구르기|도약|보법|잔상/.test(hay)) return 'speed';
  if(/^(armor)$/.test(token)||/방어|피해 감소|보호막|무적|리스크|받는 피해/.test(hay)) return 'armor';
  if(/^(regen)$/.test(token)||/재생|자연재생|맥박|과부하/.test(hay)) return 'regen';
  return 'special';
}
function spIconHTML(cls){
  cls=spIconClass(cls);
  return '<span class="stat-icon '+spEsc(cls)+'" aria-hidden="true"></span>';
}
function spKindFromLabel(label){
  const txt=String(label||'');
  const token=(txt.match(/^(\S+)/)||[])[1]||'special';
  return spIconClass(token,txt,'',token);
}
function spLabelHTML(label){
  const txt=String(label||'');
  const m=txt.match(/^(\S+)\s+(.+)$/);
  if(!m) return '<span class="sp-name">'+spEsc(txt)+'</span>';
  return '<span class="sp-ico" aria-hidden="true">'+spIconHTML(m[1])+'</span><span class="sp-name">'+spEsc(m[2])+'</span>';
}
function renderSidePanel(previewPk){
  const p=player;
  const cur=spStats(p);
  let aft=null, aftE=null; const curE=spEffects(p), curT=spTrainingEffects(p);
  if(previewPk){
    try{
      const cl=Object.assign({},p);
      cl.buffs=Object.assign({},p.buffs||{}); cl.potions=(p.potions||[]).slice(); cl.relics=(p.relics||[]).slice();
      previewPk.apply(cl);
      aft=spStats(cl); aftE=spEffects(cl);
    }catch(e){ aft=null; aftE=null; }
  }
  let h='<div class="sp-header"><span class="sp-header-mark" aria-hidden="true">◆</span><span class="sp-header-title">내 능력치</span><span class="sp-header-chip">STAT</span><button class="sp-collapse-btn" type="button" title="접기 [C]" aria-label="능력치 패널 접기">◀</button>'+(aft?'<span class="sp-preview">미리보기</span>':'')+'</div>';
  cur.forEach((r,i)=>{
    const kind=spKindFromLabel(r[0]);
    const statKey=statKeyFromLabel(r[0]);
    let val='<b>'+spEsc(r[1])+'</b>';
    if(aft){
      const dv=aft[i][2]-r[2];
      if(Math.abs(dv)>1e-9) val='<b class="sp-old">'+spEsc(r[1])+'</b> <b class="sp-new">→ '+spEsc(aft[i][1])+'</b>';
    }
    h+='<div class="sp-row sp-kind-'+spEsc(kind)+'" data-stat-key="'+spEsc(statKey)+'" aria-label="'+spEsc(statNameFromLabel(r[0]))+'"><span class="sp-label">'+spLabelHTML(r[0])+'</span><span class="sp-value">'+val+'</span></div>';
  });
  if(curT.length){
    h+='<div class="sp-title sp-subtitle sp-training-title"><span aria-hidden="true">◇</span> 훈련</div>';
    h+='<div class="sp-effects sp-training-effects">';
    curT.forEach(fx=>{ const kind=spIconClass(fx.ic,fx.t,fx.pn,fx.k); const ic='<span class="sp-effect-ico" aria-hidden="true">'+spIconHTML(kind)+'</span>'; h+='<span class="sp-effect sp-kind-'+spEsc(kind)+'" data-training-key="'+spEsc(fx.k||'')+'" aria-label="'+spEsc(fx.t||'훈련')+'">'+ic+'<span class="sp-effect-text">'+spEsc(fx.t)+'</span></span>'; });
    h+='</div>';
  }
  const shownE=(aftE&&aftE.length)?aftE:curE;
  if(shownE.length){
    const curKeys=curE.map(x=>x.t);
    h+='<div class="sp-title sp-subtitle"><span aria-hidden="true">◇</span> 특수 효과</div>';
    h+='<div class="sp-effects">';
    shownE.forEach(fx=>{ const isNew=aftE&&!curKeys.includes(fx.t); const kind=spIconClass(fx.ic,fx.t,fx.pn,fx.k); const ic='<span class="sp-effect-ico" aria-hidden="true">'+spIconHTML(kind)+'</span>'; h+='<span class="sp-effect sp-kind-'+spEsc(kind)+(isNew?' is-new':'')+'" data-effect-key="'+spEsc(fx.k||fx.t||'')+'" aria-label="'+spEsc(fx.t||'특수 효과')+'">'+ic+'<span class="sp-effect-text">'+spEsc(fx.t)+'</span></span>'; });
    h+='</div>';
  }
  if(p.relics&&p.relics.length){
    h+='<div class="sp-title sp-subtitle"><span aria-hidden="true">◇</span> 유물 '+p.relics.length+'</div>';
    h+='<div class="sp-relics">'+p.relics.map(r=>'<span data-relic-id="'+spEsc(r.id||'')+'" aria-label="'+spEsc(r.name||'유물')+'">'+relicIconHTML(r,'relic-pix-sm')+'</span>').join('')+'</div>';
  }
  const el=$('sidePanel'); if(el){ el.innerHTML=h; const btn=el.querySelector('.sp-collapse-btn'); if(btn) btn.onclick=()=>setStatPanelCollapsed(true); }
}
function renderInventoryTrainingSection(){
  const old=$('invTrainingSection');
  if(old) old.remove();
  const rows=trainingBuildRows(ensureTrainingState(player));
  if(!rows.length) return;
  const relics=$('invRelics');
  const before=relics&&relics.previousElementSibling;
  const section=document.createElement('div');
  section.id='invTrainingSection';
  section.innerHTML=
    '<h3 style="margin-top:16px">훈련</h3>'+
    '<div class="invgrid inv-training-grid">'+rows.map(({def,count})=>
      '<div class="statchip training-chip" data-training-key="'+spEsc(def.id)+'"><span class="sk">'+spEsc(def.name)+'</span><span class="sv">'+spEsc(def.bonusText(count))+'</span></div>'
    ).join('')+'</div>';
  if(before&&before.parentNode) before.parentNode.insertBefore(section,before);
}
function renderInventory(){
  const p=player;
  const fr=playerFireRate(p).toFixed(1);
  const pc=v=>Math.round(v*100)+'%';
  const flat=v=>String(Math.round((Number(v)||0)*10)/10).replace(/\.0$/,'');
  const incomingMul=incomingDamageMul(p);
  const stats=[
    ['공격력', totalAttackPower(p).toFixed(1)],
    ['치명타 확률', pc(clamp(p.critChance,0,CRIT_CHANCE_CAP))],
    ['초당 발사', fr+'발'],
    ['투사체', p.shots+'발'],
    ['이동 속도', Math.round(playerMoveSpeed(p))],
    [incomingDamageDisplayLabel(incomingMul), incomingDamageDisplayValue(incomingMul)],
  ];
  // 투자한 항목만 추가 표시
  if(p.critChance>0||p.critMult!==CRIT_BASE_MULT) stats.push(['치명타 피해', 'x'+clamp(p.critMult,1,CRIT_MULT_CAP).toFixed(1)]);
  if(p.barrageFocus) stats.push(['투사체 보정', '100/45/30/15']);
  else if(p.shots>1) stats.push(['투사체 보정', '100/35/20/10']);
  if(p.closeProjectileDmgMul>0) stats.push(['근거리 투사체', '+'+Math.round(p.closeProjectileDmgMul*100)+'%']);
  if(p.executeInstinctDmgMul>0) stats.push(['처형 본능', '+'+Math.round(p.executeInstinctDmgMul*100)+'%']);
  if(p.statusCritChance>0) stats.push(['상태 치명타', '+'+Math.round(p.statusCritChance*100)+'%']);
  if(p.chillCritChance>0) stats.push(['둔화 치명타', '+'+Math.round(p.chillCritChance*100)+'%']);
  if(p.poison>0) stats.push(['독 피해', '스택당 초당 '+Math.round(p.poison)]);
  if(p.poison>0) stats.push(['최대 독 스택', '6']);
  if(p.poison>0) stats.push(['최대 중첩 시 초당 피해', Math.round(p.poison)+' × 6 = '+Math.round(p.poison*6)]);
  if(p.poisonDotDmgMul>0) stats.push(['독 피해 배율', '+'+Math.round(p.poisonDotDmgMul*100)+'%']);
  if(p.statusDotDmgMul>0) stats.push(['독/화상 배율', '+'+Math.round(p.statusDotDmgMul*100)+'%']);
  if(p.statusDmgMul>0) stats.push(['상태 대상 피해', '+'+Math.round(p.statusDmgMul*100)+'%']);
  if(p.dodgeReload) stats.push(['Q 다음 탄', '+40%']);
  if(p.perfectDodge) stats.push(['Q 완벽 회피', '발사 +20%']);
  if(p.shadowBarrage) stats.push(['Q 탄막', '+'+(p.shadowBarrageExtraShots||1)+'발']);
  if(p.investmentReturn) stats.push(['투자 수익', gold>=150?'ON':'150G 필요']);
  if(p.shopCostMul!==1) stats.push(['상점 가격', Math.round((p.shopCostMul-1)*100)+'%']);
  if(p.roomEntryHeal>0) stats.push(['방 입장 회복', '+'+Math.round(p.roomEntryHeal)]);
  if(p.damageTakenMul&&p.damageTakenMul!==1){
    const takenBonus=curseDamageTakenMul(p)-1;
    stats.push(['받는 피해 배율', (takenBonus>=0?'+':'')+Math.round(takenBonus*100)+'%']);
  }
  if(p.potionAmp>0) stats.push(['포션 효과', '+'+Math.round(p.potionAmp*100)+'%']);
  if(p.overhealShieldRate>0) stats.push(['보호막', Math.round(p.overhealShield||0)+' / '+Math.round(p.maxhp*(p.overhealShieldCap||0.2))]);
  if(p.pierce>0) stats.push(['관통', p.pierce]);
  if(p.bounce>0) stats.push(['튕김', p.bounce]);
  { const regen=effectiveRegen(p); if(regen!==0) stats.push(['체력 재생', fmtSignedNumber(regen)+'/초']); }
  if(p.lifesteal>0) stats.push(['확률 회복', pc(p.lifesteal)]);
  if(p.stunChance>0) stats.push(['기절 확률', pc(p.stunChance)]);
  if(p.explodeKill>0) stats.push(['처치 폭발', p.explodeKill]);
  if(p.bossDmgMul!==1) stats.push(['보스 피해', '+'+Math.round((p.bossDmgMul-1)*100)+'%']);
  if(p.lowHpAtkFlat>0) stats.push(['저체력 강화', flat(p.lowHpAtkFlat)]);
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
  renderInventoryTrainingSection();
  $('invRelicCount').textContent='('+p.relics.length+'개)';
  const rc=$('invRelics'); rc.innerHTML='';
  if(p.relics.length===0){ rc.innerHTML='<div style="color:var(--muted);font-size:12px">아직 없음 — 엘리트·보스·상점·제단에서 유물을 얻는다</div>'; }
  p.relics.forEach(r=>{ const t=relicTier(r); const d=document.createElement('div'); d.className='relicrow relic-'+(TIER_OF[r.id]||'rare'); d.dataset.relicId=r.id; d.style.borderColor=t.col; d.innerHTML='<span class="ri">'+relicIconHTML(r,'relic-pix-lg')+'</span><span><b>'+r.name+'</b> <span class="grade" style="color:'+t.col+'">['+t.name+']</span>'+(r.cls==='curse'?' <span style="color:#ff6b6b;font-size:10px">⚠저주</span>':'')+'<br><span class="rd">'+r.desc+'</span></span>'; rc.appendChild(d); });
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
  player.potionBuffs=[]; player.deathWard=0; recalcPotionBuffs(player);
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
function leaderboardMinScoreMessage(){
  return fmtScore(LEADERBOARD_MIN_SCORE)+'점 이상부터 랭킹 등록 가능';
}
function signedScoreText(value){
  const n=Math.round(Number(value)||0);
  return (n>=0?'+':'-')+fmtScore(Math.abs(n));
}
function scoreGuideLine(label,value,penalty){
  return '<div class="score-guide-line'+(penalty?' penalty':'')+'"><span>'+rankBuildText(label)+'</span><b>'+rankBuildText(value)+'</b></div>';
}
function renderEndScoreGuide(scoreData,expanded){
  const toggle=$('scoreGuideToggle');
  const body=$('scoreGuideBody');
  if(!toggle||!body) return;
  const data=scoreData||pendingScoreData||calculateScoreBreakdown({});
  toggle.setAttribute('aria-expanded',expanded?'true':'false');
  toggle.textContent=expanded?'점수 산정 방식 숨기기 ▲':'점수 산정 방식 보기 ▼';
  body.classList.toggle('hidden',!expanded);
  const total=Number(data.totalScore!=null?data.totalScore:data.score)||0;
  body.innerHTML=
    '<div class="score-guide-section">'+
      '<div class="score-guide-title">점수 산정 방식</div>'+
      '<div>진행 점수 = 전역 층수 × 1200</div>'+
      '<div>전역 층수 = (현재 막 - 1) × 15 + 도달층</div>'+
      '<br>'+
      '<div>처치 점수 = 처치 수 × 120</div>'+
      '<div class="score-guide-note">※ 소환물/분열몹은 처치 점수에 포함되지 않음</div>'+
      '<br>'+
      '<div>레벨 점수 = (레벨 - 1) × 1500</div>'+
      '<div>클리어 보너스 = 클리어 시 +30,000</div>'+
      '<div>시간 보너스 = 클리어 시 max(0, (2000초 - 플레이시간) × 10)</div>'+
      '<div class="score-guide-note">※ 2000초 초과 클리어 또는 미클리어 시 0점</div>'+
      '<br>'+
      '<div>피격 패널티 = 피격 횟수 × -200</div>'+
      '<div>재도전 패널티 = 재도전 횟수 × -1500</div>'+
    '</div>'+
    '<div class="score-guide-section">'+
      '<div class="score-guide-title">이번 런 점수 분해</div>'+
      scoreGuideLine('진행 점수',signedScoreText(data.progressScore),false)+
      scoreGuideLine('처치 점수',signedScoreText(data.killScore),false)+
      scoreGuideLine('레벨 점수',signedScoreText(data.levelScore),false)+
      scoreGuideLine('클리어 보너스',signedScoreText(data.clearBonus),false)+
      scoreGuideLine('시간 보너스',signedScoreText(data.timeBonus),false)+
      scoreGuideLine('피격 패널티',signedScoreText(-Math.abs(Number(data.hitPenalty)||0)),true)+
      scoreGuideLine('재도전 패널티',signedScoreText(-Math.abs(Number(data.retryPenalty)||0)),true)+
      '<div class="score-guide-line total"><span>총점</span><b>'+rankBuildText(fmtScore(total))+'</b></div>'+
    '</div>';
}
function toggleEndScoreGuide(){
  const body=$('scoreGuideBody');
  const expanded=!(body&&body.classList.contains('hidden'));
  renderEndScoreGuide(pendingScoreData,!expanded);
}
function refreshEndRankEligibility(){
  const submit=$('endRankSubmit');
  const saveEl=$('endScoreSave');
  const score=Math.round(Number(pendingScoreData&&pendingScoreData.score)||0);
  const eligible=score>=LEADERBOARD_MIN_SCORE;
  if(!submit) return eligible;
  if(!eligible){
    submit.disabled=true;
    submit.textContent='등록 불가';
    if(saveEl) saveEl.textContent=leaderboardMinScoreMessage();
  }else{
    submit.disabled=false;
    submit.textContent='랭킹 등록';
    if(saveEl) saveEl.textContent='ranking standby';
  }
  return eligible;
}
function resetEndRankForm(){
  pendingScoreSaved=false;
  const input=$('endRankName');
  if(input) input.value=getLeaderboardName();
  refreshEndRankEligibility();
}
function renderEndGoldSummary(){
  const s=getRunGoldStatsSnapshot();
  const sp=s.shopPurchases||{};
  const row=(label,value,cls)=>'<div class="end-gold-row '+(cls||'')+'"><span>'+rankBuildText(label)+'</span><b>'+rankBuildText(value)+'</b></div>';
  return '<div class="end-gold-summary">'+
    '<div class="end-gold-title">골드 요약</div>'+
    '<div class="end-gold-totals">'+
      row('총 획득 골드',goldStatValue(s,'earnedTotal')+'G','gain')+
      row('총 사용 골드',goldStatValue(s,'spentTotal')+'G','spent')+
      row('남은 골드',Math.max(0,Math.round(Number(gold)||0))+'G','left')+
    '</div>'+
    '<div class="end-gold-grid">'+
      row('처치 골드',goldStatValue(s,'earnedFromKills')+'G')+
      row('방 보상',goldStatValue(s,'earnedFromRoomRewards')+'G')+
      row('미지 이벤트',goldStatValue(s,'earnedFromEvents')+'G')+
      row('기타 획득',goldStatValue(s,'earnedFromOther')+'G')+
      row('유물 구매',goldStatValue(s,'spentRelics')+'G / '+shopPurchaseValue(s,'relics')+'회')+
      row('포션 구매',goldStatValue(s,'spentPotions')+'G / '+shopPurchaseValue(s,'potions')+'회')+
      row('훈련',goldStatValue(s,'spentTraining')+'G / '+shopPurchaseValue(s,'training')+'회')+
      row('수상한 상자',goldStatValue(s,'spentMysteryBox')+'G / '+shopPurchaseValue(s,'mysteryBoxes')+'회')+
      row('특수상품',goldStatValue(s,'spentSpecial')+'G / '+shopPurchaseValue(s,'special')+'회')+
      row('기타 소비',goldStatValue(s,'spentOther')+'G')+
    '</div>'+
  '</div>';
}
async function submitEndRankScore(){
  const submit=$('endRankSubmit');
  const input=$('endRankName');
  const saveEl=$('endScoreSave');
  if(pendingScoreSaved){
    if(submit) submit.disabled=true;
    return;
  }
  if(!pendingScoreData){
    if(saveEl) saveEl.textContent='ranking save failed';
    return;
  }
  const name=cleanLeaderboardName(input?input.value:'');
  if(input) input.value=name;
  try{ localStorage.setItem('btvLeaderboardName', name); }catch(e){}
  if(submit){
    submit.disabled=true;
    submit.textContent='등록 중...';
  }
  if(saveEl) saveEl.textContent='ranking save...';
  const saved=await saveRunScore(pendingScoreWin,pendingScoreKiller,pendingScoreData,name);
  if(saved){
    pendingScoreSaved=true;
    if(submit){
      submit.disabled=true;
      submit.textContent='등록 완료';
    }
    if(saveEl) saveEl.textContent='ranking saved';
  }else{
    const score=Math.round(Number(pendingScoreData&&pendingScoreData.score)||0);
    if(score<LEADERBOARD_MIN_SCORE){
      if(submit){
        submit.disabled=true;
        submit.textContent='등록 불가';
      }
      if(saveEl) saveEl.textContent=leaderboardMinScoreMessage();
    }else{
      if(submit){
        submit.disabled=false;
        submit.textContent='랭킹 등록';
      }
      if(saveEl) saveEl.textContent='ranking save failed';
    }
  }
}
/* ===== 김봉식 실종안심센터 — 엔딩 크레딧 컨트롤러 (아날로그 호러) ===== */
/* 진짜 클리어(gameOver(true)) 시에만 재생. 도달한 막(1~현재 act)의 전체 몹을 실종자 카드로 표시. */
const EndingCredits=(function(){
  const D=id=>document.getElementById(id);

  // 막별 실종자(처치 몹) 로스터. ENEMY_TYPES 이름 기준, 몽타주는 절차적 생성.
  const ACTS=[
    [ // 1막 · 봉식월드 1구역 고블린 소굴
      {n:'러부엉 (남 · 27세)',d:'2019년 4월 3일',p:'1구역 고블린 소굴',r:'봉식 방송에 과몰입하던 중 실종',t:'mob',f:{hair:'mop',brow:1,eye:'wide',mouth:'flat',skin:0}},
      {n:'대파 (여 · 24세)',d:'2020년 7월 11일',p:'1구역 고블린 소굴',r:'채팅창에 파를 던지다 행방불명',t:'mob',f:{hair:'long',brow:0,eye:'dot',mouth:'thin',skin:1}},
      {n:'까치 (불명)',d:'2018년 3월 30일',p:'1구역 고블린 소굴',r:'반짝이는 도네를 쫓다 사라짐',t:'mob',f:{hair:'spike',brow:1,eye:'glare',mouth:'thin',skin:2}},
      {n:'블페러 (남 · 26세)',d:'2019년 8월 8일',p:'1구역 고블린 소굴',r:'밴딩 직전 스스로 터짐',t:'mob',f:{hair:'buzz',brow:2,eye:'wide',mouth:'open',skin:1}},
      {n:'훈상태 (남 · 33세)',d:'2017년 5월 19일',p:'1구역 외곽',r:'식칼을 던진 뒤 본인도 사라짐',t:'mob',tint:'#e25572',f:{hair:'side',brow:2,eye:'slit',mouth:'frown',skin:2}},
      {n:'재민 (남 · 28세)',d:'2020년 1월 7일',p:'1구역 외곽',r:'부메랑이 돌아오지 않은 채 실종',t:'mob',f:{hair:'mop',brow:0,eye:'dot',mouth:'flat',skin:0}},
      {n:'저격러 (불명)',d:'2021년 2월 14일',p:'1구역 망루',r:'도네 저격 직후 연결이 끊김',t:'mob',f:{hair:'cap',brow:2,eye:'slit',mouth:'flat',skin:0}},
      {n:'방플러 (남 · 29세)',d:'2018년 9월 22일',p:'1구역 시청실',r:'방송 시청 중 움직임이 영구히 멈춤',t:'mob',f:{hair:'side',brow:0,eye:'hollow',mouth:'open',skin:1}},
      {n:'자잘자 (남 · 31세)',d:'2017년 11월 9일',p:'1구역 정거장',r:'로블록스 서버에서 마지막으로 목격됨',t:'elite',tint:'#7a5a3a',f:{hair:'buzz',brow:2,eye:'glare',mouth:'frown',skin:2}},
      {n:'혜철이 (불명)',d:'2016년 6월 6일',p:'1구역 경계 — 둥지',r:'알을 품은 채 둥지에서 사라짐',t:'boss',tint:'#c0392b',f:{hair:'none',brow:2,eye:'many',mouth:'fang',skin:3}},
      {n:'키죠 (불명)',d:'████년 ██월',p:'1구역 정상',r:'가면을 쓴 뒤로 본모습 목격자 없음',t:'boss',tint:'#ff4dd2',redact:1,f:{hair:'spike',brow:2,eye:'void',mouth:'thin',skin:4}},
    ],
    [ // 2막 · 봉식월드 2구역 광천김 소굴
      {n:'광천김 (불명)',d:'2021년 6월 2일',p:'2구역 광천김 소굴',r:'김에 말려 펴지지 않음',t:'mob',tint:'#3f7a34',f:{hair:'none',brow:1,eye:'slit',mouth:'thin',skin:2}},
      {n:'러라 (여 · 25세)',d:'2022년 4월 17일',p:'2구역 광천김 소굴',r:'달려나간 뒤 돌아오지 않음',t:'mob',tint:'#ffd166',f:{hair:'bob',brow:0,eye:'wide',mouth:'smile',skin:0}},
      {n:'나무 (불명)',d:'2019년 10월 1일',p:'2구역 광천김 소굴',r:'뿌리를 내린 자리에서 사라짐',t:'mob',tint:'#5fa84a',f:{hair:'curl',brow:1,eye:'dot',mouth:'flat',skin:3}},
      {n:'케터 (불명)',d:'2021년 12월 9일',p:'2구역 광천김 소굴',r:'음악만 남기고 사라짐',t:'mob',tint:'#7ed957',f:{hair:'side',brow:0,eye:'wide',mouth:'thin',skin:1}},
      {n:'포베어 (불명)',d:'2020년 2월 22일',p:'2구역 광천김 소굴',r:'돌진한 끝을 본 사람이 없음',t:'mob',tint:'#c8884a',f:{hair:'mop',brow:2,eye:'glare',mouth:'open',skin:2}},
      {n:'흑별 (불명)',d:'2020년 12월 24일',p:'2구역 광천김 소굴',r:'별이 검게 물든 뒤 실종',t:'mob',tint:'#9146ff',f:{hair:'spike',brow:1,eye:'void',mouth:'thin',skin:2}},
      {n:'킬조이 (여 · 26세)',d:'2022년 5월 1일',p:'2구역 광천김 소굴',r:'흥을 깬 뒤로 소식이 끊김',t:'mob',tint:'#38e8ff',f:{hair:'bob',brow:0,eye:'wide',mouth:'smile',skin:0}},
      {n:'사과 (불명)',d:'2021년 10월 31일',p:'2구역 광천김 소굴',r:'한 입 베어 문 채 발견 안 됨',t:'mob',tint:'#ff4d6d',f:{hair:'curl',brow:1,eye:'dot',mouth:'open',skin:1}},
      {n:'양갱 / 미주 (불명)',d:'2015년 9월 13일',p:'2구역 — 화원',r:'말랑해지다 형체가 사라짐',t:'elite',tint:'#f7a8d0',f:{hair:'long',brow:0,eye:'void',mouth:'fang',skin:4}},
      {n:'박제인간 (불명)',d:'████년 ██월',p:'2구역 — 전시실',r:'박제된 채 전시되어 있었다는 제보',t:'boss',tint:'#9146ff',redact:1,f:{hair:'none',brow:2,eye:'glitch',mouth:'glitch',skin:4}},
      {n:'승우 (???)',d:'████년 ██월 ██일',p:'화면 너머',r:'게임을 닫은 뒤 화면 밖으로 사라짐',t:'boss',tint:'#9146ff',redact:1,f:{hair:'glitch',brow:2,eye:'glitch',mouth:'glitch',skin:4}},
    ],
    // 3막(마경)은 더미 데이터라 엔딩에서 제외 — 콘텐츠 확정 후 재추가
    ];

  // 절차적 몽타주(픽셀 얼굴). 스프라이트 의존 없이 전 몹 대응 + 호러 톤("사람이었다").
  function drawFace(cv,ent,creep){
    const f=(ent&&ent.f)||{},tint=(ent&&ent.tint)||'#ff4dd2';
    let h=2166136261;const sd=((ent&&ent.n)||'')+(f.hair||'')+(f.eye||'')+(f.mouth||'')+(f.skin||0);
    for(let i=0;i<sd.length;i++){h^=sd.charCodeAt(i);h=Math.imul(h,16777619);}
    let rs=h>>>0;const R=()=>{rs=(rs+0x6D2B79F5)|0;let t=Math.imul(rs^(rs>>>15),1|rs);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
    const rr=(a,b)=>a+(b-a)*R();
    const x=cv.getContext('2d',{willReadFrequently:true}),W=cv.width;
    const E=(a,b,rx,ry,rot,col)=>{x.fillStyle=col;x.beginPath();x.ellipse(a,b,rx,ry,rot||0,0,Math.PI*2);x.fill();};
    x.save();x.imageSmoothingEnabled=true;
    x.fillStyle='#dcd7ca';x.fillRect(0,0,W,W);
    const cx=W*(0.5+rr(-0.015,0.015)),fy=W*(0.53+rr(-0.02,0.03));
    const fw=W*(0.255+rr(0,0.07)),fh=W*(0.32+rr(0,0.1)),dark='#0c0a08';
    const asym=rr(-1,1),tilt=rr(-0.05,0.05),hair=f.hair;
    x.save();x.translate(cx,fy);x.rotate(tilt);x.translate(-cx,-fy);
    // 뒤 머리
    if(hair==='long'||hair==='bob'||hair==='curl'){
      E(cx,fy-W*0.02,fw*(1.26+rr(0,0.14)),fh*1.18,0,dark);
      if(hair!=='bob'){const ll=rr(0.6,1.05);E(cx-fw*0.95,fy+fh*0.5,fw*0.52,fh*ll,0,dark);E(cx+fw*0.95,fy+fh*0.5,fw*0.52,fh*ll,0,dark);}
    } else if(hair==='none'){ E(cx,fy-fh*0.5,fw*1.0,fh*0.42,0,'#2a2622'); }
    else { E(cx,fy-fh*(0.28+rr(0,0.14)),fw*(1.12+rr(0,0.14)),fh*0.78,0,dark); }
    // 얼굴
    E(cx,fy,fw,fh,0,'#ece7dc');
    // 음영(측면+볼)
    x.save();x.beginPath();x.ellipse(cx,fy,fw,fh,0,0,7);x.clip();
    const dir=asym>0?1:-1,g=x.createLinearGradient(cx-dir*fw,0,cx+dir*fw,0);
    g.addColorStop(0,'rgba(16,12,10,0)');g.addColorStop(1,'rgba(16,12,10,'+rr(0.2,0.4)+')');
    x.fillStyle=g;x.fillRect(cx-fw,0,fw*2,W);
    x.fillStyle='rgba(20,15,12,0.16)';
    x.beginPath();x.ellipse(cx-fw*0.55,fy+fh*0.22,fw*0.3,fh*0.32,0,0,7);x.fill();
    x.beginPath();x.ellipse(cx+fw*0.55,fy+fh*0.22,fw*0.3,fh*0.32,0,0,7);x.fill();
    x.restore();
    // 앞머리
    if(hair!=='none'&&hair!=='buzz'){
      const part=rr(-0.45,0.45);x.fillStyle=dark;x.beginPath();
      x.moveTo(cx-fw*0.99,fy-fh*0.46);
      x.quadraticCurveTo(cx+part*fw,fy-fh*(0.88+rr(0,0.14)),cx+fw*0.99,fy-fh*0.46);
      x.quadraticCurveTo(cx+fw*0.4,fy-fh*0.15,cx+part*fw+fw*0.12,fy-fh*0.4);
      x.quadraticCurveTo(cx+part*fw,fy-fh*0.08,cx+part*fw-fw*0.12,fy-fh*0.4);
      x.quadraticCurveTo(cx-fw*0.4,fy-fh*0.15,cx-fw*0.99,fy-fh*0.46);x.fill();
    }
    // 눈썹(불균형)
    const ey=fy-fh*(0.02+rr(-0.02,0.03)),eo=fw*(0.4+rr(0,0.1)),ew=fw*(0.3+rr(0,0.1)),eh=fh*(0.1+rr(0,0.05));
    const eyL=ey+asym*eh*0.5,eyR=ey-asym*eh*0.5;
    x.strokeStyle='#15110d';x.lineCap='round';
    x.lineWidth=W*(0.015+rr(0,0.012));x.beginPath();x.moveTo(cx-eo-ew*0.6,eyL-eh*1.5);x.quadraticCurveTo(cx-eo,eyL-eh*(1.9+rr(0,0.6)),cx-eo+ew*0.6,eyL-eh*1.4);x.stroke();
    x.lineWidth=W*(0.015+rr(0,0.012));x.beginPath();x.moveTo(cx+eo-ew*0.6,eyR-eh*1.4);x.quadraticCurveTo(cx+eo,eyR-eh*(1.9+rr(0,0.6)),cx+eo+ew*0.6,eyR-eh*1.5);x.stroke();
    // 눈
    const drawEye=(ox,eyy,scl)=>{
      const big=(creep?1.45:1.0)*scl;
      E(cx+ox,eyy,ew*0.5*big,eh*1.05*big,0,'#f5f2ea');
      x.fillStyle='rgba(0,0,0,0.3)';x.beginPath();x.ellipse(cx+ox,eyy-eh*0.45,ew*0.5*big,eh*0.6*big,0,Math.PI,0);x.fill();
      E(cx+ox,eyy+eh*0.06,ew*0.3*big,eh*0.72*big,0,creep?'#000':'#14100d');
      if(!creep&&R()<0.65)E(cx+ox-ew*0.07,eyy-eh*0.1,ew*0.08,eh*0.18,0,'#fff');
      x.fillStyle='rgba(40,12,10,'+(creep?0.45:0.2)+')';x.beginPath();x.ellipse(cx+ox,eyy+eh*1.0,ew*0.5,eh*0.5,0,0,7);x.fill();
    };
    drawEye(-eo,eyL,1+rr(-0.1,0.1));drawEye(eo,eyR,1+rr(-0.1,0.1));
    // 코
    const ny=fy+fh*(0.3+rr(0,0.08));
    x.strokeStyle='rgba(18,14,12,0.5)';x.lineWidth=W*0.012;x.lineCap='round';
    x.beginPath();x.moveTo(cx-W*0.006,ey+eh*1.2);x.lineTo(cx-W*0.025*(1+asym*0.4),ny);x.quadraticCurveTo(cx,ny+fh*0.06,cx+W*0.03,ny);x.stroke();
    x.fillStyle='rgba(0,0,0,0.4)';E(cx-W*0.038,ny+fh*0.01,W*0.014,W*0.01,0);E(cx+W*0.034,ny+fh*0.01,W*0.014,W*0.01,0);
    // 입
    const my=fy+fh*(0.6+rr(0,0.06)),mw=fw*(0.52+rr(0,0.16)),mouth=f.mouth;x.lineCap='round';
    if(creep){
      x.fillStyle='#160f0d';x.beginPath();x.moveTo(cx-mw,my);x.quadraticCurveTo(cx,my+fh*0.5,cx+mw,my);x.quadraticCurveTo(cx,my+fh*0.14,cx-mw,my);x.fill();
      x.fillStyle='#efe9dd';x.fillRect(cx-mw*0.7,my+fh*0.04,mw*1.4,fh*0.05);
    } else if(mouth==='frown'){
      x.strokeStyle='#1a1411';x.lineWidth=W*0.02;x.beginPath();x.moveTo(cx-mw,my+fh*0.12);x.quadraticCurveTo(cx,my-fh*0.06,cx+mw,my+fh*0.12);x.stroke();
    } else if(mouth==='open'||mouth==='fang'){
      x.fillStyle='#160f0d';x.beginPath();x.ellipse(cx,my+fh*0.04,mw*0.64,fh*0.16,0,0,7);x.fill();
      if(mouth==='fang'){x.fillStyle='#efe9dd';x.fillRect(cx-mw*0.5,my-fh*0.04,W*0.02,fh*0.11);x.fillRect(cx+mw*0.42,my-fh*0.04,W*0.02,fh*0.11);}
    } else if(mouth==='glitch'){
      for(let i=0;i<5;i++){x.fillStyle=i%2?'#1a1411':'#7a0c14';x.fillRect(cx-mw+i*(mw*0.42),my+((i*7)%10)-5,mw*0.38,fh*0.1);}
    } else {
      x.fillStyle='rgba(60,25,25,0.5)';x.beginPath();x.ellipse(cx,my+fh*0.04,mw*0.7,fh*0.1,0,0,7);x.fill();
      x.strokeStyle='#1a1411';x.lineWidth=W*0.018;x.beginPath();x.moveTo(cx-mw,my);x.quadraticCurveTo(cx,my+(mouth==='smile'?fh*0.2:(mouth==='thin'?fh*0.05:fh*0.12)),cx+mw,my);x.stroke();
    }
    // 수염/스터블
    if(hair!=='long'&&hair!=='bob'&&hair!=='glitch'&&mouth!=='smile'&&R()<0.5){
      x.save();x.beginPath();x.ellipse(cx,fy,fw,fh,0,0,7);x.clip();x.fillStyle='rgba(14,11,9,0.5)';
      const sn=70+((R()*70)|0);
      for(let i=0;i<sn;i++){const ang=R()*Math.PI*2,rad=R(),pxx=cx+Math.cos(ang)*fw*0.72*rad,pyy=my+fh*0.16+Math.abs(Math.sin(ang))*fh*0.5*rad;if(pyy>my-fh*0.04)x.fillRect(pxx,pyy,W*0.012,W*0.012);}
      if(R()<0.6){x.fillStyle='rgba(12,10,8,0.65)';x.beginPath();x.ellipse(cx,my-fh*0.12,mw*0.7,fh*0.07,0,0,7);x.fill();}
      x.restore();
    }
    x.restore();
    if(hair==='glitch'){for(let i=0;i<12;i++){x.fillStyle=i%2?tint:dark;x.fillRect((R()*W)|0,(R()*W*0.5)|0,W*0.12,W*0.045);}}
    // 하프톤 디더 + 잡티 (복사기 질감)
    const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    const img=x.getImageData(0,0,W,W),d=img.data;
    for(let yy=0;yy<W;yy++){for(let xx=0;xx<W;xx++){
      const i=(yy*W+xx)*4;let l=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114;
      l=(l-128)*1.55+130;l+=(R()-0.5)*24;
      let v;if(l<56)v=0;else if(l>200)v=255;else{const t=(bayer[(yy&3)*4+(xx&3)]+0.5)/16*255;v=l>t?255:0;}
      d[i]=d[i+1]=d[i+2]=v;
    }}
    const spk=(W*0.5)|0;for(let k=0;k<spk;k++){const i=(((R()*W)|0)+((R()*W)|0)*W)*4;const c=R()<0.5?0:255;d[i]=d[i+1]=d[i+2]=c;}
    x.putImageData(img,0,0);
    x.restore();
  }

  let timers=[],intervals=[],running=false,onDoneCb=null,idx=0,SEQ=[];
  let playerEnt=null,act1Len=0;
  function pushT(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id;}
  function clearTimers(){timers.forEach(clearTimeout);timers=[];}
  function resetFx(){
    const c=D('ecContent');if(c){c.style.filter='none';c.style.transform='';}
    const dz=D('ecDisp');if(dz)dz.setAttribute('scale',0);
    const oR=D('ecOffR');if(oR)oR.setAttribute('dx',0);
    const oB=D('ecOffB');if(oB)oB.setAttribute('dx',0);
    ['ecTrack','ecStatic','ecInvert'].forEach(id=>{const e=D(id);if(e)e.style.opacity=0;});
  }
  function flash(el,op,ms){if(!el)return;el.style.opacity=op;setTimeout(()=>{if(el)el.style.opacity=0;},ms);}
  function glitch(power){
    power=power||1;const dur=120+power*80;
    const c=D('ecContent'),dz=D('ecDisp'),oR=D('ecOffR'),oB=D('ecOffB');
    if(!c)return;
    c.style.filter='url(#ecVhs)';const tr=D('ecTrack');if(tr)tr.style.opacity=.5;
    const t0=performance.now();
    (function anim(){
      if(!running){resetFx();return;}
      const k=(performance.now()-t0)/dur;
      if(k>=1){c.style.filter='none';c.style.transform='';if(tr)tr.style.opacity=0;if(dz)dz.setAttribute('scale',0);if(oR)oR.setAttribute('dx',0);if(oB)oB.setAttribute('dx',0);return;}
      const wob=Math.sin(k*Math.PI);
      if(dz)dz.setAttribute('scale',((6+power*16)*wob).toFixed(1));
      if(oR)oR.setAttribute('dx',((Math.random()*2-1)*(2+power*5)).toFixed(1));
      if(oB)oB.setAttribute('dx',((Math.random()*2-1)*(2+power*5)).toFixed(1));
      c.style.transform='translateY('+((Math.random()*2-1)*power*3).toFixed(1)+'px)';
      requestAnimationFrame(anim);
    })();
    if(Math.random()<.22*power)flash(D('ecStatic'),.7,60);
    if(Math.random()<.16*power)flash(D('ecInvert'),.85,50);
    pushT(()=>{if(c)c.style.transform='';},dur);
  }
  const SCR='█▓▒░#@%&*?█밤암검흑실종';
  function scramble(el,text,ms){
    if(!el)return;const start=performance.now();
    (function tick(){
      if(!running){el.textContent=text;return;}
      const k=(performance.now()-start)/ms;
      if(k>=1){el.textContent=text;return;}
      let out='';for(const ch of text)out+=(ch===' '||Math.random()<k)?ch:SCR[(Math.random()*SCR.length)|0];
      el.textContent=out;requestAnimationFrame(tick);
    })();
  }
  function ecShow(id){['ecIntro','ecCard','ecFinale','ecCredits','ecBars'].forEach(s=>{const e=D(s);if(e)e.classList.toggle('on',s===id);});}
  function interstitial(cb){
    ecShow('ecBars');
    const sm=D('ecSmpte');
    if(sm)sm.innerHTML=['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0','#101010'].map(c=>'<span style="background:'+c+'"></span>').join('');
    glitch(2);flash(D('ecStatic'),.85,200);
    pushT(cb,260);
  }
  function renderCard(e,creep){
    const nm=D('ecName'),dt=D('ecDate'),pl=D('ecPlace'),rs=D('ecReason'),pt=D('ecPort');
    if(pl)pl.textContent=e.p;
    if(dt)dt.className='ec-val'+(e.redact?' redact':'');
    if(rs)rs.className='ec-val'+(e.redact?' redact':'');
    scramble(nm,e.n,180);scramble(dt,e.d,200);scramble(rs,e.r,260);
    if(pt){drawFace(pt,e,creep);pt.style.borderColor=e.t==='mob'?'#c0392b':(e.tint||'#c0392b');}
  }
  function stinger(){ if(typeof beep!=='function')return; try{ beep(90,0.05,'square',0.05); setTimeout(()=>{try{beep(48,0.09,'sawtooth',0.04);}catch(_){}},40); }catch(_){} }
  const SUBWORDS=['보고 있다','뒤를 봐','너도 명단에 있어','도망칠 수 없어','채널을 끄지 마','거기 누구야','이미 늦었어','너야'];
  function blackout(ms){ const b=D('ecBlack'); if(!b)return; b.classList.add('on'); pushT(()=>{ const b2=D('ecBlack'); if(b2)b2.classList.remove('on'); }, ms||80); }
  function heartbeat(){ if(typeof beep!=='function')return; try{ beep(58,0.10,'sine',0.10); setTimeout(()=>{try{beep(42,0.14,'sine',0.075);}catch(_){}},155); }catch(_){} }
  function subliminal(){ const sb=D('ecSub'); if(!sb)return; sb.textContent=SUBWORDS[(Math.random()*SUBWORDS.length)|0]; sb.style.display='flex'; if(typeof beep==='function'){try{beep(1600,0.025,'square',0.035);}catch(_){}} pushT(()=>{ const s2=D('ecSub'); if(s2)s2.style.display='none'; }, 58); }
  function musicWarp(){
    const tr=(typeof MUSIC==='object'&&MUSIC&&MUSIC.tracks)?MUSIC.tracks.bgm_final_clear:null;
    if(tr){ let r=1; const iv=setInterval(()=>{ if(!running){clearInterval(iv);return;} r-=0.012; if(r<=0.72){r=0.72;clearInterval(iv);} try{tr.playbackRate=r;}catch(_){} },90); intervals.push(iv); }
    if(typeof beep==='function'){try{beep(42,1.4,'sawtooth',0.05);}catch(_){}}
  }
  function buildTicker(){
    const t=D('ecTickerText'); if(!t)return;
    let kills='?',hits='?',tm='';
    try{ if(typeof totalKills==='number')kills=totalKills; }catch(_){}
    try{ if(typeof runHits==='number')hits=runHits; }catch(_){}
    try{ if(typeof runStartedAt==='number'&&typeof fmtTime==='function')tm=fmtTime((performance.now()-runStartedAt)/1000); }catch(_){}
    const parts=['📡 김봉식 실종안심센터 긴급 자막','집계된 실종 시청자 '+SEQ.length+'명','제보 0건','처치 기록 '+kills,'피격 '+hits+'회',(tm?'방송 경과 '+tm:''),'목격하신 분은 가까운 방송국으로','■ 화면을 끄지 마십시오 ■','…당신도 보고 있습니까?'].filter(Boolean);
    const line=parts.join('   \u25C6   ')+'   \u25C6   ';
    t.textContent=line+line;
  }
  function channelBumper(cb){
    ecShow('ecBars');
    const sm=D('ecSmpte'); if(sm)sm.innerHTML=['#0a0a0a','#202020','#0a0a0a','#303030','#0a0a0a','#202020','#0a0a0a','#303030'].map(c=>'<span style="background:'+c+'"></span>').join('');
    const bp=D('ecBumper'); if(bp){bp.style.display='flex';bp.innerHTML='CH 02<br><span>다음 실종자 명단 — 2구역</span>';}
    glitch(2.6); flash(D('ecStatic'),.9,260); stinger();
    pushT(()=>{ const bp2=D('ecBumper'); if(bp2)bp2.style.display='none'; if(running)cb(); },900);
  }
  function creditsHtml(){
    let extra='';
    try{
      const ls=[];
      if(typeof diffSet==='object'&&diffSet&&diffSet.key==='hard')ls.push('HARD 클리어');
      if(typeof runHits==='number'&&runHits===0)ls.push('피격 0회 — 완벽한 방송');
      if(typeof runPotionUsed!=='undefined'&&!runPotionUsed)ls.push('포션 0개 — 맨몸 방송');
      if(typeof retries==='number'&&retries===0)ls.push('재도전 0회');
      if(ls.length)extra='<div class="ec-cr" style="margin-top:5vmin;color:#38e8ff"><b>'+ls.join(' · ')+'</b></div>';
    }catch(_){}
    return '<h2>STAFF</h2>'+
      '<div class="ec-cr"><span class="ec-lab">기획 · 개발</span><br><b>달좋아해요</b></div>'+
      '<div class="ec-cr"><span class="ec-lab">음악</span><br><b>케터</b></div>'+
      '<div class="ec-cr"><span class="ec-lab">베타 테스터</span><br><b>키죠 · 킬조이 · 러라 · 타포</b></div>'+
      '<div class="ec-cr" style="margin-top:6vmin"><span class="ec-lab">집계된 실종 시청자</span><br><b>'+SEQ.length+'명</b></div>'+
      extra+
      '<div class="ec-cr" style="margin-top:8vmin;color:#ff4d6d"><b>화면을 끄지 마십시오.</b></div>'+
      '<div class="ec-cr" style="margin-top:10vmin">시청해 주셔서 감사합니다.</div>';
  }
  function crtOff(cb){
    const tv=D('ecTV'); flash(D('ecInvert'),1,60);
    if(typeof beep==='function'){try{beep(1200,0.05,'square',0.05);}catch(_){}}
    if(tv)tv.classList.add('crtoff');
    pushT(()=>{ if(cb)cb(); },820);
  }
  function step(){
    clearTimers();
    if(idx===0){ecShow('ecIntro');glitch(1.4);pushT(()=>{idx++;step();},4300);return;}
    const ci=idx-1;
    if(ci<SEQ.length){
      const e=SEQ[ci],boss=e.t!=='mob';
      const dur=e.t==='boss'?3300:(e.t==='elite'?2500:2000);
      const lead=Math.min(620,dur*0.42);
      const go=()=>{ecShow('ecCard');renderCard(e,false);glitch(boss?2:1);
        pushT(()=>{ if(!running)return; const pt=D('ecPort'); if(pt)drawFace(pt,e,true); glitch(1.7); flash(D('ecInvert'),.6,45); stinger(); if(Math.random()<.45)blackout(60+Math.random()*70); if(Math.random()<.18)pushT(subliminal,90); },dur-lead);
        pushT(()=>{idx++;step();},dur);};
      const launch=()=> (boss?interstitial(go):go());
      if(ci===act1Len && act1Len>0 && ci<SEQ.length) channelBumper(launch); else launch();
      return;
    }
    if(ci===SEQ.length){ // 플레이어 = 마지막 실종자
      const e=playerEnt;
      // 정적 암전 + 심장박동으로 긴 긴장 빌드업 -> 카드 강타
      blackout(1900); heartbeat();
      pushT(()=>{ if(running)heartbeat(); },720);
      pushT(()=>{ if(running)heartbeat(); },1380);
      pushT(()=>{ if(running&&Math.random()<.6)subliminal(); },1150);
      pushT(()=>{ if(!running)return; ecShow('ecCard'); renderCard(e,false); glitch(2.9); flash(D('ecInvert'),.95,120); stinger(); subliminal(); },1900);
      pushT(()=>{ if(!running)return; const pt=D('ecPort'); if(pt)drawFace(pt,e,true); glitch(2.9); flash(D('ecInvert'),.95,120); stinger(); stinger(); if(running)blackout(90); },4200);
      pushT(()=>{idx++;step();},5400);
      return;
    }
    if(ci===SEQ.length+1){ // 피날레 벽 + 액자별 혈흔 + 비워짐
      ecShow('ecFinale');
      {const fin=D('ecFinale');if(fin)fin.classList.remove('bleed');}
      const w=D('ecWall');if(w){w.innerHTML='';
        SEQ.forEach(e=>{const cell=document.createElement('div');cell.className='ec-cell';
          const c=document.createElement('canvas');c.width=c.height=128;cell.appendChild(c);
          const bd=document.createElement('div');bd.className='ec-cell-blood';
          const dl=Math.random()*2.2, du=2.4+Math.random()*1.6;
          bd.style.setProperty('--dl',dl.toFixed(2)+'s');
          bd.style.setProperty('--dur',du.toFixed(2)+'s');
          c.style.setProperty('--era',(dl+du*0.72).toFixed(2)+'s');
          cell.appendChild(bd);w.appendChild(cell);drawFace(c,e,false);});
        glitch(2);
        pushT(()=>{[...w.querySelectorAll('.ec-cell canvas')].forEach((c,i)=>pushT(()=>{if(running)drawFace(c,SEQ[i],true);},i*30));glitch(2.5);},2400);
      }
      pushT(()=>{ if(!running)return; const fin=D('ecFinale'); if(fin)fin.classList.add('bleed'); glitch(2.2); musicWarp(); heartbeat(); },2900);
      [3700,4900,6100,7400].forEach(t=>pushT(()=>{ if(running)heartbeat(); },t));
      pushT(()=>{ if(running){ blackout(120); subliminal(); } },4500);
      pushT(()=>{idx++;step();},9400);return;
    }
    // 크레딧 -> CRT 전원 꺼짐 -> finish
    ecShow('ecCredits');
    const inner=D('ecRollInner');
    if(inner){ inner.innerHTML=creditsHtml(); inner.style.transition='none';inner.style.top='100%';void inner.offsetWidth; inner.style.transition='top 13s linear';inner.style.top='-120%'; }
    pushT(()=>{ if(!running)return; glitch(1.5); crtOff(()=>finish()); },13500);
  }
  function startTickers(){
    const wk=['일','월','화','수','목','금','토'];
    intervals.push(setInterval(()=>{if(!running)return;const dd=new Date();let h=String(dd.getHours()).padStart(2,'0'),m=String(dd.getSeconds()).padStart(2,'0');if(Math.random()<.15){h='4'+((Math.random()*10)|0);m='4'+((Math.random()*10)|0);}const ts=D('ecTs');if(ts)ts.innerHTML='29 ('+wk[dd.getDay()]+')<br>'+h+':'+m;},1000));
    intervals.push(setInterval(()=>{if(running&&Math.random()<.22)glitch(Math.random()<.3?2:1);},1300));
    intervals.push(setInterval(()=>{if(!running)return;const m=D('ecMth');if(m){m.setAttribute('d','M40 60 q10 -8 20 0');setTimeout(()=>{if(m)m.setAttribute('d','M40 56 q10 10 20 0');},220);}},2600));
    intervals.push(setInterval(()=>{ if(!running)return; const r=Math.random(); if(r<.16)blackout(50+Math.random()*90); else if(r<.23)subliminal(); },1500));
  }
  function stop(){clearTimers();intervals.forEach(clearInterval);intervals=[];running=false;resetFx();const _hud=D('hud');if(_hud)_hud.style.display='';const _bk=D('ecBlack');if(_bk)_bk.classList.remove('on');const _su=D('ecSub');if(_su)_su.style.display='none';const fin=D('ecFinale');if(fin)fin.classList.remove('bleed');const bl=D('ecBlood');if(bl)bl.innerHTML='';const tv=D('ecTV');if(tv)tv.classList.remove('crtoff');const bp=D('ecBumper');if(bp)bp.style.display='none';try{ if(typeof MUSIC==='object'&&MUSIC&&MUSIC.tracks&&MUSIC.tracks.bgm_final_clear)MUSIC.tracks.bgm_final_clear.playbackRate=1; }catch(_){}}
  function finish(){const cb=onDoneCb;onDoneCb=null;stop();const ov=D('ovEnding');if(ov)ov.classList.add('hidden');if(typeof cb==='function')cb();}
  function play(onDone){
    if(!D('ovEnding'))return; // 마크업 없으면 무시
    stop();onDoneCb=onDone||null;
    const reach=Math.max(1,Math.min(ACTS.length,(typeof act==='number'?act:ACTS.length)));
    SEQ=[];for(let a=0;a<reach;a++)for(const e of ACTS[a])SEQ.push(e);
    act1Len=(reach>=1&&ACTS[0])?ACTS[0].length:0;
    let _nm=''; try{ if(typeof getLeaderboardName==='function')_nm=getLeaderboardName(); }catch(_){}
    _nm=String(_nm||'').trim();
    const pn=(_nm && _nm!=='PLAYER') ? (_nm+' (시청자)') : '이름 모를 시청자';
    playerEnt={n:pn,d:'오늘',p:'이 방송 앞',r:'화면을 끝까지 지켜보다 실종',t:'boss',tint:'#ff2d4d',redact:1,player:1,f:{hair:'glitch',brow:2,eye:'glitch',mouth:'glitch',skin:4}};
    buildTicker();
    try{ if(typeof MUSIC==='object'&&MUSIC&&MUSIC.tracks&&MUSIC.tracks.bgm_final_clear)MUSIC.tracks.bgm_final_clear.playbackRate=1; }catch(_){}
    idx=0;running=true;
    D('ovEnding').classList.remove('hidden');
    const _hud=D('hud'); if(_hud)_hud.style.display='none';
    const sk=D('ecSkip');if(sk)sk.onclick=finish;
    startTickers();step();
  }
  return {play:play,stop:stop,finish:finish};
})();

function gameOver(win, killer){
  state='end'; syncChrome();
  // 승리 시에만 인트로로 전환 — 사망 시엔 죽은 막의 음악을 그대로 유지
  if(win){ runActive=false; roomIsBoss=false; roomIsMidboss=false; clearRunCheckpoint(); }
  else clearRunCheckpoint();
  if(win){
    unlockAchievement('clear_game');
    if(diffSet&&diffSet.key==='hard') unlockAchievement('hard_clear');
    if(!runPotionUsed) unlockAchievement('no_potion_clear');
    if(runHits<=5) unlockAchievement('low_hit_clear');
    if((player.relics||[]).filter(r=>r&&r.cls==='curse').length>=3) unlockAchievement('curse_3_clear');
    if(runShopPurchases===0 && runShopSpent===0) unlockAchievement('no_shop_clear');
  }
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
  if(win){ title=act>=3?'3막 클리어!':'CLEAR!'; quip=pick(["재밌었다. 다음 시즌에 보자.","채팅 단체기립 POGGERS","갓겜 인정 GIGACHAD","클립 박제각 Clap","이게 되네?! KEKW"]); }
  else {
    const entry = DEATH_LINES[k];
    if(entry){ title=entry.title; quip=pick(entry.q); }
    else { title='"'+k+'"에게 당했다'; quip=pick(["채팅 폭소 KEKW","아 아까비 Sadge","한 판 더! LULW","발컨 박제 monkaS","멘탈 챙기세요"]); }
  }
  $('endTitle').textContent=title;
  $('endTitle').style.color=win?'#5dff9b':'#ff4d6d';
  const scoreData=calcRunScore(win);
  recordRunResult(scoreData);
  $('endStats').innerHTML=
    "도달: <b>"+act+"막 "+scoreData.reachedFloor+"층</b> · 처치: <b>"+totalKills+"</b> · 레벨: <b>"+level+"</b><br>"+
    "피격: <b>"+runHits+"</b> · 시간: <b>"+fmtTime(scoreData.elapsedSec)+"</b> · 재도전 감점: <b style='color:#ff748b'>-"+fmtScore(scoreData.retryPenalty)+"</b><br>"+
    "골드: <b style='color:#ffd34d'>"+gold+"</b> · 유물: <b>"+player.relics.length+"개</b> · 난이도: <b style='color:"+diffSet.col+"'>"+diffSet.label+"</b>"+
    renderEndGoldSummary();
  const scoreEl=$('endScore'); if(scoreEl) scoreEl.textContent=fmtScore(scoreData.score);
  pendingScoreData=scoreData;
  pendingScoreWin=!!win;
  pendingScoreKiller=k;
  pendingRunBuildSnapshot=createRunBuildSnapshot(scoreData);
  renderEndScoreGuide(scoreData,false);
  resetEndRankForm();
  $('endQuip').textContent='채팅: "'+quip+'"';
  chatSys(win?"🎉🎉 클리어!! 채팅 축제":"☠ 사망 ("+k+") — 채팅: "+pick(["GG","한판더","아깝다 Sadge","리트 ㄱㄱ"]));
  if(win && typeof EndingCredits!=='undefined' && EndingCredits.play){ try{ EndingCredits.play(); }catch(e){ console.warn('ending credits failed',e); } }
}
function victory(){ gameOver(true); }

// ---------- 시작/재시작 ----------
function newGame(){
  clearRunCheckpoint();
  startBGM();
  runActive=true;
  pendingRunBuildSnapshot=null;
  act=1; currentRow=0; kills=0; totalKills=0; gold=0; level=1; xp=0; xpNext=20; pendingLevels=0; retries=0; runHits=0; runShopPurchases=0; runShopSpent=0; runStartedAt=performance.now(); treePoints=0; treeUnlocked=new Set(['hub']);
  resetCombatModState();
  resetRunStats();
  resetPlayer();
  runPotionUsed=false;
  recordPlayStarted();
  unlockAchievement('first_play');
  applyStartBonuses();
  enemies=[];pBullets=[];eBullets=[];pickups=[];particles=[];boss=null;floatBubbles=[];lastKiller=null;
  pendingNode=null; roomCleared=true; tierIntroShown=false; treeIntroShown=false; shopIntroShown=false; eliteViewerSpawns=0;
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
  clearRunCheckpoint();
  startBGM();
  runActive=true;
  act=1; currentRow=0; kills=0; totalKills=0; gold=0; level=1; xp=0; xpNext=20; pendingLevels=0; retries=0; runHits=0; runShopPurchases=0; runShopSpent=0; runStartedAt=performance.now(); treePoints=0; treeUnlocked=new Set(['hub']);
  resetCombatModState();
  resetRunStats();
  resetPlayer();
  runPotionUsed=false;
  recordPlayStarted();
  unlockAchievement('first_play');
  applyStartBonuses();
  enemies=[];pBullets=[];eBullets=[];pickups=[];particles=[];boss=null;floatBubbles=[];lastKiller=null;
  pendingNode=null; roomCleared=true; tierIntroShown=false; treeIntroShown=false; shopIntroShown=false; eliteViewerSpawns=0;
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
    b.onclick=()=>{ try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){} diffSet=d; introFxReset(); stopIntroDrone(); newGame(); };
    cont.appendChild(b);
  });
}
// 스트리머 김봉식 아트 연결
function initStreamerArt(){
  const set=(id,src)=>{ const el=$(id); if(el&&src) el.src=src; };
  set('startAvatar',BONGSIK_AVATAR); set('ovStoryAvatar',BONGSIK_AVATAR); set('ovStoryBcast',BROADCAST_SCREEN);
}
function returnToTitleScreen(){
  introFxReset();
  paused=false; mouseDown=false; autoFire=false; runActive=false;
  clearRunCheckpoint();
  roomIsBoss=false; roomIsMidboss=false; cutsceneT=0; bossEvolve=null;
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; boss=null; floatBubbles=[];
  const po=$('ovPause'); if(po) po.classList.add('hidden');
  hideAll();
  show('title');
  refreshLoadButton();
  if(window.startTitleScene) window.startTitleScene();
  startBGM();
}
function saveAndReturnToTitleScreen(){
  if(state==='map') saveRunCheckpoint();
  else refreshLoadButton();
  introFxReset();
  paused=false; mouseDown=false; autoFire=false; runActive=false;
  roomIsBoss=false; roomIsMidboss=false; cutsceneT=0; bossEvolve=null;
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; boss=null; floatBubbles=[];
  const po=$('ovPause'); if(po) po.classList.add('hidden');
  hideAll();
  show('title');
  refreshLoadButton();
  if(window.startTitleScene) window.startTitleScene();
  startBGM();
}
function wireMainControls(){
  $('retryBtn').onclick=()=>{
    if(diffSet.maxRetries !== Infinity && retries >= diffSet.maxRetries){ banner('재도전 불가','횟수를 모두 소진했습니다',1400); return; }
    retryRoom();
  };
  { const rb=$('endRankSubmit'); if(rb) rb.onclick=submitEndRankScore; }
  { const sgt=$('scoreGuideToggle'); if(sgt) sgt.onclick=toggleEndScoreGuide; }
  $('restartBtn').onclick=()=>{
    introFxReset(); stopBGM(); hideAll();
    try{ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume(); }catch(e){}
    startBGM();
    newGameSkip();
  };
  { const tb=$('titleBtn'); if(tb) tb.onclick=returnToTitleScreen; }
  { const peb=$('pauseExitBtn'); if(peb) peb.onclick=saveAndReturnToTitleScreen; }
  $('muteBtn').onclick=function(){ if(typeof openSettings==='function') openSettings(); };
  // 구 soundPanel 컨트롤 - 패널이 DOM에 존재할 때만 배선 (설정창과 독립적으로 동작)
  { const sc=$('soundClose'); if(sc) sc.onclick=()=>{ const sp=$('soundPanel'); if(sp) sp.style.display='none'; }; }
  { const mc=$('muteChk'); if(mc) mc.onchange=function(){ muted=this.checked; }; }
  { const sr=$('sfxRange'); if(sr) sr.oninput=function(){ sfxVol=this.value/100; if(sfxVol>0&&muted){ muted=false; const mc=$('muteChk'); if(mc) mc.checked=false; } }; }
  { const br=$('bgmRange'); if(br) br.oninput=function(){ bgmVol=this.value/100; }; }
  $('skipTutBtn').onclick=()=>{ if(tutorialMode) finishTutorial(); };
  { const _scb=$('skipCutBtn'); if(_scb) _scb.onclick=skipCutscene; }
  $('tierIntroBtn').onclick=()=>{ showLevelUp(); };
  { const tb=$('treeIntroOpenBtn'); if(tb) tb.onclick=()=>{ hideAll(); state='play'; syncChrome(); openTree(); }; }
  { const tb=$('treeIntroLaterBtn'); if(tb) tb.onclick=()=>{ hideAll(); state='play'; syncChrome(); }; }
  $('helpBtn').onclick=()=>{ prevState=state; show('help'); };
  $('invClose').onclick=closeInventory;
  $('helpClose').onclick=()=>{ $('ovHelp').classList.add('hidden'); if(prevState&&prevState!=='help'){ if(overlays[prevState]&&prevState!=='play')show(prevState); else {hideAll();state=prevState;} } };
}

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
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function closeDifficultyTab(){
  $('ovStart').classList.add('hidden');
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function openRankingTab(){
  hideAll();
  $('ovTitle').classList.remove('hidden');
  $('ovRanking').classList.remove('hidden');
  setRankingDifficulty(diffSet&&diffSet.key?diffSet.key:rankingDifficulty);
  rankingSeason=getCurrentSeason();
  populateSeasonSelector();
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
  renderRankingList();
}
function closeRankingTab(){
  closeRankBuildModal();
  $('ovRanking').classList.add('hidden');
  $('ovTitle').classList.remove('hidden');
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function openAchievementsTab(){
  hideAll();
  $('ovTitle').classList.remove('hidden');
  const ov=$('ovAchievements');
  if(ov){ ov.classList.remove('hidden'); ov.dataset.tab=ov.dataset.tab||'achievements'; }
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
  renderAchievements();
}
function closeAchievementsTab(){
  const ov=$('ovAchievements'); if(ov) ov.classList.add('hidden');
  $('ovTitle').classList.remove('hidden');
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function dbText(v){ return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function dbImg(src,cls){
  return src?'<img class="'+(cls||'db-img')+'" src="'+dbText(src)+'" alt="">':'';
}
function dbImageSrc(img){
  if(!img) return '';
  return (typeof img.getAttribute==='function'&&img.getAttribute('src')) || img.src || '';
}
function dbSpriteSrc(id){
  const map={
    goblin_warrior:OWL_SPRITE,goblin_archer:LEEK_SPRITE,goblin_shaman:MAGPIE_SPRITE,goblin_bomber:TRASH_SPRITE,goblin_shield:SHIELD_SPRITE,
    rhino_beetle:BEETLE_SPRITE,earthworm:WORM_SPRITE,hyechul:SHIELD_SPRITE,zergling:ZERGLING_SPRITE,mutalisk:MUTALISK_SPRITE,ultra:ULTRA_SPRITE,zerg_egg:ZERG_EGG_SPRITE,hoonsangtae:HOONSANGTAE_SPRITE,jaemin:JAEMIN_SPRITE,
    gwangcheon_gim:GIM_SPRITE,reura:REURA_SPRITE,namu:NAMU_SPRITE,pobear:POBEAR_SPRITE,yanggaeng:YANG_SPRITE,
    kijo:KIJO_SPRITE,seungwoo:SW_SPRITE,set3:SET_HYEONJIN_SPRITE,onster:ONSTER_P1_SPRITE,onster_p1:ONSTER_P1_SPRITE,onster_p2:ONSTER_P2_SPRITE,set_hyeonjin:SET_HYEONJIN_SPRITE,set_beongeom:SET_BEONGEOM_SPRITE,set_kekeroro:SET_KEKERORO_SPRITE,killjoy:KILLJOY_SPRITE,apple:APPLE_SPRITE,blackstar:BLACKSTAR_SPRITE,stream_watcher:STREAM_WATCHER_SPRITE,sniper_viewer:SNIPER_VIEWER_SPRITE,ketter:KETTER_SPRITE
  };
  return dbImageSrc(map[id]);
}
function dbColorIcon(color,label){
  return '<span class="db-color-icon" style="--db-col:'+dbText(color||'#9b8fc4')+'">'+dbText(label||'')+'</span>';
}
function dbLockedRow(){
  return {cls:'locked',icon:'<span class="db-lock">?</span>',name:'???',desc:'???',meta:'미발견'};
}
function dbEnemyDesc(d,id){
  const special={
    hoonsangtae:'식칼을 던지는 1막 후반의 강한 시청자.',
    jaemin:'부메랑을 던져 왕복으로 공격하는 1막 후반 몹.',
    sniper_viewer:'조준선 후 강력한 저격을 발사하는 우선 처치 대상.',
    stream_watcher:'플레이어의 움직임을 방해하는 속박형 시청자.',
    ketter:'실탄과 둔화 장판으로 이동을 방해하는 2막 일반몹.',
    blackstar:'중력장과 원형 탄막으로 공간을 압박하는 2막 어려운 적.',
    killjoy:'전기 레이저를 예고 후 발사하는 고기동 원거리 적.',
    apple:'플레이어 위치에 낙과 폭탄을 떨어뜨리는 장판형 적.',
    pobear:'점프 강타와 반동 재돌진을 사용하는 2막 브루저.'
  };
  if(special[id]) return special[id];
  const ai={chase:'추적',shooter:'원거리',orbit:'궤도 사격',charge:'돌진',erratic:'변칙 이동',cleaver_thrower:'식칼 투척',boomerang_thrower:'부메랑',sniper_laser:'저격',movement_lock:'이동 봉쇄',egg:'부화체',hyechul:'중간보스',bagjein:'중간보스',kkotchung:'정예 패턴',summoner:'소환술사',stealth_assassin:'은신 암살',submerge_charge:'잠수 돌진',reflector:'반사막',splitter:'분열',magnet:'자기장',beam_sweep:'회전 빔',blink_lagfield:'블링크 장판'}[d.ai]||d.ai||'일반';
  return '체력 '+d.hp+' · 공격 '+d.dmg+' · 이동 '+d.spd+' · '+ai;
}
function dbEnemyGrade(id){
  if(id==='hyechul'||id==='yanggaeng'||id==='onster') return '중간보스';
  if(DB_EXTRA_ENEMY_IDS.indexOf(id)>=0) return id==='zerg_egg'?'소환체':'소환 적';
  if(ACT_POOLS.some(pool=>(pool.elite||[]).indexOf(id)>=0)) return '정예';
  if(ACT2_LATE_ENEMY_IDS.indexOf(id)>=0) return '어려운 적';
  if(ACT1_LATE_ENEMY_IDS.indexOf(id)>=0) return '강한 적';
  return '일반';
}
const DB_GRADE_ORDER={common:0,rare:1,epic:2,legend:3,mythic:4};
function dbGradeRank(key){
  return DB_GRADE_ORDER[String(key||'rare')] ?? DB_GRADE_ORDER.rare;
}
function dbRelicSort(a,b){
  const ar=dbGradeRank(TIER_OF[a&&a.id]||'rare'), br=dbGradeRank(TIER_OF[b&&b.id]||'rare');
  return ar-br || String(a&&a.name||'').localeCompare(String(b&&b.name||''),'ko');
}
function dbPerkSort(a,b){
  const ar=dbGradeRank(a&&a.g), br=dbGradeRank(b&&b.g);
  return ar-br || String(a&&a.name||'').localeCompare(String(b&&b.name||''),'ko');
}
function databaseRows(){
  const ov=$('ovDatabase');
  const tab=ov?(ov.dataset.tab||'relics'):'relics';
  if(tab==='perks'){
    return LEVEL_PERKS.filter(isLevelPerkCandidate).slice().sort(dbPerkSort).map(pk=>{
      if(!isDiscovered('perks',perkId(pk))) return dbLockedRow();
      const t=PERK_TIERS[pk.g]||{};
      return {
        cls:'perk-'+(pk.g||''),
        icon:PERK_ICONS[pk.name]?dbImg(PERK_ICONS[pk.name],'pk-img'):dbText(pk.icon||''),
        name:pk.name,
        desc:pk.desc,
        meta:'['+(t.name||pk.g||'특성')+']'
      };
    });
  }
  if(tab==='enemies'){
    return DB_ENEMY_IDS.map(id=>{
      const d=ENEMY_TYPES[id];
      if(!isDiscovered('enemies',id)) return dbLockedRow();
      const img=dbSpriteSrc(id);
      return {
        cls:'',
        icon:img?dbImg(img,'db-sprite-img'):dbColorIcon(d.color,(d.name||id).slice(0,1)),
        name:d.name||id,
        desc:dbEnemyDesc(d,id),
        meta:dbEnemyGrade(id)+' · 경험치 '+(d.xp||0)
      };
    });
  }
  if(tab==='bosses'){
    return BOSSES.filter(b=>!DB_HIDDEN_BOSS_KEYS.has(b.key)).map(b=>{
      if(!isDiscovered('bosses',b.key)) return dbLockedRow();
      const img=dbSpriteSrc(b.sprite||b.key);
      return {
        cls:'',
        icon:img?dbImg(img,'db-sprite-img'):dbColorIcon(b.color,(b.name||b.key).slice(0,1)),
        name:b.name,
        desc:b.title||b.quip||'',
        meta:'보스 · 체력 '+b.hp+' · 패턴 '+(b.pattern||'')
      };
    });
  }
  if(tab==='potions'){
    return POTIONS.map(p=>{
      if(!isDiscovered('potions',p.id)) return dbLockedRow();
      return {
        cls:'',
        icon:potionIconHTML(p,'potion-pix-sm'),
        name:p.name,
        desc:p.desc,
        meta:'['+(POTION_RARITIES[p.rarity]?.name||'포션')+']'
      };
    });
  }
  return RELICS.slice().sort(dbRelicSort).map(r=>{
    if(!isDiscovered('relics',r.id)) return dbLockedRow();
    return {
      cls:r.cls||'',
      relicId:r.id,
      icon:relicIconHTML(r,'relic-pix-lg'),
      name:r.name,
      desc:r.desc,
      meta:(r.cls==='curse'?'저주':'축복')+' · '+(relicTier(r).name||'유물')
    };
  });
}
function devUnlockDatabase(){
  dbDiscovered=emptyDbDiscovered();
  DB_ENEMY_IDS.forEach(id=>dbDiscovered.enemies.push(id));
  BOSSES.filter(b=>!DB_HIDDEN_BOSS_KEYS.has(b.key)).forEach(b=>dbDiscovered.bosses.push(b.key));
  RELICS.forEach(r=>dbDiscovered.relics.push(r.id));
  POTIONS.forEach(p=>dbDiscovered.potions.push(p.id));
  LEVEL_PERKS.filter(isLevelPerkCandidate).forEach(pk=>dbDiscovered.perks.push(perkId(pk)));
  saveDbDiscovered();
  renderDatabase();
  return dbDiscovered;
}
function devResetDatabase(){
  dbDiscovered=emptyDbDiscovered();
  saveDbDiscovered();
  renderDatabase();
  return dbDiscovered;
}
function devUnlockAchievements(){
  userProgress=normalizeProgress(userProgress);
  ACHIEVEMENTS.forEach(a=>{
    if(!userProgress.achievements[a.id]) userProgress.achievements[a.id]={at:Date.now(),dev:true};
    applyAchievementReward(a.id);
  });
  userProgress.stats=normalizeProgressStats(userProgress.stats);
  renderAchievements();
  refreshTitleDisplay();
  saveUserProgress(true);
  return {unlocked:Object.keys(userProgress.achievements).length,total:ACHIEVEMENTS.length};
}
function devResetAchievements(){
  const uid=userProgress&&userProgress.uid||null;
  const loaded=!!(userProgress&&userProgress.loaded);
  userProgress={
    uid,
    achievements:{},
    titles:{},
    unlockedRelics:{},
    selectedTitle:'',
    stats:normalizeProgressStats(),
    loaded,
    dirty:true
  };
  achievementToastQueue.length=0;
  achievementToastActiveIds.clear();
  achievementToastShowing=false;
  renderAchievements();
  refreshTitleDisplay();
  saveUserProgress(true);
  return {unlocked:0,total:ACHIEVEMENTS.length};
}
function rebuildAchievementRewardsFromUnlocked(){
  userProgress=normalizeProgress(userProgress);
  userProgress.titles={};
  userProgress.unlockedRelics={};
  Object.keys(userProgress.achievements||{}).forEach(id=>{
    if(achievementById(id)) applyAchievementReward(id);
  });
  if(userProgress.selectedTitle&&!userProgress.titles[userProgress.selectedTitle]) userProgress.selectedTitle='';
}
function devUnlockAchievement(id){
  id=String(id||'').trim();
  if(!achievementById(id)) return {ok:false,error:'unknown achievement id',id,total:ACHIEVEMENTS.length};
  const changed=unlockAchievement(id);
  return {ok:true,id,changed,unlocked:Object.keys(userProgress.achievements||{}).length,total:ACHIEVEMENTS.length};
}
function devLockAchievement(id){
  id=String(id||'').trim();
  if(!achievementById(id)) return {ok:false,error:'unknown achievement id',id,total:ACHIEVEMENTS.length};
  userProgress=normalizeProgress(userProgress);
  const changed=!!userProgress.achievements[id];
  delete userProgress.achievements[id];
  rebuildAchievementRewardsFromUnlocked();
  renderAchievements();
  refreshTitleDisplay();
  saveUserProgress(true);
  return {ok:true,id,changed,unlocked:Object.keys(userProgress.achievements||{}).length,total:ACHIEVEMENTS.length};
}
function devCurrentStartBonus(){
  return computeStartBonusSummary();
}
function devPerkCandidateStats(){
  const active=LEVEL_PERKS.filter(pk=>pk&&!pk.removed);
  const candidates=LEVEL_PERKS.filter(isLevelPerkCandidate);
  const gradeCounts={};
  candidates.forEach(pk=>{ gradeCounts[pk.g]=(gradeCounts[pk.g]||0)+1; });
  const allGrades=new Set(Object.keys(gradeCounts).concat(Object.keys(PERK_COUNTS)));
  const mismatch=[];
  allGrades.forEach(g=>{
    if((gradeCounts[g]||0)!==(PERK_COUNTS[g]||0)) mismatch.push({grade:g,candidates:gradeCounts[g]||0,perkCounts:PERK_COUNTS[g]||0});
  });
  const treeOnlyIds=[...TREE_ONLY_PERK_IDS];
  const byName=name=>LEVEL_PERKS.find(pk=>pk&&pk.name===name);
  const auditNames=['급소 연마','상점 눈썰미','전술 재정비','근접 난사','처형 본능','방송 폭주','부식 표식','맹독 가열','불길한 적응','저주 친화','타락한 계약','파멸 숭배','약효 증폭','연금 폭주','무한 리필'];
  const gradeAuditNames=['정밀 조준','방어 특화','쌍방향 사격'];
  const candidateSet=new Set(candidates.map(pk=>pk.name));
  return {
    levelPerksTotal:LEVEL_PERKS.length,
    notRemoved:active.length,
    levelupCandidateCount:candidates.length,
    gradeCounts,
    perkCounts:Object.assign({},PERK_COUNTS),
    perkCountsMatch:mismatch.length===0,
    mismatch,
    newPerks:auditNames.map(name=>{ const pk=byName(name); return {name,grade:pk&&pk.g||null,inCandidates:candidateSet.has(name)}; }),
    changedGrades:gradeAuditNames.map(name=>{ const pk=byName(name); return {name,grade:pk&&pk.g||null,inCandidates:candidateSet.has(name)}; }),
    treeOnlyIdsInLevelPerks:LEVEL_PERKS.filter(pk=>isTreeOnlyPerkId(perkId(pk))).map(perkId),
    treeOnlyIdsInTree:treeOnlyIds.filter(id=>!!passiveNodeById(id)),
    treeOnlyIdsMissingTreeNode:treeOnlyIds.filter(id=>!passiveNodeById(id))
  };
}
function devResetProgress(){
  const result=devResetAchievements();
  try{ localStorage.removeItem(USER_PROGRESS_LOCAL_KEY); }catch(e){}
  clearRunCheckpoint();
  return Object.assign({cleared:['user progress','run checkpoint'],kept:['settings','database discovery','leaderboard name']},result);
}
function devHelp(){
  const lines=[
    'BTV dev tools',
    'btvDev.help()',
    'btvDev.unlockAllAchievements()',
    'btvDev.resetAchievements()',
    'btvDev.unlockAchievement("kill_100")',
    'btvDev.lockAchievement("kill_100")',
    'btvDev.resetProgress()',
    'btvDev.unlockDatabase()',
    'btvDev.perkCandidateStats()',
    'btvDev.startBonus()',
    'btvDev.count()',
    '테스트 순서: 새 게임 시작 -> 업적 탭 열기 -> 시작 보너스 표시 확인 -> 특정 업적 강제 해금 -> 새 게임에서 보너스 적용 확인 -> 업적 초기화 후 정상 복구 확인'
  ];
  console.log(lines.join('\n'));
  return lines;
}
if(location.hostname==='localhost' || location.hostname==='127.0.0.1' || location.search.includes('debug=1')){
  window.btvDev={
    help:devHelp,
    unlockAllAchievements:devUnlockAchievements,
    resetAchievements:devResetAchievements,
    unlockAchievement:devUnlockAchievement,
    lockAchievement:devLockAchievement,
    resetProgress:devResetProgress,
    unlockDatabase:devUnlockDatabase,
    resetDatabase:devResetDatabase,
    perkCandidateStats:devPerkCandidateStats,
    startBonus:devCurrentStartBonus,
    goldStats:()=>getRunGoldStatsSnapshot(),
    count:()=>ACHIEVEMENTS.length
  };
  window.devUnlockDatabase=devUnlockDatabase;
  window.devResetDatabase=devResetDatabase;
  window.devPerkCandidateStats=devPerkCandidateStats;
  window.devUnlockAchievements=devUnlockAchievements;
  window.devResetAchievements=devResetAchievements;
  window.devUnlockAchievement=devUnlockAchievement;
  window.devLockAchievement=devLockAchievement;
  window.devAchievementCount=()=>ACHIEVEMENTS.length;
}
window.debugGoldStats=function(){
  const stats=getRunGoldStatsSnapshot();
  try{
    console.table({
      earnedTotal:stats.earnedTotal,
      spentTotal:stats.spentTotal,
      earnedFromKills:stats.earnedFromKills,
      earnedFromRoomRewards:stats.earnedFromRoomRewards,
      earnedFromEvents:stats.earnedFromEvents,
      spentTraining:stats.spentTraining,
      spentMysteryBox:stats.spentMysteryBox
    });
    if(debugLastGoldDrop) console.table({lastGoldDrop:debugLastGoldDrop});
  }catch(e){}
  return {stats,lastGoldDrop:debugLastGoldDrop};
};
window.debugLastGoldDrop=debugLastGoldDrop;
window.debugSpawnBoss=function(id){
  if(!runActive){ newGameSkip(); }
  hideAll(); act=3; pendingNode={type:id==='onster'?'midboss':'boss',row:currentRow||0,id:'debug-'+id}; roomCleared=false; roomIsBoss=id!=='onster'; roomIsMidboss=id==='onster'; state='play'; syncChrome();
  if(id==='onster'){ enemies=[]; boss=null; spawnEnemy('onster',W/2,145,1+(act-1)*0.6+MIDBOSS_ROW*0.08); const e=enemies[enemies.length-1]; e.elite=true; e.midboss=true; e.label='온스터'; e.phase=1; }
  else { enemies=[]; boss=spawnBoss(BOSSES.find(b=>b.key==='set3')||BOSSES[ACT_BOSS[2]]); bossBanner=1.2; }
  return id==='onster'?enemies[enemies.length-1]:boss;
};
window.debugStartMidBoss=function(id){ return window.debugSpawnBoss(id||'onster'); };
window.debugStartFinalBoss=function(id){ return window.debugSpawnBoss(id||'set3'); };
window.debugGoAct3Boss=function(){ return window.debugSpawnBoss('set3'); };

window.debugStartAct3Normal=function(){
  hideAll(); act=3; currentRow=Math.max(currentRow||1,2); pendingNode={type:'fight',row:currentRow,id:'debug-act3-normal'}; resetCombatModState(); startCombat('fight'); state='play'; syncChrome(); return enemies;
};
window.debugStartAct3Elite=function(){
  hideAll(); act=3; currentRow=Math.max(currentRow||9,9); pendingNode={type:'elite',row:currentRow,id:'debug-act3-elite'}; resetCombatModState(); startCombat('elite'); state='play'; syncChrome(); return enemies;
};
window.debugStartOnster=function(){ return window.debugSpawnBoss('onster'); };
window.debugStartSet3=function(){ return window.debugSpawnBoss('set3'); };

// 악랄 모드 조절: vicious() 현재값 / vicious(0)끄기 / vicious(1~3)강도 / vicious({move:1.2,...})
window.vicious=function(o){
  if(o==null){ console.log('[vicious]', JSON.stringify(VICIOUS)); return VICIOUS; }
  if(typeof o==='number'){
    if(o<=0){ VICIOUS.on=false; if(typeof banner==='function')banner('악랄 모드 OFF','',900); return VICIOUS; }
    VICIOUS.on=true; const s=o;
    VICIOUS.move=1+0.12*s; VICIOUS.bossMove=1+0.06*s; VICIOUS.bspd=1+0.15*s;
    VICIOUS.spdVar=0.10; VICIOUS.cool=Math.max(0.5,1-0.12*s); VICIOUS.jitter=0.05*s; VICIOUS.doubleShot=Math.min(0.45,0.12*s);
    if(typeof banner==='function')banner('악랄 모드 x'+s,'탄속·이동·연사·랜덤 ↑',1000);
    console.log('[vicious] x'+s, JSON.stringify(VICIOUS)); return VICIOUS;
  }
  Object.assign(VICIOUS,o); VICIOUS.on=true; console.log('[vicious]', JSON.stringify(VICIOUS)); return VICIOUS;
};

// ===== 3막 신규 패턴 테스트 콘솔 =====
// 대상: 현재 보스 > 미드보스 > 화면 중앙 더미
function _a3target(){
  return boss || enemies.find(e=>e&&e.midboss) || {x:W/2,y:150,r:60,label:'테스트',color:'#38e8ff'};
}
window.a3test=function(name){
  const b=_a3target();
  const map={
    bind:     ()=>a3BindRing(b,5,'테스트'),
    poison:   ()=>a3PoisonTrail(b,5,0.45,11,'#9d7bff'),
    brand:    ()=>a3Brand(b,1.6,96,24,'테스트 낙인'),
    cone:     ()=>a3ConeSlam(b,5,18,b.color),
    cross:    ()=>a3CrossAoE(b,Math.max(W,H),60,1.0,18),
    spinbar:  ()=>a3SpinBar(b,240,15,4.0),
    sweep:    ()=>a3SweepBreath(b,Math.random()<0.5?-1:1,18),
    safezone: ()=>a3SafeZone(W/2,H*0.42,165,110,2.4,2.2,60,'테스트 전멸기'),
    core:     ()=>a3Objective(W/2,H*0.34,{hp:200,fuse:6,fail:'aoe',failDmg:40,label:'테스트 코어',color:'#ff4dd2',r:30,owner:b}),
    anchor:   ()=>a3Objective(clamp(player.x+120,60,W-60),player.y,{hp:160,fuse:6,fail:'slow',label:'테스트 닻',color:'#8d72ff',owner:b}),
    buds:     ()=>a3SpawnBuds(b,3,'aoe','테스트 봉오리','#ff7ad2'),
    veil:     ()=>a3Veil(5,'테스트 장막'),
    seq:      ()=>a3Sequence(b,3),
    shadows:  ()=>a3StrikeShadows(b,3,'테스트 은신'),
    stones:   ()=>a3StrikeStones(b,3,'테스트 심판'),
    decoy:    ()=>a3Decoys(b),
    push:     ()=>a3PushRing(b,12),
    vine:     ()=>a3VineSlam(b,'테스트 덩굴'),
  };
  if(!name){ console.log('[a3test] 사용 가능 패턴:', Object.keys(map).join(', ')); return Object.keys(map); }
  const fn=map[name];
  if(!fn){ console.warn('[a3test] 알 수 없는 패턴:', name, '\n사용 가능:', Object.keys(map).join(', ')); return Object.keys(map); }
  if(state!=='play'){ console.warn('[a3test] state가 play가 아님. 먼저 debugStartSet3() / debugStartOnster() / debugGoAct3()'); }
  fn(); banner('🧪 a3test · '+name,'',900); return name;
};
// 무적(체력 자동 회복) — a3god() 켜기 / a3god(false) 끄기
window.a3god=function(on){
  if(on===false){ if(window._a3godInt){ clearInterval(window._a3godInt); window._a3godInt=null; } banner('🧪 god OFF','',700); return false; }
  if(typeof player==='object'&&player){ player.maxhp=Math.max(player.maxhp||100,99999); player.hp=player.maxhp; if(typeof updateHUD==='function') updateHUD(); }
  if(!window._a3godInt) window._a3godInt=setInterval(()=>{ if(typeof player==='object'&&player) player.hp=player.maxhp; },200);
  banner('🧪 god ON','체력 자동 회복',800); return true;
};
// 세트3형제 페이즈 강제 전환 (현진1 / 번검2 / 케케로로3)
window.a3phase=function(p){
  if(!boss||boss.key!=='set3'){ console.warn('[a3phase] 세트3형제가 없음 → debugStartSet3() 먼저'); return null; }
  p=clamp(Math.round(p||1),1,3);
  boss.setPhase=p; boss.maxhp=(boss.phaseHp&&boss.phaseHp[p-1])||boss.maxhp; boss.hp=boss.maxhp;
  boss.color=p===2?'#38e8ff':(p===3?'#ff4dd2':boss.color); boss.r=p===2?68:(p===3?72:boss.r);
  boss.a3N=0; boss.a3T=0.4; boss.patI=0; boss.attackT=0.6; boss.safeUlt=(p!==3);
  banner('🧪 세트3 P'+p+' · '+set3PhaseName(boss),'',1000); return set3PhaseName(boss);
};
// 온스터 소환 (awaken=true 면 각성 페이즈로)
window.a3onster=function(awaken){
  const e=window.debugStartOnster();
  if(awaken&&e&&typeof onsterAwaken==='function'){ setTimeout(()=>{ if(enemies.includes(e)) onsterAwaken(e); }, 300); }
  return e;
};
// 빠른 랩: 무적 + 세트3 소환 + (옵션)페이즈 고정 + (옵션)패턴 발사
window.a3lab=function(phase,pat){
  window.debugStartSet3(); window.a3god();
  setTimeout(()=>{ if(phase) window.a3phase(phase); if(pat) window.a3test(pat); }, 400);
  console.log('[a3lab] 무적+세트3 소환. 예) a3lab(3,"safezone")  / 패턴목록: a3test()');
  return true;
};
window.a3help=function(){
  console.log([
    '── 3막 패턴 테스트 ──',
    'a3lab(phase?,pat?)  : 무적+세트3 소환 (예: a3lab(2,"sweep"))',
    'a3god() / a3god(false): 무적 토글',
    'a3test()            : 패턴 이름 목록',
    'a3test("cone")      : 해당 패턴 즉시 발사',
    'a3phase(1|2|3)      : 세트3 페이즈 고정(현진/번검/케케로로)',
    'a3onster(true?)     : 온스터 소환(true=각성)',
    '패턴: bind poison brand cone cross spinbar sweep safezone core anchor buds veil seq shadows stones decoy push vine',
  ].join('\n'));
  return 'see console';
};
window.debugGiveAct3Build=function(){
  act=3; gold+=650; level=Math.max(level,8); xp=0; xpNext=Math.max(xpNext,120);
  const addIds=['redbull','sniper','crit_glasses','vampire_fang'].map(id=>relicById(id)).filter(Boolean);
  for(const r of addIds){ if(!player.relics.some(o=>o&&o.id===r.id)){ player.relics.push(r); applyRelicToPlayer(r,player); markDiscovered('relics',r.id); } }
  for(let i=0;i<2;i++) addPotion(rollPotion());
  updateHUD(); banner('3막 테스트 빌드','골드/유물/포션 지급',1400); return {act,gold,level,relics:player.relics.map(r=>r.name)};
};
window.debugKillBoss=function(){
  if(boss){ boss.hp=0; handleBossDefeat(boss); return true; }
  const mb=enemies.find(e=>e&&e.midboss); if(mb){ mb.hp=0; killEnemy(mb); return true; }
  return false;
};
window.debugStartAct3Event=function(id){
  hideAll(); act=3; currentRow=currentRow||8; pendingNode={type:'event',row:currentRow,id:'debug-act3-event'}; roomCleared=false; roomIsBoss=false; roomIsMidboss=false;
  const pool=(typeof ACT3_EVENTS!=='undefined'?ACT3_EVENTS:[]);
  const ev=pool.find(e=>e.id===id||e.tag===id)||pick(pool);
  if(!ev){ banner('ACT3 EVENT','no event pool',1200); return null; }
  showEventPanel(ev.tag,ev.title,ev.body,ev.choices);
  return ev.id;
};


window.debugGoAct2Boss=function(){
  if(!runActive){ newGameSkip(); }
  hideAll(); act=2; currentRow=Math.max(currentRow||10,10); pendingNode={type:'boss',row:currentRow,id:'debug-act2-boss'}; roomCleared=false; roomIsBoss=true; roomIsMidboss=false; enemies=[]; boss=null; resetCombatModState(); startCombat('boss'); state='play'; syncChrome(); return boss;
};
window.debugGoAct2Mid=function(){
  if(!runActive){ newGameSkip(); }
  hideAll(); act=2; currentRow=MIDBOSS_ROW; pendingNode={type:'midboss',row:currentRow,id:'debug-act2-mid'}; roomCleared=false; roomIsBoss=false; roomIsMidboss=true; enemies=[]; boss=null; resetCombatModState(); startCombat('midboss'); state='play'; syncChrome(); return enemies.find(e=>e&&e.midboss);
};
window.debugGoAct2Elite=function(){
  if(!runActive){ newGameSkip(); }
  hideAll(); act=2; currentRow=Math.max(currentRow||8,8); pendingNode={type:'elite',row:currentRow,id:'debug-act2-elite'}; roomCleared=false; roomIsBoss=false; roomIsMidboss=false; enemies=[]; boss=null; resetCombatModState(); startCombat('elite'); state='play'; syncChrome(); return enemies.find(e=>e&&e.eliteViewer);
};
window.debugact3=function(){ return window.debugGoAct3(); };
window.debugAct3=function(){ return window.debugGoAct3(); };
window.debugAct3Build=function(){ window.debugGoAct3(); player.maxhp=1000; player.hp=1000; player.dmg=1000; updateHUD(); return {act, hp:player.hp, maxhp:player.maxhp, dmg:player.dmg}; };
window.debugact3build=function(){ return window.debugAct3Build(); };
window.debugSpawnEnemy=function(id){
  if(!runActive){ newGameSkip(); }
  if(state!=='play'){ hideAll(); state='play'; roomCleared=false; syncChrome(); }
  const type=String(id||'act3_domin');
  spawnEnemy(type,clamp(player.x+120,40,W-40),clamp(player.y,90,H-60),1);
  return enemies[enemies.length-1];
};
window.debugGoAct3=function(){
  if(!runActive){ newGameSkip(); }
  hideAll(); act=3; currentRow=0; pendingNode=null; roomCleared=true; roomIsBoss=false; roomIsMidboss=false; boss=null;
  enemies=[]; pBullets=[]; eBullets=[]; pickups=[]; particles=[]; hazards=[]; floatBubbles=[];
  resetCombatModState(); genMap(); state="map"; syncChrome(); showMap(); updateHUD(); saveRunCheckpoint();
  banner("3막 · 심연 속","디버그 진입",1400);
  return {act,currentRow,mapNodes:mapData&&mapData.nodes&&mapData.nodes.length};
};
window.debugEventFixQA=function(){
  return {
    queuedNextCombat:nextCombatMods?clonePlain(nextCombatMods):null,
    combat:{rewardMul:combatRewardMul,xpMul:combatXpMul,challenge:combatChallenge},
    spreadMul:Math.max(0,Number(player&&player._spreadMul)||1),
    statusSpread:!!(player&&player.statusSpread),
    corrosiveSpread:!!(player&&player.corrosiveSpread),
    lastGoldDrop:debugLastGoldDrop,
    queueReward50:()=>queueNextCombatMod({rewardMul:1.5,banner:{big:'QA 보상 테스트',small:'골드 보상 +50%'}}),
    queueRift30:()=>queueNextCombatMod({hpMul:1.15,rewardMul:1.3,xpMul:1.3,banner:{big:'QA 균열 테스트',small:'골드/경험치 +30%'}})
  };
};

window.sfxTest=function(name){
  const list={
    warn:()=>sfx.enemyWarn(), cast:()=>sfx.enemyCast(), dash:()=>sfx.enemyDash(), laser:()=>sfx.enemyLaser(),
    summon:()=>sfx.enemySummon(), explode:()=>sfx.enemyExplode(), glitch:()=>sfx.enemyGlitch(), chain:()=>sfx.enemyChain(),
    seq:()=>{ sfx.enemySequence(1); setTimeout(()=>sfx.enemySequence(2),130); setTimeout(()=>sfx.enemySequence(3),260); },
    core:()=>sfx.enemyCore()
  };
  if(list[name]) return list[name]();
  console.log('sfxTest keys:',Object.keys(list));
  return Object.keys(list);
};
window.sfxTestAll=function(){
  const names=['warn','cast','dash','laser','summon','explode','glitch','chain','seq','core'];
  names.forEach((name,i)=>setTimeout(()=>window.sfxTest(name),i*300));
  return names;
};
window.debugTrainingQA=function(){
  const p=player||{};
  const training=Object.assign({},TRAINING_DEFAULTS,ensureTrainingState(p));
  return {
    training,
    hp:{current:Math.round(Number(p.hp)||0),max:Math.round(Number(p.maxhp)||0)},
    attack:{base:Number(p.dmg)||0,potion:Number(p.potionAtkFlat)||0,conditional:conditionalAttackFlat(p),final:totalAttackPower(p),trainingBonus:trainingCount('atk',p)*TRAINING_ATK_BONUS},
    speed:{base:Number(p.spd)||0,final:playerMoveSpeed(p),trainingBonus:Number(p.trainingSpeedBonus)||0},
    focus:{critChance:clamp(Number(p.critChance)||0,0,CRIT_CHANCE_CAP),trainingBonus:Number(p.trainingFocusBonus)||0,cap:CRIT_CHANCE_CAP},
    defense:{armor:effectiveArmor(p),trainingBonus:Number(p.trainingDefenseBonus)||0,cap:0.85}
  };
};

function renderDatabase(){
  const ov=$('ovDatabase'); if(!ov || ov.classList.contains('hidden')) return;
  const body=$('databaseBody'); if(!body) return;
  const q=String(($('databaseSearch')&&$('databaseSearch').value)||'').trim().toLowerCase();
  document.querySelectorAll('.db-tab').forEach(btn=>{
    if(btn.dataset.tab==='perks') btn.textContent='특성';
    btn.classList.toggle('active',btn.dataset.tab===(ov.dataset.tab||'relics'));
  });
  body.innerHTML='';
  const rows=databaseRows().filter(row=>{
    if(!q) return true;
    return String(row.name||'').toLowerCase().includes(q) || String(row.desc||'').toLowerCase().includes(q) || String(row.meta||'').toLowerCase().includes(q);
  });
  if(!rows.length){ body.innerHTML='<div class="db-empty">검색 결과가 없습니다.</div>'; return; }
  rows.forEach(row=>{
    const el=document.createElement('div');
    el.className='db-row '+(row.cls||'');
    if(row.relicId){ el.dataset.relicId=row.relicId; el.dataset.relicStatic='1'; }
    el.innerHTML='<div class="db-icon">'+row.icon+'</div><div><b>'+dbText(row.name)+'</b><span>'+dbText(row.desc)+'</span><small>'+dbText(row.meta)+'</small></div>';
    body.appendChild(el);
  });
}
function openDatabaseTab(){
  hideAll();
  $('ovTitle').classList.remove('hidden');
  const ov=$('ovDatabase');
  if(ov){ ov.classList.remove('hidden'); ov.dataset.tab=ov.dataset.tab||'relics'; }
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
  renderDatabase();
}
function closeDatabaseTab(){
  const ov=$('ovDatabase'); if(ov) ov.classList.add('hidden');
  $('ovTitle').classList.remove('hidden');
  state='title';
  syncChrome();
  refreshTitleDisplay();
  refreshSidePanel();
  if(window.startTitleScene) window.startTitleScene();
}
function bootGame(){
  initRelicTooltipEvents();
  initSpecialEffectTooltipEvents();
  initTrainingTooltipEvents();
  initStatTooltipEvents();
  buildDiffButtons();
  refreshLoadButton();
  loadUserProgress();
  initStreamerArt();
  wireMainControls();
  $('tmNew').onclick=openDifficultyTab;
  { const lb=$('tmLoad'); if(lb) lb.onclick=()=>{ if(!lb.disabled) loadRunCheckpoint(); }; }
  { const rb=$('tmRanking'); if(rb) rb.onclick=openRankingTab; }
  { const ab=$('tmAchievements'); if(ab) ab.onclick=openAchievementsTab; }
  { const db=$('tmDatabase'); if(db) db.onclick=openDatabaseTab; }
  { const rc=$('rankingClose'); if(rc) rc.onclick=closeRankingTab; }
  { const ss=$('rankingSeasonSel'); if(ss) ss.onchange=()=>{ setRankingSeason(ss.value); renderRankingList(); }; }
  { const rbc=$('rankBuildClose'); if(rbc) rbc.onclick=closeRankBuildModal; }
  { const ac=$('achClose'); if(ac) ac.onclick=closeAchievementsTab; }
  { const dc=$('databaseClose'); if(dc) dc.onclick=closeDatabaseTab; }
  window.addEventListener('beforeunload',()=>{ if(state==='map') saveRunCheckpoint(); });
  document.querySelectorAll('.ach-tab').forEach(btn=>{
    btn.onclick=()=>{ const ov=$('ovAchievements'); if(ov) ov.dataset.tab=btn.dataset.tab; renderAchievements(); };
  });
  document.querySelectorAll('.db-tab').forEach(btn=>{
    btn.onclick=()=>{ const ov=$('ovDatabase'); if(ov) ov.dataset.tab=btn.dataset.tab; renderDatabase(); };
  });
  { const ds=$('databaseSearch'); if(ds) ds.addEventListener('input',renderDatabase); }
  document.querySelectorAll('.rank-tab').forEach(btn=>{
    btn.onclick=()=>{ setRankingDifficulty(btn.dataset.diff); renderRankingList(); };  });
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
}

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
  if(document.body) document.body.classList.toggle('reduce-flash',!!_SET.flashReduce);
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
/* ----- 데미지 숫자 ----- */
let dmgNums=[];
let dmgCombo=0;               // 현재 연타(콤보) 수
let dmgComboT=0;              // 콤보 유지 잔여 시간
const DMG_COMBO_WINDOW=0.7;   // 이 시간 안에 다시 때리면 콤보 유지
const DMG_COMBO_MAX=12;       // 이 타수에서 시각 강조 최대치 도달

// 콤보 강도(tier 0~1)에 따른 핫 컬러: 흰 → 금 → 주황 → 빨강
function dmgComboColor(tier){
  if(tier<=0)    return '#ffffff';
  if(tier<0.34)  return '#fff1a8';
  if(tier<0.67)  return '#ffb648';
  return '#ff5b3a';
}

function spawnDmgNum(x,y,amt,crit,kind){
  if(amt<=0) return;
  const k=kind||'normal';
  const direct=(k==='normal'||k==='crit'||crit);   // 직접 타격(콤보 집계 대상)
  if(direct){ dmgCombo++; dmgComboT=DMG_COMBO_WINDOW; }
  // 근처 최근 같은 그룹 숫자에 병합 — 연타 시 개수 폭발 방지(렌더 부하 핵심)
  for(let i=dmgNums.length-1;i>=0;i--){
    const d=dmgNums[i];
    if(!d||d.t>0.14) continue;
    const sameGroup = direct ? (d.kind==='normal'||d.kind==='crit') : (d.kind===k);
    if(!sameGroup) continue;
    if(Math.abs(d.x-x)<26 && Math.abs(d.y-y)<26){
      d.amt+=amt; d.t=0; d.max=Math.max(d.max,crit?0.8:0.62);
      if(direct){ d.crit=d.crit||crit; d.combo=dmgCombo; d.tier=clamp((dmgCombo-1)/DMG_COMBO_MAX,0,1); }
      return;
    }
  }
  // 새 숫자 (상한 트림은 프레임당 cleanupCombatArrays에서 처리)
  const combo=dmgCombo;
  const tier=clamp((combo-1)/DMG_COMBO_MAX,0,1);
  dmgNums.push({
    x:x+rand(-5,5), y:y, amt:amt, crit:crit, kind:k,
    t:0, max:crit?0.8:0.62, vy:crit?-50:-40,
    combo:combo, tier:tier
  });
}
function updateDmgNums(dt){
  if(dmgComboT>0){ dmgComboT-=dt; if(dmgComboT<=0){ dmgComboT=0; dmgCombo=0; } }
  for(let i=dmgNums.length-1;i>=0;i--){ const d=dmgNums[i]; d.t+=dt; d.y+=d.vy*dt; d.vy*=0.90; if(d.t>=d.max) dmgNums.splice(i,1); }
}
function drawDmgNums(){
  if(!dmgNums.length) return;
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  const _heavyDN=dmgNums.length>16;   // 연타 폭주 시 글로우 생략으로 렌더 비용 절감
  for(const d of dmgNums){
    const life=d.t/d.max;
    const a=clamp(1-Math.pow(life,2.4),0,1);                 // 끝에 빠르게 사라짐
    const popK=d.t<0.1 ? (1.5-0.5*(d.t/0.1)) : 1;            // 등장 시 톡 튀는 팝
    const tier=d.tier||0;
    let base=d.crit?26:17;                                   // 기본 크기 확대
    base*=(1+tier*0.7);                                      // 콤보가 쌓일수록 최대 +70%
    const fontPx=Math.max(10,Math.round(base*popK));
    ctx.font='bold '+fontPx+'px Galmuri11, "Courier New", monospace';

    let col, prefix='', glow;
    if(d.kind==='burn'){      col='#ff8c3a'; prefix='🔥'; glow='rgba(255,90,20,0.55)'; }
    else if(d.kind==='poison'){ col='#3dff8a'; prefix='☠'; glow='rgba(40,255,120,0.5)'; }
    else if(d.kind==='heal'){ col='#5dff9b'; prefix='+'; glow='rgba(93,255,155,0.55)'; }
    else if(d.crit){          col=dmgComboColor(Math.max(tier,0.34)); prefix='⚡'; glow='rgba(255,180,40,0.65)'; }
    else {                    col=dmgComboColor(tier); glow='rgba(255,120,40,'+(0.22+tier*0.4).toFixed(2)+')'; }

    const txt=prefix+d.amt;
    ctx.globalAlpha=a;
    // 외곽선(글로우 없이) → 가독성 확보
    ctx.shadowBlur=0;
    ctx.lineWidth=Math.max(3,fontPx*0.16);
    ctx.strokeStyle='rgba(8,4,16,0.9)';
    ctx.strokeText(txt,d.x,d.y);
    // 채움(글로우 적용)
    ctx.shadowColor=glow;
    ctx.shadowBlur=_heavyDN?0:(6+tier*10+(d.crit?4:0));
    ctx.fillStyle=col;
    ctx.fillText(txt,d.x,d.y);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1; ctx.restore(); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

/* ----- 열기/닫기 ----- */
let _setPrevPaused=false;
function openSettings(){
  if(treeOpen || isOpen('ovTree')) return;
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
window.addEventListener('blur',()=>{
  clearInputState();
});

// 시작 시 저장된 설정 적용
applySettings(); reflectControls();

// ============================================================
// 📡 방송국 패시브 트리
// ============================================================
let treePoints = 0;   // 레벨업마다 +1 적립
let treeOpen   = false;
let _treePrevPaused = false;

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
    desc:'투사체 속도 +15%', apply:p=>{ p.bulletSpeedMul+=0.15; } },
  { id:'s_size1',  name:'대구경 I',    icon:'🔵', branch:'shot', req:['hub'], cost:1,
    desc:'투사체 크기 +12%', apply:p=>{ p.bulletSize+=0.12; } },
  { id:'s_speed2', name:'탄속 강화 II',icon:'⚡', branch:'shot', req:['s_speed1'], cost:1,
    desc:'투사체 속도 추가 +15%', apply:p=>{ p.bulletSpeedMul+=0.15; } },
  { id:'s_size2',  name:'대구경 II',   icon:'🔵', branch:'shot', req:['s_size1'], cost:1,
    desc:'투사체 크기 추가 +12%', apply:p=>{ p.bulletSize+=0.12; } },
  { id:'s_spread', name:'집탄 조정',   icon:'🎯', branch:'shot', req:['s_speed1','s_size1'], cost:1,
    desc:'다발 사격 시 탄 퍼짐 -30%', apply:p=>{ p._spreadMul=(p._spreadMul||1)*0.7; } },
  { id:'s_shots1', name:'다중 사격 I', icon:'🔱', branch:'shot', req:['s_spread'], cost:2,
    desc:'투사체 +1발', apply:p=>{ p.shots+=1; } },
  { id:'s_back',   name:'후방 사격',   icon:'🔙', branch:'shot', req:['s_shots1'], cost:1,
    desc:'뒤로도 한 발 발사', once:true, skip:p=>p.backShot,
    apply:p=>{ p.backShot=true; } },
  { id:'s_shots2', name:'다중 사격 II',icon:'🔱', branch:'shot', req:['s_shots1','s_size2'], cost:3,
    desc:'투사체 추가 +1발', apply:p=>{ p.shots+=1; } },
  { id:'sharp_senses', name:'예리한 감각', icon:'🎯', branch:'shot', req:['hub'], cost:1,
    desc:'치명타 확률 +5%', apply:p=>{ p.critChance+=0.05; } },
  { id:'weakpoint_strike', name:'급소 타격', icon:'💥', branch:'shot', req:['sharp_senses'], cost:2,
    desc:'치명타 피해 +25%', apply:p=>{ p.critMult+=0.25; } },
  { id:'red_pulse', name:'붉은 맥박', icon:'🩸', branch:'shot', req:['weakpoint_strike'], cost:2, isMiniKeystone:true,
    desc:'치명타 적중 시 3초 동안 재생 +5 (내부쿨 6초)', skip:p=>p.redPulseRegen>0,
    apply:p=>{ p.redPulseRegen=Math.max(p.redPulseRegen||0,5); } },
  { id:'gamblers_blade', name:'도박사의 칼날', icon:'🎲', branch:'shot', req:['red_pulse'], cost:3, isKeystone:true,
    desc:'치명타 확률 +15%, 치명타 피해 +50%, 비치명타 피해 -20%', skip:p=>p.gamblersBlade,
    apply:p=>{ p.gamblersBlade=true; p.critChance+=0.15; p.critMult+=0.5; p.nonCritDmgMul-=0.20; } },
  { id:'shotgun_mastery', name:'산탄 숙련', icon:'🔱', branch:'shot', req:['hub'], cost:1,
    desc:'가까운 거리 투사체 피해 +15% (보스는 절반)', apply:p=>{ p.closeProjectileDmgMul+=0.15; } },
  { id:'barrage_focus', name:'탄막 집중', icon:'🎯', branch:'shot', req:['shotgun_mastery'], cost:2, isMiniKeystone:true,
    desc:'추가 투사체 피해 보정 완화, 추가 투사체 치명타 확률 +10%', skip:p=>p.barrageFocus,
    apply:p=>{ p.barrageFocus=true; p.extraProjectileCritChance+=0.10; } },
  { id:'s_stable_barrage', name:'안정된 탄막', icon:'🎯', branch:'shot', req:['s_spread'], cost:2,
    desc:'공격력 +2, 투사체 속도 -8%', apply:p=>{ p.dmg+=2; p.bulletSpeedMul-=0.08; } },
  { id:'s_overcharge_round', name:'과충전 탄환', icon:'💥', branch:'shot', req:['weakpoint_strike'], cost:2,
    desc:'보스 피해 +22%, 공격력 -1', apply:p=>{ p.bossDmgMul+=0.22; p.dmg=Math.max(1,p.dmg-1); } },

  // ══════════════════════════════════
  // 🔥 상태이상 라인 — "도배 방송"
  // ══════════════════════════════════
  { id:'t_burn1',   name:'화상 코팅 I',  icon:'🔥', branch:'status', req:['hub'], cost:1,
    desc:'명중 시 화상 +3 (지속 피해)', apply:p=>{ p.burn+=3; } },
  { id:'t_poison1', name:'독침 I',        icon:'🟢', branch:'status', req:['hub'], cost:1,
    desc:'스택당 초당 독 피해 +2. 명중 시 4초 독 부여, 최대 6스택.', apply:p=>{ p.poison+=2; } },
  { id:'t_burn2',   name:'화상 코팅 II', icon:'🔥', branch:'status', req:['t_burn1'], cost:1,
    desc:'화상 추가 +3', apply:p=>{ p.burn+=3; } },
  { id:'t_poison2', name:'독침 II',       icon:'🟢', branch:'status', req:['t_poison1'], cost:1,
    desc:'스택당 초당 독 피해 추가 +2.', apply:p=>{ p.poison+=2; } },
  { id:'t_chill',   name:'빙결탄',        icon:'❄️', branch:'status', req:['t_poison1'], cost:1,
    desc:'명중 시 적 이동속도 둔화', once:true, skip:p=>p.chill>0,
    apply:p=>{ p.chill+=1; } },
  { id:'t_dmg',     name:'상태이상 강화', icon:'🧨', branch:'status', req:['t_burn2','t_poison2'], cost:2,
    desc:'상태이상 걸린 적에게 피해 +20%', apply:p=>{ p.statusDmgMul+=0.20; } },
  { id:'t_stun',    name:'기절 코팅',     icon:'🔔', branch:'status', req:['t_chill','t_dmg'], cost:2,
    desc:'명중 시 기절 확률 +15%', apply:p=>{ p.stunChance+=0.15; } },
  { id:'t_spread',  name:'도배왕',        icon:'🌋', branch:'status', req:['t_dmg'], cost:2,
    desc:'상태이상 적 처치 시 주변 전파 + 피해 추가 +20%', once:true, skip:p=>p.statusSpread,
    apply:p=>{ p.statusSpread=true; p.statusDmgMul+=0.20; } },
  { id:'t_venom_mature', name:'맹독 숙성', icon:'🟢', branch:'status', req:['t_poison2'], cost:2,
    desc:'독 초당 피해 +30%, 공격력 -1', apply:p=>{ p.poisonDotDmgMul=(Number(p.poisonDotDmgMul)||0)+0.30; p.dmg=Math.max(1,p.dmg-1); } },
  { id:'t_frost_mark', name:'냉기 각인', icon:'❄️', branch:'status', req:['t_chill'], cost:2,
    desc:'둔화된 적에게 치명타 확률 +8%', apply:p=>{ p.chillCritChance=(Number(p.chillCritChance)||0)+0.08; } },
  { id:'elemental_overload', name:'원소 과부하', icon:'🔥', branch:'status', req:['t_dmg'], cost:2, isMiniKeystone:true,
    desc:'상태이상 걸린 적에게 치명타 확률 +10%', apply:p=>{ p.statusCritChance+=0.10; } },
  { id:'corrosive_spread', name:'부식 확산', icon:'🟢', branch:'status', req:['elemental_overload','t_spread'], cost:2, isKeystone:true,
    desc:'상태이상 적 처치 시 주변 적에게 독/화상 전이 강화. 공격력 -1.5', skip:p=>p.corrosiveSpread,
    apply:p=>{ p.corrosiveSpread=true; p.statusDmgMul+=0.15; p.dmg=Math.max(1,p.dmg-1.5); } },

  // ══════════════════════════════════
  // 💰 골드 라인 — "슈퍼챗 부자"
  // ══════════════════════════════════
  { id:'g_gold1', name:'골드 수집 I',  icon:'💰', branch:'gold', req:['hub'], cost:1,
    desc:'골드 획득 +14%', apply:p=>{ p.goldMul+=0.14; } },
  { id:'g_bargain', name:'상점 흥정', icon:'🛒', branch:'gold', req:['g_gold1'], cost:2,
    desc:'상점 가격 -8%', apply:p=>{ p.shopCostMul-=0.08; } },
  { id:'g_xp1',   name:'성장 계약',icon:'📈', branch:'gold', req:['g_gold1'], cost:2,
    desc:'경험치 획득 +18%, 골드 획득 -8%', apply:p=>{ p.xpMul+=0.18; p.goldMul-=0.08; } },
  { id:'g_gold2', name:'골드 수집 II', icon:'💰', branch:'gold', req:['g_gold1'], cost:1,
    desc:'골드 획득 추가 +14%', apply:p=>{ p.goldMul+=0.14; } },
  { id:'g_xp2',   name:'압축 성장',icon:'⏫',branch:'gold', req:['g_xp1'], cost:2,
    desc:'경험치 획득 +20%, 받는 피해 +5%', apply:p=>{ p.xpMul+=0.20; p.damageTakenMul+=0.05; } },
  { id:'g_donate',name:'도네 알림 강화',icon:'💸', branch:'gold', req:['g_gold1'], cost:1,
    desc:'처치 시 골드 폭탄 확률 +8%', apply:p=>{ p.donateChance+=0.08; } },
  { id:'g_power', name:'현질의 힘',    icon:'💳', branch:'gold', req:['g_gold2','g_donate'], cost:2,
    desc:'보유 골드 100당 공격력 +0.8 (최대 +9.6)', apply:p=>{ p.goldPowerAtkFlat=(Number(p.goldPowerAtkFlat)||0)+0.8; } },
  { id:'g_magnet',name:'초강력 자석',  icon:'🧲', branch:'gold', req:['g_donate','g_power'], cost:2,
    desc:'흡수 범위 2배 + 골드 +20%', apply:p=>{ p.magnet+=60; p.goldMul+=0.2; } },
  { id:'g_jackpot',name:'대박 도네',   icon:'🎰', branch:'gold', req:['g_magnet'], cost:3,
    desc:'골드 폭탄 확률 2배 + 레벨업 시 체력 +15 회복', once:true,
    apply:p=>{ p.donateChance+=0.08; p._levelHeal=(p._levelHeal||0)+15; } },
  { id:'investment_return', name:'투자 수익', icon:'💰', branch:'gold', req:['g_power'], cost:2, isMiniKeystone:true,
    desc:'골드 150 이상 보유 시 공격력 +4', skip:p=>p.investmentReturn,
    apply:p=>{ p.investmentReturn=true; p.investmentReturnAtkFlat=4; } },
  { id:'greed_contract', name:'탐욕의 계약', icon:'💎', branch:'gold', req:['investment_return','g_jackpot'], cost:3, isKeystone:true,
    desc:'골드 획득 +40%, 받는 피해 +10%', skip:p=>p.greedContract,
    apply:p=>{ p.greedContract=true; p.goldMul+=0.4; p.damageTakenMul+=0.10; } },

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
  { id:'v_alchemy_pouch', name:'연금술 주머니', icon:'🧪', branch:'survive', req:['v_regen'], cost:2,
    desc:'포션 회복량과 버프 효과 +10%', apply:p=>{ p.potionAmp=(Number(p.potionAmp)||0)+0.10; } },
  { id:'v_steal', name:'흡혈 코팅',    icon:'🩸', branch:'survive', req:['v_regen','v_armor2'], cost:2,
    desc:'흡혈 확률 +8%', apply:p=>{ p.lifesteal+=0.08; } },
  { id:'v_thorns',name:'가시 갑옷',    icon:'🌵', branch:'survive', req:['v_armor2'], cost:2,
    desc:'피격 시 주변 적에게 주는 가시 피해 +12', apply:p=>{ p.thorns+=12; } },
  { id:'v_undead',name:'불사 스트리머',icon:'💀', branch:'survive', req:['v_steal','v_thorns'], cost:3,
    desc:'1회 체력1로 버티기', once:true, skip:p=>p.lastStand,
    apply:p=>{ p.lastStand=true; } },
  { id:'v_blood_cycle', name:'피의 순환', icon:'🩸', branch:'survive', req:['v_regen'], cost:2,
    desc:'흡혈 확률 +7%, 최대 체력 -8%', apply:p=>{ p.lifesteal+=0.07; p.maxhp=Math.max(1,Math.round(p.maxhp*0.92)); p.hp=Math.min(p.hp,p.maxhp); } },
  { id:'v_shield_training', name:'방패 운용', icon:'🛡️', branch:'survive', req:['v_armor2'], cost:2,
    desc:'받는 피해 -8%, 이동속도 -8', apply:p=>{ p.armor+=0.08; p.spd-=8; } },
  { id:'regen_overload', name:'재생 과부하', icon:'🌿', branch:'survive', req:['v_regen'], cost:2, isMiniKeystone:true,
    desc:'체력 50% 이하일 때 재생 효과 +50%', skip:p=>p.regenOverload,
    apply:p=>{ p.regenOverload=true; } },
  { id:'vamp_shield', name:'흡혈 보호막', icon:'🛡️', branch:'survive', req:['regen_overload','v_steal'], cost:3, isKeystone:true,
    desc:'초과 회복량을 보호막으로 전환. 자연 재생 효과 -30%', skip:p=>p.overhealShieldRate>0,
    apply:p=>{ p.overhealShieldRate=Math.max(p.overhealShieldRate||0,0.5); p.overhealShieldCap=Math.max(p.overhealShieldCap||0,0.2); p.regenMul-=0.30; } },

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
    desc:'베인Q 쿨다운 -20%', apply:p=>{ p.dodgeCdMul-=0.20; } },
  { id:'m_dtap',  name:'더블탭',       icon:'🎯', branch:'speed', req:['m_fire2','m_dodge'], cost:2,
    desc:'25% 확률로 즉시 1발 추가', apply:p=>{ p.doubleTap+=0.25; } },
  { id:'m_charge2',name:'회피 2충전',  icon:'🔵', branch:'speed', req:['m_dodge'], cost:2,
    desc:'베인Q 2회 충전', once:true, skip:p=>p.dodgeMaxCharges>=2,
    apply:p=>{ p.dodgeMaxCharges=2; p.dodgeCharges=2; } },
  { id:'m_blitz', name:'질풍 방송',    icon:'⚡', branch:'speed', req:['m_dtap','m_charge2'], cost:3,
    desc:'회피 후 2초간 발사속도 +30% + 회피 폭발', once:true,
    apply:p=>{ p.dodgeHaste=true; p.dodgeBlast+=14; } },
  { id:'m_risky_roll', name:'위험한 구르기', icon:'🌀', branch:'speed', req:['m_dodge'], cost:2,
    desc:'베인Q 쿨다운 -15%, 최대 체력 -8%', apply:p=>{ p.dodgeCdMul-=0.15; p.maxhp=Math.max(1,Math.round(p.maxhp*0.92)); p.hp=Math.min(p.hp,p.maxhp); } },
  { id:'m_dash_shot', name:'질주 사격', icon:'🔫', branch:'speed', req:['m_fire2'], cost:2,
    desc:'발사 속도 +18%, 받는 피해 +4%', apply:p=>{ p.fireAdd+=0.18; p.damageTakenMul+=0.04; } },
  { id:'dodge_reload', name:'구르기 장전', icon:'🌀', branch:'speed', req:['hub'], cost:1,
    desc:'베인Q 사용 후 다음 탄 피해 +40% (2초)', skip:p=>p.dodgeReload,
    apply:p=>{ p.dodgeReload=true; } },
  { id:'perfect_dodge', name:'완벽 회피', icon:'💨', branch:'speed', req:['dodge_reload'], cost:2, isMiniKeystone:true,
    desc:'Q 이후 1초 동안 피격되지 않으면 3초 동안 발사속도 +20%', skip:p=>p.perfectDodge,
    apply:p=>{ p.perfectDodge=true; } },
  { id:'shadow_barrage', name:'그림자 탄막', icon:'🌑', branch:'speed', req:['perfect_dodge','m_dtap'], cost:3, isKeystone:true,
    desc:'Q 후 1초 동안 투사체 +2. 베인Q 쿨다운 +25%', skip:p=>p.shadowBarrage,
    apply:p=>{ p.shadowBarrage=true; p.shadowBarrageExtraShots=2; p.dodgeCdMul+=0.25; } },
];

// 찍힌 노드 id Set
let treeUnlocked = new Set(['hub']);

function migrateTreeOnlyPerksToTree(){
  if(!player||!Array.isArray(player.perkIds)||!treeUnlocked) return;
  let moved=false;
  player.perkIds=player.perkIds.filter(id=>{
    if(isTreeOnlyPerkId(id)){
      if(typeof passiveNodeById==='function' && passiveNodeById(id)){
        treeUnlocked.add(id);
        moved=true;
      }
      return false;
    }
    return !!perkByStoredId(id);
  });
  if(moved && !treeUnlocked.has('hub')) treeUnlocked.add('hub');
}

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
  if(node.isKeystone) unlockAchievement('first_keystone');
  updateHUD();
  return true;
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
  m_spd1:[1.95,-0.62], m_fire1:[1,0.25], m_spd2:[2.35,-0.44], m_fire2:[2,0.22],
  m_dodge:[3.1,-0.10], m_dtap:[4,-0.25], m_charge2:[4,0.25], m_blitz:[5,0], m_risky_roll:[4,0.96], m_dash_shot:[3.6,-1.20],
  dodge_reload:[1.35,1.08], perfect_dodge:[3,0.52], shadow_barrage:[6,0.38],
  s_speed1:[1,-0.22], s_size1:[1,0.22], s_speed2:[2,-0.22], s_size2:[2,0.22],
  s_spread:[3,0], s_shots1:[4,-0.24], s_back:[4,0.24], s_shots2:[5,0], s_stable_barrage:[4.45,0.04], s_overcharge_round:[4,-0.92],
  sharp_senses:[1.35,-1.05], weakpoint_strike:[2.25,-0.98], red_pulse:[3,-0.82],
  gamblers_blade:[5,-0.70], shotgun_mastery:[1.6,1.28], barrage_focus:[3,0.50],
  v_hp1:[1.7,-0.46], v_armor1:[1,0.22], v_hp2:[2.25,-0.36], v_armor2:[2,0.22],
  v_regen:[3,-0.30], v_alchemy_pouch:[3.25,-1.02], v_steal:[4,-0.24], v_thorns:[4,0.24], v_undead:[5,0], v_blood_cycle:[4,-0.92], v_shield_training:[3,0.64],
  regen_overload:[4,-0.74], vamp_shield:[5,-0.54],
  t_burn1:[1,-0.22], t_poison1:[1.9,0.62], t_burn2:[2,-0.22], t_poison2:[2.55,0.64],
  t_chill:[3,0.32], t_dmg:[3,-0.22], t_stun:[4,0], t_spread:[5,0], t_venom_mature:[3.25,1.02], t_frost_mark:[4,0.72],
  elemental_overload:[4,-0.82], corrosive_spread:[6,-0.38],
  g_gold1:[1,-0.22], g_gold2:[2,-0.22], g_bargain:[2.4,0.58], g_xp1:[4,0.82], g_xp2:[5,0.64],
  g_donate:[3,0.22], g_power:[3,-0.22], g_magnet:[4,0], g_jackpot:[5,0],
  investment_return:[4,-0.50], greed_contract:[6,-0.26],
};

let treeAtlasSelected = 'hub';
let treeAtlasPan = {x:0, y:0};
let treeAtlasZoom = 1.08;
let treeAtlasDrag = null;
let treeAtlasMoved = false;
let treeEventsReady = false;
let _treeLayout = null;
let _treeHover = null;

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
  sword:{p:['.....1...','....12...','...122...','..122....','.122.....','122......','.1.......','2........','.........'],c:{1:'#f7f3dd',2:'#d79b4b'}},
  arrow:{p:['....1....','...121...','..12221..','....2....','....2....','....2....','....2....','...222...','.........'],c:{1:'#fff0a8',2:'#8fb7d9'}},
  crown:{p:['1...2...1','11.222.11','122222221','122222221','.1111111.','.........','.........','.........','.........'],c:{1:'#fff0a8',2:'#d7b657'}},
  gem:{p:['..11111..','.1222221.','122222221','122121221','.1222221.','..12221..','...121...','....1....','.........'],c:{1:'#c98bff',2:'#11131a'}},
  armor:{p:['..11111..','.1222221.','122222221','122121221','122222221','.1222221.','..12221..','...111...','.........'],c:{1:'#d8d2bf',2:'#5c6575'}},
  contract:{p:['.111111..','12222221.','12211221.','12222221.','12111221.','12222221.','12221111.','.1111.2.','.........'],c:{1:'#f3d98b',2:'#5f8cff'}},
};
const TREE_NODE_PIX={
  hub:'tower',
  shot:'arrow', status:'fire', gold:'coin', survive:'shield', speed:'boot',
  s_speed1:'bolt', s_speed2:'bolt', s_size1:'orb', s_size2:'orb', s_spread:'split', s_shots1:'split', s_shots2:'split',
  s_back:'back', s_stable_barrage:'split', s_overcharge_round:'gun',
  sharp_senses:'target', weakpoint_strike:'target', red_pulse:'blood', gamblers_blade:'sword', shotgun_mastery:'split', barrage_focus:'split',
  t_burn1:'fire', t_burn2:'fire', t_poison1:'poison', t_poison2:'poison', t_chill:'frost', t_dmg:'bomb', t_stun:'bell', t_spread:'wave',
  t_venom_mature:'poison', t_frost_mark:'frost', elemental_overload:'bolt', corrosive_spread:'poison',
  g_gold1:'coin', g_gold2:'coin', g_bargain:'card', g_xp1:'chart', g_xp2:'chart', g_donate:'donate', g_power:'card', g_magnet:'magnet', g_jackpot:'slot',
  investment_return:'coin', greed_contract:'contract',
  v_hp1:'heart', v_hp2:'heart', v_armor1:'armor', v_armor2:'armor', v_regen:'leaf', v_alchemy_pouch:'leaf', v_steal:'blood', v_thorns:'thorn', v_undead:'skull',
  v_blood_cycle:'blood', v_shield_training:'armor', regen_overload:'leaf', vamp_shield:'shield',
  m_spd1:'boot', m_spd2:'boot', m_fire1:'gun', m_fire2:'gun', m_dodge:'swirl', m_dtap:'target', m_charge2:'orb', m_blitz:'bolt',
  m_risky_roll:'swirl', m_dash_shot:'gun', dodge_reload:'swirl', perfect_dodge:'swirl', shadow_barrage:'split'
};
function treePixelKey(node){
  const id=node.id;
  if(node.iconKey && TREE_PIXEL_PATTERNS[node.iconKey]) return node.iconKey;
  if(TREE_NODE_PIX[id] && TREE_PIXEL_PATTERNS[TREE_NODE_PIX[id]]) return TREE_NODE_PIX[id];
  if(TREE_NODE_PIX[node.branch] && TREE_PIXEL_PATTERNS[TREE_NODE_PIX[node.branch]]) return TREE_NODE_PIX[node.branch];
  if(id==='hub') return 'hub';
  if(id==='sharp_senses'||id==='weakpoint_strike'||id==='barrage_focus') return 'target';
  if(id==='red_pulse'||id==='gamblers_blade') return 'blood';
  if(id==='shotgun_mastery') return 'split';
  if(id==='elemental_overload') return 'fire';
  if(id==='corrosive_spread') return 'poison';
  if(id==='dodge_reload'||id==='perfect_dodge'||id==='shadow_barrage') return 'swirl';
  if(id==='regen_overload') return 'leaf';
  if(id==='vamp_shield') return 'shield';
  if(id==='investment_return') return 'coin';
  if(id==='greed_contract') return 'card';
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
  if(id==='g_xp2') return 'arrow';
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
  if(id==='m_dodge'||id==='m_risky_roll') return 'swirl';
  if(id==='m_dash_shot') return 'gun';
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
function treeNodeVisualRadius(node){
  const major=node.id==='hub'||node.isMiniKeystone||node.isKeystone||(node.cost||1)>=3;
  return major?30:22;
}
function drawTreeCostLabel(c,node,a,b,W,H){
  const cost=node.cost||1;
  if(cost<=1 || treeUnlocked.has(node.id)) return;
  const focused=treeCanUnlock(node)||treeAtlasSelected===node.id||_treeHover===node.id;
  if(!focused) return;
  const dx=b.x-a.x, dy=b.y-a.y;
  const len=Math.max(1,Math.hypot(dx,dy));
  let nx=-dy/len, ny=dx/len;
  const mid={x:(a.x+b.x)/2, y:(a.y+b.y)/2};
  const center={x:W*0.45+treeAtlasPan.x, y:H*0.55+treeAtlasPan.y};
  if((mid.x-center.x)*nx+(mid.y-center.y)*ny<0){ nx=-nx; ny=-ny; }
  let offset=20+(cost>=3?4:0);
  let x=mid.x+nx*offset, y=mid.y+ny*offset;
  for(let pass=0;pass<3;pass++){
    let moved=false;
    for(const other of TREE_NODES){
      const p=_treeLayout&&_treeLayout[other.id]; if(!p) continue;
      const sp=treeToScreen2(p.x,p.y,W,H);
      const avoid=treeNodeVisualRadius(other)+24;
      const d=Math.hypot(x-sp.x,y-sp.y);
      if(d>0.1 && d<avoid){
        const push=(avoid-d)+8;
        x+=(x-sp.x)/d*push;
        y+=(y-sp.y)/d*push;
        moved=true;
      }
    }
    if(!moved) break;
  }
  c.save();
  c.font='bold 11px Courier New';
  c.textAlign='center';
  c.textBaseline='middle';
  const txt=cost+'P';
  const w=Math.ceil(c.measureText(txt).width)+14, h=16;
  c.fillStyle='rgba(7,8,13,0.86)';
  c.strokeStyle=treeCanUnlock(node)?'rgba(243,217,139,0.75)':'rgba(115,105,88,0.68)';
  c.lineWidth=1;
  c.fillRect(Math.round(x-w/2),Math.round(y-h/2),w,h);
  c.strokeRect(Math.round(x-w/2)+0.5,Math.round(y-h/2)+0.5,w-1,h-1);
  c.fillStyle=treeCanUnlock(node)?'#f3d98b':'#877c68';
  c.fillText(txt,Math.round(x),Math.round(y)+0.5);
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
  if(isOpen('ovSettings') || isOpen('ovDatabase') || isOpen('ovPause')) return;
  ensureTreeChrome();
  initTreeEvents();
  _treePrevPaused = paused;
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
  if(state==='play' && !_treePrevPaused && paused){ paused=false; last=performance.now(); }
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
  const major=node.id==='hub' || node.isMiniKeystone || node.isKeystone || (node.cost||1)>=3;
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
  c.lineWidth=node.isKeystone?4:(major?3:2);
  c.strokeStyle=unlocked?col:(can?'#f3d98b':(reach?'#5a554b':'#2c2b30'));
  c.stroke();
  if(can && !unlocked){
    c.beginPath();
    c.arc(sp.x,sp.y,r+7,0,TAU);
    c.strokeStyle='rgba(243,217,139,0.55)';
    c.lineWidth=1;
    c.stroke();
  }
  if(node.isKeystone || node.isMiniKeystone){
    c.beginPath();
    c.arc(sp.x,sp.y,r+10,0,TAU);
    c.strokeStyle=node.isKeystone?'rgba(255,211,77,0.62)':'rgba(139,232,255,0.48)';
    c.lineWidth=node.isKeystone?2:1;
    c.stroke();
  }
  c.fillStyle='rgba(0,0,0,0.22)';
  c.fillRect(Math.round(sp.x-r*0.58),Math.round(sp.y-r*0.58),Math.round(r*1.16),Math.round(r*1.16));
  drawTreePixelIcon(c,node,sp.x,sp.y+1,major,unlocked?1:(can?0.92:0.38));
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
    const r=(node.id==='hub'||node.isMiniKeystone||node.isKeystone||(node.cost||1)>=3?30:22);
    const d=Math.hypot(sx-sp.x,sy-sp.y);
    if(d<r && d<bestD){ best=node; bestD=d; }
  }
  return best;
}
function updateTreeTooltip(node,cx,cy){
  const tt=$('treeTooltip'); if(!tt) return;
  if(!node){ tt.style.display='none'; return; }
  const col=TREE_BRANCH_COL[node.branch]||TREE_BRANCH_COL.hub;
  $('ttName').textContent=(node.isKeystone?'KEYSTONE · ':node.isMiniKeystone?'MINI · ':'')+node.name;
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

bootGame();
