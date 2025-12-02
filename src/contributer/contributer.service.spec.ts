import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContributerService } from './contributer.service';
import { ContributerRepository } from './contributer.repository';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ContributerService', () => {
  let service: ContributerService;
  let repository: ContributerRepository;

  // Test data fixtures
  const mockQuest = {
    id: 1,
    title: 'Test Quest',
    description: 'Test Description',
    status: 'active',
    experienceReward: 100,
    ownerId: 1,
    cityId: 1,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUser = {
    id: 2,
    firstName: 'John',
    lastName: 'Doe',
    middleName: null,
    email: 'john@example.com',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockContributer = {
    id: 1,
    questId: 1,
    userId: 2,
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockContributerDeleted = {
    ...mockContributer,
    recordStatus: 'DELETED',
  } as any;

  const mockContributersList = [
    {
      id: 1,
      userId: 2,
      firstName: 'John',
      lastName: 'Doe',
      middleName: null,
      email: 'john@example.com',
      createdAt: new Date(),
    },
  ];

  let mockRepository: {
    findQuestById: ReturnType<typeof vi.fn>;
    findUserById: ReturnType<typeof vi.fn>;
    findContributersByQuest: ReturnType<typeof vi.fn>;
    findContributer: ReturnType<typeof vi.fn>;
    isUserInQuest: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRepository = {
      findQuestById: vi.fn(),
      findUserById: vi.fn(),
      findContributersByQuest: vi.fn(),
      findContributer: vi.fn(),
      isUserInQuest: vi.fn(),
      create: vi.fn(),
      restore: vi.fn(),
      softDelete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributerService,
        {
          provide: ContributerRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ContributerService>(ContributerService);
    repository = module.get<ContributerRepository>(ContributerRepository);
  });

  describe('getContributers', () => {
    it('should successfully return empty list of contributors', async () => {
      const questId = 1;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findContributersByQuest.mockResolvedValue([]);

      const result = await service.getContributers(questId);

      expect(result).toEqual([]);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findContributersByQuest).toHaveBeenCalledWith(questId);
    });

    it('should successfully return list of contributors with data', async () => {
      const questId = 1;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findContributersByQuest.mockResolvedValue(mockContributersList);

      const result = await service.getContributers(questId);

      expect(result).toEqual([
        {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          middleName: null,
          email: 'john@example.com',
          joinedAt: mockContributersList[0].createdAt,
        },
      ]);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findContributersByQuest).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      const questId = 999;
      mockRepository.findQuestById.mockResolvedValue(undefined);

      const promise = service.getContributers(questId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Квест с ID 999 не найден');
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findContributersByQuest).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when quest is deleted', async () => {
      const questId = 1;
      mockRepository.findQuestById.mockResolvedValue(undefined);

      await expect(service.getContributers(questId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
    });
  });

  describe('addContributer', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully add new contributor', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer.mockResolvedValue(undefined);
      mockRepository.create.mockResolvedValue(mockContributer);

      const result = await service.addContributer(questId, userId);

      expect(result).toEqual({ message: 'Contributer успешно добавлен в квест' });
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(mockRepository.isUserInQuest).toHaveBeenCalledWith(questId, userId);
      expect(mockRepository.findContributer).toHaveBeenCalledWith(questId, userId);
      expect(mockRepository.create).toHaveBeenCalledWith(questId, userId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(undefined);

      await expect(service.addContributer(questId, userId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(undefined);

      await expect(service.addContributer(questId, userId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId);
    });

    it('should throw BadRequestException when user is not in quest', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(false);

      const promise = service.addContributer(questId, userId);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Пользователь не участвует в этом квесте');
    });

    it('should throw ConflictException when user is already contributor', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer.mockResolvedValue(mockContributer);

      const promise = service.addContributer(questId, userId);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователь уже является contributer этого квеста');
    });

    it('should restore deleted contributor', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer.mockResolvedValue(mockContributerDeleted);
      mockRepository.restore.mockResolvedValue(mockContributer);

      const result = await service.addContributer(questId, userId);

      expect(result).toEqual({ message: 'Contributer успешно добавлен в квест' });
      expect(mockRepository.restore).toHaveBeenCalledWith(questId, userId);
    });
  });

  describe('addContributers', () => {
    const questId = 1;
    const requesterUserId = 1; // Owner
    const userIds = [2, 3];

    it('should successfully add multiple contributors', async () => {
      const mockUser2 = { ...mockUser, id: 2 };
      const mockUser3 = { ...mockUser, id: 3 };

      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer.mockResolvedValue(undefined);
      mockRepository.create
        .mockResolvedValueOnce({ ...mockContributer, userId: 2 })
        .mockResolvedValueOnce({ ...mockContributer, userId: 3 });

      const result = await service.addContributers(questId, userIds, requesterUserId);

      expect(result.message).toBe('Contributers успешно добавлены в квест');
      expect(result.added).toBe(2);
      expect(result.restored).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should successfully restore multiple deleted contributors', async () => {
      const mockUser2 = { ...mockUser, id: 2 };
      const mockUser3 = { ...mockUser, id: 3 };

      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer
        .mockResolvedValueOnce({ ...mockContributerDeleted, userId: 2 })
        .mockResolvedValueOnce({ ...mockContributerDeleted, userId: 3 });
      mockRepository.restore
        .mockResolvedValueOnce({ ...mockContributer, userId: 2 })
        .mockResolvedValueOnce({ ...mockContributer, userId: 3 });

      const result = await service.addContributers(questId, userIds, requesterUserId);

      expect(result.message).toBe('Contributers успешно добавлены в квест');
      expect(result.added).toBe(0);
      expect(result.restored).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should handle mixed case: new contributors and restoration', async () => {
      const mockUser2 = { ...mockUser, id: 2 };
      const mockUser3 = { ...mockUser, id: 3 };

      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ ...mockContributerDeleted, userId: 3 });
      mockRepository.create.mockResolvedValue({ ...mockContributer, userId: 2 });
      mockRepository.restore.mockResolvedValue({ ...mockContributer, userId: 3 });

      const result = await service.addContributers(questId, userIds, requesterUserId);

      expect(result.message).toBe('Contributers успешно добавлены в квест');
      expect(result.added).toBe(1);
      expect(result.restored).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(undefined);

      await expect(service.addContributers(questId, userIds, requesterUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not quest owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);

      const promise = service.addContributers(questId, userIds, nonOwnerUserId);
      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow('Только владелец квеста может управлять contributors');
    });

    it('should throw NotFoundException when one or more users do not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(undefined);

      const promise = service.addContributers(questId, userIds, requesterUserId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователи с ID не найдены: 3');
    });

    it('should throw BadRequestException when one or more users are not in quest', async () => {
      const mockUser2 = { ...mockUser, id: 2 };
      const mockUser3 = { ...mockUser, id: 3 };

      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3);
      mockRepository.isUserInQuest
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const promise = service.addContributers(questId, userIds, requesterUserId);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Пользователи с ID не участвуют в квесте: 3');
    });

    it('should throw ConflictException when one or more users are already contributors', async () => {
      const mockUser2 = { ...mockUser, id: 2 };
      const mockUser3 = { ...mockUser, id: 3 };

      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3);
      mockRepository.isUserInQuest.mockResolvedValue(true);
      mockRepository.findContributer
        .mockResolvedValueOnce(mockContributer)
        .mockResolvedValueOnce(undefined);

      const promise = service.addContributers(questId, userIds, requesterUserId);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователи с ID уже являются contributers этого квеста: 2');
    });
  });

  describe('removeContributer', () => {
    const questId = 1;
    const userId = 2;
    const requesterUserId = 1; // Owner

    it('should successfully remove contributor (soft delete)', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findContributer.mockResolvedValue(mockContributer);
      mockRepository.softDelete.mockResolvedValue(mockContributerDeleted);

      const result = await service.removeContributer(questId, userId, requesterUserId);

      expect(result).toEqual({ message: 'Contributer успешно удалён из квеста' });
      expect(mockRepository.findQuestById).toHaveBeenCalledWith(questId);
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(mockRepository.findContributer).toHaveBeenCalledWith(questId, userId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(questId, userId);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(undefined);

      await expect(service.removeContributer(questId, userId, requesterUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not quest owner', async () => {
      const nonOwnerUserId = 999;
      mockRepository.findQuestById.mockResolvedValue(mockQuest);

      const promise = service.removeContributer(questId, userId, nonOwnerUserId);
      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow('Только владелец квеста может управлять contributors');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(undefined);

      const promise = service.removeContributer(questId, userId, requesterUserId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(`Пользователь с ID ${userId} не найден`);
    });

    it('should throw NotFoundException when contributor does not exist', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findContributer.mockResolvedValue(undefined);

      const promise = service.removeContributer(questId, userId, requesterUserId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователь не является contributer этого квеста');
    });

    it('should throw ConflictException when contributor is already deleted', async () => {
      mockRepository.findQuestById.mockResolvedValue(mockQuest);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findContributer.mockResolvedValue(mockContributerDeleted);

      const promise = service.removeContributer(questId, userId, requesterUserId);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Пользователь уже удалён из contributers этого квеста');
    });
  });
});
