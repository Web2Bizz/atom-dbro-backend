import { Module, forwardRef } from '@nestjs/common';
import { StepVolunteerService } from './step-volunteer.service';
import { StepVolunteerController } from './step-volunteer.controller';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { DatabaseModule } from '../database/database.module';
import { QuestModule } from '../quest/quest.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => QuestModule)],
  controllers: [StepVolunteerController],
  providers: [StepVolunteerService, StepVolunteerRepository],
  exports: [StepVolunteerService, StepVolunteerRepository],
})
export class StepVolunteerModule {}

