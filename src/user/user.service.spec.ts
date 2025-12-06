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
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  // Test data fixtures
  const mockUser = {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Иванович',
    email: 'ivan@example.com',
    avatarUrls: { 4: 'https://example.com/avatar.png' },
    role: 'USER',
    level: 1,
    experience: 0,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUserWithPassword = {
    ...mockUser,
    passwordHash: '$2b$10$hashedpassword',
  } as any;

  const mockUsersList = [
    mockUser,
    {
      id: 2,
      firstName: 'Петр',
      lastName: 'Петров',
      middleName: null,
      email: 'petr@example.com',
      avatarUrls: null,
      role: 'USER',
      level: 1,
      experience: 0,
      recordStatus: 'CREATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as any;

  let mockRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdWithPassword: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Создаем новый мок репозитория для каждого теста
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIdWithPassword: vi.fn(),
      update: vi.fn(),
      updatePassword: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockRepository,
        },
        {
          provide: DATABASE_CONNECTION,
          useValue: {} as any,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
    
    // Принудительно устанавливаем repository
    (service as any).userRepository = mockRepository;
  });

  describe('findAll', () => {
    it('should successfully return empty list of users', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should successfully return list of users with formatted data', async () => {
      mockRepository.findAll.mockResolvedValue(mockUsersList);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@example.com',
        role: 'пользователь', // Форматированная роль
        avatarUrls: { size_4: 'https://example.com/avatar.png' }, // Форматированные avatarUrls
      });
      expect(result[1]).toMatchObject({
        id: 2,
        firstName: 'Петр',
        lastName: 'Петров',
        email: 'petr@example.com',
        role: 'пользователь',
        avatarUrls: null,
      });
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should successfully return user by id', async () => {
      const userId = 1;
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toMatchObject({
        id: 1,
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@example.com',
        role: 'пользователь',
        avatarUrls: { size_4: 'https://example.com/avatar.png' },
      });
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 999;
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    const userId = 1;
    const updateUserDto: UpdateUserDto = {
      firstName: 'НовоеИмя',
      lastName: 'НоваяФамилия',
    };

    it('should successfully update user', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: 'НовоеИмя',
        lastName: 'НоваяФамилия',
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(result).toMatchObject({
        id: 1,
        firstName: 'НовоеИмя',
        lastName: 'НоваяФамилия',
        role: 'пользователь',
      });
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        firstName: 'НовоеИмя',
        lastName: 'НоваяФамилия',
      });
    });

    it('should successfully update user email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const updatedUser = {
        ...mockUser,
        email: 'newemail@example.com',
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result.email).toBe('newemail@example.com');
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        email: 'newemail@example.com',
      });
    });

    it('should successfully update user avatarUrls', async () => {
      const updateDto: UpdateUserDto = {
        avatarUrls: { size_4: 'https://example.com/new-avatar.png', size_5: 'https://example.com/new-avatar2.png' } as any,
      };
      const updatedUser = {
        ...mockUser,
        avatarUrls: { 4: 'https://example.com/new-avatar.png', 5: 'https://example.com/new-avatar2.png' },
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result.avatarUrls).toEqual({
        size_4: 'https://example.com/new-avatar.png',
        size_5: 'https://example.com/new-avatar2.png',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const nonExistentUserId = 999;
      mockRepository.findById.mockResolvedValue(undefined);

      const promise = service.update(nonExistentUserId, updateUserDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockRepository.findById).toHaveBeenCalledWith(nonExistentUserId);
    });

    it('should successfully update user with same email (no conflict)', async () => {
      const updateDto: UpdateUserDto = {
        email: 'ivan@example.com', // Тот же email
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(mockUser);

      const result = await service.update(userId, updateDto);

      expect(result.email).toBe('ivan@example.com');
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when email is already used by another active user', async () => {
      const updateDto: UpdateUserDto = {
        email: 'existing@example.com',
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockRejectedValue(
        new ConflictException('Email existing@example.com уже используется другим пользователем (ID 2)')
      );

      const promise = service.update(userId, updateDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Email existing@example.com уже используется другим пользователем');
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw ConflictException when email is used by deleted user', async () => {
      const updateDto: UpdateUserDto = {
        email: 'deleted@example.com',
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockRejectedValue(
        new ConflictException('Email deleted@example.com уже используется удаленным пользователем (ID 3). Обратитесь к администратору для восстановления или удаления учетной записи.')
      );

      const promise = service.update(userId, updateDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('уже используется удаленным пользователем');
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should successfully update user with valid new email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'newvalid@example.com',
      };
      const updatedUser = {
        ...mockUser,
        email: 'newvalid@example.com',
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result.email).toBe('newvalid@example.com');
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should successfully update user with email at 255 characters', async () => {
      // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
      // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
      const localPart = 'a';
      const domain = 'b'.repeat(249) + '.com';
      const email255 = `${localPart}@${domain}`;
      expect(email255.length).toBe(255);

      const updateDto: UpdateUserDto = {
        email: email255,
      };
      const updatedUser = {
        ...mockUser,
        email: email255,
      };
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result.email).toBe(email255);
      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const userId = 1;
    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    it('should successfully change password', async () => {
      mockRepository.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      mockRepository.updatePassword.mockResolvedValue(undefined);
      
      // Мокаем bcrypt.compare для проверки старого пароля
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhashedpassword' as never);

      const result = await service.changePassword(userId, changePasswordDto);

      expect(result).toEqual({ message: 'Пароль успешно изменен' });
      expect(mockRepository.findByIdWithPassword).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword123', mockUserWithPassword.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockRepository.updatePassword).toHaveBeenCalledWith(userId, '$2b$10$newhashedpassword');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findByIdWithPassword.mockResolvedValue(undefined);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findByIdWithPassword).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException when old password is invalid', async () => {
      mockRepository.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      
      // Мокаем bcrypt.compare для возврата false (неверный пароль)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRepository.findByIdWithPassword).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword123', mockUserWithPassword.passwordHash);
      expect(mockRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no passwordHash', async () => {
      const userWithoutPassword = {
        ...mockUser,
        passwordHash: null,
      };
      mockRepository.findByIdWithPassword.mockResolvedValue(userWithoutPassword);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRepository.findByIdWithPassword).toHaveBeenCalledWith(userId);
    });
  });
});

