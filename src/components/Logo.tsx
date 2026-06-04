// ALGOVENTURE brand logo — gold mountain "A" + "LGO" in gold, "VENTURE" in white.
export default function Logo({ large = false }: { large?: boolean }) {
  const text = large ? "text-2xl" : "text-xl";
  const mark = large ? "h-7" : "h-6";
  return (
    <div className="flex items-center leading-none">
      <svg viewBox="0 0 30 26" className={`${mark} w-auto`} aria-hidden>
        <defs>
          <linearGradient id="algoGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#efd9a0" />
            <stop offset="0.55" stopColor="#d9b15e" />
            <stop offset="1" stopColor="#b2862f" />
          </linearGradient>
        </defs>
        {/* Mountain "A": outer peak with an inner notch */}
        <path
          d="M15 1 L29 25 L20.5 25 L15 13.5 L9.5 25 L1 25 Z M15 8.5 L12.4 14 L17.6 14 Z"
          fill="url(#algoGold)"
          fillRule="evenodd"
        />
      </svg>
      <span className={`text-gold font-extrabold tracking-tight ${text}`}>LGO</span>
      <span className={`ml-1 font-extrabold tracking-tight text-white ${text}`}>VENTURE</span>
    </div>
  );
}
