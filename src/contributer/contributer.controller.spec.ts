import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContributerController } from './contributer.controller';
import { ContributerService } from './contributer.service';
import { ContributerRepository } from './contributer.repository';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AddContributersDto } from './dto/add-contributers.dto';

describe('ContributerController', () => {
  let controller: ContributerController;
  let service: ContributerService;
  let repository: ContributerRepository;

  const mockUser = { userId: 1, email: 'owner@example.com' };
  const mockContributersList = [
    {
      id: 2,
      firstName: 'John',
      lastName: 'Doe',
      middleName: null,
      email: 'john@example.com',
      joinedAt: new Date(),
    },
  ];

  let mockService: {
    getContributers: ReturnType<typeof vi.fn>;
    addContributers: ReturnType<typeof vi.fn>;
    removeContributer: ReturnType<typeof vi.fn>;
  };

  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      getContributers: vi.fn(),
      addContributers: vi.fn(),
      removeContributer: vi.fn(),
    };

    mockRepository = {
      findUserById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributerController],
      providers: [
        {
          provide: ContributerService,
          useValue: mockService,
        },
        {
          provide: ContributerRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<ContributerController>(ContributerController);
    service = module.get<ContributerService>(ContributerService);
    repository = module.get<ContributerRepository>(ContributerRepository);
    
    // Принудительно устанавливаем зависимости, так как DI может не работать корректно в тестах
    (controller as any).contributerService = mockService;
    (controller as any).contributerRepository = mockRepository;
  });

  describe('getContributers', () => {
    it('should successfully return list of contributors (200)', async () => {
      const questId = 1;
      mockService.getContributers.mockResolvedValue(mockContributersList);

      const result = await controller.getContributers(questId);

      expect(result).toEqual(mockContributersList);
      expect(mockService.getContributers).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      const questId = 999;
      mockService.getContributers.mockRejectedValue(
        new NotFoundException('Квест с ID 999 не найден')
      );

      const promise = controller.getContributers(questId);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Квест с ID 999 не найден');
    });
  });

  describe('addContributers', () => {
    const questId = 1;
    const addContributersDto: AddContributersDto = { userIds: [2, 3] };

    it('should successfully add contributors (201)', async () => {
      mockRepository.findUserById.mockResolvedValue({ id: 2 } as any);
      mockService.addContributers.mockResolvedValue({
        message: 'Contributers успешно добавлены в квест',
        added: 2,
        restored: 0,
        total: 2,
      });

      const result = await controller.addContributers(questId, addContributersDto, mockUser);

      expect(result.message).toBe('Contributers успешно добавлены в квест');
      expect(result.added).toBe(2);
      expect(mockService.addContributers).toHaveBeenCalledWith(questId, [2, 3], mockUser.userId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      mockRepository.findUserById.mockResolvedValue({ id: 2 } as any);
      mockService.addContributers.mockRejectedValue(
        new NotFoundException('Квест с ID 999 не найден')
      );

      const promise = controller.addContributers(questId, addContributersDto, mockUser);
      await expect(promise).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when users do not exist (404)', async () => {
      mockRepository.findUserById.mockResolvedValueOnce({ id: 2 } as any).mockResolvedValueOnce(undefined);

      const promise = controller.addContributers(questId, addContributersDto, mockUser);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Пользователи с ID не найдены: 3');
    });

    it('should throw BadRequestException when users are not in quest (400)', async () => {
      mockRepository.findUserById.mockResolvedValue({ id: 2 } as any);
      mockService.addContributers.mockRejectedValue(
        new BadRequestException('Пользователи с ID не участвуют в квесте: 3')
      );

      const promise = controller.addContributers(questId, addContributersDto, mockUser);
      await expect(promise).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when users are already contributors (409)', async () => {
      mockRepository.findUserById.mockResolvedValue({ id: 2 } as any);
      mockService.addContributers.mockRejectedValue(
        new ConflictException('Пользователи с ID уже являются contributers этого квеста: 2')
      );

      const promise = controller.addContributers(questId, addContributersDto, mockUser);
      await expect(promise).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when user is not quest owner (403)', async () => {
      mockRepository.findUserById.mockResolvedValue({ id: 2 } as any);
      mockService.addContributers.mockRejectedValue(
        new ForbiddenException('Только владелец квеста может управлять contributors')
      );

      const promise = controller.addContributers(questId, addContributersDto, mockUser);
      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow('Только владелец квеста может управлять contributors');
    });
  });

  describe('removeContributer', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully remove contributor (200)', async () => {
      mockService.removeContributer.mockResolvedValue({
        message: 'Contributer успешно удалён из квеста',
      });

      const result = await controller.removeContributer(questId, userId, mockUser);

      expect(result).toEqual({ message: 'Contributer успешно удалён из квеста' });
      expect(mockService.removeContributer).toHaveBeenCalledWith(questId, userId, mockUser.userId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      mockService.removeContributer.mockRejectedValue(
        new NotFoundException('Квест с ID 999 не найден')
      );

      const promise = controller.removeContributer(questId, userId, mockUser);
      await expect(promise).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not exist (404)', async () => {
      mockService.removeContributer.mockRejectedValue(
        new NotFoundException('Пользователь с ID 999 не найден')
      );

      const promise = controller.removeContributer(questId, userId, mockUser);
      await expect(promise).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when contributor does not exist (404)', async () => {
      mockService.removeContributer.mockRejectedValue(
        new NotFoundException('Пользователь не является contributer этого квеста')
      );

      const promise = controller.removeContributer(questId, userId, mockUser);
      await expect(promise).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when contributor is already deleted (409)', async () => {
      mockService.removeContributer.mockRejectedValue(
        new ConflictException('Пользователь уже удалён из contributers этого квеста')
      );

      const promise = controller.removeContributer(questId, userId, mockUser);
      await expect(promise).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when user is not quest owner (403)', async () => {
      mockService.removeContributer.mockRejectedValue(
        new ForbiddenException('Только владелец квеста может управлять contributors')
      );

      const promise = controller.removeContributer(questId, userId, mockUser);
      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow('Только владелец квеста может управлять contributors');
    });
  });
});

