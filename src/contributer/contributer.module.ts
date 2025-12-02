import { Module } from '@nestjs/common';
import { ContributerService } from './contributer.service';
import { ContributerController } from './contributer.controller';
import { ContributerRepository } from './contributer.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContributerController],
  providers: [ContributerService, ContributerRepository],
  exports: [ContributerService, ContributerRepository],
})
export class ContributerModule {}

