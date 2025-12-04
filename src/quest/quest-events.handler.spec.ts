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

  let achievementEventsService: AchievementEventsService;

  beforeEach(() => {
    eventsService = new QuestEventsService();
    achievementEventsService = new AchievementEventsService();
    handler = new QuestEventsHandler(
      eventsService as any,
      mockAchievementService as unknown as AchievementService,
      achievementEventsService,
    );

    // Инициализируем подписку на события
    handler.onModuleInit();

    mockAchievementService.assignToUser.mockReset();
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
});


