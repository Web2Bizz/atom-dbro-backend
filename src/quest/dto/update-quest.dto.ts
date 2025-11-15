import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const updateQuestSchema = z.object({
  title: z.string().max(255, 'Название не должно превышать 255 символов').optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  experienceReward: z.number().int().min(0, 'Награда опыта должна быть неотрицательным числом').optional(),
  achievementId: z.number().int().positive('ID достижения должен быть положительным целым числом').optional(),
});

export type UpdateQuestDto = z.infer<typeof updateQuestSchema>;

export class UpdateQuestDtoClass {
  @ApiProperty({ description: 'Название квеста', example: 'Помощь бездомным', required: false })
  title?: string;

  @ApiProperty({ description: 'Описание квеста', example: 'Оказать помощь бездомным людям в вашем городе', required: false })
  description?: string;

  @ApiProperty({ 
    description: 'Статус квеста', 
    example: 'active',
    enum: ['active', 'completed', 'archived'],
    required: false
  })
  status?: 'active' | 'completed' | 'archived';

  @ApiProperty({ description: 'Награда опыта за выполнение квеста', example: 100, required: false })
  experienceReward?: number;

  @ApiProperty({ description: 'ID достижения, которое будет присвоено при завершении квеста', example: 1, required: false })
  achievementId?: number;
}

