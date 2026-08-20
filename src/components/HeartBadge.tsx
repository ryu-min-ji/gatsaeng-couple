export default function HeartBadge() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-8 w-8 text-coral"
        aria-hidden="true"
      >
        <path d="M12 20.5c-.3 0-.6-.1-.8-.3-1.5-1.3-2.9-2.5-4.1-3.6-3.5-3.1-5.9-5.3-5.9-8.1C1.2 6.1 3.1 4 5.7 4c1.5 0 3 .7 3.9 1.9l.4.5.4-.5C11.3 4.7 12.8 4 14.3 4c2.6 0 4.5 2.1 4.5 4.5 0 2.8-2.4 5-5.9 8.1-1.2 1.1-2.6 2.3-4.1 3.6-.2.2-.5.3-.8.3Z" />
      </svg>
    </div>
  );
}
