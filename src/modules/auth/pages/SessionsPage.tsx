import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { SessionInfo } from '../types/auth.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

export default function SessionsPage() {
  const qc = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: authApi.listSessions });

  const revokeMutation = useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  const revokeAllMutation = useMutation({
    mutationFn: authApi.revokeAllSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => revokeOthersMutation.mutate()}>Revoke Others</Button>
          <Button variant="destructive" size="sm" onClick={() => revokeAllMutation.mutate()}>Revoke All</Button>
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
                <Button variant="destructive" size="sm" onClick={() => revokeMutation.mutate(s.id)}>Revoke</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}