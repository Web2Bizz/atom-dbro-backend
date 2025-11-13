import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { helpTypes } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateHelpTypeDto } from './dto/create-help-type.dto';
import { UpdateHelpTypeDto } from './dto/update-help-type.dto';

@Injectable()
export class HelpTypeService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createHelpTypeDto: CreateHelpTypeDto) {
    const [helpType] = await this.db
      .insert(helpTypes)
      .values(createHelpTypeDto)
      .returning();
    return helpType;
  }

  async findAll() {
    return this.db.select().from(helpTypes);
  }

  async findOne(id: number) {
    const [helpType] = await this.db
      .select()
      .from(helpTypes)
      .where(eq(helpTypes.id, id));
    if (!helpType) {
      throw new NotFoundException(`Вид помощи с ID ${id} не найден`);
    }
    return helpType;
  }

  async update(id: number, updateHelpTypeDto: UpdateHelpTypeDto) {
    const [helpType] = await this.db
      .update(helpTypes)
      .set({ ...updateHelpTypeDto, updatedAt: new Date() })
      .where(eq(helpTypes.id, id))
      .returning();
    if (!helpType) {
      throw new NotFoundException(`Вид помощи с ID ${id} не найден`);
    }
    return helpType;
  }

  async remove(id: number) {
    const [helpType] = await this.db
      .delete(helpTypes)
      .where(eq(helpTypes.id, id))
      .returning();
    if (!helpType) {
      throw new NotFoundException(`Вид помощи с ID ${id} не найден`);
    }
    return helpType;
  }
}

