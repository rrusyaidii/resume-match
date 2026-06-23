export const FREE_ANALYSIS_LIMIT = 2;
export const JD_MIN_CHARS = 50;
export const MAX_BATCH_SIZE = 5;
export const MAX_PDF_PAGES = 50;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
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

export const SCANNED_PDF_ERROR =
  "This PDF looks like a scan or image — we need selectable text. Try exporting from Word/Google Docs or use a text-based PDF.";
