import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SecurityCenterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/auth/profile">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Update your name, email, and preferences.</CardContent>
          </Card>
        </Link>
        <Link to="/auth/change-password">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Update your account password.</CardContent>
          </Card>
        </Link>
        <Link to="/auth/mfa-devices">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>MFA Devices</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Manage authenticator apps and backup codes.</CardContent>
          </Card>
        </Link>
        <Link to="/auth/sessions">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">View and revoke active sessions.</CardContent>
          </Card>
        </Link>
        <Link to="/auth/step-up">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>Verify Identity</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Complete step-up verification for sensitive actions.</CardContent>
          </Card>
        </Link>
        <Link to="/auth/admin/users">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader><CardTitle>Admin: Users</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Manage user accounts (admin only).</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}