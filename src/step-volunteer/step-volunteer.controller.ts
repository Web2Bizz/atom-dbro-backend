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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StepVolunteerService } from './step-volunteer.service';
import { StepVolunteerRepository } from './step-volunteer.repository';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddStepVolunteerDto, addStepVolunteerSchema, AddStepVolunteerDtoClass } from '../quest/dto/add-step-volunteer.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Волонтёры этапов')
@Controller('quests')
export class StepVolunteerController {
  constructor(
    private readonly stepVolunteerService: StepVolunteerService,
    private readonly stepVolunteerRepository: StepVolunteerRepository,
  ) {}

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
  - \`material\` - материальный этап
- \`userId\` (number) - ID пользователя, который вносит вклад

**Примечание:** Для этапов типа \`contributers\` используйте endpoint \`POST /quests/:questId/contributers\`

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
    enum: ['finance', 'material'],
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
    @Param('type') type: 'finance' | 'material',
    @Param('userId', ParseIntPipe) userId: number,
    @Body() addStepVolunteerDto: AddStepVolunteerDto,
  ) {
    return this.stepVolunteerService.addContribution(questId, type, userId, addStepVolunteerDto.contributeValue);
  }
}

