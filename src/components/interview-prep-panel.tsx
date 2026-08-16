"use client";

import { useEffect, useRef } from "react";
import type {
  BehavioralQuestion,
  GapDefence,
  InterviewPrepResult,
  QuestionToAsk,
  StarScaffold,
  TechnicalQuestion,
} from "@/lib/interview-prep-types";

interface InterviewPrepPanelProps {
  prep: InterviewPrepResult;
  scrollOnMount?: boolean;
}

function SectionHeading({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "teal" | "caution" | "gap";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "gap"
      ? "bg-gap/15 text-gap"
      : tone === "caution"
        ? "bg-caution/15 text-caution"
        : "bg-teal/15 text-teal";

  return (
    <div className="flex items-center gap-2 mb-5">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
        {children}
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <span className="ml-auto text-xs font-medium text-muted tabular-nums">{count}</span>
    </div>
  );
}

function QuestionText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold leading-relaxed text-ink break-words [overflow-wrap:anywhere]">
      {children}
    </p>
  );
}

function SubText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-ink/80 break-words [overflow-wrap:anywhere]">
        {children}
      </p>
    </div>
  );
}

const STAR_ROWS: { key: keyof StarScaffold; letter: string; label: string }[] = [
  { key: "situation", letter: "S", label: "Situation" },
  { key: "task", letter: "T", label: "Task" },
  { key: "action", letter: "A", label: "Action" },
  { key: "result", letter: "R", label: "Result" },
];

function StarBlock({ scaffold }: { scaffold: StarScaffold }) {
  const rows = STAR_ROWS.filter((row) => scaffold[row.key]);
  if (!rows.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-ink/[0.02] p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
        Your STAR answer
      </p>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex gap-3">
            <dt className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-caution/15 font-data text-[11px] font-bold text-caution">
              {row.letter}
            </dt>
            <dd className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {row.label}
              </span>
              <p className="text-sm leading-relaxed text-ink/90 break-words [overflow-wrap:anywhere]">
                {scaffold[row.key]}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TechnicalSection({ items }: { items: TechnicalQuestion[] }) {
  return (
    <section className="border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <SectionHeading title="Likely technical questions" count={items.length} tone="teal">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      </SectionHeading>

      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <QuestionText>{item.question}</QuestionText>
                {item.topic && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal">
                    {item.topic}
                  </span>
                )}
                {item.whatGoodLooksLike && (
                  <SubText label="What a strong answer covers">{item.whatGoodLooksLike}</SubText>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BehavioralSection({ items }: { items: BehavioralQuestion[] }) {
  return (
    <section className="border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <SectionHeading title="Behavioural questions" count={items.length} tone="caution">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </SectionHeading>

      <ol className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-caution/15 text-xs font-bold text-caution tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <QuestionText>{item.question}</QuestionText>
                {item.whyAsked && (
                  <SubText label="What they are really testing">{item.whyAsked}</SubText>
                )}
                <StarBlock scaffold={item.scaffold} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GapDefenceSection({ items }: { items: GapDefence[] }) {
  return (
    <section className="border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <SectionHeading title="Defending your gaps" count={items.length} tone="gap">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </SectionHeading>

      <p className="-mt-2 mb-4 text-sm leading-relaxed text-muted">
        These come straight from the gaps in your report. Expect them, and answer them straight.
      </p>

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="relative rounded-xl border border-border bg-ink/[0.02] p-4 pl-5 sm:p-5 sm:pl-6"
          >
            <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gap" />
            <QuestionText>{item.question}</QuestionText>
            {item.gap && (
              <span className="mt-2 inline-flex items-center rounded-full bg-gap/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gap">
                {item.gap}
              </span>
            )}
            {item.suggestedAngle && (
              <SubText label="How to answer it">{item.suggestedAngle}</SubText>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuestionsToAskSection({ items }: { items: QuestionToAsk[] }) {
  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <SectionHeading title="Questions to ask them" count={items.length} tone="teal">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </SectionHeading>

      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-teal/20 bg-teal/[0.04] p-4 sm:p-5">
            <QuestionText>{item.question}</QuestionText>
            {item.rationale && <SubText label="Why it is worth asking">{item.rationale}</SubText>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InterviewPrepPanel({ prep, scrollOnMount = true }: InterviewPrepPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollOnMount) return;
    const el = panelRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [scrollOnMount]);

  return (
    <div ref={panelRef} className="results-enter mt-8 space-y-4" aria-live="polite">
      <h2 className="workflow-section-label">Interview prep</h2>

      <article className="report-card overflow-hidden rounded-2xl border border-border shadow-2xl">
        <div
          className="relative border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
          style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--card) 60%)" }}
        >
          <div className="report-grid absolute inset-0 opacity-[0.04] pointer-events-none" />
          <div className="relative space-y-3">
            <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
              Your interview prep pack
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted">
              Built from your resume and this job description. The STAR answers below use your own
              experience — edit them into your own words, then say them out loud.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal">
                {prep.detectedLevel}
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {prep.roleFamily}
              </span>
            </div>
          </div>
        </div>

        {prep.technical.length > 0 && <TechnicalSection items={prep.technical} />}
        {prep.behavioral.length > 0 && <BehavioralSection items={prep.behavioral} />}
        {prep.gapDefence.length > 0 && <GapDefenceSection items={prep.gapDefence} />}
        {prep.questionsToAsk.length > 0 && <QuestionsToAskSection items={prep.questionsToAsk} />}
      </article>

      <p className="text-center text-xs text-muted">
        AI-generated from your resume · Verify every detail before your interview
      </p>
    </div>
  );
}
