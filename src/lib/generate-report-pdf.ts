import { jsPDF } from "jspdf";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { getTierMeta } from "@/components/results-utils";

export interface ReportPdfOptions {
  resumeFileName?: string;
  jobDescription?: string;
}

const JD_PDF_MAX_CHARS = 2000;

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_HEIGHT = 297;
const BOTTOM_MARGIN = 25;

const COLORS = {
  ink: [26, 35, 50] as [number, number, number],
  muted: [92, 102, 120] as [number, number, number],
  teal: [42, 107, 107] as [number, number, number],
  match: [45, 106, 78] as [number, number, number],
  caution: [166, 124, 0] as [number, number, number],
  gap: [155, 59, 59] as [number, number, number],
  paper: [246, 244, 239] as [number, number, number],
  border: [220, 224, 230] as [number, number, number],
};

function tierColor(tier: "strong" | "partial" | "weak"): [number, number, number] {
  switch (tier) {
    case "strong":
      return COLORS.match;
    case "partial":
      return COLORS.caution;
    default:
      return COLORS.gap;
  }
}

function tierTint(tier: "strong" | "partial" | "weak"): [number, number, number] {
  switch (tier) {
    case "strong":
      return [236, 246, 240];
    case "partial":
      return [252, 246, 232];
    default:
      return [252, 238, 238];
  }
}

function buildFilename(resumeFileName?: string): string {
  if (!resumeFileName) return "resumatch-report.pdf";
  const base = resumeFileName.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-");
  return `analysis-${base}.pdf`;
}

class PdfWriter {
  private doc: jsPDF;
  private y: number;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.y = MARGIN;
    this.paintPageBackground();
  }

  private paintPageBackground() {
    this.doc.setFillColor(...COLORS.paper);
    this.doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
  }

  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
      this.doc.addPage();
      this.paintPageBackground();
      this.y = MARGIN;
    }
  }

  private writeLines(
    lines: string[],
    fontSize: number,
    color: [number, number, number],
    lineHeight = 1.45
  ) {
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...color);
    const step = fontSize * 0.35 * lineHeight;
    for (const line of lines) {
      this.ensureSpace(step);
      this.doc.text(line, MARGIN, this.y);
      this.y += step;
    }
  }

  header() {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(22);
    this.doc.setTextColor(...COLORS.ink);
    this.doc.text("ResuMatch", MARGIN, this.y);
    this.y += 7;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text("AI Screening Report", MARGIN, this.y);
    this.y += 12;
  }

  scoreHero(
    score: number,
    label: string,
    headline: string,
    tier: "strong" | "partial" | "weak"
  ) {
    const accent = tierColor(tier);
    const tint = tierTint(tier);
    const blockHeight = 42;
    const blockY = this.y;

    this.ensureSpace(blockHeight + 22);

    this.doc.setFillColor(...tint);
    this.doc.setDrawColor(...COLORS.border);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(MARGIN, blockY, CONTENT_WIDTH, blockHeight, 4, 4, "FD");

    this.doc.setFillColor(...accent);
    this.doc.roundedRect(MARGIN, blockY, 3, blockHeight, 1, 1, "F");

    const centerX = MARGIN + CONTENT_WIDTH / 2;
    let innerY = blockY + 16;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(36);
    this.doc.setTextColor(...accent);
    this.doc.text(`${score}%`, centerX, innerY, { align: "center" });

    innerY += 11;
    this.doc.setFontSize(14);
    this.doc.text(label, centerX, innerY, { align: "center" });

    innerY += 7;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(headline, centerX, innerY, { align: "center" });

    this.y = blockY + blockHeight + 22;
  }

  metaLine(text: string) {
    this.ensureSpace(8);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(text, MARGIN, this.y);
    this.y += 10;
  }

  divider() {
    this.ensureSpace(10);
    this.doc.setDrawColor(...COLORS.teal);
    this.doc.setLineWidth(0.45);
    this.doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y += 12;
  }

  heading(text: string) {
    this.ensureSpace(14);
    this.y += 2;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.teal);
    this.doc.text(text, MARGIN, this.y);
    this.y += 7;
  }

  paragraph(text: string, fontSize = 10) {
    this.doc.setFont("helvetica", "normal");
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    this.writeLines(lines, fontSize, COLORS.ink, 1.45);
    this.y += 3;
  }

  mutedParagraph(text: string, fontSize = 9) {
    this.doc.setFont("helvetica", "normal");
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    this.writeLines(lines, fontSize, COLORS.muted, 1.45);
    this.y += 3;
  }

  boldParagraph(text: string, fontSize = 10) {
    this.doc.setFont("helvetica", "bold");
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    this.writeLines(lines, fontSize, COLORS.ink, 1.45);
    this.doc.setFont("helvetica", "normal");
    this.y += 3;
  }

  numberedList(items: string[], fontSize = 10) {
    this.doc.setFont("helvetica", "normal");
    items.forEach((item, i) => {
      const prefix = `${i + 1}. `;
      const prefixWidth = this.doc.getTextWidth(prefix);
      const lines = this.doc.splitTextToSize(item, CONTENT_WIDTH - prefixWidth - 2);
      lines.forEach((line: string, lineIndex: number) => {
        this.ensureSpace(5);
        this.doc.setFontSize(fontSize);
        if (lineIndex === 0) {
          this.doc.setTextColor(...COLORS.teal);
          this.doc.setFont("helvetica", "bold");
          this.doc.text(prefix, MARGIN, this.y);
          this.doc.setFont("helvetica", "normal");
          this.doc.setTextColor(...COLORS.ink);
          this.doc.text(line, MARGIN + prefixWidth, this.y);
        } else {
          this.doc.setTextColor(...COLORS.ink);
          this.doc.text(line, MARGIN + prefixWidth, this.y);
        }
        this.y += fontSize * 0.35 * 1.45;
      });
      this.y += 2;
    });
    this.y += 2;
  }

  save(filename: string) {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(...COLORS.border);
      this.doc.setLineWidth(0.3);
      this.doc.line(MARGIN, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 16);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...COLORS.muted);
      this.doc.text("Generated by ResuMatch", MARGIN, PAGE_HEIGHT - 10);
      this.doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
        align: "right",
      });
    }
    this.doc.save(filename);
  }
}

export function downloadAnalysisReport(
  result: AIAnalysisResult,
  options: ReportPdfOptions = {}
): void {
  const meta = getTierMeta(result.matchScore);
  const writer = new PdfWriter();

  writer.header();
  writer.scoreHero(result.matchScore, meta.label, meta.headline, meta.tier);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let metaText = `Date: ${dateStr}`;
  if (options.resumeFileName) {
    metaText += `  ·  Resume: ${options.resumeFileName}`;
  }
  writer.metaLine(metaText);
  writer.divider();

  if (options.jobDescription?.trim()) {
    let jdText = options.jobDescription.trim();
    if (jdText.length > JD_PDF_MAX_CHARS) {
      jdText = `${jdText.slice(0, JD_PDF_MAX_CHARS)}… (truncated)`;
    }
    writer.heading("JOB DESCRIPTION");
    writer.mutedParagraph(jdText);
    writer.divider();
  }

  writer.heading("SUMMARY");
  writer.paragraph(result.summary);

  writer.heading("HIRING VERDICT");
  writer.boldParagraph(result.verdict);

  writer.heading("KEY STRENGTHS");
  writer.numberedList(result.strengths);

  writer.heading("CRITICAL GAPS");
  writer.numberedList(result.gaps);

  writer.heading("HIRING RECOMMENDATIONS");
  writer.numberedList(result.recommendations);

  writer.save(buildFilename(options.resumeFileName));
}
