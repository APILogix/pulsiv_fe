import { useId, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Eye, EyeOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Notice, Pill } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

import { PageTabs, pageTabPanelProps, type PageTab } from "./project-page";

export interface RevealedSecret {
  value: string;
  label?: string;
  keyName?: string;
  publicKey?: string;
  environmentName?: string;
  environmentType?: string;
}

type SnippetTab = "env" | "curl" | "node" | "python";

// ── module-level constants (rules.md §1.2) ───────────────────

const SNIPPET_TABS: PageTab<SnippetTab>[] = [
  { value: "env", label: ".env" },
  { value: "curl", label: "cURL" },
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
];

interface SecretFact {
  label: string;
  value: string;
  mono?: boolean;
}

/**
 * One-time secret reveal. The plaintext exists only in this dialog's props,
 * so the copy controls and the snippets are the only way out of it.
 */
export function ApiKeyRevealModal({
  revealed,
  onClose,
}: {
  revealed: RevealedSecret | null;
  onClose: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isMasked, setIsMasked] = useState(false);
  const [activeTab, setActiveTab] = useState<SnippetTab>("env");
  const copyKeyRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();

  if (!revealed) return null;

  const keyString = revealed.value;
  const isProduction =
    revealed.environmentType === "production" ||
    revealed.environmentName?.toLowerCase() === "production" ||
    keyString.startsWith("pv_live_");

  const prefix = keyString.startsWith("pv_live_")
    ? "pv_live_"
    : keyString.startsWith("pv_test_")
    ? "pv_test_"
    : keyString.split("_").slice(0, 2).join("_") + "_";

  const keyBody = keyString.startsWith(prefix) ? keyString.slice(prefix.length) : keyString;

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(keyString).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  const snippets: Record<SnippetTab, string> = {
    env: `PULSIV_API_KEY="${keyString}"`,
    curl: `curl -X POST https://api.pulsiv.io/v1/telemetry \\
  -H "Authorization: Bearer ${keyString}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"app.started"}'`,
    node: `import { PulsivClient } from "@pulsiv/sdk";

const client = new PulsivClient({
  apiKey: "${keyString}",
});`,
    python: `from pulsiv import PulsivClient

client = PulsivClient(
    api_key="${keyString}"
)`,
  };

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(snippets[activeTab]).then(() => {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    });
  };

  // `label` falls back to the public key for unnamed keys, so only show it
  // when it adds something the public key line does not.
  const keyTitle = revealed.keyName || (revealed.label !== revealed.publicKey ? revealed.label : undefined);
  const facts = [
    keyTitle ? { label: "Key", value: keyTitle } : null,
    revealed.environmentName ? { label: "Environment", value: revealed.environmentName } : null,
    revealed.publicKey ? { label: "Public key", value: revealed.publicKey, mono: true } : null,
  ].filter((fact): fact is SecretFact => fact !== null);

  const secretHeadingId = `${baseId}-secret`;
  const snippetTabsId = `${baseId}-snippets`;

  return (
    <Dialog open={Boolean(revealed)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={true}
        onOpenAutoFocus={(event) => {
          // Land on the one action this dialog exists for.
          event.preventDefault();
          copyKeyRef.current?.focus();
        }}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[620px]"
      >
        <DialogHeader className="gap-2 border-b border-[var(--border)] px-5 pb-4 pr-12 pt-5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-[16px] leading-[1.3] tracking-[-0.01em]">Copy your secret key now</DialogTitle>
            <Pill tone="neutral">{isProduction ? "Production" : "Non-production"}</Pill>
          </div>
          <DialogDescription>
            Store it in your secret manager or environment configuration before you close this dialog.
          </DialogDescription>
          {facts.length > 0 && (
            <dl className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
              {facts.map((fact) => (
                <div key={fact.label} className="flex min-w-0 items-center gap-1.5">
                  <dt className="shrink-0 text-[var(--text3)]">{fact.label}</dt>
                  <dd
                    className={cn(
                      "min-w-0 truncate text-[var(--text2)]",
                      fact.mono && "font-[family-name:var(--mono)] text-[11.5px]",
                    )}
                    title={fact.value}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogHeader>

        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <Notice tone="amber" icon={AlertTriangle} title="This secret won't be shown again">
            Pulsiv never stores plaintext secrets. If you lose this one, rotate or regenerate the key to get a new secret.
          </Notice>

          <section aria-labelledby={secretHeadingId} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id={secretHeadingId} className="text-[13px] font-medium text-[var(--text2)]">
                Secret key
              </h3>
              <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
                256-bit token · {keyString.length} characters
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg)] py-2 pl-3.5 pr-2">
              <code
                className="min-w-0 flex-1 select-all break-all py-1 font-[family-name:var(--mono)] text-[12.5px] leading-[1.6]"
                title={isMasked ? undefined : keyString}
              >
                <span className="text-[var(--text2)]">{prefix}</span>
                {isMasked ? (
                  <span className="text-[var(--text3)]">{"•".repeat(Math.min(48, keyBody.length))}</span>
                ) : (
                  <span className="text-[var(--text)]">{keyBody}</span>
                )}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMasked((prev) => !prev)}
                title={isMasked ? "Reveal key" : "Mask key for screen sharing"}
                aria-label={isMasked ? "Reveal key" : "Mask key"}
                className="shrink-0"
              >
                {isMasked ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button ref={copyKeyRef} type="button" size="lg" onClick={handleCopyKey}>
                {copiedKey ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copiedKey ? "Copied" : "Copy key"}
              </Button>
            </div>
          </section>

          <section
            aria-label="Integration snippets"
            className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
          >
            <PageTabs
              tabs={SNIPPET_TABS}
              value={activeTab}
              onChange={setActiveTab}
              label="Snippet format"
              idBase={snippetTabsId}
              className="px-4"
              trailing={
                <Button type="button" variant="ghost" size="sm" onClick={handleCopySnippet}>
                  {copiedSnippet ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                  {copiedSnippet ? "Copied" : "Copy snippet"}
                </Button>
              }
            />
            <div
              {...pageTabPanelProps(snippetTabsId, activeTab)}
              tabIndex={0}
              className="sidebar-scroll overflow-x-auto bg-[var(--bg)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border2)]"
            >
              <pre className="whitespace-pre-wrap break-all font-[family-name:var(--mono)] text-[12px] leading-[1.65] text-[var(--text2)]">
                <code>{snippets[activeTab]}</code>
              </pre>
            </div>
          </section>

          <p role="status" className="sr-only">
            {copiedKey ? "Secret key copied to the clipboard." : copiedSnippet ? "Snippet copied to the clipboard." : ""}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--bg2)]/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            I've stored this key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
