import React, { useState } from "react";
import { Plus, Trash2, Code } from "lucide-react";

interface ExpressionCondition {
  id: string;
  metric: string;
  operator: string;
  value: string;
  unit: string;
}

interface ExpressionBuilderProps {
  initialExpression?: string;
  onChange?: (expression: string) => void;
  readOnly?: boolean;
}

const metricsList = [
  { value: "requests.error_rate", label: "Error Rate (%)", unit: "%" },
  { value: "latency.p95", label: "P95 Latency (ms)", unit: "ms" },
  { value: "latency.p99", label: "P99 Latency (ms)", unit: "ms" },
  { value: "system.cpu.pct", label: "CPU Usage (%)", unit: "%" },
  { value: "system.memory.pct", label: "Memory Usage (%)", unit: "%" },
  { value: "crons.failures", label: "Cron Failure Count", unit: "count" },
  { value: "slo.burn_rate", label: "SLO Burn Rate", unit: "ratio" },
];

const operators = [
  { value: ">", label: "> Greater than" },
  { value: ">=", label: ">= Greater or equal" },
  { value: "<", label: "< Less than" },
  { value: "<=", label: "<= Less or equal" },
  { value: "==", label: "== Equals" },
];

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  initialExpression = "(requests.error_rate > 5%) AND (latency.p95 > 250ms) FOR 10m",
  onChange,
  readOnly = false,
}) => {
  void initialExpression;
  const [logicGate, setLogicGate] = useState<"AND" | "OR">("AND");
  const [windowMinutes, setWindowMinutes] = useState<number>(10);
  const [conditions, setConditions] = useState<ExpressionCondition[]>([
    { id: "1", metric: "requests.error_rate", operator: ">", value: "5", unit: "%" },
    { id: "2", metric: "latency.p95", operator: ">", value: "250", unit: "ms" },
  ]);

  const addCondition = () => {
    const newCond: ExpressionCondition = {
      id: Date.now().toString(),
      metric: "requests.error_rate",
      operator: ">",
      value: "10",
      unit: "%",
    };
    const updated = [...conditions, newCond];
    setConditions(updated);
    emitChange(updated, logicGate, windowMinutes);
  };

  const removeCondition = (id: string) => {
    if (conditions.length <= 1) return;
    const updated = conditions.filter((c) => c.id !== id);
    setConditions(updated);
    emitChange(updated, logicGate, windowMinutes);
  };

  const updateCondition = (id: string, key: keyof ExpressionCondition, val: string) => {
    const updated = conditions.map((c) => {
      if (c.id !== id) return c;
      if (key === "metric") {
        const found = metricsList.find((m) => m.value === val);
        return { ...c, metric: val, unit: found?.unit || "" };
      }
      return { ...c, [key]: val };
    });
    setConditions(updated);
    emitChange(updated, logicGate, windowMinutes);
  };

  const emitChange = (conds: ExpressionCondition[], gate: string, win: number) => {
    const exprString = conds
      .map((c) => `(${c.metric} ${c.operator} ${c.value}${c.unit})`)
      .join(` ${gate} `) + ` FOR ${win}m`;
    if (onChange) onChange(exprString);
  };

  const compiledExpression = conditions
    .map((c) => `(${c.metric} ${c.operator} ${c.value}${c.unit})`)
    .join(` ${logicGate} `) + ` FOR ${windowMinutes}m`;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Rule Expression Builder</h4>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Logic:</span>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const next = logicGate === "AND" ? "OR" : "AND";
              setLogicGate(next);
              emitChange(conditions, next, windowMinutes);
            }}
            className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/20 transition-colors"
          >
            {logicGate}
          </button>
        </div>
      </div>

      {/* Conditions list */}
      <div className="space-y-2">
        {conditions.map((cond, idx) => (
          <React.Fragment key={cond.id}>
            {idx > 0 && (
              <div className="flex items-center justify-center my-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                  {logicGate}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
              <select
                disabled={readOnly}
                value={cond.metric}
                onChange={(e) => updateCondition(cond.id, "metric", e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {metricsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                disabled={readOnly}
                value={cond.operator}
                onChange={(e) => updateCondition(cond.id, "operator", e.target.value)}
                className="w-36 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {operators.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <div className="relative w-28 flex items-center">
                <input
                  type="text"
                  disabled={readOnly}
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-2.5 pr-7 py-1.5 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-2 text-[10px] text-muted-foreground font-mono">
                  {cond.unit}
                </span>
              </div>

              {!readOnly && conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Condition
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Evaluation Window:</span>
            <input
              type="number"
              value={windowMinutes}
              onChange={(e) => {
                const w = parseInt(e.target.value) || 1;
                setWindowMinutes(w);
                emitChange(conditions, logicGate, w);
              }}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 font-mono text-center text-foreground"
            />
            <span className="text-muted-foreground">minutes</span>
          </div>
        </div>
      )}

      {/* Expression Compiled Preview */}
      <div className="p-3 rounded-lg bg-black/40 border border-border/40 font-mono text-xs text-emerald-400 flex items-center justify-between">
        <span className="truncate">{compiledExpression}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest pl-2">DSL</span>
      </div>
    </div>
  );
};
