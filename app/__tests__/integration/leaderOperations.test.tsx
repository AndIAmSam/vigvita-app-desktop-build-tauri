/**
 * Integration Test: Team Leader Operations & Assignment
 * 
 * Tests leader verification, team fetching from /api/team,
 * selecting team members, and attaching assigned advisors to clients and sync payloads.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';

describe('Team Leader Operations', () => {
  let ctx: ReturnType<typeof useFinancialData>;
  let originalFetch: typeof global.fetch;

  const TestConsumer = () => {
    ctx = useFinancialData();
    return null;
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    global.__clearTestStorage?.();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Verifica líder en DEV-MODE y puebla equipoLider simulado', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.bypassLoginForDev('lider');
    });

    expect(ctx.isLider).toBe(true);
    expect(ctx.equipoLider.length).toBeGreaterThan(0);
    expect(ctx.equipoLider[0].nombre).toContain('Mock Asesor Dev');

    root.unmount();
  });

  it('Obtiene asesores elegibles vía GET /api/profile-advisors (API v16) cuando es líder/SuperAdmin', async () => {
    const mockAdvisors = [
      { id: '11111111-1111-4111-8111-111111111111', name: 'Carlos Slim' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Laura Martínez' },
    ];

    const requestedUrls: string[] = [];
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      requestedUrls.push(url);
      if (url.includes('/api/login')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            token: 'real-leader-token',
            is_leader: true,
            name: 'Líder General',
          }),
        };
      }
      if (url.includes('/api/profile-advisors')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ advisors: mockAdvisors }),
        };
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ access_expires_at: null, profiles: [] }),
      };
    });

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    // Simulamos login de líder vía ctx.login
    await act(async () => {
      await ctx.login('leader@vigvita.com', 'password123');
    });

    await act(async () => {
      await ctx.verificarLider();
    });

    expect(requestedUrls.some((u) => u.includes('/api/profile-advisors'))).toBe(true);
    expect(requestedUrls.some((u) => u.includes('/api/team'))).toBe(false);
    expect(ctx.isLider).toBe(true);
    expect(ctx.equipoLider).toHaveLength(2);
    expect(ctx.equipoLider[0]).toEqual({ id: '11111111-1111-4111-8111-111111111111', nombre: 'Carlos Slim' });
    expect(ctx.equipoLider[1]).toEqual({ id: '22222222-2222-4222-8222-222222222222', nombre: 'Laura Martínez' });

    root.unmount();
  });

  it('Fallo transitorio (500) en /api/profile-advisors conserva la lista de asesores ya cargada', async () => {
    let failAdvisors = false;
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/login')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ token: 'superadmin-token', is_leader: true, name: 'SuperAdmin' }),
        };
      }
      if (url.includes('/api/profile-advisors')) {
        if (failAdvisors) {
          return { status: 500, ok: false, text: async () => 'Internal server error' };
        }
        return {
          status: 200,
          ok: true,
          json: async () => ({
            advisors: [{ id: '33333333-3333-4333-8333-333333333333', name: 'Asesor Activo' }],
          }),
        };
      }
      return { status: 200, ok: true, json: async () => ({ access_expires_at: null, profiles: [] }) };
    });

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.login('admin@vigvita.com', 'password123');
    });
    await act(async () => {
      await ctx.verificarLider();
    });
    expect(ctx.equipoLider).toHaveLength(1);

    failAdvisors = true;
    await act(async () => {
      await ctx.verificarLider();
    });
    expect(ctx.equipoLider).toHaveLength(1);
    expect(ctx.equipoLider[0].nombre).toBe('Asesor Activo');

    root.unmount();
  });

  it('Advisor_Trainee nunca llama a /api/profile-advisors', async () => {
    const requestedUrls: string[] = [];
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      requestedUrls.push(url);
      if (url.includes('/api/login')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ token: 'train-token', training: true, is_leader: false, name: 'Trainee' }),
        };
      }
      return { status: 200, ok: true, json: async () => ({ access_expires_at: null }) };
    });

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.login('trainee@vigvita.com', 'password123');
    });
    await act(async () => {
      await ctx.verificarLider();
    });

    expect(requestedUrls.some((u) => u.includes('/api/profile-advisors'))).toBe(false);
    expect(ctx.isLider).toBe(false);
    expect(ctx.equipoLider).toEqual([]);

    root.unmount();
  });

  it('Asesor regular NO tiene acceso a líder ni equipoLider', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.bypassLoginForDev('asesor');
    });

    expect(ctx.isLider).toBe(false);
    expect(ctx.equipoLider).toEqual([]);

    root.unmount();
  });

  it('Permite al líder asignar un asesor global y asociarlo al prospecto guardado', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.bypassLoginForDev('lider');
    });

    const asesorAsignado = { id: 'adv-101', nombre: 'Laura Martínez' };
    act(() => {
      ctx.setAsesorSeleccionadoGlobal(asesorAsignado);
      ctx.setNombreCliente('Prospecto Asignado Por Líder');
    });

    await act(async () => {
      await ctx.guardarProspecto();
    });

    expect(ctx.listaClientes.length).toBe(1);
    expect(ctx.listaClientes[0].asesorAsignado).toEqual(asesorAsignado);

    root.unmount();
  });

  it('Excepción SuperAdmin v16: preserva advisor_id desde caché local al re-guardar ADN de asesor cuyo acceso ya expiró', async () => {
    const expiredAdvisorUuid = '12345678-1234-4123-8123-123456789012';
    const profileUuid = 'aaaaaaaa-1111-4222-8333-bbbbbbbbbbbb';
    const mockStorage = require('@react-native-async-storage/async-storage');

    // Simular que previamente el SuperAdmin ya vio ese ADN guardado con ese advisor_id
    await mockStorage.setItem(
      'adn_advisor_map',
      JSON.stringify({
        [profileUuid]: { id: expiredAdvisorUuid, nombre: 'Asesor Expirado' },
      })
    );

    let capturedPostPayload: any = null;
    (global.fetch as jest.Mock).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes('/api/login')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ token: 'superadmin-tok', is_leader: true, name: 'SuperAdmin' }),
        };
      }
      if (url.includes('/api/profile-advisors')) {
        // El asesor expirado YA NO aparece en /api/profile-advisors
        return { status: 200, ok: true, json: async () => ({ advisors: [] }) };
      }
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && (!opts?.method || opts.method === 'GET')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            profiles: [
              {
                id: profileUuid,
                client_name: 'Cliente Histórico',
                status: 'pending',
                created_at: '2026-04-22T00:00:00Z',
                relationship: { created_for: 'Asesor Expirado' },
              },
            ],
          }),
        };
      }
      if (url.includes(`/api/profiles/${profileUuid}`) && opts?.method === 'GET') {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            id: profileUuid,
            client_name: 'Cliente Histórico',
            status: 'pending',
            data: { profile: { phone: '5550001111' } },
          }),
        };
      }
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        capturedPostPayload = JSON.parse(opts.body);
        return { status: 201, ok: true, json: async () => ({ data: [] }) };
      }
      return { status: 200, ok: true, json: async () => ({ access_expires_at: null }) };
    });

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.login('superadmin@vigvita.com', 'password123');
    });
    await act(async () => {
      await ctx.fetchSincronizadosNube();
    });

    const cloudProfile = ctx.listaNube.find((c) => c.serverId === profileUuid);
    expect(cloudProfile).toBeDefined();
    expect(cloudProfile?.asesorAsignado?.id).toBe(expiredAdvisorUuid);

    await act(async () => {
      await ctx.cargarProspecto(cloudProfile!);
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    expect(capturedPostPayload).toBeDefined();
    expect(capturedPostPayload.clients[0].id).toBe(profileUuid);
    expect(capturedPostPayload.clients[0].advisor_id).toBe(expiredAdvisorUuid);

    root.unmount();
  });

  it('actualizarAsesorProspecto permite reasignar o quitar asesor en ADN local pendiente y sincroniza', async () => {
    const oldAdvisor = { id: 'aaaaaaaa-1111-4111-8111-111111111111', nombre: 'Asesor Bloqueado' };
    const newAdvisor = { id: 'bbbbbbbb-2222-4222-8222-222222222222', nombre: 'Asesor Válido' };
    const sentPayloads: any[] = [];

    (global.fetch as jest.Mock).mockImplementation(async (url: string, opts?: any) => {
      if (url.includes('/api/login')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ token: 'leader-tok', is_leader: true, name: 'Líder' }),
        };
      }
      if (url.includes('/api/profile-advisors')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ advisors: [{ id: newAdvisor.id, name: newAdvisor.nombre }] }),
        };
      }
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        const parsed = JSON.parse(opts.body);
        sentPayloads.push(parsed);
        const aid = parsed.clients[0].advisor_id;
        if (aid === oldAdvisor.id) {
          return {
            status: 403,
            ok: false,
            headers: new Map([['content-type', 'application/json']]),
            text: async () => JSON.stringify({ error: 'not_authorized_for_advisor' }),
            json: async () => ({ error: 'not_authorized_for_advisor' }),
          };
        }
        return {
          status: 201,
          ok: true,
          json: async () => ({ data: ['cccccccc-3333-4333-8333-333333333333'] }),
        };
      }
      if (url.includes('cccccccc-3333-4333-8333-333333333333')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ data: { profile: { phone: '' }, priority_levels: [{}, {}, {}, {}], referrals: [], children: [] } }),
        };
      }
      return { status: 200, ok: true, json: async () => ({ profiles: [], access_expires_at: null }) };
    });

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.login('lider@vigvita.com', 'pass');
    });

    act(() => {
      ctx.setAsesorSeleccionadoGlobal(oldAdvisor);
      ctx.setNombreCliente('ADN Atascado');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    // Falló con 403 → sigue en local sin sincronizar
    const stuck = ctx.listaClientes.find((c) => c.nombre === 'ADN Atascado');
    expect(stuck).toBeDefined();
    expect(stuck?.sincronizado).toBe(false);

    // Ahora quitamos el asesor asignado (asignar a sí mismo) → debe re-sincronizar sin advisor_id
    await act(async () => {
      await ctx.actualizarAsesorProspecto(stuck!.id, null);
    });
    await act(async () => { jest.runAllTimers(); });

    const lastPayload = sentPayloads[sentPayloads.length - 1];
    expect(lastPayload.clients[0].advisor_id).toBeUndefined();
    expect(ctx.listaClientes.find((c) => c.nombre === 'ADN Atascado')).toBeUndefined();

    root.unmount();
  });
});
