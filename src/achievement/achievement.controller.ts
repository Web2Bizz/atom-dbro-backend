import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@ApiTags('Достижения')
@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать достижение' })
  @ApiResponse({ status: 201, description: 'Достижение успешно создано' })
  create(@Body() createAchievementDto: CreateAchievementDto) {
    return this.achievementService.create(createAchievementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все достижения' })
  @ApiResponse({ status: 200, description: 'Список достижений' })
  findAll() {
    return this.achievementService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить достижение по ID' })
  @ApiResponse({ status: 200, description: 'Достижение найдено' })
  @ApiResponse({ status: 404, description: 'Достижение не найдено' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.achievementService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить достижение' })
  @ApiResponse({ status: 200, description: 'Достижение обновлено' })
  @ApiResponse({ status: 404, description: 'Достижение не найдено' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAchievementDto: UpdateAchievementDto,
  ) {
    return this.achievementService.update(id, updateAchievementDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить достижение' })
  @ApiResponse({ status: 200, description: 'Достижение удалено' })
  @ApiResponse({ status: 404, description: 'Достижение не найдено' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.achievementService.remove(id);
  }

  @Post(':id/assign/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Присвоить достижение пользователю' })
  @ApiResponse({ status: 201, description: 'Достижение успешно присвоено пользователю' })
  @ApiResponse({ status: 404, description: 'Пользователь или достижение не найдено' })
  @ApiResponse({ status: 409, description: 'Пользователь уже получил это достижение' })
  assignToUser(
    @Param('id', ParseIntPipe) achievementId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.achievementService.assignToUser(userId, achievementId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить достижения пользователя' })
  @ApiResponse({ status: 200, description: 'Список достижений пользователя' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  getUserAchievements(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.getUserAchievements(userId);
  }
}

