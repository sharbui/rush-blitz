// Loads & parses the external config files (reward gates + level waves).
// Gate/level text files live alongside this module and are bundled via Vite's
// ?raw import, so editing them + reloading is enough (no rebuild step needed).

import gatesRaw from './gates.txt?raw';

// ── Types ─────────────────────────────────────────────────────────
export interface WaveSpec {
  type: number;        // enemy type id (1..5)
  hp: number;          // absolute HP, or (if hpRel) the N in "~N"
  hpRel: boolean;      // true when HP is given as "~N" (firepower-relative %)
  atk: number;         // soldiers the player loses per hit
  attackType: number;  // 1=straight 2=scatter30(3)
  speed: number;       // speed units
  count: number;
  firstSlot: number;   // vertical slot of the first enemy
  reward?: GateOption; // optional: granted when this enemy (boss) is killed
}

export type GateOption =
  | { kind: 'count'; op: '+' | '-' | '*' | '/'; val: number }
  | { kind: 'power'; delta: number }
  | { kind: 'quiz';  expr: string; correct: boolean; mag: number };

export interface GateSpec {
  gray: boolean;       // quiz gate?
  top: GateOption;
  bot: GateOption;
}

// ── Tiny arithmetic evaluator (for quiz equations) ────────────────
// Supports + - * / on non-negative integers, * / before + -.
function evalExpr(s: string): number {
  const tokens = s.match(/\d+(?:\.\d+)?|[+\-*/]/g) ?? [];
  const pass1: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '*' || t === '/') {
      const prev = pass1.pop() as number;
      const next = Number(tokens[++i]);
      pass1.push(t === '*' ? prev * next : prev / next);
    } else {
      pass1.push(/^\d/.test(t) ? Number(t) : t);
    }
  }
  let acc = pass1[0] as number;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i] as string;
    const n  = pass1[i + 1] as number;
    acc = op === '+' ? acc + n : acc - n;
  }
  return acc;
}

function isEquationCorrect(eq: string): boolean {
  const [l, r] = eq.split('=');
  if (r === undefined) return false;
  return Math.abs(evalExpr(l) - evalExpr(r)) < 1e-9;
}

// ── Line helpers ──────────────────────────────────────────────────
function cleanLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(l => l.replace(/#.*$/, '').trim())   // strip comments
    .filter(l => l.length > 0);
}

function parseGateOption(token: string): GateOption {
  const t = token.trim();
  if (t.startsWith('P+') || t.startsWith('P-')) {
    return { kind: 'power', delta: Number(t.slice(1)) };  // "P+1" -> +1, "P-1" -> -1
  }
  const op = t.charAt(0) as '+' | '-' | '*' | '/';
  return { kind: 'count', op, val: Number(t.slice(1)) };
}

function parseGateLine(line: string): GateSpec {
  const parts = line.split(',').map(s => s.trim());
  if (parts.some(p => p.includes('='))) {
    // Quiz gate: eq1, eq2, magnitude
    const mag = Number(parts[parts.length - 1]);
    const [eq1, eq2] = parts;
    return {
      gray: true,
      top: { kind: 'quiz', expr: eq1, correct: isEquationCorrect(eq1), mag },
      bot: { kind: 'quiz', expr: eq2, correct: isEquationCorrect(eq2), mag },
    };
  }
  return { gray: false, top: parseGateOption(parts[0]), bot: parseGateOption(parts[1]) };
}

// ── Public API ────────────────────────────────────────────────────
export function loadGates(): GateSpec[] {
  return cleanLines(gatesRaw).map(parseGateLine);
}

// Levels are discovered automatically: drop a levelN.txt to add a level.
const levelMods = import.meta.glob('./levels/*.txt', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const levelPaths = Object.keys(levelMods).sort((a, b) => {
  const na = Number(a.match(/level(\d+)/)?.[1] ?? 0);
  const nb = Number(b.match(/level(\d+)/)?.[1] ?? 0);
  return na - nb;
});

export function levelCount(): number {
  return levelPaths.length;
}

/** Load level `n` (1-based). Returns [] if it doesn't exist. */
export function loadLevel(n: number): WaveSpec[] {
  const path = levelPaths[n - 1];
  if (!path) return [];
  return cleanLines(levelMods[path]).map(line => {
    const p = line.split(',').map(s => s.trim());
    const hpRaw = p[1];
    const hpRel = hpRaw.startsWith('~');
    const hp    = Number(hpRel ? hpRaw.slice(1) : hpRaw);
    return {
      type:       Number(p[0]),
      hp, hpRel,
      atk:        Number(p[2]),
      attackType: Number(p[3]),
      speed:      Number(p[4]),
      count:      Number(p[5]),
      firstSlot:  Number(p[6]),
      reward:     p[7] ? parseGateOption(p[7]) : undefined,  // boss kill reward
    };
  });
}
