/**
 * Скрипт для генерации SQL запросов из JSON файла с организациями
 * 
 * Использование:
 *   npm run generate:organizations-sql [PATH_TO_JSON] [OUTPUT_FILE]
 * 
 * Пример:
 *   npm run generate:organizations-sql mock/organizations.json organizations.sql
 */

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
 */
function extractCityName(address: string): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  const patterns = [
    /^г\.\s*(.+?)(?:,|$)/i,
    /^г\s+(.+?)(?:,|$)/i,
    /^(.+?)(?:,|$)/,
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
 * Экранировать строку для SQL
 */
function escapeSqlString(str: string | null | undefined): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

/**
 * Преобразовать массив в JSONB для SQL
 */
function arrayToSqlJsonb(arr: any[] | null | undefined): string {
  if (!arr || arr.length === 0) return 'NULL';
  const jsonStr = JSON.stringify(arr);
  return `'${jsonStr.replace(/'/g, "''").replace(/\\/g, '\\\\')}'::jsonb`;
}

function generateSql() {
  // Получаем путь к JSON файлу из аргументов
  const jsonPathArg = process.argv[2];
  if (!jsonPathArg) {
    console.error('Ошибка: необходимо указать путь к JSON файлу');
    console.error('Использование: npm run generate:organizations-sql [PATH_TO_JSON] [OUTPUT_FILE]');
    process.exit(1);
  }

  const jsonPath = path.isAbsolute(jsonPathArg)
    ? jsonPathArg
    : path.join(process.cwd(), jsonPathArg);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Ошибка: файл ${jsonPath} не найден`);
    process.exit(1);
  }

  // Получаем путь к выходному файлу
  const outputPathArg = process.argv[3] || 'organizations.sql';
  const outputPath = path.isAbsolute(outputPathArg)
    ? outputPathArg
    : path.join(process.cwd(), outputPathArg);

  console.log(`Читаем JSON файл: ${jsonPath}`);
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  let organizationsData: OrganizationJsonData[];

  try {
    organizationsData = JSON.parse(jsonContent);
  } catch (error) {
    console.error('Ошибка при парсинге JSON файла:', error);
    process.exit(1);
  }

  if (!Array.isArray(organizationsData)) {
    console.error('Ошибка: JSON файл должен содержать массив организаций');
    process.exit(1);
  }

  console.log(`Найдено ${organizationsData.length} организаций\n`);
  console.log(`Генерируем SQL запросы...\n`);

  const sqlLines: string[] = [];
  
  // Добавляем заголовок
  sqlLines.push('-- SQL запросы для вставки организаций');
  sqlLines.push('-- Сгенерировано автоматически из JSON файла');
  sqlLines.push('');
  sqlLines.push('BEGIN;');
  sqlLines.push('');

  // Генерируем SQL для каждой организации
  for (let i = 0; i < organizationsData.length; i++) {
    const org = organizationsData[i];
    const cityName = org.address ? extractCityName(org.address) : null;

    // Генерируем подзапрос для поиска city_id
    let cityIdSql: string;
    if (org.cityId > 0) {
      cityIdSql = org.cityId.toString();
    } else if (cityName) {
      cityIdSql = `(SELECT id FROM cities WHERE LOWER(name) = LOWER(${escapeSqlString(cityName)}) LIMIT 1)`;
    } else {
      cityIdSql = 'NULL';
      console.warn(`⚠ Организация "${org.name}": не удалось определить город`);
    }

    // Генерируем подзапрос для organization_type_id
    const organizationTypeIdSql = org.typeId > 0 
      ? org.typeId.toString()
      : '(SELECT id FROM organization_types WHERE LOWER(name) = LOWER(\'НКО\') LIMIT 1)';

    // Формируем значения для INSERT
    const values = [
      escapeSqlString(org.name),
      cityIdSql,
      organizationTypeIdSql,
      org.latitude ? org.latitude.toString() : 'NULL',
      org.longitude ? org.longitude.toString() : 'NULL',
      escapeSqlString(org.summary),
      escapeSqlString(org.mission),
      escapeSqlString(org.description),
      arrayToSqlJsonb(org.goals),
      arrayToSqlJsonb(org.needs),
      escapeSqlString(org.address),
      arrayToSqlJsonb(org.contacts),
      arrayToSqlJsonb(org.gallery),
    ];

    // Генерируем INSERT запрос с использованием CTE для получения ID
    sqlLines.push(`-- Организация ${i + 1}: ${org.name}`);
    
    // Если есть типы помощи, используем CTE для получения ID организации
    if (org.helpTypeIds && org.helpTypeIds.length > 0) {
      const validHelpTypeIds = org.helpTypeIds.filter(id => id > 0);
      if (validHelpTypeIds.length > 0) {
        sqlLines.push(`WITH inserted_org AS (`);
        sqlLines.push(`  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    ${values.join(',\n    ')},
    NOW(),
    NOW()
  )`);
        sqlLines.push(`  RETURNING id`);
        sqlLines.push(`)`);
        sqlLines.push(`INSERT INTO organization_help_types (organization_id, help_type_id)`);
        sqlLines.push(`SELECT id, unnest(ARRAY[${validHelpTypeIds.join(', ')}])`);
        sqlLines.push(`FROM inserted_org`);
        sqlLines.push(`WHERE id IS NOT NULL`);
        sqlLines.push(`ON CONFLICT DO NOTHING;`);
        sqlLines.push('');
      } else {
        // Нет валидных типов помощи, просто вставляем организацию
        sqlLines.push(`INSERT INTO organizations (
  name,
  city_id,
  organization_type_id,
  latitude,
  longitude,
  summary,
  mission,
  description,
  goals,
  needs,
  address,
  contacts,
  gallery,
  created_at,
  updated_at
) VALUES (
  ${values.join(',\n  ')},
  NOW(),
  NOW()
);`);
        sqlLines.push('');
      }
    } else {
      // Нет типов помощи, просто вставляем организацию
      sqlLines.push(`INSERT INTO organizations (
  name,
  city_id,
  organization_type_id,
  latitude,
  longitude,
  summary,
  mission,
  description,
  goals,
  needs,
  address,
  contacts,
  gallery,
  created_at,
  updated_at
) VALUES (
  ${values.join(',\n  ')},
  NOW(),
  NOW()
);`);
      sqlLines.push('');
    }
  }

  sqlLines.push('COMMIT;');
  sqlLines.push('');

  // Записываем SQL в файл
  const sqlContent = sqlLines.join('\n');
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');

  console.log(`✓ SQL запросы сгенерированы и сохранены в: ${outputPath}`);
  console.log(`✓ Всего организаций: ${organizationsData.length}`);
  console.log(`\nДля выполнения SQL запросов используйте:`);
  console.log(`  psql -d your_database -f ${outputPath}`);
  console.log(`или`);
  console.log(`  docker exec -i your_postgres_container psql -U postgres -d your_database < ${outputPath}`);
}

generateSql();

