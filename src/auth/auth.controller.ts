import { Controller, Post, Body, HttpCode, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema, RegisterDtoClass } from './dto/register.dto';
import { LoginDto, loginSchema, LoginDtoClass } from './dto/login.dto';
import { RefreshTokenDto, refreshTokenSchema, RefreshTokenDtoClass } from './dto/refresh-token.dto';
import { ForgotPasswordDto, forgotPasswordSchema, ForgotPasswordDtoClass } from './dto/forgot-password.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

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

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ZodValidation(refreshTokenSchema)
  @ApiOperation({ summary: 'Обновить access token используя refresh token (требуется валидный refresh token в body)' })
  @ApiBody({ type: RefreshTokenDtoClass })
  @ApiResponse({ status: 200, description: 'Токены успешно обновлены', type: RefreshTokenDtoClass })
  @ApiResponse({ status: 401, description: 'Недействительный refresh token или refresh token не предоставлен' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('forgot-password')
  @Version('1')
  @ZodValidation(forgotPasswordSchema)
  @ApiOperation({ summary: 'Восстановление пароля' })
  @ApiBody({ type: ForgotPasswordDtoClass })
  @ApiResponse({ 
    status: 200, 
    description: 'Инструкция по восстановлению пароля отправлена на email',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Инструкция по восстановлению пароля отправлена на email',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
}

