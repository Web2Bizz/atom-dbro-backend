import { Module, forwardRef } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { QuestEventsService } from './quest.events';
import { QuestRepository } from './quest.repository';
import { DatabaseModule } from '../database/database.module';
import { StepVolunteerModule } from '../step-volunteer/step-volunteer.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => StepVolunteerModule)],
  controllers: [QuestController],
  providers: [QuestService, QuestEventsService, QuestRepository],
  exports: [QuestService, QuestEventsService, QuestRepository],
})
export class QuestModule {}

