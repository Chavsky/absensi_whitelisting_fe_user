# Implementasi Persistent Device Session Employee PWA

Tanggal: 5 November 2026

## Ringkasan Perubahan

Employee PWA tidak lagi menyediakan logout atau pencabutan sesi mandiri. Status akses dan identitas karyawan tetap ditentukan oleh backend melalui cookie HttpOnly dan pemeriksaan `GET /api/users/me`. Kegagalan jaringan/server ditampilkan sebagai status tidak tersedia, bukan logout; hanya HTTP 401 yang menandai sesi tidak terautentikasi.

Aktivasi dan pemulihan tetap menggunakan kode yang diterbitkan Admin. Setelah mutasi berhasil, PWA wajib memverifikasi profile melalui `GET /api/users/me`. Jika hasil mutasi tidak pasti (network/timeout, HTTP 5xx, atau response sukses tidak valid), UI hanya mengizinkan pemeriksaan session/profile dan tidak mengirim ulang kode.

## File yang Diubah

- `src/services/api.ts`
- `src/features/auth/AuthContext.tsx`
- `src/features/profile/ProfilePage.tsx`
- `src/features/activation/ActivationPage.tsx`
- `src/features/recovery/RecoveryPage.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `EMPLOYEE_PWA_PERSISTENT_SESSION_IMPLEMENTATION.md` (laporan ini)

Tidak ada perubahan pada backend, database, migration, Admin Web, atau kontrak endpoint.

## Perubahan UI

- Menghapus tombol logout, konfirmasi lepas sesi, dan aksi pencabutan perangkat dari halaman profil.
- Mengganti ikon sesi absensi "Pulang" agar tidak tampak sebagai kontrol logout aplikasi.
- Menghapus fungsi logout dari AuthContext dan pemanggilan endpoint logout dari API client.
- Profil menampilkan status sesi berdasarkan keberhasilan verifikasi profile oleh backend, mode akses PWA/browser, serta keterangan cookie dikelola browser.
- Menghapus ID perangkat contoh yang sebelumnya ditampilkan sebagai fallback. UI menjelaskan bahwa aplikasi tidak memverifikasi identitas hardware secara mutlak dan profile yang digunakan tidak menyediakan nama/ID perangkat.
- Aktivasi dan pemulihan menjelaskan bahwa kode diterbitkan Admin dan tidak membuat klaim identifikasi hardware.
- Form pemulihan tetap menerima kode dari Admin; tidak ada proses meminta atau menerbitkan kode secara mandiri.

## Perubahan Integrasi API

- Endpoint yang digunakan tetap `GET /api/users/me`, `POST /api/devices/activate`, `POST /api/devices/recover-session`, `POST /api/attendance`, `GET /api/attendance/today`, dan `GET /api/attendance/history`.
- Pemanggilan `POST /api/users/logout` dihapus. Tidak ada endpoint pengganti logout.
- Semua request tetap menggunakan `credentials: 'include'`; token tidak dibaca atau disimpan oleh JavaScript.
- Recovery baru dianggap selesai setelah response recovery valid dan profile berhasil diperoleh dari `GET /api/users/me`.
- Hasil activation/recovery yang ambigu tidak memicu retry mutation. Retry pada layar status tertunda hanya memeriksa profile/session.
- HTTP 401 dibedakan dari network error, timeout, HTTP 5xx, dan kegagalan response. Gangguan selain 401 tidak mengosongkan user sebagai tanda logout.

## Absensi dan Riwayat

Source tetap memakai empat sesi absensi, mengirim `{ sesi }`, memvalidasi response create, dan memuat waktu resmi dari `GET /api/attendance/today`. Mutation absensi memiliki `retry: false`; UI mencegah pengiriman saat offline dan tidak memiliki offline queue. History tetap memakai filter tanggal, pagination server, serta mapping field response backend.

## Verifikasi

### TypeScript check

- Perintah: `bun run lint`
- Hasil: **BERHASIL**, `tsc --noEmit`, exit code `0`.

### Production build

- Perintah: `bun run build`
- Hasil: **BERHASIL**, exit code `0`.
- Vite 8.3.5 mentransformasi 1.737 modul dan PWA menghasilkan 17 entri precache.

### Pemeriksaan keamanan frontend

Pencarian source `src` untuk `/api/users/logout`, `api.logout`, fungsi/state logout, tombol/teks lepas sesi, `localStorage`, `sessionStorage`, offline queue, mock authentication, dan fallback demo tidak menemukan kecocokan.

Pemeriksaan source juga mengonfirmasi `credentials: 'include'`, payload `{ sesi }`, validasi response create, `retry: false` untuk mutation absensi, endpoint attendance-today/history, filter tanggal, dan pagination.

## Belum Dilakukan

- Tidak dilakukan pengujian runtime browser atau integrasi dengan backend setelah perubahan.
- Tidak dilakukan pengujian otomatis perilaku UI, cookie, activation, recovery, attendance, atau history. TypeScript check dan production build bukan pengganti pengujian integrasi.
- Tidak ada Git metadata pada workspace ini untuk menghasilkan diff terhadap baseline.

## Risiko dan Ketergantungan Migration Backend

Persistensi satu perangkat per karyawan, satu sesi aktif, penghapusan expiry sesi pada database, cookie `user_session` dengan `Max-Age=400 hari`, dan perpanjangan menggunakan token yang sama harus diterapkan dan diverifikasi pada backend/migration. Frontend tidak dapat menetapkan atribut cookie HttpOnly atau menjamin masa berlaku sesi; browser mengirim cookie dan backend menentukan apakah sesi sah. Sampai migration dan perilaku backend tersebut tersedia, persistensi sesi tidak dapat dijamin oleh perubahan PWA ini.

Profile backend yang dipakai PWA hanya memberikan identitas karyawan; PWA tidak dapat menampilkan nama/ID perangkat terdaftar yang tidak dikirim oleh endpoint tersebut. Pembatasan satu perangkat dan pencabutan oleh Admin harus tetap ditegakkan backend.
