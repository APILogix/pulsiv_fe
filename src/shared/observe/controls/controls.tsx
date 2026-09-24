import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Uncontrolled search (rules.md §8.2 — ref + onSubmit, no per-keystroke state).
export function SearchInput({ placeholder = "Search…", onSearch, defaultValue = "" }: {
  placeholder?: string;
  onSearch: (q: string) => void;
  defaultValue?: string;
}) {
  const [val, setVal] = useState(defaultValue);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val);
  };
  const handleClear = () => {
    setVal("");
    onSearch("");
  };
  return (
    <form onSubmit={handleSubmit} className="relative flex-1 min-w-[200px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]" />
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-9 pr-9 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {val && (
        <button type="button" onClick={handleClear} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)] cursor-pointer">
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
      {label && <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]"
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
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-2">
      {children}
      {onClear && (
        <button type="button" onClick={onClear} className="ml-auto text-[12px] text-[var(--text3)] hover:text-[var(--text)]">
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
              <th key={h} className="truncate bg-[var(--bg2)] px-5 py-3 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{h}</th>
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
