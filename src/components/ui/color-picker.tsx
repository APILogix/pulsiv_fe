import * as React from "react";
import { cn } from "@/shared/utils/cn";

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", 
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#64748b", "#71717a", "#737373"
];

export interface ColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [selected, setSelected] = React.useState<string>(value || COLORS[0]);

  const handleSelect = (color: string) => {
    setSelected(color);
    onChange?.(color);
  };

  return (
    <div className={cn("grid grid-cols-10 gap-2", className)}>
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => handleSelect(color)}
          className={cn(
            "h-6 w-6 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            selected === color ? "ring-2 ring-primary ring-offset-2" : ""
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}
