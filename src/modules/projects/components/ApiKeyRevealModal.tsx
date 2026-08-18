import { useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Terminal,
  Code2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RevealedSecret {
  value: string;
  label?: string;
  keyName?: string;
  publicKey?: string;
  environmentName?: string;
  environmentType?: string;
}

type SnippetTab = "env" | "curl" | "node" | "python";

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

  const snippets: Record<SnippetTab, { label: string; code: string; lang: string }> = {
    env: {
      label: ".env",
      lang: "bash",
      code: `PULSIV_API_KEY="${keyString}"`,
    },
    curl: {
      label: "cURL",
      lang: "bash",
      code: `curl -X POST https://api.pulsiv.io/v1/telemetry \\
  -H "Authorization: Bearer ${keyString}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"app.started"}'`,
    },
    node: {
      label: "Node.js",
      lang: "typescript",
      code: `import { PulsivClient } from "@pulsiv/sdk";

const client = new PulsivClient({
  apiKey: "${keyString}",
});`,
    },
    python: {
      label: "Python",
      lang: "python",
      code: `from pulsiv import PulsivClient

client = PulsivClient(
    api_key="${keyString}"
)`,
    },
  };

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(snippets[activeTab].code).then(() => {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    });
  };

  return (
    <Dialog open={Boolean(revealed)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={true}
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[620px] p-0 overflow-hidden border border-[var(--border2)] bg-[var(--bg1)] shadow-[var(--shadow-modal)] rounded-[var(--radius-lg)]"
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)]">
              <KeyRound className="size-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text)]">
                API Key Generated
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[9.5px] font-medium uppercase tracking-[0.06em]",
                  isProduction
                    ? "bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)]/30"
                    : "bg-[var(--blue-bg)] text-[var(--blue)] border border-[var(--blue)]/30"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full animate-pulse",
                    isProduction ? "bg-[var(--amber)]" : "bg-[var(--blue)]"
                  )}
                />
                {isProduction ? "Production" : "Non-Prod"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Title and Description */}
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text)]">
              Copy your secret key now
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[var(--text2)]">
              This secret is shown only once and cannot be retrieved later. Store it securely in your secret manager or environment configuration.
            </DialogDescription>
          </DialogHeader>

          {/* Modern Mono Warning Banner */}
          <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--amber)]/25 bg-[var(--amber-bg)] px-3.5 py-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--amber)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--amber)]">
                  SHOWN_ONCE
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--text2)]">
                Pulsiv never stores plaintext secrets. If you lose this key, you must generate or rotate to a new one.
              </p>
            </div>
          </div>

          {/* Hero Monospace Key Box */}
          <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg)] shadow-inner">
            {/* Box Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)]/50 px-3.5 py-2 text-[10.5px]">
              <div className="flex items-center gap-2 font-[family-name:var(--mono)] text-[var(--text3)]">
                <Terminal className="size-3 text-[var(--text3)]" />
                <span className="uppercase tracking-[0.08em]">
                  {revealed.label || revealed.keyName || "SECRET CREDENTIAL"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">
                <span className="hidden sm:inline">256-bit token</span>
                <span>•</span>
                <span className="tabular-nums">{keyString.length} chars</span>
              </div>
            </div>

            {/* Key Content Area */}
            <div className="relative p-3.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="select-all break-all font-[family-name:var(--mono)] text-[12.5px] leading-relaxed tracking-tight"
                    title={keyString}
                  >
                    {isMasked ? (
                      <span className="text-[var(--text3)]">
                        <span className="font-semibold text-[var(--brand)]">{prefix}</span>
                        {"•".repeat(Math.min(48, keyBody.length))}
                      </span>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "font-semibold",
                            isProduction ? "text-[var(--amber)]" : "text-[var(--blue)]"
                          )}
                        >
                          {prefix}
                        </span>
                        <span className="text-[var(--text)]">{keyBody}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mask / Unmask Toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsMasked((prev) => !prev)}
                  title={isMasked ? "Reveal key" : "Mask key for screen share"}
                  aria-label={isMasked ? "Reveal key" : "Mask key"}
                  className="shrink-0 text-[var(--text3)] hover:text-[var(--text)]"
                >
                  {isMasked ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </Button>
              </div>

              {/* Large Primary Copy Button inside Hero Box */}
              <div className="mt-3.5 pt-3 border-t border-[var(--border)]/70 flex items-center justify-between gap-3">
                <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text3)] tracking-wide">
                  CLICK TO COPY KEY
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyKey}
                  className={cn(
                    "font-[family-name:var(--mono)] text-[11.5px] transition-all gap-1.5 px-3.5",
                    copiedKey
                      ? "bg-[var(--green)] text-black hover:bg-[var(--green-d)]"
                      : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]"
                  )}
                >
                  {copiedKey ? (
                    <>
                      <Check className="size-3.5" />
                      <span>COPIED TO CLIPBOARD</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>COPY KEY</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Integration Snippets */}
          <div className="flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/30 overflow-hidden">
            {/* Snippet Header & Tabs */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)]/60 px-3 py-1.5">
              <div className="flex items-center gap-1">
                <Code2 className="mr-1 size-3 text-[var(--text3)]" />
                {(["env", "curl", "node", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-medium transition-colors",
                      activeTab === tab
                        ? "bg-[var(--bg1)] text-[var(--text)] border border-[var(--border2)]"
                        : "text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
                    )}
                  >
                    {snippets[tab].label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="flex items-center gap-1 rounded px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text2)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="size-3 text-[var(--green)]" />
                    <span className="text-[var(--green)]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy snippet</span>
                  </>
                )}
              </button>
            </div>

            {/* Snippet Code View */}
            <div className="p-3 bg-[var(--bg)] overflow-x-auto">
              <pre className="font-[family-name:var(--mono)] text-[11px] leading-relaxed text-[var(--text2)] break-all whitespace-pre-wrap">
                <code>{snippets[activeTab].code}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg2)]/50 px-5 py-3.5">
          <span className="hidden sm:inline font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
            Store key before dismissing
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="font-[family-name:var(--mono)] text-[11.5px]"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="font-[family-name:var(--mono)] text-[11.5px] bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]"
            >
              I've stored this key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
