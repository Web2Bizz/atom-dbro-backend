import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cities, regions } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';

@Injectable()
export class CityService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async findAll(regionId?: number) {
    const baseConditions = [ne(cities.recordStatus, 'DELETED')];
    
    if (regionId) {
      baseConditions.push(eq(cities.regionId, regionId));
    }

    return this.db
      .select({
        id: cities.id,
        name: cities.name,
        latitude: cities.latitude,
        longitude: cities.longitude,
        regionId: cities.regionId,
        region: {
          id: regions.id,
          name: regions.name,
        },
        createdAt: cities.createdAt,
        updatedAt: cities.updatedAt,
      })
      .from(cities)
      .leftJoin(regions, eq(cities.regionId, regions.id))
      .where(and(...baseConditions));
  }

  async findOne(id: number) {
    const [city] = await this.db
      .select({
        id: cities.id,
        name: cities.name,
        latitude: cities.latitude,
        longitude: cities.longitude,
        regionId: cities.regionId,
        region: {
          id: regions.id,
          name: regions.name,
        },
        createdAt: cities.createdAt,
        updatedAt: cities.updatedAt,
      })
      .from(cities)
      .leftJoin(regions, eq(cities.regionId, regions.id))
      .where(and(
        eq(cities.id, id),
        ne(cities.recordStatus, 'DELETED')
      ));
    if (!city) {
      throw new NotFoundException(`Город с ID ${id} не найден`);
    }
    return city;
  }
}

