import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useOfficeConnectivity } from '../hooks/useOfficeConnectivity';
import { OfficeGuardPage } from '../features/office-guard/OfficeGuardPage';
import { MobileShell } from '../components/layout/MobileShell';
import { ActivationPage } from '../features/activation/ActivationPage';
import { RecoveryPage } from '../features/recovery/RecoveryPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, authStatus, authMessage, pendingAction, checkSession, retryProfile } = useAuth();
  const officeStatus = useOfficeConnectivity();

  // Pemulihan sesi otomatis: bila koneksi kantor kembali setelah terputus,
  // periksa SEKALI apakah sesi pegawai masih valid menggunakan mekanisme
  // autentikasi yang sudah ada (checkSession). Sesi valid → dashboard kembali
  // tanpa aktivasi ulang; sesi tidak valid → alur unauthenticated/aktivasi
  // yang sudah ada. Cookie tidak pernah disentuh dari sisi frontend.
  const wasDisconnected = useRef(false);
  useEffect(() => {
    if (officeStatus === 'disconnected') {
      wasDisconnected.current = true;
      return;
    }
    if (officeStatus === 'connected' && wasDisconnected.current) {
      wasDisconnected.current = false;
      void checkSession().catch(() => undefined);
    }
  }, [officeStatus, checkSession]);

  // Splash hanya untuk pemeriksaan sesi awal. Selama mutasi (aktivasi/recovery)
  // isLoading juga true, tetapi authStatus tetap 'unauthenticated'/'profile-pending'
  // sehingga halaman yang sedang memproses TIDAK di-unmount dan pesan errornya
  // tetap tampil.
  if ((isLoading && authStatus === 'checking') || officeStatus === 'checking') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-xl mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-base font-bold tracking-tight">Sistem Absensi Karyawan</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">Portal On-Premise Jaringan Kantor</p>
        <div className="flex items-center gap-2 text-xs text-blue-400 font-medium bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Memeriksa otorisasi perangkat...</span>
        </div>
      </div>
    );
  }

  // Backend kantor tidak terjangkau: blokir seluruh halaman (dashboard,
  // absensi, aktivasi) dan tampilkan halaman pembatasan. Data absensi cache
  // tidak pernah tampil karena dashboard tidak dirender sama sekali.
  if (officeStatus === 'disconnected') {
    return <OfficeGuardPage />;
  }

  if (!isAuthenticated && (authStatus === 'unavailable' || authStatus === 'profile-pending')) {
    const profilePending = authStatus === 'profile-pending';
    const retry = profilePending ? retryProfile : checkSession;
    return (
      <MobileShell showNav={false}>
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4" role="alert">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {profilePending
                  ? pendingAction?.confirmed ? 'Aktivasi/pemulihan terkonfirmasi' : 'Status aktivasi/pemulihan belum dipastikan'
                  : 'Server belum dapat memeriksa sesi'}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                {authMessage || 'Profile belum tersedia. Coba periksa kembali koneksi ke server kantor.'}
              </p>
            </div>
            <Button
              type="button"
              variant="action"
              className="w-full"
              isLoading={isLoading}
              onClick={() => { void retry().catch(() => undefined); }}
            >
              Coba periksa session lagi
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell showNav={isAuthenticated}>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/riwayat" element={<HistoryPage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/pemulihan" element={<RecoveryPage />} />
            <Route path="/aktivasi" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/aktivasi" element={<ActivationPage />} />
            <Route path="/pemulihan" element={<RecoveryPage />} />
            <Route path="*" element={<Navigate to="/aktivasi" replace />} />
          </>
        )}
      </Routes>
    </MobileShell>
  );
};
