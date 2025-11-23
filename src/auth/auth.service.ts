import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { AvatarService } from '../avatar/avatar.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private userRepository: UserRepository,
    private avatarService: AvatarService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Проверяем, существует ли пользователь
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Исключаем confirmPassword перед созданием пользователя
    const { confirmPassword, ...createUserDto } = registerDto;

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Генерируем аватарку - ожидаем ответ от сервиса, в случае ошибки возвращаем 400
    let avatarUrls: Record<number, string>;
    try {
      avatarUrls = await this.avatarService.generateAvatar();
      if (!avatarUrls || Object.keys(avatarUrls).length === 0) {
        throw new BadRequestException('Не удалось сгенерировать аватарку: сервис вернул пустой результат');
      }
      this.logger.log(`Avatar generated successfully with ${Object.keys(avatarUrls).length} sizes`);
    } catch (error) {
      this.logger.error('Failed to generate avatar:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при генерации аватарки';
      throw new BadRequestException(`Не удалось сгенерировать аватарку: ${errorMessage}`);
    }

    // Создаем пользователя через репозиторий
    await this.userRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      middleName: createUserDto.middleName,
      email: createUserDto.email,
      passwordHash,
      avatarUrls,
      role: 'USER', // По умолчанию при регистрации пользователь получает роль USER
      level: 1,
      experience: 0,
      organisationId: null, // При регистрации организация не указывается
    });
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.userService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Неверный email или пароль');
      }

      // Проверяем пароль
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверный email или пароль');
      }

      const payload = { email: user.email, sub: user.id };
      const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
      const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
      const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'your-secret-key';

      return {
        access_token: this.jwtService.sign(payload, { expiresIn: accessTokenExpiresIn }),
        refresh_token: this.jwtService.sign(payload, { 
          expiresIn: refreshTokenExpiresIn,
          secret: refreshTokenSecret,
        }),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
        },
      };
    } catch (error) {
      this.logger.error(error);
    }
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    try {
      const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = this.jwtService.verify(refreshTokenDto.refresh_token, { secret: refreshTokenSecret });
      const user = await this.userService.findOne(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      const newPayload = { email: user.email, sub: user.id };
      const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
      const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

      return {
        access_token: this.jwtService.sign(newPayload, { expiresIn: accessTokenExpiresIn }),
        refresh_token: this.jwtService.sign(newPayload, { 
          expiresIn: refreshTokenExpiresIn,
          secret: refreshTokenSecret,
        }),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Пока что просто возвращаем успешный статус
    // В будущем здесь будет логика отправки email с инструкциями
    return {
      message: 'Инструкция по восстановлению пароля отправлена на email',
    };
  }

  async validateToken(token: string): Promise<void> {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
      
      // Проверяем, существует ли пользователь
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Недействительный токен');
    }
  }
}

