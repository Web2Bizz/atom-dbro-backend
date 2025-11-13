import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RegionModule } from './region/region.module';
import { CityModule } from './city/city.module';
import { UserModule } from './user/user.module';
import { HelpTypeModule } from './help-type/help-type.module';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RegionModule,
    CityModule,
    UserModule,
    HelpTypeModule,
    OrganizationModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

