export type ScoreTier = "strong" | "partial" | "weak";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 70) return "strong";
  if (score >= 40) return "partial";
  return "weak";
}

export function getTierMeta(score: number) {
  const tier = getScoreTier(score);
  switch (tier) {
    case "strong":
      return {
        tier,
        label: "Strong match",
        headline: "Worth interviewing",
        color: "var(--match)",
        bg: "var(--match-bg)",
        border: "var(--match-border)",
      };
    case "partial":
      return {
        tier,
        label: "Partial match",
        headline: "Review before deciding",
        color: "var(--caution)",
        bg: "var(--caution-bg)",
        border: "var(--caution-border)",
      };
    default:
      return {
        tier,
        label: "Poor match",
        headline: "Likely not a fit",
        color: "var(--gap)",
        bg: "var(--gap-bg)",
        border: "var(--gap-border)",
      };
  }
}
