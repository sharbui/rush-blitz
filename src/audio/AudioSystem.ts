// Web Audio API synthesiser — zero file dependencies.
// Howler.js (installed) can replace/extend this when real audio assets are ready.
export class AudioSystem {
  private ctx: AudioContext | null = null;

  init() {
    try { this.ctx = new AudioContext(); } catch { /* no audio */ }
  }

  private resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.22) {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  shoot() { this.tone(880, 0.04, 'square', 0.08); }

  explode() {
    this.tone(100, 0.25, 'sawtooth', 0.28);
    this.tone(60,  0.35, 'sawtooth', 0.18);
  }

  hit() { this.tone(200, 0.12, 'triangle', 0.2); }

  gate() {
    [440, 660, 880].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.15, 'sine', 0.18), i * 70)
    );
  }

  bossRoar() {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(22, this.ctx.currentTime + 1.8);
    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.8);
  }

  victory() {
    [440, 554, 659, 880, 1100].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.35, 'sine', 0.28), i * 130)
    );
  }

  defeat() {
    [440, 330, 220, 110].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.42, 'sawtooth', 0.28), i * 210)
    );
  }
}

export const audio = new AudioSystem();
