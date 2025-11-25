import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Токен обязателен'),
    password: z.string().min(1, 'Пароль обязателен'),
    confirmPassword: z.string().min(1, 'Подтверждение пароля обязательно'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароль и подтверждение пароля должны совпадать',
    path: ['confirmPassword'],
  });

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export class ResetPasswordDtoClass {
  @ApiProperty({ description: 'Токен восстановления пароля', example: 'abc123def456...' })
  token: string;

  @ApiProperty({ description: 'Новый пароль', example: 'newPassword123' })
  password: string;

  @ApiProperty({ description: 'Подтверждение пароля', example: 'newPassword123' })
  confirmPassword: string;
}

