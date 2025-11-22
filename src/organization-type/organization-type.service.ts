import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { organizationTypes } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';

@Injectable()
export class OrganizationTypeService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async findAll() {
    return this.db.select().from(organizationTypes).where(ne(organizationTypes.recordStatus, 'DELETED'));
  }

  async findOne(id: number) {
    const [organizationType] = await this.db
      .select()
      .from(organizationTypes)
      .where(and(
        eq(organizationTypes.id, id),
        ne(organizationTypes.recordStatus, 'DELETED')
      ));
    if (!organizationType) {
      throw new NotFoundException(`Тип организации с ID ${id} не найден`);
    }
    return organizationType;
  }
}

