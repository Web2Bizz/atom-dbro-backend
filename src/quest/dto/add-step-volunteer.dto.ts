import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const addStepVolunteerSchema = z.object({
  contributeValue: z.number().int().min(0, 'Значение вклада должно быть неотрицательным числом'),
});

export type AddStepVolunteerDto = z.infer<typeof addStepVolunteerSchema>;

export class AddStepVolunteerDtoClass {
  @ApiProperty({
    description: 'Значение вклада пользователя в этап квеста',
    example: 1000,
    minimum: 0,
  })
  contributeValue: number;
}

