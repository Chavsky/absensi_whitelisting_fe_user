/** Centralized API client for the Employee PWA. Session cookies are managed by
 * the browser; this client never reads or persists authentication tokens.
 */
import {
  EmployeeUser,
  AttendanceTodayData,
  AttendanceRecord,
  AttendanceCreateResult,
  AttendanceSessionType,
  DeviceActivationPayload,
  DeviceActivationResult,
  EmployeeProfileDto,
  SessionRecoveryPayload,
  SessionRecoveryResult,
  AttendanceHistoryResult,
} from '../types';

export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');
const REQUEST_TIMEOUT_MS = 10000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDateString(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isAttendanceSession(value: unknown): value is AttendanceSessionType {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value);
}

function mapAttendanceHistoryRecord(value: unknown): AttendanceRecord {
  if (!isObject(value)) throw new ApiError('Data riwayat dari server tidak valid.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE');
  const id = value.id;
  const dateValue = value.tanggal;
  const sessionType = value.sessionKey ?? value.sesi;
  const timestamp = value.waktuAbsen;
  const status = value.status;
  const sessionName = value.sessionName;
  const date = typeof dateValue === 'string' ? dateValue.slice(0, 10) : '';
  if (
    typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 ||
    typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(dateValue) ||
    !isValidCalendarDate(date) ||
    !isAttendanceSession(sessionType) ||
    !isValidDateString(timestamp) ||
    !isNonEmptyString(status) ||
    (sessionName !== undefined && !isNonEmptyString(sessionName))
  ) {
    throw new ApiError('Data riwayat dari server tidak valid.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE', value);
  }
  return {
    id: String(id),
    sessionType,
    sessionName: typeof sessionName === 'string' ? sessionName : sessionType,
    date,
    timestamp,
    status,
  };
}

function mapAttendanceHistoryPagination(value: unknown): AttendanceHistoryResult['pagination'] {
  if (!isObject(value)) throw new ApiError('Metadata pagination riwayat tidak valid.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE');
  const page = value.page;
  const limit = value.limit;
  const total = value.total;
  const totalPages = value.totalPages;
  if (
    typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1 ||
    typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 ||
    typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0 ||
    typeof totalPages !== 'number' || !Number.isSafeInteger(totalPages) || totalPages < 0
  ) {
    throw new ApiError('Metadata pagination riwayat tidak valid.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE', value);
  }
  return { page, limit, totalRecords: total, totalPages };
}

export class ApiError extends Error {
  constructor(message: string, public statusCode = 500, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStandardErrorMessage(status: number, serverMsg?: string): string {
  if (serverMsg) return serverMsg;
  switch (status) {
    case 400: return 'Data permintaan tidak valid. Periksa kembali isian Anda.';
    case 401: return 'Sesi perangkat telah berakhir atau belum terdaftar. Silakan lakukan aktivasi perangkat.';
    case 403: return 'Akses ditolak. Perangkat ini tidak memiliki otorisasi untuk tindakan ini.';
    case 409: return 'Konflik: tindakan ini sudah pernah tercatat.';
    case 422: return 'Data yang dimasukkan tidak valid. Periksa kembali isian Anda.';
    case 500: return 'Terjadi gangguan pada server kantor. Silakan hubungi Administrator IT.';
    default: return `Permintaan gagal dengan status ${status}`;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    throw new ApiError(
      timedOut ? 'Waktu koneksi ke server habis. Presensi tidak tercatat; silakan coba lagi secara manual.' : 'Tidak dapat terhubung ke server kantor. Periksa jaringan dan coba lagi secara manual.',
      0,
      timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: any = null;
  if (res.headers.get('content-type')?.includes('application/json')) {
    try { body = await res.json(); } catch { body = null; }
  }
  if (!res.ok) {
    throw new ApiError(getStandardErrorMessage(res.status, body?.message || body?.error), res.status, body?.code, body);
  }
  return (body?.data !== undefined ? body.data : body) as T;
}

const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  headers: { Accept: 'application/json', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

export const api = {
  async checkAvailability(): Promise<void> {
    // No health route is documented in this workspace. A response from the
    // existing session endpoint (including 401) proves the API answered.
    const response = await request('/api/users/me', { method: 'GET', headers: { Accept: 'application/json' } });
    if (response.status === 404 || response.status >= 500) {
      throw new ApiError('API belum tersedia.', response.status, 'API_UNAVAILABLE');
    }
  },
  async getMe(): Promise<EmployeeUser> {
    const data = await handleResponse<unknown>(await request('/api/users/me', { method: 'GET', headers: { Accept: 'application/json' } }));
    if (!isObject(data)) throw new ApiError('Data profile dari server tidak valid.', 502, 'INVALID_PROFILE');
    const profile: EmployeeProfileDto = {
      nik: typeof data.nik === 'string' ? data.nik : '',
      namaLengkap: typeof data.namaLengkap === 'string' ? data.namaLengkap : '',
    };
    if (!isNonEmptyString(profile.nik) || !isNonEmptyString(profile.namaLengkap)) {
      throw new ApiError('Data profile dari server tidak valid.', 502, 'INVALID_PROFILE', data);
    }
    return { nik: profile.nik.trim(), fullName: profile.namaLengkap.trim() };
  },
  async activateDevice(payload: DeviceActivationPayload): Promise<DeviceActivationResult> {
    const data = await handleResponse<unknown>(await request('/api/devices/activate', json('POST', payload)));
    if (
      !isObject(data) ||
      data.nik !== payload.nik ||
      data.status !== 'active' ||
      !isValidDateString(data.activatedAt) ||
      !(data.expiresAt === null || isValidDateString(data.expiresAt))
    ) {
      throw new ApiError('Server merespons aktivasi dengan data yang tidak valid.', 502, 'INVALID_ACTIVATION_RESPONSE', data);
    }
    return { nik: payload.nik, status: 'active', activatedAt: data.activatedAt, expiresAt: data.expiresAt };
  },
  async recoverSession(payload: SessionRecoveryPayload): Promise<SessionRecoveryResult> {
    const data = await handleResponse<unknown>(await request('/api/devices/recover-session', json('POST', payload)));
    if (!isObject(data) || !isValidDateString(data.expiresAt)) {
      throw new ApiError('Server merespons pemulihan dengan data yang tidak valid.', 502, 'INVALID_RECOVERY_RESPONSE', data);
    }
    return { expiresAt: data.expiresAt };
  },
  async getAttendanceToday(): Promise<AttendanceTodayData> {
    const data = await handleResponse<unknown>(await request('/api/attendance/today', { method: 'GET', headers: { Accept: 'application/json' } }));
    if (!Array.isArray(data)) {
      throw new ApiError('Data sesi hari ini dari server tidak valid.', 502, 'INVALID_ATTENDANCE_TODAY_RESPONSE', data);
    }
    return data.map((value): AttendanceTodayData[number] => {
      if (!isObject(value)) {
        throw new ApiError('Data sesi hari ini dari server tidak valid.', 502, 'INVALID_ATTENDANCE_TODAY_RESPONSE', value);
      }
      const key = value.key;
      const name = value.name;
      const startTime = value.startTime;
      const endTime = value.endTime;
      const status = value.status;
      const waktuAbsen = value.waktuAbsen;
      const id = value.id;
      const sessionId = value.sessionId;
      if (
        !isAttendanceSession(key) ||
        typeof sessionId !== 'number' ||
        !Number.isSafeInteger(sessionId) ||
        sessionId <= 0 ||
        !isNonEmptyString(name) ||
        typeof startTime !== 'string' ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
        typeof endTime !== 'string' ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
        startTime >= endTime ||
        typeof value.sortOrder !== 'number' ||
        !Number.isSafeInteger(value.sortOrder) ||
        !(status === null || status === 'Hadir' || status === 'Tidak Hadir') ||
        !(waktuAbsen === null || isValidDateString(waktuAbsen)) ||
        (id !== undefined && (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)) ||
        typeof value.finalized !== 'boolean' ||
        typeof value.isEnabled !== 'boolean' ||
        typeof value.canAttend !== 'boolean'
      ) {
        throw new ApiError('Data sesi hari ini dari server tidak valid.', 502, 'INVALID_ATTENDANCE_TODAY_RESPONSE', value);
      }
      return {
        sessionId,
        ...(typeof id === 'number' ? { id } : {}),
        sesi: key,
        name: name.trim(),
        sortOrder: value.sortOrder,
        startTime,
        endTime,
        status,
        waktuAbsen,
        finalized: value.finalized,
        isEnabled: value.isEnabled,
        canAttend: value.canAttend,
      };
    });
  },
  async recordAttendance(sessionType: AttendanceSessionType): Promise<AttendanceCreateResult> {
    const result = await handleResponse<unknown>(await request('/api/attendance', json('POST', { sesi: sessionType })));
    if (
      !isObject(result) ||
      typeof result.id !== 'number' ||
      !Number.isSafeInteger(result.id) ||
      result.id <= 0 ||
      result.status !== 'Hadir' ||
      !isObject(result.session) ||
      result.session.key !== sessionType ||
      !isNonEmptyString(result.sessionNameSnapshot)
    ) {
      throw new ApiError('Respons presensi server tidak valid. Status presensi belum dapat dipastikan; periksa ke admin sebelum mengirim ulang.', 502, 'INVALID_ATTENDANCE_RESPONSE');
    }
    return { id: result.id, sesi: sessionType, status: 'Hadir' };
  },
  async getAttendanceHistory(params?: { date?: string; page?: number; limit?: number }): Promise<AttendanceHistoryResult> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    query.set('page', String(page));
    query.set('limit', String(limit));
    const response = await request(`/api/attendance/history?${query}`, { method: 'GET', headers: { Accept: 'application/json' } });
    let body: unknown = null;
    if (response.headers.get('content-type')?.includes('application/json')) {
      try { body = await response.json(); } catch { body = null; }
    }
    if (!response.ok) {
      const errorBody = isObject(body) ? body : null;
      throw new ApiError(
        getStandardErrorMessage(response.status, typeof errorBody?.message === 'string' ? errorBody.message : typeof errorBody?.error === 'string' ? errorBody.error : undefined),
        response.status,
        typeof errorBody?.code === 'string' ? errorBody.code : undefined,
        body,
      );
    }
    if (!isObject(body) || body.success !== true || !Array.isArray(body.data)) {
      throw new ApiError('Respons riwayat dari server tidak valid.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE', body);
    }
    const records = body.data.map(mapAttendanceHistoryRecord);
    const pagination = mapAttendanceHistoryPagination(body.pagination);
    if (pagination.page !== page || pagination.limit !== limit || records.length > limit) {
      throw new ApiError('Metadata pagination riwayat tidak sesuai dengan permintaan.', 502, 'INVALID_ATTENDANCE_HISTORY_RESPONSE', body);
    }
    return { records, pagination };
  },
};
