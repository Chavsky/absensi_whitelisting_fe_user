import React from 'react';
import { ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus, useApiAvailability } from '../../hooks/useOnlineStatus';

export const TopHeader: React.FC = () => {
  const isOnline = useOnlineStatus();
  const apiStatus = useApiAvailability();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 py-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              ABSENSI KARYAWAN
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
              Portal On-Premise Kantor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-600" />
              <span>Internet</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[11px] font-semibold text-rose-700">
              <WifiOff className="w-3 h-3 text-rose-600" />
              <span>Offline</span>
            </div>
          )}
          <div className={`px-2 py-1 rounded-full border text-[11px] font-semibold ${apiStatus === 'available' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : apiStatus === 'checking' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            API {apiStatus === 'available' ? 'tersedia' : apiStatus === 'checking' ? 'memeriksa' : 'tidak tersedia'}
          </div>
        </div>
      </div>
    </header>
  );
};
