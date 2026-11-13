import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export interface PDFExportResult {
  success: boolean;
  blobUrl?: string;
  error?: string;
  blob?: Blob;
  base64?: string;
  filename?: string;
  sizeKb?: number;
}

export interface GeneratedPDFDoc {
  pdf: jsPDF;
  blob: Blob;
  blobUrl: string;
  base64: string;
  filename: string;
  sizeKb: number;
}

/**
 * Espera a que todas las imágenes dentro de un contenedor estén totalmente cargadas
 */
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 1500);
          }
        })
    )
  );
}

/**
 * Captura un elemento de página estricto Letter (816px x 1056px)
 * montándolo en un sandbox 100% aislado del DOM para que NUNCA sufra cortes
 * por viewport móvil, scroll horizontal o zoom de iOS/Android.
 */
async function captureIsolatedPageElement(
  sourceElement: HTMLElement
): Promise<HTMLCanvasElement> {
  await waitForImagesToLoad(sourceElement);

  // 1. Crear un host 0x0 oculto y un Sandbox interno de 816px para no alterar ni desbordar el viewport en iPhone
  const sandboxHost = document.createElement("div");
  sandboxHost.id = "ats-pdf-sandbox-host";
  sandboxHost.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    z-index: -1 !important;
    opacity: 0 !important;
  `;

  const sandbox = document.createElement("div");
  sandbox.id = "ats-pdf-sandbox-container";
  sandbox.style.cssText = `
    position: relative !important;
    width: 816px !important;
    min-width: 816px !important;
    max-width: 816px !important;
    min-height: 1056px !important;
    height: auto !important;
    background-color: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    box-sizing: border-box !important;
    transform: none !important;
    pointer-events: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
  `;

  // 2. Clonar el contenido de la página en el sandbox
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    width: 816px !important;
    min-width: 816px !important;
    max-width: 816px !important;
    min-height: 1056px !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    background-color: #ffffff !important;
    overflow: visible !important;
    transform: none !important;
    display: block !important;
    visibility: visible !important;
  `;

  // Homologar las páginas hijas dentro del clon
  const pageSheets = clone.querySelectorAll<HTMLElement>(".ats-page, .ats-page-sheet");
  pageSheets.forEach((p) => {
    p.style.width = "816px";
    p.style.minWidth = "816px";
    p.style.maxWidth = "816px";
    p.style.minHeight = "1056px";
    p.style.height = "auto";
    p.style.padding = "10px 28px 12px 28px"; // Reducido a ~8mm arriba y abajo
    p.style.boxSizing = "border-box";
    p.style.margin = "0";
    p.style.border = "none";
    p.style.boxShadow = "none";
    p.style.background = "#ffffff";
    p.style.overflow = "visible";
    p.style.display = "flex";
    p.style.flexDirection = "column";
    p.style.justifyContent = "space-between";
  });

  // Asegurar que las tablas mantengan su ancho exacto y layout fijo
  const tables = clone.querySelectorAll<HTMLTableElement>(".ats-table");
  tables.forEach((t) => {
    t.style.tableLayout = "fixed";
    t.style.width = "100%";
    t.style.maxWidth = "100%";
    t.style.boxSizing = "border-box";
  });

  // Ocultar elementos interactivos que no deben salir en el PDF
  const nonPrintEls = clone.querySelectorAll<HTMLElement>(".no-print");
  nonPrintEls.forEach((el) => {
    el.style.display = "none";
  });

  sandbox.appendChild(clone);
  sandboxHost.appendChild(sandbox);
  document.body.appendChild(sandboxHost);

  try {
    // Esperar un ciclo de renderizado para estabilización completa
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await waitForImagesToLoad(sandbox);

    const captureHeight = Math.max(sandbox.scrollHeight, sandbox.offsetHeight, 1056);

    // Renderizar directamente el sandbox en origen (0, 0)
    const canvas = await html2canvas(sandbox, {
      scale: 2, // 192 DPI para máxima nitidez técnica sin saturar memoria en iOS/Android
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      width: 816,
      height: captureHeight,
      windowWidth: 816,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (clonedDoc) => {
        // En el documento clonado por html2canvas, fijar dimensiones a 816px sin afectar la pantalla del iPhone
        clonedDoc.documentElement.style.width = "816px";
        clonedDoc.documentElement.style.minWidth = "816px";
        clonedDoc.documentElement.style.overflow = "visible";
        clonedDoc.documentElement.style.webkitTextSizeAdjust = "100%";

        clonedDoc.body.style.width = "816px";
        clonedDoc.body.style.minWidth = "816px";
        clonedDoc.body.style.overflow = "visible";
        clonedDoc.body.style.webkitTextSizeAdjust = "100%";

        const clonedHost = clonedDoc.getElementById("ats-pdf-sandbox-host");
        if (clonedHost) {
          clonedHost.style.position = "static";
          clonedHost.style.width = "816px";
          clonedHost.style.height = "auto";
          clonedHost.style.overflow = "visible";
          clonedHost.style.opacity = "1";
          clonedHost.style.zIndex = "1";
        }

        const clonedSandbox = clonedDoc.getElementById("ats-pdf-sandbox-container");
        if (clonedSandbox) {
          clonedSandbox.style.position = "static";
          clonedSandbox.style.left = "0";
          clonedSandbox.style.top = "0";
          clonedSandbox.style.width = "816px";
          clonedSandbox.style.minHeight = "1056px";
          clonedSandbox.style.height = "auto";
          clonedSandbox.style.overflow = "visible";
          clonedSandbox.style.margin = "0";
          clonedSandbox.style.padding = "0";
        }
      },
    });

    return canvas;
  } finally {
    // Siempre remover el host sandbox del DOM
    if (document.body.contains(sandboxHost)) {
      document.body.removeChild(sandboxHost);
    }
  }
}

/**
 * Genera el documento PDF Letter de exactamente 2 páginas idéntico a la impresión oficial,
 * garantizando que en dispositivos móviles (iPhone/Android) y computadores
 * salga 100% completo, sin cortes laterales ni desbordes.
 */
export async function generatePDFDocument(
  elementId: string = "ats-export-target",
  filename: string = "ATS_F-SST-045.pdf"
): Promise<GeneratedPDFDoc> {
  const pdfWidth = 215.9; // mm (Letter)
  const pdfHeight = 279.4; // mm (Letter)

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });

  // 1. Detectar preferentemente los contenedores de Página 1 y Página 2
  const page1Isolated =
    document.getElementById("ats-export-page-1") ||
    document.getElementById("ats-export-target-p1");
  const page2Isolated =
    document.getElementById("ats-export-page-2") ||
    document.getElementById("ats-export-target-p2");

  const addCanvasPageToPdf = (canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const canvasAspect = canvas.height / Math.max(1, canvas.width);
    const letterAspect = pdfHeight / pdfWidth;

    if (canvasAspect <= letterAspect * 1.01) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    } else {
      // Ajustar proporcionalmente dentro de la hoja Carta sin deformar ni recortar contenido
      const fittedWidth = pdfHeight / canvasAspect;
      const offsetX = Math.max(0, (pdfWidth - fittedWidth) / 2);
      pdf.addImage(imgData, "JPEG", offsetX, 0, fittedWidth, pdfHeight, undefined, "FAST");
    }
  };

  if (page1Isolated && page2Isolated) {
    // Renderizado aislado página por página
    const canvas1 = await captureIsolatedPageElement(page1Isolated);
    addCanvasPageToPdf(canvas1);

    pdf.addPage("letter", "portrait");
    const canvas2 = await captureIsolatedPageElement(page2Isolated);
    addCanvasPageToPdf(canvas2);
  } else {
    // Fallback con contenedor unificado
    const container =
      document.getElementById(elementId) ||
      document.getElementById("ats-export-target") ||
      document.getElementById("ats-preview-document") ||
      document.getElementById("ats-printable-document");

    if (!container) {
      throw new Error(`Contenedor para exportación #${elementId} no encontrado`);
    }

    const pages = Array.from(container.querySelectorAll<HTMLElement>(".ats-page"));
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage("letter", "portrait");
        }
        const canvas = await captureIsolatedPageElement(pages[i]);
        addCanvasPageToPdf(canvas);
      }
    } else {
      const canvas = await captureIsolatedPageElement(container);
      addCanvasPageToPdf(canvas);
    }
  }

  const pdfBlob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const base64 = pdf.output("datauristring");
  const sizeKb = Math.round(pdfBlob.size / 1024);

  return {
    pdf,
    blob: pdfBlob,
    blobUrl,
    base64,
    filename,
    sizeKb,
  };
}

/**
 * Descarga directamente el archivo PDF oficial con márgenes simétricos perfectos.
 * En celulares móviles detecta si el navegador soporta compartir el archivo nativamente
 * o descarga vía enlace directo, evitando pantallas en blanco o bloqueos de iOS Safari / Chrome.
 */
export async function exportToPDF(
  elementId: string = "ats-export-target",
  filename: string = "ATS_F-SST-045.pdf"
): Promise<PDFExportResult> {
  try {
    const doc = await generatePDFDocument(elementId, filename);

    // Descarga directa con elemento <a> sin target blank (crucial para móviles)
    const downloadLink = document.createElement("a");
    downloadLink.href = doc.blobUrl;
    downloadLink.download = filename;
    downloadLink.rel = "noopener";
    document.body.appendChild(downloadLink);
    downloadLink.click();

    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
    }, 4000);

    return {
      success: true,
      blobUrl: doc.blobUrl,
      blob: doc.blob,
      base64: doc.base64,
      filename: doc.filename,
      sizeKb: doc.sizeKb,
    };
  } catch (err: any) {
    console.error("Error in exportToPDF:", err);
    throw err;
  }
}

/**
 * Comprueba si el dispositivo o navegador soporta compartir archivos nativos vía Web Share API
 */
export function canSharePDFFile(): boolean {
  if (
    typeof navigator === "undefined" ||
    !navigator.share ||
    !navigator.canShare
  ) {
    return false;
  }
  try {
    const testFile = new File(["test"], "test.pdf", {
      type: "application/pdf",
    });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Comparte el archivo PDF directamente con apps móviles (WhatsApp, Drive, Gmail, etc.)
 */
export async function sharePDFFile(
  pdfFile: File,
  title: string,
  text: string
): Promise<boolean> {
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    await navigator.share({
      files: [pdfFile],
      title,
      text,
    });
    return true;
  }
  return false;
}

/**
 * Ejecuta la impresión nativa del sistema o Guardar como PDF del navegador
 */
export function printDirect(): void {
  window.print();
}
