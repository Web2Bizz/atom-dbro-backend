/**
 * Утилиты для работы с координатами
 */

/**
 * Преобразует координату в число
 * @param coord - координата (может быть строкой или числом)
 * @returns число или null
 */
export function parseCoordinate(coord: string | number | null | undefined): number | null {
  if (coord === null || coord === undefined) return null;
  const parsed = typeof coord === 'string' ? parseFloat(coord) : coord;
  return isNaN(parsed) ? null : parsed;
}

/**
 * Форматирует координату для сохранения в базу данных
 * @param coord - координата (может быть числом или undefined)
 * @param defaultValue - значение по умолчанию (строка или null)
 * @returns строка для сохранения в БД
 */
export function formatCoordinateForDb(coord: number | undefined, defaultValue: string | null): string {
  if (coord !== undefined) {
    return coord.toString();
  }
  return defaultValue || '';
}

