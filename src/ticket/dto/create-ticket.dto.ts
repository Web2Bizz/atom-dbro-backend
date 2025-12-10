import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const createTicketSchema = z.object({
  name: z.string().min(1, 'Название тикета обязательно').max(255, 'Название не должно превышать 255 символов'),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;

export class CreateTicketDtoClass {
  @ApiProperty({ description: 'Название тикета (тема)', example: 'Проблема с авторизацией' })
  name: string;
}

