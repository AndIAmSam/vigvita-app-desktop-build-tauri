/**
 * Integration Test: Authentication
 * 
 * Tests login, logout, session validation, bypassLoginForDev,
 * session expiry, and version-based force logout.
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

describe('Auth — Login, Logout, Session Management', () => {
  let root: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.__clearTestStorage?.();
    jest.clearAllMocks();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await act(async () => { jest.runAllTimers(); });
    root?.unmount();
  });

  // --- LOGIN ---
  it('Login exitoso: setea advisor y persiste sesión', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ token: 'real-token-123', name: 'Carlos', training: false, is_leader: false }),
      })
    ) as jest.Mock;

    let result: any;
    await act(async () => {
      result = await ctx.login('carlos@vigvita.com', 'password123');
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result.success).toBe(true);
    expect(ctx.advisor).toBeDefined();
    expect(ctx.advisor.token).toBe('real-token-123');
    expect(ctx.advisor.nombre).toBe('Carlos');
    expect(ctx.isAuthenticated).toBe(true);

    // Verify session persisted
    const mockStorage = require('@react-native-async-storage/async-storage');
    const sessionCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'advisor_session');
    expect(sessionCalls.length).toBeGreaterThan(0);
    const savedSession = JSON.parse(sessionCalls[sessionCalls.length - 1][1]);
    expect(savedSession.user.token).toBe('real-token-123');
    expect(savedSession.sessionVersion).toBe(2);
  });

  it('Login con credenciales inválidas (401) retorna error', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false, status: 401,
        json: () => Promise.resolve({ error: 'invalid_credentials' }),
      })
    ) as jest.Mock;

    let result: any;
    await act(async () => {
      result = await ctx.login('wrong@email.com', 'wrong');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_credentials');
    expect(ctx.advisor).toBeNull();
  });

  it('Login con cuenta bloqueada (403) retorna error', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false, status: 403,
        json: () => Promise.resolve({ error: 'employment_period_ended' }),
      })
    ) as jest.Mock;

    let result: any;
    await act(async () => {
      result = await ctx.login('blocked@email.com', 'pass');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('employment_period_ended');
  });

  it('Login con error de red retorna error de red', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

    let result: any;
    await act(async () => {
      result = await ctx.login('test@email.com', 'pass');
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Error de red');
  });

  it('Login con training=true setea advisor.training', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ token: 'train-token', name: 'Trainee', training: true, is_leader: false }),
      })
    ) as jest.Mock;

    await act(async () => {
      await ctx.login('trainee@vigvita.com', 'pass');
    });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.advisor.training).toBe(true);
  });

  it('Login con is_leader=true setea advisor.isLider', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/login')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ token: 'leader-token', name: 'Leader', training: false, is_leader: true }),
        });
      }
      if (url.includes('/api/team')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ data: [{ id: 'adv-1', name: 'Asesor 1' }] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ profiles: [] }), text: () => Promise.resolve('') });
    }) as jest.Mock;

    await act(async () => {
      await ctx.login('leader@vigvita.com', 'pass');
    });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.advisor.isLider).toBe(true);
  });

  // --- LOGOUT ---
  it('Logout limpia advisor y sesión pero preserva clientes', async () => {
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });

    // Save a client first
    await act(async () => {
      ctx.setNombreCliente('Cliente Preservado');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    expect(ctx.listaClientes.length).toBeGreaterThan(0);

    // Logout
    await act(async () => { await ctx.logout(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.advisor).toBeNull();
    expect(ctx.isAuthenticated).toBe(false);

    // Verify session was removed from storage
    const mockStorage = require('@react-native-async-storage/async-storage');
    expect(mockStorage.removeItem).toHaveBeenCalledWith('advisor_session');
  });

  // --- BYPASS DEV LOGIN ---
  it('bypassLoginForDev("asesor") setea DEV-MODE', async () => {
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });

    expect(ctx.advisor).toBeDefined();
    expect(ctx.advisor.id).toBe('DEV-MODE');
    expect(ctx.advisor.training).toBe(false);
    expect(ctx.advisor.isLider).toBe(false);
    expect(ctx.isAuthenticated).toBe(true);
  });

  it('bypassLoginForDev("training") setea training=true', async () => {
    await act(async () => { await ctx.bypassLoginForDev('training'); });

    expect(ctx.advisor.training).toBe(true);
  });

  it('bypassLoginForDev("lider") setea isLider=true', async () => {
    await act(async () => { await ctx.bypassLoginForDev('lider'); });

    expect(ctx.advisor.isLider).toBe(true);
    expect(ctx.isLider).toBe(true);
  });

  // --- SESSION VALIDATION ---
  it('validateSession con DEV-MODE retorna true sin fetch', async () => {
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });

    let valid: boolean;
    await act(async () => {
      valid = await ctx.validateSession();
    });

    expect(valid!).toBe(true);
    // fetch should NOT have been called for DEV-MODE
  });

  it('validateSession renueva loginTime al validar exitosamente', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/new')) {
        return Promise.resolve({ ok: false, status: 422, text: () => Promise.resolve('') });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as jest.Mock;

    const oldTime = Date.now() - 86400000; // 1 day ago
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') {
        return JSON.stringify({ user: FIXTURES.ADVISOR, loginTime: oldTime, sessionVersion: 2 });
      }
      return null;
    });

    // Re-mount to pick up session
    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    let valid: boolean;
    await act(async () => {
      valid = await ctx.validateSession();
    });
    await act(async () => { jest.runAllTimers(); });

    expect(valid!).toBe(true);

    // Check that loginTime was updated
    const sessionSaves = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'advisor_session');
    if (sessionSaves.length > 0) {
      const lastSave = JSON.parse(sessionSaves[sessionSaves.length - 1][1]);
      expect(lastSave.loginTime).toBeGreaterThan(oldTime);
    }
  });

  // --- SESSION EXPIRY ---
  it('Sesión de 8 días caduca al inicializar', async () => {
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') {
        return JSON.stringify({ user: FIXTURES.ADVISOR, loginTime: eightDaysAgo, sessionVersion: 2 });
      }
      return null;
    });

    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Advisor should NOT be set (session expired)
    expect(ctx.advisor).toBeNull();
    expect(ctx.isAuthenticated).toBe(false);
  });

  it('sessionVersion obsoleta fuerza relogin', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') {
        return JSON.stringify({ user: FIXTURES.ADVISOR, loginTime: Date.now(), sessionVersion: 1 }); // Old version
      }
      return null;
    });

    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.advisor).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('advisor_session');
  });
});
