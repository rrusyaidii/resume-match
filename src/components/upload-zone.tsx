"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { MAX_BATCH_SIZE } from "@/lib/constants";
import { ACCEPTED_RESUME_INPUT, isAcceptedResumeFile } from "@/lib/resume-file-client";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  labelledBy?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mergeResumeFiles(existing: File[], incoming: File[]): File[] {
  const merged = [...existing];
  for (const file of incoming) {
    if (!isAcceptedResumeFile(file)) continue;
    if (merged.length >= MAX_BATCH_SIZE) break;
    const duplicate = merged.some(
      (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
    );
    if (!duplicate) merged.push(file);
  }
  return merged.slice(0, MAX_BATCH_SIZE);
}

export function UploadZone({ files, onFilesChange, labelledBy }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputId = "resume-upload";

  useEffect(() => {
    if (files.length === 0 && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [files.length]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const resumeFiles = incoming.filter(isAcceptedResumeFile);
      if (resumeFiles.length === 0) return;
      onFilesChange(mergeResumeFiles(files, resumeFiles));
    },
    [files, onFilesChange]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const atLimit = files.length >= MAX_BATCH_SIZE;

  return (
    <div aria-labelledby={labelledBy}>
      {files.length > 0 && (
        <ul className="mb-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                <p className="text-xs text-muted font-data">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-gap hover:bg-gap/5 transition-colors focus-ring"
                aria-label={`Remove ${file.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!atLimit && (
        <label
          htmlFor={inputId}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all sm:px-6 sm:py-10 ${
            isDragging
              ? "border-teal bg-teal/5 scale-[1.01]"
              : files.length > 0
                ? "border-border bg-surface hover:border-teal/40 hover:bg-teal/[0.02]"
                : "border-border bg-surface hover:border-teal/40 hover:bg-teal/[0.02]"
          }`}
        >
          <input
            ref={inputRef}
            id={inputId}
            name="resume"
            type="file"
            accept={ACCEPTED_RESUME_INPUT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />

          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              files.length > 0
                ? "bg-ink/5 text-muted group-hover:bg-teal/10 group-hover:text-teal"
                : "bg-ink/5 text-muted group-hover:bg-teal/10 group-hover:text-teal"
            }`}
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>

          {files.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-ink">Add more resumes</p>
              <p className="mt-1 text-xs text-muted">
                {files.length} of {MAX_BATCH_SIZE} · drag & drop or browse
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">Drag & drop resumes here</p>
              <p className="mt-1 text-xs text-muted">
                PDF or Word (.docx) · Max 10 MB each · Up to {MAX_BATCH_SIZE} files
              </p>
              <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-teal/90">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Browse files
              </span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
