import React from "react";
import { EmptyNote, KeyValueList, Panel } from "@/shared/observe";

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
  items: { label: string; value: string | number | null | undefined; mono?: boolean; copyable?: boolean }[];
  columns?: 2 | 3;
}) {
  return (
    <KeyValueList
      columns={columns}
      items={items.map((item) => ({
        label: item.label,
        value: item.value !== null && item.value !== undefined && item.value !== "" ? String(item.value) : null,
        mono: item.mono,
        copyable: item.copyable,
      }))}
    />
  );
}

export function EmptyInline({ message }: { message: string }) {
  return <EmptyNote>{message}</EmptyNote>;
}
