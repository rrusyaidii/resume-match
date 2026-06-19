"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface UploadZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({ file, onFileChange }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputId = "resume-upload";

  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [file]);

  const handleFile = useCallback(
    (selected: File | null) => {
      if (!selected) {
        onFileChange(null);
        return;
      }
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        return;
      }
      onFileChange(selected);
    },
    [onFileChange]
  );

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
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal/10 text-xs font-bold text-teal">
          1
        </span>
        <label htmlFor={inputId} className="text-sm font-semibold text-ink cursor-pointer">
          Resume (PDF)
        </label>
      </div>

      {/* Native label association — most reliable way to open the file picker */}
      <label
        htmlFor={inputId}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all sm:px-6 sm:py-10 ${
          isDragging
            ? "border-teal bg-teal/5 scale-[1.01]"
            : file
              ? "border-teal/50 bg-teal/[0.03]"
              : "border-border bg-surface hover:border-teal/40 hover:bg-teal/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            file ? "bg-teal/15 text-teal" : "bg-ink/5 text-muted group-hover:bg-teal/10 group-hover:text-teal"
          }`}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>

        {file ? (
          <>
            <p className="text-sm font-semibold text-ink truncate max-w-full px-2">{file.name}</p>
            <p className="mt-1 text-xs text-muted">{formatFileSize(file.size)}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 text-xs font-semibold text-teal">
              Replace file
            </span>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">Drag & drop your resume here</p>
            <p className="mt-1 text-xs text-muted">PDF only · Max 10 MB</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-teal/90">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Browse files
            </span>
          </>
        )}
      </label>
    </div>
  );
}
