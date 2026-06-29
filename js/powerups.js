// ═══════════════════════════════════════════════════════════
//  POWER-UPS — definitions, drops, activation/expiry, the HUD
//  badge bar, and the bomb detonation.
// ═══════════════════════════════════════════════════════════
import { G, pad, W, H, BASE_PAD_W, puBar, updateHUD } from './state.js';
import { SFX } from './audio.js';
import {
  floatTxt, spawnEnergy, spawnFire, spawnSparks, spawnSmoke, shake,
} from './particles.js';
import { makeBall, scaleSpd, triggerBrickDeath, circleRect } from './entities.js';

export const PU = {
  WIDE:       { label:'WIDE PAD', color:'#44ff88', fg:'#003300', dur:12000 },
  NARROW:     { label:'NARROW!',  color:'#ff4488', fg:'#330020', dur:9000 },
  MULTIBALL:  { label:'MULTI',    color:'#ff88ff', fg:'#330033', dur:0 },
  TRIPLEBALL: { label:'TRIPLE',   color:'#dd44ff', fg:'#220033', dur:0 },
  LASER:      { label:'LASER',    color:'#ff4444', fg:'#330000', dur:12000 },
  FIREBALL:   { label:'FIRE',     color:'#ff8800', fg:'#331100', dur:8000 },
  SLOW:       { label:'SLOW',     color:'#44ccff', fg:'#002233', dur:10000 },
  FAST:       { label:'FAST!',    color:'#ff2222', fg:'#330000', dur:7000 },
  MAGNET:     { label:'MAGNET',   color:'#ffee44', fg:'#332200', dur:10000 },
  GHOST:      { label:'GHOST',    color:'#aaffee', fg:'#002220', dur:7000 },
  BOMB:       { label:'BOMB',     color:'#ff6600', fg:'#331100', dur:0 },
  EXTRALIFE:  { label:'+LIFE',    color:'#ffdd00', fg:'#332200', dur:0 },
};
const PU_POOL = [
  'WIDE','WIDE','MULTIBALL','MULTIBALL','TRIPLEBALL',
  'LASER','LASER','FIREBALL','FIREBALL','SLOW','SLOW',
  'MAGNET','MAGNET','GHOST','BOMB','BOMB',
  'EXTRALIFE','FAST','NARROW',
];

export function maybeDropPU(cx, cy){
  if (Math.random() > 0.28) return;
  const type = PU_POOL[Math.floor(Math.random() * PU_POOL.length)];
  G.drops.push({ x:cx-18, y:cy, w:36, h:14, type, vy:2.2, caught:false, pulse:0 });
}

export function activatePU(type){
  SFX.pu();
  if (type === 'EXTRALIFE'){
    G.lives++; updateHUD();
    floatTxt(pad.cx, pad.y-28, '+1 LIFE', '#ffdd00', 16);
    spawnEnergy(pad.cx, pad.y, '#ffdd00', 12);
    return;
  }
  if (type === 'MULTIBALL'){
    [...G.balls].forEach(b => {
      const a = Math.atan2(b.dy, b.dx);
      G.balls.push(makeBall(b.x, b.y, a+0.45));
      G.balls.push(makeBall(b.x, b.y, a-0.45));
    });
    floatTxt(pad.cx, pad.y-28, 'MULTI BALL!', '#ff88ff', 16);
    return;
  }
  if (type === 'TRIPLEBALL'){
    [...G.balls].forEach(b => {
      [-0.6, 0, 0.6].forEach(off => G.balls.push(makeBall(b.x, b.y, Math.atan2(b.dy, b.dx)+off)));
    });
    floatTxt(pad.cx, pad.y-28, 'TRIPLE BALL!', '#dd44ff', 16);
    return;
  }
  if (type === 'BOMB'){
    G.bombCharges += 2;
    floatTxt(pad.cx, pad.y-28, 'BOMB x'+G.bombCharges, '#ff6600', 16);
    renderPUBar();
    return;
  }
  if (G.active[type]) clearTimeout(G.active[type].timer);
  if (type === 'WIDE')     { pad.w = Math.min(BASE_PAD_W*1.8, 144); floatTxt(pad.cx, pad.y-28, 'WIDE PADDLE', '#44ff88', 15); }
  if (type === 'NARROW')   { pad.w = Math.max(BASE_PAD_W*0.5, 40);  floatTxt(pad.cx, pad.y-28, 'NARROW!', '#ff4488', 15); }
  if (type === 'SLOW')     { G.balls.forEach(b => scaleSpd(b, 0.55)); floatTxt(pad.cx, pad.y-28, 'SLOW BALL', '#44ccff', 15); }
  if (type === 'FAST')     { G.balls.forEach(b => scaleSpd(b, 1.7));  floatTxt(pad.cx, pad.y-28, 'FAST BALL!', '#ff2222', 15); }
  if (type === 'FIREBALL') { G.balls.forEach(b => b.fire = true);  floatTxt(pad.cx, pad.y-28, 'FIRE BALL!', '#ff8800', 15); spawnFire(pad.cx, pad.y-20, 8); }
  if (type === 'GHOST')    { G.balls.forEach(b => b.ghost = true); floatTxt(pad.cx, pad.y-28, 'GHOST BALL', '#aaffee', 15); }
  if (type === 'MAGNET')   { floatTxt(pad.cx, pad.y-28, 'MAGNET!', '#ffee44', 15); }
  if (type === 'LASER')    { floatTxt(pad.cx, pad.y-28, 'LASER!', '#ff4444', 15); }
  const timer = setTimeout(() => expirePU(type), PU[type].dur);
  G.active[type] = { expiresAt: Date.now() + PU[type].dur, timer };
  renderPUBar();
}

export function expirePU(type){
  delete G.active[type]; SFX.expire();
  if (type === 'WIDE' || type === 'NARROW') pad.w = BASE_PAD_W;
  if (type === 'FIREBALL') G.balls.forEach(b => b.fire = false);
  if (type === 'GHOST')    G.balls.forEach(b => b.ghost = false);
  if (type === 'SLOW' || type === 'FAST')
    G.balls.forEach(b => { const a = Math.atan2(b.dy, b.dx); b.dx = Math.cos(a)*4.5; b.dy = Math.sin(a)*4.5; });
  renderPUBar();
}

export function clearAll(){
  Object.values(G.active).forEach(v => clearTimeout(v.timer));
  G.active = {}; G.drops = []; G.lasers = []; G.bombCharges = 0; pad.w = BASE_PAD_W;
  renderPUBar();
}

export function renderPUBar(){
  puBar.innerHTML = '';
  for (const [t, info] of Object.entries(G.active)){
    const def = PU[t], span = document.createElement('span');
    span.className = 'pu-badge';
    span.style.background = def.color; span.style.color = def.fg;
    const rem = Math.ceil((info.expiresAt - Date.now()) / 1000);
    span.textContent = def.label + (def.dur ? ' ' + rem + 's' : '');
    puBar.appendChild(span);
  }
  if (G.bombCharges > 0){
    const s = document.createElement('span');
    s.className = 'pu-badge'; s.style.background = '#ff6600'; s.style.color = '#331100';
    s.textContent = 'BOMB x' + G.bombCharges + ' [X]'; puBar.appendChild(s);
  }
}

export function detonateBomb(){
  if (G.bombCharges <= 0) return;
  G.bombCharges--; SFX.bomb(); shake(8, 14);
  const cx = G.balls.length ? G.balls[0].x : W/2;
  const cy = G.balls.length ? G.balls[0].y : H/2;
  G.bricks.forEach(b => {
    if (!b.alive) return;
    if (Math.hypot(b.x+b.w/2-cx, b.y+b.h/2-cy) < 95) triggerBrickDeath(b);
  });
  spawnSparks(cx, cy, '#ff8800', 30); spawnFire(cx, cy, 20); spawnSmoke(cx, cy, 10);
  updateHUD(); renderPUBar();
}

export function updateDrops(dt){
  for (const d of G.drops){
    if (d.caught) continue;
    d.y += d.vy * dt; d.pulse += 0.2 * dt;
    if (circleRect(pad.cx, pad.y+pad.h/2, Math.max(pad.w/2, pad.h), d.x, d.y, d.w, d.h)
        || (d.y+d.h >= pad.y && d.x+d.w >= pad.x && d.x <= pad.x+pad.w)){
      d.caught = true;
      activatePU(d.type);
      spawnEnergy(d.x+d.w/2, d.y, PU[d.type].color, 8);
    }
  }
  G.drops = G.drops.filter(d => !d.caught && d.y < H + 20);
}
