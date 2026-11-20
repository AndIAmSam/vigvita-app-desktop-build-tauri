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
    // Clients should have been unconditionally removed from local storage
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    expect(dbCalls.length).toBeGreaterThan(0);
    const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
    expect(lastSave.find((c: any) => c.nombre === 'Exitoso 1')).toBeUndefined();
    expect(lastSave.find((c: any) => c.nombre === 'Exitoso 2')).toBeUndefined();
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

    // 'Bueno' should be removed, 'Malo' should be retained (unconditional assertion)
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    expect(dbCalls.length).toBeGreaterThan(0);
    const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
    expect(lastSave.find((c: any) => c.nombre === 'Bueno')).toBeUndefined();
    expect(lastSave.find((c: any) => c.nombre === 'Malo')).toBeDefined();
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

    // Client should be retained with serverId assigned (unconditional assertion)
    const mockStorage = require('@react-native-async-storage/async-storage');
    const dbCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'clientes_db');
    expect(dbCalls.length).toBeGreaterThan(0);
    const lastSave = JSON.parse(dbCalls[dbCalls.length - 1][1]);
    const retained = lastSave.find((c: any) => c.nombre === 'Retenido');
    expect(retained).toBeDefined();
    expect(retained.serverId).toBe('uuid-retained');
  });

  // --- NUEVOS TESTS API DESKTOP v16 ---
  it('API v16 — 429 Too Many Requests hace backoff y reintenta exitosamente', async () => {
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT({ id: 'rl-1', nombre: 'Rate Limited' })]),
    });

    let postAttempts = 0;
    const validUuid = '11111111-2222-4333-8444-555555555555';
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        postAttempts++;
        if (postAttempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([['content-type', 'text/plain']]),
            text: () => Promise.resolve('Too Many Requests'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [validUuid] }),
          text: () => Promise.resolve(JSON.stringify({ data: [validUuid] })),
        });
      }
      if (url.includes(validUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }), text: () => Promise.resolve('') });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(postAttempts).toBe(2);
    expect(result!).toContain('exitosa');
  });

  it('API v16 — 403 not_authorized_for_advisor NO cierra sesión y aísla en Rescue Mode', async () => {
    const validAdvisorUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const invalidAdvisorUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const clients = [
      FIXTURES.PENDING_CLIENT({ id: 'c-ok', nombre: 'Valido', asesorAsignado: { id: validAdvisorUuid, nombre: 'Asesor OK' } }),
      FIXTURES.PENDING_CLIENT({ id: 'c-forbid', nombre: 'Prohibido', asesorAsignado: { id: invalidAdvisorUuid, nombre: 'Asesor No Autorizado' } }),
    ];

    root = await mountWithRealAdvisor({ 'clientes_db': JSON.stringify(clients) });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        const body = JSON.parse(opts.body);
        if (body.clients.length > 1 || body.clients[0].advisor_id === invalidAdvisorUuid) {
          return Promise.resolve({
            ok: false,
            status: 403,
            headers: new Map([['content-type', 'application/json']]),
            text: () => Promise.resolve(JSON.stringify({ error: 'not_authorized_for_advisor' })),
            json: () => Promise.resolve({ error: 'not_authorized_for_advisor' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: ['cccccccc-cccc-4ccc-8ccc-cccccccccccc'] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [], advisors: [] }) });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    // Sesión DEBE seguir activa (no logout en 403 de negocio)
    expect(ctx.advisor).not.toBeNull();
    expect(result!).toContain('parcial');
    expect(ctx.listaClientes.find((c: any) => c.nombre === 'Valido')).toBeUndefined();
    expect(ctx.listaClientes.find((c: any) => c.nombre === 'Prohibido')).toBeDefined();
  });

  it('API v16 — 404 JSON some_advisors_not_found NO hace logout; 404 text/plain SÍ hace logout', async () => {
    const missingAdvisorUuid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([
        FIXTURES.PENDING_CLIENT({ id: 'c-404-biz', nombre: 'Sin Asesor', asesorAsignado: { id: missingAdvisorUuid, nombre: 'Eliminado' } }),
      ]),
    });

    // 1. 404 application/json { error: "some_advisors_not_found" } -> NO logout
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: new Map([['content-type', 'application/json']]),
          text: () => Promise.resolve(JSON.stringify({ error: 'some_advisors_not_found' })),
          json: () => Promise.resolve({ error: 'some_advisors_not_found' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    await act(async () => { await ctx.forceSync(); });
    expect(ctx.advisor).not.toBeNull();

    // 2. 404 text/plain (auth failure) -> SÍ logout
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: new Map([['content-type', 'text/plain']]),
          text: () => Promise.resolve('Not Found'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'success' }) });
    }) as jest.Mock;

    let result: string;
    await act(async () => { result = await ctx.forceSync(); });
    expect(result!).toContain('Sesión Inválida');
    expect(ctx.advisor).toBeNull();
  });

  it('API v16 — 422 en batch > 1 activa Rescue Mode (soporta formato errors y tipo plano)', async () => {
    const clients = [
      FIXTURES.PENDING_CLIENT({ id: 'ok-422', nombre: 'Cliente Sano' }),
      FIXTURES.PENDING_CLIENT({ id: 'bad-422', nombre: 'Cliente Invalido' }),
    ];

    root = await mountWithRealAdvisor({ 'clientes_db': JSON.stringify(clients) });

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        const body = JSON.parse(opts.body);
        if (body.clients.length > 1) {
          return Promise.resolve({
            ok: false,
            status: 422,
            headers: new Map([['content-type', 'application/json']]),
            text: () => Promise.resolve(JSON.stringify({ errors: { 'clients[1].referrals[0].notes': 'too_long' } })),
          });
        }
        if (body.clients[0].name === 'Cliente Sano') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ data: ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'] }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 422,
          headers: new Map([['content-type', 'application/json']]),
          text: () => Promise.resolve(JSON.stringify({ notes: 'invalid' })),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    let result: string;
    await act(async () => { result = await ctx.forceSync(); });

    expect(result!).toContain('parcial');
    expect(ctx.listaClientes.find((c: any) => c.nombre === 'Cliente Sano')).toBeUndefined();
    expect(ctx.listaClientes.find((c: any) => c.nombre === 'Cliente Invalido')).toBeDefined();
  });

  it('API v16 — 201 con data: [] (update con UUID propio) y colisión UUID con reemplazo', async () => {
    const existingUuid = '12345678-1234-4123-8123-1234567890ab';
    const replacementUuid = '99999999-9999-4999-8999-999999999999';

    // 1. Update normal: servidor responde 201 { data: [] }
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([
        FIXTURES.PENDING_CLIENT({ id: 'upd-1', serverId: existingUuid, nombre: 'Actualizado' }),
      ]),
    });

    let capturedBody: any = null;
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (url.includes(existingUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    let res1: string;
    await act(async () => { res1 = await ctx.forceSync(); });
    expect(res1!).toContain('exitosa');
    expect(capturedBody.clients[0].id).toBe(existingUuid);
    expect(capturedBody.clients[0].is_closed).toBeUndefined();

    // 2. Colisión de UUID: enviamos existingUuid pero pertenece a otro asesor -> servidor devuelve [replacementUuid]
    root.unmount();
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([
        FIXTURES.PENDING_CLIENT({ id: 'col-1', serverId: existingUuid, nombre: 'Colisionado' }),
      ]),
    });

    const getUrls: string[] = [];
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [replacementUuid] }),
        });
      }
      getUrls.push(url);
      if (url.includes(replacementUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    let res2: string;
    await act(async () => { res2 = await ctx.forceSync(); });
    expect(res2!).toContain('exitosa');
    expect(getUrls.some((u) => u.includes(replacementUuid))).toBe(true);
  });

  it('API v16 — omite serverId malformado (no-UUID) y trunca nombre/notas por bytes UTF-8', async () => {
    const accentedName = 'José María '.repeat(12); // > 100 bytes UTF-8
    const accentedNote = 'Información útil con acentos ñ '.repeat(12); // > 255 bytes UTF-8

    const clientData = FIXTURES.FULL_CLIENT_DATA();
    clientData.referidos[0].notas = accentedNote;

    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([
        FIXTURES.PENDING_CLIENT({
          id: 'utf8-1',
          serverId: 'not-a-valid-uuid',
          nombre: accentedName,
          data: clientData,
        }),
      ]),
    });

    let sentPayload: any = null;
    const srvUuid = 'abcdef12-3456-4789-abcd-ef0123456789';
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        sentPayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [srvUuid] }),
        });
      }
      if (url.includes(srvUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    await act(async () => { await ctx.forceSync(); });

    expect(sentPayload).toBeDefined();
    expect(sentPayload.clients[0].id).toBeUndefined(); // serverId malformado omitido
    expect(Buffer.byteLength(sentPayload.clients[0].name, 'utf8')).toBeLessThanOrEqual(100);
    expect(Buffer.byteLength(sentPayload.clients[0].data.referrals[0].notes, 'utf8')).toBeLessThanOrEqual(255);
  });

  it('API v16 — batch mixto (1 update + 1 create) actualiza currentServerId con el UUID correcto', async () => {
    const existingUuid = '11111111-1111-4111-8111-111111111111';
    const createdUuid = '22222222-2222-4222-8222-222222222222';

    const clients = [
      FIXTURES.PENDING_CLIENT({ id: 'existing-local', serverId: existingUuid, nombre: 'Ya Existía' }),
      FIXTURES.PENDING_CLIENT({ id: 'new-local', serverId: undefined, nombre: 'Recién Creado' }),
    ];

    root = await mountWithRealAdvisor({ 'clientes_db': JSON.stringify(clients) });

    // Seleccionar el 2do cliente (el nuevo, índice 1) como el activo en pantalla
    await act(async () => {
      await ctx.cargarProspecto(clients[1]);
    });
    expect(ctx.currentClientId).toBe('new-local');
    expect(ctx.currentServerId).toBeNull();

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        // v16: el servidor solo devuelve el UUID del cliente nuevo (índice 0 de `data`, aunque era índice 1 de `clients`)
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [createdUuid] }),
        });
      }
      if (url.includes(existingUuid) || url.includes(createdUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    await act(async () => { await ctx.forceSync(); });

    // currentServerId DEBE apuntar al UUID recién generado (createdUuid), nunca undefined ni existingUuid
    expect(ctx.currentServerId).toBe(createdUuid);
  });

  it('Sin sesión (advisor === null): ni Cold Boot ni forceSync hacen POST /api/profiles/new', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'clientes_db') {
        return JSON.stringify([FIXTURES.PENDING_CLIENT({ id: 'unauth-1', nombre: 'Pendiente Sin Sesión' })]);
      }
      return null;
    });

    const postUrls: string[] = [];
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        postUrls.push(url);
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') });
    }) as jest.Mock;

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });

    expect(postUrls).toHaveLength(0);
    expect(result!).toContain('No hay sesión activa');
    expect(ctx.listaClientes.find((c: any) => c.id === 'unauth-1')).toBeDefined();
  });

  it('Sin deadlock tras fallo de auth (404 text/plain) y relogin: forceSync y auto-sync post-login funcionan', async () => {
    const validUuid = '12121212-3434-4567-89ab-cdef01234567';
    root = await mountWithRealAdvisor({
      'clientes_db': JSON.stringify([FIXTURES.PENDING_CLIENT({ id: 'dl-1', nombre: 'Post Relogin' })]),
    });

    // 1. Primera sincronización falla con 404 text/plain (auth revocada) → logout, pero NO debe bloquear isSyncingRef
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: new Map([['content-type', 'text/plain']]),
          text: () => Promise.resolve('Not Found'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'success' }) });
    }) as jest.Mock;

    await act(async () => { await ctx.forceSync(); });
    expect(ctx.advisor).toBeNull();

    // 2. Usuario vuelve a iniciar sesión → forceSync DEBE poder ejecutarse (sin deadlock de isSyncingRef)
    let postAfterRelogin = 0;
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/login')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ token: 'fresh-token-xyz', name: 'Diego', training: false, is_leader: true }),
        });
      }
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        postAfterRelogin++;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [validUuid] }),
        });
      }
      if (url.includes(validUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [], advisors: [], access_expires_at: null }) });
    }) as jest.Mock;

    await act(async () => {
      await ctx.login('diego@vigvita.com', 'secret');
    });

    let syncResult = '';
    await act(async () => {
      syncResult = await ctx.forceSync();
    });

    expect(syncResult).toContain('exitosa');
    expect(postAfterRelogin).toBe(1);
    expect(ctx.listaClientes.find((c: any) => c.id === 'dl-1')).toBeUndefined();
  });

  it('Auto-sync post-login programa sincronización automática al iniciar sesión con pendientes locales', async () => {
    const validUuid = '56565656-7878-4999-8aaa-bbbbbbbbbbbb';
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'clientes_db') {
        return JSON.stringify([FIXTURES.PENDING_CLIENT({ id: 'post-login-1', nombre: 'Pendiente Post Login' })]);
      }
      return null;
    });

    let postCount = 0;
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/login')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ token: 'post-login-tok', name: 'Diego', training: false, is_leader: false }),
        });
      }
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        postCount++;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: [validUuid] }),
        });
      }
      if (url.includes(validUuid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: JSON.stringify(FIXTURES.FULL_SERVER_DATA()) }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [], access_expires_at: null }) });
    }) as jest.Mock;

    const scheduledCallbacks: Array<() => void> = [];
    const origSetTimeout = global.setTimeout;
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any, delay?: any, ...args: any[]) => {
      if (delay === 3000) {
        scheduledCallbacks.push(() => fn(...args));
        return 999999 as any;
      }
      return origSetTimeout(fn, delay, ...args);
    }) as any);

    try {
      root = await mountProvider();
      // Al arrancar sin sesión NO debe haber programado el auto-sync de 3000ms ni enviado POST
      expect(scheduledCallbacks).toHaveLength(0);
      expect(postCount).toBe(0);

      await act(async () => {
        await ctx.login('diego@vigvita.com', 'secret');
      });

      // Al iniciar sesión SÍ debe haber programado el auto-sync de 3000ms
      expect(scheduledCallbacks.length).toBeGreaterThanOrEqual(1);

      // Ejecutar el callback programado y esperar resolución
      await act(async () => {
        scheduledCallbacks[scheduledCallbacks.length - 1]();
        await new Promise((r) => origSetTimeout(r, 50));
      });

      expect(postCount).toBe(1);
      expect(ctx.listaClientes.find((c: any) => c.id === 'post-login-1')).toBeUndefined();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it('Auto-reparación de advisor_id obsoleto tras 403: refresca /api/profile-advisors y reintenta con UUID vigente', async () => {
    const staleAdvisorUuid = '11111111-1111-4111-8111-111111111111';
    const freshAdvisorUuid = '22222222-2222-4222-8222-222222222222';
    const createdProfileUuid = '33333333-3333-4333-8333-333333333333';
    const leaderUser = { ...FIXTURES.ADVISOR, isLider: true };

    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION(leaderUser));
      if (key === 'clientes_db') {
        return JSON.stringify([
          FIXTURES.PENDING_CLIENT({
            id: 'heal-1',
            nombre: 'Fernando Self Heal',
            asesorAsignado: { id: staleAdvisorUuid, nombre: 'GABRIELA VELEZ' },
          }),
        ]);
      }
      return null;
    });

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    const sentAdvisorIds: string[] = [];
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (url.includes('/api/profile-advisors')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ advisors: [{ id: freshAdvisorUuid, name: 'GABRIELA VELEZ' }] }),
        });
      }
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        const body = JSON.parse(opts.body);
        const aid = body.clients[0].advisor_id;
        sentAdvisorIds.push(aid);
        if (aid === staleAdvisorUuid) {
          return Promise.resolve({
            ok: false,
            status: 403,
            headers: new Map([['content-type', 'application/json']]),
            text: () => Promise.resolve(JSON.stringify({ error: 'not_authorized_for_advisor' })),
            json: () => Promise.resolve({ error: 'not_authorized_for_advisor' }),
          });
        }
        if (aid === freshAdvisorUuid) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ data: [createdProfileUuid] }),
          });
        }
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }) });
    }) as jest.Mock;

    let result: string;
    await act(async () => {
      result = await ctx.forceSync();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(sentAdvisorIds).toEqual([staleAdvisorUuid, freshAdvisorUuid]);
    expect(result!).toContain('exitosa');
    expect(ctx.advisor).not.toBeNull();
    expect(ctx.listaClientes.find((c: any) => c.id === 'heal-1')).toBeUndefined();
  });
});
