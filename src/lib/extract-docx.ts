import mammoth from "mammoth";

export function isDocxBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (!isDocxBuffer(buffer)) {
    throw new Error("File is not a valid .docx document.");
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(
      "Failed to extract text from Word document. Ensure the file is a valid .docx (not legacy .doc or password-protected)."
    );
  }
}
