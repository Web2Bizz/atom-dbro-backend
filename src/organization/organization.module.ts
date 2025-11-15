import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { S3Service } from './s3.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, S3Service],
  exports: [OrganizationService],
})
export class OrganizationModule {}

