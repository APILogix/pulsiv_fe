import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MfaSetupPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">MFA Setup</h1>
      <Card>
        <CardHeader><CardTitle>Set Up Authenticator App</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure a TOTP authenticator app (like Google Authenticator or Authy) to secure your account with two-factor authentication.</p>
          <p className="text-sm text-muted-foreground">Use the MFA Devices page to manage your authenticator and backup codes.</p>
          <a href="/auth/mfa-devices" className="inline-flex items-center text-primary underline underline-offset-4 text-sm">Go to MFA Devices</a>
        </CardContent>
      </Card>
    </div>
  );
}