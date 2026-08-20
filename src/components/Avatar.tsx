import { cn } from "@/lib/utils";

type Props = {
  avatarUrl?: string | null;
  nickname?: string | null;
  bg?: "coral" | "plum";
  className?: string;
};

export default function Avatar({ avatarUrl, nickname, bg = "coral", className }: Props) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={nickname ?? "프로필 사진"}
        className={cn("h-12 w-12 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full font-bold text-white",
        bg === "coral" ? "bg-coral" : "bg-plum",
        className
      )}
    >
      {nickname?.[0] ?? "?"}
    </div>
  );
}
