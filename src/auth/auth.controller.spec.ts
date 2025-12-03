import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockLoginResponse = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: {
      id: 1,
      email: 'ivan@example.com',
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
    },
  };

  const mockRefreshResponse = {
    access_token: 'new-mock-access-token',
    refresh_token: 'new-mock-refresh-token',
    user: {
      id: 1,
      email: 'ivan@example.com',
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
    },
  };

  let mockService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    validateToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      register: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      validateToken: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    
    // Принудительно устанавливаем зависимости
    (controller as any).authService = mockService;
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

    it('should successfully register user without session (201)', async () => {
      mockService.register.mockResolvedValue(undefined);

      await controller.register(registerDto);

      expect(mockService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw ConflictException when user with email already exists (409)', async () => {
      mockService.register.mockRejectedValue(
        new ConflictException('Пользователь с таким email уже существует')
      );

      const promise = controller.register(registerDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователь с таким email уже существует');
      expect(mockService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'ivan@example.com',
      password: 'password123',
    };

    it('should successfully login user without session (200)', async () => {
      mockService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(mockService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw NotFoundException when user does not exist (404)', async () => {
      mockService.login.mockRejectedValue(
        new NotFoundException('Пользователь не найден')
      );

      const promise = controller.login(loginDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
      expect(mockService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw NotFoundException when password is invalid (404)', async () => {
      mockService.login.mockRejectedValue(
        new NotFoundException('Пользователь не найден')
      );

      const promise = controller.login(loginDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should successfully refresh tokens with valid refresh token (200)', async () => {
      mockService.refresh.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(mockRefreshResponse);
      expect(mockService.refresh).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should throw UnauthorizedException when refresh token is invalid (401)', async () => {
      mockService.refresh.mockRejectedValue(
        new UnauthorizedException('Недействительный refresh token')
      );

      const promise = controller.refresh(refreshTokenDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Недействительный refresh token');
      expect(mockService.refresh).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should throw UnauthorizedException when user does not exist (401)', async () => {
      mockService.refresh.mockRejectedValue(
        new UnauthorizedException('Пользователь не найден')
      );

      const promise = controller.refresh(refreshTokenDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Пользователь не найден');
      expect(mockService.refresh).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('validateToken', () => {
    it('should successfully validate token with session (200)', async () => {
      // validateToken в контроллере просто возвращает сообщение, не вызывая сервис
      // Но для полноты тестирования проверим, что endpoint доступен
      const result = await controller.validateToken();

      expect(result).toEqual({ message: 'Токен валиден' });
      // Примечание: JwtAuthGuard проверяется на уровне NestJS guards,
      // в unit-тестах контроллера мы не тестируем guards напрямую
    });

    // Примечание: Проверка JwtAuthGuard должна выполняться в интеграционных тестах
    // или отдельно. В unit-тестах контроллера мы проверяем только логику контроллера.
  });
});

