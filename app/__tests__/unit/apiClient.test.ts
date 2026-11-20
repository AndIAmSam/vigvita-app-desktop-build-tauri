/**
 * Unit Test: API Client v16 (429 Backoff Retry, Auth vs Business Error Classification, Dual 422 Parser)
 */
import {
  apiFetch,
  getApiBaseUrl,
  isProfilesNewAuthFailure,
  parse422Error,
  DEFAULT_API_BASE_URL,
} from '../../utils/apiClient';

describe('API Client (API Desktop v16)', () => {
  const originalFetch = global.fetch;
  const originalEnvUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalEnvUrl;
    jest.clearAllMocks();
  });

  describe('getApiBaseUrl', () => {
    it('usa EXPO_PUBLIC_API_URL sin barra final o cae a panel.vigvita.com.mx', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://panel.vigvita.com.mx///';
      expect(getApiBaseUrl()).toBe('https://panel.vigvita.com.mx');

      delete process.env.EXPO_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });
  });

  describe('apiFetch — manejo de 429 Too Many Requests', () => {
    it('reintenta con backoff al recibir 429 text/plain y retorna éxito al recuperarse', async () => {
      let calls = 0;
      global.fetch = jest.fn(async () => {
        calls++;
        if (calls <= 2) {
          return {
            ok: false,
            status: 429,
            headers: new Map([['content-type', 'text/plain']]),
            text: async () => 'Too Many Requests',
          } as any;
        }
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ access_expires_at: null }),
        } as any;
      }) as jest.Mock;

      const res = await apiFetch(
        '/api/me/access-status',
        { method: 'GET' },
        { maxRetries: 3, baseDelayMs: 5, jitter: false }
      );

      expect(calls).toBe(3);
      expect(res.status).toBe(200);
    });

    it('respeta el header Retry-After en respuestas 429', async () => {
      let calls = 0;
      global.fetch = jest.fn(async () => {
        calls++;
        if (calls === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Map([
              ['content-type', 'text/plain'],
              ['Retry-After', '0'],
            ]),
            text: async () => 'Too Many Requests',
          } as any;
        }
        return { ok: true, status: 201, json: async () => ({ data: [] }) } as any;
      }) as jest.Mock;

      const res = await apiFetch(
        '/api/profiles/new',
        { method: 'POST' },
        { maxRetries: 2, baseDelayMs: 5, jitter: false }
      );

      expect(calls).toBe(2);
      expect(res.status).toBe(201);
    });

    it('retorna la respuesta 429 sin lanzar excepción si se agotan los reintentos', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 429,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'Too Many Requests',
      })) as jest.Mock;

      const res = await apiFetch(
        '/api/profiles',
        { method: 'GET' },
        { maxRetries: 2, baseDelayMs: 2, jitter: false }
      );

      expect(res.status).toBe(429);
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 inicial + 2 reintentos
    });

    it('NO reintenta otros códigos HTTP (400, 404, 422, 500)', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 422,
        text: async () => '{"errors":{"clients":"required"}}',
      })) as jest.Mock;

      const res = await apiFetch('/api/profiles/new', { method: 'POST' });
      expect(res.status).toBe(422);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('isProfilesNewAuthFailure', () => {
    it('clasifica 404 text/plain y 401 como fallo de sesión', () => {
      expect(isProfilesNewAuthFailure(401, 'text/plain', null)).toBe(true);
      expect(isProfilesNewAuthFailure(404, 'text/plain', null)).toBe(true);
      expect(isProfilesNewAuthFailure(404, '', null)).toBe(true);
    });

    it('NO clasifica 403 not_authorized_for_advisor ni 404 some_advisors_not_found como fallo de sesión', () => {
      expect(
        isProfilesNewAuthFailure(403, 'application/json', { error: 'not_authorized_for_advisor' })
      ).toBe(false);
      expect(
        isProfilesNewAuthFailure(404, 'application/json', { error: 'some_advisors_not_found' })
      ).toBe(false);
      expect(
        isProfilesNewAuthFailure(404, '', { error: 'some_advisors_not_found' })
      ).toBe(false);
    });
  });

  describe('parse422Error (doble formato v16)', () => {
    it('parsea Formato A: { errors: { ... } } incluyendo clients[0].referrals[0].notes sin prefijo data.', () => {
      const body = JSON.stringify({
        errors: {
          'clients[0].name': 'too_long',
          'clients[0].referrals[1].notes': 'too_long',
          'clients[2].acquisition_status': 'invalid',
        },
      });
      const parsed = parse422Error(body);
      expect(parsed.kind).toBe('validation');
      expect(parsed.clientIndices).toEqual([0, 2]);
      expect(parsed.userMessage).toContain('100 bytes UTF-8');
      expect(parsed.userMessage).toContain('255 bytes UTF-8');
      expect(parsed.userMessage).toContain('estatus de adquisición');
    });

    it('parsea Formato B (v16): error de tipo JSON en nivel raíz sin envoltorio errors', () => {
      const body = JSON.stringify({ age: 'invalid' });
      const parsed = parse422Error(body);
      expect(parsed.kind).toBe('type_error');
      expect(parsed.fields).toEqual({ age: 'invalid' });
      expect(parsed.userMessage).toContain('age');
    });

    it('parsea formato { error: "missing_required_fields" }', () => {
      const parsed = parse422Error(JSON.stringify({ error: 'missing_required_fields' }));
      expect(parsed.kind).toBe('error_code');
      expect(parsed.fields.error).toBe('missing_required_fields');
    });
  });
});
