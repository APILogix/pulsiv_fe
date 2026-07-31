import * as React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { SeverityBadge, Severity } from "./severity-badge";

const EVENT_TYPES = [
  "deployment_failed", "deployment_success",
  "high_latency", "error_spike", "downtime",
  "config_changed", "security_alert"
];

const SEVERITIES: Severity[] = ["info", "warning", "error", "critical"];

export interface RouteCondition {
  event_types: string[];
  severities: Severity[];
  source_services: string[];
}

export interface RouteConditionBuilderProps {
  value: RouteCondition;
  onChange: (value: RouteCondition) => void;
}

export function RouteConditionBuilder({ value, onChange }: RouteConditionBuilderProps) {
  const [serviceInput, setServiceInput] = React.useState("");

  const toggleEventType = (type: string) => {
    const newTypes = value.event_types.includes(type)
      ? value.event_types.filter(t => t !== type)
      : [...value.event_types, type];
    onChange({ ...value, event_types: newTypes });
  };

  const toggleSeverity = (sev: Severity) => {
    const newSev = value.severities.includes(sev)
      ? value.severities.filter(s => s !== sev)
      : [...value.severities, sev];
    onChange({ ...value, severities: newSev });
  };

  const addService = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && serviceInput.trim() !== "") {
      e.preventDefault();
      if (!value.source_services.includes(serviceInput.trim())) {
        onChange({ ...value, source_services: [...value.source_services, serviceInput.trim()] });
      }
      setServiceInput("");
    }
  };

  const removeService = (svc: string) => {
    onChange({ ...value, source_services: value.source_services.filter(s => s !== svc) });
  };

  return (
    <div className="space-y-6">
      {/* Event Types */}
      <div className="space-y-3">
        <Label>Event types</Label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(type => (
            <Badge
              key={type}
              variant={value.event_types.includes(type) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleEventType(type)}
            >
              {type.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </div>

      {/* Severities */}
      <div className="space-y-3">
        <Label>Severity levels</Label>
        <div className="flex flex-wrap gap-3">
          {SEVERITIES.map(sev => (
            <button
              key={sev}
              type="button"
              className={`cursor-pointer rounded-full transition-opacity duration-150 ${
                value.severities.includes(sev)
                  ? "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--bg1)]"
                  : "opacity-55"
              }`}
              aria-pressed={value.severities.includes(sev)}
              aria-label={`Toggle ${sev} severity`}
              onClick={() => toggleSeverity(sev)}
            >
              <SeverityBadge severity={sev} />
            </button>
          ))}
        </div>
      </div>

      {/* Source Services */}
      <div className="space-y-3">
        <Label>Source services</Label>
        <div className="flex flex-col gap-2">
          <Input 
            placeholder="Type a service name and press Enter" 
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            onKeyDown={addService}
          />
          {value.source_services.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {value.source_services.map(svc => (
                <Badge key={svc} variant="secondary" className="pl-2 pr-1 py-1 gap-1 normal-case tracking-normal">
                  {svc}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-4 w-4 rounded-full"
                    onClick={() => removeService(svc)}
                    aria-label={`Remove ${svc}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
