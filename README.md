# ResumeMatch — AI Resume Screener 🎯

Upload a resume PDF, paste a job description, and get an AI-powered match score with strengths, gaps, and hiring recommendations in seconds.

Built with **Next.js 16 + Gemini AI + pdfjs-dist**. A weekend project to explore AI integration in web apps.

---

## Features

- **📄 PDF Parsing** — Extracts text from any resume PDF using pdfjs-dist
- **🤖 AI Analysis** — Scores match, identifies strengths & gaps, generates hiring recommendations
- **🔐 Rate-limited Demo** — 2 free analyses per device, unlockable with access code
- **📊 Clean UI** — Score gauge, insight cards, dark mode, responsive
- **📥 PDF Report** — Download analysis as a PDF report

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript |
| AI | OpenRouter / Gemini 2.0 Flash |
| PDF | pdfjs-dist (legacy build) |
| Styling | Tailwind CSS v4 |
| Auth | HMAC-signed cookies |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/rrusyaidii/resume-match.git
cd resume-match

# 2. Install
npm install

# 3. Configure env
cp .env.example .env.local
# Fill in at least one AI provider key

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Recommended | Primary AI provider |
| `GEMINI_API_KEY` | Fallback | Direct Google Gemini API |
| `ACCESS_PASSWORD` | Recommended | Unlocks unlimited analyses |
| `COOKIE_SECRET` | Required | Signs rate-limit cookies |

Generate a cookie secret:

```bash
openssl rand -base64 32
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── access/       # Check remaining analyses
│   │   ├── analyze/      # Main analysis endpoint
│   │   ├── models/       # Available AI models
│   │   └── unlock/       # Access code verification
│   ├── globals.css       # Tailwind + custom theme
│   ├── layout.tsx        # Root layout (fonts, meta)
│   └── page.tsx          # Home page (upload + results)
├── components/
│   ├── access-code-field.tsx
│   ├── access-limit-modal.tsx
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
    ├── access-control.ts  # Rate limit + cookie auth
    ├── ai-client.ts       # AI integration (Gemini / OpenRouter / fallback)
    ├── constants.ts
    ├── extract-pdf.ts     # PDF text extraction
    └── generate-report-pdf.ts
```

## Deployment

One-click deploy to Vercel:

```bash
npm i -g vercel
vercel
```

Set the same env vars in the Vercel dashboard.

---

Built by **Haziq Rusyaidi** — [GitHub](https://github.com/rrusyaidii)
