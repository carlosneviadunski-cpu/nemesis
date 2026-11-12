// ARENA AI — versão standalone (HTML/Canvas/JS puro)
// ==================================================
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
function hashString(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function weightedPick(items, weightOf, rng = Math.random) { let total = 0; for (const it of items) total += weightOf(it); let r = rng() * total; for (const it of items) { r -= weightOf(it); if (r <= 0) return it; } return items[items.length - 1]; }
function hexToRgb(hex) { const h = hex.replace('#', ''); const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h; const n = parseInt(full, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); return `#${c(r)}${c(g)}${c(b)}`; }
function shade(hex, amount) { const [r, g, b] = hexToRgb(hex); if (amount < 0) { const f = 1 + amount; return rgbToHex(r * f, g * f, b * f); } return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount); }
function mix(c1, c2, t) { const a = hexToRgb(c1), b = hexToRgb(c2); return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)); }
function rgba(hex, alpha) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${alpha})`; }
function shapePoints(shape, r) {
  const regular = (n, start = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = start + (i / n) * TAU; p.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); } return p; };
  const star = (n, inner) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU; const rr = i % 2 === 0 ? r : inner; p.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr }); } return p; };
  switch (shape) {
    case 'triangle': return regular(3);
    case 'square': return regular(4, Math.PI / 4);
    case 'pentagon': return regular(5);
    case 'hexagon': return regular(6);
    case 'heptagon': return regular(7);
    case 'octagon': return regular(8, Math.PI / 8);
    case 'dodecagon': return regular(12);
    case 'diamond': return [{ x: r, y: 0 }, { x: 0, y: r * 0.62 }, { x: -r, y: 0 }, { x: 0, y: -r * 0.62 }];
    case 'star5': return star(5, r * 0.5);
    case 'star6': return star(6, r * 0.55);
    case 'hexagram': return star(6, r * 0.577);
    case 'cross': { const w = r * 0.36; return [{ x: r, y: -w }, { x: r, y: w }, { x: w, y: w }, { x: w, y: r }, { x: -w, y: r }, { x: -w, y: w }, { x: -r, y: w }, { x: -r, y: -w }, { x: -w, y: -w }, { x: -w, y: -r }, { x: w, y: -r }, { x: w, y: -w }]; }
    case 'trapezoid': return [{ x: -r * 0.85, y: -r * 0.85 }, { x: r * 0.85, y: -r * 0.45 }, { x: r * 0.85, y: r * 0.45 }, { x: -r * 0.85, y: r * 0.85 }];
    case 'bar': return [{ x: -r * 1.05, y: -r * 0.38 }, { x: r * 1.05, y: -r * 0.38 }, { x: r * 1.05, y: r * 0.38 }, { x: -r * 1.05, y: r * 0.38 }];
    default: return regular(24);
  }
}

// ==================================================
// Dados (JSON-like)
// ==================================================
const RARITY_META = {
  common: { label: 'Comum', color: '#9ca3af', power: 1.0, order: 0 },
  uncommon: { label: 'Incomum', color: '#4ade80', power: 1.2, order: 1 },
  rare: { label: 'Raro', color: '#60a5fa', power: 1.45, order: 2 },
  epic: { label: 'Épico', color: '#c084fc', power: 1.75, order: 3 },
  legendary: { label: 'Lendário', color: '#fbbf24', power: 2.2, order: 4 },
};
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const STAT_META = {
  damage: { label: 'Dano', short: 'DMG', higherIsBetter: true },
  rpm: { label: 'Cadência', short: 'RPM', higherIsBetter: true },
  bulletSpeed: { label: 'Vel. Projétil', short: 'VEL', higherIsBetter: true },
  spread: { label: 'Dispersão', short: 'DISP', higherIsBetter: false },
  bulletSize: { label: 'Tamanho', short: 'TAM', higherIsBetter: true },
  pierce: { label: 'Perfuração', short: 'PERF', higherIsBetter: true },
  range: { label: 'Alcance', short: 'ALC', higherIsBetter: true },
  count: { label: 'Projéteis', short: 'PROJ', higherIsBetter: true },
};

const EFFECT_META = {
  burn: { label: 'Incendiário', color: '#fb923c', epithet: { m: 'Ardente', f: 'Ardente' } },
  slow: { label: 'Criogênico', color: '#67e8f9', epithet: { m: 'Gélido', f: 'Gélida' } },
  homing: { label: 'Teleguiado', color: '#4ade80', epithet: { m: 'Rastreador', f: 'Rastreadora' } },
  ricochet: { label: 'Ricochete', color: '#e2e8f0', epithet: { m: 'Saltitante', f: 'Saltitante' } },
  explosive: { label: 'Explosivo', color: '#f87171', epithet: { m: 'Explosivo', f: 'Explosiva' } },
  chain: { label: 'Elétrico', color: '#38bdf8', epithet: { m: 'Tempestuoso', f: 'Tempestuosa' } },
  lifesteal: { label: 'Vampírico', color: '#a855f7', epithet: { m: 'Vampírico', f: 'Vampírica' } },
  fragment: { label: 'Fragmentador', color: '#f0abfc', epithet: { m: 'Fractal', f: 'Fractal' } },
  knockback: { label: 'Impacto', color: '#fde68a', epithet: { m: 'Impactante', f: 'Impactante' } },
};

const MATERIALS = {
  iron: { id: 'iron', name: 'Sucata de Ferro', rarity: 'common', color: '#9aa3ad', shape: 'square', desc: 'Metal bruto. Projéteis mais robustos.', epithet: { m: 'de Ferro', f: 'de Ferro' }, affinity: { damage: 0.12, bulletSize: 0.15, bulletSpeed: -0.05 }, bias: { cannon: 2, twin: 1 } },
  gunpowder: { id: 'gunpowder', name: 'Pólvora Negra', rarity: 'common', color: '#d97706', shape: 'triangle', desc: 'Aumenta a cadência de tiro.', epithet: { m: 'de Pólvora', f: 'de Pólvora' }, affinity: { rpm: 0.2, spread: 0.15, damage: -0.04 }, bias: { machinegun: 2.2, burst: 1 } },
  lens: { id: 'lens', name: 'Lente de Vidro', rarity: 'common', color: '#a5f3fc', shape: 'circle', desc: 'Foco óptico. Mais precisão e velocidade.', epithet: { m: 'Óptico', f: 'Óptica' }, affinity: { bulletSpeed: 0.18, spread: -0.25, range: 0.1 }, bias: { sniper: 2.2, laser: 0.8 } },
  lead: { id: 'lead', name: 'Cartucho de Chumbo', rarity: 'common', color: '#6b7280', shape: 'hexagon', desc: 'Munição fracionada. Mais projéteis por disparo.', epithet: { m: 'de Chumbo', f: 'de Chumbo' }, affinity: { count: 0.3, spread: 0.3, range: -0.1 }, bias: { shotgun: 2.4, flak: 0.8 } },
  spring: { id: 'spring', name: 'Mola de Aço', rarity: 'uncommon', color: '#7dd3fc', shape: 'diamond', desc: 'Mecanismo de retorno rápido.', epithet: { m: 'Retrátil', f: 'Retrátil' }, affinity: { rpm: 0.15, bulletSpeed: 0.12 }, bias: { twin: 2.2, burst: 1.6 } },
  carbon: { id: 'carbon', name: 'Fibra de Carbono', rarity: 'uncommon', color: '#475569', shape: 'bar', desc: 'Cano leve e longo. Alcance e estabilidade.', epithet: { m: 'de Carbono', f: 'de Carbono' }, affinity: { range: 0.25, spread: -0.2, bulletSpeed: 0.08 }, bias: { sniper: 1.6, laser: 1.4 } },
  fuel: { id: 'fuel', name: 'Célula de Combustível', rarity: 'uncommon', color: '#f97316', shape: 'pentagon', desc: 'Propelente volátil. Projéteis maiores e incendiários.', epithet: { m: 'Ígneo', f: 'Ígnea' }, affinity: { damage: 0.15, bulletSize: 0.25, rpm: -0.1 }, bias: { rocket: 2.4, cannon: 0.6 }, effect: 'burn' },
  gear: { id: 'gear', name: 'Engrenagem de Bronze', rarity: 'uncommon', color: '#ca8a04', shape: 'octagon', desc: 'Mecanismo de múltiplos canos sincronizados.', epithet: { m: 'Mecânico', f: 'Mecânica' }, affinity: { rpm: 0.1, pierce: 0.3, count: 0.1 }, bias: { multicannon: 2.6, twin: 0.8 } },
  plasma: { id: 'plasma', name: 'Cristal de Plasma', rarity: 'rare', color: '#e879f9', shape: 'hexagram', desc: 'Energia pura condensada. Dano e velocidade; queima.', epithet: { m: 'Plasmático', f: 'Plasmática' }, affinity: { damage: 0.22, bulletSpeed: 0.2, bulletSize: -0.1 }, bias: { laser: 2.8, sniper: 0.6 }, effect: 'burn' },
  cryo: { id: 'cryo', name: 'Núcleo Criogênico', rarity: 'rare', color: '#67e8f9', shape: 'star6', desc: 'Frio absoluto. Projéteis grandes que congelam alvos.', epithet: { m: 'Criogênico', f: 'Criogênica' }, affinity: { bulletSize: 0.3, damage: 0.1, bulletSpeed: -0.1 }, bias: { cannon: 1.8, flak: 1.4 }, effect: 'slow' },
  chip: { id: 'chip', name: 'Chip de Guiagem', rarity: 'rare', color: '#4ade80', shape: 'cross', desc: 'Circuito de rastreamento. Projéteis teleguiados.', epithet: { m: 'Guiado', f: 'Guiada' }, affinity: { range: 0.3, spread: -0.15 }, bias: { rocket: 1.8, multicannon: 1.4 }, effect: 'homing' },
  titanium: { id: 'titanium', name: 'Liga de Titânio', rarity: 'rare', color: '#cbd5e1', shape: 'heptagon', desc: 'Liga ultrarresistente. Perfuração e dano.', epithet: { m: 'de Titânio', f: 'de Titânio' }, affinity: { pierce: 0.6, damage: 0.18 }, bias: { sniper: 1.8, cannon: 1.2 } },
  mercury: { id: 'mercury', name: 'Esfera de Mercúrio', rarity: 'epic', color: '#e2e8f0', shape: 'circle', desc: 'Metal líquido instável. Projéteis ricocheteiam.', epithet: { m: 'Mercurial', f: 'Mercurial' }, affinity: { bulletSpeed: 0.2, range: 0.3, rpm: 0.1 }, bias: { flak: 1.8, twin: 1.6 }, effect: 'ricochet' },
  catalyst: { id: 'catalyst', name: 'Catalisador Volátil', rarity: 'epic', color: '#ef4444', shape: 'triangle', desc: 'Reage violentamente. Explosões em área.', epithet: { m: 'Volátil', f: 'Volátil' }, affinity: { damage: 0.3, bulletSize: 0.2, rpm: -0.1 }, bias: { rocket: 2.6, flak: 1.2 }, effect: 'explosive' },
  tesla: { id: 'tesla', name: 'Bobina de Tesla', rarity: 'epic', color: '#38bdf8', shape: 'star5', desc: 'Descarga elétrica que salta entre inimigos.', epithet: { m: 'Elétrico', f: 'Elétrica' }, affinity: { rpm: 0.25, bulletSpeed: 0.15 }, bias: { laser: 2.2, machinegun: 1.6 }, effect: 'chain' },
  prism: { id: 'prism', name: 'Prisma Fractal', rarity: 'epic', color: '#f0abfc', shape: 'diamond', desc: 'Divide os projéteis em estilhaços.', epithet: { m: 'Prismático', f: 'Prismática' }, affinity: { count: 0.35, pierce: 0.2 }, bias: { shotgun: 2.0, flak: 2.0 }, effect: 'fragment' },
  void: { id: 'void', name: 'Essência do Vazio', rarity: 'legendary', color: '#7c3aed', shape: 'ring', desc: 'Matéria de outro plano. Drena vida; perfura tudo.', epithet: { m: 'do Vazio', f: 'do Vazio' }, affinity: { damage: 0.3, pierce: 0.8, range: 0.2 }, bias: { laser: 2.4, sniper: 1.8 }, effect: 'lifesteal' },
  starheart: { id: 'starheart', name: 'Coração Estelar', rarity: 'legendary', color: '#fbbf24', shape: 'star5', desc: 'Núcleo de uma estrela. Potência colossal.', epithet: { m: 'Estelar', f: 'Estelar' }, affinity: { damage: 0.4, bulletSize: 0.25, rpm: 0.15, bulletSpeed: 0.1 }, bias: { cannon: 2.0, rocket: 1.6, multicannon: 1.2 }, effect: 'knockback' },
};
const MATERIAL_LIST = Object.values(MATERIALS).sort((a, b) => RARITY_META[a.rarity].order - RARITY_META[b.rarity].order || a.name.localeCompare(b.name));
function materialsByRarity(r) { return MATERIAL_LIST.filter(m => m.rarity === r); }

// ==================================================
// Armas e forja procedural
// ==================================================
const ARCHETYPE_META = {
  machinegun: { name: 'Metralhadora', gender: 'f', desc: 'Cadência altíssima, dispersão alta.', mult: { damage: 0.5, rpm: 2.8, spread: 2.6, range: 0.85 }, recoil: 0.3, burst: 1, isBeam: false },
  sniper: { name: 'Fuzil Sniper', gender: 'm', desc: 'Projéteis velozes e perfurantes.', mult: { damage: 3.4, rpm: 0.3, spread: 0.15, bulletSpeed: 2.1, range: 1.9 }, add: { pierce: 2 }, recoil: 1.2, burst: 1, isBeam: false },
  shotgun: { name: 'Espingarda', gender: 'f', desc: 'Vários projéteis em leque.', mult: { damage: 0.75, rpm: 0.55, spread: 4.5, range: 0.5, bulletSpeed: 1.25 }, add: { count: 5 }, recoil: 1.6, burst: 1, isBeam: false },
  rocket: { name: 'Lança-Foguetes', gender: 'm', desc: 'Foguetes lentos que explodem.', mult: { damage: 3.0, rpm: 0.3, bulletSpeed: 0.6, bulletSize: 2.0, range: 1.2, spread: 0.6 }, recoil: 1.4, burst: 1, isBeam: false, builtIn: 'explosive' },
  laser: { name: 'Laser', gender: 'm', desc: 'Feixe instantâneo contínuo.', mult: { damage: 0.28, rpm: 4.0, spread: 0.1, bulletSize: 0.5, range: 1.3 }, add: { pierce: 3 }, recoil: 0.05, burst: 1, isBeam: true },
  multicannon: { name: 'Canhão Múltiplo', gender: 'm', desc: 'Canos em disparam juntos.', mult: { damage: 0.85, rpm: 0.8, spread: 0.8 }, recoil: 0.9, burst: 1, isBeam: false },
  twin: { name: 'Canhão Gêmeo', gender: 'm', desc: 'Dois canos alternados.', mult: { damage: 0.85, rpm: 1.7, spread: 1.2 }, recoil: 0.4, burst: 1, isBeam: false },
  burst: { name: 'Fuzil de Rajada', gender: 'm', desc: 'Rajadas de 3 tiros.', mult: { damage: 0.95, rpm: 1.1, spread: 0.7, bulletSpeed: 1.2 }, recoil: 0.5, burst: 3, isBeam: false },
  flak: { name: 'Canhão Flak', gender: 'm', desc: 'Projéteis fragmentados.', mult: { damage: 0.8, rpm: 0.7, bulletSize: 1.5, bulletSpeed: 0.9 }, recoil: 0.8, burst: 1, isBeam: false, builtIn: 'fragment' },
  cannon: { name: 'Canhão Pesado', gender: 'm', desc: 'Projéteis grandes e lentos.', mult: { damage: 1.9, rpm: 0.6, bulletSize: 1.8, bulletSpeed: 0.85, spread: 0.8 }, recoil: 1.0, burst: 1, isBeam: false },
};
const ARCHETYPE_LIST = Object.keys(ARCHETYPE_META);
const EFFECT_LIST = Object.keys(EFFECT_META);
const BASE_STATS = { damage: 12, rpm: 150, bulletSpeed: 11, spread: 5, bulletSize: 0.22, pierce: 1, range: 12, count: 1 };
const STAT_LIMITS = {
  damage: [2, 400], rpm: [25, 900], bulletSpeed: [4, 34], spread: [0, 45],
  bulletSize: [0.08, 0.6], pierce: [1, 12], range: [4, 24], count: [1, 12],
};

function buildBarrels(arch, s) {
  const L = clamp(0.6 + s.bulletSpeed / 28, 0.62, 1.55);
  const W = clamp(s.bulletSize * 2.1, 0.2, 0.72);
  switch (arch) {
    case 'machinegun': return [{ angle: 0, offset: 0, length: L * 0.92, width: W * 0.85, tipWidth: W * 1.55, style: 'trap', group: 0 }];
    case 'sniper': return [{ angle: 0, offset: 0, length: L * 1.22, width: W * 0.72, style: 'sniper', group: 0 }];
    case 'shotgun': return [{ angle: 0, offset: 0, length: L * 0.78, width: W * 1.25, tipWidth: W * 1.7, style: 'shotgun', group: 0 }];
    case 'rocket': return [{ angle: 0, offset: 0, length: L * 0.98, width: W * 1.0, style: 'rocket', group: 0 }];
    case 'laser': return [{ angle: 0, offset: 0, length: L * 1.05, width: clamp(W * 1.4, 0.3, 0.6), style: 'laser', group: 0 }];
    case 'multicannon': { const n = s.count >= 5 ? 5 : 3; const fan = n === 5 ? 0.32 : 0.42; const out = []; for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; const center = Math.abs(k) < 0.01; out.push({ angle: k * fan, offset: 0, length: L * (center ? 1.0 : 0.82), width: W * 0.8, style: 'rect', group: 0 }); } return out; }
    case 'twin': return [{ angle: 0, offset: -0.27, length: L * 0.95, width: W * 0.8, style: 'rect', group: 0 }, { angle: 0, offset: 0.27, length: L * 0.95, width: W * 0.8, style: 'rect', group: 1 }];
    case 'burst': return [{ angle: 0, offset: 0, length: L * 1.05, width: W * 0.82, style: 'burst', group: 0 }];
    case 'flak': return [{ angle: -0.38, offset: 0, length: L * 0.66, width: W * 0.55, style: 'rect', group: 1 }, { angle: 0.38, offset: 0, length: L * 0.66, width: W * 0.55, style: 'rect', group: 1 }, { angle: 0, offset: 0, length: L * 0.92, width: W * 1.15, tipWidth: W * 1.35, style: 'trap', group: 0 }];
    default: return [{ angle: 0, offset: 0, length: L * 0.96, width: W * 1.25, style: 'cannon', group: 0 }];
  }
}
function computeDps(stats, arch, effects) {
  const shots = stats.rpm / 60;
  let perShot = stats.damage * (arch === 'shotgun' || arch === 'multicannon' ? stats.count : 1);
  let dps = perShot * shots;
  dps *= 1 + Math.min(stats.pierce - 1, 4) * 0.08;
  for (const e of effects) { if (e.kind === 'burn') dps *= 1 + 0.15 * e.power; if (e.kind === 'explosive') dps *= 1 + 0.25 * e.power; if (e.kind === 'fragment') dps *= 1 + 0.2 * e.power; if (e.kind === 'chain') dps *= 1 + 0.2 * e.power; }
  return dps;
}
function finalize(stats, arch) {
  for (const k of Object.keys(stats)) { const [lo, hi] = STAT_LIMITS[k]; stats[k] = clamp(stats[k], lo, hi); }
  stats.pierce = Math.round(stats.pierce); stats.count = Math.round(stats.count);
  if (arch === 'multicannon') stats.count = stats.count >= 5 ? 5 : 3;
  if (arch === 'shotgun') stats.count = clamp(stats.count, 4, 10);
  if (arch === 'laser') stats.count = 1;
  if (arch === 'sniper' || arch === 'rocket') stats.count = Math.min(stats.count, 2);
  stats.damage = Math.round(stats.damage * 10) / 10; stats.rpm = Math.round(stats.rpm); stats.bulletSpeed = Math.round(stats.bulletSpeed * 10) / 10;
  stats.spread = Math.round(stats.spread * 10) / 10; stats.bulletSize = Math.round(stats.bulletSize * 100) / 100; stats.range = Math.round(stats.range * 10) / 10;
}
function createDefaultWeapon() {
  const stats = { ...BASE_STATS, damage: 13, rpm: 140, bulletSize: 0.24 };
  const arch = 'cannon';
  return { id: 'default', name: 'Canhão Básico', model: 'MK-0000', archetype: arch, tier: 1, color: '#60a5fa', stats, effects: [], recipe: [], isBeam: false, burst: 1, barrels: [{ angle: 0, offset: 0, length: 0.95, width: 0.42, style: 'rect', group: 0 }], dps: computeDps(stats, arch, []), recoil: 0.5 };
}
function forgeWeapon(materialIds) {
  const recipe = [...materialIds].sort(); const mats = recipe.map(id => MATERIALS[id]).filter(Boolean); const n = mats.length;
  const seed = hashString(recipe.join('|')); const rng = mulberry32(seed);
  let power = 0; const archScore = {}; const effScore = {}; const stats = { ...BASE_STATS };
  for (const m of mats) { const p = RARITY_META[m.rarity].power; power += p; for (const [k, v] of Object.entries(m.affinity)) stats[k] *= 1 + v * p; for (const [a, b] of Object.entries(m.bias)) archScore[a] = (archScore[a] ?? 0) + (b ?? 0) * p; if (m.effect) effScore[m.effect] = (effScore[m.effect] ?? 0) + p; }
  let bestArch = 'cannon', bestScore = -Infinity;
  for (const a of ARCHETYPE_LIST) { const sc = (archScore[a] ?? 0) + rng() * 1.6; if (sc > bestScore) { bestScore = sc; bestArch = a; } }
  const tpl = ARCHETYPE_META[bestArch];
  for (const [k, v] of Object.entries(tpl.mult)) stats[k] *= v;
  if (tpl.add) for (const [k, v] of Object.entries(tpl.add)) stats[k] += v;
  const avg = power / n; const quality = avg * (1 + (n - 3) * 0.15); const tier = quality < 1.15 ? 1 : quality < 1.45 ? 2 : quality < 1.85 ? 3 : quality < 2.3 ? 4 : 5;
  stats.damage *= 0.85 + quality * 0.4; stats.range *= 1 + (quality - 1) * 0.08;
  for (const k of ['damage', 'rpm', 'bulletSpeed', 'range']) stats[k] *= 0.92 + rng() * 0.16;
  stats.pierce += Math.floor(rng() * (tier >= 4 ? 2 : 1));
  finalize(stats, bestArch);
  const effects = []; const sortedEff = EFFECT_LIST.filter(e => (effScore[e] ?? 0) >= 1.3).sort((a, b) => effScore[b] - effScore[a]);
  for (const e of sortedEff.slice(0, 2)) effects.push({ kind: e, power: clamp(effScore[e] / 1.45, 0.6, 1.6) });
  if (tpl.builtIn && !effects.some(e => e.kind === tpl.builtIn)) effects.push({ kind: tpl.builtIn, power: 0.8 });
  const dominant = [...mats].sort((a, b) => { const d = RARITY_META[b.rarity].order - RARITY_META[a.rarity].order; if (d !== 0) return d; return recipe.filter(id => id === b.id).length - recipe.filter(id => id === a.id).length; })[0];
  const secondary = mats.find(m => m.id !== dominant.id) ?? dominant;
  const color = mix(dominant.color, secondary.color, 0.3);
  const g = tpl.gender; const effEp = effects.find(e => e.kind !== tpl.builtIn);
  let name = `${tpl.name} ${dominant.epithet[g]}`;
  if (effEp) name += ` ${EFFECT_META[effEp.kind].epithet[g]}`;
  return {
    id: `${seed.toString(36)}-${recipe.join('.')}`, name, model: `MK-${seed.toString(16).toUpperCase().padStart(8, '0').slice(0, 4)}`,
    archetype: bestArch, tier, color, stats, effects, recipe, isBeam: tpl.isBeam, burst: tpl.burst,
    barrels: buildBarrels(bestArch, stats), dps: computeDps(stats, bestArch, effects), recoil: tpl.recoil,
  };
}

// ==================================================
// Inimigos (bestiário)
// ==================================================
const baseEnemy = { bulletCount: 1, bulletSpread: 0, pattern: 'single', accuracy: 0.5, rotateSpeed: 0 };
const ENEMY_DEFS = [
  { ...baseEnemy, id: 'scout', name: 'Triângulo Batedor', title: 'Rápido e frágil', shape: 'triangle', color: '#fb7185', radius: 0.45, hp: 30, speed: 4.6, damage: 6, range: 7, fireRate: 1.6, bulletSpeed: 9, bulletSize: 0.16, contactDamage: 8, preferredRange: 5, dodgeSkill: 0.45, retreatThreshold: 0.3, accuracy: 0.4, cost: 2, weight: 10, minWave: 1, score: 10, drops: [{ material: 'iron', chance: 0.5, min: 1, max: 2 }, { material: 'gunpowder', chance: 0.35, min: 1, max: 1 }], behavior: 'Avança em zigue-zague e dispara tiros curtos. Recua quando a vida cai.' },
  { ...baseEnemy, id: 'sentinel', name: 'Quadrado Sentinela', title: 'Linha de frente', shape: 'square', color: '#facc15', radius: 0.5, hp: 60, speed: 2.8, damage: 9, range: 8, fireRate: 1.0, bulletSpeed: 8, bulletSize: 0.2, contactDamage: 10, preferredRange: 6, dodgeSkill: 0.3, retreatThreshold: 0.25, cost: 3, weight: 9, minWave: 1, score: 15, drops: [{ material: 'iron', chance: 0.6, min: 1, max: 2 }, { material: 'lead', chance: 0.35, min: 1, max: 1 }, { material: 'spring', chance: 0.1, min: 1, max: 1 }], behavior: 'Mantém distância média e dispara com regularidade.' },
  { ...baseEnemy, id: 'lancer', name: 'Losango Lanceiro', title: 'Investida corpo a corpo', shape: 'diamond', color: '#f87171', radius: 0.48, hp: 45, speed: 6.2, damage: 0, range: 0, fireRate: 0, bulletSpeed: 0, bulletSize: 0, pattern: 'none', contactDamage: 18, preferredRange: 0, dodgeSkill: 0.6, retreatThreshold: 0.2, cost: 3, weight: 7, minWave: 2, score: 18, drops: [{ material: 'gunpowder', chance: 0.5, min: 1, max: 2 }, { material: 'spring', chance: 0.25, min: 1, max: 1 }, { material: 'lead', chance: 0.2, min: 1, max: 1 }], behavior: 'Não atira: investe em alta velocidade para colidir. Desvia de projéteis com facilidade.' },
  { ...baseEnemy, id: 'guardian', name: 'Pentágono Guardião', title: 'Tanque de vanguarda', shape: 'pentagon', color: '#818cf8', radius: 0.7, hp: 135, speed: 2.0, damage: 14, range: 9, fireRate: 0.8, bulletSpeed: 7, bulletSize: 0.28, contactDamage: 14, preferredRange: 7, dodgeSkill: 0.15, retreatThreshold: 0.2, cost: 6, weight: 6, minWave: 3, score: 35, drops: [{ material: 'iron', chance: 0.7, min: 1, max: 3 }, { material: 'carbon', chance: 0.2, min: 1, max: 1 }, { material: 'titanium', chance: 0.15, min: 1, max: 1 }], behavior: 'Avança lentamente absorvendo dano. Raramente desvia.' },
  { ...baseEnemy, id: 'artillery', name: 'Hexágono Artilheiro', title: 'Artilharia pesada', shape: 'hexagon', color: '#c084fc', radius: 0.65, hp: 110, speed: 1.8, damage: 28, range: 13, fireRate: 0.4, bulletSpeed: 6, bulletSize: 0.42, contactDamage: 10, preferredRange: 11, dodgeSkill: 0.2, retreatThreshold: 0.35, accuracy: 0.7, cost: 7, weight: 5, minWave: 4, score: 40, drops: [{ material: 'gunpowder', chance: 0.6, min: 1, max: 3 }, { material: 'fuel', chance: 0.3, min: 1, max: 1 }, { material: 'catalyst', chance: 0.05, min: 1, max: 1 }], behavior: 'Fica longe e dispara projéteis lentos e devastadores.' },
  { ...baseEnemy, id: 'cross', name: 'Cruz Fragmentadora', title: 'Fogo em quatro direções', shape: 'cross', color: '#4ade80', radius: 0.6, hp: 90, speed: 2.5, damage: 8, range: 7, fireRate: 1.1, bulletSpeed: 8, bulletSize: 0.18, bulletCount: 4, pattern: 'cross', rotateSpeed: 1.2, contactDamage: 10, preferredRange: 4, dodgeSkill: 0.2, retreatThreshold: 0.3, cost: 6, weight: 5, minWave: 5, score: 40, drops: [{ material: 'gear', chance: 0.4, min: 1, max: 1 }, { material: 'lead', chance: 0.4, min: 1, max: 2 }, { material: 'prism', chance: 0.04, min: 1, max: 1 }], behavior: 'Gira e dispara em quatro direções ao mesmo tempo.' },
  { ...baseEnemy, id: 'medic', name: 'Trapézio Reparador', title: 'Suporte covarde', shape: 'trapezoid', color: '#2dd4bf', radius: 0.55, hp: 80, speed: 3.0, damage: 5, range: 10, fireRate: 1.2, bulletSpeed: 10, bulletSize: 0.15, contactDamage: 6, preferredRange: 10, dodgeSkill: 0.5, retreatThreshold: 0.5, healer: true, cost: 6, weight: 4, minWave: 5, score: 45, drops: [{ material: 'spring', chance: 0.4, min: 1, max: 1 }, { material: 'lens', chance: 0.4, min: 1, max: 2 }, { material: 'cryo', chance: 0.25, min: 1, max: 1 }], behavior: 'Cura aliados próximos com uma aura. Prefere ficar longe.' },
  { ...baseEnemy, id: 'reaper', name: 'Estrela Ceifadora', title: 'Leque de projéteis', shape: 'star5', color: '#f472b6', radius: 0.6, hp: 120, speed: 3.4, damage: 7, range: 8, fireRate: 1.8, bulletSpeed: 9, bulletSize: 0.17, bulletCount: 3, bulletSpread: 26, pattern: 'spread', rotateSpeed: 2.2, contactDamage: 12, preferredRange: 5, dodgeSkill: 0.4, retreatThreshold: 0.3, cost: 8, weight: 5, minWave: 6, score: 55, drops: [{ material: 'gunpowder', chance: 0.5, min: 2, max: 3 }, { material: 'plasma', chance: 0.3, min: 1, max: 1 }, { material: 'prism', chance: 0.06, min: 1, max: 1 }], behavior: 'Dispara três projéteis em leque com alta cadência.' },
  { ...baseEnemy, id: 'hunter', name: 'Semicírculo Caçador', title: 'Orbita a presa', shape: 'semicircle', color: '#fb923c', radius: 0.55, hp: 100, speed: 4.5, damage: 10, range: 8, fireRate: 1.2, bulletSpeed: 11, bulletSize: 0.18, contactDamage: 10, preferredRange: 6, dodgeSkill: 0.65, retreatThreshold: 0.3, orbit: true, accuracy: 0.7, cost: 7, weight: 5, minWave: 6, score: 50, drops: [{ material: 'lens', chance: 0.5, min: 1, max: 2 }, { material: 'carbon', chance: 0.3, min: 1, max: 1 }, { material: 'chip', chance: 0.2, min: 1, max: 1 }], behavior: 'Circula ao redor do jogador, dificultando a mira.' },
  { ...baseEnemy, id: 'assassin', name: 'Triângulo Sombrio', title: 'Letal e evasivo', shape: 'triangle', color: '#64748b', radius: 0.45, hp: 70, speed: 6.0, damage: 16, range: 6, fireRate: 0.9, bulletSpeed: 14, bulletSize: 0.16, contactDamage: 14, preferredRange: 4, dodgeSkill: 0.9, retreatThreshold: 0.4, accuracy: 0.9, cost: 8, weight: 4, minWave: 7, score: 60, drops: [{ material: 'carbon', chance: 0.5, min: 1, max: 1 }, { material: 'titanium', chance: 0.25, min: 1, max: 1 }, { material: 'void', chance: 0.03, min: 1, max: 1 }], behavior: 'Mestre da esquiva. Lê projéteis e desvia lateralmente.' },
  { ...baseEnemy, id: 'obelisk', name: 'Obelisco Fractal', title: 'Atirador de elite', shape: 'bar', color: '#e2e8f0', radius: 0.6, hp: 90, speed: 1.6, damage: 34, range: 16, fireRate: 0.35, bulletSpeed: 18, bulletSize: 0.16, contactDamage: 8, preferredRange: 13, dodgeSkill: 0.3, retreatThreshold: 0.4, accuracy: 1.0, cost: 8, weight: 4, minWave: 8, score: 60, drops: [{ material: 'lens', chance: 0.6, min: 1, max: 2 }, { material: 'titanium', chance: 0.3, min: 1, max: 1 }, { material: 'carbon', chance: 0.3, min: 1, max: 1 }], behavior: 'Sniper de longo alcance com mira preditiva perfeita.' },
  { ...baseEnemy, id: 'fortress', name: 'Octógono Fortaleza', title: 'Muralha ambulante', shape: 'octagon', color: '#94a3b8', radius: 0.95, hp: 420, speed: 1.4, damage: 12, range: 8, fireRate: 1.5, bulletSpeed: 7, bulletSize: 0.24, bulletCount: 2, bulletSpread: 14, pattern: 'spread', contactDamage: 20, preferredRange: 6, dodgeSkill: 0.05, retreatThreshold: 0.1, cost: 14, weight: 3, minWave: 8, score: 120, drops: [{ material: 'iron', chance: 1, min: 2, max: 4 }, { material: 'titanium', chance: 0.5, min: 1, max: 1 }, { material: 'gear', chance: 0.4, min: 1, max: 1 }, { material: 'mercury', chance: 0.08, min: 1, max: 1 }], behavior: 'Avança implacável disparando pares de projéteis.' },
  { ...baseEnemy, id: 'prism', name: 'Anel Prismático', title: 'Metralhadora de luz', shape: 'ring', color: '#22d3ee', radius: 0.6, hp: 130, speed: 3.0, damage: 6, range: 9, fireRate: 4.2, bulletSpeed: 15, bulletSize: 0.11, contactDamage: 10, preferredRange: 7, dodgeSkill: 0.55, retreatThreshold: 0.35, accuracy: 0.6, cost: 10, weight: 4, minWave: 9, score: 80, drops: [{ material: 'plasma', chance: 0.5, min: 1, max: 1 }, { material: 'lens', chance: 0.5, min: 1, max: 2 }, { material: 'tesla', chance: 0.08, min: 1, max: 1 }], behavior: 'Torrente de projéteis finos e velozes. Ágil, mantém-se a média distância.' },
  { ...baseEnemy, id: 'nebula', name: 'Estrela Nebulosa', title: 'Explosão radial', shape: 'star6', color: '#a78bfa', radius: 0.75, hp: 200, speed: 2.4, damage: 9, range: 9, fireRate: 1.4, bulletSpeed: 7, bulletSize: 0.2, bulletCount: 6, pattern: 'radial', rotateSpeed: 1.6, contactDamage: 14, preferredRange: 5, dodgeSkill: 0.25, retreatThreshold: 0.25, cost: 12, weight: 3, minWave: 10, score: 100, drops: [{ material: 'plasma', chance: 0.4, min: 1, max: 1 }, { material: 'prism', chance: 0.25, min: 1, max: 1 }, { material: 'catalyst', chance: 0.15, min: 1, max: 1 }], behavior: 'Libera anéis de projéteis em todas as direções enquanto gira.' },
  { ...baseEnemy, id: 'arcane', name: 'Hexagrama Arcano', title: 'Projéteis teleguiados', shape: 'hexagram', color: '#e879f9', radius: 0.65, hp: 150, speed: 2.2, damage: 14, range: 12, fireRate: 0.6, bulletSpeed: 6, bulletSize: 0.24, homing: true, contactDamage: 12, preferredRange: 9, dodgeSkill: 0.4, retreatThreshold: 0.4, rotateSpeed: 0.8, cost: 12, weight: 3, minWave: 12, score: 110, drops: [{ material: 'chip', chance: 0.5, min: 1, max: 1 }, { material: 'tesla', chance: 0.15, min: 1, max: 1 }, { material: 'void', chance: 0.06, min: 1, max: 1 }], behavior: 'Seus projéteis lentos perseguem você. Mantenha-se em movimento.' },
  { ...baseEnemy, id: 'colossus', name: 'Colosso Dodecágono', title: 'CHEFE', shape: 'dodecagon', color: '#f43f5e', radius: 1.6, hp: 600, speed: 1.6, damage: 16, range: 10, fireRate: 1.2, bulletSpeed: 7, bulletSize: 0.45, bulletCount: 3, bulletSpread: 34, pattern: 'spread', rotateSpeed: 0.4, contactDamage: 26, preferredRange: 6, dodgeSkill: 0.05, retreatThreshold: 0.12, accuracy: 0.6, cost: 60, weight: 0, minWave: 5, score: 600, boss: true, drops: [{ material: 'starheart', chance: 1, min: 1, max: 1 }, { material: 'titanium', chance: 1, min: 2, max: 3 }, { material: 'void', chance: 0.5, min: 1, max: 1 }, { material: 'catalyst', chance: 0.6, min: 1, max: 1 }, { material: 'mercury', chance: 0.6, min: 1, max: 1 }, { material: 'tesla', chance: 0.6, min: 1, max: 1 }], behavior: 'Gigante blindado com rajadas triplas. Entra em fúria breve quando quase derrotado.' },
];
const ENEMY_BY_ID = Object.fromEntries(ENEMY_DEFS.map(d => [d.id, d]));

// ==================================================
// Melhorias (níveis)
// ==================================================
const UPGRADES = [
  { id: 'vigor', name: 'Vigor', icon: '❤', color: '#4ade80', desc: '+20 de vida máxima (e cura 20).', apply: (m) => { m.maxHp += 20; } },
  { id: 'regen', name: 'Regeneração', icon: '✚', color: '#86efac', desc: '+1% de vida por segundo fora de combate.', max: 5, apply: (m) => { m.regen += 0.01; } },
  { id: 'speed', name: 'Propulsores', icon: '➤', color: '#38bdf8', desc: '+8% de velocidade de movimento.', max: 6, apply: (m) => { m.speed += 0.08; } },
  { id: 'damage', name: 'Munição Reforçada', icon: '⚔', color: '#f87171', desc: '+12% de dano em todas as armas.', apply: (m) => { m.damage += 0.12; } },
  { id: 'firerate', name: 'Mecanismo Rápido', icon: '⟳', color: '#fbbf24', desc: '+10% de cadência de tiro.', max: 6, apply: (m) => { m.fireRate += 0.1; } },
  { id: 'velocity', name: 'Canos Longos', icon: '⇒', color: '#a5f3fc', desc: '+12% de velocidade e alcance.', max: 5, apply: (m) => { m.bulletSpeed += 0.12; } },
  { id: 'pierce', name: 'Ponta Perfurante', icon: '◆', color: '#e2e8f0', desc: '+1 de perfuração.', rare: true, max: 3, apply: (m) => { m.pierce += 1; } },
  { id: 'crit', name: 'Olho Clínico', icon: '✦', color: '#fb923c', desc: '+8% de chance crítico (2× dano).', max: 6, apply: (m) => { m.crit += 0.08; } },
  { id: 'magnet', name: 'Ímã de Sucata', icon: '◎', color: '#c084fc', desc: '+1,5 blocos de coleta.', max: 4, apply: (m) => { m.magnet += 1.5; } },
  { id: 'luck', name: 'Sorte do Sucateiro', icon: '☘', color: '#34d399', desc: '+12% de chance de drops extras.', max: 5, apply: (m) => { m.luck += 0.12; } },
  { id: 'body', name: 'Blindagem', icon: '⬢', color: '#94a3b8', desc: '+10% vida máxima e +60% dano de colisão.', max: 5, apply: (m) => { m.bodyDamage += 0.6; m.maxHpPct += 0.1; } },
  { id: 'dash', name: 'Impulso Rápido', icon: '⤳', color: '#67e8f9', desc: '-18% de recarga do impulso.', max: 3, apply: (m) => { m.dashCd += 0.18; } },
  { id: 'lifesteal', name: 'Sifão Vital', icon: '☥', color: '#a855f7', desc: 'Recupera 2% do dano causado.', rare: true, max: 3, apply: (m) => { m.lifesteal += 0.02; } },
];
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
function createMods() { return { maxHp: 0, maxHpPct: 0, regen: 0, speed: 0, damage: 0, fireRate: 0, bulletSpeed: 0, pierce: 0, crit: 0, magnet: 0, luck: 0, bodyDamage: 0, dashCd: 0, lifesteal: 0 }; }
function rollUpgrades(counts, n = 3) {
  const pool = UPGRADES.filter(u => !u.max || (counts[u.id] ?? 0) < u.max);
  const out = [];
  while (out.length < n && pool.length) {
    const u = weightedPick(pool, x => (x.rare ? 0.45 : 1));
    pool.splice(pool.indexOf(u), 1);
    out.push(u);
  }
  return out;
}
function xpToNext(level) { return Math.round(45 * Math.pow(1.22, level - 1) + 25 * (level - 1)); }

// ==================================================
// Áudio sintetizado (Web Audio)
// ==================================================
const sfx = {
  enabled: true, haptics: true, ctx: null, master: null, last: {}, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ctx = null; }
  },
  vibrate(ms) { if (!this.haptics) return; try { navigator.vibrate?.(ms); } catch { } },
  tone(freq, dur, type, vol, slideTo, delay = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, filterFreq, slideTo, delay = 0) {
    const ctx = this.ctx; if (!ctx || !this.noiseBuf) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(filterFreq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0); src.stop(t0 + dur + 0.02);
  },
  play(name, pitch = 1) {
    if (!this.enabled || !this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = performance.now();
    const minGap = { shoot: 45, laser: 90, hit: 40, kill: 30, pickup: 60 };
    const gap = minGap[name] ?? 0;
    if (gap && now - (this.last[name] ?? 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'shoot': this.tone(420 * pitch, 0.08, 'square', 0.08, 160 * pitch); this.noise(0.05, 0.05, 2500, 800); break;
      case 'laser': this.tone(1200 * pitch, 0.07, 'sawtooth', 0.035, 900 * pitch); break;
      case 'hit': this.tone(220, 0.04, 'triangle', 0.06, 120); break;
      case 'kill': this.tone(520 * pitch, 0.18, 'triangle', 0.12, 90); this.noise(0.18, 0.12, 1200, 200); break;
      case 'explosion': this.noise(0.45, 0.3, 500, 60); this.tone(90, 0.4, 'sine', 0.2, 35); break;
      case 'pickup': this.tone(880, 0.07, 'sine', 0.08); this.tone(1320, 0.1, 'sine', 0.08, undefined, 0.06); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, undefined, i * 0.09)); break;
      case 'forge': this.noise(0.3, 0.15, 3000, 600); [392, 523, 784].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, undefined, 0.1 + i * 0.08)); break;
      case 'dash': this.noise(0.22, 0.18, 400, 3000); break;
      case 'hurt': this.tone(140, 0.2, 'sawtooth', 0.14, 60); this.noise(0.12, 0.1, 300, 100); break;
      case 'boss': this.tone(70, 1.2, 'sawtooth', 0.2, 55); this.tone(105, 1.2, 'square', 0.08, 82); break;
      case 'wave': this.tone(330, 0.2, 'triangle', 0.1); this.tone(440, 0.3, 'triangle', 0.1, undefined, 0.15); break;
    }
  },
};

// ==================================================
// Anatomia (desenho de canos, jogador, inimigos)
// ==================================================
function traceShape(ctx, shape, cx, cy, r, rot) {
  ctx.beginPath();
  if (shape === 'circle') { ctx.arc(cx, cy, r, 0, TAU); return; }
  if (shape === 'ring') { ctx.arc(cx, cy, r, 0, TAU); ctx.moveTo(cx + r * 0.5, cy); ctx.arc(cx, cy, r * 0.5, 0, TAU, true); return; }
  const pts = shapePoints(shape, r); const c = Math.cos(rot); const s = Math.sin(rot);
  for (let i = 0; i < pts.length; i++) { const p = pts[i]; const x = cx + p.x * c - p.y * s; const y = cy + p.x * s + p.y * c; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.closePath();
}
function drawShape(ctx, shape, cx, cy, r, rot, fill, stroke, lw = 0) {
  traceShape(ctx, shape, cx, cy, r, rot);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function rect(ctx, x, y, w, h, fill, stroke, lw) {
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
}
const enemyBarrelCache = new Map();
function enemyBarrels(def) {
  const cached = enemyBarrelCache.get(def.id); if (cached) return cached;
  const built = buildEnemyBarrels(def); enemyBarrelCache.set(def.id, built); return built;
}
function buildEnemyBarrels(def) {
  const L = clamp(1.25 + (def.range - 6) * 0.14, 1.2, 2.8);
  const W = clamp((def.bulletSize / def.radius) * 1.5, 0.28, 0.75);
  switch (def.pattern) {
    case 'none': return [{ angle: 0, offset: 0, length: 1.8, width: 0.85, style: 'spike', group: 0 }];
    case 'radial': { const n = def.bulletCount; return Array.from({ length: n }, (_, k) => ({ angle: (k / n) * TAU, offset: 0, length: 1.35, width: 0.34, style: 'rect', group: 0 })); }
    case 'cross': return [0, 1, 2, 3].map(k => ({ angle: (k * Math.PI) / 2, offset: 0, length: 1.55, width: 0.42, style: 'rect', group: 0 }));
    case 'spread': { const n = def.bulletCount; if (n === 2) return [-1, 1].map(s => ({ angle: 0, offset: s * 0.34, length: L * 0.95, width: W * 0.8, style: 'rect', group: 0 })); const step = Math.max((def.bulletSpread * DEG) / (n - 1), 0.42); return Array.from({ length: n }, (_, k) => { const a = (k - (n - 1) / 2) * step; const center = Math.abs(a) < 1e-3; return { angle: a, offset: 0, length: L * (center ? 1 : 0.86), width: W * 0.85, style: def.boss ? 'cannon' : 'rect', group: 0 }; }); }
    default: {
      if (def.homing) return [-1, 1].map(s => ({ angle: s * 0.5, offset: 0, length: 1.35, width: 0.6, style: 'pod', group: 0 }));
      if (def.healer) return [{ angle: 0, offset: 0, length: 1.3, width: 0.95, style: 'dish', group: 0 }];
      if (def.fireRate >= 3) return [{ angle: 0, offset: 0, length: 1.45, width: 0.42, tipWidth: 0.72, style: 'trap', group: 0 }];
      if (def.range >= 12) return [{ angle: 0, offset: 0, length: L, width: W * 0.8, style: 'sniper', group: 0 }];
      return [{ angle: 0, offset: 0, length: L, width: W, style: 'rect', group: 0 }];
    }
  }
}
function drawBarrels(ctx, cx, cy, unit, angle, barrels, bodyR, pal, recoils) {
  const R = bodyR * unit; const lw = Math.max(1, R * 0.14);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  barrels.forEach((b, i) => {
    const rec = (recoils?.[i] ?? 0) * R * 0.28;
    ctx.save(); ctx.rotate(b.angle); ctx.translate(-rec, b.offset * unit);
    const L = b.length * unit; const W = b.width * unit; const TW = (b.tipWidth ?? b.width) * unit;
    ctx.lineJoin = 'round';
    switch (b.style) {
      case 'trap':
      case 'shotgun': {
        ctx.beginPath(); ctx.moveTo(0, -W / 2); ctx.lineTo(L, -TW / 2); ctx.lineTo(L, TW / 2); ctx.lineTo(0, W / 2); ctx.closePath();
        ctx.fillStyle = pal.fill; ctx.fill(); ctx.strokeStyle = pal.stroke; ctx.lineWidth = lw; ctx.stroke();
        if (b.style === 'shotgun') { for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(L - TW * 0.22, k * TW * 0.3, TW * 0.13, 0, TAU); ctx.fillStyle = pal.stroke; ctx.fill(); } }
        else { for (const f of [0.5, 0.65, 0.8]) { ctx.beginPath(); ctx.rect(L * f, -W * 0.5 - lw * 0.4, lw * 0.9, W + lw * 0.8); ctx.fillStyle = pal.stroke; ctx.fill(); } }
        break;
      }
      case 'sniper': {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        rect(ctx, R * 0.95, -W * 0.95, W * 0.75, W * 1.9, pal.dark, pal.stroke, lw);
        rect(ctx, L - W * 0.6, -W * 0.62, W * 0.6, W * 1.24, pal.dark, pal.stroke, lw * 0.8);
        break;
      }
      case 'rocket': {
        rect(ctx, 0, -W / 2, L * 0.84, W, pal.fill, pal.stroke, lw);
        rect(ctx, L * 0.78, -W * 0.72, L * 0.22, W * 1.44, pal.dark, pal.stroke, lw);
        ctx.beginPath(); ctx.arc(L * 0.98, 0, W * 0.3, 0, TAU); ctx.fillStyle = shade(pal.accent, -0.3); ctx.fill();
        break;
      }
      case 'laser': {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        ctx.beginPath(); ctx.rect(R * 0.75, -W * 0.17, L - R * 0.75, W * 0.34); ctx.fillStyle = pal.accent; ctx.fill();
        ctx.beginPath(); ctx.arc(L, 0, W * 0.5, 0, TAU); ctx.fillStyle = pal.accent; ctx.fill();
        ctx.strokeStyle = pal.stroke; ctx.lineWidth = lw; ctx.stroke();
        break;
      }
      case 'burst': {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        for (const f of [0.55, 0.7, 0.85]) { ctx.beginPath(); ctx.rect(L * f, -W / 2, Math.max(1.5, R * 0.12), W); ctx.fillStyle = shade(pal.accent, -0.15); ctx.fill(); }
        break;
      }
      case 'cannon': { rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw); rect(ctx, R * 0.78, -W * 0.78, W * 0.5, W * 1.56, pal.dark, pal.stroke, lw); break; }
      case 'spike': {
        ctx.beginPath(); ctx.moveTo(R * 0.25, -W / 2); ctx.lineTo(L, 0); ctx.lineTo(R * 0.25, W / 2); ctx.closePath();
        ctx.fillStyle = pal.fill; ctx.fill(); ctx.strokeStyle = pal.stroke; ctx.lineWidth = lw; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(R * 0.5, 0); ctx.lineTo(L * 0.92, 0); ctx.strokeStyle = rgba(pal.accent, 0.8); ctx.lineWidth = Math.max(1, lw * 0.6); ctx.stroke();
        break;
      }
      case 'pod': {
        ctx.beginPath(); ctx.roundRect(R * 0.2, -W / 2, L - R * 0.2, W, W * 0.45); ctx.fillStyle = pal.fill; ctx.fill();
        ctx.strokeStyle = pal.stroke; ctx.lineWidth = lw; ctx.stroke();
        ctx.beginPath(); ctx.arc(L - W * 0.45, 0, W * 0.26, 0, TAU); ctx.fillStyle = pal.accent; ctx.fill();
        break;
      }
      case 'dish': {
        rect(ctx, R * 0.2, -W * 0.14, L - R * 0.2, W * 0.28, pal.fill, pal.stroke, lw * 0.8);
        ctx.beginPath(); ctx.arc(L, 0, W * 0.5, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = pal.fill; ctx.lineWidth = Math.max(1.5, lw * 1.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(L, 0, W * 0.16, 0, TAU); ctx.fillStyle = pal.accent; ctx.fill();
        break;
      }
      default: rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
    }
    ctx.restore();
  });
  ctx.restore();
}
const PLAYER_PAL = { fill: '#a7adb7', stroke: '#3d434d', dark: '#6b7280' };
function drawPlayerTank(ctx, cx, cy, pxPerBlock, angle, weapon, bodyColor, recoils, flash, moving, tier) {
  const r = 0.5 * pxPerBlock; const lw = Math.max(1, 0.08 * pxPerBlock);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle + Math.PI);
  for (const s of [-1, 1]) {
    if (moving > 0.05) { ctx.beginPath(); ctx.ellipse(r * 1.05 + moving * r * 0.35, s * r * 0.42, r * 0.15 + moving * r * 0.4, r * 0.12, 0, 0, TAU); ctx.fillStyle = rgba('#7dd3fc', 0.3 + 0.45 * moving); ctx.fill(); }
    ctx.beginPath(); ctx.roundRect(r * 0.5, s * r * 0.42 - r * 0.16, r * 0.5, r * 0.32, r * 0.08); ctx.fillStyle = '#3f4652'; ctx.fill(); ctx.strokeStyle = '#20242b'; ctx.lineWidth = lw * 0.7; ctx.stroke();
  }
  ctx.restore();
  drawBarrels(ctx, cx, cy, pxPerBlock, angle, weapon.barrels, 0.5, { ...PLAYER_PAL, accent: weapon.color }, recoils);
  const base = flash > 0 ? mix(bodyColor, '#ffffff', flash * 0.8) : bodyColor;
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, shade(base, 0.35)); grad.addColorStop(1, shade(base, -0.12));
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = shade(base, -0.45); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.66, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.2); ctx.lineWidth = Math.max(1, 0.04 * pxPerBlock); ctx.stroke();
  if (tier > 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    for (let k = 0; k < tier; k++) { const a = (k - (tier - 1) / 2) * 0.32; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.rect(r * 0.74, -r * 0.05, r * 0.16, r * 0.1); ctx.fillStyle = rgba('#fbbf24', 0.9); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(r * 0.42, -r * 0.22); ctx.lineTo(r * 0.62, 0); ctx.lineTo(r * 0.42, r * 0.22); ctx.closePath(); ctx.fillStyle = rgba('#ffffff', 0.35); ctx.fill();
  ctx.restore();
  const core = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.32);
  core.addColorStop(0, shade(weapon.color, 0.45)); core.addColorStop(1, weapon.color);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, TAU); ctx.fillStyle = core; ctx.fill();
  ctx.strokeStyle = shade(weapon.color, -0.4); ctx.lineWidth = Math.max(1, lw * 0.6); ctx.stroke();
}
function drawEnemyFigure(ctx, cx, cy, r, def, rot, aim, o = {}) {
  const color = def.color; const lw = Math.max(1, r * 0.16);
  const pal = o.elite ? { fill: '#c9ab5a', stroke: '#6b5518', dark: '#8a6d1f', accent: '#fde68a' } : { fill: '#7b838e', stroke: '#2f353e', dark: '#4b5563', accent: color };
  const barrelAngle = def.pattern === 'radial' || def.pattern === 'cross' ? rot : aim;
  drawBarrels(ctx, cx, cy, r, barrelAngle, enemyBarrels(def), 1, pal);
  const fill = o.flash ? mix(color, '#ffffff', o.flash * 0.85) : color;
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r * 1.05);
  grad.addColorStop(0, shade(fill, 0.3)); grad.addColorStop(1, shade(fill, -0.15));
  drawShape(ctx, def.shape, cx, cy, r, rot, grad, o.elite ? '#fbbf24' : shade(color, -0.42), lw);
  if (def.shape !== 'ring' && r > 7) {
    traceShape(ctx, def.shape, cx, cy, r * 0.52, rot);
    ctx.fillStyle = rgba(shade(color, -0.3), o.flash ? 0.3 : 0.8); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, r * 0.15), 0, TAU); ctx.fillStyle = rgba('#ffffff', 0.8); ctx.fill();
  }
  if (def.boss) {
    const t = o.time ?? 0;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.22, 0, TAU);
    ctx.strokeStyle = rgba('#fecdd3', 0.55); ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.setLineDash([r * 0.5, r * 0.28]); ctx.lineDashOffset = -t * r * 0.8; ctx.stroke(); ctx.setLineDash([]);
  }
}

// ==================================================
// Renderer (tela cheia)
// ==================================================
const VIEW_BLOCKS = 25;
const STATE_COLORS = { attack: '#ef4444', retreat: '#f59e0b', dodge: '#22d3ee' };
const PLAYER_COLOR = '#38bdf8';
class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.width = 800; this.height = 600; this.dpr = 1; this.scale = 24;
    this.viewHalfW = 16; this.viewHalfH = 12; this.shake = 0;
    this.shakeX = 0; this.shakeY = 0; this.dust = []; this.nebulae = []; this.decals = [];
    this.obstacles = []; this.arenaHalf = 50;
    for (let i = 0; i < 90; i++) this.dust.push({ x: Math.random(), y: Math.random(), z: 0.15 + Math.random() * 0.35, r: 0.6 + Math.random() * 1.6 });
  }
  setWorld(arenaHalf, obstacles) {
    this.arenaHalf = arenaHalf; this.obstacles = obstacles;
    const rng = mulberry32(obstacles.length * 7919 + Math.floor(arenaHalf));
    const H = arenaHalf; const palette = ['#38bdf8','#a78bfa','#f472b6','#fbbf24','#34d399','#60a5fa'];
    this.nebulae = [];
    for (let i = 0; i < 9; i++) this.nebulae.push({ x: (rng() * 2 - 1) * H * 0.9, y: (rng() * 2 - 1) * H * 0.9, r: 14 + rng() * 16, color: palette[Math.floor(rng() * palette.length)], alpha: 0.06 + rng() * 0.07 });
    this.decals = [];
    const kinds = ['ring', 'hex', 'tri', 'cross'];
    for (let i = 0; i < 26; i++) this.decals.push({ x: (rng() * 2 - 1) * (H - 4), y: (rng() * 2 - 1) * (H - 4), r: 2 + rng() * 4.5, kind: kinds[Math.floor(rng() * kinds.length)], rot: rng() * TAU });
  }
  resize(w, h = w) {
    this.width = Math.max(100, Math.floor(w)); this.height = Math.max(100, Math.floor(h));
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    this.dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px'; this.canvas.style.height = this.height + 'px';
    this.scale = Math.min(this.width, this.height) / VIEW_BLOCKS;
    this.viewHalfW = this.width / this.scale / 2; this.viewHalfH = this.height / this.scale / 2;
  }
  render(g, dt) {
    const { ctx, width, height, scale } = this;
    const hw = width / 2; const hh = height / 2; const cam = g.camera;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.shakeX = (Math.random() - 0.5) * this.shake * scale * 0.35;
    this.shakeY = (Math.random() - 0.5) * this.shake * scale * 0.35;
    const X = (wx) => (wx - cam.x) * scale + hw + this.shakeX;
    const Y = (wy) => (wy - cam.y) * scale + hh + this.shakeY;
    const vw = this.viewHalfW + 2; const vh = this.viewHalfH + 2;
    const inView = (x, y, m = 0) => Math.abs(x - cam.x) < vw + m && Math.abs(y - cam.y) < vh + m;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#090c13'); bg.addColorStop(1, '#06080d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    for (const d of this.dust) {
      const sx = (((d.x * width - cam.x * scale * d.z) % width) + width) % width;
      const sy = (((d.y * height - cam.y * scale * d.z) % height) + height) % height;
      ctx.globalAlpha = 0.12 + d.z * 0.4; ctx.fillStyle = '#9fb3c8';
      ctx.beginPath(); ctx.arc(sx, sy, d.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const H = this.arenaHalf;
    const ax = X(-H); const ay = Y(-H); const aw = H * 2 * scale;
    ctx.fillStyle = '#11161f'; ctx.fillRect(ax, ay, aw, aw);
    for (const n of this.nebulae) {
      if (!inView(n.x, n.y, n.r)) continue;
      const grad = ctx.createRadialGradient(X(n.x), Y(n.y), 0, X(n.x), Y(n.y), n.r * scale);
      grad.addColorStop(0, rgba(n.color, n.alpha)); grad.addColorStop(1, rgba(n.color, 0));
      ctx.fillStyle = grad; ctx.fillRect(X(n.x) - n.r * scale, Y(n.y) - n.r * scale, n.r * scale * 2, n.r * scale * 2);
    }
    const gx0 = Math.max(-H, Math.floor(cam.x - vw));
    const gx1 = Math.min(H, Math.ceil(cam.x + vw));
    const gy0 = Math.max(-H, Math.floor(cam.y - vh));
    const gy1 = Math.min(H, Math.ceil(cam.y + vh));
    for (const major of [false, true]) {
      ctx.beginPath();
      for (let gx = gx0; gx <= gx1; gx++) { if ((gx % 5 === 0) !== major) continue; const sx = Math.round(X(gx)) + 0.5; ctx.moveTo(sx, Math.max(0, ay)); ctx.lineTo(sx, Math.min(height, ay + aw)); }
      for (let gy = gy0; gy <= gy1; gy++) { if ((gy % 5 === 0) !== major) continue; const sy = Math.round(Y(gy)) + 0.5; ctx.moveTo(Math.max(0, ax), sy); ctx.lineTo(Math.min(width, ax + aw), sy); }
      ctx.strokeStyle = major ? 'rgba(140,170,210,0.12)' : 'rgba(140,170,210,0.05)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const d of this.decals) {
      if (!inView(d.x, d.y, d.r)) continue;
      const sx = X(d.x); const sy = Y(d.y); const r = d.r * scale;
      ctx.strokeStyle = 'rgba(160,190,230,0.07)'; ctx.lineWidth = Math.max(1, scale * 0.08);
      ctx.beginPath();
      if (d.kind === 'ring') { ctx.arc(sx, sy, r, 0, TAU); ctx.moveTo(sx + r * 0.6, sy); ctx.arc(sx, sy, r * 0.6, 0, TAU); }
      else if (d.kind === 'hex') { for (let k = 0; k < 6; k++) { const a = d.rot + (k / 6) * TAU; k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); }
      else if (d.kind === 'tri') { for (let k = 0; k < 3; k++) { const a = d.rot + (k / 3) * TAU; k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); }
      else { ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); }
      ctx.stroke();
    }
    if (inView(0, 0, 6)) {
      const cx0 = X(0); const cy0 = Y(0);
      const cg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, 5 * scale);
      cg.addColorStop(0, 'rgba(56,189,248,0.12)'); cg.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = cg; ctx.fillRect(cx0 - 5 * scale, cy0 - 5 * scale, 10 * scale, 10 * scale);
      ctx.strokeStyle = 'rgba(56,189,248,0.18)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([scale * 0.6, scale * 0.4]); ctx.lineDashOffset = -g.time * scale * 0.5;
      ctx.beginPath(); ctx.arc(cx0, cy0, 3.2 * scale, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.rect(ax, ay, aw, aw);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(244,63,94,0.25)'; ctx.lineWidth = 14; ctx.strokeRect(ax, ay, aw, aw);
    ctx.strokeStyle = 'rgba(251,113,133,0.95)'; ctx.lineWidth = 2.5; ctx.strokeRect(ax, ay, aw, aw);
    const cl = 2 * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    for (const [cx, cy, sx, sy] of [[ax, ay, 1, 1], [ax + aw, ay, -1, 1], [ax, ay + aw, 1, -1], [ax + aw, ay + aw, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + sx * cl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * cl); ctx.stroke();
    }
    this.drawObstacles(g, X, Y, inView);
    this.drawDrops(g, X, Y, inView);
    this.drawRings(g, X, Y);
    this.drawGhosts(g, X, Y);
    this.drawEnemies(g, X, Y, inView);
    this.drawBullets(g, X, Y, inView);
    this.drawBeams(g, X, Y);
    this.drawLightning(g, X, Y);
    this.drawPlayer(g, X, Y);
    this.drawParticles(g, X, Y);
    this.drawTexts(g, X, Y);
    this.drawOffscreen(g);
    this.drawMinimap(g);
    this.drawOverlays(g);
  }
  drawObstacles(g, X, Y, inView) {
    const { ctx, scale } = this;
    for (const o of this.obstacles) {
      if (!inView(o.x, o.y, o.r + 1)) continue;
      const sx = X(o.x); const sy = Y(o.y); const r = o.r * scale;
      const poly = (cx, cy, rr) => {
        ctx.beginPath();
        for (let k = 0; k < o.sides; k++) { const a = o.rot + (k / o.sides) * TAU; k ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        ctx.closePath();
      };
      const glow = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 1.6);
      glow.addColorStop(0, 'rgba(96,165,250,0.12)'); glow.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - r * 1.6, sy - r * 1.6, r * 3.2, r * 3.2);
      poly(sx + r * 0.08, sy + r * 0.12, r); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      poly(sx, sy + r * 0.06, r); ctx.fillStyle = '#1a2130'; ctx.fill();
      poly(sx, sy, r);
      const top = ctx.createLinearGradient(sx - r, sy - r, sx + r, sy + r);
      top.addColorStop(0, '#3a4458'); top.addColorStop(1, '#1f2634');
      ctx.fillStyle = top; ctx.fill();
      ctx.strokeStyle = 'rgba(147,197,253,0.55)'; ctx.lineWidth = Math.max(1.5, scale * 0.07); ctx.lineJoin = 'round'; ctx.stroke();
      poly(sx, sy, r * 0.55); ctx.strokeStyle = 'rgba(147,197,253,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, r * 0.12), 0, TAU); ctx.fillStyle = 'rgba(147,197,253,0.5)'; ctx.fill();
    }
  }
  drawDrops(g, X, Y, inView) {
    const { ctx, scale } = this;
    for (const d of g.drops) {
      if (!inView(d.x, d.y)) continue;
      const m = MATERIALS[d.material]; if (!m) continue;
      const rc = RARITY_META[m.rarity].color;
      const remaining = d.ttl - d.age;
      if (remaining < 6 && Math.floor(d.age * 6) % 2 === 0) continue;
      const bob = Math.sin(d.age * 3 + d.id) * 0.06 * scale;
      const sx = X(d.x); const sy = Y(d.y) + bob; const r = 0.22 * scale;
      const order = RARITY_META[m.rarity].order;
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(d.age * 4) + order * 0.04;
      ctx.beginPath(); ctx.arc(sx, sy, r * (1.8 + order * 0.25), 0, TAU); ctx.fillStyle = rc; ctx.fill();
      ctx.globalAlpha = 1;
      if (order >= 3) {
        ctx.beginPath(); ctx.arc(sx, sy, r * 2.4, 0, TAU);
        ctx.strokeStyle = rgba(rc, 0.5 + 0.3 * Math.sin(d.age * 5));
        ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -d.age * 20; ctx.stroke(); ctx.setLineDash([]);
      }
      drawShape(ctx, m.shape, sx, sy, r, d.age * 1.5, m.color, rc, Math.max(1, 0.06 * scale));
    }
  }
  drawRings(g, X, Y) {
    const { ctx, scale } = this;
    for (const r of g.rings) {
      const t = 1 - r.life / r.maxLife;
      ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), Math.max(0.01, r.maxR * t * scale), 0, TAU);
      ctx.strokeStyle = rgba(r.color, (1 - t) * 0.8); ctx.lineWidth = Math.max(1, r.width * scale * (1 - t * 0.5)); ctx.stroke();
    }
  }
  drawGhosts(g, X, Y) {
    const { ctx, scale } = this;
    for (const gh of g.ghosts) {
      ctx.globalAlpha = (gh.life / gh.maxLife) * 0.35;
      drawPlayerTank(ctx, X(gh.x), Y(gh.y), scale, gh.aim, g.weapon, '#67e8f9');
    }
    ctx.globalAlpha = 1;
  }
  drawEnemies(g, X, Y, inView) {
    const { ctx, scale } = this;
    const lw = Math.max(1, 0.08 * scale);
    for (const e of g.enemies) {
      if (e.dead || !inView(e.x, e.y, e.radius * 3)) continue;
      const def = e.def; const sx = X(e.x); const sy = Y(e.y);
      const spawning = e.scaleIn < 1;
      const r = e.radius * scale * (spawning ? 0.6 + 0.4 * e.scaleIn : 1);
      if (spawning) {
        ctx.globalAlpha = 0.25 + 0.55 * e.scaleIn;
        ctx.beginPath(); ctx.arc(sx, sy, e.radius * scale * (1.8 - 0.8 * e.scaleIn), 0, TAU);
        ctx.strokeStyle = e.elite ? '#fbbf24' : def.color; ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); ctx.lineDashOffset = -g.time * 30; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(sx, sy + r * 0.12, r * 1.05, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      if (e.state === 'dodge') {
        ctx.globalAlpha = 0.22;
        drawShape(ctx, def.shape, sx - e.vx * 0.06 * scale, sy - e.vy * 0.06 * scale, r, e.rot, def.color);
        ctx.globalAlpha = spawning ? 0.25 + 0.55 * e.scaleIn : 1;
      }
      drawEnemyFigure(ctx, sx, sy, r, def, e.rot, e.aim, { elite: e.elite, flash: e.hitFlash, enraged: e.enraged, time: g.time, boss: def.boss });
      ctx.globalAlpha = 1;
      if (e.enraged) {
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.2, 0, TAU);
        ctx.strokeStyle = rgba('#ef4444', 0.5 + 0.4 * Math.sin(g.time * 12));
        ctx.lineWidth = Math.max(1.5, lw * 0.8); ctx.stroke();
      }
      if (e.elite) {
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.36, 0, TAU);
        ctx.strokeStyle = rgba('#fbbf24', 0.75 + 0.25 * Math.sin(g.time * 6));
        ctx.lineWidth = Math.max(1.5, lw * 0.7);
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = -g.time * 25; ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.slow > 0) {
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.15, 0, TAU);
        ctx.strokeStyle = 'rgba(103,232,249,0.7)'; ctx.lineWidth = Math.max(1, lw * 0.6);
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.burn) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.3;
        ctx.beginPath(); ctx.arc(sx + (Math.random() - 0.5) * r * 0.6, sy + (Math.random() - 0.5) * r * 0.6, r * 0.35, 0, TAU);
        ctx.fillStyle = '#fb923c'; ctx.fill(); ctx.globalAlpha = 1;
      }
      if (def.healer) {
        ctx.beginPath(); ctx.arc(sx, sy, 4 * scale, 0, TAU);
        ctx.strokeStyle = 'rgba(45,212,191,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.hp < e.maxHp - 0.5) {
        const bw = Math.max(2 * r, 0.9 * scale); const bh = Math.max(3, 0.12 * scale);
        const bx = sx - bw / 2; const by = sy + r + 0.3 * scale;
        const ratio = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, bh); ctx.fill();
        ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#f87171';
        ctx.beginPath(); ctx.roundRect(bx, by, bw * ratio, bh, bh); ctx.fill();
      }
      if (g.showAi && !spawning) {
        ctx.beginPath(); ctx.arc(sx, sy - r - 0.35 * scale, Math.max(2, 0.1 * scale), 0, TAU);
        ctx.fillStyle = STATE_COLORS[e.state]; ctx.fill();
      }
    }
  }
  drawBullets(g, X, Y, inView) {
    const { ctx, scale } = this;
    for (const b of g.bullets) {
      if (!inView(b.x, b.y)) continue;
      const sx = X(b.x); const sy = Y(b.y); const r = Math.max(1.5, b.radius * scale);
      const lw = Math.max(1, 0.06 * scale);
      ctx.beginPath(); ctx.arc(sx, sy, r * (b.owner === 'player' ? 2.2 : 1.8), 0, TAU);
      ctx.fillStyle = rgba(b.color, b.owner === 'player' ? (b.crit ? 0.3 : 0.16) : 0.1); ctx.fill();
      if (b.rocket) {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.beginPath(); ctx.roundRect(-r * 1.5, -r, r * 3, r * 2, r);
        ctx.fillStyle = b.color; ctx.fill(); ctx.strokeStyle = shade(b.color, -0.4); ctx.lineWidth = lw; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 1.5, -r); ctx.lineTo(r * 2.3, 0); ctx.lineTo(r * 1.5, r); ctx.closePath();
        ctx.fillStyle = shade(b.color, -0.25); ctx.fill(); ctx.restore();
      } else if (b.homing && b.owner === 'enemy') {
        drawShape(ctx, 'diamond', sx, sy, r * 1.4, Math.atan2(b.vy, b.vx), b.color, shade(b.color, -0.4), lw);
      } else if (b.isFragment) {
        drawShape(ctx, 'triangle', sx, sy, r, b.spin, b.color, shade(b.color, -0.4), lw);
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
        ctx.fillStyle = b.crit ? shade(b.color, 0.45) : b.color; ctx.fill();
        ctx.strokeStyle = shade(b.color, -0.4); ctx.lineWidth = lw; ctx.stroke();
      }
    }
  }
  drawBeams(g, X, Y) {
    const { ctx, scale } = this;
    for (const b of g.beams) {
      const a = b.life / b.maxLife; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(b.x1), Y(b.y1)); ctx.lineTo(X(b.x2), Y(b.y2));
      ctx.strokeStyle = rgba(b.color, 0.25 * a); ctx.lineWidth = Math.max(2, b.width * scale * 2.4); ctx.stroke();
      ctx.strokeStyle = rgba(b.color, 0.9 * a); ctx.lineWidth = Math.max(1.5, b.width * scale); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`; ctx.lineWidth = Math.max(1, b.width * scale * 0.35); ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  drawLightning(g, X, Y) {
    const { ctx, scale } = this;
    for (const l of g.lightnings) {
      const a = l.life / l.maxLife; ctx.beginPath();
      l.points.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
      ctx.strokeStyle = rgba(l.color, 0.9 * a); ctx.lineWidth = Math.max(1.5, 0.08 * scale); ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  drawPlayer(g, X, Y) {
    const { ctx, scale } = this;
    const p = g.player; const sx = X(p.x); const sy = Y(p.y);
    if (g.gameOver) return;
    const ratio = p.hp / p.maxHp;
    if (ratio < 0.35) {
      ctx.beginPath(); ctx.arc(sx, sy, scale * (0.75 + 0.1 * Math.sin(g.time * 8)), 0, TAU);
      ctx.strokeStyle = rgba('#ef4444', 0.4 + 0.3 * Math.sin(g.time * 8)); ctx.lineWidth = 2; ctx.stroke();
    }
    if (p.invuln > 0) {
      ctx.beginPath(); ctx.arc(sx, sy, scale * 0.82, 0, TAU);
      ctx.strokeStyle = rgba('#67e8f9', 0.5 + 0.4 * Math.sin(g.time * 30)); ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(sx, sy + 0.1 * scale, 0.58 * scale, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill();
    const moving = clamp(Math.hypot(p.vx, p.vy) / p.speed, 0, 1);
    drawPlayerTank(ctx, sx, sy, scale, p.aim, g.weapon, PLAYER_COLOR, p.barrelRecoil, p.hitFlash, moving, g.weapon.tier);
    const bw = 1.3 * scale; const bh = Math.max(3, 0.13 * scale);
    const bx = sx - bw / 2; const by = sy + 0.5 * scale + 0.3 * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, bh); ctx.fill();
    ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#f87171';
    ctx.beginPath(); ctx.roundRect(bx, by, bw * clamp(ratio, 0, 1), bh, bh); ctx.fill();
    if (p.dashCooldown > 0) {
      const t = 1 - p.dashCooldown / g.dashCooldownMax;
      ctx.beginPath(); ctx.arc(sx, sy, 0.72 * scale, -Math.PI / 2, -Math.PI / 2 + TAU * t);
      ctx.strokeStyle = rgba('#67e8f9', 0.55); ctx.lineWidth = 2; ctx.stroke();
    }
  }
  drawParticles(g, X, Y) {
    const { ctx, scale } = this;
    for (const p of g.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1); const s = p.size * scale * (0.4 + 0.6 * a);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      const sx = X(p.x); const sy = Y(p.y);
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill(); }
      else if (p.shape === 'square') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore(); }
      else { ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(s * 1.4, 0); ctx.lineTo(-s * 0.7, s * 0.8); ctx.lineTo(-s * 0.7, -s * 0.8); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  drawTexts(g, X, Y) {
    const { ctx, scale } = this;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of g.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1); ctx.globalAlpha = a;
      ctx.font = `800 ${Math.max(10, t.size * scale)}px Inter, system-ui, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.text, X(t.x), Y(t.y)); ctx.fillStyle = t.color; ctx.fillText(t.text, X(t.x), Y(t.y));
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
  drawOffscreen(g) {
    const { ctx, width, height, scale } = this;
    const hw = width / 2; const hh = height / 2; const inset = 0.9 * scale;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - g.camera.x; const dy = e.y - g.camera.y;
      if (Math.abs(dx) <= this.viewHalfW && Math.abs(dy) <= this.viewHalfH) continue;
      const t = Math.min((hw - inset) / Math.abs(dx * scale || 1e-6), (hh - inset) / Math.abs(dy * scale || 1e-6));
      const sx = hw + dx * scale * t; const sy = hh + dy * scale * t; const ang = Math.atan2(dy, dx);
      const s = e.def.boss ? 11 : e.elite ? 9 : 7;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang); ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.7, -s * 0.7); ctx.closePath();
      ctx.fillStyle = e.elite ? '#fbbf24' : e.def.color; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  drawMinimap(g) {
    const { ctx, width } = this;
    const mm = Math.max(84, Math.min(130, Math.min(width, this.height) * 0.17));
    const pad = 12; const x0 = width - mm - pad; const y0 = g.minimapTop;
    const H = this.arenaHalf; const k = mm / (H * 2);
    ctx.fillStyle = 'rgba(5,8,14,0.72)';
    ctx.beginPath(); ctx.roundRect(x0, y0, mm, mm, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    for (const o of this.obstacles) {
      ctx.fillStyle = 'rgba(147,197,253,0.35)';
      ctx.beginPath(); ctx.arc(x0 + (o.x + H) * k, y0 + (o.y + H) * k, Math.max(1.2, o.r * k), 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(56,189,248,0.5)';
    ctx.strokeRect(x0 + (g.camera.x + H - this.viewHalfW) * k, y0 + (g.camera.y + H - this.viewHalfH) * k, this.viewHalfW * 2 * k, this.viewHalfH * 2 * k);
    for (const d of g.drops) {
      ctx.fillStyle = RARITY_META[MATERIALS[d.material]?.rarity ?? 'common'].color;
      ctx.fillRect(x0 + (d.x + H) * k - 1, y0 + (d.y + H) * k - 1, 2, 2);
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.elite ? '#fbbf24' : e.def.color;
      ctx.beginPath(); ctx.arc(x0 + (e.x + H) * k, y0 + (e.y + H) * k, e.def.boss ? 4 : 2, 0, TAU); ctx.fill();
    }
      ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath(); ctx.arc(x0 + (g.player.x + H) * k, y0 + (g.player.y + H) * k, 3, 0, TAU); ctx.fill();
  }
  drawOverlays(g) {
    const { ctx, width, height } = this;
    const R = Math.max(width, height);
    const vg = ctx.createRadialGradient(width / 2, height / 2, R * 0.42, width / 2, height / 2, R * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, width, height);
    const p = g.player; const ratio = p.hp / p.maxHp;
    const hurt = Math.max(p.hitFlash * 0.5, ratio < 0.35 && !g.gameOver ? ((0.35 - ratio) / 0.35) * (0.7 + 0.3 * Math.sin(g.time * 6)) * 0.45 : 0);
    if (hurt > 0.01) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, R * 0.3, width / 2, height / 2, R * 0.72);
      grad.addColorStop(0, 'rgba(239,68,68,0)'); grad.addColorStop(1, `rgba(239,68,68,${Math.min(0.6, hurt)})`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    }
  }
}

// ==================================================
// Engine do jogo
// ==================================================
const ARENA_HALF = 50;
const MAX_ARSENAL = 12;
const STARTING_KIT = { iron: 2, gunpowder: 2, lens: 1, lead: 1 };
const BASE_HP = 100; const BASE_SPEED = 6.2; const BASE_REGEN = 0.015;
const BASE_BODY = 12; const BASE_MAGNET = 2.8; const DASH_CD = 2.6;
const OBSTACLE_COUNT = 18;

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.renderer = new Renderer(canvas);
    this.arenaHalf = ARENA_HALF; this.obstacles = [];
    this.started = false; this.paused = false; this.gameOver = false; this.destroyed = false;
    this.time = 0; this.lastTs = 0; this.rafId = 0; this.uiTimer = 0;
    this.fpsAcc = 0; this.fpsCount = 0; this.fps = 60;
    this.player = null; this.mods = createMods(); this.upgradeCounts = {};
    this.level = 1; this.xp = 0; this.pendingLevelUps = 0;
    this.levelUpOptions = null; this.waveHpBonus = 0; this.curStats = {};
    this.enemies = []; this.bullets = []; this.beams = []; this.drops = [];
    this.particles = []; this.texts = []; this.lightnings = []; this.rings = [];
    this.ghosts = []; this.camera = { x: 0, y: 0 }; this.nextId = 1;
    this.wave = 0; this.bestWave = 0; this.waveState = 'intermission';
    this.intermissionTimer = 5; this.spawnQueue = []; this.spawnTimer = 0;
    this.waveTime = 0; this.enrageAnnounced = false; this.waveSpec = null;
    this.score = 0; this.kills = 0; this.combo = 0; this.comboTimer = 0;
    this.killsByType = {}; this.encountered = new Set();
    this.inventory = { ...STARTING_KIT }; this.arsenal = []; this.equipped = 0;
    this.discoveredRecipes = new Set(); this.forgedCount = 0; this.materialsCollected = 0;
    this.inputMode = 'pc'; this.keys = new Set(); this.mouse = { x: 1, y: 0 };
    this.mouseDown = false; this.autoFire = false; this.autoAim = false;
    this.showAi = false; this.showDamage = true; this.minimapTop = 78;
    this.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };
    this.onUi = null; this.onEvent = null;
    this.grid = new Map(); this.CELL = 2.6; this.playerBulletsCache = [];
    this.neighborBuf = []; this.collBuf = [];
    this.reset();
    this.bindInput();
    this.rafId = requestAnimationFrame(this.loop);
  }
  get weapon() { return this.arsenal[this.equipped] ?? this.arsenal[0]; }
  get xpToNext() { return xpToNext(this.level); }
  get comboMult() { return this.combo > 1 ? 1 + Math.min(this.combo - 1, 20) * 0.1 : 1; }
  get dashCooldownMax() { return DASH_CD * (1 - Math.min(0.6, this.mods.dashCd)); }
  reset() {
    this.player = { x: 0, y: 0, vx: 0, vy: 0, radius: 0.5, hp: BASE_HP, maxHp: BASE_HP, speed: BASE_SPEED, bodyDamage: BASE_BODY, aim: 0, fireCooldown: 0, burstLeft: 0, burstTimer: 0, twinToggle: 0, barrelRecoil: [0, 0, 0, 0, 0], lastDamageTime: -10, hitFlash: 0, regen: BASE_REGEN, invuln: 0, dashCooldown: 0, dashTime: 0, thrustTimer: 0 };
    this.mods = createMods(); this.upgradeCounts = {};
    this.level = 1; this.xp = 0; this.pendingLevelUps = 0; this.levelUpOptions = null;
    this.waveHpBonus = 0; this.enemies = []; this.bullets = []; this.beams = []; this.drops = [];
    this.particles = []; this.texts = []; this.lightnings = []; this.rings = [];
    this.ghosts = []; this.camera = { x: 0, y: 0 }; this.time = 0;
    this.wave = 0; this.waveState = 'intermission'; this.intermissionTimer = 6;
    this.spawnQueue = []; this.waveSpec = null; this.score = 0;
    this.kills = 0; this.combo = 0; this.comboTimer = 0; this.killsByType = {};
    this.encountered = new Set(); this.inventory = { ...STARTING_KIT };
    this.arsenal = [createDefaultWeapon()]; this.equipped = 0;
    this.discoveredRecipes = new Set(); this.forgedCount = 0; this.materialsCollected = 0;
    this.gameOver = false; this.mouseDown = false;
    this.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };
    this.generateObstacles();
    this.renderer.setWorld(this.arenaHalf, this.obstacles);
    this.recomputeStats();
  }
  generateObstacles() {
    const H = this.arenaHalf; const list = []; let guard = 0;
    while (list.length < OBSTACLE_COUNT && guard++ < 600) {
      const r = rand(1.5, 3.1); const x = rand(-H + 7, H - 7); const y = rand(-H + 7, H - 7);
      if (Math.hypot(x, y) < 10) continue;
      if (list.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 7.5)) continue;
      list.push({ x, y, r, rot: rand(0, TAU), sides: Math.random() < 0.7 ? 6 : 8 });
    }
    this.obstacles = list;
  }
  start() { this.started = true; this.lastTs = performance.now(); }
  restart() { this.reset(); this.started = true; this.paused = false; }
  setPaused(p) { this.paused = p; if (p) this.mouseDown = false; }
  setInputMode(mode) {
    this.inputMode = mode;
    if (mode === 'touch') { this.autoAim = true; this.autoFire = true; }
    this.touch = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimMag: 0, aimActive: false };
  }
  resize(w, h = w) { this.renderer.resize(w, h); }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.rafId); this.unbindInput(); }
  loop = (ts) => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);
    let dt = (ts - this.lastTs) / 1000; this.lastTs = ts;
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    this.fpsAcc += dt; this.fpsCount++;
    if (this.fpsAcc >= 0.5) { this.fps = Math.round(this.fpsCount / this.fpsAcc); this.fpsAcc = 0; this.fpsCount = 0; }
    if (this.started && !this.paused && !this.gameOver) this.update(dt);
    this.renderer.render(this, dt);
    this.uiTimer += dt;
    if (this.uiTimer >= 0.1) { this.uiTimer = 0; this.onUi?.(this.getSnapshot()); }
  };
  onKeyDown = (ev) => {
    if (ev.repeat) return;
    const code = ev.code;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code)) ev.preventDefault();
    if (code === 'KeyB') return this.onEvent?.({ type: 'togglePanel', panel: 'bestiary' });
    if (code === 'KeyF') return this.onEvent?.({ type: 'togglePanel', panel: 'forge' });
    if (code === 'Escape' || code === 'KeyP') return this.onEvent?.({ type: 'togglePanel', panel: 'pause' });
    if (this.paused) return;
    this.keys.add(code);
    if (code === 'KeyE') this.autoFire = !this.autoFire;
    if (code === 'KeyQ') this.autoAim = !this.autoAim;
    if (code === 'KeyH') this.showAi = !this.showAi;
    if (code === 'KeyD') this.showDamage = !this.showDamage;
    if (code === 'Space' || code === 'ShiftLeft') this.dash();
    if (code === 'KeyN' && this.waveState === 'intermission' && this.started) this.intermissionTimer = Math.min(this.intermissionTimer, 0.01);
    if (code.startsWith('Digit')) { const n = parseInt(code.slice(5), 10); if (n >= 1 && n <= this.arsenal.length) this.equip(n - 1); }
  };
  onKeyUp = (ev) => { this.keys.delete(ev.code); };
  onMouseMove = (ev) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ev.clientX - rect.left - rect.width / 2;
    this.mouse.y = ev.clientY - rect.top - rect.height / 2;
  };
  onMouseDown = (ev) => { if (ev.button === 0 && !this.paused && this.inputMode === 'pc') this.mouseDown = true; };
  onMouseUp = () => { this.mouseDown = false; };
  onBlur = () => { this.keys.clear(); this.mouseDown = false; };
  onContext = (ev) => ev.preventDefault();
  bindInput() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('contextmenu', this.onContext);
  }
  unbindInput() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContext);
  }
  hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax; const dy = by - ay; const len2 = dx * dx + dy * dy || 1e-6;
    for (const o of this.obstacles) {
      const t = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / len2, 0, 1);
      const cx = ax + dx * t - o.x; const cy = ay + dy * t - o.y;
      if (cx * cx + cy * cy < o.r * o.r) return false;
    }
    return true;
  }
  rayObstacleDistance(ox, oy, dx, dy, maxT) {
    let best = Infinity;
    for (const o of this.obstacles) {
      const fx = ox - o.x; const fy = oy - o.y;
      const b = fx * dx + fy * dy; const c = fx * fx + fy * fy - o.r * o.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < maxT && t < best) best = t;
    }
    return best;
  }
  pushOutOfObstacles(body, radius) {
    let hit = false;
    for (const o of this.obstacles) {
      const dx = body.x - o.x; const dy = body.y - o.y;
      const rr = o.r + radius; const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001; const nx = dx / d; const ny = dy / d;
        body.x = o.x + nx * rr; body.y = o.y + ny * rr;
        const vn = body.vx * nx + body.vy * ny;
        if (vn < 0) { body.vx -= vn * nx; body.vy -= vn * ny; }
        hit = true;
      }
    }
    return hit;
  }
  recomputeStats() {
    const s = this.weapon.stats; const m = this.mods;
    this.curStats = { ...s, damage: s.damage * (1 + m.damage), rpm: s.rpm * (1 + m.fireRate), bulletSpeed: s.bulletSpeed * (1 + m.bulletSpeed), range: s.range * (1 + m.bulletSpeed * 0.7), pierce: s.pierce + m.pierce };
    const p = this.player; const oldMax = p.maxHp;
    p.maxHp = Math.round((BASE_HP + this.waveHpBonus + m.maxHp) * (1 + m.maxHpPct));
    if (p.maxHp > oldMax) p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - oldMax));
    p.speed = BASE_SPEED * (1 + m.speed); p.regen = BASE_REGEN + m.regen; p.bodyDamage = BASE_BODY * (1 + m.bodyDamage);
  }
  get effectiveDps() {
    const base = computeDps(this.curStats, this.weapon.archetype, this.weapon.effects);
    return base * (1 + this.mods.crit);
  }
  update(dt) {
    this.time += dt;
    this.updatePlayer(dt);
    this.updateWaves(dt);
    this.buildGrid();
    this.playerBulletsCache = this.bullets.filter(b => b.owner === 'player' && !b.isFragment);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.handleCollisions();
    this.updateDrops(dt);
    this.updateFx(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.camera.x = this.player.x; this.camera.y = this.player.y;
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
  }
  nearestEnemy(maxDist, needLos = true) {
    const p = this.player; let best = null; let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead || e.scaleIn < 1) continue;
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bd && (!needLos || this.hasLineOfSight(p.x, p.y, e.x, e.y))) { bd = d2; best = e; }
    }
    return best;
  }
  updatePlayer(dt) {
    const p = this.player; let ix = 0; let iy = 0; let firing = false;
    if (this.inputMode === 'touch') { ix = this.touch.moveX; iy = this.touch.moveY; }
    else {
      const k = this.keys;
      if (k.has('KeyW') || k.has('ArrowUp')) iy -= 1;
      if (k.has('KeyS') || k.has('ArrowDown')) iy += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    }
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    let aimed = false;
    if (this.inputMode === 'touch' && this.touch.aimActive) {
      p.aim = Math.atan2(this.touch.aimY, this.touch.aimX);
      firing = this.touch.aimMag > 0.3; aimed = true;
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
      if (this.inputMode === 'pc') p.aim = Math.atan2(this.mouse.y, this.mouse.x);
      firing = this.inputMode === 'pc' ? this.mouseDown || this.autoFire : false;
    }
    p.dashTime -= dt; p.dashCooldown -= dt; p.invuln -= dt;
    if (p.dashTime > 0) { p.vx = damp(p.vx, 0, 2.5, dt); p.vy = damp(p.vy, 0, 2.5, dt); this.ghosts.push({ x: p.x, y: p.y, aim: p.aim, life: 0.25, maxLife: 0.25 }); }
    else { p.vx = damp(p.vx, ix * p.speed, 9, dt); p.vy = damp(p.vy, iy * p.speed, 9, dt); }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const lim = this.arenaHalf - p.radius;
    if (p.x < -lim) { p.x = -lim; p.vx = Math.max(0, p.vx); }
    if (p.x > lim) { p.x = lim; p.vx = Math.min(0, p.vx); }
    if (p.y < -lim) { p.y = -lim; p.vy = Math.max(0, p.vy); }
    if (p.y > lim) { p.y = lim; p.vy = Math.min(0, p.vy); }
    this.pushOutOfObstacles(p, p.radius);
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 2.5) {
      p.thrustTimer -= dt;
      if (p.thrustTimer <= 0) {
        p.thrustTimer = 0.045;
        const bx = p.x - (p.vx / sp) * 0.5; const by = p.y - (p.vy / sp) * 0.5;
        this.particles.push({ x: bx, y: by, vx: -p.vx * 0.15 + rand(-0.6, 0.6), vy: -p.vy * 0.15 + rand(-0.6, 0.6), life: 0.3, maxLife: 0.3, color: '#7dd3fc', size: 0.09, shape: 'circle', rot: 0, rotV: 0 });
      }
    }
    p.hitFlash = Math.max(0, p.hitFlash - dt * 5);
    for (let i = 0; i < p.barrelRecoil.length; i++) p.barrelRecoil[i] = Math.max(0, p.barrelRecoil[i] - dt * 7);
    if (this.time - p.lastDamageTime > 4) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.regen * dt);
    p.fireCooldown -= dt;
    if (p.burstLeft > 0) {
      p.burstTimer -= dt;
      if (p.burstTimer <= 0) { this.fireShot(); p.burstLeft--; p.burstTimer = 0.07; }
    } else if (firing && p.fireCooldown <= 0) {
      const w = this.weapon;
      p.fireCooldown = (60 / this.curStats.rpm) * (w.burst > 1 ? w.burst : 1);
      if (w.burst > 1) { p.burstLeft = w.burst - 1; p.burstTimer = 0.07; }
      this.fireShot();
    }
  }
  dash() {
    const p = this.player;
    if (p.dashCooldown > 0 || this.gameOver || !this.started || this.paused) return;
    let dx = 0; let dy = 0;
    if (this.inputMode === 'touch') { dx = this.touch.moveX; dy = this.touch.moveY; }
    else {
      const k = this.keys;
      if (k.has('KeyW') || k.has('ArrowUp')) dy -= 1;
      if (k.has('KeyS') || k.has('ArrowDown')) dy += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
    }
    const l = Math.hypot(dx, dy);
    if (l < 0.2) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); } else { dx /= l; dy /= l; }
    p.vx = dx * 24; p.vy = dy * 24;
    p.dashTime = 0.2; p.invuln = 0.32; p.dashCooldown = this.dashCooldownMax;
    this.rings.push({ x: p.x, y: p.y, maxR: 1.4, life: 0.3, maxLife: 0.3, color: '#67e8f9', width: 0.12 });
    this.burst(p.x, p.y, 10, '#7dd3fc', 0.1, 5, 'circle', 0.35);
    sfx.play('dash'); sfx.vibrate(15);
  }
  cycleWeapon() { if (this.arsenal.length < 2) return; this.equip((this.equipped + 1) % this.arsenal.length); }
  muzzle(bi) {
    const p = this.player; const b = this.weapon.barrels[bi];
    const th = p.aim + b.angle;
    return { x: p.x + b.length * Math.cos(th) - b.offset * Math.sin(th), y: p.y + b.length * Math.sin(th) + b.offset * Math.cos(th), angle: th };
  }
  fireShot() {
    const w = this.weapon; const p = this.player; const s = this.curStats;
    if (w.isBeam) return this.fireBeam();
    const spreadRad = s.spread * DEG;
    let barrels;
    switch (w.archetype) {
      case 'twin': barrels = [p.twinToggle]; p.twinToggle = 1 - p.twinToggle; break;
      case 'multicannon': barrels = w.barrels.map((_, i) => i); break;
      case 'flak': barrels = [2]; break;
      default: barrels = [0];
    }
    const perBarrel = w.archetype === 'multicannon' ? 1 : s.count;
    for (const bi of barrels) {
      const m = this.muzzle(bi);
      for (let k = 0; k < perBarrel; k++) {
        let ang = m.angle;
        if (perBarrel > 1) ang += (k / (perBarrel - 1) - 0.5) * spreadRad * 1.6 + (Math.random() - 0.5) * spreadRad * 0.4;
        else ang += (Math.random() - 0.5) * spreadRad;
        const speed = s.bulletSpeed * (w.archetype === 'shotgun' ? rand(0.85, 1.15) : 1);
        const crit = Math.random() < this.mods.crit;
        const b = this.spawnBullet('player', m.x, m.y, ang, speed, s.damage * (crit ? 2 : 1), s.bulletSize * (crit ? 1.2 : 1), s.pierce, s.range / s.bulletSpeed, w.color, w.effects, { rocket: w.archetype === 'rocket' });
        b.crit = crit;
      }
      p.barrelRecoil[bi] = 1;
      if (w.archetype === 'flak') { p.barrelRecoil[0] = 0.6; p.barrelRecoil[1] = 0.6; }
      this.burst(m.x, m.y, 2, w.color, 0.08, 3, 'circle', 0.15);
    }
    const rec = w.recoil * 0.9;
    p.vx -= Math.cos(p.aim) * rec; p.vy -= Math.sin(p.aim) * rec;
    sfx.play('shoot', w.archetype === 'sniper' || w.archetype === 'rocket' || w.archetype === 'cannon' ? 0.6 : w.archetype === 'machinegun' ? 1.4 : 1);
  }
  fireBeam() {
    const w = this.weapon; const s = this.curStats; const p = this.player;
    const m = this.muzzle(0);
    const ang = m.angle + (Math.random() - 0.5) * s.spread * DEG;
    const dx = Math.cos(ang); const dy = Math.sin(ang);
    const H = this.arenaHalf;
    let endT = s.range;
    const tx = dx > 0 ? (H - m.x) / dx : dx < 0 ? (-H - m.x) / dx : Infinity;
    const ty = dy > 0 ? (H - m.y) / dy : dy < 0 ? (-H - m.y) / dy : Infinity;
    endT = Math.min(endT, tx, ty, this.rayObstacleDistance(m.x, m.y, dx, dy, endT));
    const hits = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const rx = e.x - m.x; const ry = e.y - m.y;
      const t = rx * dx + ry * dy;
      if (t < 0 || t > endT) continue;
      const perp = Math.abs(rx * dy - ry * dx);
      if (perp <= e.radius + s.bulletSize) hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);
    const used = hits.slice(0, s.pierce);
    const sampled = Math.random() > 0.2; const crit = Math.random() < this.mods.crit;
    for (const h of used) this.hitEnemy(h.e, s.damage * (crit ? 2 : 1), w.effects, dx * 0.4, dy * 0.4, { noExplode: sampled, noFragment: sampled, noChain: Math.random() > 0.35, crit });
    if (hits.length > s.pierce && used.length) endT = used[used.length - 1].t + used[used.length - 1].e.radius * 0.5;
    this.beams.push({ x1: m.x, y1: m.y, x2: m.x + dx * endT, y2: m.y + dy * endT, width: s.bulletSize * 2 * (crit ? 1.5 : 1), color: w.color, life: 0.09, maxLife: 0.09 });
    p.barrelRecoil[0] = 0.4; sfx.play('laser');
    if (Math.random() < 0.5) this.burst(m.x + dx * endT, m.y + dy * endT, 2, w.color, 0.1, 4, 'circle', 0.2);
  }
  spawnBullet(owner, x, y, angle, speed, damage, radius, pierce, life, color, effects, opts = {}) {
    const ric = effects.find(e => e.kind === 'ricochet');
    const bullet = {
      id: this.nextId++, owner, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius, damage, pierce, life, maxLife: life, color,
      effects, hit: new Set(), homing: !!opts.homing || effects.some(e => e.kind === 'homing'),
      bounces: ric ? Math.round(1 + ric.power * 2) : 0, rocket: !!opts.rocket, isFragment: !!opts.fragment, trailTimer: 0, spin: rand(0, TAU), exploded: false, crit: false,
    };
    this.bullets.push(bullet);
    return bullet;
  }
  updateWaves(dt) {
    if (this.waveState === 'intermission') {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) this.startWave(this.wave + 1);
      return;
    }
    this.waveTime += dt;
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 28) {
        const batch = Math.min(this.spawnQueue.length, 2 + Math.floor(this.wave / 3));
        for (let i = 0; i < batch; i++) this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = 2.2;
      }
    } else if (this.enemies.length === 0) {
      this.completeWave();
    } else if (this.enemies.length <= 3 && this.waveTime > 50 && !this.enrageAnnounced) {
      this.enrageAnnounced = true;
      for (const e of this.enemies) { e.enraged = true; e.retreatCount = 3; e.state = 'attack'; }
    }
  }
  startWave(n) {
    this.wave = n; this.bestWave = Math.max(this.bestWave, n);
    this.waveSpec = buildWave(n); this.spawnQueue = [...this.waveSpec.enemies];
    this.spawnTimer = 0.6; this.waveTime = 0; this.enrageAnnounced = false;
    this.waveState = 'active'; sfx.play('wave');
  }
  completeWave() {
    this.waveState = 'intermission'; this.intermissionTimer = 12;
    const p = this.player; this.waveHpBonus += 5; this.recomputeStats();
    p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * 0.5 + 5);
    this.score += this.wave * 25; this.addXp(10 + this.wave * 5);
    const weights = rarityWeightsForWave(this.wave);
    const nRewards = 2 + Math.floor(this.wave / 5);
    for (let i = 0; i < nRewards; i++) {
      const rarity = weightedPick(RARITY_ORDER, r => weights[r]);
      const mat = pick(materialsByRarity(rarity));
      const a = rand(0, TAU);
      this.spawnDrop(mat.id, p.x + Math.cos(a) * 2.5, p.y + Math.sin(a) * 2.5, 0);
    }
    this.rings.push({ x: p.x, y: p.y, maxR: 4, life: 0.8, maxLife: 0.8, color: '#4ade80', width: 0.15 });
    this.onEvent?.({ type: 'wavecleared' });
  }
  spawnPosition(radius) {
    const p = this.player; const H = this.arenaHalf;
    const vw = this.renderer.viewHalfW; const vh = this.renderer.viewHalfH;
    let x = 0; let y = 0;
    for (let tries = 0; tries < 18; tries++) {
      const a = rand(0, TAU); const c = Math.cos(a); const s = Math.sin(a);
      const exit = Math.min(vw / Math.max(1e-3, Math.abs(c)), vh / Math.max(1e-3, Math.abs(s)));
      const r = exit + rand(2.5, 6);
      x = clamp(p.x + c * r, -H + 1.5 + radius, H - 1.5 - radius);
      y = clamp(p.y + s * r, -H + 1.5 + radius, H - 1.5 - radius);
      const outside = Math.abs(x - p.x) > vw + 0.5 || Math.abs(y - p.y) > vh + 0.5;
      const clear = !this.obstacles.some(o => Math.hypot(o.x - x, o.y - y) < o.r + radius + 0.5);
      if (outside && clear) break;
    }
    return { x, y };
  }
  spawnEnemy(def) {
    const spec = this.waveSpec ?? buildWave(Math.max(1, this.wave));
    const elite = !def.boss && this.wave >= 3 && Math.random() < Math.min(0.18, 0.03 + this.wave * 0.01);
    const radius = def.radius * (elite ? 1.12 : 1);
    const { x, y } = this.spawnPosition(radius);
    const hpMul = def.boss ? 1 + 0.1 * (this.wave - 1) : spec.hpMul;
    const hp = def.hp * hpMul * (elite ? 2.2 : 1);
    const e = {
      id: this.nextId++, def, x, y, vx: 0, vy: 0, rot: rand(0, TAU), aim: 0, hp, maxHp: hp,
      speed: def.speed * spec.speedMul * (elite ? 1.05 : 1), damage: def.damage * spec.dmgMul * (elite ? 1.3 : 1), radius,
      state: 'attack', stateTimer: 0, prevState: 'attack', savedTimer: 0, dodgeX: 0, dodgeY: 0, dodgeCooldown: rand(0, 0.5),
      strafeDir: Math.random() < 0.5 ? -1 : 1, strafeTimer: rand(1, 3), retreatCount: 0, recentDamage: 0,
      fireCooldown: rand(0.6, 1.6), contactCooldown: 0, chargeTimer: rand(1, 3), charging: 0, hitFlash: 0,
      burn: null, slow: 0, slowPower: 0, dmgAccum: 0, dmgTextTimer: 0, dead: false, moveX: 0, moveY: 0, agility: 6,
      spawnTime: this.time, scaleIn: 0, elite, enraged: this.enrageAnnounced && !def.boss, los: true,
    };
    this.enemies.push(e); this.encountered.add(def.id);
    this.rings.push({ x, y, maxR: e.radius * 3, life: 0.6, maxLife: 0.6, color: elite ? '#fbbf24' : def.color, width: 0.1 });
      if (def.boss) {
      this.renderer.shake = Math.min(1.5, this.renderer.shake + 0.8);
      sfx.play('boss'); sfx.vibrate([60, 40, 120]);
    }
  }
  buildGrid() {
    this.grid.clear();
    const H = this.arenaHalf;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const cx = Math.floor((e.x + H) / this.CELL);
      const cy = Math.floor((e.y + H) / this.CELL);
      const key = cx * 4096 + cy;
      const arr = this.grid.get(key);
      if (arr) arr.push(e); else this.grid.set(key, [e]);
    }
  }
  queryGrid(x, y, out) {
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
  steerAroundObstacles(e) {
    const ml = Math.hypot(e.moveX, e.moveY);
    if (ml < 0.01) return;
    for (const o of this.obstacles) {
      const dx = o.x - e.x; const dy = o.y - e.y;
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
    if (nl > ml) { e.moveX *= ml / nl; e.moveY *= ml / nl; }
  }
  updateEnemies(dt) {
    const p = this.player;
    const ctx = { px: p.x, py: p.y, pvx: p.vx, pvy: p.vy, playerBullets: this.playerBulletsCache, arenaHalf: this.arenaHalf, time: this.time };
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
      e.x += e.vx * dt; e.y += e.vy * dt;
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
            if (Math.random() < dt * 3) this.burst(o.x, o.y, 1, '#2dd4bf', 0.08, 1.2, 'circle', 0.5);
          }
        }
      }
      e.dmgTextTimer -= dt;
      if (e.dmgAccum > 0 && e.dmgTextTimer <= 0) {
        if (this.showDamage) this.texts.push({ x: e.x + rand(-0.3, 0.3), y: e.y - e.radius - 0.2, vy: -1.4, text: `${Math.round(e.dmgAccum)}`, color: '#fef08a', life: 0.6, maxLife: 0.6, size: 0.3 });
        e.dmgAccum = 0; e.dmgTextTimer = 0.18;
      }
    }
    const buf = this.neighborBuf;
  }
  fireEnemy(e) {
    const def = e.def;
    const spd = def.bulletSpeed;
    const life = (def.range / spd) * 1.3 + 0.2;
    const muzzle = e.radius * 1.3;
    const color = e.elite ? '#fbbf24' : def.color;
    const shoot = (ang) => this.spawnBullet('enemy', e.x + Math.cos(ang) * muzzle, e.y + Math.sin(ang) * muzzle, ang, spd, e.damage, def.bulletSize * (e.elite ? 1.15 : 1), 1, life, color, [], { homing: def.homing });
    const inacc = (1 - def.accuracy) * 7 * DEG;
    switch (def.pattern) {
      case 'single': shoot(e.aim + (Math.random() - 0.5) * inacc * 2); break;
      case 'spread': {
        const n = def.bulletCount;
        for (let k = 0; k < n; k++) shoot(e.aim + (n > 1 ? (k / (n - 1) - 0.5) * def.bulletSpread * DEG : 0));
        break;
      }
      case 'radial': {
        const n = def.bulletCount;
        for (let k = 0; k < n; k++) shoot(e.rot + (k * TAU) / n);
        break;
      }
      case 'cross':
        for (let k = 0; k < 4; k++) shoot(e.rot + (k * Math.PI) / 2);
        break;
    }
  }
  updateBullets(dt) {
    const H = this.arenaHalf;
    const p = this.player;
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.homing) {
        let tx = NaN; let ty = NaN;
        if (b.owner === 'player') {
          let best = 49;
          for (const e of this.enemies) {
            if (e.dead || b.hit.has(e.id)) continue;
            const d2 = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
            if (d2 < best) { best = d2; tx = e.x; ty = e.y; }
          }
        } else if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < 144) { tx = p.x; ty = p.y; }
        if (!Number.isNaN(tx)) {
          const sp = Math.hypot(b.vx, b.vy); const cur = Math.atan2(b.vy, b.vx);
          let diff = Math.atan2(ty - b.y, tx - b.x) - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const hp = b.effects.find(e => e.kind === 'homing')?.power ?? 0.8;
          const rate = (b.owner === 'player' ? 3 + 3 * hp : 2.2) * dt;
          const na = cur + clamp(diff, -rate, rate);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 8;
      const lim = H - b.radius;
      if (Math.abs(b.x) > lim || Math.abs(b.y) > lim) {
        if (b.bounces > 0) {
          b.bounces--;
          if (Math.abs(b.x) > lim) { b.vx *= -1; b.x = clamp(b.x, -lim, lim); }
          if (Math.abs(b.y) > lim) { b.vy *= -1; b.y = clamp(b.y, -lim, lim); }
          b.hit.clear();
          this.burst(b.x, b.y, 3, b.color, 0.08, 3, 'circle', 0.25);
        } else { b.life = 0; }
      }
      if (b.life > 0) {
        for (const o of this.obstacles) {
          const dx = b.x - o.x; const dy = b.y - o.y;
          const rr = o.r + b.radius;
          if (dx * dx + dy * dy < rr * rr) {
            const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const nx = dx / d; const ny = dy / d;
            if (b.bounces > 0) {
              b.bounces--;
              const vn = b.vx * nx + b.vy * ny;
              b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
              b.x = o.x + nx * (rr + 0.02); b.y = o.y + ny * (rr + 0.02);
              b.hit.clear();
            } else { b.life = 0; }
            this.burst(b.x, b.y, 3, b.color, 0.07, 3, 'circle', 0.2);
            break;
          }
        }
      }
      if (b.rocket) {
        b.trailTimer -= dt;
        if (b.trailTimer <= 0) {
          b.trailTimer = 0.03;
          const sp = Math.hypot(b.vx, b.vy) || 1;
          this.particles.push({ x: b.x - (b.vx / sp) * b.radius * 1.6, y: b.y - (b.vy / sp) * b.radius * 1.6, vx: -b.vx * 0.2 + rand(-1, 1), vy: -b.vy * 0.2 + rand(-1, 1), life: 0.35, maxLife: 0.35, color: Math.random() < 0.5 ? '#fb923c' : '#fde68a', size: b.radius * 0.7, shape: 'circle', rot: 0, rotV: 0 });
        }
      }
    }
  }

    for (const e of this.enemies) {
      if (e.dead) continue;
      this.queryGrid(e.x, e.y, buf);
      for (const o of buf) {
        if (o.id <= e.id || o.dead) continue;
        const dx = o.x - e.x; const dy = o.y - e.y;
        const rr = e.radius + o.radius; const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2); const push = (rr - d) * 0.5;
          const nx = dx / d; const ny = dy / d;
          const me = e.radius * e.radius; const mo = o.radius * o.radius; const tot = me + mo;
          e.x -= nx * push * (mo / tot); e.y -= ny * push * (mo / tot);
          o.x += nx * push * (me / tot); o.y += ny * push * (me / tot);
        }
      }
    }
  }
  handleCollisions() {
    const p = this.player;
    const dmgMul = this.waveSpec?.dmgMul ?? 1;
    const buf = this.collBuf;
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (b.owner === 'player') {
        this.queryGrid(b.x, b.y, buf);
        for (const e of buf) {
          if (e.dead || b.hit.has(e.id)) continue;
          const rr = e.radius + b.radius;
          const dx = e.x - b.x; const dy = e.y - b.y;
          if (dx * dx + dy * dy < rr * rr) {
            b.hit.add(e.id);
            const sp = Math.hypot(b.vx, b.vy) || 1;
            this.hitEnemy(e, b.damage, b.effects, b.vx / sp, b.vy / sp, { bullet: b, noFragment: b.isFragment, noChain: b.isFragment, noExplode: b.isFragment, crit: b.crit });
            this.burst(b.x, b.y, 3, b.color, 0.07, 4, 'circle', 0.25);
            sfx.play('hit');
            b.pierce--; b.damage *= 0.9;
            if (b.pierce <= 0) { b.life = 0; break; }
          }
        }
      } else {
        const rr = p.radius + b.radius;
        const dx = p.x - b.x; const dy = p.y - b.y;
        if (dx * dx + dy * dy < rr * rr && !this.gameOver) {
          if (p.invuln > 0) { this.burst(b.x, b.y, 3, '#67e8f9', 0.07, 3, 'circle', 0.2); }
          else { this.damagePlayer(b.damage); this.burst(b.x, b.y, 5, b.color, 0.08, 4, 'circle', 0.3); }
          b.life = 0;
        }
      }
    }
    for (const e of this.enemies) {
      if (e.dead || e.scaleIn < 1) continue;
      const rr = e.radius + p.radius;
      const dx = p.x - e.x; const dy = p.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d; const ny = dy / d;
        const overlap = rr - d;
        p.x += nx * overlap * 0.6; p.y += ny * overlap * 0.6;
        e.x -= nx * overlap * 0.4; e.y -= ny * overlap * 0.4;
        if (e.contactCooldown <= 0) {
          e.contactCooldown = 0.6;
          if (p.invuln <= 0) this.damagePlayer(e.def.contactDamage * dmgMul * (e.elite ? 1.3 : 1));
          this.damageEnemy(e, p.bodyDamage * (p.dashTime > 0 ? 2.5 : 1), true);
          p.vx += nx * 7; p.vy += ny * 7;
          e.vx -= nx * 3; e.vy -= ny * 3;
          this.burst((p.x + e.x) / 2, (p.y + e.y) / 2, 6, '#fca5a5', 0.08, 4, 'square', 0.3);
        }
      }
    }
    for (const b of this.bullets) {
      if (b.life <= 0 && b.owner === 'player' && !b.exploded) {
        const ex = b.effects.find(e => e.kind === 'explosive');
        if (ex) {
          b.exploded = true;
          this.explode(b.x, b.y, 1 + 0.6 * ex.power, b.damage * (0.6 + 0.3 * ex.power), b.color, null);
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
  }
  hitEnemy(e, dmg, effects, dirX, dirY, opts) {
    if (e.dead) return;
    let kb = 1.2;
    for (const ef of effects) {
      switch (ef.kind) {
        case 'burn': e.burn = { dps: Math.max(e.burn?.dps ?? 0, dmg * 0.4 * ef.power), time: 3 }; break;
        case 'slow': e.slow = 2; e.slowPower = clamp(0.4 * ef.power, 0.2, 0.6); break;
        case 'knockback': kb += 5 * ef.power; break;
        case 'lifesteal': this.healPlayer(dmg * (0.04 + 0.04 * ef.power), '#a855f7'); break;
        case 'chain': if (!opts.noChain) this.chain(e, dmg * 0.5, 1 + Math.round(ef.power), ef.power); break;
        case 'explosive': if (!opts.noExplode && !opts.bullet?.exploded) { if (opts.bullet) opts.bullet.exploded = true; this.explode(e.x, e.y, 1 + 0.6 * ef.power, dmg * (0.6 + 0.3 * ef.power), opts.bullet?.color ?? this.weapon.color, e); } break;
        case 'fragment':
          if (!opts.noFragment) {
            const n = 3 + Math.round(ef.power);
            for (let i = 0; i < n; i++) {
              const a = rand(0, TAU);
              const fr = Math.max(0.09, (opts.bullet?.radius ?? 0.2) * 0.55);
              const fb = this.spawnBullet('player', e.x + Math.cos(a) * (e.radius + fr + 0.2), e.y + Math.sin(a) * (e.radius + fr + 0.2), a, 9, dmg * 0.4, fr, 1, 0.45, opts.bullet?.color ?? this.weapon.color, [], { fragment: true });
              fb.hit.add(e.id);
            }
          }
          break;
      }
    }
    if (this.mods.lifesteal > 0) this.healPlayer(dmg * this.mods.lifesteal, '#a855f7');
    const mass = Math.max(0.2, e.radius * e.radius * 4);
    e.vx += (dirX * kb) / mass; e.vy += (dirY * kb) / mass;
    if (opts.crit) {
      if (this.showDamage) this.texts.push({ x: e.x + rand(-0.3, 0.3), y: e.y - e.radius - 0.4, vy: -1.6, text: `${Math.round(dmg)}`, color: '#fb923c', life: 0.7, maxLife: 0.7, size: 0.42 });
      this.damageEnemy(e, dmg, true, true);
    } else {
      this.damageEnemy(e, dmg, true);
    }
  }
  healPlayer(amount, color) {
    const p = this.player;
    if (p.hp >= p.maxHp) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    if (Math.random() < 0.3) this.burst(p.x, p.y, 1, color, 0.08, 1.5, 'circle', 0.5);
  }
  chain(from, dmg, jumps, power) {
    let cur = from; const visited = new Set([from.id]);
    for (let j = 0; j < jumps; j++) {
      let best = null; let bd = 3.5 * 3.5;
      for (const o of this.enemies) {
        if (o.dead || visited.has(o.id)) continue;
        const d2 = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
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
      this.lightnings.push({ points: pts, life: 0.15, maxLife: 0.15, color: '#38bdf8' });
      this.damageEnemy(best, dmg * (0.8 + 0.2 * power), true);
      cur = best;
    }
  }
  explode(x, y, radius, dmg, color, exclude) {
    for (const e of this.enemies) {
      if (e.dead || e === exclude) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < radius + e.radius) {
        const fall = 1 - 0.5 * (d / (radius + e.radius));
        this.damageEnemy(e, dmg * fall, true);
        const nx = (e.x - x) / (d || 1); const ny = (e.y - y) / (d || 1);
        e.vx += nx * 4; e.vy += ny * 4;
      }
    }
    this.rings.push({ x, y, maxR: radius, life: 0.3, maxLife: 0.3, color, width: 0.15 });
    this.burst(x, y, 10, color, 0.12, 6, 'circle', 0.4);
    this.burst(x, y, 5, '#fde68a', 0.1, 5, 'circle', 0.3);
    this.renderer.shake = Math.min(0.6, this.renderer.shake + 0.06 * radius);
    if (Math.random() < 0.5) sfx.play('explosion');
  }
  damageEnemy(e, amount, flash, silent = false) {
    if (e.dead) return;
    e.hp -= amount; e.recentDamage += amount;
    if (!silent) e.dmgAccum += amount;
    if (flash) e.hitFlash = 1;
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    e.dead = true;
    const def = e.def;
    this.kills++; this.killsByType[def.id] = (this.killsByType[def.id] ?? 0) + 1;
    this.combo++; this.comboTimer = 2.5;
    const basePts = Math.round(def.score * (1 + this.wave * 0.05) * (e.elite ? 3 : 1));
    this.score += Math.round(basePts * this.comboMult);
    this.addXp(def.score * (e.elite ? 2 : 1) * (def.boss ? 1.5 : 1));
    this.burst(e.x, e.y, Math.round(8 + e.radius * 12), e.elite ? '#fbbf24' : def.color, 0.12 + e.radius * 0.08, 5 + e.radius * 2, 'shard', 0.6);
    this.rings.push({ x: e.x, y: e.y, maxR: e.radius * 2.2, life: 0.35, maxLife: 0.35, color: def.color, width: 0.1 });
    this.spawnDrops(e);
    sfx.play('kill', def.boss ? 0.4 : e.elite ? 0.7 : 1 + Math.random() * 0.3);
    if (def.boss) {
      this.renderer.shake = Math.min(2, this.renderer.shake + 1.5);
      this.score += 500;
      sfx.play('explosion');
      sfx.vibrate([80, 50, 80, 50, 200]);
    }
  }
  damagePlayer(amount) {
    if (this.gameOver) return;
    const p = this.player;
    p.hp -= amount; p.lastDamageTime = this.time; p.hitFlash = 1;
    this.renderer.shake = Math.min(1.2, this.renderer.shake + amount / 50);
    sfx.play('hurt'); sfx.vibrate(amount > 15 ? 40 : 20);
    if (p.hp <= 0) { p.hp = 0; this.endGame(); }
  }
  endGame() {
    this.gameOver = true;
    this.burst(this.player.x, this.player.y, 40, '#38bdf8', 0.15, 7, 'shard', 1.2);
    this.rings.push({ x: this.player.x, y: this.player.y, maxR: 3, life: 0.8, maxLife: 0.8, color: '#38bdf8', width: 0.2 });
    this.onEvent?.({ type: 'gameover' });
    this.onUi?.(this.getSnapshot());
  }
  addXp(n) {
    this.xp += n; let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++; this.pendingLevelUps++; leveled = true;
    }
    if (leveled) {
      this.rings.push({ x: this.player.x, y: this.player.y, maxR: 2.2, life: 0.6, maxLife: 0.6, color: '#fbbf24', width: 0.15 });
      this.burst(this.player.x, this.player.y, 14, '#fde68a', 0.1, 5, 'circle', 0.6);
      sfx.play('levelup');
      if (!this.levelUpOptions) {
        this.levelUpOptions = rollUpgrades(this.upgradeCounts);
        this.onEvent?.({ type: 'levelup' });
      }
    }
  }
  applyUpgrade(id) {
    const u = UPGRADE_BY_ID[id];
    if (u && this.pendingLevelUps > 0) {
      u.apply(this.mods);
      this.upgradeCounts[id] = (this.upgradeCounts[id] ?? 0) + 1;
      this.pendingLevelUps--;
      this.recomputeStats();
      if (id === 'vigor') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    }
    if (this.pendingLevelUps > 0) {
      this.levelUpOptions = rollUpgrades(this.upgradeCounts);
      return 'more';
    }
    this.levelUpOptions = null;
    return 'done';
  }
