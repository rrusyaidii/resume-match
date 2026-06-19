"use client";

import { useEffect, useRef, useState } from "react";

interface AccessUnlockFormProps {
  open: boolean;
  inputId: string;
  onSuccess: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function AccessUnlockForm({
  open,
  inputId,
  onSuccess,
  onCancel,
  cancelLabel = "Cancel",
}: AccessUnlockFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const prefersFinePointer = window.matchMedia("(pointer: fine)").matches;
      if (prefersFinePointer) inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Invalid access code. Try again.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          Access code
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          autoComplete="off"
          disabled={loading}
          className="block w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted/50 focus-ring focus:border-teal disabled:opacity-60"
        />
        {error && (
          <p className="mt-2 text-sm text-gap" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto min-h-11 rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-ink transition-colors focus-ring disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="flex w-full sm:w-auto min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-teal/25 hover:bg-teal/90 transition-colors focus-ring disabled:cursor-not-allowed disabled:bg-border disabled:text-muted disabled:shadow-none"
        >
          {loading ? (
            <>
              <Spinner />
              Unlocking...
            </>
          ) : (
            "Unlock"
          )}
        </button>
      </div>
    </form>
  );
}
