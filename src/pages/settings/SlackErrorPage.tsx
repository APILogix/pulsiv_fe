import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ShieldX, Slack } from "lucide-react";
import { AuthButton, AuthCard, AuthResult, Notice } from "@/shared/ui/pulse";
import { MonospaceText } from "@/shared/observe";

// ── module-level constants (rules.md §1.2) ──

// The OAuth return pages render inside the app shell, so the centred shell is
// sized against the viewport minus the app header and module padding.
const RESULT_SHELL =
  "relative flex min-h-[calc(100dvh-var(--header-height)-3rem)] items-center justify-center overflow-hidden rounded-[16px] bg-[var(--bg)] px-4 py-10";

const REASONS = [
  "The authorization screen was cancelled.",
  "A workspace administrator restricts app installations.",
  "The install link expired before it was approved.",
];

export default function SlackErrorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("error");

  return (
    <div className={RESULT_SHELL}>
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pulse-rise relative z-10 w-full max-w-[460px]">
        <AuthCard>
          <AuthResult
            icon={ShieldX}
            tone="red"
            title="Slack authorization failed"
            description="Slack denied the request, so no connector was created. Nothing in your organization changed."
            actions={
              <>
                <AuthButton type="button" onClick={() => navigate("/connectors/integrations")}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to integrations
                </AuthButton>
                <AuthButton type="button" variant="ghost" onClick={() => navigate("/connectors/audit")}>
                  Review delivery logs
                </AuthButton>
              </>
            }
          >
            <div className="flex flex-col gap-4 text-left">
              {reason && (
                <Notice tone="red" title="Reported reason">
                  <MonospaceText value={reason} />
                </Notice>
              )}
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Common causes</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {REASONS.map((item) => (
                    <li key={item} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text2)]">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--text3)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AuthResult>
        </AuthCard>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-[var(--text3)]">
          <Slack className="size-3.5" aria-hidden="true" />
          Slack workspace connector
        </p>
      </div>
    </div>
  );
}
