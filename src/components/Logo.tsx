// ALGO brand logo — a gold mountain "A" mark + gold wordmark.
export default function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 28" className={large ? "h-8 w-auto" : "h-7 w-auto"} aria-hidden>
        <defs>
          <linearGradient id="algoGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#efd9a0" />
            <stop offset="0.55" stopColor="#d9b15e" />
            <stop offset="1" stopColor="#b2862f" />
          </linearGradient>
        </defs>
        {/* Mountain "A": outer peak with an inner notch */}
        <path
          d="M16 2 L30 26 L21.5 26 L16 14.5 L10.5 26 L2 26 Z M16 9.5 L13.4 15 L18.6 15 Z"
          fill="url(#algoGold)"
          fillRule="evenodd"
        />
      </svg>
      <span
        className={`text-gold font-extrabold tracking-tight ${large ? "text-2xl" : "text-xl"}`}
        style={{ letterSpacing: "0.02em" }}
      >
        ALGO
      </span>
    </div>
  );
}
