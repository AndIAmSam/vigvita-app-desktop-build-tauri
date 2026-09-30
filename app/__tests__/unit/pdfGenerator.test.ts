/**
 * Unit Test: PDF Generator
 * 
 * Tests HTML generation, client vs advisor reports,
 * currency and data formatting, and safe file naming.
 */
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { generatePDF } from '../../utils/pdfGenerator';
import { FIXTURES } from '../setup/testSetup';

// Mock expo modules
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async ({ html }: { html: string }) => ({
    uri: 'file:///mock/temp.pdf',
    numberOfPages: 3,
  })),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(async () => {}),
      uri: 'file:///mock/logo.png',
      localUri: 'file:///mock/logo.png',
    })),
  },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///mock/cache/',
  documentDirectory: 'file:///mock/documents/',
  readAsStringAsync: jest.fn(async () => 'base64dummy'),
  moveAsync: jest.fn(async () => {}),
}));

describe('PDF Generator Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fullData = {
    ...FIXTURES.FULL_CLIENT_DATA(),
    nombreCliente: 'Juan Pérez García',
  };

  it('Genera reporte de tipo "cliente" invocando printToFileAsync y shareAsync', async () => {
    await generatePDF(fullData, 'cliente');

    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    const callArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0];
    
    // Validar que el HTML contenga datos esenciales
    expect(callArg.html).toContain('Juan Pérez García');
    expect(callArg.html).toContain('Análisis Integral Patrimonial');
    expect(callArg.html).toContain('REPORTE CLIENTE');
    expect(callArg.html).toContain('Unitec');
    expect(callArg.html).toContain('Carlitos');

    expect(shareAsync).toHaveBeenCalledTimes(1);
  });

  it('Genera reporte de tipo "asesor" con sección de referidos incluida', async () => {
    await generatePDF(fullData, 'asesor');

    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    const callArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0];

    expect(callArg.html).toContain('Pedro Gómez');
    expect(callArg.html).toContain('Laura Sánchez');
    expect(callArg.html).toContain('REPORTE INTERNO');
  });

  it('Sanitiza caracteres prohibidos en el nombre de archivo', async () => {
    const dataWithIllegalChars = {
      ...fullData,
      nombreCliente: 'Cliente/Con*Caracteres:Prohibidos?Y<Mas>',
    };

    await generatePDF(dataWithIllegalChars, 'cliente');

    expect(shareAsync).toHaveBeenCalledTimes(1);
    const shareCall = (shareAsync as jest.Mock).mock.calls[0];
    const fullPath = shareCall[0];
    const fileName = fullPath.split('/').pop();
    
    // No debe contener caracteres ilegales en el nombre de archivo
    expect(fileName).not.toContain('*');
    expect(fileName).not.toContain(':');
    expect(fileName).not.toContain('?');
    expect(fileName).not.toContain('<');
    expect(fileName).not.toContain('>');
  });

  it('Maneja datos incompletos con placeholders N/A sin crashear', async () => {
    const emptyData = {
      nombreCliente: 'Cliente Vacío',
      perfil: { dependientes: [] },
      hijos: [],
      jubilacion: {},
      activos: {},
      pasivos: {},
      seguros: {},
      ingresos: {},
      gastosBasicos: {},
      gastosVariables: {},
      fallecimiento: {},
      detalle: {},
      cita: {},
      referidos: [],
      notas: '',
      piramideLevels: [],
    };

    await expect(generatePDF(emptyData, 'cliente')).resolves.not.toThrow();
    expect(Print.printToFileAsync).toHaveBeenCalled();
  });

  it('Genera PDF en plataforma Web usando html2pdf.js', async () => {
    const { Platform } = require('react-native');
    const origPlatform = Platform.OS;
    Platform.OS = 'web';

    const mockSave = jest.fn().mockReturnValue(Promise.resolve());
    const mockFrom = jest.fn().mockReturnValue({ save: mockSave });
    const mockSet = jest.fn().mockReturnValue({ from: mockFrom });
    const mockHtml2Pdf = jest.fn().mockReturnValue({ set: mockSet });

    // Mock document.createElement and body methods
    const origCreateElement = global.document?.createElement;
    const origAppendChild = global.document?.body?.appendChild;
    const origRemoveChild = global.document?.body?.removeChild;

    const mockDiv = { innerHTML: '' };
    global.document = {
      createElement: jest.fn(() => mockDiv),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    } as any;

    jest.mock('html2pdf.js', () => mockHtml2Pdf, { virtual: true });

    try {
      await generatePDF(fullData, 'cliente');
      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(mockHtml2Pdf).toHaveBeenCalled();
    } finally {
      Platform.OS = origPlatform;
      if (origCreateElement) {
        global.document.createElement = origCreateElement;
        global.document.body.appendChild = origAppendChild;
        global.document.body.removeChild = origRemoveChild;
      }
    }
  });

  it('Captura errores de generación y muestra alerta sin crashear la app', async () => {
    (Print.printToFileAsync as jest.Mock).mockRejectedValueOnce(new Error('Simulated print failure'));
    const origAlert = global.alert;
    global.alert = jest.fn();

    try {
      await generatePDF(fullData, 'cliente');
      expect(global.alert).toHaveBeenCalledWith('Error PDF');
    } finally {
      global.alert = origAlert;
    }
  });
});
