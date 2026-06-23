"use client";

import { useEffect, useRef, useState } from "react";
import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
import { ResultsPanel } from "./results-panel";
import { getTierMeta } from "./results-utils";

interface BatchComparisonPanelProps {
  results: BatchResultItem[];
  jobDescription: string;
  onReset: () => void;
}

export function BatchComparisonPanel({
  results,
  jobDescription,
  onReset,
}: BatchComparisonPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedFileName, setExpandedFileName] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const successful = results
    .filter((item): item is BatchResultItem & { success: true; data: AIAnalysisResult } =>
      item.success && !!item.data
    )
    .sort((a, b) => b.data.matchScore - a.data.matchScore);

  const failed = results.filter((item) => !item.success);

  const expanded = successful.find((item) => item.fileName === expandedFileName);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    if (!expandedFileName) {
      setShowBackToTop(false);
      return;
    }

    const updateVisibility = () => {
      const el = panelRef.current;
      if (!el || !expandedFileName) {
        setShowBackToTop(false);
        return;
      }
      setShowBackToTop(el.getBoundingClientRect().top < -48);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [expandedFileName]);

  const scrollToComparisonTop = () => {
    const el = panelRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const toggleExpand = (fileName: string) => {
    setExpandedFileName((current) => (current === fileName ? null : fileName));
  };

  const handleDownloadPdf = async (result: AIAnalysisResult, resumeFileName: string) => {
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
    <div ref={panelRef} className="results-enter space-y-8" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Candidate comparison
          </h2>
          <p className="mt-1 text-sm text-muted">
            {successful.length} ranked by match score
            {failed.length > 0 ? ` · ${failed.length} failed` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="self-start min-h-11 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-teal/90 transition-colors focus-ring"
        >
          New analysis
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {successful.map((item, index) => {
          const meta = getTierMeta(item.data.matchScore);
          const isExpanded = expandedFileName === item.fileName;

          return (
            <button
              key={item.fileName}
              type="button"
              onClick={() => toggleExpand(item.fileName)}
              className={`text-left rounded-2xl border p-5 transition-all focus-ring ${
                isExpanded
                  ? "border-teal bg-teal/5 shadow-md"
                  : "border-border bg-card hover:border-teal/30 hover:shadow-sm"
              }`}
              aria-expanded={isExpanded}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                {index < 3 && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    #{index + 1}
                  </span>
                )}
                <span
                  className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  {item.data.decision}
                </span>
              </div>

              <p className="font-mono text-4xl font-bold leading-none mb-1" style={{ color: meta.color }}>
                {item.data.matchScore}
                <span className="text-lg text-muted">%</span>
              </p>
              <p className="text-sm font-medium text-ink truncate" title={item.fileName}>
                {item.fileName}
              </p>
              <p className="mt-2 text-xs text-muted">
                {isExpanded ? "Hide full report" : "View full report"}
              </p>
            </button>
          );
        })}
      </div>

      {failed.length > 0 && (
        <div className="rounded-2xl border border-gap/30 bg-gap/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-gap">Could not analyze</p>
          <ul className="space-y-2">
            {failed.map((item) => (
              <li key={item.fileName} className="text-sm">
                <span className="font-medium text-ink">{item.fileName}</span>
                <span className="text-muted"> — </span>
                <span className="text-gap">{item.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-ink truncate" title={expanded.fileName}>
              {expanded.fileName}
            </p>
            <button
              type="button"
              onClick={() => handleDownloadPdf(expanded.data, expanded.fileName)}
              disabled={isDownloading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-surface disabled:opacity-50 transition-colors focus-ring"
            >
              {isDownloading ? "Opening report..." : "View PDF report"}
            </button>
          </div>
          <ResultsPanel
            result={expanded.data}
            resumeFileName={expanded.fileName}
            jobDescription={jobDescription}
            onReset={onReset}
            showActions={false}
            scrollOnMount={false}
          />
        </div>
      )}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToComparisonTop}
          aria-label="Back to comparison"
          className="fixed bottom-6 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-teal text-white shadow-lg shadow-teal/30 hover:bg-teal/90 transition-colors focus-ring mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
