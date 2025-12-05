import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { AvatarService } from '../avatar/avatar.service';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BCRYPT_SALT_ROUNDS } from '../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private userRepository: UserRepository,
    private avatarService: AvatarService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
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
    const passwordHash = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);

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
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new NotFoundException('Пользователь не найден');
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`Запрос на восстановление пароля для email: ${forgotPasswordDto.email}`);

    // Проверяем, существует ли пользователь с таким email
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Для безопасности не сообщаем, что пользователь не найден
      this.logger.warn(`Попытка восстановления пароля для несуществующего email: ${forgotPasswordDto.email}`);
      return {
        message: 'Инструкция по восстановлению пароля отправлена на email',
      };
    }

    // Генерируем уникальный токен
    const token = randomBytes(32).toString('hex');
    const date = new Date().toISOString();

    this.logger.log(`Сгенерирован токен восстановления пароля для email: ${forgotPasswordDto.email}`);

    // Сохраняем в Redis структуру с полями: token, email, date
    // Используем токен как ключ, так как он уникален
    const redisKey = `forgot-password:${token}`;
    const tokenData = {
      token,
      email: forgotPasswordDto.email,
      date,
    };

    // TTL для токена восстановления пароля (по умолчанию 1 час)
    const ttlSeconds = this.configService.get<number>('FORGOT_PASSWORD_TOKEN_TTL') || 3600;

    try {
      await this.redisService.setHash(redisKey, tokenData, ttlSeconds);
      this.logger.log(`Токен восстановления пароля сохранен в Redis: ${redisKey}, TTL: ${ttlSeconds} секунд`);
    } catch (error) {
      this.logger.error(`Ошибка при сохранении токена в Redis: ${error.message}`, error.stack);
      throw new BadRequestException('Не удалось создать токен восстановления пароля');
    }

    // Отправляем письмо через RabbitMQ
    try {
      // Формируем URL для восстановления пароля
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 
        'http://localhost:5173';
      
      // Создаем полный URL со страницей восстановления пароля и токеном
      const url = new URL(`${frontendUrl}/reset-password`);
      url.searchParams.set('token', token);
      const resetPasswordUrl = url.toString();
      
      const emailSubject = 'Восстановление пароля';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Восстановление пароля</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">Восстановление пароля</h2>
            <p>Здравствуйте!</p>
            <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
            <p>Для восстановления пароля перейдите по ссылке ниже:</p>
            <p style="margin: 30px 0;">
              <a href="${resetPasswordUrl}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Восстановить пароль
              </a>
            </p>
            <p>Или скопируйте и вставьте следующую ссылку в браузер:</p>
            <p style="word-break: break-all; color: #007bff; font-size: 12px;">${resetPasswordUrl}</p>
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              <strong>Важно:</strong> Ссылка действительна в течение ${Math.floor(ttlSeconds / 60)} минут.
            </p>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              Это автоматическое письмо, пожалуйста, не отвечайте на него.
            </p>
          </div>
        </body>
        </html>
      `;

      const emailMessage = {
        to: forgotPasswordDto.email,
        subject: emailSubject,
        html: emailHtml,
      };

      const emailSent = await this.rabbitMQService.sendToQueue(
        'email_queue',
        emailMessage,
        {
          durable: true,
          persistent: true,
        },
      );

      if (emailSent) {
        this.logger.log(`Письмо для восстановления пароля отправлено в очередь email_queue для ${forgotPasswordDto.email}`);
      } else {
        this.logger.warn(`Не удалось отправить письмо в очередь email_queue для ${forgotPasswordDto.email} - буфер полон`);
      }
    } catch (error) {
      this.logger.error(`Ошибка при отправке письма через RabbitMQ: ${error.message}`, error.stack);
      // Не прерываем выполнение, так как токен уже сохранен в Redis
      // Пользователь все равно получит сообщение об успехе
    }

    return {
      message: 'Инструкция по восстановлению пароля отправлена на email',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    this.logger.log(`Запрос на сброс пароля с токеном: ${resetPasswordDto.token.substring(0, 10)}...`);

    // Проверяем наличие токена в Redis
    const redisKey = `forgot-password:${resetPasswordDto.token}`;
    const tokenExists = await this.redisService.exists(redisKey);
    
    if (!tokenExists) {
      this.logger.warn(`Попытка сброса пароля с недействительным токеном: ${resetPasswordDto.token.substring(0, 10)}...`);
      throw new UnauthorizedException('Токен восстановления пароля недействителен или истек');
    }

    // Получаем данные токена из Redis
    const tokenData = await this.redisService.getHash(redisKey);
    if (!tokenData || !tokenData.email) {
      this.logger.error(`Не удалось получить данные токена из Redis для ключа: ${redisKey}`);
      throw new UnauthorizedException('Токен восстановления пароля недействителен');
    }

    // Находим пользователя по email из токена
    const user = await this.userService.findByEmail(tokenData.email);
    if (!user) {
      this.logger.warn(`Пользователь с email ${tokenData.email} не найден при попытке сброса пароля`);
      // Удаляем токен, так как пользователь не найден
      await this.redisService.del(redisKey);
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(resetPasswordDto.password, BCRYPT_SALT_ROUNDS);

    // Обновляем пароль пользователя
    try {
      await this.userRepository.updatePassword(user.id, passwordHash);
      this.logger.log(`Пароль успешно обновлен для пользователя с email: ${tokenData.email}`);
    } catch (error) {
      this.logger.error(`Ошибка при обновлении пароля для пользователя с email: ${tokenData.email}`, error);
      throw new BadRequestException('Не удалось обновить пароль');
    }

    // Удаляем токен из Redis после успешного обновления пароля
    try {
      await this.redisService.del(redisKey);
      this.logger.log(`Токен восстановления пароля удален из Redis: ${redisKey}`);
    } catch (error) {
      this.logger.warn(`Не удалось удалить токен из Redis: ${redisKey}`, error);
      // Не прерываем выполнение, так как пароль уже обновлен
    }

    return {
      message: 'Пароль успешно изменен',
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

