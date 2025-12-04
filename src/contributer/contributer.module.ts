import { Module, forwardRef } from '@nestjs/common';
import { ContributerService } from './contributer.service';
import { ContributerController } from './contributer.controller';
import { ContributerRepository } from './contributer.repository';
import { DatabaseModule } from '../database/database.module';
import { QuestModule } from '../quest/quest.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => QuestModule),
  ],
  controllers: [ContributerController],
  providers: [ContributerService, ContributerRepository],
  exports: [ContributerService, ContributerRepository],
})
export class ContributerModule {}

