# ResuMatch — AI Resume Screener

Upload a resume PDF, paste a job description, and get an AI-powered match score with strengths, gaps, and hiring recommendations in seconds.

Built with **Next.js 16**, **OpenRouter**, and **unpdf**.

---

## Features

- **PDF parsing** — Extracts text from resume PDFs (up to 50 pages, 10 MB max)
- **AI analysis** — Match score, summary, strengths, gaps, verdict, and hiring recommendations
- **PDF report** — Download a formatted analysis report
- **Responsive UI** — Mobile-friendly layout with score gauge and insight cards

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript |
| AI | OpenRouter |
| PDF | unpdf |
| Styling | Tailwind CSS v4 |
| Access | HMAC-signed cookies |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── access/
│   │   ├── analyze/
│   │   ├── models/
│   │   └── unlock/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── access-code-field.tsx
│   ├── access-code-modal.tsx
│   ├── access-limit-modal.tsx
│   ├── access-modal-shell.tsx
│   ├── access-unlock-form.tsx
│   ├── analyze-button.tsx
│   ├── error-banner.tsx
│   ├── header.tsx
│   ├── insight-list.tsx
│   ├── job-description-field.tsx
│   ├── results-panel.tsx
│   ├── results-utils.ts
│   ├── score-gauge.tsx
│   ├── site-footer.tsx
│   └── upload-zone.tsx
└── lib/
    ├── access-control.ts
    ├── ai-client.ts
    ├── constants.ts
    ├── extract-pdf.ts
    ├── generate-report-pdf.ts
    ├── rate-limit.ts
    └── validate-job-description.ts
```

---

Created by **[Haziq Rusyaidi](https://github.com/rrusyaidii)**
