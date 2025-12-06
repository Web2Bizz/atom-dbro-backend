import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestService } from './quest.service';
import { QuestRepository } from './quest.repository';
import { QuestEventsService } from './quest.events';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';
import { ContributerRepository } from '../contributer/contributer.repository';
import { EntityValidationService } from '../common/services/entity-validation.service';
import { QuestCacheService } from './quest-cache.service';
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
    emitRequirementUpdated: ReturnType<typeof vi.fn>;
  };

  let mockStepVolunteerRepository: {
    getSumContributeValue: ReturnType<typeof vi.fn>;
  };

  let mockContributerRepository: {
    getConfirmedContributersCount: ReturnType<typeof vi.fn>;
  };

  let mockEntityValidationService: {
    validateCityExists: ReturnType<typeof vi.fn>;
    validateOrganizationTypeExists: ReturnType<typeof vi.fn>;
    validateCategoriesExist: ReturnType<typeof vi.fn>;
    validateHelpTypesExist: ReturnType<typeof vi.fn>;
  };

  let mockQuestCacheService: {
    setQuest: ReturnType<typeof vi.fn>;
    invalidateQuest: ReturnType<typeof vi.fn>;
    getQuest: ReturnType<typeof vi.fn>;
  };

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
      emitRequirementUpdated: vi.fn(),
    };

    mockStepVolunteerRepository = {
      getSumContributeValue: vi.fn(),
    };

    mockContributerRepository = {
      getConfirmedContributersCount: vi.fn(),
    };

    mockEntityValidationService = {
      validateCityExists: vi.fn().mockResolvedValue(undefined),
      validateOrganizationTypeExists: vi.fn().mockResolvedValue(undefined),
      validateCategoriesExist: vi.fn().mockResolvedValue(undefined),
      validateHelpTypesExist: vi.fn().mockResolvedValue(undefined),
    };

    mockQuestCacheService = {
      setQuest: vi.fn(),
      invalidateQuest: vi.fn(),
      getQuest: vi.fn(),
    };

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
        {
          provide: ContributerRepository,
          useValue: mockContributerRepository,
        },
        {
          provide: QuestCacheService,
          useValue: mockQuestCacheService,
        },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);
    repository = module.get<QuestRepository>(QuestRepository);
    
    (service as any).questRepository = mockRepository;
    (service as any).questEventsService = mockQuestEventsService;
    (service as any).stepVolunteerRepository = mockStepVolunteerRepository;
    (service as any).contributerRepository = mockContributerRepository;
    (service as any).entityValidationService = mockEntityValidationService;
    (service as any).questCacheService = mockQuestCacheService;
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

  describe('findByStatus', () => {
    it('should successfully return quests filtered by ownerId', async () => {
      const ownerId = 1;
      mockRepository.findByStatus.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findByStatus(undefined, undefined, undefined, ownerId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(undefined, undefined, undefined, ownerId);
    });

    it('should filter by ownerId with status when both provided', async () => {
      const status = 'active';
      const ownerId = 1;
      mockRepository.findByStatus.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findByStatus(status, undefined, undefined, ownerId);

      expect(result).toBeDefined();
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(status, undefined, undefined, ownerId);
    });

    it('should filter by ownerId with cityId and categoryId when all provided', async () => {
      const status = 'active';
      const cityId = 1;
      const categoryId = 2;
      const ownerId = 1;
      mockRepository.findByStatus.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findByStatus(status, cityId, categoryId, ownerId);

      expect(result).toBeDefined();
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(status, cityId, categoryId, ownerId);
    });

    it('should return quests without ownerId filter when ownerId is not provided', async () => {
      mockRepository.findByStatus.mockResolvedValue([mockQuest]);
      mockRepository.findCategoriesForQuests.mockResolvedValue([]);

      const result = await service.findByStatus('active', undefined, undefined);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepository.findByStatus).toHaveBeenCalledWith('active', undefined, undefined, undefined);
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
      mockQuestCacheService.setQuest.mockResolvedValue(undefined);

      const result = await service.create(createDto, userId);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.createUserQuest).toHaveBeenCalledWith(userId, mockQuest.id, 'in_progress');
      expect(mockQuestCacheService.setQuest).toHaveBeenCalledWith(mockQuest.id, expect.any(Object));
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
      mockEntityValidationService.validateCityExists.mockRejectedValue(
        new NotFoundException(`Город с ID ${createDto.cityId} не найден`)
      );

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
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.update(questId, updateDto, ownerUserId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.update).toHaveBeenCalled();
      // Проверяем, что findOne был вызван (через findByIdWithDetails и findCategoriesForQuest)
      expect(mockRepository.findByIdWithDetails).toHaveBeenCalledWith(questId);
      expect(mockRepository.findCategoriesForQuest).toHaveBeenCalledWith(questId);
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
    });

    it('should invalidate cache after update - next request should go to DB', async () => {
      const ownerUserId = 1;
      const updatedQuest = {
        ...mockQuest,
        title: 'Обновленное название',
      };
      mockRepository.findById.mockResolvedValue(mockQuest);
      mockRepository.update.mockResolvedValue(updatedQuest);
      mockRepository.findByIdWithDetails.mockResolvedValue(updatedQuest);
      mockRepository.findCategoriesForQuest.mockResolvedValue([]);
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      await service.update(questId, updateDto, ownerUserId);

      // Verify cache was invalidated
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
      
      // Simulate next request - should go to DB (cache miss)
      mockQuestCacheService.getQuest.mockResolvedValue(null);
      mockRepository.findByIdWithDetails.mockResolvedValue(updatedQuest);
      
      // In real implementation, getQuest would be called and should go to DB
      // This test verifies that invalidateQuest was called
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
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.remove(questId, ownerUserId);

      expect(result).toEqual(mockQuest);
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(questId);
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
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

    it('should successfully complete quest when user is owner and emit quest_completed event with reward data for each participant', async () => {
      const participants = [
        {
          userId: 2,
          userQuestId: 1,
          userQuestStatus: 'in_progress',
          user: { experience: 0 },
        },
        {
          userId: 3,
          userQuestId: 2,
          userQuestStatus: 'completed',
          user: { experience: 50 },
        },
      ];

      const questWithRewardAndAchievement = {
        ...mockQuest,
        ownerId: userId,
        experienceReward: 150,
        achievementId: 10,
      };

      mockRepository.findById.mockResolvedValue(questWithRewardAndAchievement);
      mockRepository.findQuestParticipants.mockResolvedValue(participants);
      mockRepository.update.mockResolvedValue({ ...questWithRewardAndAchievement, status: 'completed' });
      mockRepository.updateUserQuest.mockResolvedValue(undefined);
      mockRepository.updateUserExperience.mockResolvedValue(undefined);
      mockRepository.findUserAchievement.mockResolvedValue(undefined);
      mockRepository.createUserAchievement.mockResolvedValue(undefined);
      mockRepository.findQuestDataForEvent.mockResolvedValue({
        some: 'quest-data',
      });

      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.completeQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.update).toHaveBeenCalledWith(questId, { status: 'completed' });
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);

      expect(mockQuestEventsService.emitQuestCompleted).toHaveBeenCalledTimes(participants.length);

      for (const participant of participants) {
        expect(mockQuestEventsService.emitQuestCompleted).toHaveBeenCalledWith(
          questId,
          participant.userId,
          expect.objectContaining({
            userId: participant.userId,
            experienceReward: questWithRewardAndAchievement.experienceReward,
            achievementId: questWithRewardAndAchievement.achievementId,
          }),
        );
      }
    });

    it('should not duplicate reward when completeQuest is called twice for the same quest', async () => {
      const questId = 1;
      const ownerUserId = 1;
      const participants = [
        {
          userId: 2,
          userQuestId: 1,
          userQuestStatus: 'in_progress',
          user: { experience: 0 },
        },
      ];

      const questWithRewardAndAchievement = {
        ...mockQuest,
        ownerId: ownerUserId,
        experienceReward: 150,
        achievementId: 10,
      };

      // Первый вызов completeQuest
      mockRepository.findById.mockResolvedValueOnce(questWithRewardAndAchievement);
      mockRepository.findQuestParticipants.mockResolvedValueOnce(participants);
      mockRepository.update.mockResolvedValueOnce({ ...questWithRewardAndAchievement, status: 'completed' });
      mockRepository.updateUserQuest.mockResolvedValueOnce(undefined);
      mockRepository.findQuestDataForEvent.mockResolvedValueOnce({});

      await service.completeQuest(ownerUserId, questId);

      // Второй вызов completeQuest (квест уже завершён)
      const completedQuest = { ...questWithRewardAndAchievement, status: 'completed' };
      mockRepository.findById.mockResolvedValueOnce(completedQuest);

      // Ожидаем ConflictException при попытке завершить уже завершённый квест
      await expect(service.completeQuest(ownerUserId, questId)).rejects.toThrow(ConflictException);

      // Проверяем, что событие quest_completed было эмитировано только один раз для каждого участника
      const callsForParticipant = mockQuestEventsService.emitQuestCompleted.mock.calls.filter(
        ([qId, userId]) => qId === questId && userId === participants[0].userId,
      );
      expect(callsForParticipant.length).toBe(1);
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
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.archiveQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockRepository.archive).toHaveBeenCalledWith(questId);
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
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
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.joinQuest(userId, questId);

      expect(result).toBeDefined();
      expect(mockRepository.createUserQuest).toHaveBeenCalledWith(userId, questId, 'in_progress');
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
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
      mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

      const result = await service.leaveQuest(userId, questId);

      expect(result).toEqual(userQuest);
      expect(mockRepository.deleteUserQuest).toHaveBeenCalledWith(userQuest.id);
      expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
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
    const updateRequirementDto = { currentValue: 100 };

    describe('for finance type', () => {
      const stepType = 'finance' as const;

      it('should throw ForbiddenException when user is not owner', async () => {
        const nonOwnerUserId = 999;
        mockRepository.findById.mockResolvedValue({ ...mockQuest, ownerId: 1 });

        await expect(
          service.updateRequirementCurrentValue(questId, stepType, updateRequirementDto, nonOwnerUserId)
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      });

      it('should use getSumContributeValue when currentValue is not provided', async () => {
        const ownerUserId = 1;
        const questWithSteps = {
          ...mockQuest,
          ownerId: ownerUserId,
          steps: [
            {
              type: 'finance',
              requirement: { currentValue: 0, targetValue: 1000 },
            },
          ],
        };
        mockRepository.findById.mockResolvedValue(questWithSteps);
        mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(500);
        mockRepository.update.mockResolvedValue(questWithSteps);
        mockRepository.findByIdWithDetails.mockResolvedValue(questWithSteps);
        mockRepository.findCategoriesForQuest.mockResolvedValue([]);

        mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

        await service.updateRequirementCurrentValue(questId, stepType, {}, ownerUserId);

        expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, stepType);
        expect(mockContributerRepository.getConfirmedContributersCount).not.toHaveBeenCalled();
        expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
      });
    });

    describe('for contributers type', () => {
      const stepType = 'contributers' as const;

      it('should throw ForbiddenException when user is not owner', async () => {
        const nonOwnerUserId = 999;
        mockRepository.findById.mockResolvedValue({ ...mockQuest, ownerId: 1 });

        await expect(
          service.updateRequirementCurrentValue(questId, stepType, updateRequirementDto, nonOwnerUserId)
        ).rejects.toThrow(ForbiddenException);
        expect(mockRepository.findById).toHaveBeenCalledWith(questId);
      });

      it('should use getConfirmedContributersCount when currentValue is not provided', async () => {
        const ownerUserId = 1;
        const questWithSteps = {
          ...mockQuest,
          ownerId: ownerUserId,
          steps: [
            {
              type: 'contributers',
              requirement: { currentValue: 0, targetValue: 10 },
            },
          ],
        };
        mockRepository.findById.mockResolvedValue(questWithSteps);
        mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(3);
        mockRepository.update.mockResolvedValue(questWithSteps);
        mockRepository.findByIdWithDetails.mockResolvedValue(questWithSteps);
        mockRepository.findCategoriesForQuest.mockResolvedValue([]);

        mockQuestCacheService.invalidateQuest.mockResolvedValue(undefined);

        await service.updateRequirementCurrentValue(questId, stepType, {}, ownerUserId);

        expect(mockContributerRepository.getConfirmedContributersCount).toHaveBeenCalledWith(questId);
        expect(mockStepVolunteerRepository.getSumContributeValue).not.toHaveBeenCalled();
        expect(mockQuestCacheService.invalidateQuest).toHaveBeenCalledWith(questId);
      });
    });
  });

  describe('syncRequirementCurrentValue', () => {
    const questId = 1;

    describe('for finance type', () => {
      const stepType = 'finance' as const;

      it('should use getSumContributeValue for finance type', async () => {
        const questWithSteps = {
          ...mockQuest,
          steps: [
            {
              type: 'finance',
              requirement: { currentValue: 0, targetValue: 1000 },
            },
          ],
        };
        mockRepository.findById.mockResolvedValue(questWithSteps);
        mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(500);
        mockRepository.update.mockResolvedValue(questWithSteps);

        const result = await service.syncRequirementCurrentValue(questId, stepType);

        expect(result).toBe(500);
        expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, stepType);
        expect(mockContributerRepository.getConfirmedContributersCount).not.toHaveBeenCalled();
      });
    });

    describe('for contributers type', () => {
      const stepType = 'contributers' as const;

      it('should use getConfirmedContributersCount for contributers type', async () => {
        const questWithSteps = {
          ...mockQuest,
          steps: [
            {
              type: 'contributers',
              requirement: { currentValue: 0, targetValue: 10 },
            },
          ],
        };
        mockRepository.findById.mockResolvedValue(questWithSteps);
        mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(3);
        mockRepository.update.mockResolvedValue(questWithSteps);

        const result = await service.syncRequirementCurrentValue(questId, stepType);

        expect(result).toBe(3);
        expect(mockContributerRepository.getConfirmedContributersCount).toHaveBeenCalledWith(questId);
        expect(mockStepVolunteerRepository.getSumContributeValue).not.toHaveBeenCalled();
      });
    });
  });
});

