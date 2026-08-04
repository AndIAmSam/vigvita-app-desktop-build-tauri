// Jest setup
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock localforage
jest.mock('localforage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Suppress console.warn/error in tests so they don't clutter output
global.console = {
  ...console,
  // warn: jest.fn(),
  // error: jest.fn(),
};
