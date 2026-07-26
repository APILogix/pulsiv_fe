import { useState } from 'react';
import { Globe, Laptop, MonitorSmartphone, ShieldAlert, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useListSessions } from '../hooks/useListSessions';
import { useRevokeSession, useRevokeAllSessions, useRevokeOtherSessions } from '../hooks/useRevokeSession';
import type { SessionInfo } from '../types/auth.types';
import {
  EmptyPanel,
  HeroFacts,
  IconChip,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  type HeroFact,
} from '@/shared/ui/pulse';
import { Button, CardSkeleton, Timestamp } from '@/shared/observe';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BulkKind = 'others' | 'all';

const SKELETON_SLOTS = ['session-a', 'session-b', 'session-c'];

const BULK_COPY: Record<BulkKind, { title: string; description: string; confirm: string }> = {
  others: {
    title: 'Revoke other sessions',
    description: 'Every session except the one on this device is signed out immediately.',
    confirm: 'Revoke other sessions',
  },
  all: {
    title: 'Revoke all sessions',
    description: 'Every session is signed out immediately, including the one on this device.',
    confirm: 'Revoke all sessions',
  },
};

const DEVICE_ICON: Record<string, LucideIcon> = {
  mobile: Smartphone,
  phone: Smartphone,
  tablet: Smartphone,
  desktop: Laptop,
  laptop: Laptop,
  web: Globe,
  browser: Globe,
};

function deviceIcon(session: SessionInfo): LucideIcon {
  const key = (session.device_type ?? '').toLowerCase();
  return DEVICE_ICON[key] ?? MonitorSmartphone;
}

// One-off: a single session row inside the sessions panel.
function SessionRow({
  session,
  pending,
  onRevoke,
}: {
  session: SessionInfo;
  pending: boolean;
  onRevoke: () => void;
}) {
  return (
    <Row className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <IconChip icon={deviceIcon(session)} tone={session.is_current ? 'green' : 'neutral'} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13.5px] font-medium text-[var(--text)]">
              {session.device_name ?? 'Unknown device'}
            </p>
            {session.is_current && <Pill tone="green" dot>Current session</Pill>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text3)]">
            <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{session.ip_address}</span>
            {session.ip_geo_country && <span>{session.ip_geo_country}</span>}
            {session.device_type && <span>{session.device_type}</span>}
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            Last active <Timestamp value={session.last_active_at} /> · started <Timestamp value={session.created_at} />
          </p>
        </div>
      </div>
      {!session.is_current && (
        <Button variant="danger" disabled={pending} onClick={onRevoke}>
          Revoke
        </Button>
      )}
    </Row>
  );
}

function heroFacts(sessions: SessionInfo[]): HeroFact[] {
  const current = sessions.find((session) => session.is_current);
  return [
    { label: 'Active sessions', value: sessions.length, tone: 'ai', icon: MonitorSmartphone },
    {
      label: 'Other devices',
      value: sessions.filter((item) => !item.is_current).length,
      tone: 'brand',
      icon: Laptop,
    },
    {
      label: 'This device',
      value: (
        <span className="text-[14px]">{current?.device_name ?? 'Unknown device'}</span>
      ),
      tone: 'green',
      icon: Globe,
    },
  ];
}

export default function SessionsPage() {
  const { data: sessions, isLoading } = useListSessions();
  const [bulkKind, setBulkKind] = useState<BulkKind | null>(null);

  const { mutate: revokeSession, isPending: isRevokingSession } = useRevokeSession();
  const { mutate: revokeAllSessions, isPending: isRevokingAll } = useRevokeAllSessions();
  const { mutate: revokeOtherSessions, isPending: isRevokingOthers } = useRevokeOtherSessions();

  const list: SessionInfo[] = sessions ?? [];
  const bulkCopy = bulkKind ? BULK_COPY[bulkKind] : null;
  const bulkPending = bulkKind === 'all' ? isRevokingAll : isRevokingOthers;
  const otherCount = list.filter((session) => !session.is_current).length;
  const bulkCount = bulkKind === 'all' ? list.length : otherCount;
  const facts = list.length > 0 ? heroFacts(list) : null;

  const runBulk = () => {
    if (bulkKind === 'all') revokeAllSessions();
    if (bulkKind === 'others') revokeOtherSessions();
    setBulkKind(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Account security"
        title="Active sessions"
        description="Every device holding a valid session for your account. Revoke anything you do not recognise."
        icon={MonitorSmartphone}
      >
        {!isLoading && facts && <HeroFacts facts={facts} />}
      </PageHero>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SKELETON_SLOTS.map((slot) => (
            <CardSkeleton key={slot} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyPanel
          icon={MonitorSmartphone}
          title="No sessions to show"
          description="Session records appear here once your account signs in from a device."
        />
      ) : (
        <Panel
          title="Sessions"
          description="Location and IP address are resolved at sign-in time and may be approximate."
          icon={MonitorSmartphone}
          tone="ai"
          bodyClassName="p-0"
        >
          <RowStack>
            {list.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                pending={isRevokingSession}
                onRevoke={() => revokeSession(session.id)}
              />
            ))}
          </RowStack>
        </Panel>
      )}

      <Panel
        title="Danger zone"
        description="Bulk revocation takes effect immediately and is recorded in your audit log."
        icon={ShieldAlert}
        danger
        bodyClassName="p-0"
      >
        <RowStack>
          <Row>
            <SettingRow
              label="Revoke other sessions"
              description="Signs out every device except the one you are using right now."
            >
              <Button variant="danger" disabled={isRevokingOthers} onClick={() => setBulkKind('others')}>
                Revoke others
              </Button>
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Revoke all sessions"
              description="Signs out every device, including this one. You will need to sign in again."
            >
              <Button variant="danger" disabled={isRevokingAll} onClick={() => setBulkKind('all')}>
                Revoke all
              </Button>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>

      <Dialog
        open={bulkKind !== null}
        onOpenChange={(open) => {
          if (!open) setBulkKind(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bulkCopy?.title}</DialogTitle>
            <DialogDescription>{bulkCopy?.description}</DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-[var(--text2)]">
            <span className="font-[family-name:var(--display)] font-semibold tabular-nums text-[var(--text)]">{bulkCount}</span>{' '}
            {bulkCount === 1 ? 'session will be signed out.' : 'sessions will be signed out.'}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBulkKind(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={bulkPending} onClick={runBulk}>
              {bulkCopy?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
