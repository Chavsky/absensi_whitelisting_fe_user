import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Filter, 
  RefreshCw, 
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AttendanceRecord, AttendanceHistoryResult } from '../../types';
import { api } from '../../services/api';
import { formatTimeWithWIB, getJakartaDateISO } from '../../utils/date';

const STATUS_HADIR = 'Hadir';
const STATUS_TIDAK_HADIR = 'Tidak Hadir';

/**
 * Effective status comes straight from the Backend history response
 * (latest Admin correction already applied server-side). The frontend never
 * recomputes corrections and never infers status from the presence of a
 * timestamp. Unknown or unavailable statuses fall back to a neutral badge
 * showing the raw value instead of fabricating Hadir/Tidak Hadir.
 */
function statusBadge(record: AttendanceRecord): React.ReactNode {
  if (record.status === STATUS_HADIR) {
    return (
      <Badge
        variant="success"
        size="sm"
        icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
      >
        Hadir
      </Badge>
    );
  }
  if (record.status === STATUS_TIDAK_HADIR) {
    return (
      <Badge
        variant="danger"
        size="sm"
        icon={<AlertCircle className="w-3 h-3 text-rose-600" />}
      >
        Tidak Hadir
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" size="sm">
      {record.status}
    </Badge>
  );
}

export const HistoryPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeRecordDetail, setActiveRecordDetail] = useState<AttendanceRecord | null>(null);

  const limit = 10;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AttendanceHistoryResult>({
    queryKey: ['attendanceHistory', selectedDate, currentPage],
    queryFn: () => api.getAttendanceHistory({
      date: selectedDate || undefined,
      page: currentPage,
      limit,
    }),
    staleTime: 10000,
  });

  const records = data?.records || [];
  const pagination = data?.pagination || {
    page: 1,
    limit,
    totalRecords: 0,
    totalPages: 1,
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleQuickFilterToday = () => {
    const today = getJakartaDateISO();
    handleDateChange(today);
  };

  const handleResetFilter = () => {
    handleDateChange('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Title & Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Riwayat Presensi
          </h2>
          <p className="text-xs text-slate-500">
            Catatan kehadiran resmi yang tersimpan di server
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs"
          title="Segarkan riwayat"
          aria-label="Segarkan riwayat"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Date Filter & Preset Chips */}
      <Card className="p-3 bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div className="flex-1 relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Pilih tanggal riwayat"
            />
          </div>
          {selectedDate && (
            <button
              onClick={handleResetFilter}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-2 rounded-lg shrink-0 transition"
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
          <span className="text-slate-400 font-medium">Filter Cepat:</span>
          <button
            type="button"
            onClick={handleResetFilter}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              !selectedDate
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={handleQuickFilterToday}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              selectedDate === getJakartaDateISO()
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2.5 py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 flex items-center justify-between"
            >
              <div className="space-y-2 w-2/3">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="h-6 bg-slate-100 rounded-lg w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <Card className="p-6 text-center space-y-3 bg-white">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-900">Gagal Mengambil Data Riwayat</p>
            <p className="text-xs text-slate-500">
              {(error as any)?.message || 'Terjadi kesalahan saat menghubungi server absensi.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="action"
            onClick={() => refetch()}
            className="text-xs px-4 py-2"
          >
            Coba Lagi
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && records.length === 0 && (
        <Card className="p-8 text-center space-y-3 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-xs mx-auto">
            <p className="text-sm font-bold text-slate-900">Belum Ada Catatan Presensi</p>
            <p className="text-xs text-slate-500">
              {selectedDate
                ? 'Tidak ditemukan catatan kehadiran pada tanggal yang dipilih.'
                : 'Belum ada data kehadiran yang tercatat untuk akun ini.'}
            </p>
          </div>
          {selectedDate && (
            <button
              onClick={handleResetFilter}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-lg transition"
            >
              Tampilkan Semua Tanggal
            </button>
          )}
        </Card>
      )}

      {/* Records List */}
      {!isLoading && !isError && records.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1 text-[11px] text-slate-500">
            <span>Menampilkan <strong>{records.length}</strong> dari <strong>{pagination.totalRecords}</strong> data</span>
            <span>Halaman {pagination.page} dari {pagination.totalPages}</span>
          </div>

          {records.map((record) => (
            <Card
              key={record.id}
              onClick={() => setActiveRecordDetail(record)}
              className="p-3.5 bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {record.sessionName}
                    </span>
                    {statusBadge(record)}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {record.date}
                    </span>
                    {record.status === STATUS_HADIR && (
                      <span className="flex items-center gap-1 font-mono-numbers font-medium text-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimeWithWIB(record.timestamp)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-mono-numbers text-slate-400 uppercase">
                    ID: {record.id.slice(-6)}
                  </span>
                  <Info className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-2 flex items-center justify-between">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage(Math.max(1, pagination.page - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                className="text-xs px-3 py-1.5"
              >
                Sebelumnya
              </Button>

              <span className="text-xs text-slate-600 font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, pagination.page + 1))}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="text-xs px-3 py-1.5"
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {activeRecordDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detail Presensi Tercatat</h3>
                  <p className="text-[11px] text-slate-500">Verifikasi Resmi Server</p>
                </div>
              </div>
              <button
                onClick={() => setActiveRecordDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Tutup detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Card variant="subtle" className="p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">ID Record</span>
                <span className="font-mono-numbers font-semibold text-slate-900">{activeRecordDetail.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Sesi Presensi</span>
                <span className="font-bold text-blue-600">{activeRecordDetail.sessionName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-medium text-slate-800">{activeRecordDetail.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Status Kehadiran</span>
                {statusBadge(activeRecordDetail)}
              </div>
              {activeRecordDetail.status === STATUS_HADIR ? (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Waktu Server</span>
                  <span className="font-mono-numbers font-bold text-slate-900">{formatTimeWithWIB(activeRecordDetail.timestamp)}</span>
                </div>
              ) : (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Waktu Kehadiran</span>
                  <span className="font-mono-numbers font-medium text-slate-500">-</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Status Validasi</span>
                <Badge variant="success" size="sm">Resmi &amp; Valid</Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Otorisasi Perangkat</span>
                <span className="font-mono-numbers text-[11px] text-slate-600">-</span>
              </div>
            </Card>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveRecordDetail(null)}
              className="w-full text-xs font-semibold"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
