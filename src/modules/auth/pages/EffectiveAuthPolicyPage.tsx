import { useQuery } from '@tanstack/react-query';
import { Braces, Building2, Clock, ScrollText, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import {
  EmptyPanel,
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  type HeroFact,
} from '@/shared/ui/pulse';
import { CardSkeleton, JsonViewer } from '@/shared/observe';

const POLICY_LABEL: Record<string, string> = {
  enforce_mfa: 'Enforce MFA',
  enforce_sso: 'Enforce SSO',
  session_timeout_minutes: 'Session timeout',
  organization_count: 'Organizations evaluated',
};

const POLICY_DESCRIPTION: Record<string, string> = {
  enforce_mfa: 'When enforced, sign-in requires a verified second factor.',
  enforce_sso: 'When enforced, password sign-in is blocked and your identity provider is used instead.',
  session_timeout_minutes: 'Idle sessions end after this many minutes. The strictest organization value wins.',
  organization_count: 'Number of active memberships whose policies were merged into this result.',
};

const POLICY_UNIT: Record<string, string> = {
  session_timeout_minutes: 'minutes',
};

const SKELETON_SLOTS = ['policy-a', 'policy-b'];

function humanizeKey(key: string) {
  const spaced = key.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// One-off: renders a single policy value with the right typography per data type.
function PolicyValue({ valueKey, value }: { valueKey: string; value: unknown }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Pill tone="green" dot>
        Enforced
      </Pill>
    ) : (
      <Pill tone="amber" dot>
        Not enforced
      </Pill>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-[13px] text-[var(--text3)]">Not set</span>;
  }

  if (typeof value === 'number') {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--mono)] text-[13px] font-semibold tabular-nums text-[var(--text)]">
          {value.toLocaleString('en-US')}
        </span>
        {POLICY_UNIT[valueKey] && <span className="text-[12px] text-[var(--text3)]">{POLICY_UNIT[valueKey]}</span>}
      </span>
    );
  }

  if (typeof value === 'string') {
    return <span className="text-[13px] text-[var(--text)]">{value}</span>;
  }

  return (
    <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{JSON.stringify(value)}</span>
  );
}

function heroFacts(policy: Record<string, unknown>): HeroFact[] {
  const facts: HeroFact[] = [];

  if (typeof policy.enforce_mfa === 'boolean') {
    facts.push({
      label: 'MFA',
      value: policy.enforce_mfa ? 'Enforced' : 'Optional',
      tone: policy.enforce_mfa ? 'green' : 'amber',
      icon: ShieldCheck,
    });
  }
  if (typeof policy.enforce_sso === 'boolean') {
    facts.push({
      label: 'SSO',
      value: policy.enforce_sso ? 'Enforced' : 'Optional',
      tone: policy.enforce_sso ? 'green' : 'amber',
      icon: ScrollText,
    });
  }
  if (typeof policy.session_timeout_minutes === 'number') {
    facts.push({
      label: 'Session timeout',
      value: `${policy.session_timeout_minutes} min`,
      tone: 'blue',
      icon: Clock,
    });
  }
  if (typeof policy.organization_count === 'number') {
    facts.push({
      label: 'Organizations',
      value: policy.organization_count,
      tone: 'ai',
      icon: Building2,
    });
  }

  return facts;
}

export default function EffectiveAuthPolicyPage() {
  const { data: policy, isLoading } = useQuery({
    queryKey: [...authQueryKeys.securitySummary, 'effective-policy'],
    queryFn: authApi.getEffectivePolicy,
  });

  const record: Record<string, unknown> = (policy ?? {}) as Record<string, unknown>;
  const entries = Object.entries(record);
  const facts = entries.length > 0 ? heroFacts(record) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Account security"
        title="Authentication policy"
        description="The merged result of every organization policy that applies to your account. The strictest rule wins."
        icon={ShieldCheck}
      >
        {!isLoading && facts && <HeroFacts facts={facts} />}
      </PageHero>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {SKELETON_SLOTS.map((slot) => (
            <CardSkeleton key={slot} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyPanel
          icon={ShieldCheck}
          title="No policy applied"
          description="Your account has no organization policy in effect, so platform defaults are used."
        />
      ) : (
        <>
          <Panel
            title="Effective policy"
            description="Read-only. Organization owners and admins change these values in organization security settings."
            icon={ShieldCheck}
            tone="brand"
            bodyClassName="p-0"
          >
            <RowStack>
              {entries.map(([key, value]) => (
                <Row key={key}>
                  <SettingRow label={POLICY_LABEL[key] ?? humanizeKey(key)} description={POLICY_DESCRIPTION[key]}>
                    <PolicyValue valueKey={key} value={value} />
                  </SettingRow>
                </Row>
              ))}
            </RowStack>
          </Panel>

          <Panel
            title="Raw payload"
            description="The exact response returned by the policy endpoint, for support and debugging."
            icon={Braces}
            tone="ai"
          >
            <div className="flex flex-col gap-3">
              <Notice tone="blue">
                Values here mirror the rows above. Share this payload when reporting a policy issue.
              </Notice>
              <JsonViewer data={record} />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
