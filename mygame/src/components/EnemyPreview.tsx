import { useEffect, useRef } from "react";
import { drawEnemyFigure } from "../game/anatomy";
import type { EnemyDef } from "../game/types";
import { rgba } from "../game/utils";

interface Props {
  def: EnemyDef;
  size?: number;
  className?: string;
  animate?: boolean;
  dim?: boolean;
}

/** Pré-visualização em Canvas de um inimigo com sua anatomia (canos conforme o padrão de tiro). */
export function EnemyPreview({ def, size = 64, className, animate = false, dim = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      if (!dim) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
        grad.addColorStop(0, rgba(def.color, 0.2));
        grad.addColorStop(1, rgba(def.color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      // raio em px: deixa espaço para os canos mais longos
      const r = size / 2 / 3.1;
      const rot = animate ? -Math.PI / 2 + (def.rotateSpeed > 0 ? t * def.rotateSpeed : Math.sin(t * 1.3) * 0.25) : -Math.PI / 2;
      const aim = animate ? -Math.PI / 2 + Math.sin(t * 1.3) * 0.25 : -Math.PI / 2;
      if (dim) ctx.filter = "grayscale(1) opacity(0.5)";
      drawEnemyFigure(ctx, cx, cy + size * 0.05, r, def, rot, aim, { time: t, boss: def.boss });
      ctx.filter = "none";
      if (animate) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [def, size, animate, dim]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}
