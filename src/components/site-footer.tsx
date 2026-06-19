export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 text-center space-y-2">
        <p className="text-xs text-muted leading-relaxed">
          Resumes are analyzed by AI and are not stored on our servers.
        </p>
        <p className="text-xs text-muted">
          Created by{" "}
          <a
            href="https://github.com/rrusyaidii"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal hover:text-teal/80 underline underline-offset-2 transition-colors"
          >
            Haziq Rusyaidi
          </a>
        </p>
      </div>
    </footer>
  );
}
