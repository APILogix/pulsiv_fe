import React, { useState } from "react";
import {
  SlidersHorizontal,
  Search,
  Zap,
  Activity,
  Gauge,
  Lock,
  Radio,
  Sliders,
  ShieldAlert,
  History,
  FlaskConical,
  Layers,
  FileSpreadsheet,
  Share2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavSectionItem {
  id: string;
  label: string;
  group: "settings" | "operations" | "control";
  icon: React.ElementType;
  changedCount?: number;
  errorCount?: number;
  danger?: boolean;
  badge?: string;
}

const ALL_SECTIONS: NavSectionItem[] = [
  { id: "features", label: "Features", group: "settings", icon: Zap },
  { id: "transport", label: "Transport & Routes", group: "settings", icon: Activity },
  { id: "sampling", label: "Sampling Rates", group: "settings", icon: Gauge },
  { id: "privacy", label: "Privacy & PII", group: "settings", icon: Lock },
  { id: "instrumentation", label: "Instrumentation", group: "settings", icon: Radio },
  { id: "limits", label: "Limits & Governance", group: "settings", icon: Sliders },
  { id: "killswitches", label: "Killswitches", group: "settings", icon: ShieldAlert, danger: true },

  { id: "inheritance", label: "Inheritance Stack", group: "operations", icon: Layers, badge: "Stack" },
  { id: "rollout", label: "Rollout Strategy", group: "operations", icon: SlidersHorizontal, badge: "Canary" },
  { id: "telemetry", label: "SDK Telemetry", group: "operations", icon: Share2, badge: "Live" },

  { id: "history", label: "Revision History", group: "control", icon: History },
  { id: "resolve", label: "Payload Simulator", group: "control", icon: FlaskConical },
  { id: "audit", label: "Audit Logs", group: "control", icon: FileSpreadsheet },
];

interface RemoteConfigNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  changedCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

export function RemoteConfigNav({
  activeSection,
  onSelectSection,
  changedCounts,
  errorCounts,
}: RemoteConfigNavProps) {
  const [search, setSearch] = useState("");

  const filteredSections = ALL_SECTIONS.filter((section) =>
    section.label.toLowerCase().includes(search.toLowerCase())
  );

  const renderGroup = (
    title: string,
    items: NavSectionItem[]
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-col gap-1">
        <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text3)] py-1">
          {title}
        </div>
        {items.map((item) => {
          const isActive = item.id === activeSection;
          const changed = changedCounts[item.id] || 0;
          const errors = errorCounts[item.id] || 0;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                "group relative flex items-center justify-between rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-150 text-left",
                isActive
                  ? item.danger
                    ? "bg-red-500/15 text-red-400 border border-red-500/30 font-semibold shadow-sm"
                    : "bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 font-semibold shadow-sm"
                  : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive
                      ? item.danger
                        ? "text-red-400"
                        : "text-[var(--brand)]"
                      : item.danger
                      ? "text-red-400/70"
                      : "text-[var(--text3)] group-hover:text-[var(--text)]"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge && (
                  <span className="rounded-full bg-[var(--bg2)] px-1.5 py-0.2 text-[9px] font-semibold text-[var(--text3)] border border-[var(--border)]">
                    {item.badge}
                  </span>
                )}

                {errors > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                    {errors}
                  </span>
                )}

                {changed > 0 && errors === 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white shadow-xs">
                    {changed}
                  </span>
                )}

                <ChevronRight
                  className={cn(
                    "size-3.5 opacity-0 transition-opacity group-hover:opacity-100",
                    isActive ? "opacity-100 text-[var(--brand)]" : "text-[var(--text3)]"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <nav className="flex flex-col gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--bg1)]/80 p-3.5 shadow-md backdrop-blur-md w-full lg:w-[260px] shrink-0">
      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-[var(--text3)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter sections..."
          className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]/80 pl-8 pr-3 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
        />
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {renderGroup(
          "Config Schema",
          filteredSections.filter((s) => s.group === "settings")
        )}
        {renderGroup(
          "Operations & Overrides",
          filteredSections.filter((s) => s.group === "operations")
        )}
        {renderGroup(
          "Control Plane & Audit",
          filteredSections.filter((s) => s.group === "control")
        )}
      </div>
    </nav>
  );
}
