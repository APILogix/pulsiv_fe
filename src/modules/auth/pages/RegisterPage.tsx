import { Link } from 'react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { RegisterForm } from '../components/RegisterForm';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

export default function RegisterPage() {
  const [socialProvider, setSocialProvider] = useState<string | null>(null);

  async function startSocialLogin(provider: 'github' | 'google') {
    setSocialProvider(provider);
    try {
      const result = await authApi.socialLogin(provider);
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSocialProvider(null);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">
          Create an account
        </h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">
          Start monitoring your global infrastructure in seconds.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <button
          type="button"
          disabled={socialProvider !== null}
          onClick={() => startSocialLogin('github')}
          className="w-full flex items-center justify-center gap-2.5 bg-transparent text-white border border-[#1f1f1f] text-[14px] font-medium p-3 rounded-lg hover:bg-white/5 hover:border-[#2a2a2a] transition-all disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[18px] h-[18px]"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path></svg>
          {socialProvider === 'github' ? 'Redirecting...' : 'Sign up with GitHub'}
        </button>
        <button
          type="button"
          disabled={socialProvider !== null}
          onClick={() => startSocialLogin('google')}
          className="w-full flex items-center justify-center gap-2.5 bg-transparent text-white border border-[#1f1f1f] text-[14px] font-medium p-3 rounded-lg hover:bg-white/5 hover:border-[#2a2a2a] transition-all disabled:opacity-60"
        >
          <span className="text-[15px] font-semibold">G</span>
          {socialProvider === 'google' ? 'Redirecting...' : 'Sign up with Google'}
        </button>
      </div>

      <div className="flex items-center text-center mb-6">
        <div className="flex-1 border-b border-[#1f1f1f]"></div>
        <span className="px-3 text-[#5C5F66] text-[11px] font-semibold uppercase tracking-[0.05em]">
          Or register with email
        </span>
        <div className="flex-1 border-b border-[#1f1f1f]"></div>
      </div>

      <RegisterForm />

      <div className="text-center mt-8 text-[13px] text-[#8A8F98]">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-[#10b981] font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
