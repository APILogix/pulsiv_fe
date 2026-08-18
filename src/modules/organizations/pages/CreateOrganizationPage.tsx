import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllCountries, getAllTimezones } from 'countries-and-timezones';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { orgApi } from '../api/org.api';
import { orgQueryKeys } from '../hooks/useOrganizations';
import { useOrgStore } from '../store/org.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SentinelLogo } from '@/shared/components/PulsivLogo';
import { markOrganizationSetup } from '@/modules/auth/services/post-login-setup-flag';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { JiraOrgCreationAnimation } from '../components/JiraOrgCreationAnimation';

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);

  // Form Fields State
  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [countryName, setCountryName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Debounced Name & Slug Checking
  const debouncedOrgName = useDebounce(orgName, 300);
  const derivedSlug = slugify(debouncedOrgName);
  const isDebouncingSlug = orgName.trim().length > 0 && orgName.trim() !== debouncedOrgName.trim();

  const timezones = (() => {
    const selectedCountry = COUNTRIES.find((country) => country.name === countryName);
    if (!selectedCountry) return ALL_TIMEZONES;
    const allowedTimezones = new Set(selectedCountry.timezones);
    return ALL_TIMEZONES.filter((tz) => allowedTimezones.has(tz.name));
  })();

  // Debounced slug availability query
  const { data: slugAvailability, isFetching: isCheckingSlug } = useQuery({
    queryKey: [...orgQueryKeys.lists(), 'slug-availability', derivedSlug],
    queryFn: () => orgApi.checkSlugAvailability(derivedSlug),
    enabled: derivedSlug.length > 1 && !isDebouncingSlug,
    staleTime: 30_000,
  });

  // Slug Availability Computations
  const isSlugChecking = isDebouncingSlug || isCheckingSlug;
  const isSlugValid = derivedSlug.length >= 2;
  const isSlugAvailable = isSlugValid && !isSlugChecking && slugAvailability?.available === true;
  const isSlugTaken = isSlugValid && !isSlugChecking && slugAvailability?.available === false;

  // Creation Animation & Lifecycle State
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const isFormSubmittable = orgName.trim().length > 0 && isSlugAvailable && !isCreating;

  const handleResetForm = () => {
    isSubmittingRef.current = false;
    setOrgName('');
    setDescription('');
    setIndustry('');
    setCompanySize('');
    setCountryName('');
    setTimezone('');
    setBillingEmail('');
    setFormError(null);
    setCreationError(null);
    setIsCreating(false);
    setIsComplete(false);
    queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.lists(), 'slug-availability'] });
  };

  const handleCreateOrganization = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSubmittingRef.current || isCreating) {
      return;
    }

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setFormError('Organization name is required.');
      toast.error('Organization name is required.');
      return;
    }

    if (isSlugTaken) {
      setFormError('This workspace URL is already taken. Please choose another organization name.');
      toast.error('Workspace URL is already taken.');
      return;
    }

    if (!isSlugAvailable) {
      setFormError('Please wait for the workspace URL availability check.');
      toast.error('Checking workspace URL availability...');
      return;
    }

    if (timezone && !isValidTimezone(timezone)) {
      setFormError('Select a valid timezone from the list.');
      toast.error('Select a valid timezone from the list.');
      return;
    }
    if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail.trim())) {
      setFormError('Enter a valid billing email address.');
      toast.error('Enter a valid billing email address.');
      return;
    }

    setFormError(null);
    setCreationError(null);
    setIsComplete(false);
    setIsCreating(true);
    isSubmittingRef.current = true;

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `org_create_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const createdOrg = await orgApi.createOrganization({
        name: trimmedName,
        slug: derivedSlug || undefined,
        description: description.trim() || undefined,
        industry: industry || undefined,
        companySize: companySize || undefined,
        country: countryName || undefined,
        timezone: timezone || undefined,
        billingEmail: billingEmail.trim() || undefined,
      }, { idempotencyKey });

      // Brief pause to display completion stage
      await new Promise((r) => setTimeout(r, 450));
      setIsComplete(true);

      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
      setActiveOrgId(createdOrg.id);
      setActiveOrgSlug(createdOrg.slug ?? null);
      markOrganizationSetup();
      toast.success('Organization created successfully!');

      // Celebration hold before navigating to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 950);
    } catch (err: any) {
      isSubmittingRef.current = false;
      const responseData = err?.response?.data;
      let errorMessage = 'Unable to create the organization. Please try again.';

      if (typeof responseData?.error?.message === 'string') {
        errorMessage = responseData.error.message;
      } else if (typeof responseData?.message === 'string') {
        errorMessage = responseData.message;
      } else if (responseData?.error && typeof responseData.error === 'string') {
        errorMessage = responseData.error;
      } else if (typeof err?.message === 'string') {
        errorMessage = err.message;
      }

      setCreationError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCancelAnimation = () => {
    isSubmittingRef.current = false;
    setIsCreating(false);
    setCreationError(null);
    setIsComplete(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-3 sm:p-6">
      {/* Modern Non-Freezing Provisioning Animation Overlay */}
      <JiraOrgCreationAnimation
        open={isCreating}
        orgName={orgName}
        slug={derivedSlug}
        isComplete={isComplete}
        error={creationError}
        onRetry={() => handleCreateOrganization()}
        onCancel={handleCancelAnimation}
        onResetForm={handleResetForm}
      />

      <section className="w-full max-w-3xl rounded-2xl border border-border bg-[var(--bg1)] shadow-2xl shadow-black/25">
        <div className="border-b border-border px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/10">
              <SentinelLogo size={27} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
                Create your organization
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text2)]">
                Set up your shared workspace. You can update these details at any time from organization settings.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateOrganization} className="p-5 sm:p-8">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-[var(--text2)]">
                Organization name <span className="text-[var(--red)]">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={orgName}
                placeholder="e.g. Acme Corp"
                required
                disabled={isCreating}
                onChange={(event) => {
                  setOrgName(event.target.value);
                  if (formError) setFormError(null);
                }}
                className="h-10 bg-[var(--bg2)] text-[var(--text)]"
              />

              {/* Debounced Workspace URL & Availability Indicator */}
              {derivedSlug ? (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--text3)] transition-all">
                    <span>
                      Workspace URL: <span className="font-mono font-medium text-[var(--text2)]">/{derivedSlug}</span>
                    </span>
                    {isSlugChecking ? (
                      <span className="inline-flex items-center gap-1 text-[var(--brand)] font-medium">
                        <Loader2 className="size-3 animate-spin" />
                        <span>Checking...</span>
                      </span>
                    ) : slugAvailability ? (
                      <span
                        className={
                          slugAvailability.available
                            ? 'inline-flex items-center gap-1 text-[var(--green)] font-medium'
                            : 'inline-flex items-center gap-1 text-[var(--red)] font-medium'
                        }
                      >
                        {slugAvailability.available ? (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>Available</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="size-3.5" />
                            <span>URL taken</span>
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>
                  {isSlugTaken && (
                    <p className="text-[11px] font-medium text-[var(--red)]">
                      The URL <span className="font-mono font-semibold">/{derivedSlug}</span> is already claimed by another organization. Please choose a different organization name.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description" className="text-[var(--text2)]">
                Description <span className="text-[var(--text3)]">(optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your team do?"
                disabled={isCreating}
                className="min-h-20 resize-none bg-[var(--bg2)] text-[var(--text)]"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="text-[var(--text2)]">Industry</Label>
              <select
                id="industry"
                name="industry"
                disabled={isCreating}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Industry"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize" className="text-[var(--text2)]">Company size</Label>
              <select
                id="companySize"
                name="companySize"
                disabled={isCreating}
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                aria-label="Company size"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select team size</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>{size} people</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-[var(--text2)]">Country</Label>
              <select
                id="country"
                name="country"
                autoComplete="country-name"
                disabled={isCreating}
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
                aria-label="Country"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.id} value={country.name}>{country.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-[var(--text2)]">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                disabled={isCreating}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                aria-label="Timezone"
                className="h-10 w-full rounded-lg border border-input bg-[var(--bg2)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{countryName ? 'Select a timezone' : 'Select a country first'}</option>
                {timezones.map((tz) => (
                  <option key={tz.name} value={tz.name}>
                    {`${tz.name} (UTC${tz.utcOffsetStr})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="billingEmail" className="text-[var(--text2)]">
                Billing email <span className="text-[var(--text3)]">(optional)</span>
              </Label>
              <Input
                id="billingEmail"
                name="billingEmail"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@acme.com"
                autoComplete="email"
                disabled={isCreating}
                className="h-10 bg-[var(--bg2)] text-[var(--text)]"
              />
            </div>
          </div>

          {formError ? (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[rgba(239,68,68,0.35)] bg-[var(--red-bg)] px-3 py-2.5 text-sm text-[var(--red)]"
            >
              {formError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--text3)]">
              Only the organization name is required. The rest can be completed later.
            </p>
            <Button
              type="submit"
              disabled={!isFormSubmittable}
              className="h-10 w-full sm:w-auto sm:min-w-52 bg-[var(--brand)] hover:opacity-90 shadow-md shadow-[var(--brand)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isCreating
                ? 'Creating organization...'
                : isSlugChecking
                ? 'Checking availability...'
                : isSlugTaken
                ? 'Workspace URL taken'
                : 'Create organization'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
