import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './organization.repository';
import { S3Service } from './s3.service';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EntityValidationModule } from '../common/services/entity-validation.module';

@Module({
  imports: [DatabaseModule, AuthModule, EntityValidationModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, S3Service, FileValidationInterceptor],
  exports: [OrganizationService],
})
export class OrganizationModule {}

