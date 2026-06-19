# ResuMatch — AI Resume Screener

Upload a resume PDF, paste a job description, and get an AI-powered match score with strengths, gaps, and hiring recommendations in seconds.

Built with **Next.js 16**, **OpenRouter**, and **pdfjs-dist**.

---

## Features

- **PDF parsing** — Extracts text from resume PDFs (up to 50 pages, 10 MB max)
- **AI analysis** — Match score, summary, strengths, gaps, verdict, and hiring recommendations
- **Free tier** — 2 analyses per browser; unlock unlimited use with an access code
- **PDF report** — Download a formatted analysis report
- **Responsive UI** — Mobile-friendly layout with score gauge and insight cards

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript |
| AI | OpenRouter |
| PDF | pdfjs-dist (legacy build) |
| Styling | Tailwind CSS v4 |
| Access | HMAC-signed cookies |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/rrusyaidii/resumatch.git
cd resumatch

# 2. Install
npm install

# 3. Configure env
cp .env.example .env.local
# Fill in OPENROUTER_API_KEY, ACCESS_PASSWORD, and COOKIE_SECRET

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI analysis |
| `ACCESS_PASSWORD` | Yes | Password for unlimited analyses (use a long random string) |
| `COOKIE_SECRET` | Yes | Signs access cookies — generate with `openssl rand -base64 32` (32+ chars recommended) |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for OpenGraph (Vercel sets `VERCEL_URL` automatically if omitted) |

Example `.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-your-key-here
ACCESS_PASSWORD=your-long-random-password
COOKIE_SECRET=your-random-secret-at-least-32-chars
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── access/       # Remaining free analyses
│   │   ├── analyze/      # Main analysis endpoint
│   │   ├── models/       # Available AI models
│   │   └── unlock/       # Access code verification
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
    ├── access-control.ts       # Cookie auth + free tier
    ├── ai-client.ts            # OpenRouter integration
    ├── constants.ts
    ├── extract-pdf.ts          # PDF text extraction
    ├── generate-report-pdf.ts  # Downloadable report
    ├── rate-limit.ts           # Unlock endpoint rate limit
    └── validate-job-description.ts
```

## Deploy on Vercel

**Option A — GitHub (recommended)**

1. Push this repo to GitHub (never commit `.env.local`)
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. If nested in a monorepo, set **Root Directory** to `projects/ai-resume-screener`
4. Add environment variables: `OPENROUTER_API_KEY`, `ACCESS_PASSWORD`, `COOKIE_SECRET`
5. Deploy

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel
```

Set the same three env vars in the Vercel dashboard under **Settings → Environment Variables**.

## Security (before going public)

1. **Never commit** `.env.local` — confirm with `git check-ignore -v .env.local`
2. **Rotate API keys** if they were ever shared in chat, logs, or screenshots
3. Use **strong random** values for `ACCESS_PASSWORD` and `COOKIE_SECRET` on Vercel
4. Cookie free-tier limits are bypassable by clearing cookies — fine for a demo; monitor [OpenRouter spend](https://openrouter.ai/settings/keys)
5. Resume text is sent to OpenRouter for analysis — nothing is stored on the server

## Privacy

Resumes are processed in memory and discarded. **Nothing is stored** on the server.

## Access limits

- **2 free analyses** per browser (signed cookie)
- Enter the **access code** (`ACCESS_PASSWORD`) for unlimited use

---

Created by **[Haziq Rusyaidi](https://github.com/rrusyaidii)**
