import { ENEMY_DEFS } from "../game/enemies";
import { totalRecipeCount } from "../game/materials";
import type { HudSnapshot, InputMode } from "../game/types";
import { UPGRADE_BY_ID } from "../game/upgrades";
import { fmt } from "../game/utils";
import { cn } from "../utils/cn";
import { ShapeIcon } from "./ShapeIcon";

export interface Settings {
  inputMode: InputMode;
  autoAim: boolean;
  autoFire: boolean;
  showAi: boolean;
  sound: boolean;
  showDamage: boolean;
}

function Key({ k }: { k: string }) {
  return <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white">{k}</kbd>;
}

function ControlsPC() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-white/70 sm:grid-cols-3">
      <div>
        <Key k="W A S D" /> mover
      </div>
      <div>
        <Key k="Mouse" /> mirar · <Key k="Clique" /> atirar
      </div>
      <div>
        <Key k="Espaço" /> impulso
      </div>
      <div>
        <Key k="E" /> tiro automático
      </div>
      <div>
        <Key k="Q" /> mira automática
      </div>
      <div>
        <Key k="R" /> / <Key k="1-9" /> trocar arma
      </div>
      <div>
        <Key k="F" /> Fundição
      </div>
      <div>
        <Key k="B" /> Bestiário
      </div>
      <div>
        <Key k="Esc" /> pausa · <Key k="N" /> pular
      </div>
    </div>
  );
}

function ControlsTouch() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-white/70 sm:grid-cols-2">
      <div>
        <span className="font-bold text-sky-300">◐ Metade esquerda</span> — arraste para mover
      </div>
      <div>
        <span className="font-bold text-rose-300">◑ Metade direita</span> — arraste para mirar e atirar
      </div>
      <div>
        <span className="font-bold text-cyan-300">⤳ Impulso</span> — botão redondo (invulnerável por instantes)
      </div>
      <div>
        <span className="font-bold text-emerald-300">◎ Mira auto</span> — atira sozinho no inimigo mais próximo
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/25">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {desc && <div className="text-[11px] text-white/50">{desc}</div>}
      </div>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", value ? "bg-emerald-500" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", value ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function PlatformPicker({ value, onChange, recommended }: { value: InputMode; onChange: (m: InputMode) => void; recommended: InputMode }) {
  const opts: { id: InputMode; icon: string; title: string; desc: string }[] = [
    { id: "pc", icon: "🖥️", title: "PC", desc: "Teclado + mouse. Mira precisa e atalhos." },
    { id: "touch", icon: "📱", title: "Celular / Tablet", desc: "Joysticks de toque, mira automática e botões grandes." },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative rounded-2xl border p-3 text-left transition active:scale-[0.98]",
            value === o.id ? "border-sky-400/70 bg-sky-500/15 shadow-[0_0_30px_-10px_rgba(56,189,248,0.8)]" : "border-white/10 bg-white/[0.03] hover:border-white/25",
          )}
        >
          {recommended === o.id && <span className="absolute right-2 top-2 rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Detectado</span>}
          <div className="text-2xl">{o.icon}</div>
          <div className="mt-1 text-sm font-black text-white">{o.title}</div>
          <div className="text-[11px] leading-snug text-white/55">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({ settings, onChange, onFullscreen }: { settings: Settings; onChange: (s: Settings) => void; onFullscreen?: () => void }) {
  return (
    <div className="space-y-2">
      <Toggle label="Mira automática" desc="Mira no inimigo mais próximo (recomendado no celular)." value={settings.autoAim} onChange={(v) => onChange({ ...settings, autoAim: v })} />
      <Toggle label="Tiro automático" desc="Dispara continuamente sem segurar o botão." value={settings.autoFire} onChange={(v) => onChange({ ...settings, autoFire: v })} />
      <Toggle label="Números de dano" desc="Mostra o dano causado sobre os inimigos." value={settings.showDamage} onChange={(v) => onChange({ ...settings, showDamage: v })} />
      <Toggle label="Indicadores de IA" desc="Ponto colorido: Atacar / Recuar / Esquivar." value={settings.showAi} onChange={(v) => onChange({ ...settings, showAi: v })} />
      <Toggle label="Som e vibração" desc="Efeitos sonoros sintetizados e resposta tátil no celular." value={settings.sound} onChange={(v) => onChange({ ...settings, sound: v })} />
      {onFullscreen && (
        <button onClick={onFullscreen} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm font-semibold text-white transition hover:border-white/25">
          ⛶ Tela cheia
        </button>
      )}
    </div>
  );
}

interface StartProps {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  recommended: InputMode;
  bestWave: number;
}

export function StartScreen({ settings, onChange, onStart, recommended, bestWave }: StartProps) {
  const preview = ENEMY_DEFS.slice(0, 8);
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto bg-[#070a10]/90 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto my-auto flex min-h-full w-full max-w-2xl items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#0b0f17]/95 p-5 shadow-2xl sm:p-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/40">
              <div className="h-9 w-9 rounded-full border-4 border-sky-700 bg-sky-400" />
              <div className="absolute left-1/2 top-1 h-6 w-3 -translate-x-1/2 rounded-sm border border-slate-600 bg-slate-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-sky-300">Diep Solo · Forja Procedural</div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">ARENA AI</h1>
              {bestWave > 0 && (
                <div className="text-[11px] text-white/50">
                  Melhor onda: <span className="font-mono font-bold text-amber-300">{bestWave}</span>
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Sobreviva a ondas infinitas de monstros geométricos com <span className="text-white">IA comportamental</span>. Suba de nível, escolha melhorias, colete materiais e funda-os em{" "}
            <span className="text-white">{fmt(totalRecipeCount())} receitas</span> de armas únicas — os canos do seu tanque mudam com cada criação.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            {preview.map((d) => (
              <ShapeIcon key={d.id} shape={d.shape} color={d.color} size={24} />
            ))}
            <span className="ml-1 text-xs text-white/40">+{ENEMY_DEFS.length - preview.length} espécies</span>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Como você vai jogar?</div>
            <PlatformPicker value={settings.inputMode} recommended={recommended} onChange={(m) => onChange({ ...settings, inputMode: m, autoAim: m === "touch" ? true : settings.autoAim, autoFire: m === "touch" ? true : settings.autoFire })} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">{settings.inputMode === "touch" ? <ControlsTouch /> : <ControlsPC />}</div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {(
              [
                ["autoAim", "Mira automática"],
                ["autoFire", "Tiro automático"],
                ["showDamage", "Números de dano"],
                ["sound", "Som"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => onChange({ ...settings, [k]: !settings[k] })}
                className={cn("rounded-lg border px-2.5 py-1 font-semibold transition", settings[k] ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/50")}
              >
                {settings[k] ? "✓ " : ""}
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={onStart}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3.5 text-base font-black uppercase tracking-wider text-black shadow-lg shadow-sky-500/30 transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
            >
              ▶ Entrar na arena
            </button>
            <div className="text-center text-[11px] text-white/40 sm:text-left">Arena 100×100 blocos em tela cheia · pilares bloqueiam tiros e visão · câmera centrada no jogador</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PauseProps {
  settings: Settings;
  onChange: (s: Settings) => void;
  onResume: () => void;
  onRestart: () => void;
  onFullscreen: () => void;
  recommended: InputMode;
}

export function PauseScreen({ settings, onChange, onResume, onRestart, onFullscreen, recommended }: PauseProps) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto bg-black/65 p-3 backdrop-blur-sm" onClick={onResume}>
      <div className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#0b0f17]/95 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-black text-white">Pausado</h2>
          <div className="mt-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Plataforma</div>
            <PlatformPicker value={settings.inputMode} recommended={recommended} onChange={(m) => onChange({ ...settings, inputMode: m, autoAim: m === "touch" ? true : settings.autoAim, autoFire: m === "touch" ? true : settings.autoFire })} />
          </div>
          <div className="mt-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Opções</div>
            <SettingsPanel settings={settings} onChange={onChange} onFullscreen={onFullscreen} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">{settings.inputMode === "touch" ? <ControlsTouch /> : <ControlsPC />}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={onResume} className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white hover:bg-sky-400">
              Continuar {settings.inputMode === "pc" && <kbd className="ml-1 rounded bg-black/20 px-1 font-mono text-[10px]">Esc</kbd>}
            </button>
            <button onClick={onRestart} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:border-rose-400/50 hover:text-rose-300">
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameOverScreen({ snap, onRestart, onMenu }: { snap: HudSnapshot; onRestart: () => void; onMenu: () => void }) {
  const stats = [
    { label: "Onda alcançada", value: fmt(snap.wave) },
    { label: "Pontuação", value: fmt(snap.score) },
    { label: "Abates", value: fmt(snap.kills) },
    { label: "Nível", value: fmt(snap.level) },
    { label: "Armas forjadas", value: fmt(snap.forgedCount) },
    { label: "Receitas descobertas", value: fmt(snap.discovered) },
  ];
  const ups = Object.entries(snap.upgrades).filter(([, n]) => n > 0);
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-rose-500/30 bg-[#0b0f17]/95 p-5 shadow-2xl sm:p-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-rose-300">Tanque destruído</div>
          <h2 className="mt-1 text-3xl font-black text-white">Fim de jogo</h2>
          {snap.wave >= snap.bestWave && snap.wave > 1 && <div className="mt-1 text-xs font-bold text-amber-300">★ Novo recorde de onda!</div>}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-white/45">{s.label}</div>
                <div className="font-mono text-xl font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">
            Última arma: <span className="font-semibold text-white/80">{snap.weapon.name}</span> ({snap.weapon.model})
          </div>
          {ups.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ups.map(([id, n]) => {
                const u = UPGRADE_BY_ID[id];
                return (
                  <span key={id} className="rounded-md border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${u.color}55`, background: `${u.color}18`, color: u.color }}>
                    {u.icon} {u.name} ×{n}
                  </span>
                );
              })}
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button onClick={onRestart} className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 text-sm font-black uppercase tracking-wider text-black shadow-lg shadow-sky-500/30 hover:brightness-110">
              ↻ Jogar novamente
            </button>
            <button onClick={onMenu} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:border-white/30">
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
