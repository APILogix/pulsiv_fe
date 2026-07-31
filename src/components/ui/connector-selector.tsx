import { Plug, Check } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface Connector {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "failed";
}

export interface ConnectorSelectorProps {
  connectors: Connector[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ConnectorSelector({ connectors, selectedIds, onChange }: ConnectorSelectorProps) {
  const selectedIdSet = new Set(selectedIds);

  const toggle = (id: string) => {
    if (selectedIdSet.has(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (!connectors?.length) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-center text-[13px] text-[var(--text2)]">
        No connectors configured in this organization.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {connectors.map(connector => {
        const isSelected = selectedIdSet.has(connector.id);
        
        return (
          <button
            type="button"
            key={connector.id}
            onClick={() => toggle(connector.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-[var(--radius)] border cursor-pointer transition-colors duration-150",
              isSelected
                ? "border-[var(--brand)] bg-[var(--brand-bg)]"
                : "border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border2)]"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              isSelected ? "bg-[var(--brand)] text-[var(--brand-fg)]" : "bg-[var(--bg2)] text-[var(--text3)]"
            )}>
              {isSelected ? <Check className="w-4 h-4" /> : <Plug className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[13px] font-medium text-[var(--text)]">{connector.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--text3)]">{connector.type}</div>
            </div>
            <div className="flex items-center">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connector.status === "healthy" ? "bg-[var(--green)]" :
                connector.status === "degraded" ? "bg-[var(--amber)]" : "bg-[var(--red)]"
              )} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
