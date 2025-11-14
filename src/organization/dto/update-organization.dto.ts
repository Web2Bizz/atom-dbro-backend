import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContactDto } from './create-organization.dto';

export class UpdateOrganizationDto {
  @ApiProperty({ description: 'Название организации', example: 'Благотворительный фонд', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'ID города', example: 1, required: false })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  cityId?: number;

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

  @ApiProperty({ description: 'Краткое описание', example: 'Благотворительный фонд помощи детям', required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ description: 'Миссия организации', example: 'Помощь детям из малообеспеченных семей', required: false })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiProperty({ description: 'Полное описание организации', example: 'Наша организация занимается...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Цели организации', example: ['Цель 1', 'Цель 2'], required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[];

  @ApiProperty({ description: 'Потребности организации', example: ['Нужда 1', 'Нужда 2'], required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  needs?: string[];

  @ApiProperty({ description: 'Адрес организации', example: 'г. Москва, ул. Примерная, д. 1', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Контакты организации', example: [{ name: 'Телефон', value: '+7 (999) 123-45-67' }], required: false, type: [ContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @IsOptional()
  contacts?: ContactDto[];
}

