import { extractText, getDocumentProxy } from "unpdf";
import { MAX_PDF_PAGES } from "./constants";

/**
 * Extract text from a PDF buffer using unpdf (serverless-safe on Vercel).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    if (totalPages > MAX_PDF_PAGES) {
      throw new Error(
        `PDF has too many pages (${totalPages}). Maximum is ${MAX_PDF_PAGES}.`
      );
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("too many pages")) {
      throw error;
    }
    console.error("PDF extraction error:", error);
    throw new Error(
      "Failed to extract text from PDF. Ensure the file is a valid PDF with selectable text."
    );
  }
}
