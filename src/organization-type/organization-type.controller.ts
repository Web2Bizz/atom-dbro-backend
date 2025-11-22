import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationTypeService } from './organization-type.service';

@ApiTags('Типы организаций')
@Controller('organization-types')
export class OrganizationTypeController {
  constructor(private readonly organizationTypeService: OrganizationTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все типы организаций' })
  @ApiResponse({ status: 200, description: 'Список типов организаций' })
  findAll() {
    return this.organizationTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить тип организации по ID' })
  @ApiResponse({ status: 200, description: 'Тип организации найден' })
  @ApiResponse({ status: 404, description: 'Тип организации не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationTypeService.findOne(id);
  }
}

