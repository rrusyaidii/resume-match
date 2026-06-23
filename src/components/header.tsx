import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-ink leading-none">ResuMatch</p>
            <p className="text-[11px] text-muted mt-0.5">Resume screening</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function PageHero() {
  return (
    <div className="mb-8 text-center sm:mb-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Paste the JD. Get a hire signal.
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-base text-muted leading-relaxed">
        Upload a resume, paste the job description, and get a scored verdict using the Malaysia tech rubric —{" "}
        <span className="text-match font-medium">Shortlist</span>
        {" · "}
        <span className="text-caution font-medium">HM Review</span>
        {" · "}
        <span className="text-gap font-medium">Reject</span>.
      </p>
    </div>
  );
}
