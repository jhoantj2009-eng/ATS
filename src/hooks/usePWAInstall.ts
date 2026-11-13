import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DetectedBrowser =
  | 'chrome'
  | 'edge'
  | 'safari'
  | 'firefox'
  | 'samsung'
  | 'opera'
  | 'brave'
  | 'other';

export type DetectedPlatform = 'ios' | 'android' | 'mac' | 'windows' | 'linux' | 'other';

declare global {
  interface Window {
    __deferredPWAInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectBrowserAndPlatform(): {
  browser: DetectedBrowser;
  platform: DetectedPlatform;
  isIOS: boolean;
  isAndroid: boolean;
  isInIframe: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      browser: 'other',
      platform: 'other',
      isIOS: false,
      isAndroid: false,
      isInIframe: false,
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIPadOS =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/.test(ua) || isIPadOS;
  const isAndroid = /android/.test(ua);

  let platform: DetectedPlatform = 'other';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (/mac os|macintosh/.test(ua)) platform = 'mac';
  else if (/windows/.test(ua)) platform = 'windows';
  else if (/linux/.test(ua)) platform = 'linux';

  let browser: DetectedBrowser = 'other';
  if (/samsungbrowser/.test(ua)) {
    browser = 'samsung';
  } else if (/edg\/|edga\/|edgios\//.test(ua)) {
    browser = 'edge';
  } else if (/opr\/|opera/.test(ua)) {
    browser = 'opera';
  } else if (/firefox|fxios/.test(ua)) {
    browser = 'firefox';
  } else if (
    (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave
  ) {
    browser = 'brave';
  } else if (/crios|chrome|chromium/.test(ua) && !/edg/.test(ua)) {
    browser = 'chrome';
  } else if (/safari/.test(ua) && !/chrome|crios|android/.test(ua)) {
    browser = 'safari';
  }

  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }

  return { browser, platform, isIOS, isAndroid, isInIframe };
}

function checkStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? window.__deferredPWAInstallPrompt || null : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkStandaloneMode());
  const [env] = useState(() => detectBrowserAndPlatform());
  const [swReady, setSwReady] = useState<boolean>(false);

  useEffect(() => {
    setIsInstalled(checkStandaloneMode());
    if (window.__deferredPWAInstallPrompt) {
      setDeferredPrompt(window.__deferredPWAInstallPrompt);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__deferredPWAInstallPrompt) {
        setDeferredPrompt(window.__deferredPWAInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__deferredPWAInstallPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const activePrompt = deferredPrompt || window.__deferredPWAInstallPrompt;
    if (!activePrompt) return 'unavailable';

    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        window.__deferredPWAInstallPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS: env.isIOS,
    isAndroid: env.isAndroid,
    isInIframe: env.isInIframe,
    browser: env.browser,
    platform: env.platform,
    swReady,
    install,
  };
}
