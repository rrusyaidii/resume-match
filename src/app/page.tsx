"use client";

import { useState, useEffect, useCallback } from "react";
import type { AIAnalysisResult } from "@/lib/ai-client";
import type { HistoryEntry } from "@/lib/history-types";
import type { BatchResultItem } from "@/lib/batch-types";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";
import { addRecentJd, getRecentJds, removeRecentJd, type RecentJd } from "@/lib/recent-jds";
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
import { AnalysisHistoryPanel } from "@/components/analysis-history-panel";
import { TurnstileWidget } from "@/components/turnstile-widget";
import {
  SAMPLE_JOB_DESCRIPTION,
  fetchSampleResumeFile,
} from "@/lib/sample-data";

type Status = "idle" | "analyzing" | "done" | "error";

interface AnalyzeApiResponse {
  success: boolean;
  data?: AIAnalysisResult;
  error?: string;
  remaining?: number;
  unlocked?: boolean;
  batchSessionId?: string;
  batchComplete?: boolean;
}

async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    if (data.success && Array.isArray(data.entries)) {
      return data.entries as HistoryEntry[];
    }
  } catch {
    // ignore
  }
  return [];
}

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
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [recentJds, setRecentJds] = useState<RecentJd[]>([]);
  const [error, setError] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileRequired = !unlocked && Boolean(turnstileSiteKey);

  const canSubmit = files.length >= 1 && validateJobDescription(jd).valid;
  const isLimitReached = remaining === 0 && !unlocked;
  const isBatch = files.length > 1;

  const refreshHistory = useCallback(async () => {
    const entries = await loadHistory();
    setHistoryEntries(entries);
  }, []);

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

    setRecentJds(getRecentJds());
    void refreshHistory();
  }, [refreshHistory]);

  const applyAnalyzeMeta = (data: AnalyzeApiResponse) => {
    if (typeof data.remaining === "number") setRemaining(data.remaining);
    if (typeof data.unlocked === "boolean") setUnlocked(data.unlocked);
  };

  const analyzeOneFile = async (
    file: File,
    options: {
      batchSessionId?: string;
      batchTotal?: number;
      batchResults?: BatchResultItem[];
      includeTurnstile: boolean;
    }
  ): Promise<{ response: Response; data: AnalyzeApiResponse }> => {
    const formData = new FormData();
    formData.append("jobDescription", jd);
    formData.append("resume", file);

    if (options.batchSessionId) {
      formData.append("batchSessionId", options.batchSessionId);
    } else if (options.batchTotal && options.batchTotal > 1) {
      formData.append("batchTotal", String(options.batchTotal));
    }

    if (options.batchResults && options.batchResults.length > 0) {
      formData.append("batchResults", JSON.stringify(options.batchResults));
    }

    if (options.includeTurnstile && turnstileRequired && turnstileToken) {
      formData.append("turnstileToken", turnstileToken);
    }

    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        response,
        data: { success: false, error: "Analysis failed. Please try again." },
      };
    }

    const data = (await response.json()) as AnalyzeApiResponse;
    return { response, data };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || files.length === 0) return;

    if (isLimitReached) {
      setLimitModalOpen(true);
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError("Complete the security check below before analyzing.");
      setStatus("error");
      return;
    }

    setStatus("analyzing");
    setError("");
    setResult(null);
    setBatchResults(null);

    try {
      if (!isBatch) {
        const { response, data } = await analyzeOneFile(files[0], {
          includeTurnstile: true,
        });

        if (!data.success) {
          if (response.status === 429 && data.error?.includes("Free limit")) {
            setRemaining(0);
            setLimitModalOpen(true);
            setStatus("idle");
            setTurnstileToken("");
            return;
          }
          setError(data.error || "Analysis failed. Try again.");
          setStatus("error");
          setTurnstileToken("");
          return;
        }

        applyAnalyzeMeta(data);
        setResult(data.data ?? null);
        setRecentJds(addRecentJd(jd));
        await refreshHistory();
        setStatus("done");
        return;
      }

      const results: BatchResultItem[] = [];
      let batchSessionId: string | undefined;
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const isLast = i === files.length - 1;

        const { response, data } = await analyzeOneFile(file, {
          batchSessionId,
          batchTotal: batchSessionId ? undefined : total,
          batchResults: isLast ? results : undefined,
          includeTurnstile: i === 0,
        });

        if (data.batchSessionId) {
          batchSessionId = data.batchSessionId;
        }

        if (!data.success) {
          if (response.status === 429 && data.error?.includes("Free limit")) {
            setRemaining(0);
            setLimitModalOpen(true);
            setStatus(results.length > 0 ? "done" : "idle");
            if (results.length > 0) {
              setBatchResults(results);
            }
            setTurnstileToken("");
            return;
          }

          results.push({
            fileName: file.name,
            success: false,
            error: data.error || "Analysis failed.",
          });

          if (i === 0) {
            setError(data.error || "Analysis failed. Try again.");
            setStatus("error");
            setTurnstileToken("");
            return;
          }
          continue;
        }

        applyAnalyzeMeta(data);
        results.push({
          fileName: file.name,
          success: true,
          data: data.data,
        });
      }

      const anySuccess = results.some((item) => item.success);
      if (!anySuccess) {
        setError("No resumes could be analyzed.");
        setStatus("error");
        setTurnstileToken("");
        return;
      }

      setBatchResults(results);
      setRecentJds(addRecentJd(jd));
      await refreshHistory();
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
      setTurnstileToken("");
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
    setTurnstileToken("");
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
      setRecentJds(addRecentJd(SAMPLE_JOB_DESCRIPTION));
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

  const handleSelectHistory = (entry: HistoryEntry) => {
    setJd(entry.jobDescription);
    setError("");
    if (entry.isBatch && entry.batchResults && entry.batchResults.length > 0) {
      setBatchResults(entry.batchResults);
      setResult(null);
      setFiles([]);
    } else if (entry.result) {
      setResult(entry.result);
      setBatchResults(null);
      setFiles([]);
    }
    setStatus("done");
  };

  const handleClearHistory = async () => {
    await fetch("/api/history", { method: "DELETE" });
    setHistoryEntries([]);
  };

  const handleRemoveHistory = async (entryId: string) => {
    await fetch(`/api/history?entryId=${encodeURIComponent(entryId)}`, {
      method: "DELETE",
    });
    setHistoryEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  return (
    <div className="min-h-dvh bg-paper pb-[env(safe-area-inset-bottom)] flex flex-col">
      <SiteHeader />

      <main className="mx-auto max-w-4xl flex-1 w-full px-4 py-8 sm:px-6 sm:py-12">
        {status !== "done" && status !== "analyzing" && <PageHero />}

        {status !== "analyzing" && status !== "done" && (
          <AnalysisHistoryPanel
            entries={historyEntries}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
            onRemove={handleRemoveHistory}
            disabled={status === "error"}
          />
        )}

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
            <div className="form-rail rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-4 sm:p-6 sm:p-8 space-y-8">
                <section aria-labelledby="section-resume">
                  <h2 id="section-resume" className="workflow-section-label mb-3">
                    Resume
                  </h2>
                  <p className="text-xs text-muted mb-3 -mt-1">PDF or Word (.docx) · up to 5 files</p>
                  <UploadZone
                    files={files}
                    onFilesChange={setFiles}
                    labelledBy="section-resume"
                  />
                </section>

                <section aria-labelledby="section-jd">
                  <h2 id="section-jd" className="workflow-section-label mb-3">
                    Job description
                  </h2>
                  <JobDescriptionField
                    value={jd}
                    onChange={setJd}
                    recentJds={recentJds}
                    onSelectRecent={setJd}
                    onRemoveRecent={(id) => setRecentJds(removeRecentJd(id))}
                    labelledBy="section-jd"
                  />
                </section>

                <AnalyzeButton
                  isAnalyzing={false}
                  disabled={!canSubmit || (turnstileRequired && !turnstileToken)}
                  limitReached={isLimitReached}
                  remaining={remaining}
                  unlocked={unlocked}
                  fileCount={files.length}
                />
              {turnstileRequired && turnstileSiteKey && (
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                />
              )}
              <AccessCodeField
                remaining={remaining}
                unlocked={unlocked}
                onRequestUnlock={openUnlockFlow}
              />
              </div>
            </div>
          </form>
        )}

        {result && !batchResults && (
          <ResultsPanel
            result={result}
            resumeFileName={files[0]?.name ?? "Resume"}
            jobDescription={jd}
            onReset={reset}
          />
        )}

        {batchResults && batchResults.length > 0 && (
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
