import Phaser from 'phaser';
import { GAME_W } from '../config/constants';

export default class UIScene extends Phaser.Scene {
  private countText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossGroup!: Phaser.GameObjects.Container;
  private bossMaxHp = 1;

  constructor() { super({ key: 'UI' }); }

  create() {
    // ── Squad count (top-left) ────────────────────────────────────
    this.add.image(28, 22, 'soldier').setScale(1.3);
    this.countText = this.add.text(48, 10, '×20', {
      fontSize: '28px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4
    });

    // ── Score (top-right) ─────────────────────────────────────────
    this.scoreText = this.add.text(GAME_W - 12, 10, '0', {
      fontSize: '24px', color: '#ffee44',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(1, 0);

    // ── Power (top-left, under squad count; rainbow tint) ─────────
    this.powerText = this.add.text(12, 44, '', {
      fontSize: '17px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3
    });

    // ── Combo (right side, under score) ───────────────────────────
    this.comboText = this.add.text(GAME_W - 12, 42, '', {
      fontSize: '30px', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#7a2200', strokeThickness: 5
    }).setOrigin(1, 0).setAlpha(0);

    // ── Level countdown (top-center, seconds) ─────────────────────
    this.timerText = this.add.text(GAME_W / 2, 8, '', {
      fontSize: '28px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5, 0).setDepth(60);

    // ── Boss HP bar (center-top, hidden initially) ────────────────
    this.bossBarBg   = this.add.rectangle(GAME_W / 2, 22, 304, 22, 0x220000);
    this.bossBarFill = this.add.rectangle(GAME_W / 2 - 150, 22, 300, 18, 0xff2200).setOrigin(0, 0.5);
    const bossLabel  = this.add.text(GAME_W / 2, 22, 'BOSS', {
      fontSize: '13px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    this.bossGroup = this.add.container(0, 0, [this.bossBarBg, this.bossBarFill, bossLabel]);
    this.bossGroup.setVisible(false);

    // ── Wire up GameScene events ──────────────────────────────────
    const gs = this.scene.get('Game');

    gs.events.on('squadCount', (n: number) => {
      this.countText.setText(`×${n}`);
    });

    gs.events.on('scoreUpdate', (n: number) => {
      this.scoreText.setText(`${n}`);
    });

    gs.events.on('powerChanged', ({ level, max, tint }: { level: number; max: number; tint: number }) => {
      const hex = '#' + tint.toString(16).padStart(6, '0');
      this.powerText.setText(`⚡ POWER ${level}/${max}`).setColor(hex);
      this.powerText.setScale(1.6);
      this.tweens.add({ targets: this.powerText, scale: 1, duration: 320, ease: 'Back.easeOut' });
      if (level > 1) this.flashPowerBanner(level, hex);
    });

    gs.events.on('combo', (n: number) => this.showCombo(n));

    gs.events.on('timeLeft', (s: number) => {
      this.timerText.setText(`${s}`);
      this.timerText.setColor(s <= 10 ? '#ff4444' : s <= 30 ? '#ffcc00' : '#ffffff');
    });

    gs.events.on('bossSpawned', ({ maxHp, hp }: { maxHp: number; hp: number }) => {
      this.bossMaxHp = maxHp;
      this.bossGroup.setVisible(true);
      this.setHpBar(hp);
    });

    gs.events.on('bossHpUpdate', (hp: number) => this.setHpBar(hp));

    gs.events.on('bossDead', () => this.bossGroup.setVisible(false));

    // CRITICAL: these listeners live on GameScene's emitter, not ours, so they
    // are NOT auto-removed when this UI scene stops. Without this cleanup, a
    // restarted GameScene would emit into stale listeners pointing at destroyed
    // text objects → crash/freeze on "重新挑戰".
    this.events.once('shutdown', () => {
      ['squadCount', 'scoreUpdate', 'powerChanged', 'combo', 'timeLeft',
       'bossSpawned', 'bossHpUpdate', 'bossDead'].forEach(ev => gs.events.off(ev));
    });

    // Let GameScene know UI is ready so it can push initial values
    gs.events.emit('uiReady');
  }

  private showCombo(n: number) {
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setText(`COMBO ×${n}`);
    // Hotter colour the higher the streak.
    this.comboText.setColor(n >= 20 ? '#ff3322' : n >= 10 ? '#ff8800' : '#ffcc00');
    this.comboText.setAlpha(1).setScale(1.4);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.comboText, alpha: 0, delay: 800, duration: 400 });
  }

  private flashPowerBanner(level: number, hex: string) {
    const banner = this.add.text(GAME_W / 2, 96, `POWER UP!  Lv.${level}`, {
      fontSize: '26px', fontStyle: 'bold',
      color: hex, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(60).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: banner, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut',
      yoyo: true, hold: 650, onComplete: () => banner.destroy(),
    });
  }

  private setHpBar(hp: number) {
    const ratio = Math.max(0, hp / this.bossMaxHp);
    this.bossBarFill.width = 300 * ratio;
    this.bossBarFill.setFillStyle(ratio > 0.5 ? 0xff2200 : ratio > 0.25 ? 0xff8800 : 0xff0000);
  }
}
