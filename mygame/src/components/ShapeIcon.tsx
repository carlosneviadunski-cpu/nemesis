import type { ShapeKind } from "../game/types";
import { shade, shapePoints } from "../game/utils";

interface Props {
  shape: ShapeKind;
  color: string;
  size?: number;
  rotation?: number; // graus
  className?: string;
  glow?: boolean;
}

export function ShapeIcon({ shape, color, size = 40, rotation = -90, className, glow }: Props) {
  const c = size / 2;
  const r = size * 0.4;
  const stroke = shade(color, -0.4);
  const sw = Math.max(1.5, size * 0.06);
  const style = glow ? { filter: `drop-shadow(0 0 ${size * 0.15}px ${color})` } : undefined;

  if (shape === "circle") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style}>
        <circle cx={c} cy={c} r={r} fill={color} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }
  if (shape === "ring") {
    const ri = r * 0.5;
    const d = `M ${c + r} ${c} A ${r} ${r} 0 1 0 ${c - r} ${c} A ${r} ${r} 0 1 0 ${c + r} ${c} Z M ${c + ri} ${c} A ${ri} ${ri} 0 1 0 ${c - ri} ${c} A ${ri} ${ri} 0 1 0 ${c + ri} ${c} Z`;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style}>
        <path d={d} fill={color} stroke={stroke} strokeWidth={sw} fillRule="evenodd" strokeLinejoin="round" />
      </svg>
    );
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts = shapePoints(shape, r)
    .map((p) => `${(c + p.x * cos - p.y * sin).toFixed(2)},${(c + p.x * sin + p.y * cos).toFixed(2)}`)
    .join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style}>
      <polygon points={pts} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
}
