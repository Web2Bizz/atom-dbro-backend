import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateHelpTypeDto {
  @ApiProperty({ description: 'Название вида помощи', example: 'Материальная помощь', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}

