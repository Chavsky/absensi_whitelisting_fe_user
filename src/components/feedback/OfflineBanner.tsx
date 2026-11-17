import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className="bg-amber-500 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 shadow-md sticky top-0 z-50 animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
        <span>Koneksi perangkat terputus. Presensi memerlukan jaringan aktif; tidak ada presensi offline.</span>
      </div>
      <div className="shrink-0 flex items-center gap-1 bg-amber-600/50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
        <AlertTriangle className="w-3 h-3" />
        Offline
      </div>
    </div>
  );
};
