import Link from "next/link";
import CoupleBadge from "@/components/CoupleBadge";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <CoupleBadge />
      <h1 className="font-display text-3xl font-bold leading-snug text-plum dark:text-white">
        혼자 하지 말고,
        <br />
        같이 갓생 살자
      </h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        취준생·대학생 커플을 위한 습관 챌린지.
        <br />
        서로의 루틴을 매일 인증하며 함께 성장해요.
      </p>
      <Link
        href="/login"
        className="mt-2 rounded-xl bg-coral px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-coral/90"
      >
        시작하기
      </Link>
    </main>
  );
}
