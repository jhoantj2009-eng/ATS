import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { PersonalMember } from "../types";

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
}) => {
  const [activeTab, setActiveTab] = useState<"cuadrilla" | "coordinador">("cuadrilla");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form fields for workers
  const [workerFormData, setWorkerFormData] = useState<Omit<PersonalMember, "id">>({
    nombre: "",
    cedula: "",
    cargo: "",
    arl: "SURA ARL",
    rol: "trabajador",
  });

  // Supervisor form fields
  const [supervisorForm, setSupervisorForm] = useState<SupervisorData>({
    nombre: supervisor?.nombre || "",
    cedula: supervisor?.cedula || "",
    cargo: supervisor?.cargo || "Coordinador / Supervisor SST",
    firmaUrl: supervisor?.firmaUrl || "",
  });

  const [savedSupervisorSuccess, setSavedSupervisorSuccess] = useState(false);

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

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setWorkerFormData({
      nombre: "",
      cedula: "",
      cargo: "Técnico Especialista en Alturas",
      arl: "SURA ARL",
      rol: "trabajador",
    });
  };

  const handleStartEdit = (member: PersonalMember) => {
    setEditingId(member.id);
    setIsAddingNew(false);
    setWorkerFormData({
      nombre: member.nombre,
      cedula: member.cedula,
      cargo: member.cargo,
      arl: member.arl,
      rol: member.rol || "trabajador",
    });
  };

  const handleSaveWorker = () => {
    if (!workerFormData.nombre.trim() || !workerFormData.cedula.trim()) {
      return; // Validation without alert
    }

    if (isAddingNew) {
      const newMember: PersonalMember = {
        id: "p_" + Date.now(),
        ...workerFormData,
      };
      const updated = [...staffList, newMember];
      onUpdateStaffList(updated);

      // Also add directly to active workers
      if (onUpdateActiveWorkers) {
        onUpdateActiveWorkers([...activeWorkers, newMember]);
      }
      setIsAddingNew(false);
    } else if (editingId) {
      const updatedList = staffList.map((item) =>
        item.id === editingId ? { ...item, ...workerFormData } : item
      );
      onUpdateStaffList(updatedList);

      // If active in current ATS, synchronize data
      if (onUpdateActiveWorkers) {
        const isCurrentlyActive = activeWorkers.some((item) => item.id === editingId);
        if (isCurrentlyActive) {
          const updatedActive = activeWorkers.map((item) =>
            item.id === editingId ? { ...item, ...workerFormData } : item
          );
          onUpdateActiveWorkers(updatedActive);
        } else {
          // If the worker was edited, also ensure they are included in active workers
          onUpdateActiveWorkers([...activeWorkers, { ...workerFormData, id: editingId }]);
        }
      }

      // If this worker was the supervisor, sync supervisor too
      if (
        onUpdateSupervisor &&
        supervisor &&
        (supervisor.cedula === staffList.find((s) => s.id === editingId)?.cedula ||
          supervisor.nombre === staffList.find((s) => s.id === editingId)?.nombre)
      ) {
        onUpdateSupervisor({
          ...supervisor,
          nombre: workerFormData.nombre,
          cedula: workerFormData.cedula,
          cargo: workerFormData.cargo || supervisor.cargo,
        });
      }

      setEditingId(null);
    }
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
      firmaUrl: member.firmaUrl || supervisor?.firmaUrl || "",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Gestión de Personal & Coordinador SST
              </h3>
              <p className="text-xs text-slate-500">
                Edite los nombres, cédulas, cargos y roles del personal ejecutor y del emisor SST
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("cuadrilla")}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "cuadrilla"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-t-lg"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Trabajadores Ejecutores</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {staffList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coordinador")}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "coordinador"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-t-lg"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Coordinador / Supervisor SST</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              Emisor
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: WORKERS & SQUAD */}
          {activeTab === "cuadrilla" && (
            <div className="space-y-4">
              {/* Add / Edit Worker Form */}
              {(isAddingNew || editingId) && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      {isAddingNew ? (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Nuevo Trabajador</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          <span>Modificar Datos del Trabajador</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombres y Apellidos *
                      </label>
                      <input
                        type="text"
                        value={workerFormData.nombre}
                        onChange={(e) =>
                          setWorkerFormData({ ...workerFormData, nombre: e.target.value.toUpperCase() })
                        }
                        placeholder="Ej. CARLOS EDUARDO RODRÍGUEZ"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 uppercase font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Número de Cédula *
                      </label>
                      <input
                        type="text"
                        value={workerFormData.cedula}
                        onChange={(e) =>
                          setWorkerFormData({ ...workerFormData, cedula: e.target.value })
                        }
                        placeholder="Ej. 1.018.472.930"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-semibold"
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
                        placeholder="Ej. Técnico Especialista en Alturas"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                      />
                    </div>

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
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-blue-500 font-medium text-emerald-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingId(null);
                      }}
                      className="text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveWorker}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAddingNew ? "Guardar y Asignar al ATS" : "Actualizar Datos"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                {!isAddingNew && !editingId && (
                  <div className="flex items-center gap-2">
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

                    return (
                      <div
                        key={member.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 transition-colors ${
                          isSelected ? "bg-amber-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleActiveWorker(member)}
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
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
                        <div className="flex items-center gap-1.5 justify-end shrink-0 sm:ml-2">
                          {!isCoordinator && (
                            <button
                              type="button"
                              onClick={() => handleSetAsCoordinator(member)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition-colors"
                              title="Designar a este miembro como Coordinador / Supervisor SST"
                            >
                              <Award className="w-3 h-3" />
                              <span>Asignar Coord. SST</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(member)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Editar datos del trabajador"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar del directorio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

              {/* Add / Edit Coordinator Form */}
              {(isAddingNew || editingId) && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      {isAddingNew ? (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Nuevo Coordinador SST</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          <span>Modificar Coordinador SST</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombres y Apellidos *
                      </label>
                      <input
                        type="text"
                        value={workerFormData.nombre}
                        onChange={(e) =>
                          setWorkerFormData({ ...workerFormData, nombre: e.target.value.toUpperCase() })
                        }
                        placeholder="Ej. JHOAN TALERO JIMÉNEZ"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500 uppercase font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Número de Cédula *
                      </label>
                      <input
                        type="text"
                        value={workerFormData.cedula}
                        onChange={(e) =>
                          setWorkerFormData({ ...workerFormData, cedula: e.target.value })
                        }
                        placeholder="Ej. 80.492.311"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500 font-semibold"
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
                        placeholder="Ej. Coordinador SST"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingId(null);
                      }}
                      className="text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const isCoordinatorEdit = true;
                        if (!workerFormData.nombre.trim() || !workerFormData.cedula.trim()) {
                          return;
                        }

                        if (isAddingNew) {
                          const newMember: PersonalMember = {
                            id: "p_" + Date.now(),
                            ...workerFormData,
                            rol: "coordinador_sst",
                          };
                          const updated = [...staffList, newMember];
                          onUpdateStaffList(updated);
                          setIsAddingNew(false);
                        } else if (editingId) {
                          const updatedList = staffList.map((item) =>
                            item.id === editingId ? { ...item, ...workerFormData, rol: "coordinador_sst" } : item
                          );
                          onUpdateStaffList(updatedList);
                          
                          if (
                            onUpdateSupervisor &&
                            supervisor &&
                            (supervisor.cedula === staffList.find((s) => s.id === editingId)?.cedula)
                          ) {
                            onUpdateSupervisor({
                              ...supervisor,
                              nombre: workerFormData.nombre,
                              cedula: workerFormData.cedula,
                              cargo: workerFormData.cargo || supervisor.cargo,
                            });
                          }
                          setEditingId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAddingNew ? "Añadir al Directorio" : "Actualizar Datos"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Bar for Coordinators */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Directorio de Coordinadores SST
                </span>
                {!isAddingNew && !editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(true);
                      setEditingId(null);
                      setWorkerFormData({
                        nombre: "",
                        cedula: "",
                        cargo: "Coordinador SST",
                        arl: "POSITIVA",
                        rol: "coordinador_sst",
                      });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
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

                      return (
                        <div
                          key={member.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 transition-colors ${
                            isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateSupervisor) {
                                  onUpdateSupervisor({
                                    nombre: member.nombre,
                                    cedula: member.cedula,
                                    cargo: member.cargo,
                                    firmaUrl: member.firmaUrl || supervisor?.firmaUrl || "",
                                  });
                                }
                              }}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
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
                              onClick={() => handleStartEdit(member)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Editar datos del coordinador"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWorker(member.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Eliminar del directorio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 gap-3">
          <div className="flex items-center gap-2">
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
            onClick={onClose}
            className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Guardar Cuadrilla y Salir
          </button>
        </div>
      </div>
    </div>
  );
};
