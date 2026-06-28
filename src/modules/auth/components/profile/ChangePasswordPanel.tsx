import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormData } from '../../schemas/auth.schema';
import { useChangePassword } from '../../hooks/useChangePassword';
import { Input } from '@/components/ui/input';

export function ChangePasswordPanel() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const { mutate: changePassword, isPending } = useChangePassword();

  const onSubmit = (data: ChangePasswordFormData) => changePassword(data, {
    onSuccess: () => reset()
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[800px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Change Password</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">Ensure your account is using a long, random password to stay secure.</p>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1f1f1f]">
          <h3 className="text-[16px] font-semibold text-white">Update Password</h3>
        </div>
        <div className="p-6">
          <form id="password-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-[400px]">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#8A8F98]">Current Password</label>
              <Input 
                type="password" 
                {...register('current_password')} 
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white text-[14px] px-3.5 py-2.5 rounded-md focus:border-[#10b981] h-auto" 
              />
              {errors.current_password && <p className="text-[#ef4444] text-xs mt-1">{errors.current_password.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#8A8F98]">New Password</label>
              <Input 
                type="password" 
                {...register('new_password')} 
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white text-[14px] px-3.5 py-2.5 rounded-md focus:border-[#10b981] h-auto" 
              />
              {errors.new_password && <p className="text-[#ef4444] text-xs mt-1">{errors.new_password.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#8A8F98]">Confirm New Password</label>
              <Input 
                type="password" 
                {...register('confirm_new_password')} 
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white text-[14px] px-3.5 py-2.5 rounded-md focus:border-[#10b981] h-auto" 
              />
              {errors.confirm_new_password && <p className="text-[#ef4444] text-xs mt-1">{errors.confirm_new_password.message}</p>}
            </div>
          </form>
        </div>
        <div className="px-6 py-4 bg-[#111111] border-t border-[#1f1f1f] flex justify-end">
          <button 
            type="submit" 
            form="password-form"
            disabled={isPending}
            className="px-4 py-2.5 bg-white text-[#0c0c0c] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
