import type { RubricDimensionScore } from "@/lib/evaluation-rubric";
import { RUBRIC_DIMENSIONS } from "@/lib/evaluation-rubric";

interface RubricBreakdownProps {
  dimensions: RubricDimensionScore[];
  decision: string;
  gateFlags?: string[];
}

function barColor(score: number): string {
  if (score >= 70) return "bg-match";
  if (score >= 40) return "bg-caution";
  return "bg-gap";
}

export function RubricBreakdown({ dimensions, decision, gateFlags }: RubricBreakdownProps) {
  return (
    <section className="border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Malaysia tech screening rubric</h3>
          <p className="text-xs text-muted mt-0.5">Weighted score across 5 dimensions</p>
        </div>
        <span className="inline-flex self-start items-center rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
          {decision}
        </span>
      </div>

      {gateFlags && gateFlags.length > 0 && (
        <div className="mb-6 rounded-xl border border-gap/30 bg-gap/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gap mb-2">
            Compliance flags
          </p>
          <ul className="space-y-1">
            {gateFlags.map((flag) => (
              <li key={flag} className="text-xs text-gap leading-relaxed">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-5">
        {dimensions.map((dim) => {
          const weight = RUBRIC_DIMENSIONS.find((d) => d.id === dim.id)?.weight ?? 0;
          return (
            <li key={dim.id}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-sm font-medium text-ink">{dim.label}</span>
                <span className="text-xs font-semibold tabular-nums text-muted shrink-0">
                  {dim.score}
                  <span className="font-normal text-muted/70"> / 100</span>
                  <span className="font-normal text-muted/50 ml-1">({weight}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-border/60 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(dim.score)}`}
                  style={{ width: `${dim.score}%` }}
                  role="progressbar"
                  aria-valuenow={dim.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dim.label}: ${dim.score} out of 100`}
                />
              </div>
              <p className="text-xs text-muted leading-relaxed">{dim.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
