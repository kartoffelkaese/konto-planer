/**
 * Löst den Gehaltstag für API- und Filterlogik auf.
 * Query-Parameter überschreiben nur bei gültigem Wert (1–31).
 */
export function resolveSalaryDay(
  param: string | null | undefined,
  userSalaryDay: number
): number {
  if (param != null && param !== '') {
    const parsed = parseInt(param, 10)
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) {
      return parsed
    }
  }
  return userSalaryDay
}
