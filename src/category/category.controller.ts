import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Version,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CategoryService } from "./category.service";
import {
  CreateCategoryDto,
  createCategorySchema,
  CreateCategoryDtoClass,
} from "./dto/create-category.dto";
import {
  UpdateCategoryDto,
  updateCategorySchema,
  UpdateCategoryDtoClass,
} from "./dto/update-category.dto";
import {
  CreateCategoriesBulkDto,
  createCategoriesBulkSchema,
} from "./dto/create-categories-bulk.dto";
import { ZodValidation } from "../common/decorators/zod-validation.decorator";

@ApiTags("Категории")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ZodValidation(createCategorySchema)
  @ApiOperation({ summary: "Создать категорию" })
  @ApiBody({ type: CreateCategoryDtoClass })
  @ApiResponse({
    status: 201,
    description: "Категория успешно создана",
    type: CreateCategoryDtoClass,
  })
  @ApiResponse({
    status: 400,
    description: "Категория с таким названием уже существует",
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: "Получить все категории" })
  @ApiResponse({ status: 200, description: "Список категорий" })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить категорию по ID" })
  @ApiResponse({ status: 200, description: "Категория найдена" })
  @ApiResponse({ status: 404, description: "Категория не найдена" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Patch(":id")
  @ZodValidation(updateCategorySchema)
  @ApiOperation({ summary: "Обновить категорию" })
  @ApiBody({ type: UpdateCategoryDtoClass })
  @ApiResponse({
    status: 200,
    description: "Категория обновлена",
    type: UpdateCategoryDtoClass,
  })
  @ApiResponse({
    status: 400,
    description: "Категория с таким названием уже существует",
  })
  @ApiResponse({ status: 404, description: "Категория не найдена" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Post()
  @Version("2")
  @HttpCode(201)
  @ZodValidation(createCategoriesBulkSchema)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Массовое добавление категорий (v2)" })
  @ApiBody({
    type: [CreateCategoryDtoClass],
    description: "Массив категорий для добавления",
    examples: {
      example1: {
        value: [
          {
            name: "Экология",
          },
          {
            name: "Образование",
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Категории успешно созданы",
    type: [CreateCategoryDtoClass],
  })
  @ApiResponse({
    status: 400,
    description:
      "Неверные данные или категории с такими названиями уже существуют",
  })
  createMany(@Body() createCategoriesDto: CreateCategoriesBulkDto) {
    return this.categoryService.createMany(createCategoriesDto);
  }
}
