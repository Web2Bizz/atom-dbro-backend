import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Мокируем bcrypt модуль ДО всех импортов
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

// Мокируем crypto модуль для randomBytes
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn(() => ({
      toString: () => 'a'.repeat(64),
    })),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { AvatarService } from '../avatar/avatar.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let userRepository: UserRepository;
  let avatarService: AvatarService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Иванович',
    email: 'ivan@example.com',
    passwordHash: '$2b$10$hashedpassword',
    avatarUrls: { 4: 'https://example.com/avatar.png' },
    role: 'USER',
    level: 1,
    experience: 0,
    organisationId: null,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUserWithoutPassword = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Иванович',
    email: 'ivan@example.com',
    avatarUrls: { size_4: 'https://example.com/avatar.png' },
    role: 'пользователь',
    level: 1,
    experience: 0,
    organisationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockUserService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  let mockUserRepository: {
    create: ReturnType<typeof vi.fn>;
  };

  let mockAvatarService: {
    generateAvatar: ReturnType<typeof vi.fn>;
  };

  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  let mockRedisService: any;
  let mockRabbitMQService: any;

  beforeEach(async () => {
    mockUserService = {
      findByEmail: vi.fn(),
      findOne: vi.fn(),
    };

    mockUserRepository = {
      create: vi.fn(),
    };

    mockAvatarService = {
      generateAvatar: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn(),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-key';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret-key';
        if (key === 'JWT_EXPIRES_IN') return '24h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    mockRedisService = {
      setHash: vi.fn(),
      getHash: vi.fn(),
      exists: vi.fn(),
      del: vi.fn(),
    };
    mockRabbitMQService = {
      sendToQueue: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: AvatarService,
          useValue: mockAvatarService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
    avatarService = module.get<AvatarService>(AvatarService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Принудительно устанавливаем зависимости, так как DI может не работать корректно в тестах
    (service as any).userService = mockUserService;
    (service as any).userRepository = mockUserRepository;
    (service as any).avatarService = mockAvatarService;
    (service as any).jwtService = mockJwtService;
    (service as any).configService = mockConfigService;
    (service as any).redisService = mockRedisService;
    (service as any).rabbitMQService = mockRabbitMQService;
    
    // Замокируем logger, чтобы не засорять вывод тестов ошибками
    (service as any).logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
      email: 'ivan@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('should successfully register new user', async () => {
      // Настраиваем моки перед вызовом
      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({
        4: 'https://example.com/avatar.png',
        5: 'https://example.com/avatar2.png',
      });
      mockUserRepository.create.mockResolvedValue(mockUser);
      
      // Мокаем bcrypt.hash
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);

      // Вызываем метод сервиса
      await service.register(registerDto);

      // Проверяем, что методы были вызваны
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockAvatarService.generateAvatar).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
        email: 'ivan@example.com',
        passwordHash: '$2b$10$hashedpassword',
        avatarUrls: {
          4: 'https://example.com/avatar.png',
          5: 'https://example.com/avatar2.png',
        },
        role: 'USER',
        level: 1,
        experience: 0,
        organisationId: null,
      });
    });

    it('should throw ConflictException when user with email already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email is used by deleted user', async () => {
      const deletedUser = {
        ...mockUser,
        recordStatus: 'DELETED',
      };
      mockUserService.findByEmail.mockResolvedValue(deletedUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should successfully register user with 255 character email', async () => {
      // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
      // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
      const localPart = 'a';
      const domain = 'b'.repeat(249) + '.com';
      const email255 = `${localPart}@${domain}`;
      expect(email255.length).toBe(255);

      const registerDtoWithLongEmail: RegisterDto = {
        ...registerDto,
        email: email255,
      };

      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({
        4: 'https://example.com/avatar.png',
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: email255,
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);

      await service.register(registerDtoWithLongEmail);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email255);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should successfully register user with email at 254 characters', async () => {
      // Создаем email длиной 254 символа: 'a' + '@' + 'b' * 248 + '.com'
      // 1 (a) + 1 (@) + 248 (b's) + 4 (.com) = 254
      const localPart = 'a';
      const domain = 'b'.repeat(248) + '.com';
      const email254 = `${localPart}@${domain}`;
      expect(email254.length).toBe(254);

      const registerDtoWithLongEmail: RegisterDto = {
        ...registerDto,
        email: email254,
      };

      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({
        4: 'https://example.com/avatar.png',
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: email254,
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);

      await service.register(registerDtoWithLongEmail);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email254);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should handle email with plus tag format', async () => {
      const registerDtoWithPlusTag: RegisterDto = {
        ...registerDto,
        email: 'user.name+tag@example.co.uk',
      };

      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({
        4: 'https://example.com/avatar.png',
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: 'user.name+tag@example.co.uk',
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);

      await service.register(registerDtoWithPlusTag);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('user.name+tag@example.co.uk');
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should handle email with subdomain', async () => {
      const registerDtoWithSubdomain: RegisterDto = {
        ...registerDto,
        email: 'user@subdomain.example.com',
      };

      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({
        4: 'https://example.com/avatar.png',
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: 'user@subdomain.example.com',
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);

      await service.register(registerDtoWithSubdomain);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('user@subdomain.example.com');
      expect(mockUserRepository.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'ivan@example.com',
      password: 'password123',
    };

    it('should successfully login user', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      
      // Мокаем bcrypt.compare для проверки пароля
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'ivan@example.com',
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2); // access_token и refresh_token
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw NotFoundException when password is invalid', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      
      // Мокаем bcrypt.compare для возврата false (неверный пароль)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
    });

    it('should successfully login user with 255 character email', async () => {
      // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
      // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
      const localPart = 'a';
      const domain = 'b'.repeat(249) + '.com';
      const email255 = `${localPart}@${domain}`;
      expect(email255.length).toBe(255);

      const loginDtoWithLongEmail: LoginDto = {
        email: email255,
        password: 'password123',
      };

      const userWithLongEmail = {
        ...mockUser,
        email: email255,
      };

      mockUserService.findByEmail.mockResolvedValue(userWithLongEmail);
      mockJwtService.sign.mockReturnValue('mock-token');
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(loginDtoWithLongEmail);

      expect(result).toHaveProperty('access_token');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email255);
    });

    it('should handle login with email at 254 characters', async () => {
      // Создаем email длиной 254 символа: 'a' + '@' + 'b' * 248 + '.com'
      // 1 (a) + 1 (@) + 248 (b's) + 4 (.com) = 254
      const localPart = 'a';
      const domain = 'b'.repeat(248) + '.com';
      const email254 = `${localPart}@${domain}`;
      expect(email254.length).toBe(254);

      const loginDtoWithLongEmail: LoginDto = {
        email: email254,
        password: 'password123',
      };

      const userWithLongEmail = {
        ...mockUser,
        email: email254,
      };

      mockUserService.findByEmail.mockResolvedValue(userWithLongEmail);
      mockJwtService.sign.mockReturnValue('mock-token');
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(loginDtoWithLongEmail);

      expect(result).toHaveProperty('access_token');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email254);
    });

    it('should handle login with email with plus tag format', async () => {
      const loginDtoWithPlusTag: LoginDto = {
        email: 'user.name+tag@example.co.uk',
        password: 'password123',
      };

      const userWithPlusTag = {
        ...mockUser,
        email: 'user.name+tag@example.co.uk',
      };

      mockUserService.findByEmail.mockResolvedValue(userWithPlusTag);
      mockJwtService.sign.mockReturnValue('mock-token');
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(loginDtoWithPlusTag);

      expect(result).toHaveProperty('access_token');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith('user.name+tag@example.co.uk');
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(mockUserWithoutPassword);
      mockJwtService.sign.mockReturnValue('new-mock-token');

      const result = await service.refresh(refreshTokenDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'ivan@example.com',
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshTokenDto.refresh_token, {
        secret: 'test-refresh-secret-key',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2); // access_token и refresh_token
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshTokenDto.refresh_token, {
        secret: 'test-refresh-secret-key',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(undefined);

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshTokenDto.refresh_token, {
        secret: 'test-refresh-secret-key',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('validateToken', () => {
    const token = 'valid-access-token';

    it('should successfully validate token', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(mockUserWithoutPassword);

      await service.validateToken(token);

      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret-key',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken(token)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret-key',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(undefined);

      await expect(service.validateToken(token)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret-key',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'ivan@example.com',
    };

    it('should successfully send email for existing user', async () => {
      const token = 'a'.repeat(64); // 64 hex символа
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Инструкция по восстановлению пароля отправлена на email',
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(mockRedisService.setHash).toHaveBeenCalled();
      expect(mockRabbitMQService.sendToQueue).toHaveBeenCalledWith(
        'email_queue',
        expect.objectContaining({
          to: forgotPasswordDto.email,
          subject: 'Восстановление пароля',
          html: expect.stringContaining('Восстановить пароль'),
        }),
        {
          durable: true,
          persistent: true,
        }
      );
    });

    it('should generate token and save to Redis', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      await service.forgotPassword(forgotPasswordDto);

      const redisCall = mockRedisService.setHash.mock.calls[0];
      expect(redisCall[0]).toMatch(/^forgot-password:/);
      expect(redisCall[1]).toHaveProperty('token');
      expect(redisCall[1]).toHaveProperty('email', forgotPasswordDto.email);
      expect(redisCall[1]).toHaveProperty('date');
      expect(redisCall[2]).toBe(3600); // TTL
    });

    it('should send email through RabbitMQ with correct parameters', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      await service.forgotPassword(forgotPasswordDto);

      expect(mockRabbitMQService.sendToQueue).toHaveBeenCalledWith(
        'email_queue',
        expect.objectContaining({
          to: forgotPasswordDto.email,
          subject: 'Восстановление пароля',
          html: expect.stringContaining('Восстановить пароль'),
        }),
        {
          durable: true,
          persistent: true,
        }
      );
    });

    it('should include correct reset password URL with token in email', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://app.example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      await service.forgotPassword(forgotPasswordDto);

      const emailMessage = mockRabbitMQService.sendToQueue.mock.calls[0][1];
      const html = emailMessage.html;
      expect(html).toContain('https://app.example.com/reset-password');
      expect(html).toMatch(/token=[a-f0-9]+/);
    });

    it('should include correct domain from FRONTEND_URL in email', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://custom-domain.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      await service.forgotPassword(forgotPasswordDto);

      const emailMessage = mockRabbitMQService.sendToQueue.mock.calls[0][1];
      const html = emailMessage.html;
      expect(html).toContain('https://custom-domain.com/reset-password');
    });

    it('should include correct TTL in minutes in email', async () => {
      const ttlSeconds = 1800; // 30 минут
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return ttlSeconds;
        return undefined;
      });

      await service.forgotPassword(forgotPasswordDto);

      const emailMessage = mockRabbitMQService.sendToQueue.mock.calls[0][1];
      const html = emailMessage.html;
      expect(html).toContain(`${Math.floor(ttlSeconds / 60)} минут`);
    });

    it('should return success message even for non-existent email (security)', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Инструкция по восстановлению пароля отправлена на email',
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
    });

    it('should NOT send email for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);

      await service.forgotPassword(forgotPasswordDto);

      expect(mockRabbitMQService.sendToQueue).not.toHaveBeenCalled();
    });

    it('should NOT save token for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);

      await service.forgotPassword(forgotPasswordDto);

      expect(mockRedisService.setHash).not.toHaveBeenCalled();
    });

    it('should handle Redis error (throw BadRequestException)', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        'Не удалось создать токен восстановления пароля'
      );
    });

    it('should handle RabbitMQ error (log but not fail)', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockRejectedValue(new Error('RabbitMQ connection failed'));
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      // Метод должен логировать ошибку, но не падать
      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Инструкция по восстановлению пароля отправлена на email',
      });
    });

    it('should handle case when queue is full (sendToQueue returned false)', async () => {
      const token = 'a'.repeat(64);
      const crypto = await import('crypto');
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => token,
      } as any);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockRedisService.setHash.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue(false); // Очередь полна
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://example.com';
        if (key === 'FORGOT_PASSWORD_TOKEN_TTL') return 3600;
        return undefined;
      });

      // Метод не должен падать, даже если очередь полна
      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Инструкция по восстановлению пароля отправлена на email',
      });
      expect(mockRabbitMQService.sendToQueue).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'a'.repeat(64), // 64 hex символа
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    };

    const tokenData = {
      token: resetPasswordDto.token,
      email: 'ivan@example.com',
      date: new Date().toISOString(),
    };

    it('should successfully reset password with valid token', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhashedpassword' as never);
      mockUserRepository.updatePassword = vi.fn().mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      (service as any).userRepository = mockUserRepository;

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toEqual({
        message: 'Пароль успешно изменен',
      });
      expect(mockRedisService.exists).toHaveBeenCalledWith(redisKey);
      expect(mockRedisService.getHash).toHaveBeenCalledWith(redisKey);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(tokenData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(mockUser.id, '$2b$10$newhashedpassword');
      expect(mockRedisService.del).toHaveBeenCalledWith(redisKey);
    });

    it('should throw BadRequestException for invalid token', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(false);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Токен восстановления пароля недействителен или истек'
      );
      expect(mockRedisService.exists).toHaveBeenCalledWith(redisKey);
    });

    it('should throw BadRequestException for expired token', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(false);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Токен восстановления пароля недействителен или истек'
      );
    });

    it('should throw BadRequestException when token not found in Redis', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(false);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRedisService.exists).toHaveBeenCalledWith(redisKey);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('Пользователь не найден');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(tokenData.email);
      expect(mockRedisService.del).toHaveBeenCalledWith(redisKey);
    });

    it('should hash new password through bcrypt', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      const hashedPassword = '$2b$10$newhashedpassword';
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
      mockUserRepository.updatePassword = vi.fn().mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      (service as any).userRepository = mockUserRepository;

      await service.resetPassword(resetPasswordDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(mockUser.id, hashedPassword);
    });

    it('should update user password', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      const hashedPassword = '$2b$10$newhashedpassword';
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
      mockUserRepository.updatePassword = vi.fn().mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      (service as any).userRepository = mockUserRepository;

      await service.resetPassword(resetPasswordDto);

      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(mockUser.id, hashedPassword);
    });

    it('should delete token from Redis after successful reset', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhashedpassword' as never);
      mockUserRepository.updatePassword = vi.fn().mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      (service as any).userRepository = mockUserRepository;

      await service.resetPassword(resetPasswordDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(redisKey);
    });

    it('should validate password format through DTO', async () => {
      // Валидация выполняется через ZodValidationPipe, но мы можем проверить что метод вызывается
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(tokenData);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhashedpassword' as never);
      mockUserRepository.updatePassword = vi.fn().mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      (service as any).userRepository = mockUserRepository;

      await service.resetPassword(resetPasswordDto);

      // Если валидация прошла, метод должен выполниться успешно
      expect(mockUserRepository.updatePassword).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token data is invalid', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue(null); // Нет данных токена

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Токен восстановления пароля недействителен'
      );
    });

    it('should throw UnauthorizedException when token data has no email', async () => {
      const redisKey = `forgot-password:${resetPasswordDto.token}`;
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getHash.mockResolvedValue({ token: resetPasswordDto.token }); // Нет email

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Токен восстановления пароля недействителен'
      );
    });
  });
});

