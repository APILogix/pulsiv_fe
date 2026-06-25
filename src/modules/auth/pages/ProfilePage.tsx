import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileFormData } from '../schemas/auth.schema';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { ShieldCheck, User, Laptop, Activity, Key } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'mfa' | 'sessions' | 'logs'>('personal');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { full_name: user?.full_name ?? '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.updateCurrentUser,
    onSuccess: (updated) => { setAuth(updated); setSuccess('Profile updated.'); setError(''); },
    onError: (err) => { setError(getErrorMessage(err)); setSuccess(''); },
  });

  const onSubmit = (data: UpdateProfileFormData) => mutation.mutate(data);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-4 pb-4 border-b border-border">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 text-primary text-xl font-bold">
          {user?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{user?.full_name || 'User Profile'}</h1>
          <p className="text-muted-foreground text-sm font-mono">{user?.email}</p>
        </div>
      </div>

      {/* Custom Tabs Navigation */}
      <div className="flex space-x-6 border-b border-border/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'personal'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={16} /> Personal Details
        </button>
        <button
          onClick={() => setActiveTab('mfa')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'mfa'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck size={16} /> Security & MFA
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'sessions'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Laptop size={16} /> Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity size={16} /> Audit Logs
        </button>
      </div>

      <div className="pt-2">
        {/* PERSONAL DETAILS TAB */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
                <CardDescription>Update your personal details here.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" {...register('full_name')} className="bg-background/50" />
                    {errors.full_name && <p className="text-destructive text-sm">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Cannot be changed)</Label>
                    <Input value={user?.email ?? ''} disabled className="bg-background/50 opacity-50" />
                  </div>
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  {success && <p className="text-green-500 text-sm">{success}</p>}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MFA TAB */}
        {activeTab === 'mfa' && (
          <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="text-primary" size={20} /> Two-Factor Authentication
                </CardTitle>
                <CardDescription>Secure your account with a TOTP authenticator app.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-medium text-foreground">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">Not configured</p>
                </div>
                <Button variant="default">Enable 2FA</Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="text-muted-foreground" size={20} /> Backup Codes
                </CardTitle>
                <CardDescription>Generate emergency backup codes if you lose your device.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-medium text-foreground">Status</p>
                  <p className="text-sm text-muted-foreground">No codes generated</p>
                </div>
                <Button variant="outline">Generate Codes</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Laptop className="text-primary" size={20} /> Active Sessions
                </CardTitle>
                <CardDescription>Manage devices currently logged into your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border/50 rounded-lg divide-y divide-border/50 bg-background/50">
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 text-primary rounded-md">
                        <Laptop size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Windows 11 • Chrome</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">192.168.1.1 • Current Session</p>
                      </div>
                    </div>
                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                      Active Now
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="text-primary" size={20} /> Audit Logs
                </CardTitle>
                <CardDescription>Recent security events on your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border/50 rounded-lg overflow-hidden bg-background/50 text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-card/50 border-b border-border/50 font-mono text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Event</th>
                        <th className="px-4 py-3 font-medium">IP Address</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-foreground">user.login</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">192.168.1.1</td>
                        <td className="px-4 py-3 text-muted-foreground">Just now</td>
                      </tr>
                      <tr className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-foreground">user.password_reset_request</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">192.168.1.1</td>
                        <td className="px-4 py-3 text-muted-foreground">2 days ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}