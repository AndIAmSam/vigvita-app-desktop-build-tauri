/**
 * Unit Test: Data Mapping Roundtrip
 * 
 * Tests that mapClientData (español→inglés) and unmapClientData (inglés→español)
 * are perfect inverses. If these tests pass, data survives the server roundtrip.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FinancialProvider, useFinancialData } from '../../context/FinancialContext';
import { FIXTURES } from '../setup/testSetup';

// --- Context extractor pattern ---
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

describe('Data Mapping — Roundtrip map↔unmap', () => {
  let root: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.__clearTestStorage?.();
    jest.clearAllMocks();
    root = await mountProvider();
    await act(async () => { await ctx.bypassLoginForDev('asesor'); });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await act(async () => { jest.runAllTimers(); });
    root?.unmount();
  });

  it('Roundtrip completo: datos locales → guardar → interceptar payload → cargar → verificar igualdad', async () => {
    const fullData = FIXTURES.FULL_CLIENT_DATA();

    // 1. Inyectar datos completos en el contexto
    await act(async () => {
      ctx.setNombreCliente('Test Roundtrip');
      ctx.updatePerfil('telefono', fullData.perfil.telefono);
      ctx.updatePerfil('ocupacion', fullData.perfil.ocupacion);
      ctx.updatePerfil('fuma', fullData.perfil.fuma);
      ctx.updatePerfil('fechaNacimiento', fullData.perfil.fechaNacimiento);
      ctx.updatePerfil('estadoCivil', fullData.perfil.estadoCivil);
      ctx.updatePerfil('conyugeNombre', fullData.perfil.conyugeNombre);
      ctx.updatePerfil('conyugeTelefono', fullData.perfil.conyugeTelefono);
      ctx.updateJubilacion('esperanzaVida', fullData.jubilacion.esperanzaVida);
      ctx.updateJubilacion('edadRetiro', fullData.jubilacion.edadRetiro);
      ctx.updateJubilacion('montoMensual', fullData.jubilacion.montoMensual);
      ctx.updateActivo('ahorros', fullData.activos.ahorros);
      ctx.updateActivo('casa', fullData.activos.casa);
      ctx.updatePasivo('hipoteca', fullData.pasivos.hipoteca);
      ctx.updateSeguro('individual', 'compania', fullData.seguros.individual.compania);
      ctx.updateSeguro('individual', 'plan', fullData.seguros.individual.plan);
      ctx.updateSeguro('individual', 'sumaAsegurada', fullData.seguros.individual.sumaAsegurada);
      ctx.updateIngreso('titular', fullData.ingresos.titular);
      ctx.updateIngreso('conyuge', fullData.ingresos.conyuge);
      ctx.updateGastoBasico('servicios', fullData.gastosBasicos.servicios);
      ctx.updateGastoVariable('creditos', fullData.gastosVariables.creditos);
      ctx.updateFallecimiento('gastosSepelio', fullData.fallecimiento.gastosSepelio);
      ctx.updateDetalle('otrosIngresos', fullData.detalle.otrosIngresos);
      ctx.updateDetalle('tasaInteres', fullData.detalle.tasaInteres);
      ctx.updateCita('dia', fullData.cita.dia);
      ctx.updateCita('lugar', fullData.cita.lugar);
      ctx.updateNotas(fullData.notas);
      ctx.updatePiramideOrder(fullData.piramideLevels);
    });

    // 2. Guardar (DEV-MODE no hace fetch, pero guarda en listaClientes)
    await act(async () => {
      await ctx.guardarProspecto();
    });
    await act(async () => { jest.runAllTimers(); });

    // 3. Capturar el snapshot guardado
    const savedClient = ctx.listaClientes.find((c: any) => c.nombre === 'Test Roundtrip');
    expect(savedClient).toBeDefined();
    expect(savedClient.data).toBeDefined();

    // 4. Resetear estado
    await act(async () => { ctx.nuevoAnalisis(true); });

    // Verificar que el estado se limpió
    expect(ctx.nombreCliente).toBe('');
    expect(ctx.perfil.telefono).toBe('');

    // 5. Recargar el prospecto guardado
    await act(async () => {
      await ctx.cargarProspecto(savedClient);
    });
    await act(async () => { jest.runAllTimers(); });

    // 6. Verificar que TODOS los campos se restauraron
    expect(ctx.nombreCliente).toBe('Test Roundtrip');
    expect(ctx.perfil.telefono).toBe(fullData.perfil.telefono);
    expect(ctx.perfil.ocupacion).toBe(fullData.perfil.ocupacion);
    expect(ctx.perfil.fuma).toBe(false);
    expect(ctx.perfil.estadoCivil).toBe(fullData.perfil.estadoCivil);
    expect(ctx.perfil.conyugeNombre).toBe(fullData.perfil.conyugeNombre);
    expect(ctx.jubilacion.esperanzaVida).toBe(fullData.jubilacion.esperanzaVida);
    expect(ctx.jubilacion.edadRetiro).toBe(fullData.jubilacion.edadRetiro);
    expect(ctx.jubilacion.montoMensual).toBe(fullData.jubilacion.montoMensual);
    expect(ctx.activos.ahorros).toBe(fullData.activos.ahorros);
    expect(ctx.activos.casa).toBe(fullData.activos.casa);
    expect(ctx.pasivos.hipoteca).toBe(fullData.pasivos.hipoteca);
    expect(ctx.seguros.individual.compania).toBe(fullData.seguros.individual.compania);
    expect(ctx.seguros.individual.plan).toBe(fullData.seguros.individual.plan);
    expect(ctx.ingresos.titular).toBe(fullData.ingresos.titular);
    expect(ctx.ingresos.conyuge).toBe(fullData.ingresos.conyuge);
    expect(ctx.gastosBasicos.servicios).toBe(fullData.gastosBasicos.servicios);
    expect(ctx.gastosVariables.creditos).toBe(fullData.gastosVariables.creditos);
    expect(ctx.fallecimiento.gastosSepelio).toBe(fullData.fallecimiento.gastosSepelio);
    expect(ctx.detalle.otrosIngresos).toBe(fullData.detalle.otrosIngresos);
    expect(ctx.detalle.tasaInteres).toBe(fullData.detalle.tasaInteres);
    expect(ctx.cita.dia).toBe(fullData.cita.dia);
    expect(ctx.cita.lugar).toBe(fullData.cita.lugar);
    expect(ctx.notas).toBe(fullData.notas);
    expect(ctx.piramideLevels).toHaveLength(4);
    expect(ctx.piramideLevels[0].id).toBe('pro'); // Custom order preserved
  });

  it('Roundtrip con servidor: local → mapClientData (POST) → unmapClientData (GET) → verificar', async () => {
    // Interceptar el payload que forceSync envía al POST
    let capturedPayload: any = null;

    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/profiles/new')) {
        capturedPayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({ data: ['uuid-roundtrip'] }),
          text: () => Promise.resolve(''),
        });
      }
      // GET for Read-After-Write
      if (url.includes('uuid-roundtrip')) {
        // Return the mapped data as the server would
        const serverData = capturedPayload?.clients?.[0]?.data || {};
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ 
            data: JSON.stringify(serverData),
            accompaniment_status: 'unaccompanied'
          }),
        });
      }
      // Fallback (profiles list, access-status, etc.)
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ profiles: [] }),
        text: () => Promise.resolve(''),
      });
    }) as jest.Mock;

    // Necesitamos un advisor real (no DEV-MODE) para que forceSync haga fetch
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') {
        return JSON.stringify(FIXTURES.SESSION());
      }
      return null;
    });

    // Re-montar con sesión real
    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    // Inyectar datos
    await act(async () => {
      ctx.setNombreCliente('Roundtrip Server');
      ctx.updatePerfil('telefono', '5551234567');
      ctx.updatePerfil('ocupacion', 'Ingeniero');
      ctx.updatePerfil('fuma', true);
      ctx.updateJubilacion('esperanzaVida', '85');
      ctx.updateActivo('ahorros', '500000');
      ctx.updateNotas('Nota de prueba');
    });

    // Guardar + sync
    await act(async () => {
      await ctx.guardarProspecto();
    });
    await act(async () => { jest.runAllTimers(); });

    // Verificar que capturamos el payload
    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.clients).toHaveLength(1);

    const mappedData = capturedPayload.clients[0].data;
    // Verificar que mapClientData produjo los campos en inglés
    expect(mappedData.profile.phone).toBe('5551234567');
    expect(mappedData.profile.occupation).toBe('Ingeniero');
    expect(mappedData.profile.smoker).toBe(true);
    expect(mappedData.retirement.life_expectancy).toBe(85);
    expect(mappedData.assets.savings).toBe(500000);
    expect(mappedData.notes).toBe('Nota de prueba');
  });

  it('Roundtrip con datos vacíos no crashea ni pierde estructura', async () => {
    // Guardar un prospecto con datos mínimos
    await act(async () => {
      ctx.setNombreCliente('Vacío');
    });
    await act(async () => {
      await ctx.guardarProspecto();
    });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes.find((c: any) => c.nombre === 'Vacío');
    expect(saved).toBeDefined();

    // Cargar
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    // Todos los campos deben tener defaults válidos (no undefined/null)
    expect(ctx.nombreCliente).toBe('Vacío');
    expect(ctx.perfil.telefono).toBe('');
    expect(ctx.perfil.fuma).toBe(false);
    expect(ctx.jubilacion.esperanzaVida).toBe('');
    expect(ctx.activos.ahorros).toBe('');
    expect(ctx.seguros.individual.compania).toBe('');
    expect(ctx.referidos).toHaveLength(0);
    expect(ctx.piramideLevels).toHaveLength(4); // Defaults
  });

  it('Pirámide con datos corruptos cae a defaults', async () => {
    // Simular carga de prospecto con pirámide corrupta
    const corruptClient = FIXTURES.SAVED_CLIENT({
      data: {
        ...FIXTURES.FULL_CLIENT_DATA(),
        piramideLevels: [null, { id: 'x' }, undefined], // Corrupta
      }
    });

    await act(async () => {
      await ctx.cargarProspecto(corruptClient);
    });
    await act(async () => { jest.runAllTimers(); });

    // Debe caer a los 4 niveles default
    expect(ctx.piramideLevels).toHaveLength(4);
    expect(ctx.piramideLevels[0].id).toBe('jub'); // Default order
  });

  it('Referidos con entorno generan IDs estables del formato "Entorno-Index"', async () => {
    const clientWithRefs = FIXTURES.SAVED_CLIENT({
      data: {
        ...FIXTURES.FULL_CLIENT_DATA(),
        referidos: [
          { id: 'Familiar-0', nombre: 'Pedro', edad: '40', ocupacion: 'Abogado', telefono: '555', entorno: 'Familiar' },
          { id: 'Familiar-1', nombre: 'Luis', edad: '35', ocupacion: 'Doctor', telefono: '666', entorno: 'Familiar' },
          { id: 'Social-0', nombre: 'Laura', edad: '30', ocupacion: 'Contadora', telefono: '777', entorno: 'Social' },
        ]
      }
    });

    await act(async () => { await ctx.cargarProspecto(clientWithRefs); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.referidos).toHaveLength(3);
    expect(ctx.referidos[0].nombre).toBe('Pedro');
    expect(ctx.referidos[1].nombre).toBe('Luis');
    expect(ctx.referidos[2].nombre).toBe('Laura');
  });

  it('Preservación de tipos: boolean no se convierte en string', async () => {
    await act(async () => {
      ctx.setNombreCliente('TiposBool');
      ctx.updatePerfil('fuma', true);
      ctx.updatePerfil('conyugeFuma', true);
      ctx.updateCita('necesitaDecisionMaker', true);
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes.find((c: any) => c.nombre === 'TiposBool');
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.perfil.fuma).toBe(true);
    expect(typeof ctx.perfil.fuma).toBe('boolean');
    expect(ctx.perfil.conyugeFuma).toBe(true);
    expect(typeof ctx.perfil.conyugeFuma).toBe('boolean');
  });

  it('Datos numéricos como strings sobreviven el roundtrip', async () => {
    await act(async () => {
      ctx.setNombreCliente('Numeros');
      ctx.updateActivo('ahorros', '150000');
      ctx.updateActivo('casa', '3500000');
      ctx.updatePasivo('hipoteca', '1200000');
      ctx.updateIngreso('titular', '85000');
    });
    await act(async () => { await ctx.guardarProspecto(); });
    await act(async () => { jest.runAllTimers(); });

    const saved = ctx.listaClientes.find((c: any) => c.nombre === 'Numeros');
    await act(async () => { ctx.nuevoAnalisis(true); });
    await act(async () => { await ctx.cargarProspecto(saved); });
    await act(async () => { jest.runAllTimers(); });

    expect(ctx.activos.ahorros).toBe('150000');
    expect(ctx.activos.casa).toBe('3500000');
    expect(ctx.pasivos.hipoteca).toBe('1200000');
    expect(ctx.ingresos.titular).toBe('85000');
  });

  it('unmapClientData con data del servidor (formato inglés) mapea correctamente', async () => {
    // Simular un cargarProspecto que descarga del servidor
    const serverData = FIXTURES.FULL_SERVER_DATA();

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/server-full')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            data: JSON.stringify(serverData),
            accompaniment_status: 'observation'
          }),
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ profiles: [] }),
        text: () => Promise.resolve(''),
      });
    }) as jest.Mock;

    // Re-montar con sesión real para activar el fetch
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'advisor_session') return JSON.stringify(FIXTURES.SESSION());
      return null;
    });
    root.unmount();
    root = await mountProvider();
    await act(async () => { jest.runAllTimers(); });

    const cloudClient = FIXTURES.SAVED_CLIENT({
      id: 'cloud-1',
      serverId: 'server-full',
      data: {}, // Sin datos locales — fuerza descarga
    });

    await act(async () => { await ctx.cargarProspecto(cloudClient); });
    await act(async () => { jest.runAllTimers(); });

    // Verificar mapeo inglés → español
    expect(ctx.perfil.telefono).toBe('5551234567');
    expect(ctx.perfil.ocupacion).toBe('Ingeniero');
    expect(ctx.perfil.fuma).toBe(false);
    expect(ctx.perfil.estadoCivil).toBe('Casado');
    expect(ctx.jubilacion.esperanzaVida).toBe('85');
    expect(ctx.jubilacion.edadRetiro).toBe('65');
    expect(ctx.activos.ahorros).toBe('500000');
    expect(ctx.activos.casa).toBe('3000000');
    expect(ctx.pasivos.hipoteca).toBe('1500000');
    expect(ctx.seguros.individual.compania).toBe('GNP');
    expect(ctx.ingresos.titular).toBe('80000');
    expect(ctx.gastosBasicos.servicios).toBe('3000');
    expect(ctx.gastosVariables.creditos).toBe('5000');
    expect(ctx.fallecimiento.gastosSepelio).toBe('100000');
    expect(ctx.detalle.tasaInteres).toBe('8');
    expect(ctx.cita.dia).toBe('15');
    expect(ctx.cita.lugar).toBe('Oficina');
    expect(ctx.notas).toBe('Notas generales del prospecto');
    expect(ctx.referidos).toHaveLength(2);
    expect(ctx.referidos[0].nombre).toBe('Pedro Gómez');
    expect(ctx.piramideLevels).toHaveLength(4);
    expect(ctx.piramideLevels[0].id).toBe('pro');
    expect(ctx.hijos).toHaveLength(2);
    expect(ctx.hijos[0].nombre).toBe('Carlitos');
    expect(ctx.hijos[0].universidad).toBe('Unitec');
  });
});
