/*
 * Rush Blitz — a 2D crowd shooter.
 * Copyright (C) 2026 sharbui
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version. This program is distributed WITHOUT ANY WARRANTY. See the GNU
 * Affero General Public License for details: <https://www.gnu.org/licenses/>.
 */
import Phaser from 'phaser';
import BootScene    from './scenes/BootScene';
import MenuScene    from './scenes/MenuScene';
import GameScene    from './scenes/GameScene';
import UIScene      from './scenes/UIScene';
import GameOverScene from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  backgroundColor: '#050a14',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
