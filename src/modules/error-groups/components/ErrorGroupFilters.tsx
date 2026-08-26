import { FilterSelect, SearchInput } from "@/shared/observe";
import type { ErrorGroupFilterState } from "../types/error-group";

interface ErrorGroupFiltersProps {
  filters: ErrorGroupFilterState;
  onChange: (key: keyof ErrorGroupFilterState, value: string) => void;
  onClear: () => void;
}

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
  { value: "archived", label: "Archived" },
];

const SEVERITY_OPTS = [
  { value: "", label: "All severities" },
  { value: "fatal", label: "Fatal" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
];

const REGRESSION_OPTS = [
  { value: "", label: "All" },
  { value: "true", label: "Regressed" },
  { value: "false", label: "Non-regressed" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
];

const RELEASE_OPTS = [
  { value: "", label: "All releases" },
  { value: "v3.1.0", label: "v3.1.0" },
  { value: "v3.0.9", label: "v3.0.9" },
  { value: "v3.0.8", label: "v3.0.8" },
];

export function ErrorGroupFilters({ filters, onChange }: ErrorGroupFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        placeholder="Search errors..."
        onSearch={(val) => onChange("search", val)}
        defaultValue={filters.search}
      />
      <FilterSelect
        value={filters.status}
        onChange={(val) => onChange("status", val)}
        options={STATUS_OPTS}
      />
      <FilterSelect
        value={filters.severity}
        onChange={(val) => onChange("severity", val)}
        options={SEVERITY_OPTS}
      />
      <FilterSelect
        value={filters.isRegression}
        onChange={(val) => onChange("isRegression", val)}
        options={REGRESSION_OPTS}
      />
      <FilterSelect
        value={filters.release}
        onChange={(val) => onChange("release", val)}
        options={RELEASE_OPTS}
      />
    </div>
  );
}
