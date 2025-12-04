import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { filter } from 'rxjs/operators';
import { QuestEventsService, QuestEvent } from './quest.events';
import { ExperienceService } from '../experience/experience.service';
import { AchievementService } from '../achievement/achievement.service';

@Injectable()
export class QuestEventsHandler implements OnModuleInit {
  private readonly logger = new Logger(QuestEventsHandler.name);

  constructor(
    private readonly questEventsService: QuestEventsService,
    private readonly experienceService: ExperienceService,
    private readonly achievementService: AchievementService,
  ) {}

  onModuleInit() {
    this.questEventsService
      .getRawEvents()
      .pipe(filter((event: QuestEvent) => event.type === 'quest_completed'))
      .subscribe({
        next: (event) => {
          void this.handleQuestCompleted(event);
        },
        error: (error) => {
          this.logger.error('Error in quest events stream', error);
        },
      });
  }

  private async handleQuestCompleted(event: QuestEvent): Promise<void> {
    const { data } = event;
    const { userId, experienceReward, achievementId } = data || {};

    if (!userId) {
      this.logger.warn('Received quest_completed event without userId, skipping');
      return;
    }

    // Начисление опыта
    try {
      if (typeof experienceReward === 'number' && experienceReward > 0) {
        await this.experienceService.addExperience(userId, experienceReward);
      }
    } catch (error) {
      this.logger.error(
        `Failed to add experience for user ${userId} on quest_completed event`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    // Выдача достижения
    try {
      if (achievementId) {
        await this.achievementService.assignToUser(userId, achievementId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to assign achievement ${achievementId} to user ${userId} on quest_completed event`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}


