import { EFFECT_META, MATERIALS, RARITY_META, STAT_META } from "../game/materials";
import type { Weapon, WeaponStatKey } from "../game/types";
import { fmt, roman } from "../game/utils";
import { ARCHETYPE_META } from "../game/weapons";
import { cn } from "../utils/cn";
import { ShapeIcon } from "./ShapeIcon";
import { WeaponPreview } from "./WeaponPreview";

const STAT_MAX: Record<WeaponStatKey, number> = {
  damage: 160,
  rpm: 700,
  bulletSpeed: 30,
  spread: 40,
  bulletSize: 0.6,
  pierce: 8,
  range: 24,
  count: 10,
};

const STAT_ORDER: WeaponStatKey[] = ["damage", "rpm", "bulletSpeed", "spread", "bulletSize", "pierce", "range", "count"];

export function TierStars({ tier, className }: { tier: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} title={`Tier ${tier}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("text-[11px] leading-none", i <= tier ? "text-amber-300" : "text-white/15")}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatStat(k: WeaponStatKey, v: number) {
  if (k === "bulletSize") return fmt(v, 2);
  if (k === "damage" || k === "bulletSpeed" || k === "range" || k === "spread") return fmt(v, 1);
  return fmt(v);
}

export function StatBars({ weapon, compact }: { weapon: Weapon; compact?: boolean }) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1.5", compact ? "grid-cols-1" : "grid-cols-2")}>
      {STAT_ORDER.map((k) => {
        const v = weapon.stats[k];
        const meta = STAT_META[k];
        const ratio = Math.min(1, v / STAT_MAX[k]);
        const bad = !meta.higherIsBetter;
        return (
          <div key={k} className="text-[11px]">
            <div className="flex items-center justify-between text-white/70">
              <span>{meta.label}</span>
              <span className="font-mono text-white">
                {formatStat(k, v)}
                <span className="text-white/40">{meta.unit}</span>
              </span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn("h-full rounded-full transition-all", bad ? "bg-amber-400/80" : "bg-sky-400")}
                style={{ width: `${Math.max(3, ratio * 100)}%`, background: bad ? undefined : `linear-gradient(90deg, ${weapon.color}99, ${weapon.color})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EffectChips({ weapon, size = "sm" }: { weapon: Weapon; size?: "sm" | "xs" }) {
  if (!weapon.effects.length) return <span className="text-[11px] text-white/35">Sem efeitos especiais</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {weapon.effects.map((e) => {
        const m = EFFECT_META[e.kind];
        return (
          <span
            key={e.kind}
            title={`${m.desc} (potência ${fmt(e.power * 100)}%)`}
            className={cn("rounded-full border px-2 font-semibold", size === "sm" ? "py-0.5 text-[11px]" : "py-px text-[10px]")}
            style={{ borderColor: `${m.color}66`, background: `${m.color}1f`, color: m.color }}
          >
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

interface CardProps {
  weapon: Weapon;
  equipped?: boolean;
  onEquip?: () => void;
  onDiscard?: () => void;
  highlight?: boolean;
  showRecipe?: boolean;
}

export function WeaponCard({ weapon, equipped, onEquip, onDiscard, highlight, showRecipe = true }: CardProps) {
  const arch = ARCHETYPE_META[weapon.archetype];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-[#0f141d]/90 p-4 transition",
        highlight ? "border-amber-300/60 shadow-[0_0_40px_-10px_rgba(251,191,36,0.6)]" : equipped ? "border-sky-400/60" : "border-white/10",
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: weapon.color }} />
      <div className="flex gap-4">
        <WeaponPreview weapon={weapon} size={116} className="shrink-0 rounded-xl bg-black/30" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white">{weapon.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                <span className="font-mono">{weapon.model}</span>
                <span>·</span>
                <span>{arch.name}</span>
                <span>·</span>
                <TierStars tier={weapon.tier} />
                <span className="font-semibold text-white/70">Tier {roman(weapon.tier)}</span>
              </div>
            </div>
            {equipped && <span className="shrink-0 rounded-md bg-sky-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">Equipada</span>}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-white/55">{arch.desc}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span className="text-white/50">DPS </span>
              <span className="font-mono font-bold text-emerald-300">{fmt(weapon.dps)}</span>
            </div>
            <EffectChips weapon={weapon} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <StatBars weapon={weapon} />
      </div>
      {showRecipe && weapon.recipe.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Receita</span>
          <div className="flex gap-1">
            {weapon.recipe.map((id, i) => {
              const m = MATERIALS[id];
              return (
                <span key={i} title={m?.name} className="rounded-md border p-0.5" style={{ borderColor: `${RARITY_META[m.rarity].color}66`, background: `${RARITY_META[m.rarity].color}14` }}>
                  <ShapeIcon shape={m.shape} color={m.color} size={18} />
                </span>
              );
            })}
          </div>
        </div>
      )}
      {(onEquip || onDiscard) && (
        <div className="mt-3 flex gap-2">
          {onEquip && (
            <button
              onClick={onEquip}
              disabled={equipped}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-bold transition",
                equipped ? "cursor-default bg-white/5 text-white/40" : "bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98]",
              )}
            >
              {equipped ? "Equipada" : "Equipar"}
            </button>
          )}
          {onDiscard && (
            <button onClick={onDiscard} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:border-rose-400/50 hover:text-rose-300">
              Descartar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
