import type React from "react";
import { EmptyNote, KeyValueList, Panel } from "@/shared/observe";
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
    <Panel id={id} title={title} description={description} action={action} className={className}>
      {children}
    </Panel>
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
    <KeyValueList
      columns={columns}
      items={items.map((item) => {
        const text = displayValue(item.value);
        return { label: item.label, value: text === "—" ? null : text, mono: item.mono, copyable: item.copyable };
      })}
    />
  );
}

export function EmptyInline({ message }: { message: string }) {
  return <EmptyNote>{message}</EmptyNote>;
}
