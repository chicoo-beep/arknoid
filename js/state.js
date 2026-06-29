// ═══════════════════════════════════════════════════════════
//  STATE — shared constants, DOM refs, and the mutable game
//  state object `G`. Everything that gets reassigned at runtime
//  (score, balls, etc.) lives on G so the value is visible across
//  modules (ES-module imports are read-only bindings).
// ═══════════════════════════════════════════════════════════
export const W = 480, H = 600;
export const STATES = { MENU:0, PLAYING:1, DEAD:2, PAUSED:3, GAMEOVER:4, LEVELCLEAR:5 };
export const BASE_PAD_W = 80, BASE_SPEED = 4.5;

// ── DOM ─────────────────────────────────────────────────────
export const canvas  = document.getElementById('canvas');
export const ctx     = canvas.getContext('2d');
export const scoreEl = document.getElementById('score');
export const levelEl = document.getElementById('level');
export const livesEl = document.getElementById('lives');
export const worldEl = document.getElementById('world');
export const msgEl   = document.getElementById('message');
export const puBar   = document.getElementById('powerup-bar');

// ── Mutable game state ──────────────────────────────────────
export const G = {
  state: STATES.MENU,
  score: 0, lives: 3, level: 1,
  world: null,                 // current world theme (set by buildLevel)
  active: {},                  // timed power-ups
  balls: [], drops: [], lasers: [], bricks: [], breakingBricks: [],
  laserCD: 0, bombCharges: 0,
  mouseX: 240,
  deadTimer: 0, clearTimer: 0,
  keys: {},
};

// ── Paddle (mutated in place) ───────────────────────────────
export const pad = {
  x: 200, y: 572, w: BASE_PAD_W, h: 12, speed: 7,
  get cx(){ return this.x + this.w / 2; },
};

export function updateHUD(){
  scoreEl.textContent = G.score;
  levelEl.textContent = G.level;
  livesEl.textContent = G.lives;
  if (worldEl && G.world) worldEl.textContent = G.world.name;
}
