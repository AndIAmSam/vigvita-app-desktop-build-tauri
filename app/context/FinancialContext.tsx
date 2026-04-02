import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import localforage from "localforage";
import { LISTA_UNIVERSIDADES } from "../constants/UniversityData";

// ==========================================
// 1. DEFINICIÓN DE INTERFACES (ACTUALIZADAS)
// ==========================================

export type SyncStatus = "synced" | "syncing" | "pending" | "error";

// --- NUEVA: INTERFAZ DEL ASESOR (USUARIO) ---
export interface Advisor {
  id: string;
  nombre: string;
  email: string;
  token: string;
}

export interface Dependiente {
  id: string;
  nombre: string;
  edad: string;
  parentesco: string;
  notas?: string;
}

export interface Hijo {
  id: string;
  nombre: string;
  edad: string;
  universidad: string;
  yearsFaltantes: number;
  costoProyectado: number;
  ahorroAnual: number;
}

export interface JubilacionData {
  esperanzaVida: string;
  edadRetiro: string;
  montoMensual: string;
  edadActual: string;
}

export interface ActivosData {
  ahorros: string;
  casa: string;
  otrosInmuebles: string;
  vehiculos: string;
  inversiones: string;
  otros: string;
}

export interface PasivosData {
  hipoteca: string;
  prestamos: string;
  tarjetas: string;
  limiteCredito: string;
  otros: string;
}

export interface SeguroItem {
  compania: string;
  plan: string;
  sumaAsegurada: string;
  prima: string;
}

export interface SegurosData {
  individual: SeguroItem;
  colectivo: SeguroItem;
  otros: SeguroItem;
}

export interface IngresosData {
  titular: string;
  conyuge: string;
  prestacionesTitular: string;
  prestacionesConyuge: string;
}

export interface GastosBasicosData {
  servicios: string;
  vivienda: string;
  alimentacion: string;
  colegios: string;
  transporte: string;
  seguros: string;
}

export interface GastosVariablesData {
  creditos: string;
  recreacion: string;
  entretenimiento: string;
  domestico: string;
  salud: string;
  otros: string;
}

export interface FallecimientoData {
  gastosSepelio: string;
  gastosIncapacidad: string;
}

export interface DetalleData {
  otrosIngresos: string;
  tasaInteres: string;
  planProteccion: string;
  planAhorro: string;
}

export interface CitaData {
  dia: string;
  mes: string;
  hora: string;
  lugar: string;
  necesitaDecisionMaker: boolean;
  nombreDecisionMaker: string;
}

export interface Referido {
  id: string;
  nombre: string;
  edad: string;
  estadoCivil?: string;
  ocupacion: string;
  telefono: string;
  entorno?: "Familiar" | "Social" | "Profesional" | "Personal";
  grupoFamiliar?: string;
}

export interface PerfilData {
  telefono: string;
  ocupacion: string;
  hobbies: string;
  deporte: string;
  fuma: boolean;
  fechaNacimiento: string;
  estadoCivil: string;
  conyugeNombre: string;
  conyugeTelefono: string;
  conyugeFechaNacimiento: string;
  conyugeOcupacion: string;
  conyugeFuma: boolean;
  conyugeHobbies: string;
  conyugeDeporte: string;
  dependientes: Dependiente[];
  notaProteccion: string;
  notaEducacion: string;
  notaAhorro: string;
  notaJubilacion: string;
  notaSalud: string;
  notaRiesgos: string;
}

// Estructura de la Base de Datos Local
export interface ClienteGuardado {
  id: string;
  serverId?: string; // UUID devuelto por el servidor para re-ediciones (API v3)
  nombre: string;
  fechaCreacion: string;
  // NUEVO CAMPO: Estatus de venta (retro-compatible con old estatusCierre)
  estatusCierre?: boolean; // Legacy
  estatusAdquisicion?: "en_espera" | "descartado" | "cierre";
  tipoCierre?: string; // Legacy
  tiposCierre?: string[]; // Array de pólizas seleccionadas
  sincronizado: boolean;
  data: any;
}

// Interfaz del Contexto
interface FinancialData {
  // Auth
  isInitialized: boolean;
  advisor: Advisor | null;
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  isAuthenticated: boolean;

  // NUEVO: Sync
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  isOnline: boolean; // Simulado
  toggleOnlineSimulation: () => void; // Para probar sin internet
  forceSync: () => Promise<string>; // Devuelve el JSON para ver qué manda

  // Datos App
  userName: string;
  setUserName: (name: string) => void;
  nombreCliente: string;
  setNombreCliente: (name: string) => void;

  perfil: PerfilData;
  updatePerfil: (field: keyof PerfilData, value: any) => void;

  addDependiente: () => void;
  updateDependiente: (
    id: string,
    field: keyof Dependiente,
    value: string,
  ) => void;
  removeDependiente: (id: string) => void;

  hijos: Hijo[];
  updateHijoCompleto: (i: number, val: Hijo) => void;
  addHijo: () => void;
  removeHijo: (id: string) => void;

  jubilacion: JubilacionData;
  updateJubilacion: (f: keyof JubilacionData, v: string) => void;

  activos: ActivosData;
  updateActivo: (f: keyof ActivosData, v: string) => void;

  pasivos: PasivosData;
  updatePasivo: (f: keyof PasivosData, v: string) => void;

  seguros: SegurosData;
  updateSeguro: (t: keyof SegurosData, f: keyof SeguroItem, v: string) => void;

  ingresos: IngresosData;
  updateIngreso: (f: keyof IngresosData, v: string) => void;

  gastosBasicos: GastosBasicosData;
  updateGastoBasico: (f: keyof GastosBasicosData, v: string) => void;

  gastosVariables: GastosVariablesData;
  updateGastoVariable: (f: keyof GastosVariablesData, v: string) => void;

  fallecimiento: FallecimientoData;
  updateFallecimiento: (f: keyof FallecimientoData, v: string) => void;

  detalle: DetalleData;
  updateDetalle: (f: keyof DetalleData, v: string) => void;

  cita: CitaData;
  updateCita: (f: keyof CitaData, v: string) => void;

  referidos: Referido[];
  addReferido: () => void;
  updateReferido: (id: string, f: keyof Referido, v: string) => void;
  removeReferido: (id: string) => void;
  upsertReferido: (referido: Referido) => void;

  notas: string;
  updateNotas: (t: string) => void;

  piramideLevels: any[];
  updatePiramideOrder: (newOrder: any[]) => void;

  // Funciones CRM
  guardarProspecto: () => Promise<void>;
  cargarProspecto: (cliente: ClienteGuardado) => void;
  listaClientes: ClienteGuardado[];
  borrarCliente: (id: string) => Promise<void>;
  nuevoAnalisis: () => void;

  // Función para cambiar estatus de la venta
  toggleCierreProspecto: (
    id: string,
    nuevoEstado: boolean,
    tipo?: string,
  ) => void; // Legacy
  actualizarEstadoProspecto: (
    id: string,
    estadoEnums: "en_espera" | "descartado" | "cierre",
    tiposPoliza?: string[],
  ) => void;

  // Respaldo
  importarRespaldo: (
    dataJson: string,
  ) => Promise<{ success: boolean; msg: string; agregados?: number }>;

  // Modal Global
  showAlert: (msg: string) => void;
}

const FinancialContext = createContext<FinancialData | undefined>(undefined);

// ==========================================
// 2. VALORES INICIALES
// ==========================================
const initialPerfil: PerfilData = {
  telefono: "",
  ocupacion: "",
  hobbies: "",
  deporte: "",
  fuma: false,
  fechaNacimiento: "",
  estadoCivil: "",
  conyugeNombre: "",
  conyugeTelefono: "",
  conyugeFechaNacimiento: "",
  conyugeOcupacion: "",
  conyugeFuma: false,
  conyugeHobbies: "",
  conyugeDeporte: "",
  dependientes: [],
  notaProteccion: "",
  notaEducacion: "",
  notaAhorro: "",
  notaJubilacion: "",
  notaSalud: "",
  notaRiesgos: "",
};
const initialHijos: Hijo[] = [];
const initialJubilacion: JubilacionData = {
  esperanzaVida: "",
  edadRetiro: "",
  montoMensual: "",
  edadActual: "",
};
const initialActivos: ActivosData = {
  ahorros: "",
  casa: "",
  otrosInmuebles: "",
  vehiculos: "",
  inversiones: "",
  otros: "",
};
const initialPasivos: PasivosData = {
  hipoteca: "",
  prestamos: "",
  tarjetas: "",
  limiteCredito: "",
  otros: "",
};
const initialSeguros: SegurosData = {
  individual: { compania: "", plan: "", sumaAsegurada: "", prima: "" },
  colectivo: { compania: "", plan: "", sumaAsegurada: "", prima: "" },
  otros: { compania: "", plan: "", sumaAsegurada: "", prima: "" },
};
const initialIngresos: IngresosData = {
  titular: "",
  conyuge: "",
  prestacionesTitular: "",
  prestacionesConyuge: "",
};
const initialGastosBasicos: GastosBasicosData = {
  servicios: "",
  vivienda: "",
  alimentacion: "",
  colegios: "",
  transporte: "",
  seguros: "",
};
const initialGastosVariables: GastosVariablesData = {
  creditos: "",
  recreacion: "",
  entretenimiento: "",
  domestico: "",
  salud: "",
  otros: "",
};
const initialFallecimiento: FallecimientoData = {
  gastosSepelio: "",
  gastosIncapacidad: "",
};
const initialDetalle: DetalleData = {
  otrosIngresos: "",
  tasaInteres: "8",
  planProteccion: "10",
  planAhorro: "7",
};
const initialCita: CitaData = {
  dia: "",
  mes: "",
  hora: "",
  lugar: "",
  necesitaDecisionMaker: false,
  nombreDecisionMaker: "",
};
const INITIAL_PIRAMIDE_LEVELS = [
  { id: "jub", label: "JUBILACIÓN", color: "#0e8ece", icon: "plane" },
  { id: "aho", label: "AHORRO", color: "#2665ad", icon: "bank" },
  { id: "edu", label: "EDUCACIÓN", color: "#8cbe27", icon: "graduation-cap" },
  { id: "pro", label: "PROTECCIÓN", color: "#161616", icon: "shield" },
];

// ==========================================
// 3. PROVIDER PRINCIPAL
// ==========================================
export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  // GLOBAL STATES
  const [isInitialized, setIsInitialized] = useState(false);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [userName, setUserName] = useState(""); // Nombre visual (legacy)

  // CRM
  const [nombreCliente, setNombreCliente] = useState("");
  const [listaClientes, setListaClientes] = useState<ClienteGuardado[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);

  // Estados Data
  const [perfil, setPerfil] = useState<PerfilData>(initialPerfil);
  const [hijos, setHijos] = useState<Hijo[]>(initialHijos);
  const [jubilacion, setJubilacion] =
    useState<JubilacionData>(initialJubilacion);
  const [activos, setActivos] = useState<ActivosData>(initialActivos);
  const [pasivos, setPasivos] = useState<PasivosData>(initialPasivos);
  const [seguros, setSeguros] = useState<SegurosData>(initialSeguros);
  const [ingresos, setIngresos] = useState<IngresosData>(initialIngresos);
  const [gastosBasicos, setGastosBasicos] =
    useState<GastosBasicosData>(initialGastosBasicos);
  const [gastosVariables, setGastosVariables] = useState<GastosVariablesData>(
    initialGastosVariables,
  );
  const [fallecimiento, setFallecimiento] =
    useState<FallecimientoData>(initialFallecimiento);
  const [detalle, setDetalle] = useState<DetalleData>(initialDetalle);
  const [cita, setCita] = useState<CitaData>(initialCita);
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [notas, setNotas] = useState("");
  const [piramideLevels, setPiramideLevels] = useState(INITIAL_PIRAMIDE_LEVELS);

  // --- ESTADOS DE SYNC ---
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [isOnline, setIsOnline] = useState(true); // Simulador de internet
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // --- ESTADOS DEL MODAL GLOBAL ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  // ELIMINADO: useEffect inicial duplicado que causaba Race Condition

  // AUTO SYNC TRIGGER
  useEffect(() => {
    // Buscamos si hay algo SIN sincronizar
    const hayPendientes = listaClientes.some((c) => !c.sincronizado);

    if (hayPendientes && isOnline) {
      setSyncStatus("pending");
    } else if (hayPendientes && !isOnline) {
      setSyncStatus("pending");
    } else {
      setSyncStatus("synced");
    }
  }, [listaClientes, isOnline]);

  // --- HELPER: Convierte fecha DD/MM/AAAA a edad (Num) ---
  const calculateAgeNumber = (dateString: string): string => {
    if (!dateString || dateString.length < 10) return "";
    const parts = dateString.split("/");
    if (parts.length !== 3) return "";
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return "";

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    let age = today.getFullYear() - year;
    if (todayMonth < month || (todayMonth === month && todayDate < day)) {
      age--;
    }
    return age >= 0 ? age.toString() : "";
  };

  // AGE SYNC TRIGGER (0-entrevista -> 3-jubilacion)
  useEffect(() => {
    if (perfil.fechaNacimiento) {
      const computedAgeStr = calculateAgeNumber(perfil.fechaNacimiento);
      if (computedAgeStr && computedAgeStr !== jubilacion.edadActual) {
        setJubilacion((prev) => ({ ...prev, edadActual: computedAgeStr }));
      }
    }
  }, [perfil.fechaNacimiento]);

  // --- HELPER: Convierte strings a números. Si es vacío o no válido, devuelve 0 ---
  const parseNum = (val: any): number => {
    if (!val) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // --- HELPER: Mapeo de campos español → inglés para el payload ---
  const mapInsuranceItem = (item: any) => ({
    company: item?.compania || "",
    plan: item?.plan || "",
    coverage_amount: parseNum(item?.sumaAsegurada),
    premium: parseNum(item?.prima),
  });

  const mapClientData = (data: any) => ({
    profile: {
      phone: data.perfil?.telefono || "",
      occupation: data.perfil?.ocupacion || "",
      hobbies: data.perfil?.hobbies || "",
      sport: data.perfil?.deporte || "",
      smoker: data.perfil?.fuma || false,
      birth_date: data.perfil?.fechaNacimiento || "",
      marital_status: data.perfil?.estadoCivil || "",
      spouse_name: data.perfil?.conyugeNombre || "",
      spouse_phone: data.perfil?.conyugeTelefono || "",
      spouse_birth_date: data.perfil?.conyugeFechaNacimiento || "",
      spouse_occupation: data.perfil?.conyugeOcupacion || "",
      spouse_smoker: data.perfil?.conyugeFuma || false,
      spouse_hobbies: data.perfil?.conyugeHobbies || "",
      spouse_sport: data.perfil?.conyugeDeporte || "",
      dependents: (data.perfil?.dependientes || []).map((d: any) => ({
        name: d.nombre || "",
        age: parseNum(d.edad),
        relationship: d.parentesco || "",
        notes: d.notas || "",
      })),
      note_protection: data.perfil?.notaProteccion || "",
      note_education: data.perfil?.notaEducacion || "",
      note_savings: data.perfil?.notaAhorro || "",
      note_retirement: data.perfil?.notaJubilacion || "",
      note_health: data.perfil?.notaSalud || "",
      note_risks: data.perfil?.notaRiesgos || "",
    },
    children: (data.hijos || []).map((h: any) => ({
      name: h.nombre || "",
      age: parseNum(h.edad),
      university: h.universidad || "",
      years_remaining: parseNum(h.yearsFaltantes),
      projected_cost: parseNum(h.costoProyectado),
      annual_savings: parseNum(h.ahorroAnual),
    })),
    retirement: {
      life_expectancy: parseNum(data.jubilacion?.esperanzaVida),
      retirement_age: parseNum(data.jubilacion?.edadRetiro),
      monthly_amount: parseNum(data.jubilacion?.montoMensual),
      current_age: parseNum(data.jubilacion?.edadActual),
    },
    assets: {
      savings: parseNum(data.activos?.ahorros),
      house: parseNum(data.activos?.casa),
      other_properties: parseNum(data.activos?.otrosInmuebles),
      vehicles: parseNum(data.activos?.vehiculos),
      investments: parseNum(data.activos?.inversiones),
      other: parseNum(data.activos?.otros),
    },
    liabilities: {
      mortgage: parseNum(data.pasivos?.hipoteca),
      loans: parseNum(data.pasivos?.prestamos),
      credit_cards: parseNum(data.pasivos?.tarjetas),
      credit_limit: parseNum(data.pasivos?.limiteCredito),
      other: parseNum(data.pasivos?.otros),
    },
    insurance: {
      individual: mapInsuranceItem(data.seguros?.individual),
      group: mapInsuranceItem(data.seguros?.colectivo),
      other: mapInsuranceItem(data.seguros?.otros),
    },
    income: {
      holder: parseNum(data.ingresos?.titular),
      spouse: parseNum(data.ingresos?.conyuge),
      holder_benefits: data.ingresos?.prestacionesTitular || "",
      spouse_benefits: data.ingresos?.prestacionesConyuge || "",
    },
    fixed_expenses: {
      utilities: parseNum(data.gastosBasicos?.servicios),
      housing: parseNum(data.gastosBasicos?.vivienda),
      food: parseNum(data.gastosBasicos?.alimentacion),
      schools: parseNum(data.gastosBasicos?.colegios),
      transportation: parseNum(data.gastosBasicos?.transporte),
      insurance: parseNum(data.gastosBasicos?.seguros),
    },
    variable_expenses: {
      credit_payments: parseNum(data.gastosVariables?.creditos),
      recreation: parseNum(data.gastosVariables?.recreacion),
      entertainment: parseNum(data.gastosVariables?.entretenimiento),
      household: parseNum(data.gastosVariables?.domestico),
      health: parseNum(data.gastosVariables?.salud),
      other: parseNum(data.gastosVariables?.otros),
    },
    death_expenses: {
      funeral_costs: parseNum(data.fallecimiento?.gastosSepelio),
      disability_costs: parseNum(data.fallecimiento?.gastosIncapacidad),
    },
    plan_details: {
      other_income: parseNum(data.detalle?.otrosIngresos),
      interest_rate: parseNum(data.detalle?.tasaInteres),
      protection_plan: parseNum(data.detalle?.planProteccion),
      savings_plan: parseNum(data.detalle?.planAhorro),
    },
    appointment: {
      day: data.cita?.dia || "",
      month: data.cita?.mes || "",
      time: data.cita?.hora || "",
      location: data.cita?.lugar || "",
      needs_decision_maker: data.cita?.necesitaDecisionMaker || false,
      decision_maker_name: data.cita?.nombreDecisionMaker || "",
    },
    referrals: (data.referidos || []).map((r: any) => ({
      name: r.nombre || "",
      age: parseNum(r.edad),
      marital_status: r.estadoCivil || "",
      occupation: r.ocupacion || "",
      phone: r.telefono || "",
      circle: r.entorno || "",
      family_group: r.grupoFamiliar || "",
    })),
    notes: data.notas || "",
    priority_levels: (data.piramideLevels || []).map((l: any) => ({
      id: l.id,
      label: l.label,
      color: l.color,
      icon: l.icon,
    })),
  });

  // --- HELPER: Mapeo inverso inglés → español (para respuestas del servidor) ---
  const unmapInsuranceItem = (item: any) => ({
    compania: item?.company || "",
    plan: item?.plan || "",
    sumaAsegurada: item?.coverage_amount || "",
    prima: item?.premium || "",
  });

  const unmapClientData = (data: any) => ({
    perfil: {
      telefono: data.profile?.phone || "",
      ocupacion: data.profile?.occupation || "",
      hobbies: data.profile?.hobbies || "",
      deporte: data.profile?.sport || "",
      fuma: data.profile?.smoker || false,
      fechaNacimiento: data.profile?.birth_date || "",
      estadoCivil: data.profile?.marital_status || "",
      conyugeNombre: data.profile?.spouse_name || "",
      conyugeTelefono: data.profile?.spouse_phone || "",
      conyugeFechaNacimiento: data.profile?.spouse_birth_date || "",
      conyugeOcupacion: data.profile?.spouse_occupation || "",
      conyugeFuma: data.profile?.spouse_smoker || false,
      conyugeHobbies: data.profile?.spouse_hobbies || "",
      conyugeDeporte: data.profile?.spouse_sport || "",
      dependientes: (data.profile?.dependents || []).map((d: any) => ({
        id: d.id,
        nombre: d.name,
        edad: d.age,
        parentesco: d.relationship,
        notas: d.notes || "",
      })),
      notaProteccion: data.profile?.note_protection || "",
      notaEducacion: data.profile?.note_education || "",
      notaAhorro: data.profile?.note_savings || "",
      notaJubilacion: data.profile?.note_retirement || "",
      notaSalud: data.profile?.note_health || "",
      notaRiesgos: data.profile?.note_risks || "",
    },
    hijos: (data.children || []).map((h: any) => ({
      id: h.id,
      nombre: h.name,
      edad: h.age,
      universidad: h.university,
      yearsFaltantes: h.years_remaining,
      costoProyectado: h.projected_cost,
      ahorroAnual: h.annual_savings,
    })),
    jubilacion: {
      esperanzaVida: data.retirement?.life_expectancy || "",
      edadRetiro: data.retirement?.retirement_age || "",
      montoMensual: data.retirement?.monthly_amount || "",
      edadActual: data.retirement?.current_age || "",
    },
    activos: {
      ahorros: data.assets?.savings || "",
      casa: data.assets?.house || "",
      otrosInmuebles: data.assets?.other_properties || "",
      vehiculos: data.assets?.vehicles || "",
      inversiones: data.assets?.investments || "",
      otros: data.assets?.other || "",
    },
    pasivos: {
      hipoteca: data.liabilities?.mortgage || "",
      prestamos: data.liabilities?.loans || "",
      tarjetas: data.liabilities?.credit_cards || "",
      limiteCredito: data.liabilities?.credit_limit || "",
      otros: data.liabilities?.other || "",
    },
    seguros: {
      individual: unmapInsuranceItem(data.insurance?.individual),
      colectivo: unmapInsuranceItem(data.insurance?.group),
      otros: unmapInsuranceItem(data.insurance?.other),
    },
    ingresos: {
      titular: data.income?.holder || "",
      conyuge: data.income?.spouse || "",
      prestacionesTitular: data.income?.holder_benefits || "",
      prestacionesConyuge: data.income?.spouse_benefits || "",
    },
    gastosBasicos: {
      servicios: data.fixed_expenses?.utilities || "",
      vivienda: data.fixed_expenses?.housing || "",
      alimentacion: data.fixed_expenses?.food || "",
      colegios: data.fixed_expenses?.schools || "",
      transporte: data.fixed_expenses?.transportation || "",
      seguros: data.fixed_expenses?.insurance || "",
    },
    gastosVariables: {
      creditos: data.variable_expenses?.credit_payments || "",
      recreacion: data.variable_expenses?.recreation || "",
      entretenimiento: data.variable_expenses?.entertainment || "",
      domestico: data.variable_expenses?.household || "",
      salud: data.variable_expenses?.health || "",
      otros: data.variable_expenses?.other || "",
    },
    fallecimiento: {
      gastosSepelio: data.death_expenses?.funeral_costs || "",
      gastosIncapacidad: data.death_expenses?.disability_costs || "",
    },
    detalle: {
      otrosIngresos: data.plan_details?.other_income || "",
      tasaInteres: data.plan_details?.interest_rate || "",
      planProteccion: data.plan_details?.protection_plan || "",
      planAhorro: data.plan_details?.savings_plan || "",
    },
    cita: {
      dia: data.appointment?.day || "",
      mes: data.appointment?.month || "",
      hora: data.appointment?.time || "",
      lugar: data.appointment?.location || "",
      necesitaDecisionMaker: data.appointment?.needs_decision_maker || false,
      nombreDecisionMaker: data.appointment?.decision_maker_name || "",
    },
    referidos: (data.referrals || []).map((r: any) => ({
      id: r.id,
      nombre: r.name,
      edad: r.age,
      estadoCivil: r.marital_status || "",
      ocupacion: r.occupation,
      telefono: r.phone,
      entorno: r.circle || "",
      grupoFamiliar: r.family_group || "",
    })),
    notas: data.notes || "",
    piramideLevels: (data.priority_levels || []).map((l: any) => ({
      id: l.id,
      label: l.label,
      color: l.color,
      icon: l.icon,
    })),
  });

  // --- SYNC COMO JSON PURO ---
  const forceSync = async (overrideList?: ClienteGuardado[]): Promise<string> => {
    if (!isOnline) {
      showAlert("Sin conexión. Los datos se guardarán localmente.");
      return "ERROR: No hay internet. Los datos siguen locales.";
    }

    setSyncStatus("syncing");

    // Usa la lista forzada (si se acaba de guardar algo) o el state actual
    const baseList = overrideList || listaClientes;

    // 1. Filtrar solo los pendientes (DELTAS)
    const clientesPendientes = baseList.filter((c) => !c.sincronizado);

    // Si no hay nada que subir, terminamos
    if (clientesPendientes.length === 0) {
      setSyncStatus("synced");
      return "✅ Todo está al día. No hay datos pendientes de envío.";
    }

    // 2. Construir el payload JSON con campos estrictos basados en api.yaml
    const payload = {
      clients: clientesPendientes.map((cliente) => {
        let localStatus = cliente.estatusAdquisicion || (cliente.estatusCierre ? "cierre" : "en_espera");
        let acqStatus = "pending";
        // Map local status to strict API enum
        if (localStatus === "en_espera") acqStatus = "pending";
        if (localStatus === "descartado") acqStatus = "cancelled";
        if (localStatus === "cierre") acqStatus = "completed";

        const isClosed = acqStatus === "completed" || cliente.estatusCierre === true;

        const payloadClient: any = {
          name: cliente.nombre.substring(0, 100), // Max 100 chars as per API
          is_closed: isClosed,
          acquisition_status: acqStatus,
          closing_types: cliente.tiposCierre || (cliente.tipoCierre ? [cliente.tipoCierre] : []),
          data: mapClientData(cliente.data)
        };

        if (cliente.serverId) {
          payloadClient.id = cliente.serverId;
        }

        return payloadClient;
      }),
    };

    // 3. Envío al Servidor (API REAL)
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://vigvita.com.mx";
      const targetUrl = `${API_BASE_URL}/api/profiles/new`;

      console.log(`[SYNC-V3] Iniciando petición POST a: ${targetUrl}`);
      console.log(`[SYNC-V3] Payload exacto enviado:`, JSON.stringify(payload, null, 2));

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${advisor?.token || ''}`
        },
        body: JSON.stringify(payload)
      });

      console.log(`[SYNC-V3] Respuesta del servidor - Status: ${response.status}`);

      // NUEVO: INTERCEPTOR DE SEGURIDAD EN GUARDADO SILENCIOSO
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        console.warn("🔒 SESIÓN DECLINADA DURANTE SINCRONIZACIÓN: Usuario eliminado o token inválido.");
        await logout();
        return "ERROR: Sesión Inválida. Su acceso ha sido revocado y la sesión cerrada.";
      }

      if (response.status === 201) {
        // ÉXITO: Parsear respuesta para obtener UUIDs
        let returnedUuids: string[] = [];
        try {
          const resJson = await response.json();
          returnedUuids = resJson.data || [];
        } catch (err) {
          console.log("No se pudo parsear response de v3 o devolvió vacio. Errores posibles.");
        }

        setListaClientes((prev) => {
          const listaActualizada = prev.map((c) => {
            const syncIndex = clientesPendientes.findIndex(pend => pend.id === c.id);
            if (syncIndex !== -1) {
              // El cliente estaba pendiente y se mandó
              const serverUuid = returnedUuids[syncIndex];
              return {
                ...c,
                sincronizado: true,
                serverId: serverUuid || c.serverId // Preservamos si ya tenía o cargamos el nuevo
              };
            }
            return c;
          });

          // Persistimos dentro del updater de estado para asegurar la fuente de la verdad
          localforage.setItem("clientes_db", JSON.stringify(listaActualizada)).catch(console.error);
          return listaActualizada;
        });

        setSyncStatus("synced");
        setLastSyncTime(new Date().toLocaleTimeString());

        return "Sincronización exitosa con el servidor.";
      } else {
        // Fallo al crear en servidor
        const errText = await response.text();
        console.error("Error from API:", response.status, errText);
        console.log("PAYLOAD SENT:", JSON.stringify(payload, null, 2));
        setSyncStatus("pending");
        showAlert(`Error ${response.status}: ${errText.substring(0, 100)}... `);
        return "ERROR: Fallo al crear perfiles en el servidor.";
      }
    } catch (error) {
      console.error("Error al sincronizar:", error);
      setSyncStatus("pending");
      showAlert("Error de red al intentar sincronizar.");
      return "ERROR: Excepción durante la sincronización.";
    }
  };

  const toggleOnlineSimulation = () => {
    setIsOnline((prev) => !prev);
  };


  // INIT (UNIFICADO Y CORREGIDO PARA EVITAR RACE CONDITION)
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Cargar Sesión
        const storedSession = await localforage.getItem<string>("advisor_session");

        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);

          // Compatibilidad: Si tiene la propiedad .user, es el formato moderno ({user, loginTime}). 
          // Si no la tiene, asumimos que es el formato viejo (objeto plano con el token).
          const validUser = parsedSession.user ? parsedSession.user : parsedSession;
          const loginTime = parsedSession.loginTime || Date.now(); // Fallback si era legacy

          // Límite estricto de 7 días offline (7 * 24 * 60 * 60 * 1000 ms)
          const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - loginTime > MAX_OFFLINE_MS) {
            console.warn("Sesión expirada tras 7 días sin validación online. Forzando relogin.");
            await localforage.removeItem("advisor_session");
            // No seteamos el advisor, arranca deslogueado directo al Index.
          } else {
            // La sesión sigue vigente offline temporalmente
            if (validUser && validUser.token) {
              // Limpiar nombres legacy derivados del email (antes del @)
              const emailPrefix = validUser.email?.split("@")[0] || "";
              if (validUser.nombre && validUser.nombre === emailPrefix) {
                validUser.nombre = ""; // Era un nombre falso derivado del email
              }
              setAdvisor(validUser);
              setUserName(validUser.nombre);
            }
          }
        }
        // 2. Cargar DB Local (Igual que antes)
        const storedDB = await localforage.getItem<string>("clientes_db");
        if (storedDB) setListaClientes(JSON.parse(storedDB));
      } catch (e) {
        console.error("Error init", e);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  // LOGIN (INTEGRADO CON BACKEND)
  const login = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const API_BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://vigvita.com.mx";

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: pass }),
      });

      if (response.ok) {
        const data = await response.json();

        // Creamos un usuario con el token devuelto
        const user: Advisor = {
          id: "ADV-" + Math.floor(Math.random() * 1000), // Temporalmente un ID ficticio (el doc solo indica token)
          nombre: data.name || "", // Solo usar nombre del backend; vacío hasta que el backend lo devuelva
          email: email,
          token: data.token,
        };

        // Guardamos el objeto de sesión con la FECHA ACTUAL
        const sessionData = {
          user: user,
          loginTime: Date.now(), // CRÍTICO PARA LA CADUCIDAD
        };

        setAdvisor(user);
        setUserName(user.nombre);
        await localforage.setItem(
          "advisor_session",
          JSON.stringify(sessionData),
        );
        return { success: true };
      } else {
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            return { success: false, error: errorData.error };
          }
        } catch (e) {
          // Fallback a códigos de estado si no hay JSON
        }

        // Fallbacks de seguridad por si el servidor no devuelve JSON con "error"
        if (response.status === 401)
          return { success: false, error: "invalid_credentials" };
        if (response.status === 403)
          return { success: false, error: "employment_period_ended" };
        if (response.status === 422)
          return { success: false, error: "missing_required_fields" };

        return { success: false, error: "server_error" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "network_error" };
    }
  };

  const logout = async () => {
    setAdvisor(null);
    await localforage.removeItem("advisor_session");
    // No borramos la DB local, solo la sesión
  };

  const validateSession = async (): Promise<boolean> => {
    if (!advisor?.token) return false;

    // Si no estamos en línea (simulador interno), no podemos validar, dejamos pasar.
    if (!isOnline) return true;

    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://vigvita.com.mx";
      // Hacemos ping a una ruta protegida con un payload vacío.
      const targetUrl = `${API_BASE_URL}/api/profiles/new`;

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${advisor.token}`
        },
        body: JSON.stringify({ clients: [] })
      });

      // El middleware auth lanza 404/401 si el usuario fue borrado o si el token caducó.
      if (response.status === 404 || response.status === 401 || response.status === 403 || response.status === 500) {
        Alert.alert("Error de Autenticación", `El sevidor denegó tu sesión (Código: ${response.status}). Saliendo...`);
        await logout(); // Force logout inmediatamente
        return false;
      }
      
      // Si la API responde 422 (Body empty) u otro código, la autenticación fue exitosa.
      if (response.status !== 422 && response.status !== 201 && response.status !== 200) {
        Alert.alert("Advertencia de Red", `Respuesta inusual: ${response.status}`);
      }

      // Actualizamos el TimeStamp para renovar sus 7 días de vida offline:
      try {
        const sessionStr = await localforage.getItem<string>("advisor_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          // Actualización de compatibilidad a formato envoltorio si no lo tenía:
          const newSession = session.user ? session : { user: session };
          newSession.loginTime = Date.now();
          await localforage.setItem("advisor_session", JSON.stringify(newSession));
        }
      } catch (err) {
        // Ignoramos silentemente si hay error puramente al escribir
      }

      return true;
    } catch (e: any) {
      // Diferenciador infalible: ¿Es un error de Auth escondido por CORS, o me quedé sin internet?
      try {
        // Hacer ping a GOOGLE con modo no-cors. Esto NUNCA lanzará error de CORS. Solo fallará si no hay internet físico.
        await fetch("https://www.google.com/favicon.ico", { mode: "no-cors", cache: "no-store" });
        
        // Si no arrojó catch, SI HAY INTERNET. Por lo tanto el fetch al API base falló por rechazo de Auth.
        console.warn("Detección de Bloqueo por CORS: El token es inválido o el usuario no existe.");
        await logout();
        Alert.alert("Bloqueo de Seguridad", "Tu acceso ha sido revocado. Entrando en modo desconectado.");
        return false;
      } catch (offlineError) {
        // Falló el ping a google. NO HAY INTERNET.
        console.warn("Fallo real de red (Desconectado). Permitiendo acceso por caché.");
        return true;
      }
    }
  };

  // --- SETTERS ESTÁNDAR (Igual que antes) ---
  const updatePerfil = (f: keyof PerfilData, v: any) =>
    setPerfil((p) => ({ ...p, [f]: v }));
  const addDependiente = () =>
    setPerfil((prev) => ({
      ...prev,
      dependientes: [
        ...prev.dependientes,
        {
          id: Date.now().toString(),
          nombre: "",
          edad: "",
          parentesco: "",
          notas: "",
        },
      ],
    }));
  const updateDependiente = (
    id: string,
    field: keyof Dependiente,
    value: string,
  ) =>
    setPerfil((prev) => ({
      ...prev,
      dependientes: prev.dependientes.map((d) =>
        d.id === id ? { ...d, [field]: value } : d,
      ),
    }));
  const removeDependiente = (id: string) =>
    setPerfil((prev) => ({
      ...prev,
      dependientes: prev.dependientes.filter((d) => d.id !== id),
    }));
  const updateHijoCompleto = (i: number, val: Hijo) =>
    setHijos((prev) => {
      const n = [...prev];
      n[i] = val;
      return n;
    });
  const addHijo = () =>
    setHijos((p) => [
      ...p,
      {
        id: Date.now().toString(),
        nombre: "",
        edad: "",
        universidad: LISTA_UNIVERSIDADES[0],
        yearsFaltantes: 0,
        costoProyectado: 0,
        ahorroAnual: 0,
      },
    ]);
  const removeHijo = (id: string) =>
    setHijos((p) => p.filter((h) => h.id !== id));
  const updateJubilacion = (f: keyof JubilacionData, v: string) =>
    setJubilacion((p) => ({ ...p, [f]: v }));
  const updateActivo = (f: keyof ActivosData, v: string) =>
    setActivos((p) => ({ ...p, [f]: v }));
  const updatePasivo = (f: keyof PasivosData, v: string) =>
    setPasivos((p) => ({ ...p, [f]: v }));
  const updateSeguro = (t: keyof SegurosData, f: keyof SeguroItem, v: string) =>
    setSeguros((prev) => ({ ...prev, [t]: { ...prev[t], [f]: v } }));
  const updateIngreso = (f: keyof IngresosData, v: string) =>
    setIngresos((p) => ({ ...p, [f]: v }));
  const updateGastoBasico = (f: keyof GastosBasicosData, v: string) =>
    setGastosBasicos((p) => ({ ...p, [f]: v }));
  const updateGastoVariable = (f: keyof GastosVariablesData, v: string) =>
    setGastosVariables((p) => ({ ...p, [f]: v }));
  const updateFallecimiento = (f: keyof FallecimientoData, v: string) =>
    setFallecimiento((p) => ({ ...p, [f]: v }));
  const updateDetalle = (f: keyof DetalleData, v: string) =>
    setDetalle((p) => ({ ...p, [f]: v }));
  const updateCita = (f: keyof CitaData, v: string) =>
    setCita((p) => ({ ...p, [f]: v }));
  const addReferido = () =>
    setReferidos((p) => [
      ...p,
      {
        id: Date.now().toString(),
        nombre: "",
        edad: "",
        ocupacion: "",
        telefono: "",
      },
    ]);
  const removeReferido = (id: string) =>
    setReferidos((p) => p.filter((r) => r.id !== id));
  const updateReferido = (id: string, f: keyof Referido, v: string) =>
    setReferidos((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const upsertReferido = (refObj: Referido) =>
    setReferidos((prev) => {
      const index = prev.findIndex((r) => r.id === refObj.id);
      return index >= 0
        ? prev.map((r, i) => (i === index ? { ...r, ...refObj } : r))
        : [...prev, refObj];
    });
  const updateNotas = (t: string) => setNotas(t);
  const updatePiramideOrder = (newOrder: any[]) => setPiramideLevels(newOrder);
  const saveVendorName = async (name: string) => {
    setUserName(name);
  }; // Ya no guardamos en local legacy, usamos auth

  // ==========================================
  // 4. LÓGICA CRM + MÉTRICAS
  // ==========================================

  // --- LÓGICA DE GUARDADO (Marca como NO SINCRONIZADO) ---
  const guardarProspecto = async () => {
    if (!nombreCliente.trim()) {
      showAlert("Falta registrar un nombre.");
      return;
    }

    const dataSnapshot = {
      perfil,
      hijos,
      jubilacion,
      activos,
      pasivos,
      seguros,
      ingresos,
      gastosBasicos,
      gastosVariables,
      fallecimiento,
      detalle,
      cita,
      referidos,
      notas,
      piramideLevels,
    };
    let nuevaLista = [...listaClientes];

    // 1. Crear Objeto Cliente
    const nuevoClienteObj: ClienteGuardado = {
      id: currentClientId || Date.now().toString(),
      nombre: nombreCliente,
      fechaCreacion: new Date().toLocaleDateString("es-MX"),
      estatusAdquisicion: "en_espera",
      tiposCierre: [],
      sincronizado: false, // <--- SIEMPRE NACE FALSO (PENDIENTE DE SUBIR)
      data: dataSnapshot,
    };

    // 2. Insertar o Actualizar
    if (currentClientId) {
      const index = nuevaLista.findIndex((c) => c.id === currentClientId);
      if (index >= 0) {
        // Mantenemos estatus anterior (legacy o nuevo), reseteamos sincronizado
        nuevoClienteObj.estatusCierre = nuevaLista[index].estatusCierre;
        nuevoClienteObj.tipoCierre = nuevaLista[index].tipoCierre;
        nuevoClienteObj.estatusAdquisicion =
          nuevaLista[index].estatusAdquisicion ||
          (nuevaLista[index].estatusCierre ? "cierre" : "en_espera");
        nuevoClienteObj.tiposCierre =
          nuevaLista[index].tiposCierre ||
          (nuevaLista[index].tipoCierre ? [nuevaLista[index].tipoCierre] : []);

        // Preservar metadatos vitales para evitar duplicados en V3 y reseteo de fechas
        nuevoClienteObj.serverId = nuevaLista[index].serverId;
        nuevoClienteObj.fechaCreacion = nuevaLista[index].fechaCreacion;

        nuevaLista[index] = nuevoClienteObj;
      } else {
        nuevaLista.push(nuevoClienteObj);
        setCurrentClientId(nuevoClienteObj.id);
      }
    } else {
      nuevaLista.push(nuevoClienteObj);
      setCurrentClientId(nuevoClienteObj.id);
    }

    setListaClientes(nuevaLista);
    await localforage.setItem("clientes_db", JSON.stringify(nuevaLista));
    setSyncStatus("pending"); // Activa alerta visual
    showAlert("Prospecto guardado exitosamente.");

    // Disparar sincronización automática pasando el contexto actualizado para evitar carrera
    forceSync(nuevaLista);
  };

  const toggleCierreProspecto = async (
    id: string,
    nuevoEstado: boolean,
    tipoCierre?: string,
  ) => {
    // Función Legacy (dejada por si algo la llamaba externamente antes de este refactor)
    const nuevaLista = listaClientes.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          estatusCierre: nuevoEstado,
          tipoCierre: nuevoEstado ? tipoCierre : undefined,
          estatusAdquisicion: (nuevoEstado ? "cierre" : "en_espera") as
            | "en_espera"
            | "descartado"
            | "cierre",
          tiposCierre: nuevoEstado && tipoCierre ? [tipoCierre] : [],
          sincronizado: false,
        };
      }
      return c;
    });
    setListaClientes(nuevaLista);
    await localforage.setItem("clientes_db", JSON.stringify(nuevaLista));
  };

  const actualizarEstadoProspecto = async (
    id: string,
    estadoEnums: "en_espera" | "descartado" | "cierre",
    tiposPoliza?: string[],
  ) => {
    const nuevaLista = listaClientes.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          estatusAdquisicion: estadoEnums,
          tiposCierre: tiposPoliza || [],
          estatusCierre: estadoEnums === "cierre", // Proxy for legacy
          tipoCierre:
            tiposPoliza && tiposPoliza.length > 0 ? tiposPoliza[0] : undefined, // Proxy for legacy
          sincronizado: false,
        };
      }
      return c;
    });
    setListaClientes(nuevaLista);
    await localforage.setItem("clientes_db", JSON.stringify(nuevaLista));
  };

  const cargarProspecto = (cliente: ClienteGuardado) => {
    setCurrentClientId(cliente.id);
    const d = cliente.data;
    setNombreCliente(cliente.nombre);
    setPerfil(d.perfil || initialPerfil);
    setHijos(d.hijos || []);
    setJubilacion(d.jubilacion || initialJubilacion);
    setActivos(d.activos || initialActivos);
    setPasivos(d.pasivos || initialPasivos);
    setSeguros(d.seguros || initialSeguros);
    setIngresos(d.ingresos || initialIngresos);
    setGastosBasicos(d.gastosBasicos || initialGastosBasicos);
    setGastosVariables(d.gastosVariables || initialGastosVariables);
    setFallecimiento(d.fallecimiento || initialFallecimiento);
    setDetalle(d.detalle || initialDetalle);
    setCita(d.cita || initialCita);
    setReferidos(d.referidos || []);
    setNotas(d.notas || "");
    setPiramideLevels(d.piramideLevels || INITIAL_PIRAMIDE_LEVELS);
    showAlert(`Cargado: ${cliente.nombre}`);
  };

  const borrarCliente = async (id: string) => {
    const nuevaLista = listaClientes.filter((c) => c.id !== id);
    setListaClientes(nuevaLista);
    await localforage.setItem("clientes_db", JSON.stringify(nuevaLista));
    if (currentClientId === id) {
      nuevoAnalisis(true); // Pasar flag para no mostrar la de "listo para nuevo prospecto"
    }
    setTimeout(() => {
      showAlert("Prospecto eliminado exitosamente.");
    }, 100);
  };

  const nuevoAnalisis = (silencioso = false) => {
    setCurrentClientId(null);
    setNombreCliente("");
    setPerfil(initialPerfil);
    setHijos([]);
    setJubilacion(initialJubilacion);
    setActivos(initialActivos);
    setPasivos(initialPasivos);
    setSeguros(initialSeguros);
    setIngresos(initialIngresos);
    setGastosBasicos(initialGastosBasicos);
    setGastosVariables(initialGastosVariables);
    setFallecimiento(initialFallecimiento);
    setDetalle(initialDetalle);
    setCita(initialCita);
    setReferidos([]);
    setNotas("");
    setPiramideLevels(INITIAL_PIRAMIDE_LEVELS);
    if (!silencioso) {
      showAlert("Listo para nuevo prospecto. Sincronizando...");
    }

    // Auto-sync
    forceSync();
  };

  // --- RESPALDO (NUEVO) ---
  const importarRespaldo = async (
    jsonDataString: string,
  ): Promise<{ success: boolean; msg: string; agregados?: number }> => {
    try {
      const parsedData = JSON.parse(jsonDataString);
      if (!Array.isArray(parsedData)) {
        return {
          success: false,
          msg: "El archivo no tiene el formato correcto (debe ser una lista de clientes).",
        };
      }

      // Filtrar clientes válidos (debe tener id y nombre)
      const clientesValidos: ClienteGuardado[] = parsedData.filter(
        (c) => c && c.id && c.nombre,
      );

      if (clientesValidos.length === 0) {
        return {
          success: false,
          msg: "El archivo está vacío o no contenía clientes reconocibles.",
        };
      }

      // Agregamos o reemplazamos sobre la lista actual base
      let nuevaLista = [...listaClientes];
      let agregados = 0;

      for (const cImport of clientesValidos) {
        const index = nuevaLista.findIndex(
          (cLocal) => cLocal.id === cImport.id,
        );
        // Si preferimos mantener la versión importada tal cual:
        if (index >= 0) {
          nuevaLista[index] = { ...nuevaLista[index], ...cImport };
        } else {
          nuevaLista.push(cImport);
          agregados++;
        }
      }

      setListaClientes(nuevaLista);
      await localforage.setItem("clientes_db", JSON.stringify(nuevaLista));

      // Si hay conexión y tenemos cosas pendientes que suban (dependiendo de si se importó con local=false)
      setSyncStatus("pending");

      return {
        success: true,
        msg: `¡Respaldo cargado con éxito!`,
        agregados: agregados,
      };
    } catch (error) {
      console.error("Error validando JSON:", error);
      return {
        success: false,
        msg: "El archivo proporcionado no es un JSON válido o está dañado.",
      };
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        isInitialized,
        advisor,
        login,
        logout,
        validateSession,
        isAuthenticated: !!advisor,
        userName,
        setUserName: saveVendorName,
        nombreCliente,
        setNombreCliente,
        perfil,
        updatePerfil,
        hijos,
        updateHijoCompleto,
        addHijo,
        removeHijo,
        jubilacion,
        updateJubilacion,
        activos,
        updateActivo,
        pasivos,
        updatePasivo,
        seguros,
        updateSeguro,
        ingresos,
        updateIngreso,
        gastosBasicos,
        updateGastoBasico,
        gastosVariables,
        updateGastoVariable,
        fallecimiento,
        updateFallecimiento,
        detalle,
        updateDetalle,
        cita,
        updateCita,
        referidos,
        addReferido,
        updateReferido,
        removeReferido,
        upsertReferido,
        notas,
        updateNotas,
        piramideLevels,
        updatePiramideOrder,
        guardarProspecto,
        cargarProspecto,
        listaClientes,
        borrarCliente,
        nuevoAnalisis,
        toggleCierreProspecto,
        actualizarEstadoProspecto, // <--- Nueva función expuesta
        importarRespaldo, // <--- Para respaldos
        addDependiente,
        updateDependiente,
        removeDependiente,
        // Sync
        syncStatus,
        lastSyncTime,
        isOnline,
        toggleOnlineSimulation,
        forceSync,
        showAlert,
      }}
    >
      {children}

      {/* GLOBAL INFO MODAL NATIVO */}
      <Modal visible={alertVisible} animationType="fade" transparent>
        <View style={ctxStyles.modalOverlay}>
          <View style={ctxStyles.modalContent}>
            <View style={ctxStyles.iconContainer}>
              <Text style={ctxStyles.iconText}>ℹ️</Text>
            </View>
            <Text style={ctxStyles.modalTitle}>Información</Text>
            <Text style={ctxStyles.modalMessage}>{alertMessage}</Text>

            <TouchableOpacity
              style={ctxStyles.button}
              onPress={() => setAlertVisible(false)}>
              <Text style={ctxStyles.buttonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </FinancialContext.Provider>
  );
};

const ctxStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 26,
    color: '#0e8ece',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#161616',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2665ad',
    alignItems: 'center',
    shadowColor: '#2665ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  }
});

export const useFinancialData = () => {
  const context = useContext(FinancialContext);
  if (!context)
    throw new Error(
      "useFinancialData debe usarse dentro de un FinancialProvider",
    );
  return context;
};
