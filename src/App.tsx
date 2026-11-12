import React, { useState, useEffect } from "react";
import {
  ATSFormData,
  ATSHistoryRecord,
  EmpresaConfig,
  PersonalMember,
} from "./types";
import {
  DEFAULT_EMPRESA,
  DEFAULT_LOGO_SVG,
  INITIAL_FORM_DATA,
  INITIAL_STAFF,
} from "./data/defaultData";
import {
  getSavedLogo,
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
import { PWAInstallButton } from "./components/PWAInstallButton";
import { getHistoryRecords, saveHistoryRecord } from "./utils/historyStorage";
import { exportToPDF, printDirect } from "./utils/pdfExport";
import { useNetworkSync } from "./hooks/useNetworkSync";
import { generateOfflineATS } from "./utils/offlineGenerator";
import { saveAppSettingsToIDB } from "./utils/indexedDB";
import {
  FileDown,
  Printer,
  Sparkles,
  Users,
  Building,
  HelpCircle,
  Eye,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Share2,
  Settings,
  PlusCircle,
  RefreshCw,
  Save,
  Cloud,
  Lock,
  Mail,
  History,
  Wifi,
  WifiOff,
  CloudUpload,
  Check,
  MoreVertical,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  LogOut,
} from "lucide-react";

function ATSAppContent() {
  // Local storage loaded states with fallbacks
  const [formData, setFormData] = useState<ATSFormData>(() => {
    try {
      const saved = localStorage.getItem("ats_form_data");
      return saved ? JSON.parse(saved) : INITIAL_FORM_DATA;
    } catch {
      return INITIAL_FORM_DATA;
    }
  });

  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => {
    try {
      const savedLogo = getSavedLogo();
      const saved = localStorage.getItem("ats_empresa_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatic upgrade from legacy defaults while preserving custom user edits
        if (!parsed.codigoFormato || parsed.codigoFormato === "F-SST-044") {
          parsed.codigoFormato = "F-SST-045";
        }
        if (!parsed.version || parsed.version === "1") {
          parsed.version = "01";
        }
        if (!parsed.vigencia || parsed.vigencia === "2026-12-31") {
          parsed.vigencia = "02/09/2026";
        }
        if (
          !parsed.logoUrl ||
          parsed.logoUrl.includes("unsplash.com") ||
          parsed.logoUrl.includes("INGENIER%C3%8DA%20%26%20SST") ||
          parsed.logoUrl.includes("INGENIERÍA & SST") ||
          parsed.logoUrl.includes("inveasas") ||
          parsed.logoUrl.includes("Atom%20Orbits")
        ) {
          parsed.logoUrl = savedLogo;
        }
        if (
          parsed.nombreEmpresa === "INVEASAS S.A.S." ||
          parsed.nombreEmpresa === "INVESTIGACIÓN ENERGÉTICA APLICADA S.A.S" ||
          !parsed.nombreEmpresa
        ) {
          parsed.nombreEmpresa = "DCM";
        }
        return parsed;
      }
      return {
        ...DEFAULT_EMPRESA,
        logoUrl: savedLogo,
      };
    } catch {
      return DEFAULT_EMPRESA;
    }
  });

  const [staffList, setStaffList] = useState<PersonalMember[]>(() => {
    try {
      const saved = localStorage.getItem("ats_staff_list");
      return saved ? JSON.parse(saved) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  // UI States
  const [viewMode, setViewMode] = useState<"form" | "preview">("form");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth & User from Firebase
  const { currentUser, signOutUser } = useAuth();

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(() => {
    try {
      return getHistoryRecords().length;
    } catch {
      return 0;
    }
  });
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ats_current_history_id") || null;
    } catch {
      return null;
    }
  });
  const [signTarget, setSignTarget] = useState<{
    type: "worker" | "supervisor";
    id?: string;
    name: string;
  } | null>(null);

  // Responsive mobile top navigation menu state
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // PWA Network Sync & Offline State
  const { isOnline, pendingCount, isSyncing, syncNow, refreshPendingCount } = useNetworkSync();

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

  // Real-time Auto-Save to localStorage and IndexedDB on every change with subtle debounce
  useEffect(() => {
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("ats_form_data", JSON.stringify(formData));
        localStorage.setItem("ats_empresa_config", JSON.stringify(empresa));
        localStorage.setItem("ats_staff_list", JSON.stringify(staffList));
        if (empresa.logoUrl) {
          saveLogoToStorage(empresa.logoUrl);
        }

        // Backup in IndexedDB for 100% reliable offline persistence
        saveAppSettingsToIDB("ats_draft_backup", {
          formData,
          empresa,
          staffList,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.warn("IDB draft backup warn:", err));

        const nowFormatted = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        localStorage.setItem("ats_last_saved_time", nowFormatted);
        setLastSavedTime(nowFormatted);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Error al sincronizar con almacenamiento:", err);
        setSaveStatus("error");
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [formData, empresa, staffList]);

  // Synchronous flush on window unload/reload to prevent ANY accidental loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem("ats_form_data", JSON.stringify(formData));
        localStorage.setItem("ats_empresa_config", JSON.stringify(empresa));
        localStorage.setItem("ats_staff_list", JSON.stringify(staffList));
        if (empresa.logoUrl) {
          saveLogoToStorage(empresa.logoUrl);
        }
        localStorage.setItem(
          "ats_last_saved_time",
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, empresa, staffList]);

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
      localStorage.setItem("ats_form_data", JSON.stringify(formData));
      localStorage.setItem("ats_empresa_config", JSON.stringify(empresa));
      localStorage.setItem("ats_staff_list", JSON.stringify(staffList));
      if (empresa.logoUrl) {
        saveLogoToStorage(empresa.logoUrl);
      }
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      localStorage.setItem("ats_last_saved_time", now);
      setLastSavedTime(now);
      setSaveStatus("saved");

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
      localStorage.setItem("ats_current_history_id", record.id);
      setHistoryCount(getHistoryRecords().length);
      refreshPendingCount();

      if (isOnline) {
        syncNow().catch((e) => console.warn("Background sync error:", e));
      }

      showToast(
        isOnline
          ? `¡ATS guardado y sincronizado! (${record.formData?.codigo || record.id})`
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
        const formattedPasos = data.pasos.map((item: any, idx: number) => ({
          id: `paso-ai-${Date.now()}-${idx}`,
          numero: item.numero || idx + 1,
          paso: item.paso,
          riesgo: item.riesgo,
          controles: item.controles,
          responsable:
            item.responsable ||
            item.responsableSugerido ||
            formData.trabajadores[idx % formData.trabajadores.length]?.nombre ||
            "Técnico Ejecutor",
        }));

        const deducedTipo = data.tipoTrabajo || typeOverride || "Trabajo a Nivel de Piso / Locativo";
        const deducedAltura = data.alturaAproximada || heightOverride || "N/A - Nivel de piso";
        const deducedDetalle = data.detalleLabor || detailOverride || taskToUse;
        const deducedObservaciones = data.observaciones || formData.observaciones || "";

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

        let updatedArea = [...formData.preparacionArea];
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

        const updatedATSData: ATSFormData = {
          ...formData,
          tareaGeneral: taskToUse,
          alturaAproximada: deducedAltura,
          detalleLabor: deducedDetalle,
          tipoTrabajo: deducedTipo,
          observaciones: deducedObservaciones,
          pasos: formattedPasos,
          eppsSeleccionados: cleanEpps,
          preparacionArea: updatedArea,
        };

        setFormData(updatedATSData);

        try {
          const { record } = saveHistoryRecord(
            updatedATSData,
            empresa,
            staffList,
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

  // Signature save handler
  const handleSaveSignature = (dataUrl: string) => {
    if (!signTarget) return;

    if (signTarget.type === "worker" && signTarget.id) {
      setFormData((prev) => ({
        ...prev,
        firmasTrabajadores: {
          ...prev.firmasTrabajadores,
          [signTarget.id!]: dataUrl,
        },
      }));
      showToast(`Firma registrada para ${signTarget.name}`);
    } else if (signTarget.type === "supervisor") {
      setFormData((prev) => ({
        ...prev,
        supervisor: {
          ...prev.supervisor,
          firmaUrl: dataUrl,
        },
      }));
      showToast("Firma registrada para el Supervisor SST");
    }
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
      setFormData((prev) => ({
        ...prev,
        trabajadores: prev.trabajadores.filter((w) => w.id !== member.id),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        trabajadores: [...prev.trabajadores, member],
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
      localStorage.setItem("ats_current_history_id", record.id);
      setHistoryCount(getHistoryRecords().length);
      refreshPendingCount();

      // Si estamos en línea, sincronizar automáticamente con el servidor
      if (isOnline) {
        syncNow().catch((e) => console.warn("Background sync error:", e));
      }

      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      localStorage.setItem("ats_last_saved_time", now);
      setLastSavedTime(now);
      setSaveStatus("saved");

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

  // Cargar ATS guardado desde el Historial
  const handleLoadATSFromHistory = (record: ATSHistoryRecord, targetView: "form" | "preview" = "form") => {
    setFormData(record.formData);
    if (record.empresa) {
      setEmpresa(record.empresa);
      if (record.empresa.logoUrl) {
        saveLogoToStorage(record.empresa.logoUrl);
      }
    }
    if (record.staffList && Array.isArray(record.staffList)) {
      setStaffList(record.staffList);
    }
    setCurrentHistoryId(record.id);
    localStorage.setItem("ats_current_history_id", record.id);
    setViewMode(targetView);
    setIsHistoryModalOpen(false);
    showToast(`¡ATS "${record.titulo}" cargado exitosamente!`);
  };

  // Nuevo ATS Handler: Inicia un formato nuevo preservando Empresa, Logo, Código y Personal
  const handleNewATS = () => {
    const confirmReset = window.confirm(
      "¿Desea iniciar un Nuevo ATS?\n\nSe reiniciarán las tareas, fechas y firmas para un nuevo día de trabajo, pero se mantendrán guardados permanentemente los datos de la Empresa, Logo, Formato (" + (empresa.codigoFormato || "F-SST-045") + ") y Personal registrado.\n\nLos ATS anteriores permanecen guardados en su Historial."
    );
    if (!confirmReset) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const newId = `ATS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    setCurrentHistoryId(null);
    localStorage.removeItem("ats_current_history_id");

    setFormData({
      ...INITIAL_FORM_DATA,
      id: newId,
      codigo: empresa.codigoFormato || "F-SST-045",
      version: empresa.version || "01",
      vigencia: empresa.vigencia || "02/09/2026",
      fechaDiligenciamiento: todayStr,
      permisoValidoDesdeFecha: todayStr,
      permisoValidoHastaFecha: todayStr,
      firmasTrabajadores: {},
      supervisor: {
        ...formData.supervisor,
        firmaUrl: "",
      },
      trabajadores: [...staffList],
    });

    showToast("¡Nuevo ATS iniciado! Se conservó la información de la empresa y formato.");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* APP TOP NAVIGATION BAR (Hidden in print) */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LADO IZQUIERDO: Logo DCM + Título + Estado Sincronización y Red */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
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

            {/* Título & Indicadores discretos siempre visibles */}
            <div className="flex flex-col min-w-0 justify-center">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                ATS Seguridad Laboral
              </h1>
              
              {/* Indicador de red + auto-guardado en una sola línea compacta */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                {/* Conexión */}
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

                {/* Auto-guardado discreto */}
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="hover:underline text-slate-500 hover:text-slate-800 truncate"
                  title="Guardado continuo en memoria local. Clic para forzar guardado."
                >
                  {saveStatus === "saving" ? "Guardando..." : `Guardado ${lastSavedTime}`}
                </button>

                {/* Pendientes si hay */}
                {pendingCount > 0 && (
                  <span
                    onClick={() => isOnline && syncNow()}
                    className="hidden sm:inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded cursor-pointer"
                    title="Registros pendientes de sincronizar. Clic para sincronizar."
                  >
                    {pendingCount} pend.
                  </span>
                )}
              </div>
            </div>
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNavMenuOpen((prev) => !prev)}
                className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
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
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100"
                  onClick={() => setIsNavMenuOpen(false)}
                >
                  {/* Usuario autenticado */}
                  {currentUser && (
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
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
                      <span>Empresa & Logo DCM</span>
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
                    <div className="px-4 py-2">
                      <PWAInstallButton />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:w-full">
        {viewMode === "form" ? (
          <div className="no-print space-y-6">
            <ATSInteractiveForm
              formData={formData}
              onChangeFormData={setFormData}
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
            />


          </div>
        ) : (
          <div className="no-print space-y-6">
            {/* Toolbar for Preview Mode */}
            <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Formato Oficial Unificado {empresa.codigoFormato || "F-SST-045"} (Encabezado Único · Listo para Presentar)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={printDirect}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  title="Imprimir formato oficial unificado"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Configurar Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Enviar formato PDF oficial por correo electrónico"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enviar al Correo</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-1.5 rounded-lg shadow-2xs transition-colors"
                  title="Descargar documento PDF oficial unificado"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{isExportingPDF ? "Generando..." : "Descargar PDF Unificado"}</span>
                </button>
              </div>
            </div>

            {/* Responsive notice for mobile devices */}
            <div className="no-print sm:hidden bg-blue-50 border border-blue-200 text-blue-900 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
              <span className="text-base">📄</span>
              <p className="text-[11px] leading-tight">
                <strong>Vista Carta 1:1 fija (215.9mm):</strong> Desliza horizontalmente para revisar la hoja completa y verificar los márgenes exactos sin distorsión.
              </p>
            </div>

            {/* Document Render Container with rigid horizontal shield (816px Letter) */}
            <div className="ats-preview-scroll-wrapper w-full overflow-x-auto pb-8">
              <div className="ats-preview-canvas w-[816px] min-w-[816px] max-w-[816px] mx-auto py-2">
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
        )}

        {/* DEDICATED OFFSCREEN STAGE FOR HIGH-FIDELITY PDF EXPORT (ISOLATED PAGES 1 & 2) */}
        <div
          id="ats-pdf-export-stage"
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "816px",
            minWidth: "816px",
            maxWidth: "816px",
            backgroundColor: "#ffffff",
            zIndex: -99999,
            pointerEvents: "none",
            visibility: "visible",
            opacity: 1,
          }}
        >
          {/* Isolated Page 1 for pristine Letter export */}
          <div
            id="ats-export-page-1"
            style={{
              width: "816px",
              minWidth: "816px",
              maxWidth: "816px",
              height: "1056px",
              minHeight: "1056px",
              maxHeight: "1056px",
              overflow: "hidden",
              backgroundColor: "#ffffff",
              margin: 0,
              padding: 0,
            }}
          >
            <ATSPrintFormat
              formData={formData}
              empresa={empresa}
              page={1}
              id="ats-export-target-p1"
            />
          </div>

          {/* Isolated Page 2 for pristine Letter export */}
          <div
            id="ats-export-page-2"
            style={{
              width: "816px",
              minWidth: "816px",
              maxWidth: "816px",
              height: "1056px",
              minHeight: "1056px",
              maxHeight: "1056px",
              overflow: "hidden",
              backgroundColor: "#ffffff",
              margin: 0,
              padding: 0,
            }}
          >
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
            : `Firma Digital del Trabajador: ${signTarget?.name}`
        }
        subtitle={
          signTarget?.type === "supervisor"
            ? "Verificación y autorización del inicio seguro de labores (Res. 4272/2021)"
            : "Compromiso de cumplimiento de normas SST y autocuidado"
        }
        initialSignature={
          signTarget?.type === "supervisor"
            ? formData.supervisor.firmaUrl
            : signTarget?.id
            ? formData.firmasTrabajadores[signTarget.id]
            : undefined
        }
      />

      {/* STAFF MANAGEMENT MODAL */}
      <PersonalManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onUpdateStaffList={setStaffList}
        activeWorkers={formData.trabajadores}
        onToggleActiveWorker={handleToggleActiveWorker}
        supervisor={formData.supervisor}
        onUpdateSupervisor={(updatedSup) => {
          setFormData((prev) => ({ ...prev, supervisor: updatedSup }));
          showToast("Coordinador SST actualizado con éxito");
        }}
        onUpdateActiveWorkers={(updatedWorkers) => {
          setFormData((prev) => ({ ...prev, trabajadores: updatedWorkers }));
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
      />

      {/* ATS HISTORY MODAL */}
      <ATSHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryCount(getHistoryRecords().length);
        }}
        onLoadATS={handleLoadATSFromHistory}
        onNewATS={() => {
          setIsHistoryModalOpen(false);
          handleNewATS();
        }}
        currentATSId={currentHistoryId || undefined}
        onSaveCurrentATS={() => handleSaveCurrentATS(true)}
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
