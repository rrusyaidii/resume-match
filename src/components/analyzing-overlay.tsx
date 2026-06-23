"use client";

import { useEffect, useState } from "react";

export interface BatchProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface CompletedFile {
  fileName: string;
  success: boolean;
}

interface AnalyzingOverlayProps {
  batch?: boolean;
  fileCount?: number;
  progress?: BatchProgress;
  completedFiles?: CompletedFile[];
  pendingFiles?: string[];
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-teal"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

const SINGLE_STEPS = [
  { id: 1, label: "Reading resume…", delayMs: 0 },
  { id: 2, label: "Scoring against job description…", delayMs: 3000 },
] as const;

export function AnalyzingOverlay({
  batch = false,
  fileCount = 1,
  progress,
  completedFiles = [],
  pendingFiles = [],
}: AnalyzingOverlayProps) {
  const [activeStep, setActiveStep] = useState(1);
  const showRealBatchProgress = batch && progress && progress.total > 1;

  useEffect(() => {
    if (showRealBatchProgress) return;
    const steps = SINGLE_STEPS;
    const timers = steps.slice(1).map((step) =>
      window.setTimeout(() => setActiveStep(step.id), step.delayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [showRealBatchProgress]);

  if (showRealBatchProgress) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex justify-center mb-6">
          <Spinner />
        </div>

        <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl mb-2">
          Analyzing {progress.current} of {progress.total}
        </h2>
        <p className="text-sm text-muted mb-8 truncate max-w-md mx-auto" title={progress.fileName}>
          {progress.fileName}
        </p>

        <ul className="mx-auto max-w-md space-y-2 text-left">
          {completedFiles.map((item) => (
            <li
              key={item.fileName}
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm bg-match/5 text-ink"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-match/15 text-match text-xs font-bold">
                ✓
              </span>
              <span className="truncate">{item.fileName}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm bg-teal/10 text-ink font-medium">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-white text-xs font-bold">
              …
            </span>
            <span className="truncate">{progress.fileName}</span>
          </li>
          {pendingFiles.map((name) => (
            <li
              key={name}
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-muted/50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-border/60 text-muted text-xs font-bold">
                ·
              </span>
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const steps = SINGLE_STEPS;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex justify-center mb-6">
        <Spinner />
      </div>

      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl mb-2">
        {batch ? `Comparing ${fileCount} resumes` : "Analyzing your resume"}
      </h2>
      <p className="text-sm text-muted mb-8">
        {batch ? "This may take a minute for larger batches" : "This usually takes 10–30 seconds"}
      </p>

      <ol className="mx-auto max-w-sm space-y-3 text-left">
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          const isDone = activeStep > step.id;

          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-teal/10 text-ink font-medium"
                  : isDone
                    ? "text-muted"
                    : "text-muted/50"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? "bg-match/15 text-match"
                    : isActive
                      ? "bg-teal text-white"
                      : "bg-border/60 text-muted"
                }`}
                aria-hidden
              >
                {isDone ? "✓" : step.id}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
