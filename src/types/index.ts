export type AttendanceSessionType = string;

export interface EmployeeUser {
  nik: string;
  fullName: string;
  department?: string;
  role?: string;
  deviceId?: string;
  deviceName?: string;
  activatedAt?: string;
}

export interface EmployeeProfileDto {
  nik: string;
  namaLengkap: string;
}

export interface DeviceActivationPayload {
  nik: string;
  code: string;
  deviceName?: string;
}

export interface DeviceActivationResult {
  nik: string;
  status: 'active';
  activatedAt: string;
  expiresAt: string | null;
}

export interface SessionRecoveryPayload {
  nik: string;
  recoveryCode: string;
}

export interface SessionRecoveryResult {
  expiresAt: string;
}

export interface SessionStatus {
  type: AttendanceSessionType;
  title: string;
  subtitle: string;
  isRecorded: boolean;
  recordedTime: string | null;
  recordedAtIso?: string;
  eligibleNow?: boolean;
}

export interface AttendanceCreateResult {
  id: number;
  sesi: AttendanceSessionType;
  status: 'Hadir';
}

export interface AttendanceTodaySession {
  sessionId: number;
  id?: number;
  sesi: AttendanceSessionType;
  name: string;
  sortOrder: number;
  startTime: string;
  endTime: string;
  status: 'Hadir' | 'Tidak Hadir' | null;
  waktuAbsen: string | null;
  finalized: boolean;
  isEnabled: boolean;
  canAttend: boolean;
}

export type AttendanceTodayData = AttendanceTodaySession[];

export interface AttendanceRecord {
  id: string;
  sessionType: AttendanceSessionType;
  sessionName: string;
  date: string;
  timestamp: string;
  status: string;
}

export interface AttendanceHistoryRecordDto {
  id: number;
  tanggal: string;
  sesi: AttendanceSessionType;
  waktuAbsen: string;
  status: string;
}

export interface AttendanceHistoryPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface AttendanceHistoryResult {
  records: AttendanceRecord[];
  pagination: PaginationMeta;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
}
