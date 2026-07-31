import { Outlet } from "react-router";

import { ThemeSwitcher } from "@/theme";

export function AuthLayout() {
  return (
    <div
      id="sentinel-root"
      className="relative flex h-[100dvh] w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-[var(--bg)] font-sans text-[var(--text)] antialiased [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {/* Background Grids and Ambient Glows */}
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-50"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(900px 480px at 50% -10%, var(--brand-bg) 0%, transparent 60%), radial-gradient(700px 420px at 50% 110%, var(--ai-bg) 0%, transparent 60%)',
        }}
      />

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-[460px] p-6 sm:p-10 my-auto">
        <div className="mb-8 flex items-center justify-between gap-4">
          <span
            className="font-[family-name:var(--mono)] text-[27px] font-bold tracking-[0.16em] text-[var(--text)]"
            aria-label="Pulsiv"
          >
            PULS<span className="text-[var(--brand)]">I</span>V
          </span>
          {/* Theme switcher is available before sign-in too (§1). */}
          <ThemeSwitcher />
        </div>

        <div className="w-full pulse-rise">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
