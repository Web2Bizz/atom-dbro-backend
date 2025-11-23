import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRepository } from './user.repository';

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
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Обновляем пароль через репозиторий
    await this.userRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Пароль успешно изменен' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Исключаем experience и level из обновления (они обновляются только через ExperienceService)
    const { experience, level, ...updateData } = updateUserDto as any;

    // Фильтруем только те поля, которые реально переданы (не undefined)
    const filteredUpdateData: any = {};
    
    if (updateData.firstName !== undefined) {
      filteredUpdateData.firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      filteredUpdateData.lastName = updateData.lastName;
    }
    if (updateData.middleName !== undefined) {
      filteredUpdateData.middleName = updateData.middleName;
    }
    if (updateData.email !== undefined) {
      filteredUpdateData.email = updateData.email;
    }
    if (updateData.organisationId !== undefined) {
      filteredUpdateData.organisationId = updateData.organisationId;
    }

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
        filteredUpdateData.avatarUrls = normalizedAvatarUrls;
      } else {
        // Если URL не найден, используем переданный объект как есть
        filteredUpdateData.avatarUrls = avatarUrls;
      }
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

