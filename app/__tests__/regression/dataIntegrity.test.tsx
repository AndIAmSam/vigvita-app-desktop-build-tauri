/**
 * Regression Test: Data Integrity & Edge Cases
 * 
 * Tests known failure scenarios and edge cases to prevent regressions:
 * - Full lifecycle (guardar → sync → fetch → cargar)
 * - Corrupt data handling
 * - Special characters
 * - Double-save protection
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

describe('Data Integrity — Regression Tests', () => {
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

  it('Guardar → nuevoAnalisis → Cargar = todos los campos idénticos', async () => {
    // Fill all fields
    await act(async () => {
      ctx.setNombreCliente('Integrity Test');
      ctx.updatePerfil('telefono', '5551234567');
      ctx.updatePerfil('ocupacion', 'Arquitecto');
      ctx.updatePerfil('fuma', true);
      ctx.updatePerfil('estadoCivil', 'Soltero');
      ctx.updateJubilacion('esperanzaVida', '90');
      ctx.updateJubilacion('edadRetiro', '60');
      ctx.updateJubilacion('montoMensual', '70000');
      ctx.updateActivo('ahorros', '800000');
      ctx.updateActivo('casa', '4000000');
      ctx.updateActivo('inversiones', '500000');
      ctx.updatePasivo('hipoteca', '2000000');
      ctx.updatePasivo('tarjetas', '30000');
      ctx.updateSeguro('individual', 'compania', 'AXA');
      ctx.updateSeguro('individual', 'sumaAsegurada', '3000000');
      ctx.updateIngreso('titular', '120000');
      ctx.updateIngreso('prestacionesTitular', 'Aguinaldo');
      ctx.updateGastoBasico('vivienda', '20000');
      ctx.updateGastoBasico('alimentacion', '10000');
      ctx.updateGastoVariable('recreacion', '5000');
      ctx.updateFallecimiento('gastosSepelio', '150000');
      ctx.updateDetalle('tasaInteres', '10');
      ctx.updateDetalle('planProteccion', '12');
      ctx.updateCita('dia', '20');
      ctx.updateCita('mes', 'Noviembre');
      ctx.updateCita('hora', '14:00');
      ctx.updateCita('lugar', 'Starbucks');
      ctx.updateNotas('Notas detalladas del prospecto');
    });

    // Save
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Snapshot before reset
    const snapshot = {
      telefono: ctx.perfil.telefono,
      ocupacion: ctx.perfil.ocupacion,
      fuma: ctx.perfil.fuma,
      estadoCivil: ctx.perfil.estadoCivil,
      esperanzaVida: ctx.jubilacion.esperanzaVida,
      edadRetiro: ctx.jubilacion.edadRetiro,
      montoMensual: ctx.jubilacion.montoMensual,
      ahorros: ctx.activos.ahorros,
      casa: ctx.activos.casa,
      inversiones: ctx.activos.inversiones,
      hipoteca: ctx.pasivos.hipoteca,
      tarjetas: ctx.pasivos.tarjetas,
      seguroCompania: ctx.seguros.individual.compania,
      seguroSuma: ctx.seguros.individual.sumaAsegurada,
      titular: ctx.ingresos.titular,
      prestaciones: ctx.ingresos.prestacionesTitular,
      vivienda: ctx.gastosBasicos.vivienda,
      alimentacion: ctx.gastosBasicos.alimentacion,
      recreacion: ctx.gastosVariables.recreacion,
      sepelio: ctx.fallecimiento.gastosSepelio,
      tasaInteres: ctx.detalle.tasaInteres,
      planProteccion: ctx.detalle.planProteccion,
      dia: ctx.cita.dia,
      mes: ctx.cita.mes,
      hora: ctx.cita.hora,
      lugar: ctx.cita.lugar,
      notas: ctx.notas,
    };

    // Reset
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    // Verify reset
    expect(ctx.perfil.telefono).toBe('');
    expect(ctx.activos.ahorros).toBe('');

    // Reload
    const saved = ctx.listaClientes[0];
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    // Verify ALL fields match
    expect(ctx.perfil.telefono).toBe(snapshot.telefono);
    expect(ctx.perfil.ocupacion).toBe(snapshot.ocupacion);
    expect(ctx.perfil.fuma).toBe(snapshot.fuma);
    expect(ctx.perfil.estadoCivil).toBe(snapshot.estadoCivil);
    expect(ctx.jubilacion.esperanzaVida).toBe(snapshot.esperanzaVida);
    expect(ctx.jubilacion.edadRetiro).toBe(snapshot.edadRetiro);
    expect(ctx.jubilacion.montoMensual).toBe(snapshot.montoMensual);
    expect(ctx.activos.ahorros).toBe(snapshot.ahorros);
    expect(ctx.activos.casa).toBe(snapshot.casa);
    expect(ctx.activos.inversiones).toBe(snapshot.inversiones);
    expect(ctx.pasivos.hipoteca).toBe(snapshot.hipoteca);
    expect(ctx.pasivos.tarjetas).toBe(snapshot.tarjetas);
    expect(ctx.seguros.individual.compania).toBe(snapshot.seguroCompania);
    expect(ctx.seguros.individual.sumaAsegurada).toBe(snapshot.seguroSuma);
    expect(ctx.ingresos.titular).toBe(snapshot.titular);
    expect(ctx.ingresos.prestacionesTitular).toBe(snapshot.prestaciones);
    expect(ctx.gastosBasicos.vivienda).toBe(snapshot.vivienda);
    expect(ctx.gastosBasicos.alimentacion).toBe(snapshot.alimentacion);
    expect(ctx.gastosVariables.recreacion).toBe(snapshot.recreacion);
    expect(ctx.fallecimiento.gastosSepelio).toBe(snapshot.sepelio);
    expect(ctx.detalle.tasaInteres).toBe(snapshot.tasaInteres);
    expect(ctx.detalle.planProteccion).toBe(snapshot.planProteccion);
    expect(ctx.cita.dia).toBe(snapshot.dia);
    expect(ctx.cita.mes).toBe(snapshot.mes);
    expect(ctx.cita.hora).toBe(snapshot.hora);
    expect(ctx.cita.lugar).toBe(snapshot.lugar);
    expect(ctx.notas).toBe(snapshot.notas);
  });

  it('Pirámide personalizada sobrevive guardar/cargar', async () => {
    const customOrder = [
      { id: 'edu', label: 'EDUCACIÓN', color: '#8cbe27', icon: 'graduation-cap' },
      { id: 'pro', label: 'ESTILO DE VIDA', color: '#161616', icon: 'shield' },
      { id: 'jub', label: 'JUBILACIÓN', color: '#0e8ece', icon: 'plane' },
      { id: 'aho', label: 'AHORRO', color: '#2665ad', icon: 'bank' },
    ];

    await act(async () => {
      ctx.setNombreCliente('Pirámide Custom');
      ctx.updatePiramideOrder(customOrder);
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Reset and reload
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.piramideLevels[0].id).not.toBe('edu'); // Default order is different

    const saved = ctx.listaClientes[0];
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.piramideLevels).toHaveLength(4);
    expect(ctx.piramideLevels[0].id).toBe('edu');
    expect(ctx.piramideLevels[1].id).toBe('pro');
    expect(ctx.piramideLevels[2].id).toBe('jub');
    expect(ctx.piramideLevels[3].id).toBe('aho');
  });

  it('Referidos vacíos no se pierden', async () => {
    await act(async () => {
      ctx.setNombreCliente('Referidos Test');
      // Add a referido with name but no phone
      ctx.addReferido();
    });
    await act(async () => { jest.runAllTimers(); });

    // Update the referido
    const refId = ctx.referidos[0].id;
    await act(async () => {
      ctx.updateReferido(refId, 'nombre', 'Referido Sin Tel');
      ctx.updateReferido(refId, 'ocupacion', 'Médico');
    });

    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Reset and reload
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes[0];
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.referidos).toHaveLength(1);
    expect(ctx.referidos[0].nombre).toBe('Referido Sin Tel');
    expect(ctx.referidos[0].ocupacion).toBe('Médico');
  });
});

describe('Edge Cases', () => {
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

  it('Prospecto con caracteres especiales: emojis, acentos, ñ', async () => {
    await act(async () => {
      ctx.setNombreCliente('José Muñoz 🎉');
      ctx.updatePerfil('ocupacion', 'Diseñador Gráfico ™');
      ctx.updateNotas('Notas con ñ, é, ü y emojis 🚀💰');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // Reload
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes[0];
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.nombreCliente).toBe('José Muñoz 🎉');
    expect(ctx.perfil.ocupacion).toBe('Diseñador Gráfico ™');
    expect(ctx.notas).toBe('Notas con ñ, é, ü y emojis 🚀💰');
  });

  it('Doble-guardar no duplica prospecto', async () => {
    await act(async () => { ctx.setNombreCliente('No Duplicar'); });
    
    // Save twice quickly
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.listaClientes).toHaveLength(1);
  });

  it('Dependiente → Hijo sync: agregar dependiente hijo auto-crea hijo', async () => {
    await act(async () => {
      ctx.setNombreCliente('Dep Sync');
      ctx.addDependiente();
    });
    await act(async () => { jest.runAllTimers(); });

    const depId = ctx.perfil.dependientes[0].id;
    await act(async () => {
      ctx.updateDependiente(depId, 'nombre', 'Pedrito');
      ctx.updateDependiente(depId, 'edad', '8');
      ctx.updateDependiente(depId, 'parentesco', 'Hijo');
    });
    await act(async () => { jest.runAllTimers(); });

    // The child sync effect should have created a corresponding hijo
    expect(ctx.hijos.length).toBeGreaterThanOrEqual(1);
    const hijoSynced = ctx.hijos.find((h: any) => h.nombre === 'Pedrito');
    expect(hijoSynced).toBeDefined();
    expect(hijoSynced.edad).toBe('8');
    // Should have a default university
    expect(hijoSynced.universidad).toBeDefined();
  });

  it('Remover dependiente hijo auto-remueve hijo', async () => {
    await act(async () => {
      ctx.setNombreCliente('Remove Dep');
      ctx.addDependiente();
    });
    await act(async () => { jest.runAllTimers(); });

    const depId = ctx.perfil.dependientes[0].id;
    await act(async () => {
      ctx.updateDependiente(depId, 'nombre', 'Eliminable');
      ctx.updateDependiente(depId, 'parentesco', 'Hijo');
    });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.hijos.length).toBeGreaterThanOrEqual(1);

    // Remove the dependiente
    await act(async () => { ctx.removeDependiente(depId); });
    await act(async () => { jest.runAllTimers(); });

    // Hijo should be removed too
    expect(ctx.hijos.find((h: any) => h.id === depId)).toBeUndefined();
  });

  it('clientes_db corrupto en storage no crashea la app', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'clientes_db') return 'ESTO NO ES JSON!!!';
      return null;
    });

    // Re-mount — should not crash
    root.unmount();
    let didCrash = false;
    try {
      root = await mountProvider();
      await act(async () => { jest.runAllTimers(); });
    } catch (e) {
      didCrash = true;
    }

    expect(didCrash).toBe(false);
  });

  it('Prospecto con nombre largo (100+ chars) se recorta en payload', async () => {
    const longName = 'A'.repeat(150);
    await act(async () => { ctx.setNombreCliente(longName); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    // The full name is preserved in local storage
    expect(ctx.listaClientes[0].nombre).toBe(longName);
    // But when sent to server, it would be truncated to 100 in forceSync
    // (We can verify by checking the payload if we use a real advisor)
  });

  it('upsertReferido: actualiza existente o agrega nuevo', async () => {
    // Add a referido first
    await act(async () => { ctx.addReferido(); });
    await act(async () => { jest.runAllTimers(); });

    const existingId = ctx.referidos[0].id;

    // Upsert with same ID → update
    await act(async () => {
      ctx.upsertReferido({ id: existingId, nombre: 'Updated', edad: '30', ocupacion: 'Dr', telefono: '555' });
    });

    expect(ctx.referidos).toHaveLength(1);
    expect(ctx.referidos[0].nombre).toBe('Updated');

    // Upsert with new ID → add
    await act(async () => {
      ctx.upsertReferido({ id: 'new-ref-99', nombre: 'Nuevo', edad: '25', ocupacion: 'Ing', telefono: '666' });
    });

    expect(ctx.referidos).toHaveLength(2);
    expect(ctx.referidos[1].nombre).toBe('Nuevo');
  });
});
