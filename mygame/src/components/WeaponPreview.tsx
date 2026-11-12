import { useEffect, useRef } from "react";
import { drawPlayerTank } from "../game/anatomy";
import type { Weapon } from "../game/types";
import { rgba } from "../game/utils";

interface Props {
  weapon: Weapon;
  size?: number;
  className?: string;
  animate?: boolean;
}

/** Pré-visualização em Canvas do tanque com os canos da arma. */
export function WeaponPreview({ weapon, size = 120, className, animate = true }: Props) {
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
      const ppb = size / 3.4;
      const cx = size / 2;
      const cy = size / 2;
      // halo suave na cor da arma
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      grad.addColorStop(0, rgba(weapon.color, 0.22));
      grad.addColorStop(1, rgba(weapon.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const q = (i / 4) * size;
        ctx.beginPath();
        ctx.moveTo(q, 0);
        ctx.lineTo(q, size);
        ctx.moveTo(0, q);
        ctx.lineTo(size, q);
        ctx.stroke();
      }
      const angle = animate ? -Math.PI / 2 + Math.sin(t * 1.2) * 0.35 : -Math.PI / 2;
      drawPlayerTank(ctx, cx, cy + size * 0.08, ppb, angle, weapon, "#38bdf8", undefined, 0, animate ? 0.4 + 0.3 * Math.sin(t * 2) : 0, weapon.tier);
      if (animate) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [weapon, size, animate]);

  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}
