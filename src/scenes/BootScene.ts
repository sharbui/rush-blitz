import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config/constants';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    // ── soldier (blue, 20×28) ────────────────────────────────────
    g.clear();
    g.fillStyle(0xffddbb); g.fillCircle(10, 5, 5);
    g.fillStyle(0x3388ff); g.fillRect(4, 10, 12, 10);
    g.fillStyle(0x1a44aa); g.fillRect(4, 20, 5, 8); g.fillRect(11, 20, 5, 8);
    g.fillStyle(0x888888); g.fillRect(14, 14, 7, 3);
    g.generateTexture('soldier', 20, 28);

    // ── enemy_soldier (red, 20×28) ───────────────────────────────
    g.clear();
    g.fillStyle(0xffddbb); g.fillCircle(10, 5, 5);
    g.fillStyle(0xdd2222); g.fillRect(4, 10, 12, 10);
    g.fillStyle(0x991111); g.fillRect(4, 20, 5, 8); g.fillRect(11, 20, 5, 8);
    g.fillStyle(0x888888); g.fillRect(0, 14, 7, 3);
    g.generateTexture('enemy_soldier', 20, 28);

    // ── enemy_cavalry (orange, 38×32) ────────────────────────────
    g.clear();
    g.fillStyle(0xcc5500);
    g.fillEllipse(19, 24, 34, 14);
    g.fillStyle(0xff7722); g.fillRect(5, 15, 28, 12);
    g.fillStyle(0xffddbb); g.fillCircle(19, 7, 6);
    g.fillStyle(0xcc4400); g.fillRect(2, 26, 6, 8); g.fillRect(30, 26, 6, 8);
    g.fillStyle(0x888888); g.fillRect(0, 17, 7, 3);
    g.generateTexture('enemy_cavalry', 38, 32);

    // ── boss_skull (80×80) ───────────────────────────────────────
    g.clear();
    g.fillStyle(0x110022); g.fillRect(0, 0, 80, 80);
    g.fillStyle(0xcccccc); g.fillCircle(40, 38, 28);
    // eye sockets
    g.fillStyle(0x110022);
    g.fillEllipse(26, 30, 14, 17);
    g.fillEllipse(54, 30, 14, 17);
    // nose
    g.fillStyle(0xaaaaaa); g.fillTriangle(37, 40, 43, 40, 40, 48);
    // mouth bar
    g.fillStyle(0x110022); g.fillRect(22, 52, 36, 7);
    // teeth
    g.fillStyle(0xcccccc);
    for (let i = 0; i < 5; i++) g.fillRect(22 + i * 8, 52, 5, 7);
    // glow outline
    g.lineStyle(2, 0x9900ff, 0.8);
    g.strokeCircle(40, 38, 28);
    g.generateTexture('boss_skull', 80, 80);

    // ── boss_giant (godzilla-like, 140×160) ──────────────────────
    g.clear();
    g.fillStyle(0x1a5c2a); g.fillRect(40, 45, 60, 95);  // body
    g.fillStyle(0x1d6b30); g.fillRect(35, 12, 70, 40);  // head
    g.fillStyle(0x154a20); g.fillRect(35, 44, 70, 13);  // jaw
    // eyes
    g.fillStyle(0xff2200); g.fillCircle(54, 28, 9); g.fillCircle(86, 28, 9);
    g.fillStyle(0xff8800); g.fillCircle(54, 28, 4); g.fillCircle(86, 28, 4);
    // teeth
    g.fillStyle(0xffffff);
    for (let i = 0; i < 5; i++) g.fillRect(37 + i * 13, 52, 6, 9);
    // arms
    g.fillStyle(0x1a5c2a); g.fillRect(0, 50, 42, 28); g.fillRect(98, 50, 42, 28);
    // legs
    g.fillRect(40, 140, 24, 20); g.fillRect(76, 140, 24, 20);
    // spines
    g.fillStyle(0x0d3a18);
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(36 + i * 16, 45, 43 + i * 16, 8, 52 + i * 16, 45);
    }
    g.generateTexture('boss_giant', 140, 160);

    // ════════════════════════════════════════════════════════════
    //  Typed enemies (config type 1..5). Distinct silhouettes.
    // ════════════════════════════════════════════════════════════

    // ── 1: TANK (40×34, armored boxy, slow/heavy) ────────────────
    g.clear();
    g.fillStyle(0x4a5a3a); g.fillRect(2, 14, 36, 16);          // hull
    g.fillStyle(0x5e7049); g.fillRect(6, 8, 22, 10);           // turret
    g.fillStyle(0x33402a); g.fillRect(26, 11, 14, 4);          // barrel
    g.fillStyle(0x222a1a);                                     // treads
    for (let i = 0; i < 6; i++) g.fillRect(2 + i * 6, 30, 4, 4);
    g.lineStyle(2, 0x1a2212, 1); g.strokeRect(2, 14, 36, 16);
    g.generateTexture('e_tank', 40, 36);

    // ── 2: RUNNER (16×24, lean, fast) ────────────────────────────
    g.clear();
    g.fillStyle(0xffddbb); g.fillCircle(8, 5, 4);
    g.fillStyle(0xcc44aa); g.fillRect(4, 9, 8, 9);             // slim torso
    g.fillStyle(0x882277); g.fillRect(3, 18, 4, 6); g.fillRect(9, 18, 4, 6);
    g.fillStyle(0x66115a); g.fillTriangle(12, 10, 16, 8, 12, 16); // motion fin
    g.generateTexture('e_runner', 16, 24);

    // ── 3: BRUTE (34×38, big hulking, medium) ────────────────────
    g.clear();
    g.fillStyle(0xffccaa); g.fillCircle(17, 7, 6);
    g.fillStyle(0x884422); g.fillRect(5, 12, 24, 18);          // broad torso
    g.fillStyle(0x5a2a14); g.fillRect(0, 14, 7, 12); g.fillRect(27, 14, 7, 12); // arms
    g.fillStyle(0x6a3318); g.fillRect(8, 30, 8, 8); g.fillRect(18, 30, 8, 8);
    g.lineStyle(2, 0x3a1c0c, 1); g.strokeRect(5, 12, 24, 18);
    g.generateTexture('e_brute', 34, 38);

    // ── 4: ARCHER (20×28, ranged, scatter shooter) ───────────────
    g.clear();
    g.fillStyle(0xffddbb); g.fillCircle(10, 5, 5);
    g.fillStyle(0x2a8c5a); g.fillRect(4, 10, 12, 11);          // robe
    g.fillStyle(0x16603a); g.fillRect(4, 21, 5, 7); g.fillRect(11, 21, 5, 7);
    g.lineStyle(2, 0xffee99, 1); g.beginPath();                // bow arc
    g.arc(2, 14, 9, -1.2, 1.2); g.strokePath();
    g.generateTexture('e_archer', 20, 28);

    // ── 5: SHIELD (28×32, armored front, tanky) ──────────────────
    g.clear();
    g.fillStyle(0xffddbb); g.fillCircle(16, 6, 5);
    g.fillStyle(0x556688); g.fillRect(10, 11, 12, 14);         // body
    g.fillStyle(0x33405a); g.fillRect(10, 25, 5, 7); g.fillRect(17, 25, 5, 7);
    g.fillStyle(0x99aacc); g.fillRoundedRect(0, 8, 9, 20, 3);  // big shield (front/left)
    g.lineStyle(2, 0x6677aa, 1); g.strokeRoundedRect(0, 8, 9, 20, 3);
    g.generateTexture('e_shield', 28, 32);

    // ════════════════════════════════════════════════════════════
    //  Single big BOSSES (config types 6..10). Consistent style:
    //  large dark silhouette + glowing eyes + neon outline.
    // ════════════════════════════════════════════════════════════

    // ── 6: REX (dinosaur, ~124×130, green) ───────────────────────
    g.clear();
    g.fillStyle(0x276b33); g.fillTriangle(124, 80, 80, 66, 80, 98);     // tail
    g.fillStyle(0x1f5829); g.fillRect(66, 96, 18, 32);                  // hind leg
    g.fillStyle(0x2f7d3c); g.fillEllipse(64, 72, 88, 68);              // body
    g.fillStyle(0x1f5829); g.fillRect(40, 100, 16, 28);                // front leg
    g.fillStyle(0x2f7d3c); g.fillEllipse(30, 46, 48, 42);             // head
    g.fillStyle(0x276b33); g.fillRect(2, 48, 40, 16);                  // jaw
    g.fillStyle(0xffffff); for (let i = 0; i < 5; i++) g.fillTriangle(6 + i * 8, 48, 10 + i * 8, 56, 14 + i * 8, 48);
    g.fillStyle(0x163e1d); for (let i = 0; i < 5; i++) g.fillTriangle(40 + i * 14, 40, 47 + i * 14, 18, 54 + i * 14, 40);
    g.fillStyle(0x276b33); g.fillRect(44, 70, 8, 14);                  // tiny arm
    g.fillStyle(0xff2a1a); g.fillCircle(24, 40, 6);
    g.fillStyle(0xffd23a); g.fillCircle(24, 40, 3);                    // eye glow
    g.lineStyle(2, 0x6dff7a, 0.45); g.strokeEllipse(64, 72, 88, 68);
    g.generateTexture('b_rex', 124, 130);

    // ── 7: MECH (big robot, ~116×120, steel) ─────────────────────
    g.clear();
    g.fillStyle(0x55606b); g.fillRect(34, 92, 20, 26); g.fillRect(64, 92, 20, 26); // legs
    g.fillStyle(0x55606b); g.fillRect(10, 46, 20, 40); g.fillRect(88, 46, 18, 40); // arms
    g.fillStyle(0x707d8a); g.fillRoundedRect(30, 40, 58, 56, 6);       // torso
    g.fillStyle(0x7d8a98); g.fillRect(20, 40, 16, 12); g.fillRect(82, 40, 16, 12); // shoulders
    g.fillStyle(0x5a6571); g.fillRect(44, 14, 30, 26);                 // head
    g.fillStyle(0x00e5ff); g.fillRect(48, 22, 22, 5);                  // visor eyes
    g.fillStyle(0x00e5ff); g.fillCircle(59, 66, 9);
    g.fillStyle(0xbff7ff); g.fillCircle(59, 66, 4);                    // chest core
    g.fillStyle(0xff3344); g.fillRect(58, 4, 3, 10); g.fillCircle(59, 4, 3); // antenna
    g.lineStyle(2, 0x00e5ff, 0.4); g.strokeRoundedRect(30, 40, 58, 56, 6);
    g.generateTexture('b_mech', 116, 120);

    // ── 8: DEMON (horned, ~112×122, purple) ──────────────────────
    g.clear();
    g.fillStyle(0x2a1636); g.fillRect(40, 104, 16, 18); g.fillRect(60, 104, 16, 18); // legs
    g.fillStyle(0x2a1636); g.fillRect(12, 60, 16, 32); g.fillRect(84, 60, 16, 32);   // arms
    g.fillStyle(0x3a1f4a); g.fillEllipse(56, 72, 72, 74);            // body
    g.fillStyle(0x46265a); g.fillCircle(56, 40, 27);                  // head
    g.fillStyle(0xd9c2a0); g.fillTriangle(34, 28, 42, 2, 48, 26); g.fillTriangle(78, 28, 70, 2, 64, 26); // horns
    g.fillStyle(0xff7a18); g.fillEllipse(46, 40, 11, 8); g.fillEllipse(66, 40, 11, 8);
    g.fillStyle(0xffe089); g.fillCircle(46, 40, 3); g.fillCircle(66, 40, 3); // eyes
    g.fillStyle(0xffffff); g.fillTriangle(48, 52, 52, 62, 56, 52); g.fillTriangle(56, 52, 60, 62, 64, 52); // fangs
    g.lineStyle(2, 0xb15cff, 0.45); g.strokeCircle(56, 40, 27);
    g.generateTexture('b_demon', 112, 124);

    // ── 9: BEETLE (giant insect, ~124×104, dark teal) ────────────
    g.clear();
    g.lineStyle(4, 0x14322f, 1); g.beginPath();
    g.moveTo(34, 60); g.lineTo(10, 88); g.moveTo(52, 66); g.lineTo(34, 96);
    g.moveTo(92, 66); g.lineTo(108, 96); g.moveTo(110, 60); g.lineTo(120, 88);
    g.strokePath();                                                    // legs
    g.fillStyle(0x16443f); g.fillEllipse(62, 60, 92, 66);            // carapace
    g.lineStyle(2, 0x0c2622, 1); g.beginPath(); g.moveTo(62, 30); g.lineTo(62, 92); g.strokePath();
    g.fillStyle(0x0f322e); g.fillCircle(62, 24, 16);                  // head
    g.fillStyle(0x0c2622); g.fillTriangle(48, 16, 38, 6, 54, 22); g.fillTriangle(76, 16, 86, 6, 70, 22); // mandibles
    g.fillStyle(0x66ff88); g.fillCircle(55, 22, 4); g.fillCircle(69, 22, 4); // eyes
    g.fillStyle(0x2aa37a); g.fillCircle(44, 54, 5); g.fillCircle(80, 54, 5); g.fillCircle(62, 74, 5); // glow spots
    g.generateTexture('b_beetle', 124, 104);

    // ── 10: GOLEM (rock giant, ~118×120, stone+lava) ─────────────
    g.clear();
    g.fillStyle(0x5b4632); g.fillRect(36, 96, 22, 24); g.fillRect(64, 96, 22, 24); // legs
    g.fillStyle(0x5b4632); g.fillRect(8, 46, 20, 32); g.fillRect(90, 46, 20, 32);  // arms
    g.fillStyle(0x6b5238); g.fillRoundedRect(26, 40, 66, 60, 10);     // torso
    g.fillStyle(0x7a5e40); g.fillCircle(44, 56, 14); g.fillCircle(74, 52, 12); g.fillCircle(60, 80, 16); // boulders
    g.fillStyle(0x6b5238); g.fillRoundedRect(42, 12, 34, 30, 6);      // head
    g.lineStyle(3, 0xff7a18, 0.9); g.beginPath();
    g.moveTo(30, 60); g.lineTo(46, 68); g.lineTo(40, 84); g.moveTo(82, 50); g.lineTo(70, 64); g.strokePath(); // lava
    g.fillStyle(0xffd23a); g.fillRect(48, 22, 8, 6); g.fillRect(62, 22, 8, 6); // eyes
    g.generateTexture('b_golem', 118, 120);

    // ── bullet (10×4, white base so weapon tints render true) ────
    g.clear();
    g.fillStyle(0xffffff); g.fillRect(0, 0, 10, 4);
    g.generateTexture('bullet', 10, 4);

    // ── enemy_bullet (10×4, red-orange) ─────────────────────────
    g.clear();
    g.fillStyle(0xff4400); g.fillRect(0, 0, 10, 4);
    g.generateTexture('enemy_bullet', 10, 4);

    // ── gate_add (64×100, green) ─────────────────────────────────
    g.clear();
    g.fillStyle(0x00aa33); g.fillRoundedRect(0, 0, 64, 100, 10);
    g.fillStyle(0x00dd55); g.fillRoundedRect(2, 2, 60, 96, 8);
    g.fillStyle(0x005522); g.fillRoundedRect(5, 5, 54, 90, 6);
    // '+' symbol
    g.fillStyle(0xffffff);
    g.fillRect(28, 20, 8, 36);  // vertical bar
    g.fillRect(14, 34, 36, 8);  // horizontal bar
    g.generateTexture('gate_add', 64, 100);

    // ── gate_multi (64×100, blue) ────────────────────────────────
    g.clear();
    g.fillStyle(0x0055cc); g.fillRoundedRect(0, 0, 64, 100, 10);
    g.fillStyle(0x0088ff); g.fillRoundedRect(2, 2, 60, 96, 8);
    g.fillStyle(0x002244); g.fillRoundedRect(5, 5, 54, 90, 6);
    // '×' symbol (two diagonal thick lines via rects)
    g.fillStyle(0xffffff);
    // diagonal 1 (top-left → bottom-right): approximate with stacked rects
    for (let i = 0; i < 5; i++) {
      g.fillRect(14 + i * 7, 22 + i * 7, 9, 9);
    }
    // diagonal 2 (top-right → bottom-left)
    for (let i = 0; i < 5; i++) {
      g.fillRect(43 - i * 7, 22 + i * 7, 9, 9);
    }
    g.generateTexture('gate_multi', 64, 100);

    // ── gate_panel (64×100, neutral white so it tints to blue/red/gray) ──
    g.clear();
    g.fillStyle(0xffffff); g.fillRoundedRect(0, 0, 64, 100, 10);
    g.fillStyle(0xd6d6d6); g.fillRoundedRect(5, 5, 54, 90, 7);
    g.lineStyle(3, 0xffffff, 1); g.strokeRoundedRect(2, 2, 60, 96, 9);
    g.generateTexture('gate_panel', 64, 100);

    // ── ground tile (80×80) ──────────────────────────────────────
    g.clear();
    g.fillStyle(0x7a6244); g.fillRect(0, 0, 80, 80);
    g.fillStyle(0x8b7355); g.fillRect(2, 2, 36, 36); g.fillRect(42, 42, 36, 36);
    g.fillStyle(0x6a5234); g.fillRect(2, 42, 36, 36); g.fillRect(42, 2, 36, 36);
    g.lineStyle(1, 0x5a4224, 1);
    g.strokeRect(0, 0, 40, 40); g.strokeRect(40, 40, 40, 40);
    g.strokeRect(0, 40, 40, 40); g.strokeRect(40, 0, 40, 40);
    g.generateTexture('ground', 80, 80);

    // ── sky (800×480, dark navy gradient feel) ───────────────────
    g.clear();
    g.fillGradientStyle(0x0d1a3a, 0x0d1a3a, 0x1a3a5c, 0x1a3a5c, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.generateTexture('sky', GAME_W, GAME_H);

    // ── tree (40×100) ────────────────────────────────────────────
    g.clear();
    g.fillStyle(0x3d2a1a); g.fillRect(16, 70, 8, 30);
    g.fillStyle(0x1a4a1a); g.fillTriangle(0, 70, 20, 18, 40, 70);
    g.fillStyle(0x1e5c1e); g.fillTriangle(4, 78, 20, 32, 36, 78);
    g.fillStyle(0x228822); g.fillTriangle(8, 88, 20, 48, 32, 88);
    g.generateTexture('tree', 40, 100);

    // ── spark particle (8×8) ─────────────────────────────────────
    g.clear();
    g.fillStyle(0xffaa00); g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);

    g.destroy();
    this.scene.start('Menu');
  }
}
