import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckinService } from './checkin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { QuestRepository } from '../quest/quest.repository';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';
import { ContributerRepository } from '../contributer/contributer.repository';
import { QuestEventsService } from '../quest/quest.events';
import { UserRepository } from '../user/user.repository';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { GenerateCheckinTokenDto } from './dto/generate-checkin-token.dto';

describe('CheckinService', () => {
  let service: CheckinService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let questRepository: QuestRepository;
  let stepVolunteerRepository: StepVolunteerRepository;
  let contributerRepository: ContributerRepository;
  let userRepository: UserRepository;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    recordStatus: 'CREATED',
  };

  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    steps: [
      {
        type: 'finance',
        requirement: {
          targetValue: 1000,
          currentValue: 500,
        },
      },
      {
        type: 'material',
        requirement: {
          targetValue: 50,
          currentValue: 25,
        },
      },
      {
        type: 'contributers',
        requirement: {
          targetValue: 10,
          currentValue: 3,
        },
      },
    ],
    recordStatus: 'CREATED',
  };

  const mockUserQuest = {
    id: 1,
    userId: 1,
    questId: 1,
    status: 'in_progress',
    startedAt: new Date(),
    completedAt: null,
  };

  const mockVolunteer = {
    id: 1,
    questId: 1,
    type: 'finance',
    userId: 1,
    contributeValue: 0,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  let mockQuestRepository: {
    findById: ReturnType<typeof vi.fn>;
    findUserQuest: ReturnType<typeof vi.fn>;
    updateUserQuest: ReturnType<typeof vi.fn>;
  };

  let mockStepVolunteerRepository: {
    findVolunteer: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };

  let mockContributerRepository: {
    findContributer: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };

  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  let mockQuestEventsService: {
    emitCheckinConfirmed: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockJwtService = {
      sign: vi.fn(),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'CHECKIN_TOKEN_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    mockQuestRepository = {
      findById: vi.fn(),
      findUserQuest: vi.fn(),
      updateUserQuest: vi.fn(),
    };

    mockStepVolunteerRepository = {
      findVolunteer: vi.fn(),
      create: vi.fn(),
      restore: vi.fn(),
    };

    mockContributerRepository = {
      findContributer: vi.fn(),
      create: vi.fn(),
      restore: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
    };

    mockQuestEventsService = {
      emitCheckinConfirmed: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: QuestRepository,
          useValue: mockQuestRepository,
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
          provide: QuestEventsService,
          useValue: mockQuestEventsService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<CheckinService>(CheckinService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    questRepository = module.get<QuestRepository>(QuestRepository);
    stepVolunteerRepository = module.get<StepVolunteerRepository>(StepVolunteerRepository);
    contributerRepository = module.get<ContributerRepository>(ContributerRepository);
    userRepository = module.get<UserRepository>(UserRepository);
    
    (service as any).jwtService = mockJwtService;
    (service as any).configService = mockConfigService;
    (service as any).questRepository = mockQuestRepository;
    (service as any).stepVolunteerRepository = mockStepVolunteerRepository;
    (service as any).contributerRepository = mockContributerRepository;
    (service as any).questEventsService = mockQuestEventsService;
    (service as any).userRepository = mockUserRepository;
  });

  describe('generateToken', () => {
    const userId = 1;
    const dto: GenerateCheckinTokenDto = {
      questId: 1,
      type: 'finance',
    };

    it('should successfully generate token for valid quest and user', async () => {
      const token = 'generated-token';
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.generateToken(userId, dto);

      expect(result).toEqual({
        token,
        questId: dto.questId,
        type: dto.type,
        expiresIn: '7d',
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockQuestRepository.findById).toHaveBeenCalledWith(dto.questId);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: userId,
          questId: dto.questId,
          type: dto.type,
          purpose: 'checkin',
        },
        { expiresIn: '7d' }
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      await expect(service.generateToken(userId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.generateToken(userId, dto)).rejects.toThrow('Пользователь не найден');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockQuestRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when quest is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(undefined);

      await expect(service.generateToken(userId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.generateToken(userId, dto)).rejects.toThrow(
        `Квест с ID ${dto.questId} не найден`
      );
      expect(mockQuestRepository.findById).toHaveBeenCalledWith(dto.questId);
    });

    it('should throw BadRequestException when quest has no steps', async () => {
      const questWithoutSteps = { ...mockQuest, steps: null };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(questWithoutSteps);

      await expect(service.generateToken(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.generateToken(userId, dto)).rejects.toThrow('У квеста нет этапов');
    });

    it('should throw BadRequestException when quest has empty steps array', async () => {
      const questWithEmptySteps = { ...mockQuest, steps: [] };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(questWithEmptySteps);

      await expect(service.generateToken(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.generateToken(userId, dto)).rejects.toThrow(
        `Этап с типом '${dto.type}' не найден в квесте`
      );
    });

    it('should throw BadRequestException when step type is not found in quest', async () => {
      const dtoWithInvalidType: GenerateCheckinTokenDto = {
        questId: 1,
        type: 'invalid-type' as any,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);

      await expect(service.generateToken(userId, dtoWithInvalidType)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.generateToken(userId, dtoWithInvalidType)).rejects.toThrow(
        `Этап с типом '${dtoWithInvalidType.type}' не найден в квесте`
      );
    });

    it('should generate token with correct payload (sub, questId, type, purpose)', async () => {
      const token = 'generated-token';
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockJwtService.sign.mockReturnValue(token);

      await service.generateToken(userId, dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: userId,
          questId: dto.questId,
          type: dto.type,
          purpose: 'checkin',
        },
        { expiresIn: '7d' }
      );
    });

    it('should use correct expiresIn from config', async () => {
      const customExpiresIn = '14d';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CHECKIN_TOKEN_EXPIRES_IN') return customExpiresIn;
        return undefined;
      });

      const token = 'generated-token';
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.generateToken(userId, dto);

      expect(result.expiresIn).toBe(customExpiresIn);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: customExpiresIn }
      );
    });

    it('should successfully generate token for contributers type', async () => {
      const token = 'generated-token';
      const contributersDto: GenerateCheckinTokenDto = {
        questId: 1,
        type: 'contributers' as 'contributers',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.generateToken(userId, contributersDto);

      expect(result).toEqual({
        token,
        questId: contributersDto.questId,
        type: contributersDto.type,
        expiresIn: '7d',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: userId,
          questId: contributersDto.questId,
          type: contributersDto.type,
          purpose: 'checkin',
        },
        { expiresIn: '7d' }
      );
    });

    it('should call jwtService.sign with correct parameters', async () => {
      const token = 'generated-token';
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockJwtService.sign.mockReturnValue(token);

      await service.generateToken(userId, dto);

      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: userId,
          questId: dto.questId,
          type: dto.type,
          purpose: 'checkin',
        },
        { expiresIn: '7d' }
      );
    });
  });

  describe('confirmCheckin', () => {
    const token = 'valid-token';
    const questId = 1;
    const type = 'finance';
    const userId = 1;

    const validPayload = {
      sub: userId,
      questId,
      type,
      purpose: 'checkin',
    };

    it('should successfully confirm checkin with valid token', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(undefined);
      mockStepVolunteerRepository.create.mockResolvedValue(mockVolunteer);
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.confirmCheckin(token, questId, type, userId);

      expect(result).toEqual({
        message: 'Участие успешно подтверждено',
        questId,
        type,
        userId,
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockQuestRepository.findById).toHaveBeenCalledWith(questId);
      expect(mockQuestRepository.findUserQuest).toHaveBeenCalledWith(userId, questId);
      expect(mockStepVolunteerRepository.create).toHaveBeenCalledWith(questId, type, userId, 0);
      expect(mockQuestEventsService.emitCheckinConfirmed).toHaveBeenCalledWith(questId, type, userId);
      expect(mockQuestRepository.updateUserQuest).toHaveBeenCalledWith(mockUserQuest.id, {
        status: 'completed',
        completedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Пользователь не найден'
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Недействительный или истекший токен'
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Недействительный или истекший токен'
      );
    });

    it('should throw BadRequestException when purpose !== "checkin"', async () => {
      const invalidPayload = { ...validPayload, purpose: 'invalid' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(invalidPayload);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Токен не предназначен для участия'
      );
    });

    it('should throw BadRequestException when questId does not match', async () => {
      const invalidPayload = { ...validPayload, questId: 999 };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(invalidPayload);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'ID квеста в токене не соответствует запрошенному'
      );
    });

    it('should throw BadRequestException when type does not match', async () => {
      const invalidPayload = { ...validPayload, type: 'material' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(invalidPayload);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Тип этапа в токене не соответствует запрошенному'
      );
    });

    it('should throw NotFoundException when quest is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(undefined);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        `Квест с ID ${questId} не найден`
      );
    });

    it('should throw BadRequestException when quest has no steps', async () => {
      const questWithoutSteps = { ...mockQuest, steps: null };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(questWithoutSteps);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'У квеста нет этапов'
      );
    });

    it('should throw NotFoundException when step type is not found', async () => {
      const invalidType = 'invalid-type';
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue({ ...validPayload, type: invalidType });
      mockQuestRepository.findById.mockResolvedValue(mockQuest);

      await expect(service.confirmCheckin(token, questId, invalidType, userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.confirmCheckin(token, questId, invalidType, userId)).rejects.toThrow(
        `Этап с типом '${invalidType}' не найден в квесте`
      );
    });

    it('should throw BadRequestException when user does not participate in quest', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(undefined);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Пользователь не участвует в этом квесте'
      );
    });

    it('should throw ConflictException when user already participates in step', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(mockVolunteer);

      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        ConflictException
      );
      await expect(service.confirmCheckin(token, questId, type, userId)).rejects.toThrow(
        'Пользователь уже участвует в этом этапе'
      );
      expect(mockStepVolunteerRepository.create).not.toHaveBeenCalled();
    });

    it('should restore record if it was deleted (recordStatus === "DELETED")', async () => {
      const deletedVolunteer = { ...mockVolunteer, recordStatus: 'DELETED' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(deletedVolunteer);
      mockStepVolunteerRepository.restore.mockResolvedValue(mockVolunteer);
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.confirmCheckin(token, questId, type, userId);

      expect(result).toEqual({
        message: 'Участие успешно подтверждено',
        questId,
        type,
        userId,
      });
      expect(mockStepVolunteerRepository.restore).toHaveBeenCalledWith(questId, type, userId);
      expect(mockStepVolunteerRepository.create).not.toHaveBeenCalled();
      expect(mockQuestEventsService.emitCheckinConfirmed).toHaveBeenCalledWith(questId, type, userId);
    });

    it('should create new record if it does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(undefined);
      mockStepVolunteerRepository.create.mockResolvedValue(mockVolunteer);
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt: new Date(),
      });

      await service.confirmCheckin(token, questId, type, userId);

      expect(mockStepVolunteerRepository.create).toHaveBeenCalledWith(questId, type, userId, 0);
      expect(mockStepVolunteerRepository.restore).not.toHaveBeenCalled();
    });

    it('should update user_quests status to "completed"', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(undefined);
      mockStepVolunteerRepository.create.mockResolvedValue(mockVolunteer);
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt: new Date(),
      });

      await service.confirmCheckin(token, questId, type, userId);

      expect(mockQuestRepository.updateUserQuest).toHaveBeenCalledWith(mockUserQuest.id, {
        status: 'completed',
        completedAt: expect.any(Date),
      });
    });

    it('should set completedAt when updating user_quests', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockStepVolunteerRepository.findVolunteer.mockResolvedValue(undefined);
      mockStepVolunteerRepository.create.mockResolvedValue(mockVolunteer);
      const completedAt = new Date();
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt,
      });

      await service.confirmCheckin(token, questId, type, userId);

      const updateCall = mockQuestRepository.updateUserQuest.mock.calls[0];
      expect(updateCall[1].completedAt).toBeInstanceOf(Date);
      expect(updateCall[1].status).toBe('completed');
    });
  });

  describe('confirmCheckin with contributers type', () => {
    const token = 'valid-token';
    const questId = 1;
    const type = 'contributers';
    const userId = 1;

    const validPayload = {
      sub: userId,
      questId,
      type,
      purpose: 'checkin',
    };

    it('should successfully confirm checkin with contributers type', async () => {
      const mockContributer = {
        id: 1,
        questId: 1,
        userId: 1,
        recordStatus: 'CREATED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.verify.mockReturnValue(validPayload);
      mockQuestRepository.findById.mockResolvedValue(mockQuest);
      mockQuestRepository.findUserQuest.mockResolvedValue(mockUserQuest);
      mockContributerRepository.findContributer.mockResolvedValue(undefined);
      mockContributerRepository.create.mockResolvedValue(mockContributer);
      mockQuestRepository.updateUserQuest.mockResolvedValue({
        ...mockUserQuest,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.confirmCheckin(token, questId, type, userId);

      expect(result).toEqual({
        message: 'Участие успешно подтверждено',
        questId,
        type,
        userId,
      });
      expect(mockContributerRepository.create).toHaveBeenCalledWith(questId, userId);
      expect(mockStepVolunteerRepository.create).not.toHaveBeenCalled();
      expect(mockQuestEventsService.emitCheckinConfirmed).toHaveBeenCalledWith(questId, type, userId);
    });
  });
});

