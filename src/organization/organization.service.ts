import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  organizationOwners,
  organizationHelpTypes,
  users,
  helpTypes,
} from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    const [organization] = await this.db
      .insert(organizations)
      .values({
        name: createOrganizationDto.name,
        latitude: createOrganizationDto.latitude.toString(),
        longitude: createOrganizationDto.longitude.toString(),
      })
      .returning();
    return organization;
  }

  async findAll() {
    return this.db.select().from(organizations);
  }

  async findOne(id: number) {
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }

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

    // Получаем виды помощи
    const orgHelpTypes = await this.db
      .select({
        id: helpTypes.id,
        name: helpTypes.name,
      })
      .from(organizationHelpTypes)
      .innerJoin(helpTypes, eq(organizationHelpTypes.helpTypeId, helpTypes.id))
      .where(eq(organizationHelpTypes.organizationId, id));

    return {
      ...organization,
      owners,
      helpTypes: orgHelpTypes,
    };
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    const updateData: any = { updatedAt: new Date() };
    if (updateOrganizationDto.name) updateData.name = updateOrganizationDto.name;
    if (updateOrganizationDto.latitude !== undefined)
      updateData.latitude = updateOrganizationDto.latitude.toString();
    if (updateOrganizationDto.longitude !== undefined)
      updateData.longitude = updateOrganizationDto.longitude.toString();

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
    const [organization] = await this.db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning();
    if (!organization) {
      throw new NotFoundException(`Организация с ID ${id} не найдена`);
    }
    return organization;
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
}

