import { Module, forwardRef } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { QuestEventsService } from './quest.events';
import { QuestEventsHandler } from './quest-events.handler';
import { QuestRepository } from './quest.repository';
import { DatabaseModule } from '../database/database.module';
import { StepVolunteerModule } from '../step-volunteer/step-volunteer.module';
import { AchievementModule } from '../achievement/achievement.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => StepVolunteerModule),
    AchievementModule,
  ],
  controllers: [QuestController],
  providers: [QuestService, QuestEventsService, QuestEventsHandler, QuestRepository],
  exports: [QuestService, QuestEventsService, QuestRepository],
})
export class QuestModule {}

