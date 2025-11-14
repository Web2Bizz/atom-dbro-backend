import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, MaxLength, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Название организации', example: 'Благотворительный фонд' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'ID города', example: 1 })
  @IsInt()
  @Type(() => Number)
  cityId: number;

  @ApiProperty({ description: 'Широта (опционально, если не указана, будет взята из города)', example: '55.7558', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Долгота (опционально, если не указана, будет взята из города)', example: '37.6173', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  longitude?: number;
}

