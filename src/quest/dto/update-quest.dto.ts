import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsIn, IsInt, Min } from 'class-validator';

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

  @ApiProperty({ description: 'ID достижения, которое будет присвоено при завершении квеста', example: 1, required: false })
  @IsInt()
  @IsOptional()
  achievementId?: number;
}

