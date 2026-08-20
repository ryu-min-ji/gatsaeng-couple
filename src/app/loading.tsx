export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-coral" />
      <p className="text-xs text-ink-muted">불러오는 중...</p>
    </main>
  );
}
