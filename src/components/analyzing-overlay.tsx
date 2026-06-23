"use client";

import { useEffect, useState } from "react";

const SINGLE_STEPS = [
  { id: 1, label: "Reading resume…", delayMs: 0 },
  { id: 2, label: "Scoring against job description…", delayMs: 3000 },
] as const;

const BATCH_STEPS = [
  { id: 1, label: "Reading resumes…", delayMs: 0 },
  { id: 2, label: "Scoring candidates…", delayMs: 3000 },
] as const;

interface AnalyzingOverlayProps {
  batch?: boolean;
  fileCount?: number;
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

export function AnalyzingOverlay({ batch = false, fileCount = 1 }: AnalyzingOverlayProps) {
  const steps = batch ? BATCH_STEPS : SINGLE_STEPS;
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timers = steps.slice(1).map((step) =>
      window.setTimeout(() => setActiveStep(step.id), step.delayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);

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
