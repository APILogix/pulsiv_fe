import { X } from "lucide-react";
import { ENVIRONMENT_OPTIONS, FilterSelect, SearchInput } from "@/shared/observe";
import type { ErrorGroupFilterState } from "../types/error-group";

interface ErrorGroupFiltersProps {
  filters: ErrorGroupFilterState;
  onChange: (key: keyof ErrorGroupFilterState, value: string) => void;
  onClear: () => void;
}

const STATUS_OPTS = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
  { value: "archived", label: "Archived" },
];

const SEVERITY_OPTS = [
  { value: "", label: "Any severity" },
  { value: "fatal", label: "Fatal" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
];

const REGRESSION_OPTS = [
  { value: "", label: "Regressed or not" },
  { value: "true", label: "Regressed" },
  { value: "false", label: "Not regressed" },
];

const OCCURRENCE_OPTS = [
  { value: "", label: "Any volume" },
  { value: "10", label: "10+ events" },
  { value: "100", label: "100+ events" },
  { value: "1000", label: "1,000+ events" },
];

export function ErrorGroupFilters({ filters, onChange, onClear }: ErrorGroupFiltersProps) {
  const active = Object.entries(filters).some(([k, v]) => ["status", "severity", "isRegression", "environment", "release", "minOccurrences", "search"].includes(k) && Boolean(v));
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <SearchInput
        key={filters.search}
        placeholder="Search error name, message, fingerprint…"
        onSearch={(val) => onChange("search", val)}
        defaultValue={filters.search}
      />
      <FilterSelect label="Environment" value={filters.environment ?? ""} onChange={(val) => onChange("environment", val)} options={ENVIRONMENT_OPTIONS} />
      <FilterSelect label="Status" value={filters.status} onChange={(val) => onChange("status", val)} options={STATUS_OPTS} />
      <FilterSelect label="Severity" value={filters.severity} onChange={(val) => onChange("severity", val)} options={SEVERITY_OPTS} />
      <FilterSelect label="Regression" value={filters.isRegression} onChange={(val) => onChange("isRegression", val)} options={REGRESSION_OPTS} />
      <FilterSelect label="Volume" value={filters.minOccurrences ?? ""} onChange={(val) => onChange("minOccurrences", val)} options={OCCURRENCE_OPTS} />
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
        >
          <X className="size-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}
