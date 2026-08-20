type Props = {
  size?: "md" | "lg";
};

export default function CoupleBadge({ size = "lg" }: Props) {
  const dimension = size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const emojiSize = size === "lg" ? "text-5xl" : "text-3xl";

  return (
    <div className={`relative flex ${dimension} items-center justify-center`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-coral-soft to-amber-soft" />
      <span className={`relative ${emojiSize}`} role="img" aria-label="커플">
        💑
      </span>
      <span
        className="absolute -right-1 -top-1 text-lg motion-safe:animate-pulse"
        role="img"
        aria-hidden="true"
      >
        ✨
      </span>
      <span className="absolute -bottom-1 -left-2 text-base" role="img" aria-hidden="true">
        💕
      </span>
    </div>
  );
}
