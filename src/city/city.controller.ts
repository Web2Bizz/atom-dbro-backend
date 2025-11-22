import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CityService } from './city.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Города')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить все города (опционально фильтр по региону)' })
  @ApiQuery({ name: 'regionId', required: false, type: Number, description: 'ID региона для фильтрации' })
  @ApiResponse({ status: 200, description: 'Список городов' })
  findAll(@Query('regionId', new ParseIntPipe({ optional: true })) regionId?: number) {
    return this.cityService.findAll(regionId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Получить город по ID' })
  @ApiResponse({ status: 200, description: 'Город найден' })
  @ApiResponse({ status: 404, description: 'Город не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cityService.findOne(id);
  }
}

