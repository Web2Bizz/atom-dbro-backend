import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const createAchievementForQuestSchema = z.object({
  title: z.string().min(1, 'Название достижения обязательно').max(255, 'Название не должно превышать 255 символов'),
  description: z.string().optional(),
  icon: z.string().max(255, 'Иконка не должна превышать 255 символов').optional(),
});

export type CreateAchievementForQuestDto = z.infer<typeof createAchievementForQuestSchema>;

export class CreateAchievementForQuestDtoClass {
  @ApiProperty({ description: 'Название достижения', example: 'Помощник бездомным' })
  title: string;

  @ApiProperty({ description: 'Описание достижения', example: 'Помог бездомным людям', required: false })
  description?: string;

  @ApiProperty({ description: 'Иконка достижения', example: 'medal-icon.svg', required: false })
  icon?: string;
}

export const createQuestSchema = z.object({
  title: z.string().min(1, 'Название квеста обязательно').max(255, 'Название не должно превышать 255 символов'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  experienceReward: z.number().int().min(0, 'Награда опыта должна быть неотрицательным числом').optional(),
  achievement: createAchievementForQuestSchema.optional(),
});

export type CreateQuestDto = z.infer<typeof createQuestSchema>;

export class CreateQuestDtoClass {
  @ApiProperty({ description: 'Название квеста', example: 'Помощь бездомным' })
  title: string;

  @ApiProperty({ description: 'Описание квеста', example: 'Оказать помощь бездомным людям в вашем городе', required: false })
  description?: string;

  @ApiProperty({ 
    description: 'Статус квеста', 
    example: 'active',
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  })
  status?: 'active' | 'completed' | 'archived';

  @ApiProperty({ description: 'Награда опыта за выполнение квеста', example: 100, default: 0 })
  experienceReward?: number;

  @ApiProperty({ 
    description: 'Данные для создания достижения, которое будет присвоено при завершении квеста. Достижение автоматически получит rarity = "private" и будет привязано к квесту.',
    type: CreateAchievementForQuestDtoClass,
    required: false
  })
  achievement?: CreateAchievementForQuestDtoClass;
}

