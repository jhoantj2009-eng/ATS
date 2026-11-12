import { ATSPaso, PersonalMember } from "../types";

export interface OfflineGeneratedATS {
  tipoTrabajo: string;
  alturaAproximada: string;
  detalleLabor: string;
  observaciones: string;
  pasos: ATSPaso[];
  eppsRecomendados: string[];
  preparacionArea: Array<{ itemIndex: number; estado: "SI" | "NO" | "N.A." }>;
}

/**
 * Motor Normativo SST offline (Res. 4272/2021, Decreto 1072/2015).
 * Genera la matriz técnica de 10 pasos directamente en el navegador cuando no hay conexión a internet.
 */
export function generateOfflineATS(
  tareaGeneral: string,
  personal?: PersonalMember[],
  tipoOverride?: string,
  alturaOverride?: string,
  detalleOverride?: string
): OfflineGeneratedATS {
  const task = (tareaGeneral || "Mantenimiento general en instalaciones").trim();
  const taskLower = task.toLowerCase();

  const defaultWorkers =
    personal && personal.length > 0
      ? personal.map((p) => p.nombre)
      : [
          "CARLOS EDUARDO RODRÍGUEZ PEÑA",
          "ANDRÉS FELIPE MORALES RÍOS",
          "MATEO GÓMEZ RESTREPO",
          "JHOAN TALERO JIMÉNEZ",
        ];

  const getWorker = (idx: number) => defaultWorkers[idx % defaultWorkers.length];

  // Detección rigurosa de altura
  const heightMatch = task.match(/(\d+(\.\d+)?)\s*(m|mts|metros)\b/i);
  const isRoof =
    taskLower.includes("cubiert") ||
    taskLower.includes("teja") ||
    taskLower.includes("techo") ||
    taskLower.includes("asbesto") ||
    taskLower.includes("zinc");
  const isCleaningFacade =
    taskLower.includes("fachada") ||
    taskLower.includes("silleta") ||
    taskLower.includes("ventanales exteriores");
  const isHotWork =
    taskLower.includes("soldad") ||
    taskLower.includes("caliente") ||
    taskLower.includes("corte") ||
    taskLower.includes("esmeril") ||
    taskLower.includes("oxicorte");
  const isElectric =
    taskLower.includes("electr") ||
    taskLower.includes("luminari") ||
    taskLower.includes("cable") ||
    taskLower.includes("transformador") ||
    taskLower.includes("tablero");
  const isConfined =
    taskLower.includes("confinad") ||
    taskLower.includes("tanque") ||
    taskLower.includes("alcantarill") ||
    taskLower.includes("silo");

  const isHeight =
    isRoof ||
    isCleaningFacade ||
    taskLower.includes("altur") ||
    taskLower.includes("poste") ||
    taskLower.includes("torre") ||
    taskLower.includes("andamio") ||
    taskLower.includes("elevador") ||
    Boolean(heightMatch);

  let deducedAltura = "N/A - Nivel de piso";
  if (alturaOverride && alturaOverride.trim()) {
    deducedAltura = alturaOverride.trim();
  } else if (heightMatch) {
    deducedAltura = `${heightMatch[1]} MTS`;
  } else if (isHeight) {
    deducedAltura = isRoof ? "8 MTS" : isCleaningFacade ? "12 MTS" : "4.5 MTS";
  }

  let deducedTipo = tipoOverride || "";
  if (!deducedTipo) {
    if (isRoof) deducedTipo = "Trabajo en Alturas / Cubiertas";
    else if (isCleaningFacade) deducedTipo = "Trabajo en Alturas / Limpieza de Fachadas";
    else if (isHotWork) deducedTipo = isHeight ? "Trabajo en Caliente y Alturas" : "Trabajo en Caliente / Soldadura";
    else if (isElectric) deducedTipo = isHeight ? "Mantenimiento Eléctrico en Alturas" : "Mantenimiento Eléctrico a Nivel de Piso";
    else if (isConfined) deducedTipo = "Trabajo en Espacios Confinados";
    else deducedTipo = isHeight ? "Trabajo en Alturas" : "Trabajo a Nivel de Piso / Locativo";
  }

  const deducedDetalle =
    detalleOverride ||
    `Procedimiento técnico operativo para la ejecución segura de: ${task}, cumpliendo los lineamientos del SG-SST bajo modo fuera de línea.`;

  const deducedObservaciones = isHeight
    ? "ATS generado en Modo Sin Conexión. Verificar certificación de alturas vigente (Res. 4272/2021), inspección de arnés y puntos de anclaje certificados. Suspender en caso de lluvia o viento fuerte."
    : "ATS generado en Modo Sin Conexión para labor a nivel de piso. Mantener delimitación visual del área, orden y aseo continuo y uso obligatorio de EPP básico.";

  let customPasos: ATSPaso[] = [];

  if (!isHeight) {
    // 10 Pasos para labor a nivel de piso
    customPasos = [
      {
        id: `p-off-${Date.now()}-1`,
        numero: 1,
        paso: `Socialización del ATS, verificación de condiciones de salud y charla de 5 minutos sobre riesgos de: ${task}.`,
        riesgo: "Desconocimiento del procedimiento seguro, descompensación o fatiga del personal.",
        controles: "Preventivo: Divulgación previa del procedimiento seguro. Protectivo: Confirmación de EPP básico. Reactivo: Atención médica básica.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-2`,
        numero: 2,
        paso: `Delimitación perimetral, señalización y demarcación del área de trabajo para ${task} mediante conos y cinta reflectiva.`,
        riesgo: "Ingreso de peatones o vehículos al área de maniobras, colisiones y tropiezos.",
        controles: "Preventivo: Cerramiento físico visible. Protectivo: Conos y carteles de advertencia. Reactivo: Despeje del área ante imprevistos.",
        responsable: getWorker(1),
      },
      {
        id: `p-off-${Date.now()}-3`,
        numero: 3,
        paso: "Inspección preoperacional de herramientas manuales, eléctricas y Elementos de Protección Personal (EPP).",
        riesgo: "Herramientas con mangos agrietados, cables pelados, EPP defectuoso.",
        controles: "Preventivo: Lista de chequeo preoperacional diaria. Protectivo: Descarte de herramientas no conformes. Reactivo: Reporte a mantenimiento.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-4`,
        numero: 4,
        paso: "Inspección del entorno a nivel de piso (identificación de desniveles, humedad o superficies resbalosas).",
        riesgo: "Caídas al mismo nivel, resbalones, tropiezos con cables en el suelo.",
        controles: "Preventivo: Despeje previo del área y secado de pisos húmedos. Protectivo: Calzado de seguridad con suela antideslizante. Reactivo: Botiquín Tipo A.",
        responsable: getWorker(2),
      },
      {
        id: `p-off-${Date.now()}-5`,
        numero: 5,
        paso: `Alistamiento y traslado manual seguro de materiales e insumos necesarios para ${task}.`,
        riesgo: "Sobreesfuerzos por levantamiento manual de cargas pesadas (>25 kg).",
        controles: "Preventivo: Levantamiento flexionando rodillas y espalda recta; ayuda en equipo para cargas pesadas. Protectivo: Guantes antideslizantes. Reactivo: Pausas activas.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-6`,
        numero: 6,
        paso: `Ejecución técnica principal: ${task}, manteniendo posturas ergonómicas y concentración constante.`,
        riesgo: "Cortes, atrapamientos en manos, proyección de partículas o polvo hacia los ojos.",
        controles: "Preventivo: Concentración en la tarea y posturas ergonómicas neutras. Protectivo: Gafas de seguridad selladas y guantes mecánicos. Reactivo: Lavado ocular y primeros auxilios.",
        responsable: getWorker(1),
      },
      {
        id: `p-off-${Date.now()}-7`,
        numero: 7,
        paso: "Supervisión continua de la operación, control del entorno y verificación de parámetros de calidad y seguridad.",
        riesgo: "Exceso de confianza, acumulación de residuos en el puesto de trabajo.",
        controles: "Preventivo: Supervisión constante del vigía o supervisor SST. Protectivo: Delimitación activa. Reactivo: Suspensión preventiva ante condiciones inseguras.",
        responsable: getWorker(2),
      },
      {
        id: `p-off-${Date.now()}-8`,
        numero: 8,
        paso: "Pruebas técnicas de funcionamiento o verificación final del trabajo ejecutado a nivel de piso.",
        riesgo: "Fallas operativas, golpes o pellizcos durante la comprobación de equipos.",
        controles: "Preventivo: Procedimiento paso a paso según ficha técnica. Protectivo: Guardas de seguridad instaladas. Reactivo: Parada de emergencia manual.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-9`,
        numero: 9,
        paso: "Desconexión de equipos eléctricos, enrollado de mangueras/extensiones y desmovilización ordenada de herramientas.",
        riesgo: "Tropiezos con cables, quemaduras por superficies calientes, desorden.",
        controles: "Preventivo: Esperar enfriamiento de equipos; guardar herramientas en cajas organizadas. Protectivo: Guantes de protección térmica/mecánica. Reactivo: Protocolo de quemaduras leves.",
        responsable: getWorker(1),
      },
      {
        id: `p-off-${Date.now()}-10`,
        numero: 10,
        paso: "Limpieza integral del área (5S), disposición ecológica de residuos, retiro de demarcaciones y firma formal de cierre del ATS.",
        riesgo: "Residuos peligrosos abandonados, falta de trazabilidad documental de entrega del área.",
        controles: "Preventivo: Separación de residuos en canecas por código de colores. Protectivo: Uso de guantes durante el aseo. Reactivo: Entrega formal y firma del permiso con el Supervisor SST.",
        responsable: getWorker(2),
      },
    ];
  } else {
    // 10 Pasos para labor con altura
    customPasos = [
      {
        id: `p-off-${Date.now()}-1`,
        numero: 1,
        paso: `Inspección preliminar del sitio de trabajo (${deducedAltura}), verificación climática y socialización del ATS para: ${task}.`,
        riesgo: "Desconocimiento de riesgos específicos de la tarea, condiciones atmosféricas adversas (lluvia, vientos >30 km/h).",
        controles: "Preventivo: Charla de 5 minutos previa. Protectivo: Firma obligatoria del ATS por todo el personal. Reactivo: Suspensión inmediata en caso de tormenta.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-2`,
        numero: 2,
        paso: `Delimitación perimetral del área de influencia de ${task} mediante cinta de señalización y conos reflectivos.`,
        riesgo: "Ingreso de personal no autorizado al área de maniobras, colisiones y golpes.",
        controles: "Preventivo: Cerramiento físico visible a distancia prudente. Protectivo: Conos y carteles de peligro. Reactivo: Despeje inmediato del área.",
        responsable: getWorker(1),
      },
      {
        id: `p-off-${Date.now()}-3`,
        numero: 3,
        paso: "Inspección preoperacional de Elementos de Protección Personal (EPP), arnés de cuerpo completo, eslingas y herramientas.",
        riesgo: "Fallas estructurales de arneses por desgaste, ganchos trabados o herramientas en mal estado.",
        controles: "Preventivo: Lista de chequeo preoperacional diaria de alturas. Protectivo: Rechazo inmediato de equipos no certificados. Reactivo: Reporte al supervisor.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-4`,
        numero: 4,
        paso: "Verificación del punto de anclaje certificado (mínimo 5.000 lbf por persona) e instalación del conector o línea de vida.",
        riesgo: "Fallo o desprendimiento del anclaje, caída a diferente nivel durante la instalación.",
        controles: "Preventivo: Uso exclusivo de anclaje estructural certificado. Protectivo: Línea de vida vertical con arrestador. Reactivo: Plan de rescate en sitio.",
        responsable: getWorker(2),
      },
      {
        id: `p-off-${Date.now()}-5`,
        numero: 5,
        paso: "Ascenso seguro hacia el punto de operación manteniendo en todo momento tres puntos de apoyo continuos.",
        riesgo: "Pérdida de agarre, resbalón en peldaños, fatiga muscular prematura.",
        controles: "Preventivo: Conservar técnica de 3 puntos; prohibido subir herramientas en las manos. Protectivo: Arrestador de caídas conectado. Reactivo: Freno automático.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-6`,
        numero: 6,
        paso: `Posicionamiento en el punto de trabajo a ${deducedAltura} e inicio de la labor técnica: ${task}, asegurando 100% de amarre continuo.`,
        riesgo: "Desconexión involuntaria, balanceo o caída pendular, posturas forzadas.",
        controles: "Preventivo: Doble eslinga en Y conectada alternadamente. Protectivo: Eslinga de posicionamiento ajustada. Reactivo: Absorbedor de impacto.",
        responsable: getWorker(1),
      },
      {
        id: `p-off-${Date.now()}-7`,
        numero: 7,
        paso: `Manipulación cuidadosa de herramientas y materiales para la ejecución de ${task}, asegurados contra caídas.`,
        riesgo: "Caída de objetos a nivel inferior que puedan lesionar al personal de apoyo o terceros.",
        controles: "Preventivo: Amarre obligatorio de herramientas con cordines elásticos (drop prevention). Protectivo: Baldes con cremallera para izaje. Reactivo: Alerta audible por vigía.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-8`,
        numero: 8,
        paso: "Supervisión continua del procedimiento en alturas, control de viento y comunicación radial permanente.",
        riesgo: "Exceso de confianza, cambio repentino de condiciones climáticas.",
        controles: "Preventivo: Vigía de seguridad permanente en tierra con radio bidireccional. Protectivo: Casco con barbuquejo de 3 puntos. Reactivo: Protocolo de evacuación rápida.",
        responsable: getWorker(2),
      },
      {
        id: `p-off-${Date.now()}-9`,
        numero: 9,
        paso: "Descenso ordenado y controlado de materiales y herramientas, seguido por el descenso seguro del personal técnico.",
        riesgo: "Caída de carga durante el desmonte, precipitación por descenso apresurado.",
        controles: "Preventivo: Bajar primero los materiales con cuerda guía; descender con calma conservando el freno conectado. Protectivo: Arnés dorsal activo. Reactivo: Freno de seguridad.",
        responsable: getWorker(0),
      },
      {
        id: `p-off-${Date.now()}-10`,
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
    { itemIndex: 0, estado: "SI" as const },
    { itemIndex: 1, estado: isHeight ? ("SI" as const) : ("N.A." as const) },
    { itemIndex: 2, estado: isHeight ? ("SI" as const) : ("N.A." as const) },
    { itemIndex: 3, estado: "SI" as const },
    { itemIndex: 4, estado: isHeight ? ("SI" as const) : ("N.A." as const) },
    { itemIndex: 5, estado: "SI" as const },
    { itemIndex: 6, estado: "SI" as const },
    { itemIndex: 7, estado: isHeight ? ("SI" as const) : ("N.A." as const) },
    { itemIndex: 8, estado: isHotWork || isConfined ? ("SI" as const) : ("N.A." as const) },
  ];

  return {
    tipoTrabajo: deducedTipo,
    alturaAproximada: deducedAltura,
    detalleLabor: deducedDetalle,
    observaciones: deducedObservaciones,
    pasos: customPasos,
    eppsRecomendados,
    preparacionArea,
  };
}
