import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCityDto {
  @ApiProperty({ description: 'Название города', example: 'Москва' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Широта', example: '55.7558' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'Долгота', example: '37.6173' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiProperty({ description: 'ID региона', example: 1 })
  @IsNumber()
  @Type(() => Number)
  regionId: number;
}

