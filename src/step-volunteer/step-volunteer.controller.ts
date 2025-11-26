import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { StepVolunteerService } from './step-volunteer.service';

@ApiTags('Волонтёры этапов')
@Controller('quests')
export class StepVolunteerController {
  constructor(
    private readonly stepVolunteerService: StepVolunteerService,
  ) {}

  @Get(':questId/steps/:stepIndex/volunteers')
  @Version('1')
  @ApiOperation({ summary: 'Получить список волонтёров этапа' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'stepIndex', description: 'Индекс этапа (начиная с 0)', type: Number })
  @ApiResponse({ status: 200, description: 'Список волонтёров этапа' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  @ApiResponse({ status: 400, description: 'Некорректный индекс этапа' })
  getVolunteers(
    @Param('questId', ParseIntPipe) questId: number,
    @Param('stepIndex', ParseIntPipe) stepIndex: number,
  ) {
    return this.stepVolunteerService.getVolunteers(questId, stepIndex);
  }

  @Post(':questId/steps/:stepIndex/volunteers')
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
  @Version('1')
  @ApiOperation({ summary: 'Удалить волонтёра из этапа' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'stepIndex', description: 'Индекс этапа (начиная с 0)', type: Number })
  @ApiParam({ name: 'userId', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Волонтёр успешно удалён из этапа' })
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
}

