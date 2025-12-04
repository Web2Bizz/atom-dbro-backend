import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from './user.repository';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('UserRepository', () => {
  let repository: UserRepository;
  let db: NodePgDatabase;

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

  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as any,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    db = module.get<NodePgDatabase>(DATABASE_CONNECTION);
    
    (repository as any).db = mockDb;
  });

  describe('findByEmail', () => {
    it('should successfully return user by email', async () => {
      const email = 'ivan@example.com';
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await repository.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await repository.findByEmail(email);

      expect(result).toBeUndefined();
    });

    it('should not return deleted user', async () => {
      const email = 'deleted@example.com';
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Удаленный пользователь не должен возвращаться
        }),
      });

      const result = await repository.findByEmail(email);

      expect(result).toBeUndefined();
    });
  });

  describe('existsByEmail', () => {
    it('should return true when user exists', async () => {
      const email = 'ivan@example.com';
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await repository.existsByEmail(email);

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await repository.existsByEmail(email);

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    const createData = {
      firstName: 'Петр',
      lastName: 'Петров',
      middleName: null,
      email: 'petr@example.com',
      passwordHash: '$2b$10$hashedpassword',
      avatarUrls: { 4: 'https://example.com/avatar.png' },
      role: 'USER',
      level: 1,
      experience: 0,
      organisationId: null,
    };

    it('should successfully create user with unique email', async () => {
      // Мокаем проверку существования email - пользователя нет
      mockDb.select = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Email не занят
        }),
      });

      // Мокаем вставку пользователя
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await repository.create(createData);

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ConflictException when email is already used by active user', async () => {
      const activeUserWithEmail = {
        id: 2,
        email: createData.email,
        recordStatus: 'CREATED',
      };

      // Мокаем проверку существования email - email занят активным пользователем
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeUserWithEmail]),
        }),
      });

      const promise = repository.create(createData);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow(`Email ${createData.email} уже используется`);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email is used by deleted user', async () => {
      const deletedUserWithEmail = {
        id: 3,
        email: createData.email,
        recordStatus: 'DELETED',
      };

      // Мокаем проверку существования email - email занят удаленным пользователем
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([deletedUserWithEmail]),
        }),
      });

      const promise = repository.create(createData);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('уже используется удаленным пользователем');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const userId = 1;

    it('should successfully update user with same email (no conflict)', async () => {
      const updateData = {
        email: 'ivan@example.com', // Тот же email
      };

      // Мокаем проверку email - email тот же, конфликта нет
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]), // Существующий пользователь
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]), // Email проверка - тот же пользователь
          }),
        });

      // Мокаем обновление
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUser, ...updateData }]),
          }),
        }),
      });

      const result = await repository.update(userId, updateData);

      expect(result).toBeDefined();
    });

    it('should successfully update user with new unique email', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      // Мокаем проверку существования пользователя
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]), // Существующий пользователь
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // Новый email свободен
          }),
        });

      // Мокаем обновление
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUser, ...updateData }]),
          }),
        }),
      });

      const result = await repository.update(userId, updateData);

      expect(result).toBeDefined();
    });

    it('should throw ConflictException when email is already used by another active user', async () => {
      const updateData = {
        email: 'existing@example.com',
      };

      const anotherUser = {
        id: 2,
        email: 'existing@example.com',
        recordStatus: 'CREATED',
      };

      // Мокаем проверку существования пользователя и проверку email
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]), // Существующий пользователь (findByIdWithPassword)
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([anotherUser]), // Email занят другим пользователем
          }),
        });

      const promise = repository.update(userId, updateData);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('уже используется другим пользователем');
    });

    it('should throw ConflictException when email is used by deleted user', async () => {
      const updateData = {
        email: 'deleted@example.com',
      };

      const deletedUser = {
        id: 3,
        email: 'deleted@example.com',
        recordStatus: 'DELETED',
      };

      // Мокаем проверку существования пользователя и проверку email
      mockDb.select = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]), // Существующий пользователь (findByIdWithPassword)
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([deletedUser]), // Email занят удаленным пользователем
          }),
        });

      const promise = repository.update(userId, updateData);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('уже используется удаленным пользователем');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      // Мокаем проверку существования пользователя - пользователь не найден
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Пользователь не найден
        }),
      });

      const promise = repository.update(userId, updateData);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('не найден или был удален');
    });
  });
});

