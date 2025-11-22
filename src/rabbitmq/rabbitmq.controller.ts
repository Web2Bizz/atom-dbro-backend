import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RabbitMQService } from './rabbitmq.service';
import { SendMessageDto, sendMessageSchema, SendMessageDtoClass } from './dto/send-message.dto';
import { PublishMessageDto, publishMessageSchema, PublishMessageDtoClass } from './dto/publish-message.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('RabbitMQ')
@Controller('rabbitmq')
export class RabbitMQController {
  private readonly logger = new Logger(RabbitMQController.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверить подключение к RabbitMQ' })
  @ApiResponse({ status: 200, description: 'Статус подключения' })
  async checkHealth() {
    this.logger.log('Health check requested');
    const isConnected = await this.rabbitMQService.isConnected();
    this.logger.log(`Health check result: ${isConnected ? 'connected' : 'disconnected'}`);
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
    this.logger.log(`Received request to send message to queue: ${sendMessageDto.queue}`);
    this.logger.debug(`Request payload: queue=${sendMessageDto.queue}, options=${JSON.stringify(sendMessageDto.options)}`);
    
    try {
      const result = await this.rabbitMQService.sendToQueue(
        sendMessageDto.queue,
        sendMessageDto.message,
        sendMessageDto.options,
      );

      this.logger.log(`Message send result for queue ${sendMessageDto.queue}: ${result ? 'success' : 'failed (buffer full)'}`);

      return {
        success: result,
        queue: sendMessageDto.queue,
        message: 'Message sent to queue',
      };
    } catch (error) {
      this.logger.error(`Failed to send message to queue ${sendMessageDto.queue}:`, error);
      throw error;
    }
  }

  @Post('publish')
  @ZodValidation(publishMessageSchema)
  @ApiOperation({ summary: 'Опубликовать сообщение в exchange RabbitMQ' })
  @ApiBody({ type: PublishMessageDtoClass })
  @ApiResponse({ status: 200, description: 'Сообщение успешно опубликовано' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  @ApiResponse({ status: 500, description: 'Ошибка при публикации сообщения' })
  async publishToExchange(@Body() publishMessageDto: PublishMessageDto) {
    this.logger.log(`Received request to publish message to exchange: ${publishMessageDto.exchange} (routingKey=${publishMessageDto.routingKey})`);
    this.logger.debug(`Request payload: exchange=${publishMessageDto.exchange}, routingKey=${publishMessageDto.routingKey}, exchangeType=${publishMessageDto.exchangeType}, options=${JSON.stringify(publishMessageDto.options)}`);
    
    try {
      const result = await this.rabbitMQService.publishToExchange(
        publishMessageDto.exchange,
        publishMessageDto.routingKey,
        publishMessageDto.message,
        publishMessageDto.exchangeType,
        publishMessageDto.options,
      );

      this.logger.log(`Message publish result for exchange ${publishMessageDto.exchange} (routingKey=${publishMessageDto.routingKey}): ${result ? 'success' : 'failed (buffer full)'}`);

      return {
        success: result,
        exchange: publishMessageDto.exchange,
        routingKey: publishMessageDto.routingKey,
        message: 'Message published to exchange',
      };
    } catch (error) {
      this.logger.error(`Failed to publish message to exchange ${publishMessageDto.exchange}:`, error);
      throw error;
    }
  }
}

