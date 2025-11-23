import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateUserSchema = z.object({
  firstName: z.string().max(255, 'Имя не должно превышать 255 символов').optional(),
  lastName: z.string().max(255, 'Фамилия не должна превышать 255 символов').optional(),
  middleName: z.string().max(255, 'Отчество не должно превышать 255 символов').optional(),
  email: z.string().email('Некорректный формат email').optional(),
  avatarUrls: z
    .any()
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === null) return true;
        if (typeof val !== 'object' || Array.isArray(val)) return false;
        // Проверяем, что все ключи имеют формат "size_<число>", а значения - строки
        for (const [key, value] of Object.entries(val)) {
          if (typeof key !== 'string' || !key.startsWith('size_')) {
            return false;
          }
          const numPart = key.replace('size_', '');
          const numKey = Number(numPart);
          if (isNaN(numKey) || typeof value !== 'string') {
            return false;
          }
        }
        return true;
      },
      {
        message: 'avatarUrls должен быть объектом с ключами вида "size_4", "size_5" и т.д., и строковыми значениями (URL)',
      }
    )
    .transform((val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== 'object' || Array.isArray(val)) return undefined;
      // Преобразуем ключи вида "size_4" в числовые ключи
      const result: Record<number, string> = {};
      for (const [key, value] of Object.entries(val)) {
        if (typeof key === 'string' && key.startsWith('size_')) {
          const numPart = key.replace('size_', '');
          const numKey = Number(numPart);
          if (!isNaN(numKey) && typeof value === 'string') {
            result[numKey] = value;
          }
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }),
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
    description: 'URL аватарок. Ключи должны быть в формате "size_4", "size_5" и т.д. При обновлении будет преобразован в формат с числовыми ключами 4-9', 
    example: { size_4: 'https://example.com/avatar.png', size_5: 'https://example.com/avatar.png', size_6: 'https://example.com/avatar.png', size_7: 'https://example.com/avatar.png', size_8: 'https://example.com/avatar.png', size_9: 'https://example.com/avatar.png' }, 
    required: false 
  })
  avatarUrls?: Record<string, string>;

  @ApiProperty({ description: 'ID организации', example: 1, required: false, nullable: true })
  organisationId?: number | null;
}

