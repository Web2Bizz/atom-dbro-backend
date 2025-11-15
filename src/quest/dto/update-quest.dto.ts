import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsIn, IsInt, Min, IsObject } from 'class-validator';

export class UpdateQuestDto {
  @ApiProperty({ description: 'Название квеста', example: 'Помощь бездомным', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'Описание квеста', example: 'Оказать помощь бездомным людям в вашем городе', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Статус квеста', 
    example: 'active',
    enum: ['active', 'completed', 'archived'],
    required: false
  })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'archived'])
  status?: 'active' | 'completed' | 'archived';

  @ApiProperty({ description: 'Награда опыта за выполнение квеста', example: 100, required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  experienceReward?: number;

  @ApiProperty({ 
    description: 'Требования квеста (JSON объект)', 
    example: { minLevel: 1, requiredAchievements: [1, 2] },
    required: false 
  })
  @IsObject()
  @IsOptional()
  requirements?: Record<string, any>;
}

