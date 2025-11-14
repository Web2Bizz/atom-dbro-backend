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
import { HelpTypeService } from './help-type.service';
import { CreateHelpTypeDto } from './dto/create-help-type.dto';
import { UpdateHelpTypeDto } from './dto/update-help-type.dto';

@ApiTags('Виды помощи')
@Controller('help-types')
export class HelpTypeController {
  constructor(private readonly helpTypeService: HelpTypeService) {}

  @Post()
  @ApiOperation({ summary: 'Создать вид помощи' })
  @ApiResponse({ status: 201, description: 'Вид помощи успешно создан' })
  @ApiResponse({ status: 400, description: 'Вид помощи с таким названием уже существует' })
  create(@Body() createHelpTypeDto: CreateHelpTypeDto) {
    return this.helpTypeService.create(createHelpTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все виды помощи' })
  @ApiResponse({ status: 200, description: 'Список видов помощи' })
  findAll() {
    return this.helpTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить вид помощи по ID' })
  @ApiResponse({ status: 200, description: 'Вид помощи найден' })
  @ApiResponse({ status: 404, description: 'Вид помощи не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.helpTypeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить вид помощи' })
  @ApiResponse({ status: 200, description: 'Вид помощи обновлен' })
  @ApiResponse({ status: 400, description: 'Вид помощи с таким названием уже существует' })
  @ApiResponse({ status: 404, description: 'Вид помощи не найден' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHelpTypeDto: UpdateHelpTypeDto,
  ) {
    return this.helpTypeService.update(id, updateHelpTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить вид помощи' })
  @ApiResponse({ status: 200, description: 'Вид помощи удален' })
  @ApiResponse({ status: 404, description: 'Вид помощи не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.helpTypeService.remove(id);
  }
}

