import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localforage from 'localforage';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
}

const STORAGE_KEY = 'vigadn_app_logs';
const MAX_LOGS = 1000; // Mantenemos los últimos 1000 eventos para no llenar la memoria

class LoggerService {
  private logs: LogEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    try {
      let storedLogs: string | null = null;
      if (Platform.OS === 'web') {
        storedLogs = await localforage.getItem<string>(STORAGE_KEY);
      } else {
        storedLogs = await AsyncStorage.getItem(STORAGE_KEY);
      }
      
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('No se pudieron cargar los logs previos', error);
    }
  }

  private async persistLogs() {
    try {
      const data = JSON.stringify(this.logs);
      if (Platform.OS === 'web') {
        await localforage.setItem(STORAGE_KEY, data);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, data);
      }
    } catch (error) {
      console.warn('Error al persistir logs', error);
    }
  }

  private addLog(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      // Evitar serializar objetos gigantescos o componentes React
      details: details ? this.sanitizeDetails(details) : undefined,
    };

    // Añadir al inicio y recortar
    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    // Persistir asincronamente sin bloquear
    if (this.isInitialized) {
      this.persistLogs().catch(() => {});
    }

    // También imprimir a consola para el modo desarrollo
    if (__DEV__) {
      if (level === 'ERROR') console.error(`[LOGGER] ${message}`, details || '');
      else if (level === 'WARN') console.warn(`[LOGGER] ${message}`, details || '');
      else console.log(`[LOGGER] ${message}`, details || '');
    }
  }

  private sanitizeDetails(details: any): any {
    try {
      // Si es un error puro, extraer stack
      if (details instanceof Error) {
        return { name: details.name, message: details.message, stack: details.stack };
      }
      // Sanitizar contraseñas, tokens y otros objetos grandes en forma de cadena json
      const str = typeof details === 'string' ? details : JSON.stringify(details);
      // Ocultar strings que parezcan JWT o tokens
      const sanitized = str.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED]')
                           .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"');
      return JSON.parse(sanitized);
    } catch {
      return "[Unserializable object]";
    }
  }

  public info(message: string, details?: any) {
    this.addLog('INFO', message, details);
  }

  public warn(message: string, details?: any) {
    this.addLog('WARN', message, details);
  }

  public error(message: string, details?: any) {
    this.addLog('ERROR', message, details);
  }

  public async getLogsFormatted(): Promise<string> {
    if (!this.isInitialized) await this.init();
    
    // Devolvemos del más antiguo al más nuevo para lectura de arriba hacia abajo
    const ordered = [...this.logs].reverse();
    return ordered.map(l => {
      const time = new Date(l.timestamp).toLocaleString();
      let line = `[${time}] [${l.level}] ${l.message}`;
      if (l.details) {
        line += `\n    Details: ${typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}`;
      }
      return line;
    }).join('\n');
  }

  public async clearLogs() {
    this.logs = [];
    if (Platform.OS === 'web') {
      await localforage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const Logger = new LoggerService();
