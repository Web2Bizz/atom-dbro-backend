import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tickets } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';

interface ChattyRoomResponse {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  type: string;
}

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private configService: ConfigService,
  ) {}

  /**
   * Создать комнату в сервисе CHATTY
   */
  private async createRoom(name: string): Promise<string> {
    const chattyUrl = this.configService.get<string>('CHATTY_URL') || '';
    const chattyApiKey = this.configService.get<string>('CHATTY_API_KEY') || '';

    if (!chattyUrl || !chattyApiKey) {
      throw new BadRequestException('Конфигурация CHATTY не настроена');
    }

    try {
      const response = await fetch(`${chattyUrl}/chatty/api/v1/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': chattyApiKey,
        },
        body: JSON.stringify({
          name,
          isPrivate: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(
          `Failed to create room in CHATTY: ${response.status} ${response.statusText}. Response: ${errorText}`,
        );
        throw new BadRequestException(
          `Не удалось создать комнату в CHATTY: ${response.status} ${response.statusText}`,
        );
      }

      const data: ChattyRoomResponse = await response.json();

      if (!data || !data.id) {
        this.logger.error('Invalid response from CHATTY: missing id');
        throw new BadRequestException('Неверный ответ от сервиса CHATTY');
      }

      this.logger.log(`Room created in CHATTY with id: ${data.id}`);
      return data.id;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating room in CHATTY: ${error instanceof Error ? error.message : error}`);
      throw new BadRequestException('Ошибка при создании комнаты в CHATTY');
    }
  }

  /**
   * Создать тикет
   */
  async create(userId: number, name: string) {
    // Создаем комнату в CHATTY
    const chatId = await this.createRoom(name);

    // Сохраняем тикет в БД
    const [ticket] = await this.db
      .insert(tickets)
      .values({
        userId,
        chatId,
        isResolved: false,
        recordStatus: 'CREATED',
      })
      .returning();

    return ticket;
  }

  /**
   * Получить все тикеты пользователя
   */
  async findAll(userId: number) {
    return this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.userId, userId), ne(tickets.recordStatus, 'DELETED')));
  }
}
