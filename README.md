# ResuMatch — AI Resume Screener

Upload one or more resume PDFs, paste a job description, and get AI-powered match scores with strengths, gaps, and hiring recommendations.

Built with **Next.js 16**, **OpenRouter** (Gemini), and **unpdf**.

---

## Features

- **Single or batch screening** — 1 PDF works as before; add up to 5 to compare scores side-by-side (one JD, ranked by match)
- **Malaysia tech rubric** — Weighted scores across 5 dimensions plus Shortlist / HM Review / Reject decisions
- **PDF parsing** — Text extraction via unpdf (50 pages max, 10 MB per file)
- **Full report** — Strengths, gaps, verdict, recommendations; open PDF report in a new tab
- **Try with sample** — Pre-loaded resume + job description for a quick demo
- **Free tier** — 2 free analyses; access code unlocks unlimited use
- **Light / dark mode** — Toggle in the header; preference saved locally
- **Responsive UI** — Mobile-friendly forms, results, and comparison grid

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript |
| AI | OpenRouter · `google/gemini-2.5-flash` |
| PDF | unpdf · jsPDF (reports) |
| Styling | Tailwind CSS v4 |
| Access | HMAC-signed cookies |

## Local development

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Required env vars: `OPENROUTER_API_KEY`, `ACCESS_PASSWORD`, `COOKIE_SECRET`

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # single resume
│   │   ├── analyze-batch/    # multi-resume (1 credit per batch)
│   │   ├── access/
│   │   └── unlock/
│   ├── opengraph-image.tsx
│   └── page.tsx
├── components/
│   ├── batch-comparison-panel.tsx
│   ├── results-panel.tsx
│   ├── upload-zone.tsx
│   └── …
└── lib/
    ├── ai-client.ts
    ├── evaluation-rubric.ts
    ├── extract-pdf.ts
    └── analyze-resume-file.ts
```

---

Created by **[Haziq Rusyaidi](https://github.com/rrusyaidii)**
