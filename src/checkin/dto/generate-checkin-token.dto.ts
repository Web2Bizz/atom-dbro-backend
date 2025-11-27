import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const generateCheckinTokenSchema = z.object({
  questId: z.number().int().positive('ID квеста должен быть положительным числом'),
  type: z.enum(['no_required', 'finance', 'contributers', 'material'], {
    errorMap: () => ({ message: 'Тип должен быть одним из: no_required, finance, contributers, material' }),
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
    enum: ['no_required', 'finance', 'contributers', 'material'],
    example: 'contributers',
  })
  type: 'no_required' | 'finance' | 'contributers' | 'material';
}

