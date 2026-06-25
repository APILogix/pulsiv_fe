import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { MFADeviceDto } from '../types/auth.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

export default function MfaDevicesPage() {
  const qc = useQueryClient();
  const { data: devices, isLoading } = useQuery({ queryKey: ['mfa-devices'], queryFn: authApi.listMFADevices });
  const removeMutation = useMutation({
    mutationFn: (id: string) => authApi.removeMFADevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mfa-devices'] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">MFA Devices</h1>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      <div className="space-y-4">
        {devices?.map((d: MFADeviceDto) => (
          <Card key={d.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-muted-foreground">{d.type} {d.is_primary ? '(Primary)' : ''}</p>
              </div>
              {!d.is_primary && (
                <Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(d.id)}>Remove</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}