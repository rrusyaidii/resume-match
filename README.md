# ResuMatch — AI Resume Screener

Upload one or more resume PDFs or Word (.docx) files, paste a job description, and get AI-powered match scores with strengths, gaps, and hiring recommendations.

Built with **Next.js 16**, **OpenRouter** (Gemini 2.5 Flash), **Upstash Redis**, and **unpdf**.

---

## Features

- **Single or batch screening** — 1 PDF works as before; add up to 5 to compare scores side-by-side (one JD, ranked by match)
- **Malaysia hiring rubric** — Weighted scores across 5 dimensions for engineering, HR, admin, sales, and all roles; Shortlist / HM Review / Reject decisions
- **PDF parsing** — Text extraction via unpdf (50 pages max, 10 MB per file); Word `.docx` via mammoth
- **Full report** — Strengths, gaps, verdict, recommendations; open PDF report in a new tab
- **Resume upload** — PDF or Word (.docx); Google Docs users can download as .docx
- **Try with sample** — Pre-loaded resume + job description for a quick demo
- **Analysis history** — Last 10 results in Redis per device; restore with one click
- **Recent job descriptions** — Last 5 JDs in localStorage for quick reuse
- **Free tier** — 2 free analyses; access code unlocks unlimited use
- **Light / dark mode** — Toggle in the header; preference saved locally
- **Responsive UI** — Mobile-friendly forms, results, and comparison grid
- **Google Sheets export** — After single or batch analysis, connect Google and export to one spreadsheet per day (Malaysia time); multiple exports the same day append to the same sheet

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (Turbopack) |
| Language | TypeScript |
| AI | OpenRouter · `google/gemini-2.5-flash` |
| PDF | unpdf · jsPDF (reports) |
| Styling | Tailwind CSS v4 |
| Access | Upstash Redis + HMAC-signed cookies |

## Local development

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Required env vars: `OPENROUTER_API_KEY`, `ACCESS_PASSWORD`, `COOKIE_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Upstash Redis (free-tier limits)

1. Create a free database at [console.upstash.com](https://console.upstash.com)
2. Copy the **REST URL** and **REST TOKEN**
3. Add both to `.env.local` (and Vercel project env vars for production)
4. Redeploy after adding env vars

### Rate limits (Upstash Redis)

Analyze endpoints enforce burst and daily caps for free-tier traffic:

| Limit | Default |
|-------|---------|
| Burst per IP | 3 / 10 min |
| Daily per IP | 10 / 24 h |
| Global daily (free tier) | 200 / 24 h |

Unlocked users skip IP limits. Tune in `src/lib/constants.ts`.

### Cloudflare Turnstile (optional)

Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to require a captcha on free-tier analyze only. Unlocked users skip it.

### Google Sheets export (optional)

1. Google Cloud Console → enable **Google Sheets API** + **Google Drive API**
2. OAuth consent screen → add scopes: `spreadsheets`, `drive.file`, `userinfo.email`
3. Create OAuth **Web client** → redirect URI: `http://localhost:3000/api/google/callback` (and your production URL)
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local` and Vercel
5. Requires Upstash Redis (tokens stored encrypted per device)
6. Exports compile into **one spreadsheet per Malaysia calendar day**; a new sheet is created the next day

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # single resume
│   │   ├── analyze-batch/    # multi-resume (1 credit per batch)
│   │   ├── export/google-sheets/
│   │   ├── google/connect|callback|status|disconnect
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
    ├── evaluation-rubric.ts      # weights, decision bands, JSON schema
    ├── rubric/
    │   ├── recruiter-playbook.md   # recruiter judgment — edit to tune AI screening
    │   └── load-playbook.ts
    ├── extract-pdf.ts
    └── analyze-resume-file.ts
```

### Tuning the AI rubric

Recruiter judgment (persona, Malaysia hiring context, red flags, examples) lives in [`src/lib/rubric/recruiter-playbook.md`](src/lib/rubric/recruiter-playbook.md). Edit that file to change how Gemini reasons about candidates. Dimension weights, decision bands, and score math stay in [`src/lib/evaluation-rubric.ts`](src/lib/evaluation-rubric.ts).

---

Created by **[Haziq Rusyaidi](https://github.com/rrusyaidii)**
