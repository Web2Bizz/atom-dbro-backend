import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { QuestModule } from '../quest/quest.module';
import { StepVolunteerModule } from '../step-volunteer/step-volunteer.module';
import { ContributerModule } from '../contributer/contributer.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => QuestModule),
    StepVolunteerModule,
    ContributerModule,
    UserModule,
  ],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}

