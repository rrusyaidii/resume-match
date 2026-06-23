import {
  applyComplianceGates,
  buildDefaultRecommendations,
  buildRubricSystemPrompt,
  buildRubricUserPrompt,
  buildVerdictFromDecision,
  computeWeightedScore,
  getDecisionFromScore,
  normalizeDimensions,
  verdictConflictsWithDecision,
  type RubricDimensionScore,
} from "@/lib/evaluation-rubric";

export interface AIAnalysisResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  verdict: string;
  recommendations: string[];
  dimensions: RubricDimensionScore[];
  decision: string;
  gateFlags?: string[];
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const TECH_SKILLS = [
  "javascript", "typescript", "python", "java", "react", "next.js", "nextjs", "node.js", "nodejs",
  "angular", "vue", "sql", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
  "aws", "azure", "gcp", "git", "ci/cd", "rest", "graphql", "api", "html", "css", "tailwind",
  "fastapi", "django", "flask", "spring", "express", "nestjs", "php", "laravel", "ruby", "rails",
  "go", "golang", "rust", "c++", "c#", ".net", "swift", "kotlin", "flutter", "react native",
  "machine learning", "deep learning", "tensorflow", "pytorch", "data analysis", "pandas",
  "agile", "scrum", "devops", "linux", "terraform", "ansible", "figma", "ui/ux",
  "microservices", "system design", "testing", "jest", "cypress", "selenium",
];

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "our", "will", "are",
  "have", "has", "been", "being", "about", "into", "through", "during", "before", "after",
  "above", "below", "between", "under", "again", "further", "then", "once", "here", "there",
  "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some",
  "such", "only", "own", "same", "than", "too", "very", "just", "also", "now", "role", "job",
  "team", "work", "working", "experience", "years", "year", "company", "based", "looking",
  "join", "fast", "growing", "software", "development", "across", "building", "location",
]);

interface RawAnalysisResult {
  matchScore?: number;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  verdict?: string;
  recommendations?: string[];
  dimensions?: Partial<RubricDimensionScore>[];
  gateFlags?: string[];
  decision?: string;
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of TECH_SKILLS) {
    if (lower.includes(skill)) found.add(skill);
  }

  const patterns = [
    /\b([A-Z][a-z]+(?:\.js|\.ts|\.py)?)\b/g,
    /\b([A-Z]{2,6})\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const word = match[1].toLowerCase();
      if (word.length > 2 && !STOP_WORDS.has(word)) found.add(word);
    }
  }

  return [...found];
}

function extractYears(text: string): number | null {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i);
  return match ? parseInt(match[1], 10) : null;
}

function dedupeSentences(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/\s+/g, " ").slice(0, 72);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeResult(raw: RawAnalysisResult): AIAnalysisResult {
  const dimensions = normalizeDimensions(raw.dimensions ?? []);
  const gateFlags = Array.isArray(raw.gateFlags)
    ? raw.gateFlags.map((f) => String(f).trim()).filter(Boolean)
    : [];

  let score: number;
  if (raw.dimensions && raw.dimensions.length > 0) {
    const weighted = computeWeightedScore(dimensions);
    const gated = applyComplianceGates(weighted, gateFlags);
    score = gated.score;
  } else {
    score = Math.min(100, Math.max(0, Math.round(Number(raw.matchScore) || 0)));
  }

  const decision = getDecisionFromScore(score);

  const strengths = dedupeSentences(
    (raw.strengths ?? []).map((s) => s.trim()).filter((s) => s.length > 20)
  ).slice(0, 6);

  const gaps = dedupeSentences(
    (raw.gaps ?? []).map((s) => s.trim()).filter((s) => s.length > 20)
  ).slice(0, 6);

  const recommendations = dedupeSentences(
    (raw.recommendations ?? []).map((s) => s.trim()).filter((s) => s.length > 15)
  ).slice(0, 5);

  let verdict = raw.verdict?.trim() || buildVerdictFromDecision(decision);
  if (verdictConflictsWithDecision(score, verdict)) {
    verdict = buildVerdictFromDecision(decision);
  }

  return {
    matchScore: score,
    summary: raw.summary?.trim() || "Analysis complete. Review strengths and gaps below.",
    strengths:
      strengths.length > 0
        ? strengths
        : ["Resume shows relevant background but lacks specific detail matching the job description."],
    gaps:
      gaps.length > 0
        ? gaps
        : score >= 70
          ? ["No critical gaps identified — validate depth and seniority in interview."]
          : ["Unable to identify specific gaps — manual review of the job description is recommended."],
    verdict,
    recommendations:
      recommendations.length > 0 ? recommendations : buildDefaultRecommendations(score),
    dimensions,
    decision: decision.label,
    gateFlags: gateFlags.length > 0 ? gateFlags : undefined,
  };
}

function buildOfflineDimensions(
  resume: string,
  jd: string,
  skillScore: number,
  matched: string[],
  missed: string[]
): { dimensions: RubricDimensionScore[]; gateFlags: string[] } {
  const gateFlags: string[] = [];
  const resumeYears = extractYears(resume);
  const jdYears = extractYears(jd);

  let seniorityScore = 50;
  if (resumeYears !== null && jdYears !== null) {
    if (resumeYears + 2 < jdYears) {
      seniorityScore = 35;
      gateFlags.push(`Seniority mismatch: ~${resumeYears}yr resume vs ~${jdYears}yr JD requirement`);
    } else if (resumeYears >= jdYears) {
      seniorityScore = 75;
    } else {
      seniorityScore = 55;
    }
  } else if (resumeYears !== null) {
    seniorityScore = 60;
  }

  if (missed.length > 0 && matched.length === 0) {
    gateFlags.push(`Missing must-have: ${missed.slice(0, 3).join(", ")}`);
  } else if (missed.length > matched.length) {
    gateFlags.push(`Missing must-have: ${missed[0]}`);
  }

  const hasDeliverySignals =
    /agile|scrum|ci\/cd|deploy|deliver|shipped|production|sprint|kpi|managed|processed|hired|onboard|campaign|payroll|quota|revenue|handled|implemented|rolled out/i.test(
      resume
    );
  const projectScore = hasDeliverySignals
    ? Math.min(70, skillScore + 10)
    : Math.max(30, skillScore - 10);

  const domainKeywords = [
    "bank", "fintech", "e-commerce", "ecommerce", "saas", "gov", "insurance",
    "retail", "manufacturing", "healthcare", "logistics", "hr", "shared service",
  ];
  const jdDomain = domainKeywords.some((k) => jd.toLowerCase().includes(k));
  const resumeDomain = domainKeywords.some((k) => resume.toLowerCase().includes(k));
  const domainScore = jdDomain ? (resumeDomain ? 70 : 35) : 55;

  const hasDegree = /bachelor|master|degree|diploma|b\.?sc|m\.?sc|computer science|information technology/i.test(
    resume
  );
  const jdRequiresDegree = /degree|bachelor|diploma|b\.?sc|qualification/i.test(jd);
  const qualScore = jdRequiresDegree ? (hasDegree ? 75 : 40) : hasDegree ? 65 : 50;

  return {
    dimensions: normalizeDimensions([
      {
        id: "technical_stack",
        score: skillScore,
        note:
          matched.length > 0
            ? `Resume shows ${matched.length} of ${matched.length + missed.length} key skills from the JD.`
            : "Limited overlap with core skills or requirements stated in the job description.",
      },
      {
        id: "seniority_experience",
        score: seniorityScore,
        note:
          resumeYears !== null
            ? `Resume indicates approximately ${resumeYears} years of experience.`
            : "Seniority level is unclear from the resume.",
      },
      {
        id: "project_delivery",
        score: projectScore,
        note: hasDeliverySignals
          ? "Resume mentions delivery outcomes such as projects completed, hires, KPIs, or process improvements."
          : "Limited evidence of delivery outcomes or measurable results on the resume.",
      },
      {
        id: "domain_industry",
        score: domainScore,
        note: jdDomain
          ? resumeDomain
            ? "Resume shows experience in a domain relevant to the job description."
            : "Job description implies domain experience not clearly shown on the resume."
          : "No specific industry domain requirement identified in the job description.",
      },
      {
        id: "qualifications_extras",
        score: qualScore,
        note: hasDegree
          ? "Resume lists a relevant degree or qualification."
          : "Qualifications section is limited or not clearly stated on the resume.",
      },
    ]),
    gateFlags,
  };
}

function keywordMatch(resume: string, jd: string): AIAnalysisResult {
  const resumeSkills = extractSkills(resume);
  const jdSkills = extractSkills(jd);

  const matched = jdSkills.filter((s) => resumeSkills.includes(s));
  const missed = jdSkills.filter((s) => !resumeSkills.includes(s));

  const skillScore =
    jdSkills.length > 0
      ? Math.round((matched.length / jdSkills.length) * 100)
      : matched.length > 0
        ? 55
        : 30;

  const { dimensions, gateFlags } = buildOfflineDimensions(resume, jd, skillScore, matched, missed);

  const strengths: string[] = [];
  const resumeYears = extractYears(resume);
  if (resumeYears !== null) {
    strengths.push(
      `Resume indicates approximately ${resumeYears} years of experience, which may align with seniority expectations in the job description.`
    );
  }
  for (const skill of matched.slice(0, 5)) {
    strengths.push(
      `Demonstrates ${skill} experience, which appears in the job description requirements.`
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      "Resume contains general professional experience but few clear matches to the stated job requirements."
    );
  }

  const gaps: string[] = [];
  for (const skill of missed.slice(0, 5)) {
    gaps.push(
      `No clear evidence of ${skill} on the resume, though the job description calls for it.`
    );
  }

  const weighted = computeWeightedScore(dimensions);
  const { score: finalScore } = applyComplianceGates(weighted, gateFlags);

  const summary =
    finalScore >= 60
      ? `Candidate shows overlap on ${matched.length} of ${jdSkills.length} key skills identified in the job description.`
      : `Limited skill overlap — only ${matched.length} of ${jdSkills.length} required skills appear on the resume.`;

  return normalizeResult({
    dimensions,
    gateFlags,
    summary: `Offline estimate — configure OpenRouter for AI analysis. ${summary}`,
    strengths,
    gaps,
    recommendations: buildDefaultRecommendations(finalScore),
  });
}

function extractJsonObject(raw: string): string {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}

function repairJson(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([\]}])/g, "$1");
}

function parseJsonResponse(raw: string): AIAnalysisResult {
  const candidates = [raw, repairJson(extractJsonObject(raw))];
  let lastError: Error | undefined;

  for (const candidate of candidates) {
    try {
      return normalizeResult(JSON.parse(candidate));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("AI returned invalid JSON");
}

async function requestOpenRouterAnalysis(
  resumeText: string,
  jobDescription: string
): Promise<AIAnalysisResult> {
  const { loadRecruiterPlaybook } = await import("@/lib/rubric/load-playbook");
  const playbook = loadRecruiterPlaybook();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": siteUrl,
      "X-Title": "ResuMatch",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildRubricSystemPrompt(playbook) },
        {
          role: "user",
          content: buildRubricUserPrompt(resumeText, jobDescription),
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content ?? "";
  if (!rawContent.trim()) {
    throw new Error("AI returned empty response");
  }

  return parseJsonResponse(rawContent);
}

async function callOpenRouter(
  resumeText: string,
  jobDescription: string
): Promise<AIAnalysisResult> {
  try {
    return await requestOpenRouterAnalysis(resumeText, jobDescription);
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : String(firstError);
    const isJsonError =
      message.includes("JSON") || message.includes("Unexpected token") || message.includes("position");

    if (!isJsonError) {
      throw firstError;
    }

    console.warn("AI JSON parse failed, retrying once:", message);
    return await requestOpenRouterAnalysis(resumeText, jobDescription);
  }
}

export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<AIAnalysisResult> {
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10) {
    return await callOpenRouter(resumeText, jobDescription);
  }

  return keywordMatch(resumeText, jobDescription);
}

export function getAvailableModels() {
  return [{ name: "OpenRouter / google/gemini-2.5-flash" }];
}
