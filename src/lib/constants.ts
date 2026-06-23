export const FREE_ANALYSIS_LIMIT = 2;
export const JD_MIN_CHARS = 50;
export const MAX_BATCH_SIZE = 10;
export const MAX_PDF_PAGES = 50;
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
/** @deprecated Use MAX_RESUME_BYTES */
export const MAX_PDF_BYTES = MAX_RESUME_BYTES;
export const UNLOCK_RATE_LIMIT = 5;
export const UNLOCK_RATE_WINDOW_MS = 15 * 60 * 1000;
export const UNLOCK_RATE_WINDOW_SEC = UNLOCK_RATE_WINDOW_MS / 1000;

export const ANALYZE_BURST_LIMIT = 3;
export const ANALYZE_BURST_WINDOW_SEC = 10 * 60;
export const ANALYZE_IP_DAILY_LIMIT = 10;
export const ANALYZE_IP_DAILY_WINDOW_SEC = 24 * 60 * 60;
export const ANALYZE_GLOBAL_DAILY_LIMIT = 200;
export const ANALYZE_GLOBAL_DAILY_WINDOW_SEC = 24 * 60 * 60;

export const RATE_LIMIT_MESSAGE =
  "Too many requests. Try again later or enter an access code.";

export const HISTORY_MAX_ITEMS = 10;
export const BATCH_SESSION_TTL_SEC = 15 * 60;
export const RECENT_JD_MAX_ITEMS = 5;

export const EMPTY_RESUME_ERROR =
  "Could not read text from this file. Use a text-based PDF or .docx export from Word/Google Docs.";

/** @deprecated Use EMPTY_RESUME_ERROR */
export const SCANNED_PDF_ERROR = EMPTY_RESUME_ERROR;
