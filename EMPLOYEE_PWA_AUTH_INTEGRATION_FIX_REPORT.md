# Employee PWA Auth Integration Fix Report

Tanggal: 5 November 2026

## Ringkasan

Alur activation, session profile, dan recovery Employee PWA diselaraskan dengan kontrak backend yang diverifikasi. Mutasi activation/recovery tidak lagi diperlakukan sebagai data profile; setelah respons sukses, PWA memanggil GET /api/users/me, memvalidasi DTO profile backend, lalu memetakannya menjadi model UI. Jika pemuatan profile gagal setelah mutasi dikonfirmasi atau status mutasi tidak pasti, layar menyediakan retry GET profile/session tanpa mengirim ulang kode.

## File yang Diubah

- src/services/api.ts
- src/types/index.ts
- src/features/auth/AuthContext.tsx
- src/app/router.tsx
- EMPLOYEE_PWA_AUTH_INTEGRATION_FIX_REPORT.md

Tidak ada perubahan backend, database, schema, migration, Admin Web, atau autentikasi cookie.

## Kontrak Aktivasi Sebelum dan Sesudah

Sebelum: PWA mengirim { nik, activationCode } dan menganggap respons aktivasi sebagai EmployeeUser.

Sesudah: api.activateDevice() mengirim { nik, code }; request tetap memakai credentials include. Response diperlakukan sebagai DeviceActivationResult dan divalidasi terhadap NIK, status active, activatedAt, dan expiresAt sebelum dianggap konfirmasi valid.

Setelah aktivasi terkonfirmasi, AuthContext memanggil getMe(). Hanya profile hasil GET /api/users/me yang mengisi state user dan membuka dashboard. Jika response mutasi sukses tetapi response tidak valid, atau request berakhir pada network/timeout yang hasilnya ambigu, PWA tidak mengulang POST. UI menawarkan pemeriksaan session/profile saja.

Bukti backend yang dicocokkan: src/modules/devices/device.controller.ts, activateDeviceController() membaca nik, code, deviceName opsional, mengeluarkan cookie user_session, dan mengembalikan data nik/status/activatedAt/expiresAt.

## Mapping Profile Backend ke Model UI

- DTO backend: EmployeeProfileDto { nik, namaLengkap }.
- Model UI: EmployeeUser { nik, fullName, ...opsional }.
- getMe() melakukan runtime validation bahwa response adalah object, nik string tidak kosong, dan namaLengkap string tidak kosong.
- Pemetaan: namaLengkap menjadi fullName; NIK dipertahankan.
- Properti id dihapus dari EmployeeUser karena tidak dipakai oleh komponen UI dan tidak dikirim backend. Tidak ada ID database buatan.
- Response yang malformed menjadi ApiError INVALID_PROFILE, bukan TypeScript cast seolah valid.

Bukti backend: src/modules/users/user.controller.ts, profile() mengembalikan data { nik, namaLengkap } setelah authenticateUser pada src/modules/users/user.routes.ts.

## Alur Recovery Sebelum dan Sesudah

Sebelum: PWA mengharapkan response recovery sebagai EmployeeUser.

Sesudah:
1. PWA mengirim POST /api/devices/recover-session dengan { nik, recoveryCode }.
2. Response diperlakukan sebagai SessionRecoveryResult { expiresAt }, bukan profile.
3. Setelah response recovery tervalidasi, PWA menjalankan GET /api/users/me.
4. Profile UI dibuat hanya dari DTO hasil pemeriksaan sesi.
5. Jika pembacaan profile gagal, layar menampilkan recovery telah dikonfirmasi dan tombol retry hanya memanggil GET /api/users/me.

Bukti backend: src/modules/devices/session-recovery.controller.ts, recoverEmployeeSession() mengembalikan data { expiresAt } dan memasang cookie user_session. Service mencabut sesi lama sebelum membuat sesi baru pada transaksi recovery.

## Perbaikan Pemeriksaan Sesi

- HTTP 401 dari GET /api/users/me menetapkan status unauthenticated dan menampilkan alur aktivasi.
- Network error/timeout, HTTP 5xx, response profile malformed, dan kegagalan selain 401 menetapkan status unavailable, bukan status logout.
- Router menampilkan pesan koneksi/profile dan tombol retry. Request retry adalah GET session/profile.
- Bila action activation/recovery sebelumnya sudah dikonfirmasi tetapi profile belum termuat, router menampilkan status profile-pending. Form tidak tersedia pada state itu sehingga tombol hanya dapat mengulang pemeriksaan profile.
- Cookie tidak dibaca, dihapus, atau disimpan oleh JavaScript. Tidak ada token sesi di localStorage/sessionStorage.
- Logout behavior tidak diubah oleh tugas ini.

## Verifikasi

### TypeScript

- Command: bun run lint
- Hasil: **BERHASIL**, tsc --noEmit exit code 0.

### Production Build

- Command: bun run build
- Hasil: **BERHASIL**, exit code 0.
- Vite 8.3.5 mentransformasi 1.737 modul; PWA generateSW membuat 17 entri precache.

### Source audit

- Semua pemanggil activation, getMe, recovery, dan EmployeeUser diperiksa.
- API activation tidak lagi membangun payload dengan key activationCode. Nama activationCode hanya dipakai sebagai state/label input lokal di halaman aktivasi.
- Tidak ditemukan pemakaian user.id setelah properti itu dihapus.
- Tidak ditemukan localStorage/sessionStorage atau mock profile pada source aplikasi.
- Tidak ada request activation/recovery yang dijalankan selama verifikasi.

## Belum Diuji Runtime

Tidak dilakukan pengujian browser atau integrasi runtime dengan backend. Cookie issuance, profile mapping nyata lintas origin, serta kondisi server perlu diuji pada lingkungan non-produksi. Build berhasil tidak membuktikan runtime integration.

## File dan Perilaku yang Tetap Menunggu Tahap Lain

Kontrak riwayat dan filter tanggal tidak diubah dalam pekerjaan ini. Attendance, logout, serta PWA/offline policy dari pekerjaan sebelumnya juga tidak diubah.

