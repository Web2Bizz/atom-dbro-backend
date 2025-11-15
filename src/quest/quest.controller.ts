import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  UnauthorizedException,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { QuestService } from './quest.service';
import { QuestEventsService } from './quest.events';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Квесты')
@Controller('quests')
export class QuestController {
  constructor(
    private readonly questService: QuestService,
    private readonly questEventsService: QuestEventsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать квест' })
  @ApiResponse({ status: 201, description: 'Квест успешно создан' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточный уровень для создания квеста (требуется уровень 5+)' })
  create(
    @Body() createQuestDto: CreateQuestDto,
    @CurrentUser() user: { userId: number; email: string } | undefined,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Требуется аутентификация');
    }
    return this.questService.create(createQuestDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все квесты' })
  @ApiResponse({ status: 200, description: 'Список квестов' })
  findAll() {
    return this.questService.findAll();
  }

  @Get('filter')
  @ApiOperation({ summary: 'Получить квесты с фильтрацией по статусу' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['active', 'archived', 'completed'],
    description: 'Статус квеста для фильтрации' 
  })
  @ApiResponse({ status: 200, description: 'Список квестов с примененным фильтром' })
  filter(@Query('status') status?: 'active' | 'archived' | 'completed') {
    // Валидация статуса
    if (status && !['active', 'archived', 'completed'].includes(status)) {
      throw new BadRequestException('Недопустимый статус. Допустимые значения: active, archived, completed');
    }
    return this.questService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить квест по ID' })
  @ApiResponse({ status: 200, description: 'Квест найден' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить квест' })
  @ApiResponse({ status: 200, description: 'Квест обновлен' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestDto: UpdateQuestDto,
  ) {
    return this.questService.update(id, updateQuestDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить квест' })
  @ApiResponse({ status: 200, description: 'Квест удален' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questService.remove(id);
  }

  @Post(':id/join/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Присоединиться к квесту' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно присоединился к квесту' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь или квест не найден' })
  @ApiResponse({ status: 409, description: 'Пользователь уже присоединился к этому квесту' })
  @ApiResponse({ status: 400, description: 'Квест не доступен для выполнения' })
  joinQuest(
    @Param('id', ParseIntPipe) questId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.questService.joinQuest(userId, questId);
  }

  @Post(':id/leave/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Покинуть квест' })
  @ApiResponse({ status: 200, description: 'Пользователь успешно покинул квест' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь или квест не найден, либо пользователь не участвует в квесте' })
  @ApiResponse({ status: 400, description: 'Нельзя покинуть уже завершенный квест' })
  leaveQuest(
    @Param('id', ParseIntPipe) questId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.questService.leaveQuest(userId, questId);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Завершить квест' })
  @ApiResponse({ status: 200, description: 'Квест успешно завершен' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь или квест не найден' })
  @ApiResponse({ status: 409, description: 'Квест уже выполнен' })
  completeQuest(
    @Param('id', ParseIntPipe) questId: number,
    @CurrentUser() user: { userId: number; email: string } | undefined,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Требуется аутентификация');
    }
    return this.questService.completeQuest(user.userId, questId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить квесты пользователя' })
  @ApiResponse({ status: 200, description: 'Список квестов пользователя' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  getUserQuests(@Param('userId', ParseIntPipe) userId: number) {
    return this.questService.getUserQuests(userId);
  }

  @Get('available/:userId')
  @ApiOperation({ summary: 'Получить доступные квесты для пользователя' })
  @ApiResponse({ status: 200, description: 'Список доступных квестов' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  getAvailableQuests(@Param('userId', ParseIntPipe) userId: number) {
    return this.questService.getAvailableQuests(userId);
  }

  @Get('events')
  @Sse('events')
  @ApiOperation({ summary: 'Подписаться на события квестов (Server-Sent Events)' })
  @ApiResponse({ status: 200, description: 'Поток событий квестов' })
  streamQuestEvents(): Observable<MessageEvent> {
    return this.questEventsService.getQuestEvents();
  }

  @Get('events/:questId')
  @Sse('events/:questId')
  @ApiOperation({ summary: 'Подписаться на события конкретного квеста (Server-Sent Events)' })
  @ApiResponse({ status: 200, description: 'Поток событий для конкретного квеста' })
  streamQuestEventsByQuestId(@Param('questId', ParseIntPipe) questId: number): Observable<MessageEvent> {
    return this.questEventsService.getQuestEventsByQuestId(questId);
  }
}

