import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный формат email').min(1, 'Email обязателен').max(255, 'Email не должен превышать 255 символов'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export class ForgotPasswordDtoClass {
  @ApiProperty({ description: 'Email для восстановления пароля', example: 'ivan@example.com' })
  email: string;
}

