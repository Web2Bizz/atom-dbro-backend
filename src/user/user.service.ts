import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, cities } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Проверяем уникальность email
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, createUserDto.email));
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Проверяем существование города, если указан
    if (createUserDto.cityId) {
      const [city] = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, createUserDto.cityId));
      if (!city) {
        throw new NotFoundException(`Город с ID ${createUserDto.cityId} не найден`);
      }
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const [user] = await this.db
      .insert(users)
      .values({
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        middleName: createUserDto.middleName,
        email: createUserDto.email,
        passwordHash,
        cityId: createUserDto.cityId,
      })
      .returning();
    return user;
  }

  async findAll() {
    return this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        email: users.email,
        cityId: users.cityId,
        city: {
          id: cities.id,
          name: cities.name,
        },
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(cities, eq(users.cityId, cities.id));
  }

  async findOne(id: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        email: users.email,
        cityId: users.cityId,
        city: {
          id: cities.id,
          name: cities.name,
        },
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(cities, eq(users.cityId, cities.id))
      .where(eq(users.id, id));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const [existingUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, updateUserDto.email));
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    if (updateUserDto.cityId) {
      const [city] = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, updateUserDto.cityId));
      if (!city) {
        throw new NotFoundException(`Город с ID ${updateUserDto.cityId} не найден`);
      }
    }

    const [user] = await this.db
      .update(users)
      .set({ ...updateUserDto, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  async remove(id: number) {
    const [user] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }
}

