import {
  ATSFormData,
  ATSHistoryRecord,
  ATSSectionKey,
  EmpresaConfig,
  PersistedUserState,
  PersonalMember,
  UserPreferences,
} from "../types";
import {
  DEFAULT_EMPRESA,
  DEFAULT_LOGO_SVG,
  INITIAL_FORM_DATA,
  INITIAL_STAFF,
} from "../data/defaultData";
import { getAppSettingsFromIDB, saveAppSettingsToIDB } from "./indexedDB";
import { getSavedLogo, saveLogoToStorage } from "./logoHelper";

export const STORAGE_SCHEMA_VERSION = 2;

const LEGACY_KEYS = {
  formData: "ats_form_data",
  formUpdatedAt: "ats_form_data_updated_at",
  empresa: "ats_empresa_config",
  staffList: "ats_staff_list",
  preferences: "ats_user_preferences",
  lastSavedTime: "ats_last_saved_time",
  currentHistoryId: "ats_current_history_id",
  lastEmailRecipient: "ats_last_email_recipient",
  lastLoginEmail: "ats_last_login_email",
};

const VALID_SECTIONS: ATSSectionKey[] = ["cabecera", "matriz", "epp", "area", "firmas"];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  viewMode: "form",
  activeSection: "cabecera",
  previewZoomMode: "fit",
  lastEmailRecipient: "jhoantj2009@gmail.com",
  autoSaveEnabled: true,
  defaultLugar: "",
  defaultJornadaInicio: "08:00",
  defaultJornadaFin: "17:00",
  updatedAtMs: 0,
};

function sanitizeUserKey(uid?: string | null): string {
  if (!uid) return "default";
  const cleaned = uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  return cleaned || "default";
}

function getUserStateStorageKey(uid?: string | null): string {
  return `ats_user_workspace_v${STORAGE_SCHEMA_VERSION}_${sanitizeUserKey(uid)}`;
}

function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  );
}

/**
 * Normaliza y migra formData de cualquier versión anterior sin perder campos nuevos
 */
export function normalizeFormData(raw: unknown): ATSFormData {
  if (!raw || typeof raw !== "object") {
    return { ...INITIAL_FORM_DATA };
  }
  const parsed = raw as Partial<ATSFormData>;

  const normalizedTrabajadores = Array.isArray(parsed.trabajadores)
    ? parsed.trabajadores.filter((t): t is PersonalMember => Boolean(t && typeof t === "object" && t.id))
    : INITIAL_FORM_DATA.trabajadores;

  const normalizedPasos =
    Array.isArray(parsed.pasos) && parsed.pasos.length > 0
      ? parsed.pasos
      : INITIAL_FORM_DATA.pasos;

  const normalizedArea =
    Array.isArray(parsed.preparacionArea) && parsed.preparacionArea.length > 0
      ? parsed.preparacionArea
      : INITIAL_FORM_DATA.preparacionArea;

  const supervisorRaw = parsed.supervisor || INITIAL_FORM_DATA.supervisor;
  const autorizadorRaw = parsed.autorizador || INITIAL_FORM_DATA.autorizador;

  return {
    ...INITIAL_FORM_DATA,
    ...parsed,
    trabajadores: normalizedTrabajadores,
    pasos: normalizedPasos,
    preparacionArea: normalizedArea,
    eppsSeleccionados: {
      ...INITIAL_FORM_DATA.eppsSeleccionados,
      ...(parsed.eppsSeleccionados && typeof parsed.eppsSeleccionados === "object"
        ? parsed.eppsSeleccionados
        : {}),
    },
    otrosEppsPersonalizados: Array.isArray(parsed.otrosEppsPersonalizados)
      ? parsed.otrosEppsPersonalizados
      : [],
    firmasTrabajadores: (() => {
      const safeFirmas: Record<string, string> = {};
      if (parsed.firmasTrabajadores && typeof parsed.firmasTrabajadores === "object") {
        for (const [k, v] of Object.entries(parsed.firmasTrabajadores)) {
          if (
            k !== "__proto__" &&
            k !== "constructor" &&
            k !== "prototype" &&
            isSafeImageUrl(v) &&
            v
          ) {
            safeFirmas[k] = v;
          }
        }
      }
      return safeFirmas;
    })(),
    supervisor: {
      ...INITIAL_FORM_DATA.supervisor,
      ...supervisorRaw,
      firmaUrl: isSafeImageUrl(supervisorRaw?.firmaUrl) ? supervisorRaw.firmaUrl : "",
    },
    autorizador: {
      nombre: autorizadorRaw?.nombre || "",
      cedula: autorizadorRaw?.cedula || "",
      cargo: autorizadorRaw?.cargo || "",
      firmaUrl: isSafeImageUrl(autorizadorRaw?.firmaUrl) ? autorizadorRaw.firmaUrl : "",
    },
  };
}

/**
 * Normaliza la configuración de empresa conservando ediciones del usuario y actualizando legacy
 */
export function normalizeEmpresa(raw: unknown): EmpresaConfig {
  const savedLogo = getSavedLogo();
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_EMPRESA, logoUrl: savedLogo };
  }
  const parsed = { ...(raw as Partial<EmpresaConfig>) };

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
    !isSafeImageUrl(parsed.logoUrl) ||
    parsed.logoUrl.includes("unsplash.com") ||
    parsed.logoUrl.includes("INGENIER%C3%8DA%20%26%20SST") ||
    parsed.logoUrl.includes("INGENIERÍA & SST") ||
    parsed.logoUrl.includes("inveasas") ||
    parsed.logoUrl.includes("Atom%20Orbits")
  ) {
    parsed.logoUrl = savedLogo || DEFAULT_LOGO_SVG;
  }
  if (
    parsed.nombreEmpresa === "INVEASAS S.A.S." ||
    parsed.nombreEmpresa === "INVESTIGACIÓN ENERGÉTICA APLICADA S.A.S" ||
    !parsed.nombreEmpresa
  ) {
    parsed.nombreEmpresa = "DCM";
  }

  return {
    ...DEFAULT_EMPRESA,
    ...parsed,
    logoUrl: parsed.logoUrl || savedLogo || DEFAULT_LOGO_SVG,
  };
}

/**
 * Normaliza el directorio de personal (trabajadores, coordinadores SST y autorizadores)
 */
export function normalizeStaffList(raw: unknown): PersonalMember[] {
  if (!Array.isArray(raw)) {
    return [...INITIAL_STAFF];
  }
  const valid = raw
    .filter((item): item is PersonalMember => Boolean(item && typeof item === "object" && item.id))
    .map((item) => ({
      id: String(item.id),
      nombre: String(item.nombre || ""),
      cedula: String(item.cedula || ""),
      cargo: String(item.cargo || ""),
      arl: String(item.arl || "SURA ARL"),
      rol: item.rol,
      firmaUrl: isSafeImageUrl(item.firmaUrl) ? item.firmaUrl : "",
    }));
  return valid;
}

/**
 * Fusiona dos listas de personal sin perder firmas ni miembros recién añadidos
 */
export function mergeStaffLists(
  primary: PersonalMember[],
  secondary: PersonalMember[]
): PersonalMember[] {
  const map = new Map<string, PersonalMember>();
  for (const member of secondary) {
    if (member?.id) map.set(member.id, member);
  }
  for (const member of primary) {
    if (!member?.id) continue;
    const prev = map.get(member.id);
    map.set(member.id, {
      ...prev,
      ...member,
      firmaUrl: member.firmaUrl || prev?.firmaUrl || "",
    });
  }
  return Array.from(map.values());
}

/**
 * Normaliza las preferencias del usuario
 */
export function normalizePreferences(raw: unknown): UserPreferences {
  const legacyEmail = (() => {
    try {
      return localStorage.getItem(LEGACY_KEYS.lastEmailRecipient) || "";
    } catch {
      return "";
    }
  })();

  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_USER_PREFERENCES,
      lastEmailRecipient: legacyEmail || DEFAULT_USER_PREFERENCES.lastEmailRecipient,
    };
  }

  const parsed = raw as Partial<UserPreferences>;
  const viewMode = parsed.viewMode === "preview" ? "preview" : "form";
  const activeSection = VALID_SECTIONS.includes(parsed.activeSection as ATSSectionKey)
    ? (parsed.activeSection as ATSSectionKey)
    : "cabecera";
  const previewZoomMode = parsed.previewZoomMode === "actual" ? "actual" : "fit";

  return {
    viewMode,
    activeSection,
    previewZoomMode,
    lastEmailRecipient:
      typeof parsed.lastEmailRecipient === "string" && parsed.lastEmailRecipient.trim()
        ? parsed.lastEmailRecipient.trim()
        : legacyEmail || DEFAULT_USER_PREFERENCES.lastEmailRecipient,
    autoSaveEnabled:
      typeof parsed.autoSaveEnabled === "boolean"
        ? parsed.autoSaveEnabled
        : DEFAULT_USER_PREFERENCES.autoSaveEnabled,
    defaultLugar: typeof parsed.defaultLugar === "string" ? parsed.defaultLugar : "",
    defaultJornadaInicio:
      typeof parsed.defaultJornadaInicio === "string" && parsed.defaultJornadaInicio.trim()
        ? parsed.defaultJornadaInicio
        : DEFAULT_USER_PREFERENCES.defaultJornadaInicio,
    defaultJornadaFin:
      typeof parsed.defaultJornadaFin === "string" && parsed.defaultJornadaFin.trim()
        ? parsed.defaultJornadaFin
        : DEFAULT_USER_PREFERENCES.defaultJornadaFin,
    updatedAtMs: typeof parsed.updatedAtMs === "number" ? parsed.updatedAtMs : 0,
  };
}

/**
 * Lee síncronamente el estado persistido desde localStorage (clave de usuario o claves legacy)
 */
export function loadLocalWorkspaceSync(uid?: string | null): {
  state: PersistedUserState;
  hasPersistedData: boolean;
} {
  try {
    // 1. Intentar clave estructurada por usuario
    const userKey = getUserStateStorageKey(uid);
    const rawWorkspace = localStorage.getItem(userKey);
    if (rawWorkspace) {
      const parsed = JSON.parse(rawWorkspace);
      if (parsed && typeof parsed === "object" && parsed.formData) {
        return {
          hasPersistedData: true,
          state: {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            updatedAtMs: Number(parsed.updatedAtMs) || 0,
            formData: normalizeFormData(parsed.formData),
            empresa: normalizeEmpresa(parsed.empresa),
            staffList: normalizeStaffList(parsed.staffList),
            preferences: normalizePreferences(parsed.preferences),
            currentHistoryId:
              typeof parsed.currentHistoryId === "string" ? parsed.currentHistoryId : null,
          },
        };
      }
    }

    // 2. Migrar desde claves legacy si existen
    const rawForm = localStorage.getItem(LEGACY_KEYS.formData);
    const rawEmpresa = localStorage.getItem(LEGACY_KEYS.empresa);
    const rawStaff = localStorage.getItem(LEGACY_KEYS.staffList);
    const rawPrefs = localStorage.getItem(LEGACY_KEYS.preferences);
    const rawUpdatedAt = Number(localStorage.getItem(LEGACY_KEYS.formUpdatedAt) || "0");
    const currentHistoryId = localStorage.getItem(LEGACY_KEYS.currentHistoryId) || null;

    const hasAnyLegacy = Boolean(rawForm || rawEmpresa || rawStaff || rawPrefs);

    return {
      hasPersistedData: hasAnyLegacy,
      state: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        updatedAtMs: rawUpdatedAt || (hasAnyLegacy ? 1 : 0),
        formData: rawForm ? normalizeFormData(JSON.parse(rawForm)) : normalizeFormData(null),
        empresa: rawEmpresa ? normalizeEmpresa(JSON.parse(rawEmpresa)) : normalizeEmpresa(null),
        staffList: rawStaff ? normalizeStaffList(JSON.parse(rawStaff)) : [...INITIAL_STAFF],
        preferences: rawPrefs
          ? normalizePreferences(JSON.parse(rawPrefs))
          : normalizePreferences(null),
        currentHistoryId,
      },
    };
  } catch (err) {
    console.warn("Aviso leyendo almacenamiento local:", err);
    return {
      hasPersistedData: false,
      state: {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        updatedAtMs: 0,
        formData: normalizeFormData(null),
        empresa: normalizeEmpresa(null),
        staffList: [...INITIAL_STAFF],
        preferences: normalizePreferences(null),
        currentHistoryId: null,
      },
    };
  }
}

/**
 * Guarda de forma segura en localStorage con manejo de cuota y compatibilidad legacy
 */
export function saveWorkspaceToLocalStorage(
  state: PersistedUserState,
  uid?: string | null
): boolean {
  const payload: PersistedUserState = {
    ...state,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    updatedAtMs: state.updatedAtMs || Date.now(),
  };

  let savedAll = true;
  const userKey = getUserStateStorageKey(uid);

  const trySet = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  };

  // Claves individuales legacy (para compatibilidad con módulos existentes)
  if (!trySet(LEGACY_KEYS.preferences, JSON.stringify(payload.preferences))) savedAll = false;
  if (payload.preferences.lastEmailRecipient) {
    trySet(LEGACY_KEYS.lastEmailRecipient, payload.preferences.lastEmailRecipient);
  }
  if (!trySet(LEGACY_KEYS.formData, JSON.stringify(payload.formData))) savedAll = false;
  if (!trySet(LEGACY_KEYS.empresa, JSON.stringify(payload.empresa))) savedAll = false;
  if (!trySet(LEGACY_KEYS.staffList, JSON.stringify(payload.staffList))) savedAll = false;
  trySet(LEGACY_KEYS.formUpdatedAt, String(payload.updatedAtMs));
  if (payload.currentHistoryId) {
    trySet(LEGACY_KEYS.currentHistoryId, payload.currentHistoryId);
  }
  if (payload.empresa.logoUrl) {
    saveLogoToStorage(payload.empresa.logoUrl);
  }

  // Clave unificada por usuario (si excede cuota por imágenes grandes, guarda versión ligera sin duplicar firmas; IndexedDB + Servidor conservan el 100%)
  if (!trySet(userKey, JSON.stringify(payload))) {
    const compactPayload: PersistedUserState = {
      ...payload,
      formData: {
        ...payload.formData,
        firmasTrabajadores: {},
      },
    };
    if (!trySet(userKey, JSON.stringify(compactPayload))) {
      savedAll = false;
    }
  }

  return savedAll;
}

/**
 * Guarda el workspace completo en IndexedDB (sin límite estricto de 5MB)
 */
export async function saveWorkspaceToIDB(
  state: PersistedUserState,
  uid?: string | null
): Promise<void> {
  const userKey = getUserStateStorageKey(uid);
  const record = {
    ...state,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    updatedAt: new Date(state.updatedAtMs || Date.now()).toISOString(),
  };

  await Promise.all([
    saveAppSettingsToIDB(userKey, record),
    saveAppSettingsToIDB("ats_draft_backup", record),
  ]);
}

/**
 * Recupera el workspace más reciente desde IndexedDB
 */
export async function loadWorkspaceFromIDB(
  uid?: string | null
): Promise<PersistedUserState | null> {
  try {
    const userKey = getUserStateStorageKey(uid);
    const [userScoped, legacyDraft] = await Promise.all([
      getAppSettingsFromIDB<any>(userKey),
      getAppSettingsFromIDB<any>("ats_draft_backup"),
    ]);

    const candidates = [userScoped, legacyDraft].filter(
      (c): c is Record<string, any> => Boolean(c && typeof c === "object" && c.formData)
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const timeA = Number(a.updatedAtMs) || (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = Number(b.updatedAtMs) || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return timeB - timeA;
    });

    const best = candidates[0];
    const resolvedTs =
      Number(best.updatedAtMs) || (best.updatedAt ? new Date(best.updatedAt).getTime() : 1);

    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      updatedAtMs: resolvedTs,
      formData: normalizeFormData(best.formData),
      empresa: normalizeEmpresa(best.empresa),
      staffList: normalizeStaffList(best.staffList),
      preferences: normalizePreferences(best.preferences),
      currentHistoryId:
        typeof best.currentHistoryId === "string" ? best.currentHistoryId : null,
    };
  } catch (err) {
    console.warn("Aviso leyendo workspace desde IndexedDB:", err);
    return null;
  }
}

/**
 * Obtiene el estado persistido del usuario desde la base de datos del servidor
 */
export async function fetchUserStateFromServer(
  idToken: string | null
): Promise<PersistedUserState | null> {
  if (!idToken || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return null;
  }
  try {
    const res = await fetch("/api/user-state", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.state) return null;

    const raw = data.state;
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      updatedAtMs: Number(raw.updatedAtMs) || 1,
      formData: normalizeFormData(raw.formData),
      empresa: normalizeEmpresa(raw.empresa),
      staffList: normalizeStaffList(raw.staffList),
      preferences: normalizePreferences(raw.preferences),
      currentHistoryId:
        typeof raw.currentHistoryId === "string" ? raw.currentHistoryId : null,
    };
  } catch {
    return null;
  }
}

/**
 * Envía el estado persistido del usuario a la base de datos del servidor
 */
export async function saveUserStateToServer(
  state: PersistedUserState,
  idToken: string | null,
  options?: { keepalive?: boolean }
): Promise<boolean> {
  if (!idToken || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return false;
  }
  try {
    const res = await fetch("/api/user-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ state }),
      keepalive: Boolean(options?.keepalive),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene el historial sincronizado del servidor para restaurarlo al cargar la app
 */
export async function fetchSyncedHistoryFromServer(
  idToken?: string | null
): Promise<ATSHistoryRecord[]> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return [];
  }
  try {
    const headers: Record<string, string> = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const res = await fetch("/api/sync-ats", {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.success && Array.isArray(data.records)) {
      return data.records;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Elimina un registro de historial en el servidor para evitar que reaparezca al recargar
 */
export async function deleteSyncedHistoryRecordOnServer(
  recordId: string,
  idToken?: string | null
): Promise<void> {
  if (!recordId || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  try {
    const headers: Record<string, string> = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    await fetch(`/api/sync-ats/${encodeURIComponent(recordId)}`, {
      method: "DELETE",
      headers,
    });
  } catch {
    // Silencioso en modo sin conexión o hosting estático
  }
}

/**
 * Hidrata el espacio de trabajo combinando LocalStorage, IndexedDB y Servidor,
 * seleccionando la versión más reciente sin sobrescribir cambios reales del usuario.
 */
export async function hydrateWorkspaceAcrossLayers(
  uid: string | null,
  idToken: string | null
): Promise<{
  state: PersistedUserState | null;
  source: "server" | "indexeddb" | "localStorage" | "none";
}> {
  const localSnap = loadLocalWorkspaceSync(uid);
  const [idbSnap, serverSnap] = await Promise.all([
    loadWorkspaceFromIDB(uid),
    fetchUserStateFromServer(idToken),
  ]);

  const candidates: Array<{
    source: "server" | "indexeddb" | "localStorage";
    state: PersistedUserState;
    ts: number;
  }> = [];

  if (localSnap.hasPersistedData) {
    candidates.push({
      source: "localStorage",
      state: localSnap.state,
      ts: localSnap.state.updatedAtMs || 1,
    });
  }
  if (idbSnap) {
    candidates.push({
      source: "indexeddb",
      state: idbSnap,
      ts: idbSnap.updatedAtMs || 1,
    });
  }
  if (serverSnap) {
    candidates.push({
      source: "server",
      state: serverSnap,
      ts: serverSnap.updatedAtMs || 1,
    });
  }

  if (candidates.length === 0) {
    return { state: null, source: "none" };
  }

  candidates.sort((a, b) => b.ts - a.ts);
  const winner = candidates[0];

  // Fusionar directorio de personal desde todas las capas para no perder trabajadores ni firmas
  let mergedStaff = winner.state.staffList;
  for (let i = 1; i < candidates.length; i++) {
    mergedStaff = mergeStaffLists(mergedStaff, candidates[i].state.staffList);
  }

  const finalState: PersistedUserState = {
    ...winner.state,
    staffList: mergedStaff,
  };

  return {
    state: finalState,
    source: winner.source,
  };
}

/**
 * Recuerda el último correo usado en el inicio de sesión
 */
export function getSavedLoginEmail(): string {
  try {
    return localStorage.getItem(LEGACY_KEYS.lastLoginEmail) || "";
  } catch {
    return "";
  }
}

export function saveLoginEmail(email: string): void {
  try {
    const clean = email.trim();
    if (clean) {
      localStorage.setItem(LEGACY_KEYS.lastLoginEmail, clean);
    }
  } catch {}
}

/**
 * Exporta un respaldo completo (borrador actual, directorio, empresa, preferencias e historial)
 */
export function exportFullWorkspaceBackup(
  state: PersistedUserState,
  historyRecords: ATSHistoryRecord[]
): void {
  const backupBundle = {
    app: "ATS Seguridad Laboral - Respaldo Completo",
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workspace: state,
    historyRecords,
  };

  const blob = new Blob([JSON.stringify(backupBundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `Respaldo_Completo_ATS_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Valida y analiza un archivo JSON de respaldo completo o historial
 */
export function parseFullWorkspaceBackup(jsonText: string): {
  success: boolean;
  workspace?: PersistedUserState;
  historyRecords?: ATSHistoryRecord[];
  error?: string;
} {
  try {
    // Parseo seguro descartando claves de prototype pollution
    const parsed = JSON.parse(jsonText, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return undefined;
      }
      return value;
    });

    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "El archivo JSON no contiene un formato válido." };
    }

    let workspace: PersistedUserState | undefined;
    let historyRecords: ATSHistoryRecord[] | undefined;

    if (parsed.workspace && typeof parsed.workspace === "object") {
      workspace = {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        updatedAtMs: Date.now(),
        formData: normalizeFormData(parsed.workspace.formData),
        empresa: normalizeEmpresa(parsed.workspace.empresa),
        staffList: normalizeStaffList(parsed.workspace.staffList),
        preferences: normalizePreferences(parsed.workspace.preferences),
        currentHistoryId:
          typeof parsed.workspace.currentHistoryId === "string"
            ? parsed.workspace.currentHistoryId
            : null,
      };
    }

    if (Array.isArray(parsed.historyRecords)) {
      historyRecords = parsed.historyRecords.filter(
        (r: any) => r && typeof r === "object" && r.formData
      );
    } else if (Array.isArray(parsed.records)) {
      historyRecords = parsed.records.filter(
        (r: any) => r && typeof r === "object" && r.formData
      );
    } else if (Array.isArray(parsed)) {
      historyRecords = parsed.filter(
        (r: any) => r && typeof r === "object" && r.formData
      );
    }

    if (!workspace && (!historyRecords || historyRecords.length === 0)) {
      return {
        success: false,
        error: "No se encontraron datos de ATS ni preferencias en el archivo seleccionado.",
      };
    }

    return {
      success: true,
      workspace,
      historyRecords,
    };
  } catch {
    return {
      success: false,
      error: "No se pudo leer el archivo JSON. Verifique que no esté dañado.",
    };
  }
}
