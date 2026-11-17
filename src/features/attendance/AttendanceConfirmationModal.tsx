import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Calendar, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AttendanceSessionType, EmployeeUser } from '../../types';
import { getIndonesianDate, getIndonesianTime } from '../../utils/date';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface AttendanceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: AttendanceSessionType;
  sessionTitle: string;
  user: EmployeeUser;
  onConfirm: (sessionType: AttendanceSessionType) => Promise<{ success: boolean; recordedTime: string | null }>;
}

export const AttendanceConfirmationModal: React.FC<AttendanceConfirmationModalProps> = ({
  isOpen,
  onClose,
  sessionType,
  sessionTitle,
  user,
  onConfirm,
}) => {
  const isOnline = useOnlineStatus();
  const [currentTime, setCurrentTime] = useState<string>(getIndonesianTime(new Date(), true));
  const [currentDate] = useState<string>(getIndonesianDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ recordedTime: string | null } | null>(null);

  // Live ticking clock in modal
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(getIndonesianTime(new Date(), true));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessInfo(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isOnline) {
      setErrorMsg('Koneksi terputus. Absensi tidak dapat dilakukan saat perangkat offline.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onConfirm(sessionType);
      setSuccessInfo({ recordedTime: res.recordedTime });
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim konfirmasi absensi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div 
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Konfirmasi Absensi
              </h3>
              <p className="text-[11px] text-slate-500">
                Perekaman Kehadiran Resmi
              </p>
            </div>
          </div>
          {!isSubmitting && !successInfo && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Success View */}
        {successInfo ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in-75 duration-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Absensi Berhasil Tercatat
              </h4>
              <p className="text-xs text-slate-500">
                Data presensi sesi <strong>{sessionTitle}</strong> telah dikonfirmasi backend.
              </p>
            </div>
            {successInfo.recordedTime && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-800 font-mono-numbers font-semibold">
                Waktu Server: {successInfo.recordedTime} WIB
              </div>
            )}
          </div>
        ) : (
          /* Confirmation Content */
          <div className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {!isOnline && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Sistem tidak mendukung absensi offline. Sambungkan perangkat ke jaringan kantor untuk melanjutkan.
                </span>
              </div>
            )}

            {/* Attendance Details Grid */}
            <Card variant="subtle" className="p-3.5 space-y-2.5">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/70">
                <span className="text-slate-500">Nama Karyawan</span>
                <span className="font-bold text-slate-900 text-right">{user.fullName}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/70">
                <span className="text-slate-500">NIK</span>
                <span className="font-mono-numbers font-semibold text-slate-800">{user.nik}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/70">
                <span className="text-slate-500">Sesi Presensi</span>
                <span className="font-bold text-blue-600">{sessionTitle}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/70">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal
                </span>
                <span className="font-medium text-slate-800">{currentDate}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Waktu Kirim
                </span>
                <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                  {currentTime} WIB
                </span>
              </div>
            </Card>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Dengan mengklik konfirmasi, waktu kehadiran resmi akan langsung dikirim dan diverifikasi oleh backend absensi kantor.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full"
              >
                Kembali
              </Button>
              <Button
                variant="action"
                size="md"
                onClick={handleConfirm}
                isLoading={isSubmitting}
                disabled={!isOnline}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full"
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
