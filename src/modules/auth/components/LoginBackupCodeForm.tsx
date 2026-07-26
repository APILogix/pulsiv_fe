import { useActionState } from 'react';
import { LifeBuoy, ShieldCheck } from 'lucide-react';
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthFooter,
  AuthHeading,
  CodeInput,
  IconChip,
  Notice,
  Pill,
} from '@/shared/ui/pulse';

const CODE_LENGTH = 20;

interface LoginBackupCodeFormProps {
  challengeId: string;
  loginBackupCode: (data: { code: string; challenge_id: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function LoginBackupCodeForm({ challengeId, loginBackupCode, isPending, onCancel }: LoginBackupCodeFormProps) {
  const [codeError, submitCode] = useActionState<string | null, FormData>((_previous, formData) => {
    const code = String(formData.get('code') ?? '').toLowerCase();
    if (code.length !== CODE_LENGTH) return `Backup codes are ${CODE_LENGTH} characters long.`;
    loginBackupCode({ code, challenge_id: challengeId });
    return null;
  }, null);

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Security check"
        icon={LifeBuoy}
        tone="amber"
        title="Use a backup code"
        description="Enter one of the recovery codes you saved when you set up two-factor authentication."
      />

      <AuthCard>
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
          <IconChip icon={ShieldCheck} tone="amber" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--text)]">Recovery factor</p>
            <p className="text-[12px] text-[var(--text3)]">Single-use code, {CODE_LENGTH} characters</p>
          </div>
          <Pill tone="amber">Backup code</Pill>
        </div>

        <form action={submitCode} className="mt-5 flex flex-col gap-4">
          <AuthField label="Backup code" error={codeError ?? undefined}>
            <CodeInput
              name="code"
              length={CODE_LENGTH}
              inputMode="text"
              autoFocus
              disabled={isPending}
              className="text-[15px] tracking-[0.22em]"
            />
          </AuthField>

          <AuthButton type="submit" pending={isPending}>
            Verify backup code
          </AuthButton>
        </form>

        <Notice tone="amber" className="mt-4">
          Each code works once. Generate a new set from security settings after you sign in.
        </Notice>
      </AuthCard>

      <AuthFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Use another verification method
        </button>
      </AuthFooter>
    </div>
  );
}
