// ═══════════════════════════════════════════════════════════
//  AUDIO — Web Audio synthesis for SFX + per-world background
//  music, with an optional real-file loader. If a matching file
//  is found in assets/audio/, it is used; otherwise the game
//  falls back to fully synthesized sound. No external files are
//  required for the game to sound complete.
//
//  To add real audio: drop files into assets/audio/ using the
//  names in SFX_FILES / MUSIC_FILES below (see assets/audio/README).
// ═══════════════════════════════════════════════════════════
let audioCtx = null;
let masterGain = null;     // SFX bus
let musicGain  = null;     // music bus
let sfxMuted = false, musicMuted = false;

// ── Loaded samples (filled in opportunistically) ────────────
const samples = {};        // name -> AudioBuffer
let loadStarted = false;

const SFX_FILES = {
  // name : url  (optional — missing files silently fall back to synth)
  brick:   'assets/audio/brick.mp3',
  crack:   'assets/audio/crack.mp3',
  paddle:  'assets/audio/paddle.mp3',
  wall:    'assets/audio/wall.mp3',
  laser:   'assets/audio/laser.mp3',
  bomb:    'assets/audio/bomb.mp3',
  powerup: 'assets/audio/powerup.mp3',
  dead:    'assets/audio/dead.mp3',
};
const MUSIC_FILES = {
  space:   'assets/audio/music-space.mp3',
  ice:     'assets/audio/music-ice.mp3',
  volcano: 'assets/audio/music-volcano.mp3',
  cyber:   'assets/audio/music-cyber.mp3',
  temple:  'assets/audio/music-temple.mp3',
  tankaria:'assets/audio/music-tankaria.mp3',
};

export function initAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain(); masterGain.gain.value = 1;   masterGain.connect(audioCtx.destination);
    musicGain  = audioCtx.createGain(); musicGain.gain.value  = 0.5; musicGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!loadStarted){ loadStarted = true; loadAll(); }
}

async function loadAll(){
  const grab = async (map, prefix) => {
    for (const [k, url] of Object.entries(map)){
      try {
        const r = await fetch(url);
        if (!r.ok) continue;                       // 404 -> keep synth
        const buf = await r.arrayBuffer();
        samples[prefix + k] = await audioCtx.decodeAudioData(buf);
      } catch (_) { /* missing/undecodable -> synth fallback */ }
    }
  };
  await grab(SFX_FILES, 'sfx_');
  await grab(MUSIC_FILES, 'mus_');
  // If a real track exists for the world we're already playing, swap to it.
  if (currentTrackKey) startMusic(currentTrackKey);
}

// ── Low-level synth helpers ─────────────────────────────────
function beep(freq = 440, type = 'square', dur = 0.06, vol = 0.15, dest = masterGain){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(dest || masterGain);
  o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function jingle(notes){ notes.forEach(([f, t]) => setTimeout(() => beep(f, 'sine', 0.13, 0.18), t)); }

function playSample(name, vol = 0.6){
  if (!audioCtx || !samples[name]) return false;
  const src = audioCtx.createBufferSource(), g = audioCtx.createGain();
  src.buffer = samples[name]; g.gain.value = vol;
  src.connect(g); g.connect(masterGain); src.start();
  return true;
}
// Try a real sample first, else run the synth fallback.
function sfx(name, synth){
  if (sfxMuted) return;
  if (playSample('sfx_' + name)) return;
  synth();
}

// ── Public SFX ──────────────────────────────────────────────
export const SFX = {
  wall:    () => sfx('wall',   () => beep(180, 'sine', 0.04, 0.1)),
  paddle:  () => sfx('paddle', () => beep(420, 'square', 0.07)),
  brick:   () => sfx('brick',  () => beep(600, 'square', 0.09)),
  crack:   () => sfx('crack',  () => beep(300, 'square', 0.06)),
  laser:   () => sfx('laser',  () => beep(900, 'sawtooth', 0.05, 0.12)),
  launch:  () => sfx('paddle', () => beep(300, 'square', 0.08)),
  expire:  () => sfx('expire', () => { beep(280,'sawtooth',0.1,0.12); setTimeout(()=>beep(190,'sawtooth',0.1,0.12),100); }),
  pu:      () => sfx('powerup',() => jingle([[520,0],[660,90],[800,180]])),
  bomb:    () => sfx('bomb',   () => { beep(60,'sawtooth',0.35,0.5); setTimeout(()=>beep(120,'sawtooth',0.25,0.4),70); }),
  electric:() => sfx('electric',()=> { for(let i=0;i<4;i++) setTimeout(()=>beep(800+Math.random()*400,'sawtooth',0.04,0.1),i*40); }),
  dead:    () => sfx('dead',   () => { beep(200,'sawtooth',0.15,0.3); setTimeout(()=>beep(120,'sawtooth',0.3,0.3),150); }),
  level:   () => sfx('level',  () => jingle([[880,0],[1100,150],[1320,300],[1760,500]])),
  gameover:() => sfx('gameover',()=> jingle([[440,0],[330,180],[262,360],[196,560]])),
};

// ═══════════════════════════════════════════════════════════
//  BACKGROUND MUSIC — synthesized chiptune loops per world.
//  Each track is a looping step sequence (lead + bass).
// ═══════════════════════════════════════════════════════════
const _ = null; // rest
const TRACKS = {
  space: {   // ambient, floating minor pentatonic
    tempo: 360, leadWave: 'sine',     bassWave: 'sine',     leadVol: 0.07, bassVol: 0.06,
    lead: [440,_,523,_,659,_,587,_,440,_,392,_,523,_,_,_],
    bass: [110,_,_,_,146.8,_,_,_,98,_,_,_,130.8,_,_,_],
  },
  ice: {     // bright, crystalline major bells
    tempo: 300, leadWave: 'triangle', bassWave: 'sine',     leadVol: 0.06, bassVol: 0.05,
    lead: [880,_,784,659,_,880,1046,_,784,_,659,587,_,659,784,_],
    bass: [130.8,_,_,_,164.8,_,_,_,196,_,_,_,164.8,_,_,_],
  },
  volcano: { // heavy, driving minor
    tempo: 240, leadWave: 'sawtooth', bassWave: 'square',   leadVol: 0.055, bassVol: 0.07,
    lead: [146.8,_,146.8,174.6,_,196,_,174.6,146.8,_,_,130.8,_,146.8,_,_],
    bass: [73.4,73.4,_,73.4,98,_,73.4,_,65.4,65.4,_,65.4,87.3,_,65.4,_],
  },
  cyber: {   // synthwave, steady pulse
    tempo: 220, leadWave: 'square',   bassWave: 'sawtooth', leadVol: 0.05, bassVol: 0.06,
    lead: [523,_,440,_,392,_,440,523,587,_,523,_,440,_,392,_],
    bass: [82.4,82.4,82.4,82.4,110,110,110,110,98,98,98,98,73.4,73.4,73.4,73.4],
  },
  temple: {  // mystical, modal
    tempo: 340, leadWave: 'triangle', bassWave: 'sine',     leadVol: 0.06, bassVol: 0.06,
    lead: [293.6,_,349.2,_,392,_,349.2,_,261.6,_,293.6,_,349.2,_,_,_],
    bass: [98,_,_,_,116.5,_,_,_,87.3,_,_,_,98,_,_,_],
  },
  tankaria: { // clean, corporate/techy major arpeggio
    tempo: 300, leadWave: 'triangle', bassWave: 'sine',     leadVol: 0.055, bassVol: 0.06,
    lead: [392,_,523,_,659,_,523,_,440,_,587,_,494,_,_,_],
    bass: [98,_,_,_,131,_,_,_,110,_,_,_,147,_,_,_],
  },
};

let musicTimer = null, musicStep = 0, musicSrc = null, currentTrackKey = null;

function stopMusic(){
  if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  if (musicSrc){ try { musicSrc.stop(); } catch(_){} musicSrc = null; }
}

export function startMusic(key){
  currentTrackKey = key;
  stopMusic();
  if (!audioCtx || musicMuted) return;
  // Prefer a real looping track file if one was loaded.
  const buf = samples['mus_' + key];
  if (buf){
    musicSrc = audioCtx.createBufferSource();
    musicSrc.buffer = buf; musicSrc.loop = true;
    musicSrc.connect(musicGain); musicSrc.start();
    return;
  }
  // Synth fallback sequencer.
  const tr = TRACKS[key] || TRACKS.space;
  musicStep = 0;
  const tone = (freq, wave, dur, vol) => {
    if (!freq) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = wave; o.frequency.value = freq; o.connect(g); g.connect(musicGain);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.03);
  };
  musicTimer = setInterval(() => {
    const s = musicStep;
    tone(tr.lead[s % tr.lead.length], tr.leadWave, tr.tempo/1000 * 0.9, tr.leadVol);
    if (s % 2 === 0) tone(tr.bass[s % tr.bass.length], tr.bassWave, tr.tempo/1000 * 1.8, tr.bassVol);
    musicStep++;
  }, tr.tempo);
}

export function pauseMusic(){ stopMusic(); }
export function resumeMusic(){ if (currentTrackKey) startMusic(currentTrackKey); }

export function toggleMute(){
  musicMuted = !musicMuted; sfxMuted = musicMuted;
  if (musicMuted) stopMusic();
  else if (currentTrackKey) startMusic(currentTrackKey);
  return musicMuted;
}
export function isMuted(){ return musicMuted; }
