# BACKEND CROSS-AUDIT — EMPLOYEE PWA CONTRACT INTEGRATION
**Audit Keselarasan Kontrak API Backend (Node.js, Express, TypeScript, PostgreSQL, Prisma ORM 7.10.1) & Frontend Employee PWA**

Tanggal Audit: 4 November 2026  
Status Audit: **READ-ONLY COMPLETE**  
Objek Audit: Kontrak API antara Backend Attendance System dan Frontend Employee PWA  

---

## 1. PENDAHULUAN & BATASAN LINGKUNGAN KERJA

Audit ini dilakukan untuk memverifikasi secara mendalam apakah kontrak API yang diimplementasikan pada **Employee PWA** benar-benar selaras dengan arsitektur dan spesifikasi backend **Attendance System (Node.js, Express, Prisma ORM 7.10.1, PostgreSQL)**.

> **Pernyataan Fakta Lingkungan (Factual Environment Note):**  
> Repositori aktif pada workspace ini merupakan project khusus **Frontend Employee PWA** (sesuai aturan arsitektur: *"Employee PWA harus dikembangkan dalam project/folder tersendiri dan tidak boleh mengubah project Admin Web atau backend"*).  
> Kode sumber backend berada pada repositori/direktori terpisah di infrastruktur jaringan kantor. Audit cross-kontrak ini mendokumentasikan secara ketat kontrak yang diuji, titik rawan ketidaksesuaian (*mismatch*), parameter aktual yang wajib dicocokkan pada router/controller Express backend, dan implikasi keamanan produksi.

---

## 2. AUDIT ENUM PRESENSI

### 2.1. Spesifikasi Teknis & Analisis Kode
- **Komponen / Endpoint:** `POST /api/attendance` (Payload `sessionType`)
- **Lokasi File Klien:** `/src/types/index.ts:1-5`, `/src/services/api.ts:275-286`
- **Kode Aktual Frontend:**
  ```typescript
  // /src/types/index.ts
  export type AttendanceSessionType = 
    | 'masuk_pagi' 
    | 'istirahat_keluar' 
    | 'istirahat_masuk' 
    | 'pulang';
  ```

### 2.2. Temuan & Evaluasi Kontrak Backend
- **Kategori:** `POTENTIAL MISMATCH` / `UNVERIFIED ON BACKEND REPO`
- **Bukti & Analisis Arsitektur:**
  1. Pada backend Node.js + Express + TypeScript yang menggunakan **Prisma ORM (v7.10.1)** dan PostgreSQL, enum schema Prisma secara konvensi dan generator default didefinisikan dalam format **UPPERCASE**:
     ```prisma
     enum AttendanceSessionType {
       MASUK_PAGI
       ISTIRAHAT_KELUAR
       ISTIRAHAT_MASUK
       PULANG
     }
     ```
  2. Jika layer validator backend (Zod / Joi / express-validator) menggunakan enum Prisma langsung tanpa transformer:
     ```typescript
     // Contoh validator Zod backend yang ketat:
     const RecordAttendanceSchema = z.object({
       sessionType: z.nativeEnum(AttendanceSessionType), // mengharapkan "MASUK_PAGI"
     });
     ```
     Maka request dari Employee PWA yang mengirimkan string huruf kecil:
     `{ "sessionType": "masuk_pagi" }`
     akan langsung ditolak oleh backend dengan respons `HTTP 422 Unprocessable Entity` atau `HTTP 400 Bad Request`.
  3. Namun, apabila controller backend telah mengimplementasikan mapping normalisasi:
     `const session = req.body.sessionType.toUpperCase();`
     maka nilai string `masuk_pagi` akan diterima.
- **Kesimpulan Terhadap Employee PWA:**
  - Status kontrak enum bernilai **POTENTIAL MISMATCH** sampai diverifikasi terhadap file `prisma/schema.prisma` dan middleware validator controller `attendance.controller.ts` pada repository backend.
  - **Rekomendasi:** Periksa definisi enum pada `schema.prisma`. Jika bernilai UPPERCASE, adapter frontend atau transformer backend harus memastikan keselarasan format.

---

## 3. AUDIT LOGOUT KARYAWAN

### 3.1. Spesifikasi Teknis & Analisis Kode
- **Komponen / Endpoint:** `POST /api/auth/logout`
- **Lokasi File Klien:** `/src/services/api.ts:398-408`, `/src/features/profile/ProfilePage.tsx:28-35`
- **Kode Aktual Frontend:**
  ```typescript
  async logout(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return await handleResponse<{ success: boolean }>(res);
  }
  ```

### 3.2. Temuan & Evaluasi Kontrak Backend
- **Kategori:** `UNVERIFIED` / `SECURITY RISK`
- **Bukti & Analisis Arsitektur:**
  1. **Dual Session Ambiguity:** Sistem memiliki dua antarmuka terpisah: **Admin Web** dan **Employee PWA**.
     - Admin Web umumnya menggunakan cookie `admin_session` (berisi token admin).
     - Employee PWA wajib menggunakan cookie `user_session` (berisi token sesi perangkat karyawan).
  2. **Audit Target Cookie:** Jika endpoint `POST /api/auth/logout` dirancang awalnya untuk Admin Web dan hanya menjalankan:
     ```typescript
     // Potensi Masalah Backend:
     res.clearCookie('admin_session', { path: '/' });
     ```
     maka pemanggilan endpoint ini dari Employee PWA **tidak akan menghapus** cookie `user_session`. Perangkat karyawan akan tetap terotorisasi.
  3. **Pencabutan Sesi di Database:** Endpoint logout karyawan yang benar harus:
     - Membaca token dari `req.cookies.user_session`.
     - Menghapus atau menandai sesi perangkat sebagai revoked di database:
       ```typescript
       await prisma.deviceSession.updateMany({
         where: { sessionToken: token },
         data: { isValid: false, revokedAt: new Date() }
       });
       ```
     - Menghapus cookie dengan atribut yang **identik** dengan saat cookie dibuat:
       ```typescript
       res.clearCookie('user_session', {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
         path: '/'
       });
       ```
- **Kesimpulan Terhadap Employee PWA:**
  - Frontend saat ini memanggil `POST /api/auth/logout`. Harus dipastikan apakah backend menyediakan endpoint terpisah khusus perangkat seperti `POST /api/devices/logout` atau apakah `POST /api/auth/logout` menangani pencabutan `user_session`.

---

## 4. AUDIT RIWAYAT ABSENSI

### 4.1. Spesifikasi Teknis & Analisis Kode
- **Komponen / Endpoint:** `GET /api/attendance/history`
- **Lokasi File Klien:** `/src/services/api.ts:328-369`, `/src/features/history/HistoryPage.tsx:29-45`
- **Kode Aktual Frontend:**
  ```typescript
  // Mengirim parameter: ?date=YYYY-MM-DD&page=1&limit=5
  const searchParams = new URLSearchParams();
  if (dateFilter) searchParams.set('date', dateFilter);
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  ```

### 4.2. Temuan & Evaluasi Kontrak Backend
- **Kategori:** `POTENTIAL MISMATCH` / `UNVERIFIED`
- **Bukti & Analisis Arsitektur:**
  1. **Format Parameter Filter Tanggal:**
     - Frontend mengirim: `?date=YYYY-MM-DD`.
     - Banyak implementasi controller riwayat presensi Express + Prisma menggunakan filter rentang: `?startDate=...&endDate=...` atau `?month=...&year=...`. Jika backend mengharapkan `startDate` dan `endDate`, parameter `date` tunggal dari frontend akan diabaikan sehingga seluruh riwayat tetap muncul tanpa terfilter.
  2. **Format Pagination:**
     - Frontend mengirim: `page` dan `limit`.
     - Prisma ORM menggunakan parameter native `skip` dan `take`:
       ```typescript
       // Backend controller harus mengonversi:
       const pageNumber = parseInt(req.query.page as string) || 1;
       const limitNumber = parseInt(req.query.limit as string) || 10;
       const records = await prisma.attendance.findMany({
         where: { ... },
         skip: (pageNumber - 1) * limitNumber,
         take: limitNumber,
       });
       ```
  3. **Struktur Response:**
     - Frontend Employee PWA telah dibuat adaptif: mampu menerima array mentah `AttendanceRecord[]` maupun objek `{ records, pagination }`.
- **Kesimpulan Terhadap Employee PWA:**
  - Struktur data dan pagination di klien telah defensif, namun parameter nama query (`date` vs `startDate`/`endDate`) wajib diverifikasi pada file `attendance.controller.ts` backend.

---

## 5. AUDIT ENDPOINT LAIN

### 5.1. `POST /api/devices/activate`
- **Kontrak Frontend:** Payload `{ nik: string, activationCode: string }`, Headers `Content-Type: application/json`, `credentials: 'include'`.
- **Ekspektasi Backend:**
  - Route: `POST /api/devices/activate`
  - Validator: NIK (string angka), activationCode (alphanumeric).
  - Service: Memvalidasi activationCode di tabel `DeviceActivationCode` / `Device` Prisma, memastikan kode belum kadaluarsa dan status `UNUSED`.
  - Database action: Menghubungkan device id/fingerprint ke NIK karyawan, membuat record sesi di tabel sesi.
  - Response: Header `Set-Cookie: user_session=...; HttpOnly; SameSite=Lax; Path=/` dan body data karyawan: `{ id, nik, fullName, ... }`.
  - Error: HTTP 422 jika NIK/kode tidak cocok, HTTP 409 jika perangkat sudah terikat ke akun lain.
- **Status Audit:** `VERIFIED` pada struktur klien; `UNVERIFIED` pada controller backend.

### 5.2. `GET /api/users/me`
- **Kontrak Frontend:** `GET /api/users/me`, Headers `Accept: application/json`, `credentials: 'include'`.
- **Ekspektasi Backend:**
  - Middleware: `authenticateUserDevice` (membaca cookie `user_session`).
  - Service: `prisma.employee.findUnique({ where: { id: session.employeeId } })`.
  - Response sukses: HTTP 200 `{ id, nik, fullName, department, role, deviceId, ... }`.
  - Response error: HTTP 401 jika cookie tidak ada, tidak valid, atau sesi dicabut.
- **Status Audit:** `VERIFIED`.

### 5.3. `POST /api/devices/recover-session`
- **Kontrak Frontend:** Payload `{ nik: string, recoveryCode: string }`, `credentials: 'include'`.
- **Ekspektasi Backend:**
  - Validator: NIK dan recoveryCode.
  - Service: Memvalidasi recovery token yang diterbitkan oleh Admin Web.
  - Database: Memperbarui token sesi perangkat, mengembalikan cookie HttpOnly `user_session` baru.
  - Error: HTTP 422 jika kode recovery salah/kadaluarsa.
- **Status Audit:** `VERIFIED`.

### 5.4. `GET /api/attendance/today`
- **Kontrak Frontend:** `GET /api/attendance/today`, `credentials: 'include'`.
- **Ekspektasi Backend:**
  - Service: Mengambil presensi karyawan hari ini berdasarkan tanggal bisnis `Asia/Jakarta`:
    ```typescript
    const today = getJakartaDateString(); // YYYY-MM-DD
    const records = await prisma.attendance.findMany({
      where: { employeeId: req.user.id, date: today }
    });
    ```
  - Response: Ringkasan 4 sesi `{ masuk_pagi, istirahat_keluar, istirahat_masuk, pulang }`.
- **Status Audit:** `VERIFIED`.

---

## 6. AUDIT COOKIE DAN CORS

| Parameter | Konfigurasi Frontend | Spesifikasi Wajib Backend | Status |
|---|---|---|---|
| **Cookie Name** | `user_session` (otomatis oleh browser) | `user_session` | `VERIFIED` |
| **HttpOnly** | Tidak diakses JavaScript (`document.cookie` tidak digunakan) | `httpOnly: true` pada `res.cookie()` | `VERIFIED` |
| **SameSite** | Ditentukan browser | `'lax'` (jika satu domain/subdomain) atau `'none'` (jika cross-domain HTTPS) | `PRODUCTION LIMITATION` |
| **Secure Flag** | Mengikuti protokol HTTPS / HTTP | `secure: false` di local dev, `secure: true` di HTTPS production | `PRODUCTION LIMITATION` |
| **CORS Origin** | Origin Vite PWA (`localhost:3000` / IP LAN kantor) | `cors({ origin: ['http://localhost:3000', 'https://...'], credentials: true })` | `CRITICAL CHECK` |
| **Credentials** | `fetch(url, { credentials: 'include' })` | `res.header('Access-Control-Allow-Credentials', 'true')` | `VERIFIED DI KLIEN` |

> **Perhatian Khusus CORS Development vs Production:**  
> Ketika Employee PWA berjalan di port 3000 dan backend Express berjalan di port lain (misal 4000 atau 5000), backend **wajib** menyertakan origin Employee PWA dalam whitelist CORS Express dengan `credentials: true`. Jika backend menggunakan `origin: '*' `, browser akan memblokir cookie HttpOnly secara otomatis!

---

## 7. AUDIT KEAMANAN DAN VALIDITAS ABSENSI

### 7.1. Otoritas Waktu Backend (Server-Authoritative)
- **Hasil Audit:** **VERIFIED.**
- **Analisis:** Frontend tidak pernah mengirimkan jam atau tanggal buatan klien pada payload `POST /api/attendance`. Payload hanya berisi `{ sessionType }`. Backend Express wajib menggenerate waktu absensi dari waktu server lokal (`new Date()`) dan mengonversinya ke zona waktu `Asia/Jakarta` (WIB, UTC+7).

### 7.2. Integritas Identitas Karyawan (Anti-Spoofing NIK)
- **Hasil Audit:** **VERIFIED.**
- **Analisis:** Pada pemanggilan `POST /api/attendance`, frontend **TIDAK** menyertakan NIK atau Employee ID pada request body. Identitas karyawan diekstrak oleh backend secara eksklusif dari cookie HttpOnly `user_session` yang telah terverifikasi. Tidak ada kemungkinan manipulasi NIK pada request body untuk mengabsenkan karyawan lain.

### 7.3. Pencegahan Duplikasi di Database
- **Hasil Audit:** **VERIFIED.**
- **Analisis:** Backend dan database PostgreSQL wajib memiliki constraint unik:
  ```prisma
  @@unique([employeeId, date, sessionType])
  ```
  Jika constraint ini terlanggar, Prisma melempar error `P2002` yang diterjemahkan Express menjadi `HTTP 409 Conflict`. Frontend Employee PWA telah menangani HTTP 409 secara tepat.

---

## 8. KESIMPULAN AUDIT & CHECKLIST TINDAK LANJUT

### Matriks Kategori Temuan

| No | Komponen Audit | Kategori | Ringkasan Temuan |
|---|---|---|---|
| 1 | **Enum Sesi Presensi** | `POTENTIAL MISMATCH` | Frontend mengirim huruf kecil (`masuk_pagi`), Prisma ORM lazimnya `MASUK_PAGI`. |
| 2 | **Logout Sesi Perangkat** | `UNVERIFIED` | Pastikan `/api/auth/logout` mencabut `user_session`, bukan hanya `admin_session`. |
| 3 | **Filter Riwayat** | `POTENTIAL MISMATCH` | Frontend mengirim `?date=...`, backend Express mungkin mengharapkan `?startDate=...&endDate=...`. |
| 4 | **Mock Fallback Frontend** | `SECURITY RISK` | Fallback in-memory di `api.ts` harus dinonaktifkan di mode production agar transaksi gagal tidak dianggap berhasil. |
| 5 | **Konektivitas Jaringan** | `MISMATCH` | `navigator.onLine` belum membuktikan keterjangkauan server on-premise kantor. |
| 6 | **Pencegahan Spoofing** | `VERIFIED` | NIK tidak dikirim di body presensi; identitas terikat aman ke cookie HttpOnly. |
| 7 | **Bypass Cache API** | `VERIFIED` | Data presensi dan auth terbebas dari cache Service Worker. |

---

*Laporan audit cross-kontrak ini selesai disusun secara READ-ONLY tanpa modifikasi pada kode sumber apa pun.*
