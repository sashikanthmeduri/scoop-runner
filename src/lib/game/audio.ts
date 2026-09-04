export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = false;
  private extraTimer = 0;

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.music.gain.value = 0.22;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  private env(duration: number, peak = 0.2) {
    if (!this.ctx || !this.sfx) return null;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, this.ctx.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    g.connect(this.sfx);
    return g;
  }

  private tone(freq: number, type: OscillatorType, duration: number, peak = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.env(duration, peak);
    if (!g) return;
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private noise(duration: number, peak: number, hp = 800) {
    if (!this.ctx) return;
    const n = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.env(duration, peak);
    if (!g) return;
    src.connect(filter);
    filter.connect(g);
    src.start();
  }

  jump() {
    this.tone(420 + Math.random() * 40, "square", 0.12, 0.08);
    this.tone(680, "triangle", 0.08, 0.05);
  }

  doubleJump() {
    this.tone(520, "square", 0.1, 0.07);
    this.tone(780, "triangle", 0.12, 0.06);
  }

  slide() {
    this.noise(0.16, 0.1, 400);
  }

  scoop() {
    this.noise(0.04, 0.08, 1800);
    this.tone(880 + Math.random() * 40, "square", 0.07, 0.09);
    this.tone(1320, "triangle", 0.09, 0.05);
  }

  breaking() {
    this.extra();
    this.tone(523, "square", 0.18, 0.12);
    this.tone(659, "square", 0.22, 0.1);
    this.tone(784, "square", 0.28, 0.08);
  }

  extra() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now < this.extraTimer) return;
    this.extraTimer = now + 0.4;
    const notes = [392, 523, 659, 784];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.02 + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + i * 0.05);
      osc.connect(g);
      g.connect(this.sfx!);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.4 + i * 0.05);
    });
  }

  shutter() {
    this.noise(0.03, 0.16, 1200);
    this.tone(180, "square", 0.04, 0.08);
  }

  hit() {
    this.noise(0.22, 0.22, 200);
    this.tone(110, "sawtooth", 0.28, 0.14);
  }

  power() {
    this.tone(660, "triangle", 0.16, 0.1);
    this.tone(990, "triangle", 0.2, 0.08);
  }

  frontPage() {
    this.extra();
    this.tone(262, "square", 0.3, 0.1);
    this.tone(392, "square", 0.34, 0.08);
  }

  tickType() {
    this.noise(0.02, 0.05, 2400);
  }
}
