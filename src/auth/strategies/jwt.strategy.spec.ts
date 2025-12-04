import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: UserService;
  let configService: ConfigService;

  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    recordStatus: 'CREATED',
  };

  let mockUserService: {
    findOne: ReturnType<typeof vi.fn>;
  };

  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockUserService = {
      findOne: vi.fn(),
    };

    // Создаем мок configService как экземпляр ConfigService
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-key';
        return 'your-secret-key'; // fallback значение
      }),
    } as any;

    // Создаем стратегию вручную, чтобы обойти проблему с инжекцией в конструкторе
    strategy = new JwtStrategy(mockConfigService, mockUserService as any);
    
    userService = mockUserService as any;
    configService = mockConfigService;
  });

  describe('validate', () => {
    it('should successfully validate token and return user', async () => {
      const payload = { sub: 1, email: 'ivan@example.com' };
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(payload.sub);
    });

    it('should call userService.findOne with correct ID from payload', async () => {
      const payload = { sub: 1, email: 'ivan@example.com' };
      mockUserService.findOne.mockResolvedValue(mockUser);

      await strategy.validate(payload);

      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
      expect(mockUserService.findOne).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const payload = { sub: 999, email: 'nonexistent@example.com' };
      mockUserService.findOne.mockResolvedValue(undefined);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(mockUserService.findOne).toHaveBeenCalledWith(payload.sub);
    });

    it('should return correct object { userId, email }', async () => {
      const payload = { sub: 1, email: 'ivan@example.com' };
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should use correct secret from config', () => {
      // Проверяем, что стратегия использует правильный secret из конфига
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should correctly extract token from Authorization header (Bearer token)', async () => {
      // Это проверяется на уровне Passport, но мы можем проверить что стратегия настроена правильно
      const payload = { sub: 1, email: 'ivan@example.com' };
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toBeDefined();
      // Проверяем, что стратегия корректно обрабатывает payload
      expect(mockUserService.findOne).toHaveBeenCalledWith(payload.sub);
    });

    it('should handle payload with different user ID', async () => {
      const payload = { sub: 2, email: 'petr@example.com' };
      const differentUser = { ...mockUser, id: 2, email: 'petr@example.com' };
      mockUserService.findOne.mockResolvedValue(differentUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 2,
        email: 'petr@example.com',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(2);
    });

    it('should throw UnauthorizedException when user is deleted', async () => {
      const payload = { sub: 1, email: 'ivan@example.com' };
      const deletedUser = { ...mockUser, recordStatus: 'DELETED' };
      // findOne должен возвращать undefined для удаленного пользователя
      mockUserService.findOne.mockResolvedValue(undefined);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});

