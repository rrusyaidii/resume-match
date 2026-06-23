"use client";

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
  return (
    <div
      className="form-rail rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex justify-center mb-6">
        <Spinner />
      </div>

      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl mb-2">
        Reviewing against the job description
      </h2>
      <p className="text-sm text-muted mb-8">
        {batch
          ? `Comparing ${fileCount} resumes — this may take a minute`
          : "Usually takes 10–30 seconds"}
      </p>

      <div
        className="mx-auto max-w-sm h-1 rounded-full bg-border overflow-hidden"
        role="progressbar"
        aria-valuetext="Review in progress"
      >
        <div className="progress-indeterminate h-full w-1/3 rounded-full bg-teal" />
      </div>
    </div>
  );
}
