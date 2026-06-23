"use client";

import { useEffect, useState } from "react";
import type { BatchResultItem } from "@/lib/batch-types";
import {
  disconnectGoogle,
  exportToGoogleSheets,
  fetchGoogleStatus,
  savePendingExport,
  startGoogleConnect,
} from "@/lib/export-batch-sheet-client";

interface GoogleSheetsActionsProps {
  results: BatchResultItem[];
  jobDescription: string;
  exportableCount: number;
}

export function GoogleSheetsActions({
  results,
  jobDescription,
  exportableCount,
}: GoogleSheetsActionsProps) {
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [email, setEmail] = useState<string | undefined>();
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchGoogleStatus()
      .then((data) => {
        if (cancelled) return;
        setConfigured(data.configured !== false);
        setConnected(Boolean(data.connected));
        setEmail(data.email);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = () => {
    savePendingExport(results, jobDescription);
    startGoogleConnect();
  };

  const handleExport = async () => {
    if (isExporting || exportableCount === 0) return;
    setIsExporting(true);
    setError("");
    setMessage("");

    try {
      const data = await exportToGoogleSheets(results, jobDescription);
      if (!data.success || !data.url) {
        if (data.error?.includes("Connect Google")) {
          handleConnect();
          return;
        }
        setError(data.error || "Export failed.");
        return;
      }

      setMessage(
        data.mode === "appended"
          ? "Added to today's sheet."
          : "Opened today's new sheet."
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setError("");
    setMessage("");

    try {
      await disconnectGoogle();
      setConnected(false);
      setEmail(undefined);
      setMessage("Google disconnected.");
    } catch {
      setError("Could not disconnect Google.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <p className="text-xs text-muted py-1">Checking Google connection…</p>
    );
  }

  if (!configured) {
    return (
      <p className="text-xs text-muted py-1">
        Google Sheets export is not configured on this server.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          <span className="font-medium">Google Sheets</span>
          {connected && email && (
            <span className="text-muted">
              {" "}
              · <span className="truncate">{email}</span>
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={handleConnect}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface transition-colors focus-ring"
            >
              Connect Google
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || exportableCount === 0}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface disabled:opacity-50 transition-colors focus-ring"
              >
                {isExporting ? "Exporting…" : "Export to today's sheet"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex min-h-10 items-center justify-center px-3 py-2 text-xs font-medium text-muted hover:text-ink transition-colors focus-ring rounded-lg"
              >
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">
        Adds to today&apos;s spreadsheet in your Google Drive. Candidate data is sent to Google.
      </p>

      {message && <p className="text-xs text-match">{message}</p>}
      {error && <p className="text-xs text-gap">{error}</p>}
    </div>
  );
}
