export function isAcceptedResumeFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".doc")) return false;
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
}

export const ACCEPTED_RESUME_INPUT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
