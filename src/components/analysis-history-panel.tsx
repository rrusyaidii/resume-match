"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/history-types";
import { getTierMeta } from "@/components/results-utils";

interface AnalysisHistoryPanelProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onRemove: (entryId: string) => void;
  disabled?: boolean;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AnalysisHistoryPanel({
  entries,
  onSelect,
  onClear,
  onRemove,
  disabled = false,
}: AnalysisHistoryPanelProps) {
  const [open, setOpen] = useState(entries.length > 0);

  if (entries.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b border-border">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 flex-1 items-center gap-2 text-left text-sm font-semibold text-ink focus-ring rounded-lg"
        >
          <svg
            className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          Recent analyses
          <span className="text-xs font-medium text-muted">({entries.length})</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-xs font-medium text-muted hover:text-gap transition-colors min-h-11 px-2 focus-ring rounded-lg disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      {open && (
        <ul className="divide-y divide-border max-h-80 overflow-y-auto">
          {entries.map((entry) => {
            const tier = getTierMeta(entry.matchScore);
            return (
              <li key={entry.id} className="flex items-start gap-2 px-4 py-3 sm:px-5 hover:bg-surface/80">
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  disabled={disabled}
                  className="min-h-11 flex-1 text-left focus-ring rounded-lg disabled:opacity-50"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: tier.bg,
                        color: tier.color,
                        border: `1px solid ${tier.border}`,
                      }}
                    >
                      {entry.matchScore}%
                    </span>
                    <span className="text-xs text-muted">{formatWhen(entry.analyzedAt)}</span>
                    {entry.isBatch && (
                      <span className="text-xs text-teal font-medium">
                        Batch · {entry.batchCount ?? entry.batchResults?.length ?? 0}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink truncate">{entry.resumeFileName}</p>
                  <p className="text-xs text-muted truncate">{entry.jobDescriptionPreview}</p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  disabled={disabled}
                  aria-label={`Remove ${entry.resumeFileName} from history`}
                  className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-gap hover:bg-gap/5 transition-colors focus-ring disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
