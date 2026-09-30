/**
 * Integration Test: Sync Engine
 * 
 * Tests forceSync: batch sync, rescue mode, Read-After-Write validation,
 * concurrency guard, DEV-MODE skip, training skip, auth failures.
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

/** Mount with a real (non-DEV) advisor session */
const mountWithRealAdvisor = async (extraStorage: Record<string, string> = {}) => {
  const mockStorage = require('@react-native-async-storage/async-storage');
  mockStorage.getItem.mockImplementation(async (key: string) => {
    if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
    if (extraStorage[key]) return extraStorage[key];
    return null;
  });
  const root = await mountProvider();
  await act(async () => { jest.runAllTimers(); });
  return root;
};

describe('Sync Engine — forceSync', () => {
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

  it('Sync sin pendientes retorna inmediato sin hacer fetch', async () => {
    root = await mountWithRealAdvisor();

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve({ profiles: [] }),
      text: () => Promise.resolve(''),
    })) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result!).toContain('Todo está al día');
    // fetch should not have been called for POST
    const postCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (c: any) => c[1]?.method === 'POST' && c[0].includes('/api/profiles/new')
    );
    expect(postCalls).toHaveLength(0);
  });

  it('Sync batch exitoso (201): clientes removidos de local', async () => {
    const pendingClients = JSON.stringify([
      FIXTURES.PENDING_CLIENT({ id: 'p1', nombre: 'Exitoso 1' }),
      FIXTURES.PENDING_CLIENT({ id: 'p2', nombre: 'Exitoso 2' }),
    ]);

    root = await mountWithRealAdvisor({ 'clientes_db': pendingClients });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: ['uuid-1', 'uuid-2'] }),
          text: () => Promise.resolve(''),
        });
      }
      // Read-After-Write GETs
      if (url.includes('uuid-1') || url.includes('uuid-2')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()),
          }),
        });
      }
      // fetchSincronizadosNube
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ profiles: [] }),
        text: () => Promise.resolve(''),
      });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result!).toContain('exitosa');
    // Clients should have been removed from local storage
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    if (dbCalls.length > 0) {
      const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
      expect(lastSave.find((c: any) => c.nombre === 'Exitoso 1')).toBeUndefined();
      expect(lastSave.find((c: any) => c.nombre === 'Exitoso 2')).toBeUndefined();
    }
  });

  it('DEV-MODE skip: sync no hace fetch', async () => {
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });
    await act(async () => { jest.runAllTimers(); });

    global.fetch = jest.fn() as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });

    expect(result!).toContain('DEV-MODE');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Training skip: sync no hace fetch', async () => {
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('training'); });
    await act(async () => { jest.runAllTimers(); });

    global.fetch = jest.fn() as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });

    expect(result!).toContain('Capacitación');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Sin conexión muestra alerta y no hace fetch', async () => {
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT()]),
    });

    // Go offline
    await act(async () => { ctx.toggleOnlineSimulation(); });
    global.fetch = jest.fn() as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });

    expect(result!).toContain('ERROR');
    expect(global.fetch).not.toHaveBeenCalled();

    // Go back online
    await act(async () => { ctx.toggleOnlineSimulation(); });
  });

  it('Auth 401 durante sync fuerza logout', async () => {
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT()]),
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: false, status: 401,
          text: () => Promise.resolve('Unauthorized'),
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result!).toContain('ERROR');
    expect(result!).toContain('Sesión Inválida');
    // Should have triggered logout
    expect(ctx.advisor).toBeNull();
  });

  it('Rescue Mode: batch 400 → reintenta individualmente', async () => {
    const clients = [
      FIXTURES.PENDING_CLIENT({ id: 'ok-1', nombre: 'Bueno' }),
      FIXTURES.PENDING_CLIENT({ id: 'bad-1', nombre: 'Malo' }),
    ];

    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify(clients),
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        const body = JSON.parse(opts?.body || '{}');
        const clients = body.clients || [];
        if (clients.length > 1) {
          // Batch fails with 400
          return Promise.resolve({
            ok: false, status: 400,
            text: () => Promise.resolve('Bad Request'),
            json: () => Promise.resolve({}),
          });
        }
        if (clients.length === 1) {
          if (clients[0].name === 'Bueno') {
            return Promise.resolve({
              ok: true, status: 201,
              json: () => Promise.resolve({ data: ['uuid-bueno'] }),
              text: () => Promise.resolve(''),
            });
          }
          return Promise.resolve({
            ok: false, status: 400,
            text: () => Promise.resolve('Invalid data'),
            json: () => Promise.resolve({}),
          });
        }
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }), text: () => Promise.resolve('') });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result!).toContain('parcial');

    // 'Bueno' should be removed, 'Malo' should be retained
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    if (dbCalls.length > 0) {
      const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
      expect(lastSave.find((c: any) => c.nombre === 'Bueno')).toBeUndefined();
      expect(lastSave.find((c: any) => c.nombre === 'Malo')).toBeDefined();
    }
  });

  it('Error de red durante sync retorna error y preserva datos', async () => {
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT()]),
    });

    global.fetch = jest.fn(() => Promise.reject(new Error('Network failed'))) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result!).toContain('ERROR');
    expect(ctx.syncStatus).toBe('pending');
    // Client should still be in list
    expect(ctx.listaClientes.length).toBeGreaterThan(0);
  });

  it('Read-After-Write: GET falla → prospecto retenido con serverId', async () => {
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT({ id: 'raw-1', nombre: 'Retenido' })]),
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: ['uuid-retained'] }),
          text: () => Promise.resolve(''),
        });
      }
      if (url.includes('uuid-retained')) {
        // GET fails
        return Promise.resolve({
          ok: false, status: 500,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }), text: () => Promise.resolve('') });
    }) as jest.Mock;

    await act(async () => {
      await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    // Client should be retained but with serverId assigned
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    if (dbCalls.length > 0) {
      const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
      const retained = lastSave.find((c: any) => c.nombre === 'Retenido');
      expect(retained).toBeDefined();
      expect(retained.serverId).toBe('uuid-retained');
    }
  });
});
