import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import localforage from "localforage";
import { Logger } from "../utils/logger";
import { LISTA_UNIVERSIDADES, getCostoUniversidad } from "../constants/UniversityData";
import {
  getUtf8ByteLength,
  truncateToUtf8Bytes,
  isValidUuid,
  parseIntSafe,
  parseFloatSafe,
  toSafeString,
} from "../utils/utf8";
import {
  apiFetch,
  safeReadResponseBody,
  isProfilesNewAuthFailure,
  parse422Error,
  SAFE_BATCH_BODY_BYTES,
  MAX_REQUEST_BODY_BYTES,
} from "../utils/apiClient";

const storage = {
  getItem: async <T = string>(key: string): Promise<T | null> => {
    if ((typeof Platform !== 'undefined' && Platform?.OS === 'web')) return localforage.getItem<T>(key);
    const val = await AsyncStorage.getItem(key);
    return (val as any) as T;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if ((typeof Platform !== 'undefined' && Platform?.OS === 'web')) {
      await localforage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if ((typeof Platform !== 'undefined' && Platform?.OS === 'web')) {
      await localforage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  }
};

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
  training?: boolean;
  isLider?: boolean;
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
  linked?: boolean;
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
  notas?: string;
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
  accompanimentStatus?: "unaccompanied" | "observation" | "demonstration";
  asesorAsignado?: { id: string; nombre: string }; // Para funciones de líder ("hecho para")
  creadoPor?: string; // Nombre del líder que creó este ADN ("hecho por", viene de relationship.created_by)
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
  bypassLoginForDev: (role?: 'lider' | 'asesor' | 'training') => Promise<void>;
  accessExpiresAt: string | null;

  // NUEVO: Líder
  isLider: boolean;
  equipoLider: { id: string; nombre: string }[];
  verificarLider: () => Promise<void>;
  asesorSeleccionadoGlobal: { id: string, nombre: string } | null;
  setAsesorSeleccionadoGlobal: (asesor: { id: string, nombre: string } | null) => void;

  // NUEVO: Sync
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  isOnline: boolean; // Simulado
  toggleOnlineSimulation: () => void; // Para probar sin internet
  forceSync: () => Promise<string>; // Devuelve el JSON para ver qué manda

  // NUEVO: Cloud Fetch
  currentServerId: string | null;
  listaNube: ClienteGuardado[];
  isFetchingCloud: boolean;
  fetchSincronizadosNube: () => Promise<void>;

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
  guardarProspecto: (
    estadoOverride?: "en_espera" | "descartado" | "cierre",
    polizasOverride?: string[],
    acompOverride?: "unaccompanied" | "observation" | "demonstration"
  ) => Promise<void>;
  cargarProspecto: (cliente: ClienteGuardado) => void;
  listaClientes: ClienteGuardado[];
  currentClientId: string | null;
  borrarCliente: (id: string) => Promise<void>;
  nuevoAnalisis: (silencioso?: boolean) => void;

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
  actualizarAcompanamiento: (
    id: string,
    status: "unaccompanied" | "observation" | "demonstration"
  ) => Promise<void>;
  actualizarAsesorProspecto: (
    id: string,
    nuevoAsesor: { id: string; nombre: string } | null
  ) => Promise<void>;

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
  { id: "pro", label: "ESTILO DE VIDA", sublabel: "(Protección Familiar)", color: "#161616", icon: "shield" },
];

// ==========================================
// 3. PROVIDER PRINCIPAL
// ==========================================
export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  // GLOBAL STATES
  const [isInitialized, setIsInitialized] = useState(false);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const advisorRef = useRef<Advisor | null>(null);
  advisorRef.current = advisor;
  const [userName, setUserName] = useState(""); // Nombre visual (legacy)

  // LÍDER DE EQUIPO / SUPERADMIN (API v16: /api/profile-advisors)
  const [isLider, setIsLider] = useState(false);
  const [equipoLider, setEquipoLider] = useState<{ id: string; nombre: string }[]>([]);
  const [asesorSeleccionadoGlobal, setAsesorSeleccionadoGlobal] = useState<{ id: string; nombre: string } | null>(null);
  const equipoLiderRef = useRef<{ id: string; nombre: string }[]>([]);
  const advisorsDirectoryRef = useRef<Record<string, string>>({});
  const adnAdvisorMapRef = useRef<Record<string, { id: string; nombre: string }>>({});
  const accessExpiresAtRef = useRef<string | null>(null);

  const normalizeAdvisorName = (s?: string): string =>
    (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  const updateEquipoLider = (list: { id: string; nombre: string }[]) => {
    equipoLiderRef.current = list;
    setEquipoLider(list);

    if (list.length > 0) {
      let dirChanged = false;
      const nextDir = { ...advisorsDirectoryRef.current };
      for (const item of list) {
        if (item.id && item.nombre && nextDir[item.nombre] !== item.id) {
          nextDir[item.nombre] = item.id;
          dirChanged = true;
        }
      }
      if (dirChanged) {
        advisorsDirectoryRef.current = nextDir;
        storage.setItem("advisors_directory_cache", JSON.stringify(nextDir)).catch(console.error);
      }
    }
  };

  const rememberAdnAdvisor = (
    serverId: string | undefined,
    asesor?: { id: string; nombre: string }
  ) => {
    if (!serverId || !asesor?.id) return;
    const prev = adnAdvisorMapRef.current[serverId];
    if (prev && prev.id === asesor.id && prev.nombre === asesor.nombre) return;
    const nextMap = {
      ...adnAdvisorMapRef.current,
      [serverId]: { id: asesor.id, nombre: asesor.nombre },
    };
    adnAdvisorMapRef.current = nextMap;
    storage.setItem("adn_advisor_map", JSON.stringify(nextMap)).catch(console.error);
  };

  const resolveAdvisorId = (
    nombre?: string,
    serverId?: string,
    currentId?: string
  ): string => {
    if (isValidUuid(currentId)) {
      const trimmed = currentId.trim();
      // Auto-reparación: si el UUID guardado ya no aparece en /api/profile-advisors pero
      // el mismo nombre aparece de forma única en la lista activa, usar el UUID vigente.
      // Si el nombre NO está en la lista activa (ej. excepción SuperAdmin para asesor expirado),
      // se preserva el UUID original.
      if (
        equipoLiderRef.current.length > 0 &&
        !equipoLiderRef.current.some((a) => a.id === trimmed) &&
        nombre
      ) {
        const normTarget = normalizeAdvisorName(nombre);
        const matches = equipoLiderRef.current.filter(
          (a) => normalizeAdvisorName(a.nombre) === normTarget && isValidUuid(a.id)
        );
        if (matches.length === 1) {
          return matches[0].id.trim();
        }
      }
      return trimmed;
    }
    if (serverId) {
      const mapped = adnAdvisorMapRef.current[serverId];
      if (mapped?.id && isValidUuid(mapped.id)) return mapped.id.trim();
      if (mapped?.id && !currentId) return mapped.id;
    }
    if (nombre) {
      const normTarget = normalizeAdvisorName(nombre);
      const activeMatch = equipoLiderRef.current.find(
        (a) => normalizeAdvisorName(a.nombre) === normTarget
      );
      if (activeMatch?.id) return activeMatch.id;
      const cachedId = advisorsDirectoryRef.current[nombre];
      if (cachedId) return cachedId;
    }
    return currentId || "";
  };

  const hydrateAsesorAsignado = (
    asesor?: { id: string; nombre: string },
    serverId?: string
  ): { id: string; nombre: string } | undefined => {
    if (!asesor) return undefined;
    const resolvedId = resolveAdvisorId(asesor.nombre, serverId, asesor.id);
    if (resolvedId === asesor.id) return asesor;
    return { id: resolvedId, nombre: asesor.nombre };
  };

  // CRM
  const [nombreCliente, setNombreCliente] = useState("");
  const [listaClientes, setListaClientes] = useState<ClienteGuardado[]>([]);
  const listaClientesRef = useRef<ClienteGuardado[]>([]);
  listaClientesRef.current = listaClientes;
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [listaNube, setListaNube] = useState<ClienteGuardado[]>([]);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const isSyncingRef = useRef(false);

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
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [piramideLevels, setPiramideLevels] = useState(INITIAL_PIRAMIDE_LEVELS);

  // --- ESTADOS DE SYNC ---
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true // Fallback seguro si navigator no existe (SSR)
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // --- ESTADOS DEL MODAL GLOBAL ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [pendingDraftAlert, setPendingDraftAlert] = useState(false);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  // ELIMINADO: useEffect inicial duplicado que causaba Race Condition

  // AUTO BACKUP DRAFT (Borrador Temporal)
  useEffect(() => {
    if (!isInitialized) return; // Solo autoguardamos una vez que la base de datos se cargó

    // Ignorar guardado si el prospecto está completamente en blanco (ej. justo después de "Nuevo Análisis" o al arrancar por 1ra vez)
    if (!currentClientId && !nombreCliente.trim() && !perfil.telefono.trim() && !perfil.ocupacion.trim()) {
      return;
    }

    const snapshot = {
      currentClientId,
      currentServerId,
      asesorSeleccionadoGlobal,
      nombreCliente,
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

    // Lo guardamos de manera asíncrona silenciosa
    storage.setItem("draft_prospect_v1", JSON.stringify(snapshot)).catch(e => {
      console.error("Error auto-saving draft:", e);
    });

  }, [
    isInitialized,
    currentClientId,
    asesorSeleccionadoGlobal,
    nombreCliente,
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
  ]);

  // DETECCIÓN DE CONECTIVIDAD EN TIEMPO REAL
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return; // SSR & Native guard

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // AUTO SYNC TRIGGER
  // ACTUALIZACIÓN DE ESTADO DE UI (Sin trigger de red para evitar loops)
  useEffect(() => {
    // Buscamos si hay algo SIN sincronizar
    const hayPendientes = listaClientes.some((c) => !c.sincronizado);
    if (hayPendientes) {
      setSyncStatus("pending");
    } else {
      setSyncStatus("synced");
    }
  }, [listaClientes, isOnline]);

  // AUTO SYNC SOLO AL RECUPERAR CONEXIÓN
  // (Previene loops infinitos si la red rechaza los prospectos repetidamente,
  //  y nunca dispara peticiones sin sesión autenticada)
  useEffect(() => {
    const curAdvisor = advisorRef.current;
    if (
      isOnline &&
      curAdvisor?.token &&
      !curAdvisor.training &&
      curAdvisor.id !== "DEV-MODE"
    ) {
      setListaClientes((currentList) => {
        const hayPendientes = currentList.some((c) => !c.sincronizado);
        if (hayPendientes) {
          // Pequeño retraso para salir del ciclo de renderizado de React
          setTimeout(() => {
            forceSync(currentList).catch((err) => console.warn("Network auto-sync error:", err));
          }, 1500);
        }
        return currentList;
      });
    }
  }, [isOnline]);

  // AppState Listener para sincronizar al volver del background (solo con sesión activa)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        nextAppState === "active" &&
        isOnline &&
        advisor?.token &&
        !advisor.training &&
        advisor.id !== "DEV-MODE"
      ) {
        const hayPendientes = listaClientesRef.current.some((c) => !c.sincronizado);
        if (hayPendientes) {
          setSyncStatus("pending");
          forceSync().catch((err) => console.warn("Background auto-sync error:", err));
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [listaClientes, isOnline, advisor]);

  // AUTO SYNC AL INICIAR LA APP (Cold Boot) Y TRAS INICIAR SESIÓN (Post-Login)
  useEffect(() => {
    if (
      isInitialized &&
      isOnline &&
      advisor?.token &&
      !advisor.training &&
      advisor.id !== "DEV-MODE"
    ) {
      const hayPendientes = listaClientesRef.current.some((c) => !c.sincronizado);
      if (hayPendientes) {
        setSyncStatus("pending");
        // Pequeño retraso para evitar sobrecargar el arranque y permitir cargar /api/profile-advisors
        const timer = setTimeout(() => {
          forceSync().catch((err) => console.warn("Init/Login auto-sync error:", err));
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isInitialized, advisor?.token]);

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

  // CHILDREN SYNC TRIGGER (0-entrevista -> 2-educacion)
  useEffect(() => {
    if (!isInitialized) return;

    const dependientesHijos = perfil.dependientes.filter(d =>
      d.parentesco.toLowerCase().includes("hijo")
    );

    setHijos(prevHijos => {
      let changed = false;
      let newHijos = [...prevHijos];
      const currentYear = new Date().getFullYear();
      const usedFallbackIndices = new Set<number>();

      const hijosMap = new Map();
      newHijos.forEach((h, idx) => hijosMap.set(h.id, { h, idx }));

      dependientesHijos.forEach(dep => {
        if (hijosMap.has(dep.id)) {
          const { h, idx } = hijosMap.get(dep.id);
          if (h.nombre !== dep.nombre || h.edad !== dep.edad) {
            const updatedHijo = { ...h, nombre: dep.nombre, edad: dep.edad };

            // Si cambió la edad, recalculamos costos
            if (h.edad !== dep.edad) {
              const edadNum = parseInt(dep.edad);
              if (!isNaN(edadNum) && updatedHijo.universidad) {
                const faltan = 18 - edadNum;
                const yearsFaltantes = faltan > 0 ? faltan : 0;
                const yearEntrada = currentYear + yearsFaltantes;
                const costo = getCostoUniversidad(updatedHijo.universidad, yearEntrada);
                let ahorro = 0;
                if (yearsFaltantes <= 0) {
                  ahorro = costo;
                } else {
                  ahorro = costo / yearsFaltantes;
                }
                updatedHijo.yearsFaltantes = yearsFaltantes;
                updatedHijo.costoProyectado = costo;
                updatedHijo.ahorroAnual = ahorro;
              } else {
                updatedHijo.yearsFaltantes = 0;
                updatedHijo.costoProyectado = 0;
                updatedHijo.ahorroAnual = 0;
              }
            }
            newHijos[idx] = updatedHijo;
            changed = true;
          }
        } else {
          // --- FALLBACK: Buscar hijo existente por nombre para evitar duplicados ---
          // Usa un Set de índices ya vinculados para no reusar el mismo hijo cuando
          // hay dos dependientes con nombre similar.
          const fallbackIdx = newHijos.findIndex((h, idx) => 
            h.nombre.trim().toLowerCase() === dep.nombre.trim().toLowerCase() && 
            !usedFallbackIndices.has(idx)
          );

          if (fallbackIdx >= 0) {
            // Re-vincular: actualizar ID y datos del dependiente sin crear duplicado
            usedFallbackIndices.add(fallbackIdx);
            const existingHijo = newHijos[fallbackIdx];
            newHijos[fallbackIdx] = { ...existingHijo, id: dep.id, nombre: dep.nombre, edad: dep.edad, linked: true };
            // Actualizar en el mapa para no usarlo dos veces
            hijosMap.set(dep.id, { h: newHijos[fallbackIdx], idx: fallbackIdx });
            changed = true;
          } else {
            // Genuinamente nuevo hijo detectado en dependientes
          const edadNum = parseInt(dep.edad);
          const defaultUni = LISTA_UNIVERSIDADES[0];
          let yearsFaltantes = 0;
          let costoProyectado = 0;
          let ahorroAnual = 0;

          if (!isNaN(edadNum)) {
            const faltan = 18 - edadNum;
            yearsFaltantes = faltan > 0 ? faltan : 0;
            const yearEntrada = currentYear + yearsFaltantes;
            costoProyectado = getCostoUniversidad(defaultUni, yearEntrada);
            if (yearsFaltantes <= 0) {
              ahorroAnual = costoProyectado;
            } else {
              ahorroAnual = costoProyectado / yearsFaltantes;
            }
          }

          newHijos.push({
            id: dep.id, // Usar el mismo ID para vincularlos
            nombre: dep.nombre,
            edad: dep.edad,
            universidad: defaultUni,
            yearsFaltantes,
            costoProyectado,
            ahorroAnual,
            linked: true
          });
          changed = true;
          }
        }
      });

      // Si a un dependiente se le cambió el parentesco (ya no es hijo) pero su ID sigue en perfil.dependientes
      const allDepIds = new Set(perfil.dependientes.map(d => d.id));
      const validHijosIds = new Set(dependientesHijos.map(d => d.id));

      const filteredHijos = newHijos.filter(h => {
        if (allDepIds.has(h.id) && !validHijosIds.has(h.id)) {
          changed = true;
          return false;
        }
        return true;
      });

      return changed ? filteredHijos : prevHijos;
    });
  }, [perfil.dependientes, isInitialized]);

  // --- HELPER: Mapeo de campos español → inglés para el payload (API Desktop v16) ---
  // Garantiza tipos JSON estrictos (integer vs number, boolean, string), allowlist exacto
  // sin campos desconocidos (evita 400) y límites UTF-8 en bytes (referrals[].notes <= 255B).
  const mapInsuranceItem = (item: any) => ({
    company: toSafeString(item?.compania),
    plan: toSafeString(item?.plan),
    coverage_amount: parseFloatSafe(item?.sumaAsegurada),
    premium: parseFloatSafe(item?.prima),
  });

  const mapClientData = (data: any) => ({
    profile: {
      phone: toSafeString(data.perfil?.telefono),
      occupation: toSafeString(data.perfil?.ocupacion),
      hobbies: toSafeString(data.perfil?.hobbies),
      sport: toSafeString(data.perfil?.deporte),
      smoker: Boolean(data.perfil?.fuma),
      birth_date: toSafeString(data.perfil?.fechaNacimiento),
      marital_status: toSafeString(data.perfil?.estadoCivil),
      spouse_name: toSafeString(data.perfil?.conyugeNombre),
      spouse_phone: toSafeString(data.perfil?.conyugeTelefono),
      spouse_birth_date: toSafeString(data.perfil?.conyugeFechaNacimiento),
      spouse_occupation: toSafeString(data.perfil?.conyugeOcupacion),
      spouse_smoker: Boolean(data.perfil?.conyugeFuma),
      spouse_hobbies: toSafeString(data.perfil?.conyugeHobbies),
      spouse_sport: toSafeString(data.perfil?.conyugeDeporte),
      dependents: (data.perfil?.dependientes || []).map((d: any) => ({
        name: toSafeString(d?.nombre),
        age: parseIntSafe(d?.edad),
        relationship: toSafeString(d?.parentesco),
        notes: toSafeString(d?.notas),
      })),
      note_protection: toSafeString(data.perfil?.notaProteccion),
      note_education: toSafeString(data.perfil?.notaEducacion),
      note_savings: toSafeString(data.perfil?.notaAhorro),
      note_retirement: toSafeString(data.perfil?.notaJubilacion),
      note_health: toSafeString(data.perfil?.notaSalud),
      note_risks: toSafeString(data.perfil?.notaRiesgos),
    },
    children: (data.hijos || []).map((h: any) => ({
      name: toSafeString(h?.nombre),
      age: parseIntSafe(h?.edad),
      university: toSafeString(h?.universidad),
      years_remaining: parseIntSafe(h?.yearsFaltantes),
      projected_cost: parseFloatSafe(h?.costoProyectado),
      annual_savings: parseFloatSafe(h?.ahorroAnual),
    })),
    retirement: {
      life_expectancy: parseIntSafe(data.jubilacion?.esperanzaVida),
      retirement_age: parseIntSafe(data.jubilacion?.edadRetiro),
      monthly_amount: parseFloatSafe(data.jubilacion?.montoMensual),
      current_age: parseIntSafe(data.jubilacion?.edadActual),
    },
    assets: {
      savings: parseFloatSafe(data.activos?.ahorros),
      house: parseFloatSafe(data.activos?.casa),
      other_properties: parseFloatSafe(data.activos?.otrosInmuebles),
      vehicles: parseFloatSafe(data.activos?.vehiculos),
      investments: parseFloatSafe(data.activos?.inversiones),
      other: parseFloatSafe(data.activos?.otros),
    },
    liabilities: {
      mortgage: parseFloatSafe(data.pasivos?.hipoteca),
      loans: parseFloatSafe(data.pasivos?.prestamos),
      credit_cards: parseFloatSafe(data.pasivos?.tarjetas),
      credit_limit: parseFloatSafe(data.pasivos?.limiteCredito),
      other: parseFloatSafe(data.pasivos?.otros),
    },
    insurance: {
      individual: mapInsuranceItem(data.seguros?.individual),
      group: mapInsuranceItem(data.seguros?.colectivo),
      other: mapInsuranceItem(data.seguros?.otros),
    },
    income: {
      holder: parseFloatSafe(data.ingresos?.titular),
      spouse: parseFloatSafe(data.ingresos?.conyuge),
      holder_benefits: toSafeString(data.ingresos?.prestacionesTitular),
      spouse_benefits: toSafeString(data.ingresos?.prestacionesConyuge),
    },
    fixed_expenses: {
      utilities: parseFloatSafe(data.gastosBasicos?.servicios),
      housing: parseFloatSafe(data.gastosBasicos?.vivienda),
      food: parseFloatSafe(data.gastosBasicos?.alimentacion),
      schools: parseFloatSafe(data.gastosBasicos?.colegios),
      transportation: parseFloatSafe(data.gastosBasicos?.transporte),
      insurance: parseFloatSafe(data.gastosBasicos?.seguros),
    },
    variable_expenses: {
      credit_payments: parseFloatSafe(data.gastosVariables?.creditos),
      recreation: parseFloatSafe(data.gastosVariables?.recreacion),
      entertainment: parseFloatSafe(data.gastosVariables?.entretenimiento),
      household: parseFloatSafe(data.gastosVariables?.domestico),
      health: parseFloatSafe(data.gastosVariables?.salud),
      other: parseFloatSafe(data.gastosVariables?.otros),
    },
    death_expenses: {
      funeral_costs: parseFloatSafe(data.fallecimiento?.gastosSepelio),
      disability_costs: parseFloatSafe(data.fallecimiento?.gastosIncapacidad),
    },
    plan_details: {
      other_income: parseFloatSafe(data.detalle?.otrosIngresos),
      interest_rate: parseFloatSafe(data.detalle?.tasaInteres),
      protection_plan: parseFloatSafe(data.detalle?.planProteccion),
      savings_plan: parseFloatSafe(data.detalle?.planAhorro),
    },
    appointment: {
      day: toSafeString(data.cita?.dia),
      month: toSafeString(data.cita?.mes),
      time: toSafeString(data.cita?.hora),
      location: toSafeString(data.cita?.lugar),
      needs_decision_maker: Boolean(data.cita?.necesitaDecisionMaker),
      decision_maker_name: toSafeString(data.cita?.nombreDecisionMaker),
    },
    referrals: (data.referidos || []).map((r: any) => ({
      name: toSafeString(r?.nombre),
      age: parseIntSafe(r?.edad),
      marital_status: toSafeString(r?.estadoCivil),
      occupation: toSafeString(r?.ocupacion),
      phone: toSafeString(r?.telefono),
      circle: toSafeString(r?.entorno),
      family_group: toSafeString(r?.grupoFamiliar),
      // API v16: max 255 BYTES en UTF-8 (acentos cuentan doble)
      notes: truncateToUtf8Bytes(toSafeString(r?.notas), 255),
    })),
    notes: toSafeString(data.notas),
    priority_levels: (data.piramideLevels || []).map((l: any) => ({
      id: toSafeString(l?.id),
      label: toSafeString(l?.label),
      color: toSafeString(l?.color),
      icon: toSafeString(l?.icon),
    })),
  });

  // --- HELPER: Mapeo inverso inglés → español (para respuestas del servidor) ---
  // toStr: convierte cualquier valor a string para que la UI pueda llamar .replace()
  // en el formateo de números. El servidor devuelve numbers, la UI espera strings.
  const toStr = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val);
  };

  const unmapInsuranceItem = (item: any) => ({
    compania: item?.company || "",
    plan: item?.plan || "",
    sumaAsegurada: toStr(item?.coverage_amount),
    prima: toStr(item?.premium),
  });

  const unmapReferralsList = (referralsData: any[]) => {
    // La pantalla 7-referidos.tsx busca referidos por ID con formato "${entorno}-${index}".
    // Ejemplo: "Familiar-0", "Personal-1", "Social-0", etc.
    const rawRefs = (referralsData || []).map((r: any) => ({
      nombre: r.name || r.nombre || "",
      edad: toStr(r.age ?? r.edad),
      estadoCivil: r.marital_status || r.estadoCivil || "",
      ocupacion: r.occupation || r.ocupacion || "",
      telefono: r.phone || r.telefono || "",
      entorno: r.circle || r.entorno || "Personal",
      grupoFamiliar: r.family_group || r.grupoFamiliar || "",
      notas: r.notes || r.notas || "",
    }));

    const entornoCounters: Record<string, number> = {};
    return rawRefs.map((ref: any) => {
      const env = ref.entorno;
      const idx = entornoCounters[env] || 0;
      entornoCounters[env] = idx + 1;
      return { ...ref, id: `${env}-${idx}` };
    });
  };

  const unmapClientData = (data: any) => {
    const ts = Date.now();

    // 1. Generar dependientes con IDs estables (timestamp compartido)
    const dependientes = (data.profile?.dependents || []).map((d: any, i: number) => ({
      id: d.id || `dep-${ts}-${i}`,
      nombre: d.name || "",
      edad: toStr(d.age),
      parentesco: d.relationship || "",
      notas: d.notes || "",
    }));

    // 2. Identificar dependientes que son hijos para cross-reference con el arreglo de children
    const depHijos = dependientes.filter((d: any) =>
      d.parentesco.toLowerCase().includes("hijo")
    );

    // 3. Generar hijos con IDs alineados a sus dependientes correspondientes.
    //    Esto evita que el useEffect CHILDREN SYNC los considere nuevos y cree duplicados.
    const usedDepIds = new Set<string>();
    const hijos = (data.children || []).map((h: any, i: number) => {
      const nombre = h.name || "";
      const edad = toStr(h.age);

      // Buscar dependiente correspondiente por nombre+edad
      const matchingDep = depHijos.find((d: any) =>
        d.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() &&
        d.edad === edad &&
        !usedDepIds.has(d.id)
      );

      let id: string;
      if (h.id) {
        id = h.id; // Preservar ID del servidor si existe
      } else if (matchingDep) {
        id = matchingDep.id; // Usar el MISMO ID que el dependiente
        usedDepIds.add(id);
      } else {
        id = `hijo-${ts}-${i}`; // Hijo manual sin dependiente correspondiente
      }

      return {
        id,
        nombre,
        edad,
        universidad: h.university || "",
        yearsFaltantes: h.years_remaining ?? 0,
        costoProyectado: h.projected_cost ?? 0,
        ahorroAnual: h.annual_savings ?? 0,
      };
    });

    return {
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
      dependientes,
      notaProteccion: data.profile?.note_protection || "",
      notaEducacion: data.profile?.note_education || "",
      notaAhorro: data.profile?.note_savings || "",
      notaJubilacion: data.profile?.note_retirement || "",
      notaSalud: data.profile?.note_health || "",
      notaRiesgos: data.profile?.note_risks || "",
    },
    hijos,
    jubilacion: {
      esperanzaVida: toStr(data.retirement?.life_expectancy),
      edadRetiro: toStr(data.retirement?.retirement_age),
      montoMensual: toStr(data.retirement?.monthly_amount),
      edadActual: toStr(data.retirement?.current_age),
    },
    activos: {
      ahorros: toStr(data.assets?.savings),
      casa: toStr(data.assets?.house),
      otrosInmuebles: toStr(data.assets?.other_properties),
      vehiculos: toStr(data.assets?.vehicles),
      inversiones: toStr(data.assets?.investments),
      otros: toStr(data.assets?.other),
    },
    pasivos: {
      hipoteca: toStr(data.liabilities?.mortgage),
      prestamos: toStr(data.liabilities?.loans),
      tarjetas: toStr(data.liabilities?.credit_cards),
      limiteCredito: toStr(data.liabilities?.credit_limit),
      otros: toStr(data.liabilities?.other),
    },
    seguros: {
      individual: unmapInsuranceItem(data.insurance?.individual),
      colectivo: unmapInsuranceItem(data.insurance?.group),
      otros: unmapInsuranceItem(data.insurance?.other),
    },
    ingresos: {
      titular: toStr(data.income?.holder),
      conyuge: toStr(data.income?.spouse),
      prestacionesTitular: data.income?.holder_benefits || "",
      prestacionesConyuge: data.income?.spouse_benefits || "",
    },
    gastosBasicos: {
      servicios: toStr(data.fixed_expenses?.utilities),
      vivienda: toStr(data.fixed_expenses?.housing),
      alimentacion: toStr(data.fixed_expenses?.food),
      colegios: toStr(data.fixed_expenses?.schools),
      transporte: toStr(data.fixed_expenses?.transportation),
      seguros: toStr(data.fixed_expenses?.insurance),
    },
    gastosVariables: {
      creditos: toStr(data.variable_expenses?.credit_payments),
      recreacion: toStr(data.variable_expenses?.recreation),
      entretenimiento: toStr(data.variable_expenses?.entertainment),
      domestico: toStr(data.variable_expenses?.household),
      salud: toStr(data.variable_expenses?.health),
      otros: toStr(data.variable_expenses?.other),
    },
    fallecimiento: {
      gastosSepelio: toStr(data.death_expenses?.funeral_costs),
      gastosIncapacidad: toStr(data.death_expenses?.disability_costs),
    },
    detalle: {
      otrosIngresos: toStr(data.plan_details?.other_income),
      tasaInteres: toStr(data.plan_details?.interest_rate),
      planProteccion: toStr(data.plan_details?.protection_plan),
      planAhorro: toStr(data.plan_details?.savings_plan),
    },
    cita: {
      dia: data.appointment?.day || "",
      mes: data.appointment?.month || "",
      hora: data.appointment?.time || "",
      lugar: data.appointment?.location || "",
      necesitaDecisionMaker: data.appointment?.needs_decision_maker || false,
      nombreDecisionMaker: data.appointment?.decision_maker_name || "",
    },
    referidos: unmapReferralsList(data.referrals || []),
    notas: data.notes || "",
    piramideLevels: (() => {
      if (!Array.isArray(data.priority_levels) || data.priority_levels.length === 0) {
        return [...INITIAL_PIRAMIDE_LEVELS];
      }
      const validLevels = data.priority_levels
        .filter((l: any) => l && l.id && l.label && l.color && l.icon)
        .map((l: any) => ({
          id: l.id,
          label: l.label,
          color: l.color,
          icon: l.icon,
        }));
      // Si el filtro eliminó todos los items (datos corruptos), usar defaults
      return validLevels.length > 0 ? validLevels : [...INITIAL_PIRAMIDE_LEVELS];
    })(),
    };
  };

  // --- HELPER: Constructor único de payload para POST /api/profiles/new (API Desktop v16) ---
  const VALID_ACCOMPANIMENT = new Set(["unaccompanied", "demonstration", "observation"]);

  const buildClientPayloadEntry = (cliente: ClienteGuardado) => {
    const localStatus =
      cliente.estatusAdquisicion || (cliente.estatusCierre ? "cierre" : "en_espera");
    let acqStatus: "pending" | "cancelled" | "completed" = "pending";
    if (localStatus === "en_espera") acqStatus = "pending";
    if (localStatus === "descartado") acqStatus = "cancelled";
    if (localStatus === "cierre") acqStatus = "completed";

    const rawAcomp = cliente.accompanimentStatus || "unaccompanied";
    const accompanimentStatus = VALID_ACCOMPANIMENT.has(rawAcomp)
      ? rawAcomp
      : "unaccompanied";

    const rawName = toSafeString(cliente.nombre).trim();
    const safeName = truncateToUtf8Bytes(rawName, 100) || "Sin Nombre";

    // API v16: solo enviar campos documentados activos (se omite `is_closed` y `created_at`
    // porque el servidor confirma que no tienen efecto ni se almacenan).
    const payloadClient: Record<string, any> = {
      name: safeName,
      acquisition_status: acqStatus,
      accompaniment_status: accompanimentStatus,
      closing_types: (
        cliente.tiposCierre || (cliente.tipoCierre ? [cliente.tipoCierre] : [])
      )
        .map(toSafeString)
        .filter((t) => t.length > 0),
      data: mapClientData(cliente.data || {}),
    };

    // API v16: `id` debe ser un UUID bien formado; un string inválido causa 400 text/plain.
    let sentServerId: string | undefined;
    if (cliente.serverId) {
      if (isValidUuid(cliente.serverId)) {
        sentServerId = cliente.serverId.trim();
        payloadClient.id = sentServerId;
      } else {
        Logger.warn(`serverId inválido omitido para evitar 400`, {
          clienteId: cliente.id,
          serverId: cliente.serverId,
        });
      }
    }

    // API v16: preservar `advisor_id` (incluyendo excepción SuperAdmin) solo si es UUID válido.
    const resolvedAdvisorId = cliente.asesorAsignado
      ? resolveAdvisorId(
          cliente.asesorAsignado.nombre,
          sentServerId || cliente.serverId,
          cliente.asesorAsignado.id
        )
      : "";
    if (resolvedAdvisorId && isValidUuid(resolvedAdvisorId)) {
      payloadClient.advisor_id = resolvedAdvisorId;
    } else if (resolvedAdvisorId) {
      Logger.warn(`advisor_id inválido omitido para evitar 400`, {
        clienteId: cliente.id,
        advisorId: resolvedAdvisorId,
      });
    }

    return { cliente, payloadClient, sentServerId, resolvedAdvisorId };
  };

  const sanitizePayloadJson = (payloadObj: any): string =>
    JSON.stringify(payloadObj, (_key, value) =>
      typeof value === "string"
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        : value
    );

  // --- SYNC COMO JSON PURO (API Desktop v16) ---
  const forceSync = async (overrideList?: ClienteGuardado[], skipCloudRefresh?: boolean): Promise<string> => {
    const activeAdvisor = advisorRef.current || advisor;

    if (isSyncingRef.current) {
      console.warn("Sincronización ya en curso. Ignorando petición concurrente.");
      return "Sincronización ya en curso.";
    }

    // CAPACITACIÓN BYPASS: Restricción absoluta para evitar enviar ADNs de prueba a la base de datos
    if (activeAdvisor?.training) {
      setSyncStatus("synced");
      return "ℹ️ Modo Capacitación: El ADN se ha guardado en tu memoria local exitosamente. No se sincronizará a la nube para no alterar las métricas reales.";
    }

    // DEV MODE BYPASS: Evitar auto-sincronización y logouts forzados por token falso
    if (activeAdvisor?.id === "DEV-MODE") {
      setSyncStatus("synced");
      return "✅ DEV-MODE: Guardado sólo local. Sincronización saltada.";
    }

    // GUARDIA DE SESIÓN: Nunca enviar POST /api/profiles/new sin token (evita 404 y logouts en pantalla de login)
    if (!activeAdvisor?.token) {
      return "ERROR: No hay sesión activa para sincronizar.";
    }

    if (!isOnline) {
      showAlert("Sin conexión. Los datos se guardarán localmente.");
      return "ERROR: No hay internet. Los datos siguen locales.";
    }

    isSyncingRef.current = true;
    setSyncStatus("syncing");

    try {
      // Usa la lista forzada (si se acaba de guardar algo) o el state más reciente
      const baseList = overrideList || listaClientesRef.current;

      // 1. Filtrar solo los pendientes (DELTAS)
      const clientesPendientes = baseList.filter((c) => !c.sincronizado);

      // Si no hay nada que subir, terminamos
      if (clientesPendientes.length === 0) {
        setSyncStatus("synced");
        return "✅ Todo está al día. No hay datos pendientes de envío.";
      }

      const isTest = typeof process !== "undefined" && Boolean(process.env?.JEST_WORKER_ID);
      const rawFirstDelayMs = isTest ? 10 : 400;
      const rawNextDelayMs = isTest ? 10 : 550; // <= 1.8 req/s (debajo del límite 2 req/s de v16)
      const rescueDelayMs = isTest ? 10 : 650; // <= 1.5 req/s

      // 2. Construir entradas estrictas según api-desktop-v16.yaml y particionar si superan 4MB (límite servidor 5MB)
      const allEntries = clientesPendientes.map(buildClientPayloadEntry);
      const oversizedNames: string[] = [];
      const chunks: (typeof allEntries)[] = [];
      let currentChunk: typeof allEntries = [];
      let currentChunkBytes = 20; // overhead aproximado de {"clients":[]}

      for (const entry of allEntries) {
        const singleSerialized = sanitizePayloadJson({ clients: [entry.payloadClient] });
        const singleBytes = getUtf8ByteLength(singleSerialized);
        if (singleBytes > MAX_REQUEST_BODY_BYTES) {
          oversizedNames.push(entry.cliente.nombre);
          Logger.error(`Prospecto excede el límite de 5MB de la API`, {
            nombre: entry.cliente.nombre,
            bytes: singleBytes,
          });
          continue;
        }

        if (currentChunk.length > 0 && currentChunkBytes + singleBytes > SAFE_BATCH_BODY_BYTES) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChunkBytes = 20;
        }
        currentChunk.push(entry);
        currentChunkBytes += singleBytes;
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      if (chunks.length === 0) {
        setSyncStatus("pending");
        showAlert(`No se pudo sincronizar (${oversizedNames.join(", ")}): el tamaño excede el límite máximo permitido de 5MB.`);
        return "ERROR: Payload excede el límite de 5MB.";
      }

      // 3. Envío al Servidor (API Desktop v16)
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeAdvisor.token}`,
      };

      const syncedSuccessIds = new Set<string>();
      const retainedAssignedIds = new Map<string, string>();
      const updatedAdvisorsMap = new Map<string, { id: string; nombre: string }>();
      let totalRawFailed = 0;
      let totalRescueSynced = 0;
      let totalRescueFailed = 0;
      const rescueFailedReasons: string[] = [];

      for (const chunkEntries of chunks) {
        const payload = { clients: chunkEntries.map((e) => e.payloadClient) };
        const sanitizedBody = sanitizePayloadJson(payload);

        Logger.info(`Sincronización iniciada`, {
          clientes: chunkEntries.length,
          url: "/api/profiles/new",
        });

        const response = await apiFetch("/api/profiles/new", {
          method: "POST",
          headers: authHeaders,
          body: sanitizedBody,
        });

        if (response.status === 201) {
          // ÉXITO: Parsear respuesta para obtener UUIDs generados por el servidor
          let returnedUuids: string[] = [];
          let respuestaCrudaServidor: any = null;
          try {
            const resJson = await response.json();
            respuestaCrudaServidor = resJson;
            returnedUuids = Array.isArray(resJson?.data) ? resJson.data : [];
          } catch {
            returnedUuids = [];
          }

          Logger.info(`[VERBOSE] Respuesta del servidor 201`, {
            status: response.status,
            bodyRespuesta: respuestaCrudaServidor,
            payloadEnviado: payload,
          });

          // --- Mapeo de UUIDs alineado a v16 ---
          // v16: `data` contiene 1 UUID por cada cliente enviado SIN `id`, más cualquier
          // UUID de reemplazo si un `id` enviado colisionó con el perfil de otro asesor.
          // Clientes enviados con `id` propio o sin usar NO aparecen en `data` (puede venir vacío `[]`).
          const assignedIdsMap = new Map<string, string>();
          let uuidCursor = 0;

          if (chunkEntries.length === 1 && chunkEntries[0].sentServerId && returnedUuids.length === 1) {
            // Caso explícito de colisión en envío unitario: el servidor reemplazó el UUID
            assignedIdsMap.set(chunkEntries[0].cliente.id, returnedUuids[0]);
            uuidCursor = 1;
          } else {
            for (const entry of chunkEntries) {
              if (entry.sentServerId) {
                assignedIdsMap.set(entry.cliente.id, entry.sentServerId);
              } else if (returnedUuids[uuidCursor]) {
                assignedIdsMap.set(entry.cliente.id, returnedUuids[uuidCursor]);
                uuidCursor++;
              }
            }
          }

          const extraReplacementUuids = returnedUuids.slice(uuidCursor);

          // --- READ-AFTER-WRITE VALIDATION ---
          const failedSyncIds = new Set<string>();

          for (let i = 0; i < chunkEntries.length; i++) {
            const entry = chunkEntries[i];
            const pend = entry.cliente;
            let serverIdAsignado = assignedIdsMap.get(pend.id);

            if (!serverIdAsignado) {
              Logger.warn(`[Read-After-Write] Prospecto ${pend.nombre} no obtuvo un UUID. Considerado fallido.`);
              failedSyncIds.add(pend.id);
              continue;
            }

            try {
              await new Promise((resolve) =>
                setTimeout(resolve, i === 0 ? rawFirstDelayMs : rawNextDelayMs)
              );

              let checkRes = await apiFetch(`/api/profiles/${serverIdAsignado}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${activeAdvisor.token}` },
              });

              // Si enviamos un `id` que colisionó con otro asesor en un batch mixto,
              // nuestro GET al ID viejo dará 404 y el UUID de reemplazo estará en `extraReplacementUuids`.
              if (
                checkRes.status === 404 &&
                entry.sentServerId &&
                extraReplacementUuids.length > 0
              ) {
                for (let k = 0; k < extraReplacementUuids.length; k++) {
                  const candidateUuid = extraReplacementUuids[k];
                  const retryCheck = await apiFetch(`/api/profiles/${candidateUuid}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${activeAdvisor.token}` },
                  });
                  if (retryCheck.ok) {
                    serverIdAsignado = candidateUuid;
                    assignedIdsMap.set(pend.id, candidateUuid);
                    extraReplacementUuids.splice(k, 1);
                    checkRes = retryCheck;
                    Logger.info(`[Read-After-Write] Colisión UUID resuelta para ${pend.nombre}`, {
                      nuevoUuid: candidateUuid,
                    });
                    break;
                  }
                }
              }

              if (checkRes.ok) {
                const fullProfile = await checkRes.json();
                let parsedData: any = {};
                try {
                  if (typeof fullProfile.data === "string" && fullProfile.data.trim().length > 0) {
                    parsedData = JSON.parse(fullProfile.data);
                  } else if (typeof fullProfile.data === "object" && fullProfile.data !== null) {
                    parsedData = fullProfile.data;
                  }
                } catch {
                  parsedData = {};
                }

                const localPiramide = pend.data?.piramideLevels?.length || 0;
                const serverPiramide = Array.isArray(parsedData.priority_levels)
                  ? parsedData.priority_levels.length
                  : 0;

                const localReferidos = (pend.data?.referidos || []).filter(
                  (r: any) => r.nombre || r.telefono || r.notas
                ).length;
                const serverReferidos = (
                  fullProfile.referrals ||
                  fullProfile.referidos ||
                  parsedData.referrals ||
                  []
                ).length;

                const localHijos = (pend.data?.hijos || []).filter(
                  (h: any) => h.nombre || h.universidad
                ).length;
                const serverHijos = Array.isArray(parsedData.children)
                  ? parsedData.children.length
                  : 0;

                if (
                  localPiramide !== serverPiramide ||
                  localReferidos !== serverReferidos ||
                  localHijos !== serverHijos
                ) {
                  Logger.warn(
                    `[Read-After-Write] DISCREPANCIA DE DATOS PARA ${pend.nombre}. Piramide: ${localPiramide}vs${serverPiramide}, Referidos: ${localReferidos}vs${serverReferidos}, Hijos: ${localHijos}vs${serverHijos}. Se aceptará la versión del servidor.`
                  );
                }

                syncedSuccessIds.add(pend.id);
                if (pend.id === currentClientId) {
                  setCurrentServerId(serverIdAsignado);
                }
                if (pend.asesorAsignado && entry.resolvedAdvisorId) {
                  rememberAdnAdvisor(serverIdAsignado, {
                    id: entry.resolvedAdvisorId,
                    nombre: pend.asesorAsignado.nombre,
                  });
                }
              } else {
                Logger.warn(
                  `[Read-After-Write] No se pudo descargar a ${pend.nombre} para validar. Reteniendo copia local. Status: ${checkRes.status}`
                );
                failedSyncIds.add(pend.id);
                retainedAssignedIds.set(pend.id, serverIdAsignado);
              }
            } catch (e) {
              Logger.error(`[Read-After-Write] Error de red validando a ${pend.nombre}:`, e);
              failedSyncIds.add(pend.id);
              retainedAssignedIds.set(pend.id, serverIdAsignado);
            }
          }

          totalRawFailed += failedSyncIds.size;
          continue;
        }

        // --- Respuesta NO 201: leer cuerpo y clasificar según API v16 ---
        const bodyInfo = await safeReadResponseBody(response);

        // 1. Fallo real de autenticación/permiso (401 o 404 text/plain) → logout
        if (isProfilesNewAuthFailure(response.status, bodyInfo.contentType, bodyInfo.json)) {
          console.warn("🔒 SESIÓN DECLINADA DURANTE SINCRONIZACIÓN: Usuario eliminado o token inválido.");
          Logger.warn(`Sincronización rechazada (Sesión inválida)`, {
            status: response.status,
            contentType: bodyInfo.contentType,
            body: bodyInfo.text.substring(0, 300),
          });
          await logout();
          return "ERROR: Sesión Inválida. Su acceso ha sido revocado y la sesión cerrada.";
        }

        // 2. Rate Limit persistente tras reintentos (429 text/plain) → NO es fallo fatal
        if (response.status === 429) {
          Logger.warn(`Rate limit 429 persistente al sincronizar`);
          setSyncStatus("pending");
          showAlert("El servidor está procesando muchas solicitudes (429). Tus datos están seguros y se reintentará automáticamente.");
          return "ERROR: Límite de peticiones (429). Reintenta en unos segundos.";
        }

        // 3. Si es 403 (not_authorized_for_advisor) o 404 JSON (some_advisors_not_found),
        //    refrescar /api/profile-advisors ANTES de reintentar para auto-reparar UUIDs obsoletos
        const isAdvisorAuthError =
          response.status === 403 ||
          (response.status === 404 && bodyInfo.json?.error === "some_advisors_not_found");
        if (isAdvisorAuthError && (activeAdvisor.isLider || isLider)) {
          await verificarLider().catch(() => {});
        }

        // 4. RESCUE MODE: en v16 un batch > 1 puede fallar completo por 1 solo prospecto
        //    con 400 (UUID/campo desconocido/body), 422 (validación/tipo), 403 o 404 JSON.
        const isRescuableBatch =
          chunkEntries.length > 1 &&
          (response.status === 400 ||
            response.status === 422 ||
            response.status === 403 ||
            isAdvisorAuthError);

        if (isRescuableBatch) {
          console.warn(
            `[SYNC-RESCUE] Batch falló con ${response.status}. Reintentando ${chunkEntries.length} prospectos individualmente...`
          );
          Logger.warn(
            `Batch falló con ${response.status}. Iniciando Rescue Mode para ${chunkEntries.length} prospectos`,
            { status: response.status, contentType: bodyInfo.contentType, body: bodyInfo.text }
          );

          for (let idx = 0; idx < chunkEntries.length; idx++) {
            // Reconstruir entrada con /api/profile-advisors recién refrescado (por si cambió el UUID de un asesor)
            const origEntry = chunkEntries[idx];
            const entry = isAdvisorAuthError
              ? buildClientPayloadEntry(origEntry.cliente)
              : origEntry;
            const cliente = entry.cliente;
            if (
              entry.resolvedAdvisorId &&
              cliente.asesorAsignado &&
              entry.resolvedAdvisorId !== cliente.asesorAsignado.id
            ) {
              updatedAdvisorsMap.set(cliente.id, {
                id: entry.resolvedAdvisorId,
                nombre: cliente.asesorAsignado.nombre,
              });
              Logger.info(`[SYNC-RESCUE] UUID de asesor actualizado automáticamente`, {
                cliente: cliente.nombre,
                asesor: cliente.asesorAsignado.nombre,
                anterior: cliente.asesorAsignado.id,
                nuevo: entry.resolvedAdvisorId,
              });
            }

            try {
              const singlePayload = { clients: [entry.payloadClient] };
              const sBody = sanitizePayloadJson(singlePayload);

              if (idx > 0) {
                await new Promise((resolve) => setTimeout(resolve, rescueDelayMs));
              }

              const sRes = await apiFetch("/api/profiles/new", {
                method: "POST",
                headers: authHeaders,
                body: sBody,
              });

              if (sRes.status === 201) {
                let returnedUuid: string | undefined;
                let respuestaCrudaRescate: any = null;
                try {
                  const j = await sRes.json();
                  respuestaCrudaRescate = j;
                  returnedUuid = Array.isArray(j?.data) ? j.data[0] : undefined;
                } catch {}

                // v16: si se envió `id` propio/sin colisión, `data` viene vacío `[]` y es éxito
                const effectiveUuid = returnedUuid || entry.sentServerId;
                syncedSuccessIds.add(cliente.id);
                totalRescueSynced++;

                if (cliente.id === currentClientId && effectiveUuid) {
                  setCurrentServerId(effectiveUuid);
                }
                if (effectiveUuid && cliente.asesorAsignado && entry.resolvedAdvisorId) {
                  rememberAdnAdvisor(effectiveUuid, {
                    id: entry.resolvedAdvisorId,
                    nombre: cliente.asesorAsignado.nombre,
                  });
                }

                Logger.info(`[VERBOSE] Rescue Mode: Prospecto sincronizado`, {
                  nombre: cliente.nombre,
                  uuid: effectiveUuid,
                  bodyRespuesta: respuestaCrudaRescate,
                  payloadEnviado: singlePayload,
                });
              } else {
                const sBodyInfo = await safeReadResponseBody(sRes);
                if (isProfilesNewAuthFailure(sRes.status, sBodyInfo.contentType, sBodyInfo.json)) {
                  Logger.warn(`Sincronización rechazada en Rescue Mode (Sesión inválida)`, {
                    nombre: cliente.nombre,
                    status: sRes.status,
                    contentType: sBodyInfo.contentType,
                    body: sBodyInfo.text.substring(0, 300),
                  });
                  await logout();
                  return "ERROR: Sesión Inválida. Su acceso ha sido revocado y la sesión cerrada.";
                }

                let reason = `${cliente.nombre}`;
                if (sRes.status === 403) {
                  reason = `${cliente.nombre} (sin autorización para el asesor asignado)`;
                } else if (sRes.status === 404 && sBodyInfo.json?.error === "some_advisors_not_found") {
                  reason = `${cliente.nombre} (asesor asignado no encontrado)`;
                } else if (sRes.status === 422) {
                  const parsed422 = parse422Error(sBodyInfo.text, sBodyInfo.json);
                  reason = `${cliente.nombre} (${parsed422.userMessage})`;
                }

                totalRescueFailed++;
                rescueFailedReasons.push(reason);
                console.error(
                  `[SYNC-RESCUE] ❌ "${cliente.nombre}" falló individualmente: ${sRes.status} — ${sBodyInfo.text}`
                );
                Logger.error(`Rescue Mode: Prospecto falló`, {
                  nombre: cliente.nombre,
                  status: sRes.status,
                  contentType: sBodyInfo.contentType,
                  body: sBodyInfo.text,
                  advisorIdEnviado: entry.resolvedAdvisorId || null,
                  payloadEnviado: singlePayload,
                });
              }
            } catch (e) {
              totalRescueFailed++;
              rescueFailedReasons.push(cliente.nombre);
              console.error(`[SYNC-RESCUE] ❌ Excepción para "${cliente.nombre}":`, e);
              Logger.error(`Rescue Mode: Excepción en prospecto`, { nombre: cliente.nombre, error: e });
            }
          }
          continue;
        }

        // 4b. Auto-reintento unitario si tras refrescar /api/profile-advisors se encontró un UUID vigente distinto
        if (chunkEntries.length === 1 && isAdvisorAuthError) {
          const origEntry = chunkEntries[0];
          const refreshedEntry = buildClientPayloadEntry(origEntry.cliente);
          if (
            refreshedEntry.resolvedAdvisorId &&
            refreshedEntry.resolvedAdvisorId !== origEntry.resolvedAdvisorId
          ) {
            Logger.info(`Reintentando prospecto con UUID de asesor actualizado desde /api/profile-advisors`, {
              nombre: refreshedEntry.cliente.nombre,
              anterior: origEntry.resolvedAdvisorId,
              nuevo: refreshedEntry.resolvedAdvisorId,
            });
            const retryPayload = { clients: [refreshedEntry.payloadClient] };
            const retryRes = await apiFetch("/api/profiles/new", {
              method: "POST",
              headers: authHeaders,
              body: sanitizePayloadJson(retryPayload),
            });
            if (retryRes.status === 201) {
              let returnedUuid: string | undefined;
              try {
                const j = await retryRes.json();
                returnedUuid = Array.isArray(j?.data) ? j.data[0] : undefined;
              } catch {}
              const effectiveUuid = returnedUuid || refreshedEntry.sentServerId;
              syncedSuccessIds.add(refreshedEntry.cliente.id);
              if (refreshedEntry.cliente.id === currentClientId && effectiveUuid) {
                setCurrentServerId(effectiveUuid);
              }
              if (effectiveUuid && refreshedEntry.cliente.asesorAsignado) {
                rememberAdnAdvisor(effectiveUuid, {
                  id: refreshedEntry.resolvedAdvisorId,
                  nombre: refreshedEntry.cliente.asesorAsignado.nombre,
                });
              }
              continue;
            }
          }
        }

        // 5. Fallo individual (1 prospecto o error 5xx)
        console.error("Error from API:", response.status, bodyInfo.text);
        setSyncStatus("pending");

        if (response.status === 403) {
          showAlert(
            "No tienes autorización para atribuir este ADN al asesor seleccionado. Puedes cambiar o quitar el asesor asignado desde el tablero e intentar de nuevo."
          );
        } else if (response.status === 404 && bodyInfo.json?.error === "some_advisors_not_found") {
          showAlert(
            "El asesor asignado a este ADN ya no fue encontrado en el sistema. Puedes cambiar o quitar el asesor asignado desde el tablero."
          );
        } else if (response.status === 422) {
          const parsed422 = parse422Error(bodyInfo.text, bodyInfo.json);
          showAlert(`No se pudo sincronizar:\n${parsed422.userMessage}`);
        } else {
          showAlert(`Error ${response.status}: ${(bodyInfo.text || "Error del servidor").substring(0, 100)}`);
        }

        Logger.error(`Fallo de sincronización general`, {
          status: response.status,
          contentType: bodyInfo.contentType,
          body: bodyInfo.text,
          payloadEnviado: payload,
        });
        return "ERROR: Fallo al crear perfiles en el servidor.";
      }

      // 4. Consolidar actualizaciones de estado local y persistencia
      if (syncedSuccessIds.size > 0 || retainedAssignedIds.size > 0 || updatedAdvisorsMap.size > 0) {
        setListaClientes((prev) => {
          const listaActualizada = prev
            .filter((c) => !syncedSuccessIds.has(c.id))
            .map((c) => {
              const assignedUuid = retainedAssignedIds.get(c.id);
              const updatedAdvisor = updatedAdvisorsMap.get(c.id);
              if (assignedUuid || updatedAdvisor) {
                return {
                  ...c,
                  ...(assignedUuid ? { serverId: assignedUuid } : {}),
                  ...(updatedAdvisor ? { asesorAsignado: updatedAdvisor } : {}),
                };
              }
              return c;
            });

          storage.setItem("clientes_db", JSON.stringify(listaActualizada)).catch(console.error);
          return listaActualizada;
        });
      }

      if (oversizedNames.length > 0) {
        rescueFailedReasons.push(...oversizedNames.map((n) => `${n} (excede 5MB)`));
        totalRescueFailed += oversizedNames.length;
      }

      if (totalRawFailed > 0) {
        showAlert(
          `⚠️ ATENCIÓN: ${totalRawFailed} prospecto(s) se enviaron pero el servidor no guardó sus datos completos. Se conservará la copia local y se reintentará en la próxima sincronización para evitar pérdida de datos.`
        );
      }

      if (totalRescueFailed > 0 && syncedSuccessIds.size > 0) {
        setSyncStatus("pending");
        showAlert(
          `✅ ${syncedSuccessIds.size} prospecto(s) sincronizado(s) con éxito.\n\n⚠️ No se pudo sincronizar: ${rescueFailedReasons.join(", ")}.\nSus datos están seguros en tu dispositivo.`
        );
        return "Sincronización parcial completada.";
      }

      if (totalRescueFailed > 0 && syncedSuccessIds.size === 0) {
        setSyncStatus("pending");
        showAlert(
          `No se pudieron sincronizar: ${rescueFailedReasons.join(", ")}. Tus datos están seguros en tu dispositivo.`
        );
        return "ERROR: Todos los prospectos fallaron individualmente.";
      }

      setSyncStatus("synced");
      setLastSyncTime(new Date().toLocaleTimeString());

      // Auto-refresh de nube (se omite cuando viene de needs_resync para evitar bucle infinito)
      if (!skipCloudRefresh) {
        setTimeout(() => {
          fetchSincronizadosNube();
        }, 500);
      }

      Logger.info(`Sincronización exitosa`, {
        prospectosSincronizados: syncedSuccessIds.size,
        rescatados: totalRescueSynced,
      });
      return "Sincronización exitosa con el servidor.";
    } catch (error) {
      console.error("Error al sincronizar:", error);
      setSyncStatus("pending");
      showAlert("Error de red al intentar sincronizar.");
      Logger.error(`Excepción durante la sincronización`, error);
      return "ERROR: Excepción durante la sincronización.";
    } finally {
      isSyncingRef.current = false;
    }
  };

  const fetchSincronizadosNube = async () => {
    // API v16: Advisor_Trainee nunca puede llamar a endpoints de perfiles (devuelven 404)
    if (advisor?.training) return;
    if (!isOnline) {
      showAlert("Sin conexión a internet. No se pueden cargar los prospectos de la nube.");
      return;
    }
    if (!advisor?.token) return;

    setIsFetchingCloud(true);
    try {
      const authHeaders = { Authorization: `Bearer ${advisor.token}` };

      // ============================================================
      // PASO 1: Obtener el ÍNDICE de perfiles (API v10+ — solo resumen)
      // GET /api/profiles → { profiles: [{ id, client_name, status, ... }] }
      // ============================================================
      const response = await apiFetch("/api/profiles", {
        method: "GET",
        headers: authHeaders,
      });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        Logger.warn(`Fetch nube rechazado (Sesión inválida)`, {
          status: response.status,
          url: "/api/profiles",
        });
        await logout();
        return;
      }

      if (response.status === 429) {
        showAlert("El servidor está ocupado (límite de peticiones). Intenta cargar tus ADNs nuevamente en unos segundos.");
        return;
      }

      if (response.ok) {
        const json = await response.json();
        const profilesList = json.profiles || json.data || [];

        // Separar perfiles sanos de los que necesitan resync
        const profilesOk: any[] = [];
        const profilesNeedResync: any[] = [];

        for (const p of profilesList) {
          if (p.needs_resync === true) {
            profilesNeedResync.push(p);
          } else {
            profilesOk.push(p);
          }
        }

        // --- Procesar resumen de perfiles sanos ---
        const mappedCloud = profilesOk.map((p: any) => {
          // WebKit safe date parsing
          let safeDate = new Date();
          if (p.created_at) {
            const sanitized = p.created_at.toString().replace(" ", "T");
            const parsed = new Date(sanitized);
            if (!isNaN(parsed.getTime())) safeDate = parsed;
          }

          let localStatus: "en_espera" | "descartado" | "cierre" = "en_espera";
          if (p.status === "completed") localStatus = "cierre";
          else if (p.status === "cancelled") localStatus = "descartado";

          // Mapear relationship del servidor (v16: incluye SuperAdmin y TeamLeader)
          const relationship = p.relationship || {};

          const mapped: ClienteGuardado = {
            id: p.id,
            serverId: p.id,
            nombre: p.client_name || "Sin Nombre",
            fechaCreacion: safeDate.toLocaleDateString("es-MX"),
            estatusAdquisicion: localStatus,
            accompanimentStatus: p.accompaniment_status || "unaccompanied",
            sincronizado: true,
            data: {
              referidos: unmapReferralsList(p.referrals || p.referidos || []),
            },
          };

          // "hecho para" — resuelve UUID vía mapa por perfil, equipoLiderRef o directorio cacheado
          // (corrige race condition al arrancar y soporta la excepción SuperAdmin para asesores expirados)
          if (relationship.created_for) {
            const resolvedId = resolveAdvisorId(relationship.created_for, p.id);
            mapped.asesorAsignado = { id: resolvedId, nombre: relationship.created_for };
            if (resolvedId) {
              rememberAdnAdvisor(p.id, mapped.asesorAsignado);
            }
          }
          // "hecho por" — el asesor ve quién se lo creó (líder o SuperAdmin)
          if (relationship.created_by) {
            mapped.creadoPor = relationship.created_by;
          }

          return mapped;
        });

        setListaNube(mappedCloud);

        // --- 1. Leer el archivo muerto actual (para anexar y rescatar) ---
        const rawArchive = await storage.getItem<string>("clientes_archive_db");
        let archiveDB: ClienteGuardado[] = rawArchive ? JSON.parse(rawArchive) : [];
        let archiveChanged = false;

        // --- PURGA SEGURA: Limpiar de local los prospectos que el servidor
        //     confirmó que tiene (profilesOk). Solo se borran locales que:
        //     1. Ya estaban marcados sincronizado: true
        //     2. Su serverId coincide con un perfil sano del servidor (NO needs_resync)
        //     Esto garantiza CERO pérdida de datos.
        const confirmedServerIds = new Set(profilesOk.map((p: any) => p.id));

        if (confirmedServerIds.size > 0) {
          setListaClientes((prev) => {
            console.log("PURGA SEGURA PREV LENGTH:", prev.length, prev);
            const cleaned = prev.filter((c) => {
              // Siempre conservar pendientes (no sincronizados)
              if (!c.sincronizado) return true;
              // Conservar si no tiene serverId (seguridad)
              if (!c.serverId) return true;
              // Conservar si el servidor NO lo tiene confirmado
              if (!confirmedServerIds.has(c.serverId)) return true;
              
              // El servidor confirma que tiene una copia sana → seguro purgar
              // ANTES DE PURGAR: Lo guardamos en el archivo muerto (Capa extra de redundancia)
              if (!archiveDB.some(arch => arch.serverId === c.serverId)) {
                archiveDB.push(c);
                archiveChanged = true;
              }
              return false;
            });

            if (cleaned.length !== prev.length) {
              storage.setItem("clientes_db", JSON.stringify(cleaned)).catch(console.error);
              if (archiveChanged) {
                storage.setItem("clientes_archive_db", JSON.stringify(archiveDB)).catch(console.error);
                archiveChanged = false; // Reset flag for next block
              }
            }
            return cleaned;
          });
        }

        // --- 2. Procesar perfiles con needs_resync: true ---
        if (profilesNeedResync.length > 0) {
          let resyncCount = 0;
          let noLocalCopyCount = 0;
          let rescuedFromArchiveCount = 0;

          setListaClientes((prev) => {
            const updatedList = [...prev];

            profilesNeedResync.forEach((serverProfile) => {
              // Buscar en la lista principal (activa)
              const localMatchIndex = updatedList.findIndex(c => c.serverId === serverProfile.id);

              if (localMatchIndex !== -1) {
                // Existe copia activa: simplemente desmarcamos sincronizado
                resyncCount++;
                updatedList[localMatchIndex] = {
                  ...updatedList[localMatchIndex],
                  sincronizado: false
                };
              } else {
                // No existe copia activa, ¿ESTARÁ EN EL ARCHIVO MUERTO?
                const archiveMatchIndex = archiveDB.findIndex(c => c.serverId === serverProfile.id);
                if (archiveMatchIndex !== -1) {
                  // ¡RESCATE EXITOSO! Lo sacamos del archivo muerto y lo revivimos en la lista activa
                  rescuedFromArchiveCount++;
                  resyncCount++;
                  const rescuedClient = {
                    ...archiveDB[archiveMatchIndex],
                    sincronizado: false // Listo para subirse
                  };
                  updatedList.push(rescuedClient);
                  // Lo quitamos del archivo porque ya está vivo otra vez
                  archiveDB.splice(archiveMatchIndex, 1);
                  archiveChanged = true;
                } else {
                  // Verdaderamente no tenemos copia ni activa ni muerta
                  noLocalCopyCount++;
                }
              }
            });

            // Persistir la lista actualizada si hubo resyncs o rescates
            if (resyncCount > 0) {
              storage.setItem("clientes_db", JSON.stringify(updatedList)).catch(console.error);
              if (archiveChanged) {
                storage.setItem("clientes_archive_db", JSON.stringify(archiveDB)).catch(console.error);
              }
            }
            return updatedList;
          });

          // Disparar re-sincronización automática para subir las copias locales.
          // IMPORTANTE: skipCloudRefresh = true para evitar bucle infinito
          // (resync → forceSync → fetchNube → resync → forceSync → ...)
          if (resyncCount > 0) {
            setTimeout(() => {
              forceSync(undefined, true);
            }, 1500);
          }
        }
      } else {
        showAlert(`No se pudieron obtener los datos (Status: ${response.status}).`);
      }
    } catch (e: any) {
      console.error("Error al obtener la nube:", e);
      showAlert(`Error al cargar los datos de la nube: ${e.message || "Fallo de red"}`);
    } finally {
      setIsFetchingCloud(false);
    }
  };

  const toggleOnlineSimulation = () => {
    setIsOnline((prev) => !prev);
  };


  // --- SEGURIDAD: CONTROL DE VERSIÓN DE SESIONES ---
  // Cambia este número (+1) cuando necesites expulsar forzosamente a TODOS los usuarios (deslogueo masivo al actualizar).
  const APP_SESSION_VERSION = 2;

  // INIT (UNIFICADO Y CORREGIDO PARA EVITAR RACE CONDITION)
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Cargar Sesión
        const storedSession = await storage.getItem<string>("advisor_session");

        let validUser: any = null;

        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);

          // Compatibilidad: Si tiene la propiedad .user, es el formato moderno ({user, loginTime}). 
          // Si no la tiene, asumimos que es el formato viejo (objeto plano con el token).
          validUser = parsedSession.user ? parsedSession.user : parsedSession;
          const loginTime = parsedSession.loginTime || Date.now(); // Fallback si era legacy
          const sessionVersion = parsedSession.sessionVersion || 1; // Asumimos versión 1 si no lo traía

          // Límite estricto de 7 días offline (7 * 24 * 60 * 60 * 1000 ms)
          const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;

          if (sessionVersion !== APP_SESSION_VERSION) {
            console.warn(`Sesión antigua (v${sessionVersion}) detectada. Se requiere v${APP_SESSION_VERSION}. Forzando purga de credenciales.`);
            await storage.removeItem("advisor_session");
            // No seteamos el advisor, así que arrancan deslogueados.
            // NOTA: No tocamos clientes_db para proteger datos de prospectos ingresados offline.
          } else if (Date.now() - loginTime > MAX_OFFLINE_MS) {
            console.warn("Sesión expirada tras 7 días sin validación online. Forzando relogin.");
            await storage.removeItem("advisor_session");
            // No seteamos el advisor, arranca deslogueado directo al Index.
          } else {
            // La sesión sigue vigente offline temporalmente
            if (validUser && validUser.token) {
              // Limpiar nombres legacy derivados del email (antes del @)
              const emailPrefix = validUser.email?.split("@")[0] || "";
              if (validUser.nombre && validUser.nombre === emailPrefix) {
                validUser.nombre = ""; // Era un nombre falso derivado del email
              }
              advisorRef.current = validUser;
              setAdvisor(validUser);
              setUserName(validUser.nombre);
            }
          }
        }
        // 2. Cargar DB Local y cachés de directorio de asesores (API v16)
        const storedDB = await storage.getItem<string>("clientes_db");
        if (storedDB) {
          const parsedDB = JSON.parse(storedDB);
          listaClientesRef.current = parsedDB;
          setListaClientes(parsedDB);
        }

        try {
          const storedDir = await storage.getItem<string>("advisors_directory_cache");
          if (storedDir) advisorsDirectoryRef.current = JSON.parse(storedDir) || {};
          const storedAdnMap = await storage.getItem<string>("adn_advisor_map");
          if (storedAdnMap) adnAdvisorMapRef.current = JSON.parse(storedAdnMap) || {};
        } catch (e) {
          console.warn("Error cargando caché de directorio de asesores:", e);
        }

        // 2b. RESPALDO DE EMERGENCIA (pre-migration snapshot)
        // Se ejecuta UNA SOLA VEZ: la primera vez que la app corre con esta versión.
        // Guarda una copia intacta de todos los prospectos locales ANTES de que
        // la transición a la nube pueda purgar datos. Si el backup ya existe,
        // no se toca. Eliminable en una versión futura cuando el backend sea estable.
        if (storedDB) {
          const backupExists = await storage.getItem("emergency_backup_v1");
          if (!backupExists) {
            await storage.setItem("emergency_backup_v1", storedDB);
            console.log("[BACKUP] Respaldo de emergencia creado con éxito.");
          }
        }
        // 3. Cargar Borrador (Draft Snapshot)
        const storedDraft = await storage.getItem<string>("draft_prospect_v1");
        if (storedDraft) {
          try {
            const draftObj = JSON.parse(storedDraft);

            const isEmptyDraft = !draftObj.currentClientId &&
              !(draftObj.nombreCliente?.trim()) &&
              !(draftObj.perfil?.telefono?.trim()) &&
              !(draftObj.perfil?.ocupacion?.trim());

            if (isEmptyDraft) {
              // Borrar basura residual
              storage.removeItem("draft_prospect_v1");
            } else {
              if (draftObj.currentClientId !== undefined) setCurrentClientId(draftObj.currentClientId);
              if (draftObj.currentServerId !== undefined) setCurrentServerId(draftObj.currentServerId);
              if (draftObj.asesorSeleccionadoGlobal) setAsesorSeleccionadoGlobal(draftObj.asesorSeleccionadoGlobal);
              if (draftObj.nombreCliente) setNombreCliente(draftObj.nombreCliente);
              if (draftObj.perfil) setPerfil(draftObj.perfil);
              if (draftObj.hijos) setHijos(draftObj.hijos);
              if (draftObj.jubilacion) setJubilacion(draftObj.jubilacion);
              if (draftObj.activos) setActivos(draftObj.activos);
              if (draftObj.pasivos) setPasivos(draftObj.pasivos);
              if (draftObj.seguros) setSeguros(draftObj.seguros);
              if (draftObj.ingresos) setIngresos(draftObj.ingresos);
              if (draftObj.gastosBasicos) setGastosBasicos(draftObj.gastosBasicos);
              if (draftObj.gastosVariables) setGastosVariables(draftObj.gastosVariables);
              if (draftObj.fallecimiento) setFallecimiento(draftObj.fallecimiento);
              if (draftObj.detalle) setDetalle(draftObj.detalle);
              if (draftObj.cita) setCita(draftObj.cita);
              if (draftObj.referidos) setReferidos(draftObj.referidos);
              if (draftObj.notas) setNotas(draftObj.notas);
              if (Array.isArray(draftObj.piramideLevels) && draftObj.piramideLevels.length > 0) {
                setPiramideLevels(draftObj.piramideLevels);
              }

              // En vez de disparar el alert de inmediato, lo dejamos pendiente hasta que el usuario inicie sesión
              setPendingDraftAlert(true);
            }
          } catch (e) {
            console.error("Error parsing draft", e);
          }
        }
      } catch (e) {
        console.error("Error init", e);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  // Mostrar la alerta de draft recuperado SOLO si ya están logueados
  useEffect(() => {
    if (advisor && pendingDraftAlert) {
      setTimeout(() => {
        showAlert("Borrador Recuperado: Se ha restaurado la información del prospecto que no habías guardado.");
      }, 500); // Pequeño retraso para que ocurra después de cualquier transición de pantalla
      setPendingDraftAlert(false);
    }
  }, [advisor, pendingDraftAlert]);

  // AUTO-FETCH: Al arrancar la app, si el usuario está autenticado y no es
  // de capacitación, traer automáticamente los prospectos de la nube.
  // Esto limpia los remanentes locales sincronizados (purga segura dentro
  // de fetchSincronizadosNube) y muestra la lista actualizada sin que el
  // usuario tenga que presionar "Obtener mis ADNs" manualmente.
  useEffect(() => {
    if (isInitialized && advisor && !advisor.training && advisor.id !== "DEV-MODE" && isOnline) {
      // Retraso para no competir con la transición de pantallas al arrancar
      const timer = setTimeout(() => {
        fetchSincronizadosNube();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, advisor]);

  // Hidratación reactiva: si `equipoLider` llega después de `listaNube`, completar `asesorAsignado.id`
  useEffect(() => {
    if (equipoLider.length === 0) return;
    setListaNube((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.asesorAsignado?.nombre && !c.asesorAsignado.id) {
          const resolvedId = resolveAdvisorId(c.asesorAsignado.nombre, c.serverId);
          if (resolvedId) {
            changed = true;
            const updated = { id: resolvedId, nombre: c.asesorAsignado.nombre };
            rememberAdnAdvisor(c.serverId, updated);
            return { ...c, asesorAsignado: updated };
          }
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [equipoLider]);

  // LOGIN (INTEGRADO CON BACKEND — API Desktop v16)
  const login = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // ?api=true inyecta training e is_leader en la respuesta
      const response = await apiFetch("/api/login?api=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: pass }),
      });

      if (response.ok) {
        const data = await response.json();

        Logger.info(`Login exitoso`, { email });

        const user: Advisor = {
          id: "ADV-" + Math.floor(Math.random() * 1000),
          nombre: data.name || "",
          email: email,
          token: data.token,
          training: data.training === true,
          isLider: data.is_leader === true,
        };

        const sessionData = {
          user: user,
          loginTime: Date.now(),
          sessionVersion: APP_SESSION_VERSION,
        };

        advisorRef.current = user;
        setAdvisor(user);
        setUserName(user.nombre);
        await storage.setItem(
          "advisor_session",
          JSON.stringify(sessionData),
        );
        return { success: true };
      } else {
        if (response.status === 429) {
          Logger.warn(`Intento de login limitado por rate limit (429)`, { email });
          return { success: false, error: "rate_limited" };
        }

        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            Logger.warn(`Intento de login fallido`, { email, error: errorData.error });
            return { success: false, error: errorData.error };
          }
        } catch {
          // Fallback a códigos de estado si no hay JSON
        }

        Logger.warn(`Intento de login fallido`, { email, status: response.status });

        if (response.status === 401)
          return { success: false, error: "invalid_credentials" };
        if (response.status === 403)
          return { success: false, error: "employment_period_ended" };
        if (response.status === 422)
          return { success: false, error: "missing_required_fields" };

        return { success: false, error: "server_error" };
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Logger.error(`Excepción en login`, error);
      return { success: false, error: "Error de red al conectar al servidor" };
    }
  };

  const bypassLoginForDev = async (role: 'lider' | 'asesor' | 'training' = 'asesor') => {
    const devUser: Advisor = {
      id: "DEV-MODE",
      nombre: `Desarrollador (${role})`,
      email: "dev@local.host",
      token: "dev-fake-token",
      training: role === 'training',
      isLider: role === 'lider',
    };

    const sessionData = {
      user: devUser,
      loginTime: Date.now(),
      sessionVersion: APP_SESSION_VERSION,
    };

    advisorRef.current = devUser;
    setAdvisor(devUser);
    setUserName(devUser.nombre);
    await storage.setItem("advisor_session", JSON.stringify(sessionData));
  };

  const logout = async () => {
    Logger.info(`Usuario hizo logout`);
    // API v15/v16: Invalidar sesión en el servidor para todos los roles (incluyendo trainees)
    if (advisor?.token && isOnline && advisor.id !== "DEV-MODE") {
      try {
        await apiFetch(
          "/api/logout",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${advisor.token}` },
          },
          { maxRetries: 1 }
        );
      } catch (e) {
        // Si falla (red caída, servidor no disponible), no bloqueamos el logout local
        console.warn("No se pudo invalidar la sesión en el servidor:", e);
      }
    }

    // Limpieza completa del estado de sesión en memoria (preservando clientes_db locales)
    advisorRef.current = null;
    setAdvisor(null);
    setUserName("");
    setListaNube([]);
    equipoLiderRef.current = [];
    setEquipoLider([]);
    setIsLider(false);
    setAsesorSeleccionadoGlobal(null);
    accessExpiresAtRef.current = null;
    setAccessExpiresAt(null);
    await storage.removeItem("advisor_session");
  };

  const validateSession = async (): Promise<boolean> => {
    if (!advisor?.token) return false;

    // DEV MODE BYPASS
    if (advisor.id === "DEV-MODE") return true;

    // Sin conexión: permitir acceso offline (validado por límite de 7 días en init)
    if (!isOnline) return true;

    try {
      // API Desktop v16: GET /api/me/access-status funciona para TODOS los roles
      // (SuperAdmin, TeamLeader, Advisor y Advisor_Trainee), evitando el hack 422
      // de /api/profiles/new y el uso indebido del updater /app/d/u.json.
      const response = await apiFetch("/api/me/access-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${advisor.token}`,
        },
      });

      // Auth middleware devuelve 404 text/plain si la sesión fue revocada o venció
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        Logger.warn(`Validación de sesión fallida (token revocado/vencido)`, {
          status: response.status,
          email: advisor.email,
        });
        Alert.alert(
          "Error de Autenticación",
          `El servidor denegó tu sesión (Código: ${response.status}). Saliendo...`
        );
        await logout();
        return false;
      }

      // Rate limit persistente: mantener sesión local sin alertas ni cierres
      if (response.status === 429) {
        Logger.warn(`Validación de sesión limitada por 429; conservando sesión en caché`);
        return true;
      }

      if (response.ok) {
        try {
          const data = await response.json();
          const cutoff = data?.access_expires_at || null;
          accessExpiresAtRef.current = cutoff;
          setAccessExpiresAt(cutoff);

          if (cutoff && new Date(cutoff).getTime() < Date.now()) {
            Alert.alert("Sesión Terminada", "Tu periodo de acceso ha concluido.");
            await logout();
            return false;
          }
        } catch {
          // Si la respuesta 200 no trajo JSON parseable en un mock simple, continuar
        }
      }

      Logger.info(`Sesión validada correctamente`, {
        status: response.status,
        email: advisor.email,
        urlSolicitada: "/api/me/access-status",
        metodo: "GET",
      });

      // Renovar loginTime (7 días de vigencia offline)
      try {
        const sessionStr = await storage.getItem<string>("advisor_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const newSession = session.user ? session : { user: session };
          newSession.loginTime = Date.now();
          newSession.sessionVersion = APP_SESSION_VERSION;
          await storage.setItem("advisor_session", JSON.stringify(newSession));
        }
      } catch {
        // Ignorar error puramente de escritura
      }

      return true;
    } catch (e: any) {
      console.warn(
        "Fallo en la red o servidor no disponible. Permitiendo acceso local por caché.",
        e?.message
      );
      return true;
    }
  };

  const verificarLider = async () => {
    const activeAdvisor = advisorRef.current || advisor;
    if (!activeAdvisor?.token) return;

    // API v16: Advisor_Trainee nunca puede llamar a /api/profile-advisors ni /api/team
    if (activeAdvisor.training) {
      setIsLider(false);
      updateEquipoLider([]);
      return;
    }

    // DEV MODE BYPASS
    if (activeAdvisor.id === "DEV-MODE") {
      setIsLider(activeAdvisor.isLider === true);
      if (activeAdvisor.isLider) {
        updateEquipoLider([
          { id: "123e4567-e89b-12d3-a456-426614174000", nombre: "Mock Asesor Dev" },
        ]);
      } else {
        updateEquipoLider([]);
      }
      return;
    }

    if (!isOnline) {
      setIsLider(activeAdvisor.isLider === true);
      return;
    }

    // API Desktop v16: usar GET /api/profile-advisors (ordenado por nombre;
    // para TeamLeader devuelve subordinados directos; para SuperAdmin incluye todos los Advisors activos)
    if (activeAdvisor.isLider) {
      setIsLider(true);
      try {
        const res = await apiFetch("/api/profile-advisors", {
          method: "GET",
          headers: { Authorization: `Bearer ${activeAdvisor.token}` },
        });
        if (res.status === 200) {
          const data = await res.json();
          const rawAdvisors = Array.isArray(data?.advisors) ? data.advisors : [];
          updateEquipoLider(rawAdvisors.map((m: any) => ({ id: m.id, nombre: m.name })));
        } else if (res.status === 404) {
          Logger.warn(`GET /api/profile-advisors devolvió 404`, { email: activeAdvisor.email });
        } else {
          // En errores transitorios (429/5xx) conservar la lista previamente cargada
          Logger.warn(`Fallo transitorio en /api/profile-advisors`, { status: res.status });
        }
      } catch (e) {
        Logger.warn(`Error de red en /api/profile-advisors`, e);
      }
    } else {
      setIsLider(false);
      updateEquipoLider([]);
    }
  };

  // Disparar verificación de líder cuando el usuario inicia sesión (o se carga de storage)
  useEffect(() => {
    if (advisor) {
      verificarLider();
    }
  }, [advisor]);

  // Enforcement local del cutoff de acceso (sin disparar peticiones extra al cambiar accessExpiresAt)
  useEffect(() => {
    accessExpiresAtRef.current = accessExpiresAt;
    if (!advisor?.token || advisor.id === "DEV-MODE" || !accessExpiresAt) return;
    if (new Date(accessExpiresAt).getTime() < Date.now()) {
      console.warn("Acceso revocado (Offline Enforce)");
      Alert.alert("Sesión Terminada", "Tu periodo de acceso ha concluido.");
      logout();
    }
  }, [accessExpiresAt, advisor?.token]);

  // Polling periódico para /api/me/access-status (API v14–v16)
  useEffect(() => {
    if (!advisor?.token) return;
    if (advisor.id === "DEV-MODE") return;

    const checkAccess = async () => {
      if (accessExpiresAtRef.current) {
        if (new Date(accessExpiresAtRef.current).getTime() < Date.now()) {
          console.warn("Acceso revocado (Offline Enforce)");
          Alert.alert("Sesión Terminada", "Tu periodo de acceso ha concluido.");
          logout();
          return;
        }
      }

      if (!isOnline) return;

      try {
        const response = await apiFetch("/api/me/access-status", {
          method: "GET",
          headers: { Authorization: `Bearer ${advisor.token}` },
        });

        if (response.status === 404) {
          console.warn("Sesión terminada por el servidor (404 access-status).");
          Logger.warn(`Acceso revocado por el servidor en /api/me/access-status`, {
            status: response.status,
            email: advisor.email,
          });
          Alert.alert("Sesión Terminada", "El servidor ha revocado tu acceso de forma inmediata.");
          logout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const cutoff = data.access_expires_at || null;
          accessExpiresAtRef.current = cutoff;
          setAccessExpiresAt(cutoff);
        }
      } catch (e) {
        console.warn("Fallo al verificar access-status", e);
      }
    };

    checkAccess(); // Primera vez al montar o loguearse
    const interval = setInterval(checkAccess, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [advisor?.token, isOnline]);

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
  const removeDependiente = (id: string) => {
    setPerfil((prev) => ({
      ...prev,
      dependientes: prev.dependientes.filter((d) => d.id !== id),
    }));
    setHijos((prev) => prev.filter((h) => h.id !== id));
  };
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
  const guardarProspecto = async (
    estadoOverride?: "en_espera" | "descartado" | "cierre",
    polizasOverride?: string[],
    acompOverride?: "unaccompanied" | "observation" | "demonstration"
  ) => {
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

    // Buscar el prospecto original para preservar el asesor asignado original (excepción SuperAdmin v16)
    const prospectoOriginal = currentClientId
      ? listaClientes.find((c) => c.id === currentClientId) ||
        listaNube.find((c) => c.id === currentClientId)
      : null;

    const resolvedOriginalAsesor = hydrateAsesorAsignado(
      prospectoOriginal?.asesorAsignado,
      prospectoOriginal?.serverId || currentServerId || undefined
    );
    // Para ADNs existentes priorizar su asesor original; solo usar asesorSeleccionadoGlobal en ADNs nuevos
    const asesorFinal = prospectoOriginal
      ? resolvedOriginalAsesor
      : asesorSeleccionadoGlobal || undefined;

    // 1. Crear Objeto Cliente
    const nuevoClienteObj: ClienteGuardado = {
      id: currentClientId || Date.now().toString(),
      serverId: currentServerId || undefined,
      nombre: nombreCliente,
      fechaCreacion: prospectoOriginal ? prospectoOriginal.fechaCreacion : new Date().toLocaleDateString("es-MX"),
      estatusAdquisicion: estadoOverride || "en_espera",
      tiposCierre: polizasOverride || [],
      accompanimentStatus: acompOverride || (prospectoOriginal ? prospectoOriginal.accompanimentStatus : "unaccompanied"),
      asesorAsignado: asesorFinal,
      sincronizado: advisor?.training ? true : false, // Los ADNs de práctica nacen 'sincronizados' para que el motor de red los ignore para siempre
      data: dataSnapshot,
    };
    if (estadoOverride === "cierre") nuevoClienteObj.estatusCierre = true;
    if (polizasOverride && polizasOverride.length > 0) nuevoClienteObj.tipoCierre = polizasOverride[0];

    // 2. Insertar o Actualizar
    if (currentClientId) {
      const index = nuevaLista.findIndex((c) => c.id === currentClientId);
      if (index >= 0) {
        // Mantenemos estatus anterior (legacy o nuevo), reseteamos sincronizado
        nuevoClienteObj.estatusCierre = estadoOverride === "cierre" ? true : nuevaLista[index].estatusCierre;
        nuevoClienteObj.tipoCierre = polizasOverride && polizasOverride.length > 0 ? polizasOverride[0] : nuevaLista[index].tipoCierre;
        nuevoClienteObj.estatusAdquisicion =
          estadoOverride ||
          nuevaLista[index].estatusAdquisicion ||
          (nuevaLista[index].estatusCierre ? "cierre" : "en_espera");
        nuevoClienteObj.tiposCierre =
          polizasOverride ||
          nuevaLista[index].tiposCierre ||
          (nuevaLista[index].tipoCierre ? [nuevaLista[index].tipoCierre] : []);

        // Preservar metadatos vitales para evitar duplicados y pérdida de advisor_id
        nuevoClienteObj.serverId = nuevaLista[index].serverId || currentServerId || undefined;
        nuevoClienteObj.fechaCreacion = nuevaLista[index].fechaCreacion;
        nuevoClienteObj.asesorAsignado = hydrateAsesorAsignado(
          nuevaLista[index].asesorAsignado,
          nuevoClienteObj.serverId
        );

        nuevaLista[index] = nuevoClienteObj;
      } else {
        nuevaLista.push(nuevoClienteObj);
        setCurrentClientId(nuevoClienteObj.id);
      }
    } else {
      nuevaLista.push(nuevoClienteObj);
      setCurrentClientId(nuevoClienteObj.id);
      if (asesorSeleccionadoGlobal) {
        setAsesorSeleccionadoGlobal(null);
      }
    }

    if (nuevoClienteObj.serverId && nuevoClienteObj.asesorAsignado?.id) {
      rememberAdnAdvisor(nuevoClienteObj.serverId, nuevoClienteObj.asesorAsignado);
    }

    setListaClientes(nuevaLista);
    await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
    setSyncStatus("pending"); // Activa alerta visual
    showAlert("Prospecto guardado exitosamente.");
    
    // Log detallado y completo de la estructura generada
    Logger.info(`Prospecto guardado localmente`, { 
      id: nuevoClienteObj.id, 
      nombre: nuevoClienteObj.nombre,
      objetoCompletoGuardado: nuevoClienteObj 
    });

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
          sincronizado: advisor?.training ? true : false,
        };
      }
      return c;
    });
    setListaClientes(nuevaLista);
    await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
  };

  // --- HELPER: Garantiza tener los datos completos antes de re-subir un perfil solo-nube ---
  // Evita sobrescribir/borrar el `data` del servidor cuando el usuario cambia estatus o
  // acompañamiento desde el Tablero sobre un perfil que solo tenía el resumen de GET /api/profiles.
  const hydrateCloudClientFullData = async (cloudMatch: ClienteGuardado): Promise<any | null> => {
    if (cloudMatch.data && cloudMatch.data.perfil) {
      return cloudMatch.data;
    }

    // 1. Intentar descargar el perfil completo desde el servidor
    if (cloudMatch.serverId && isOnline && advisor?.token && !advisor.training && advisor.id !== "DEV-MODE") {
      try {
        const res = await apiFetch(`/api/profiles/${cloudMatch.serverId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${advisor.token}` },
        });
        if (res.ok) {
          const fullProfile = await res.json();
          let parsedData: any = {};
          if (typeof fullProfile.data === "string" && fullProfile.data.trim().length > 0) {
            parsedData = JSON.parse(fullProfile.data);
          } else if (typeof fullProfile.data === "object" && fullProfile.data !== null) {
            parsedData = fullProfile.data;
          }
          if (parsedData?.profile && Object.keys(parsedData.profile).length > 0) {
            const unmapped = unmapClientData(parsedData);
            if ((!unmapped.referidos || unmapped.referidos.length === 0) && cloudMatch.data?.referidos?.length > 0) {
              unmapped.referidos = cloudMatch.data.referidos;
            }
            return unmapped;
          }
        }
      } catch (e) {
        Logger.warn(`No se pudo descargar detalle completo antes de actualizar metadatos de ${cloudMatch.nombre}`, e);
      }
    }

    // 2. Fallback: revisar copia completa en archivo muerto local
    if (cloudMatch.serverId) {
      try {
        const rawArchive = await storage.getItem<string>("clientes_archive_db");
        const archiveDB: ClienteGuardado[] = rawArchive ? JSON.parse(rawArchive) : [];
        const match = archiveDB.find((c) => c.serverId === cloudMatch.serverId);
        if (match?.data?.perfil) {
          return match.data;
        }
      } catch {
        // Ignorar error de lectura de archivo muerto
      }
    }

    return null;
  };

  const actualizarEstadoProspecto = async (
    id: string,
    estadoEnums: "en_espera" | "descartado" | "cierre",
    tiposPoliza?: string[],
  ) => {
    const foundInLocal = listaClientes.some((c) => c.id === id);

    if (foundInLocal) {
      // El prospecto existe en local — actualizarlo directamente
      const nuevaLista = listaClientes.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            estatusAdquisicion: estadoEnums,
            tiposCierre: tiposPoliza || [],
            estatusCierre: estadoEnums === "cierre", // Proxy for legacy
            tipoCierre:
              tiposPoliza && tiposPoliza.length > 0 ? tiposPoliza[0] : undefined, // Proxy for legacy
            sincronizado: advisor?.training ? true : false,
          };
        }
        return c;
      });
      setListaClientes(nuevaLista);
      await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
      forceSync(nuevaLista);
    } else {
      // El prospecto solo existe en la nube (purgado de local).
      // Descargar sus datos completos primero para NO sobrescribir el perfil con campos vacíos.
      const cloudMatch = listaNube.find((c) => c.id === id || c.serverId === id);
      if (cloudMatch) {
        const fullData = await hydrateCloudClientFullData(cloudMatch);
        if (!fullData) {
          showAlert("No se pudieron descargar los datos completos del prospecto para actualizar su estatus sin perder información. Verifica tu conexión e intenta de nuevo.");
          return;
        }

        const rematerialized: ClienteGuardado = {
          ...cloudMatch,
          data: fullData,
          asesorAsignado: hydrateAsesorAsignado(cloudMatch.asesorAsignado, cloudMatch.serverId),
          estatusAdquisicion: estadoEnums,
          tiposCierre: tiposPoliza || [],
          estatusCierre: estadoEnums === "cierre",
          tipoCierre:
            tiposPoliza && tiposPoliza.length > 0 ? tiposPoliza[0] : undefined,
          sincronizado: advisor?.training ? true : false, // Marcar para que se re-suba al servidor
        };
        const nuevaLista = [...listaClientes, rematerialized];
        setListaClientes(nuevaLista);
        await storage.setItem("clientes_db", JSON.stringify(nuevaLista));

        // También actualizar listaNube para que la UI refleje el cambio inmediatamente
        setListaNube((prev) =>
          prev.map((c) =>
            (c.id === id || c.serverId === id)
              ? { ...c, data: fullData, estatusAdquisicion: estadoEnums, tiposCierre: tiposPoliza || [] }
              : c
          )
        );
        forceSync(nuevaLista);
      }
    }
  };

  const actualizarAcompanamiento = async (
    id: string,
    status: "unaccompanied" | "observation" | "demonstration"
  ) => {
    const foundInLocal = listaClientes.some((c) => c.id === id);

    if (foundInLocal) {
      const nuevaLista = listaClientes.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            accompanimentStatus: status,
            sincronizado: advisor?.training ? true : false,
          };
        }
        return c;
      });
      setListaClientes(nuevaLista);
      await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
      forceSync(nuevaLista);
    } else {
      // Cloud-only: descargar datos completos primero para evitar pérdida de datos al sincronizar
      const cloudMatch = listaNube.find((c) => c.id === id || c.serverId === id);
      if (cloudMatch) {
        const fullData = await hydrateCloudClientFullData(cloudMatch);
        if (!fullData) {
          showAlert("No se pudieron descargar los datos completos del prospecto para actualizar su acompañamiento sin perder información. Verifica tu conexión e intenta de nuevo.");
          return;
        }

        const rematerialized: ClienteGuardado = {
          ...cloudMatch,
          data: fullData,
          asesorAsignado: hydrateAsesorAsignado(cloudMatch.asesorAsignado, cloudMatch.serverId),
          accompanimentStatus: status,
          sincronizado: advisor?.training ? true : false,
        };
        const nuevaLista = [...listaClientes, rematerialized];
        setListaClientes(nuevaLista);
        await storage.setItem("clientes_db", JSON.stringify(nuevaLista));

        setListaNube((prev) =>
          prev.map((c) =>
            (c.id === id || c.serverId === id)
              ? { ...c, data: fullData, accompanimentStatus: status }
              : c
          )
        );
        forceSync(nuevaLista);
      }
    }
  };

  const actualizarAsesorProspecto = async (
    id: string,
    nuevoAsesor: { id: string; nombre: string } | null
  ) => {
    const target = listaClientesRef.current.find((c) => c.id === id);
    if (!target || target.sincronizado || target.serverId) {
      return;
    }

    const nuevaLista = listaClientesRef.current.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          asesorAsignado: nuevoAsesor ? { id: nuevoAsesor.id, nombre: nuevoAsesor.nombre } : undefined,
          sincronizado: advisorRef.current?.training ? true : false,
        };
      }
      return c;
    });

    listaClientesRef.current = nuevaLista;
    setListaClientes(nuevaLista);
    await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
    setSyncStatus("pending");

    Logger.info(`Asesor asignado actualizado en prospecto local`, {
      id,
      nombre: target.nombre,
      asesorAnterior: target.asesorAsignado || null,
      asesorNuevo: nuevoAsesor || null,
    });

    forceSync(nuevaLista);
  };

  const cargarProspecto = async (cliente: ClienteGuardado) => {
    let d = cliente.data;

    // API v10+ — LAZY LOADING: Si es un perfil de la nube (sincronizado + serverId)
    // y no tiene datos cargados aún, obtenerlos bajo demanda (nunca para trainees en v16).
    const hasData = d && Object.keys(d).length > 0 && d.perfil;

    if (!hasData && cliente.serverId && !advisor?.training) {
      // --- GUARDIA OFFLINE: Si no hay conexión o token, NO cargamos datos vacíos ---
      if (!isOnline || !advisor?.token) {
        showAlert("Sin conexión a internet. No se pueden obtener los datos completos de este prospecto. Conéctate a internet e intenta de nuevo.");
        return; // Abortar — no modificamos ningún estado del formulario
      }

      setIsFetchingCloud(true);
      let fetchSucceeded = false;
      try {
        const res = await apiFetch(`/api/profiles/${cliente.serverId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${advisor.token}` },
        });

        if (res.ok) {
          const fullProfile = await res.json();
          let parsedData: any = {};
          try {
            if (typeof fullProfile.data === 'string' && fullProfile.data.trim().length > 0) {
              parsedData = JSON.parse(fullProfile.data);
            } else if (typeof fullProfile.data === 'object' && fullProfile.data !== null) {
              parsedData = fullProfile.data;
            }
          } catch (e) {
            console.error("Error parsing profile data from server:", e);
            parsedData = {};
          }

          const hasRealData = parsedData.profile && Object.keys(parsedData.profile).length > 0;

          if (fullProfile.needs_resync === true || !hasRealData) {
            // API v16: el servidor no pudo devolver el detalle (needs_resync: true o data vacía).
            // Antes de mostrar vacío, intentar rescatar copia local desde archivo muerto y re-subirla.
            try {
              const rawArchive = await storage.getItem<string>("clientes_archive_db");
              const archiveDB: ClienteGuardado[] = rawArchive ? JSON.parse(rawArchive) : [];
              const archiveIdx = archiveDB.findIndex((c) => c.serverId === cliente.serverId);

              if (archiveIdx !== -1 && archiveDB[archiveIdx].data?.perfil) {
                const rescued = { ...archiveDB[archiveIdx], sincronizado: false };
                archiveDB.splice(archiveIdx, 1);
                await storage.setItem("clientes_archive_db", JSON.stringify(archiveDB));

                setListaClientes((prev) => {
                  const alreadyInLocal = prev.some((c) => c.serverId === rescued.serverId);
                  const nextList = alreadyInLocal ? prev : [...prev, rescued];
                  storage.setItem("clientes_db", JSON.stringify(nextList)).catch(console.error);
                  return nextList;
                });

                d = rescued.data;
                fetchSucceeded = true;
                Logger.info(`[needs_resync] Copia local rescatada de archivo muerto al abrir ${cliente.nombre}`);
                setTimeout(() => {
                  forceSync(undefined, true);
                }, 1500);
              }
            } catch (archErr) {
              console.warn("Error consultando archivo muerto en cargarProspecto:", archErr);
            }

            if (!fetchSucceeded) {
              console.warn("[cargarProspecto] Servidor devolvió 200 pero sin datos completos para:", cliente.serverId);
              showAlert("Los datos completos de este prospecto no están disponibles en el servidor.");
              setAsesorSeleccionadoGlobal(null);
              setCurrentClientId(cliente.id);
              setCurrentServerId(cliente.serverId || null);
              setNombreCliente(cliente.nombre);
              const resumenReferidos = cliente.data?.referidos || [];
              setReferidos(resumenReferidos);
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
              setNotas("");
              setPiramideLevels([...INITIAL_PIRAMIDE_LEVELS]);
              return;
            }
          } else {
            d = unmapClientData(parsedData);
            fetchSucceeded = true;
          }

          // Preservar referidos: si el servidor no devolvió referidos pero el resumen sí los tiene
          if ((!d.referidos || d.referidos.length === 0) && cliente.data?.referidos?.length > 0) {
            d.referidos = cliente.data.referidos;
          }

          // Actualizar listaNube con los datos descargados para no volver a pedirlos
          setListaNube((prev) =>
            prev.map((c) => c.serverId === cliente.serverId ? {
              ...c,
              data: d,
              accompanimentStatus: fullProfile.accompaniment_status || c.accompanimentStatus || "unaccompanied"
            } : c)
          );
        } else if (res.status === 429) {
          showAlert("El servidor está ocupado (límite de peticiones). Intenta abrir el prospecto nuevamente en unos segundos.");
          return;
        } else if (res.status === 401 || res.status === 403 || res.status === 404) {
          showAlert(`No se pudo obtener el perfil del servidor (${res.status}).`);
          return;
        } else {
          showAlert(`Error al obtener el perfil (${res.status}). Intenta de nuevo.`);
          return;
        }
      } catch (e: any) {
        console.error("Error al cargar detalle del perfil:", e);
        showAlert("Error de red al obtener los datos del prospecto. Verifica tu conexión a internet.");
        return;
      } finally {
        setIsFetchingCloud(false);
      }

      if (!fetchSucceeded) return;
    }

    // Limpiar selección global de asesor al abrir un prospecto existente para no sobreescribir su advisor_id
    setAsesorSeleccionadoGlobal(null);
    if (cliente.serverId && cliente.asesorAsignado?.id) {
      rememberAdnAdvisor(cliente.serverId, cliente.asesorAsignado);
    }

    // Solo modificamos el estado del formulario si tenemos datos reales
    setCurrentClientId(cliente.id);
    setCurrentServerId(cliente.serverId || null);
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
    const validPiramide = Array.isArray(d.piramideLevels)
      ? d.piramideLevels.filter((l: any) => l && l.id && l.label)
      : [];
    setPiramideLevels(
      validPiramide.length > 0
        ? validPiramide
        : [...INITIAL_PIRAMIDE_LEVELS]
    );
    showAlert(`Cargado: ${cliente.nombre}`);
  };

  const borrarCliente = async (id: string) => {
    // --- PASO 1: Resolver el serverId antes de modificar el estado ---
    // Buscamos primero en la lista local; si no está ahí, buscamos en listaNube
    // (un prospecto "solo nube" usa su serverId como id en el tablero).
    const clienteLocal = listaClientes.find((c) => c.id === id);
    const clienteNube = !clienteLocal ? listaNube.find((c) => c.id === id || c.serverId === id) : null;
    const serverIdToDelete = clienteLocal?.serverId || clienteNube?.serverId || null;

    // --- PASO 2: Borrado local inmediato (UX sin esperar al servidor) ---
    if (clienteLocal) {
      const nuevaLista = listaClientes.filter((c) => c.id !== id);
      setListaClientes(nuevaLista);
      await storage.setItem("clientes_db", JSON.stringify(nuevaLista));
      if (currentClientId === id) {
        nuevoAnalisis(true); // No mostrar "listo para nuevo prospecto"
      }
    }

    // --- PASO 3: Notificar al servidor si el prospecto tiene serverId
    //     y el usuario tiene sesión activa y no está en modo capacitación ---
    if (serverIdToDelete && advisor?.token && !advisor.training) {
      try {
        const res = await apiFetch(`/api/profiles/${serverIdToDelete}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${advisor.token}` },
        });

        if (res.ok || res.status === 404) {
          // 200 = eliminado en servidor. 404 = ya no existía. Ambos son éxito.
          setListaNube((prev) => prev.filter((c) => c.serverId !== serverIdToDelete));
          setTimeout(() => showAlert("Prospecto eliminado exitosamente."), 100);
        } else if (res.status === 401 || res.status === 403) {
          // Token inválido o expirado — forzar logout
          await logout();
        } else if (res.status === 429) {
          setTimeout(() => showAlert("Prospecto eliminado localmente. El servidor estuvo ocupado (429); intenta refrescar tus ADNs."), 100);
        } else {
          setTimeout(() => showAlert("Prospecto eliminado localmente. No se pudo confirmar la eliminación en el servidor, intenta sincronizar."), 100);
        }
      } catch {
        setTimeout(() => showAlert("Prospecto eliminado de tu dispositivo. Sin conexión: el servidor será notificado cuando recuperes internet."), 100);
      }
    } else {
      // Sin serverId (nunca sincronizado) o modo training: solo borrado local
      setTimeout(() => showAlert("Prospecto eliminado exitosamente."), 100);
    }
  };

  const nuevoAnalisis = (silencioso = false) => {
    // Si reseteamos para un nuevo perfil, eliminamos el draft temporal
    storage.removeItem("draft_prospect_v1").catch(console.error);

    setCurrentClientId(null);
    setCurrentServerId(null);
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
    setPiramideLevels([...INITIAL_PIRAMIDE_LEVELS]);
    if (!silencioso) {
      showAlert("Listo para nuevo prospecto.");
      // Auto-sync solo si no fue un reseteo programático (que probablemente ya lanzó su propio sync)
      forceSync();
    }
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
      await storage.setItem("clientes_db", JSON.stringify(nuevaLista));

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
        bypassLoginForDev,
        accessExpiresAt,
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
        currentClientId,
        currentServerId,
        listaNube,
        isFetchingCloud,
        fetchSincronizadosNube,
        borrarCliente,
        nuevoAnalisis,
        toggleCierreProspecto,
        actualizarEstadoProspecto, // <--- Nueva función expuesta
        actualizarAcompanamiento,
        actualizarAsesorProspecto,
        importarRespaldo, // <--- Para respaldos

        // Líder de Equipo
        isLider,
        equipoLider,
        verificarLider,
        asesorSeleccionadoGlobal,
        setAsesorSeleccionadoGlobal,

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
    zIndex: 999999,
    elevation: 100,
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
    elevation: 100,
    zIndex: 999999,
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
