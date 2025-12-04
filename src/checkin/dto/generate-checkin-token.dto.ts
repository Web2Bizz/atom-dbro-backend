import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const generateCheckinTokenSchema = z.object({
  questId: z.number().int().positive('ID квеста должен быть положительным числом'),
  type: z.enum(['finance', 'material', 'contributers'], {
    message: 'Тип должен быть одним из: finance, material, contributers',
  }),
});

export type GenerateCheckinTokenDto = z.infer<typeof generateCheckinTokenSchema>;

export class GenerateCheckinTokenDtoClass {
  @ApiProperty({
    description: 'ID квеста',
    type: Number,
    example: 1,
  })
  questId: number;

  @ApiProperty({
    description: 'Тип этапа квеста',
    enum: ['finance', 'material', 'contributers'],
    example: 'finance',
  })
  type: 'finance' | 'material' | 'contributers';
}

