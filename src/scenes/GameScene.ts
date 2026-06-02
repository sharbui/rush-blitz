import Phaser from 'phaser';
import {
  GAME_W, GAME_H,
  SQUAD_X, SQUAD_MIN_Y, SQUAD_MAX_Y, SQUAD_LERP,
  SOLDIER_GAP_Y, SOLDIER_GAP_X, SOLDIER_PER_COL, SQUAD_MAX_VISUAL, SOLDIER_BOB,
  BULLET_SPEED, ENEMY_BULLET_SPEED, ENEMY_BULLET_SPEED_GRUNT,
  WEAPON_TIERS, BULLET_STACK_GAP,
  HORDE_INTERVAL, HORDE_ROW_GAP, HORDE_Y_TOP, HORDE_Y_BOT, ENEMY_CAP, BOSS_AT_MS,
  BG_SCROLL, TREE_SCROLL, GATE_SPEED, ENEMY_ROW_GAP,
  BOSS_HP, BOSS_SPEED, BOSS_BULLET_SPEED,
  BOSS_FIRE_RATE, BOSS_FIRE_RATE_P2, BOSS_FIRE_RATE_P3,
  ENEMY_DATA,
} from '../config/constants';
import { audio } from '../audio/AudioSystem';

interface GateEntry {
  topSprite: Phaser.GameObjects.Sprite;
  botSprite: Phaser.GameObjects.Sprite;
  topText:   Phaser.GameObjects.Text;
  botText:   Phaser.GameObjects.Text;
  topLabel:  string;
  botLabel:  string;
  triggered: boolean;
}

export default class GameScene extends Phaser.Scene {
  // Background
  private skyBg!:    Phaser.GameObjects.TileSprite;
  private groundBg!: Phaser.GameObjects.TileSprite;
  private trees:     Phaser.GameObjects.Sprite[] = [];

  // Squad
  private squadX = SQUAD_X;
  private squadY = 240;
  private squadTargetY = 240;
  private soldierCount = 5;
  private soldierSprites: Phaser.GameObjects.Sprite[] = [];
  private squadBody!: Phaser.Physics.Arcade.Sprite;

  // Bullets
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!:  Phaser.Physics.Arcade.Group;
  private lastFireTime = 0;
  private shootSoundTick = 0;

  // Weapon (upgraded via reward gates, not kills)
  private weaponTier = 0;

  // Continuous spawners
  private hordeEvt:   Phaser.Time.TimerEvent | null = null;
  private cavalryEvt: Phaser.Time.TimerEvent | null = null;
  private gateEvt:    Phaser.Time.TimerEvent | null = null;
  private startTime = 0;
  private gateIdx   = 0;

  // Kill combo (slaughter feedback)
  private comboCount   = 0;
  private lastKillTime = 0;
  private explodeTick  = 0;

  // Reward-gate rotation (⚡ = weapon upgrade)
  private readonly gatePool: [string, string][] = [
    ['⚡',  '+25'],
    ['×2', '-10'],
    ['⚡',  '×2'],
    ['+30', '÷2'],
    ['⚡',  '+20'],
    ['×2', '+18'],
  ];

  // Enemies
  private enemies!:     Phaser.Physics.Arcade.Group;
  private bossRef:      Phaser.Physics.Arcade.Sprite | null = null;
  private bossMaxHp =   BOSS_HP;
  private bossHp =      BOSS_HP;
  private bossPhase:    1 | 2 | 3 = 1;
  private bossFireEvt:  Phaser.Time.TimerEvent | null = null;

  // Gates
  private gates: GateEntry[] = [];

  // Particles
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  // State
  private gameOver = false;
  private score    = 0;
  private frameTime = 0;

  constructor() { super({ key: 'Game' }); }

  // ════════════════════════════════════════════════════════════════
  //  create
  // ════════════════════════════════════════════════════════════════
  create() {
    this.gameOver       = false;
    this.score          = 0;
    this.soldierCount   = 5;
    this.squadY         = 240;
    this.squadTargetY   = 240;
    this.bossRef        = null;
    this.bossPhase      = 1;
    this.bossFireEvt    = null;
    this.gates          = [];
    this.trees          = [];
    this.soldierSprites = [];
    this.lastFireTime   = 0;
    this.frameTime      = 0;
    this.weaponTier     = 0;
    this.hordeEvt       = null;
    this.cavalryEvt     = null;
    this.gateEvt        = null;
    this.startTime      = 0;
    this.gateIdx        = 0;
    this.comboCount     = 0;
    this.lastKillTime   = 0;
    this.explodeTick    = 0;

    this.createBackground();
    this.createSquad();
    this.createBulletGroups();
    this.createEnemyGroup();
    this.createParticles();
    this.setupColliders();
    this.setupInput();
    this.startSpawning();

    // Launch HUD overlay
    this.scene.launch('UI');

    // Push initial values once UI is ready
    this.events.once('uiReady', () => {
      this.events.emit('squadCount', this.soldierCount);
      this.events.emit('scoreUpdate', this.score);
      this.events.emit('weaponChanged', { name: WEAPON_TIERS[0].name, tier: 1, max: WEAPON_TIERS.length });
    });
  }

  // ── Background ──────────────────────────────────────────────────
  private createBackground() {
    this.skyBg = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'sky').setDepth(0);

    // Mid-ground road strip
    this.add.rectangle(GAME_W / 2, 300, GAME_W, 200, 0x4a3a1e, 0.45).setDepth(1);

    // Ground
    this.add.rectangle(GAME_W / 2, GAME_H - 18, GAME_W, 36, 0x3d2a12).setDepth(2);
    this.groundBg = this.add.tileSprite(GAME_W / 2, GAME_H - 36, GAME_W, 56, 'ground').setDepth(2);

    // Parallax trees
    for (let i = 0; i < 10; i++) {
      const t = this.add.sprite(
        60 + i * 82 + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(265, 345),
        'tree'
      ).setScale(0.45 + Math.random() * 0.45)
        .setAlpha(0.45 + Math.random() * 0.3)
        .setDepth(3);
      this.trees.push(t);
    }
  }

  // ── Squad ────────────────────────────────────────────────────────
  private createSquad() {
    this.squadBody = this.physics.add.sprite(this.squadX, this.squadY, 'soldier');
    this.squadBody.setVisible(false).setDepth(6);
    this.squadBody.setImmovable(true);
    (this.squadBody.body as Phaser.Physics.Arcade.Body).setSize(58, 82).setAllowGravity(false);

    this.rebuildSoldierVisuals();
  }

  private rebuildSoldierVisuals() {
    this.soldierSprites.forEach(s => s.destroy());
    this.soldierSprites = [];

    const visible = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    for (let i = 0; i < visible; i++) {
      this.soldierSprites.push(this.add.sprite(0, 0, 'soldier').setDepth(10));
    }
    this.updateSoldierPositions(this.frameTime);
  }

  // Grid slot for soldier index i (no bob). Shared by visuals + muzzle origin.
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
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const slot = this.soldierSlot(i, n);
      const bob  = Math.sin(time * 0.006 + i * 0.9) * SOLDIER_BOB;
      this.soldierSprites[i].setPosition(slot.x, slot.y + bob);
    }
  }

  // Add/remove rendered soldiers to match soldierCount (capped at SQUAD_MAX_VISUAL).
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
      this.tweens.add({
        targets: s, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 240,
        onComplete: () => s.destroy(),
      });
    }
  }

  // ── Bullet groups ────────────────────────────────────────────────
  private createBulletGroups() {
    this.playerBullets = this.physics.add.group({ defaultKey: 'bullet',       maxSize: 600, allowGravity: false });
    this.enemyBullets  = this.physics.add.group({ defaultKey: 'enemy_bullet', maxSize: 200, allowGravity: false });
  }

  // ── Enemy group ──────────────────────────────────────────────────
  private createEnemyGroup() {
    this.enemies = this.physics.add.group({ allowGravity: false });
  }

  // ── Particles ────────────────────────────────────────────────────
  private createParticles() {
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed:    { min: 40, max: 180 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 1, end: 0 },
      lifespan: 360,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(20);
  }

  // ── Colliders ────────────────────────────────────────────────────
  private setupColliders() {
    this.physics.add.overlap(
      this.playerBullets, this.enemies,
      this.onBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.overlap(
      this.squadBody, this.enemies,
      this.onEnemyTouchSquad as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.overlap(
      this.squadBody, this.enemyBullets,
      this.onEnemyBulletHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
  }

  // ── Input ────────────────────────────────────────────────────────
  private setupInput() {
    const clamp = (y: number) => Phaser.Math.Clamp(y, SQUAD_MIN_Y, SQUAD_MAX_Y);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.gameOver) this.squadTargetY = clamp(p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !this.gameOver) this.squadTargetY = clamp(p.y);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  Continuous spawning (seamless — no wave labels)
  // ════════════════════════════════════════════════════════════════
  private startSpawning() {
    this.startTime = this.time.now;

    // Basic soldiers stream in forever as a dense carpet.
    this.hordeEvt = this.time.addEvent({
      delay: HORDE_INTERVAL, loop: true, callback: () => this.spawnHordeColumn(),
    });
    // Periodic shooting cavalry squads add bullet threat.
    this.cavalryEvt = this.time.addEvent({
      delay: 6500, startAt: 5000, loop: true, callback: () => this.spawnCavalrySquad(),
    });
    // Reward gates rotate through the pool (⚡ = weapon upgrade).
    this.gateEvt = this.time.addEvent({
      delay: 9000, startAt: 5000, loop: true, callback: () => this.spawnNextGate(),
    });

    this.spawnHordeColumn();
    this.time.delayedCall(BOSS_AT_MS, () => this.spawnBoss());
  }

  private elapsed() { return this.time.now - this.startTime; }

  // Difficulty creeps up with time-in-run.
  private soldierHp() { return 3 + Math.floor(this.elapsed() / 13000); }
  private cavalryHp() { return 12 + Math.floor(this.elapsed() / 8000); }

  // A full-height, tightly-packed column of basic soldiers.
  private spawnHordeColumn() {
    if (this.gameOver) return;
    if (this.enemies.countActive(true) > ENEMY_CAP) return;   // perf guard

    const hp = this.soldierHp();
    for (let y = HORDE_Y_TOP; y <= HORDE_Y_BOT; y += HORDE_ROW_GAP) {
      const x  = GAME_W + 24 + Phaser.Math.Between(0, 24);
      const yy = y + Phaser.Math.Between(-4, 4);
      this.spawnEnemy(x, yy, 'enemy_soldier', hp, ENEMY_DATA.soldier.speed, 1, 0);
    }
  }

  private spawnCavalrySquad() {
    if (this.gameOver) return;
    const hp = this.cavalryHp();
    // Faster shots as the run goes on (clamped).
    const fireRate = Math.max(1100, 2000 - Math.floor(this.elapsed() / 1000) * 12);
    const count = 4;
    const blockH = (count - 1) * ENEMY_ROW_GAP;
    const y0 = Phaser.Math.Between(HORDE_Y_TOP + 20, HORDE_Y_BOT - 20 - blockH);
    for (let i = 0; i < count; i++) {
      this.spawnEnemy(GAME_W + 40, y0 + i * ENEMY_ROW_GAP, 'enemy_cavalry', hp, 150, ENEMY_DATA.cavalry.dmg, fireRate);
    }
  }

  private spawnNextGate() {
    if (this.gameOver) return;
    const [top, bot] = this.gatePool[this.gateIdx % this.gatePool.length];
    this.gateIdx++;
    this.spawnGates(top, bot);
  }

  private spawnEnemy(
    x: number, y: number, tex: string,
    hp: number, spd: number, dmg: number, fireRate = 0
  ) {
    const e = this.enemies.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    e.setData({ hp, maxHp: hp, speed: spd, dmg, lastDmgTime: 0, isBoss: false, fireEvt: null });
    e.setActive(true).setVisible(true).setDepth(8);
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-spd).setAllowGravity(false);

    // Shooting enemies fire straight left on a loop (dodgeable, predictable).
    if (fireRate > 0) {
      const evt = this.time.addEvent({
        delay: fireRate, loop: true,
        startAt: fireRate * 0.5,        // stagger first shot
        callback: () => {
          if (!e.active || this.gameOver || e.x > GAME_W) return;
          this.spawnEnemyBullet(e.x - 14, e.y, 180, ENEMY_BULLET_SPEED_GRUNT);
        },
      });
      e.setData('fireEvt', evt);
    }
    return e;
  }

  // Remove an enemy and tear down any attached fire timer (prevents leaks).
  private destroyEnemy(enemy: Phaser.Physics.Arcade.Sprite, fromGroup: boolean) {
    const evt = enemy.getData('fireEvt') as Phaser.Time.TimerEvent | null;
    if (evt) { evt.remove(); enemy.setData('fireEvt', null); }
    if (fromGroup) this.enemies.remove(enemy, true, true);
    else enemy.disableBody(true, true);
  }

  private spawnBoss() {
    if (this.gameOver) return;
    audio.bossRoar();
    this.cameras.main.shake(400, 0.012);

    // During the boss fight: pause gates & cavalry, thin the horde (but soldiers
    // never fully stop). Restored implicitly on scene restart.
    this.cavalryEvt?.remove(); this.cavalryEvt = null;
    this.gateEvt?.remove();    this.gateEvt = null;
    this.hordeEvt?.remove();
    this.hordeEvt = this.time.addEvent({
      delay: HORDE_INTERVAL * 2.4, loop: true, callback: () => this.spawnHordeColumn(),
    });

    this.bossMaxHp = BOSS_HP;
    this.bossHp    = BOSS_HP;
    this.bossPhase = 1;
    this.bossVolleyTick = 0;

    // Two shooting guard cavalry escort the boss in.
    this.spawnEnemy(GAME_W + 40, 150, 'enemy_cavalry', 24, 150, 3, 1800);
    this.spawnEnemy(GAME_W + 40, 330, 'enemy_cavalry', 24, 150, 3, 1800);

    const boss = this.enemies.create(GAME_W + 90, 240, 'boss_skull') as Phaser.Physics.Arcade.Sprite;
    boss.setData({ hp: BOSS_HP, maxHp: BOSS_HP, speed: BOSS_SPEED, dmg: 3, lastDmgTime: 0, isBoss: true });
    boss.setActive(true).setVisible(true).setScale(1.1).setDepth(9);
    const body = boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-BOSS_SPEED).setAllowGravity(false).setSize(68, 68);

    this.bossRef = boss;
    this.events.emit('bossSpawned', { maxHp: BOSS_HP, hp: BOSS_HP });

    this.startBossFireTimer(BOSS_FIRE_RATE);
  }

  private startBossFireTimer(delay: number) {
    if (this.bossFireEvt) { this.bossFireEvt.remove(); this.bossFireEvt = null; }
    this.bossFireEvt = this.time.addEvent({
      delay, loop: true,
      callback: () => {
        if (!this.bossRef?.active || this.gameOver) return;
        this.fireBossShot();
      },
    });
  }

  private checkBossPhase() {
    const ratio = this.bossHp / this.bossMaxHp;
    const next: 1 | 2 | 3 = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (next === this.bossPhase) return;
    this.bossPhase = next;
    this.cameras.main.flash(300, 255, next === 2 ? 140 : 60, 0);
    this.cameras.main.shake(280, 0.016);
    this.startBossFireTimer(next === 2 ? BOSS_FIRE_RATE_P2 : BOSS_FIRE_RATE_P3);
  }

  // Phase 1: 3-spread + aim   Phase 2: 5-fan aimed   Phase 3: 12-way + periodic aimed volley
  private bossVolleyTick = 0;
  private fireBossShot() {
    const bx = this.bossRef!.x - 44;
    const by = this.bossRef!.y;
    const s  = BOSS_BULLET_SPEED;
    const aim = () => Phaser.Math.RadToDeg(Math.atan2(this.squadY - by, this.squadX - bx));

    if (this.bossPhase === 1) {
      for (const deg of [-22, 0, 22]) this.spawnEnemyBullet(bx, by, 180 + deg, s);
      this.spawnEnemyBullet(bx, by, aim(), s);                 // +1 direct aim
    } else if (this.bossPhase === 2) {
      const a = aim();
      for (const offset of [-24, -12, 0, 12, 24]) this.spawnEnemyBullet(bx, by, a + offset, s);
    } else {
      for (let deg = 0; deg < 360; deg += 30) this.spawnEnemyBullet(bx, by, deg, s);  // 12-way
      this.bossVolleyTick = (this.bossVolleyTick + 1) % 2;
      if (this.bossVolleyTick === 0) {                          // every other ring, aimed volley
        const a = aim();
        for (const offset of [-10, 0, 10]) this.spawnEnemyBullet(bx, by, a + offset, s);
      }
    }
  }

  private spawnEnemyBullet(x: number, y: number, angleDeg: number, speed = ENEMY_BULLET_SPEED) {
    const b = this.enemyBullets.get() as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.enableBody(true, x, y, true, true);
    b.setDepth(7);
    const rad = Phaser.Math.DegToRad(angleDeg);
    (b.body as Phaser.Physics.Arcade.Body)
      .setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed)
      .setAllowGravity(false);
  }

  // ── Gates ────────────────────────────────────────────────────────
  private spawnGates(topLabel: string, botLabel: string) {
    if (this.gameOver) return;
    const gx = GAME_W + 50;

    const makeGate = (y: number, label: string): { s: Phaser.GameObjects.Sprite; t: Phaser.GameObjects.Text } => {
      const isWeapon = label === '⚡';
      const isMulti  = label.startsWith('×') || label.startsWith('÷');
      const isBad    = label.startsWith('-') || label.startsWith('÷');
      const s = this.add.sprite(gx, y, isMulti ? 'gate_multi' : 'gate_add').setDepth(4);
      if (isWeapon)  s.setTint(0x44ddff);   // weapon pickup (cyan)
      else if (isBad) s.setTint(0xff4444);  // danger signal (runtime tint, no new art)
      const t = this.add.text(gx, y, label, {
        fontSize: '22px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(5);
      return { s, t };
    };

    const top = makeGate(140, topLabel);
    const bot = makeGate(340, botLabel);

    this.gates.push({
      topSprite: top.s, topText: top.t, topLabel,
      botSprite: bot.s, botText: bot.t, botLabel,
      triggered: false,
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  Collision callbacks
  // ════════════════════════════════════════════════════════════════
  private onBulletHitEnemy(
    b: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    e: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const bullet = b as Phaser.Physics.Arcade.Sprite;
    const enemy  = e as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active || !enemy.active) return;

    bullet.disableBody(true, true);
    this.sparks.emitParticleAt(enemy.x, enemy.y, 6);

    const hp = (enemy.getData('hp') as number) - 1;
    enemy.setData('hp', hp);
    this.tweens.add({ targets: enemy, alpha: 0.25, duration: 55, yoyo: true });

    if (hp <= 0) {
      if (enemy.getData('isBoss') as boolean) {
        this.sparks.emitParticleAt(enemy.x, enemy.y, 20);
        audio.explode();
        this.handleBossDead(enemy);
      } else {
        this.onEnemyKilled(enemy);
      }
    } else if (enemy.getData('isBoss') as boolean) {
      this.bossHp = hp;
      this.events.emit('bossHpUpdate', hp);
      this.checkBossPhase();
    }
  }

  private onEnemyTouchSquad(
    _sq: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    e:  Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const enemy = e as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active) return;

    const now  = this.time.now;
    const last = enemy.getData('lastDmgTime') as number;
    if (now - last < 800) return;
    enemy.setData('lastDmgTime', now);

    this.takeDamage(enemy.getData('dmg') as number);
  }

  private onEnemyBulletHit(
    _sq: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    b:  Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const bullet = b as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active) return;
    bullet.disableBody(true, true);
    this.takeDamage(1);
  }

  // ════════════════════════════════════════════════════════════════
  //  Damage / win / loss
  // ════════════════════════════════════════════════════════════════
  private takeDamage(amount: number) {
    if (this.gameOver) return;
    audio.hit();
    this.cameras.main.shake(75, 0.007);

    this.soldierCount = Math.max(0, this.soldierCount - amount);
    this.events.emit('squadCount', this.soldierCount);
    this.syncSoldierVisuals();

    if (this.soldierCount <= 0) this.endGame(false);
  }

  private applyGateEffect(effect: string) {
    // Weapon-upgrade pickup
    if (effect === '⚡') {
      this.upgradeWeapon();
      const pop = this.add.text(this.squadX - 10, this.squadY - 55, '⚡ WEAPON', {
        fontSize: '24px', fontStyle: 'bold',
        color: '#66ddff', stroke: '#000000', strokeThickness: 4,
      }).setDepth(30).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: pop.y - 65, alpha: 0, duration: 1100, onComplete: () => pop.destroy() });
      return;
    }

    const op  = effect.charAt(0);
    const val = parseFloat(effect.substring(1));
    const isBad = op === '-' || op === '÷';

    if      (op === '+') this.soldierCount += val;
    else if (op === '-') this.soldierCount -= val;
    else if (op === '×') this.soldierCount = Math.floor(this.soldierCount * val);
    else if (op === '÷') this.soldierCount = Math.floor(this.soldierCount / val);
    this.soldierCount = Math.max(0, this.soldierCount);

    this.syncSoldierVisuals();
    audio.gate();
    this.events.emit('squadCount', this.soldierCount);

    // Floating label (red for traps, yellow for gains)
    const pop = this.add.text(this.squadX - 10, this.squadY - 55, effect, {
      fontSize: '30px', fontStyle: 'bold',
      color: isBad ? '#ff4444' : '#ffee22', stroke: '#000000', strokeThickness: 4
    }).setDepth(30).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: pop.y - 65, alpha: 0, duration: 1100, onComplete: () => pop.destroy() });

    if (this.soldierCount <= 0) this.endGame(false);   // a trap gate can wipe you out
  }

  private handleBossDead(boss: Phaser.Physics.Arcade.Sprite) {
    if (this.bossFireEvt) { this.bossFireEvt.remove(); this.bossFireEvt = null; }
    // Stop the endless spawners — the run is won.
    this.hordeEvt?.remove();   this.hordeEvt = null;
    this.cavalryEvt?.remove(); this.cavalryEvt = null;
    this.gateEvt?.remove();    this.gateEvt = null;
    this.sparks.emitParticleAt(boss.x, boss.y, 45);
    this.cameras.main.shake(700, 0.025);
    this.enemies.remove(boss, true, true);
    this.bossRef = null;

    this.events.emit('bossDead');
    this.score += 500;
    this.events.emit('scoreUpdate', this.score);

    this.time.delayedCall(1600, () => this.endGame(true));
  }

  private endGame(win: boolean) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.time.delayedCall(win ? 200 : 700, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', { win, score: this.score, soldierCount: this.soldierCount });
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  update
  // ════════════════════════════════════════════════════════════════
  update(time: number, delta: number) {
    this.frameTime = time;
    if (this.gameOver) return;

    // Scroll backgrounds
    this.skyBg.tilePositionX    += 0.35;
    this.groundBg.tilePositionX += BG_SCROLL;

    // Parallax trees
    this.trees.forEach(t => {
      t.x -= TREE_SCROLL;
      if (t.x < -55) t.x = GAME_W + 55;
    });

    // Lerp squad toward target Y
    this.squadY = Phaser.Math.Linear(this.squadY, this.squadTargetY, SQUAD_LERP);
    this.squadBody.setY(this.squadY);

    // Update soldier sprite positions
    this.updateSoldierPositions(time);

    // Auto-shoot
    this.firePlayerBullets(time);

    // Update gate positions & trigger
    this.updateGates(delta);

    // Cull off-screen objects
    this.cullGroup(this.playerBullets, s => s.x > GAME_W + 30 || s.y < -30 || s.y > GAME_H + 30);
    this.cullGroup(this.enemyBullets,  s => s.x < -30 || s.y < -30 || s.y > GAME_H + 30);
    // Enemies need timer-aware teardown
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(s => {
      if (s.active && s.x < -130 && !(s.getData('isBoss') as boolean)) this.destroyEnemy(s, true);
    });
  }

  private firePlayerBullets(time: number) {
    const w = WEAPON_TIERS[this.weaponTier];
    if (time - this.lastFireTime < w.fireRate) return;
    this.lastFireTime = time;

    const n = Math.min(this.soldierCount, SQUAD_MAX_VISUAL);
    if (n === 0) return;

    // Each soldier fires straight (left → right) from its slot.
    for (let i = 0; i < n; i++) {
      const slot = this.soldierSlot(i, n);
      const bx   = slot.x + 13;
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
    b.setDepth(6).setTint(tint);
    (b.body as Phaser.Physics.Arcade.Body)
      .setVelocity(BULLET_SPEED, 0)        // pure horizontal
      .setAllowGravity(false);
  }

  // ── Kill handling + slaughter feedback ───────────────────────────
  private onEnemyKilled(enemy: Phaser.Physics.Arcade.Sprite) {
    const ex = enemy.x, ey = enemy.y;
    const pts = (enemy.getData('dmg') as number) >= 2 ? 30 : 10;
    this.score += pts;
    this.events.emit('scoreUpdate', this.score);

    // Combo: chained kills within the window ramp the feedback.
    const now = this.time.now;
    this.comboCount = (now - this.lastKillTime < 700) ? this.comboCount + 1 : 1;
    this.lastKillTime = now;

    // Beefier burst, scaled by combo (capped).
    const burst = 14 + Math.min(this.comboCount, 12);
    this.sparks.emitParticleAt(ex, ey, burst);

    // Throttle the explosion tone so dense waves don't turn to mush.
    this.explodeTick = (this.explodeTick + 1) % 3;
    if (this.explodeTick === 0) audio.explode();

    // Combo punch: a little shake + HUD combo when it gets going.
    if (this.comboCount >= 3) {
      this.cameras.main.shake(60, 0.002 + Math.min(this.comboCount, 20) * 0.0004);
      this.events.emit('combo', this.comboCount);
    }

    this.destroyEnemy(enemy, true);
  }

  // ── Weapon upgrade (triggered by the ⚡ reward gate) ──────────────
  private upgradeWeapon() {
    if (this.weaponTier >= WEAPON_TIERS.length - 1) {
      // Already maxed → convert the pickup into bonus soldiers instead.
      this.soldierCount += 12;
      this.syncSoldierVisuals();
      this.events.emit('squadCount', this.soldierCount);
      return;
    }
    this.weaponTier++;
    const w = WEAPON_TIERS[this.weaponTier];
    audio.gate();
    this.cameras.main.flash(180, 120, 200, 255);
    this.events.emit('weaponChanged', { name: w.name, tier: this.weaponTier + 1, max: WEAPON_TIERS.length });
  }

  private updateGates(delta: number) {
    const dx = GATE_SPEED * delta / 1000;

    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.topSprite.x -= dx; g.botSprite.x -= dx;
      g.topText.x    = g.topSprite.x;
      g.botText.x    = g.botSprite.x;

      // Trigger: squad crosses gate threshold
      if (!g.triggered && g.topSprite.x < this.squadX + 38) {
        g.triggered = true;
        const pickTop = Math.abs(this.squadY - g.topSprite.y) < Math.abs(this.squadY - g.botSprite.y);
        const chosen  = pickTop ? g.topSprite : g.botSprite;
        const effect  = pickTop ? g.topLabel  : g.botLabel;

        this.tweens.add({ targets: chosen, scaleX: 1.35, scaleY: 1.35, duration: 160, yoyo: true });
        this.applyGateEffect(effect);
      }

      if (g.topSprite.x < -110) {
        g.topSprite.destroy(); g.botSprite.destroy();
        g.topText.destroy();   g.botText.destroy();
        this.gates.splice(i, 1);
      }
    }
  }

  private cullGroup(
    group: Phaser.Physics.Arcade.Group,
    pred: (s: Phaser.Physics.Arcade.Sprite) => boolean
  ) {
    (group.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(s => {
      if (s.active && pred(s)) s.disableBody(true, true);
    });
  }
}
