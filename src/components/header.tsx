import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header id="site-header" className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-white shadow-sm">
            <BrandMark className="h-5 w-5" />
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
