# Employee PWA Production Readiness Report

Tanggal: 5 November 2026

## Ringkasan

Employee PWA sekarang hanya melaporkan aktivasi, pemulihan, dan presensi berhasil setelah menerima respons backend yang valid. Network error dan timeout menjadi kegagalan; tidak ada presensi offline, antrean, ataupun retry otomatis untuk mutasi presensi. Kontrak URL/payload yang telah ada dipertahankan.

## File yang Diubah

- `src/services/api.ts`
- `src/features/auth/AuthContext.tsx`
- `src/hooks/useOnlineStatus.ts`
- `src/components/layout/TopHeader.tsx`
- `src/components/feedback/OfflineBanner.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/activation/ActivationPage.tsx`
- `src/features/recovery/RecoveryPage.tsx`
- `src/features/profile/ProfilePage.tsx`

## Masalah dan Perbaikan

- Menghapus data karyawan, status hari ini, riwayat, dan attendance record simulasi dari API service.
- Aktivasi dan recovery sekarang meneruskan error jaringan ke halaman.
- Permintaan API menggunakan `credentials: 'include'`, `cache: 'no-store'`, serta timeout 10 detik. Cookie HttpOnly tetap dikelola browser; tidak ada pembacaan atau penyimpanan token sesi di browser storage.
- Presensi hanya sukses jika response backend sukses dan memiliki `id`, `sessionType` yang sama dengan permintaan, serta `timestamp`. Timeout tidak dinyatakan sukses; bila server mungkin telah memproses permintaan sebelum timeout, UI menjelaskan bahwa status perlu dikonfirmasi agar pengguna tidak mengirim ulang tanpa pemeriksaan.
- Presensi mutation disetel `retry: false`. Tombol presensi terkunci saat mutasi berlangsung dan saat status presensi hari ini belum berhasil dimuat.
- Error HTTP 400, 401, 409, 422, dan 500 memiliki penanganan pesan. Error 401 tidak lagi disamarkan sebagai data lokal.
- Logout melempar error bila request gagal atau respons tidak mengonfirmasi `success: true`. State user hanya dikosongkan setelah konfirmasi tersebut; halaman profil menampilkan error logout.
- Status navigator dan ketersediaan API ditampilkan terpisah. Karena tidak ditemukan kontrak health check aktual, pengecekan memakai `GET /api/users/me` yang sudah ada. Respons 404/5xx atau kegagalan jaringan ditandai tidak tersedia; 401 tetap berarti endpoint merespons, bukan sesi valid.
- Menghapus quick-fill kredensial contoh dari halaman aktivasi dan recovery agar tidak mendorong uji coba terhadap backend produksi.
- Konfigurasi PWA hanya meng-cache asset shell dan font eksternal; tidak ada aturan cache request API/auth/attendance atau Background Sync.

## Status Bukti

### VERIFIED BY SOURCE CODE

- Endpoint, method, dan payload yang sudah dipakai frontend tetap: `POST /api/devices/activate`, `GET /api/users/me`, `POST /api/devices/recover-session`, `POST /api/attendance`, `GET /api/attendance/today`, `GET /api/attendance/history`, dan `POST /api/auth/logout`.
- Semua request melewati helper API dengan `credentials: 'include'`; tidak ditemukan `localStorage`/`sessionStorage`, antrean offline, atau attendance retry otomatis.
- Presensi empat sesi tetap `masuk_pagi`, `istirahat_keluar`, `istirahat_masuk`, dan `pulang`.
- Source backend `attendace-system` tidak tersedia pada workspace ini. Dokumen `BACKEND_VERIFICATION_EVIDENCE.md` menyatakan file schema, route, dan controller backend tidak ditemukan. Karena itu, **semua endpoint dan bentuk response masih `PENDING BACKEND VERIFICATION`** terhadap source backend aktual, termasuk `GET /api/users/me` yang dipakai sebagai probe ketersediaan.

### VERIFIED BY BUILD

- Belum terverifikasi. `npm.cmd run build` gagal karena dependency `vite-plugin-pwa` tidak terpasang pada workspace.
- `npm.cmd run lint` (script ini menjalankan `tsc --noEmit`) gagal karena type definitions `vite-plugin-pwa/client` tidak ditemukan.
- Pemanggilan `npm` awalnya terhalang kebijakan PowerShell; `npm.cmd` berhasil menjalankan script, tetapi dependency tidak tersedia. ESLint terpisah belum dapat dijalankan: package scripts tidak mendefinisikan ESLint dan tidak ada ESLint dependency/config yang terlihat.

### VERIFIED BY RUNTIME TEST

- Belum dilakukan. Backend runtime tidak tersedia di workspace dan tugas ini membatasi integrasi runtime sampai kontrak backend diverifikasi.

### PENDING BACKEND INTEGRATION

- Cocokkan ketujuh endpoint di atas, nama cookie `user_session`, status HTTP, payload, dan bentuk response terhadap source `attendace-system`.
- Verifikasi apakah response presensi aktual berisi `id`, `sessionType`, dan `timestamp`; adapter frontend menolak response yang tidak memuat field tersebut.
- Verifikasi logout mencabut sesi karyawan dan menghapus cookie karyawan, serta pastikan `GET /api/users/me` merupakan route yang layak dipakai sebagai probe.
- Verifikasi CORS, `credentials: true`, atribut cookie, dan konfigurasi reverse proxy/on-premise.

## Risiko Tersisa dan Tahap Berikutnya

- Selama backend contract belum diverifikasi, PWA belum dapat dinyatakan terintegrasi atau siap produksi.
- Jika backend berhasil mencatat presensi tetapi koneksi timeout sebelum response diterima, frontend dengan sengaja tidak menyatakan sukses. Pengguna perlu mengecek status ke admin/backend sebelum mencoba ulang.
- Setelah source backend `attendace-system` tersedia, audit kontrak aktual, lalu lakukan build/typecheck dengan dependency proyek yang terpasang dan runtime integration test terpisah.
