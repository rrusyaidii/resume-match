"use client";

import { JD_MIN_CHARS, validateJobDescription } from "@/lib/validate-job-description";

interface JobDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobDescriptionField({ value, onChange }: JobDescriptionFieldProps) {
  const charCount = value.trim().length;
  const validation = validateJobDescription(value);
  const isValid = validation.valid;

  return (
    <div>
      <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal/10 text-xs font-bold text-teal">
            2
          </span>
          <label htmlFor="job-description" className="text-sm font-semibold text-ink">
            Job description
          </label>
        </div>
        <span
          className={`text-xs font-medium tabular-nums self-start sm:self-auto ${isValid ? "text-muted" : "text-caution"}`}
          aria-live="polite"
        >
          {isValid ? (
            <>{charCount.toLocaleString()} characters</>
          ) : (
            <>{charCount} / {JD_MIN_CHARS} characters required</>
          )}
        </span>
      </div>
      <textarea
        id="job-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Paste the full job description — include required skills, experience level, and responsibilities for the most accurate analysis..."
        className="block w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base sm:text-sm text-ink leading-relaxed placeholder:text-muted/50 focus-ring focus:border-teal resize-y transition-colors sm:min-h-[12rem]"
        required
      />
      {!isValid && charCount > 0 && validation.error && (
        <p className="mt-2 text-xs text-caution">{validation.error}</p>
      )}
    </div>
  );
}

export { JD_MIN_CHARS };
