import type React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/shared/observe";
import { displayValue } from "./helpers";

export function SectionShell({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-36 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          {description && <p className="mt-1 text-[12px] text-[var(--text3)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function KeyValueGrid({
  items,
  columns = 2,
}: {
  items: { label: string; value: string | number | boolean | null | undefined; mono?: boolean; copyable?: boolean }[];
  columns?: 2 | 3;
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-5", columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((item) => {
        const text = displayValue(item.value);
        return (
          <div key={item.label} className="min-w-0">
            <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text3)]">
              {item.label}
            </dt>
            <dd className="mt-1.5 flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "min-w-0 truncate text-[13px] text-[var(--text)]",
                  item.mono && "font-[family-name:var(--mono)] text-[12px] tabular-nums",
                )}
                title={text === "—" ? undefined : text}
              >
                {text}
              </span>
              {item.copyable && text !== "—" && (
                <CopyButton value={text} label="" className="h-7 border-0 px-1.5" />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function EmptyInline({ message }: { message: string }) {
  return <p className="text-[13px] text-[var(--text3)]">{message}</p>;
}


