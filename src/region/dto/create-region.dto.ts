import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ description: 'Название региона', example: 'Московская область' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

