import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { S3Service } from './s3.service';
import { EntityValidationService } from '../common/services/entity-validation.service';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: OrganizationRepository;
  let s3Service: S3Service;
  let db: NodePgDatabase;

  const mockOrganization = {
    id: 1,
    name: 'Тестовая организация',
    cityId: 1,
    organizationTypeId: 1,
    latitude: '55.7558',
    longitude: '37.6173',
    summary: 'Краткое описание',
    mission: 'Миссия организации',
    description: 'Полное описание',
    goals: ['Цель 1', 'Цель 2'],
    needs: ['Нужда 1'],
    address: 'г. Москва, ул. Примерная, д. 1',
    contacts: [{ name: 'Телефон', value: '+7 (999) 123-45-67' }],
    gallery: ['image1.jpg', 'image2.jpg'],
    isApproved: false,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockCity = {
    id: 1,
    name: 'Москва',
    latitude: '55.7558',
    longitude: '37.6173',
    recordStatus: 'CREATED',
  } as any;

  const mockOrganizationType = {
    id: 1,
    name: 'Благотворительный фонд',
    recordStatus: 'CREATED',
  } as any;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    recordStatus: 'CREATED',
  } as any;

  const mockHelpType = {
    id: 1,
    name: 'Финансовая помощь',
    recordStatus: 'CREATED',
  } as any;

  const mockOwner = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Иванович',
    email: 'ivan@example.com',
  };

  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    addOwner: ReturnType<typeof vi.fn>;
    findOwner: ReturnType<typeof vi.fn>;
    findHelpTypesByOrganizationIds: ReturnType<typeof vi.fn>;
    findOwnersByOrganizationIds: ReturnType<typeof vi.fn>;
    findHelpTypesByOrganizationId: ReturnType<typeof vi.fn>;
    findOwnersByOrganizationId: ReturnType<typeof vi.fn>;
    addHelpTypes: ReturnType<typeof vi.fn>;
  };

  let mockS3Service: {
    getImageUrls: ReturnType<typeof vi.fn>;
  };

  let mockEntityValidationService: {
    validateCityExists: ReturnType<typeof vi.fn>;
    validateOrganizationTypeExists: ReturnType<typeof vi.fn>;
    validateCategoriesExist: ReturnType<typeof vi.fn>;
    validateHelpTypesExist: ReturnType<typeof vi.fn>;
  };

  let mockDb: any;

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      findByUserId: vi.fn(),
      addOwner: vi.fn(),
      findOwner: vi.fn(),
      findHelpTypesByOrganizationIds: vi.fn(),
      findOwnersByOrganizationIds: vi.fn(),
      findHelpTypesByOrganizationId: vi.fn(),
      findOwnersByOrganizationId: vi.fn(),
      addHelpTypes: vi.fn(),
    };

    mockS3Service = {
      getImageUrls: vi.fn((urls: string[]) => urls.map(url => `https://s3.example.com/${url}`)),
    };

    mockEntityValidationService = {
      validateCityExists: vi.fn().mockResolvedValue(undefined),
      validateOrganizationTypeExists: vi.fn().mockResolvedValue(undefined),
      validateCategoriesExist: vi.fn().mockResolvedValue(undefined),
      validateHelpTypesExist: vi.fn().mockResolvedValue(undefined),
    };

    // Мок для db.select().from().where()
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCity]),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: OrganizationRepository,
          useValue: mockRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as any,
        },
        {
          provide: EntityValidationService,
          useValue: mockEntityValidationService,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    repository = module.get<OrganizationRepository>(OrganizationRepository);
    s3Service = module.get<S3Service>(S3Service);
    db = module.get<NodePgDatabase>(DATABASE_CONNECTION);
    
    // Принудительно устанавливаем зависимости
    (service as any).repository = mockRepository;
    (service as any).s3Service = mockS3Service;
    (service as any).db = mockDb;
    (service as any).entityValidationService = mockEntityValidationService;
  });

  describe('findAll', () => {
    it('should successfully return list of organizations without session', async () => {
      const mockOrgs = [mockOrganization];
      mockRepository.findAll.mockResolvedValue(mockOrgs);
      mockRepository.findHelpTypesByOrganizationIds.mockResolvedValue([]);
      mockRepository.findOwnersByOrganizationIds.mockResolvedValue([]);

      const result = await service.findAll(true);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepository.findAll).toHaveBeenCalledWith(true);
    });

    it('should return only approved organizations when includeAll is false', async () => {
      mockRepository.findAll.mockResolvedValue([mockOrganization]);
      mockRepository.findHelpTypesByOrganizationIds.mockResolvedValue([]);
      mockRepository.findOwnersByOrganizationIds.mockResolvedValue([]);

      const result = await service.findAll(false);

      expect(result).toBeDefined();
      expect(mockRepository.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should successfully return organization by id', async () => {
      const orgId = 1;
      mockRepository.findOne.mockResolvedValue({
        ...mockOrganization,
        cityName: 'Москва',
        cityLatitude: '55.7558',
        cityLongitude: '37.6173',
        cityRecordStatus: 'CREATED',
        organizationTypeName: 'Благотворительный фонд',
        organizationTypeRecordStatus: 'CREATED',
      });
      mockRepository.findHelpTypesByOrganizationId.mockResolvedValue([]);
      mockRepository.findOwnersByOrganizationId.mockResolvedValue([mockOwner]);

      const result = await service.findOne(orgId);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Тестовая организация');
      expect(result).toHaveProperty('owners');
      expect(mockRepository.findOne).toHaveBeenCalledWith(orgId);
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      const orgId = 999;
      mockRepository.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(orgId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOne).toHaveBeenCalledWith(orgId);
    });
  });

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      name: 'Новая организация',
      cityId: 1,
      typeId: 1,
      helpTypeIds: [1],
      summary: 'Краткое описание',
    };
    const userId = 1;

    it('should successfully create organization with session', async () => {
      // Мокаем db.select().from().where() для проверки города, типа организации, видов помощи и пользователя
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCity]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganizationType]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockHelpType]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        });

      mockRepository.create.mockResolvedValue(mockOrganization);
      mockRepository.addOwner.mockResolvedValue(undefined);
      mockRepository.addHelpTypes.mockResolvedValue(undefined);

      const result = await service.create(createDto, userId);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.addOwner).toHaveBeenCalledWith(mockOrganization.id, userId);
    });

    it('should throw NotFoundException when city does not exist', async () => {
      mockEntityValidationService.validateCityExists.mockRejectedValue(
        new NotFoundException(`Город с ID ${createDto.cityId} не найден`)
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const orgId = 1;
    const updateDto: UpdateOrganizationDto = {
      name: 'Обновленное название',
    };

    it('should successfully update organization when user is owner', async () => {
      const ownerUserId = 1;
      const updatedOrg = {
        ...mockOrganization,
        name: 'Обновленное название',
      };
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockRepository.findOwner.mockResolvedValue({ organizationId: orgId, userId: ownerUserId } as any);
      mockRepository.update.mockResolvedValue(updatedOrg);

      const result = await service.update(orgId, updateDto, ownerUserId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, ownerUserId);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(service.update(orgId, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      const ownerUserId = 1;
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockRepository.findOwner.mockResolvedValue(undefined);

      await expect(service.update(orgId, updateDto, nonOwnerUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, nonOwnerUserId);
    });
  });

  describe('findByUserId', () => {
    const userId = 1;

    it('should successfully return user organizations with session', async () => {
      mockRepository.findByUserId.mockResolvedValue([mockOrganization]);
      mockRepository.findHelpTypesByOrganizationIds.mockResolvedValue([]);
      mockRepository.findOwnersByOrganizationIds.mockResolvedValue([]);

      const result = await service.findByUserId(userId, true);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId, true);
    });
  });

  describe('addOwner', () => {
    const orgId = 1;
    const userId = 2;

    it('should successfully add owner to organization', async () => {
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockRepository.addOwner.mockResolvedValue(undefined);

      const currentOwnerUserId = 1;
      // findOwner вызывается дважды: сначала для проверки текущего владельца, затем для проверки нового
      mockRepository.findOwner
        .mockResolvedValueOnce({ organizationId: orgId, userId: currentOwnerUserId } as any) // текущий пользователь - владелец
        .mockResolvedValueOnce(undefined); // новый пользователь еще не владелец

      const result = await service.addOwner(orgId, userId, currentOwnerUserId);

      expect(result).toEqual({ message: 'Владелец успешно добавлен' });
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, currentOwnerUserId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, userId);
      expect(mockRepository.addOwner).toHaveBeenCalledWith(orgId, userId);
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(service.addOwner(orgId, userId, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already owner', async () => {
      const currentOwnerUserId = 1;
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockRepository.findOwner
        .mockResolvedValueOnce({ organizationId: orgId, userId: currentOwnerUserId } as any)
        .mockResolvedValueOnce({ organizationId: orgId, userId } as any);

      await expect(service.addOwner(orgId, userId, currentOwnerUserId)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when database throws unique constraint violation (race condition)', async () => {
      const currentOwnerUserId = 1;
      const userId = 2;
      
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      
      // Симулируем ситуацию race condition: findOwner возвращает undefined
      // (проверка в сервисе проходит), но при вставке БД выбрасывает ошибку уникальности
      mockRepository.findOwner
        .mockResolvedValueOnce({ organizationId: orgId, userId: currentOwnerUserId } as any) // текущий пользователь - владелец
        .mockResolvedValueOnce(undefined); // новый пользователь еще не владелец (по результату проверки)
      
      // Симулируем, что репозиторий выбрасывает ConflictException после обработки ошибки БД
      // (в реальном коде репозиторий преобразует ошибку 23505 в ConflictException)
      mockRepository.addOwner.mockRejectedValue(
        new ConflictException('Пользователь уже является владельцем организации')
      );
      
      await expect(service.addOwner(orgId, userId, currentOwnerUserId)).rejects.toThrow(ConflictException);
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, currentOwnerUserId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, userId);
      expect(mockRepository.addOwner).toHaveBeenCalledWith(orgId, userId);
    });

    it('should throw ForbiddenException when current user is not owner', async () => {
      const nonOwnerCurrentUserId = 999;
      const newOwnerUserId = 2;
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockRepository.findOwner.mockResolvedValue(undefined);

      await expect(service.addOwner(orgId, newOwnerUserId, nonOwnerCurrentUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, nonOwnerCurrentUserId);
    });
  });

  describe('addHelpType', () => {
    const orgId = 1;
    const helpTypeId = 1;

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockRepository.findOwner.mockResolvedValue(undefined);

      await expect(service.addHelpType(orgId, helpTypeId, nonOwnerUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, nonOwnerUserId);
    });
  });

  describe('removeHelpType', () => {
    const orgId = 1;
    const helpTypeId = 1;

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue(mockOrganization);
      mockRepository.findOwner.mockResolvedValue(undefined);

      await expect(service.removeHelpType(orgId, helpTypeId, nonOwnerUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(orgId);
      expect(mockRepository.findOwner).toHaveBeenCalledWith(orgId, nonOwnerUserId);
    });
  });

});

