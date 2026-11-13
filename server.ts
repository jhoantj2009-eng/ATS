import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import nodemailer, { Transporter } from "nodemailer";

import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

const DATA_DIR = path.join(process.cwd(), "data");
const TEMPLATE_CONFIG_FILE = path.join(DATA_DIR, "company_template.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Error creating data directory:", e);
  }
}

// Global persistent template endpoints so shared links always show the official logo
app.get("/api/company-config", (req, res) => {
  try {
    if (fs.existsSync(TEMPLATE_CONFIG_FILE)) {
      const raw = fs.readFileSync(TEMPLATE_CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return res.json({ success: true, empresa: parsed });
    }
    return res.json({ success: true, empresa: null });
  } catch (error: any) {
    console.error("Error reading company config:", error);
    return res.status(500).json({ error: "Failed to read company configuration" });
  }
});

app.post("/api/company-config", (req, res) => {
  try {
    const { nombreEmpresa, nit, logoUrl, codigoFormato, version, vigencia } = req.body || {};

    if (!nombreEmpresa && !logoUrl) {
      return res.status(400).json({ error: "Configuración inválida" });
    }

    const currentConfig = {
      nombreEmpresa: nombreEmpresa || "DCM",
      nit: nit || "900.852.147-3",
      logoUrl: logoUrl || "",
      codigoFormato: codigoFormato || "F-SST-045",
      version: version || "01",
      vigencia: vigencia || "02/09/2026",
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(TEMPLATE_CONFIG_FILE, JSON.stringify(currentConfig, null, 2), "utf-8");
    console.log(`[Template Server] Global template and logo updated for: ${currentConfig.nombreEmpresa} (Código: ${currentConfig.codigoFormato})`);

    return res.json({
      success: true,
      empresa: currentConfig,
      message: "Plantilla oficial y logotipo guardados globalmente en el servidor para todos los enlaces compartidos.",
    });
  } catch (error: any) {
    console.error("Error saving company config:", error);
    return res.status(500).json({ error: "Failed to save company configuration" });
  }
});

// Contextual high-standard ATS generator tailored to the specific task
function generateFallbackATS(
  tareaGeneral: string,
  tipoTrabajo?: string,
  detalleLabor?: string,
  altura?: string,
  personal?: Array<{ nombre: string; cargo: string }>
) {
  const defaultWorkers = personal && personal.length > 0
    ? personal.map((p) => `${p.nombre} (${p.cargo || "Ejecutor"})`)
    : ["Técnico Ejecutor 1", "Técnico Ejecutor 2", "Supervisor SST"];

  const getWorker = (idx: number) => defaultWorkers[idx % defaultWorkers.length];

  const task = (tareaGeneral || "Mantenimiento general").trim();
  const taskLower = task.toLowerCase();

  // Detección rigurosa de altura: si la labor NO menciona ni implica alturas, debe ser Nivel de piso
  const heightMatch = task.match(/(\d+(\.\d+)?)\s*(m|mts|metros)\b/i);
  const isRoof = taskLower.includes("cubiert") || taskLower.includes("teja") || taskLower.includes("techo") || taskLower.includes("asbesto") || taskLower.includes("zinc");
  const isCleaningFacade = taskLower.includes("fachada") || taskLower.includes("silleta") || taskLower.includes("ventanales exteriores");
  const isHotWork = taskLower.includes("soldad") || taskLower.includes("caliente") || taskLower.includes("corte") || taskLower.includes("esmeril") || taskLower.includes("oxicorte");
  const isElectric = taskLower.includes("electr") || taskLower.includes("luminari") || taskLower.includes("cable") || taskLower.includes("transformador") || taskLower.includes("tablero");
  const isConfined = taskLower.includes("confinad") || taskLower.includes("tanque") || taskLower.includes("alcantarill") || taskLower.includes("silo");

  const isHeight = isRoof || isCleaningFacade || taskLower.includes("altur") || taskLower.includes("poste") || taskLower.includes("torre") || taskLower.includes("andamio") || taskLower.includes("elevador") || Boolean(heightMatch);

  let deducedAltura = "N/A - Nivel de piso";
  if (altura && altura.trim()) {
    deducedAltura = altura.trim();
  } else if (heightMatch) {
    deducedAltura = `${heightMatch[1]} MTS`;
  } else if (isHeight) {
    deducedAltura = isRoof ? "8 MTS" : isCleaningFacade ? "12 MTS" : "4.5 MTS";
  }

  let deducedTipoTrabajo = tipoTrabajo || "";
  if (!deducedTipoTrabajo) {
    if (isRoof) deducedTipoTrabajo = "Trabajo en Alturas / Cubiertas";
    else if (isCleaningFacade) deducedTipoTrabajo = "Trabajo en Alturas / Limpieza de Fachadas";
    else if (isHotWork) deducedTipoTrabajo = isHeight ? "Trabajo en Caliente y Alturas" : "Trabajo en Caliente / Soldadura";
    else if (isElectric) deducedTipoTrabajo = isHeight ? "Mantenimiento Eléctrico en Alturas" : "Mantenimiento Eléctrico a Nivel de Piso";
    else if (isConfined) deducedTipoTrabajo = "Trabajo en Espacios Confinados";
    else deducedTipoTrabajo = isHeight ? "Trabajo en Alturas" : "Trabajo a Nivel de Piso / Locativo";
  }

  const deducedDetalleLabor = detalleLabor || `Procedimiento técnico especializado para la ejecución de: ${task}, aplicando controles preventivos, protectivos y reactivos acordes con la normatividad SST.`;
  const deducedObservaciones = isHeight
    ? "Verificar certificación vigente en alturas (Res. 4272/2021). Inspección diaria de sistemas de protección contra caídas y suspender en caso de lluvia o viento superior a 30 km/h."
    : "Labor a nivel de piso. Mantener orden y aseo continuo, despeje de áreas de tránsito, técnica ergonómica adecuada de levantamiento y uso de EPP básico obligatorio.";

  const heightText = isHeight ? ` (${deducedAltura})` : " a nivel de piso";

  let customPasos = [];

  if (isRoof) {
    customPasos = [
      {
        numero: 1,
        paso: `Socialización del ATS, verificación de aptitud médica y análisis de condiciones meteorológicas para labor en cubierta${heightText}.`,
        riesgo: "Falta de claridad en procedimientos, descompensación médica, ráfagas de viento o lluvia.",
        controles: "Preventivo: Divulgación de riesgos. Protectivo: Verificación médica y EPP. Reactivo: Suspensión inmediata por lluvia o vientos mayores a 30 km/h.",
        responsable: getWorker(0),
      },
      {
        numero: 2,
        paso: "Demarcación perimetral y señalización en el suelo bajo el radio de caída de la cubierta.",
        riesgo: "Paso de personas ajenas, caída de tejas rotas o fragmentos hacia transeúntes.",
        controles: "Preventivo: Cinta de peligro y conos. Protectivo: Delimitación física. Reactivo: Asignación de vigía de seguridad en tierra.",
        responsable: getWorker(1),
      },
      {
        numero: 3,
        paso: "Inspección preoperacional de arnés de cuerpo completo, eslingas en Y con absorbedor de impacto y líneas de vida horizontales.",
        riesgo: "Equipos con desgaste, costuras rotas o ganchos defectuosos.",
        controles: "Preventivo: Checklist preoperacional riguroso. Protectivo: Descarte de elementos averiados. Reactivo: Reporte al supervisor SST.",
        responsable: getWorker(0),
      },
      {
        numero: 4,
        paso: "Ascenso por escalera certificada asegurada e instalación / aseguramiento a línea de vida horizontal fija en cumbrera.",
        riesgo: "Caída de altura en el ascenso, resbalamiento de la escalera.",
        controles: "Preventivo: Amarre superior e inferior de la escalera. Protectivo: Mantener 3 puntos de apoyo. Reactivo: Anclaje inmediato al 100% a la línea de vida.",
        responsable: getWorker(2),
      },
      {
        numero: 5,
        paso: "Colocación de tableros o tablones de repartición de carga (pasarelas) sobre las vigas de la estructura.",
        riesgo: "Ruptura de tejas frágiles (asbesto o policarbonato) y caída al vacío dentro de la nave.",
        controles: "Preventivo: Prohibido pisar directamente sobre las tejas. Protectivo: Desplazarse exclusivamente sobre tablones apoyados en cerchas. Reactivo: Arnés conectado.",
        responsable: getWorker(0),
      },
      {
        numero: 6,
        paso: `Ejecución de la labor específica: ${task} (desmonte cuidadoso de tejas deterioradas y retiro de fijaciones).`,
        riesgo: "Cortes por filos de tejas, caída de herramientas o tornillos, sobreesfuerzo de cintura.",
        controles: "Preventivo: Amarre de herramientas con cordines de seguridad. Protectivo: Guantes anticorte. Reactivo: Botiquín de primeros auxilios.",
        responsable: getWorker(1),
      },
      {
        numero: 7,
        paso: "Izaje controlado de tejas y materiales nuevos mediante sistema de polipasto o cuerda guía con freno.",
        riesgo: "Desprendimiento de carga en suspensión, sobreesfuerzo del personal al halar.",
        controles: "Preventivo: Aseguramiento de tejas con eslingas sintéticas. Protectivo: Zona de izaje despejada. Reactivo: Parada de maniobra.",
        responsable: getWorker(0),
      },
      {
        numero: 8,
        paso: "Instalación, ajuste de ganchos de fijación y sellado hermético de los nuevos elementos de cubierta.",
        riesgo: "Inhalación de vapores de masillas/sellantes, pellizcos mecánicos con taladros o atornilladores.",
        controles: "Preventivo: Control de torque en atornillador. Protectivo: Gafas de seguridad y protección respiratoria. Reactivo: Primeros auxilios.",
        responsable: getWorker(1),
      },
      {
        numero: 9,
        paso: "Descenso de tejas retiradas, herramientas y retiro paulatino de los tablones de repartición.",
        riesgo: "Caída de materiales de desecho, tropiezos con cables de extensión.",
        controles: "Preventivo: Bajar escombros en baldes mediante cuerda guiada; prohibido arrojar materiales. Protectivo: Delimitación en tierra. Reactivo: Vigía alerta.",
        responsable: getWorker(0),
      },
      {
        numero: 10,
        paso: "Descenso seguro del personal, recolección de señalización, orden y aseo 5S y firma de cierre formal del permiso ATS.",
        riesgo: "Descenso apresurado, desatención al desconectarse del anclaje.",
        controles: "Preventivo: Desconexión progresiva conservando anclaje hasta pisar tierra firme. Protectivo: Entrega del área limpia. Reactivo: Firma con supervisor SST.",
        responsable: getWorker(2),
      },
    ];
  } else if (!isHeight) {
    // 10 PASOS ESTRICTAMENTE A NIVEL DE PISO (Sin inventar alturas ni arneses)
    customPasos = [
      {
        numero: 1,
        paso: `Socialización del ATS, verificación de condiciones de salud y charla de seguridad de 5 minutos para: ${task}.`,
        riesgo: "Desconocimiento del procedimiento seguro, desatención, descompensación física.",
        controles: "Preventivo: Lectura conjunta del ATS antes de iniciar la actividad. Protectivo: Verificación del uso correcto del EPP básico. Reactivo: Atención médica básica.",
        responsable: getWorker(0),
      },
      {
        numero: 2,
        paso: `Inspección del entorno a nivel de piso, despeje de obstáculos y delimitación del área de trabajo para ${task}.`,
        riesgo: "Tránsito peatonal no autorizado, colisiones con personal ajeno a la labor.",
        controles: "Preventivo: Instalación de conos de seguridad y cinta de precaución. Protectivo: Carteles de 'Área en Mantenimiento'. Reactivo: Despeje del área ante imprevistos.",
        responsable: getWorker(1),
      },
      {
        numero: 3,
        paso: "Inspección preoperacional de herramientas manuales, eléctricas y Elementos de Protección Personal (EPP).",
        riesgo: "Fallas mecánicas en herramientas, cables eléctricos desgastados, EPP deteriorado.",
        controles: "Preventivo: Diligenciamiento de lista de chequeo preoperacional. Protectivo: Retiro inmediato de herramientas no conformes. Reactivo: Reemplazo por herramienta certificada.",
        responsable: getWorker(0),
      },
      {
        numero: 4,
        paso: "Verificación de la superficie del suelo (ausencia de humedad excesiva, derrames de grasa o desniveles).",
        riesgo: "Caídas al mismo nivel, resbalones, tropiezos con cables en el piso.",
        controles: "Preventivo: Secado y limpieza previa de la superficie de trabajo. Protectivo: Uso obligatorio de calzado de seguridad con suela antideslizante. Reactivo: Botiquín Tipo A en sitio.",
        responsable: getWorker(2),
      },
      {
        numero: 5,
        paso: `Alistamiento y traslado manual seguro de materiales e insumos requeridos para ${task}.`,
        riesgo: "Sobreesfuerzos lumbares, posturas forzadas por levantamiento inadecuado de cargas.",
        controles: "Preventivo: Levantamiento de cargas flexionando piernas y manteniendo espalda recta; ayuda compartida para pesos mayores a 25 kg. Protectivo: Faja ergonómica y guantes. Reactivo: Pausas activas.",
        responsable: getWorker(0),
      },
      {
        numero: 6,
        paso: `Ejecución técnica principal: ${task}, manteniendo posturas ergonómicas y concentración constante.`,
        riesgo: "Golpes, cortes en manos, atrapamientos mecánicos o salpicaduras hacia la vista.",
        controles: "Preventivo: Mantener manos fuera de puntos de pellizco y utilizar herramientas adecuadas. Protectivo: Guantes de protección mecánica y gafas de seguridad selladas. Reactivo: Lavado ocular y primeros auxilios.",
        responsable: getWorker(1),
      },
      {
        numero: 7,
        paso: "Supervisión continua de la actividad, verificación de calidad operativa y comunicación permanente.",
        riesgo: "Exceso de confianza, omisión de controles preventivos en el desarrollo de la labor.",
        controles: "Preventivo: Monitoreo constante del procedimiento por parte del vigía o supervisor. Protectivo: Mantener delimitación activa. Reactivo: Suspensión preventiva ante condiciones inseguras.",
        responsable: getWorker(2),
      },
      {
        numero: 8,
        paso: "Pruebas técnicas de funcionamiento o verificación final del trabajo ejecutado a nivel de piso.",
        riesgo: "Fallas técnicas, contactos imprevistos con partes en movimiento.",
        controles: "Preventivo: Verificación paso a paso conforme a manual de fabricante. Protectivo: Guardas de seguridad instaladas. Reactivo: Parada de emergencia manual.",
        responsable: getWorker(0),
      },
      {
        numero: 9,
        paso: "Desconexión segura de equipos, recolección clasificada de herramientas e insumos sobrantes.",
        riesgo: "Tropiezos con extensiones eléctricas o mangueras en el suelo, desorden.",
        controles: "Preventivo: Enrollado inmediato de cables y guardado de herramientas en sus cajas portaherramientas. Protectivo: Guantes de protección. Reactivo: Reporte de novedades.",
        responsable: getWorker(1),
      },
      {
        numero: 10,
        paso: "Limpieza integral del área (5S), segregación de residuos, retiro de señalización y firma de cierre formal del permiso ATS.",
        riesgo: "Residuos abandonados que generen riesgos locativos para terceros, falta de trazabilidad documental.",
        controles: "Preventivo: Disposición de residuos en canecas según código de colores. Protectivo: Orden y aseo total. Reactivo: Firma conjunta de entrega y cierre formal con el Supervisor SST.",
        responsable: getWorker(2),
      },
    ];
  } else {
    // 10 PASOS PARA LABORES CON ALTURA REAL
    customPasos = [
      {
        numero: 1,
        paso: `Inspección preliminar del sitio de trabajo${heightText}, verificación de condiciones meteorológicas y socialización del ATS para: ${task}.`,
        riesgo: "Desconocimiento de riesgos específicos de la tarea, condiciones atmosféricas adversas (lluvia, vientos).",
        controles: "Preventivo: Charla de 5 minutos previa. Protectivo: Firma obligatoria del ATS por todo el personal. Reactivo: Suspensión inmediata en caso de tormenta.",
        responsable: getWorker(0),
      },
      {
        numero: 2,
        paso: `Delimitación perimetral del área de influencia de ${task} mediante cinta de señalización y conos reflectivos.`,
        riesgo: "Ingreso de personal no autorizado al área de maniobras, colisiones y golpes.",
        controles: "Preventivo: Cerramiento físico visible a distancia prudente. Protectivo: Conos y carteles de peligro. Reactivo: Despeje inmediato del área.",
        responsable: getWorker(1),
      },
      {
        numero: 3,
        paso: "Inspección preoperacional de Elementos de Protección Personal (EPP), arnés de cuerpo completo, eslingas y herramientas.",
        riesgo: "Fallas estructurales de arneses por desgaste, ganchos trabados o herramientas en mal estado.",
        controles: "Preventivo: Lista de chequeo preoperacional diaria de alturas. Protectivo: Rechazo inmediato de equipos no certificados. Reactivo: Reporte al supervisor.",
        responsable: getWorker(0),
      },
      {
        numero: 4,
        paso: "Verificación del punto de anclaje certificado (mínimo 5.000 lbf por persona) e instalación del conector o línea de vida.",
        riesgo: "Fallo o desprendimiento del anclaje, caída a diferente nivel durante la instalación.",
        controles: "Preventivo: Uso exclusivo de anclaje estructural certificado. Protectivo: Línea de vida vertical con arrestador. Reactivo: Plan de rescate en sitio.",
        responsable: getWorker(2),
      },
      {
        numero: 5,
        paso: "Ascenso seguro hacia el punto de operación manteniendo en todo momento tres puntos de apoyo continuos.",
        riesgo: "Pérdida de agarre, resbalón en peldaños, fatiga muscular prematura.",
        controles: "Preventivo: Conservar técnica de 3 puntos; prohibido subir herramientas en las manos. Protectivo: Arrestador de caídas conectado. Reactivo: Freno automático.",
        responsable: getWorker(0),
      },
      {
        numero: 6,
        paso: `Posicionamiento en el punto de trabajo a ${deducedAltura} e inicio de la labor técnica: ${task}, asegurando 100% de amarre continuo.`,
        riesgo: "Desconexión involuntaria, balanceo o caída pendular, posturas forzadas.",
        controles: "Preventivo: Doble eslinga en Y conectada alternadamente. Protectivo: Eslinga de posicionamiento ajustada. Reactivo: Absorbedor de impacto.",
        responsable: getWorker(1),
      },
      {
        numero: 7,
        paso: `Manipulación cuidadosa de herramientas y materiales para la ejecución de ${task}, asegurados contra caídas.`,
        riesgo: "Caída de objetos a nivel inferior que puedan lesionar al personal de apoyo o terceros.",
        controles: "Preventivo: Amarre obligatorio de herramientas con cordines elásticos (drop prevention). Protectivo: Baldes con cremallera para izaje. Reactivo: Alerta audible por vigía.",
        responsable: getWorker(0),
      },
      {
        numero: 8,
        paso: "Supervisión continua del procedimiento en alturas, control de viento y comunicación radial permanente.",
        riesgo: "Exceso de confianza, cambio repentino de condiciones climáticas.",
        controles: "Preventivo: Vigía de seguridad permanente en tierra con radio bidireccional. Protectivo: Casco con barbuquejo de 3 puntos. Reactivo: Protocolo de evacuación rápida.",
        responsable: getWorker(2),
      },
      {
        numero: 9,
        paso: "Descenso ordenado y controlado de materiales y herramientas, seguido por el descenso seguro del personal técnico.",
        riesgo: "Caída de carga durante el desmonte, precipitación por descenso apresurado.",
        controles: "Preventivo: Bajar primero los materiales con cuerda guía; descender con calma conservando el freno conectado. Protectivo: Arnés dorsal activo. Reactivo: Freno de seguridad.",
        responsable: getWorker(0),
      },
      {
        numero: 10,
        paso: "Limpieza del área de trabajo (5S), retiro de demarcaciones, disposición ecológica de residuos y firma de cierre formal del ATS.",
        riesgo: "Herramientas o cables olvidados en el suelo, falta de formalización del cierre del permiso.",
        controles: "Preventivo: Inspección final de orden y aseo. Protectivo: Disposición de residuos. Reactivo: Firma de entrega formal entre técnico y supervisor SST.",
        responsable: getWorker(1),
      },
    ];
  }

  const eppsRecomendados = isHeight
    ? [
        "CASCO CON BARBUQUEJO",
        "GAFAS DE SEGURIDAD",
        "GUANTES ANTIDESLIZANTES",
        "BOTAS ANTIDESLIZANTES",
        "ARNÉS DE CUERPO COMPLETO",
        "ESLINGA CON ABSORVEDOR DE IMPACTO",
        "ESLINGA DE POSICIONAMIENTO",
        "MOSQUETON DE CIERRE AUTOMATICO",
        "LINEA DE VIDA PORTATIL",
        "KIT DE RESCATE",
      ]
    : [
        "CASCO CON BARBUQUEJO",
        "GAFAS DE SEGURIDAD",
        "GUANTES ANTIDESLIZANTES",
        "BOTAS ANTIDESLIZANTES",
      ];

  const preparacionArea = [
    { itemIndex: 0, estado: "SI" },
    { itemIndex: 1, estado: isHeight ? "SI" : "N.A." },
    { itemIndex: 2, estado: isHeight ? "SI" : "N.A." },
    { itemIndex: 3, estado: "SI" },
    { itemIndex: 4, estado: isHeight ? "SI" : "N.A." },
    { itemIndex: 5, estado: "SI" },
    { itemIndex: 6, estado: "SI" },
    { itemIndex: 7, estado: isHeight ? "SI" : "N.A." },
    { itemIndex: 8, estado: isHotWork || isConfined ? "SI" : "N.A." },
  ];

  return {
    tipoTrabajo: deducedTipoTrabajo,
    alturaAproximada: deducedAltura,
    detalleLabor: deducedDetalleLabor,
    observaciones: deducedObservaciones,
    pasos: customPasos,
    eppsRecomendados,
    preparacionArea,
  };
}


// Caché en memoria para entregar resultados instantáneos (<1ms) en tareas idénticas
const atsFastCache = new Map<string, any>();

async function callSingleGeminiModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  schemaConfig: any,
  timeoutMs: number = 8500
): Promise<{ data: any; modelUsed: string }> {
  const generatePromise = (async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: schemaConfig,
    });
    const text = response.text;
    if (!text) {
      throw new Error(`Respuesta vacía recibida del modelo ${model}`);
    }
    return { data: JSON.parse(text), modelUsed: model };
  })();

  const timeoutPromise = new Promise<{ data: any; modelUsed: string }>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout tras ${timeoutMs}ms con el modelo ${model}`)), timeoutMs);
  });

  return Promise.race([generatePromise, timeoutPromise]);
}

// Generador de ATS con candidateModels: ["gemini-2.5-flash", "gemini-2.0-flash"]
async function generateATSWithGemini(ai: GoogleGenAI, prompt: string, schemaConfig: any) {
  const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash"];
  try {
    return await Promise.any(
      candidateModels.map((m) => callSingleGeminiModel(ai, m, prompt, schemaConfig, 8500))
    );
  } catch (parallelErr) {
    console.warn("[Gemini Fallback] Reintentando candidateModels de forma secuencial...", parallelErr);
    for (const model of candidateModels) {
      try {
        return await callSingleGeminiModel(ai, model, prompt, schemaConfig, 9000);
      } catch (err) {
        console.warn(`[Gemini] Error con ${model}:`, err);
      }
    }
    throw parallelErr;
  }
}

// API: Generate ATS with Gemini (Optimizada para velocidad máxima y análisis 100% exacto de la tarea)
app.post("/api/generate-ats", async (req, res) => {
  const { tareaGeneral, tipoTrabajo, detalleLabor, altura, personal } = req.body || {};

  const cleanTask = (tareaGeneral || "").trim();
  const cacheKey = `ats_exact_${cleanTask.toLowerCase()}`;
  if (cleanTask.length > 3 && atsFastCache.has(cacheKey)) {
    console.log(`[ATS Cache] Respuesta instantánea (<1ms) para: "${cleanTask}"`);
    const cachedData = atsFastCache.get(cacheKey);
    return res.json({ ...cachedData, source: "gemini-ai", cached: true, model: cachedData.modelUsed || "gemini-fast" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("No GEMINI_API_KEY detected, using expert safety rules generator.");
      const fallbackData = generateFallbackATS(cleanTask, tipoTrabajo, detalleLabor, altura, personal);
      return res.json({ ...fallbackData, source: "sst-rules-engine" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const personalListStr = (personal && personal.length > 0)
      ? personal.map((p: any) => `${p.nombre} (${p.cargo || "Operativo"})`).join(", ")
      : "Técnico Especialista, Técnico Electricista / Instalador, Ayudante Técnico y Vigía SST, Coordinador / Supervisor SST";

    const prompt = `Actúa como un Analista Especialista Senior en Seguridad y Salud en el Trabajo (SST) en Colombia bajo la Resolución 4272 de 2021 y normas concordantes.

TAREA EXACTA A ANALIZAR: "${cleanTask}"
${tipoTrabajo ? `(Tipo sugerido: ${tipoTrabajo})` : ""}
${altura ? `(Altura sugerida: ${altura})` : ""}
${detalleLabor ? `(Detalle sugerido: ${detalleLabor})` : ""}

Personal de trabajo disponible para asignar como responsable de cada paso:
${personalListStr}

INSTRUCCIONES ESTRICTAS DE ANÁLISIS:
1. ANÁLISIS 100% DESDE CERO: Analiza ÚNICA y EXCLUSIVAMENTE la tarea indicada. No utilices plantillas genéricas no relacionadas con la labor exacta.
2. DEDUCE EL TIPO DE TRABAJO (tipoTrabajo): Clasifica con precisión técnica el trabajo (ej. 'Mantenimiento Eléctrico', 'Trabajo en Alturas', 'Trabajo en Caliente / Soldadura', 'Trabajo a Nivel de Piso / Locativo', 'Aseo y Desinfección', 'Espacios Confinados', 'Mantenimiento Mecánico', etc.).
3. DEDUCE LA ALTURA APROXIMADA (alturaAproximada):
   - REGLA CRÍTICA: Si la tarea es a nivel de piso (ej. oficinas, pisos, bodegas a nivel del suelo, talleres en banco de trabajo, aseo terrestre, etc.): DEBES colocar EXACTAMENTE 'N/A - Nivel de piso'. NO inventes alturas ni coloques metros si no existe riesgo de caída de altura.
   - Si la labor menciona o requiere trabajo en alturas (ej. fachadas, postes, cubiertas, andamios, torres, luminarias elevadas): especifica la altura deducida (ej. "12 MTS", "4.5 MTS", "8 MTS").
4. DETALLE TÉCNICO OPERATIVO (detalleLabor): Redacta una descripción técnica precisa y profesional de la labor específica, herramientas requeridas y alcance.
5. OBSERVACIONES SST (observaciones): Redacta observaciones y recomendaciones de seguridad aplicables a la tarea.
6. MATRIZ DE EXACTAMENTE 10 PASOS SECUENCIALES:
   - Los 10 pasos deben describir la labor de inicio a fin:
     1. Socialización de ATS, charla preoperacional y verificación médica.
     2. Delimitación y señalización del área de trabajo.
     3. Inspección preoperacional de herramientas, equipos y EPP específicos de la labor.
     4 al 8. Pasos secuenciales de la ejecución técnica real (riesgos específicos y controles preventivos, protectivos y reactivos).
     9. Desmovilización segura de herramientas y equipos.
     10. Orden y aseo (5S), disposición de residuos y firma de cierre formal con el Supervisor SST.
   - Para cada paso define: 'numero' (1 a 10), 'paso', 'riesgo', 'controles' (con preventivos, protectivos y reactivos) y 'responsable' (nombre de la cuadrilla).
7. EPP RECOMENDADOS (eppsRecomendados):
   - Si la labor es a nivel de piso ('N/A - Nivel de piso'), NO incluyas arnés de cuerpo completo, eslingas de detención ni líneas de vida. Solo incluye EPP correspondientes a la labor real (casco, gafas, guantes, botas antideslizantes/dieléctricas, protección respiratoria o auditiva según aplique).
8. PREPARACIÓN DEL ÁREA (preparacionArea): 9 ítems del 0 al 8 indicando "SI", "NO" o "N.A." acordes a la labor real (los ítems de alturas van en "N.A." si es a nivel de piso).`;

    const config = {
      systemInstruction:
        "Eres un Analista Especialista en Seguridad y Salud en el Trabajo (SST) en Colombia. Genera matrices ATS técnicas, 100% adaptadas a la tarea exacta del usuario y con respuestas en JSON estructurado válido según el schema.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipoTrabajo: {
            type: Type.STRING,
            description: "Tipo de trabajo técnico deducido exclusivamente de la labor.",
          },
          alturaAproximada: {
            type: Type.STRING,
            description: "Altura de la labor. Si es a nivel de piso DEBE ser 'N/A - Nivel de piso'. Si es en alturas, indicar metraje con unidad (ej. '12 MTS').",
          },
          detalleLabor: {
            type: Type.STRING,
            description: "Descripción detallada de la labor técnica deducida de la tarea.",
          },
          observaciones: {
            type: Type.STRING,
            description: "Observaciones preventivas clave de seguridad para la labor.",
          },
          pasos: {
            type: Type.ARRAY,
            description: "Lista de exactamente 10 pasos lógicos para el ATS",
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.INTEGER },
                paso: { type: Type.STRING, description: "Descripción del procedimiento seguro" },
                riesgo: { type: Type.STRING, description: "Peligros y riesgos identificados para este paso específico" },
                controles: { type: Type.STRING, description: "Controles preventivos, protectivos y reactivos" },
                responsable: { type: Type.STRING, description: "Personal o cargo asignado de la cuadrilla" },
              },
              required: ["numero", "paso", "riesgo", "controles", "responsable"],
            },
          },
          eppsRecomendados: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          preparacionArea: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemIndex: { type: Type.INTEGER },
                estado: { type: Type.STRING },
              },
              required: ["itemIndex", "estado"],
            },
          },
        },
        required: ["tipoTrabajo", "alturaAproximada", "detalleLabor", "observaciones", "pasos"],
      },
    };

    try {
      const { data, modelUsed } = await generateATSWithGemini(ai, prompt, config);
      if (cleanTask.length > 3 && data && data.pasos && data.pasos.length > 0) {
        atsFastCache.set(cacheKey, { ...data, modelUsed });
      }
      return res.json({ ...data, source: "gemini-ai", model: modelUsed });
    } catch (geminiError: any) {
      console.warn("Retornando vía Motor Normativo SST de alta velocidad (Res. 4272/2021). Error:", geminiError?.message || geminiError);
      const fallbackData = generateFallbackATS(cleanTask, tipoTrabajo, detalleLabor, altura, personal);
      return res.json({ ...fallbackData, source: "sst-rules-engine", peakDemand: true });
    }
  } catch (error: any) {
    console.warn("Notice in ATS generation handler:", error?.message || error);
    const fallbackData = generateFallbackATS(cleanTask, tipoTrabajo, detalleLabor, altura, personal);
    return res.json({ ...fallbackData, source: "sst-rules-engine" });
  }
});

// Endpoint to send the generated ATS PDF via email with attachment
app.post("/api/send-pdf-email", async (req, res) => {
  try {
    const { to, subject, message, pdfBase64, filename } = req.body;

    if (!to || typeof to !== "string" || !to.trim()) {
      return res.status(400).json({ error: "Debe especificar al menos un correo de destino válido." });
    }

    if (!pdfBase64) {
      return res.status(400).json({ error: "No se proporcionó el archivo PDF adjunto." });
    }

    const safeFilename = (filename || "ATS_Seguridad_F-SST-045.pdf").replace(/[^a-zA-Z0-9_.-]/g, "_");

    // Clean base64 string
    const base64Data = pdfBase64.includes(";base64,")
      ? pdfBase64.split(";base64,").pop()!
      : pdfBase64;

    const attachmentBuffer = Buffer.from(base64Data, "base64");

    // SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `ATS SST <${smtpUser}>` : "ATS Seguridad Laboral <ats-sst@sistema-gestion.com>");
    const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

    let transporter: Transporter | null = null;
    let etherealUrl: string | false = false;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Test environment: create an Ethereal test inbox for real testing & preview link
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (etherealErr) {
        console.warn("Could not create test ethereal account, simulating delivery:", etherealErr);
      }
    }

    const formattedMessage = (message || "Adjunto encontrará el formato oficial de Análisis de Trabajo Seguro (ATS) debidamente diligenciado y firmado digitalmente.")
      .replace(/\n/g, "<br/>");

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 20px 24px; border-radius: 8px 8px 0 0; text-align: left;">
          <h2 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.3px;">Análisis de Trabajo Seguro (ATS)</h2>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">Sistema de Gestión de Seguridad y Salud en el Trabajo · Res. 4272/2021</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0;">
            ${formattedMessage}
          </p>
          <div style="margin-top: 20px; padding: 14px 18px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #166534;">Documento Oficial Adjunto:</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">
              📄 <strong>${safeFilename}</strong> (${(attachmentBuffer.length / 1024).toFixed(1)} KB)
            </p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #166534;">
              ✓ Incluye matriz de 10 pasos técnicos y firmas de autorización.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            Documento emitido y validado digitalmente a través de la plataforma ATS Seguridad Laboral.
          </p>
        </div>
      </div>
    `;

    if (transporter) {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: to.split(/[,;]/).map((e) => e.trim()).filter(Boolean).join(", "),
        subject: subject || `ATS Formato F-SST-045 - ${new Date().toLocaleDateString("es-CO")}`,
        text: message || "Adjunto encontrará el formato oficial de Análisis de Trabajo Seguro (ATS) en PDF.",
        html: htmlContent,
        attachments: [
          {
            filename: safeFilename,
            content: attachmentBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      etherealUrl = nodemailer.getTestMessageUrl(info);

      return res.json({
        success: true,
        messageId: info.messageId,
        previewUrl: etherealUrl || null,
        isTestPreview: !!etherealUrl,
        recipient: to,
        filename: safeFilename,
      });
    } else {
      return res.json({
        success: true,
        recipient: to,
        filename: safeFilename,
        isSimulated: true,
        message: "PDF procesado y preparado para entrega al correo.",
      });
    }
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      error: error?.message || "Ocurrió un error al procesar el envío por correo.",
    });
  }
});

// PWA Offline synchronization endpoints
const SYNCED_RECORDS_FILE = path.join(DATA_DIR, "synced_ats_records.json");

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/sync-ats", (_req, res) => {
  try {
    if (fs.existsSync(SYNCED_RECORDS_FILE)) {
      const content = fs.readFileSync(SYNCED_RECORDS_FILE, "utf-8");
      const records = JSON.parse(content || "[]");
      return res.json({ success: true, records });
    }
    return res.json({ success: true, records: [] });
  } catch (err: any) {
    console.error("Error fetching synced ATS records:", err);
    return res.status(500).json({ error: "Failed to read synced ATS records" });
  }
});

app.post("/api/sync-ats", (req, res) => {
  try {
    const incomingRecords = Array.isArray(req.body?.records) ? req.body.records : [];
    if (!incomingRecords.length) {
      return res.json({ success: true, syncedCount: 0, syncedIds: [] });
    }

    let existingRecords: any[] = [];
    if (fs.existsSync(SYNCED_RECORDS_FILE)) {
      try {
        const raw = fs.readFileSync(SYNCED_RECORDS_FILE, "utf-8");
        existingRecords = JSON.parse(raw || "[]");
      } catch (e) {
        existingRecords = [];
      }
    }

    const map = new Map<string, any>();
    // Index existing by id
    for (const rec of existingRecords) {
      if (rec?.id) map.set(rec.id, rec);
    }

    const processedIds: string[] = [];
    for (const inc of incomingRecords) {
      if (!inc || !inc.id) continue;
      const existing = map.get(inc.id);
      if (!existing) {
        map.set(inc.id, { ...inc, syncStatus: "synced", syncedAt: new Date().toISOString() });
        processedIds.push(inc.id);
      } else {
        // Only update if incoming is more recent or has valid data
        const incTime = new Date(inc.updatedAt || inc.createdAt || 0).getTime();
        const extTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (incTime >= extTime) {
          map.set(inc.id, { ...inc, syncStatus: "synced", syncedAt: new Date().toISOString() });
        }
        processedIds.push(inc.id);
      }
    }

    const mergedList = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    );

    fs.writeFileSync(SYNCED_RECORDS_FILE, JSON.stringify(mergedList, null, 2), "utf-8");

    return res.json({
      success: true,
      syncedCount: processedIds.length,
      syncedIds: processedIds,
      totalStored: mergedList.length,
    });
  } catch (err: any) {
    console.error("Error syncing ATS records:", err);
    return res.status(500).json({ error: "Failed to sync ATS records" });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";

    if (isHmrDisabled) {
      // Prevent @vite/client from opening a doomed WebSocket to port 24678 when HMR is disabled
      app.get("/@vite/client", (_req, res) => {
        res.type("application/javascript").send(`
const sheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
const cspNonce = "document" in globalThis ? document.querySelector("meta[property=csp-nonce]")?.nonce : void 0;
let lastInsertedStyle;
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (cspNonce) style.setAttribute("nonce", cspNonce);
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = void 0; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`ATS App server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
