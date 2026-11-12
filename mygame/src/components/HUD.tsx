import type { Game } from "../game/engine";
import { MATERIALS, RARITY_META } from "../game/materials";
import type { HudSnapshot } from "../game/types";
import { UPGRADE_BY_ID } from "../game/upgrades";
import { fmt, roman } from "../game/utils";
import { ARCHETYPE_META } from "../game/weapons";
import { cn } from "../utils/cn";
import { ShapeIcon } from "./ShapeIcon";
import { TierStars } from "./WeaponCard";

interface Props {
  snap: HudSnapshot;
  game: Game;
  onOpen: (panel: "bestiary" | "forge" | "pause") => void;
}

function HudButton({ label, hotkey, onClick, accent, badge }: { label: string; hotkey: string; onClick: () => void; accent?: string; badge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto group relative flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur transition hover:border-white/25 hover:bg-black/70 hover:text-white"
    >
      {accent && <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
      {label}
      <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60 group-hover:bg-white/15">{hotkey}</kbd>
      {badge && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-amber-400" />}
      {badge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400" />}
    </button>
  );
}

export function HUD({ snap, game, onOpen }: Props) {
  const hpRatio = Math.max(0, snap.hp / snap.maxHp);
  const xpRatio = Math.min(1, snap.xp / snap.xpToNext);
  const w = snap.weapon;
  const dashReady = snap.dashCooldown <= 0;
  const dashPct = snap.dashCooldownMax > 0 ? 1 - snap.dashCooldown / snap.dashCooldownMax : 1;
  const inv = Object.entries(snap.inventory)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ m: MATERIALS[id], n }))
    .filter((x) => x.m)
    .sort((a, b) => RARITY_META[b.m.rarity].order - RARITY_META[a.m.rarity].order || b.n - a.n)
    .slice(0, 8);
  const upgrades = Object.entries(snap.upgrades).filter(([, n]) => n > 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none text-white">
      {/* Topo esquerdo: onda e pontuação */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <div key={snap.wave} className="animate-[fadeDown_0.5s_ease-out] rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Onda</div>
          <div className="text-3xl font-black leading-none tabular-nums">{snap.wave || "—"}</div>
          <div className="mt-1 text-[11px] text-white/60">
            {snap.waveState === "active" ? (
              <>
                <span className="font-semibold text-rose-300">{snap.enemiesAlive}</span> em campo
                {snap.enemiesQueued > 0 && <span className="text-white/40"> · +{snap.enemiesQueued}</span>}
              </>
            ) : (
              <span className="text-emerald-300">
                Próxima em <span className="font-mono font-bold">{Math.ceil(snap.intermissionTimer)}s</span> <kbd className="ml-1 rounded bg-white/10 px-1 text-[9px]">N</kbd>
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] backdrop-blur">
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Pontos</span>
            <span className="font-mono font-bold tabular-nums">{fmt(snap.score)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Abates</span>
            <span className="font-mono tabular-nums">{fmt(snap.kills)}</span>
          </div>
          {snap.combo > 1 && (
            <div className="mt-1 border-t border-white/10 pt-1">
              <div className="flex justify-between gap-4 text-amber-300">
                <span className="font-bold">COMBO ×{snap.comboMult.toFixed(1)}</span>
                <span className="font-mono">{snap.combo}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-300 transition-all duration-100" style={{ width: `${(snap.comboTimer / 2.5) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
        {upgrades.length > 0 && (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {upgrades.map(([id, n]) => {
              const u = UPGRADE_BY_ID[id];
              return (
                <span key={id} title={`${u.name} ×${n}`} className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] backdrop-blur" style={{ borderColor: `${u.color}55`, background: `${u.color}18`, color: u.color }}>
                  {u.icon}
                  <span className="font-mono">{n}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Topo direito: botões */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        <div className="flex gap-1.5">
          <HudButton label="Bestiário" hotkey="B" onClick={() => onOpen("bestiary")} accent="#f472b6" />
          <HudButton label="Fundição" hotkey="F" onClick={() => onOpen("forge")} accent="#fbbf24" badge={snap.canForgeHint} />
          <HudButton label="Pausa" hotkey="Esc" onClick={() => onOpen("pause")} />
        </div>
        <div className="flex gap-1.5 text-[10px]">
          <span className={cn("rounded-md border px-1.5 py-0.5 backdrop-blur", snap.autoFire ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-black/40 text-white/50")}>
            [E] Auto-tiro {snap.autoFire ? "ON" : "OFF"}
          </span>
          <span className={cn("rounded-md border px-1.5 py-0.5 backdrop-blur", snap.autoAim ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-black/40 text-white/50")}>
            [Q] Mira auto {snap.autoAim ? "ON" : "OFF"}
          </span>
          <span className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-white/40 backdrop-blur">{snap.fps} fps</span>
        </div>
      </div>

      {/* Chefe */}
      {snap.boss && (
        <div className="absolute left-1/2 top-3 w-[min(460px,50%)] -translate-x-1/2 rounded-xl border border-rose-400/30 bg-black/60 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-wider text-rose-300">☠ {snap.boss.name}</span>
            <span className="font-mono text-white/70">
              {fmt(snap.boss.hp)} / {fmt(snap.boss.maxHp)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-all" style={{ width: `${(snap.boss.hp / snap.boss.maxHp) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Trilho do arsenal (inferior, centro) */}
      {snap.arsenalCount > 1 && (
        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 gap-1 md:flex">
          {game.arsenal.map((a, i) => (
            <button
              key={a.id}
              onClick={() => game.equip(i)}
              title={`${a.name} · ${ARCHETYPE_META[a.archetype].name} · DPS ${fmt(a.dps)}`}
              className={cn(
                "pointer-events-auto flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border px-1.5 backdrop-blur transition",
                i === snap.equippedIndex ? "border-sky-400/60 bg-sky-500/25" : "border-white/10 bg-black/45 hover:border-white/30",
              )}
            >
              <span className="font-mono text-[10px] text-white/60">{i + 1}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
            </button>
          ))}
        </div>
      )}

      {/* Inferior esquerdo: arma, vida, nível */}
      <div className="absolute bottom-3 left-3 flex w-[min(340px,60%)] flex-col gap-1.5">
        <div className="rounded-xl border border-white/10 bg-black/55 p-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-white/20" style={{ background: w.color }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold leading-tight">{w.name}</div>
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span className="font-mono">{w.model}</span>
                <span>{ARCHETYPE_META[w.archetype].name}</span>
                <TierStars tier={w.tier} />
                <span>T{roman(w.tier)}</span>
              </div>
            </div>
            <div className="text-right text-[10px] text-white/50">
              <div>
                DPS <span className="font-mono font-bold text-emerald-300">{fmt(snap.effectiveDps)}</span>
              </div>
              <div>
                Arma {snap.equippedIndex + 1}/{snap.arsenalCount} <span className="text-white/30">[R]</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-white/60">
              <span className="uppercase tracking-wider">Vida</span>
              <span className="font-mono tabular-nums">
                {fmt(Math.max(0, snap.hp))} / {fmt(snap.maxHp)}
              </span>
            </div>
            <div className="mt-0.5 h-3 overflow-hidden rounded-full border border-white/10 bg-white/5">
              <div
                className={cn("h-full rounded-full transition-all duration-200", hpRatio > 0.5 ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : hpRatio > 0.25 ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-rose-600 to-rose-400")}
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[10px]">
            <span className="font-bold text-amber-300">Nv {snap.level}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 transition-all" style={{ width: `${xpRatio * 100}%` }} />
            </div>
            <span
              className={cn("ml-1 rounded-md border px-1.5 py-0.5 font-semibold", dashReady ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-200" : "border-white/10 text-white/40")}
              style={!dashReady ? { background: `linear-gradient(90deg, rgba(103,232,249,0.25) ${dashPct * 100}%, transparent ${dashPct * 100}%)` } : undefined}
              title="Impulso (Espaço / Shift)"
            >
              ⤳ {dashReady ? "Impulso" : `${snap.dashCooldown.toFixed(1)}s`}
            </span>
          </div>
        </div>
      </div>

      {/* Inferior direito: materiais */}
      <div className="absolute bottom-3 right-3 hidden max-w-[40%] sm:block">
        <div className="flex items-center gap-1 overflow-hidden rounded-xl border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-white/40">
            Materiais <span className="font-mono text-white/70">{snap.inventoryTotal}</span>
          </span>
          {inv.map(({ m, n }) => (
            <div key={m.id} title={`${m.name} (${RARITY_META[m.rarity].label})`} className="relative rounded-lg border p-0.5" style={{ borderColor: `${RARITY_META[m.rarity].color}55`, background: `${RARITY_META[m.rarity].color}12` }}>
              <ShapeIcon shape={m.shape} color={m.color} size={22} />
              <span className="absolute -bottom-1 -right-1 rounded bg-black/80 px-1 font-mono text-[9px] leading-tight text-white">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
