import { useActionState } from 'react';
import {
  AuthButton,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthNote,
  AuthTextButton,
  CodeInput,
} from '@/shared/ui/pulse';

export const BACKUP_CODE_LENGTH = 20;

/**
 * The backup-code challenge body, shared by the in-page sign-in flow and the
 * standalone /auth/login/backup-code route. Callers own the footer action.
 */
export function BackupCodeChallenge({
  challengeId,
  loginBackupCode,
  isPending,
}: {
  challengeId: string;
  loginBackupCode: (data: { code: string; challenge_id: string }) => void;
  isPending: boolean;
}) {
  const [codeError, submitCode] = useActionState<string | null, FormData>((_previous, formData) => {
    const code = String(formData.get('code') ?? '').toLowerCase();
    if (code.length !== BACKUP_CODE_LENGTH) return `Backup codes are ${BACKUP_CODE_LENGTH} characters long.`;
    loginBackupCode({ code, challenge_id: challengeId });
    return null;
  }, null);

  return (
    <>
      <AuthHeading
        title="Use a backup code"
        description="Enter one of the recovery codes you saved when you turned on two-step verification."
      />

      <form action={submitCode} className="flex flex-col gap-4">
        <AuthField
          label="Backup code"
          hint={`${BACKUP_CODE_LENGTH} characters. Spaces are ignored.`}
          error={codeError ?? undefined}
        >
          <CodeInput
            name="code"
            length={BACKUP_CODE_LENGTH}
            inputMode="text"
            autoFocus
            disabled={isPending}
            className="h-12 text-[15px] tracking-[0.18em] placeholder:tracking-[0.18em]"
          />
        </AuthField>

        <AuthButton type="submit" pending={isPending}>
          Verify and sign in
        </AuthButton>
      </form>

      <AuthNote className="mt-4">
        Each code works once. Generate a fresh set from security settings after you sign in.
      </AuthNote>
    </>
  );
}

interface LoginBackupCodeFormProps {
  challengeId: string;
  loginBackupCode: (data: { code: string; challenge_id: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function LoginBackupCodeForm({ challengeId, loginBackupCode, isPending, onCancel }: LoginBackupCodeFormProps) {
  return (
    <div className="w-full">
      <BackupCodeChallenge challengeId={challengeId} loginBackupCode={loginBackupCode} isPending={isPending} />
      <AuthFooter>
        <AuthTextButton onClick={onCancel}>Use another verification method</AuthTextButton>
      </AuthFooter>
    </div>
  );
}
