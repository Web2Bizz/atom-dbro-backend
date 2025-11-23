import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token обязателен').optional(),
});

export type ValidateTokenDto = z.infer<typeof validateTokenSchema>;

export class ValidateTokenDtoClass {
  @ApiProperty({ 
    description: 'JWT токен для валидации (опционально, если не указан, будет использован токен из заголовка Authorization)', 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  token?: string;
}

