export interface AIAnalysisResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  verdict: string;
  recommendations: string[];
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const SYSTEM_PROMPT = `You are a senior technical recruiter with 15 years of experience. Analyze how well a candidate's resume matches a job description.

Return ONLY valid JSON with this exact structure:
{
  "matchScore": <integer 0-100>,
  "summary": "<2-3 sentences: overall fit, seniority alignment, and biggest factor in the score>",
  "strengths": [
    "<4-6 items. Each item is ONE full sentence citing specific evidence from the resume — skills, years, projects, or achievements that match the JD>"
  ],
  "gaps": [
    "<4-6 items. Each item is ONE full sentence naming a missing or weak requirement from the JD and why it matters for this role>"
  ],
  "verdict": "<One decisive hiring sentence: advance to interview, hold for review, or pass — with the single strongest reason>",
  "recommendations": [
    "<3-5 actionable next steps for the hiring manager — e.g. interview focus areas, skills to probe, red flags to verify, or why to pass>"
  ]
}

Rules:
- Never output single keywords or comma-separated word lists. Every strength, gap, and recommendation must be a complete sentence.
- Be specific: reference actual technologies, years, titles, or accomplishments from the resume.
- Be honest: low scores are fine when the fit is genuinely poor.
- Ignore filler words, company locations, and generic adjectives unless they are explicit job requirements.
- Score must reflect actual overlap between resume and job description requirements — not resume quality alone.
- Do not invent job requirements that are not stated in the job description.
- If the job description is not a legitimate role posting (URLs, hostnames, placeholders, single words, nonsense, or test input), set matchScore between 0 and 15, explain the JD is invalid in summary, and recommend pasting a real job description.`;

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

function normalizeResult(raw: Partial<AIAnalysisResult>): AIAnalysisResult {
  const score = Math.min(100, Math.max(0, Math.round(Number(raw.matchScore) || 0)));

  const strengths = (raw.strengths ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const gaps = (raw.gaps ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const recommendations = (raw.recommendations ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  return {
    matchScore: score,
    summary: raw.summary?.trim() || "Analysis complete. Review strengths and gaps below.",
    strengths: strengths.length > 0 ? strengths : ["Resume shows relevant background but lacks specific detail in the analysis."],
    gaps: gaps.length > 0 ? gaps : ["Unable to identify specific gaps — manual review recommended."],
    verdict: raw.verdict?.trim() || (score >= 70 ? "Advance to interview." : score >= 40 ? "Hold for manual review." : "Pass on this candidate."),
    recommendations: recommendations.length > 0 ? recommendations : buildDefaultRecommendations(score),
  };
}

function buildDefaultRecommendations(score: number): string[] {
  if (score >= 70) {
    return [
      "Schedule a technical screen focused on the strongest matching skills.",
      "Verify depth on the top 2-3 strengths listed — ask for specific project examples.",
      "Confirm availability and salary expectations align before advancing.",
    ];
  }
  if (score >= 40) {
    return [
      "Conduct a brief phone screen to clarify ambiguous areas before investing interview time.",
      "Ask directly about each gap listed — some may be present but not stated on the resume.",
      "Compare against other candidates before making a final decision.",
    ];
  }
  return [
    "Do not advance unless the hiring bar is intentionally lowered for this role.",
    "If keeping in pipeline, request a revised resume highlighting missing requirements.",
    "Document the pass reason for compliance and future reference.",
  ];
}

function keywordMatch(resume: string, jd: string): AIAnalysisResult {
  const resumeSkills = extractSkills(resume);
  const jdSkills = extractSkills(jd);

  const matched = jdSkills.filter((s) => resumeSkills.includes(s));
  const missed = jdSkills.filter((s) => !resumeSkills.includes(s));

  const score =
    jdSkills.length > 0
      ? Math.round((matched.length / jdSkills.length) * 100)
      : matched.length > 0
        ? 55
        : 30;

  const years = extractYears(resume);
  const strengths: string[] = [];

  if (years) {
    strengths.push(`Resume indicates ${years}, which may align with seniority expectations in the job description.`);
  }
  for (const skill of matched.slice(0, 5)) {
    strengths.push(`Demonstrates ${skill} experience, which is explicitly required or preferred in the job description.`);
  }
  if (strengths.length === 0) {
    strengths.push("Resume contains general professional experience but few clear matches to the stated technical requirements.");
  }

  const gaps: string[] = [];
  for (const skill of missed.slice(0, 5)) {
    gaps.push(`No clear evidence of ${skill} on the resume, though the job description calls for it.`);
  }
  if (gaps.length === 0 && score < 70) {
    gaps.push("Resume lacks depth in areas emphasized by the job description — a closer manual read is needed.");
  }

  const finalScore = Math.min(score, 100);
  const summary =
    finalScore >= 60
      ? `Candidate shows overlap on ${matched.length} of ${jdSkills.length} key skills identified in the job description.`
      : `Limited skill overlap — only ${matched.length} of ${jdSkills.length} required skills appear on the resume.`;

  return normalizeResult({
    matchScore: finalScore,
    summary: `Offline estimate — configure OpenRouter for AI analysis. ${summary}`,
    strengths,
    gaps,
    verdict:
      finalScore >= 70
        ? "Potential fit — skill overlap supports moving to a technical screen."
        : finalScore >= 40
          ? "Borderline fit — gaps in core skills warrant a clarifying call before interviewing."
          : "Poor match — resume does not demonstrate the key skills this role requires.",
    recommendations: buildDefaultRecommendations(finalScore),
  });
}

function parseJsonResponse(raw: string): AIAnalysisResult {
  const jsonStr = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();
  return normalizeResult(JSON.parse(jsonStr));
}

async function callOpenRouter(resumeText: string, jobDescription: string): Promise<AIAnalysisResult> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": siteUrl,
      "X-Title": "ResuMatch",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resumeText}

Analyze and return JSON only.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30000),
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
