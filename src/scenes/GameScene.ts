import Phaser from 'phaser';
import {
  GAME_W, GAME_H,
  SQUAD_X, SQUAD_MIN_Y, SQUAD_MAX_Y, SQUAD_LERP,
  SOLDIER_GAP_Y, SOLDIER_GAP_X, SOLDIER_PER_COL, SQUAD_MAX_VISUAL, SOLDIER_BOB,
  BULLET_SPEED, BULLET_STACK_GAP, ENEMY_BULLET_SPEED,
  POWER_TABLE, POWER_START,
  ENEMY_TYPE_TEX, BOSS_TYPE_MIN, BOSS_SLOT_STEP, ENEMY_SPEED_UNIT, ENEMY_FIRE_INTERVAL, ENEMY_SCATTER_DEG,
  ENEMY_SLOTS, ENEMY_SLOT_TOP, ENEMY_SLOT_BOT,
  TIDE_INTERVAL, TIDE_ROW_GAP, TIDE_Y_TOP, TIDE_Y_BOT, TIDE_HP, TIDE_ATK, TIDE_SPEED, ENEMY_CAP, TIDE_PIERCE_COUNT,
  WAVE_HP_MAX,
  LEVEL_DURATION_MS, GATE_INTERVAL, GATE_SPEED,
  BG_SCROLL, TREE_SCROLL,
} from '../config/constants';
import { loadGates, loadLevel, levelCount, GateSpec, GateOption } from '../config/loader';
import { audio } from '../audio/AudioSystem';

interface GateLane {
  sprite: Phaser.GameObjects.Sprite;
  text:   Phaser.GameObjects.Text;
  option: GateOption;
}
interface GateEntry {
  top: GateLane;
  bot: GateLane;
  gray: boolean;
  triggered: boolean;
}

// Unified gate colours: buff = blue, debuff = red, unknown(quiz) = gray.
const GATE_BLUE = 0x2a7fff;
const GATE_RED  = 0xee3333;
const GATE_GRAY = 0x9a9a9a;
const GATE_DEPTH = 40;   // above enemies/soldiers/particles

export default class GameScene extends Phaser.Scene {
  // Background
  private skyBg!:    Phaser.GameObjects.TileSprite;
  private groundBg!: Phaser.GameObjects.TileSprite;
  private trees:     Phaser.GameObjects.Sprite[] = [];

  // Squad
  private squadX = SQUAD_X;
  private squadY = 240;
  private squadTargetY = 240;
  private soldierCount = 20;
  private soldierSprites: Phaser.GameObjects.Sprite[] = [];
  private squadBody!: Phaser.Physics.Arcade.Sprite;

  // Bullets
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!:  Phaser.Physics.Arcade.Group;
  private lastFireTime = 0;
  private shootSoundTick = 0;

  // Weapon power (1-based index into POWER_TABLE)
  private power = POWER_START;

  // Enemies
  private enemies!: Phaser.Physics.Arcade.Group;

  // Level / config
  private level = 1;
  private levelWaves: ReturnType<typeof loadLevel> = [];
  private gateSpecs:  GateSpec[] = [];
  private gateIdx = 0;
  private startTime = 0;
  private levelCleared = false;

  // Timers
  private tideEvt:      Phaser.Time.TimerEvent | null = null;
  private gateEvt:      Phaser.Time.TimerEvent | null = null;
  private countdownEvt: Phaser.Time.TimerEvent | null = null;
  private waveTimers: Phaser.Time.TimerEvent[] = [];
  private levelEndTimer: Phaser.Time.TimerEvent | null = null;

  // Gates
  private gates: GateEntry[] = [];

  // Combo
  private comboCount = 0;
  private lastKillTime = 0;
  private explodeTick = 0;

  // Particles + overlay
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private overlay: Phaser.GameObjects.Container | null = null;

  // State
  private gameOver = false;
  private score = 0;
  private frameTime = 0;

  constructor() { super({ key: 'Game' }); }

  // ════════════════════════════════════════════════════════════════
  create() {
    this.gameOver       = false;
    this.levelCleared   = false;
    this.score          = 0;
    this.soldierCount   = 20;
    this.squadY         = 240;
    this.squadTargetY   = 240;
    this.power          = POWER_START;
    this.level          = 1;
    this.gates          = [];
    this.trees          = [];
    this.soldierSprites = [];
    this.waveTimers     = [];
    this.lastFireTime   = 0;
    this.frameTime      = 0;
    this.gateIdx        = 0;
    this.comboCount     = 0;
    this.lastKillTime   = 0;
    this.explodeTick    = 0;
    this.overlay        = null;

    this.createBackground();
    this.createSquad();
    this.createBulletGroups();
    this.createEnemyGroup();
    this.createParticles();
    this.setupColliders();
    this.setupInput();

    this.gateSpecs = loadGates();
    this.loadLevelConfig();
    this.startLevel();

    this.scene.launch('UI');
    this.events.once('uiReady', () => {
      this.events.emit('squadCount', this.soldierCount);
      this.events.emit('scoreUpdate', this.score);
      this.emitPower();
      this.events.emit('timeLeft', Math.ceil(LEVEL_DURATION_MS / 1000));
    });
  }

  private loadLevelConfig() {
    this.levelWaves = loadLevel(this.level);
  }

  // ── Background ──────────────────────────────────────────────────
  private createBackground() {
    this.skyBg = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'sky').setDepth(0);
    this.add.rectangle(GAME_W / 2, 300, GAME_W, 200, 0x4a3a1e, 0.45).setDepth(1);
    this.add.rectangle(GAME_W / 2, GAME_H - 18, GAME_W, 36, 0x3d2a12).setDepth(2);
    this.groundBg = this.add.tileSprite(GAME_W / 2, GAME_H - 36, GAME_W, 56, 'ground').setDepth(2);

    for (let i = 0; i < 10; i++) {
      const t = this.add.sprite(
        60 + i * 82 + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(265, 345), 'tree'
      ).setScale(0.45 + Math.random() * 0.45).setAlpha(0.45 + Math.random() * 0.3).setDepth(3);
      this.trees.push(t);
    }
  }

  // ── Squad ────────────────────────────────────────────────────────
  private createSquad() {
    this.squadBody = this.physics.add.sprite(this.squadX, this.squadY, 'soldier');
    this.squadBody.setVisible(false).setDepth(6).setImmovable(true);
    (this.squadBody.body as Phaser.Physics.Arcade.Body).setSize(58, 82).setAllowGravity(false);
    this.rebuildSoldierVisuals();
  }

  private rebuildSoldierVisuals() {
    this.soldierSprites.forEach(s => s.destroy());
    this.soldierSprites = [];
    const visible = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    for (let i = 0; i < visible; i++) this.soldierSprites.push(this.add.sprite(0, 0, 'soldier').setDepth(10));
    this.updateSoldierPositions(this.frameTime);
  }

  private soldierSlot(i: number, n: number): { x: number; y: number } {
    const col        = Math.floor(i / SOLDIER_PER_COL);
    const rowInCol   = i % SOLDIER_PER_COL;
    const totalInCol = Math.min(n - col * SOLDIER_PER_COL, SOLDIER_PER_COL);
    return {
      x: this.squadX - col * SOLDIER_GAP_X,
      y: this.squadY + (rowInCol - (totalInCol - 1) / 2) * SOLDIER_GAP_Y,
    };
  }

  private updateSoldierPositions(time: number) {
    const n = this.soldierSprites.length;
    for (let i = 0; i < n; i++) {
      const slot = this.soldierSlot(i, n);
      const bob  = Math.sin(time * 0.006 + i * 0.9) * SOLDIER_BOB;
      this.soldierSprites[i].setPosition(slot.x, slot.y + bob);
    }
  }

  private syncSoldierVisuals() {
    const target = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    while (this.soldierSprites.length < target) {
      const s = this.add.sprite(this.squadX, this.squadY, 'soldier').setDepth(10).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 300 });
      this.soldierSprites.push(s);
    }
    while (this.soldierSprites.length > target) {
      const s = this.soldierSprites.pop();
      if (!s) break;
      this.tweens.add({ targets: s, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 240, onComplete: () => s.destroy() });
    }
  }

  // ── Groups / particles / colliders / input ───────────────────────
  private createBulletGroups() {
    this.playerBullets = this.physics.add.group({ defaultKey: 'bullet',       maxSize: 600, allowGravity: false });
    this.enemyBullets  = this.physics.add.group({ defaultKey: 'enemy_bullet', maxSize: 220, allowGravity: false });
  }

  private createEnemyGroup() {
    this.enemies = this.physics.add.group({ allowGravity: false });
  }

  private createParticles() {
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 180 }, angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 }, lifespan: 360, blendMode: 'ADD', emitting: false,
    }).setDepth(20);
  }

  private setupColliders() {
    this.physics.add.overlap(this.playerBullets, this.enemies,
      this.onBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.squadBody, this.enemies,
      this.onEnemyTouchSquad as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.squadBody, this.enemyBullets,
      this.onEnemyBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
  }

  private setupInput() {
    const clamp = (y: number) => Phaser.Math.Clamp(y, SQUAD_MIN_Y, SQUAD_MAX_Y);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.gameOver && !this.levelCleared) this.squadTargetY = clamp(p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !this.gameOver && !this.levelCleared) this.squadTargetY = clamp(p.y);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  Level lifecycle
  // ════════════════════════════════════════════════════════════════
  private startLevel() {
    this.startTime = this.time.now;

    // Level countdown (seconds) — its own ticking timer, independent of update().
    const tick = () => {
      const s = Math.max(0, Math.ceil((LEVEL_DURATION_MS - this.elapsed()) / 1000));
      this.events.emit('timeLeft', s);
    };
    tick();
    this.countdownEvt = this.time.addEvent({ delay: 250, loop: true, callback: tick });

    // Continuous basic-soldier tide.
    this.tideEvt = this.time.addEvent({ delay: TIDE_INTERVAL, loop: true, callback: () => this.spawnTideColumn() });
    this.spawnTideColumn();

    // Reward gates rotate through the config.
    this.gateEvt = this.time.addEvent({ delay: GATE_INTERVAL, startAt: GATE_INTERVAL - 3500, loop: true, callback: () => this.spawnNextGate() });

    // Schedule typed-enemy waves across the level duration.
    const n = this.levelWaves.length;
    for (let i = 0; i < n; i++) {
      const t = 8000 + (i * (LEVEL_DURATION_MS - 16000)) / Math.max(n - 1, 1);
      const w = this.levelWaves[i];
      this.waveTimers.push(this.time.delayedCall(t, () => this.spawnWaveSpec(w)));
    }

    // Level complete after the duration.
    this.levelEndTimer = this.time.delayedCall(LEVEL_DURATION_MS, () => this.levelComplete());
  }

  private stopLevelTimers() {
    this.tideEvt?.remove();       this.tideEvt = null;
    this.gateEvt?.remove();       this.gateEvt = null;
    this.countdownEvt?.remove();  this.countdownEvt = null;
    this.levelEndTimer?.remove(); this.levelEndTimer = null;
    this.waveTimers.forEach(t => t.remove());
    this.waveTimers = [];
  }

  private elapsed() { return this.time.now - this.startTime; }

  // A gray quiz gate is on screen and awaiting a choice.
  private quizActive() { return this.gates.some(g => g.gray && !g.triggered); }

  // Camera shake, but suppressed while a quiz gate is up so the formula stays readable.
  private shake(duration: number, intensity: number) {
    if (this.quizActive()) return;
    this.cameras.main.shake(duration, intensity);
  }

  // ── Basic tide (neat, can overlap, HP 1) ─────────────────────────
  private spawnTideColumn() {
    if (this.gameOver || this.levelCleared) return;
    if (this.enemies.countActive(true) > ENEMY_CAP) return;
    // Tide HP tracks firepower so a piercing bullet mows ~TIDE_PIERCE_COUNT of
    // them (not the whole column), keeping the horde a threat as you grow.
    const hp = Math.max(TIDE_HP, Math.ceil(this.bulletDamage() / TIDE_PIERCE_COUNT));
    for (let y = TIDE_Y_TOP; y <= TIDE_Y_BOT; y += TIDE_ROW_GAP) {
      this.spawnEnemy(GAME_W + 20, y, 'enemy_soldier', hp, TIDE_ATK, TIDE_SPEED, 0, 0);
    }
  }

  // ── Typed enemy wave from config ─────────────────────────────────
  private slotY(slot: number): number {
    const s = Phaser.Math.Clamp(slot, 1, ENEMY_SLOTS);
    return ENEMY_SLOT_TOP + (ENEMY_SLOT_BOT - ENEMY_SLOT_TOP) * (s - 1) / (ENEMY_SLOTS - 1);
  }

  private spawnWaveSpec(w: ReturnType<typeof loadLevel>[number]) {
    if (this.gameOver || this.levelCleared) return;
    const tex = ENEMY_TYPE_TEX[w.type] ?? 'e_brute';
    const spd = w.speed * ENEMY_SPEED_UNIT;
    const hp  = this.resolveWaveHp(w, spd);
    const step = w.type >= BOSS_TYPE_MIN ? BOSS_SLOT_STEP : 1;  // bosses spread out
    for (let i = 0; i < w.count; i++) {
      const y = this.slotY(w.firstSlot + i * step);
      const x = GAME_W + 30 + (i % 2) * 14;   // slight stagger to reduce overlap
      const e = this.spawnEnemy(x, y, tex, hp, w.atk, spd, w.attackType, ENEMY_FIRE_INTERVAL, true);
      if (w.reward) e.setData('reward', w.reward);
    }
  }

  // Estimate damage/sec one focused enemy soaks at current firepower.
  // (~one soldier per column shares each row-line, so columns ≈ hits/burst.)
  private estimateFocusDps(): number {
    const pw = POWER_TABLE[this.power - 1];
    const n = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    if (n === 0) return 1;
    const columns = Math.max(1, Math.ceil(n / SOLDIER_PER_COL));
    const perBurst = columns * pw.bullets * this.bulletDamage();
    return perBurst * 1000 / pw.fireRate;
  }

  // Absolute HP, or for "~N" a firepower-relative HP so the enemy dies at ~N%
  // of its journey (keeps pace with how strong you've grown).
  private resolveWaveHp(w: ReturnType<typeof loadLevel>[number], spd: number): number {
    if (!w.hpRel) return w.hp;
    const travelSec = ((GAME_W + 30) - this.squadX) / Math.max(1, spd);
    const target = this.estimateFocusDps() * travelSec * (w.hp / 100);
    return Phaser.Math.Clamp(Math.round(target), 1, WAVE_HP_MAX);
  }

  // ── Enemy factory (atk = soldiers lost per hit; attackType drives fire) ──
  private spawnEnemy(
    x: number, y: number, tex: string,
    hp: number, atk: number, spd: number, attackType: number, fireInterval: number,
    hpBar = false
  ) {
    const e = this.enemies.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    e.setData({ hp, maxHp: hp, atk, attackType, fireEvt: null, hpBar: null, hpFill: null, hpText: null, hpW: 0 });
    e.setActive(true).setVisible(true).setDepth(8);
    (e.body as Phaser.Physics.Arcade.Body).setVelocityX(-spd).setAllowGravity(false);

    if (hpBar) this.makeHpBar(e, hp);

    if (fireInterval > 0 && attackType > 0) {
      const evt = this.time.addEvent({
        delay: fireInterval, loop: true, startAt: fireInterval * 0.5,
        callback: () => {
          if (!e.active || this.gameOver || this.levelCleared || e.x > GAME_W) return;
          this.enemyFire(e, attackType, atk);
        },
      });
      e.setData('fireEvt', evt);
    }
    return e;
  }

  private enemyFire(e: Phaser.Physics.Arcade.Sprite, attackType: number, dmg: number) {
    const x = e.x - 12, y = e.y;
    if (attackType === 2) {
      const h = ENEMY_SCATTER_DEG / 2;
      for (const d of [180 - h, 180, 180 + h]) this.spawnEnemyBullet(x, y, d, dmg);
    } else {
      this.spawnEnemyBullet(x, y, 180, dmg);
    }
  }

  private spawnEnemyBullet(x: number, y: number, angleDeg: number, dmg: number) {
    const b = this.enemyBullets.get() as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.enableBody(true, x, y, true, true);
    b.setDepth(7).setData('dmg', dmg);
    const rad = Phaser.Math.DegToRad(angleDeg);
    (b.body as Phaser.Physics.Arcade.Body)
      .setVelocity(Math.cos(rad) * ENEMY_BULLET_SPEED, Math.sin(rad) * ENEMY_BULLET_SPEED)
      .setAllowGravity(false);
  }

  private destroyEnemy(enemy: Phaser.Physics.Arcade.Sprite, fromGroup: boolean) {
    const evt = enemy.getData('fireEvt') as Phaser.Time.TimerEvent | null;
    if (evt) { evt.remove(); enemy.setData('fireEvt', null); }
    const bar = enemy.getData('hpBar') as Phaser.GameObjects.Container | null;
    if (bar) { bar.destroy(); enemy.setData('hpBar', null); }
    if (fromGroup) this.enemies.remove(enemy, true, true);
    else enemy.disableBody(true, true);
  }

  // ── Per-enemy HP bar (typed "mini-boss" enemies only) ─────────────
  private makeHpBar(e: Phaser.Physics.Arcade.Sprite, hp: number) {
    const big = e.displayWidth > 70;     // big single boss
    // Bar/font scale with the boss's width so it reads clearly (not tiny).
    const w  = big
      ? Phaser.Math.Clamp(Math.round(e.displayWidth * 0.9), 80, 140)
      : Phaser.Math.Clamp(Math.round(e.displayWidth * 0.7), 36, 60);
    const barH = big ? 10 : 5;
    const font = big ? '22px' : '11px';
    const yOff = big ? -18 : -12;

    const bg   = this.add.rectangle(0, 0, w + 3, barH + 2, 0x000000, 0.7);
    const fill = this.add.rectangle(-w / 2, 0, w, barH, 0x33dd44).setOrigin(0, 0.5);
    const txt  = this.add.text(0, yOff, `${hp}`, {
      fontSize: font, fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: big ? 5 : 3,
    }).setOrigin(0.5);
    const c = this.add.container(e.x, e.y, [bg, fill, txt]).setDepth(55);   // top layer
    e.setData('hpBar', c); e.setData('hpFill', fill); e.setData('hpText', txt);
    e.setData('hpW', w); e.setData('hpShown', hp); e.setData('hpYOff', barH);
  }

  // Render the bar from the eased "shown" value (drain/countdown effect).
  private renderHpBar(e: Phaser.Physics.Arcade.Sprite) {
    const fill = e.getData('hpFill') as Phaser.GameObjects.Rectangle | null;
    if (!fill) return;
    const maxHp = e.getData('maxHp') as number;
    const w     = e.getData('hpW') as number;
    const shown = e.getData('hpShown') as number;
    const ratio = maxHp > 0 ? Phaser.Math.Clamp(shown / maxHp, 0, 1) : 0;
    fill.width = w * ratio;
    fill.setFillStyle(ratio > 0.5 ? 0x33dd44 : ratio > 0.25 ? 0xffaa22 : 0xff3333);
    (e.getData('hpText') as Phaser.GameObjects.Text).setText(`${Math.ceil(shown)}`);
  }

  // ════════════════════════════════════════════════════════════════
  //  Reward gates (config-driven; gray = quiz)
  // ════════════════════════════════════════════════════════════════
  private spawnNextGate() {
    if (this.gameOver || this.levelCleared || this.gateSpecs.length === 0) return;
    const spec = this.gateSpecs[this.gateIdx % this.gateSpecs.length];
    this.gateIdx++;
    this.spawnGate(spec);
  }

  private optionLabel(o: GateOption): string {
    if (o.kind === 'count') {
      const sym = o.op === '*' ? '×' : o.op === '/' ? '÷' : o.op;
      return `${sym}${o.val}`;
    }
    if (o.kind === 'power') return `P${o.delta > 0 ? '+' : ''}${o.delta}`;
    return o.expr.replace(/\*/g, '×').replace(/\//g, '÷'); // quiz equation, prettified
  }

  // Unified colour: gray = unknown(quiz), blue = buff, red = debuff.
  private optionColor(o: GateOption, gray: boolean): number {
    if (gray) return GATE_GRAY;
    if (o.kind === 'count') return (o.op === '+' || o.op === '*') ? GATE_BLUE : GATE_RED;
    if (o.kind === 'power') return o.delta > 0 ? GATE_BLUE : GATE_RED;
    return GATE_GRAY;
  }

  private spawnGate(spec: GateSpec) {
    const gx = GAME_W + 50;
    const makeLane = (y: number, o: GateOption): GateLane => {
      // One unified panel shape for every gate; meaning comes from colour + label.
      const s = this.add.sprite(gx, y, 'gate_panel').setDepth(GATE_DEPTH)
        .setTint(this.optionColor(o, spec.gray));
      const t = this.add.text(gx, y, this.optionLabel(o), {
        fontSize: o.kind === 'quiz' ? '18px' : '24px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(GATE_DEPTH + 1);
      return { sprite: s, text: t, option: o };
    };
    this.gates.push({ top: makeLane(140, spec.top), bot: makeLane(340, spec.bot), gray: spec.gray, triggered: false });
  }

  private updateGates(delta: number) {
    const dx = GATE_SPEED * delta / 1000;
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.top.sprite.x -= dx; g.bot.sprite.x -= dx;
      g.top.text.x = g.top.sprite.x; g.bot.text.x = g.bot.sprite.x;

      if (!g.triggered && g.top.sprite.x < this.squadX + 38) {
        g.triggered = true;
        const pickTop = Math.abs(this.squadY - g.top.sprite.y) < Math.abs(this.squadY - g.bot.sprite.y);
        const lane  = pickTop ? g.top : g.bot;
        const other = pickTop ? g.bot : g.top;
        this.applyGateOption(lane.option);

        // The gate is "spent" — clear it from the screen at once.
        this.tweens.add({ targets: lane.sprite, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 150,
          onComplete: () => lane.sprite.destroy() });
        other.sprite.destroy();
        lane.text.destroy(); other.text.destroy();
        this.gates.splice(i, 1);
        continue;
      }

      if (g.top.sprite.x < -110) {   // fallback: never reached the squad
        g.top.sprite.destroy(); g.bot.sprite.destroy();
        g.top.text.destroy();   g.bot.text.destroy();
        this.gates.splice(i, 1);
      }
    }
  }

  private applyGateOption(o: GateOption) {
    audio.gate();
    if (o.kind === 'power') { this.applyPowerDelta(o.delta); return; }

    let delta = 0;
    let label = '';
    let bad = false;

    if (o.kind === 'count') {
      const before = this.soldierCount;
      if      (o.op === '+') this.soldierCount += o.val;
      else if (o.op === '-') this.soldierCount -= o.val;
      else if (o.op === '*') this.soldierCount = Math.floor(this.soldierCount * o.val);
      else if (o.op === '/') this.soldierCount = Math.floor(this.soldierCount / o.val);
      delta = this.soldierCount - before;
      label = this.optionLabel(o);
      bad = delta < 0;
    } else { // quiz
      delta = o.correct ? o.mag : -o.mag;
      this.soldierCount += delta;
      label = `${o.expr}  ${o.correct ? '✓' : '✗'} ${delta > 0 ? '+' : ''}${delta}`;
      bad = !o.correct;
    }

    this.soldierCount = Math.max(0, this.soldierCount);
    this.syncSoldierVisuals();
    this.events.emit('squadCount', this.soldierCount);
    this.floatLabel(label, bad ? '#ff4444' : '#ffee22');
    if (this.soldierCount <= 0) this.endGame(false);
  }

  private applyPowerDelta(d: number) {
    const before = this.power;
    this.power = Phaser.Math.Clamp(this.power + d, 1, POWER_TABLE.length);
    this.emitPower();
    if (this.power !== before) this.cameras.main.flash(160, 120, 200, 255);
    this.floatLabel(`P${d > 0 ? '+' : ''}${d}`, d > 0 ? '#66ddff' : '#ff8844');
  }

  private emitPower() {
    const w = POWER_TABLE[this.power - 1];
    this.events.emit('powerChanged', { level: this.power, max: POWER_TABLE.length, tint: w.tint });
  }

  private bossDownBanner(rewardLabel: string) {
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 70, `BOSS DOWN!  ${rewardLabel}`, {
      fontSize: '30px', fontStyle: 'bold', color: '#ffee44', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(61).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 240, ease: 'Back.easeOut',
      yoyo: true, hold: 750, onComplete: () => t.destroy() });
  }

  private floatLabel(text: string, color: string) {
    const pop = this.add.text(this.squadX - 10, this.squadY - 55, text, {
      fontSize: '24px', fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 4,
    }).setDepth(30).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: pop.y - 65, alpha: 0, duration: 1100, onComplete: () => pop.destroy() });
  }

  // ════════════════════════════════════════════════════════════════
  //  Collisions
  // ════════════════════════════════════════════════════════════════
  private onBulletHitEnemy(
    b: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    e: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const bullet = b as Phaser.Physics.Arcade.Sprite;
    const enemy  = e as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active || !enemy.active) return;

    this.sparks.emitParticleAt(enemy.x, enemy.y, 4);

    // Piercing: the bullet spends its remaining damage on this enemy and keeps
    // going if any is left over.
    let dmgLeft  = (bullet.getData('dmgLeft') as number) ?? 1;
    const ehp    = enemy.getData('hp') as number;
    const dealt  = Math.min(dmgLeft, ehp);
    dmgLeft -= dealt;
    bullet.setData('dmgLeft', dmgLeft);

    const hp = ehp - dealt;
    enemy.setData('hp', hp);
    this.tweens.add({ targets: enemy, alpha: 0.3, duration: 50, yoyo: true });

    if (hp <= 0) this.onEnemyKilled(enemy);
    // bar drains toward the new hp in update() (countdown effect)

    if (dmgLeft <= 0) bullet.disableBody(true, true);   // pierce budget spent
  }

  private onEnemyTouchSquad(
    _sq: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    e:  Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const enemy = e as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active) return;
    const now  = this.time.now;
    const last = (enemy.getData('lastDmgTime') as number) ?? 0;
    if (now - last < 800) return;
    enemy.setData('lastDmgTime', now);
    this.takeDamage(enemy.getData('atk') as number);
  }

  private onEnemyBulletHit(
    _sq: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    b:  Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const bullet = b as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active) return;
    const dmg = (bullet.getData('dmg') as number) ?? 1;
    bullet.disableBody(true, true);
    this.takeDamage(dmg);
  }

  private takeDamage(amount: number) {
    if (this.gameOver) return;
    audio.hit();
    this.shake(75, 0.007);
    this.soldierCount = Math.max(0, this.soldierCount - amount);
    this.events.emit('squadCount', this.soldierCount);
    this.syncSoldierVisuals();
    if (this.soldierCount <= 0) this.endGame(false);
  }

  private onEnemyKilled(enemy: Phaser.Physics.Arcade.Sprite) {
    const ex = enemy.x, ey = enemy.y;
    const maxHp = enemy.getData('maxHp') as number;
    this.score += 10 + Math.floor(maxHp / 20);
    this.events.emit('scoreUpdate', this.score);

    // Boss kill reward (from the level config's optional 8th field).
    const reward = enemy.getData('reward') as GateOption | undefined;
    if (reward) {
      this.sparks.emitParticleAt(ex, ey, 48);
      this.shake(320, 0.02);
      this.bossDownBanner(this.optionLabel(reward));
      this.applyGateOption(reward);
    }

    const now = this.time.now;
    this.comboCount = (now - this.lastKillTime < 700) ? this.comboCount + 1 : 1;
    this.lastKillTime = now;

    this.sparks.emitParticleAt(ex, ey, 12 + Math.min(this.comboCount, 12));
    this.explodeTick = (this.explodeTick + 1) % 3;
    if (this.explodeTick === 0) audio.explode();
    if (this.comboCount >= 3) {
      this.shake(60, 0.002 + Math.min(this.comboCount, 20) * 0.0004);
      this.events.emit('combo', this.comboCount);
    }
    this.destroyEnemy(enemy, true);
  }

  // ════════════════════════════════════════════════════════════════
  //  Player fire
  // ════════════════════════════════════════════════════════════════
  private firePlayerBullets(time: number) {
    const w = POWER_TABLE[this.power - 1];
    if (time - this.lastFireTime < w.fireRate) return;
    this.lastFireTime = time;

    const n = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const slot = this.soldierSlot(i, n);
      const bx = slot.x + 13;
      for (let k = 0; k < w.bullets; k++) {
        const offY = (k - (w.bullets - 1) / 2) * BULLET_STACK_GAP;
        this.spawnPlayerBullet(bx, slot.y + offY, w.tint);
      }
    }
    this.shootSoundTick = (this.shootSoundTick + 1) % 3;
    if (this.shootSoundTick === 0) audio.shoot();
  }

  private spawnPlayerBullet(bx: number, by: number, tint: number) {
    const b = this.playerBullets.get() as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.enableBody(true, bx, by, true, true);
    b.setDepth(6).setTint(tint).setData('dmgLeft', this.bulletDamage());  // pierce budget
    (b.body as Phaser.Physics.Arcade.Body).setVelocity(BULLET_SPEED, 0).setAllowGravity(false);
  }

  // Per-bullet damage = weapon power × headcount multiplier.
  // Only SQUAD_MAX_VISUAL soldiers fire, so extra troops boost damage instead
  // of bullet count (stable perf, but more soldiers ⇒ more firepower).
  private bulletDamage(): number {
    const mult = Math.max(1, Math.ceil(this.soldierCount / SQUAD_MAX_VISUAL));
    return POWER_TABLE[this.power - 1].dmg * mult;
  }

  // ════════════════════════════════════════════════════════════════
  //  Level complete / next level / game over
  // ════════════════════════════════════════════════════════════════
  private levelComplete() {
    if (this.gameOver || this.levelCleared) return;
    this.levelCleared = true;
    this.stopLevelTimers();
    audio.victory();

    const hasNext = this.level < levelCount();
    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 30, `LEVEL ${this.level} CLEARED`, {
      fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 26,
      hasNext ? 'TAP TO CONTINUE' : 'TAP TO FINISH', {
      fontSize: '20px', color: '#ffee44', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.45);
    this.overlay = this.add.container(0, 0, [bg, title, hint]).setDepth(60);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Small delay so an in-progress tap doesn't instantly skip.
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => {
        if (hasNext) this.goToNextLevel();
        else this.endGame(true);
      });
    });
  }

  private goToNextLevel() {
    this.level++;
    this.loadLevelConfig();

    // Clear the field (keep soldiers & power as progression).
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).slice().forEach(s => this.destroyEnemy(s, true));
    this.cullGroup(this.playerBullets, () => true);
    this.cullGroup(this.enemyBullets, () => true);
    this.gates.forEach(g => { g.top.sprite.destroy(); g.bot.sprite.destroy(); g.top.text.destroy(); g.bot.text.destroy(); });
    this.gates = [];
    this.gateIdx = 0;
    this.overlay?.destroy(); this.overlay = null;

    this.levelCleared = false;
    this.startLevel();
  }

  private endGame(win: boolean) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.stopLevelTimers();
    this.time.delayedCall(win ? 100 : 700, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', { win, score: this.score, soldierCount: this.soldierCount });
    });
  }

  // ════════════════════════════════════════════════════════════════
  update(time: number, delta: number) {
    this.frameTime = time;
    if (this.gameOver || this.levelCleared) return;

    this.skyBg.tilePositionX    += 0.35;
    this.groundBg.tilePositionX += BG_SCROLL;
    this.trees.forEach(t => { t.x -= TREE_SCROLL; if (t.x < -55) t.x = GAME_W + 55; });

    this.squadY = Phaser.Math.Linear(this.squadY, this.squadTargetY, SQUAD_LERP);
    this.squadBody.setY(this.squadY);
    this.updateSoldierPositions(time);
    this.firePlayerBullets(time);
    this.updateGates(delta);

    this.cullGroup(this.playerBullets, s => s.x > GAME_W + 30 || s.y < -30 || s.y > GAME_H + 30);
    this.cullGroup(this.enemyBullets,  s => s.x < -30 || s.x > GAME_W + 30 || s.y < -30 || s.y > GAME_H + 30);
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(s => {
      if (!s.active) return;
      if (s.x < -130) { this.destroyEnemy(s, true); return; }
      const bar = s.getData('hpBar') as Phaser.GameObjects.Container | null;
      if (!bar) return;
      const barH = (s.getData('hpYOff') as number) ?? 6;
      bar.setPosition(s.x, s.y - s.displayHeight / 2 - barH - 8);
      // Ease the shown HP toward actual HP → draining "countdown" effect.
      const hp = Math.max(0, s.getData('hp') as number);
      let shown = (s.getData('hpShown') as number) ?? hp;
      if (Math.abs(shown - hp) > 0.5) {
        shown = Phaser.Math.Linear(shown, hp, 0.16);
        if (Math.abs(shown - hp) <= 0.5) shown = hp;
        s.setData('hpShown', shown);
        this.renderHpBar(s);
      }
    });
  }

  private cullGroup(group: Phaser.Physics.Arcade.Group, pred: (s: Phaser.Physics.Arcade.Sprite) => boolean) {
    (group.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(s => {
      if (s.active && pred(s)) s.disableBody(true, true);
    });
  }
}
