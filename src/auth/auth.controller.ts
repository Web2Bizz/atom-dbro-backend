import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema, RegisterDtoClass } from './dto/register.dto';
import { LoginDto, loginSchema, LoginDtoClass } from './dto/login.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @ZodValidation(registerSchema)
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiBody({ type: RegisterDtoClass })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован', type: RegisterDtoClass })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 409, description: 'Пользователь с таким email уже существует' })
  async register(@Body() registerDto: RegisterDto): Promise<void> {
    await this.authService.register(registerDto);
  }

  @Post('login')
  @ZodValidation(loginSchema)
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiBody({ type: LoginDtoClass })
  @ApiResponse({ status: 200, description: 'Успешный вход', type: LoginDtoClass })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

