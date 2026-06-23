"use client";

import { JD_MIN_CHARS, validateJobDescription } from "@/lib/validate-job-description";
import type { RecentJd } from "@/lib/recent-jds";

interface JobDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  recentJds?: RecentJd[];
  onSelectRecent?: (text: string) => void;
  onRemoveRecent?: (id: string) => void;
}

export function JobDescriptionField({
  value,
  onChange,
  recentJds = [],
  onSelectRecent,
  onRemoveRecent,
}: JobDescriptionFieldProps) {
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

      {recentJds.length > 0 && onSelectRecent && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="w-full text-xs font-medium text-muted">Recent:</span>
          {recentJds.map((item) => (
            <span key={item.id} className="inline-flex items-center max-w-full">
              <button
                type="button"
                onClick={() => onSelectRecent(item.text)}
                className="inline-flex max-w-[14rem] items-center rounded-l-lg border border-r-0 border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-teal/5 hover:border-teal/30 transition-colors focus-ring truncate"
                title={item.text}
              >
                {item.label}
              </button>
              {onRemoveRecent && (
                <button
                  type="button"
                  onClick={() => onRemoveRecent(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="inline-flex h-[30px] w-8 items-center justify-center rounded-r-lg border border-border bg-surface text-muted hover:text-gap hover:bg-gap/5 transition-colors focus-ring"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

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
