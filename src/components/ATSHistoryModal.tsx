import React, { useState, useEffect } from "react";
import { ATSHistoryRecord } from "../types";
import {
  getHistoryRecords,
  deleteHistoryRecord,
  duplicateHistoryRecord,
} from "../utils/historyStorage";
import {
  History,
  Search,
  X,
  PlusCircle,
  Copy,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  MapPin,
  Building,
  Shield,
  PenTool,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  CloudUpload,
  CloudCheck,
} from "lucide-react";

interface ATSHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadATS: (record: ATSHistoryRecord, targetView?: "form" | "preview") => void;
  onNewATS: () => void;
  currentATSId?: string;
  onSaveCurrentATS?: () => void;
}

export const ATSHistoryModal: React.FC<ATSHistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadATS,
  onNewATS,
  currentATSId,
  onSaveCurrentATS,
}) => {
  const [records, setRecords] = useState<ATSHistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Cargar registros al abrir el modal
  useEffect(() => {
    if (isOpen) {
      refreshList();
      setDeleteConfirmId(null);
      setFeedbackNotice(null);
    }
  }, [isOpen]);

  const refreshList = () => {
    const list = getHistoryRecords();
    setRecords(list);
  };

  const showNotice = (type: "success" | "error", text: string) => {
    setFeedbackNotice({ type, text });
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4500);
  };

  // Filtrado reactivo en tiempo real
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchTitle = (r.titulo || "").toLowerCase().includes(query);
    const matchFecha = (r.fecha || "").toLowerCase().includes(query);
    const matchLugar = (r.lugar || "").toLowerCase().includes(query);
    const matchTipo = (r.tipoTrabajo || "").toLowerCase().includes(query);
    const matchEmpresa = (r.empresa?.nombreEmpresa || "").toLowerCase().includes(query);
    const matchCodigo = (r.empresa?.codigoFormato || "").toLowerCase().includes(query);
    return matchTitle || matchFecha || matchLugar || matchTipo || matchEmpresa || matchCodigo;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryRecord(id);
    refreshList();
    setDeleteConfirmId(null);
    showNotice("success", "El registro ha sido eliminado del historial correctamente.");
  };

  const handleDuplicate = (record: ATSHistoryRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const duplicated = duplicateHistoryRecord(record);
      refreshList();
      showNotice("success", `¡ATS duplicado como nueva plantilla con fecha de hoy!`);
      // Opcional: cargar directamente el duplicado
      onLoadATS(duplicated, "form");
      onClose();
    } catch {
      showNotice("error", "No se pudo duplicar el registro.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER DEL MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Historial de ATS Guardados
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {records.length} {records.length === 1 ? "registro" : "registros"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Consulta, edita, duplica o regenera cualquier Análisis de Trabajo Seguro en PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICACIÓN TOAST DENTRO DEL MODAL */}
        {feedbackNotice && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all ${
              feedbackNotice.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-red-50 text-red-800 border-b border-red-200"
            }`}
          >
            {feedbackNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackNotice.text}</span>
          </div>
        )}

        {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y ACCIONES GLOBALES */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Buscador en tiempo real */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por actividad, fecha, ubicación, empresa o código..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-blue-500 font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Acciones del Historial: Guardar actual y Nuevo ATS */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Guardar actual */}
            {onSaveCurrentATS && (
              <button
                type="button"
                onClick={() => {
                  onSaveCurrentATS();
                  refreshList();
                  showNotice("success", "¡El ATS en edición actual se ha guardado en el historial!");
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Guardar el ATS actual en el historial"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar Actual</span>
              </button>
            )}

            {/* Iniciar Nuevo ATS */}
            <button
              type="button"
              onClick={() => {
                onNewATS();
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Crear un ATS nuevo en blanco"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nuevo ATS</span>
            </button>
          </div>
        </div>

        {/* LISTADO DE REGISTROS DE HISTORIAL */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-50/40">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {searchQuery
                    ? "No se encontraron ATS que coincidan con la búsqueda"
                    : "Aún no tienes registros guardados en el historial"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `Prueba con otros términos o limpia el filtro para ver todos los ${records.length} registros.`
                    : "Cada vez que generes o edites un ATS, puedes guardarlo para consultarlo, reutilizarlo como plantilla o volver a imprimir su PDF oficial."}
                </p>
              </div>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onNewATS();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear mi primer ATS</span>
                </button>
              )}
            </div>
          ) : (
            filteredRecords.map((item) => {
              const isCurrent = item.id === currentATSId;
              const isConfirmingDelete = deleteConfirmId === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border transition-all p-3.5 sm:p-4 shadow-2xs hover:shadow-xs ${
                    isCurrent
                      ? "border-blue-400 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Información Principal del ATS */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Metadatos y badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                        {isCurrent && (
                          <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                            En Edición
                          </span>
                        )}
                        {item.syncStatus === "pending" ? (
                          <span
                            className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full text-[10px]"
                            title="Guardado localmente en IndexedDB. Pendiente por sincronizar con el servidor central."
                          >
                            <CloudUpload className="w-3 h-3 text-amber-700" />
                            <span>Pendiente sync</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]"
                            title="Sincronizado con el servidor central."
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sincronizado</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{item.fecha}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{item.empresa?.nombreEmpresa || "DCM"}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono font-medium">{item.empresa?.codigoFormato || "F-SST-045"}</span>
                        </span>
                        {item.lugar && item.lugar !== "No especificado" && (
                          <span className="inline-flex items-center gap-1 text-slate-600 truncate max-w-[200px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lugar}</span>
                          </span>
                        )}
                      </div>

                      {/* Título / Actividad */}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {item.titulo}
                      </h4>

                      {/* Chips de estado: Pasos, Altura, Firmas */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <Shield className="w-3 h-3 text-blue-500" />
                          <span>{item.pasosCount} Pasos Operativos</span>
                        </span>

                        <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {item.tipoTrabajo} ({item.alturaAproximada})
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                            item.firmasCount > 0
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-slate-500 bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          <span>
                            {item.firmasCount > 0
                              ? `${item.firmasCount} ${item.firmasCount === 1 ? "firma" : "firmas"}`
                              : "Sin firmas"}
                          </span>
                        </span>

                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Actualizado: {new Date(item.updatedAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción por Registro */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-xl animate-in fade-in">
                          <span className="text-[11px] font-bold text-red-700 px-2">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(item.id, e)}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Sí, borrar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="text-xs font-semibold text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Cargar y Editar */}
                          <button
                            type="button"
                            onClick={() => {
                              onLoadATS(item, "form");
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Cargar este ATS en el formulario interactivo para editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Ver PDF (1:1) */}
                          <button
                            type="button"
                            onClick={() => {
                              onLoadATS(item, "preview");
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Ver en formato PDF idéntico listo para imprimir o descargar"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden md:inline">Ver PDF</span>
                          </button>

                          {/* Duplicar como Plantilla */}
                          <button
                            type="button"
                            onClick={(e) => handleDuplicate(item, e)}
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                            title="Duplicar como plantilla (con fecha actual)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Eliminar Registro */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title="Eliminar este ATS del historial"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Almacenamiento local privado en este navegador (localStorage)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
