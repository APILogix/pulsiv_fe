import { useActionState, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '../api/org.api';
import { orgQueryKeys } from '../hooks/useOrganizations';
import { useOrgStore } from '../store/org.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { PulsivLogo } from '@/shared/components/PulsivLogo';

interface OrgFormState {
  error: string | null;
  success: boolean;
  orgId?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creating...' : 'Create Organization'}
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
  const derivedSlug = useMemo(() => slugify(orgName), [orgName]);

  const { data: slugAvailability } = useQuery({
    queryKey: [...orgQueryKeys.lists(), 'slug-availability', derivedSlug],
    queryFn: () => orgApi.checkSlugAvailability(derivedSlug),
    enabled: derivedSlug.length > 1,
    staleTime: 30_000,
  });

  const [state, submitAction, isPending] = useActionState(
    async (_prevState: OrgFormState, formData: FormData): Promise<OrgFormState> => {
      try {
        const name = (formData.get('name') as string)?.trim();
        const description = normalizeOptional(formData.get('description'));
        const industry = normalizeOptional(formData.get('industry'));
        const companySize = normalizeOptional(formData.get('companySize'));
        const country = normalizeOptional(formData.get('country'));
        const timezone = normalizeOptional(formData.get('timezone'));
        const billingEmail = normalizeOptional(formData.get('billingEmail'));
        
        if (!name) {
          return { success: false, error: 'Organization name is required.' };
        }
        if (timezone && !isValidTimezone(timezone)) {
          return { success: false, error: 'Enter a valid IANA timezone, for example Asia/Calcutta or America/New_York.' };
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
        
        // Invalidate organizations list cache so it refetches in the switcher
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
        
        return { success: true, error: null, orgId: org.id };
      } catch (err: any) {
        return { success: false, error: err?.response?.data?.message || err.message || 'Failed to create organization.' };
      }
    },
    { success: false, error: null }
  );

  useEffect(() => {
    if (state.success && state.orgId) {
      setActiveOrgId(state.orgId);
      navigate('/dashboard');
    }
  }, [state, navigate, setActiveOrgId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[440px] space-y-8 rounded-[10px] border border-border bg-[var(--bg1)] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <PulsivLogo size={40} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Create an Organization
            </h1>
            <p className="text-sm text-[var(--text2)]">
              Your organization is your shared workspace where you can collaborate with your team.
            </p>
          </div>
        </div>

        <form action={submitAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[var(--text2)]">Organization Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g. Acme Corp" 
              required 
              disabled={isPending}
              onChange={(event) => setOrgName(event.target.value)}
              className="bg-[var(--bg2)] text-[var(--text)] border-border"
            />
            {derivedSlug ? (
              <p className="text-xs text-[var(--text3)]">
                Slug preview: <span className="font-mono">{derivedSlug}</span>
                {slugAvailability ? (
                  <span className={slugAvailability.available ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                    {slugAvailability.available ? ' available' : ' unavailable'}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[var(--text2)]">Description (Optional)</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="What does your team do?" 
              disabled={isPending}
              className="bg-[var(--bg2)] text-[var(--text)] border-border resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-[var(--text2)]">Industry</Label>
              <Input id="industry" name="industry" placeholder="e.g. Fintech" disabled={isPending} className="bg-[var(--bg2)] text-[var(--text)] border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize" className="text-[var(--text2)]">Company Size</Label>
              <Input id="companySize" name="companySize" placeholder="e.g. 50-200" disabled={isPending} className="bg-[var(--bg2)] text-[var(--text)] border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-[var(--text2)]">Country</Label>
              <Input id="country" name="country" placeholder="e.g. India" disabled={isPending} className="bg-[var(--bg2)] text-[var(--text)] border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-[var(--text2)]">Timezone</Label>
              <Input id="timezone" name="timezone" placeholder="e.g. Asia/Calcutta" disabled={isPending} className="bg-[var(--bg2)] text-[var(--text)] border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingEmail" className="text-[var(--text2)]">Billing Email</Label>
            <Input id="billingEmail" name="billingEmail" type="email" placeholder="billing@acme.com" disabled={isPending} className="bg-[var(--bg2)] text-[var(--text)] border-border" />
          </div>

          {state.error && (
            <div className="rounded-md bg-[var(--red-bg)] p-3 text-sm text-[var(--red)] border border-[rgba(239,68,68,0.35)]">
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
