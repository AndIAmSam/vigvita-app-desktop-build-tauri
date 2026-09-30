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

  const TestConsumer = () => {
    ctx = useFinancialData();
    return null;
  };

  beforeEach(() => {
    (global as any).__clearTestStorage();
    jest.clearAllMocks();
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

  it('Obtiene miembros del equipo vía /api/team cuando el asesor es líder', async () => {
    const mockTeam = [
      { id: 'adv-101', name: 'Laura Martínez', email: 'laura@vigvita.com' },
      { id: 'adv-102', name: 'Carlos Slim', email: 'carlos@vigvita.com' },
    ];

    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
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
      if (url.includes('/api/team')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ data: mockTeam }),
        };
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ success: true }),
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

    expect(ctx.isLider).toBe(true);
    expect(ctx.equipoLider).toHaveLength(2);
    expect(ctx.equipoLider[0]).toEqual({ id: 'adv-101', nombre: 'Laura Martínez' });
    expect(ctx.equipoLider[1]).toEqual({ id: 'adv-102', nombre: 'Carlos Slim' });

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
});
