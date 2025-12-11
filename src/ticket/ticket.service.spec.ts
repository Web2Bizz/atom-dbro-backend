import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketService } from './ticket.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tickets } from '../database/schema';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TicketService', () => {
  let service: TicketService;
  let mockDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    values: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
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
      update: vi.fn(),
      set: vi.fn(),
      eq: vi.fn(),
      and: vi.fn(),
      ne: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'CHATTY_URL') return 'http://localhost:3001';
        if (key === 'CHATTY_API_KEY') return 'test-api-key';
        return undefined;
      }),
    };

    // Мокируем глобальный fetch
    global.fetch = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb as unknown as NodePgDatabase,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    // Устанавливаем configService напрямую, так как он используется в методах
    (service as any).configService = mockConfigService;
  });

  describe('create', () => {
    it('should successfully create a ticket with correct userId and name', async () => {
      const userId = 1;
      const name = 'Test Ticket';
      const chattyRoomId = '8db20bf6-0dff-42f1-bbfb-a6f4bca25d8f';
      
      // Мокируем ответ от CHATTY API
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: chattyRoomId,
          name: name,
          isPrivate: true,
          createdBy: 'ac60d8d8-2c2b-44f0-ad0c-e9ed6a176f3e',
          createdAt: '2025-12-10T17:51:00.281Z',
          updatedAt: '2025-12-10T17:51:00.281Z',
          type: 'normal',
        }),
      });

      // Настраиваем мок для цепочки insert().values().returning()
      const newTicket = { ...mockTicket, chatId: chattyRoomId };
      const mockReturning = vi.fn().mockResolvedValue([newTicket]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.create(userId, name);

      expect(result).toEqual(newTicket);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/chatty/api/v1/rooms',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          }),
          body: JSON.stringify({
            name,
            isPrivate: true,
          }),
        }),
      );
      expect(mockDb.insert).toHaveBeenCalledWith(tickets);
      expect(mockValues).toHaveBeenCalledWith({
        userId,
        chatId: chattyRoomId,
        isResolved: false,
        recordStatus: 'CREATED',
      });
      expect(mockReturning).toHaveBeenCalled();
    });

    it('should create ticket with isResolved set to false by default', async () => {
      const userId = 1;
      const name = 'New Ticket';
      const chattyRoomId = 'new-room-id';
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: chattyRoomId,
          name: name,
          isPrivate: true,
          createdBy: 'ac60d8d8-2c2b-44f0-ad0c-e9ed6a176f3e',
          createdAt: '2025-12-10T17:51:00.281Z',
          updatedAt: '2025-12-10T17:51:00.281Z',
          type: 'normal',
        }),
      });
      
      const newTicket = { ...mockTicket, chatId: chattyRoomId };
      const mockReturning = vi.fn().mockResolvedValue([newTicket]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.create(userId, name);

      expect(result.isResolved).toBe(false);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isResolved: false,
        })
      );
    });

    it('should throw BadRequestException when CHATTY returns error status', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const error = await service.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Не удалось создать комнату в CHATTY: 500 Internal Server Error');
    });

    it('should throw BadRequestException when CHATTY response is missing id', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: name,
          isPrivate: true,
          // id отсутствует
        }),
      });

      const error = await service.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Неверный ответ от сервиса CHATTY: отсутствует идентификатор комнаты');
    });

    it('should throw BadRequestException when CHATTY response is null or empty', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const error = await service.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Неверный ответ от сервиса CHATTY: отсутствует идентификатор комнаты');
    });

    it('should throw BadRequestException when network error occurs', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error: Failed to fetch'),
      );

      const error = await service.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Ошибка при создании комнаты в CHATTY');
    });

    it('should throw BadRequestException when CHATTY_URL is not configured', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      const mockConfigServiceWithoutUrl = {
        get: vi.fn((key: string) => {
          if (key === 'CHATTY_URL') return '';
          if (key === 'CHATTY_API_KEY') return 'test-api-key';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TicketService,
          {
            provide: DATABASE_CONNECTION,
            useValue: mockDb as unknown as NodePgDatabase,
          },
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutUrl,
          },
        ],
      }).compile();

      const serviceWithoutConfig = module.get<TicketService>(TicketService);
      (serviceWithoutConfig as any).configService = mockConfigServiceWithoutUrl;

      const error = await serviceWithoutConfig.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Конфигурация CHATTY не настроена');
    });

    it('should throw BadRequestException when CHATTY_API_KEY is not configured', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      const mockConfigServiceWithoutKey = {
        get: vi.fn((key: string) => {
          if (key === 'CHATTY_URL') return 'http://localhost:3001';
          if (key === 'CHATTY_API_KEY') return '';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TicketService,
          {
            provide: DATABASE_CONNECTION,
            useValue: mockDb as unknown as NodePgDatabase,
          },
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutKey,
          },
        ],
      }).compile();

      const serviceWithoutConfig = module.get<TicketService>(TicketService);
      (serviceWithoutConfig as any).configService = mockConfigServiceWithoutKey;

      const error = await serviceWithoutConfig.create(userId, name).catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Конфигурация CHATTY не настроена');
    });

    it('should propagate database error when saving ticket fails after successful room creation', async () => {
      const userId = 1;
      const name = 'Test Ticket';
      const chattyRoomId = '8db20bf6-0dff-42f1-bbfb-a6f4bca25d8f';

      // Мокируем успешный ответ от CHATTY API
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: chattyRoomId,
          name: name,
          isPrivate: true,
          createdBy: 'ac60d8d8-2c2b-44f0-ad0c-e9ed6a176f3e',
          createdAt: '2025-12-10T17:51:00.281Z',
          updatedAt: '2025-12-10T17:51:00.281Z',
          type: 'normal',
        }),
      });

      // Мокируем ошибку при сохранении в БД
      const dbError = new Error('Database connection failed');
      const mockReturning = vi.fn().mockRejectedValue(dbError);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const error = await service.create(userId, name).catch(e => e);
      expect(error).toBe(dbError);
      expect(global.fetch).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledWith(tickets);
    });

    it('should handle different HTTP error statuses from CHATTY', async () => {
      const userId = 1;
      const name = 'Test Ticket';

      const testCases = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 404, statusText: 'Not Found' },
        { status: 500, statusText: 'Internal Server Error' },
      ];

      for (const testCase of testCases) {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          status: testCase.status,
          statusText: testCase.statusText,
          text: async () => `Error ${testCase.status}`,
        });

        const error = await service.create(userId, name).catch(e => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          `Не удалось создать комнату в CHATTY: ${testCase.status} ${testCase.statusText}`,
        );
      }
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

  describe('close', () => {
    it('should successfully close a ticket belonging to the user', async () => {
      const userId = 1;
      const ticketId = 1;
      const closedTicket = { ...mockTicket, isResolved: true };

      // Мокируем проверку существования тикета: select().from().where().limit(1)
      const mockSelectLimit = vi.fn().mockResolvedValue([mockTicket]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      // Мокируем update операцию: update().set().where().returning()
      const mockUpdateReturning = vi.fn().mockResolvedValue([closedTicket]);
      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      mockDb.update = vi.fn().mockReturnValue({ set: mockUpdateSet });

      const result = await service.close(userId, ticketId);

      expect(result).toEqual(closedTicket);
      expect(result.isResolved).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledWith(tickets);
      expect(mockUpdateSet).toHaveBeenCalledWith({
        isResolved: true,
        updatedAt: expect.any(Date),
      });
      expect(mockUpdateWhere).toHaveBeenCalledWith(expect.anything());
      expect(mockUpdateReturning).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      const userId = 1;
      const ticketId = 999;

      // Мокируем пустой результат при проверке существования
      const mockSelectLimit = vi.fn().mockResolvedValue([]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      const error = await service.close(userId, ticketId).catch(e => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket belongs to another user', async () => {
      const userId = 1;
      const ticketId = 3; // mockTicketOtherUser принадлежит пользователю 2

      // Мокируем пустой результат, так как тикет принадлежит другому пользователю
      const mockSelectLimit = vi.fn().mockResolvedValue([]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      const error = await service.close(userId, ticketId).catch(e => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket is deleted (recordStatus = DELETED)', async () => {
      const userId = 1;
      const ticketId = 1;

      // Мокируем пустой результат, так как тикет удален (не проходит фильтр ne(recordStatus, 'DELETED'))
      const mockSelectLimit = vi.fn().mockResolvedValue([]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      const error = await service.close(userId, ticketId).catch(e => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should update ticket with isResolved set to true', async () => {
      const userId = 1;
      const ticketId = 1;
      const closedTicket = { ...mockTicket, isResolved: true };

      const mockSelectLimit = vi.fn().mockResolvedValue([mockTicket]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      const mockUpdateReturning = vi.fn().mockResolvedValue([closedTicket]);
      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      mockDb.update = vi.fn().mockReturnValue({ set: mockUpdateSet });

      const result = await service.close(userId, ticketId);

      expect(result.isResolved).toBe(true);
      expect(mockUpdateSet).toHaveBeenCalledWith({
        isResolved: true,
        updatedAt: expect.any(Date),
      });
    });

    it('should propagate database errors', async () => {
      const userId = 1;
      const ticketId = 1;
      const dbError = new Error('Database connection failed');

      const mockSelectLimit = vi.fn().mockResolvedValue([mockTicket]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockSelectFrom });

      const mockUpdateReturning = vi.fn().mockRejectedValue(dbError);
      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      mockDb.update = vi.fn().mockReturnValue({ set: mockUpdateSet });

      const error = await service.close(userId, ticketId).catch(e => e);

      expect(error).toBe(dbError);
    });
  });
});

