

export function PulsivLogo({ size = 48, animate = true }: { size?: number; animate?: boolean }) {
  const id = 'pulsiv-logo';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pulsiv logo"
    >
      <defs>
        {/* Radar sweep gradient */}
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0" />
          <stop offset="60%" stopColor="var(--brand)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.9" />
        </linearGradient>

        {/* Clip path for the bowl to contain the radar completely (optional, but good for precise rendering) */}
        <clipPath id={`${id}-bowl-clip`}>
          <path d="M 28 22 v 46 h 22 c 12.7 0 23 -10.3 23 -23 c 0 -12.7 -10.3 -23 -23 -23 H 28 Z" />
        </clipPath>
      </defs>

      {/* The solid white "P" */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 14 8 h 36 c 20.987 0 38 17.013 38 38 c 0 20.987 -17.013 38 -38 38 H 28 v 24 H 14 V 8 Z M 28 22 v 46 h 22 c 12.7 0 23 -10.3 23 -23 c 0 -12.7 -10.3 -23 -23 -23 H 28 Z"
        fill="currentColor"
      />

      {/* Radar elements inside the bowl */}
      {/* Bowl center is x=50, y=45. Radius is ~23 */}
      <g clipPath={`url(#${id}-bowl-clip)`}>
        {/* Concentric rings */}
        <circle cx="50" cy="45" r="21" stroke="var(--brand)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="50" cy="45" r="14" stroke="var(--brand)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="50" cy="45" r="7" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
        
        {/* Center dot */}
        <circle cx="50" cy="45" r="2.5" fill="var(--brand)" opacity="0.9">
          {animate && (
            <animate
              attributeName="opacity"
              values="0.8;0.4;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Radar sweep and target blip */}
        {animate && (
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 45"
              to="360 50 45"
              dur="3s"
              repeatCount="indefinite"
            />
            {/* The sweeping arc */}
            <path
              d="M 50 45 L 73 45 A 23 23 0 0 0 50 22 Z"
              fill={`url(#${id}-sweep)`}
              opacity="0.7"
            />
            {/* The blip target on the leading edge */}
            <circle cx="70" cy="45" r="4" stroke="var(--brand)" strokeWidth="1.5" fill="var(--bg)" />
            <circle cx="70" cy="45" r="1.5" fill="var(--brand)" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function PulsivWordmark({ size = 48, hideIcon = false }: { size?: number, hideIcon?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {!hideIcon && <PulsivLogo size={size} />}
      <span
        className="font-sans font-semibold tracking-wide text-[var(--text)] select-none"
        style={{ fontSize: size * 0.7 }}
      >
        Pulsiv
      </span>
    </div>
  );
}
