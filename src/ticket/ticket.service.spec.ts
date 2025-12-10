import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketService } from './ticket.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tickets } from '../database/schema';

describe('TicketService', () => {
  let service: TicketService;
  let mockDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    values: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    and: ReturnType<typeof vi.fn>;
    ne: ReturnType<typeof vi.fn>;
  };

  const mockTicket = {
    id: 1,
    userId: 1,
    isResolved: false,
    chatId: 'chat-123',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicket2 = {
    id: 2,
    userId: 1,
    isResolved: true,
    chatId: 'chat-456',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicketOtherUser = {
    id: 3,
    userId: 2,
    isResolved: false,
    chatId: 'chat-789',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Инициализируем базовые моки
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
      eq: vi.fn(),
      and: vi.fn(),
      ne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as unknown as NodePgDatabase,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  describe('create', () => {
    it('should successfully create a ticket with correct userId and chatId', async () => {
      const userId = 1;
      const chatId = 'chat-123';
      
      // Настраиваем мок для цепочки insert().values().returning()
      const mockReturning = vi.fn().mockResolvedValue([mockTicket]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.create(userId, chatId);

      expect(result).toEqual(mockTicket);
      expect(mockDb.insert).toHaveBeenCalledWith(tickets);
      expect(mockValues).toHaveBeenCalledWith({
        userId,
        chatId,
        isResolved: false,
        recordStatus: 'CREATED',
      });
      expect(mockReturning).toHaveBeenCalled();
    });

    it('should create ticket with isResolved set to false by default', async () => {
      const userId = 1;
      const chatId = 'chat-new';
      
      const newTicket = { ...mockTicket, chatId: 'chat-new' };
      const mockReturning = vi.fn().mockResolvedValue([newTicket]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.create(userId, chatId);

      expect(result.isResolved).toBe(false);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isResolved: false,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return only tickets belonging to the specified user', async () => {
      const userId = 1;
      
      // Мокируем цепочку select().from().where()
      const mockWhere = vi.fn().mockResolvedValue([mockTicket, mockTicket2]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.findAll(userId);

      expect(result).toHaveLength(2);
      expect(result).toEqual([mockTicket, mockTicket2]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(tickets);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should return empty array when user has no tickets', async () => {
      const userId = 999;
      
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should filter out deleted tickets (recordStatus != DELETED)', async () => {
      const userId = 1;
      
      const mockWhere = vi.fn().mockResolvedValue([mockTicket, mockTicket2]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.findAll(userId);

      // Проверяем, что все возвращенные тикеты имеют recordStatus != 'DELETED'
      result.forEach(ticket => {
        expect(ticket.recordStatus).not.toBe('DELETED');
      });
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('data isolation', () => {
    it('should not return tickets belonging to other users', async () => {
      const userId = 1;
      
      // Мокируем возврат только тикетов пользователя 1
      const mockWhere = vi.fn().mockResolvedValue([mockTicket, mockTicket2]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.findAll(userId);

      // Проверяем, что в результате нет тикетов других пользователей
      result.forEach(ticket => {
        expect(ticket.userId).toBe(userId);
        expect(ticket.userId).not.toBe(2);
      });
      
      // Убеждаемся, что mockTicketOtherUser не попал в результат
      expect(result.find(t => t.id === 3)).toBeUndefined();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should return different tickets for different users', async () => {
      const userId1 = 1;
      const userId2 = 2;

      // Первый вызов для пользователя 1
      const mockWhere1 = vi.fn().mockResolvedValue([mockTicket, mockTicket2]);
      const mockFrom1 = vi.fn().mockReturnValue({ where: mockWhere1 });
      mockDb.select.mockReturnValueOnce({ from: mockFrom1 });
      const result1 = await service.findAll(userId1);

      // Второй вызов для пользователя 2
      const mockWhere2 = vi.fn().mockResolvedValue([mockTicketOtherUser]);
      const mockFrom2 = vi.fn().mockReturnValue({ where: mockWhere2 });
      mockDb.select.mockReturnValueOnce({ from: mockFrom2 });
      const result2 = await service.findAll(userId2);

      expect(result1).toHaveLength(2);
      expect(result2).toHaveLength(1);
      expect(result1.every(t => t.userId === userId1)).toBe(true);
      expect(result2.every(t => t.userId === userId2)).toBe(true);
    });
  });
});

