import { Link } from 'react-router';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Sign in to your account
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Monitor, debug, and optimize your services.
          </p>
        </div>
      </div>

      {/* Auth card */}
      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8 space-y-6">
        <LoginForm />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#262626]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#111111] px-3 text-[#555555] font-mono uppercase tracking-wider">or</span>
          </div>
        </div>

        {/* SSO */}
        <Link
          to="/auth/login/sso"
          className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-[#333333] bg-[#161616] text-sm text-[#e8e8e8] hover:border-[#555555] hover:bg-[#1e1e1e] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Continue with SSO
        </Link>
      </div>

      {/* Footer links */}
      <div className="flex flex-col items-center gap-2 text-sm text-[#555555]">
        <Link to="/auth/register" className="hover:text-[#999999] transition-colors">
          Don&apos;t have an account? <span className="text-[#34d399]">Sign up</span>
        </Link>
        <Link to="/auth/forgot-password" className="hover:text-[#999999] transition-colors">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
