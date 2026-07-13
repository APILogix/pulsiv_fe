import { useActionState, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllCountries, getAllTimezones } from 'countries-and-timezones';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useFormStatus } from 'react-dom';
import { orgApi } from '../api/org.api';
import { orgQueryKeys } from '../hooks/useOrganizations';
import { useOrgStore } from '../store/org.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PulsivLogo } from '@/shared/components/PulsivLogo';

interface OrgFormState {
  error: string | null;
  success: boolean;
  orgId?: string;
}

const INDUSTRIES = [
  'Technology',
  'Financial services',
  'Healthcare',
  'Education',
  'Retail & ecommerce',
  'Manufacturing',
  'Marketing & advertising',
  'Professional services',
  'Media & entertainment',
  'Real estate',
  'Non-profit',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,001-5,000', '5,001+'];

const COUNTRIES = Object.values(getAllCountries()).sort((a, b) => a.name.localeCompare(b.name));
const ALL_TIMEZONES = Object.values(getAllTimezones())
  .filter((timezone) => !timezone.deprecated && !timezone.aliasOf)
  .sort((a, b) => a.name.localeCompare(b.name));

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-10 w-full sm:w-auto sm:min-w-52">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? 'Creating organization...' : 'Create organization'}
    </Button>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeOptional(value: FormDataEntryValue | null) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : undefined;
}

function isValidTimezone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const [orgName, setOrgName] = useState('');
  const [countryName, setCountryName] = useState('');
  const derivedSlug = slugify(orgName);
  const timezones = (() => {
    const selectedCountry = COUNTRIES.find((country) => country.name === countryName);

    if (!selectedCountry) return ALL_TIMEZONES;

    const allowedTimezones = new Set(selectedCountry.timezones);
    return ALL_TIMEZONES.filter((timezone) => allowedTimezones.has(timezone.name));
  })();

  const { data: slugAvailability } = useQuery({
    queryKey: [...orgQueryKeys.lists(), 'slug-availability', derivedSlug],
    queryFn: () => orgApi.checkSlugAvailability(derivedSlug),
    enabled: derivedSlug.length > 1,
    staleTime: 30_000,
  });

  const [state, submitAction, isPending] = useActionState(
    async (_previousState: OrgFormState, formData: FormData): Promise<OrgFormState> => {
      try {
        const name = (formData.get('name') as string)?.trim();
        const description = normalizeOptional(formData.get('description'));
        const industry = normalizeOptional(formData.get('industry'));
        const companySize = normalizeOptional(formData.get('companySize'));
        const country = normalizeOptional(formData.get('country'));
        const timezone = normalizeOptional(formData.get('timezone'));
        const billingEmail = normalizeOptional(formData.get('billingEmail'));

        if (!name) return { success: false, error: 'Organization name is required.' };
        if (timezone && !isValidTimezone(timezone)) {
          return { success: false, error: 'Select a valid timezone from the list.' };
        }
        if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
          return { success: false, error: 'Enter a valid billing email address.' };
        }

        const org = await orgApi.createOrganization({
          name,
          description,
          industry,
          companySize,
          country,
          timezone,
          billingEmail,
        });

        queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
        return { success: true, error: null, orgId: org.id };
      } catch (error: unknown) {
        const responseError = error as { response?: { data?: { message?: string } }; message?: string };
        return {
          success: false,
          error: responseError.response?.data?.message || responseError.message || 'Unable to create the organization. Please try again.',
        };
      }
    },
    { success: false, error: null },
  );

  useEffect(() => {
    if (state.success && state.orgId) {
      toast.success('Organization created');
      setActiveOrgId(state.orgId);
      navigate('/dashboard');
    }
  }, [state, navigate, setActiveOrgId]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-3 sm:p-6">
      <section className="w-full max-w-3xl rounded-2xl border border-border bg-[var(--bg1)] shadow-2xl shadow-black/25">
        <div className="border-b border-border px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/10">
              <PulsivLogo size={27} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">Create your organization</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text2)]">
                Set up your shared workspace. You can update these details at any time from organization settings.
              </p>
            </div>
          </div>
        </div>

        <form action={submitAction} className="p-5 sm:p-8">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-[var(--text2)]">Organization name <span className="text-[var(--red)]">*</span></Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Acme Corp"
                required
                disabled={isPending}
                onChange={(event) => setOrgName(event.target.value)}
                className="h-10 bg-[var(--bg2)] text-[var(--text)]"
              />
              {derivedSlug ? (
                <p className="text-xs text-[var(--text3)]">
                  Workspace URL: <span className="font-mono text-[var(--text2)]">{derivedSlug}</span>
                  {slugAvailability ? (
                    <span className={slugAvailability.available ? 'ml-2 text-[var(--green)]' : 'ml-2 text-[var(--red)]'}>
                      {slugAvailability.available ? 'Available' : 'Unavailable'}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description" className="text-[var(--text2)]">Description <span className="text-[var(--text3)]">(optional)</span></Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What does your team do?"
                disabled={isPending}
                className="min-h-20 resize-none bg-[var(--bg2)] text-[var(--text)]"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="text-[var(--text2)]">Industry</Label>
              <select id="industry" name="industry" disabled={isPending} defaultValue="" aria-label="Industry" className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
                <option value="" disabled>Select an industry</option>
                {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize" className="text-[var(--text2)]">Company size</Label>
              <select id="companySize" name="companySize" disabled={isPending} defaultValue="" aria-label="Company size" className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
                <option value="" disabled>Select team size</option>
                {COMPANY_SIZES.map((size) => <option key={size} value={size}>{size} people</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-[var(--text2)]">Country</Label>
              <select
                id="country"
                name="country"
                autoComplete="country-name"
                disabled={isPending}
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
                aria-label="Country"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select a country</option>
                {COUNTRIES.map((country) => <option key={country.id} value={country.name}>{country.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-[var(--text2)]">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                disabled={isPending}
                defaultValue=""
                aria-label="Timezone"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>{countryName ? 'Select a timezone' : 'Select a country first'}</option>
                {timezones.map((timezone) => <option key={timezone.name} value={timezone.name}>{`${timezone.name} (UTC${timezone.utcOffsetStr})`}</option>)}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="billingEmail" className="text-[var(--text2)]">Billing email <span className="text-[var(--text3)]">(optional)</span></Label>
              <Input id="billingEmail" name="billingEmail" type="email" placeholder="billing@acme.com" autoComplete="email" disabled={isPending} className="h-10 bg-[var(--bg2)] text-[var(--text)]" />
            </div>
          </div>

          {state.error ? (
            <div role="alert" className="mt-5 rounded-lg border border-[rgba(239,68,68,0.35)] bg-[var(--red-bg)] px-3 py-2.5 text-sm text-[var(--red)]">
              {state.error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--text3)]">Only the organization name is required. The rest can be completed later.</p>
            <SubmitButton />
          </div>
        </form>
      </section>
    </main>
  );
}
