import React, { useState, useEffect } from "react";
import { ATSFormData, EmpresaConfig } from "../types";
import {
  generatePDFDocument,
  canSharePDFFile,
  sharePDFFile,
  GeneratedPDFDoc,
} from "../utils/pdfExport";
import {
  Mail,
  Send,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
  RefreshCw,
  Sparkles,
  Paperclip,
} from "lucide-react";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ATSFormData;
  empresa: EmpresaConfig;
  onShowToast: (msg: string) => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  formData,
  empresa,
  onShowToast,
}) => {
  // Pre-fill recipient email from localStorage or supervisor or default
  const [recipient, setRecipient] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("ats_last_email_recipient");
      if (saved) return saved;
    } catch {}
    return "jhoantj2009@gmail.com";
  });

  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // PDF Generation & Sending states
  const [pdfDoc, setPdfDoc] = useState<GeneratedPDFDoc | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if Web Share API with files is available (mobile / tablet / desktop Chrome/Safari)
  const isNativeShareSupported = canSharePDFFile();

  const cleanDate = (formData.fechaDiligenciamiento || "hoy").replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = `ATS_${empresa.codigoFormato || "F-SST-045"}_${cleanDate}.pdf`;

  // Initialize or reset subject & message when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultSubject = `ATS ${empresa.codigoFormato || "F-SST-045"} - ${
        formData.tareaGeneral || "Labor Técnica"
      } - ${formData.fechaDiligenciamiento || new Date().toLocaleDateString("es-CO")}`;

      const workersCount = formData.trabajadores?.length || 0;
      const supervisorName = formData.supervisor?.nombre || "Supervisor SST";

      const defaultMessage = `Estimado equipo / Coordinación SST,\n\nSe adjunta el formato oficial de Análisis de Trabajo Seguro (ATS) diligenciado y firmado digitalmente.\n\n• Formato: ${empresa.codigoFormato || "F-SST-045"} (Versión ${empresa.version || "01"})\n• Empresa: ${empresa.nombreEmpresa || "DCM"}\n• Tarea: ${formData.tareaGeneral || "Mantenimiento general"}\n• Lugar / Área: ${formData.lugar || "Área de operaciones"}\n• Altura aproximada: ${formData.alturaAproximada || "No aplica"}\n• Personal autorizado: ${workersCount} trabajador(es)\n• Coordinador / Supervisor SST: ${supervisorName}\n• Estado: Diligenciado y firmado digitalmente\n\nQuedamos atentos a cualquier inquietud.\n\nSaludos cordiales,\nEquipo de Seguridad y Salud en el Trabajo (SG-SST)`;

      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setSendSuccess(false);
      setErrorMessage(null);
      setTestPreviewUrl(null);

      // Pre-generate the PDF document smoothly
      preparePDF();
    }
  }, [isOpen, formData, empresa]);

  const preparePDF = async (): Promise<GeneratedPDFDoc | null> => {
    setIsGeneratingDoc(true);
    setErrorMessage(null);
    try {
      const doc = await generatePDFDocument("ats-export-target", filename);
      setPdfDoc(doc);
      return doc;
    } catch (err: any) {
      console.error("Error pre-generating PDF:", err);
      setErrorMessage("No se pudo generar el documento PDF. Intente nuevamente.");
      return null;
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const validateEmails = (input: string): boolean => {
    const list = input.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return list.every((e) => emailRegex.test(e));
  };

  // Direct backend email send
  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!recipient.trim()) {
      setErrorMessage("Por favor ingrese al menos un correo de destino.");
      return;
    }

    if (!validateEmails(recipient)) {
      setErrorMessage("Por favor verifique las direcciones de correo ingresadas (ej: usuario@ejemplo.com).");
      return;
    }

    try {
      localStorage.setItem("ats_last_email_recipient", recipient.trim());
    } catch {}

    setIsSending(true);
    setErrorMessage(null);

    try {
      // Ensure PDF is ready
      let currentDoc = pdfDoc;
      if (!currentDoc) {
        currentDoc = await preparePDF();
        if (!currentDoc) {
          throw new Error("No se pudo compilar el PDF para el envío.");
        }
      }

      const response = await fetch("/api/send-pdf-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient.trim(),
          subject: subject.trim(),
          message: message.trim(),
          pdfBase64: currentDoc.base64,
          filename: currentDoc.filename,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Error al enviar el correo.");
      }

      setSendSuccess(true);
      if (data.previewUrl) {
        setTestPreviewUrl(data.previewUrl);
      }
      onShowToast(`¡PDF enviado por correo a: ${recipient}!`);
    } catch (err: any) {
      console.error("Error sending email:", err);
      setErrorMessage(err?.message || "Ocurrió un error al enviar el correo. Puedes usar la opción de Compartir o Mailto.");
    } finally {
      setIsSending(false);
    }
  };

  // Web Share API handler (Native Gmail / Outlook / Mail app with attached PDF)
  const handleNativeShare = async () => {
    try {
      let currentDoc = pdfDoc;
      if (!currentDoc) {
        currentDoc = await preparePDF();
        if (!currentDoc) {
          throw new Error("No se pudo compilar el PDF.");
        }
      }

      const file = new File([currentDoc.blob], currentDoc.filename, {
        type: "application/pdf",
      });

      const shared = await sharePDFFile(file, subject, message);
      if (shared) {
        onShowToast("¡Formato ATS compartido exitosamente con la app de correo!");
        onClose();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Native share error:", err);
        setErrorMessage("No se pudo abrir el compartidor del sistema. Puedes usar el envío directo o mailto.");
      }
    }
  };

  // Mailto fallback
  const handleMailto = () => {
    // Also trigger instant download of the PDF so the user has the file right in their downloads ready to attach
    if (pdfDoc?.blobUrl) {
      const a = document.createElement("a");
      a.href = pdfDoc.blobUrl;
      a.download = pdfDoc.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 1500);
      onShowToast("Descargando PDF para que puedas adjuntarlo en tu cliente de correo...");
    }

    const mailtoUrl = `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(
      subject.trim()
    )}&body=${encodeURIComponent(message.trim())}`;

    window.location.href = mailtoUrl;
  };

  // Download local copy
  const handleDownloadCopy = () => {
    if (pdfDoc?.blobUrl) {
      const a = document.createElement("a");
      a.href = pdfDoc.blobUrl;
      a.download = pdfDoc.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 1500);
      onShowToast("¡Copia del PDF descargada!");
    } else {
      preparePDF().then((doc) => {
        if (doc) {
          const a = document.createElement("a");
          a.href = doc.blobUrl;
          a.download = doc.filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
          }, 1500);
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Enviar PDF al Correo</span>
                <span className="text-[10px] font-mono bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded border border-blue-400/30">
                  {empresa.codigoFormato || "F-SST-045"}
                </span>
              </h3>
              <p className="text-xs text-blue-100/80">
                Entrega del formato oficial de 2 páginas con firmas y matriz de riesgos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ATTACHMENT STATUS CHIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-slate-800 truncate block">
                {filename}
              </span>
              <span className="text-[11px] text-slate-500">
                {isGeneratingDoc ? (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Compilando 2 páginas Carta...
                  </span>
                ) : (
                  <span>
                    ✓ Documento listo ({pdfDoc?.sizeKb ? `${pdfDoc.sizeKb} KB` : "Carta 1:1"})
                  </span>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadCopy}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1"
            title="Descargar una copia local en tu dispositivo"
          >
            <Download className="w-3 h-3" />
            <span>Descargar copia</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {sendSuccess ? (
            /* SUCCESS STATE */
            <div className="py-6 px-4 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  ¡Correo enviado exitosamente!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  El documento oficial ATS en formato PDF de 2 páginas fue entregado a:
                  <br />
                  <strong className="text-blue-700">{recipient}</strong>
                </p>
              </div>

              {testPreviewUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-md mx-auto space-y-2">
                  <p className="text-[11px]">
                    <strong>Vista previa disponible:</strong> Puedes visualizar el correo real enviado con el PDF adjunto haciendo clic abajo:
                  </p>
                  <a
                    href={testPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                  >
                    <span>Ver Correo en Ethereal Web</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSendSuccess(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Enviar a otro correo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* SEND FORM */
            <form onSubmit={handleSendEmail} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              {/* RECIPIENT INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Destinatario(s) / Correo Electrónico *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Separar con comas para múltiples)
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="ej: supervisor@empresa.com, sst@ejemplo.com"
                    required
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-blue-500 focus:border-blue-500 font-medium text-slate-800 bg-white"
                  />
                </div>

                {/* Quick suggestions */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Sugerencias rápidas:</span>
                  <button
                    type="button"
                    onClick={() => setRecipient("jhoantj2009@gmail.com")}
                    className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors font-medium"
                  >
                    jhoantj2009@gmail.com
                  </button>
                  {formData.supervisor?.nombre && (
                    <button
                      type="button"
                      onClick={() => {
                        const supEmail = `coordinacion.sst@${(empresa.nombreEmpresa || "empresa")
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "")}.com`;
                        setRecipient(supEmail);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors font-medium truncate max-w-[180px]"
                    >
                      {formData.supervisor.nombre}
                    </button>
                  )}
                </div>
              </div>

              {/* SUBJECT INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del correo"
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-blue-500 focus:border-blue-500 font-medium text-slate-800 bg-white"
                />
              </div>

              {/* MESSAGE TEXTAREA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje / Resumen Ejecutivo
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escriba un mensaje personalizado..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-blue-500 focus:border-blue-500 font-medium text-slate-800 bg-white leading-relaxed"
                />
              </div>

              {/* ACTIONS CONTAINER */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                {/* Main Send Button */}
                <button
                  type="submit"
                  disabled={isSending || isGeneratingDoc || !recipient.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Enviando correo con PDF adjunto...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-amber-300" />
                      <span>Enviar PDF por Correo Ahora</span>
                    </>
                  )}
                </button>

                {/* Alternative Delivery Options */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {isNativeShareSupported && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      disabled={isSending || isGeneratingDoc}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                      title="Abre directamente Gmail, Outlook u otra app con el PDF ya adjunto"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Abrir en Gmail / App Móvil</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleMailto}
                    disabled={isSending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                    title="Abre tu cliente de correo local pre-llenando asunto y cuerpo"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                    <span>Abrir en mi Correo (mailto)</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
