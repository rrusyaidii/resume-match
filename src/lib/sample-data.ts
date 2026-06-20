export const SAMPLE_JOB_DESCRIPTION = `Senior Full Stack Developer — Kuala Lumpur (Hybrid)

We are looking for a Senior Full Stack Developer with 5+ years of experience building scalable web applications.

Must-have:
- Strong proficiency in React, TypeScript, and Node.js
- Experience with REST APIs and PostgreSQL
- CI/CD, Docker, and cloud deployment (AWS preferred)
- Agile/Scrum delivery in product teams

Nice-to-have:
- Next.js, GraphQL, Redis
- Fintech or banking domain experience
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Design and build full-stack features end-to-end
- Mentor junior developers and conduct code reviews
- Collaborate with product and QA on delivery timelines`;

export const SAMPLE_RESUME_PATH = "/sample-resume.pdf";
export const SAMPLE_RESUME_FILENAME = "sample-resume.pdf";

export async function fetchSampleResumeFile(): Promise<File> {
  const res = await fetch(SAMPLE_RESUME_PATH);
  if (!res.ok) {
    throw new Error("Sample resume not found. Please upload your own PDF.");
  }
  const blob = await res.blob();
  return new File([blob], SAMPLE_RESUME_FILENAME, { type: "application/pdf" });
}
