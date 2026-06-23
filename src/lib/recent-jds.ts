import { RECENT_JD_MAX_ITEMS } from "@/lib/constants";

export const RECENT_JDS_STORAGE_KEY = "rm_recent_jds";

export interface RecentJd {
  id: string;
  label: string;
  text: string;
  usedAt: string;
}

function normalizeJd(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function buildLabel(text: string): string {
  const line =
    text
      .split("\n")
      .map((part) => part.trim())
      .find(Boolean) ?? "Job description";
  return line.length > 60 ? `${line.slice(0, 60)}…` : line;
}

export function getRecentJds(): RecentJd[] {
  try {
    const raw = localStorage.getItem(RECENT_JDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentJd[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.label === "string"
    );
  } catch {
    return [];
  }
}

function saveRecentJds(items: RecentJd[]): void {
  try {
    localStorage.setItem(RECENT_JDS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function addRecentJd(text: string): RecentJd[] {
  const trimmed = text.trim();
  if (!trimmed) return getRecentJds();

  const normalized = normalizeJd(trimmed);
  const now = new Date().toISOString();
  const existing = getRecentJds().filter(
    (item) => normalizeJd(item.text) !== normalized
  );

  const entry: RecentJd = {
    id: crypto.randomUUID(),
    label: buildLabel(trimmed),
    text: trimmed,
    usedAt: now,
  };

  const next = [entry, ...existing].slice(0, RECENT_JD_MAX_ITEMS);
  saveRecentJds(next);
  return next;
}

export function removeRecentJd(id: string): RecentJd[] {
  const next = getRecentJds().filter((item) => item.id !== id);
  saveRecentJds(next);
  return next;
}
