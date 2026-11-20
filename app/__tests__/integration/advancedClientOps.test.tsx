/**
 * Integration Test: Advanced Client Operations
 * 
 * Tests accompaniment updating (local & cloud rematerialization),
 * status updating (en_espera, descartado, cierre),
 * client deletion (local, cloud DELETE, 401 logout, offline catch),
 * form reset (nuevoAnalisis), and offline simulation toggle.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';

describe('Advanced Client Operations', () => {
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

  it('actualizarAcompanamiento actualiza prospecto local y rematerializa si es solo-nube', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    // 1. Caso local: Crear y guardar cliente
    act(() => {
      ctx.setNombreCliente('Prospecto Acompañado');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    const localId = ctx.listaClientes[0].id;
    await act(async () => {
      await ctx.actualizarAcompanamiento(localId, 'demonstration');
    });

    expect(ctx.listaClientes[0].accompanimentStatus).toBe('demonstration');
    expect(ctx.listaClientes[0].sincronizado).toBe(false);

    // 2. Caso solo-nube: Rematerializar cliente desde listaNube
    const cloudOnlyClient = {
      id: 'cloud-acc-uuid',
      serverId: 'server-acc-uuid',
      nombre: 'Prospecto Nube Acompañado',
      sincronizado: true,
      accompanimentStatus: 'unaccompanied' as const,
      data: { perfil: { telefono: '123' } },
    };

    // Simulamos que listaNube tiene este cliente
    (ctx as any).listaNube.push(cloudOnlyClient);

    await act(async () => {
      await ctx.actualizarAcompanamiento('cloud-acc-uuid', 'observation');
    });

    const rematerialized = ctx.listaClientes.find(c => c.id === 'cloud-acc-uuid');
    expect(rematerialized).toBeDefined();
    expect(rematerialized?.accompanimentStatus).toBe('observation');

    root.unmount();
  });

  it('actualizarEstadoProspecto actualiza estatus de adquisición y pólizas de cierre', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    act(() => {
      ctx.setNombreCliente('Prospecto Cierre');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    const localId = ctx.listaClientes[0].id;

    // Cambiar a cierre con pólizas
    await act(async () => {
      await ctx.actualizarEstadoProspecto(localId, 'cierre', ['Orvi 99', 'Segubeca']);
    });

    expect(ctx.listaClientes[0].estatusAdquisicion).toBe('cierre');
    expect(ctx.listaClientes[0].estatusCierre).toBe(true);
    expect(ctx.listaClientes[0].tiposCierre).toEqual(['Orvi 99', 'Segubeca']);
    expect(ctx.listaClientes[0].tipoCierre).toBe('Orvi 99');

    // Cambiar a descartado
    await act(async () => {
      await ctx.actualizarEstadoProspecto(localId, 'descartado', []);
    });

    expect(ctx.listaClientes[0].estatusAdquisicion).toBe('descartado');
    expect(ctx.listaClientes[0].estatusCierre).toBe(false);

    root.unmount();
  });

  it('borrarCliente elimina cliente local y llama a nuevoAnalisis si era el activo', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    act(() => {
      ctx.setNombreCliente('Prospecto A Borrar');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    const clientId = ctx.listaClientes[0].id;
    expect(ctx.currentClientId).toBe(clientId);

    await act(async () => {
      await ctx.borrarCliente(clientId);
    });

    expect(ctx.listaClientes.find(c => c.id === clientId)).toBeUndefined();
    expect(ctx.currentClientId).toBeNull();
    expect(ctx.nombreCliente).toBe('');

    root.unmount();
  });

  it('borrarCliente ejecuta DELETE en servidor cuando existe serverId', async () => {
    let deleteUrl = '';
    (global.fetch as jest.Mock).mockImplementation(async (url: string, opts: any) => {
      if (opts?.method === 'DELETE') {
        deleteUrl = url;
        return { status: 200, ok: true, json: async () => ({ success: true }) };
      }
      return { status: 200, ok: true, json: async () => ({ success: true }) };
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
      await ctx.bypassLoginForDev('asesor');
    });

    // Insertamos cliente que ya tiene serverId
    const clientWithServerId = {
      id: 'local-id-123',
      serverId: 'srv-uuid-999',
      nombre: 'Prospecto Con Server ID',
      sincronizado: true,
      data: {},
    };
    (ctx as any).listaClientes.push(clientWithServerId);

    await act(async () => {
      await ctx.borrarCliente('local-id-123');
    });

    expect(deleteUrl).toContain('/api/profiles/srv-uuid-999');
    expect(ctx.listaClientes.find(c => c.id === 'local-id-123')).toBeUndefined();

    root.unmount();
  });

  it('nuevoAnalisis resetea campos de formulario y elimina draft_prospect_v1', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    act(() => {
      ctx.setNombreCliente('Borrador Temporal');
      ctx.updateJubilacion('edadRetiro', '65');
      ctx.updateNotas('Notas temporales');
    });

    await act(async () => {
      ctx.nuevoAnalisis(true);
    });

    expect(ctx.nombreCliente).toBe('');
    expect(ctx.jubilacion.edadRetiro).toBe('');
    expect(ctx.notas).toBe('');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('draft_prospect_v1');

    root.unmount();
  });

  it('toggleOnlineSimulation conmuta el estado de red simulado', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    const initialOnline = ctx.isOnline;
    act(() => {
      ctx.toggleOnlineSimulation();
    });
    expect(ctx.isOnline).toBe(!initialOnline);

    act(() => {
      ctx.toggleOnlineSimulation();
    });
    expect(ctx.isOnline).toBe(initialOnline);

    root.unmount();
  });

  it('actualizarEstadoProspecto y actualizarAcompanamiento en perfil solo-nube descargan detalle completo para NO borrar datos del servidor', async () => {
    const cloudUuid = '44444444-4444-4444-8444-444444444444';
    const capturedPosts: any[] = [];
    const mockStorage = require('@react-native-async-storage/async-storage');
    await mockStorage.setItem(
      'advisor_session',
      JSON.stringify({
        user: {
          id: 'ADV-REAL',
          nombre: 'Asesor Real',
          email: 'real@vigvita.com',
          token: 'real-tok',
          training: false,
          isLider: false,
        },
        loginTime: Date.now(),
        sessionVersion: 2,
      })
    );

    global.fetch = jest.fn(async (url: string, opts?: any) => {
      if (url.includes('/api/profiles') && !url.includes('/api/profiles/') && opts?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            profiles: [
              {
                id: cloudUuid,
                client_name: 'Cliente Nube Solo Resumen',
                status: 'pending',
                accompaniment_status: 'unaccompanied',
                created_at: '2026-04-22T00:00:00Z',
                referrals: [],
              },
            ],
          }),
        };
      }
      if (url.includes(`/api/profiles/${cloudUuid}`) && opts?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: cloudUuid,
            client_name: 'Cliente Nube Solo Resumen',
            data: {
              profile: { phone: '5511223344', occupation: 'Médico' },
              assets: { savings: 900000 },
              notes: 'Datos valiosos que NO deben borrarse',
            },
          }),
        };
      }
      if (url.includes('/api/profiles/new') && opts?.method === 'POST') {
        capturedPosts.push(JSON.parse(opts.body));
        return { ok: true, status: 201, json: async () => ({ data: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ access_expires_at: null }) };
    }) as jest.Mock;

    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    await act(async () => {
      await ctx.fetchSincronizadosNube();
    });
    expect(ctx.listaNube).toHaveLength(1);
    expect(ctx.listaNube[0].data.perfil).toBeUndefined(); // Solo resumen inicialmente

    // Cambiar estado desde el tablero SIN haber abierto el prospecto
    await act(async () => {
      await ctx.actualizarEstadoProspecto(cloudUuid, 'cierre', ['Vida']);
    });

    expect(capturedPosts.length).toBeGreaterThan(0);
    const sent = capturedPosts[0].clients[0];
    expect(sent.id).toBe(cloudUuid);
    expect(sent.acquisition_status).toBe('completed');
    // CRÍTICO: los datos completos del perfil sobrevivieron intactos
    expect(sent.data.profile.phone).toBe('5511223344');
    expect(sent.data.profile.occupation).toBe('Médico');
    expect(sent.data.assets.savings).toBe(900000);
    expect(sent.data.notes).toBe('Datos valiosos que NO deben borrarse');

    root.unmount();
  });
});
