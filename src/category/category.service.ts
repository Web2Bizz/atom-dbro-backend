import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categories } from '../database/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoriesBulkDto } from './dto/create-categories-bulk.dto';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Проверяем уникальность названия
    const [existingCategory] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.name, createCategoryDto.name));
    if (existingCategory) {
      throw new BadRequestException('Категория с таким названием уже существует');
    }

    const [category] = await this.db
      .insert(categories)
      .values(createCategoryDto)
      .returning();
    return category;
  }

  async findAll() {
    return this.db.select().from(categories);
  }

  async findOne(id: number) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    // Если обновляется название, проверяем уникальность
    if (updateCategoryDto.name) {
      const [existingCategory] = await this.db
        .select()
        .from(categories)
        .where(and(
          eq(categories.name, updateCategoryDto.name),
          ne(categories.id, id)
        ));
      if (existingCategory) {
        throw new BadRequestException('Категория с таким названием уже существует');
      }
    }

    const [category] = await this.db
      .update(categories)
      .set({ ...updateCategoryDto, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }
    return category;
  }

  async remove(id: number) {
    const [category] = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }
    return category;
  }

  async createMany(createCategoriesDto: CreateCategoriesBulkDto) {
    if (createCategoriesDto.length === 0) {
      throw new BadRequestException('Массив категорий не может быть пустым');
    }

    // Проверяем уникальность названий в самом массиве
    const categoryNames = createCategoriesDto.map(cat => cat.name);
    const uniqueNames = new Set(categoryNames);
    if (uniqueNames.size !== categoryNames.length) {
      const duplicates = categoryNames.filter((name, index) => categoryNames.indexOf(name) !== index);
      throw new BadRequestException(
        `Обнаружены дубликаты названий в запросе: ${[...new Set(duplicates)].join(', ')}`
      );
    }

    // Проверяем существование категорий с такими названиями в БД
    const existingCategories = await this.db
      .select()
      .from(categories)
      .where(inArray(categories.name, categoryNames));

    if (existingCategories.length > 0) {
      const existingNames = existingCategories.map(cat => cat.name);
      throw new BadRequestException(
        `Категории с такими названиями уже существуют: ${existingNames.join(', ')}`
      );
    }

    // Вставляем все категории одним запросом
    const insertedCategories = await this.db
      .insert(categories)
      .values(createCategoriesDto)
      .returning();

    return insertedCategories;
  }
}

