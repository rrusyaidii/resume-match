export interface AIAnalysisResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  verdict: string;
  recommendations: string[];
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const SYSTEM_PROMPT = `You are a senior technical recruiter with 15 years of experience screening candidates for software and engineering roles.

Analyze how well the resume matches the job description. Return ONLY valid JSON — no markdown, no commentary.

{
  "matchScore": <integer 0-100>,
  "summary": "<2-3 sentences: overall fit, seniority alignment, and the single biggest factor driving the score>",
  "strengths": [
    "<4-6 items. Each is ONE full sentence citing specific evidence from the resume — skills, years, titles, projects, or metrics that match the JD>"
  ],
  "gaps": [
    "<4-6 items. Each is ONE full sentence naming a missing or weak requirement from the JD and why it matters for this role>"
  ],
  "verdict": "<One decisive hiring sentence aligned with matchScore — advance to interview, hold for review, or pass>",
  "recommendations": [
    "<3-5 actionable next steps for the hiring manager — interview focus areas, skills to probe, red flags to verify, or why to pass>"
  ]
}

Scoring rubric (apply strictly — do not inflate):
- 85-100: Exceeds requirements — strong overlap on must-haves, seniority aligned, relevant domain experience
- 70-84: Good fit — meets most must-haves; minor gaps in nice-to-haves or depth
- 50-69: Partial fit — meaningful gaps in must-have skills, experience level, or domain
- 30-49: Weak fit — missing multiple must-haves or clear seniority mismatch (e.g. junior resume for senior role)
- 0-29: Poor fit — wrong role type, domain, or seniority; most core requirements absent

Scoring weights:
1. Must-have skills & technologies explicitly stated in the JD (~50%)
2. Years of experience & seniority level vs JD (~25%)
3. Domain/industry relevance (~15%)
4. Nice-to-have / preferred qualifications (~10%)

Rules:
- First infer must-haves vs nice-to-haves from the JD, then score against must-haves primarily.
- Never output keywords or comma-separated lists — every item must be a complete sentence.
- Be specific: quote or paraphrase actual resume content (titles, tools, years, projects).
- Be honest: a weak resume for a strong JD should score 30 or below.
- Do not invent JD requirements not stated in the job description.
- verdict MUST match matchScore band (≥70 → interview-worthy; 50-69 → hold/review; <50 → pass or strong hesitation).
- Ignore filler (company culture fluff, locations) unless explicitly required.
- If the JD is invalid (URL, hostname, placeholder, nonsense, test input), set matchScore 0-15, explain in summary, and recommend pasting a real JD.`;

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

function extractYears(text: string): string | null {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i);
  return match ? `${match[1]}+ years experience` : null;
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

function buildVerdictFromScore(score: number): string {
  if (score >= 85) {
    return "Strong fit — advance to interview; the candidate meets or exceeds most core requirements.";
  }
  if (score >= 70) {
    return "Good fit — proceed to interview while validating the gaps listed below.";
  }
  if (score >= 50) {
    return "Borderline fit — hold for manual review or a brief screening call before committing interview time.";
  }
  if (score >= 30) {
    return "Weak fit — significant must-have gaps; pass unless the hiring bar is intentionally lowered.";
  }
  return "Poor fit — resume does not align with this role's seniority, skills, or domain; recommend pass.";
}

function verdictConflictsWithScore(score: number, verdict: string): boolean {
  const v = verdict.toLowerCase();
  const suggestsAdvance =
    /advance|schedule.{0,20}interview|proceed.{0,20}interview|strong fit|move forward|worth interview|recommend hiring/.test(
      v
    );
  const suggestsPass =
    /pass on|do not advance|reject|not a fit|poor fit|decline|not recommend|skip this candidate/.test(v);

  if (score >= 70 && suggestsPass) return true;
  if (score < 50 && suggestsAdvance) return true;
  return false;
}

function buildDefaultRecommendations(score: number): string[] {
  if (score >= 70) {
    return [
      "Schedule a technical screen focused on the strongest matching skills.",
      "Verify depth on the top 2-3 strengths — ask for specific project examples and ownership.",
      "Confirm availability, notice period, and compensation expectations before advancing.",
    ];
  }
  if (score >= 40) {
    return [
      "Conduct a brief phone screen to clarify ambiguous areas before investing interview time.",
      "Ask directly about each gap listed — some skills may be present but not stated on the resume.",
      "Compare against other candidates in the pipeline before making a final decision.",
    ];
  }
  return [
    "Do not advance unless the hiring bar is intentionally lowered for this role.",
    "If keeping in pipeline, request a revised resume highlighting missing requirements.",
    "Document the pass reason for compliance and future reference.",
  ];
}

function normalizeResult(raw: Partial<AIAnalysisResult>): AIAnalysisResult {
  const score = Math.min(100, Math.max(0, Math.round(Number(raw.matchScore) || 0)));

  const strengths = dedupeSentences(
    (raw.strengths ?? []).map((s) => s.trim()).filter((s) => s.length > 20)
  ).slice(0, 6);

  const gaps = dedupeSentences(
    (raw.gaps ?? []).map((s) => s.trim()).filter((s) => s.length > 20)
  ).slice(0, 6);

  const recommendations = dedupeSentences(
    (raw.recommendations ?? []).map((s) => s.trim()).filter((s) => s.length > 15)
  ).slice(0, 5);

  let verdict = raw.verdict?.trim() || buildVerdictFromScore(score);
  if (verdictConflictsWithScore(score, verdict)) {
    verdict = buildVerdictFromScore(score);
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
  };
}

function keywordMatch(resume: string, jd: string): AIAnalysisResult {
  const resumeSkills = extractSkills(resume);
  const jdSkills = extractSkills(jd);

  const matched = jdSkills.filter((s) => resumeSkills.includes(s));
  const missed = jdSkills.filter((s) => !resumeSkills.includes(s));

  let score =
    jdSkills.length > 0
      ? Math.round((matched.length / jdSkills.length) * 100)
      : matched.length > 0
        ? 55
        : 30;

  const resumeYears = extractYears(resume);
  const jdYears = extractYears(jd);
  if (resumeYears && jdYears) {
    const resumeNum = parseInt(resumeYears, 10);
    const jdNum = parseInt(jdYears, 10);
    if (resumeNum + 2 < jdNum) score = Math.min(score, 45);
    if (resumeNum >= jdNum) score = Math.min(100, score + 5);
  }

  const strengths: string[] = [];
  if (resumeYears) {
    strengths.push(
      `Resume indicates ${resumeYears}, which may align with seniority expectations in the job description.`
    );
  }
  for (const skill of matched.slice(0, 5)) {
    strengths.push(
      `Demonstrates ${skill} experience, which appears in the job description requirements.`
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      "Resume contains general professional experience but few clear matches to the stated technical requirements."
    );
  }

  const gaps: string[] = [];
  for (const skill of missed.slice(0, 5)) {
    gaps.push(
      `No clear evidence of ${skill} on the resume, though the job description calls for it.`
    );
  }
  if (gaps.length === 0 && score < 70) {
    gaps.push(
      "Resume lacks depth in areas emphasized by the job description — a closer manual read is needed."
    );
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const summary =
    finalScore >= 60
      ? `Candidate shows overlap on ${matched.length} of ${jdSkills.length} key skills identified in the job description.`
      : `Limited skill overlap — only ${matched.length} of ${jdSkills.length} required skills appear on the resume.`;

  return normalizeResult({
    matchScore: finalScore,
    summary: `Offline estimate — configure OpenRouter for AI analysis. ${summary}`,
    strengths,
    gaps,
    verdict: buildVerdictFromScore(finalScore),
    recommendations: buildDefaultRecommendations(finalScore),
  });
}

function parseJsonResponse(raw: string): AIAnalysisResult {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  try {
    return normalizeResult(JSON.parse(cleaned));
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return normalizeResult(JSON.parse(cleaned.slice(start, end + 1)));
    }
    throw new Error("AI returned invalid JSON");
  }
}

async function callOpenRouter(
  resumeText: string,
  jobDescription: string
): Promise<AIAnalysisResult> {
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
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this candidate against the job description.

Step 1: Identify must-have vs nice-to-have requirements from the JD.
Step 2: Compare resume evidence against must-haves (skills, seniority, domain).
Step 3: Assign matchScore using the rubric — penalize seniority mismatch and missing must-haves.
Step 4: Write strengths, gaps, verdict, and recommendations as complete sentences.

=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resumeText}

Return JSON only.`,
        },
      ],
      temperature: 0.15,
      max_tokens: 2500,
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
  return parseJsonResponse(rawContent);
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
