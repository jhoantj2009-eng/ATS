import React from "react";
import { ATSFormData, EmpresaConfig, PersonalMember } from "../types";
import { DEFAULT_LOGO_SVG, EPP_ITEMS } from "../data/defaultData";
import { PenTool } from "lucide-react";

interface ATSPrintFormatProps {
  formData: ATSFormData;
  empresa: EmpresaConfig;
  onOpenSignModal?: (target: { type: "worker" | "supervisor"; id?: string; name: string }) => void;
  onOpenCompanyModal?: () => void;
  id?: string;
  page?: 1 | 2 | "1" | "2" | "both";
}

// Auto-ajuste dinámico de fuente para nombres de trabajadores con control estricto de desbordamiento
function getDynamicWorkerNameStyle(name: string, workerCount: number): React.CSSProperties {
  const len = (name || "").trim().length;
  let fontSize = workerCount > 8 ? "6.2pt" : workerCount > 5 ? "6.7pt" : "7.2pt";
  let lineHeight = 1.12;

  if (len > 36) {
    fontSize = workerCount > 8 ? "5.2pt" : workerCount > 5 ? "5.6pt" : "6.0pt";
    lineHeight = 1.05;
  } else if (len > 26) {
    fontSize = workerCount > 8 ? "5.6pt" : workerCount > 5 ? "6.0pt" : "6.5pt";
    lineHeight = 1.08;
  } else if (len > 18) {
    fontSize = workerCount > 8 ? "5.9pt" : workerCount > 5 ? "6.3pt" : "6.8pt";
  }

  return {
    fontSize,
    lineHeight,
    overflowWrap: "break-word",
    wordBreak: "break-word",
    hyphens: "auto",
  };
}

// Auto-ajuste dinámico de fuente para cargos con control estricto de desbordamiento
function getDynamicCargoStyle(cargo: string, workerCount: number): React.CSSProperties {
  const len = (cargo || "").trim().length;
  let fontSize = workerCount > 8 ? "6.0pt" : workerCount > 5 ? "6.5pt" : "7.0pt";
  let lineHeight = 1.12;

  if (len > 30) {
    fontSize = workerCount > 8 ? "5.0pt" : workerCount > 5 ? "5.4pt" : "5.8pt";
    lineHeight = 1.05;
  } else if (len > 20) {
    fontSize = workerCount > 8 ? "5.5pt" : workerCount > 5 ? "5.9pt" : "6.4pt";
    lineHeight = 1.08;
  }

  return {
    fontSize,
    lineHeight,
    overflowWrap: "break-word",
    wordBreak: "break-word",
    hyphens: "auto",
  };
}

// Auto-ajuste dinámico de fuente para observaciones
function getDynamicObservationsStyle(text: string): React.CSSProperties {
  const len = (text || "").trim().length;
  let fontSize = "7.1pt";
  let lineHeight = 1.12;

  if (len > 320) {
    fontSize = "5.6pt";
    lineHeight = 1.04;
  } else if (len > 220) {
    fontSize = "6.0pt";
    lineHeight = 1.08;
  } else if (len > 120) {
    fontSize = "6.5pt";
    lineHeight = 1.10;
  }

  return {
    fontSize,
    lineHeight,
    overflowWrap: "break-word",
    wordBreak: "break-word",
    hyphens: "auto",
  };
}

// Auto-ajuste dinámico para el coordinador / supervisor SST
function getDynamicSupervisorStyle(nombre: string, cargo: string) {
  const nLen = (nombre || "").trim().length;
  const cLen = (cargo || "").trim().length;

  let nSize = "7.5pt";
  let nLine = 1.12;
  if (nLen > 34) {
    nSize = "6.2pt";
    nLine = 1.05;
  } else if (nLen > 24) {
    nSize = "6.8pt";
    nLine = 1.08;
  }

  let cSize = "6.8pt";
  let cLine = 1.12;
  if (cLen > 32) {
    cSize = "5.6pt";
    cLine = 1.05;
  } else if (cLen > 22) {
    cSize = "6.2pt";
    cLine = 1.08;
  }

  return {
    nameStyle: {
      fontSize: nSize,
      lineHeight: nLine,
      overflowWrap: "break-word" as const,
      wordBreak: "break-word" as const,
      hyphens: "auto" as const,
    },
    cargoStyle: {
      fontSize: cSize,
      lineHeight: cLine,
      overflowWrap: "break-word" as const,
      wordBreak: "break-word" as const,
      hyphens: "auto" as const,
    },
  };
}

export const ATSPrintFormat: React.FC<ATSPrintFormatProps> = ({
  formData,
  empresa,
  onOpenSignModal,
  onOpenCompanyModal,
  id = "ats-printable-document",
  page = "both" as 1 | 2 | "1" | "2" | "both",
}) => {
  const col1Epps = EPP_ITEMS.filter((i) => i.columna === 1);
  const col2Epps = EPP_ITEMS.filter((i) => i.columna === 2);
  const col3Epps = EPP_ITEMS.filter((i) => i.columna === 3);

  // Mostrar TODOS los trabajadores asignados al ATS (mínimo 3 filas vacías para mantener cuadrícula simétrica si hay menos)
  const workersDisplay: Array<PersonalMember | null> = [...formData.trabajadores];
  while (workersDisplay.length < 3) {
    workersDisplay.push(null);
  }

  // Garantizar exactamente 10 pasos operativos en la matriz ATS
  const pasosDisplay = [...formData.pasos.slice(0, 10)];
  while (pasosDisplay.length < 10) {
    const nextNum = pasosDisplay.length + 1;
    pasosDisplay.push({
      id: `p-${nextNum}`,
      numero: nextNum,
      paso: "",
      riesgo: "",
      controles: "",
      responsable: "",
    });
  }

  // ENCABEZADO INSTITUCIONAL OFICIAL UNIFICADO CON LOGO Y CONTROL DOCUMENTAL (Fijo en plantilla con código en ambas páginas)
  const renderMasterHeader = (pageNum: 1 | 2 = 1) => {
    // El logotipo oficial institucional DCM está fijado permanentemente en la plantilla técnica
    const logoToRender = empresa.logoUrl || DEFAULT_LOGO_SVG;

    return (
      <table className="ats-table seccion-contenedor" style={{ marginBottom: "2px", tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "23%" }} />
          <col style={{ width: "55%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <tbody>
          <tr>
            {/* Logo Corporativo Institucional Oficial DCM Fijo en Plantilla */}
            <td className="text-center bg-white" style={{ verticalAlign: "middle", padding: "1.5px 3px", position: "relative" }}>
              <div style={{ height: "38px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={logoToRender}
                  alt={empresa.nombreEmpresa || "Logo Oficial DCM"}
                  style={{
                    maxHeight: "36px",
                    maxWidth: "130px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>
            </td>

          {/* Título Oficial Central SST */}
          <td className="text-center align-middle font-bold" style={{ padding: "2px 4px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto" }}>
            <div style={{ fontSize: "7.8pt", textTransform: "uppercase", letterSpacing: "0.2px", lineHeight: 1.12, color: "#1f2937", overflowWrap: "break-word", wordBreak: "break-word" }}>
              SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
            </div>
            <div style={{ fontSize: "7pt", textTransform: "uppercase", letterSpacing: "0.5px", margin: "1px 0", color: "#4b5563" }}>
              {pageNum === 1 ? "FORMATO OFICIAL UNIFICADO" : "FORMATO OFICIAL UNIFICADO — CONTINUACIÓN"}
            </div>
            <div style={{ fontSize: "9pt", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.5px", lineHeight: 1.12, color: "#000000" }}>
              ANÁLISIS DE TRABAJO SEGURO (ATS){pageNum === 2 ? " (PÁG. 2)" : ""}
            </div>
          </td>

          {/* Control Documental Técnico (Resolución 4272/2021) - Fijo con el Logo */}
          <td className="p-0 text-[7pt] align-top text-left font-medium">
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0 }}>
              <colgroup>
                <col style={{ width: "48%" }} />
                <col style={{ width: "52%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px", color: "#374151", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    Código:
                  </td>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", padding: "1.5px 3px", fontWeight: "bold", color: "#000000", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    {empresa.codigoFormato || "F-SST-045"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px", color: "#374151", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    Versión:
                  </td>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", padding: "1.5px 3px", fontWeight: "bold", color: "#000000", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    {empresa.version || "01"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px", color: "#374151", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    Vigencia:
                  </td>
                  <td style={{ border: "none", borderBottom: "1px solid #2b2b2b", padding: "1.5px 3px", fontWeight: "bold", color: "#000000", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    {empresa.vigencia || "02/09/2026"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "none", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px", color: "#374151", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    Páginas:
                  </td>
                  <td style={{ border: "none", padding: "1.5px 3px", fontWeight: "bold", color: "#000000", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                    {pageNum} de 2
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

  const renderPage1 = () => (
    <div
      className="ats-page ats-page-sheet flex flex-col justify-between"
      style={{
        minHeight: "1056px",
        height: "auto",
        overflow: "visible",
        padding: "10px 28px 12px 28px",
      }}
    >
        <div>
          {/* ENCABEZADO INSTITUCIONAL OFICIAL DE LA PÁGINA 1 */}
          {renderMasterHeader(1)}

          {/* TABLA: DATOS GENERALES (FECHA, HORA, LUGAR) */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%", marginBottom: "2px" }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="ats-header-cell-left" style={{ padding: "1.5px 3px" }}>FECHA DILIGENCIAMIENTO:</td>
                <td className="font-semibold text-center" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  {formData.fechaDiligenciamiento || "—"}
                </td>
                <td className="ats-header-cell" style={{ padding: "1.5px 3px" }}>HORA:</td>
                <td className="font-semibold text-center" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  {formData.hora || "—"}
                </td>
                <td className="ats-header-cell" style={{ padding: "1.5px 3px" }}>LUGAR:</td>
                <td className="font-semibold" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  {formData.lugar || "—"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA: TIPO DE TRABAJO, ALTURA Y VIGENCIA DEL PERMISO */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%", marginBottom: "2px" }}>
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "42%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="ats-header-cell-left" style={{ padding: "1.5px 3px" }}>TIPO DE TRABAJO:</td>
                <td className="font-semibold uppercase" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  {formData.tipoTrabajo || "Trabajo en Alturas / Mantenimiento"}
                </td>
                <td className="ats-header-cell-left" style={{ padding: "1.5px 3px" }}>ALTURA APROXIMADA:</td>
                <td className="font-bold text-center" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  {formData.alturaAproximada || "12 MTS"}
                </td>
              </tr>
              <tr>
                <td className="ats-header-cell-left" style={{ padding: "1.5px 3px" }}>PERMISO VÁLIDO:</td>
                <td colSpan={3} style={{ padding: 0 }}>
                  <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0 }}>
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "38%" }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="ats-header-cell" style={{ border: "none", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px" }}>
                          DESDE:
                        </td>
                        <td style={{ border: "none", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                          <span style={{ fontWeight: 600 }}>{formData.permisoValidoDesdeFecha || formData.fechaDiligenciamiento || "—"}</span>
                          <span style={{ color: "#4b5563", marginLeft: "5px" }}>Hora:</span>{" "}
                          <span style={{ fontWeight: 600 }}>{formData.permisoValidoDesdeHora || "08:00"}</span>
                        </td>
                        <td className="ats-header-cell" style={{ border: "none", borderRight: "1px solid #2b2b2b", padding: "1.5px 3px" }}>
                          HASTA:
                        </td>
                        <td style={{ border: "none", padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                          <span style={{ fontWeight: 600 }}>{formData.permisoValidoHastaFecha || formData.fechaDiligenciamiento || "—"}</span>
                          <span style={{ color: "#4b5563", marginLeft: "5px" }}>Hora:</span>{" "}
                          <span style={{ fontWeight: 600 }}>{formData.permisoValidoHastaHora || "17:00"}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA: PERSONAL AUTORIZADO (TRABAJADORES EJECUTORES) */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%", marginBottom: "2px" }}>
            <colgroup>
              <col style={{ width: "35%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "27%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr>
                <td colSpan={4} className="ats-section-banner" style={{ padding: "1.5px 3px" }}>
                  PERMISO CONCEDIDO A LOS TRABAJADORES (PERSONAL AUTORIZADO)
                </td>
              </tr>
              <tr>
                <th className="ats-header-cell text-left" style={{ padding: "1.5px 3px" }}>NOMBRES Y APELLIDOS</th>
                <th className="ats-header-cell" style={{ padding: "1.5px 3px" }}>CÉDULA</th>
                <th className="ats-header-cell" style={{ padding: "1.5px 3px" }}>CARGO</th>
                <th className="ats-header-cell" style={{ padding: "1.5px 3px" }}>ARL</th>
              </tr>
            </thead>
            <tbody>
              {workersDisplay.map((worker, idx) => {
                const count = workersDisplay.length;
                const rowHeight = count > 8 ? "12px" : count > 5 ? "13.5px" : count > 3 ? "14.5px" : "15.5px";
                const cellPadding = count > 8 ? "1px 2px" : "1.2px 3px";
                const fontSize = count > 8 ? "6.2pt" : count > 5 ? "6.7pt" : "7.1pt";
                const nameStyle = getDynamicWorkerNameStyle(worker?.nombre || "", count);
                const cargoStyle = getDynamicCargoStyle(worker?.cargo || "", count);

                return (
                  <tr key={worker?.id || `w-${idx}`} style={{ height: rowHeight }}>
                    <td
                      className="text-left font-bold uppercase"
                      style={{
                        padding: cellPadding,
                        ...nameStyle,
                      }}
                    >
                      {worker ? worker.nombre : ""}
                    </td>
                    <td
                      className="text-center font-mono font-medium"
                      style={{
                        padding: cellPadding,
                        fontSize,
                        lineHeight: 1.12,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      {worker ? worker.cedula : ""}
                    </td>
                    <td
                      className="text-center"
                      style={{
                        padding: cellPadding,
                        ...cargoStyle,
                      }}
                    >
                      {worker ? worker.cargo : ""}
                    </td>
                    <td
                      className="text-center font-medium"
                      style={{
                        padding: cellPadding,
                        fontSize,
                        lineHeight: 1.12,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      {worker ? worker.arl : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TABLA: DESCRIPCIÓN Y PROCEDIMIENTO DE LA TAREA */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%", marginBottom: "2px" }}>
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "76%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="ats-header-cell-left align-top" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  DESCRIPCIÓN Y PROCEDIMIENTO DE LA TAREA:
                </td>
                <td className="align-top leading-snug" style={{ padding: "1.5px 3px", overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto" }}>
                  <div
                    className="font-bold text-[#111827]"
                    style={{
                      fontSize: (formData.tareaGeneral || "").length > 150 ? "6.8pt" : "7.2pt",
                      lineHeight: 1.12,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    {formData.tareaGeneral || "Mantenimiento preventivo e instalación en alturas"}
                  </div>
                  {formData.detalleLabor && (
                    <div
                      className="text-[#374151] mt-0.5"
                      style={{
                        fontSize: (formData.detalleLabor || "").length > 200 ? "6.2pt" : "6.8pt",
                        lineHeight: 1.10,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      <strong>Detalle operativo:</strong> {formData.detalleLabor}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA: MATRIZ DE RIESGOS Y CONTROLES OPERATIVOS (ATS) */}
          <table className="ats-table ats-matriz-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%", marginBottom: "2px" }}>
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr>
                <td colSpan={4} className="ats-section-banner" style={{ padding: "2px 4px", fontSize: "8.5px", lineHeight: 1.15 }}>
                  ANÁLISIS DE TRABAJO SEGURO - ATS (MATRIZ DE RIESGOS Y CONTROLES OPERATIVOS)
                </td>
              </tr>
              <tr>
                <th className="ats-header-cell" style={{ padding: "2px 4px", fontSize: "8.5px", lineHeight: 1.15 }}>SECUENCIA ORDENADA DE PASOS (PROCEDIMIENTO)</th>
                <th className="ats-header-cell" style={{ padding: "2px 4px", fontSize: "8.5px", lineHeight: 1.15 }}>PELIGROS / RIESGOS IDENTIFICADOS</th>
                <th className="ats-header-cell" style={{ padding: "2px 4px", fontSize: "8.5px", lineHeight: 1.15 }}>CONTROLES REQUERIDOS (PREVENTIVOS, PROTECTIVOS Y REACTIVOS)</th>
                <th className="ats-header-cell" style={{ padding: "2px 4px", fontSize: "8.5px", lineHeight: 1.15 }}>CARGO RESPONSABLE</th>
              </tr>
            </thead>
            <tbody>
              {pasosDisplay.map((p, idx) => (
                <tr key={p.id || idx} className="align-top">
                  <td
                    style={{
                      padding: "2px 4px",
                      fontSize: "8.5px",
                      lineHeight: 1.15,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    <span className="font-bold mr-1">{idx + 1}.</span>
                    {p.paso}
                  </td>
                  <td
                    className="text-[#1f2937]"
                    style={{
                      padding: "2px 4px",
                      fontSize: "8.5px",
                      lineHeight: 1.15,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    {p.riesgo}
                  </td>
                  <td
                    className="text-[#1f2937]"
                    style={{
                      padding: "2px 4px",
                      fontSize: "8.5px",
                      lineHeight: 1.15,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    {p.controles}
                  </td>
                  <td
                    className="text-center font-medium uppercase"
                    style={{
                      padding: "2px 4px",
                      fontSize: "8.5px",
                      lineHeight: 1.15,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      hyphens: "auto",
                    }}
                  >
                    {p.responsable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA 1 */}
        <div className="text-[6.8pt] text-[#4b5563] text-center pt-0.5 border-t border-[#9ca3af] flex justify-between px-1">
          <span>Formato Oficial {empresa.codigoFormato || "F-SST-045"} · Conforme a Resolución 4272 de 2021 y Decreto 1072 de 2015</span>
          <span className="font-bold text-black">Página 1 de 2</span>
        </div>
      </div>
    );

  const renderPage2 = () => (
    <div className="ats-page ats-page-sheet flex flex-col justify-between">
      <div>
        {/* ENCABEZADO INSTITUCIONAL OFICIAL DE LA PÁGINA 2 CON LOGO Y CONTROL DOCUMENTAL FIJO */}
        {renderMasterHeader(2)}

          {/* TABLA: ELEMENTOS DE PROTECCIÓN PERSONAL Y SISTEMAS CONTRA CAÍDAS */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "27.5%" }} />
              <col style={{ width: "5.83%" }} />
              <col style={{ width: "27.5%" }} />
              <col style={{ width: "5.83%" }} />
              <col style={{ width: "27.5%" }} />
              <col style={{ width: "5.84%" }} />
            </colgroup>
            <thead>
              <tr>
                <td colSpan={6} className="ats-section-banner text-[7.2pt] py-1" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  LOS SIGUIENTES ELEMENTOS DE PROTECCIÓN PERSONAL Y SISTEMAS DE PROTECCIÓN CONTRA CAÍDAS, DEBERÁN SER UTILIZADOS POR LOS TRABAJADORES DURANTE LA LABOR (MARQUE CON X)
                </td>
              </tr>
            </thead>
            <tbody>
              {col1Epps.map((item, idx) => {
                const item2 = col2Epps[idx];
                const item3 = col3Epps[idx];
                const activeCustomEpps = (formData.otrosEppsPersonalizados || [])
                  .filter((c) => c.seleccionado)
                  .map((c) => c.nombre.trim())
                  .filter(Boolean);
                const allOtrosList = [...activeCustomEpps];
                if (formData.otroEppTexto && !allOtrosList.includes(formData.otroEppTexto.trim())) {
                  allOtrosList.push(formData.otroEppTexto.trim());
                }
                const fullOtrosDisplay = allOtrosList.join(", ");

                const isChecked1 = Boolean(formData.eppsSeleccionados[item.id]);
                const isChecked2 = Boolean(item2 && formData.eppsSeleccionados[item2.id]);
                const isChecked3 = Boolean(
                  item3 && (
                    formData.eppsSeleccionados[item3.id] ||
                    (item3.id === "epp_otro" && (allOtrosList.length > 0 || Boolean(formData.otroEppTexto?.trim())))
                  )
                );
                const eppRowHeight = workersDisplay.length > 5 ? "14.5px" : workersDisplay.length > 3 ? "15.5px" : "17px";

                return (
                  <tr key={idx} style={{ height: eppRowHeight }}>
                    {/* Columna 1 */}
                    <td className="font-medium text-[7.2pt]" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                      {item.nombre}
                    </td>
                    <td className="text-center font-bold text-[7.8pt] ats-header-cell">
                      {isChecked1 ? "[ X ]" : "[   ]"}
                    </td>

                    {/* Columna 2 */}
                    <td className="font-medium text-[7.2pt]" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                      {item2?.nombre || ""}
                    </td>
                    <td className="text-center font-bold text-[7.8pt] ats-header-cell">
                      {item2 ? (isChecked2 ? "[ X ]" : "[   ]") : ""}
                    </td>

                    {/* Columna 3 */}
                    <td className="font-medium text-[7.2pt]" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                      {item3?.id === "epp_otro" ? (
                        <span>OTRO(S): {fullOtrosDisplay || ""}</span>
                      ) : (
                        item3?.nombre || ""
                      )}
                    </td>
                    <td className="text-center font-bold text-[7.8pt] ats-header-cell">
                      {item3 ? (isChecked3 ? "[ X ]" : "[   ]") : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TABLA: PREPARACIÓN DEL ÁREA (CHECKLIST CON COLUMNAS SI / NO / N.A.) */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "82%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="ats-header-cell text-left" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  PREPARACIÓN DEL ÁREA (MARQUE CON X)
                </th>
                <th className="ats-header-cell text-center">SI</th>
                <th className="ats-header-cell text-center">NO</th>
                <th className="ats-header-cell text-center">N.A.</th>
              </tr>
            </thead>
            <tbody>
              {formData.preparacionArea.map((item, idx) => {
                const areaRowHeight = workersDisplay.length > 5 ? "14.5px" : workersDisplay.length > 3 ? "15.5px" : "16.5px";
                return (
                  <tr key={idx} style={{ height: areaRowHeight }}>
                    <td className="text-left font-medium leading-tight text-[7.1pt]" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                      {item.descripcion}
                    </td>
                    <td className="text-center font-bold text-[7.8pt]">
                      {item.estado === "SI" ? "X" : ""}
                    </td>
                    <td className="text-center font-bold text-[7.8pt]">
                      {item.estado === "NO" ? "X" : ""}
                    </td>
                    <td className="text-center font-bold text-[7.8pt]">
                      {item.estado === "N.A." ? "X" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TABLA: DECLARACIÓN Y FIRMAS DE LOS TRABAJADORES (EJECUTORES) */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "35%" }} />
            </colgroup>
            <thead>
              <tr>
                <td colSpan={3} className="ats-declaration-cell" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  <strong style={{ display: "block", textTransform: "uppercase", marginBottom: "1.5px", fontWeight: 800, color: "#000000", fontSize: "7pt" }}>
                    FIRMA DE LOS TRABAJADORES (EJECUTORES) (NOMBRE, FIRMA Y NRO. DE CÉDULA)
                  </strong>
                  "HE SOCIALIZADO EL ANÁLISIS DE RIESGOS, COMPRENDO LAS PRECAUCIONES QUE DEBEN SER TOMADAS Y ME COMPROMETO A DESARROLLAR EL TRABAJO CUMPLIENDO LAS MEDIDAS DE SEGURIDAD ESTABLECIDAS, PROCURANDO EL AUTOCUIDADO, CUMPLIENDO PROCEDIMIENTOS Y EVITANDO ACTOS INSEGUROS, ASÍ COMO REPORTAR CUALQUIER DAÑO DE EQUIPOS O INCIDENTES Y/O ACCIDENTES PRESENTADOS."
                </td>
              </tr>
              <tr>
                <th className="ats-header-cell text-left">NOMBRES Y APELLIDOS</th>
                <th className="ats-header-cell">CÉDULA</th>
                <th className="ats-header-cell">FIRMA DIGITAL</th>
              </tr>
            </thead>
            <tbody>
              {workersDisplay.map((worker, idx) => {
                const signatureUrl = worker ? formData.firmasTrabajadores[worker.id] : null;
                const count = workersDisplay.length;
                const rowHeight = count > 8 ? "17px" : count > 6 ? "19.5px" : count > 4 ? "23px" : count > 3 ? "27px" : "32px";
                const sigBoxHeight = count > 8 ? "15.5px" : count > 6 ? "18px" : count > 4 ? "21px" : count > 3 ? "25px" : "30px";
                const sigImgMaxHeight = count > 8 ? "14px" : count > 6 ? "16.5px" : count > 4 ? "19px" : count > 3 ? "23px" : "28px";
                const cellPadding = count > 6 ? "1px 2.5px" : "2px 4px";
                const fontSize = count > 8 ? "6.3pt" : count > 6 ? "6.8pt" : "7.2pt";
                const nameStyle = getDynamicWorkerNameStyle(worker?.nombre || "", count);

                return (
                  <tr key={worker?.id || `ws-${idx}`} style={{ height: rowHeight }}>
                    <td
                      className="text-left font-bold uppercase"
                      style={{
                        padding: cellPadding,
                        ...nameStyle,
                      }}
                    >
                      {worker ? worker.nombre : ""}
                    </td>
                    <td
                      className="text-center font-mono font-medium"
                      style={{
                        padding: cellPadding,
                        fontSize,
                        lineHeight: 1.12,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      {worker ? worker.cedula : ""}
                    </td>
                    <td className="p-0 text-center align-middle" style={{ verticalAlign: "middle" }}>
                      {signatureUrl ? (
                        <div
                          className="ats-signature-box"
                          style={{
                            height: sigBoxHeight,
                            maxHeight: sigBoxHeight,
                          }}
                        >
                          <img
                            src={signatureUrl}
                            alt="Firma digital"
                            className="ats-signature-img"
                            style={{
                              maxHeight: sigImgMaxHeight,
                            }}
                          />
                        </div>
                      ) : worker && onOpenSignModal ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSignModal({
                              type: "worker",
                              id: worker.id,
                              name: worker.nombre || `Trabajador ${idx + 1}`,
                            })
                          }
                          className="no-print inline-flex items-center gap-1 text-[7pt] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          <PenTool className="w-2.5 h-2.5" />
                          <span>Firmar</span>
                        </button>
                      ) : (
                        <span className="text-[7pt] text-slate-300">Pendiente</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TABLA: OBSERVACIONES TÉCNICAS */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "80%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="ats-header-cell-left align-top" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  OBSERVACIONES:
                </td>
                <td
                  className="align-top text-[#1f2937]"
                  style={{
                    minHeight: "24px",
                    ...getDynamicObservationsStyle(formData.observaciones),
                  }}
                >
                  {formData.observaciones || "Sin observaciones adicionales reportadas al momento del inicio de la labor."}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA: DECLARACIÓN Y AUTORIZACIÓN DEL COORDINADOR / SUPERVISOR SST */}
          <table className="ats-table seccion-contenedor" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "35%" }} />
            </colgroup>
            <thead>
              <tr>
                <td colSpan={3} className="ats-declaration-cell" style={{ overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", lineHeight: 1.12 }}>
                  <strong style={{ display: "block", textTransform: "uppercase", marginBottom: "1.5px", fontWeight: 800, color: "#000000", fontSize: "7pt" }}>
                    FIRMA DEL COORDINADOR / SUPERVISOR SST Y/O JEFE (EMISOR) (NOMBRE, FIRMA Y NRO. DE CÉDULA)
                  </strong>
                  "PERSONALMENTE HE VERIFICADO LA PREPARACIÓN DE LOS EQUIPOS Y/O ÁREA PARA EL TRABAJO Y LO CONSIDERO SEGURO PARA PROCEDER CON SU EJECUCIÓN Y ME COMPROMETO A VELAR PARA QUE SE MANTENGAN DURANTE LA EJECUCIÓN DEL TRABAJO LAS CONDICIONES DE SEGURIDAD ESTABLECIDAS EN EL PRESENTE PERMISO, CON EL OBJETIVO DE EVITAR QUE OCURRAN ACCIDENTES Y/O INCIDENTES A LAS PERSONAS, EQUIPOS, INSTALACIONES, MEDIO AMBIENTE."
                </td>
              </tr>
              <tr>
                <th className="ats-header-cell text-left">NOMBRE Y CARGO</th>
                <th className="ats-header-cell">CÉDULA</th>
                <th className="ats-header-cell">FIRMA AUTORIZADA</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const { nameStyle, cargoStyle } = getDynamicSupervisorStyle(
                  formData.supervisor.nombre || "COORDINADOR SST",
                  formData.supervisor.cargo || "Coordinador / Supervisor SST"
                );
                return (
                  <tr style={{ height: "38px" }}>
                    <td className="font-bold uppercase text-left" style={{ padding: "2px 4px" }}>
                      <div className="text-black" style={nameStyle}>
                        {formData.supervisor.nombre || "COORDINADOR SST"}
                      </div>
                      <div className="font-semibold text-[#4b5563] normal-case mt-0.5" style={cargoStyle}>
                        {formData.supervisor.cargo || "Coordinador / Supervisor SST"}
                      </div>
                    </td>
                    <td
                      className="text-center font-mono"
                      style={{
                        padding: "2px 4px",
                        fontSize: "7.5pt",
                        lineHeight: 1.12,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      {formData.supervisor.cedula || "—"}
                    </td>
                    <td className="p-0 text-center align-middle" style={{ verticalAlign: "middle" }}>
                      {formData.supervisor.firmaUrl ? (
                        <div className="ats-signature-box">
                          <img
                            src={formData.supervisor.firmaUrl}
                            alt="Firma supervisor"
                            className="ats-signature-img"
                          />
                        </div>
                      ) : onOpenSignModal ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSignModal({
                              type: "supervisor",
                              name: formData.supervisor.nombre,
                            })
                          }
                          className="no-print inline-flex items-center gap-1 text-[7pt] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          <PenTool className="w-2.5 h-2.5" />
                          <span>Firma Coordinador</span>
                        </button>
                      ) : (
                        <span className="text-[7pt] text-slate-300">Pendiente</span>
                      )}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA 2 */}
        <div className="text-[6.8pt] text-[#4b5563] text-center pt-1 border-t border-[#9ca3af] flex justify-between px-1">
          <span>Formato Oficial {empresa.codigoFormato || "F-SST-045"} · Registro Oficial de Seguridad y Salud en el Trabajo</span>
          <span className="font-bold text-black">Fin del Documento · Página 2 de 2</span>
        </div>
      </div>
    );

  return (
    <div id={id} className="ats-document-root w-full print:p-0">
      {(page === 1 || page === "1") && renderPage1()}
      {(page === 2 || page === "2") && renderPage2()}
      {(page === "both" || !page) && (
        <>
          {renderPage1()}
          <div className="salto-pagina ats-page-break"></div>
          <div className="no-print my-6 flex items-center justify-center gap-3 text-slate-400 text-xs">
            <div className="h-px bg-slate-300 w-24"></div>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
              Continuación del Formato Unificado (Página 2)
            </span>
            <div className="h-px bg-slate-300 w-24"></div>
          </div>
          {renderPage2()}
        </>
      )}
    </div>
  );
};
