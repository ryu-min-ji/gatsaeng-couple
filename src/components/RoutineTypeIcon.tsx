import type { VerificationType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const config: Record<VerificationType, { bg: string; fg: string; icon: React.ReactNode }> = {
  photo: {
    bg: "bg-amber-soft",
    fg: "text-amber",
    icon: (
      <>
        <rect x="3" y="6" width="14" height="10" rx="2" />
        <circle cx="10" cy="11" r="2.5" />
        <rect x="7.5" y="4" width="5" height="2" rx="0.5" />
      </>
    ),
  },
  text: {
    bg: "bg-coral-soft",
    fg: "text-coral",
    icon: (
      <>
        <rect x="3" y="3" width="14" height="11" rx="2" />
        <line x1="6" y1="7" x2="14" y2="7" />
        <line x1="6" y1="10.5" x2="11" y2="10.5" />
      </>
    ),
  },
  check: {
    bg: "bg-plum/10",
    fg: "text-plum dark:text-white",
    icon: (
      <>
        <circle cx="10" cy="10" r="7" />
        <polyline points="6.5,10 9,12.5 13.5,7.5" />
      </>
    ),
  },
};

export default function RoutineTypeIcon({
  type,
  className,
}: {
  type: VerificationType;
  className?: string;
}) {
  const { bg, fg, icon } = config[type];

  return (
    <div
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", bg, className)}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-4 w-4", fg)}
      >
        {icon}
      </svg>
    </div>
  );
}
