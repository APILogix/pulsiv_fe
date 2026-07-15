import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useLoginBackupCode } from '../hooks/useLoginBackupCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function BackupCodesPage() {
  const [code, setCode] = useState('');
  const location = useLocation();
  const challengeId = location.state?.challengeId || '';
  const { mutate: loginBackupCode, isPending } = useLoginBackupCode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginBackupCode({ code, challenge_id: challengeId });
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Use a backup code
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Enter one of your 20-character emergency recovery codes.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Input
              id="code"
              type="text"
              placeholder="XXXXXXXXXXXXXXXXXXXX"
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toLowerCase())}
              required
              maxLength={20}
              className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors disabled:opacity-50"
            disabled={isPending || code.length !== 20}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
                Verifying...
              </span>
            ) : 'Verify backup code'}
          </Button>
        </form>
      </div>

      <div className="text-center text-sm text-[#555555]">
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
