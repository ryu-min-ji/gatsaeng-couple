type Props = {
  size?: "md" | "lg";
};

export default function CoupleBadge({ size = "lg" }: Props) {
  const wrapper = size === "lg" ? "h-24 w-32" : "h-16 w-[8.5rem]";

  return (
    <div className={wrapper}>
      <svg viewBox="0 0 48 34" className="h-full w-full" aria-hidden="true">
        {/* 곰돌이 */}
        <g>
          <ellipse cx="16" cy="24" rx="7.2" ry="6.2" fill="#3B2440" />
          <ellipse
            cx="22.5"
            cy="21.5"
            rx="3.1"
            ry="2.1"
            fill="#3B2440"
            transform="rotate(-25 22.5 21.5)"
          />
          <circle cx="9.3" cy="6.3" r="2.7" fill="#3B2440" />
          <circle cx="20.2" cy="6.3" r="2.7" fill="#3B2440" />
          <circle cx="15" cy="12.5" r="7.6" fill="#3B2440" />
          <ellipse cx="15" cy="15.3" rx="2.9" ry="2.1" fill="#FCF6F0" />
          <circle cx="15" cy="14.9" r="0.6" fill="#3B2440" />
          <circle cx="11.7" cy="11.6" r="0.9" fill="#FCF6F0" />
          <circle cx="18.3" cy="11.6" r="0.9" fill="#FCF6F0" />
          <ellipse cx="10.4" cy="14.6" rx="1.5" ry="1" fill="#FF6B57" opacity="0.55" />
          <ellipse cx="19.6" cy="14.6" rx="1.5" ry="1" fill="#FF6B57" opacity="0.55" />
        </g>

        {/* 토끼 */}
        <g>
          <ellipse cx="32" cy="24" rx="7.2" ry="6.2" fill="#FF6B57" />
          <ellipse
            cx="25.5"
            cy="21.5"
            rx="3.1"
            ry="2.1"
            fill="#FF6B57"
            transform="rotate(25 25.5 21.5)"
          />
          <ellipse cx="27.8" cy="4.2" rx="2.1" ry="5.6" fill="#FF6B57" transform="rotate(-12 27.8 4.2)" />
          <ellipse cx="38.2" cy="4.2" rx="2.1" ry="5.6" fill="#FF6B57" transform="rotate(12 38.2 4.2)" />
          <ellipse cx="27.8" cy="4.6" rx="1" ry="3.6" fill="#FFE4DF" transform="rotate(-12 27.8 4.6)" />
          <ellipse cx="38.2" cy="4.6" rx="1" ry="3.6" fill="#FFE4DF" transform="rotate(12 38.2 4.6)" />
          <circle cx="33" cy="12.5" r="7.2" fill="#FF6B57" />
          <circle cx="29.9" cy="11.7" r="0.9" fill="#3B2440" />
          <circle cx="36.1" cy="11.7" r="0.9" fill="#3B2440" />
          <circle cx="33" cy="14.6" r="0.6" fill="#3B2440" />
          <ellipse cx="28.6" cy="14.6" rx="1.5" ry="1" fill="#FCF6F0" opacity="0.8" />
          <ellipse cx="37.4" cy="14.6" rx="1.5" ry="1" fill="#FCF6F0" opacity="0.8" />
        </g>

        {/* 사이 하트 */}
        <path
          d="M24 8.2c-.15 0-.3-.05-.4-.15-.75-.65-1.45-1.25-2.05-1.8-1.75-1.55-2.95-2.65-2.95-4.05C18.6 1.05 19.55 0 20.85 0c.75 0 1.5.35 1.95.95l.2.25.2-.25C23.65.35 24.4 0 25.15 0c1.3 0 2.25 1.05 2.25 2.2 0 1.4-1.2 2.5-2.95 4.05-.6.55-1.3 1.15-2.05 1.8-.1.1-.25.15-.4.15Z"
          fill="#F5A623"
        />
      </svg>
      <span className="sr-only">토끼와 곰돌이 커플</span>
    </div>
  );
}
