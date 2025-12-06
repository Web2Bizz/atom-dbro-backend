import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StepVolunteerService } from './step-volunteer.service';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { QuestService } from '../quest/quest.service';
import { QuestEventsService } from '../quest/quest.events';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('StepVolunteerService', () => {
  let service: StepVolunteerService;
  let repository: StepVolunteerRepository;

  // Test data fixtures
  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    experienceReward: 100,
    ownerId: 1,
    cityId: 1,
    recordStatus: 'CREATED',
    steps: [
      {
        type: 'finance',
        requirement: {
          currentValue: 0,
          targetValue: 10000,
        },
      },
      {
        type: 'material',
        requirement: {
          currentValue: 0,
          targetValue: 50,
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockQuestWithoutSteps = {
    ...mockQuest,
    steps: null,
  } as any;

  const mockQuestWithEmptySteps = {
    ...mockQuest,
    steps: [],
  } as any;

  const mockQuestArchived = {
    ...mockQuest,
    status: 'archived',
  } as any;

  const mockQuestCompleted = {
    ...mockQuest,
    status: 'completed',
  } as any;

  const mockUser = {
    id: 2,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: null,
    email: 'ivan@example.com',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockStepVolunteer = {
    id: 1,
    questId: 1,
    type: 'finance',
    userId: 2,
    contributeValue: 1000,
    isInkognito: false,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUpdatedQuest = {
    ...mockQuest,
    steps: [
      {
        type: 'finance',
        requirement: {
          currentValue: 1000,
          targetValue: 10000,
        },
      },
      {
        type: 'material',
        requirement: {
          currentValue: 0,
          targetValue: 50,
        },
      },
    ],
  } as any;

  let mockRepository: {
    findQuestById: ReturnType<typeof vi.fn>;
    findUserById: ReturnType<typeof vi.fn>;
    isUserInQuest: ReturnType<typeof vi.fn>;
    createStepVolunteer: ReturnType<typeof vi.fn>;
  };

  let mockQuestService: {
    syncRequirementCurrentValue: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  let mockQuestEventsService: {
    emitStepVolunteerAdded: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRepository = {
      findQuestById: vi.fn(),
      findUserById: vi.fn(),
      isUserInQuest: vi.fn(),
      createStepVolunteer: vi.fn(),
    };

    mockQuestService = {
      syncRequirementCurrentValue: vi.fn(),
      findOne: vi.fn(),
    };

    mockQuestEventsService = {
      emitStepVolunteerAdded: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepVolunteerService,
        {
          provide: StepVolunteerRepository,
          useValue: mockRepository,
        },
        {
          provide: QuestService,
          useValue: mockQuestService,
        },
        {
          provide: QuestEventsService,
          useValue: mockQuestEventsService,
        },
      ],
    }).compile();

    service = module.get<StepVolunteerService>(StepVolunteerService);
    repository = module.get<StepVolunteerRepository>(StepVolunteerRepository);

    // Принудительно устанавливаем зависимости
    (service as any).repository = mockRepository;
    (service as any).questService = mockQuestService;
    (service as any).questEventsService = mockQuestEventsService;
  });

  describe('addContribution', () => {
    const questId = 1;
    const stepType = 'finance' as const;
    const userId = 2;
    const contributeValue = 1000;
    const isInkognito = false;

    it('should successfully add contribution for finance step', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue(mockStepVolunteer);
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(1000);
      mockQuestService.findOne.mockResolvedValue(mockUpdatedQuest);

      const result = await service.addContribution(questId, stepType, userId, contributeValue, isInkognito);

      expect(result).toEqual(mockUpdatedQuest);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(mockRepository.isUserInQuest).toHaveBeenCalledWith(questId, userId);
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        contributeValue,
        isInkognito,
      );
      expect(mockQuestEventsService.emitStepVolunteerAdded).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        contributeValue,
      );
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.findOne).toHaveBeenCalledWith(questId);
    });

    it('should successfully add contribution for material step', async () => {
      const materialStepType = 'material' as const;
      const materialContributeValue = 10;
      const questWithMaterialStep = {
        ...mockQuest,
        steps: [
          {
            type: 'material',
            requirement: {
              currentValue: 0,
              targetValue: 50,
            },
          },
        ],
      };

      mockRepository.findQuestById.mockResolvedValue(questWithMaterialStep);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue({
        ...mockStepVolunteer,
        type: 'material',
        contributeValue: materialContributeValue,
      });
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(materialContributeValue);
      mockQuestService.findOne.mockResolvedValue(questWithMaterialStep);

      const result = await service.addContribution(
        questId,
        materialStepType,
        userId,
        materialContributeValue,
        isInkognito,
      );

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        materialStepType,
        userId,
        materialContributeValue,
        isInkognito,
      );
    });

    it('should successfully add contribution with isInkognito = true', async () => {
      const inkognitoValue = true;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue({
        ...mockStepVolunteer,
        isInkognito: inkognitoValue,
      });
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(1000);
      mockQuestService.findOne.mockResolvedValue(mockUpdatedQuest);

      const result = await service.addContribution(questId, stepType, userId, contributeValue, inkognitoValue);

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        contributeValue,
        inkognitoValue,
      );
    });

    it('should successfully add contribution with isInkognito defaulting to false', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue(mockStepVolunteer);
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(1000);
      mockQuestService.findOne.mockResolvedValue(mockUpdatedQuest);

      // Вызываем без isInkognito (должно быть false по умолчанию)
      const result = await service.addContribution(questId, stepType, userId, contributeValue);

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        contributeValue,
        false,
      );
    });

    it('should successfully add multiple contributions from same user', async () => {
      // Первый вклад
      mockRepository.findQuestById.mockResolvedValueOnce(mockQuest);
      mockRepository.findUserById.mockResolvedValueOnce(mockUser);
      mockRepository.isUserInQuest.mockResolvedValueOnce(true);
      mockRepository.createStepVolunteer.mockResolvedValueOnce(mockStepVolunteer);
      mockQuestService.syncRequirementCurrentValue.mockResolvedValueOnce(1000);
      mockQuestService.findOne.mockResolvedValueOnce(mockUpdatedQuest);

      await service.addContribution(questId, stepType, userId, 1000, isInkognito);

      // Второй вклад от того же пользователя
      mockRepository.findQuestById.mockResolvedValueOnce(mockQuest);
      mockRepository.findUserById.mockResolvedValueOnce(mockUser);
      mockRepository.isUserInQuest.mockResolvedValueOnce(true);
      mockRepository.createStepVolunteer.mockResolvedValueOnce({
        ...mockStepVolunteer,
        id: 2,
        contributeValue: 500,
      });
      mockQuestService.syncRequirementCurrentValue.mockResolvedValueOnce(1500);
      mockQuestService.findOne.mockResolvedValueOnce(mockUpdatedQuest);

      const result = await service.addContribution(questId, stepType, userId, 500, isInkognito);

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(undefined);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Квест с ID ${questId} не найден`);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findUserById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(undefined);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Пользователь с ID ${userId} не найден`);
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId);
    });

    it('should throw BadRequestException when quest status is not active', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuestArchived);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(`Квест со статусом 'archived' не может быть изменен`);
    });

    it('should throw BadRequestException when quest is completed', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuestCompleted);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(`Квест со статусом 'completed' не может быть изменен`);
    });

    it('should throw BadRequestException when quest has no steps', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuestWithoutSteps);
      mockRepository.findUserById.mockResolvedValue(mockUser);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('У квеста нет этапов');
    });

    it('should throw BadRequestException when quest has empty steps array', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuestWithEmptySteps);
      mockRepository.findUserById.mockResolvedValue(mockUser);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Этап с типом \'finance\' не найден в квесте');
    });

    it('should throw BadRequestException when step type is invalid', async () => {
      const invalidStepType = 'invalid' as any;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);

      const promise = service.addContribution(questId, invalidStepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        `Некорректный тип этапа 'invalid'. Допустимые значения: finance, material`,
      );
    });

    it('should throw BadRequestException when step type is not found in quest', async () => {
      const questWithoutFinanceStep = {
        ...mockQuest,
        steps: [
          {
            type: 'material',
            requirement: {
              currentValue: 0,
              targetValue: 50,
            },
          },
        ],
      };
      mockRepository.findQuestById.mockResolvedValue(questWithoutFinanceStep);
      mockRepository.findUserById.mockResolvedValue(mockUser);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        `Этап с типом 'finance' не найден в квесте (количество этапов: 1)`,
      );
    });

    it('should throw BadRequestException when step has no requirement', async () => {
      const questWithoutRequirement = {
        ...mockQuest,
        steps: [
          {
            type: 'finance',
            requirement: null,
          },
        ],
      };
      mockRepository.findQuestById.mockResolvedValue(questWithoutRequirement);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(`У этапа с типом 'finance' нет требования`);
    });

    it('should throw BadRequestException when user is not in quest', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(false);

      const promise = service.addContribution(questId, stepType, userId, contributeValue, isInkognito);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Пользователь должен сначала присоединиться к квесту');
      expect(mockRepository.isUserInQuest).toHaveBeenCalledWith(questId, userId);
    });

    it('should handle zero contribute value', async () => {
      const zeroValue = 0;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue({
        ...mockStepVolunteer,
        contributeValue: zeroValue,
      });
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(0);
      mockQuestService.findOne.mockResolvedValue(mockQuest);

      const result = await service.addContribution(questId, stepType, userId, zeroValue, isInkognito);

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        zeroValue,
        isInkognito,
      );
    });

    it('should handle large contribute value', async () => {
      const largeValue = 999999;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue({
        ...mockStepVolunteer,
        contributeValue: largeValue,
      });
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(largeValue);
      mockQuestService.findOne.mockResolvedValue(mockQuest);

      const result = await service.addContribution(questId, stepType, userId, largeValue, isInkognito);

      expect(result).toBeDefined();
      expect(mockRepository.createStepVolunteer).toHaveBeenCalledWith(
        questId,
        stepType,
        userId,
        largeValue,
        isInkognito,
      );
    });

    it('should handle step with null type in array', async () => {
      const questWithNullStep = {
        ...mockQuest,
        steps: [
          null,
          {
            type: 'finance',
            requirement: {
              currentValue: 0,
              targetValue: 10000,
            },
          },
        ],
      };
      mockRepository.findQuestById.mockResolvedValue(questWithNullStep);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue(mockStepVolunteer);
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(1000);
      mockQuestService.findOne.mockResolvedValue(mockUpdatedQuest);

      const result = await service.addContribution(questId, stepType, userId, contributeValue, isInkognito);

      expect(result).toBeDefined();
    });

    it('should handle step with undefined type in array', async () => {
      const questWithUndefinedStep = {
        ...mockQuest,
        steps: [
          undefined,
          {
            type: 'finance',
            requirement: {
              currentValue: 0,
              targetValue: 10000,
            },
          },
        ],
      };
      mockRepository.findQuestById.mockResolvedValue(questWithUndefinedStep);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.createStepVolunteer.mockResolvedValue(mockStepVolunteer);
      mockQuestService.syncRequirementCurrentValue.mockResolvedValue(1000);
      mockQuestService.findOne.mockResolvedValue(mockUpdatedQuest);

      const result = await service.addContribution(questId, stepType, userId, contributeValue, isInkognito);

      expect(result).toBeDefined();
    });
  });
});

