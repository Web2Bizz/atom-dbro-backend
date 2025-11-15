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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, createCategorySchema, CreateCategoryDtoClass } from './dto/create-category.dto';
import { UpdateCategoryDto, updateCategorySchema, UpdateCategoryDtoClass } from './dto/update-category.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@ApiTags('Категории')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ZodValidation(createCategorySchema)
  @ApiOperation({ summary: 'Создать категорию' })
  @ApiBody({ type: CreateCategoryDtoClass })
  @ApiResponse({ status: 201, description: 'Категория успешно создана', type: CreateCategoryDtoClass })
  @ApiResponse({ status: 400, description: 'Категория с таким названием уже существует' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все категории' })
  @ApiResponse({ status: 200, description: 'Список категорий' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({ status: 200, description: 'Категория найдена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ZodValidation(updateCategorySchema)
  @ApiOperation({ summary: 'Обновить категорию' })
  @ApiBody({ type: UpdateCategoryDtoClass })
  @ApiResponse({ status: 200, description: 'Категория обновлена', type: UpdateCategoryDtoClass })
  @ApiResponse({ status: 400, description: 'Категория с таким названием уже существует' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить категорию' })
  @ApiResponse({ status: 200, description: 'Категория удалена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}

