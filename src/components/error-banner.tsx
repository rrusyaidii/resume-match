interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-gap/30 bg-gap/5 p-4"
    >
      <p className="text-sm text-gap">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-sm font-medium text-gap hover:text-gap/80 transition-colors focus-ring rounded"
      >
        Try again
      </button>
    </div>
  );
}
