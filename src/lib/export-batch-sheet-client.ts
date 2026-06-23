import type { BatchResultItem } from "@/lib/batch-types";

const PENDING_EXPORT_KEY = "rm_pending_sheets_export";
const PENDING_EXPORT_TTL_MS = 30 * 60 * 1000;

interface PendingExportPayload {
  results: BatchResultItem[];
  jobDescription: string;
  ts: number;
}

export interface GoogleStatusResponse {
  success: boolean;
  connected: boolean;
  configured?: boolean;
  email?: string;
  error?: string;
}

export interface ExportSheetsResponse {
  success: boolean;
  url?: string;
  spreadsheetId?: string;
  mode?: "created" | "appended";
  error?: string;
}

export function savePendingExport(results: BatchResultItem[], jobDescription: string) {
  const payload: PendingExportPayload = {
    results,
    jobDescription,
    ts: Date.now(),
  };
  sessionStorage.setItem(PENDING_EXPORT_KEY, JSON.stringify(payload));
}

export function consumePendingExport(): PendingExportPayload | null {
  const raw = sessionStorage.getItem(PENDING_EXPORT_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(PENDING_EXPORT_KEY);

  try {
    const payload = JSON.parse(raw) as PendingExportPayload;
    if (!payload.ts || Date.now() - payload.ts > PENDING_EXPORT_TTL_MS) {
      return null;
    }
    if (!Array.isArray(payload.results) || !payload.jobDescription) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function fetchGoogleStatus(): Promise<GoogleStatusResponse> {
  const res = await fetch("/api/google/status");
  return res.json();
}

export function startGoogleConnect() {
  window.location.href = "/api/google/connect";
}

export async function disconnectGoogle(): Promise<void> {
  await fetch("/api/google/disconnect", { method: "POST" });
}

export async function exportToGoogleSheets(
  results: BatchResultItem[],
  jobDescription: string
): Promise<ExportSheetsResponse> {
  const res = await fetch("/api/export/google-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, jobDescription }),
  });

  return res.json();
}
