import React, { useState } from "react";
import { X, Table, Bot, FileText, CheckCircle2, Copy, Check, Sparkles, Smartphone, Code2 } from "lucide-react";

interface AppSheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSheetGuideModal: React.FC<AppSheetGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"sheets" | "appsheet" | "script" | "pdf">("sheets");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const scriptCode = `/**
 * GOOGLE APPS SCRIPT: Generador de 10 Pasos ATS con Gemini IA para AppSheet
 * Pega este código en Extensiones > Apps Script de tu Google Sheet
 */

const GEMINI_API_KEY = "PEGA_AQUI_TU_API_KEY_DE_GEMINI";
const MODEL_NAME = "gemini-3.8-flash";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const idATS = data.idATS;
    const tareaGeneral = data.tareaGeneral;
    const tipoTrabajo = data.tipoTrabajo || "Trabajo en Alturas";
    const detalleLabor = data.detalleLabor || "";
    const altura = data.altura || "12 MTS";

    if (!idATS || !tareaGeneral) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Faltan datos obligatorios" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Llamada a Gemini API
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent?key=" + GEMINI_API_KEY;
    
    const prompt = "Genera exactamente 10 pasos lógicos secuenciales para un Análisis de Trabajo Seguro (ATS) oficial.\\n" +
      "Tarea: " + tareaGeneral + "\\n" +
      "Tipo: " + tipoTrabajo + "\\n" +
      "Detalle: " + detalleLabor + "\\n" +
      "Altura: " + altura + "\\n\\n" +
      "Responde ÚNICAMENTE un JSON con un array de 10 objetos, cada uno con:\\n" +
      "- 'numero': 1 al 10\\n" +
      "- 'paso': Procedimiento ordenado\\n" +
      "- 'riesgo': Peligro o riesgo asociado\\n" +
      "- 'controles': Controles preventivos, protectivos y reactivos\\n" +
      "- 'responsable': Cargo sugerido (ej. 'Técnico Ejecutor', 'Vigía', 'Supervisor SST')";

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    const aiText = result.candidates[0].content.parts[0].text;
    const pasosArray = JSON.parse(aiText);

    // 2. Insertar los 10 pasos en la hoja ATS_Detalle_Pasos
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPasos = ss.getSheetByName("ATS_Detalle_Pasos");

    pasosArray.forEach((item, index) => {
      const idPaso = "PASO-" + idATS + "-" + (index + 1);
      sheetPasos.appendRow([
        idPaso,            // ID_Paso (Key)
        idATS,             // ID_ATS (Ref)
        item.numero || (index + 1), // Numero_Paso
        item.paso,         // Procedimiento_Paso
        item.riesgo,       // Riesgo_Asociado
        item.controles,    // Controles_Requeridos
        item.responsable   // Cargo_Responsable
      ]);
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: pasosArray.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Guía de Implementación en Google AppSheet & Sheets
                </h3>
                <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Automatización con IA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Paso a paso para estructurar las tablas, el Bot con IA y las firmas digitales en AppSheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("sheets")}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "sheets"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Table className="w-4 h-4" />
            1. Tablas en Google Sheets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("appsheet")}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "appsheet"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            2. Configuración en AppSheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "script"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bot className="w-4 h-4" />
            3. Script de Automatización IA (Gemini)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pdf")}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "pdf"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            4. Plantilla de Informe PDF (F-SST-044)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: GOOGLE SHEETS */}
          {activeTab === "sheets" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
                <strong>Base de datos relacional:</strong> Crea un libro de Google Sheets con 4 hojas clave. Esto permite separar la información general del ATS, los 10 pasos dinámicos, el personal y las firmas digitales.
              </div>

              {/* Table 1 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Hoja 1: ATS_Cabecera (Datos generales del permiso)</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">Llave primaria: ID_ATS</span>
                </div>
                <div className="p-4 bg-white text-xs space-y-2">
                  <p className="text-slate-600">Columnas recomendadas (Fila 1 de encabezados):</p>
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-200 overflow-x-auto">
                    ID_ATS | Fecha_Diligenciamiento | Hora | Lugar | Tipo_Trabajo | Tarea_General | Detalle_Labor | Altura_Aprox | Permiso_Desde_Fecha | Permiso_Desde_Hora | Permiso_Hasta_Fecha | Permiso_Hasta_Hora | Observaciones | Supervisor_Nombre | Supervisor_Cedula | Supervisor_Firma | Estado_Permiso | Timestamp
                  </div>
                </div>
              </div>

              {/* Table 2 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Hoja 2: ATS_Detalle_Pasos (La matriz de 10 filas con IA)</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">Relación Hijo con ATS_Cabecera</span>
                </div>
                <div className="p-4 bg-white text-xs space-y-2">
                  <p className="text-slate-600">Columnas para almacenar los 10 pasos generados automáticamente:</p>
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-200 overflow-x-auto">
                    ID_Paso | ID_ATS | Numero_Paso | Procedimiento_Paso | Riesgo_Asociado | Controles_Requeridos | Cargo_Responsable
                  </div>
                  <ul className="list-disc pl-5 text-slate-600 space-y-1 pt-1 text-[11px]">
                    <li><strong>ID_Paso:</strong> Llave única (ej. fórmula UNIQUEID()).</li>
                    <li><strong>ID_ATS:</strong> Columna tipo <code>Ref</code> a la tabla <code>ATS_Cabecera</code>. Marca <code>IsPartOf = TRUE</code> para que los 10 pasos pertenezcan directamente al ATS.</li>
                  </ul>
                </div>
              </div>

              {/* Table 3 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Hoja 3: Personal (Directorio de trabajadores modificable)</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">Flexibilidad de personal</span>
                </div>
                <div className="p-4 bg-white text-xs space-y-2">
                  <p className="text-slate-600">Permite editar, añadir o retirar trabajadores en cualquier momento:</p>
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-200 overflow-x-auto">
                    ID_Personal | Nombres_Apellidos | Cedula | Cargo | ARL | Estado_Activo
                  </div>
                </div>
              </div>

              {/* Table 4 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Hoja 4: ATS_Trabajadores_Firmas (Firmas táctiles digitales)</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">Firmas 100% en pantalla</span>
                </div>
                <div className="p-4 bg-white text-xs space-y-2">
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-200 overflow-x-auto">
                    ID_Firma | ID_ATS | ID_Personal | Nombres_Apellidos | Cedula | Firma_Digital | Fecha_Hora_Firma
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    En AppSheet, la columna <code>Firma_Digital</code> se define como tipo <strong>Signature</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPSHEET CONFIG */}
          {activeTab === "appsheet" && (
            <div className="space-y-4 text-xs text-slate-700 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 leading-relaxed">
                <strong>Configuración esencial en AppSheet Studio:</strong> Sigue estos puntos clave para activar las firmas táctiles y la relación padre-hijo.
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Paso 1: Configurar la Firma Digital Táctil
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Ve a <strong>Data &gt; Columns</strong> en la tabla <code>ATS_Cabecera</code> (para el supervisor) y <code>ATS_Trabajadores_Firmas</code> (para los operarios):
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                    <li>Selecciona la columna <code>Supervisor_Firma</code> y cambia su tipo a <strong>Signature</strong>.</li>
                    <li>En el móvil, AppSheet abrirá automáticamente un lienzo táctil a pantalla completa donde el usuario firma con el dedo o lápiz óptico y se guarda como imagen PNG en Google Drive.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Paso 2: Relación 1 a N (ATS_Cabecera con ATS_Detalle_Pasos)
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    En la tabla <code>ATS_Detalle_Pasos</code>:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                    <li>Columna <code>ID_ATS</code>: Tipo <strong>Ref</strong>, ReferencedTableName = <code>ATS_Cabecera</code>.</li>
                    <li>Activa la casilla <strong>IsPartOf = TRUE</strong>.</li>
                    <li>Esto creará automáticamente en <code>ATS_Cabecera</code> la columna virtual <code>Related ATS_Detalle_Pasoss</code>, mostrando la matriz de 10 filas incrustada en el formulario del ATS.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Paso 3: Selección de Personal Dinámica
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Para asignar los responsables de los pasos o de la labor:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                    <li>En la columna <code>Cargo_Responsable</code> de los pasos, puedes usar tipo <strong>Ref</strong> hacia la tabla <code>Personal</code>, o un tipo <code>Enum</code> con la fórmula <code>Personal[Nombres_Apellidos]</code> en Valid_If.</li>
                    <li>Esto garantiza que si añades o quitas personal en la tabla, las opciones se actualizan en tiempo real.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCRIPT AUTOMATIZACION */}
          {activeTab === "script" && (
            <div className="space-y-4 text-xs text-slate-700 animate-in fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 leading-relaxed">
                <strong>¿Cómo funciona la automatización con IA?</strong>
                <p className="mt-1">
                  Cuando el usuario guarda el ATS en AppSheet con la <em>Tarea General</em> y <em>Detalle</em>, un <strong>Bot de AppSheet</strong> envía un Webhook a este Google Apps Script, el cual consulta Gemini (modelo <code>gemini-3.8-flash</code>) y escribe automáticamente los 10 pasos lógicos en la hoja <code>ATS_Detalle_Pasos</code>.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Código Google Apps Script (Apps Script Webhook):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(scriptCode, 1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copiado al portapapeles
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Código
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                {scriptCode}
              </pre>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h5 className="font-bold text-slate-900">Configuración del Bot en AppSheet:</h5>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-[11px]">
                  <li>En AppSheet, ve a <strong>Automation &gt; Bots</strong> y crea un nuevo Bot: <em>"Generar Matriz ATS con IA"</em>.</li>
                  <li><strong>Event:</strong> Data Change en tabla <code>ATS_Cabecera</code>, opción <code>Adds_Only</code>.</li>
                  <li><strong>Step:</strong> Selecciona <em>"Call a webhook"</em>.</li>
                  <li><strong>URL:</strong> Pega la URL de tu Web App de Apps Script (desplegada con acceso <em>Anyone</em>).</li>
                  <li><strong>HTTP Method:</strong> POST.</li>
                  <li><strong>Body Template:</strong>
                    <code className="block bg-white p-2 mt-1 rounded border border-slate-300 font-mono text-[10px]">
                      {`{"idATS": "<<[ID_ATS]>>", "tareaGeneral": "<<[Tarea_General]>>", "tipoTrabajo": "<<[Tipo_Trabajo]>>", "detalleLabor": "<<[Detalle_Labor]>>", "altura": "<<[Altura_Aprox]>>"}`}
                    </code>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: PDF TEMPLATE */}
          {activeTab === "pdf" && (
            <div className="space-y-4 text-xs text-slate-700 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-900 leading-relaxed">
                <strong>Plantilla de Documento en Google Docs para AppSheet:</strong>
                <p className="mt-1">
                  Para que AppSheet descargue el PDF exactamente igual al formato oficial F-SST-044, crea un archivo de Google Docs con la misma tabla y encabezados, usando las etiquetas de AppSheet:
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-900">Etiquetas de la Matriz de Pasos en Google Docs:</h4>
                <p className="text-slate-600">
                  En la fila de la tabla donde van los 10 pasos, se usa la expresión <code>&lt;&lt;Start: [Related ATS_Detalle_Pasoss]&gt;&gt;</code>:
                </p>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                  <div><strong>&lt;&lt;Start: [Related ATS_Detalle_Pasoss]&gt;&gt;</strong></div>
                  <div>Columna 1: &lt;&lt;[Procedimiento_Paso]&gt;&gt;</div>
                  <div>Columna 2: &lt;&lt;[Riesgo_Asociado]&gt;&gt;</div>
                  <div>Columna 3: &lt;&lt;[Controles_Requeridos]&gt;&gt;</div>
                  <div>Columna 4: &lt;&lt;[Cargo_Responsable]&gt;&gt;</div>
                  <div><strong>&lt;&lt;End&gt;&gt;</strong></div>
                </div>

                <h4 className="font-bold text-slate-900 pt-2">Etiquetas de Firmas en Google Docs:</h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                  <div>Firma del Supervisor: <code>&lt;&lt;[Supervisor_Firma]&gt;&gt;</code></div>
                  <div>Firmas de los Trabajadores Ejecutores:</div>
                  <div><code>&lt;&lt;Start: [Related ATS_Trabajadores_Firmass]&gt;&gt;</code></div>
                  <div>&lt;&lt;[Nombres_Apellidos]&gt;&gt; | &lt;&lt;[Cedula]&gt;&gt; | &lt;&lt;[Firma_Digital]&gt;&gt;</div>
                  <div><code>&lt;&lt;End&gt;&gt;</code></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            Esta aplicación web ya incluye el motor completo con Gemini IA, firmas táctiles y exportación PDF lista para usar.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
