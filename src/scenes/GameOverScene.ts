import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config/constants';
import { audio } from '../audio/AudioSystem';

interface GameOverData {
  win: boolean;
  score: number;
  soldierCount: number;
}

export default class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOver' }); }

  create(data: GameOverData) {
    const { win, score, soldierCount } = data;

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.72);

    // Banner
    this.add.rectangle(GAME_W / 2, GAME_H / 2 - 70, 380, 88, win ? 0x003300 : 0x440000, 0.95)
      .setStrokeStyle(3, win ? 0x00ff55 : 0xff2200);

    this.add.text(GAME_W / 2, GAME_H / 2 - 70, win ? '勝利！' : 'DEFEAT', {
      fontSize: '60px', fontStyle: 'bold',
      color: win ? '#44ff88' : '#ff3333',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 + 10, `得分：${score}`, {
      fontSize: '30px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    if (win) {
      this.add.text(GAME_W / 2, GAME_H / 2 + 48, `剩餘士兵：${soldierCount}`, {
        fontSize: '20px', color: '#88ffaa',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5);
    }

    this.createBtn(GAME_W / 2 - 100, GAME_H / 2 + 110, '重新挑戰', 0x224400, 0x44aa00, () => {
      this.scene.start('Game');
    });
    this.createBtn(GAME_W / 2 + 100, GAME_H / 2 + 110, '主選單', 0x330000, 0x882200, () => {
      this.scene.start('Menu');
    });

    if (win) audio.victory(); else audio.defeat();
  }

  private createBtn(x: number, y: number, label: string, bg: number, hover: number, cb: () => void) {
    const r = this.add.rectangle(x, y, 150, 50, bg)
      .setInteractive().setStrokeStyle(2, 0xffffff);
    this.add.text(x, y, label, {
      fontSize: '20px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(hover));
    r.on('pointerout',  () => r.setFillStyle(bg));
    r.on('pointerdown', cb);
  }
}
