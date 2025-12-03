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

    mockRedisService = {};
    mockRabbitMQService = {};

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

      const promise = service.register(registerDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователь с таким email уже существует');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when avatar generation fails', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockRejectedValue(new Error('Avatar service error'));

      const promise = service.register(registerDto);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Не удалось сгенерировать аватарку');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when avatar service returns empty result', async () => {
      mockUserService.findByEmail.mockResolvedValue(undefined);
      mockAvatarService.generateAvatar.mockResolvedValue({});

      const promise = service.register(registerDto);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Не удалось сгенерировать аватарку: сервис вернул пустой результат');
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

      const promise = service.login(loginDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw NotFoundException when password is invalid', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      
      // Мокаем bcrypt.compare для возврата false (неверный пароль)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const promise = service.login(loginDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
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

      const promise = service.refresh(refreshTokenDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Недействительный refresh token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshTokenDto.refresh_token, {
        secret: 'test-refresh-secret-key',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(undefined);

      const promise = service.refresh(refreshTokenDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
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

      const promise = service.validateToken(token);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Недействительный токен');
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret-key',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload = { email: 'ivan@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserService.findOne.mockResolvedValue(undefined);

      const promise = service.validateToken(token);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret-key',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });
  });
});

