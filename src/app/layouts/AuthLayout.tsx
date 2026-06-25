import React from "react";
import { Outlet } from "react-router";
import { TelemetryCanvas } from "@/shared/components/TelemetryCanvas";
import { PulsivWordmark } from "@/shared/components/PulsivLogo";

/**
 * AuthLayout — Centered layout for all authentication pages.
 *
 * Includes:
 * - Telemetry-inspired ambient canvas background
 * - Top header with logo
 * - Centered Auth form (Outlet)
 * - Footer with trust badges and links
 */
export function AuthLayout() {
  return (
    <div className="dark relative flex min-h-[100dvh] bg-background text-foreground flex-col overflow-y-auto">
      {/* Ambient telemetry background */}
      <TelemetryCanvas />

      {/* Top Header with Logo */}
      <header className="relative z-20 flex-none flex items-center justify-between px-6 py-6 sm:px-8 w-full">
        <PulsivWordmark size={32} />
        <nav className="flex items-center gap-6 text-[13px] font-mono text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        </nav>
      </header>

      {/* Top subtle glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[-20%]">
        <div className="h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.06)_0%,transparent_60%)]" />
      </div>

      <main className="relative z-10 grow flex flex-col items-center justify-center py-12 px-6 sm:px-12 w-full">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 flex-none flex flex-col items-center justify-center gap-4 px-6 py-8 w-full mt-auto">
        {/* Enterprise trust signals */}
        <div className="flex items-center justify-center gap-6 flex-wrap text-[10px] font-mono tracking-[0.08em] uppercase text-muted-foreground opacity-80">
          <TrustBadge icon="shield" label="MFA protected" />
          <TrustBadge icon="key" label="SSO ready" />
          <TrustBadge icon="lock" label="Encrypted" />
          <TrustBadge icon="audit" label="Audit logging" />
        </div>
        
        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-mono text-muted-foreground opacity-80">
          <a href="#" className="hover:text-muted-foreground hover:opacity-100 transition-colors">Terms</a>
          <a href="#" className="hover:text-muted-foreground hover:opacity-100 transition-colors">Privacy</a>
          <a href="#" className="hover:text-muted-foreground hover:opacity-100 transition-colors">Security</a>
          <a href="#" className="hover:text-muted-foreground hover:opacity-100 transition-colors">System Status</a>
          <a href="#" className="hover:text-muted-foreground hover:opacity-100 transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}

/* ─── Trust badge icon helper ─── */
function TrustBadge({ icon, label }: { icon: string; label: string }) {
  const icons: Record<string, React.ReactNode> = {
    shield: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    key: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    lock: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    audit: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  };

  return (
    <span className="flex items-center gap-1.5">
      {icons[icon]}
      {label}
    </span>
  );
}
