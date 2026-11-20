/**
 * Lista de usuarios ocultos exclusivamente para el rol SuperAdmin en el selector
 * "Nuevo ADN para otro asesor" del panel.
 *
 * IMPORTANTE:
 * - Solo aplica cuando el usuario autenticado es SuperAdmin (`isAdmin === true`).
 * - NO afecta a TeamLeader, Advisor ni Advisor_Trainee.
 * - Solo filtra la visualización del selector en la UI; NO altera `equipoLider`,
 *   cachés de UUIDs, hidratación de `relationship.created_for` ni sincronización.
 */

export const ADMIN_IGNORED_ADVISORS: readonly string[] = [
  "ALEXIA EKATHERINNE RODRIGUEZ BUTTERFIELD",
  "ANGEL MANUEL SALDATE MAZON",
  "ANGELICA GARCIA RUIZ",
  "ARIANNA MARIA DEL RAYO CANCELA MORALES",
  "Asesor Huérfano Migración",
  "EVELYN HERNANDEZ RAMIREZ",
  "EVER",
  "FRANCISCO FERNANDO IBARRA TENORIO",
  "GUSTAVO ALBERTO NAVA REYNOSOB",
  "HERSCHELL ESQUIVEL MORALES",
  "IGNACIO FIGUEROA PAZOS",
  "LORENA GONZALEZ MENDEZ RUIZ ESPARZA",
  "LUIS DANIEL BERNAL MENDOZA",
  "Majo Garcia",
  "MARCELA PARTIDA REYES",
  "MARCO ANTONIO RAMIREZ HERNANDEZ",
  "MARIA FERNANDA DE JESUS MORENO BRAVO",
  "MAURICIO ABRAHAM SALDIERNA RAMIREZ",
  "MONICA BERALD BERMUDEZ ALDUNCIN",
  "NORA MORALES CABRERA",
  "PERLA AMBRIZ ZARCO",
  "RENE VALDEZ CHAVEZ",
  "ROCIO IVALU ACOSTA CAPI",
  "ROSARIO MARTINEZ HERNANDEZ",
  "TIHUITI DE LA SANCHA ARRIETA",
  "URIEL LOPEZ RICO",
  "VICTOR DANIEL CUEVAS CLEMENTE",
] as const;

/**
 * Normaliza un nombre para comparación exacta insensible a mayúsculas,
 * acentos/diacríticos y espacios múltiples.
 */
export const normalizeAdvisorName = (name: string): string => {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

const IGNORED_ADMIN_ADVISORS_SET = new Set<string>(
  ADMIN_IGNORED_ADVISORS.map(normalizeAdvisorName)
);

/**
 * Devuelve `true` solo si el nombre completo normalizado coincide exactamente
 * con alguno de los usuarios ignorados para el rol SuperAdmin.
 */
export const isAdvisorIgnoredForAdmin = (name: string): boolean => {
  if (!name) return false;
  return IGNORED_ADMIN_ADVISORS_SET.has(normalizeAdvisorName(name));
};

/**
 * Filtra la lista visible del selector de asesores:
 * - Si `isAdmin` es `false` (TeamLeader u otro rol), retorna la lista intacta.
 * - Si `isAdmin` es `true`, oculta únicamente los usuarios en `ADMIN_IGNORED_ADVISORS`.
 */
export const filterVisibleAdvisors = <T extends { nombre: string }>(
  advisors: T[],
  isAdmin: boolean
): T[] => {
  if (!isAdmin) return advisors;
  return advisors.filter((advisor) => !isAdvisorIgnoredForAdmin(advisor.nombre));
};
