"use client";

import { useEffect, useState } from "react";

export interface BatchProgress {
  current: number;
  total: number;
  fileName: string;
}

interface AnalyzingOverlayProps {
  batch?: boolean;
  fileCount?: number;
  progress?: BatchProgress;
}

const SINGLE_STATUS = [
  "Reading resume…",
  "Scoring against job description…",
  "Preparing verdict…",
] as const;

const BATCH_STATUS = [
  "Comparing candidates…",
  "Scoring each resume…",
] as const;

const STATUS_CYCLE_MS = 4000;

function ReviewLoader() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center" aria-hidden>
      <div className="review-loader-pulse absolute inset-0 rounded-full bg-teal/20" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
        <svg className="review-loader-ring h-12 w-12" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="80 126"
            className="text-teal"
          />
        </svg>
      </div>
    </div>
  );
}

function StatusLine({ phrases }: { phrases: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phrases.length <= 1) return;

    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % phrases.length);
        setVisible(true);
      }, 200);
    }, STATUS_CYCLE_MS);

    return () => window.clearInterval(interval);
  }, [phrases]);

  return (
    <p
      className={`text-sm text-muted transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {phrases[index]}
    </p>
  );
}

export function AnalyzingOverlay({
  batch = false,
  fileCount = 1,
  progress,
}: AnalyzingOverlayProps) {
  const showBatchProgress = batch && progress && progress.total > 1;

  return (
    <div
      className="analyzing-enter form-rail rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="workflow-section-label mb-6">Review in progress</p>

      <div className="flex justify-center mb-8">
        <ReviewLoader />
      </div>

      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl mb-3">
        {showBatchProgress
          ? `Reviewing resume ${progress.current} of ${progress.total}`
          : batch
            ? `Comparing ${fileCount} resumes`
            : "Reviewing against the job description"}
      </h2>

      {showBatchProgress ? (
        <p className="text-sm text-muted truncate max-w-md mx-auto" title={progress.fileName}>
          {progress.fileName}
        </p>
      ) : (
        <StatusLine phrases={batch ? BATCH_STATUS : SINGLE_STATUS} />
      )}
    </div>
  );
}
