import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
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
import { eq, and, inArray } from 'drizzle-orm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { S3Service } from './s3.service';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private s3Service: S3Service,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: number) {
    // Проверяем существование города
    const [city] = await this.db
      .select()
      .from(cities)
      .where(eq(cities.id, createOrganizationDto.cityId));
    if (!city) {
      throw new NotFoundException(`Город с ID ${createOrganizationDto.cityId} не найден`);
    }

    // Проверяем существование типа организации
    const [orgType] = await this.db
      .select()
      .from(organizationTypes)
      .where(eq(organizationTypes.id, createOrganizationDto.typeId));
    if (!orgType) {
      throw new NotFoundException(`Тип организации с ID ${createOrganizationDto.typeId} не найден`);
    }

    // Проверяем существование видов помощи
    const helpTypeIds = [...new Set(createOrganizationDto.helpTypeIds)]; // Убеждаемся в уникальности
    const existingHelpTypes = await this.db
      .select()
      .from(helpTypes)
      .where(inArray(helpTypes.id, helpTypeIds));
    if (existingHelpTypes.length !== helpTypeIds.length) {
      const foundIds = existingHelpTypes.map(ht => ht.id);
      const missingIds = helpTypeIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Виды помощи с ID ${missingIds.join(', ')} не найдены`);
    }

    // Проверяем существование пользователя
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Используем координаты из города, если не указаны
    const latitude = createOrganizationDto.latitude !== undefined
      ? createOrganizationDto.latitude.toString()
      : city.latitude;
    const longitude = createOrganizationDto.longitude !== undefined
      ? createOrganizationDto.longitude.toString()
      : city.longitude;

    // Создаем организацию
    const [organization] = await this.db
      .insert(organizations)
      .values({
        name: createOrganizationDto.name,
        cityId: createOrganizationDto.cityId,
        organizationTypeId: createOrganizationDto.typeId,
        latitude: latitude,
        longitude: longitude,
        summary: createOrganizationDto.summary,
        mission: createOrganizationDto.mission,
        description: createOrganizationDto.description,
        goals: createOrganizationDto.goals,
        needs: createOrganizationDto.needs,
        address: createOrganizationDto.address,
        contacts: createOrganizationDto.contacts,
        gallery: createOrganizationDto.gallery,
      })
      .returning();

    // Автоматически назначаем создателя как владельца
    await this.db.insert(organizationOwners).values({
      organizationId: organization.id,
      userId: userId,
    });

    // Добавляем виды помощи
    if (helpTypeIds.length > 0) {
      await this.db.insert(organizationHelpTypes).values(
        helpTypeIds.map(helpTypeId => ({
          organizationId: organization.id,
          helpTypeId: helpTypeId,
        }))
      );
    }

    return organization;
  }

  async findAll() {
    const orgs = await this.db
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
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        cityName: cities.name,
        cityLatitude: cities.latitude,
        cityLongitude: cities.longitude,
        organizationTypeId: organizationTypes.id,
        organizationTypeName: organizationTypes.name,
      })
      .from(organizations)
      .leftJoin(cities, eq(organizations.cityId, cities.id))
      .leftJoin(organizationTypes, eq(organizations.organizationTypeId, organizationTypes.id));

    // Получаем helpTypes для всех организаций
    const orgIds = orgs.map(org => org.id);
    const allHelpTypes = orgIds.length > 0
      ? await this.db
          .select({
            organizationId: organizationHelpTypes.organizationId,
            id: helpTypes.id,
            name: helpTypes.name,
          })
          .from(organizationHelpTypes)
          .innerJoin(helpTypes, eq(organizationHelpTypes.helpTypeId, helpTypes.id))
          .where(inArray(organizationHelpTypes.organizationId, orgIds))
      : [];

    // Группируем helpTypes по organizationId
    const helpTypesByOrgId = new Map<number, Array<{ id: number; name: string }>>();
    for (const helpType of allHelpTypes) {
      if (!helpTypesByOrgId.has(helpType.organizationId)) {
        helpTypesByOrgId.set(helpType.organizationId, []);
      }
      helpTypesByOrgId.get(helpType.organizationId)!.push({
        id: helpType.id,
        name: helpType.name,
      });
    }

    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      latitude: org.latitude,
      longitude: org.longitude,
      summary: org.summary,
      mission: org.mission,
      description: org.description,
      goals: org.goals,
      needs: org.needs,
      address: org.address,
      contacts: org.contacts,
      gallery: org.gallery ? this.s3Service.getImageUrls(org.gallery) : [],
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      city: org.cityName ? {
        id: org.cityId,
        name: org.cityName,
        latitude: org.cityLatitude,
        longitude: org.cityLongitude,
      } : null,
      type: org.organizationTypeName ? {
        id: org.organizationTypeId,
        name: org.organizationTypeName,
      } : null,
      helpTypes: helpTypesByOrgId.get(org.id) || [],
    }));
  }

  async findOne(id: number) {
    const [orgData] = await this.db
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
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        cityName: cities.name,
        cityLatitude: cities.latitude,
        cityLongitude: cities.longitude,
        organizationTypeId: organizationTypes.id,
        organizationTypeName: organizationTypes.name,
      })
      .from(organizations)
      .leftJoin(cities, eq(organizations.cityId, cities.id))
      .leftJoin(organizationTypes, eq(organizations.organizationTypeId, organizationTypes.id))
      .where(eq(organizations.id, id));
    if (!orgData) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }

    // Получаем виды помощи
    const orgHelpTypes = await this.db
      .select({
        id: helpTypes.id,
        name: helpTypes.name,
      })
      .from(organizationHelpTypes)
      .innerJoin(helpTypes, eq(organizationHelpTypes.helpTypeId, helpTypes.id))
      .where(eq(organizationHelpTypes.organizationId, id));

    const organization = {
      id: orgData.id,
      name: orgData.name,
      latitude: orgData.latitude,
      longitude: orgData.longitude,
      summary: orgData.summary,
      mission: orgData.mission,
      description: orgData.description,
      goals: orgData.goals,
      needs: orgData.needs,
      address: orgData.address,
      contacts: orgData.contacts,
      gallery: orgData.gallery ? this.s3Service.getImageUrls(orgData.gallery) : [],
      createdAt: orgData.createdAt,
      updatedAt: orgData.updatedAt,
      city: orgData.cityName ? {
        id: orgData.cityId,
        name: orgData.cityName,
        latitude: orgData.cityLatitude,
        longitude: orgData.cityLongitude,
      } : null,
      type: orgData.organizationTypeName ? {
        id: orgData.organizationTypeId,
        name: orgData.organizationTypeName,
      } : null,
      helpTypes: orgHelpTypes,
    };

    // Получаем владельцев
    const owners = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        email: users.email,
      })
      .from(organizationOwners)
      .innerJoin(users, eq(organizationOwners.userId, users.id))
      .where(eq(organizationOwners.organizationId, id));

    return {
      ...organization,
      owners,
    };
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    // Проверяем существование организации
    const [existingOrg] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!existingOrg) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }

    // Если обновляется cityId, проверяем существование города
    if (updateOrganizationDto.cityId) {
      const [city] = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, updateOrganizationDto.cityId));
      if (!city) {
        throw new NotFoundException(`Город с ID ${updateOrganizationDto.cityId} не найден`);
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (updateOrganizationDto.name) updateData.name = updateOrganizationDto.name;
    if (updateOrganizationDto.cityId !== undefined) updateData.cityId = updateOrganizationDto.cityId;
    if (updateOrganizationDto.latitude !== undefined)
      updateData.latitude = updateOrganizationDto.latitude.toString();
    if (updateOrganizationDto.longitude !== undefined)
      updateData.longitude = updateOrganizationDto.longitude.toString();
    if (updateOrganizationDto.summary !== undefined) updateData.summary = updateOrganizationDto.summary;
    if (updateOrganizationDto.mission !== undefined) updateData.mission = updateOrganizationDto.mission;
    if (updateOrganizationDto.description !== undefined) updateData.description = updateOrganizationDto.description;
    if (updateOrganizationDto.goals !== undefined) updateData.goals = updateOrganizationDto.goals;
    if (updateOrganizationDto.needs !== undefined) updateData.needs = updateOrganizationDto.needs;
    if (updateOrganizationDto.address !== undefined) updateData.address = updateOrganizationDto.address;
    if (updateOrganizationDto.contacts !== undefined) updateData.contacts = updateOrganizationDto.contacts;
    if (updateOrganizationDto.organizationTypeId !== undefined) {
      // Проверяем существование типа организации
      const [orgType] = await this.db
        .select()
        .from(organizationTypes)
        .where(eq(organizationTypes.id, updateOrganizationDto.organizationTypeId));
      if (!orgType) {
        throw new NotFoundException(`Тип организации с ID ${updateOrganizationDto.organizationTypeId} не найден`);
      }
      updateData.organizationTypeId = updateOrganizationDto.organizationTypeId;
    }

    // Обработка галереи: сравниваем старую и новую, удаляем неиспользуемые файлы из S3
    if (updateOrganizationDto.gallery !== undefined) {
      const oldGallery = existingOrg.gallery || [];
      const newGallery = updateOrganizationDto.gallery || [];

      // Находим файлы, которые были удалены (есть в старой галерее, но нет в новой)
      const filesToDelete = oldGallery.filter((fileName) => !newGallery.includes(fileName));

      // Удаляем неиспользуемые файлы из S3
      if (filesToDelete.length > 0) {
        try {
          await this.s3Service.deleteFiles(filesToDelete);
        } catch (error) {
          // Логируем ошибку, но не прерываем обновление организации
          console.error(`Ошибка при удалении файлов из S3: ${error}`);
        }
      }

      updateData.gallery = newGallery;
    }

    const [organization] = await this.db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }
    return organization;
  }

  async remove(id: number) {
    // Проверяем существование организации и получаем данные для удаления файлов
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }

    // Удаляем связанные записи в organizationHelpTypes
    await this.db
      .delete(organizationHelpTypes)
      .where(eq(organizationHelpTypes.organizationId, id));

    // Удаляем связанные записи в organizationOwners
    await this.db
      .delete(organizationOwners)
      .where(eq(organizationOwners.organizationId, id));

    // Удаляем файлы из S3, если они есть в галерее
    if (organization.gallery && organization.gallery.length > 0) {
      try {
        await this.s3Service.deleteFiles(organization.gallery);
      } catch (error) {
        // Логируем ошибку, но не прерываем удаление организации
        console.error(`Ошибка при удалении файлов из S3: ${error}`);
      }
    }

    // Удаляем саму организацию
    const [deletedOrganization] = await this.db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning();

    return deletedOrganization;
  }

  async addOwner(organizationId: number, userId: number) {
    // Проверяем существование организации
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${organizationId} не найдена`);
    }

    // Проверяем существование пользователя
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, не является ли уже владельцем
    const [existing] = await this.db
      .select()
      .from(organizationOwners)
      .where(
        and(
          eq(organizationOwners.organizationId, organizationId),
          eq(organizationOwners.userId, userId),
        ),
      );
    if (existing) {
      throw new ConflictException('Пользователь уже является владельцем организации');
    }

    await this.db.insert(organizationOwners).values({
      organizationId,
      userId,
    });

    return { message: 'Владелец успешно добавлен' };
  }

  async removeOwner(organizationId: number, userId: number) {
    const [deleted] = await this.db
      .delete(organizationOwners)
      .where(
        and(
          eq(organizationOwners.organizationId, organizationId),
          eq(organizationOwners.userId, userId),
        ),
      )
      .returning();
    if (!deleted) {
      throw new NotFoundException('Связь не найдена');
    }
    return { message: 'Владелец успешно удален' };
  }

  async addHelpType(organizationId: number, helpTypeId: number) {
    // Проверяем существование организации
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${organizationId} не найдена`);
    }

    // Проверяем существование вида помощи
    const [helpType] = await this.db
      .select()
      .from(helpTypes)
      .where(eq(helpTypes.id, helpTypeId));
    if (!helpType) {
      throw new NotFoundException(`Вид помощи с ID ${helpTypeId} не найден`);
    }

    // Проверяем, не добавлен ли уже вид помощи
    const [existing] = await this.db
      .select()
      .from(organizationHelpTypes)
      .where(
        and(
          eq(organizationHelpTypes.organizationId, organizationId),
          eq(organizationHelpTypes.helpTypeId, helpTypeId),
        ),
      );
    if (existing) {
      throw new ConflictException('Вид помощи уже добавлен к организации');
    }

    await this.db.insert(organizationHelpTypes).values({
      organizationId,
      helpTypeId,
    });

    return { message: 'Вид помощи успешно добавлен' };
  }

  async removeHelpType(organizationId: number, helpTypeId: number) {
    const [deleted] = await this.db
      .delete(organizationHelpTypes)
      .where(
        and(
          eq(organizationHelpTypes.organizationId, organizationId),
          eq(organizationHelpTypes.helpTypeId, helpTypeId),
        ),
      )
      .returning();
    if (!deleted) {
      throw new NotFoundException('Связь не найдена');
    }
    return { message: 'Вид помощи успешно удален' };
  }

  async addImagesToGallery(organizationId: number, imageFileNames: string[]) {
    // Проверяем существование организации
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${organizationId} не найдена`);
    }

    // Получаем текущую галерею или создаем пустой массив
    const currentGallery = organization.gallery || [];
    const updatedGallery = [...currentGallery, ...imageFileNames];

    // Обновляем галерею
    const [updated] = await this.db
      .update(organizations)
      .set({
        gallery: updatedGallery,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    return updated;
  }

  /**
   * Проверяет, существует ли изображение в галерее организации
   * @param organizationId - ID организации
   * @param fileName - имя файла (ключ в S3)
   * @returns true, если файл есть в галерее
   */
  async checkImageInGallery(organizationId: number, fileName: string): Promise<boolean> {
    const [organization] = await this.db
      .select({ gallery: organizations.gallery })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    
    if (!organization) {
      return false;
    }

    const gallery = organization.gallery || [];
    return gallery.includes(fileName);
  }
}

