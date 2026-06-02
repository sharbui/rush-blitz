export const GAME_W = 800;
export const GAME_H = 480;

export const SQUAD_X = 180;
export const SQUAD_MIN_Y = 90;          // tighter play band (was 70)
export const SQUAD_MAX_Y = 400;         // tighter play band (was 410)
export const SQUAD_LERP = 0.13;

// Formation density (tighter = less kiddie sprawl)
export const SOLDIER_GAP_Y = 13;        // row gap within a column (was 22)
export const SOLDIER_GAP_X = 15;        // column gap (was 22)
export const SOLDIER_PER_COL = 6;       // soldiers per column (was 5)
export const SQUAD_MAX_VISUAL = 30;     // max rendered soldiers (was 20)
export const SOLDIER_BOB = 1.5;         // idle bob amplitude (was 2.5)

export const BULLET_SPEED = 900;
export const ENEMY_BULLET_SPEED = 320;        // boss / aimed bullets
export const ENEMY_BULLET_SPEED_GRUNT = 240;  // slower grunt bullets

// ── Weapon progression ────────────────────────────────────────────
// Bullets are STRAIGHT (left → right). Weapon tiers are unlocked by reward
// gates (the ⚡ option), NOT by kills. Fire rate ramps gently and caps so it
// never becomes uncontrollably fast; higher tiers add stacked straight bullets.
export interface WeaponTier {
  name: string;
  fireRate: number;   // ms between bursts (lower = faster)
  bullets: number;    // straight bullets per soldier per burst
  tint: number;       // tracer colour
}
export const WEAPON_TIERS: WeaponTier[] = [
  { name: 'RIFLE',   fireRate: 180, bullets: 1, tint: 0xffee33 },
  { name: 'BURST',   fireRate: 150, bullets: 1, tint: 0xffaa22 },
  { name: 'RAPID',   fireRate: 115, bullets: 2, tint: 0x44ddff },
  { name: 'HEAVY',   fireRate:  92, bullets: 2, tint: 0xff5544 },
  { name: 'MINIGUN', fireRate:  74, bullets: 2, tint: 0xffffff },
];
export const BULLET_STACK_GAP = 5;      // y offset between a soldier's stacked bullets

// ── Continuous horde (basic soldiers never stop) ──────────────────
export const HORDE_INTERVAL = 380;      // ms between spawned columns (lower = denser)
export const HORDE_ROW_GAP  = 18;       // vertical gap inside a column (dense carpet)
export const HORDE_Y_TOP    = 64;
export const HORDE_Y_BOT     = 424;
export const ENEMY_CAP      = 240;      // perf guard: skip horde spawn above this many
export const BOSS_AT_MS     = 78000;    // boss appears after this long; horde keeps running

export const ENEMY_ROW_GAP = 24;        // fixed vertical gap for cavalry squads

export const BG_SCROLL = 2;
export const TREE_SCROLL = 1.5;
export const GATE_SPEED = 240;          // px/s (was 200 — less hesitation time)


export const BOSS_HP = 220;             // (was 150 — matches full-squad firepower)
export const BOSS_SPEED = 38;
export const BOSS_BULLET_SPEED = 380;   // faster than grunts
export const BOSS_FIRE_RATE    = 1400;  // phase 1 ms
export const BOSS_FIRE_RATE_P2 =  820;  // phase 2 ms
export const BOSS_FIRE_RATE_P3 =  480;  // phase 3 ms

export const ENEMY_DATA = {
  soldier: { hp: 4,  speed: 80,  dmg: 1, score: 10 },
  cavalry: { hp: 12, speed: 140, dmg: 3, score: 30 },  // dmg 2 → 3
} as const;
