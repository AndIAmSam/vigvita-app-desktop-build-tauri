/**
 * Utilidades UTF-8, UUID y coerción numérica estricta para API Desktop v16.
 *
 * En v16, el servidor mide límites de longitud en BYTES UTF-8 (no caracteres UTF-16):
 * - clients[].name: máx. 100 bytes UTF-8
 * - clients[].data.referrals[].notes: máx. 255 bytes UTF-8
 * Además, los campos `id` y `advisor_id` deben ser UUID bien formados o devuelven 400 text/plain,
 * y los campos marcados como `integer` en el esquema deben enviarse como enteros JSON estrictos.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Calcula la longitud exacta en bytes UTF-8 de una cadena, compatible con
 * Web, React Native (Hermes/JSC) y Jest sin depender de TextEncoder global.
 */
export const getUtf8ByteLength = (str: string): number => {
  if (!str) return 0;
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i);
    if (code === undefined) break;
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code <= 0xffff) {
      bytes += 3;
    } else {
      bytes += 4;
      i++; // Saltar surrogate pair bajo
    }
  }
  return bytes;
};

/**
 * Recorta una cadena para que su representación UTF-8 nunca exceda `maxBytes`,
 * respetando code points Unicode completos (no parte acentos ni emojis/surrogates).
 */
export const truncateToUtf8Bytes = (str: string, maxBytes: number): string => {
  if (!str || maxBytes <= 0) return "";
  if (getUtf8ByteLength(str) <= maxBytes) return str;

  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i);
    if (code === undefined) break;

    let charBytes: number;
    let charUnits = 1;
    if (code <= 0x7f) {
      charBytes = 1;
    } else if (code <= 0x7ff) {
      charBytes = 2;
    } else if (code <= 0xffff) {
      charBytes = 3;
    } else {
      charBytes = 4;
      charUnits = 2;
    }

    if (bytes + charBytes > maxBytes) {
      return str.slice(0, i);
    }

    bytes += charBytes;
    if (charUnits === 2) {
      i++; // Saltar surrogate pair bajo
    }
  }

  return str;
};

/**
 * Verifica que un valor sea un string UUID estándar (8-4-4-4-12 hex).
 * Previene respuestas 400 text/plain al decodificar `id` o `advisor_id`.
 */
export const isValidUuid = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
};

/**
 * Convierte de forma segura a entero JSON para campos `type: integer` del esquema v16.
 * Nunca devuelve NaN, Infinity, -0 ni decimales.
 */
export const parseIntSafe = (val: unknown): number => {
  if (val === null || val === undefined || val === "") return 0;
  const num =
    typeof val === "number"
      ? val
      : Number(String(val).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num);
  return rounded === 0 ? 0 : rounded;
};

/**
 * Convierte de forma segura a número decimal (hasta 2 decimales) para campos `type: number`.
 */
export const parseFloatSafe = (val: unknown): number => {
  if (val === null || val === undefined || val === "") return 0;
  const num =
    typeof val === "number"
      ? val
      : Number(String(val).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 100) / 100;
  return rounded === 0 ? 0 : rounded;
};

/**
 * Convierte a string seguro para campos `type: string` del esquema v16.
 */
export const toSafeString = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  return String(val);
};
