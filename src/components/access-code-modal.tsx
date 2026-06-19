"use client";

import { useId } from "react";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";
import { AccessModalShell } from "@/components/access-modal-shell";
import { AccessUnlockForm } from "@/components/access-unlock-form";

interface AccessCodeModalProps {
  open: boolean;
  remaining: number;
  onClose: () => void;
  onUnlocked: () => void;
}

function KeyIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 border border-teal/20">
      <svg
        className="h-5 w-5 text-teal"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
        />
      </svg>
    </div>
  );
}

export function AccessCodeModal({
  open,
  remaining,
  onClose,
  onUnlocked,
}: AccessCodeModalProps) {
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
      title="Enter access code"
      description={
        <>
          Unlock unlimited analyses on this device. You still have {remaining} of{" "}
          {FREE_ANALYSIS_LIMIT} free runs left.
        </>
      }
      icon={<KeyIcon />}
    >
      <AccessUnlockForm
        open={open}
        inputId={inputId}
        onSuccess={handleSuccess}
        onCancel={onClose}
        cancelLabel="Cancel"
      />
    </AccessModalShell>
  );
}
