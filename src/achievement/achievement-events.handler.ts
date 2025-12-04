import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { filter } from 'rxjs/operators';
import { AchievementEventsService, AchievementEvent } from './achievement.events';
import { ExperienceService } from '../experience/experience.service';

@Injectable()
export class AchievementEventsHandler implements OnModuleInit {
  private readonly logger = new Logger(AchievementEventsHandler.name);

  constructor(
    private readonly events: AchievementEventsService,
    private readonly experienceService: ExperienceService,
  ) {}

  onModuleInit() {
    this.events
      .getRawEvents()
      .pipe(filter((event: AchievementEvent) => event.type === 'achievement_awarded'))
      .subscribe({
        next: (event) => {
          void this.handleAchievementAwarded(event);
        },
        error: (error) => {
          this.logger.error('Error in achievement events stream', error);
        },
      });
  }

  private async handleAchievementAwarded(event: AchievementEvent): Promise<void> {
    const { userId, experienceReward } = event.data;

    if (!userId) {
      this.logger.warn('Received achievement_awarded event without userId, skipping');
      return;
    }

    if (!experienceReward || experienceReward <= 0) {
      this.logger.log(
        `achievement_awarded for user ${userId} without positive experienceReward, skipping XP`,
      );
      return;
    }

    try {
      await this.experienceService.addExperience(userId, experienceReward);
      this.logger.log(
        `Experience ${experienceReward} added to user ${userId} after achievement_awarded event`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add experience for user ${userId} on achievement_awarded event`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

