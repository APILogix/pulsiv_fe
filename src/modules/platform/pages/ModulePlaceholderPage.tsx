import { useLocation } from "react-router";
import { Construction } from "lucide-react";
import { findMainNavItem } from "@/app/navigation/navigation";

function formatLabel(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ModulePlaceholderPage() {
  const location = useLocation();
  const module = findMainNavItem(location.pathname);
  const pagePath = location.pathname.split("/").filter(Boolean).slice(1).join("/");
  const pageLabel = pagePath ? formatLabel(pagePath) : module?.label ?? "Workspace";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">{pageLabel}</h1>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-8 flex flex-col items-center justify-center gap-4 min-h-[340px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-[var(--brand-bg)]">
          <Construction className="size-8 text-[var(--brand)]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text)]">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
