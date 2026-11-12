import { updateEnemyAI, type AIContext } from "./ai";
import { sfx } from "./audio";
import { MATERIALS, RARITY_ORDER, materialsByRarity } from "./materials";
import { Renderer, VIEW_BLOCKS } from "./renderer";
import type {
  Beam,
  Bullet,
  Drop,
  Enemy,
  EnemyDef,
  FloatingText,
  GameEvent,
  Ghost,
  HudSnapshot,
  InputMode,
  Lightning,
  Obstacle,
  Particle,
  Player,
  PlayerMods,
  Ring,
  Weapon,
  WeaponEffect,
  WeaponStats,
} from "./types";
import { UPGRADE_BY_ID, createMods, rollUpgrades, xpToNext, type UpgradeDef } from "./upgrades";
import { DEG, TAU, clamp, damp, pick, rand, randInt, weightedPick } from "./utils";
import { buildWave, rarityWeightsForWave, type WaveSpec } from "./waves";
import { computeDps, createDefaultWeapon, forgeWeapon } from "./weapons";

export const ARENA_HALF = 50;
export const MAX_ARSENAL = 12;
const STARTING_KIT: Record<string, number> = { iron: 2, gunpowder: 2, lens: 1, lead: 1 };
const BASE_HP = 100;
const BASE_SPEED = 6.2;
const BASE_REGEN = 0.015;
const BASE_BODY = 12;
const BASE_MAGNET = 2.8;
const DASH_CD = 2.6;
const OBSTACLE_COUNT = 18;

interface HitOpts {
  bullet?: Bullet;
  noChain?: boolean;
  noExplode?: boolean;
  noFragment?: boolean;
  crit?: boolean;
}

export class Game {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  arenaHalf = ARENA_HALF;
  obstacles: Obstacle[] = [];

  started = false;
  paused = false;
  gameOver = false;
  destroyed = false;
  time = 0;
  private lastTs = 0;
  private rafId = 0;
  private uiTimer = 0;
  private fpsAcc = 0;
  private fpsCount = 0;
  fps = 60;

  player!: Player;
  mods: PlayerMods = createMods();
  upgradeCounts: Record<string, number> = {};
  level = 1;
  xp = 0;
  pendingLevelUps = 0;
  levelUpOptions: UpgradeDef[] | null = null;
  private waveHpBonus = 0;
  curStats!: WeaponStats;

  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  beams: Beam[] = [];
  drops: Drop[] = [];
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  lightnings: Lightning[] = [];
  rings: Ring[] = [];
  ghosts: Ghost[] = [];
  camera = { x: 0, y: 0 };
  private nextId = 1;

  wave = 0;
  bestWave = 0;
  waveState: "intermission" | "active" = "intermission";
  intermissionTimer = 5;
  spawnQueue: EnemyDef[] = [];
  private spawnTimer = 0;
  private waveTime = 0;
  private enrageAnnounced = false;
  waveSpec: WaveSpec | null = null;

  score = 0;
  kills = 0;
  combo = 0;
  comboTimer = 0;
  killsByType: Record<string, number> = {};
  encountered = new Set<string>();
  inventory: Record<string, number> = {};
  arsenal: Weapon[] = [];
  equipped = 0;
  discoveredRecipes = new Set<string>();
  forgedCount = 0;
  materialsCollected = 0;

  // Entrada e opções
  inputMode: InputMode = "pc";
  keys = new Set<string>();
  mouse = { x: 1, y: 0 };
  mouseDown = false;
  autoFire = false;
  autoAim = false;
  showAi = false;
  showDamage = true;
  minimapTop = 78;
  touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };

  onUi?: (s: HudSnapshot) => void;
  onEvent?: (e: GameEvent) => void;

  private grid = new Map<number, Enemy[]>();
  private readonly CELL = 2.6;
  private playerBulletsCache: Bullet[] = [];
  private neighborBuf: Enemy[] = [];
  private collBuf: Enemy[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.reset();
    this.bindInput();
    this.rafId = requestAnimationFrame(this.loop);
  }

  get weapon(): Weapon {
    return this.arsenal[this.equipped] ?? this.arsenal[0];
  }

  get xpToNext() {
    return xpToNext(this.level);
  }

  get comboMult() {
    return this.combo > 1 ? 1 + Math.min(this.combo - 1, 20) * 0.1 : 1;
  }

  get dashCooldownMax() {
    return DASH_CD * (1 - Math.min(0.6, this.mods.dashCd));
  }

  // ── Ciclo de vida ──────────────────────────────────────────
  reset() {
    this.player = {
      x: 0, y: 0, vx: 0, vy: 0, radius: 0.5, hp: BASE_HP, maxHp: BASE_HP, speed: BASE_SPEED, bodyDamage: BASE_BODY,
      aim: 0, fireCooldown: 0, burstLeft: 0, burstTimer: 0, twinToggle: 0, barrelRecoil: [0, 0, 0, 0, 0],
      lastDamageTime: -10, hitFlash: 0, regen: BASE_REGEN, invuln: 0, dashCooldown: 0, dashTime: 0, thrustTimer: 0,
    };
    this.mods = createMods();
    this.upgradeCounts = {};
    this.level = 1;
    this.xp = 0;
    this.pendingLevelUps = 0;
    this.levelUpOptions = null;
    this.waveHpBonus = 0;
    this.enemies = [];
    this.bullets = [];
    this.beams = [];
    this.drops = [];
    this.particles = [];
    this.texts = [];
    this.lightnings = [];
    this.rings = [];
    this.ghosts = [];
    this.camera = { x: 0, y: 0 };
    this.time = 0;
    this.wave = 0;
    this.waveState = "intermission";
    this.intermissionTimer = 6;
    this.spawnQueue = [];
    this.waveSpec = null;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.killsByType = {};
    this.encountered = new Set();
    this.inventory = { ...STARTING_KIT };
    this.arsenal = [createDefaultWeapon()];
    this.equipped = 0;
    this.discoveredRecipes = new Set();
    this.forgedCount = 0;
    this.materialsCollected = 0;
    this.gameOver = false;
    this.mouseDown = false;
    this.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };
    this.generateObstacles();
    this.renderer.setWorld(this.arenaHalf, this.obstacles);
    this.recomputeStats();
  }

  /** Pilares hexagonais espalhados pela arena (bloqueiam movimento, projéteis e visão). */
  private generateObstacles() {
    const H = this.arenaHalf;
    const list: Obstacle[] = [];
    let guard = 0;
    while (list.length < OBSTACLE_COUNT && guard++ < 600) {
      const r = rand(1.5, 3.1);
      const x = rand(-H + 7, H - 7);
      const y = rand(-H + 7, H - 7);
      if (Math.hypot(x, y) < 10) continue;
      if (list.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 7.5)) continue;
      list.push({ x, y, r, rot: rand(0, TAU), sides: Math.random() < 0.7 ? 6 : 8 });
    }
    this.obstacles = list;
  }

  start() {
    this.started = true;
    this.lastTs = performance.now();
  }

  restart() {
    this.reset();
    this.started = true;
    this.paused = false;
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) this.mouseDown = false;
  }

  setInputMode(mode: InputMode) {
    this.inputMode = mode;
    if (mode === "touch") {
      this.autoAim = true;
      this.autoFire = true;
    }
    this.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };
  }

  resize(w: number, h = w) {
    this.renderer.resize(w, h);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.unbindInput();
  }

  private loop = (ts: number) => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    this.fpsAcc += dt;
    this.fpsCount++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsCount / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsCount = 0;
    }
    if (this.started && !this.paused && !this.gameOver) this.update(dt);
    this.renderer.render(this, dt);
    this.uiTimer += dt;
    if (this.uiTimer >= 0.1) {
      this.uiTimer = 0;
      this.onUi?.(this.getSnapshot());
    }
  };

  // ── Entrada ────────────────────────────────────────────────
  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.repeat) return;
    const code = ev.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) ev.preventDefault();
    if (code === "KeyB") return this.onEvent?.({ type: "togglePanel", panel: "bestiary" });
    if (code === "KeyF") return this.onEvent?.({ type: "togglePanel", panel: "forge" });
    if (code === "Escape" || code === "KeyP") return this.onEvent?.({ type: "togglePanel", panel: "pause" });
    if (this.paused) return;
    this.keys.add(code);
    if (code === "KeyE") this.autoFire = !this.autoFire;
    if (code === "KeyQ") this.autoAim = !this.autoAim;
    if (code === "KeyH") this.showAi = !this.showAi;
    if (code === "KeyR" || code === "Tab") {
      ev.preventDefault();
      this.cycleWeapon();
    }
    if (code === "Space" || code === "ShiftLeft") this.dash();
    if (code === "KeyN" && this.waveState === "intermission" && this.started) this.intermissionTimer = Math.min(this.intermissionTimer, 0.01);
    if (code.startsWith("Digit")) {
      const n = parseInt(code.slice(5), 10);
      if (n >= 1 && n <= this.arsenal.length) this.equip(n - 1);
    }
  };
  private onKeyUp = (ev: KeyboardEvent) => {
    this.keys.delete(ev.code);
  };
  private onMouseMove = (ev: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ev.clientX - rect.left - rect.width / 2;
    this.mouse.y = ev.clientY - rect.top - rect.height / 2;
  };
  private onMouseDown = (ev: MouseEvent) => {
    if (ev.button === 0 && !this.paused && this.inputMode === "pc") this.mouseDown = true;
  };
  private onMouseUp = () => {
    this.mouseDown = false;
  };
  private onBlur = () => {
    this.keys.clear();
    this.mouseDown = false;
  };
  private onContext = (ev: Event) => ev.preventDefault();

  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("contextmenu", this.onContext);
  }
  private unbindInput() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("contextmenu", this.onContext);
  }

  // ── Geometria: pilares e linha de visão ────────────────────
  /** Verdadeiro se o segmento A→B não cruza nenhum pilar. */
  hasLineOfSight(ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-6;
    for (const o of this.obstacles) {
      const t = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / len2, 0, 1);
      const cx = ax + dx * t - o.x;
      const cy = ay + dy * t - o.y;
      if (cx * cx + cy * cy < o.r * o.r) return false;
    }
    return true;
  }

  /** Distância ao longo do raio até o primeiro pilar (ou Infinity). */
  private rayObstacleDistance(ox: number, oy: number, dx: number, dy: number, maxT: number) {
    let best = Infinity;
    for (const o of this.obstacles) {
      const fx = ox - o.x;
      const fy = oy - o.y;
      const b = fx * dx + fy * dy;
      const c = fx * fx + fy * fy - o.r * o.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < maxT && t < best) best = t;
    }
    return best;
  }

  /** Empurra um círculo para fora dos pilares; retorna true se houve contato. */
  private pushOutOfObstacles(body: { x: number; y: number; vx: number; vy: number }, radius: number) {
    let hit = false;
    for (const o of this.obstacles) {
      const dx = body.x - o.x;
      const dy = body.y - o.y;
      const rr = o.r + radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        body.x = o.x + nx * rr;
        body.y = o.y + ny * rr;
        const vn = body.vx * nx + body.vy * ny;
        if (vn < 0) {
          body.vx -= vn * nx;
          body.vy -= vn * ny;
        }
        hit = true;
      }
    }
    return hit;
  }

  // ── Estatísticas efetivas (arma × melhorias) ───────────────
  recomputeStats() {
    const s = this.weapon.stats;
    const m = this.mods;
    this.curStats = {
      ...s,
      damage: s.damage * (1 + m.damage),
      rpm: s.rpm * (1 + m.fireRate),
      bulletSpeed: s.bulletSpeed * (1 + m.bulletSpeed),
      range: s.range * (1 + m.bulletSpeed * 0.7),
      pierce: s.pierce + m.pierce,
    };
    const p = this.player;
    const oldMax = p.maxHp;
    p.maxHp = Math.round((BASE_HP + this.waveHpBonus + m.maxHp) * (1 + m.maxHpPct));
    if (p.maxHp > oldMax) p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - oldMax));
    p.speed = BASE_SPEED * (1 + m.speed);
    p.regen = BASE_REGEN + m.regen;
    p.bodyDamage = BASE_BODY * (1 + m.bodyDamage);
  }

  get effectiveDps() {
    const base = computeDps(this.curStats, this.weapon.archetype, this.weapon.effects);
    return base * (1 + this.mods.crit);
  }

  // ── Atualização principal ──────────────────────────────────
  private update(dt: number) {
    this.time += dt;
    this.updatePlayer(dt);
    this.updateWaves(dt);
    this.buildGrid();
    this.playerBulletsCache = this.bullets.filter((b) => b.owner === "player" && !b.isFragment);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.handleCollisions();
    this.updateDrops(dt);
    this.updateFx(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  private nearestEnemy(maxDist: number, needLos = true): Enemy | null {
    const p = this.player;
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead || e.scaleIn < 1) continue;
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bd && (!needLos || this.hasLineOfSight(p.x, p.y, e.x, e.y))) {
        bd = d2;
        best = e;
      }
    }
    return best;
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    let ix = 0;
    let iy = 0;
    let firing = false;

    if (this.inputMode === "touch") {
      ix = this.touch.moveX;
      iy = this.touch.moveY;
    } else {
      const k = this.keys;
      if (k.has("KeyW") || k.has("ArrowUp")) iy -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) iy += 1;
      if (k.has("KeyA") || k.has("ArrowLeft")) ix -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) ix += 1;
    }
    const il = Math.hypot(ix, iy);
    if (il > 1) {
      ix /= il;
      iy /= il;
    }

    // Mira
    let aimed = false;
    if (this.inputMode === "touch" && this.touch.aimActive) {
      p.aim = Math.atan2(this.touch.aimY, this.touch.aimX);
      firing = this.touch.aimMag > 0.3;
      aimed = true;
    }
    if (!aimed && this.autoAim) {
      const t = this.nearestEnemy(Math.max(this.renderer.viewHalfW, this.renderer.viewHalfH) + 1);
      if (t) {
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        const lead = Math.min(1.2, d / this.curStats.bulletSpeed) * 0.8;
        p.aim = Math.atan2(t.y + t.vy * lead - p.y, t.x + t.vx * lead - p.x);
        firing = (this.autoFire || this.mouseDown) && d <= this.curStats.range * 1.3 + t.radius;
        aimed = true;
      }
    }
    if (!aimed) {
      if (this.inputMode === "pc") p.aim = Math.atan2(this.mouse.y, this.mouse.x);
      firing = this.inputMode === "pc" ? this.mouseDown || this.autoFire : false;
    }

    // Movimento
    p.dashTime -= dt;
    p.dashCooldown -= dt;
    p.invuln -= dt;
    if (p.dashTime > 0) {
      p.vx = damp(p.vx, 0, 2.5, dt);
      p.vy = damp(p.vy, 0, 2.5, dt);
      this.ghosts.push({ x: p.x, y: p.y, aim: p.aim, life: 0.25, maxLife: 0.25 });
    } else {
      p.vx = damp(p.vx, ix * p.speed, 9, dt);
      p.vy = damp(p.vy, iy * p.speed, 9, dt);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const lim = this.arenaHalf - p.radius;
    if (p.x < -lim) { p.x = -lim; p.vx = Math.max(0, p.vx); }
    if (p.x > lim) { p.x = lim; p.vx = Math.min(0, p.vx); }
    if (p.y < -lim) { p.y = -lim; p.vy = Math.max(0, p.vy); }
    if (p.y > lim) { p.y = lim; p.vy = Math.min(0, p.vy); }
    this.pushOutOfObstacles(p, p.radius);

    // Rastro dos propulsores
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 2.5) {
      p.thrustTimer -= dt;
      if (p.thrustTimer <= 0) {
        p.thrustTimer = 0.045;
        const bx = p.x - (p.vx / sp) * 0.5;
        const by = p.y - (p.vy / sp) * 0.5;
        this.particles.push({ x: bx, y: by, vx: -p.vx * 0.15 + rand(-0.6, 0.6), vy: -p.vy * 0.15 + rand(-0.6, 0.6), life: 0.3, maxLife: 0.3, color: "#7dd3fc", size: 0.09, shape: "circle", rot: 0, rotV: 0 });
      }
    }

    p.hitFlash = Math.max(0, p.hitFlash - dt * 5);
    for (let i = 0; i < p.barrelRecoil.length; i++) p.barrelRecoil[i] = Math.max(0, p.barrelRecoil[i] - dt * 7);
    if (this.time - p.lastDamageTime > 4) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.regen * dt);

    // Disparo
    p.fireCooldown -= dt;
    if (p.burstLeft > 0) {
      p.burstTimer -= dt;
      if (p.burstTimer <= 0) {
        this.fireShot();
        p.burstLeft--;
        p.burstTimer = 0.07;
      }
    } else if (firing && p.fireCooldown <= 0) {
      const w = this.weapon;
      p.fireCooldown = (60 / this.curStats.rpm) * (w.burst > 1 ? w.burst : 1);
      if (w.burst > 1) {
        p.burstLeft = w.burst - 1;
        p.burstTimer = 0.07;
      }
      this.fireShot();
    }
  }

  /** Impulso rápido com breve invulnerabilidade. */
  dash() {
    const p = this.player;
    if (p.dashCooldown > 0 || this.gameOver || !this.started || this.paused) return;
    let dx = 0;
    let dy = 0;
    if (this.inputMode === "touch") {
      dx = this.touch.moveX;
      dy = this.touch.moveY;
    } else {
      const k = this.keys;
      if (k.has("KeyW") || k.has("ArrowUp")) dy -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) dy += 1;
      if (k.has("KeyA") || k.has("ArrowLeft")) dx -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) dx += 1;
    }
    const l = Math.hypot(dx, dy);
    if (l < 0.2) {
      dx = Math.cos(p.aim);
      dy = Math.sin(p.aim);
    } else {
      dx /= l;
      dy /= l;
    }
    p.vx = dx * 24;
    p.vy = dy * 24;
    p.dashTime = 0.2;
    p.invuln = 0.32;
    p.dashCooldown = this.dashCooldownMax;
    this.rings.push({ x: p.x, y: p.y, maxR: 1.4, life: 0.3, maxLife: 0.3, color: "#67e8f9", width: 0.12 });
    this.burst(p.x, p.y, 10, "#7dd3fc", 0.1, 5, "circle", 0.35);
    sfx.play("dash");
    sfx.vibrate(15);
  }

  cycleWeapon() {
    if (this.arsenal.length < 2) return;
    this.equip((this.equipped + 1) % this.arsenal.length);
  }

  // ── Disparo do jogador ─────────────────────────────────────
  private muzzle(bi: number) {
    const p = this.player;
    const b = this.weapon.barrels[bi];
    const th = p.aim + b.angle;
    return {
      x: p.x + b.length * Math.cos(th) - b.offset * Math.sin(th),
      y: p.y + b.length * Math.sin(th) + b.offset * Math.cos(th),
      angle: th,
    };
  }

  private fireShot() {
    const w = this.weapon;
    const p = this.player;
    const s = this.curStats;
    if (w.isBeam) return this.fireBeam();
    const spreadRad = s.spread * DEG;
    let barrels: number[];
    switch (w.archetype) {
      case "twin":
        barrels = [p.twinToggle];
        p.twinToggle = 1 - p.twinToggle;
        break;
      case "multicannon":
        barrels = w.barrels.map((_, i) => i);
        break;
      case "flak":
        barrels = [2];
        break;
      default:
        barrels = [0];
    }
    const perBarrel = w.archetype === "multicannon" ? 1 : s.count;
    for (const bi of barrels) {
      const m = this.muzzle(bi);
      for (let k = 0; k < perBarrel; k++) {
        let ang = m.angle;
        if (perBarrel > 1) ang += (k / (perBarrel - 1) - 0.5) * spreadRad * 1.6 + (Math.random() - 0.5) * spreadRad * 0.4;
        else ang += (Math.random() - 0.5) * spreadRad;
        const speed = s.bulletSpeed * (w.archetype === "shotgun" ? rand(0.85, 1.15) : 1);
        const crit = Math.random() < this.mods.crit;
        const b = this.spawnBullet("player", m.x, m.y, ang, speed, s.damage * (crit ? 2 : 1), s.bulletSize * (crit ? 1.2 : 1), s.pierce, s.range / s.bulletSpeed, w.color, w.effects, {
          rocket: w.archetype === "rocket",
        });
        b.crit = crit;
      }
      p.barrelRecoil[bi] = 1;
      if (w.archetype === "flak") {
        p.barrelRecoil[0] = 0.6;
        p.barrelRecoil[1] = 0.6;
      }
      this.burst(m.x, m.y, 2, w.color, 0.08, 3, "circle", 0.15);
    }
    const rec = w.recoil * 0.9;
    p.vx -= Math.cos(p.aim) * rec;
    p.vy -= Math.sin(p.aim) * rec;
    sfx.play("shoot", w.archetype === "sniper" || w.archetype === "rocket" || w.archetype === "cannon" ? 0.6 : w.archetype === "machinegun" ? 1.4 : 1);
  }

  private fireBeam() {
    const w = this.weapon;
    const s = this.curStats;
    const p = this.player;
    const m = this.muzzle(0);
    const ang = m.angle + (Math.random() - 0.5) * s.spread * DEG;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const H = this.arenaHalf;
    let endT = s.range;
    const tx = dx > 0 ? (H - m.x) / dx : dx < 0 ? (-H - m.x) / dx : Infinity;
    const ty = dy > 0 ? (H - m.y) / dy : dy < 0 ? (-H - m.y) / dy : Infinity;
    endT = Math.min(endT, tx, ty, this.rayObstacleDistance(m.x, m.y, dx, dy, endT));

    const hits: { e: Enemy; t: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const rx = e.x - m.x;
      const ry = e.y - m.y;
      const t = rx * dx + ry * dy;
      if (t < 0 || t > endT) continue;
      const perp = Math.abs(rx * dy - ry * dx);
      if (perp <= e.radius + s.bulletSize) hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);
    const used = hits.slice(0, s.pierce);
    const sampled = Math.random() > 0.2;
    const crit = Math.random() < this.mods.crit;
    for (const h of used) this.hitEnemy(h.e, s.damage * (crit ? 2 : 1), w.effects, dx * 0.4, dy * 0.4, { noExplode: sampled, noFragment: sampled, noChain: Math.random() > 0.35, crit });
    if (hits.length > s.pierce && used.length) endT = used[used.length - 1].t + used[used.length - 1].e.radius * 0.5;

    this.beams.push({ x1: m.x, y1: m.y, x2: m.x + dx * endT, y2: m.y + dy * endT, width: s.bulletSize * 2 * (crit ? 1.5 : 1), color: w.color, life: 0.09, maxLife: 0.09 });
    p.barrelRecoil[0] = 0.4;
    sfx.play("laser");
    if (Math.random() < 0.5) this.burst(m.x + dx * endT, m.y + dy * endT, 2, w.color, 0.1, 4, "circle", 0.2);
  }

  private spawnBullet(
    owner: "player" | "enemy",
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    radius: number,
    pierce: number,
    life: number,
    color: string,
    effects: WeaponEffect[],
    opts: { rocket?: boolean; fragment?: boolean; homing?: boolean } = {},
  ) {
    const ric = effects.find((e) => e.kind === "ricochet");
    const bullet: Bullet = {
      id: this.nextId++, owner, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius, damage, pierce, life, maxLife: life, color,
      effects, hit: new Set(), homing: !!opts.homing || effects.some((e) => e.kind === "homing"),
      bounces: ric ? Math.round(1 + ric.power * 2) : 0, rocket: !!opts.rocket, isFragment: !!opts.fragment, trailTimer: 0, spin: rand(0, TAU), exploded: false, crit: false,
    };
    this.bullets.push(bullet);
    return bullet;
  }

  // ── Ondas ──────────────────────────────────────────────────
  private updateWaves(dt: number) {
    if (this.waveState === "intermission") {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) this.startWave(this.wave + 1);
      return;
    }
    this.waveTime += dt;
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 28) {
        const batch = Math.min(this.spawnQueue.length, 2 + Math.floor(this.wave / 3));
        for (let i = 0; i < batch; i++) this.spawnEnemy(this.spawnQueue.shift()!);
        this.spawnTimer = 2.2;
      }
    } else if (this.enemies.length === 0) {
      this.completeWave();
    } else if (this.enemies.length <= 3 && this.waveTime > 50 && !this.enrageAnnounced) {
      this.enrageAnnounced = true;
      for (const e of this.enemies) {
        e.enraged = true;
        e.retreatCount = 3;
        e.state = "attack";
      }
    }
  }

  startWave(n: number) {
    this.wave = n;
    this.bestWave = Math.max(this.bestWave, n);
    this.waveSpec = buildWave(n);
    this.spawnQueue = [...this.waveSpec.enemies];
    this.spawnTimer = 0.6;
    this.waveTime = 0;
    this.enrageAnnounced = false;
    this.waveState = "active";
    sfx.play("wave");
  }

  private completeWave() {
    this.waveState = "intermission";
    this.intermissionTimer = 12;
    const p = this.player;
    this.waveHpBonus += 5;
    this.recomputeStats();
    p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * 0.5 + 5);
    this.score += this.wave * 25;
    this.addXp(10 + this.wave * 5);
    const weights = rarityWeightsForWave(this.wave);
    const nRewards = 2 + Math.floor(this.wave / 5);
    for (let i = 0; i < nRewards; i++) {
      const rarity = weightedPick(RARITY_ORDER, (r) => weights[r]);
      const mat = pick(materialsByRarity(rarity));
      const a = rand(0, TAU);
      this.spawnDrop(mat.id, p.x + Math.cos(a) * 2.5, p.y + Math.sin(a) * 2.5, 0);
    }
    this.rings.push({ x: p.x, y: p.y, maxR: 4, life: 0.8, maxLife: 0.8, color: "#4ade80", width: 0.15 });
    this.onEvent?.({ type: "wavecleared" });
  }

  /** Posição de surgimento logo fora da área visível (tela cheia), dentro da arena. */
  private spawnPosition(radius: number) {
    const p = this.player;
    const H = this.arenaHalf;
    const vw = this.renderer.viewHalfW;
    const vh = this.renderer.viewHalfH;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 18; tries++) {
      const a = rand(0, TAU);
      const c = Math.cos(a);
      const s = Math.sin(a);
      const exit = Math.min(vw / Math.max(1e-3, Math.abs(c)), vh / Math.max(1e-3, Math.abs(s)));
      const r = exit + rand(2.5, 6);
      x = clamp(p.x + c * r, -H + 1.5 + radius, H - 1.5 - radius);
      y = clamp(p.y + s * r, -H + 1.5 + radius, H - 1.5 - radius);
      const outside = Math.abs(x - p.x) > vw + 0.5 || Math.abs(y - p.y) > vh + 0.5;
      const clear = !this.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + radius + 0.5);
      if (outside && clear) break;
    }
    return { x, y };
  }

  private spawnEnemy(def: EnemyDef) {
    const spec = this.waveSpec ?? buildWave(Math.max(1, this.wave));
    const elite = !def.boss && this.wave >= 3 && Math.random() < Math.min(0.18, 0.03 + this.wave * 0.01);
    const radius = def.radius * (elite ? 1.12 : 1);
    const { x, y } = this.spawnPosition(radius);
    const hpMul = def.boss ? 1 + 0.1 * (this.wave - 1) : spec.hpMul;
    const hp = def.hp * hpMul * (elite ? 2.2 : 1);
    const e: Enemy = {
      id: this.nextId++, def, x, y, vx: 0, vy: 0, rot: rand(0, TAU), aim: 0, hp, maxHp: hp,
      speed: def.speed * spec.speedMul * (elite ? 1.05 : 1), damage: def.damage * spec.dmgMul * (elite ? 1.3 : 1), radius,
      state: "attack", stateTimer: 0, prevState: "attack", savedTimer: 0, dodgeX: 0, dodgeY: 0, dodgeCooldown: rand(0, 0.5),
      strafeDir: Math.random() < 0.5 ? -1 : 1, strafeTimer: rand(1, 3), retreatCount: 0, recentDamage: 0,
      fireCooldown: rand(0.6, 1.6), contactCooldown: 0, chargeTimer: rand(1, 3), charging: 0, hitFlash: 0,
      burn: null, slow: 0, slowPower: 0, dmgAccum: 0, dmgTextTimer: 0, dead: false, moveX: 0, moveY: 0, agility: 6,
      spawnTime: this.time, scaleIn: 0, elite, enraged: this.enrageAnnounced && !def.boss, los: true,
    };
    this.enemies.push(e);
    this.encountered.add(def.id);
    this.rings.push({ x, y, maxR: e.radius * 3, life: 0.6, maxLife: 0.6, color: elite ? "#fbbf24" : def.color, width: 0.1 });
    if (def.boss) {
      this.renderer.shake = Math.min(1.5, this.renderer.shake + 0.8);
      sfx.play("boss");
      sfx.vibrate([60, 40, 120]);
    }
  }

  // ── Inimigos ───────────────────────────────────────────────
  private buildGrid() {
    this.grid.clear();
    const H = this.arenaHalf;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const cx = Math.floor((e.x + H) / this.CELL);
      const cy = Math.floor((e.y + H) / this.CELL);
      const key = cx * 4096 + cy;
      const arr = this.grid.get(key);
      if (arr) arr.push(e);
      else this.grid.set(key, [e]);
    }
  }

  private queryGrid(x: number, y: number, out: Enemy[]) {
    out.length = 0;
    const H = this.arenaHalf;
    const cx = Math.floor((x + H) / this.CELL);
    const cy = Math.floor((y + H) / this.CELL);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const arr = this.grid.get((cx + i) * 4096 + (cy + j));
        if (arr) for (const e of arr) out.push(e);
      }
    }
    return out;
  }

  /** Desvio de pilares: adiciona um componente perpendicular ao movimento quando há um pilar à frente. */
  private steerAroundObstacles(e: Enemy) {
    const ml = Math.hypot(e.moveX, e.moveY);
    if (ml < 0.01) return;
    for (const o of this.obstacles) {
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const reach = o.r + e.radius + 2.4;
      if (d > reach) continue;
      const toward = (dx * e.moveX + dy * e.moveY) / (d * ml);
      if (toward < 0.15) continue;
      const cross = e.moveX * dy - e.moveY * dx;
      const side = cross > 0 ? -1 : 1;
      const strength = (1 - d / reach) * 1.8 * toward;
      e.moveX += (-e.moveY / ml) * side * strength;
      e.moveY += (e.moveX / ml) * side * strength;
    }
    const nl = Math.hypot(e.moveX, e.moveY);
    if (nl > ml) {
      e.moveX *= ml / nl;
      e.moveY *= ml / nl;
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const ctx: AIContext = { px: p.x, py: p.y, pvx: p.vx, pvy: p.vy, playerBullets: this.playerBulletsCache, arenaHalf: this.arenaHalf, time: this.time };
    const H = this.arenaHalf;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const def = e.def;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
      e.contactCooldown -= dt;

      if (e.scaleIn < 1) {
        e.scaleIn = Math.min(1, e.scaleIn + dt / 0.6);
        if (e.scaleIn < 1) continue;
      }
      e.fireCooldown -= dt;

      if (e.burn) {
        this.damageEnemy(e, e.burn.dps * dt, false);
        e.burn.time -= dt;
        if (e.burn.time <= 0) e.burn = null;
        if (e.dead) continue;
      }
      if (e.slow > 0) e.slow -= dt;

      e.los = this.hasLineOfSight(e.x, e.y, p.x, p.y);
      const wantsFire = updateEnemyAI(e, ctx, dt);
      this.steerAroundObstacles(e);

      const spMul = e.slow > 0 ? 1 - e.slowPower : 1;
      e.vx = damp(e.vx, e.moveX * e.speed * spMul, e.agility, dt);
      e.vy = damp(e.vy, e.moveY * e.speed * spMul, e.agility, dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const lim = H - e.radius;
      if (e.x < -lim) { e.x = -lim; e.vx = Math.max(0, e.vx); }
      if (e.x > lim) { e.x = lim; e.vx = Math.min(0, e.vx); }
      if (e.y < -lim) { e.y = -lim; e.vy = Math.max(0, e.vy); }
      if (e.y > lim) { e.y = lim; e.vy = Math.min(0, e.vy); }
      this.pushOutOfObstacles(e, e.radius);

      if (def.rotateSpeed > 0) e.rot += def.rotateSpeed * dt;
      else {
        let diff = e.aim - e.rot;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        e.rot += diff * Math.min(1, dt * 10);
      }

      if (wantsFire) {
        this.fireEnemy(e);
        e.fireCooldown = (1 / def.fireRate) * (e.retreatCount >= 3 ? 0.7 : 1) * (e.elite ? 0.85 : 1);
      }

      if (def.healer) {
        for (const o of this.enemies) {
          if (o === e || o.dead || o.hp >= o.maxHp) continue;
          if (Math.hypot(o.x - e.x, o.y - e.y) < 4) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.03 * dt);
            if (Math.random() < dt * 3) this.burst(o.x, o.y, 1, "#2dd4bf", 0.08, 1.2, "circle", 0.5);
          }
        }
      }

      e.dmgTextTimer -= dt;
      if (e.dmgAccum > 0 && e.dmgTextTimer <= 0) {
        if (this.showDamage) this.texts.push({ x: e.x + rand(-0.3, 0.3), y: e.y - e.radius - 0.2, vy: -1.4, text: `${Math.round(e.dmgAccum)}`, color: "#fef08a", life: 0.6, maxLife: 0.6, size: 0.3 });
        e.dmgAccum = 0;
        e.dmgTextTimer = 0.18;
      }
    }

    const buf = this.neighborBuf;
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.queryGrid(e.x, e.y, buf);
      for (const o of buf) {
        if (o.id <= e.id || o.dead) continue;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        const rr = e.radius + o.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          const me = e.radius * e.radius;
          const mo = o.radius * o.radius;
          const tot = me + mo;
          e.x -= nx * push * (mo / tot);
          e.y -= ny * push * (mo / tot);
          o.x += nx * push * (me / tot);
          o.y += ny * push * (me / tot);
        }
      }
    }
  }

  private fireEnemy(e: Enemy) {
    const def = e.def;
    const spd = def.bulletSpeed;
    const life = (def.range / spd) * 1.3 + 0.2;
    const muzzle = e.radius * 1.3;
    const color = e.elite ? "#fbbf24" : def.color;
    const shoot = (ang: number) =>
      this.spawnBullet("enemy", e.x + Math.cos(ang) * muzzle, e.y + Math.sin(ang) * muzzle, ang, spd, e.damage, def.bulletSize * (e.elite ? 1.15 : 1), 1, life, color, [], { homing: def.homing });
    const inacc = (1 - def.accuracy) * 7 * DEG;
    switch (def.pattern) {
      case "single":
        shoot(e.aim + (Math.random() - 0.5) * inacc * 2);
        break;
      case "spread": {
        const n = def.bulletCount;
        for (let k = 0; k < n; k++) shoot(e.aim + (n > 1 ? (k / (n - 1) - 0.5) * def.bulletSpread * DEG : 0));
        break;
      }
      case "radial": {
        const n = def.bulletCount;
        for (let k = 0; k < n; k++) shoot(e.rot + (k * TAU) / n);
        break;
      }
      case "cross":
        for (let k = 0; k < 4; k++) shoot(e.rot + (k * Math.PI) / 2);
        break;
      default:
        break;
    }
  }

  // ── Projéteis ──────────────────────────────────────────────
  private updateBullets(dt: number) {
    const H = this.arenaHalf;
    const p = this.player;
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.homing) {
        let tx = NaN;
        let ty = NaN;
        if (b.owner === "player") {
          let best = 49;
          for (const e of this.enemies) {
            if (e.dead || b.hit.has(e.id)) continue;
            const d2 = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
            if (d2 < best) {
              best = d2;
              tx = e.x;
              ty = e.y;
            }
          }
        } else if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < 144) {
          tx = p.x;
          ty = p.y;
        }
        if (!Number.isNaN(tx)) {
          const sp = Math.hypot(b.vx, b.vy);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = Math.atan2(ty - b.y, tx - b.x) - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const hp = b.effects.find((e) => e.kind === "homing")?.power ?? 0.8;
          const rate = (b.owner === "player" ? 3 + 3 * hp : 2.2) * dt;
          const na = cur + clamp(diff, -rate, rate);
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 8;
      const lim = H - b.radius;
      if (Math.abs(b.x) > lim || Math.abs(b.y) > lim) {
        if (b.bounces > 0) {
          b.bounces--;
          if (Math.abs(b.x) > lim) { b.vx *= -1; b.x = clamp(b.x, -lim, lim); }
          if (Math.abs(b.y) > lim) { b.vy *= -1; b.y = clamp(b.y, -lim, lim); }
          b.hit.clear();
          this.burst(b.x, b.y, 3, b.color, 0.08, 3, "circle", 0.25);
        } else {
          b.life = 0;
        }
      }
      // Pilares
      if (b.life > 0) {
        for (const o of this.obstacles) {
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const rr = o.r + b.radius;
          if (dx * dx + dy * dy < rr * rr) {
            const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const nx = dx / d;
            const ny = dy / d;
            if (b.bounces > 0) {
              b.bounces--;
              const vn = b.vx * nx + b.vy * ny;
              b.vx -= 2 * vn * nx;
              b.vy -= 2 * vn * ny;
              b.x = o.x + nx * (rr + 0.02);
              b.y = o.y + ny * (rr + 0.02);
              b.hit.clear();
            } else {
              b.life = 0;
            }
            this.burst(b.x, b.y, 3, b.color, 0.07, 3, "circle", 0.2);
            break;
          }
        }
      }
      if (b.rocket) {
        b.trailTimer -= dt;
        if (b.trailTimer <= 0) {
          b.trailTimer = 0.03;
          const sp = Math.hypot(b.vx, b.vy) || 1;
          this.particles.push({ x: b.x - (b.vx / sp) * b.radius * 1.6, y: b.y - (b.vy / sp) * b.radius * 1.6, vx: -b.vx * 0.2 + rand(-1, 1), vy: -b.vy * 0.2 + rand(-1, 1), life: 0.35, maxLife: 0.35, color: Math.random() < 0.5 ? "#fb923c" : "#fde68a", size: b.radius * 0.7, shape: "circle", rot: 0, rotV: 0 });
        }
      }
    }
  }

  private handleCollisions() {
    const p = this.player;
    const dmgMul = this.waveSpec?.dmgMul ?? 1;
    const buf = this.collBuf;

    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (b.owner === "player") {
        this.queryGrid(b.x, b.y, buf);
        for (const e of buf) {
          if (e.dead || b.hit.has(e.id)) continue;
          const rr = e.radius + b.radius;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          if (dx * dx + dy * dy < rr * rr) {
            b.hit.add(e.id);
            const sp = Math.hypot(b.vx, b.vy) || 1;
            this.hitEnemy(e, b.damage, b.effects, b.vx / sp, b.vy / sp, { bullet: b, noFragment: b.isFragment, noChain: b.isFragment, noExplode: b.isFragment, crit: b.crit });
            this.burst(b.x, b.y, 3, b.color, 0.07, 4, "circle", 0.25);
            sfx.play("hit");
            b.pierce--;
            b.damage *= 0.9;
            if (b.pierce <= 0) {
              b.life = 0;
              break;
            }
          }
        }
      } else {
        const rr = p.radius + b.radius;
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        if (dx * dx + dy * dy < rr * rr && !this.gameOver) {
          if (p.invuln > 0) {
            this.burst(b.x, b.y, 3, "#67e8f9", 0.07, 3, "circle", 0.2);
          } else {
            this.damagePlayer(b.damage);
            this.burst(b.x, b.y, 5, b.color, 0.08, 4, "circle", 0.3);
          }
          b.life = 0;
        }
      }
    }

    for (const e of this.enemies) {
      if (e.dead || e.scaleIn < 1) continue;
      const rr = e.radius + p.radius;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = rr - d;
        p.x += nx * overlap * 0.6;
        p.y += ny * overlap * 0.6;
        e.x -= nx * overlap * 0.4;
        e.y -= ny * overlap * 0.4;
        if (e.contactCooldown <= 0) {
          e.contactCooldown = 0.6;
          if (p.invuln <= 0) this.damagePlayer(e.def.contactDamage * dmgMul * (e.elite ? 1.3 : 1));
          this.damageEnemy(e, p.bodyDamage * (p.dashTime > 0 ? 2.5 : 1), true);
          p.vx += nx * 7;
          p.vy += ny * 7;
          e.vx -= nx * 3;
          e.vy -= ny * 3;
          this.burst((p.x + e.x) / 2, (p.y + e.y) / 2, 6, "#fca5a5", 0.08, 4, "square", 0.3);
        }
      }
    }

    for (const b of this.bullets) {
      if (b.life <= 0 && b.owner === "player" && !b.exploded) {
        const ex = b.effects.find((e) => e.kind === "explosive");
        if (ex) {
          b.exploded = true;
          this.explode(b.x, b.y, 1 + 0.6 * ex.power, b.damage * (0.6 + 0.3 * ex.power), b.color, null);
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  // ── Dano e efeitos ─────────────────────────────────────────
  private hitEnemy(e: Enemy, dmg: number, effects: WeaponEffect[], dirX: number, dirY: number, opts: HitOpts) {
    if (e.dead) return;
    let kb = 1.2;
    for (const ef of effects) {
      switch (ef.kind) {
        case "burn":
          e.burn = { dps: Math.max(e.burn?.dps ?? 0, dmg * 0.4 * ef.power), time: 3 };
          break;
        case "slow":
          e.slow = 2;
          e.slowPower = clamp(0.4 * ef.power, 0.2, 0.6);
          break;
        case "knockback":
          kb += 5 * ef.power;
          break;
        case "lifesteal":
          this.healPlayer(dmg * (0.04 + 0.04 * ef.power), "#a855f7");
          break;
        case "chain":
          if (!opts.noChain) this.chain(e, dmg * 0.5, 1 + Math.round(ef.power), ef.power);
          break;
        case "explosive":
          if (!opts.noExplode && !opts.bullet?.exploded) {
            if (opts.bullet) opts.bullet.exploded = true;
            this.explode(e.x, e.y, 1 + 0.6 * ef.power, dmg * (0.6 + 0.3 * ef.power), opts.bullet?.color ?? this.weapon.color, e);
          }
          break;
        case "fragment":
          if (!opts.noFragment) {
            const n = 3 + Math.round(ef.power);
            for (let i = 0; i < n; i++) {
              const a = rand(0, TAU);
              const fr = Math.max(0.09, (opts.bullet?.radius ?? 0.2) * 0.55);
              const fb = this.spawnBullet("player", e.x + Math.cos(a) * (e.radius + fr + 0.2), e.y + Math.sin(a) * (e.radius + fr + 0.2), a, 9, dmg * 0.4, fr, 1, 0.45, opts.bullet?.color ?? this.weapon.color, [], { fragment: true });
              fb.hit.add(e.id);
            }
          }
          break;
        default:
          break;
      }
    }
    if (this.mods.lifesteal > 0) this.healPlayer(dmg * this.mods.lifesteal, "#a855f7");
    const mass = Math.max(0.2, e.radius * e.radius * 4);
    e.vx += (dirX * kb) / mass;
    e.vy += (dirY * kb) / mass;
    if (opts.crit) {
      if (this.showDamage) this.texts.push({ x: e.x + rand(-0.3, 0.3), y: e.y - e.radius - 0.4, vy: -1.6, text: `${Math.round(dmg)}`, color: "#fb923c", life: 0.7, maxLife: 0.7, size: 0.42 });
      this.damageEnemy(e, dmg, true, true);
    } else {
      this.damageEnemy(e, dmg, true);
    }
  }

  private healPlayer(amount: number, color: string) {
    const p = this.player;
    if (p.hp >= p.maxHp) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    if (Math.random() < 0.3) this.burst(p.x, p.y, 1, color, 0.08, 1.5, "circle", 0.5);
  }

  private chain(from: Enemy, dmg: number, jumps: number, power: number) {
    let cur = from;
    const visited = new Set<number>([from.id]);
    for (let j = 0; j < jumps; j++) {
      let best: Enemy | null = null;
      let bd = 3.5 * 3.5;
      for (const o of this.enemies) {
        if (o.dead || visited.has(o.id)) continue;
        const d2 = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = o;
        }
      }
      if (!best) break;
      visited.add(best.id);
      const pts = [{ x: cur.x, y: cur.y }];
      const segs = 5;
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        pts.push({ x: cur.x + (best.x - cur.x) * t + rand(-0.3, 0.3), y: cur.y + (best.y - cur.y) * t + rand(-0.3, 0.3) });
      }
      pts.push({ x: best.x, y: best.y });
      this.lightnings.push({ points: pts, life: 0.15, maxLife: 0.15, color: "#38bdf8" });
      this.damageEnemy(best, dmg * (0.8 + 0.2 * power), true);
      cur = best;
    }
  }

  private explode(x: number, y: number, radius: number, dmg: number, color: string, exclude: Enemy | null) {
    for (const e of this.enemies) {
      if (e.dead || e === exclude) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < radius + e.radius) {
        const fall = 1 - 0.5 * (d / (radius + e.radius));
        this.damageEnemy(e, dmg * fall, true);
        const nx = (e.x - x) / (d || 1);
        const ny = (e.y - y) / (d || 1);
        e.vx += nx * 4;
        e.vy += ny * 4;
      }
    }
    this.rings.push({ x, y, maxR: radius, life: 0.3, maxLife: 0.3, color, width: 0.15 });
    this.burst(x, y, 10, color, 0.12, 6, "circle", 0.4);
    this.burst(x, y, 5, "#fde68a", 0.1, 5, "circle", 0.3);
    this.renderer.shake = Math.min(0.6, this.renderer.shake + 0.06 * radius);
    if (Math.random() < 0.5) sfx.play("explosion");
  }

  private damageEnemy(e: Enemy, amount: number, flash: boolean, silent = false) {
    if (e.dead) return;
    e.hp -= amount;
    e.recentDamage += amount;
    if (!silent) e.dmgAccum += amount;
    if (flash) e.hitFlash = 1;
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    e.dead = true;
    const def = e.def;
    this.kills++;
    this.killsByType[def.id] = (this.killsByType[def.id] ?? 0) + 1;
    this.combo++;
    this.comboTimer = 2.5;
    const basePts = Math.round(def.score * (1 + this.wave * 0.05) * (e.elite ? 3 : 1));
    this.score += Math.round(basePts * this.comboMult);
    this.addXp(def.score * (e.elite ? 2 : 1) * (def.boss ? 1.5 : 1));
    this.burst(e.x, e.y, Math.round(8 + e.radius * 12), e.elite ? "#fbbf24" : def.color, 0.12 + e.radius * 0.08, 5 + e.radius * 2, "shard", 0.6);
    this.rings.push({ x: e.x, y: e.y, maxR: e.radius * 2.2, life: 0.35, maxLife: 0.35, color: def.color, width: 0.1 });
    this.spawnDrops(e);
    sfx.play("kill", def.boss ? 0.4 : e.elite ? 0.7 : 1 + Math.random() * 0.3);
    if (def.boss) {
      this.renderer.shake = Math.min(2, this.renderer.shake + 1.5);
      this.score += 500;
      sfx.play("explosion");
      sfx.vibrate([80, 50, 80, 50, 200]);
    }
  }

  private damagePlayer(amount: number) {
    if (this.gameOver) return;
    const p = this.player;
    p.hp -= amount;
    p.lastDamageTime = this.time;
    p.hitFlash = 1;
    this.renderer.shake = Math.min(1.2, this.renderer.shake + amount / 50);
    sfx.play("hurt");
    sfx.vibrate(amount > 15 ? 40 : 20);
    if (p.hp <= 0) {
      p.hp = 0;
      this.endGame();
    }
  }

  private endGame() {
    this.gameOver = true;
    this.burst(this.player.x, this.player.y, 40, "#38bdf8", 0.15, 7, "shard", 1.2);
    this.rings.push({ x: this.player.x, y: this.player.y, maxR: 3, life: 0.8, maxLife: 0.8, color: "#38bdf8", width: 0.2 });
    this.onEvent?.({ type: "gameover" });
    this.onUi?.(this.getSnapshot());
  }

  // ── Experiência e melhorias ────────────────────────────────
  private addXp(n: number) {
    this.xp += n;
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.pendingLevelUps++;
      leveled = true;
    }
    if (leveled) {
      this.rings.push({ x: this.player.x, y: this.player.y, maxR: 2.2, life: 0.6, maxLife: 0.6, color: "#fbbf24", width: 0.15 });
      this.burst(this.player.x, this.player.y, 14, "#fde68a", 0.1, 5, "circle", 0.6);
      sfx.play("levelup");
      if (!this.levelUpOptions) {
        this.levelUpOptions = rollUpgrades(this.upgradeCounts);
        this.onEvent?.({ type: "levelup" });
      }
    }
  }

  applyUpgrade(id: string): "more" | "done" {
    const u = UPGRADE_BY_ID[id];
    if (u && this.pendingLevelUps > 0) {
      u.apply(this.mods);
      this.upgradeCounts[id] = (this.upgradeCounts[id] ?? 0) + 1;
      this.pendingLevelUps--;
      this.recomputeStats();
      if (id === "vigor") this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    }
    if (this.pendingLevelUps > 0) {
      this.levelUpOptions = rollUpgrades(this.upgradeCounts);
      return "more";
    }
    this.levelUpOptions = null;
    return "done";
  }

  // ── Drops ──────────────────────────────────────────────────
  private spawnDrop(material: string, x: number, y: number, scatter = 1) {
    const a = rand(0, TAU);
    const s = rand(2, 5) * scatter;
    this.drops.push({ id: this.nextId++, material, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, ttl: 60 });
  }

  private spawnDrops(e: Enemy) {
    const luck = this.mods.luck;
    for (const d of e.def.drops) {
      if (Math.random() < d.chance * (1 + luck * 0.5)) {
        const n = randInt(d.min, d.max);
        for (let i = 0; i < n; i++) this.spawnDrop(d.material, e.x, e.y);
      }
    }
    const weights = rarityWeightsForWave(this.wave);
    if (Math.random() < Math.min(0.6, 0.03 + this.wave * 0.012 + luck)) {
      const rarity = weightedPick(RARITY_ORDER, (r) => weights[r]);
      this.spawnDrop(pick(materialsByRarity(rarity)).id, e.x, e.y);
    }
    if (e.elite) {
      const rarity = weightedPick(RARITY_ORDER.slice(2), (r) => weights[r]);
      this.spawnDrop(pick(materialsByRarity(rarity)).id, e.x, e.y);
    }
  }

  private updateDrops(dt: number) {
    const p = this.player;
    const H = this.arenaHalf;
    const magnet = BASE_MAGNET + this.mods.magnet;
    for (const d of this.drops) {
      d.age += dt;
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      const dd = Math.hypot(dx, dy) || 0.001;
      if (dd < magnet && !this.gameOver) {
        const f = (magnet - dd) / magnet;
        d.vx = damp(d.vx, (dx / dd) * (5 + 12 * f), 10, dt);
        d.vy = damp(d.vy, (dy / dd) * (5 + 12 * f), 10, dt);
      } else {
        d.vx *= Math.exp(-4 * dt);
        d.vy *= Math.exp(-4 * dt);
      }
      d.x = clamp(d.x + d.vx * dt, -H + 0.3, H - 0.3);
      d.y = clamp(d.y + d.vy * dt, -H + 0.3, H - 0.3);
      this.pushOutOfObstacles(d, 0.25);
      if (dd < p.radius + 0.3 && !this.gameOver) {
        const m = MATERIALS[d.material];
        this.inventory[d.material] = (this.inventory[d.material] ?? 0) + 1;
        this.materialsCollected++;
        d.age = Infinity;
        if (m) {
          this.burst(p.x, p.y, 5, m.color, 0.07, 3, "square", 0.4);
          sfx.play("pickup");
        }
      }
    }
    this.drops = this.drops.filter((d) => d.age < d.ttl);
  }

  // ── Efeitos visuais ────────────────────────────────────────
  private burst(x: number, y: number, n: number, color: string, size: number, speed: number, shape: Particle["shape"], life: number) {
    if (this.particles.length > 500) this.particles.splice(0, n);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(0.3, 1) * speed;
      const l = life * rand(0.6, 1.2);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, maxLife: l, color, size: size * rand(0.6, 1.3), shape, rot: rand(0, TAU), rotV: rand(-8, 8) });
    }
  }

  private updateFx(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      p.rot += p.rotV * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const l of this.lightnings) l.life -= dt;
    this.lightnings = this.lightnings.filter((l) => l.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  // ── Fundição / Arsenal ─────────────────────────────────────
  canAfford(ids: string[]) {
    const need: Record<string, number> = {};
    for (const id of ids) need[id] = (need[id] ?? 0) + 1;
    return Object.entries(need).every(([id, n]) => (this.inventory[id] ?? 0) >= n);
  }

  forge(ids: string[]): { weapon: Weapon; status: "ok" | "owned" | "full" | "invalid" } {
    if (ids.length < 3 || ids.length > 5 || !this.canAfford(ids)) return { weapon: this.weapon, status: "invalid" };
    const weapon = forgeWeapon(ids);
    const existingIdx = this.arsenal.findIndex((w) => w.id === weapon.id);
    if (existingIdx >= 0) return { weapon: this.arsenal[existingIdx], status: "owned" };
    if (this.arsenal.length >= MAX_ARSENAL) return { weapon, status: "full" };
    for (const id of ids) this.inventory[id] = (this.inventory[id] ?? 0) - 1;
    this.arsenal.push(weapon);
    this.forgedCount++;
    this.discoveredRecipes.add(weapon.id);
    sfx.play("forge");
    this.onEvent?.({ type: "forge" });
    return { weapon, status: "ok" };
  }

  equip(i: number) {
    if (i < 0 || i >= this.arsenal.length) return;
    this.equipped = i;
    this.player.barrelRecoil = [0, 0, 0, 0, 0];
    this.player.burstLeft = 0;
    this.player.twinToggle = 0;
    this.recomputeStats();
  }

  /** Desmonta uma arma devolvendo um material aleatório da receita. */
  discard(i: number): string | null {
    if (i <= 0 || i >= this.arsenal.length) return null;
    const [w] = this.arsenal.splice(i, 1);
    if (this.equipped === i) this.equipped = 0;
    else if (this.equipped > i) this.equipped--;
    this.recomputeStats();
    if (w.recipe.length) {
      const refund = pick(w.recipe);
      this.inventory[refund] = (this.inventory[refund] ?? 0) + 1;
      return refund;
    }
    return null;
  }

  // ── Snapshot para a UI ─────────────────────────────────────
  getSnapshot(): HudSnapshot {
    const boss = this.enemies.find((e) => e.def.boss && !e.dead);
    const inventoryTotal = Object.values(this.inventory).reduce((a, b) => a + b, 0);
    return {
      wave: this.wave,
      waveState: this.waveState,
      intermissionTimer: this.intermissionTimer,
      enemiesAlive: this.enemies.filter((e) => !e.dead).length,
      enemiesQueued: this.spawnQueue.length,
      score: this.score,
      kills: this.kills,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      weapon: this.weapon,
      arsenalCount: this.arsenal.length,
      equippedIndex: this.equipped,
      inventoryTotal,
      inventory: { ...this.inventory },
      autoFire: this.autoFire,
      showAi: this.showAi,
      time: this.time,
      boss: boss ? { name: boss.def.name, hp: boss.hp, maxHp: boss.maxHp } : null,
      gameOver: this.gameOver,
      fps: this.fps,
      bestWave: this.bestWave,
      forgedCount: this.forgedCount,
      discovered: this.discoveredRecipes.size,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      combo: this.combo,
      comboTimer: this.comboTimer,
      comboMult: this.comboMult,
      dashCooldown: Math.max(0, this.player.dashCooldown),
      dashCooldownMax: this.dashCooldownMax,
      inputMode: this.inputMode,
      autoAim: this.autoAim,
      upgrades: { ...this.upgradeCounts },
      effectiveDps: this.effectiveDps,
      pendingLevelUps: this.pendingLevelUps,
      canForgeHint: inventoryTotal >= 3 && this.forgedCount === 0,
    };
  }
}

export { VIEW_BLOCKS };
