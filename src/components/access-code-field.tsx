"use client";

import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";

interface AccessCodeFieldProps {
  remaining: number;
  unlocked: boolean;
  onRequestUnlock: () => void;
}

export function AccessCodeField({
  remaining,
  unlocked,
  onRequestUnlock,
}: AccessCodeFieldProps) {
  if (unlocked) {
    return (
      <p className="text-center text-xs text-match font-medium">
        Full access
      </p>
    );
  }

  if (remaining === 0) {
    return (
      <p className="text-center">
        <button
          type="button"
          onClick={onRequestUnlock}
          className="min-h-11 px-3 py-2.5 text-xs font-medium text-teal hover:text-teal/80 transition-colors focus-ring rounded"
        >
          Have an access code?
        </button>
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
      <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
        {remaining} of {FREE_ANALYSIS_LIMIT} free runs left
      </span>
      <button
        type="button"
        onClick={onRequestUnlock}
        className="min-h-11 px-3 py-2.5 text-xs font-medium text-teal hover:text-teal/80 transition-colors focus-ring rounded"
      >
        Have an access code?
      </button>
    </div>
  );
}
