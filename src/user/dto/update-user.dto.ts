import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateUserSchema = z.object({
  firstName: z.string().max(255, 'Имя не должно превышать 255 символов').optional(),
  lastName: z.string().max(255, 'Фамилия не должна превышать 255 символов').optional(),
  middleName: z.string().max(255, 'Отчество не должно превышать 255 символов').optional(),
  email: z.string().email('Некорректный формат email').max(255, 'Email не должен превышать 255 символов').optional(),
  avatarUrls: z
    .record(z.string(), z.string())
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === null) return true;
        // Проверяем, что все ключи имеют формат "size_<число>"
        for (const key of Object.keys(val)) {
          if (!key.startsWith('size_')) {
            return false;
          }
          const numPart = key.replace('size_', '');
          const numKey = Number(numPart);
          if (isNaN(numKey)) {
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
      // Преобразуем ключи вида "size_4" в числовые ключи для совместимости с БД
      const result: Record<number, string> = {};
      for (const [key, value] of Object.entries(val)) {
        if (key.startsWith('size_')) {
          const numPart = key.replace('size_', '');
          const numKey = Number(numPart);
          if (!isNaN(numKey)) {
            result[numKey] = value;
          }
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }),
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
    description: 'URL аватарок. Ключи должны быть в формате "size_4", "size_5" и т.д. При сохранении преобразуются в числовые ключи 4, 5, 6 и т.д.', 
    example: { size_4: 'https://example.com/avatar.png', size_5: 'https://example.com/avatar.png', size_6: 'https://example.com/avatar.png', size_7: 'https://example.com/avatar.png', size_8: 'https://example.com/avatar.png', size_9: 'https://example.com/avatar.png' }, 
    required: false 
  })
  avatarUrls?: Record<string, string>;

}

