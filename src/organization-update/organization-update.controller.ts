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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationUpdateService } from './organization-update.service';
import { CreateOrganizationUpdateDto, createOrganizationUpdateSchema, CreateOrganizationUpdateDtoClass } from './dto/create-organization-update.dto';
import { UpdateOrganizationUpdateDto, updateOrganizationUpdateSchema, UpdateOrganizationUpdateDtoClass } from './dto/update-organization-update.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Обновления организаций')
@Controller('organization-updates')
export class OrganizationUpdateController {
  constructor(private readonly organizationUpdateService: OrganizationUpdateService) {}

  @Post()
  @ZodValidation(createOrganizationUpdateSchema)
  @ApiOperation({ summary: 'Создать обновление организации' })
  @ApiBody({ type: CreateOrganizationUpdateDtoClass })
  @ApiResponse({ status: 201, description: 'Обновление организации успешно создано', type: CreateOrganizationUpdateDtoClass })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен. Только владелец организации может создавать обновления' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createOrganizationUpdateDto: CreateOrganizationUpdateDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.organizationUpdateService.create(createOrganizationUpdateDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все обновления организаций' })
  @ApiQuery({ 
    name: 'organizationId', 
    required: false, 
    type: Number,
    description: 'ID организации для фильтрации' 
  })
  @ApiResponse({ status: 200, description: 'Список обновлений организаций' })
  findAll(@Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number) {
    return this.organizationUpdateService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить обновление организации по ID' })
  @ApiResponse({ status: 200, description: 'Обновление организации найдено' })
  @ApiResponse({ status: 404, description: 'Обновление организации не найдено' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationUpdateService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ZodValidation(updateOrganizationUpdateSchema)
  @ApiOperation({ summary: 'Обновить обновление организации' })
  @ApiBody({ type: UpdateOrganizationUpdateDtoClass })
  @ApiResponse({ status: 200, description: 'Обновление организации обновлено', type: UpdateOrganizationUpdateDtoClass })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен. Только владелец организации может редактировать обновления' })
  @ApiResponse({ status: 404, description: 'Обновление организации или организация не найдены' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationUpdateDto: UpdateOrganizationUpdateDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.organizationUpdateService.update(id, updateOrganizationUpdateDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить обновление организации' })
  @ApiResponse({ status: 200, description: 'Обновление организации удалено' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен. Только владелец организации может удалять обновления' })
  @ApiResponse({ status: 404, description: 'Обновление организации не найдено' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.organizationUpdateService.remove(id, user.userId);
  }
}

