# Employee PWA Frontend Contract Verification

Tanggal: 5 November 2026  
Mode: READ-ONLY. Tidak ada file aplikasi atau konfigurasi yang diubah.

## 1. Ringkasan

Workspace aktif diverifikasi sebagai Employee PWA: root memiliki `package.json` dan `src`, serta source `src/services/api.ts`, auth, dashboard, dan history tersedia.

Audit membaca source frontend aktual. Pembanding backend diambil dari temuan yang dicantumkan dalam instruksi pengguna: endpoint aktivasi/session/attendance/today/history, field attendance `sesi`, response create `{ data: { id, sesi, status } }`, history tidak membaca `date`, dan logout karyawan `POST /api/users/logout` sementara `/api/auth/logout` adalah logout admin. Source backend tidak dibaca ulang pada audit ini; detail backend di luar fakta yang diberikan tetap dianggap belum diketahui.

Temuan utama:

- Aktivasi, pemeriksaan sesi, recovery, dan presensi hari ini memiliki path/method yang selaras dengan referensi backend, tetapi detail payload/response tidak seluruhnya tersedia untuk membuktikan kecocokan penuh.
- Create attendance **MISMATCH**: PWA mengirim `sessionType`, sedangkan referensi backend menyebut `sesi`. Response backend yang dirujuk tidak memenuhi validasi frontend `id + sessionType + timestamp`.
- History **PARTIAL**: PWA mengirim `page`, `limit`, dan `date`; referensi backend mendukung page/limit tetapi tidak membaca date.
- Logout **MISMATCH**: PWA memanggil `/api/auth/logout` (referensi menyatakan logout admin); endpoint karyawan pada referensi adalah `/api/users/logout`.

## 2. File yang Diperiksa

- `src/services/api.ts` — seluruh request, unwrap response, validasi presensi, dan pemetaan HTTP error.
- `src/types/index.ts` — tipe payload dan response yang diharapkan.
- `src/features/auth/AuthContext.tsx` — inisialisasi, aktivasi, recovery, dan state logout.
- `src/features/dashboard/DashboardPage.tsx` — mutasi presensi, invalidasi query, dan pemanggil request.
- `src/features/attendance/AttendanceConfirmationModal.tsx` — state pending, feedback sukses/error, dan kemungkinan pengiriman manual ulang.
- `src/features/history/HistoryPage.tsx` — filter tanggal, page/limit, dan pemanggil history.
- `src/features/activation/ActivationPage.tsx` — validasi ringan, submit, dan feedback aktivasi.
- `src/features/recovery/RecoveryPage.tsx` — validasi ringan, submit, dan feedback recovery.
- `src/features/profile/ProfilePage.tsx` — alur UI logout dan error.
- `src/app/providers.tsx` — default retry query (bukan attendance mutation).

Tidak dibaca: `.env`, file secret, atau nilai konfigurasi rahasia. Tidak ada request API atau operasi yang mengubah data yang dijalankan.

## 3. Kontrak API Aktual Frontend

Semua endpoint memakai `API_BASE = VITE_API_BASE_URL || ''` (`src/services/api.ts:14`) dan melalui `request()` yang menambahkan `credentials: 'include'`, `cache: 'no-store'`, `AbortController`, serta timeout 10 detik (`src/services/api.ts:37-57`). Header JSON dibuat oleh `json()` (`src/services/api.ts:70-74`); GET memakai `Accept: application/json`.

`handleResponse()` membaca JSON hanya bila content type JSON, menolak seluruh response non-2xx dengan `ApiError`, dan unwrap `body.data` bila tersedia; jika tidak, ia memakai body langsung (`src/services/api.ts:59-68`). Pesan status yang dipetakan eksplisit: 400, 401, 403, 409, 422, 500; status lain mendapat pesan default (`src/services/api.ts:24-35`). Ini pemetaan pesan, bukan validasi bahwa backend memang memakai semua status tersebut.

| Fitur | Request aktual PWA | Respons yang diharapkan PWA | Kontrak backend (referensi pengguna) | Status |
|---|---|---|---|---|
| Aktivasi perangkat | `POST ${API_BASE}/api/devices/activate`; JSON `{ nik, activationCode }`; `Accept`, `Content-Type`; credentials include | `EmployeeUser`, body langsung atau `{ data: EmployeeUser }` | Endpoint yang diberikan `POST /api/devices/activate`; body/response backend tidak dirinci dalam referensi ini | **PARTIAL** |
| Pemeriksaan session | `GET ${API_BASE}/api/users/me`; tanpa body; `Accept`; credentials include | `EmployeeUser`, body langsung atau `{ data: EmployeeUser }` | Endpoint yang diberikan `GET /api/users/me`; middleware/cookie/response backend tidak dirinci di referensi | **PARTIAL** |
| Pemulihan session | `POST ${API_BASE}/api/devices/recover-session`; JSON `{ nik, recoveryCode }`; `Accept`, `Content-Type`; credentials include | `EmployeeUser`, body langsung atau `{ data: EmployeeUser }` | Endpoint yang diberikan `POST /api/devices/recover-session`; body/response backend tidak dirinci dalam referensi ini | **PARTIAL** |
| Pencatatan absensi | `POST ${API_BASE}/api/attendance`; JSON `{ sessionType }`, nilai `masuk_pagi`, `istirahat_keluar`, `istirahat_masuk`, atau `pulang`; credentials include | Setelah unwrap, harus ada `id`, `sessionType` sama dengan request, dan `timestamp`; `AttendanceRecord` juga mendeklarasikan `nik`, `employeeName`, `sessionName`, `date`, `status` | Backend menerima field `sesi`; response yang diberikan adalah `data.id`, `data.sesi`, `data.status` | **MISMATCH** |
| Absensi hari ini | `GET ${API_BASE}/api/attendance/today`; tanpa body; `Accept`; credentials include | `AttendanceTodayData`: tanggal, employee, dan empat sesi `{ isRecorded, time }` | Endpoint yang diberikan `GET /api/attendance/today`; response detail backend tidak dirinci dalam referensi | **PARTIAL** |
| Riwayat absensi | `GET ${API_BASE}/api/attendance/history?page=N&limit=5&date=YYYY-MM-DD` (date hanya bila filter aktif); `Accept`; credentials include | Array langsung atau objek `AttendanceHistoryResult` `{ records, pagination }` | Backend mendukung `page` dan `limit`, tetapi tidak membaca `date`; bentuk response backend tidak dirinci dalam referensi | **PARTIAL** |
| Logout | `POST ${API_BASE}/api/auth/logout`; tanpa body; `Accept`; credentials include | Setelah unwrap, `{ success: true }` | Referensi menyebut logout employee `POST /api/users/logout`; `/api/auth/logout` adalah logout admin | **MISMATCH** |

Referensi backend di tabel adalah batas informasi pembanding dari instruksi. Untuk detail yang tidak dicantumkan di atas, laporan tidak menambahkan asumsi.

## 4. Temuan Per Endpoint

### Aktivasi perangkat

- Bukti request: `api.activateDevice()` di `src/services/api.ts:88-90`; tipe `{ nik, activationCode }` di `src/types/index.ts:67-70`.
- Auth flow: `AuthProvider.activate()` menaruh data ke state hanya jika request resolve (`src/features/auth/AuthContext.tsx:30-34`). `ActivationPage.handleSubmit()` menampilkan sukses/navigasi hanya setelah `activate()` resolve dan meneruskan error ke UI (`src/features/activation/ActivationPage.tsx:20-46`).
- Status **PARTIAL** sebab path/method cocok dengan referensi, tetapi detail backend body, response, validasi, serta cookie tidak disediakan untuk dibandingkan.
- Risiko: `EmployeeUser` merupakan cast TypeScript, bukan runtime schema validation; response 2xx dengan object yang bentuknya salah bisa lolos `handleResponse()`.

### Pemeriksaan session

- Bukti request `api.getMe()`: `src/services/api.ts:85-87`; inisialisasi `AuthProvider.checkSession()` di `src/features/auth/AuthContext.tsx:21-28`.
- Pada kegagalan apa pun, termasuk network/server error, catch mengosongkan `user` (`AuthContext.tsx:23-25`); PWA tidak membedakan sesi invalid dengan API tak terjangkau pada state auth.
- Status **PARTIAL** sebab path/method cocok dengan referensi, tetapi referensi tidak memberi detail response atau bukti middleware/cookie.
- Risiko: error pemeriksaan session saat start juga membuat app menganggap user tidak ada secara lokal, walaupun penyebabnya bisa jaringan.

### Pemulihan session

- Bukti request/payload: `api.recoverSession()` di `src/services/api.ts:91-93`; tipe `{ nik, recoveryCode }` di `src/types/index.ts:72-75`.
- `AuthProvider.recover()` mengubah user state hanya setelah request resolve (`src/features/auth/AuthContext.tsx:36-40`); halaman menangani success/error di `src/features/recovery/RecoveryPage.tsx:20-46`.
- Status **PARTIAL** karena endpoint sama, tetapi referensi tidak mencantumkan kontrak body/response/revocation secara lengkap.
- Risiko: struktur response yang tidak cocok tetap dapat di-cast sebagai `EmployeeUser` tanpa validasi field.

### Pencatatan absensi

- Request aktual pasti mengirim `{ sessionType }`; tidak ada NIK/user ID pada body (`api.recordAttendance()`, `src/services/api.ts:97-103`). Nilai sesi berasal dari union `AttendanceSessionType` (`src/types/index.ts:1-5`).
- `handleResponse()` terlebih dulu unwraps `body.data` (`src/services/api.ts:59-68`). Referensi backend mengatakan bentuk create adalah `data.id`, `data.sesi`, `data.status`; setelah unwrap, adapter mensyaratkan `result.id`, `result.sessionType === sessionType`, dan `result.timestamp` (`src/services/api.ts:97-103`). `sesi` tidak sama dengan `sessionType`, dan referensi tidak menyebut `timestamp`; karena itu response yang dirujuk akan ditolak sebagai `INVALID_ATTENDANCE_RESPONSE`.
- Jika server telah menyimpan record sebelum memberikan response yang gagal validasi, mutation masuk ke jalur error. Dashboard meng-invalidasi today/history hanya pada `onSuccess` (`src/features/dashboard/DashboardPage.tsx:93-110`), jadi invalidasi tidak terjadi. Modal tetap menampilkan error dan tidak masuk success state (`src/features/attendance/AttendanceConfirmationModal.tsx:62-72`).
- Retry otomatis mutation dimatikan (`DashboardPage.tsx:93-95`). Namun tombol konfirmasi kembali aktif setelah error karena `isSubmitting` dikembalikan ke false (`AttendanceConfirmationModal.tsx:59-72`); pengguna dapat mengirim lagi secara manual. Jika request sebelumnya telah tercatat backend, request berikutnya berisiko ditolak sebagai duplikat atau—bergantung backend—menimbulkan efek ganda. UI error juga menyebut status belum dapat dipastikan dan meminta pemeriksaan admin (`api.ts:99-101`).
- Status **MISMATCH** berdasarkan field dan bentuk response yang dinyatakan dalam referensi backend.

### Absensi hari ini

- Request `api.getAttendanceToday()` ada di `src/services/api.ts:94-96`; Dashboard menggunakannya dalam query di `src/features/dashboard/DashboardPage.tsx:85-90`.
- PWA mengharapkan `AttendanceTodayData` yang ditentukan pada `src/types/index.ts:28-41`. Runtime response hanya di-cast; tidak divalidasi secara struktural.
- Status **PARTIAL**: endpoint cocok dengan referensi, tetapi response backend tidak diberikan untuk perbandingan.

### Riwayat absensi

- Query state/filter UI: `selectedDate`, `currentPage`, limit 5, query key, serta pemanggilan service di `src/features/history/HistoryPage.tsx:23-45`. Perubahan filter mereset page ke 1 (`HistoryPage.tsx:55-67`); input tanggal memanggil `handleDateChange` (`HistoryPage.tsx:101-102`).
- Service mengirim `date` jika tanggal dipilih, dan selalu mengirim `page` serta `limit` (`src/services/api.ts:104-111`). Filter hari ini dan tanggal pilihan diterapkan sebagai nilai `selectedDate` (`HistoryPage.tsx:60-67, 101-107`).
- Unwrap dilakukan lebih dulu oleh `handleResponse()`. Service lalu menerima array mentah dan melakukan slice di client, atau menganggap object sebagai `AttendanceHistoryResult` (`src/services/api.ts:111-116`). Untuk array, pagination client hanya mengetahui total array yang diterima.
- Referensi menyatakan backend tidak membaca `date`; maka ketika filter aktif, PWA mengirim parameter yang tidak dipakai server. Path dan page/limit cocok, date filter tidak.
- Status **PARTIAL**. Dampak: tampilan filter tanggal tidak akan memfilter data server berdasarkan tanggal menurut referensi; client adapter tidak memperbaiki hal ini.

### Logout

- `api.logout()` memanggil `POST /api/auth/logout`, tanpa body, credentials include; sukses hanya jika response setelah unwrap memiliki `success === true` (`src/services/api.ts:118-122`).
- `AuthProvider.logout()` mengosongkan user hanya setelah `api.logout()` resolve; jika gagal state dipertahankan dan error dilempar ke pemanggil (`src/features/auth/AuthContext.tsx:42-48`). Profil menampilkan error dan tidak navigasi jika gagal (`src/features/profile/ProfilePage.tsx:34-45`).
- Referensi menyebut `/api/auth/logout` sebagai logout admin dan `/api/users/logout` untuk karyawan. PWA memakai endpoint admin; URL mismatch ini terbukti dari pembandingan.
- Status **MISMATCH**. Risiko: request employee dapat menuju handler admin dan tidak mencabut sesi karyawan. Dampak persis backend tidak disimpulkan lebih jauh dari referensi.

## 5. Error Handling dan Status HTTP

- `handleResponse()` menganggap seluruh non-2xx sebagai error dan membaca `message`, `error`, serta `code` jika ada (`src/services/api.ts:59-68`).
- Pesan khusus tersedia untuk 400/401/403/409/422/500 (`src/services/api.ts:24-35`); bentuk status aktual backend tidak diverifikasi ulang dalam audit ini.
- Network error dan timeout dibungkus sebagai `ApiError` status 0 dengan kode `NETWORK_ERROR` atau `TIMEOUT` oleh `request()` (`src/services/api.ts:37-57`).
- `api.getAttendanceToday()` dan activation/recovery/session tidak memiliki validasi runtime schema response selain pemeriksaan `res.ok`.
- Query GET dapat retry sekali berdasarkan default `QueryClient` (`src/app/providers.tsx:6-12`). Attendance mutation secara eksplisit `retry: false` (`src/features/dashboard/DashboardPage.tsx:93-95`).

## 6. Rekomendasi Perubahan Minimum — Belum Diterapkan

Keputusan perubahan tetap menunggu persetujuan. Alternatif berikut menjelaskan tradeoff, bukan memilih atau menerapkan salah satunya.

### A. Create attendance (`sessionType` vs `sesi`, response shape)

- **Alternatif A — sesuaikan frontend dengan backend:** kirim field `sesi` dan sesuaikan adapter dengan response yang benar-benar dikembalikan, termasuk status sukses tanpa mengarang timestamp. Konsekuensi: mengubah tipe/request frontend; perlu memastikan response tetap dapat memberi bukti yang cukup agar UI tidak menyatakan sukses tanpa konfirmasi server. Risiko: kompatibilitas dengan client frontend lain jika kontrak backend dipakai bersama.
- **Alternatif B — sesuaikan backend dengan frontend:** terima `sessionType` atau sediakan mapping, dan kembalikan bentuk response yang memenuhi kebutuhan PWA (`id`, session type yang dapat dibandingkan, timestamp). Konsekuensi: perubahan backend API/validator/serializer. Risiko: semua consumer backend harus tetap kompatibel dan mapping enum harus konsisten.
- **Prioritas:** tinggi. Sampai diselaraskan, backend yang sukses menyimpan tetapi mengembalikan response referensi akan dianggap gagal frontend; pengiriman manual ulang masih mungkin.

### B. History date filter

- **Alternatif A — sesuaikan frontend:** hilangkan/ubah filter tanggal agar sesuai kemampuan backend, atau tampilkan filter hanya jika backend menyediakan kontrak tanggal lain yang terverifikasi. Konsekuensi: UX filter tanggal berubah/berkurang; risiko tidak dapat memilih tanggal sampai kontrak tersedia.
- **Alternatif B — sesuaikan backend:** implementasikan dukungan `date` sesuai format frontend, atau sepakati filter rentang lain dan ubah kontrak bersama. Konsekuensi: perubahan route/query/filter backend. Risiko: kompatibilitas client lain dan semantik zona waktu/tanggal harus ditentukan.
- **Prioritas:** menengah; parameter `date` yang tidak dibaca membuat hasil filter salah atau tampak tidak berefek.

### C. Employee logout path

- **Alternatif A — sesuaikan frontend:** panggil `/api/users/logout` bila route employee tersebut terverifikasi menyediakan pencabutan cookie/session yang dimaksud. Konsekuensi: endpoint frontend berubah. Risiko: tetap gagal bila response/cookie endpoint itu belum cocok.
- **Alternatif B — sesuaikan backend:** jadikan `/api/auth/logout` menangani employee dengan benar atau menyediakan kompatibilitas route yang jelas, sembari mempertahankan pemisahan admin/employee. Konsekuensi: perubahan backend auth. Risiko keamanan bila pemisahan sesi kabur atau handler salah mencabut jenis cookie.
- **Prioritas:** tinggi karena endpoint frontend menurut referensi diarahkan ke logout admin.

### D. Detail response activation/session/today

- **Alternatif A — sesuaikan frontend:** ubah tipe/adapter hanya setelah response backend aktual dan stabil diketahui. Konsekuensi: perubahan validasi/adaptasi frontend; risiko melemahkan validasi jika bentuk response dilonggarkan tanpa alasan.
- **Alternatif B — sesuaikan backend:** kembalikan kontrak yang dibutuhkan PWA secara konsisten. Konsekuensi: perubahan serializer/controller. Risiko: perubahan kontrak bagi consumer lain.
- **Prioritas:** lakukan verifikasi response aktual sebelum memilih; referensi yang tersedia belum cukup untuk menetapkan mismatch response.

## 7. Kesimpulan

| Fitur | Status | Bukti utama | Perubahan minimum yang perlu diputuskan |
|---|---|---|---|
| Aktivasi | PARTIAL | `api.activateDevice()`, `src/services/api.ts:88-90`; body type `src/types/index.ts:67-70` | Verifikasi body/response backend; belum ada perubahan yang dapat dibenarkan |
| Pemeriksaan session | PARTIAL | `api.getMe()`, `src/services/api.ts:85-87`; auth init `AuthContext.tsx:21-28` | Verifikasi middleware, cookie, response backend |
| Recovery | PARTIAL | `api.recoverSession()`, `src/services/api.ts:91-93` | Verifikasi body/response dan efek session backend |
| Create attendance | MISMATCH | `sessionType` dan validasi `src/services/api.ts:97-103`; backend reference menyebut `sesi`, response `id/sesi/status` | Selaraskan request dan response frontend/backend |
| Attendance today | PARTIAL | API `src/services/api.ts:94-96`; tipe `src/types/index.ts:28-41` | Bandingkan response backend aktual |
| Attendance history | PARTIAL | Query `src/services/api.ts:104-116`; filter UI `HistoryPage.tsx:23-67`; backend reference tidak membaca `date` | Putuskan dukungan tanggal di frontend/backend |
| Logout | MISMATCH | Frontend `src/services/api.ts:118-122`; auth state `AuthContext.tsx:42-48`; backend reference memisahkan route employee | Selaraskan endpoint employee, cookie, dan response |

Kontrak response activation/session/today serta detail middleware, cookie, dan CORS masih perlu bukti backend aktual. Tidak ada perubahan aplikasi dilakukan dalam audit ini; laporan ini menunggu instruksi keputusan berikutnya.
