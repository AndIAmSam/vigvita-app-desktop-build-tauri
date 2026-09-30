/**
 * Integration Test: Status Updates & Draft Recovery
 * 
 * Tests actualizarEstadoProspecto, actualizarAcompanamiento,
 * toggleCierreProspecto (legacy), and draft auto-save/recovery.
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

describe('Status Updates — actualizarEstadoProspecto, actualizarAcompanamiento', () => {
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

  it('actualizarEstadoProspecto local: actualiza estado y tipos', async () => {
    // Create a client
    await act(async () => { ctx.setNombreCliente('Estado Test'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const clientId = ctx.listaClientes[0].id;

    await act(async () => {
      await ctx.actualizarEstadoProspecto(clientId, 'cierre', ['Vida', 'GMM']);
    });
    await act(async () => { jest.runAllTimers(); });

    const updated = ctx.listaClientes.find((c: any) => c.id === clientId);
    expect(updated.estatusAdquisicion).toBe('cierre');
    expect(updated.tiposCierre).toEqual(['Vida', 'GMM']);
    expect(updated.estatusCierre).toBe(true);
  });

  it('actualizarEstadoProspecto a descartado', async () => {
    await act(async () => { ctx.setNombreCliente('Descarte'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const clientId = ctx.listaClientes[0].id;

    await act(async () => {
      await ctx.actualizarEstadoProspecto(clientId, 'descartado');
    });
    await act(async () => { jest.runAllTimers(); });

    const updated = ctx.listaClientes.find((c: any) => c.id === clientId);
    expect(updated.estatusAdquisicion).toBe('descartado');
  });

  it('actualizarAcompanamiento local: actualiza status', async () => {
    await act(async () => { ctx.setNombreCliente('Acomp Test'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const clientId = ctx.listaClientes[0].id;

    await act(async () => {
      await ctx.actualizarAcompanamiento(clientId, 'observation');
    });
    await act(async () => { jest.runAllTimers(); });

    const updated = ctx.listaClientes.find((c: any) => c.id === clientId);
    expect(updated.accompanimentStatus).toBe('observation');
  });

  it('toggleCierreProspecto (legacy) funciona correctamente', async () => {
    await act(async () => { ctx.setNombreCliente('Legacy Cierre'); });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const clientId = ctx.listaClientes[0].id;

    await act(async () => {
      await ctx.toggleCierreProspecto(clientId, true, 'Vida');
    });
    await act(async () => { jest.runAllTimers(); });

    const updated = ctx.listaClientes.find((c: any) => c.id === clientId);
    expect(updated.estatusCierre).toBe(true);
    expect(updated.tipoCierre).toBe('Vida');
    expect(updated.estatusAdquisicion).toBe('cierre');
  });
});

describe('Draft Recovery — Auto-save and restore', () => {
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

  it('Auto-save draft: cambios se persisten automáticamente', async () => {
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });
    await act(async () => { jest.runAllTimers(); });

    // Make changes (triggers auto-save via useEffect)
    await act(async () => {
      ctx.setNombreCliente('Draft Test');
      ctx.updatePerfil('telefono', '555-DRAFT');
    });
    await act(async () => { jest.runAllTimers(); });

    // Check that draft was saved
    const mockStorage = require('@react-native-async-storage/async-storage');
    const draftCalls = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'draft_prospect_v1');
    expect(draftCalls.length).toBeGreaterThan(0);

    const lastDraft = JSON.parse(draftCalls[draftCalls.length - 1][1]);
    expect(lastDraft.nombreCliente).toBe('Draft Test');
    expect(lastDraft.perfil.telefono).toBe('555-DRAFT');
  });

  it('No guarda draft vacío', async () => {
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });
    await act(async () => { jest.runAllTimers(); });

    // Don't set any data — leave everything empty
    const mockStorage = require('@react-native-async-storage/async-storage');
    const draftCallsBefore = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'draft_prospect_v1');

    // Wait for any effects to fire
    await act(async () => { jest.runAllTimers(); });

    const draftCallsAfter = mockStorage.setItem.mock.calls.filter((c: any) => c[0] === 'draft_prospect_v1');
    // No new draft calls should have been made for empty data
    expect(draftCallsAfter.length).toBe(draftCallsBefore.length);
  });

  it('Recovery en init: draft existente restaura campos', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');

    const draftSnapshot = {
      currentClientId: 'draft-client-1',
      currentServerId: null,
      nombreCliente: 'Recovered Draft',
      perfil: {
        telefono: '555-RECOVERED',
        ocupacion: 'Recovered Occ',
        hobbies: '', deporte: '', fuma: false, fechaNacimiento: '',
        estadoCivil: '', conyugeNombre: '', conyugeTelefono: '',
        conyugeFechaNacimiento: '', conyugeOcupacion: '', conyugeFuma: false,
        conyugeHobbies: '', conyugeDeporte: '', dependientes: [],
        notaProteccion: '', notaEducacion: '', notaAhorro: '',
        notaJubilacion: '', notaSalud: '', notaRiesgos: '',
      },
      hijos: [],
      jubilacion: { esperanzaVida: '80', edadRetiro: '60', montoMensual: '40000', edadActual: '45' },
      activos: { ahorros: '250000', casa: '', otrosInmuebles: '', vehiculos: '', inversiones: '', otros: '' },
      pasivos: { hipoteca: '', prestamos: '', tarjetas: '', limiteCredito: '', otros: '' },
      seguros: { individual: { compania: '', plan: '', sumaAsegurada: '', prima: '' }, colectivo: { compania: '', plan: '', sumaAsegurada: '', prima: '' }, otros: { compania: '', plan: '', sumaAsegurada: '', prima: '' } },
      ingresos: { titular: '', conyuge: '', prestacionesTitular: '', prestacionesConyuge: '' },
      gastosBasicos: { servicios: '', vivienda: '', alimentacion: '', colegios: '', transporte: '', seguros: '' },
      gastosVariables: { creditos: '', recreacion: '', entretenimiento: '', domestico: '', salud: '', otros: '' },
      fallecimiento: { gastosSepelio: '', gastosIncapacidad: '' },
      detalle: { otrosIngresos: '', tasaInteres: '8', planProteccion: '10', planAhorro: '7' },
      cita: { dia: '', mes: '', hora: '', lugar: '', necesitaDecisionMaker: false, nombreDecisionMaker: '' },
      referidos: [],
      notas: 'Draft notes',
      piramideLevels: [
        { id: 'pro', label: 'ESTILO DE VIDA', color: '#161616', icon: 'shield' },
        { id: 'edu', label: 'EDUCACIÓN', color: '#8cbe27', icon: 'graduation-cap' },
        { id: 'aho', label: 'AHORRO', color: '#2665ad', icon: 'bank' },
        { id: 'jub', label: 'JUBILACIÓN', color: '#0e8ece', icon: 'plane' },
      ],
    };

    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'draft_prospect_v1') return JSON.stringify(draftSnapshot);
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Verify recovered data
    expect(ctx.nombreCliente).toBe('Recovered Draft');
    expect(ctx.perfil.telefono).toBe('555-RECOVERED');
    expect(ctx.jubilacion.esperanzaVida).toBe('80');
    expect(ctx.activos.ahorros).toBe('250000');
    expect(ctx.notas).toBe('Draft notes');
  });

  it('Draft vacío se limpia del storage', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage');

    const emptyDraft = {
      currentClientId: null,
      nombreCliente: '',
      perfil: { telefono: '', ocupacion: '' },
    };

    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'draft_prospect_v1') return JSON.stringify(emptyDraft);
      return null;
    });

    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Empty draft should be removed
    expect(mockStorage.removeItem).toHaveBeenCalledWith('draft_prospect_v1');
  });
});
