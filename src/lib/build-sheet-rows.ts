import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
import { RUBRIC_DIMENSIONS } from "@/lib/evaluation-rubric";

const SHEET_CELL_LIMIT = 50000;
const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

export const CANDIDATE_HEADERS = [
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

export function buildCandidateDataRows(results: BatchResultItem[]): string[][] {
  const successful = results
    .filter((item): item is BatchResultItem & { success: true; data: AIAnalysisResult } =>
      item.success && !!item.data
    )
    .sort((a, b) => b.data.matchScore - a.data.matchScore);

  const rows: string[][] = [];

  successful.forEach((item, index) => {
    const data = item.data;
    rows.push([
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

export function buildCandidateRows(results: BatchResultItem[]): string[][] {
  return [CANDIDATE_HEADERS, ...buildCandidateDataRows(results)];
}

export function buildJobDescriptionRows(jobDescription: string): string[][] {
  return [["Job description"], [truncateCell(jobDescription.trim())]];
}

export function buildJobDescriptionAppendRows(
  jobDescription: string,
  exportedAt = new Date()
): string[][] {
  return [
    ["—"],
    [`Exported ${formatMalaysiaExportTime(exportedAt)}`],
    [truncateCell(jobDescription.trim())],
  ];
}
