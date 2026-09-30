// Jest Global Setup — Enhanced for Vigvita
// This file runs BEFORE every test suite.

// 1. Define __DEV__ (React Native global)
global.__DEV__ = true;


// 3. Mock AsyncStorage with in-memory implementation
const asyncStorageStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key, value) => { asyncStorageStore[key] = value; }),
  getItem: jest.fn(async (key) => asyncStorageStore[key] ?? null),
  removeItem: jest.fn(async (key) => { delete asyncStorageStore[key]; }),
  clear: jest.fn(async () => { Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]); }),
}));

// 4. Mock localforage with in-memory implementation
const localforageStore = {};
jest.mock('localforage', () => ({
  setItem: jest.fn(async (key, value) => { localforageStore[key] = value; }),
  getItem: jest.fn(async (key) => localforageStore[key] ?? null),
  removeItem: jest.fn(async (key) => { delete localforageStore[key]; }),
  clear: jest.fn(async () => { Object.keys(localforageStore).forEach(k => delete localforageStore[k]); }),
}));


// 5. Mock Alert & AppState on react-native directly
const RN = require('react-native');
if (RN.AppState) {
  RN.AppState.addEventListener = jest.fn(() => ({ remove: jest.fn() }));
  RN.AppState.removeEventListener = jest.fn();
  RN.AppState.currentState = 'active';
}
if (RN.Alert) {
  RN.Alert.alert = jest.fn();
}

// 6. Mock Logger
jest.mock('./utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getLogsFormatted: jest.fn(async () => ''),
    clearLogs: jest.fn(async () => {}),
  },
}));

// 8. Set API URL for tests
process.env.EXPO_PUBLIC_API_URL = 'https://test-api.vigvita.com';

// 9. Default global.fetch mock so unhandled network calls don't fail
global.fetch = jest.fn(async (url) => {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ success: true, access_expires_at: null }),
    text: async () => JSON.stringify({ success: true }),
    blob: async () => ({ size: 0, type: 'image/png' }),
    headers: new Map(),
  };
});

// 9. Helper to clear storage between tests
global.__clearTestStorage = () => {
  Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
  Object.keys(localforageStore).forEach(k => delete localforageStore[k]);
};

// 10. Safe mock for jest.runAllTimers to avoid warnings when fake timers aren't active
if (typeof jest !== 'undefined') {
  jest.runAllTimers = () => {
    try {
      return jest.runOnlyPendingTimers();
    } catch {
      // Fake timers not active, no-op
    }
  };
}

// 11. Timer leak prevention — track and clear timeouts/intervals on teardown
const activeTimeouts = new Set();
const activeIntervals = new Set();
const origSetTimeout = global.setTimeout;
const origClearTimeout = global.clearTimeout;
const origSetInterval = global.setInterval;
const origClearInterval = global.clearInterval;

global.setTimeout = (fn, delay, ...args) => {
  const id = origSetTimeout((...inner) => {
    activeTimeouts.delete(id);
    fn(...inner);
  }, delay, ...args);
  activeTimeouts.add(id);
  return id;
};

global.clearTimeout = (id) => {
  activeTimeouts.delete(id);
  origClearTimeout(id);
};

global.setInterval = (fn, delay, ...args) => {
  const id = origSetInterval(fn, delay, ...args);
  activeIntervals.add(id);
  return id;
};

global.clearInterval = (id) => {
  activeIntervals.delete(id);
  origClearInterval(id);
};

afterEach(() => {
  activeTimeouts.forEach(id => origClearTimeout(id));
  activeTimeouts.clear();
  activeIntervals.forEach(id => origClearInterval(id));
  activeIntervals.clear();
});

// 12. Filter out intentional error test logs, React act warnings, and noisy logs
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Mute app console.log during test execution (keeps output readable)
console.log = () => {};

console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || String(args[0] || ''));
  // Silence intentional errors produced by error-handling tests
  if (
    msg.includes('was not wrapped in act(...)') ||
    msg.includes('You are trying to `import` a file after the Jest environment has been torn down') ||
    msg.includes('Error al sincronizar:') ||
    msg.includes('Error from API:') ||
    msg.includes('Error al importar:') ||
    msg.includes('[SYNC-RESCUE]') ||
    msg.includes('Error al cargar clientes') ||
    msg.includes('Error parsing saved client') ||
    msg.includes('[LOGGER]') ||
    msg.includes('Simulated print failure') ||
    msg.includes('Error validando JSON:')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('A function to advance timers was called') ||
    msg.includes('Invalid style property') ||
    msg.includes('shadow* style props are deprecated') ||
    msg.includes('[SYNC-RESCUE]') ||
    msg.includes('Fallo al verificar access-status') ||
    msg.includes('Network auto-sync error') ||
    msg.includes('Init auto-sync error') ||
    msg.includes('[LOGGER]') ||
    msg.includes('Error cargando logo:')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
