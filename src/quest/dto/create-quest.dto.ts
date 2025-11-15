import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateAchievementForQuestDto {
  @ApiProperty({ description: 'Название достижения', example: 'Помощник бездомным' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Описание достижения', example: 'Помог бездомным людям', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Иконка достижения', example: 'medal-icon.svg', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  icon?: string;
}

export class CreateQuestDto {
  @ApiProperty({ description: 'Название квеста', example: 'Помощь бездомным' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Описание квеста', example: 'Оказать помощь бездомным людям в вашем городе', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Статус квеста', 
    example: 'active',
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'archived'])
  status?: 'active' | 'completed' | 'archived';

  @ApiProperty({ description: 'Награда опыта за выполнение квеста', example: 100, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  experienceReward?: number;

  @ApiProperty({ 
    description: 'Данные для создания достижения, которое будет присвоено при завершении квеста. Достижение автоматически получит rarity = "private" и будет привязано к квесту.',
    type: CreateAchievementForQuestDto,
    required: false
  })
  @ValidateNested()
  @Type(() => CreateAchievementForQuestDto)
  @IsOptional()
  achievement?: CreateAchievementForQuestDto;
}

