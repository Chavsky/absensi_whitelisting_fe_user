import React, { useState } from 'react';
import { 
  User, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Info,
  Server,
  Lock,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../auth/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { isInstalled } = usePWAInstall();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Profil &amp; Perangkat
        </h2>
        <p className="text-xs text-slate-500">
          Informasi identitas dan otorisasi sesi perangkat
        </p>
      </div>

      {/* Main Employee Card */}
      <Card className="p-5 bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
            <User className="w-7 h-7 text-blue-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {user.fullName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono-numbers">
              <span className="font-semibold text-slate-500">NIK:</span>
              <span>{user.nik}</span>
            </div>
            {user.role && (
              <Badge variant="info" size="sm">
                {user.role}
              </Badge>
            )}
          </div>
        </div>

        {user.department && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Departemen / Unit
            </span>
            <span className="font-semibold text-slate-800 text-right">{user.department}</span>
          </div>
        )}
      </Card>

      {/* Device & Session Authorization Card */}
      <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>Otorisasi Perangkat</span>
          </div>
          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
            Terdaftar
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Sesi perangkat</span>
            <span className="text-emerald-700 font-semibold text-[11px]">
              Aktif menurut verifikasi backend
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Akses saat ini</span>
            <span className="text-slate-700 font-medium text-right text-[11px]">
              {isInstalled ? 'PWA Standalone (Layar Utama)' : 'Web Browser Mobile'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Identifikasi perangkat</span>
            <span className="text-slate-700 font-medium text-right text-[11px]">
              Tidak memverifikasi hardware secara mutlak
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Autentikasi</span>
            <span className="text-slate-700 font-medium text-right text-[11px] flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Cookie HttpOnly dikelola browser
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Status Jaringan</span>
            <span className="text-slate-700 font-medium text-right text-[11px] flex items-center gap-1">
              <Server className="w-3 h-3 text-slate-400" />
              Local On-Premise Network
            </span>
          </div>
        </div>

        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Status sesi mengikuti hasil pemeriksaan profile dari backend. Nama perangkat atau identitas hardware tidak tersedia dari data profile yang digunakan aplikasi ini.
          </p>
        </div>
      </Card>

      {/* Diagnostics / Device Info Accordion */}
      <Card className="p-3.5 bg-white border border-slate-200/90 shadow-2xs">
        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>Informasi Teknis Perangkat</span>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDiagnostics ? 'rotate-90' : ''}`} />
        </button>

        {showDiagnostics && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600 animate-in fade-in duration-150 font-mono-numbers">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">User Agent:</span>
              <span className="truncate max-w-[200px]" title={navigator.userAgent}>
                {navigator.userAgent}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Zona Waktu Klien:</span>
              <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Protokol:</span>
              <span>{window.location.protocol.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Cookie Otorisasi:</span>
              <span className="text-slate-700 font-bold">Dikelola browser (HttpOnly)</span>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};
