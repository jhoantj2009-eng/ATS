import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall, DetectedBrowser } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Monitor,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  ExternalLink,
  Globe,
  Compass,
  WifiOff,
  MoreVertical,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BrowserTab = 'chromium' | 'safari' | 'firefox';

function getBrowserDisplayName(browser: DetectedBrowser): string {
  switch (browser) {
    case 'chrome':
      return 'Google Chrome';
    case 'edge':
      return 'Microsoft Edge';
    case 'safari':
      return 'Safari';
    case 'firefox':
      return 'Mozilla Firefox';
    case 'samsung':
      return 'Samsung Internet';
    case 'opera':
      return 'Opera';
    case 'brave':
      return 'Brave';
    default:
      return 'Navegador Web';
  }
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, browser, platform, swReady, install } =
    usePWAInstall();

  const getDefaultTab = (): BrowserTab => {
    if (browser === 'safari' || isIOS) return 'safari';
    if (browser === 'firefox') return 'firefox';
    return 'chromium';
  };

  const [activeTab, setActiveTab] = useState<BrowserTab>(getDefaultTab);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(getDefaultTab());
    }
  }, [isOpen, browser, isIOS]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      const result = await install();
      if (result === 'accepted') {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b-4 border-amber-400 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 border-2 border-amber-400/80 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Instalar App ATS (PWA)
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Úsala como aplicación nativa y 100% sin conexión en campo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Estado de compatibilidad detectada */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Globe className="w-4 h-4 text-slate-900 shrink-0" />
              <span>
                Detectado: {getBrowserDisplayName(browser)} ({platform === 'ios' ? 'iPhone/iPad' : platform === 'android' ? 'Android' : platform === 'mac' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Web'})
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                swReady
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <WifiOff className="w-3 h-3" />
              {swReady ? 'Modo Offline Activo' : 'Preparando Caché Offline'}
            </span>
          </div>

          {/* Aviso si está dentro de iframe embebido */}
          {isInIframe && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2.5">
              <p className="text-xs font-bold text-amber-950 leading-snug">
                Estás viendo la aplicación dentro de un marco embebido. Los navegadores solo permiten instalar la PWA abriéndola directamente en su propia pestaña:
              </p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>Abrir en Pestaña Nueva para Instalar</span>
              </a>
            </div>
          )}

          {/* Ya instalada */}
          {isInstalled && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <p className="text-xs sm:text-sm font-bold">
                La aplicación ya se encuentra instalada y ejecutándose en modo PWA independiente.
              </p>
            </div>
          )}

          {/* Botón directo de 1 clic si el navegador disparó beforeinstallprompt */}
          {!isInstalled && isInstallable && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 border-2 border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs sm:text-sm font-bold">
                  Tu navegador permite instalación directa en un clic:
                </p>
              </div>
              <button
                type="button"
                onClick={handleDirectInstall}
                disabled={installing}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-sm bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Instalando...' : 'Instalar Ahora en este Dispositivo'}</span>
              </button>
            </div>
          )}

          {/* Selector de navegador para instrucciones manuales en cualquier navegador */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Instrucciones según tu navegador
            </p>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('chromium')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'chromium'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chrome / Edge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('safari')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'safari'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Safari (iOS/Mac)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('firefox')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'firefox'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Firefox / Otros
              </button>
            </div>

            {activeTab === 'chromium' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En Android (Chrome, Edge, Brave, Samsung Internet):</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-xs">
                      <li>Toca el menú <MoreVertical className="w-3.5 h-3.5 inline text-slate-900" /> (arriba a la derecha).</li>
                      <li>Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</li>
                      <li>Confirma tocando <strong>«Instalar»</strong>.</li>
                    </ol>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En PC / Portátil (Chrome, Edge, Brave, Opera):</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-xs">
                      <li>Haz clic en el icono de <strong>Instalar (monitor con flecha ↓)</strong> al final de la barra de direcciones.</li>
                      <li>O abre el menú <strong>⋮ / ⋯</strong> → <strong>Guardar y compartir / Aplicaciones</strong> → <strong>«Instalar Sistema ATS y Permisos OHS»</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'safari' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En iPhone o iPad (Safari):</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-xs">
                      <li>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline text-blue-600" /> en la barra de Safari.</li>
                      <li>Desplázate y elige <strong>«Agregar a inicio»</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-900" />.</li>
                      <li>Toca <strong>«Agregar»</strong> arriba a la derecha.</li>
                    </ol>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En Mac (Safari Sonoma o superior):</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-xs">
                      <li>En el menú superior haz clic en <strong>Archivo</strong> → <strong>«Agregar al Dock...»</strong>.</li>
                      <li>O usa el botón <strong>Compartir</strong> de la barra y elige <strong>«Agregar al Dock»</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'firefox' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En Firefox para Android:</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-xs">
                      <li>Toca el menú <strong>⋮</strong> en la esquina del navegador.</li>
                      <li>Selecciona <strong>«Instalar»</strong> (o <strong>«Añadir a la pantalla de inicio»</strong>).</li>
                    </ol>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">En Firefox de Escritorio (Windows / Mac / Linux):</p>
                    <p className="text-xs mt-1 leading-relaxed">
                      Firefox de escritorio guarda todos tus archivos y ATS localmente sin internet gracias al Service Worker + IndexedDB, aunque no incluye botón nativo de instalación de ventanas. Para instalarla como ventana de escritorio independiente, abre este mismo enlace en <strong>Chrome</strong> o <strong>Edge</strong> (Windows/Linux) o <strong>Safari</strong> (Mac).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface PWAInstallButtonProps {
  variant?: 'menu-item' | 'button' | 'login-footer';
  onOpenGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  onOpenGuide,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [internalGuideOpen, setInternalGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    if (isInstallable) {
      e.stopPropagation();
      setInstalling(true);
      try {
        const result = await install();
        if (result !== 'accepted') {
          if (onOpenGuide) onOpenGuide();
          else setInternalGuideOpen(true);
        }
      } finally {
        setInstalling(false);
      }
    } else {
      if (onOpenGuide) {
        onOpenGuide();
      } else {
        e.stopPropagation();
        setInternalGuideOpen(true);
      }
    }
  };

  return (
    <>
      {variant === 'menu-item' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-amber-600" />
            <span>{installing ? 'Instalando App...' : 'Instalar App (PWA)'}</span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
            {isInstallable ? '1 Clic' : 'Guía'}
          </span>
        </button>
      ) : variant === 'login-footer' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{isInstallable ? 'Instalar como Aplicación (PWA)' : 'Cómo instalar esta App (PWA)'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="inline-flex items-center gap-1.5 min-h-[40px] text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 border border-amber-500 px-3 py-2 rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
          title="Instalar ATS Seguridad Laboral en tu pantalla de inicio"
        >
          <Download className="w-4 h-4" />
          <span>{installing ? 'Instalando...' : 'Instalar App (PWA)'}</span>
        </button>
      )}

      {!onOpenGuide && (
        <PWAInstallModal
          isOpen={internalGuideOpen}
          onClose={() => setInternalGuideOpen(false)}
        />
      )}
    </>
  );
};

export const PWAInstallFloatingPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isInIframe, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !isInstallable || isInIframe || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', '1');
    } catch {
      // ignore storage error
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="no-print fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-40 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border-2 border-amber-400/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold truncate">Instalar App ATS</p>
          <p className="text-[11px] text-slate-300 truncate">Acceso directo y modo sin conexión</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
        >
          {installing ? '...' : 'Instalar'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar aviso de instalación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
