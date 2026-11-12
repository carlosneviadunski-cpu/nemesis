// ─────────────────────────────────────────────────────────────
// Tipos centrais do jogo ARENA AI (Diep Solo)
// ─────────────────────────────────────────────────────────────

export interface Vec {
  x: number;
  y: number;
}

export type ShapeKind =
  | "circle"
  | "triangle"
  | "square"
  | "pentagon"
  | "hexagon"
  | "heptagon"
  | "octagon"
  | "dodecagon"
  | "diamond"
  | "star5"
  | "star6"
  | "hexagram"
  | "cross"
  | "trapezoid"
  | "bar"
  | "semicircle"
  | "ring";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Archetype =
  | "machinegun"
  | "sniper"
  | "shotgun"
  | "rocket"
  | "laser"
  | "multicannon"
  | "twin"
  | "burst"
  | "flak"
  | "cannon";

export type EffectKind =
  | "burn"
  | "slow"
  | "homing"
  | "ricochet"
  | "explosive"
  | "chain"
  | "lifesteal"
  | "fragment"
  | "knockback";

export type WeaponStatKey =
  | "damage"
  | "rpm"
  | "bulletSpeed"
  | "spread"
  | "bulletSize"
  | "pierce"
  | "range"
  | "count";

export type WeaponStats = Record<WeaponStatKey, number>;

export interface WeaponEffect {
  kind: EffectKind;
  power: number; // ~0.5 .. 1.5
}

export type BarrelStyle =
  | "rect"
  | "trap"
  | "sniper"
  | "shotgun"
  | "rocket"
  | "laser"
  | "burst"
  | "cannon"
  | "spike"
  | "pod"
  | "dish";

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  rot: number;
  sides: number;
}

export interface BarrelSpec {
  angle: number; // rad, relativo à mira
  offset: number; // deslocamento lateral (blocos)
  length: number; // blocos a partir do centro do tanque
  width: number; // blocos
  tipWidth?: number;
  style: BarrelStyle;
  group: number; // grupo de disparo (para canos alternados)
}

export interface Weapon {
  id: string;
  name: string;
  model: string;
  archetype: Archetype;
  tier: number; // 1..5
  color: string;
  stats: WeaponStats;
  effects: WeaponEffect[];
  recipe: string[];
  isBeam: boolean;
  burst: number; // tiros por rajada (1 = sem rajada)
  barrels: BarrelSpec[];
  dps: number;
  recoil: number;
}

export interface MaterialDef {
  id: string;
  name: string;
  rarity: Rarity;
  color: string;
  shape: ShapeKind;
  desc: string;
  epithet: { m: string; f: string };
  affinity: Partial<Record<WeaponStatKey, number>>;
  bias: Partial<Record<Archetype, number>>;
  effect?: EffectKind;
}

export interface DropEntry {
  material: string;
  chance: number;
  min: number;
  max: number;
}

export type FirePattern = "single" | "spread" | "radial" | "cross" | "none";

export interface EnemyDef {
  id: string;
  name: string;
  title: string;
  shape: ShapeKind;
  color: string;
  radius: number;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  fireRate: number;
  bulletSpeed: number;
  bulletSize: number;
  bulletCount: number;
  bulletSpread: number; // graus
  pattern: FirePattern;
  homing?: boolean;
  contactDamage: number;
  preferredRange: number;
  dodgeSkill: number;
  retreatThreshold: number;
  accuracy: number;
  orbit?: boolean;
  healer?: boolean;
  rotateSpeed: number;
  cost: number;
  weight: number;
  minWave: number;
  score: number;
  boss?: boolean;
  drops: DropEntry[];
  behavior: string;
}

export type AIState = "attack" | "retreat" | "dodge";

export interface Enemy {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  aim: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  state: AIState;
  stateTimer: number;
  prevState: AIState;
  savedTimer: number;
  dodgeX: number;
  dodgeY: number;
  dodgeCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  retreatCount: number;
  recentDamage: number;
  fireCooldown: number;
  contactCooldown: number;
  chargeTimer: number;
  charging: number;
  hitFlash: number;
  burn: { dps: number; time: number } | null;
  slow: number; // tempo restante
  slowPower: number;
  dmgAccum: number;
  dmgTextTimer: number;
  dead: boolean;
  moveX: number;
  moveY: number;
  agility: number;
  spawnTime: number;
  scaleIn: number;
  elite: boolean;
  enraged: boolean;
  los: boolean;
}

export interface Bullet {
  id: number;
  owner: "player" | "enemy";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  life: number;
  maxLife: number;
  color: string;
  effects: WeaponEffect[];
  hit: Set<number>;
  homing: boolean;
  bounces: number;
  rocket: boolean;
  isFragment: boolean;
  trailTimer: number;
  spin: number;
  exploded: boolean;
  crit: boolean;
}

export interface Ring {
  x: number;
  y: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Drop {
  id: number;
  material: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape: "circle" | "square" | "shard";
  rot: number;
  rotV: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Lightning {
  points: Vec[];
  life: number;
  maxLife: number;
  color: string;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  bodyDamage: number;
  aim: number;
  fireCooldown: number;
  burstLeft: number;
  burstTimer: number;
  twinToggle: number;
  barrelRecoil: number[];
  lastDamageTime: number;
  hitFlash: number;
  regen: number;
  invuln: number;
  dashCooldown: number;
  dashTime: number;
  thrustTimer: number;
}

export interface PlayerMods {
  maxHp: number;
  maxHpPct: number;
  regen: number;
  speed: number;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  pierce: number;
  crit: number;
  magnet: number;
  luck: number;
  bodyDamage: number;
  dashCd: number;
  lifesteal: number;
}

export interface Ghost {
  x: number;
  y: number;
  aim: number;
  life: number;
  maxLife: number;
}

export type InputMode = "pc" | "touch";

export interface HudSnapshot {
  wave: number;
  waveState: "intermission" | "active";
  intermissionTimer: number;
  enemiesAlive: number;
  enemiesQueued: number;
  score: number;
  kills: number;
  hp: number;
  maxHp: number;
  weapon: Weapon;
  arsenalCount: number;
  equippedIndex: number;
  inventoryTotal: number;
  inventory: Record<string, number>;
  autoFire: boolean;
  showAi: boolean;
  time: number;
  boss: { name: string; hp: number; maxHp: number } | null;
  gameOver: boolean;
  fps: number;
  bestWave: number;
  forgedCount: number;
  discovered: number;
  level: number;
  xp: number;
  xpToNext: number;
  combo: number;
  comboTimer: number;
  comboMult: number;
  dashCooldown: number;
  dashCooldownMax: number;
  inputMode: InputMode;
  autoAim: boolean;
  upgrades: Record<string, number>;
  effectiveDps: number;
  pendingLevelUps: number;
  canForgeHint: boolean;
}

export interface GameEvent {
  type: "gameover" | "wavecleared" | "forge" | "togglePanel" | "levelup";
  panel?: "bestiary" | "forge" | "pause";
}
