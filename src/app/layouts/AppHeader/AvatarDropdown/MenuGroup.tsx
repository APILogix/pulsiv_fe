import type { ReactNode } from 'react';

interface MenuGroupProps {
  label: string;
  children: ReactNode;
}

export function MenuGroup({ label, children }: MenuGroupProps) {
  const headerId = `avatar-menu-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={headerId}>
      <div
        id={headerId}
        className="px-3 mt-2 mb-1 text-[12px] font-medium uppercase tracking-[0.05em] text-[#64748b]"
      >
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}
