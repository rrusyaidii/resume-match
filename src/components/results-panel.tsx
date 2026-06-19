"use client";

import { useEffect, useRef, useState } from "react";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { ScoreGauge } from "./score-gauge";
import { InsightList, RecommendationsList } from "./insight-list";
import { getTierMeta } from "./results-utils";

interface ResultsPanelProps {
  result: AIAnalysisResult;
  resumeFileName?: string;
  jobDescription?: string;
  onReset: () => void;
}

export function ResultsPanel({ result, resumeFileName, jobDescription, onReset }: ResultsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = getTierMeta(result.matchScore);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { downloadAnalysisReport } = await import("@/lib/generate-report-pdf");
      downloadAnalysisReport(result, { resumeFileName, jobDescription });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={panelRef} className="results-enter" aria-live="polite">
      <article className="report-card overflow-hidden rounded-2xl border border-border shadow-2xl">
        <div
          className="relative border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
          style={{ background: `linear-gradient(135deg, ${meta.bg} 0%, var(--card) 60%)` }}
        >
          <div className="report-grid absolute inset-0 opacity-[0.04] pointer-events-none" />

          <div className="relative flex flex-col gap-3 mb-6 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />
                Analysis complete
              </span>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-teal hover:text-teal/80 transition-colors focus-ring rounded self-start sm:self-auto"
            >
              New analysis →
            </button>
          </div>

          <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:text-left">
            <ScoreGauge score={result.matchScore} />

            <div className="flex-1 min-w-0 space-y-3">
              <p
                className="font-display text-2xl sm:text-3xl lg:text-[2.5rem] font-semibold leading-tight tracking-tight"
                style={{ color: meta.color }}
              >
                {meta.label}
              </p>
              <p className="text-lg font-medium text-ink/80">{meta.headline}</p>
              <p className="text-sm leading-relaxed text-muted max-w-prose border-l-0 pl-0 lg:border-l-2 lg:border-border lg:pl-4">
                {result.summary}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex items-start gap-4 border-b border-border px-4 py-5 sm:px-6 lg:px-10"
          style={{ background: "var(--report-verdict-bg)" }}
        >
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: meta.bg, color: meta.color }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">
              Hiring verdict
            </p>
            <p className="text-base font-semibold leading-relaxed text-ink">
              {result.verdict}
            </p>
          </div>
        </div>

        <div className="grid gap-8 border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-2 lg:px-10 lg:py-10">
          <InsightList title="Key strengths" items={result.strengths} variant="strengths" />
          <InsightList title="Critical gaps" items={result.gaps} variant="gaps" />
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <RecommendationsList items={result.recommendations} />
        </div>
      </article>

      <div className="mt-8 flex flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-center sm:gap-4">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-surface disabled:opacity-50 transition-colors focus-ring"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {isDownloading ? "Generating PDF..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto rounded-xl bg-teal px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-teal/90 transition-colors focus-ring"
        >
          Analyze another resume
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Powered by AI · Results in seconds</p>
    </div>
  );
}
