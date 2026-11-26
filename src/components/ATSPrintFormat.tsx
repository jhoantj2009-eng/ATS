import React from "react";
import { ATSFormData, EmpresaConfig, PersonalMember } from "../types";
import { DEFAULT_LOGO_SVG, EPP_ITEMS } from "../data/defaultData";
import { PenTool } from "lucide-react";

interface ATSPrintFormatProps {
  formData: ATSFormData;
  empresa: EmpresaConfig;
  onOpenSignModal?: (target: { type: "worker" | "supervisor" | "autorizador"; id?: string; name: string }) => void;
  onOpenCompanyModal?: () => void;
  id?: string;
  page?: 1 | 2 | "1" | "2" | "both";
}

const CELL_BORDER = "1px solid #2b2b2b";
const HEADER_BG = "#e9ecef";
const BASE_FONT = "Arial, Helvetica, sans-serif";

const BASE_TABLE_STYLE: React.CSSProperties = {
  width: "760px",
  minWidth: "760px",
  maxWidth: "760px",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  marginBottom: "2px",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
  fontFamily: BASE_FONT,
};

const HEADER_CELL_STYLE: React.CSSProperties = {
  border: CELL_BORDER,
  backgroundColor: HEADER_BG,
  fontWeight: 700,
  textAlign: "center",
  verticalAlign: "middle",
  color: "#111827",
  padding: "2px 4px",
  fontSize: "7.2pt",
  lineHeight: 1.14,
  boxSizing: "border-box",
};

const HEADER_CELL_LEFT_STYLE: React.CSSProperties = {
  ...HEADER_CELL_STYLE,
  textAlign: "left",
};

const BANNER_CELL_STYLE: React.CSSProperties = {
  border: CELL_BORDER,
  backgroundColor: HEADER_BG,
  fontWeight: 800,
  textAlign: "center",
  verticalAlign: "middle",
  textTransform: "uppercase",
  letterSpacing: "0.25px",
  padding: "2.5px 5px",
  fontSize: "7.4pt",
  lineHeight: 1.15,
  color: "#111827",
  boxSizing: "border-box",
};

const DATA_CELL_STYLE: React.CSSProperties = {
  border: CELL_BORDER,
  backgroundColor: "#ffffff",
  color: "#111827",
  padding: "2px 4px",
  fontSize: "7.2pt",
  lineHeight: 1.14,
  verticalAlign: "middle",
  overflowWrap: "break-word",
  wordBreak: "break-word",
  hyphens: "auto",
  boxSizing: "border-box",
};

const ROW_AVOID_BREAK_STYLE: React.CSSProperties = {
  pageBreakInside: "avoid",
  breakInside: "avoid",
};

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
    lineHeight = 1.1;
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
  id = "ats-printable-document",
  page = "both" as 1 | 2 | "1" | "2" | "both",
}) => {
  const col1Epps = EPP_ITEMS.filter((i) => i.columna === 1);
  const col2Epps = EPP_ITEMS.filter((i) => i.columna === 2);
  const col3Epps = EPP_ITEMS.filter((i) => i.columna === 3);

  // Mostrar TODOS los trabajadores asignados al ATS (mínimo 3 filas para cuadrícula simétrica)
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

  // ENCABEZADO INSTITUCIONAL RÍGIDO CON ANCHOS EN PX FIJOS (175px + 418px + 167px = 760px)
  const renderMasterHeader = (pageNum: 1 | 2 = 1) => {
    const logoToRender = empresa.logoUrl || DEFAULT_LOGO_SVG;
    const isExternalUrl = /^https?:\/\//i.test(logoToRender);

    return (
      <table
        className="ats-table ats-header-block seccion-contenedor"
        style={{
          ...BASE_TABLE_STYLE,
          marginBottom: "3px",
          border: CELL_BORDER,
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <colgroup>
          <col style={{ width: "175px" }} />
          <col style={{ width: "418px" }} />
          <col style={{ width: "167px" }} />
        </colgroup>
        <tbody>
          <tr style={ROW_AVOID_BREAK_STYLE}>
            {/* Columna 1: Logotipo Fijo (175px) */}
            <td
              style={{
                width: "175px",
                border: CELL_BORDER,
                backgroundColor: "#ffffff",
                verticalAlign: "middle",
                textAlign: "center",
                padding: "3px 6px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "160px",
                  height: "40px",
                  margin: "0 auto",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={logoToRender}
                  alt={empresa.nombreEmpresa || "Logo Oficial DCM"}
                  style={{
                    maxHeight: "36px",
                    maxWidth: "152px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  referrerPolicy="no-referrer"
                  crossOrigin={isExternalUrl ? "anonymous" : undefined}
                />
              </div>
            </td>

            {/* Columna 2: Títulos Institucionales (418px) */}
            <td
              style={{
                width: "418px",
                border: CELL_BORDER,
                backgroundColor: "#ffffff",
                verticalAlign: "middle",
                textAlign: "center",
                padding: "3px 8px",
                boxSizing: "border-box",
                fontFamily: BASE_FONT,
              }}
            >
              <div
                style={{
                  fontSize: "7.8pt",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2px",
                  lineHeight: 1.18,
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
              </div>
              <div
                style={{
                  fontSize: "6.9pt",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.45px",
                  lineHeight: 1.18,
                  margin: "2px 0",
                  color: "#4b5563",
                }}
              >
                {pageNum === 1 ? "FORMATO OFICIAL UNIFICADO" : "FORMATO OFICIAL UNIFICADO — CONTINUACIÓN"}
              </div>
              <div
                style={{
                  fontSize: "9pt",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  letterSpacing: "0.4px",
                  lineHeight: 1.18,
                  color: "#000000",
                  margin: 0,
                }}
              >
                ANÁLISIS DE TRABAJO SEGURO (ATS){pageNum === 2 ? " (PÁG. 2)" : ""}
              </div>
            </td>

            {/* Columna 3: Control Documental Fijo (167px) */}
            <td
              style={{
                width: "167px",
                border: CELL_BORDER,
                backgroundColor: "#ffffff",
                padding: 0,
                verticalAlign: "top",
                boxSizing: "border-box",
              }}
            >
              <table
                style={{
                  width: "167px",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                  margin: 0,
                  fontFamily: BASE_FONT,
                }}
              >
                <colgroup>
                  <col style={{ width: "76px" }} />
                  <col style={{ width: "91px" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        borderRight: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.8pt",
                        lineHeight: 1.15,
                        color: "#374151",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      Código:
                    </td>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.9pt",
                        lineHeight: 1.15,
                        fontWeight: 700,
                        color: "#000000",
                        textAlign: "left",
                      }}
                    >
                      {empresa.codigoFormato || "F-SST-045"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        borderRight: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.8pt",
                        lineHeight: 1.15,
                        color: "#374151",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      Versión:
                    </td>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.9pt",
                        lineHeight: 1.15,
                        fontWeight: 700,
                        color: "#000000",
                        textAlign: "left",
                      }}
                    >
                      {empresa.version || "01"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        borderRight: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.8pt",
                        lineHeight: 1.15,
                        color: "#374151",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      Vigencia:
                    </td>
                    <td
                      style={{
                        border: "none",
                        borderBottom: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.9pt",
                        lineHeight: 1.15,
                        fontWeight: 700,
                        color: "#000000",
                        textAlign: "left",
                      }}
                    >
                      {empresa.vigencia || "02/09/2026"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: "none",
                        borderRight: CELL_BORDER,
                        padding: "2px 4px",
                        fontSize: "6.8pt",
                        lineHeight: 1.15,
                        color: "#374151",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      Páginas:
                    </td>
                    <td
                      style={{
                        border: "none",
                        padding: "2px 4px",
                        fontSize: "6.9pt",
                        lineHeight: 1.15,
                        fontWeight: 700,
                        color: "#000000",
                        textAlign: "left",
                      }}
                    >
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
      className="ats-page ats-page-sheet"
      style={{
        width: "816px",
        minWidth: "816px",
        maxWidth: "816px",
        minHeight: "1056px",
        height: "auto",
        backgroundColor: "#ffffff",
        color: "#111827",
        fontFamily: BASE_FONT,
        boxSizing: "border-box",
        overflow: "visible",
        padding: "10px 28px 12px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ width: "760px" }}>
        {/* ENCABEZADO INSTITUCIONAL OFICIAL DE LA PÁGINA 1 */}
        {renderMasterHeader(1)}

        {/* TABLA: DATOS GENERALES (FECHA, HORA, LUGAR) */}
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "152px" }} />
            <col style={{ width: "118px" }} />
            <col style={{ width: "62px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "76px" }} />
            <col style={{ width: "262px" }} />
          </colgroup>
          <tbody>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, padding: "2px 4px" }}>FECHA DILIGENCIAMIENTO:</td>
              <td style={{ ...DATA_CELL_STYLE, fontWeight: 600, textAlign: "center" }}>
                {formData.fechaDiligenciamiento || "—"}
              </td>
              <td style={{ ...HEADER_CELL_STYLE, padding: "2px 4px" }}>HORA:</td>
              <td style={{ ...DATA_CELL_STYLE, fontWeight: 600, textAlign: "center" }}>
                {formData.hora || "—"}
              </td>
              <td style={{ ...HEADER_CELL_STYLE, padding: "2px 4px" }}>LUGAR:</td>
              <td style={{ ...DATA_CELL_STYLE, fontWeight: 600, textAlign: "left" }}>
                {formData.lugar || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* TABLA: TIPO DE TRABAJO, ALTURA Y VIGENCIA DEL PERMISO */}
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "136px" }} />
            <col style={{ width: "320px" }} />
            <col style={{ width: "168px" }} />
            <col style={{ width: "136px" }} />
          </colgroup>
          <tbody>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, padding: "2px 4px" }}>TIPO DE TRABAJO:</td>
              <td style={{ ...DATA_CELL_STYLE, fontWeight: 600, textTransform: "uppercase", textAlign: "left" }}>
                {formData.tipoTrabajo || "—"}
              </td>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, padding: "2px 4px" }}>ALTURA APROXIMADA:</td>
              <td style={{ ...DATA_CELL_STYLE, fontWeight: 700, textAlign: "center" }}>
                {formData.alturaAproximada || "—"}
              </td>
            </tr>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, padding: "2px 4px" }}>PERMISO VÁLIDO:</td>
              <td colSpan={3} style={{ ...DATA_CELL_STYLE, padding: 0 }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0 }}>
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "38%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "38%" }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          ...HEADER_CELL_STYLE,
                          border: "none",
                          borderRight: CELL_BORDER,
                          padding: "2px 4px",
                        }}
                      >
                        DESDE:
                      </td>
                      <td
                        style={{
                          ...DATA_CELL_STYLE,
                          border: "none",
                          borderRight: CELL_BORDER,
                          padding: "2px 6px",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {formData.permisoValidoDesdeFecha || formData.fechaDiligenciamiento || "—"}
                        </span>
                        <span style={{ color: "#4b5563", marginLeft: "6px" }}>Hora:</span>{" "}
                        <span style={{ fontWeight: 600 }}>{formData.permisoValidoDesdeHora || "08:00"}</span>
                      </td>
                      <td
                        style={{
                          ...HEADER_CELL_STYLE,
                          border: "none",
                          borderRight: CELL_BORDER,
                          padding: "2px 4px",
                        }}
                      >
                        HASTA:
                      </td>
                      <td
                        style={{
                          ...DATA_CELL_STYLE,
                          border: "none",
                          padding: "2px 6px",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {formData.permisoValidoHastaFecha ||
                            formData.permisoValidoDesdeFecha ||
                            formData.fechaDiligenciamiento ||
                            "—"}
                        </span>
                        <span style={{ color: "#4b5563", marginLeft: "6px" }}>Hora:</span>{" "}
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
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "266px" }} />
            <col style={{ width: "136px" }} />
            <col style={{ width: "206px" }} />
            <col style={{ width: "152px" }} />
          </colgroup>
          <thead>
            <tr>
              <td colSpan={4} style={BANNER_CELL_STYLE}>
                PERMISO CONCEDIDO A LOS TRABAJADORES (PERSONAL AUTORIZADO)
              </td>
            </tr>
            <tr>
              <th style={{ ...HEADER_CELL_LEFT_STYLE, padding: "2px 4px" }}>NOMBRES Y APELLIDOS</th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px" }}>CÉDULA</th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px" }}>CARGO</th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px" }}>ARL</th>
            </tr>
          </thead>
          <tbody>
            {workersDisplay.map((worker, idx) => {
              const count = workersDisplay.length;
              const rowHeight = count > 8 ? "12px" : count > 5 ? "13.5px" : count > 3 ? "14.5px" : "15.5px";
              const cellPadding = count > 8 ? "1px 3px" : "1.5px 4px";
              const fontSize = count > 8 ? "6.2pt" : count > 5 ? "6.7pt" : "7.1pt";
              const nameStyle = getDynamicWorkerNameStyle(worker?.nombre || "", count);
              const cargoStyle = getDynamicCargoStyle(worker?.cargo || "", count);

              return (
                <tr key={worker?.id || `w-${idx}`} style={{ height: rowHeight, ...ROW_AVOID_BREAK_STYLE }}>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "left",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: cellPadding,
                      ...nameStyle,
                    }}
                  >
                    {worker ? worker.nombre : ""}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontWeight: 500,
                      padding: cellPadding,
                      fontSize,
                    }}
                  >
                    {worker ? worker.cedula : ""}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      padding: cellPadding,
                      ...cargoStyle,
                    }}
                  >
                    {worker ? worker.cargo : ""}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      fontWeight: 500,
                      padding: cellPadding,
                      fontSize,
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
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "182px" }} />
            <col style={{ width: "578px" }} />
          </colgroup>
          <tbody>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, verticalAlign: "top", padding: "2.5px 4px" }}>
                DESCRIPCIÓN Y PROCEDIMIENTO DE LA TAREA:
              </td>
              <td style={{ ...DATA_CELL_STYLE, padding: "2.5px 5px", verticalAlign: "middle" }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#111827",
                    fontSize: (formData.tareaGeneral || "").length > 150 ? "6.8pt" : "7.2pt",
                    lineHeight: 1.15,
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    hyphens: "auto",
                  }}
                >
                  {formData.tareaGeneral || "—"}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TABLA: MATRIZ DE RIESGOS Y CONTROLES OPERATIVOS (ATS) — break-inside: auto en tabla, avoid por cada <tr> */}
        <table
          className="ats-table ats-matriz-table"
          style={{
            ...BASE_TABLE_STYLE,
            pageBreakInside: "auto",
            breakInside: "auto",
          }}
        >
          <colgroup>
            <col style={{ width: "190px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "266px" }} />
            <col style={{ width: "114px" }} />
          </colgroup>
          <thead style={{ display: "table-header-group" }}>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td colSpan={4} style={{ ...BANNER_CELL_STYLE, padding: "2px 4px", fontSize: "8.5px" }}>
                ANÁLISIS DE TRABAJO SEGURO - ATS (MATRIZ DE RIESGOS Y CONTROLES OPERATIVOS)
              </td>
            </tr>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px", fontSize: "8.5px" }}>
                SECUENCIA ORDENADA DE PASOS (PROCEDIMIENTO)
              </th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px", fontSize: "8.5px" }}>
                PELIGROS / RIESGOS IDENTIFICADOS
              </th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px", fontSize: "8.5px" }}>
                CONTROLES REQUERIDOS (PREVENTIVOS, PROTECTIVOS Y REACTIVOS)
              </th>
              <th style={{ ...HEADER_CELL_STYLE, padding: "2px 4px", fontSize: "8.5px" }}>
                CARGO RESPONSABLE
              </th>
            </tr>
          </thead>
          <tbody>
            {pasosDisplay.map((p, idx) => (
              <tr key={p.id || idx} style={{ verticalAlign: "top", ...ROW_AVOID_BREAK_STYLE }}>
                <td
                  style={{
                    ...DATA_CELL_STYLE,
                    verticalAlign: "top",
                    padding: "2px 4px",
                    fontSize: "8.5px",
                    lineHeight: 1.15,
                  }}
                >
                  <strong style={{ marginRight: "3px" }}>{idx + 1}.</strong>
                  {p.paso}
                </td>
                <td
                  style={{
                    ...DATA_CELL_STYLE,
                    verticalAlign: "top",
                    color: "#1f2937",
                    padding: "2px 4px",
                    fontSize: "8.5px",
                    lineHeight: 1.15,
                  }}
                >
                  {p.riesgo}
                </td>
                <td
                  style={{
                    ...DATA_CELL_STYLE,
                    verticalAlign: "top",
                    color: "#1f2937",
                    padding: "2px 4px",
                    fontSize: "8.5px",
                    lineHeight: 1.15,
                  }}
                >
                  {p.controles}
                </td>
                <td
                  style={{
                    ...DATA_CELL_STYLE,
                    verticalAlign: "middle",
                    textAlign: "center",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    padding: "2px 4px",
                    fontSize: "8.5px",
                    lineHeight: 1.15,
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
      <div
        style={{
          width: "760px",
          fontSize: "6.8pt",
          color: "#4b5563",
          paddingTop: "4px",
          marginTop: "6px",
          borderTop: "1px solid #9ca3af",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: BASE_FONT,
          ...ROW_AVOID_BREAK_STYLE,
        }}
      >
        <span>
          Formato Oficial {empresa.codigoFormato || "F-SST-045"} · Conforme a Resolución 4272 de 2021 y Decreto 1072 de 2015
        </span>
        <span style={{ fontWeight: 700, color: "#000000" }}>Página 1 de 2</span>
      </div>
    </div>
  );

  const renderPage2 = () => (
    <div
      className="ats-page ats-page-sheet"
      style={{
        width: "816px",
        minWidth: "816px",
        maxWidth: "816px",
        minHeight: "1056px",
        height: "auto",
        backgroundColor: "#ffffff",
        color: "#111827",
        fontFamily: BASE_FONT,
        boxSizing: "border-box",
        overflow: "visible",
        padding: "10px 28px 12px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ width: "760px" }}>
        {/* ENCABEZADO INSTITUCIONAL OFICIAL DE LA PÁGINA 2 */}
        {renderMasterHeader(2)}

        {/* TABLA: ELEMENTOS DE PROTECCIÓN PERSONAL Y SISTEMAS CONTRA CAÍDAS */}
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "209px" }} />
            <col style={{ width: "44px" }} />
            <col style={{ width: "209px" }} />
            <col style={{ width: "44px" }} />
            <col style={{ width: "209px" }} />
            <col style={{ width: "45px" }} />
          </colgroup>
          <thead>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td colSpan={6} style={{ ...BANNER_CELL_STYLE, fontSize: "7.1pt", padding: "3px 5px" }}>
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
                item3 &&
                  (formData.eppsSeleccionados[item3.id] ||
                    (item3.id === "epp_otro" &&
                      (allOtrosList.length > 0 || Boolean(formData.otroEppTexto?.trim()))))
              );
              const eppRowHeight =
                workersDisplay.length > 5 ? "14.5px" : workersDisplay.length > 3 ? "15.5px" : "17px";

              return (
                <tr key={idx} style={{ height: eppRowHeight, ...ROW_AVOID_BREAK_STYLE }}>
                  <td style={{ ...DATA_CELL_STYLE, fontWeight: 500, fontSize: "7.1pt" }}>{item.nombre}</td>
                  <td style={{ ...HEADER_CELL_STYLE, fontSize: "7.6pt", padding: "1.5px 2px" }}>
                    {isChecked1 ? "[ X ]" : "[   ]"}
                  </td>

                  <td style={{ ...DATA_CELL_STYLE, fontWeight: 500, fontSize: "7.1pt" }}>
                    {item2?.nombre || ""}
                  </td>
                  <td style={{ ...HEADER_CELL_STYLE, fontSize: "7.6pt", padding: "1.5px 2px" }}>
                    {item2 ? (isChecked2 ? "[ X ]" : "[   ]") : ""}
                  </td>

                  <td style={{ ...DATA_CELL_STYLE, fontWeight: 500, fontSize: "7.1pt" }}>
                    {item3?.id === "epp_otro" ? (
                      <span>OTRO(S): {fullOtrosDisplay || ""}</span>
                    ) : (
                      item3?.nombre || ""
                    )}
                  </td>
                  <td style={{ ...HEADER_CELL_STYLE, fontSize: "7.6pt", padding: "1.5px 2px" }}>
                    {item3 ? (isChecked3 ? "[ X ]" : "[   ]") : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* TABLA: PREPARACIÓN DEL ÁREA (CHECKLIST CON COLUMNAS SI / NO / N.A.) */}
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "622px" }} />
            <col style={{ width: "46px" }} />
            <col style={{ width: "46px" }} />
            <col style={{ width: "46px" }} />
          </colgroup>
          <thead>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <th style={HEADER_CELL_LEFT_STYLE}>PREPARACIÓN DEL ÁREA (MARQUE CON X)</th>
              <th style={HEADER_CELL_STYLE}>SI</th>
              <th style={HEADER_CELL_STYLE}>NO</th>
              <th style={HEADER_CELL_STYLE}>N.A.</th>
            </tr>
          </thead>
          <tbody>
            {formData.preparacionArea.map((item, idx) => {
              const areaRowHeight =
                workersDisplay.length > 5 ? "14.5px" : workersDisplay.length > 3 ? "15.5px" : "16.5px";
              return (
                <tr key={idx} style={{ height: areaRowHeight, ...ROW_AVOID_BREAK_STYLE }}>
                  <td style={{ ...DATA_CELL_STYLE, textAlign: "left", fontWeight: 500, fontSize: "7.1pt" }}>
                    {item.descripcion}
                  </td>
                  <td style={{ ...DATA_CELL_STYLE, textAlign: "center", fontWeight: 700, fontSize: "7.8pt" }}>
                    {item.estado === "SI" ? "X" : ""}
                  </td>
                  <td style={{ ...DATA_CELL_STYLE, textAlign: "center", fontWeight: 700, fontSize: "7.8pt" }}>
                    {item.estado === "NO" ? "X" : ""}
                  </td>
                  <td style={{ ...DATA_CELL_STYLE, textAlign: "center", fontWeight: 700, fontSize: "7.8pt" }}>
                    {item.estado === "N.A." ? "X" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* TABLA: DECLARACIÓN Y FIRMAS DE LOS TRABAJADORES (EJECUTORES) */}
        <table
          className="ats-table ats-signature-section seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, pageBreakInside: "auto", breakInside: "auto" }}
        >
          <colgroup>
            <col style={{ width: "304px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "266px" }} />
          </colgroup>
          <thead style={{ display: "table-header-group" }}>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td
                colSpan={3}
                className="ats-declaration-cell"
                style={{
                  border: CELL_BORDER,
                  backgroundColor: HEADER_BG,
                  padding: "2.5px 4px",
                  fontSize: "6.6pt",
                  lineHeight: 1.13,
                  textAlign: "justify",
                  color: "#111827",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    textTransform: "uppercase",
                    marginBottom: "1.5px",
                    fontWeight: 800,
                    color: "#000000",
                    fontSize: "7pt",
                  }}
                >
                  FIRMA DE LOS TRABAJADORES (EJECUTORES) (NOMBRE, FIRMA Y NRO. DE CÉDULA)
                </strong>
                "HE SOCIALIZADO EL ANÁLISIS DE RIESGOS, COMPRENDO LAS PRECAUCIONES QUE DEBEN SER TOMADAS Y ME COMPROMETO A DESARROLLAR EL TRABAJO CUMPLIENDO LAS MEDIDAS DE SEGURIDAD ESTABLECIDAS, PROCURANDO EL AUTOCUIDADO, CUMPLIENDO PROCEDIMIENTOS Y EVITANDO ACTOS INSEGUROS, ASÍ COMO REPORTAR CUALQUIER DAÑO DE EQUIPOS O INCIDENTES Y/O ACCIDENTES PRESENTADOS."
              </td>
            </tr>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <th style={HEADER_CELL_LEFT_STYLE}>NOMBRES Y APELLIDOS</th>
              <th style={HEADER_CELL_STYLE}>CÉDULA</th>
              <th style={HEADER_CELL_STYLE}>FIRMA DIGITAL</th>
            </tr>
          </thead>
          <tbody>
            {workersDisplay.map((worker, idx) => {
              const signatureUrl = worker
                ? formData.firmasTrabajadores[worker.id] || worker.firmaUrl
                : null;
              const count = workersDisplay.length;
              const rowHeight =
                count > 8 ? "17px" : count > 6 ? "19.5px" : count > 4 ? "23px" : count > 3 ? "27px" : "32px";
              const sigBoxHeight =
                count > 8 ? "15.5px" : count > 6 ? "18px" : count > 4 ? "21px" : count > 3 ? "25px" : "30px";
              const sigImgMaxHeight =
                count > 8 ? "14px" : count > 6 ? "16.5px" : count > 4 ? "19px" : count > 3 ? "23px" : "28px";
              const cellPadding = count > 6 ? "1px 2.5px" : "2px 4px";
              const fontSize = count > 8 ? "6.3pt" : count > 6 ? "6.8pt" : "7.2pt";
              const nameStyle = getDynamicWorkerNameStyle(worker?.nombre || "", count);

              return (
                <tr key={worker?.id || `ws-${idx}`} style={{ height: rowHeight, ...ROW_AVOID_BREAK_STYLE }}>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "left",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: cellPadding,
                      ...nameStyle,
                    }}
                  >
                    {worker ? worker.nombre : ""}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontWeight: 500,
                      padding: cellPadding,
                      fontSize,
                    }}
                  >
                    {worker ? worker.cedula : ""}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      padding: 0,
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    {signatureUrl ? (
                      <div
                        className="ats-signature-box"
                        style={{
                          height: sigBoxHeight,
                          maxHeight: sigBoxHeight,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={signatureUrl}
                          alt="Firma digital"
                          className="ats-signature-img"
                          style={{
                            maxHeight: sigImgMaxHeight,
                            maxWidth: "120px",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            display: "block",
                            margin: "0 auto",
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
                      <span style={{ fontSize: "7pt", color: "#cbd5e1" }}>Pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* TABLA: OBSERVACIONES TÉCNICAS */}
        <table
          className="ats-table seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "152px" }} />
            <col style={{ width: "608px" }} />
          </colgroup>
          <tbody>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td style={{ ...HEADER_CELL_LEFT_STYLE, verticalAlign: "top" }}>OBSERVACIONES:</td>
              <td
                style={{
                  ...DATA_CELL_STYLE,
                  verticalAlign: "top",
                  color: "#1f2937",
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
        <table
          className="ats-table ats-signature-section seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, marginBottom: "3px", ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "304px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "266px" }} />
          </colgroup>
          <thead>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td
                colSpan={3}
                className="ats-declaration-cell"
                style={{
                  border: CELL_BORDER,
                  backgroundColor: HEADER_BG,
                  padding: "2.5px 4px",
                  fontSize: "6.6pt",
                  lineHeight: 1.13,
                  textAlign: "justify",
                  color: "#111827",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    textTransform: "uppercase",
                    marginBottom: "1.5px",
                    fontWeight: 800,
                    color: "#000000",
                    fontSize: "7pt",
                  }}
                >
                  FIRMA DEL COORDINADOR / SUPERVISOR SST Y/O JEFE (EMISOR) (NOMBRE, FIRMA Y NRO. DE CÉDULA)
                </strong>
                "PERSONALMENTE HE VERIFICADO LA PREPARACIÓN DE LOS EQUIPOS Y/O ÁREA PARA EL TRABAJO Y LO CONSIDERO SEGURO PARA PROCEDER CON SU EJECUCIÓN Y ME COMPROMETO A VELAR PARA QUE SE MANTENGAN DURANTE LA EJECUCIÓN DEL TRABAJO LAS CONDICIONES DE SEGURIDAD ESTABLECIDAS EN EL PRESENTE PERMISO, CON EL OBJETIVO DE EVITAR QUE OCURRAN ACCIDENTES Y/O INCIDENTES A LAS PERSONAS, EQUIPOS, INSTALACIONES, MEDIO AMBIENTE."
              </td>
            </tr>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <th style={HEADER_CELL_LEFT_STYLE}>NOMBRE Y CARGO</th>
              <th style={HEADER_CELL_STYLE}>CÉDULA</th>
              <th style={HEADER_CELL_STYLE}>FIRMA AUTORIZADA</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const { nameStyle, cargoStyle } = getDynamicSupervisorStyle(
                formData.supervisor.nombre || "COORDINADOR SST",
                formData.supervisor.cargo || "Coordinador / Supervisor SST"
              );
              return (
                <tr style={{ height: "38px", ...ROW_AVOID_BREAK_STYLE }}>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      textAlign: "left",
                      padding: "2px 4px",
                    }}
                  >
                    <div style={{ color: "#000000", ...nameStyle }}>
                      {formData.supervisor.nombre || "COORDINADOR SST"}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#4b5563",
                        textTransform: "none",
                        marginTop: "2px",
                        ...cargoStyle,
                      }}
                    >
                      {formData.supervisor.cargo || "Coordinador / Supervisor SST"}
                    </div>
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      fontFamily: "monospace",
                      padding: "2px 4px",
                      fontSize: "7.5pt",
                    }}
                  >
                    {formData.supervisor.cedula || "—"}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      padding: 0,
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    {formData.supervisor.firmaUrl ? (
                      <div
                        className="ats-signature-box"
                        style={{
                          height: "32px",
                          maxHeight: "32px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={formData.supervisor.firmaUrl}
                          alt="Firma supervisor"
                          className="ats-signature-img"
                          style={{
                            maxHeight: "30px",
                            maxWidth: "120px",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            display: "block",
                            margin: "0 auto",
                          }}
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
                      <span style={{ fontSize: "7pt", color: "#cbd5e1" }}>Pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>

        {/* TABLA: PERSONA QUE AUTORIZA EL TRABAJO */}
        <table
          className="ats-table ats-signature-section seccion-contenedor"
          style={{ ...BASE_TABLE_STYLE, marginBottom: 0, ...ROW_AVOID_BREAK_STYLE }}
        >
          <colgroup>
            <col style={{ width: "304px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "266px" }} />
          </colgroup>
          <thead>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <td
                colSpan={3}
                className="ats-declaration-cell"
                style={{
                  border: CELL_BORDER,
                  backgroundColor: HEADER_BG,
                  padding: "2.5px 4px",
                  fontSize: "6.5pt",
                  lineHeight: 1.12,
                  textAlign: "justify",
                  color: "#111827",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    textTransform: "uppercase",
                    marginBottom: "1px",
                    fontWeight: 800,
                    color: "#000000",
                    fontSize: "7pt",
                  }}
                >
                  FIRMA DE LA PERSONA QUE AUTORIZA EL TRABAJO (NOMBRE, CARGO, NRO. DE CÉDULA Y FIRMA)
                </strong>
                "AUTORIZO LA EJECUCIÓN DE LA ACTIVIDAD DESCRITA EN EL PRESENTE ANÁLISIS DE TRABAJO SEGURO, VERIFICANDO QUE EL PERSONAL EJECUTOR Y EL ÁREA CUMPLEN CON LOS CONTROLES Y CONDICIONES DE SEGURIDAD ESTABLECIDAS."
              </td>
            </tr>
            <tr style={ROW_AVOID_BREAK_STYLE}>
              <th style={HEADER_CELL_LEFT_STYLE}>NOMBRE Y CARGO</th>
              <th style={HEADER_CELL_STYLE}>CÉDULA</th>
              <th style={HEADER_CELL_STYLE}>FIRMA QUIEN AUTORIZA</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const auth = formData.autorizador || {
                nombre: "",
                cedula: "",
                cargo: "",
                firmaUrl: "",
              };
              const hasAuthName = Boolean(auth.nombre && auth.nombre.trim());
              const hasAuthCargo = Boolean(auth.cargo && auth.cargo.trim());
              const { nameStyle, cargoStyle } = getDynamicSupervisorStyle(
                auth.nombre || "POR DEFINIR",
                auth.cargo || "Persona que Autoriza el Trabajo"
              );

              return (
                <tr style={{ height: "36px", ...ROW_AVOID_BREAK_STYLE }}>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      textAlign: "left",
                      padding: "2px 4px",
                    }}
                  >
                    <div
                      style={{
                        color: hasAuthName ? "#000000" : "#6b7280",
                        ...nameStyle,
                      }}
                    >
                      {hasAuthName ? auth.nombre : "POR ASIGNAR"}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#4b5563",
                        textTransform: "none",
                        marginTop: "2px",
                        ...cargoStyle,
                      }}
                    >
                      {hasAuthCargo ? auth.cargo : "Responsable que Autoriza el Trabajo"}
                    </div>
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      textAlign: "center",
                      fontFamily: "monospace",
                      padding: "2px 4px",
                      fontSize: "7.5pt",
                    }}
                  >
                    {auth.cedula?.trim() ? auth.cedula : "—"}
                  </td>
                  <td
                    style={{
                      ...DATA_CELL_STYLE,
                      padding: 0,
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    {auth.firmaUrl ? (
                      <div
                        className="ats-signature-box"
                        style={{
                          height: "32px",
                          maxHeight: "32px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={auth.firmaUrl}
                          alt="Firma de quien autoriza"
                          className="ats-signature-img"
                          style={{
                            maxHeight: "30px",
                            maxWidth: "120px",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                      </div>
                    ) : onOpenSignModal ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSignModal({
                            type: "autorizador",
                            name: auth.nombre || "Persona que Autoriza",
                          })
                        }
                        className="no-print inline-flex items-center gap-1 text-[7pt] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        <PenTool className="w-2.5 h-2.5" />
                        <span>Firmar Autorización</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: "7pt", color: "#cbd5e1" }}>Pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* PIE DE PÁGINA 2 */}
      <div
        style={{
          width: "760px",
          fontSize: "6.8pt",
          color: "#4b5563",
          paddingTop: "4px",
          marginTop: "6px",
          borderTop: "1px solid #9ca3af",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: BASE_FONT,
          ...ROW_AVOID_BREAK_STYLE,
        }}
      >
        <span>
          Formato Oficial {empresa.codigoFormato || "F-SST-045"} · Registro Oficial de Seguridad y Salud en el Trabajo
        </span>
        <span style={{ fontWeight: 700, color: "#000000" }}>Fin del Documento · Página 2 de 2</span>
      </div>
    </div>
  );

  return (
    <div
      id={id}
      className="ats-document-root print:p-0"
      style={{
        width: "816px",
        minWidth: "816px",
        maxWidth: "816px",
        fontFamily: BASE_FONT,
        color: "#111827",
      }}
    >
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
