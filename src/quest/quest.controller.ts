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
  Sse,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { QuestService } from './quest.service';
import { QuestEventsService } from './quest.events';
import { CreateQuestDto, createQuestSchema, CreateQuestDtoClass } from './dto/create-quest.dto';
import { UpdateQuestDto, updateQuestSchema, UpdateQuestDtoClass } from './dto/update-quest.dto';
import { UpdateRequirementDto, updateRequirementSchema, UpdateRequirementDtoClass } from './dto/update-requirement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

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
  @ZodValidation(createQuestSchema)
  @ApiOperation({ summary: 'Создать квест' })
  @ApiBody({ type: CreateQuestDtoClass })
  @ApiResponse({ status: 201, description: 'Квест успешно создан', type: CreateQuestDtoClass })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточный уровень для создания квеста (требуется уровень 5+)' })
  create(
    @Body() createQuestDto: CreateQuestDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.questService.create(createQuestDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все квесты' })
  @ApiQuery({ 
    name: 'cityId', 
    required: false, 
    type: Number,
    description: 'ID города для фильтрации' 
  })
  @ApiQuery({ 
    name: 'categoryId', 
    required: false, 
    type: Number,
    description: 'ID категории для фильтрации' 
  })
  @ApiResponse({ status: 200, description: 'Список квестов' })
  findAll(
    @Query('cityId', new ParseIntPipe({ optional: true })) cityId?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
  ) {
    return this.questService.findAll(cityId, categoryId);
  }

  @Get('filter')
  @ApiOperation({ summary: 'Получить квесты с фильтрацией по статусу, городу и категории' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['active', 'archived', 'completed'],
    description: 'Статус квеста для фильтрации' 
  })
  @ApiQuery({ 
    name: 'cityId', 
    required: false, 
    type: Number,
    description: 'ID города для фильтрации' 
  })
  @ApiQuery({ 
    name: 'categoryId', 
    required: false, 
    type: Number,
    description: 'ID категории для фильтрации' 
  })
  @ApiResponse({ status: 200, description: 'Список квестов с примененными фильтрами' })
  filter(
    @Query('status') status?: 'active' | 'archived' | 'completed',
    @Query('cityId', new ParseIntPipe({ optional: true })) cityId?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
  ) {
    if (status && !['active', 'archived', 'completed'].includes(status)) {
      throw new BadRequestException('Недопустимый статус. Допустимые значения: active, archived, completed');
    }
    return this.questService.findByStatus(status, cityId, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить квест по ID' })
  @ApiResponse({ status: 200, description: 'Квест найден' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questService.findOne(id);
  }

  @Get(':id')
  @Version('2')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить квест по ID с информацией об участии пользователя (v2)' })
  @ApiResponse({ status: 200, description: 'Квест найден с флагом участия' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  findOneV2(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.questService.findOneWithUserParticipation(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ZodValidation(updateQuestSchema)
  @ApiOperation({ summary: 'Обновить квест' })
  @ApiBody({ type: UpdateQuestDtoClass })
  @ApiResponse({ status: 200, description: 'Квест обновлен', type: UpdateQuestDtoClass })
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
  @ApiOperation({ summary: 'Удалить квест (требуется авторизация)' })
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
  @ApiResponse({ status: 403, description: 'Только автор квеста может завершить квест' })
  @ApiResponse({ status: 404, description: 'Пользователь или квест не найден' })
  @ApiResponse({ status: 409, description: 'Квест уже выполнен' })
  completeQuest(
    @Param('id', ParseIntPipe) questId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.questService.completeQuest(user.userId, questId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Архивировать квест (изменить статус на archived)' })
  @ApiResponse({ status: 200, description: 'Квест успешно архивирован' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Только автор квеста может архивировать квест' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  archiveQuest(
    @Param('id', ParseIntPipe) questId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.questService.archiveQuest(user.userId, questId);
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

  @Get(':id/users')
  @ApiOperation({ summary: 'Получить всех пользователей квеста' })
  @ApiResponse({ status: 200, description: 'Список пользователей квеста с id и ФИО' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  getQuestUsers(@Param('id', ParseIntPipe) questId: number) {
    return this.questService.getQuestUsers(questId);
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

  @Patch(':id/steps/:type/requirement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ZodValidation(updateRequirementSchema)
  @ApiOperation({ 
    summary: 'Обновить текущее значение требования (currentValue) в этапе квеста',
    description: `
**Параметры пути:**
- \`id\` (number) - ID квеста, в котором нужно обновить требование этапа
- \`type\` (string) - Тип этапа, для которого обновляется требование. Допустимые значения:
  - \`finance\` - финансовый этап
  - \`contributers\` - этап с волонтёрами
  - \`material\` - материальный этап
  - \`no_required\` - этап без требований

**Тело запроса:**
- \`currentValue\` (number, опционально) - Новое значение текущего прогресса требования. 
  Если не указано, значение будет автоматически вычислено:
  - Для этапов типа \`contributers\`: количество подтверждённых волонтёров (с \`recordStatus = 'CREATED'\`) из таблицы \`quest_step_volunteers\`
  - Для других типов этапов: сумма всех \`contribute_value\` из таблицы \`quest_step_volunteers\`
  Вычисленное значение сохраняется в этапе квеста.

**Что делает endpoint:**
Обновляет поле \`currentValue\` в объекте \`requirement\` указанного этапа квеста. 
Это значение показывает текущий прогресс выполнения требования этапа:
- Для этапов типа \`contributers\`: количество подтверждённых волонтёров
- Для других типов: сумма вкладов (например, сколько денег собрано, сколько материалов собрано)

**Важно:**
- Квест должен иметь статус \`active\`, иначе обновление будет отклонено
- Если \`currentValue\` не указан, значение будет автоматически синхронизировано с актуальными данными из базы данных
- Обновлённое значение сохраняется в этапе квеста, что позволяет быстро получать актуальный прогресс без пересчёта
    `.trim()
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID квеста', 
    type: Number,
    example: 1
  })
  @ApiParam({ 
    name: 'type', 
    description: 'Тип этапа квеста', 
    enum: ['no_required', 'finance', 'contributers', 'material'],
    example: 'finance'
  })
  @ApiBody({ type: UpdateRequirementDtoClass })
  @ApiResponse({ status: 200, description: 'Требование успешно обновлено. Возвращает обновленный квест с актуальными данными' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест или этап с указанным типом не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные, неверный статус квеста (не active), или отсутствует requirement у этапа' })
  updateRequirementCurrentValue(
    @Param('id', ParseIntPipe) questId: number,
    @Param('type') type: 'no_required' | 'finance' | 'contributers' | 'material',
    @Body() updateRequirementDto: UpdateRequirementDto,
  ) {
    return this.questService.updateRequirementCurrentValue(questId, type, updateRequirementDto);
  }

}

