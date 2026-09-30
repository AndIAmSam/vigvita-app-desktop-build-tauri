/**
 * Unit Test: University Cost Database & Projection Functions
 * 
 * Tests exact year lookups, future year inflation projections,
 * boundary conditions, and unknown university fallbacks.
 */
import {
  UNIVERSIDADES,
  LISTA_UNIVERSIDADES,
  getCostoUniversidad,
} from '../../constants/UniversityData';

describe('UniversityData Constants & Calculations', () => {
  it('Exporta lista de universidades válida y no vacía', () => {
    expect(LISTA_UNIVERSIDADES.length).toBeGreaterThan(5);
    expect(LISTA_UNIVERSIDADES).toContain('Unitec');
    expect(LISTA_UNIVERSIDADES).toContain('Tec de Monterrey');
    expect(LISTA_UNIVERSIDADES).toContain('USA');
  });

  it('Retorna costo exacto para año disponible en base de datos', () => {
    // Unitec 2024
    const costo2024 = getCostoUniversidad('Unitec', 2024);
    expect(costo2024).toBe(307558.74);

    // Tec de Monterrey 2030
    const costoTec = getCostoUniversidad('Tec de Monterrey', 2030);
    expect(costoTec).toBe(2651017.34);
  });

  it('Calcula proyección con inflación para años futuros mayores al máximo', () => {
    // Máximo año en Unitec es 2042 ($816,184.26)
    const costo2042 = getCostoUniversidad('Unitec', 2042);
    const costo2043 = getCostoUniversidad('Unitec', 2043);
    const costo2045 = getCostoUniversidad('Unitec', 2045);

    expect(costo2043).toBeGreaterThan(costo2042);
    expect(costo2045).toBeGreaterThan(costo2043);
    // Verificamos que sea un número finito positivo
    expect(Number.isFinite(costo2045)).toBe(true);
  });

  it('Retorna primer año si el año solicitado es menor al mínimo', () => {
    // Unitec año mínimo es 2024
    const costoAntiguo = getCostoUniversidad('Unitec', 2010);
    const costoMinimo = getCostoUniversidad('Unitec', 2024);

    expect(costoAntiguo).toBe(costoMinimo);
  });

  it('Retorna 0 para universidad desconocida', () => {
    expect(getCostoUniversidad('Universidad Falsa Inexistente', 2026)).toBe(0);
    expect(getCostoUniversidad('', 2026)).toBe(0);
  });

  it('Todas las universidades tienen costos crecientes año con año', () => {
    for (const uni of LISTA_UNIVERSIDADES) {
      const data = UNIVERSIDADES[uni];
      const years = Object.keys(data).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < years.length; i++) {
        expect(data[years[i]]).toBeGreaterThan(data[years[i - 1]]);
      }
    }
  });
});
