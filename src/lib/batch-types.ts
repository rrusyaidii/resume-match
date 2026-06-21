import type { AIAnalysisResult } from "@/lib/ai-client";

export interface BatchResultItem {
  fileName: string;
  success: boolean;
  data?: AIAnalysisResult;
  error?: string;
}
