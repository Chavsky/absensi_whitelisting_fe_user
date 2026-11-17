import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  CircleDot, 
  Clock, 
  RefreshCw,
  User,
  ShieldCheck,
  Building2,
  CalendarDays,
  CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/AuthContext';
import { AttendanceConfirmationModal } from '../attendance/AttendanceConfirmationModal';
import { AttendanceSessionType, AttendanceTodayData } from '../../types';
import { getIndonesianDate, getIndonesianTime } from '../../utils/date';
import { api } from '../../services/api';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // Real-time ticking clock (Asia/Jakarta / WIB)
  const [currentTime, setCurrentTime] = useState<string>(getIndonesianTime(new Date(), true));
  const [currentDate, setCurrentDate] = useState<string>(getIndonesianDate(new Date()));

  // Toast feedback state
  const [successToast, setSuccessToast] = useState<{
    sessionTitle: string;
    recordedTime: string | null;
  } | null>(null);

  // Active modal session
  const [activeModalSession, setActiveModalSession] = useState<{
    type: AttendanceSessionType;
    title: string;
  } | null>(null);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(getIndonesianTime(now, true));
      setCurrentDate(getIndonesianDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // TanStack Query for today's attendance
  const { data: todayData, isLoading: isLoadingData, isError: isAttendanceLoadError, refetch, isRefetching } = useQuery<AttendanceTodayData>({
    queryKey: ['attendanceToday'],
    queryFn: () => api.getAttendanceToday(),
    staleTime: 10000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (
      activeModalSession &&
      todayData &&
      !todayData.some((session) =>
        session.sesi === activeModalSession.type && session.isEnabled && session.canAttend
      )
    ) {
      setActiveModalSession(null);
    }
  }, [activeModalSession, todayData]);

  // TanStack Query mutation for recording attendance
  const attendanceMutation = useMutation({
    mutationFn: (sessionType: AttendanceSessionType) => api.recordAttendance(sessionType),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendanceToday'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['attendanceHistory'], refetchType: 'all' }),
      ]);
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendanceToday'], refetchType: 'all' });
    },
  });

  const handleOpenAttendanceModal = (sessionType: AttendanceSessionType, title: string) => {
    setActiveModalSession({
      type: sessionType,
      title,
    });
  };

  const handleConfirmAttendance = async (sessionType: AttendanceSessionType) => {
    const result = await attendanceMutation.mutateAsync(sessionType);
    let recordedTime: string | null = null;

    try {
      const todayRecords = await queryClient.fetchQuery({
        queryKey: ['attendanceToday'],
        queryFn: () => api.getAttendanceToday(),
        staleTime: 0,
      });
      const serverRecord = todayRecords.find((record) => record.id === result.id && record.sesi === sessionType && record.status === 'Hadir');
      if (serverRecord?.waktuAbsen && !Number.isNaN(Date.parse(serverRecord.waktuAbsen))) {
        recordedTime = getIndonesianTime(new Date(serverRecord.waktuAbsen), true);
      }
    } catch {
      // The validated create response already confirms success; time is optional
      // when the follow-up read is unavailable.
    }

    const sessionTitle = todayData?.find((record) => record.sesi === sessionType)?.name
      || sessionType;
    setSuccessToast({ sessionTitle, recordedTime });
    setTimeout(() => setSuccessToast(null), 5000);
    return {
      success: true,
      recordedTime,
    };
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Success Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
            <div className="text-xs min-w-0">
              <p className="font-bold">Presensi Berhasil Diterima Server!</p>
              <p className="text-emerald-100 truncate">
                Sesi <strong>{successToast.sessionTitle}</strong>{successToast.recordedTime ? ` tercatat pukul ${successToast.recordedTime} WIB` : ' telah dikonfirmasi backend'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-200 hover:text-white p-1 text-xs shrink-0 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 1. Identity & Department Card */}
      <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono-numbers">
                <span className="font-semibold text-slate-700">NIK:</span>
                <span>{user.nik}</span>
              </div>
              {user.department && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{user.department}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="info" size="sm" icon={<ShieldCheck className="w-3 h-3 text-blue-600" />}>
              Perangkat Aktif
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2. Live Time & Date Card */}
      <Card className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white border-none shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <span>{currentDate}</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoadingData || isRefetching}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition hover:bg-slate-700/50"
            title="Segarkan data presensi"
            aria-label="Segarkan data presensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData || isRefetching ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="space-y-0.5">
            <div className="text-3xl font-bold tracking-tight font-mono-numbers text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-400 shrink-0" />
              <span>{currentTime}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Waktu Indonesia Barat (WIB) &bull; Asia/Jakarta
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Section Header: Ringkasan Absensi Hari Ini */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Sesi Presensi Hari Ini
          </h3>
          <p className="text-[11px] text-slate-500">
            Sesi kerja dan jam absensi yang ditetapkan server
          </p>
        </div>
      </div>

      {isAttendanceLoadError && !todayData && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          Status presensi hari ini tidak dapat dimuat dari server. Tidak ada data lokal yang ditampilkan. Periksa koneksi atau hubungi admin sebelum presensi.
        </div>
      )}

      {isLoadingData && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Memuat sesi presensi hari ini...
        </p>
      )}
      {!isLoadingData && !isAttendanceLoadError && todayData?.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Tidak ada sesi absensi hari ini. Sesi hanya tersedia pada hari kerja yang ditetapkan server.
        </p>
      )}

      <div className="space-y-2.5">
        {todayData?.map((sessionState) => {
          const sessionKey = sessionState.sesi;
          const Icon = Clock;
          const isRecorded = sessionState?.status === 'Hadir';
          const serverTime = sessionState?.waktuAbsen;
          const recordedTime = serverTime && !Number.isNaN(Date.parse(serverTime))
            ? getIndonesianTime(new Date(serverTime), false)
            : null;

          return (
            <Card
              key={sessionKey}
              className={`p-3.5 transition-all duration-150 ${
                isRecorded 
                  ? 'bg-white border-emerald-200/90 shadow-2xs' 
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isRecorded
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                        {sessionState.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {sessionState.startTime}–{sessionState.endTime} WIB · Senin–Jumat
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {isRecorded ? (
                    <div className="flex flex-col items-end">
                      <Badge
                        variant="success"
                        size="sm"
                        icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      >
                        Sudah Absen
                      </Badge>
                      <span className="text-[11px] font-mono-numbers font-semibold text-slate-700 mt-1">
                        {recordedTime ? `${recordedTime} WIB` : 'Waktu tidak tersedia'}
                      </span>
                    </div>
                  ) : !sessionState.isEnabled ? (
                    <Badge variant="neutral" size="sm">Sesi dinonaktifkan</Badge>
                  ) : sessionState.status === 'Tidak Hadir' ? (
                    <Badge variant="danger" size="sm">Tidak Hadir</Badge>
                  ) : !sessionState.canAttend ? (
                    <Badge variant="neutral" size="sm">Di luar jam sesi</Badge>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="neutral"
                        size="sm"
                        icon={<CircleDot className="w-3 h-3 text-slate-400" />}
                      >
                        Belum Absen
                      </Badge>
                      <Button
                        size="sm"
                        variant="action"
                        onClick={() => handleOpenAttendanceModal(sessionKey, sessionState.name)}
                        disabled={!isOnline || attendanceMutation.isPending}
                        className="text-[11px] px-3 py-1 mt-0.5"
                      >
                        Lakukan Absen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {activeModalSession && (
        <AttendanceConfirmationModal
          isOpen={!!activeModalSession}
          onClose={() => setActiveModalSession(null)}
          sessionType={activeModalSession.type}
          sessionTitle={activeModalSession.title}
          user={user}
          onConfirm={handleConfirmAttendance}
        />
      )}
    </div>
  );
};
