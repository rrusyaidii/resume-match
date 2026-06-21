import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";

interface AnalyzeButtonProps {
  isAnalyzing: boolean;
  disabled: boolean;
  limitReached?: boolean;
  remaining?: number;
  unlocked?: boolean;
  fileCount?: number;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function helperText(
  disabled: boolean,
  isAnalyzing: boolean,
  limitReached: boolean,
  remaining: number | undefined,
  unlocked: boolean,
  fileCount: number
) {
  if (limitReached && !isAnalyzing) {
    return "Enter your access code to continue";
  }
  if (disabled && !isAnalyzing) {
    return "Upload a resume and paste the job description to continue";
  }
  if (fileCount > 1 && !unlocked) {
    return "Batch uses 1 analysis credit";
  }
  if (!unlocked && remaining !== undefined && remaining > 0) {
    return `${remaining} of ${FREE_ANALYSIS_LIMIT} free analyses left · Typical time: 5–15 seconds`;
  }
  return "Typical analysis time: 5–15 seconds";
}

function buttonLabel(isAnalyzing: boolean, fileCount: number): string {
  if (isAnalyzing) {
    return fileCount > 1 ? "Comparing resumes..." : "Analyzing resume...";
  }
  if (fileCount > 1) {
    return `Compare ${fileCount} resumes`;
  }
  return "Analyze match";
}

export function AnalyzeButton({
  isAnalyzing,
  disabled,
  limitReached = false,
  remaining,
  unlocked = false,
  fileCount = 1,
}: AnalyzeButtonProps) {
  const isInactive = disabled || isAnalyzing;

  return (
    <div className="pt-2">
      <button
        type="submit"
        disabled={isInactive}
        className={`flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-4 text-sm font-semibold transition-all focus-ring ${
          isInactive
            ? "cursor-not-allowed bg-border text-muted"
            : "bg-teal text-white shadow-md shadow-teal/25 hover:bg-teal/90 hover:shadow-lg hover:shadow-teal/30 active:scale-[0.99]"
        }`}
        aria-busy={isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Spinner />
            {buttonLabel(true, fileCount)}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            {buttonLabel(false, fileCount)}
          </>
        )}
      </button>
      <p className="mt-2.5 text-center text-xs text-muted px-1 break-words">
        {helperText(disabled, isAnalyzing, limitReached, remaining, unlocked, fileCount)}
      </p>
    </div>
  );
}
