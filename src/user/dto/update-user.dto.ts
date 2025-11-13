import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiProperty({ description: 'Имя', example: 'Иван', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName?: string;

  @ApiProperty({ description: 'Фамилия', example: 'Иванов', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiProperty({ description: 'Отчество', example: 'Иванович', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  middleName?: string;

  @ApiProperty({ description: 'Email', example: 'ivan@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'ID города', example: 1, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  cityId?: number;
}

