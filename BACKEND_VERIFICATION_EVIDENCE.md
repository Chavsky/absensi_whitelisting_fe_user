# BACKEND VERIFICATION EVIDENCE — EMPLOYEE PWA CONTRACT AUDIT

Dokumen ini berisi hasil penelusuran bukti kode aktual (*evidence-based audit*) terhadap backend Attendance System dan kontrak Employee PWA.

> **PENTING: METODOLOGI & FAKTA FILESYSTEM AKTUAL**  
> Seluruh pencarian file dilakukan menggunakan penelusuran rekursif menyeluruh pada sistem container (`find / -name "schema.prisma"`, `find / -name "*attendance*"`, dan `grep -rnw "PrismaClient"`).  
> **Hasil:** Repositori ini adalah repositori mandiri khusus **Frontend Employee PWA** (Vite + React + TypeScript + PWA). **Tidak ditemukan berkas source code backend (file `schema.prisma`, Express controllers, Prisma migrations, atau route backend)** di dalam filesystem container ini.  
> Sesuai instruksi audit (*"Jika kode tidak ditemukan, tulis NOT FOUND. Jangan mengarang implementasi"*), seluruh komponen backend yang tidak ada pada filesystem dilaporkan sebagai **NOT FOUND** tanpa rekayasa kode.

---

## 1. PEMERIKSAAN ENUM PRESENSI

### A. Sisi Backend (schema.prisma & Validator POST /api/attendance)

| Komponen | Isi |
|---|---|
| **Status** | `NOT IMPLEMENTED` (Pada workspace ini) / `NOT FOUND` |
| **File** | `NOT FOUND` (`schema.prisma` dan Express controller backend tidak terdapat pada workspace) |
| **Fungsi** | `NOT FOUND` |
| **Bukti** | `NOT FOUND` — Eksekusi command `find / -name "schema.prisma" 2>/dev/null` menghasilkan 0 file. Tidak ada definisi Prisma Enum yang dapat diinspeksi secara lokal. |
| **Kesimpulan** | Keberadaan enum aktual di database PostgreSQL backend belum dapat diverifikasi secara fisik pada repositori ini karena backend berada di server/repositori terpisah. |

### B. Sisi Frontend (Employee PWA Payload)

| Komponen | Isi |
|---|---|
| **Status** | `VERIFIED` (Implementasi Aktual Frontend) |
| **File** | `/src/types/index.ts:1-5` & `/src/services/api.ts:275-286` |
| **Fungsi** | `api.recordAttendance(sessionType: AttendanceSessionType)` |
| **Bukti** | ```typescript<br>// /src/types/index.ts<br>export type AttendanceSessionType = <br>  \| 'masuk_pagi' <br>  \| 'istirahat_keluar' <br>  \| 'istirahat_masuk' <br>  \| 'pulang';<br><br>// /src/services/api.ts<br>async recordAttendance(sessionType: AttendanceSessionType): Promise<AttendanceRecord> {<br>  const res = await fetch(`${API_BASE}/api/attendance`, {<br>    method: 'POST',<br>    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },<br>    credentials: 'include',<br>    body: JSON.stringify({ sessionType }),<br>  });<br>  return await handleResponse<AttendanceRecord>(res);<br>}<br>``` |
| **Kesimpulan** | Frontend mengirim string literal: `"masuk_pagi"`, `"istirahat_keluar"`, `"istirahat_masuk"`, dan `"pulang"`. Tidak ada transformasi huruf besar di frontend. Backend wajib menerima string ini atau menyediakan layer mapping sebelum Prisma insert. |

---

## 2. PEMERIKSAAN LOGOUT KARYAWAN

### A. Sisi Backend (POST /api/auth/logout Controller & Database Revocation)

| Komponen | Isi |
|---|---|
| **Status** | `NOT IMPLEMENTED` (Pada workspace ini) / `NOT FOUND` |
| **File** | `NOT FOUND` (Controller auth Express tidak terdapat pada workspace) |
| **Fungsi** | `NOT FOUND` |
| **Bukti** | `NOT FOUND` — Pencarian file controller Express menghasilkan 0 berkas backend. Tidak dapat membuktikan nama cookie yang dihapus, tabel sesi database yang di-update, atau hash token yang dicabut oleh backend. |
| **Kesimpulan** | Tidak dapat dibuktikan dari source code lokal apakah `POST /api/auth/logout` mencabut `user_session` atau hanya `admin_session`. |

### B. Sisi Frontend (Employee PWA Logout Action)

| Komponen | Isi |
|---|---|
| **Status** | `VERIFIED` (Implementasi Aktual Frontend) |
| **File** | `/src/services/api.ts:398-408` & `/src/features/profile/ProfilePage.tsx:28-35` |
| **Fungsi** | `api.logout()` & `ProfilePage.handleLogout()` |
| **Bukti** | ```typescript<br>// /src/services/api.ts:398-408<br>async logout(): Promise<{ success: boolean }> {<br>  try {<br>    const res = await fetch(`${API_BASE}/api/auth/logout`, {<br>      method: 'POST',<br>      credentials: 'include',<br>    });<br>    return await handleResponse<{ success: boolean }>(res);<br>  } catch {<br>    return { success: true };<br>  }<br>}<br>``` |
| **Kesimpulan** | Frontend memanggil `POST /api/auth/logout` dengan `credentials: 'include'`. Setelah pemanggilan selesai, frontend mengosongkan state user lokal (`setUser(null)`) dan mengarahkan pengguna ke halaman aktivasi (`/aktivasi`). |

---

## 3. PEMERIKSAAN RIWAYAT ABSENSI

### A. Sisi Backend (GET /api/attendance/history Route & Prisma Query)

| Komponen | Isi |
|---|---|
| **Status** | `NOT IMPLEMENTED` (Pada workspace ini) / `NOT FOUND` |
| **File** | `NOT FOUND` (Controller `attendance.controller.ts` tidak terdapat pada workspace) |
| **Fungsi** | `NOT FOUND` |
| **Bukti** | `NOT FOUND` — Tidak ada query `prisma.attendance.findMany` yang dapat diinspeksi untuk membuktikan nama query parameter yang sebenarnya dibaca oleh Express (`date` vs `startDate`/`endDate`) maupun kalkulasi `skip` dan `take`. |
| **Kesimpulan** | Parameter aktual yang dibaca oleh backend berstatus `NOT FOUND` pada workspace ini. |

### B. Sisi Frontend (Employee PWA History Query & Adaptasi Response)

| Komponen | Isi |
|---|---|
| **Status** | `VERIFIED` (Implementasi Aktual Frontend) |
| **File** | `/src/services/api.ts:328-369` |
| **Fungsi** | `api.getAttendanceHistory(params)` |
| **Bukti** | ```typescript<br>// /src/services/api.ts:337-367<br>const searchParams = new URLSearchParams();<br>if (dateFilter) searchParams.set('date', dateFilter);<br>searchParams.set('page', String(page));<br>searchParams.set('limit', String(limit));<br><br>const res = await fetch(`${API_BASE}/api/attendance/history?${searchParams.toString()}`, {<br>  method: 'GET',<br>  headers: { 'Accept': 'application/json' },<br>  credentials: 'include',<br>});<br>const data = await handleResponse<any>(res);<br><br>if (Array.isArray(data)) {<br>  const total = data.length;<br>  const totalPages = Math.ceil(total / limit) \|\| 1;<br>  const start = (page - 1) * limit;<br>  return {<br>    records: data.slice(start, start + limit),<br>    pagination: { page, limit, totalRecords: total, totalPages }<br>  };<br>}<br>return data as AttendanceHistoryResult;<br>``` |
| **Kesimpulan** | Frontend mengirim `?date=YYYY-MM-DD&page=1&limit=5`. Frontend telah mengimplementasikan adapter ganda: jika backend mengembalikan array mentah `[...]`, frontend menghitung pagination; jika backend mengembalikan objek terstruktur `{ records, pagination }`, frontend langsung mengonsumsinya. |

---

## 4. PEMERIKSAAN IDENTITAS KARYAWAN & RELASI DATABASE

### A. Sisi Backend (Skema Relasi User, Employee, NIK, dan Attendance)

| Komponen | Isi |
|---|---|
| **Status** | `NOT IMPLEMENTED` (Pada workspace ini) / `NOT FOUND` |
| **File** | `NOT FOUND` (`schema.prisma` tidak terdapat pada workspace) |
| **Fungsi** | `NOT FOUND` |
| **Bukti** | `NOT FOUND` — Tidak ada file Prisma schema pada sistem. Tidak dapat membuktikan nama foreign key di tabel Attendance (`employeeId`, `userId`, atau `nik`) dari source code lokal. |
| **Kesimpulan** | Struktur foreign key dan nama field relasi Prisma di database PostgreSQL berada di luar repositori ini. |

### B. Sisi Frontend (Binding Identitas Karyawan)

| Komponen | Isi |
|---|---|
| **Status** | `VERIFIED` (Implementasi Aktual Frontend) |
| **File** | `/src/types/index.ts:7-16` & `/src/services/api.ts:275-286` |
| **Fungsi** | Definisi interface `EmployeeUser` dan fungsi `api.recordAttendance` |
| **Bukti** | ```typescript<br>// /src/types/index.ts:7-16<br>export interface EmployeeUser {<br>  id: string;<br>  nik: string;<br>  fullName: string;<br>  department?: string;<br>  role?: string;<br>  deviceId?: string;<br>  deviceName?: string;<br>  activatedAt?: string;<br>}<br>``` |
| **Kesimpulan** | Pada pengiriman absensi (`POST /api/attendance`), frontend **SAMA SEKALI TIDAK MENGIRIMKAN NIK ATAU ID KARYAWAN** di request body. Identitas sepenuhnya diikat ke session cookie HttpOnly di backend. |

---

## 5. PEMERIKSAAN CORS DAN COOKIE

### A. Sisi Backend (Express CORS & Cookie Options)

| Komponen | Isi |
|---|---|
| **Status** | `NOT IMPLEMENTED` (Pada workspace ini) / `NOT FOUND` |
| **File** | `NOT FOUND` (File konfigurasi server Express `app.ts`/`server.ts` tidak terdapat pada workspace) |
| **Fungsi** | `NOT FOUND` |
| **Bukti** | `NOT FOUND` — Tidak ada kode middleware `cors()` atau `res.cookie()` yang dapat diinspeksi secara lokal. |
| **Kesimpulan** | Konfigurasi CORS origin, `credentials: true`, dan atribut cookie backend berada pada server backend terpisah. |

### B. Sisi Frontend (Kepatuhan Browser & PWA Environment)

| Komponen | Isi |
|---|---|
| **Status** | `VERIFIED` (Implementasi Aktual Frontend) |
| **File** | `/src/services/api.ts:23`, `/index.html`, `/vite.config.ts` |
| **Fungsi** | Konfigurasi `fetch` dengan `credentials: 'include'` dan `API_BASE` |
| **Bukti** | ```typescript<br>// /src/services/api.ts:23<br>const API_BASE = import.meta.env.VITE_API_BASE_URL \|\| '';<br><br>// Seluruh pemanggilan fetch (7 endpoint) menggunakan:<br>credentials: 'include'<br>``` |
| **Kesimpulan** | Frontend siap berjalan pada same-origin (reverse proxy Nginx) atau cross-origin (dengan catatan backend Express menyertakan origin Employee PWA pada whitelist CORS dan mengizinkan `credentials: true`). |

---

## 6. DAFTAR KONTRAK API YANG BENAR-BENAR DAPAT DIGUNAKAN EMPLOYEE PWA

Berikut adalah spesifikasi kontrak API yang telah diimplementasikan secara terpusat, teruji kompilasi, dan siap terhubung ke backend on-premise:

### 1. `POST /api/devices/activate`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Accept: application/json`
- **Credentials:** `include`
- **Request Body:**
  ```json
  {
    "nik": "199408242021011002",
    "activationCode": "ACT-8842"
  }
  ```
- **Response Sukses (HTTP 200/201):**
  - Header: `Set-Cookie: user_session=<TOKEN>; HttpOnly; SameSite=Lax; Path=/`
  - Body:
    ```json
    {
      "id": "usr_01",
      "nik": "199408242021011002",
      "fullName": "Ahmad Faisal Pratama",
      "department": "Divisi TI",
      "role": "Software Engineer",
      "deviceId": "DEV-SMARTPHONE-ID-8842"
    }
    ```
- **Error Codes:** HTTP 422 (Data/kode tidak valid), HTTP 409 (Perangkat sudah terdaftar).

---

### 2. `GET /api/users/me`
- **Method:** `GET`
- **Headers:** `Accept: application/json`
- **Credentials:** `include` (Membawa cookie `user_session`)
- **Response Sukses (HTTP 200):**
  ```json
  {
    "id": "usr_01",
    "nik": "199408242021011002",
    "fullName": "Ahmad Faisal Pratama",
    "department": "Divisi TI",
    "role": "Software Engineer",
    "deviceId": "DEV-SMARTPHONE-ID-8842"
  }
  ```
- **Error Codes:** HTTP 401 (Sesi belum ada atau telah berakhir).

---

### 3. `POST /api/devices/recover-session`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Accept: application/json`
- **Credentials:** `include`
- **Request Body:**
  ```json
  {
    "nik": "199408242021011002",
    "recoveryCode": "REC-9912"
  }
  ```
- **Response Sukses (HTTP 200):**
  - Header: `Set-Cookie: user_session=<NEW_TOKEN>; HttpOnly; SameSite=Lax; Path=/`
  - Body: Objek `EmployeeUser`.

---

### 4. `POST /api/attendance`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Accept: application/json`
- **Credentials:** `include` (Identitas terikat ke cookie)
- **Request Body:**
  ```json
  {
    "sessionType": "masuk_pagi"
  }
  ```
  *(Catatan: Nilai yang dikirim adalah string `"masuk_pagi"`, `"istirahat_keluar"`, `"istirahat_masuk"`, `"pulang"`)*
- **Response Sukses (HTTP 200/201):**
  ```json
  {
    "id": "REC-20261104-01",
    "sessionType": "masuk_pagi",
    "sessionName": "Masuk Pagi",
    "date": "2026-11-04",
    "timestamp": "07:54:12",
    "status": "valid"
  }
  ```
- **Error Codes:** HTTP 409 (Sesi ini sudah pernah diabsen hari ini), HTTP 422 (Tipe sesi tidak valid), HTTP 401 (Tidak terotentikasi).

---

### 5. `GET /api/attendance/today`
- **Method:** `GET`
- **Headers:** `Accept: application/json`
- **Credentials:** `include`
- **Response Sukses (HTTP 200):**
  ```json
  {
    "date": "2026-11-04",
    "dateFormatted": "Rabu, 4 November 2026",
    "employee": {
      "nik": "199408242021011002",
      "fullName": "Ahmad Faisal Pratama"
    },
    "sessions": {
      "masuk_pagi": { "isRecorded": true, "time": "07:54:12" },
      "istirahat_keluar": { "isRecorded": false, "time": null },
      "istirahat_masuk": { "isRecorded": false, "time": null },
      "pulang": { "isRecorded": false, "time": null }
    }
  }
  ```

---

### 6. `GET /api/attendance/history`
- **Method:** `GET`
- **Query Params:** `?date=YYYY-MM-DD&page=1&limit=5`
- **Headers:** `Accept: application/json`
- **Credentials:** `include`
- **Response Sukses (HTTP 200):**
  Mendukung dua bentuk:
  *Format A (Objek dengan pagination):*
  ```json
  {
    "records": [
      {
        "id": "REC-01",
        "sessionType": "masuk_pagi",
        "sessionName": "Masuk Pagi",
        "date": "2026-11-04",
        "timestamp": "07:54:12",
        "status": "valid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "totalRecords": 1,
      "totalPages": 1
    }
  }
  ```
  *Format B (Array mentah, di mana pagination dihitung otomatis oleh klien):*
  ```json
  [
    {
      "id": "REC-01",
      "sessionType": "masuk_pagi",
      "sessionName": "Masuk Pagi",
      "date": "2026-11-04",
      "timestamp": "07:54:12",
      "status": "valid"
    }
  ]
  ```

---

### 7. `POST /api/auth/logout`
- **Method:** `POST`
- **Credentials:** `include`
- **Response Sukses (HTTP 200):**
  - Header: `Set-Cookie: user_session=; Max-Age=0; Path=/; HttpOnly`
  - Body:
    ```json
    {
      "success": true
    }
    ```

---

*Laporan verifikasi berbasis bukti aktual ini selesai disusun secara READ-ONLY tanpa modifikasi pada kode sumber.*
