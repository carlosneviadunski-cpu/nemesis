import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Bestiary } from "./components/Bestiary";
import { Forge } from "./components/Forge";
import { HUD } from "./components/HUD";
import { LevelUpScreen } from "./components/LevelUp";
import { MobileHUD } from "./components/MobileHUD";
import { GameOverScreen, PauseScreen, StartScreen, type Settings } from "./components/Screens";
import { TouchControls } from "./components/TouchControls";
import { sfx } from "./game/audio";
import { Game } from "./game/engine";
import type { HudSnapshot, InputMode } from "./game/types";
import { cn } from "./utils/cn";

type Screen = "start" | "playing" | "gameover";
type Panel = null | "bestiary" | "forge" | "pause" | "levelup";

const SETTINGS_KEY = "arena-ai-settings-v3";
const BEST_KEY = "arena-ai-best-wave";

function detectTouch(): InputMode {
  if (typeof window === "undefined") return "pc";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return coarse && touch ? "touch" : "pc";
}

function defaultSettings(mode: InputMode): Settings {
  return { inputMode: mode, autoAim: mode === "touch", autoFire: mode === "touch", showAi: false, sound: true, showDamage: true };
}

function loadSettings(recommended: InputMode): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(recommended), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  return defaultSettings(recommended);
}

function loadBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<HudSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>("start");
  const [panel, setPanel] = useState<Panel>(null);
  const [recommended] = useState<InputMode>(() => detectTouch());
  const [settings, setSettings] = useState<Settings>(() => loadSettings(recommended));
  const [bestWave, setBestWave] = useState(() => loadBest());
  const [vp, setVp] = useState({ w: 800, h: 600 });
  const [, force] = useReducer((x: number) => x + 1, 0);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const landscape = vp.w > vp.h;
  const isTouch = settings.inputMode === "touch";

  // ── Motor ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas);
    gameRef.current = game;
    game.onUi = setSnap;
    game.onEvent = (ev) => {
      if (ev.type === "gameover") {
        setPanel(null);
        setScreen("gameover");
        setBestWave((b) => {
          const nb = Math.max(b, game.wave);
          try {
            localStorage.setItem(BEST_KEY, String(nb));
          } catch {
            /* ignore */
          }
          return nb;
        });
      } else if (ev.type === "levelup") {
        if (screenRef.current === "playing") setPanel("levelup");
      } else if (ev.type === "togglePanel" && ev.panel) {
        if (screenRef.current !== "playing") return;
        const target = ev.panel;
        setPanel((prev) => {
          if (prev === "levelup") return prev;
          if (target === "pause") return prev ? null : "pause";
          return prev === target ? null : target;
        });
      } else if (ev.type === "forge" || ev.type === "wavecleared") {
        force();
      }
    };
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setVp({ w, h });
      game.resize(w, h);
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const onVis = () => {
      if (document.hidden && screenRef.current === "playing") setPanel((p) => p ?? "pause");
    };
    document.addEventListener("visibilitychange", onVis);
    setSnap(game.getSnapshot());
    force();
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // Aplica configurações ao motor e persiste
  useEffect(() => {
    const g = gameRef.current;
    if (g) {
      if (g.inputMode !== settings.inputMode) g.setInputMode(settings.inputMode);
      g.autoAim = settings.autoAim;
      g.autoFire = settings.autoFire;
      g.showAi = settings.showAi;
      g.showDamage = settings.showDamage;
    }
    sfx.enabled = settings.sound;
    sfx.haptics = settings.sound;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Posição do minimapa conforme o layout do HUD
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    g.minimapTop = isTouch ? (landscape ? 12 : 104) : 78;
  }, [isTouch, landscape, snap]);

  useEffect(() => {
    gameRef.current?.setPaused(panel !== null || screen !== "playing");
  }, [panel, screen]);

  // Sincroniza toggles alterados dentro do jogo (teclas E/Q/H, botão de mira) com as configurações
  useEffect(() => {
    if (!snap) return;
    const s = settingsRef.current;
    if (snap.autoAim !== s.autoAim || snap.autoFire !== s.autoFire || snap.showAi !== s.showAi) {
      setSettings({ ...s, autoAim: snap.autoAim, autoFire: snap.autoFire, showAi: snap.showAi });
    }
  }, [snap]);

  const start = useCallback(() => {
    sfx.init();
    gameRef.current?.start();
    setScreen("playing");
    setPanel(null);
  }, []);

  const restart = useCallback(() => {
    sfx.init();
    gameRef.current?.restart();
    setScreen("playing");
    setPanel(null);
  }, []);

  const toMenu = useCallback(() => {
    const g = gameRef.current;
    if (g) {
      g.reset();
      g.started = false;
    }
    setScreen("start");
    setPanel(null);
  }, []);

  const openPanel = useCallback((p: "bestiary" | "forge" | "pause") => setPanel((prev) => (prev === "levelup" ? prev : prev === p ? null : p)), []);

  const fullscreen = useCallback(() => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
      else el.webkitRequestFullscreen?.();
    } catch {
      /* não suportado (ex.: iOS Safari) */
    }
  }, []);

  const chooseUpgrade = useCallback((id: string) => {
    const g = gameRef.current;
    if (!g) return;
    const r = g.applyUpgrade(id);
    if (r === "done") setPanel(null);
    else force();
  }, []);

  const game = gameRef.current;
  const playing = screen === "playing";

  return (
    <div className={cn("fixed inset-0 overflow-hidden bg-[#05070b] text-white", isTouch && "touch-none")}>
      {/* Arena em tela cheia */}
      <canvas ref={canvasRef} className={cn("absolute inset-0 block", isTouch ? "pointer-events-none" : "pointer-events-auto cursor-crosshair")} />

      {/* Camada de toque */}
      {isTouch && playing && !panel && game && <TouchControls game={game} landscape={landscape} />}

      {/* HUD */}
      {snap && playing && game && (isTouch ? <MobileHUD snap={snap} game={game} landscape={landscape} onOpen={openPanel} /> : <HUD snap={snap} game={game} onOpen={openPanel} />)}

      {/* Painéis */}
      {panel === "bestiary" && game && <Bestiary kills={game.killsByType} encountered={game.encountered} currentWave={game.wave} onClose={() => setPanel(null)} />}
      {panel === "forge" && game && <Forge game={game} onClose={() => setPanel(null)} onChanged={force} />}
      {panel === "pause" && playing && (
        <PauseScreen settings={settings} onChange={setSettings} onResume={() => setPanel(null)} onRestart={restart} onFullscreen={fullscreen} recommended={recommended} />
      )}
      {panel === "levelup" && game && game.levelUpOptions && (
        <LevelUpScreen level={game.level} options={game.levelUpOptions} counts={game.upgradeCounts} pending={game.pendingLevelUps} onChoose={chooseUpgrade} />
      )}

      {screen === "start" && <StartScreen settings={settings} onChange={setSettings} onStart={start} recommended={recommended} bestWave={bestWave} />}
      {screen === "gameover" && snap && <GameOverScreen snap={snap} onRestart={restart} onMenu={toMenu} />}
    </div>
  );
}
