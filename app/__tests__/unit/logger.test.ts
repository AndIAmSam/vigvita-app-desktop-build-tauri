/**
 * Unit Test: Logger Service
 * 
 * Tests logging levels, password & token sanitization,
 * log history trimming, formatted output, and storage persistence.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Logger Service', () => {
  let Logger: any;

  beforeEach(() => {
    // Obtain real Logger instance
    const mod = jest.requireActual('../../utils/logger');
    Logger = mod.Logger;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await Logger.clearLogs();
  });

  it('Registra logs de nivel INFO, WARN y ERROR', async () => {
    Logger.info('Mensaje informativo', { user: 'test' });
    Logger.warn('Advertencia leve', { code: 123 });
    Logger.error('Error crítico', new Error('Fallo de red'));

    const formatted = await Logger.getLogsFormatted();
    expect(formatted).toContain('[INFO] Mensaje informativo');
    expect(formatted).toContain('[WARN] Advertencia leve');
    expect(formatted).toContain('[ERROR] Error crítico');
  });

  it('Sanitiza contraseñas en los detalles', async () => {
    Logger.info('Intento de login', {
      email: 'admin@vigvita.com',
      password: 'SuperSecretPassword123!',
    });

    const formatted = await Logger.getLogsFormatted();
    expect(formatted).not.toContain('SuperSecretPassword123!');
    expect(formatted).toContain('"password":"[REDACTED]"');
  });

  it('Sanitiza tokens Bearer en los detalles', async () => {
    Logger.info('Request API', {
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenpayload.signature',
      }
    });

    const formatted = await Logger.getLogsFormatted();
    expect(formatted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(formatted).toContain('Bearer [REDACTED]');
  });

  it('Sanitiza objetos Error extrayendo nombre y mensaje', async () => {
    const error = new Error('Conexión rechazada');
    Logger.error('Fallo HTTP', error);

    const formatted = await Logger.getLogsFormatted();
    expect(formatted).toContain('Conexión rechazada');
  });

  it('Maneja objetos no serializables con gracia', async () => {
    const circular: any = {};
    circular.self = circular;

    // No debe lanzar excepción
    expect(() => {
      Logger.info('Objeto circular', circular);
    }).not.toThrow();
  });

  it('clearLogs vacía la memoria y storage', async () => {
    Logger.info('Log que será borrado');
    await Logger.clearLogs();

    const formatted = await Logger.getLogsFormatted();
    expect(formatted).toBe('');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('vigadn_app_logs');
  });

  it('Formatea los logs en orden cronológico (más antiguo primero)', async () => {
    Logger.info('Primero');
    Logger.info('Segundo');
    Logger.info('Tercero');

    const formatted = await Logger.getLogsFormatted();
    const pos1 = formatted.indexOf('Primero');
    const pos2 = formatted.indexOf('Segundo');
    const pos3 = formatted.indexOf('Tercero');

    expect(pos1).toBeLessThan(pos2);
    expect(pos2).toBeLessThan(pos3);
  });

  it('Limita los logs a MAX_LOGS (1000) descartando los más antiguos', async () => {
    // Insertamos 1010 logs
    for (let i = 0; i < 1010; i++) {
      Logger.info(`BatchItem ${i}`);
    }

    const formatted = await Logger.getLogsFormatted();
    // Debe contener el log reciente 1009
    expect(formatted).toContain('BatchItem 1009');
    // El primer log (BatchItem 0) debe haber sido descartado
    expect(formatted).not.toContain('BatchItem 0\n');
  });

  it('Persiste y borra logs usando localforage en plataforma Web', async () => {
    const { Platform } = require('react-native');
    const localforage = require('localforage');
    const origPlatform = Platform.OS;
    Platform.OS = 'web';

    try {
      Logger.info('Web log entry');
      await Logger.clearLogs();
      expect(localforage.removeItem).toHaveBeenCalledWith('vigadn_app_logs');
    } finally {
      Platform.OS = origPlatform;
    }
  });
});
