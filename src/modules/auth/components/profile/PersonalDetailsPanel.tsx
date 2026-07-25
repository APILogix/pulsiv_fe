import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Globe2, Lock, Mail, Upload, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

import { accountApi, type AccountProfile, type UpdateAccountProfileInput } from '../../api/account.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { colorForId, initialsForName } from './account-avatar';

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-IN', label: 'English (India)' },
];

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];

function toForm(profile: AccountProfile): UpdateAccountProfileInput {
  return {
    display_name: profile.display_name || '',
    full_name: profile.full_name || '',
    avatar_url: profile.avatar_url,
    timezone: profile.timezone || 'UTC',
    locale: profile.locale || 'en-US',
    marketing_emails: profile.preferences.marketing_emails,
    product_updates: profile.preferences.product_updates,
  };
}

export function PersonalDetailsPanel() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { data: profile, isLoading } = useQuery({
    queryKey: ['account-profile'],
    queryFn: accountApi.getProfile,
  });
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
      toast.success('Profile updated.');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error?.message || 'Failed to update profile.'),
  });

  const removeAvatar = useMutation({
    mutationFn: accountApi.deleteAvatar,
    onSuccess: (updated) => {
      queryClient.setQueryData(['account-profile'], updated);
      queryClient.invalidateQueries({ queryKey: ['account-overview'] });
      setForm(toForm(updated));
      setHasCustomAvatar(false);
      toast.success('Photo removed.');
    },
    onError: () => toast.error('Failed to remove photo.'),
  });

  function patch(next: Partial<UpdateAccountProfileInput>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  function onFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be 2MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch({ avatar_url: String(reader.result) });
      setHasCustomAvatar(true);
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

  useEffect(() => {
    if (!dirty || !form || update.isPending) return;

    const timeoutId = window.setTimeout(() => {
      save();
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [dirty, form, update.isPending]);

  if (isLoading || !profile || !form) {
    return <div className="text-[14px] text-muted-foreground">Loading profile...</div>;
  }

  const avatarStyle = { backgroundColor: colorForId(profile.id) };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-xl border border-border bg-card/80 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
              <UserRound className="size-3.5" />
              Account profile
            </div>
            <h1 className="text-[24px] font-semibold leading-tight tracking-normal text-foreground md:text-[28px]">
              Profile
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
              Update your display details, locale, profile photo, and communication preferences.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
            {update.isPending ? (
              <>
                <Clock3 className="size-3.5 animate-spin text-primary" />
                Saving changes...
              </>
            ) : dirty ? (
              <>
                <Clock3 className="size-3.5 text-primary" />
                Autosaves in 2s
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                All changes saved
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-card/80 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative size-32 overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="size-32 object-cover" />
              ) : (
                <span className="flex size-32 items-center justify-center text-[38px] font-semibold text-white" style={avatarStyle}>
                  {initialsForName(form.display_name)}
                </span>
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-[12px] font-medium text-white group-hover:flex">
                Change
              </span>
            </button>
            <div className="mt-4 max-w-full">
              <div className="truncate text-[20px] font-semibold text-foreground">{form.display_name || profile.email}</div>
              <div className="mt-1 truncate text-[13px] text-muted-foreground">{profile.email}</div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-3" />
                Verified
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {form.locale}
              </Badge>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Upload photo
            </Button>
            {hasCustomAvatar ? (
              <Button type="button" variant="ghost" onClick={() => removeAvatar.mutate()} disabled={removeAvatar.isPending}>
                <X className="size-4" />
                Remove photo
              </Button>
            ) : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-border bg-card/80 shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-[16px] font-semibold text-foreground">Personal details</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">These settings only apply to your personal account.</p>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="display-name" className="text-[13px] font-medium text-foreground">
                Display name
              </label>
              <Input id="display-name" value={form.display_name} onChange={(event) => patch({ display_name: event.target.value })} />
              <p className="text-[12px] text-muted-foreground">This is how your name appears across Pulsiv.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="full-name" className="text-[13px] font-medium text-foreground">
                Full name
              </label>
              <Input id="full-name" value={form.full_name || ''} onChange={(event) => patch({ full_name: event.target.value })} />
              <p className="text-[12px] text-muted-foreground">Used for billing and legal purposes.</p>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <div className="text-[13px] font-medium text-foreground">Email address</div>
              <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-3 text-[14px] text-foreground">
                <Mail className="size-4 text-muted-foreground" />
                <span className="min-w-0 truncate">{profile.email}</span>
                <Badge className="ml-auto bg-emerald-500/10 text-emerald-400">Verified</Badge>
              </div>
              <p className="text-[12px] text-muted-foreground">Contact support to change your email address.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <Globe2 className="size-3.5" />
                Timezone
              </label>
              <select
                id="timezone"
                value={form.timezone}
                onChange={(event) => patch({ timezone: event.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] text-foreground"
              >
                {TIMEZONES.map((timezone: string) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-muted-foreground">Used for timestamps in alerts and reports.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="locale" className="text-[13px] font-medium text-foreground">
                Language
              </label>
              <select
                id="locale"
                value={form.locale}
                onChange={(event) => patch({ locale: event.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] text-foreground"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-muted-foreground">Interface language preference.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card/80 shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold text-foreground">Communication</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Choose which account messages you want to receive.</p>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/45 p-4">
            <div>
              <div className="text-[13px] font-medium text-foreground">Marketing emails</div>
              <div className="text-[12px] text-muted-foreground">Product and company news.</div>
            </div>
            <Switch checked={form.marketing_emails} onCheckedChange={(checked) => patch({ marketing_emails: checked })} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/45 p-4">
            <div>
              <div className="text-[13px] font-medium text-foreground">Product updates</div>
              <div className="text-[12px] text-muted-foreground">Release notes and changes.</div>
            </div>
            <Switch checked={form.product_updates} onCheckedChange={(checked) => patch({ product_updates: checked })} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 opacity-80">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <Lock className="size-3.5" />
                Security alerts
              </div>
              <div className="text-[12px] text-muted-foreground">Required account protection.</div>
            </div>
            <Badge variant="outline">On</Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
