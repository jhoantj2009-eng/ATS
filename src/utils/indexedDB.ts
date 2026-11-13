import { ATSFormData, ATSHistoryRecord, EmpresaConfig, PersonalMember } from "../types";

const DB_NAME = "ats_pwa_database";
const DB_VERSION = 1;
const STORE_HISTORY = "ats_history";
const STORE_SETTINGS = "app_settings";

let dbInstance: IDBDatabase | null = null;

/**
 * Abre o inicializa la base de datos IndexedDB local
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no está soportado en este navegador"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Almacén para el historial de análisis ATS
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        historyStore.createIndex("by_syncStatus", "syncStatus", { unique: false });
        historyStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
      }

      // Almacén para borradores y configuración local
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Guarda o actualiza un registro de ATS en IndexedDB
 */
export async function saveATSRecordToIDB(
  record: ATSHistoryRecord,
  markAsPending = true
): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);

    const recordToSave: ATSHistoryRecord = {
      ...record,
      syncStatus: markAsPending ? "pending" : (record.syncStatus || "synced"),
      updatedAt: record.updatedAt || new Date().toISOString(),
    };

    const request = store.put(recordToSave);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todos los registros de ATS guardados en IndexedDB ordenados cronológicamente
 */
export async function getAllATSRecordsFromIDB(): Promise<ATSHistoryRecord[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const store = tx.objectStore(STORE_HISTORY);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as ATSHistoryRecord[];
        results.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Error leyendo registros de IndexedDB:", err);
    return [];
  }
}

/**
 * Obtiene los registros que están pendientes de sincronizar con el servidor
 */
export async function getPendingSyncRecordsFromIDB(): Promise<ATSHistoryRecord[]> {
  try {
    const all = await getAllATSRecordsFromIDB();
    return all.filter((r) => r.syncStatus === "pending");
  } catch {
    return [];
  }
}

/**
 * Cuenta cuántos registros están pendientes de sincronización
 */
export async function getPendingSyncCountFromIDB(): Promise<number> {
  const pending = await getPendingSyncRecordsFromIDB();
  return pending.length;
}

/**
 * Marca registros como sincronizados ('synced') tras confirmación exitosa del servidor
 */
export async function markRecordsAsSyncedInIDB(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openIndexedDB();
  const idSet = new Set(ids);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result || []) as ATSHistoryRecord[];
      const nowIso = new Date().toISOString();

      records.forEach((rec) => {
        if (idSet.has(rec.id)) {
          rec.syncStatus = "synced";
          rec.syncedAt = nowIso;
          store.put(rec);
        }
      });
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Elimina un registro de IndexedDB por ID
 */
export async function deleteATSRecordFromIDB(id: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda el estado actual del borrador (formulario, empresa, personal) en IndexedDB
 */
export async function saveDraftStateToIDB(
  formData: ATSFormData,
  empresa: EmpresaConfig,
  staffList: PersonalMember[]
): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    const store = tx.objectStore(STORE_SETTINGS);

    store.put({ key: "formData", value: formData });
    store.put({ key: "empresa", value: empresa });
    store.put({ key: "staffList", value: staffList });
    store.put({ key: "lastSavedTime", value: new Date().toISOString() });
  } catch (err) {
    console.error("Error guardando borrador en IndexedDB:", err);
  }
}

/**
 * Recupera el borrador guardado en IndexedDB
 */
export async function getDraftStateFromIDB(): Promise<{
  formData?: ATSFormData;
  empresa?: EmpresaConfig;
  staffList?: PersonalMember[];
} | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, "readonly");
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        const result: Record<string, any> = {};
        items.forEach((item: { key: string; value: any }) => {
          result[item.key] = item.value;
        });
        if (result.formData) {
          resolve({
            formData: result.formData,
            empresa: result.empresa,
            staffList: result.staffList,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Guarda cualquier configuración o clave personalizada en el almacén app_settings de IndexedDB
 */
export async function saveAppSettingsToIDB(key: string, value: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    const store = tx.objectStore(STORE_SETTINGS);
    store.put({ key, value });
  } catch (err) {
    console.error("Error guardando app setting en IndexedDB:", err);
  }
}

/**
 * Recupera un valor guardado por clave en el almacén app_settings de IndexedDB
 */
export async function getAppSettingsFromIDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, "readonly");
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get(key);
      request.onsuccess = () => {
        const res = request.result as { key: string; value: T } | undefined;
        resolve(res ? res.value : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Migra automáticamente los datos existentes de localStorage hacia IndexedDB
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  try {
    const rawHistory = localStorage.getItem("ats_history_records");
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          await saveATSRecordToIDB(item, item.syncStatus !== "synced");
        }
      }
    }
  } catch (err) {
    console.warn("Aviso durante migración de localStorage a IndexedDB:", err);
  }
}

export const migrateLocalStorageToIDB = migrateLocalStorageToIndexedDB;
