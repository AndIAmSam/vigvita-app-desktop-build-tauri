/**
 * Declaraciones globales para el entorno de pruebas Jest (definidas en jest-setup.js).
 */
export {};

declare global {
  // Limpia el storage en memoria (AsyncStorage + localforage) y restaura sus mocks por defecto
  var __clearTestStorage: (() => void) | undefined;
}
