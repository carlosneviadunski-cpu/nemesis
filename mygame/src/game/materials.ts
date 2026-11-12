import type { EffectKind, MaterialDef, Rarity, WeaponStatKey } from "./types";

export const RARITY_META: Record<Rarity, { label: string; color: string; power: number; order: number }> = {
  common: { label: "Comum", color: "#9ca3af", power: 1.0, order: 0 },
  uncommon: { label: "Incomum", color: "#4ade80", power: 1.2, order: 1 },
  rare: { label: "Raro", color: "#60a5fa", power: 1.45, order: 2 },
  epic: { label: "Épico", color: "#c084fc", power: 1.75, order: 3 },
  legendary: { label: "Lendário", color: "#fbbf24", power: 2.2, order: 4 },
};

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const STAT_META: Record<WeaponStatKey, { label: string; short: string; unit: string; higherIsBetter: boolean }> = {
  damage: { label: "Dano", short: "DMG", unit: "", higherIsBetter: true },
  rpm: { label: "Cadência", short: "RPM", unit: " rpm", higherIsBetter: true },
  bulletSpeed: { label: "Vel. Projétil", short: "VEL", unit: " b/s", higherIsBetter: true },
  spread: { label: "Dispersão", short: "DISP", unit: "°", higherIsBetter: false },
  bulletSize: { label: "Tamanho", short: "TAM", unit: " b", higherIsBetter: true },
  pierce: { label: "Perfuração", short: "PERF", unit: "", higherIsBetter: true },
  range: { label: "Alcance", short: "ALC", unit: " b", higherIsBetter: true },
  count: { label: "Projéteis", short: "PROJ", unit: "", higherIsBetter: true },
};

export const EFFECT_META: Record<EffectKind, { label: string; desc: string; color: string; epithet: { m: string; f: string } }> = {
  burn: { label: "Incendiário", desc: "Inimigos atingidos queimam por 3s.", color: "#fb923c", epithet: { m: "Ardente", f: "Ardente" } },
  slow: { label: "Criogênico", desc: "Reduz a velocidade dos inimigos atingidos.", color: "#67e8f9", epithet: { m: "Gélido", f: "Gélida" } },
  homing: { label: "Teleguiado", desc: "Projéteis perseguem o inimigo mais próximo.", color: "#4ade80", epithet: { m: "Rastreador", f: "Rastreadora" } },
  ricochet: { label: "Ricochete", desc: "Projéteis quicam nas paredes da arena.", color: "#e2e8f0", epithet: { m: "Saltitante", f: "Saltitante" } },
  explosive: { label: "Explosivo", desc: "Explosão em área ao atingir o alvo.", color: "#f87171", epithet: { m: "Explosivo", f: "Explosiva" } },
  chain: { label: "Elétrico", desc: "O dano salta para inimigos próximos.", color: "#38bdf8", epithet: { m: "Tempestuoso", f: "Tempestuosa" } },
  lifesteal: { label: "Vampírico", desc: "Recupera vida com base no dano causado.", color: "#a855f7", epithet: { m: "Vampírico", f: "Vampírica" } },
  fragment: { label: "Fragmentador", desc: "Projéteis se dividem em estilhaços ao atingir.", color: "#f0abfc", epithet: { m: "Fractal", f: "Fractal" } },
  knockback: { label: "Impacto", desc: "Empurra fortemente os inimigos atingidos.", color: "#fde68a", epithet: { m: "Impactante", f: "Impactante" } },
};

export const MATERIALS: Record<string, MaterialDef> = {
  iron: {
    id: "iron", name: "Sucata de Ferro", rarity: "common", color: "#9aa3ad", shape: "square",
    desc: "Metal bruto e pesado. Projéteis mais robustos.",
    epithet: { m: "de Ferro", f: "de Ferro" },
    affinity: { damage: 0.12, bulletSize: 0.15, bulletSpeed: -0.05 },
    bias: { cannon: 2, twin: 1 },
  },
  gunpowder: {
    id: "gunpowder", name: "Pólvora Negra", rarity: "common", color: "#d97706", shape: "triangle",
    desc: "Queima rápido. Aumenta a cadência de tiro.",
    epithet: { m: "de Pólvora", f: "de Pólvora" },
    affinity: { rpm: 0.2, spread: 0.15, damage: -0.04 },
    bias: { machinegun: 2.6, burst: 1.2 },
  },
  lens: {
    id: "lens", name: "Lente de Vidro", rarity: "common", color: "#a5f3fc", shape: "circle",
    desc: "Foco óptico. Mais precisão e velocidade de projétil.",
    epithet: { m: "Óptico", f: "Óptica" },
    affinity: { bulletSpeed: 0.18, spread: -0.25, range: 0.1 },
    bias: { sniper: 2.2, burst: 0.8 },
  },
  lead: {
    id: "lead", name: "Cartucho de Chumbo", rarity: "common", color: "#6b7280", shape: "hexagon",
    desc: "Munição fracionada. Mais projéteis por disparo.",
    epithet: { m: "de Chumbo", f: "de Chumbo" },
    affinity: { count: 0.3, spread: 0.3, range: -0.1 },
    bias: { shotgun: 2.6, flak: 0.8 },
  },
  spring: {
    id: "spring", name: "Mola de Aço", rarity: "uncommon", color: "#7dd3fc", shape: "diamond",
    desc: "Mecanismo de retorno rápido. Cadência e velocidade.",
    epithet: { m: "Retrátil", f: "Retrátil" },
    affinity: { rpm: 0.15, bulletSpeed: 0.12 },
    bias: { burst: 2.4, twin: 1.6 },
  },
  carbon: {
    id: "carbon", name: "Fibra de Carbono", rarity: "uncommon", color: "#475569", shape: "bar",
    desc: "Cano leve e longo. Alcance e estabilidade.",
    epithet: { m: "de Carbono", f: "de Carbono" },
    affinity: { range: 0.25, spread: -0.2, bulletSpeed: 0.08 },
    bias: { sniper: 1.4, burst: 1.2, laser: 0.8 },
  },
  fuel: {
    id: "fuel", name: "Célula de Combustível", rarity: "uncommon", color: "#f97316", shape: "pentagon",
    desc: "Propelente volátil. Projéteis maiores e incendiários.",
    epithet: { m: "Ígneo", f: "Ígnea" },
    affinity: { damage: 0.15, bulletSize: 0.25, rpm: -0.1 },
    bias: { rocket: 2.4, cannon: 0.6 },
    effect: "burn",
  },
  gear: {
    id: "gear", name: "Engrenagem de Bronze", rarity: "uncommon", color: "#ca8a04", shape: "octagon",
    desc: "Mecanismo de múltiplos canos sincronizados.",
    epithet: { m: "Mecânico", f: "Mecânica" },
    affinity: { rpm: 0.1, pierce: 0.3, count: 0.1 },
    bias: { multicannon: 2.6, twin: 1.0 },
  },
  plasma: {
    id: "plasma", name: "Cristal de Plasma", rarity: "rare", color: "#e879f9", shape: "hexagram",
    desc: "Energia pura condensada. Dano e velocidade; queima.",
    epithet: { m: "Plasmático", f: "Plasmática" },
    affinity: { damage: 0.22, bulletSpeed: 0.2, bulletSize: -0.1 },
    bias: { laser: 2.4, sniper: 0.6 },
    effect: "burn",
  },
  cryo: {
    id: "cryo", name: "Núcleo Criogênico", rarity: "rare", color: "#67e8f9", shape: "star6",
    desc: "Frio absoluto. Projéteis grandes que congelam alvos.",
    epithet: { m: "Criogênico", f: "Criogênica" },
    affinity: { bulletSize: 0.3, damage: 0.1, bulletSpeed: -0.1 },
    bias: { cannon: 1.8, flak: 1.4 },
    effect: "slow",
  },
  chip: {
    id: "chip", name: "Chip de Guiagem", rarity: "rare", color: "#4ade80", shape: "cross",
    desc: "Circuito de rastreamento. Projéteis teleguiados.",
    epithet: { m: "Guiado", f: "Guiada" },
    affinity: { range: 0.3, spread: -0.15 },
    bias: { rocket: 1.8, multicannon: 1.4 },
    effect: "homing",
  },
  titanium: {
    id: "titanium", name: "Liga de Titânio", rarity: "rare", color: "#cbd5e1", shape: "heptagon",
    desc: "Liga ultrarresistente. Perfuração e dano.",
    epithet: { m: "de Titânio", f: "de Titânio" },
    affinity: { pierce: 0.6, damage: 0.18 },
    bias: { sniper: 1.8, cannon: 1.2 },
  },
  mercury: {
    id: "mercury", name: "Esfera de Mercúrio", rarity: "epic", color: "#e2e8f0", shape: "circle",
    desc: "Metal líquido instável. Projéteis ricocheteiam.",
    epithet: { m: "Mercurial", f: "Mercurial" },
    affinity: { bulletSpeed: 0.2, range: 0.3, rpm: 0.1 },
    bias: { twin: 2.2, flak: 1.4 },
    effect: "ricochet",
  },
  catalyst: {
    id: "catalyst", name: "Catalisador Volátil", rarity: "epic", color: "#ef4444", shape: "triangle",
    desc: "Reage violentamente. Explosões em área.",
    epithet: { m: "Volátil", f: "Volátil" },
    affinity: { damage: 0.3, bulletSize: 0.2, rpm: -0.1 },
    bias: { rocket: 2.6, flak: 1.2 },
    effect: "explosive",
  },
  tesla: {
    id: "tesla", name: "Bobina de Tesla", rarity: "epic", color: "#38bdf8", shape: "star5",
    desc: "Descarga elétrica que salta entre inimigos.",
    epithet: { m: "Elétrico", f: "Elétrica" },
    affinity: { rpm: 0.25, bulletSpeed: 0.15 },
    bias: { machinegun: 2.2, laser: 1.4 },
    effect: "chain",
  },
  prism: {
    id: "prism", name: "Prisma Fractal", rarity: "epic", color: "#f0abfc", shape: "diamond",
    desc: "Divide a luz — e os projéteis — em estilhaços.",
    epithet: { m: "Prismático", f: "Prismática" },
    affinity: { count: 0.35, pierce: 0.2 },
    bias: { shotgun: 2.4, flak: 1.6 },
    effect: "fragment",
  },
  void: {
    id: "void", name: "Essência do Vazio", rarity: "legendary", color: "#7c3aed", shape: "ring",
    desc: "Matéria de outro plano. Drena vida; perfura tudo.",
    epithet: { m: "do Vazio", f: "do Vazio" },
    affinity: { damage: 0.3, pierce: 0.8, range: 0.2 },
    bias: { laser: 2.0, sniper: 1.8, twin: 1.0 },
    effect: "lifesteal",
  },
  starheart: {
    id: "starheart", name: "Coração Estelar", rarity: "legendary", color: "#fbbf24", shape: "star5",
    desc: "Núcleo de uma estrela. Potência colossal e impacto.",
    epithet: { m: "Estelar", f: "Estelar" },
    affinity: { damage: 0.4, bulletSize: 0.25, rpm: 0.15, bulletSpeed: 0.1 },
    bias: { cannon: 2.0, rocket: 1.6, multicannon: 1.2 },
    effect: "knockback",
  },
};

export const MATERIAL_LIST: MaterialDef[] = Object.values(MATERIALS).sort(
  (a, b) => RARITY_META[a.rarity].order - RARITY_META[b.rarity].order || a.name.localeCompare(b.name),
);

export function materialsByRarity(r: Rarity) {
  return MATERIAL_LIST.filter((m) => m.rarity === r);
}

/** Total de receitas distintas (multiconjuntos de 3, 4 e 5 materiais). */
export function totalRecipeCount() {
  const n = MATERIAL_LIST.length;
  const comb = (a: number, b: number) => {
    let r = 1;
    for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i;
    return Math.round(r);
  };
  return comb(n + 2, 3) + comb(n + 3, 4) + comb(n + 4, 5);
}
