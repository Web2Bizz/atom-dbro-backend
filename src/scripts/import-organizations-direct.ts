/**
 * Скрипт для импорта организаций из JSON файла напрямую в базу данных
 * 
 * Использование:
 *   npm run import:organizations-direct [PATH_TO_JSON]
 * 
 * Пример:
 *   npm run import:organizations-direct mock/organizations.json
 * 
 * Скрипт:
 * - Находит города по адресу (если cityId = 0)
 * - Находит или создает тип организации (если typeId = 0)
 * - Вставляет организации напрямую в БД
 * - Создает связи с типами помощи
 * - Пропускает организации, которые уже существуют (по имени и городу)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  cities,
  organizationTypes,
  organizationHelpTypes,
} from '../database/schema';
import { eq, ilike, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface OrganizationJsonData {
  name: string;
  cityId: number;
  typeId: number;
  helpTypeIds: number[];
  latitude: number;
  longitude: number;
  summary?: string;
  mission?: string;
  description?: string;
  goals?: string[];
  needs?: string[];
  address?: string;
  contacts?: Array<{ name: string; value: string }>;
  gallery?: string[];
}

/**
 * Извлечь название города из адреса
 * Примеры: "г. Ангарск" -> "Ангарск", "г. Волгодонск" -> "Волгодонск"
 */
function extractCityName(address: string): string | null {
  if (!address) return null;

  // Убираем лишние пробелы
  const trimmed = address.trim();

  // Паттерны для извлечения названия города
  const patterns = [
    /^г\.\s*(.+?)(?:,|$)/i, // "г. Название" или "г. Название, ..."
    /^г\s+(.+?)(?:,|$)/i, // "г Название" (без точки)
    /^(.+?)(?:,|$)/, // Просто название (если нет префикса)
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return trimmed;
}

/**
 * Найти город по названию (с учетом возможных вариаций)
 */
async function findCityByName(
  db: NodePgDatabase,
  cityName: string,
): Promise<number | null> {
  if (!cityName) return null;

  // Пробуем точное совпадение (без учета регистра)
  const [exactMatch] = await db
    .select()
    .from(cities)
    .where(ilike(cities.name, cityName));

  if (exactMatch) {
    return exactMatch.id;
  }

  // Пробуем найти по частичному совпадению
  const [partialMatch] = await db
    .select()
    .from(cities)
    .where(ilike(cities.name, `%${cityName}%`));

  if (partialMatch) {
    return partialMatch.id;
  }

  return null;
}

/**
 * Найти или создать тип организации
 * Если typeId = 0, используем дефолтный тип или создаем новый
 */
async function findOrCreateOrganizationType(
  db: NodePgDatabase,
  typeId: number,
  organizationName: string,
): Promise<number> {
  // Если указан конкретный ID и он не равен 0, используем его
  if (typeId > 0) {
    const [existingType] = await db
      .select()
      .from(organizationTypes)
      .where(eq(organizationTypes.id, typeId));

    if (existingType) {
      return existingType.id;
    } else {
      console.warn(`  ⚠ Тип организации с ID ${typeId} не найден, используем дефолтный`);
    }
  }

  // Если typeId = 0 или не найден, используем дефолтный тип "НКО"
  const [defaultType] = await db
    .select()
    .from(organizationTypes)
    .where(ilike(organizationTypes.name, 'НКО'));

  if (defaultType) {
    return defaultType.id;
  }

  // Если дефолтного типа нет, создаем его
  const [newType] = await db
    .insert(organizationTypes)
    .values({ name: 'НКО' })
    .returning();

  console.log(`  ✓ Создан тип организации: НКО (ID: ${newType.id})`);
  return newType.id;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get<NodePgDatabase>(DATABASE_CONNECTION);

  // Получаем путь к JSON файлу из аргументов командной строки
  const jsonPathArg = process.argv[2];
  if (!jsonPathArg) {
    console.error('Ошибка: необходимо указать путь к JSON файлу');
    console.error('Использование: npm run import:organizations-direct [PATH_TO_JSON]');
    await app.close();
    process.exit(1);
  }

  // Определяем полный путь к файлу
  const jsonPath = path.isAbsolute(jsonPathArg)
    ? jsonPathArg
    : path.join(process.cwd(), jsonPathArg);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Ошибка: файл ${jsonPath} не найден`);
    await app.close();
    process.exit(1);
  }

  console.log('Начинаем импорт организаций из JSON...\n');
  console.log(`Путь к файлу: ${jsonPath}\n`);

  // Читаем JSON файл
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  let organizationsData: OrganizationJsonData[];
  
  try {
    organizationsData = JSON.parse(jsonContent);
  } catch (error) {
    console.error('Ошибка при парсинге JSON файла:', error);
    await app.close();
    process.exit(1);
  }

  if (!Array.isArray(organizationsData)) {
    console.error('Ошибка: JSON файл должен содержать массив организаций');
    await app.close();
    process.exit(1);
  }

  console.log(`Найдено ${organizationsData.length} организаций в JSON\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < organizationsData.length; i++) {
    const orgData = organizationsData[i];
    console.log(`[${i + 1}/${organizationsData.length}] Обработка: ${orgData.name}`);

    try {
      // 1. Находим город
      let cityId: number | null = null;

      if (orgData.cityId > 0) {
        // Если указан cityId, проверяем его существование
        const [city] = await db
          .select()
          .from(cities)
          .where(eq(cities.id, orgData.cityId));

        if (city) {
          cityId = city.id;
        }
      }

      // Если cityId не найден или равен 0, пытаемся найти по адресу
      if (!cityId && orgData.address) {
        const cityName = extractCityName(orgData.address);
        if (cityName) {
          cityId = await findCityByName(db, cityName);
          if (cityId) {
            console.log(`  ✓ Найден город: ${cityName} (ID: ${cityId})`);
          } else {
            console.warn(`  ⚠ Город "${cityName}" не найден в базе данных`);
          }
        }
      }

      if (!cityId) {
        throw new Error(
          `Не удалось определить город для организации. cityId: ${orgData.cityId}, address: ${orgData.address}`,
        );
      }

      // 2. Находим или создаем тип организации
      const organizationTypeId = await findOrCreateOrganizationType(
        db,
        orgData.typeId,
        orgData.name,
      );

      // 3. Проверяем, существует ли уже организация с таким именем в этом городе
      const existingOrgs = await db
        .select()
        .from(organizations)
        .where(
          and(
            eq(organizations.name, orgData.name),
            eq(organizations.cityId, cityId),
          ),
        );

      if (existingOrgs.length > 0) {
        console.log(`  ⚠ Организация уже существует (ID: ${existingOrgs[0].id}), пропускаем`);
        skippedCount++;
        continue;
      }

      // 4. Вставляем организацию
      const [newOrganization] = await db
        .insert(organizations)
        .values({
          name: orgData.name,
          cityId: cityId,
          organizationTypeId: organizationTypeId,
          latitude: orgData.latitude?.toString(),
          longitude: orgData.longitude?.toString(),
          summary: orgData.summary,
          mission: orgData.mission,
          description: orgData.description,
          goals: orgData.goals || [],
          needs: orgData.needs || [],
          address: orgData.address,
          contacts: orgData.contacts || [],
          gallery: orgData.gallery || [],
        })
        .returning();

      console.log(`  ✓ Организация создана (ID: ${newOrganization.id})`);

      // 5. Вставляем связи с типами помощи
      if (orgData.helpTypeIds && orgData.helpTypeIds.length > 0) {
        const helpTypeValues = orgData.helpTypeIds
          .filter((id) => id > 0) // Фильтруем невалидные ID
          .map((helpTypeId) => ({
            organizationId: newOrganization.id,
            helpTypeId: helpTypeId,
          }));

        if (helpTypeValues.length > 0) {
          // Вставляем связи по одной, чтобы обработать возможные дубликаты
          let addedCount = 0;
          for (const helpTypeValue of helpTypeValues) {
            try {
              await db.insert(organizationHelpTypes).values(helpTypeValue);
              addedCount++;
            } catch (error: any) {
              // Игнорируем ошибки дубликатов (если связи уже существуют)
              if (!error.message?.includes('duplicate') && !error.code?.includes('23505')) {
                console.warn(`  ⚠ Ошибка при добавлении типа помощи ${helpTypeValue.helpTypeId}: ${error.message}`);
              }
            }
          }
          if (addedCount > 0) {
            console.log(`  ✓ Добавлено ${addedCount} типов помощи`);
          }
        }
      }

      successCount++;
      console.log('');
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ name: orgData.name, error: errorMessage });
      console.error(`  ✗ Ошибка: ${errorMessage}\n`);
    }
  }

  // Выводим итоги
  console.log('\n=== Итоги импорта ===');
  console.log(`Успешно: ${successCount}`);
  console.log(`Пропущено (уже существуют): ${skippedCount}`);
  console.log(`Ошибок: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nОшибки:');
    for (const err of errors) {
      console.log(`  - ${err.name}: ${err.error}`);
    }
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('Критическая ошибка при импорте:', error);
  process.exit(1);
});
