import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { NotFoundException } from '@nestjs/common';

describe('RegionController', () => {
  let controller: RegionController;
  let service: RegionService;

  const mockRegion = {
    id: 1,
    name: 'Московская область',
    recordStatus: 'CREATED',
  };

  const mockCities = [
    { id: 1, name: 'Москва', regionId: 1 },
    { id: 2, name: 'Подольск', regionId: 1 },
  ];

  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findCitiesByRegion: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findCitiesByRegion: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [
        {
          provide: RegionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RegionController>(RegionController);
    service = module.get<RegionService>(RegionService);
    
    (controller as any).regionService = mockService;
  });

  describe('findAll', () => {
    it('should successfully return list of regions without session (200)', async () => {
      mockService.findAll.mockResolvedValue([mockRegion]);

      const result = await controller.findAll();

      expect(result).toEqual([mockRegion]);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should successfully return region by id without session (200)', async () => {
      const regionId = 1;
      mockService.findOne.mockResolvedValue(mockRegion);

      const result = await controller.findOne(regionId);

      expect(result).toEqual(mockRegion);
      expect(mockService.findOne).toHaveBeenCalledWith(regionId);
    });

    it('should throw NotFoundException when region does not exist (404)', async () => {
      const regionId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Регион с ID ${regionId} не найден`)
      );

      const promise = controller.findOne(regionId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });
  });

  describe('findCitiesByRegion', () => {
    it('should successfully return cities by region id without session (200)', async () => {
      const regionId = 1;
      mockService.findCitiesByRegion.mockResolvedValue(mockCities);

      const result = await controller.findCitiesByRegion(regionId);

      expect(result).toEqual(mockCities);
      expect(mockService.findCitiesByRegion).toHaveBeenCalledWith(regionId);
    });
  });
});

