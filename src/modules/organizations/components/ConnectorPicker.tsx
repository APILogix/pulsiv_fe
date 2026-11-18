import { useState, useMemo, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Link } from "react-router";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  AlertTriangle,
  ExternalLink,
  PlusCircle,
  Hash,
  Mail,
  Globe,
  Users,
  MessageSquare,
  Bell,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useConnectorPicker,
  type ConnectorPickerItem,
  type ConnectorPickerStatus,
} from "../hooks/useConnectors";
import { useOrganizations } from "../hooks/useOrganizations";
import { orgRoutes } from "@/app/router/org-routes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Timestamp } from "@/shared/observe";

// ── Provider Icons & Labels ──────────────────────────────────

export const PROVIDER_META: Record<
  string,
  { label: string; icon: typeof Plug; colorClass: string; bgClass: string }
> = {
  slack: {
    label: "Slack",
    icon: Hash,
    colorClass: "text-[#4A154B] dark:text-[#E01E5A]",
    bgClass: "bg-[#4A154B]/10 dark:bg-[#E01E5A]/10",
  },
  email: {
    label: "Email",
    icon: Mail,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
  webhook: {
    label: "Webhook",
    icon: Globe,
    colorClass: "text-violet-500",
    bgClass: "bg-violet-500/10",
  },
  teams: {
    label: "Microsoft Teams",
    icon: Users,
    colorClass: "text-[#6264A7]",
    bgClass: "bg-[#6264A7]/10",
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    colorClass: "text-[#5865F2]",
    bgClass: "bg-[#5865F2]/10",
  },
  pagerduty: {
    label: "PagerDuty",
    icon: Bell,
    colorClass: "text-[#06AC38]",
    bgClass: "bg-[#06AC38]/10",
  },
};

export function getProviderMeta(type: string) {
  const normalized = type.toLowerCase();
  return (
    PROVIDER_META[normalized] ?? {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      icon: Plug,
      colorClass: "text-[var(--text2)]",
      bgClass: "bg-[var(--bg2)]",
    }
  );
}

// ── Status Badges & Explanations ─────────────────────────────

const STATUS_CONFIG: Record<
  ConnectorPickerStatus,
  { label: string; badgeClass: string; dotClass: string; disabledReason?: string }
> = {
  active: {
    label: "Active",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
  needs_reauth: {
    label: "Needs re-auth",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
    disabledReason: "Requires re-authentication by an administrator before selection",
  },
  disabled: {
    label: "Disabled",
    badgeClass: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-400",
    disabledReason: "Connector is disabled in organization settings",
  },
  error: {
    label: "Config error",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-500",
    disabledReason: "Connector has health check or credential errors",
  },
};

export interface ConnectorPickerProps {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (connector: ConnectorPickerItem | null) => void;
  allowedTypes?: string[];
  projectId?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  "aria-describedby"?: string;
}

export function ConnectorPicker({
  id = "connectorId",
  name = "connectorId",
  value,
  onChange,
  allowedTypes,
  projectId,
  disabled = false,
  required = false,
  placeholder = "Select an organization connector…",
  className,
  ariaLabel = "Organization connector",
  "aria-describedby": ariaDescribedBy,
}: ConnectorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Debounce search input by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  // Organization & Permissions context
  const { organizations, activeOrgId, activeOrgSlug } = useOrganizations();
  const currentOrg = organizations.find((org: any) => org.id === activeOrgId);
  const userRole = currentOrg?.role?.toLowerCase() ?? "";
  const isOrgAdminOrOwner = userRole === "owner" || userRole === "admin";

  // Fetch connectors list through React Query
  const { data: rawConnectors = [], isLoading, isError, refetch } = useConnectorPicker({
    projectId,
    q: debouncedSearch || undefined,
  });

  // Filter allowed types if prop provided
  const allConnectors = useMemo(() => {
    if (!allowedTypes?.length) return rawConnectors;
    const allowed = new Set(allowedTypes.map((t) => t.toLowerCase()));
    return rawConnectors.filter((c) => allowed.has(c.type.toLowerCase()));
  }, [rawConnectors, allowedTypes]);

  // Unique connector types present in data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const c of allConnectors) {
      types.add(c.type.toLowerCase());
    }
    return Array.from(types).sort();
  }, [allConnectors]);

  // Filtered connectors based on tab and client search
  const filteredConnectors = useMemo(() => {
    return allConnectors.filter((item) => {
      if (selectedTypeFilter !== "all" && item.type.toLowerCase() !== selectedTypeFilter) {
        return false;
      }
      if (!debouncedSearch) return true;
      const term = debouncedSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term) ||
        (item.displayHint && item.displayHint.toLowerCase().includes(term))
      );
    });
  }, [allConnectors, selectedTypeFilter, debouncedSearch]);

  // Selected item lookup
  const selectedConnector = useMemo(() => {
    if (!value) return null;
    return rawConnectors.find((c) => c.id === value) ?? null;
  }, [value, rawConnectors]);

  // Auto-focus search when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
      setHighlightedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredConnectors.length, selectedTypeFilter]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= filteredConnectors.length ? 0 : next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filteredConnectors.length - 1 : next;
        });
        return;
      }

      if (e.key === "Enter") {
        if (highlightedIndex >= 0 && highlightedIndex < filteredConnectors.length) {
          e.preventDefault();
          const target = filteredConnectors[highlightedIndex];
          if (target.status === "active") {
            onChange(target);
            setOpen(false);
          }
        }
      }
    },
    [open, filteredConnectors, highlightedIndex, onChange]
  );

  // Keep highlighted item visible
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const el = listboxRef.current.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const selectConnector = (item: ConnectorPickerItem) => {
    if (item.status !== "active") return;
    onChange(item);
    setOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Check if current value exists or is orphaned/deleted
  const isOrphaned = Boolean(value && !isLoading && !selectedConnector);

  return (
    <div className={cn("relative w-full", className)} onKeyDown={handleKeyDown}>
      {/* Hidden input for HTML form submission */}
      <input type="hidden" id={id} name={name} value={value ?? ""} required={required} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border2)] disabled:cursor-not-allowed disabled:opacity-50",
              isOrphaned
                ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                : selectedConnector
                  ? "border-[var(--border)] bg-[var(--bg1)] text-[var(--text)] hover:border-[var(--border2)]"
                  : "border-[var(--border)] bg-[var(--bg1)] text-[var(--text3)] hover:border-[var(--border2)]"
            )}
          >
            {selectedConnector ? (
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {(() => {
                  const meta = getProviderMeta(selectedConnector.type);
                  const Icon = meta.icon;
                  return (
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-[var(--radius)]",
                        meta.bgClass
                      )}
                    >
                      <Icon className={cn("size-3.5", meta.colorClass)} aria-hidden="true" />
                    </div>
                  );
                })()}

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-[var(--text)]">{selectedConnector.name}</span>
                    <span className="shrink-0 rounded bg-[var(--bg2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                      {selectedConnector.type}
                    </span>
                  </div>
                  {selectedConnector.displayHint && (
                    <span className="truncate text-[11px] text-[var(--text3)]">
                      {selectedConnector.displayHint}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS_CONFIG[selectedConnector.status]?.dotClass ?? "bg-zinc-400"
                    )}
                    title={`Status: ${selectedConnector.status}`}
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded p-0.5 text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:outline-hidden"
                      aria-label="Clear selected connector"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ) : isOrphaned ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">Connector unavailable</span>
                  <span className="truncate text-[11px] opacity-80">
                    The previously assigned connector is no longer available. Please select another.
                  </span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded p-0.5 hover:bg-amber-500/10 focus-visible:outline-hidden"
                    aria-label="Clear missing connector"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Plug className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
                <span className="truncate">{placeholder}</span>
              </div>
            )}

            <ChevronsUpDown className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-(--radix-popover-trigger-width) min-w-[340px] max-w-[480px] p-0 shadow-[var(--shadow-toast)]"
        >
          {/* ── Search Bar ── */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <Search className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, provider, or destination…"
              className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded p-0.5 text-[var(--text3)] hover:text-[var(--text)]"
                aria-label="Clear search text"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* ── Type Filter Chips (if multiple types exist) ── */}
          {availableTypes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] px-2.5 py-1.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("all")}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  selectedTypeFilter === "all"
                    ? "bg-[var(--text)] text-[var(--bg1)]"
                    : "bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]"
                )}
              >
                All ({allConnectors.length})
              </button>
              {availableTypes.map((type) => {
                const count = allConnectors.filter((c) => c.type.toLowerCase() === type).length;
                const meta = getProviderMeta(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                      selectedTypeFilter === type
                        ? "bg-[var(--text)] text-[var(--bg1)]"
                        : "bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]"
                    )}
                  >
                    <span>{meta.label}</span>
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Listbox Options ── */}
          <div
            ref={listboxRef}
            id="connector-picker-listbox"
            role="listbox"
            aria-label="Available organization connectors"
            className="max-h-[300px] overflow-y-auto p-1.5"
          >
            {isLoading ? (
              <div className="flex flex-col gap-2 p-3 text-center">
                <div className="mx-auto size-5 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--brand)]" />
                <span className="text-[12px] text-[var(--text3)]">Loading connectors…</span>
              </div>
            ) : isError ? (
              <div className="p-3 text-center">
                <p className="text-[12px] text-rose-500">Failed to load connectors.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-1.5 text-[11px] font-medium text-[var(--brand)] underline hover:opacity-80"
                >
                  Retry
                </button>
              </div>
            ) : allConnectors.length === 0 ? (
              /* Empty state: No connectors in org at all */
              <div className="flex flex-col items-center justify-center p-5 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)]">
                  <Plug className="size-5" aria-hidden="true" />
                </div>
                <h4 className="mt-2.5 text-[13px] font-medium text-[var(--text)]">No connectors configured</h4>
                <p className="mt-1 text-[12px] text-[var(--text3)] max-w-[280px]">
                  Organization connectors authenticate with Slack, Teams, Email, or Webhooks without exposing credentials to projects.
                </p>

                {isOrgAdminOrOwner ? (
                  <Link
                    to={activeOrgSlug ? orgRoutes.connectors(activeOrgSlug) : "/connectors"}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--text)] px-3 py-1.5 text-[12px] font-medium text-[var(--bg1)] shadow-xs transition-opacity hover:opacity-90"
                  >
                    <PlusCircle className="size-3.5" aria-hidden="true" />
                    Set up a connector
                  </Link>
                ) : (
                  <p className="mt-3 rounded-[var(--radius)] bg-[var(--bg2)] px-2.5 py-1.5 text-[11px] text-[var(--text2)]">
                    Contact your organization administrator or owner to configure connectors.
                  </p>
                )}
              </div>
            ) : filteredConnectors.length === 0 ? (
              /* Empty state: Search/Filter yielded 0 results */
              <div className="p-5 text-center">
                <p className="text-[13px] font-medium text-[var(--text)]">No matching connectors</p>
                <p className="mt-1 text-[12px] text-[var(--text3)]">
                  No connectors match “{search}” in {selectedTypeFilter === "all" ? "any provider" : selectedTypeFilter}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedTypeFilter("all");
                  }}
                  className="mt-2.5 text-[12px] font-medium text-[var(--brand)] hover:underline"
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              /* Connectors list */
              <div className="flex flex-col gap-1">
                {filteredConnectors.map((item, index) => {
                  const meta = getProviderMeta(item.type);
                  const Icon = meta.icon;
                  const statusInfo = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.disabled;
                  const isActive = item.status === "active";
                  const isSelected = item.id === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={!isActive}
                      disabled={!isActive}
                      onClick={() => selectConnector(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "group flex w-full items-start gap-2.5 rounded-[var(--radius)] p-2 text-left transition-colors",
                        isHighlighted ? "bg-[var(--bg2)]" : "hover:bg-[var(--bg2)]",
                        isSelected && "bg-[var(--brand-bg)]",
                        !isActive && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {/* Provider Icon */}
                      <div
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)]",
                          meta.bgClass
                        )}
                      >
                        <Icon className={cn("size-4", meta.colorClass)} aria-hidden="true" />
                      </div>

                      {/* Details */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-[13px] font-medium",
                              isSelected ? "text-[var(--brand)]" : "text-[var(--text)]"
                            )}
                          >
                            {item.name}
                          </span>
                          <span className="shrink-0 rounded bg-[var(--bg2)] px-1.5 py-0.2 text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                            {meta.label}
                          </span>
                        </div>

                        {item.displayHint && (
                          <span className="truncate text-[11px] text-[var(--text2)]">
                            {item.displayHint}
                          </span>
                        )}

                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text3)]">
                          {item.lastVerifiedAt ? (
                            <span>
                              Verified <Timestamp value={item.lastVerifiedAt} />
                            </span>
                          ) : (
                            <span>Never verified</span>
                          )}

                          {!isActive && statusInfo.disabledReason && (
                            <span className="truncate text-amber-600 dark:text-amber-400">
                              • {statusInfo.disabledReason}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Checkmark */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-tight",
                            statusInfo.badgeClass
                          )}
                        >
                          {statusInfo.label}
                        </span>
                        {isSelected && (
                          <Check className="size-4 text-[var(--brand)]" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer Link for Admins ── */}
          {isOrgAdminOrOwner && allConnectors.length > 0 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg2)]/50 px-3 py-2 text-[11px]">
              <span className="text-[var(--text3)]">Manage organization connectors</span>
              <Link
                to={activeOrgSlug ? orgRoutes.connectors(activeOrgSlug) : "/connectors"}
                className="inline-flex items-center gap-1 font-medium text-[var(--brand)] hover:underline"
              >
                Settings <ExternalLink className="size-3" aria-hidden="true" />
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
