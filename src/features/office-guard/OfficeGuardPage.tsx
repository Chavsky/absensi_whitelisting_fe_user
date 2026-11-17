import React from 'react';

/**
 * Halaman pembatasan saat backend kantor tidak terjangkau.
 * Sengaja minimal: teks tunggal di tengah layar, tanpa gambar, ikon,
 * animasi, atau tombol — sesuai spesifikasi.
 */
export const OfficeGuardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <p className="text-sm font-bold text-slate-800 text-center tracking-wide">
        SILAHKAN MENGGUNAKAN KONEKSI WIFI UPT1
      </p>
    </div>
  );
};
