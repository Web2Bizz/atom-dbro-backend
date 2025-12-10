import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { DatabaseModule } from '../database/database.module';
import { Logger } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule implements OnModuleInit {
  private readonly logger = new Logger(TicketModule.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const chattyUrl = this.configService.get<string>('CHATTY_URL');
    const chattyApiKey = this.configService.get<string>('CHATTY_API_KEY');

    if (!chattyUrl || chattyUrl.trim() === '') {
      throw new Error('CHATTY_URL environment variable is required and cannot be empty');
    }

    if (!chattyApiKey || chattyApiKey.trim() === '') {
      throw new Error('CHATTY_API_KEY environment variable is required and cannot be empty');
    }

    this.logger.log('CHATTY configuration validated successfully');
  }
}

