# Employee PWA Integration Fix Report

Tanggal: 5 November 2026  
Mode: perubahan terbatas pada Employee PWA; tidak ada perubahan backend, database, atau Prisma schema.

## 1. Ringkasan Perubahan

- Create attendance kini mengirim field sesi dengan empat nilai enum UI yang tetap dipertahankan.
- Response create divalidasi sesuai source backend aktual: id integer positif, sesi sama dengan request, dan status Hadir. Tidak ada syarat timestamp pada response create.
- Attendance-today adapter/UI mengikuti response backend yang sebenarnya berupa array record sesi. Setelah create tervalidasi, UI mengambil waktuAbsen dari attendance-today dan hanya menampilkan waktu bila backend mengembalikannya.
- Query attendance today dan history di-invalidasi/refetch setelah create berhasil. Mutation tetap retry false.
- Logout karyawan menggunakan POST /api/users/logout; state user tetap ada bila request gagal, dan hanya dibersihkan setelah { success: true } diterima.
- Query date pada history dipertahankan seperti instruksi. Keterbatasan backend dicatat untuk tahap berikutnya.

## 2. File yang Diubah

- src/services/api.ts
- src/types/index.ts
- src/features/dashboard/DashboardPage.tsx
- src/features/attendance/AttendanceConfirmationModal.tsx
- EMPLOYEE_PWA_INTEGRATION_FIX_REPORT.md

Tidak ada file backend yang diubah. Tidak ada endpoint attendance, activation, session check, recovery, atau history yang diubah selain endpoint logout karyawan.

## 3. Perbaikan Request Attendance

- api.recordAttendance() tetap memanggil POST /api/attendance, tetapi sekarang mengirim { sesi: sessionType }.
- Nilai internal UI tetap masuk_pagi, istirahat_keluar, istirahat_masuk, pulang; DTO backend memakai key sesi tanpa mengubah enum UI.
- Semua request tetap menggunakan helper dengan credentials include, cache no-store, timeout 10 detik, dan network error handling.
- Tidak ada NIK atau user ID yang dikirim di body presensi.

## 4. Perbaikan Response Attendance

Source backend yang dibaca untuk verifikasi:

- attendance.routes.ts: POST / menggunakan authenticateUser dan memanggil controller createAttendance.
- attendance.controller.ts, createAttendance(): membaca req.body.sesi, menolak sesi invalid dengan 400, mengambil NIK dari req.user, mengembalikan 201 { success: true, message, data }, 409 untuk duplikat, dan 500 untuk error server.
- attendance.service.ts, ATTENDANCE_SESSIONS: daftar enum empat nilai lowercase; createAttendance() menyimpan status Hadir dan memilih { id, sesi, status } dari Prisma.
- prisma/schema.prisma, AttendanceSession dan model Attendance: enum sesi sama; id integer; status string dengan default Hadir; unique key mencegah duplikasi NIK/tanggal/sesi.
- getTodayAttendance() di service memilih id, sesi, status, waktuAbsen, lalu mengembalikan empat item sesi dengan status Hadir atau Belum Absen.

Frontend sekarang menolak create response yang tidak berisi ID integer positif, sesi yang sama, dan status Hadir. Adapter tidak membuat timestamp pengganti. Setelah create diterima, Dashboard membaca lagi attendance-today, mencari record dengan ID dan sesi yang sama, lalu memformat waktuAbsen backend jika ada. Jika pembacaan lanjutan gagal, create tetap sukses berdasarkan response create yang sudah tervalidasi dan UI tidak menampilkan waktu palsu.

Mutation menginvalidasi/refetch query attendance-today dan history. Tidak ada POST retry otomatis. Bila response create gagal validasi setelah backend mungkin menyimpan record, UI tetap menampilkan error; pengguna masih dapat mencoba kembali secara manual setelah pemeriksaan. Karena itu pesan error meminta pengecekan admin/backend dan keadaan tersebut tetap memiliki risiko duplikasi yang harus diselesaikan dengan kontrak response backend yang terverifikasi.

## 5. Perbaikan Logout

- api.logout() kini mengirim POST /api/users/logout; helper tetap menambahkan credentials include.
- Backend src/modules/users/user.routes.ts mendefinisikan router.post('/logout', logout) di bawah mount /api/users pada src/app.ts.
- Backend createUserLogoutHandler() di src/modules/users/user.controller.ts membaca cookie user_session, memanggil revokeUserSessionByToken(), menghapus cookie, mengembalikan 500 saat revocation gagal, dan { success: true, message } saat berhasil.
- handleResponse() menerima body langsung; validasi success === true cocok dengan response sukses tersebut. AuthProvider.logout() mengosongkan user hanya setelah konfirmasi; error mempertahankan state dan ditampilkan profil.
- POST /api/auth/logout tidak lagi dipanggil dari PWA.

## 6. Riwayat yang Menunggu Perubahan Backend

- PWA tetap mengirim date (saat dipilih), page, dan limit di src/services/api.ts; UI filter dan reset halaman tetap di src/features/history/HistoryPage.tsx.
- Source backend attendance.controller.ts, getAttendanceHistory() hanya membaca/memvalidasi page dan limit; attendance.service.ts, getAttendanceHistory() memfilter berdasarkan NIK dan mengambil halaman, tidak memfilter tanggal. Maka parameter date dari UI belum berpengaruh.
- Backend mengembalikan { success: true, data: result.data, pagination }. handleResponse() hanya unwrap body.data, sehingga metadata pagination sibling tidak sampai ke adapter. Adapter array kemudian menghitung pagination dari array halaman yang diterima.
- Record backend menggunakan field tanggal, sesi, waktuAbsen, status; UI saat ini mengharapkan date, sessionType, timestamp, dan field display lain. Response history juga perlu diselaraskan/diadaptasi pada tahap terpisah.
- Kebutuhan backend tahap berikutnya: sepakati dukungan filter tanggal dan kontrak response/pagination yang dapat dipakai Employee PWA. Tidak ada query date yang dihapus pada perbaikan ini.

## 7. Pemeriksaan TypeScript

- Command: bun run lint (script lint proyek menjalankan tsc --noEmit).
- Status: BERHASIL, exit code 0.
- Typecheck sempat menemukan akses field sessions pada bentuk attendance-today lama; pemanggil dashboard diperbaiki ke array sesi aktual, lalu pemeriksaan ulang lulus.

## 8. Production Build

- Command: bun run build.
- Status: BERHASIL, exit code 0.
- Vite 8.3.5 membangun 1.737 modul; PWA plugin menghasilkan service worker mode generateSW dengan 17 entri precache.

## 9. Risiko dan Hal yang Belum Diverifikasi

- Tidak ada runtime integration test dan tidak ada request attendance/logout yang dikirim. Build bukan bukti integrasi runtime.
- Session check, activation, dan recovery sengaja tidak diubah. Source backend yang diperiksa memperlihatkan kontrak yang perlu ditangani terpisah:
  - device.controller.ts, activateDeviceController() membaca nik, code, deviceName; frontend mengirim nik, activationCode. Response backend berisi nik, status, activatedAt, expiresAt, sedangkan PWA mengharapkan EmployeeUser.
  - session-recovery.controller.ts, recoverEmployeeSession() menerima { nik, recoveryCode } yang cocok, tetapi response hanya data.expiresAt; frontend mengharapkan EmployeeUser.
  - user.controller.ts, profile() mengembalikan data { nik, namaLengkap }; frontend EmployeeUser mengharapkan id, nik, fullName.
- Ketidaksesuaian tersebut dibuktikan dari source backend dan source PWA, tetapi sengaja tidak diubah karena task membatasi activation/session/recovery dan meminta masalah tambahan dicatat terpisah.
- History masih memiliki mismatch parameter date, envelope pagination, dan nama field record sebagaimana dijelaskan di bagian 6.
- Backend recovery route/controller saat ini mencabut sesi aktif sebelumnya sebelum membuat sesi baru; tidak ada perubahan pada perilaku tersebut.
- Pembacaan waktu attendance-today mengandalkan backend mengembalikan waktu ISO yang dapat diparse sebagai JSON Date string. Jika format aktual berbeda atau request baca gagal, sukses create tetap ditampilkan tanpa waktu.

## 10. Langkah Integrasi Berikutnya

1. Putuskan kontrak frontend/backend untuk aktivasi, bentuk profile user, dan recovery response sebelum mengubah area tersebut.
2. Sepakati kontrak history: filter tanggal, field record, dan posisi metadata pagination.
3. Jalankan integration test pada lingkungan backend non-produksi untuk create attendance, duplicate 409, attendance-today time, recovery/logout cookie, serta CORS bila cross-origin.
4. Jangan mengirim ulang manual create attendance setelah response ambigu sebelum record diperiksa melalui backend/admin.

## Konfirmasi Ruang Lingkup

Tidak ada perubahan kode backend, database, schema, migration, Admin Web, autentikasi cookie, filter date UI, atau konfigurasi offline/PWA. Tidak ada mock, fallback timestamp, offline queue, background sync, atau automatic attendance retry yang ditambahkan.
