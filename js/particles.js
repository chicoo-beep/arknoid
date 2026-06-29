// ═══════════════════════════════════════════════════════════
//  PARTICLES, FLOATING TEXT & SCREEN SHAKE
// ═══════════════════════════════════════════════════════════
import { ctx } from './state.js';

let particles = [];
let floats = [];

// ── Screen shake (read by renderer via `fx`) ────────────────
export const fx = { x: 0, y: 0 };
let shakeDur = 0, shakeMag = 0;
export function shake(mag = 5, dur = 8){
  shakeMag = Math.max(shakeMag, mag);
  shakeDur = Math.max(shakeDur, dur);
}
export function updateShake(){
  if (shakeDur > 0){
    fx.x = (Math.random() - 0.5) * shakeMag * 2;
    fx.y = (Math.random() - 0.5) * shakeMag * 2;
    shakeDur--; shakeMag *= 0.85;
  } else { fx.x = 0; fx.y = 0; shakeMag = 0; }
}

// ── Spawners ────────────────────────────────────────────────
export function spawnSparks(x, y, color, n = 12){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
    particles.push({ type:'spark', x, y, dx:Math.cos(a)*s, dy:Math.sin(a)*s-1,
      life:1, decay:0.04+Math.random()*0.03, color, r:1.5+Math.random()*1.5 });
  }
}
export function spawnFragments(x, y, w, h, color, n = 6){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    particles.push({ type:'fragment', x:x+(Math.random()-0.5)*w, y:y+(Math.random()-0.5)*h,
      dx:Math.cos(a)*s, dy:Math.sin(a)*s-2, life:1, decay:0.025+Math.random()*0.02,
      color, fw:4+Math.random()*8, fh:3+Math.random()*5,
      rot:Math.random()*Math.PI*2, spin:(Math.random()-0.5)*0.3 });
  }
}
export function spawnFire(x, y, n = 10){
  for (let i = 0; i < n; i++){
    const a = -Math.PI/2 + (Math.random()-0.5)*1.2, s = 1 + Math.random() * 3;
    particles.push({ type:'fire', x:x+(Math.random()-0.5)*12, y,
      dx:Math.cos(a)*s, dy:Math.sin(a)*s, life:1, decay:0.05+Math.random()*0.04,
      color:null, r:3+Math.random()*4 });
  }
}
export function spawnSmoke(x, y, n = 5){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.5;
    particles.push({ type:'smoke', x, y, dx:Math.cos(a)*s, dy:Math.sin(a)*s-0.5,
      life:0.7, decay:0.012, r:6+Math.random()*8 });
  }
}
export function spawnEnergy(x, y, color, n = 8){
  for (let i = 0; i < n; i++){
    const a = (i/n) * Math.PI * 2, s = 3 + Math.random() * 3;
    particles.push({ type:'energy', x, y, dx:Math.cos(a)*s, dy:Math.sin(a)*s,
      life:1, decay:0.06, color, r:3 });
  }
}
export function spawnElectric(x, y, x2, y2){
  const steps = 8;
  for (let i = 0; i <= steps; i++){
    const t = i / steps;
    const px = x + (x2 - x) * t + (Math.random()-0.5)*14;
    const py = y + (y2 - y) * t + (Math.random()-0.5)*14;
    particles.push({ type:'spark', x:px, y:py, dx:(Math.random()-0.5)*2, dy:(Math.random()-0.5)*2,
      life:1, decay:0.12, color:'#88ffff', r:2 });
  }
}

// ── Float text ──────────────────────────────────────────────
export function floatTxt(x, y, txt, color = '#fff', size = 14){
  floats.push({ x, y, txt, color, size, life:1, vy:-0.9 });
}

// ── Update / draw ───────────────────────────────────────────
export function updateParticles(dt){
  for (const p of particles){
    p.x += p.dx * dt; p.y += p.dy * dt;
    if (p.type === 'fragment') p.rot += p.spin * dt;
    if (p.type !== 'smoke') p.dy += 0.08 * dt;
    p.life -= p.decay * dt;
    if (p.type === 'fire') p.dx *= 0.96;
  }
  particles = particles.filter(p => p.life > 0);
}
export function updateFloats(dt){
  floats.forEach(f => { f.y += f.vy * dt; f.life -= 0.018 * dt; });
  floats = floats.filter(f => f.life > 0);
}
export function resetFX(){ particles = []; floats = []; }

export function drawParticles(){
  for (const p of particles){
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.type === 'spark'){
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    } else if (p.type === 'fragment'){
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 4;
      ctx.fillRect(-p.fw/2, -p.fh/2, p.fw, p.fh); ctx.restore();
    } else if (p.type === 'fire'){
      const t = 1 - p.life;
      ctx.fillStyle = `hsl(${30 - t*30},100%,${60 + t*20}%)`;
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(1 - t*0.5), 0, Math.PI*2); ctx.fill();
    } else if (p.type === 'smoke'){
      ctx.fillStyle = '#888'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(2 - p.life), 0, Math.PI*2); ctx.fill();
    } else if (p.type === 'energy'){
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}
export function drawFloats(){
  floats.forEach(f => {
    ctx.globalAlpha = f.life; ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px Courier New`; ctx.textAlign = 'center';
    ctx.shadowColor = f.color; ctx.shadowBlur = 8;
    ctx.fillText(f.txt, f.x, f.y); ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
}
