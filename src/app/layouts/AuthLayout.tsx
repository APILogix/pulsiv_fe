import { Outlet, useLocation } from "react-router";
import { PulsivWordmark } from "@/shared/components/PulsivLogo";

interface PanelContent {
  image: string;
  title: string;
  description: string;
}

// Per-page imagery + copy. Compressed WebP assets (~40-90KB each) keep
// auth pages fast; the browser caches them across auth navigation.
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
    <div className="flex h-[100dvh] w-full bg-[#0c0c0c] text-white font-sans antialiased overflow-hidden">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col p-6 sm:p-10 w-full lg:max-w-[600px] lg:min-w-[500px] bg-[#0c0c0c] z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Brand Header */}
        <div className="flex items-center justify-center lg:justify-start gap-3 mt-8 mb-8 lg:mt-0 lg:mb-auto">
          <PulsivWordmark size={32} />
        </div>

        {/* Form Container (Outlet) */}
        <div className="w-full max-w-[380px] mx-auto mb-auto lg:mt-10">
          <Outlet />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-[1.2] bg-[#080808] relative overflow-hidden items-center justify-center border-l border-[#1f1f1f]">
        {/* Background Image — <img> so the browser can prioritize/cache it */}
        <img
          src={panel.image || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
        />

        {/* Gradient Overlay for blending */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/40 to-transparent" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0c0c0c] via-transparent to-[#0c0c0c]/20" />

        {/* Text Overlay */}
        <div className="relative z-20 flex flex-col items-center text-center px-12 pb-12 mt-auto">
          <div className="w-12 h-1 bg-[#10b981] mb-6 rounded-full shadow-[0_0_15px_#10b981]" />
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight text-balance">{panel.title}</h2>
          <p className="text-sm text-[#999999] max-w-[400px] leading-relaxed text-pretty">{panel.description}</p>
        </div>
      </div>
    </div>
  );
}
