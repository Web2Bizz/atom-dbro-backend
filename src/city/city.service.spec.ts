import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CityService } from './city.service';
import { NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('CityService', () => {
  let service: CityService;
  let redisService: RedisService;
  let configService: ConfigService;

  const mockCity = {
    id: 1,
    name: 'Москва',
    latitude: '55.7558',
    longitude: '37.6173',
    regionId: 1,
    region: { id: 1, name: 'Московская область' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockDb: any;
  let mockRedisService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'DEFAULT_CACHE_TTL_SECONDS') return '5';
        return undefined;
      }),
    };

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCity]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as any,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CityService>(CityService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    
    (service as any).db = mockDb;
    (service as any).redisService = mockRedisService;
    (service as any).configService = mockConfigService;
  });

  describe('findAll', () => {
    it('should successfully return list of cities without session', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCity]),
          }),
        }),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCity.id,
        name: mockCity.name,
        latitude: mockCity.latitude,
        longitude: mockCity.longitude,
        regionId: mockCity.regionId,
        region: mockCity.region,
      });
      expect(mockRedisService.get).toHaveBeenCalledWith('cities:all');
    });

    it('should return cached cities when available', async () => {
      const cachedCities = JSON.stringify([mockCity]);
      mockRedisService.get.mockResolvedValue(cachedCities);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCity.id,
        name: mockCity.name,
        latitude: mockCity.latitude,
        longitude: mockCity.longitude,
        regionId: mockCity.regionId,
        region: mockCity.region,
      });
      expect(mockRedisService.get).toHaveBeenCalledWith('cities:all');
    });

    it('should filter by regionId when provided', async () => {
      const regionId = 1;
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCity]),
          }),
        }),
      });

      const result = await service.findAll(regionId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCity.id,
        name: mockCity.name,
        latitude: mockCity.latitude,
        longitude: mockCity.longitude,
        regionId: mockCity.regionId,
        region: mockCity.region,
      });
      expect(mockRedisService.get).toHaveBeenCalledWith(`cities:region:${regionId}`);
    });
  });

  describe('findOne', () => {
    it('should successfully return city by id', async () => {
      const cityId = 1;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCity]),
          }),
        }),
      });

      const result = await service.findOne(cityId);

      expect(result).toMatchObject({
        id: mockCity.id,
        name: mockCity.name,
        latitude: mockCity.latitude,
        longitude: mockCity.longitude,
        regionId: mockCity.regionId,
        region: mockCity.region,
      });
    });

    it('should throw NotFoundException when city does not exist', async () => {
      const cityId = 999;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.findOne(cityId)).rejects.toThrow(NotFoundException);
    });
  });
});

