import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ tabs, defaultTab }: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              active === t.id ? "text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]"
            )}
          >
            {t.label}
            {active === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--brand)]" />}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
