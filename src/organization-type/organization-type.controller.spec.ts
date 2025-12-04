import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationTypeController } from './organization-type.controller';
import { OrganizationTypeService } from './organization-type.service';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationTypeController', () => {
  let controller: OrganizationTypeController;
  let service: OrganizationTypeService;

  const mockOrganizationType = {
    id: 1,
    name: 'Благотворительный фонд',
    recordStatus: 'CREATED',
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
      controllers: [OrganizationTypeController],
      providers: [
        {
          provide: OrganizationTypeService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationTypeController>(OrganizationTypeController);
    service = module.get<OrganizationTypeService>(OrganizationTypeService);
    
    (controller as any).organizationTypeService = mockService;
  });

  describe('findAll', () => {
    it('should successfully return list of organization types without session (200)', async () => {
      mockService.findAll.mockResolvedValue([mockOrganizationType]);

      const result = await controller.findAll();

      expect(result).toEqual([mockOrganizationType]);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should successfully return organization type by id without session (200)', async () => {
      const typeId = 1;
      mockService.findOne.mockResolvedValue(mockOrganizationType);

      const result = await controller.findOne(typeId);

      expect(result).toEqual(mockOrganizationType);
      expect(mockService.findOne).toHaveBeenCalledWith(typeId);
    });

    it('should throw NotFoundException when organization type does not exist (404)', async () => {
      const typeId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Тип организации с ID ${typeId} не найден`)
      );

      const promise = controller.findOne(typeId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });
  });
});

