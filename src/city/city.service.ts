import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cities, regions } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CityService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async findAll(regionId?: number) {
    const ttlEnv = this.configService.get<string>('DEFAULT_CACHE_TTL_SECONDS');
    const ttlSeconds =
      ttlEnv && !Number.isNaN(Number(ttlEnv)) && Number(ttlEnv) > 0
        ? Number(ttlEnv)
        : 5;
    const baseConditions = [ne(cities.recordStatus, 'DELETED')];
    
    if (regionId) {
      baseConditions.push(eq(cities.regionId, regionId));
    }

    const cacheKey = regionId
      ? `cities:region:${regionId}`
      : 'cities:all';

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const citiesList = await this.db
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

    await this.redisService.set(
      cacheKey,
      JSON.stringify(citiesList),
      ttlSeconds,
    );

    return citiesList;
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

