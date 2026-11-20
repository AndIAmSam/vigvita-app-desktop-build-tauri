/**
 * Cliente HTTP y parsers de respuestas alineados con VigADN Desktop API v16.
 *
 * Responsabilidades:
 * - Centralizar la URL base (todos los `/api/*` responden solo en https://panel.vigvita.com.mx).
 * - Manejar `429 Too Many Requests` (`text/plain`) con backoff exponencial + jitter y reintento.
 * - Configurar timeout de red mayor al `write: 10s` del servidor.
 * - Distinguir fallos de autenticación (`404 text/plain` / `401`) de errores de negocio
 *   (`403 not_authorized_for_advisor` y `404 some_advisors_not_found` en `application/json`).
 * - Parsear ambos formatos de `422` en v16: validación `{ "errors": { ... } }` y tipo JSON
 *   incorrecto `{ "field_name": "invalid" }` en nivel raíz.
 */

import { Logger } from "./logger";

export const DEFAULT_API_BASE_URL = "https://panel.vigvita.com.mx";
export const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024; // 5 MB (global_specs.constraints.max_body_size)
export const SAFE_BATCH_BODY_BYTES = 4 * 1024 * 1024; // Margen de seguridad antes de chunkear
export const DEFAULT_CLIENT_TIMEOUT_MS = 20000; // > server write timeout (10s)

const isTestEnv = (): boolean =>
  typeof process !== "undefined" && Boolean(process.env?.JEST_WORKER_ID);

export const getApiBaseUrl = (): string => {
  const configured =
    typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_API_URL : undefined;
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
};

export interface ApiRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  jitter?: boolean;
}

export const getHeaderCaseInsensitive = (headers: any, name: string): string | null => {
  if (!headers) return null;
  const target = name.toLowerCase();

  if (typeof headers.get === "function") {
    const direct = headers.get(name) ?? headers.get(target);
    if (direct !== undefined && direct !== null) return String(direct);
    if (typeof headers.forEach === "function") {
      let found: string | null = null;
      headers.forEach((value: any, key: string) => {
        if (found === null && String(key).toLowerCase() === target) {
          found = String(value);
        }
      });
      return found;
    }
    return null;
  }

  if (typeof headers === "object") {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === target && v !== undefined && v !== null) {
        return String(v);
      }
    }
  }
  return null;
};

export const parseRetryAfterMs = (response: any, maxCapMs = 15000): number | null => {
  const retryAfter = getHeaderCaseInsensitive(response?.headers, "retry-after");
  if (!retryAfter) return null;

  const trimmed = retryAfter.trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), maxCapMs);
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const diff = parsedDate - Date.now();
    return Math.min(Math.max(diff, 0), maxCapMs);
  }

  return null;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrapper sobre `fetch` que aplica:
 * - Resolución de rutas relativas `/api/...` contra `getApiBaseUrl()`.
 * - Backoff exponencial con jitter y reintento ante `429 Too Many Requests`.
 * - Timeout seguro (`> 10s` del servidor) cuando `AbortController` está disponible.
 */
export const apiFetch = async (
  pathOrUrl: string,
  init: RequestInit = {},
  retryOptions: ApiRetryOptions = {}
): Promise<Response> => {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${getApiBaseUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  const testMode = isTestEnv();
  const maxRetries = retryOptions.maxRetries ?? 3;
  const baseDelayMs = retryOptions.baseDelayMs ?? (testMode ? 5 : 1000);
  const maxDelayMs = retryOptions.maxDelayMs ?? (testMode ? 25 : 8000);
  const timeoutMs = retryOptions.timeoutMs ?? (testMode ? 0 : DEFAULT_CLIENT_TIMEOUT_MS);
  const useJitter = retryOptions.jitter ?? !testMode;

  let attempt = 0;

  while (true) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let fetchInit: RequestInit = init;

    if (timeoutMs > 0 && !init.signal && typeof AbortController !== "undefined") {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      fetchInit = { ...init, signal: controller.signal };
    }

    let response: Response;
    try {
      response = await fetch(url, fetchInit);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    if (response.status !== 429 || attempt >= maxRetries) {
      return response;
    }

    const headerDelay = parseRetryAfterMs(response, maxDelayMs);
    const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
    const jitterMs = useJitter ? Math.floor(Math.random() * Math.min(300, expDelay * 0.25)) : 0;
    const waitMs = headerDelay !== null ? headerDelay : expDelay + jitterMs;

    Logger.warn(`Rate limit 429 recibido. Reintentando tras backoff`, {
      url,
      attempt: attempt + 1,
      maxRetries,
      waitMs,
    });

    attempt++;
    await sleep(waitMs);
  }
};

export interface ParsedResponseBody {
  text: string;
  json: any | null;
  contentType: string;
}

/**
 * Lee de forma segura el texto y el JSON (si aplica) de una respuesta HTTP,
 * tolerando respuestas `text/plain` y mocks parciales en pruebas.
 */
export const safeReadResponseBody = async (response: any): Promise<ParsedResponseBody> => {
  const contentType = (getHeaderCaseInsensitive(response?.headers, "content-type") || "").toLowerCase();
  let text = "";
  let json: any | null = null;

  if (typeof response?.text === "function") {
    try {
      text = await response.text();
    } catch {
      text = "";
    }
  }

  if (text && text.trim().length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  } else if (typeof response?.json === "function") {
    try {
      const parsed = await response.json();
      if (parsed !== undefined && parsed !== null) {
        json = parsed;
        text = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      }
    } catch {
      json = null;
    }
  }

  return { text, json, contentType };
};

/**
 * En `POST /api/profiles/new` (API v16):
 * - Fallo de auth/permiso: `404` con `text/plain` (o `401` defensivo).
 * - Error de negocio de `advisor_id`: `403 { "error": "not_authorized_for_advisor" }`
 *   o `404 { "error": "some_advisors_not_found" }` (`application/json`).
 * Estos errores de negocio NUNCA deben cerrar la sesión del usuario.
 */
export const isProfilesNewAuthFailure = (
  status: number,
  contentType: string,
  parsedJson: any
): boolean => {
  if (status === 401) return true;
  if (status === 403) return false;
  if (status === 404) {
    if (parsedJson && typeof parsedJson === "object" && typeof parsedJson.error === "string") {
      return false;
    }
    if (contentType.includes("application/json") && parsedJson !== null) {
      return false;
    }
    return true;
  }
  return false;
};

export interface Parsed422Error {
  kind: "validation" | "type_error" | "error_code" | "unknown";
  fields: Record<string, string>;
  clientIndices: number[];
  userMessage: string;
  raw: string;
}

const translateFieldError = (fieldPath: string, slug: string): string => {
  const normalizedSlug = String(slug || "").toLowerCase();

  if (fieldPath === "clients" && normalizedSlug === "required") {
    return "No se enviaron prospectos para sincronizar.";
  }

  if (/^clients\[\d+\]\.name$/.test(fieldPath)) {
    if (normalizedSlug === "too_long") {
      return "El nombre del cliente excede el límite de 100 bytes UTF-8 (acentos cuentan doble).";
    }
    if (normalizedSlug === "required") {
      return "El nombre del cliente es obligatorio.";
    }
  }

  // En v16 la clave de notas de referido omite `data.` -> clients[0].referrals[0].notes
  if (/^clients\[\d+\]\.(?:data\.)?referrals\[\d+\]\.notes$/.test(fieldPath)) {
    if (normalizedSlug === "too_long") {
      return "La nota de un referido excede el límite de 255 bytes UTF-8 (acentos cuentan doble).";
    }
  }

  if (/^clients\[\d+\]\.acquisition_status$/.test(fieldPath)) {
    return "El estatus de adquisición del prospecto no es válido.";
  }

  if (/^clients\[\d+\]\.accompaniment_status$/.test(fieldPath)) {
    return "El estatus de acompañamiento del prospecto no es válido.";
  }

  return `Campo inválido (${fieldPath}: ${slug}).`;
};

/**
 * Parsea ambos formatos de error 422 documentados en API Desktop v16:
 * 1) Validación de negocio: `{ "errors": { "clients[0].referrals[0].notes": "too_long" } }`
 * 2) Tipo JSON incorrecto (sin envoltorio `errors`): `{ "field_name": "invalid" }`
 */
export const parse422Error = (text: string, preParsedJson?: any): Parsed422Error => {
  let parsed = preParsedJson;
  if (parsed === undefined && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    // Formato A: { "errors": { field: slug } }
    if (parsed.errors && typeof parsed.errors === "object" && !Array.isArray(parsed.errors)) {
      const fields: Record<string, string> = {};
      const indicesSet = new Set<number>();
      const messages: string[] = [];

      for (const [k, v] of Object.entries(parsed.errors)) {
        const slug = String(v);
        fields[k] = slug;
        const idxMatch = /^clients\[(\d+)\]\./.exec(k);
        if (idxMatch) indicesSet.add(Number(idxMatch[1]));
        messages.push(translateFieldError(k, slug));
      }

      return {
        kind: "validation",
        fields,
        clientIndices: Array.from(indicesSet).sort((a, b) => a - b),
        userMessage:
          messages.length > 0
            ? messages.join("\n")
            : "Error de validación en los datos del prospecto.",
        raw: text,
      };
    }

    // Formato /api/login: { "error": "missing_required_fields" }
    if (typeof parsed.error === "string") {
      return {
        kind: "error_code",
        fields: { error: parsed.error },
        clientIndices: [],
        userMessage: `Error de validación: ${parsed.error}`,
        raw: text,
      };
    }

    // Formato B (v16): tipo JSON incorrecto en nivel raíz, sin envoltorio `errors`
    // Ej: { "field_name": "invalid" }
    const entries = Object.entries(parsed).filter(([, v]) => typeof v === "string");
    if (entries.length > 0) {
      const fields: Record<string, string> = {};
      const indicesSet = new Set<number>();
      const messages: string[] = [];

      for (const [k, v] of entries) {
        const slug = String(v);
        fields[k] = slug;
        const idxMatch = /^clients\[(\d+)\]\./.exec(k);
        if (idxMatch) indicesSet.add(Number(idxMatch[1]));
        messages.push(`Tipo de dato inválido en "${k}" (${slug}).`);
      }

      return {
        kind: "type_error",
        fields,
        clientIndices: Array.from(indicesSet).sort((a, b) => a - b),
        userMessage: messages.join("\n"),
        raw: text,
      };
    }
  }

  return {
    kind: "unknown",
    fields: {},
    clientIndices: [],
    userMessage: text ? `Error 422: ${text.substring(0, 120)}` : "Error de validación (422).",
    raw: text,
  };
};
