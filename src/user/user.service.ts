import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AvatarService } from '../avatar/avatar.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private avatarService: AvatarService,
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

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Генерируем аватарку - ожидаем ответ от сервиса, в случае ошибки возвращаем 400
    let avatarUrls: Record<number, string>;
    try {
      avatarUrls = await this.avatarService.generateAvatar();
      if (!avatarUrls || Object.keys(avatarUrls).length === 0) {
        throw new BadRequestException('Не удалось сгенерировать аватарку: сервис вернул пустой результат');
      }
      console.log(`Avatar generated successfully with ${Object.keys(avatarUrls).length} sizes`);
    } catch (error) {
      console.error('Failed to generate avatar:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при генерации аватарки';
      throw new BadRequestException(`Не удалось сгенерировать аватарку: ${errorMessage}`);
    }

    const [user] = await this.db
      .insert(users)
      .values({
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        middleName: createUserDto.middleName,
        email: createUserDto.email,
        passwordHash,
        avatarUrls,
        role: createUserDto.role ?? 'USER',
        level: 1,
        experience: 0,
        questId: createUserDto.questId ?? null,
        organisationId: createUserDto.organisationId ?? null,
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
        avatarUrls: users.avatarUrls,
        role: users.role,
        level: users.level,
        experience: users.experience,
        questId: users.questId,
        organisationId: users.organisationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);
  }

  async findOne(id: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        email: users.email,
        avatarUrls: users.avatarUrls,
        role: users.role,
        level: users.level,
        experience: users.experience,
        questId: users.questId,
        organisationId: users.organisationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
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

    // Исключаем experience и level из обновления (они обновляются только через ExperienceService)
    const { experience, level, ...updateData } = updateUserDto as any;

    const updateValues: any = { ...updateData, updatedAt: new Date() };
    // Если avatarUrls передан в DTO, нормализуем его в формат с ключами 4-9 и одинаковым URL
    if (updateUserDto.avatarUrls !== undefined) {
      const avatarUrls = updateUserDto.avatarUrls;
      // Получаем первый доступный URL из объекта
      const firstUrl = Object.values(avatarUrls)[0];
      if (firstUrl && typeof firstUrl === 'string') {
        // Создаем объект с ключами 4-9 и одинаковым URL
        const normalizedAvatarUrls: Record<number, string> = {};
        for (let size = 4; size <= 9; size++) {
          normalizedAvatarUrls[size] = firstUrl;
        }
        updateValues.avatarUrls = normalizedAvatarUrls;
      } else {
        // Если URL не найден, используем переданный объект как есть
        updateValues.avatarUrls = avatarUrls;
      }
    }

    const [user] = await this.db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  /**
   * Приватный метод для обновления опыта и автоматического пересчета уровня.
   * Используется только внутри ExperienceService.
   * @param userId ID пользователя
   * @param newExperience Новое значение опыта
   * @param calculatedLevel Рассчитанный уровень на основе опыта
   */
  async updateExperienceAndLevel(userId: number, newExperience: number, calculatedLevel: number) {
    const [user] = await this.db
      .update(users)
      .set({
        experience: newExperience,
        level: calculatedLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
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

