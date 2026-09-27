import { useMemo, useState, type ElementType } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  History,
  Layers,
  Lock,
  Radio,
  Search,
  ShieldAlert,
  Sliders,
  SlidersHorizontal,
  Share2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavSectionItem {
  id: string;
  label: string;
  group: "settings" | "operations" | "control";
  icon: ElementType;
  changedCount?: number;
  errorCount?: number;
  danger?: boolean;
  badge?: string;
}

const ALL_SECTIONS: NavSectionItem[] = [
  { id: "features", label: "Features", group: "settings", icon: Zap },
  { id: "transport", label: "Transport & routes", group: "settings", icon: Activity },
  { id: "sampling", label: "Sampling rates", group: "settings", icon: Gauge },
  { id: "privacy", label: "Privacy & PII", group: "settings", icon: Lock },
  { id: "instrumentation", label: "Instrumentation", group: "settings", icon: Radio },
  { id: "limits", label: "Limits & governance", group: "settings", icon: Sliders },
  { id: "killswitches", label: "Emergency killswitches", group: "settings", icon: ShieldAlert, danger: true },

  { id: "inheritance", label: "Inheritance stack", group: "operations", icon: Layers, badge: "Stack" },
  { id: "rollout", label: "Rollout strategy", group: "operations", icon: SlidersHorizontal, badge: "Canary" },
  { id: "telemetry", label: "SDK telemetry", group: "operations", icon: Share2, badge: "Live" },

  { id: "history", label: "Revision history", group: "control", icon: History },
  { id: "resolve", label: "Payload simulator", group: "control", icon: FlaskConical },
  { id: "audit", label: "Audit trail", group: "control", icon: FileSpreadsheet },
];

const GROUPS: Array<{ id: NavSectionItem["group"]; title: string }> = [
  { id: "settings", title: "Configuration Schema" },
  { id: "operations", title: "Operations & Overrides" },
  { id: "control", title: "Control Plane & Audit" },
];

interface RemoteConfigNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  changedCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

function CountBadge({ count, tone }: { count: number; tone: "error" | "changed" }) {
  const isError = tone === "error";
  return (
    <span
      className={cn(
        "tabular flex min-w-4 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold leading-4 shadow-xs",
        isError
          ? "bg-[var(--red)] text-white"
          : "bg-[var(--brand)] text-[var(--brand-fg)]"
      )}
      aria-label={isError ? `${count} validation errors` : `${count} unpublished changes`}
    >
      {count}
    </span>
  );
}

export function RemoteConfigNav({
  activeSection,
  onSelectSection,
  changedCounts,
  errorCounts,
}: RemoteConfigNavProps) {
  const [search, setSearch] = useState("");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const activeItem = useMemo(
    () => ALL_SECTIONS.find((s) => s.id === activeSection) || ALL_SECTIONS[0],
    [activeSection]
  );

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ALL_SECTIONS;
    return ALL_SECTIONS.filter((section) =>
      section.label.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <nav
      aria-label="Configuration sections"
      className="flex w-full shrink-0 flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3 sm:p-4 lg:w-[264px]"
    >
      {/* Mobile Current Section Picker Header */}
      <div className="flex items-center justify-between lg:hidden border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center gap-2">
          <activeItem.icon className="size-4 text-[var(--brand)]" />
          <span className="font-semibold text-xs text-[var(--text)]">{activeItem.label}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
        >
          {mobileExpanded ? "Close menu" : "Switch section"}
          <ChevronDown className={cn("size-3.5 transition-transform", mobileExpanded && "rotate-180")} />
        </button>
      </div>

      {/* Nav Content (Always visible on lg, toggled on mobile) */}
      <div className={cn("flex flex-col gap-3", !mobileExpanded && "hidden lg:flex")}>
        {/* Search Input */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections..."
            aria-label="Filter configuration sections"
            className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-8 pr-7 text-[12px] text-[var(--text)] transition-colors placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Section List */}
        <div className="flex max-h-[calc(100vh-280px)] flex-col gap-3.5 overflow-y-auto pr-0.5">
          {GROUPS.map(({ id: groupId, title }) => {
            const items = filteredSections.filter((s) => s.group === groupId);
            if (items.length === 0) return null;

            return (
              <div key={groupId} className="flex flex-col gap-1">
                <div className="eyebrow px-2 py-0.5 text-[10px] text-[var(--text3)]">{title}</div>

                {items.map((item) => {
                  const isActive = item.id === activeSection;
                  const changed = changedCounts[item.id] ?? 0;
                  const errors = errorCounts[item.id] ?? 0;
                  const Icon = item.icon;
                  const isBlocking = errors > 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectSection(item.id);
                        setMobileExpanded(false);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-[var(--radius)] px-2.5 py-1.5 text-left text-[12.5px] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]",
                        isActive
                          ? isBlocking
                            ? "bg-[var(--red-bg)] font-semibold text-[var(--red)] border-l-2 border-[var(--red)]"
                            : "bg-[var(--bg2)] font-semibold text-[var(--text)] border-l-2 border-[var(--brand)] shadow-xs"
                          : "text-[var(--text2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--text)]"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            isBlocking
                              ? "text-[var(--red)]"
                              : isActive
                                ? "text-[var(--brand)]"
                                : item.danger
                                  ? "text-[var(--red)]/70 group-hover:text-[var(--red)]"
                                  : "text-[var(--text3)] group-hover:text-[var(--text2)]"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        {item.badge && !isBlocking && changed === 0 && (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--bg2)] px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-[var(--text3)]">
                            {item.badge}
                          </span>
                        )}

                        {isBlocking ? (
                          <CountBadge count={errors} tone="error" />
                        ) : changed > 0 ? (
                          <CountBadge count={changed} tone="changed" />
                        ) : null}

                        <ChevronRight
                          className={cn(
                            "size-3 transition-opacity",
                            isActive
                              ? "opacity-100 text-[var(--text3)]"
                              : "opacity-0 text-[var(--text3)] group-hover:opacity-100"
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <p className="px-2 py-3 text-[12px] text-[var(--text3)]">
              No sections match "{search.trim()}".
            </p>
          )}
        </div>
      </div>
    </nav>
  );
}
