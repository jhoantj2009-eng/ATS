import { ATSFormData, EmpresaConfig, EPPItemDef, PersonalMember } from "../types";

export const DEFAULT_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 72" width="280" height="72">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#0c4a6e" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
  </defs>

  <!-- ESCUDO TÉCNICO INDUSTRIAL SST (Emblema Izquierdo) -->
  <g transform="translate(4, 4)">
    <!-- Base del Escudo -->
    <path d="M 32,2 L 58,13 L 58,38 C 58,54 46,62 32,66 C 18,62 6,54 6,38 L 6,13 Z" fill="url(#shieldGrad)" />
    <!-- Borde interior dorado de alta seguridad -->
    <path d="M 32,6 L 53,16 L 53,37 C 53,50 43,58 32,62 C 21,58 11,50 11,37 L 11,16 Z" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
    <!-- Símbolo de Trabajo Seguro en Alturas / Cumbrera -->
    <path d="M 32,15 L 45,37 L 38,37 L 32,27 L 26,37 L 19,37 Z" fill="#ffffff" />
    <!-- Estrella de Seguridad Industrial / Certificación -->
    <path d="M 32,34 L 35,43 L 44,46 L 35,49 L 32,58 L 29,49 L 20,46 L 29,43 Z" fill="url(#goldGrad)" />
  </g>

  <!-- MARCA CORPORATIVA DCM (Bloque Derecho) -->
  <g transform="translate(74, 8)">
    <!-- Letra D -->
    <g transform="translate(0, 0)">
      <path d="M 0,0 L 22,0 C 37,0 47,10 47,24 C 47,38 37,48 22,48 L 0,48 Z M 13,11 L 13,37 L 21,37 C 28,37 33,32 33,24 C 33,16 28,11 21,11 Z" fill="url(#navyGrad)" />
    </g>

    <!-- Letra C con Vértice Dorado -->
    <g transform="translate(54, 0)">
      <path d="M 40,11 C 36,4 28,0 20,0 C 9,0 0,9 0,24 C 0,39 9,48 20,48 C 29,48 37,43 41,36 L 30,31 C 28,34 25,37 20,37 C 14,37 12,32 12,24 C 12,16 15,11 20,11 C 25,11 28,13 30,18 Z" fill="url(#goldGrad)" />
    </g>

    <!-- Letra M con Estructura Técnica -->
    <g transform="translate(104, 0)">
      <path d="M 0,0 L 13,0 L 25,24 L 37,0 L 50,0 L 50,48 L 38,48 L 38,17 L 28,36 L 22,36 L 12,17 L 12,48 L 0,48 Z" fill="url(#shieldGrad)" />
    </g>

    <!-- Barra Divisoria Dorada Institucional -->
    <rect x="0" y="52" width="160" height="2.5" rx="1.25" fill="url(#goldGrad)" />

    <!-- Subtítulo Oficial -->
    <text x="1" y="63" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="bold" letter-spacing="1.8" fill="#475569">
      INGENIERÍA &amp; SST · SEGURIDAD
    </text>
  </g>
</svg>
`)}`;

export const DEFAULT_EMPRESA: EmpresaConfig = {
  nombreEmpresa: "DCM",
  nit: "900.852.147-3",
  logoUrl: DEFAULT_LOGO_SVG,
  codigoFormato: "F-SST-045",
  version: "01",
  vigencia: "02/09/2026",
};

export const INITIAL_STAFF: PersonalMember[] = [
  {
    id: "p1",
    nombre: "CARLOS EDUARDO RODRÍGUEZ PEÑA",
    cedula: "1.018.472.930",
    cargo: "Técnico Especialista en Alturas",
    arl: "SURA ARL",
  },
  {
    id: "p2",
    nombre: "ANDRÉS FELIPE MORALES RÍOS",
    cedula: "1.032.849.120",
    cargo: "Técnico Electricista / Instalador",
    arl: "SURA ARL",
  },
  {
    id: "p3",
    nombre: "MATEO GÓMEZ RESTREPO",
    cedula: "1.020.763.551",
    cargo: "Ayudante Técnico y Vigía SST",
    arl: "SURA ARL",
  },
  {
    id: "p4",
    nombre: "JHOAN TALERO JIMÉNEZ",
    cedula: "80.492.311",
    cargo: "Coordinador / Supervisor SST",
    arl: "POSITIVA",
    rol: "coordinador_sst",
  },
];

export const EPP_ITEMS: EPPItemDef[] = [
  // Columna 1
  { id: "epp_casco", nombre: "CASCO CON BARBUQUEJO", columna: 1 },
  { id: "epp_gafas", nombre: "GAFAS DE SEGURIDAD", columna: 1 },
  { id: "epp_guantes", nombre: "GUANTES ANTIDESLIZANTES", columna: 1 },
  { id: "epp_auditiva", nombre: "PROTECCION AUDITIVA", columna: 1 },
  { id: "epp_respiratoria", nombre: "PROTECCIÓN RESPIRATORIA", columna: 1 },
  { id: "epp_botas", nombre: "BOTAS ANTIDESLIZANTES", columna: 1 },
  { id: "epp_arnes", nombre: "ARNÉS DE CUERPO COMPLETO", columna: 1 },
  // Columna 2
  { id: "epp_eslinga_absorb", nombre: "ESLINGA CON ABSORVEDOR DE IMPACTO", columna: 2 },
  { id: "epp_eslinga_posic", nombre: "ESLINGA DE POSICIONAMIENTO", columna: 2 },
  { id: "epp_mosqueton", nombre: "MOSQUETON DE CIERRE AUTOMATICO", columna: 2 },
  { id: "epp_anclaje", nombre: "ANCLAJE PORTATIL (TIEE OF)", columna: 2 },
  { id: "epp_linea_vida", nombre: "LINEA DE VIDA PORTATIL", columna: 2 },
  { id: "epp_pretales", nombre: "PRETALES", columna: 2 },
  { id: "epp_descendedores", nombre: "DESCENDEDORES", columna: 2 },
  // Columna 3
  { id: "epp_rescate", nombre: "KIT DE RESCATE", columna: 3 },
  { id: "epp_autorretractil", nombre: "AUTORRETRACTIL", columna: 3 },
  { id: "epp_silla", nombre: "SILLA PARA TRABAJO EN SUSPENSIÓN", columna: 3 },
  { id: "epp_andamios", nombre: "ANDAMIOS", columna: 3 },
  { id: "epp_escalera_ext", nombre: "ESCALERA EXTENSIBLE", columna: 3 },
  { id: "epp_escalera_tijera", nombre: "ESCALERA TIJERA", columna: 3 },
  { id: "epp_otro", nombre: "OTRO(S):", columna: 3 },
];

export const AREA_PREPARACION_ITEMS: string[] = [
  "SE HA INSTALADO SEÑALIZACIÓN Y DELIMITACIÓN EL ÁREA DE TRABAJO",
  "EL TRABAJO EN ALTURAS LO VAN A REALIZAR MÍNIMO DOS TRABAJADORES",
  "LOS TRABAJADORES ESTAN CERTIFICADOS EN ALTURAS (VIGENTE)",
  "LOS TRABAJADORES ESTAN APTOS PARA DESARROLLAR LA LABOR (ESTADO DE SALUD Y CON CONCEPTO MEDICO VIGENTE)",
  "LOS EQUIPOS DE PROTECCIÓN CONTRA CAÍDAS SE ENCUENTRAN EN BUENAS CONDICIONES",
  "LOS ELEMENTOS DE PROTECCIÓN PERSONAL (EPP) SE ENCUENTRAN EN BUENAS CONDICIONES",
  "LOS TRABAJADORES REVISAN LOS ACCESOS AL ÁREA DE TRABAJO Y LOS REQUERIMIENTOS DE RESCATE EN CASO DE PRESENTARSE UNA EMERGENCIA",
  "EL LUGAR DONDE SE REALIZARÁ LA TAREA, TIENE INSTALADA LA LÍNEA DE VIDA O UNA ESTRUCTURA DONDE EL TRABAJADOR PUEDE ASEGURARSE",
  "EN CASO DE TRABAJAR EN ESPACIOS CONFINADOS (CERRADOS) O TRABAJOS EN CALIENTE (TRABAJOS DONDE SE EMITE CHISPAS O FUEGO), SE REALIZAN LAS CONSULTAS PREVENTIVAS RESPECTIVAS, INCLUYENDO OTROS PERMISOS CON REQUERIMIENTOS ESPECIALES.",
];

export const INITIAL_FORM_DATA: ATSFormData = {
  id: "ATS-2026-001",
  codigo: "F-SST-045",
  version: "01",
  vigencia: "02/09/2026",
  fechaDiligenciamiento: "2026-09-14",
  hora: "07:30",
  lugar: "Planta Principal - Sector Fachada Bloque B",
  trabajadores: [...INITIAL_STAFF],
  tipoTrabajo: "Trabajo en Alturas / Mantenimiento Eléctrico",
  tareaGeneral: "Mantenimiento preventivo e instalación de luminarias y ductos en fachada a 12 metros de altura",
  detalleLabor: "Revisión de cableado eléctrico estructural, cambio de luminarias LED perimetrales y fijación de soportes metálicos en altura superior.",
  alturaAproximada: "12 MTS",
  permisoValidoDesdeFecha: "2026-09-14",
  permisoValidoDesdeHora: "08:00",
  permisoValidoHastaFecha: "2026-09-14",
  permisoValidoHastaHora: "17:00",
  pasos: [
    {
      id: "p-1",
      numero: 1,
      paso: "Inspección preliminar del sitio de trabajo a 12 mts, verificación de condiciones climáticas y socialización del ATS con el equipo de trabajo.",
      riesgo: "Falta de socialización de riesgos, condiciones atmosféricas desfavorables (viento excesivo o lluvia), suelo resbaloso.",
      controles: "Divulgación y lectura conjunta del ATS antes de iniciar; verificación del estado del tiempo y suspensión inmediata si hay lluvia.",
      responsable: "Carlos Eduardo Rodríguez",
    },
    {
      id: "p-2",
      numero: 2,
      paso: "Demarcación, señalización y delimitación perimetral del área de trabajo inferior con cinta de peligro, conos reflectivos y letreros de advertencia.",
      riesgo: "Tránsito no autorizado de peatones, caída de herramientas u objetos a nivel inferior con impacto a terceros.",
      controles: "Cerramiento perimetral de mínimo 3 metros en tierra; designación de vigía en piso con silbato y chaleco de alta visibilidad.",
      responsable: "Mateo Gómez (Vigía)",
    },
    {
      id: "p-3",
      numero: 3,
      paso: "Inspección preoperacional minuciosa de equipos de protección contra caídas (arnés, eslinga con absorbedor, mosquetones) y herramientas manuales.",
      riesgo: "Uso de EPP o herrajes desgastados, costuras deshilachadas, mosquetones atascados o herramientas deterioradas.",
      controles: "Revisión física de etiquetas de certificación vigentes, verificación del seguro automático del mosquetón y marcado de herramientas operativas.",
      responsable: "Carlos Eduardo Rodríguez",
    },
    {
      id: "p-4",
      numero: 4,
      paso: "Verificación e inspección de puntos de anclaje estructural certificados (capacidad mín. 5.000 lbs) e instalación de línea de vida vertical.",
      riesgo: "Anclaje a elementos no certificados, falla o rotura de punto de apoyo durante el ascenso.",
      controles: "Uso exclusivo de anclajes aprobados por el coordinador SST; uso de protector de cuerda para evitar fricción con aristas vivas.",
      responsable: "Andrés Felipe Morales",
    },
    {
      id: "p-5",
      numero: 5,
      paso: "Ascenso seguro por escalera telescópica debidamente asegurada o plataforma, manteniendo la regla de tres puntos de apoyo continuos.",
      riesgo: "Pérdida de equilibrio durante el ascenso, resbalamiento de la base de la escalera, caída a distinto nivel.",
      controles: "Amarre de la escalera en la cabecera y base; uso de línea de vida con arrestador de caídas (freno) conectado a la argolla dorsal.",
      responsable: "Carlos Eduardo Rodríguez",
    },
    {
      id: "p-6",
      numero: 6,
      paso: "Posicionamiento en el punto de trabajo a 12 metros, conexión al 100% permanente con doble eslinga e inicio de corte de fluido eléctrico del sector.",
      riesgo: "Contacto con energía eléctrica accidental, desconexión involuntaria del sistema de anclaje.",
      controles: "Bloqueo y etiquetado (LOTO) de tableros eléctricos; comprobación de tensión cero con voltímetro; mantener siempre una rama anclada.",
      responsable: "Andrés Felipe Morales",
    },
    {
      id: "p-7",
      numero: 7,
      paso: "Desmonte cuidadoso de las luminarias existentes y montaje de los nuevos soportes y cables con herramientas amarradas a la muñeca/arnés.",
      riesgo: "Caída de herramientas de mano hacia el nivel inferior, sobreesfuerzos posturales, cortes en manos.",
      controles: "Amarre obligatorio de todas las herramientas (lanyard portaherramienta); uso de guantes mecánicos antideslizantes; rotación de postura.",
      responsable: "Carlos Eduardo Rodríguez",
    },
    {
      id: "p-8",
      numero: 8,
      paso: "Conexión eléctrica de nuevos módulos LED, energización de prueba y verificación de la fijación estructural sin desconectarse del anclaje.",
      riesgo: "Cortocircuito durante la reconexión de prueba, falso contacto o caída de material suelto.",
      controles: "Pruebas de continuidad previas; comunicación radial clara con el personal en tierra antes de energizar el circuito.",
      responsable: "Andrés Felipe Morales",
    },
    {
      id: "p-9",
      numero: 9,
      paso: "Descenso controlado y ordenado de herramientas y materiales mediante soga auxiliar y balde portaherramientas; descenso del personal.",
      riesgo: "Caída de objetos durante el desalojo de altura, resbalones en el descenso de los operarios.",
      controles: "Prohibido lanzar elementos; descenso mediante polea o balde asegurado; descenso pausado de los trabajadores enganchados al arrestador.",
      responsable: "Carlos Eduardo Rodríguez",
    },
    {
      id: "p-10",
      numero: 10,
      paso: "Desmonte de delimitación, recolección de residuos (orden y aseo 5S), entrega del área y cierre del permiso ATS con el supervisor SST.",
      riesgo: "Residuos o cables en el suelo que ocasionen caídas al mismo nivel; falta de registro del cierre de actividad.",
      controles: "Aseo total de la zona; disposición de residuos en canecas correspondientes; firma de cierre del permiso en campo.",
      responsable: "Jhoan Talero Jiménez (Supervisor)",
    },
  ],
  eppsSeleccionados: {
    epp_casco: true,
    epp_gafas: true,
    epp_guantes: true,
    epp_auditiva: true,
    epp_respiratoria: false,
    epp_botas: true,
    epp_arnes: true,
    epp_eslinga_absorb: true,
    epp_eslinga_posic: true,
    epp_mosqueton: true,
    epp_anclaje: true,
    epp_linea_vida: true,
    epp_pretales: false,
    epp_descendedores: true,
    epp_rescate: true,
    epp_autorretractil: false,
    epp_silla: false,
    epp_andamios: false,
    epp_escalera_ext: true,
    epp_escalera_tijera: false,
    epp_otro: false,
  },
  otroEppTexto: "",
  otrosEppsPersonalizados: [],
  preparacionArea: [
    { id: 0, descripcion: AREA_PREPARACION_ITEMS[0], estado: "SI" },
    { id: 1, descripcion: AREA_PREPARACION_ITEMS[1], estado: "SI" },
    { id: 2, descripcion: AREA_PREPARACION_ITEMS[2], estado: "SI" },
    { id: 3, descripcion: AREA_PREPARACION_ITEMS[3], estado: "SI" },
    { id: 4, descripcion: AREA_PREPARACION_ITEMS[4], estado: "SI" },
    { id: 5, descripcion: AREA_PREPARACION_ITEMS[5], estado: "SI" },
    { id: 6, descripcion: AREA_PREPARACION_ITEMS[6], estado: "SI" },
    { id: 7, descripcion: AREA_PREPARACION_ITEMS[7], estado: "SI" },
    { id: 8, descripcion: AREA_PREPARACION_ITEMS[8], estado: "N.A." },
  ],
  firmasTrabajadores: {},
  observaciones: "Se cuenta con procedimiento de rescate en alturas y botiquín de primeros auxilios Tipo A en el punto de encuentro número 2. Clima despejado.",
  supervisor: {
    nombre: "JHOAN TALERO JIMÉNEZ",
    cedula: "80.492.311",
    cargo: "Coordinador / Supervisor SST",
    firmaUrl: "",
  },
};
