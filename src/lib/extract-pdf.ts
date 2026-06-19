import { PDFParse } from "pdf-parse";
import { MAX_PDF_PAGES } from "./constants";

/**
 * Extract text from a PDF buffer using pdf-parse (Node-friendly, works on Vercel).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer, useSystemFonts: true });

  try {
    const info = await parser.getInfo();
    if (info.total > MAX_PDF_PAGES) {
      throw new Error(
        `PDF has too many pages (${info.total}). Maximum is ${MAX_PDF_PAGES}.`
      );
    }

    const result = await parser.getText({ pageJoiner: "\n\n" });
    return result.text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("too many pages")) {
      throw error;
    }
    console.error("PDF extraction error:", error);
    throw new Error(
      "Failed to extract text from PDF. Ensure the file is a valid PDF with selectable text."
    );
  } finally {
    await parser.destroy();
  }
}
