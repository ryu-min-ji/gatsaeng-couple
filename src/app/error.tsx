"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-plum dark:text-white">문제가 생겼어요</h1>
      <p className="text-sm text-ink-muted">
        {error.message || "알 수 없는 오류가 발생했어요. 다시 시도해주세요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-xl bg-coral px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-coral/90"
      >
        다시 시도
      </button>
    </main>
  );
}
