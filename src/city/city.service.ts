import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cities, regions } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CityService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createCityDto: CreateCityDto) {
    // Проверяем существование региона
    const [region] = await this.db
      .select()
      .from(regions)
      .where(eq(regions.id, createCityDto.regionId));
    if (!region) {
      throw new NotFoundException(`Регион с ID ${createCityDto.regionId} не найден`);
    }

    const [city] = await this.db
      .insert(cities)
      .values({
        name: createCityDto.name,
        latitude: createCityDto.latitude.toString(),
        longitude: createCityDto.longitude.toString(),
        regionId: createCityDto.regionId,
      })
      .returning();
    return city;
  }

  async findAll(regionId?: number) {
    const query = this.db
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
      .leftJoin(regions, eq(cities.regionId, regions.id));

    if (regionId) {
      return query.where(eq(cities.regionId, regionId));
    }

    return query;
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
      .where(eq(cities.id, id));
    if (!city) {
      throw new NotFoundException(`Город с ID ${id} не найден`);
    }
    return city;
  }

  async update(id: number, updateCityDto: UpdateCityDto) {
    if (updateCityDto.regionId) {
      const [region] = await this.db
        .select()
        .from(regions)
        .where(eq(regions.id, updateCityDto.regionId));
      if (!region) {
        throw new NotFoundException(`Регион с ID ${updateCityDto.regionId} не найден`);
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (updateCityDto.name) updateData.name = updateCityDto.name;
    if (updateCityDto.latitude !== undefined)
      updateData.latitude = updateCityDto.latitude.toString();
    if (updateCityDto.longitude !== undefined)
      updateData.longitude = updateCityDto.longitude.toString();
    if (updateCityDto.regionId) updateData.regionId = updateCityDto.regionId;

    const [city] = await this.db
      .update(cities)
      .set(updateData)
      .where(eq(cities.id, id))
      .returning();
    if (!city) {
      throw new NotFoundException(`Город с ID ${id} не найден`);
    }
    return city;
  }

  async remove(id: number) {
    const [city] = await this.db
      .delete(cities)
      .where(eq(cities.id, id))
      .returning();
    if (!city) {
      throw new NotFoundException(`Город с ID ${id} не найден`);
    }
    return city;
  }
}

