import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Laptop, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { authQueryCache, authQueryKeys } from '../../api/auth.query';
import type { TrustedDevice } from '../../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrustedDevicesPanel() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useQuery<TrustedDevice[]>({
    queryKey: authQueryKeys.trustedDevices,
    queryFn: authApi.listTrustedDevices,
    staleTime: authQueryCache.securityStateStaleMs,
    gcTime: authQueryCache.gcMs,
  });

  const trustCurrent = useMutation({
    mutationFn: () => authApi.trustDevice('Current device'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authQueryKeys.trustedDevices });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revoke = useMutation({
    mutationFn: authApi.revokeTrustedDevice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authQueryKeys.trustedDevices });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-[24px] font-semibold text-white tracking-normal">Trusted devices</h1>
          <p className="text-[14px] leading-relaxed text-[#8A8F98]">
            Devices you trust may skip extra MFA prompts until their trust expires.
          </p>
        </div>
        <Button
          onClick={() => trustCurrent.mutate()}
          disabled={trustCurrent.isPending}
          className="shrink-0 bg-white text-black hover:bg-[#e8e8e8]"
        >
          {trustCurrent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Trust this device
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#1f1f1f] bg-[#141414]">
        <div className="grid grid-cols-[2fr_1.4fr_1.4fr_120px] border-b border-[#1f1f1f] px-6 py-4 text-[13px] font-medium text-[#8A8F98]">
          <div>Device</div>
          <div>Trusted</div>
          <div>Expires</div>
          <div>Action</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#10b981]" size={22} />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-[#8A8F98]">
            <KeyRound size={24} className="text-[#5C5F66]" />
            <p className="text-[14px]">No trusted devices yet.</p>
          </div>
        ) : (
          devices.map((device, index) => (
            <div
              key={device.id}
              className={`grid grid-cols-[2fr_1.4fr_1.4fr_120px] items-center px-6 py-5 hover:bg-white/[0.02] ${index !== devices.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#262626] bg-[#0c0c0c] text-[#8A8F98]">
                  <Laptop size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14px] font-medium text-white">{device.device_name || 'Trusted device'}</p>
                    <Badge className="bg-[#10b981]/10 text-[#10b981]">Trusted</Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-[#5C5F66]">{device.id}</p>
                </div>
              </div>
              <div className="text-[13px] text-[#8A8F98]">{formatDate(device.trusted_at)}</div>
              <div className="text-[13px] text-[#8A8F98]">{formatDate(device.expires_at)}</div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revoke.mutate(device.id)}
                  disabled={revoke.isPending}
                  className="border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] hover:border-[#ef4444]/30 hover:text-[#ef4444]"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Revoke
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
