import { Smartphone, Key, MessageSquare, Trash2, Plus } from 'lucide-react';

export function MfaSecurityPanel() {
  const devices = [
    {
      id: 1,
      name: 'Google Authenticator',
      type: 'Mobile App',
      added: 'Jun 12, 2026',
      isDefault: true,
      icon: Smartphone,
      actions: ['Reconfigure'],
    },
    {
      id: 2,
      name: 'YubiKey 5C NFC',
      type: 'Security Key (WebAuthn)',
      added: 'Jan 04, 2026',
      isDefault: false,
      icon: Key,
      actions: ['Make Default', 'Rename'],
    },
    {
      id: 3,
      name: 'SMS Text Message',
      type: 'Ending in ****1234',
      added: 'Jun 12, 2026',
      isDefault: false,
      icon: MessageSquare,
      actions: ['Make Default', 'Update Number'],
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[800px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Two-Factor Authentication</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">Protect your observability data by adding an extra layer of security to your account.</p>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-[16px] font-semibold text-white">MFA Status</h3>
            <span className="px-2 py-0.5 border border-[#10b981] text-[#10b981] text-[10px] font-semibold uppercase tracking-wider rounded">Enabled</span>
          </div>
          <p className="text-[14px] text-[#8A8F98]">Your account is currently protected. MFA is required upon login.</p>
        </div>
        <div>
          <div className="w-12 h-6 bg-[#10b981] rounded-full relative cursor-pointer flex items-center px-1">
            <div className="w-4 h-4 bg-black rounded-full absolute right-1"></div>
          </div>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1f1f1f] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-white">Authentication Devices</h3>
            <p className="text-[13px] text-[#8A8F98] mt-1">Manage your configured authenticators and security keys.</p>
          </div>
          <button className="px-4 py-2 bg-white text-black text-[13px] font-medium rounded-md hover:bg-[#e8e8e8] transition-all flex items-center gap-2">
            <Plus size={16} /> Add Device
          </button>
        </div>
        
        <div className="flex flex-col">
          {devices.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={d.id} className={`px-6 py-6 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i !== (devices.length - 1) ? 'border-b border-[#1f1f1f]' : ''}`}>
                <div className="flex items-center gap-5">
                  <div className="w-[48px] h-[48px] rounded-lg bg-[#0c0c0c] border border-[#1f1f1f] flex items-center justify-center text-[#8A8F98] shrink-0">
                    <Icon size={20} className="stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-[15px] font-medium text-white">{d.name}</h4>
                      {d.isDefault && (
                        <span className="px-2 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-semibold uppercase tracking-wider rounded">Default</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#8A8F98]">
                      {d.type} • Added {d.added}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {d.actions.map((act) => (
                    <button key={act} className="px-4 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] text-[13px] font-medium rounded-md hover:bg-[#2a2a2a] transition-all">
                      {act}
                    </button>
                  ))}
                  <button className="p-2 border border-[#2a2a2a] bg-[#1a1a1a] text-[#8A8F98] rounded-md hover:border-[rgba(239,68,68,0.2)] hover:text-[#ef4444] transition-all flex items-center justify-center">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
