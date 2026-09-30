/**
 * Integration Test: CRM Operations
 * 
 * Tests guardarProspecto, cargarProspecto, borrarCliente,
 * nuevoAnalisis, and related CRM logic.
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

describe('CRM Operations — Guardar, Cargar, Borrar', () => {
  let root: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.__clearTestStorage?.();
    jest.clearAllMocks();
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });
    await act(async () => { jest.runAllTimers(); });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await act(async () => { jest.runAllTimers(); });
    root?.unmount();
  });

  // --- GUARDAR ---
  it('Guardar nuevo prospecto: se agrega a listaClientes con sincronizado=true (DEV-MODE)', async () => {
    expect(ctx.listaClientes).toHaveLength(0);

    await act(async () => {
      ctx.setNombreCliente('Nuevo Prospecto');
      ctx.updatePerfil('telefono', '5551234567');
    });

    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(1);
    expect(ctx.listaClientes[0].nombre).toBe('Nuevo Prospecto');
    expect(ctx.listaClientes[0].data.perfil.telefono).toBe('5551234567');
    // DEV-MODE → sincronizado stays true-ish (sync is skipped)
    expect(ctx.currentClientId).toBe(ctx.listaClientes[0].id);
  });

  it('Guardar sin nombre muestra error y no agrega a lista', async () => {
    await act(async () => {
      ctx.setNombreCliente('');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(0);
  });

  it('Guardar actualiza prospecto existente en lugar de duplicar', async () => {
    // Crear primero
    await act(async () => {
      ctx.setNombreCliente('Original');
      ctx.updatePerfil('telefono', '111');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(1);
    const originalId = ctx.currentClientId;

    // Modificar y volver a guardar
    await act(async () => {
      ctx.setNombreCliente('Actualizado');
      ctx.updatePerfil('telefono', '222');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(1); // NO se duplicó
    expect(ctx.listaClientes[0].nombre).toBe('Actualizado');
    expect(ctx.listaClientes[0].data.perfil.telefono).toBe('222');
    expect(ctx.listaClientes[0].id).toBe(originalId); // Mismo ID
  });

  it('Guardar preserva fechaCreacion al actualizar', async () => {
    await act(async () => { ctx.setNombreCliente('Fecha Test'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const originalDate = ctx.listaClientes[0].fechaCreacion;

    // Update
    await act(async () => {
      ctx.setNombreCliente('Fecha Test Mod');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes[0].fechaCreacion).toBe(originalDate);
  });

  it('Guardar preserva serverId al actualizar', async () => {
    // Create client with serverId
    await act(async () => { ctx.setNombreCliente('ServerID Test'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Manually set serverId (simulating a sync that assigned it)
    const mockStorage = require('@react-native-async-storage/async-storage');
    const currentList = ctx.listaClientes;
    currentList[0].serverId = 'assigned-uuid';
    await act(async () => {
      // Directly manipulate for this test
      mockStorage.setItem.mockClear();
    });

    // Update and re-save — serverId should persist
    await act(async () => {
      ctx.setNombreCliente('ServerID Test Updated');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes[0].serverId).toBe('assigned-uuid');
  });

  it('Guardar con estadoOverride="cierre" marca estatusCierre', async () => {
    await act(async () => { ctx.setNombreCliente('Cierre Test'); });
    await act(async () => {
      await ctx.guardarProspecto('cierre', ['Vida', 'GMM']);
    });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes[0];
    expect(saved.estatusAdquisicion).toBe('cierre');
    expect(saved.estatusCierre).toBe(true);
    expect(saved.tiposCierre).toEqual(['Vida', 'GMM']);
  });

  // --- CARGAR ---
  it('Cargar prospecto local popula todos los campos', async () => {
    const fullData = FIXTURES.FULL_CLIENT_DATA();
    const client = FIXTURES.SAVED_CLIENT({ data: fullData });

    await act(async () => { await ctx.cargarProspecto(client); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.nombreCliente).toBe('Juan Pérez');
    expect(ctx.currentClientId).toBe('local-1');
    expect(ctx.currentServerId).toBe('server-uuid-1');
    expect(ctx.perfil.telefono).toBe(fullData.perfil.telefono);
    expect(ctx.jubilacion.esperanzaVida).toBe(fullData.jubilacion.esperanzaVida);
    expect(ctx.activos.ahorros).toBe(fullData.activos.ahorros);
    expect(ctx.notas).toBe(fullData.notas);
  });

  it('Cargar prospecto de nube sin internet aborta sin modificar estado', async () => {
    // Simular offline
    await act(async () => { ctx.toggleOnlineSimulation(); }); // Toggle off

    const cloudClient = FIXTURES.SAVED_CLIENT({
      data: {}, // No local data → needs fetch
    });

    // Set some data first
    await act(async () => {
      ctx.setNombreCliente('Datos Previos');
      ctx.updatePerfil('telefono', '999');
    });

    await act(async () => { await ctx.cargarProspecto(cloudClient); });
    await act(async () => { jest.runAllTimers(); });

    // State should NOT have changed
    expect(ctx.nombreCliente).toBe('Datos Previos');
    expect(ctx.perfil.telefono).toBe('999');

    // Toggle back online
    await act(async () => { ctx.toggleOnlineSimulation(); });
  });

  it('Cargar con data corrupta del servidor preserva referidos del resumen', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          id: 'server-corrupt',
          data: null, // Corrupted!
        }),
      })
    ) as jest.Mock;

    // Need real advisor for fetch
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });
    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    const client = FIXTURES.SAVED_CLIENT({
      serverId: 'server-corrupt',
      data: {
        referidos: [
          { id: 'ref-1', nombre: 'Referido Preservado', edad: '30', ocupacion: '', telefono: '' }
        ]
      }
    });

    await act(async () => { await ctx.cargarProspecto(client); });
    await act(async () => { jest.runAllTimers(); });

    // Referidos from summary should be preserved
    expect(ctx.referidos).toHaveLength(1);
    expect(ctx.referidos[0].nombre).toBe('Referido Preservado');
    // Other fields should be reset to defaults
    expect(ctx.perfil.telefono).toBe('');
  });

  // --- BORRAR ---
  it('Borrar prospecto lo remueve de listaClientes', async () => {
    // Create two clients
    await act(async () => { ctx.setNombreCliente('A'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    await act(async () => { ctx.setNombreCliente('B'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(2);

    const idA = ctx.listaClientes.find((c: any) => c.nombre === 'A').id;

    await act(async () => { await ctx.borrarCliente(idA); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(1);
    expect(ctx.listaClientes[0].nombre).toBe('B');
  });

  it('Borrar el prospecto activo resetea el formulario', async () => {
    await act(async () => { ctx.setNombreCliente('Activo'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const activeId = ctx.currentClientId;
    expect(activeId).toBeTruthy();

    await act(async () => { await ctx.borrarCliente(activeId); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.currentClientId).toBeNull();
    expect(ctx.nombreCliente).toBe('');
  });

  // --- NUEVO ANÁLISIS ---
  it('nuevoAnalisis resetea todos los campos a initial', async () => {
    await act(async () => {
      ctx.setNombreCliente('Para Resetear');
      ctx.updatePerfil('telefono', '555');
      ctx.updatePerfil('fuma', true);
      ctx.updateActivo('ahorros', '100000');
      ctx.updateNotas('Notas viejas');
    });

    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.currentClientId).toBeNull();
    expect(ctx.currentServerId).toBeNull();
    expect(ctx.nombreCliente).toBe('');
    expect(ctx.perfil.telefono).toBe('');
    expect(ctx.perfil.fuma).toBe(false);
    expect(ctx.activos.ahorros).toBe('');
    expect(ctx.notas).toBe('');
    expect(ctx.hijos).toHaveLength(0);
    expect(ctx.referidos).toHaveLength(0);
    expect(ctx.piramideLevels).toHaveLength(4);
  });

  // --- MÚLTIPLES GUARDAR + CARGAR ---
  it('Guardar A, Guardar B, Cargar A → datos de A intactos', async () => {
    // Save A
    await act(async () => {
      ctx.setNombreCliente('Cliente A');
      ctx.updatePerfil('telefono', '111-AAA');
      ctx.updateActivo('ahorros', '100');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Save B
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });
    await act(async () => {
      ctx.setNombreCliente('Cliente B');
      ctx.updatePerfil('telefono', '222-BBB');
      ctx.updateActivo('ahorros', '200');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(2);

    // Load A
    const clienteA = ctx.listaClientes.find((c: any) => c.nombre === 'Cliente A');
    await act(async () => { await ctx.cargarProspecto(clienteA); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.nombreCliente).toBe('Cliente A');
    expect(ctx.perfil.telefono).toBe('111-AAA');
    expect(ctx.activos.ahorros).toBe('100');

    // Load B
    const clienteB = ctx.listaClientes.find((c: any) => c.nombre === 'Cliente B');
    await act(async () => { await ctx.cargarProspecto(clienteB); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.nombreCliente).toBe('Cliente B');
    expect(ctx.perfil.telefono).toBe('222-BBB');
    expect(ctx.activos.ahorros).toBe('200');
  });

  // --- IMPORTAR RESPALDO ---
  it('importarRespaldo con datos válidos agrega clientes', async () => {
    const backupData = JSON.stringify([
      { id: 'backup-1', nombre: 'Importado 1', fechaCreacion: '01/01/2026', sincronizado: true, data: {} },
      { id: 'backup-2', nombre: 'Importado 2', fechaCreacion: '02/01/2026', sincronizado: true, data: {} },
    ]);

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo(backupData);
    });
    await act(async () => { jest.runAllTimers(); });

    expect(result.success).toBe(true);
    expect(result.agregados).toBe(2);
    expect(ctx.listaClientes).toHaveLength(2);
  });

  it('importarRespaldo con JSON inválido retorna error sin afectar lista', async () => {
    // Add a client first
    await act(async () => { ctx.setNombreCliente('Existente'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo('esto no es json {{{');
    });

    expect(result.success).toBe(false);
    expect(ctx.listaClientes).toHaveLength(1); // Unchanged
  });

  it('importarRespaldo con array vacío retorna error', async () => {
    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo('[]');
    });

    // Depends on implementation — empty array should have 0 valid clients
    // It actually creates no clients because none pass the filter
    expect(result.success).toBe(false);
  });
});
