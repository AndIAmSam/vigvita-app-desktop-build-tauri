/**
 * Unit Test: UTF-8 Byte Length, Truncation, UUID Validation & Strict Numeric Coercion (API v16)
 */
import {
  getUtf8ByteLength,
  truncateToUtf8Bytes,
  isValidUuid,
  parseIntSafe,
  parseFloatSafe,
  toSafeString,
} from '../../utils/utf8';

describe('UTF-8 & Schema Coercion Utilities (API Desktop v16)', () => {
  describe('getUtf8ByteLength', () => {
    it('cuenta correctamente ASCII (1 byte por carácter)', () => {
      expect(getUtf8ByteLength('')).toBe(0);
      expect(getUtf8ByteLength('Juan Perez')).toBe(10);
      expect(getUtf8ByteLength('a'.repeat(100))).toBe(100);
    });

    it('cuenta correctamente acentos y ñ (2 bytes en UTF-8)', () => {
      // "José María Rodríguez Peña" -> 25 caracteres, 4 acentos/ñ (é, í, í, ñ) = 29 bytes
      const sample = 'José María Rodríguez Peña';
      expect(sample.length).toBe(25);
      expect(getUtf8ByteLength(sample)).toBe(29);
    });

    it('cuenta correctamente símbolos de 3 bytes y emojis de 4 bytes', () => {
      expect(getUtf8ByteLength('€')).toBe(3);
      expect(getUtf8ByteLength('🎉')).toBe(4);
      expect(getUtf8ByteLength('José 🎉')).toBe(5 + 1 + 4); // J(1)o(1)s(1)é(2) space(1) 🎉(4) = 10
    });
  });

  describe('truncateToUtf8Bytes', () => {
    it('no modifica cadenas que ya caben dentro del límite de bytes', () => {
      const name = 'José María Rodríguez Peña';
      expect(truncateToUtf8Bytes(name, 100)).toBe(name);
    });

    it('recorta nombres con acentos a <= 100 bytes UTF-8 sin exceder el tope', () => {
      // 60 letras 'á' = 120 bytes UTF-8 (aunque solo 60 caracteres)
      const accented = 'á'.repeat(60);
      expect(accented.length).toBe(60);
      expect(getUtf8ByteLength(accented)).toBe(120);

      const truncated = truncateToUtf8Bytes(accented, 100);
      expect(getUtf8ByteLength(truncated)).toBe(100);
      expect(truncated.length).toBe(50);
    });

    it('recorta notas de referidos con acentos a <= 255 bytes UTF-8', () => {
      // 150 letras 'ñ' = 300 bytes UTF-8
      const note = 'ñ'.repeat(150);
      const truncated = truncateToUtf8Bytes(note, 255);
      // 127 * 2 = 254 bytes (no cabe el 128 porque serían 256)
      expect(getUtf8ByteLength(truncated)).toBe(254);
      expect(truncated.length).toBe(127);
    });

    it('no parte emojis (surrogate pairs) en la frontera del límite', () => {
      // 98 bytes ASCII + emoji de 4 bytes = 102 bytes -> debe quedar solo los 98 bytes ASCII
      const str = 'a'.repeat(98) + '🚀';
      const truncated = truncateToUtf8Bytes(str, 100);
      expect(truncated).toBe('a'.repeat(98));
      expect(getUtf8ByteLength(truncated)).toBe(98);
    });

    it('maneja límites <= 0 y cadenas vacías', () => {
      expect(truncateToUtf8Bytes('Hola', 0)).toBe('');
      expect(truncateToUtf8Bytes('Hola', -5)).toBe('');
      expect(truncateToUtf8Bytes('', 100)).toBe('');
    });
  });

  describe('isValidUuid', () => {
    it('acepta UUIDs válidos en minúsculas y mayúsculas', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
      expect(isValidUuid('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(true);
    });

    it('rechaza cadenas no-UUID y otros tipos', () => {
      expect(isValidUuid('local-1')).toBe(false);
      expect(isValidUuid('srv-123')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // muy corto
      expect(isValidUuid('zzzzzzzz-e89b-12d3-a456-426614174000')).toBe(false); // hex inválido
      expect(isValidUuid(12345)).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
    });
  });

  describe('parseIntSafe, parseFloatSafe y toSafeString', () => {
    it('parseIntSafe garantiza enteros JSON estrictos', () => {
      expect(parseIntSafe('35')).toBe(35);
      expect(parseIntSafe('34.7')).toBe(35);
      expect(parseIntSafe(12.2)).toBe(12);
      expect(parseIntSafe('1,200')).toBe(1200);
      expect(parseIntSafe('')).toBe(0);
      expect(parseIntSafe(null)).toBe(0);
      expect(parseIntSafe('abc')).toBe(0);
      expect(parseIntSafe(Infinity)).toBe(0);
      expect(Object.is(parseIntSafe(-0), 0)).toBe(true);
      expect(Number.isInteger(parseIntSafe('42.9'))).toBe(true);
    });

    it('parseFloatSafe redondea a 2 decimales y evita NaN/Infinity', () => {
      expect(parseFloatSafe('785062.976')).toBe(785062.98);
      expect(parseFloatSafe('50,000.5')).toBe(50000.5);
      expect(parseFloatSafe('')).toBe(0);
      expect(parseFloatSafe(NaN)).toBe(0);
      expect(parseFloatSafe(Infinity)).toBe(0);
    });

    it('toSafeString convierte cualquier valor a string sin null/undefined', () => {
      expect(toSafeString('hola')).toBe('hola');
      expect(toSafeString(123)).toBe('123');
      expect(toSafeString(null)).toBe('');
      expect(toSafeString(undefined)).toBe('');
    });
  });
});
