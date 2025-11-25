import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

@Module({
  providers: [RabbitMQService],
  controllers: [],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}

