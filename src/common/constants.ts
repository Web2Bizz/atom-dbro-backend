/**
 * Константы приложения
 */

/**
 * Максимальное количество изображений в галерее квеста или организации
 */
export const MAX_GALLERY_IMAGES = 10;

/**
 * Минимальный уровень пользователя для создания квеста
 * ВРЕМЕННО: порог снижен до 0 (обычно требуется уровень 5)
 */
export const MIN_LEVEL_TO_CREATE_QUEST = 0;

/**
 * Максимальный размер файла в байтах (10 MB)
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Максимальное количество файлов в multipart запросе
 */
export const MAX_MULTIPART_FILES = 20;

/**
 * Количество раундов соли для bcrypt хеширования паролей
 */
export const BCRYPT_SALT_ROUNDS = 10;

