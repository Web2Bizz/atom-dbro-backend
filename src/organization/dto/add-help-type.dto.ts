import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AddHelpTypeDto {
  @ApiProperty({ description: 'ID вида помощи', example: 1 })
  @IsNumber()
  @Type(() => Number)
  helpTypeId: number;
}

