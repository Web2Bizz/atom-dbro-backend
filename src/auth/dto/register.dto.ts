import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({ description: 'Имя', example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({ description: 'Фамилия', example: 'Иванов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiProperty({ description: 'Отчество', example: 'Иванович', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  middleName?: string;

  @ApiProperty({ description: 'Email', example: 'ivan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Пароль', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Подтверждение пароля', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'Пароль и подтверждение пароля должны совпадать' })
  confirmPassword: string;
}

