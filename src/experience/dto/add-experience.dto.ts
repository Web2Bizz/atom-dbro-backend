import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddExperienceDto {
  @ApiProperty({ description: 'Количество опыта для добавления', example: 100, minimum: 1 })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

