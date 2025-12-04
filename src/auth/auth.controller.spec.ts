import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto, registerSchema } from './dto/register.dto';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, forgotPasswordSchema } from './dto/forgot-password.dto';

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

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
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

      await expect(controller.login(loginDto)).rejects.toThrow(NotFoundException);
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

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockService.refresh).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should throw UnauthorizedException when user does not exist (401)', async () => {
      mockService.refresh.mockRejectedValue(
        new UnauthorizedException('Пользователь не найден')
      );

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
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

  describe('email validation', () => {
    describe('register schema validation', () => {
      const validBaseData = {
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
        password: 'password123',
        confirmPassword: 'password123',
      };

      it('should accept valid email format', () => {
        const validData = { ...validBaseData, email: 'ivan@example.com' };
        expect(() => registerSchema.parse(validData)).not.toThrow();
      });

      it('should accept email with subdomain', () => {
        const validData = { ...validBaseData, email: 'user@subdomain.example.com' };
        expect(() => registerSchema.parse(validData)).not.toThrow();
      });

      it('should accept email with plus tag', () => {
        const validData = { ...validBaseData, email: 'user.name+tag@example.co.uk' };
        expect(() => registerSchema.parse(validData)).not.toThrow();
      });

      it('should reject email without @ symbol', () => {
        const invalidData = { ...validBaseData, email: 'invalidemail.com' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject email without domain', () => {
        const invalidData = { ...validBaseData, email: 'user@' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject email without local part', () => {
        const invalidData = { ...validBaseData, email: '@example.com' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject email with spaces', () => {
        const invalidData = { ...validBaseData, email: 'user @example.com' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject email with invalid domain format', () => {
        const invalidData = { ...validBaseData, email: 'user@example' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject email ending with dot', () => {
        const invalidData = { ...validBaseData, email: 'user@example.' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty email string', () => {
        const invalidData = { ...validBaseData, email: '' };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });

      it('should accept email with 255 characters', () => {
        // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
        // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
        const localPart = 'a';
        const domain = 'b'.repeat(249) + '.com';
        const email255 = `${localPart}@${domain}`;
        expect(email255.length).toBe(255);
        const validData = { ...validBaseData, email: email255 };
        expect(() => registerSchema.parse(validData)).not.toThrow();
      });

      it('should reject email with 256 characters', () => {
        // Создаем email длиной 256 символов: 'a' + '@' + 'b' * 250 + '.com'
        // 1 (a) + 1 (@) + 250 (b's) + 4 (.com) = 256
        const localPart = 'a';
        const domain = 'b'.repeat(250) + '.com';
        const email256 = `${localPart}@${domain}`;
        expect(email256.length).toBe(256);
        const invalidData = { ...validBaseData, email: email256 };
        expect(() => registerSchema.parse(invalidData)).toThrow();
      });
    });

    describe('login schema validation', () => {
      const validBaseData = {
        password: 'password123',
      };

      it('should accept valid email format', () => {
        const validData = { ...validBaseData, email: 'ivan@example.com' };
        expect(() => loginSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid email format', () => {
        const invalidData = { ...validBaseData, email: 'invalid' };
        expect(() => loginSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty email string', () => {
        const invalidData = { ...validBaseData, email: '' };
        expect(() => loginSchema.parse(invalidData)).toThrow();
      });

      it('should accept email with 255 characters', () => {
        // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
        // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
        const localPart = 'a';
        const domain = 'b'.repeat(249) + '.com';
        const email255 = `${localPart}@${domain}`;
        expect(email255.length).toBe(255);
        const validData = { ...validBaseData, email: email255 };
        expect(() => loginSchema.parse(validData)).not.toThrow();
      });

      it('should reject email with 256 characters', () => {
        // Создаем email длиной 256 символов: 'a' + '@' + 'b' * 250 + '.com'
        // 1 (a) + 1 (@) + 250 (b's) + 4 (.com) = 256
        const localPart = 'a';
        const domain = 'b'.repeat(250) + '.com';
        const email256 = `${localPart}@${domain}`;
        expect(email256.length).toBe(256);
        const invalidData = { ...validBaseData, email: email256 };
        expect(() => loginSchema.parse(invalidData)).toThrow();
      });
    });

    describe('forgotPassword schema validation', () => {
      it('should accept valid email format', () => {
        const validData = { email: 'ivan@example.com' };
        expect(() => forgotPasswordSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid email format', () => {
        const invalidData = { email: 'invalid' };
        expect(() => forgotPasswordSchema.parse(invalidData)).toThrow();
      });

      it('should reject empty email string', () => {
        const invalidData = { email: '' };
        expect(() => forgotPasswordSchema.parse(invalidData)).toThrow();
      });

      it('should accept email with 255 characters', () => {
        // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
        // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
        const localPart = 'a';
        const domain = 'b'.repeat(249) + '.com';
        const email255 = `${localPart}@${domain}`;
        expect(email255.length).toBe(255);
        const validData = { email: email255 };
        expect(() => forgotPasswordSchema.parse(validData)).not.toThrow();
      });

      it('should reject email with 256 characters', () => {
        // Создаем email длиной 256 символов: 'a' + '@' + 'b' * 250 + '.com'
        // 1 (a) + 1 (@) + 250 (b's) + 4 (.com) = 256
        const localPart = 'a';
        const domain = 'b'.repeat(250) + '.com';
        const email256 = `${localPart}@${domain}`;
        expect(email256.length).toBe(256);
        const invalidData = { email: email256 };
        expect(() => forgotPasswordSchema.parse(invalidData)).toThrow();
      });
    });
  });
});

