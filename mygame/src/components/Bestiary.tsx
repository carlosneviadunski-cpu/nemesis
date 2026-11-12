import { useMemo, useRef, useState } from "react";
import { ENEMY_DEFS } from "../game/enemies";
import { MATERIALS, RARITY_META } from "../game/materials";
import type { EnemyDef } from "../game/types";
import { fmt } from "../game/utils";
import { cn } from "../utils/cn";
import { EnemyPreview } from "./EnemyPreview";
import { ShapeIcon } from "./ShapeIcon";

interface Props {
  kills: Record<string, number>;
  encountered: Set<string>;
  currentWave: number;
  onClose: () => void;
}

const MAXES = {
  hp: Math.max(...ENEMY_DEFS.map((d) => d.hp)),
  damage: Math.max(...ENEMY_DEFS.map((d) => Math.max(d.damage, d.contactDamage))),
  speed: Math.max(...ENEMY_DEFS.map((d) => d.speed)),
  range: Math.max(...ENEMY_DEFS.map((d) => d.range)),
  fireRate: Math.max(...ENEMY_DEFS.map((d) => d.fireRate)),
};

function Bar({ label, value, max, display, color }: { label: string; value: number; max: number; display: string; color: string }) {
  return (
    <div className="text-[11px]">
      <div className="flex justify-between text-white/60">
        <span>{label}</span>
        <span className="font-mono text-white">{display}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function Detail({ def, kills, seen }: { def: EnemyDef; kills: number; seen: boolean }) {
  const ranged = def.pattern !== "none";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4">
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
          <div className="absolute inset-0 rounded-2xl opacity-30 blur-2xl" style={{ background: def.color }} />
          <EnemyPreview def={def} size={124} animate dim={!seen} className="relative" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{def.boss ? "Chefe" : `Aparece a partir da onda ${def.minWave}`}</div>
          <h3 className="truncate text-2xl font-black text-white">{def.name}</h3>
          <div className="text-sm text-white/60">{def.title}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1 text-xs">
            <span className="text-white/50">Derrotados</span>
            <span className="font-mono text-lg font-bold" style={{ color: def.color }}>
              {fmt(kills)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2">
        <Bar label="Vida" value={def.hp} max={MAXES.hp} display={fmt(def.hp)} color="#4ade80" />
        <Bar label={ranged ? "Dano (projétil)" : "Dano (colisão)"} value={ranged ? def.damage : def.contactDamage} max={MAXES.damage} display={fmt(ranged ? def.damage : def.contactDamage)} color="#f87171" />
        <Bar label="Velocidade" value={def.speed} max={MAXES.speed} display={`${fmt(def.speed, 1)} b/s`} color="#38bdf8" />
        <Bar label="Alcance" value={def.range} max={MAXES.range} display={ranged ? `${fmt(def.range)} blocos` : "Corpo a corpo"} color="#c084fc" />
        <Bar label="Cadência" value={def.fireRate} max={MAXES.fireRate} display={ranged ? `${fmt(def.fireRate, 1)} /s` : "—"} color="#fbbf24" />
        <Bar label="Dano de contato" value={def.contactDamage} max={MAXES.damage} display={fmt(def.contactDamage)} color="#fb923c" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-2">
          <div className="text-[9px] uppercase tracking-wider text-rose-300">Atacar</div>
          <div className="font-semibold text-white">Dist. {def.preferredRange > 0 ? `${def.preferredRange} b` : "0 (investida)"}</div>
          <div className="text-white/50">{def.orbit ? "orbita o alvo" : def.pattern === "none" ? "investidas periódicas" : "movimento lateral"}</div>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-2">
          <div className="text-[9px] uppercase tracking-wider text-amber-300">Recuar</div>
          <div className="font-semibold text-white">Vida &lt; {Math.round(def.retreatThreshold * 100)}%</div>
          <div className="text-white/50">ou dano súbito &gt; 30%</div>
        </div>
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-2">
          <div className="text-[9px] uppercase tracking-wider text-cyan-300">Esquivar</div>
          <div className="font-semibold text-white">{Math.round(def.dodgeSkill * 100)}% reflexo</div>
          <div className="text-white/50">{def.dodgeSkill >= 0.6 ? "mestre da esquiva" : def.dodgeSkill >= 0.3 ? "desvia com frequência" : def.dodgeSkill > 0 ? "raramente desvia" : "nunca desvia"}</div>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-white/75">{def.behavior}</p>
      <div className="mt-2 text-[10px] text-white/40">
        Anatomia:{" "}
        {def.pattern === "none"
          ? "lâmina frontal (investida)"
          : def.pattern === "spread"
            ? `${def.bulletCount} canos em leque`
            : def.pattern === "radial"
              ? `${def.bulletCount} canos radiais`
              : def.pattern === "cross"
                ? "4 canos em cruz"
                : def.homing
                  ? "casulos lançadores teleguiados"
                  : def.healer
                    ? "antena de reparo"
                    : def.fireRate >= 3
                      ? "cano de metralhadora"
                      : def.range >= 12
                        ? "cano longo de precisão (alcance alto, cadência baixa)"
                        : "cano padrão"}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">Materiais que solta</div>
        <div className="flex flex-wrap gap-1.5">
          {def.drops.map((d) => {
            const m = MATERIALS[d.material];
            const rc = RARITY_META[m.rarity].color;
            return (
              <div key={d.material} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]" style={{ borderColor: `${rc}55`, background: `${rc}12` }}>
                <ShapeIcon shape={m.shape} color={m.color} size={16} />
                <span className="text-white/85">{m.name}</span>
                <span className="font-mono text-white/45">{Math.round(d.chance * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-auto pt-3 text-[11px] text-white/40">
        Pontos: <span className="font-mono text-white/70">{def.score}</span> · Custo de onda: <span className="font-mono text-white/70">{def.cost}</span> · Tamanho:{" "}
        <span className="font-mono text-white/70">{fmt(def.radius * 2, 1)} blocos</span>
      </div>
    </div>
  );
}

export function Bestiary({ kills, encountered, currentWave, onClose }: Props) {
  const [selected, setSelected] = useState<string>(ENEMY_DEFS[0].id);
  const detailRef = useRef<HTMLDivElement>(null);
  const def = useMemo(() => ENEMY_DEFS.find((d) => d.id === selected) ?? ENEMY_DEFS[0], [selected]);
  const select = (id: string) => {
    setSelected(id);
    if (window.innerWidth < 768) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const totalKills = Object.values(kills).reduce((a, b) => a + b, 0);
  const seenCount = ENEMY_DEFS.filter((d) => encountered.has(d.id)).length;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-3" onClick={onClose}>
      <div className="flex h-full max-h-[780px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              <span className="text-pink-400">◆</span> Bestiário
            </h2>
            <div className="text-[11px] text-white/50">
              {seenCount}/{ENEMY_DEFS.length} espécies encontradas · {fmt(totalKills)} abates totais
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
            Fechar <kbd className="ml-1 hidden rounded bg-white/10 px-1 font-mono sm:inline">B</kbd>
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[1.1fr_1fr] md:overflow-hidden">
          <div className="p-3 md:min-h-0 md:overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
              {ENEMY_DEFS.map((d) => {
                const seen = encountered.has(d.id);
                const k = kills[d.id] ?? 0;
                const upcoming = !seen && d.minWave > currentWave;
                return (
                  <button
                    key={d.id}
                    onClick={() => select(d.id)}
                    className={cn(
                      "group relative flex flex-col items-center rounded-xl border p-2.5 text-center transition",
                      selected === d.id ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                    )}
                  >
                    {d.boss && <span className="absolute left-1.5 top-1.5 rounded bg-rose-500/30 px-1 text-[9px] font-bold text-rose-200">CHEFE</span>}
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 font-mono text-[10px] text-white/80">{k}</span>
                    <EnemyPreview def={d} size={56} dim={!seen} className="my-0.5 transition group-hover:scale-110" />
                    <div className={cn("w-full truncate text-[11px] font-semibold", seen ? "text-white" : "text-white/50")}>{d.name}</div>
                    <div className="text-[9px] text-white/40">{seen ? d.title : upcoming ? `Onda ${d.minWave}+` : "Não encontrado"}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div ref={detailRef} className="border-t border-white/10 p-4 md:min-h-0 md:overflow-y-auto md:border-l md:border-t-0">
            <Detail def={def} kills={kills[def.id] ?? 0} seen={encountered.has(def.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
