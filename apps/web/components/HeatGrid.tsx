"use client";

import { useEffect, useRef, useState } from "react";
import { colorFor, normalize } from "@/lib/colormap";

interface HeatGridProps {
  grid: number[][];
  gas: "CO2" | "CH4" | "mono";
  pixelated?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  className?: string;
}

export function HeatGrid({ grid, gas, pixelated = false, unit = "", min, max, className = "" }: HeatGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; value: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const h = grid.length;
    const w = grid[0].length;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { min: gMin, max: gMax } = normalize(grid);
    const lo = min ?? gMin;
    const hi = max ?? gMax;
    const range = hi - lo || 1;

    const imageData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = (grid[y][x] - lo) / range;
        const [r, g, b] = colorFor(gas, t);
        const idx = (y * w + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [grid, gas, min, max]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap || grid.length === 0) return;
    const rect = wrap.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const gx = Math.min(grid[0].length - 1, Math.max(0, Math.floor(relX * grid[0].length)));
    const gy = Math.min(grid.length - 1, Math.max(0, Math.floor(relY * grid.length)));
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, value: grid[gy][gx] });
  };

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-xl border border-border bg-black/40 ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: pixelated ? "pixelated" : "auto" }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border border-border-strong bg-overlay px-2 py-1 font-mono text-[11px] text-ink shadow-card"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.value.toFixed(2)} {unit}
        </div>
      )}
    </div>
  );
}
