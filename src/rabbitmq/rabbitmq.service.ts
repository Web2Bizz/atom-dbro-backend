import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import * as amqpConnectionManager from 'amqp-connection-manager';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqpConnectionManager.AmqpConnectionManager;
  private channelWrapper: amqpConnectionManager.ChannelWrapper;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
    const username = this.configService.get<string>('RABBITMQ_USERNAME') || 'guest';
    const password = this.configService.get<string>('RABBITMQ_PASSWORD') || 'guest';
    const hostname = this.configService.get<string>('RABBITMQ_HOSTNAME') || 'localhost';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';

    // Формируем URL подключения
    const connectionUrl = url.includes('://') 
      ? url 
      : `amqp://${username}:${password}@${hostname}:${port}`;

    this.logger.log(`Connecting to RabbitMQ at ${hostname}:${port}`);

    try {
      // Создаем connection manager для автоматического переподключения
      this.connection = amqpConnectionManager.connect([connectionUrl], {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('Successfully connected to RabbitMQ');
      });

      this.connection.on('disconnect', (err) => {
        this.logger.warn('Disconnected from RabbitMQ', err?.message);
      });

      // Создаем канал
      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: amqp.Channel) => {
          this.logger.log('Channel created');
        },
      });

      await this.channelWrapper.waitForConnect();
      this.logger.log('RabbitMQ channel is ready');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
      this.logger.log('RabbitMQ channel closed');
    }
    if (this.connection) {
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    }
  }

  /**
   * Отправляет сообщение в очередь
   * @param queue - имя очереди
   * @param message - сообщение для отправки
   * @param options - дополнительные опции (durable, persistent и т.д.)
   */
  async sendToQueue(
    queue: string,
    message: any,
    options?: {
      durable?: boolean;
      persistent?: boolean;
      expiration?: string;
      priority?: number;
    },
  ): Promise<boolean> {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const queueOptions = {
        durable: options?.durable ?? true,
      };

      // Убеждаемся, что очередь существует
      await this.channelWrapper.assertQueue(queue, queueOptions);

      const publishOptions: amqp.Options.Publish = {
        persistent: options?.persistent ?? true,
      };

      if (options?.expiration) {
        publishOptions.expiration = options.expiration;
      }

      if (options?.priority !== undefined) {
        publishOptions.priority = options.priority;
      }

      const sent = this.channelWrapper.sendToQueue(queue, messageBuffer, publishOptions);

      if (sent) {
        this.logger.debug(`Message sent to queue: ${queue}`);
        return true;
      } else {
        this.logger.warn(`Failed to send message to queue: ${queue} (buffer full)`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error sending message to queue ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Отправляет сообщение в exchange
   * @param exchange - имя exchange
   * @param routingKey - routing key
   * @param message - сообщение для отправки
   * @param exchangeType - тип exchange (direct, topic, fanout, headers)
   */
  async publishToExchange(
    exchange: string,
    routingKey: string,
    message: any,
    exchangeType: 'direct' | 'topic' | 'fanout' | 'headers' = 'direct',
    options?: {
      durable?: boolean;
      persistent?: boolean;
    },
  ): Promise<boolean> {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Убеждаемся, что exchange существует
      await this.channelWrapper.assertExchange(exchange, exchangeType, {
        durable: options?.durable ?? true,
      });

      const publishOptions: amqp.Options.Publish = {
        persistent: options?.persistent ?? true,
      };

      const sent = this.channelWrapper.publish(exchange, routingKey, messageBuffer, publishOptions);

      if (sent) {
        this.logger.debug(`Message published to exchange: ${exchange} with routing key: ${routingKey}`);
        return true;
      } else {
        this.logger.warn(`Failed to publish message to exchange: ${exchange} (buffer full)`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error publishing message to exchange ${exchange}:`, error);
      throw error;
    }
  }

  /**
   * Проверяет подключение к RabbitMQ
   */
  async isConnected(): Promise<boolean> {
    return this.connection?.isConnected() ?? false;
  }
}

