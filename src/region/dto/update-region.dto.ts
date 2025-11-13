import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateRegionDto {
  @ApiProperty({ description: 'Название региона', example: 'Московская область', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}

