import { ATSFormData, ATSHistoryRecord, EmpresaConfig, PersonalMember } from "../types";
import { saveATSRecordToIDB, deleteATSRecordFromIDB } from "./indexedDB";

const HISTORY_STORAGE_KEY = "ats_history_records";
const MAX_HISTORY_RECORDS = 150;

/**
 * Obtiene todos los registros guardados en el historial, ordenados por fecha de actualización descendente.
 */
export function getHistoryRecords(): ATSHistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (err) {
    console.error("Error reading ATS history from localStorage:", err);
    return [];
  }
}

/**
 * Guarda o actualiza un registro de ATS en el historial de localStorage y en IndexedDB.
 */
export function saveHistoryRecord(
  formData: ATSFormData,
  empresa: EmpresaConfig,
  staffList?: PersonalMember[],
  targetId?: string,
  syncStatus: "pending" | "synced" = "pending"
): { record: ATSHistoryRecord; isNew: boolean } {
  try {
    const records = getHistoryRecords();
    const nowIso = new Date().toISOString();

    // Determinar ID único del registro
    const recordId = targetId || formData.id || `ats-rec-${Date.now()}`;
    const existingIndex = records.findIndex((r) => r.id === recordId);

    const firmasCount =
      Object.keys(formData.firmasTrabajadores || {}).length +
      (formData.supervisor?.firmaUrl ? 1 : 0);

    const recordTitle =
      (formData.tareaGeneral || "").trim() ||
      `ATS ${formData.codigo || "F-SST-045"} - ${formData.lugar || "Sin título"}`;

    const newOrUpdatedRecord: ATSHistoryRecord = {
      id: recordId,
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt || nowIso : nowIso,
      updatedAt: nowIso,
      titulo: recordTitle,
      fecha: formData.fechaDiligenciamiento || nowIso.split("T")[0],
      lugar: formData.lugar || "No especificado",
      tipoTrabajo: formData.tipoTrabajo || "Sin especificar",
      alturaAproximada: formData.alturaAproximada || "No especificada",
      pasosCount: formData.pasos?.length || 0,
      firmasCount,
      empresa: { ...empresa },
      formData: { ...formData, id: recordId },
      staffList: staffList ? [...staffList] : undefined,
      syncStatus,
      syncedAt: syncStatus === "synced" ? nowIso : undefined,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newOrUpdatedRecord;
    } else {
      records.unshift(newOrUpdatedRecord);
    }

    // Limitar tamaño para prevenir exceder cuotas de almacenamiento
    const trimmed = records.slice(0, MAX_HISTORY_RECORDS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));

    // Persistir simultáneamente en IndexedDB
    saveATSRecordToIDB(newOrUpdatedRecord).catch((err) => {
      console.warn("IndexedDB async save warning:", err);
    });

    return {
      record: newOrUpdatedRecord,
      isNew: existingIndex < 0,
    };
  } catch (err) {
    console.error("Error saving ATS record to history:", err);
    throw err;
  }
}

/**
 * Elimina un registro del historial por su ID tanto en localStorage como en IndexedDB.
 */
export function deleteHistoryRecord(recordId: string): ATSHistoryRecord[] {
  try {
    const records = getHistoryRecords();
    const updated = records.filter((r) => r.id !== recordId);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));

    // Eliminar también de IndexedDB
    deleteATSRecordFromIDB(recordId).catch((err) => {
      console.warn("IndexedDB async delete warning:", err);
    });

    return updated;
  } catch (err) {
    console.error("Error deleting ATS record from history:", err);
    return getHistoryRecords();
  }
}

/**
 * Marca uno o varios registros como sincronizados en localStorage.
 */
export function markRecordsAsSyncedLocally(syncedIds: string[]): void {
  try {
    if (!syncedIds || syncedIds.length === 0) return;
    const records = getHistoryRecords();
    const nowIso = new Date().toISOString();
    const idSet = new Set(syncedIds);
    let changed = false;

    for (const rec of records) {
      if (idSet.has(rec.id)) {
        rec.syncStatus = "synced";
        rec.syncedAt = nowIso;
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (err) {
    console.error("Error marking records synced locally:", err);
  }
}

/**
 * Duplica un registro existente para usarlo como plantilla con fecha de hoy.
 */
export function duplicateHistoryRecord(record: ATSHistoryRecord): ATSHistoryRecord {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const newId = `ATS-${now.getFullYear()}-${String(Date.now()).slice(-4)}`;

  const duplicatedFormData: ATSFormData = {
    ...record.formData,
    id: newId,
    fechaDiligenciamiento: todayStr,
    permisoValidoDesdeFecha: todayStr,
    permisoValidoHastaFecha: todayStr,
    firmasTrabajadores: {},
    supervisor: {
      ...record.formData.supervisor,
      firmaUrl: "",
    },
  };

  const { record: duplicatedRecord } = saveHistoryRecord(
    duplicatedFormData,
    record.empresa,
    record.staffList,
    newId
  );

  return duplicatedRecord;
}

/**
 * Exporta todo el historial de ATS a un archivo .json descargable.
 */
export function exportHistoryToJSON(): void {
  const records = getHistoryRecords();
  const exportData = {
    app: "ATS Seguridad Laboral - F-SST-045",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    totalRecords: records.length,
    records,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `Respaldo_Historial_ATS_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Importa un respaldo .json con validación y fusión inteligente sin duplicados.
 */
export function importHistoryFromJSON(
  jsonText: string
): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    let incomingRecords: any[] = [];

    if (Array.isArray(parsed)) {
      incomingRecords = parsed;
    } else if (parsed && Array.isArray(parsed.records)) {
      incomingRecords = parsed.records;
    } else {
      return {
        success: false,
        count: 0,
        error: "El archivo no contiene un formato de respaldo ATS válido.",
      };
    }

    if (incomingRecords.length === 0) {
      return {
        success: false,
        count: 0,
        error: "El archivo JSON no contiene registros de ATS.",
      };
    }

    const currentRecords = getHistoryRecords();
    const currentMap = new Map(currentRecords.map((r) => [r.id, r]));

    let importedCount = 0;
    for (const item of incomingRecords) {
      if (item && item.formData && typeof item.formData === "object") {
        const id = item.id || item.formData.id || `ats-imp-${Date.now()}-${importedCount}`;
        const recordTitle =
          item.titulo ||
          item.formData.tareaGeneral ||
          `ATS ${item.formData.codigo || "F-SST-045"}`;

        const validRecord: ATSHistoryRecord = {
          id,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          titulo: recordTitle,
          fecha: item.fecha || item.formData.fechaDiligenciamiento || new Date().toISOString().split("T")[0],
          lugar: item.lugar || item.formData.lugar || "No especificado",
          tipoTrabajo: item.tipoTrabajo || item.formData.tipoTrabajo || "Sin especificar",
          alturaAproximada: item.alturaAproximada || item.formData.alturaAproximada || "No especificada",
          pasosCount: item.formData.pasos?.length || item.pasosCount || 0,
          firmasCount: item.firmasCount || Object.keys(item.formData.firmasTrabajadores || {}).length,
          empresa: item.empresa || {
            nombreEmpresa: "DCM",
            nit: "900.852.147-3",
            logoUrl: "",
            codigoFormato: "F-SST-045",
            version: "01",
            vigencia: "02/09/2026",
          },
          formData: item.formData,
          staffList: item.staffList,
        };

        currentMap.set(id, validRecord);
        importedCount++;
      }
    }

    const merged = Array.from(currentMap.values()).sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged.slice(0, MAX_HISTORY_RECORDS)));

    return {
      success: true,
      count: importedCount,
    };
  } catch (err: any) {
    console.error("Error importing ATS history:", err);
    return {
      success: false,
      count: 0,
      error: "Error al interpretar el archivo JSON. Verifique que sea un archivo válido.",
    };
  }
}
