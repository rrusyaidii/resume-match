import type { AIAnalysisResult } from "@/lib/ai-client";
import type { BatchResultItem } from "@/lib/batch-types";
import type { InterviewPrepResult } from "@/lib/interview-prep-types";

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
  /** Single-resume only. Absent until the user generates a prep pack. */
  prep?: InterviewPrepResult;
}
