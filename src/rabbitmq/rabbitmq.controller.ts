import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RabbitMQService } from './rabbitmq.service';
import { SendMessageDto, sendMessageSchema, SendMessageDtoClass } from './dto/send-message.dto';
import { PublishMessageDto, publishMessageSchema, PublishMessageDtoClass } from './dto/publish-message.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('RabbitMQ')
@Controller('rabbitmq')
export class RabbitMQController {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверить подключение к RabbitMQ' })
  @ApiResponse({ status: 200, description: 'Статус подключения' })
  async checkHealth() {
    const isConnected = await this.rabbitMQService.isConnected();
    return {
      connected: isConnected,
      status: isConnected ? 'ok' : 'disconnected',
    };
  }

  @Post('send')
  @ZodValidation(sendMessageSchema)
  @ApiOperation({ summary: 'Отправить сообщение в очередь RabbitMQ' })
  @ApiBody({ type: SendMessageDtoClass })
  @ApiResponse({ status: 200, description: 'Сообщение успешно отправлено' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  @ApiResponse({ status: 500, description: 'Ошибка при отправке сообщения' })
  async sendToQueue(@Body() sendMessageDto: SendMessageDto) {
    const result = await this.rabbitMQService.sendToQueue(
      sendMessageDto.queue,
      sendMessageDto.message,
      sendMessageDto.options,
    );

    return {
      success: result,
      queue: sendMessageDto.queue,
      message: 'Message sent to queue',
    };
  }

  @Post('publish')
  @ZodValidation(publishMessageSchema)
  @ApiOperation({ summary: 'Опубликовать сообщение в exchange RabbitMQ' })
  @ApiBody({ type: PublishMessageDtoClass })
  @ApiResponse({ status: 200, description: 'Сообщение успешно опубликовано' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  @ApiResponse({ status: 500, description: 'Ошибка при публикации сообщения' })
  async publishToExchange(@Body() publishMessageDto: PublishMessageDto) {
    const result = await this.rabbitMQService.publishToExchange(
      publishMessageDto.exchange,
      publishMessageDto.routingKey,
      publishMessageDto.message,
      publishMessageDto.exchangeType,
      publishMessageDto.options,
    );

    return {
      success: result,
      exchange: publishMessageDto.exchange,
      routingKey: publishMessageDto.routingKey,
      message: 'Message published to exchange',
    };
  }
}

