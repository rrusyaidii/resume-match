import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
import { RUBRIC_DIMENSIONS } from "@/lib/evaluation-rubric";

const SHEET_CELL_LIMIT = 50000;
const JD_EXCERPT_LENGTH = 120;
const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

export const SHEET_HEADERS_VERSION = 2;

export interface ExportMeta {
  exportId: string;
  exportedAtLabel: string;
  jobDescriptionExcerpt: string;
  candidateCount: number;
}

export const CANDIDATE_HEADERS = [
  "Export ID",
  "Exported at",
  "Job description excerpt",
  "Rank",
  "Filename",
  "Score",
  "Decision",
  "Summary",
  "Verdict",
  "Strengths",
  "Gaps",
  ...RUBRIC_DIMENSIONS.map((dim) => dim.label),
  "Compliance flags",
  "Status",
];

function dimensionScore(data: AIAnalysisResult, id: string): number | "" {
  const dim = data.dimensions.find((entry) => entry.id === id);
  return dim ? dim.score : "";
}

function joinList(items: string[]): string {
  return items.join("; ");
}

function truncateCell(value: string): string {
  if (value.length <= SHEET_CELL_LIMIT) return value;
  return `${value.slice(0, SHEET_CELL_LIMIT - 1)}…`;
}

export function buildDailySpreadsheetTitle(date = new Date()): string {
  const label = date.toLocaleDateString("en-MY", {
    timeZone: MALAYSIA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `ResuMatch — ${label}`;
}

export function formatMalaysiaExportTime(date = new Date()): string {
  const formatted = date.toLocaleString("en-MY", {
    timeZone: MALAYSIA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatted} MYT`;
}

export function generateExportId(date = new Date()): string {
  const stamp = date.toLocaleString("sv-SE", { timeZone: MALAYSIA_TZ });
  const [datePart, timePart] = stamp.split(" ");
  const compactDate = datePart?.replace(/-/g, "") ?? "";
  const compactTime = timePart?.replace(/:/g, "") ?? "";
  return `EXP-${compactDate}-${compactTime}`;
}

export function buildJobDescriptionExcerpt(jobDescription: string): string {
  const trimmed = jobDescription.trim().replace(/\s+/g, " ");
  if (trimmed.length <= JD_EXCERPT_LENGTH) return trimmed;
  return `${trimmed.slice(0, JD_EXCERPT_LENGTH - 1)}…`;
}

export function buildExportMeta(
  jobDescription: string,
  results: BatchResultItem[],
  exportedAt = new Date()
): ExportMeta {
  const candidateCount = results.filter((item) => item.success && item.data).length;

  return {
    exportId: generateExportId(exportedAt),
    exportedAtLabel: formatMalaysiaExportTime(exportedAt),
    jobDescriptionExcerpt: buildJobDescriptionExcerpt(jobDescription),
    candidateCount,
  };
}

function metaPrefix(meta: ExportMeta): [string, string, string] {
  return [meta.exportId, meta.exportedAtLabel, meta.jobDescriptionExcerpt];
}

export function buildCandidateDataRows(
  results: BatchResultItem[],
  meta: ExportMeta
): string[][] {
  const successful = results
    .filter((item): item is BatchResultItem & { success: true; data: AIAnalysisResult } =>
      item.success && !!item.data
    )
    .sort((a, b) => b.data.matchScore - a.data.matchScore);

  const rows: string[][] = [];

  successful.forEach((item, index) => {
    const data = item.data;
    rows.push([
      ...metaPrefix(meta),
      String(index + 1),
      item.fileName,
      String(data.matchScore),
      data.decision,
      truncateCell(data.summary),
      truncateCell(data.verdict),
      truncateCell(joinList(data.strengths)),
      truncateCell(joinList(data.gaps)),
      ...RUBRIC_DIMENSIONS.map((dim) => String(dimensionScore(data, dim.id))),
      truncateCell(joinList(data.gateFlags ?? [])),
      "Analyzed",
    ]);
  });

  const failed = results.filter((item) => !item.success);
  for (const item of failed) {
    rows.push([
      ...metaPrefix(meta),
      "",
      item.fileName,
      "",
      "",
      "",
      "",
      "",
      "",
      ...RUBRIC_DIMENSIONS.map(() => ""),
      "",
      truncateCell(item.error ?? "Failed"),
    ]);
  }

  return rows;
}

export function buildCandidateRows(
  results: BatchResultItem[],
  meta: ExportMeta
): string[][] {
  return [CANDIDATE_HEADERS, ...buildCandidateDataRows(results, meta)];
}

export function buildJobDescriptionBlockRows(
  jobDescription: string,
  meta: ExportMeta
): string[][] {
  return [
    [`Export ID: ${meta.exportId}`],
    [`Exported: ${meta.exportedAtLabel}`],
    [`Candidates: ${meta.candidateCount}`],
    [truncateCell(jobDescription.trim())],
    ["—"],
  ];
}

/** @deprecated Use buildJobDescriptionBlockRows */
export function buildJobDescriptionRows(
  jobDescription: string,
  meta: ExportMeta
): string[][] {
  return buildJobDescriptionBlockRows(jobDescription, meta);
}

/** @deprecated Use buildJobDescriptionBlockRows */
export function buildJobDescriptionAppendRows(
  jobDescription: string,
  meta: ExportMeta
): string[][] {
  return buildJobDescriptionBlockRows(jobDescription, meta);
}
