# Auth surface

Mode: Operate. The visitor wants to get in (or back in) and nothing else. The
sign-in page (`LoginPage.tsx`) is the reference; every other auth page follows it.

## Layout: `src/app/layouts/AuthLayout.tsx`

- Two columns at `lg` and up: the instrument panel on the left (`minmax(0,1.15fr)`), the form column on the right (`minmax(460px,1fr)`). Below `lg` the panel is hidden and the wordmark sits top-left.
- The panel shows what Sentinel does instead of describing it: one p99 latency trace, a dashed 400ms budget, one crossing, one "alert opened" marker. It is labelled "Illustrative" and never shows real telemetry.
- The form column is bare: content max width 400px, vertically centred, no card around it.
- Lazy pages load inside the shell (`Suspense` around `Outlet`) with `AuthCardSkeleton`, which mirrors the bare column. The panel never flashes away.
- Motion: the trace draws once and the marker lands (`auth-trace-line`, `auth-trace-mark`). That is the only authored motion. The column uses `pulse-rise`. Both switch off under `prefers-reduced-motion`.
- Browser surfaces are themed on the root: caret and selection use `--text`/`--bg`, and the scrollbar is hidden.

### Routes that use the shell

| Guard | Routes |
|---|---|
| `RequireGuest` | `/auth/login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `login/mfa`, `login/backup-code`, `login/sso`, `unlock`, `unlock/confirm` |
| None (signed-in or signed-out) | `/auth/callback`, `/account/delete/confirm`, `/accept-invite` |

`/auth/step-up` renders inside the app shell because the user is already signed in. It uses the same primitives in a 400px column so a second-factor prompt looks the same everywhere.

## Page anatomy

Every page follows this order and skips what it doesn't need:

1. `AuthHeading`: title (28px, semibold, -0.03em, balanced) and one supporting line (14px, `--text2`). The cross-link ("New here? Create an account") goes in the supporting line.
2. `AuthFact`: the one value the user must recognise (the address a link went to, the factor in use), with an optional "Change" action.
3. The form: fields stacked with 16px gaps, then one full-width primary action.
4. `AuthCallout`: only when the information changes what the user does next.
5. `AuthNote`: quiet secondary guidance (expiry, spam folder).
6. `AuthFooter`: the escape route ("Back to sign in"), left-aligned, 32px above.

Status pages (verified, unlocked, scheduled, failed) use the same anatomy. The title states the outcome and the next step is a button. There is no centred icon-and-title result template.

## Primitives: `src/shared/ui/pulse/auth.tsx`

| Primitive | Use |
|---|---|
| `AuthHeading` | Title and supporting line. It has no eyebrow, icon, or centring props. |
| `AuthField` | Label (13px, `--text2`), optional trailing action, hint, and `role="alert"` error. |
| `fieldInputClass` + `h-11 text-[14px]` | Every text input. `PasswordInput` and `CodeInput` for passwords and codes. |
| `AuthButton` / `AuthSubmit` | 44px full-width action. `primary` is `--brand`, `ghost` is a hairline, `danger` is red. |
| `AuthLinkButton` | Same geometry for actions that navigate. |
| `AuthTextButton` / `AuthLink` | Underlined inline actions (`--border2` underline, `--text` on hover). |
| `AuthFact` | Label over value, closed by a hairline. |
| `AuthCallout` | The only boxed element. Tones: `neutral`, `success`, `warning`, `danger`. Tone shows on the icon and hairline only; the body stays neutral. |
| `AuthPending` | Spinner and a sentence, `role="status"`. |
| `AuthNote` | 12px `--text3` guidance. |
| `AuthDivider` | Hairline with "or" between the form and the providers. |
| `AuthFooter` | Escape route. |

`AuthCard` and `AuthResult` still exist for the billing and Slack result pages. Auth pages don't use them.

Auth-specific components in `src/modules/auth/components/`:

- `MfaMethods.tsx`: method copy, the `ActiveMethodFact` "Verifying with" row, and `MethodList` (one hairline-divided list of alternative factors). The MFA form, the MFA route, and step-up all use it.
- `LoginBackupCodeForm.tsx` exports `BackupCodeChallenge`, which both backup-code entry points share.
- `PasswordRequirements.tsx`: a live checklist that mirrors `StrongPasswordSchema` rule for rule. It replaces the strength meter because a meter can say "Strong" for a password the server will reject.
- `SocialProviders.tsx`: only Google and GitHub, matching the backend.

## Per-page rules

- Register: form first, then "or", then social sign-up, matching sign-in order. There is one terms checkbox with underlined legal links and an error that names the fix.
- Forgot password and unlock: the submitted state shows "Sent to" with a "Change" action that goes back to the form. The response is the same whether or not the account exists.
- Reset password: new password with the live requirement list, then confirm, then "Update password". If the link has expired, the note links to a new request.
- Verify email: three states (verifying, sent, verified). Resend is a ghost button. It is disabled when the page has no address, and the note says why.
- Second factor: "Two-step verification", then the "Verifying with" fact, then the code, then "Verify and sign in". Resend is the field's trailing action. Alternatives stay behind "Try another way" and open as one list. Security keys start automatically when they are the primary factor.
- SSO: a single email field. Discovered providers show as a hairline list with the domain in mono. If no provider exists, a danger callout gives the recovery path.
- Callback: shows only true progress ("Confirming your session…"). After 7 seconds a "Try again" action appears. Provider errors can't be retried in place, so the primary action becomes "Back to sign in".
- Invite: "Join {org}", then the invited address and role as facts, then one action (accept, sign in, or create an account). Decline is a footer text action, and its errors are shown.
- Deletion confirm: the outcome and date in the heading line, a warning callout explaining how to cancel, and "Back to sign in".

## Copy

- Buttons name the action: "Send reset link", "Update password", "Verify and sign in". Avoid "Submit" and "Continue" when a more specific label exists.
- Errors say what went wrong and how to recover. They don't blame the user or show codes.
- Every claim must be true of the system. Don't invent protocol names, cipher suites, or stages.

## Refuse

- Eyebrows or kickers above headings.
- Icon chips as page decoration, and centred icon-plus-title result screens.
- A card around the form, or nested cards and boxes inside it.
- Coloured notice boxes for routine guidance. Use `AuthNote`.
- Uppercase letter-spaced micro-labels ("SENT TO"). Use `AuthFact`.
- Monospace on email inputs or prose. Mono is only for codes, domains, and identifiers.
- Colour pills for factor types, glows, gradient hairlines, aurora or grid backdrops, scan bars, and fake progress stages.
- Brand-coloured links. Links are `--text` with an underline.
