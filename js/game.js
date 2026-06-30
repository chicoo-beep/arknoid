// ═══════════════════════════════════════════════════════════
//  GAME — entry point. Wires input, game flow (start / next
//  level / death), the main loop and music transitions.
// ═══════════════════════════════════════════════════════════
import { G, pad, W, H, STATES, canvas, msgEl, updateHUD } from './state.js';
import { initAudio, SFX, startMusic, pauseMusic, resumeMusic, toggleMute } from './audio.js';
import { shake, spawnSparks, floatTxt, updateShake, updateParticles, updateFloats, resetFX } from './particles.js';
import { buildLevel } from './levels.js';
import { clearAll, renderPUBar, detonateBomb, updateDrops } from './powerups.js';
import { spawnMain, fireLaser, scaleSpd, updatePaddle, updateBalls, updateLasers, updateBreaking } from './entities.js';
import { draw } from './renderer.js';

let lastTime = 0, puBarTick = 0;

// ── Flow ────────────────────────────────────────────────────
function startGame(){
  G.score = 0; G.lives = 3; G.level = 1;
  clearAll();
  buildLevel(G.level);
  resetFX(); G.breakingBricks = [];
  spawnMain();
  G.state = STATES.PLAYING;
  msgEl.textContent = '';
  updateHUD();
  startMusic(G.world.music);
}

function nextLevel(){
  G.level++;
  clearAll();
  buildLevel(G.level);
  spawnMain();
  G.state = STATES.PLAYING;
  msgEl.textContent = '';
  SFX.level();
  floatTxt(W/2, H/2-30, 'LEVEL ' + G.level, G.world.accent, 26);
  floatTxt(W/2, H/2+4, G.world.name, G.world.accent, 18);
  updateHUD();
  startMusic(G.world.music);
}

function loseLife(){
  G.lives--; updateHUD();
  SFX.dead(); shake(6, 12);
  spawnSparks(pad.cx, pad.y, '#ff4444', 20);
  if (G.lives <= 0){
    G.state = STATES.GAMEOVER;
    SFX.gameover(); pauseMusic();
    msgEl.textContent = 'GAME OVER — Score ' + G.score + ' — Click / Space to continue';
  } else {
    G.state = STATES.DEAD; G.deadTimer = 60;
    msgEl.textContent = 'Ball lost! ' + G.lives + ' lives left';
  }
}

function togglePause(){
  if (G.state === STATES.PLAYING){ G.state = STATES.PAUSED; pauseMusic(); msgEl.textContent = 'PAUSED — press P to resume'; }
  else if (G.state === STATES.PAUSED){ G.state = STATES.PLAYING; resumeMusic(); msgEl.textContent = ''; }
}

function checkLevelClear(){
  if (G.state !== STATES.PLAYING) return;
  if (G.bricks.some(b => b.alive)) return;
  G.state = STATES.LEVELCLEAR; G.clearTimer = 70;
  msgEl.textContent = 'LEVEL CLEAR!';
  SFX.level();
}

// ── Input ───────────────────────────────────────────────────
function doAction(){
  initAudio();
  if (G.state === STATES.MENU){ startGame(); return; }
  if (G.state === STATES.GAMEOVER){ G.state = STATES.MENU; msgEl.textContent = ''; return; }
  if (G.state === STATES.PLAYING){
    let launched = false;
    G.balls.forEach(b => { if (b.attached){ b.attached = false; launched = true; } });
    if (launched) SFX.launch(); else fireLaser();
  }
}

// Map a screen X (mouse/touch) to the canvas's internal coordinate space —
// the canvas is displayed scaled on small screens, so divide by rect.width.
function toGameX(clientX){
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) * (W / rect.width);
}

canvas.addEventListener('mousemove', e => { G.pointerDirect = false; G.mouseX = toGameX(e.clientX); });
canvas.addEventListener('mousedown', doAction);

// ── Touch (mobile): drag = move paddle (1:1, snappy), tap = launch / fire ──
// Movement is tracked on the window while a drag is active, so the finger can
// roam off the canvas (e.g. over the buttons) without the paddle freezing.
let dragging = false;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  dragging = true; G.pointerDirect = true;
  if (e.touches[0]) G.mouseX = toGameX(e.touches[0].clientX);
  doAction();
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (!dragging) return;
  e.preventDefault();
  if (e.touches[0]) G.mouseX = toGameX(e.touches[0].clientX);
}, { passive: false });
window.addEventListener('touchend', () => { dragging = false; });
window.addEventListener('touchcancel', () => { dragging = false; });
window.addEventListener('keydown', e => {
  G.keys[e.key] = true;
  const k = e.key.toLowerCase();
  if (e.code === 'Space'){ e.preventDefault(); doAction(); }
  if (k === 'z'){ initAudio(); fireLaser(); }
  if (k === 'x'){ initAudio(); detonateBomb(); }
  if (k === 'p') togglePause();
  if (k === 'm') doMute();
  if (k === 'enter' && (G.state === STATES.MENU || G.state === STATES.GAMEOVER)) doAction();
});
window.addEventListener('keyup', e => { G.keys[e.key] = false; });

// ── On-screen buttons (mobile + desktop) ────────────────────
const muteBtn = document.getElementById('btn-mute');
function doMute(){
  initAudio();
  const muted = toggleMute();
  if (muteBtn){
    muteBtn.firstChild.textContent = muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('off', muted);
  }
}
function wireBtn(id, fn){
  const el = document.getElementById(id);
  if (!el) return;
  // Use pointerdown for instant response; fall back to click.
  el.addEventListener('click', ev => { ev.preventDefault(); fn(); });
}
wireBtn('btn-laser', () => { initAudio(); fireLaser(); });
wireBtn('btn-bomb',  () => { initAudio(); detonateBomb(); });
wireBtn('btn-pause', () => { initAudio(); togglePause(); });
wireBtn('btn-mute',  doMute);

// ── Update ──────────────────────────────────────────────────
function update(dt){
  updateShake();
  updateParticles(dt);
  updateFloats(dt);
  updateBreaking(dt);

  if (G.state === STATES.PLAYING){
    updatePaddle(dt);
    if (updateBalls(dt)) loseLife();
    updateDrops(dt);
    updateLasers(dt);
    checkLevelClear();
    puBarTick += dt;
    if (puBarTick > 15){ renderPUBar(); puBarTick = 0; }
  } else if (G.state === STATES.DEAD){
    updatePaddle(dt);
    G.deadTimer -= dt;
    if (G.deadTimer <= 0){
      G.drops = []; G.lasers = [];
      spawnMain();
      if (G.active.FIREBALL) G.balls.forEach(b => b.fire = true);
      if (G.active.GHOST)    G.balls.forEach(b => b.ghost = true);
      if (G.active.SLOW)     G.balls.forEach(b => scaleSpd(b, 0.55));
      if (G.active.FAST)     G.balls.forEach(b => scaleSpd(b, 1.7));
      G.state = STATES.PLAYING; msgEl.textContent = '';
    }
  } else if (G.state === STATES.LEVELCLEAR){
    G.clearTimer -= dt;
    if (G.clearTimer <= 0) nextLevel();
  }
}

function loop(ts){
  if (!lastTime) lastTime = ts;
  let dt = (ts - lastTime) / 16.6667;
  lastTime = ts;
  if (dt > 3) dt = 3;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── Boot ────────────────────────────────────────────────────
buildLevel(G.level);
spawnMain();
updateHUD();
msgEl.textContent = 'Click the game or press Space to start';
requestAnimationFrame(loop);
