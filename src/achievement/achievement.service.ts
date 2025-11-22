import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { AchievementRepository } from './achievement.repository';

@Injectable()
export class AchievementService {
  constructor(
    private repository: AchievementRepository,
  ) {}

  async create(createAchievementDto: CreateAchievementDto) {
    // Проверяем уникальность названия (исключая удаленные записи)
    const existingAchievement = await this.repository.findByTitle(createAchievementDto.title);
    if (existingAchievement) {
      throw new ConflictException('Достижение с таким названием уже существует');
    }

    return await this.repository.create(createAchievementDto);
  }

  async findAll() {
    return await this.repository.findAll();
  }

  async findOne(id: number) {
    const achievement = await this.repository.findById(id);
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async update(id: number, updateAchievementDto: UpdateAchievementDto) {
    // Если обновляется название, проверяем уникальность (исключая удаленные записи)
    if (updateAchievementDto.title) {
      const existingAchievement = await this.repository.findByTitleExcludingId(
        updateAchievementDto.title,
        id
      );
      if (existingAchievement) {
        throw new ConflictException('Достижение с таким названием уже существует');
      }
    }

    const achievement = await this.repository.update(id, updateAchievementDto);
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async remove(id: number) {
    const achievement = await this.repository.softDelete(id);
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async assignToUser(userId: number, achievementId: number) {
    // Проверяем существование пользователя (исключая удаленные)
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование достижения (исключая удаленные)
    const achievement = await this.repository.findById(achievementId);
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${achievementId} не найдено`);
    }

    // Проверяем, не получено ли уже это достижение пользователем
    const existingUserAchievement = await this.repository.findUserAchievement(
      userId,
      achievementId
    );
    if (existingUserAchievement) {
      throw new ConflictException('Пользователь уже получил это достижение');
    }

    // Присваиваем достижение пользователю
    return await this.repository.assignToUser(userId, achievementId);
  }

  async getUserAchievements(userId: number) {
    // Проверяем существование пользователя (исключая удаленные)
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все достижения пользователя с информацией о достижении (исключая удаленные достижения)
    return await this.repository.findUserAchievements(userId);
  }
}

