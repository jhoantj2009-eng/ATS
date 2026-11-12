export interface EmpresaConfig {
  nombreEmpresa: string;
  nit: string;
  logoUrl: string;
  codigoFormato: string;
  version: string;
  vigencia: string;
}

export interface PersonalMember {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  arl: string;
  firmaUrl?: string;
  rol?: "trabajador" | "coordinador_sst" | "vigia";
}

export interface ATSPaso {
  id: string;
  numero: number;
  paso: string;
  riesgo: string;
  controles: string;
  responsable: string;
}

export interface AreaCheckItem {
  id: number;
  descripcion: string;
  estado: 'SI' | 'NO' | 'N.A.';
}

export interface EPPItemDef {
  id: string;
  nombre: string;
  columna: 1 | 2 | 3;
}

export interface CustomEPPItem {
  id: string;
  nombre: string;
  seleccionado: boolean;
}

export interface ATSFormData {
  id: string;
  codigo: string;
  version: string;
  vigencia: string;
  fechaDiligenciamiento: string;
  hora: string;
  lugar: string;
  trabajadores: PersonalMember[];
  tipoTrabajo: string;
  tareaGeneral: string;
  detalleLabor: string;
  alturaAproximada: string;
  permisoValidoDesdeFecha: string;
  permisoValidoDesdeHora: string;
  permisoValidoHastaFecha: string;
  permisoValidoHastaHora: string;
  pasos: ATSPaso[];
  eppsSeleccionados: Record<string, boolean>;
  otroEppTexto: string;
  otrosEppsPersonalizados?: CustomEPPItem[];
  preparacionArea: AreaCheckItem[];
  firmasTrabajadores: Record<string, string>; // workerId -> base64 signature image
  observaciones: string;
  supervisor: {
    nombre: string;
    cedula: string;
    cargo?: string;
    firmaUrl: string;
  };
}

export interface ATSHistoryRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  titulo: string;
  fecha: string;
  lugar: string;
  tipoTrabajo: string;
  alturaAproximada: string;
  pasosCount: number;
  firmasCount: number;
  empresa: EmpresaConfig;
  formData: ATSFormData;
  staffList?: PersonalMember[];
  syncStatus?: "pending" | "synced";
  syncedAt?: string;
}
