import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Users,
  Check,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Save,
  Award,
  PenTool,
  Eraser,
  AlertCircle,
} from "lucide-react";
import { PersonalMember } from "../types";
import { SignatureModal } from "./SignatureModal";

interface SupervisorData {
  nombre: string;
  cedula: string;
  cargo?: string;
  firmaUrl: string;
}

interface PersonalManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: PersonalMember[];
  onUpdateStaffList: (updatedList: PersonalMember[]) => void;
  activeWorkers: PersonalMember[];
  onToggleActiveWorker: (member: PersonalMember) => void;
  supervisor?: SupervisorData;
  onUpdateSupervisor?: (supervisor: SupervisorData) => void;
  onUpdateActiveWorkers?: (workers: PersonalMember[]) => void;
  activeWorkerSignatures?: Record<string, string>;
  onSaveWorkerSignature?: (workerId: string, signatureDataUrl: string) => void;
}

export const PersonalManagerModal: React.FC<PersonalManagerModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onUpdateStaffList,
  activeWorkers,
  onToggleActiveWorker,
  supervisor,
  onUpdateSupervisor,
  onUpdateActiveWorkers,
  activeWorkerSignatures,
  onSaveWorkerSignature,
}) => {
  const [activeTab, setActiveTab] = useState<"cuadrilla" | "coordinador">("cuadrilla");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Modal de firma digital integrado en Gestión de Personal
  const [signaturePrompt, setSignaturePrompt] = useState<{
    mode: "form" | "member";
    memberId?: string;
    name: string;
    initialSignature?: string;
    isCoordinator?: boolean;
  } | null>(null);

  // Form fields for workers
  const [workerFormData, setWorkerFormData] = useState<Omit<PersonalMember, "id">>({
    nombre: "",
    cedula: "",
    cargo: "",
    arl: "SURA ARL",
    rol: "trabajador",
    firmaUrl: "",
  });

  // Supervisor form fields
  const [supervisorForm, setSupervisorForm] = useState<SupervisorData>({
    nombre: supervisor?.nombre || "",
    cedula: supervisor?.cedula || "",
    cargo: supervisor?.cargo || "Coordinador / Supervisor SST",
    firmaUrl: supervisor?.firmaUrl || "",
  });

  const [savedSupervisorSuccess, setSavedSupervisorSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const inlineEditRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (supervisor) {
      setSupervisorForm({
        nombre: supervisor.nombre,
        cedula: supervisor.cedula,
        cargo: supervisor.cargo || "Coordinador / Supervisor SST",
        firmaUrl: supervisor.firmaUrl || "",
      });
    }
  }, [supervisor]);

  useEffect(() => {
    if (editingId && inlineEditRef.current) {
      setTimeout(() => {
        inlineEditRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [editingId]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setFormError(null);
    setIsAddingNew(true);
    setEditingId(null);
    setWorkerFormData({
      nombre: "",
      cedula: "",
      cargo: "Técnico Especialista en Alturas",
      arl: "SURA ARL",
      rol: "trabajador",
      firmaUrl: "",
    });
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const handleStartEdit = (member: PersonalMember) => {
    setFormError(null);
    if (editingId === member.id) {
      setEditingId(null);
      return;
    }
    setEditingId(member.id);
    setIsAddingNew(false);
    setWorkerFormData({
      nombre: member.nombre,
      cedula: member.cedula,
      cargo: member.cargo,
      arl: member.arl,
      rol: member.rol || "trabajador",
      firmaUrl: member.firmaUrl || activeWorkerSignatures?.[member.id] || "",
    });
  };

  const handleSaveWorker = (forceCoordinatorRole = false): boolean => {
    if (!workerFormData.nombre.trim() || !workerFormData.cedula.trim()) {
      setFormError("Por favor ingrese el nombre completo y el número de cédula.");
      return false;
    }
    setFormError(null);

    const normalizedData: Omit<PersonalMember, "id"> = {
      ...workerFormData,
      nombre: workerFormData.nombre.trim().toUpperCase(),
      cedula: workerFormData.cedula.trim(),
      cargo: workerFormData.cargo.trim() || (forceCoordinatorRole ? "Coordinador SST" : "Técnico Ejecutor"),
      arl: workerFormData.arl.trim() || "SURA ARL",
      rol: forceCoordinatorRole ? "coordinador_sst" : workerFormData.rol || "trabajador",
    };

    if (isAddingNew) {
      const newMember: PersonalMember = {
        id: "p_" + Date.now(),
        ...normalizedData,
      };
      const updated = [...staffList, newMember];
      onUpdateStaffList(updated);

      if (!forceCoordinatorRole && onUpdateActiveWorkers) {
        onUpdateActiveWorkers([...activeWorkers, newMember]);
      }
      if (onSaveWorkerSignature && newMember.firmaUrl) {
        onSaveWorkerSignature(newMember.id, newMember.firmaUrl);
      }
      setIsAddingNew(false);
      return true;
    } else if (editingId) {
      const oldMember = staffList.find((s) => s.id === editingId);
      const updatedList = staffList.map((item) =>
        item.id === editingId ? { ...item, ...normalizedData } : item
      );
      onUpdateStaffList(updatedList);

      // Sincronizar con trabajadores activos en el ATS
      if (onUpdateActiveWorkers) {
        const isCurrentlyActive = activeWorkers.some((item) => item.id === editingId);
        if (isCurrentlyActive) {
          const updatedActive = activeWorkers.map((item) =>
            item.id === editingId ? { ...item, ...normalizedData } : item
          );
          onUpdateActiveWorkers(updatedActive);
        } else if (!forceCoordinatorRole) {
          onUpdateActiveWorkers([...activeWorkers, { ...normalizedData, id: editingId }]);
        }
      }

      if (onSaveWorkerSignature && normalizedData.firmaUrl !== undefined) {
        onSaveWorkerSignature(editingId, normalizedData.firmaUrl);
      }

      // Si este miembro es el coordinador SST actual, actualizarlo también
      if (
        onUpdateSupervisor &&
        supervisor &&
        oldMember &&
        (supervisor.cedula.trim() === oldMember.cedula.trim() ||
          supervisor.nombre.trim() === oldMember.nombre.trim())
      ) {
        onUpdateSupervisor({
          ...supervisor,
          nombre: normalizedData.nombre,
          cedula: normalizedData.cedula,
          cargo: normalizedData.cargo || supervisor.cargo,
          firmaUrl: normalizedData.firmaUrl !== undefined ? normalizedData.firmaUrl : supervisor.firmaUrl,
        });
      }

      setEditingId(null);
      return true;
    }
    return false;
  };

  const handleSaveSignatureFromModal = (dataUrl: string) => {
    if (!signaturePrompt) return;

    if (signaturePrompt.mode === "form") {
      setWorkerFormData((prev) => ({ ...prev, firmaUrl: dataUrl }));
    } else if (signaturePrompt.mode === "member" && signaturePrompt.memberId) {
      const targetId = signaturePrompt.memberId;
      const targetMember = staffList.find((s) => s.id === targetId);

      const updatedList = staffList.map((item) =>
        item.id === targetId ? { ...item, firmaUrl: dataUrl } : item
      );
      onUpdateStaffList(updatedList);

      if (onUpdateActiveWorkers) {
        const isCurrentlyActive = activeWorkers.some((item) => item.id === targetId);
        if (isCurrentlyActive) {
          onUpdateActiveWorkers(
            activeWorkers.map((item) =>
              item.id === targetId ? { ...item, firmaUrl: dataUrl } : item
            )
          );
        }
      }

      if (onSaveWorkerSignature) {
        onSaveWorkerSignature(targetId, dataUrl);
      }

      if (
        onUpdateSupervisor &&
        supervisor &&
        targetMember &&
        (supervisor.cedula.trim() === targetMember.cedula.trim() ||
          supervisor.nombre.trim() === targetMember.nombre.trim())
      ) {
        onUpdateSupervisor({
          ...supervisor,
          firmaUrl: dataUrl,
        });
      }
    }

    setSignaturePrompt(null);
  };

  const handleDeleteWorker = (id: string) => {
    const updated = staffList.filter((item) => item.id !== id);
    onUpdateStaffList(updated);

    if (onUpdateActiveWorkers) {
      onUpdateActiveWorkers(activeWorkers.filter((item) => item.id !== id));
    }
  };

  const handleSetAsCoordinator = (member: PersonalMember) => {
    const newSupervisor: SupervisorData = {
      nombre: member.nombre,
      cedula: member.cedula,
      cargo: member.cargo.toLowerCase().includes("sst") || member.cargo.toLowerCase().includes("coordinador")
        ? member.cargo
        : `Coordinador SST / ${member.cargo}`,
      firmaUrl: member.firmaUrl || activeWorkerSignatures?.[member.id] || "",
    };

    setSupervisorForm(newSupervisor);
    if (onUpdateSupervisor) {
      onUpdateSupervisor(newSupervisor);
    }

    // Also update role tag in staff list
    const updatedStaff = staffList.map((s) => ({
      ...s,
      rol: s.id === member.id ? ("coordinador_sst" as const) : s.rol === "coordinador_sst" ? ("trabajador" as const) : s.rol,
    }));
    onUpdateStaffList(updatedStaff);

    setSavedSupervisorSuccess(true);
    setTimeout(() => setSavedSupervisorSuccess(false), 2500);
  };

  const handleSaveSupervisorForm = (e: React.FormEvent) => {
    e.preventDefault();
      // Instead of alert, just return if empty
      if (!supervisorForm.nombre.trim() || !supervisorForm.cedula.trim()) {
        return;
      }

    if (onUpdateSupervisor) {
      onUpdateSupervisor(supervisorForm);
    }

    // Check if supervisor is in staff list or add/update
    const existingIndex = staffList.findIndex(
      (s) => s.cedula.trim() === supervisorForm.cedula.trim()
    );

    if (existingIndex >= 0) {
      const updated = [...staffList];
      updated[existingIndex] = {
        ...updated[existingIndex],
        nombre: supervisorForm.nombre,
        cargo: supervisorForm.cargo || "Coordinador SST",
        rol: "coordinador_sst",
      };
      onUpdateStaffList(updated);
    }

    setSavedSupervisorSuccess(true);
    setTimeout(() => setSavedSupervisorSuccess(false), 3000);
  };

  const handleSaveAndClose = () => {
    let savedInline = false;
    if ((isAddingNew || editingId) && workerFormData.nombre.trim() && workerFormData.cedula.trim()) {
      savedInline = handleSaveWorker(activeTab === "coordinador");
    }
    if (!savedInline && onUpdateActiveWorkers) {
      onUpdateActiveWorkers([...activeWorkers]);
    }
    onClose();
  };

  const renderWorkerEditorCard = (isCoordinatorMode: boolean) => (
    <div
      ref={!isAddingNew ? inlineEditRef : undefined}
      className={`p-3.5 sm:p-4 rounded-xl border-2 space-y-3 animate-in fade-in ${
        isCoordinatorMode ? "border-emerald-300 bg-emerald-50/80" : "border-blue-300 bg-blue-50/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
            isCoordinatorMode ? "text-emerald-900" : "text-blue-900"
          }`}
        >
          {isAddingNew ? (
            <>
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{isCoordinatorMode ? "Nuevo Coordinador SST" : "Nuevo Trabajador"}</span>
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4 shrink-0" />
              <span>{isCoordinatorMode ? "Modificar Coordinador SST" : "Modificar Datos del Trabajador"}</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsAddingNew(false);
            setEditingId(null);
            setFormError(null);
          }}
          className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {formError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-300 text-xs font-bold text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={isCoordinatorMode ? "sm:col-span-2" : ""}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombres y Apellidos *
          </label>
          <input
            type="text"
            value={workerFormData.nombre}
            onChange={(e) => {
              setFormError(null);
              setWorkerFormData({ ...workerFormData, nombre: e.target.value.toUpperCase() });
            }}
            placeholder={isCoordinatorMode ? "Ej. JHOAN TALERO JIMÉNEZ" : "Ej. CARLOS EDUARDO RODRÍGUEZ"}
            className="w-full min-h-[42px] text-sm sm:text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 uppercase font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Número de Cédula *
          </label>
          <input
            type="text"
            value={workerFormData.cedula}
            onChange={(e) => {
              setFormError(null);
              setWorkerFormData({ ...workerFormData, cedula: e.target.value });
            }}
            placeholder={isCoordinatorMode ? "Ej. 80.492.311" : "Ej. 1.018.472.930"}
            className="w-full min-h-[42px] text-sm sm:text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-semibold text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cargo / Especialidad
          </label>
          <input
            type="text"
            value={workerFormData.cargo}
            onChange={(e) =>
              setWorkerFormData({ ...workerFormData, cargo: e.target.value })
            }
            placeholder={isCoordinatorMode ? "Ej. Coordinador SST" : "Ej. Técnico Especialista en Alturas"}
            className="w-full min-h-[42px] text-sm sm:text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-medium text-slate-900"
          />
        </div>

        {!isCoordinatorMode && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ARL Afiliada
            </label>
            <input
              type="text"
              value={workerFormData.arl}
              onChange={(e) =>
                setWorkerFormData({ ...workerFormData, arl: e.target.value })
              }
              placeholder="Ej. SURA ARL, POSITIVA, SEGUROS BOLÍVAR"
              className="w-full min-h-[42px] text-sm sm:text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-medium text-emerald-800"
            />
          </div>
        )}

        {/* Firma digital guardada */}
        <div className="sm:col-span-2 pt-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {isCoordinatorMode
              ? "Firma Digital Guardada del Coordinador SST (Opcional)"
              : "Firma Digital Guardada (Opcional)"}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
            <div className="h-16 sm:w-44 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {workerFormData.firmaUrl ? (
                <img
                  src={workerFormData.firmaUrl}
                  alt="Vista previa de firma"
                  className="max-h-14 max-w-full object-contain p-1"
                />
              ) : (
                <span className="text-[11px] text-slate-400 font-medium px-2 text-center">
                  Sin firma registrada
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <button
                type="button"
                onClick={() =>
                  setSignaturePrompt({
                    mode: "form",
                    name: workerFormData.nombre || (isCoordinatorMode ? "Coordinador SST" : "Nuevo Trabajador"),
                    initialSignature: workerFormData.firmaUrl,
                    isCoordinator: isCoordinatorMode,
                  })
                }
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer ${
                  isCoordinatorMode
                    ? "text-white bg-emerald-600 hover:bg-emerald-700"
                    : "text-slate-900 bg-amber-400 hover:bg-amber-300 border border-amber-500"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{workerFormData.firmaUrl ? "Cambiar Firma" : "Capturar Firma"}</span>
              </button>
              {workerFormData.firmaUrl && (
                <button
                  type="button"
                  onClick={() => setWorkerFormData({ ...workerFormData, firmaUrl: "" })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setIsAddingNew(false);
            setEditingId(null);
            setFormError(null);
          }}
          className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => handleSaveWorker(isCoordinatorMode)}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer ${
            isCoordinatorMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>
            {isAddingNew
              ? isCoordinatorMode
                ? "Añadir al Directorio"
                : "Guardar y Asignar al ATS"
              : "Actualizar Datos"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/90 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Gestión de Personal & Coordinador SST
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                Edite con el lápiz, agregue trabajadores y guarde firmas digitales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            aria-label="Cerrar gestión de personal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="shrink-0 flex border-b border-slate-200 bg-slate-100/70 px-3 sm:px-6 pt-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("cuadrilla");
              setIsAddingNew(false);
              setEditingId(null);
              setFormError(null);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "cuadrilla"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-t-lg"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Trabajadores Ejecutores</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
              {staffList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("coordinador");
              setIsAddingNew(false);
              setEditingId(null);
              setFormError(null);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "coordinador"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-t-lg"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Coordinador SST</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
              Emisor
            </span>
          </button>
        </div>

        {/* Content */}
        <div
          ref={scrollBodyRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5"
        >
          {/* TAB 1: WORKERS & SQUAD */}
          {activeTab === "cuadrilla" && (
            <div className="space-y-4">
              {/* Add Worker Form (at top when adding new) */}
              {isAddingNew && renderWorkerEditorCard(false)}
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">
                    Nómina Registrada ({staffList.length} trabajadores · {activeWorkers.length} incluidos en este ATS)
                  </span>
                  {staffList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateActiveWorkers) {
                          if (activeWorkers.length === staffList.length) {
                            onUpdateActiveWorkers([staffList[0]]);
                          } else {
                            onUpdateActiveWorkers([...staffList]);
                          }
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                    >
                      {activeWorkers.length === staffList.length ? "Deseleccionar" : "Seleccionar Todos"}
                    </button>
                  )}
                </div>
                {!isAddingNew && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeWorkers.length < staffList.length && onUpdateActiveWorkers && (
                      <button
                        type="button"
                        onClick={() => onUpdateActiveWorkers([...staffList])}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Incluir a todos los trabajadores registrados en el ATS actual"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Incluir Todos al ATS</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Trabajador</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Workers List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-200">
                {staffList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay trabajadores en el directorio. Presione "Añadir Trabajador" para registrar miembros.
                  </div>
                ) : (
                  staffList.map((member) => {
                    const isSelected = activeWorkers.some((w) => w.id === member.id);
                    const isCoordinator =
                      supervisor &&
                      (supervisor.cedula.trim() === member.cedula.trim() ||
                        supervisor.nombre.trim() === member.nombre.trim());
                    const memberSignature = member.firmaUrl || activeWorkerSignatures?.[member.id];

                    const isEditingThis = editingId === member.id;

                    return (
                      <div
                        key={member.id}
                        className={`p-3.5 transition-colors space-y-3 ${
                          isEditingThis
                            ? "bg-blue-50/40"
                            : isSelected
                            ? "bg-amber-50/60"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onToggleActiveWorker(member)}
                              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-amber-600 border-amber-600 text-white shadow-2xs"
                                  : "border-slate-300 hover:border-slate-400 bg-white"
                              }`}
                              title="Marcar para incluir o excluir de este ATS"
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-slate-900 uppercase">
                                  {member.nombre}
                                </p>
                                {isSelected && (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded shrink-0">
                                    En este ATS
                                  </span>
                                )}
                                {isCoordinator && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    Coordinador SST
                                  </span>
                                )}
                                {memberSignature && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                                    <PenTool className="w-2.5 h-2.5" />
                                    Firma guardada
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                <span>CC: <strong className="text-slate-700 font-mono">{member.cedula}</strong></span>
                                <span>•</span>
                                <span>{member.cargo}</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">{member.arl}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 justify-end shrink-0 sm:ml-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setSignaturePrompt({
                                  mode: "member",
                                  memberId: member.id,
                                  name: member.nombre,
                                  initialSignature: memberSignature,
                                })
                              }
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                                memberSignature
                                  ? "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                  : "text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300"
                              }`}
                              title={memberSignature ? "Ver o actualizar firma guardada" : "Capturar y guardar firma"}
                            >
                              <PenTool className="w-3 h-3" />
                              <span>{memberSignature ? "Firma" : "Firmar"}</span>
                            </button>
                            {!isCoordinator && (
                              <button
                                type="button"
                                onClick={() => handleSetAsCoordinator(member)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Designar a este miembro como Coordinador / Supervisor SST"
                              >
                                <Award className="w-3 h-3" />
                                <span>Asignar Coord. SST</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(member)}
                              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                isEditingThis
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "text-blue-700 bg-blue-50/70 hover:bg-blue-100 border-blue-200"
                              }`}
                              title="Editar datos del trabajador"
                              aria-label={`Editar datos de ${member.nombre}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWorker(member.id)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                              title="Eliminar del directorio"
                              aria-label={`Eliminar a ${member.nombre}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form right inside the worker card */}
                        {isEditingThis && renderWorkerEditorCard(false)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COORDINADOR / SUPERVISOR SST */}
          {activeTab === "coordinador" && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Coordinadores de Trabajo en Alturas / Supervisor SST
                    </h4>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">
                      Gestione el directorio de Coordinadores SST y seleccione quién emitirá el permiso actual (Res. 4272/2021).
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Coordinator Form (at top when adding new) */}
              {isAddingNew && renderWorkerEditorCard(true)}

              {/* Action Bar for Coordinators */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Directorio de Coordinadores SST
                </span>
                {!isAddingNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setIsAddingNew(true);
                      setEditingId(null);
                      setWorkerFormData({
                        nombre: "",
                        cedula: "",
                        cargo: "Coordinador SST",
                        arl: "POSITIVA",
                        rol: "coordinador_sst",
                        firmaUrl: "",
                      });
                      setTimeout(() => {
                        scrollBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }, 50);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Coordinador</span>
                  </button>
                )}
              </div>

              {/* Coordinators List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-200">
                {staffList.filter(s => s.rol === "coordinador_sst" || s.cargo.toLowerCase().includes("sst")).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay coordinadores registrados. Presione "Añadir Coordinador".
                  </div>
                ) : (
                  staffList
                    .filter(s => s.rol === "coordinador_sst" || s.cargo.toLowerCase().includes("sst"))
                    .map((member) => {
                      const isSelected =
                        supervisor &&
                        (supervisor.cedula.trim() === member.cedula.trim() ||
                          supervisor.nombre.trim() === member.nombre.trim());
                      const coordSignature =
                        member.firmaUrl || (isSelected ? supervisor?.firmaUrl : undefined) || activeWorkerSignatures?.[member.id];

                      const isEditingCoord = editingId === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`p-3.5 transition-colors space-y-3 ${
                            isEditingCoord
                              ? "bg-emerald-50/40"
                              : isSelected
                              ? "bg-emerald-50/60"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateSupervisor) {
                                    onUpdateSupervisor({
                                      nombre: member.nombre,
                                      cedula: member.cedula,
                                      cargo: member.cargo,
                                      firmaUrl: member.firmaUrl || activeWorkerSignatures?.[member.id] || "",
                                    });
                                  }
                                }}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                    : "border-slate-300 hover:border-slate-400 bg-white"
                                }`}
                                title="Asignar como Coordinador SST de este ATS"
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-slate-900 uppercase">
                                    {member.nombre}
                                  </p>
                                  {isSelected && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded shrink-0">
                                      Coordinador Actual
                                    </span>
                                  )}
                                  {coordSignature && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                                      <PenTool className="w-2.5 h-2.5" />
                                      Firma guardada
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                  <span>CC: <strong className="text-slate-700 font-mono">{member.cedula}</strong></span>
                                  <span>•</span>
                                  <span>{member.cargo}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 justify-end shrink-0 sm:ml-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSignaturePrompt({
                                    mode: "member",
                                    memberId: member.id,
                                    name: member.nombre,
                                    initialSignature: coordSignature,
                                    isCoordinator: true,
                                  })
                                }
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  coordSignature
                                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                                    : "text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300"
                                }`}
                                title={coordSignature ? "Ver o actualizar firma del coordinador" : "Capturar y guardar firma del coordinador"}
                              >
                                <PenTool className="w-3 h-3" />
                                <span>{coordSignature ? "Firma" : "Firmar"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(member)}
                                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                  isEditingCoord
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200"
                                }`}
                                title="Editar datos del coordinador"
                                aria-label={`Editar coordinador ${member.nombre}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWorker(member.id)}
                                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Eliminar del directorio"
                                aria-label={`Eliminar coordinador ${member.nombre}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Edit Form right inside the coordinator card */}
                          {isEditingCoord && renderWorkerEditorCard(true)}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50 gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            {activeWorkers.length < staffList.length && onUpdateActiveWorkers && (
              <button
                type="button"
                onClick={() => onUpdateActiveWorkers([...staffList])}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Incluir los {staffList.length} trabajadores en este ATS</span>
              </button>
            )}
            <p className="text-xs text-slate-500">
              {activeWorkers.length} trabajador{activeWorkers.length === 1 ? "" : "es"} configurados para el PDF oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="w-full sm:w-auto text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Guardar Cuadrilla y Salir
          </button>
        </div>
      </div>

      {/* Modal de Firma Digital integrado */}
      <SignatureModal
        isOpen={signaturePrompt !== null}
        onClose={() => setSignaturePrompt(null)}
        onSave={handleSaveSignatureFromModal}
        title={
          signaturePrompt?.isCoordinator
            ? `Firma Guardada - Coordinador SST: ${signaturePrompt.name}`
            : `Firma Guardada - Trabajador: ${signaturePrompt?.name || ""}`
        }
        subtitle="Esta firma quedará guardada en el directorio de personal para futuros ATS"
        initialSignature={signaturePrompt?.initialSignature}
      />
    </div>
  );
};
