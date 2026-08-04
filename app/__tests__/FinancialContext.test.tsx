import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData, ClienteGuardado } from '../context/FinancialContext';

// --- MOCK CONSTANTS ---
const MOCK_TOKEN = "fake-token";
const MOCK_ADVISOR = {
  id: "123",
  nombre: "Test Advisor",
  email: "test@vigvita.com",
  token: MOCK_TOKEN
};

// --- DUMMY COMPONENT TO EXTRACT CONTEXT ---
let contextRef: any;
const ContextExtractor = () => {
  const ctx = useFinancialData();
  contextRef = ctx;
  return null;
};

const renderProvider = () => {
  return renderer.create(
    <FinancialProvider>
      <ContextExtractor />
    </FinancialProvider>
  );
};

describe('FinancialContext - cargarProspecto & Data Mapping', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Reset fetch and contextRef
    originalFetch = global.fetch;
    contextRef = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Debe detectar data vacía/corrupta del servidor y proteger el estado local preservando referidos', async () => {
    let root: any;
    await act(async () => {
      root = renderProvider();
    });

    // 1. Simular inicio de sesión inyectando el token
    await act(async () => {
      await contextRef.bypassLoginForDev('asesor');
    });

    // 2. Mockear fetch para devolver data vacía (el bug original)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'server-1',
          data: null // Datos corruptos
        }),
      })
    ) as jest.Mock;

    // 3. Crear prospecto de prueba (simulando que vino del resumen listaNube)
    const clienteMock: ClienteGuardado = {
      id: 'local-1',
      serverId: 'server-1',
      nombre: 'Juan Pérez',
      fechaCreacion: '01/01/2026',
      sincronizado: true,
      data: {
        referidos: [{ id: 'ref-1', nombre: 'Referido del Resumen', edad: '', ocupacion: '', telefono: '' }]
      }
    };

    // 4. Disparar la carga
    await act(async () => {
      await contextRef.cargarProspecto(clienteMock);
    });

    // 5. Verificaciones
    expect(contextRef.nombreCliente).toBe('Juan Pérez');
    expect(contextRef.referidos.length).toBe(1);
    expect(contextRef.referidos[0].nombre).toBe('Referido del Resumen');
    expect(contextRef.piramideLevels.length).toBe(4);
    expect(contextRef.perfil.telefono).toBe('');

    root.unmount();
  });

  it('2. Debe procesar correctamente la carga de un prospecto sano (unmapClientData)', async () => {
    let root: any;
    await act(async () => {
      root = renderProvider();
    });
    
    await act(async () => {
      await contextRef.bypassLoginForDev('asesor');
    });

    // Mockear fetch para devolver un payload sano (en JSON string)
    const validServerData = {
      profile: {
        phone: "5551234567",
        smoker: true
      },
      priority_levels: [
        { id: "1", label: "Salud", color: "#FF0000", icon: "medkit" },
        { id: "2", label: "Retiro", color: "#00FF00", icon: "cash" }
      ],
      children: [
        { id: "hijo-1", nombre: "Carlitos", edad: "5" }
      ]
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'server-1',
          data: JSON.stringify(validServerData)
        }),
      })
    ) as jest.Mock;

    const clienteMock: ClienteGuardado = {
      id: 'local-1',
      serverId: 'server-1',
      nombre: 'Maria',
      fechaCreacion: '01/01/2026',
      sincronizado: true,
      data: {} // Sin referidos en el resumen
    };

    await act(async () => {
      await contextRef.cargarProspecto(clienteMock);
    });

    // Verificamos que los datos se desglosaron y popularon en el contexto
    expect(contextRef.perfil.telefono).toBe('5551234567');
    expect(contextRef.perfil.fuma).toBe(true);
    
    // La pirámide debe reflejar exactamente los niveles devueltos
    expect(contextRef.piramideLevels.length).toBe(2);
    expect(contextRef.piramideLevels[0].label).toBe('Salud');
    
    // Los hijos deben mapearse
    expect(contextRef.hijos.length).toBe(1);
    expect(contextRef.hijos[0].id).toBe('hijo-1');

    root.unmount();
  });

  it('3. Debe purgar prospectos hacia el Archivo Muerto, y rescatarlos exitosamente ante un needs_resync', async () => {
    // 1. Preconfigurar el entorno local ANTES de renderizar el Provider
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify({ user: MOCK_ADVISOR, sessionVersion: 2 });
      if (key === 'clientes_db') {
        // La lista activa tiene a "Pedro" (sincronizado, listo para purgarse)
        return JSON.stringify([
          { id: 'local-1', serverId: 'server-ok-1', nombre: 'Pedro', sincronizado: true, data: {} }
        ]);
      }
      if (key === 'clientes_archive_db') {
        // El archivo muerto tiene a "Ana" (fue purgada en el pasado)
        return JSON.stringify([
          { id: 'local-2', serverId: 'server-lost-1', nombre: 'Ana (Archivo Muerto)', sincronizado: true, data: {} }
        ]);
      }
      return null;
    });

    let root: any;
    await act(async () => {
      root = renderProvider();
    });

    // Dar tiempo a que el useEffect inicial termine de cargar 'clientes_db'
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      await contextRef.bypassLoginForDev('asesor');
    });

    // 2. Mockear la respuesta del servidor simulando una sincronización (fetchSincronizadosNube)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          profiles: [
            { id: 'server-ok-1', updated_at: '2026', needs_resync: false },
            { id: 'server-lost-1', needs_resync: true }
          ]
        }),
      })
    ) as jest.Mock;

    console.log("CONTEXT ADVISOR BEFORE SYNC:", contextRef.advisor);

    // 3. Disparar el flujo de sincronización general
    await act(async () => {
      await contextRef.fetchSincronizadosNube();
    });

    // 4. Verificaciones de la lógica del Archivo Muerto
    // ¿Qué debe pasar con la memoria activa (setItem en clientes_db)?
    // 1. Pedro debe haber sido purgado.
    // 2. Ana debe haber sido rescatada, inyectada y marcada como sincronizado: false.
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    console.log("ALL SETITEM CALLS:", mockStorage.setItem.mock.calls);
    expect(dbCalls.length).toBeGreaterThan(0);
    const lastDbSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
    
    expect(lastDbSave.find((c: any) => c.nombre === 'Pedro')).toBeUndefined(); // Pedro se fue
    const anaRescatada = lastDbSave.find((c: any) => c.nombre === 'Ana (Archivo Muerto)');
    expect(anaRescatada).toBeDefined(); // Ana volvió
    expect(anaRescatada.sincronizado).toBe(false); // Lista para subirse!

    // ¿Qué debe pasar con el Archivo Muerto (setItem en clientes_archive_db)?
    // 1. Pedro debe haber entrado al archivo muerto.
    // 2. Ana debe haber salido del archivo muerto.
    const archiveCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_archive_db');
    expect(archiveCalls.length).toBeGreaterThan(0);
    const lastArchiveSave = JSON.parse(archiveCalls[archiveCalls.length - 1][1]);
    
    expect(lastArchiveSave.find((c: any) => c.nombre === 'Pedro')).toBeDefined(); // Pedro entró al cementerio
    expect(lastArchiveSave.find((c: any) => c.nombre === 'Ana (Archivo Muerto)')).toBeUndefined(); // Ana salió del cementerio

    root.unmount();
  });

  it('4. Debe aplicar Read-After-Write: retener datos corruptos y eliminar datos exitosos tras sincronizar', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    // Preparamos dos clientes pendientes de sincronizar
    const clientesPendientes = [
      { id: 'c1', nombre: 'Exitoso', sincronizado: false, data: { hijos: [{ id: 'h1' }] } },
      { id: 'c2', nombre: 'Corrupto', sincronizado: false, data: { hijos: [{ id: 'h2' }] } }
    ];

    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify({ user: MOCK_ADVISOR, sessionVersion: 2 });
      if (key === 'clientes_db') return JSON.stringify(clientesPendientes);
      return null;
    });

    let root: any;
    await act(async () => {
      root = renderProvider();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Esperar inicialización
      await contextRef.bypassLoginForDev('asesor');
    });

    // Mockeamos la API para simular el POST de forceSync y los GETs del Read-After-Write
    global.fetch = jest.fn((url: string, options: any) => {
      // 1. Petición POST inicial de sincronización
      if (options?.method === 'POST') {
        return Promise.resolve({
          status: 201,
          json: () => Promise.resolve({ data: ['uuid-1', 'uuid-2'] })
        });
      }
      
      // 2. Peticiones GET de Read-After-Write
      if (url.includes('uuid-1')) {
        // El cliente "Exitoso" devuelve sus datos completos e intactos
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: JSON.stringify({ children: [{ id: 'h1' }] }) })
        });
      }
      
      if (url.includes('uuid-2')) {
        // El cliente "Corrupto" devuelve datos vacíos (simulando que el server borró sus hijos)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: JSON.stringify({ children: [] }) })
        });
      }

      // Fallback genérico para llamadas inesperadas
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    // Disparamos la subida
    await act(async () => {
      await contextRef.forceSync(undefined, true);
    });

    // Validamos qué se guardó finalmente en la memoria local
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    const lastDbSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);

    // 'Exitoso' debió borrarse porque pasó la validación Read-After-Write
    expect(lastDbSave.find((c: any) => c.nombre === 'Exitoso')).toBeUndefined();
    
    // 'Corrupto' debió retenerse porque le faltaban los hijos
    const corruptoRetenido = lastDbSave.find((c: any) => c.nombre === 'Corrupto');
    expect(corruptoRetenido).toBeDefined();
    
    root.unmount();
  });
});
