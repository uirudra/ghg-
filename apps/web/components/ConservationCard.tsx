"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { formatNumber } from "@/lib/format";

interface ConservationCardProps {
  coarseTotal: number;
  fineTotal: number;
  conservationError: number;
  unit: string;
}

export function ConservationCard({ coarseTotal, fineTotal, conservationError, unit }: ConservationCardProps) {
  const checkRef = useRef<SVGPathElement>(null);
  const passes = conservationError < 1e-4;

  useEffect(() => {
    const path = checkRef.current;
    if (!path || !passes) return;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    const tween = gsap.to(path, { strokeDashoffset: 0, duration: 0.5, delay: 0.15, ease: "power2.out" });
    return () => {
      tween.kill();
    };
  }, [passes]);

  return (
    <div className="rounded-2xl border border-good/25 bg-good/[0.04] p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good/15">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
            <path
              ref={checkRef}
              d="M5 13l4 4L19 7"
              stroke="#34d399"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[13px] font-medium text-good">Mass conservation verified</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="font-mono text-lg text-ink tabular">{formatNumber(coarseTotal, 1)}</div>
          <div className="mt-0.5 text-[11px] text-faint">Coarse total ({unit})</div>
        </div>
        <div className="flex items-center justify-center text-faint">=</div>
        <div>
          <div className="font-mono text-lg text-ink tabular">{formatNumber(fineTotal, 1)}</div>
          <div className="mt-0.5 text-[11px] text-faint">ML-downscaled total ({unit})</div>
        </div>
      </div>
      <div className="mt-3 border-t border-good/15 pt-3 text-center font-mono text-[11px] text-muted">
        conservation error = {conservationError.toExponential(2)}
      </div>
    </div>
  );
}
