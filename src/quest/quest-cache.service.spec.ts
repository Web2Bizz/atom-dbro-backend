import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestCacheService } from './quest-cache.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { QuestRepository } from './quest.repository';
import { ContributerRepository } from '../contributer/contributer.repository';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';

describe('QuestCacheService', () => {
  let service: QuestCacheService;
  let redisService: RedisService;
  let configService: ConfigService;
  let questRepository: QuestRepository;
  let contributerRepository: ContributerRepository;
  let stepVolunteerRepository: StepVolunteerRepository;

  const questId = 1;
  const mockQuest = {
    id: questId,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    experienceReward: 100,
    ownerId: 1,
    cityId: 1,
    steps: [
      {
        type: 'contributers',
        title: 'Этап contributers',
        requirement: {
          currentValue: 0,
          targetValue: 10,
        },
      },
      {
        type: 'finance',
        title: 'Этап finance',
        requirement: {
          currentValue: 0,
          targetValue: 1000,
        },
      },
    ],
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  let mockRedisService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };

  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  let mockQuestRepository: {
    findByIdWithDetailsDirectly: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  let mockContributerRepository: {
    getConfirmedContributersCount: ReturnType<typeof vi.fn>;
  };

  let mockStepVolunteerRepository: {
    getSumContributeValue: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Сбрасываем все моки перед каждым тестом
    vi.clearAllMocks();

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'DEFAULT_CACHE_TTL_SECONDS') return '300';
        return undefined;
      }),
    };

    mockQuestRepository = {
      findByIdWithDetailsDirectly: vi.fn(),
      update: vi.fn(),
    };

    mockContributerRepository = {
      getConfirmedContributersCount: vi.fn(),
    };

    mockStepVolunteerRepository = {
      getSumContributeValue: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
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
          provide: ContributerRepository,
          useValue: mockContributerRepository,
        },
        {
          provide: StepVolunteerRepository,
          useValue: mockStepVolunteerRepository,
        },
      ],
    }).compile();

    service = module.get<QuestCacheService>(QuestCacheService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    questRepository = module.get<QuestRepository>(QuestRepository);
    contributerRepository = module.get<ContributerRepository>(ContributerRepository);
    stepVolunteerRepository = module.get<StepVolunteerRepository>(StepVolunteerRepository);

    // Вручную присваиваем зависимости, так как forwardRef может вызывать проблемы в тестах
    (service as any).redisService = mockRedisService;
    (service as any).configService = mockConfigService;
    (service as any).questRepository = mockQuestRepository;
    (service as any).contributerRepository = mockContributerRepository;
    (service as any).stepVolunteerRepository = mockStepVolunteerRepository;
    
    // Мокируем logger, чтобы не выводить логи в тестах
    (service as any).logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };
  });

  describe('getCacheTtl', () => {
    it('should return TTL from DEFAULT_CACHE_TTL_SECONDS config', () => {
      mockConfigService.get.mockReturnValue('600');
      const ttl = (service as any).getCacheTtl.call(service);
      expect(ttl).toBe(600);
      expect(mockConfigService.get).toHaveBeenCalledWith('DEFAULT_CACHE_TTL_SECONDS');
    });

    it('should return default 300 seconds if DEFAULT_CACHE_TTL_SECONDS is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const ttl = (service as any).getCacheTtl.call(service);
      expect(ttl).toBe(300);
    });

    it('should return default 300 seconds if DEFAULT_CACHE_TTL_SECONDS is invalid', () => {
      mockConfigService.get.mockReturnValue('invalid');
      const ttl = (service as any).getCacheTtl.call(service);
      expect(ttl).toBe(300);
    });
  });

  describe('getQuest', () => {
    it('should return quest from cache if exists (cache hit)', async () => {
      const cachedQuest = JSON.stringify(mockQuest);
      mockRedisService.get.mockResolvedValue(cachedQuest);

      const result = await service.getQuest(questId);

      expect(mockRedisService.get).toHaveBeenCalledWith(`quest:${questId}`);
      // Даты сериализуются в строки при JSON.parse/stringify, поэтому сравниваем структуру без дат
      expect(result.id).toBe(mockQuest.id);
      expect(result.title).toBe(mockQuest.title);
      expect(result.description).toBe(mockQuest.description);
      expect(result.steps).toEqual(mockQuest.steps);
      expect(mockQuestRepository.findByIdWithDetailsDirectly).not.toHaveBeenCalled();
    });

    it('should get quest from DB, recalculate currentValue and save to cache if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockQuestRepository.findByIdWithDetailsDirectly.mockResolvedValue(mockQuest);
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(5);
      mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(500);
      mockQuestRepository.update.mockResolvedValue(mockQuest);
      mockConfigService.get.mockReturnValue('300');

      const result = await service.getQuest(questId);

      expect(mockRedisService.get).toHaveBeenCalledWith(`quest:${questId}`);
      expect(mockQuestRepository.findByIdWithDetailsDirectly).toHaveBeenCalledWith(questId);
      expect(mockContributerRepository.getConfirmedContributersCount).toHaveBeenCalledWith(questId);
      expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, 'finance');
      expect(mockQuestRepository.update).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `quest:${questId}`,
        expect.any(String),
        300,
      );
      expect(result).toBeDefined();
    });

    it('should fallback to DB if Redis error occurs', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis connection failed'));
      mockQuestRepository.findByIdWithDetailsDirectly.mockResolvedValue(mockQuest);
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(0);
      mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(0);
      mockQuestRepository.update.mockResolvedValue(mockQuest);
      mockConfigService.get.mockReturnValue('300');

      const result = await service.getQuest(questId);

      expect(mockQuestRepository.findByIdWithDetailsDirectly).toHaveBeenCalledWith(questId);
      expect(result).toBeDefined();
    });
  });

  describe('setQuest', () => {
    it('should save quest to cache with TTL from config', async () => {
      mockConfigService.get.mockReturnValue('600');
      const questJson = JSON.stringify(mockQuest);

      await service.setQuest(questId, mockQuest);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `quest:${questId}`,
        questJson,
        600,
      );
    });

    it('should save quest to cache with provided TTL', async () => {
      const questJson = JSON.stringify(mockQuest);
      const customTtl = 1200;

      await service.setQuest(questId, mockQuest, customTtl);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `quest:${questId}`,
        questJson,
        customTtl,
      );
    });

    it('should always use TTL to prevent memory leak', async () => {
      mockConfigService.get.mockReturnValue(undefined); // default 300
      const questJson = JSON.stringify(mockQuest);

      await service.setQuest(questId, mockQuest);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `quest:${questId}`,
        questJson,
        300, // default TTL
      );
    });
  });

  describe('invalidateQuest', () => {
    it('should delete quest from cache', async () => {
      mockRedisService.del.mockResolvedValue(undefined);

      await service.invalidateQuest(questId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`quest:${questId}`);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidateQuest(questId)).resolves.not.toThrow();
      expect(mockRedisService.del).toHaveBeenCalledWith(`quest:${questId}`);
    });

    it('should ensure cache is invalidated - next getQuest should go to DB', async () => {
      // First, set quest in cache
      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(mockQuest));
      await service.getQuest(questId);
      expect(mockRedisService.get).toHaveBeenCalledWith(`quest:${questId}`);

      // Invalidate cache
      mockRedisService.del.mockResolvedValue(undefined);
      await service.invalidateQuest(questId);
      expect(mockRedisService.del).toHaveBeenCalledWith(`quest:${questId}`);

      // Next getQuest should go to DB (cache miss)
      mockRedisService.get.mockResolvedValueOnce(null);
      mockQuestRepository.findByIdWithDetailsDirectly.mockResolvedValue(mockQuest);
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(0);
      mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(0);
      mockQuestRepository.update.mockResolvedValue(mockQuest);
      mockConfigService.get.mockReturnValue('300');

      await service.getQuest(questId);

      // Should call DB because cache was invalidated
      expect(mockQuestRepository.findByIdWithDetailsDirectly).toHaveBeenCalledWith(questId);
    });
  });

  describe('calculateAndUpdateCurrentValues', () => {
    it('should recalculate currentValue for contributers type', async () => {
      const questWithContributers = {
        ...mockQuest,
        steps: [
          {
            type: 'contributers',
            requirement: {
              currentValue: 0,
              targetValue: 10,
            },
          },
        ],
      };
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(7);
      mockQuestRepository.update.mockResolvedValue(questWithContributers);

      await (service as any).calculateAndUpdateCurrentValues(questWithContributers);

      expect(mockContributerRepository.getConfirmedContributersCount).toHaveBeenCalledWith(questId);
      expect(mockQuestRepository.update).toHaveBeenCalledWith(questId, {
        steps: expect.arrayContaining([
          expect.objectContaining({
            type: 'contributers',
            requirement: {
              currentValue: 7,
              targetValue: 10,
            },
          }),
        ]),
      });
    });

    it('should recalculate currentValue for finance type', async () => {
      const questWithFinance = {
        ...mockQuest,
        steps: [
          {
            type: 'finance',
            requirement: {
              currentValue: 0,
              targetValue: 1000,
            },
          },
        ],
      };
      mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(750);
      mockQuestRepository.update.mockResolvedValue(questWithFinance);

      await (service as any).calculateAndUpdateCurrentValues(questWithFinance);

      expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, 'finance');
      expect(mockQuestRepository.update).toHaveBeenCalledWith(questId, {
        steps: expect.arrayContaining([
          expect.objectContaining({
            type: 'finance',
            requirement: {
              currentValue: 750,
              targetValue: 1000,
            },
          }),
        ]),
      });
    });

    it('should recalculate currentValue for material type', async () => {
      const questWithMaterial = {
        ...mockQuest,
        steps: [
          {
            type: 'material',
            requirement: {
              currentValue: 0,
              targetValue: 500,
            },
          },
        ],
      };
      mockStepVolunteerRepository.getSumContributeValue.mockResolvedValue(250);
      mockQuestRepository.update.mockResolvedValue(questWithMaterial);

      await (service as any).calculateAndUpdateCurrentValues(questWithMaterial);

      expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, 'material');
      expect(mockQuestRepository.update).toHaveBeenCalledWith(questId, {
        steps: expect.arrayContaining([
          expect.objectContaining({
            type: 'material',
            requirement: {
              currentValue: 250,
              targetValue: 500,
            },
          }),
        ]),
      });
    });

    it('should recalculate currentValue for all step types in quest', async () => {
      const questWithAllTypes = {
        ...mockQuest,
        steps: [
          {
            type: 'contributers',
            requirement: {
              currentValue: 0,
              targetValue: 10,
            },
          },
          {
            type: 'finance',
            requirement: {
              currentValue: 0,
              targetValue: 1000,
            },
          },
          {
            type: 'material',
            requirement: {
              currentValue: 0,
              targetValue: 500,
            },
          },
        ],
      };
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(5);
      mockStepVolunteerRepository.getSumContributeValue
        .mockResolvedValueOnce(750) // finance
        .mockResolvedValueOnce(300); // material
      mockQuestRepository.update.mockResolvedValue(questWithAllTypes);

      await (service as any).calculateAndUpdateCurrentValues(questWithAllTypes);

      expect(mockContributerRepository.getConfirmedContributersCount).toHaveBeenCalledWith(questId);
      expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, 'finance');
      expect(mockStepVolunteerRepository.getSumContributeValue).toHaveBeenCalledWith(questId, 'material');
      
      // Проверяем, что update был вызван с правильными аргументами
      expect(mockQuestRepository.update).toHaveBeenCalledWith(questId, {
        steps: expect.arrayContaining([
          expect.objectContaining({
            type: 'contributers',
            requirement: expect.objectContaining({
              currentValue: 5,
            }),
          }),
          expect.objectContaining({
            type: 'finance',
            requirement: expect.objectContaining({
              currentValue: 750,
            }),
          }),
          expect.objectContaining({
            type: 'material',
            requirement: expect.objectContaining({
              currentValue: 300,
            }),
          }),
        ]),
      });
    });

    it('should update quest in DB only if currentValue changed', async () => {
      const questWithUnchangedValue = {
        ...mockQuest,
        steps: [
          {
            type: 'contributers',
            requirement: {
              currentValue: 5,
              targetValue: 10,
            },
          },
        ],
      };
      mockContributerRepository.getConfirmedContributersCount.mockResolvedValue(5);
      mockQuestRepository.update.mockResolvedValue(questWithUnchangedValue);

      await (service as any).calculateAndUpdateCurrentValues(questWithUnchangedValue);

      // Если значение не изменилось, update не должен вызываться (согласно логике сервиса)
      expect(mockQuestRepository.update).not.toHaveBeenCalled();
    });
  });
});


