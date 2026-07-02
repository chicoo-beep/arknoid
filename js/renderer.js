// ═══════════════════════════════════════════════════════════
//  RENDERER — all canvas drawing: per-world backgrounds, bricks,
//  paddle, balls, drops, lasers, and the menu/pause overlays.
// ═══════════════════════════════════════════════════════════
import { ctx, W, H, G, STATES, pad } from './state.js';
import { drawParticles, drawFloats, fx } from './particles.js';
import { PU } from './powerups.js';
import { isMuted } from './audio.js';

// ── Tankaria logo ───────────────────────────────────────────
// Drop the artwork at assets/tankaria.png (PNG/SVG with transparency
// looks best). Until the file exists, every draw below is a no-op, so
// the game runs unchanged.
const logo = new Image();
let logoReady = false;
logo.onload  = () => { logoReady = logo.naturalWidth > 0; };
logo.onerror = () => { logoReady = false; };
logo.src = 'assets/tankaria.png';

// Draw the logo centred at (cx,cy), scaled to fit within maxW x maxH,
// preserving aspect ratio.
function drawLogo(cx, cy, maxW, maxH, alpha, glow){
  if (!logoReady) return;
  const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
  const w = logo.naturalWidth * scale, h = logo.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow){ ctx.shadowColor = glow; ctx.shadowBlur = 18; }
  ctx.drawImage(logo, cx - w/2, cy - h/2, w, h);
  ctx.restore();
}

// ── Background fields ───────────────────────────────────────
const MOTES = [];
for (let i = 0; i < 120; i++) MOTES.push({
  x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.3,
  spd: 0.1 + Math.random()*0.5, bright: Math.random(),
  twinkle: Math.random()*Math.PI*2, sway: Math.random()*Math.PI*2,
});
const NEBULA = [];
for (let i = 0; i < 6; i++) NEBULA.push({
  x: Math.random()*W, y: Math.random()*H, r: 60+Math.random()*100,
  hue: Math.random()*360, dx:(Math.random()-0.5)*0.15, dy:(Math.random()-0.5)*0.1,
});
// Under-floor cable trays for the Tankaria world (colored bundles that
// drift slowly across the void beneath the panels).
const CABLE_COLORS = ['#c0392b','#2980b9','#f1c40f','#27ae60','#e67e22','#8e44ad'];
const CABLES = [];
for (let i = 0; i < 7; i++) CABLES.push({
  y: 90 + i * 70 + Math.random()*30,
  color: CABLE_COLORS[i % CABLE_COLORS.length],
  amp: 6 + Math.random()*10, phase: Math.random()*Math.PI*2,
  speed: 0.1 + Math.random()*0.2, offset: Math.random()*W,
});
let bgTick = 0;

function fillGrad(c1, c2){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawMotes(color, dir){ // dir: 1 = fall, -1 = rise
  for (const s of MOTES){
    s.y += s.spd * dir; s.sway += 0.02;
    if (dir > 0 && s.y > H+2){ s.y = -2; s.x = Math.random()*W; }
    if (dir < 0 && s.y < -2){ s.y = H+2; s.x = Math.random()*W; }
    const tw = 0.5 + 0.5*Math.sin(bgTick*2 + s.twinkle);
    ctx.globalAlpha = 0.25 + 0.65*tw*s.bright;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(s.x + Math.sin(s.sway)*4, s.y, s.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBackground(){
  const world = G.world;
  const bg = world ? world.bg : 'space';
  bgTick += 0.02;

  if (bg === 'space'){
    ctx.fillStyle = '#02020f'; ctx.fillRect(0, 0, W, H);
    for (const n of NEBULA){
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue},60%,20%,0.53)`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill();
      n.x += n.dx; n.y += n.dy;
      if (n.x < -n.r) n.x = W+n.r; if (n.x > W+n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = H+n.r; if (n.y > H+n.r) n.y = -n.r;
    }
    drawMotes('#ffffff', 1);
    faintGrid('#ffffff07');
  } else if (bg === 'ice'){
    fillGrad('#0a2236', '#020812');
    // frost glow
    const g = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, H);
    g.addColorStop(0, 'rgba(140,200,255,0.10)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawMotes('#dff4ff', 1);            // snow
    faintGrid('#bfe8ff09');
  } else if (bg === 'volcano'){
    fillGrad('#1a0604', '#000000');
    // lava glow rising from bottom
    const pulse = 0.16 + 0.06*Math.sin(bgTick*3);
    const g = ctx.createRadialGradient(W/2, H, 0, W/2, H, H*0.9);
    g.addColorStop(0, `rgba(255,90,20,${pulse})`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawMotes('#ff8a3d', -1);           // rising embers
  } else if (bg === 'cyber'){
    ctx.fillStyle = '#05010a'; ctx.fillRect(0, 0, W, H);
    // neon perspective grid
    ctx.strokeStyle = 'rgba(255,43,214,0.18)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 24){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,255,240,0.16)';
    for (let y = 0; y <= H; y += 24){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // moving scanline
    const sy = (bgTick*40) % H;
    const sg = ctx.createLinearGradient(0, sy-30, 0, sy+30);
    sg.addColorStop(0, 'transparent'); sg.addColorStop(0.5, 'rgba(0,255,240,0.10)'); sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0, sy-30, W, 60);
  } else if (bg === 'tankaria'){
    // Under-floor void seen from above: dark cavity + cable trays.
    fillGrad('#0b0e13', '#030406');
    // cable bundles (each = a few parallel strands with a slow wave)
    for (const cb of CABLES){
      cb.offset += cb.speed;
      ctx.strokeStyle = cb.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s++){
        ctx.beginPath();
        for (let x = -10; x <= W+10; x += 12){
          const y = cb.y + s*5 + Math.sin((x + cb.offset)*0.025 + cb.phase)*cb.amp;
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // faint pedestal grid (the raised-floor support points)
    ctx.fillStyle = 'rgba(232,200,112,0.12)';
    for (let y = 60; y < H; y += 48) for (let x = 24; x < W; x += 48){
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI*2); ctx.fill();
    }
    // cool cooling glow from below
    const g = ctx.createRadialGradient(W/2, H, 0, W/2, H, H*0.8);
    g.addColorStop(0, 'rgba(60,150,180,0.10)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (bg === 'temple'){
    fillGrad('#1c1408', '#050402');
    // warm columns
    ctx.fillStyle = 'rgba(120,90,40,0.10)';
    for (let x = 30; x < W; x += 90) ctx.fillRect(x, 0, 26, H);
    drawMotes('#e8c870', 1);            // dust motes
    // warm vignette
    const g = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.8);
    g.addColorStop(0, 'transparent'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
function faintGrid(stroke){
  ctx.strokeStyle = stroke; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 24){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 24){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

// ── Shapes ──────────────────────────────────────────────────
function roundRect(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawPaddle(){
  ctx.save();
  const accent = G.world ? G.world.accent : '#00ddff';
  let c1 = accent, c2 = '#0066ff';
  if (G.active.WIDE)   { c1 = '#44ff88'; c2 = '#00aa44'; }
  if (G.active.NARROW) { c1 = '#ff4488'; c2 = '#aa0044'; }
  if (G.active.MAGNET) { c1 = '#ffee44'; c2 = '#aa8800'; }
  const g = ctx.createLinearGradient(pad.x, 0, pad.x+pad.w, 0);
  g.addColorStop(0, c1); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.shadowColor = c1; ctx.shadowBlur = 14;
  roundRect(pad.x, pad.y, pad.w, pad.h, 6); ctx.fill();
  if (G.active.LASER){
    ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 8;
    ctx.fillRect(pad.x+6, pad.y-6, 4, 6);
    ctx.fillRect(pad.x+pad.w-10, pad.y-6, 4, 6);
  }
  ctx.restore();
}

function drawBall(b){
  for (let i = 0; i < b.trail.length; i++){
    const t = b.trail[i], a = i / b.trail.length;
    ctx.globalAlpha = a * 0.4;
    ctx.fillStyle = b.fire ? '#ff8800' : b.ghost ? '#aaffee' : '#88ccff';
    ctx.beginPath(); ctx.arc(t.x, t.y, b.r*a, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  let col = '#ffffff', glow = '#88ccff';
  if (b.fire){ col = '#ffcc66'; glow = '#ff6600'; }
  if (b.ghost){ ctx.globalAlpha = 0.55; glow = '#aaffee'; }
  ctx.fillStyle = col; ctx.shadowColor = glow; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

// Raised-access-floor panel look for the Tankaria world.
function drawPanelTile(b){
  const dmg = b.maxHits > 1 ? (b.hitsLeft / b.maxHits) : 1;
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4*dmg;
  // brushed-metal face
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y+b.h);
  g.addColorStop(0, '#ffffff33'); g.addColorStop(0.12, b.color);
  g.addColorStop(0.9, b.color); g.addColorStop(1, '#00000055');
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // seam border
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(b.x+0.5, b.y+0.5, b.w-1, b.h-1);
  // corner pedestal studs
  ctx.fillStyle = 'rgba(20,20,24,0.8)';
  const d = 2.2, m = 3.5;
  [[b.x+m,b.y+m],[b.x+b.w-m,b.y+m],[b.x+m,b.y+b.h-m],[b.x+b.w-m,b.y+b.h-m]].forEach(([px,py])=>{
    ctx.beginPath(); ctx.arc(px, py, d, 0, Math.PI*2); ctx.fill();
  });
  // special glyph / hit count
  if (b.special === 'BOMB'){ ctx.fillStyle = '#000'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.fillText('✸', b.x+b.w/2, b.y+b.h-4); }
  else if (b.special === 'ELECTRIC'){ ctx.fillStyle = '#003344'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.fillText('⚡', b.x+b.w/2, b.y+b.h-4); }
  else if (b.maxHits > 1){ ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center'; ctx.fillText(b.hitsLeft, b.x+b.w/2, b.y+b.h-4); }
  ctx.restore();
}

function drawBricks(){
  const tiles = G.world && G.world.tiles;
  for (const b of G.bricks){
    if (!b.alive) continue;
    if (tiles){ drawPanelTile(b); continue; }
    b.glowPhase += 0.05;
    const dmg = b.maxHits > 1 ? (b.hitsLeft / b.maxHits) : 1;
    ctx.save();
    ctx.fillStyle = b.color; ctx.shadowColor = b.color;
    ctx.shadowBlur = b.special ? 12 + 4*Math.sin(b.glowPhase) : 6;
    ctx.globalAlpha = 0.55 + 0.45*dmg;
    roundRect(b.x, b.y, b.w, b.h, 3); ctx.fill();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x+2, b.y+2, b.w-4, 3);
    ctx.globalAlpha = 1;
    if (b.special === 'BOMB'){ ctx.fillStyle = '#000'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.fillText('✸', b.x+b.w/2, b.y+b.h-4); }
    if (b.special === 'ELECTRIC'){ ctx.fillStyle = '#003344'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.fillText('⚡', b.x+b.w/2, b.y+b.h-4); }
    if (b.maxHits > 1){ ctx.fillStyle = '#000'; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center'; ctx.fillText(b.hitsLeft, b.x+b.w/2, b.y+b.h-4); }
    ctx.restore();
  }
}

function drawBreaking(){
  for (const b of G.breakingBricks){
    const t = b.frame / b.maxFrames;
    if (b.lift){
      // panel lifts up, tilts and fades — like a floor tile being pulled out
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const cx = b.x + b.w/2, cy = b.y + b.h/2;
      ctx.translate(cx, cy - t*22);
      ctx.scale(1 + t*0.15, 1 - t*0.35);   // rise + squash for perspective
      ctx.fillStyle = b.color;
      ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
      ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(-b.w/2+0.5, -b.h/2+0.5, b.w-1, b.h-1);
      ctx.restore();
    } else {
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = b.color; ctx.lineWidth = 2;
      ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      const exp = t * 8;
      ctx.strokeRect(b.x-exp, b.y-exp, b.w+exp*2, b.h+exp*2);
    }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawDrops(){
  for (const d of G.drops){
    const def = PU[d.type];
    ctx.save();
    const pulse = 1 + 0.1*Math.sin(d.pulse);
    ctx.translate(d.x+d.w/2, d.y+d.h/2); ctx.scale(pulse, pulse);
    ctx.fillStyle = def.color; ctx.shadowColor = def.color; ctx.shadowBlur = 12;
    roundRect(-d.w/2, -d.h/2, d.w, d.h, 4); ctx.fill();
    ctx.fillStyle = def.fg; ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.label.replace(/[^A-Z+!]/g, '').slice(0, 5) || def.label, 0, 1);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

function drawLasers(){
  for (const l of G.lasers){
    ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff8888'; ctx.shadowBlur = 8;
    ctx.fillRect(l.x, l.y, l.w, l.h);
  }
  ctx.shadowBlur = 0;
}

function drawCenterText(title, sub){
  const accent = G.world ? G.world.accent : '#00ddff';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.shadowColor = accent; ctx.shadowBlur = 20;
  ctx.font = 'bold 38px Courier New';
  ctx.fillText(title, W/2, H/2-20);
  ctx.shadowBlur = 0;
  if (sub){ ctx.fillStyle = '#aaa'; ctx.font = '15px Courier New'; ctx.fillText(sub, W/2, H/2+24); }
}

export function draw(){
  ctx.save();
  ctx.translate(fx.x, fx.y);

  drawBackground();
  // Faint logo watermark behind the play area (not on the menu, which
  // shows the big logo instead).
  if (G.state !== STATES.MENU) drawLogo(W/2, H/2, 360, 360, 0.06);
  drawBricks();
  drawBreaking();
  drawDrops();
  drawLasers();
  G.balls.forEach(drawBall);
  drawPaddle();
  drawParticles();
  drawFloats();

  // Small logo in the top-left corner during active play.
  if (G.state === STATES.PLAYING || G.state === STATES.DEAD ||
      G.state === STATES.PAUSED  || G.state === STATES.LEVELCLEAR){
    drawLogo(40, 28, 60, 42, 0.6);
  }

  if (G.state === STATES.MENU){
    ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, W, H);
    drawLogo(W/2, 150, 240, 180, 1, G.world ? G.world.accent : '#00ddff');
    drawCenterText('ARKANOID X', 'Click or press Space to launch');
    ctx.fillStyle = '#888'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('6 WORLDS · Z laser · X bomb · P pause · M mute', W/2, H/2+58);
  } else if (G.state === STATES.PAUSED){
    ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, W, H);
    drawCenterText('PAUSED', 'Press P to resume');
  } else if (G.state === STATES.GAMEOVER){
    ctx.fillStyle = '#000c'; ctx.fillRect(0, 0, W, H);
    drawCenterText('GAME OVER', 'Score ' + G.score + ' — Space to restart');
  }

  if (isMuted()){
    ctx.fillStyle = '#888'; ctx.font = '10px Courier New'; ctx.textAlign = 'right';
    ctx.fillText('MUTED', W-6, 14);
  }

  ctx.restore();
}
