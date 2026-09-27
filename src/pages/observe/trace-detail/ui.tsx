import React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/shared/observe";

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
      className={cn(
        "scroll-mt-36 rounded-2xl border border-[var(--border)] bg-[var(--bg1)] shadow-xs transition-shadow",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          {description && <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text3)]">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="p-7">{children}</div>
    </section>
  );
}

export function KeyValueGrid({
  items,
  columns = 2,
}: {
  items: { label: string; value: string | number | null | undefined; mono?: boolean; copyable?: boolean }[];
  columns?: 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-5",
        columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {items.map((item) => {
        const text = item.value !== null && item.value !== undefined && item.value !== "" ? String(item.value) : "—";
        return (
          <div key={item.label} className="min-w-0">
            <dt className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
              {item.label}
            </dt>
            <dd className="mt-1.5 flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "min-w-0 truncate text-[13.5px] font-medium text-[var(--text)]",
                  item.mono && "font-[family-name:var(--mono)] text-[12.5px] tabular-nums",
                  text === "—" && "text-[var(--text3)] font-normal",
                )}
                title={text === "—" ? undefined : text}
              >
                {text}
              </span>
              {item.copyable && text !== "—" && (
                <CopyButton value={text} label="" className="h-6 w-6 border-0 p-0 text-[var(--text3)] hover:text-[var(--text)]" />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function EmptyInline({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)]/50 px-5 py-6 text-center text-[13px] text-[var(--text3)]">
      {message}
    </div>
  );
}
