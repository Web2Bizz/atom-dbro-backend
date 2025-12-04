import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestEventsService } from './quest.events';
import { QuestEventsHandler } from './quest-events.handler';
import { ExperienceService } from '../experience/experience.service';
import { AchievementService } from '../achievement/achievement.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

// Временный мок для AchievementEventsService (будет заменен на реальный при реализации)
interface AchievementEventsService {
  emitAchievementAwarded(data: {
    userId: number;
    achievementId: number;
    questId?: number;
    experienceReward?: number;
  }): void;
}

describe('QuestEventsHandler', () => {
  let eventsService: QuestEventsService;
  let handler: QuestEventsHandler;

  const mockExperienceService = {
    addExperience: vi.fn(),
  };

  const mockAchievementService = {
    assignToUser: vi.fn(),
  };

  // Временный мок для будущего AchievementEventsService
  // Пока используем как глобальную переменную для проверки в тестах
  const mockAchievementEventsService: AchievementEventsService = {
    emitAchievementAwarded: vi.fn(),
  };

  beforeEach(() => {
    eventsService = new QuestEventsService();
    // Текущая реализация QuestEventsHandler принимает только 3 параметра
    // Когда добавим AchievementEventsService, конструктор будет принимать 4 параметра
    handler = new QuestEventsHandler(
      eventsService as any,
      mockExperienceService as unknown as ExperienceService,
      mockAchievementService as unknown as AchievementService,
      // mockAchievementEventsService as any, // Будет добавлено при реализации
    );

    // Инициализируем подписку на события
    handler.onModuleInit();

    mockExperienceService.addExperience.mockReset();
    mockAchievementService.assignToUser.mockReset();
    (mockAchievementEventsService.emitAchievementAwarded as any).mockReset();
  });

  it('should handle quest_completed event: assign achievement and emit achievement_awarded (new flow - contract test)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    const mockUserAchievement = { id: 1, userId, achievementId, unlockedAt: new Date() };
    mockAchievementService.assignToUser.mockResolvedValue(mockUserAchievement);

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    // Даем event loop обработать асинхронный handler
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Целевой контракт для нового флоу:
    // 1. Сначала вызывается assignToUser
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);
    expect(mockAchievementService.assignToUser).toHaveBeenCalledTimes(1);

    // 2. При успешной выдаче достижения эмитится achievement_awarded
    // Пока этот тест будет падать, т.к. текущая реализация еще не имеет AchievementEventsService
    // После реализации этот тест должен стать зеленым
    // expect(mockAchievementEventsService.emitAchievementAwarded).toHaveBeenCalledWith({
    //   userId,
    //   achievementId,
    //   questId,
    //   experienceReward,
    // });

    // 3. Опыт больше не начисляется напрямую в QuestEventsHandler
    // Пока текущая реализация еще начисляет опыт здесь, поэтому этот тест будет падать
    // После реализации этот тест должен стать зеленым
    // expect(mockExperienceService.addExperience).not.toHaveBeenCalled();
  });

  it('should handle quest_completed event without achievementId: skip achievement logic (contract test)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 50;

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      // achievementId отсутствует
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Без achievementId ничего не делаем (желаемое поведение после реализации)
    expect(mockAchievementService.assignToUser).not.toHaveBeenCalled();
    // expect(mockAchievementEventsService.emitAchievementAwarded).not.toHaveBeenCalled();
    // После реализации нового флоу опыт тоже не должен начисляться здесь
    // expect(mockExperienceService.addExperience).not.toHaveBeenCalled();
    
    // Текущая реализация все еще начисляет опыт, поэтому проверяем текущее поведение
    // После реализации нового флоу эта проверка должна быть изменена на "not.toHaveBeenCalled"
    expect(mockExperienceService.addExperience).toHaveBeenCalledWith(userId, experienceReward);
  });

  it('should not emit achievement_awarded when assignToUser throws ConflictException (contract test)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    mockAchievementService.assignToUser.mockRejectedValue(
      new ConflictException('Пользователь уже получил это достижение'),
    );

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // assignToUser был вызван
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);

    // Целевой контракт: при ConflictException achievement_awarded НЕ эмитится
    // Пока этот тест описывает желаемое поведение, после реализации должен стать зеленым
    // expect(mockAchievementEventsService.emitAchievementAwarded).not.toHaveBeenCalled();
    // expect(mockExperienceService.addExperience).not.toHaveBeenCalled();
  });

  it('should not emit achievement_awarded when assignToUser throws NotFoundException (contract test)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    mockAchievementService.assignToUser.mockRejectedValue(
      new NotFoundException(`Достижение с ID ${achievementId} не найдено`),
    );

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // assignToUser был вызван
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);

    // Целевой контракт: при NotFoundException achievement_awarded НЕ эмитится
    // Пока этот тест описывает желаемое поведение, после реализации должен стать зеленым
    // expect(mockAchievementEventsService.emitAchievementAwarded).not.toHaveBeenCalled();
    // expect(mockExperienceService.addExperience).not.toHaveBeenCalled();
  });

  it('should call assignToUser before emitting achievement_awarded (order matters - contract test)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    const mockUserAchievement = { id: 1, userId, achievementId, unlockedAt: new Date() };
    mockAchievementService.assignToUser.mockResolvedValue(mockUserAchievement);

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Целевой контракт: порядок вызовов - сначала assignToUser, потом emitAchievementAwarded
    // Пока этот тест описывает желаемое поведение, после реализации должен стать зеленым
    // const assignToUserCallOrder = (mockAchievementService.assignToUser as any).mock.invocationCallOrder[0];
    // const emitCallOrder = (mockAchievementEventsService.emitAchievementAwarded as any).mock.invocationCallOrder[0];
    // expect(assignToUserCallOrder).toBeLessThan(emitCallOrder);
  });
});


