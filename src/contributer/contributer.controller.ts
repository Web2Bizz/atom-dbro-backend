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
import { ContributerService } from './contributer.service';
import { ContributerRepository } from './contributer.repository';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddContributersDto, addContributersSchema, AddContributersDtoClass } from './dto/add-contributers.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Contributers')
@Controller('quests')
export class ContributerController {
  constructor(
    private readonly contributerService: ContributerService,
    private readonly contributerRepository: ContributerRepository,
  ) {}

  @Get(':questId/contributers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ApiOperation({ summary: 'Получить список contributers квеста' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiResponse({ status: 200, description: 'Список contributers квеста' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест не найден' })
  getContributers(
    @Param('questId', ParseIntPipe) questId: number,
  ) {
    return this.contributerService.getContributers(questId);
  }

  @Post(':questId/contributers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ZodValidation(addContributersSchema)
  @ApiOperation({ summary: 'Добавить contributers в квест' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiBody({ type: AddContributersDtoClass })
  @ApiResponse({ status: 201, description: 'Contributers успешно добавлены в квест' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест или один из пользователей не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные или пользователи не участвуют в квесте' })
  @ApiResponse({ status: 409, description: 'Один или несколько пользователей уже являются contributers этого квеста' })
  async addContributers(
    @Param('questId', ParseIntPipe) questId: number,
    @Body() addContributersDto: AddContributersDto,
  ) {
    // Проверяем существование всех пользователей
    const users = await Promise.all(
      addContributersDto.userIds.map(userId => this.contributerRepository.findUserById(userId))
    );

    const notFoundUserIds: number[] = [];
    users.forEach((user, index) => {
      if (!user) {
        notFoundUserIds.push(addContributersDto.userIds[index]);
      }
    });

    if (notFoundUserIds.length > 0) {
      throw new NotFoundException(
        `Пользователи с ID не найдены: ${notFoundUserIds.join(', ')}`
      );
    }

    return this.contributerService.addContributers(questId, addContributersDto.userIds);
  }

  @Delete(':questId/contributers/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Version('1')
  @ApiOperation({ summary: 'Удалить contributer из квеста' })
  @ApiParam({ name: 'questId', description: 'ID квеста', type: Number })
  @ApiParam({ name: 'userId', description: 'ID пользователя', type: Number })
  @ApiResponse({ status: 200, description: 'Contributer успешно удалён из квеста' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Квест, пользователь или contributer не найден' })
  @ApiResponse({ status: 409, description: 'Пользователь уже удалён из contributers этого квеста' })
  removeContributer(
    @Param('questId', ParseIntPipe) questId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.contributerService.removeContributer(questId, userId);
  }
}

