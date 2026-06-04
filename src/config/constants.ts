export const GAME_W = 800;
export const GAME_H = 480;

export const SQUAD_X = 180;
export const SQUAD_MIN_Y = 90;
export const SQUAD_MAX_Y = 400;
export const SQUAD_LERP = 0.13;

// Squad formation density
export const SOLDIER_GAP_Y = 13;
export const SOLDIER_GAP_X = 15;
export const SOLDIER_PER_COL = 6;
export const SQUAD_MAX_VISUAL = 30;     // max rendered / firing soldiers
export const SOLDIER_BOB = 1.5;

export const BULLET_SPEED = 900;
export const BULLET_STACK_GAP = 5;      // y offset between a soldier's stacked bullets
export const ENEMY_BULLET_SPEED = 300;  // enemy bullets

// ── Weapon power (七彩) — index by power level (1-based) ───────────
// P+ / P- reward gates move the player up/down this table. Easy to tune.
// Base power 1 deals 1 damage → kills a 1-HP basic soldier in one shot.
export interface PowerLevel {
  dmg: number;       // damage per bullet
  fireRate: number;  // ms between bursts (lower = faster)
  bullets: number;   // bullets per soldier per burst
  tint: number;      // tracer colour (rainbow ramp)
}
export const POWER_TABLE: PowerLevel[] = [
  { dmg: 1,  fireRate: 170, bullets: 1, tint: 0xff3344 }, // 1 red
  { dmg: 1,  fireRate: 150, bullets: 1, tint: 0xff8822 }, // 2 orange
  { dmg: 2,  fireRate: 135, bullets: 1, tint: 0xffee33 }, // 3 yellow
  { dmg: 2,  fireRate: 120, bullets: 2, tint: 0x66dd33 }, // 4 green
  { dmg: 3,  fireRate: 108, bullets: 2, tint: 0x33ddcc }, // 5 cyan
  { dmg: 4,  fireRate:  96, bullets: 2, tint: 0x3399ff }, // 6 blue
  { dmg: 5,  fireRate:  86, bullets: 3, tint: 0x9955ff }, // 7 indigo
  { dmg: 7,  fireRate:  76, bullets: 3, tint: 0xff55ee }, // 8 violet
];
export const POWER_START = 1;           // starting power level (1-based)

// ── Enemy types (config "type" id → sprite) ───────────────────────
// Mobs 1-5; big single BOSSES 6-10 (basic tide soldier is separate).
// 1=tank 2=runner 3=brute 4=archer 5=shield
// 6=rex(dino) 7=mech(robot) 8=demon 9=beetle 10=golem
export const ENEMY_TYPE_TEX: Record<number, string> = {
  1: 'e_tank', 2: 'e_runner', 3: 'e_brute', 4: 'e_archer', 5: 'e_shield',
  6: 'b_rex',  7: 'b_mech',   8: 'b_demon', 9: 'b_beetle', 10: 'b_golem',
};
export const BOSS_TYPE_MIN = 6;         // type id ≥ this is a big single boss
export const BOSS_SLOT_STEP = 10;       // extra slot spacing when count > 1 bosses
export const ENEMY_TYPE_NAME: Record<number, string> = {
  1: 'TANK', 2: 'RUNNER', 3: 'BRUTE', 4: 'ARCHER', 5: 'SHIELD',
  6: 'REX',  7: 'MECH',   8: 'DEMON', 9: 'BEETLE', 10: 'GOLEM',
};
export const ENEMY_SPEED_UNIT = 26;     // config speed × this = px/s (3 ≈ 78)
export const ENEMY_FIRE_INTERVAL = 1700;// ms between shots for typed enemies
export const ENEMY_SCATTER_DEG = 30;    // attackType 2 total spread (3 bullets)

// Vertical slot grid for typed-enemy spawn positions (firstSlot 1..N, mid ≈ 25)
export const ENEMY_SLOTS = 49;
export const ENEMY_SLOT_TOP = 70;
export const ENEMY_SLOT_BOT = 418;

// ── Basic-soldier tide (continuous, neat, can overlap, HP 1) ──────
export const TIDE_INTERVAL = 300;       // ms between tide columns (lower = denser)
export const TIDE_ROW_GAP  = 16;        // neat vertical spacing
export const TIDE_Y_TOP    = 66;
export const TIDE_Y_BOT    = 420;
export const TIDE_HP   = 1;             // floor HP (also the base-power case)
export const TIDE_ATK  = 1;             // soldiers lost on contact
export const TIDE_SPEED = 80;           // px/s
export const ENEMY_CAP = 360;           // perf guard: skip tide spawn above this many
// Bullets pierce, so tide HP scales with firepower → each bullet mows ~this many
// tide soldiers (keeps the horde a threat instead of getting wiped screen-wide).
export const TIDE_PIERCE_COUNT = 3;

// Config HP `~N` (relative) → HP = N% of the focused firepower an enemy would
// soak over its whole journey, so it dies at ~N% of the way in (tension that
// keeps pace with your growth). Plain numbers are absolute HP.
export const WAVE_HP_MAX = 12000;       // safety clamp so nothing is unkillable

// ── Level / gate cadence ──────────────────────────────────────────
export const LEVEL_DURATION_MS = 180000; // 3 minutes per level
export const GATE_INTERVAL = 8500;       // ms between reward gates
export const GATE_SPEED = 240;           // px/s gates travel left

export const BG_SCROLL = 2;
export const TREE_SCROLL = 1.5;
