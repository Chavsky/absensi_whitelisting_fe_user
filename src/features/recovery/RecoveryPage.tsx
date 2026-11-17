import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, UserCheck, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const RecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { recover, isLoading } = useAuth();
  const isOnline = useOnlineStatus();

  const [nik, setNik] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedNik = nik.trim();
    const trimmedCode = recoveryCode.trim().toUpperCase();

    if (!trimmedNik) {
      setErrorMsg('Nomor Induk Karyawan (NIK) wajib diisi.');
      return;
    }
    if (!trimmedCode) {
      setErrorMsg('Kode pemulihan sesi perangkat wajib diisi.');
      return;
    }

    try {
      await recover(trimmedNik, trimmedCode);
      setSuccessMsg('Sesi perangkat berhasil dipulihkan. Mengalihkan ke dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pemulihan gagal. Pastikan NIK dan kode pemulihan sesuai.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to="/aktivasi"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Aktivasi</span>
        </Link>

        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 shadow-md border border-slate-800">
            <KeyRound className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pemulihan Sesi Perangkat
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Pulihkan akses saat sesi tidak dikenali backend dengan memasukkan kode pemulihan resmi dari Admin Web.
          </p>
        </div>

        {/* Form Card */}
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
              label="Kode Pemulihan Sesi"
              type="text"
              placeholder="Contoh: REC-9912"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              leftIcon={<KeyRound className="w-4 h-4" />}
              helperText="Diterbitkan oleh Admin Web kantor untuk memvalidasi ulang perangkat"
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
              Pulihkan Sesi
            </Button>
          </form>
        </Card>

      </div>
    </div>
  );
};
