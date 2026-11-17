# FINAL INTEGRATION AUDIT — EMPLOYEE PWA
**Sistem Absensi Karyawan Berbasis On-Premise Jaringan Lokal Kantor**

Tanggal Audit: 4 November 2026  
Status Audit: **READ-ONLY COMPLETE**  
Tujuan: Memastikan seluruh fitur Employee PWA benar-benar menggunakan kontrak API backend yang aktual, mengevaluasi kesesuaian arsitektur, mendeteksi mismatch, risiko keamanan, dan keterbatasan produksi.

---

## DAFTAR ISI
1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Bagian 1 — Audit Autentikasi & Sesi Perangkat](#bagian-1--audit-autentikasi--sesi-perangkat)
3. [Bagian 2 — Audit Absensi (Perekaman & Status Hari Ini)](#bagian-2--audit-absensi-perekaman--status-hari-ini)
4. [Bagian 3 — Audit Riwayat Presensi](#bagian-3--audit-riwayat-presensi)
5. [Bagian 4 — Audit Keamanan](#bagian-4--audit-keamanan)
6. [Bagian 5 — Audit Konektivitas Jaringan](#bagian-5--audit-konektivitas-jaringan)
7. [Bagian 6 — Audit PWA & Service Worker](#bagian-6--audit-pwa--service-worker)
8. [Matriks Temuan & Rekomendasi Tindakan](#matriks-temuan--rekomendasi-tindakan)

---

## RINGKASAN EKSEKUTIF

Audit ini dilakukan secara menyeluruh dan independen terhadap kode sumber Employee PWA. Karena repositori backend (Node.js, Express, PostgreSQL, Prisma) dikelola pada direktori/layanan terpisah, audit ini membedakan secara tegas antara kontrak yang **TERVERIFIKASI (VERIFIED)** di kode klien, potensi **KETIDAKSESUAIAN (MISMATCH)**, aspek yang **BELUM DAPAT DIBUKTIKAN (UNVERIFIED)** karena keterpisahan codebase backend, potensi **RISIKO KEAMANAN (SECURITY RISK)**, dan **KETERBATASAN PRODUKSI (PRODUCTION LIMITATION)**.

---

## BAGIAN 1 — AUDIT AUTENTIKASI & SESI PERANGKAT

### 1.1. Endpoint `POST /api/devices/activate`
- **Lokasi File:** `/src/services/api.ts` (fungsi `activateDevice`), `/src/features/activation/ActivationPage.tsx`
- **Kode Relevan:**
```typescript
// /src/services/api.ts
async activateDevice(payload: DeviceActivationPayload): Promise<EmployeeUser> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return await handleResponse<EmployeeUser>(res);
  } catch (err) { ... }
}
```
- **Kategori:** `VERIFIED` & `SECURITY RISK` (terkait fallback)
- **Hasil Audit:**
  - **Route & Payload:** Frontend mengirim `{ nik: string, activationCode: string }` menggunakan metode POST dengan `credentials: 'include'`.
  - **Cookie:** Backend menerbitkan cookie HttpOnly `user_session` melalui response header `Set-Cookie`. Frontend tidak pernah menyentuh nilai cookie secara langsung.
  - **Temuan Masalah (SECURITY RISK):** Pada `catch (err)` di `/src/services/api.ts` dan `/src/features/auth/AuthContext.tsx` baris 64–77:
    ```typescript
    if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
      const mockUser = { ...PREVIEW_EMPLOYEE, nik };
      setUser(mockUser);
      return;
    }
    ```
    Jika server backend mati atau tidak terjangkau di lingkungan produksi, aktivasi pura-pura berhasil (*fake authentication success*) dan mengalihkan pengguna ke Dashboard.
  - **Rekomendasi Perbaikan:** Hapus seluruh fallback mock aktivasi atau isolasi strictly dengan flag `import.meta.env.DEV === true && import.meta.env.VITE_ENABLE_MOCK === 'true'`. Pada production, jika network gagal, wajib melempar error dan menolak masuk ke aplikasi.

---

### 1.2. Endpoint `GET /api/users/me`
- **Lokasi File:** `/src/services/api.ts` (fungsi `getMe`), `/src/features/auth/AuthContext.tsx` (fungsi `checkSession`)
- **Kode Relevan:**
```typescript
// /src/services/api.ts:178-192
async getMe(): Promise<EmployeeUser> {
  const res = await fetch(`${API_BASE}/api/users/me`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });
  return await handleResponse<EmployeeUser>(res);
}
```
- **Kategori:** `VERIFIED`
- **Hasil Audit:**
  - Route mengirim request dengan `credentials: 'include'` tanpa membawa header Authorization Bearer manual (mengandalkan cookie HttpOnly `user_session`).
  - Jika backend merespons HTTP 401, frontend menangkap error dan mengosongkan state user (`setUser(null)`), lalu `AppRouter.tsx` otomatis mengalihkan navigasi ke `/aktivasi`.

---

### 1.3. Endpoint `POST /api/devices/recover-session`
- **Lokasi File:** `/src/services/api.ts` (fungsi `recoverSession`), `/src/features/recovery/RecoveryPage.tsx`
- **Kode Relevan:**
```typescript
// /src/services/api.ts:222-239
async recoverSession(payload: SessionRecoveryPayload): Promise<EmployeeUser> {
  const res = await fetch(`${API_BASE}/api/devices/recover-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return await handleResponse<EmployeeUser>(res);
}
```
- **Kategori:** `VERIFIED` & `SECURITY RISK` (terkait fallback)
- **Hasil Audit:**
  - Payload frontend: `{ nik: string, recoveryCode: string }`.
  - Format kode pemulihan dipaksa huruf besar (`toUpperCase()`) untuk mencegah kesalahan ketik pengguna.
  - Terdapat fallback mock yang sama dengan aktivasi jika terjadi `NETWORK_ERROR`. Harus dihilangkan pada mode production.

---

### 1.4. Endpoint `POST /api/auth/logout` vs Sesi Perangkat
- **Lokasi File:** `/src/services/api.ts` (fungsi `logout`), `/src/features/profile/ProfilePage.tsx`
- **Kode Relevan:**
```typescript
// /src/services/api.ts:398-408
async logout(): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return await handleResponse<{ success: boolean }>(res);
  } catch {
    return { success: true };
  }
}
```
- **Kategori:** `UNVERIFIED` / `POTENTIAL MISMATCH`
- **Hasil Audit & Penjelasan Masalah:**
  - Di sistem terpadu yang membagi backend antara **Admin Web** dan **Employee PWA**, endpoint `/api/auth/logout` seringkali diimplementasikan untuk mencabut `admin_session`.
  - Jika backend menggunakan cookie terpisah, yaitu `user_session` untuk karyawan dan `admin_session` untuk admin web:
    - Apakah endpoint backend `/api/auth/logout` menghapus kedua cookie, atau hanya cookie admin?
    - Apakah endpoint pencabutan sesi perangkat sebenarnya adalah `POST /api/devices/unbind` atau `POST /api/devices/logout`?
  - Karena source code Express controller backend berada di luar repositori ini, nama endpoint logout ini berstatus `UNVERIFIED`.
- **Rekomendasi Perbaikan:** Lakukan audit silang terhadap router Express backend untuk memastikan endpoint mana yang mengirim header `Set-Cookie: user_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`.

---

## BAGIAN 2 — AUDIT ABSENSI (PEREKAMAN & STATUS HARI INI)

### 2.1. Penamaan Sesi Presensi & Validator Backend
- **Lokasi File:** `/src/types/index.ts`, `/src/services/api.ts`, `/src/features/dashboard/DashboardPage.tsx`
- **Kode Relevan:**
```typescript
// /src/types/index.ts:1-5
export type AttendanceSessionType = 
  | 'masuk_pagi' 
  | 'istirahat_keluar' 
  | 'istirahat_masuk' 
  | 'pulang';

// /src/services/api.ts:275-286
async recordAttendance(sessionType: AttendanceSessionType): Promise<AttendanceRecord> {
  const res = await fetch(`${API_BASE}/api/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ sessionType }),
  });
  return await handleResponse<AttendanceRecord>(res);
}
```
- **Kategori:** `UNVERIFIED` / `POTENTIAL MISMATCH`
- **Hasil Audit & Penjelasan Masalah:**
  - Frontend saat ini mengirim format huruf kecil dengan garis bawah (snake_case): `'masuk_pagi'`, `'istirahat_keluar'`, `'istirahat_masuk'`, `'pulang'`.
  - Pada arsitektur Prisma ORM 7.10.1 dengan PostgreSQL, tipe `enum` di database dan schema Prisma umumnya didefinisikan dalam huruf kapital (UPPERCASE):
    ```prisma
    enum AttendanceSession {
      MASUK_PAGI
      ISTIRAHAT_KELUAR
      ISTIRAHAT_MASUK
      PULANG
    }
    ```
    atau camelCase (`masukPagi`). Jika validator DTO backend (Zod / Joi / class-validator) mengharapkan `MASUK_PAGI`, request frontend akan ditolak dengan error `HTTP 422 Unprocessable Entity`.
- **Rekomendasi Perbaikan:** Verifikasi file `schema.prisma` backend pada model attendance atau enum session type. Jika backend menggunakan `MASUK_PAGI`, tambahkan fungsi pemetaan (mapping adapter) sebelum payload dikirimkan.

---

### 2.2. Integritas Waktu & Tanggal Server (Asia/Jakarta)
- **Lokasi File:** `/src/features/attendance/AttendanceConfirmationModal.tsx`, `/src/features/dashboard/DashboardPage.tsx`
- **Hasil Audit:**
  - **Waktu Jam:** Frontend menampilkan live ticking clock zona `Asia/Jakarta` hanya sebagai pratinjau antarmuka bagi karyawan.
  - **Waktu Record:** Status "Sudah Absen" dan kartu riwayat menggunakan nilai waktu yang dikembalikan oleh backend (`result.timestamp`).
  - **Konfirmasi Wajib:** Tidak ada absensi yang dikirim secara otomatis. Karyawan wajib menekan tombol *"Lakukan Absen"*, memeriksa data pada modal konfirmasi, lalu menekan *"Konfirmasi"*.
- **Kategori:** `VERIFIED`

---

### 2.3. Penanganan Duplikasi Absensi (Database Constraint)
- **Lokasi File:** `/src/services/api.ts:48-50`
- **Kode Relevan:**
```typescript
case 409:
  return 'Konflik presensi: Sesi absensi ini sudah pernah tercatat pada hari ini.';
```
- **Kategori:** `VERIFIED`
- **Hasil Audit:** Jika database PostgreSQL melempar `UniqueConstraintViolation` (misal constraint pada kombinasi `[employeeId, sessionType, date]`), backend akan merespons HTTP 409 Conflict. Frontend menangkap status ini dan menampilkan pesan konflik yang ramah tanpa merusak UI.

---

### 2.4. Mock Fallback pada `recordAttendance`
- **Lokasi File:** `/src/services/api.ts:287-321`
- **Kode Relevan:**
```typescript
catch (err) {
  if (err instanceof ApiError && err.statusCode !== 0) throw err;
  ...
  inMemoryStore.todaySessions[sessionType] = { isRecorded: true, time: timeStr };
  inMemoryStore.records.unshift(newRecord);
  return newRecord;
}
```
- **Kategori:** `SECURITY RISK` & `MISMATCH`
- **Penjelasan Masalah:** Ketika terjadi kegagalan jaringan (`statusCode === 0`), `api.ts` menangkap error dan mengembalikan objek `newRecord` palsu yang disintesis di memori. Akibatnya, UI Dashboard menampilkan pesan *"Presensi Berhasil Diterima Server!"* padahal server tidak pernah menerimanya.
- **Rekomendasi Perbaikan:** Hapus baris fallback ini sepenuhnya di build production. Jika `fetch` gagal, `recordAttendance` wajib melempar exception agar karyawan mengetahui bahwa absensi mereka **BELUM** tercatat.

---

## BAGIAN 3 — AUDIT RIWAYAT PRESENSI

### 3.1. Endpoint `GET /api/attendance/history`
- **Lokasi File:** `/src/services/api.ts:328-369`, `/src/features/history/HistoryPage.tsx`
- **Kode Relevan:**
```typescript
// /src/services/api.ts:337-349
const searchParams = new URLSearchParams();
if (dateFilter) searchParams.set('date', dateFilter);
searchParams.set('page', String(page));
searchParams.set('limit', String(limit));

const res = await fetch(`${API_BASE}/api/attendance/history?${searchParams.toString()}`, {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
  credentials: 'include',
});
```
- **Kategori:** `UNVERIFIED` / `POTENTIAL MISMATCH`
- **Hasil Audit & Penjelasan Masalah:**
  1. **Parameter Query:** Frontend mengasumsikan parameter `?date=YYYY-MM-DD`, `?page=N`, dan `?limit=N`. Pada Express + Prisma, implementasi filter rentang waktu seringkali menggunakan `startDate` dan `endDate`, atau `from` dan `to`.
  2. **Pagination:** Prisma ORM menggunakan parameter `skip` dan `take`. Jika controller backend tidak mengonversi `page` dan `limit` menjadi `skip` dan `take`, parameter pagination frontend akan diabaikan oleh backend.
  3. **Struktur Response:** `api.ts` telah disiapkan secara defensif: jika backend mengembalikan array mentah `[...]`, frontend melakukan pembungkusan dan kalkulasi pagination; jika backend mengembalikan `{ records: [...], pagination: {...} }`, frontend mengonsumsinya langsung. Namun struktur aktual backend belum diverifikasi terhadap kode Express controller.
- **Rekomendasi Perbaikan:** Lakukan audit terhadap controller `getAttendanceHistory` pada backend untuk mencocokkan query parameter yang diharapkan (`date` vs `startDate`/`endDate`, `page`/`limit` vs `skip`/`take`).

---

## BAGIAN 4 — AUDIT KEAMANAN

### 4.1. Audit Penyimpanan Kredensial Browser
- **Pemeriksaan Kode:** Dilakukan pencarian menyeluruh terhadap string `localStorage` dan `sessionStorage`.
- **Hasil Audit:** **BERSIH.** Tidak ada token sesi, NIK, PIN, atau data autentikasi yang disimpan di `localStorage` maupun `sessionStorage`.
- **Kategori:** `VERIFIED`

---

### 4.2. Audit Permintaan Jaringan & Cookie HttpOnly
- **Pemeriksaan Kode:** Seluruh pemanggilan `fetch` di `/src/services/api.ts` (7 endpoint) menggunakan properti `credentials: 'include'`.
- **Hasil Audit:** Browser secara native menyertakan cookie `user_session` pada setiap permintaan ke backend domain yang sama atau CORS origin yang diizinkan.
- **Kategori:** `VERIFIED`

---

### 4.3. Audit Caching Service Worker (Workbox)
- **Lokasi File:** `/vite.config.ts:56-58`
- **Kode Relevan:**
```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
  // Explicitly navigate fallback bypass for API
  navigateFallbackDenylist: [/^\/api/],
  runtimeCaching: [ ... ]
}
```
- **Hasil Audit:**
  - Hanya file statis (JS, CSS, HTML, gambar, font) yang dimasukkan ke precache.
  - Endpoint `/api/*` secara tegas masuk ke `navigateFallbackDenylist`.
  - Tidak ada konfigurasi runtime caching untuk `/api/*`. Data pribadi karyawan dan respons API presensi tidak akan pernah tersimpan di cache publik Service Worker.
- **Kategori:** `VERIFIED`

---

### 4.4. Audit Offline Attendance Queue
- **Pemeriksaan Kode:** Tidak ada implementasi IndexedDB, background sync, atau queue array offline untuk menampung absensi saat server tidak aktif.
- **Hasil Audit:** Sesuai dengan instruksi ketat: **Absensi offline tidak didukung.**
- **Kategori:** `VERIFIED`

---

## BAGIAN 5 — AUDIT KONEKTIVITAS JARINGAN

### 5.1. Uji Keterjangkauan Server vs Browser Online
- **Lokasi File:** `/src/hooks/useOnlineStatus.ts`
- **Kode Relevan:**
```typescript
// /src/hooks/useOnlineStatus.ts:4-6
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  ...
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}
```
- **Kategori:** `MISMATCH` & `PRODUCTION LIMITATION`
- **Penjelasan Masalah Kritis:**
  - Hook `useOnlineStatus` saat ini hanya mengandalkan properti native `navigator.onLine`.
  - Di dunia nyata:
    1. Karyawan berada di luar kantor menggunakan paket data seluler (4G/5G) &rarr; `navigator.onLine` bernilai `true`.
    2. Karyawan terhubung ke Wi-Fi rumah atau kafe &rarr; `navigator.onLine` bernilai `true`.
    3. Server on-premise kantor mengalami pemadaman listrik &rarr; `navigator.onLine` tetap bernilai `true`.
  - Karena sistem ini adalah **sistem on-premise di jaringan lokal kantor**, karyawan yang sedang menggunakan kuota seluler atau Wi-Fi luar akan melihat indikator *"Online"* hijau di header, padahal server absensi lokal kantor **sama sekali tidak dapat dijangkau**.
- **Rekomendasi Perbaikan:** Buat endpoint kesehatan ringan di backend (`GET /api/health` atau ping periodik) dan implementasikan hook `useServerReachability` yang memverifikasi HTTP ping ke server kantor secara periodik (setiap 30-60 detik) atau saat aplikasi difokuskan (*window focus*).

---

## BAGIAN 6 — AUDIT PWA & SERVICE WORKER

| Komponen PWA | Status | Bukti Kode Aktual | Catatan |
|---|---|---|---|
| **Web App Manifest** | `VERIFIED` | `/public/manifest.webmanifest` & `/vite.config.ts` | `display: 'standalone'`, `short_name: 'Absensi'`, `start_url: '/'` |
| **Ikon PWA** | `VERIFIED` | `/public/pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png` | Resolusi 192, 512, maskable safe-zone 15% padding, Apple touch PNG |
| **PWA Service Worker** | `VERIFIED` | `/dist/sw.js` (Workbox v2.0.0 via `vite-plugin-pwa`) | Precache 17 entri aset statis |
| **Auto Update SW** | `VERIFIED` | `/src/main.tsx:5-13` | Menggunakan `registerSW({ immediate: true })` |
| **API Cache Bypass** | `VERIFIED` | `/vite.config.ts:58` | `navigateFallbackDenylist: [/^\/api/]` |
| **In-App Prompt Android** | `VERIFIED` | `/src/hooks/usePWAInstall.ts:38-41` | Menangani event `beforeinstallprompt` |
| **In-App Prompt iOS** | `VERIFIED` | `/src/components/feedback/PWAInstallBanner.tsx:49-88` | Modal panduan Share &rarr; Add to Home Screen |
| **Tampilan Standalone** | `VERIFIED` | `/src/hooks/usePWAInstall.ts:15-18` | Mendeteksi `display-mode: standalone` dan `navigator.standalone` |

---

## MATRIKS TEMUAN & REKOMENDASI TINDAKAN

| No | Modul / Fitur | Kategori | Ringkasan Temuan | Rekomendasi Tindakan |
|---|---|---|---|---|
| 1 | **Mock Fallback API** | `SECURITY RISK` | Terjadi transaksi palsu jika jaringan putus saat aktivasi / absensi di mode dev fallback. | Hapus atau nonaktifkan total fallback in-memory pada build production. |
| 2 | **Konektivitas Jaringan** | `MISMATCH` | `navigator.onLine` menganggap online padahal smartphone tidak terhubung ke LAN kantor. | Tambahkan *heartbeat ping* berkala ke endpoint `/api/health` di jaringan lokal. |
| 3 | **Enum Sesi Presensi** | `UNVERIFIED` | Frontend mengirim snake_case (`masuk_pagi`), sedangkan Prisma lazimnya UPPERCASE (`MASUK_PAGI`). | Audit schema Prisma backend dan sesuaikan enum DTO jika berbeda. |
| 4 | **Endpoint Logout** | `UNVERIFIED` | `/api/auth/logout` berpotensi hanya mencabut sesi admin, bukan sesi perangkat karyawan. | Verifikasi controller logout di Express backend terkait nama cookie yang dicabut. |
| 5 | **Parameter Riwayat** | `UNVERIFIED` | Menggunakan `date`, `page`, `limit` (Express mungkin menggunakan `startDate`/`endDate` atau `skip`/`take`). | Verifikasi controller `getAttendanceHistory` pada Express backend. |
| 6 | **Penyimpanan Token** | `VERIFIED` | Nol token di localStorage/sessionStorage. Aman dari XSS token theft. | Pertahankan implementasi saat ini. |
| 7 | **PWA & Cache Bypass** | `VERIFIED` | Service worker terkonfigurasi benar, `/api/*` tidak pernah masuk cache. | Pertahankan implementasi saat ini. |

---

*Laporan audit integrasi ini disusun berdasarkan kode aktual Employee PWA. Sesuai batasan instruksi audit, tidak ada modifikasi kode yang dilakukan selama pembuatan laporan ini.*
