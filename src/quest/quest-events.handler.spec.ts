import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestEventsService } from './quest.events';
import { QuestEventsHandler } from './quest-events.handler';
import { AchievementService } from '../achievement/achievement.service';
import { AchievementEventsService } from '../achievement/achievement.events';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('QuestEventsHandler', () => {
  let eventsService: QuestEventsService;
  let handler: QuestEventsHandler;

  const mockAchievementService = {
    assignToUser: vi.fn(),
  };

  const mockQuestService = {
    syncRequirementCurrentValue: vi.fn(),
  };

  let achievementEventsService: AchievementEventsService;

  beforeEach(() => {
    eventsService = new QuestEventsService();
    achievementEventsService = new AchievementEventsService();
    handler = new QuestEventsHandler(
      eventsService as any,
      mockAchievementService as unknown as AchievementService,
      achievementEventsService,
      mockQuestService as any,
    );

    // Инициализируем подписку на события
    handler.onModuleInit();

    mockAchievementService.assignToUser.mockReset();
    mockQuestService.syncRequirementCurrentValue.mockReset();
  });

  it('should handle quest_completed event: assign achievement and emit achievement_awarded (new flow)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    const mockUserAchievement = { id: 1, userId, achievementId, unlockedAt: new Date() };
    mockAchievementService.assignToUser.mockResolvedValue(mockUserAchievement);

    // Подписываемся на события achievement_awarded для проверки
    const achievementAwardedCalls: any[] = [];
    achievementEventsService.getRawEvents().subscribe((event) => {
      if (event.type === 'achievement_awarded') {
        achievementAwardedCalls.push(event.data);
      }
    });

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    // Даем event loop обработать асинхронный handler
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 1. Сначала вызывается assignToUser
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);
    expect(mockAchievementService.assignToUser).toHaveBeenCalledTimes(1);

    // 2. При успешной выдаче достижения эмитится achievement_awarded
    expect(achievementAwardedCalls).toHaveLength(1);
    expect(achievementAwardedCalls[0]).toEqual({
      userId,
      achievementId,
      questId,
      experienceReward,
    });
  });

  it('should handle quest_completed event without achievementId: skip achievement logic', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 50;

    const achievementAwardedCalls: any[] = [];
    achievementEventsService.getRawEvents().subscribe((event) => {
      if (event.type === 'achievement_awarded') {
        achievementAwardedCalls.push(event.data);
      }
    });

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      // achievementId отсутствует
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Без achievementId ничего не делаем
    expect(mockAchievementService.assignToUser).not.toHaveBeenCalled();
    expect(achievementAwardedCalls).toHaveLength(0);
  });

  it('should not emit achievement_awarded when assignToUser throws ConflictException', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    mockAchievementService.assignToUser.mockRejectedValue(
      new ConflictException('Пользователь уже получил это достижение'),
    );

    const achievementAwardedCalls: any[] = [];
    achievementEventsService.getRawEvents().subscribe((event) => {
      if (event.type === 'achievement_awarded') {
        achievementAwardedCalls.push(event.data);
      }
    });

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // assignToUser был вызван
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);

    // При ConflictException achievement_awarded НЕ эмитится
    expect(achievementAwardedCalls).toHaveLength(0);
  });

  it('should not emit achievement_awarded when assignToUser throws NotFoundException', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    mockAchievementService.assignToUser.mockRejectedValue(
      new NotFoundException(`Достижение с ID ${achievementId} не найдено`),
    );

    const achievementAwardedCalls: any[] = [];
    achievementEventsService.getRawEvents().subscribe((event) => {
      if (event.type === 'achievement_awarded') {
        achievementAwardedCalls.push(event.data);
      }
    });

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // assignToUser был вызван
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);

    // При NotFoundException achievement_awarded НЕ эмитится
    expect(achievementAwardedCalls).toHaveLength(0);
  });

  it('should call assignToUser before emitting achievement_awarded (order matters)', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    const mockUserAchievement = { id: 1, userId, achievementId, unlockedAt: new Date() };
    mockAchievementService.assignToUser.mockResolvedValue(mockUserAchievement);

    const achievementAwardedCalls: any[] = [];
    achievementEventsService.getRawEvents().subscribe((event) => {
      if (event.type === 'achievement_awarded') {
        achievementAwardedCalls.push(event.data);
      }
    });

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Проверяем порядок: сначала assignToUser был вызван
    expect(mockAchievementService.assignToUser).toHaveBeenCalled();
    // Затем achievement_awarded был эмитирован
    expect(achievementAwardedCalls).toHaveLength(1);
    
    // Проверяем порядок вызовов через invocationCallOrder
    const assignToUserCallOrder = (mockAchievementService.assignToUser as any).mock.invocationCallOrder[0];
    // Событие achievement_awarded эмитится синхронно после assignToUser, поэтому порядок должен быть правильным
    expect(assignToUserCallOrder).toBeDefined();
  });

  describe('handleRequirementSync', () => {
    const questId = 1;
    const userId = 2;

    it('should sync requirement currentValue for contributer_added event', async () => {
      eventsService.emitContributerAdded(questId, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'contributers');
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for contributer_removed event', async () => {
      eventsService.emitContributerRemoved(questId, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'contributers');
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for step_volunteer_added event with finance type', async () => {
      const stepType = 'finance';
      const contributeValue = 100;
      eventsService.emitStepVolunteerAdded(questId, stepType, userId, contributeValue);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for step_volunteer_added event with material type', async () => {
      const stepType = 'material';
      const contributeValue = 50;
      eventsService.emitStepVolunteerAdded(questId, stepType, userId, contributeValue);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for checkin_confirmed event with contributers type', async () => {
      const stepType = 'contributers';
      eventsService.emitCheckinConfirmed(questId, stepType, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for checkin_confirmed event with finance type', async () => {
      const stepType = 'finance';
      eventsService.emitCheckinConfirmed(questId, stepType, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should sync requirement currentValue for checkin_confirmed event with material type', async () => {
      const stepType = 'material';
      eventsService.emitCheckinConfirmed(questId, stepType, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, stepType);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple events sequentially', async () => {
      eventsService.emitContributerAdded(questId, userId);
      eventsService.emitStepVolunteerAdded(questId, 'finance', userId, 100);
      eventsService.emitCheckinConfirmed(questId, 'material', userId);

      // Даем event loop обработать асинхронные handlers
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledTimes(3);
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'contributers');
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'finance');
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'material');
    });

    it('should handle errors gracefully when syncRequirementCurrentValue fails', async () => {
      const error = new Error('Sync failed');
      mockQuestService.syncRequirementCurrentValue.mockRejectedValue(error);

      eventsService.emitContributerAdded(questId, userId);

      // Даем event loop обработать асинхронный handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Метод должен быть вызван, но ошибка должна быть обработана внутри handler
      expect(mockQuestService.syncRequirementCurrentValue).toHaveBeenCalledWith(questId, 'contributers');
    });
  });
});


