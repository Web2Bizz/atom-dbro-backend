import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateHelpTypeDto {
  @ApiProperty({ description: 'Название вида помощи', example: 'Материальная помощь' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

