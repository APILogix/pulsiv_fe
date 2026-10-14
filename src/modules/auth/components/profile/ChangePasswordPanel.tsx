import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

import { changePasswordSchema, type ChangePasswordFormData } from '../../schemas/auth.schema';
import { useChangePassword } from '../../hooks/useChangePassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Requirement {
  label: string;
  test: (val: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: 'At least 8 characters long', test: (v) => v.length >= 8 },
  { label: 'At least one uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'At least one lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'At least one number or symbol (0-9, !@#$...)', test: (v) => /[\d\W_]/.test(v) },
];

export function ChangePasswordPanel() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  });

  const { mutate: changePassword, isPending } = useChangePassword();

  const newPassword = watch('new_password') || '';
  const confirmPassword = watch('confirm_new_password') || '';

  const requirementsMet = useMemo(() => {
    return REQUIREMENTS.map((r) => ({
      label: r.label,
      met: r.test(newPassword),
    }));
  }, [newPassword]);

  const score = requirementsMet.filter((r) => r.met).length;

  const strengthMeta = useMemo(() => {
    if (!newPassword) return { label: 'Empty', color: 'bg-[var(--border2)]', width: '0%' };
    if (score <= 1) return { label: 'Very Weak', color: 'bg-[var(--red)]', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'bg-[var(--amber)]', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'bg-[var(--blue)]', width: '75%' };
    return { label: 'Strong', color: 'bg-[var(--green)]', width: '100%' };
  }, [newPassword, score]);

  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const passwordsMismatch = Boolean(confirmPassword && newPassword !== confirmPassword);

  const onSubmit = (data: ChangePasswordFormData) => {
    changePassword(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]">
          Password & Authentication
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text2)]">
          Update your password credentials and ensure high entropy protection across all devices.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
        {/* Main Password Form */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-xs">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              Change Account Password
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text3)]">
              You must provide your current password to authorize this credential change.
            </p>
          </div>

          <form id="password-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5 sm:p-6">
            {/* Current Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="current-password" className="text-[13px] font-medium text-[var(--text)]">
                  Current Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-[var(--text3)] hover:text-[var(--text)]"
                >
                  Forgot current password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  {...register('current_password')}
                  className="h-10 border-[var(--border2)] bg-[var(--bg2)] pr-10 text-[14px] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-[12px] font-medium text-[var(--red)]">{errors.current_password.message}</p>
              )}
            </div>

            <div className="h-px bg-[var(--border)] my-4" />

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-[13px] font-medium text-[var(--text)]">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  {...register('new_password')}
                  className="h-10 border-[var(--border2)] bg-[var(--bg2)] pr-10 text-[14px] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-[12px] font-medium text-[var(--red)]">{errors.new_password.message}</p>
              )}

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text3)]">Password Strength:</span>
                    <span className="font-mono font-medium text-[var(--text)]">{strengthMeta.label}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div
                      className={`h-full transition-all duration-300 ${strengthMeta.color}`}
                      style={{ width: strengthMeta.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-new-password" className="text-[13px] font-medium text-[var(--text)]">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  {...register('confirm_new_password')}
                  className="h-10 border-[var(--border2)] bg-[var(--bg2)] pr-10 text-[14px] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {passwordsMatch && (
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--green)]">
                  <CheckCircle2 className="size-3.5" />
                  Passwords match
                </div>
              )}
              {passwordsMismatch && (
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--amber)]">
                  <X className="size-3.5" />
                  Passwords do not match yet
                </div>
              )}
              {errors.confirm_new_password && (
                <p className="text-[12px] font-medium text-[var(--red)]">{errors.confirm_new_password.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={isPending || score < 3}
                className="bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Updating password…' : 'Change password'}
              </Button>
            </div>
          </form>
        </section>

        {/* Requirements & Best Practice Checklist Sidebar */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <ShieldCheck className="size-4 text-[var(--green)]" />
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Password Requirements
              </h3>
            </div>
            <ul className="mt-4 space-y-2.5">
              {requirementsMet.map((req, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px]">
                  <span
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                      req.met
                        ? 'bg-[var(--green-bg)] text-[var(--green)]'
                        : 'bg-[var(--bg3)] text-[var(--text3)]'
                    }`}
                  >
                    {req.met ? <Check className="size-2.5 stroke-[3]" /> : <span className="size-1 rounded-full bg-[var(--text3)]" />}
                  </span>
                  <span className={req.met ? 'font-medium text-[var(--text)]' : 'text-[var(--text3)]'}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-[var(--text3)]" />
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Security Recommendations
              </h3>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text3)]">
              Use a password manager such as 1Password, Bitwarden, or Apple Keychain to generate unique, high-entropy passphrases. Avoid reusing passwords across SaaS platforms.
            </p>
            <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 p-3 text-[11px] text-[var(--text3)]">
              Changing your password will maintain your current browser session while keeping you protected from unauthorized access.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

