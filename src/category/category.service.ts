import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categories } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
}

