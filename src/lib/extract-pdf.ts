import { MAX_PDF_PAGES } from "./constants";

/**
 * Extract text from a PDF file buffer using pdfjs-dist legacy build.
 * Uses pathToFileURL for reliable worker URL resolution on Windows.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Use Node.js URL to create proper file:// URL (handles Windows paths)
    const { pathToFileURL } = await import("url");
    const workerPath = process.cwd() +
      "/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const doc = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: false,
    }).promise;

    if (doc.numPages > MAX_PDF_PAGES) {
      doc.destroy();
      throw new Error(
        `PDF has too many pages (${doc.numPages}). Maximum is ${MAX_PDF_PAGES}.`
      );
    }

    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str)
        .join(" ");
      pages.push(text);
    }

    doc.destroy();
    return pages.join("\n\n");
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(
      "Failed to extract text from PDF. Ensure the file is a valid PDF with selectable text."
    );
  }
}
