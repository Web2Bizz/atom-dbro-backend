import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExperienceService } from '../experience/experience.service';

// Временные типы и фейковые классы для описания контракта будущего AchievementEventsHandler
interface AchievementAwardedEvent {
  type: 'achievement_awarded';
  data: {
    userId: number;
    achievementId: number;
    questId?: number;
    experienceReward?: number;
  };
  timestamp: Date;
}

// Временная шина событий для тестов (будет заменена на реальный AchievementEventsService)
class FakeAchievementEventsService {
  private subscribers: Array<(event: AchievementAwardedEvent) => void> = [];

  emitAchievementAwarded(data: AchievementAwardedEvent['data']) {
    const event: AchievementAwardedEvent = {
      type: 'achievement_awarded',
      data,
      timestamp: new Date(),
    };
    for (const sub of this.subscribers) {
      sub(event);
    }
  }

  subscribe(handler: (event: AchievementAwardedEvent) => void) {
    this.subscribers.push(handler);
  }

  getRawEvents() {
    // В реальной реализации это будет Observable
    return {
      pipe: (filterFn: any) => ({
        subscribe: (handlers: { next: (e: AchievementAwardedEvent) => void }) => {
          this.subscribe(handlers.next);
        },
      }),
    };
  }
}

// Временный handler по контракту (будет заменен на реальный AchievementEventsHandler)
class FakeAchievementEventsHandler {
  constructor(
    private readonly events: FakeAchievementEventsService,
    private readonly experienceService: ExperienceService,
  ) {}

  onModuleInit() {
    // Имитация подписки через getRawEvents (как в реальной реализации)
    this.events.getRawEvents().pipe(() => true).subscribe({
      next: (event: AchievementAwardedEvent) => void this.handle(event),
    });
  }

  private async handle(event: AchievementAwardedEvent) {
    const { userId, experienceReward } = event.data || {};
    if (!userId) {
      return;
    }

    if (typeof experienceReward === 'number' && experienceReward > 0) {
      await this.experienceService.addExperience(userId, experienceReward);
    }
  }
}

describe('AchievementEventsHandler (contract)', () => {
  let events: FakeAchievementEventsService;
  let handler: FakeAchievementEventsHandler;

  const mockExperienceService = {
    addExperience: vi.fn(),
  } as unknown as ExperienceService;

  beforeEach(() => {
    events = new FakeAchievementEventsService();
    handler = new FakeAchievementEventsHandler(events, mockExperienceService);
    handler.onModuleInit();
    (mockExperienceService.addExperience as any).mockReset();
  });

  it('should add experience on achievement_awarded event', async () => {
    const userId = 2;
    const achievementId = 10;
    const questId = 1;
    const experienceReward = 100;

    events.emitAchievementAwarded({
      userId,
      achievementId,
      questId,
      experienceReward,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((mockExperienceService.addExperience as any)).toHaveBeenCalledWith(userId, experienceReward);
    expect((mockExperienceService.addExperience as any)).toHaveBeenCalledTimes(1);
  });

  it('should not add experience when experienceReward is missing', async () => {
    const userId = 2;
    const achievementId = 10;

    events.emitAchievementAwarded({
      userId,
      achievementId,
      // experienceReward отсутствует
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((mockExperienceService.addExperience as any)).not.toHaveBeenCalled();
  });

  it('should not add experience when experienceReward is 0 or negative', async () => {
    const userId = 2;
    const achievementId = 10;

    events.emitAchievementAwarded({
      userId,
      achievementId,
      experienceReward: 0,
    });

    events.emitAchievementAwarded({
      userId,
      achievementId,
      experienceReward: -10,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((mockExperienceService.addExperience as any)).not.toHaveBeenCalled();
  });

  it('should handle multiple achievement_awarded events independently', async () => {
    const userId1 = 2;
    const userId2 = 3;
    const achievementId1 = 10;
    const achievementId2 = 11;
    const experienceReward1 = 50;
    const experienceReward2 = 75;

    events.emitAchievementAwarded({
      userId: userId1,
      achievementId: achievementId1,
      experienceReward: experienceReward1,
    });

    events.emitAchievementAwarded({
      userId: userId2,
      achievementId: achievementId2,
      experienceReward: experienceReward2,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((mockExperienceService.addExperience as any)).toHaveBeenCalledTimes(2);
    expect((mockExperienceService.addExperience as any)).toHaveBeenCalledWith(userId1, experienceReward1);
    expect((mockExperienceService.addExperience as any)).toHaveBeenCalledWith(userId2, experienceReward2);
  });
});

