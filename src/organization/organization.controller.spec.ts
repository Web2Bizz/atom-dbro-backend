import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { S3Service } from './s3.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: OrganizationService;

  const mockOrganization = {
    id: 1,
    name: 'Тестовая организация',
    cityId: 1,
    latitude: 55.7558,
    longitude: 37.6173,
  };

  const mockCurrentUser = { userId: 1, email: 'ivan@example.com' };

  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    addOwner: ReturnType<typeof vi.fn>;
    addHelpType: ReturnType<typeof vi.fn>;
    removeHelpType: ReturnType<typeof vi.fn>;
  };

  let mockS3Service: any;

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findByUserId: vi.fn(),
      addOwner: vi.fn(),
      addHelpType: vi.fn(),
      removeHelpType: vi.fn(),
    };

    mockS3Service = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: mockService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get<OrganizationService>(OrganizationService);
    
    (controller as any).organizationService = mockService;
    (controller as any).s3Service = mockS3Service;
  });

  describe('findAll', () => {
    it('should successfully return list of organizations without session (200)', async () => {
      mockService.findAll.mockResolvedValue([mockOrganization]);

      const result = await controller.findAll();

      expect(result).toEqual([mockOrganization]);
      expect(mockService.findAll).toHaveBeenCalledWith(true);
    });

    it('should filter by onlyApproved when query param is set', async () => {
      mockService.findAll.mockResolvedValue([mockOrganization]);

      const result = await controller.findAll('true');

      expect(result).toEqual([mockOrganization]);
      expect(mockService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should successfully return organization by id without session (200)', async () => {
      const orgId = 1;
      mockService.findOne.mockResolvedValue(mockOrganization);

      const result = await controller.findOne(orgId);

      expect(result).toEqual(mockOrganization);
      expect(mockService.findOne).toHaveBeenCalledWith(orgId);
    });

    it('should throw NotFoundException when organization does not exist (404)', async () => {
      const orgId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Организация с ID ${orgId} не найдена`)
      );

      const promise = controller.findOne(orgId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      name: 'Новая организация',
      cityId: 1,
      typeId: 1,
      helpTypeIds: [1],
    };

    it('should successfully create organization with session (201)', async () => {
      mockService.create.mockResolvedValue(mockOrganization);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockOrganization);
      expect(mockService.create).toHaveBeenCalledWith(createDto, mockCurrentUser.userId);
    });
  });

  describe('update', () => {
    const orgId = 1;
    const updateDto: UpdateOrganizationDto = {
      name: 'Обновленное название',
    };

    it('should successfully update organization with session (200)', async () => {
      const updatedOrg = { ...mockOrganization, name: 'Обновленное название' };
      mockService.update.mockResolvedValue(updatedOrg);

      const result = await controller.update(orgId, updateDto, mockCurrentUser);

      expect(result).toEqual(updatedOrg);
      expect(mockService.update).toHaveBeenCalledWith(orgId, updateDto, mockCurrentUser.userId);
    });

    it('should throw NotFoundException when organization does not exist (404)', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Организация с ID ${orgId} не найдена`)
      );

      const promise = controller.update(orgId, updateDto, mockCurrentUser);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.update).toHaveBeenCalledWith(orgId, updateDto, mockCurrentUser.userId);
    });

    it('should throw ForbiddenException when user is not owner (403)', async () => {
      mockService.update.mockRejectedValue(
        new ForbiddenException('Только владелец организации может обновить организацию')
      );

      const promise = controller.update(orgId, updateDto, mockCurrentUser);
      await expect(promise).rejects.toThrow(ForbiddenException);
      expect(mockService.update).toHaveBeenCalledWith(orgId, updateDto, mockCurrentUser.userId);
    });
  });

  describe('findMyOrganizations', () => {
    it('should successfully return user organizations with session (200)', async () => {
      mockService.findByUserId.mockResolvedValue([mockOrganization]);

      const result = await controller.findMyOrganizations(mockCurrentUser);

      expect(result).toEqual([mockOrganization]);
      expect(mockService.findByUserId).toHaveBeenCalledWith(mockCurrentUser.userId, true);
    });
  });

  describe('addOwner', () => {
    const orgId = 1;
    const addOwnerDto = { userId: 2 };

    it('should successfully add owner with session (201)', async () => {
      mockService.addOwner.mockResolvedValue({ message: 'Владелец успешно добавлен' });

      const result = await controller.addOwner(orgId, addOwnerDto, mockCurrentUser);

      expect(result).toEqual({ message: 'Владелец успешно добавлен' });
      expect(mockService.addOwner).toHaveBeenCalledWith(orgId, addOwnerDto.userId, mockCurrentUser.userId);
    });

    it('should throw ConflictException when user is already owner (409)', async () => {
      mockService.addOwner.mockRejectedValue(
        new ConflictException('Пользователь уже является владельцем организации')
      );

      const promise = controller.addOwner(orgId, addOwnerDto, mockCurrentUser);
      await expect(promise).rejects.toThrow(ConflictException);
      expect(mockService.addOwner).toHaveBeenCalledWith(orgId, addOwnerDto.userId, mockCurrentUser.userId);
    });
  });
});

