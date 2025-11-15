import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CityService } from './city.service';
import { CreateCityDto, createCitySchema, CreateCityDtoClass } from './dto/create-city.dto';
import { UpdateCityDto, updateCitySchema, UpdateCityDtoClass } from './dto/update-city.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Города')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Post()
  @ZodValidation(createCitySchema)
  @ApiOperation({ summary: 'Создать город' })
  @ApiResponse({ status: 201, description: 'Город успешно создан', type: CreateCityDtoClass })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Регион не найден' })
  create(@Body() createCityDto: CreateCityDto) {
    return this.cityService.create(createCityDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить все города (опционально фильтр по региону)' })
  @ApiQuery({ name: 'regionId', required: false, type: Number, description: 'ID региона для фильтрации' })
  @ApiResponse({ status: 200, description: 'Список городов' })
  findAll(@Query('regionId') regionId?: string) {
    const regionIdNum = regionId ? parseInt(regionId, 10) : undefined;
    return this.cityService.findAll(regionIdNum);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Получить город по ID' })
  @ApiResponse({ status: 200, description: 'Город найден' })
  @ApiResponse({ status: 404, description: 'Город не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cityService.findOne(id);
  }

  @Patch(':id')
  @ZodValidation(updateCitySchema)
  @ApiOperation({ summary: 'Обновить город' })
  @ApiResponse({ status: 200, description: 'Город обновлен', type: UpdateCityDtoClass })
  @ApiResponse({ status: 404, description: 'Город не найден' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCityDto: UpdateCityDto,
  ) {
    return this.cityService.update(id, updateCityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить город' })
  @ApiResponse({ status: 200, description: 'Город удален' })
  @ApiResponse({ status: 404, description: 'Город не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cityService.remove(id);
  }
}

