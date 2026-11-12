import { DEFAULT_LOGO_SVG } from "../data/defaultData";

export const ATS_SAVED_LOGO_KEY = "ats_saved_logo";

/**
 * Obtiene el logotipo institucional oficial DCM persistido con fallback robusto
 */
export function getSavedLogo(): string {
  try {
    const saved = localStorage.getItem(ATS_SAVED_LOGO_KEY);
    if (saved && saved.trim().length > 0) {
      // Si el logo almacenado corresponde a formatos antiguos, actualizar de inmediato al oficial DCM
      if (
        saved.includes("inveasas") ||
        saved.includes("Atom%20Orbits") ||
        saved.includes("INVESTIGACI%C3%93N") ||
        saved.includes("unsplash.com") ||
        (saved.includes("dcmBlue") && !saved.includes("shieldGrad"))
      ) {
        localStorage.setItem(ATS_SAVED_LOGO_KEY, DEFAULT_LOGO_SVG);
        return DEFAULT_LOGO_SVG;
      }
      return saved;
    }
  } catch (e) {
    console.error("Error reading saved logo:", e);
  }
  // Garantizar que el logotipo oficial por defecto sea DCM
  try {
    localStorage.setItem(ATS_SAVED_LOGO_KEY, DEFAULT_LOGO_SVG);
  } catch {
    // No-op
  }
  return DEFAULT_LOGO_SVG;
}

/**
 * Guarda el logotipo institucional para que quede fijo de manera permanente en el navegador
 * y lo sincroniza con el servidor central para que cualquier enlace compartido lo muestre.
 */
export function saveLogoToStorage(logoUrl: string): void {
  try {
    localStorage.setItem(ATS_SAVED_LOGO_KEY, logoUrl || DEFAULT_LOGO_SVG);
  } catch (e) {
    console.error("Error saving logo to localStorage:", e);
  }
}

/**
 * Sincroniza la plantilla y logotipo oficial con el servidor central
 * para que persista permanentemente en todos los enlaces compartidos y nuevos dispositivos.
 */
export async function syncCompanyTemplateToServer(empresa: any): Promise<boolean> {
  try {
    const res = await fetch("/api/company-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(empresa),
    });
    return res.ok;
  } catch (e) {
    console.error("Error syncing template to server:", e);
    return false;
  }
}

/**
 * Obtiene la plantilla oficial guardada en el servidor central
 */
export async function fetchCompanyTemplateFromServer(): Promise<any | null> {
  try {
    const res = await fetch("/api/company-config");
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.empresa) {
      return data.empresa;
    }
  } catch (e) {
    console.error("Error fetching template from server:", e);
  }
  return null;
}

/**
 * Optimiza y redimensiona cualquier imagen de logotipo (PNG, JPG, WebP, SVG)
 * para garantizar máxima nitidez sin sobrecargar el almacenamiento local.
 */
export async function optimizeLogoFile(file: File): Promise<string> {
  // Si es un archivo SVG vectorial, leer directamente
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Imágenes bitmap (JPG, PNG, WebP): procesar en Canvas a resolución óptima
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar si supera dimensiones recomendadas para membretes SST (480x180 px)
        const maxW = 500;
        const maxH = 200;
        let targetW = img.naturalWidth || img.width;
        let targetH = img.naturalHeight || img.height;

        if (targetW > maxW || targetH > maxH) {
          const ratio = Math.min(maxW / targetW, maxH / targetH);
          targetW = Math.round(targetW * ratio);
          targetH = Math.round(targetH * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Mantener PNG para conservar transparencias
        const optimized = canvas.toDataURL("image/png", 0.92);
        resolve(optimized);
      };
      img.onerror = () => {
        resolve(reader.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve(DEFAULT_LOGO_SVG);
    };
    reader.readAsDataURL(file);
  });
}
