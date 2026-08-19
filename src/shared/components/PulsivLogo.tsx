

export function MonitraLogo({ size = 28, className = "" }: { size?: number; className?: string; animate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Monitra Logo"
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#0F1012" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <path
        d="M9 22V10L16 17L23 10V22"
        stroke="#F4F5F7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="17" r="1.5" fill="#8B7CF6" />
    </svg>
  );
}

export function MonitraWordmark({
  size = 20,
  hideIcon = false,
  className = "",
}: {
  size?: number;
  hideIcon?: boolean;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {!hideIcon && <MonitraLogo size={size + 6} />}
      <span
        className="font-sans font-semibold tracking-tight text-[var(--text)] text-[15px]"
        style={{ fontSize: size }}
      >
        Monitra
      </span>
    </div>
  );
}

export const SentinelLogo = MonitraLogo;
export const SentinelWordmark = MonitraWordmark;
export const PulsivLogo = MonitraLogo;
export const PulsivWordmark = MonitraWordmark;

