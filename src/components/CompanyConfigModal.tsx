import React, { useState, useEffect } from "react";
import { X, Building2, Upload, RotateCcw, Check, Image as ImageIcon, Sparkles, RefreshCw, Trash2, Lock } from "lucide-react";
import { EmpresaConfig } from "../types";
import { DEFAULT_EMPRESA, DEFAULT_LOGO_SVG } from "../data/defaultData";
import { optimizeLogoFile, saveLogoToStorage } from "../utils/logoHelper";

interface CompanyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaConfig;
  onSaveEmpresa: (updated: EmpresaConfig) => void;
}

export const CompanyConfigModal: React.FC<CompanyConfigModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onSaveEmpresa,
}) => {
  const [form, setForm] = useState<EmpresaConfig>({ ...empresa });
  const [previewLogo, setPreviewLogo] = useState<string>(empresa.logoUrl);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...empresa });
      setPreviewLogo(empresa.logoUrl);
    }
  }, [isOpen, empresa]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingImage(true);
        const optimized = await optimizeLogoFile(file);
        setPreviewLogo(optimized);
        setForm((prev) => ({ ...prev, logoUrl: optimized }));
      } catch (err) {
        console.error("Error optimizando imagen del logo:", err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleResetLogoOnly = () => {
    setPreviewLogo(DEFAULT_LOGO_SVG);
    setForm((prev) => ({ ...prev, logoUrl: DEFAULT_LOGO_SVG }));
  };

  const handleClearLogo = () => {
    // Si se limpia el logo, se restablece de inmediato al logotipo oficial DCM fijo en la plantilla
    setPreviewLogo(DEFAULT_LOGO_SVG);
    setForm((prev) => ({ ...prev, logoUrl: DEFAULT_LOGO_SVG }));
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_EMPRESA });
    setPreviewLogo(DEFAULT_EMPRESA.logoUrl);
  };

  const handleSave = () => {
    const finalLogo = form.logoUrl || DEFAULT_LOGO_SVG;
    saveLogoToStorage(finalLogo);
    onSaveEmpresa({ ...form, logoUrl: finalLogo });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Datos de la Empresa & Logo Fijo
              </h3>
              <p className="text-xs text-slate-500">
                Encabezado institucional oficial fijado en la plantilla ATS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto">


          {/* Logo Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Logotipo Oficial DCM Fijo en Plantilla
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleResetLogoOnly}
                  className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1"
                  title="Restaurar el logotipo vectorial oficial de DCM"
                >
                  <RotateCcw className="w-3 h-3" />
                  Logo Oficial DCM
                </button>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Lock className="w-2.5 h-2.5" />
                  Fijo en Plantilla
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-full sm:w-36 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1.5 relative group">
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-indigo-600 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Optimizando...</span>
                  </div>
                ) : (
                  <img
                    src={previewLogo || DEFAULT_LOGO_SVG}
                    alt="Logo Oficial DCM"
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewLogo ? "Cambiar Logotipo" : "Subir Logotipo"}</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Soporta PNG, JPG, WebP o SVG
                  </span>
                </div>
                
                <input
                  type="text"
                  value={form.logoUrl.startsWith("data:") ? "(Imagen cargada desde tu dispositivo)" : form.logoUrl}
                  onChange={(e) => {
                    if (!e.target.value.startsWith("(Imagen")) {
                      setForm({ ...form, logoUrl: e.target.value });
                      setPreviewLogo(e.target.value);
                    }
                  }}
                  placeholder="O ingresa una URL web directa: https://..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Razón Social / Empresa
              </label>
              <input
                type="text"
                value={form.nombreEmpresa}
                onChange={(e) => setForm({ ...form, nombreEmpresa: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIT / Identificación
              </label>
              <input
                type="text"
                value={form.nit}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Código del Formato SST
              </label>
              <input
                type="text"
                value={form.codigoFormato}
                onChange={(e) => setForm({ ...form, codigoFormato: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Versión
                </label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vigencia
                </label>
                <input
                  type="text"
                  value={form.vigencia}
                  onChange={(e) => setForm({ ...form, vigencia: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer defecto
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3.5 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
