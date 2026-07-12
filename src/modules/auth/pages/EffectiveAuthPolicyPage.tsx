import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EffectiveAuthPolicyPage() {
  const { data: policy, isLoading } = useQuery({
    queryKey: [...authQueryKeys.securitySummary, 'effective-policy'],
    queryFn: authApi.getEffectivePolicy,
  });

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Authentication policy</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">Review the security rules currently applied to your account.</p>
      </div>
      <Card className="border-[var(--border)] bg-[var(--bg1)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text)]"><ShieldCheck size={18} /> Effective policy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-[var(--text2)]">Loading policy…</p> : (
            <pre className="overflow-auto rounded-md bg-[var(--bg2)] p-4 text-xs text-[var(--text2)]">{JSON.stringify(policy ?? {}, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
