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
      <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
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
              "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all",
              isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50 bg-[var(--bg1)]"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isSelected ? <Check className="w-4 h-4" /> : <Plug className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{connector.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{connector.type}</div>
            </div>
            <div className="flex items-center">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connector.status === "healthy" ? "bg-green-500" :
                connector.status === "degraded" ? "bg-amber-500" : "bg-red-500"
              )} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
