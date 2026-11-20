/**
 * Integration Test: Cloud Fetch
 * 
 * Tests fetchSincronizadosNube: cloud list download, safe purge,
 * dead archive, needs_resync handling, and auto-rescue.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';
import { FIXTURES } from '../setup/testSetup';

let ctx: any;
const Extractor = () => { ctx = useFinancialData(); return null; };

const mountProvider = async () => {
  let root: any;
  await act(async () => {
    root = renderer.create(
      <FinancialProvider><Extractor /></FinancialProvider>
    );
  });
  return root;
};

describe('Cloud Fetch — fetchSincronizadosNube', () => {
  let root: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.__clearTestStorage?.();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await act(async () => { jest.runAllTimers(); });
    root?.unmount();
  });

  it('Fetch exitoso mapea perfiles a listaNube', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: 'srv-1', client_name: 'Cloud Client 1', status: 'pending', created_at: '2026-01-01T00:00:00' },
              { id: 'srv-2', client_name: 'Cloud Client 2', status: 'completed', created_at: '2026-02-01T00:00:00' },
            ]
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => {
      await ctx.fetchSincronizadosNube();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaNube).toHaveLength(2);
    expect(ctx.listaNube[0].nombre).toBe('Cloud Client 1');
    expect(ctx.listaNube[0].serverId).toBe('srv-1');
    expect(ctx.listaNube[1].estatusAdquisicion).toBe('cierre');
  });

  it('Purga segura: locales sincronizados confirmados por servidor se remueven', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') {
        return JSON.stringify([
          FIXTURES.SAVED_CLIENT({ id: 'local-sync', serverId: 'srv-confirmed', sincronizado: true }),
          FIXTURES.PENDING_CLIENT({ id: 'local-pending', sincronizado: false }),
        ]);
      }
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: 'srv-confirmed', client_name: 'Confirmed', status: 'pending', created_at: '2026-01-01' }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // The synced local should have been purged
    const remaining = ctx.listaClientes;
    expect(remaining.find((c: any) => c.id === 'local-sync')).toBeUndefined();
    // The pending local should survive
    expect(remaining.find((c: any) => c.id === 'local-pending')).toBeDefined();
  });

  it('Purga NO toca pendientes (sincronizado=false)', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') {
        return JSON.stringify([
          // This client has serverId matching a server profile BUT is not synced
          FIXTURES.PENDING_CLIENT({ id: 'safe', serverId: 'srv-safe', sincronizado: false }),
        ]);
      }
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [{ id: 'srv-safe', client_name: 'Safe', status: 'pending', created_at: '2026-01-01' }]
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // The pending client MUST survive even though server has it
    expect(ctx.listaClientes.find((c: any) => c.id === 'safe')).toBeDefined();
  });

  it('Needs_resync: copia activa se desmarca sincronizado', async () => {
    const resyncUuid = '11111111-1111-4111-8111-111111111111';
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') {
        return JSON.stringify([
          FIXTURES.SAVED_CLIENT({ id: 'resync-me', serverId: resyncUuid, sincronizado: true }),
        ]);
      }
      return null;
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: resyncUuid, client_name: 'Resync Me', needs_resync: true }
            ]
          }),
        });
      }
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: [] }),
          text: () => Promise.resolve('{"data":[]}'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // Aserción incondicional: clientes_db DEBE haberse persistido con sincronizado: false
    const mockCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    expect(mockCalls.length).toBeGreaterThan(0);
    const saved = JSON.parse(mockCalls[mockCalls.length - 1][1]);
    const resyncClient = saved.find((c: any) => c.serverId === resyncUuid);
    expect(resyncClient).toBeDefined();
    expect(resyncClient.sincronizado).toBe(false);
  });

  it('Needs_resync: rescate del archivo muerto', async () => {
    const archivedUuid = '22222222-2222-4222-8222-222222222222';
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') return JSON.stringify([]); // Empty active list
      if (key === 'clientes_archive_db') {
        return JSON.stringify([
          FIXTURES.SAVED_CLIENT({ id: 'archived', serverId: archivedUuid, nombre: 'Archived Client' }),
        ]);
      }
      return null;
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: archivedUuid, client_name: 'Archived Client', needs_resync: true }
            ]
          }),
        });
      }
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: [] }),
          text: () => Promise.resolve('{"data":[]}'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // Aserciones incondicionales: rescatado a clientes_db y removido de clientes_archive_db
    const mockCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    expect(mockCalls.length).toBeGreaterThan(0);
    const saved = JSON.parse(mockCalls[mockCalls.length - 1][1]);
    const rescued = saved.find((c: any) => c.serverId === archivedUuid);
    expect(rescued).toBeDefined();
    expect(rescued.sincronizado).toBe(false);

    const archiveCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_archive_db');
    expect(archiveCalls.length).toBeGreaterThan(0);
    const archive = JSON.parse(archiveCalls[archiveCalls.length - 1][1]);
    expect(archive.find((c: any) => c.serverId === archivedUuid)).toBeUndefined();
  });

  it('Sin conexión muestra alerta y no hace fetch', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Go offline
    await act(async () => { ctx.toggleOnlineSimulation(); });

    global.fetch = jest.fn() as jest.Mock;
    await act(async () => { await ctx.fetchSincronizadosNube(); });

    // fetch should not have been called for profiles
    const profileCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (c: any) => c[0]?.includes?.('/api/profiles')
    );
    expect(profileCalls).toHaveLength(0);

    // Go back online
    await act(async () => { ctx.toggleOnlineSimulation(); });
  });

  it('Auth 401 durante fetch fuerza logout', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles')) {
        return Promise.resolve({
          ok: false, status: 401,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('Unauthorized'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.advisor).toBeNull();
  });

  it('Relationship mapping: created_for y created_by se mapean', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [{
              id: 'srv-rel',
              client_name: 'Relación Test',
              status: 'pending',
              created_at: '2026-01-01',
              relationship: {
                created_for: 'Asesor Destino',
                created_by: 'Líder Creador'
              }
            }]
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    const cloudClient = ctx.listaNube.find((c: any) => c.serverId === 'srv-rel');
    expect(cloudClient).toBeDefined();
    expect(cloudClient.asesorAsignado?.nombre).toBe('Asesor Destino');
    expect(cloudClient.creadoPor).toBe('Líder Creador');
  });

  it('API v16 — Advisor_Trainee nunca llama a GET /api/profiles', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') {
        return JSON.stringify(FIXTURES.SESSION(FIXTURES.ADVISOR_TRAINING));
      }
      return null;
    });

    const calledUrls: string[] = [];
    global.fetch = jest.fn((url: string) => {
      calledUrls.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_expires_at: null }),
      });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });

    expect(calledUrls.some((u) => u.includes('/api/profiles'))).toBe(false);
  });

  it('API v16 — Hidrata asesorAsignado.id cuando /api/profile-advisors responde después de /api/profiles', async () => {
    const advisorUuid = '77777777-7777-4777-8777-777777777777';
    const leaderUser = { ...FIXTURES.ADVISOR, isLider: true };
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION(leaderUser));
      return null;
    });

    let returnAdvisors = false;
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profile-advisors')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              advisors: returnAdvisors ? [{ id: advisorUuid, name: 'Asesor Tardío' }] : [],
            }),
        });
      }
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              profiles: [
                {
                  id: '88888888-8888-4888-8888-888888888888',
                  client_name: 'Cliente de SuperAdmin',
                  status: 'pending',
                  created_at: '2026-04-22T00:00:00Z',
                  relationship: { created_for: 'Asesor Tardío' },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ access_expires_at: null }) });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Primero carga la nube mientras equipoLider aún está vacío
    await act(async () => { await ctx.fetchSincronizadosNube(); });
    expect(ctx.listaNube[0].asesorAsignado?.nombre).toBe('Asesor Tardío');
    expect(ctx.listaNube[0].asesorAsignado?.id).toBe('');

    // Luego llega /api/profile-advisors -> debe hidratar el UUID automáticamente
    returnAdvisors = true;
    await act(async () => { await ctx.verificarLider(); });

    expect(ctx.listaNube[0].asesorAsignado?.id).toBe(advisorUuid);
  });

  it('API v16 — cargarProspecto rescata datos de archivo muerto cuando GET /api/profiles/{id} devuelve needs_resync: true', async () => {
    const profileUuid = '66666666-6666-4666-8666-666666666666';
    const archivedCopy = FIXTURES.SAVED_CLIENT({
      id: 'arch-1',
      serverId: profileUuid,
      nombre: 'Rescatado en Apertura',
    });

    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_archive_db') return JSON.stringify([archivedCopy]);
      return null;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.includes(`/api/profiles/${profileUuid}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: profileUuid,
              client_name: 'Rescatado en Apertura',
              needs_resync: true,
              data: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [], access_expires_at: null }) });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => {
      await ctx.cargarProspecto({
        id: profileUuid,
        serverId: profileUuid,
        nombre: 'Rescatado en Apertura',
        fechaCreacion: '01/01/2026',
        sincronizado: true,
        data: {},
      });
    });

    // Debe haber restaurado el teléfono completo desde el archivo muerto, no datos vacíos
    expect(ctx.perfil.telefono).toBe('5551234567');
    expect(ctx.listaClientes.some((c: any) => c.serverId === profileUuid && c.sincronizado === false)).toBe(true);
  });
});
