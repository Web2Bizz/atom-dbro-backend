import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB') || 0;

    this.logger.log(`Подключение к Redis: ${host}:${port}, db: ${db}`);

    const redisOptions: Redis.RedisOptions = {
      host,
      port,
      db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Повторная попытка подключения к Redis через ${delay}ms (попытка ${times})`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    if (password) {
      redisOptions.password = password;
    }

    this.client = new Redis(redisOptions);

    this.client.on('connect', () => {
      this.logger.log('Подключение к Redis установлено');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis готов к работе');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Ошибка Redis: ${error.message}`, error.stack);
    });

    this.client.on('close', () => {
      this.logger.warn('Соединение с Redis закрыто');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Переподключение к Redis...');
    });

    // Ждем, пока клиент будет готов (ioredis подключается автоматически)
    try {
      await this.client.ping();
      this.logger.log('Успешное подключение к Redis');
    } catch (error) {
      this.logger.error(`Не удалось подключиться к Redis: ${error.message}`, error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Закрытие соединения с Redis');
      await this.client.quit();
      this.logger.log('Соединение с Redis закрыто');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.logger.debug(`SET ${key} (TTL: ${ttlSeconds || 'нет'})`);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    this.logger.debug(`GET ${key}`);
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    this.logger.debug(`DEL ${key}`);
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    this.logger.debug(`EXISTS ${key}`);
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setHash(key: string, hash: Record<string, string>, ttlSeconds?: number): Promise<void> {
    this.logger.debug(`HSET ${key} (TTL: ${ttlSeconds || 'нет'})`);
    await this.client.hset(key, hash);
    if (ttlSeconds) {
      await this.client.expire(key, ttlSeconds);
    }
  }

  async getHash(key: string): Promise<Record<string, string> | null> {
    this.logger.debug(`HGETALL ${key}`);
    const result = await this.client.hgetall(key);
    return Object.keys(result).length > 0 ? result : null;
  }

  async getHashField(key: string, field: string): Promise<string | null> {
    this.logger.debug(`HGET ${key} ${field}`);
    return await this.client.hget(key, field);
  }
}

