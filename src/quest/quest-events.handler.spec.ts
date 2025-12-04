import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestEventsService } from './quest.events';
import { QuestEventsHandler } from './quest-events.handler';
import { ExperienceService } from '../experience/experience.service';
import { AchievementService } from '../achievement/achievement.service';

describe('QuestEventsHandler', () => {
  let eventsService: QuestEventsService;
  let handler: QuestEventsHandler;

  const mockExperienceService = {
    addExperience: vi.fn(),
  };

  const mockAchievementService = {
    assignToUser: vi.fn(),
  };

  beforeEach(() => {
    eventsService = new QuestEventsService();
    handler = new QuestEventsHandler(
      eventsService as any,
      mockExperienceService as unknown as ExperienceService,
      mockAchievementService as unknown as AchievementService,
    );

    // Инициализируем подписку на события
    handler.onModuleInit();

    mockExperienceService.addExperience.mockReset();
    mockAchievementService.assignToUser.mockReset();
  });

  it('should handle quest_completed event: add experience and assign achievement', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 150;
    const achievementId = 10;

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      achievementId,
    });

    // Даем event loop обработать асинхронный handler
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockExperienceService.addExperience).toHaveBeenCalledWith(userId, experienceReward);
    expect(mockAchievementService.assignToUser).toHaveBeenCalledWith(userId, achievementId);
  });

  it('should handle quest_completed event without achievementId: only add experience', async () => {
    const questId = 1;
    const userId = 2;
    const experienceReward = 50;

    eventsService.emitQuestCompleted(questId, userId, {
      userId,
      experienceReward,
      // achievementId отсутствует
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockExperienceService.addExperience).toHaveBeenCalledWith(userId, experienceReward);
    expect(mockAchievementService.assignToUser).not.toHaveBeenCalled();
  });
});


