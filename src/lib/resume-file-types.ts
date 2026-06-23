import { isDocxBuffer } from "@/lib/extract-docx";
import { MAX_RESUME_BYTES } from "@/lib/constants";

export type ResumeFileType = "pdf" | "docx";

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
}

const SUPPORTED_EXTENSIONS: Record<string, ResumeFileType> = {
  ".pdf": "pdf",
  ".docx": "docx",
};

const ACCEPTED_RESUME_INPUT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export { ACCEPTED_RESUME_INPUT };

export function getExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

export function isResumeFileName(fileName: string): boolean {
  return getExtension(fileName) in SUPPORTED_EXTENSIONS;
}

export function isLegacyDocFileName(fileName: string): boolean {
  return getExtension(fileName) === ".doc";
}

export function detectResumeType(fileName: string, buffer: Buffer): ResumeFileType | null {
  if (isPdfBuffer(buffer)) return "pdf";
  if (isDocxBuffer(buffer)) return "docx";

  const ext = getExtension(fileName);
  if (ext === ".doc") return null;
  return SUPPORTED_EXTENSIONS[ext] ?? null;
}

export function validateResumeFile(file: File): string | null {
  if (isLegacyDocFileName(file.name)) {
    return "Legacy .doc files are not supported. Save as .docx in Word or export from Google Docs.";
  }

  if (!isResumeFileName(file.name)) {
    return "Only PDF and Word (.docx) files are supported";
  }

  if (file.size > MAX_RESUME_BYTES) {
    return "File too large. Maximum size is 10MB";
  }

  return null;
}

export function validateResumeBuffer(
  buffer: Buffer,
  fileName: string
): { type: ResumeFileType } | { error: string } {
  if (isLegacyDocFileName(fileName)) {
    return {
      error:
        "Legacy .doc files are not supported. Save as .docx in Word or export from Google Docs.",
    };
  }

  const type = detectResumeType(fileName, buffer);
  if (!type) {
    return { error: "Only valid PDF and Word (.docx) files are supported" };
  }

  return { type };
}
