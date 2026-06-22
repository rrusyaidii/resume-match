"use client";

import { useId } from "react";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";
import { AccessModalShell } from "@/components/access-modal-shell";
import { AccessUnlockForm } from "@/components/access-unlock-form";

interface AccessLimitModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

function LockIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-caution-bg border border-caution-border">
      <svg
        className="h-5 w-5 text-caution"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    </div>
  );
}

export function AccessLimitModal({ open, onClose, onUnlocked }: AccessLimitModalProps) {
  const titleId = useId();
  const inputId = useId();

  const handleSuccess = () => {
    onUnlocked();
    onClose();
  };

  return (
    <AccessModalShell
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Free trials used"
      description={
        <>
          You&apos;ve used your {FREE_ANALYSIS_LIMIT} free analyses.
          Enter your access code to continue.
        </>
      }
      icon={<LockIcon />}
    >
      <AccessUnlockForm
        open={open}
        inputId={inputId}
        onSuccess={handleSuccess}
        onCancel={onClose}
        cancelLabel="Not now"
      />
    </AccessModalShell>
  );
}
