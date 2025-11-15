import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateAchievementDto {
  @ApiProperty({ description: 'Название достижения', example: 'Первая помощь' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Описание достижения', example: 'Оказать первую помощь нуждающемуся', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Иконка достижения', example: 'medal-icon.svg', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  icon?: string;

  @ApiProperty({ 
    description: 'Редкость достижения', 
    example: 'common',
    enum: ['common', 'epic', 'rare', 'legendary', 'private']
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['common', 'epic', 'rare', 'legendary', 'private'])
  rarity: 'common' | 'epic' | 'rare' | 'legendary' | 'private';
}

