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

const PDF_FIXED_WIDTH_PX = 816;
const PDF_MIN_PAGE_HEIGHT_PX = 1056;

const CRITICAL_PDF_CSS = `
  html, body {
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #111827 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    overflow: visible !important;
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .ats-document-root {
    font-family: Arial, Helvetica, sans-serif !important;
    color: #111827 !important;
    line-height: 1.15 !important;
    font-size: 7.4pt !important;
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: ${PDF_FIXED_WIDTH_PX}px !important;
    background: #ffffff !important;
  }
  .ats-page, .ats-page-sheet {
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-height: ${PDF_MIN_PAGE_HEIGHT_PX}px !important;
    height: auto !important;
    margin: 0 !important;
    padding: 10px 28px 12px 28px !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
  .ats-table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
    margin-bottom: 3px !important;
    background-color: #ffffff !important;
    box-sizing: border-box !important;
  }
  .ats-table th, .ats-table td {
    border: 1px solid #2b2b2b !important;
    font-family: Arial, Helvetica, sans-serif !important;
    box-sizing: border-box !important;
    overflow-wrap: break-word !important;
    word-break: break-word !important;
    vertical-align: middle !important;
  }
  .ats-header-cell {
    background-color: #e9ecef !important;
    font-weight: 700 !important;
    text-align: center !important;
    color: #111827 !important;
  }
  .ats-header-cell-left {
    background-color: #e9ecef !important;
    font-weight: 700 !important;
    text-align: left !important;
    color: #111827 !important;
  }
  .ats-section-banner {
    background-color: #e9ecef !important;
    border: 1px solid #2b2b2b !important;
    font-weight: 800 !important;
    text-align: center !important;
    text-transform: uppercase !important;
    color: #111827 !important;
  }
  .ats-declaration-cell {
    background-color: #e9ecef !important;
    border: 1px solid #2b2b2b !important;
    padding: 2.5px 4px !important;
    font-size: 6.6pt !important;
    line-height: 1.13 !important;
    text-align: justify !important;
    color: #111827 !important;
  }
  .ats-signature-box {
    height: 32px !important;
    max-height: 32px !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
  }
  .ats-signature-img {
    max-height: 30px !important;
    max-width: 120px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 auto !important;
  }
  .no-print {
    display: none !important;
  }
`;

/**
 * Convierte imágenes SVG inline (data:image/svg+xml) a PNG data URL para que
 * WebKit / iOS Safari + html2canvas las rendericen con nitidez y sin colapsos.
 */
async function rasterizeSvgImagesInContainer(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const src = img.getAttribute("src") || "";
          if (!src.startsWith("data:image/svg+xml")) {
            resolve();
            return;
          }

          const loader = new Image();
          loader.onload = () => {
            try {
              const targetW = Math.max(loader.naturalWidth || 280, 280) * 2;
              const targetH = Math.max(loader.naturalHeight || 72, 72) * 2;
              const canvas = document.createElement("canvas");
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, targetW, targetH);
                ctx.drawImage(loader, 0, 0, targetW, targetH);
                const pngUrl = canvas.toDataURL("image/png");
                if (pngUrl && pngUrl.startsWith("data:image/png")) {
                  img.setAttribute("src", pngUrl);
                }
              }
            } catch {
              // Mantener SVG original si falla la rasterización
            }
            resolve();
          };
          loader.onerror = () => resolve();
          loader.src = src;
          setTimeout(resolve, 1200);
        })
    )
  );
}

/**
 * Espera a que todas las imágenes dentro de un contenedor estén totalmente cargadas y decodificadas
 */
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const finish = () => {
            if (typeof img.decode === "function") {
              img.decode().catch(() => {}).finally(resolve);
            } else {
              resolve();
            }
          };

          if (img.complete && img.naturalWidth > 0) {
            finish();
          } else {
            img.onload = () => finish();
            img.onerror = () => resolve();
            setTimeout(resolve, 1800);
          }
        })
    )
  );
}

/**
 * Captura un elemento de página estricto Letter (816px ancho fijo desktop)
 * montándolo fuera de pantalla con layout completo (sin width:0 ni opacity:0)
 * para que iPhone / iOS Safari renderice idéntico a PC sin compresión ni pérdida de CSS.
 */
async function captureIsolatedPageElement(
  sourceElement: HTMLElement
): Promise<HTMLCanvasElement> {
  await waitForImagesToLoad(sourceElement);

  const sandboxHost = document.createElement("div");
  sandboxHost.id = "ats-pdf-sandbox-host";
  sandboxHost.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: -12000px !important;
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: ${PDF_FIXED_WIDTH_PX}px !important;
    height: auto !important;
    overflow: visible !important;
    pointer-events: none !important;
    z-index: -9999 !important;
    opacity: 1 !important;
    visibility: visible !important;
    background: #ffffff !important;
  `;

  const sandbox = document.createElement("div");
  sandbox.id = "ats-pdf-sandbox-container";
  sandbox.style.cssText = `
    position: relative !important;
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-height: ${PDF_MIN_PAGE_HEIGHT_PX}px !important;
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
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
  `;

  // Estilo autocontenido garantizado dentro del sandbox
  const inlineStyleTag = document.createElement("style");
  inlineStyleTag.setAttribute("data-ats-pdf-critical", "true");
  inlineStyleTag.textContent = CRITICAL_PDF_CSS;

  // Clonar el contenido de la página en el sandbox
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-width: ${PDF_FIXED_WIDTH_PX}px !important;
    max-width: ${PDF_FIXED_WIDTH_PX}px !important;
    min-height: ${PDF_MIN_PAGE_HEIGHT_PX}px !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    background-color: #ffffff !important;
    overflow: visible !important;
    transform: none !important;
    display: block !important;
    visibility: visible !important;
    font-family: Arial, Helvetica, sans-serif !important;
  `;

  // Homologar páginas hijas dentro del clon
  const pageSheets = clone.querySelectorAll<HTMLElement>(".ats-page, .ats-page-sheet");
  pageSheets.forEach((p) => {
    p.style.width = `${PDF_FIXED_WIDTH_PX}px`;
    p.style.minWidth = `${PDF_FIXED_WIDTH_PX}px`;
    p.style.maxWidth = `${PDF_FIXED_WIDTH_PX}px`;
    p.style.minHeight = `${PDF_MIN_PAGE_HEIGHT_PX}px`;
    p.style.height = "auto";
    p.style.padding = "10px 28px 12px 28px";
    p.style.boxSizing = "border-box";
    p.style.margin = "0";
    p.style.border = "none";
    p.style.boxShadow = "none";
    p.style.background = "#ffffff";
    p.style.overflow = "visible";
    p.style.display = "flex";
    p.style.flexDirection = "column";
    p.style.justifyContent = "space-between";
    p.style.fontFamily = "Arial, Helvetica, sans-serif";
  });

  // Asegurar tablas rígidas sin colapso
  const tables = clone.querySelectorAll<HTMLTableElement>(".ats-table");
  tables.forEach((t) => {
    t.style.tableLayout = "fixed";
    t.style.width = "100%";
    t.style.maxWidth = "100%";
    t.style.borderCollapse = "collapse";
    t.style.boxSizing = "border-box";
  });

  // Ocultar elementos interactivos que no deben salir en el PDF
  const nonPrintEls = clone.querySelectorAll<HTMLElement>(".no-print");
  nonPrintEls.forEach((el) => {
    el.style.display = "none";
  });

  sandbox.appendChild(inlineStyleTag);
  sandbox.appendChild(clone);
  sandboxHost.appendChild(sandbox);
  document.body.appendChild(sandboxHost);

  try {
    await rasterizeSvgImagesInContainer(sandbox);
    await waitForImagesToLoad(sandbox);

    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }

    // Dos frames de renderizado para garantizar layout completo en iOS WebKit
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const captureHeight = Math.max(
      sandbox.scrollHeight,
      sandbox.offsetHeight,
      PDF_MIN_PAGE_HEIGHT_PX
    );

    // Calcular escala segura para no exceder el límite de memoria canvas en iOS (~12MP)
    const maxSafePixels = 11_500_000;
    const desiredScale = 2;
    const rawPixels = PDF_FIXED_WIDTH_PX * desiredScale * (captureHeight * desiredScale);
    const safeScale =
      rawPixels > maxSafePixels
        ? Math.max(1.25, Math.sqrt(maxSafePixels / (PDF_FIXED_WIDTH_PX * captureHeight)))
        : desiredScale;

    const canvas = await html2canvas(sandbox, {
      scale: safeScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      width: PDF_FIXED_WIDTH_PX,
      height: captureHeight,
      windowWidth: PDF_FIXED_WIDTH_PX,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (clonedDoc) => {
        // Ocultar la app principal dentro del clon para que su CSS móvil (390px) no interfiera
        const clonedRoot = clonedDoc.getElementById("root");
        if (clonedRoot) {
          clonedRoot.style.display = "none";
        }

        // Inyectar CSS crítico en el <head> clonado para blindar estilos en Página 1 y 2
        if (!clonedDoc.head.querySelector('style[data-ats-pdf-critical="true"]')) {
          const headStyle = clonedDoc.createElement("style");
          headStyle.setAttribute("data-ats-pdf-critical", "true");
          headStyle.textContent = CRITICAL_PDF_CSS;
          clonedDoc.head.appendChild(headStyle);
        }

        clonedDoc.documentElement.style.cssText = `
          width: ${PDF_FIXED_WIDTH_PX}px !important;
          min-width: ${PDF_FIXED_WIDTH_PX}px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        `;

        clonedDoc.body.style.cssText = `
          width: ${PDF_FIXED_WIDTH_PX}px !important;
          min-width: ${PDF_FIXED_WIDTH_PX}px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
          font-family: Arial, Helvetica, sans-serif !important;
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        `;

        const clonedHost = clonedDoc.getElementById("ats-pdf-sandbox-host");
        if (clonedHost) {
          clonedHost.style.cssText = `
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: ${PDF_FIXED_WIDTH_PX}px !important;
            min-width: ${PDF_FIXED_WIDTH_PX}px !important;
            max-width: ${PDF_FIXED_WIDTH_PX}px !important;
            height: auto !important;
            overflow: visible !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 1 !important;
            background: #ffffff !important;
          `;
        }

        const clonedSandbox = clonedDoc.getElementById("ats-pdf-sandbox-container");
        if (clonedSandbox) {
          clonedSandbox.style.cssText = `
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: ${PDF_FIXED_WIDTH_PX}px !important;
            min-width: ${PDF_FIXED_WIDTH_PX}px !important;
            max-width: ${PDF_FIXED_WIDTH_PX}px !important;
            min-height: ${PDF_MIN_PAGE_HEIGHT_PX}px !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
          `;
        }
      },
    });

    return canvas;
  } finally {
    if (document.body.contains(sandboxHost)) {
      document.body.removeChild(sandboxHost);
    }
  }
}

/**
 * Genera el documento PDF Letter de exactamente 2 páginas idéntico a la impresión oficial,
 * garantizando que en dispositivos móviles (iPhone/Android) y computadores
 * salga 100% completo, sin cortes laterales, encabezados solapados ni filas partidas.
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

  const page1Isolated =
    document.getElementById("ats-export-page-1") ||
    document.getElementById("ats-export-target-p1");
  const page2Isolated =
    document.getElementById("ats-export-page-2") ||
    document.getElementById("ats-export-target-p2");

  const addCanvasPageToPdf = (canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL("image/jpeg", 0.96);
    const canvasAspect = canvas.height / Math.max(1, canvas.width);
    const letterAspect = pdfHeight / pdfWidth;

    if (canvasAspect <= letterAspect * 1.02) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    } else {
      // Ajustar proporcionalmente dentro de la hoja Carta sin deformar ni partir filas
      const fittedWidth = pdfHeight / canvasAspect;
      const offsetX = Math.max(0, (pdfWidth - fittedWidth) / 2);
      pdf.addImage(imgData, "JPEG", offsetX, 0, fittedWidth, pdfHeight, undefined, "FAST");
    }
  };

  if (page1Isolated && page2Isolated) {
    const canvas1 = await captureIsolatedPageElement(page1Isolated);
    addCanvasPageToPdf(canvas1);

    pdf.addPage("letter", "portrait");
    const canvas2 = await captureIsolatedPageElement(page2Isolated);
    addCanvasPageToPdf(canvas2);
  } else {
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
 */
export async function exportToPDF(
  elementId: string = "ats-export-target",
  filename: string = "ATS_F-SST-045.pdf"
): Promise<PDFExportResult> {
  const doc = await generatePDFDocument(elementId, filename);

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
