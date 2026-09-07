"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RegionGasPicker } from "@/components/RegionGasPicker";

const PAGES = [
  { href: "/", label: "Command Center", n: "01" },
  { href: "/explorer", label: "Explorer", n: "02" },
  { href: "/downscaler", label: "Downscaler Lab", n: "03" },
  { href: "/events", label: "Event Radar", n: "04" },
  { href: "/natural-carbon", label: "Natural Carbon", n: "05" },
  { href: "/regions", label: "Region Intel", n: "06" },
  { href: "/copilot", label: "Copilot", n: "07" },
  { href: "/decision-studio", label: "Decision Studio", n: "08" },
  { href: "/model-transparency", label: "Model", n: "09" },
];

export function Nav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const el = itemRefs.current[pathname];
    const container = containerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setIndicator({ left: elRect.left - containerRect.left + container.scrollLeft, width: elRect.width, ready: true });
    }
  }, [pathname]);

  useEffect(() => {
    const handle = () => {
      const el = itemRefs.current[pathname];
      const container = containerRef.current;
      if (el && container) {
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setIndicator({ left: elRect.left - containerRect.left + container.scrollLeft, width: elRect.width, ready: true });
      }
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse-soft" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            GHG Intelligence <span className="text-brand">Nexus</span>
          </span>
        </Link>

        <nav
          ref={containerRef}
          className="no-scrollbar relative flex flex-1 items-center gap-0.5 overflow-x-auto"
        >
          {indicator.ready && (
            <span
              className="absolute bottom-0 h-[2px] rounded-full bg-brand transition-[left,width] duration-[250ms] ease-out-strong"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
          {PAGES.map((p) => {
            const active = pathname === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                ref={(el) => {
                  itemRefs.current[p.href] = el;
                }}
                className={`shrink-0 whitespace-nowrap rounded-lg px-2 py-2 text-[12.5px] font-medium transition-colors duration-150 ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span className="mr-1 font-mono text-[10px] text-faint">{p.n}</span>
                {p.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0">
          <RegionGasPicker compact />
        </div>
      </div>
    </header>
  );
}
