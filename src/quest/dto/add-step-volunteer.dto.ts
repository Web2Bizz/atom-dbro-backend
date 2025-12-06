import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const addStepVolunteerSchema = z.object({
  contributeValue: z.number().int().min(0, 'Значение вклада должно быть неотрицательным числом'),
  isInkognito: z.boolean().optional().default(false),
});

export type AddStepVolunteerDto = z.infer<typeof addStepVolunteerSchema>;

export class AddStepVolunteerDtoClass {
  @ApiProperty({
    description: 'Значение вклада пользователя в этап квеста',
    example: 1000,
    minimum: 0,
  })
  contributeValue: number;

  @ApiProperty({
    description: 'Флаг инкогнито (скрыть имя пользователя)',
    example: false,
    default: false,
    required: false,
  })
  isInkognito?: boolean;
}

