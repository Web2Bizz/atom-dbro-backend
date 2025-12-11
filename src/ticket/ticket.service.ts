import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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
      this.logger.error('CHATTY configuration is missing: CHATTY_URL or CHATTY_API_KEY is not set');
      throw new BadRequestException('Конфигурация CHATTY не настроена');
    }

    const requestUrl = `${chattyUrl}/chatty/api/v1/rooms`;
    this.logger.log(`Attempting to create room in CHATTY. Name: "${name}", URL: ${requestUrl}`);

    try {
      const response = await fetch(requestUrl, {
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
          `Failed to create room in CHATTY. Status: ${response.status} ${response.statusText}, ` +
            `Name: "${name}", URL: ${requestUrl}, Response: ${errorText}`,
        );
        throw new BadRequestException(
          `Не удалось создать комнату в CHATTY: ${response.status} ${response.statusText}`,
        );
      }

      const data: ChattyRoomResponse = await response.json();

      if (!data || !data.id) {
        this.logger.error(
          `Invalid response from CHATTY: missing id. Name: "${name}", Response: ${JSON.stringify(data)}`,
        );
        throw new BadRequestException('Неверный ответ от сервиса CHATTY: отсутствует идентификатор комнаты');
      }

      this.logger.log(`Room created successfully in CHATTY. Name: "${name}", Room ID: ${data.id}`);
      return data.id;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error creating room in CHATTY. Name: "${name}", URL: ${requestUrl}, ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Ошибка при создании комнаты в CHATTY');
    }
  }

  /**
   * Создать тикет
   */
  async create(userId: number, name: string) {
    this.logger.log(`Creating ticket for user ${userId} with name: "${name}"`);

    try {
      // Создаем комнату в CHATTY
      const chatId = await this.createRoom(name);
      this.logger.log(`Room created in CHATTY with ID: ${chatId} for user ${userId}`);

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

      this.logger.log(
        `Ticket created successfully. Ticket ID: ${ticket.id}, User ID: ${userId}, Chat ID: ${chatId}`,
      );

      return ticket;
    } catch (error) {
      this.logger.error(
        `Failed to create ticket for user ${userId} with name: "${name}". ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
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

  /**
   * Закрыть тикет
   */
  async close(userId: number, ticketId: number) {
    this.logger.log(`Closing ticket ${ticketId} for user ${userId}`);

    try {
      // Проверяем, что тикет существует и принадлежит пользователю
      const [ticket] = await this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.id, ticketId),
            eq(tickets.userId, userId),
            ne(tickets.recordStatus, 'DELETED'),
          ),
        )
        .limit(1);

      if (!ticket) {
        this.logger.warn(`Ticket ${ticketId} not found or does not belong to user ${userId}`);
        throw new NotFoundException(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`);
      }

      // Обновляем статус тикета
      const [updatedTicket] = await this.db
        .update(tickets)
        .set({ isResolved: true, updatedAt: new Date() })
        .where(eq(tickets.id, ticketId))
        .returning();

      this.logger.log(`Ticket ${ticketId} closed successfully for user ${userId}`);

      return updatedTicket;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to close ticket ${ticketId} for user ${userId}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
