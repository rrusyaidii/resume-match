"use client";

interface AccessCodeFieldProps {
  remaining: number;
  unlocked: boolean;
  onRequestUnlock: () => void;
}

export function AccessCodeField({
  remaining,
  unlocked,
  onRequestUnlock,
}: AccessCodeFieldProps) {
  if (unlocked) {
    return (
      <p className="text-center text-xs text-match font-medium">
        Full access
      </p>
    );
  }

  if (remaining === 0) {
    return (
      <p className="text-center">
        <button
          type="button"
          onClick={onRequestUnlock}
          className="min-h-11 px-3 py-2.5 text-xs font-medium text-teal hover:text-teal/80 transition-colors focus-ring rounded"
        >
          Have an access code?
        </button>
      </p>
    );
  }

  return (
    <p className="text-center">
      <button
        type="button"
        onClick={onRequestUnlock}
        className="min-h-11 px-3 py-2.5 text-xs font-medium text-teal hover:text-teal/80 transition-colors focus-ring rounded"
      >
        Have an access code?
      </button>
    </p>
  );
}
