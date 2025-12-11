import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketService } from './ticket.service';
import {
  CreateTicketDto,
  createTicketSchema,
  CreateTicketDtoClass,
} from './dto/create-ticket.dto';
import {
  CloseTicketDto,
  closeTicketSchema,
  CloseTicketDtoClass,
} from './dto/close-ticket.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Тикеты')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ZodValidation(createTicketSchema)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать тикет' })
  @ApiBody({ type: CreateTicketDtoClass })
  @ApiResponse({
    status: 201,
    description: 'Тикет успешно создан',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при создании комнаты в CHATTY или неверные данные',
  })
  create(
    @CurrentUser() user: { userId: number; email: string },
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return this.ticketService.create(user.userId, createTicketDto.name);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список тикетов текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Список тикетов',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  findAll(@CurrentUser() user: { userId: number; email: string }) {
    return this.ticketService.findAll(user.userId);
  }

  @Post('close')
  @UseGuards(JwtAuthGuard)
  @ZodValidation(closeTicketSchema)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Закрыть тикет' })
  @ApiBody({ type: CloseTicketDtoClass })
  @ApiResponse({
    status: 200,
    description: 'Тикет успешно закрыт',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 404,
    description: 'Тикет не найден или не принадлежит текущему пользователю',
  })
  close(
    @CurrentUser() user: { userId: number; email: string },
    @Body() closeTicketDto: CloseTicketDto,
  ) {
    return this.ticketService.close(user.userId, closeTicketDto.id);
  }
}

