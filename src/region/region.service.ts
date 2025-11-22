import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { regions, cities } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';

@Injectable()
export class RegionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async findAll() {
    return this.db.select().from(regions).where(ne(regions.recordStatus, 'DELETED'));
  }

  async findOne(id: number) {
    const [region] = await this.db
      .select()
      .from(regions)
      .where(and(
        eq(regions.id, id),
        ne(regions.recordStatus, 'DELETED')
      ));
    if (!region) {
      throw new NotFoundException(`Регион с ID ${id} не найден`);
    }
    return region;
  }

  async findCitiesByRegion(regionId: number) {
    return this.db
      .select()
      .from(cities)
      .where(and(
        eq(cities.regionId, regionId),
        ne(cities.recordStatus, 'DELETED')
      ));
  }
}

