import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode, hide prompt
  if (isInstalled) return null;

  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <Download className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="truncate text-slate-300">
            Pasang aplikasi di layar utama smartphone untuk akses instan
          </p>
        </div>

        {isInstallable && (
          <button
            onClick={install}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition shadow-xs"
          >
            Instal PWA
          </button>
        )}

        {isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="shrink-0 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-700 transition"
          >
            Cara Pasang iOS
          </button>
        )}
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                Pasang di iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Langkah 1</p>
                  <p className="mt-0.5">Ketuk tombol <strong>Share</strong> (Bagikan) di baris bawah browser Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Langkah 2</p>
                  <p className="mt-0.5">Gulir ke bawah lalu pilih menu <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
