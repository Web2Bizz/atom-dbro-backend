import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateUserSchema = z.object({
  firstName: z.string().max(255, 'Имя не должно превышать 255 символов').optional(),
  lastName: z.string().max(255, 'Фамилия не должна превышать 255 символов').optional(),
  middleName: z.string().max(255, 'Отчество не должно превышать 255 символов').optional(),
  email: z.string().email('Некорректный формат email').optional(),
  avatarUrls: z.record(z.number(), z.string()).optional(),
  questId: z.number().int().positive('ID квеста должен быть положительным числом').nullable().optional(),
  organisationId: z.number().int().positive('ID организации должен быть положительным числом').nullable().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export class UpdateUserDtoClass {
  @ApiProperty({ description: 'Имя', example: 'Иван', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Фамилия', example: 'Иванов', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Отчество', example: 'Иванович', required: false })
  middleName?: string;

  @ApiProperty({ description: 'Email', example: 'ivan@example.com', required: false })
  email?: string;

  @ApiProperty({ 
    description: 'URL аватарок (объект с ключами-числами и значениями-строками)', 
    example: { 1: 'https://example.com/avatar1.png', 2: 'https://example.com/avatar2.png' }, 
    required: false 
  })
  avatarUrls?: Record<number, string>;

  @ApiProperty({ description: 'ID квеста', example: 1, required: false, nullable: true })
  questId?: number | null;

  @ApiProperty({ description: 'ID организации', example: 1, required: false, nullable: true })
  organisationId?: number | null;
}

