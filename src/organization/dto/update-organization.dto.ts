import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrganizationDto {
  @ApiProperty({ description: 'Название организации', example: 'Благотворительный фонд', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Широта', example: '55.7558', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Долгота', example: '37.6173', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  longitude?: number;
}

