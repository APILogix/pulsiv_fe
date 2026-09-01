/**
 * RemoteConfigNav — section rail for the remote-config workspace.
 *
 * ## Mono-theme rules applied here
 *
 * 1. **Fixed an invisibility bug the mono theme exposes.** The changed-count
 *    badge was `bg-[var(--brand)] text-white`. In mono `--brand` is `#fafafa`,
 *    so that rendered white text on a white pill. Badges now pair `--brand` with
 *    `--brand-fg`, which is the token designed for exactly this.
 * 2. **Danger is a state, not a label.** Killswitches previously rendered a red
 *    icon permanently, so the rail always looked like something was wrong. Red
 *    now appears only when that section actually holds a validation error.
 * 3. **Error outranks change.** A section can be both edited and invalid; the
 *    error badge wins, because that is the one that blocks publishing.
 * 4. **Tokenised radii and no chrome shadow** — `rounded-[16px]`/`rounded-[10px]`
 *    became `--radius-lg`/`--radius`, and `shadow-md backdrop-blur-md` is gone
 *    (§6: a hairline border carries the surface).
 * 5. **`.eyebrow` for group headings** instead of re-declaring the same
 *    uppercase-mono treatment inline.
 * 6. Removed `group-hover:scale-110` on icons: 13 icons that flinch on hover is
 *    motion without meaning (§9).
 *
 * Also fixes `py-0.2`, which is not a real Tailwind step and was silently dropped.
 */
import { useMemo, useState, type ElementType } from "react";
import {
  Activity,
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
  { id: "killswitches", label: "Killswitches", group: "settings", icon: ShieldAlert, danger: true },

  { id: "inheritance", label: "Inheritance stack", group: "operations", icon: Layers, badge: "Stack" },
  { id: "rollout", label: "Rollout strategy", group: "operations", icon: SlidersHorizontal, badge: "Canary" },
  { id: "telemetry", label: "SDK telemetry", group: "operations", icon: Share2, badge: "Live" },

  { id: "history", label: "Revision history", group: "control", icon: History },
  { id: "resolve", label: "Payload simulator", group: "control", icon: FlaskConical },
  { id: "audit", label: "Audit logs", group: "control", icon: FileSpreadsheet },
];

const GROUPS: Array<{ id: NavSectionItem["group"]; title: string }> = [
  { id: "settings", title: "Config schema" },
  { id: "operations", title: "Operations & overrides" },
  { id: "control", title: "Control plane & audit" },
];

interface RemoteConfigNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  changedCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

/** Count pill. `tone` decides which channel carries it. */
function CountBadge({ count, tone }: { count: number; tone: "error" | "changed" }) {
  const isError = tone === "error";
  return (
    <span
      className={cn(
        "tabular flex min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold leading-4",
        isError
          ? "bg-[var(--red)] text-white"
          // --brand-fg is the readable pairing for --brand in BOTH themes.
          : "bg-[var(--brand)] text-[var(--brand-fg)]",
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

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ALL_SECTIONS;
    return ALL_SECTIONS.filter((section) => section.label.toLowerCase().includes(query));
  }, [search]);

  return (
    <nav
      aria-label="Configuration sections"
      className="flex w-full shrink-0 flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 lg:w-[264px]"
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter sections"
          aria-label="Filter configuration sections"
          className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-8 pr-2.5 text-[12px] text-[var(--text)] transition-colors placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
        />
      </div>

      <div className="flex max-h-[calc(100vh-280px)] flex-col gap-3 overflow-y-auto pr-0.5">
        {GROUPS.map(({ id: groupId, title }) => {
          const items = filteredSections.filter((s) => s.group === groupId);
          if (items.length === 0) return null;

          return (
            <div key={groupId} className="flex flex-col gap-0.5">
              <div className="eyebrow px-2 py-1">{title}</div>

              {items.map((item) => {
                const isActive = item.id === activeSection;
                const changed = changedCounts[item.id] ?? 0;
                const errors = errorCounts[item.id] ?? 0;
                const Icon = item.icon;
                // Red is reserved for a real problem, not for a section that is
                // merely capable of causing one.
                const isBlocking = errors > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-1.5 text-left text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]",
                      isActive
                        ? isBlocking
                          ? "bg-[var(--red-bg)] font-medium text-[var(--red)]"
                          : "bg-[var(--bg3)] font-medium text-[var(--text)]"
                        : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          isBlocking
                            ? "text-[var(--red)]"
                            : isActive
                              ? "text-[var(--text)]"
                              : "text-[var(--text3)] group-hover:text-[var(--text2)]",
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

                      {/* Errors outrank changes: this is what blocks publishing. */}
                      {isBlocking ? (
                        <CountBadge count={errors} tone="error" />
                      ) : changed > 0 ? (
                        <CountBadge count={changed} tone="changed" />
                      ) : null}

                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-opacity",
                          isActive
                            ? "opacity-100 text-[var(--text3)]"
                            : "opacity-0 text-[var(--text3)] group-hover:opacity-100",
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
            No sections match “{search.trim()}”.
          </p>
        )}
      </div>
    </nav>
  );
}
