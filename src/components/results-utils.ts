import { getDecisionFromScore } from "@/lib/evaluation-rubric";

export type ScoreTier = "strong" | "partial" | "weak";

export function getScoreTier(score: number): ScoreTier {
  return getDecisionFromScore(score).tier;
}

export function getTierMeta(score: number) {
  const decision = getDecisionFromScore(score);
  const tier = decision.tier;

  const color =
    tier === "strong"
      ? "var(--match)"
      : tier === "partial"
        ? "var(--caution)"
        : "var(--gap)";
  const bg =
    tier === "strong"
      ? "var(--match-bg)"
      : tier === "partial"
        ? "var(--caution-bg)"
        : "var(--gap-bg)";
  const border =
    tier === "strong"
      ? "var(--match-border)"
      : tier === "partial"
        ? "var(--caution-border)"
        : "var(--gap-border)";

  return {
    tier,
    label: decision.label,
    headline: decision.headline,
    action: decision.action,
    color,
    bg,
    border,
  };
}
