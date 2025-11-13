import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AddOwnerDto {
  @ApiProperty({ description: 'ID пользователя', example: 1 })
  @IsNumber()
  @Type(() => Number)
  userId: number;
}

