export interface RubricDimensionDefinition {
  id: string;
  label: string;
  weight: number;
  hint: string;
}

export interface RubricDimensionScore {
  id: string;
  label: string;
  score: number;
  note: string;
}

export interface DecisionBand {
  min: number;
  max: number;
  label: string;
  headline: string;
  action: string;
  tier: "strong" | "partial" | "weak";
}

export interface SeniorityBand {
  id: string;
  label: string;
  minYears: number;
  maxYears: number;
}

export const RUBRIC_DIMENSIONS: RubricDimensionDefinition[] = [
  {
    id: "technical_stack",
    label: "Technical stack fit",
    weight: 35,
    hint:
      "Must-have languages, frameworks, and tools from the JD. Use contextual inference (Spring Boot → Java, .NET → C#).",
  },
  {
    id: "seniority_experience",
    label: "Seniority & experience",
    weight: 25,
    hint:
      "MY bands vs JD title/years: Fresh grad (<1), Junior (1–2), Mid (2–5), Senior (5–8), Lead (8+). Project ownership depth.",
  },
  {
    id: "project_delivery",
    label: "Project & delivery evidence",
    weight: 20,
    hint:
      "Relevant products shipped, team scale, CI/CD, agile/scrum, measurable outcomes on the resume.",
  },
  {
    id: "domain_industry",
    label: "Domain & industry fit",
    weight: 10,
    hint:
      "Banking, fintech, e-commerce, SaaS, gov tech — only score if the JD implies a domain requirement.",
  },
  {
    id: "qualifications_extras",
    label: "Qualifications & extras",
    weight: 10,
    hint:
      "Degree or certs if JD requires; cloud/agile. Score language (BM/EN/Mandarin) only if JD explicitly asks.",
  },
];

export const SENIORITY_BANDS: SeniorityBand[] = [
  { id: "fresh", label: "Fresh graduate", minYears: 0, maxYears: 0 },
  { id: "junior", label: "Junior", minYears: 0, maxYears: 2 },
  { id: "mid", label: "Mid-level", minYears: 2, maxYears: 5 },
  { id: "senior", label: "Senior", minYears: 5, maxYears: 8 },
  { id: "lead", label: "Lead / Principal", minYears: 8, maxYears: 99 },
];

export const DECISION_BANDS: DecisionBand[] = [
  {
    min: 80,
    max: 100,
    label: "Shortlist",
    headline: "Proceed to technical interview",
    action: "Advance to technical interview — candidate meets core requirements.",
    tier: "strong",
  },
  {
    min: 70,
    max: 79,
    label: "HM Review",
    headline: "Hiring manager review",
    action: "Strong candidate pool — hiring manager review before scheduling interview.",
    tier: "strong",
  },
  {
    min: 55,
    max: 69,
    label: "Phone Screen",
    headline: "Clarify gaps before interview",
    action: "Brief phone screen recommended to clarify gaps before committing interview time.",
    tier: "partial",
  },
  {
    min: 40,
    max: 54,
    label: "Hold",
    headline: "Backup candidate",
    action: "Hold as backup — compare against other candidates before advancing.",
    tier: "partial",
  },
  {
    min: 0,
    max: 39,
    label: "Reject",
    headline: "Does not meet baseline",
    action: "Does not meet baseline requirements — recommend pass.",
    tier: "weak",
  },
];

export const GATE_SCORE_CAPS = {
  missingCoreStack: 49,
  seniorityMismatch: 45,
} as const;

export function getDecisionFromScore(score: number): DecisionBand {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  return (
    DECISION_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ??
    DECISION_BANDS[DECISION_BANDS.length - 1]
  );
}

export function buildVerdictFromDecision(decision: DecisionBand): string {
  return decision.action;
}

export function computeWeightedScore(dimensions: RubricDimensionScore[]): number {
  if (dimensions.length === 0) return 0;

  let total = 0;
  for (const dim of dimensions) {
    const def = RUBRIC_DIMENSIONS.find((d) => d.id === dim.id);
    const weight = def?.weight ?? 0;
    const score = Math.min(100, Math.max(0, Math.round(dim.score)));
    total += (score * weight) / 100;
  }

  return Math.min(100, Math.max(0, Math.round(total)));
}

export function applyComplianceGates(
  score: number,
  gateFlags: string[]
): { score: number; gateFlags: string[] } {
  let capped = score;
  const flags = [...gateFlags];

  const hasMissingStack = flags.some(
    (f) =>
      f.toLowerCase().includes("missing must-have") ||
      f.toLowerCase().includes("missing core stack")
  );
  const hasSeniorityMismatch = flags.some((f) =>
    f.toLowerCase().includes("seniority mismatch")
  );

  if (hasMissingStack) {
    capped = Math.min(capped, GATE_SCORE_CAPS.missingCoreStack);
  }
  if (hasSeniorityMismatch) {
    capped = Math.min(capped, GATE_SCORE_CAPS.seniorityMismatch);
  }

  return { score: capped, gateFlags: flags };
}

export function normalizeDimensions(
  raw: Partial<RubricDimensionScore>[]
): RubricDimensionScore[] {
  return RUBRIC_DIMENSIONS.map((def) => {
    const match =
      raw.find((d) => d.id === def.id) ??
      raw.find((d) => d.label?.toLowerCase() === def.label.toLowerCase());

    return {
      id: def.id,
      label: def.label,
      score: Math.min(100, Math.max(0, Math.round(Number(match?.score) || 0))),
      note: match?.note?.trim() || "Insufficient evidence on resume for this criterion.",
    };
  });
}

export function buildRubricSystemPrompt(): string {
  const dimensionSchema = RUBRIC_DIMENSIONS.map(
    (d) => `    { "id": "${d.id}", "label": "${d.label}", "score": <0-100>, "note": "<one sentence evidence>" }`
  ).join(",\n");

  const dimensionRules = RUBRIC_DIMENSIONS.map(
    (d) => `- ${d.label} (${d.weight}%): ${d.hint}`
  ).join("\n");

  const decisionRules = DECISION_BANDS.map(
    (b) => `- ${b.min}-${b.max}: ${b.label} — ${b.action}`
  ).join("\n");

  const seniorityRules = SENIORITY_BANDS.map(
    (b) => `- ${b.label}: ${b.minYears === b.maxYears ? "<1 yr" : `${b.minYears}-${b.maxYears === 99 ? "8+" : b.maxYears} yr`}`
  ).join("\n");

  return `You are a senior technical recruiter screening candidates for software and engineering roles in Malaysia.

Analyze how well the resume matches the job description. Return ONLY valid JSON — no markdown, no commentary.

{
  "dimensions": [
${dimensionSchema}
  ],
  "gateFlags": ["<optional: e.g. Missing must-have: Java", "Seniority mismatch: Junior vs Senior">"],
  "summary": "<2-3 sentences: overall fit, seniority alignment, biggest factor driving the score>",
  "strengths": ["<4-6 complete sentences citing resume evidence>"],
  "gaps": ["<4-6 complete sentences naming missing JD requirements>"],
  "verdict": "<One decisive hiring sentence aligned with the decision band>",
  "recommendations": ["<3-5 actionable next steps for the hiring manager>"]
}

Do NOT include matchScore — it is computed from dimension scores.

Malaysia tech screening rubric — score each dimension 0-100:
${dimensionRules}

MY seniority bands:
${seniorityRules}

Compliance gates (set gateFlags when triggered):
- Missing must-have core stack with no inferrable equivalent → add "Missing must-have: <skill>"
- Candidate ≥2 seniority bands below JD (e.g. Junior resume vs Senior JD) → add "Seniority mismatch: <candidate> vs <JD>"

Decision bands (derived from weighted score — align verdict accordingly):
${decisionRules}

MY context rules:
- Do NOT score on university tier, age, or ethnicity
- Only score language (BM/Mandarin/English) if JD explicitly requires it
- Notice period: mention in recommendations if relevant, not a dimension score
- Location/hybrid: only score if JD states onsite/hybrid requirement
- Use contextual inference: Spring Boot → Java, ASP.NET → C#, React → JavaScript

General rules:
- First infer must-haves vs nice-to-haves from the JD
- Never output keyword lists — every item must be a complete sentence
- Be specific: cite resume titles, tools, years, projects
- Be honest: weak fit for a senior JD should score low on seniority_experience and technical_stack
- Do not invent JD requirements
- If JD is invalid (URL, placeholder, nonsense), set all dimension scores 0-15, gateFlags empty, explain in summary`;
}

export function buildRubricUserPrompt(resumeText: string, jobDescription: string): string {
  return `Analyze this candidate against the job description using the Malaysia tech screening rubric.

Step 1: Identify must-have vs nice-to-have requirements from the JD.
Step 2: Score all 5 dimensions (0-100 each) with one-sentence evidence notes.
Step 3: Set gateFlags if compliance gates are triggered.
Step 4: Write strengths, gaps, verdict, and recommendations as complete sentences.

=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resumeText}

Return JSON only.`;
}

export function verdictConflictsWithDecision(score: number, verdict: string): boolean {
  const decision = getDecisionFromScore(score);
  const v = verdict.toLowerCase();

  const suggestsAdvance =
    /advance|schedule.{0,20}interview|proceed.{0,20}interview|shortlist|strong fit|move forward|worth interview/.test(
      v
    );
  const suggestsPass =
    /pass on|do not advance|reject|not a fit|poor fit|decline|not recommend|does not meet baseline/.test(
      v
    );

  if ((decision.label === "Shortlist" || decision.label === "HM Review") && suggestsPass) {
    return true;
  }
  if ((decision.label === "Reject" || decision.label === "Hold") && suggestsAdvance) {
    return true;
  }
  if (score >= 70 && suggestsPass) return true;
  if (score < 50 && suggestsAdvance) return true;
  return false;
}

export function buildDefaultRecommendations(score: number): string[] {
  const decision = getDecisionFromScore(score);

  switch (decision.label) {
    case "Shortlist":
      return [
        "Schedule a technical interview focused on the strongest matching skills.",
        "Verify depth on the top 2-3 strengths — ask for specific project examples and ownership.",
        "Confirm notice period, availability, and compensation expectations before advancing.",
      ];
    case "HM Review":
      return [
        "Share with hiring manager for review against other shortlisted candidates.",
        "Validate seniority and stack depth in a structured phone screen if HM approves.",
        "Confirm notice period and salary expectations align with budget.",
      ];
    case "Phone Screen":
      return [
        "Conduct a brief phone screen to clarify gaps before committing interview time.",
        "Ask directly about each gap — some skills may be present but not stated on the resume.",
        "Compare against other candidates before scheduling a full technical interview.",
      ];
    case "Hold":
      return [
        "Keep as backup candidate — revisit if primary shortlist does not progress.",
        "Request a revised resume highlighting missing requirements if reconsidering.",
        "Document hold reason for pipeline tracking.",
      ];
    default:
      return [
        "Do not advance unless the hiring bar is intentionally lowered for this role.",
        "If keeping in pipeline, request a revised resume highlighting missing requirements.",
        "Document the pass reason for compliance and future reference.",
      ];
  }
}
