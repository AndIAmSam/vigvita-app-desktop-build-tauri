/**
 * Unit Test: Admin Ignored Advisors Filter
 *
 * Verifica que los 27 usuarios ignorados se oculten exclusivamente para SuperAdmin
 * (`isAdmin === true`), sin afectar a TeamLeader ni producir falsos positivos.
 */
import {
  ADMIN_IGNORED_ADVISORS,
  normalizeAdvisorName,
  isAdvisorIgnoredForAdmin,
  filterVisibleAdvisors,
} from '../../constants/AdminIgnoredAdvisors';

describe('AdminIgnoredAdvisors — Filtro exclusivo de SuperAdmin', () => {
  const sampleValidAdvisors = [
    { id: '11111111-1111-4111-8111-111111111111', nombre: 'JUAN PEREZ LOPEZ' },
    { id: '22222222-2222-4222-8222-222222222222', nombre: 'EVERARDO LOPEZ' },
    { id: '33333333-3333-4333-8333-333333333333', nombre: 'MAJO GARCIA PEREZ' },
    { id: '44444444-4444-4444-8444-444444444444', nombre: 'ANGEL MANUEL SALDATE' },
  ];

  it('contiene exactamente los 27 nombres especificados', () => {
    expect(ADMIN_IGNORED_ADVISORS).toHaveLength(27);
    expect(new Set(ADMIN_IGNORED_ADVISORS.map(normalizeAdvisorName)).size).toBe(27);
  });

  it('oculta los 27 usuarios cuando isAdmin es true y conserva a los asesores válidos', () => {
    const ignoredEntries = ADMIN_IGNORED_ADVISORS.map((nombre, idx) => ({
      id: `ignored-${idx}`,
      nombre,
    }));
    const fullList = [...ignoredEntries, ...sampleValidAdvisors];

    const filtered = filterVisibleAdvisors(fullList, true);

    expect(filtered).toEqual(sampleValidAdvisors);
    for (const ignoredName of ADMIN_IGNORED_ADVISORS) {
      expect(filtered.some((a) => a.nombre === ignoredName)).toBe(false);
    }
  });

  it('NO oculta a ningún usuario cuando isAdmin es false (TeamLeader / otros roles)', () => {
    const ignoredEntries = ADMIN_IGNORED_ADVISORS.map((nombre, idx) => ({
      id: `ignored-${idx}`,
      nombre,
    }));
    const fullList = [...ignoredEntries, ...sampleValidAdvisors];

    const result = filterVisibleAdvisors(fullList, false);

    expect(result).toBe(fullList);
    expect(result).toHaveLength(fullList.length);
  });

  it('maneja variaciones de mayúsculas, acentos y espacios sin falsos positivos parciales', () => {
    expect(isAdvisorIgnoredForAdmin('asesor huerfano migracion')).toBe(true);
    expect(isAdvisorIgnoredForAdmin('  Asesor   Huérfano   Migración  ')).toBe(true);
    expect(isAdvisorIgnoredForAdmin('majo garcía')).toBe(true);
    expect(isAdvisorIgnoredForAdmin('ÁNGEL MANUEL SALDATE MAZÓN')).toBe(true);
    expect(isAdvisorIgnoredForAdmin('ever')).toBe(true);
    expect(isAdvisorIgnoredForAdmin('GUSTAVO ALBERTO NAVA REYNOSOB')).toBe(true);

    // No deben coincidir nombres parciales o similares
    expect(isAdvisorIgnoredForAdmin('EVERARDO LOPEZ')).toBe(false);
    expect(isAdvisorIgnoredForAdmin('MAJO GARCIA PEREZ')).toBe(false);
    expect(isAdvisorIgnoredForAdmin('GUSTAVO ALBERTO NAVA REYNOSO')).toBe(false);
    expect(isAdvisorIgnoredForAdmin('')).toBe(false);
  });

  it('no muta el arreglo original de equipoLider', () => {
    const original = [
      { id: '1', nombre: 'EVER' },
      { id: '2', nombre: 'MARIA LOPEZ' },
    ];
    const snapshot = [...original];

    const result = filterVisibleAdvisors(original, true);

    expect(result).toEqual([{ id: '2', nombre: 'MARIA LOPEZ' }]);
    expect(original).toEqual(snapshot);
  });
});
