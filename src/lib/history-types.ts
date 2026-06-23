import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";

export interface HistoryEntry {
  id: string;
  analyzedAt: string;
  resumeFileName: string;
  jobDescriptionPreview: string;
  jobDescription: string;
  matchScore: number;
  decision: string;
  isBatch: boolean;
  batchCount?: number;
  result?: AIAnalysisResult;
  batchResults?: BatchResultItem[];
}
