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
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Регионы')
@Controller('regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  @ApiOperation({ summary: 'Создать регион' })
  @ApiResponse({ status: 201, description: 'Регион успешно создан' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  create(@Body() createRegionDto: CreateRegionDto) {
    return this.regionService.create(createRegionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить все регионы' })
  @ApiResponse({ status: 200, description: 'Список регионов' })
  findAll() {
    return this.regionService.findAll();
  }

  @Get(':id/cities')
  @Public()
  @ApiOperation({ summary: 'Получить все города региона' })
  @ApiResponse({ status: 200, description: 'Список городов региона' })
  @ApiResponse({ status: 404, description: 'Регион не найден' })
  findCitiesByRegion(@Param('id', ParseIntPipe) id: number) {
    return this.regionService.findCitiesByRegion(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Получить регион по ID' })
  @ApiResponse({ status: 200, description: 'Регион найден' })
  @ApiResponse({ status: 404, description: 'Регион не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить регион' })
  @ApiResponse({ status: 200, description: 'Регион обновлен' })
  @ApiResponse({ status: 404, description: 'Регион не найден' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRegionDto: UpdateRegionDto,
  ) {
    return this.regionService.update(id, updateRegionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить регион' })
  @ApiResponse({ status: 200, description: 'Регион удален' })
  @ApiResponse({ status: 404, description: 'Регион не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.regionService.remove(id);
  }
}

