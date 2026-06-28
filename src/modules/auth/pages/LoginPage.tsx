import { Link } from 'react-router';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white mb-2">
          Welcome back
        </h1>
        <p className="text-[15px] text-[#8A8F98]">
          Monitor, debug, and optimize your services.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <button className="w-full flex items-center justify-center gap-2.5 bg-[#141414] border border-[#1f1f1f] hover:bg-white/5 hover:border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-md transition-all">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[18px] h-[18px]">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path>
          </svg>
          Continue with GitHub
        </button>
        <Link
          to="/auth/login/sso"
          className="w-full flex items-center justify-center gap-2.5 bg-[#141414] border border-[#1f1f1f] hover:bg-white/5 hover:border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-md transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Continue with SSO
        </Link>
      </div>

      <div className="flex items-center text-center mb-6">
        <div className="flex-1 border-b border-[#1f1f1f]"></div>
        <span className="px-3 text-[#5C5F66] text-[12px] font-semibold uppercase tracking-wider">
          Or continue with email
        </span>
        <div className="flex-1 border-b border-[#1f1f1f]"></div>
      </div>

      <LoginForm />

      <div className="text-center mt-8 text-sm text-[#8A8F98]">
        Don't have an account? <Link to="/auth/register" className="text-[#10b981] font-medium hover:underline">Sign up</Link>
      </div>
    </div>
  );
}
