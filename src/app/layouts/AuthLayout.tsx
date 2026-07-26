import { Outlet, useLocation } from "react-router";

interface PanelContent {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
}

const PANELS: { match: (path: string) => boolean; content: PanelContent }[] = [
  {
    match: (p) => p.includes("/register"),
    content: {
      image: "/auth/auth-network.webp",
      eyebrow: "Service graph",
      title: "Every service, one pulse",
      description:
        "Connect your APIs and services in minutes. Pulsiv maps your entire request flow so nothing slips past unnoticed.",
    },
  },
  {
    match: (p) =>
      p.includes("/mfa") ||
      p.includes("/backup-code") ||
      p.includes("/unlock") ||
      p.includes("/reset-password") ||
      p.includes("/forgot-password"),
    content: {
      image: "/auth/auth-security.webp",
      eyebrow: "Account defense",
      title: "Security without friction",
      description:
        "Your account is protected by layered defenses — MFA, trusted devices, and full audit trails on every action.",
    },
  },
  {
    match: () => true,
    content: {
      image: "/auth/auth-observability.webp",
      eyebrow: "Live telemetry",
      title: "Monitor with precision",
      description:
        "Gain real-time visibility into your API latency, errors, and ingestion volume with our state-of-the-art monitoring dashboard.",
    },
  },
];

// Decorative scanline widths for the telemetry motif. Purely illustrative —
// no live data is claimed here (rules.md §1.2: no inline arrays in JSX).
const MOTIF_TRACKS = [
  { id: "ingest", width: "78%" },
  { id: "traces", width: "54%" },
  { id: "errors", width: "31%" },
];

const FOOTER_LINKS = [
  { label: "Docs", href: "https://docs.pulsiv.com" },
  { label: "Status", href: "https://status.pulsiv.com" },
  { label: "Privacy", href: "https://pulsiv.com/privacy" },
];

export function AuthLayout() {
  const { pathname } = useLocation();
  const panel = PANELS.find((p) => p.match(pathname))!.content;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg)] font-sans text-[var(--text)] antialiased">
      <div className="relative z-10 flex w-full flex-1 flex-col overflow-y-auto bg-[var(--bg)] lg:min-w-[500px] lg:max-w-[600px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Blueprint grid + aurora wash behind the form column. */}
        <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

        <div className="relative z-10 flex min-h-full flex-col p-6 sm:p-10">
          <div className="mb-8 mt-8 flex items-center justify-center lg:mb-auto lg:mt-0 lg:justify-start">
            <span
              className="font-[family-name:var(--mono)] text-[27px] font-bold tracking-[0.16em] text-[var(--text)]"
              aria-label="Pulsiv"
            >
              PULS<span className="text-[var(--brand)]">I</span>V
            </span>
          </div>

          <div className="mx-auto mb-auto w-full max-w-[420px] pulse-rise lg:mt-10">
            <Outlet />
          </div>

          <nav
            aria-label="Product links"
            className="mt-10 flex items-center justify-center gap-1 border-t border-[var(--border)] pt-5 text-[12px] text-[var(--text3)] lg:justify-start"
          >
            {FOOTER_LINKS.map((link, index) => (
              <span key={link.label} className="flex items-center gap-1">
                {index > 0 && <span className="px-1 opacity-50" aria-hidden="true">·</span>}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-sm px-1 py-0.5 transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="relative hidden flex-[1.2] items-center justify-center overflow-hidden border-l border-[var(--border)] bg-[var(--bg1)] lg:flex">
        <img
          src={panel.image || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
        />

        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[var(--bg)] via-[color:color-mix(in_srgb,var(--bg)_55%,transparent)] to-transparent" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[var(--bg)] via-transparent to-[color:color-mix(in_srgb,var(--bg)_20%,transparent)]" />
        <div className="pulse-grid absolute inset-0 z-10" aria-hidden="true" />

        {/* Telemetry motif: CSS-driven scanlines. `pulse-sweep` and `shimmer`
            are both disabled under prefers-reduced-motion in index.css. */}
        <div className="absolute inset-x-12 top-14 z-20 flex flex-col gap-3" aria-hidden="true">
          {MOTIF_TRACKS.map((track) => (
            <div
              key={track.id}
              className="pulse-sweep relative h-[3px] overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--border2)_70%,transparent)]"
              style={{ width: track.width }}
            >
              <span
                className="absolute inset-y-0 left-0 w-1/2 rounded-full"
                style={{ background: "linear-gradient(90deg, var(--brand), var(--ai))" }}
              />
            </div>
          ))}
        </div>

        <div className="relative z-20 mt-auto flex flex-col items-center px-12 pb-12 text-center">
          <p className="mb-4 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ai)]">
            {panel.eyebrow}
          </p>
          <div className="mb-6 h-1 w-12 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]" />
          <h2 className="mb-4 font-[family-name:var(--display)] text-3xl font-semibold tracking-[-0.02em] text-[var(--text)] text-balance">
            {panel.title}
          </h2>
          <p className="max-w-[400px] text-sm leading-relaxed text-[var(--text3)] text-pretty">{panel.description}</p>
        </div>
      </div>
    </div>
  );
}
