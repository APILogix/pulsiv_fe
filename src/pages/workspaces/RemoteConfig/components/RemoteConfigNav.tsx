import { useMemo, useState, type ElementType } from "react";
import {
  Activity,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  History,
  Layers,
  Lock,
  Radio,
  ShieldAlert,
  Sliders,
  SlidersHorizontal,
  Share2,
  Zap,
} from "lucide-react";

import { PROJECT_FILL_HEIGHT, SearchField } from "@/modules/projects/components/project-page";
import { fieldInputClass } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

export interface NavSectionItem {
  id: string;
  label: string;
  group: "settings" | "operations" | "control";
  icon: ElementType;
  /** Sections that show sample data rather than this project's config. */
  preview?: boolean;
}

const ALL_SECTIONS: NavSectionItem[] = [
  { id: "features", label: "Features", group: "settings", icon: Zap },
  { id: "transport", label: "Transport & routes", group: "settings", icon: Activity },
  { id: "sampling", label: "Sampling rates", group: "settings", icon: Gauge },
  { id: "privacy", label: "Privacy & PII", group: "settings", icon: Lock },
  { id: "instrumentation", label: "Instrumentation", group: "settings", icon: Radio },
  { id: "limits", label: "Limits & governance", group: "settings", icon: Sliders },
  { id: "killswitches", label: "Emergency killswitches", group: "settings", icon: ShieldAlert },

  { id: "inheritance", label: "Inheritance", group: "operations", icon: Layers, preview: true },
  { id: "rollout", label: "Rollout strategy", group: "operations", icon: SlidersHorizontal, preview: true },
  { id: "telemetry", label: "SDK telemetry", group: "operations", icon: Share2, preview: true },

  { id: "history", label: "Revision history", group: "control", icon: History },
  { id: "resolve", label: "Payload simulator", group: "control", icon: FlaskConical },
  { id: "audit", label: "Audit trail", group: "control", icon: FileSpreadsheet, preview: true },
];

const GROUPS: Array<{ id: NavSectionItem["group"]; title: string }> = [
  { id: "settings", title: "Configuration" },
  { id: "operations", title: "Operations and overrides" },
  { id: "control", title: "Revisions and tools" },
];

interface RemoteConfigNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  changedCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

function optionSuffix(changed: number, errors: number, preview?: boolean) {
  if (errors > 0) return ` · ${errors} ${errors === 1 ? "error" : "errors"}`;
  if (changed > 0) return ` · ${changed} changed`;
  if (preview) return " · preview";
  return "";
}

/**
 * Section navigation for the editor. A labelled select below lg; a sticky,
 * searchable list beside the content from lg up. Unpublished changes show as
 * an amber count, validation errors as a red count.
 */
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
    <>
      {/* Below lg: one labelled select. */}
      <label className="flex flex-col gap-1.5 lg:hidden">
        <span className="text-[13px] font-medium text-[var(--text2)]">Section</span>
        <select
          value={activeSection}
          onChange={(event) => onSelectSection(event.target.value)}
          className={fieldInputClass}
        >
          {GROUPS.map((group) => (
            <optgroup key={group.id} label={group.title}>
              {ALL_SECTIONS.filter((section) => section.group === group.id).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                  {optionSuffix(changedCounts[section.id] ?? 0, errorCounts[section.id] ?? 0, section.preview)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* lg and up: sticky list beside the content. */}
      <nav
        aria-label="Configuration sections"
        className="sidebar-scroll hidden flex-col gap-4 overflow-y-auto lg:sticky lg:top-6 lg:flex lg:self-start"
        style={{ maxHeight: PROJECT_FILL_HEIGHT }}
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search sections"
          label="Filter configuration sections"
          className="min-w-0 sm:max-w-none"
        />

        {GROUPS.map(({ id: groupId, title }) => {
          const items = filteredSections.filter((section) => section.group === groupId);
          if (items.length === 0) return null;

          return (
            <div key={groupId} className="flex flex-col gap-px">
              <p className="px-2.5 pb-1 text-[12px] text-[var(--text3)]">{title}</p>

              {items.map((item) => {
                const isActive = item.id === activeSection;
                const changed = changedCounts[item.id] ?? 0;
                const errors = errorCounts[item.id] ?? 0;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex h-8 w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 text-left text-[13px] transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
                      isActive
                        ? "bg-[var(--bg2)] font-medium text-[var(--text)]"
                        : "text-[var(--text2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--text)]",
                    )}
                  >
                    {isActive && <span className="nav-row-indicator left-0" aria-hidden="true" />}
                    <Icon
                      className={cn(
                        "size-4 shrink-0 stroke-[1.75]",
                        isActive ? "text-[var(--text)]" : "text-[var(--text3)] group-hover:text-[var(--text2)]",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {errors > 0 ? (
                      <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--red)]">
                        <span aria-hidden="true">{errors}</span>
                        <span className="sr-only">, {errors} validation {errors === 1 ? "error" : "errors"}</span>
                      </span>
                    ) : changed > 0 ? (
                      <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--amber)]">
                        <span aria-hidden="true">{changed}</span>
                        <span className="sr-only">, {changed} unpublished {changed === 1 ? "change" : "changes"}</span>
                      </span>
                    ) : item.preview ? (
                      <span className="text-[11px] text-[var(--text3)]">Preview</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <p className="px-2.5 text-[12px] text-[var(--text3)]">No sections match “{search.trim()}”.</p>
        )}
      </nav>
    </>
  );
}
