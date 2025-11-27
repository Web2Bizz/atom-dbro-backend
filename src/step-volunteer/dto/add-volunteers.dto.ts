import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const addVolunteersSchema = z.object({
  userIds: z.array(z.number().int().positive('ID пользователя должен быть положительным целым числом'))
    .min(1, 'Необходимо указать хотя бы одного пользователя')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'ID пользователей должны быть уникальными',
    }),
});

export type AddVolunteersDto = z.infer<typeof addVolunteersSchema>;

export class AddVolunteersDtoClass {
  @ApiProperty({
    description: 'Массив ID пользователей для добавления в этап',
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  userIds: number[];
}

