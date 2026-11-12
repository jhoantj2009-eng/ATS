import React, { useState } from "react";
import {
  ATSFormData,
  ATSPaso,
  EmpresaConfig,
  PersonalMember,
  CustomEPPItem,
} from "../types";
import { DEFAULT_LOGO_SVG, EPP_ITEMS } from "../data/defaultData";
import { optimizeLogoFile, saveLogoToStorage } from "../utils/logoHelper";
import {
  Sparkles,
  Users,
  PenTool,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Layers,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Building,
  FileDown,
  Eye,
  ShieldCheck,
  Award,
  UserPlus,
  UserCheck,
  Save,
  AlertCircle,
  Upload,
  Lock,
  RotateCcw,
  Image as ImageIcon,
  Check,
  Mail,
  Tag,
  Edit2,
  X,
} from "lucide-react";

interface ATSInteractiveFormProps {
  formData: ATSFormData;
  onChangeFormData: (updated: ATSFormData) => void;
  empresa: EmpresaConfig;
  staffList: PersonalMember[];
  onOpenStaffModal: () => void;
  onOpenCompanyModal: () => void;
  onOpenSignModal: (target: { type: "worker" | "supervisor"; id?: string; name: string }) => void;
  isGeneratingAI: boolean;
  onGenerateWithAI: (task?: string, height?: string, detail?: string, type?: string) => void;
  onViewPDF?: () => void;
  onExportPDF?: () => void;
  onEmailPDF?: () => void;
  isExportingPDF?: boolean;
  saveStatus?: "saved" | "saving" | "error";
  lastSavedTime?: string;
  onManualSave?: () => void;
  onUpdateEmpresa?: (updated: EmpresaConfig) => void;
}

export const ATSInteractiveForm: React.FC<ATSInteractiveFormProps> = ({
  formData,
  onChangeFormData,
  empresa,
  staffList,
  onOpenStaffModal,
  onOpenCompanyModal,
  onOpenSignModal,
  isGeneratingAI,
  onGenerateWithAI,
  onViewPDF,
  onExportPDF,
  onEmailPDF,
  isExportingPDF = false,
  saveStatus = "saved",
  lastSavedTime = "reciente",
  onManualSave,
  onUpdateEmpresa,
}) => {
  const [activeSection, setActiveSection] = useState<"cabecera" | "matriz" | "epp" | "area" | "firmas">("cabecera");
  const [quickTaskInput, setQuickTaskInput] = useState(formData.tareaGeneral || "");
  const [lastGeneratedName, setLastGeneratedName] = useState<string | null>(formData.tareaGeneral || null);
  const [isOptimizingLogo, setIsOptimizingLogo] = useState(false);
  const [logoSaveNotice, setLogoSaveNotice] = useState<string | null>(null);
  const [newCustomEppName, setNewCustomEppName] = useState("");
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editingCustomText, setEditingCustomText] = useState("");

  const handleQuickLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsOptimizingLogo(true);
        const optimized = await optimizeLogoFile(file);
        saveLogoToStorage(optimized);
        if (onUpdateEmpresa) {
          onUpdateEmpresa({ ...empresa, logoUrl: optimized });
        }
        setLogoSaveNotice("¡Logotipo actualizado y fijado permanentemente!");
        setTimeout(() => setLogoSaveNotice(null), 4000);
      } catch (err) {
        console.error("Error optimizando imagen del logo:", err);
      } finally {
        setIsOptimizingLogo(false);
      }
    }
  };

  const handleRestoreDefaultLogo = () => {
    saveLogoToStorage(DEFAULT_LOGO_SVG);
    if (onUpdateEmpresa) {
      onUpdateEmpresa({ ...empresa, logoUrl: DEFAULT_LOGO_SVG });
    }
    setLogoSaveNotice("¡Logo oficial restaurado y fijado!");
    setTimeout(() => setLogoSaveNotice(null), 4000);
  };

  const updateField = <K extends keyof ATSFormData>(field: K, value: ATSFormData[K]) => {
    onChangeFormData({ ...formData, [field]: value });
  };

  const handlePasoChange = (index: number, key: keyof ATSPaso, value: any) => {
    const updatedPasos = [...formData.pasos];
    updatedPasos[index] = { ...updatedPasos[index], [key]: value };
    updateField("pasos", updatedPasos);
  };

  const handleAddPaso = () => {
    const nextNum = formData.pasos.length + 1;
    const newPaso: ATSPaso = {
      id: `p-${Date.now()}`,
      numero: nextNum,
      paso: "",
      riesgo: "",
      controles: "",
      responsable: formData.trabajadores[0]?.nombre || "Técnico Ejecutor",
    };
    updateField("pasos", [...formData.pasos, newPaso]);
  };

  const handleRemovePaso = (index: number) => {
    if (formData.pasos.length <= 1) {
      return;
    }
    const updated = formData.pasos.filter((_, idx) => idx !== index);
    // Renumber
    const renumbered = updated.map((p, idx) => ({ ...p, numero: idx + 1 }));
    updateField("pasos", renumbered);
  };

  const toggleEpp = (eppId: string) => {
    const nextVal = !formData.eppsSeleccionados[eppId];
    let updatedCustom = formData.otrosEppsPersonalizados;
    if (eppId === "epp_otro" && formData.otrosEppsPersonalizados && formData.otrosEppsPersonalizados.length > 0) {
      updatedCustom = formData.otrosEppsPersonalizados.map((c) => ({
        ...c,
        seleccionado: nextVal,
      }));
    }
    onChangeFormData({
      ...formData,
      eppsSeleccionados: {
        ...formData.eppsSeleccionados,
        [eppId]: nextVal,
      },
      ...(updatedCustom !== undefined ? { otrosEppsPersonalizados: updatedCustom } : {}),
    });
  };

  const handleAddCustomEpp = (nameToAdd?: string) => {
    const rawName = (nameToAdd || newCustomEppName).trim();
    if (!rawName) return;

    const currentList: CustomEPPItem[] = formData.otrosEppsPersonalizados || [];
    const formattedName = rawName.toUpperCase();

    const existingIndex = currentList.findIndex(
      (c) => c.nombre.toUpperCase() === formattedName
    );

    let updatedList: CustomEPPItem[];
    if (existingIndex >= 0) {
      updatedList = currentList.map((c, idx) =>
        idx === existingIndex ? { ...c, seleccionado: true } : c
      );
    } else {
      const newItem: CustomEPPItem = {
        id: `custom_epp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nombre: formattedName,
        seleccionado: true,
      };
      updatedList = [...currentList, newItem];
    }

    onChangeFormData({
      ...formData,
      otrosEppsPersonalizados: updatedList,
      eppsSeleccionados: {
        ...formData.eppsSeleccionados,
        epp_otro: true,
      },
    });
    setNewCustomEppName("");
  };

  const handleToggleCustomEpp = (id: string) => {
    const currentList: CustomEPPItem[] = formData.otrosEppsPersonalizados || [];
    const updatedList = currentList.map((c) =>
      c.id === id ? { ...c, seleccionado: !c.seleccionado } : c
    );
    const hasAnyActive =
      updatedList.some((c) => c.seleccionado) || Boolean(formData.otroEppTexto?.trim());

    onChangeFormData({
      ...formData,
      otrosEppsPersonalizados: updatedList,
      eppsSeleccionados: {
        ...formData.eppsSeleccionados,
        epp_otro: hasAnyActive,
      },
    });
  };

  const handleRemoveCustomEpp = (id: string) => {
    const currentList: CustomEPPItem[] = formData.otrosEppsPersonalizados || [];
    const updatedList = currentList.filter((c) => c.id !== id);
    const hasAnyActive =
      updatedList.some((c) => c.seleccionado) || Boolean(formData.otroEppTexto?.trim());

    onChangeFormData({
      ...formData,
      otrosEppsPersonalizados: updatedList,
      eppsSeleccionados: {
        ...formData.eppsSeleccionados,
        epp_otro: hasAnyActive,
      },
    });
    if (editingCustomId === id) {
      setEditingCustomId(null);
      setEditingCustomText("");
    }
  };

  const handleStartEditCustomEpp = (item: CustomEPPItem) => {
    setEditingCustomId(item.id);
    setEditingCustomText(item.nombre);
  };

  const handleSaveEditCustomEpp = (id: string) => {
    const trimmed = editingCustomText.trim().toUpperCase();
    if (!trimmed) {
      handleRemoveCustomEpp(id);
      return;
    }
    const currentList: CustomEPPItem[] = formData.otrosEppsPersonalizados || [];
    const updatedList = currentList.map((c) =>
      c.id === id ? { ...c, nombre: trimmed } : c
    );
    updateField("otrosEppsPersonalizados", updatedList);
    setEditingCustomId(null);
    setEditingCustomText("");
  };

  const handleAreaCheck = (id: number, estado: "SI" | "NO" | "N.A.") => {
    const updated = formData.preparacionArea.map((item) =>
      item.id === id ? { ...item, estado } : item
    );
    updateField("preparacionArea", updated);
  };

  // Immediate specific task generator
  const triggerSpecificTaskAI = (
    taskText: string,
    heightText?: string,
    detailText?: string,
    typeText?: string
  ) => {
    const targetTask = taskText.trim();
    if (!targetTask) {
      return;
    }

    setQuickTaskInput(targetTask);
    setLastGeneratedName(targetTask);

    // No arrastrar restricciones viejas del ATS anterior: la IA deducirá tipoTrabajo, altura y detalle desde cero
    const updated = {
      ...formData,
      tareaGeneral: targetTask,
      alturaAproximada: heightText !== undefined ? heightText : "",
      detalleLabor: detailText !== undefined ? detailText : "",
      tipoTrabajo: typeText !== undefined ? typeText : "",
    };
    onChangeFormData(updated);

    onGenerateWithAI(targetTask, heightText, detailText, typeText);
    // Move to the 10-step matrix view so the user immediately sees the generated steps!
    setActiveSection("matriz");
  };

  type SectionKey = "cabecera" | "matriz" | "epp" | "area" | "firmas";

  const STEPS: Array<{
    id: SectionKey;
    num: number;
    title: string;
    shortTitle: string;
    isCompleted: boolean;
  }> = [
    {
      id: "cabecera",
      num: 1,
      title: "Datos Generales y Personal",
      shortTitle: "1. Datos",
      isCompleted: Boolean(
        formData.tareaGeneral?.trim() &&
        formData.tipoTrabajo?.trim() &&
        formData.alturaAproximada?.trim() &&
        formData.lugar?.trim() &&
        formData.trabajadores?.length > 0
      ),
    },
    {
      id: "matriz",
      num: 2,
      title: "Matriz ATS (10 Pasos con IA)",
      shortTitle: "2. Matriz",
      isCompleted: Boolean(
        formData.pasos?.length >= 5 &&
        formData.pasos?.some((p) => p.paso?.trim() && p.controles?.trim())
      ),
    },
    {
      id: "epp",
      num: 3,
      title: "Elementos de Protección Personal (EPP)",
      shortTitle: "3. EPP",
      isCompleted: Boolean(
        Object.values(formData.eppsSeleccionados || {}).some(Boolean) ||
        (formData.otrosEppsPersonalizados || []).some((c) => c.seleccionado) ||
        Boolean(formData.otroEppTexto?.trim())
      ),
    },
    {
      id: "area",
      num: 4,
      title: "Preparación del Área y Verificaciones",
      shortTitle: "4. Área",
      isCompleted: Boolean(
        formData.preparacionArea?.some((a) => a.estado === "SI" || a.estado === "N.A.")
      ),
    },
    {
      id: "firmas",
      num: 5,
      title: "Firmas Digitales en Pantalla",
      shortTitle: "5. Firmas",
      isCompleted: Boolean(
        Object.keys(formData.firmasTrabajadores || {}).length > 0 ||
        Boolean(formData.supervisor?.firmaUrl)
      ),
    },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeSection);
  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const completedStepsCount = STEPS.filter((s) => s.isCompleted).length;

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setActiveSection(STEPS[currentStepIndex - 1].id);
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setActiveSection(STEPS[currentStepIndex + 1].id);
      window.scrollTo({ top: 100, behavior: "smooth" });
    } else if (onViewPDF) {
      onViewPDF();
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* INDICADOR DE PROGRESO CON PASOS NUMERADOS (Reemplaza las pestañas de desplazamiento) */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs">
        {/* Cabecera del Indicador: Título del paso actual + Conteo de completados */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
              Paso {currentStep.num} de {STEPS.length}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {currentStep.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{completedStepsCount} de {STEPS.length} pasos completados</span>
            </span>
          </div>
        </div>

        {/* Barra de progreso visual animada */}
        <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-200 my-3">
          <div
            className="h-full bg-slate-900 transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Pasos numerados interactivos (1 a 5) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3 pt-1">
          {STEPS.map((step) => {
            const isCurrent = step.id === activeSection;
            const isDone = step.isCompleted;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveSection(step.id)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer select-none group text-center min-h-[48px] ${
                  isCurrent
                    ? "bg-slate-50 border-2 border-slate-900 shadow-2xs"
                    : "hover:bg-slate-50 border-2 border-transparent"
                }`}
                title={`Ir al Paso ${step.num}: ${step.title}`}
              >
                {/* Círculo del número del paso */}
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-base font-extrabold transition-all shrink-0 ${
                    isCurrent
                      ? "bg-slate-900 text-white ring-4 ring-slate-200 shadow-xs scale-105"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500 border-2 border-slate-300 group-hover:border-slate-400"
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <span>{step.num}</span>
                  )}
                </div>

                {/* Etiqueta del paso */}
                <span
                  className={`mt-1.5 text-xs font-bold truncate max-w-full ${
                    isCurrent
                      ? "text-slate-900"
                      : isDone
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  <span className="hidden sm:inline">{step.shortTitle}</span>
                  <span className="sm:hidden">{step.num}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: CABECERA & PERSONAL */}
      {activeSection === "cabecera" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Datos Generales y Cabecera del Permiso
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenCompanyModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors w-fit"
            >
              <Building className="w-3.5 h-3.5" />
              <span>Editar Logo, Empresa y Formato</span>
            </button>
          </div>



          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
                Fecha de Diligenciamiento <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <input
                type="date"
                value={formData.fechaDiligenciamiento}
                onChange={(e) => updateField("fechaDiligenciamiento", e.target.value)}
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
              {!formData.fechaDiligenciamiento && (
                <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Fecha requerida</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
                Hora de Inicio <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => updateField("hora", e.target.value)}
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
                Lugar / Ubicación del Trabajo <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <input
                type="text"
                value={formData.lugar}
                onChange={(e) => updateField("lugar", e.target.value)}
                placeholder="Ej. Planta Principal - Sector Fachada Bloque B"
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
              {!formData.lugar?.trim() && (
                <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Ubicación requerida para la validez del ATS</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
                Tipo de Trabajo <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <input
                type="text"
                value={formData.tipoTrabajo}
                onChange={(e) => updateField("tipoTrabajo", e.target.value)}
                placeholder="Ej. Trabajo en Alturas / Mantenimiento Eléctrico"
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
              {!formData.tipoTrabajo?.trim() && (
                <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Especifique el tipo de trabajo a desarrollar</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
                Altura Aproximada a Desarrollar la Actividad <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <input
                type="text"
                value={formData.alturaAproximada}
                onChange={(e) => updateField("alturaAproximada", e.target.value)}
                placeholder="Ej. 12 MTS (o 'N/A - Nivel de piso')"
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-extrabold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
              {!formData.alturaAproximada?.trim() && (
                <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Indique la altura aproximada o 'N/A - Nivel de piso'</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
              <label className="block text-sm sm:text-base font-bold text-slate-900">
                Tarea Específica / General <span className="text-red-600 font-bold text-base">*</span>
              </label>
              <span className="text-xs text-slate-600 font-semibold">
                La IA analiza este texto para elaborar los 10 pasos
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={formData.tareaGeneral}
                onChange={(e) => {
                  updateField("tareaGeneral", e.target.value);
                  setQuickTaskInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    triggerSpecificTaskAI(formData.tareaGeneral);
                  }
                }}
                placeholder="Ej. Mantenimiento e instalación de luminarias y reflectores en fachada a 12 metros de altura"
                className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => triggerSpecificTaskAI(formData.tareaGeneral)}
                disabled={isGeneratingAI || !formData.tareaGeneral.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] h-12 rounded-xl font-bold text-sm sm:text-base bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 shadow-sm transition-all shrink-0 disabled:opacity-50 cursor-pointer active:scale-98"
                title="Generar la matriz de 10 pasos en tiempo récord con IA"
              >
                <Sparkles className={`w-4 h-4 text-amber-400 ${isGeneratingAI ? "animate-spin" : ""}`} />
                <span>{isGeneratingAI ? "Generando..." : "Diligenciar con IA"}</span>
              </button>
            </div>
            {!formData.tareaGeneral?.trim() && (
              <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Escriba la labor específica para que el sistema analice los riesgos y controles.</span>
              </p>
            )}

            {/* Ejemplos para análisis rápido */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ejemplos rápidos:</span>
              {[
                { label: "Luminarias Fachada (12m)", task: "Mantenimiento e instalación de luminarias y reflectores en fachada a 12 metros de altura" },
                { label: "Pintura a Nivel de Piso", task: "Pintura y resane de muros interiores en oficinas a nivel de piso" },
                { label: "Cubiertas / Tejas", task: "Cambio y fijación de tejas rotas en cubierta de bodega" },
                { label: "Tableros Eléctricos", task: "Mantenimiento preventivo e inspección de tableros eléctricos en subestación a nivel de piso" },
                { label: "Aseo y Desinfección", task: "Aseo general, lavado de pisos y desinfección en bodega a nivel de piso" },
              ].map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => triggerSpecificTaskAI(preset.task)}
                  className="text-xs font-semibold bg-white hover:bg-slate-100 border-2 border-slate-300 hover:border-slate-800 text-slate-800 px-3 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* DETALLE OPERATIVO DE LA LABOR */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
              Detalle Operativo de la Labor (Deducido por la IA o editable)
            </label>
            <textarea
              rows={2}
              value={formData.detalleLabor}
              onChange={(e) => updateField("detalleLabor", e.target.value)}
              placeholder="Descripción técnica operativa y alcance deducido por la IA..."
              className="w-full min-h-[96px] text-base p-3.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none leading-relaxed"
            />
          </div>

          {/* VIGENCIA DEL PERMISO */}
          <div className="p-4 sm:p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Vigencia del Permiso de Trabajo Seguro
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">Fecha de Vigencia</label>
                <input
                  type="date"
                  value={formData.permisoValidoDesdeFecha}
                  onChange={(e) => updateField("permisoValidoDesdeFecha", e.target.value)}
                  className="w-full min-h-[48px] h-12 text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">Hora de Inicio (Desde)</label>
                <input
                  type="time"
                  value={formData.permisoValidoDesdeHora}
                  onChange={(e) => updateField("permisoValidoDesdeHora", e.target.value)}
                  className="w-full min-h-[48px] h-12 text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">Hora de Cierre (Hasta)</label>
                <input
                  type="time"
                  value={formData.permisoValidoHastaHora}
                  onChange={(e) => updateField("permisoValidoHastaHora", e.target.value)}
                  className="w-full min-h-[48px] h-12 text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-medium focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* COORDINADOR / SUPERVISOR SST (EMISOR DEL PERMISO) */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    Coordinador / Supervisor SST (Emisor del Permiso)
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Responsable de verificación previa, emisión y cierre (Res. 4272/2021)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {formData.supervisor.firmaUrl ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Firma Registrada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSignModal({
                        type: "supervisor",
                        name: formData.supervisor.nombre,
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-300 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
                  >
                    <PenTool className="w-4 h-4 text-slate-700" />
                    <span>Firmar como Coordinador</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                  Nombres y Apellidos del Coordinador SST <span className="text-red-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formData.supervisor.nombre}
                  onChange={(e) =>
                    updateField("supervisor", {
                      ...formData.supervisor,
                      nombre: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="NOMBRE DEL COORDINADOR SST"
                  className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold uppercase text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                  Cédula del Coordinador <span className="text-red-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formData.supervisor.cedula}
                  onChange={(e) =>
                    updateField("supervisor", {
                      ...formData.supervisor,
                      cedula: e.target.value,
                    })
                  }
                  placeholder="C.C. del Coordinador"
                  className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                  Cargo / Especialidad
                </label>
                <input
                  type="text"
                  value={formData.supervisor.cargo || ""}
                  onChange={(e) =>
                    updateField("supervisor", {
                      ...formData.supervisor,
                      cargo: e.target.value,
                    })
                  }
                  placeholder="Coordinador de Alturas / Supervisor SST"
                  className="w-full min-h-[48px] h-12 text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* PERMISO CONCEDIDO A LOS TRABAJADORES (CUADRILLA DE EJECUCIÓN) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  Permiso Concedido a los Trabajadores ({formData.trabajadores.length} ejecutores)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Cuadrilla autorizada para la labor. Toda modificación se sincroniza en el PDF oficial.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {staffList.filter((s) => !formData.trabajadores.some((w) => w.id === s.id)).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const missing = staffList.filter((s) => !formData.trabajadores.some((w) => w.id === s.id));
                      updateField("trabajadores", [...formData.trabajadores, ...missing]);
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Incluir a todos los trabajadores registrados en el directorio"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Incluir Toda la Nómina ({staffList.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const newWorker: PersonalMember = {
                      id: "p_" + Date.now(),
                      nombre: "",
                      cedula: "",
                      cargo: "Técnico Especialista en Alturas",
                      arl: "SURA ARL",
                      rol: "trabajador",
                    };
                    updateField("trabajadores", [...formData.trabajadores, newWorker]);
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Trabajador</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenStaffModal}
                  className="inline-flex items-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-700" />
                  <span>Directorio ({staffList.length})</span>
                </button>
              </div>
            </div>

            {/* VISTA MÓVIL: TARJETAS GRANDES CON CAMPOS DE ALTO CONTRASTE */}
            <div className="sm:hidden space-y-3">
              {formData.trabajadores.map((worker, index) => (
                <div
                  key={worker.id || index}
                  className="p-4 rounded-2xl border-2 border-slate-300 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Ejecutor #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateField("supervisor", {
                            ...formData.supervisor,
                            nombre: worker.nombre,
                            cedula: worker.cedula,
                            cargo: worker.cargo.includes("SST")
                              ? worker.cargo
                              : `Coordinador SST / ${worker.cargo}`,
                          });
                        }}
                        className="p-2 text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg border border-slate-300 transition-colors"
                        title="Asignar como Coordinador SST"
                      >
                        <Award className="w-4 h-4 text-emerald-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.trabajadores.length <= 1) return;
                          const updated = formData.trabajadores.filter((_, i) => i !== index);
                          updateField("trabajadores", updated);
                        }}
                        className="p-2 text-slate-500 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg border border-slate-300 transition-colors"
                        title="Eliminar de la cuadrilla"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nombres y Apellidos <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={worker.nombre}
                      onChange={(e) => {
                        const updated = [...formData.trabajadores];
                        updated[index] = { ...updated[index], nombre: e.target.value.toUpperCase() };
                        updateField("trabajadores", updated);
                      }}
                      placeholder="NOMBRES COMPLETOS"
                      className="w-full min-h-[48px] text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold uppercase text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Cédula <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={worker.cedula}
                        onChange={(e) => {
                          const updated = [...formData.trabajadores];
                          updated[index] = { ...updated[index], cedula: e.target.value };
                          updateField("trabajadores", updated);
                        }}
                        placeholder="C.C."
                        className="w-full min-h-[48px] text-base px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        ARL
                      </label>
                      <input
                        type="text"
                        value={worker.arl}
                        onChange={(e) => {
                          const updated = [...formData.trabajadores];
                          updated[index] = { ...updated[index], arl: e.target.value };
                          updateField("trabajadores", updated);
                        }}
                        placeholder="ARL"
                        className="w-full min-h-[48px] text-base px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-emerald-800 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cargo / Especialidad
                    </label>
                    <input
                      type="text"
                      value={worker.cargo}
                      onChange={(e) => {
                        const updated = [...formData.trabajadores];
                        updated[index] = { ...updated[index], cargo: e.target.value };
                        updateField("trabajadores", updated);
                      }}
                      placeholder="Cargo o labor"
                      className="w-full min-h-[48px] text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA ESCRITORIO / TABLET: TABLA CON ENTRADAS AMPLIAS */}
            <div className="hidden sm:block border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-300">
                    <tr>
                      <th className="p-3 w-[32%]">NOMBRES Y APELLIDOS</th>
                      <th className="p-3 w-[20%]">CÉDULA</th>
                      <th className="p-3 w-[24%]">CARGO</th>
                      <th className="p-3 w-[14%]">ARL</th>
                      <th className="p-3 w-[10%] text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.trabajadores.map((worker, index) => (
                      <tr key={worker.id || index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={worker.nombre}
                            onChange={(e) => {
                              const updated = [...formData.trabajadores];
                              updated[index] = { ...updated[index], nombre: e.target.value.toUpperCase() };
                              updateField("trabajadores", updated);
                            }}
                            placeholder="NOMBRES COMPLETOS"
                            className="w-full min-h-[44px] text-sm font-bold uppercase px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={worker.cedula}
                            onChange={(e) => {
                              const updated = [...formData.trabajadores];
                              updated[index] = { ...updated[index], cedula: e.target.value };
                              updateField("trabajadores", updated);
                            }}
                            placeholder="Cédula"
                            className="w-full min-h-[44px] text-sm font-semibold px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={worker.cargo}
                            onChange={(e) => {
                              const updated = [...formData.trabajadores];
                              updated[index] = { ...updated[index], cargo: e.target.value };
                              updateField("trabajadores", updated);
                            }}
                            placeholder="Cargo o rol"
                            className="w-full min-h-[44px] text-sm font-medium px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={worker.arl}
                            onChange={(e) => {
                              const updated = [...formData.trabajadores];
                              updated[index] = { ...updated[index], arl: e.target.value };
                              updateField("trabajadores", updated);
                            }}
                            placeholder="ARL"
                            className="w-full min-h-[44px] text-sm font-bold text-emerald-800 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white focus:border-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                updateField("supervisor", {
                                  ...formData.supervisor,
                                  nombre: worker.nombre,
                                  cedula: worker.cedula,
                                  cargo: worker.cargo.includes("SST")
                                    ? worker.cargo
                                    : `Coordinador SST / ${worker.cargo}`,
                                });
                              }}
                              className="p-2 text-slate-700 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-slate-200 transition-colors"
                              title="Asignar a este trabajador como Coordinador SST"
                            >
                              <Award className="w-4 h-4 text-emerald-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.trabajadores.length <= 1) return;
                                const updated = formData.trabajadores.filter((_, i) => i !== index);
                                updateField("trabajadores", updated);
                              }}
                              className="p-2 text-slate-500 hover:text-red-700 rounded-lg hover:bg-red-50 border border-slate-200 transition-colors"
                              title="Eliminar de este ATS"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick staff addition row */}
              {staffList.filter((s) => !formData.trabajadores.some((w) => w.id === s.id)).length > 0 && (
                <div className="bg-slate-50 border-t-2 border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">
                      + Añadir de la nómina registrada:
                    </span>
                    {staffList
                      .filter((s) => !formData.trabajadores.some((w) => w.id === s.id))
                      .map((unselected) => (
                        <button
                          key={unselected.id}
                          type="button"
                          onClick={() => {
                            updateField("trabajadores", [...formData.trabajadores, unselected]);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 border-2 border-slate-300 text-slate-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-700" />
                          <span>{unselected.nombre.split(" ")[0]}</span>
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const missing = staffList.filter((s) => !formData.trabajadores.some((w) => w.id === s.id));
                      updateField("trabajadores", [...formData.trabajadores, ...missing]);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Añadir a todos los {staffList.filter((s) => !formData.trabajadores.some((w) => w.id === s.id)).length} pendientes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MATRIZ ATS (10 PASOS) */}
      {activeSection === "matriz" && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                Matriz de Análisis de Trabajo Seguro (ATS)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Paso a paso, riesgos asociados, controles preventivos y personal responsable asignado
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => triggerSpecificTaskAI(formData.tareaGeneral)}
                disabled={isGeneratingAI || !formData.tareaGeneral}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs sm:text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                title="Regenerar la matriz de 10 pasos en tiempo récord con IA"
              >
                <Sparkles className={`w-4 h-4 text-amber-400 ${isGeneratingAI ? "animate-spin" : ""}`} />
                <span>{isGeneratingAI ? "Generando al instante..." : "Regenerar con IA"}</span>
              </button>
              <button
                type="button"
                onClick={handleAddPaso}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Paso</span>
              </button>
            </div>
          </div>

          {/* Current Task Feedback Banner */}
          <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-slate-800">
              <span className="font-extrabold text-slate-900">Labor Evaluada: </span>
              <span className="font-medium">
                {formData.tareaGeneral || "Sin definir"}
              </span>
              <span className="text-slate-600 font-semibold ml-2">({formData.alturaAproximada || "Altura no especificada"})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                ✓ {formData.pasos.length} Pasos Registrados
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {formData.pasos.map((paso, index) => (
              <div
                key={paso.id || index}
                className="p-4 sm:p-5 rounded-2xl border-2 border-slate-300 bg-white hover:border-slate-900 shadow-2xs transition-all space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-100 border border-slate-300 px-3 py-1 rounded-lg w-fit">
                    <span>Paso {index + 1} de {formData.pasos.length}</span>
                  </span>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Worker assigner dropdown */}
                    <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                      <span className="text-xs font-bold text-slate-700 hidden sm:inline">
                        Responsable:
                      </span>
                      <select
                        value={paso.responsable}
                        onChange={(e) => handlePasoChange(index, "responsable", e.target.value)}
                        className="w-full sm:w-auto min-h-[44px] text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
                      >
                        <option value="">Seleccionar responsable...</option>
                        {formData.trabajadores.map((w) => (
                          <option key={w.id} value={`${w.nombre}`}>
                            {w.nombre} ({w.cargo})
                          </option>
                        ))}
                        <option value={formData.supervisor.nombre}>
                          {formData.supervisor.nombre} (Supervisor SST)
                        </option>
                        <option value="Todo el Equipo Ejecutor">Todo el Equipo Ejecutor</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePaso(index)}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-red-700 rounded-xl hover:bg-red-50 border-2 border-transparent hover:border-red-200 transition-colors"
                      title="Eliminar este paso"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Step Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 uppercase">
                      Procedimiento / Secuencia de Pasos <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={paso.paso}
                      onChange={(e) => handlePasoChange(index, "paso", e.target.value)}
                      placeholder="Describa el paso técnico a realizar..."
                      className="w-full min-h-[96px] text-base p-3.5 rounded-xl border-2 border-slate-300 bg-white focus:border-slate-900 focus:outline-none leading-relaxed font-medium text-slate-900"
                    />
                  </div>

                  {/* Associated Risk */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-amber-900 uppercase">
                      Riesgo Asociado al Paso
                    </label>
                    <textarea
                      rows={3}
                      value={paso.riesgo}
                      onChange={(e) => handlePasoChange(index, "riesgo", e.target.value)}
                      placeholder="Identifique caídas, golpes, atrapamientos, etc..."
                      className="w-full min-h-[96px] text-base p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50/40 focus:border-amber-600 focus:outline-none leading-relaxed text-amber-950 font-medium"
                    />
                  </div>

                  {/* Controls */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-emerald-900 uppercase">
                      Controles Requeridos (Preventivos / Protectivos)
                    </label>
                    <textarea
                      rows={3}
                      value={paso.controles}
                      onChange={(e) => handlePasoChange(index, "controles", e.target.value)}
                      placeholder="Medidas concretas de control y prevención..."
                      className="w-full min-h-[96px] text-base p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 focus:border-emerald-600 focus:outline-none leading-relaxed text-emerald-950 font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: EPP & CAIDAS */}
      {activeSection === "epp" && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                Elementos de Protección Personal (EPP) y Sistemas contra Caídas
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Marque con 'X' los elementos de dotación obligatorios para los trabajadores durante la labor
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {Object.values(formData.eppsSeleccionados || {}).filter(Boolean).length +
                    (formData.otrosEppsPersonalizados || []).filter((c) => c.seleccionado).length}{" "}
                  elementos marcados
                </span>
              </span>
            </div>
          </div>

          {/* CUADRICULA DE ELEMENTOS EPP REGLAMENTARIOS */}
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-700" />
              <span>Elementos Reglamentarios F-SST-045</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {EPP_ITEMS.map((item) => {
                const isChecked = formData.eppsSeleccionados[item.id] || false;
                const isOtro = item.id === "epp_otro";
                const customActiveCount = (formData.otrosEppsPersonalizados || []).filter(
                  (c) => c.seleccionado
                ).length;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleEpp(item.id)}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer select-none transition-all min-h-[56px] ${
                      isChecked
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 pr-2 min-w-0">
                      <span className="text-sm sm:text-base font-bold truncate">
                        {item.nombre}
                      </span>
                      {isOtro && customActiveCount > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                            isChecked
                              ? "bg-amber-400 text-slate-900"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {customActiveCount}
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-amber-400 border-amber-400 text-slate-900 font-black text-sm"
                          : "border-slate-400 bg-white"
                      }`}
                    >
                      {isChecked && <span>X</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN AVANZADA: OTROS ELEMENTOS PERSONALIZADOS CON ETIQUETAS PROPIAS */}
          <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Tag className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    Agregar Otros Elementos y Equipos con Etiquetas Propias
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Agregue todos los tipos de elementos adicionales que requiera la labor. Cada uno tendrá su propia tarjeta con casilla [X] para marcarlo o desmarcarlo.
                  </p>
                </div>
              </div>
            </div>

            {/* BARRA DE ENTRADA RÁPIDA: AGREGAR ELEMENTO */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCustomEpp();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newCustomEppName}
                  onChange={(e) => setNewCustomEppName(e.target.value)}
                  placeholder="Escriba el nombre del nuevo elemento (Ej: Careta para soldar, Guantes dieléctricos 10kV...)"
                  className="w-full min-h-[48px] text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-900 focus:border-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
              <button
                type="submit"
                disabled={!newCustomEppName.trim()}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] h-12 px-6 rounded-xl font-extrabold text-sm sm:text-base bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 shadow-sm transition-all disabled:opacity-40 cursor-pointer active:scale-98 shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ Agregar Elemento</span>
              </button>
            </form>

            {/* SUGERENCIAS RÁPIDAS PARA AGREGAR CON 1 CLIC */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Sugerencias rápidas para agregar en un toque:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  "Careta para soldar",
                  "Monogafas químicas",
                  "Guantes dieléctricos 10kV",
                  "Traje químico Tyvek",
                  "Detector multigas (4 gases)",
                  "Mascarilla con filtros vapores",
                  "Delantal de carnaza",
                  "Polainas para soldadura",
                  "Protector facial esmeril",
                  "Arnés dieléctrico",
                  "Chaleco reflectivo",
                  "Protector auditivo tipo copa",
                  "Línea de vida autorretráctil 15m",
                  "Equipo de respiración autónoma (ERA)",
                ].map((sug, sIdx) => {
                  const isAlreadyAdded = (formData.otrosEppsPersonalizados || []).some(
                    (c) => c.nombre.toUpperCase() === sug.toUpperCase()
                  );
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleAddCustomEpp(sug)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                        isAlreadyAdded
                          ? "bg-slate-200 border-slate-300 text-slate-600 opacity-60"
                          : "bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-800 text-slate-800 shadow-2xs active:scale-98"
                      }`}
                    >
                      + {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LISTADO DE ELEMENTOS ADICIONALES REGISTRADOS */}
            {(formData.otrosEppsPersonalizados || []).length > 0 ? (
              <div className="space-y-2.5 pt-3 border-t-2 border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Otros Elementos Agregados ({(formData.otrosEppsPersonalizados || []).length}):
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    Haga clic sobre cualquier tarjeta para marcarla con [X] o desmarcarla
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(formData.otrosEppsPersonalizados || []).map((customItem) => {
                    const isChecked = customItem.seleccionado;
                    const isEditing = editingCustomId === customItem.id;

                    if (isEditing) {
                      return (
                        <div
                          key={customItem.id}
                          className="p-3 rounded-xl border-2 border-slate-900 bg-white shadow-xs flex items-center gap-2 min-h-[56px]"
                        >
                          <input
                            type="text"
                            value={editingCustomText}
                            onChange={(e) => setEditingCustomText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEditCustomEpp(customItem.id);
                              } else if (e.key === "Escape") {
                                setEditingCustomId(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 text-sm font-bold uppercase px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditCustomEpp(customItem.id)}
                            className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title="Guardar nombre"
                          >
                            <Check className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCustomId(null)}
                            className="p-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={customItem.id}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer select-none transition-all min-h-[56px] group ${
                          isChecked
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
                        }`}
                        onClick={() => handleToggleCustomEpp(customItem.id)}
                      >
                        <div className="flex items-center gap-2 pr-2 min-w-0">
                          <span className="text-sm sm:text-base font-bold uppercase truncate">
                            {customItem.nombre}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Botón para editar / renombrar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCustomEpp(customItem);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isChecked
                                ? "text-slate-300 hover:text-white hover:bg-slate-800"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                            title="Editar / renombrar etiqueta"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Botón para eliminar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomEpp(customItem.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isChecked
                                ? "text-red-300 hover:text-red-100 hover:bg-red-900/40"
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title="Eliminar este elemento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Checkbox táctil */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCustomEpp(customItem.id);
                            }}
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ml-1 cursor-pointer ${
                              isChecked
                                ? "bg-amber-400 border-amber-400 text-slate-900 font-black text-sm"
                                : "border-slate-400 bg-white"
                            }`}
                          >
                            {isChecked && <span>X</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Aún no ha agregado elementos adicionales. Escriba un nombre arriba o use las sugerencias rápidas para añadir otros EPP a este ATS.
              </div>
            )}

            {/* VISTA PREVIA DEL TEXTO UNIFICADO PARA EL PDF */}
            <div className="p-3.5 bg-slate-100 rounded-xl border-2 border-slate-300 text-xs sm:text-sm text-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-slate-900 block uppercase text-xs">
                  Reflejo Oficial en Formato PDF (Fila "OTRO(S):"):
                </span>
                <span className="font-semibold text-slate-700 italic break-words">
                  {[
                    ...(formData.otrosEppsPersonalizados || [])
                      .filter((c) => c.seleccionado)
                      .map((c) => c.nombre.trim())
                      .filter(Boolean),
                    ...(formData.otroEppTexto ? [formData.otroEppTexto.trim()] : []),
                  ].join(", ") || "Ningún elemento adicional marcado actualmente."}
                </span>
              </div>
            </div>

            {/* ESPECIFICACIONES O NOTAS ADICIONALES */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Observaciones o especificaciones adicionales para los Otros EPP:
              </label>
              <input
                type="text"
                value={formData.otroEppTexto}
                onChange={(e) => {
                  updateField("otroEppTexto", e.target.value);
                  if (e.target.value.trim()) {
                    updateField("eppsSeleccionados", {
                      ...formData.eppsSeleccionados,
                      epp_otro: true,
                    });
                  }
                }}
                placeholder="Notas adicionales (Ej: Calibre dieléctrico clase 2, filtros tipo P100, arnés con 4 argollas...)"
                className="w-full min-h-[48px] text-base px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PREPARACIÓN DEL ÁREA */}
      {activeSection === "area" && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
              Preparación del Área (Marque con X)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Verificaciones de seguridad normativas previas al inicio de labores
            </p>
          </div>

          <div className="space-y-3">
            {formData.preparacionArea.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border-2 border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {item.descripcion}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-300 self-stretch sm:self-auto justify-center">
                  {(["SI", "NO", "N.A."] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAreaCheck(item.id, opt)}
                      className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 text-sm sm:text-base font-extrabold rounded-lg transition-all cursor-pointer ${
                        item.estado === opt
                          ? opt === "SI"
                            ? "bg-emerald-700 text-white shadow-xs"
                            : opt === "NO"
                            ? "bg-red-700 text-white shadow-xs"
                            : "bg-slate-800 text-white shadow-xs"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* OBSERVACIONES FIELD */}
          <div className="pt-2 space-y-1.5">
            <label className="block text-sm sm:text-base font-bold text-slate-900 uppercase">
              Observaciones Adicionales y Condiciones Especiales
            </label>
            <textarea
              rows={3}
              value={formData.observaciones}
              onChange={(e) => updateField("observaciones", e.target.value)}
              placeholder="Escriba condiciones del sitio, disponibilidad de botiquín, plan de rescate, condiciones meteorológicas..."
              className="w-full min-h-[96px] text-base p-3.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SECTION 5: FIRMAS DIGITALES */}
      {activeSection === "firmas" && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide">
              Firmas Digitales Táctiles en Pantalla
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Cada trabajador y el supervisor deben firmar 100% digitalmente en la pantalla antes de iniciar la labor
            </p>
          </div>

          {/* TRABAJADORES EJECUTORES */}
          <div className="space-y-4">
            <div className="bg-slate-100 p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-snug border-2 border-slate-300 font-medium">
              <strong className="text-slate-900 font-extrabold">Compromiso Legal Ejecutores:</strong> "HE SOCIALIZADO EL ANÁLISIS DE RIESGOS, COMPRENDO LAS PRECAUCIONES QUE DEBEN SER TOMADAS Y ME COMPROMETO A DESARROLLAR EL TRABAJO CUMPLIENDO LAS MEDIDAS DE SEGURIDAD ESTABLECIDAS..."
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.trabajadores.map((worker) => {
                const firma = formData.firmasTrabajadores[worker.id];
                return (
                  <div
                    key={worker.id}
                    className="border-2 border-slate-300 rounded-2xl p-4 bg-white flex flex-col justify-between gap-3.5 shadow-2xs"
                  >
                    <div>
                      <span className="text-xs uppercase font-extrabold text-slate-500">Ejecutor Autorizado</span>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 uppercase">{worker.nombre}</h4>
                      <p className="text-xs sm:text-sm text-slate-600 font-semibold">CC: {worker.cedula} · {worker.cargo}</p>
                    </div>

                    <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden relative">
                      {firma ? (
                        <img
                          src={firma}
                          alt="Firma digital"
                          className="max-h-24 max-w-full object-contain p-1"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400 text-xs sm:text-sm font-semibold">
                          <PenTool className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <span>Pendiente de firma en pantalla</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSignModal({
                            type: "worker",
                            id: worker.id,
                            name: worker.nombre,
                          })
                        }
                        className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] text-sm sm:text-base font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
                          firma
                            ? "bg-slate-100 text-slate-900 border-2 border-slate-300 hover:bg-slate-200"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                        }`}
                      >
                        <PenTool className="w-4 h-4" />
                        <span>{firma ? "Cambiar Firma" : "Firmar en Pantalla"}</span>
                      </button>

                      {firma && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Está seguro de eliminar esta firma?")) {
                              const newFirmas = { ...formData.firmasTrabajadores };
                              delete newFirmas[worker.id];
                              updateField("firmasTrabajadores", newFirmas);
                            }
                          }}
                          className="min-h-[48px] min-w-[48px] flex items-center justify-center border-2 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-xl transition-colors shrink-0"
                          title="Eliminar Firma"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SUPERVISOR / EMISOR */}
          <div className="pt-4 border-t-2 border-slate-200 space-y-4">
            <div className="bg-slate-100 p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-snug border-2 border-slate-300 font-medium">
              <strong className="text-slate-900 font-extrabold">Compromiso Legal Emisor:</strong> "PERSONALMENTE HE VERIFICADO LA PREPARACIÓN DE LOS EQUIPOS Y/O ÁREA PARA EL TRABAJO Y LO CONSIDERO SEGURO PARA PROCEDER CON SU EJECUCIÓN..."
            </div>

            <div className="border-2 border-slate-300 rounded-2xl p-5 bg-white grid grid-cols-1 sm:grid-cols-2 gap-5 items-center shadow-xs">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-900" />
                  <span className="text-sm uppercase font-extrabold text-slate-900 tracking-wide">
                    Coordinador / Supervisor SST (Emisor del Permiso)
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    Nombres y Apellidos del Coordinador SST <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.supervisor.nombre}
                    onChange={(e) =>
                      updateField("supervisor", {
                        ...formData.supervisor,
                        nombre: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full min-h-[48px] text-base px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-extrabold uppercase text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                      Cédula del Coordinador <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.supervisor.cedula}
                      onChange={(e) =>
                        updateField("supervisor", {
                          ...formData.supervisor,
                          cedula: e.target.value,
                        })
                      }
                      className="w-full min-h-[48px] text-base px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                      Cargo / Especialidad
                    </label>
                    <input
                      type="text"
                      value={formData.supervisor.cargo || ""}
                      onChange={(e) =>
                        updateField("supervisor", {
                          ...formData.supervisor,
                          cargo: e.target.value,
                        })
                      }
                      placeholder="Coordinador SST"
                      className="w-full min-h-[48px] text-base px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick select from staff */}
                <div className="pt-1 text-xs text-slate-700">
                  <span className="font-bold text-slate-800 block mb-1">Asignar desde nómina:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {staffList.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          updateField("supervisor", {
                            ...formData.supervisor,
                            nombre: st.nombre,
                            cedula: st.cedula,
                            cargo: st.cargo.includes("SST") ? st.cargo : `Coordinador SST / ${st.cargo}`,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors text-xs font-semibold"
                      >
                        {st.nombre.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                  {formData.supervisor.firmaUrl ? (
                    <img
                      src={formData.supervisor.firmaUrl}
                      alt="Firma supervisor"
                      className="max-h-32 max-w-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400 text-xs sm:text-sm font-semibold">
                      <PenTool className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span>Firma del coordinador SST pendiente</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSignModal({
                        type: "supervisor",
                        name: formData.supervisor.nombre,
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] text-sm sm:text-base font-extrabold py-2.5 px-4 rounded-xl text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>
                      {formData.supervisor.firmaUrl
                        ? "Actualizar Firma del Coordinador"
                        : "Firmar como Coordinador SST"}
                    </span>
                  </button>

                  {formData.supervisor.firmaUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("¿Está seguro de eliminar esta firma?")) {
                          updateField("supervisor", {
                            ...formData.supervisor,
                            firmaUrl: "",
                          });
                        }
                      }}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center border-2 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-xl transition-colors shrink-0"
                      title="Eliminar Firma"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EXPORT & COMPLETION BANNER */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-slate-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
              Formato ATS Listo para Generar en PDF
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Incluye cabecera, los 10 pasos con IA, personal asignado, EPPs reglamentarios y firmas táctiles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {onViewPDF && (
            <button
              type="button"
              onClick={onViewPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[48px] text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-300 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Formato PDF (1:1)</span>
            </button>
          )}
          {onEmailPDF && (
            <button
              type="button"
              onClick={onEmailPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[48px] text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              title="Enviar el PDF oficial por correo electrónico"
            >
              <Mail className="w-4 h-4 text-slate-700" />
              <span>Enviar al Correo</span>
            </button>
          )}
          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              disabled={isExportingPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[48px] text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPDF ? "Generando PDF..." : "Descargar en PDF"}</span>
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN FIJA INFERIOR (ANTERIOR / SIGUIENTE) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-slate-300 px-3 sm:px-6 py-2.5 sm:py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[48px] h-12 px-3.5 sm:px-6 rounded-xl text-sm sm:text-base font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 disabled:opacity-35 disabled:cursor-not-allowed transition-all active:scale-98 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Anterior</span>
          </button>

          <div className="text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase block tracking-wider">
              Paso {currentStep.num} de {STEPS.length}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[130px] sm:max-w-none block">
              {currentStep.shortTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={goToNextStep}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[48px] h-12 px-4 sm:px-7 rounded-xl text-sm sm:text-base font-extrabold text-white bg-slate-900 hover:bg-slate-800 border-2 border-slate-900 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <span>{currentStepIndex === STEPS.length - 1 ? "Ver Formato PDF" : "Siguiente"}</span>
            {currentStepIndex === STEPS.length - 1 ? (
              <Eye className="w-5 h-5 text-amber-400" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
