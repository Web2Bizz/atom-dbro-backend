import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateUserDto, updateUserSchema } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUser = {
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

  const mockUsersList = [
    mockUser,
    {
      id: 2,
      firstName: 'Петр',
      lastName: 'Петров',
      middleName: null,
      email: 'petr@example.com',
      avatarUrls: null,
      role: 'пользователь',
      level: 1,
      experience: 0,
      organisationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCurrentUser = { userId: 1, email: 'ivan@example.com' };

  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      changePassword: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    
    // Принудительно устанавливаем зависимости
    (controller as any).userService = mockService;
  });

  describe('findAll', () => {
    it('should successfully return list of users without session (200)', async () => {
      mockService.findAll.mockResolvedValue(mockUsersList);

      const result = await controller.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        role: mockUser.role,
        avatarUrls: mockUser.avatarUrls,
      });
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('should return empty list when no users exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should successfully return user by id without session (200)', async () => {
      const userId = 1;
      mockService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist (404)', async () => {
      const userId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Пользователь с ID ${userId} не найден`)
      );

      await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(mockService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'НовоеИмя',
      lastName: 'НоваяФамилия',
    };

    it('should successfully update user (200)', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: 'НовоеИмя',
        lastName: 'НоваяФамилия',
      };
      mockService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockCurrentUser, updateUserDto);

      expect(result).toMatchObject({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
      });
      expect(mockService.update).toHaveBeenCalledWith(mockCurrentUser.userId, updateUserDto);
    });

    it('should throw NotFoundException when user does not exist (404)', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Пользователь с ID ${mockCurrentUser.userId} не найден или был удален`)
      );

      const promise = controller.update(mockCurrentUser, updateUserDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.update).toHaveBeenCalledWith(mockCurrentUser.userId, updateUserDto);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    it('should successfully change password with session (200)', async () => {
      mockService.changePassword.mockResolvedValue({ message: 'Пароль успешно изменен' });

      const result = await controller.changePassword(mockCurrentUser, changePasswordDto);

      expect(result).toEqual({ message: 'Пароль успешно изменен' });
      expect(mockService.changePassword).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        changePasswordDto
      );
    });

    it('should throw NotFoundException when user does not exist (404)', async () => {
      mockService.changePassword.mockRejectedValue(
        new NotFoundException(`Пользователь с ID ${mockCurrentUser.userId} не найден`)
      );

      const promise = controller.changePassword(mockCurrentUser, changePasswordDto);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.changePassword).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        changePasswordDto
      );
    });

    it('should throw UnauthorizedException when old password is invalid (401)', async () => {
      mockService.changePassword.mockRejectedValue(
        new UnauthorizedException('Неверный старый пароль')
      );

      const promise = controller.changePassword(mockCurrentUser, changePasswordDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Неверный старый пароль');
      expect(mockService.changePassword).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        changePasswordDto
      );
    });

    it('should use current user id from session', async () => {
      const differentUser = { userId: 2, email: 'other@example.com' };
      mockService.changePassword.mockResolvedValue({ message: 'Пароль успешно изменен' });

      const result = await controller.changePassword(differentUser, changePasswordDto);

      expect(result).toEqual({ message: 'Пароль успешно изменен' });
      expect(mockService.changePassword).toHaveBeenCalledWith(
        differentUser.userId,
        changePasswordDto
      );
      // Проверяем, что используется userId из сессии, а не из параметров
      expect(mockService.changePassword).not.toHaveBeenCalledWith(
        mockCurrentUser.userId,
        changePasswordDto
      );
    });
  });

  describe('email validation', () => {
    describe('updateUser schema validation', () => {
      it('should accept valid email format', () => {
        const validData = { email: 'ivan@example.com' };
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });

      it('should accept email with subdomain', () => {
        const validData = { email: 'user@subdomain.example.com' };
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });

      it('should accept email with plus tag', () => {
        const validData = { email: 'user.name+tag@example.co.uk' };
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });

      it('should reject email without @ symbol', () => {
        const invalidData = { email: 'invalidemail.com' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject email without domain', () => {
        const invalidData = { email: 'user@' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject email without local part', () => {
        const invalidData = { email: '@example.com' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject email with spaces', () => {
        const invalidData = { email: 'user @example.com' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject email with invalid domain format', () => {
        const invalidData = { email: 'user@example' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should reject email ending with dot', () => {
        const invalidData = { email: 'user@example.' };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should accept email with 255 characters', () => {
        // Создаем email длиной 255 символов: 'a' + '@' + 'b' * 249 + '.com'
        // 1 (a) + 1 (@) + 249 (b's) + 4 (.com) = 255
        const localPart = 'a';
        const domain = 'b'.repeat(249) + '.com';
        const email255 = `${localPart}@${domain}`;
        expect(email255.length).toBe(255);
        const validData = { email: email255 };
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });

      it('should reject email with 256 characters', () => {
        // Создаем email длиной 256 символов: 'a' + '@' + 'b' * 250 + '.com'
        // 1 (a) + 1 (@) + 250 (b's) + 4 (.com) = 256
        const localPart = 'a';
        const domain = 'b'.repeat(250) + '.com';
        const email256 = `${localPart}@${domain}`;
        expect(email256.length).toBe(256);
        const invalidData = { email: email256 };
        expect(() => updateUserSchema.parse(invalidData)).toThrow();
      });

      it('should accept undefined email (optional field)', () => {
        const validData = { firstName: 'Иван' };
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });

      it('should accept empty object (all fields optional)', () => {
        const validData = {};
        expect(() => updateUserSchema.parse(validData)).not.toThrow();
      });
    });
  });
});

