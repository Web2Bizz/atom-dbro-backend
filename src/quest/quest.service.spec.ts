import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestService } from './quest.service';
import { QuestRepository } from './quest.repository';
import { QuestEventsService } from './quest.events';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

describe('QuestService', () => {
  let service: QuestService;
  let repository: QuestRepository;

  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    experienceReward: 100,
    ownerId: 1,
    cityId: 1,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    level: 5,
    experience: 0,
    recordStatus: 'CREATED',
  } as any;

  const mockCity = {
    id: 1,
    name: 'Москва',
    recordStatus: 'CREATED',
  } as any;

  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    findCityById: ReturnType<typeof vi.fn>;
    findOrganizationTypeById: ReturnType<typeof vi.fn>;
    findCategoriesByIds: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdWithDetails: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findByStatus: ReturnType<typeof vi.fn>;
    findCategoriesForQuest: ReturnType<typeof vi.fn>;
    findCategoriesForQuests: ReturnType<typeof vi.fn>;
    createUserQuest: ReturnType<typeof vi.fn>;
    findUserDataForEvent: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findUserQuest: ReturnType<typeof vi.fn>;
    deleteUserQuest: ReturnType<typeof vi.fn>;
    findQuestParticipants: ReturnType<typeof vi.fn>;
    updateUserQuest: ReturnType<typeof vi.fn>;
    updateUserExperience: ReturnType<typeof vi.fn>;
    findUserAchievement: ReturnType<typeof vi.fn>;
    createUserAchievement: ReturnType<typeof vi.fn>;
    findQuestDataForEvent: ReturnType<typeof vi.fn>;
    createAchievement: ReturnType<typeof vi.fn>;
    updateAchievement: ReturnType<typeof vi.fn>;
    linkQuestToCategories: ReturnType<typeof vi.fn>;
    archive: ReturnType<typeof vi.fn>;
  };

  let mockQuestEventsService: {
    emitUserJoined: ReturnType<typeof vi.fn>;
    emitQuestCreated: ReturnType<typeof vi.fn>;
    emitQuestCompleted: ReturnType<typeof vi.fn>;
  };

  let mockStepVolunteerRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findUserById: vi.fn(),
      findCityById: vi.fn(),
      findOrganizationTypeById: vi.fn(),
      findCategoriesByIds: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByIdWithDetails: vi.fn(),
      findAll: vi.fn(),
      findByStatus: vi.fn(),
      findCategoriesForQuest: vi.fn(),
      findCategoriesForQuests: vi.fn(),
      createUserQuest: vi.fn(),
      findUserDataForEvent: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findUserQuest: vi.fn(),
      deleteUserQuest: vi.fn(),
      findQuestParticipants: vi.fn(),
      updateUserQuest: vi.fn(),
      updateUserExperience: vi.fn(),
      findUserAchievement: vi.fn(),
      createUserAchievement: vi.fn(),
      findQuestDataForEvent: vi.fn(),
      createAchievement: vi.fn(),
      updateAchievement: vi.fn(),
      linkQuestToCategories: vi.fn(),
      archive: vi.fn(),
    };

    mockQuestEventsService = {
      emitUserJoined: vi.fn(),
      emitQuestCreated: vi.fn(),
      emitQuestCompleted: vi.fn(),
    };

    mockStepVolunteerRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        {
          provide: QuestRepository,
          useValue: mockRepository,
        },
        {
          provide: QuestEventsService,
          useValue: mockQuestEventsService,
        },
        {
          provide: StepVolunteerRepository,
          useValue: mockStepVolunteerRepository,
        },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);
    repository = module.get<QuestRepository>(QuestRepository);
    
    (service as any).questRepository = mockRepository;
    (service as any).questEventsService = mockQuestEventsService;
    (service as any).stepVolunteerRepository = mockStepVolunteerRepository;
  });

  describe('findAll', () => {
    it('should successfully return list of quests without session', async () => {
      mockRepository.findAll.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter by cityId and categoryId when provided', async () => {
      const cityId = 1;
      const categoryId = 1;
      mockRepository.findAll.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findAll(cityId, categoryId);

      expect(result).toBeDefined();
      expect(mockRepository.findAll).toHaveBeenCalledWith(cityId, categoryId);
    });
  });

  describe('findOne', () => {
    it('should successfully return quest by id', async () => {
      const questId = 1;
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findByIdWithDetails.mockResolvedValue(mockQuest);
      mockRepository.findCategoriesForQuest.mockResolvedValue([]);

      const result = await service.findOne(questId);

      expect(result).toHaveProperty('id', 1);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      const questId = 999;
      mockRepository.findById.mockResolvedValue(undefined);

      const promise = service.findOne(questId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Квест с ID ${questId} не найден`);
    });
  });

  describe('create', () => {
    const createDto: CreateQuestDto = {
      title: 'Новый квест',
      description: 'Описание',
      cityId: 1,
    };
    const userId = 1;

    it('should successfully create quest with session', async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findCityById.mockResolvedValue(mockCity);
      mockRepository.create.mockResolvedValue(mockQuest);
      mockRepository.findByIdWithDetails.mockResolvedValue(mockQuest);
      mockRepository.findCategoriesForQuest.mockResolvedValue([]);
      mockRepository.createUserQuest.mockResolvedValue({ id: 1 } as any);
      mockRepository.findUserDataForEvent.mockResolvedValue({});

      const result = await service.create(createDto, userId);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.createUserQuest).toHaveBeenCalledWith(userId, mockQuest.id, 'in_progress');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findUserById.mockResolvedValue(undefined);

      const promise = service.create(createDto, userId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Пользователь с ID ${userId} не найден`);
    });

    it('should throw NotFoundException when city does not exist', async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findCityById.mockResolvedValue(undefined);

      const promise = service.create(createDto, userId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Город с ID ${createDto.cityId} не найден`);
    });
  });

  describe('update', () => {
    const questId = 1;
    const updateDto: UpdateQuestDto = {
      title: 'Обновленное название',
    };

    it('should successfully update quest when user is owner', async () => {
      const ownerUserId = 1;
      const updatedQuest = {
        ...mockQuest,
        title: 'Обновленное название',
      };
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.update.mockResolvedValue(updatedQuest);
      // update вызывает findOne в конце, который использует findByIdWithDetails и findCategoriesForQuest
      mockRepository.findByIdWithDetails.mockResolvedValue(updatedQuest);
      mockRepository.findCategoriesForQuest.mockResolvedValue([]);

      const result = await service.update(questId, updateDto, ownerUserId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.update).toHaveBeenCalled();
      // Проверяем, что findOne был вызван (через findByIdWithDetails и findCategoriesForQuest)
      expect(mockRepository.findByIdWithDetails).toHaveBeenCalledWith(questId);
      expect(mockRepository.findCategoriesForQuest).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(service.update(questId, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue({ ...mockQuest, ownerId: 1 });

      await expect(service.update(questId, updateDto, nonOwnerUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
    });
  });

  describe('remove', () => {
    const questId = 1;

    it('should successfully remove quest when user is owner', async () => {
      const ownerUserId = 1;
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.softDelete.mockResolvedValue(mockQuest);

      const result = await service.remove(questId, ownerUserId);

      expect(result).toEqual(mockQuest);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(service.remove(questId, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue({ ...mockQuest, ownerId: 1 });

      await expect(service.remove(questId, nonOwnerUserId)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
    });
  });

  describe('completeQuest', () => {
    const questId = 1;
    const userId = 1;

    it('should successfully complete quest when user is owner', async () => {
      const participants = [
        {
          userId: 2,
          userQuestId: 1,
          userQuestStatus: 'in_progress',
          user: { experience: 0 },
        },
      ];
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findQuestParticipants.mockResolvedValue(participants);
      mockRepository.update.mockResolvedValue({ ...mockQuest, status: 'completed' });
      mockRepository.updateUserQuest.mockResolvedValue(undefined);
      mockRepository.updateUserExperience.mockResolvedValue(undefined);
      mockRepository.findQuestDataForEvent.mockResolvedValue({});

      const result = await service.completeQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.update).toHaveBeenCalledWith(questId, { status: 'completed' });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue(mockQuest);

      const promise = service.completeQuest(nonOwnerUserId, questId);
      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow('Только автор квеста может завершить квест');
    });

    it('should throw ConflictException when quest is already completed', async () => {
      const completedQuest = { ...mockQuest, status: 'completed' };
      mockRepository.findById.mockResolvedValue(completedQuest);

      const promise = service.completeQuest(userId, questId);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Квест уже завершен');
    });
  });

  describe('archiveQuest', () => {
    const questId = 1;
    const userId = 1;

    it('should successfully archive quest when user is owner', async () => {
      const archivedQuest = { ...mockQuest, status: 'archived' };
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.archive.mockResolvedValue(archivedQuest);
      mockRepository.findByIdWithDetails.mockResolvedValue(archivedQuest);
      mockRepository.findCategoriesForQuest.mockResolvedValue([]);

      const result = await service.archiveQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.archive).toHaveBeenCalledWith(questId);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue(mockQuest);

      await expect(service.archiveQuest(nonOwnerUserId, questId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('joinQuest', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully join quest with session', async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findUserQuest.mockResolvedValue(undefined);
      mockRepository.createUserQuest.mockResolvedValue({ id: 1 } as any);
      mockRepository.findUserDataForEvent.mockResolvedValue({});

      const result = await service.joinQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.createUserQuest).toHaveBeenCalledWith(userId, questId, 'in_progress');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findUserById.mockResolvedValue(undefined);

      const promise = service.joinQuest(userId, questId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Пользователь с ID ${userId} не найден`);
    });

    it('should throw BadRequestException when quest is not active', async () => {
      const archivedQuest = { ...mockQuest, status: 'archived' };
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(archivedQuest);

      const promise = service.joinQuest(userId, questId);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Квест не доступен для выполнения');
    });

    it('should throw ConflictException when user already joined', async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findUserQuest.mockResolvedValue({ id: 1 } as any);

      const promise = service.joinQuest(userId, questId);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователь уже присоединился к этому квесту');
    });
  });

  describe('leaveQuest', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully leave quest with session', async () => {
      const userQuest = {
        id: 1,
        userId,
        questId,
        status: 'in_progress',
      };
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findUserQuest.mockResolvedValue(userQuest);
      mockRepository.deleteUserQuest.mockResolvedValue(userQuest);

      const result = await service.leaveQuest(userId, questId);

      expect(result).toEqual(userQuest);
      expect(mockRepository.deleteUserQuest).toHaveBeenCalledWith(userQuest.id);
    });

    it('should throw NotFoundException when user does not participate', async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findUserQuest.mockResolvedValue(undefined);

      const promise = service.leaveQuest(userId, questId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователь не участвует в этом квесте');
    });

    it('should throw BadRequestException when quest is already completed', async () => {
      const userQuest = {
        id: 1,
        userId,
        questId,
        status: 'completed',
      };
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.findUserQuest.mockResolvedValue(userQuest);

      const promise = service.leaveQuest(userId, questId);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Нельзя покинуть уже завершенный квест');
    });
  });

  describe('updateRequirementCurrentValue', () => {
    const questId = 1;
    const stepType = 'finance' as const;
    const updateRequirementDto = { currentValue: 100 };

    it('should throw ForbiddenException when user is not owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findById.mockResolvedValue({ ...mockQuest, ownerId: 1 });

      await expect(
        service.updateRequirementCurrentValue(questId, stepType, updateRequirementDto, nonOwnerUserId)
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
    });
  });
});

