"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  accent?: "co2" | "ch4" | "good" | "brand";
  hint?: string;
}

const ACCENTS: Record<string, string> = {
  co2: "text-co2",
  ch4: "text-ch4",
  good: "text-good",
  brand: "text-brand",
};

export function KpiCard({ label, value, suffix = "", decimals = 0, accent = "brand", hint }: KpiCardProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        v: value,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => {
          if (el) el.textContent = obj.v.toFixed(decimals);
        },
      });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-raised/60 p-5 shadow-card transition-colors duration-200 hover:border-border-strong">
      <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className={`mt-2 font-display text-3xl font-medium tabular ${ACCENTS[accent]}`}>
        <span ref={ref}>0</span>
        {suffix}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
