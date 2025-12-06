import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('StepVolunteerRepository', () => {
  let repository: StepVolunteerRepository;
  let mockDb: NodePgDatabase;

  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    status: 'active',
    recordStatus: 'CREATED',
  } as any;

  const mockUser = {
    id: 2,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    recordStatus: 'CREATED',
  } as any;

  const mockStepVolunteer = {
    id: 1,
    questId: 1,
    type: 'finance',
    userId: 2,
    contributeValue: 1000,
    isInkognito: false,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUserQuest = {
    id: 1,
    questId: 1,
    userId: 2,
  } as any;

  beforeEach(async () => {
    // Создаем мок для базы данных
    mockDb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepVolunteerRepository,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    repository = module.get<StepVolunteerRepository>(StepVolunteerRepository);
    (repository as any).db = mockDb;
  });

  describe('findQuestById', () => {
    const questId = 1;

    it('should successfully find quest by id', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockQuest]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findQuestById(questId);

      expect(result).toEqual(mockQuest);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined when quest does not exist', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findQuestById(questId);

      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(error),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      await expect(repository.findQuestById(questId)).rejects.toThrow('Database error');
    });
  });

  describe('findUserById', () => {
    const userId = 2;

    it('should successfully find user by id', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined when user does not exist', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findUserById(userId);

      expect(result).toBeUndefined();
    });
  });

  describe('isUserInQuest', () => {
    const questId = 1;
    const userId = 2;

    it('should return true when user is in quest', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUserQuest]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.isUserInQuest(questId, userId);

      expect(result).toBe(true);
    });

    it('should return false when user is not in quest', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.isUserInQuest(questId, userId);

      expect(result).toBe(false);
    });
  });

  describe('createStepVolunteer', () => {
    const questId = 1;
    const type = 'finance';
    const userId = 2;
    const contributeValue = 1000;
    const isInkognito = false;

    it('should successfully create step volunteer', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockStepVolunteer]),
      };
      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      const result = await repository.createStepVolunteer(questId, type, userId, contributeValue, isInkognito);

      expect(result).toEqual(mockStepVolunteer);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should successfully create step volunteer with isInkognito = true', async () => {
      const inkognitoVolunteer = {
        ...mockStepVolunteer,
        isInkognito: true,
      };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([inkognitoVolunteer]),
      };
      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      const result = await repository.createStepVolunteer(questId, type, userId, contributeValue, true);

      expect(result).toEqual(inkognitoVolunteer);
      expect(result.isInkognito).toBe(true);
    });

    it('should handle zero contribute value', async () => {
      const zeroVolunteer = {
        ...mockStepVolunteer,
        contributeValue: 0,
      };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([zeroVolunteer]),
      };
      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      const result = await repository.createStepVolunteer(questId, type, userId, 0, isInkognito);

      expect(result).toEqual(zeroVolunteer);
      expect(result.contributeValue).toBe(0);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(error),
      };
      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      await expect(
        repository.createStepVolunteer(questId, type, userId, contributeValue, isInkognito),
      ).rejects.toThrow('Database error');
    });

    it('should throw error when creation returns empty result', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert = vi.fn().mockReturnValue(mockInsert);

      await expect(
        repository.createStepVolunteer(questId, type, userId, contributeValue, isInkognito),
      ).rejects.toThrow('Не удалось создать запись волонтёра этапа');
    });
  });

  describe('findVolunteersByQuestAndStep', () => {
    const questId = 1;
    const type = 'finance';

    it('should successfully find volunteers with user data when not inkognito', async () => {
      const mockVolunteers = [
        {
          id: 1,
          userId: 2,
          isInkognito: false,
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: null,
          email: 'ivan@example.com',
          createdAt: new Date(),
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockVolunteers),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findVolunteersByQuestAndStep(questId, type);

      expect(result).toHaveLength(1);
      expect(result[0].user).not.toBeNull();
      expect(result[0].user?.firstName).toBe('Иван');
    });

    it('should return null user when isInkognito = true', async () => {
      const mockVolunteers = [
        {
          id: 1,
          userId: 2,
          isInkognito: true,
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: null,
          email: 'ivan@example.com',
          createdAt: new Date(),
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockVolunteers),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findVolunteersByQuestAndStep(questId, type);

      expect(result).toHaveLength(1);
      expect(result[0].user).toBeNull();
    });

    it('should return empty array when no volunteers found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findVolunteersByQuestAndStep(questId, type);

      expect(result).toEqual([]);
    });
  });

  describe('getSumContributeValue', () => {
    const questId = 1;
    const type = 'finance';

    it('should successfully return sum of contribute values', async () => {
      const mockResult = [{ sum: 5000 }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getSumContributeValue(questId, type);

      expect(result).toBe(5000);
    });

    it('should return 0 when no contributions found', async () => {
      const mockResult = [{ sum: null }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getSumContributeValue(questId, type);

      expect(result).toBe(0);
    });

    it('should return 0 when result is undefined', async () => {
      const mockResult = [undefined];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getSumContributeValue(questId, type);

      expect(result).toBe(0);
    });
  });

  describe('getVolunteersCount', () => {
    const questId = 1;
    const type = 'finance';

    it('should successfully return count of unique volunteers', async () => {
      const mockResult = [{ count: 5 }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getVolunteersCount(questId, type);

      expect(result).toBe(5);
    });

    it('should return 0 when no volunteers found', async () => {
      const mockResult = [{ count: null }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getVolunteersCount(questId, type);

      expect(result).toBe(0);
    });
  });

  describe('getConfirmedVolunteersCount', () => {
    const questId = 1;
    const type = 'finance';

    it('should successfully return count of confirmed volunteers', async () => {
      const mockResult = [{ count: 3 }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getConfirmedVolunteersCount(questId, type);

      expect(result).toBe(3);
    });

    it('should return 0 when no confirmed volunteers found', async () => {
      const mockResult = [{ count: null }];
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.getConfirmedVolunteersCount(questId, type);

      expect(result).toBe(0);
    });
  });

  describe('softDelete', () => {
    const questId = 1;
    const type = 'finance';
    const userId = 2;

    it('should successfully soft delete volunteer', async () => {
      const deletedVolunteer = {
        ...mockStepVolunteer,
        recordStatus: 'DELETED',
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([deletedVolunteer]),
      };
      mockDb.update = vi.fn().mockReturnValue(mockUpdate);

      const result = await repository.softDelete(questId, type, userId);

      expect(result).toEqual(deletedVolunteer);
      expect(result?.recordStatus).toBe('DELETED');
    });

    it('should return undefined when volunteer does not exist', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update = vi.fn().mockReturnValue(mockUpdate);

      const result = await repository.softDelete(questId, type, userId);

      expect(result).toBeUndefined();
    });
  });

  describe('restore', () => {
    const questId = 1;
    const type = 'finance';
    const userId = 2;

    it('should successfully restore volunteer', async () => {
      const restoredVolunteer = {
        ...mockStepVolunteer,
        recordStatus: 'CREATED',
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([restoredVolunteer]),
      };
      mockDb.update = vi.fn().mockReturnValue(mockUpdate);

      const result = await repository.restore(questId, type, userId);

      expect(result).toEqual(restoredVolunteer);
      expect(result?.recordStatus).toBe('CREATED');
    });

    it('should return undefined when volunteer does not exist', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update = vi.fn().mockReturnValue(mockUpdate);

      const result = await repository.restore(questId, type, userId);

      expect(result).toBeUndefined();
    });
  });
});

