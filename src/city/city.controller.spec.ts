import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CityController } from './city.controller';
import { CityService } from './city.service';
import { NotFoundException } from '@nestjs/common';

describe('CityController', () => {
  let controller: CityController;
  let service: CityService;

  const mockCity = {
    id: 1,
    name: 'Москва',
    latitude: '55.7558',
    longitude: '37.6173',
    regionId: 1,
    region: { id: 1, name: 'Московская область' },
  };

  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CityController],
      providers: [
        {
          provide: CityService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CityController>(CityController);
    service = module.get<CityService>(CityService);
    
    (controller as any).cityService = mockService;
  });

  describe('findAll', () => {
    it('should successfully return list of cities without session (200)', async () => {
      mockService.findAll.mockResolvedValue([mockCity]);

      const result = await controller.findAll();

      expect(result).toEqual([mockCity]);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should filter by regionId when query param is provided', async () => {
      const regionId = 1;
      mockService.findAll.mockResolvedValue([mockCity]);

      const result = await controller.findAll(regionId);

      expect(result).toEqual([mockCity]);
      expect(mockService.findAll).toHaveBeenCalledWith(regionId);
    });
  });

  describe('findOne', () => {
    it('should successfully return city by id without session (200)', async () => {
      const cityId = 1;
      mockService.findOne.mockResolvedValue(mockCity);

      const result = await controller.findOne(cityId);

      expect(result).toEqual(mockCity);
      expect(mockService.findOne).toHaveBeenCalledWith(cityId);
    });

    it('should throw NotFoundException when city does not exist (404)', async () => {
      const cityId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Город с ID ${cityId} не найден`)
      );

      const promise = controller.findOne(cityId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });
  });
});

