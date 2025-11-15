import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RegionModule } from './region/region.module';
import { CityModule } from './city/city.module';
import { UserModule } from './user/user.module';
import { HelpTypeModule } from './help-type/help-type.module';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { ExperienceModule } from './experience/experience.module';
import { AchievementModule } from './achievement/achievement.module';
import { QuestModule } from './quest/quest.module';
import { UploadModule } from './upload/upload.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Явно указываем путь к .env файлу
      expandVariables: true, // Поддержка переменных в .env файле
    }),
    DatabaseModule,
    RegionModule,
    CityModule,
    UserModule,
    HelpTypeModule,
    OrganizationModule,
    AuthModule,
    ExperienceModule,
    AchievementModule,
    QuestModule,
    UploadModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

