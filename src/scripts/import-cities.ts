import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { regions, cities } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as iconv from 'iconv-lite';

interface CsvRow {
  city: string;
  district: string;
  federalDistrict: string;
  lat: string;
  lng: string;
}

// Функция для чтения файла с правильной кодировкой
function readFileWithEncoding(filePath: string): string {
  // Сначала пробуем прочитать как UTF-8
  try {
    const utf8Content = fs.readFileSync(filePath, 'utf-8');
    // Проверяем, есть ли русские буквы (кириллица)
    const hasCyrillic = /[А-Яа-яЁё]/.test(utf8Content);
    if (hasCyrillic) {
      return utf8Content;
    }
  } catch (error) {
    console.warn('Не удалось прочитать файл как UTF-8');
  }
  
  // Если UTF-8 не подошел, пробуем Windows-1251
  try {
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'win1251');
    return content;
  } catch (error) {
    console.warn('Не удалось прочитать файл как Windows-1251, используем UTF-8');
    return fs.readFileSync(filePath, 'utf-8');
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get<NodePgDatabase>(DATABASE_CONNECTION);

  console.log('Начинаем импорт данных из CSV...');

  // Читаем CSV файл с правильной кодировкой
  const csvPath = path.join(__dirname, '../data/koord_russia.csv');
  const csvContent = readFileWithEncoding(csvPath);

  // Парсим CSV (разделитель - точка с запятой)
  const records: string[][] = parse(csvContent, {
    delimiter: ';',
    skip_empty_lines: true,
    from_line: 2, // Пропускаем заголовок
    relax_column_count: true, // Разрешаем разное количество колонок
    trim: true,
  });

  console.log(`Найдено ${records.length} записей в CSV`);

  // Создаем Map для хранения регионов (ключ - название федерального округа)
  const regionMap = new Map<string, number>();

  // Сначала создаем все уникальные регионы
  const uniqueRegions = new Set<string>();
  for (const record of records) {
    if (record.length >= 3 && record[2]?.trim()) {
      uniqueRegions.add(record[2].trim());
    }
  }

  console.log(`Найдено ${uniqueRegions.size} уникальных федеральных округов`);

  // Создаем регионы в базе данных
  for (const regionName of uniqueRegions) {
    // Проверяем, существует ли регион
    const [existingRegion] = await db
      .select()
      .from(regions)
      .where(eq(regions.name, regionName));

    if (existingRegion) {
      regionMap.set(regionName, existingRegion.id);
      console.log(`Регион "${regionName}" уже существует (ID: ${existingRegion.id})`);
    } else {
      const [newRegion] = await db
        .insert(regions)
        .values({ name: regionName })
        .returning();
      regionMap.set(regionName, newRegion.id);
      console.log(`Создан регион "${regionName}" (ID: ${newRegion.id})`);
    }
  }

  // Теперь создаем города
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const record of records) {
    try {
      // Пропускаем пустые записи или записи с недостаточным количеством полей
      if (!record || record.length < 5) {
        skippedCount++;
        continue;
      }

      const cityName = record[0]?.trim();
      const federalDistrict = record[2]?.trim();
      const latStr = record[3]?.trim()?.replace(',', '.') || ''; // Заменяем запятую на точку
      const lngStr = record[4]?.trim()?.replace(',', '.') || ''; // Заменяем запятую на точку

      // Пропускаем записи с пустыми обязательными полями
      if (!cityName || !federalDistrict || !latStr || !lngStr) {
        skippedCount++;
        continue;
      }

      const regionId = regionMap.get(federalDistrict);
      if (!regionId) {
        console.warn(`Регион не найден для города "${cityName}"`);
        errorCount++;
        continue;
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Некорректные координаты для города "${cityName}": lat=${latStr}, lng=${lngStr}`);
        errorCount++;
        continue;
      }

      // Проверяем, существует ли город с таким именем в этом регионе
      const existingCities = await db
        .select()
        .from(cities)
        .where(eq(cities.name, cityName));
      
      const existingCity = existingCities.find(c => c.regionId === regionId);

      if (existingCity) {
        // Обновляем координаты, если они изменились
        await db
          .update(cities)
          .set({
            latitude: lat.toString(),
            longitude: lng.toString(),
            updatedAt: new Date(),
          })
          .where(eq(cities.id, existingCity.id));
        skippedCount++;
        continue;
      }

      // Создаем новый город
      await db.insert(cities).values({
        name: cityName,
        latitude: lat.toString(),
        longitude: lng.toString(),
        regionId: regionId,
      });

      createdCount++;
      if (createdCount % 100 === 0) {
        console.log(`Обработано ${createdCount} городов...`);
      }
    } catch (error) {
      console.error(`Ошибка при обработке записи ${record.join(';')}:`, error);
      errorCount++;
    }
  }

  console.log('\n=== Итоги импорта ===');
  console.log(`Создано регионов: ${regionMap.size}`);
  console.log(`Создано городов: ${createdCount}`);
  console.log(`Пропущено (уже существуют): ${skippedCount}`);
  console.log(`Ошибок: ${errorCount}`);
  console.log(`Всего обработано записей: ${records.length}`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('Критическая ошибка при импорте:', error);
  process.exit(1);
});

