import { Link } from 'react-router';
import { RegisterForm } from '../components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Create your account
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Start monitoring in under two minutes.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8 space-y-6">
        <RegisterForm />
      </div>

      <div className="text-center text-sm text-[#555555]">
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Already have an account? <span className="text-[#34d399]">Sign in</span>
        </Link>
      </div>
    </div>
  );
}
