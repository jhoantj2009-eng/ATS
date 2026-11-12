import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingSyncRecordsFromIDB,
  markRecordsAsSyncedInIDB,
  migrateLocalStorageToIDB,
} from "../utils/indexedDB";
import { getHistoryRecords, markRecordsAsSyncedLocally } from "../utils/historyStorage";
import { ATSHistoryRecord } from "../types";

export interface NetworkSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedTime: Date | null;
  syncNow: () => Promise<{ success: boolean; syncedCount: number; error?: string }>;
  refreshPendingCount: () => Promise<number>;
}

export function useNetworkSync(): NetworkSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Calcula y actualiza el conteo de registros pendientes
  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      // 1. Verificar registros pendientes en IndexedDB
      const idbPending = await getPendingSyncRecordsFromIDB();

      // 2. Verificar también en localStorage por compatibilidad
      const localRecords = getHistoryRecords();
      const localPending = localRecords.filter((r) => r.syncStatus === "pending");

      // Unir IDs únicos
      const idSet = new Set<string>();
      idbPending.forEach((r) => idSet.add(r.id));
      localPending.forEach((r) => idSet.add(r.id));

      const count = idSet.size;
      setPendingCount(count);
      return count;
    } catch (err) {
      console.warn("Error refreshing pending sync count:", err);
      return 0;
    }
  }, []);

  // Función principal de sincronización
  const syncNow = useCallback(async (): Promise<{
    success: boolean;
    syncedCount: number;
    error?: string;
  }> => {
    if (isSyncingRef.current) {
      return { success: false, syncedCount: 0, error: "Sincronización ya en curso" };
    }

    if (!navigator.onLine) {
      return { success: false, syncedCount: 0, error: "Sin conexión a internet" };
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // 1. Obtener registros pendientes de IndexedDB y de localStorage
      const idbPending = await getPendingSyncRecordsFromIDB();
      const localRecords = getHistoryRecords();
      const localPending = localRecords.filter((r) => r.syncStatus === "pending");

      // Combinar sin duplicados
      const recordMap = new Map<string, ATSHistoryRecord>();
      idbPending.forEach((r) => recordMap.set(r.id, r));
      localPending.forEach((r) => {
        if (!recordMap.has(r.id)) {
          recordMap.set(r.id, r);
        }
      });

      const pendingList = Array.from(recordMap.values());

      if (pendingList.length === 0) {
        setIsSyncing(false);
        isSyncingRef.current = false;
        setPendingCount(0);
        return { success: true, syncedCount: 0 };
      }

      // 2. Enviar lote al backend
      const response = await fetch("/api/sync-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: pendingList }),
      });

      if (!response.ok) {
        throw new Error(`Error en servidor: ${response.status}`);
      }

      const result = await response.json();
      const syncedIds: string[] = result.syncedIds || pendingList.map((p) => p.id);

      // 3. Marcar como sincronizados en IndexedDB y localStorage sin duplicar
      await markRecordsAsSyncedInIDB(syncedIds);
      markRecordsAsSyncedLocally(syncedIds);

      setLastSyncedTime(new Date());
      await refreshPendingCount();

      return {
        success: true,
        syncedCount: syncedIds.length,
      };
    } catch (err: any) {
      console.error("Error during ATS synchronization:", err);
      return {
        success: false,
        syncedCount: 0,
        error: err?.message || "Error al sincronizar con el servidor",
      };
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [refreshPendingCount]);

  // Inicialización y listeners de red
  useEffect(() => {
    // Migrar datos de localStorage a IndexedDB en el primer arranque
    migrateLocalStorageToIDB().then(() => {
      refreshPendingCount();
    });

    const handleOnline = () => {
      setIsOnline(true);
      // Cuando regresa la conexión, sincronizar automáticamente los datos pendientes
      setTimeout(() => {
        syncNow();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Si ya estamos online, sincronizar al iniciar
    if (navigator.onLine) {
      syncNow();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedTime,
    syncNow,
    refreshPendingCount,
  };
}
