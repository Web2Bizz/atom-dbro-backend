import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestEventsService } from './quest.events';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';

describe('QuestController', () => {
  let controller: QuestController;
  let service: QuestService;

  const mockQuest = {
    id: 1,
    title: 'Тестовый квест',
    description: 'Описание квеста',
    status: 'active',
    experienceReward: 100,
    ownerId: 1,
    cityId: 1,
    categories: [],
  };

  const mockCurrentUser = { userId: 1, email: 'ivan@example.com' };

  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findOneWithUserParticipation: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    completeQuest: ReturnType<typeof vi.fn>;
    archiveQuest: ReturnType<typeof vi.fn>;
    joinQuest: ReturnType<typeof vi.fn>;
    leaveQuest: ReturnType<typeof vi.fn>;
    getUserQuests: ReturnType<typeof vi.fn>;
    getAvailableQuests: ReturnType<typeof vi.fn>;
    getQuestUsers: ReturnType<typeof vi.fn>;
    findByStatus: ReturnType<typeof vi.fn>;
    updateRequirementCurrentValue: ReturnType<typeof vi.fn>;
  };

  let mockQuestEventsService: any;

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findOneWithUserParticipation: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      completeQuest: vi.fn(),
      archiveQuest: vi.fn(),
      joinQuest: vi.fn(),
      leaveQuest: vi.fn(),
      getUserQuests: vi.fn(),
      getAvailableQuests: vi.fn(),
      getQuestUsers: vi.fn(),
      findByStatus: vi.fn(),
      updateRequirementCurrentValue: vi.fn(),
    };

    mockQuestEventsService = {
      getQuestEvents: vi.fn(),
      getQuestEventsByQuestId: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestController],
      providers: [
        {
          provide: QuestService,
          useValue: mockService,
        },
        {
          provide: QuestEventsService,
          useValue: mockQuestEventsService,
        },
      ],
    }).compile();

    controller = module.get<QuestController>(QuestController);
    service = module.get<QuestService>(QuestService);
    
    (controller as any).questService = mockService;
    (controller as any).questEventsService = mockQuestEventsService;
  });

  describe('findAll', () => {
    it('should successfully return list of quests without session (200)', async () => {
      mockService.findAll.mockResolvedValue([mockQuest]);

      const result = await controller.findAll();

      expect(result).toEqual([mockQuest]);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter by cityId and categoryId when query params are provided', async () => {
      const cityId = 1;
      const categoryId = 1;
      mockService.findAll.mockResolvedValue([mockQuest]);

      const result = await controller.findAll(cityId, categoryId);

      expect(result).toEqual([mockQuest]);
      expect(mockService.findAll).toHaveBeenCalledWith(cityId, categoryId);
    });
  });

  describe('findOne', () => {
    it('should successfully return quest by id without session (200)', async () => {
      const questId = 1;
      mockService.findOne.mockResolvedValue(mockQuest);

      const result = await controller.findOne(questId);

      expect(result).toEqual(mockQuest);
      expect(mockService.findOne).toHaveBeenCalledWith(questId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      const questId = 999;
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Квест с ID ${questId} не найден`)
      );

      const promise = controller.findOne(questId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateQuestDto = {
      title: 'Новый квест',
      description: 'Описание',
      cityId: 1,
    };

    it('should successfully create quest with session (201)', async () => {
      mockService.create.mockResolvedValue(mockQuest);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockQuest);
      expect(mockService.create).toHaveBeenCalledWith(createDto, mockCurrentUser.userId);
    });
  });

  describe('update', () => {
    const questId = 1;
    const updateDto: UpdateQuestDto = {
      title: 'Обновленное название',
    };

    it('should successfully update quest with session (200)', async () => {
      const updatedQuest = { ...mockQuest, title: 'Обновленное название' };
      mockService.update.mockResolvedValue(updatedQuest);

      const result = await controller.update(questId, updateDto, mockCurrentUser);

      expect(result).toEqual(updatedQuest);
      expect(mockService.update).toHaveBeenCalledWith(questId, updateDto, mockCurrentUser.userId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Квест с ID ${questId} не найден`)
      );

      const promise = controller.update(questId, updateDto, mockCurrentUser);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.update).toHaveBeenCalledWith(questId, updateDto, mockCurrentUser.userId);
    });

    it('should throw ForbiddenException when user is not owner (403)', async () => {
      mockService.update.mockRejectedValue(
        new ForbiddenException('Только автор квеста может обновить квест')
      );

      const promise = controller.update(questId, updateDto, mockCurrentUser);
      await expect(promise).rejects.toThrow(ForbiddenException);
      expect(mockService.update).toHaveBeenCalledWith(questId, updateDto, mockCurrentUser.userId);
    });
  });

  describe('remove', () => {
    const questId = 1;

    it('should successfully remove quest with session (200)', async () => {
      mockService.remove.mockResolvedValue(mockQuest);

      const result = await controller.remove(questId, mockCurrentUser);

      expect(result).toEqual(mockQuest);
      expect(mockService.remove).toHaveBeenCalledWith(questId, mockCurrentUser.userId);
    });

    it('should throw NotFoundException when quest does not exist (404)', async () => {
      mockService.remove.mockRejectedValue(
        new NotFoundException(`Квест с ID ${questId} не найден`)
      );

      const promise = controller.remove(questId, mockCurrentUser);
      await expect(promise).rejects.toThrow(NotFoundException);
      expect(mockService.remove).toHaveBeenCalledWith(questId, mockCurrentUser.userId);
    });

    it('should throw ForbiddenException when user is not owner (403)', async () => {
      mockService.remove.mockRejectedValue(
        new ForbiddenException('Только автор квеста может удалить квест')
      );

      const promise = controller.remove(questId, mockCurrentUser);
      await expect(promise).rejects.toThrow(ForbiddenException);
      expect(mockService.remove).toHaveBeenCalledWith(questId, mockCurrentUser.userId);
    });
  });

  describe('completeQuest', () => {
    const questId = 1;

    it('should successfully complete quest when user is owner (200)', async () => {
      const completedQuest = { ...mockQuest, status: 'completed' };
      mockService.completeQuest.mockResolvedValue(completedQuest);

      const result = await controller.completeQuest(questId, mockCurrentUser);

      expect(result).toEqual(completedQuest);
      expect(mockService.completeQuest).toHaveBeenCalledWith(mockCurrentUser.userId, questId);
    });

    it('should throw ForbiddenException when user is not owner (403)', async () => {
      mockService.completeQuest.mockRejectedValue(
        new ForbiddenException('Только автор квеста может завершить квест')
      );

      const promise = controller.completeQuest(questId, mockCurrentUser);
      await expect(promise).rejects.toThrow('Только автор квеста может завершить квест');
      expect(mockService.completeQuest).toHaveBeenCalledWith(mockCurrentUser.userId, questId);
    });
  });

  describe('archiveQuest', () => {
    const questId = 1;

    it('should successfully archive quest when user is owner (200)', async () => {
      const archivedQuest = { ...mockQuest, status: 'archived' };
      mockService.archiveQuest.mockResolvedValue(archivedQuest);

      const result = await controller.archiveQuest(questId, mockCurrentUser);

      expect(result).toEqual(archivedQuest);
      expect(mockService.archiveQuest).toHaveBeenCalledWith(mockCurrentUser.userId, questId);
    });

    it('should throw ForbiddenException when user is not owner (403)', async () => {
      mockService.archiveQuest.mockRejectedValue(
        new ForbiddenException('Только автор квеста может архивировать квест')
      );

      const promise = controller.archiveQuest(questId, mockCurrentUser);
      await expect(promise).rejects.toThrow('Только автор квеста может архивировать квест');
      expect(mockService.archiveQuest).toHaveBeenCalledWith(mockCurrentUser.userId, questId);
    });
  });

  describe('joinQuest', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully join quest with session (201)', async () => {
      const userQuest = { id: 1, userId, questId, status: 'in_progress' };
      mockService.joinQuest.mockResolvedValue(userQuest);

      const result = await controller.joinQuest(questId, userId);

      expect(result).toEqual(userQuest);
      expect(mockService.joinQuest).toHaveBeenCalledWith(userId, questId);
    });

    it('should throw ConflictException when user already joined (409)', async () => {
      mockService.joinQuest.mockRejectedValue(
        new ConflictException('Пользователь уже присоединился к этому квесту')
      );

      const promise = controller.joinQuest(questId, userId);
      await expect(promise).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when userId in path does not match current user (403)', async () => {
      const differentUserId = 999;
      mockService.joinQuest.mockRejectedValue(
        new ForbiddenException('Пользователь может присоединиться к квесту только от своего имени')
      );

      const promise = controller.joinQuest(questId, differentUserId);
      await expect(promise).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leaveQuest', () => {
    const questId = 1;
    const userId = 2;

    it('should successfully leave quest with session (200)', async () => {
      const deletedUserQuest = { id: 1, userId, questId };
      mockService.leaveQuest.mockResolvedValue(deletedUserQuest);

      const result = await controller.leaveQuest(questId, userId);

      expect(result).toEqual(deletedUserQuest);
      expect(mockService.leaveQuest).toHaveBeenCalledWith(userId, questId);
    });

    it('should throw NotFoundException when user does not participate (404)', async () => {
      mockService.leaveQuest.mockRejectedValue(
        new NotFoundException('Пользователь не участвует в этом квесте')
      );

      const promise = controller.leaveQuest(questId, userId);
      await expect(promise).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when userId in path does not match current user (403)', async () => {
      const differentUserId = 999;
      mockService.leaveQuest.mockRejectedValue(
        new ForbiddenException('Пользователь может покинуть квест только от своего имени')
      );

      const promise = controller.leaveQuest(questId, differentUserId);
      await expect(promise).rejects.toThrow(ForbiddenException);
    });
  });
});

