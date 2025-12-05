import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  organizationOwners,
  organizationHelpTypes,
  users,
  helpTypes,
  cities,
  organizationTypes,
} from '../database/schema';
import { eq, and, inArray, ne } from 'drizzle-orm';

export interface OrganizationWithRelations {
  id: number;
  name: string;
  cityId: number;
  latitude: string | null;
  longitude: string | null;
  summary: string | null;
  mission: string | null;
  description: string | null;
  goals: string[] | null;
  needs: string[] | null;
  address: string | null;
  contacts: Array<{ name: string; value: string }> | null;
  gallery: string[] | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  cityName: string | null;
  cityLatitude: string | null;
  cityLongitude: string | null;
  cityRecordStatus: string | null;
  organizationTypeId: number | null;
  organizationTypeName: string | null;
  organizationTypeRecordStatus: string | null;
}

export interface HelpTypeRelation {
  organizationId: number;
  id: number;
  name: string;
}

export interface OwnerRelation {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
}

@Injectable()
export class OrganizationRepository {
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  /**
   * Логирует ошибку с детальной информацией
   * @param method Название метода, в котором произошла ошибка
   * @param context Дополнительный контекст ошибки
   * @param error Объект ошибки
   */
  private logError(method: string, context: Record<string, any>, error: any): void {
    this.logger.error(`Ошибка в ${method}:`, error);
    this.logger.error('Детали ошибки:', {
      method,
      ...context,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      where: error?.where,
      stack: error?.stack,
    });
  }

  /**
   * Получить все организации с связанными данными (города, типы организаций)
   * @param includeAll - если true, возвращает все организации, иначе только подтверждённые
   */
  async findAll(includeAll: boolean = false): Promise<OrganizationWithRelations[]> {
    try {
      const whereConditions = [ne(organizations.recordStatus, 'DELETED')];
      
      // Если includeAll = false, показываем только подтверждённые организации
      if (!includeAll) {
        whereConditions.push(eq(organizations.isApproved, true));
      }
      
      return await this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          cityId: organizations.cityId,
          latitude: organizations.latitude,
          longitude: organizations.longitude,
          summary: organizations.summary,
          mission: organizations.mission,
          description: organizations.description,
          goals: organizations.goals,
          needs: organizations.needs,
          address: organizations.address,
          contacts: organizations.contacts,
          gallery: organizations.gallery,
          isApproved: organizations.isApproved,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          cityName: cities.name,
          cityLatitude: cities.latitude,
          cityLongitude: cities.longitude,
          cityRecordStatus: cities.recordStatus,
          organizationTypeId: organizationTypes.id,
          organizationTypeName: organizationTypes.name,
          organizationTypeRecordStatus: organizationTypes.recordStatus,
        })
        .from(organizations)
        .leftJoin(cities, and(
          eq(organizations.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .leftJoin(organizationTypes, and(
          eq(organizations.organizationTypeId, organizationTypes.id),
          ne(organizationTypes.recordStatus, 'DELETED')
        ))
        .where(and(...whereConditions));
    } catch (error: any) {
      this.logError('findAll', {}, error);
      throw error;
    }
  }

  /**
   * Получить организацию по ID с связанными данными
   */
  async findOne(id: number): Promise<OrganizationWithRelations | undefined> {
    try {
      const [org] = await this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          cityId: organizations.cityId,
          latitude: organizations.latitude,
          longitude: organizations.longitude,
          summary: organizations.summary,
          mission: organizations.mission,
          description: organizations.description,
          goals: organizations.goals,
          needs: organizations.needs,
          address: organizations.address,
          contacts: organizations.contacts,
          gallery: organizations.gallery,
          isApproved: organizations.isApproved,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          cityName: cities.name,
          cityLatitude: cities.latitude,
          cityLongitude: cities.longitude,
          cityRecordStatus: cities.recordStatus,
          organizationTypeId: organizationTypes.id,
          organizationTypeName: organizationTypes.name,
          organizationTypeRecordStatus: organizationTypes.recordStatus,
        })
        .from(organizations)
        .leftJoin(cities, and(
          eq(organizations.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .leftJoin(organizationTypes, and(
          eq(organizations.organizationTypeId, organizationTypes.id),
          ne(organizationTypes.recordStatus, 'DELETED')
        ))
        .where(and(
          eq(organizations.id, id),
          ne(organizations.recordStatus, 'DELETED')
        ));
      
      return org;
    } catch (error: any) {
      this.logError('findOne', { organizationId: id }, error);
      throw error;
    }
  }

  /**
   * Проверить существование организации по ID
   */
  async findById(id: number): Promise<typeof organizations.$inferSelect | undefined> {
    try {
      const [org] = await this.db
        .select()
        .from(organizations)
        .where(and(
          eq(organizations.id, id),
          ne(organizations.recordStatus, 'DELETED')
        ));
      
      return org;
    } catch (error: any) {
      this.logError('findById', { organizationId: id }, error);
      throw error;
    }
  }

  /**
   * Получить несколько организаций по ID
   */
  async findManyByIds(ids: number[]): Promise<typeof organizations.$inferSelect[]> {
    if (ids.length === 0) return [];
    
    try {
      return await this.db
        .select()
        .from(organizations)
        .where(and(
          inArray(organizations.id, ids),
          ne(organizations.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logError('findManyByIds', { organizationIds: ids, count: ids.length }, error);
      throw error;
    }
  }

  /**
   * Создать организацию
   */
  async create(data: {
    name: string;
    cityId: number;
    organizationTypeId: number;
    latitude?: string | null;
    longitude?: string | null;
    summary?: string | null;
    mission?: string | null;
    description?: string | null;
    goals?: string[] | null;
    needs?: string[] | null;
    address?: string | null;
    contacts?: Array<{ name: string; value: string }> | null;
    gallery?: string[] | null;
  }): Promise<typeof organizations.$inferSelect> {
    try {
      const [organization] = await this.db
        .insert(organizations)
        .values(data)
        .returning();
      
      return organization;
    } catch (error: any) {
      this.logError('create', {
        organizationName: data.name,
        cityId: data.cityId,
        organizationTypeId: data.organizationTypeId,
      }, error);
      throw error;
    }
  }

  /**
   * Создать несколько организаций
   */
  async createMany(data: Array<{
    name: string;
    cityId: number;
    organizationTypeId: number;
    latitude?: string | null;
    longitude?: string | null;
    summary?: string | null;
    mission?: string | null;
    description?: string | null;
    goals?: string[] | null;
    needs?: string[] | null;
    address?: string | null;
    contacts?: Array<{ name: string; value: string }> | null;
    gallery?: string[] | null;
  }>): Promise<typeof organizations.$inferSelect[]> {
    if (data.length === 0) return [];
    
    try {
      return await this.db
        .insert(organizations)
        .values(data)
        .returning();
    } catch (error: any) {
      this.logError('createMany', { count: data.length }, error);
      throw error;
    }
  }

  /**
   * Обновить организацию
   */
  async update(
    id: number,
    data: Partial<typeof organizations.$inferInsert>
  ): Promise<typeof organizations.$inferSelect | undefined> {
    try {
      const [organization] = await this.db
        .update(organizations)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(organizations.id, id),
          ne(organizations.recordStatus, 'DELETED')
        ))
        .returning();
      
      return organization;
    } catch (error: any) {
      this.logError('update', {
        organizationId: id,
        updateFields: Object.keys(data),
      }, error);
      throw error;
    }
  }

  /**
   * Мягкое удаление организации
   */
  async softDelete(id: number): Promise<typeof organizations.$inferSelect | undefined> {
    try {
      const [organization] = await this.db
        .update(organizations)
        .set({ recordStatus: 'DELETED', updatedAt: new Date() })
        .where(and(
          eq(organizations.id, id),
          ne(organizations.recordStatus, 'DELETED')
        ))
        .returning();
      
      return organization;
    } catch (error: any) {
      this.logError('softDelete', { organizationId: id }, error);
      throw error;
    }
  }

  /**
   * Получить виды помощи для организаций
   */
  async findHelpTypesByOrganizationIds(orgIds: number[]): Promise<HelpTypeRelation[]> {
    if (orgIds.length === 0) return [];
    
    try {
      return await this.db
        .select({
          organizationId: organizationHelpTypes.organizationId,
          id: helpTypes.id,
          name: helpTypes.name,
        })
        .from(organizationHelpTypes)
        .innerJoin(helpTypes, eq(organizationHelpTypes.helpTypeId, helpTypes.id))
        .where(and(
          inArray(organizationHelpTypes.organizationId, orgIds),
          ne(helpTypes.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logError('findHelpTypesByOrganizationIds', { organizationIds: orgIds, count: orgIds.length }, error);
      throw error;
    }
  }

  /**
   * Получить виды помощи для одной организации
   */
  async findHelpTypesByOrganizationId(orgId: number): Promise<Array<{ id: number; name: string }>> {
    try {
      return await this.db
        .select({
          id: helpTypes.id,
          name: helpTypes.name,
        })
        .from(organizationHelpTypes)
        .innerJoin(helpTypes, eq(organizationHelpTypes.helpTypeId, helpTypes.id))
        .where(and(
          eq(organizationHelpTypes.organizationId, orgId),
          ne(helpTypes.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logError('findHelpTypesByOrganizationId', { organizationId: orgId }, error);
      throw error;
    }
  }

  /**
   * Получить владельцев организации
   */
  async findOwnersByOrganizationId(orgId: number): Promise<OwnerRelation[]> {
    try {
      return await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
        })
        .from(organizationOwners)
        .innerJoin(users, eq(organizationOwners.userId, users.id))
        .where(and(
          eq(organizationOwners.organizationId, orgId),
          ne(users.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logError('findOwnersByOrganizationId', { organizationId: orgId }, error);
      throw error;
    }
  }

  /**
   * Получить владельцев для нескольких организаций
   */
  async findOwnersByOrganizationIds(orgIds: number[]): Promise<Array<OwnerRelation & { organizationId: number }>> {
    if (orgIds.length === 0) return [];
    
    try {
      return await this.db
        .select({
          organizationId: organizationOwners.organizationId,
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
        })
        .from(organizationOwners)
        .innerJoin(users, eq(organizationOwners.userId, users.id))
        .where(and(
          inArray(organizationOwners.organizationId, orgIds),
          ne(users.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logError('findOwnersByOrganizationIds', { organizationIds: orgIds, count: orgIds.length }, error);
      throw error;
    }
  }

  /**
   * Получить все организации пользователя (где он является владельцем)
   * @param userId - ID пользователя
   * @param includeAll - если true, возвращает все организации, иначе только подтверждённые
   */
  async findByUserId(userId: number, includeAll: boolean = true): Promise<OrganizationWithRelations[]> {
    try {
      const whereConditions = [
        eq(organizationOwners.userId, userId),
        ne(organizations.recordStatus, 'DELETED'),
      ];
      
      // Если includeAll = false, показываем только подтверждённые организации
      if (!includeAll) {
        whereConditions.push(eq(organizations.isApproved, true));
      }
      
      return await this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          cityId: organizations.cityId,
          latitude: organizations.latitude,
          longitude: organizations.longitude,
          summary: organizations.summary,
          mission: organizations.mission,
          description: organizations.description,
          goals: organizations.goals,
          needs: organizations.needs,
          address: organizations.address,
          contacts: organizations.contacts,
          gallery: organizations.gallery,
          isApproved: organizations.isApproved,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          cityName: cities.name,
          cityLatitude: cities.latitude,
          cityLongitude: cities.longitude,
          cityRecordStatus: cities.recordStatus,
          organizationTypeId: organizationTypes.id,
          organizationTypeName: organizationTypes.name,
          organizationTypeRecordStatus: organizationTypes.recordStatus,
        })
        .from(organizationOwners)
        .innerJoin(organizations, eq(organizationOwners.organizationId, organizations.id))
        .leftJoin(cities, and(
          eq(organizations.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .leftJoin(organizationTypes, and(
          eq(organizations.organizationTypeId, organizationTypes.id),
          ne(organizationTypes.recordStatus, 'DELETED')
        ))
        .where(and(...whereConditions));
    } catch (error: any) {
      this.logError('findByUserId', { userId, includeAll }, error);
      throw error;
    }
  }

  /**
   * Добавить владельца организации
   */
  async addOwner(organizationId: number, userId: number): Promise<void> {
    try {
      await this.db.insert(organizationOwners).values({
        organizationId,
        userId,
      });
    } catch (error: any) {
      this.logError('addOwner', { organizationId, userId }, error);
      throw error;
    }
  }

  /**
   * Удалить владельца организации
   */
  async removeOwner(organizationId: number, userId: number): Promise<boolean> {
    try {
      const [deleted] = await this.db
        .delete(organizationOwners)
        .where(and(
          eq(organizationOwners.organizationId, organizationId),
          eq(organizationOwners.userId, userId)
        ))
        .returning();
      
      return !!deleted;
    } catch (error: any) {
      this.logError('removeOwner', { organizationId, userId }, error);
      throw error;
    }
  }

  /**
   * Проверить существование связи владельца
   */
  async findOwner(organizationId: number, userId: number): Promise<typeof organizationOwners.$inferSelect | undefined> {
    try {
      const [owner] = await this.db
        .select()
        .from(organizationOwners)
        .where(and(
          eq(organizationOwners.organizationId, organizationId),
          eq(organizationOwners.userId, userId)
        ));
      
      return owner;
    } catch (error: any) {
      this.logError('findOwner', { organizationId, userId }, error);
      throw error;
    }
  }

  /**
   * Добавить вид помощи к организации
   */
  async addHelpType(organizationId: number, helpTypeId: number): Promise<void> {
    try {
      await this.db.insert(organizationHelpTypes).values({
        organizationId,
        helpTypeId,
      });
    } catch (error: any) {
      this.logError('addHelpType', { organizationId, helpTypeId }, error);
      throw error;
    }
  }

  /**
   * Удалить вид помощи у организации
   */
  async removeHelpType(organizationId: number, helpTypeId: number): Promise<boolean> {
    try {
      const [deleted] = await this.db
        .delete(organizationHelpTypes)
        .where(and(
          eq(organizationHelpTypes.organizationId, organizationId),
          eq(organizationHelpTypes.helpTypeId, helpTypeId)
        ))
        .returning();
      
      return !!deleted;
    } catch (error: any) {
      this.logError('removeHelpType', { organizationId, helpTypeId }, error);
      throw error;
    }
  }

  /**
   * Проверить существование связи вида помощи
   */
  async findHelpType(organizationId: number, helpTypeId: number): Promise<typeof organizationHelpTypes.$inferSelect | undefined> {
    try {
      const [helpType] = await this.db
        .select()
        .from(organizationHelpTypes)
        .where(and(
          eq(organizationHelpTypes.organizationId, organizationId),
          eq(organizationHelpTypes.helpTypeId, helpTypeId)
        ));
      
      return helpType;
    } catch (error: any) {
      this.logError('findHelpType', { organizationId, helpTypeId }, error);
      throw error;
    }
  }

  /**
   * Удалить все связи видов помощи для организации
   */
  async removeAllHelpTypes(organizationId: number): Promise<void> {
    try {
      await this.db
        .delete(organizationHelpTypes)
        .where(eq(organizationHelpTypes.organizationId, organizationId));
    } catch (error: any) {
      this.logError('removeAllHelpTypes', { organizationId }, error);
      throw error;
    }
  }

  /**
   * Добавить несколько видов помощи к организации
   */
  async addHelpTypes(organizationId: number, helpTypeIds: number[]): Promise<void> {
    if (helpTypeIds.length === 0) return;
    
    try {
      await this.db.insert(organizationHelpTypes).values(
        helpTypeIds.map(helpTypeId => ({
          organizationId,
          helpTypeId,
        }))
      );
    } catch (error: any) {
      this.logError('addHelpTypes', { organizationId, helpTypeIds, count: helpTypeIds.length }, error);
      throw error;
    }
  }

  /**
   * Удалить все связи владельцев для организации
   */
  async removeAllOwners(organizationId: number): Promise<void> {
    try {
      await this.db
        .delete(organizationOwners)
        .where(eq(organizationOwners.organizationId, organizationId));
    } catch (error: any) {
      this.logError('removeAllOwners', { organizationId }, error);
      throw error;
    }
  }

  /**
   * Добавить владельцев к нескольким организациям
   */
  async addOwnersToOrganizations(organizationIds: number[], userId: number): Promise<void> {
    if (organizationIds.length === 0) return;
    
    try {
      await this.db.insert(organizationOwners).values(
        organizationIds.map(organizationId => ({
          organizationId,
          userId,
        }))
      );
    } catch (error: any) {
      this.logError('addOwnersToOrganizations', { userId, organizationIds, count: organizationIds.length }, error);
      throw error;
    }
  }

  /**
   * Обновить галерею организации
   */
  async updateGallery(organizationId: number, gallery: string[]): Promise<typeof organizations.$inferSelect | undefined> {
    return this.update(organizationId, { gallery });
  }

  /**
   * Обновить статус одобрения организации
   */
  async updateApprovalStatus(id: number, isApproved: boolean): Promise<typeof organizations.$inferSelect | undefined> {
    return this.update(id, { isApproved });
  }
}

