/**
 * Vigvita Test Setup — Shared Utilities
 * 
 * Provides:
 * - In-memory AsyncStorage mock (simulates real persistence between calls)
 * - Mock fetch factory for building API responses per route
 * - Provider render helper with context extractor
 * - Common fixtures (advisor, client, server data)
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData, ClienteGuardado } from '../../context/FinancialContext';

// ============================================================
// 1. IN-MEMORY STORAGE MOCK
// ============================================================
export class InMemoryStorage {
  private store: Record<string, string> = {};

  getItem = jest.fn(async (key: string): Promise<string | null> => {
    return this.store[key] ?? null;
  });

  setItem = jest.fn(async (key: string, value: string): Promise<void> => {
    this.store[key] = value;
  });

  removeItem = jest.fn(async (key: string): Promise<void> => {
    delete this.store[key];
  });

  clear = jest.fn(async (): Promise<void> => {
    this.store = {};
  });

  /** Direct access for test assertions */
  _getRaw(key: string): string | null {
    return this.store[key] ?? null;
  }

  _setRaw(key: string, value: string): void {
    this.store[key] = value;
  }

  _reset(): void {
    this.store = {};
    this.getItem.mockClear();
    this.setItem.mockClear();
    this.removeItem.mockClear();
    this.clear.mockClear();
  }
}

// ============================================================
// 2. CONTEXT EXTRACTOR + RENDER HELPER
// ============================================================
let _contextRef: any = null;

const ContextExtractor = () => {
  const ctx = useFinancialData();
  _contextRef = ctx;
  return null;
};

export const renderProvider = () => {
  let root: any;
  return {
    mount: async () => {
      await act(async () => {
        root = renderer.create(
          React.createElement(FinancialProvider, null,
            React.createElement(ContextExtractor)
          )
        );
      });
      return root;
    },
    get ctx() {
      return _contextRef;
    },
    unmount: async () => {
      if (root) {
        await act(async () => {
          root.unmount();
        });
      }
    }
  };
};

// ============================================================
// 3. MOCK FETCH FACTORY
// ============================================================
type FetchHandler = (url: string, options?: any) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}>;

export const createMockFetch = (handlers: Record<string, FetchHandler>): jest.Mock => {
  return jest.fn((url: string, options?: any) => {
    // Try specific handlers first (method + path pattern)
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        return handler(url, options);
      }
    }
    // Default: return empty 200
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
  }) as jest.Mock;
};

/** Quick helper for a simple JSON response */
export const jsonResponse = (status: number, body: any) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

// ============================================================
// 4. COMMON FIXTURES
// ============================================================
export const FIXTURES = {
  ADVISOR: {
    id: 'ADV-TEST',
    nombre: 'Test Advisor',
    email: 'test@vigvita.com',
    token: 'fake-token-123',
    training: false,
    isLider: false,
  },

  ADVISOR_TRAINING: {
    id: 'ADV-TRAIN',
    nombre: 'Trainee',
    email: 'train@vigvita.com',
    token: 'fake-token-train',
    training: true,
    isLider: false,
  },

  SESSION: (advisor = FIXTURES.ADVISOR) => ({
    user: advisor,
    loginTime: Date.now(),
    sessionVersion: 2,
  }),

  /** A fully populated client data snapshot (Spanish/local format) */
  FULL_CLIENT_DATA: () => ({
    perfil: {
      telefono: '5551234567',
      ocupacion: 'Ingeniero',
      hobbies: 'Lectura',
      deporte: 'Natación',
      fuma: false,
      fechaNacimiento: '15/03/1990',
      estadoCivil: 'Casado',
      conyugeNombre: 'María López',
      conyugeTelefono: '5559876543',
      conyugeFechaNacimiento: '20/07/1992',
      conyugeOcupacion: 'Doctora',
      conyugeFuma: false,
      conyugeHobbies: 'Yoga',
      conyugeDeporte: 'Running',
      dependientes: [
        { id: 'dep-1', nombre: 'Carlitos', edad: '5', parentesco: 'Hijo', notas: '' },
        { id: 'dep-2', nombre: 'Ana', edad: '3', parentesco: 'Hija', notas: 'Alergia' },
      ],
      notaProteccion: 'Nota protección',
      notaEducacion: 'Nota educación',
      notaAhorro: 'Nota ahorro',
      notaJubilacion: 'Nota jubilación',
      notaSalud: 'Nota salud',
      notaRiesgos: 'Nota riesgos',
    },
    hijos: [
      { id: 'dep-1', nombre: 'Carlitos', edad: '5', universidad: 'Unitec', yearsFaltantes: 13, costoProyectado: 816184.26, ahorroAnual: 62783.4 },
      { id: 'dep-2', nombre: 'Ana', edad: '3', universidad: 'UVM', yearsFaltantes: 15, costoProyectado: 1370954.02, ahorroAnual: 91396.93 },
    ],
    jubilacion: { esperanzaVida: '85', edadRetiro: '65', montoMensual: '50000', edadActual: '34' },
    activos: { ahorros: '500000', casa: '3000000', otrosInmuebles: '0', vehiculos: '350000', inversiones: '200000', otros: '0' },
    pasivos: { hipoteca: '1500000', prestamos: '100000', tarjetas: '50000', limiteCredito: '200000', otros: '0' },
    seguros: {
      individual: { compania: 'GNP', plan: 'Vida Plus', sumaAsegurada: '5000000', prima: '12000' },
      colectivo: { compania: 'MetLife', plan: 'Colectivo', sumaAsegurada: '2000000', prima: '0' },
      otros: { compania: '', plan: '', sumaAsegurada: '', prima: '' },
    },
    ingresos: { titular: '80000', conyuge: '60000', prestacionesTitular: 'Aguinaldo, Vales', prestacionesConyuge: 'IMSS' },
    gastosBasicos: { servicios: '3000', vivienda: '15000', alimentacion: '8000', colegios: '12000', transporte: '5000', seguros: '2000' },
    gastosVariables: { creditos: '5000', recreacion: '3000', entretenimiento: '2000', domestico: '4000', salud: '1000', otros: '1000' },
    fallecimiento: { gastosSepelio: '100000', gastosIncapacidad: '500000' },
    detalle: { otrosIngresos: '10000', tasaInteres: '8', planProteccion: '10', planAhorro: '7' },
    cita: { dia: '15', mes: 'Octubre', hora: '10:00', lugar: 'Oficina', necesitaDecisionMaker: true, nombreDecisionMaker: 'María López' },
    referidos: [
      { id: 'Familiar-0', nombre: 'Pedro Gómez', edad: '40', estadoCivil: 'Casado', ocupacion: 'Abogado', telefono: '5551112222', entorno: 'Familiar', grupoFamiliar: 'Tío', notas: '' },
      { id: 'Social-0', nombre: 'Laura Sánchez', edad: '35', estadoCivil: 'Soltera', ocupacion: 'Contadora', telefono: '5553334444', entorno: 'Social', grupoFamiliar: '', notas: 'Interesada' },
    ],
    notas: 'Notas generales del prospecto',
    piramideLevels: [
      { id: 'pro', label: 'ESTILO DE VIDA', color: '#161616', icon: 'shield' },
      { id: 'edu', label: 'EDUCACIÓN', color: '#8cbe27', icon: 'graduation-cap' },
      { id: 'aho', label: 'AHORRO', color: '#2665ad', icon: 'bank' },
      { id: 'jub', label: 'JUBILACIÓN', color: '#0e8ece', icon: 'plane' },
    ],
  }),

  /** A server-format data payload (English/API format) */
  FULL_SERVER_DATA: () => ({
    profile: {
      phone: '5551234567',
      occupation: 'Ingeniero',
      hobbies: 'Lectura',
      sport: 'Natación',
      smoker: false,
      birth_date: '15/03/1990',
      marital_status: 'Casado',
      spouse_name: 'María López',
      spouse_phone: '5559876543',
      spouse_birth_date: '20/07/1992',
      spouse_occupation: 'Doctora',
      spouse_smoker: false,
      spouse_hobbies: 'Yoga',
      spouse_sport: 'Running',
      dependents: [
        { name: 'Carlitos', age: 5, relationship: 'Hijo', notes: '' },
        { name: 'Ana', age: 3, relationship: 'Hija', notes: 'Alergia' },
      ],
      note_protection: 'Nota protección',
      note_education: 'Nota educación',
      note_savings: 'Nota ahorro',
      note_retirement: 'Nota jubilación',
      note_health: 'Nota salud',
      note_risks: 'Nota riesgos',
    },
    children: [
      { name: 'Carlitos', age: 5, university: 'Unitec', years_remaining: 13, projected_cost: 816184.26, annual_savings: 62783.4 },
      { name: 'Ana', age: 3, university: 'UVM', years_remaining: 15, projected_cost: 1370954.02, annual_savings: 91396.93 },
    ],
    retirement: { life_expectancy: 85, retirement_age: 65, monthly_amount: 50000, current_age: 34 },
    assets: { savings: 500000, house: 3000000, other_properties: 0, vehicles: 350000, investments: 200000, other: 0 },
    liabilities: { mortgage: 1500000, loans: 100000, credit_cards: 50000, credit_limit: 200000, other: 0 },
    insurance: {
      individual: { company: 'GNP', plan: 'Vida Plus', coverage_amount: 5000000, premium: 12000 },
      group: { company: 'MetLife', plan: 'Colectivo', coverage_amount: 2000000, premium: 0 },
      other: { company: '', plan: '', coverage_amount: 0, premium: 0 },
    },
    income: { holder: 80000, spouse: 60000, holder_benefits: 'Aguinaldo, Vales', spouse_benefits: 'IMSS' },
    fixed_expenses: { utilities: 3000, housing: 15000, food: 8000, schools: 12000, transportation: 5000, insurance: 2000 },
    variable_expenses: { credit_payments: 5000, recreation: 3000, entertainment: 2000, household: 4000, health: 1000, other: 1000 },
    death_expenses: { funeral_costs: 100000, disability_costs: 500000 },
    plan_details: { other_income: 10000, interest_rate: 8, protection_plan: 10, savings_plan: 7 },
    appointment: { day: '15', month: 'Octubre', time: '10:00', location: 'Oficina', needs_decision_maker: true, decision_maker_name: 'María López' },
    referrals: [
      { name: 'Pedro Gómez', age: 40, marital_status: 'Casado', occupation: 'Abogado', phone: '5551112222', circle: 'Familiar', family_group: 'Tío', notes: '' },
      { name: 'Laura Sánchez', age: 35, marital_status: 'Soltera', occupation: 'Contadora', phone: '5553334444', circle: 'Social', family_group: '', notes: 'Interesada' },
    ],
    notes: 'Notas generales del prospecto',
    priority_levels: [
      { id: 'pro', label: 'ESTILO DE VIDA', color: '#161616', icon: 'shield' },
      { id: 'edu', label: 'EDUCACIÓN', color: '#8cbe27', icon: 'graduation-cap' },
      { id: 'aho', label: 'AHORRO', color: '#2665ad', icon: 'bank' },
      { id: 'jub', label: 'JUBILACIÓN', color: '#0e8ece', icon: 'plane' },
    ],
  }),

  SAVED_CLIENT: (overrides: Partial<ClienteGuardado> = {}): ClienteGuardado => ({
    id: 'local-1',
    serverId: 'server-uuid-1',
    nombre: 'Juan Pérez',
    fechaCreacion: '01/01/2026',
    sincronizado: true,
    data: FIXTURES.FULL_CLIENT_DATA(),
    ...overrides,
  }),

  PENDING_CLIENT: (overrides: Partial<ClienteGuardado> = {}): ClienteGuardado => ({
    id: 'local-pending-1',
    nombre: 'Carlos Nuevo',
    fechaCreacion: '15/09/2026',
    sincronizado: false,
    data: FIXTURES.FULL_CLIENT_DATA(),
    ...overrides,
  }),
};

// ============================================================
// 5. UTILITY HELPERS
// ============================================================
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Wait for all pending microtasks + run fake timers */
export const flushAll = async () => {
  await act(async () => {
    jest.runAllTimers();
  });
};
