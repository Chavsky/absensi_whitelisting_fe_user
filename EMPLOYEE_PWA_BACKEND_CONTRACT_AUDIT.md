# Employee PWA Backend Contract Audit

Tanggal audit: 5 November 2026  
Mode: READ-ONLY. Tidak ada source aplikasi atau backend yang diubah.

## Batas bukti

Workspace yang diaudit berisi Employee PWA. `BACKEND_VERIFICATION_EVIDENCE.md` bagian pembuka menyatakan source backend tidak ditemukan di workspace, termasuk schema Prisma, Express routes/controllers, middleware, migrations, dan service backend. Pemeriksaan file pada workspace ini juga tidak menemukan direktori atau source backend `attendace-system`.

Akibatnya, endpoint dan perilaku backend di bawah berstatus **NOT FOUND**. Dokumen audit sebelumnya bukan implementasi backend dan tidak digunakan sebagai bukti bahwa route, response, atau cookie benar-benar ada. Karena tidak ada kode backend untuk dibandingkan, tidak ada kontrak yang dapat diberi status MATCH atau MISMATCH secara evidence-based.

Frontend path berikut adalah path relatif ke project root. `API_BASE` berasal dari `VITE_API_BASE_URL` dan default-nya string kosong (`src/services/api.ts:14`). Semua panggilan API melalui `request()` yang menetapkan `credentials: 'include'` dan `cache: 'no-store'` (`src/services/api.ts:37-57`).

## A. Aktivasi perangkat — `POST /api/devices/activate`

**Implementasi backend**

- File path: **NOT FOUND**. Tidak ada backend route/controller/service/schema di workspace; lihat `BACKEND_VERIFICATION_EVIDENCE.md`, bagian pembuka dan bagian pemeriksaan backend aktivasi.
- Route dan method: NOT FOUND.
- Controller/service/middleware: NOT FOUND.
- Request validator dan cara memvalidasi NIK/kode aktivasi: NOT FOUND.
- Pembuatan sesi, cookie name/attributes/expiry: NOT FOUND.
- Response JSON dan status sukses/gagal: NOT FOUND.
- Parameter NIK di URL: NOT FOUND; tidak dapat dipastikan apakah backend menggunakan path parameter.

**Implementasi frontend**

- Endpoint: `api.activateDevice()` memanggil `POST ${API_BASE}/api/devices/activate` (`src/services/api.ts:88-90`).
- Payload: `DeviceActivationPayload` berisi `{ nik, activationCode }` (`src/types/index.ts:67-70`); request JSON dibuat melalui `json('POST', payload)` (`src/services/api.ts:70-74`).
- Response yang diharapkan: `EmployeeUser` (`src/services/api.ts:88-90`; tipe di `src/types/index.ts:7-16`). `handleResponse()` menerima body `data` bila properti itu ada, atau body langsung (`src/services/api.ts:59-68`).
- Alur UI: `AuthProvider.activate()` menaruh user ke state setelah `api.activateDevice()` berhasil (`src/features/auth/AuthContext.tsx:30-34`).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: implementasi backend, format response, status HTTP, dan penerbitan sesi tidak tersedia untuk dibandingkan.
- Dampak terhadap integrasi: kompatibilitas path, body, validator, serta cookie belum diketahui.
- Perubahan minimum yang diperlukan: belum dapat ditentukan tanpa route/controller backend aktual; jangan mengganti kontrak frontend secara spekulatif.

## B. Recovery sesi — `POST /api/devices/recover-session`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian pembuka dan pemeriksaan backend recovery/session).
- Route, method, path parameters, controller, service, middleware, dan validator: NOT FOUND.
- Validasi NIK/recovery code, pembuatan sesi, pencabutan sesi lama, tabel database, dan token hash: NOT FOUND.
- Cookie name/attributes/expiry, JSON response, serta status per kondisi: NOT FOUND.

**Implementasi frontend**

- Endpoint: `api.recoverSession()` memanggil `POST ${API_BASE}/api/devices/recover-session` (`src/services/api.ts:91-93`).
- Payload: `{ nik, recoveryCode }` dari `SessionRecoveryPayload` (`src/types/index.ts:72-75`). Tidak ada path parameter yang ditambahkan frontend.
- Response yang diharapkan: `EmployeeUser`; envelope `data` atau body langsung diterima oleh `handleResponse()` (`src/services/api.ts:59-68, 91-93`; `src/types/index.ts:7-16`).
- Alur UI: `AuthProvider.recover()` mengubah user state hanya setelah promise berhasil (`src/features/auth/AuthContext.tsx:36-40`).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: backend mungkin menggunakan path/body/flow berbeda, tetapi source yang dapat membuktikannya tidak ada.
- Dampak terhadap integrasi: pemulihan sesi baru dan pencabutan sesi lama belum dapat dipastikan.
- Perubahan minimum yang diperlukan: tunggu route dan service backend aktual, lalu cocokkan method/path/body/response.

## C. Pemeriksaan sesi — `GET /api/users/me`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian pemeriksaan backend identitas/sesi dan bagian pembuka).
- Route, middleware auth, cookie yang dibaca, validasi token/hash, pencarian session database, relasi identitas karyawan: NOT FOUND.
- Tidak dapat dibuktikan apakah route memeriksa `user_session` atau sesi admin.
- Response valid/tidak valid dan status HTTP: NOT FOUND.

**Implementasi frontend**

- Endpoint: `api.getMe()` memanggil `GET ${API_BASE}/api/users/me` (`src/services/api.ts:85-87`).
- Payload: tidak ada body. Cookie disertakan oleh `request()` (`src/services/api.ts:37-46`).
- Response yang diharapkan: `EmployeeUser` (`src/types/index.ts:7-16`), dapat berupa envelope `data` atau body langsung (`src/services/api.ts:59-68`).
- Inisialisasi: `AuthProvider.checkSession()` memanggil `api.getMe()`; semua error berujung `setUser(null)` (`src/features/auth/AuthContext.tsx:21-28`).
- Probe ketersediaan: `api.checkAvailability()` juga memanggil endpoint ini, tetapi hanya menilai konektivitas/status HTTP tertentu; ini tidak membuktikan sesi valid (`src/services/api.ts:77-84`).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: tidak ada backend source untuk memastikan endpoint ada atau cookie karyawan yang diperiksanya.
- Dampak terhadap integrasi: autentikasi sesi karyawan dan pembedaan sesi admin belum terverifikasi.
- Perubahan minimum yang diperlukan: periksa route serta middleware backend sebelum menyimpulkan endpoint ini benar untuk Employee PWA.

## D. Pencatatan presensi — `POST /api/attendance`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian enum presensi; file schema/controller/route dinyatakan tidak ada).
- Route, validator, controller, service, middleware auth, Prisma schema/model/query: NOT FOUND.
- Nama field body, enum actual, normalisasi/mapping, identitas sumber sesi, validasi waktu, duplicate guard, dan response/error: NOT FOUND.
- Tidak dapat dipastikan apakah identitas karyawan diikat dari sesi atau diambil dari request body.

**Implementasi frontend**

- Endpoint: `api.recordAttendance()` memanggil `POST ${API_BASE}/api/attendance` (`src/services/api.ts:97-103`).
- Payload: `{ sessionType }`; tipe literalnya `masuk_pagi`, `istirahat_keluar`, `istirahat_masuk`, `pulang` (`src/services/api.ts:97-100`; `src/types/index.ts:1-5`). Frontend tidak mengirim NIK/user ID pada body.
- Response yang diterima: `AttendanceRecord`; frontend hanya mengembalikan sukses jika response memuat `id`, `sessionType` sama dengan request, dan `timestamp` (`src/services/api.ts:97-103`). Tipe lengkap frontend juga memuat `nik`, `employeeName`, `sessionName`, `date`, dan `status` (`src/types/index.ts:43-53`), walaupun adapter runtime hanya memvalidasi tiga field tersebut.
- Retry: mutation presensi ditetapkan `retry: false` (`src/features/dashboard/DashboardPage.tsx:93-95`).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: tidak ada bukti backend mengenai field, enum, auth, query, aturan waktu, duplikasi, atau response.
- Dampak terhadap integrasi: request bisa ditolak atau respons backend tidak memenuhi validasi frontend; kecocokan belum diketahui.
- Perubahan minimum yang diperlukan: bandingkan route, validator, service, schema enum, dan query aktual sebelum mengubah adapter frontend.

## E. Presensi hari ini — `GET /api/attendance/today`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian pemeriksaan backend attendance/controller).
- Route, middleware, controller/service, query Prisma, timezone, response aktual, dan status HTTP: NOT FOUND.

**Implementasi frontend**

- Endpoint: `api.getAttendanceToday()` memanggil `GET ${API_BASE}/api/attendance/today` (`src/services/api.ts:94-96`).
- Payload: tidak ada body; cookie disertakan helper request.
- Response yang diharapkan: `AttendanceTodayData` memiliki `date`, `dateFormatted`, `employee { nik, fullName }`, serta empat sesi dengan `{ isRecorded, time }` (`src/types/index.ts:28-41`). Tidak ada runtime schema validation untuk response ini (`src/services/api.ts:94-96`).
- Pemanggil UI: query dashboard menggunakan `api.getAttendanceToday()` (`src/features/dashboard/DashboardPage.tsx`, fungsi `DashboardPage`, sekitar baris 80-91).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: timezone, representasi sesi, response, dan status backend tidak dapat diperiksa.
- Dampak terhadap integrasi: UI mengandalkan bentuk tipe di atas; ketidaksesuaian response belum terdeteksi secara runtime oleh adapter.
- Perubahan minimum yang diperlukan: bandingkan output route/service backend aktual dengan `AttendanceTodayData`.

## F. Riwayat presensi — `GET /api/attendance/history`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian pemeriksaan history controller/query).
- Route, nama parameter tanggal, validasi, pagination, filter, query Prisma, bentuk response, metadata, dan status HTTP: NOT FOUND.

**Implementasi frontend**

- Endpoint: `api.getAttendanceHistory()` memanggil `GET ${API_BASE}/api/attendance/history` (`src/services/api.ts:104-117`).
- Query: `date` bila diberikan, lalu `page` dan `limit` (`src/services/api.ts:104-111`).
- Response yang diterima: array mentah dipotong di client dan dibungkus menjadi `{ records, pagination }`; selain array, data langsung dianggap `AttendanceHistoryResult` (`src/services/api.ts:111-116`). Tipe pagination berisi `page`, `limit`, `totalRecords`, `totalPages` (`src/types/index.ts:55-65`).
- Ini hanya adapter bentuk response; tidak membuktikan backend menerima parameter tersebut atau menyediakan seluruh data sebelum pagination client.

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: nama parameter backend dan perilaku pagination tidak dapat dibandingkan.
- Dampak terhadap integrasi: backend dapat mengabaikan filter/page/limit atau memakai parameter lain; adapter response tidak mengatasi mismatch request.
- Perubahan minimum yang diperlukan: verifikasi query route/controller dan semantik pagination backend aktual.

## G. Logout karyawan — `POST /api/auth/logout`

**Implementasi backend**

- File path: **NOT FOUND** (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian pemeriksaan backend logout).
- Route, middleware, penggunaan oleh admin/karyawan, cookie/token yang dibaca, session table, revocation/hash, cookie yang dihapus beserta opsi, body response, dan status HTTP: NOT FOUND.
- Tidak dapat dibuktikan bahwa `user_session` dicabut; juga tidak dapat dibuktikan bahwa endpoint hanya menangani `admin_session`.

**Implementasi frontend**

- Endpoint: `api.logout()` memanggil `POST ${API_BASE}/api/auth/logout` tanpa JSON body (`src/services/api.ts:118-122`).
- Cookie disertakan oleh helper request. Response yang diharapkan `{ success: true }`; selain itu frontend melempar error (`src/services/api.ts:118-121`).
- State user baru dikosongkan setelah `api.logout()` berhasil (`src/features/auth/AuthContext.tsx:42-48`).

**Hasil perbandingan**

- Status: **NOT FOUND**.
- Detail perbedaan: target cookie dan efek pencabutan sesi di backend tidak tersedia.
- Dampak terhadap integrasi: response `{ success: true }` saja belum membuktikan token employee telah dicabut; perlu bukti perilaku server.
- Perubahan minimum yang diperlukan: telusuri route/middleware/session service aktual sebelum menetapkan kompatibilitas logout.

## H. CORS dan konfigurasi cookie

**Implementasi backend**

- File path: **NOT FOUND**. Konfigurasi Express CORS, `res.cookie`/`clearCookie`, proxy trust, origin allowlist, dan konfigurasi production/development tidak ada pada workspace (`BACKEND_VERIFICATION_EVIDENCE.md`, bagian CORS/cookie).
- Allowed origin, `credentials`, HttpOnly, Secure, SameSite, Path, lifetime, serta reverse proxy: NOT FOUND.
- Tidak ada IP, port, atau origin deployment yang dapat dinyatakan sebagai fakta.

**Implementasi frontend**

- Semua request API menyetel `credentials: 'include'` (`src/services/api.ts:37-46`).
- API base diambil dari `VITE_API_BASE_URL` atau relative same-origin URL (`src/services/api.ts:14`).
- Frontend tidak membaca cookie HttpOnly atau menyimpan token; sesi dikelola browser (`src/services/api.ts:1-2`).

**Hasil perbandingan**

- Status: **NOT FOUND** untuk backend; kesiapan deployment lintas origin tidak dapat dinilai.
- Detail perbedaan: frontend mengirim credentials, tetapi backend CORS dan atribut cookie tidak tersedia.
- Dampak terhadap integrasi: cross-origin cookie dapat gagal tanpa konfigurasi server yang sesuai; konfigurasi aktual belum diketahui.
- Perubahan minimum yang diperlukan: audit konfigurasi server dan deployment aktual sebelum memutuskan perubahan frontend.

## Ringkasan

| Komponen | Status | Bukti | Tindakan |
|---|---|---|---|
| Aktivasi | NOT FOUND | Backend route/controller tidak tersedia; frontend `api.activateDevice()` di `src/services/api.ts:88-90` | Dapatkan source backend, cocokkan path/body/response/cookie |
| Recovery | NOT FOUND | Backend recovery/session service tidak tersedia; frontend `api.recoverSession()` di `src/services/api.ts:91-93` | Verifikasi route, revocation flow, response |
| Pemeriksaan sesi | NOT FOUND | Backend auth middleware tidak tersedia; frontend `api.getMe()` di `src/services/api.ts:85-87` | Pastikan route memvalidasi sesi employee |
| Presensi | NOT FOUND | Backend route/validator/schema tidak tersedia; frontend `api.recordAttendance()` di `src/services/api.ts:97-103` | Cocokkan field, enum, identitas sesi, rules, response |
| Presensi hari ini | NOT FOUND | Backend query/route tidak tersedia; frontend type di `src/types/index.ts:28-41` | Cocokkan timezone dan bentuk response |
| Riwayat | NOT FOUND | Backend query/route tidak tersedia; frontend query adapter di `src/services/api.ts:104-117` | Cocokkan parameter dan pagination server |
| Logout | NOT FOUND | Backend logout/revocation tidak tersedia; frontend `api.logout()` di `src/services/api.ts:118-122` | Buktikan pencabutan `user_session` dan cookie clearing |
| CORS dan cookie | NOT FOUND | Konfigurasi backend/proxy tidak tersedia; frontend credentials di `src/services/api.ts:37-46` | Audit origin, credentials, atribut cookie, deployment |

## Kelompok Temuan

1. **MATCH:** Tidak ada yang dapat ditetapkan tanpa source backend pembanding.
2. **MISMATCH:** Tidak ada mismatch yang dapat dibuktikan tanpa source backend. Ini bukan bukti bahwa tidak ada mismatch.
3. **PARTIAL MATCH:** Tidak ada perbandingan lintas implementasi yang bisa dibuat; frontend saja bukan partial match backend.
4. **NOT FOUND:** Seluruh route/controller/service/schema/middleware dan konfigurasi backend yang diperiksa tidak ditemukan pada workspace ini.
5. **NEEDS RUNTIME VERIFICATION:** Setelah source backend tersedia dan kontrak kode dicocokkan, uji status/response, cookie karyawan, CORS lintas origin (jika digunakan), presensi duplikat, dan logout pada lingkungan integrasi. Belum ada hasil runtime dalam audit ini.

## Rekomendasi prioritas

1. Sediakan checkout/path backend `attendace-system` yang sesuai dengan deployment Employee PWA; audit ini tidak dapat menyimpulkan kontrak backend dari laporan lama.
2. Cocokkan aktivasi, recovery, dan `GET /api/users/me` lebih dulu, terutama nama sesi/cookie serta pemisahan sesi admin dan karyawan.
3. Cocokkan presensi: middleware identitas, enum dan field, aturan waktu/duplikasi, serta struktur respons yang memenuhi validasi frontend.
4. Cocokkan presensi hari ini dan history termasuk zona waktu, query tanggal, pagination, dan struktur response.
5. Verifikasi logout mencabut sesi employee, lalu audit CORS/cookie dan reverse proxy berdasarkan konfigurasi deployment aktual.
6. Baru setelah bukti kode cukup, lakukan runtime integration test tanpa migration atau perubahan database.
