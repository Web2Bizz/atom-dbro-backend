import { Module } from '@nestjs/common';
import { StepVolunteerService } from './step-volunteer.service';
import { StepVolunteerController } from './step-volunteer.controller';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StepVolunteerController],
  providers: [StepVolunteerService, StepVolunteerRepository],
  exports: [StepVolunteerService, StepVolunteerRepository],
})
export class StepVolunteerModule {}

