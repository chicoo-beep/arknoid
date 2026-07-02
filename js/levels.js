// ═══════════════════════════════════════════════════════════
//  LEVELS & WORLDS
//  5 worlds cycle as the player advances (level 1->Space,
//  2->Ice, 3->Volcano, 4->Cyber, 5->Temple, 6->Space ...).
//  Each world has its own palette, background style, accent
//  colour and music key. Brick TYPES define behaviour
//  (hits/points/special); colour comes from the world palette.
// ═══════════════════════════════════════════════════════════
import { G } from './state.js';

// Type index -> behaviour. 1-5 normal, 6 = 2-hit, 7 = 3-hit,
// 8 = BOMB, 9 = ELECTRIC.
export const BTYPES = [null,
  { hits:1, pts:10 },
  { hits:1, pts:20 },
  { hits:1, pts:30 },
  { hits:1, pts:40 },
  { hits:1, pts:50 },
  { hits:2, pts:60 },
  { hits:3, pts:100 },
  { hits:1, pts:80, special:'BOMB' },
  { hits:2, pts:90, special:'ELECTRIC' },
];

export const WORLDS = [
  {
    name:'SPACE', bg:'space', music:'space', accent:'#44ccff',
    palette:['','#ff4444','#ff8844','#ffcc44','#44ff88','#44ccff','#cc44ff','#ffffff','#ff6600','#00ffff'],
    moteColor:'#ffffff',
  },
  {
    name:'ICE', bg:'ice', music:'ice', accent:'#aee8ff',
    palette:['','#aee8ff','#7fcfff','#cfefff','#9ff0d8','#6fa8ff','#b0a8ff','#ffffff','#ffaa55','#88f5ff'],
    moteColor:'#dff4ff',
  },
  {
    name:'VOLCANO', bg:'volcano', music:'volcano', accent:'#ff7733',
    palette:['','#ff3b1f','#ff6a1a','#ffa022','#e23b2b','#b51d12','#7a0f0f','#ffe6a0','#ffd23f','#ff8a3d'],
    moteColor:'#ff8a3d',
  },
  {
    name:'CYBER', bg:'cyber', music:'cyber', accent:'#00fff0',
    palette:['','#ff2bd6','#b14bff','#2bffea','#39ff14','#2b9bff','#ff3b8b','#f0f0ff','#ffd23f','#00fff0'],
    moteColor:'#00fff0',
  },
  {
    name:'TEMPLE', bg:'temple', music:'temple', accent:'#e8c870',
    palette:['','#d4a843','#bd7e2c','#e8c870','#73b06a','#3f937f','#8f6a3a','#f2e6b4','#e69128','#86e6c6'],
    moteColor:'#e8c870',
  },
  {
    // Tankaria brand world: bricks are raised-access-floor panels that lift
    // out when cleared, over an under-floor void of cable trays.
    name:'TANKARIA', bg:'tankaria', music:'tankaria', accent:'#e8c870',
    tiles:true,                       // renderer draws bricks as floor panels
    palette:['','#9aa0aa','#b8bec8','#c9cdd4','#c9a24b','#d9b45a','#7f8792','#eadfb4','#e69128','#8fd0c0'],
    moteColor:'#e8c870',
  },
];

export function getWorld(level){ return WORLDS[(level - 1) % WORLDS.length]; }

// Brick layouts (10 cols x 8 rows). Reused across worlds.
export const PATTERNS = [
  [[0,1,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,2,1],[1,3,3,8,3,3,8,3,3,1],[1,4,4,4,4,4,4,4,4,1],
   [1,5,9,5,5,5,5,9,5,1],[1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,7,7,0,0,0,0],[0,0,0,6,6,6,6,0,0,0],[0,0,5,5,5,5,5,5,0,0],[0,4,4,8,4,4,8,4,4,0],
   [3,3,3,3,3,3,3,3,3,3],[2,9,2,2,2,2,2,2,9,2],[1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0]],
  [[1,0,1,0,1,0,1,0,1,0],[0,2,0,2,0,2,0,2,0,2],[3,0,3,0,9,0,9,0,3,0],[0,4,0,4,0,4,0,4,0,4],
   [5,0,8,0,5,0,5,0,8,0],[0,6,0,6,0,6,0,6,0,6],[7,0,7,0,7,0,7,0,7,0],[0,1,0,1,0,1,0,1,0,1]],
  [[7,7,7,7,7,7,7,7,7,7],[6,0,0,0,0,0,0,0,0,6],[6,0,5,5,9,9,5,5,0,6],[6,0,5,0,0,0,0,5,0,6],
   [6,0,8,0,4,4,0,8,0,6],[6,0,5,0,0,0,0,5,0,6],[6,0,5,5,5,5,5,5,0,6],[6,0,0,0,0,0,0,0,0,6]],
  [[3,3,3,3,3,3,3,3,3,3],[3,6,6,6,6,6,6,6,6,3],[3,6,7,9,7,7,9,7,6,3],[3,6,7,5,5,5,5,7,6,3],
   [3,6,8,5,4,4,5,8,6,3],[3,6,7,7,7,7,7,7,6,3],[3,6,6,6,6,6,6,6,6,3],[3,3,3,3,3,3,3,3,3,3]],
];

export function buildLevel(lvl){
  const world = getWorld(lvl);
  G.world = world;
  G.bricks = [];
  const pat = PATTERNS[(lvl - 1) % PATTERNS.length];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++){
    const ti = pat[r][c]; if (!ti) continue;
    const t = BTYPES[ti];
    G.bricks.push({
      x: 10 + c * 48, y: 50 + r * 20, w: 44, h: 16,
      hitsLeft: t.hits, maxHits: t.hits,
      color: world.palette[ti], pts: t.pts,
      special: t.special || null,
      alive: true, glowPhase: Math.random() * Math.PI * 2,
    });
  }
}
