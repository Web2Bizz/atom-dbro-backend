import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  PrometheusModule,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { DatabaseModule } from './database/database.module';
import { RegionModule } from './region/region.module';
import { CityModule } from './city/city.module';
import { UserModule } from './user/user.module';
import { HelpTypeModule } from './help-type/help-type.module';
import { OrganizationTypeModule } from './organization-type/organization-type.module';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { ExperienceModule } from './experience/experience.module';
import { AchievementModule } from './achievement/achievement.module';
import { QuestModule } from './quest/quest.module';
import { UploadModule } from './upload/upload.module';
import { CategoryModule } from './category/category.module';
import { QuestUpdateModule } from './quest-update/quest-update.module';
import { OrganizationUpdateModule } from './organization-update/organization-update.module';
import { StepVolunteerModule } from './step-volunteer/step-volunteer.module';
import { ContributerModule } from './contributer/contributer.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';
import { CheckinModule } from './checkin/checkin.module';
import { TicketModule } from './ticket/ticket.module';
import { AppController } from './app.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      // эндпоинт для метрик Prometheus (versioning добавит /v1, итого /api/v1/metrics)
      path: '/metrics',
    }),
    DatabaseModule,
    RedisModule,
    RegionModule,
    CityModule,
    UserModule,
    HelpTypeModule,
    OrganizationTypeModule,
    OrganizationModule,
    AuthModule,
    ExperienceModule,
    AchievementModule,
    QuestModule,
    UploadModule,
    CategoryModule,
    QuestUpdateModule,
    OrganizationUpdateModule,
    StepVolunteerModule,
    ContributerModule,
    RabbitMQModule,
    CheckinModule,
    TicketModule,
  ],
  controllers: [AppController],
  providers: [
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      labelNames: ['method', 'route', 'status'],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}

