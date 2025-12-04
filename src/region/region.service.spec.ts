import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegionService } from './region.service';
import { NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('RegionService', () => {
  let service: RegionService;
  let redisService: RedisService;

  const mockRegion = {
    id: 1,
    name: 'Московская область',
    recordStatus: 'CREATED',
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
          where: vi.fn().mockResolvedValue([mockRegion]),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionService,
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

    service = module.get<RegionService>(RegionService);
    redisService = module.get<RedisService>(RedisService);
    
    (service as any).db = mockDb;
    (service as any).redisService = mockRedisService;
    (service as any).configService = mockConfigService;
  });

  describe('findAll', () => {
    it('should successfully return list of regions without session', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRegion]),
        }),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockRegion.id,
        name: mockRegion.name,
        recordStatus: mockRegion.recordStatus,
      });
      expect(mockRedisService.get).toHaveBeenCalledWith('regions:all');
    });

    it('should return cached regions when available', async () => {
      const cachedRegions = JSON.stringify([mockRegion]);
      mockRedisService.get.mockResolvedValue(cachedRegions);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockRegion.id,
        name: mockRegion.name,
        recordStatus: mockRegion.recordStatus,
      });
      expect(mockRedisService.get).toHaveBeenCalledWith('regions:all');
    });
  });

  describe('findOne', () => {
    it('should successfully return region by id', async () => {
      const regionId = 1;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRegion]),
        }),
      });

      const result = await service.findOne(regionId);

      expect(result).toMatchObject({
        id: mockRegion.id,
        name: mockRegion.name,
        recordStatus: mockRegion.recordStatus,
      });
    });

    it('should throw NotFoundException when region does not exist', async () => {
      const regionId = 999;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.findOne(regionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findCitiesByRegion', () => {
    it('should successfully return cities by region id', async () => {
      const regionId = 1;
      const mockCities = [{ id: 1, name: 'Москва', regionId: 1 }];
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockCities),
        }),
      });

      const result = await service.findCitiesByRegion(regionId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCities[0].id,
        name: mockCities[0].name,
        regionId: mockCities[0].regionId,
      });
    });
  });
});

