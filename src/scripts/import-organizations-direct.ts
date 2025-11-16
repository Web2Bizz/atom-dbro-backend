/**
 * Скрипт для прямого импорта организаций в базу данных (без API)
 * 
 * Использование:
 *   npm run import:organizations-direct [JSON_FILE_PATH] [USER_ID]
 * 
 * Пример:
 *   npm run import:organizations-direct mock/organizations\ \(2\).json 1
 * 
 * USER_ID - ID пользователя, который будет владельцем всех импортированных организаций
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  organizationOwners,
  organizationHelpTypes,
  cities,
  organizationTypes,
  helpTypes,
} from '../database/schema';
import { eq, inArray } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

interface OrganizationData {
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

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get<NodePgDatabase>(DATABASE_CONNECTION);

  // Получаем параметры
  const jsonFilePath = process.env.JSON_FILE_PATH || process.argv[2] || 'mock/organizations (2).json';
  const ownerUserId = parseInt(process.env.USER_ID || process.argv[3] || '1', 10);

  if (isNaN(ownerUserId) || ownerUserId <= 0) {
    console.error('Ошибка: USER_ID должен быть положительным числом');
    console.error('Использование:');
    console.error('  npm run import:organizations-direct [JSON_FILE_PATH] [USER_ID]');
    process.exit(1);
  }

  // Загружаем данные из JSON файла
  let organizationsData: OrganizationData[];
  try {
    const filePath = join(process.cwd(), jsonFilePath);
    console.log(`Загрузка данных из файла: ${filePath}`);
    const fileContent = readFileSync(filePath, 'utf-8');
    organizationsData = JSON.parse(fileContent);
    console.log(`✓ Загружено ${organizationsData.length} организаций из файла\n`);
  } catch (error) {
    console.error(`Ошибка при загрузке файла ${jsonFilePath}:`, error);
    process.exit(1);
  }

  // Загружаем справочники
  console.log('Загрузка справочников...');
  const allCities = await db.select().from(cities);
  const allOrganizationTypes = await db.select().from(organizationTypes);
  const allHelpTypes = await db.select().from(helpTypes);

  const cityMap = new Map<number, typeof allCities[0]>();
  for (const city of allCities) {
    cityMap.set(city.id, city);
  }

  const cityNameMap = new Map<string, typeof allCities[0]>();
  for (const city of allCities) {
    const key = city.name.toLowerCase().trim();
    if (!cityNameMap.has(key)) {
      cityNameMap.set(key, city);
    }
  }

  const organizationTypeMap = new Map<number, typeof allOrganizationTypes[0]>();
  for (const orgType of allOrganizationTypes) {
    organizationTypeMap.set(orgType.id, orgType);
  }

  const helpTypeMap = new Map<number, typeof allHelpTypes[0]>();
  for (const helpType of allHelpTypes) {
    helpTypeMap.set(helpType.id, helpType);
  }

  console.log(`✓ Загружено ${allCities.length} городов`);
  console.log(`✓ Загружено ${allOrganizationTypes.length} типов организаций`);
  console.log(`✓ Загружено ${allHelpTypes.length} типов помощи\n`);

  /**
   * Извлечь название города из адреса
   */
  function extractCityNameFromAddress(address: string): string | null {
    if (!address) return null;
    const match = address.match(/г\.\s*([^,]+)|^([^,]+)/);
    if (match) {
      return (match[1] || match[2]).trim();
    }
    return null;
  }

  /**
   * Найти город
   */
  function findCity(orgData: OrganizationData): typeof allCities[0] | null {
    // Если cityId > 0, ищем по ID
    if (orgData.cityId > 0) {
      return cityMap.get(orgData.cityId) || null;
    }

    // Если cityId = 0, пытаемся найти по адресу
    if (orgData.address) {
      const cityName = extractCityNameFromAddress(orgData.address);
      if (cityName) {
        const key = cityName.toLowerCase().trim();
        return cityNameMap.get(key) || null;
      }
    }

    return null;
  }

  // Импортируем организации
  console.log(`Начинаем импорт ${organizationsData.length} организаций...\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < organizationsData.length; i++) {
    const orgData = organizationsData[i];
    console.log(`[${i + 1}/${organizationsData.length}] Обработка: ${orgData.name}`);

    try {
      // Находим город
      const city = findCity(orgData);
      if (!city) {
        throw new Error(
          `Город не найден. cityId=${orgData.cityId}, address="${orgData.address}"`
        );
      }

      // Проверяем тип организации
      if (!organizationTypeMap.has(orgData.typeId)) {
        throw new Error(`Тип организации с ID ${orgData.typeId} не найден`);
      }

      // Проверяем типы помощи
      const missingHelpTypes: number[] = [];
      for (const helpTypeId of orgData.helpTypeIds || []) {
        if (!helpTypeMap.has(helpTypeId)) {
          missingHelpTypes.push(helpTypeId);
        }
      }
      if (missingHelpTypes.length > 0) {
        throw new Error(`Типы помощи с ID ${missingHelpTypes.join(', ')} не найдены`);
      }

      // Используем координаты из данных или из города
      const latitude = orgData.latitude !== undefined
        ? orgData.latitude.toString()
        : city.latitude;
      const longitude = orgData.longitude !== undefined
        ? orgData.longitude.toString()
        : city.longitude;

      // Создаем организацию
      const [organization] = await db
        .insert(organizations)
        .values({
          name: orgData.name,
          cityId: city.id,
          organizationTypeId: orgData.typeId,
          latitude: latitude,
          longitude: longitude,
          summary: orgData.summary,
          mission: orgData.mission,
          description: orgData.description,
          goals: orgData.goals,
          needs: orgData.needs,
          address: orgData.address,
          contacts: orgData.contacts,
          gallery: orgData.gallery,
        })
        .returning();

      // Назначаем владельца
      await db.insert(organizationOwners).values({
        organizationId: organization.id,
        userId: ownerUserId,
      });

      // Добавляем типы помощи
      if (orgData.helpTypeIds && orgData.helpTypeIds.length > 0) {
        await db.insert(organizationHelpTypes).values(
          orgData.helpTypeIds.map(helpTypeId => ({
            organizationId: organization.id,
            helpTypeId: helpTypeId,
          }))
        );
      }

      successCount++;
      console.log(`  ✓ Организация создана (ID: ${organization.id})\n`);
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
  console.log(`Ошибок: ${errorCount}`);
  console.log(`Владелец всех организаций: USER_ID=${ownerUserId}`);

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

