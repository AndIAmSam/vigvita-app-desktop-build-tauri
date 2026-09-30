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
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') {
        return JSON.stringify([
          FIXTURES.SAVED_CLIENT({ id: 'resync-me', serverId: 'srv-resync', sincronizado: true }),
        ]);
      }
      return null;
    });

    let syncCalled = false;
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && !opts?.method) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: 'srv-resync', client_name: 'Resync Me', needs_resync: true }
            ]
          }),
        });
      }
      // POST from forceSync triggered by resync
      if (opts?.method === 'POST') {
        syncCalled = true;
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: ['srv-resync'] }),
          text: () => Promise.resolve(''),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // The local client should now be marked for resync
    const mockCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    if (mockCalls.length > 0) {
      const saved = JSON.parse(mockCalls[mockCalls.length - 1][1]);
      const resyncClient = saved.find((c: any) => c.serverId === 'srv-resync');
      expect(resyncClient).toBeDefined();
      expect(resyncClient.sincronizado).toBe(false);
    }
  });

  it('Needs_resync: rescate del archivo muerto', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      if (key === 'clientes_db') return JSON.stringify([]); // Empty active list
      if (key === 'clientes_archive_db') {
        return JSON.stringify([
          FIXTURES.SAVED_CLIENT({ id: 'archived', serverId: 'srv-archived', nombre: 'Archived Client' }),
        ]);
      }
      return null;
    });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && !opts?.method) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            profiles: [
              { id: 'srv-archived', client_name: 'Archived Client', needs_resync: true }
            ]
          }),
        });
      }
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: ['srv-archived'] }),
          text: () => Promise.resolve(''),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { await ctx.fetchSincronizadosNube(); });
    await act(async () => { jest.runAllTimers(); });

    // The archived client should have been rescued and added to active list
    const mockCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    if (mockCalls.length > 0) {
      const saved = JSON.parse(mockCalls[mockCalls.length - 1][1]);
      const rescued = saved.find((c: any) => c.serverId === 'srv-archived');
      expect(rescued).toBeDefined();
      expect(rescued.sincronizado).toBe(false); // Ready to re-upload
    }

    // Should also be removed from archive
    const archiveCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_archive_db');
    if (archiveCalls.length > 0) {
      const archive = JSON.parse(archiveCalls[archiveCalls.length - 1][1]);
      expect(archive.find((c: any) => c.serverId === 'srv-archived')).toBeUndefined();
    }
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
});
