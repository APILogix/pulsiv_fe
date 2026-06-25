import { Link, useLocation } from "react-router";
import { ArrowUpRight, CheckCircle2, Clock3, Layers3 } from "lucide-react";
import { findMainNavItem } from "@/app/navigation/navigation";

export default function ModuleHomePage() {
  const location = useLocation();
  const module = findMainNavItem(location.pathname);

  if (!module) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[var(--text)]">{module.label}</h1>
            {/* Keep module.status in navigation metadata, but do not render header badges. */}
            {/* <span className={`rounded-full px-2.5 py-1 text-[10px] font-[family-name:var(--mono)] uppercase ${navStatusClassName[module.status]}`}>
              {navStatusLabel[module.status]}
            </span> */}
          </div>
          {/* Keep module.description in navigation metadata, but do not render header helper text. */}
          {/* <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">{module.description}</p> */}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] text-[var(--text3)]">Pages</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text)]">{module.children?.length ?? 0}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] text-[var(--text3)]">Live</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text)]">{module.children?.filter((item) => item.status === "live").length ?? 0}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] text-[var(--text3)]">Pending</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text)]">{module.children?.filter((item) => item.status !== "live").length ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,0.7fr]">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center gap-2">
            <Layers3 className="size-4 text-[var(--brand)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Workspace sections</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {module.children?.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--brand)]/30 hover:bg-[var(--brand-bg)]"
                >
                  <div className="flex gap-3">
                    <div className="rounded-[8px] bg-[var(--bg1)] p-2 text-[var(--brand)]">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text)]">{item.label}</span>
                        {/* Keep item.status in navigation metadata, but do not render card badges. */}
                        {/* <span className={`rounded-full px-2 py-0.5 text-[10px] font-[family-name:var(--mono)] uppercase ${navStatusClassName[item.status]}`}>
                          {navStatusLabel[item.status]}
                        </span> */}
                      </div>
                      {/* Keep item.description in navigation metadata, but do not render card helper text. */}
                      {/* <p className="mt-1 text-xs text-[var(--text3)]">{item.description}</p> */}
                    </div>
                  </div>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[var(--text3)]" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[var(--green)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">What this shell gives you</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text2)]">
              <li>Persistent global navigation for product domains.</li>
              <li>Dedicated page-level sidebar for each selected module.</li>
              <li>Status-aware menu items so callable vs planned surfaces are explicit.</li>
            </ul>
          </div>
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-[var(--yellow)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Implementation note</h2>
            </div>
            <p className="mt-4 text-sm text-[var(--text2)]">
              This module page is intentionally aligned with the current Pulse design system and can be swapped from placeholder content to live data without changing the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
