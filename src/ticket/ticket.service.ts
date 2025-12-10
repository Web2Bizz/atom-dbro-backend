import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tickets } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';

@Injectable()
export class TicketService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(userId: number, chatId: string) {
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

  async findAll(userId: number) {
    return this.db
      .select()
      .from(tickets)
      .where(and(
        eq(tickets.userId, userId),
        ne(tickets.recordStatus, 'DELETED')
      ));
  }
}

