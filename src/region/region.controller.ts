import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegionService } from './region.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Регионы')
@Controller('regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

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
}

