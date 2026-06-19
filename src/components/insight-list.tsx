interface InsightListProps {
  title: string;
  items: string[];
  variant: "strengths" | "gaps";
}

function StrengthIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GapIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

export function InsightList({ title, items, variant }: InsightListProps) {
  const isStrengths = variant === "strengths";

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            isStrengths ? "bg-match/15 text-match" : "bg-gap/15 text-gap"
          }`}
        >
          {isStrengths ? <StrengthIcon /> : <GapIcon />}
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="ml-auto text-xs font-medium text-muted tabular-nums">
          {items.length}
        </span>
      </div>

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="group relative rounded-xl border border-border bg-ink/[0.02] p-4 pl-5 transition-colors hover:bg-ink/[0.04]"
          >
            <span
              className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${
                isStrengths ? "bg-match" : "bg-gap"
              }`}
            />
            <p className="text-sm leading-relaxed text-ink/90 break-words [overflow-wrap:anywhere]">{item}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface RecommendationsListProps {
  items: string[];
}

function StepIcon({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal tabular-nums">
      {n}
    </span>
  );
}

export function RecommendationsList({ items }: RecommendationsListProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15 text-teal">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-ink">Hiring recommendations</h3>
      </div>

      <ol className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl border border-teal/20 bg-teal/[0.04] p-4"
          >
            <StepIcon n={i + 1} />
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink/90 pt-0.5 break-words [overflow-wrap:anywhere]">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
