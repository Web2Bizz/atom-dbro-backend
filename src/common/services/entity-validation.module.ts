import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { EntityValidationService } from './entity-validation.service';

@Module({
  imports: [DatabaseModule],
  providers: [EntityValidationService],
  exports: [EntityValidationService],
})
export class EntityValidationModule {}

