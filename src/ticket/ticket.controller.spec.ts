import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { NotFoundException } from '@nestjs/common';

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
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      create: vi.fn(),
      findAll: vi.fn(),
      close: vi.fn(),
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
        name: 'Test Ticket',
      };
      
      mockService.create.mockResolvedValue(mockTicket);

      const result = await controller.create(mockCurrentUser, createTicketDto);

      expect(result).toEqual(mockTicket);
      expect(mockService.create).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        createTicketDto.name
      );
    });

    it('should use userId from authenticated user', async () => {
      const createTicketDto: CreateTicketDto = {
        name: 'Another Ticket',
      };
      const differentUser = { userId: 2, email: 'other@example.com' };
      
      mockService.create.mockResolvedValue({
        ...mockTicket,
        userId: differentUser.userId,
      });

      const result = await controller.create(differentUser, createTicketDto);

      expect(result.userId).toBe(differentUser.userId);
      expect(mockService.create).toHaveBeenCalledWith(
        differentUser.userId,
        createTicketDto.name
      );
      // Проверяем, что используется userId из сессии, а не из других источников
      expect(mockService.create).not.toHaveBeenCalledWith(
        mockCurrentUser.userId,
        createTicketDto.name
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

  describe('close', () => {
    it('should successfully close a ticket with authentication', async () => {
      const ticketId = 1;
      const closedTicket = { ...mockTicket, isResolved: true };
      
      mockService.close.mockResolvedValue(closedTicket);

      const result = await controller.close(mockCurrentUser, ticketId);

      expect(result).toEqual(closedTicket);
      expect(result.isResolved).toBe(true);
      expect(mockService.close).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        ticketId
      );
    });

    it('should use userId from authenticated user', async () => {
      const ticketId = 1;
      const differentUser = { userId: 2, email: 'other@example.com' };
      const closedTicket = { ...mockTicket, userId: differentUser.userId, isResolved: true };
      
      mockService.close.mockResolvedValue(closedTicket);

      const result = await controller.close(differentUser, ticketId);

      expect(result.userId).toBe(differentUser.userId);
      expect(mockService.close).toHaveBeenCalledWith(
        differentUser.userId,
        ticketId
      );
      expect(mockService.close).not.toHaveBeenCalledWith(
        mockCurrentUser.userId,
        ticketId
      );
    });

    it('should throw NotFoundException when ticket is not found', async () => {
      const ticketId = 999;
      
      mockService.close.mockRejectedValue(
        new NotFoundException(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`)
      );

      await expect(
        controller.close(mockCurrentUser, ticketId)
      ).rejects.toThrow(NotFoundException);
      
      expect(mockService.close).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        ticketId
      );
    });

    it('should throw NotFoundException when ticket belongs to another user', async () => {
      const ticketId = 3;
      
      mockService.close.mockRejectedValue(
        new NotFoundException(`Тикет с ID ${ticketId} не найден или не принадлежит текущему пользователю`)
      );

      await expect(
        controller.close(mockCurrentUser, ticketId)
      ).rejects.toThrow(NotFoundException);
      
      expect(mockService.close).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        ticketId
      );
    });
  });
});

