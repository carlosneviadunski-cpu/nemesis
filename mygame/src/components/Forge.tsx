import { useMemo, useState } from "react";
import { MAX_ARSENAL, type Game } from "../game/engine";
import { EFFECT_META, MATERIAL_LIST, MATERIALS, RARITY_META } from "../game/materials";
import type { Archetype, EffectKind, Weapon } from "../game/types";
import { fmt } from "../game/utils";
import { ARCHETYPE_META } from "../game/weapons";
import { cn } from "../utils/cn";
import { ShapeIcon } from "./ShapeIcon";
import { EffectChips, TierStars, WeaponCard } from "./WeaponCard";
import { WeaponPreview } from "./WeaponPreview";

interface Props {
  game: Game;
  onClose: () => void;
  onChanged: () => void;
}

type Slot = string | null;

function predict(ids: string[]) {
  const arch: Partial<Record<Archetype, number>> = {};
  const eff: Partial<Record<EffectKind, number>> = {};
  for (const id of ids) {
    const m = MATERIALS[id];
    const p = RARITY_META[m.rarity].power;
    for (const [a, b] of Object.entries(m.bias) as [Archetype, number][]) arch[a] = (arch[a] ?? 0) + b * p;
    if (m.effect) eff[m.effect] = (eff[m.effect] ?? 0) + p;
  }
  const topArch = (Object.entries(arch) as [Archetype, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const effects = (Object.entries(eff) as [EffectKind, number][]).filter(([, s]) => s >= 1.3).map(([e]) => e);
  return { topArch, effects };
}

export function Forge({ game, onClose, onChanged }: Props) {
  const [slots, setSlots] = useState<Slot[]>([null, null, null, null, null]);
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<{ weapon: Weapon; status: "ok" | "owned" | "full" | "invalid" } | null>(null);
  const [tab, setTab] = useState<"result" | "arsenal">("result");
  const [tick, setTick] = useState(0);

  const bump = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  const used = useMemo(() => {
    const u: Record<string, number> = {};
    for (const s of slots) if (s) u[s] = (u[s] ?? 0) + 1;
    return u;
  }, [slots]);

  const inventory = useMemo(
    () => MATERIAL_LIST.map((m) => ({ m, total: game.inventory[m.id] ?? 0, avail: (game.inventory[m.id] ?? 0) - (used[m.id] ?? 0) })).filter((x) => x.total > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, used, tick],
  );

  const filled = slots.filter(Boolean) as string[];
  const canForge = filled.length >= 3 && game.canAfford(filled);
  const hint = filled.length ? predict(filled) : null;

  const addMaterial = (id: string) => {
    setSlots((prev) => {
      const next = [...prev];
      let idx = selected >= 0 && selected < 5 && !next[selected] ? selected : next.findIndex((s) => !s);
      if (idx < 0) idx = selected;
      next[idx] = id;
      const nextEmpty = next.findIndex((s) => !s);
      setSelected(nextEmpty >= 0 ? nextEmpty : idx);
      return next;
    });
    setResult(null);
  };

  const clickSlot = (i: number) => {
    setSelected(i);
    if (slots[i]) {
      setSlots((prev) => {
        const next = [...prev];
        next[i] = null;
        return next;
      });
      setResult(null);
    }
  };

  const clear = () => {
    setSlots([null, null, null, null, null]);
    setSelected(0);
    setResult(null);
  };

  const randomize = () => {
    const pool: string[] = [];
    for (const [id, n] of Object.entries(game.inventory)) for (let i = 0; i < n; i++) pool.push(id);
    if (pool.length < 3) return;
    const count = Math.min(pool.length, 3 + Math.floor(Math.random() * 3));
    const next: Slot[] = [null, null, null, null, null];
    for (let i = 0; i < count; i++) {
      const k = Math.floor(Math.random() * pool.length);
      next[i] = pool.splice(k, 1)[0];
    }
    setSlots(next);
    setSelected(count < 5 ? count : 4);
    setResult(null);
  };

  const doForge = () => {
    if (!canForge) return;
    const r = game.forge(filled);
    setResult(r);
    setTab("result");
    if (r.status === "ok") {
      setSlots([null, null, null, null, null]);
      setSelected(0);
    }
    bump();
  };

  const equip = (w: Weapon) => {
    const idx = game.arsenal.findIndex((a) => a.id === w.id);
    if (idx >= 0) game.equip(idx);
    bump();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-3" onClick={onClose}>
      <div className="flex h-full max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight text-white">
              <span className="text-amber-400">⚒</span> Fundição
            </h2>
            <span className="hidden rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/60 sm:inline">3 a 5 materiais → 1 arma única</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <span className="hidden sm:inline">
              Arsenal <span className="font-mono text-white/80">{game.arsenal.length}/{MAX_ARSENAL}</span>
            </span>
            <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              Fechar
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_1fr_1.15fr] lg:overflow-hidden">
          {/* Inventário */}
          <div className="border-b border-white/10 p-3 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Materiais</h3>
            {inventory.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">Derrote inimigos para coletar materiais.</div>}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
              {inventory.map(({ m, total, avail }) => {
                const rc = RARITY_META[m.rarity].color;
                return (
                  <button
                    key={m.id}
                    disabled={avail <= 0}
                    onClick={() => addMaterial(m.id)}
                    title={`${m.desc}${m.effect ? ` · Efeito: ${EFFECT_META[m.effect].label}` : ""}`}
                    className={cn("relative flex items-center gap-2 rounded-xl border p-2 text-left transition", avail <= 0 ? "opacity-35" : "hover:bg-white/[0.06] active:scale-[0.98]")}
                    style={{ borderColor: `${rc}55`, background: `${rc}0d` }}
                  >
                    <ShapeIcon shape={m.shape} color={m.color} size={30} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold text-white">{m.name}</div>
                      <div className="text-[9px]" style={{ color: rc }}>
                        {RARITY_META[m.rarity].label}
                        {m.effect && <span className="text-white/40"> · {EFFECT_META[m.effect].label}</span>}
                      </div>
                    </div>
                    <span className="rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      {avail}
                      {avail !== total && <span className="text-white/40">/{total}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Câmara de fusão */}
          <div className="flex flex-col border-b border-white/10 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/50">Câmara de fusão</h3>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {slots.map((s, i) => {
                const m = s ? MATERIALS[s] : null;
                const rc = m ? RARITY_META[m.rarity].color : "#ffffff";
                const optional = i >= 3;
                return (
                  <button
                    key={i}
                    onClick={() => clickSlot(i)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 transition",
                      selected === i ? "border-amber-300/80 shadow-[0_0_20px_-4px_rgba(251,191,36,0.6)]" : m ? "border-white/20" : optional ? "border-dashed border-white/10" : "border-dashed border-white/25",
                      m ? "bg-black/40" : "bg-white/[0.02] hover:bg-white/[0.05]",
                    )}
                    style={m ? { background: `${rc}18`, borderColor: selected === i ? undefined : `${rc}77` } : undefined}
                    title={m ? `${m.name} — toque para remover` : optional ? "Slot opcional" : "Slot obrigatório"}
                  >
                    {m ? <ShapeIcon shape={m.shape} color={m.color} size={34} glow /> : <span className={cn("text-lg", optional ? "text-white/20" : "text-white/35")}>+</span>}
                    <span className="absolute bottom-1 text-[8px] uppercase tracking-wider text-white/35">{optional ? "opc." : i + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={doForge}
                disabled={!canForge}
                className={cn(
                  "flex-1 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wider transition",
                  canForge ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-[0.98]" : "cursor-not-allowed bg-white/5 text-white/30",
                )}
              >
                {filled.length < 3 ? `Fundir (${filled.length}/3)` : "⚒ Fundir arma"}
              </button>
              <button onClick={randomize} className="rounded-xl border border-white/10 px-3 text-xs text-white/70 hover:bg-white/10" title="Preencher com materiais aleatórios">
                🎲
              </button>
              <button onClick={clear} className="rounded-xl border border-white/10 px-3 text-xs text-white/70 hover:bg-white/10">
                Limpar
              </button>
            </div>

            {/* Tendência compacta */}
            <div className="mt-3 flex min-h-[32px] flex-wrap items-center gap-1.5 text-[11px]">
              {hint ? (
                <>
                  <span className="text-white/45">Tendência:</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white">{hint.topArch ? ARCHETYPE_META[hint.topArch].name : "—"}</span>
                  {hint.effects.map((e) => (
                    <span key={e} className="rounded-full border px-2 py-px text-[10px] font-semibold" style={{ borderColor: `${EFFECT_META[e].color}66`, color: EFFECT_META[e].color }}>
                      {EFFECT_META[e].label}
                    </span>
                  ))}
                  {filled.length < 5 && <span className="text-white/35">· +{5 - filled.length} opcionais elevam o tier</span>}
                </>
              ) : (
                <span className="text-white/35">Toque nos materiais para preencher os slots.</span>
              )}
            </div>

            <div className="mt-auto hidden pt-4 lg:block">
              <div className="flex items-center justify-center gap-3 rounded-xl bg-black/30 p-3">
                <WeaponPreview weapon={game.weapon} size={84} className="rounded-lg" />
                <div className="min-w-0 text-[11px]">
                  <div className="text-white/45">Equipada</div>
                  <div className="truncate font-bold text-white">{game.weapon.name}</div>
                  <div className="text-white/50">
                    {ARCHETYPE_META[game.weapon.archetype].name} · DPS <span className="font-mono text-emerald-300">{fmt(game.weapon.dps)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado / Arsenal */}
          <div className="flex flex-col lg:min-h-0">
            <div className="flex border-b border-white/10">
              {(["result", "arsenal"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn("flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition", tab === t ? "border-b-2 border-amber-300 text-white" : "text-white/40 hover:text-white/70")}
                >
                  {t === "result" ? "Resultado" : `Arsenal (${game.arsenal.length})`}
                </button>
              ))}
            </div>
            <div className="flex-1 p-3 lg:min-h-0 lg:overflow-y-auto">
              {tab === "result" &&
                (result ? (
                  <div className="space-y-3">
                    {result.status === "ok" && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">✦ Nova arma forjada e adicionada ao arsenal.</div>}
                    {result.status === "owned" && <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">Receita já conhecida — a arma já está no arsenal. Nenhum material gasto.</div>}
                    {result.status === "full" && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">Arsenal cheio ({MAX_ARSENAL}). Desmonte uma arma para forjar outra.</div>}
                    {result.status === "invalid" && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">Receita inválida ou materiais insuficientes.</div>}
                    {result.status !== "invalid" && (
                      <WeaponCard
                        weapon={result.weapon}
                        highlight={result.status === "ok"}
                        equipped={game.weapon.id === result.weapon.id}
                        onEquip={game.arsenal.some((w) => w.id === result.weapon.id) ? () => equip(result.weapon) : undefined}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                    <WeaponPreview weapon={game.weapon} size={140} className="rounded-2xl bg-black/30" />
                    <div className="text-sm text-white/60">
                      Arma atual: <span className="font-bold text-white">{game.weapon.name}</span>
                    </div>
                    <div className="max-w-xs text-xs text-white/40">O resultado da fusão aparece aqui. Os canos do tanque mudam conforme a arma criada.</div>
                  </div>
                ))}
              {tab === "arsenal" && (
                <div className="space-y-2">
                  {game.arsenal.map((w, i) => {
                    const eq = i === game.equipped;
                    return (
                      <div key={w.id} className={cn("flex items-center gap-3 rounded-xl border p-2 transition", eq ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/[0.03]")}>
                        <WeaponPreview weapon={w} size={64} animate={false} className="shrink-0 rounded-lg bg-black/30" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/10 px-1 font-mono text-[10px] text-white/70">{i + 1}</span>
                            <span className="truncate text-sm font-bold text-white">{w.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/50">
                            <span>{ARCHETYPE_META[w.archetype].name}</span>
                            <TierStars tier={w.tier} />
                            <span>
                              DPS <span className="font-mono text-emerald-300">{fmt(w.dps)}</span>
                            </span>
                          </div>
                          <div className="mt-1">
                            <EffectChips weapon={w} size="xs" />
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => {
                              game.equip(i);
                              bump();
                            }}
                            disabled={eq}
                            className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", eq ? "bg-white/5 text-white/40" : "bg-sky-500 text-white hover:bg-sky-400")}
                          >
                            {eq ? "Equipada" : "Equipar"}
                          </button>
                          {i > 0 && (
                            <button
                              onClick={() => {
                                game.discard(i);
                                bump();
                              }}
                              title="Devolve 1 material da receita"
                              className="rounded-lg border border-white/10 px-3 py-1 text-[10px] text-white/50 hover:border-rose-400/50 hover:text-rose-300"
                            >
                              Desmontar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
