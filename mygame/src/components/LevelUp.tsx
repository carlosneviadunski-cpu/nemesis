import type { UpgradeDef } from "../game/upgrades";
import { cn } from "../utils/cn";

interface Props {
  level: number;
  options: UpgradeDef[];
  counts: Record<string, number>;
  pending: number;
  onChoose: (id: string) => void;
}

export function LevelUpScreen({ level, options, counts, pending, onChoose }: Props) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300">Nível {level} alcançado</div>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-white">Escolha uma melhoria</h2>
          <p className="mt-1 text-xs text-white/50">{pending > 1 ? `${pending} melhorias pendentes · ` : ""}As melhorias são permanentes nesta partida.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((u, i) => {
            const have = counts[u.id] ?? 0;
            return (
              <button
                key={u.id}
                onClick={() => onChoose(u.id)}
                style={{ animationDelay: `${i * 80}ms` }}
                className={cn(
                  "group relative flex animate-[fadeDown_0.4s_ease-out_both] flex-row items-center gap-4 overflow-hidden rounded-2xl border bg-[#0d121b]/95 p-4 text-left transition sm:flex-col sm:items-stretch sm:p-5",
                  "hover:-translate-y-1 hover:border-white/40 active:scale-[0.98]",
                  u.rare ? "border-amber-300/50 shadow-[0_0_40px_-12px_rgba(251,191,36,0.6)]" : "border-white/15",
                )}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition group-hover:opacity-50" style={{ background: u.color }} />
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl sm:h-16 sm:w-16 sm:text-3xl" style={{ borderColor: `${u.color}66`, background: `${u.color}1f`, color: u.color }}>
                  {u.icon}
                </div>
                <div className="min-w-0 flex-1 sm:mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">{u.name}</span>
                    {u.rare && <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">Rara</span>}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-white/65">{u.desc}</p>
                  <div className="mt-2 text-[10px] text-white/40">
                    {have > 0 ? `Nível atual: ${have}${u.max ? `/${u.max}` : ""}` : "Nova melhoria"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
