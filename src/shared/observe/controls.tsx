import { useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Uncontrolled search (rules.md §8.2 — ref + onSubmit, no per-keystroke state).
export function SearchInput({ placeholder = "Search…", onSearch, defaultValue }: {
  placeholder?: string;
  onSearch: (q: string) => void;
  defaultValue?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(ref.current?.value ?? "");
  };
  const handleClear = () => {
    if (ref.current) ref.current.value = "";
    onSearch("");
  };
  return (
    <form onSubmit={handleSubmit} className="relative flex-1 min-w-[200px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]" />
      <input
        ref={ref}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] pl-9 pr-9 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--brand)]"
      />
      {defaultValue && (
        <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]">
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      {label && <span className="text-[12px] text-[var(--text3)]">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--brand)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children, onClear }: { children: React.ReactNode; onClear?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-2">
      {children}
      {onClear && (
        <button onClick={onClear} className="ml-auto text-[12px] text-[var(--text3)] hover:text-[var(--text)]">
          Clear all
        </button>
      )}
    </div>
  );
}

// Simple (non-virtualized) table for <100 rows.
// Only the table body scrolls — the header row stays pinned to the top of the
// scroll container. `maxHeight` caps the scroll region (default 28rem).
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
      className="sidebar-scroll overflow-y-auto overflow-x-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]"
      style={{ maxHeight }}
    >
      <table className="w-full table-fixed text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--bg1)]">
          <tr className="border-b border-[var(--border)] text-left">
            {headers.map((h) => (
              <th key={h} className="truncate bg-[var(--bg1)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn("border-b border-[var(--border)] last:border-0 transition-colors", onClick && "cursor-pointer hover:bg-[var(--bg2)]")}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("truncate px-4 py-2.5 align-middle text-[var(--text)]", className)}>{children}</td>;
}

export function Button({ children, variant = "secondary", onClick, type = "button", disabled }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const tone =
    variant === "primary" ? "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]"
    : variant === "danger" ? "bg-[var(--red-bg)] text-[var(--red)] hover:bg-[var(--red)]/20"
    : variant === "ghost" ? "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
    : "border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] hover:border-[var(--input)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn("inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm font-medium transition-colors disabled:opacity-50", tone)}>
      {children}
    </button>
  );
}
