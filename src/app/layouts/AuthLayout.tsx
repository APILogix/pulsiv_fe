import { Outlet, useLocation } from "react-router";

interface PanelContent {
  image: string;
  title: string;
  description: string;
}

const PANELS: { match: (path: string) => boolean; content: PanelContent }[] = [
  {
    match: (p) => p.includes("/register"),
    content: {
      image: "/auth/auth-network.webp",
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
      title: "Security without friction",
      description:
        "Your account is protected by layered defenses — MFA, trusted devices, and full audit trails on every action.",
    },
  },
  {
    match: () => true,
    content: {
      image: "/auth/auth-observability.webp",
      title: "Monitor with precision",
      description:
        "Gain real-time visibility into your API latency, errors, and ingestion volume with our state-of-the-art monitoring dashboard.",
    },
  },
];

export function AuthLayout() {
  const { pathname } = useLocation();
  const panel = PANELS.find((p) => p.match(pathname))!.content;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg)] font-sans text-[var(--text)] antialiased">
      <div className="z-10 flex w-full flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6 sm:p-10 lg:min-w-[500px] lg:max-w-[600px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="mb-8 mt-8 flex items-center justify-center lg:mb-auto lg:mt-0 lg:justify-start">
          <span className="font-mono text-[27px] font-bold tracking-[0.16em] text-[var(--text)]" aria-label="Pulsiv">
            PULS<span className="text-[var(--brand)]">I</span>V
          </span>
        </div>

        <div className="mx-auto mb-auto w-full max-w-[420px] lg:mt-10">
          <Outlet />
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

        <div className="relative z-20 mt-auto flex flex-col items-center px-12 pb-12 text-center">
          <div className="mb-6 h-1 w-12 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--text)] text-balance">{panel.title}</h2>
          <p className="max-w-[400px] text-sm leading-relaxed text-[var(--text3)] text-pretty">{panel.description}</p>
        </div>
      </div>
    </div>
  );
}
