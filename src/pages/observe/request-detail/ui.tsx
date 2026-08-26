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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] text-[var(--text3)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
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
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
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

export function CollapsibleBlock({
  title,
  children,
  defaultOpen = false,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-3">
        <div className="text-[13px] font-medium text-[var(--text2)]">{title}</div>
        <p className="mt-1 text-[12px] text-[var(--text3)]">Not captured for this request.</p>
      </div>
    );
  }

  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">
        <span>{title}</span>
        <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)] group-open:hidden">
          Expand
        </span>
        <span className="hidden font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)] group-open:inline">
          Collapse
        </span>
      </summary>
      <div className="border-t border-[var(--border)] p-3">{children}</div>
    </details>
  );
}
