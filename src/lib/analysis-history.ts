import { randomUUID } from "crypto";
import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
import type { HistoryEntry } from "@/lib/history-types";
import { HISTORY_MAX_ITEMS } from "@/lib/constants";
import { getRedisClient, isRedisConfigured } from "@/lib/usage-store";

export type { HistoryEntry } from "@/lib/history-types";

const KEY_PREFIX = "rm:v1:history:";
const devHistory = new Map<string, HistoryEntry[]>();

function historyKey(deviceId: string): string {
  return `${KEY_PREFIX}${deviceId}`;
}

function jobDescriptionPreview(jd: string): string {
  const line = jd
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "Job description";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
}

export function buildSingleHistoryEntry(
  fileName: string,
  jobDescription: string,
  result: AIAnalysisResult
): HistoryEntry {
  return {
    id: randomUUID(),
    analyzedAt: new Date().toISOString(),
    resumeFileName: fileName,
    jobDescriptionPreview: jobDescriptionPreview(jobDescription),
    jobDescription,
    matchScore: result.matchScore,
    decision: result.decision,
    isBatch: false,
    result,
  };
}

export function buildBatchHistoryEntry(
  jobDescription: string,
  batchResults: BatchResultItem[]
): HistoryEntry {
  const successful = batchResults.filter((item) => item.success && item.data);
  const topScore = successful.reduce(
    (max, item) => Math.max(max, item.data?.matchScore ?? 0),
    0
  );
  const topDecision =
    successful.find((item) => item.data?.matchScore === topScore)?.data?.decision ??
    "Batch compare";

  const names = batchResults.map((item) => item.fileName).join(", ");

  return {
    id: randomUUID(),
    analyzedAt: new Date().toISOString(),
    resumeFileName: names.length > 60 ? `${batchResults.length} resumes` : names,
    jobDescriptionPreview: jobDescriptionPreview(jobDescription),
    jobDescription,
    matchScore: topScore,
    decision: topDecision,
    isBatch: true,
    batchCount: batchResults.length,
    batchResults,
  };
}

export async function appendHistory(
  deviceId: string,
  entry: HistoryEntry
): Promise<void> {
  if (!isRedisConfigured()) {
    const list = devHistory.get(deviceId) ?? [];
    devHistory.set(deviceId, [entry, ...list].slice(0, HISTORY_MAX_ITEMS));
    return;
  }

  const client = getRedisClient()!;
  const key = historyKey(deviceId);
  await client.lpush(key, JSON.stringify(entry));
  await client.ltrim(key, 0, HISTORY_MAX_ITEMS - 1);
}

export async function getHistory(deviceId: string): Promise<HistoryEntry[]> {
  if (!isRedisConfigured()) {
    return devHistory.get(deviceId) ?? [];
  }

  const client = getRedisClient()!;
  const raw = await client.lrange<string>(historyKey(deviceId), 0, HISTORY_MAX_ITEMS - 1);

  const entries: HistoryEntry[] = [];
  for (const item of raw) {
    try {
      const parsed = typeof item === "string" ? JSON.parse(item) : item;
      if (parsed && typeof parsed === "object" && parsed.id) {
        entries.push(parsed as HistoryEntry);
      }
    } catch {
      // skip corrupt entries
    }
  }

  return entries;
}

export async function deleteHistoryEntry(
  deviceId: string,
  entryId: string
): Promise<void> {
  const entries = await getHistory(deviceId);
  const filtered = entries.filter((entry) => entry.id !== entryId);

  if (!isRedisConfigured()) {
    devHistory.set(deviceId, filtered);
    return;
  }

  const client = getRedisClient()!;
  const key = historyKey(deviceId);
  await client.del(key);
  if (filtered.length > 0) {
    await client.lpush(key, ...filtered.map((entry) => JSON.stringify(entry)));
    await client.ltrim(key, 0, HISTORY_MAX_ITEMS - 1);
  }
}

export async function clearHistory(deviceId: string): Promise<void> {
  if (!isRedisConfigured()) {
    devHistory.delete(deviceId);
    return;
  }

  const client = getRedisClient()!;
  await client.del(historyKey(deviceId));
}
