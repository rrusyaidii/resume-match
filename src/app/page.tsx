"use client";

import { useState, useEffect } from "react";
import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
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
import { AnalyzingOverlay } from "@/components/analyzing-overlay";
import { BatchComparisonPanel } from "@/components/batch-comparison-panel";
import { ResultsPanel } from "@/components/results-panel";
import {
  SAMPLE_JOB_DESCRIPTION,
  fetchSampleResumeFile,
} from "@/lib/sample-data";

type Status = "idle" | "analyzing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [jd, setJd] = useState("");
  const [remaining, setRemaining] = useState(FREE_ANALYSIS_LIMIT);
  const [unlocked, setUnlocked] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResultItem[] | null>(null);
  const [error, setError] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const canSubmit = files.length >= 1 && validateJobDescription(jd).valid;
  const isLimitReached = remaining === 0 && !unlocked;
  const isBatch = files.length > 1;

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
    if (!canSubmit || files.length === 0) return;

    if (isLimitReached) {
      setLimitModalOpen(true);
      return;
    }

    setStatus("analyzing");
    setError("");
    setResult(null);
    setBatchResults(null);

    const formData = new FormData();
    formData.append("jobDescription", jd);
    for (const file of files) {
      formData.append("resume", file);
    }

    const endpoint = isBatch ? "/api/analyze-batch" : "/api/analyze";

    try {
      const res = await fetch(endpoint, {
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

      if (isBatch) {
        setBatchResults(data.results ?? []);
      } else {
        setResult(data.data);
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const reset = () => {
    setFiles([]);
    setJd("");
    setResult(null);
    setBatchResults(null);
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

  const handleTrySample = async () => {
    if (isLoadingSample || status === "analyzing") return;
    setIsLoadingSample(true);
    setError("");
    try {
      const sampleFile = await fetchSampleResumeFile();
      setFiles([sampleFile]);
      setJd(SAMPLE_JOB_DESCRIPTION);
      setResult(null);
      setBatchResults(null);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample data.");
      setStatus("error");
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper pb-[env(safe-area-inset-bottom)] flex flex-col">
      <SiteHeader />

      <main className="mx-auto max-w-4xl flex-1 w-full px-4 py-8 sm:px-6 sm:py-12">
        {status !== "done" && status !== "analyzing" && <PageHero />}

        {status === "error" && (
          <ErrorBanner message={error} onRetry={reset} />
        )}

        {status === "analyzing" && (
          <AnalyzingOverlay batch={isBatch} fileCount={files.length} />
        )}

        {status !== "done" && status !== "analyzing" && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4 flex justify-center sm:justify-end">
              <button
                type="button"
                onClick={handleTrySample}
                disabled={isLoadingSample}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-teal hover:bg-teal/5 hover:border-teal/30 transition-colors focus-ring disabled:opacity-50"
              >
                {isLoadingSample ? "Loading sample…" : "Try with sample"}
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-8">
              <UploadZone files={files} onFilesChange={setFiles} />
              <div className="border-t border-border" />
              <JobDescriptionField value={jd} onChange={setJd} />
              <div className="border-t border-border" />
              <AnalyzeButton
                isAnalyzing={false}
                disabled={!canSubmit}
                limitReached={isLimitReached}
                remaining={remaining}
                unlocked={unlocked}
                fileCount={files.length}
              />
              <AccessCodeField
                remaining={remaining}
                unlocked={unlocked}
                onRequestUnlock={openUnlockFlow}
              />
            </div>
          </form>
        )}

        {result && !isBatch && (
          <ResultsPanel
            result={result}
            resumeFileName={files[0]?.name}
            jobDescription={jd}
            onReset={reset}
          />
        )}

        {batchResults && isBatch && (
          <BatchComparisonPanel
            results={batchResults}
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
