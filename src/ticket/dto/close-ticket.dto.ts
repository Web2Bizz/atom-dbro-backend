import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const closeTicketSchema = z.object({
  id: z.number().int().positive('ID тикета должен быть положительным числом'),
});

export type CloseTicketDto = z.infer<typeof closeTicketSchema>;

export class CloseTicketDtoClass {
  @ApiProperty({ description: 'ID тикета для закрытия', example: 1 })
  id: number;
}

