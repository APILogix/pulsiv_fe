export function AuditLogsPanel() {
  const events = [
    { id: 1, event: 'Successful Login', date: '2026-06-28 10:24:23', ip: '192.168.1.1', client: 'Mac OS / Chrome', status: 'normal' },
    { id: 2, event: 'MFA Enabled', date: '2026-06-27 15:30:10', ip: '192.168.1.1', client: 'Mac OS / Chrome', status: 'success' },
    { id: 3, event: 'Failed Login Attempt', date: '2026-06-25 09:12:05', ip: '104.28.14.9', client: 'Windows / Firefox', status: 'warning', ipColor: 'text-[#ef4444]' },
    { id: 4, event: 'Password Changed', date: '2026-06-20 18:45:00', ip: '192.168.1.1', client: 'Mac OS / Chrome', status: 'normal' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[1200px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Security Audit Log</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">A history of security events related to your account.</p>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="grid grid-cols-4 px-6 py-4 border-b border-[#1f1f1f] text-[13px] font-medium text-[#8A8F98]">
          <div>Event</div>
          <div>Date / Time</div>
          <div>IP Address</div>
          <div>Client</div>
        </div>
        
        <div className="flex flex-col">
          {events.map((ev, i) => (
            <div key={ev.id} className={`grid grid-cols-4 px-6 py-5 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i !== (events.length - 1) ? 'border-b border-[#1f1f1f]' : ''}`}>
              <div>
                <p className={`text-[14px] font-medium ${ev.status === 'success' ? 'text-[#10b981]' : ev.status === 'warning' ? 'text-[#f59e0b]' : 'text-[#e8e8e8]'}`}>
                  {ev.event}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-mono text-[#e8e8e8]">{ev.date}</p>
              </div>
              <div>
                <p className={`text-[13px] font-mono ${ev.ipColor ? ev.ipColor : 'text-[#e8e8e8]'}`}>{ev.ip}</p>
              </div>
              <div>
                <p className="text-[13px] font-mono text-[#e8e8e8]">{ev.client}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
