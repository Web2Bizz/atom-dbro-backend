import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  let mockReflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };

  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };

    // Мокаем ExecutionContext
    mockExecutionContext = {
      getHandler: vi.fn(() => ({} as any)),
      getClass: vi.fn(() => ({} as any)),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
      getArgByIndex: vi.fn(),
      getArgs: vi.fn(),
      getRequest: vi.fn(),
      getResponse: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    
    (guard as any).reflector = mockReflector;
  });

  describe('canActivate', () => {
    it('should require authorization for protected endpoints (applied via @UseGuards on method)', async () => {
      // Когда нет @Public(), guard должен вызывать родительский canActivate
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      // Мокируем родительский метод canActivate
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when token is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      // Мокируем родительский метод canActivate, чтобы он выбросил ошибку
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockRejectedValue(new UnauthorizedException('Требуется авторизация'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockRejectedValue(new UnauthorizedException('Недействительный токен'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockRejectedValue(new UnauthorizedException('Токен истек'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should return user from token on successful authorization', async () => {
      const mockUser = { userId: 1, email: 'user@example.com' };
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should correctly handle token validation errors', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      const parentCanActivate = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      const validationError = new Error('Token validation failed');
      parentCanActivate.mockRejectedValue(validationError);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(Error);
    });
  });

  describe('handleRequest', () => {
    it('should require authorization for protected endpoints', () => {
      const mockUser = { userId: 1, email: 'user@example.com' };
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.handleRequest(null, mockUser, null, mockExecutionContext);

      expect(result).toEqual(mockUser);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should throw UnauthorizedException when token is missing', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.handleRequest(null, null, null, mockExecutionContext)).toThrow(
        UnauthorizedException
      );
      expect(() => guard.handleRequest(null, null, null, mockExecutionContext)).toThrow(
        'Требуется авторизация'
      );
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      const error = new Error('Invalid token');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.handleRequest(error, null, null, mockExecutionContext)).toThrow(Error);
    });

    it('should throw UnauthorizedException when token is expired', () => {
      const error = new Error('Token expired');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.handleRequest(error, null, null, mockExecutionContext)).toThrow(Error);
    });

    it('should return user from token on successful authorization', () => {
      const mockUser = { userId: 1, email: 'user@example.com' };
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.handleRequest(null, mockUser, null, mockExecutionContext);

      expect(result).toEqual(mockUser);
    });

    it('should correctly handle token validation errors', () => {
      const validationError = new Error('Token validation failed');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.handleRequest(validationError, null, null, mockExecutionContext)).toThrow(Error);
    });

    it('should throw UnauthorizedException when error exists but no user', () => {
      const error = new UnauthorizedException('Custom error');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.handleRequest(error, null, null, mockExecutionContext)).toThrow(
        UnauthorizedException
      );
    });
  });
});

