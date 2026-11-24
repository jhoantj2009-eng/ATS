import React, { useState, useEffect, useRef } from "react";
import { UserPreferences } from "../types";
import {
  X,
  SlidersHorizontal,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Clock,
  MapPin,
  Mail,
  Eye,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

interface PreferencesBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => Promise<void> | void;
  onForceSyncAll: () => Promise<{ ok: boolean; message: string }>;
  onExportBackup: () => Promise<void> | void;
  onImportBackup: (jsonText: string) => Promise<{ ok: boolean; message: string }>;
  stats: {
    staffCount: number;
    historyCount: number;
    lastSavedTime: string;
    isOnline: boolean;
    userEmail?: string | null;
  };
}

export const PreferencesBackupModal: React.FC<PreferencesBackupModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onForceSyncAll,
  onExportBackup,
  onImportBackup,
  stats,
}) => {
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(preferences);
      setNotice(null);
    }
  }, [isOpen, preferences]);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice(null);
    }, 5000);
  };

  const handleSubmitPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSavePreferences({
        ...draft,
        defaultLugar: draft.defaultLugar.trim(),
        lastEmailRecipient: draft.lastEmailRecipient.trim(),
        updatedAtMs: Date.now(),
      });
      showNotice(
        "success",
        "Preferencias guardadas de forma persistente. Se mantendrán al recargar o actualizar."
      );
    } catch {
      showNotice("error", "No se pudieron guardar las preferencias.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncClick = async () => {
    setIsSyncingAll(true);
    try {
      const result = await onForceSyncAll();
      showNotice(result.ok ? "success" : "error", result.message);
    } catch {
      showNotice("error", "Error al sincronizar los datos.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleExportClick = async () => {
    setIsExporting(true);
    try {
      await onExportBackup();
      showNotice("success", "Archivo de respaldo completo (.json) descargado correctamente.");
    } catch {
      showNotice("error", "No se pudo exportar el archivo de respaldo.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showNotice("error", "El archivo supera el tamaño máximo permitido (15 MB).");
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await onImportBackup(text);
      showNotice(result.ok ? "success" : "error", result.message);
    } catch {
      showNotice("error", "No se pudo leer el archivo seleccionado.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b-4 border-amber-400 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-amber-400/50 text-amber-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                Preferencias y Respaldo Persistente
              </h3>
              <p className="text-xs text-slate-300 truncate">
                Tus datos, firmas, cuadrilla y configuración se recuperan automáticamente al iniciar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK NOTICE */}
        {notice && (
          <div
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b shrink-0 ${
              notice.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/60">
          {/* RESUMEN DE ALMACENAMIENTO PERSISTENTE */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Estado del Almacenamiento
                </h4>
              </div>
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncingAll}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
                <span>{isSyncingAll ? "Sincronizando..." : "Sincronizar Ahora"}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-slate-900">{stats.historyCount}</p>
                <p className="text-[11px] font-semibold text-slate-500">ATS Guardados</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-slate-900">{stats.staffCount}</p>
                <p className="text-[11px] font-semibold text-slate-500">Personal / Firmas</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                <p className="text-sm font-black text-emerald-700 mt-0.5 truncate">
                  {stats.lastSavedTime}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Último Guardado</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-emerald-50/70 border border-emerald-200 rounded-lg px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Protección en 3 capas activa (LocalStorage + IndexedDB + Base de datos del servidor
                {stats.userEmail ? ` vinculada a ${stats.userEmail}` : ""}).
              </span>
            </div>
          </div>

          {/* FORMULARIO DE PREFERENCIAS DEL USUARIO */}
          <form
            onSubmit={handleSubmitPreferences}
            className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Preferencias Predeterminadas
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Lugar predeterminado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lugar / Sede Predeterminada para Nuevos ATS</span>
                </label>
                <input
                  type="text"
                  value={draft.defaultLugar}
                  onChange={(e) => setDraft((prev) => ({ ...prev, defaultLugar: e.target.value }))}
                  placeholder="Ej: Planta Principal - Sector Operativo"
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              {/* Jornada inicio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hora Inicio Habitual</span>
                </label>
                <input
                  type="time"
                  value={draft.defaultJornadaInicio}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, defaultJornadaInicio: e.target.value }))
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-semibold text-slate-800"
                />
              </div>

              {/* Jornada fin */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hora Fin Habitual</span>
                </label>
                <input
                  type="time"
                  value={draft.defaultJornadaFin}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, defaultJornadaFin: e.target.value }))
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-semibold text-slate-800"
                />
              </div>

              {/* Correo predeterminado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Correo Destinatario Frecuente (Envío de PDF)</span>
                </label>
                <input
                  type="text"
                  value={draft.lastEmailRecipient}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, lastEmailRecipient: e.target.value }))
                  }
                  placeholder="coordinacion.sst@empresa.com"
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium text-slate-800"
                />
              </div>

              {/* Vista inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vista Activa</span>
                </label>
                <select
                  value={draft.viewMode}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      viewMode: e.target.value === "preview" ? "preview" : "form",
                    }))
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-semibold text-slate-800"
                >
                  <option value="form">Formulario Interactivo</option>
                  <option value="preview">Vista Previa PDF (1:1)</option>
                </select>
              </div>

              {/* Zoom móvil */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vista PDF en Celular</span>
                </label>
                <select
                  value={draft.previewZoomMode}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      previewZoomMode: e.target.value === "actual" ? "actual" : "fit",
                    }))
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-semibold text-slate-800"
                >
                  <option value="fit">Ajustar al ancho de pantalla</option>
                  <option value="actual">Tamaño Carta 1:1 (scroll)</option>
                </select>
              </div>
            </div>

            {/* Autoguardado continuo */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-800">Autoguardado continuo en tiempo real</p>
                <p className="text-[11px] text-slate-500">
                  Guarda automáticamente cada cambio en el dispositivo y en el servidor
                </p>
              </div>
              <input
                type="checkbox"
                checked={draft.autoSaveEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, autoSaveEnabled: e.target.checked }))
                }
                className="w-5 h-5 accent-slate-900 rounded cursor-pointer shrink-0"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>{isSaving ? "Guardando..." : "Guardar Preferencias"}</span>
              </button>
            </div>
          </form>

          {/* COPIA DE SEGURIDAD PORTABLE (JSON) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Copia de Seguridad Portable (.json)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporta o restaura todo tu entorno (borrador actual, directorio de personal con firmas,
                configuración de empresa, preferencias e historial de ATS) en cualquier dispositivo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportClick}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-slate-700" />
                <span>{isExporting ? "Exportando..." : "Exportar Respaldo Completo"}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>{isImporting ? "Restaurando..." : "Restaurar desde Archivo"}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
