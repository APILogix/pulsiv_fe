import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Clock3,
  Globe2,
  Info,
  Lock,
  Mail,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { accountApi, type AccountProfile, type UpdateAccountProfileInput } from '../../api/account.api';
import { authQueryKeys } from '../../api/auth.query';
import { apiErrorMessage } from '@/infrastructure/api-client/api-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { colorForId, initialsForName } from './account-avatar';

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'ja-JP', label: '日本語' },
];

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
];

function toForm(profile: AccountProfile): UpdateAccountProfileInput {
  const p = (profile as any)?.data && (profile as any)?.success !== undefined ? (profile as any).data : profile;
  return {
    display_name: p?.display_name || '',
    full_name: p?.full_name || '',
    avatar_url: p?.avatar_url ?? null,
    timezone: p?.timezone || 'UTC',
    locale: p?.locale || 'en-US',
    marketing_emails: Boolean(p?.preferences?.marketing_emails),
    product_updates: p?.preferences?.product_updates ?? true,
  };
}

function ProfileSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Skeleton className="size-24 rounded-full bg-[var(--bg2)]" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-48 bg-[var(--bg2)]" />
            <Skeleton className="h-4 w-64 bg-[var(--bg2)]" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 bg-[var(--bg2)]" />
              <Skeleton className="h-8 w-24 bg-[var(--bg2)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 bg-[var(--bg2)]" />
            <Skeleton className="h-10 w-full bg-[var(--bg2)]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 bg-[var(--bg2)]" />
            <Skeleton className="h-10 w-full bg-[var(--bg2)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonalDetailsPanel() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: rawProfile, isLoading } = useQuery({
    queryKey: ['account-profile'],
    queryFn: accountApi.getProfile,
  });

  const profile = useMemo(() => {
    if (!rawProfile) return undefined;
    return ((rawProfile as any)?.data && (rawProfile as any)?.success !== undefined
      ? (rawProfile as any).data
      : rawProfile) as AccountProfile;
  }, [rawProfile]);

  const [form, setForm] = useState<UpdateAccountProfileInput | null>(null);
  const [hasCustomAvatar, setHasCustomAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(toForm(profile));
      setHasCustomAvatar(Boolean(profile.avatar_url));
    }
  }, [profile]);

  const initial = useMemo(() => (profile ? toForm(profile) : null), [profile]);
  const dirty = Boolean(initial && form && JSON.stringify(initial) !== JSON.stringify(form));

  const update = useMutation({
    mutationFn: (data: UpdateAccountProfileInput) => accountApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['account-profile'], updated);
      queryClient.invalidateQueries({ queryKey: ['account-overview'] });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      toast.success('Profile changes saved');
    },
    onError: (error: unknown) =>
      toast.error(apiErrorMessage(error) ?? 'Failed to update profile.'),
  });

  const removeAvatar = useMutation({
    mutationFn: accountApi.deleteAvatar,
    onSuccess: (updated) => {
      queryClient.setQueryData(['account-profile'], updated);
      queryClient.invalidateQueries({ queryKey: ['account-overview'] });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      setForm(toForm(updated));
      setHasCustomAvatar(false);
      toast.success('Avatar photo removed');
    },
    onError: () => toast.error('Failed to remove photo.'),
  });

  function patch(next: Partial<UpdateAccountProfileInput>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  function onFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file must be 2MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch({ avatar_url: String(reader.result) });
      setHasCustomAvatar(true);
      toast.success('Photo ready. Saving changes…');
    };
    reader.readAsDataURL(file);
  }

  function save() {
    const current = form;
    if (!current) return;
    update.mutate({
      display_name: current.display_name.trim(),
      full_name: current.full_name?.trim() || null,
      avatar_url: current.avatar_url ?? null,
      timezone: current.timezone,
      locale: current.locale,
      marketing_emails: current.marketing_emails,
      product_updates: current.product_updates,
    });
  }

  // Debounced auto-save
  useEffect(() => {
    if (!dirty || !form || update.isPending) return;

    const timeoutId = window.setTimeout(() => {
      save();
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [dirty, form, update.isPending]);

  if (isLoading || !profile || !form) {
    return <ProfileSkeleton />;
  }

  const avatarStyle = { backgroundColor: colorForId(profile.id) };

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Top Header with live save status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]">
            Profile & Personal Details
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text2)]">
            Configure your personal identity, regional settings, and notification preferences.
          </p>
        </div>

        {/* Live Autosave Feedback Pill */}
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg1)] px-3 py-1 text-[12px]">
          {update.isPending ? (
            <>
              <Clock3 className="size-3 animate-spin text-[var(--brand)]" />
              <span className="text-[var(--text2)] font-mono text-[11px]">Saving changes…</span>
            </>
          ) : dirty ? (
            <>
              <Clock3 className="size-3 text-[var(--amber)]" />
              <span className="text-[var(--text3)] font-mono text-[11px]">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3 text-[var(--green)]" />
              <span className="text-[var(--text3)] font-mono text-[11px]">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Avatar Studio Card */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Avatar Container */}
          <div className="relative group size-20 shrink-0 sm:size-22">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt={form.display_name}
                width={80}
                height={80}
                loading="lazy"
                decoding="async"
                className="size-full rounded-full border-2 border-[var(--border2)] object-cover shadow-xs"
              />
            ) : (
              <div
                className="flex size-full items-center justify-center rounded-full border-2 border-[var(--border2)] text-[26px] font-semibold text-white shadow-xs"
                style={avatarStyle}
              >
                {initialsForName(form.display_name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
            >
              <Camera className="size-5 text-white" />
            </button>
          </div>

          {/* Details & Actions */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-semibold text-[var(--text)]">
                Profile Avatar
              </span>
              <span className="font-mono text-[11px] text-[var(--text3)]">
                JPG, PNG, WebP up to 2MB
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--text3)]">
              Displayed on comments, audit events, traces, and team workspaces.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
              >
                <Upload className="mr-1.5 size-3.5" />
                Upload new photo
              </Button>
              {hasCustomAvatar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  className="text-[12px] text-[var(--red)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Identity & Contact Details */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">
          Personal Information
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--text3)]">
          Update how your identity is displayed to team members across projects.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="text-[13px] font-medium text-[var(--text)]">
              Display Name
            </label>
            <Input
              id="display-name"
              value={form.display_name}
              onChange={(e) => patch({ display_name: e.target.value })}
              placeholder="e.g. Vikas Baplawat"
              className="h-10 border-[var(--border2)] bg-[var(--bg2)] text-[14px] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--text3)]">
              Your public handle and name shown in team workspaces.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="full-name" className="text-[13px] font-medium text-[var(--text)]">
              Full Legal Name
            </label>
            <Input
              id="full-name"
              value={form.full_name || ''}
              onChange={(e) => patch({ full_name: e.target.value })}
              placeholder="e.g. Vikas Baplawat"
              className="h-10 border-[var(--border2)] bg-[var(--bg2)] text-[14px] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--text3)]">
              Used for invoices, compliance audit records, and security reporting.
            </p>
          </div>

          {/* Primary Email (Protected) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[13px] font-medium text-[var(--text)]">
              Email Address
            </label>
            <div className="flex h-10 items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 px-3 text-[13px]">
              <div className="flex items-center gap-2.5">
                <Mail className="size-4 text-[var(--text3)]" />
                <span className="font-mono text-[var(--text)]">{profile.email}</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green)]/20 bg-[var(--green-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
                <CheckCircle2 className="size-3" />
                Verified
              </span>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
              <Info className="size-3" />
              Primary email changes require security approval. Contact workspace admin.
            </p>
          </div>
        </div>
      </section>

      {/* Regional & Localization */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">
          Localization & Preferences
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--text3)]">
          Timezone governs telemetry timestamps, alert triggers, and scheduled report dates.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Timezone */}
          <div className="space-y-1.5">
            <label htmlFor="timezone" className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text)]">
              <Globe2 className="size-3.5 text-[var(--text3)]" />
              Preferred Timezone
            </label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              className="h-10 w-full rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] px-3 font-mono text-[13px] text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-[var(--bg1)] text-[var(--text)]">
                  {tz}
                </option>
              ))}
            </select>
            <p className="font-mono text-[11px] text-[var(--text3)]">
              Current local time: {new Date().toLocaleTimeString(undefined, { timeZone: form.timezone })}
            </p>
          </div>

          {/* Locale / Language */}
          <div className="space-y-1.5">
            <label htmlFor="locale" className="text-[13px] font-medium text-[var(--text)]">
              Interface Language
            </label>
            <select
              id="locale"
              value={form.locale}
              onChange={(e) => patch({ locale: e.target.value })}
              className="h-10 w-full rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value} className="bg-[var(--bg1)] text-[var(--text)]">
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text3)]">
              Console interface and date localization.
            </p>
          </div>
        </div>
      </section>

      {/* Communication Preferences */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">
          Communication Preferences
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--text3)]">
          Manage transactional, product digest, and security updates sent to your email.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
            <div>
              <div className="text-[13px] font-medium text-[var(--text)]">Product Releases</div>
              <div className="text-[11px] text-[var(--text3)]">Weekly feature updates.</div>
            </div>
            <Switch
              checked={form.product_updates}
              onCheckedChange={(checked) => patch({ product_updates: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
            <div>
              <div className="text-[13px] font-medium text-[var(--text)]">Marketing & News</div>
              <div className="text-[11px] text-[var(--text3)]">Observability digest & news.</div>
            </div>
            <Switch
              checked={form.marketing_emails}
              onCheckedChange={(checked) => patch({ marketing_emails: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/20 p-4 opacity-80">
            <div>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text)]">
                <Lock className="size-3.5 text-[var(--text3)]" />
                Security Notices
              </div>
              <div className="text-[11px] text-[var(--text3)]">Mandatory security alerts.</div>
            </div>
            <Badge variant="outline" className="border-[var(--border)] text-[10px] text-[var(--text3)]">
              Always on
            </Badge>
          </div>
        </div>
      </section>

      {/* Manual Save Button Bar */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={save}
          disabled={!dirty || update.isPending}
          className="bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90 disabled:opacity-50"
        >
          {update.isPending ? 'Saving changes…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

