/**
 * Integration Test: Dependent & Family Sync, Calculations & Referrals
 * 
 * Tests reactive age calculation from birth date to retirement age,
 * automatic synchronization between interview dependents and education children,
 * university projections, referrals management, and pyramid reordering.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';

describe('Dependent & Family Sync, Calculations & Referrals', () => {
  let ctx: ReturnType<typeof useFinancialData>;

  const TestConsumer = () => {
    ctx = useFinancialData();
    return null;
  };

  beforeEach(() => {
    (global as any).__clearTestStorage();
    jest.clearAllMocks();
  });

  it('Calcula y sincroniza edad actual a jubilación automáticamente al ingresar fecha de nacimiento', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    // Simulamos fecha de nacimiento DD/MM/AAAA (ej. 30 años atrás)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 30;
    const birthDate = `15/06/${birthYear}`;

    await act(async () => {
      ctx.updatePerfil('fechaNacimiento', birthDate);
    });

    expect(ctx.jubilacion.edadActual).toBeTruthy();
    expect(parseInt(ctx.jubilacion.edadActual)).toBeGreaterThanOrEqual(29);
    expect(parseInt(ctx.jubilacion.edadActual)).toBeLessThanOrEqual(30);

    root.unmount();
  });

  it('Sincroniza dependientes con parentesco "Hijo" hacia la sección de educación con proyección universitaria', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    // 1. Agregar dependiente
    act(() => {
      ctx.addDependiente();
    });

    expect(ctx.perfil.dependientes.length).toBe(1);
    const depId = ctx.perfil.dependientes[0].id;

    // 2. Definir como hijo de 8 años
    await act(async () => {
      ctx.updateDependiente(depId, 'nombre', 'Mateo');
      ctx.updateDependiente(depId, 'parentesco', 'Hijo');
      ctx.updateDependiente(depId, 'edad', '8');
    });

    // Debe reflejarse en ctx.hijos automáticamente
    expect(ctx.hijos.length).toBe(1);
    expect(ctx.hijos[0].nombre).toBe('Mateo');
    expect(ctx.hijos[0].edad).toBe('8');
    expect(ctx.hijos[0].yearsFaltantes).toBe(10); // 18 - 8 = 10
    expect(ctx.hijos[0].costoProyectado).toBeGreaterThan(0);
    expect(ctx.hijos[0].ahorroAnual).toBeGreaterThan(0);

    // 3. Eliminar dependiente
    act(() => {
      ctx.removeDependiente(depId);
    });
    expect(ctx.perfil.dependientes.length).toBe(0);

    root.unmount();
  });

  it('Permite manipular hijos directamente (addHijo, updateHijoCompleto, removeHijo)', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    act(() => {
      ctx.addHijo();
    });
    expect(ctx.hijos.length).toBe(1);

    const hijoId = ctx.hijos[0].id;
    act(() => {
      ctx.updateHijoCompleto(0, {
        id: hijoId,
        nombre: 'Sofía',
        edad: '5',
        universidad: 'ITESM',
        yearsFaltantes: 13,
        costoProyectado: 1200000,
        ahorroAnual: 92307,
      });
    });

    expect(ctx.hijos[0].nombre).toBe('Sofía');
    expect(ctx.hijos[0].universidad).toBe('ITESM');

    act(() => {
      ctx.removeHijo(hijoId);
    });
    expect(ctx.hijos.length).toBe(0);

    root.unmount();
  });

  it('Gestiona lista de referidos (addReferido, updateReferido, removeReferido, upsertReferido)', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    act(() => {
      ctx.addReferido();
    });
    expect(ctx.referidos.length).toBe(1);

    const refId = ctx.referidos[0].id;
    act(() => {
      ctx.updateReferido(refId, 'nombre', 'Carlos Mendoza');
      ctx.updateReferido(refId, 'telefono', '555-123-4567');
      ctx.updateReferido(refId, 'calificacion', '4');
    });

    expect(ctx.referidos[0].nombre).toBe('Carlos Mendoza');
    expect(ctx.referidos[0].telefono).toBe('555-123-4567');

    // upsertReferido: actualizar existente
    act(() => {
      ctx.upsertReferido({
        id: refId,
        nombre: 'Carlos Mendoza Actualizado',
        telefono: '555-999-8888',
        edad: '35',
        ocupacion: 'Ingeniero',
        hijos: '2',
        calificacion: '5',
      });
    });
    expect(ctx.referidos[0].nombre).toBe('Carlos Mendoza Actualizado');

    // upsertReferido: agregar nuevo
    act(() => {
      ctx.upsertReferido({
        id: 'new-upserted-ref',
        nombre: 'Ana Beltrán',
        telefono: '555-000-1111',
        edad: '28',
        ocupacion: 'Doctora',
        hijos: '0',
        calificacion: '5',
      });
    });
    expect(ctx.referidos.length).toBe(2);

    // removeReferido
    act(() => {
      ctx.removeReferido(refId);
    });
    expect(ctx.referidos.length).toBe(1);
    expect(ctx.referidos[0].id).toBe('new-upserted-ref');

    root.unmount();
  });

  it('Actualiza orden de los niveles de la pirámide y dispara showAlert', async () => {
    let root: any;
    await act(async () => {
      root = renderer.create(
        <FinancialProvider>
          <TestConsumer />
        </FinancialProvider>
      );
    });

    const newOrder = [
      { id: 'pro', label: 'ESTILO DE VIDA' },
      { id: 'edu', label: 'EDUCACIÓN' },
      { id: 'aho', label: 'AHORRO' },
      { id: 'jub', label: 'JUBILACIÓN' },
    ];

    act(() => {
      ctx.updatePiramideOrder(newOrder);
      ctx.showAlert('Prueba de alerta global');
    });

    expect(ctx.piramideLevels[0].id).toBe('pro');
    expect(ctx.piramideLevels[3].id).toBe('jub');

    root.unmount();
  });
});
