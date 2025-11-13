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
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOwnerDto } from './dto/add-owner.dto';
import { AddHelpTypeDto } from './dto/add-help-type.dto';

@ApiTags('Организации')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Создать организацию' })
  @ApiResponse({ status: 201, description: 'Организация успешно создана' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все организации' })
  @ApiResponse({ status: 200, description: 'Список организаций' })
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить организацию по ID' })
  @ApiResponse({ status: 200, description: 'Организация найдена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить организацию' })
  @ApiResponse({ status: 200, description: 'Организация обновлена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить организацию' })
  @ApiResponse({ status: 200, description: 'Организация удалена' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.remove(id);
  }

  @Post(':id/owners')
  @ApiOperation({ summary: 'Добавить владельца организации' })
  @ApiResponse({ status: 201, description: 'Владелец успешно добавлен' })
  @ApiResponse({ status: 404, description: 'Организация или пользователь не найдены' })
  @ApiResponse({ status: 409, description: 'Пользователь уже является владельцем организации' })
  addOwner(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addOwnerDto: AddOwnerDto,
  ) {
    return this.organizationService.addOwner(organizationId, addOwnerDto.userId);
  }

  @Delete(':id/owners/:userId')
  @ApiOperation({ summary: 'Удалить владельца организации' })
  @ApiResponse({ status: 200, description: 'Владелец успешно удален' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  removeOwner(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationService.removeOwner(organizationId, userId);
  }

  @Post(':id/help-types')
  @ApiOperation({ summary: 'Добавить вид помощи организации' })
  @ApiResponse({ status: 201, description: 'Вид помощи успешно добавлен' })
  @ApiResponse({ status: 404, description: 'Организация или вид помощи не найдены' })
  @ApiResponse({ status: 409, description: 'Вид помощи уже добавлен к организации' })
  addHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() addHelpTypeDto: AddHelpTypeDto,
  ) {
    return this.organizationService.addHelpType(organizationId, addHelpTypeDto.helpTypeId);
  }

  @Delete(':id/help-types/:helpTypeId')
  @ApiOperation({ summary: 'Удалить вид помощи организации' })
  @ApiResponse({ status: 200, description: 'Вид помощи успешно удален' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  removeHelpType(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('helpTypeId', ParseIntPipe) helpTypeId: number,
  ) {
    return this.organizationService.removeHelpType(organizationId, helpTypeId);
  }
}

