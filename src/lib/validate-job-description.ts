import { JD_MIN_CHARS } from "./constants";

export { JD_MIN_CHARS };

const HOST_ONLY = /^(https?:\/\/)?[\w.-]+(:\d+)?\/?$/i;

export function validateJobDescription(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();

  if (trimmed.length < JD_MIN_CHARS) {
    return {
      valid: false,
      error: `Job description must be at least ${JD_MIN_CHARS} characters with real role details.`,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return {
      valid: false,
      error: "Paste a full job description with at least 4 words (role, skills, responsibilities).",
    };
  }

  if (HOST_ONLY.test(trimmed)) {
    return {
      valid: false,
      error: "Enter a job description, not a URL or hostname.",
    };
  }

  const hasSubstantiveWord = words.some((word) => {
    const letters = word.replace(/[^a-zA-Z]/g, "");
    return letters.length >= 4;
  });

  if (!hasSubstantiveWord) {
    return {
      valid: false,
      error: "Job description must include readable role requirements, not placeholders.",
    };
  }

  return { valid: true };
}
