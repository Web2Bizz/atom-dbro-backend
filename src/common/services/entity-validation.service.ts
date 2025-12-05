import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cities, organizationTypes, categories, helpTypes } from '../../database/schema';
import { eq, and, inArray, ne } from 'drizzle-orm';

/**
 * Сервис для валидации существования сущностей в базе данных
 */
@Injectable()
export class EntityValidationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  /**
   * Проверяет существование города по ID (исключая удаленные)
   * @param cityId ID города
   * @throws NotFoundException если город не найден
   */
  async validateCityExists(cityId: number): Promise<void> {
    const [city] = await this.db
      .select()
      .from(cities)
      .where(and(
        eq(cities.id, cityId),
        ne(cities.recordStatus, 'DELETED')
      ));
    
    if (!city) {
      throw new NotFoundException(`Город с ID ${cityId} не найден`);
    }
  }

  /**
   * Проверяет существование типа организации по ID (исключая удаленные)
   * @param typeId ID типа организации
   * @throws NotFoundException если тип организации не найден
   */
  async validateOrganizationTypeExists(typeId: number): Promise<void> {
    const [orgType] = await this.db
      .select()
      .from(organizationTypes)
      .where(and(
        eq(organizationTypes.id, typeId),
        ne(organizationTypes.recordStatus, 'DELETED')
      ));
    
    if (!orgType) {
      throw new NotFoundException(`Тип организации с ID ${typeId} не найден`);
    }
  }

  /**
   * Проверяет существование всех категорий по ID (исключая удаленные)
   * @param categoryIds Массив ID категорий
   * @throws NotFoundException если одна или несколько категорий не найдены
   */
  async validateCategoriesExist(categoryIds: number[]): Promise<void> {
    if (categoryIds.length === 0) {
      return;
    }

    const existingCategories = await this.db
      .select()
      .from(categories)
      .where(and(
        inArray(categories.id, categoryIds),
        ne(categories.recordStatus, 'DELETED')
      ));
    
    if (existingCategories.length !== categoryIds.length) {
      const foundIds = existingCategories.map(c => c.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Категории с ID ${missingIds.join(', ')} не найдены`);
    }
  }

  /**
   * Проверяет существование всех видов помощи по ID (исключая удаленные)
   * @param helpTypeIds Массив ID видов помощи
   * @throws NotFoundException если один или несколько видов помощи не найдены
   */
  async validateHelpTypesExist(helpTypeIds: number[]): Promise<void> {
    if (helpTypeIds.length === 0) {
      return;
    }

    const existingHelpTypes = await this.db
      .select()
      .from(helpTypes)
      .where(and(
        inArray(helpTypes.id, helpTypeIds),
        ne(helpTypes.recordStatus, 'DELETED')
      ));
    
    if (existingHelpTypes.length !== helpTypeIds.length) {
      const foundIds = existingHelpTypes.map(ht => ht.id);
      const missingIds = helpTypeIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Виды помощи с ID ${missingIds.join(', ')} не найдены`);
    }
  }
}

