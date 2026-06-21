import { analyzeResume, type AIAnalysisResult } from "@/lib/ai-client";
import { extractTextFromPdf } from "@/lib/extract-pdf";
import { MAX_PDF_BYTES, SCANNED_PDF_ERROR } from "@/lib/constants";

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
}

export function validatePdfFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are supported";
  }
  if (file.size > MAX_PDF_BYTES) {
    return "File too large. Maximum size is 10MB";
  }
  return null;
}

export async function validatePdfBuffer(buffer: Buffer): Promise<string | null> {
  if (!isPdfBuffer(buffer)) {
    return "Only valid PDF files are supported";
  }
  return null;
}

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

export async function processResumePdf(
  file: File,
  jobDescription: string
): Promise<ProcessResumeResult> {
  const fileError = validatePdfFile(file);
  if (fileError) {
    return { success: false, error: fileError, status: 400 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const bufferError = await validatePdfBuffer(buffer);
  if (bufferError) {
    return { success: false, error: bufferError, status: 400 };
  }

  let resumeText: string;
  try {
    resumeText = await extractTextFromPdf(buffer);
  } catch (pdfError) {
    const message = pdfError instanceof Error ? pdfError.message : "";
    if (message.includes("too many pages")) {
      return { success: false, error: message, status: 400 };
    }
    throw pdfError;
  }

  if (!resumeText.trim()) {
    return { success: false, error: SCANNED_PDF_ERROR, status: 422 };
  }

  const truncatedResume = resumeText.slice(0, 8000);
  const truncatedJD = jobDescription.trim().slice(0, 4000);
  const data = await analyzeResume(truncatedResume, truncatedJD);

  return { success: true, data };
}
