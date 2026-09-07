"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-[transform,background-color,border-color,opacity] duration-150 ease-out-strong active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
  const variants: Record<string, string> = {
    primary: "bg-brand text-white hover:bg-brand/90 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]",
    secondary: "border border-border-strong bg-raised text-ink hover:border-brand/60 hover:bg-overlay",
    ghost: "text-muted hover:text-ink hover:bg-raised",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-reveal className={`rounded-2xl border border-border bg-raised/50 p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-faint">{children}</div>;
}
