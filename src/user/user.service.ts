import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../database/schema';
import { eq, ne, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserV2Dto } from './dto/update-user-v2.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AvatarService } from '../avatar/avatar.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private avatarService: AvatarService,
  ) {}

  /**
   * Преобразует роль из базы данных в читаемый формат для вывода
   */
  private formatRole(role: string): string {
    if (role === 'USER') {
      return 'пользователь';
    }
    if (role === 'MODERATOR') {
      return 'модератор';
    }
    return role;
  }

  /**
   * Преобразует объект пользователя, заменяя роль на читаемый формат
   */
  private formatUser(user: any): any {
    if (!user) {
      return user;
    }
    return {
      ...user,
      role: this.formatRole(user.role),
    };
  }

  /**
   * Преобразует массив пользователей, заменяя роль на читаемый формат
   */
  private formatUsers(users: any[]): any[] {
    return users.map(user => this.formatUser(user));
  }

  async create(createUserDto: CreateUserDto) {
    // Проверяем уникальность email (исключая удаленные записи)
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.email, createUserDto.email),
        ne(users.recordStatus, 'DELETED')
      ));
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
    return this.formatUser(user);
  }

  async findAll() {
    const usersList = await this.db
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
      .where(ne(users.recordStatus, 'DELETED'));
    return this.formatUsers(usersList);
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
      .where(and(
        eq(users.id, id),
        ne(users.recordStatus, 'DELETED')
      ));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return this.formatUser(user);
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        ne(users.recordStatus, 'DELETED')
      ));
    return user;
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    // Получаем пользователя с паролем (исключая удаленные записи)
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        ne(users.recordStatus, 'DELETED')
      ));
    
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем старый пароль
    const isOldPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Неверный старый пароль');
    }

    // Хешируем новый пароль
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Обновляем пароль
    const [updatedUser] = await this.db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return { message: 'Пароль успешно изменен' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const [existingUser] = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.email, updateUserDto.email),
          ne(users.recordStatus, 'DELETED')
        ));
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
      .where(and(
        eq(users.id, id),
        ne(users.recordStatus, 'DELETED')
      ))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return this.formatUser(user);
  }

  async updateV2(id: number, updateUserV2Dto: UpdateUserV2Dto) {
    if (updateUserV2Dto.email) {
      const [existingUser] = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.email, updateUserV2Dto.email),
          ne(users.recordStatus, 'DELETED')
        ));
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    // Исключаем experience и level из обновления (они обновляются только через ExperienceService)
    const { experience, level, avatarUrl, ...updateData } = updateUserV2Dto as any;

    const updateValues: any = { ...updateData, updatedAt: new Date() };
    
    // Если avatarUrl передан, преобразуем его в объект с ключами 4-9 и одинаковым URL
    if (avatarUrl !== undefined && avatarUrl !== null) {
      const normalizedAvatarUrls: Record<number, string> = {};
      for (let size = 4; size <= 9; size++) {
        normalizedAvatarUrls[size] = avatarUrl;
      }
      updateValues.avatarUrls = normalizedAvatarUrls;
    }

    const [user] = await this.db
      .update(users)
      .set(updateValues)
      .where(and(
        eq(users.id, id),
        ne(users.recordStatus, 'DELETED')
      ))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return this.formatUser(user);
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
      .where(and(
        eq(users.id, userId),
        ne(users.recordStatus, 'DELETED')
      ))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    return user;
  }

  async remove(id: number) {
    const [user] = await this.db
      .update(users)
      .set({ recordStatus: 'DELETED', updatedAt: new Date() })
      .where(and(
        eq(users.id, id),
        ne(users.recordStatus, 'DELETED')
      ))
      .returning();
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }
}

