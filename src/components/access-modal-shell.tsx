"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface AccessModalShellProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  blockClose?: boolean;
}

export function AccessModalShell({
  open,
  onClose,
  titleId,
  title,
  description,
  icon,
  children,
  blockClose = false,
}: AccessModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (blockClose) return;
    onClose();
  }, [blockClose, onClose]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm motion-reduce:backdrop-blur-none"
        onClick={handleClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto motion-safe:animate-[results-enter_0.2s_ease-out]"
      >
        <div className="mb-5 flex items-start gap-3">
          {icon}
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
            <div className="mt-1.5 text-sm text-muted leading-relaxed">{description}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
