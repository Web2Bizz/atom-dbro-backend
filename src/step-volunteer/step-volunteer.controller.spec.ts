import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StepVolunteerController } from './step-volunteer.controller';
import { StepVolunteerService } from './step-volunteer.service';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddStepVolunteerDto } from '../quest/dto/add-step-volunteer.dto';

describe('StepVolunteerController', () => {
  let controller: StepVolunteerController;
  let service: StepVolunteerService;

  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    steps: [
      {
        type: 'finance',
        requirement: {
          currentValue: 1000,
          targetValue: 10000,
        },
      },
    ],
  } as any;

  let mockService: {
    addContribution: ReturnType<typeof vi.fn>;
  };

  let mockRepository: {
    findQuestById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      addContribution: vi.fn(),
    };

    mockRepository = {
      findQuestById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StepVolunteerController],
      providers: [
        {
          provide: StepVolunteerService,
          useValue: mockService,
        },
        {
          provide: StepVolunteerRepository,
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: vi.fn(() => true),
      })
      .compile();

    controller = module.get<StepVolunteerController>(StepVolunteerController);
    service = module.get<StepVolunteerService>(StepVolunteerService);
    
    // Принудительно устанавливаем service в controller
    (controller as any).stepVolunteerService = mockService;
  });

  describe('addContribution', () => {
    const questId = 1;
    const stepType = 'finance';
    const userId = 2;
    const addStepVolunteerDto: AddStepVolunteerDto = {
      contributeValue: 1000,
      isInkognito: false,
    };

    it('should successfully add contribution', async () => {
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, userId, addStepVolunteerDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, userId, 1000, false);
    });

    it('should successfully add contribution with isInkognito = true', async () => {
      const dtoWithInkognito: AddStepVolunteerDto = {
        contributeValue: 1000,
        isInkognito: true,
      };
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, userId, dtoWithInkognito);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, userId, 1000, true);
    });

    it('should successfully add contribution with isInkognito undefined (defaults to false)', async () => {
      const dtoWithoutInkognito = {
        contributeValue: 1000,
      } as AddStepVolunteerDto;
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, userId, dtoWithoutInkognito);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, userId, 1000, false);
    });

    it('should successfully add contribution for material step type', async () => {
      const materialStepType = 'material';
      const materialDto: AddStepVolunteerDto = {
        contributeValue: 10,
        isInkognito: false,
      };
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, materialStepType, userId, materialDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, materialStepType, userId, 10, false);
    });

    it('should handle zero contribute value', async () => {
      const zeroDto: AddStepVolunteerDto = {
        contributeValue: 0,
        isInkognito: false,
      };
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, userId, zeroDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, userId, 0, false);
    });

    it('should handle large contribute value', async () => {
      const largeDto: AddStepVolunteerDto = {
        contributeValue: 999999,
        isInkognito: false,
      };
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, userId, largeDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, userId, 999999, false);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      mockService.addContribution.mockRejectedValue(error);

      await expect(controller.addContribution(questId, stepType, userId, addStepVolunteerDto)).rejects.toThrow(
        'Service error',
      );
    });

    it('should handle different quest IDs', async () => {
      const differentQuestId = 999;
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(differentQuestId, stepType, userId, addStepVolunteerDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(differentQuestId, stepType, userId, 1000, false);
    });

    it('should handle different user IDs', async () => {
      const differentUserId = 999;
      mockService.addContribution.mockResolvedValue(mockQuest);

      const result = await controller.addContribution(questId, stepType, differentUserId, addStepVolunteerDto);

      expect(result).toEqual(mockQuest);
      expect(mockService.addContribution).toHaveBeenCalledWith(questId, stepType, differentUserId, 1000, false);
    });
  });
});

