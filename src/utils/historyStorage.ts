import { ATSFormData, ATSHistoryRecord, EmpresaConfig, PersonalMember } from "../types";
import {
  saveATSRecordToIDB,
  deleteATSRecordFromIDB,
  getAllATSRecordsFromIDB,
} from "./indexedDB";

const HISTORY_STORAGE_KEY = "ats_history_records";
const MAX_HISTORY_RECORDS = 150;

let idSequenceCounter = 0;

/**
 * Genera un ID único garantizado incluso al duplicar varios ATS en el mismo segundo
 */
export function generateUniqueATSId(prefix = "ATS"): string {
  const now = new Date();
  idSequenceCounter = (idSequenceCounter + 1) % 1000;
  const timePart = String(now.getTime()).slice(-6);
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const seqPart = String(idSequenceCounter).padStart(2, "0");
  return `${prefix}-${now.getFullYear()}-${timePart}-${randPart}${seqPart}`;
}

/**
 * Genera una versión liviana de los registros para el espejo en localStorage
 * en caso de que las imágenes base64 (logos/firmas) excedan la cuota de ~5MB.
 * IndexedDB y el servidor SIEMPRE conservan el registro 100% completo.
 */
function compactRecordsForLocalStorage(records: ATSHistoryRecord[]): ATSHistoryRecord[] {
  return records.map((rec) => {
    const isLargeLogo =
      typeof rec.empresa?.logoUrl === "string" && rec.empresa.logoUrl.length > 8000;
    return {
      ...rec,
      empresa: {
        ...rec.empresa,
        logoUrl: isLargeLogo ? "" : rec.empresa?.logoUrl || "",
      },
      staffList: Array.isArray(rec.staffList)
        ? rec.staffList.map((m) => ({ ...m, firmaUrl: "" }))
        : undefined,
    };
  });
}

/**
 * Persiste el listado en localStorage de forma segura sin lanzar QuotaExceededError
 */
function persistHistoryToLocalStorageSafe(records: ATSHistoryRecord[]): boolean {
  const trimmed = records.slice(0, MAX_HISTORY_RECORDS);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    // 1er respaldo: guardar versión liviana sin duplicar base64 pesados (IndexedDB conserva el 100%)
    try {
      const compacted = compactRecordsForLocalStorage(trimmed);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(compacted));
      return true;
    } catch {
      // 2do respaldo: guardar los más recientes en localStorage mientras IndexedDB conserva todo
      for (const limit of [40, 20, 10, 5]) {
        try {
          const subset = compactRecordsForLocalStorage(trimmed.slice(0, limit));
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(subset));
          return true;
        } catch {
          // continuar reduciendo solo el espejo de localStorage
        }
      }
      return false;
    }
  }
}

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
 * Construye el objeto ATSHistoryRecord normalizado
 */
function buildHistoryRecord(
  formData: ATSFormData,
  empresa: EmpresaConfig,
  staffList: PersonalMember[] | undefined,
  existingRecord: ATSHistoryRecord | undefined,
  targetId: string,
  syncStatus: "pending" | "synced"
): ATSHistoryRecord {
  const nowIso = new Date().toISOString();
  const firmasCount =
    Object.keys(formData.firmasTrabajadores || {}).length +
    (formData.supervisor?.firmaUrl ? 1 : 0) +
    (formData.autorizador?.firmaUrl ? 1 : 0);

  const recordTitle =
    (formData.tareaGeneral || "").trim() ||
    `ATS ${formData.codigo || "F-SST-045"} - ${formData.lugar || "Sin título"}`;

  return {
    id: targetId,
    createdAt: existingRecord?.createdAt || nowIso,
    updatedAt: nowIso,
    titulo: recordTitle,
    fecha: formData.fechaDiligenciamiento || nowIso.split("T")[0],
    lugar: formData.lugar || "No especificado",
    tipoTrabajo: formData.tipoTrabajo || "Sin especificar",
    alturaAproximada: formData.alturaAproximada || "No especificada",
    pasosCount: formData.pasos?.length || 0,
    firmasCount,
    empresa: { ...empresa },
    formData: { ...formData, id: targetId },
    staffList: staffList ? [...staffList] : undefined,
    syncStatus,
    syncedAt: syncStatus === "synced" ? nowIso : undefined,
  };
}

/**
 * Guarda o actualiza un registro de ATS en IndexedDB (alta capacidad) y en localStorage (respaldo seguro).
 */
export function saveHistoryRecord(
  formData: ATSFormData,
  empresa: EmpresaConfig,
  staffList?: PersonalMember[],
  targetId?: string,
  syncStatus: "pending" | "synced" = "pending"
): { record: ATSHistoryRecord; isNew: boolean; idbPromise: Promise<void> } {
  const records = getHistoryRecords();
  const recordId = targetId || formData.id || generateUniqueATSId("ATS");
  const existingIndex = records.findIndex((r) => r.id === recordId);

  const newOrUpdatedRecord = buildHistoryRecord(
    formData,
    empresa,
    staffList,
    existingIndex >= 0 ? records[existingIndex] : undefined,
    recordId,
    syncStatus
  );

  // 1. Persistir primero el registro 100% íntegro en IndexedDB (sin límite estricto de 5MB)
  const idbPromise = saveATSRecordToIDB(newOrUpdatedRecord, syncStatus !== "synced").catch((err) => {
    console.warn("IndexedDB async save warning:", err);
  });

  // 2. Actualizar espejo en localStorage sin fallar si se alcanza la cuota
  if (existingIndex >= 0) {
    records[existingIndex] = newOrUpdatedRecord;
  } else {
    records.unshift(newOrUpdatedRecord);
  }
  persistHistoryToLocalStorageSafe(records);

  return {
    record: newOrUpdatedRecord,
    isNew: existingIndex < 0,
    idbPromise,
  };
}

function recordRichnessScore(rec: ATSHistoryRecord): number {
  let score = 0;
  if (rec.empresa?.logoUrl) score += 2;
  if (Array.isArray(rec.staffList) && rec.staffList.some((m) => Boolean(m.firmaUrl))) score += 2;
  score += Object.keys(rec.formData?.firmasTrabajadores || {}).length;
  if (rec.formData?.supervisor?.firmaUrl) score += 1;
  if (rec.formData?.autorizador?.firmaUrl) score += 1;
  return score;
}

/**
 * Fusiona registros provenientes de IndexedDB o del servidor en localStorage e IndexedDB
 * manteniendo siempre la versión más reciente (y más completa en caso de empate) sin duplicados.
 */
export function mergeHistoryRecords(
  incomingRecords: ATSHistoryRecord[],
  persistToIDB = true
): ATSHistoryRecord[] {
  try {
    const localRecords = getHistoryRecords();
    const map = new Map<string, ATSHistoryRecord>();

    for (const rec of localRecords) {
      if (rec?.id) map.set(rec.id, rec);
    }

    for (const inc of incomingRecords) {
      if (!inc?.id || !inc.formData) continue;
      const existing = map.get(inc.id);
      if (!existing) {
        map.set(inc.id, inc);
      } else {
        const incTime = new Date(inc.updatedAt || inc.createdAt || 0).getTime();
        const extTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (
          incTime > extTime ||
          (incTime === extTime && recordRichnessScore(inc) >= recordRichnessScore(existing))
        ) {
          map.set(inc.id, inc);
        }
      }
    }

    const merged = Array.from(map.values())
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, MAX_HISTORY_RECORDS);

    persistHistoryToLocalStorageSafe(merged);

    if (persistToIDB) {
      for (const rec of merged) {
        saveATSRecordToIDB(rec, rec.syncStatus !== "synced").catch(() => {});
      }
    }

    return merged;
  } catch (err) {
    console.error("Error merging history records:", err);
    return getHistoryRecords();
  }
}

/**
 * Obtiene todos los registros combinando IndexedDB (fuente completa) y localStorage
 */
export async function getAllHistoryRecordsCombined(): Promise<ATSHistoryRecord[]> {
  const idbRecords = await getAllATSRecordsFromIDB();
  if (idbRecords.length === 0) {
    return getHistoryRecords();
  }
  return mergeHistoryRecords(idbRecords, false);
}

/**
 * Elimina un registro del historial por su ID tanto en localStorage como en IndexedDB.
 */
export function deleteHistoryRecord(recordId: string): ATSHistoryRecord[] {
  try {
    const records = getHistoryRecords();
    const updated = records.filter((r) => r.id !== recordId);
    persistHistoryToLocalStorageSafe(updated);

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
      persistHistoryToLocalStorageSafe(records);
    }
  } catch (err) {
    console.error("Error marking records synced locally:", err);
  }
}

/**
 * Calcula un título claro para una copia sin encadenar "(Copia) (Copia)"
 */
function buildDuplicateTitle(baseTitle: string, existingTitles: string[]): string {
  const cleanBase = (baseTitle || "ATS").replace(/\s*\(Copia(?:\s+\d+)?\)\s*$/i, "").trim();
  const existingSet = new Set(existingTitles.map((t) => (t || "").trim().toLowerCase()));

  const firstCandidate = `${cleanBase} (Copia)`;
  if (!existingSet.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  let copyNum = 2;
  while (copyNum < 999) {
    const candidate = `${cleanBase} (Copia ${copyNum})`;
    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    copyNum++;
  }
  return `${cleanBase} (Copia ${Date.now().toString().slice(-3)})`;
}

/**
 * Duplica un registro existente para usarlo como plantilla con fecha de hoy.
 * Soporta duplicar múltiples ATS consecutivamente sin colisiones ni límite de cuota de localStorage.
 */
export async function duplicateHistoryRecord(
  record: ATSHistoryRecord,
  existingRecords?: ATSHistoryRecord[]
): Promise<ATSHistoryRecord> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const newId = generateUniqueATSId("ATS");

  const allExisting = existingRecords || (await getAllHistoryRecordsCombined());
  const nextTitle = buildDuplicateTitle(
    record.formData?.tareaGeneral || record.titulo || "ATS",
    allExisting.map((r) => r.titulo || r.formData?.tareaGeneral || "")
  );

  const preservedFirmas: Record<string, string> = {
    ...(record.formData.firmasTrabajadores || {}),
  };

  const preservedTrabajadores = Array.isArray(record.formData.trabajadores)
    ? record.formData.trabajadores.map((w) => {
        const staffMatch = record.staffList?.find(
          (m) =>
            m.id === w.id ||
            (w.cedula?.trim() && m.cedula?.trim() === w.cedula.trim()) ||
            (w.nombre?.trim() && m.nombre?.trim().toUpperCase() === w.nombre.trim().toUpperCase())
        );
        const resolvedSig = preservedFirmas[w.id] || w.firmaUrl || staffMatch?.firmaUrl || "";
        if (resolvedSig) {
          preservedFirmas[w.id] = resolvedSig;
        }
        return resolvedSig ? { ...w, firmaUrl: resolvedSig } : { ...w };
      })
    : [];

  const supMatch = record.staffList?.find(
    (m) =>
      (record.formData.supervisor?.cedula?.trim() &&
        m.cedula?.trim() === record.formData.supervisor.cedula.trim()) ||
      (record.formData.supervisor?.nombre?.trim() &&
        m.nombre?.trim().toUpperCase() === record.formData.supervisor.nombre.trim().toUpperCase())
  );
  const authMatch = record.staffList?.find(
    (m) =>
      (record.formData.autorizador?.cedula?.trim() &&
        m.cedula?.trim() === record.formData.autorizador.cedula.trim()) ||
      (record.formData.autorizador?.nombre?.trim() &&
        m.nombre?.trim().toUpperCase() === record.formData.autorizador.nombre.trim().toUpperCase())
  );

  const duplicatedFormData: ATSFormData = {
    ...record.formData,
    id: newId,
    tareaGeneral: nextTitle,
    fechaDiligenciamiento: todayStr,
    permisoValidoDesdeFecha: todayStr,
    permisoValidoHastaFecha: todayStr,
    pasos: Array.isArray(record.formData.pasos)
      ? record.formData.pasos.map((p, idx) => ({
          ...p,
          id: `paso-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        }))
      : [],
    trabajadores: preservedTrabajadores,
    eppsSeleccionados: { ...(record.formData.eppsSeleccionados || {}) },
    otrosEppsPersonalizados: Array.isArray(record.formData.otrosEppsPersonalizados)
      ? record.formData.otrosEppsPersonalizados.map((item) => ({ ...item }))
      : [],
    preparacionArea: Array.isArray(record.formData.preparacionArea)
      ? record.formData.preparacionArea.map((item) => ({ ...item }))
      : [],
    firmasTrabajadores: preservedFirmas,
    supervisor: {
      ...(record.formData.supervisor || { nombre: "", cedula: "", cargo: "", firmaUrl: "" }),
      firmaUrl: record.formData.supervisor?.firmaUrl || supMatch?.firmaUrl || "",
    },
    autorizador: {
      nombre: record.formData.autorizador?.nombre || "",
      cedula: record.formData.autorizador?.cedula || "",
      cargo: record.formData.autorizador?.cargo || "",
      firmaUrl: record.formData.autorizador?.firmaUrl || authMatch?.firmaUrl || "",
    },
  };

  const { record: duplicatedRecord, idbPromise } = saveHistoryRecord(
    duplicatedFormData,
    { ...record.empresa },
    record.staffList ? record.staffList.map((m) => ({ ...m })) : undefined,
    newId,
    "pending"
  );

  await idbPromise;

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
