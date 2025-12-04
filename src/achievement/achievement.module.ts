import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { AchievementRepository } from './achievement.repository';
import { AchievementEventsService } from './achievement.events';
import { AchievementEventsHandler } from './achievement-events.handler';
import { DatabaseModule } from '../database/database.module';
import { ExperienceModule } from '../experience/experience.module';

@Module({
  imports: [DatabaseModule, ExperienceModule],
  controllers: [AchievementController],
  providers: [
    AchievementService,
    AchievementRepository,
    AchievementEventsService,
    AchievementEventsHandler,
  ],
  exports: [AchievementService, AchievementEventsService],
})
export class AchievementModule {}

