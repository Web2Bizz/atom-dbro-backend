/**
 * Одноразовый скрипт для импорта организаций из нового формата JSON
 * 
 * Использование:
 *   npm run import:organizations [BASE_URL] [EMAIL] [PASSWORD] [JSON_FILE_PATH]
 * 
 * Пример:
 *   npm run import:organizations http://localhost:3000 admin@example.com password123 mock/organizations\ \(2\).json
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Проверка наличия fetch (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('Ошибка: требуется Node.js 18+ для поддержки fetch');
  process.exit(1);
}

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

interface City {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  regionId: number;
  region?: {
    id: number;
    name: string;
  };
}

interface HelpType {
  id: number;
  name: string;
}

interface OrganizationType {
  id: number;
  name: string;
}

interface ContactDto {
  name: string;
  value: string;
}

interface CreateOrganizationDto {
  name: string;
  cityId: number;
  typeId: number;
  helpTypeIds: number[];
  latitude?: number;
  longitude?: number;
  summary?: string;
  mission?: string;
  description?: string;
  goals?: string[];
  needs?: string[];
  address?: string;
  contacts?: ContactDto[];
  gallery?: string[];
}

class OrganizationImporter {
  private baseUrl: string;
  private token: string | null = null;
  private cities: City[] = [];
  private helpTypes: HelpType[] = [];
  private organizationTypes: OrganizationType[] = [];
  private cityMap: Map<string, City> = new Map();
  private helpTypeMap: Map<number, HelpType> = new Map();
  private organizationTypeMap: Map<number, OrganizationType> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Авторизация через API
   */
  async login(email: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка авторизации: ${response.status} - ${error}`);
      }

      const data = await response.json();
      this.token = data.access_token;
      console.log('✓ Успешная авторизация');
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      throw error;
    }
  }

  /**
   * Получить заголовки с авторизацией
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Загрузить список городов
   */
  async loadCities(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/cities`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки городов: ${response.status}`);
      }

      this.cities = await response.json();
      
      // Создаем карту городов по названию
      this.cityMap.clear();
      for (const city of this.cities) {
        const key = city.name.toLowerCase().trim();
        if (!this.cityMap.has(key)) {
          this.cityMap.set(key, city);
        }
      }

      console.log(`✓ Загружено ${this.cities.length} городов`);
    } catch (error) {
      console.error('Ошибка при загрузке городов:', error);
      throw error;
    }
  }

  /**
   * Извлечь название города из адреса
   */
  extractCityNameFromAddress(address: string): string | null {
    if (!address) return null;
    
    // Паттерн для поиска "г. НазваниеГорода" или просто "НазваниеГорода"
    const match = address.match(/г\.\s*([^,]+)|^([^,]+)/);
    if (match) {
      return (match[1] || match[2]).trim();
    }
    
    return null;
  }

  /**
   * Найти город по названию
   */
  findCity(cityName: string): City | null {
    if (!cityName) return null;
    const key = cityName.toLowerCase().trim();
    return this.cityMap.get(key) || null;
  }

  /**
   * Загрузить список типов помощи
   */
  async loadHelpTypes(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/help-types`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки типов помощи: ${response.status}`);
      }

      this.helpTypes = await response.json();
      
      // Создаем карту типов помощи по ID
      this.helpTypeMap.clear();
      for (const helpType of this.helpTypes) {
        this.helpTypeMap.set(helpType.id, helpType);
      }

      console.log(`✓ Загружено ${this.helpTypes.length} типов помощи`);
    } catch (error) {
      console.error('Ошибка при загрузке типов помощи:', error);
      throw error;
    }
  }

  /**
   * Загрузить список типов организаций
   */
  async loadOrganizationTypes(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/organization-types`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки типов организаций: ${response.status}`);
      }

      this.organizationTypes = await response.json();
      
      // Создаем карту типов организаций по ID
      this.organizationTypeMap.clear();
      for (const orgType of this.organizationTypes) {
        this.organizationTypeMap.set(orgType.id, orgType);
      }

      console.log(`✓ Загружено ${this.organizationTypes.length} типов организаций`);
    } catch (error) {
      console.error('Ошибка при загрузке типов организаций:', error);
      throw error;
    }
  }

  /**
   * Преобразовать данные организации в формат API
   */
  private transformOrganization(orgData: OrganizationData, cityId: number): CreateOrganizationDto {
    return {
      name: orgData.name,
      cityId: cityId,
      typeId: orgData.typeId,
      helpTypeIds: orgData.helpTypeIds || [],
      latitude: orgData.latitude,
      longitude: orgData.longitude,
      summary: orgData.summary,
      mission: orgData.mission,
      description: orgData.description,
      goals: orgData.goals,
      needs: orgData.needs,
      address: orgData.address,
      contacts: orgData.contacts,
      gallery: orgData.gallery,
    };
  }

  /**
   * Создать организацию
   */
  async createOrganization(orgData: OrganizationData): Promise<number> {
    // Находим город
    let city: City | null = null;
    
    // Если cityId = 0, пытаемся найти город по адресу
    if (orgData.cityId === 0 && orgData.address) {
      const cityName = this.extractCityNameFromAddress(orgData.address);
      if (cityName) {
        city = this.findCity(cityName);
        if (!city) {
          throw new Error(`Город "${cityName}" (из адреса "${orgData.address}") не найден в базе данных`);
        }
      }
    } else if (orgData.cityId > 0) {
      // Ищем город по ID
      city = this.cities.find(c => c.id === orgData.cityId) || null;
      if (!city) {
        throw new Error(`Город с ID ${orgData.cityId} не найден в базе данных`);
      }
    }
    
    if (!city) {
      throw new Error(`Не удалось определить город для организации "${orgData.name}". Проверьте cityId или адрес.`);
    }

    // Проверяем существование типа организации
    if (!this.organizationTypeMap.has(orgData.typeId)) {
      throw new Error(`Тип организации с ID ${orgData.typeId} не найден в базе данных`);
    }

    // Проверяем существование типов помощи
    const missingHelpTypes: number[] = [];
    for (const helpTypeId of orgData.helpTypeIds || []) {
      if (!this.helpTypeMap.has(helpTypeId)) {
        missingHelpTypes.push(helpTypeId);
      }
    }
    if (missingHelpTypes.length > 0) {
      throw new Error(`Типы помощи с ID ${missingHelpTypes.join(', ')} не найдены в базе данных`);
    }

    // Преобразуем данные
    const createDto = this.transformOrganization(orgData, city.id);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/organizations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createDto),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка создания организации: ${response.status} - ${error}`);
      }

      const organization = await response.json();
      return organization.id;
    } catch (error) {
      console.error(`Ошибка при создании организации "${orgData.name}":`, error);
      throw error;
    }
  }

  /**
   * Импортировать организации
   */
  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`\nНачинаем импорт ${organizations.length} организаций...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < organizations.length; i++) {
      const orgData = organizations[i];
      console.log(`[${i + 1}/${organizations.length}] Обработка: ${orgData.name}`);

      try {
        // Создаем организацию (включая типы помощи)
        const organizationId = await this.createOrganization(orgData);
        successCount++;
        console.log(`  ✓ Организация создана (ID: ${organizationId})\n`);
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
    
    if (errors.length > 0) {
      console.log('\nОшибки:');
      for (const err of errors) {
        console.log(`  - ${err.name}: ${err.error}`);
      }
    }
  }
}

// Главная функция
async function main() {
  // Получаем параметры из переменных окружения или аргументов командной строки
  const apiBaseUrl = process.env.API_BASE_URL || process.argv[2] || 'http://localhost:3000';
  const apiEmail = process.env.API_EMAIL || process.argv[3];
  const apiPassword = process.env.API_PASSWORD || process.argv[4];
  const jsonFilePath = process.env.JSON_FILE_PATH || process.argv[5] || 'mock/organizations (2).json';

  if (!apiEmail || !apiPassword) {
    console.error('Ошибка: необходимо указать email и password для авторизации');
    console.error('Использование:');
    console.error('  npm run import:organizations [BASE_URL] [EMAIL] [PASSWORD] [JSON_FILE_PATH]');
    console.error('Или установите переменные окружения:');
    console.error('  API_BASE_URL=http://localhost:3000');
    console.error('  API_EMAIL=your@email.com');
    console.error('  API_PASSWORD=yourpassword');
    console.error('  JSON_FILE_PATH=mock/organizations (2).json');
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

  const importer = new OrganizationImporter(apiBaseUrl);

  try {
    // Авторизация
    await importer.login(apiEmail, apiPassword);

    // Загружаем справочники
    await importer.loadCities();
    await importer.loadHelpTypes();
    await importer.loadOrganizationTypes();

    // Импортируем организации
    await importer.importOrganizations(organizationsData);

    console.log('\n✓ Импорт завершен успешно');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Критическая ошибка при импорте:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

export { OrganizationImporter };
