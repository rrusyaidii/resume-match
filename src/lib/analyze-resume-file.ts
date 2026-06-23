import { analyzeResume, type AIAnalysisResult } from "@/lib/ai-client";
import { extractTextFromDocx } from "@/lib/extract-docx";
import { extractTextFromPdf } from "@/lib/extract-pdf";
import { EMPTY_RESUME_ERROR } from "@/lib/constants";
import {
  detectResumeType,
  isPdfBuffer,
  validateResumeBuffer,
  validateResumeFile,
} from "@/lib/resume-file-types";

export { isPdfBuffer };

export type ProcessResumeSuccess = {
  success: true;
  data: AIAnalysisResult;
};

export type ProcessResumeFailure = {
  success: false;
  error: string;
  status?: number;
};

export type ProcessResumeResult = ProcessResumeSuccess | ProcessResumeFailure;

async function extractResumeText(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string } | { error: string; status: number }> {
  const bufferCheck = validateResumeBuffer(buffer, fileName);
  if ("error" in bufferCheck) {
    return { error: bufferCheck.error, status: 400 };
  }

  try {
    const text =
      bufferCheck.type === "pdf"
        ? await extractTextFromPdf(buffer)
        : await extractTextFromDocx(buffer);

    if (!text.trim()) {
      return { error: EMPTY_RESUME_ERROR, status: 422 };
    }

    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("too many pages")) {
      return { error: message, status: 400 };
    }
    return {
      error: message || "Failed to read resume file.",
      status: 400,
    };
  }
}

export async function processResumeFile(
  file: File,
  jobDescription: string
): Promise<ProcessResumeResult> {
  const fileError = validateResumeFile(file);
  if (fileError) {
    return { success: false, error: fileError, status: 400 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractResumeText(buffer, file.name);

  if ("error" in extracted) {
    return { success: false, error: extracted.error, status: extracted.status };
  }

  const truncatedResume = extracted.text.slice(0, 8000);
  const truncatedJD = jobDescription.trim().slice(0, 4000);
  const data = await analyzeResume(truncatedResume, truncatedJD);

  return { success: true, data };
}

/** @deprecated Use processResumeFile */
export async function processResumePdf(
  file: File,
  jobDescription: string
): Promise<ProcessResumeResult> {
  return processResumeFile(file, jobDescription);
}

/** @deprecated Use validateResumeFile */
export function validatePdfFile(file: File): string | null {
  return validateResumeFile(file);
}

export { validateResumeFile } from "@/lib/resume-file-types";

/** @deprecated Use validateResumeBuffer via processResumeFile */
export async function validatePdfBuffer(buffer: Buffer): Promise<string | null> {
  const type = detectResumeType("resume.pdf", buffer);
  if (type !== "pdf") {
    return "Only valid PDF files are supported";
  }
  return null;
}
