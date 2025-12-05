import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { QuestRepository, QuestStep } from './quest.repository';
import { ContributerRepository } from '../contributer/contributer.repository';
import { StepVolunteerRepository } from '../step-volunteer/step-volunteer.repository';

@Injectable()
export class QuestCacheService {
  private readonly logger = new Logger(QuestCacheService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly questRepository: QuestRepository,
    @Inject(forwardRef(() => ContributerRepository))
    private readonly contributerRepository: ContributerRepository,
    @Inject(forwardRef(() => StepVolunteerRepository))
    private readonly stepVolunteerRepository: StepVolunteerRepository,
  ) {}

  /**
   * Получить TTL для кеша из конфигурации
   * @returns TTL в секундах
   */
  private getCacheTtl(): number {
    const ttlEnv = this.configService.get<string>('DEFAULT_CACHE_TTL_SECONDS');
    const ttlSeconds =
      ttlEnv && !Number.isNaN(Number(ttlEnv)) && Number(ttlEnv) > 0
        ? Number(ttlEnv)
        : 300; // Значение по умолчанию: 300 секунд (5 минут)

    return ttlSeconds;
  }

  /**
   * Получить квест из кеша или из БД с пересчетом currentValue
   * @param questId ID квеста
   * @returns Квест с актуальными currentValue
   */
  async getQuest(questId: number): Promise<any> {
    const cacheKey = `quest:${questId}`;

    try {
      // Пытаемся получить из кеша
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for quest ${questId}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Cache miss for quest ${questId}, fetching from DB`);
      // Кеш miss - получаем из БД напрямую (без кеша, чтобы избежать рекурсии)
      const quest = await this.questRepository.findByIdWithDetailsDirectly(questId);
      if (!quest) {
        return null;
      }

      // Пересчитываем currentValue для всех этапов
      const questWithUpdatedValues = await this.calculateAndUpdateCurrentValues(quest);

      // Сохраняем в кеш с TTL
      const ttl = this.getCacheTtl();
      await this.setQuest(questId, questWithUpdatedValues, ttl);

      return questWithUpdatedValues;
    } catch (error) {
      this.logger.error(`Error getting quest ${questId} from cache, falling back to DB`, error);
      // Fallback на БД при ошибке Redis (напрямую, без кеша)
      const quest = await this.questRepository.findByIdWithDetailsDirectly(questId);
      if (!quest) {
        return null;
      }

      // Пересчитываем currentValue даже при ошибке Redis
      return await this.calculateAndUpdateCurrentValues(quest);
    }
  }

  /**
   * Сохранить квест в кеш с TTL
   * @param questId ID квеста
   * @param quest Объект квеста
   * @param ttlSeconds TTL в секундах (опционально, если не указан - используется из конфигурации)
   */
  async setQuest(questId: number, quest: any, ttlSeconds?: number): Promise<void> {
    const cacheKey = `quest:${questId}`;
    const ttl = ttlSeconds ?? this.getCacheTtl();

    try {
      await this.redisService.set(cacheKey, JSON.stringify(quest), ttl);
      this.logger.debug(`Quest ${questId} cached with TTL ${ttl} seconds`);
    } catch (error) {
      this.logger.error(`Error caching quest ${questId}`, error);
      // Не прерываем выполнение при ошибке Redis
    }
  }

  /**
   * Инвалидировать кеш квеста
   * @param questId ID квеста
   */
  async invalidateQuest(questId: number): Promise<void> {
    const cacheKey = `quest:${questId}`;

    try {
      await this.redisService.del(cacheKey);
      this.logger.debug(`Cache invalidated for quest ${questId}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for quest ${questId}`, error);
      // Не прерываем выполнение при ошибке Redis
    }
  }

  /**
   * Пересчитать currentValue для всех этапов квеста
   * @param quest Объект квеста
   * @returns Квест с обновленными currentValue
   */
  private async calculateAndUpdateCurrentValues(quest: any): Promise<any> {
    if (!quest.steps || !Array.isArray(quest.steps)) {
      return quest;
    }

    let hasChanges = false;
    const updatedSteps: QuestStep[] = [];

    for (const step of quest.steps) {
      if (!step || !step.requirement || step.requirement.targetValue === undefined || step.requirement.targetValue === null) {
        updatedSteps.push(step);
        continue;
      }

      const stepType = step.type;
      let newCurrentValue: number;

      if (stepType === 'contributers') {
        // Для типа contributers считаем количество подтверждённых contributers
        newCurrentValue = await this.contributerRepository.getConfirmedContributersCount(quest.id);
      } else if (stepType === 'finance' || stepType === 'material') {
        // Для finance и material считаем сумму всех contribute_value
        newCurrentValue = await this.stepVolunteerRepository.getSumContributeValue(quest.id, stepType);
      } else {
        // Неизвестный тип - оставляем как есть
        updatedSteps.push(step);
        continue;
      }

      const oldCurrentValue = step.requirement.currentValue ?? 0;
      const newCurrentValueNumber = Number(newCurrentValue) || 0;

      // Обновляем currentValue
      updatedSteps.push({
        ...step,
        requirement: {
          ...step.requirement,
          currentValue: newCurrentValueNumber,
        },
      });

      // Сравниваем как числа для корректного сравнения
      if (Number(oldCurrentValue) !== Number(newCurrentValueNumber)) {
        hasChanges = true;
      }
    }

    // Обновляем квест в БД только если значения изменились
    if (hasChanges) {
      try {
        await this.questRepository.update(quest.id, {
          steps: updatedSteps,
        });
        this.logger.debug(`Updated currentValue in DB for quest ${quest.id}`);
      } catch (error) {
        this.logger.error(`Error updating currentValue in DB for quest ${quest.id}`, error);
      }
    }

    return {
      ...quest,
      steps: updatedSteps,
    };
  }
}

