import {
  buildCandidateDataRows,
  buildCandidateRows,
  buildDailySpreadsheetTitle,
  buildJobDescriptionAppendRows,
  buildJobDescriptionRows,
} from "@/lib/build-sheet-rows";
import type { BatchResultItem } from "@/lib/batch-types";
import {
  getDailySheet,
  getMalaysiaDateKey,
  setDailySheet,
} from "@/lib/google-daily-sheet-store";
import { getGoogleAccessToken } from "@/lib/google-oauth";

export type ExportMode = "created" | "appended";

interface ExportSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  mode: ExportMode;
}

async function sheetsRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`https://sheets.googleapis.com/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

async function appendSheetRows(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const encodedRange = encodeURIComponent(range);
  await sheetsRequest(
    accessToken,
    `/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    }
  );
}

async function createDailySpreadsheet(
  accessToken: string,
  results: BatchResultItem[],
  jobDescription: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = buildDailySpreadsheetTitle();

  const created = await sheetsRequest<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }>(accessToken, "/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: "Candidates" } },
        { properties: { title: "Job description" } },
      ],
    }),
  });

  const candidateRows = buildCandidateRows(results);
  const jobRows = buildJobDescriptionRows(jobDescription);

  await sheetsRequest(accessToken, `/spreadsheets/${created.spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: [
        {
          range: "Candidates!A1",
          majorDimension: "ROWS",
          values: candidateRows,
        },
        {
          range: "'Job description'!A1",
          majorDimension: "ROWS",
          values: jobRows,
        },
      ],
    }),
  });

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
  };
}

async function appendBatchToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  results: BatchResultItem[],
  jobDescription: string,
  exportedAt: Date
): Promise<void> {
  const candidateRows = buildCandidateDataRows(results);
  const jobRows = buildJobDescriptionAppendRows(jobDescription, exportedAt);

  if (candidateRows.length > 0) {
    await appendSheetRows(accessToken, spreadsheetId, "Candidates!A:Z", candidateRows);
  }

  await appendSheetRows(
    accessToken,
    spreadsheetId,
    "'Job description'!A:A",
    jobRows
  );
}

export async function exportBatchToGoogleSheet(
  refreshToken: string,
  deviceId: string,
  results: BatchResultItem[],
  jobDescription: string
): Promise<ExportSpreadsheetResult> {
  const accessToken = await getGoogleAccessToken(refreshToken);
  const dateKey = getMalaysiaDateKey();
  const exportedAt = new Date();
  const existing = await getDailySheet(deviceId);

  if (existing && existing.dateKey === dateKey) {
    try {
      await appendBatchToSpreadsheet(
        accessToken,
        existing.spreadsheetId,
        results,
        jobDescription,
        exportedAt
      );

      return {
        spreadsheetId: existing.spreadsheetId,
        spreadsheetUrl: existing.spreadsheetUrl,
        mode: "appended",
      };
    } catch {
      // Sheet may have been deleted — fall through and create a new one.
    }
  }

  const created = await createDailySpreadsheet(accessToken, results, jobDescription);

  await setDailySheet(deviceId, {
    dateKey,
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
  });

  return {
    ...created,
    mode: "created",
  };
}
