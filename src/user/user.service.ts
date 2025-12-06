import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRepository } from './user.repository';
import { BCRYPT_SALT_ROUNDS } from '../common/constants';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
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
   * Преобразует avatarUrls из формата БД {4: "url", 5: "url"} 
   * в формат API {"size_4": "url", "size_5": "url"}
   */
  private formatAvatarUrls(avatarUrls: Record<number, string> | null | undefined): Record<string, string> | null {
    if (!avatarUrls || typeof avatarUrls !== 'object') {
      return null;
    }

    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(avatarUrls)) {
      formatted[`size_${key}`] = value;
    }

    return Object.keys(formatted).length > 0 ? formatted : null;
  }

  /**
   * Преобразует объект пользователя, заменяя роль на читаемый формат
   * и преобразуя avatarUrls в формат с префиксом "size_"
   */
  private formatUser(user: any): any {
    if (!user) {
      return user;
    }
    return {
      ...user,
      role: this.formatRole(user.role),
      avatarUrls: this.formatAvatarUrls(user.avatarUrls),
    };
  }

  /**
   * Преобразует массив пользователей, заменяя роль на читаемый формат
   */
  private formatUsers(users: any[]): any[] {
    return users.map(user => this.formatUser(user));
  }

  async findAll() {
    const usersList = await this.userRepository.findAll();
    return this.formatUsers(usersList);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return this.formatUser(user);
  }

  async findByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    // Получаем пользователя с паролем
    const user = await this.userRepository.findByIdWithPassword(userId);
    
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем старый пароль
    if (!user.passwordHash) {
      throw new UnauthorizedException('Неверный старый пароль');
    }

    const isOldPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Неверный старый пароль');
    }

    // Хешируем новый пароль
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, BCRYPT_SALT_ROUNDS);

    // Обновляем пароль через репозиторий
    await this.userRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Пароль успешно изменен' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Проверяем существование пользователя
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден или был удален`);
    }

    // Исключаем experience и level из обновления (они обновляются только через ExperienceService)
    const { firstName, lastName, middleName, email, avatarUrls } = updateUserDto;

    // Фильтруем только те поля, которые реально переданы (не undefined)
    const filteredUpdateData: any = {};
    
    if (firstName !== undefined) {
      filteredUpdateData.firstName = firstName;
    }
    if (lastName !== undefined) {
      filteredUpdateData.lastName = lastName;
    }
    if (middleName !== undefined) {
      filteredUpdateData.middleName = middleName;
    }
    if (email !== undefined) {
      filteredUpdateData.email = email;
    }

    // Если avatarUrls передан в DTO, сохраняем его как есть
    // (уже преобразован из формата {"size_4": "url"} в формат {4: "url"} в DTO)
    if (avatarUrls !== undefined) {
      filteredUpdateData.avatarUrls = avatarUrls;
    }

    // Обновляем через репозиторий (проверка уникальности email выполняется в репозитории)
    const user = await this.userRepository.update(id, filteredUpdateData);
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
    return await this.userRepository.updateExperienceAndLevel(userId, newExperience, calculatedLevel);
  }
}

