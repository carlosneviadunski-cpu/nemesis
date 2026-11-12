import type { Game } from "../game/engine";
import type { HudSnapshot } from "../game/types";
import { fmt } from "../game/utils";
import { cn } from "../utils/cn";

interface Props {
  snap: HudSnapshot;
  game: Game;
  landscape: boolean;
  onOpen: (panel: "bestiary" | "forge" | "pause") => void;
}

function ActionButton({ label, icon, onClick, accent, active, badge }: { label: string; icon: string; onClick: () => void; accent?: string; active?: boolean; badge?: boolean }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "pointer-events-auto relative flex h-14 w-14 flex-col items-center justify-center rounded-2xl border text-white backdrop-blur-md transition active:scale-95",
        active ? "border-emerald-400/50 bg-emerald-500/25" : "border-white/15 bg-black/55",
      )}
    >
      <span className="text-lg leading-none" style={{ color: accent }}>
        {icon}
      </span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/70">{label}</span>
      {badge && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-ping rounded-full bg-amber-400" />}
      {badge && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-400" />}
    </button>
  );
}

export function MobileHUD({ snap, game, landscape, onOpen }: Props) {
  const hpRatio = Math.max(0, snap.hp / snap.maxHp);
  const xpRatio = Math.min(1, snap.xp / snap.xpToNext);
  const dashReady = snap.dashCooldown <= 0;
  const dashPct = snap.dashCooldownMax > 0 ? 1 - snap.dashCooldown / snap.dashCooldownMax : 1;
  const hpBarCls = cn(
    "h-full rounded-full transition-all duration-200",
    hpRatio > 0.5 ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : hpRatio > 0.25 ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-rose-600 to-rose-400",
  );

  const actions = (
    <>
      <ActionButton label="Bestiário" icon="◆" accent="#f472b6" onClick={() => onOpen("bestiary")} />
      <ActionButton label="Fundição" icon="⚒" accent="#fbbf24" badge={snap.canForgeHint} onClick={() => onOpen("forge")} />
      {snap.arsenalCount > 1 && <ActionButton label={`Arma ${snap.equippedIndex + 1}`} icon="⇄" accent={snap.weapon.color} onClick={() => game.cycleWeapon()} />}
      <ActionButton label="Mira auto" icon="◎" accent="#4ade80" active={snap.autoAim} onClick={() => void (game.autoAim = !game.autoAim)} />
      <ActionButton label="Pausa" icon="❚❚" onClick={() => onOpen("pause")} />
    </>
  );

  const dashButton = (
    <button
      onPointerDown={(e) => {
        e.stopPropagation();
        game.dash();
      }}
      className={cn(
        "pointer-events-auto relative flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 text-white transition active:scale-95",
        dashReady ? "border-cyan-300/80 bg-cyan-500/30 shadow-[0_0_30px_-6px_rgba(103,232,249,0.9)]" : "border-white/15 bg-black/55",
      )}
      style={!dashReady ? { background: `conic-gradient(rgba(103,232,249,0.45) ${dashPct * 360}deg, rgba(0,0,0,0.55) 0deg)` } : undefined}
    >
      <span className="flex flex-col items-center">
        <span className="text-2xl leading-none">⤳</span>
        <span className="text-[9px] font-black uppercase tracking-wider">{dashReady ? "Impulso" : `${snap.dashCooldown.toFixed(1)}s`}</span>
      </span>
    </button>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none text-white">
      {/* Barra superior */}
      <div className="absolute inset-x-0 top-0 p-2" style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}>
        <div className={cn("flex items-stretch gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md", landscape ? "mr-auto w-[min(440px,55%)]" : "mx-auto max-w-xl")}>
          <div key={snap.wave} className="flex animate-[fadeDown_0.5s_ease-out] flex-col justify-center pr-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Onda</div>
            <div className="text-2xl font-black leading-none tabular-nums">{snap.wave || "—"}</div>
            <div className="text-[10px] text-white/60">
              {snap.waveState === "active" ? (
                <>
                  <span className="font-semibold text-rose-300">{snap.enemiesAlive}</span>
                  {snap.enemiesQueued > 0 && <span className="text-white/40">+{snap.enemiesQueued}</span>}
                </>
              ) : (
                <span className="text-emerald-300">{Math.ceil(snap.intermissionTimer)}s</span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60">♥ Vida</span>
              <span className="font-mono tabular-nums">
                {fmt(Math.max(0, snap.hp))}/{fmt(snap.maxHp)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/5">
              <div className={hpBarCls} style={{ width: `${hpRatio * 100}%` }} />
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="font-bold text-amber-300">Nv {snap.level}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200" style={{ width: `${xpRatio * 100}%` }} />
              </div>
              <span className="max-w-[45%] truncate text-white/60">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: snap.weapon.color }} />
                {snap.weapon.name}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-center pl-2 text-right">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Pontos</div>
            <div className="font-mono text-base font-black tabular-nums">{fmt(snap.score)}</div>
            {snap.combo > 1 ? <div className="text-[10px] font-bold text-amber-300">×{snap.comboMult.toFixed(1)} combo</div> : <div className="text-[10px] text-white/40">DPS {fmt(snap.effectiveDps)}</div>}
          </div>
        </div>

        {snap.boss && (
          <div className={cn("mt-1.5 rounded-xl border border-rose-400/30 bg-black/60 px-3 py-1.5 backdrop-blur", landscape ? "w-[min(440px,55%)]" : "mx-auto max-w-xl")}>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider text-rose-300">☠ {snap.boss.name}</span>
              <span className="font-mono text-white/70">{Math.round((snap.boss.hp / snap.boss.maxHp) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-all" style={{ width: `${(snap.boss.hp / snap.boss.maxHp) * 100}%` }} />
            </div>
          </div>
        )}

        {snap.waveState === "intermission" && snap.wave > 0 && !snap.gameOver && (
          <div className={cn("mt-1.5 flex w-fit items-center gap-2 rounded-xl border border-emerald-400/30 bg-black/55 px-3 py-1 text-[11px] backdrop-blur", landscape ? "" : "mx-auto")}>
            <span className="text-emerald-300">Próxima onda em {Math.ceil(snap.intermissionTimer)}s</span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => void (game.intermissionTimer = Math.min(game.intermissionTimer, 0.01))}
              className="pointer-events-auto rounded-md bg-emerald-500/30 px-2 py-0.5 font-bold text-emerald-100"
            >
              Pular ▶
            </button>
          </div>
        )}
      </div>

      {/* Ações */}
      {landscape ? (
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 p-2" style={{ paddingRight: "max(8px, env(safe-area-inset-right))" }}>
          {actions}
          <div className="mt-2">{dashButton}</div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="flex flex-wrap gap-2">{actions}</div>
          {dashButton}
        </div>
      )}
    </div>
  );
}
