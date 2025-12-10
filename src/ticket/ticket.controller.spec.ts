import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

describe('TicketController', () => {
  let controller: TicketController;
  let service: TicketService;

  const mockTicket = {
    id: 1,
    userId: 1,
    isResolved: false,
    chatId: 'chat-123',
    recordStatus: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicketsList = [
    mockTicket,
    {
      id: 2,
      userId: 1,
      isResolved: true,
      chatId: 'chat-456',
      recordStatus: 'CREATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCurrentUser = { userId: 1, email: 'ivan@example.com' };

  let mockService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      create: vi.fn(),
      findAll: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        {
          provide: TicketService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
    service = module.get<TicketService>(TicketService);
    
    // Принудительно устанавливаем зависимости
    (controller as any).ticketService = mockService;
  });

  describe('create', () => {
    it('should successfully create a ticket with authentication', async () => {
      const createTicketDto: CreateTicketDto = {
        chatId: 'chat-123',
      };
      
      mockService.create.mockResolvedValue(mockTicket);

      const result = await controller.create(mockCurrentUser, createTicketDto);

      expect(result).toEqual(mockTicket);
      expect(mockService.create).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        createTicketDto.chatId
      );
    });

    it('should use userId from authenticated user', async () => {
      const createTicketDto: CreateTicketDto = {
        chatId: 'chat-456',
      };
      const differentUser = { userId: 2, email: 'other@example.com' };
      
      mockService.create.mockResolvedValue({
        ...mockTicket,
        userId: differentUser.userId,
        chatId: 'chat-456',
      });

      const result = await controller.create(differentUser, createTicketDto);

      expect(result.userId).toBe(differentUser.userId);
      expect(mockService.create).toHaveBeenCalledWith(
        differentUser.userId,
        createTicketDto.chatId
      );
      // Проверяем, что используется userId из сессии, а не из других источников
      expect(mockService.create).not.toHaveBeenCalledWith(
        mockCurrentUser.userId,
        createTicketDto.chatId
      );
    });
  });

  describe('findAll', () => {
    it('should successfully return list of tickets with authentication', async () => {
      mockService.findAll.mockResolvedValue(mockTicketsList);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockTicketsList);
      expect(mockService.findAll).toHaveBeenCalledWith(mockCurrentUser.userId);
    });

    it('should return empty list when user has no tickets', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
      expect(mockService.findAll).toHaveBeenCalledWith(mockCurrentUser.userId);
    });

    it('should use userId from authenticated user for filtering', async () => {
      const differentUser = { userId: 2, email: 'other@example.com' };
      const otherUserTickets = [
        {
          id: 3,
          userId: 2,
          isResolved: false,
          chatId: 'chat-789',
          recordStatus: 'CREATED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockService.findAll.mockResolvedValue(otherUserTickets);

      const result = await controller.findAll(differentUser);

      expect(result).toEqual(otherUserTickets);
      expect(mockService.findAll).toHaveBeenCalledWith(differentUser.userId);
      // Проверяем, что использовался userId из сессии
      expect(mockService.findAll).not.toHaveBeenCalledWith(mockCurrentUser.userId);
    });
  });
});

