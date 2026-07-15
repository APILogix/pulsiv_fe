import { CopyButton } from "./primitives";

// Read-only collapsible-ish JSON view. Pretty-prints with mono font.
export function JsonViewer({ data, maxHeight = 420 }: { data: unknown; maxHeight?: number }) {
  const json = JSON.stringify(data, jsonReplacer, 2);
  return (
    <div className="relative rounded-[10px] border border-[var(--border)] bg-[var(--bg)]">
      <div className="absolute right-3 top-3 z-10">
        <CopyButton value={json} />
      </div>
      <pre
        className="sidebar-scroll overflow-auto p-4 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)]"
        style={{ maxHeight }}
      >
        <code>{json}</code>
      </pre>
    </div>
  );
}

function jsonReplacer(_key: string, value: unknown) {
  if (value instanceof Set) return Array.from(value);
  return value;
}
