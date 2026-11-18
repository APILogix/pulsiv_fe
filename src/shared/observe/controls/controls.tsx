import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function getOptionIndicator(val: string): string | null {
  const v = val.toLowerCase();
  // Severities & error states
  if (v === "fatal" || v === "error" || v === "failed" || v === "5xx" || v === "500" || v === "502" || v === "503" || v === "bad") return "bg-[var(--red)]";
  if (v === "warning" || v === "warn" || v === "4xx" || v === "404" || v === "401" || v === "degraded") return "bg-[var(--amber)]";
  if (v === "resolved" || v === "healthy" || v === "success" || v === "good") return "bg-[var(--green)]";
  if (v === "open") return "bg-[var(--amber)]";
  if (v === "info") return "bg-sky-400";
  // Regressions
  if (v === "true") return "bg-[var(--red)]";
  // Environments
  if (v === "production") return "bg-emerald-400";
  if (v === "staging") return "bg-amber-400";
  if (v === "development") return "bg-sky-400";
  if (v === "preview" || v === "testing") return "bg-purple-400";
  return null;
}

// High-precision search input with keyboard shortcut hint and micro-clearing.
export function SearchInput({
  placeholder = "Search…",
  onSearch,
  defaultValue = "",
  className,
}: {
  placeholder?: string;
  onSearch: (q: string) => void;
  defaultValue?: string;
  className?: string;
}) {
  const [val, setVal] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val.trim());
  };

  const handleClear = () => {
    setVal("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "group relative flex min-w-[160px] sm:min-w-[200px] md:min-w-[220px] max-w-[320px] flex-1 items-center transition-all",
        className
      )}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-2.5 size-3.5 transition-colors duration-150",
          isFocused ? "text-[var(--text)]" : "text-[var(--text3)]"
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={val}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            handleClear();
          }
        }}
        placeholder={placeholder}
        className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 pl-8 pr-7 text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:bg-[var(--bg2)] focus:ring-1 focus:ring-[var(--border2)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {val ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 flex size-4 items-center justify-center rounded-full text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)] cursor-pointer"
        >
          <X className="size-3" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 hidden select-none rounded border border-[var(--border)]/80 bg-[var(--bg3)]/30 px-1 py-0.2 font-[family-name:var(--mono)] text-[9px] font-medium text-[var(--text3)] sm:inline-block">
          /
        </kbd>
      )}
    </form>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
}) {
  const effectiveLabel = label || (() => {
    const first = options[0]?.label || "";
    if (first.startsWith("All ")) return first.replace(/^All\s+/i, "");
    if (first.startsWith("Any ")) return first.replace(/^Any\s+/i, "");
    if (first.includes(" or ")) return first.split(" or ")[0];
    return first || "Filter";
  })();

  const isDefault = !value || value === "all" || (options.length > 0 && value === options[0].value);
  const isActive = !isDefault;
  const selectedOption = options.find((o) => o.value === value);

  // When inactive and effectiveLabel is shown, shorten redundant prefixes like "All environments" -> "All"
  const getInactiveDisplay = (raw: string) => {
    const lower = raw.toLowerCase().trim();
    if (lower.startsWith("all ") || lower === "all") return "All";
    if (lower.startsWith("any ") || lower === "any") return "Any";
    if (lower === "handled or not") return "Any";
    return raw;
  };

  const displayValue = isActive
    ? (selectedOption?.label ?? value)
    : (effectiveLabel ? getInactiveDisplay(options[0]?.label ?? "All") : (options[0]?.label ?? "All"));

  const indicatorColor = isActive ? getOptionIndicator(value) : null;

  return (
    <DropdownMenu>
      {isActive ? (
        <div
          className={cn(
            "group inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)] shadow-xs text-[12px] font-medium transition-all hover:border-[var(--text3)]",
            className
          )}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-full items-center gap-1.5 pl-2.5 pr-1 text-[12px] font-medium outline-none cursor-pointer select-none text-[var(--text)]"
            >
              {indicatorColor ? (
                <span className={cn("size-1.5 rounded-full shrink-0 shadow-xs", indicatorColor)} />
              ) : (
                <span className="size-1.5 rounded-full shrink-0 bg-[var(--brand)]" />
              )}
              <span className="truncate max-w-[140px]">
                {effectiveLabel && <span className="text-[var(--text3)] font-normal mr-1">{effectiveLabel}:</span>}
                <span className="font-medium font-[family-name:var(--mono)]">{displayValue}</span>
              </span>
              <ChevronDown className="size-3 shrink-0 text-[var(--text3)] transition-transform duration-150 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <div className="h-3.5 w-px bg-[var(--border2)]/60" />
          <button
            type="button"
            title={`Clear ${effectiveLabel}`}
            aria-label={`Clear ${effectiveLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              const defaultVal =
                options.find((o) => o.value === "all" || o.value === "")?.value ??
                options[0]?.value ??
                "";
              onChange(defaultVal);
            }}
            className="inline-flex h-full items-center justify-center px-1.5 text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]/60 rounded-r-[var(--radius)] transition-colors cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 px-2.5 text-[12px] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-all outline-none cursor-pointer select-none focus-visible:ring-1 focus-visible:ring-[var(--border2)]",
              className
            )}
          >
            <span className="truncate max-w-[160px]">
              {effectiveLabel && <span className="text-[var(--text3)] font-normal mr-1">{effectiveLabel}:</span>}
              <span>{displayValue}</span>
            </span>
            <ChevronDown className="size-3 shrink-0 text-[var(--text3)] transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
      )}

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[180px] max-h-[320px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-1 text-[12px] text-[var(--text)] shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {effectiveLabel && (
          <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] border-b border-[var(--border)]/50 mb-1">
            {effectiveLabel}
          </div>
        )}
        {options.map((opt) => {
          const isSelected = opt.value === value;
          const optDot = opt.value ? getOptionIndicator(opt.value) : null;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={cn(
                "flex items-center justify-between gap-2.5 rounded-[var(--radius)] px-2.5 py-1.5 text-[12px] outline-none transition-colors cursor-pointer select-none",
                isSelected
                  ? "bg-[var(--bg2)] text-[var(--text)] font-medium"
                  : "text-[var(--text2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--text)]"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                {optDot ? (
                  <span className={cn("size-1.5 rounded-full shrink-0", optDot)} />
                ) : (
                  opt.value ? <span className="size-1.5 rounded-full shrink-0 bg-transparent" /> : null
                )}
                <span className="truncate">{opt.label}</span>
              </span>
              {isSelected && <Check className="size-3.5 shrink-0 text-[var(--text)]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterBar({ children, onClear, className }: { children: React.ReactNode; onClear?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5", className)}>
      {children}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-[var(--radius)] px-2 text-[12px] text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors cursor-pointer"
        >
          <X className="size-3" />
          Clear all
        </button>
      )}
    </div>
  );
}

export function Table({
  headers,
  children,
  maxHeight = "28rem",
}: {
  headers: string[];
  children: React.ReactNode;
  maxHeight?: string;
}) {
  return (
    <div
      className="sidebar-scroll overflow-y-auto overflow-x-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]"
      style={{ maxHeight }}
    >
      <table className="w-full table-fixed text-[13px]">
        <thead className="sticky top-0 z-10 bg-[var(--bg2)]">
          <tr className="border-b border-[var(--border)] text-left">
            {headers.map((h) => (
              <th key={h} className="truncate bg-[var(--bg2)] px-5 py-3 text-[12px] text-[var(--text3)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const interactive = !!onClick;
  return (
    <tr
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn("border-b border-[var(--border)] last:border-0 transition-colors", interactive && "cursor-pointer hover:bg-[var(--bg2)]", className)}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("truncate px-5 py-3 align-middle text-[var(--text)]", className)}>{children}</td>;
}

export function Button({ children, variant = "secondary", onClick, type = "button", disabled, className }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const tone =
    variant === "primary" ? "bg-[var(--brand)] text-[var(--brand-fg)] font-semibold hover:bg-[var(--brand-d)]"
    : variant === "danger" ? "border border-[rgba(239,68,68,0.35)] bg-[var(--red-bg)] text-[var(--red)] hover:bg-[rgba(239,68,68,0.16)]"
    : variant === "ghost" ? "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
    : "border border-[var(--border2)] bg-transparent text-[var(--text2)] hover:border-[var(--text3)] hover:text-[var(--text)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn("group inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] px-3 text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:opacity-50", tone, className)}>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <span className="flex items-center gap-1.5 transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-7">
          {children}
        </span>
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] translate-y-7 group-hover:translate-y-0">
          {children}
        </span>
      </div>
    </button>
  );
}
