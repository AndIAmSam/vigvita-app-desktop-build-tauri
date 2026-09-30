/**
 * Integration Test: Backup & Restore (importarRespaldo)
 * 
 * Tests importing JSON backup files: invalid JSON handling,
 * schema validation, client merging, deduplication, and persistence.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';

describe('Backup and Restore Operations (importarRespaldo)', () => {
  let ctx: ReturnType<typeof useFinancialData>;

  const TestConsumer = () => {
    ctx = useFinancialData();
    return null;
  };

  beforeEach(() => {
    (global as any).__clearTestStorage();
    jest.clearAllMocks();
  });

  it('Rechaza archivos con sintaxis JSON inválida o corrupta', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo('{ corrupt json: true, ');
    });

    expect(result.success).toBe(false);
    expect(result.msg).toContain('no es un JSON válido');

    root.unmount();
  });

  it('Rechaza JSON que no sea un Array', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo(JSON.stringify({ singleClient: true }));
    });

    expect(result.success).toBe(false);
    expect(result.msg).toContain('debe ser una lista de clientes');

    root.unmount();
  });

  it('Rechaza listas vacías o sin clientes válidos (deben tener id y nombre)', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo(JSON.stringify([
        { invalidField: 123 },
        { id: 'solo-id-sin-nombre' }
      ]));
    });

    expect(result.success).toBe(false);
    expect(result.msg).toContain('vacío o no contenía clientes reconocibles');

    root.unmount();
  });

  it('Importa y fusiona prospectos válidos, actualizando storage y marcando sincronización pendiente', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    // 1. Crear un cliente existente en la lista local
    act(() => {
      ctx.setNombreCliente('Cliente Existente');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });

    const existingId = ctx.listaClientes[0].id;

    // 2. Preparar respaldo que actualiza el cliente existente y agrega uno nuevo
    const backupData = [
      {
        id: existingId,
        nombre: 'Cliente Existente Actualizado',
        sincronizado: false,
        data: { perfil: { telefono: '555-999-0000' } }
      },
      {
        id: 'new-client-from-backup',
        nombre: 'Cliente Nuevo Importado',
        sincronizado: false,
        data: {}
      }
    ];

    let result: any;
    await act(async () => {
      result = await ctx.importarRespaldo(JSON.stringify(backupData));
    });

    expect(result.success).toBe(true);
    expect(result.agregados).toBe(1); // 1 nuevo agregado, 1 existente actualizado
    expect(ctx.listaClientes).toHaveLength(2);

    const updated = ctx.listaClientes.find(c => c.id === existingId);
    expect(updated?.nombre).toBe('Cliente Existente Actualizado');

    const added = ctx.listaClientes.find(c => c.id === 'new-client-from-backup');
    expect(added?.nombre).toBe('Cliente Nuevo Importado');

    expect(ctx.syncStatus).toBe('pending');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('clientes_db', expect.any(String));

    root.unmount();
  });
});
