import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const createTicketSchema = z.object({
  chatId: z.string().min(1, 'chatId обязателен').max(255, 'chatId не должен превышать 255 символов'),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;

export class CreateTicketDtoClass {
  @ApiProperty({ description: 'Идентификатор чата', example: 'chat-123' })
  chatId: string;
}

