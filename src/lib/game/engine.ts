import {
  BASE_SPEED,
  COYOTE,
  DEADLINE_BREAKING,
  DEADLINE_SCOOP,
  DOUBLE_JUMP_V,
  FLASH_RANGE,
  FRONTPAGE_TIME,
  GRAVITY,
  GROUND_RATIO,
  INVINCIBLE_TIME,
  JUMP_BUFFER,
  JUMP_V,
  MAX_FALL,
  MAX_SPEED,
  MULT_TIME,
  PALETTES,
  PLAYER_X_RATIO,
  PX_PER_METER,
  SEASON_BLEND,
  SEASON_LABEL,
  SEASON_METERS,
  SEASON_ORDER,
  SLIDE_TIME,
  SLOW_FACTOR,
  SLOW_TIME,
  SPEED_PER_500,
  STEP,
  VIEW_H,
  type SeasonId,
  type SeasonPalette,
} from "./constants";
import { GameAudio } from "./audio";
import { emptyAssets, loadAssets, type SpriteBank } from "./assets";
import { Input } from "./input";

export type HudSnapshot = {
  score: number;
  combo: number;
  multiplier: number;
  distanceM: number;
  stories: number;
  deadline: number;
  frontPage: boolean;
  season: string;
  invincible: boolean;
  paused: boolean;
  boost: boolean;
};

export type RunResult = {
  score: number;
  stories: number;
  distanceM: number;
};

type EntKind =
  | "van"
  | "protestor"
  | "paparazzi"
  | "scaffold"
  | "cloud"
  | "scoop"
  | "breaking"
  | "pass"
  | "flash";

type Ent = {
  active: boolean;
  kind: EntKind;
  x: number;
  y: number;
  w: number;
  h: number;
  deadly: boolean;
  collected: boolean;
  bob: number;
  phase: number;
};

type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "rain" | "leaf" | "petal" | "paper" | "dust";
};

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 255,
    ga = (pa >> 8) & 255,
    ba = pa & 255;
  const rb = (pb >> 16) & 255,
    gb = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(lerp(ra, rb, t));
  const g = Math.round(lerp(ga, gb, t));
  const bl = Math.round(lerp(ba, bb, t));
  return `rgb(${r},${g},${bl})`;
}

function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class ScoopEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private audio = new GameAudio();
  private assets: SpriteBank | null = null;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private running = false;
  private ready = false;
  private idle = true;
  private reduced = false;
  private dpr = 1;
  private viewW = 1280;
  private viewH = VIEW_H;
  private ground = VIEW_H * GROUND_RATIO;

  private playerX = 240;
  private playerY = 0;
  private vy = 0;
  private onGround = true;
  private jumpsLeft = 2;
  private slideT = 0;
  private coyote = 0;
  private jumpBuf = 0;
  private animT = 0;
  private facingSquash = 1;
  private dead = false;
  private deadT = 0;
  private hitFlash = 0;

  private scroll = 0;
  private speed = BASE_SPEED;
  private score = 0;
  private stories = 0;
  private combo = 0;
  private comboT = 0;
  private multiplier = 1;
  private multT = 0;
  private deadline = 0;
  private frontT = 0;
  private invT = 0;
  private slowT = 0;
  private paused = false;
  private distanceM = 0;

  private ents: Ent[] = [];
  private lastSpawn = 0;
  private nextGap = 380;
  private spawnIndex = 0;
  private particles: Particle[] = [];
  private pops: { x: number; y: number; text: string; life: number }[] = [];
  private trauma = 0;
  private flashWhite = 0;
  private timeScale = 1;

  private onHud: (h: HudSnapshot) => void;
  private onOver: (r: RunResult) => void;
  private hudClock = 0;

  constructor(
    canvas: HTMLCanvasElement,
    handlers: { onHud: (h: HudSnapshot) => void; onOver: (r: RunResult) => void },
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2d unavailable");
    this.ctx = ctx;
    this.onHud = handlers.onHud;
    this.onOver = handlers.onOver;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.input.attach(canvas);
    this.assets = emptyAssets();
    for (let i = 0; i < 64; i++) this.ents.push(this.blankEnt());
    for (let i = 0; i < 220; i++) this.particles.push(this.blankP());
  }

  async boot() {
    this.resize();
    this.ready = true;
    this.idle = true;
    this.resetRun(false);
    this.running = true;
    this.last = performance.now();
    this.loop();
    void loadAssets()
      .then((assets) => {
        this.assets = assets;
      })
      .catch(() => {
        /* procedural fallbacks stay in place */
      });
  }

  start() {
    this.audio.unlock();
    this.idle = false;
    this.paused = false;
    this.resetRun(true);
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      this.loop();
    }
  }

  idlePreview() {
    this.idle = true;
    this.paused = false;
    this.dead = false;
    this.resetRun(false);
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      this.loop();
    }
  }

  pause() {
    this.paused = !this.paused;
    this.emitHud();
  }

  setMuted(v: boolean) {
    this.audio.unlock();
    this.audio.setMuted(v);
  }

  setJump(v: boolean) {
    this.input.setJump(v);
  }

  setSlide(v: boolean) {
    this.input.setSlide(v);
  }

  resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(320, parent.clientWidth);
    const h = Math.max(240, parent.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.viewH = VIEW_H;
    this.viewW = (w / h) * VIEW_H;
    this.ground = this.viewH * GROUND_RATIO;
    this.playerX = this.viewW * PLAYER_X_RATIO;
    this.ctx.setTransform(this.dpr * (this.canvas.clientWidth / this.viewW), 0, 0, this.dpr * (this.canvas.clientHeight / this.viewH), 0, 0);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.destroy();
  }

  private blankEnt(): Ent {
    return {
      active: false,
      kind: "scoop",
      x: 0,
      y: 0,
      w: 40,
      h: 40,
      deadly: false,
      collected: false,
      bob: 0,
      phase: 0,
    };
  }

  private blankP(): Particle {
    return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff", kind: "spark" };
  }

  private resetRun(playing: boolean) {
    this.scroll = 0;
    this.speed = BASE_SPEED;
    this.score = 0;
    this.stories = 0;
    this.combo = 0;
    this.comboT = 0;
    this.multiplier = 1;
    this.multT = 0;
    this.deadline = 0;
    this.frontT = 0;
    this.invT = 0;
    this.slowT = 0;
    this.dead = false;
    this.deadT = 0;
    this.hitFlash = 0;
    this.vy = 0;
    this.playerY = this.ground - 118;
    this.onGround = true;
    this.jumpsLeft = 2;
    this.slideT = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.animT = 0;
    this.lastSpawn = 0;
    this.nextGap = 420;
    this.spawnIndex = 0;
    this.trauma = 0;
    this.flashWhite = 0;
    this.timeScale = 1;
    this.pops.length = 0;
    for (const e of this.ents) e.active = false;
    for (const p of this.particles) p.active = false;
    if (playing) this.emitHud();
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (this.paused || !this.ready) {
      this.draw(0);
      return;
    }
    if (this.idle) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.scroll += 92 * STEP;
        this.distanceM = this.scroll / PX_PER_METER;
        this.animT += STEP;
        this.seasonAmbient(STEP);
        this.updateParticles(STEP);
        this.acc -= STEP;
      }
      this.draw(0);
      return;
    }
    const actions = this.input.sample();
    if (this.input.pausePressed && !this.dead) this.pause();
    this.acc += dt * this.timeScale;
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + dt * 6);
    while (this.acc >= STEP) {
      this.update(STEP, actions);
      this.acc -= STEP;
    }
    this.draw(this.acc / STEP);
    this.hudClock += dt;
    if (this.hudClock > 0.08) {
      this.hudClock = 0;
      this.emitHud();
    }
  };

  private emitHud() {
    this.onHud({
      score: Math.floor(this.score),
      combo: this.combo,
      multiplier: this.displayMult(),
      distanceM: Math.floor(this.distanceM),
      stories: this.stories,
      deadline: Math.min(1, this.deadline / 100),
      frontPage: this.frontT > 0,
      season: SEASON_LABEL[this.seasonId()],
      invincible: this.invT > 0,
      paused: this.paused,
      boost: this.multT > 0,
    });
  }

  private displayMult() {
    const comboBonus = 1 + Math.floor(this.combo / 5) * 0.5;
    const news = this.multT > 0 ? 2 : 1;
    const front = this.frontT > 0 ? 2 : 1;
    return comboBonus * news * front;
  }

  private seasonProgress() {
    const m = this.distanceM;
    return (m / SEASON_METERS) % SEASON_ORDER.length;
  }

  private seasonId(): SeasonId {
    return SEASON_ORDER[Math.floor(this.seasonProgress()) % 4];
  }

  private nextSeasonId(): SeasonId {
    return SEASON_ORDER[(Math.floor(this.seasonProgress()) + 1) % 4];
  }

  private seasonBlend() {
    const frac = this.seasonProgress() % 1;
    const remain = (1 - frac) * SEASON_METERS;
    if (remain > SEASON_BLEND) return 0;
    return 1 - remain / SEASON_BLEND;
  }

  private update(dt: number, actions: { jump: boolean; slide: boolean; jumpPressed: boolean; slidePressed: boolean }) {
    if (this.dead) {
      this.deadT += dt;
      this.vy += GRAVITY * dt;
      this.playerY += this.vy * dt;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      this.updateParticles(dt);
      if (this.deadT > 0.85 && this.running) {
        this.running = false;
        this.onOver({
          score: Math.floor(this.score),
          stories: this.stories,
          distanceM: Math.floor(this.distanceM),
        });
      }
      return;
    }

    if (actions.jumpPressed) this.jumpBuf = JUMP_BUFFER;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);

    const sliding = this.slideT > 0;
    if (this.onGround && actions.slidePressed) {
      this.slideT = SLIDE_TIME;
      this.playerY = this.ground - 52;
      this.audio.slide();
      this.spawnDust(this.playerX + 40, this.ground - 8, 6);
    }
    if (this.slideT > 0) this.slideT -= dt;

    const canJump = this.onGround || this.coyote > 0 || this.jumpsLeft > 0;
    if (this.jumpBuf > 0 && canJump && !sliding) {
      const first = this.onGround || this.coyote > 0;
      this.vy = first ? JUMP_V : DOUBLE_JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.jumpsLeft = first ? 1 : 0;
      this.facingSquash = 1.18;
      if (first) {
        this.audio.jump();
        this.spawnDust(this.playerX + 30, this.ground - 6, 8);
      } else this.audio.doubleJump();
    }

    this.vy += GRAVITY * dt;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.playerY += this.vy * dt;

    const standH = sliding ? 52 : 118;
    const floor = this.ground - standH;
    if (this.playerY >= floor) {
      if (!this.onGround && this.vy > 200) {
        this.facingSquash = 0.82;
        this.spawnDust(this.playerX + 28, this.ground - 4, 5);
      }
      this.playerY = floor;
      this.vy = 0;
      this.onGround = true;
      this.jumpsLeft = 2;
      this.coyote = COYOTE;
    } else {
      this.onGround = false;
      this.coyote = Math.max(0, this.coyote - dt);
    }

    this.facingSquash += (1 - this.facingSquash) * Math.min(1, dt * 12);
    this.animT += dt * (this.speed / BASE_SPEED);

    const tier = Math.floor(this.distanceM / 500);
    const target = Math.min(MAX_SPEED, BASE_SPEED + tier * SPEED_PER_500);
    let spd = target;
    if (this.frontT > 0) spd *= 1.16;
    if (this.multT > 0) spd *= 1.08;
    if (this.slowT > 0) spd *= SLOW_FACTOR;
    this.speed += (spd - this.speed) * Math.min(1, dt * 3);
    this.scroll += this.speed * dt;
    this.distanceM = this.scroll / PX_PER_METER;
    this.score += this.speed * dt * 0.12 * this.displayMult();

    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.multT > 0) this.multT -= dt;
    if (this.frontT > 0) this.frontT -= dt;
    if (this.invT > 0) this.invT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.flashWhite > 0) this.flashWhite -= dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.2);

    this.spawnAhead();
    this.updateEnts(dt);
    this.updateParticles(dt);
    this.seasonAmbient(dt);
  }

  private spawnAhead() {
    const horizon = this.scroll + this.viewW + this.speed * 1.25;
    while (this.lastSpawn + this.nextGap < horizon) {
      this.lastSpawn += this.nextGap;
      this.placePattern(this.lastSpawn);
      const density = Math.min(0.6, Math.floor(this.distanceM / 500) * 0.1);
      const react = lerp(1.2, 0.92, density);
      this.nextGap = react * this.speed + hash(this.spawnIndex * 17) * 70;
      this.spawnIndex += 1;
    }
  }

  private alloc(): Ent | null {
    for (const e of this.ents) if (!e.active) return e;
    return null;
  }

  private placePattern(x: number) {
    const roll = hash(this.spawnIndex * 91 + 3);
    const tier = Math.floor(this.distanceM / 500);
    if (roll < 0.12) {
      this.placeScoops(x, "arc");
      return;
    }
    if (roll < 0.22) {
      this.placeScoops(x, "line");
      return;
    }
    if (roll < 0.28 && tier >= 0) {
      this.spawnKind("breaking", x + 40, this.ground - 160, 56, 56, false);
      this.placeScoops(x + 80, "line");
      return;
    }
    if (roll < 0.33) {
      this.spawnKind("pass", x, this.ground - 150, 48, 56, false);
      return;
    }
    if (roll < 0.38) {
      this.spawnKind("flash", x, this.ground - 148, 52, 52, false);
      return;
    }
    if (roll < 0.52) {
      this.spawnKind("van", x, this.ground - 92, 150, 92, true);
      this.placeScoops(x + 20, "over");
      return;
    }
    if (roll < 0.66) {
      this.spawnKind("protestor", x, this.ground - 110, 70, 110, true);
      return;
    }
    if (roll < 0.78) {
      this.spawnKind("paparazzi", x, this.ground - 108, 72, 108, true);
      return;
    }
    if (roll < 0.9) {
      this.spawnKind("scaffold", x, this.ground - 210, 120, 118, true);
      return;
    }
    this.spawnKind("cloud", x, this.ground - 130, 130, 90, false);
  }

  private spawnKind(kind: EntKind, x: number, y: number, w: number, h: number, deadly: boolean) {
    const e = this.alloc();
    if (!e) return;
    e.active = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.w = w;
    e.h = h;
    e.deadly = deadly;
    e.collected = false;
    e.bob = 0;
    e.phase = hash(this.spawnIndex * 13) * Math.PI * 2;
  }

  private placeScoops(x: number, mode: "arc" | "line" | "over") {
    const n = mode === "over" ? 4 : 5;
    for (let i = 0; i < n; i++) {
      let y = this.ground - 150;
      if (mode === "arc") y = this.ground - 140 - Math.sin((i / (n - 1)) * Math.PI) * 90;
      if (mode === "over") y = this.ground - 210;
      if (mode === "line") y = this.ground - 132 - (i % 2) * 36;
      this.spawnKind("scoop", x + i * 46, y, 40, 40, false);
    }
  }

  private hitbox() {
    const sliding = this.slideT > 0;
    if (sliding) return { x: this.playerX + 18, y: this.playerY + 8, w: 86, h: 44 };
    return { x: this.playerX + 28, y: this.playerY + 22, w: 50, h: 92 };
  }

  private updateEnts(dt: number) {
    const box = this.hitbox();
    for (const e of this.ents) {
      if (!e.active) continue;
      e.bob += dt;
      if (e.x + e.w < this.scroll - 80) {
        e.active = false;
        continue;
      }
      const sx = e.x - this.scroll;
      const sy = e.y + (e.kind === "scoop" || e.kind === "breaking" || e.kind === "pass" || e.kind === "flash" ? Math.sin(e.bob * 4 + e.phase) * 8 : 0);

      if (!e.deadly && !e.collected) {
        if (aabb(box.x, box.y, box.w, box.h, sx, sy, e.w, e.h)) {
          this.collect(e);
        }
        continue;
      }

      if (e.kind === "cloud") {
        if (aabb(box.x, box.y, box.w, box.h, sx + 10, sy + 10, e.w - 20, e.h - 20)) {
          if (this.slowT <= 0) {
            this.slowT = SLOW_TIME;
            this.combo = 0;
            this.audio.hit();
          }
        }
        continue;
      }

      const pad = e.kind === "van" ? 18 : 12;
      const hit = aabb(box.x, box.y, box.w, box.h, sx + pad, sy + pad, e.w - pad * 2, e.h - pad * 1.4);
      if (hit) {
        if (this.invT > 0) {
          e.active = false;
          this.burst(sx + e.w / 2, sy + e.h / 2, "#f3ead8", 14);
          continue;
        }
        this.die(sx, sy);
        return;
      }
    }
  }

  private collect(e: Ent) {
    e.collected = true;
    e.active = false;
    const sx = e.x - this.scroll;
    if (e.kind === "scoop") {
      this.combo += 1;
      this.comboT = 1.35;
      this.stories += 1;
      this.deadline = Math.min(100, this.deadline + DEADLINE_SCOOP);
      const pts = 50 * this.displayMult();
      this.score += pts;
      this.pop(sx, e.y, `+${Math.floor(pts)}`);
      this.audio.scoop();
      this.burst(sx + 20, e.y + 20, "#e2b93b", 8);
      this.maybeFrontPage();
    } else if (e.kind === "breaking") {
      this.combo += 3;
      this.comboT = 1.6;
      this.stories += 1;
      this.deadline = Math.min(100, this.deadline + DEADLINE_BREAKING);
      this.multT = MULT_TIME;
      const pts = 300 * this.displayMult();
      this.score += pts;
      this.pop(sx, e.y, "BREAKING");
      this.audio.breaking();
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.burst(sx + 20, e.y + 20, "#c41e3a", 16);
      this.maybeFrontPage();
    } else if (e.kind === "pass") {
      this.invT = INVINCIBLE_TIME;
      this.audio.power();
      this.pop(sx, e.y, "PRESS PASS");
      this.burst(sx, e.y, "#f3ead8", 12);
    } else if (e.kind === "flash") {
      this.audio.shutter();
      this.flashWhite = 0.18;
      this.pop(sx, e.y, "FLASH");
      for (const o of this.ents) {
        if (!o.active || !o.deadly) continue;
        if (o.x - this.scroll < this.playerX + FLASH_RANGE && o.x - this.scroll > this.playerX - 40) {
          o.active = false;
          this.burst(o.x - this.scroll + o.w / 2, o.y + o.h / 2, "#ffffff", 10);
        }
      }
    }
  }

  private maybeFrontPage() {
    if (this.deadline >= 100 && this.frontT <= 0) {
      this.deadline = 0;
      this.frontT = FRONTPAGE_TIME;
      this.audio.frontPage();
      this.trauma = Math.min(1, this.trauma + 0.45);
      this.pop(this.playerX, this.playerY - 20, "FRONT PAGE");
    }
  }

  private die(sx: number, sy: number) {
    this.dead = true;
    this.deadT = 0;
    this.vy = -420;
    this.trauma = 1;
    this.hitFlash = 0.25;
    this.timeScale = 0.15;
    this.audio.hit();
    this.burst(sx, sy, "#c41e3a", 22);
    this.emitHud();
  }

  private pop(x: number, y: number, text: string) {
    this.pops.push({ x, y, text, life: 0.8 });
  }

  private burst(x: number, y: number, color: string, n: number) {
    let left = n;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 40;
      p.life = p.max = 0.35 + Math.random() * 0.35;
      p.size = 2 + Math.random() * 4;
      p.color = color;
      p.kind = "spark";
      left -= 1;
      if (left <= 0) break;
    }
  }

  private spawnDust(x: number, y: number, n: number) {
    let left = n;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = -40 - Math.random() * 80;
      p.vy = -20 - Math.random() * 40;
      p.life = p.max = 0.4;
      p.size = 3 + Math.random() * 4;
      p.color = "rgba(243,234,216,0.7)";
      p.kind = "dust";
      left -= 1;
      if (left <= 0) break;
    }
  }

  private seasonAmbient(dt: number) {
    const id = this.seasonId();
    const n = this.reduced ? 0 : id === "rainy" ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const p = this.particles.find((x) => !x.active);
      if (!p) break;
      p.active = true;
      p.x = Math.random() * this.viewW;
      p.y = -10;
      if (id === "rainy") {
        p.vx = -this.speed * 0.25;
        p.vy = 780 + Math.random() * 240;
        p.life = p.max = 0.9;
        p.size = 1.4;
        p.color = "rgba(180,210,230,0.7)";
        p.kind = "rain";
      } else if (id === "autumn") {
        p.vx = -40 - Math.random() * 50;
        p.vy = 40 + Math.random() * 40;
        p.life = p.max = 2.4;
        p.size = 5;
        p.color = ["#c45c26", "#e0a05a", "#8c3a1c"][i % 3]!;
        p.kind = "leaf";
        p.x = this.viewW + Math.random() * 80;
        p.y = Math.random() * this.ground;
      } else if (id === "spring") {
        p.vx = -30 - Math.random() * 40;
        p.vy = 20 + Math.random() * 30;
        p.life = p.max = 2.6;
        p.size = 4;
        p.color = ["#e8b8c4", "#fff8e8", "#b8d4c0"][i % 3]!;
        p.kind = "petal";
        p.x = this.viewW + 20;
        p.y = Math.random() * this.ground;
      } else {
        p.vx = -20;
        p.vy = 10;
        p.life = p.max = 1.6;
        p.size = 3;
        p.color = "rgba(243,234,216,0.35)";
        p.kind = "paper";
        p.x = this.viewW;
        p.y = Math.random() * this.ground * 0.7;
      }
    }
    void dt;
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "spark" || p.kind === "dust") p.vy += 420 * dt;
      if (p.kind === "leaf" || p.kind === "petal") p.x += Math.sin(p.life * 8) * 18 * dt;
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pop = this.pops[i]!;
      pop.life -= dt;
      pop.y -= 40 * dt;
      if (pop.life <= 0) this.pops.splice(i, 1);
    }
  }

  private draw(_alpha: number) {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    ctx.setTransform(
      this.dpr * (this.canvas.clientWidth / w),
      0,
      0,
      this.dpr * (this.canvas.clientHeight / h),
      0,
      0,
    );

    const shake = this.reduced ? 0 : this.trauma * this.trauma;
    const ox = shake ? (hash(Math.floor(this.scroll) + 1) - 0.5) * 18 * shake : 0;
    const oy = shake ? (hash(Math.floor(this.scroll) + 9) - 0.5) * 14 * shake : 0;
    ctx.save();
    ctx.translate(ox, oy);

    this.drawWorld(w, h);
    this.drawEntities();
    this.drawPlayer();
    this.drawParticles();
    this.drawPops();

    ctx.restore();

    if (this.flashWhite > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, this.flashWhite * 4)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(196,30,58,${this.hitFlash})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.frontT > 0) {
      ctx.fillStyle = "rgba(196,30,58,0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(243,234,216,0.35)";
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
    }
    if (this.invT > 0 && Math.floor(this.invT * 12) % 2 === 0) {
      ctx.strokeStyle = "rgba(243,234,216,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeRect(this.playerX - 6, this.playerY - 8, 100, this.slideT > 0 ? 64 : 128);
    }
  }

  private palette(): SeasonPalette {
    const a = PALETTES[this.seasonId()];
    const b = PALETTES[this.nextSeasonId()];
    const t = this.seasonBlend();
    if (t <= 0) return a;
    return {
      far: a.far.map((c, i) => mixHex(c, b.far[i % b.far.length]!, t)),
      mid: a.mid.map((c, i) => mixHex(c, b.mid[i % b.mid.length]!, t)),
      window: mixHex(a.window, b.window, t),
      street: mixHex(a.street, b.street, t),
      sidewalk: mixHex(a.sidewalk, b.sidewalk, t),
      curb: mixHex(a.curb, b.curb, t),
      lamp: mixHex(a.lamp, b.lamp, t),
      fog: a.fog,
      overlay: a.overlay,
      sun: a.sun,
    };
  }

  private drawWorld(w: number, h: number) {
    const ctx = this.ctx;
    const pal = this.palette();
    const sid = this.seasonId();
    const sky = this.assets?.sky[sid];
    if (sky) {
      const scale = Math.max(w / sky.width, h / sky.height);
      const dw = sky.width * scale;
      const dh = sky.height * scale;
      const x = -((this.scroll * 0.04) % dw);
      ctx.drawImage(sky, x, 0, dw, dh);
      ctx.drawImage(sky, x + dw - 1, 0, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, pal.far[0]!);
      g.addColorStop(1, pal.mid[0]!);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    const city = this.assets?.city[sid];
    if (city) {
      ctx.globalAlpha = 0.32;
      const dh = h * 0.42;
      const dw = dh * (city.width / city.height);
      let x = -((this.scroll * 0.16) % dw);
      while (x < w) {
        ctx.drawImage(city, x, this.ground - dh - 8, dw, dh);
        x += dw - 4;
      }
      ctx.globalAlpha = 1;
    }

    this.drawBuildings(w, pal.far, 0.22, 0.42, 8);
    this.drawBuildings(w, pal.mid, 0.5, 0.78, 3);
    this.drawStreet(w, h, pal);

    ctx.fillStyle = pal.fog;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pal.overlay;
    ctx.fillRect(0, 0, w, h);

    if (sid === "sunny" && pal.sun) {
      ctx.fillStyle = pal.sun;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.16, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.16, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawBuildings(w: number, colors: string[], parallax: number, heightMul: number, seedOff: number) {
    const ctx = this.ctx;
    const period = 1400;
    const base = -((this.scroll * parallax) % period);
    for (let x = base - 80; x < w + 160; x += 0) {
      const idx = Math.floor((this.scroll * parallax + x) / 70);
      const r = hash(idx * 19 + seedOff);
      const bw = 58 + r * 92;
      const bh = (90 + hash(idx * 7 + seedOff) * 220) * heightMul;
      const color = colors[Math.abs(idx) % colors.length]!;
      const gx = x;
      const gy = this.ground - bh;
      ctx.fillStyle = color;
      ctx.fillRect(gx, gy, bw - 4, bh);
      ctx.strokeStyle = "#12100c";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gx + 0.5, gy + 0.5, bw - 5, bh);
      const pal = this.palette();
      const cols = 2 + Math.floor(r * 3);
      const rows = 3 + Math.floor(hash(idx + 4) * 5);
      const ww = Math.max(6, (bw - 16) / cols - 6);
      const hh = 8;
      ctx.fillStyle = pal.window;
      for (let c = 0; c < cols; c++) {
        for (let row = 0; row < rows; row++) {
          if (hash(idx * 31 + c * 8 + row) < 0.12) continue;
          ctx.globalAlpha = 0.55 + hash(idx + row) * 0.45;
          ctx.fillRect(gx + 8 + c * (ww + 6), gy + 14 + row * (hh + 10), ww, hh);
        }
      }
      ctx.globalAlpha = 1;
      if (r > 0.7) {
        ctx.fillStyle = "#12100c";
        ctx.fillRect(gx + bw * 0.45, gy - 18, 4, 18);
      }
      x += bw;
    }
  }

  private drawStreet(w: number, h: number, pal: SeasonPalette) {
    const ctx = this.ctx;
    ctx.fillStyle = pal.street;
    ctx.fillRect(0, this.ground, w, h - this.ground);
    ctx.fillStyle = pal.sidewalk;
    ctx.fillRect(0, this.ground - 18, w, 18);
    ctx.fillStyle = pal.curb;
    ctx.fillRect(0, this.ground - 20, w, 3);

    ctx.fillStyle = "rgba(243,234,216,0.35)";
    const dash = 70;
    const off = this.scroll % (dash * 2);
    for (let x = -off; x < w; x += dash * 2) {
      ctx.fillRect(x, this.ground + (h - this.ground) * 0.42, dash * 0.6, 6);
    }

    const period = 420;
    let lx = -((this.scroll) % period);
    while (lx < w + 40) {
      ctx.fillStyle = "#1a1712";
      ctx.fillRect(lx + 8, this.ground - 96, 6, 96);
      ctx.beginPath();
      ctx.fillStyle = pal.lamp;
      ctx.globalAlpha = 0.85;
      ctx.arc(lx + 11, this.ground - 102, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(lx + 11, this.ground - 80, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      lx += period;
    }
  }

  private drawEntities() {
    const ctx = this.ctx;
    for (const e of this.ents) {
      if (!e.active) continue;
      const x = e.x - this.scroll;
      if (x > this.viewW + 40 || x + e.w < -40) continue;
      const bob = e.kind === "scoop" || e.kind === "breaking" || e.kind === "pass" || e.kind === "flash" ? Math.sin(e.bob * 4 + e.phase) * 8 : 0;
      const y = e.y + bob;
      const img =
        e.kind === "van"
          ? this.assets?.van
          : e.kind === "protestor"
            ? this.assets?.protestor
            : e.kind === "paparazzi"
              ? this.assets?.paparazzi
              : e.kind === "scaffold"
                ? this.assets?.scaffolding
                : e.kind === "cloud"
                  ? this.assets?.fakeNews
                  : e.kind === "scoop"
                    ? this.assets?.scoop
                    : e.kind === "breaking"
                      ? this.assets?.breaking
                      : e.kind === "pass"
                        ? this.assets?.pass
                        : e.kind === "flash"
                          ? this.assets?.camera
                          : null;
      if (img) {
        ctx.drawImage(img, x, y, e.w, e.h);
      } else {
        ctx.fillStyle = e.deadly ? "#c41e3a" : "#e2b93b";
        ctx.fillRect(x, y, e.w, e.h);
      }
      if (e.kind === "paparazzi" && Math.floor(e.bob * 8) % 7 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(x + 18, y + 28, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const sliding = this.slideT > 0;
    const frames = sliding ? this.assets?.slide : this.onGround ? this.assets?.run : this.assets?.jump;
    let frame = 0;
    if (sliding) frame = Math.min(3, Math.floor((1 - this.slideT / SLIDE_TIME) * 4));
    else if (this.onGround) frame = Math.floor(this.animT * 10) % Math.max(1, frames?.length ?? 1);
    else {
      if (this.vy < -200) frame = 1;
      else if (this.vy < 80) frame = 2;
      else frame = 3;
      if (frames && frame >= frames.length) frame = frames.length - 1;
    }
    const img = frames?.[frame];
    const dw = sliding ? 118 : 108;
    const dh = sliding ? 70 : 124;
    ctx.save();
    ctx.translate(this.playerX + dw / 2, this.playerY + dh);
    ctx.scale(2 - this.facingSquash, this.facingSquash);
    ctx.translate(-dw / 2, -dh);
    if (this.dead) ctx.rotate(Math.min(0.6, this.deadT * 1.2));
    if (img) ctx.drawImage(img, 0, 0, dw, dh);
    else {
      ctx.fillStyle = "#c4a574";
      ctx.fillRect(20, 8, 64, 110);
    }
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.kind === "rain") {
        ctx.fillRect(p.x, p.y, 1.5, 10);
      } else if (p.kind === "leaf" || p.kind === "petal") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 6);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPops() {
    const ctx = this.ctx;
    ctx.font = "700 18px Oswald, sans-serif";
    ctx.textAlign = "center";
    for (const p of this.pops) {
      ctx.globalAlpha = Math.max(0, p.life / 0.8);
      ctx.fillStyle = "#f3ead8";
      ctx.strokeStyle = "#12100c";
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
