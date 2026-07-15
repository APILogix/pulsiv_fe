import { useListSessions } from '../hooks/useListSessions';
import { useRevokeSession, useRevokeAllSessions, useRevokeOtherSessions } from '../hooks/useRevokeSession';
import type { SessionInfo } from '../types/auth.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SessionsPage() {
  const { data: sessions, isLoading } = useListSessions();

  const { mutate: revokeSession } = useRevokeSession();
  const { mutate: revokeAllSessions } = useRevokeAllSessions();
  const { mutate: revokeOtherSessions } = useRevokeOtherSessions();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => revokeOtherSessions()}>Revoke Others</Button>
          <Button variant="destructive" size="sm" onClick={() => revokeAllSessions()}>Revoke All</Button>
        </div>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      <div className="space-y-3">
        {sessions?.map((s: SessionInfo) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{s.device_name ?? 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">{s.ip_address}{s.ip_geo_country ? ` · ${s.ip_geo_country}` : ''}</p>
                <p className="text-xs text-muted-foreground">Last active: {new Date(s.last_active_at).toLocaleString()}</p>
              </div>
              {s.is_current ? (
                <span className="text-xs text-green-500 font-medium">Current</span>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => revokeSession(s.id)}>Revoke</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}