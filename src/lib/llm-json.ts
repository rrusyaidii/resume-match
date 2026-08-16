export function extractJsonObject(raw: string): string {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}

export function repairJson(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([\]}])/g, "$1");
}

/** True when an error looks like malformed model JSON rather than a transport failure. */
export function isJsonParseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("JSON") ||
    message.includes("Unexpected token") ||
    message.includes("position")
  );
}
