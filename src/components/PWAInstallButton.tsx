import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, do not show button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // In desktop browsers where prompt isn't fired yet, show informational guide
      alert("Para instalar esta aplicación en tu dispositivo, abre el menú de opciones de tu navegador (⋮ o ⋯) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
        title="Instalar ATS Seguridad Laboral en tu pantalla de inicio para usar sin conexión a internet"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
        <span className="hidden sm:inline">Instalar App (PWA)</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {/* iOS Installation Guided Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 text-slate-900">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Instalar en iPhone / iPad</h4>
                <p className="text-[11px] text-slate-500">Funciona 100% sin conexión a internet</p>
              </div>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">1.</span>
                <span>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline text-blue-600" /> en la barra inferior de Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">2.</span>
                <span>Desplázate y selecciona <strong>«Agregar a inicio»</strong> <PlusSquare className="w-3.5 h-3.5 inline text-blue-600" />.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">3.</span>
                <span>Presiona <strong>«Agregar»</strong> en la esquina superior derecha.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
