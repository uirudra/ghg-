"use client";

import { ReactNode } from "react";

interface PageShellProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <div className="relative mx-auto max-w-[1440px] px-6 pb-24 pt-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4" data-reveal>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">{eyebrow}</div>
          <h1 className="mt-1.5 font-display text-[28px] font-medium tracking-tight text-ink md:text-[32px]">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
