import React from "react";
import { EffectivePolicy } from "../api/types";
import { CheckCircle2, Sliders, Shield, ArrowRight } from "lucide-react";

interface EffectivePolicyViewerProps {
  effectivePolicy: EffectivePolicy;
  onEditOverride?: (effectivePolicy: EffectivePolicy) => void;
}

export const EffectivePolicyViewer: React.FC<EffectivePolicyViewerProps> = ({
  effectivePolicy,
  onEditOverride,
}) => {
  const { basePolicy, overrides, isOverridden } = effectivePolicy;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-foreground">{basePolicy.name}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
              v{basePolicy.version}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{basePolicy.slug}</p>
        </div>

        <div className="flex items-center gap-2">
          {isOverridden ? (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              <Sliders className="w-3.5 h-3.5" />
              Project Overrides Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Using Org Defaults
            </span>
          )}

          {onEditOverride && (
            <button
              onClick={() => onEditOverride(effectivePolicy)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Configure Overrides
            </button>
          )}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Base Org Policy */}
        <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground font-medium pb-2 border-b border-border/40">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Organization Policy
            </span>
            <span className="text-[10px] uppercase tracking-wider">Default</span>
          </div>
          <div className="space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Threshold:</span>
              <span className="text-foreground">{JSON.stringify(basePolicy.defaultThreshold)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cooldown:</span>
              <span className="text-foreground">{basePolicy.cooldownSeconds}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Severity:</span>
              <span className="text-foreground capitalize">{basePolicy.severity}</span>
            </div>
          </div>
        </div>

        {/* Override Delta */}
        <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground font-medium pb-2 border-b border-border/40">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Project Overrides
            </span>
            <span className="text-[10px] uppercase tracking-wider">Delta</span>
          </div>
          {overrides ? (
            <div className="space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Threshold:</span>
                <span className={overrides.threshold !== undefined ? "text-amber-400 font-semibold" : "text-muted-foreground font-normal"}>
                  {typeof overrides.threshold === "object" ? JSON.stringify(overrides.threshold) : (overrides.threshold ?? "Default")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cooldown:</span>
<span className={overrides.cooldownSeconds != null ? "text-amber-400 font-semibold" : "text-muted-foreground font-normal"}>
                   {overrides.cooldownSeconds != null ? `${overrides.cooldownSeconds}s` : "Default"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Severity:</span>
                <span className={overrides.severity ? "text-amber-400 font-semibold capitalize" : "text-muted-foreground font-normal"}>
                  {overrides.severity ?? "Default"}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-center italic py-2">
              No overrides defined
            </div>
          )}
        </div>

        {/* Final Effective Output */}
        <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between text-primary font-semibold pb-2 border-b border-primary/10">
            <span className="flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              Effective Active Policy
            </span>
            <span className="text-[10px] uppercase tracking-wider">Runtime</span>
          </div>
          <div className="space-y-1 font-mono font-medium">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Threshold:</span>
              <span className="text-foreground">{effectivePolicy.effectiveThreshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cooldown:</span>
              <span className="text-foreground">{effectivePolicy.effectiveCooldown}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Severity:</span>
              <span className="text-foreground capitalize">{effectivePolicy.effectiveSeverity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
