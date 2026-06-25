import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { AdminUserRow } from '../types/auth.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => authApi.listUsers({ limit: 20, offset: 0 }) });

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      <div className="space-y-3">
        {data?.data.map((user: AdminUserRow) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email} · {user.status}</p>
              </div>
              <div className="flex gap-2">
                {user.status === 'active' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => authApi.suspendUser(user.id, { reason: 'Admin action' }).then(() => qc.invalidateQueries({ queryKey: ['admin-users'] }))}
                  >
                    Suspend
                  </Button>
                )}
                {user.status === 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => authApi.unsuspendUser(user.id).then(() => qc.invalidateQueries({ queryKey: ['admin-users'] }))}
                  >
                    Unsuspend
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}