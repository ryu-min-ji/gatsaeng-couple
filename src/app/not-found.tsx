import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-plum">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-ink-muted">
        주소가 바뀌었거나, 존재하지 않는 페이지예요.
      </p>
      <Link
        href="/home"
        className="mt-2 rounded-xl bg-coral px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-coral/90"
      >
        홈으로 가기
      </Link>
    </main>
  );
}
