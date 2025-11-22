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
    const url = this.configService.get<string>('RABBITMQ_URL');
    const username = this.configService.get<string>('RABBITMQ_USERNAME') || 'guest';
    const password = this.configService.get<string>('RABBITMQ_PASSWORD') || 'guest';
    const hostname = this.configService.get<string>('RABBITMQ_HOSTNAME') || 'localhost';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';

    // Формируем URL подключения
    const connectionUrl = url && url.includes('://') 
      ? url 
      : `amqp://${username}:${password}@${hostname}:${port}`;

    this.logger.log(`Initializing RabbitMQ connection...`);
    this.logger.debug(`RabbitMQ config: host=${hostname}, port=${port}, user=${username}`);

    try {
      // Создаем connection manager для автоматического переподключения
      this.connection = amqpConnectionManager.connect([connectionUrl], {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 5,
      });

      this.connection.on('connect', ({ connection }) => {
        this.logger.log(`Successfully connected to RabbitMQ at ${hostname}:${port}`);
        this.logger.debug(`Connection URL: amqp://${username}:***@${hostname}:${port}`);
      });

      this.connection.on('disconnect', (params) => {
        const errorMessage = params?.err?.message || 'Unknown error';
        this.logger.warn(`Disconnected from RabbitMQ: ${errorMessage}`);
        if (params?.err) {
          this.logger.debug(`Disconnect error details:`, params.err);
        }
      });

      this.connection.on('connectFailed', ({ err, url }) => {
        this.logger.error(`Failed to connect to RabbitMQ at ${url}: ${err.message}`);
        this.logger.debug(`Connection error:`, err);
      });

      // Создаем канал
      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: amqp.Channel) => {
          this.logger.log('RabbitMQ channel created successfully');
          this.logger.debug(`Channel number: ${channel.channelNumber}`);
        },
      });

      this.logger.log('Waiting for RabbitMQ channel to be ready...');
      await this.channelWrapper.waitForConnect();
      this.logger.log('RabbitMQ channel is ready and connected');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ connection', error);
      if (error instanceof Error) {
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down RabbitMQ connection...');
    
    if (this.channelWrapper) {
      try {
        await this.channelWrapper.close();
        this.logger.log('RabbitMQ channel closed successfully');
      } catch (error) {
        this.logger.error('Error closing RabbitMQ channel', error);
      }
    }
    
    if (this.connection) {
      try {
        await this.connection.close();
        this.logger.log('RabbitMQ connection closed successfully');
      } catch (error) {
        this.logger.error('Error closing RabbitMQ connection', error);
      }
    }
    
    this.logger.log('RabbitMQ shutdown completed');
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
    const startTime = Date.now();
    this.logger.log(`Sending message to queue: ${queue}`);
    
    try {
      const messageString = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageString);
      const messageSize = messageBuffer.length;
      
      this.logger.debug(`Message details: queue=${queue}, size=${messageSize} bytes`);
      
      const queueOptions = {
        durable: options?.durable ?? true,
      };

      // Убеждаемся, что очередь существует
      this.logger.debug(`Asserting queue: ${queue} (durable=${queueOptions.durable})`);
      await this.channelWrapper.assertQueue(queue, queueOptions);
      this.logger.debug(`Queue ${queue} asserted successfully`);

      const publishOptions: amqp.Options.Publish = {
        persistent: options?.persistent ?? true,
      };

      if (options?.expiration) {
        publishOptions.expiration = options.expiration;
        this.logger.debug(`Message expiration set: ${options.expiration}`);
      }

      if (options?.priority !== undefined) {
        publishOptions.priority = options.priority;
        this.logger.debug(`Message priority set: ${options.priority}`);
      }

      this.logger.debug(`Publishing message with options: ${JSON.stringify(publishOptions)}`);
      const sent = this.channelWrapper.sendToQueue(queue, messageBuffer, publishOptions);

      const duration = Date.now() - startTime;
      
      if (sent) {
        this.logger.log(`Message sent to queue: ${queue} (${messageSize} bytes, ${duration}ms)`);
        this.logger.debug(`Message content preview: ${messageString.substring(0, 100)}${messageString.length > 100 ? '...' : ''}`);
        return true;
      } else {
        this.logger.warn(`Failed to send message to queue: ${queue} - buffer is full (${messageSize} bytes, ${duration}ms)`);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error sending message to queue ${queue} (${duration}ms):`, error);
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
        this.logger.debug(`Error stack: ${error.stack}`);
      }
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
    const startTime = Date.now();
    this.logger.log(`Publishing message to exchange: ${exchange} (type=${exchangeType}, routingKey=${routingKey})`);
    
    try {
      const messageString = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageString);
      const messageSize = messageBuffer.length;
      
      this.logger.debug(`Message details: exchange=${exchange}, routingKey=${routingKey}, size=${messageSize} bytes`);

      // Убеждаемся, что exchange существует
      const exchangeOptions = {
        durable: options?.durable ?? true,
      };
      this.logger.debug(`Asserting exchange: ${exchange} (type=${exchangeType}, durable=${exchangeOptions.durable})`);
      await this.channelWrapper.assertExchange(exchange, exchangeType, exchangeOptions);
      this.logger.debug(`Exchange ${exchange} asserted successfully`);

      const publishOptions: amqp.Options.Publish = {
        persistent: options?.persistent ?? true,
      };

      this.logger.debug(`Publishing message with options: ${JSON.stringify(publishOptions)}`);
      const sent = this.channelWrapper.publish(exchange, routingKey, messageBuffer, publishOptions);

      const duration = Date.now() - startTime;
      
      if (sent) {
        this.logger.log(`Message published to exchange: ${exchange} (routingKey=${routingKey}, ${messageSize} bytes, ${duration}ms)`);
        this.logger.debug(`Message content preview: ${messageString.substring(0, 100)}${messageString.length > 100 ? '...' : ''}`);
        return true;
      } else {
        this.logger.warn(`Failed to publish message to exchange: ${exchange} - buffer is full (routingKey=${routingKey}, ${messageSize} bytes, ${duration}ms)`);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error publishing message to exchange ${exchange} (routingKey=${routingKey}, ${duration}ms):`, error);
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
        this.logger.debug(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Проверяет подключение к RabbitMQ
   */
  async isConnected(): Promise<boolean> {
    const isConnected = this.connection?.isConnected() ?? false;
    this.logger.debug(`RabbitMQ connection status check: ${isConnected ? 'connected' : 'disconnected'}`);
    return isConnected;
  }
}

