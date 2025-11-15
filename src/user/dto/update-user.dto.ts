import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateUserSchema = z.object({
  firstName: z.string().max(255, 'Имя не должно превышать 255 символов').optional(),
  lastName: z.string().max(255, 'Фамилия не должна превышать 255 символов').optional(),
  middleName: z.string().max(255, 'Отчество не должно превышать 255 символов').optional(),
  email: z.string().email('Некорректный формат email').optional(),
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
}

