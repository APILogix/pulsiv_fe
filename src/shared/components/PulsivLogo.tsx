

export function PulsivLogo({ size = 48, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <img
      src="/favicon.svg"
      alt="Pulsiv Logo"
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        objectFit: 'contain',
        ...(animate ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {})
      }}
    />
  );
}

export function PulsivWordmark({ size = 48, hideIcon = false, animate = false }: { size?: number, hideIcon?: boolean, animate?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {!hideIcon && <PulsivLogo size={size} animate={animate} />}
      <span
        className="font-sans font-semibold tracking-wide text-[var(--text)] select-none"
        style={{ fontSize: size * 0.7 }}
      >
        Pulsiv
      </span>
    </div>
  );
}
