// ═══════════════════════════════════════════════════════════
//  ENTITIES — ball/brick/paddle/laser logic, collisions and
//  per-entity update steps. High-level flow (lives, level clear)
//  lives in game.js; updateBalls() reports a lost-ball back to it.
// ═══════════════════════════════════════════════════════════
import { G, pad, W, H, BASE_SPEED } from './state.js';
import { SFX } from './audio.js';
import {
  spawnSparks, spawnFragments, spawnSmoke, spawnFire, spawnElectric, shake,
} from './particles.js';
import { maybeDropPU } from './powerups.js';

// ── Ball helpers ────────────────────────────────────────────
export function getSpd(){ return G.active.SLOW ? BASE_SPEED*0.55 : G.active.FAST ? BASE_SPEED*1.7 : BASE_SPEED; }
export function rawSpd(b){ return Math.sqrt(b.dx*b.dx + b.dy*b.dy); }
export function scaleSpd(b, factor){
  const s = rawSpd(b), a = Math.atan2(b.dy, b.dx);
  b.dx = Math.cos(a) * s * factor; b.dy = Math.sin(a) * s * factor;
}
export function makeBall(x, y, angle, attached = false){
  const spd = getSpd();
  return { x, y, r:7, dx:Math.cos(angle)*spd, dy:Math.sin(angle)*spd,
           attached, fire:!!G.active.FIREBALL, ghost:!!G.active.GHOST, trail:[] };
}
export function spawnMain(){
  const a = -Math.PI/2 + (Math.random()-0.5)*0.8;
  G.balls = [makeBall(pad.cx, pad.y-8, a, true)];
}

// ── Collision helpers ───────────────────────────────────────
export function circleRect(bx, by, br, rx, ry, rw, rh){
  const nx = Math.max(rx, Math.min(bx, rx+rw)), ny = Math.max(ry, Math.min(by, ry+rh));
  return (bx-nx)**2 + (by-ny)**2 <= br*br;
}
export function resolveDir(bx, by, br, rx, ry, rw, rh){
  const oL=(bx+br)-rx, oR=(rx+rw)-(bx-br), oT=(by+br)-ry, oB=(ry+rh)-(by-br);
  return Math.min(oL, oR) < Math.min(oT, oB) ? 'h' : 'v';
}

// ── Brick death + specials ──────────────────────────────────
export function triggerBrickDeath(b){
  if (!b.alive) return;
  b.alive = false;
  G.score += b.pts * G.level;
  maybeDropPU(b.x + b.w/2, b.y + b.h/2);
  spawnSparks(b.x+b.w/2, b.y+b.h/2, b.color, 10);
  spawnFragments(b.x+b.w/2, b.y+b.h/2, b.w, b.h, b.color, 8);
  spawnSmoke(b.x+b.w/2, b.y+b.h/2, 3);
  shake(3, 5);
  G.breakingBricks.push({ x:b.x, y:b.y, w:b.w, h:b.h, color:b.color, frame:0, maxFrames:6 });
  SFX.brick();

  if (b.special === 'BOMB'){
    setTimeout(() => {
      G.bricks.forEach(nb => {
        if (!nb.alive) return;
        if (Math.hypot(nb.x+nb.w/2-(b.x+b.w/2), nb.y+nb.h/2-(b.y+b.h/2)) < 70) triggerBrickDeath(nb);
      });
      shake(6, 10);
      spawnFire(b.x+b.w/2, b.y+b.h/2, 15);
    }, 80);
  }
  if (b.special === 'ELECTRIC'){
    SFX.electric();
    const alive = G.bricks.filter(nb => nb.alive && nb !== b);
    alive.sort((p, q) => Math.hypot(p.x-b.x, p.y-b.y) - Math.hypot(q.x-b.x, q.y-b.y));
    const targets = alive.slice(0, 2);
    targets.forEach(t => spawnElectric(b.x+b.w/2, b.y+b.h/2, t.x+t.w/2, t.y+t.h/2));
    setTimeout(() => targets.forEach(t => { if (t.alive) triggerBrickDeath(t); }), 90);
  }
}
export function hitBrick(b){
  b.hitsLeft--;
  if (b.hitsLeft <= 0) triggerBrickDeath(b);
  else { SFX.crack(); spawnSparks(b.x+b.w/2, b.y+b.h/2, b.color, 5); }
}

// ── Laser ───────────────────────────────────────────────────
export function fireLaser(){
  if (G.laserCD > 0 || !G.active.LASER) return;
  G.lasers.push({ x:pad.x+8,        y:pad.y, w:3, h:16, vy:-14 });
  G.lasers.push({ x:pad.x+pad.w-10, y:pad.y, w:3, h:16, vy:-14 });
  SFX.laser(); shake(2, 4); G.laserCD = 14;
}

// ── Per-entity updates ──────────────────────────────────────
export function updatePaddle(dt){
  if (G.keys['ArrowLeft'])  pad.x -= pad.speed * dt;
  if (G.keys['ArrowRight']) pad.x += pad.speed * dt;
  const target = G.mouseX - pad.w/2;
  pad.x += (target - pad.x) * 0.35 * dt;
  pad.x = Math.max(0, Math.min(W - pad.w, pad.x));
}

// Returns true if every ball was lost this frame.
export function updateBalls(dt){
  for (const b of G.balls){
    if (b.attached){ b.x = pad.cx; b.y = pad.y-8; continue; }
    if (G.active.MAGNET && b.dy > 0){ b.dx += Math.sign(pad.cx-b.x)*0.04*dt; scaleSpd(b, 1); }

    b.trail.push({ x:b.x, y:b.y });
    if (b.trail.length > 8) b.trail.shift();

    b.x += b.dx * dt; b.y += b.dy * dt;

    if (b.x-b.r < 0){ b.x = b.r;   b.dx = Math.abs(b.dx);  SFX.wall(); spawnSparks(b.x,b.y,'#66aaff',4); }
    if (b.x+b.r > W){ b.x = W-b.r; b.dx = -Math.abs(b.dx); SFX.wall(); spawnSparks(b.x,b.y,'#66aaff',4); }
    if (b.y-b.r < 0){ b.y = b.r;   b.dy = Math.abs(b.dy);  SFX.wall(); spawnSparks(b.x,b.y,'#66aaff',4); }

    if (b.dy > 0 && circleRect(b.x,b.y,b.r, pad.x,pad.y,pad.w,pad.h)){
      const hit = (b.x - pad.cx) / (pad.w/2);
      const ang = -Math.PI/2 + hit*(Math.PI/3);
      const spd = Math.max(rawSpd(b), getSpd());
      b.dx = Math.cos(ang)*spd; b.dy = Math.sin(ang)*spd;
      b.y = pad.y - b.r - 0.5;
      SFX.paddle(); spawnSparks(b.x, pad.y, '#ffffff', 5);
      if (G.active.MAGNET){ b.attached = true; b.x = pad.cx; b.y = pad.y-8; }
    }

    for (const br of G.bricks){
      if (!br.alive) continue;
      if (!circleRect(b.x,b.y,b.r, br.x,br.y,br.w,br.h)) continue;
      if (!b.ghost && !b.fire){
        const dir = resolveDir(b.x,b.y,b.r, br.x,br.y,br.w,br.h);
        if (dir === 'h') b.dx = -b.dx; else b.dy = -b.dy;
      }
      if (b.fire){ triggerBrickDeath(br); spawnFire(br.x+br.w/2, br.y+br.h/2, 6); }
      else hitBrick(br);
      if (!b.fire && !b.ghost) break;   // one brick per frame for normal balls
    }
  }

  const before = G.balls.length;
  G.balls = G.balls.filter(b => b.y - b.r <= H + 20);
  return G.balls.length === 0 && before > 0;
}

export function updateLasers(dt){
  if (G.laserCD > 0) G.laserCD -= dt;
  for (const l of G.lasers){
    l.y += l.vy * dt;
    for (const br of G.bricks){
      if (!br.alive) continue;
      if (l.x < br.x+br.w && l.x+l.w > br.x && l.y < br.y+br.h && l.y+l.h > br.y){
        hitBrick(br); l.dead = true; spawnSparks(l.x, l.y, '#ff6666', 4); break;
      }
    }
  }
  G.lasers = G.lasers.filter(l => !l.dead && l.y + l.h > 0);
}

export function updateBreaking(dt){
  for (const b of G.breakingBricks) b.frame += dt;
  G.breakingBricks = G.breakingBricks.filter(b => b.frame < b.maxFrames);
}
