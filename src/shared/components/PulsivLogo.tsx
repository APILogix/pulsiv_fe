

export function PulsivLogo({ size = 48, animate = true }: { size?: number; animate?: boolean }) {
  const id = 'pulsiv-logo';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pulsiv logo"
    >
      <defs>
        <style>
          {`
            .orbit-core-${id} { fill: var(--brand); animation: coreGlow-${id} 2s ease-in-out infinite; }
            @keyframes coreGlow-${id} { 
              0%, 100% { filter: drop-shadow(0 0 3px var(--brand-bg)); } 
              50% { filter: drop-shadow(0 0 9px var(--brand-bg)); } 
            }
            .orbitring-${id} { fill: none; stroke: var(--muted-foreground); opacity: 0.35; }
          `}
        </style>
      </defs>
      <circle className={`orbitring-${id}`} cx="100" cy="100" r="40" strokeWidth="1"/>
      <circle className={`orbitring-${id}`} cx="100" cy="100" r="62" strokeWidth="1"/>
      <circle className={`orbitring-${id}`} cx="100" cy="100" r="84" strokeWidth="1"/>
      <circle className={animate ? `orbit-core-${id}` : ''} cx="100" cy="100" r="9" fill={animate ? undefined : 'var(--brand)'}/>
      <circle r="3.5" fill="var(--brand)">
        {animate && <animateMotion dur="3.4s" repeatCount="indefinite" path="M140,100 A40,40 0 1,1 60,100 A40,40 0 1,1 140,100"/>}
      </circle>
      <circle r="3" fill="var(--foreground)" opacity="0.8">
        {animate && <animateMotion dur="5.2s" repeatCount="indefinite" path="M162,100 A62,62 0 1,0 38,100 A62,62 0 1,0 162,100"/>}
      </circle>
      <circle r="2.6" fill="var(--brand)" opacity="0.7">
        {animate && <animateMotion dur="7s" repeatCount="indefinite" path="M184,100 A84,84 0 1,1 16,100 A84,84 0 1,1 184,100"/>}
      </circle>
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
