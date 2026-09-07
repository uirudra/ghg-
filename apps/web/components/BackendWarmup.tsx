"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { gsap } from "@/lib/gsap";
import { MethaneHuntGame } from "@/components/MethaneHuntGame";

const GRACE_MS = 1100;
const POLL_INTERVAL_MS = 2500;
const ATTEMPT_TIMEOUT_MS = 4000;
const SKIP_AFTER_MS = 12000;
const DIAGNOSTIC_AFTER_ATTEMPTS = 6; // ~15-20s of consecutive failures

const FACTS = [
  "OCO-2 measures column CO₂ across the globe daily, at roughly 0.5° × 0.625° resolution.",
  "ODIAC resolves fossil-fuel CO₂ down to 1 km — fine enough to separate a power plant from its neighborhood.",
  "EMIT was built to study mineral dust, but turned out to be one of the best methane-plume detectors ever flown.",
  "A conserved downscale means every fine pixel in a region still sums back exactly to the original coarse estimate.",
  "The East Kolkata Wetlands are a real Ramsar site that treats the city's sewage — and produce real methane.",
  "Methane is ~80x more potent than CO₂ over a 20-year window, which is why single large leaks matter so much.",
  "Wetlands are the largest natural source of atmospheric methane on Earth — more than all human agriculture combined.",
  "MC-Dropout runs the same trained model multiple times with dropout left on, turning the spread of answers into an uncertainty estimate.",
];

type Phase = "checking" | "waiting" | "ready";

export function BackendWarmup({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [factIndex, setFactIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  // Kept mounted (separately from `phase`) until its own exit animation
  // finishes — flipping straight off `phase === "ready"` would unmount the
  // overlay in the same render that triggers the fade-out effect, so the
  // ref would already be null by the time the animation tried to run.
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const graceTimer = setTimeout(() => {
      if (!cancelled) setPhase((p) => (p === "checking" ? "waiting" : p));
    }, GRACE_MS);

    async function attempt(): Promise<{ ok: boolean; error?: string }> {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/health`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true };
      } catch (err) {
        // A generic "Failed to fetch"/TypeError here almost always means either
        // a CORS rejection or nothing listening at API_URL at all (e.g.
        // NEXT_PUBLIC_API_URL wasn't baked into the build) — the browser
        // deliberately hides the real reason from JS for CORS failures, so
        // this is as specific as we can get.
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
      } finally {
        clearTimeout(t);
      }
    }

    async function loop() {
      let attempts = 0;
      while (!cancelled) {
        const result = await attempt();
        attempts += 1;
        if (result.ok) {
          clearTimeout(graceTimer);
          if (!cancelled) setPhase("ready");
          return;
        }
        if (!cancelled) {
          setFailCount(attempts);
          setLastError(result.error ?? "unknown error");
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }
    loop();

    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;
    const factTimer = setInterval(() => setFactIndex((i) => (i + 1) % FACTS.length), 4500);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    const skipTimer = setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    return () => {
      clearInterval(factTimer);
      clearInterval(clock);
      clearTimeout(skipTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = gsap.context(() => {
      gsap.to(overlay, {
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => setOverlayVisible(false),
      });
    });
    return () => ctx.revert();
  }, [phase]);

  return (
    <>
      {overlayVisible && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-base px-6"
        >
          {phase === "checking" ? (
            <div className="flex flex-col items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse-soft" />
              <span className="font-mono text-[11px] text-faint">connecting…</span>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                  Waking up the ML backend
                </div>
                <h2 className="mt-2 font-display text-[22px] font-medium text-ink">
                  The downscaling model is warming up on a free-tier server —
                  <br className="hidden sm:block" /> this can take about a minute after inactivity.
                </h2>
                <div className="mt-2 font-mono text-[11px] text-muted">{elapsed}s elapsed</div>
              </div>

              <MethaneHuntGame />

              <div key={factIndex} className="max-w-md text-center text-[12px] leading-relaxed text-muted">
                <span className="text-faint">Meanwhile — </span>
                {FACTS[factIndex]}
              </div>

              {failCount >= DIAGNOSTIC_AFTER_ATTEMPTS && (
                <div className="max-w-md rounded-lg border border-warn/30 bg-warn/[0.06] px-4 py-3 text-left font-mono text-[11px] leading-relaxed text-warn">
                  <div>
                    {failCount} attempts to reach the API have failed — this is usually a deployment config
                    issue, not just a slow cold start:
                  </div>
                  <div className="mt-1.5 text-muted">
                    URL: <span className="text-warn">{API_URL}/health</span>
                  </div>
                  <div className="text-muted">
                    Last error: <span className="text-warn">{lastError}</span>
                  </div>
                  <div className="mt-1.5 text-muted">
                    If URL still says localhost, `NEXT_PUBLIC_API_URL` wasn&apos;t baked into this build — set it
                    and redeploy the web service. Otherwise check the API&apos;s `API_CORS_ORIGINS` allows this
                    site&apos;s origin.
                  </div>
                </div>
              )}

              {canSkip && (
                <button
                  onClick={() => setPhase("ready")}
                  className="text-[11px] text-faint underline decoration-dotted underline-offset-4 transition-colors duration-150 hover:text-muted"
                >
                  Continue without waiting
                </button>
              )}
            </>
          )}
        </div>
      )}
      {phase === "ready" && (
        <div data-reveal>
          {children}
        </div>
      )}
    </>
  );
}
