export function ActiveSessionsPanel() {
  const sessions = [
    {
      id: 1,
      device: 'Mac OS • Chrome 126',
      lastActive: 'Just now',
      location: 'Jaipur, India',
      ip: '192.168.1.1',
      isCurrent: true,
    },
    {
      id: 2,
      device: 'Windows 11 • Edge',
      lastActive: '2 hours ago',
      location: 'Mumbai, India',
      ip: '103.45.2.19',
      isCurrent: false,
    },
    {
      id: 3,
      device: 'iOS 17 • Safari',
      lastActive: '3 days ago',
      location: 'Delhi, India',
      ip: '14.139.24.5',
      isCurrent: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[1200px]">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Active Sessions</h1>
          <p className="text-[14px] text-[#8A8F98] leading-relaxed">Manage the devices currently logged into your account.</p>
        </div>
        <button 
          className="px-4 py-2 border border-[#ef4444]/20 bg-[#2a1313] text-[#ef4444] text-[13px] font-medium rounded-md hover:bg-[#3f1919] transition-all"
        >
          Revoke All Others
        </button>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr] px-6 py-4 border-b border-[#1f1f1f] text-[13px] font-medium text-[#8A8F98]">
          <div>Device / Browser</div>
          <div>Location & IP</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        
        <div className="flex flex-col">
          {sessions.map((s, i) => (
            <div key={s.id} className={`grid grid-cols-[2.5fr_2fr_1.5fr_1fr] px-6 py-5 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i !== (sessions.length - 1) ? 'border-b border-[#1f1f1f]' : ''}`}>
              <div className="flex flex-col gap-1">
                <h4 className="text-[14px] font-medium text-white">{s.device}</h4>
                <p className="text-[12px] text-[#8A8F98]">Last active: {s.lastActive}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[14px] text-[#e8e8e8]">{s.location}</p>
                <p className="text-[12px] font-mono text-[#8A8F98]">{s.ip}</p>
              </div>
              <div>
                {s.isCurrent ? (
                  <span className="px-2.5 py-1 bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[11px] font-semibold rounded uppercase tracking-wider">Current Session</span>
                ) : null}
              </div>
              <div>
                {s.isCurrent ? (
                  <button className="px-4 py-1.5 border border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] text-[13px] font-medium rounded-md hover:bg-[#2a2a2a] transition-all">
                    Active
                  </button>
                ) : (
                  <button className="px-4 py-1.5 border border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] text-[13px] font-medium rounded-md hover:border-[rgba(239,68,68,0.2)] hover:text-[#ef4444] transition-all">
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
