"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

const GRID = 6;
const SPAWN_MS = 850;
const LIFESPAN_MS = 2100;
const MAX_CONCURRENT = 4;

type CellState = "idle" | "active" | "hit" | "missed";

interface Cell {
  state: CellState;
  bornAt: number;
}

function emptyGrid(): Cell[] {
  return Array.from({ length: GRID * GRID }, () => ({ state: "idle", bornAt: 0 }));
}

export function MethaneHuntGame() {
  const [cells, setCells] = useState<Cell[]>(emptyGrid);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const cellRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  useEffect(() => {
    const spawnTimer = setInterval(() => {
      setCells((prev) => {
        const active = prev.filter((c) => c.state === "active").length;
        if (active >= MAX_CONCURRENT) return prev;
        const idleIdx = prev.map((c, i) => (c.state === "idle" ? i : -1)).filter((i) => i >= 0);
        if (idleIdx.length === 0) return prev;
        const pick = idleIdx[Math.floor(Math.random() * idleIdx.length)];
        const next = [...prev];
        next[pick] = { state: "active", bornAt: Date.now() };
        const el = cellRefs.current[pick];
        if (el) gsap.fromTo(el, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "power2.out" });
        return next;
      });
    }, SPAWN_MS);

    const expireTimer = setInterval(() => {
      const now = Date.now();
      setCells((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          if (c.state === "active" && now - c.bornAt > LIFESPAN_MS) {
            changed = true;
            return { state: "missed" as CellState, bornAt: c.bornAt };
          }
          if (c.state === "missed" && now - c.bornAt > LIFESPAN_MS + 300) {
            changed = true;
            return { state: "idle" as CellState, bornAt: 0 };
          }
          return c;
        });
        if (changed) setStreak(0);
        return changed ? next : prev;
      });
    }, 200);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(expireTimer);
    };
  }, []);

  const hit = (idx: number) => {
    if (cellsRef.current[idx].state !== "active") return;
    setCells((prev) => {
      const next = [...prev];
      next[idx] = { state: "hit", bornAt: Date.now() };
      return next;
    });
    setScore((s) => s + 10);
    setStreak((s) => {
      const ns = s + 1;
      setBest((b) => Math.max(b, ns));
      return ns;
    });
    const el = cellRefs.current[idx];
    if (el) {
      gsap.fromTo(el, { scale: 1 }, { scale: 1.3, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1 });
    }
    setTimeout(() => {
      setCells((prev) => {
        const next = [...prev];
        if (next[idx]?.state === "hit") next[idx] = { state: "idle", bornAt: 0 };
        return next;
      });
    }, 260);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 font-mono text-[12px] text-muted">
        <div>
          Score <span className="text-ch4 tabular">{score}</span>
        </div>
        <div>
          Streak <span className="text-good tabular">{streak}</span>
        </div>
        <div>
          Best <span className="text-ink tabular">{best}</span>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 rounded-2xl border border-border bg-black/40 p-3">
        {cells.map((cell, i) => (
          <button
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            onClick={() => hit(i)}
            disabled={cell.state !== "active"}
            aria-label={cell.state === "active" ? "Detect methane plume" : "Empty sensor cell"}
            className={`relative h-9 w-9 rounded-md border transition-colors duration-150 sm:h-10 sm:w-10 ${
              cell.state === "active"
                ? "cursor-pointer border-ch4/60 bg-ch4/25 shadow-[0_0_14px_2px_rgba(245,166,35,0.45)]"
                : cell.state === "hit"
                  ? "border-good/60 bg-good/25"
                  : cell.state === "missed"
                    ? "border-bad/40 bg-bad/10"
                    : "border-border/60 bg-white/[0.02]"
            }`}
          >
            {cell.state === "active" && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ch4">CH₄</span>
            )}
            {cell.state === "hit" && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-good">✓</span>
            )}
          </button>
        ))}
      </div>
      <p className="max-w-[260px] text-center text-[11px] leading-relaxed text-faint">
        Click the plumes before they fade — same idea as the real{" "}
        <span className="text-muted">Methane Event Radar</span>, just faster.
      </p>
    </div>
  );
}
