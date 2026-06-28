import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { authApi } from '../../api/auth.api';
import { toast } from 'sonner';

export function BackupCodesPanel() {
  const codes = [
    'A8F2-B9K1-Z3', 'X7P4-L2M9-Q5',
    'C1R8-T5Y2-W6', 'N9E3-H7V1-D4',
    'J5G2-F8U9-S1', 'K3M6-P2L8-X7',
    'Q1W9-Y5T2-R8', 'Z4B1-K9F2-A8',
    'S6U9-G2H5-J1', 'D8V1-E3N9-C4',
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[800px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Backup Codes</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">Use these codes if you lose access to your two-factor authentication device.</p>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1f1f1f] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-white">Generated Codes</h3>
            <p className="text-[13px] text-[#8A8F98] mt-1">10 of 10 codes remaining. Each code can be used once.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-transparent text-[#e8e8e8] border border-[#2a2a2a] text-[13px] font-medium rounded-md hover:bg-[#1a1a1a] transition-all">
              Print
            </button>
            <button className="px-4 py-2 bg-[#1a1a1a] text-[#e8e8e8] border border-[#2a2a2a] text-[13px] font-medium rounded-md hover:bg-[#2a2a2a] transition-all">
              Regenerate
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-8">
            <div className="grid grid-cols-2 gap-y-4 gap-x-12 max-w-[600px] mx-auto">
              {codes.map((bc, i) => (
                <div key={i} className="text-center">
                  <code className="text-[14px] font-mono text-[#e8e8e8] tracking-[3px]">{bc}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
