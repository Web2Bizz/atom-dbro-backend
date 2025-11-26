import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { regions, cities } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const REGIONS_CACHE_KEY = 'regions:all';

@Injectable()
export class RegionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async findAll() {
    const ttlEnv = this.configService.get<string>('DEFAULT_CACHE_TTL_SECONDS');
    const ttlSeconds =
      ttlEnv && !Number.isNaN(Number(ttlEnv)) && Number(ttlEnv) > 0
        ? Number(ttlEnv)
        : 5;
    // Пытаемся взять из кеша
    const cached = await this.redisService.get(REGIONS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const regionsList = await this.db
      .select()
      .from(regions)
      .where(ne(regions.recordStatus, 'DELETED'));

    // Кладём в кеш на ttlSeconds
    await this.redisService.set(
      REGIONS_CACHE_KEY,
      JSON.stringify(regionsList),
      ttlSeconds,
    );

    return regionsList;
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

