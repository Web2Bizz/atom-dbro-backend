import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StepVolunteerService } from './step-volunteer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddStepVolunteerDto, addStepVolunteerSchema, AddStepVolunteerDtoClass } from '../quest/dto/add-step-volunteer.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Волонтёры этапов')
@Controller('quests')
export class StepVolunteerController {
  constructor(
    private readonly stepVolunteerService: StepVolunteerService,
  ) {}

  @Get(':questId/steps/:stepIndex/volunteers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ApiOperation({ summary: 'Получить список волонтёров этапа' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'stepIndex', description: 'Индекс этапа (начиная с 0)', type: Number })
  @ApiResponse({ status: 200, description: 'Список волонтёров этапа' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  @ApiResponse({ status: 400, description: 'Некорректный индекс этапа' })
  getVolunteers(
    @Param('questId', ParseIntPipe) questId: number,
    @Param('stepIndex', ParseIntPipe) stepIndex: number,
  ) {
    return this.stepVolunteerService.getVolunteers(questId, stepIndex);
  }

  @Post(':questId/steps/:stepIndex/volunteers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ApiOperation({ summary: 'Добавить волонтёра в этап' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'stepIndex', description: 'Индекс этапа (начиная с 0)', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'ID пользователя' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Волонтёр успешно добавлен в этап' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест, этап или пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Некорректный индекс этапа' })
  @ApiResponse({ status: 409, description: 'Пользователь уже участвует в этом этапе' })
  addVolunteer(
    @Param('questId', ParseIntPipe) questId: number,
    @Param('stepIndex', ParseIntPipe) stepIndex: number,
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.stepVolunteerService.addVolunteer(questId, stepIndex, userId);
  }

  @Delete(':questId/steps/:stepIndex/volunteers/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ApiOperation({ summary: 'Удалить волонтёра из этапа' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'stepIndex', description: 'Индекс этапа (начиная с 0)', type: Number })
  @ApiParam({ name: 'userId', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Волонтёр успешно удалён из этапа' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест, этап или пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Некорректный индекс этапа' })
  @ApiResponse({ status: 409, description: 'Пользователь уже удалён из этапа' })
  removeVolunteer(
    @Param('questId', ParseIntPipe) questId: number,
    @Param('stepIndex', ParseIntPipe) stepIndex: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.stepVolunteerService.removeVolunteer(questId, stepIndex, userId);
  }

  @Post(':id/steps/:type/volunteers/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ZodValidation(addStepVolunteerSchema)
  @ApiOperation({ 
    summary: 'Добавить вклад пользователя в этап квеста',
    description: `
**Параметры пути:**
- \`id\` (number) - ID квеста
- \`type\` (string) - Тип этапа квеста. Допустимые значения:
  - \`finance\` - финансовый этап
  - \`contributers\` - этап с волонтёрами
  - \`material\` - материальный этап
  - \`no_required\` - этап без требований
- \`userId\` (number) - ID пользователя, который вносит вклад

**Тело запроса:**
- \`contributeValue\` (number) - Значение вклада пользователя в этап (например, сумма денег, количество материалов и т.д.)

**Что делает endpoint:**
Создаёт новую запись о вкладе пользователя в этап квеста. 
Каждый вызов создаёт новую запись, даже если пользователь уже вносил вклад в этот этап ранее.
После добавления вклада автоматически синхронизируется \`currentValue\` этапа с суммой всех вкладов.

**Важно:**
- Квест должен иметь статус \`active\`
- Пользователь должен сначала присоединиться к квесту (через endpoint \`POST /quests/:id/join/:userId\`)
- Каждый вызов создаёт новую запись в таблице \`quest_step_volunteers\`
- Для этапов с типом \`no_required\` синхронизация \`currentValue\` не выполняется
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
  @ApiParam({ 
    name: 'userId', 
    description: 'ID пользователя', 
    type: Number,
    example: 1
  })
  @ApiBody({ type: AddStepVolunteerDtoClass })
  @ApiResponse({ status: 200, description: 'Вклад пользователя успешно добавлен. Возвращает обновленный квест с актуальными данными' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест, этап или пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные, неверный статус квеста (не active), пользователь не участвует в квесте, или отсутствует requirement у этапа' })
  addContribution(
    @Param('id', ParseIntPipe) questId: number,
    @Param('type') type: 'no_required' | 'finance' | 'contributers' | 'material',
    @Param('userId', ParseIntPipe) userId: number,
    @Body() addStepVolunteerDto: AddStepVolunteerDto,
  ) {
    return this.stepVolunteerService.addContribution(questId, type, userId, addStepVolunteerDto.contributeValue);
  }
}

