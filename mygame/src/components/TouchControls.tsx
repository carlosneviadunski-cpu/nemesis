import { useEffect, useRef } from "react";
import type { Game } from "../game/engine";

interface Props {
  game: Game;
  landscape: boolean;
}

const RADIUS = 56;

/**
 * Joysticks virtuais flutuantes (twin-stick):
 *  - metade esquerda da tela: mover
 *  - metade direita: mirar (e atirar quando o analógico passa de 30%)
 * Atualiza o DOM diretamente para manter 60 fps em celulares.
 */
export function TouchControls({ game, landscape }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const leftBase = useRef<HTMLDivElement>(null);
  const leftKnob = useRef<HTMLDivElement>(null);
  const rightBase = useRef<HTMLDivElement>(null);
  const rightKnob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    type Stick = { id: number | null; ox: number; oy: number; base: HTMLDivElement | null; knob: HTMLDivElement | null };
    const move: Stick = { id: null, ox: 0, oy: 0, base: leftBase.current, knob: leftKnob.current };
    const aim: Stick = { id: null, ox: 0, oy: 0, base: rightBase.current, knob: rightKnob.current };

    const show = (s: Stick, x: number, y: number) => {
      if (!s.base) return;
      s.base.style.opacity = "1";
      s.base.style.transform = `translate(${x - RADIUS - 8}px, ${y - RADIUS - 8}px)`;
      if (s.knob) s.knob.style.transform = "translate(0px, 0px)";
    };
    const hide = (s: Stick) => {
      if (s.base) s.base.style.opacity = "0";
    };
    const update = (s: Stick, cx: number, cy: number) => {
      const dx = cx - s.ox;
      const dy = cy - s.oy;
      const mag = Math.hypot(dx, dy);
      const k = mag > RADIUS ? RADIUS / mag : 1;
      const kx = dx * k;
      const ky = dy * k;
      if (s.knob) s.knob.style.transform = `translate(${kx}px, ${ky}px)`;
      const nx = kx / RADIUS;
      const ny = ky / RADIUS;
      if (s === move) {
        game.touch.moveX = nx;
        game.touch.moveY = ny;
      } else {
        if (mag > 4) {
          game.touch.aimX = nx;
          game.touch.aimY = ny;
        }
        game.touch.aimMag = Math.min(1, mag / RADIUS);
        game.touch.aimActive = true;
      }
    };
    const release = (s: Stick) => {
      s.id = null;
      hide(s);
      if (s === move) {
        game.touch.moveX = 0;
        game.touch.moveY = 0;
      } else {
        game.touch.aimActive = false;
        game.touch.aimMag = 0;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const isLeft = e.clientX < window.innerWidth / 2;
      const s = isLeft ? move : aim;
      if (s.id !== null) return;
      s.id = e.pointerId;
      s.ox = e.clientX;
      s.oy = e.clientY;
      show(s, e.clientX, e.clientY);
      try {
        layer.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      update(s, e.clientX, e.clientY);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      const s = e.pointerId === move.id ? move : e.pointerId === aim.id ? aim : null;
      if (!s) return;
      update(s, e.clientX, e.clientY);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === move.id) release(move);
      else if (e.pointerId === aim.id) release(aim);
    };

    layer.addEventListener("pointerdown", onDown);
    layer.addEventListener("pointermove", onMove);
    layer.addEventListener("pointerup", onUp);
    layer.addEventListener("pointercancel", onUp);
    layer.addEventListener("lostpointercapture", onUp);
    return () => {
      layer.removeEventListener("pointerdown", onDown);
      layer.removeEventListener("pointermove", onMove);
      layer.removeEventListener("pointerup", onUp);
      layer.removeEventListener("pointercancel", onUp);
      layer.removeEventListener("lostpointercapture", onUp);
      release(move);
      release(aim);
    };
  }, [game]);

  const baseCls = "pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-full border-2 border-white/25 bg-white/5 opacity-0 backdrop-blur-sm transition-opacity duration-100";
  const knobCls = "absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full border border-white/40 shadow-lg";

  return (
    <div ref={layerRef} className="fixed inset-0 z-10 touch-none select-none" style={{ touchAction: "none" }}>
      {/* Dicas de zona */}
      <div className={`pointer-events-none absolute text-[11px] font-semibold uppercase tracking-widest text-white/30 ${landscape ? "bottom-6 left-6" : "bottom-28 left-6"}`}>
        ◐ Mover
      </div>
      <div className={`pointer-events-none absolute text-right text-[11px] font-semibold uppercase tracking-widest text-white/30 ${landscape ? "bottom-6 right-24" : "bottom-28 right-6"}`}>
        Mirar / Atirar ◑
      </div>
      <div ref={leftBase} className={baseCls}>
        <div ref={leftKnob} className={`${knobCls} bg-sky-400/70`} />
      </div>
      <div ref={rightBase} className={baseCls}>
        <div ref={rightKnob} className={`${knobCls} bg-rose-400/70`} />
      </div>
    </div>
  );
}
