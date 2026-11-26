import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ATSFormData,
  ATSHistoryRecord,
  ATSSectionKey,
  EmpresaConfig,
  PersistedUserState,
  PersonalMember,
  UserPreferences,
} from "./types";
import {
  DEFAULT_LOGO_SVG,
  INITIAL_FORM_DATA,
} from "./data/defaultData";
import {
  saveLogoToStorage,
  syncCompanyTemplateToServer,
  fetchCompanyTemplateFromServer,
} from "./utils/logoHelper";
import { ATSInteractiveForm } from "./components/ATSInteractiveForm";
import { ATSPrintFormat } from "./components/ATSPrintFormat";
import { SignatureModal } from "./components/SignatureModal";
import { PersonalManagerModal } from "./components/PersonalManagerModal";
import { CompanyConfigModal } from "./components/CompanyConfigModal";
import { AppSheetGuideModal } from "./components/AppSheetGuideModal";
import { AccessGuard, useAuth } from "./components/AccessGuard";
import { EmailModal } from "./components/EmailModal";
import { ATSHistoryModal } from "./components/ATSHistoryModal";
import { PreferencesBackupModal } from "./components/PreferencesBackupModal";
import {
  PWAInstallButton,
  PWAInstallModal,
  PWAInstallFloatingPrompt,
} from "./components/PWAInstallButton";
import {
  getHistoryRecords,
  getAllHistoryRecordsCombined,
  mergeHistoryRecords,
  saveHistoryRecord,
} from "./utils/historyStorage";
import {
  STORAGE_SCHEMA_VERSION,
  loadLocalWorkspaceSync,
  saveWorkspaceToLocalStorage,
  saveWorkspaceToIDB,
  hydrateWorkspaceAcrossLayers,
  saveUserStateToServer,
  fetchSyncedHistoryFromServer,
  deleteSyncedHistoryRecordOnServer,
  exportFullWorkspaceBackup,
  parseFullWorkspaceBackup,
  mergeStaffLists,
  reconcileAllSignatures,
} from "./utils/persistentStorage";
import { exportToPDF, printDirect } from "./utils/pdfExport";
import { useNetworkSync } from "./hooks/useNetworkSync";
import { generateOfflineATS } from "./utils/offlineGenerator";
import {
  FileDown,
  Printer,
  Users,
  Building,
  Eye,
  Edit3,
  CheckCircle2,
  Share2,
  PlusCircle,
  Save,
  Mail,
  History,
  MoreVertical,
  X,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";

function ATSAppContent() {
  // Auth & User from Firebase (disponible primero para segmentar y sincronizar persistencia por usuario)
  const { currentUser, signOutUser } = useAuth();

  // Carga inicial síncrona unificada desde LocalStorage (con migración automática y reconciliación de firmas)
  const initialLocalRef = useRef<ReturnType<typeof loadLocalWorkspaceSync> | null>(null);
  if (!initialLocalRef.current) {
    const loaded = loadLocalWorkspaceSync(currentUser?.uid);
    const synced = reconcileAllSignatures(loaded.state.formData, loaded.state.staffList);
    initialLocalRef.current = {
      ...loaded,
      state: {
        ...loaded.state,
        formData: synced.formData,
        staffList: synced.staffList,
      },
    };
  }
  const initialLocal = initialLocalRef.current;

  const [formData, setFormData] = useState<ATSFormData>(initialLocal.state.formData);
  const [empresa, setEmpresa] = useState<EmpresaConfig>(initialLocal.state.empresa);
  const [staffList, setStaffList] = useState<PersonalMember[]>(initialLocal.state.staffList);
  const [preferences, setPreferences] = useState<UserPreferences>(initialLocal.state.preferences);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(
    initialLocal.state.currentHistoryId
  );

  // Preferencias derivadas con persistencia automática
  const viewMode = preferences.viewMode;
  const activeSection = preferences.activeSection;
  const previewZoomMode = preferences.previewZoomMode;

  // UI States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(() => {
    try {
      return getHistoryRecords().length;
    } catch {
      return 0;
    }
  });
  const [signTarget, setSignTarget] = useState<{
    type: "worker" | "supervisor" | "autorizador";
    id?: string;
    name: string;
  } | null>(null);

  // Responsive mobile top navigation menu state
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // Responsive PDF Preview scaling for iPhone / mobile screens
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [previewScaledHeight, setPreviewScaledHeight] = useState<number | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);

  // PWA Network Sync & Offline State
  const { isOnline, pendingCount, syncNow, refreshPendingCount } = useNetworkSync();

  // Auto-Save Status tracking
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("ats_last_saved_time");
      if (saved) return saved;
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  });

  // Control de hidratación multi-capa para evitar que los defaults sobrescriban respaldos en IndexedDB o Servidor
  const isHydratedRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const cachedIdTokenRef = useRef<string | null>(null);
  const serverSyncTimerRef = useRef<number | null>(null);
  const lastStateTimestampRef = useRef<number>(initialLocal.state.updatedAtMs || 0);

  const latestStateRef = useRef({
    formData,
    empresa,
    staffList,
    preferences,
    currentHistoryId,
  });
  latestStateRef.current = {
    formData,
    empresa,
    staffList,
    preferences,
    currentHistoryId,
  };

  const buildWorkspaceSnapshot = useCallback(
    (overrides?: Partial<PersistedUserState>): PersistedUserState => {
      const cur = latestStateRef.current;
      const ts = overrides?.updatedAtMs ?? Date.now();
      return {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        updatedAtMs: ts,
        formData: overrides?.formData ?? cur.formData,
        empresa: overrides?.empresa ?? cur.empresa,
        staffList: overrides?.staffList ?? cur.staffList,
        preferences: overrides?.preferences ?? cur.preferences,
        currentHistoryId:
          overrides?.currentHistoryId !== undefined
            ? overrides.currentHistoryId
            : cur.currentHistoryId,
      };
    },
    []
  );

  const scheduleServerStateSync = useCallback(
    (snapshot: PersistedUserState) => {
      if (!currentUser) return;
      if (serverSyncTimerRef.current !== null) {
        window.clearTimeout(serverSyncTimerRef.current);
      }
      serverSyncTimerRef.current = window.setTimeout(async () => {
        try {
          const token = await currentUser.getIdToken();
          cachedIdTokenRef.current = token;
          await saveUserStateToServer(snapshot, token);
        } catch (err) {
          console.warn("Aviso sincronizando estado de usuario con servidor:", err);
        }
      }, 1200);
    },
    [currentUser]
  );

  const persistWorkspaceImmediately = useCallback(
    (snapshot: PersistedUserState, options?: { syncServerNow?: boolean }) => {
      const updatedAtMs = snapshot.updatedAtMs || Date.now();
      const stamped: PersistedUserState = { ...snapshot, updatedAtMs };
      lastStateTimestampRef.current = updatedAtMs;

      const savedLocally = saveWorkspaceToLocalStorage(stamped, currentUser?.uid);
      saveWorkspaceToIDB(stamped, currentUser?.uid).catch((err) =>
        console.warn("IDB workspace backup warn:", err)
      );

      const nowFormatted = new Date(updatedAtMs).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      try {
        localStorage.setItem("ats_last_saved_time", nowFormatted);
      } catch {}
      setLastSavedTime(nowFormatted);
      setSaveStatus(savedLocally ? "saved" : "saved");

      if (options?.syncServerNow && currentUser) {
        currentUser
          .getIdToken()
          .then((token) => {
            cachedIdTokenRef.current = token;
            return saveUserStateToServer(stamped, token);
          })
          .catch(() => {});
      } else {
        scheduleServerStateSync(stamped);
      }
    },
    [currentUser, scheduleServerStateSync]
  );

  const updatePreferences = useCallback(
    (updater: React.SetStateAction<UserPreferences>, options?: { syncServerNow?: boolean }) => {
      hasUserEditedRef.current = true;
      setPreferences((prev) => {
        const nextRaw = typeof updater === "function" ? updater(prev) : updater;
        const next: UserPreferences = {
          ...nextRaw,
          updatedAtMs: Date.now(),
        };
        latestStateRef.current.preferences = next;
        if (isHydratedRef.current) {
          persistWorkspaceImmediately(
            buildWorkspaceSnapshot({ preferences: next, updatedAtMs: next.updatedAtMs }),
            options
          );
        }
        return next;
      });
    },
    [buildWorkspaceSnapshot, persistWorkspaceImmediately]
  );

  const setViewMode = useCallback(
    (nextMode: "form" | "preview") => {
      updatePreferences((prev) =>
        prev.viewMode === nextMode ? prev : { ...prev, viewMode: nextMode }
      );
    },
    [updatePreferences]
  );

  const setActiveSection = useCallback(
    (nextSection: ATSSectionKey) => {
      updatePreferences((prev) =>
        prev.activeSection === nextSection ? prev : { ...prev, activeSection: nextSection }
      );
    },
    [updatePreferences]
  );

  const setPreviewZoomMode = useCallback(
    (updater: React.SetStateAction<"fit" | "actual">) => {
      updatePreferences((prev) => {
        const nextZoom =
          typeof updater === "function" ? updater(prev.previewZoomMode) : updater;
        return prev.previewZoomMode === nextZoom ? prev : { ...prev, previewZoomMode: nextZoom };
      });
    },
    [updatePreferences]
  );

  const handleFormDataChange: React.Dispatch<React.SetStateAction<ATSFormData>> = useCallback(
    (updater) => {
      hasUserEditedRef.current = true;
      setFormData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        latestStateRef.current.formData = next;
        if (latestStateRef.current.preferences.autoSaveEnabled) {
          persistWorkspaceImmediately(
            buildWorkspaceSnapshot({ formData: next, updatedAtMs: Date.now() })
          );
        }
        return next;
      });
    },
    [buildWorkspaceSnapshot, persistWorkspaceImmediately]
  );

  // Hidratación completa en 3 capas al iniciar o cambiar de usuario:
  // LocalStorage + IndexedDB + Base de datos del servidor (sin perder datos al actualizar el proyecto)
  useEffect(() => {
    let isMounted = true;
    isHydratedRef.current = false;

    const hydrateAllPersistenceLayers = async () => {
      try {
        const idToken = currentUser
          ? await currentUser.getIdToken().catch(() => null)
          : null;
        cachedIdTokenRef.current = idToken;

        const [hydrated, combinedLocalHistory, serverHistory] = await Promise.all([
          hydrateWorkspaceAcrossLayers(currentUser?.uid || null, idToken),
          getAllHistoryRecordsCombined(),
          fetchSyncedHistoryFromServer(idToken),
        ]);

        if (!isMounted) return;

        // 1. Restaurar y fusionar historial completo (LocalStorage + IndexedDB + Servidor)
        if (serverHistory.length > 0) {
          const mergedHistory = mergeHistoryRecords(serverHistory, true);
          setHistoryCount(mergedHistory.length);
        } else {
          setHistoryCount(combinedLocalHistory.length);
        }
        refreshPendingCount().catch(() => {});

        // 2. Restaurar borrador actual, empresa, personal con firmas y preferencias si no hubo edición manual aún
        if (hydrated.state && !hasUserEditedRef.current) {
          const shouldApply =
            !initialLocal.hasPersistedData ||
            hydrated.state.updatedAtMs > lastStateTimestampRef.current ||
            hydrated.source !== "localStorage";

          if (shouldApply) {
            const restored = hydrated.state;
            setFormData(restored.formData);
            setEmpresa(restored.empresa);
            setStaffList(restored.staffList);
            setPreferences(restored.preferences);
            setCurrentHistoryId(restored.currentHistoryId);
            latestStateRef.current = {
              formData: restored.formData,
              empresa: restored.empresa,
              staffList: restored.staffList,
              preferences: restored.preferences,
              currentHistoryId: restored.currentHistoryId,
            };
            lastStateTimestampRef.current = restored.updatedAtMs;

            saveWorkspaceToLocalStorage(restored, currentUser?.uid);
            saveWorkspaceToIDB(restored, currentUser?.uid).catch(() => {});

            if (hydrated.source !== "server" && idToken) {
              saveUserStateToServer(restored, idToken).catch(() => {});
            }
          }
        } else if (initialLocal.hasPersistedData && idToken) {
          // Respaldar datos locales existentes hacia el servidor para primera sincronización
          const currentSnap = buildWorkspaceSnapshot({
            updatedAtMs: lastStateTimestampRef.current || Date.now(),
          });
          saveWorkspaceToIDB(currentSnap, currentUser?.uid).catch(() => {});
          saveUserStateToServer(currentSnap, idToken).catch(() => {});
        }
      } catch (err) {
        console.warn("Aviso durante hidratación multi-capa:", err);
      } finally {
        if (isMounted) {
          isHydratedRef.current = true;
        }
      }
    };

    hydrateAllPersistenceLayers();
    return () => {
      isMounted = false;
      if (serverSyncTimerRef.current !== null) {
        window.clearTimeout(serverSyncTimerRef.current);
      }
    };
  }, [currentUser?.uid]);

  // Persistencia reactiva de empresa, personal y borrador solo DESPUÉS de completar la hidratación inicial
  useEffect(() => {
    if (!isHydratedRef.current) return;
    if (!preferences.autoSaveEnabled) return;

    const snapshot = buildWorkspaceSnapshot({ updatedAtMs: Date.now() });
    persistWorkspaceImmediately(snapshot);
  }, [
    formData,
    empresa,
    staffList,
    preferences,
    currentHistoryId,
    buildWorkspaceSnapshot,
    persistWorkspaceImmediately,
  ]);

  // Synchronous flush on unload / pagehide / visibilitychange (escritorio y móviles PWA)
  useEffect(() => {
    const flushStateSynchronously = () => {
      if (!isHydratedRef.current && !hasUserEditedRef.current) return;
      const snapshot = buildWorkspaceSnapshot({ updatedAtMs: Date.now() });
      saveWorkspaceToLocalStorage(snapshot, currentUser?.uid);
      saveWorkspaceToIDB(snapshot, currentUser?.uid).catch(() => {});
      if (cachedIdTokenRef.current) {
        saveUserStateToServer(snapshot, cachedIdTokenRef.current, { keepalive: true }).catch(
          () => {}
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushStateSynchronously();
      }
    };

    window.addEventListener("beforeunload", flushStateSynchronously);
    window.addEventListener("pagehide", flushStateSynchronously);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flushStateSynchronously);
      window.removeEventListener("pagehide", flushStateSynchronously);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [buildWorkspaceSnapshot, currentUser?.uid]);

  // Calcular escala responsiva automática para la vista previa PDF en pantallas de iPhone/móvil
  useEffect(() => {
    if (viewMode !== "preview") return;

    const recalculatePreviewScale = () => {
      const viewportEl = previewViewportRef.current;
      const canvasEl = previewCanvasRef.current;
      if (!viewportEl || !canvasEl) return;

      const availableWidth = viewportEl.clientWidth;
      if (previewZoomMode === "fit" && availableWidth > 0 && availableWidth < 816) {
        const nextScale = Math.max(0.32, Math.min(1, availableWidth / 816));
        const rawHeight = canvasEl.scrollHeight || canvasEl.offsetHeight;
        setPreviewScale(nextScale);
        setPreviewScaledHeight(rawHeight > 0 ? Math.ceil(rawHeight * nextScale) + 8 : null);
      } else {
        setPreviewScale(1);
        setPreviewScaledHeight(null);
      }
    };

    recalculatePreviewScale();
    const rafId = requestAnimationFrame(recalculatePreviewScale);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => recalculatePreviewScale())
        : null;

    if (resizeObserver) {
      if (previewViewportRef.current) resizeObserver.observe(previewViewportRef.current);
      if (previewCanvasRef.current) resizeObserver.observe(previewCanvasRef.current);
    }

    window.addEventListener("resize", recalculatePreviewScale);
    window.addEventListener("orientationchange", recalculatePreviewScale);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", recalculatePreviewScale);
      window.removeEventListener("orientationchange", recalculatePreviewScale);
    };
  }, [viewMode, previewZoomMode, formData, empresa]);

  // Sincronización con el servidor central:
  // Garantiza que el logotipo y plantilla oficial de DCM se compartan en todos los enlaces y dispositivos
  useEffect(() => {
    let isMounted = true;
    const initServerTemplate = async () => {
      try {
        const serverData = await fetchCompanyTemplateFromServer();
        if (serverData && serverData.logoUrl && isMounted) {
          // El servidor central tiene una plantilla persistida: sincronizar
          setEmpresa((prev) => ({
            ...prev,
            nombreEmpresa: serverData.nombreEmpresa || prev.nombreEmpresa || "DCM",
            nit: serverData.nit || prev.nit,
            codigoFormato: serverData.codigoFormato || prev.codigoFormato || "F-SST-045",
            version: serverData.version || prev.version || "01",
            vigencia: serverData.vigencia || prev.vigencia || "02/09/2026",
            logoUrl: serverData.logoUrl,
          }));
          saveLogoToStorage(serverData.logoUrl);
        } else if (empresa.logoUrl) {
          // Subir la plantilla actual al servidor para que quede guardada globalmente
          await syncCompanyTemplateToServer(empresa);
        }
      } catch (err) {
        console.error("Error al sincronizar plantilla con el servidor:", err);
      }
    };

    initServerTemplate();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleShareLink = async () => {
    try {
      // Garantizar que la plantilla y el logotipo actual estén 100% guardados en el servidor
      await syncCompanyTemplateToServer(empresa);

      const shareUrl = window.location.href.split("?")[0];
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("¡Enlace oficial copiado! El logo DCM y el formato F-SST-045 se mostrarán idénticos en cualquier dispositivo.");
      } else {
        window.prompt("Copie este enlace oficial para compartir el ATS con el logotipo DCM fijo:", shareUrl);
      }
    } catch (e) {
      console.error("Error sharing link:", e);
      showToast("Enlace listo para compartir.");
    }
  };

  const handleManualSave = () => {
    try {
      // Guardar también en el Historial de ATS bajo ID único
      const syncStatus = isOnline ? "synced" : "pending";
      const { record } = saveHistoryRecord(
        formData,
        empresa,
        staffList,
        currentHistoryId || undefined,
        syncStatus
      );
      setCurrentHistoryId(record.id);
      latestStateRef.current.currentHistoryId = record.id;
      setHistoryCount(getHistoryRecords().length);
      refreshPendingCount();

      // Persistir inmediatamente el workspace completo (LocalStorage + IndexedDB + Servidor)
      persistWorkspaceImmediately(
        buildWorkspaceSnapshot({
          currentHistoryId: record.id,
          updatedAtMs: Date.now(),
        }),
        { syncServerNow: true }
      );

      if (isOnline) {
        syncNow().catch((e) => console.warn("Background sync error:", e));
      }

      showToast(
        isOnline
          ? `¡ATS guardado y sincronizado en las 3 capas! (${record.formData?.codigo || record.id})`
          : `¡ATS guardado localmente en IndexedDB! Se sincronizará al volver la conexión.`
      );
    } catch {
      showToast("No se pudo escribir en el almacenamiento local.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // AI Generator function
  const handleGenerateWithAI = async (
    taskOverride?: string,
    heightOverride?: string,
    detailOverride?: string,
    typeOverride?: string
  ) => {
    const taskToUse = (taskOverride || formData.tareaGeneral || "").trim();
    if (!taskToUse) {
      showToast("Por favor ingrese la tarea específica primero.");
      return;
    }

    // Si el usuario escribe una tarea en la barra rápida, NO enviamos restricciones viejas de tipo, altura o detalle
    const heightToSend = heightOverride !== undefined ? heightOverride : undefined;
    const detailToSend = detailOverride !== undefined ? detailOverride : undefined;
    const typeToSend = typeOverride !== undefined ? typeOverride : undefined;

    setIsGeneratingAI(true);

    const applyATSData = (data: any, sourceLabel: string, syncState: "synced" | "pending") => {
      if (data.pasos && Array.isArray(data.pasos)) {
        const currentLatest = latestStateRef.current.formData;
        const formattedPasos = data.pasos.map((item: any, idx: number) => ({
          id: `paso-ai-${Date.now()}-${idx}`,
          numero: item.numero || idx + 1,
          paso: item.paso,
          riesgo: item.riesgo,
          controles: item.controles,
          responsable:
            item.responsable ||
            item.responsableSugerido ||
            currentLatest.trabajadores[idx % Math.max(1, currentLatest.trabajadores.length)]?.nombre ||
            "Técnico Ejecutor",
        }));

        const explicitHeight = heightOverride && heightOverride.trim() ? heightOverride.trim() : "";
        const explicitType = typeOverride && typeOverride.trim() ? typeOverride.trim() : "";

        const deducedTipo = explicitType || data.tipoTrabajo || "Trabajo a Nivel de Piso / Locativo";
        const deducedAltura = explicitHeight || data.alturaAproximada || "N/A - Nivel de piso";
        const deducedDetalle = data.detalleLabor || detailOverride || taskToUse;
        const deducedObservaciones = data.observaciones || currentLatest.observaciones || "";

        const isGroundLevel =
          deducedAltura.toLowerCase().includes("n/a") ||
          deducedAltura.toLowerCase().includes("nivel de piso") ||
          deducedAltura.toLowerCase().includes("piso");

        const cleanEpps: Record<string, boolean> = {
          epp_casco: true,
          epp_gafas: true,
          epp_guantes: true,
          epp_auditiva: false,
          epp_respiratoria: false,
          epp_botas: true,
          epp_arnes: !isGroundLevel,
          epp_eslinga_absorb: !isGroundLevel,
          epp_eslinga_posic: !isGroundLevel,
          epp_mosqueton: !isGroundLevel,
          epp_anclaje: !isGroundLevel,
          epp_linea_vida: !isGroundLevel,
          epp_pretales: false,
          epp_descendedores: false,
          epp_rescate: !isGroundLevel,
          epp_autorretractil: false,
          epp_silla: false,
          epp_andamios: false,
          epp_escalera_ext: !isGroundLevel,
          epp_escalera_tijera: false,
          epp_otro: false,
        };

        if (data.eppsRecomendados && Array.isArray(data.eppsRecomendados)) {
          data.eppsRecomendados.forEach((eppName: string) => {
            const clean = eppName.trim().toUpperCase();
            if (clean.includes("CASCO")) cleanEpps.epp_casco = true;
            if (clean.includes("GAFAS") || clean.includes("MONOGAFAS") || clean.includes("CARETA")) cleanEpps.epp_gafas = true;
            if (clean.includes("GUANTE")) cleanEpps.epp_guantes = true;
            if (clean.includes("BOTA")) cleanEpps.epp_botas = true;
            if (clean.includes("AUDITIV") || clean.includes("OÍDO") || clean.includes("TAPA")) cleanEpps.epp_auditiva = true;
            if (clean.includes("RESPIRAT") || clean.includes("MASCAR") || clean.includes("VAPOR")) cleanEpps.epp_respiratoria = true;
            if (clean.includes("ARNÉS") || clean.includes("ARNES")) cleanEpps.epp_arnes = true;
            if (clean.includes("ABSORVEDOR") || clean.includes("ABSORBEDOR") || clean.includes("ESLINGA EN Y")) cleanEpps.epp_eslinga_absorb = true;
            if (clean.includes("POSICIONAMIENTO")) cleanEpps.epp_eslinga_posic = true;
            if (clean.includes("MOSQUETON") || clean.includes("CONECTOR")) cleanEpps.epp_mosqueton = true;
            if (clean.includes("LÍNEA DE VIDA") || clean.includes("LINEA DE VIDA")) cleanEpps.epp_linea_vida = true;
            if (clean.includes("ANCLAJE")) cleanEpps.epp_anclaje = true;
            if (clean.includes("RESCATE")) cleanEpps.epp_rescate = true;
            if (clean.includes("ESCALERA EXTENSIBLE") || clean.includes("ESCALERA")) cleanEpps.epp_escalera_ext = true;
            if (clean.includes("ANDAMIO")) cleanEpps.epp_andamios = true;
            if (clean.includes("SILLA") || clean.includes("SUSPENSIÓN") || clean.includes("SUSPENSION")) cleanEpps.epp_silla = true;
            if (clean.includes("AUTORRETRACTIL") || clean.includes("RETRACTIL")) cleanEpps.epp_autorretractil = true;
          });
        }

        let updatedATSDataSnapshot: ATSFormData | null = null;
        handleFormDataChange((prev) => {
          const updatedArea = prev.preparacionArea.map((item) => ({ ...item }));
          if (data.preparacionArea && Array.isArray(data.preparacionArea)) {
            data.preparacionArea.forEach((item: { itemIndex: number; estado: "SI" | "NO" | "N.A." }) => {
              if (updatedArea[item.itemIndex]) {
                updatedArea[item.itemIndex].estado = item.estado;
              }
            });
          } else if (isGroundLevel) {
            if (updatedArea[1]) updatedArea[1].estado = "N.A.";
            if (updatedArea[2]) updatedArea[2].estado = "N.A.";
            if (updatedArea[4]) updatedArea[4].estado = "N.A.";
            if (updatedArea[7]) updatedArea[7].estado = "N.A.";
          }

          updatedATSDataSnapshot = {
            ...prev,
            tareaGeneral: prev.tareaGeneral?.trim() ? prev.tareaGeneral : taskToUse,
            alturaAproximada: deducedAltura,
            detalleLabor: deducedDetalle,
            tipoTrabajo: deducedTipo,
            observaciones: deducedObservaciones,
            pasos: formattedPasos,
            eppsSeleccionados: cleanEpps,
            preparacionArea: updatedArea,
          };
          return updatedATSDataSnapshot;
        });

        try {
          const snapshotToSave = updatedATSDataSnapshot || {
            ...latestStateRef.current.formData,
            tareaGeneral: taskToUse,
            alturaAproximada: deducedAltura,
            detalleLabor: deducedDetalle,
            tipoTrabajo: deducedTipo,
            observaciones: deducedObservaciones,
            pasos: formattedPasos,
            eppsSeleccionados: cleanEpps,
          };
          const { record } = saveHistoryRecord(
            snapshotToSave,
            latestStateRef.current.empresa,
            latestStateRef.current.staffList,
            currentHistoryId || undefined,
            syncState
          );
          setCurrentHistoryId(record.id);
          localStorage.setItem("ats_current_history_id", record.id);
          setHistoryCount(getHistoryRecords().length);
          refreshPendingCount();
        } catch (saveErr) {
          console.error("Error auto-guardando ATS en historial:", saveErr);
        }

        showToast(sourceLabel);
      }
    };

    // 1. Si no hay conexión, ejecutar directamente el motor offline local
    if (!navigator.onLine) {
      try {
        const offlineData = generateOfflineATS(
          taskToUse,
          formData.trabajadores,
          typeToSend,
          heightToSend,
          detailToSend
        );
        applyATSData(
          offlineData,
          "¡Modo Sin Conexión activo! ATS generado con Motor SST Normativo (Res. 4272/2021) y guardado en IndexedDB.",
          "pending"
        );
      } catch (e) {
        console.error("Error generating offline ATS:", e);
        showToast("Error al generar ATS sin conexión.");
      } finally {
        setIsGeneratingAI(false);
      }
      return;
    }

    // 2. Con conexión: llamar al backend de IA
    try {
      const response = await fetch("/api/generate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tareaGeneral: taskToUse,
          tipoTrabajo: typeToSend,
          detalleLabor: detailToSend,
          altura: heightToSend,
          personal: formData.trabajadores,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let label = `¡Matriz de 10 pasos diligenciada exitosamente para: "${taskToUse}"!`;
      if (data.source === "gemini-ai") {
        const detail = data.cached ? "instantáneo en memoria <1ms" : `${data.model || "Gemini Flash"} en tiempo récord`;
        label = `¡Matriz ATS generada 100% personalizada (${detail}) y guardada!`;
      } else if (data.peakDemand) {
        label = `¡Matriz generada con Motor SST (Res. 4272/2021) y guardada en Historial!`;
      }

      applyATSData(data, label, "synced");
    } catch (error) {
      console.warn("Fallo de red o servidor al generar con IA, activando respaldo local offline:", error);
      // Respaldo transparente con motor local para nunca dejar al usuario bloqueado
      try {
        const fallbackData = generateOfflineATS(
          taskToUse,
          formData.trabajadores,
          typeToSend,
          heightToSend,
          detailToSend
        );
        applyATSData(
          fallbackData,
          "¡Respaldo SST local activado! Matriz generada bajo Res. 4272/2021 y guardada.",
          "pending"
        );
      } catch (fallbackErr) {
        console.error("Failed offline fallback:", fallbackErr);
        showToast("Error al conectar con el asistente. Intente de nuevo.");
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const updateStaffListImmediately = useCallback(
    (updater: React.SetStateAction<PersonalMember[]>) => {
      hasUserEditedRef.current = true;
      setStaffList((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        latestStateRef.current.staffList = next;
        persistWorkspaceImmediately(
          buildWorkspaceSnapshot({ staffList: next, updatedAtMs: Date.now() })
        );
        return next;
      });
    },
    [buildWorkspaceSnapshot, persistWorkspaceImmediately]
  );

  const handleSyncWorkerToStaff = useCallback(
    (worker: PersonalMember) => {
      updateStaffListImmediately((prev) => {
        const exists = prev.some((m) => m.id === worker.id);
        if (exists) {
          return prev.map((m) =>
            m.id === worker.id
              ? {
                  ...m,
                  ...worker,
                  firmaUrl: worker.firmaUrl !== undefined ? worker.firmaUrl : m.firmaUrl,
                }
              : m
          );
        }
        return [...prev, worker];
      });
    },
    [updateStaffListImmediately]
  );

  const handleSaveAutorizadorToStaff = useCallback(
    (auth: { nombre: string; cedula: string; cargo: string; firmaUrl: string }) => {
      const cleanNombre = auth.nombre.trim().toUpperCase();
      const cleanCedula = auth.cedula.trim();
      const cleanCargo = auth.cargo.trim() || "Jefe de Área / Autorizador";

      if (!cleanNombre || !cleanCedula) {
        showToast("Ingrese nombre y número de cédula para guardar en el directorio.");
        return;
      }

      updateStaffListImmediately((prev) => {
        const existingIndex = prev.findIndex(
          (m) =>
            (cleanCedula && m.cedula.trim() === cleanCedula) ||
            (cleanNombre && m.nombre.trim() === cleanNombre)
        );

        if (existingIndex >= 0) {
          return prev.map((m, idx) =>
            idx === existingIndex
              ? {
                  ...m,
                  nombre: cleanNombre,
                  cedula: cleanCedula,
                  cargo: cleanCargo,
                  rol: "autorizador",
                  firmaUrl: auth.firmaUrl || m.firmaUrl || "",
                }
              : m
          );
        }

        const newAuthMember: PersonalMember = {
          id: "p_auth_" + Date.now(),
          nombre: cleanNombre,
          cedula: cleanCedula,
          cargo: cleanCargo,
          arl: "SURA ARL",
          rol: "autorizador",
          firmaUrl: auth.firmaUrl || "",
        };
        return [...prev, newAuthMember];
      });

      handleFormDataChange((prev) => ({
        ...prev,
        autorizador: {
          nombre: cleanNombre,
          cedula: cleanCedula,
          cargo: cleanCargo,
          firmaUrl: auth.firmaUrl || prev.autorizador?.firmaUrl || "",
        },
      }));

      showToast(`¡"${cleanNombre}" guardado en el directorio como Quien Autoriza!`);
    },
    [updateStaffListImmediately, handleFormDataChange]
  );

  // Signature save handler: guarda permanentemente en formulario, directorio de personal, historial activo y en las 3 capas
  const handleSaveSignature = (dataUrl: string) => {
    if (!signTarget) return;

    const currentForm = latestStateRef.current.formData;
    const currentStaff = latestStateRef.current.staffList;
    let nextForm: ATSFormData = currentForm;
    let nextStaff: PersonalMember[] = currentStaff;
    let toastMsg = "Firma registrada y guardada permanentemente";

    if (signTarget.type === "worker" && signTarget.id) {
      const targetId = signTarget.id;
      nextForm = {
        ...currentForm,
        firmasTrabajadores: {
          ...currentForm.firmasTrabajadores,
          [targetId]: dataUrl,
        },
        trabajadores: currentForm.trabajadores.map((w) =>
          w.id === targetId ? { ...w, firmaUrl: dataUrl } : w
        ),
      };

      const exists = currentStaff.some((m) => m.id === targetId);
      if (exists) {
        nextStaff = currentStaff.map((member) =>
          member.id === targetId ? { ...member, firmaUrl: dataUrl } : member
        );
      } else {
        const activeMatch = currentForm.trabajadores.find((w) => w.id === targetId);
        nextStaff = activeMatch
          ? [...currentStaff, { ...activeMatch, firmaUrl: dataUrl }]
          : currentStaff;
      }
      toastMsg = `Firma registrada y guardada permanentemente para ${signTarget.name}`;
    } else if (signTarget.type === "supervisor") {
      const curSup = currentForm.supervisor;
      nextForm = {
        ...currentForm,
        supervisor: {
          ...curSup,
          firmaUrl: dataUrl,
        },
      };

      const supCed = (curSup?.cedula || "").trim();
      const supNom = (curSup?.nombre || "").trim().toUpperCase();
      if (supCed || supNom) {
        const matchIdx = currentStaff.findIndex(
          (member) =>
            (supCed && member.cedula.trim() === supCed) ||
            (supNom && member.nombre.trim().toUpperCase() === supNom)
        );
        if (matchIdx >= 0) {
          nextStaff = currentStaff.map((member, idx) =>
            idx === matchIdx ? { ...member, firmaUrl: dataUrl } : member
          );
        } else {
          nextStaff = [
            ...currentStaff,
            {
              id: "p_sup_" + Date.now(),
              nombre: supNom || "COORDINADOR SST",
              cedula: supCed,
              cargo: curSup?.cargo || "Coordinador / Supervisor SST",
              arl: "SURA ARL",
              rol: "coordinador_sst",
              firmaUrl: dataUrl,
            },
          ];
        }
      }
      toastMsg = "Firma registrada y guardada permanentemente para el Supervisor SST";
    } else if (signTarget.type === "autorizador") {
      const curAuth = currentForm.autorizador || {
        nombre: "",
        cedula: "",
        cargo: "",
        firmaUrl: "",
      };
      nextForm = {
        ...currentForm,
        autorizador: {
          nombre: curAuth.nombre || "",
          cedula: curAuth.cedula || "",
          cargo: curAuth.cargo || "",
          firmaUrl: dataUrl,
        },
      };

      const authCed = (curAuth.cedula || "").trim();
      const authNom = (curAuth.nombre || "").trim().toUpperCase();
      if (authCed || authNom) {
        const matchIdx = currentStaff.findIndex(
          (member) =>
            (authCed && member.cedula.trim() === authCed) ||
            (authNom && member.nombre.trim().toUpperCase() === authNom)
        );
        if (matchIdx >= 0) {
          nextStaff = currentStaff.map((member, idx) =>
            idx === matchIdx ? { ...member, firmaUrl: dataUrl } : member
          );
        } else {
          nextStaff = [
            ...currentStaff,
            {
              id: "p_auth_" + Date.now(),
              nombre: authNom || "AUTORIZADOR",
              cedula: authCed,
              cargo: curAuth.cargo || "Jefe de Área / Autorizador",
              arl: "SURA ARL",
              rol: "autorizador",
              firmaUrl: dataUrl,
            },
          ];
        }
      }
      toastMsg = "Firma registrada y guardada permanentemente para quien autoriza el trabajo";
    }

    const reconciled = reconcileAllSignatures(nextForm, nextStaff);
    hasUserEditedRef.current = true;
    latestStateRef.current.formData = reconciled.formData;
    latestStateRef.current.staffList = reconciled.staffList;
    setFormData(reconciled.formData);
    setStaffList(reconciled.staffList);

    const nowMs = Date.now();
    persistWorkspaceImmediately(
      buildWorkspaceSnapshot({
        formData: reconciled.formData,
        staffList: reconciled.staffList,
        updatedAtMs: nowMs,
      }),
      { syncServerNow: true }
    );

    // Si el usuario tiene un ATS del historial abierto, actualizar también ese registro con la firma nueva
    const activeHistoryId = latestStateRef.current.currentHistoryId;
    if (activeHistoryId) {
      try {
        saveHistoryRecord(
          reconciled.formData,
          latestStateRef.current.empresa,
          reconciled.staffList,
          activeHistoryId,
          isOnline ? "synced" : "pending"
        );
      } catch {
        // El workspace principal ya quedó respaldado en las 3 capas
      }
    }

    showToast(toastMsg);
    setSignTarget(null);
  };

  // Worker toggle in ATS
  const handleToggleActiveWorker = (member: PersonalMember) => {
    const isSelected = formData.trabajadores.some((w) => w.id === member.id);
    if (isSelected) {
      if (formData.trabajadores.length <= 1) {
        showToast("El ATS debe tener al menos un trabajador asignado.");
        return;
      }
      handleFormDataChange((prev) => ({
        ...prev,
        trabajadores: prev.trabajadores.filter((w) => w.id !== member.id),
      }));
    } else {
      const savedSig = member.firmaUrl || staffList.find((s) => s.id === member.id)?.firmaUrl || "";
      handleFormDataChange((prev) => ({
        ...prev,
        trabajadores: [
          ...prev.trabajadores,
          savedSig ? { ...member, firmaUrl: savedSig } : member,
        ],
        firmasTrabajadores:
          savedSig && !prev.firmasTrabajadores[member.id]
            ? { ...prev.firmasTrabajadores, [member.id]: savedSig }
            : prev.firmasTrabajadores,
      }));
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    showToast("Generando PDF oficial en 2 páginas con márgenes exactos...");
    try {
      const cleanDate = (formData.fechaDiligenciamiento || "hoy").replace(/[^a-zA-Z0-9_-]/g, "-");
      const filename = `ATS_${empresa.codigoFormato || "F-SST-045"}_${cleanDate}.pdf`;
      const res = await exportToPDF("ats-export-target", filename);
      if (res.success) {
        showToast("¡Archivo PDF oficial de 2 páginas descargado con alineación y márgenes perfectos!");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast("Inconveniente generando el archivo. Puede intentar de nuevo o usar 'Enviar al Correo'.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Guardar ATS actual en Historial manualmente o por disparador
  const handleSaveCurrentATS = (showNotification = true) => {
    try {
      const syncStatus = isOnline ? "synced" : "pending";
      const { record } = saveHistoryRecord(
        formData,
        empresa,
        staffList,
        currentHistoryId || undefined,
        syncStatus
      );
      setCurrentHistoryId(record.id);
      latestStateRef.current.currentHistoryId = record.id;
      setHistoryCount(getHistoryRecords().length);
      refreshPendingCount();

      // Persistir inmediatamente el workspace completo en las 3 capas (LocalStorage + IndexedDB + Servidor)
      persistWorkspaceImmediately(
        buildWorkspaceSnapshot({
          currentHistoryId: record.id,
          updatedAtMs: Date.now(),
        }),
        { syncServerNow: true }
      );

      // Si estamos en línea, sincronizar automáticamente el historial con el servidor
      if (isOnline) {
        syncNow().catch((e) => console.warn("Background sync error:", e));
      }

      if (showNotification) {
        showToast(
          isOnline
            ? `¡ATS guardado y sincronizado! (Código: ${record.formData?.codigo || record.id})`
            : `¡ATS guardado sin conexión en IndexedDB! Se sincronizará al volver internet.`
        );
      }
      return record;
    } catch (err) {
      console.error("Error guardando en historial:", err);
      showToast("Error al guardar en el historial.");
      return null;
    }
  };

  // Cargar ATS guardado desde el Historial (fusionando directorio y conservando todas las firmas)
  const handleLoadATSFromHistory = (record: ATSHistoryRecord, targetView: "form" | "preview" = "form") => {
    try {
      localStorage.setItem(
        "ats_manual_edited_fields",
        JSON.stringify({ id: record.formData.id, altura: true, tipo: true })
      );
    } catch {}

    const mergedStaff =
      record.staffList && Array.isArray(record.staffList)
        ? mergeStaffLists(latestStateRef.current.staffList, record.staffList)
        : latestStateRef.current.staffList;

    const baseFormData: ATSFormData = {
      ...INITIAL_FORM_DATA,
      ...record.formData,
      autorizador: {
        nombre: "",
        cedula: "",
        cargo: "",
        firmaUrl: "",
        ...(record.formData.autorizador || {}),
      },
    };

    const reconciled = reconcileAllSignatures(baseFormData, mergedStaff);

    updateStaffListImmediately(reconciled.staffList);
    handleFormDataChange(reconciled.formData);

    if (record.empresa) {
      const nextEmpresa = {
        ...record.empresa,
        logoUrl: record.empresa.logoUrl || latestStateRef.current.empresa.logoUrl,
      };
      setEmpresa(nextEmpresa);
      if (nextEmpresa.logoUrl) {
        saveLogoToStorage(nextEmpresa.logoUrl);
      }
    }
    setCurrentHistoryId(record.id);
    latestStateRef.current.currentHistoryId = record.id;
    try {
      localStorage.setItem("ats_current_history_id", record.id);
    } catch {}
    setViewMode(targetView);
    setIsHistoryModalOpen(false);
    showToast(`¡ATS "${record.titulo}" cargado con todas sus firmas!`);
  };

  // Nuevo ATS Handler: Inicia un formato nuevo preservando Empresa, Logo, Código, Preferencias, Personal y todas sus Firmas
  const handleNewATS = () => {
    const confirmReset = window.confirm(
      "¿Desea iniciar un Nuevo ATS?\n\nSe reiniciarán las tareas y fechas para un nuevo día de trabajo, pero se mantendrán guardados permanentemente los datos de la Empresa, Logo, Formato (" + (empresa.codigoFormato || "F-SST-045") + "), Personal registrado y todas las firmas guardadas.\n\nLos ATS anteriores permanecen guardados en su Historial."
    );
    if (!confirmReset) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const newId = `ATS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    setCurrentHistoryId(null);
    latestStateRef.current.currentHistoryId = null;
    localStorage.removeItem("ats_current_history_id");
    localStorage.removeItem("ats_manual_edited_fields");

    const currentCrew = (() => {
      const crew = staffList.filter((m) => m.rol !== "autorizador");
      return crew.length > 0 ? crew : [...staffList];
    })();

    const draftForm: ATSFormData = {
      ...INITIAL_FORM_DATA,
      id: newId,
      codigo: empresa.codigoFormato || "F-SST-045",
      version: empresa.version || "01",
      vigencia: empresa.vigencia || "02/09/2026",
      fechaDiligenciamiento: todayStr,
      lugar: preferences.defaultLugar || INITIAL_FORM_DATA.lugar,
      permisoValidoDesdeFecha: todayStr,
      permisoValidoDesdeHora: preferences.defaultJornadaInicio || INITIAL_FORM_DATA.permisoValidoDesdeHora,
      permisoValidoHastaFecha: todayStr,
      permisoValidoHastaHora: preferences.defaultJornadaFin || INITIAL_FORM_DATA.permisoValidoHastaHora,
      firmasTrabajadores: { ...formData.firmasTrabajadores },
      supervisor: {
        ...formData.supervisor,
      },
      autorizador: {
        nombre: formData.autorizador?.nombre || "",
        cedula: formData.autorizador?.cedula || "",
        cargo: formData.autorizador?.cargo || "",
        firmaUrl: formData.autorizador?.firmaUrl || "",
      },
      trabajadores: currentCrew,
    };

    const reconciled = reconcileAllSignatures(draftForm, staffList);
    handleFormDataChange(reconciled.formData);

    showToast("¡Nuevo ATS iniciado! Se conservaron la empresa, personal y todas las firmas guardadas.");
  };

  // Sincronización manual completa en 3 capas (LocalStorage + IndexedDB + Servidor)
  const handleForceSyncAll = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const snapshot = buildWorkspaceSnapshot({ updatedAtMs: Date.now() });
      saveWorkspaceToLocalStorage(snapshot, currentUser?.uid);
      await saveWorkspaceToIDB(snapshot, currentUser?.uid);

      if (!navigator.onLine) {
        return {
          ok: true,
          message:
            "Datos guardados localmente en LocalStorage e IndexedDB. Se sincronizarán con el servidor cuando vuelva internet.",
        };
      }

      let serverSaved = false;
      const token = currentUser ? await currentUser.getIdToken().catch(() => null) : null;
      cachedIdTokenRef.current = token;
      if (token) {
        serverSaved = await saveUserStateToServer(snapshot, token);
      }

      await syncNow().catch(() => {});
      const remoteHistory = await fetchSyncedHistoryFromServer(token);
      if (remoteHistory.length > 0) {
        const merged = mergeHistoryRecords(remoteHistory, true);
        setHistoryCount(merged.length);
      }
      await refreshPendingCount();

      const nowFormatted = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTime(nowFormatted);

      return {
        ok: true,
        message: serverSaved
          ? "Sincronización completa exitosa en LocalStorage, IndexedDB y base de datos del servidor."
          : "Datos respaldados localmente en LocalStorage e IndexedDB.",
      };
    } catch {
      return {
        ok: false,
        message: "No se pudo completar la sincronización. Tus datos locales siguen protegidos.",
      };
    }
  };

  const handleExportFullBackup = async () => {
    const combinedHistory = await getAllHistoryRecordsCombined();
    const snapshot = buildWorkspaceSnapshot({ updatedAtMs: Date.now() });
    exportFullWorkspaceBackup(snapshot, combinedHistory);
    showToast("Respaldo completo (.json) descargado.");
  };

  const handleImportFullBackup = async (
    jsonText: string
  ): Promise<{ ok: boolean; message: string }> => {
    const parsed = parseFullWorkspaceBackup(jsonText);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error || "El archivo de respaldo no es válido.",
      };
    }

    let restoredParts: string[] = [];

    if (parsed.workspace) {
      hasUserEditedRef.current = true;
      const mergedStaff = mergeStaffLists(parsed.workspace.staffList, staffList);
      const restoredSnapshot: PersistedUserState = {
        ...parsed.workspace,
        staffList: mergedStaff,
        updatedAtMs: Date.now(),
      };

      setFormData(restoredSnapshot.formData);
      setEmpresa(restoredSnapshot.empresa);
      setStaffList(restoredSnapshot.staffList);
      setPreferences(restoredSnapshot.preferences);
      setCurrentHistoryId(restoredSnapshot.currentHistoryId);
      latestStateRef.current = {
        formData: restoredSnapshot.formData,
        empresa: restoredSnapshot.empresa,
        staffList: restoredSnapshot.staffList,
        preferences: restoredSnapshot.preferences,
        currentHistoryId: restoredSnapshot.currentHistoryId,
      };
      persistWorkspaceImmediately(restoredSnapshot, { syncServerNow: true });
      restoredParts.push("borrador, personal, empresa y preferencias");
    }

    if (parsed.historyRecords && parsed.historyRecords.length > 0) {
      const mergedHistory = mergeHistoryRecords(parsed.historyRecords, true);
      setHistoryCount(mergedHistory.length);
      refreshPendingCount().catch(() => {});
      if (isOnline) {
        syncNow().catch(() => {});
      }
      restoredParts.push(`${parsed.historyRecords.length} registro(s) de historial`);
    }

    showToast("¡Respaldo restaurado y guardado de forma persistente!");
    return {
      ok: true,
      message: `Se restauró correctamente: ${restoredParts.join(" + ")}.`,
    };
  };

  const handleDeleteHistoryRecord = useCallback(
    (recordId: string) => {
      setHistoryCount(getHistoryRecords().length);
      refreshPendingCount().catch(() => {});
      if (currentHistoryId === recordId) {
        setCurrentHistoryId(null);
        latestStateRef.current.currentHistoryId = null;
        try {
          localStorage.removeItem("ats_current_history_id");
        } catch {}
      }
      if (currentUser) {
        currentUser
          .getIdToken()
          .then((token) => deleteSyncedHistoryRecordOnServer(recordId, token))
          .catch(() => {});
      }
    },
    [currentHistoryId, currentUser, refreshPendingCount]
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased overflow-x-clip print:overflow-visible">
      {/* APP TOP NAVIGATION BAR (Hidden in print) */}
      <header className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-xs pt-[env(safe-area-inset-top)] ios-safe-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LADO IZQUIERDO: Logo DCM */}
          <div className="flex items-center shrink-0">
            {/* Logo Oficial DCM Fijo */}
            <button
              type="button"
              onClick={() => setIsCompanyModalOpen(true)}
              className="h-10 sm:h-11 w-24 sm:w-32 bg-white rounded-xl p-1 border-2 border-slate-200 hover:border-slate-800 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs group relative transition-all"
              title="Logotipo Oficial DCM - Clic para ver o cambiar datos de la empresa"
            >
              <img
                src={empresa.logoUrl || DEFAULT_LOGO_SVG}
                alt={empresa.nombreEmpresa || "Logo Oficial DCM"}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 className="w-2.5 h-2.5" />
              </span>
            </button>
          </div>

          {/* LADO DERECHO: SOLO DOS BOTONES PRINCIPALES + MENÚ DESPLEGABLE */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* BOTÓN PRINCIPAL 1: Guardar ATS (Azul Oscuro DCM) */}
            <button
              type="button"
              onClick={() => handleSaveCurrentATS(true)}
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-sm cursor-pointer border border-slate-900"
              title="Guardar este ATS actual en el Historial con ID único"
            >
              <Save className="w-4 h-4 text-white shrink-0" />
              <span>Guardar ATS</span>
            </button>

            {/* BOTÓN PRINCIPAL 2: Compartir Link (Neutro corporativo) */}
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 bg-white hover:bg-slate-100 active:scale-98 border-2 border-slate-300 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Copiar enlace oficial con el formato y logotipo fijos"
            >
              <Share2 className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="hidden xs:inline">Compartir Link</span>
            </button>

            {/* MENÚ DESPLEGABLE (3 Puntos para todas las opciones secundarias) */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setIsNavMenuOpen((prev) => !prev)}
                className={`relative z-50 p-2 sm:p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                  isNavMenuOpen
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs"
                }`}
                title="Menú de opciones secundarias (Historial, Nuevo ATS, Formato PDF, Personal, etc.)"
                aria-expanded={isNavMenuOpen}
              >
                {isNavMenuOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
              </button>

              {/* CONTENIDO DEL MENÚ DESPLEGABLE */}
              {isNavMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100"
                  onClick={() => setIsNavMenuOpen(false)}
                >
                  {/* Estado ATS Seguridad Laboral (En línea / Guardado / Sincronización) */}
                  <div
                    className="px-4 py-3 bg-slate-50/90 flex flex-col gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
                      ATS Seguridad Laboral
                    </h1>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                      <span
                        className="inline-flex items-center gap-1"
                        title={isOnline ? "Conectado al servidor central" : "Operando sin conexión (IndexedDB)"}
                      >
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        <span className="font-semibold text-slate-700">
                          {isOnline ? "En línea" : "Sin conexión"}
                        </span>
                      </span>

                      <span className="text-slate-300">·</span>

                      <button
                        type="button"
                        onClick={handleManualSave}
                        className="hover:underline text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Guardado continuo en memoria local. Clic para forzar guardado."
                      >
                        {saveStatus === "saving" ? "Guardando..." : `Guardado ${lastSavedTime}`}
                      </button>

                      {pendingCount > 0 && (
                        <button
                          type="button"
                          onClick={() => isOnline && syncNow()}
                          className="inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer"
                          title="Registros pendientes de sincronizar. Clic para sincronizar."
                        >
                          {pendingCount} pend.
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Usuario autenticado */}
                  {currentUser && (
                    <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario Conectado</p>
                        <p className="text-xs font-semibold text-slate-800 truncate" title={currentUser.email || ""}>
                          {currentUser.email}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        Firebase
                      </span>
                    </div>
                  )}

                  {/* Grupo 1: Acciones Operativas Fundamentales solicitadas */}
                  <div className="py-1">
                    {/* Formato PDF (1:1) / Volver al Formulario */}
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === "form" ? "preview" : "form")}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span>{viewMode === "form" ? "Formato PDF (1:1)" : "Modo Formulario"}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {viewMode === "form" ? "Vista Previa" : "Editar"}
                      </span>
                    </button>

                    {/* Historial ATS */}
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-slate-600" />
                        <span>Historial ATS</span>
                      </div>
                      <span className="text-xs font-extrabold text-white bg-slate-900 px-2 py-0.5 rounded-full">
                        {historyCount}
                      </span>
                    </button>

                    {/* Nuevo ATS */}
                    <button
                      type="button"
                      onClick={handleNewATS}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <PlusCircle className="w-4 h-4 text-slate-600" />
                        <span>Nuevo ATS</span>
                      </div>
                      <span className="text-[11px] text-slate-500">En blanco</span>
                    </button>

                    {/* Personal / Cuadrilla */}
                    <button
                      type="button"
                      onClick={() => setIsStaffModalOpen(true)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span>Personal / Cuadrilla</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {formData.trabajadores.length}
                      </span>
                    </button>
                  </div>

                  {/* Grupo 2: Exportación & Impresión */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <FileDown className="w-4 h-4 text-slate-500" />
                      <span>Descargar PDF Unificado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>Enviar PDF al Correo</span>
                    </button>
                    <button
                      type="button"
                      onClick={printDirect}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Imprimir Formato</span>
                    </button>
                  </div>

                  {/* Grupo 3: Configuración Institucional & Sesión */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setIsCompanyModalOpen(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <Building className="w-4 h-4 text-slate-500" />
                      <span>Empresa & Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPreferencesModalOpen(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      <span>Preferencias y Respaldo</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("¿Desea cerrar la sesión de su cuenta de Firebase?")) {
                          await signOutUser();
                          showToast("Sesión cerrada correctamente");
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Cerrar Sesión</span>
                    </button>
                    <PWAInstallButton
                      variant="menu-item"
                      onOpenGuide={() => setIsPWAModalOpen(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="no-print fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[70] flex items-center gap-2.5 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full min-w-0 mx-auto p-3 sm:p-6 print:p-0 print:m-0 print:max-w-none print:w-full">
        {viewMode === "form" ? (
          <div className="no-print space-y-6">
            <ATSInteractiveForm
              formData={formData}
              onChangeFormData={handleFormDataChange}
              empresa={empresa}
              staffList={staffList}
              onOpenStaffModal={() => setIsStaffModalOpen(true)}
              onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              onOpenSignModal={(target) => setSignTarget(target)}
              isGeneratingAI={isGeneratingAI}
              onGenerateWithAI={handleGenerateWithAI}
              onViewPDF={() => setViewMode("preview")}
              onExportPDF={handleExportPDF}
              onEmailPDF={() => setIsEmailModalOpen(true)}
              isExportingPDF={isExportingPDF}
              saveStatus={saveStatus}
              lastSavedTime={lastSavedTime}
              onManualSave={handleManualSave}
              onUpdateEmpresa={async (updated) => {
                setEmpresa(updated);
                if (updated.logoUrl) {
                  saveLogoToStorage(updated.logoUrl);
                }
                await syncCompanyTemplateToServer(updated);
              }}
              onSyncWorkerToStaff={handleSyncWorkerToStaff}
              onSaveAutorizadorToStaff={handleSaveAutorizadorToStaff}
              activeSection={activeSection}
              onChangeActiveSection={setActiveSection}
            />


          </div>
        ) : (
          <div className="no-print space-y-4 sm:space-y-6 min-w-0">
            {/* Toolbar for Preview Mode (Responsive para iPhone y Escritorio) */}
            <div className="no-print bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide leading-snug">
                  Formato Oficial Unificado {empresa.codigoFormato || "F-SST-045"} (Listo para Presentar)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("form")}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[42px] text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Editar ATS</span>
                </button>
                <button
                  type="button"
                  onClick={printDirect}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[42px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
                  title="Imprimir formato oficial unificado"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[42px] text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Logo / Empresa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[42px] text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  title="Enviar formato PDF oficial por correo electrónico"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Enviar Correo</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Descargar documento PDF oficial unificado"
                >
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>{isExportingPDF ? "Generando PDF..." : "Descargar PDF Unificado"}</span>
                </button>
              </div>
            </div>

            {/* Control de zoom responsivo exclusivo para iPhone / pantallas angostas */}
            <div className="no-print md:hidden bg-blue-50 border border-blue-200 text-blue-900 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs">
              <p className="text-[11px] leading-tight font-medium">
                {previewZoomMode === "fit"
                  ? "Vista Carta ajustada automáticamente al ancho de tu pantalla."
                  : "Vista Carta 1:1 real (215.9mm). Desliza horizontalmente para revisar."}
              </p>
              <button
                type="button"
                onClick={() => setPreviewZoomMode((m) => (m === "fit" ? "actual" : "fit"))}
                className="shrink-0 text-[11px] font-bold bg-white text-blue-800 border border-blue-300 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer active:scale-95"
              >
                {previewZoomMode === "fit" ? "Zoom 1:1" : "Ajustar"}
              </button>
            </div>

            {/* Document Render Container: escala responsiva en iPhone o scroll 1:1 */}
            <div
              ref={previewViewportRef}
              className={
                previewZoomMode === "fit" && previewScale < 1
                  ? "ats-preview-fit-wrapper"
                  : "ats-preview-scroll-wrapper"
              }
            >
              <div
                className={previewZoomMode === "fit" && previewScale < 1 ? "ats-preview-scale-box" : ""}
                style={
                  previewZoomMode === "fit" && previewScale < 1 && previewScaledHeight
                    ? { height: `${previewScaledHeight}px` }
                    : undefined
                }
              >
                <div
                  ref={previewCanvasRef}
                  className={`ats-preview-canvas ${
                    previewZoomMode === "fit" && previewScale < 1 ? "ats-preview-canvas--scaled py-1" : "py-2"
                  }`}
                  style={
                    previewZoomMode === "fit" && previewScale < 1
                      ? { transform: `scale(${previewScale})` }
                      : undefined
                  }
                >
                  <ATSPrintFormat
                    formData={formData}
                    empresa={empresa}
                    onOpenSignModal={(target) => setSignTarget(target)}
                    onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
                    id="ats-preview-document"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED OFFSCREEN STAGE FOR HIGH-FIDELITY PDF EXPORT (ISOLATED 0x0 HOST SO IPHONE NEVER OVERFLOWS) */}
        <div
          id="ats-pdf-export-stage"
          aria-hidden="true"
          className="ats-pdf-export-stage"
        >
          {/* Isolated Page 1 for pristine Letter export */}
          <div id="ats-export-page-1" className="ats-export-page-box">
            <ATSPrintFormat
              formData={formData}
              empresa={empresa}
              page={1}
              id="ats-export-target-p1"
            />
          </div>

          {/* Isolated Page 2 for pristine Letter export */}
          <div id="ats-export-page-2" className="ats-export-page-box">
            <ATSPrintFormat
              formData={formData}
              empresa={empresa}
              page={2}
              id="ats-export-target-p2"
            />
          </div>

          {/* Fallback complete container */}
          <div id="ats-export-target">
            <ATSPrintFormat
              formData={formData}
              empresa={empresa}
              page="both"
            />
          </div>
        </div>

        {/* ALWAYS PRESENT HIDDEN PRINTABLE CONTAINER FOR WINDOW.PRINT() */}
        <div className="hidden print:block print:w-full print:m-0 print:p-0 print-only-container">
          <ATSPrintFormat
            formData={formData}
            empresa={empresa}
            id="ats-printable-document"
          />
        </div>
      </main>



      {/* DIGITAL SIGNATURE MODAL */}
      <SignatureModal
        isOpen={signTarget !== null}
        onClose={() => setSignTarget(null)}
        onSave={handleSaveSignature}
        title={
          signTarget?.type === "supervisor"
            ? "Firma Digital del Coordinador / Supervisor SST (Emisor)"
            : signTarget?.type === "autorizador"
            ? `Firma Digital de Quien Autoriza: ${signTarget?.name || ""}`
            : `Firma Digital del Trabajador: ${signTarget?.name}`
        }
        subtitle={
          signTarget?.type === "supervisor"
            ? "Verificación y autorización del inicio seguro de labores (Res. 4272/2021)"
            : signTarget?.type === "autorizador"
            ? "Autorización formal para la ejecución segura del trabajo en el ATS"
            : "Compromiso de cumplimiento de normas SST y autocuidado"
        }
        initialSignature={
          signTarget?.type === "supervisor"
            ? formData.supervisor.firmaUrl
            : signTarget?.type === "autorizador"
            ? formData.autorizador?.firmaUrl
            : signTarget?.id
            ? formData.firmasTrabajadores[signTarget.id]
            : undefined
        }
      />

      {/* STAFF MANAGEMENT MODAL */}
      <PersonalManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          showToast("Personal y firmas guardados en el ATS");
        }}
        staffList={staffList}
        onUpdateStaffList={updateStaffListImmediately}
        activeWorkers={formData.trabajadores}
        onToggleActiveWorker={handleToggleActiveWorker}
        supervisor={formData.supervisor}
        onUpdateSupervisor={(updatedSup) => {
          handleFormDataChange((prev) => ({ ...prev, supervisor: updatedSup }));
          showToast("Coordinador SST actualizado con éxito");
        }}
        autorizador={formData.autorizador}
        onUpdateAutorizador={(updatedAuth) => {
          handleFormDataChange((prev) => ({ ...prev, autorizador: updatedAuth }));
          showToast("Persona que autoriza actualizada con éxito");
        }}
        onUpdateActiveWorkers={(updatedWorkers) => {
          handleFormDataChange((prev) => {
            const nextFirmas = { ...prev.firmasTrabajadores };
            const syncedWorkers = updatedWorkers.map((w) => {
              const staffMatch = latestStateRef.current.staffList.find((s) => s.id === w.id);
              const resolvedFirma =
                w.firmaUrl !== undefined
                  ? w.firmaUrl
                  : staffMatch?.firmaUrl || nextFirmas[w.id] || "";
              if (resolvedFirma) {
                nextFirmas[w.id] = resolvedFirma;
              }
              return resolvedFirma ? { ...w, firmaUrl: resolvedFirma } : w;
            });
            return {
              ...prev,
              trabajadores: syncedWorkers,
              firmasTrabajadores: nextFirmas,
            };
          });
        }}
        activeWorkerSignatures={formData.firmasTrabajadores}
        onSaveWorkerSignature={(workerId, signatureDataUrl) => {
          handleFormDataChange((prev) => {
            const nextFirmas = { ...prev.firmasTrabajadores };
            if (signatureDataUrl) {
              nextFirmas[workerId] = signatureDataUrl;
            } else {
              delete nextFirmas[workerId];
            }
            return {
              ...prev,
              trabajadores: prev.trabajadores.map((w) =>
                w.id === workerId ? { ...w, firmaUrl: signatureDataUrl } : w
              ),
              firmasTrabajadores: nextFirmas,
            };
          });
        }}
      />

      {/* COMPANY & LOGO CONFIG MODAL */}
      <CompanyConfigModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        empresa={empresa}
        onSaveEmpresa={async (updated) => {
          setEmpresa(updated);
          if (updated.logoUrl) {
            saveLogoToStorage(updated.logoUrl);
          }
          await syncCompanyTemplateToServer(updated);
          showToast("¡Plantilla y logotipo oficial guardados y sincronizados para todos los enlaces!");
        }}
      />

      {/* APPSHEET TECHNICAL GUIDE MODAL */}
      <AppSheetGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* EMAIL PDF MODAL */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        formData={formData}
        empresa={empresa}
        onShowToast={showToast}
        defaultRecipient={preferences.lastEmailRecipient}
        onSaveRecipientPreference={(email) =>
          updatePreferences((prev) => ({ ...prev, lastEmailRecipient: email }), {
            syncServerNow: true,
          })
        }
      />

      {/* ATS HISTORY MODAL */}
      <ATSHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          getAllHistoryRecordsCombined()
            .then((all) => setHistoryCount(all.length))
            .catch(() => setHistoryCount(getHistoryRecords().length));
        }}
        onLoadATS={handleLoadATSFromHistory}
        onNewATS={() => {
          setIsHistoryModalOpen(false);
          handleNewATS();
        }}
        currentATSId={currentHistoryId || undefined}
        onSaveCurrentATS={() => handleSaveCurrentATS(true)}
        onDeleteRecord={handleDeleteHistoryRecord}
        onHistoryChange={(count) => {
          setHistoryCount(count);
          refreshPendingCount().catch(() => {});
          if (isOnline) {
            syncNow().catch(() => {});
          }
        }}
      />

      {/* PREFERENCES & FULL BACKUP MODAL */}
      <PreferencesBackupModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        preferences={preferences}
        onSavePreferences={(updated) => {
          updatePreferences(updated, { syncServerNow: true });
          showToast("¡Preferencias guardadas de forma persistente!");
        }}
        onForceSyncAll={handleForceSyncAll}
        onExportBackup={handleExportFullBackup}
        onImportBackup={handleImportFullBackup}
        stats={{
          staffCount: staffList.length,
          historyCount,
          lastSavedTime,
          isOnline,
          userEmail: currentUser?.email,
        }}
      />

      {/* PWA CROSS-BROWSER INSTALL PROMPT & GUIDE MODAL */}
      <PWAInstallFloatingPrompt />
      <PWAInstallModal
        isOpen={isPWAModalOpen}
        onClose={() => setIsPWAModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AccessGuard>
      <ATSAppContent />
    </AccessGuard>
  );
}
