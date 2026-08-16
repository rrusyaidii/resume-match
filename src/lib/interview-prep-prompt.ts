import type { AIAnalysisResult } from "@/lib/ai-client";
import {
  PREP_MAX_BEHAVIORAL,
  PREP_MAX_GAP_DEFENCE,
  PREP_MAX_QUESTIONS_TO_ASK,
  PREP_MAX_TECHNICAL,
} from "@/lib/interview-prep-types";

export function buildPrepSystemPrompt(): string {
  return `You are an interview coach preparing a candidate for a specific interview. You are speaking directly TO the candidate. Use second person ("you", "your"). Never write as a recruiter evaluating them — they have already seen that report.

Return ONLY valid JSON — no markdown, no commentary.

OUTPUT FORMAT (strict JSON only):
{
  "detectedLevel": "<seniority this candidate presents at, e.g. Junior, Mid-level, Senior>",
  "roleFamily": "<engineering, HR, recruiter, admin, sales, finance, ops, support, or other>",
  "technical": [
    {
      "question": "<a question an interviewer is likely to ask, drawn from the JD's core stack>",
      "topic": "<the skill or area being probed, 1-4 words>",
      "whatGoodLooksLike": "<2-3 sentences: what a strong answer at THIS seniority covers>"
    }
  ],
  "behavioral": [
    {
      "question": "<behavioural question tied to a soft requirement in the JD>",
      "whyAsked": "<one sentence: what the interviewer is really testing>",
      "scaffold": {
        "situation": "<the specific situation FROM THIS RESUME to use>",
        "task": "<what you were responsible for in it>",
        "action": "<the concrete steps you took>",
        "result": "<the outcome, with the resume's numbers where they exist>"
      }
    }
  ],
  "gapDefence": [
    {
      "question": "<the pointed question this specific gap invites>",
      "gap": "<the gap being probed, restated in a few words>",
      "suggestedAngle": "<2-3 sentences: how to answer honestly without pretending you have it. Lean on adjacent experience from the resume.>"
    }
  ],
  "questionsToAsk": [
    {
      "question": "<a sharp question for the candidate to ask the interviewer>",
      "rationale": "<one sentence: what this reveals, and why it is worth knowing>"
    }
  ]
}

COUNTS: technical ${PREP_MAX_TECHNICAL - 1}-${PREP_MAX_TECHNICAL}, behavioral ${PREP_MAX_BEHAVIORAL - 1}-${PREP_MAX_BEHAVIORAL}, gapDefence up to ${PREP_MAX_GAP_DEFENCE}, questionsToAsk ${PREP_MAX_QUESTIONS_TO_ASK - 1}-${PREP_MAX_QUESTIONS_TO_ASK}.

RULES — these decide whether this output is useful or worthless:
1. STAR scaffolds MUST be built from real content in the resume. Name the actual project, employer, or achievement. If the resume says "reduced API latency 40% at Grab", the scaffold says that.
2. NEVER invent an achievement, number, employer, or project that is not in the resume. If the resume is thin on a required area, say so in the scaffold rather than fabricating: e.g. "Your resume has no leadership example — use the closest thing, the X project, and be straight that it was informal."
3. Do NOT output placeholders like "[your project]", "a time when you...", "Company X". A scaffold with a placeholder in it is a failed answer.
4. gapDefence MUST come from the supplied gaps and gate flags — one entry per real gap, using the interviewer's likely phrasing. These are the hostile questions; do not soften them.
5. Calibrate technical difficulty to detectedLevel. Do not ask a junior to design a distributed system, or ask a senior to define a REST verb.
6. questionsToAsk must be specific to THIS job description — anything that would work for any job at any company does not belong here.`;
}

export function buildPrepUserPrompt(
  resumeText: string,
  jobDescription: string,
  analysis: AIAnalysisResult
): string {
  const gaps = analysis.gaps.length
    ? analysis.gaps.map((gap) => `- ${gap}`).join("\n")
    : "- (none identified)";

  const gateFlags = analysis.gateFlags?.length
    ? analysis.gateFlags.map((flag) => `- ${flag}`).join("\n")
    : "- (none)";

  const strengths = analysis.strengths.length
    ? analysis.strengths.map((item) => `- ${item}`).join("\n")
    : "- (none identified)";

  const dimensions = analysis.dimensions
    .map((dimension) => `- ${dimension.label}: ${dimension.score}/100 — ${dimension.note}`)
    .join("\n");

  return `Prepare this candidate for an interview for the role below.

Step 1: Read the resume and identify the candidate's seniority and role family.
Step 2: Pull the core technical requirements from the JD and write questions at that seniority.
Step 3: For each gap and gate flag listed below, write the pointed question it invites and how to answer it honestly.
Step 4: For each behavioural question, pick a REAL example from the resume and fill the STAR scaffold with it.

=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resumeText}

=== PRIOR SCREENING RESULT (score ${analysis.matchScore}/100 — ${analysis.decision}) ===
Dimension scores:
${dimensions}

Assessed strengths (lean on these):
${strengths}

Assessed gaps (these drive gapDefence):
${gaps}

Compliance flags:
${gateFlags}

Return JSON only.`;
}
