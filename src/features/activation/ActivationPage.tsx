import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, KeyRound, UserCheck, ArrowRight, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const ActivationPage: React.FC = () => {
  const navigate = useNavigate();
  const { activate, isLoading } = useAuth();
  const isOnline = useOnlineStatus();

  const [nik, setNik] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedNik = nik.trim();
    const trimmedCode = activationCode.trim().toUpperCase();

    if (!trimmedNik) {
      setErrorMsg('Nomor Induk Karyawan (NIK) wajib diisi.');
      return;
    }
    if (!trimmedCode) {
      setErrorMsg('Kode aktivasi perangkat wajib diisi.');
      return;
    }

    try {
      await activate(trimmedNik, trimmedCode);
      setSuccessMsg('Perangkat berhasil diaktivasi. Mengalihkan ke dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Aktivasi gagal. Pastikan NIK dan kode aktivasi sesuai.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 shadow-md border border-slate-800">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Aktivasi Perangkat
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Aktifkan akses perangkat melalui kode dari Admin. Aplikasi tidak memverifikasi identitas hardware secara mutlak.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <Input
              label="Nomor Induk Karyawan (NIK)"
              type="text"
              placeholder="Contoh: 199408242021011002"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              disabled={isLoading}
              leftIcon={<UserCheck className="w-4 h-4" />}
              autoComplete="username"
            />

            <Input
              label="Kode Aktivasi Perangkat"
              type="text"
              placeholder="Contoh: ACT-8842"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              leftIcon={<KeyRound className="w-4 h-4" />}
              helperText="Kode diterbitkan melalui portal Admin Web kantor"
              autoComplete="off"
            />

            <Button
              type="submit"
              variant="action"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={!isOnline}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Aktivasi Sekarang
            </Button>
          </form>

          {/* Helper box */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-normal">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Belum memiliki kode aktivasi? Hubungi Administrator atau Bagian HR kantor untuk menerbitkan kode perangkat Anda.
            </p>
          </div>
        </Card>

        {/* Footer links */}
        <div className="text-center space-y-2 text-xs">
          <p className="text-slate-500">
            Sesi perangkat bermasalah atau terhapus?{' '}
            <Link
              to="/pemulihan"
              className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Pulihkan Sesi Perangkat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
