"use client";

import { useState, useEffect } from "react";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";
import { SiteHeader, PageHero } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { UploadZone } from "@/components/upload-zone";
import { JobDescriptionField } from "@/components/job-description-field";
import { validateJobDescription } from "@/lib/validate-job-description";
import { AnalyzeButton } from "@/components/analyze-button";
import { AccessCodeField } from "@/components/access-code-field";
import { AccessCodeModal } from "@/components/access-code-modal";
import { AccessLimitModal } from "@/components/access-limit-modal";
import { ErrorBanner } from "@/components/error-banner";
import { ResultsPanel } from "@/components/results-panel";

type Status = "idle" | "analyzing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [remaining, setRemaining] = useState(FREE_ANALYSIS_LIMIT);
  const [unlocked, setUnlocked] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState("");

  const canSubmit = !!file && validateJobDescription(jd).valid;
  const isLimitReached = remaining === 0 && !unlocked;

  useEffect(() => {
    fetch("/api/access")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRemaining(data.remaining);
          setUnlocked(data.unlocked);
          if (data.remaining === 0 && !data.unlocked) {
            setLimitModalOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !file) return;

    if (isLimitReached) {
      setLimitModalOpen(true);
      return;
    }

    setStatus("analyzing");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobDescription", jd);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setError("Analysis failed. Please try again.");
        setStatus("error");
        return;
      }

      const data = await res.json();

      if (!data.success) {
        if (res.status === 429) {
          setRemaining(0);
          setLimitModalOpen(true);
          setStatus("idle");
          return;
        }
        setError(data.error || "Analysis failed. Try again.");
        setStatus("error");
        return;
      }

      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.unlocked === "boolean") setUnlocked(data.unlocked);

      setResult(data.data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setJd("");
    setResult(null);
    setError("");
    setStatus("idle");
  };

  const handleUnlocked = () => {
    setUnlocked(true);
    setRemaining(-1);
  };

  const openUnlockFlow = () => {
    if (isLimitReached) {
      setLimitModalOpen(true);
    } else {
      setCodeModalOpen(true);
    }
  };

  return (
    <div className="min-h-dvh bg-paper pb-[env(safe-area-inset-bottom)] flex flex-col">
      <SiteHeader />

      <main className="mx-auto max-w-4xl flex-1 w-full px-4 py-8 sm:px-6 sm:py-12">
        {status !== "done" && <PageHero />}

        {status === "error" && (
          <ErrorBanner message={error} onRetry={reset} />
        )}

        {status !== "done" && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-8">
              <UploadZone file={file} onFileChange={setFile} />
              <div className="border-t border-border" />
              <JobDescriptionField value={jd} onChange={setJd} />
              <div className="border-t border-border" />
              <AnalyzeButton
                isAnalyzing={status === "analyzing"}
                disabled={!canSubmit}
                limitReached={isLimitReached}
              />
              <AccessCodeField
                remaining={remaining}
                unlocked={unlocked}
                onRequestUnlock={openUnlockFlow}
              />
            </div>
          </form>
        )}

        {result && (
          <ResultsPanel
            result={result}
            resumeFileName={file?.name}
            jobDescription={jd}
            onReset={reset}
          />
        )}
      </main>

      <SiteFooter />

      <AccessCodeModal
        open={codeModalOpen}
        remaining={remaining}
        onClose={() => setCodeModalOpen(false)}
        onUnlocked={handleUnlocked}
      />

      <AccessLimitModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        onUnlocked={handleUnlocked}
      />
    </div>
  );
}
