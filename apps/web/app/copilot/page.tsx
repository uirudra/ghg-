"use client";

import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, CopilotGuide } from "@/lib/api";
import { Card, SectionLabel, Spinner, Button } from "@/components/ui";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  provider?: string | null;
  citations?: string[];
}

export default function Copilot() {
  const { regionId, gas, lastDownscaleResult } = useSelection();
  const [guide, setGuide] = useState<CopilotGuide | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.copilotGuide().then(setGuide);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (query: string) => {
    if (!query.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.copilotQuery({
        query,
        region_id: regionId,
        gas,
        downscale_result: lastDownscaleResult,
      });
      setMessages((m) => [...m, { role: "assistant", text: res.response, provider: res.provider, citations: res.citations }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Request failed: ${e instanceof Error ? e.message : "unknown error"}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell
      eyebrow="07 · AI GHG Copilot"
      title="Ask the Copilot"
      description="Grounded Q&A over the datasets, region, methane events, and your last downscaling run — served by GroqCloud with automatic Gemini fallback."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <button
              onClick={() => setGuideOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <SectionLabel>{guide?.title ?? "How to use this Copilot"}</SectionLabel>
              <span className="text-faint transition-transform duration-200" style={{ transform: guideOpen ? "rotate(180deg)" : "none" }}>
                ▾
              </span>
            </button>
            {guideOpen && guide && (
              <div className="space-y-4 text-[12px] leading-relaxed">
                <p className="text-muted">{guide.summary}</p>
                <div>
                  <div className="mb-1.5 font-medium text-ink">Steps</div>
                  <ol className="list-decimal space-y-1.5 pl-4 text-muted">
                    {guide.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="mb-1.5 font-medium text-ink">Guardrails</div>
                  <ul className="list-disc space-y-1 pl-4 text-muted">
                    {guide.guardrails.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border pt-3 text-faint">{guide.providers}</div>
              </div>
            )}
          </Card>

          {guide && (
            <Card>
              <SectionLabel>Try asking</SectionLabel>
              <div className="flex flex-col gap-2">
                {guide.example_questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-[12px] text-muted transition-colors duration-150 hover:border-brand/50 hover:text-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {!lastDownscaleResult && (
            <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-[11px] leading-relaxed text-warn">
              No downscaling run attached yet — visit the Downscaler Lab first if you want the Copilot to cite a
              specific run's numbers.
            </div>
          )}
        </div>

        <Card className="flex h-[600px] flex-col overflow-hidden !p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-[13px] text-faint">
                Ask a question about {regionId.replace(/-/g, " ")} or pick one from the left.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} data-reveal className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-brand text-white" : "border border-border bg-raised text-ink"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.role === "assistant" && (m.provider || (m.citations && m.citations.length > 0)) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                      {m.provider && <ProvenanceBadge label="AI-explained" />}
                      {m.provider && <span className="text-[10px] uppercase tracking-wide text-faint">via {m.provider}</span>}
                      {m.citations?.map((c) => (
                        <span key={c} className="rounded-full bg-overlay px-2 py-0.5 font-mono text-[10px] text-faint">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-raised px-4 py-2.5 text-[13px] text-muted">
                  <Spinner /> thinking…
                </div>
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this region's emissions, events, or your last run…"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none transition-colors duration-150 focus:border-brand"
            />
            <Button variant="primary" type="submit" disabled={sending}>
              Send
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
