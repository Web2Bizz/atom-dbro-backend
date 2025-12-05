import { Module, forwardRef } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { QuestEventsService } from './quest.events';
import { QuestEventsHandler } from './quest-events.handler';
import { QuestRepository } from './quest.repository';
import { QuestCacheService } from './quest-cache.service';
import { DatabaseModule } from '../database/database.module';
import { StepVolunteerModule } from '../step-volunteer/step-volunteer.module';
import { ContributerModule } from '../contributer/contributer.module';
import { AchievementModule } from '../achievement/achievement.module';
import { EntityValidationModule } from '../common/services/entity-validation.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => StepVolunteerModule),
    forwardRef(() => ContributerModule),
    AchievementModule,
    EntityValidationModule,
  ],
  controllers: [QuestController],
  providers: [QuestService, QuestEventsService, QuestEventsHandler, QuestRepository, QuestCacheService],
  exports: [QuestService, QuestEventsService, QuestRepository, QuestCacheService],
})
export class QuestModule {}

