import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config/constants';
import { audio } from '../audio/AudioSystem';

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create() {
    audio.init();

    this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'sky');
    this.add.rectangle(GAME_W / 2, GAME_H - 22, GAME_W, 44, 0x3d2a1a);
    this.add.tileSprite(GAME_W / 2, GAME_H - 38, GAME_W, 60, 'ground');

    // Background trees
    for (let i = 0; i < 8; i++) {
      this.add.sprite(60 + i * 100, 320 + Phaser.Math.Between(-20, 20), 'tree')
        .setScale(0.6 + Math.random() * 0.4).setAlpha(0.5);
    }

    // Title shadow
    this.add.text(GAME_W / 2 + 4, 124, 'RUSH BLITZ', {
      fontSize: '68px', fontStyle: 'bold', color: '#000000'
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(GAME_W / 2, 120, 'RUSH BLITZ', {
      fontSize: '68px', fontStyle: 'bold',
      color: '#ffee22',
      stroke: '#aa4400', strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 200, '瘋狂衝鋒 × 射擊殲滅', {
      fontSize: '22px', color: '#aaddff',
      stroke: '#001133', strokeThickness: 4
    }).setOrigin(0.5);

    // Instructions
    this.add.text(GAME_W / 2, 270, '拖曳滑鼠 上下移動隊伍  ·  經過閘門獲得增援', {
      fontSize: '15px', color: '#88aacc',
      stroke: '#000011', strokeThickness: 3
    }).setOrigin(0.5);

    const tap = this.add.text(GAME_W / 2, 340, '▶  點擊開始  ◀', {
      fontSize: '30px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({ targets: tap, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });

    // Demo squad formation
    const cx = GAME_W / 2 - 50;
    const cy = 415;
    for (let i = 0; i < 5; i++) {
      const s = this.add.sprite(cx - Math.floor(i / 5) * 22, cy + (i - 2) * 22, 'soldier');
      this.tweens.add({
        targets: s, y: s.y - 7,
        duration: 420 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
